import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from global_collector.collector import GlobalCollector, _merge_post
from global_collector.universal_post import UNIVERSAL_POST_FIELDS
from support import build_repo


class CollectorTests(unittest.TestCase):
    def test_generic_view_without_registry_rights_does_not_fetch_article_body(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            job = build_repo(root, "future-climate-view")
            feed_payload = json.dumps({"items": [{"id": "one", "title": "A new post",
                                                      "content_text": "Short feed description",
                                                      "url": "https://example.org/post/1",
                                                      "published": "2026-11-02T10:00:00Z",
                                                      "tags": ["climate"]}]}).encode()
            page_payload = b"<!doctype html><html lang='en'><head><title>Expanded post</title><meta name='author' content='Reporter'><meta property='article:published_time' content='2026-11-02T10:00:00Z'><meta property='og:image' content='/images/original.jpg'><meta property='og:image:alt' content='Original mission photograph'><meta name='copyright' content='NASA'><meta name='image:credit' content='NASA/JSC'></head><body><article><h1>A new post</h1><p>The complete source page text.</p><a href='/full-story' class='read-more'>Read More</a></article></body></html>"
            continuation_payload = b"<!doctype html><html><head><title>Full report continuation</title></head><body><article><p>The continuation page supplies the final details of the report.</p></article></body></html>"
            feed_response = SimpleNamespace(
                requested_url="https://example.org/feed.json", final_url="https://example.org/feed.json",
                status_code=200, content_type="application/json", payload=feed_payload,
                headers={"etag": "abc", "last-modified": "Mon, 02 Nov 2026 00:00:00 GMT"}, attempts=1)
            page_response = SimpleNamespace(
                requested_url="https://example.org/post/1", final_url="https://example.org/post/1",
                status_code=200, content_type="text/html", payload=page_payload,
                headers={"etag": "page-etag"}, attempts=1)
            continuation_response = SimpleNamespace(
                requested_url="https://example.org/full-story", final_url="https://example.org/full-story",
                status_code=200, content_type="text/html", payload=continuation_payload,
                headers={"etag": "continuation-etag"}, attempts=1)
            # Without an exact central-registry permission, only the feed is
            # fetched. Linked article/continuation bodies are not retrieved.
            with patch("global_collector.collector.fetch", return_value=feed_response) as fetch_mock:
                result = GlobalCollector(root).collect(job)
            self.assertEqual(fetch_mock.call_count, 1)
            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(result["statistics"]["postsCollected"], 1)
            record = result["records"][0]
            self.assertEqual(result["recordSchema"], "LIVE_EARTH_UNIVERSAL_POST_V1")
            self.assertEqual(result["recordFields"], list(UNIVERSAL_POST_FIELDS))
            self.assertEqual(tuple(record.keys()), UNIVERSAL_POST_FIELDS)
            self.assertEqual(record["viewId"], "future-climate-view")
            self.assertEqual(record["fullText"], "")
            self.assertEqual(record["summary"], "")
            self.assertEqual(result["statistics"]["articlePagesEnriched"], 0)
            self.assertEqual(result["statistics"]["articlePagesAttempted"], 0)
            self.assertEqual(result["statistics"]["articlePagesFailed"], 0)
            self.assertEqual(result["statistics"]["articleContinuationLinksDiscovered"], 0)
            self.assertEqual(result["statistics"]["continuationPagesFetched"], 0)
            self.assertEqual(record["authorName"], "")
            self.assertEqual(result["routing"]["destinationDatabasePath"], ".publisher-data/future-climate-view/future-climate-view.sqlite3")
            # The original Manager card is returned without changing any field/value.
            self.assertEqual(result["job"], job)
            context = record["collectionContext"]
            for key, value in job.items():
                self.assertEqual(context[key], value, f"Manager field changed in collectionContext: {key}")
            self.assertFalse(any(link.get("relation") == "article-continuation-candidate" for link in record["links"]))
            self.assertFalse(result["handoff"]["collectorMakesRightsDecisions"])
            self.assertFalse(result["handoff"]["databaseWritesPerformed"])
            self.assertFalse((root / "global-checker").exists())

            sections = result["collectorSections"]
            self.assertEqual(set(sections), {"schemaVersion", "sectionOrder", "managerIdCard", "posts"})
            self.assertEqual(sections["sectionOrder"], ["managerIdCard", "fullArticle", "originalImageRecords", "sourceRightsEvidence"])
            self.assertEqual(sections["managerIdCard"]["payload"], job)
            expected_manager_hash = hashlib.sha256(
                json.dumps(job, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
            ).hexdigest()
            self.assertEqual(sections["managerIdCard"]["sha256"], expected_manager_hash)
            section_post = sections["posts"][0]
            self.assertEqual(section_post["fullArticle"]["fullText"], "")
            self.assertEqual(section_post["fullArticle"]["pages"], [])
            self.assertEqual(section_post["fullArticle"]["feedSummaryPermission"], "not-authorized-or-unknown")
            self.assertEqual(len(section_post["originalImageRecords"]), 0)
            self.assertEqual(section_post["sourceRightsEvidence"]["feedRightsMetadata"].get("copyrightNotice"), "")
            self.assertNotIn("checks", section_post)
            self.assertEqual(tuple(record.keys()), UNIVERSAL_POST_FIELDS)

    def test_duplicate_feed_discoveries_merge_full_text_and_fill_image_rights_evidence(self):
        existing = {
            "postId": "same-post", "fullText": "Opening paragraph.", "fullTextHtml": "<p>Opening</p>",
            "media": [{"url": "https://example.org/photo.jpg", "credit": "", "metadata": {}}],
            "attachments": [], "links": [], "categories": [], "tags": [], "topics": [], "contributors": [],
            "rightsMetadata": {"copyrightNotice": "", "metadata": {}},
            "provenance": {}, "sourceMetadata": {}, "collectionContext": {},
        }
        incoming = {
            "postId": "same-post", "fullText": "Additional paragraph.", "fullTextHtml": "<p>Additional</p>",
            "media": [{"url": "https://example.org/photo.jpg", "credit": "Agency Photo Desk",
                       "rightsNotice": "Copyright Agency", "metadata": {"creditSource": "article page"}}],
            "attachments": [], "links": [], "categories": [], "tags": [], "topics": [], "contributors": [],
            "rightsMetadata": {"copyrightNotice": "Agency copyright", "metadata": {"terms": "https://example.org/terms"}},
            "provenance": {"feedUrl": "https://example.org/second-feed"},
            "sourceMetadata": {"format": "html"}, "collectionContext": {},
        }
        _merge_post(existing, incoming)
        self.assertIn("Opening paragraph", existing["fullText"])
        self.assertIn("Additional paragraph", existing["fullText"])
        self.assertEqual(len(existing["media"]), 1)
        self.assertEqual(existing["media"][0]["credit"], "Agency Photo Desk")
        self.assertEqual(existing["rightsMetadata"]["copyrightNotice"], "Agency copyright")
        self.assertEqual(existing["provenance"]["alsoFoundInFeeds"], ["https://example.org/second-feed"])


if __name__ == "__main__":
    unittest.main()
