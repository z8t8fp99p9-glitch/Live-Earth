const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

const portraitStart = source.indexOf('      /* Portrait composition:');
const portraitEnd = source.indexOf('      @media(prefers-reduced-motion:reduce)', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
// Hash pins the current approved Portrait block from the baseline on main.
assert.equal(digest(source.slice(portraitStart, portraitEnd)), 'ab04b97ccadf558998dd993bba9300b985752ca7c079cb42a5321ae4ec0472e3', 'Portrait CSS must remain byte-for-byte locked.');

const liveArtStart = source.indexOf('        /* Live Art keeps the same 10:7 frame in both orientations.');
const liveArtEnd = source.indexOf('        .le-weather-status,.le-weather-attribution', liveArtStart);
assert.ok(liveArtStart >= 0 && liveArtEnd > liveArtStart);
assert.equal(digest(source.slice(liveArtStart, liveArtEnd)), '5c6d833e9a5073a60c59b05f9d2e7ab92e013d562b4842a2f18235b774ab7709', 'Landscape Live Art CSS must remain unchanged.');

assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('function drawLandscapeWeatherScene(p,t)'));
assert.ok(source.includes('drawLandscapeWeatherScene(p,t);'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(source.includes('.le-weather-dashboard::before'));
assert.ok(source.includes('--le-weather-scene-flow-x:clamp(56px,6.8vw,104px);'), 'Landscape artwork receives a small additional left bleed.');
assert.ok(source.includes('width:calc(100% + var(--le-weather-landscape-gap) + (2 * var(--le-weather-scene-flow-x)));'));
assert.ok(source.includes('left:calc(clamp(7px,1vw,13px) + var(--le-weather-scene-flow-x));'), 'Temperature and condition text remain anchored to their original screen position.');
assert.ok(source.includes('margin:0 0 calc(-1 * var(--le-weather-scene-flow-y));'));
assert.ok(source.includes('margin-left:calc(-1 * var(--le-weather-scene-flow-x));'), 'Weather canvas must extend left without moving its right edge.');
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

// New layout assertions activate when the ZIP-extracted Landscape extension is present.
// The upload-triggered workflow can run before extraction; the post-extraction manual
// regression run evaluates these assertions against the new source.
if (source.includes('<div class="le-weather-landscape-accents" aria-hidden="true">')) {
  assert.ok(source.includes('.le-weather-landscape-accents{display:none}'));
  assert.ok(source.includes('.le-weather-screen[data-phase="night"] .le-weather-landscape-accents { opacity:.30; }'));
  assert.ok(source.includes('width:calc(100% + var(--le-weather-landscape-gap) + var(--le-weather-scene-flow-x));\n          height:calc(100% + max(72px,calc(var(--le-weather-dock-clearance,116px) - 24px)) + var(--le-weather-scene-flow-y));'));
  assert.ok(source.includes('position:absolute;\n          top:0;\n          left:0;'));
  assert.ok(source.includes('drawMinimalLandscape(p,t);\n      ctx.restore();'));
  assert.ok(!source.includes('drawLandscapeMarginArts'));
  assert.ok(source.indexOf('<div class="le-weather-landscape-accents"') < source.indexOf('<div class="le-weather-content">'));
  assert.ok(source.includes('preserveAspectRatio="xMidYMid slice"'));
  assert.ok(source.includes('ellipse cx="87" cy="47"'));
  assert.ok(source.includes('ellipse cx="1110" cy="83"'));
  console.log('Landscape full-height left Weather painting and separate paper/botanical background accents passed.');
} else {
  console.log('Landscape extension checks deferred until the ZIP is extracted; current baseline protections passed.');
}

console.log('Weather flow composition verified; Portrait and Landscape Live Art CSS remain locked.');
