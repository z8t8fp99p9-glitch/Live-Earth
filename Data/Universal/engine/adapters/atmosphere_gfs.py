from __future__ import annotations
import datetime as dt
import gzip
import json
import os
import tempfile
import time
from pathlib import Path
from urllib.parse import urlencode

import numpy as np
import requests
import xarray as xr

UTC=dt.timezone.utc
REPO_ROOT=Path(__file__).resolve().parents[4]
DB_ROOT=REPO_ROOT/"Data"/"Central-Database"
SESSION=requests.Session()
SESSION.headers.update({"User-Agent":"LIVE-EARTH-Universal-Collector/1.0 (open-data visualization)"})
MAX_GRIB_BYTES=80*1024*1024
MAX_COMPRESSED_BYTES=12*1024*1024
_ACTIVE_CYCLE=None
_GRID_CACHE={}
_REFERENCE_COORDS=None

DATASETS={
 "earth.atmosphere.air_temperature": {"name":"air_temperature","variable":"TMP","level":"2_m_above_ground","filter":{"typeOfLevel":"heightAboveGround","level":2},"units":"degree_Celsius","scale":100,"description":"2 m air temperature","transform":"kelvin_to_celsius"},
 "earth.atmosphere.atmospheric_pressure": {"name":"atmospheric_pressure","variable":"PRMSL","level":"mean_sea_level","filter":{"typeOfLevel":"meanSea"},"units":"kilopascal","scale":100,"description":"Mean sea-level pressure","transform":"pa_to_kilopascal"},
 "earth.atmosphere.wind_speed": {"name":"wind_speed","units":"metre_per_second","scale":100,"description":"10 m wind speed derived from NOAA UGRD and VGRD"},
 "earth.atmosphere.wind_direction": {"name":"wind_direction","units":"degree","scale":50,"description":"10 m meteorological wind direction FROM north, derived from NOAA UGRD and VGRD"},
 "earth.atmosphere.humidity": {"name":"humidity","variable":"RH","level":"2_m_above_ground","filter":{"typeOfLevel":"heightAboveGround","level":2},"units":"percent","scale":100,"description":"2 m relative humidity","transform":"identity"},
}

def _iso(value):
 return value.astimezone(UTC).isoformat().replace("+00:00","Z")

def latest_cycle(now=None):
 now=now or dt.datetime.now(UTC)
 for back in range(0,4):
  day=now.date()-dt.timedelta(days=back)
  for hour in (18,12,6,0):
   cycle=dt.datetime.combine(day,dt.time(hour),tzinfo=UTC)
   if cycle <= now-dt.timedelta(hours=4): return cycle
 return None

def _cycle():
 global _ACTIVE_CYCLE
 if _ACTIVE_CYCLE is None:
  _ACTIVE_CYCLE=latest_cycle()
 if _ACTIVE_CYCLE is None: raise RuntimeError("No complete GFS analysis cycle is old enough to collect")
 return _ACTIVE_CYCLE

def is_due(dataset):
 """Avoid re-collecting the same six-hourly analysis on hourly workflow checks."""
 cycle=latest_cycle()
 if cycle is None: return True
 dataset_id=dataset["dataset_id"]
 folder=DB_ROOT/"normalized"/dataset_id/cycle.strftime("%Y-%m-%d")
 if not folder.exists(): return True
 target=_iso(cycle)
 for file in folder.glob("*.jsonl"):
  try:
   for line in file.read_text(encoding="utf-8").splitlines():
    if line.strip() and json.loads(line).get("observed_at")==target:
     return False
  except (OSError,ValueError,json.JSONDecodeError):
   continue
 return True

