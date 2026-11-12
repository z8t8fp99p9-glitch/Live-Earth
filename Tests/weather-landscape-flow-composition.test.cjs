const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

const portraitStart = source.indexOf('      /* Portrait composition:');
const portraitEnd = source.indexOf('      @media(prefers-reduced-motion:reduce)', portraitStart);
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
assert.ok(source.includes('.le-weather-dashboard::before'));
assert.ok(source.includes('width:calc(100% + var(--le-weather-landscape-gap) + var(--le-weather-scene-flow-x));'));
assert.ok(source.includes('margin:0 0 calc(-1 * var(--le-weather-scene-flow-y));'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Weather flow-only change verified; Portrait and Landscape Live Art CSS hashes are unchanged.');
