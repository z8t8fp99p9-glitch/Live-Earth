const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const weather = read('Weather/weather-view.js');
const residents = read('Residents/resident-library.js');
const engine = read('Residents/resident-3d-engine.mjs');
const stacks = read('Stacks/stacks-feature-views.js');
const sw = read('sw.js');
const manager = read('Global/update-manager.js');
const protectedRegistry = read('Global/view-module-registry.js');

assert.ok(weather.includes("runtime.registerFeature('weather', activateWeather)"), 'Weather must keep its existing Stacks registration');
assert.ok(weather.includes('function createAtmosphere()'), 'Weather must create one persistent atmosphere');
assert.ok(weather.includes('le-weather-landscape'), 'The same illustrated landscape must remain in the scene');
assert.ok(weather.includes('scene.dataset.weather = state.weather'), 'Weather state must update the atmosphere rather than swap scenes');
assert.ok(weather.includes('scene.dataset.phase = state.phase'), 'Time of day must affect the same scene lighting');
assert.ok(weather.includes('scene.dataset.mode = state.mode'), 'Character animation must follow the selected forecast hour');

assert.equal((residents.match(/id: 'one'/g) || []).length, 1, 'Resident one must be defined once');
assert.equal((residents.match(/id: 'two'/g) || []).length, 1, 'Resident two must be defined once');
assert.equal((residents.match(/id: 'three'/g) || []).length, 1, 'Resident three must be defined once');
assert.deepEqual(Array.from(residents.matchAll(/kind: '(red|lady|blue)'/g), match => match[1]), ['red', 'lady', 'blue'], 'The three stable identities must map to their own 3D designs');
assert.ok(residents.includes("'./Residents/resident-3d-engine.mjs'"), 'Residents must load the real 3D engine');
assert.ok(residents.includes("renderer: 'threejs-procedural-3d'"), 'Three.js mesh characters must be the normal rendering path');
assert.ok(residents.includes('mounted.engine?.dispose()'), 'The 3D renderer must release on view cleanup');
assert.ok(!weather.includes('function characterMarkup('), 'Weather must not own duplicate character artwork');
assert.ok(weather.includes('ensureResidentLibrary()'), 'Weather must load the shared Residents library');
assert.ok(weather.includes('LiveEarthResidentLibrary?.unmount'), 'Weather must release residents when deactivated');
assert.ok(weather.includes('stargaze'), 'Clear nights should offer a quiet stargazing activity');
assert.ok(weather.includes("mode = snow ? 'snow'"), 'Snow must activate bundled-up character behaviour');
assert.ok(weather.includes("hot ? 'heat'"), 'Heat must activate warm-weather character behaviour');
assert.ok(weather.includes("fastWind ? 'wind'"), 'Fast wind must activate gust reactions');
assert.ok(weather.includes('gusts >= 48 || wind >= 35'), 'Fast-wind behaviour must use sustained wind/gust data');
assert.ok(weather.includes("evening && pleasant ? 'play'"), 'Pleasant evening conditions must let all three characters play');
assert.ok(weather.includes('hour >= 16 && hour <= 19'), 'Evening play must follow the selected local forecast hour');
assert.ok(weather.includes('MAX_FORECAST_HOURS = 18'), 'The scene must support the hourly forecast scroller');
assert.ok(weather.includes("hourly: 'temperature_2m,apparent_temperature"), 'The view must request genuine hourly forecast fields');
assert.ok(weather.includes('precipitation_probability') && weather.includes('snowfall') && weather.includes('wind_gusts_10m'), 'Rain, snow and gust effects must be data-driven');
assert.ok(weather.includes('function rainAmount(item)'), 'Rain visuals and labels must account for rain, showers and precipitation');
assert.ok(weather.includes("wind_speed_unit: 'kmh'"), 'Wind thresholds must use km/h');
assert.ok(weather.includes("temperature_unit: 'celsius'"), 'Temperature thresholds must use Celsius');
assert.ok(engine.includes('prefers-reduced-motion') || residents.includes('prefers-reduced-motion'), 'Movement must respect reduced-motion preferences');

assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must never request device location itself');
assert.ok(weather.includes('liveEarthLocationAllowed'), 'Weather must respect the Location Orb permission state');
assert.ok(weather.includes('https://api.open-meteo.com/v1/forecast'), 'Weather must retain the live Open-Meteo source');
assert.ok(weather.includes('No old forecast is shown as current') || weather.includes('No stale forecast'), 'Offline mode must not present old forecast as live');
assert.ok(weather.includes('abortController?.abort()'), 'Weather requests must abort on privacy/lifecycle changes');
assert.ok(weather.includes("removeEventListener('live-earth-location-state'"), 'Location listeners must be removed on deactivation');

for (const feature of ['WebGLRenderer', 'OrthographicCamera', 'HemisphereLight', 'DirectionalLight', 'makeArm', 'makeLeg', 'createFace', 'poseActor']) {
  assert.ok(engine.includes(feature), `Residents engine must include ${feature}`);
}
for (const mode of ['morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'kite', 'picnic', 'garden', 'festival', 'camping']) {
  assert.ok(engine.includes(`mode === '${mode}'`), `3D engine must define animated behaviour for ${mode}`);
}

assert.ok(stacks.includes("{ id: 'weather', path: './Weather/weather-view.js' }"), 'Weather must remain registered in shared Stacks runtime');
assert.ok(sw.includes('"./Weather/weather-view.js"'), 'Weather must remain in the essential offline app shell');
const build = sw.match(/const BUILD_ID = "([^"]+)"/);
assert.ok(build && manager.includes(`const BUILD_ID = "${build[1]}"`), 'Service Worker and Update Manager build identities must remain synchronized');
assert.ok(protectedRegistry.includes('dock.append(featureButton, locationButton, stacksButton)'), 'The protected three-Orb dock must remain unchanged');

console.log('Weather single-landscape, 3D Residents, forecast, privacy and protected integration tests passed.');
