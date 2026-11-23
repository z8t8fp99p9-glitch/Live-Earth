from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

import numpy as np

from Data.Universal.engine.adapters import ocean_fixed


class ChlorophyllLongitudeAxisTests(unittest.TestCase):
    def setUp(self):
        ocean_fixed._ocean._AXIS_CACHE.clear()
        self.spec = {
            "base": "https://example.noaa.gov/erddap",
            "dataset_id": "erdMH1chla1day_R2022NRT",
            "units": "mg m-3",
        }

    def test_accepts_float_serialization_noise_on_native_modis_axis(self):
        # Simulates decimal serialization jitter while preserving the native
        # 1/24-degree grid and its monotonic ordering.
        base = -179.9791666667 + np.arange(8640, dtype=np.float64) / 24.0
        jitter = np.sin(np.arange(base.size) * 0.17) * 1.2e-4
        axis = base + jitter
        csv_text = "longitude\\n" + "\\n".join(f"{v:.10f}" for v in axis)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            result = ocean_fixed._axis_values(self.spec, "longitude")
        self.assertEqual(result.size, 8640)
        self.assertTrue(np.all(np.diff(result) > 0))

    def test_rejects_a_missing_or_doubled_cell(self):
        axis = -179.9791666667 + np.arange(200, dtype=np.float64) / 24.0
        axis[100:] += 1.0 / 24.0
        csv_text = "longitude\\n" + "\\n".join(f"{v:.10f}" for v in axis)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            with self.assertRaisesRegex(RuntimeError, "materially irregular"):
                ocean_fixed._axis_values(self.spec, "longitude")

    def test_chlorophyll_selector_keeps_integer_stride_three(self):
        axis = -179.9791666667 + np.arange(8640, dtype=np.float64) / 24.0
        selector, selected = ocean_fixed._axis_selector(axis, 3)
        self.assertEqual(selected.size, 2880)
        self.assertIn("):3:(", selector)

    def test_rejects_non_monotonic_longitude_axis(self):
        axis = np.array([0.0, 0.0416667, 0.0833333, 0.02])
        csv_text = "longitude\\n" + "\\n".join(str(v) for v in axis)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            with self.assertRaisesRegex(RuntimeError, "not monotonic"):
                ocean_fixed._axis_values(self.spec, "longitude")


if __name__ == "__main__":
    unittest.main()
