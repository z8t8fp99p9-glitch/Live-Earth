const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const weather = read('Weather/weather-view.js');
const stacks = read('Stacks/stacks-feature-views.js');
const sw = read('sw.js');
const manager = read('Global/update-manager.js');
const protectedRegistry = read('Global/view-module-registry.js');

assert.ok(weather.includes("runtime.registerFeature('weather', activateWeather)"), 'Weather must remain registered in Stacks');
assert.ok(weather.includes('function createAtmosphere()'), 'Weather must create its illustrated atmosphere');
assert.ok(weather.includes('le-weather-landscape'), 'The same illustrated landscape must remain in the scene');
assert.ok(weather.includes('scene.dataset.weather = state.weather'), 'Forecast weather must update the atmosphere');
assert.ok(weather.includes('scene.dataset.phase = state.phase'), 'Time of day must update the sky lighting');
assert.ok(weather.includes('function visualState(item)'), 'Selected forecast hours must drive scene conditions');
assert.ok(weather.includes('function createParticles(layer, kind, item)'), 'Rain and snow particles must remain forecast-driven');
assert.ok(weather.includes('MAX_FORECAST_HOURS = 18'), 'The hourly forecast scroller must retain its 18-hour window');
assert.ok(weather.includes('https://api.open-meteo.com/v1/forecast'), 'Weather must retain the live Open-Meteo source');
assert.ok(weather.includes('precipitation_probability') && weather.includes('snowfall') && weather.includes('wind_gusts_10m'), 'Rain, snow and gust effects must use real forecast fields');
assert.ok(weather.includes("wind_speed_unit: 'kmh'"), 'Wind calculations must use km/h');
assert.ok(weather.includes("temperature_unit: 'celsius'"), 'Temperature calculations must use Celsius');
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must never request device location itself');
assert.ok(weather.includes('liveEarthLocationAllowed'), 'Weather must respect the Location Orb permission state');
assert.ok(weather.includes("removeEventListener('live-earth-location-state'"), 'Location listeners must be removed on deactivation');
assert.ok(weather.includes("removeEventListener('offline'"), 'Offline listeners must be removed on deactivation');
assert.ok(weather.includes("removeEventListener('online'"), 'Online listeners must be removed on deactivation');
assert.ok(weather.includes('abortController?.abort()'), 'Requests must abort on privacy and lifecycle changes');
assert.ok(weather.includes('No old forecast is shown as current'), 'Offline mode must never present a stale forecast as live');
assert.ok(!/resident|Residents|LiveEarthResidentLibrary|data-resident-host/i.test(weather), 'Weather must have no resident markup, loader, preview or lifecycle hooks');

assert.ok(stacks.includes("{ id: 'weather', path: './Weather/weather-view.js' }"), 'Weather must remain registered in the shared feature runtime');
assert.ok(sw.includes('"./Weather/weather-view.js"'), 'Weather must remain in the essential offline app shell');
const shellStart = sw.indexOf('const APP_SHELL = [');
const shellEnd = sw.indexOf('];', shellStart);
assert.ok(shellStart >= 0 && shellEnd > shellStart && !/Residents\//.test(sw.slice(shellStart, shellEnd)), 'No Residents files may remain in the essential service-worker shell');
const build = sw.match(/const BUILD_ID = "([^"]+)"/);
assert.ok(build && manager.includes(`const BUILD_ID = "${build[1]}"`), 'Service Worker and Update Manager build identities must stay synchronized');
assert.ok(sw.includes('live-earth-resident-prototype-v1'), 'Activation must retire the old Little Lady prototype cache');
assert.ok(protectedRegistry.includes('dock.append(featureButton, locationButton, stacksButton)'), 'The protected three-Orb dock must remain unchanged');

console.log('Weather landscape, forecast, privacy, offline and protected integration checks passed without Residents.');
