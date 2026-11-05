from __future__ import annotations

import importlib.util
import pathlib
import unittest

MODULE = pathlib.Path(__file__).resolve().parents[1] / "newsroom-database-writer" / "section13_database_bridge.py"
SPEC = importlib.util.spec_from_file_location("section13_database_bridge", MODULE)
BRIDGE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BRIDGE)

def make_report(view="test-view"):
    job = {
        "jobId": "job-1", "idempotencyKey": "idem-1", "viewId": view,
        "profileId": view + "-collection-profile", "assignmentIds": ["a1"],
        "sourceIds": ["s1"], "feedUrls": ["https://feed.example/rss"],
        "collectorEntrypoint": "global_collector",
        "collectorWorkflow": ".github/workflows/test-view.yml",
        "destinationDatabaseId": view + "-sqlite",
        "destinationDatabasePath": f".publisher-data/{view}/stories.sqlite3",
        "scheduledAt": "2026-11-05T00:00:00Z", "requestWindowHours": 24,
        "configVersion": "1", "trigger": "scheduled",
    }
    return {
        "schemaVersion": 2, "checker": "LIVE // EARTH Global Content Rights & Provenance Checker",
        "checkerVersion": "2.1.1", "jobId": "job-1", "viewId": view, "posts": [],
        "sections": {
            "managerIdCard": {"payload": job, "sha256": BRIDGE._canonical_hash(job)},
            "postEditorialFinalVerification": {
                "posts": [], "statistics": {"approvedForDatabase": 0},
                "ownership": {"databaseOpenedOrWritten": False},
            },
            "liveFeedOutput": {"posts": []},
        },
    }

class Section13BridgeGuards(unittest.TestCase):
    def test_valid_hashed_manager_view_id(self):
        self.assertEqual(BRIDGE._manager_job(make_report())["viewId"], "test-view")

    def test_report_view_mismatch_is_rejected(self):
        report = make_report()
        report["viewId"] = "tampered-view"
        with self.assertRaises(BRIDGE.Section13DatabaseBridgeError):
            BRIDGE._manager_job(report)

    def test_tampered_manager_card_is_rejected(self):
        report = make_report()
        report["sections"]["managerIdCard"]["payload"]["viewId"] = "tampered-view"
        with self.assertRaises(BRIDGE.Section13DatabaseBridgeError):
            BRIDGE._manager_job(report)

    def test_view_without_manager_profile_cannot_write(self):
        with self.assertRaises(BRIDGE.Section13DatabaseBridgeError):
            BRIDGE.write_section13_approved_posts(make_report("unregistered-view"), repository_root=".")

    def test_empty_approval_set_does_not_write(self):
        report = make_report("test-view")
        self.assertEqual(BRIDGE._approved_inputs(report, "test-view"), [])

if __name__ == "__main__":
    unittest.main()
