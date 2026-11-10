const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes('position:absolute!important; inset:0!important'));
assert.ok(source.includes('width:100%!important; height:100%!important'));
assert.ok(source.includes('pointer-events:none'));
assert.ok(source.includes('pointer-events:auto'));
assert.ok(source.includes('env(safe-area-inset-top'));
assert.ok(source.includes('env(safe-area-inset-bottom'));
assert.ok(source.includes('le-weather-card'));
assert.ok(source.includes('le-weather-hour[aria-pressed="true"]'));
assert.ok(source.includes('prefers-reduced-motion:reduce'));
assert.ok(source.includes('le-weather-attribution'));
assert.ok(!source.includes('le-weather-people'));
assert.ok(!source.includes('le-weather-character'));
console.log('Full-screen layout, Orb-safe overlay, card interaction and safe-area checks passed.');
