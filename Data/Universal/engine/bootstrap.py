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
    "earth.atmosphere.co2_concentration": ("nasa_geos_cf", "nasa_geos_cf_v2", "3-hourly"),
    "earth.atmosphere.methane": ("nasa_geos_cf", "nasa_geos_cf_v2", "3-hourly"),
    "earth.atmosphere.carbon_monoxide": ("nasa_geos_cf", "nasa_geos_cf_v2", "hourly"),
    "earth.atmosphere.aerosols_dust": ("nasa_geos_cf", "nasa_geos_cf_v2", "hourly"),
    "earth.oceans.sea_temperature": ("ocean_fixed", "noaa_ncei_oisst21", "daily"),
    "earth.oceans.ocean_currents": ("ocean_fixed", "noaa_coastwatch_nrt_currents", "daily"),
    "earth.oceans.sea_level": ("ocean_fixed", "noaa_coastwatch_nrt_sla", "daily"),
    "earth.oceans.salinity": ("ocean_fixed", "noaa_coastwatch_smos_3day_composite", "3-day"),
    "earth.oceans.wave_height": ("ocean_fixed", "noaa_ncep_gfs_wave", "6-hourly"),
    "earth.oceans.chlorophyll": ("ocean_fixed", "nasa_aqua_modis_chlorophyll_8day", "8-day"),
    "earth.oceans.ocean_colour": ("ocean_additional", "nasa_aqua_modis_fluorescence_line_height", "daily"),
    "earth.oceans.marine_productivity": ("ocean_additional", "noaa_coastwatch_viirs_noaa20_productivity_daily", "daily"),
    "earth.oceans.ocean_heat": ("ocean_additional", "noaa_ncei_ohc_0_2000_monthly", "monthly"),
    "earth.oceans.sea_ice": ("ocean_additional", "noaa_ncei_oisst21_sea_ice_fraction", "daily"),
    "earth.land.land_temperature": ("native_sources", "nasa_power_daily", "daily"),
    "earth.land.elevation": ("land_sources", "copernicus_dem_glo30", "static"),
    "earth.land.terrain": ("land_sources", "copernicus_dem_glo30", "static"),
    "earth.land.land_cover": ("land_sources", "esa_worldcover_2021_v200", "annual"),
    "earth.land.vegetation_health": ("land_sources", "noaa_cdr_viirs_ndvi_daily", "daily"),
    "earth.land.forest_change": ("land_sources", "hansen_global_forest_change_2025_v1_13", "annual"),
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
    "earth.oceans.ocean_currents": ("metre_per_second", "global_native_0.25_degree_grid_geostrophic_current_speed_from_ugos_vgos"),
    "earth.oceans.sea_level": ("m", "global_native_0.25_degree_grid_altimetric_sea_level_anomaly"),
    "earth.oceans.salinity": ("PSU", "global_native_0.25_degree_grid_smos_3day_mean_composite"),
    "earth.oceans.wave_height": ("m", "global_published_0.25_degree_grid_noaa_gfs_wavewatch_iii_significant_height"),
    "earth.oceans.chlorophyll": ("mg m-3", "global_0.125_degree_sampled_from_nasa_aqua_modis_8day_0.04167_degree_chlorophyll_grid"),
    "earth.oceans.ocean_colour": ("W m-2 um-1 sr-1", "global_0.125_degree_sampled_from_nasa_aqua_modis_4km_fluorescence_grid"),
    "earth.oceans.marine_productivity": ("mg C m-2 day-1", "global_0.125_degree_sampled_from_noaa_viirs_noaa20_4km_productivity_grid"),
    "earth.oceans.ocean_heat": ("10^18 J", "global_native_1_degree_monthly_0_2000m_heat_content_anomaly"),
    "earth.oceans.sea_ice": ("1", "global_native_0.25_degree_oisst21_sea_ice_area_fraction"),
    "earth.land.land_temperature": ("degree_C", "six_sparse_regional_point_samples"),
    "earth.land.elevation": ("m", "six_sparse_regional_point_samples_from_global_30m_Copernicus_GLO30_DSM"),
    "earth.land.terrain": ("degree", "six_sparse_regional_point_slope_samples_derived_from_Copernicus_GLO30_DSM"),
    "earth.land.land_cover": ("class_code", "six_sparse_regional_point_samples_from_global_10m_ESA_WorldCover_2021_v200"),
    "earth.land.vegetation_health": ("1", "six_sparse_regional_point_samples_from_NOAA_CDR_VIIRS_global_0.05_degree_NDVI"),
    "earth.land.forest_change": ("year", "six_sparse_regional_point_samples_from_global_30m_Hansen_GFC_2025_lossyear"),
    "earth.water_ice.rainfall": ("mm/day", "six_sparse_regional_point_samples"),
    "earth.earth_activity.earthquakes": ("magnitude", "USGS_all_day_event_feed"),
    "earth.energy_humanity.solar_radiation": ("kWh/m^2/day", "six_sparse_regional_point_samples"),
}
CADENCE_RESOLUTION = {
    "hourly": "hourly_source_forecast_valid_time",
    "3-hourly": "three_hourly_source_forecast_valid_time",
    "6-hourly": "six_hourly_gfs_forecast_cycle",
    "daily": "daily_source_observation",
    "3-day": "three_day_mean_source_composite",
    "8-day": "eight_day_centered_source_composite",
    "monthly": "monthly_source_analysis",
    "annual": "annual_source_product_epoch",
    "static": "static_reference_product",
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
        previous_adapter = item.get("collection", {}).get("adapter_id")
        item["collection"] = {"enabled": True, "adapter_id": adapter, "source_id": source, "cadence": cadence}
        if dataset_id.startswith("earth.oceans.") and previous_adapter not in {"ocean", "ocean_fixed", "ocean_additional"}:
            item["status"] = "collector_configured_pending_first_success"
        elif item.get("status") not in SUCCESS_STATES:
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
