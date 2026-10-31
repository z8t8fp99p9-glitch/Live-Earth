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
PUBLISHER = load_module("alien_world_publisher_tests", PUBLISHER_PATH)
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

    def test_jsonld_string_image_url_is_extracted(self):
        article = "https://www.nasa.gov/news/example/"
        html = (b'<script type="application/ld+json">'
                b'{"@type":"NewsArticle","image":"https://www.nasa.gov/wp-content/uploads/story-image.jpg"}'
                b'</script>')
        with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=html):
            candidates = COLLECTOR.article_media(article, [])
        self.assertEqual(candidates[0]["url"], "https://www.nasa.gov/wp-content/uploads/story-image.jpg")

    def test_atom_escaped_html_summary_keeps_original_article_image(self):
        payload = b'''<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry><title>NASA science report with source image</title>
            <link href="https://science.nasa.gov/example/report/" rel="alternate"/>
            <summary type="html">&amp;lt;p&amp;gt;A source report with enough context.&amp;lt;/p&amp;gt;&amp;lt;img src=&amp;quot;https://assets.science.nasa.gov/example/report.jpg&amp;quot; alt=&amp;quot;Original NASA image&amp;quot;/&amp;gt;</summary>
            <published>2026-10-31T00:00:00Z</published>
          </entry>
        </feed>'''
        records = COLLECTOR.parse_feed(payload, "NASA Science", "https://science.nasa.gov/feed/")
        self.assertEqual(len(records), 1)
        urls = {entry["url"] for entry in records[0]["imageCandidates"]}
        self.assertIn("https://assets.science.nasa.gov/example/report.jpg", urls)

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

    def test_modern_nasa_article_jsonld_and_lazy_srcset_images_are_extracted(self):
        article = "https://science.nasa.gov/missions/example/"
        html = (b'<html><head>'
                b'<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","image":{"@type":"ImageObject","url":"https://assets.science.nasa.gov/cms/example/lead.jpg","caption":"NASA spacecraft image","creditText":"NASA"}}</script>'
                b'</head><body><picture><source data-lazy-srcset="https://assets.science.nasa.gov/cms/example/small.jpg 640w, https://assets.science.nasa.gov/cms/example/large.jpg 1920w"/></picture></body></html>')
        with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=html):
            candidates = COLLECTOR.article_media(article, [])
        urls = [item["url"] for item in candidates]
        self.assertIn("https://assets.science.nasa.gov/cms/example/lead.jpg", urls)
        self.assertNotIn(article, urls)
        self.assertLess(urls.index("https://assets.science.nasa.gov/cms/example/large.jpg"),
                        urls.index("https://assets.science.nasa.gov/cms/example/small.jpg"))

    def test_missing_individual_credit_uses_nasa_source_attribution(self):
        url = "https://www.nasa.gov/wp-content/uploads/example.jpg"
        item = {"url": url, "caption": "NASA image", "credit": "NASA"}
        self.assertTrue(COLLECTOR.image_is_eligible(item, "NASA science report"))
        self.assertFalse(COLLECTOR.image_is_eligible({"url": url.replace("https://", "http://")}, "NASA science report"))
        self.assertEqual(COLLECTOR.VALID_IMAGE_STATUS, "nasa-guideline-reviewed-exclusion-screened")

    def test_article_byline_is_not_substituted_for_image_credit(self):
        article = "https://www.nasa.gov/news/example/"
        page = b'''<html><head>
          <meta name="author" content="NASA Article Author"/>
          <meta property="og:image" content="https://www.nasa.gov/wp-content/uploads/example.jpg"/>
        </head></html>'''
        with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=page):
            candidates = COLLECTOR.article_media(article, [])
        self.assertEqual(candidates[0]["credit"], "NASA")
        self.assertNotEqual(candidates[0]["credit"], "NASA Article Author")
        self.assertTrue(COLLECTOR.image_is_eligible(candidates[0], "NASA science report"))

    def test_explicit_copyright_or_licence_notice_holds_image_back(self):
        item = {
            "url": "https://www.nasa.gov/wp-content/uploads/example.jpg",
            "caption": "NASA image",
            "credit": "NASA",
            "rightsNotice": "Copyright © Example Rights Holder; all rights reserved",
        }
        self.assertFalse(COLLECTOR.image_is_eligible(item, "NASA science report"))

    def test_automatic_image_discovery_is_enabled_without_manual_allowlists(self):
        self.assertTrue(PROFILE["imageUsePolicy"]["automaticImageDiscovery"])
        self.assertEqual(PROFILE["imageUsePolicy"]["mode"], "automatic-source-asset-screening")
        self.assertNotIn("verifiedArticleAssets", PROFILE["imageUsePolicy"])
        self.assertTrue(PROFILE["imageUsePolicy"]["magazineImagesAllowed"])
        self.assertFalse(PROFILE["imageUsePolicy"]["promotionalUseAllowed"])

    def test_previous_unreviewed_cached_images_are_removed_before_publication(self):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            old_paths = (COLLECTOR.DB_DIR, COLLECTOR.DB_PATH, COLLECTOR.MEDIA_DIR)
            COLLECTOR.DB_DIR = base / ".publisher-data" / "alien-world"
            COLLECTOR.DB_PATH = COLLECTOR.DB_DIR / "alien-world.sqlite3"
            COLLECTOR.MEDIA_DIR = COLLECTOR.DB_DIR / "media"
            profile = json.loads(json.dumps(PROFILE))
            profile["sources"] = []
            profile["editorialProfile"]["maximumDocumentaryImages"] = 1
            db = COLLECTOR.open_writer_db(profile)
            published = now - timedelta(hours=1)
            local = COLLECTOR.MEDIA_DIR / "old-unreviewed.jpg"
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_bytes(b"old cached image")
            db.execute('''INSERT INTO stories(
                story_id,view_id,url,title,summary,source_name,source_url,feed_guid,
                published_at,retrieved_at,image_url,image_local_path,image_caption,image_credit,
                image_source_url,image_rights_status,image_rights_note,image_checked_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (
                "old-story", "alien-world", "https://www.nasa.gov/news/unreviewed-story/",
                "NASA previously cached image story", "A substantial summary for cache policy testing.",
                "NASA News", "https://www.nasa.gov/news-release/feed/", "old-story",
                published.timestamp(), now.timestamp(), "https://www.nasa.gov/wp-content/uploads/old.jpg",
                str(local), "Old image", "NASA — individual image credit not stated in feed metadata",
                "https://www.nasa.gov/news/unreviewed-story/", COLLECTOR.VALID_IMAGE_STATUS,
                "Old heuristic status", now.timestamp(),
            ))
            db.commit()
            db.close()
            try:
                stats = COLLECTOR.collect(profile, now, [])
                self.assertEqual(stats["databaseImages"], 0)
                self.assertFalse(local.exists())
                with sqlite3.connect(COLLECTOR.DB_PATH) as check:
                    row = check.execute("SELECT image_url,image_local_path,image_rights_status FROM stories WHERE story_id='old-story'").fetchone()
                self.assertEqual(row, (None, None, None))
            finally:
                COLLECTOR.DB_DIR, COLLECTOR.DB_PATH, COLLECTOR.MEDIA_DIR = old_paths

    def test_image_quota_cleans_later_cached_images_in_engine_story_window(self):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            old_paths = (COLLECTOR.DB_DIR, COLLECTOR.DB_PATH, COLLECTOR.MEDIA_DIR)
            COLLECTOR.DB_DIR = base / ".publisher-data" / "alien-world"
            COLLECTOR.DB_PATH = COLLECTOR.DB_DIR / "alien-world.sqlite3"
            COLLECTOR.MEDIA_DIR = COLLECTOR.DB_DIR / "media"
            profile = json.loads(json.dumps(PROFILE))
            profile["sources"] = []
            profile["editorialProfile"]["maximumDocumentaryImages"] = 1
            db = COLLECTOR.open_writer_db(profile)
            for index in range(2):
                local = COLLECTOR.MEDIA_DIR / f"cached-{index}.jpg"
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_bytes(b"cached image")
                published = now - timedelta(minutes=index + 1)
                db.execute(
                    "INSERT INTO stories(story_id,view_id,url,title,summary,source_name,source_url,feed_guid,published_at,retrieved_at,image_url,image_local_path,image_caption,image_credit,image_source_url,image_rights_status,image_rights_note,image_checked_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (f"story-{index}", "alien-world", f"https://www.nasa.gov/news/story-{index}/",
                     f"NASA cached image story {index}", "A substantial source-linked summary for this story.",
                     "NASA News", "https://www.nasa.gov/news-release/feed/", f"story-{index}",
                     published.timestamp(), now.timestamp(), f"https://www.nasa.gov/images/{index}.jpg",
                     str(local), "NASA image", "NASA", f"https://www.nasa.gov/news/story-{index}/",
                     COLLECTOR.VALID_IMAGE_STATUS,
                     "Automated screening policy v3. NASA source image.", now.timestamp())
                )
            db.commit()
            db.close()
            try:
                with mock.patch.object(COLLECTOR, "article_media", return_value=[]) as media_mock:
                    stats = COLLECTOR.collect(profile, now, [])
                self.assertEqual(stats["imagesReused"], 1)
                self.assertEqual(stats["databaseImages"], 1)
                media_mock.assert_not_called()
                with sqlite3.connect(COLLECTOR.DB_PATH) as check:
                    rows = check.execute("SELECT story_id,image_url,image_local_path FROM stories ORDER BY published_at DESC").fetchall()
                self.assertIsNotNone(rows[0][1])
                self.assertIsNone(rows[1][1])
                self.assertIsNone(rows[1][2])
                self.assertFalse((COLLECTOR.MEDIA_DIR / "cached-1.jpg").exists())
            finally:
                COLLECTOR.DB_DIR, COLLECTOR.DB_PATH, COLLECTOR.MEDIA_DIR = old_paths

    def test_jsonld_copyright_notice_is_not_misused_as_image_credit(self):
        article = "https://www.nasa.gov/news/example/"
        html = (b'<script type="application/ld+json">'
                b'{"@type":"NewsArticle","image":{"@type":"ImageObject",'
                b'"url":"https://www.nasa.gov/wp-content/uploads/example.jpg",'
                b'"creditText":"NASA/JPL-Caltech","copyrightNotice":"Copyright Example Agency"}}'
                b'</script>')
        with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=html):
            candidates = COLLECTOR.article_media(article, [])
        self.assertEqual(candidates[0]["credit"], "NASA/JPL-Caltech")
        self.assertIn("Copyright Example Agency", candidates[0]["rightsNotice"])
        self.assertFalse(COLLECTOR.image_is_eligible(candidates[0], "NASA science report"))

    def test_joint_institutional_credit_is_not_rejected_without_restriction(self):
        item = {
            "url": "https://www.nasa.gov/wp-content/uploads/webb.jpg",
            "caption": "James Webb telescope image",
            "credit": "NASA, ESA, CSA, STScI; Image Processing: Joseph DePasquale (STScI)",
            "rightsNotice": "",
        }
        self.assertTrue(COLLECTOR.image_is_eligible(item, "NASA science report"))

    def test_known_stock_agency_and_explicit_rights_notice_are_held_back(self):
        for credit in ("NASA / Getty Images", "NASA / Shutterstock"):
            self.assertFalse(COLLECTOR.image_is_eligible({
                "url": "https://www.nasa.gov/wp-content/uploads/example.jpg", "credit": credit
            }, "NASA science report"))

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
            con = sqlite3.connect(COLLECTOR.DB_PATH)
            try:
                count = con.execute("SELECT COUNT(*) FROM stories WHERE view_id='alien-world'").fetchone()[0]
                self.assertEqual(count, 6)
            finally:
                con.close()

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
            with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=image_bytes.getvalue()) as fetch_mock:
                result = COLLECTOR.download_article_image(candidate, "https://www.nasa.gov/news/mission/", target)
            fetch_mock.assert_called_once_with(
                candidate["url"], COLLECTOR.MAX_IMAGE_BYTES, timeout=20,
                referer="https://www.nasa.gov/news/mission/",
            )
            self.assertIsNotNone(result)
            self.assertTrue(target.is_file())
            self.assertEqual(result["url"], candidate["url"])
            self.assertEqual(result["source_url"], "https://www.nasa.gov/news/mission/")
            self.assertIn("Automated screening policy v3", result["rights_note"])
            self.assertIn("not a licence, rights-holder permission, or legal clearance", result["rights_note"])
            self.assertEqual(result["rights_status"], "nasa-guideline-reviewed-exclusion-screened")

    def test_restricted_candidate_is_skipped_and_next_eligible_image_is_used(self):
        image_bytes = io.BytesIO()
        Image.new("RGB", (320, 200), "navy").save(image_bytes, format="JPEG")
        candidates = [
            {
                "url": "https://www.nasa.gov/wp-content/uploads/restricted.jpg",
                "caption": "NASA source image",
                "credit": "NASA",
                "rightsNotice": "Copyright Example Rights Holder; all rights reserved",
            },
            {
                "url": "https://www.nasa.gov/wp-content/uploads/eligible.jpg",
                "caption": "NASA source image",
                "credit": "NASA",
                "rightsNotice": "",
            },
        ]
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp) / "selected.jpg"
            with mock.patch.object(COLLECTOR, "fetch_bytes", return_value=image_bytes.getvalue()) as fetch_mock:
                found = None
                for candidate in candidates:
                    found = COLLECTOR.download_article_image(
                        candidate, "https://www.nasa.gov/news/example/", target
                    )
                    if found:
                        break
            self.assertIsNotNone(found)
            self.assertEqual(found["url"], candidates[1]["url"])
            fetch_mock.assert_called_once()

    def test_missing_image_is_retried_even_when_recent_failure_timestamp_exists(self):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        image_bytes = io.BytesIO()
        Image.new("RGB", (320, 200), "navy").save(image_bytes, format="JPEG")
        candidate = {
            "url": "https://assets.science.nasa.gov/cms/example/lead.jpg",
            "caption": "NASA source article hero image",
            "credit": "NASA",
        }
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            old_paths = (COLLECTOR.DB_DIR, COLLECTOR.DB_PATH, COLLECTOR.MEDIA_DIR)
            COLLECTOR.DB_DIR = base / ".publisher-data" / "alien-world"
            COLLECTOR.DB_PATH = COLLECTOR.DB_DIR / "alien-world.sqlite3"
            COLLECTOR.MEDIA_DIR = COLLECTOR.DB_DIR / "media"
            profile = json.loads(json.dumps(PROFILE))
            profile["sources"] = []
            profile["editorialProfile"]["maximumDocumentaryImages"] = 1
            db = COLLECTOR.open_writer_db(profile)
            published = now - timedelta(hours=1)
            db.execute("""INSERT INTO stories(
                story_id,view_id,url,title,summary,source_name,source_url,feed_guid,
                published_at,retrieved_at,image_checked_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""", (
                "retry-story", "alien-world", "https://www.nasa.gov/news/retry-story/",
                "NASA image retry test story", "A substantial summary for a retry test story.",
                "NASA News", "https://www.nasa.gov/news-release/feed/", "retry-story",
                published.timestamp(), now.timestamp(), now.timestamp() - 60,
            ))
            db.commit()
            db.close()
            logs: list[str] = []
            try:
                with mock.patch.object(COLLECTOR, "article_media", return_value=[candidate]) as media_mock, \
                     mock.patch.object(COLLECTOR, "fetch_bytes", return_value=image_bytes.getvalue()) as fetch_mock:
                    stats = COLLECTOR.collect(profile, now, logs)
                self.assertEqual(stats["imagesPrepared"], 1)
                self.assertEqual(stats["databaseImages"], 1)
                media_mock.assert_called_once()
                fetch_mock.assert_called_once()
            finally:
                COLLECTOR.DB_DIR, COLLECTOR.DB_PATH, COLLECTOR.MEDIA_DIR = old_paths


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

    def test_automated_images_remain_enabled_for_magazine_story_pages(self):
        self.assertTrue(PROFILE["imageUsePolicy"]["magazineImagesAllowed"])
        self.assertTrue(PROFILE["editorialProfile"]["visualProfile"]["photoLed"])
        source = PUBLISHER_PATH.read_text(encoding="utf-8")
        self.assertNotIn("text-led no images", source)

    def test_collector_is_the_only_declared_source_and_database_owner(self):
        self.assertEqual(PROFILE["collection"]["networkAccessOwner"], "AlienWorldDataCollector")
        self.assertTrue(PROFILE["collection"]["writesDatabase"])
        self.assertFalse(PROFILE["collection"]["writesPublicationOutputs"])
        self.assertFalse(PROFILE["output"]["publisherNetworkAccess"])
        self.assertFalse(PROFILE["output"]["publisherDatabaseWriteAccess"])

    @unittest.skipUnless((ROOT / "alien-world-publisher-client.js").is_file(),
                         "Main Page client is part of the complete repository only")
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
