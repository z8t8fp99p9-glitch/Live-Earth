const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

// Portrait uses full-width, proportional 4:1 artwork; the surrounding cards are overlays.
assert.equal((source.match(/aspect-ratio:4 \/ 1;/g) || []).length, 2);
assert.ok(source.includes('height:15dvh;')); // Main landscape keeps its 15dvh visual stage.
assert.ok(source.includes('height:clamp(140px,18dvh,176px);')); // Live Art receives the freed vertical space.
assert.ok(source.includes('width:100vw;'));
assert.ok(source.includes('margin-left:calc(50% - 50vw);'));

// Temperature and condition sit over the primary illustrated landscape.
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio";'));
assert.ok(source.includes('.le-weather-hero { display:contents; }'));
assert.ok(source.includes('grid-area:scene;'));
assert.ok(source.includes('.le-weather-temperature-row {'));

// Live Art title/status and caption/Replay float over the second 4:1 canvas.
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('le-weather-studio-canvas {'));
assert.ok(source.includes('aspect-ratio:4 / 1;'));
assert.ok(source.includes('pointer-events:auto;'));

// The art renderer presents a finished painting on entry; Replay alone animates it.
assert.ok(source.includes('drawFrame(1);'));
assert.ok(source.includes('complete=true;'));
assert.ok(!source.includes('replayTimer=window.setTimeout(()=>startDrawing(),11500)'));

// Rich filled landscape planes, proportional line weights and a willow motif are present.
assert.ok(source.includes('const ranges=['));
assert.ok(source.includes('const markRadius=Math.min(width,height)*.17;'));
assert.ok(source.includes('const curtains=['));
assert.ok(source.includes("study.motif==='willow'"));
assert.ok(source.includes('Math.min(width,height)/105'));

// Weather only reads the existing dock geometry; it never mutates the dock.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// Keep the existing landscape layout, weather data, and location privacy contracts.
assert.ok(source.includes('@media(orientation:landscape) and (min-width:650px)'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

console.log('Weather portrait 4:1 artwork, overlaid UI, finished Live Art and fixed dock checks passed.');
