"""Focused tests; run from the repository root with `python -m unittest discover -s feed_collector_service -p 'test_*.py'`."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from . import service
from .app import application


def response(url: str, body: bytes, content_type: str):
    return SimpleNamespace(
        requested_url=url, final_url=url, status_code=200, content_type=content_type,
        payload=body, headers={"etag": "test-etag", "last-modified": "Sat, 07 Nov 2026 00:00:00 GMT"},
        attempts=1,
    )


_NOW = datetime.now(timezone.utc)
_RECENT = format_datetime(_NOW - timedelta(hours=2), usegmt=True)
_OLD = format_datetime(_NOW - timedelta(days=70), usegmt=True)
FEED = f"""<?xml version="1.0"?><rss version="2.0"><channel>
<title>Example Science Feed</title><description>New research updates</description>
<link>https://example.org/</link><language>en</language>
<item><title>Recent article</title><link>https://example.org/recent</link><guid>recent-1</guid>
<pubDate>{_RECENT}</pubDate><description>Recent summary</description>
<author>Reporter One</author></item>
<item><title>Undated article</title><link>https://example.org/undated</link><guid>undated-1</guid><description>No date supplied</description></item>
<item><title>Old article</title><link>https://example.org/old</link><guid>old-1</guid>
<pubDate>{_OLD}</pubDate><description>Old summary</description></item>
</channel></rss>""".encode("utf-8")


class FeedCollectorServiceTests(unittest.TestCase):
    def test_date_window_keeps_recent_and_counts_undated_separately(self):
        now = datetime(2026, 11, 7, tzinfo=timezone.utc)
        items = [
            {"title": "recent", "publishedAt": "2026-11-06T10:00:00Z"},
            {"title": "old", "publishedAt": "2026-08-01T10:00:00Z"},
            {"title": "undated"},
        ]
        recent, undated, total = service._filter_items(items, 10, now)
        self.assertEqual([item["title"] for item in recent], ["recent"])
        self.assertEqual(undated, 1)
        self.assertEqual(total, 3)

    def test_feed_parser_extracts_channel_information(self):
        metadata = service._feed_root_metadata(FEED, "application/rss+xml", "https://example.org/feed.xml")
        self.assertEqual(metadata["title"], "Example Science Feed")
        self.assertEqual(metadata["description"], "New research updates")
        self.assertEqual(metadata["homePageUrl"], "https://example.org/")

    def test_discovery_lists_only_recognized_feeds(self):
        page_url = "https://example.org/"
        homepage = response(page_url, b"<html><head><title>Example Science</title></head><body>News</body></html>", "text/html")
        feed_response = response("https://example.org/feed.xml", FEED, "application/rss+xml")
        with patch.object(service, "_feed_candidates", return_value=([{"url": "https://example.org/feed.xml", "title": "Science", "rel": "alternate"}], "Example Science")), \
             patch.object(service, "fetch", side_effect=[homepage, feed_response]):
            result = service.discover_site({"url": page_url, "lookbackDays": 10})
        self.assertEqual(result["feedsFound"], 1)
        self.assertEqual(result["feeds"][0]["title"], "Example Science Feed")
        self.assertEqual(result["feeds"][0]["entriesInWindow"], 1)
        self.assertEqual(result["feeds"][0]["undatedEntries"], 1)

    def test_feed_inspection_returns_full_universal_records(self):
        feed_response = response("https://example.org/feed.xml", FEED, "application/rss+xml")
        with patch.object(service, "fetch", return_value=feed_response):
            result = service.inspect_feed({"feedUrl": feed_response.final_url, "lookbackDays": 10})
        self.assertEqual(result["recordSchema"], "LIVE_EARTH_UNIVERSAL_POST_V1")
        self.assertEqual(result["recordFields"], list(service.UNIVERSAL_POST_FIELDS))
        self.assertEqual(len(result["records"]), 1)
        self.assertEqual(len(result["undatedRecords"]), 1)
        self.assertEqual(result["undatedRecords"][0]["title"], "Undated article")
        self.assertEqual(result["records"][0]["title"], "Recent article")
        self.assertEqual(result["records"][0]["authorName"], "Reporter One")
        self.assertFalse(result["lineage"]["databaseWrite"])
        self.assertEqual(result["lineage"]["checkerDecision"], "not-run")

    def test_discovery_url_requires_https_and_supported_period(self):
        with self.assertRaises(ValueError):
            service.discover_site({"url": "http://example.org", "lookbackDays": 30})
        with self.assertRaises(ValueError):
            service._days(13)

    def test_article_inspection_returns_text_images_and_non_pipeline_lineage(self):
        article_response = response("https://example.org/story", b"<html><body>story</body></html>", "text/html")
        article_item = {
            "title": "A complete article", "url": article_response.final_url,
            "canonicalUrl": article_response.final_url, "fullText": "The complete source text.",
            "author": "Reporter", "media": [{"url": "https://example.org/photo.jpg", "mediaType": "image", "credit": "Example"}],
            "links": [], "sourceMetadata": {"format": "html"},
        }
        pages = [{"requestedUrl": article_response.final_url, "finalUrl": article_response.final_url,
                  "retrievalStatus": "collected", "fullText": "The complete source text."}]
        with patch.object(service, "fetch", return_value=article_response), \
             patch.object(service, "parse_payload", return_value=([article_item], "html")), \
             patch.object(service, "_enrich_from_article_page", return_value=(article_item, pages)), \
             patch.object(service, "_build_source_rights_evidence", return_value={"source": "evidence"}):
            result = service.inspect_article({"articleUrl": article_response.final_url, "lookbackDays": 30})
        self.assertEqual(result["fullArticle"]["fullText"], "The complete source text.")
        self.assertEqual(len(result["originalImageRecords"]), 1)
        self.assertEqual(result["sourceRightsEvidence"], {"source": "evidence"})
        self.assertFalse(result["lineage"]["databaseWrite"])

    def test_wsgi_rejects_unlisted_browser_origins(self):
        from unittest.mock import patch as env_patch
        environ = {"REQUEST_METHOD": "GET", "PATH_INFO": "/health",
                   "HTTP_ORIGIN": "https://unlisted.example", "wsgi.input": __import__("io").BytesIO(b"")}
        captured = {}
        def start_response(status, headers):
            captured["status"] = status
            captured["headers"] = headers
        with env_patch.dict("os.environ", {"FEED_COLLECTOR_ALLOWED_ORIGINS": ""}, clear=False):
            body = application(environ, start_response)
        self.assertTrue(captured["status"].startswith("403"))
        self.assertIn(b"not allowed", body[0])


if __name__ == "__main__":
    unittest.main()
