from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import sys

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import newsroom_orchestrator as orchestrator


class FakeJob:
    def __init__(self, view_id: str):
        self.payload = {
            "jobId": "gcm-test-001",
            "idempotencyKey": "idem-test-001",
            "viewId": view_id,
            "profileId": f"{view_id}-profile",
            "assignmentIds": ["assignment-1"],
            "sourceIds": ["source-1"],
            "feedUrls": ["https://feed.example.test/rss"],
            "collectorEntrypoint": "global_collector",
            "collectorWorkflow": f".github/workflows/{view_id}-publisher.yml",
            "destinationDatabaseId": f"{view_id}-sqlite",
            "destinationDatabasePath": f".publisher-data/{view_id}/{view_id}.sqlite3",
            "scheduledAt": "2026-11-03T01:00:00Z",
            "requestWindowHours": 768,
            "configVersion": "config-test-001",
            "trigger": "scheduled",
        }

    def to_dict(self):
        return dict(self.payload)


class NewsroomOrchestratorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for directory in (
            "global_collection_manager",
            "global-checker",
            "image-engine",
            "editorial-engine",
            "newsroom-database-writer",
        ):
            (self.root / directory).mkdir(parents=True, exist_ok=True)
        self.job = FakeJob("nature")
        self.collection = {
            "status": "succeeded",
            "job": self.job.to_dict(),
            "records": [{"postId": "post-1"}],
            "statistics": {"postsCollected": 1},
        }
        self.initial = {
            "checkerMode": "universal-view-independent",
            "checkerVersion": "2.0.0",
            "viewId": "nature",
            "jobId": "gcm-test-001",
            "statistics": {"postsChecked": 1},
        }
        self.intake = {"phase": "image-engine-intake"}
        self.image_result = {"phase": "checker-image-candidate-return"}
        self.handoff = {
            "phase": "checker-image-review-complete",
            "viewId": "nature",
            "jobId": "gcm-test-001",
            "editorialEligiblePostIds": ["post-1"],
            "statistics": {"editorialEligiblePosts": 1},
        }
        self.editorial = {
            "phase": "editorial-production",
            "viewId": "nature",
            "jobId": "gcm-test-001",
            "statistics": {"storiesPrepared": 1},
        }
        self.verification = {
            "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
            "verificationGate": "LIVE // EARTH Global Checker Post-Editorial Verification",
            "phase": "post-editorial-verification-complete",
            "verdict": "PASS",
            "releaseForPublisher": True,
            "viewId": "nature",
            "jobId": "gcm-test-001",
            "reportVisibility": "INTERNAL_ONLY_NOT_FOR_PUBLICATION",
            "approvedStoryIds": ["post-1"],
            "globalReasons": [],
            "statistics": {"storiesPassed": 1, "storiesHeld": 0},
        }
        self.writer_result = {
            "phase": "database-write-complete",
            "viewId": "nature",
            "statistics": {"inserted": 1, "storyCountCap": None},
        }

    def tearDown(self):
        self.temp.cleanup()

    def make_components(self):
        dispatcher = SimpleNamespace(create_job=Mock(return_value=self.job))
        components = {
            "build_manager": Mock(return_value=(None, None, None, None, dispatcher, None)),
            "GlobalCollector": Mock(return_value=SimpleNamespace(collect=Mock(return_value=self.collection))),
            "UniversalGlobalChecker": Mock(return_value=SimpleNamespace(check_batch=Mock(return_value=self.initial))),
            "build_image_engine_intake": Mock(return_value=self.intake),
            "process_checker_intake": Mock(return_value=self.image_result),
            "review_image_engine_handoff": Mock(return_value=self.handoff),
            "produce_editorial_package": Mock(return_value=self.editorial),
            "review_editorial_package": Mock(return_value=self.verification),
            "write_verified_editorial_stories": Mock(return_value=self.writer_result),
        }
        return components

    def test_runs_exact_v2_stage_order_and_passes_unchanged_checker_inputs_to_writer(self):
        components = self.make_components()
        with patch.object(orchestrator, "_load_components", return_value=components):
            result = orchestrator.run("nature", self.root)

        self.assertEqual(result["phase"], "newsroom-database-write-complete")
        self.assertEqual(result["viewId"], "nature")
        components["build_image_engine_intake"].assert_called_once_with(
            self.collection, self.initial, repository_root=self.root.resolve()
        )
        components["process_checker_intake"].assert_called_once_with(
            self.intake, repository_root=self.root.resolve()
        )
        components["review_image_engine_handoff"].assert_called_once_with(
            self.collection, self.initial, self.image_result
        )
        components["produce_editorial_package"].assert_called_once_with(
            self.handoff, repository_root=self.root.resolve()
        )
        components["review_editorial_package"].assert_called_once_with(
            self.handoff, self.editorial, repository_root=self.root.resolve()
        )
        components["write_verified_editorial_stories"].assert_called_once_with(
            self.handoff, self.editorial, self.verification,
            repository_root=self.root.resolve(),
        )

    def test_no_checker_eligible_posts_is_safe_noop_and_never_writes(self):
        self.handoff["editorialEligiblePostIds"] = []
        components = self.make_components()
        with patch.object(orchestrator, "_load_components", return_value=components):
            result = orchestrator.run("nature", self.root)
        self.assertEqual(result["phase"], "newsroom-no-approved-stories")
        components["produce_editorial_package"].assert_not_called()
        components["write_verified_editorial_stories"].assert_not_called()

    def test_global_post_editorial_hold_blocks_writer(self):
        self.verification["globalReasons"] = ["Registry changed during processing."]
        components = self.make_components()
        with patch.object(orchestrator, "_load_components", return_value=components):
            with self.assertRaises(orchestrator.NewsroomOrchestratorError):
                orchestrator.run("nature", self.root)
        components["write_verified_editorial_stories"].assert_not_called()

    def test_rejects_unregistered_view(self):
        with self.assertRaises(orchestrator.NewsroomOrchestratorError):
            orchestrator.run("other-view", self.root)


if __name__ == "__main__":
    unittest.main(verbosity=2)
