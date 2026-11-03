from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import image_engine
import image_engine_integration


class ViewScopedStagingTests(unittest.TestCase):
    def test_shared_integration_passes_view_id_into_staging_for_each_registered_view(self):
        for view_id in ("nature", "alien-world"):
            with self.subTest(view=view_id), tempfile.TemporaryDirectory() as temp:
                base = Path(temp)
                database = base / view_id / "stories.sqlite3"
                database.parent.mkdir(parents=True)
                connection = sqlite3.connect(database)
                connection.close()
                checker = SimpleNamespace(
                    ensure_decision_table=lambda _connection: None,
                    load_registry=lambda: {"registryVersion": "test-registry"},
                )
                with patch.object(
                    image_engine_integration,
                    "stage_directory",
                    wraps=image_engine.stage_directory,
                ) as staged:
                    result = image_engine_integration.attach_original_illustrations(
                        {"viewId": view_id, "stories": []},
                        view_id,
                        database_path=database,
                        output_dir=base / "published" / "assets",
                        raw_asset_base_url=(
                            "https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/"
                            f"{view_id}/published/assets/"
                        ),
                        checker=checker,
                    )
                self.assertEqual(result, [])
                self.assertEqual(staged.call_count, 1)
                self.assertEqual(staged.call_args.args[2], view_id)
                self.assertEqual(Path(staged.call_args.args[0]).name, "image-engine-staging")


if __name__ == "__main__":
    unittest.main(verbosity=2)
