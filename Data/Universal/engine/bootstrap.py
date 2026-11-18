from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REGISTRY=ROOT/"registry"/"datasets.json"
CONFIG={
 "earth.atmosphere.air_temperature":("atmosphere_gfs","noaa_ncep_gfs_025","6-hourly"),
 "earth.atmosphere.atmospheric_pressure":("atmosphere_gfs","noaa_ncep_gfs_025","6-hourly"),
 "earth.atmosphere.wind_speed":("atmosphere_gfs","noaa_ncep_gfs_025","6-hourly"),
 "earth.atmosphere.wind_direction":("atmosphere_gfs","noaa_ncep_gfs_025","6-hourly"),
 "earth.atmosphere.humidity":("atmosphere_gfs","noaa_ncep_gfs_025","6-hourly"),
 "earth.oceans.sea_temperature":("native_sources","noaa_ncei_oisst","daily"),
 "earth.land.land_temperature":("native_sources","nasa_power_daily","daily"),
 "earth.water_ice.rainfall":("native_sources","nasa_power_daily","daily"),
 "earth.earth_activity.earthquakes":("native_sources","usgs_comcat","hourly"),
 "earth.energy_humanity.solar_radiation":("native_sources","nasa_power_daily","daily"),
}
CONTRACTS={
 "earth.atmosphere.air_temperature":("degree_Celsius","global_native_0.25_degree_grid"),
 "earth.atmosphere.atmospheric_pressure":("kilopascal","global_native_0.25_degree_grid_mean_sea_level"),
 "earth.atmosphere.wind_speed":("metre_per_second","global_native_0.25_degree_grid_10m_derived_from_UGRD_VGRD"),
 "earth.atmosphere.wind_direction":("degree","global_native_0.25_degree_grid_10m_meteorological_from_direction"),
 "earth.atmosphere.humidity":("percent","global_native_0.25_degree_grid_2m_relative_humidity"),
 "earth.oceans.sea_temperature":("degree_C","global_native_0.25_degree_grid"),
 "earth.land.land_temperature":("degree_C","six_sparse_regional_point_samples"),
 "earth.water_ice.rainfall":("mm/day","six_sparse_regional_point_samples"),
 "earth.earth_activity.earthquakes":("magnitude","USGS_all_day_event_feed"),
 "earth.energy_humanity.solar_radiation":("kWh/m^2/day","six_sparse_regional_point_samples"),
}
def main():
 data=json.loads(REGISTRY.read_text(encoding="utf-8")); seen=set()
 for item in data["datasets"]:
  did=item["dataset_id"]; seen.add(did)
  if did in CONFIG:
   adapter,source,cadence=CONFIG[did]
   item["collection"]={"enabled":True,"adapter_id":adapter,"source_id":source,"cadence":cadence}
   item["status"]="collector_configured_pending_first_success"
   if did in CONTRACTS:
    item["data_contract"]["units"],item["data_contract"]["spatial_coverage"]=CONTRACTS[did]
    item["data_contract"]["temporal_resolution"]="six_hourly_gfs_analysis_cycle"
  else:
   item["collection"]={"enabled":False,"adapter_id":None,"source_id":None,"cadence":None}
 if set(CONFIG)-seen:raise RuntimeError("Registry missing configured IDs: "+", ".join(sorted(set(CONFIG)-seen)))
 REGISTRY.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
 enabled=sum(1 for d in data["datasets"] if d.get("collection",{}).get("enabled"))
 print("UNIVERSAL_REGISTRY_READY enabled="+str(enabled)+" disabled="+str(len(data["datasets"])-enabled))
if __name__=="__main__":main()
