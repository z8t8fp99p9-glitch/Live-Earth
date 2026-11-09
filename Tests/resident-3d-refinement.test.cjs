const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const enginePath = path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs');
const source = fs.readFileSync(enginePath, 'utf8');

for (const feature of [
  'function createFace', 'function addHair', 'function makeHand', 'function makeArm',
  'function makeShoe', 'function makeLeg', 'function walkCycle', 'function poseActor',
  'function createAccessoriesVisibility', 'function createResidents3D'
]) {
  assert.ok(source.includes(feature), `Missing refined 3D feature: ${feature}`);
}

// Facial detail and independent expression/eye movement.
for (const detail of ['COLORS.white', 'COLORS.eye', 'COLORS.cheek', 'lower-lip highlight', 'blinkPulse', 'eye.scale.y']) {
  assert.ok(source.includes(detail), `Missing facial refinement: ${detail}`);
}

// The rig must articulate fingers, elbows, wrists, knees, ankles and feet.
for (const joint of ['const elbow = joint(shoulder', 'const wrist = joint(elbow', 'const knee = joint(hip', 'const ankle = joint(knee', 'const foot = joint(ankle', 'fingerLengths']) {
  assert.ok(source.includes(joint), `Missing articulated joint/detail: ${joint}`);
}

// The three personalities retain distinct movement and outfit logic.
for (const mode of ['calm', 'morning', 'play', 'walk', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'kite', 'garden', 'festival', 'picnic', 'camping']) {
  assert.ok(source.includes(`mode === '${mode}'`) || source.includes(`mode === '${mode}' ||`), `Missing activity movement: ${mode}`);
}
assert.ok(source.includes("person.id === 'red'"));
assert.ok(source.includes("person.id === 'lady'"));
assert.ok(source.includes("person.id === 'blue'"));
assert.ok(source.includes('index * 1.25'), 'Locomotion phases must be offset per resident');

// iPhone performance, reduced motion and repeated Weather open/close must remain safe.
assert.ok(source.includes("powerPreference: 'low-power'"));
assert.ok(source.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"));
assert.ok(source.includes('now - lastRender < 32'), 'Render loop must retain its mobile frame-rate ceiling');
assert.ok(source.includes('observer?.disconnect()'));
assert.ok(source.includes('renderer.forceContextLoss?.()'));
assert.ok(source.includes('Shared primitive geometry/materials remain cached for the next Weather visit'), 'Shared Three.js resources must survive view unmount/remount');
assert.ok(!source.includes('GLTFLoader') && !source.includes('https://'), 'No external model or network asset dependency may be added');


assert.ok(source.includes('function capsule('), 'Smooth capsule geometry should blend limb segments');
assert.ok(source.includes('new THREE.CapsuleGeometry'), 'Arms and legs should use rounded continuous geometry');
assert.ok(source.includes('const lowerLegColor'), 'Lower legs should retain character-specific clothing/skin');
assert.ok(source.includes('blended neck'), 'Head and torso should have a soft neck transition');
assert.ok(source.includes('0xf2c2a5'), 'Face refinement should include subtle nose shaping');

assert.ok(source.includes('function easeActorPose('), 'Activity pose changes should ease instead of snapping');
assert.ok(source.includes('memory.quaternion.slerp(node.quaternion, alpha)'), 'Joint transitions should use quaternion interpolation');
assert.ok(source.includes('actor.arms[0].wrist.rotation.x'), 'Hands should have secondary wrist motion');
assert.ok(source.includes('actor.clothing.skirt.rotation.z'), 'The lady dress should respond to movement and wind');
assert.ok(source.includes('details.bag = bag'), 'The lady satchel should have an animated pivot reference');


assert.ok(source.includes('memory.quaternion.slerp(node.quaternion, alpha)'), 'Pose smoothing must use supported quaternion interpolation');
assert.ok(!source.includes('memory.rotation.lerp(node.rotation, alpha)'), 'Euler rotations must not call unsupported lerp()');


assert.ok(source.includes('const brows = []'), 'Faces should include independently animated eyebrows');
assert.ok(source.includes('const openMouth = joint(head'), 'Faces should include a joyful open-mouth expression');
assert.ok(source.includes('actor.face.openMouth.visible = laughing'), 'Expressions should respond to joyful activity beats');
assert.ok(source.includes('eye.rotation.y = inwardLook'), 'Characters should glance toward one another during play');
assert.ok(source.includes('const greeting = Math.sin(time * 2.7 + index * 1.55)'), 'Shared play should use staggered greeting gestures');
assert.ok(source.includes('right.wrist.rotation.z = Math.sin(time * 4.2)'), 'Greeting gestures should articulate the wrist');

console.log('Residents 3D refinement: faces, rig joints, outfits, movement and mobile lifecycle checks passed.');
