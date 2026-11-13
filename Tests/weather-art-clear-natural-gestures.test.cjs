const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const art = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/clear-maple-pavilion-003.json'), 'utf8'));
assert.equal(art.schemaVersion, 3);
assert.equal(art.renderMode, 'ordered-master-brush-reveal');
assert.equal(art.durationMs, 30000);
assert.equal(art.strokeCount, 100);
assert.equal(art.strokes.length, 100);
assert.deepEqual(art.stages.map(s => s.strokeCount), [28,27,12,20,13]);
assert.deepEqual(art.stages.map(s => s.stageId), ['01','02','03','04','05']);
assert.deepEqual(art.stages.map(s => s.title), [
  'Thick structural brushwork',
  'Attached thin brushwork',
  'Air, birds and little details',
  'Leaves after everything else',
  'Sun and final finish'
]);
let previousStage = '01';
const ids = new Set();
for (const [i, stroke] of art.strokes.entries()) {
  assert.equal(stroke.order, i + 1);
  assert.ok(!ids.has(stroke.id), `duplicate stroke id: ${stroke.id}`);
  ids.add(stroke.id);
  assert.ok(['01','02','03','04','05'].includes(stroke.stageId));
  assert.ok(Number(stroke.stageId) >= Number(previousStage));
  previousStage = stroke.stageId;
  assert.ok(stroke.points.length >= 3, stroke.id);
  const xs = stroke.points.map(p => p[0]);
  const ys = stroke.points.map(p => p[1]);
  const ps = stroke.points.map(p => p[2]);
  for (const p of stroke.points) {
    assert.equal(p.length, 3);
    assert.ok(p.every(Number.isFinite));
    assert.ok(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1 && p[2] >= 0 && p[2] <= 1);
  }
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  assert.ok(!(width > 0.85 && height < 0.08), `page-wide scanline detected: ${stroke.id}`);
  assert.ok(Math.max(...ps) - Math.min(...ps) >= 0.15, `pressure is not expressive: ${stroke.id}`);
  assert.ok(stroke.baseWidth >= 0.5 && stroke.baseWidth <= 100);
  assert.equal(stroke.durationWeight, 1.0);
}
assert.equal(art.strokes[0].stageId, '01');
assert.equal(art.strokes.at(-1).stageId, '05');
assert.ok(art.strokes.at(-1).id.includes('final-ink-lift'));
console.log('PASS: Clear Weather uses 100 ordered, pressure-varied, form-following gestures.');
console.log('PASS: no page-wide raster scanline gestures remain.');
console.log('PASS: the five-stage order and sun-last finish are preserved.');
