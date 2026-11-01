from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import live_earth_global_checker_bootstrap as bootstrap


class BootstrapDispatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "global-checker").mkdir()
        (self.root / "global-checker" / "run_pipeline.py").write_text("# runner stub\n", encoding="utf-8")
        (self.root / "editorial-engine").mkdir()
        (self.root / "editorial-engine" / "requirements.txt").write_text("# marker\n", encoding="utf-8")
        for relative in bootstrap.ENTRYPOINTS:
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("# existing entrypoint stub\n", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def test_all_existing_entrypoints_dispatch_to_the_shared_runner(self):
        for relative, (phase, view_id) in bootstrap.ENTRYPOINTS.items():
            with self.subTest(relative=relative), patch.object(sys, "argv", [str(self.root / relative), "--mode", "live"]), \
                    patch.dict(os.environ, {bootstrap.ACTIVE_ENV: ""}, clear=False), \
                    patch.object(bootstrap.os, "execv") as execv:
                bootstrap.bootstrap()
                execv.assert_called_once_with(
                    sys.executable,
                    [sys.executable, str(self.root / "global-checker" / "run_pipeline.py"),
                     phase, "--view", view_id],
                )

    def test_unrelated_python_script_is_not_intercepted(self):
        other = self.root / "maintenance.py"
        other.write_text("# unrelated\n", encoding="utf-8")
        with patch.object(sys, "argv", [str(other)]), patch.object(bootstrap.os, "execv") as execv:
            bootstrap.bootstrap()
            execv.assert_not_called()

    def test_missing_runner_fails_closed(self):
        target = self.root / "nature" / "collector" / "collector.py"
        (self.root / "global-checker" / "run_pipeline.py").unlink()
        with patch.object(sys, "argv", [str(target)]), self.assertRaises(RuntimeError):
            bootstrap.bootstrap()

    def test_recursion_guard_prevents_second_dispatch(self):
        target = self.root / "nature" / "collector" / "collector.py"
        with patch.object(sys, "argv", [str(target)]), \
                patch.dict(os.environ, {bootstrap.ACTIVE_ENV: "1"}, clear=False), \
                patch.object(bootstrap.os, "execv") as execv:
            bootstrap.bootstrap()
            execv.assert_not_called()


if __name__ == "__main__":
    unittest.main()
