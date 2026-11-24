from __future__ import annotations
import datetime as dt, gzip, hashlib, io, json, re, time
from pathlib import Path
import requests

UTC = dt.timezone.utc
SESSION = requests.Session()
SESSION.headers.update({"User-Agent":"LIVE-EARTH-Universal-Collector/1.0 (open-data visualization)"})
POWER_TILES = [
 {"id":"north_america","lat":40.0,"lon":-100.0},
 {"id":"south_america","lat":-15.0,"lon":-60.0},
 {"id":"europe_north_africa","lat":35.0,"lon":15.0},
 {"id":"east_africa","lat":0.0,"lon":35.0},
 {"id":"south_asia","lat":20.0,"lon":80.0},
 {"id":"east_asia_pacific","lat":25.0,"lon":125.0},
]
DATASETS = {
 "earth.atmosphere.air_temperature": ("gfs_grid", "NOAA/NCEP GFS 0.25 degree 2m air temperature", "degree_Celsius"),
 "earth.oceans.sea_temperature": ("oisst_grid", "NOAA/NCEI OISST v2.1 daily global sea surface temperature", "degree_C"),
 "earth.water_ice.rainfall": ("power_points", "NASA POWER daily corrected precipitation at six regional sample points", "mm/day"),
 "earth.earth_activity.earthquakes": ("usgs_events", "USGS all-day earthquake GeoJSON event feed", "magnitude"),
 "earth.energy_humanity.solar_radiation": ("power_points", "NASA POWER daily all-sky surface shortwave radiation at six regional sample points", "kWh/m^2/day"),
}
def _get(url, params=None, cap=40*1024*1024, attempts=3):
    error=None
    for n in range(attempts):
        try:
            r=SESSION.get(url,params=params,timeout=(20,180))
            if r.status_code==429 or 500<=r.status_code<600:
                error=RuntimeError(f"HTTP {r.status_code}: {r.url}")
                if n+1<attempts: time.sleep(2**n); continue
            r.raise_for_status()
            if not r.content or len(r.content)>cap: raise RuntimeError(f"Invalid response size: {len(r.content)}")
            return r
        except (requests.Timeout,requests.ConnectionError) as e:
            error=e
            if n+1<attempts: time.sleep(2**n)
    raise RuntimeError(f"Source request failed: {error}")
def _iso(value):
    return value.astimezone(UTC).isoformat().replace("+00:00","Z")
def _record(dataset,source,observed,retrieved,value,unit,url,**extra):
    return {"dataset_id":dataset,"source_id":source,"observed_at":observed,"retrieved_at":retrieved,
            "value":value,"unit":unit,"provenance":{"source_url":url},**extra}
