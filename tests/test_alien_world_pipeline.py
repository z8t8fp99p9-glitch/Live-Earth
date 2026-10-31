"""Deterministic contract and end-to-end tests for Alien World publishing.

These tests never access the internet and never touch the live publisher database.
They use temporary SQLite databases, synthetic feed/page fixtures and a temporary
publication directory.
"""
from __future__ import annotations

import ast
import importlib.util
import io
import json
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from pathlib import Path
from unittest import mock

from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
COLLECTOR_PATH = ROOT / "data-collection" / "alien-world" / "collector.py"
PUBLISHER_PATH = ROOT / "publishers" / "alien-world" / "publisher.py"
PROFILE_PATH = ROOT / "publishers" / "alien-world" / "profile.json"
ENGINE_PATH = ROOT / "editorial-engine" / "universal_editorial_engine.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


COLLECTOR = load_module("alien_world_collector_tests", COLLECTOR_PATH)
PROFILE = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


class CollectorTests(unittest.TestCase):
    def test_rss_parser_keeps_original_article_image_candidates(self):
        payload = b'''<?xml version="1.0"?>
        <rss xmlns:media="http://search.yahoo.com/mrss/"
             xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel><item>
            <title>NASA announces a new science mission</title>
            <link>https://www.nasa.gov/news/example-mission/</link>
            <description><![CDATA[<p>A substantial report with context.</p>]]></description>
            <content:encoded><![CDATA[<p>Report</p><img src="https://www.nasa.gov/wp-content/uploads/mission-photo.jpg" alt="Mission spacecraft"/>]]></content:encoded>
            <media:content url="https://www.nasa.gov/wp-content/uploads/mission-hero.jpg" type="image/jpeg" medium="image"/>
            <pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate>
          </item></channel>
        </rss>'''
        records = COLLECTOR.parse_feed(payload, "NASA News", "https://www.nasa.gov/feed.xml")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["sourceName"], "NASA News")
        self.assertIn("Report", records[0]["summary"])
        urls = {entry["url"] for entry in records[0]["imageCandidates"]}
        self.assertIn("https://www.nasa.gov/wp-content/uploads/mission-hero.jpg", urls)
        self.assertIn("https://www.nasa.gov/wp-content/uploads/mission-photo.jpg", urls)

    def test_article_metadata_prefers_the_actual_source_post_hero_image(self):
        article = "https://www.nasa.gov/news/example-mission/"
        html = b'''<html><head>
          <meta property="og:image" content="https://www.nasa.gov/wp-content/uploads/mission-hero.jpg"/>
          <meta property="og:image:alt" content="The spacecraft in the clean room"/>
          <meta property="image:credit" content="NASA / Kennedy Space Center"/>
        </head><body><img src="https://www.nasa.gov/wp-content/uploads/other-image.jpg" alt="Other"/></body></html>'''
        with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=html):
            candidates = COLLECTOR.article_media(article, [])
        self.assertGreaterEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["url"], "https://www.nasa.gov/wp-content/uploads/mission-hero.jpg")
        self.assertEqual(candidates[0]["credit"], "NASA / Kennedy Space Center")

    def test_non_nasa_image_hosts_are_rejected(self):
        self.assertFalse(COLLECTOR.nasa_host_url("https://images.example.com/space.jpg"))
        self.assertFalse(COLLECTOR.nasa_host_url("http://www.nasa.gov/space.jpg"))
        self.assertTrue(COLLECTOR.nasa_host_url("https://images-assets.nasa.gov/image/example.jpg"))

    def test_illustrations_are_disclosed_not_mislabelled_as_photographs(self):
        item = {
            "url": "https://www.nasa.gov/wp-content/uploads/artist-concept.jpg",
            "caption": "Artist's concept of a spacecraft near Mars",
            "credit": "NASA",
        }
        self.assertIn("illustration", COLLECTOR.image_type_label(item).lower())

    def test_collector_writes_only_its_database_and_never_publishes(self):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        items = []
        for index in range(6):
            published = format_datetime(now - timedelta(hours=index + 1), usegmt=True)
            items.append(
                f"<item><title>NASA test science report {index}</title>"
                f"<link>https://www.nasa.gov/news/test-report-{index}/</link>"
                f"<description><![CDATA[This is a sufficiently long test feed summary with source context number {index}.]]></description>"
                f"<pubDate>{published}</pubDate></item>"
            )
        payload = ("<rss><channel>" + "".join(items) + "</channel></rss>").encode()
        profile = json.loads(json.dumps(PROFILE))
        profile["sources"] = [{"name": "NASA Test Feed", "feedUrl": "https://www.nasa.gov/test-feed.xml"}]
        profile["editorialProfile"]["maximumDocumentaryImages"] = 0
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            COLLECTOR.DB_DIR = base / ".publisher-data" / "alien-world"
            COLLECTOR.DB_PATH = COLLECTOR.DB_DIR / "alien-world.sqlite3"
            COLLECTOR.MEDIA_DIR = COLLECTOR.DB_DIR / "media"
            logs: list[str] = []
            with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=payload), \
                 mock.patch.object(COLLECTOR, "article_media", return_value=[]):
                stats = COLLECTOR.collect(profile, now, logs)
            self.assertEqual(stats["databaseRecords"], 6)
            self.assertTrue(COLLECTOR.DB_PATH.is_file())
            self.assertFalse((base / "published").exists())
            with sqlite3.connect(COLLECTOR.DB_PATH) as con:
                count = con.execute("SELECT COUNT(*) FROM stories WHERE view_id='alien-world'").fetchone()[0]
                self.assertEqual(count, 6)

    def test_original_article_image_is_downloaded_and_provenance_is_retained(self):
        image_bytes = io.BytesIO()
        Image.new("RGB", (320, 200), "navy").save(image_bytes, format="JPEG")
        candidate = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission.jpg",
            "caption": "NASA mission hardware",
            "credit": "NASA / Kennedy Space Center",
        }
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / "mission.jpg"
            with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=image_bytes.getvalue()):
                result = COLLECTOR.download_article_image(candidate, "https://www.nasa.gov/news/mission/", target)
            self.assertIsNotNone(result)
            self.assertTrue(target.is_file())
            self.assertEqual(result["url"], candidate["url"])
            self.assertEqual(result["source_url"], "https://www.nasa.gov/news/mission/")
            self.assertIn("third-party usage terms", result["rights_note"])


