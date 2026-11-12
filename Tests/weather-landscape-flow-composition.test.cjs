const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

const portraitStart = source.indexOf('      /* Portrait composition:');
const portraitEnd = source.indexOf('      /* USER VISUAL EDITOR TUNING — LANDSCAPE ONLY', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
assert.equal(digest(source.slice(portraitStart, portraitEnd)), 'b1e3f981773c52ab7d1c8fb3dea73acc61677b4e9f29a48100d1db598efb1ea2', 'Portrait CSS must remain byte-for-byte locked.');

const liveArtStart = source.indexOf('        /* Live Art keeps the same 10:7 frame in both orientations.');
const liveArtEnd = source.indexOf('        .le-weather-status,.le-weather-attribution', liveArtStart);
assert.ok(liveArtStart >= 0 && liveArtEnd > liveArtStart);
assert.equal(digest(source.slice(liveArtStart, liveArtEnd)), '5c6d833e9a5073a60c59b05f9d2e7ab92e013d562b4842a2f18235b774ab7709', 'Landscape Live Art CSS must remain unchanged.');

assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('function drawLandscapeWeatherScene(p,t)'));
assert.ok(source.includes('drawLandscapeWeatherScene(p,t);'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(source.includes('--le-weather-scene-flow-x:clamp(82px,8.7vw,132px);'));
assert.ok(source.includes('width:calc(100% + var(--le-weather-landscape-gap) + (2 * var(--le-weather-scene-flow-x)));'));
assert.ok(source.includes('margin-left:calc(-1 * var(--le-weather-scene-flow-x));'));
assert.ok(source.includes('left:var(--le-weather-scene-flow-x);'), 'Weather copy must align to the masthead left edge while the canvas bleeds left.');

// The content masthead stays put. Forecast and text layers retain their sizes/Y positions,
// but their former accumulated horizontal offsets are removed.
assert.ok(source.includes('transform:translate3d(0,0,0) scale(1.05);'));
assert.ok(source.includes('transform-origin:left center;'));
assert.ok(source.includes('transform:translate3d(0,2.4vh,0) scale(1.11);'));
assert.ok(source.includes('transform:translate3d(0,2.3vh,0) scale(1.31);'));
assert.ok(source.includes('transform:translate3d(0,.35vh,0) scale(.92);'));
assert.ok(source.includes('LIVE <span>//</span> EARTH'));

// Summary stays transparent; hairlines feather into the paper with no central dash.
assert.ok(source.includes('background:transparent;\n          backdrop-filter:none;\n          -webkit-backdrop-filter:none;'));
assert.ok(source.includes('color-mix(in srgb,var(--muted) 10%,transparent) 5%'));
assert.ok(source.includes('color-mix(in srgb,var(--muted) 25%,transparent) 50%'));
assert.ok(source.includes('.le-weather-summary::before { top:0;opacity:.82; }'));
assert.ok(source.includes('.le-weather-summary::after { bottom:0;opacity:.58; }'));
assert.ok(source.includes('.le-weather-stat:nth-child(2) .le-weather-stat-label'));
assert.ok(!source.includes('color-mix(in srgb,var(--accent) 58%,transparent) 48%'));

// The temporary visual editor is fully removed from the feature.
for (const token of ['installVisualLayoutEditor','layoutEditorCleanup','le-weather-layout-edit','le-layout-editing','data-le-layout']) {
  assert.ok(!source.includes(token), `Temporary editor residue remains: ${token}`);
}

// Shared Orb dock geometry is still read-only from Weather.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Weather text alignment, feathered Rain Chance rules, left illustration bleed, editor removal and Portrait/Live Art/Orb protections passed.');
