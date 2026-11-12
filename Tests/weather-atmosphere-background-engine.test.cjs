const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

// The previously approved Portrait sizing/typography rules remain byte-for-byte unchanged.
const portraitStart = source.indexOf('@media(min-width:600px) and (orientation:portrait)');
const landscapeStart = source.indexOf('@media (orientation:landscape) and (min-width:650px) {', portraitStart);
assert.ok(portraitStart >= 0 && landscapeStart > portraitStart);
assert.equal(digest(source.slice(portraitStart, landscapeStart)), '6061da81a7a7ce1cf8668386d82c27a5d89fd9ac8be8fa4b8b972b1d83663173', 'Existing Portrait layout rules must remain unchanged.');

// There is one stable offline background layer behind the UI, plus a portrait composition.
const bgStart = source.indexOf('.le-weather-screen::after {');
const bgEnd = source.indexOf('.le-weather-content{', bgStart);
assert.ok(bgStart >= 0 && bgEnd > bgStart, 'Shared background layer must be defined in base styles.');
const background = source.slice(bgStart, bgEnd);
assert.ok(background.includes('position:fixed;'));
assert.ok(background.includes('z-index:0;'));
assert.ok(background.includes('pointer-events:none;'));
assert.ok(background.includes('background-size:cover;'));
assert.ok(background.includes('background-size:100% 100%;'));
assert.ok(background.includes('orientation:portrait'));
const vectors = [...background.matchAll(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g)];
assert.equal(vectors.length, 2, 'Need one offline SVG for Landscape and one responsive Portrait composition.');
const svgs = vectors.map(x => Buffer.from(x[1], 'base64').toString('utf8'));
const portraitSvg = svgs.find(svg => svg.includes('viewBox=\"0 0 900 1800\"'));
const landscapeSvg = svgs.find(svg => svg.includes('viewBox=\"0 0 1800 900\"'));
assert.ok(portraitSvg, 'Portrait artwork must have a native vertical composition.');
assert.ok(landscapeSvg, 'Landscape artwork must retain its wide composition.');
for (const feature of ['id=\"farRidge\"','id=\"midRidge\"','id=\"nearRidge\"','id=\"forest\"','id=\"mapleLeaf\"']) {
  assert.ok(landscapeSvg.includes(feature), `Landscape artwork missing: ${feature}`);
}
for (const feature of ['id=\"far\"','id=\"mid\"','id=\"near\"','id=\"forest\"','id=\"maple\"']) {
  assert.ok(portraitSvg.includes(feature), `Portrait artwork missing: ${feature}`);
}
assert.ok(portraitSvg.includes('red maple bough') && landscapeSvg.includes('red maple bough'), 'Both compositions retain the red maple bough.');

// Weather state still updates the Live Weather illustration, but cannot recolour the background.
assert.ok(source.includes('screen.dataset.weather=state.weather;screen.dataset.phase=state.phase;'));
for (const weather of ['cloudy','fog','rain','storm','snow','wind','hot']) {
  assert.ok(!background.includes(`[data-weather="${weather}"]::after`), `${weather} must not grade the fixed background`);
}
assert.ok(!background.includes('[data-phase="night"]::after'));
assert.ok(!background.includes('hue-rotate'));
assert.ok(!source.includes('.le-weather-screen[data-phase="night"]{--paper:'));
assert.ok(!source.includes('.le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"],.le-weather-screen[data-weather="fog"]{--paper:'));
assert.ok(!source.includes('.le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"]{--accent:'));
assert.ok(!source.includes('.le-weather-screen[data-weather="snow"]{--accent:'));
assert.ok(!source.includes('.le-weather-screen[data-weather="hot"]{--accent:'));

// Fixed paper and ink tokens prevent the surrounding screen from flipping dark/grey by weather.
assert.ok(source.includes('--paper:#f4efe9;--paper-deep:#ece6df;--ink:#172123;--muted:#68716f;'));
assert.ok(source.includes('background:linear-gradient(180deg,#f4e2d8 0%,#f2e9df 34%,#e3e9e3 66%,#c2d2cf 100%)'));

// Protected interface/layout remains present: Portrait CSS, Landscape sizing, Live Art 10:7 and dock.
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
assert.ok(!/#le-feature-dock\\s*\\{/.test(source));
assert.ok(!/weatherDock\\.style\\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(!source.includes('installVisualLayoutEditor'));
assert.ok(!source.includes('le-weather-layout-edit-toggle'));

console.log('Static shared Japanese background passed: matching Landscape and Portrait artwork, no weather/night colour grading, unchanged Portrait layout, locked 10:7 Live Art and untouched dock.');
