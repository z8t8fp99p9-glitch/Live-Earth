from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

CHECKER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CHECKER_DIR))
import live_earth_dispatch


class GlobalDispatcherTests(unittest.TestCase):
    def test_future_view_is_resolved_from_manager_and_uses_shared_orchestrator(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "global_collection_manager/config").mkdir(parents=True)
            (root / "ocean-research/publisher").mkdir(parents=True)
            entrypoint = root / "ocean-research/publisher/newsroom_publisher.py"
            entrypoint.write_text("def main():\n    return 7\n", encoding="utf-8")
            profiles = {"profiles": [{
                "viewId": "ocean-research", "enabled": True,
                "publisherEntrypoint": "ocean-research/publisher/newsroom_publisher.py"
            }]}
            (root / "global_collection_manager/config/view-collection-profiles.json").write_text(
                json.dumps(profiles), encoding="utf-8"
            )
            newsroom = SimpleNamespace(run=lambda view, repository_root: {
                "viewId": view, "phase": "newsroom-database-write-complete"
            })
            with patch.dict(os.environ, {"LIVE_EARTH_PROJECT_ROOT": str(root)}), \
                 patch.object(sys, "argv", ["live_earth_dispatch.py", "publish", "--view", "ocean-research"]), \
                 patch.dict(sys.modules, {"newsroom_orchestrator": newsroom}):
                self.assertEqual(live_earth_dispatch.main(), 7)

    def test_orchestrator_block_stops_before_publisher(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "global_collection_manager/config").mkdir(parents=True)
            (root / "nature/publisher").mkdir(parents=True)
            (root / "nature/publisher/newsroom_publisher.py").write_text(
                "raise AssertionError('publisher must not run')\n", encoding="utf-8"
            )
            (root / "global_collection_manager/config/view-collection-profiles.json").write_text(
                json.dumps({"profiles": [{"viewId": "nature", "enabled": True,
                    "publisherEntrypoint": "nature/publisher/newsroom_publisher.py"}]}), encoding="utf-8"
            )
            newsroom = SimpleNamespace(run=lambda view, repository_root: {
                "viewId": view, "phase": "newsroom-orchestration-blocked"
            })
            with patch.dict(os.environ, {"LIVE_EARTH_PROJECT_ROOT": str(root)}), \
                 patch.object(sys, "argv", ["live_earth_dispatch.py", "publish", "--view", "nature"]), \
                 patch.dict(sys.modules, {"newsroom_orchestrator": newsroom}):
                with self.assertRaisesRegex(RuntimeError, "was blocked"):
                    live_earth_dispatch.main()


if __name__ == "__main__":
    unittest.main(verbosity=2)
