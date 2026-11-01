"""Deterministic contract tests for the Alien World Live Feed pipeline.

These tests do not use the network or the production Collector database. They
verify that Alien World can publish only live-feed.json while preserving the
Collector/Publisher/Universal Engine ownership boundaries.
"""
from __future__ import annotations

import ast
import importlib.util
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
COLLECTOR_PATH = ROOT / "alien-world" / "collector" / "collector.py"
PUBLISHER_PATH = ROOT / "alien-world" / "publisher" / "publisher.py"
PROFILE_PATH = ROOT / "alien-world" / "publisher" / "profile.json"
ENGINE_PATH = ROOT / "editorial-engine" / "universal_editorial_engine.py"
CLIENT_PATH = ROOT / "alien-world" / "view" / "alien-world-publisher-client.js"
VIEW_PATH = ROOT / "alien-world" / "view" / "alien-world-view-controller.js"
WORKFLOW_UPDATE_PATH = ROOT / "alien-world" / "publisher" / "ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


COLLECTOR = load_module("alien_world_collector_live_tests", COLLECTOR_PATH)
PUBLISHER = load_module("alien_world_publisher_live_tests", PUBLISHER_PATH)
PROFILE = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


class CanonicalLayoutTests(unittest.TestCase):
    def test_alien_world_publication_is_live_feed_only(self):
        expected = [
            COLLECTOR_PATH,
            PUBLISHER_PATH,
            PROFILE_PATH,
            ROOT / "alien-world" / "published" / "live-feed.json",
            CLIENT_PATH,
            VIEW_PATH,
            WORKFLOW_UPDATE_PATH,
        ]
        self.assertTrue(all(path.is_file() for path in expected))
        output_files = {path.name for path in (ROOT / "alien-world" / "published").glob("*") if path.is_file()}
        self.assertEqual(output_files, {"live-feed.json"})

    def test_profile_exposes_no_magazine_or_archive_outputs(self):
        publication = PROFILE["publication"]
        output = PROFILE["output"]
        self.assertTrue(output["liveFeedOnly"])
        self.assertEqual(output["liveFeed"], "live-feed.json")
        self.assertEqual(publication["issueWindowHours"], 48)
        self.assertEqual(publication["maximumStories"], 10)
        self.assertEqual(PROFILE["database"]["retentionDays"], 32)
        self.assertEqual(PROFILE["database"]["maximumRecords"], 2000)
        self.assertEqual(PROFILE["collection"]["refreshHours"], 1)
        self.assertNotIn("catalog", output)
        self.assertNotIn("latestPublication", output)
        self.assertNotIn("magazineCadence", publication)
        self.assertNotIn("maximumRetainedIssues", publication)

    def test_browser_view_is_live_feed_only_and_has_no_pdf_archive_controls(self):
        client = CLIENT_PATH.read_text(encoding="utf-8")
        view = VIEW_PATH.read_text(encoding="utf-8")
        self.assertIn("validateFeed", client)
        self.assertIn("live-feed.json", client)
        self.assertNotIn("validateCatalog", client)
        self.assertNotIn("openMagazine", client)
        self.assertNotIn("listSavedMagazines", client)
        self.assertNotIn("LiveEarthUniversalPDFViewer", view)
        self.assertNotIn("Space Journal", view)
        self.assertNotIn("Saved on this device", view)
        self.assertIn("if (liveList) liveList.replaceChildren();", view)
        for forbidden_storage in ("localStorage", "sessionStorage", "indexedDB"):
            self.assertNotIn(forbidden_storage, client)
            self.assertNotIn(forbidden_storage, view)


class CollectorTests(unittest.TestCase):
    def test_rss_parser_keeps_source_story_and_publication_date(self):
        payload = b'''<?xml version="1.0"?>
        <rss><channel><item>
          <title>NASA announces a new science mission</title>
          <link>https://www.nasa.gov/news/example-mission/</link>
          <description><![CDATA[<p>A substantial report with useful context.</p>]]></description>
          <pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate>
        </item></channel></rss>'''
        records = COLLECTOR.parse_feed(payload, "NASA News", "https://www.nasa.gov/feed.xml")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["sourceName"], "NASA News")
        self.assertIn("useful context", records[0]["summary"])
        self.assertTrue(records[0]["publishedAt"])

    def test_source_image_screening_rejects_non_nasa_and_restricted_images(self):
        safe = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission.jpg",
            "caption": "NASA mission image",
            "credit": "NASA",
        }
        self.assertTrue(COLLECTOR.image_is_eligible(safe, "NASA science report"))
        self.assertFalse(COLLECTOR.image_is_eligible(
            {**safe, "url": "https://example.com/mission.jpg"}, "NASA science report"
        ))
        self.assertFalse(COLLECTOR.image_is_eligible(
            {**safe, "rightsNotice": "Copyright © Example Rights Holder; all rights reserved"},
            "NASA science report",
        ))

    def test_collector_profile_keeps_story_images_and_no_publication_write(self):
        self.assertTrue(PROFILE["imageUsePolicy"]["storyImagesAllowed"])
        self.assertEqual(PROFILE["collection"]["refreshHours"], 1)
        self.assertEqual(PROFILE["database"]["retentionDays"], 32)
        self.assertTrue(PROFILE["collection"]["writesDatabase"])
        self.assertFalse(PROFILE["collection"]["writesPublicationOutputs"])
        self.assertEqual(PROFILE["collection"]["networkAccessOwner"], "AlienWorldDataCollector")


