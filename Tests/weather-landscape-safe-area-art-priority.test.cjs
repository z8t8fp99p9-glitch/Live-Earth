const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const editor = fs.readFileSync(path.join(__dirname, '..', 'Tools', 'WEATHER-LAYOUT-EDITOR.html'), 'utf8');
const design = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'WEATHER-DESIGN-DIRECTION.md'), 'utf8');

// The landscape masthead is one row with all four labels placed inside both physical safe areas.
assert.ok(source.includes('grid-template-columns:minmax(0,1fr) auto auto auto;'));
assert.ok(source.includes('padding-left:max(env(safe-area-inset-left),clamp(26px,3.4vw,42px))'));
assert.ok(source.includes('padding-right:max(env(safe-area-inset-right),clamp(26px,3.4vw,42px))'));
assert.ok(source.includes('font-size:clamp(12px,1.35vw,14px)'));
assert.ok(source.includes('font-size:clamp(9px,1.05vw,11px)'));

// Both paintings remain substantial; landscape Weather readings are layered over its full scene.
assert.ok(source.includes('grid-template-columns:minmax(210px,.56fr) minmax(0,1fr);'));
const landscapeStart = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const landscapeEnd = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', landscapeStart);
const landscapeCss = source.slice(landscapeStart, landscapeEnd);
assert.ok(landscapeCss.includes('grid-template-rows:minmax(0,1fr) auto;'));
assert.ok(landscapeCss.includes('grid-template-areas:"scene" "summary";'));
assert.ok(landscapeCss.includes('padding-bottom:clamp(22px,7vh,30px);'));
assert.ok(landscapeCss.includes('width:calc(100% + var(--le-weather-landscape-gap) + var(--le-weather-scene-flow-x));'));
assert.ok(landscapeCss.includes('height:calc(100% + var(--le-weather-scene-flow-y));'));
assert.ok(landscapeCss.includes('margin:0 0 calc(-1 * var(--le-weather-scene-flow-y));'));
assert.ok(landscapeCss.includes('z-index:2;'));
assert.ok(landscapeCss.includes('z-index:3;'));
assert.ok(landscapeCss.includes('z-index:5;'));
assert.ok(landscapeCss.includes('backdrop-filter:blur(2px);'));
assert.ok(landscapeCss.includes('.le-weather-dashboard::before'));
assert.ok(landscapeCss.includes('font-size:clamp(40px,4.15vw,57px);'));
assert.ok(landscapeCss.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(landscapeCss.includes('top:clamp(108px,19vh,140px);'));
assert.ok(landscapeCss.includes('position:absolute;\n          z-index:4;\n          top:0;'));
assert.ok(landscapeCss.includes('min-height:120px;'));
assert.ok(landscapeCss.includes('position:absolute;\n          z-index:3;'));
assert.ok(source.includes('grid-template-areas:"forecast artwork"'));
assert.ok(source.includes('font-size:clamp(22px,2.8vw,31px)'));
assert.ok(source.includes('white-space:normal;\n          overflow:visible;\n          text-overflow:clip;'));
assert.ok(source.includes('Live Art keeps the same 10:7 frame in both orientations.'));
assert.ok(source.includes('function drawMinimalLandscape(p,t)'));
assert.ok(source.includes('function drawLandscapeWeatherScene(p,t)'));
assert.ok(source.includes('const zoomX=1.045+compact*.055;'));
assert.ok(source.includes('const zoomY=1.055+compact*.065;'));
assert.ok(source.includes("if(window.matchMedia('(orientation:landscape) and (min-width:650px)').matches){"));
assert.ok(source.includes('--le-weather-landscape-height:clamp(240px,calc(100svh - env(safe-area-inset-top) - max(78px,calc(var(--le-weather-dock-clearance,116px) - 30px)) - 42px),420px);'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(220px,calc(100svh - env(safe-area-inset-top) - max(82px,calc(var(--le-weather-dock-clearance,116px) - 22px)) - 44px),320px);'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(196px,calc(100svh - env(safe-area-inset-top) - max(78px,calc(var(--le-weather-dock-clearance,108px) - 16px)) - 48px),288px);'));
assert.ok(source.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));
assert.ok(source.includes('place-items:center;'));
assert.ok(source.includes('justify-self:center;'));
assert.ok(source.includes('align-self:center;'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(!source.includes('const compactLandscape='));

// The portrait full-card 10:7 Live Art remains independent of landscape treatment.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));
assert.ok(source.includes('width:min(90vw,760px,max(260px,calc((100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,112px) - 360px) * 1.428571)));'));
assert.ok(source.includes('grid-template-areas:"scene" "summary" "studio";'));
const portraitStart = source.indexOf('/* Portrait composition:');
const portraitEnd = source.indexOf('@media(prefers-reduced-motion:reduce)', portraitStart);
const portraitCss = source.slice(portraitStart, portraitEnd);
assert.ok(portraitStart >= 0 && portraitEnd > portraitStart);
assert.ok(portraitCss.includes('top:clamp(108px,15dvh,132px);'));
assert.ok(portraitCss.includes('width:min(90vw,760px,max(260px,calc((100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,112px) - 360px) * 1.428571)));'));
assert.ok(portraitCss.includes('height:var(--le-weather-scene-height,clamp(24dvh,30dvh,38dvh));'));

// The dock remains read-only and no hours-ahead forecast is reintroduced.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('weatherDock.getBoundingClientRect()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('hourly:'));

assert.ok(editor.includes('largest rectangle that fits the available width and height'));
assert.ok(editor.includes('Portrait begins below the top safe area with extra breathing room.'));
assert.ok(design.includes('about 36%') && design.includes('about 64%'));
assert.ok(design.includes('controlled dock-clearance overlap'));
assert.ok(editor.includes('about 36% to Weather and 64% to Live Art'));

console.log('Weather paper atmosphere, seamless scene bleed, portrait-inspired typography, summary readability, unchanged Live Art and protected portrait/dock contracts passed.');
