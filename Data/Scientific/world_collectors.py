#!/usr/bin/env python3
"""First-pass collectors for the five non-atmosphere LIVE // EARTH worlds.

NASA POWER regional data is explicitly represented as six sampled regions, not
as a complete global field. If a regional request is unavailable, the collector
falls back to one documented point in that same region. NOAA OISST is retained
as its original daily global NetCDF file; USGS earthquakes remain an event feed.
"""
from __future__ import annotations
import csv, datetime as dt, gzip, hashlib, io, json, os, sys, tempfile, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[2]
S = requests.Session()
S.headers.update({'User-Agent':'LIVE-EARTH-scientific-collector/1.3 (open-data research visualization)'})
MAX_BYTES = 35 * 1024 * 1024
UTC = dt.timezone.utc

# Each sample location is the centre of one documented region. These are not a
# global raster and must never be rendered or described as complete global coverage.
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


def fetch(url, params=None, max_bytes=MAX_BYTES, attempts=4):
    """Retry transient upstream/network errors; never retry ordinary 4xx errors."""
    last_error = None
    for attempt in range(attempts):
        try:
            r = S.get(url, params=params, timeout=(20, 240))
            if r.status_code == 429 or 500 <= r.status_code <= 599:
                detail = (r.text or '')[:500].replace('\n', ' ')
                last_error = RuntimeError(f'HTTP {r.status_code} from {r.url}: {detail}')
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
                raise last_error
            if not r.ok:
                detail = (r.text or '')[:1200].replace('\n', ' ')
                raise RuntimeError(f'HTTP {r.status_code} from {r.url}: {detail}')
            if len(r.content) > max_bytes:
                raise RuntimeError(f'Response exceeds safety cap ({len(r.content)} bytes)')
            if not r.content:
                raise RuntimeError('Empty source response')
            return r
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt + 1 >= attempts:
                break
            time.sleep(2 ** attempt)
    raise RuntimeError(f'Upstream request failed after {attempts} attempts: {last_error}')


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.live-earth-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as f: f.write(data)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


def publish(world, dataset, payload, source_url, provider, product, units,
            valid_time, note, count, fmt='CSV', extra=None, extension='csv.gz'):
    if count < 1:
        raise RuntimeError(f'{world}/{dataset}: source returned no validated records')
    out = ROOT / world / 'latest'
    out.mkdir(parents=True, exist_ok=True)
    raw_hash = hashlib.sha256(payload).hexdigest()
    data_name = f'{dataset}.source.{extension}'
    target = out / data_name
    if extension.endswith('.gz'):
        buf = io.BytesIO()
        with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=8, mtime=0) as gz:
            gz.write(payload)
        stored = buf.getvalue()
    else:
        stored = payload
    atomic_write(target, stored)
    meta = {'schema_version':1, 'world':world, 'dataset':dataset,
            'provider':provider, 'product':product, 'source_url':source_url,
            'valid_time_utc':valid_time, 'retrieved_at_utc':stamp(now()),
            'units':units, 'source_record_count':count,
            'source_payload_format':fmt, 'sha256_source_payload':raw_hash,
            'stored_bytes':len(stored),
            'quality_status':'downloaded_and_basic_schema_validated', 'note':note}
    if extra: meta.update(extra)
    mp = out / f'{dataset}.metadata.json'
    atomic_write(mp, (json.dumps(meta, indent=2) + '\n').encode())
    manifest = {'schema_version':1, 'world':world,
                'updated_at_utc':meta['retrieved_at_utc'],
                'snapshots':[{'dataset':dataset, 'data':f'latest/{data_name}',
                              'metadata':f'latest/{dataset}.metadata.json',
                              'sha256_source_payload':raw_hash,
                              'valid_time_utc':valid_time}]}
    atomic_write(ROOT / world / 'manifest.json',
                 (json.dumps(manifest, indent=2) + '\n').encode())
    print(json.dumps({'status':'success', 'world':world, 'dataset':dataset,
                      'records':count, 'stored_bytes':len(stored),
                      'valid_time_utc':valid_time}, indent=2))


def parse_power_csv(content, parameter):
    """Find POWER's metadata-prefixed CSV header and retain only real numeric rows."""
    text = content.decode('utf-8-sig', errors='replace')
    lines = text.splitlines()
    target = parameter.strip().upper()
    header_index = None
    for i, line in enumerate(lines):
        cols = [c.strip().strip('"').upper() for c in line.split(',')]
        if target in cols and any(c in ('LAT', 'LATITUDE') for c in cols) and any(c in ('LON', 'LONGITUDE') for c in cols):
            header_index = i
            break
    if header_index is None:
        raise RuntimeError(f'NASA POWER CSV header not recognized for {parameter}. Response starts: {lines[:8]}')
    reader = csv.DictReader(lines[header_index:])
    rows = []
    for row in reader:
        if not row: continue
        value = next((v for k, v in row.items() if k and k.strip().strip('"').upper() == target), None)
        try: number = float(value)
        except (ValueError, TypeError): continue
        if not (-1e6 < number < 1e6) or number in (-999.0, -9999.0): continue
        # Require usable coordinates as well as the measurement.
        try:
            lat = float(row.get('LAT') or row.get('LATITUDE'))
            lon = float(row.get('LON') or row.get('LONGITUDE'))
        except (ValueError, TypeError): continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180): continue
        rows.append(row)
    if not rows:
        raise RuntimeError(f'NASA POWER returned no valid {parameter} observations')
    payload = ('\n'.join(lines[header_index:]) + '\n').encode()
    return payload, rows


