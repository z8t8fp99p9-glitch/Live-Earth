from __future__ import annotations

import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from pathlib import Path

CHECKER_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = CHECKER_DIR.parent
sys.path.insert(0, str(CHECKER_DIR))

from nature_adaptive_runtime import _expanded_nature_feed_parser


class NatureFeedParserTests(unittest.TestCase):
    def setUp(self):
        self.module = SimpleNamespace(
            clean=lambda value, limit=300: " ".join(str(value or "").split())[:limit],
            safe_https=lambda value, _hosts: isinstance(value, str) and value.startswith("https://"),
            ALLOWED_FEED_HOSTS={"nasa.gov", "noaa.gov", "usgs.gov"},
        )

    def test_recovers_entries_even_when_parser_reports_malformed_feed(self):
        parsed = {
            "entries": [
                {
                    "title": "NOAA reports new coastal wetland restoration",
                    "link": "https://oceanservice.noaa.gov/news/wetland-restoration.html",
                    "summary": "A substantial study describes restored wetland habitat and biodiversity.",
                    "published": "Mon, 02 Nov 2026 00:00:00 GMT",
                },
                {
                    "title": "A sports result without topic match",
                    "link": "https://oceanservice.noaa.gov/news/sports.html",
                    "summary": "A match report.",
                },
            ],
            "bozo": True,
            "bozo_exception": ValueError("mismatched tag recovered"),
        }
        with patch.dict(sys.modules, {"feedparser": SimpleNamespace(parse=lambda _payload: parsed)}):
            parse_feed = _expanded_nature_feed_parser(self.module)
            items = parse_feed(b"<broken-but-recoverable-feed>", "NOAA", "https://oceanservice.noaa.gov/rss/nosnews.xml")
        self.assertEqual(len(items), 1)
        self.assertIn("wetland", items[0]["title"].lower())
        self.assertEqual(items[0]["sourceName"], "NOAA")

    def test_empty_unrecoverable_feed_is_reported_not_silently_accepted(self):
        parsed = {"entries": [], "bozo": True, "bozo_exception": ValueError("invalid XML")}
        with patch.dict(sys.modules, {"feedparser": SimpleNamespace(parse=lambda _payload: parsed)}):
            parse_feed = _expanded_nature_feed_parser(self.module)
            with self.assertRaisesRegex(ValueError, "recovered no entries"):
                parse_feed(b"<broken>", "NASA", "https://science.nasa.gov/feed/")


if __name__ == "__main__":
    unittest.main(verbosity=2)
