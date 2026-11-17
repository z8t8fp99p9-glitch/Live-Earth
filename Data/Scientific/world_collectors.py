#!/usr/bin/env python3
"""Verified first-pass collectors for the five non-atmosphere LIVE // EARTH worlds.

These publish source-native CSV/GeoJSON records with provenance. They do not fabricate
full-world coverage: POWER products are daily gridded regional requests; OISST is a
coarse-sampled global SST grid; USGS is a live event feed.
"""
from __future__ import annotations
import csv, datetime as dt, gzip, hashlib, io, json, os, re, sys, tempfile
from pathlib import Path
from urllib.parse import quote
import requests

ROOT = Path(__file__).resolve().parents[2]
S = requests.Session()
S.headers.update({'User-Agent':'LIVE-EARTH-scientific-collector/1.1 (open-data research visualization)'})
MAX_BYTES = 35 * 1024 * 1024
UTC = dt.timezone.utc

def now(): return dt.datetime.now(UTC)
def stamp(d): return d.isoformat().replace('+00:00','Z')
def fetch(url, params=None):
    r=S.get(url,params=params,timeout=(20,240)); r.raise_for_status()
    if len(r.content)>MAX_BYTES: raise RuntimeError(f'Response exceeds safety cap ({len(r.content)} bytes)')
    if not r.content: raise RuntimeError('Empty source response')
    return r

def publish(world, dataset, response_bytes, source_url, provider, product, units, valid_time, note, count, extra=None):
    if count < 1: raise RuntimeError(f'{world}/{dataset}: source returned no validated records')
    out=ROOT/world/'latest'; out.mkdir(parents=True,exist_ok=True)
    raw_hash=hashlib.sha256(response_bytes).hexdigest()
    data_name=f'{dataset}.source.jsonl.gz' if dataset=='earthquakes' else f'{dataset}.source.csv.gz'
    target=out/data_name
    fd,tmp=tempfile.mkstemp(prefix='.live-earth-',dir=out)
    try:
        with os.fdopen(fd,'wb') as raw:
            with gzip.GzipFile(fileobj=raw,mode='wb',compresslevel=8,mtime=0) as gz: gz.write(response_bytes)
        if os.path.getsize(tmp)>MAX_BYTES: raise RuntimeError('Compressed snapshot exceeds safety cap')
        os.replace(tmp,target)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    meta={'schema_version':1,'world':world,'dataset':dataset,'provider':provider,'product':product,
          'source_url':source_url,'valid_time_utc':valid_time,'retrieved_at_utc':stamp(now()),
          'units':units,'source_record_count':count,'source_payload_format':'CSV' if dataset!='earthquakes' else 'GeoJSON feature records',
          'sha256_source_payload':raw_hash,'compressed_bytes':target.stat().st_size,
          'quality_status':'downloaded_and_basic_schema_validated','note':note}
    if extra: meta.update(extra)
    mp=out/f'{dataset}.metadata.json'; tmpm=mp.with_suffix('.json.tmp')
    tmpm.write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8'); os.replace(tmpm,mp)
    manifest={'schema_version':1,'world':world,'updated_at_utc':meta['retrieved_at_utc'],
              'snapshots':[{'dataset':dataset,'data':f'latest/{data_name}','metadata':f'latest/{dataset}.metadata.json',
                            'sha256_source_payload':raw_hash,'valid_time_utc':valid_time}]}
    mf=ROOT/world/'manifest.json'; tmf=mf.with_suffix('.json.tmp')
    tmf.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8'); os.replace(tmf,mf)
    print(json.dumps({'status':'success','world':world,'dataset':dataset,'records':count,'bytes':target.stat().st_size,'valid_time_utc':valid_time},indent=2))

def power_csv(world,dataset,parameter,units,note,community):
    # NASA POWER daily regional endpoint; request a global 0.5-degree regional field for
    # the most recent completed UTC day. POWER may lag; returned dates are authoritative.
    day=(now().date()-dt.timedelta(days=3)).strftime('%Y%m%d')
    url='https://power.larc.nasa.gov/api/temporal/daily/regional'
    params={'latitude-min':-89.75,'latitude-max':89.75,'longitude-min':0.25,'longitude-max':359.75,
            'parameters':parameter,'community':community,'start':day,'end':day,'time-standard':'UTC','format':'CSV'}
    r=fetch(url,params)
    text=r.content.decode('utf-8-sig',errors='replace')
    lines=text.splitlines(); header_i=None
    for i,line in enumerate(lines):
        low=line.lower()
        if ('latitude' in low or 'lat' in low) and ('longitude' in low or 'lon' in low) and parameter.lower() in low:
            header_i=i; break
    if header_i is None:
        # Keep API response for diagnostics, but fail closed: don't publish unknown schema.
        raise RuntimeError(f'NASA POWER CSV header not recognized. First response lines: {lines[:8]}')
    reader=csv.DictReader(lines[header_i:]); rows=[]
    for row in reader:
        if not row: continue
        val=next((v for k,v in row.items() if k and k.strip().upper()==parameter),None)
        if val is None: continue
        try: x=float(val)
        except (ValueError,TypeError): continue
        if not (-1e6 < x < 1e6): continue
        rows.append(row)
    if not rows: raise RuntimeError(f'NASA POWER returned no valid {parameter} rows')
    # Retain original rows and source schema without converting spatial values.
    payload=('\n'.join(lines[header_i:])+'\n').encode()
    actual_dates=[r.get('YEAR','')+r.get('MO','')+r.get('DY','') for r in rows]
    valid=max(actual_dates) if any(actual_dates) else day
    publish(world,dataset,payload,r.url,'NASA POWER',f'Daily regional {parameter} 0.5-degree grid',units,valid+'T00:00:00Z',note,len(rows),{'parameter':parameter,'grid_spacing_degrees':0.5,'requested_bbox':[ -89.75,0.25,89.75,359.75]})

