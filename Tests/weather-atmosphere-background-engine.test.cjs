const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

const portraitStart = source.indexOf('@media(min-width:600px) and (orientation:portrait)');
const landscapeStart = source.indexOf('@media (orientation:landscape) and (min-width:650px) {', portraitStart);
assert.ok(portraitStart >= 0 && landscapeStart > portraitStart);
const portrait = source.slice(portraitStart, landscapeStart);
assert.equal(digest(portrait), '6061da81a7a7ce1cf8668386d82c27a5d89fd9ac8be8fa4b8b972b1d83663173', 'Portrait CSS must remain byte-for-byte unchanged.');

const bgStart = source.indexOf('.le-weather-screen::after {', landscapeStart);
const bgEnd = source.indexOf('        .le-weather-content {', bgStart);
assert.ok(bgStart >= 0 && bgEnd > bgStart, 'Landscape background layer must exist before the layout.');
const background = source.slice(bgStart, bgEnd);
assert.ok(background.includes('z-index:0;'));
assert.ok(background.includes('pointer-events:none;'));
assert.ok(background.includes('data:image/svg+xml;base64,'));
assert.ok(background.includes('transition:filter 1100ms ease, opacity 1100ms ease;'));

const encoded = /data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/.exec(background);
assert.ok(encoded, 'Expected embedded, offline-capable vector scenery.');
const svg = Buffer.from(encoded[1], 'base64').toString('utf8');
for (const feature of ['id="farRidge"','id="midRidge"','id="nearRidge"','id="forest"','id="mapleLeaf"','A red maple bough frames the upper-left corner','id="softMist"']) {
  assert.ok(svg.includes(feature), `Background artwork missing: ${feature}`);
}

// Live weather and day/night state directly drives background grading.
assert.ok(source.includes('screen.dataset.weather=state.weather;screen.dataset.phase=state.phase;'));
for (const weather of ['cloudy','fog','rain','storm','snow','wind','hot']) {
  assert.ok(background.includes(`[data-weather="${weather}"]::after`), `Missing ${weather} atmosphere`);
}
assert.ok(background.includes('[data-phase="night"]::after'));
assert.ok(background.includes('hue-rotate(158deg)'));

// Protected UI layout and canvas remain intact, with the background behind them.
const liveArtStart = source.indexOf('        /* Live Art keeps the same 10:7 frame in both orientations.');
const liveArtEnd = source.indexOf('        .le-weather-status,.le-weather-attribution', liveArtStart);
assert.ok(liveArtStart >= 0 && liveArtEnd > liveArtStart);
const liveArt = source.slice(liveArtStart, liveArtEnd);
assert.ok(liveArt.includes('aspect-ratio:10 / 7;'));
assert.ok(liveArt.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));
assert.ok(source.includes('.le-weather-content {'));
assert.ok(source.includes('.le-weather-temperature-row {'));
assert.ok(source.includes('.le-weather-summary {'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(!source.includes('installVisualLayoutEditor'));
assert.ok(!source.includes('le-weather-layout-edit-toggle'));

console.log('Weather Background Engine passed: offline Japanese mountain/maple/pine scenery, live condition grading, night palette, exact Portrait CSS lock, 10:7 Live Art and untouched UI/dock.');
