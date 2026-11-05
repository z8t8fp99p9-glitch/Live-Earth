from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class GlobalArchitectureContractTests(unittest.TestCase):
    def test_no_active_collection_sources_views_assignments_or_schedules(self):
        base = ROOT / "global_collection_manager" / "config"
        self.assertEqual(json.loads((base / "source-registry.json").read_text())["sources"], [])
        self.assertEqual(json.loads((base / "source-view-assignments.json").read_text())["assignments"], [])
        self.assertEqual(json.loads((base / "view-collection-profiles.json").read_text())["profiles"], [])
        self.assertEqual(json.loads((base / "scheduler.json").read_text())["views"], {})

    def test_shared_global_engines_are_preserved(self):
        for relative in (
            "global_collector/collector.py",
            "global_collection_manager/manager.py",
            "global-checker/global_checker.py",
            "image-engine/global_image_pipeline.py",
            "editorial-engine/newsroom_orchestrator.py",
            "newsroom-database-writer/newsroom_database_writer.py",
        ):
            with self.subTest(path=relative):
                self.assertTrue((ROOT / relative).is_file())

    def test_retired_view_runtime_and_cleaner_implementation_are_absent(self):
        for relative in (
            "nature",
            "alien-world",
            "scripts/global_database_cleaner.py",
        ):
            with self.subTest(path=relative):
                self.assertFalse((ROOT / relative).exists())

if __name__ == "__main__":
    unittest.main(verbosity=2)
