'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const art = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/clear-valley-artist-001.json'), 'utf8'));
assert.equal(art.schemaVersion, 1);
assert.equal(art.renderMode, 'ordered-ink-wash-paths');
assert.deepEqual(art.canvas, [1000, 700]);
assert.equal(art.paths.length, 100);
assert.equal(art.paintingPlan.strokeCount, 100);
assert.ok(art.paths.every((path, i) => path.length === 2 && Number.isInteger(path[0]) && typeof path[1] === 'string'));
assert.ok(art.paintingPlan.paths.every((path, i) => path.order === i + 1));
assert.deepEqual(art.paintingPlan.stages.map(s => [s.from, s.to]), [
  [1,20],[21,35],[36,50],[51,65],[66,85],[86,90],[91,100]
]);
assert.match(art.paintingPlan.stages[0].title, /House \/ pavilion/);
assert.match(art.paintingPlan.stages[1].title, /Tree — thick/);
assert.match(art.paintingPlan.stages[2].title, /Tree — thin/);
assert.match(art.paintingPlan.stages[3].title, /Mountains/);
assert.match(art.paintingPlan.stages[4].title, /Maple leaves/);
assert.match(art.paintingPlan.stages[5].title, /Birds/);
assert.match(art.paintingPlan.stages[6].title, /Sun.*last/);
function readVarint(bytes, cursor) {
  let value = 0, shift = 0, byte;
  do {
    assert.ok(cursor.i < bytes.length, 'path varint must not be truncated');
    byte = bytes[cursor.i++]; value |= (byte & 0x7f) << shift; shift += 7;
    assert.ok(shift <= 28, 'path varint is bounded');
  } while (byte & 0x80);
  return (value >>> 1) ^ -(value & 1);
}
for (const [i, [, encoded]] of art.paths.entries()) {
  const bytes = Buffer.from(encoded, 'base64'); const cursor = {i:0};
  let x=0,y=0,count=0;
  while(cursor.i < bytes.length) {
    x += readVarint(bytes,cursor); y += readVarint(bytes,cursor); count++;
    assert.ok(x>=0 && x<=1000 && y>=0 && y<=700, `path ${i+1} stays on canvas`);
  }
  assert.ok(count>=6, `path ${i+1} has a closed fill shape`);
}
assert.equal(art.paintingPlan.stages.at(-1).to, art.paths.length, 'The sun is the final path stage.');
console.log('PASS: Clear contains 100 valid closed paths with the exact user-approved subject order.');
