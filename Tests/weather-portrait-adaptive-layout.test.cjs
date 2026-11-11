const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','Weather','weather-view.js'),'utf8');

// The main scene canvas fills its own stage; readings are layered inside that same scene.
assert.ok(source.includes('height:clamp(168px,20dvh,192px);'));
assert.ok(source.includes('padding-top:calc(env(safe-area-inset-top) + clamp(20px,2.4dvh,28px));'));
assert.ok(source.includes('font-size:14px;'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(!source.includes('const compactLandscape='));
assert.ok(source.includes('.le-weather-temperature-row {\n          position:absolute;'));
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio";'));
assert.ok(source.includes('<div class="le-weather-art-stage" aria-label="Live weather illustration"><canvas'));
assert.ok(source.includes('<div class="le-weather-temperature-row">'));
assert.ok(!source.includes('aspect-ratio:4 / 1;'));

// Live Art painting fills the inset card edge-to-edge, with title/status and footer floating above.
assert.ok(source.includes('width:min(95vw,760px);'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('margin-left:calc(50% - min(47.5vw,380px));'));
assert.ok(source.includes('margin-right:calc(50% - min(47.5vw,380px));'));
assert.ok(source.includes('.le-weather-studio-canvas {\n          position:absolute;'));
assert.ok(source.includes('inset:0;'));
assert.ok(source.includes('width:100%;'));
assert.ok(source.includes('height:100%;'));
assert.ok(source.includes('.le-weather-studio-head {\n          position:absolute;'));
assert.ok(source.includes('.le-weather-studio-foot {\n          position:absolute;'));
assert.ok(source.includes('pointer-events:auto;'));

// Weather art studies preserve recognisable willow and more natural, separated pine boughs.
assert.ok(source.includes('const curtains=['));
assert.ok(source.includes("study.motif==='willow'"));
assert.ok(source.includes('const tiers=['));
assert.ok(source.includes('short needle marks replace the old dense lattice'));
assert.ok(source.includes('drawFrame(1);'));
assert.ok(source.includes('complete=true;'));
assert.ok(!source.includes('replayTimer=window.setTimeout(()=>startDrawing(),11500)'));

// Dock geometry is read-only; no dock ownership or positioning is duplicated here.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(source.includes('weatherDockObserver?.observe(weatherDock)'));
assert.ok(source.includes('weatherDockObserver?.disconnect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// Keep data, landscape layout, privacy and the no-hours-rail decision.
assert.ok(source.includes('@media (orientation:landscape) and (min-width:650px)'));
assert.ok(source.includes('grid-template-columns:minmax(218px,.42fr) minmax(0,1fr);'));
assert.ok(source.includes('grid-template-areas:"forecast artwork"'));
assert.ok(source.includes('Open-Meteo'));
assert.ok(source.includes('liveEarthLocationAllowed'));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('hourly:'));

console.log('Weather adaptive scene/card layout, weather art studies and protected dock/data contracts passed.');
