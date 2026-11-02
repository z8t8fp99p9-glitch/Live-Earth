from __future__ import annotations
import importlib.util
import json
import sqlite3
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import global_checker as checker


class GlobalCheckerTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.execute("CREATE TABLE stories(story_id TEXT PRIMARY KEY, view_id TEXT NOT NULL)")
        checker.ensure_decision_table(self.db)

    def tearDown(self):
        self.db.close()

    def story(self, **overrides):
        base = {
            "id": "story-001", "title": "NASA announces a science mission",
            "summary": ("NASA describes a new mission and its scientific goals in a detailed educational report. "
                        "The item explains the objectives, scientific context, research methods and expected observations "
                        "for readers seeking reliable space-science information."),
            "url": "https://www.nasa.gov/news/example-mission/",
            "sourceName": "NASA News",
            "sourceUrl": "https://www.nasa.gov/news-release/feed/",
            "author": "NASA Communications",
        }
        return {**base, **overrides}

    def test_nasa_official_story_passes_conditionally(self):
        result = checker.evaluate_text("alien-world", self.story())
        self.assertTrue(result["allowed"])
        self.assertEqual(result["verdict"], "GREEN")
        self.assertEqual(result["attribution"], "NASA")

    def test_nasa_third_party_author_is_blocked(self):
        result = checker.evaluate_text("alien-world", self.story(author="Associated Press"))
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "RED")

    def test_phys_org_is_headline_only_and_discards_summary(self):
        item = self.story(
            id="phys-1", title="New ecological study reports findings",
            summary="This summary must not be retained.",
            url="https://phys.org/news/2026-11-ecology.html",
            sourceName="Phys.org — Environment",
            sourceUrl="https://phys.org/rss-feed/earth-news/environment/", author=""
        )
        result = checker.evaluate_text("nature", item)
        self.assertTrue(result["allowed"])
        self.assertEqual(result["verdict"], "AMBER")
        self.assertFalse(result["summaryAllowed"])
        self.assertEqual(result["allowedUse"], "headline-link-only")

    def test_sciencedaily_persistent_database_is_blocked(self):
        item = self.story(url="https://www.sciencedaily.com/releases/2026/11/example.htm",
                          sourceName="ScienceDaily — Environment",
                          sourceUrl="https://www.sciencedaily.com/rss/top/environment.xml")
        result = checker.evaluate_text("nature", item)
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "RED")

    def test_mongabay_requires_item_level_open_license(self):
        item = self.story(url="https://news.mongabay.com/2026/11/example/",
                          sourceName="Mongabay", sourceUrl="https://news.mongabay.com/feed/",
                          author="Reporter One")
        blocked = checker.evaluate_text("nature", item)
        self.assertFalse(blocked["allowed"])
        allowed = checker.evaluate_text("nature", {**item, "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"})
        self.assertTrue(allowed["allowed"])
        self.assertEqual(allowed["verdict"], "GREEN")

    def test_unregistered_source_fails_closed(self):
        item = self.story(url="https://example.org/story/", sourceUrl="https://example.org/rss")
        result = checker.evaluate_text("nature", item)
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "UNKNOWN")

    def test_commons_image_requires_creator_license_caption_and_source_page(self):
        image = {
            "url": "https://raw.githubusercontent.com/example/repo/main/photo.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "creator": "Creator Name", "credit": "Creator Name · CC BY 4.0",
            "caption": "Context photograph, not the exact specimen in the linked report.",
            "licenseName": "CC BY 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "expectedCreator": "Creator Name",
            "expectedLicenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "modificationNote": "Resized thumbnail to JPEG; attribution retained."
        }
        result = checker.evaluate_image("nature", "story-001", image,
                                        article_url="https://phys.org/news/2026/11/example.html")
        self.assertTrue(result["allowed"])
        self.assertEqual(result["verdict"], "GREEN")
        bad = checker.evaluate_image("nature", "story-001", {**image, "licenseUrl": ""},
                                     article_url="https://phys.org/news/2026/11/example.html")
        self.assertFalse(bad["allowed"])

    def test_nasa_concept_art_is_not_a_documentary_photo(self):
        image = {
            "url": "https://www.nasa.gov/wp-content/uploads/example.jpg",
            "sourcePage": "https://www.nasa.gov/news/example/",
            "creator": "NASA", "credit": "NASA", "caption": "Artist concept of a spacecraft",
        }
        result = checker.evaluate_image("alien-world", "story-001", image,
                                        article_url="https://www.nasa.gov/news/example/")
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "RED")

    def test_final_gate_requires_text_decision_and_strips_unapproved_image(self):
        story = self.story()
        decision = checker.evaluate_text("alien-world", story)
        checker.record_decision(self.db, decision)
        feed = {"schemaVersion": 1, "viewId": "alien-world", "storyCount": 1,
                "stories": [{"id": story["id"], "title": story["title"], "url": story["url"],
                             "sourceName": story["sourceName"], "sourceUrl": story["sourceUrl"],
                             "summary": story["summary"], "imageUrl": "https://www.nasa.gov/test.jpg",
                             "imageCredit": "NASA"}]}
        passed = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=1)
        self.assertEqual(passed["storyCount"], 1)
        self.assertEqual(passed["stories"][0]["rights"]["verdict"], "GREEN")
        self.assertIsNone(passed["stories"][0]["imageUrl"])
        self.assertEqual(passed["globalChecker"]["imagesStripped"], 1)
        self.assertEqual(passed["globalChecker"]["policy"], "fail-closed-text-or-image")

    def test_mismatched_or_missing_evidence_is_rejected(self):
        feed = {"schemaVersion": 1, "viewId": "alien-world", "storyCount": 1,
                "stories": [{"id": "missing", "title": "NASA report",
                             "sourceName": "NASA News", "sourceUrl": "https://www.nasa.gov/news-release/feed/",
                             "url": "https://www.nasa.gov/news/missing/", "summary": "x"}]}
        result = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=1)
        self.assertEqual(result["storyCount"], 0)
        self.assertEqual(result["globalChecker"]["textRejected"], 1)

    def test_decision_table_is_additive_and_prune_only_removes_orphans(self):
        story = self.story()
        result = checker.evaluate_text("alien-world", story)
        checker.record_decision(self.db, result)
        self.db.execute("INSERT INTO stories VALUES('story-001','alien-world')")
        self.db.commit()
        # A denied/retired story's decision remains useful audit evidence for
        # the same bounded 32-day horizon; it is not deleted immediately.
        self.assertEqual(checker.prune_decisions(self.db, "alien-world"), 0)
        self.db.execute("UPDATE global_checker_decisions SET checked_at='2026-09-20T00:00:00Z'")
        self.db.commit()
        self.assertEqual(checker.prune_decisions(self.db, "alien-world"), 1)

    def test_final_gate_requires_exact_source_feed_and_image_identity(self):
        stories = [{"id": "story-001", "title": self.story()["title"], "url": "https://www.nasa.gov/news/example-mission/",
                    "sourceName": "NASA News", "sourceUrl": "https://www.nasa.gov/news-release/feed/", "summary": self.story()["summary"],
                    "imageUrl": "https://www.nasa.gov/sites/default/files/image.jpg", "imageCredit": "NASA",
                    "imageSourceUrl": "https://www.nasa.gov/news/example-mission/"}]
        text_decision = checker.evaluate_text("alien-world", self.story())
        checker.record_decision(self.db, text_decision)
        image_decision = checker.evaluate_image(
            "alien-world", "story-001",
            {"url": "https://www.nasa.gov/sites/default/files/another-image.jpg",
             "sourcePage": "https://www.nasa.gov/news/example-mission/",
             "caption": "A NASA spacecraft in flight", "credit": "NASA"},
            article_url="https://www.nasa.gov/news/example-mission/", source_name="NASA News")
        checker.record_decision(self.db, image_decision)
        feed = {"schemaVersion": 1, "viewId": "alien-world", "publisherId": "alien-world-publisher",
                "generatedAt": "2026-11-02T00:00:00Z", "windowHours": 48, "storyCount": 1,
                "stories": stories}
        result = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=1)
        self.assertIsNone(result["stories"][0]["imageUrl"])

        result["stories"][0]["sourceUrl"] = ""
        rejected = checker.gate_feed(result, self.db, "alien-world", minimum_stories=1)
        self.assertEqual(rejected["storyCount"], 0)
        self.assertEqual(rejected["globalChecker"]["textRejected"], 1)

    def test_nature_portfolio_is_red_for_persistent_database_route(self):
        item = self.story(
            id="nature-portfolio-1", title="An ecology research report",
            summary="A research report with a detailed summary.",
            url="https://www.nature.com/articles/example",
            sourceName="Nature Portfolio — Ecology",
            sourceUrl="https://www.nature.com/subjects/ecology.rss", author="Nature Editorial"
        )
        result = checker.evaluate_text("nature", item)
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "RED")

    def test_nasa_image_without_context_caption_is_held(self):
        result = checker.evaluate_image(
            "alien-world", "story-001",
            {"url": "https://www.nasa.gov/wp-content/uploads/mission.jpg",
             "sourcePage": "https://www.nasa.gov/news/example/", "credit": "NASA"},
            article_url="https://www.nasa.gov/news/example/", source_name="NASA News")
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "UNKNOWN")

    def test_nasa_logo_is_not_cleared_as_a_documentary_image(self):
        result = checker.evaluate_image(
            "alien-world", "story-001",
            {"url": "https://www.nasa.gov/wp-content/uploads/nasa-insignia.jpg",
             "sourcePage": "https://www.nasa.gov/news/example/",
             "caption": "NASA insignia", "credit": "NASA"},
            article_url="https://www.nasa.gov/news/example/", source_name="NASA News")
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "RED")

    def test_jpl_or_other_non_nasa_authorship_is_not_assumed_public_domain(self):
        result = checker.evaluate_text("alien-world", self.story(author="Jet Propulsion Laboratory / Caltech"))
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "UNKNOWN")

    def test_storage_permission_without_display_permission_is_held(self):
        import unittest.mock as mock
        registry = checker.load_registry()
        altered = json.loads(json.dumps(registry))
        for policy in altered["policies"]:
            if policy["policyId"] == "nasa-official-federal-source-text-v1":
                policy["text"]["allowDisplay"] = False
        with mock.patch.object(checker, "load_registry", return_value=altered):
            result = checker.evaluate_text("alien-world", self.story())
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "UNKNOWN")

    def test_nasa_image_must_belong_to_exact_originating_article(self):
        result = checker.evaluate_image(
            "alien-world", "story-001",
            {"url": "https://www.nasa.gov/wp-content/uploads/mission.jpg",
             "sourcePage": "https://www.nasa.gov/another-story/",
             "caption": "NASA spacecraft in flight", "credit": "NASA"},
            article_url="https://www.nasa.gov/news/example/", source_name="NASA News")
        self.assertFalse(result["allowed"])
        self.assertEqual(result["verdict"], "UNKNOWN")

    def test_final_gate_rejects_changed_image_caption_rights_note_or_license(self):
        story = self.story()
        text_decision = checker.evaluate_text("alien-world", story)
        checker.record_decision(self.db, text_decision)
        image = {"url": "https://www.nasa.gov/sites/default/files/image.jpg",
                 "sourcePage": story["url"], "caption": "NASA spacecraft in orbit",
                 "credit": "NASA", "rightsNotice": "Approved source image. No NASA endorsement."}
        image_decision = checker.evaluate_image("alien-world", "story-001", image,
                                                article_url=story["url"], source_name="NASA News")
        checker.record_decision(self.db, image_decision)
        feed = {"schemaVersion": 1, "viewId": "alien-world", "storyCount": 1,
                "stories": [{"id": story["id"], "title": story["title"], "url": story["url"],
                             "sourceName": story["sourceName"], "sourceUrl": story["sourceUrl"],
                             "summary": story["summary"], "imageUrl": image["url"], "imageCredit": image["credit"],
                             "imageSourceUrl": image["sourcePage"],
                             "imageRightsNote": "Changed after the Checker decision."}]}
        result = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=1)
        self.assertIsNone(result["stories"][0]["imageUrl"])
        self.assertEqual(result["globalChecker"]["imagesStripped"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
