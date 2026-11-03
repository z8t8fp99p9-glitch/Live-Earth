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
    def test_generic_view_job_produces_universal_batch_without_checker_or_database(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            job = build_repo(root, "future-climate-view")
            feed_payload = json.dumps({"items": [{"id": "one", "title": "A new post",
                                                      "content_text": "Short feed description",
                                                      "url": "https://example.org/post/1",
                                                      "published": "2026-11-02T10:00:00Z",
                                                      "tags": ["climate"]}]}).encode()
            page_payload = b"<!doctype html><html lang='en'><head><title>Expanded post</title><meta name='author' content='Reporter'><meta property='article:published_time' content='2026-11-02T10:00:00Z'></head><body><article><h1>A new post</h1><p>The complete source page text.</p></article></body></html>"
            feed_response = SimpleNamespace(
                requested_url="https://example.org/feed.json", final_url="https://example.org/feed.json",
                status_code=200, content_type="application/json", payload=feed_payload,
                headers={"etag": "abc", "last-modified": "Mon, 02 Nov 2026 00:00:00 GMT"}, attempts=1)
            page_response = SimpleNamespace(
                requested_url="https://example.org/post/1", final_url="https://example.org/post/1",
                status_code=200, content_type="text/html", payload=page_payload,
                headers={"etag": "page-etag"}, attempts=1)
            with patch("global_collector.collector.fetch", side_effect=[feed_response, page_response]):
                result = GlobalCollector(root).collect(job)
            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(result["statistics"]["postsCollected"], 1)
            record = result["records"][0]
            self.assertEqual(tuple(record.keys()), UNIVERSAL_POST_FIELDS)
            self.assertEqual(record["viewId"], "future-climate-view")
            self.assertIn("complete source page text", record["fullText"].lower())
            self.assertEqual(result["statistics"]["articlePagesEnriched"], 1)
            self.assertEqual(record["authorName"], "Reporter")
            self.assertEqual(result["routing"]["destinationDatabasePath"], ".publisher-data/future-climate-view/future-climate-view.sqlite3")
            self.assertFalse(result["handoff"]["collectorMakesRightsDecisions"])
            self.assertFalse(result["handoff"]["databaseWritesPerformed"])
            self.assertFalse((root / "global-checker").exists())


if __name__ == "__main__":
    unittest.main()
