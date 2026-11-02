from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "global-checker"))
sys.path.insert(0, str(ROOT / "image-engine"))

import global_checker as checker
import global_checker_policy_engine
from image_engine_integration import attach_original_illustrations, prepare_database_illustrations

# Match the production bootstrap: the shared registry policy engine is installed
# before any Collector/Publisher decision is exercised.
global_checker_policy_engine.install(checker)


class ImageEnginePublisherIntegrationTests(unittest.TestCase):
    CASES = (
        (
            "nature", "Phys.org — Environment",
            "https://phys.org/rss-feed/earth-news/environment/",
            "https://phys.org/news/2026-11-ecology.html",
        ),
        (
            "alien-world", "NASA News",
            "https://www.nasa.gov/news-release/feed/",
            "https://www.nasa.gov/news/example-mission/",
        ),
    )

    def _story(self, view_id, source_name, source_url, article_url):
        story = {
            "id": "image-engine-story-001",
            "title": "New ecological research reports important findings" if view_id == "nature"
                     else "NASA announces a new planetary research mission",
            "summary": "An approved long-form summary describes the scientific findings and their context. "
                       "It contains enough meaningful detail for educational presentation.",
            "url": article_url,
            "sourceName": source_name,
            "sourceUrl": source_url,
            "author": "NASA Communications" if view_id == "alien-world" else "",
        }
        return story

    def test_both_views_publish_only_checker_approved_original_artwork(self):
        for view_id, source_name, source_url, article_url in self.CASES:
            with self.subTest(view=view_id), tempfile.TemporaryDirectory() as temp:
                base = Path(temp)
                db_path = base / "view.sqlite3"
                connection = sqlite3.connect(db_path)
                connection.row_factory = sqlite3.Row
                checker.ensure_decision_table(connection)
                story = self._story(view_id, source_name, source_url, article_url)
                text_decision = checker.evaluate_text(view_id, story)
                self.assertTrue(text_decision["allowed"], text_decision["reasons"])
                checker.record_decision(connection, text_decision)
                connection.close()

                feed = {
                    "schemaVersion": 1,
                    "viewId": view_id,
                    "publisherId": "nature-publisher" if view_id == "nature" else "alien-world-publisher",
                    "generatedAt": "2026-11-02T12:00:00Z",
                    "windowHours": 48,
                    "storyCount": 1,
                    "stories": [dict(story)],
                }
                output_dir = base / "published" / "assets"
                raw_base = (
                    "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
                    f"{view_id}/published/assets/"
                )
                records = attach_original_illustrations(
                    feed, view_id, database_path=db_path, output_dir=output_dir,
                    raw_asset_base_url=raw_base, checker=checker,
                )
                self.assertEqual(len(records), 1)
                self.assertEqual(feed["stories"][0]["imageOriginType"], "local-original-illustration")
                self.assertIn("not a literal depiction", feed["stories"][0]["imageCaption"])
                self.assertTrue((output_dir / Path(records[0]["file"]).name).is_file())

                connection = sqlite3.connect(db_path)
                connection.row_factory = sqlite3.Row
                approved = checker.gate_feed(feed, connection, view_id)
                connection.close()
                self.assertEqual(approved["storyCount"], 1)
                self.assertEqual(approved["stories"][0]["imageRights"]["verdict"], "GREEN")
                self.assertEqual(approved["stories"][0]["imageRights"]["allowedUse"], "illustrative-artwork-only")
                self.assertEqual(approved["stories"][0]["imageRights"]["engineVersion"], "0.2.0")


    def test_pre_layout_preparation_approves_headline_only_fallback_and_skips_storage_denied_text(self):
        for view_id in ("nature", "alien-world"):
            with self.subTest(view=view_id), tempfile.TemporaryDirectory() as temp:
                base = Path(temp)
                db_path = base / "view.sqlite3"
                connection = sqlite3.connect(db_path)
                connection.row_factory = sqlite3.Row
                connection.execute("CREATE TABLE publisher_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)")
                connection.execute("INSERT INTO publisher_meta VALUES('view_id',?)", (view_id,))
                connection.execute("""CREATE TABLE stories(
                    story_id TEXT PRIMARY KEY,title TEXT NOT NULL,url TEXT NOT NULL,summary TEXT NOT NULL,
                    source_name TEXT NOT NULL,source_url TEXT NOT NULL,published_at REAL NOT NULL,
                    image_url TEXT,image_local_path TEXT,image_caption TEXT,image_credit TEXT,
                    image_source_url TEXT,image_rights_note TEXT,view_id TEXT NOT NULL)""")
                checker.ensure_decision_table(connection)
                allowed = {
                    "id": f"{view_id}-headline-only",
                    "title": "NASA reports a new planetary science observation",
                    "summary": "",
                    "url": "https://www.nasa.gov/news/example-observation/",
                    "sourceName": "NASA News" if view_id == "alien-world" else "NASA — Image of the Day",
                    "sourceUrl": "https://www.nasa.gov/news-release/feed/" if view_id == "alien-world" else "https://www.nasa.gov/feeds/iotd-feed/",
                }
                allowed_decision = checker.evaluate_text(view_id, allowed)
                self.assertTrue(allowed_decision["allowed"], allowed_decision["reasons"])
                self.assertFalse(allowed_decision["summaryAllowed"])
                checker.record_decision(connection, allowed_decision)

                denied = {
                    "id": f"{view_id}-denied",
                    "title": "Unregistered third-party research report",
                    "summary": "",
                    "url": "https://example.com/restricted-report/",
                    "sourceName": "Unregistered source",
                    "sourceUrl": "https://example.com/feed/",
                }
                denied_decision = checker.evaluate_text(view_id, denied)
                self.assertFalse(denied_decision["allowed"])
                checker.record_decision(connection, denied_decision)

                now = datetime.now(timezone.utc)
                for item in (allowed, denied):
                    connection.execute(
                        """INSERT INTO stories(story_id,title,url,summary,source_name,source_url,published_at,
                           image_url,image_local_path,image_caption,image_credit,image_source_url,image_rights_note,view_id)
                           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                        (item["id"], item["title"], item["url"], item["summary"], item["sourceName"],
                         item["sourceUrl"], now.timestamp(), None, None, None, None, None, None, view_id),
                    )
                connection.commit()
                connection.close()

                output_dir = base / "published" / "assets"
                raw_base = (
                    "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
                    f"{view_id}/published/assets/"
                )
                records = prepare_database_illustrations(
                    view_id, database_path=db_path, output_dir=output_dir,
                    raw_asset_base_url=raw_base, checker=checker, lookback_hours=768,
                )
                self.assertEqual([record["storyId"] for record in records], [allowed["id"]])
                self.assertTrue((output_dir / Path(records[0]["file"]).name).is_file())
                self.assertEqual(records[0]["originType"], "local-original-illustration")

    def test_wrong_engine_version_is_held(self):
        from image_engine import ImageEngine
        import tempfile as _tempfile
        with _tempfile.TemporaryDirectory() as temp:
            view_id = "nature"
            article_url = "https://phys.org/news/2026-11-ecology.html"
            candidate = ImageEngine(Path(temp) / "stage").create_original_illustration(
                {"id": "story-version", "url": article_url, "title": "Ecological research findings"},
                view_id,
                published_base_url=(
                    "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
                    "nature/published/assets/"
                ),
            )
            candidate["engineVersion"] = "0.1.0-test"
            decision = checker.evaluate_image(
                view_id, "story-version", candidate,
                article_url=article_url, source_name="Phys.org — Environment",
            )
            self.assertFalse(decision["allowed"])
            self.assertEqual(decision["verdict"], "UNKNOWN")

    def test_caption_must_disclose_that_artwork_is_not_a_literal_story_depiction(self):
        from image_engine import ImageEngine
        with tempfile.TemporaryDirectory() as temp:
            article_url = "https://phys.org/news/2026-11-ecology.html"
            candidate = ImageEngine(Path(temp) / "stage").create_original_illustration(
                {"id": "story-caption", "url": article_url, "title": "Ecological research findings"},
                "nature",
                published_base_url=(
                    "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
                    "nature/published/assets/"
                ),
            )
            candidate["caption"] = (
                "Original thematic digital illustration. It is not a documentary photograph "
                "or data-accurate scientific visualization."
            )
            decision = checker.evaluate_image(
                "nature", "story-caption", candidate,
                article_url=article_url, source_name="Phys.org — Environment",
            )
            self.assertFalse(decision["allowed"])
            self.assertEqual(decision["verdict"], "UNKNOWN")
            self.assertIn("not a literal depiction", decision["reasons"][0])

    def test_existing_documentary_image_is_not_overwritten(self):
        view_id, source_name, source_url, article_url = self.CASES[0]
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            db_path = base / "view.sqlite3"
            connection = sqlite3.connect(db_path)
            connection.row_factory = sqlite3.Row
            checker.ensure_decision_table(connection)
            story = self._story(view_id, source_name, source_url, article_url)
            checker.record_decision(connection, checker.evaluate_text(view_id, story))
            connection.close()
            story.update({
                "imageUrl": "https://raw.githubusercontent.com/example/project/photo.jpg",
                "imageCredit": "Photographer · CC BY 4.0",
                "imageSourceUrl": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            })
            feed = {"viewId": view_id, "generatedAt": "2026-11-02T12:00:00Z", "stories": [story]}
            records = attach_original_illustrations(
                feed, view_id, database_path=db_path, output_dir=base / "assets",
                raw_asset_base_url=(
                    "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
                    "nature/published/assets/"
                ), checker=checker,
            )
            self.assertEqual(records, [])
            self.assertIn("/photo.jpg", story["imageUrl"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
