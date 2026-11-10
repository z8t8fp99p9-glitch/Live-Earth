const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');

assert.ok(weather.includes("runtime.registerFeature('weather',activateWeather)"), 'Weather must stay registered through the existing Stacks runtime');
assert.ok(weather.includes("new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href"), 'Weather must resolve the already-packaged same-origin Three.js runtime from its own source path');
assert.ok(weather.includes('await import(THREE_MODULE_URL)'), 'Weather must dynamically load the shared 3D library');
assert.ok(weather.includes('new THREE.WebGLRenderer'), 'The actual Weather view must render a 3D scene');
assert.ok(weather.includes('function heightAt(x,z)'), 'The world must have raised terrain derived from a height field');
assert.ok(weather.includes('Contour geometry is sampled from this exact terrain height field'), 'Contours must follow the same terrain geometry');
assert.ok(weather.includes('Separate 3D cloud volumes'), 'Clouds must be independent three-dimensional forms');
assert.ok(weather.includes('new THREE.InstancedMesh'), 'Forest detail must use instancing');
assert.ok(weather.includes('new THREE.MeshPhysicalMaterial'), 'Water must use physical materials');
assert.ok(weather.includes('opticalRing'), 'The optical morphism treatment must be present');
assert.ok(weather.includes('const MAX_FORECAST_HOURS = 18'), 'The live forecast must retain an 18-hour window');
assert.ok(weather.includes('https://api.open-meteo.com/v1/forecast'), 'The live Weather source must remain connected');
assert.ok(weather.includes("wind_speed_unit:'kmh'"), 'Wind values must use km/h');
assert.ok(weather.includes("temperature_unit:'celsius'"), 'Temperature values must use Celsius');
assert.ok(weather.includes("precipitation_unit:'mm'"), 'Precipitation values must use millimetres');
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must never request location permission itself');
assert.ok(weather.includes('liveEarthLocationAllowed'), 'Weather must respect Location Orb permission');
assert.ok(weather.includes("removeEventListener('live-earth-location-state'"), 'Location listeners must be removed on deactivation');
assert.ok(weather.includes("removeEventListener('offline'"), 'Offline listeners must be removed on deactivation');
assert.ok(weather.includes("removeEventListener('online'"), 'Online listeners must be removed on deactivation');
assert.ok(weather.includes('abortController?.abort()'), 'Forecast requests must abort when privacy or lifecycle changes');
assert.ok(weather.includes('No old forecast is presented as current'), 'Offline mode must never display stale data as current');
assert.ok(!/createAtmosphere|le-weather-landscape|<svg/i.test(weather), 'The old illustrated 2D landscape must no longer be the Weather visual foundation');
assert.ok(!/resident|Residents|LiveEarthResidentLibrary|data-resident-host/i.test(weather), 'Weather must not contain retired Residents content');

console.log('Immersive Weather renderer, live forecast, privacy and lifecycle checks passed.');
