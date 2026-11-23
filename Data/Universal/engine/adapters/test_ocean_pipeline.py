from __future__ import annotations
import gzip, hashlib, unittest
from unittest.mock import Mock, patch
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

    def test_verified_public_noaa_sources(self):
        sst = ocean.DATASETS["earth.oceans.sea_temperature"]
        self.assertEqual(sst["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(sst["dataset_id"], "ncdcOisst21Agg_LonPM180")
        self.assertEqual(sst["variables"], ("sst",))
        self.assertEqual(sst["extra_dims"], ("zlev",))
        chl = ocean.DATASETS["earth.oceans.chlorophyll"]
        self.assertEqual(chl["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(chl["dataset_id"], "erdMH1chla1day_R2022NRT")
        self.assertEqual(chl["variables"], ("chlorophyll",))
        self.assertEqual(chl["stride"], 3)
        self.assertAlmostEqual(chl["expected_native_spacing_degrees"], 1/24)

    def test_all_six_ocean_layers_remain_configured(self):
        expected = {
            "earth.oceans.sea_temperature", "earth.oceans.ocean_currents",
            "earth.oceans.sea_level", "earth.oceans.salinity",
            "earth.oceans.wave_height", "earth.oceans.chlorophyll",
        }
        self.assertEqual(set(ocean.DATASETS), expected)

    def test_chlorophyll_sampling_preserves_renderer_dimensions(self):
        spec = ocean.DATASETS["earth.oceans.chlorophyll"]
        lat_axis = np.arange(4320, dtype=float) / 24.0
        lon_axis = np.arange(8640, dtype=float) / 24.0
        lat_selector, lat = ocean_fixed._axis_selector(lat_axis, spec["stride"])
        lon_selector, lon = ocean_fixed._axis_selector(lon_axis, spec["stride"])
        self.assertEqual((lon.size, lat.size), (2880, 1440))
        self.assertIn("):0.125:(", lat_selector)
        self.assertIn("):0.125:(", lon_selector)

    def test_other_ocean_sources_remain_unchanged(self):
        self.assertEqual(ocean.DATASETS["earth.oceans.ocean_currents"]["dataset_id"], "noaacwBLENDEDNRTcurrentsDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.sea_level"]["dataset_id"], "noaacwBLENDEDsshDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.salinity"]["dataset_id"], "noaacwSMOSsssDaily")
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