def _gfs(dataset,retrieved):
    # Fetch the newest complete GFS f000 analysis from the NOMADS filter service.
    from urllib.parse import urlencode
    now=dt.datetime.now(UTC); cycles=[]
    for back in range(3):
        day=now.date()-dt.timedelta(days=back)
        for hour in (18,12,6,0):
            c=dt.datetime.combine(day,dt.time(hour),tzinfo=UTC)
            if c<=now-dt.timedelta(hours=4): cycles.append(c)
    last=None
    for cycle in cycles:
        ymd,hh=cycle.strftime("%Y%m%d"),cycle.strftime("%H")
        params={"file":f"gfs.t{hh}z.pgrb2.0p25.f000","var_TMP":"on","lev_2_m_above_ground":"on",
                "leftlon":"0","rightlon":"359.75","toplat":"90","bottomlat":"-90","dir":f"/gfs.{ymd}/{hh}/atmos"}
        url="https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?"+urlencode(params)
        try:
            grib=_get(url,cap=80*1024*1024).content
            if not grib.startswith(b"GRIB"): raise RuntimeError("NOAA did not return GRIB2")
            import numpy as np, xarray as xr, tempfile, os
            fd,name=tempfile.mkstemp(suffix=".grib2")
            try:
                with os.fdopen(fd,"wb") as f:f.write(grib)
                ds=xr.open_dataset(name,engine="cfgrib",backend_kwargs={"filter_by_keys":{"typeOfLevel":"heightAboveGround","level":2},"indexpath":""})
                try:
                    var="t2m" if "t2m" in ds.data_vars else next(iter(ds.data_vars))
                    vals=np.asarray(ds[var].values,dtype=np.float32).squeeze()
                    lat=np.asarray(ds.latitude.values); lon=np.asarray(ds.longitude.values)
                    if vals.ndim!=2 or vals.shape!=(lat.size,lon.size) or not np.isfinite(vals).all(): raise RuntimeError("Invalid GFS grid")
                    packed=np.rint((vals-273.15)*100).astype("<i2")
                    raw=gzip.compress(packed.tobytes(order="C"),compresslevel=9,mtime=0)
                    uncompressed=packed.tobytes(order="C")
                    meta={"data_kind":"grid","format":"gzip+int16-le-centi-celsius","width":int(lon.size),"height":int(lat.size),
                          "coordinate_order":"latitude-longitude",
                          "row_order":"north-to-south" if float(np.median(np.diff(lat)))<0 else "south-to-north",
                          "latitude_first":float(lat[0]),"latitude_step":float(np.median(np.diff(lat))),
                          "longitude_first":float(lon[0]),"longitude_step":float(np.median(np.diff(lon))),
                          "longitude_convention":"0..360","source_cycle_utc":_iso(cycle),"valid_time_utc":_iso(cycle),
                          "compressed_payload":True,"source_file":f"gfs.t{hh}z.pgrb2.0p25.f000","source_url":url,
                          "units":"degree_Celsius","scale_factor":100,
                          "encoding":"little-endian signed int16; value = stored_integer / 100",
                          "sha256_uncompressed_values":hashlib.sha256(uncompressed).hexdigest()}
                finally: ds.close()
            finally:
                try:os.unlink(name)
                except FileNotFoundError:pass
            row=_record(dataset,"noaa_ncep_gfs",_iso(cycle),retrieved,None,"degree_Celsius",url,
                        dimensions={"width":meta["width"],"height":meta["height"]},geometry={"type":"global_regular_grid","metadata":meta})
            return raw,meta,[row]
        except Exception as exc:last=str(exc)
    raise RuntimeError("No valid NOAA GFS analysis in candidate cycles: "+str(last))
def _oisst(dataset,retrieved):
    base="https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/v2.1/access/avhrr"
    today=dt.datetime.now(UTC).date(); candidates=[]
    for offset in range(4):
        idx=today.year*12+today.month-1-offset; year,month0=divmod(idx,12); ym=f"{year:04d}{month0+1:02d}"
        try: listing=_get(f"{base}/{ym}/",cap=2*1024*1024).text
        except Exception: continue
        for ymd in re.findall(r"oisst-avhrr-v02r01\.(\d{8})\.nc",listing):
            try:
                day=dt.datetime.strptime(ymd,"%Y%m%d").date()
                if day<=today:candidates.append((day,ym,ymd))
            except ValueError:pass
    for day,ym,ymd in sorted(set(candidates),reverse=True):
        url=f"{base}/{ym}/oisst-avhrr-v02r01.{ymd}.nc"
        try:
            raw=_get(url,cap=12*1024*1024).content
            if not (raw.startswith((b"CDF\x01",b"CDF\x02",b"\x89HDF\r\n\x1a\n")) and len(raw)>100000): raise RuntimeError("Invalid NetCDF")
            observed=dt.datetime.combine(day,dt.time(12),tzinfo=UTC)
            meta={"data_kind":"grid","format":"NetCDF","coverage":"global_native_grid","native_grid_spacing_degrees":0.25,
                  "source_url":url,"source_dataset":"OISST v2.1 AVHRR","valid_time_utc":_iso(observed),"units":"degree_C"}
            row=_record(dataset,"noaa_ncei_oisst",_iso(observed),retrieved,None,"degree_C",url,
                        geometry={"type":"global_native_grid","metadata":meta})
            return raw,meta,[row]
        except Exception:continue
    raise RuntimeError("No valid published OISST NetCDF file found in latest four monthly indexes")
