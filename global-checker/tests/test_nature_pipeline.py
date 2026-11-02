from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

CHECKER_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = CHECKER_DIR.parent
sys.path.insert(0, str(CHECKER_DIR))

import global_checker as checker
from live_earth_global_checker_bootstrap import ENTRYPOINTS
from nature_pipeline import (
    _NatureReadOnlyProxy,
    _adopt_checked_feed,
    _collector_profile,
    _install_engine_handoff,
    _install_readonly_publisher,
    _technical_image_record,
)


class NatureSingleCheckerPipelineTests(unittest.TestCase):
    def test_checker_in_place_result_preserves_stories_array(self):
        payload = {"schemaVersion": 1, "stories": [{"id": "approved-1"}], "storyCount": 1}
        approved = payload  # gate_feed returns the same object it filtered
        _adopt_checked_feed(payload, approved)
        self.assertEqual(payload["stories"], [{"id": "approved-1"}])
        self.assertEqual(payload["storyCount"], 1)

    def test_checker_distinct_result_replaces_payload_safely(self):
        payload = {"stories": [{"id": "unapproved-1"}], "staleField": True}
        approved = {"stories": [{"id": "approved-1"}], "storyCount": 1}
        _adopt_checked_feed(payload, approved)
        self.assertEqual(payload["stories"], [{"id": "approved-1"}])
        self.assertNotIn("staleField", payload)

    def test_bootstrap_routes_both_nature_entrypoints_to_single_owner(self):
        expected = ("collect", "nature", "nature_pipeline.py")
        self.assertEqual(ENTRYPOINTS["nature/collector/collector.py"], expected)
        self.assertEqual(ENTRYPOINTS["nature/publisher/publisher.py"],
                         ("publish", "nature", "nature_pipeline.py"))

    def test_collector_image_matching_covers_adaptive_stages_without_mutating_saved_profile(self):
        profile = {
            "publication": {
                "issueWindowHours": 48,
                "adaptiveLookback": {"enabled": True, "expansionHours": [48, 96, 168, 336, 504, 768]},
            },
            "database": {"retentionDays": 32},
            "sources": [],
        }
        staged = _collector_profile(profile)
        self.assertEqual(staged["publication"]["issueWindowHours"], 768)
        self.assertEqual(profile["publication"]["issueWindowHours"], 48)
        self.assertEqual(profile["database"]["retentionDays"], 32)

    def test_nature_and_alien_world_remain_separate_pipeline_owners(self):
        self.assertEqual(ENTRYPOINTS["alien-world/collector/collector.py"],
                         ("collect", "alien-world", "alien_world_pipeline.py"))
        self.assertEqual(ENTRYPOINTS["alien-world/publisher/publisher.py"],
                         ("publish", "alien-world", "alien_world_pipeline.py"))
        self.assertNotEqual(
            ENTRYPOINTS["nature/collector/collector.py"],
            ENTRYPOINTS["alien-world/collector/collector.py"],
        )

    def test_publisher_db_proxy_exposes_evidence_without_legacy_rights_predicates(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        raw.executescript("""
          CREATE TABLE stories(story_id TEXT PRIMARY KEY,url TEXT,view_id TEXT,published_at REAL);
          CREATE TABLE nature_image_rights(
            story_id TEXT,file_title TEXT,source_page TEXT,creator TEXT,credit TEXT,
            license_name TEXT,license_url TEXT,accessed_at TEXT,caption TEXT,usage_note TEXT,
            modification_note TEXT,local_path TEXT,public_path TEXT,image_url TEXT,rights_status TEXT
          );
          INSERT INTO stories VALUES('s1','https://phys.org/news/story.html','nature',100);
          INSERT INTO nature_image_rights VALUES(
            's1','File:Example.jpg','https://commons.wikimedia.org/wiki/File:Example.jpg',
            'Creator','Creator · CC BY 4.0','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/',
            '2026-11-02T00:00:00Z','A contextual photo','Context photo',
            'Resized without changing content','media/s1.jpg','assets/s1.jpg',
            'https://raw.githubusercontent.com/example/s1.jpg','LEGACY-STATUS'
          );
        """)
        proxy = _NatureReadOnlyProxy(raw)
        # The legacy SQL included rights_status, creator, credit and licence
        # predicates. The single-owner proxy deliberately removes those filters.
        cursor = proxy.execute(
            """SELECT r.story_id,r.file_title,r.source_page,r.creator,r.credit,
            r.license_name,r.license_url,r.caption,r.usage_note,r.modification_note,r.local_path,
            r.public_path,r.image_url,r.rights_status FROM nature_image_rights r
            JOIN stories s ON s.story_id=r.story_id WHERE s.view_id='nature'
            AND s.published_at>=? AND s.published_at<? AND r.rights_status=?
            AND r.creator<>'' AND r.credit<>'' AND r.license_url<>''""",
            (0, 200, "nature-commons-filepage-verified"),
        )
        rows = cursor.fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["rights_status"], "LEGACY-STATUS")
        proxy.close()

    def test_technical_asset_association_does_not_use_rights_status_or_licence(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "media").mkdir()
            (root / "media" / "photo.jpg").write_bytes(b"verified image bytes")
            row = {
                "story_id": "s1", "image_local_path": "media/photo.jpg",
                "image_url": "https://raw.githubusercontent.com/example/photo.jpg",
                "image_rights_status": "UNKNOWN", "image_credit": "", "image_caption": "",
            }
            record = {
                "local_path": "media/photo.jpg",
                "image_url": "https://raw.githubusercontent.com/example/photo.jpg",
                "license_url": "", "creator": "",
            }
            self.assertTrue(_technical_image_record(row, record, root))

    def test_engine_handoff_preserves_commons_evidence_for_final_checker(self):
        with tempfile.TemporaryDirectory() as temp:
            image_path = Path(temp) / "nature.jpg"
            image_path.write_bytes(b"test image")
            timestamp = datetime(2026, 11, 2, tzinfo=timezone.utc)
            engine = SimpleNamespace(
                text=lambda value, _limit=3000: str(value or ""),
                safe_https_url=lambda value: isinstance(value, str) and value.startswith("https://"),
                parse_timestamp=lambda _value: timestamp,
                utc_iso=lambda value: value.isoformat().replace("+00:00", "Z"),
                _editorial_summary=lambda item: item.get("summary", ""),
                EditorialEngineError=RuntimeError,
            )
            _install_engine_handoff(engine)
            story = {
                "story_id": "nature-story-1", "title": "A forest restoration report",
                "url": "https://phys.org/news/forest-story.html", "summary": "",
                "source_name": "Phys.org — Environment",
                "source_url": "https://phys.org/rss-feed/earth-news/environment/",
                "published_at": timestamp.timestamp(), "retrieved_at": timestamp.timestamp(),
                "image_url": "https://raw.githubusercontent.com/example/nature.jpg",
                "image_local_path": str(image_path),
                "image_caption": "A forest in Assam, India.",
                "image_credit": "Photographer · CC BY-SA 4.0",
                "image_source_url": "https://commons.wikimedia.org/wiki/File:Forest.jpg",
                "image_rights_status": "LEGACY-STATUS",
                "image_rights_note": "Context image · attribution retained",
            }

            class Cursor:
                def __init__(self, rows): self.rows = rows
                def fetchone(self): return ("nature",)
                def fetchall(self): return self.rows

            class ReadOnly:
                def execute(self, sql, _params=()):
                    if "publisher_meta" in sql: return Cursor([])
                    return Cursor([story])

            brief = SimpleNamespace(
                view_id="nature", window_mode="rolling-hours", coverage_start=timestamp,
                coverage_end=timestamp, maximum_stories=10, issue_window_hours=48,
                publisher_id="nature-publisher",
            )
            rows = engine.read_view_records(ReadOnly(), brief, timestamp)
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["image_credit"], story["image_credit"])
            self.assertEqual(rows[0]["image_caption"], story["image_caption"])
            self.assertEqual(rows[0]["image_rights_status"], "LEGACY-STATUS")
            payload = engine.build_live_feed(brief, rows, timestamp)
            rendered = payload["stories"][0]
            self.assertEqual(rendered["imageUrl"], story["image_url"])
            self.assertEqual(rendered["imageCredit"], story["image_credit"])
            self.assertEqual(rendered["imageSourceUrl"], story["image_source_url"])
            self.assertEqual(rendered["imageCaption"], story["image_caption"])
            self.assertEqual(rendered["imageRightsNote"], story["image_rights_note"])

    def test_publisher_installs_single_checker_readonly_adapter(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        raw.execute("CREATE TABLE publisher_meta(key TEXT,value TEXT)")
        raw.execute("INSERT INTO publisher_meta VALUES('view_id','nature')")
        raw.commit()
        module = SimpleNamespace(
            open_readonly=lambda: raw,
            deduplicate_story_rows=lambda rows: list(rows),
            ROOT=PROJECT_ROOT,
        )
        _install_readonly_publisher(module)
        self.assertIsInstance(module.open_readonly(), _NatureReadOnlyProxy)
        self.assertTrue(hasattr(module, "NatureEngineReadOnlyConnection"))
        module.open_readonly().close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
