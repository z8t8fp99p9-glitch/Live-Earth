#!/usr/bin/env python3
"""First-pass collectors for the five non-atmosphere LIVE // EARTH worlds.

NASA POWER products are explicitly sparse regional samples: six 4.5-degree tiles
per parameter, not a falsely-labelled complete global raster. NOAA OISST is stored
as its original daily global NetCDF file. USGS earthquakes remain an event feed.
"""
from __future__ import annotations
import csv, datetime as dt, gzip, hashlib, io, json, os, sys, tempfile
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
S = requests.Session()
S.headers.update({'User-Agent':'LIVE-EARTH-scientific-collector/1.2 (open-data research visualization)'})
MAX_BYTES = 35 * 1024 * 1024
UTC = dt.timezone.utc

# POWER's regional API accepts at most 4.5 x 4.5 degrees (100 grid cells).
# These fixed sample windows are deliberately labelled as samples, never global coverage.
POWER_TILES = [
    {'id':'north_america','lat':40.0,'lon':-100.0},
    {'id':'south_america','lat':-15.0,'lon':-60.0},
    {'id':'europe_north_africa','lat':35.0,'lon':15.0},
    {'id':'east_africa','lat':0.0,'lon':35.0},
    {'id':'south_asia','lat':20.0,'lon':80.0},
    {'id':'east_asia_pacific','lat':25.0,'lon':125.0},
]

def now(): return dt.datetime.now(UTC)
def stamp(d): return d.isoformat().replace('+00:00','Z')
def fetch(url, params=None, max_bytes=MAX_BYTES):
    r=S.get(url,params=params,timeout=(20,240))
    if not r.ok:
        detail=(r.text or '')[:1200].replace('\n',' ')
        raise RuntimeError(f'HTTP {r.status_code} from {r.url}: {detail}')
    if len(r.content)>max_bytes: raise RuntimeError(f'Response exceeds safety cap ({len(r.content)} bytes)')
    if not r.content: raise RuntimeError('Empty source response')
    return r

def atomic_write(path, data):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix='.live-earth-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f: f.write(data)
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def publish(world,dataset,payload,source_url,provider,product,units,valid_time,note,count,fmt='CSV',extra=None,extension='csv.gz'):
    if count < 1: raise RuntimeError(f'{world}/{dataset}: source returned no validated records')
    out=ROOT/world/'latest'; out.mkdir(parents=True,exist_ok=True)
    raw_hash=hashlib.sha256(payload).hexdigest()
    data_name=f'{dataset}.source.{extension}'
    target=out/data_name
    if extension.endswith('.gz'):
        buf=io.BytesIO()
        with gzip.GzipFile(fileobj=buf,mode='wb',compresslevel=8,mtime=0) as gz: gz.write(payload)
        stored=buf.getvalue()
    else: stored=payload
    atomic_write(target,stored)
    meta={'schema_version':1,'world':world,'dataset':dataset,'provider':provider,'product':product,
          'source_url':source_url,'valid_time_utc':valid_time,'retrieved_at_utc':stamp(now()),
          'units':units,'source_record_count':count,'source_payload_format':fmt,
          'sha256_source_payload':raw_hash,'stored_bytes':len(stored),
          'quality_status':'downloaded_and_basic_schema_validated','note':note}
    if extra: meta.update(extra)
    mp=out/f'{dataset}.metadata.json'; atomic_write(mp,(json.dumps(meta,indent=2)+'\n').encode())
    manifest={'schema_version':1,'world':world,'updated_at_utc':meta['retrieved_at_utc'],
              'snapshots':[{'dataset':dataset,'data':f'latest/{data_name}','metadata':f'latest/{dataset}.metadata.json',
                            'sha256_source_payload':raw_hash,'valid_time_utc':valid_time}]}
    atomic_write(ROOT/world/'manifest.json',(json.dumps(manifest,indent=2)+'\n').encode())
    print(json.dumps({'status':'success','world':world,'dataset':dataset,'records':count,'stored_bytes':len(stored),'valid_time_utc':valid_time},indent=2))

def parse_power_csv(content,parameter):
    text=content.decode('utf-8-sig',errors='replace')
    lines=text.splitlines(); hi=None
    for i,line in enumerate(lines):
        low=line.lower()
        if ('latitude' in low or 'lat' in low) and ('longitude' in low or 'lon' in low) and parameter.lower() in low:
            hi=i; break
    if hi is None: raise RuntimeError(f'NASA POWER CSV header not recognized. Response starts: {lines[:10]}')
    reader=csv.DictReader(lines[hi:]); rows=[]
    for row in reader:
        if not row: continue
        val=next((v for k,v in row.items() if k and k.strip().upper()==parameter),None)
        try: x=float(val)
        except (ValueError,TypeError): continue
        if not (-1e6 < x < 1e6) or x == -999: continue
        rows.append(row)
    if not rows: raise RuntimeError(f'NASA POWER returned no valid {parameter} rows')
    payload=('\n'.join(lines[hi:])+'\n').encode()
    return payload,rows

