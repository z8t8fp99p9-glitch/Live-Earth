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
MANAGER_PROFILE_PATH = ROOT / "global_collection_manager" / "config" / "view-collection-profiles.json"
GLOBAL_COLLECTOR_PATH = ROOT / "global_collector" / "collector.py"
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


PUBLISHER = load_module("alien_world_publisher_live_tests", PUBLISHER_PATH)
PROFILE = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


class CanonicalLayoutTests(unittest.TestCase):
    def test_alien_world_publication_is_live_feed_only_and_reset_safe(self):
        # The live-feed publisher must be able to create the first replacement feed.
        expected = [GLOBAL_COLLECTOR_PATH, PUBLISHER_PATH, PROFILE_PATH,
                    CLIENT_PATH, VIEW_PATH, WORKFLOW_UPDATE_PATH]
        self.assertTrue(all(path.is_file() for path in expected))
        self.assertFalse((ROOT / "alien-world" / "collector").exists())

        published_dir = ROOT / "alien-world" / "published"
        output_files = (
            {path.name for path in published_dir.iterdir() if path.is_file()}
            if published_dir.is_dir() else set()
        )
        # The only permitted root-level publication file is the completed feed.
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
        self.assertNotIn("database", PROFILE)
        self.assertEqual(PROFILE["editorialProfile"]["maximumDocumentaryImages"], 0)
        self.assertNotIn("collection", PROFILE)
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


class GlobalCollectionContractTests(unittest.TestCase):
    def test_alien_world_is_assigned_to_the_single_global_collector(self):
        self.assertTrue(GLOBAL_COLLECTOR_PATH.is_file())
        manager = json.loads(MANAGER_PROFILE_PATH.read_text(encoding="utf-8"))
        profile = next(item for item in manager["profiles"] if item["viewId"] == "alien-world")
        self.assertEqual(profile["collectorEntrypoint"], "global_collector")
        self.assertEqual(profile["retentionDays"], 32)
        self.assertEqual(profile["lookbackWindowHours"], 768)
        self.assertEqual(profile["collectionFrequency"], {"type": "hourly", "intervalMinutes": 60})
        self.assertEqual(profile["publisherEntrypoint"], "alien-world/publisher/newsroom_publisher.py")
        self.assertEqual(profile["retentionDays"], 32)
        self.assertEqual(profile["collectionFrequency"], {"type": "hourly", "intervalMinutes": 60})
        workflow = (ROOT / ".github/workflows/alien-world-publisher.yml").read_text(encoding="utf-8")
        self.assertNotIn("alien-world/collector/collector.py", workflow)
        self.assertIn("editorial-engine/newsroom_orchestrator.py", workflow)


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
        database.execute("CREATE TABLE newsroom_approved_stories(view_id TEXT,story_id TEXT,title TEXT,url TEXT,published_at REAL)")
        now = datetime(2026, 11, 2, 0, 0, tzinfo=timezone.utc)
        published = now - timedelta(hours=36)
        database.executemany("INSERT INTO newsroom_approved_stories VALUES(?,?,?,?,?)", [
            ("alien-world", "a", "NASA’s Webb Telescope Reveals New Nebula", "https://www.nasa.gov/image-article/example/", published.timestamp()),
            ("alien-world", "b", "NASA's Webb Telescope Reveals New Nebula", "https://www.nasa.gov/image-detail/example/", (published + timedelta(seconds=30)).timestamp()),
            ("alien-world", "c", "NASA Announces Another Science Mission", "https://www.nasa.gov/news/mission/", published.timestamp()),
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
        database.execute("""CREATE TABLE newsroom_approved_stories(
            view_id TEXT NOT NULL,story_id TEXT NOT NULL,url TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL,
            source_name TEXT NOT NULL,source_url TEXT NOT NULL,published_at REAL NOT NULL,retrieved_at REAL NOT NULL,
            image_url TEXT,image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,
            image_rights_status TEXT,image_rights_note TEXT,source_policy_ref TEXT NOT NULL,
            global_checker_intake_decision_id TEXT NOT NULL,checker_review_id TEXT NOT NULL,
            checker_registry_version TEXT NOT NULL,checker_checked_at TEXT NOT NULL,
            editorial_engine_version TEXT NOT NULL,editorial_adapter_version TEXT NOT NULL,
            evidence_ledger_json TEXT NOT NULL,topic_tags_json TEXT NOT NULL,image_rights_json TEXT NOT NULL,
            approved_at TEXT NOT NULL,PRIMARY KEY(view_id,story_id))""")
        evidence_hash = __import__("hashlib").sha256(b"source evidence excerpt").hexdigest()
        engine.NEWSROOM_PUBLISHER_ADAPTER_VERSION = "2.0.0"
        for index in range(12):
            published = now - timedelta(hours=index + 1)
            story_id = f"story-{index}"
            article_url = f"https://www.nasa.gov/news/report-{index}/"
            summary = (f"NASA has released a detailed science update for integration test {index}. "
                       "The shared Newsroom editorial summary preserves the reviewed facts and context. "
                       "This approved record demonstrates the global Publisher database contract.")
            evidence = json.dumps([{"sourceRecordId": story_id, "sourceUrl": article_url,
                                   "sourcePolicyRef": "nasa-policy", "excerptSha256": evidence_hash}])
            database.execute("""INSERT INTO newsroom_approved_stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                "alien-world", story_id, article_url, f"NASA science report {index}", summary,
                "NASA News", "https://www.nasa.gov/news-release/feed/", published.timestamp(), now.timestamp(),
                None, None, None, None, None, None, None, "nasa-policy", f"decision-{index}",
                f"review-{index}", "checker-registry-1", now.isoformat(), engine.ENGINE_VERSION,
                "2.0.0", evidence, "[]", "{}", now.isoformat()))
        command = {"commandId": "live-test-command", "viewId": "alien-world",
                   "publisherId": "alien-world-publisher", "issuedAt": now.isoformat(),
                   "mode": "live", "customRequest": ""}
        with tempfile.TemporaryDirectory() as temp:
            result = engine.run_engine(PUBLISHER.AdaptiveReadOnlyConnection(database, now, 768), PROFILE, command, Path(temp), now)
            self.assertIn("feed", result)
            self.assertNotIn("magazine", result)
            self.assertEqual(result["feed"]["storyCount"], 12)
            self.assertFalse(list(Path(temp).rglob("*.pdf")))
        with self.assertRaises(sqlite3.OperationalError):
            database.execute("DELETE FROM newsroom_approved_stories")
        database.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