def power_tile_request(parameter, community, day, tile):
    """Try the 4.5-degree regional API, then the centre-point API for that tile."""
    date = day.strftime('%Y%m%d')
    regional_url = 'https://power.larc.nasa.gov/api/temporal/daily/regional'
    regional_params = {
        'latitude-min':tile['lat']-2.25, 'latitude-max':tile['lat']+2.25,
        'longitude-min':tile['lon']-2.25, 'longitude-max':tile['lon']+2.25,
        'parameters':parameter, 'community':community, 'start':date, 'end':date,
        'time-standard':'UTC', 'format':'CSV'
    }
    try:
        response = fetch(regional_url, regional_params)
        payload, rows = parse_power_csv(response.content, parameter)
        return payload, rows, response.url, 'regional_4.5_degree_sample'
    except Exception as regional_error:
        point_url = 'https://power.larc.nasa.gov/api/temporal/daily/point'
        point_params = {
            'latitude':tile['lat'], 'longitude':tile['lon'],
            'parameters':parameter, 'community':community,
            'start':date, 'end':date, 'time-standard':'UTC', 'format':'CSV'
        }
        try:
            response = fetch(point_url, point_params)
            payload, rows = parse_power_csv(response.content, parameter)
            return payload, rows, response.url, 'point_fallback'
        except Exception as point_error:
            raise RuntimeError(f"{tile['id']} regional request failed ({regional_error}); point fallback failed ({point_error})")


def power_csv(world, dataset, parameter, units, note, community):
    # POWER daily products may lag and may temporarily publish fill values.
    # Search recent dates, newest first, and never treat -999 fill values as data.
    errors = []
    for back in range(3, 11):
        day = now().date() - dt.timedelta(days=back)
        collected, sources, dates, tile_counts, modes = [], [], [], {}, {}
        for tile in POWER_TILES:
            try:
                payload, rows, source_url, mode = power_tile_request(parameter, community, day, tile)
                reader = csv.DictReader(payload.decode().splitlines())
                tile_rows = rows  # only validated numeric rows; exclude POWER fill-value rows
                for row in tile_rows:
                    row['SAMPLE_TILE_ID'] = tile['id']
                    row['SAMPLE_MODE'] = mode
                    collected.append(row)
                sources.append(source_url)
                tile_counts[tile['id']] = len(rows)
                modes[tile['id']] = mode
                for row in rows:
                    y = row.get('YEAR', '')
                    m = row.get('MO', '')
                    d = row.get('DY', '')
                    if y and m and d: dates.append(f'{y}{m.zfill(2)}{d.zfill(2)}')
            except Exception as exc:
                errors.append(f'{tile["id"]} {day.isoformat()}: {exc}')
        # Publish only a complete six-region sample set for one observation day.
        if len(tile_counts) != len(POWER_TILES) or not collected:
            continue
        fields = list(dict.fromkeys(k for row in collected for k in row.keys()))
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=fields, lineterminator='\n')
        writer.writeheader(); writer.writerows(collected)
        valid = max(dates) if dates else day.strftime('%Y%m%d')
        coverage = 'six fixed regional samples; a mix of regional grids and centre-point fallbacks; not a complete global grid'
        publish(world, dataset, out.getvalue().encode(),
                'https://power.larc.nasa.gov/api/temporal/daily', 'NASA POWER',
                f'Daily {parameter} sampled regional product', units,
                valid[:4]+'-'+valid[4:6]+'-'+valid[6:8]+'T00:00:00Z',
                note + ' Coverage is ' + coverage + '.', len(collected),
                extra={'parameter':parameter, 'community':community,
                       'coverage_mode':'sparse_regional_samples',
                       'sample_tiles':POWER_TILES, 'records_per_tile':tile_counts,
                       'request_modes':modes, 'request_urls':sources,
                       'selected_source_day':valid})
        return
    raise RuntimeError(f'NASA POWER could not provide valid {parameter} rows in the last 3–10 day window. Last errors: ' + ' | '.join(errors[-8:]))


