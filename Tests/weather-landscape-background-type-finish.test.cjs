const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

const portraitStart = source.indexOf('      /* Portrait composition:');
const portraitEnd = source.indexOf('      @media(prefers-reduced-motion:reduce)', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
assert.equal(hash(source.slice(portraitStart, portraitEnd)), 'b1e3f981773c52ab7d1c8fb3dea73acc61677b4e9f29a48100d1db598efb1ea2');

const liveArtStart = source.indexOf('        /* Live Art keeps the same 10:7 frame in both orientations.');
const liveArtEnd = source.indexOf('        .le-weather-status,.le-weather-attribution', liveArtStart);
assert.ok(liveArtStart >= 0 && liveArtEnd > liveArtStart);
assert.equal(hash(source.slice(liveArtStart, liveArtEnd)), '5c6d833e9a5073a60c59b05f9d2e7ab92e013d562b4842a2f18235b774ab7709');

const start = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const end = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', start);
assert.ok(start >= 0 && end > start);
const landscape = source.slice(start, end);

// The shared landscape-only background is a continuous paper-and-mist field, not another card.
assert.ok(landscape.includes('.le-weather-screen::after'));
assert.ok(landscape.includes('radial-gradient(ellipse at 7% 100%'));
assert.ok(landscape.includes('radial-gradient(ellipse at 94% 100%'));
assert.ok(landscape.includes('border-radius:0;'));
assert.ok(landscape.includes('filter:blur(13px);'));
assert.ok(landscape.includes('.le-weather-dashboard::before'));

// Weather typography moves closer to the large editorial reference while staying responsive.
assert.ok(landscape.includes('width:min(94%,410px);'));
assert.ok(landscape.includes('font-size:clamp(40px,4.15vw,57px);'));
assert.ok(landscape.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(landscape.includes('font-size:clamp(19px,1.55vw,22px);'));
assert.ok(landscape.includes('font-size:clamp(17px,1.9vw,20px);'));
assert.ok(landscape.includes('font-size:9px;letter-spacing:.065em;'));
assert.ok(landscape.includes('top:clamp(108px,19vh,140px);'));

// Short landscape viewports have their own legible but safely fitted scale.
assert.ok(source.includes('font-size:clamp(34px,4.2vw,44px);'));
assert.ok(source.includes('font-size:clamp(62px,7.3vw,76px);'));
assert.ok(source.includes('font-size:clamp(15px,1.9vw,17px);'));

// The shared dock is still read-only, and Live Art remains a true 10:7 canvas.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Landscape background and editorial type polish passed; Portrait and 10:7 Live Art hashes remain locked.');
