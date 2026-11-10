const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

// The approved portrait composition uses a taller landscape overlapping the hero.
assert.ok(source.includes('height:clamp(140px,17.5dvh,154px)'));
assert.ok(source.includes('margin-top:clamp(-86px,-9.4dvh,-76px)'));
assert.ok(source.includes('height:clamp(82px,10.2dvh,90px)'));

// Forecast remains compact and divided above the existing fixed dock.
assert.ok(source.includes('border-right:1px solid color-mix(in srgb,var(--ink) 15%,transparent)'));
assert.ok(source.includes('.le-weather-status,'));
assert.ok(source.includes('.le-weather-attribution {'));
assert.ok(source.includes('clip-path:inset(50%)'));

// Weather reads the dock's geometry only; it never positions or sizes the dock.
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

console.log('Weather portrait hero/scene overlap, compact forecast and fixed dock contract passed.');
