from __future__ import annotations
import unittest
import numpy as np
from Data.Universal.engine.adapters import ocean, ocean_fixed
from Data.Universal.engine import bootstrap

class VerifiedOceanSourceRestoreTests(unittest.TestCase):
    def test_verified_sst_source_and_renderer_contract(self):
        spec = ocean.DATASETS["earth.oceans.sea_temperature"]
        self.assertEqual(spec["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(spec["dataset_id"], "ncdcOisst21Agg_LonPM180")
        self.assertEqual(spec["variables"], ("sst",))
        self.assertEqual(spec["extra_dims"], ("zlev",))
        self.assertEqual((spec["units"], spec["stride"]), ("degree_C", 1))
    def test_verified_aqua_modis_source_and_renderer_contract(self):
        spec = ocean.DATASETS["earth.oceans.chlorophyll"]
        self.assertEqual(spec["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(spec["dataset_id"], "erdMH1chla1day_R2022NRT")
        self.assertEqual(spec["variables"], ("chlorophyll",))
        self.assertEqual(spec["expected_native_spacing_degrees"], 1/24)
        self.assertEqual(spec["stride"], 3)
        lat = np.arange(4320, dtype=float) / 24.0
        lon = np.arange(8640, dtype=float) / 24.0
        lat_selector, sampled_lat = ocean_fixed._axis_selector(lat, spec["stride"])
        lon_selector, sampled_lon = ocean_fixed._axis_selector(lon, spec["stride"])
        self.assertEqual((sampled_lon.size, sampled_lat.size), (2880, 1440))
        self.assertIn("):0.125:(", lat_selector)
        self.assertIn("):0.125:(", lon_selector)
    def test_bootstrap_source_ids_match_adapter_specs(self):
        for dataset_id in ("earth.oceans.sea_temperature", "earth.oceans.chlorophyll"):
            adapter, source_id, cadence = bootstrap.CONFIG[dataset_id]
            self.assertEqual(adapter, "ocean_fixed")
            self.assertEqual(source_id, ocean.DATASETS[dataset_id]["source_id"])
            self.assertEqual(cadence, "daily")
    def test_other_ocean_specs_are_not_changed_by_restore(self):
        self.assertEqual(ocean.DATASETS["earth.oceans.ocean_currents"]["dataset_id"], "noaacwBLENDEDNRTcurrentsDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.sea_level"]["dataset_id"], "noaacwBLENDEDsshDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.salinity"]["dataset_id"], "noaacwSMOSsssDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.wave_height"]["kind"], "gfswave")

if __name__ == "__main__":
    unittest.main()
