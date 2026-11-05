from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from global_collection_manager.manager import build_manager
from global_collection_manager.models import ManagerError

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config"

class RetiredViewManagerTests(unittest.TestCase):
    def test_no_sources_views_assignments_or_scheduled_jobs_remain(self):
        registry, profiles, assignments, scheduler, dispatcher, _ = build_manager(
            CONFIG, Path(tempfile.mkdtemp())
        )
        self.assertEqual(registry.ids(), set())
        self.assertEqual(profiles.ids(), set())
        self.assertEqual(assignments.all(), [])
        self.assertEqual(scheduler.config["views"], {})
        self.assertEqual(scheduler.due_views(datetime(2026, 11, 5, 10, 15, tzinfo=timezone.utc)), [])
        for retired_view in ("nature", "alien-world"):
            with self.subTest(view=retired_view):
                with self.assertRaisesRegex(ManagerError, "No Collection Profile"):
                    dispatcher.create_job(retired_view)

if __name__ == "__main__":
    unittest.main(verbosity=2)