def _request(variable,level,cycle):
 ymd,hh=cycle.strftime("%Y%m%d"),cycle.strftime("%H")
 filename=f"gfs.t{hh}z.pgrb2.0p25.f000"
 params={"file":filename,f"var_{variable}":"on",f"lev_{level}":"on",
  "subregion":"","leftlon":"0","rightlon":"359.75","toplat":"90","bottomlat":"-90",
  "dir":f"/gfs.{ymd}/{hh}/atmos"}
 url="https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?"+urlencode(params)
 last=None
 for attempt in range(3):
  try:
   response=SESSION.get(url,timeout=(20,240))
   if response.status_code==429 or response.status_code>=500:
    last=RuntimeError(f"NOAA GFS HTTP {response.status_code}")
    if attempt<2: time.sleep(2**attempt); continue
   response.raise_for_status()
   payload=response.content
   if not payload.startswith(b"GRIB") or len(payload)<1000 or len(payload)>MAX_GRIB_BYTES:
    raise RuntimeError(f"NOAA returned an invalid or unexpected GRIB2 payload ({len(payload)} bytes)")
   return payload,response.url,filename
  except (requests.Timeout,requests.ConnectionError,requests.HTTPError) as exc:
   last=exc
   if attempt<2: time.sleep(2**attempt)
 raise RuntimeError(f"NOAA GFS request failed for {variable}/{level}: {last}")

def _decode(variable,level,filter_keys,cycle):
 key=(cycle.isoformat(),variable,level)
 if key in _GRID_CACHE: return _GRID_CACHE[key]
 grib,url,filename=_request(variable,level,cycle)
 fd,path=tempfile.mkstemp(suffix=".grib2")
 try:
  with os.fdopen(fd,"wb") as stream: stream.write(grib)
  ds=xr.open_dataset(path,engine="cfgrib",backend_kwargs={"filter_by_keys":filter_keys,"indexpath":""})
  try:
   if not ds.data_vars: raise RuntimeError(f"No {variable} field decoded from NOAA GRIB2")
   var_name=next(iter(ds.data_vars))
   values=np.asarray(ds[var_name].values,dtype=np.float64).squeeze()
   lat=np.asarray(ds.latitude.values,dtype=np.float64).squeeze()
   lon=np.asarray(ds.longitude.values,dtype=np.float64).squeeze()
   if values.ndim!=2 or values.shape!=(lat.size,lon.size):
    raise RuntimeError(f"Unexpected {variable} grid shape {values.shape}; coordinates {lat.size}x{lon.size}")
   if lat.size!=721 or lon.size!=1440:
    raise RuntimeError(f"{variable} is not the expected native 1440x721 GFS 0.25-degree grid")
   if not np.isfinite(values).all(): raise RuntimeError(f"{variable} contains non-finite grid cells")
   if abs(abs(float(np.median(np.diff(lat))))-0.25)>1e-5 or abs(abs(float(np.median(np.diff(lon))))-0.25)>1e-5:
    raise RuntimeError(f"{variable} coordinate spacing is not 0.25 degrees")
   global _REFERENCE_COORDS
   if _REFERENCE_COORDS is None: _REFERENCE_COORDS=(lat.copy(),lon.copy())
   elif not(np.array_equal(lat,_REFERENCE_COORDS[0]) and np.array_equal(lon,_REFERENCE_COORDS[1])):
    raise RuntimeError(f"{variable} coordinates differ from the Atmosphere reference grid")
   result={"values":values,"lat":lat,"lon":lon,"url":url,"filename":filename,"variable":var_name,"grib_bytes":len(grib)}
   _GRID_CACHE[key]=result
   return result
  finally: ds.close()
 finally:
  try: os.unlink(path)
  except FileNotFoundError: pass

def _field(dataset_id,cycle):
 spec=DATASETS[dataset_id]
 if dataset_id=="earth.atmosphere.wind_speed" or dataset_id=="earth.atmosphere.wind_direction":
  u=_decode("UGRD","10_m_above_ground",{"typeOfLevel":"heightAboveGround","level":10},cycle)
  v=_decode("VGRD","10_m_above_ground",{"typeOfLevel":"heightAboveGround","level":10},cycle)
  if not(np.array_equal(u["lat"],v["lat"]) and np.array_equal(u["lon"],v["lon"])):
   raise RuntimeError("NOAA UGRD and VGRD coordinates do not match")
  if dataset_id.endswith("wind_speed"):
   values=np.hypot(u["values"],v["values"])
  else:
   # Meteorological direction FROM which the wind blows, clockwise from true north.
   values=(270.0-np.degrees(np.arctan2(v["values"],u["values"])))%360.0
  return values,u["lat"],u["lon"],[u["url"],v["url"]],u["filename"],"UGRD+VGRD",[u["variable"],v["variable"]]
 source=_decode(spec["variable"],spec["level"],spec["filter"],cycle)
 raw=source["values"]
 if spec["transform"]=="kelvin_to_celsius": values=raw-273.15
 elif spec["transform"]=="pa_to_kilopascal": values=raw/1000.0
 else: values=raw
 return values,source["lat"],source["lon"],[source["url"]],source["filename"],spec["variable"],[source["variable"]]

