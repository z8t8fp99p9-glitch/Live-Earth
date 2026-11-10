const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

assert.ok(source.includes('--le-weather-dock-clearance'));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(source.includes('@media (orientation:portrait)'));
assert.ok(source.includes('height:clamp(96px,12.2dvh,112px)'));
assert.ok(source.includes('height:clamp(76px,10.3dvh,94px)'));
assert.ok(source.includes('border-right:1px solid color-mix(in srgb,var(--ink) 15%,transparent)'));

// The Weather module may measure the dock, but must never alter its geometry.
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Weather portrait fit and fixed three-Orb dock contract passed.');
