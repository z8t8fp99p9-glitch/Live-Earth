/* LIVE // EARTH — Direct Public Camera Sources
   Browser-only adapters. No backend, API secret, paid session, scraping of private
   pages, or proxy. Each source fails independently; records are not cached as live.
   Enabled providers: Fintraffic Digitraffic, Hong Kong DATA.GOV.HK, and
   Singapore data.gov.sg. Caltrans and TfL are deferred pending terms/API setup. */
(() => {
  'use strict';
  if (window.LiveEarthPublicCameraSources) return;

  const SOURCES = {
    digitraffic: {
      label: 'Fintraffic weather cameras',
      attribution: 'Fintraffic / Digitraffic',
      creditUrl: 'https://www.digitraffic.fi/en/road-traffic/',
      pageUrl: 'https://www.digitraffic.fi/en/road-traffic/',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      refresh: 600
    },
    hongkong: {
      label: 'Transport Department, HKSAR Government',
      attribution: 'Transport Department, HKSAR Government via DATA.GOV.HK',
      creditUrl: 'https://data.gov.hk/en/',
      pageUrl: 'https://www.hkemobility.gov.hk/en/traffic-information/live/cctv',
      licenseUrl: 'https://data.gov.hk/en/terms-and-conditions',
      refresh: 120
    },
    singapore: {
      label: 'LTA / data.gov.sg',
      attribution: 'Land Transport Authority via data.gov.sg',
      creditUrl: 'https://data.gov.sg/datasets/d_6cdb6b405b25aaaacbaf7689bcc6fae0/view',
      pageUrl: 'https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic-cameras.html',
      licenseUrl: 'https://data.gov.sg/open-data-licence',
      refresh: 60
    },
  };

  const safeUrl = value => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) { return ''; }
  };
  const escText = value => String(value || '').replace(/[_\s]+/g, ' ').trim();
  const bboxContains = (bbox, lat, lon) => {
    if (!bbox) return true;
    const p = String(bbox).split(',').map(Number);
    if (p.length !== 4 || p.some(n => !Number.isFinite(n))) return true;
    return lon >= p[0] && lat >= p[1] && lon <= p[2] && lat <= p[3];
  };
  const normalize = (raw) => {
    const source = SOURCES[raw.source];
    const image = safeUrl(raw.image_url);
    const video = safeUrl(raw.stream_url);
    if (!raw.id || (!image && !video)) return null;
    const isVideo = !!video;
    const item = {
      id: `public:${raw.source}:${raw.native_id || raw.id}`,
      name: raw.name || 'Public camera',
      title: raw.name || 'Public camera',
      city: raw.locality || '',
      region: raw.region || '',
      country: raw.country || '',
      lat: Number(raw.lat),
      lon: Number(raw.lon),
      location: [raw.locality, raw.region, raw.country].filter(Boolean).join(', '),
      category: raw.category || (raw.kind === 'weather' ? 'weather' : 'city'),
      is_free: true,
      live: raw.provider_state !== 'down',
      feed_kind: isVideo ? 'public_video' : 'public_snapshot',
      provider_refresh_sec: raw.refresh_sec || source.refresh,
      source_id: raw.source,
      source_url: source.pageUrl,
      publisher_url: source.pageUrl,
      website: source.pageUrl,
      public_stream_url: video || '',
      preview_url: image || '',
      frame_ts: raw.frame_ts || undefined,
      view: image ? { render: 'image', hosted: 'source', url_type: 'image', url: image } : { render: 'none' },
      redistribution: {
        preview_embed: !!image,
        frame_reuse: image ? 'fetch-from-source' : 'none',
        attribution: {
          required: true,
          name: source.attribution,
          url: source.creditUrl
        }
      },
      public_source_license_url: source.licenseUrl,
      public_source_label: source.label
    };
    return item;
  };

  async function fetchWithTimeout(url, options = {}, timeout = 14000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        mode: 'cors', credentials: 'omit', cache: 'no-store',
        signal: controller.signal, ...options
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally { clearTimeout(timer); }
  }

  async function digitraffic() {
    const url = 'https://tie.digitraffic.fi/api/weathercam/v1/stations';
    const response = await fetchWithTimeout(url, {
      headers: { Accept: 'application/geo+json, application/json', 'Digitraffic-User': 'LIVE-EARTH-public-camera-viewer' }
    }, 18000);
    const geo = await response.json();
    const out = [];
    for (const feature of geo.features || []) {
      const p = feature.properties || {};
      const [lon, lat] = feature.geometry?.coordinates || [];
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) continue;
      if (String(p.collectionStatus || '').toUpperCase() !== 'GATHERING') continue;
      for (const preset of p.presets || []) {
        if (preset.inCollection !== true || !preset.id) continue;
        out.push({
          source: 'digitraffic', native_id: preset.id, id: preset.id,
          name: `${escText(p.name) || 'Finland weather camera'} · ${String(preset.id).slice(-2)}`,
          lat: Number(lat), lon: Number(lon), country: 'Finland', region: 'Finland',
          locality: '', category: 'weather',
          image_url: `https://weathercam.digitraffic.fi/${encodeURIComponent(preset.id)}.jpg`,
          stream_url: '', refresh_sec: 600, provider_state: 'up'
        });
      }
    }
    return out;
  }

  async function hongkong() {
    const url = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml';
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/xml, text/xml' } }, 18000);
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Camera location XML could not be parsed');
    return [...doc.querySelectorAll('image')].map(node => {
      const get = tag => node.querySelector(tag)?.textContent?.trim() || '';
      const id = get('key'), image = safeUrl(get('url'));
      const lat = Number(get('latitude')), lon = Number(get('longitude'));
      if (!id || !image || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        source: 'hongkong', native_id: id, id, name: get('description') || `Hong Kong traffic camera ${id}`,
        lat, lon, country: 'Hong Kong', region: get('region'), locality: get('district'),
        category: 'city', image_url: image, stream_url: '', refresh_sec: 120, provider_state: 'up'
      };
    }).filter(Boolean);
  }

  async function singapore() {
    const url = 'https://api.data.gov.sg/v1/transport/traffic-images';
    const response = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 18000);
    const json = await response.json();
    const item = json.items?.[0];
    const timestamp = item?.timestamp || '';
    return (item?.cameras || []).map(camera => {
      const lat = Number(camera.location?.latitude), lon = Number(camera.location?.longitude);
      const image = safeUrl(camera.image);
      if (!camera.camera_id || !image || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        source: 'singapore', native_id: String(camera.camera_id), id: String(camera.camera_id),
        name: `Singapore traffic camera ${camera.camera_id}`, lat, lon,
        country: 'Singapore', region: 'Singapore', locality: '',
        category: 'city', image_url: image, stream_url: '', frame_ts: timestamp,
        refresh_sec: 60, provider_state: 'up'
      };
    }).filter(Boolean);
  }

  // Only providers with a no-account public endpoint and sufficiently clear
  // reuse terms are enabled in the Pages-only build. Caltrans and TfL adapters
  // remain deliberately disabled pending their portal conditions/API registration.
  const providers = [
    ['digitraffic', digitraffic, 300],
    ['hongkong', hongkong, 90],
    ['singapore', singapore, 45]
  ];
  const memoryCache = new Map();

  async function search({ category = '', query = '', bbox = '', limit = 24 } = {}) {
    const diagnostics = {};
    const categoryId = String(category || '').toLowerCase();
    const selectedProviders = categoryId === 'weather'
      ? providers.filter(([id]) => id === 'digitraffic')
      : ['surf','wildlife','mountains','night-skies'].includes(categoryId)
        ? [] : providers;
    const results = await Promise.allSettled(selectedProviders.map(async ([id, fn, ttl]) => {
      const started = Date.now();
      try {
        const cached = memoryCache.get(id);
        let rows;
        if (cached && Date.now() - cached.at < ttl * 1000) {
          rows = cached.rows;
        } else {
          rows = await fn();
          memoryCache.set(id, { at: Date.now(), rows });
        }
        diagnostics[id] = { ok: true, rows: rows.length, ms: Date.now() - started, cached: !!cached && rows === cached.rows };
        return rows;
      } catch (error) {
        diagnostics[id] = { ok: false, rows: 0, ms: Date.now() - started, error: error?.message || 'Request failed (CORS, network or provider error).' };
        return [];
      }
    }));
    const all = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    const normalized = all.map(normalize).filter(Boolean);
    const q = String(query || '').trim().toLowerCase();
    const filtered = normalized.filter(camera => {
      if (bbox && !bboxContains(bbox, camera.lat, camera.lon)) return false;
      if (categoryId === 'weather' && camera.category !== 'weather') return false;
      if (['surf','wildlife','mountains','night-skies'].includes(categoryId)) return false;
      if (['cities','city'].includes(categoryId) && camera.category !== 'city') return false;
      if (q) {
        const haystack = `${camera.name} ${camera.city} ${camera.region} ${camera.country} ${camera.public_source_label}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).slice(0, Math.max(1, Math.min(48, Number(limit) || 24)));
    return { items: filtered, diagnostics };
  }

  window.LiveEarthPublicCameraSources = Object.freeze({ search, providers: providers.map(([id]) => id) });
})();
