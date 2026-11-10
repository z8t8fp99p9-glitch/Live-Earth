const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes('position:absolute!important; inset:0!important'));
assert.ok(source.includes('width:100%!important; height:100%!important'));
assert.ok(source.includes('pointer-events:none'));
assert.ok(source.includes('view.panel.remove()'));
assert.ok(source.includes('view.root.replaceChildren(scene)'));
assert.ok(source.includes('.le-sfv--weather > .le-sfv-panel { display:none!important; }'));
assert.ok(!source.includes('env(safe-area-inset-top'), 'Background has no top UI that needs a safe-area inset');
assert.ok(!source.includes('le-weather-card'));
assert.ok(!source.includes('le-weather-hour'));
assert.ok(!source.includes('le-weather-refresh'));
assert.ok(!source.includes('le-sfv-status'));
assert.ok(!source.includes('le-sfv-attribution'));
console.log('Full-screen background-only layout and empty Weather UI checks passed.');
