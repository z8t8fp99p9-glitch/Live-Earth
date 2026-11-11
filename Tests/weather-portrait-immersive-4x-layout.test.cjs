const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

// Main Weather readings are actual children of the full-width scene canvas.
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio";'));
assert.ok(source.includes('.le-weather-art-stage {\n          grid-area:scene;'));
assert.ok(source.includes('.le-weather-temperature-row {\n          position:absolute;'));
assert.ok(source.includes('top:0;'));
assert.ok(source.includes('width:100%;'));
assert.ok(source.includes('height:100%;'));
assert.ok(source.includes('id="le-weather-art-canvas"'));
assert.ok(source.includes('<div class="le-weather-temperature-row">'));
assert.ok(source.includes('<div class="le-weather-art-stage" aria-label="Live weather illustration"><canvas class="le-weather-art-canvas" id="le-weather-art-canvas"></canvas><div class="le-weather-temperature-row">'));
assert.ok(source.includes('height:15dvh;'));
assert.ok(source.includes('width:100vw;'));
assert.ok(source.includes('margin-left:calc(50% - 50vw);'));
assert.ok(!source.includes('aspect-ratio:4 / 1;'));

// Live Art is a full-panel canvas in an inset card; the text/control layers float above it.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('.le-weather-studio-canvas {\n          position:absolute;'));
assert.ok(source.includes('inset:0;'));
assert.ok(source.includes('aspect-ratio:auto;'));
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('pointer-events:auto;'));
assert.ok(!source.includes('width:100vw;\n          height:clamp(150px,19dvh,184px);'));

// The illustrative scene has deeper peak relief and a less tangled pine silhouette.
assert.ok(source.includes('const ranges=['));
assert.ok(source.includes('distinct summits, not rolling waves'));
assert.ok(source.includes('const tiers=['));
assert.ok(source.includes('short needle marks replace the old dense lattice'));
assert.ok(source.includes('const markRadius=Math.min(width,height)*.11;'));

// The removed hours rail must not return.
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('NEXT 6 HOURS'));
assert.ok(!source.includes('hourly:'));

// Preserve the shared Orb dock: geometry is read only for clearance.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// Preserve weather source, local drawing and privacy boundaries.
assert.ok(source.includes('makeArtStudioPainter'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

console.log('Weather scene overlays, full-card Live Art, illustration refinements and fixed Orb dock contracts passed.');
