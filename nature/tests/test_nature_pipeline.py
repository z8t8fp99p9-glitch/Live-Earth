from __future__ import annotations
import json
import sqlite3
from datetime import datetime, timezone
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(ROOT / "nature" / "collector"))
sys.path.insert(0, str(ROOT / "nature" / "publisher"))
import collector
import publisher

class CollectorContractTests(unittest.TestCase):
    def test_allowed_and_rejected_licences(self):
        self.assertIn(collector.normalize_license("https://creativecommons.org/licenses/by-sa/4.0/"),
                      collector.ACCEPTED_LICENSES)
        self.assertIn(collector.normalize_license("https://creativecommons.org/licenses/by/4.0"),
                      collector.ACCEPTED_LICENSES)
        self.assertNotIn(collector.normalize_license("https://creativecommons.org/licenses/by-nc/4.0/"),
                         collector.ACCEPTED_LICENSES)
        self.assertNotIn(collector.normalize_license("https://creativecommons.org/licenses/by-nd/4.0/"),
                         collector.ACCEPTED_LICENSES)

    def test_source_host_allowlist(self):
        self.assertTrue(collector.safe_https("https://www.nature.com/articles/example", collector.ALLOWED_FEED_HOSTS))
        self.assertTrue(collector.safe_https("https://www.theguardian.com/environment/story", collector.ALLOWED_FEED_HOSTS))
        self.assertTrue(collector.safe_https("https://www.wti.org.in/news/story", collector.ALLOWED_FEED_HOSTS))
        self.assertFalse(collector.safe_https("http://www.nature.com/articles/example", collector.ALLOWED_FEED_HOSTS))
        self.assertFalse(collector.safe_https("https://nature.com.evil.example/story", collector.ALLOWED_FEED_HOSTS))
        self.assertFalse(collector.safe_https("https://example.org/story", collector.ALLOWED_FEED_HOSTS))

    def test_rss_parser_keeps_relevant_source_links(self):
        payload = b"""<?xml version="1.0"?><rss version="2.0"><channel><item>
          <title>New forest restoration study reports biodiversity recovery</title>
          <link>https://www.nature.com/articles/test</link>
          <description>Researchers report on forest habitat and species recovery.</description>
          <pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate>
        </item><item><title>Football results</title><link>https://www.nature.com/sport</link>
          <description>Football match results.</description><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item>
        </channel></rss>"""
        stories = collector.parse_feed(payload, "Nature", "https://www.nature.com/subjects/ecology.rss")
        self.assertEqual(len(stories), 1)
        self.assertEqual(stories[0]["url"], "https://www.nature.com/articles/test")


    def test_atom_parser_reads_plain_text_summary_and_updated_date(self):
        payload = b'''<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Ocean ecosystem recovery creates new conservation evidence</title>
            <link rel="alternate" href="https://www.nature.com/articles/atom-test"/>
            <summary>Researchers describe marine biodiversity and ecosystem recovery.</summary>
            <updated>2026-10-15T12:00:00Z</updated>
          </entry>
        </feed>'''
        stories = collector.parse_feed(payload, "Nature", "https://www.nature.com/subjects/ecology.rss")
        self.assertEqual(len(stories), 1)
        self.assertIn("marine biodiversity", stories[0]["summary"])
        self.assertEqual(stories[0]["published"], "2026-10-15T12:00:00Z")

    def test_commons_media_urls_are_canonicalized_only_for_exact_upload_host(self):
        self.assertEqual(
            collector.normalize_commons_media_url("//upload.wikimedia.org/test.jpg"),
            "https://upload.wikimedia.org/test.jpg",
        )
        self.assertEqual(
            collector.normalize_commons_media_url("http://upload.wikimedia.org/test.jpg"),
            "https://upload.wikimedia.org/test.jpg",
        )
        with self.assertRaises(ValueError):
            collector.normalize_commons_media_url("https://upload.wikimedia.org.evil.example/test.jpg")
        with self.assertRaises(ValueError):
            collector.normalize_commons_media_url("https://evil.example/test.jpg")

    def test_ambiguous_commons_license_fails_closed(self):
        fake = {
          "query":{"pages":[{"title":"File:Test.jpg","imageinfo":[{
            "descriptionurl":"https://commons.wikimedia.org/wiki/File:Test.jpg",
            "thumburl":"https://upload.wikimedia.org/test.jpg","mime":"image/jpeg",
            "width":1200,"height":800,
            "extmetadata":{
              "Artist":{"value":"Test Photographer"},
              "LicenseShortName":{"value":"CC BY-NC 4.0"},
              "LicenseUrl":{"value":"https://creativecommons.org/licenses/by-nc/4.0/"},
              "Copyrighted":{"value":"False"}
            }
          }]}]}
        }
        with patch.object(collector,"bounded_get",return_value=(json.dumps(fake).encode(),"https://commons.wikimedia.org/w/api.php","application/json")):
            with self.assertRaises(ValueError):
                collector.commons_metadata("File:Test.jpg")


    def test_accepted_cc_license_is_not_rejected_just_for_being_copyrighted(self):
        fake = {
            "query": {"pages": [{
                "title": "File:Test.jpg",
                "imageinfo": [{
                    "descriptionurl": "https://commons.wikimedia.org/wiki/File:Test.jpg",
                    "thumburl": "//upload.wikimedia.org/test.jpg",
                    "mime": "image/jpeg", "width": 1200, "height": 800,
                    "extmetadata": {
                        "Artist": {"value": "Test Photographer"},
                        "LicenseShortName": {"value": "CC BY 4.0"},
                        "LicenseUrl": {"value": "https://creativecommons.org/licenses/by/4.0/"},
                        "Copyrighted": {"value": "True"}
                    }
                }]
            }]}
        }
        with patch.object(collector, "bounded_get", return_value=(
            json.dumps(fake).encode(), "https://commons.wikimedia.org/w/api.php", "application/json"
        )):
            result = collector.commons_metadata("File:Test.jpg")
        self.assertEqual(result["licenseName"], "CC BY 4.0")
        self.assertEqual(result["creator"], "Test Photographer")
        self.assertEqual(result["imageUrl"], "https://upload.wikimedia.org/test.jpg")

    def test_commons_creator_is_required(self):
        fake = {
          "query":{"pages":[{"title":"File:Test.jpg","imageinfo":[{
            "descriptionurl":"https://commons.wikimedia.org/wiki/File:Test.jpg",
            "thumburl":"https://upload.wikimedia.org/test.jpg","mime":"image/jpeg",
            "width":1200,"height":800,
            "extmetadata":{
              "Artist":{"value":""},
              "LicenseShortName":{"value":"CC BY 4.0"},
              "LicenseUrl":{"value":"https://creativecommons.org/licenses/by/4.0/"},
              "Copyrighted":{"value":"False"}
            }
          }]}]}
        }
        with patch.object(collector,"bounded_get",return_value=(json.dumps(fake).encode(),"https://commons.wikimedia.org/w/api.php","application/json")):
            with self.assertRaises(ValueError):
                collector.commons_metadata("File:Test.jpg")



    def test_seed_does_not_overwrite_a_fresher_rss_record(self):
        con=sqlite3.connect(":memory:")
        con.row_factory=sqlite3.Row
        con.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
        con.execute("INSERT INTO publisher_meta VALUES('view_id','nature')")
        con.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL UNIQUE,
            summary TEXT NOT NULL,source_name TEXT NOT NULL,source_url TEXT NOT NULL,
            published_at REAL NOT NULL,retrieved_at REAL NOT NULL,image_url TEXT,
            image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,
            image_rights_status TEXT,image_rights_note TEXT,view_id TEXT NOT NULL)""")
        record=json.loads((ROOT/"nature/collector/initial-october-seed.json").read_text())["stories"][0]
        con.execute("INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(
            "fresh-id",record["title"],record["url"],"Fresh RSS summary",
            "Nature RSS",record["sourceUrl"],
            collector.parse_date(record["publishedAt"]).timestamp(),
            datetime(2026,11,1,2,tzinfo=timezone.utc).timestamp(),
            None,None,None,None,None,None,None,"nature"))
        count=collector.import_initial_october_seed(con,datetime(2026,11,1,3,tzinfo=timezone.utc))
        self.assertEqual(count,7)
        saved=con.execute("SELECT summary FROM stories WHERE url=?",(record["url"],)).fetchone()[0]
        self.assertEqual(saved,"Fresh RSS summary")
        con.close()

    def test_october_seed_imports_once_during_november(self):
        con=sqlite3.connect(":memory:")
        con.row_factory=sqlite3.Row
        con.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
        con.execute("INSERT INTO publisher_meta VALUES('view_id','nature')")
        con.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL UNIQUE,
            summary TEXT NOT NULL,source_name TEXT NOT NULL,source_url TEXT NOT NULL,
            published_at REAL NOT NULL,retrieved_at REAL NOT NULL,image_url TEXT,
            image_local_path TEXT,image_caption TEXT,image_credit TEXT,image_source_url TEXT,
            image_rights_status TEXT,image_rights_note TEXT,view_id TEXT NOT NULL)""")
        now=datetime(2026,11,1,3,0,tzinfo=timezone.utc)
        imported=collector.import_initial_october_seed(con,now)
        self.assertEqual(imported,8)
        self.assertEqual(con.execute("SELECT COUNT(*) FROM stories WHERE view_id='nature'").fetchone()[0],8)
        self.assertEqual(collector.import_initial_october_seed(con,now),0)
        con.close()


    def test_commons_exact_file_title_is_required(self):
        fake = {
            "query": {
                "pages": [{
                    "title": "File:Other.jpg",
                    "imageinfo": [{
                        "descriptionurl": "https://commons.wikimedia.org/wiki/File:Other.jpg",
                        "thumburl": "https://upload.wikimedia.org/test.jpg",
                        "mime": "image/jpeg", "width": 1200, "height": 800,
                        "extmetadata": {
                            "Artist": {"value": "Test Photographer"},
                            "LicenseShortName": {"value": "CC BY 4.0"},
                            "LicenseUrl": {"value": "https://creativecommons.org/licenses/by/4.0/"},
                            "Copyrighted": {"value": "False"}
                        }
                    }]
                }]
            }
        }
        with patch.object(collector, "bounded_get", return_value=(
            json.dumps(fake).encode(), "https://commons.wikimedia.org/w/api.php", "application/json"
        )):
            with self.assertRaises(ValueError):
                collector.commons_metadata("File:Expected.jpg")


    def test_each_curated_documentary_photo_has_a_matching_october_story(self):
        profile=json.loads((ROOT/"nature/publisher/profile.json").read_text(encoding="utf-8"))
        seed=json.loads((ROOT/"nature/collector/initial-october-seed.json").read_text(encoding="utf-8"))
        stories=[{"title":s["title"],"summary":s["summary"]} for s in seed["stories"]]
        for asset in profile["imageAllowlist"]:
            self.assertTrue(
                any(collector.matches_category(story,asset["category"]) for story in stories),
                msg=f"No October seed story matches {asset['fileTitle']}"
            )
        water_lily=next(s for s in seed["stories"] if "water lily" in s["title"].lower())
        self.assertFalse(collector.matches_category(
            {"title":water_lily["title"],"summary":water_lily["summary"]},"tiger"
        ))


    def test_photo_matching_uses_only_previous_complete_month(self):
        # This is checked by the SQL window in attach_verified_images.
        source=(ROOT/"nature/collector/collector.py").read_text(encoding="utf-8")
        self.assertIn("published_at>=? AND published_at<?",source)
        self.assertIn("month_start.timestamp(), month_end.timestamp()",source)

    def test_profile_has_explicit_species_exclusion_and_configurable_photo_gate(self):
        profile=json.loads((ROOT/"nature/publisher/profile.json").read_text(encoding="utf-8"))
        self.assertEqual(profile["viewId"],"nature")
        self.assertEqual(profile["publication"]["minimumDocumentaryImages"],4)
        self.assertTrue(profile["editorialProfile"]["visualProfile"]["photoLed"])
        excluded=(ROOT/"nature/assets/IMAGE_RESEARCH_AND_RIGHTS.md").read_text(encoding="utf-8")
        self.assertIn("Victoria amazonica",excluded)
        self.assertIn("Victoria colombiana",excluded)


    def test_shared_browser_validator_has_separate_nature_and_nasa_image_boundaries(self):
        source=(ROOT/"editorial-engine/universal-editorial-engine.js").read_text(encoding="utf-8")
        self.assertIn("safeNasaImage(item.imageUrl)",source)
        self.assertIn("safeNaturePublicationImage(item.imageUrl)",source)
        self.assertIn("NATURE_RAW_PREFIX + 'assets/'",source)
        self.assertIn("NATURE_RAW_PREFIX + 'current.pdf'",source)

