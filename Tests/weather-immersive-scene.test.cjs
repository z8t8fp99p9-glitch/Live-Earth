const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes("runtime.registerFeature('weather', activateWeather)"), 'Weather must remain registered through the existing Stacks feature route');
assert.ok(source.includes("new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href"), 'The view must use the existing same-origin Three.js runtime');
assert.ok(source.includes('await import(THREE_MODULE_URL)'), 'The renderer must load Three.js dynamically');
assert.ok(source.includes('new THREE.WebGLRenderer'), 'The foundation scene must use the existing 3D runtime');
assert.ok(source.includes("const MAP_W = 64"), 'The terrain must be a broad continuous landscape');
assert.ok(source.includes('function rawTerrainHeight(x, z)'), 'The terrain must be generated from a height field');
assert.ok(source.includes('const mountainPeaks = ['), 'The terrain must have multiple distinct low mountain forms');
assert.ok(source.includes('function terrainHeightAt(x, z)'), 'The river valley must be carved into the terrain surface');
assert.ok(source.includes('const riverGuide = ['), 'The river must use one continuous natural route');
assert.ok(source.includes('new THREE.CatmullRomCurve3(riverPoints'), 'The river centreline must be smoothly interpolated');
assert.ok(source.includes('const riverMaterial = new THREE.MeshPhysicalMaterial'), 'The river must have a dedicated water material');
assert.ok(source.includes('const terrainMaterial = new THREE.MeshStandardMaterial'), 'The terrain must have its own natural surface material');

// Only two visible world meshes are allowed in this foundation stage.
assert.ok(source.includes('terrainGroup.add(terrain)'), 'The scene must contain the terrain mesh');
assert.ok(source.includes('terrainGroup.add(river)'), 'The scene must contain the river mesh');
assert.equal((source.match(/terrainGroup\.add\(/g) || []).length, 2, 'No trees, rocks, clouds, ocean, props, or decorative meshes may be added');
for (const forbidden of [
  'new THREE.InstancedMesh', 'addCloud(', 'new THREE.Points(', 'new THREE.LineSegments(',
  'new THREE.Water', 'waterfall', 'plinth', 'forest', 'shrub', 'navigator.geolocation',
  'getCurrentPosition(', 'watchPosition(', 'https://api.open-meteo.com', 'fetch('
]) assert.ok(!source.toLowerCase().includes(forbidden.toLowerCase()), `Foundation scene must not contain ${forbidden}`);

// Old Weather presentation is removed; the Global Orb dock is not rebuilt here.
assert.ok(source.includes('view.panel.remove()'), 'The previous Weather panel must be removed');
assert.ok(source.includes('view.root.replaceChildren()'), 'All prior Weather text and controls must be cleared');
assert.ok(source.includes("const stage = el('div', 'le-weather-foundation-stage')"), 'The new full-bleed scene stage must be created');
assert.ok(source.includes('canvas.setAttribute(\'aria-hidden\', \'true\')'), 'The canvas is visual-only and must not add controls');
assert.ok(!/le-weather-(?:main-readout|timeline|hour-strip|range|refresh|insight|metric-line)|le-sfv-status|le-sfv-attribution/.test(source), 'No previous Weather data, slider, status, refresh, or attribution UI may remain');

assert.ok(source.includes('function weatherViewportProfile(width, height)'), 'Portrait and landscape need separate camera profiles');
assert.ok(source.includes('new ResizeObserver(resize)'), 'The camera must respond to container resizing');
assert.ok(source.includes("window.visualViewport?.addEventListener('resize', resize"), 'The camera must respond to mobile viewport changes');
assert.ok(source.includes('renderer.forceContextLoss?.()'), 'GPU resources must be released when the view closes');
assert.ok(source.includes('return () => {'), 'The Stacks feature must provide deactivation cleanup');

console.log('Clean Weather foundation: terrain, low mountains, single river, blank UI, Orb-safe route and lifecycle checks passed.');
