from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

import sys
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "magazine"))
import source_adapter as adapter


NOW = datetime(2026, 11, 1, 6, 0, tzinfo=timezone.utc)
PUBLISHED = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc).timestamp()


class MagazineAdapterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.paths = {
            "alien-world": self.root / "alien.sqlite3",
            "nature": self.root / "nature.sqlite3",
        }
        self.asset = self.root / "verified-image.jpg"
        self.asset.write_bytes(b"test image placeholder")
        self._make_source("alien-world")
        self._make_source("nature")

    def tearDown(self):
        self.temp.cleanup()

    def _make_source(self, source_id, *, publisher_id=None, nature_image_status=None, license_name="CC BY-SA 4.0"):
        con = sqlite3.connect(self.paths[source_id])
        con.row_factory = sqlite3.Row
        con.execute("CREATE TABLE publisher_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        con.executemany("INSERT INTO publisher_meta VALUES(?,?)", [
            ("view_id", source_id),
            ("publisher_id", publisher_id or adapter.SOURCE_REGISTRY[source_id]["publisher_id"]),
        ])
        con.execute("""CREATE TABLE stories (
            story_id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE,
            summary TEXT NOT NULL DEFAULT '', source_name TEXT NOT NULL, source_url TEXT NOT NULL,
            published_at REAL NOT NULL, retrieved_at REAL NOT NULL,
            image_url TEXT, image_local_path TEXT, image_caption TEXT, image_credit TEXT,
            image_source_url TEXT, image_rights_status TEXT, image_rights_note TEXT,
            view_id TEXT NOT NULL
        )""")
        if source_id == "nature":
            con.execute("""CREATE TABLE nature_image_rights (
                story_id TEXT PRIMARY KEY, file_title TEXT, source_page TEXT, creator TEXT,
                credit TEXT, license_name TEXT, license_url TEXT, caption TEXT, usage_note TEXT,
                modification_note TEXT, local_path TEXT, public_path TEXT, image_url TEXT,
                rights_status TEXT
            )""")
        for i in range(4):
            story_id = f"story-{i}"
            image_valid = i < (2 if source_id == "alien-world" else 3)
            image_url = f"https://raw.githubusercontent.com/example/{source_id}-{i}.jpg" if image_valid else None
            image_path = str(self.asset.relative_to(self.root)) if image_valid else None
            if source_id == "alien-world":
                status = adapter.ALIEN_IMAGE_STATUS if image_valid else None
                con.execute("""INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                    story_id, f"{source_id} feature {i}", f"https://example.org/{source_id}/{i}",
                    "A tested editorial summary with sufficient source context.", "NASA News", "https://www.nasa.gov/news/",
                    PUBLISHED + i, PUBLISHED + i, image_url, image_path, "NASA source image" if image_valid else None,
                    "NASA / Test" if image_valid else None, "https://www.nasa.gov/news/" if image_valid else None,
                    status, "Screened under the source image policy." if image_valid else None, source_id,
                ))
            else:
                status = (nature_image_status or adapter.NATURE_IMAGE_STATUS) if image_valid else None
                source_page = f"https://commons.wikimedia.org/wiki/File:Test_{i}.jpg"
                credit = "Test Photographer" if image_valid else None
                con.execute("""INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                    story_id, f"{source_id} feature {i}", f"https://example.org/{source_id}/{i}",
                    "A tested editorial summary with sufficient source context.", "Nature Portfolio", "https://www.nature.com/subjects/ecology.rss",
                    PUBLISHED + i, PUBLISHED + i, image_url, image_path, "Documentary context" if image_valid else None,
                    credit, source_page if image_valid else None, status, "Collector-verified Commons record." if image_valid else None,
                    source_id,
                ))
                if image_valid:
                    con.execute("INSERT INTO nature_image_rights VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                        story_id, f"File:Test_{i}.jpg", source_page, "Test Photographer", credit,
                        license_name, "https://creativecommons.org/licenses/by-sa/4.0/",
                        "A test documentary caption", "Attribution required", "No modification",
                        image_path, f"nature/published/images/test-{i}.jpg", image_url, adapter.NATURE_IMAGE_STATUS,
                    ))
        con.commit()
        con.close()

    def _bundle(self, **kwargs):
        return adapter.build_source_bundle(
            root=self.root, database_paths=self.paths, now=NOW, **kwargs
        )

    def test_previous_month_is_previous_complete_utc_month(self):
        start, end = adapter.previous_completed_month(NOW)
        self.assertEqual(start.isoformat(), "2026-10-01T00:00:00+00:00")
        self.assertEqual(end.isoformat(), "2026-11-01T00:00:00+00:00")

    def test_profile_allows_only_alien_world_and_nature(self):
        profile = adapter.load_profile()
        profile["enabledSources"].append("clouds")
        with self.assertRaises(adapter.MagazineAdapterError):
            adapter.validate_profile(profile)

    def test_balanced_round_robin_and_image_status_normalization(self):
        bundle = self._bundle()
        try:
            self.assertEqual(bundle.selected_counts, {"alien-world": 4, "nature": 4})
            self.assertGreaterEqual(bundle.verified_image_count, 4)
            self.assertEqual(bundle.connection.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()[0], "magazine")
            nature_image = bundle.connection.execute(
                "SELECT image_rights_status,image_rights_note FROM stories WHERE story_id LIKE 'nature:%' AND image_rights_status IS NOT NULL LIMIT 1"
            ).fetchone()
            self.assertEqual(nature_image["image_rights_status"], adapter.MAGAZINE_IMAGE_STATUS)
            self.assertIn("CC BY-SA 4.0", nature_image["image_rights_note"])
            self.assertIn("Test Photographer", nature_image["image_rights_note"])
        finally:
            bundle.close()

    def test_temporary_engine_database_is_query_only(self):
        bundle = self._bundle()
        try:
            with self.assertRaises(sqlite3.OperationalError):
                bundle.connection.execute("DELETE FROM stories")
        finally:
            bundle.close()

    def test_source_connections_are_read_only(self):
        connection = adapter.open_source_database("alien-world", self.paths["alien-world"], root=self.root)
        try:
            with self.assertRaises(sqlite3.OperationalError):
                connection.execute("DELETE FROM stories")
        finally:
            connection.close()

    def test_wrong_source_identity_fails_closed(self):
        con = sqlite3.connect(self.paths["nature"])
        con.execute("UPDATE publisher_meta SET value='some-other-publisher' WHERE key='publisher_id'")
        con.commit()
        con.close()
        with self.assertRaises(adapter.MagazineAdapterError):
            self._bundle()

    def test_missing_source_database_blocks_bundle(self):
        missing = dict(self.paths)
        missing["nature"] = self.root / "missing.sqlite3"
        with self.assertRaises(adapter.MagazineAdapterError):
            adapter.build_source_bundle(root=self.root, database_paths=missing, now=NOW)

    def test_nature_noncommercial_or_unverified_image_is_excluded(self):
        con = sqlite3.connect(self.paths["nature"])
        con.execute("UPDATE nature_image_rights SET license_name='CC BY-NC 4.0'")
        con.commit()
        con.close()
        profile = adapter.load_profile()
        profile["publication"]["minimumVerifiedImages"] = 2
        bundle = self._bundle(profile=profile)
        try:
            rows = bundle.connection.execute(
                "SELECT image_rights_status FROM stories WHERE story_id LIKE 'nature:%'"
            ).fetchall()
            self.assertTrue(all(row[0] is None for row in rows))
        finally:
            bundle.close()

    def test_story_ids_are_namespaced_and_source_tables_are_unchanged(self):
        before = {}
        for source_id, path in self.paths.items():
            con = sqlite3.connect(path)
            before[source_id] = con.execute("SELECT COUNT(*) FROM stories").fetchone()[0]
            con.close()
        bundle = self._bundle()
        try:
            ids = [row[0] for row in bundle.connection.execute("SELECT story_id FROM stories")]
            self.assertTrue(all(any(item.startswith(prefix + ":") for prefix in ("alien-world", "nature")) for item in ids))
        finally:
            bundle.close()
        for source_id, path in self.paths.items():
            con = sqlite3.connect(path)
            self.assertEqual(con.execute("SELECT COUNT(*) FROM stories").fetchone()[0], before[source_id])
            con.close()


if __name__ == "__main__":
    unittest.main()
