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
assert.ok(source.includes('The painting receives the remaining ~70% of the usable width.'));
assert.ok(source.includes('function drawMinimalLandscape(p,t)'));
assert.ok(source.includes('const compactLandscape=window.innerWidth>window.innerHeight&&width<560;'));

// The portrait full-card 10:7 Live Art remains independent of landscape treatment.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('width:min(95vw,760px);'));
assert.ok(source.includes('grid-template-areas:"headline" "scene" "summary" "studio";'));

// The dock remains read-only and no hours-ahead forecast is reintroduced.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('hourly:'));

assert.ok(editor.includes('Landscape gives Live Art the larger feature column with a compact Weather overview.'));
assert.ok(design.includes('approximately 30%') && design.includes('approximately 70%'));

console.log('Weather landscape safe areas, increased masthead type, Live Art priority, compact scene and protected portrait/dock contracts passed.');
