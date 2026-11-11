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

assert.ok(tool.includes('aspect-ratio:2.5 / 1'));
assert.ok(tool.includes('aspect-ratio:3 / 1'));
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

console.log('Weather Layout Editor coverage, preview ratios, export and non-destructive contract passed.');
