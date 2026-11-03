from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

CHECKER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CHECKER_DIR))
import live_earth_global_checker_bootstrap as bootstrap


class ExecRequested(Exception):
    pass


class SafeBootstrapTests(unittest.TestCase):
    def test_pipeline_startup_execs_normal_dispatcher_instead_of_raising_system_exit(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "nature" / "publisher" / "publisher.py"
            source.parent.mkdir(parents=True)
            source.touch()
            (root / "editorial-engine").mkdir()
            (root / "editorial-engine" / "requirements.txt").write_text("# test\n")
            (root / "global-checker").mkdir()
            dispatcher = root / "global-checker" / "live_earth_dispatch.py"
            dispatcher.write_text("# test dispatcher\n")

            env = {
                bootstrap.ACTIVE_ENV: "",
                bootstrap.ROOT_ENV: "",
            }
            with mock.patch.dict(os.environ, env, clear=False), \
                 mock.patch.object(sys, "argv", [str(source)]), \
                 mock.patch.object(bootstrap.os, "execv", side_effect=ExecRequested) as execv:
                with self.assertRaises(ExecRequested):
                    bootstrap.bootstrap()
                self.assertEqual(os.environ[bootstrap.ACTIVE_ENV], "1")
                self.assertEqual(os.environ[bootstrap.ROOT_ENV], str(root))
                self.assertEqual(execv.call_args.args[0], sys.executable)
                self.assertEqual(execv.call_args.args[1][1], str(dispatcher))
                self.assertEqual(execv.call_args.args[1][2:], ["publish", "--view", "nature"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
