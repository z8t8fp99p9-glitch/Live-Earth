from __future__ import annotations

import sqlite3
import sys
import unittest
from pathlib import Path

CHECKER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CHECKER_DIR))

import global_checker as checker
import global_checker_policy_engine


class SharedGlobalPolicyEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        global_checker_policy_engine.install(checker)

    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        checker.ensure_decision_table(self.db)

    def tearDown(self):
        self.db.close()

    def agency_story(self, agency: str, view_id: str):
        routes = {
            "NASA": {
                "title": "NASA Earth Observatory documents changing coastal wetlands",
                "url": "https://science.nasa.gov/earth-observatory/example-wetlands/",
                "sourceUrl": "https://science.nasa.gov/feed/earth-observatory/natural-events",
                "sourceName": "NASA Earth Observatory — Natural Events",
                "author": "NASA",
            },
            "NOAA": {
                "title": "NOAA reports on coastal wetland restoration",
                "url": "https://oceanservice.noaa.gov/facts/wetlands.html",
                "sourceUrl": "https://oceanservice.noaa.gov/rss/oceanfacts.xml",
                "sourceName": "NOAA — Ocean Facts",
                "author": "NOAA",
            },
            "USGS": {
                "title": "USGS releases new environmental research findings",
                "url": "https://www.usgs.gov/news/example-release",
                "sourceUrl": "https://www.usgs.gov/news/national-news-release/feed",
                "sourceName": "USGS — National News Releases",
                "author": "U.S. Geological Survey",
            },
        }
        story = dict(routes[agency])
        story.update({
            "id": f"{agency.lower()}-{view_id}",
            "summary": (
                "The agency describes a substantial research update, the methods used, "
                "the findings, and the implications for ecosystems, local communities, "
                "habitat restoration, monitoring and future environmental decisions."
            ),
        })
        return story

    def test_nasa_noaa_usgs_policies_are_shared_by_both_views(self):
        registry = checker.load_registry()
        for policy_id in (
            "nasa-official-federal-source-text-v1",
            "noaa-ocean-service-educational-government-v1",
            "usgs-national-news-educational-government-v1",
        ):
            policy = next(p for p in registry["policies"] if p["policyId"] == policy_id)
            self.assertEqual(set(policy["views"]), {"nature", "alien-world"})

        for agency in ("NASA", "NOAA", "USGS"):
            for view_id in ("nature", "alien-world"):
                with self.subTest(agency=agency, view=view_id):
                    decision = checker.evaluate_text(view_id, self.agency_story(agency, view_id))
                    self.assertTrue(decision["allowed"], decision["reasons"])
                    self.assertEqual(decision["verdict"], "GREEN")
                    self.assertTrue(decision["summaryAllowed"])

    def test_third_party_author_and_restrictive_item_marker_are_held(self):
        story = self.agency_story("NOAA", "nature")
        story["author"] = "Independent private media agency"
        author_decision = checker.evaluate_text("nature", story)
        self.assertFalse(author_decision["allowed"])
        self.assertEqual(author_decision["verdict"], "UNKNOWN")

        story = self.agency_story("USGS", "alien-world")
        story["summary"] += " Copyright belongs to a third-party publisher."
        rights_decision = checker.evaluate_text("alien-world", story)
        self.assertFalse(rights_decision["allowed"])
        self.assertEqual(rights_decision["verdict"], "RED")

    def test_official_agency_item_without_summary_is_headline_link_only(self):
        story = self.agency_story("NASA", "nature")
        story["summary"] = ""
        decision = checker.evaluate_text("nature", story)
        self.assertTrue(decision["allowed"])
        self.assertEqual(decision["allowedUse"], "headline-link-only")
        self.assertFalse(decision["summaryAllowed"])

    def test_wrong_feed_url_does_not_match_agency_policy(self):
        story = self.agency_story("NOAA", "nature")
        story["sourceUrl"] = "https://oceanservice.noaa.gov/rss/unlisted.xml"
        decision = checker.evaluate_text("nature", story)
        self.assertFalse(decision["allowed"])
        self.assertEqual(decision["policyId"], "unregistered-source")

    def test_sciencedaily_and_nature_portfolio_remain_blocked_for_persistent_storage(self):
        blocked_sources = [
            {
                "id": "sciencedaily-blocked", "title": "Environment research item",
                "summary": "An example source summary with enough words to meet the normal text threshold.",
                "url": "https://www.sciencedaily.com/releases/2026/11/example.htm",
                "sourceName": "ScienceDaily — Environment",
                "sourceUrl": "https://www.sciencedaily.com/rss/top/environment.xml",
            },
            {
                "id": "nature-portfolio-blocked", "title": "Ecology research item",
                "summary": "An example source summary with enough words to meet the normal text threshold.",
                "url": "https://www.nature.com/articles/example",
                "sourceName": "Nature Portfolio — Ecology",
                "sourceUrl": "https://www.nature.com/subjects/ecology.rss",
            },
        ]
        for story in blocked_sources:
            with self.subTest(source=story["sourceName"]):
                decision = checker.evaluate_text("nature", story)
                self.assertFalse(decision["allowed"])
                self.assertEqual(decision["verdict"], "RED")

    def test_nature_commons_context_image_for_noaa_story_uses_central_checker(self):
        article = "https://oceanservice.noaa.gov/facts/wetlands.html"
        image = {
            "url": "https://upload.wikimedia.org/wikipedia/commons/example.jpg",
            "sourcePage": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "creator": "Reviewed Creator",
            "expectedCreator": "Reviewed Creator",
            "credit": "Reviewed Creator · CC BY 4.0",
            "caption": "Context photograph of a wetland ecosystem.",
            "licenseName": "CC BY 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "expectedLicenseUrl": "https://creativecommons.org/licenses/by/4.0/",
            "modificationNote": "Resized display copy; attribution retained.",
            "rightsNotice": "Context photograph; not supplied by the linked NOAA article.",
        }
        decision = checker.evaluate_image(
            "nature", "noaa-context-image", image,
            article_url=article, source_name="NOAA — Ocean Facts",
        )
        self.assertTrue(decision["allowed"], decision["reasons"])
        self.assertEqual(decision["viewId"], "nature")
        self.assertEqual(decision["policyVersion"], "1")
        self.assertEqual(decision["evidence"]["articleUrl"], article)

    def test_nasa_original_image_policy_can_be_used_by_both_views(self):
        article = "https://science.nasa.gov/earth-observatory/example-wetlands/"
        image = {
            "url": "https://images.nasa.gov/example-wetlands.jpg",
            "sourcePage": article,
            "caption": "Satellite image of the wetland area.",
            "credit": "NASA",
            "rightsNotice": "",
        }
        for view_id in ("nature", "alien-world"):
            with self.subTest(view=view_id):
                decision = checker.evaluate_image(
                    view_id, f"nasa-image-{view_id}", image,
                    article_url=article, source_name="NASA Earth Observatory",
                )
                self.assertTrue(decision["allowed"], decision["reasons"])
                self.assertEqual(decision["policyId"], "nasa-media-guidelines-item-screen-v2")
                self.assertEqual(decision["viewId"], view_id)
                self.assertEqual(decision["policyVersion"], "2")

    def test_nature_final_gate_preserves_nasa_image_policy_identity(self):
        story = self.agency_story("NASA", "nature")
        text_decision = checker.evaluate_text("nature", story)
        checker.record_decision(self.db, text_decision)
        image = {
            "url": "https://images.nasa.gov/example-wetlands.jpg",
            "sourcePage": story["url"],
            "caption": "Satellite image of the wetland area.",
            "credit": "NASA",
            "rightsNotice": "NASA original-source image; attribution retained.",
        }
        image_decision = checker.evaluate_image(
            "nature", story["id"], image,
            article_url=story["url"], source_name=story["sourceName"],
        )
        checker.record_decision(self.db, image_decision)
        feed = {
            "schemaVersion": 1, "viewId": "nature", "storyCount": 1,
            "stories": [{
                **story,
                "imageUrl": image["url"],
                "imageCredit": image["credit"],
                "imageSourceUrl": image["sourcePage"],
                "imageCaption": image["caption"],
                "imageRightsNote": image["rightsNotice"],
            }],
        }
        approved = checker.gate_feed(feed, self.db, "nature")
        self.assertEqual(approved["storyCount"], 1)
        image_rights = approved["stories"][0]["imageRights"]
        self.assertEqual(image_rights["policyId"], "nasa-media-guidelines-item-screen-v2")
        self.assertEqual(image_rights["policyVersion"], "2")

    def test_physorg_headline_without_approved_image_is_not_publishable(self):
        story = {
            "id": "physorg-headline-only",
            "title": "Environmental research update",
            "summary": "",
            "url": "https://phys.org/news/2026/example.html",
            "sourceName": "Phys.org — Environment",
            "sourceUrl": "https://phys.org/rss-feed/earth-news/environment/",
        }
        checker.record_decision(self.db, checker.evaluate_text("nature", story))
        feed = {
            "schemaVersion": 1, "viewId": "nature", "storyCount": 1,
            "stories": [story],
        }
        approved = checker.gate_feed(feed, self.db, "nature")
        self.assertEqual(approved["storyCount"], 0)
        self.assertEqual(approved["stories"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
