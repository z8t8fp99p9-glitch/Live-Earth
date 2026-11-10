const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');

assert.ok(weather.includes("runtime.registerFeature('weather',activateWeather)"), 'Weather must stay registered through the existing Stacks runtime');
assert.ok(weather.includes("new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href"), 'Weather must resolve the already-cached same-origin Three.js runtime');
assert.ok(weather.includes('await import(THREE_MODULE_URL)'), 'Weather must dynamically load the shared 3D library');
assert.ok(weather.includes('new THREE.WebGLRenderer'), 'The actual Weather view must render a 3D scene');

// Landform: an irregular island, real relief, a shoreline, and layered exposed cliffs.
assert.ok(weather.includes('function boundaryAt(angle)'), 'The island needs an irregular organic perimeter');
assert.ok(weather.includes('function islandRadius(x, z)'), 'The scene must distinguish land from surrounding ocean');
assert.ok(weather.includes('function heightAt(x, z)'), 'Mountains and valleys must be generated from one consistent terrain function');
assert.ok(weather.includes('const terrainGeometry = new THREE.BufferGeometry()'), 'The land surface must be a clipped mesh, not a full rectangular plane');
assert.ok(weather.includes('function makeCliffBand('), 'The island must have visible layered side walls');
assert.ok(weather.includes('makeCliffBand(0.992, 0.00, 1.025, 0.34'), 'The first cliff band must meet the land surface cleanly');
assert.ok(weather.includes('const shoreline = new THREE.Mesh'), 'The coast must be visibly separated from the sea');
assert.ok(weather.includes("new THREE.CircleGeometry(35, 112)"), 'The island must sit in surrounding water');
assert.ok(weather.includes('const copperRock = new THREE.Color'), 'The terrain must include warm contrasting exposed rock');
assert.ok(weather.includes('const smoothNormals = []'), 'The terrain must use averaged normals to avoid a faceted flat-shaded grid');
assert.ok(weather.includes('const contourLevels = [1.15, 1.85, 2.55, 3.25, 3.95, 4.65]'), 'Contour features must follow several real elevations');

// Ecosystem and weather: varied silhouettes, visible water, and volumetric cloud clusters.
assert.ok(weather.includes('new THREE.ConeGeometry(0.54, 1.65, 8, 2)'), 'The forest needs a conifer form');
assert.ok(weather.includes('new THREE.IcosahedronGeometry(0.68, 1)'), 'The forest needs a distinct broad-canopy form');
assert.ok(weather.includes('const forestClusters = ['), 'Vegetation must form natural clusters instead of an even grid');
assert.ok(weather.includes('new THREE.DodecahedronGeometry(0.44, 1)'), 'The terrain must include a separate rock-detail scale');
assert.ok(weather.includes('const riverCurve = new THREE.CatmullRomCurve3'), 'The waterway must follow a curved valley');
assert.ok(weather.includes('const waterfall = new THREE.Mesh'), 'The world must include a visible waterfall');
assert.ok(weather.includes('const lobes = ['), 'Clouds must be formed from layered 3D volume masses');
assert.ok(weather.includes('addCloud(-6.0, 8.1'), 'Clouds must float above the terrain at independent heights');
assert.ok(!/support rod|cloud pole|cloud rod/i.test(weather), 'Cloud forms must not use support rods');

// Responsive layout: each viewport gets a deliberate composition and camera framing.
assert.ok(weather.includes('scaleX: clampRange(0.45 + aspect * 0.72, 0.72, 1.85)'), 'The island footprint must adapt horizontally to viewport aspect ratio');
assert.ok(weather.includes('scaleZ: clampRange(1.58 - Math.max(0, aspect - 0.42) * 0.58, 0.78, 1.58)'), 'The island footprint must adapt in depth to viewport aspect ratio');
assert.ok(weather.includes('world.scale.set(scaleX, 1, scaleZ)'), 'The complete world must use the responsive footprint');
assert.ok(weather.includes('const requiredHeight = Math.max(projectedHeight'), 'Camera distance must be calculated from the available viewport');
const profileMatch = weather.match(/function weatherViewportProfile\(width, height\) \{[\s\S]*?\n  \}/);
assert.ok(profileMatch, 'A pure viewport profile must drive responsive world framing');
const viewportProfile = vm.runInNewContext(`(${profileMatch[0]})`);
const viewports = [
  ['compact phone portrait', 320, 568],
  ['standard phone portrait', 393, 852],
  ['large phone portrait', 430, 932],
  ['phone landscape', 844, 390],
  ['tablet portrait', 820, 1180],
  ['tablet landscape', 1180, 820],
  ['desktop', 1440, 900],
  ['ultrawide desktop', 2560, 1080]
];
const profiles = viewports.map(([name, width, height]) => ({ name, ...viewportProfile(width, height) }));
for (const profile of profiles) {
  assert.ok(Number.isFinite(profile.aspect) && profile.aspect > 0, `${profile.name} must have a valid aspect ratio`);
  assert.ok(profile.scaleX >= 0.72 && profile.scaleX <= 1.85, `${profile.name} horizontal scale must remain bounded`);
  assert.ok(profile.scaleZ >= 0.78 && profile.scaleZ <= 1.58, `${profile.name} depth scale must remain bounded`);
  assert.ok([34, 36, 38].includes(profile.fov), `${profile.name} must receive a supported camera field of view`);
}
assert.ok(profiles[0].portrait && profiles[1].portrait && !profiles[3].portrait, 'Phone portrait and landscape must choose different compositions');
assert.notEqual(profiles[0].scaleZ, profiles[3].scaleZ, 'Portrait and landscape island depth must adapt');
assert.notEqual(profiles[0].scaleX, profiles[7].scaleX, 'Phone and ultrawide island width must adapt');
assert.ok(weather.includes('const resizeObserver = typeof ResizeObserver'), 'The renderer must respond to container resizing, not only window resizing');
assert.ok(weather.includes("window.visualViewport?.addEventListener('resize', resize"), 'Mobile visual viewport changes must trigger a reframe');
assert.ok(weather.includes("window.visualViewport?.removeEventListener('resize', resize)"), 'Mobile viewport listeners must be cleaned up');
assert.ok(weather.includes('renderer.setPixelRatio'), 'Rendering resolution must be capped for device performance');
assert.ok(weather.includes('const pixelBudget = Math.sqrt(2200000'), 'Rendering must respect a bounded pixel budget');
assert.ok(weather.includes('@media(orientation:landscape) and (min-width:560px)'), 'Landscape screens must use a different information layout');
assert.ok(weather.includes('@media(min-width:760px) and (orientation:portrait)'), 'Tablet portrait must receive a distinct layout');
assert.ok(weather.includes('@media(max-height:520px) and (orientation:landscape)'), 'Short landscape screens must receive a compact layout');

// Existing data, location permission and lifecycle contracts remain intact.
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
assert.ok(weather.includes('renderer.forceContextLoss?.()'), 'The GPU context must be released when Weather closes');
assert.ok(!/resident|Residents|LiveEarthResidentLibrary|data-resident-host/i.test(weather), 'The retired Residents feature must not reappear');

console.log('Adaptive island world, terrain, ecosystem, forecast, privacy and lifecycle checks passed.');
