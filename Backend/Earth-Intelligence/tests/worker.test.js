import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const request = (path, options = {}) => new Request(`https://api.example.test${path}`, options);

async function body(response) {
  return response.json();
}

test('health reports the single D1 binding state and retention', async () => {
  const response = await worker.fetch(request('/health'), {});
  const data = await body(response);
  assert.equal(response.status, 200);
  assert.equal(data.ok, false);
  assert.equal(data.database, 'missing');
  assert.equal(data.retentionDays, 365);
  assert.deepEqual(data.connectedWorlds, ['earth-activity']);
});

test('health verifies that the D1 binding can answer a query', async () => {
  const fakeDb = { prepare(sql) { assert.equal(sql, 'SELECT 1 AS ok'); return { async first() { return { ok: 1 }; } }; } };
  const response = await worker.fetch(request('/health'), { EARTH_INTELLIGENCE_DB: fakeDb });
  const data = await body(response);
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.database, 'connected');
});

test('health does not report a broken D1 binding as connected', async () => {
  const fakeDb = { prepare() { return { async first() { throw new Error('database unavailable'); } }; } };
  const response = await worker.fetch(request('/health'), { EARTH_INTELLIGENCE_DB: fakeDb });
  const data = await body(response);
  assert.equal(response.status, 503);
  assert.equal(data.ok, false);
  assert.equal(data.database, 'error');
});

test('world catalogue lists all six worlds and only Earth Activity as connected', async () => {
  const response = await worker.fetch(request('/v1/worlds'), {});
  const data = await body(response);
  assert.equal(response.status, 200);
  assert.equal(data.worlds.length, 6);
  assert.equal(data.worlds.filter(world => world.connected).length, 1);
  assert.equal(data.worlds.find(world => world.id === 'earth-activity').connected, true);
});

test('unconnected worlds clearly remain awaiting a source', async () => {
  const response = await worker.fetch(request('/v1/worlds/oceans?period=7d'), {});
  const data = await body(response);
  assert.equal(response.status, 200);
  assert.equal(data.available, false);
  assert.equal(data.status, 'awaiting-source');
  assert.equal(data.data, null);
});

test('unsupported period is rejected without querying D1', async () => {
  const response = await worker.fetch(request('/v1/worlds/earth-activity?period=30d'), {});
  const data = await body(response);
  assert.equal(response.status, 400);
  assert.match(data.error, /1d, 7d or 1y/);
});

test('unknown world is rejected', async () => {
  const response = await worker.fetch(request('/v1/worlds/unknown?period=7d'), {});
  assert.equal(response.status, 404);
});

test('Earth Activity reports a missing D1 binding as a service error', async () => {
  const response = await worker.fetch(request('/v1/worlds/earth-activity?period=7d'), {});
  const data = await body(response);
  assert.equal(response.status, 503);
  assert.match(data.error, /database is not configured/i);
});

test('browser CORS is restricted to the configured app origin', async () => {
  const allowed = await worker.fetch(request('/health', { headers: { Origin: 'https://app.example.test' } }), {
    APP_ORIGIN: 'https://app.example.test'
  });
  const blocked = await worker.fetch(request('/health', { headers: { Origin: 'https://other.example.test' } }), {
    APP_ORIGIN: 'https://app.example.test'
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example.test');
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('write methods are not exposed', async () => {
  const response = await worker.fetch(request('/v1/worlds', { method: 'POST' }), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, OPTIONS');
});

test('Earth Activity returns bounded source observations and server comparison values', async () => {
  const fakeDb = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async all() {
              if (sql.includes('SELECT id, observed_at')) {
                return { results: [{
                  id: 'usgs:test-1', observed_at: '2026-11-17T00:00:00.000Z', value: 4.2,
                  latitude: 10, longitude: 20,
                  payload_json: JSON.stringify({ place: 'Test location', depthKm: 12, url: 'https://example.test/event' })
                }] };
              }
              if (sql.includes('SELECT COUNT(*) AS count') && sql.includes('observed_at < ?')) {
                return { results: [{ count: 3 }] };
              }
              if (sql.includes('SELECT COUNT(*) AS count')) return { results: [{ count: 5 }] };
              if (sql.includes('SELECT MAX(value)')) {
                return { results: [{ maximum: 4.2, latest: '2026-11-17T00:00:00.000Z' }] };
              }
              if (sql.includes('GROUP BY substr')) {
                return { results: [{ date: new Date().toISOString().slice(0, 10), count: 5 }] };
              }
              assert.fail(`Unexpected SQL in test: ${sql} (${values.length} bindings)`);
            }
          };
        }
      };
    }
  };
  const response = await worker.fetch(request('/v1/worlds/earth-activity?period=7d'), {
    EARTH_INTELLIGENCE_DB: fakeDb
  });
  const data = await body(response);
  assert.equal(response.status, 200);
  assert.equal(data.available, true);
  assert.equal(data.data.recordCount, 5);
  assert.equal(data.data.previousRecordCount, 3);
  assert.equal(data.data.changePercent, 66.7);
  assert.equal(data.data.events.length, 1);
  assert.equal(data.data.events[0].place, 'Test location');
});

test('one-year responses do not claim a comparison beyond the retention horizon', async () => {
  const fakeDb = {
    prepare(sql) {
      return {
        bind() {
          return {
            async all() {
              if (sql.includes('SELECT id, observed_at')) return { results: [] };
              if (sql.includes('SELECT COUNT(*) AS count')) return { results: [{ count: 0 }] };
              if (sql.includes('SELECT MAX(value)')) return { results: [{ maximum: null, latest: null }] };
              if (sql.includes('GROUP BY substr')) return { results: [] };
              assert.fail(`Unexpected SQL in test: ${sql}`);
            }
          };
        }
      };
    }
  };
  const response = await worker.fetch(request('/v1/worlds/earth-activity?period=1y'), {
    EARTH_INTELLIGENCE_DB: fakeDb
  });
  const data = await body(response);
  assert.equal(response.status, 200);
  assert.equal(data.data.comparisonAvailable, false);
  assert.equal(data.data.previousRecordCount, null);
});