class PublisherContractTests(unittest.TestCase):
    def test_nature_engine_selection_keeps_verified_images_and_preserves_chronology(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake_root = Path(tmp)
            old_root = publisher.ROOT
            publisher.ROOT = fake_root
            try:
                rows = []
                verified = {}
                # Eight newest text-only items precede six older illustrated items.
                for i in range(14):
                    story_id = f"story-{i}"
                    row = {
                        "story_id": story_id,
                        "published_at": float(1000 - i),
                        "image_rights_status": None,
                        "image_local_path": None,
                        "image_url": None,
                        "image_credit": None,
                        "image_source_url": None,
                        "image_rights_note": None,
                    }
                    if i >= 8:
                        local = Path("media") / f"{story_id}.jpg"
                        target = fake_root / local
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(b"verified-image")
                        record = {
                            "local_path": local.as_posix(),
                            "image_url": f"https://raw.githubusercontent.com/example/{story_id}.jpg",
                            "credit": f"Creator {i} · CC BY 4.0",
                            "source_page": f"https://commons.wikimedia.org/wiki/File:{story_id}.jpg",
                        }
                        verified[story_id] = record
                        row.update({
                            "image_rights_status": publisher.IMAGE_STATUS,
                            "image_local_path": record["local_path"],
                            "image_url": record["image_url"],
                            "image_credit": record["credit"],
                            "image_source_url": record["source_page"],
                            "image_rights_note": "CC BY 4.0 · documented use",
                        })
                    rows.append(row)
                selected = publisher.select_engine_story_rows(rows, verified, 8)
                self.assertEqual(len(selected), 8)
                self.assertEqual(sum(1 for row in selected if row["story_id"] in verified), 6)
                self.assertEqual(
                    [row["published_at"] for row in selected],
                    sorted((row["published_at"] for row in selected), reverse=True),
                )
                self.assertEqual(
                    {row["story_id"] for row in selected if row["story_id"] in verified},
                    set(verified),
                )
            finally:
                publisher.ROOT = old_root

    def test_nature_engine_connection_intercepts_story_selection_without_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            old_root = publisher.ROOT
            publisher.ROOT = root
            con = sqlite3.connect(":memory:")
            con.row_factory = sqlite3.Row
            try:
                con.execute("CREATE TABLE stories(story_id TEXT, published_at REAL, image_rights_status TEXT, image_local_path TEXT, image_url TEXT, image_credit TEXT, image_source_url TEXT, image_rights_note TEXT, title TEXT)")
                verified = {}
                for i in range(10):
                    story_id = f"story-{i}"
                    fields = (None, None, None, None, None, None)
                    if i >= 6:
                        local = Path("media") / f"{story_id}.jpg"
                        target = root / local
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(b"verified-image")
                        record = {
                            "local_path": local.as_posix(),
                            "image_url": f"https://raw.githubusercontent.com/example/{story_id}.jpg",
                            "credit": f"Creator {i} · CC BY 4.0",
                            "source_page": f"https://commons.wikimedia.org/wiki/File:{story_id}.jpg",
                        }
                        verified[story_id] = record
                        fields = (publisher.IMAGE_STATUS, record["local_path"], record["image_url"], record["credit"], record["source_page"], "CC BY 4.0 · documented use")
                    con.execute("INSERT INTO stories VALUES(?,?,?,?,?,?,?,?,?)", (story_id, float(100-i), *fields, story_id))
                con.execute("PRAGMA query_only=ON")
                adapter = publisher.NatureEngineReadOnlyConnection(con, verified, 8)
                cursor = adapter.execute("SELECT story_id,title,published_at,image_rights_status,image_local_path,image_url,image_credit,image_source_url,image_rights_note FROM stories WHERE published_at >= ? AND published_at < ? ORDER BY published_at DESC LIMIT 500", (0, 200))
                selected = cursor.fetchall()
                self.assertTrue(adapter.story_selection_applied)
                self.assertEqual(adapter.selected_documentary_images, 4)
                self.assertEqual(len(selected), 8)
                self.assertEqual(sum(1 for row in selected if row["story_id"] in verified), 4)
                with self.assertRaises(sqlite3.OperationalError):
                    con.execute("INSERT INTO stories VALUES('nope',0,NULL,NULL,NULL,NULL,NULL,NULL,'nope')")
            finally:
                con.close()
                publisher.ROOT = old_root

    def test_publisher_opens_database_read_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            db=Path(tmp)/"nature.sqlite3"
            c=sqlite3.connect(db)
            c.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT)")
            c.execute("INSERT INTO publisher_meta VALUES('view_id','nature')")
            c.commit(); c.close()
            with patch.object(publisher,"DB_PATH",db):
                ro=publisher.open_readonly()
                with self.assertRaises(sqlite3.OperationalError):
                    ro.execute("INSERT INTO publisher_meta VALUES('x','y')")
                self.assertEqual(ro.execute("SELECT value FROM publisher_meta WHERE key='view_id'").fetchone()[0],"nature")
                ro.close()

    def test_publisher_has_no_source_network_client(self):
        source=(ROOT/"nature/publisher/publisher.py").read_text(encoding="utf-8")
        self.assertNotIn("urllib.request",source)
        self.assertNotIn("requests.get",source)
        self.assertIn("mode=ro",source)
        self.assertIn("PRAGMA query_only=ON",source)
        self.assertIn("preservedLastGood",source)

class BrowserContractTests(unittest.TestCase):
    def test_browser_only_consumes_published_outputs(self):
        client=(ROOT/"nature/view/nature-publisher-client.js").read_text(encoding="utf-8")
        view=(ROOT/"nature/view/nature-view-controller.js").read_text(encoding="utf-8")
        adapter=(ROOT/"nature-view-controller.js").read_text(encoding="utf-8")
        for token in ("cache: 'no-store'","live-feed.json","catalog.json","/nature/published/","LiveEarthUniversalPDFViewer.open"):
            self.assertIn(token,client)
        for forbidden in ("localStorage","indexedDB","caches.open","fetch("):
            self.assertNotIn(forbidden,view)
        self.assertIn("imageCredit",view)
        self.assertIn("imageSourceUrl",view)
        self.assertIn("LiveEarthFeatureViews",adapter)
        self.assertIn("./nature/view/nature-view-controller.js",adapter)

if __name__ == "__main__":
    unittest.main(verbosity=2)
