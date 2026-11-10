const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes('{ x: -21.0, z: -20.0'), 'A distinct western low summit must exist');
assert.ok(source.includes('{ x: -6.0, z: -19.7'), 'A distinct central low summit must exist');
assert.ok(source.includes('{ x: 12.5, z: -18.6'), 'A distinct eastern low summit must exist');
assert.ok(source.includes('const connectedRidge ='), 'Summits must be joined by lower, natural ridge shoulders');
assert.ok(source.includes('const foothills ='), 'Mountain forms must blend into rolling lower terrain');
assert.ok(source.includes('const broadValley ='), 'The river must sit in a shallow carved valley');
assert.ok(source.includes('const channelBed ='), 'The river must have a defined natural channel');
assert.ok(source.includes('const riverGuide = ['), 'The river must follow a continuous series of natural bends');
assert.ok(source.includes('const halfWidth = 0.48 + 0.30 * widening'), 'The river must widen and narrow naturally along its route');
assert.ok(source.includes('const deepWater =') && source.includes('const shallowWater ='), 'The river must have subtle depth and edge colour variation');
assert.ok(!source.includes('const mountainPeaks = []'), 'Mountain definition must not be empty');
assert.ok(!source.includes('new THREE.InstancedMesh'), 'No decorative instance geometry belongs in this stage');

console.log('Low mountain forms, connected foothills, carved river valley and natural river-width checks passed.');
