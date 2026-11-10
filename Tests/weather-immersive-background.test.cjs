const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes("runtime.registerFeature('weather', activateWeather)"), 'Weather must use its existing Stacks route');
assert.ok(source.includes("view.panel.remove()") && source.includes("view.root.replaceChildren()"), 'All old Weather UI must be removed');
assert.ok(source.includes("const stage = el('div', 'le-weather-immersive')"), 'A single full-screen background stage must be created');
assert.ok(source.includes('preserveAspectRatio="xMidYMid slice"'), 'Landscape art must crop responsively without stretching');
assert.ok(source.includes('function weatherState(data)'), 'Weather source values must select the visual state');
assert.ok(source.includes('weather_code,cloud_cover,is_day'), 'Current condition, cloud cover and day/night must drive the background');
assert.ok(source.includes('window.liveEarthLocationAllowed?.()'), 'Weather must respect the shared Location permission gate');
assert.ok(source.includes('globe()?.getLocation?.()'), 'Coordinates must come only from the existing shared Location fix');
assert.ok(source.includes("live-earth-location-state"), 'The background must react to Location Orb changes');
assert.ok(source.includes("live-earth-location-stop"), 'The background must clear when Location stops');
assert.ok(source.includes("window.addEventListener('offline', onOffline)"), 'The background must clear when the device goes offline');
assert.ok(source.includes("window.addEventListener('online', onOnline)"), 'The background must refresh when connectivity returns');
assert.ok(source.includes("stage.dataset.condition = condition") && source.includes("stage.dataset.phase = phase"), 'Weather state must update the artwork');
assert.ok(source.includes('le-weather-riverflow'), 'The river may have subtle movement');
assert.ok(source.includes('prefers-reduced-motion: reduce'), 'Reduced motion must be respected');

for (const forbidden of [
  'new THREE.', 'WebGLRenderer', 'InstancedMesh', 'new THREE.Points',
  '18-HOUR FORECAST', 'SCRUB THE WEATHER WORLD', 'Refresh</button>',
  'YOUR WEATHER WORLD', 'Feels like', 'le-weather-foundation-canvas',
  'navigator.geolocation', 'getCurrentPosition(', 'watchPosition('
]) assert.ok(!source.toLowerCase().includes(forbidden.toLowerCase()), `Simple background must not include ${forbidden}`);

assert.ok(!/le-weather-(?:main-readout|timeline|hour-strip|range|refresh|insight|metric-line)|le-sfv-status|le-sfv-attribution/.test(source), 'No weather text or controls may remain');
console.log('Living Weather background: responsive illustration, forecast-driven atmosphere, Location privacy and clean Orb-safe UI checks passed.');
