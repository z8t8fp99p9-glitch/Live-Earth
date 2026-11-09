const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs'), 'utf8');

// The resident bodies remain true procedural 3D geometry, with smooth
// high-enough tessellation and purpose-built head/body silhouettes.
assert.ok(source.includes("new THREE.SphereGeometry(1, 32, 24)"), 'Shared smooth sphere geometry should be upgraded');
assert.ok(source.includes("resident-head-soft-jaw-32x24"), 'A sculpted head geometry should be cached');
assert.ok(source.includes('jawTaper') && source.includes('cheekFullness'), 'Head should have a shaped jaw and cheek plane');
assert.ok(source.includes('shape.computeVertexNormals()'), 'Deformed head normals must be recomputed');
assert.ok(source.includes('resident-torso-tailored-36'), 'Tailored torso geometry should be cached');
assert.ok(source.includes('new THREE.LatheGeometry('), 'Torso should use a rounded shoulder-to-waist profile');

// Facial details should sit in the face volume, not look like flat decals.
assert.ok(source.includes('A bridge, soft tip and tiny nostril shadows'), 'The nose should have dimensional bridge and tip forms');
assert.ok(source.includes('thin upper lid and a quieter lower rim'), 'Eyes should integrate with the eyelid/cheek planes');
assert.ok(source.includes('Blush is diffused and smaller'), 'Cheek color should remain subtle');
assert.ok(source.includes('Fine curved strands catch the key light'), 'Hair should have sculpted strand accents');

// Hands, clothing surfaces and material response should feel less like glossy toys.
assert.ok(source.includes('new THREE.CapsuleGeometry(radius, length, 10, 16)'), 'Limb geometry should use smoother capsule segments');
assert.ok(source.includes('const finger = capsule(hand'), 'Fingers should be separate rounded 3D forms');
assert.ok(source.includes('function mat(color, roughness = 0.84'), 'Default surface response should be more natural and matte');
assert.ok(source.includes('opacity: 0.075') && source.includes('ground-contact-shadow'), 'Characters should have softer layered grounding shadows');
assert.ok(source.includes('facingYaw'), 'The boys should have a subtle three-quarter stance to reveal depth');
assert.ok(source.includes('camera.position.set(0.16, 1.42, 8)'), 'Preview camera should show a subtle elevation and depth');

// Character identities, outfits, and model scale are intentionally protected.
for (const token of [
  "person.id === 'red'", "person.id === 'lady'", "person.id === 'blue'",
  'COLORS.red', 'COLORS.denim', 'COLORS.navy', 'details.bag = bag',
  'torso.scale.set(0.305, 0.375, 0.215)', 'headMesh.scale.set(0.305, 0.34, 0.27)'
]) assert.ok(source.includes(token), `Protected character design marker missing: ${token}`);

console.log('Residents 3D appearance checks passed: sculpted forms, facial depth, hair, hands, materials and preserved identities.');
