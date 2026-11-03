from __future__ import annotations

import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
PATCH_ROOT = ROOT.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(PATCH_ROOT / "global-checker"))

from test_image_engine import checker_intake, manager_job
from image_engine_newsroom import process_checker_intake

MANAGER_FIELDS = (
    "jobId", "idempotencyKey", "viewId", "profileId", "assignmentIds",
    "sourceIds", "feedUrls", "collectorEntrypoint", "collectorWorkflow",
    "destinationDatabaseId", "destinationDatabasePath", "scheduledAt",
    "requestWindowHours", "configVersion", "trigger",
)
MEDIA_LINEAGE_FIELDS = (
    "postId", "viewId", "sourceId", "jobId", "profileId", "assignmentIds",
    "idempotencyKey", "configVersion", "destinationDatabaseId", "destinationDatabasePath",
)
UNIVERSAL_MEDIA_FIELDS = (
    "mediaId", "mediaType", "url", "originalUrl", "thumbnailUrl", "title",
    "caption", "altText", "creator", "credit", "licenseName", "licenseUrl",
    "rightsNotice", "mimeType", "width", "height", "durationSeconds",
    "fileSizeBytes", "sourcePage", "position", "metadata", "postId", "viewId",
    "sourceId", "jobId", "profileId", "assignmentIds", "idempotencyKey",
    "configVersion", "destinationDatabaseId", "destinationDatabasePath",
)


def _same(left, right):
    if isinstance(left, list) or isinstance(right, list):
        return isinstance(left, list) and isinstance(right, list) and left == right
    return left == right


def _manager_errors(job):
    return [] if isinstance(job, dict) and all(k in job for k in MANAGER_FIELDS) else ["missing manager data"]


def _is_image(item):
    return isinstance(item, dict) and str(item.get("mediaType", "")).startswith("image")


checker_stub = types.ModuleType("universal_checker")
checker_stub.MANAGER_FIELDS = MANAGER_FIELDS
checker_stub.MEDIA_LINEAGE_FIELDS = MEDIA_LINEAGE_FIELDS
checker_stub.UNIVERSAL_MEDIA_FIELDS = UNIVERSAL_MEDIA_FIELDS
checker_stub._same = _same
checker_stub._manager_job_errors = _manager_errors
checker_stub._is_image_item = _is_image
checker_stub.check_collection = lambda *args, **kwargs: None

CAPTURED_COLLECTOR_RESULT = None


class _FakeUniversalChecker:
    def __init__(self, audit_connection=None):
        self.audit_connection = audit_connection

    def check_batch(self, collector_result):
        global CAPTURED_COLLECTOR_RESULT
        CAPTURED_COLLECTOR_RESULT = collector_result
        post = collector_result["records"][0]
        image = post["media"][0]
        return {
            "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
            "checkerVersion": "2.0.0",
            "jobId": collector_result["job"]["jobId"],
            "viewId": collector_result["job"]["viewId"],
            "managerRegistryVersion": collector_result["managerRegistryVersion"],
            "posts": [{
                "postId": post["postId"], "status": "PASS",
                "text": {"allowed": True, "summaryAllowed": True},
                "image": {"allowed": bool(image["mediaId"]), "mediaId": image["mediaId"]},
                "fieldRestrictions": [],
            }],
        }


checker_stub.UniversalGlobalChecker = _FakeUniversalChecker
sys.modules["universal_checker"] = checker_stub

