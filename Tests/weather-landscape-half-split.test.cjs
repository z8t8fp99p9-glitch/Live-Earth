const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);

assert.ok(source.includes('@media (orientation:landscape) and (min-width:650px)'));
assert.ok(source.includes('grid-template-columns:minmax(218px,.42fr) minmax(0,1fr);'));
assert.ok(source.includes('grid-template-areas:"forecast artwork";'));
assert.ok(source.includes('grid-area:forecast;'));
assert.ok(source.includes('grid-area:artwork;'));
assert.ok(source.includes('grid-template-rows:auto minmax(58px,1fr) auto;'));
assert.ok(source.includes('grid-template-areas:"hero" "scene" "summary";'));
assert.ok(source.includes('height:100%;'));
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
assert.ok(source.includes('padding-left:max(env(safe-area-inset-left),clamp(40px,5.8vw,64px))'));
assert.ok(source.includes('padding-right:max(env(safe-area-inset-right),clamp(40px,5.8vw,64px))'));
assert.ok(source.includes('grid-template-columns:minmax(218px,.42fr) minmax(0,1fr);'));
assert.ok(source.includes('font-size:clamp(12px,1.35vw,14px)'));
assert.ok(source.includes('font-size:clamp(22px,2.8vw,31px)'));
assert.ok(source.includes('function drawMinimalLandscape(p,t)'));
assert.ok(source.includes('const compactLandscape=window.innerWidth>window.innerHeight&&width<560;'));
assert.ok(!source.includes('le-weather-hourly'));
assert.ok(!source.includes('NEXT 6 HOURS'));
assert.ok(!source.includes('hourly:'));

// Shared Orb dock is measured only; its styles and geometry remain outside Weather ownership.
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(source.includes('function syncDockClearance()'));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Weather compact overview, Live Art priority, notched-safe masthead and locked Orb dock contracts passed.');
