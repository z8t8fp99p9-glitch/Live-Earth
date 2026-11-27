/* LIVE // EARTH — Global geostationary satellite imagery access.
   Discovers the multi-mission Geostationary Ring Natural Color / IR layers
   from public WMS capabilities instead of guessing provider layer IDs.
   The ring combines GOES, Meteosat and Himawari observations. The published
   composite cadence is approximately 3 hours, not minute-by-minute.
*/
const PROVIDERS = Object.freeze([
  {
    id: 'eumetview',
    endpoint: 'https://view.eumetsat.int/geoserver/wms',
    version: '1.1.1',
    matches: {
      natural: [
        /geostationary ring.*natural colou?r/i,
        /natural colou?r.*geostationary ring/i,
        /wideareacoverage.*rgb.*natural/i,
        /EUMETSAT_RING_Natural_Color_RGB/i
      ],
      infrared: [
        /geostationary ring.*infrared/i,
        /infrared.*geostationary ring/i,
        /wideareacoverage.*ir108/i,
        /EUMETSAT_RING_IR108/i
      ]
    }
  },
  {
    id: 'nasa-gibs',
    endpoint: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
    version: '1.1.1',
    matches: {
      natural: [/EUMETSAT_RING_Natural_Color_RGB/i],
      infrared: [/EUMETSAT_RING_IR108/i]
    }
  }
]);

const FRAME_STEP_HOURS = 3;
const MAX_FALLBACK_HOURS = 12;
const MAX_OBSERVATION_AGE_MS = 12 * 60 * 60 * 1000;
const capabilityCache = new Map();
const resolvedLayerCache = new Map();

function makeUrl(endpoint, values) {
  return `${endpoint}?${new URLSearchParams(values).toString()}`;
}

function parseTime(value) {
  const result = Date.parse(String(value || '').trim());
  return Number.isFinite(result) ? result : NaN;
}

