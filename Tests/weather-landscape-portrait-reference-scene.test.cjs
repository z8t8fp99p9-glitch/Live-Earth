const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const design = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'WEATHER-DESIGN-DIRECTION.md'), 'utf8');

const landscapeStart = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const landscapeEnd = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', landscapeStart);
const landscapeCss = source.slice(landscapeStart, landscapeEnd);
assert.ok(landscapeStart >= 0 && landscapeEnd > landscapeStart);

// Weather readings retain a lower safety band while the illustration flows beneath them and toward Live Art.
assert.ok(landscapeCss.includes('padding-bottom:clamp(22px,7vh,30px);'));
assert.ok(landscapeCss.includes('--le-weather-scene-flow-x:clamp(42px,5.6vw,82px);'));
assert.ok(landscapeCss.includes('--le-weather-scene-flow-y:clamp(22px,3.2vh,30px);'));
assert.ok(landscapeCss.includes('z-index:2;'));
assert.ok(landscapeCss.includes('z-index:3;'));
assert.ok(landscapeCss.includes('z-index:5;'));
assert.ok(landscapeCss.includes('grid-template-rows:minmax(0,1fr) auto;'));
assert.ok(landscapeCss.includes('grid-template-areas:"scene" "summary";'));

// Keep the portrait painter as the master; landscape applies only a bounded view-specific crop.
const drawStart = source.indexOf('    function drawLandscapeWeatherScene(p,t){');
const drawEnd = source.indexOf('    function loop(now)', drawStart);
assert.ok(drawStart >= 0 && drawEnd > drawStart);
const painterBranch = source.slice(drawStart, drawEnd);
assert.ok(painterBranch.includes('const compact=Math.max(0,Math.min(1,(1.82-aspect)/.48));'));
assert.ok(painterBranch.includes('const zoomX=1.045+compact*.055;'));
assert.ok(painterBranch.includes('const zoomY=1.055+compact*.065;'));
assert.ok(painterBranch.includes('drawMinimalLandscape(p,t);'));
assert.ok(painterBranch.includes("window.matchMedia('(orientation:landscape) and (min-width:650px)').matches"));
assert.ok(painterBranch.includes('}else{\n        drawMinimalLandscape(p,t);'));

// The Portrait CSS section remains separate and the 10:7 Live Art contract is unchanged.
const portraitStart = source.indexOf('/* Portrait composition:');
const portraitEnd = source.indexOf('@media(prefers-reduced-motion:reduce)', portraitStart);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
const portraitCss = source.slice(portraitStart, portraitEnd);
assert.ok(portraitCss.includes('top:clamp(108px,15dvh,132px);'));
assert.ok(portraitCss.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(design.includes('canvas may also flow behind the summary band'));
assert.ok(design.includes('lower safety band'));
assert.ok(design.includes('shared paper-and-mist atmosphere'));

console.log('Portrait-inspired Weather illustration flow, safe summary overlay, unchanged Portrait CSS and locked 10:7 Live Art contracts passed.');
