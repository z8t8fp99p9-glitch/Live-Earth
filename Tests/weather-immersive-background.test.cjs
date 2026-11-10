const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes("runtime.registerFeature('weather', activateWeather)"));
assert.ok(source.includes("const view = mount('weather')"));
assert.ok(source.includes('function createAtmosphere()'));
assert.ok(source.includes('view.root.replaceChildren(scene)'));
assert.ok(source.includes('api.open-meteo.com/v1/forecast'));
assert.ok(source.includes('cloud_cover'));
assert.ok(source.includes('weather_code'));
assert.ok(source.includes('is_day'));
assert.ok(source.includes('le-weather-cloud-layer'));
assert.ok(source.includes('le-weather-rain'));
assert.ok(source.includes('le-weather-snow'));
assert.ok(source.includes('le-weather-fog'));
assert.ok(source.includes('le-weather-lightning'));
assert.ok(source.includes('live-earth-location-state'));
assert.ok(source.includes('live-earth-location-stop'));
assert.ok(source.includes("window.addEventListener('offline'"));
assert.ok(source.includes("window.addEventListener('online'"));
assert.ok(source.includes('prefers-reduced-motion:reduce'));
for (const forbidden of ['CHARACTER_POSITIONS','characterMarkup','le-weather-person','le-weather-people','le-weather-ball','Weather Today','le-weather-temp','le-weather-card','le-weather-hour','le-weather-range','le-weather-refresh','le-sfv-status','navigator.geolocation','getCurrentPosition(','watchPosition(','WebGLRenderer','new THREE.']) {
  assert.ok(!source.toLowerCase().includes(forbidden.toLowerCase()), `Background-only Weather must not contain ${forbidden}`);
}
console.log('Original background, weather adaptation, no-character/no-UI and privacy checks passed.');
