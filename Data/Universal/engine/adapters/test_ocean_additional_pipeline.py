from __future__ import annotations

import datetime as dt
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import xarray as xr

from Data.Universal.engine import bootstrap
from Data.Universal.engine.adapters import ocean, ocean_fixed, ocean_additional


class AdditionalOceanDatasetTests(unittest.TestCase):
    def test_four_new_datasets_have_verified_sources_and_contracts(self):
        expected = {
            "earth.oceans.ocean_colour": (
                "erdMH1cflh1day_R2022NRT", "nflh",
                "nasa_aqua_modis_fluorescence_line_height",
            ),
            "earth.oceans.marine_productivity": (
                "productivity_viirs_noaa20_daily_nrt", "productivity",
                "noaa_coastwatch_viirs_noaa20_productivity_daily",
            ),
            "earth.oceans.sea_ice": (
                "ncdcOisst21Agg_LonPM180", "ice",
                "noaa_ncei_oisst21_sea_ice_fraction",
            ),
        }
        for dataset_id, (source_dataset, variable, source_id) in expected.items():
            spec = ocean.DATASETS[dataset_id]
            self.assertEqual(spec["dataset_id"], source_dataset)
            self.assertEqual(spec["variables"], (variable,))
            self.assertEqual(spec["source_id"], source_id)
            self.assertEqual(bootstrap.CONFIG[dataset_id][0], "ocean_additional")
            self.assertEqual(bootstrap.CONFIG[dataset_id][1], source_id)

        heat = ocean.DATASETS["earth.oceans.ocean_heat"]
        self.assertEqual(heat["source_id"], ocean_additional.HEAT_SOURCE_ID)
        self.assertEqual(heat["cadence"], "monthly")
        self.assertEqual(bootstrap.CONFIG["earth.oceans.ocean_heat"][0], "ocean_additional")

    def test_four_additions_do_not_change_six_established_source_definitions(self):
        expected = {
            "earth.oceans.sea_temperature": ("ncdcOisst21Agg_LonPM180", "noaa_ncei_oisst21"),
            "earth.oceans.ocean_currents": ("noaacwBLENDEDNRTcurrentsDaily", "noaa_coastwatch_nrt_currents"),
            "earth.oceans.salinity": ("coastwatchSMOSv662SSS3day", "noaa_coastwatch_smos_3day_composite"),
            "earth.oceans.sea_level": ("noaacwBLENDEDsshDaily", "noaa_coastwatch_nrt_sla"),
            "earth.oceans.wave_height": (None, "noaa_ncep_gfs_wave"),
            "earth.oceans.chlorophyll": ("erdMH1chla8day_R2022NRT", "nasa_aqua_modis_chlorophyll_8day"),
        }
        for dataset_id, (source_dataset, source_id) in expected.items():
            spec = ocean.DATASETS[dataset_id]
            if source_dataset is not None:
                self.assertEqual(spec["dataset_id"], source_dataset)
            self.assertEqual(spec["source_id"], source_id)
            self.assertEqual(bootstrap.CONFIG[dataset_id][0], "ocean_fixed")

    def test_4km_coordinate_roundoff_is_allowed_but_material_irregularity_is_rejected(self):
        index = np.arange(4320, dtype=np.float64)
        axis = 89.9791667 - index / 24.0 + np.sin(index) * 1e-5
        selector, selected = ocean_additional._axis_selector_with_4km_roundoff(axis, 3)
        with self.assertRaisesRegex(RuntimeError, "irregular"):
            ocean_fixed._axis_selector(axis, 3)
        self.assertEqual(selected.size, 1440)
        self.assertIn("):3:(", selector)

        materially_irregular = axis.copy()
        materially_irregular[3] += 0.001
        with self.assertRaisesRegex(RuntimeError, "irregular"):
            ocean_additional._axis_selector_with_4km_roundoff(materially_irregular, 3)

    def test_4km_selector_accepts_only_bounded_coordinate_serialization_noise(self):
        index = np.arange(8640, dtype=np.float64)
        axis = -179.9791667 + index / 24.0 + np.sin(index * 1.1) * 3e-5
        selector, selected = ocean_additional._axis_selector_with_4km_roundoff(axis, 3)
        self.assertEqual(selected.size, 2880)
        self.assertIn("):3:(", selector)

        materially_irregular = axis.copy()
        materially_irregular[300] += 0.001
        with self.assertRaisesRegex(RuntimeError, "irregular"):
            ocean_additional._axis_selector_with_4km_roundoff(materially_irregular, 3)

    def test_4km_request_uses_returned_netcdf_coordinates_after_tolerance_validation(self):
        lat = 89.9791667 - np.arange(1440, dtype=np.float32) * 0.125
        lon = -179.9791667 + np.arange(2880, dtype=np.float32) * 0.125
        dataset = xr.Dataset(
            coords={
                "latitude": ("latitude", lat + np.float32(2e-5)),
                "longitude": ("longitude", lon + np.float32(2e-5)),
            }
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "coordinates.nc"
            dataset.to_netcdf(path, engine="scipy")
            raw = path.read_bytes()
            original_open = xr.open_dataset

            def open_synthetic(*args, **kwargs):
                kwargs.pop("engine", None)
                return original_open(*args, engine="scipy", **kwargs)

            spec = dict(
                ocean.DATASETS["earth.oceans.ocean_colour"],
                source_id="nasa_aqua_modis_fluorescence_line_height",
            )
            with patch.object(
                ocean_additional, "_original_request_erddap",
                return_value=(raw, "https://example.invalid/source.nc", lat, lon),
            ), patch.object(ocean_additional.xr, "open_dataset", side_effect=open_synthetic):
                _, _, returned_lat, returned_lon = (
                    ocean_additional._request_erddap_with_4km_coordinate_validation(
                        spec, dt.datetime(2026, 11, 1, tzinfo=dt.timezone.utc), "nflh"
                    )
                )

        self.assertTrue(np.array_equal(returned_lat, lat + np.float32(2e-5)))
        self.assertTrue(np.array_equal(returned_lon, lon + np.float32(2e-5)))

    def test_months_since_time_units_decode_as_calendar_months(self):
        decoded = ocean_additional._decode_monthly_time_values(
            np.array([252, 253], dtype=np.int32),
            "months since 2005-01-01 00:00:00",
            "standard",
        )
        self.assertEqual(decoded[0].date(), dt.date(2026, 1, 1))
        self.assertEqual(decoded[1].date(), dt.date(2026, 2, 1))

    def test_ncei_heat_decoder_selects_latest_month_on_native_one_degree_grid(self):
        lat = -89.5 + np.arange(180, dtype=np.float32)
        lon = -179.5 + np.arange(360, dtype=np.float32)
        times = np.array(["2026-01-15", "2026-02-15"], dtype="datetime64[ns]")
        data = np.empty((2, 1, 180, 360), dtype=np.float32)
        data[0, 0, :, :] = 1.25
        data[1, 0, :, :] = 2.5
        dataset = xr.Dataset(
            {
                "h18_hc": (
                    ("time", "depth", "lat", "lon"),
                    data,
                    {"long_name": "Ocean heat content anomaly", "units": "10^18_joules"},
                )
            },
            coords={
                "time": times,
                "depth": [0.0],
                "lat": lat,
                "lon": lon,
            },
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "heat.nc"
            dataset.to_netcdf(path, engine="scipy")
            original_open = xr.open_dataset

            def open_synthetic(*args, **kwargs):
                kwargs.pop("engine", None)
                return original_open(*args, engine="scipy", **kwargs)

            with patch.object(ocean_additional.xr, "open_dataset", side_effect=open_synthetic):
                values, out_lat, out_lon, observed, variable_name = ocean_additional._decode_heat_file(
                    path, ocean.DATASETS["earth.oceans.ocean_heat"]
                )

        self.assertEqual(values.shape, (180, 360))
        self.assertEqual((out_lat.size, out_lon.size), (180, 360))
        self.assertAlmostEqual(float(values[0, 0]), 2.5)
        self.assertEqual(observed.date(), dt.date(2026, 2, 15))
        self.assertEqual(variable_name, "h18_hc")
        self.assertAlmostEqual(float(np.median(np.diff(out_lat))), 1.0)
        self.assertAlmostEqual(float(np.median(np.diff(out_lon))), 1.0)

    def test_ncei_heat_decoder_handles_source_months_since_units(self):
        lat = -89.5 + np.arange(180, dtype=np.float32)
        lon = -179.5 + np.arange(360, dtype=np.float32)
        data = np.empty((2, 1, 180, 360), dtype=np.float32)
        data[0, 0, :, :] = 1.0
        data[1, 0, :, :] = 2.0
        dataset = xr.Dataset(
            {
                "h18_hc": (
                    ("time", "depth", "lat", "lon"),
                    data,
                    {"long_name": "Ocean heat content anomaly", "units": "10^18_joules"},
                )
            },
            coords={
                "time": ("time", np.array([252, 253], dtype=np.int32), {
                    "units": "months since 2005-01-01 00:00:00",
                    "calendar": "standard",
                }),
                "depth": [0.0],
                "lat": lat,
                "lon": lon,
            },
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "heat_months.nc"
            dataset.to_netcdf(path, engine="scipy")
            original_open = xr.open_dataset

            def open_synthetic(*args, **kwargs):
                kwargs.pop("engine", None)
                return original_open(*args, engine="scipy", **kwargs)

            with patch.object(ocean_additional.xr, "open_dataset", side_effect=open_synthetic):
                values, out_lat, out_lon, observed, variable_name = ocean_additional._decode_heat_file(
                    path, ocean.DATASETS["earth.oceans.ocean_heat"]
                )

        self.assertEqual(values.shape, (180, 360))
        self.assertAlmostEqual(float(values[0, 0]), 2.0)
        self.assertEqual(observed.date(), dt.date(2026, 2, 1))
        self.assertEqual(variable_name, "h18_hc")



if __name__ == "__main__":
    unittest.main()
