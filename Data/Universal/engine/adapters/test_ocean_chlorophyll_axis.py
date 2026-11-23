from __future__ import annotations

import datetime as dt
import unittest
from unittest.mock import Mock, patch

import numpy as np
from Data.Universal.engine.adapters import ocean_fixed


class ChlorophyllCompositeAxisTests(unittest.TestCase):
    def setUp(self):
        ocean_fixed._ocean._AXIS_CACHE.clear()
        self.spec = ocean_fixed._ocean.DATASETS["earth.oceans.chlorophyll"]

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

    def test_full_native_axis_is_requested_without_stride(self):
        axis = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        selector, selected = ocean_fixed._axis_selector(axis, 1)
        self.assertEqual(selected.size, 8640)
        self.assertIn("):1:(", selector)
        self.assertAlmostEqual(float(np.median(np.diff(selected))), 1.0 / 24.0, places=6)

    def test_renderer_dimensions_are_preserved_for_eight_day_product(self):
        lat = 89.9791667 - np.arange(4320, dtype=np.float64) / 24.0
        lon = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        _, native_lat = ocean_fixed._axis_selector(lat, 1)
        _, native_lon = ocean_fixed._axis_selector(lon, 1)
        self.assertEqual((native_lat.size, native_lon.size), (4320, 8640))

    def test_rejects_non_monotonic_axis(self):
        axis = np.array([0.0, 0.0416667, 0.0833333, 0.01])
        csv_text = "longitude\n" + "\n".join(str(v) for v in axis)
        with patch.object(ocean_fixed._ocean, "_get", return_value=Mock(text=csv_text)):
            with self.assertRaisesRegex(RuntimeError, "not monotonic"):
                ocean_fixed._axis_values(self.spec, "longitude")

    def test_accepts_float32_netcdf_coordinate_rounding(self):
        source = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        _, requested = ocean_fixed._axis_selector(source, 1)
        returned = requested.astype(np.float32).astype(np.float64)
        validated = ocean_fixed._validate_returned_axis(requested, returned, "longitude")
        self.assertEqual(validated.size, 8640)
        self.assertLessEqual(float(np.max(np.abs(validated - requested))), 5e-5)

    def test_rejects_a_real_one_cell_longitude_shift(self):
        source = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        _, requested = ocean_fixed._axis_selector(source, 1)
        shifted = requested + (1.0 / 24.0)
        with self.assertRaisesRegex(RuntimeError, "genuinely offset"):
            ocean_fixed._validate_returned_axis(requested, shifted, "longitude")

    def test_accepts_equivalent_longitude_origin_plus_360(self):
        source = -179.9791667 + np.arange(8640, dtype=np.float64) / 24.0
        _, requested = ocean_fixed._axis_selector(source, 1)
        returned = requested + 360.0
        validated = ocean_fixed._validate_returned_axis(requested, returned, "longitude")
        self.assertTrue(np.allclose(validated, returned))

    def test_uses_centered_time_coordinate_for_eight_day_composite(self):
        centered_time = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
        epoch = centered_time.timestamp()
        records = [
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL", "Attribute Name": "temporal_range", "Value": "8-day"},
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL", "Attribute Name": "product_name", "Value": "AQUA_MODIS.20261109_20261116.L3m.8D.CHL.chlor_a.4km.NRT.nc"},
            {"Row Type": "attribute", "Variable Name": "time", "Attribute Name": "actual_range", "Value": f"1646179200, {epoch}"},
        ]
        ocean_fixed._ocean._LATEST_CACHE.clear()
        with patch.object(ocean_fixed._ocean, "_dataset_info", return_value=records):
            latest = ocean_fixed._latest_erddap_time(self.spec)
        self.assertAlmostEqual(latest.timestamp(), epoch, delta=1.0)

    def test_rejects_a_daily_product_returned_by_eight_day_dataset(self):
        records = [
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL", "Attribute Name": "temporal_range", "Value": "1-day"},
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL", "Attribute Name": "product_name", "Value": "AQUA_MODIS.20261120.L3m.DAY.CHL.chlor_a.4km.NRT.nc"},
        ]
        with patch.object(ocean_fixed._ocean, "_dataset_info", return_value=records):
            with self.assertRaisesRegex(RuntimeError, "does not declare an 8-day"):
                ocean_fixed._validate_composite_product(self.spec)


if __name__ == "__main__":
    unittest.main()