function collectTimes(text) {
  const result = [];
  for (const token of String(text || '').split(',').map(value => value.trim()).filter(Boolean)) {
    const parts = token.split('/');
    if (parts.length === 1) {
      const time = parseTime(parts[0]);
      if (Number.isFinite(time)) result.push(time);
      continue;
    }
    const start = parseTime(parts[0]);
    const end = parseTime(parts[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    result.push(end);
    const stepMatch = (parts[2] || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
    if (stepMatch) {
      const stepMs = (Number(stepMatch[1] || 0) * 60 + Number(stepMatch[2] || 0)) * 60000;
      if (stepMs > 0) {
        for (let cursor = end; cursor >= start && result.length < 12000; cursor -= stepMs) {
          result.push(cursor);
        }
      }
    }
  }
  return result;
}

async function loadCapabilities(provider, signal, forceRefresh = false) {
  if (forceRefresh) capabilityCache.delete(provider.id);
  if (capabilityCache.has(provider.id)) return capabilityCache.get(provider.id);
  const request = (async () => {
    const url = makeUrl(provider.endpoint, {
      SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetCapabilities'
    });
    const response = await fetch(url, {
      mode: 'cors', credentials: 'omit', cache: 'no-store', signal
    });
    if (!response.ok) throw new Error(`${provider.id} WMS capabilities returned ${response.status}.`);
    const text = await response.text();
    if (!text || !/<(?:\w+:)?WMS_Capabilities\b/i.test(text)) {
      throw new Error(`${provider.id} returned an unreadable WMS capabilities document.`);
    }
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error(`${provider.id} WMS capabilities XML could not be parsed.`);
    return xml;
  })();
  capabilityCache.set(provider.id, request);
  try {
    return await request;
  } catch (error) {
    capabilityCache.delete(provider.id);
    throw error;
  }
}

function layerText(node, tag) {
  const child = [...node.children].find(item => item.localName === tag);
  return child?.textContent?.trim() || '';
}

function findTimeDomain(node) {
  const nodes = [...node.getElementsByTagName('*')].filter(item => {
    const local = item.localName;
    return (local === 'Dimension' || local === 'Extent')
      && (item.getAttribute('name') || '').toLowerCase() === 'time';
  });
  return nodes.flatMap(item => collectTimes(item.textContent));
}

async function discoverLayer(mode, signal, forceRefresh = false) {
  if (forceRefresh) resolvedLayerCache.delete(mode);
  if (resolvedLayerCache.has(mode)) return resolvedLayerCache.get(mode);
  const failures = [];

  for (const provider of PROVIDERS) {
    try {
      const xml = await loadCapabilities(provider, signal, forceRefresh);
      const layers = [...xml.getElementsByTagName('*')].filter(node => node.localName === 'Layer');
      const matchers = provider.matches[mode];
      const candidates = layers.map(node => ({
        node,
        name: layerText(node, 'Name'),
        title: layerText(node, 'Title')
      })).filter(item => item.name && matchers.some(pattern =>
        pattern.test(item.name) || pattern.test(item.title)
      ));

      if (!candidates.length) {
        failures.push(`${provider.id}: no matching global ${mode} layer`);
        continue;
      }

      const chosen = candidates[0];
      const discovered = {
        provider,
        name: chosen.name,
        title: chosen.title || chosen.name,
        times: findTimeDomain(chosen.node)
      };
      resolvedLayerCache.set(mode, discovered);
      return discovered;
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') throw error;
      failures.push(`${provider.id}: ${error?.message || 'unavailable'}`);
    }
  }

  throw new Error(`No public global geostationary ${mode} imagery layer was discovered. ${failures.join(' · ')}`);
}

export async function discoverRecentTimes({ mode = 'natural', limit = 1, signal } = {}) {
  const layer = await discoverLayer(mode, signal, true);
  const now = Date.now();
  const recent = [...new Set(layer.times)]
    .filter(value => Number.isFinite(value)
      && value <= now + 5 * 60 * 1000
      && value >= now - MAX_OBSERVATION_AGE_MS)
    .sort((a, b) => b - a)
    .slice(0, Math.max(1, limit));

  if (recent.length) return recent.map(value => new Date(value).toISOString());

  // Some WMS servers omit the time dimension from capabilities. Probe only
  // the documented 3-hour composite cadence, with a strict 72-hour lookback.
  const step = FRAME_STEP_HOURS * 60 * 60 * 1000;
  const latestSlot = Math.floor(now / step) * step;
  const fallback = [];
  for (let offset = 0; offset <= MAX_FALLBACK_HOURS && fallback.length < limit; offset += FRAME_STEP_HOURS) {
    fallback.push(new Date(latestSlot - offset * 60 * 60 * 1000).toISOString());
  }
  return fallback;
}

export async function fetchGlobalCloudFrame({ mode = 'natural', time, signal, fetchImageBlob } = {}) {
  if (mode !== 'natural' && mode !== 'infrared') throw new TypeError(`Unsupported satellite imagery mode: ${mode}`);
  if (typeof fetchImageBlob !== 'function') throw new TypeError('The shared image fetch validator is unavailable.');
  if (!time || !Number.isFinite(Date.parse(time))) throw new TypeError('A valid satellite observation time is required.');

  const layer = await discoverLayer(mode, signal);
  const url = makeUrl(layer.provider.endpoint, {
    SERVICE: 'WMS',
    VERSION: layer.provider.version,
    REQUEST: 'GetMap',
    LAYERS: layer.name,
    STYLES: '',
    SRS: 'EPSG:4326',
    BBOX: '-180,-90,180,90',
    WIDTH: '1536',
    HEIGHT: '768',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    TIME: time
  });
  const result = await fetchImageBlob(url, 24000, signal);
  return {
    ...result,
    time,
    layer: layer.name,
    title: layer.title,
    provider: layer.provider.id,
    mode
  };
}
