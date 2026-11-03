import contextlib
import importlib.util
import io
import sys
import types
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("newsroom_workflow_runner.py")
SPEC = importlib.util.spec_from_file_location("newsroom_workflow_runner", MODULE_PATH)
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)

class NewsroomPipelineError(RuntimeError):
    pass

class WorkflowRunnerTests(unittest.TestCase):
    def setUp(self):
        self.original = sys.modules.get("newsroom_pipeline")
    def tearDown(self):
        if self.original is None:
            sys.modules.pop("newsroom_pipeline", None)
        else:
            sys.modules["newsroom_pipeline"] = self.original
    def run_with_error(self, message):
        module = types.ModuleType("newsroom_pipeline")
        def fail(*_args):
            raise NewsroomPipelineError(message)
        module.run = fail
        sys.modules["newsroom_pipeline"] = module
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return runner.main(["--view", "nature", "--repository-root", "."])
    def test_empty_intake_is_successful_noop(self):
        self.assertEqual(self.run_with_error(
            "No source item passed Global Checker editorial intake. No Newsroom database write was attempted."
        ), 0)
    def test_no_engine_stories_is_successful_noop(self):
        self.assertEqual(self.run_with_error(
            "Universal Editorial Engine produced no stories. held"
        ), 0)
    def test_no_final_approvals_is_successful_noop(self):
        self.assertEqual(self.run_with_error(
            "Global Checker final review approved no stories. []"
        ), 0)
    def test_unrelated_pipeline_error_remains_fatal(self):
        self.assertEqual(self.run_with_error(
            "Global Collector failed unexpectedly."
        ), 2)

if __name__ == "__main__":
    unittest.main()
