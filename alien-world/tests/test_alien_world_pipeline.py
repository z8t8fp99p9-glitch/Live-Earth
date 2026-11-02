"""Deterministic contract tests for the Alien World Live Feed pipeline."""
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
    def test_alien_world_publication_is_live_feed_only_and_reset_safe(self):
        # A clean reset intentionally removes the previous public JSON file.
        # The publisher must be allowed to create the first replacement feed.
        expected = [COLLECTOR_PATH, PUBLISHER_PATH, PROFILE_PATH,
                    CLIENT_PATH, VIEW_PATH, WORKFLOW_UPDATE_PATH]
        self.assertTrue(all(path.is_file() for path in expected))

        published_dir = ROOT / "alien-world" / "published"
        output_files = (
            {path.name for path in published_dir.iterdir() if path.is_file()}
            if published_dir.is_dir() else set()
        )
        # The only permitted root-level publication files are the completed
        # feed and its atomic-write staging file. The staging file is safe to
        # replace on the next run if a previous runner was interrupted.
        self.assertFalse(
            output_files - {"live-feed.json", "live-feed.json.pending"},
            f"Unexpected Alien World publication files: {sorted(output_files)}",
        )

        feed_path = published_dir / "live-feed.json"
        if feed_path.is_file():
            payload = json.loads(feed_path.read_text(encoding="utf-8"))
            self.assertEqual(payload.get("schemaVersion"), 1)
            self.assertEqual(payload.get("viewId"), "alien-world")
            self.assertIsInstance(payload.get("stories"), list)
            self.assertEqual(payload.get("storyCount"), len(payload["stories"]))

    def test_profile_exposes_adaptive_live_feed_and_retains_bounds(self):
        publication = PROFILE["publication"]
        output = PROFILE["output"]
        adaptive = publication["adaptiveLookback"]
        self.assertTrue(output["liveFeedOnly"])
        self.assertEqual(output["liveFeed"], "live-feed.json")
        self.assertEqual(publication["issueWindowHours"], 768)
        self.assertEqual(publication["maximumStories"], 0)
        self.assertEqual(publication["minimumStories"], 0)
        self.assertEqual(adaptive["targetStories"], 0)
        self.assertEqual(adaptive["expansionHours"], [768])
        self.assertEqual(PROFILE["database"]["retentionDays"], 32)
        self.assertEqual(PROFILE["database"]["maximumRecords"], 0)
        self.assertEqual(PROFILE["editorialProfile"]["maximumDocumentaryImages"], 0)
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
        self.assertIsNotNone(COLLECTOR.parse_date(records[0]["published"]))

    def test_source_image_screening_rejects_non_nasa_and_restricted_images(self):
        safe = {"url": "https://www.nasa.gov/wp-content/uploads/mission.jpg",
                "caption": "NASA mission image", "credit": "NASA"}
        self.assertTrue(COLLECTOR.image_is_eligible(safe, "NASA science report"))
        self.assertFalse(COLLECTOR.image_is_eligible(
            {**safe, "url": "https://example.com/mission.jpg"}, "NASA science report"))
        self.assertFalse(COLLECTOR.image_is_eligible(
            {**safe, "rightsNotice": "Copyright © Example Rights Holder; all rights reserved"},
            "NASA science report"))

    def test_collector_profile_keeps_story_images_and_no_publication_write(self):
        self.assertTrue(PROFILE["imageUsePolicy"]["storyImagesAllowed"])
        self.assertEqual(PROFILE["collection"]["refreshHours"], 1)
        self.assertEqual(PROFILE["database"]["retentionDays"], 32)
        self.assertTrue(PROFILE["collection"]["writesDatabase"])
        self.assertFalse(PROFILE["collection"]["writesPublicationOutputs"])
        self.assertEqual(PROFILE["collection"]["networkAccessOwner"], "AlienWorldDataCollector")


class PublisherTests(unittest.TestCase):
    def feed_payload(self):
        return {"schemaVersion": 1, "viewId": "alien-world", "publisherId": "alien-world-publisher",
                "generatedAt": "2026-11-01T12:00:00Z", "windowHours": 48,
                "storyCount": 1, "stories": [{"id": "story-1", "title": "NASA report",
                                                    "url": "https://www.nasa.gov/news/report/"}]}

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

    def test_adaptive_database_adapter_deduplicates_same_story_across_urls(self):
        database = sqlite3.connect(":memory:")
        database.row_factory = sqlite3.Row
        database.execute("CREATE TABLE stories(story_id TEXT,title TEXT,url TEXT,published_at REAL)")
        now = datetime(2026, 11, 2, 0, 0, tzinfo=timezone.utc)
        published = now - timedelta(hours=36)
        database.executemany("INSERT INTO stories VALUES(?,?,?,?)", [
            ("a", "NASA’s Webb Telescope Reveals New Nebula", "https://www.nasa.gov/image-article/example/", published.timestamp()),
            ("b", "NASA's Webb Telescope Reveals New Nebula", "https://www.nasa.gov/image-detail/example/", (published + timedelta(seconds=30)).timestamp()),
            ("c", "NASA Announces Another Science Mission", "https://www.nasa.gov/news/mission/", published.timestamp()),
        ])
        adapter = PUBLISHER.AdaptiveReadOnlyConnection(database, now, 48)
        rows = adapter.execute(
            "SELECT story_id,title,url,published_at FROM stories WHERE published_at >= ? AND published_at < ? ORDER BY published_at DESC LIMIT 500",
            (now.timestamp(), (now + timedelta(hours=2)).timestamp()),
        ).fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual({row["story_id"] for row in rows}, {"b", "c"})
        database.close()

    def test_route_writes_only_the_live_feed(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            feed_path = output / "live-feed.json"
            self.assertFalse(feed_path.exists(), "This test must begin with no previous publication.")
            with mock.patch.object(PUBLISHER, "OUTPUT_DIR", output):
                PUBLISHER.route_engine_outputs({"feed": self.feed_payload()})
                self.assertEqual({p.name for p in output.iterdir() if p.is_file()}, {"live-feed.json"})
                saved = json.loads(feed_path.read_text(encoding="utf-8"))
                self.assertEqual(saved["schemaVersion"], 1)
                self.assertEqual(saved["viewId"], "alien-world")
                self.assertEqual(saved["storyCount"], len(saved["stories"]))

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
        result = subprocess.run([sys.executable, str(PUBLISHER_PATH), "--mode", "magazine"],
                                cwd=ROOT, text=True, capture_output=True, check=False)
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
        command = {"commandId": "live-test-command", "viewId": "alien-world",
                   "publisherId": "alien-world-publisher", "issuedAt": now.isoformat(),
                   "mode": "live", "customRequest": ""}
        with tempfile.TemporaryDirectory() as temp:
            result = engine.run_engine(database, PROFILE, command, Path(temp), now)
            self.assertIn("feed", result)
            self.assertNotIn("magazine", result)
            self.assertEqual(result["feed"]["storyCount"], 12)
            self.assertFalse(list(Path(temp).rglob("*.pdf")))
        with self.assertRaises(sqlite3.OperationalError):
            database.execute("DELETE FROM stories")
        database.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
