from __future__ import annotations

import importlib
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

_MODULE = "Data.Universal.engine.adapters.ocean"
if _MODULE not in sys.modules:
    _stub = types.ModuleType(_MODULE)
    _stub._AXIS_CACHE = {}
    _stub.MAX_AXIS_BYTES = 2 * 1024 * 1024
    _stub.DATASETS = {
        "earth.oceans.sea_temperature": {}, "earth.oceans.ocean_currents": {},
        "earth.oceans.sea_level": {}, "earth.oceans.salinity": {},
        "earth.oceans.wave_height": {}, "earth.oceans.chlorophyll": {},
    }
    _stub.SESSION = types.SimpleNamespace(headers={"update": lambda *_: None})
    _stub._get = lambda *args, **kwargs: None
    _stub._request_erddap = lambda *args, **kwargs: None
    _stub._latest_erddap_time = lambda *args, **kwargs: None
    _stub.is_due = lambda dataset: False
    _stub.collect = lambda dataset: {"test": True}
    _stub.DB_ROOT = None
    sys.modules[_MODULE] = _stub

ocean_fixed = importlib.import_module("Data.Universal.engine.adapters.ocean_fixed")
from Data.Universal.engine import bootstrap


class OceanFixedPipelineTests(unittest.TestCase):
    def test_salinity_uses_one_noaa_three_day_composite(self):
        spec = ocean_fixed._ocean.DATASETS["earth.oceans.salinity"]
        self.assertEqual(spec["dataset_id"], "coastwatchSMOSv662SSS3day")
        self.assertEqual(spec["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(spec["variables"], ("sss",))
        self.assertEqual(spec["extra_dims"], ("altitude",))
        self.assertEqual(spec["source_id"], "noaa_coastwatch_smos_3day_composite")
        self.assertEqual(spec["cadence"], "3-day")
        self.assertEqual(spec["stride"], 1)
        self.assertEqual(spec["expected_native_spacing_degrees"], 0.25)

    def test_chlorophyll_uses_one_nasa_eight_day_composite(self):
        spec = ocean_fixed._ocean.DATASETS["earth.oceans.chlorophyll"]
        self.assertEqual(spec["dataset_id"], "erdMH1chla8day_R2022NRT")
        self.assertEqual(spec["variables"], ("chlorophyll",))
        self.assertEqual(spec["source_id"], "nasa_aqua_modis_chlorophyll_8day")
        self.assertEqual(spec["cadence"], "8-day")
        self.assertEqual(spec["stride"], 3)
        self.assertAlmostEqual(spec["expected_native_spacing_degrees"], 1 / 24)

    def test_salinity_native_grid_preserves_existing_target_dimensions(self):
        lat = -89.875 + np.arange(720) * 0.25
        lon = -179.875 + np.arange(1440) * 0.25
        _, selected_lat = ocean_fixed._axis_selector(lat, 1)
        _, selected_lon = ocean_fixed._axis_selector(lon, 1)
        self.assertEqual((selected_lat.size, selected_lon.size), (720, 1440))

    def test_chlorophyll_stride_three_preserves_existing_target_dimensions(self):
        lat = 89.9791667 - np.arange(4320, dtype=float) / 24.0
        lon = -179.9791667 + np.arange(8640, dtype=float) / 24.0
        _, selected_lat = ocean_fixed._axis_selector(lat, 3)
        _, selected_lon = ocean_fixed._axis_selector(lon, 3)
        self.assertEqual((selected_lat.size, selected_lon.size), (1440, 2880))
        self.assertAlmostEqual(float(np.median(np.diff(selected_lat))), -0.125, places=6)
        self.assertAlmostEqual(float(np.median(np.diff(selected_lon))), 0.125, places=6)

    def test_composite_cadences_are_registered(self):
        self.assertEqual(bootstrap.CONFIG["earth.oceans.salinity"], (
            "ocean_fixed", "noaa_coastwatch_smos_3day_composite", "3-day"
        ))
        self.assertEqual(bootstrap.CONFIG["earth.oceans.chlorophyll"], (
            "ocean_fixed", "nasa_aqua_modis_chlorophyll_8day", "8-day"
        ))
        self.assertEqual(bootstrap.CADENCE_RESOLUTION["3-day"], "three_day_mean_source_composite")
        self.assertEqual(bootstrap.CADENCE_RESOLUTION["8-day"], "eight_day_centered_source_composite")

    def test_all_six_ocean_layers_remain_on_the_same_adapter(self):
        ocean_ids = [key for key in bootstrap.CONFIG if key.startswith("earth.oceans.")]
        self.assertEqual(len(ocean_ids), 6)
        for dataset_id in ocean_ids:
            self.assertEqual(bootstrap.CONFIG[dataset_id][0], "ocean_fixed")

    def test_salinity_composite_metadata_is_checked_before_fetch(self):
        spec = ocean_fixed._ocean.DATASETS["earth.oceans.salinity"]
        records = [
            {"Row Type": "attribute", "Variable Name": "sss", "Attribute Name": "cell_methods", "Value": "time: mean (interval: 3 day)"},
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL", "Attribute Name": "product_name", "Value": "SM_D2026316_Map_SATSSS_data_3days.nc"},
        ]
        with patch.object(ocean_fixed._ocean, "_dataset_info", return_value=records, create=True):
            ocean_fixed._validate_composite_product(spec)

    def test_salinity_daily_product_is_rejected(self):
        spec = ocean_fixed._ocean.DATASETS["earth.oceans.salinity"]
        records = [
            {"Row Type": "attribute", "Variable Name": "sss", "Attribute Name": "cell_methods", "Value": "time: mean (interval: 1 day)"},
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL", "Attribute Name": "product_name", "Value": "SM_D2026325_Map_SATSSS_data_1day.nc"},
        ]
        with patch.object(ocean_fixed._ocean, "_dataset_info", return_value=records, create=True):
            with self.assertRaisesRegex(RuntimeError, "3-day mean composite"):
                ocean_fixed._validate_composite_product(spec)

    def test_source_identity_change_forces_a_new_fetch_even_if_time_matches(self):
        dataset_id = "earth.oceans.salinity"
        spec = ocean_fixed._ocean.DATASETS[dataset_id]
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            metadata_path = root / "values" / dataset_id / "metadata.json"
            metadata_path.parent.mkdir(parents=True)
            metadata_path.write_text(json.dumps({
                "source_id": "noaa_coastwatch_smos",
                "source_url": "https://polarwatch.noaa.gov/erddap/griddap/noaacwSMOSsssDaily.nc?sss",
                "valid_time_utc": "same-time",
            }), encoding="utf-8")
            with patch.object(ocean_fixed._ocean, "DB_ROOT", root, create=True), \
                 patch.object(ocean_fixed._ocean, "is_due", return_value=False):
                self.assertTrue(ocean_fixed.is_due({"dataset_id": dataset_id}))

            metadata_path.write_text(json.dumps({
                "source_id": spec["source_id"],
                "source_url": f"{spec['base']}/griddap/{spec['dataset_id']}.nc?sss[same-time]",
                "valid_time_utc": "same-time",
            }), encoding="utf-8")
            with patch.object(ocean_fixed._ocean, "DB_ROOT", root, create=True), \
                 patch.object(ocean_fixed._ocean, "is_due", return_value=False):
                self.assertFalse(ocean_fixed.is_due({"dataset_id": dataset_id}))


if __name__ == "__main__":
    unittest.main()
