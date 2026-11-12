const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const tuneStart = source.indexOf('/* USER VISUAL EDITOR TUNING — LANDSCAPE ONLY');
const reduceMotion = source.indexOf('@media(prefers-reduced-motion:reduce)', tuneStart);
assert.ok(tuneStart >= 0 && reduceMotion > tuneStart, 'Landscape tuning block must exist before global accessibility rules');
const tune = source.slice(tuneStart, reduceMotion);

// The user-provided layout is translated into softened, viewport-relative transforms.
for (const selector of [
  '.le-weather-content', '.le-weather-dashboard', '.le-weather-forecast-column',
  '.le-weather-headline', '.le-weather-temperature', '.le-weather-condition',
  '.le-weather-art-column', '.le-weather-studio-title'
]) assert.ok(tune.includes(selector), `${selector} has an adjustment`);
assert.ok(tune.includes('translate3d(3.1vw,0,0) scale(1.05)'));
assert.ok(tune.includes('translate3d(2.6vw,2.4vh,0) scale(1.11)'));
assert.ok(tune.includes('translate3d(1.2vw,2.3vh,0) scale(1.31)'));
assert.ok(tune.includes('translate3d(4vw,-1.4vh,0) scale(.98)'));
assert.ok(tune.includes('orientation:landscape'));
assert.ok(tune.includes('max-width:820px'));
assert.ok(tune.includes('max-height:390px'));

// Text content is not rewritten; only transforms are added for the selected visual layers.
assert.ok(source.includes('A quiet sky.'));
assert.ok(source.includes('LIVE <span>//</span> EARTH'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));

// No Portrait rule is injected into the tuning block. The existing Portrait section remains separate.
assert.ok(!tune.includes('orientation:portrait'));
const portraitStart = source.indexOf('/* Portrait composition:');
const portraitEnd = source.indexOf('@media(prefers-reduced-motion:reduce)', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
const portrait = source.slice(portraitStart, portraitEnd);
assert.ok(portrait.includes('aspect-ratio:10 / 7;'));
assert.ok(portrait.includes('grid-template-areas:"scene" "summary" "studio";'));

// The shared dock remains measured only; no dock styling or geometry is added.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('User visual-editor layout tuning, Landscape-only transforms, responsive overrides and Portrait/10:7/Orb-dock protections passed.');
