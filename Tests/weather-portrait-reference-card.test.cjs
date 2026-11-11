const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

// The full-width Weather scene and its floating reading overlay are one composition.
assert.ok(source.includes('grid-template-areas:"scene" "summary" "studio";'));
assert.ok(source.includes('position:absolute;\n          z-index:4;'));
assert.ok(source.includes('top:clamp(108px,15dvh,132px);'));
assert.ok(source.includes('.le-weather-art-stage {\n          grid-area:scene;'));
assert.ok(source.includes('.le-weather-art-canvas {\n          position:absolute;'));
assert.ok(source.includes('inset:0;'));
assert.ok(source.includes('width:100%;'));
assert.ok(source.includes('height:100%;'));
assert.ok(source.includes('.le-weather-temperature-row {\n          position:absolute;'));
assert.ok(source.includes('<div class="le-weather-temperature-row">'));
assert.ok(source.includes('<div class="le-weather-art-stage" aria-label="Live weather illustration"><canvas class="le-weather-art-canvas" id="le-weather-art-canvas"></canvas><div class="le-weather-temperature-row">'));
assert.ok(source.includes('height:var(--le-weather-scene-height,clamp(24dvh,30dvh,38dvh));'));
assert.ok(source.includes('padding-top:calc(env(safe-area-inset-top) + clamp(20px,2.4dvh,28px));'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(source.includes('width:100vw;'));
assert.ok(!source.includes('aspect-ratio:4 / 1;'));

// Live Art is a rounded, inset card whose canvas paints beneath floating UI across the full panel.
assert.ok(source.includes('.le-weather-studio {\n          box-sizing:border-box;'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('border-radius:17px;'));
assert.ok(source.includes('.le-weather-studio-canvas {\n          position:absolute;'));
assert.ok(source.includes('aspect-ratio:auto;'));
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio:after {'));
assert.ok(source.includes('pointer-events:auto;'));

// Illustration detail contracts: peak-based mountain planes, mist and separated pine branches.
assert.ok(source.includes('distinct summits, not rolling waves'));
assert.ok(source.includes('distant veil and two low mist ribbons'));
assert.ok(source.includes('const tiers=['));
assert.ok(source.includes('short needle marks replace the old dense lattice'));

// Orb dock is measured for clearance only and is never styled or repositioned.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// The hours-ahead rail and its forecast payload remain removed.
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('NEXT 6 HOURS'));
assert.ok(!source.includes('hourly:'));

// Existing renderer, weather-data and privacy contracts remain intact.
assert.ok(source.includes('makeArtStudioPainter'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

console.log('Weather scene composition, full-card Live Art, illustration detail and fixed Orb dock contracts passed.');
