const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const editor = fs.readFileSync(path.join(__dirname, '..', 'Tools', 'WEATHER-LAYOUT-EDITOR.html'), 'utf8');
const design = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'WEATHER-DESIGN-DIRECTION.md'), 'utf8');

// The Weather illustration uses one minimalist Japanese painter in both orientations.
const drawStart = source.indexOf('    function draw(){');
const drawEnd = source.indexOf('    function loop(', drawStart);
assert.ok(drawStart >= 0 && drawEnd > drawStart);
const drawBody = source.slice(drawStart, drawEnd);
assert.ok(drawBody.includes('drawMinimalLandscape(p,t);'));
assert.ok(!drawBody.includes('drawMountains('));
assert.ok(!drawBody.includes('drawPagoda('));
assert.ok(!drawBody.includes('drawBambooAndLeaves('));
assert.ok(source.includes('const horizon=height*.76;'));
assert.ok(source.includes('Two quiet ink-wash ridges'));

// Weather copy remains prominent and readable in both orientations.
assert.ok(source.includes('font-size:clamp(58px,6.8vw,72px)'));
assert.ok(source.includes('font-size:clamp(14px,1.7vw,17px)'));
assert.ok(source.includes('font-size:14px;'));

// Portrait receives breathing room below the physical top safe area.
assert.ok(source.includes('padding-top:calc(env(safe-area-inset-top) + clamp(20px,2.4dvh,28px));'));
assert.ok(source.includes('height:clamp(168px,20dvh,192px);'));

// Landscape preserves the 10:7 art ratio and centres it in the available feature area.
assert.ok(source.includes('--le-weather-landscape-height:clamp(190px,calc(100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,126px) - 80px),292px);'));
assert.ok(source.includes('width:min(100%,calc((var(--le-weather-landscape-height) - 20px) * 1.428571));'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('place-items:center;'));
assert.ok(source.includes('justify-self:center;'));
assert.ok(source.includes('align-self:center;'));

// Japanese visual direction, editor preview, no-hours rail and protected dock remain aligned.
assert.ok(design.includes('ma (negative space)'));
assert.ok(design.includes('same minimalist Japanese landscape painter in portrait and landscape'));
assert.ok(editor.includes('centres the 10:7 Live Art frame'));
assert.ok(editor.includes('Portrait begins below the top safe area'));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('hourly:'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Japanese minimalist Weather scene, prominent readings, portrait top breathing room and centred 10:7 Live Art contracts passed.');
