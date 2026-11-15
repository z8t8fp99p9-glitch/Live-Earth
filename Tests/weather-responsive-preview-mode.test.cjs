const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

assert.ok(source.includes('id="le-weather-preview-select"'));
for (const mode of ['auto', 'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'wind', 'hot', 'night']) {
  assert.ok(source.includes(`<option value="${mode}"`), `Missing preview mode ${mode}`);
}
assert.ok(source.includes('SAMPLE SCENE'));
assert.ok(source.includes("manualPreview=mode!=='auto'"));
assert.ok(source.includes('function sampleData(kind)'));
assert.ok(source.includes('clockTimer=window.setInterval(updateClock,30000)'));
assert.ok(source.includes('Location is OFF · sample conditions, not live data.'));
assert.ok(source.includes('SAMPLE VALUES, NOT A LIVE FORECAST.'));
assert.ok(source.includes('@media (orientation:portrait)'));
assert.ok(source.includes('@media (orientation:landscape)'));
assert.ok(source.includes('--le-weather-dock-clearance'));

console.log('Weather auto/live selection, labelled sample modes, local clock and responsive layout contracts passed.');
