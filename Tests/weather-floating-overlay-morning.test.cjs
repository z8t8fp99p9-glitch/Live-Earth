const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes('view.panel.remove()'), 'No Weather header or panel may remain on screen');
assert.ok(source.includes('view.root.replaceChildren()'), 'The view must clear all previous Weather DOM content');
assert.ok(source.includes('position: absolute !important'), 'The new world root must occupy the feature stage');
assert.ok(source.includes('inset: 0 !important'), 'The scene must cover the complete Weather stage');
assert.ok(source.includes('width: 100% !important') && source.includes('height: 100% !important'), 'The scene must fill the stage on every orientation');
assert.ok(source.includes('.le-weather-foundation-canvas'), 'The world canvas must fill the complete scene');
assert.ok(!source.includes('le-weather-timeline'), 'The old forecast shelf must be absent');
assert.ok(!source.includes('le-weather-range'), 'The old hourly scrubber must be absent');
assert.ok(!source.includes('le-weather-refresh'), 'The old refresh control must be absent');
assert.ok(!source.includes('YOUR WEATHER WORLD'), 'The old weather heading must be absent');
assert.ok(!source.includes('ONLINE · LOCATION REQUIRED'), 'The old status badge must be absent');
assert.ok(!source.includes('Open-Meteo.com'), 'The old visible attribution must be absent');

console.log('Blank Weather presentation and full-screen foundation layout checks passed.');