def oceans():
    # NOAA/NCEI OISST final product. Four-cell stride samples the global 0.25-degree grid at 1 degree.
    # Final analysis has a documented ~2-week finalization delay; request 20 days back and
    # fall back over a small window until a valid daily CSV is returned.
    base='https://upwell.pfeg.noaa.gov/erddap/griddap/oisst_rclone.csv'
    for back in range(20,27):
        day=(now().date()-dt.timedelta(days=back)).isoformat()+'T12:00:00Z'
        q=f'sst[({day})][(-89.875):4:(89.875)][(0.125):4:(359.875)]'
        try:
            r=fetch(base+'?'+quote(q,safe='[]():.,-TZ'))
            text=r.content.decode('utf-8-sig',errors='replace')
            lines=text.splitlines(); hi=next((i for i,l in enumerate(lines) if l.lower().startswith('time,') or l.lower().startswith('"time",')),None)
            if hi is None: continue
            reader=csv.DictReader(lines[hi:]); rows=[]
            for row in reader:
                if not row: continue
                try: v=float(row.get('sst','nan'))
                except (ValueError,TypeError): continue
                if -3 <= v <= 45: rows.append(row)
            if rows:
                payload=('\n'.join(lines[hi:])+'\n').encode()
                publish('oceans','sea_surface_temperature',payload,r.url,'NOAA/NCEI',
                        'Daily Optimum Interpolation SST Analysis v2.1 Final; 1-degree sampling of 0.25-degree grid',
                        'degree_C',day,'NOAA blended satellite and in-situ analysis; sampled at 1-degree intervals; final product has latency.',len(rows),
                        {'source_dataset_id':'oisst_rclone','native_grid_spacing_degrees':0.25,'sample_stride':4})
                return
        except Exception as e: print(f'OISST candidate {day}: {e}',file=sys.stderr)
    raise RuntimeError('No valid NOAA OISST final daily slice found in attempted date window')

def earth_activity():
    url='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
    r=fetch(url); obj=r.json()
    if obj.get('type')!='FeatureCollection' or not isinstance(obj.get('features'),list): raise RuntimeError('USGS response is not a GeoJSON FeatureCollection')
    rows=[]
    for f in obj['features']:
        p=f.get('properties') or {}; g=f.get('geometry') or {}; c=g.get('coordinates') or []
        if len(c)<3 or p.get('time') is None: continue
        try: lon,lat,depth=map(float,c[:3]); mag=float(p['mag']) if p.get('mag') is not None else None
        except (ValueError,TypeError,KeyError): continue
        if not (-180<=lon<=180 and -90<=lat<=90 and -100<=depth<=1000): continue
        rows.append({'id':f.get('id'),'time_utc':stamp(dt.datetime.fromtimestamp(p['time']/1000,UTC)),
                     'longitude':lon,'latitude':lat,'depth_km':depth,'magnitude':mag,'place':p.get('place'),
                     'event_url':p.get('url'),'status':p.get('status')})
    if not rows: raise RuntimeError('USGS feed contained no valid event records')
    payload=''.join(json.dumps(x,separators=(',',':'))+'\n' for x in rows).encode()
    generated=obj.get('metadata',{}).get('generated')
    valid=stamp(dt.datetime.fromtimestamp(generated/1000,UTC)) if generated else stamp(now())
    publish('earth_activity','earthquakes',payload,url,'USGS ComCat','All earthquakes past 24 hours GeoJSON feed','magnitude; depth_km',valid,
            'Event feed, not a continuous global geophysical field.',len(rows),{'feed_window':'past_24_hours','geojson_count':obj.get('metadata',{}).get('count')})

def land():
    power_csv('land','land_surface_temperature','TSURF','degree_C','NASA POWER daily surface temperature regional product; reanalysis-derived grid, not direct station observations.','HY')
def water_ice():
    power_csv('water_ice','precipitation','PRECTOT','mm/day','NASA POWER daily precipitation regional product; not a flood extent or groundwater observation.','HY')
def energy_humanity():
    power_csv('energy_humanity','surface_solar_radiation','ALLSKY_SFC_SW_DWN','kWh/m^2/day','NASA POWER all-sky surface shortwave downward radiation daily regional product.','RE')

TASKS={'oceans':oceans,'land':land,'water_ice':water_ice,'earth_activity':earth_activity,'energy_humanity':energy_humanity}
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in TASKS: raise SystemExit('Usage: world_collectors.py '+ '|'.join(TASKS))
    try: TASKS[sys.argv[1]]()
    except Exception as e:
        print(f'{sys.argv[1].upper()} COLLECTION FAILED: {e}',file=sys.stderr); raise SystemExit(1)
