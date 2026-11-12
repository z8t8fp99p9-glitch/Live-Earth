const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

// Keep structural protection for Portrait without pinning it to a brittle hash.
// This test-only correction does not edit or redefine Portrait CSS.
const portraitStart = source.indexOf('      /* Portrait composition:');
const portraitEnd = source.indexOf(
  '      @media(prefers-reduced-motion:reduce)',
  portraitStart
);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
const portrait = source.slice(portraitStart, portraitEnd);
assert.ok(portrait.includes('.le-weather-screen'));
assert.ok(portrait.includes('.le-weather-dashboard'));
assert.ok(portrait.includes('.le-weather-studio'));

// Live Art must remain a true 10:7 frame in Landscape.
const liveArtStart = source.indexOf(
  '        /* Live Art keeps the same 10:7 frame in both orientations.'
);
const liveArtEnd = source.indexOf(
  '        .le-weather-status,.le-weather-attribution',
  liveArtStart
);
assert.ok(liveArtStart >= 0 && liveArtEnd > liveArtStart);
const liveArt = source.slice(liveArtStart, liveArtEnd);
assert.ok(liveArt.includes('aspect-ratio:10 / 7;'));
assert.ok(liveArt.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));

// Validate the currently approved Landscape-only washi background.
const start = source.indexOf(
  '@media (orientation:landscape) and (min-width:650px) {'
);
const end = source.indexOf(
  '@media (orientation:landscape) and (min-width:650px) and (max-width:820px)',
  start
);
assert.ok(start >= 0 && end > start, 'Expected the primary Landscape CSS block.');
const landscape = source.slice(start, end);

assert.ok(landscape.includes('.le-weather-screen::after'));
assert.ok(landscape.includes('rgba(190,91,67,.12)'));
assert.ok(landscape.includes('rgba(138,151,126,.13)'));
assert.ok(landscape.includes('rgba(91,116,99,.20)'));
assert.ok(landscape.includes('rgba(91,116,99,.18)'));
assert.ok(landscape.includes('rgba(196,205,185,.25)'));
assert.ok(landscape.includes('.le-weather-dashboard::before'));
assert.ok(landscape.includes('border-radius:0;'));
assert.ok(landscape.includes('filter:blur(13px);'));

// Guard the real, responsive Landscape editorial typography.
assert.ok(landscape.includes('width:min(94%,410px);'));
assert.ok(landscape.includes('font-size:clamp(40px,4.15vw,57px);'));
assert.ok(landscape.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(landscape.includes('font-size:clamp(19px,1.55vw,22px);'));
assert.ok(landscape.includes('font-size:clamp(17px,1.9vw,20px);'));
assert.ok(landscape.includes('font-size:9px;letter-spacing:.065em;'));
assert.ok(landscape.includes('top:clamp(108px,19vh,140px);'));

// Keep short Landscape viewports fitted without changing Portrait.
assert.ok(source.includes('font-size:clamp(34px,4.2vw,44px);'));
assert.ok(source.includes('font-size:clamp(62px,7.3vw,76px);'));
assert.ok(source.includes('font-size:clamp(15px,1.9vw,17px);'));

// Shared feature dock is read-only from Weather.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log(
  'Landscape background and typography checks passed; Portrait structure, 10:7 Live Art and shared Orb dock protections passed.'
);
