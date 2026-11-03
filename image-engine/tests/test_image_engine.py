from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent / "global-checker"))

import image_engine as ie
from image_engine_newsroom import process_checker_intake, _validate_checker_input


def manager_job(view_id="nature"):
    return {
        "jobId": "job-20261103-001",
        "idempotencyKey": "idem-001",
        "viewId": view_id,
        "profileId": "profile-" + view_id,
        "assignmentIds": ["assignment-1"],
        "sourceIds": ["source-1"],
        "feedUrls": ["https://example.org/feed.xml"],
        "collectorEntrypoint": "global_collector",
        "collectorWorkflow": "rss-collector",
        "destinationDatabaseId": "db-" + view_id,
        "destinationDatabasePath": ".publisher-data/" + view_id + "/stories.sqlite3",
        "scheduledAt": "2026-11-03T00:00:00Z",
        "requestWindowHours": 24,
        "configVersion": "cfg-7",
        "trigger": "scheduled",
    }


def checker_intake(view_id="nature", commons=False, illustration=True):
    job = manager_job(view_id)
    return {
        "schemaVersion": 1,
        "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
        "checkerVersion": "2.0.0",
        "phase": "image-engine-intake",
        "viewId": view_id,
        "jobId": job["jobId"],
        "managerJob": job,
        "managerRegistryVersion": "manager-v5",
        "checkerRegistryVersion": "2026-11-03.1",
        "imageEngineInputs": [{
            "postId": "post-001",
            "viewId": view_id,
            "sourceId": "source-1",
            "sourceName": "Example Research",
            "articleUrl": "https://example.org/article/climate-ocean",
            "title": "New ocean ecosystem study reveals biodiversity changes",
            "searchText": "New ocean ecosystem study reveals biodiversity changes",
            "sourcePolicyId": "example-policy-v1",
            "textDecisionId": "text-decision-001",
            "summaryAllowed": False,
            "eligibleForImageEngine": True,
            "lineage": dict(job),
            "imagePolicy": {
                "assetRelativePath": view_id + "/published/assets/",
                "assetUrlBase": "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/" + view_id + "/published/assets/",
                "wikimediaCommons": {
                    "enabled": commons,
                    "acceptedLicenses": ["https://creativecommons.org/licenses/by/4.0/"] if commons else [],
                    "policyVersion": "1",
                },
                "imageEngineOriginalIllustration": {
                    "enabled": illustration,
                    "policyId": "image-engine-original-illustration-v1",
                    "policyVersion": "1",
                },
            },
        }],
    }


class GlobalIdentityTests(unittest.TestCase):
    def test_new_view_is_accepted_without_a_python_view_allowlist(self):
        intake = checker_intake("ocean-research")
        job, items = _validate_checker_input(intake)
        self.assertEqual(job["viewId"], "ocean-research")
        self.assertEqual(items[0]["postId"], "post-001")

    def test_missing_manager_id_is_rejected_not_reconstructed(self):
        intake = checker_intake()
        del intake["managerJob"]["idempotencyKey"]
        with self.assertRaises(ie.ImageEngineError):
            _validate_checker_input(intake)

    def test_mismatched_post_manager_lineage_is_rejected(self):
        intake = checker_intake()
        intake["imageEngineInputs"][0]["lineage"]["profileId"] = "different-profile"
        with self.assertRaises(ie.ImageEngineError):
            _validate_checker_input(intake)

    def test_duplicate_post_id_is_rejected(self):
        intake = checker_intake()
        intake["imageEngineInputs"].append(dict(intake["imageEngineInputs"][0]))
        with self.assertRaises(Exception):
            _validate_checker_input(intake)