def power_csv(world,dataset,parameter,units,note,community):
    # NASA POWER's regional service is limited to 4.5 x 4.5 degrees. Fetch a
    # fixed, documented sample of six tiles to avoid invalid global requests or
    # excessive per-cell calls. The output is explicitly not a global field.
    day=(now().date()-dt.timedelta(days=3)).strftime('%Y%m%d')
    url='https://power.larc.nasa.gov/api/temporal/daily/regional'
    collected=[]; sources=[]; dates=[]; tile_counts={}
    for tile in POWER_TILES:
        params={'latitude-min':tile['lat']-2.25,'latitude-max':tile['lat']+2.25,
                'longitude-min':tile['lon']-2.25,'longitude-max':tile['lon']+2.25,
                'parameters':parameter,'community':community,'start':day,'end':day,
                'time-standard':'UTC','format':'CSV'}
        r=fetch(url,params)
        payload,rows=parse_power_csv(r.content,parameter)
        # Keep source rows, annotating each row with its tile ID for unambiguous mapping.
        reader=csv.DictReader(payload.decode().splitlines())
        for row in reader:
            row['SAMPLE_TILE_ID']=tile['id']
            collected.append(row)
        sources.append(r.url)
        tile_counts[tile['id']]=len(rows)
        dates.extend([row.get('YEAR','')+row.get('MO','')+row.get('DY','') for row in rows])
    if not collected: raise RuntimeError(f'No validated NASA POWER {parameter} rows across sample tiles')
    fields=list(collected[0].keys())
    out=io.StringIO(); writer=csv.DictWriter(out,fieldnames=fields,lineterminator='\n'); writer.writeheader(); writer.writerows(collected)
    valid=max([x for x in dates if x] or [day])
    publish(world,dataset,out.getvalue().encode(),url,'NASA POWER',f'Daily regional {parameter} 0.5-degree samples',units,valid+'T00:00:00Z',
            note+' Coverage is six fixed 4.5-degree sample tiles only; not a complete global grid.',len(collected),
            extra={'parameter':parameter,'grid_spacing_degrees':0.5,'coverage_mode':'sparse_regional_samples',
                   'sample_tiles':POWER_TILES,'records_per_tile':tile_counts,'request_urls':sources,
                   'regional_tile_size_degrees':4.5})

def oceans():
    # NOAA/NCEI direct daily OISST v2.1 NetCDF. Select a conservative date
    # 20 days back to target the final (not preliminary) analysis.
    last_error=None
    for back in range(20,28):
        day=now().date()-dt.timedelta(days=back)
        ymd=day.strftime('%Y%m%d'); ym=day.strftime('%Y%m')
        url=f'https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/v2.1/access/avhrr/{ym}/oisst-avhrr-v02r01.{ymd}.nc'
        try:
            r=fetch(url,max_bytes=12*1024*1024)
            data=r.content
            if not (data.startswith(b'CDF\x01') or data.startswith(b'CDF\x02') or data.startswith(b'\x89HDF\r\n\x1a\n')):
                raise RuntimeError('NOAA response is not a recognized NetCDF file')
            if len(data)<100_000: raise RuntimeError(f'NetCDF payload unexpectedly small: {len(data)} bytes')
            # NCEI OISST is a complete 0.25-degree daily global analysis. Preserve
            # native NetCDF; no image conversion or spatial downsampling occurs here.
            publish('oceans','sea_surface_temperature',data,url,'NOAA/NCEI',
                    'Daily Optimum Interpolation Sea Surface Temperature Analysis v2.1 Final',
                    'degree_C',''+day.isoformat()+'T12:00:00Z',
                    'Original daily global 0.25-degree OISST NetCDF source file; final analysis has publication latency.',
                    1,fmt='NetCDF4',extra={'source_dataset_id':'OISST v2.1 AVHRR','native_grid_spacing_degrees':0.25,
                    'coverage_mode':'global_native_grid','source_file':url.rsplit('/',1)[-1]},extension='nc')
            return
        except Exception as e:
            last_error=str(e); print(f'OISST candidate {ymd}: {e}',file=sys.stderr)
    raise RuntimeError('No valid NOAA OISST final daily NetCDF found in attempted date window: '+str(last_error))

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
            'Event feed, not a continuous global geophysical field.',len(rows),fmt='GeoJSON feature records',extension='jsonl.gz',
            extra={'feed_window':'past_24_hours','geojson_count':obj.get('metadata',{}).get('count')})

def land():
    power_csv('land','land_surface_temperature','TSURF','degree_C','NASA POWER daily surface temperature regional product; reanalysis-derived grid, not direct station observations.','HY')
def water_ice():
    power_csv('water_ice','precipitation','PRECTOT','mm/day','NASA POWER daily precipitation regional product; not a flood extent or groundwater observation.','HY')
def energy_humanity():
    power_csv('energy_humanity','surface_solar_radiation','ALLSKY_SFC_SW_DWN','kWh/m^2/day','NASA POWER all-sky surface shortwave downward radiation daily regional product.','RE')

TASKS={'oceans':oceans,'land':land,'water_ice':water_ice,'earth_activity':earth_activity,'energy_humanity':energy_humanity}
if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in TASKS: raise SystemExit('Usage: world_collectors.py '+' | '.join(TASKS))
    try: TASKS[sys.argv[1]]()
    except Exception as e:
        print(f'{sys.argv[1].upper()} COLLECTION FAILED: {e}',file=sys.stderr); raise SystemExit(1)
