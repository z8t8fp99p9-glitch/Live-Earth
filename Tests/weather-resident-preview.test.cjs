const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');
const residents = fs.readFileSync(path.join(root, 'Residents/resident-library.js'), 'utf8');

assert.ok(weather.includes("el('section', 'le-weather-resident-preview')"), 'The preview must be part of the normal Weather panel');
assert.ok(weather.includes("'Residents · Preview'"), 'The preview must be clearly labelled');
assert.ok(weather.includes("'See the scene as it appears in Weather'"), 'The panel must explain that it previews the actual Weather scene');

const expected = ['morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping'];
for (const id of expected) {
  assert.ok(weather.includes(`id: '${id}'`), `The Weather preview must offer ${id}`);
  assert.ok(residents.includes(`${id}: Object.freeze(`), `The Residents library must implement ${id}`);
}
assert.ok(weather.includes("const livePreviewButton = button('Live forecast'"), 'A one-tap return to forecast behaviour must be available');
assert.ok(weather.includes('function applyResidentPreview(id)'), 'Preview selection must apply a resident scenario');
assert.ok(weather.includes('function restoreResidentForecast()'), 'Preview selection must restore live forecast behaviour');
assert.ok(weather.includes('forecast data is unchanged'), 'Preview must not present simulated values as a real forecast');
assert.ok(weather.includes("scene.dataset.residentPreview = 'true'"), 'The scene must expose preview state explicitly');
assert.ok(weather.includes('renderSelected(index)'), 'Selecting a real forecast hour must return control to forecast-driven activity');
assert.ok(weather.includes("createParticles(scene.querySelector(option.particles === 'rain' ? '.le-weather-rain' : '.le-weather-snow'), option.particles, previewWeather[option.particles])"), 'Rain and snow previews must show the matching Weather scene particles');
assert.ok(!weather.includes('navigator.geolocation') && !weather.includes('getCurrentPosition'), 'Resident previews must not request Location permission');
assert.ok(!weather.includes('localStorage') && !weather.includes('sessionStorage'), 'Resident previews must not persist manual preview state');

console.log('Weather resident scenario preview controls passed.');
