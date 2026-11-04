import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from global_collector.collector import GlobalCollector
from global_collector.universal_post import UNIVERSAL_POST_FIELDS
from support import build_repo


class CollectorTests(unittest.TestCase):
    def test_generic_view_job_preserves_manager_card_and_collects_page_context(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            job = build_repo(root, "future-climate-view")
            feed_payload = json.dumps({"items": [{"id": "one", "title": "A new post",
                                                      "content_text": "Short feed description",
                                                      "url": "https://example.org/post/1",
                                                      "published": "2026-11-02T10:00:00Z",
                                                      "tags": ["climate"]}]}).encode()
            page_payload = b"<!doctype html><html lang='en'><head><title>Expanded post</title><meta name='author' content='Reporter'><meta property='article:published_time' content='2026-11-02T10:00:00Z'></head><body><article><h1>A new post</h1><p>The complete source page text.</p><a href='/full-story'>Read More</a></article></body></html>"
            feed_response = SimpleNamespace(
                requested_url="https://example.org/feed.json", final_url="https://example.org/feed.json",
                status_code=200, content_type="application/json", payload=feed_payload,
                headers={"etag": "abc", "last-modified": "Mon, 02 Nov 2026 00:00:00 GMT"}, attempts=1)
            page_response = SimpleNamespace(
                requested_url="https://example.org/post/1", final_url="https://example.org/post/1",
                status_code=200, content_type="text/html", payload=page_payload,
                headers={"etag": "page-etag"}, attempts=1)
            # Exactly two requests are expected: the assigned feed and its linked page.
            # A discovered continuation link must not be fetched before Checker review.
            with patch("global_collector.collector.fetch", side_effect=[feed_response, page_response]) as fetch_mock:
                result = GlobalCollector(root).collect(job)
            self.assertEqual(fetch_mock.call_count, 2)
            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(result["statistics"]["postsCollected"], 1)
            record = result["records"][0]
            self.assertEqual(tuple(record.keys()), UNIVERSAL_POST_FIELDS)
            self.assertEqual(record["viewId"], "future-climate-view")
            self.assertIn("complete source page text", record["fullText"].lower())
            self.assertEqual(result["statistics"]["articlePagesEnriched"], 1)
            self.assertEqual(result["statistics"]["articleContinuationLinksDiscovered"], 1)
            self.assertEqual(record["authorName"], "Reporter")
            self.assertEqual(result["routing"]["destinationDatabasePath"], ".publisher-data/future-climate-view/future-climate-view.sqlite3")
            # The original Manager card is returned without changing any field/value.
            self.assertEqual(result["job"], job)
            context = record["collectionContext"]
            for key, value in job.items():
                self.assertEqual(context[key], value, f"Manager field changed in collectionContext: {key}")
            continuation = next(link for link in record["links"]
                                if link.get("metadata", {}).get("relation") == "article-continuation-candidate")
            self.assertEqual(continuation["metadata"]["text"], "Read More")
            self.assertFalse(result["handoff"]["collectorMakesRightsDecisions"])
            self.assertFalse(result["handoff"]["databaseWritesPerformed"])
            self.assertFalse((root / "global-checker").exists())


if __name__ == "__main__":
    unittest.main()
