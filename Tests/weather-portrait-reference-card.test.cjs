const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

// Current approved composition: two full-width 4:1 artwork canvases; the third width clamp is the shared temperature overlay.
// UI is layered over the art; the Live Art card itself is not 4:1.
assert.ok(source.includes('Portrait reference composition: two proportional 4:1 illustrations.'));
assert.equal((source.match(/aspect-ratio:4 \/ 1;/g) || []).length, 2);
assert.equal((source.match(/width:min\(100%,60dvh\);/g) || []).length, 3);
assert.ok(source.includes('.le-weather-art-stage {\n          position:relative;'));
assert.ok(source.includes('height:15dvh;'));
assert.ok(source.includes('width:100vw;'));
assert.ok(source.includes('margin-left:calc(50% - 50vw);'));
assert.ok(source.includes('.le-weather-studio {\n          box-sizing:border-box;'));
assert.ok(source.includes('border-radius:16px;'));
assert.ok(source.includes('.le-weather-studio-canvas {\n          position:absolute;'));
assert.ok(source.includes('transform:translate(-50%,-50%);'));
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('pointer-events:auto;'));

// Orb dock is measured for clearance only and is never styled or repositioned.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// The hourly forecast rail and its extra API payload are intentionally absent.
assert.ok(!source.includes("le-weather-hourly"));
assert.ok(!source.includes("NEXT 6 HOURS"));
assert.ok(!source.includes("hourly:"));

// Existing renderer, weather-data and privacy contracts remain intact.
assert.ok(source.includes('makeArtStudioPainter'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

console.log('Weather portrait 4:1 artwork, floating Live Art overlays and fixed Orb dock contract passed.');
