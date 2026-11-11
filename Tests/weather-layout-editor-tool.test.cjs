const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tool = fs.readFileSync(path.join(__dirname, '..', 'Tools', 'WEATHER-LAYOUT-EDITOR.html'), 'utf8');
const weather = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

for (const selector of [
  '.le-weather-topbar','.le-weather-brand','.le-weather-place','.le-weather-date-row',
  '.le-weather-mode','.le-weather-headline','.le-weather-temperature-row',
  '.le-weather-temperature','.le-weather-condition','.le-weather-art-stage',
  '.le-weather-art-canvas','.le-weather-summary','.le-weather-studio',
  '.le-weather-studio-head','.le-weather-studio-canvas','.le-weather-studio-foot',
]) assert.ok(tool.includes(selector), `Missing Weather editor selector: ${selector}`);

assert.ok(tool.includes('The temperature and condition are layered inside the full Weather scene'));
assert.ok(tool.includes('Landscape gives about 36% to Weather and 64% to Live Art, centres the 10:7 Live Art frame in the available feature area, enlarged to the largest rectangle that fits the available width and height.'));
assert.ok(tool.includes('no artificial canvas sizing overrides'));
assert.ok(tool.includes('.le-weather-forecast-column'));
assert.ok(tool.includes('.le-weather-art-column'));
assert.ok(!tool.includes('height:15dvh!important'));
assert.ok(!tool.includes('height:clamp(150px,19dvh,184px)!important'));
assert.ok(!tool.includes('aspect-ratio:2.5 / 1'));
assert.ok(!tool.includes('aspect-ratio:3 / 1'));
assert.ok(!tool.includes('aspect-ratio:2.5 / 1'));
assert.ok(!tool.includes('aspect-ratio:3 / 1'));
assert.ok(weather.includes('.le-weather-temperature-row {\n          position:absolute;'));
assert.ok(weather.includes('padding-top:calc(env(safe-area-inset-top) + clamp(20px,2.4dvh,28px));'));
assert.ok(weather.includes('aspect-ratio:10 / 7;'));
assert.ok(weather.includes('drawMinimalLandscape(p,t);'));
assert.ok(weather.includes('place-items:center;'));
assert.ok(weather.includes('<div class="le-weather-temperature-row">'));
assert.ok(tool.includes('Copy layout details'));
assert.ok(tool.includes('Export JSON'));
assert.ok(tool.includes('Scroll preview'));
assert.ok(tool.includes('weather-layout-details.json'));
assert.ok(tool.includes('win.LiveEarthFeatureViews')); // The editor reaches the feature API through its same-origin frame window.
assert.ok(!tool.includes('localStorage'));
assert.ok(!tool.includes('fetch('));
assert.ok(!/#le-feature-dock\\s*\\{/.test(tool));
assert.ok(!tool.includes('le-weather-hourly'));
assert.ok(!weather.includes('le-weather-hourly'));
assert.ok(weather.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/weatherDock\\.style\\.(?:bottom|top|left|right|transform|width|height)/.test(weather));

console.log('Weather Layout Editor production-matched full-canvas preview, export and non-destructive contract passed.');
