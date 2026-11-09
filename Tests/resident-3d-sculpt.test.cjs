const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const engine = fs.readFileSync(path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs'), 'utf8');

// Hair should read as one connected sculpted mass, not a ring of round beads.
assert.ok(engine.includes("resident-hair-cap-40x28"), 'Missing shared smooth hair-cap geometry');
assert.ok(engine.includes('const hairSurfaceZ = (x, y, lift = 0.012)'), 'Hair strands must follow the scalp surface');
assert.ok(engine.includes('const surfacePath = points =>'), 'Hair locks must be placed against the cap');
assert.ok(engine.includes('const curlPaths = ['), 'The two boys must retain their tousled curl identity');
assert.ok(!engine.includes('for (let i = 0; i < 15; i++)'), 'Remove the old bead-like hair cluster');
assert.ok(engine.includes('const sideLock = capsule(hairRoot'), 'The lady must retain her bob side locks');

// Clothing should have actual surface depth and a tailored skirt shell.
assert.ok(engine.includes('function curvedFabricPanel('), 'Missing reusable shaped fabric panel helper');
assert.ok(engine.includes('new THREE.ExtrudeGeometry(shape, {'), 'Fabric panels need actual thickness');
assert.ok(engine.includes('bevelEnabled: true'), 'Fabric edges need a soft bevel');
assert.ok(engine.includes('geometry.computeVertexNormals()'), 'Curved fabric panel normals must be recomputed');
assert.ok(engine.includes('resident-skirt-soft-hem-40'), 'Missing tailored skirt shell');
assert.ok(engine.includes('details.bib = curvedFabricPanel'), 'Lady pinafore bib must be a shaped panel');
assert.ok(engine.includes('details.frontPanel = curvedFabricPanel'), 'Blue jacket insert must be a shaped panel');
assert.ok(!engine.includes('sphere(root, COLORS.navy, [0, 1.04, 0.105]'), 'Remove the oversized inflated jacket overlay');
assert.ok(!engine.includes('new THREE.CylinderGeometry(0.255, 0.415, 0.44'), 'Replace the flat-edge skirt cylinder');

// Add face depth without replacing established facial style or dimensions.
assert.ok(engine.includes('A warm recessed socket creates a transition from cheek to eyelid'), 'Eyes need a subtle socket transition');
assert.ok(engine.includes('headMesh.scale.set(0.305, 0.34, 0.27)'), 'Preserve the head scale');
assert.ok(engine.includes('torso.scale.set(0.305, 0.375, 0.215)'), 'Preserve the torso scale');
assert.ok(engine.includes('actor.root.rotation.set(0, actor.facingYaw || 0, 0)'), 'The subtle three-quarter base stance must survive pose reset');

// Existing identities and signature clothing/accessories remain intact.
for (const token of [
  "person.id === 'red'", "person.id === 'lady'", "person.id === 'blue'",
  'COLORS.red', 'COLORS.denim', 'COLORS.navy', 'details.bag = bag',
  'COLORS.gold', 'function makeArm(', 'function makeLeg('
]) assert.ok(engine.includes(token), `Protected model element missing: ${token}`);

console.log('Residents 3D sculpt pass checks passed: connected hair forms, fabric shells, facial depth and preserved identities.');
