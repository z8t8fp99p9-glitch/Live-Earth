from __future__ import annotations
import sqlite3
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import global_checker as checker


class CheckerEligibilityTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        checker.ensure_decision_table(self.db)

    def tearDown(self):
        self.db.close()

    def physorg_story(self, **overrides):
        story = {
            "id": "phys-001",
            "title": "Researchers document a major change in a coastal ecosystem",
            "summary": "",
            "url": "https://phys.org/news/2026-11-coastal-ecosystem.html",
            "sourceName": "Phys.org — Environment",
            "sourceUrl": "https://phys.org/rss-feed/earth-news/environment/",
        }
        return {**story, **overrides}

    def nasa_story(self, **overrides):
        story = {
            "id": "nasa-001",
            "title": "NASA field team reports new observations from Earth orbit",
            "summary": (
                "NASA scientists describe a new set of observations collected during the mission. "
                "The report explains how the measurements were gathered, what the instruments detected, "
                "and why the results matter for understanding changes in Earth's atmosphere and oceans."
            ),
            "url": "https://www.nasa.gov/news/example-earth-observations/",
            "sourceName": "NASA News",
            "sourceUrl": "https://www.nasa.gov/news-release/feed/",
            "author": "NASA Communications",
        }
        return {**story, **overrides}

    def record_text(self, view, story):
        decision = checker.evaluate_text(view, story)
        checker.record_decision(self.db, decision)
        return decision

    def record_commons_image(self, story):
        image = {
            "url": "https://raw.githubusercontent.com/example/live-earth/main/photo.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Coastal_Wetland.jpg",
            "creator": "Documentary Photographer",
            "credit": "Documentary Photographer · CC BY 4.0",
            "caption": "A contextual photograph of a coastal wetland; not claimed to show the exact study site.",
            "rightsNotice": "Context image, not the photograph from the linked report.",
            "licenseName": "CC BY 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "modificationNote": "Resized to a bounded JPEG display copy; attribution retained.",
            "expectedCreator": "Documentary Photographer",
            "expectedLicenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        }
        decision = checker.evaluate_image(
            "nature", story["id"], image, article_url=story["url"], source_name=story["sourceName"]
        )
        checker.record_decision(self.db, decision)
        return image, decision

    def feed_story(self, story, **image_fields):
        return {
            "id": story["id"], "title": story["title"], "url": story["url"],
            "sourceName": story["sourceName"], "sourceUrl": story["sourceUrl"],
            "summary": story.get("summary", ""), **image_fields,
        }

    def test_meaningful_approved_text_alone_is_publishable(self):
        story = self.nasa_story()
        decision = self.record_text("alien-world", story)
        self.assertTrue(decision["allowed"])
        feed = {"schemaVersion": 1, "viewId": "alien-world", "stories": [self.feed_story(story)]}
        result = checker.gate_feed(feed, self.db, "alien-world", minimum_stories=2)
        self.assertEqual(result["storyCount"], 1)
        self.assertEqual(result["stories"][0]["publicationRoute"], "text")

    def test_physorg_headline_only_without_image_is_held_and_empty_feed_clears_stale_content(self):
        story = self.physorg_story()
        decision = self.record_text("nature", story)
        self.assertTrue(decision["allowed"])
        self.assertFalse(decision["summaryAllowed"])
        feed = {"schemaVersion": 1, "viewId": "nature", "stories": [self.feed_story(story)]}
        result = checker.gate_feed(feed, self.db, "nature", minimum_stories=2)
        self.assertEqual(result["storyCount"], 0)
        self.assertEqual(result["stories"], [])
        self.assertEqual(result["globalChecker"]["contentHeld"], 1)

    def test_verified_image_can_publish_headline_only_physorg_story(self):
        story = self.physorg_story()
        self.record_text("nature", story)
        image, decision = self.record_commons_image(story)
        self.assertTrue(decision["allowed"])
        feed_item = self.feed_story(
            story, imageUrl=image["url"], imageCredit=image["credit"],
            imageSourceUrl=image["sourcePage"], imageCaption=image["caption"],
            imageRightsNote=image["rightsNotice"], imageLicense=image["licenseName"],
            imageLicenseUrl=image["licenseUrl"],
        )
        result = checker.gate_feed(
            {"schemaVersion": 1, "viewId": "nature", "stories": [feed_item]},
            self.db, "nature", minimum_stories=2,
        )
        self.assertEqual(result["storyCount"], 1)
        self.assertEqual(result["stories"][0]["summary"], "")
        self.assertEqual(result["stories"][0]["publicationRoute"], "image")

    def test_approved_text_and_image_publish_together(self):
        story = self.nasa_story()
        self.record_text("alien-world", story)
        image = {
            "url": "https://www.nasa.gov/wp-content/uploads/earth-observation.jpg",
            "sourcePage": story["url"],
            "caption": "NASA image from the originating Earth-observation report.",
            "credit": "NASA",
            "rightsNotice": "NASA source image; no endorsement implied.",
        }
        image_decision = checker.evaluate_image(
            "alien-world", story["id"], image, article_url=story["url"], source_name=story["sourceName"]
        )
        checker.record_decision(self.db, image_decision)
        self.assertTrue(image_decision["allowed"])
        feed_item = self.feed_story(
            story, imageUrl=image["url"], imageCredit=image["credit"],
            imageSourceUrl=image["sourcePage"], imageCaption=image["caption"],
            imageRightsNote=image["rightsNotice"],
        )
        result = checker.gate_feed(
            {"schemaVersion": 1, "viewId": "alien-world", "stories": [feed_item]},
            self.db, "alien-world", minimum_stories=2,
        )
        self.assertEqual(result["stories"][0]["publicationRoute"], "text+image")

    def test_short_text_is_not_meaningful_without_approved_image(self):
        story = self.nasa_story(summary="A brief update with too little detail.")
        self.record_text("alien-world", story)
        result = checker.gate_feed(
            {"schemaVersion": 1, "viewId": "alien-world", "stories": [self.feed_story(story)]},
            self.db, "alien-world", minimum_stories=2,
        )
        self.assertEqual(result["storyCount"], 0)
        self.assertEqual(result["globalChecker"]["contentHeld"], 1)

    def test_short_text_can_still_publish_with_an_approved_relevant_image(self):
        story = self.physorg_story(summary="A short teaser that is not a meaningful body.")
        self.record_text("nature", story)
        image, _ = self.record_commons_image(story)
        result = checker.gate_feed(
            {"schemaVersion": 1, "viewId": "nature", "stories": [self.feed_story(
                story, imageUrl=image["url"], imageCredit=image["credit"],
                imageSourceUrl=image["sourcePage"], imageCaption=image["caption"],
                imageRightsNote=image["rightsNotice"], imageLicense=image["licenseName"],
                imageLicenseUrl=image["licenseUrl"],
            )]}, self.db, "nature", minimum_stories=2,
        )
        self.assertEqual(result["stories"][0]["publicationRoute"], "image")

    def test_mongabay_requires_exact_item_license_and_named_author(self):
        story = {
            "id": "mongabay-001", "title": "A conservation report with a useful headline",
            "summary": "This is a sufficiently detailed article excerpt describing the conservation findings, their context, the people involved, and the ecological implications reported by the author.",
            "url": "https://news.mongabay.com/2026/11/conservation-report/",
            "sourceName": "Mongabay", "sourceUrl": "https://news.mongabay.com/feed/",
        }
        missing = checker.evaluate_text("nature", story)
        self.assertFalse(missing["allowed"])
        no_author = checker.evaluate_text("nature", {**story, "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"})
        self.assertFalse(no_author["allowed"])
        approved = checker.evaluate_text("nature", {
            **story, "author": "Reporter Example", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
        })
        self.assertTrue(approved["allowed"])
        self.assertTrue(approved["summaryAllowed"])
        self.assertIn("Mongabay", approved["attribution"])
        self.assertEqual(approved["evidence"]["author"], "Reporter Example")

    def test_mongabay_no_derivatives_and_noncommercial_no_derivatives_are_held(self):
        story = {
            "id": "mongabay-nd", "title": "Conservation findings reported by Mongabay",
            "summary": "A sufficiently detailed article excerpt with the research context and reported findings for this test.",
            "url": "https://news.mongabay.com/2026/11/nd-report/",
            "sourceName": "Mongabay", "sourceUrl": "https://news.mongabay.com/feed/",
            "author": "Reporter Example",
        }
        for license_url in (
            "https://creativecommons.org/licenses/by-nd/4.0/",
            "https://creativecommons.org/licenses/by-nc-nd/4.0/",
        ):
            with self.subTest(license_url=license_url):
                decision = checker.evaluate_text("nature", {**story, "licenseUrl": license_url})
                self.assertFalse(decision["allowed"])
                self.assertEqual(decision["verdict"], "UNKNOWN")
                self.assertIn("conditions", " ".join(decision["reasons"]))

    def test_unapproved_image_is_stripped_but_meaningful_text_still_publishes(self):
        story = self.nasa_story()
        self.record_text("alien-world", story)
        feed_item = self.feed_story(
            story,
            imageUrl="https://www.nasa.gov/wp-content/uploads/unverified.jpg",
            imageCredit="NASA",
            imageSourceUrl=story["url"],
            imageCaption="A NASA spacecraft in orbit.",
            imageRightsNote="Unverified image claim.",
        )
        result = checker.gate_feed(
            {"schemaVersion": 1, "viewId": "alien-world", "stories": [feed_item]},
            self.db, "alien-world", minimum_stories=2,
        )
        self.assertEqual(result["storyCount"], 1)
        self.assertEqual(result["stories"][0]["publicationRoute"], "text")
        self.assertIsNone(result["stories"][0]["imageUrl"])
        self.assertEqual(result["globalChecker"]["imagesStripped"], 1)

    def test_summary_changed_after_checker_decision_is_rejected(self):
        story = self.nasa_story()
        self.record_text("alien-world", story)
        changed = self.feed_story(story)
        changed["summary"] = story["summary"] + " Altered after approval."
        result = checker.gate_feed(
            {"schemaVersion": 1, "viewId": "alien-world", "stories": [changed]},
            self.db, "alien-world", minimum_stories=2,
        )
        self.assertEqual(result["storyCount"], 0)
        self.assertEqual(result["globalChecker"]["textRejected"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