def collect(dataset):
 dataset_id=dataset["dataset_id"]
 if dataset_id not in DATASETS: raise ValueError(f"No NOAA GFS Atmosphere adapter for {dataset_id}")
 cycle=_cycle(); retrieved=dt.datetime.now(UTC); retrieved_text=_iso(retrieved)
 spec=DATASETS[dataset_id]
 values,lat,lon,urls,filename,source_variable,decoded_names=_field(dataset_id,cycle)
 if not np.isfinite(values).all(): raise RuntimeError(f"Derived {dataset_id} grid contains non-finite values")
 scale=int(spec["scale"])
 packed_values=np.rint(values*scale)
 if packed_values.min()<-32768 or packed_values.max()>32767:
  raise RuntimeError(f"{dataset_id} values exceed the signed int16 encoding range at scale {scale}")
 packed=packed_values.astype("<i2")
 raw=packed.tobytes(order="C")
 compressed=gzip.compress(raw,compresslevel=9,mtime=0)
 if len(compressed)>MAX_COMPRESSED_BYTES: raise RuntimeError(f"{dataset_id} compressed grid exceeds {MAX_COMPRESSED_BYTES} bytes")
 lat_step=float(np.median(np.diff(lat))); lon_step=float(np.median(np.diff(lon)))
 units=spec["units"]
 metadata={
  "schema_version":1,"world":"atmosphere","dataset_id":dataset_id,"dataset":spec["name"],
  "description":spec["description"],"grid_id":"GRID_NOAA_GFS_025_V1",
  "provider":"NOAA NCEP","product":"Global Forecast System (GFS) 0.25 degree analysis",
  "source_file":filename,"source_url":urls[0],"source_urls":urls,
  "source_cycle_utc":_iso(cycle),"forecast_hour":0,"valid_time_utc":_iso(cycle),
  "retrieved_at_utc":retrieved_text,"variable":source_variable,"decoded_variables":decoded_names,
  "units":units,"encoding":f"little-endian signed int16; value = stored_integer / {scale}",
  "scale_factor":scale,"nodata":None,"width":int(lon.size),"height":int(lat.size),
  "coordinate_order":"latitude-longitude",
  "row_order":"north-to-south" if lat_step<0 else "south-to-north",
  "latitude_first":float(lat[0]),"latitude_step":lat_step,
  "longitude_first":float(lon[0]),"longitude_step":lon_step,"longitude_convention":"0..360",
  "sha256_uncompressed_values":__import__("hashlib").sha256(raw).hexdigest(),
  "compressed_bytes":len(compressed),"source_attribution":"NOAA National Centers for Environmental Prediction (NCEP)",
  "licence":"U.S. Government work; verify applicable NOAA/NCEP data-use terms before redistribution",
  "quality_status":"downloaded_and_grid_validated",
  "note":"GFS model analysis, not direct instrument observations. Wind speed and direction are derived from the native 10 m U/V components." if "wind_" in dataset_id else "GFS model analysis field, not direct instrument observations."
 }
 row={"dataset_id":dataset_id,"source_id":"noaa_ncep_gfs_025","observed_at":_iso(cycle),
  "retrieved_at":retrieved_text,"value":None,"unit":units,
  "dimensions":{"width":int(lon.size),"height":int(lat.size)},
  "geometry":{"type":"global_regular_grid","metadata":metadata},
  "quality":{"status":"downloaded_and_grid_validated","grid_id":"GRID_NOAA_GFS_025_V1"},
  "provenance":{"source_url":urls[0],"source_urls":urls,"source_variables":decoded_names}}
 return {"raw_payload":compressed,"raw_metadata":metadata,"observations":[row]}
