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
S.headers.update({'User-Agent':'LIVE-EARTH-scientific-collector/1.4 (open-data research visualization)'})
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


def fetch(url, params=None, max_bytes=MAX_BYTES, attempts=3):
    """Retry transient network/server errors without repeating validation failures."""
    last_error = None
    for attempt in range(attempts):
        try:
            r = S.get(url, params=params, timeout=(15, 120))
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


def parse_power_point_json(content, parameter, tile, start_day, end_day):
    """Parse NASA POWER's documented point JSON response into dated numeric values."""
    try:
        obj = json.loads(content.decode('utf-8-sig'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f'NASA POWER returned invalid JSON: {exc}')

    if not isinstance(obj, dict):
        raise RuntimeError('NASA POWER JSON root is not an object')
    properties = obj.get('properties') or {}
    parameters = properties.get('parameter') or {}
    series = parameters.get(parameter)
    if not isinstance(series, dict):
        available = sorted(parameters.keys()) if isinstance(parameters, dict) else []
        raise RuntimeError(f'NASA POWER JSON has no {parameter} series; available: {available}')

    # Point responses carry their location in GeoJSON geometry. Validate it
    # against the requested sample point; do not infer coordinates from rows.
    geometry = obj.get('geometry') or {}
    coordinates = geometry.get('coordinates') or []
    if len(coordinates) < 2:
        raise RuntimeError('NASA POWER point JSON has no GeoJSON coordinates')
    try:
        response_lon, response_lat = float(coordinates[0]), float(coordinates[1])
    except (TypeError, ValueError):
        raise RuntimeError('NASA POWER point JSON has invalid GeoJSON coordinates')
    if abs(response_lat - tile['lat']) > 0.02 or abs(response_lon - tile['lon']) > 0.02:
        raise RuntimeError(f'NASA POWER returned unexpected point ({response_lat}, {response_lon}) for {tile['id']}')

    values = {}
    for date_key, raw_value in series.items():
        try:
            day = dt.datetime.strptime(str(date_key), '%Y%m%d').date()
            number = float(raw_value)
        except (TypeError, ValueError):
            continue
        if day < start_day or day > end_day:
            continue
        if not (-1e6 < number < 1e6) or number in (-999.0, -9999.0):
            continue
        values[day.strftime('%Y%m%d')] = number
    if not values:
        raise RuntimeError(f'NASA POWER has no valid {parameter} values in requested date window')
    return values


def power_point_request(parameter, community, start_day, end_day, tile):
    """Fetch one compact multi-day point series for a documented regional sample."""
    url = 'https://power.larc.nasa.gov/api/temporal/daily/point'
    params = {
        'latitude':tile['lat'], 'longitude':tile['lon'],
        'parameters':parameter, 'community':community,
        'start':start_day.strftime('%Y%m%d'),
        'end':end_day.strftime('%Y%m%d'),
        'time-standard':'UTC', 'format':'JSON'
    }
    response = fetch(url, params, max_bytes=4 * 1024 * 1024, attempts=3)
    values = parse_power_point_json(response.content, parameter, tile, start_day, end_day)
    return values, response.url


def power_points(world, dataset, parameter, units, note, community):
    """Collect one common, recent observation day for all six fixed sample points."""
    # A single 8-day response per point is faster and gentler on NASA POWER than
    # retrying separate regional rectangles and individual dates. The selected
    # day is the newest date available at all six points, 3–10 days behind NRT.
    end_day = now().date() - dt.timedelta(days=3)
    start_day = now().date() - dt.timedelta(days=10)
    values_by_tile, sources = {}, {}
    errors = []
    for tile in POWER_TILES:
        try:
            values, source_url = power_point_request(parameter, community, start_day, end_day, tile)
            values_by_tile[tile['id']] = values
            sources[tile['id']] = source_url
        except Exception as exc:
            errors.append(f"{tile['id']}: {exc}")

    if len(values_by_tile) != len(POWER_TILES):
        raise RuntimeError(
            f'NASA POWER did not return a valid {parameter} series for all six sample points. '
            + ' | '.join(errors[-6:])
        )

    common_dates = set.intersection(*(set(values_by_tile[t['id']]) for t in POWER_TILES))
    if not common_dates:
        available = {key: sorted(value.keys())[-3:] for key, value in values_by_tile.items()}
        raise RuntimeError(f'No common valid observation date across all six points for {parameter}; recent dates: {available}')

    selected_day = max(common_dates)
    out = io.StringIO()
    fields = ['YEAR','MO','DY','LAT','LON',parameter,'SAMPLE_TILE_ID','SAMPLE_MODE']
    writer = csv.DictWriter(out, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    tile_counts = {}
    for tile in POWER_TILES:
        value = values_by_tile[tile['id']][selected_day]
        writer.writerow({
            'YEAR':selected_day[:4], 'MO':selected_day[4:6], 'DY':selected_day[6:8],
            'LAT':tile['lat'], 'LON':tile['lon'], parameter:value,
            'SAMPLE_TILE_ID':tile['id'], 'SAMPLE_MODE':'NASA_POWER_daily_point_JSON'
        })
        tile_counts[tile['id']] = 1

    coverage = 'six fixed point samples on one common observation day; sparse regional samples, not a complete global grid'
    payload = out.getvalue().encode('utf-8')
    valid_time = f'{selected_day[:4]}-{selected_day[4:6]}-{selected_day[6:8]}T00:00:00Z'
    publish(world, dataset, payload,
            'https://power.larc.nasa.gov/api/temporal/daily/point', 'NASA POWER',
            f'Daily {parameter} point samples ({community} community)', units,
            valid_time, note + ' Coverage is ' + coverage + '.', len(POWER_TILES),
            extra={'parameter':parameter, 'community':community,
                   'coverage_mode':'six_sparse_regional_point_samples',
                   'sample_tiles':POWER_TILES, 'records_per_tile':tile_counts,
                   'request_mode':'point_json', 'request_urls':sources,
                   'selected_source_day':selected_day,
                   'observation_age_days':(now().date() - dt.datetime.strptime(selected_day,'%Y%m%d').date()).days})


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
    # T2M is a supported daily air-temperature measurement, not skin/surface temperature.
    # The dataset name and metadata therefore state the actual variable precisely.
    power_points('land', 'near_surface_air_temperature', 'T2M', 'degree_C',
                 'NASA POWER daily temperature at 2 metres, AG community; reanalysis-derived near-surface air temperature, not land-surface skin temperature or a station observation.', 'AG')

def water_ice():
    # PRECTOTCORR is the observationally corrected daily precipitation field.
    power_points('water_ice', 'corrected_precipitation', 'PRECTOTCORR', 'mm/day',
                 'NASA POWER daily observationally corrected precipitation, AG community; precipitation forcing, not flood extent, groundwater, or reservoir level.', 'AG')

def energy_humanity():
    power_points('energy_humanity', 'surface_solar_radiation', 'ALLSKY_SFC_SW_DWN', 'kWh/m^2/day',
                 'NASA POWER daily all-sky surface shortwave downward irradiance, RE community.', 'RE')


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
