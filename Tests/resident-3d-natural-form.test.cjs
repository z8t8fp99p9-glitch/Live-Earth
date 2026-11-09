const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs'), 'utf8');

// Skin uses a subtle physical clear-coat, not the same flat fabric material.
assert.ok(source.includes('function skinMat('), 'Skin needs its own material response');
assert.ok(source.includes('new THREE.MeshPhysicalMaterial('), 'Skin should use a physical material');
assert.ok(source.includes('clearcoat: 0.045'), 'Skin highlight must remain restrained');
assert.ok(source.includes('clearcoatRoughness: 0.88'), 'Skin highlights should stay soft');

// Nose is one continuous lathed form rather than multiple visible ball pieces.
assert.ok(source.includes("geometry('resident-nose-soft-profile-24'"), 'Missing sculpted nose geometry');
assert.ok(source.includes('new THREE.LatheGeometry(['), 'Nose should use a continuous profile');
assert.ok(source.includes('const nose = new THREE.Mesh(residentNoseGeometry, skinMat('), 'Nose should use the skin material');
assert.ok(!source.includes('sphere(head, 0xe2a58d'), 'Remove the old separate nose bridge sphere');
assert.ok(!source.includes('sphere(head, 0xf0b79a'), 'Remove the old separate nose tip sphere');

// Eyes are slightly more natural in proportion and retain a fine limbal edge.
assert.ok(source.includes("resident-eye-limbal-ring-24"), 'Eyes need a fine limbal ring');
assert.ok(source.includes('[0.054, 0.063, 0.030]'), 'Sclera should be subtly less oversized');
assert.ok(source.includes('[0.028, 0.038, 0.018]'), 'Iris should be subtly less oversized');

// Joint volumes are softened while the original articulated pivots remain.
assert.ok(source.includes('const shoulder = joint(root, [side * 0.265, 1.265, 0])'));
assert.ok(source.includes('0.073, 0.17'), 'Upper sleeve volume should be less bulbous');
assert.ok(source.includes('0.061, 0.15'), 'Elbow volume should be less bulbous');
assert.ok(source.includes('0.0115, fingerLengths[i]'), 'Fingers should be slimmer');
assert.ok(source.includes('// Cylinder\'s native Y axis follows the forearm; keep the cuff square to the wrist.'));
assert.ok(!source.includes('cuff.rotation.z = Math.PI / 2'), 'Wrist cuff must follow the forearm axis');
assert.ok(source.includes('const knee = joint(hip'), 'Knee articulation must remain intact');
assert.ok(source.includes('const ankle = joint(knee'), 'Ankle articulation must remain intact');

// Festival decoration becomes lightweight, tumbling paper rather than spheres.
assert.ok(source.includes("geometry('festival-paper-confetti-1x1'"), 'Festival needs paper-like confetti geometry');
assert.ok(source.includes('new THREE.BoxGeometry(1, 1, 0.10)'), 'Confetti must be thin paper strips');
assert.ok(source.includes('item.rotation.x = Math.sin(elapsed * 3.1 + index * 1.7)'), 'Confetti should tumble in three dimensions');
assert.ok(source.includes('item.rotation.y = elapsed * (index % 2 ? 1.25 : -1.10)'));

// Preserve identity, same-origin Three.js, performance and reduced-motion contracts.
for (const id of ['red', 'lady', 'blue']) assert.ok(source.includes(`person.id === '${id}'`));
assert.ok(source.includes("import * as THREE from '../vendor/three.module.js'"));
assert.ok(source.includes("from './resident-activity-framework.mjs'"));
assert.ok(source.includes("powerPreference: 'low-power'"));
assert.ok(source.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"));
assert.ok(source.includes('now - lastRender < 32'));
assert.ok(source.includes('memory.quaternion.slerp(node.quaternion, alpha)'));
assert.ok(source.includes('new Set([...materialCache.values(), ...skinMaterialCache.values(), ...skinFaceMaterialCache.values()])'), 'All cached skin materials must survive renderer disposal/revisit');

console.log('Residents natural-form sculpt, skin materials, face proportions, limb joins and festival paper checks passed.');
