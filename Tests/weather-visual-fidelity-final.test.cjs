const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const editor = fs.readFileSync(path.join(__dirname, '..', 'Tools', 'WEATHER-LAYOUT-EDITOR.html'), 'utf8');
const design = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'WEATHER-DESIGN-DIRECTION.md'), 'utf8');

// Same restrained Japanese Weather illustration is used in both orientations.
const drawStart = source.indexOf('    function draw(){');
const drawEnd = source.indexOf('    function loop(', drawStart);
assert.ok(drawStart >= 0 && drawEnd > drawStart);
assert.ok(source.slice(drawStart, drawEnd).includes('drawMinimalLandscape(p,t);'));
assert.ok(source.includes('const horizon=height*.79;'));
assert.ok(source.includes('const far=[[-.06,.73]'));
assert.ok(source.includes('const mid=[[-.05,.82]'));
assert.ok(source.includes('Japanese landscape foreground'));
assert.ok(source.includes('drawPagoda(p);'));

// Live Art is composed as actual weather-specific scenes with painted forms and foliage.
for (const token of [
  'const facets=[', 'Irregular soft foliage masses', 'short needle marks replace the old dense lattice',
  'const curtains=[', 'const addRocks=()=>', 'const addPavilion=',
  "if(kind==='storm')", "else if(kind==='rain')", "else if(kind==='snow')", "else if(kind==='wind')"
]) assert.ok(source.includes(token), `Missing illustration layer: ${token}`);
assert.ok(source.includes('Math.min(22,stroke.weight*Math.min(width,height)/140)'));
assert.ok(source.includes('Fine, deterministic paper fibres'));

// Prominent weather copy remains readable; portrait content starts lower and clears the dock.
assert.ok(source.includes('font-size:clamp(88px,23vw,128px)'));
assert.ok(source.includes('.le-weather-condition-name { font-size:clamp(17px,4.4vw,20px); }'));
assert.ok(source.includes('font-size:clamp(48px,12.5vw,80px)'));
assert.ok(source.includes('padding-top:calc(env(safe-area-inset-top) + clamp(20px,2.4dvh,28px));'));
assert.ok(source.includes('height:var(--le-weather-scene-height,clamp(24dvh,30dvh,38dvh));'));

// 10:7 is the one Live Art ratio in both orientations; landscape frame is centred, not stretched.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('width:min(100%,calc((var(--le-weather-landscape-height) - 18px) * 1.428571));'));
assert.ok(source.includes('place-items:center;'));
assert.ok(source.includes('justify-self:center;'));
assert.ok(source.includes('align-self:center;'));
assert.ok(source.includes('grid-template-columns:minmax(248px,.72fr) minmax(0,1fr);'));

// Orb controller remains read-only and Hours Ahead stays removed.
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('hourly:'));
assert.ok(design.includes('about 42%') && design.includes('about 58%'));
assert.ok(editor.includes('centres the 10:7 Live Art frame in the available feature area.'));
console.log('Final Japanese Weather art hierarchy, 10:7 layouts, prominent readings, dock safety and no-hourly contract passed.');