class PublisherTests(unittest.TestCase):
    def feed_payload(self):
        return {
            "schemaVersion": 1,
            "viewId": "alien-world",
            "publisherId": "alien-world-publisher",
            "generatedAt": "2026-11-01T12:00:00Z",
            "windowHours": 48,
            "storyCount": 1,
            "stories": [{"id": "story-1", "title": "NASA report"}],
        }

    def test_publisher_profile_and_boundaries_are_live_only(self):
        profile = PUBLISHER.load_profile()
        self.assertTrue(profile["output"]["liveFeedOnly"])
        tree = ast.parse(PUBLISHER_PATH.read_text(encoding="utf-8"))
        imports, calls = [], []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module or "")
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    calls.append(node.func.attr)
                elif isinstance(node.func, ast.Name):
                    calls.append(node.func.id)
        self.assertFalse({"urllib.request", "requests", "httpx", "feedparser"}.intersection(imports))
        self.assertNotIn("urlopen", calls)
        self.assertNotIn("open_writer_db", calls)
        self.assertIn("read_only_connection", calls)
        self.assertIn("run_engine", calls)

    def test_route_writes_only_the_live_feed(self):
        with tempfile.TemporaryDirectory() as temp:
            with mock.patch.object(PUBLISHER, "OUTPUT_DIR", Path(temp)):
                PUBLISHER.route_engine_outputs({"feed": self.feed_payload()})
                self.assertEqual({p.name for p in Path(temp).iterdir()}, {"live-feed.json"})
                saved = json.loads((Path(temp) / "live-feed.json").read_text(encoding="utf-8"))
                self.assertEqual(saved["storyCount"], 1)

    def test_magazine_shaped_result_is_rejected_without_changing_last_good_feed(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            last_good = output / "live-feed.json"
            last_good.write_text(json.dumps(self.feed_payload()), encoding="utf-8")
            before = last_good.read_bytes()
            with mock.patch.object(PUBLISHER, "OUTPUT_DIR", output):
                with self.assertRaisesRegex(RuntimeError, "Magazine output is forbidden"):
                    PUBLISHER.route_engine_outputs({"feed": self.feed_payload(), "magazine": {"issueId": "test"}})
            self.assertEqual(last_good.read_bytes(), before)
            self.assertEqual({p.name for p in output.iterdir()}, {"live-feed.json"})

    def test_invalid_feed_is_rejected_without_changing_last_good_feed(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            last_good = output / "live-feed.json"
            last_good.write_text(json.dumps(self.feed_payload()), encoding="utf-8")
            before = last_good.read_bytes()
            with mock.patch.object(PUBLISHER, "OUTPUT_DIR", output):
                with self.assertRaises(RuntimeError):
                    PUBLISHER.route_engine_outputs({"feed": {"viewId": "nature"}})
            self.assertEqual(last_good.read_bytes(), before)

    def test_non_live_cli_mode_is_not_accepted(self):
        result = subprocess.run(
            [sys.executable, str(PUBLISHER_PATH), "--mode", "magazine"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("invalid choice", result.stderr)

    def test_database_connection_is_query_only(self):
        with tempfile.TemporaryDirectory() as temp:
            database = Path(temp) / "alien-world.sqlite3"
            with sqlite3.connect(database) as connection:
                connection.execute("CREATE TABLE sample(value TEXT)")
                connection.execute("INSERT INTO sample VALUES('read-only')")
            with mock.patch.object(PUBLISHER, "DB_PATH", database):
                connection = PUBLISHER.read_only_connection()
                try:
                    self.assertEqual(connection.execute("SELECT value FROM sample").fetchone()[0], "read-only")
                    with self.assertRaises(sqlite3.OperationalError):
                        connection.execute("DELETE FROM sample")
                finally:
                    connection.close()


class EngineIntegrationTests(unittest.TestCase):
    def test_shared_engine_generates_only_a_live_feed_when_commanded_live(self):
        sys.path.insert(0, str(ENGINE_PATH.parent))
        import universal_editorial_engine as engine

        now = datetime.now(timezone.utc).replace(microsecond=0)
        database = sqlite3.connect(":memory:")
        database.row_factory = sqlite3.Row
        database.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
        database.execute("INSERT INTO publisher_meta VALUES('view_id','alien-world')")
        database.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL,summary TEXT NOT NULL,
            source_name TEXT NOT NULL,source_url TEXT NOT NULL,published_at REAL NOT NULL,retrieved_at REAL NOT NULL,
            image_url TEXT,image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,
            image_rights_status TEXT,image_rights_note TEXT,view_id TEXT NOT NULL)""")
        for index in range(12):
            published = now - timedelta(hours=index + 1)
            database.execute("""INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                f"story-{index}", f"NASA science report {index}", f"https://www.nasa.gov/news/report-{index}/",
                f"A substantial source-linked summary with useful context for integration test {index}.",
                "NASA News", "https://www.nasa.gov/news-release/feed/", published.timestamp(), now.timestamp(),
                None, None, None, None, None, None, None, "alien-world"))
        command = {
            "commandId": "live-test-command", "viewId": "alien-world",
            "publisherId": "alien-world-publisher", "issuedAt": now.isoformat(),
            "mode": "live", "customRequest": "",
        }
        with tempfile.TemporaryDirectory() as temp:
            result = engine.run_engine(database, PROFILE, command, Path(temp), now)
            self.assertIn("feed", result)
            self.assertNotIn("magazine", result)
            self.assertEqual(result["feed"]["storyCount"], 10)
            self.assertFalse(list(Path(temp).rglob("*.pdf")))
        with self.assertRaises(sqlite3.OperationalError):
            database.execute("DELETE FROM stories")
        database.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