class OriginalArtworkTests(unittest.TestCase):
    def test_engine_creates_a_relevant_labeled_illustration_for_a_future_view(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            entry = checker_intake("ocean-research")["imageEngineInputs"][0]
            result = engine.create_original_illustration(
                post=entry,
                view_id="ocean-research",
                asset_url_base=entry["imagePolicy"]["assetUrlBase"],
                manager_job=manager_job("ocean-research"),
            )
            self.assertEqual(result["originType"], "local-original-illustration")
            self.assertIn("not a documentary photograph", result["caption"].lower())
            self.assertTrue(Path(result["stagedPath"]).is_file())
            self.assertFalse(result["approved"])
            self.assertTrue(result["assetUrl"].startswith("https://raw.githubusercontent.com/"))

    def test_asset_path_must_be_a_safe_view_published_assets_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            entry = checker_intake()["imageEngineInputs"][0]
            with self.assertRaises(ie.ImageEngineError):
                engine.create_original_illustration(
                    post=entry,
                    view_id="nature",
                    asset_url_base="https://raw.githubusercontent.com/owner/repo/main/other/view/",
                    manager_job=manager_job(),
                )


class CheckerHandoffTests(unittest.TestCase):
    def test_candidate_is_returned_to_checker_with_full_media_lineage_and_no_publish(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = process_checker_intake(checker_intake("ocean-research"), repository_root=root)
            self.assertEqual(result["phase"], "checker-image-candidate-return")
            self.assertEqual(result["statistics"]["imageCandidatesReturned"], 1)
            self.assertEqual(result["statistics"]["imagesPublished"], 0)
            self.assertFalse(result["privacyAndOwnership"]["imageRightsApprovedByImageEngine"])
            self.assertFalse(result["privacyAndOwnership"]["publicAssetsWritten"])
            media = result["checkerHandoff"][0]["media"]
            self.assertEqual(media["postId"], "post-001")
            self.assertTrue(media["mediaId"].startswith("media-"))
            self.assertEqual(media["jobId"], "job-20261103-001")
            self.assertEqual(media["idempotencyKey"], "idem-001")
            self.assertEqual(media["profileId"], "profile-ocean-research")
            self.assertEqual(media["assignmentIds"], ["assignment-1"])
            self.assertEqual(media["sourceId"], "source-1")
            self.assertEqual(media["destinationDatabasePath"], ".publisher-data/ocean-research/stories.sqlite3")
            self.assertEqual(media["metadata"]["assetPublished"], False)
            self.assertTrue(Path(media["metadata"]["stagedPath"]).is_file())
            self.assertEqual(set(media), set((
                "mediaId", "mediaType", "url", "originalUrl", "thumbnailUrl", "title",
                "caption", "altText", "creator", "credit", "licenseName", "licenseUrl",
                "rightsNotice", "mimeType", "width", "height", "durationSeconds",
                "fileSizeBytes", "sourcePage", "position", "metadata", "postId", "viewId",
                "sourceId", "jobId", "profileId", "assignmentIds", "idempotencyKey",
                "configVersion", "destinationDatabaseId", "destinationDatabasePath",
            )))

    def test_no_checker_enabled_route_returns_no_candidate_instead_of_faking_approval(self):
        intake = checker_intake()
        policy = intake["imageEngineInputs"][0]["imagePolicy"]
        policy["imageEngineOriginalIllustration"]["enabled"] = False
        with tempfile.TemporaryDirectory() as tmp:
            result = process_checker_intake(intake, repository_root=tmp)
        self.assertEqual(result["statistics"]["imageCandidatesReturned"], 0)
        self.assertEqual(result["results"][0]["status"], "NO_IMAGE_CANDIDATE")

    def test_image_engine_rejects_wrong_checker_phase_and_unregistered_checker(self):
        for change in (("phase", "collection-intake"), ("checker", "Other Checker")):
            intake = checker_intake()
            intake[change[0]] = change[1]
            with self.subTest(change=change), self.assertRaises(Exception):
                _validate_checker_input(intake)


class CommonsSafetyTests(unittest.TestCase):
    @staticmethod
    def _page(license_url="https://creativecommons.org/licenses/by/4.0/", copyrighted="true"):
        return {
            "title": "File:Ocean ecosystem biodiversity.jpg",
            "imageinfo": [{
                "descriptionurl": "https://commons.wikimedia.org/wiki/File:Ocean_ecosystem_biodiversity.jpg",
                "thumburl": "https://upload.wikimedia.org/wikipedia/commons/thumb/ocean.jpg",
                "thumbmime": "image/jpeg",
                "extmetadata": {
                    "Artist": {"value": "Marine Research Photographer"},
                    "Credit": {"value": "Marine Research Photographer / Wikimedia Commons"},
                    "ImageDescription": {"value": "Ocean ecosystem and marine biodiversity survey"},
                    "LicenseUrl": {"value": license_url},
                    "LicenseShortName": {"value": "CC BY 4.0"},
                    "Copyrighted": {"value": copyrighted},
                    "Permission": {"value": ""},
                },
            }],
        }

    def test_commons_search_returns_only_relevant_exact_file_page_candidates(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            engine._get_json = lambda _url: {"query": {"pages": [self._page()]}}
            found = engine.discover_commons(
                "ocean ecosystem biodiversity", view_id="ocean-research", post_id="post-01",
                article_url="https://example.org/ocean", accepted_licenses=[
                    "https://creativecommons.org/licenses/by/4.0/"],
            )
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["postId"], "post-01")
        self.assertEqual(found[0]["licenseName"], "CC BY 4.0")
        self.assertFalse(found[0]["approved"])

    def test_commons_unknown_or_restricted_license_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            for license_url in (
                "https://creativecommons.org/licenses/by-nd/4.0/",
                "https://creativecommons.org/licenses/by-nc/4.0/",
                "https://example.org/license",
            ):
                engine._get_json = lambda _url, u=license_url: {"query": {"pages": [self._page(license_url=u)]}}
                found = engine.discover_commons(
                    "ocean ecosystem biodiversity", view_id="nature", post_id="post-01",
                    article_url="https://example.org/ocean", accepted_licenses=[license_url],
                )
                self.assertEqual(found, [])

    def test_commons_metadata_with_copyright_flag_true_is_not_auto_rejected_when_cc_license_is_explicit(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            engine._get_json = lambda _url: {"query": {"pages": [self._page(copyrighted="true")]}}
            found = engine.discover_commons(
                "ocean ecosystem biodiversity", view_id="nature", post_id="post-01",
                article_url="https://example.org/ocean", accepted_licenses=[
                    "https://creativecommons.org/licenses/by/4.0/"],
            )
        self.assertEqual(len(found), 1)

    def test_commons_unknown_copyright_flag_is_held(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            engine._get_json = lambda _url: {"query": {"pages": [self._page(copyrighted="maybe")]}}
            found = engine.discover_commons(
                "ocean ecosystem biodiversity", view_id="nature", post_id="post-01",
                article_url="https://example.org/ocean", accepted_licenses=[
                    "https://creativecommons.org/licenses/by/4.0/"],
            )
        self.assertEqual(found, [])

    def test_commons_preparation_keeps_file_page_and_hashes_normalized_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage")
            engine._get_json = lambda _url: {"query": {"pages": [self._page()]}}
            candidate = engine.discover_commons(
                "ocean ecosystem biodiversity", view_id="nature", post_id="post-01",
                article_url="https://example.org/ocean", accepted_licenses=[
                    "https://creativecommons.org/licenses/by/4.0/"],
            )[0]
            data = io.BytesIO()
            Image.new("RGB", (900, 600), (20, 120, 160)).save(data, "JPEG")
            engine._get_bytes = lambda *args, **kwargs: (
                data.getvalue(), "https://upload.wikimedia.org/wikipedia/commons/ocean.jpg", "image/jpeg")
            prepared = engine.prepare_commons_candidate(
                candidate,
                asset_url_base="https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/assets/",
            )
            # The staged file must be verified before TemporaryDirectory exits.
            self.assertTrue(Path(prepared["stagedPath"]).is_file())
            self.assertEqual(prepared["sourcePage"], "https://commons.wikimedia.org/wiki/File:Ocean_ecosystem_biodiversity.jpg")
            self.assertEqual(len(prepared["sha256"]), 64)
            self.assertTrue(prepared["assetUrl"].endswith(Path(prepared["stagedPath"]).name))

    def test_redirect_handler_blocks_external_redirects_and_accepts_same_allowlist(self):
        from urllib.request import Request
        handler = ie._AllowlistedRedirectHandler({"upload.wikimedia.org"})
        request = Request("https://upload.wikimedia.org/a.jpg")
        with self.assertRaises(ie.ImageEngineError):
            handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/a.jpg")
        accepted = handler.redirect_request(request, None, 302, "Found", {}, "https://upload.wikimedia.org/b.jpg")
        self.assertEqual(accepted.full_url, "https://upload.wikimedia.org/b.jpg")

    def test_image_download_rejects_bad_mime_and_over_limit_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            engine = ie.ImageEngine(Path(tmp) / "stage", max_download_bytes=2048)
            candidate = {
                "originType": "commons-external-image",
                "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                "sourcePage": "https://commons.wikimedia.org/wiki/File:test.jpg",
                "sourceMediaUrl": "https://upload.wikimedia.org/test.jpg",
            }
            engine._get_bytes = lambda *a, **k: (b"x" * 1500, "https://upload.wikimedia.org/test.jpg", "text/html")
            with self.assertRaises(ie.ImageEngineError):
                engine.prepare_commons_candidate(candidate, asset_url_base="https://raw.githubusercontent.com/owner/repo/main/nature/published/assets/")
            engine._get_bytes = lambda *a, **k: (b"x" * 2049, "https://upload.wikimedia.org/test.jpg", "image/jpeg")
            with self.assertRaises(ie.ImageEngineError):
                engine.prepare_commons_candidate(candidate, asset_url_base="https://raw.githubusercontent.com/owner/repo/main/nature/published/assets/")


if __name__ == "__main__":
    unittest.main(verbosity=2)
