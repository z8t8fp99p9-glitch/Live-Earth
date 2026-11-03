import tempfile
import unittest
from pathlib import Path
from global_collector.job_contract import JobContract
from global_collector.errors import GlobalCollectorError
from support import build_repo


class JobContractTests(unittest.TestCase):
    def test_any_future_view_is_validated_using_manager_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            job = build_repo(root, "climate-observer-001")
            validated = JobContract(root).validate(job)
            self.assertEqual(validated["job"]["viewId"], "climate-observer-001")
            self.assertEqual(validated["job"]["collectorEntrypoint"], "global_collector")
            self.assertEqual(validated["job"]["destinationDatabaseId"], "climate-observer-001-sqlite")
            self.assertEqual(validated["managerRegistryVersion"], "test-1")
            self.assertFalse((root / "global-checker").exists())

    def test_wrong_destination_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            job = build_repo(root, "new-view")
            job["destinationDatabasePath"] = ".publisher-data/nature/nature.sqlite3"
            with self.assertRaises(GlobalCollectorError):
                JobContract(root).validate(job)

    def test_wrong_collector_entrypoint_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            job = build_repo(root, "new-view")
            job["collectorEntrypoint"] = "nature_collector"
            with self.assertRaises(GlobalCollectorError):
                JobContract(root).validate(job)


if __name__ == "__main__":
    unittest.main()
