const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

// Both portrait artworks use the exact same 4:1 canvas ratio and scale without stretching.
assert.equal((source.match(/aspect-ratio:4 \/ 1;/g) || []).length, 2);
assert.equal((source.match(/width:min\(100%,60dvh\);/g) || []).length, 3);

// The temperature/condition overlay shares the main illustration's grid area.
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio" "hours";'));
assert.ok(source.includes('.le-weather-hero { display:contents; }'));
assert.ok(source.includes('grid-area:headline;'));
assert.ok(source.includes('.le-weather-temperature-row {'));
assert.ok(source.includes('grid-area:scene;'));
assert.ok(source.includes('justify-self:center;'));
assert.ok(source.includes('.le-weather-art-stage {'));
assert.ok(source.includes('height:15dvh;'));
assert.ok(source.includes('width:100vw;'));
assert.ok(source.includes('margin-left:calc(50% - 50vw);'));

// The Live Art frame is full-width while the 4:1 painting and all controls layer inside it.
assert.ok(source.includes('.le-weather-studio {\n          box-sizing:border-box;'));
assert.ok(source.includes('height:15dvh;'));
assert.ok(source.includes('.le-weather-studio-canvas {\n          position:absolute;'));
assert.ok(source.includes('aspect-ratio:4 / 1;'));
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('pointer-events:auto;'));

// Preserve the existing fixed three-Orb dock and read-only clearance integration.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// Preserve the existing local art engine, weather source and location privacy contract.
assert.ok(source.includes('makeArtStudioPainter'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

console.log('Weather portrait 4:1 immersive artwork overlays and fixed Orb dock contract passed.');
