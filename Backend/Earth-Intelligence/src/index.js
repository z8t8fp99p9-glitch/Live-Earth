const WORLD_IDS = new Set([
  'atmosphere', 'oceans', 'land', 'water-ice', 'earth-activity', 'energy-humanity'
]);
const WORLD_LABELS = {
  atmosphere: 'Atmosphere', oceans: 'Oceans', land: 'Land',
  'water-ice': 'Water & Ice', 'earth-activity': 'Earth Activity',
  'energy-humanity': 'Energy & Humanity'
};
const MAX_BODY_BYTES = 1_000_000;
const MAX_INGEST_BATCH = 500;
const MAX_RETENTION_DAYS = 365;
const isoNow = () => new Date().toISOString();
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});
const error = (message, status = 400) => json({ ok: false, error: message }, status);
const makeId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.APP_ORIGIN || '').trim();
  const headers = { 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' };
  if (origin && allowed && origin === allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) throw new Error('Request body is too large.');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error('Request body is too large.');
  try { return JSON.parse(text); } catch { throw new Error('Request body must be valid JSON.'); }
}
function requireAdmin(request, env) {
  const expected = env.INGEST_TOKEN;
  if (!expected) return false;
  const supplied = request.headers.get('Authorization') || '';
  return supplied === `Bearer ${expected}`;
}
function validIsoDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function validText(value, max = 300) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
async function getPublishedWorld(db, worldId) {
  const row = await db.prepare(
    `SELECT world_id, version, published_at, valid_until, payload_json
       FROM published_snapshots
      WHERE world_id = ? AND status = 'published'
      LIMIT 1`
  ).bind(worldId).first();
  if (!row) return null;
  if (row.valid_until && Date.parse(row.valid_until) < Date.now()) return null;
  let payload;
  try { payload = JSON.parse(row.payload_json); } catch { return null; }
  return { world: worldId, version: row.version, publishedAt: row.published_at, validUntil: row.valid_until, data: payload };
}
async function publicRoutes(request, env, url) {
  const db = env.EARTH_INTELLIGENCE_DB;
  if (!db) return error('Earth Intelligence database binding is not configured.', 503);
  if (url.pathname === '/health') return json({ ok: true, service: 'live-earth-intelligence-api', database: 'bound', time: isoNow() });
  if (url.pathname === '/v1/worlds' && request.method === 'GET') {
    const worlds = await Promise.all([...WORLD_IDS].map(async id => {
      const snapshot = await getPublishedWorld(db, id);
      return { id, title: WORLD_LABELS[id], available: Boolean(snapshot), publishedAt: snapshot?.publishedAt || null };
    }));
    return json({ ok: true, worlds, generatedAt: isoNow() });
  }
  const match = url.pathname.match(/^\/v1\/worlds\/([a-z-]+)$/);
  if (match && request.method === 'GET') {
    const worldId = match[1];
    if (!WORLD_IDS.has(worldId)) return error('Unknown world.', 404);
    const snapshot = await getPublishedWorld(db, worldId);
    if (!snapshot) return json({ ok: true, world: worldId, available: false, data: null });
    return json({ ok: true, available: true, ...snapshot });
  }
  return error('Route not found.', 404);
}
async function registerSource(request, env) {
  const body = await readJson(request);
  if (!body || !validText(body.id, 100) || !validText(body.name, 180) ||
      !validText(body.provider, 120) || !validText(body.sourceUrl, 1000) ||
      !/^https:\/\//i.test(body.sourceUrl)) return error('Source requires id, name, provider and an HTTPS sourceUrl.');
  const now = isoNow();
  await env.EARTH_INTELLIGENCE_DB.prepare(
    `INSERT INTO sources (id,name,provider,source_url,licence,attribution,access_method,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,'pending',?,?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, provider=excluded.provider,
       source_url=excluded.source_url, licence=excluded.licence, attribution=excluded.attribution,
       access_method=excluded.access_method, updated_at=excluded.updated_at`
  ).bind(body.id, body.name.trim(), body.provider.trim(), body.sourceUrl, body.licence || null,
    body.attribution || null, body.accessMethod || 'api', now, now).run();
  return json({ ok: true, sourceId: body.id, status: 'pending', note: 'Source is registered but not approved for collection.' }, 201);
}
async function approveSource(request, env, sourceId) {
  if (!validText(sourceId, 100)) return error('Invalid source ID.');
  const result = await env.EARTH_INTELLIGENCE_DB.prepare(
    `UPDATE sources SET status='active', updated_at=? WHERE id=?`
  ).bind(isoNow(), sourceId).run();
  if (!result.meta?.changes) return error('Source not found.', 404);
  return json({ ok: true, sourceId, status: 'active' });
}
async function verifyEvent(request, env) {
  const body = await readJson(request);
  if (!body || !validText(body.patternId, 120) || !validText(body.title, 140) ||
      !validText(body.summary, 800) || !validIsoDate(body.startsAt) ||
      !Number.isFinite(body.confidence) || body.confidence < 0 || body.confidence > 1 ||
      !Array.isArray(body.sourceIds) || body.sourceIds.length < 1 ||
      !body.evidence || typeof body.evidence !== 'object') return error('Verified event requires a pattern, title, summary, start time, confidence, source IDs and evidence.');
  const db = env.EARTH_INTELLIGENCE_DB;
  const pattern = await db.prepare('SELECT id,world_id,review_status FROM detected_patterns WHERE id=?').bind(body.patternId).first();
  if (!pattern) return error('Pattern candidate not found.', 404);
  for (const sourceId of body.sourceIds) {
    const source = await db.prepare(`SELECT id FROM sources WHERE id=? AND status='active'`).bind(sourceId).first();
    if (!source) return error(`Source ${sourceId} is not approved and active.`);
  }
  const id = makeId('evt'), now = isoNow();
  await db.batch([
    db.prepare(`UPDATE detected_patterns SET review_status='accepted' WHERE id=?`).bind(body.patternId),
    db.prepare(`INSERT INTO verified_events (id,pattern_id,world_id,title,summary,region_label,starts_at,ends_at,confidence,verification_status,source_ids_json,evidence_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,'verified',?,?,?,?)`).bind(id, body.patternId, pattern.world_id, body.title.trim(), body.summary.trim(),
        body.regionLabel || null, body.startsAt, body.endsAt || null, body.confidence, JSON.stringify(body.sourceIds),
        JSON.stringify(body.evidence), now, now),
    db.prepare(`INSERT INTO event_history (id,event_id,recorded_at,state,magnitude,confidence,evidence_json)
      VALUES (?,?,?,'verified',?,?,?)`).bind(makeId('hist'), id, now, body.magnitude ?? null, body.confidence, JSON.stringify(body.evidence))
  ]);
  return json({ ok: true, eventId: id, world: pattern.world_id, verification: 'verified' }, 201);
}
async function detectAnomaly(db, observation) {
  const baseline = await db.prepare(
    `SELECT value FROM observations_normalised
      WHERE world_id=? AND signal_id=? AND COALESCE(region_code,'')=COALESCE(?,'')
        AND observed_at < ? AND observed_at >= datetime(?, '-30 days')
      ORDER BY observed_at DESC LIMIT 120`
  ).bind(observation.worldId, observation.signalId, observation.regionCode || null,
    observation.observedAt, observation.observedAt).all();
  const values = (baseline.results || []).map(row => Number(row.value)).filter(Number.isFinite);
  if (values.length < 20) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1);
  const sd = Math.sqrt(variance);
  if (!Number.isFinite(sd) || sd === 0) return null;
  const z = (observation.value - mean) / sd;
  if (Math.abs(z) < 3) return null;
  const id = makeId('pat');
  const evidence = { method: 'rolling-z-score', baselineCount: values.length, baselineMean: mean,
    baselineStandardDeviation: sd, zScore: z, threshold: 3, note: 'Automated candidate only; not a verified event.' };
  await db.prepare(
    `INSERT INTO detected_patterns (id,world_id,signal_id,pattern_type,region_code,window_start,window_end,magnitude,confidence,evidence_json,detected_at,review_status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'unreviewed')`
  ).bind(id, observation.worldId, observation.signalId, z > 0 ? 'positive-anomaly-candidate' : 'negative-anomaly-candidate',
    observation.regionCode || null, observation.observedAt, observation.observedAt, z, Math.min(0.95, 0.5 + Math.abs(z) / 20),
    JSON.stringify(evidence), isoNow()).run();
  return id;
}
async function ingestObservations(request, env) {
  const body = await readJson(request);
  if (!body || !Array.isArray(body.observations) || body.observations.length < 1 || body.observations.length > MAX_INGEST_BATCH)
    return error(`observations must be an array containing 1-${MAX_INGEST_BATCH} records.`);
  const db = env.EARTH_INTELLIGENCE_DB;
  const accepted = [], rejected = [];
  for (let index = 0; index < body.observations.length; index++) {
    const item = body.observations[index];
    const valid = item && WORLD_IDS.has(item.worldId) && validText(item.sourceId, 100) &&
      validText(item.signalId, 120) && validIsoDate(item.observedAt) && Number.isFinite(item.value) &&
      validText(item.unit, 40) && (item.latitude == null || (Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90)) &&
      (item.longitude == null || (Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180)) &&
      (item.uncertainty == null || (Number.isFinite(item.uncertainty) && item.uncertainty >= 0));
    if (!valid) { rejected.push({ index, reason: 'Invalid world, source, signal, timestamp, value, unit or coordinates.' }); continue; }
    const source = await db.prepare('SELECT id,status FROM sources WHERE id=?').bind(item.sourceId).first();
    if (!source || source.status !== 'active') { rejected.push({ index, reason: 'Source is not registered and active.' }); continue; }
    const id = makeId('obs'), now = isoNow();
    try {
      await db.batch([
        db.prepare(`INSERT INTO observations_raw (id,world_id,source_id,source_record_id,signal_id,observed_at,ingested_at,latitude,longitude,region_code,value,unit,uncertainty,quality_flag,payload_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'accepted',?)`).bind(id, item.worldId, item.sourceId,
            item.sourceRecordId || null, item.signalId, item.observedAt, now, item.latitude ?? null,
            item.longitude ?? null, item.regionCode || null, item.value, item.unit, item.uncertainty ?? null,
            item.sourcePayload == null ? null : JSON.stringify(item.sourcePayload).slice(0, 12000)),
        db.prepare(`INSERT INTO observations_normalised (id,raw_observation_id,world_id,signal_id,observed_at,latitude,longitude,region_code,value,unit,normalisation_version,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(makeId('norm'), id, item.worldId, item.signalId, item.observedAt,
            item.latitude ?? null, item.longitude ?? null, item.regionCode || null, item.value, item.unit, 'identity-v1', now)
      ]);
      const patternId = await detectAnomaly(db, item);
      accepted.push({ index, observationId: id, patternCandidateId: patternId });
    } catch (err) {
      rejected.push({ index, reason: err?.message === 'D1_ERROR: UNIQUE constraint failed: observations_raw.source_id, observations_raw.source_record_id'
        ? 'Duplicate source record.' : 'Database rejected this observation.' });
    }
  }
  return json({ ok: true, received: body.observations.length, accepted: accepted.length, rejected, results: accepted,
    note: 'Detected patterns are candidates only. They are not verified or published automatically.' }, 200);
}
function validatePublishedPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'Payload must be an object.';
  const allowed = new Set(['headline','summary','updatedAt','metrics','events','timeline','coverage','disclaimer']);
  if (Object.keys(payload).some(key => !allowed.has(key))) return 'Payload contains fields that are not approved for public display.';
  if (!validText(payload.headline, 140) || !validText(payload.summary, 800)) return 'A short headline and summary are required.';
  if (!Array.isArray(payload.metrics) || payload.metrics.length > 8 || !Array.isArray(payload.events) || payload.events.length > 5 ||
      !Array.isArray(payload.timeline) || payload.timeline.length > 7) return 'Publisher limits: up to 8 metrics, 5 events and 7 timeline points.';
  for (const metric of payload.metrics) {
    if (!metric || !validText(metric.label, 80) || !Number.isFinite(metric.value) || !validText(metric.unit, 30) ||
      (metric.change != null && !Number.isFinite(metric.change))) return 'A metric contains invalid or missing fields.';
  }
  for (const event of payload.events) {
    if (!event || !validText(event.eventId, 120) || !validText(event.title, 140) || !validText(event.summary, 400) ||
      !validIsoDate(event.startsAt) || !Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1 ||
      event.verification !== 'verified') return 'Only fully verified events may be published.';
  }
  for (const point of payload.timeline) {
    if (!point || !validIsoDate(point.at) || !Number.isFinite(point.value) || !validText(point.unit, 30)) return 'Timeline contains invalid points.';
  }
  if (payload.updatedAt && !validIsoDate(payload.updatedAt)) return 'updatedAt must be an ISO timestamp.';
  return null;
}
async function publishWorld(request, env, worldId) {
  if (!WORLD_IDS.has(worldId)) return error('Unknown world.', 404);
  const body = await readJson(request);
  const issue = validatePublishedPayload(body?.data);
  if (issue) return error(issue);
  const db = env.EARTH_INTELLIGENCE_DB;
  for (const item of body.data.events) {
    const verified = await db.prepare(`SELECT id FROM verified_events WHERE id=? AND world_id=? AND verification_status='verified'`)
      .bind(item.eventId, worldId).first();
    if (!verified) return error(`Event ${item.eventId} is not verified for this world.`);
  }
  const current = await db.prepare('SELECT version FROM published_snapshots WHERE world_id=?').bind(worldId).first();
  const version = (current?.version || 0) + 1;
  const now = isoNow();
  const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  await db.prepare(
    `INSERT INTO published_snapshots (id,world_id,version,published_at,valid_until,payload_json,status)
     VALUES (?,?,?,?,?,?,'published')
     ON CONFLICT(world_id) DO UPDATE SET version=excluded.version,published_at=excluded.published_at,
       valid_until=excluded.valid_until,payload_json=excluded.payload_json,status='published'`
  ).bind(makeId('pub'), worldId, version, now, validUntil, JSON.stringify(body.data)).run();
  return json({ ok: true, world: worldId, version, publishedAt: now, validUntil }, 201);
}
async function adminRoutes(request, env, url) {
  if (!requireAdmin(request, env)) return error('Unauthorised.', 401);
  if (request.method !== 'POST') return error('Method not allowed.', 405);
  if (url.pathname === '/internal/sources') return registerSource(request, env);
  const approveMatch = url.pathname.match(/^\/internal\/sources\/([a-zA-Z0-9_-]+)\/approve$/);
  if (approveMatch) return approveSource(request, env, approveMatch[1]);
  if (url.pathname === '/internal/verify-event') return verifyEvent(request, env);
  if (url.pathname === '/internal/observations') return ingestObservations(request, env);
  const match = url.pathname.match(/^\/internal\/publish\/([a-z-]+)$/);
  if (match) return publishWorld(request, env, match[1]);
  return error('Route not found.', 404);
}
async function cleanupExpired(env) {
  const days = Math.min(MAX_RETENTION_DAYS, Math.max(1, Number(env.RETENTION_DAYS) || MAX_RETENTION_DAYS));
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const db = env.EARTH_INTELLIGENCE_DB;
  // Delete in FK-safe order. The current curated snapshot is intentionally kept,
  // but its public validity window expires independently after six hours.
  await db.batch([
    db.prepare(`DELETE FROM event_history WHERE recorded_at < ?`).bind(cutoff),
    db.prepare(`DELETE FROM verified_events WHERE updated_at < ?`).bind(cutoff),
    db.prepare(`DELETE FROM detected_patterns WHERE detected_at < ? AND id NOT IN (SELECT pattern_id FROM verified_events WHERE pattern_id IS NOT NULL)`).bind(cutoff),
    db.prepare(`DELETE FROM observations_raw WHERE ingested_at < ?`).bind(cutoff),
    db.prepare(`DELETE FROM ingestion_runs WHERE started_at < ?`).bind(cutoff),
    db.prepare(`DELETE FROM published_snapshots WHERE published_at < ?`).bind(cutoff),
    db.prepare(`DELETE FROM sources WHERE updated_at < ? AND id NOT IN (SELECT source_id FROM observations_raw)`).bind(cutoff)
  ]);
  return { retentionDays: days, cutoff };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), request, env);
    let response;
    try {
      if (url.pathname.startsWith('/internal/')) response = await adminRoutes(request, env, url);
      else if (request.method === 'GET') response = await publicRoutes(request, env, url);
      else response = error('Method not allowed.', 405);
    } catch (err) {
      console.error('[Earth Intelligence API]', err?.stack || err);
      response = error('The request could not be completed.', 500);
    }
    return withCors(response, request, env);
  },
  async scheduled(_controller, env) {
    try {
      const result = await cleanupExpired(env);
      console.log('[Earth Intelligence] Retention cleanup complete.', result);
    } catch (err) {
      console.error('[Earth Intelligence] Retention cleanup failed.', err?.stack || err);
      throw err;
    }
  }
};
