const WORLDS = new Set([
  'atmosphere', 'oceans', 'land', 'water-ice', 'earth-activity', 'energy-humanity'
]);
const LABELS = {
  atmosphere: 'Atmosphere',
  oceans: 'Oceans',
  land: 'Land',
  'water-ice': 'Water & Ice',
  'earth-activity': 'Earth Activity',
  'energy-humanity': 'Energy & Humanity'
};
const CONNECTED_WORLDS = new Set(['earth-activity']);
const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';
const DAY_MS = 86_400_000;
const RETENTION_DAYS = 365;
const MAX_EVENTS = 100;
const INSERT_BATCH_SIZE = 50;

const nowIso = () => new Date().toISOString();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers
  }
});

function withCors(request, env, response) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get('Origin');
  const allowedOrigin = String(env.APP_ORIGIN || '').trim().replace(/\/$/, '');
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  if (origin && allowedOrigin && origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function periodMs(period) {
  if (period === '1d') return DAY_MS;
  if (period === '7d') return 7 * DAY_MS;
  if (period === '1y') return RETENTION_DAYS * DAY_MS;
  return null;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeCoordinate(value) {
  return isFiniteNumber(value) ? value : null;
}

async function collectUSGS(env) {
  const db = env.EARTH_INTELLIGENCE_DB;
  if (!db) throw new Error('D1 binding EARTH_INTELLIGENCE_DB is not configured.');

  const runId = crypto.randomUUID();
  const startedAt = nowIso();
  let received = 0;
  let inserted = 0;
  let skipped = 0;

  await db.prepare(`INSERT INTO ingestion_runs
    (id, source_id, started_at, status, records_received, records_inserted)
    VALUES (?, 'usgs-comcat', ?, 'running', 0, 0)`)
    .bind(runId, startedAt).run();

  try {
    const response = await fetch(USGS_URL, {
      headers: { accept: 'application/geo+json, application/json' },
      signal: AbortSignal.timeout(25_000)
    });
    if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}.`);

    const feed = await response.json();
    if (feed?.type !== 'FeatureCollection' || !Array.isArray(feed.features)) {
      throw new Error('USGS response was not a GeoJSON FeatureCollection.');
    }
    received = feed.features.length;
    const stamp = nowIso();

    await db.prepare(`INSERT INTO sources
      (id, name, provider, source_url, attribution, status, created_at, updated_at)
      VALUES ('usgs-comcat', 'USGS Earthquake Hazards Program', 'USGS', ?,
        'USGS Earthquake Hazards Program', 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, status = 'active'`)
      .bind(USGS_URL, stamp, stamp).run();

    const statements = [];
    const retentionCutoff = Date.now() - RETENTION_DAYS * DAY_MS;
    for (const feature of feed.features) {
      const properties = feature?.properties || {};
      const coordinates = feature?.geometry?.coordinates || [];
      const observedMs = properties.time;
      const magnitude = properties.mag;
      if (!feature?.id || !isFiniteNumber(observedMs) || !isFiniteNumber(magnitude)) {
        skipped++;
        continue;
      }
      if (observedMs < retentionCutoff) continue;

      const latitude = normalizeCoordinate(coordinates[1]);
      const longitude = normalizeCoordinate(coordinates[0]);
      const depthKm = normalizeCoordinate(coordinates[2]);
      const observedAt = new Date(observedMs).toISOString();
      const rowId = `usgs:${feature.id}`;
      const payload = {
        place: typeof properties.place === 'string' ? properties.place : null,
        depthKm,
        status: typeof properties.status === 'string' ? properties.status : null,
        url: typeof properties.url === 'string' ? properties.url : USGS_URL,
        tsunami: properties.tsunami === 1,
        magnitudeType: typeof properties.magType === 'string' ? properties.magType : null
      };

      statements.push(db.prepare(`INSERT OR IGNORE INTO observations_raw
        (id, world_id, source_id, source_record_id, signal_id, observed_at, ingested_at,
         latitude, longitude, region_code, value, unit, quality_flag, payload_json)
        VALUES (?, 'earth-activity', 'usgs-comcat', ?, 'earthquake-magnitude', ?, ?,
          ?, ?, NULL, ?, 'magnitude', 'accepted', ?)`)
        .bind(rowId, String(feature.id), observedAt, stamp, latitude, longitude,
          magnitude, JSON.stringify(payload)));
    }

    for (let index = 0; index < statements.length; index += INSERT_BATCH_SIZE) {
      const batch = statements.slice(index, index + INSERT_BATCH_SIZE);
      const results = await db.batch(batch);
      for (const result of results) inserted += Number(result.meta?.changes || 0);
    }

    const finishedAt = nowIso();
    await db.prepare(`UPDATE ingestion_runs SET finished_at = ?, status = 'success',
      records_received = ?, records_inserted = ? WHERE id = ?`)
      .bind(finishedAt, received, inserted, runId).run();

    return {
      source: 'USGS Earthquake Hazards Program',
      received,
      inserted,
      skipped,
      feedGeneratedAt: isFiniteNumber(feed.metadata?.generated)
        ? new Date(feed.metadata.generated).toISOString()
        : null
    };
  } catch (error) {
    const finishedAt = nowIso();
    await db.prepare(`UPDATE ingestion_runs SET finished_at = ?, status = 'failed',
      records_received = ?, records_inserted = ?, error_summary = ? WHERE id = ?`)
      .bind(finishedAt, received, inserted, String(error?.message || error).slice(0, 500), runId)
      .run().catch(() => {});
    throw error;
  }
}

async function getWorld(env, world, period) {
  const duration = periodMs(period);
  if (!duration) return json({
    ok: false,
    error: 'Period must be 1d, 7d or 1y.'
  }, 400);

  if (!CONNECTED_WORLDS.has(world)) {
    return json({
      ok: true,
      world,
      title: LABELS[world],
      available: false,
      status: 'awaiting-source',
      period,
      retentionDays: RETENTION_DAYS,
      data: null
    });
  }

  const db = env.EARTH_INTELLIGENCE_DB;
  if (!db) return json({ ok: false, error: 'Central database is not configured.' }, 503);

  const now = Date.now();
  const cutoff = new Date(now - duration).toISOString();
  const previousCutoff = new Date(now - duration * 2).toISOString();
  const currentCutoff = cutoff;
  const comparisonAvailable = period !== '1y';

  const queries = [
    db.prepare(`SELECT id, observed_at, value, latitude, longitude, payload_json
      FROM observations_raw WHERE world_id = ? AND observed_at >= ?
      ORDER BY observed_at DESC LIMIT ?`).bind(world, cutoff, MAX_EVENTS),
    db.prepare(`SELECT COUNT(*) AS count FROM observations_raw
      WHERE world_id = ? AND observed_at >= ?`).bind(world, cutoff),
    db.prepare(`SELECT MAX(value) AS maximum, MAX(observed_at) AS latest
      FROM observations_raw WHERE world_id = ? AND observed_at >= ?`).bind(world, cutoff),
    db.prepare(`SELECT substr(observed_at, 1, 10) AS date, COUNT(*) AS count
      FROM observations_raw WHERE world_id = ? AND observed_at >= ?
      GROUP BY substr(observed_at, 1, 10)`).bind(world, cutoff)
  ];
  if (comparisonAvailable) {
    queries.push(db.prepare(`SELECT COUNT(*) AS count FROM observations_raw
      WHERE world_id = ? AND observed_at >= ? AND observed_at < ?`)
      .bind(world, previousCutoff, currentCutoff));
  }

  const results = await Promise.all(queries.map(statement => statement.all()));
  const [rowsResult, countResult, summaryResult, timelineResult] = results;
  const previousResult = comparisonAvailable ? results[4] : null;
  const records = rowsResult.results || [];
  const summary = summaryResult.results?.[0] || {};
  const events = records.map(row => {
    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { /* Keep the observation usable. */ }
    return {
      id: row.id,
      time: row.observed_at,
      magnitude: Number(row.value),
      latitude: row.latitude,
      longitude: row.longitude,
      place: payload.place || 'Location not supplied',
      depthKm: payload.depthKm ?? null,
      status: payload.status || 'catalogued',
      url: payload.url || USGS_URL,
      tsunami: payload.tsunami === true
    };
  });

  const counts = new Map((timelineResult.results || []).map(row => [row.date, Number(row.count) || 0]));
  const timeline = [];
  const days = Math.ceil(duration / DAY_MS);
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(now - offset * DAY_MS).toISOString().slice(0, 10);
    timeline.push({ date, count: counts.get(date) || 0 });
  }

  const recordCount = Number(countResult.results?.[0]?.count || 0);
  const previousRecordCount = comparisonAvailable
    ? Number(previousResult?.results?.[0]?.count || 0)
    : null;
  const changePercent = previousRecordCount === null
    ? null
    : previousRecordCount === 0
      ? (recordCount === 0 ? 0 : null)
      : Math.round(((recordCount - previousRecordCount) / previousRecordCount) * 1000) / 10;

  return json({
    ok: true,
    world,
    title: LABELS[world],
    available: true,
    status: 'published',
    period,
    generatedAt: nowIso(),
    retentionDays: RETENTION_DAYS,
    data: {
      source: 'USGS Earthquake Hazards Program',
      sourceUrl: USGS_URL,
      recordCount,
      largestMagnitude: summary.maximum == null ? null : Number(summary.maximum),
      latestObservationAt: summary.latest || null,
      previousRecordCount,
      changePercent,
      comparisonAvailable,
      events,
      timeline
    }
  });
}

async function cleanup(env) {
  const db = env.EARTH_INTELLIGENCE_DB;
  if (!db) throw new Error('D1 binding EARTH_INTELLIGENCE_DB is not configured.');
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
  await db.batch([
    db.prepare('DELETE FROM observations_raw WHERE observed_at < ?').bind(cutoff),
    db.prepare('DELETE FROM ingestion_runs WHERE started_at < ?').bind(cutoff)
  ]);
  return { retentionDays: RETENTION_DAYS, cutoff };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;

    if (request.method === 'OPTIONS') {
      response = new Response(null, { status: 204 });
    } else if (request.method !== 'GET') {
      response = json({ ok: false, error: 'Method not allowed.' }, 405, { allow: 'GET, OPTIONS' });
    } else if (url.pathname === '/health') {
      let database = 'missing';
      if (env.EARTH_INTELLIGENCE_DB) {
        try {
          await env.EARTH_INTELLIGENCE_DB.prepare('SELECT 1 AS ok').first();
          database = 'connected';
        } catch (error) {
          console.error('[LIVE // EARTH] D1 health check failed:', error?.message || error);
          database = 'error';
        }
      }
      response = json({
        ok: database === 'connected',
        service: 'live-earth-intelligence-api',
        database,
        connectedWorlds: [...CONNECTED_WORLDS],
        retentionDays: RETENTION_DAYS,
        time: nowIso()
      }, database === 'error' ? 503 : 200);
    } else if (url.pathname === '/v1/worlds') {
      response = json({
        ok: true,
        worlds: [...WORLDS].map(id => ({
          id,
          title: LABELS[id],
          connected: CONNECTED_WORLDS.has(id)
        })),
        retentionDays: RETENTION_DAYS
      });
    } else {
      const match = url.pathname.match(/^\/v1\/worlds\/([a-z-]+)$/);
      if (!match || !WORLDS.has(match[1])) {
        response = json({ ok: false, error: 'World not found.' }, 404);
      } else {
        try {
          response = await getWorld(env, match[1], url.searchParams.get('period') || '7d');
        } catch (error) {
          console.error('[LIVE // EARTH] API query failed:', error?.message || error);
          response = json({ ok: false, error: 'Central database query failed.' }, 500);
        }
      }
    }

    return withCors(request, env, response);
  },

  async scheduled(controller, env) {
    let result;
    if (controller.cron === '17 * * * *') {
      result = await collectUSGS(env);
    } else if (controller.cron === '31 3 * * *') {
      result = await cleanup(env);
    } else {
      console.warn('[LIVE // EARTH] Unknown scheduled trigger:', controller.cron);
      return;
    }
    console.log('[LIVE // EARTH] Scheduled task completed:', JSON.stringify({
      cron: controller.cron,
      ...result
    }));
  }
};
