const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

assert.ok(source.includes('@media (orientation:landscape) and (min-width:650px)'));
assert.ok(source.includes('grid-template-columns:minmax(210px,.56fr) minmax(0,1fr);'));
assert.ok(source.includes('grid-template-areas:"forecast artwork";'));
assert.ok(source.includes('Keep the compact landscape masthead on one line to protect painting height.'));
assert.ok(source.includes('grid-template-rows:auto;\n          column-gap:clamp(7px,1.1vw,11px);'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(220px,calc(100svh - env(safe-area-inset-top) - max(82px,calc(var(--le-weather-dock-clearance,116px) - 22px)) - 44px),320px);'));
assert.ok(source.includes('grid-area:forecast;'));
assert.ok(source.includes('grid-area:artwork;'));
assert.ok(source.includes('grid-template-rows:minmax(0,1fr) auto;'));
assert.ok(source.includes('grid-template-areas:"scene" "summary";'));
assert.ok(source.includes('padding-bottom:clamp(22px,7vh,30px);'));
assert.ok(source.includes('width:calc(100% + var(--le-weather-landscape-gap) + var(--le-weather-scene-flow-x));'));
assert.ok(source.includes('height:calc(100% + var(--le-weather-scene-flow-y));'));
assert.ok(source.includes('margin:0 0 calc(-1 * var(--le-weather-scene-flow-y));'));
assert.ok(source.includes('z-index:2;\n          display:grid;'));
assert.ok(source.includes('z-index:3;\n          display:grid;'));
assert.ok(source.includes('z-index:5;'));
assert.ok(source.includes('.le-weather-dashboard::before'));
assert.ok(source.includes('width:min(94%,410px);'));
assert.ok(source.includes('font-size:clamp(40px,4.15vw,57px);'));
assert.ok(source.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(source.includes('function drawLandscapeWeatherScene(p,t)'));
assert.ok(source.includes('const compact=Math.max(0,Math.min(1,(1.82-aspect)/.48));'));
assert.ok(source.includes('ctx.scale(zoomX,zoomY);'));
assert.ok(source.includes("window.matchMedia('(orientation:landscape) and (min-width:650px)').matches"));
assert.ok(source.includes('position:absolute;\n          z-index:4;\n          top:0;\n          left:0;\n          right:0;'));
assert.ok(source.includes('top:clamp(108px,19vh,140px);'));
assert.ok(source.includes('min-height:120px;'));
assert.ok(source.includes('filter:drop-shadow(0 1px 12px color-mix(in srgb,var(--paper) 76%,transparent));'));
assert.ok(source.includes('Landscape Weather is a continuous ink-wash field'));
assert.ok(source.includes('white-space:nowrap;'));
assert.ok(source.includes('font-size:clamp(40px,4.15vw,57px);'));
assert.ok(source.includes('height:100%;'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(240px,calc(100svh - env(safe-area-inset-top) - max(78px,calc(var(--le-weather-dock-clearance,116px) - 30px)) - 42px),420px);'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(220px,calc(100svh - env(safe-area-inset-top) - max(82px,calc(var(--le-weather-dock-clearance,116px) - 22px)) - 44px),320px);'));
assert.ok(source.includes('--le-weather-landscape-height:clamp(196px,calc(100svh - env(safe-area-inset-top) - max(78px,calc(var(--le-weather-dock-clearance,108px) - 16px)) - 48px),288px);'));
assert.ok(source.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));
assert.ok(source.includes('width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('place-items:center;'));
assert.ok(source.includes('justify-self:center;'));
assert.ok(source.includes('align-self:center;'));
assert.ok(source.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(source.includes('font-size:clamp(17px,1.9vw,20px)'));
assert.ok(source.includes('white-space:normal;\n          overflow:visible;\n          text-overflow:clip;'));
assert.ok(source.includes('max(78px,calc(var(--le-weather-dock-clearance,116px) - 30px))'));
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('var(--le-weather-dock-clearance'));

const dashboard = source.indexOf('<div class="le-weather-dashboard">');
const forecast = source.indexOf('<div class="le-weather-forecast-column">', dashboard);
const hero = source.indexOf('<section class="le-weather-hero"', forecast);
const scene = source.indexOf('<div class="le-weather-art-stage"', forecast);
const summary = source.indexOf('<section class="le-weather-summary"', forecast);
const artwork = source.indexOf('<div class="le-weather-art-column">', summary);
const studio = source.indexOf('<section class="le-weather-studio"', artwork);

assert.ok(dashboard >= 0 && forecast > dashboard);
assert.ok(hero > forecast && scene > hero && summary > scene);
assert.ok(artwork > summary && studio > artwork);
assert.ok(source.includes('padding-left:max(env(safe-area-inset-left),clamp(26px,3.4vw,42px))'));
assert.ok(source.includes('padding-right:max(env(safe-area-inset-right),clamp(26px,3.4vw,42px))'));
assert.ok(source.includes('grid-template-columns:minmax(210px,.56fr) minmax(0,1fr);'));
assert.ok(source.includes('font-size:clamp(12px,1.35vw,14px)'));
assert.ok(source.includes('font-size:clamp(22px,2.8vw,31px)'));
assert.ok(source.includes('function drawMinimalLandscape(p,t)'));
assert.ok(source.includes('drawMinimalLandscape(p,t);'));
assert.ok(!source.includes('const compactLandscape='));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('NEXT 6 HOURS'));
assert.ok(!source.includes('hourly:'));

// Shared Orb dock is measured only; its styles and geometry remain outside Weather ownership.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Weather 36/64 overview, flowing Weather illustration, adaptive typography, safe summary and untouched 10:7 Live Art contracts passed.');
