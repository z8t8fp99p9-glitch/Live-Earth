import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appendAndPruneVault } from '../src/vault.mjs';
import { buildPublishedSnapshots } from '../src/publish.mjs';
import { collectUSGS } from '../src/collect-usgs.mjs';

test('vault deduplicates source records and keeps a rolling 365-day window', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'earth-intel-'));
  try {
    const now = new Date('2026-11-17T00:00:00.000Z');
    const fresh = { id:'usgs:abc', world:'earth-activity', observedAt:'2026-11-16T12:00:00.000Z', value:4.2 };
    const old = { id:'usgs:old', world:'earth-activity', observedAt:'2025-11-16T00:00:00.000Z', value:3.1 };
    const first = await appendAndPruneVault(root, [{records:[fresh, fresh, old]}], now);
    assert.equal(first.inserted, 1);
    assert.equal(first.records.length, 1);
    const second = await appendAndPruneVault(root, [{records:[fresh]}], now);
    assert.equal(second.inserted, 0);
    assert.equal(second.records.length, 1);
  } finally { await rm(root, { recursive:true, force:true }); }
});

test('Publisher returns a 365-day curated timeline and never fabricates other worlds', () => {
  const now = new Date('2026-11-17T00:00:00.000Z');
  const records = [{ id:'usgs:1', world:'earth-activity', observedAt:'2026-11-16T12:00:00.000Z',
    value:4.4, place:'Test region', status:'reviewed', url:'https://earthquake.usgs.gov/' }];
  const snapshots = buildPublishedSnapshots(records, now);
  assert.equal(snapshots['earth-activity'].status, 'published');
  assert.equal(snapshots['earth-activity'].data.timeline.length, 365);
  assert.equal(snapshots['earth-activity'].data.events.length, 1);
  assert.equal(snapshots.oceans.status, 'awaiting-source');
  assert.equal(snapshots.oceans.data.events.length, 0);
});


test('USGS collector normalises GeoJSON and preserves source identity', async () => {
  const mockFetch = async () => new Response(JSON.stringify({
    type: 'FeatureCollection',
    metadata: { generated: 1794873600000 },
    features: [{
      id: 'us7000test',
      geometry: { type: 'Point', coordinates: [12.5, 34.5, 8.2] },
      properties: {
        time: 1794870000000, mag: 5.1, place: 'Test location',
        status: 'reviewed', type: 'earthquake',
        url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000test',
        tsunami: 0, felt: null
      }
    }]
  }), { status: 200, headers: { 'content-type': 'application/geo+json' } });
  const result = await collectUSGS({ fetchImpl: mockFetch, now: new Date('2026-11-17T00:00:00.000Z') });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].id, 'usgs:us7000test');
  assert.equal(result.records[0].world, 'earth-activity');
  assert.equal(result.records[0].value, 5.1);
  assert.equal(result.records[0].depthKm, 8.2);
  assert.equal(result.records[0].felt, null);
});
