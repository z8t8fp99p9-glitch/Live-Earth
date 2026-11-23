from __future__ import annotations

import unittest
import numpy as np
from Data.Universal.engine.adapters import ocean, ocean_fixed
from Data.Universal.engine import bootstrap


class VerifiedOceanCompositeSourceTests(unittest.TestCase):
    def test_verified_sst_source_and_renderer_contract(self):
        spec = ocean.DATASETS["earth.oceans.sea_temperature"]
        self.assertEqual(spec["base"], "https://upwell.pfeg.noaa.gov/erddap")
        self.assertEqual(spec["dataset_id"], "ncdcOisst21Agg_LonPM180")
        self.assertEqual(spec["variables"], ("sst",))
        self.assertEqual(spec["extra_dims"], ("zlev",))
        self.assertEqual((spec["units"], spec["stride"]), ("degree_C", 1))

    def test_verified_noaa_smos_three_day_source_and_grid(self):
        spec = ocean.DATASETS["earth.oceans.salinity"]
        self.assertEqual(spec["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(spec["dataset_id"], "coastwatchSMOSv662SSS3day")
        self.assertEqual(spec["variables"], ("sss",))
        self.assertEqual(spec["extra_dims"], ("altitude",))
        self.assertEqual(spec["cadence"], "3-day")
        lat = -89.875 + np.arange(720, dtype=float) * 0.25
        lon = -179.875 + np.arange(1440, dtype=float) * 0.25
        lat_selector, sampled_lat = ocean_fixed._axis_selector(lat, spec["stride"])
        lon_selector, sampled_lon = ocean_fixed._axis_selector(lon, spec["stride"])
        self.assertEqual((sampled_lon.size, sampled_lat.size), (1440, 720))
        self.assertIn("):1:(", lat_selector)
        self.assertIn("):1:(", lon_selector)

    def test_verified_aqua_modis_eight_day_source_and_grid(self):
        spec = ocean.DATASETS["earth.oceans.chlorophyll"]
        self.assertEqual(spec["base"], "https://coastwatch.pfeg.noaa.gov/erddap")
        self.assertEqual(spec["dataset_id"], "erdMH1chla8day_R2022NRT")
        self.assertEqual(spec["variables"], ("chlorophyll",))
        self.assertEqual(spec["expected_native_spacing_degrees"], 1 / 24)
        self.assertEqual(spec["aggregation_factor"], 3)
        self.assertEqual(spec["cadence"], "8-day")
        lat = 89.9791667 - np.arange(4320, dtype=float) / 24.0
        lon = -179.9791667 + np.arange(8640, dtype=float) / 24.0
        lat_selector, sampled_lat = ocean_fixed._axis_selector(lat, 1)
        lon_selector, sampled_lon = ocean_fixed._axis_selector(lon, 1)
        self.assertEqual((sampled_lon.size, sampled_lat.size), (8640, 4320))
        self.assertIn("):1:(", lat_selector)
        self.assertIn("):1:(", lon_selector)

    def test_bootstrap_source_ids_and_cadences_match_adapter_specs(self):
        for dataset_id in (
            "earth.oceans.sea_temperature", "earth.oceans.salinity",
            "earth.oceans.chlorophyll",
        ):
            adapter, source_id, cadence = bootstrap.CONFIG[dataset_id]
            self.assertEqual(adapter, "ocean_fixed")
            self.assertEqual(source_id, ocean.DATASETS[dataset_id]["source_id"])
            self.assertEqual(cadence, ocean.DATASETS[dataset_id]["cadence"])

    def test_other_ocean_specs_are_unchanged(self):
        self.assertEqual(ocean.DATASETS["earth.oceans.ocean_currents"]["dataset_id"], "noaacwBLENDEDNRTcurrentsDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.sea_level"]["dataset_id"], "noaacwBLENDEDsshDaily")
        self.assertEqual(ocean.DATASETS["earth.oceans.wave_height"]["kind"], "gfswave")


if __name__ == "__main__":
    unittest.main()
