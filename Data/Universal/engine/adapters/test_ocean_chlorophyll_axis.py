from __future__ import annotations
import datetime as dt
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
            "source_id": "nasa_aqua_modis_chlorophyll_4km",
            "units": "mg m-3",
            "stride": 3,
            "expected_native_spacing_degrees": 1.0 / 24.0,
            "max_age_days": 7,
        }

    def test_accepts_small_float_serialization_noise(self):
        base = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        jitter = np.sin(np.arange(base.size) * 0.17) * 1.2e-5
        csv_text = "longitude\n" + "\n".join(f"{v:.10f}" for v in base + jitter)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            result = ocean_fixed._axis_values(self.spec, "longitude")
        self.assertEqual(result.size, 8640)

    def test_rejects_missing_or_doubled_cell(self):
        axis = -179.9791667 + np.arange(200, dtype=np.float64) / 24.0
        axis[100:] += 1.0 / 24.0
        csv_text = "longitude\n" + "\n".join(f"{v:.10f}" for v in axis)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            with self.assertRaisesRegex(RuntimeError, "materially irregular"):
                ocean_fixed._axis_values(self.spec, "longitude")

    def test_stride_three_uses_integer_erddap_index_and_point_125_degree_grid(self):
        axis = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        selector, selected = ocean_fixed._axis_selector(axis, 3)
        self.assertEqual(selected.size, 2880)
        self.assertIn("):3:(", selector)
        self.assertAlmostEqual(float(np.median(np.diff(selected))), 0.125, places=6)

    def test_renderer_dimensions_are_preserved(self):
        lat = 89.9791667 - np.arange(4320, dtype=np.float64) / 24.0
        lon = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        _, sampled_lat = ocean_fixed._axis_selector(lat, 3)
        _, sampled_lon = ocean_fixed._axis_selector(lon, 3)
        self.assertEqual((sampled_lat.size, sampled_lon.size), (1440, 2880))

    def test_rejects_non_monotonic_axis(self):
        axis = np.array([0.0, 0.0416667, 0.0833333, 0.01])
        csv_text = "longitude\n" + "\n".join(str(v) for v in axis)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            with self.assertRaisesRegex(RuntimeError, "not monotonic"):
                ocean_fixed._axis_values(self.spec, "longitude")

    def test_uses_dated_modis_nrt_product_instead_of_stale_time_actual_range(self):
        today = dt.datetime.now(dt.timezone.utc).date()
        product = f"AQUA_MODIS.{today:%Y%m%d}.L3m.DAY.CHL.chlor_a.4km.NRT.nc"
        records = [{"Row Type": "attribute", "Attribute Name": "product_name", "Value": product}]
        with patch.object(ocean_fixed._ocean, "_dataset_info", return_value=records):
            latest = ocean_fixed._latest_erddap_time(self.spec)
        self.assertEqual(latest.date(), today)

if __name__ == "__main__":
    unittest.main()
