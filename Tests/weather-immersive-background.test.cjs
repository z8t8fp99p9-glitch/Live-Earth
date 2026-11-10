const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes("runtime.registerFeature('weather', activateWeather)"), 'Weather must use its existing Stacks route');
assert.ok(source.includes("const view = mount('weather')") && source.includes('view.root.replaceChildren()'), 'Weather must replace the previous view contents');
assert.ok(source.includes('Weather Today'), 'The clean forecast card must be present');
assert.ok(source.includes('le-weather-temperature'), 'The large current temperature must be present');
assert.ok(source.includes('le-weather-condition-vertical'), 'The vertical condition treatment must be present');
assert.ok(source.includes('le-weather-landscape'), 'The illustrated landscape from the supplied direction must remain');
assert.ok(source.includes('le-weather-river-flow'), 'The river may have subtle flow animation');
assert.ok(source.includes('le-weather-cloud-layer'), 'Cloud coverage must be visualized');
assert.ok(source.includes('le-weather-rain') && source.includes('le-weather-snow'), 'Precipitation effects must be supported');
assert.ok(source.includes('live-earth-location-state') && source.includes('live-earth-location-stop'), 'Location Orb changes must clear or refresh local weather');
assert.ok(source.includes("window.addEventListener('offline'") && source.includes("window.addEventListener('online'"), 'Offline and reconnect states must be handled');
assert.ok(source.includes('prefers-reduced-motion'), 'Reduced motion must be respected');
for (const forbidden of ['CHARACTER_POSITIONS','characterMarkup','le-weather-person','le-weather-people','new THREE.','WebGLRenderer','navigator.geolocation','getCurrentPosition(','watchPosition(']) {
  assert.ok(!source.toLowerCase().includes(forbidden.toLowerCase()), `Weather must not contain ${forbidden}`);
}
console.log('Illustrated Weather UI, original Stacks route, live atmosphere and character-free contract checks passed.');