spec = importlib.util.spec_from_file_location(
    "tested_image_engine_handoff", PATCH_ROOT / "global-checker" / "image_engine_handoff.py"
)
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class CheckerImageHandoffTests(unittest.TestCase):
    def _collector_result(self):
        job = manager_job("ocean-research")
        return {
            "schemaVersion": 1,
            "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
            "job": job,
            "managerRegistryVersion": "manager-v5",
            "records": [{
                "postId": "post-001", "viewId": job["viewId"],
                "sourceId": "source-1", "collectionContext": dict(job),
                "media": [], "attachments": [],
            }],
        }

    def _initial_checker_result(self):
        job = manager_job("ocean-research")
        return {
            "checkerMode": "universal-view-independent",
            "checkerVersion": "2.0.0",
            "jobId": job["jobId"], "viewId": job["viewId"],
            "managerRegistryVersion": "manager-v5",
            "posts": [{
                "postId": "post-001", "lineage": {"passed": True},
                "text": {"allowed": True, "summaryAllowed": True},
                "image": {"allowed": False, "status": "NOT_PROVIDED"},
                "fieldRestrictions": [],
            }],
        }

    def test_checker_rechecks_candidate_before_editorial_handoff(self):
        registry_stub = types.ModuleType("global_checker")
        registry_stub.load_registry = lambda: {"registryVersion": "2026-11-03.1"}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(sys.modules, {"global_checker": registry_stub}):
            collector = self._collector_result()
            initial = self._initial_checker_result()
            intake = checker_intake("ocean-research")
            image_result = process_checker_intake(intake, repository_root=tmp)
            result = bridge.review_image_engine_handoff(collector, initial, image_result)

        self.assertEqual(result["phase"], "checker-image-review-complete")
        self.assertEqual(result["editorialEligiblePostIds"], ["post-001"])
        self.assertEqual(result["statistics"]["checkerApprovedImages"], 1)
        self.assertIsNotNone(CAPTURED_COLLECTOR_RESULT)
        checked_post = CAPTURED_COLLECTOR_RESULT["records"][0]
        self.assertEqual(checked_post["postId"], "post-001")
        self.assertEqual(checked_post["collectionContext"], manager_job("ocean-research"))
        self.assertEqual(checked_post["media"][0]["postId"], "post-001")
        self.assertFalse(checked_post["media"][0]["metadata"]["assetPublished"])


    def test_checker_builds_a_global_image_job_and_omits_a_restricted_summary(self):
        registry_stub = types.ModuleType("global_checker")
        registry_stub.load_registry = lambda: {
            "registryVersion": "2026-11-03.1",
            "imagePolicies": {
                "wikimediaCommons": {
                    "acceptedLicenses": ["https://creativecommons.org/licenses/by/4.0/"],
                    "policyVersion": "1",
                },
                "imageEngineOriginalIllustration": {
                    "status": "GREEN", "acceptedEngineVersions": ["0.2.0"],
                    "policyId": "image-engine-original-illustration-v1",
                    "policyVersion": "1",
                    "views": {"ocean-research": "ocean-research/published/assets/"},
                },
            },
        }
        with patch.dict(sys.modules, {"global_checker": registry_stub}):
            job = manager_job("ocean-research")
            collector = {
                "schemaVersion": 1, "recordSchema": "LIVE_EARTH_UNIVERSAL_POST_V1",
                "job": job, "managerRegistryVersion": "manager-v5",
                "records": [{
                    "postId": "post-001", "viewId": job["viewId"], "sourceId": "source-1",
                    "sourceName": "Example Research",
                    "sourceFeedUrl": "https://example.org/feed.xml",
                    "canonicalUrl": "https://example.org/article/ocean",
                    "title": "Ocean ecosystem biodiversity report",
                    "summary": "This summary is not permitted for transformation or use.",
                    "collectionContext": dict(job), "media": [], "attachments": [],
                }],
            }
            checker_report = {
                "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
                "checkerMode": "universal-view-independent", "checkerVersion": "2.0.0",
                "jobId": job["jobId"], "viewId": job["viewId"],
                "managerRegistryVersion": "manager-v5",
                "posts": [{
                    "postId": "post-001", "lineage": {"passed": True},
                    "text": {
                        "allowed": True, "summaryAllowed": False,
                        "policyId": "headline-link-policy", "decisionId": "text-decision-001",
                    },
                    "image": {"allowed": False, "status": "NOT_PROVIDED"},
                    "fieldRestrictions": [{"field": "summary", "rule": "must_not_store_or_display"}],
                }],
            }
            intake = bridge.build_image_engine_intake(
                collector, checker_report, repository_root="/tmp/live-earth-image-engine-test"
            )

        self.assertEqual(intake["phase"], "image-engine-intake")
        self.assertEqual(intake["managerJob"], job)
        self.assertEqual(len(intake["imageEngineInputs"]), 1)
        image_input = intake["imageEngineInputs"][0]
        self.assertEqual(image_input["postId"], "post-001")
        self.assertEqual(image_input["lineage"], job)
        self.assertEqual(image_input["searchText"], "Ocean ecosystem biodiversity report")
        self.assertFalse(image_input["summaryAllowed"])
        self.assertTrue(image_input["imagePolicy"]["imageEngineOriginalIllustration"]["enabled"])

    def test_checker_bridge_will_not_replace_an_already_approved_image(self):
        registry_stub = types.ModuleType("global_checker")
        registry_stub.load_registry = lambda: {"registryVersion": "2026-11-03.1"}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(sys.modules, {"global_checker": registry_stub}):
            collector = self._collector_result()
            initial = self._initial_checker_result()
            initial["posts"][0]["image"]["allowed"] = True
            image_result = process_checker_intake(checker_intake("ocean-research"), repository_root=tmp)
            with self.assertRaises(bridge.ImageEngineHandoffError):
                bridge.review_image_engine_handoff(collector, initial, image_result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
