"""Manager-only regression tests. Uses only Python's standard library."""
from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from global_collection_manager.manager import build_manager
from global_collection_manager.models import GLOBAL_COLLECTOR_ENTRYPOINT, ManagerError

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config"


class GlobalCollectionManagerTests(unittest.TestCase):
    def test_current_views_are_assigned_to_the_same_global_collector(self):
        _, profiles, _, _, dispatcher, _ = build_manager(CONFIG, Path(tempfile.mkdtemp()))
        self.assertEqual(set(profiles.ids()), {"nature", "alien-world"})
        nature = dispatcher.create_job("nature", scheduled_at="2026-11-03T10:15:00Z")
        alien = dispatcher.create_job("alien-world", scheduled_at="2026-11-03T10:45:00Z")
        self.assertEqual(nature.collectorEntrypoint, GLOBAL_COLLECTOR_ENTRYPOINT)
        self.assertEqual(alien.collectorEntrypoint, GLOBAL_COLLECTOR_ENTRYPOINT)
        self.assertEqual(nature.destinationDatabaseId, "nature-sqlite")
        self.assertEqual(alien.destinationDatabaseId, "alien-world-sqlite")
        self.assertEqual(nature.destinationDatabasePath, ".publisher-data/nature/nature.sqlite3")
        self.assertEqual(alien.destinationDatabasePath, ".publisher-data/alien-world/alien-world.sqlite3")
        self.assertNotEqual(nature.viewId, alien.viewId)
        self.assertNotEqual(set(nature.assignmentIds), set(alien.assignmentIds))

    def test_future_view_works_by_configuration_only(self):
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            for filename in ("source-registry.json", "view-collection-profiles.json",
                            "source-view-assignments.json", "scheduler.json"):
                (temp / filename).write_text((CONFIG / filename).read_text(encoding="utf-8"), encoding="utf-8")

            profiles = json.loads((temp / "view-collection-profiles.json").read_text())
            profiles["profiles"].append({
                "profileId": "climate-observer-profile-001",
                "viewId": "climate-observer-001",
                "viewName": "Climate Observer",
                "enabled": True,
                "topicsAndCategories": ["climate", "atmosphere"],
                "keywords": [], "exclusions": [],
                "allowedSourceGroups": ["climate-approved"],
                "collectionFrequency": {"type": "hourly", "intervalMinutes": 60},
                "lookbackWindowHours": 768, "retentionDays": 32,
                "collectorEntrypoint": GLOBAL_COLLECTOR_ENTRYPOINT,
                "collectorWorkflow": ".github/workflows/climate-observer.yml",
                "destinationDatabaseId": "climate-observer-db-001",
                "destinationDatabasePath": ".publisher-data/climate-observer-001/stories.sqlite3",
                "scheduleAnchorUtcMinute": 30,
            })
            (temp / "view-collection-profiles.json").write_text(json.dumps(profiles), encoding="utf-8")

            assignments = json.loads((temp / "source-view-assignments.json").read_text())
            assignments["assignments"].append({
                "assignmentId": "climate-observer-noaa-001",
                "sourceId": "source-noaa-ocean-service",
                "viewId": "climate-observer-001",
                "feedUrls": ["https://oceanservice.noaa.gov/rss/oceanfacts.xml"],
                "topicFilters": ["climate", "ocean"],
                "enabled": True,
                "scheduleOverride": None,
                "limits": {"maxItemsPerRun": 0},
            })
            (temp / "source-view-assignments.json").write_text(json.dumps(assignments), encoding="utf-8")

            scheduler = json.loads((temp / "scheduler.json").read_text())
            scheduler["views"]["climate-observer-001"] = {
                "enabled": True, "cadence": "hourly", "anchorMinuteUtc": 30
            }
            (temp / "scheduler.json").write_text(json.dumps(scheduler), encoding="utf-8")

            _, manager_profiles, _, _, dispatcher, _ = build_manager(temp, temp / "state")
            self.assertIn("climate-observer-001", manager_profiles.ids())
            job = dispatcher.create_job("climate-observer-001", scheduled_at="2026-11-03T10:30:00Z")
            self.assertEqual(job.collectorEntrypoint, GLOBAL_COLLECTOR_ENTRYPOINT)
            self.assertEqual(job.viewId, "climate-observer-001")
            self.assertEqual(job.destinationDatabaseId, "climate-observer-db-001")
            self.assertEqual(job.assignmentIds, ("climate-observer-noaa-001",))

    def test_job_fingerprint_matches_global_collector_contract(self):
        _, profiles, _, _, dispatcher, _ = build_manager(CONFIG, Path(tempfile.mkdtemp()))
        job = dispatcher.create_job("nature", scheduled_at="2026-11-03T10:15:00Z").to_dict()
        profile = profiles.get("nature")
        snapshot = {
            "viewId": job["viewId"],
            "profileId": profile["profileId"],
            "assignmentIds": sorted(set(job["assignmentIds"])),
            "sourceIds": sorted(set(job["sourceIds"])),
            "feedUrls": sorted(set(job["feedUrls"])),
            "collectorEntrypoint": profile["collectorEntrypoint"],
            "collectorWorkflow": profile["collectorWorkflow"],
            "destinationDatabaseId": profile["destinationDatabaseId"],
            "destinationDatabasePath": profile["destinationDatabasePath"],
            "scheduledAt": job["scheduledAt"],
            "requestWindowHours": profile["lookbackWindowHours"],
            "trigger": job["trigger"],
        }
        encoded = json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        self.assertEqual(job["configVersion"], hashlib.sha256(encoded.encode("utf-8")).hexdigest())

    def test_manager_does_not_accept_a_view_specific_collector(self):
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            for filename in ("source-registry.json", "view-collection-profiles.json",
                            "source-view-assignments.json", "scheduler.json"):
                (temp / filename).write_text((CONFIG / filename).read_text(encoding="utf-8"), encoding="utf-8")
            profiles = json.loads((temp / "view-collection-profiles.json").read_text())
            profiles["profiles"][0]["collectorEntrypoint"] = "nature/collector/collector.py"
            (temp / "view-collection-profiles.json").write_text(json.dumps(profiles), encoding="utf-8")
            with self.assertRaises(ManagerError):
                build_manager(temp, temp / "state")

    def test_profile_cannot_route_destination_into_another_view(self):
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            for filename in ("source-registry.json", "view-collection-profiles.json",
                            "source-view-assignments.json", "scheduler.json"):
                (temp / filename).write_text((CONFIG / filename).read_text(encoding="utf-8"), encoding="utf-8")
            profiles = json.loads((temp / "view-collection-profiles.json").read_text())
            profiles["profiles"][0]["destinationDatabasePath"] = ".publisher-data/alien-world/wrong.sqlite3"
            (temp / "view-collection-profiles.json").write_text(json.dumps(profiles), encoding="utf-8")
            with self.assertRaises(ManagerError):
                build_manager(temp, temp / "state")

    def test_scheduler_assigns_due_jobs_for_all_configured_views(self):
        _, _, _, scheduler, dispatcher, _ = build_manager(CONFIG, Path(tempfile.mkdtemp()))
        when = datetime(2026, 11, 3, 10, 15, tzinfo=timezone.utc)
        self.assertEqual(scheduler.due_views(when), ["nature"])
        jobs = dispatcher.assign_due_jobs(scheduler, when)
        self.assertEqual([job.viewId for job in jobs], ["nature"])
        self.assertTrue(all(job.collectorEntrypoint == GLOBAL_COLLECTOR_ENTRYPOINT for job in jobs))

    def test_manual_refresh_requires_authorisation(self):
        _, _, _, _, dispatcher, _ = build_manager(CONFIG, Path(tempfile.mkdtemp()))
        with self.assertRaises(ManagerError):
            dispatcher.create_job("nature", trigger="manual", authorised=False)
        self.assertEqual(
            dispatcher.create_job("nature", trigger="manual", authorised=True).trigger,
            "manual",
        )

    def test_unknown_view_fails_with_clear_configuration_error(self):
        _, _, _, _, dispatcher, _ = build_manager(CONFIG, Path(tempfile.mkdtemp()))
        with self.assertRaisesRegex(ManagerError, "No Collection Profile"):
            dispatcher.create_job("not-registered-yet")

    def test_assignments_cannot_reference_an_unregistered_view(self):
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            for filename in ("source-registry.json", "view-collection-profiles.json",
                            "source-view-assignments.json", "scheduler.json"):
                (temp / filename).write_text((CONFIG / filename).read_text(encoding="utf-8"), encoding="utf-8")
            assignments = json.loads((temp / "source-view-assignments.json").read_text())
            assignments["assignments"][0]["viewId"] = "ghost-view"
            (temp / "source-view-assignments.json").write_text(json.dumps(assignments), encoding="utf-8")
            with self.assertRaisesRegex(ManagerError, "unknown View ID"):
                build_manager(temp, temp / "state")


if __name__ == "__main__":
    unittest.main()
