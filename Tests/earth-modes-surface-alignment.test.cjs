const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Earth/earth-orb-globe.js'), 'utf8');
const graphicsEngine = fs.readFileSync(path.join(root, 'EarthEngine/Graphics/earth-engine-3d-graphics-engine.js'), 'utf8');

assert.match(source, /applyHomeOrientation\(group\)/, 'Earth Modes must apply Home group orientation.');
assert.doesNotMatch(source, /earth(?:Globe)?\.rotation\.y\s*=\s*-?0\.35/, 'Earth Modes must not add a secondary surface rotation offset.');
assert.match(source, /group\s*=\s*earthGlobe\.group/, 'Earth Modes must use the group created by Earth Engine.');
assert.match(source, /scene\.add\(group\)/, 'Earth Modes must attach the Engine group directly to its own scene.');
assert.match(graphicsEngine, /const EARTH_BASE_SURFACE_ROTATION_Y = -0\.35/, 'The single canonical surface calibration must remain owned by Graphics Engine.');
assert.match(graphicsEngine, /surface\.rotation\.y = EARTH_BASE_SURFACE_ROTATION_Y/, 'Graphics Engine must apply the same base calibration to every Earth view.');
console.log('Earth Modes surface alignment test passed.');