def _power(dataset,retrieved,parameter,community,unit,source_name):
    end=dt.datetime.now(UTC).date(); start=dt.date(1981,1,1); rows=[]; urls={}
    for tile in POWER_TILES:
        url="https://power.larc.nasa.gov/api/temporal/daily/point"
        params={"parameters":parameter,"community":community,"longitude":tile["lon"],"latitude":tile["lat"],
                "start":start.strftime("%Y%m%d"),"end":end.strftime("%Y%m%d"),"format":"JSON"}
        response=_get(url,params,cap=8*1024*1024); obj=response.json()
        props=obj.get("properties",{}); parameter_data=props.get("parameter",{}).get(parameter,{})
        valid=[]
        for ymd,value in parameter_data.items():
            try:
                number=float(value)
                day=dt.datetime.strptime(ymd,"%Y%m%d").replace(tzinfo=UTC)
                if number>-900:valid.append((day,number))
            except (ValueError,TypeError):pass
        if not valid:raise RuntimeError(f"NASA POWER returned no valid {parameter} for {tile['id']}")
        observed,value=max(valid); urls[tile["id"]]=response.url
        rows.append(_record(dataset,"nasa_power_daily",_iso(observed),retrieved,value,unit,response.url,
                            latitude=tile["lat"],longitude=tile["lon"],
                            quality={"sample_tile_id":tile["id"],"sample_mode":"regional_point","community":community}))
    meta={"data_kind":"point_samples","format":"records","coverage_mode":"six_sparse_regional_point_samples",
          "source_name":source_name,"parameter":parameter,"community":community,"sample_tiles":POWER_TILES,
          "request_urls":urls,"units":unit}
    return None,meta,rows
def _usgs(dataset,retrieved):
    url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    obj=_get(url).json()
    if obj.get("type")!="FeatureCollection" or not isinstance(obj.get("features"),list):raise RuntimeError("Invalid USGS GeoJSON")
    rows=[]
    for feature in obj["features"]:
        p=feature.get("properties") or {}; coords=(feature.get("geometry") or {}).get("coordinates") or []
        if len(coords)<3 or p.get("time") is None:continue
        try:lon,lat,depth=map(float,coords[:3]); mag=float(p["mag"]) if p.get("mag") is not None else None
        except (ValueError,TypeError,KeyError):continue
        if not(-180<=lon<=180 and -90<=lat<=90 and -100<=depth<=1000):continue
        observed=_iso(dt.datetime.fromtimestamp(p["time"]/1000,UTC))
        rows.append(_record(dataset,"usgs_comcat",observed,retrieved,mag,"magnitude",url,
             latitude=lat,longitude=lon,geometry={"type":"Point","coordinates":[lon,lat,depth]},
             event_id=feature.get("id"),event_type="earthquake",depth_km=depth,place=p.get("place"),event_url=p.get("url")))
    if not rows:raise RuntimeError("USGS feed contained no valid events")
    return None,{"data_kind":"events","format":"records","feed_window":"past_24_hours","source_url":url},rows
def collect(dataset):
    dataset_id=dataset["dataset_id"]; spec=DATASETS.get(dataset_id)
    if not spec:raise ValueError(f"No native adapter configured for {dataset_id}")
    kind,source_name,unit=spec; retrieved=_iso(dt.datetime.now(UTC))
    if kind=="gfs_grid": raw,meta,rows=_gfs(dataset_id,retrieved)
    elif kind=="oisst_grid": raw,meta,rows=_oisst(dataset_id,retrieved)
    elif dataset_id=="earth.water_ice.rainfall":raw,meta,rows=_power(dataset_id,retrieved,"PRECTOTCORR","AG","mm/day",source_name)
    elif dataset_id=="earth.energy_humanity.solar_radiation":raw,meta,rows=_power(dataset_id,retrieved,"ALLSKY_SFC_SW_DWN","RE","kWh/m^2/day",source_name)
    elif kind=="usgs_events":raw,meta,rows=_usgs(dataset_id,retrieved)
    else:raise ValueError(f"Unsupported native source kind: {kind}")
    value_payload = raw if kind in ("gfs_grid", "oisst_grid") else None
    return {"value_payload":value_payload,"metadata":dict(meta,source_name=source_name,source_id=dataset["collection"]["source_id"]),
            "observations":rows}
