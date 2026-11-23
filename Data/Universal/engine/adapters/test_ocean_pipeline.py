from __future__ import annotations

import gzip
import hashlib
import unittest

import numpy as np
from Data.Universal.engine.adapters import ocean, ocean_fixed
from Data.Universal.engine import bootstrap


class OceanPipelineContractTests(unittest.TestCase):
    def test_bootstrap_routes_all_ocean_fields_to_corrected_adapter(self):
        ocean_ids = {key for key in bootstrap.CONFIG if key.startswith("earth.oceans.")}
        self.assertEqual(ocean_ids, set(ocean.DATASETS))
        for dataset_id in ocean_ids:
            adapter, source_id, cadence = bootstrap.CONFIG[dataset_id]
            self.assertEqual(adapter, "ocean_fixed")
            self.assertEqual(source_id, ocean.DATASETS[dataset_id]["source_id"])
            self.assertEqual(cadence, ocean.DATASETS[dataset_id]["cadence"])

    def test_noaa_sst_uses_verified_upwell_mirror(self):
        sst = ocean.DATASETS["earth.oceans.sea_temperature"]
        self.assertEqual(sst["base"], "https://upwell.pfeg.noaa.gov/erddap")
        self.assertEqual(sst["dataset_id"], "ncdcOisst21Agg_LonPM180")
        self.assertEqual(sst["variables"], ("sst",))
        self.assertEqual(sst["extra_dims"], ("zlev",))

    def test_salinity_uses_noaa_three_day_mean_source(self):
        sal = ocean.DATASETS["earth.oceans.salinity"]
        self.assertEqual(sal["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(sal["dataset_id"], "coastwatchSMOSv662SSS3day")
        self.assertEqual(sal["variables"], ("sss",))
        self.assertEqual(sal["source_id"], "noaa_coastwatch_smos_3day_composite")
        self.assertEqual(sal["cadence"], "3-day")
        self.assertEqual(sal["stride"], 1)

    def test_chlorophyll_uses_nasa_aqua_modis_eight_day_composite(self):
        chl = ocean.DATASETS["earth.oceans.chlorophyll"]
        self.assertEqual(chl["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(chl["dataset_id"], "erdMH1chla8day_R2022NRT")
        self.assertEqual(chl["variables"], ("chlorophyll",))
        self.assertEqual(chl["source_id"], "nasa_aqua_modis_chlorophyll_8day")
        self.assertEqual(chl["cadence"], "8-day")
        self.assertEqual(chl["aggregation_factor"], 3)
        self.assertAlmostEqual(chl["expected_native_spacing_degrees"], 1 / 24)

    def test_all_six_ocean_layers_remain_configured(self):
        expected = {
            "earth.oceans.sea_temperature", "earth.oceans.ocean_currents",
            "earth.oceans.sea_level", "earth.oceans.salinity",
            "earth.oceans.wave_height", "earth.oceans.chlorophyll",
        }
        self.assertEqual(set(ocean.DATASETS), expected)

    def test_salinity_keeps_existing_720_by_1440_global_target(self):
        sal = ocean.DATASETS["earth.oceans.salinity"]
        lat = -89.875 + np.arange(720, dtype=float) * 0.25
        lon = -179.875 + np.arange(1440, dtype=float) * 0.25
        _, selected_lat = ocean_fixed._axis_selector(lat, sal["stride"])
        _, selected_lon = ocean_fixed._axis_selector(lon, sal["stride"])
        self.assertEqual((selected_lat.size, selected_lon.size), (720, 1440))

    def test_chlorophyll_aggregation_preserves_existing_1440_by_2880_target(self):
        spec = ocean.DATASETS["earth.oceans.chlorophyll"]
        lat_axis = 89.9791667 - np.arange(6, dtype=float) / 24.0
        lon_axis = -179.9791667 + np.arange(9, dtype=float) / 24.0
        values = np.ones((6, 9), dtype=float)
        _, native_lat = ocean_fixed._axis_selector(lat_axis, 1)
        _, native_lon = ocean_fixed._axis_selector(lon_axis, 1)
        reduced, lat, lon = ocean_fixed._aggregate_chlorophyll_3x3(values, native_lat, native_lon, spec)
        self.assertEqual((lon.size, lat.size), (3, 2))
        self.assertEqual(reduced.shape, (2, 3))
        self.assertAlmostEqual(float(np.median(np.diff(lat))), -0.125, places=6)
        self.assertAlmostEqual(float(np.median(np.diff(lon))), 0.125, places=6)

    def test_other_ocean_sources_remain_unchanged(self):
        self.assertEqual(ocean.DATASETS["earth.oceans.ocean_currents"]["dataset_id"], "noaacwBLENDEDNRTcurrentsDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.sea_level"]["dataset_id"], "noaacwBLENDEDsshDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.wave_height"]["kind"], "gfswave")

    def test_packed_grid_storage_contract(self):
        spec = {"scale": 100, "valid_min": -3.0, "valid_max": 45.0}
        values = np.full((40, 40), 12.34, dtype=float)
        values[0, 1] = np.nan
        payload, raw, valid, count, total = ocean._pack(values, spec)
        self.assertEqual((count, total), (1599, 1600))
        unpacked = gzip.decompress(payload)
        self.assertEqual(len(unpacked), 40 * 40 * 2)
        self.assertEqual(hashlib.sha256(raw).hexdigest(), hashlib.sha256(unpacked).hexdigest())
        packed = np.frombuffer(unpacked, dtype="<i2").reshape(values.shape)
        self.assertEqual(int(packed[0, 0]), 1234)
        self.assertEqual(int(packed[0, 1]), -32768)


if __name__ == "__main__":
    unittest.main()
