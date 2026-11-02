from __future__ import annotations

import io
import tempfile
import unittest
from pathlib import Path

from PIL import Image

import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import image_engine as ie


def commons_page(*, license_url="https://creativecommons.org/licenses/by/4.0/", copyrighted="false",
                 creator="Example Creator", caption="A documented wildlife photograph"):
    return {
        "title": "File:Example wildlife.jpg",
        "imageinfo": [{
            "descriptionurl": "https://commons.wikimedia.org/wiki/File:Example_wildlife.jpg",
            "thumburl": "https://upload.wikimedia.org/wikipedia/commons/thumb/example.jpg",
            "thumbmime": "image/jpeg",
            "extmetadata": {
                "Artist": {"value": creator},
                "Credit": {"value": "Example Creator / Commons"},
                "ImageDescription": {"value": caption},
                "LicenseUrl": {"value": license_url},
                "LicenseShortName": {"value": "CC BY 4.0"},
                "Copyrighted": {"value": copyrighted},
                "Permission": {"value": ""},
            },
        }],
    }


def jpeg_bytes(width=900, height=600):
    output = io.BytesIO()
    Image.new("RGB", (width, height), (30, 120, 80)).save(output, "JPEG")
    return output.getvalue()


class ImageEngineDiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = ie.ImageEngine(Path(self.temp.name) / "staging")

    def tearDown(self):
        self.temp.cleanup()

    def test_commons_candidate_requires_exact_file_page_creator_caption_and_accepted_license(self):
        candidate = self.engine._candidate_from_page(commons_page(), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test")
        self.assertIsNotNone(candidate)
        self.assertEqual(candidate["originType"], "commons-external-image")
        self.assertEqual(candidate["licenseName"], "CC BY 4.0")
        self.assertEqual(candidate["checkerStatus"], "pending")
        self.assertFalse(candidate["approved"])

    def test_unknown_no_derivatives_or_noncommercial_license_is_rejected(self):
        for license_url in (
            "https://creativecommons.org/licenses/by-nd/4.0/",
            "https://creativecommons.org/licenses/by-nc/4.0/",
            "https://example.org/license",
        ):
            with self.subTest(license_url=license_url):
                self.assertIsNone(self.engine._candidate_from_page(commons_page(license_url=license_url), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test"))

    def test_copyright_ownership_with_an_explicit_cc_license_is_not_auto_rejected(self):
        # CC BY works remain copyrighted; the licence grants defined reuse rights.
        candidate = self.engine._candidate_from_page(commons_page(copyrighted="true"), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test")
        self.assertIsNotNone(candidate)
        self.assertEqual(candidate["licenseUrl"], "https://creativecommons.org/licenses/by/4.0/")
        self.assertFalse(candidate["approved"])

    def test_unknown_copyright_metadata_flag_is_held(self):
        self.assertIsNone(self.engine._candidate_from_page(commons_page(copyrighted="maybe"), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test"))

    def test_missing_creator_or_caption_is_rejected(self):
        self.assertIsNone(self.engine._candidate_from_page(commons_page(creator=""), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test"))
        self.assertIsNone(self.engine._candidate_from_page(commons_page(caption=""), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test"))

    def test_candidate_search_calls_only_commons_api_and_returns_candidates(self):
        self.engine._get_json = lambda url: {
            "query": {"pages": [commons_page()]}
        }
        results = self.engine.discover_commons("forest canopy biodiversity", view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test", limit=3)
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["sourcePage"].startswith("https://commons.wikimedia.org/"))
        self.assertFalse(results[0]["approved"])

    def test_discovery_rejects_empty_or_too_short_query(self):
        with self.assertRaises(ie.ImageEngineError):
            self.engine.discover_commons("  ", view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test")


class ImagePreparationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = ie.ImageEngine(Path(self.temp.name) / "staging")
        self.candidate = self.engine._candidate_from_page(commons_page(), view_id="nature", story_id="story-001", article_url="https://www.nature.com/articles/test")

    def tearDown(self):
        self.temp.cleanup()

    def test_prepare_normalizes_and_stages_image_without_approving_it(self):
        self.engine._get_bytes = lambda *args, **kwargs: (jpeg_bytes(), "https://upload.wikimedia.org/wikipedia/commons/example.jpg", "image/jpeg")
        prepared = self.engine.prepare_commons_candidate(self.candidate)
        path = Path(prepared["stagedPath"])
        self.assertTrue(path.is_file())
        self.assertEqual(prepared["mime"], "image/jpeg")
        self.assertEqual(prepared["checkerStatus"], "pending")
        self.assertIsNone(prepared["checkerDecision"])
        self.assertFalse(prepared["approved"])
        with Image.open(path) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertLessEqual(max(image.size), 1600)

    def test_preparation_rejects_nonapproved_redirect_or_host(self):
        bad = dict(self.candidate, sourceMediaUrl="https://upload.wikimedia.org.evil.example/fake.jpg")
        with self.assertRaises(ie.ImageEngineError):
            self.engine.prepare_commons_candidate(bad)

    def test_preparation_rejects_bad_mime(self):
        self.engine._get_bytes = lambda *args, **kwargs: (jpeg_bytes(), "https://upload.wikimedia.org/a.jpg", "text/html")
        with self.assertRaises(ie.ImageEngineError):
            self.engine.prepare_commons_candidate(self.candidate)

    def test_preparation_rejects_corrupt_image(self):
        self.engine._get_bytes = lambda *args, **kwargs: (b"not an image" * 200, "https://upload.wikimedia.org/a.jpg", "image/jpeg")
        with self.assertRaises(ie.ImageEngineError):
            self.engine.prepare_commons_candidate(self.candidate)

    def test_preparation_requires_image_engine_candidate(self):
        with self.assertRaises(ie.ImageEngineError):
            self.engine.prepare_commons_candidate({"sourceMediaUrl": "https://upload.wikimedia.org/a.jpg"})

    def test_redirect_handler_blocks_non_allowlisted_redirects(self):
        handler = ie._AllowlistedRedirectHandler({"upload.wikimedia.org"})
        request = __import__("urllib.request", fromlist=["Request"]).Request("https://upload.wikimedia.org/a.jpg")
        with self.assertRaises(ie.ImageEngineError):
            handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/a.jpg")
        accepted = handler.redirect_request(request, None, 302, "Found", {}, "https://upload.wikimedia.org/b.jpg")
        self.assertEqual(accepted.full_url, "https://upload.wikimedia.org/b.jpg")

    def test_published_base_url_is_validated_and_used_for_candidate(self):
        self.engine._get_bytes = lambda *args, **kwargs: (jpeg_bytes(), "https://upload.wikimedia.org/a.jpg", "image/jpeg")
        prepared = self.engine.prepare_commons_candidate(
            self.candidate,
            published_base_url="https://raw.githubusercontent.com/owner/repo/main/nature/published/assets/",
        )
        self.assertTrue(prepared["url"].startswith("https://raw.githubusercontent.com/owner/repo/main/"))
        self.assertTrue(prepared["url"].endswith(Path(prepared["stagedPath"]).name))
        bad_engine = ie.ImageEngine(Path(self.temp.name) / "other")
        with self.assertRaises(ie.ImageEngineError):
            bad_engine.prepare_commons_candidate(
                self.candidate,
                published_base_url="https://evil.example/assets/",
            )


class OriginalIllustrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = ie.ImageEngine(Path(self.temp.name) / "staging")

    def tearDown(self):
        self.temp.cleanup()

    def test_creates_local_original_illustrations_for_both_views(self):
        for view_id in ("nature", "alien-world"):
            result = self.engine.create_original_illustration({"id": "story-001", "url": "https://www.nasa.gov/news/example/"}, view_id, published_base_url="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/test/assets/")
            self.assertEqual(result["originType"], "local-original-illustration")
            self.assertEqual(result["kind"], "original-illustration")
            self.assertIn("not a documentary photograph", result["caption"].lower())
            self.assertTrue(Path(result["stagedPath"]).is_file())
            self.assertFalse(result["approved"])
            with Image.open(result["stagedPath"]) as image:
                self.assertEqual(image.format, "JPEG")
                self.assertEqual(image.size, (1200, 800))

    def test_illustration_is_deterministic_for_same_story(self):
        first = self.engine.create_original_illustration({"id": "stable", "url": "https://www.nasa.gov/news/example/"}, "nature", published_base_url="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/test/assets/")
        second = self.engine.create_original_illustration({"id": "stable", "url": "https://www.nasa.gov/news/example/"}, "nature", published_base_url="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/test/assets/")
        self.assertEqual(first["sha256"], second["sha256"])

    def test_invalid_view_and_missing_story_identity_are_rejected(self):
        with self.assertRaises(ie.ImageEngineError):
            self.engine.create_original_illustration({"id": "x", "url": "https://www.nasa.gov/news/example/"}, "moon", published_base_url="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/test/assets/")
        with self.assertRaises(ie.ImageEngineError):
            self.engine.create_original_illustration({"url": "https://www.nasa.gov/news/example/"}, "nature", published_base_url="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/test/assets/")


class GlobalCheckerHandoffTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = ie.ImageEngine(Path(self.temp.name) / "staging")
        self.candidate = self.engine.create_original_illustration({"id": "story-9", "url": "https://www.nasa.gov/news/example/"}, "nature", published_base_url="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/test/assets/")
        self.good_decision = {
            "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
            "contentKind": "image", "viewId": "nature", "storyId": "story-9",
            "verdict": "GREEN", "allowed": True, "decisionId": "checker-123",
            "policyId": "local-original-illustration-v1", "policyVersion": "1",
            "evidence": {
                "articleUrl": self.candidate["articleUrl"],
                "imageUrl": self.candidate["url"],
                "sourcePage": self.candidate["sourcePage"],
                "creator": self.candidate["creator"],
                "credit": self.candidate["credit"],
                "caption": self.candidate["caption"],
                "licenseName": self.candidate["licenseName"],
                "licenseUrl": self.candidate["licenseUrl"],
                "modificationNote": self.candidate["modificationNote"],
                "rightsNotice": self.candidate["rightsNotice"],
            },
        }

    def tearDown(self):
        self.temp.cleanup()

    def test_image_engine_cannot_approve_without_checker_decision(self):
        self.assertFalse(self.candidate["approved"])
        with self.assertRaises(ie.ImageEngineError):
            self.engine.publish_checker_approved(self.candidate, Path(self.temp.name) / "published")

    def test_wrong_view_story_or_content_kind_decision_is_rejected(self):
        for field, value in (("viewId", "alien-world"), ("storyId", "other"), ("contentKind", "text")):
            bad = dict(self.good_decision, **{field: value})
            with self.subTest(field=field):
                with self.assertRaises(ie.ImageEngineError):
                    self.engine.attach_checker_decision(self.candidate, bad)

    def test_denied_or_unknown_checker_result_stays_held(self):
        denied = self.engine.attach_checker_decision(self.candidate, dict(self.good_decision, verdict="UNKNOWN", allowed=False))
        self.assertFalse(denied["approved"])
        self.assertEqual(denied["checkerStatus"], "held")
        with self.assertRaises(ie.ImageEngineError):
            self.engine.publish_checker_approved(denied, Path(self.temp.name) / "published")

    def test_green_checker_approval_is_required_before_asset_publish(self):
        approved = self.engine.attach_checker_decision(self.candidate, self.good_decision)
        target = self.engine.publish_checker_approved(approved, Path(self.temp.name) / "published")
        self.assertTrue(target.is_file())
        self.assertFalse(Path(self.candidate["stagedPath"]).exists())

    def test_publish_rechecks_checker_evidence_after_approval(self):
        approved = self.engine.attach_checker_decision(self.candidate, self.good_decision)
        changed = dict(approved, caption="changed after checker review")
        with self.assertRaises(ie.ImageEngineError):
            self.engine.publish_checker_approved(changed, Path(self.temp.name) / "published")

    def test_publish_rejects_external_staged_path(self):
        approved = self.engine.attach_checker_decision(self.candidate, self.good_decision)
        bad = dict(approved, stagedPath=str(Path(self.temp.name).parent / "outside.jpg"))
        with self.assertRaises(ie.ImageEngineError):
            self.engine.publish_checker_approved(bad, Path(self.temp.name) / "published")


if __name__ == "__main__":
    unittest.main(verbosity=2)