class ArchitectureBoundaryTests(unittest.TestCase):
    def test_publisher_has_no_network_collection_or_database_writer_access(self):
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
        forbidden_imports = {"urllib.request", "requests", "httpx", "feedparser", "PIL"}
        self.assertFalse(forbidden_imports.intersection(imports))
        self.assertNotIn("urlopen", calls)
        self.assertNotIn("open_writer_db", calls)
        self.assertNotIn("collect_sources", calls)
        self.assertNotIn("prepare_images", calls)
        self.assertIn("run_engine", calls)
        self.assertIn("read_only_connection", calls)
        self.assertIn("run_contract_tests", calls)

    def test_collector_is_the_only_declared_source_and_database_owner(self):
        self.assertEqual(PROFILE["collection"]["networkAccessOwner"], "AlienWorldDataCollector")
        self.assertTrue(PROFILE["collection"]["writesDatabase"])
        self.assertFalse(PROFILE["collection"]["writesPublicationOutputs"])
        self.assertFalse(PROFILE["output"]["publisherNetworkAccess"])
        self.assertFalse(PROFILE["output"]["publisherDatabaseWriteAccess"])

    def test_main_page_client_clears_online_stories_and_lists_saved_pdfs(self):
        client_path = ROOT / "alien-world-publisher-client.js"
        source = client_path.read_text(encoding="utf-8")
        self.assertIn("window.addEventListener('offline', clearOnlineStories)", source)
        self.assertIn("window.addEventListener('online', refreshVisibleTab)", source)
        self.assertIn("listSaved()", source)
        self.assertIn("allowSavedFallback: true", source)
        self.assertNotIn("localStorage", source)
        self.assertNotIn("indexedDB", source)

    @unittest.skipUnless(ENGINE_PATH.is_file(), "Engine source is available in the complete repository only")
    def test_universal_engine_has_no_source_network_fetching(self):
        tree = ast.parse(ENGINE_PATH.read_text(encoding="utf-8"))
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module or "")
        forbidden = {"urllib.request", "requests", "httpx", "feedparser"}
        self.assertFalse(forbidden.intersection(imports))

    @unittest.skipUnless(ENGINE_PATH.is_file(), "Engine source is available in the complete repository only")
    def test_engine_consumes_read_only_db_and_produces_feed_and_real_pdf(self):
        sys.path.insert(0, str(ENGINE_PATH.parent))
        import universal_editorial_engine as engine

        now = datetime.now(timezone.utc).replace(microsecond=0)
        db = sqlite3.connect(":memory:")
        db.row_factory = sqlite3.Row
        db.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
        db.execute("INSERT INTO publisher_meta VALUES('view_id','alien-world')")
        db.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL,summary TEXT NOT NULL,
            source_name TEXT NOT NULL,source_url TEXT NOT NULL,published_at REAL NOT NULL,retrieved_at REAL NOT NULL,
            image_url TEXT,image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,
            image_rights_status TEXT,image_rights_note TEXT,view_id TEXT NOT NULL)""")
        for index in range(6):
            published = now - timedelta(hours=index + 1)
            db.execute("""INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
                f"story-{index}", f"NASA science report {index}", f"https://www.nasa.gov/news/report-{index}/",
                f"A substantial source-linked summary describing a science report with useful context for test {index}.",
                "NASA News", "https://www.nasa.gov/news-release/feed/", published.timestamp(), now.timestamp(),
                None, None, None, None, None, None, None, "alien-world"))
        profile = json.loads(json.dumps(PROFILE))
        command = {
            "commandId": "test-command", "viewId": "alien-world", "publisherId": "alien-world-publisher",
            "issuedAt": now.isoformat(), "mode": "all",
            "customRequest": "minimal light text-led 8 pages timeline explainer",
        }
        with tempfile.TemporaryDirectory() as temp:
            result = engine.run_engine(db, profile, command, Path(temp), now)
            self.assertEqual(result["feed"]["storyCount"], 6)
            pdf_path = Path(temp) / result["magazine"]["relativePath"]
            self.assertTrue(pdf_path.is_file())
            self.assertEqual(len(PdfReader(str(pdf_path)).pages), result["magazine"]["pages"])
            self.assertIn("sha256", result["magazine"])
        with self.assertRaises(sqlite3.OperationalError):
            db.execute("DELETE FROM stories")
        db.close()

    @unittest.skipUnless(ENGINE_PATH.is_file(), "Engine source is available in the complete repository only")
    def test_failed_magazine_keeps_previous_pdf_untouched(self):
        sys.path.insert(0, str(ENGINE_PATH.parent))
        import universal_editorial_engine as engine
        now = datetime.now(timezone.utc)
        brief = engine.build_brief(PROFILE, {
            "viewId": "alien-world", "publisherId": "alien-world-publisher", "customRequest": "8 pages"
        })
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "last-good.pdf"
            original = b"last-known-good-publication"
            path.write_bytes(original)
            with self.assertRaises(engine.EditorialEngineError):
                engine.build_magazine_pdf(brief, [{"title": "One story"}], path, {}, now)
            self.assertEqual(path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
