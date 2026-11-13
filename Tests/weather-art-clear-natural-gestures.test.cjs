'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const art = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/clear-valley-artist-001.json'), 'utf8'));
assert.equal(art.schemaVersion, 4);
assert.equal(art.renderMode, 'artist-led-pigment-painting');
assert.equal(art.canvas[0] / art.canvas[1], 10 / 7);
assert.equal(art.eventCount, art.events.length);
const ids = new Set();
for (const [i, event] of art.events.entries()) {
  assert.equal(event.order, i + 1);
  assert.ok(!ids.has(event.id), `duplicate event id ${event.id}`); ids.add(event.id);
  assert.ok(['wash','mop','flat','calligraphy','dry','detail'].includes(event.tool));
  assert.ok(event.opacity >= .04 && event.opacity <= 1);
  assert.ok(event.pigmentLoad >= .05 && event.pigmentLoad <= 1);
  assert.ok(event.wetness >= 0 && event.wetness <= 1);
  if (event.kind === 'mass') {
    assert.ok(event.region.length >= 4);
    assert.ok(event.region.every(p => p.length === 2 && p.every(v => v >= 0 && v <= 1)));
  } else {
    assert.ok(event.points.length >= 2);
    assert.ok(event.points.every(p => p.length === 3 && p.every(v => v >= 0 && v <= 1)));
  }
}
assert.ok(art.events.some(e => e.kind === 'mass'), 'Broad forms use authored pigment masses');
assert.ok(art.events.some(e => e.tool === 'dry'), 'Dry-brush details are included');
assert.ok(art.events.some(e => e.tool === 'calligraphy'), 'Fine expressive brushwork is included');
console.log('PASS: Clear score contains unique, ordered and pressure-authored artist events with natural brush/tool variation.');