def oceans():
    # NOAA/NCEI OISST v2.1 final product has publication latency. Search a
    # bounded recent window; do not silently accept a 20+ day old snapshot.
    last_error = None
    for back in range(14, 19):
        day = now().date() - dt.timedelta(days=back)
        ymd = day.strftime('%Y%m%d'); ym = day.strftime('%Y%m')
        url = f'https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/v2.1/access/avhrr/{ym}/oisst-avhrr-v02r01.{ymd}.nc'
        try:
            response = fetch(url, max_bytes=12*1024*1024)
            data = response.content
            if not (data.startswith(b'CDF\x01') or data.startswith(b'CDF\x02') or data.startswith(b'\x89HDF\r\n\x1a\n')):
                raise RuntimeError('NOAA response is not a recognized NetCDF file')
            if len(data) < 100_000:
                raise RuntimeError(f'NetCDF payload unexpectedly small: {len(data)} bytes')
            publish('oceans', 'sea_surface_temperature', data, url, 'NOAA/NCEI',
                    'Daily Optimum Interpolation Sea Surface Temperature Analysis v2.1 Final',
                    'degree_C', day.isoformat()+'T12:00:00Z',
                    'Original daily global 0.25-degree OISST NetCDF source file; final analysis publication latency applies.',
                    1, fmt='NetCDF4',
                    extra={'source_dataset_id':'OISST v2.1 AVHRR',
                           'native_grid_spacing_degrees':0.25,
                           'coverage_mode':'global_native_grid',
                           'source_file':url.rsplit('/',1)[-1],
                           'observation_age_days':back}, extension='nc')
            return
        except Exception as exc:
            last_error = str(exc)
            print(f'OISST candidate {ymd}: {exc}', file=sys.stderr)
    raise RuntimeError('No valid NOAA OISST final daily NetCDF found within the 14–18 day freshness window: '+str(last_error))


def earth_activity():
    url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
    response = fetch(url)
    obj = response.json()
    if obj.get('type') != 'FeatureCollection' or not isinstance(obj.get('features'), list):
        raise RuntimeError('USGS response is not a GeoJSON FeatureCollection')
    rows = []
    for feature in obj['features']:
        props = feature.get('properties') or {}
        geometry = feature.get('geometry') or {}
        coords = geometry.get('coordinates') or []
        if len(coords) < 3 or props.get('time') is None: continue
        try:
            lon, lat, depth = map(float, coords[:3])
            magnitude = float(props['mag']) if props.get('mag') is not None else None
        except (ValueError, TypeError, KeyError): continue
        if not (-180 <= lon <= 180 and -90 <= lat <= 90 and -100 <= depth <= 1000): continue
        rows.append({'id':feature.get('id'),
                     'time_utc':stamp(dt.datetime.fromtimestamp(props['time']/1000, UTC)),
                     'longitude':lon, 'latitude':lat, 'depth_km':depth,
                     'magnitude':magnitude, 'place':props.get('place'),
                     'event_url':props.get('url'), 'status':props.get('status')})
    if not rows: raise RuntimeError('USGS feed contained no valid event records')
    payload = ''.join(json.dumps(row, separators=(',',':'))+'\n' for row in rows).encode()
    generated = obj.get('metadata', {}).get('generated')
    valid = stamp(dt.datetime.fromtimestamp(generated/1000, UTC)) if generated else stamp(now())
    publish('earth_activity', 'earthquakes', payload, url, 'USGS ComCat',
            'All earthquakes past 24 hours GeoJSON feed', 'magnitude; depth_km', valid,
            'Event feed, not a continuous global geophysical field.', len(rows),
            fmt='GeoJSON feature records', extension='jsonl.gz',
            extra={'feed_window':'past_24_hours',
                   'geojson_count':obj.get('metadata',{}).get('count')})


def land():
    power_csv('land', 'land_surface_temperature', 'TSURF', 'degree_C',
              'NASA POWER daily surface temperature regional product; reanalysis-derived grid, not direct station observations.', 'HY')

def water_ice():
    power_csv('water_ice', 'precipitation', 'PRECTOT', 'mm/day',
              'NASA POWER daily precipitation regional product; not a flood extent or groundwater observation.', 'HY')

def energy_humanity():
    power_csv('energy_humanity', 'surface_solar_radiation', 'ALLSKY_SFC_SW_DWN', 'kWh/m^2/day',
              'NASA POWER all-sky surface shortwave downward radiation daily regional product.', 'RE')


TASKS = {'oceans':oceans, 'land':land, 'water_ice':water_ice,
         'earth_activity':earth_activity, 'energy_humanity':energy_humanity}
if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in TASKS:
        raise SystemExit('Usage: world_collectors.py ' + ' | '.join(TASKS))
    try:
        TASKS[sys.argv[1]]()
    except Exception as exc:
        print(f'{sys.argv[1].upper()} COLLECTION FAILED: {exc}', file=sys.stderr)
        raise SystemExit(1)
