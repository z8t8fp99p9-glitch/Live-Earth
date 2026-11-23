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
ocean_additional = importlib.import_module("Data.Universal.engine.adapters.ocean_additional")
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
        self.assertEqual(spec["aggregation_factor"], 3)
        self.assertAlmostEqual(spec["expected_native_spacing_degrees"], 1 / 24)

    def test_salinity_native_grid_preserves_existing_target_dimensions(self):
        lat = -89.875 + np.arange(720) * 0.25
        lon = -179.875 + np.arange(1440) * 0.25
        _, selected_lat = ocean_fixed._axis_selector(lat, 1)
        _, selected_lon = ocean_fixed._axis_selector(lon, 1)
        self.assertEqual((selected_lat.size, selected_lon.size), (720, 1440))

    def test_chlorophyll_native_grid_is_full_resolution_for_block_aggregation(self):
        lat = 89.9791667 - np.arange(4320, dtype=float) / 24.0
        lon = -179.9791667 + np.arange(8640, dtype=float) / 24.0
        _, selected_lat = ocean_fixed._axis_selector(lat, 1)
        _, selected_lon = ocean_fixed._axis_selector(lon, 1)
        self.assertEqual((selected_lat.size, selected_lon.size), (4320, 8640))
        self.assertAlmostEqual(float(np.median(np.diff(selected_lat))), -1 / 24, places=6)
        self.assertAlmostEqual(float(np.median(np.diff(selected_lon))), 1 / 24, places=6)

    def test_chlorophyll_3x3_mean_uses_only_valid_measured_pixels(self):
        spec = ocean_fixed._ocean.DATASETS["earth.oceans.chlorophyll"]
        values = np.full((6, 9), np.nan, dtype=float)
        values[0, 0] = 3.0
        values[0, 1] = 6.0
        values[2, 2] = 9.0
        values[0, 3] = 12.0
        values[1, 3] = 15.0
        values[3:6, 6:9] = 1000.0  # outside configured valid range
        lat = 10.0 - np.arange(6) / 24.0
        lon = -20.0 + np.arange(9) / 24.0
        reduced, out_lat, out_lon = ocean_fixed._aggregate_chlorophyll_3x3(values, lat, lon, spec)
        self.assertEqual(reduced.shape, (2, 3))
        self.assertAlmostEqual(reduced[0, 0], 6.0)
        self.assertAlmostEqual(reduced[0, 1], 13.5)
        self.assertTrue(np.isnan(reduced[0, 2]))
        self.assertTrue(np.isnan(reduced[1, 2]))
        self.assertAlmostEqual(out_lat[0], lat[1])
        self.assertAlmostEqual(out_lon[0], lon[1])

    def test_chlorophyll_aggregation_keeps_all_missing_blocks_missing(self):
        spec = ocean_fixed._ocean.DATASETS["earth.oceans.chlorophyll"]
        values = np.full((3, 6), np.nan, dtype=float)
        lat = 1.0 - np.arange(3) / 24.0
        lon = 2.0 + np.arange(6) / 24.0
        reduced, _, _ = ocean_fixed._aggregate_chlorophyll_3x3(values, lat, lon, spec)
        self.assertTrue(np.isnan(reduced).all())

    def test_composite_cadences_are_registered(self):
        self.assertEqual(bootstrap.CONFIG["earth.oceans.salinity"], (
            "ocean_fixed", "noaa_coastwatch_smos_3day_composite", "3-day"
        ))
        self.assertEqual(bootstrap.CONFIG["earth.oceans.chlorophyll"], (
            "ocean_fixed", "nasa_aqua_modis_chlorophyll_8day", "8-day"
        ))
        self.assertEqual(bootstrap.CADENCE_RESOLUTION["3-day"], "three_day_mean_source_composite")
        self.assertEqual(bootstrap.CADENCE_RESOLUTION["8-day"], "eight_day_centered_source_composite")

    def test_six_established_ocean_layers_remain_on_the_same_adapter(self):
        established = {
            "earth.oceans.sea_temperature", "earth.oceans.ocean_currents",
            "earth.oceans.salinity", "earth.oceans.sea_level",
            "earth.oceans.wave_height", "earth.oceans.chlorophyll",
        }
        for dataset_id in established:
            self.assertEqual(bootstrap.CONFIG[dataset_id][0], "ocean_fixed")

    def test_four_additional_ocean_layers_use_the_additive_adapter(self):
        additional = {
            "earth.oceans.ocean_colour", "earth.oceans.marine_productivity",
            "earth.oceans.ocean_heat", "earth.oceans.sea_ice",
        }
        for dataset_id in additional:
            self.assertEqual(bootstrap.CONFIG[dataset_id][0], "ocean_additional")

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
