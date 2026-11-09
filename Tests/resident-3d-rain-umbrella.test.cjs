const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs'), 'utf8');
const umbrellaStart = source.indexOf('function createUmbrella(');
const accessoriesStart = source.indexOf('\nfunction createAccessories(', umbrellaStart);
assert.ok(umbrellaStart >= 0 && accessoriesStart > umbrellaStart, 'Could not isolate the umbrella builder');
const umbrella = source.slice(umbrellaStart, accessoriesStart);

assert.ok(umbrella.includes('group.position.set(0, heldInHand ? 0 : 2.18, 0.03)'));
assert.ok(umbrella.includes('new THREE.SphereGeometry(canopyRadius, 32, 18'));
assert.ok(umbrella.includes('side: THREE.DoubleSide'), 'Underside must be visible from below');
assert.ok(umbrella.includes('canopy.scale.y = -canopyDepth'), 'The dome must face away from the palm');
assert.ok(umbrella.includes('canopy.position.set(0, canopyY, 0)'));
assert.ok(umbrella.includes('const canopyY = -0.68'), 'Canopy should sit just above head height when held upright');
assert.ok(umbrella.includes('cylinder(group, 0xe9dfcf, [0, -0.425, 0]'), 'Shaft must connect hand to canopy crown');
const shaftTip = -0.425 - 0.85 / 2;
const canopyTip = -0.68 - 0.36 * 0.48;
assert.ok(Math.abs(shaftTip - canopyTip) < 0.01, 'Shaft must meet the umbrella crown without a visible gap');
assert.ok(umbrella.includes('for (let rib = 0; rib < 8; rib++)'), 'Eight ribs must define the dome');
assert.ok(umbrella.includes('Math.sin(theta)') && umbrella.includes('Math.cos(theta)'), 'Ribs must curve with the canopy shell');
assert.ok(umbrella.includes('resident-umbrella-rim-32'), 'Canopy rim must be present');
assert.ok(umbrella.includes('new THREE.TorusGeometry(0.047, 0.010'), 'Palm-side hook handle must be present');

const rainStart = source.indexOf("} else if (mode === 'rain') {");
const snowStart = source.indexOf("} else if (mode === 'snow') {", rainStart);
assert.ok(rainStart >= 0 && snowStart > rainStart, 'Could not isolate rain activity pose');
const rainPose = source.slice(rainStart, snowStart);
assert.ok(rainPose.includes('right.shoulder.rotation.z = 2.72'));
assert.ok(rainPose.includes('right.elbow.rotation.z = -0.12'));
assert.ok(rainPose.includes('right.wrist.rotation.z = Math.sin(time * 1.15 + index) * 0.012'));
assert.ok(!rainPose.includes('right.shoulder.rotation.z = 2.05'));

// The hand-to-canopy vector is local -Y: when the forearm points upward,
// the canopy sits above/outward from the palm rather than down the chest.
const shoulder = 2.72;
const elbow = -0.12;
const armAngle = shoulder + elbow;
const canopyDirectionY = -Math.cos(armAngle);
assert.ok(canopyDirectionY > 0.80, 'Canopy axis should point mostly upward in the rain pose');

console.log('Residents rain umbrella geometry, underside, ribs, grip alignment and raised arm pose passed.');
