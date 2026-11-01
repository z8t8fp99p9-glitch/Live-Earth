from __future__ import annotations
import sqlite3
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from run_pipeline import (CheckedConnection, _atomic_nature_feed_and_manifest,
                          check_alien_image_candidate, check_nature_image_metadata,
                          extract_commons_metadata_for_checker, filter_sources_for_registry)
import global_checker as checker


class RunnerPreStorageTests(unittest.TestCase):
    def test_nature_phys_org_summary_is_removed_before_insert(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        raw.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,title TEXT,url TEXT UNIQUE,summary TEXT,
            source_name TEXT,source_url TEXT,published_at REAL,retrieved_at REAL,view_id TEXT)""")
        wrapped = CheckedConnection(raw, "nature", {})
        wrapped.execute("""INSERT INTO stories(
            story_id,title,url,summary,source_name,source_url,published_at,retrieved_at,view_id
        ) VALUES(?,?,?,?,?,?,?,?,'nature')""", (
            "p1", "Wildlife research reports a new finding", "https://phys.org/news/example.html",
            "A source summary that is not allowed to be stored.", "Phys.org — Environment",
            "https://phys.org/rss-feed/earth-news/environment/", 100.0, 101.0
        ))
        row = raw.execute("SELECT summary FROM stories WHERE story_id='p1'").fetchone()
        self.assertEqual(row["summary"], "")
        decision = checker.get_decision(raw, "nature", "p1", "text")
        self.assertEqual(decision["verdict"], "AMBER")
        self.assertFalse(decision["summaryAllowed"])
        raw.close()

    def test_sciencedaily_is_rejected_before_insert(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        raw.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,title TEXT,url TEXT UNIQUE,summary TEXT,
            source_name TEXT,source_url TEXT,published_at REAL,retrieved_at REAL,view_id TEXT)""")
        wrapped = CheckedConnection(raw, "nature", {})
        wrapped.execute("""INSERT INTO stories(
            story_id,title,url,summary,source_name,source_url,published_at,retrieved_at,view_id
        ) VALUES(?,?,?,?,?,?,?,?,'nature')""", (
            "sd1", "ScienceDaily environment report", "https://www.sciencedaily.com/releases/example.htm",
            "Text that must not be stored.", "ScienceDaily — Environment",
            "https://www.sciencedaily.com/rss/top/environment.xml", 100.0, 101.0
        ))
        row = raw.execute("SELECT COUNT(*) FROM stories").fetchone()[0]
        decision = checker.get_decision(raw, "nature", "sd1", "text")
        self.assertEqual(row, 0)
        self.assertEqual(decision["verdict"], "RED")
        self.assertFalse(decision["allowed"])
        raw.close()

    def test_nasa_story_is_allowed_before_insert(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        raw.execute("""CREATE TABLE stories(
            story_id TEXT PRIMARY KEY,view_id TEXT,url TEXT,title TEXT,summary TEXT,
            source_name TEXT,source_url TEXT,feed_guid TEXT,published_at REAL,retrieved_at REAL)""")
        wrapped = CheckedConnection(raw, "alien-world", {})
        wrapped.execute("""INSERT INTO stories(
            story_id,view_id,url,title,summary,source_name,source_url,feed_guid,published_at,retrieved_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?)""", (
            "n1", "alien-world", "https://www.nasa.gov/news/example/", "NASA mission update",
            "NASA reports a new mission and its stated objectives.", "NASA News",
            "https://www.nasa.gov/news-release/feed/", "n1", 100.0, 101.0
        ))
        row = raw.execute("SELECT COUNT(*) FROM stories").fetchone()[0]
        decision = checker.get_decision(raw, "alien-world", "n1", "text")
        self.assertEqual(row, 1)
        self.assertEqual(decision["verdict"], "GREEN")
        raw.close()

    def test_alien_image_candidate_is_checked_and_recorded_before_download(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        raw.execute("CREATE TABLE stories(story_id TEXT PRIMARY KEY, view_id TEXT, url TEXT)")
        decision = check_alien_image_candidate(
            raw,
            {"url": "https://www.nasa.gov/sites/default/files/concept.jpg",
             "sourcePage": "https://www.nasa.gov/news/example/",
             "caption": "Artist's concept of a spacecraft", "credit": "NASA"},
            "https://www.nasa.gov/news/example/", "NASA source illustration / artist concept"
        )
        self.assertFalse(decision["allowed"])
        saved = checker.get_decision(raw, "alien-world", decision["storyId"], "image")
        self.assertIsNotNone(saved)
        self.assertEqual(saved["verdict"], "RED")
        raw.close()

    def test_red_nature_feeds_are_filtered_before_network_retrieval(self):
        sources = [
            {"name": "Nature Portfolio — Ecology", "url": "https://www.nature.com/subjects/ecology.rss"},
            {"name": "ScienceDaily — Environment", "url": "https://www.sciencedaily.com/rss/top/environment.xml"},
            {"name": "Phys.org — Environment", "url": "https://phys.org/rss-feed/earth-news/environment/"},
            {"name": "Mongabay", "url": "https://news.mongabay.com/feed/"},
        ]
        permitted, blocked = filter_sources_for_registry("nature", sources, checker.load_registry())
        self.assertEqual(blocked, ["Nature Portfolio — Ecology", "ScienceDaily — Environment"])
        self.assertEqual([s["name"] for s in permitted], ["Phys.org — Environment", "Mongabay"])



    def test_commons_metadata_extractor_passes_rights_evidence_to_global_checker(self):
        import json
        import re
        import urllib.parse
        from types import SimpleNamespace

        payload = {"query": {"pages": [{
            "title": "File:Example.jpg",
            "imageinfo": [{
                "descriptionurl": "https://commons.wikimedia.org/wiki/File:Example.jpg",
                "thumburl": "https://upload.wikimedia.org/wikipedia/commons/thumb/example.jpg",
                "mime": "image/jpeg", "width": 900, "height": 600,
                "extmetadata": {
                    "Artist": {"value": "Creator Name"},
                    "LicenseShortName": {"value": "All Rights Reserved"},
                    "LicenseUrl": {"value": "https://example.com/restricted"},
                    "Copyrighted": {"value": "true"},
                },
            }],
        }]}}

        def clean(value, limit=1200):
            return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]

        fake = SimpleNamespace(
            urllib=SimpleNamespace(parse=urllib.parse),
            ALLOWED_API_HOSTS={"commons.wikimedia.org"}, MAX_API_BYTES=4096,
            bounded_get=lambda *_args, **_kwargs: (json.dumps(payload).encode("utf-8"), 200, ""),
            clean=clean,
            normalize_commons_media_url=lambda value: value,
            safe_https=lambda value, hosts: value.startswith("https://commons.wikimedia.org/")
                or value.startswith("https://upload.wikimedia.org/"),
            normalize_license=lambda value: str(value or "").rstrip("/") + "/" if value else "",
        )
        metadata = extract_commons_metadata_for_checker(fake, "File:Example.jpg")
        self.assertEqual(metadata["creator"], "Creator Name")
        self.assertEqual(metadata["licenseUrl"], "https://example.com/restricted/")
        # Extraction alone does not approve it; the shared Checker owns the verdict.
        decision = check_nature_image_metadata(
            None,
            {"story_id": "nature-restricted-photo", "url": "https://phys.org/news/example.html"},
            {"fileTitle": "File:Example.jpg", "expectedCreator": "Creator Name",
             "expectedLicenseUrl": "https://creativecommons.org/licenses/by/4.0/",
             "contextCaption": "A forest photograph.", "usageNote": "Context only."},
            metadata,
        )
        self.assertFalse(decision["allowed"])
        self.assertEqual(decision["verdict"], "UNKNOWN")


    def test_alien_unknown_feed_route_is_blocked_before_network_retrieval(self):
        sources = [
            {"name": "NASA News", "feedUrl": "https://www.nasa.gov/news-release/feed/"},
            {"name": "Unregistered NASA Mirror", "feedUrl": "https://www.nasa.gov/unregistered-feed.xml"},
            {"name": "Other Space News", "feedUrl": "https://example.net/space.xml"},
        ]
        permitted, blocked = filter_sources_for_registry("alien-world", sources, checker.load_registry())
        self.assertEqual([item["name"] for item in permitted], ["NASA News"])
        self.assertEqual(blocked, ["Unregistered NASA Mirror", "Other Space News"])

    def test_unknown_feed_route_is_blocked_before_network_retrieval(self):
        sources = [
            {"name": "Unlisted Nature Source", "url": "https://unknown.example/feed.xml"},
            {"name": "Phys.org — Environment", "url": "https://phys.org/rss-feed/earth-news/environment/"},
        ]
        permitted, blocked = filter_sources_for_registry("nature", sources, checker.load_registry())
        self.assertEqual([item["name"] for item in permitted], ["Phys.org — Environment"])
        self.assertEqual(blocked, ["Unlisted Nature Source"])


    def test_nature_manifest_rolls_back_when_final_feed_replace_fails(self):
        import run_pipeline as runner
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = root / "assets" / "image-rights.json"
            feed = root / "live-feed.json"
            manifest.parent.mkdir(parents=True)
            old_manifest = b'{"images":[{"storyId":"last-good"}]}\n'
            old_feed = b'{"stories":[{"id":"last-good"}]}\n'
            manifest.write_bytes(old_manifest)
            feed.write_bytes(old_feed)
            real_replace = runner.os.replace
            calls = {"count": 0}

            def fail_feed_replace(source, destination):
                calls["count"] += 1
                if calls["count"] == 2:
                    raise OSError("simulated feed replace failure")
                return real_replace(source, destination)

            with mock.patch.object(runner.os, "replace", side_effect=fail_feed_replace):
                with self.assertRaisesRegex(OSError, "simulated feed replace failure"):
                    _atomic_nature_feed_and_manifest(
                        manifest, {"images": [{"storyId": "candidate"}]},
                        feed, {"stories": [{"id": "candidate"}]},
                    )
            self.assertEqual(manifest.read_bytes(), old_manifest)
            self.assertEqual(feed.read_bytes(), old_feed)

    def test_nature_image_final_gate_matches_usage_notice_and_full_provenance(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        checker.ensure_decision_table(raw)
        article_url = "https://phys.org/news/example.html"
        feed_url = "https://phys.org/rss-feed/earth-news/environment/"
        story_id = "nature-final-image-001"
        text_decision = checker.evaluate_text("nature", {
            "id": story_id, "title": "Wildlife conservation study finds a change",
            "url": article_url, "sourceUrl": feed_url,
            "sourceName": "Phys.org — Environment", "summary": "A source excerpt that will be omitted.",
        })
        checker.record_decision(raw, text_decision)
        image = {
            "url": "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/assets/example.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "creator": "Creator Name", "credit": "Creator Name · CC BY 4.0",
            "licenseName": "CC BY 4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "caption": "A contextual forest photograph; not the exact location in the article.",
            "rightsNotice": "Context photograph; not the exact location in the linked article.",
            "modificationNote": "Resized and converted to JPEG; factual content unchanged.",
            "expectedCreator": "Creator Name",
            "expectedLicenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        }
        image_decision = checker.evaluate_image("nature", story_id, image,
                                                 article_url=article_url, source_name="Nature")
        self.assertTrue(image_decision["allowed"], image_decision["reasons"])
        checker.record_decision(raw, image_decision)
        feed = {"schemaVersion": 1, "viewId": "nature", "storyCount": 1, "stories": [{
            "id": story_id, "title": "Wildlife conservation study finds a change", "url": article_url,
            "sourceUrl": feed_url, "summary": "This must be removed by headline-only policy.",
            "imageUrl": image["url"], "imageCredit": image["credit"],
            "imageSourceUrl": image["sourcePage"], "imageCaption": image["caption"],
            "imageRightsNote": image["rightsNotice"], "imageLicense": image["licenseName"],
            "imageLicenseUrl": image["licenseUrl"],
        }]}
        approved = checker.gate_feed(feed, raw, "nature", minimum_stories=1)
        self.assertEqual(approved["storyCount"], 1)
        self.assertEqual(approved["stories"][0]["summary"], "")
        self.assertEqual(approved["stories"][0]["imageUrl"], image["url"])
        self.assertIn("imageRights", approved["stories"][0])
        raw.close()

    def test_nature_commons_image_is_checked_and_recorded_before_download(self):
        raw = sqlite3.connect(":memory:")
        raw.row_factory = sqlite3.Row
        story = {"story_id": "nature-001", "url": "https://phys.org/news/example.html",
                 "source_name": "Phys.org — Environment"}
        allowlist = {"fileTitle": "File:Example.jpg", "expectedCreator": "Creator Name",
                     "expectedLicenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                     "contextCaption": "A contextual photograph of a forest.",
                     "usageNote": "Not the exact location in the article."}
        metadata = {"creator": "Creator Name", "licenseName": "CC BY 4.0",
                    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                    "descriptionUrl": "https://commons.wikimedia.org/wiki/File:Example.jpg",
                    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/example.jpg"}
        decision = check_nature_image_metadata(raw, story, allowlist, metadata)
        self.assertTrue(decision["allowed"])
        saved = checker.get_decision(raw, "nature", "nature-001", "image")
        self.assertIsNotNone(saved)
        self.assertEqual(saved["verdict"], "GREEN")
        raw.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
