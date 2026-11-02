"""Focused tests for adaptive Nature feed windowing and conservative deduplication."""
from __future__ import annotations

import json
import sqlite3
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "nature" / "publisher"))
import publisher


class AdaptiveNatureTests(unittest.TestCase):
    def test_profile_stages_are_bounded_by_retention(self):
        profile = json.loads((ROOT / "nature" / "publisher" / "profile.json").read_text(encoding="utf-8"))
        self.assertEqual(profile["publication"]["issueWindowHours"], 768)
        self.assertEqual(profile["publication"]["maximumStories"], 0)
        self.assertEqual(profile["publication"]["adaptiveLookback"]["targetStories"], 0)
        self.assertEqual(profile["publication"]["adaptiveLookback"]["expansionHours"], [768])
        self.assertEqual(profile["database"]["retentionDays"] * 24, 768)

    def test_same_headline_and_date_from_different_urls_is_one_story(self):
        now = datetime(2026, 11, 2, tzinfo=timezone.utc)
        published = now - timedelta(hours=12)
        rows = [
            {"url": "https://example.org/story-a", "title": "Forest Study Finds New Species",
             "published_at": published.timestamp()},
            {"url": "https://example.org/story-b", "title": "Forest Study Finds New Species!",
             "published_at": (published + timedelta(seconds=30)).timestamp()},
            {"url": "https://example.org/story-c", "title": "Forest Study Finds New Species",
             "published_at": (published - timedelta(days=1)).timestamp()},
        ]
        unique = publisher.deduplicate_story_rows(rows)
        self.assertEqual(len(unique), 2)
        self.assertEqual({row["url"] for row in unique}, {"https://example.org/story-a", "https://example.org/story-c"})

    def test_readonly_adapter_uses_wider_stage_and_deduplicates(self):
        now = datetime(2026, 11, 2, tzinfo=timezone.utc)
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        db.execute("""CREATE TABLE stories(
            story_id TEXT,title TEXT,url TEXT,summary TEXT,source_name TEXT,source_url TEXT,
            published_at REAL,retrieved_at REAL,image_url TEXT,image_local_path TEXT,
            image_caption TEXT,image_credit TEXT,image_source_url TEXT,image_rights_status TEXT,
            image_rights_note TEXT)""")
        old_date = now - timedelta(days=6)
        db.executemany("INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
            ("a", "Wildlife recovery report", "https://example.org/a", "", "Source", "https://example.org",
             old_date.timestamp(), now.timestamp(), None, None, None, None, None, None, None),
            ("b", "Wildlife recovery report", "https://example.org/b", "", "Source", "https://example.org",
             (old_date + timedelta(seconds=20)).timestamp(), now.timestamp(), None, None, None, None, None, None, None),
        ])
        adapter = publisher.NatureEngineReadOnlyConnection(db, {}, 10, now=now, lookback_hours=768)
        rows = adapter.execute(
            "SELECT story_id,title,url,summary,source_name,source_url,published_at,retrieved_at,image_url,image_local_path,image_caption,image_credit,image_source_url,image_rights_status,image_rights_note FROM stories WHERE published_at >= ? AND published_at < ? ORDER BY published_at DESC LIMIT 500",
            (now.timestamp(), (now + timedelta(hours=2)).timestamp()),
        ).fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["story_id"], "b")
        db.close()

    def test_zero_story_cap_returns_all_deduplicated_stories(self):
        now = datetime(2026, 11, 2, tzinfo=timezone.utc)
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        db.execute("""CREATE TABLE stories(
            story_id TEXT,title TEXT,url TEXT,summary TEXT,source_name TEXT,source_url TEXT,
            published_at REAL,retrieved_at REAL,image_url TEXT,image_local_path TEXT,
            image_caption TEXT,image_credit TEXT,image_source_url TEXT,image_rights_status TEXT,
            image_rights_note TEXT)""")
        rows = []
        for i in range(37):
            published = now - timedelta(hours=i)
            rows.append((f"story-{i}", f"Wildlife report {i}", f"https://example.org/{i}", "", "Source", "https://example.org/feed",
                         published.timestamp(), now.timestamp(), None, None, None, None, None, None, None))
        db.executemany("INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
        adapter = publisher.NatureEngineReadOnlyConnection(db, {}, 0, now=now, lookback_hours=768)
        selected = adapter.execute(
            "SELECT story_id,title,url,summary,source_name,source_url,published_at,retrieved_at,image_url,image_local_path,image_caption,image_credit,image_source_url,image_rights_status,image_rights_note FROM stories WHERE published_at >= ? AND published_at < ? ORDER BY published_at DESC LIMIT 500",
            ((now - timedelta(hours=768)).timestamp(), (now + timedelta(hours=2)).timestamp()),
        ).fetchall()
        self.assertEqual(len(selected), 37)
        db.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
