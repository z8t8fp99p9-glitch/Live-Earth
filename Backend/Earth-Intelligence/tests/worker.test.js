import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

function fakeDb() {
  return {
    prepare() {
      return {
        bind() { return this; },
        async first() { return null; },
        async all() { return { results: [] }; },
        async run() { return { meta: { changes: 0 } }; }
      };
    },
    async batch() { return []; }
  };
}
const env = { EARTH_INTELLIGENCE_DB: fakeDb(), APP_ORIGIN: 'https://example.pages.dev', RETENTION_DAYS: '365' };

 test('health endpoint reports the service without exposing database contents', async () => {
  const response = await worker.fetch(new Request('https://api.example/health'), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'live-earth-intelligence-api');
});

test('world index returns six curated availability records only', async () => {
  const response = await worker.fetch(new Request('https://api.example/v1/worlds'), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.worlds.length, 6);
  assert.ok(body.worlds.every(item => item.available === false));
  assert.ok(body.worlds.every(item => !('observations' in item)));
});

test('unknown world is not exposed', async () => {
  const response = await worker.fetch(new Request('https://api.example/v1/worlds/not-a-world'), env);
  assert.equal(response.status, 404);
});

test('internal routes reject requests without the private token', async () => {
  const response = await worker.fetch(new Request('https://api.example/internal/observations', { method: 'POST', body: '{}' }), env);
  assert.equal(response.status, 401);
});

test('CORS allows only the configured app origin', async () => {
  const allowed = await worker.fetch(new Request('https://api.example/health', { headers: { Origin: 'https://example.pages.dev' } }), env);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://example.pages.dev');
  const denied = await worker.fetch(new Request('https://api.example/health', { headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});
