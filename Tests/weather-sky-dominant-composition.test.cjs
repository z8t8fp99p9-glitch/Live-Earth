const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

const match = source.match(/function weatherViewportProfile\(width, height\) \{[\s\S]*?\n  \}/);
assert.ok(match, 'Responsive camera profile must exist');
const profile = vm.runInNewContext(`(${match[0]})`);
const sizes = [
  ['compact portrait', 320, 568], ['iPhone portrait', 393, 852], ['large portrait', 430, 932],
  ['phone landscape', 844, 390], ['tablet portrait', 820, 1180], ['tablet landscape', 1180, 820],
  ['desktop', 1440, 900]
];
const results = sizes.map(([name, width, height]) => ({ name, ...profile(width, height) }));
for (const p of results) {
  assert.ok(Number.isFinite(p.aspect) && p.aspect > 0, `${p.name} must have a valid aspect`);
  assert.ok(p.fov >= 40 && p.fov <= 46, `${p.name} must use a bounded camera FOV`);
  assert.ok(p.rise > 0 && p.depth > 0, `${p.name} must have a stable three-quarter camera`);
  assert.equal(p.scaleX, undefined, `${p.name} must not stretch the terrain horizontally`);
  assert.equal(p.scaleZ, undefined, `${p.name} must not stretch the terrain in depth`);
}
assert.ok(results[0].portrait && results[1].portrait && results[2].portrait, 'Phone portrait sizes must share the portrait composition');
assert.ok(!results[3].portrait && !results[5].portrait, 'Landscape devices must use a landscape camera profile');
assert.ok(results[1].fov > results[5].fov, 'Portrait must reserve a broader vertical field than tablet landscape');
assert.ok(results[4].tablet, 'Tablet portrait must be recognized independently');
assert.ok(source.includes("scene.background = new THREE.Color('#9bc2cc')"), 'The sky must remain a plain clear background in this foundation stage');
assert.ok(!/addCloud\(|cloudFamily|CloudGeometry/i.test(source), 'No clouds may appear in the initial foundation scene');
assert.ok(!/new THREE\.Points|new THREE\.InstancedMesh/i.test(source), 'No particles or decorative instancing may appear');

console.log('Portrait-first terrain camera, adaptive viewports, clear sky backdrop and no-extra-object composition checks passed.');
