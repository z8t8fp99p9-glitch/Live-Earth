const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

// The portrait composition uses two proportional 4:1 artwork canvases.
assert.equal((source.match(/aspect-ratio:4 \/ 1;/g) || []).length, 2);
assert.ok((source.match(/height:15dvh;/g) || []).length >= 2);
assert.ok(source.includes('width:100vw;'));
assert.ok(source.includes('margin-left:calc(50% - 50vw);'));

// Temperature and condition float over the main landscape.
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio" "hours";'));
assert.ok(source.includes('.le-weather-hero { display:contents; }'));
assert.ok(source.includes('.le-weather-temperature-row {'));
assert.ok(source.includes('grid-area:scene;'));

// Live Art controls float over its painting.
assert.ok(source.includes('.le-weather-studio-canvas {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('pointer-events:auto;'));

// Forecast and accessibility details remain present.
assert.ok(source.includes('border-right:1px solid color-mix(in srgb,var(--ink) 15%,transparent)'));
assert.ok(source.includes('.le-weather-status,'));
assert.ok(source.includes('.le-weather-attribution {'));
assert.ok(source.includes('clip-path:inset(50%)'));

// Weather reads the dock geometry only; it never positions or sizes the dock.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// Existing layout, data and privacy contracts remain intact.
assert.ok(source.includes('@media(orientation:landscape) and (min-width:650px)'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

console.log('Weather portrait 4:1 artwork overlay and fixed dock contract passed.');
