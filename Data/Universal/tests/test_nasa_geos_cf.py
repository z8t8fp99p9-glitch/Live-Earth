from __future__ import annotations

import datetime as dt
import gzip
import unittest

import numpy as np
import xarray as xr

from Data.Universal.engine.adapters import nasa_geos_cf as adapter


class NasaGeosCfAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lat = np.arange(-90.0, 90.0001, 0.25)
        cls.lon = np.arange(-180.0, 180.0, 0.25)
        cls.coords = {
            "time": ("time", [0, 1], {"grads_min": "09:30z21nov2026", "grads_step": "60mn"}),
            "lat": cls.lat,
            "lon": cls.lon,
        }

    def test_parses_hour_and_half_hour_grads_timestamps(self):
        self.assertEqual(
            adapter._parse_grads_start("12z08nov2026"),
            dt.datetime(2026, 11, 8, 12, tzinfo=dt.timezone.utc),
        )
        self.assertEqual(
            adapter._parse_grads_start("09:30z21nov2026"),
            dt.datetime(2026, 11, 21, 9, 30, tzinfo=dt.timezone.utc),
        )

    def test_surface_field_is_normalized_to_universal_grid(self):
        values = np.full((2, 1, 721, 1440), 1.5e-7, dtype=np.float32)
        ds = xr.Dataset(
            {"co": (("time", "lev", "lat", "lon"), values)},
            coords={**self.coords, "lev": [72]},
        )
        try:
            payload, raw, valid = adapter._extract_latest(
                ds, adapter.DATASETS["earth.atmosphere.carbon_monoxide"]
            )
        finally:
            ds.close()
        self.assertEqual(valid, dt.datetime(2026, 11, 21, 10, 30, tzinfo=dt.timezone.utc))
        self.assertEqual(len(raw), 1440 * 721 * 2)
        self.assertEqual(len(gzip.decompress(payload)), len(raw))

    def test_carbon_monoxide_uses_safe_int16_scale_without_clipping(self):
        # 50,000 ppb exceeds the old scale=10 int16 ceiling (3,276.7 ppb).
        # The revised scale=0.1 stores 10 ppb steps and round-trips exactly.
        values = np.full((2, 1, 721, 1440), 5.0e-5, dtype=np.float32)
        ds = xr.Dataset(
            {"co": (("time", "lev", "lat", "lon"), values)},
            coords={**self.coords, "lev": [72]},
        )
        try:
            payload, raw, _ = adapter._extract_latest(
                ds, adapter.DATASETS["earth.atmosphere.carbon_monoxide"]
            )
        finally:
            ds.close()
        packed = np.frombuffer(gzip.decompress(payload), dtype="<i2")
        self.assertTrue(np.all(packed == 5000))
        self.assertAlmostEqual(float(packed[0]) / adapter.DATASETS["earth.atmosphere.carbon_monoxide"]["scale"], 50000.0)
        self.assertEqual(len(raw), 1440 * 721 * 2)

    def test_column_average_co2_conversion_and_encoding(self):
        values = np.full((2, 721, 1440), 4.2e-4, dtype=np.float32)
        ds = xr.Dataset(
            {"xco2": (("time", "lat", "lon"), values)},
            coords=self.coords,
        )
        try:
            payload, raw, _ = adapter._extract_latest(
                ds, adapter.DATASETS["earth.atmosphere.co2_concentration"]
            )
        finally:
            ds.close()
        packed = np.frombuffer(gzip.decompress(payload), dtype="<i2")
        self.assertEqual(len(raw), 1440 * 721 * 2)
        self.assertTrue(np.all(packed == 4200))

    def test_rejects_non_singleton_vertical_dimension(self):
        values = np.ones((2, 2, 721, 1440), dtype=np.float32) * 1.0e-7
        ds = xr.Dataset(
            {"co": (("time", "lev", "lat", "lon"), values)},
            coords={**self.coords, "lev": [1000, 850]},
        )
        try:
            with self.assertRaisesRegex(RuntimeError, "arbitrary vertical level"):
                adapter._extract_latest(ds, adapter.DATASETS["earth.atmosphere.carbon_monoxide"])
        finally:
            ds.close()


if __name__ == "__main__":
    unittest.main()
