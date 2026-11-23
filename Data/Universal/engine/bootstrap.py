from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "registry" / "datasets.json"

CONFIG = {
    "earth.atmosphere.air_temperature": ("atmosphere_gfs", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.atmospheric_pressure": ("atmosphere_gfs", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.wind_speed": ("atmosphere_gfs", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.wind_direction": ("atmosphere_gfs", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.humidity": ("atmosphere_gfs", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.water_vapour": ("atmosphere_composition", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.cloud_properties": ("atmosphere_composition", "noaa_ncep_gfs_025", "6-hourly"),
    "earth.atmosphere.ozone": ("atmosphere_composition", "noaa_ncep_gfs_025", "6-hourly"),

    # Latest anonymous NASA GEOS-CF v2 current-value fields.
    "earth.atmosphere.co2_concentration": ("nasa_geos_cf", "nasa_geos_cf_v2", "3-hourly"),
    "earth.atmosphere.methane": ("nasa_geos_cf", "nasa_geos_cf_v2", "3-hourly"),
    "earth.atmosphere.carbon_monoxide": ("nasa_geos_cf", "nasa_geos_cf_v2", "hourly"),
    "earth.atmosphere.aerosols_dust": ("nasa_geos_cf", "nasa_geos_cf_v2", "hourly"),

    "earth.oceans.sea_temperature": ("native_sources", "noaa_ncei_oisst", "daily"),
    "earth.land.land_temperature": ("native_sources", "nasa_power_daily", "daily"),
    "earth.water_ice.rainfall": ("native_sources", "nasa_power_daily", "daily"),
    "earth.earth_activity.earthquakes": ("native_sources", "usgs_comcat", "hourly"),
    "earth.energy_humanity.solar_radiation": ("native_sources", "nasa_power_daily", "daily"),
}

CONTRACTS = {
    "earth.atmosphere.air_temperature": ("degree_Celsius", "global_native_0.25_degree_grid"),
    "earth.atmosphere.atmospheric_pressure": ("kilopascal", "global_native_0.25_degree_grid_mean_sea_level"),
    "earth.atmosphere.wind_speed": ("metre_per_second", "global_native_0.25_degree_grid_10m_derived_from_UGRD_VGRD"),
    "earth.atmosphere.wind_direction": ("degree", "global_native_0.25_degree_grid_10m_meteorological_from_direction"),
    "earth.atmosphere.humidity": ("percent", "global_native_0.25_degree_grid_2m_relative_humidity"),
    "earth.atmosphere.water_vapour": ("kg/m^2", "global_native_0.25_degree_grid_total_column_precipitable_water_GFS_model"),
    "earth.atmosphere.cloud_properties": ("percent", "global_native_0.25_degree_grid_total_cloud_cover_GFS_model"),
    "earth.atmosphere.ozone": ("Dobson_unit", "global_native_0.25_degree_grid_total_column_ozone_GFS_model"),
    "earth.atmosphere.co2_concentration": ("ppm", "global_native_0.25_degree_grid_column_average_dry_air_mole_fraction_GEOS_CF"),
    "earth.atmosphere.methane": ("ppb", "global_native_0.25_degree_grid_column_average_dry_air_mole_fraction_GEOS_CF"),
    "earth.atmosphere.carbon_monoxide": ("ppb", "global_native_0.25_degree_grid_surface_dry_air_mole_fraction_GEOS_CF"),
    "earth.atmosphere.aerosols_dust": ("ug/m^3", "global_native_0.25_degree_grid_dust_contribution_to_PM25_at_RH35_GEOS_CF"),
    "earth.oceans.sea_temperature": ("degree_C", "global_native_0.25_degree_grid"),
    "earth.land.land_temperature": ("degree_C", "six_sparse_regional_point_samples"),
    "earth.water_ice.rainfall": ("mm/day", "six_sparse_regional_point_samples"),
    "earth.earth_activity.earthquakes": ("magnitude", "USGS_all_day_event_feed"),
    "earth.energy_humanity.solar_radiation": ("kWh/m^2/day", "six_sparse_regional_point_samples"),
}

CADENCE_RESOLUTION = {
    "hourly": "hourly_source_forecast_valid_time",
    "3-hourly": "three_hourly_source_forecast_valid_time",
    "6-hourly": "six_hourly_gfs_forecast_cycle",
    "daily": "daily_source_observation",
}
SUCCESS_STATES = {"collector_configured_success", "collector_configured_failed"}


def main():
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    seen = set()
    for item in data["datasets"]:
        dataset_id = item["dataset_id"]
        seen.add(dataset_id)
        if dataset_id not in CONFIG:
            item["collection"] = {"enabled": False, "adapter_id": None, "source_id": None, "cadence": None}
            if dataset_id in {
                "earth.atmosphere.co2_concentration", "earth.atmosphere.methane",
                "earth.atmosphere.carbon_monoxide", "earth.atmosphere.aerosols_dust",
            }:
                item["status"] = "source_not_configured"
            continue
        adapter, source, cadence = CONFIG[dataset_id]
        item["collection"] = {"enabled": True, "adapter_id": adapter, "source_id": source, "cadence": cadence}
        if item.get("status") not in SUCCESS_STATES:
            item["status"] = "collector_configured_pending_first_success"
        if dataset_id in CONTRACTS:
            units, coverage = CONTRACTS[dataset_id]
            item.setdefault("data_contract", {})
            item["data_contract"]["units"] = units
            item["data_contract"]["spatial_coverage"] = coverage
            item["data_contract"]["temporal_resolution"] = CADENCE_RESOLUTION[cadence]
    missing = set(CONFIG) - seen
    if missing:
        raise RuntimeError("Registry missing configured IDs: " + ", ".join(sorted(missing)))
    REGISTRY.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    enabled = sum(1 for item in data["datasets"] if item.get("collection", {}).get("enabled"))
    print(f"UNIVERSAL_REGISTRY_READY enabled={enabled} disabled={len(data['datasets']) - enabled}")


if __name__ == "__main__":
    main()
