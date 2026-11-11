const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const editor = fs.readFileSync(path.join(__dirname, '..', 'Tools', 'WEATHER-LAYOUT-EDITOR.html'), 'utf8');
const design = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'WEATHER-DESIGN-DIRECTION.md'), 'utf8');

// The landscape masthead is one row with all four labels placed inside both physical safe areas.
assert.ok(source.includes('grid-template-columns:minmax(0,1fr) auto auto auto;'));
assert.ok(source.includes('padding-left:max(env(safe-area-inset-left),clamp(40px,5.8vw,64px))'));
assert.ok(source.includes('padding-right:max(env(safe-area-inset-right),clamp(40px,5.8vw,64px))'));
assert.ok(source.includes('font-size:clamp(12px,1.35vw,14px)'));
assert.ok(source.includes('font-size:clamp(9px,1.05vw,11px)'));

// Live Art is the feature area; Weather is a compact, quieter overview.
assert.ok(source.includes('grid-template-columns:minmax(218px,.42fr) minmax(0,1fr);'));
assert.ok(source.includes('grid-template-areas:"forecast artwork"'));
assert.ok(source.includes('font-size:clamp(22px,2.8vw,31px)'));
assert.ok(source.includes('white-space:normal;\n          overflow:visible;\n          text-overflow:clip;'));
assert.ok(source.includes('Live Art keeps the same 10:7 frame in both orientations.'));
assert.ok(source.includes('function drawMinimalLandscape(p,t)'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(190px,calc(100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,126px) - 80px),292px);'));
assert.ok(source.includes('width:min(100%,calc((var(--le-weather-landscape-height) - 20px) * 1.428571));'));
assert.ok(source.includes('place-items:center;'));
assert.ok(source.includes('justify-self:center;'));
assert.ok(source.includes('align-self:center;'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(!source.includes('const compactLandscape='));

// The portrait full-card 10:7 Live Art remains independent of landscape treatment.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('width:min(100%,calc((var(--le-weather-landscape-height) - 20px) * 1.428571));'));
assert.ok(source.includes('width:min(95vw,760px);'));
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio";'));

// The dock remains read-only and no hours-ahead forecast is reintroduced.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('hourly:'));

assert.ok(editor.includes('centres the 10:7 Live Art frame in the available feature area.'));
assert.ok(editor.includes('Portrait begins below the top safe area with extra breathing room.'));
assert.ok(design.includes('about 42%') && design.includes('about 58%'));

console.log('Weather Japanese landscape consistency, centred 10:7 Live Art, safe areas, large weather readings and protected portrait/dock contracts passed.');
