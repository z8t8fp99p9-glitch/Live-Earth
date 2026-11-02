from __future__ import annotations

import sqlite3
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

CHECKER_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = CHECKER_DIR.parent
sys.path.insert(0, str(CHECKER_DIR))

import global_checker as checker
import global_checker_policy_engine
global_checker_policy_engine.install(checker)
from alien_world_pipeline import (
    _candidate_decision, _install_collector_checker, _install_engine_handoff,
)
from live_earth_global_checker_bootstrap import ENTRYPOINTS


class AlienWorldSingleCheckerTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        checker.ensure_decision_table(self.db)

    def tearDown(self):
        self.db.close()

    def test_concept_art_is_rejected_by_the_global_checker_before_download(self):
        article = "https://www.nasa.gov/news/example-mission/"
        candidate = {
            "url": "https://www.nasa.gov/wp-content/uploads/spacecraft-concept.jpg",
            "sourcePage": article,
            "caption": "Artist's concept of a future spacecraft",
            "credit": "NASA",
            "rightsNotice": "",
        }
        decision = _candidate_decision(self.db, candidate, article)
        self.assertFalse(decision["allowed"])
        self.assertEqual(decision["verdict"], "RED")
        saved = checker.get_decision(self.db, "alien-world", decision["storyId"], "image")
        self.assertIsNotNone(saved)
        self.assertEqual(saved["decisionId"], decision["decisionId"])

    def test_original_article_photo_with_caption_and_credit_passes_checker(self):
        article = "https://www.nasa.gov/news/example-mission/"
        candidate = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission-photo.jpg",
            "sourcePage": article,
            "caption": "A crew member works beside the spacecraft during the mission",
            "credit": "NASA",
            "rightsNotice": "",
        }
        decision = _candidate_decision(self.db, candidate, article)
        self.assertTrue(decision["allowed"], decision["reasons"])
        self.assertEqual(decision["verdict"], "GREEN")

    def test_missing_caption_is_held_by_checker(self):
        article = "https://www.nasa.gov/news/example-mission/"
        candidate = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission-photo.jpg",
            "sourcePage": article,
            "caption": "",
            "credit": "NASA",
            "rightsNotice": "",
        }
        decision = _candidate_decision(self.db, candidate, article)
        self.assertFalse(decision["allowed"])
        self.assertEqual(decision["verdict"], "UNKNOWN")

    def test_final_gate_accepts_only_exact_caption_and_preserves_it(self):
        article = "https://www.nasa.gov/news/example-mission/"
        feed_url = "https://www.nasa.gov/news-release/feed/"
        story_id = "alien-world-caption-test"
        story = {
            "id": story_id,
            "title": "NASA announces a science mission",
            "summary": "NASA describes the new science mission, its research goals, the spacecraft systems involved, and the planned operations that support the mission's scientific objectives.",
            "url": article,
            "sourceName": "NASA News",
            "sourceUrl": feed_url,
        }
        text_decision = checker.evaluate_text("alien-world", story)
        checker.record_decision(self.db, text_decision)
        image = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission-photo.jpg",
            "sourcePage": article,
            "caption": "A crew member works beside the spacecraft during the mission",
            "credit": "NASA",
            "rightsNotice": "Automated screening policy v3. Source rights notice: none exposed.",
        }
        image_decision = checker.evaluate_image(
            "alien-world", story_id, image, article_url=article, source_name="NASA News"
        )
        self.assertTrue(image_decision["allowed"], image_decision["reasons"])
        checker.record_decision(self.db, image_decision)
        feed = {
            "schemaVersion": 1,
            "viewId": "alien-world",
            "publisherId": "alien-world-publisher",
            "generatedAt": "2026-11-02T00:00:00Z",
            "windowHours": 48,
            "storyCount": 1,
            "stories": [{
                **story,
                "imageUrl": image["url"],
                "imageCredit": image["credit"],
                "imageSourceUrl": image["sourcePage"],
                "imageCaption": image["caption"],
                "imageRightsNote": image["rightsNotice"],
            }],
        }
        approved = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=1)
        self.assertEqual(approved["storyCount"], 1)
        self.assertEqual(approved["stories"][0]["imageCaption"], image["caption"])
        self.assertEqual(approved["stories"][0]["imageUrl"], image["url"])
        self.assertEqual(approved["globalChecker"]["combinedRoutes"], 1)

    def test_caption_changed_after_checker_decision_strips_image_but_keeps_story(self):
        article = "https://www.nasa.gov/news/example-mission/"
        story = {
            "id": "alien-world-caption-mismatch",
            "title": "NASA announces a science mission",
            "summary": "NASA describes the new science mission, its research goals, the spacecraft systems involved, and the planned operations that support the mission's scientific objectives.",
            "url": article,
            "sourceName": "NASA News",
            "sourceUrl": "https://www.nasa.gov/news-release/feed/",
        }
        checker.record_decision(self.db, checker.evaluate_text("alien-world", story))
        image = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission-photo.jpg",
            "sourcePage": article,
            "caption": "A crew member works beside the spacecraft during the mission",
            "credit": "NASA",
            "rightsNotice": "Automated screening policy v3. Source rights notice: none exposed.",
        }
        checker.record_decision(
            self.db,
            checker.evaluate_image("alien-world", story["id"], image,
                                   article_url=article, source_name="NASA News"),
        )
        feed = {
            "schemaVersion": 1, "viewId": "alien-world", "storyCount": 1,
            "stories": [{**story, "imageUrl": image["url"], "imageCredit": "NASA",
                         "imageSourceUrl": image["sourcePage"], "imageCaption": "Different caption",
                         "imageRightsNote": image["rightsNotice"]}],
        }
        approved = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=1)
        self.assertEqual(approved["storyCount"], 1)
        self.assertIsNone(approved["stories"][0]["imageUrl"])
        self.assertEqual(approved["globalChecker"]["imagesStripped"], 1)

    def test_editorial_engine_handoff_preserves_caption_and_image_evidence(self):
        engine = SimpleNamespace(
            text=lambda value, _limit=3000: str(value or ""),
            safe_https_url=lambda value: isinstance(value, str) and value.startswith("https://"),
            parse_timestamp=lambda _value: datetime(2026, 11, 2, tzinfo=timezone.utc),
            utc_iso=lambda value: value.isoformat().replace("+00:00", "Z"),
            _editorial_summary=lambda item: item.get("summary", ""),
            _apod_image_credit=lambda _item: "",
        )
        _install_engine_handoff(engine)
        brief = SimpleNamespace(
            view_id="alien-world", publisher_id="alien-world-publisher",
            issue_window_hours=48, maximum_stories=10,
        )
        story = {
            "id": "engine-caption-test",
            "title": "NASA announces a science mission",
            "summary": "A substantial story summary.",
            "url": "https://www.nasa.gov/news/example-mission/",
            "source_name": "NASA News",
            "source_url": "https://www.nasa.gov/news-release/feed/",
            "publishedAt": "2026-11-02T00:00:00Z",
            "image_url": "https://www.nasa.gov/wp-content/uploads/mission.jpg",
            "image_local_path": "/tmp/mission.jpg",
            "image_caption": "A crew member beside the spacecraft",
            "image_credit": "NASA",
            "image_source_url": "https://www.nasa.gov/news/example-mission/",
            "image_rights_note": "Source note retained unchanged",
        }
        from unittest import mock
        with mock.patch("pathlib.Path.is_file", return_value=True):
            payload = engine.build_live_feed(brief, [story], datetime(2026, 11, 2, tzinfo=timezone.utc))
        rendered = payload["stories"][0]
        self.assertEqual(rendered["imageCaption"], story["image_caption"])
        self.assertEqual(rendered["imageCredit"], story["image_credit"])
        self.assertEqual(rendered["imageSourceUrl"], story["image_source_url"])
        self.assertEqual(rendered["imageRightsNote"], story["image_rights_note"])

    def test_collector_image_eligibility_is_a_direct_checker_call(self):
        module = SimpleNamespace(
            open_writer_db=lambda _profile: self.db,
            clean_html=lambda value, limit=300: " ".join(str(value or "").split())[:limit],
        )
        _install_collector_checker(module, {})
        module._global_checker_connection = SimpleNamespace(raw=self.db)
        article = "https://www.nasa.gov/news/example-mission/"
        safe = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission-photo.jpg",
            "caption": "A crew member beside the spacecraft during the mission",
            "credit": "NASA",
            "rightsNotice": "",
        }
        concept = {
            "url": "https://www.nasa.gov/wp-content/uploads/mission-concept.jpg",
            "caption": "Artist's concept of a future spacecraft",
            "credit": "NASA",
            "rightsNotice": "",
        }
        self.assertTrue(module.image_is_eligible(safe, article))
        self.assertFalse(module.image_is_eligible(concept, article))
        self.assertFalse(module.has_restrictive_rights_notice({"rightsNotice": "ignored here"}))

    def test_bootstrap_routes_both_views_to_the_shared_global_checker_dispatcher(self):
        self.assertEqual(
            ENTRYPOINTS["alien-world/collector/collector.py"],
            ("collect", "alien-world", "alien_world_pipeline.py"),
        )
        self.assertEqual(
            ENTRYPOINTS["alien-world/publisher/publisher.py"],
            ("publish", "alien-world", "alien_world_pipeline.py"),
        )
        self.assertEqual(
            ENTRYPOINTS["nature/collector/collector.py"],
            ("collect", "nature", "nature_pipeline.py"),
        )
        self.assertEqual(
            ENTRYPOINTS["nature/publisher/publisher.py"],
            ("publish", "nature", "nature_pipeline.py"),
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
