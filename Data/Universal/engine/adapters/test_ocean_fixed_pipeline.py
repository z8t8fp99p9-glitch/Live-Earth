from __future__ import annotations

import importlib
import sys
import types
import unittest
from unittest.mock import patch

import numpy as np

# The deployed repository already contains ocean.py. This small stand-in lets
# the helper tests run in an isolated patch workspace without copying it.
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
    _stub._get = lambda *args, **kwargs: None
    _stub.is_due = lambda dataset: True
    _stub.collect = lambda dataset: {"test": True}
    sys.modules[_MODULE] = _stub

ocean_fixed = importlib.import_module("Data.Universal.engine.adapters.ocean_fixed")
from Data.Universal.engine import bootstrap


class OceanFixedPipelineTests(unittest.TestCase):
    def test_erddap_stride_is_index_stride_not_degrees(self):
        axis = np.array([-89.875, -89.625, -89.375, -89.125, -88.875])
        selector, selected = ocean_fixed._axis_selector(axis, 1)
        self.assertEqual(selector, "[(-89.875):1:(-88.875)]")
        np.testing.assert_array_equal(selected, axis)

    def test_chlorophyll_stride_three_uses_three_source_indices(self):
        axis = np.linspace(-89.9791666667, 89.9791666667, 4320)
        selector, selected = ocean_fixed._axis_selector(axis, 3)
        self.assertIn("):3:(", selector)
        self.assertEqual(selected.size, 1440)
        self.assertAlmostEqual(abs(float(np.median(np.diff(selected)))), 0.125, places=5)

    def test_regular_axis_accepts_float32_serialization_noise(self):
        spec = {"base": "https://example.test/erddap", "dataset_id": "regular-grid-test"}
        csv_text = "latitude (degrees_north)\n-89.97916667\n-89.93750000\n-89.89583330\n-89.85416667\n"
        fake_response = type("Response", (), {"text": csv_text})()
        with patch.object(ocean_fixed._ocean, "_get", return_value=fake_response):
            axis = ocean_fixed._axis_values(spec, "latitude")
        self.assertEqual(axis.size, 4)
        self.assertAlmostEqual(float(np.median(np.diff(axis))), 0.04166667, places=6)

    def test_bootstrap_routes_all_ocean_datasets_through_corrected_adapter(self):
        ocean_ids = [key for key in bootstrap.CONFIG if key.startswith("earth.oceans.")]
        self.assertEqual(len(ocean_ids), 6)
        for dataset_id in ocean_ids:
            self.assertEqual(bootstrap.CONFIG[dataset_id][0], "ocean_fixed")

    def test_all_six_layers_delegate_to_same_new_adapter(self):
        self.assertTrue(callable(ocean_fixed.collect))
        self.assertTrue(callable(ocean_fixed.is_due))
        self.assertEqual(set(ocean_fixed._ocean.DATASETS), {
            "earth.oceans.sea_temperature", "earth.oceans.ocean_currents",
            "earth.oceans.sea_level", "earth.oceans.salinity",
            "earth.oceans.wave_height", "earth.oceans.chlorophyll",
        })


if __name__ == "__main__":
    unittest.main()
