from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REGISTRY=ROOT/"registry"/"datasets.json"
CONFIG={
 "earth.atmosphere.air_temperature":("native_sources","noaa_ncep_gfs","hourly"),
 "earth.oceans.sea_temperature":("native_sources","noaa_ncei_oisst","daily"),
 "earth.land.land_temperature":("native_sources","nasa_power_daily","daily"),
 "earth.water_ice.rainfall":("native_sources","nasa_power_daily","daily"),
 "earth.earth_activity.earthquakes":("native_sources","usgs_comcat","hourly"),
 "earth.energy_humanity.solar_radiation":("native_sources","nasa_power_daily","daily"),
}
def main():
 data=json.loads(REGISTRY.read_text(encoding="utf-8")); seen=set()
 for item in data["datasets"]:
  did=item["dataset_id"]; seen.add(did)
  if did in CONFIG:
   adapter,source,cadence=CONFIG[did]
   item["collection"]={"enabled":True,"adapter_id":adapter,"source_id":source,"cadence":cadence}
   item["status"]="collector_configured_pending_first_success"
   item["data_contract"]["units"]={
    "earth.atmosphere.air_temperature":"degree_Celsius",
    "earth.oceans.sea_temperature":"degree_C",
    "earth.land.land_temperature":"degree_C",
    "earth.water_ice.rainfall":"mm/day",
    "earth.earth_activity.earthquakes":"magnitude",
    "earth.energy_humanity.solar_radiation":"kWh/m^2/day",
   }[did]
   item["data_contract"]["spatial_coverage"]={
    "earth.atmosphere.air_temperature":"global_native_0.25_degree_grid",
    "earth.oceans.sea_temperature":"global_native_0.25_degree_grid",
    "earth.land.land_temperature":"six_sparse_regional_point_samples",
    "earth.water_ice.rainfall":"six_sparse_regional_point_samples",
    "earth.earth_activity.earthquakes":"USGS_all_day_event_feed",
    "earth.energy_humanity.solar_radiation":"six_sparse_regional_point_samples",
   }[did]
   item["data_contract"]["temporal_resolution"]="source_native"
  else:
   item["collection"]={"enabled":False,"adapter_id":None,"source_id":None,"cadence":None}
 if set(CONFIG)-seen:raise RuntimeError("Registry missing configured IDs: "+", ".join(sorted(set(CONFIG)-seen)))
 REGISTRY.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
 print("UNIVERSAL_REGISTRY_READY enabled=6 disabled="+str(len(data["datasets"])-6))
if __name__=="__main__":main()
