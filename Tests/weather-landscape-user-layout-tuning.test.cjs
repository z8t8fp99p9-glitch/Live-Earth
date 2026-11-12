const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const tuneStart = source.indexOf('/* USER VISUAL EDITOR TUNING — LANDSCAPE ONLY');
const reduceMotion = source.indexOf('@media(prefers-reduced-motion:reduce)', tuneStart);
assert.ok(tuneStart >= 0 && reduceMotion > tuneStart, 'Landscape visual tuning must remain within its orientation block');
const tune = source.slice(tuneStart, reduceMotion);

// Preserve the selected scale and vertical positioning while removing horizontal drift.
for (const oldOffset of [
  'translate3d(3.1vw,0,0)', 'translate3d(2.6vw,2.4vh,0)',
  'translate3d(1.2vw,2.3vh,0)', 'translate3d(1.65vw,.35vh,0)',
  'translate3d(2vw,0,0) scale(1.03)', 'translate3d(1.8vw,1.8vh,0)',
  'translate3d(.6vw,1.6vh,0)', 'translate3d(1vw,.2vh,0)',
  'translate3d(2vw,1.5vh,0) scale(1.06)', 'translate3d(.65vw,1.2vh,0)',
]) assert.ok(!tune.includes(oldOffset), `Obsolete horizontal Weather text offset remains: ${oldOffset}`);

assert.ok(tune.includes('transform:translate3d(0,0,0) scale(1.05);'));
assert.ok(tune.includes('transform:translate3d(0,2.4vh,0) scale(1.11);'));
assert.ok(tune.includes('transform:translate3d(0,2.3vh,0) scale(1.31);'));
assert.ok(tune.includes('transform:translate3d(0,.35vh,0) scale(.92);'));
assert.ok(tune.includes('transform:translate3d(0,1.5vh,0) scale(1.06);'));
assert.ok(source.includes('left:var(--le-weather-scene-flow-x);'));
assert.ok(source.includes('LIVE <span>//</span> EARTH'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));

// The masthead itself is intentionally unchanged.
assert.ok(tune.includes('.le-weather-content {\n          transform:translate3d(-.35vw,0,0) scale(1);'));
assert.ok(tune.includes('.le-weather-dashboard {\n          transform:translate3d(0,0,0) scale(1.006);'));

// Portrait and shared Orb dock remain protected.
assert.ok(!tune.includes('orientation:portrait'));
const portraitStart = source.indexOf('/* Portrait composition:');
const portraitEnd = source.indexOf('/* USER VISUAL EDITOR TUNING — LANDSCAPE ONLY', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
assert.ok(source.slice(portraitStart,portraitEnd).includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));

console.log('Weather text aligned to masthead; scale/Y tuning, Portrait and Orb-dock protections passed.');
