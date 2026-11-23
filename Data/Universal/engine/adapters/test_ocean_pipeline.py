from __future__ import annotations

import gzip
import hashlib
import unittest
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

    def test_recovered_ocean_sources_use_current_noaa_public_distributions(self):
        sst = ocean.DATASETS["earth.oceans.sea_temperature"]
        self.assertEqual(sst["base"], "https://www.ncei.noaa.gov/erddap")
        self.assertEqual(sst["dataset_id"], "ncdc_oisst_v2_avhrr_by_time_zlev_lat_lon")
        self.assertEqual(sst["extra_dims"], ("depth",))
        salinity = ocean.DATASETS["earth.oceans.salinity"]
        self.assertEqual(salinity["base"], "https://polarwatch.noaa.gov/erddap")
        self.assertEqual(salinity["dataset_id"], "noaacwSMOSsssDaily")
        chlorophyll = ocean.DATASETS["earth.oceans.chlorophyll"]
        self.assertEqual(chlorophyll["base"], "https://coastwatch.noaa.gov/erddap")
        self.assertEqual(chlorophyll["dataset_id"], "noaacwN20N21DINEOF2kmDaily")
        self.assertEqual(chlorophyll["source_id"], "noaa_coastwatch_n20_n21_dineof_chlorophyll_2km")
        self.assertAlmostEqual(chlorophyll["expected_native_spacing_degrees"], 1 / 48)

    def test_all_six_layers_route_to_one_corrected_adapter(self):
        expected = {
            "earth.oceans.sea_temperature", "earth.oceans.ocean_currents",
            "earth.oceans.sea_level", "earth.oceans.salinity",
            "earth.oceans.wave_height", "earth.oceans.chlorophyll",
        }
        self.assertEqual(set(ocean.DATASETS), expected)

    def test_erddap_request_uses_integer_index_strides_and_coordinate_values(self):
        spec = dict(ocean.DATASETS["earth.oceans.sea_temperature"])
        lat = np.array([-89.875, -89.625, -89.375, -89.125], dtype=float)
        lon = np.array([-179.875, -179.625, -179.375, -179.125], dtype=float)
        response = Mock(content=b"CDF\x01", url="https://example.noaa.gov/grid.nc")
        with patch.object(ocean, "_axis_values", side_effect=[lat, lon]), patch.object(ocean, "_get", return_value=response):
            raw, url, requested_lat, requested_lon = ocean._request_erddap(
                spec, ocean.dt.datetime(2026, 11, 7, 12, tzinfo=ocean.UTC), "sst"
            )
        self.assertEqual(raw, b"CDF\x01")
        self.assertIn("sst[(2026-11-07T12:00:00Z)]", url)
        self.assertIn("[(-89.875):1:(-89.125)]", url)
        self.assertIn("[(-179.875):1:(-179.125)]", url)
        self.assertEqual(requested_lat.size, 4)
        self.assertEqual(requested_lon.size, 4)

    def test_ncei_latest_time_prefers_iso_time_coverage_end(self):
        spec = dict(ocean.DATASETS["earth.oceans.sea_temperature"])
        records = [
            {"Row Type": "attribute", "Variable Name": "NC_GLOBAL",
             "Attribute Name": "time_coverage_end", "Value": "2026-11-07T12:00:00Z"},
            {"Row Type": "attribute", "Variable Name": "time",
             "Attribute Name": "actual_range", "Value": "0, 1"},
        ]
        with patch.object(ocean, "_dataset_info", return_value=records):
            latest = ocean._latest_erddap_time(spec)
        self.assertEqual(latest, ocean.dt.datetime(2026, 11, 7, 12, tzinfo=ocean.UTC))

    def test_provider_variable_names_can_be_resolved_from_metadata(self):
        records = [
            {"Row Type": "variable", "Variable Name": "east_vel", "Attribute Name": "", "Value": ""},
            {"Row Type": "attribute", "Variable Name": "east_vel", "Attribute Name": "long_name", "Value": "Absolute Geostrophic Velocity: Zonal Component"},
            {"Row Type": "variable", "Variable Name": "north_vel", "Attribute Name": "", "Value": ""},
            {"Row Type": "attribute", "Variable Name": "north_vel", "Attribute Name": "long_name", "Value": "Absolute Geostrophic Velocity: Meridian Component"},
        ]
        spec = ocean.DATASETS["earth.oceans.ocean_currents"]
        with patch.object(ocean, "_dataset_info", return_value=records):
            self.assertEqual(ocean._resolve_variables(spec), ("east_vel", "north_vel"))

    def test_coordinate_selectors_use_values_and_integer_stride(self):
        ascending = np.array([-89.875, -89.625, -89.375, -89.125], dtype=float)
        selector, sampled = ocean_fixed._axis_selector(ascending, 1)
        self.assertEqual(selector, "[(-89.875):1:(-89.125)]")
        self.assertEqual(sampled.size, 4)
        descending = np.array([89.97916, 89.93749, 89.89582, 89.85415], dtype=float)
        selector, sampled = ocean_fixed._axis_selector(descending, 3)
        self.assertEqual(sampled.size, 2)
        self.assertLess(float(sampled[1]), float(sampled[0]))
        self.assertIn("):3:(", selector)

    def test_chlorophyll_stride_matches_existing_renderer_contract(self):
        source_lat = np.arange(4320, dtype=float)
        source_lon = np.arange(8640, dtype=float)
        _, lat = ocean_fixed._axis_selector(source_lat, 3)
        _, lon = ocean_fixed._axis_selector(source_lon, 3)
        self.assertEqual((lon.size, lat.size), (2880, 1440))

    def test_packed_grid_matches_browser_and_storage_contract(self):
        spec = {"scale": 100, "valid_min": -3.0, "valid_max": 45.0}
        values = np.full((40, 40), 12.34, dtype=float)
        values[0, 1] = np.nan
        values[1, 0] = -1.25
        values[1, 1] = 28.0
        payload, raw, valid, count, total = ocean._pack(values, spec)
        self.assertEqual((count, total), (1599, 1600))
        self.assertEqual(len(raw), values.size * 2)
        self.assertEqual(len(gzip.decompress(payload)), values.size * 2)
        packed = np.frombuffer(gzip.decompress(payload), dtype="<i2").reshape(values.shape)
        self.assertEqual(int(packed[0, 0]), 1234)
        self.assertEqual(int(packed[0, 1]), -32768)
        self.assertEqual(int(packed[1, 0]), -125)
        self.assertEqual(hashlib.sha256(raw).hexdigest(), hashlib.sha256(gzip.decompress(payload)).hexdigest())

    def test_result_emits_universal_grid_metadata(self):
        dataset = {"dataset_id": "earth.oceans.sea_level"}
        spec = dict(ocean.DATASETS["earth.oceans.sea_level"])
        values = np.full((40, 40), 0.12, dtype=float)
        lat = np.linspace(-4.875, 4.875, 40)
        lon = np.linspace(-4.875, 4.875, 40)
        result = ocean._result(
            dataset, spec, values, lat, lon,
            ocean.dt.datetime(2026, 11, 20, tzinfo=ocean.UTC),
            ["https://example.noaa.gov/current-grid.nc"],
        )
        meta = result["metadata"]
        for key in (
            "data_kind", "format", "width", "height", "coordinate_order", "row_order",
            "latitude_first", "latitude_step", "longitude_first", "longitude_step",
            "longitude_convention", "units", "encoding", "scale_factor",
            "nodata_value", "sha256_uncompressed_values", "valid_time_utc",
        ):
            self.assertIn(key, meta)
        self.assertEqual(meta["data_kind"], "grid")
        self.assertEqual((meta["width"], meta["height"]), (40, 40))
        self.assertEqual(len(result["observations"]), 1)
        row = result["observations"][0]
        self.assertEqual(row["dataset_id"], dataset["dataset_id"])
        self.assertIn("source_url", row["provenance"])
        self.assertEqual(len(gzip.decompress(result["value_payload"])), 40 * 40 * 2)

    def test_renderer_dimensions_and_units_are_preserved(self):
        expected = {
            "earth.oceans.sea_temperature": (1440, 720, "degree_C"),
            "earth.oceans.ocean_currents": (1440, 720, "metre_per_second"),
            "earth.oceans.sea_level": (1440, 720, "m"),
            "earth.oceans.salinity": (1440, 720, "PSU"),
            "earth.oceans.wave_height": (1440, 721, "m"),
            "earth.oceans.chlorophyll": (2880, 1440, "mg m-3"),
        }
        for dataset_id, (width, height, units) in expected.items():
            spec = ocean.DATASETS[dataset_id]
            self.assertEqual(spec["units"], units)
            if dataset_id == "earth.oceans.chlorophyll":
                self.assertEqual(((17280 - 1) // 6 + 1, (8640 - 1) // 6 + 1), (width, height))
            elif dataset_id == "earth.oceans.wave_height":
                self.assertEqual((width, height), (1440, 721))
            else:
                self.assertEqual((width, height), (1440, 720))


if __name__ == "__main__":
    unittest.main()
