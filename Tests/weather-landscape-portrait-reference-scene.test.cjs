const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

const landscapeStart = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const landscapeEnd = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', landscapeStart);
assert.ok(landscapeStart >= 0 && landscapeEnd > landscapeStart);
const landscapeCss = source.slice(landscapeStart, landscapeEnd);

// The existing Weather painter is shared; Landscape changes only the canvas viewport and crop.
assert.ok(landscapeCss.includes('--le-weather-scene-flow-x:clamp(82px,8.7vw,132px);'));
assert.ok(landscapeCss.includes('width:calc(100% + var(--le-weather-landscape-gap) + (2 * var(--le-weather-scene-flow-x)));'));
assert.ok(landscapeCss.includes('margin-left:calc(-1 * var(--le-weather-scene-flow-x));'));
assert.ok(landscapeCss.includes('height:calc(100% + var(--le-weather-scene-flow-y));'));
assert.ok(landscapeCss.includes('margin:0 0 calc(-1 * var(--le-weather-scene-flow-y));'));
assert.ok(source.includes('function drawLandscapeWeatherScene(p,t)'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));

// The Portrait stylesheet remains a separate, exact block, outside Landscape tuning.
const portraitStart = source.indexOf('      /* Portrait composition:');
const portraitEnd = source.indexOf('      /* USER VISUAL EDITOR TUNING — LANDSCAPE ONLY', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
const portraitCss = source.slice(portraitStart, portraitEnd);
assert.ok(portraitCss.includes('top:clamp(108px,15dvh,132px);'));
assert.ok(portraitCss.includes('aspect-ratio:10 / 7;'));

// Weather remains the only painting expanded; Live Art keeps its locked frame and the dock stays read-only.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Shared Weather painter, Landscape canvas bleed, exact Portrait separation, 10:7 Live Art and Orb-dock protection passed.');
