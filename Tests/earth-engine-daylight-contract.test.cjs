const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const enginePath = path.join(__dirname, '..', 'EarthEngine', 'Graphics', 'earth-engine-3d-graphics-engine.js');
const source = fs.readFileSync(enginePath, 'utf8');
const corePath = path.join(__dirname, '..', 'EarthEngine', 'Core', 'earth-engine.js');
const coreSource = fs.readFileSync(corePath, 'utf8');

assert.match(coreSource, /version: \"2\.4\.0\"/, 'Public Earth Engine contract version must be incremented.');
assert.match(source, /function solarLocalDirection\(/, 'Engine must calculate the geographic subsolar direction.');
assert.match(source, /surface\.getWorldQuaternion\(worldQuaternion\)/, 'Solar direction must follow the globe world quaternion.');
assert.match(source, /applyQuaternion\(worldQuaternion\)/, 'Solar direction must be transformed through quaternion orientation.');
assert.match(source, /ambientIntensity: 0\.12/, 'Shared ambient fill must remain gentle.');
assert.match(source, /sunlightIntensity: 2\.3/, 'Shared key sunlight baseline must be explicit.');
assert.match(source, /fillIntensity: 0\.055/, 'Secondary blue fill must remain restrained.');
assert.match(source, /nightTerrainFill: 0\.14/, 'Night-side terrain reveal must remain restrained.');
assert.match(source, /twilightFill: 0\.20/, 'Twilight softness must remain restrained.');
assert.match(source, /float leSolarDot = dot\(normalize\(vLEWorldNormal\), normalize\(uLESunDirection\)\)/, 'Shader must compare the outward surface normal with the Sun-facing vector.');
assert.match(source, /function createEngineLightRig\(/, 'Earth Engine must provide its own fallback light rig.');
assert.match(source, /new THREE\.AmbientLight/, 'Earth Engine must provide shared ambient illumination when a view has no lights.');
assert.match(source, /new THREE\.DirectionalLight/, 'Earth Engine must provide shared directional sunlight and blue fill.');
assert.match(source, /collectSceneLights\(scene\)/, 'Earth Engine must detect and reuse existing view lights instead of duplicating them.');
assert.match(source, /externalAmbient = lights\.find/, 'View-provided ambient lighting must take precedence over Engine fallback lighting.');
assert.match(source, /engineSunlight\.visible = !externalSunlight/, 'Engine fallback sunlight must be hidden when the view supplies sunlight.');
assert.match(source, /scene\.onBeforeRender = sceneHook/, 'Solar lighting must update before Three.js collects scene lights.');
assert.match(source, /surface\.onBeforeRender = function/, 'First-frame and material-hook integration must be Engine-owned.');
assert.match(source, /enabled: options\.daylight !== false/, 'Daylight must be enabled by default.');
assert.match(source, /daylight\?\.dispose\(\)/, 'Disposal must clean up the daylight controller.');

console.log('Earth Engine daylight contract checks passed.');
