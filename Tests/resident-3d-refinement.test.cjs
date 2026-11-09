const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const enginePath = path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs');
const frameworkPath = path.join(__dirname, '..', 'Residents', 'resident-activity-framework.mjs');
const source = fs.readFileSync(enginePath, 'utf8');
const framework = fs.readFileSync(frameworkPath, 'utf8');

for (const feature of [
  'function createFace', 'function addHair', 'function makeHand', 'function makeArm',
  'function makeShoe', 'function makeLeg', 'function walkCycle', 'function poseActor',
  'function createAccessoriesVisibility', 'function createResidents3D'
]) {
  assert.ok(source.includes(feature), `Missing refined 3D feature: ${feature}`);
}

for (const detail of ['COLORS.white', 'COLORS.eye', 'COLORS.cheek', 'lower-lip highlight', 'blinkPulse', 'eye.scale.y']) {
  assert.ok(source.includes(detail), `Missing facial refinement: ${detail}`);
}
for (const joint of ['const elbow = joint(shoulder', 'const wrist = joint(elbow', 'const knee = joint(hip', 'const ankle = joint(knee', 'const foot = joint(ankle', 'fingerLengths']) {
  assert.ok(source.includes(joint), `Missing articulated joint/detail: ${joint}`);
}

for (const mode of ['calm', 'morning', 'play', 'walk', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'kite', 'garden', 'festival', 'picnic', 'camping']) {
  assert.ok(source.includes(`mode === '${mode}'`) || source.includes(`mode === '${mode}' ||`), `Missing activity movement: ${mode}`);
}
for (const id of ['red', 'lady', 'blue']) assert.ok(source.includes(`person.id === '${id}'`));
assert.ok(framework.includes('index * 1.25'), 'Shared locomotion phases must be offset per resident');
assert.ok(framework.includes("speed: 4.0, stride: 0.33, bounce: 0.045"), 'Play gait should remain gentle and distinct');
assert.ok(framework.includes("speed: 3.35, stride: 0.40, bounce: 0.025"), 'Walk gait should remain independently configurable');

assert.ok(source.includes("powerPreference: 'low-power'"));
assert.ok(source.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"));
assert.ok(source.includes('now - lastRender < 32'), 'Render loop must retain its mobile frame-rate ceiling');
assert.ok(source.includes('observer?.disconnect()'));
assert.ok(source.includes('renderer.forceContextLoss?.()'));
assert.ok(source.includes('Shared primitive geometry/materials remain cached for the next Weather visit'));
assert.ok(!source.includes('GLTFLoader') && !source.includes('https://'), 'No external model or network asset dependency may be added');

assert.ok(source.includes('function capsule('));
assert.ok(source.includes('new THREE.CapsuleGeometry'));
assert.ok(source.includes('const lowerLegColor'));
assert.ok(source.includes('blended neck'));
assert.ok(source.includes('skin: 0xf0bd99'), 'Face and neck geometry must use the current shared skin palette');
assert.ok(source.includes('function easeActorPose('));
assert.ok(source.includes('memory.quaternion.slerp(node.quaternion, alpha)'));
assert.ok(source.includes('actor.arms[0].wrist.rotation.x'));
assert.ok(source.includes('actor.clothing.skirt.rotation.z'));
assert.ok(source.includes('details.bag = bag'));
assert.ok(!source.includes('memory.rotation.lerp(node.rotation, alpha)'));
assert.ok(source.includes('const brows = []'));
assert.ok(source.includes('const openMouth = joint(head'));
assert.ok(source.includes('actor.face.openMouth.visible = laughing'));
assert.ok(source.includes('eye.rotation.y = inwardLook'));
assert.ok(source.includes('const greeting = Math.sin(time * 2.7 + index * 1.55)'));
assert.ok(source.includes('right.wrist.rotation.z = Math.sin(time * 4.2)'));
assert.ok(source.split(/\r?\n/).includes('  const smile = joint(head, [0, 0, 0]);'));
assert.ok(!source.includes('expression.\\n  const smile'));

console.log('Residents 3D refinement: faces, rig joints, outfits, activity definitions and mobile lifecycle checks passed.');
