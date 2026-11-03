from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class GlobalArchitectureContractTests(unittest.TestCase):
    def test_every_enabled_view_uses_global_collector_and_configured_newsroom_publisher(self):
        profiles_doc = json.loads((ROOT / "global_collection_manager/config/view-collection-profiles.json").read_text())
        enabled = [item for item in profiles_doc["profiles"] if item.get("enabled") is True]
        self.assertTrue(enabled)
        for profile in enabled:
            with self.subTest(view=profile["viewId"]):
                self.assertEqual(profile.get("collectorEntrypoint"), "global_collector")
                self.assertTrue(profile.get("publisherEntrypoint", "").endswith("/newsroom_publisher.py"))
                self.assertTrue(profile.get("destinationDatabasePath", "").startswith(
                    f".publisher-data/{profile['viewId']}/"
                ))

    def test_no_view_specific_collector_implementations_or_workflow_calls_remain(self):
        for relative in (
            "nature/collector/collector.py",
            "alien-world/collector/collector.py",
            "global-checker/nature_pipeline.py",
            "global-checker/alien_world_pipeline.py",
            "image-engine/image_engine_integration.py",
        ):
            with self.subTest(path=relative):
                self.assertFalse((ROOT / relative).exists())
        for relative in (
            ".github/workflows/nature-publisher.yml",
            ".github/workflows/alien-world-publisher.yml",
            "nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml",
            "alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml",
        ):
            content = (ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("editorial-engine/newsroom_orchestrator.py", content)
            self.assertNotIn("collector/collector.py", content)

    def test_source_assignments_are_owned_by_manager_not_publisher_profiles(self):
        assignments = json.loads((ROOT / "global_collection_manager/config/source-view-assignments.json").read_text())
        views = {item["viewId"] for item in assignments["assignments"] if item.get("enabled") is True}
        for view in views:
            profile = ROOT / view / "publisher" / "profile.json"
            if profile.is_file():
                data = json.loads(profile.read_text())
                self.assertNotIn("sources", data)
                self.assertNotIn("sourcePolicy", data)
                self.assertNotIn("imageAllowlist", data)
                self.assertNotIn("imageUsePolicy", data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
