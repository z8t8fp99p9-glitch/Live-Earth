const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const controller = fs.readFileSync(path.join(__dirname, '..', 'Earth', 'earth-view-controller.js'), 'utf8');
const helperMatch = controller.match(/function homePitchFromQuaternion\(quaternion\) \{[\s\S]*?\n  \}/);
assert.ok(helperMatch, 'Earth View must recover Home pitch directly from its quaternion.');
const helperSandbox = {
  Math,
  Number,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value))
};
vm.runInNewContext(`${helperMatch[0]}\nglobalThis.pitchFromQuaternion = homePitchFromQuaternion;`, helperSandbox);
const pitchFromQuaternion = helperSandbox.pitchFromQuaternion;

function homeQuaternion(pitch, yaw) {
  const sx = Math.sin(pitch / 2), cx = Math.cos(pitch / 2);
  const sy = Math.sin(yaw / 2), cy = Math.cos(yaw / 2);
  // Three.js Euler XYZ with rotation.z fixed at zero: q = qX(pitch) * qY(yaw).
  return { x: sx * cy, y: cx * sy, z: sx * sy, w: cx * cy };
}
function multiply(a, b) {
  return {
    x: a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    y: a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
    z: a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
    w: a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z
  };
}
function axisQuaternion(axis, angle) {
  const half = angle / 2, s = Math.sin(half);
  return { x: axis[0]*s, y: axis[1]*s, z: axis[2]*s, w: Math.cos(half) };
}
function closeQuaternion(actual, expected, message) {
  const direct = Math.hypot(actual.x-expected.x, actual.y-expected.y, actual.z-expected.z, actual.w-expected.w);
  const negated = Math.hypot(actual.x+expected.x, actual.y+expected.y, actual.z+expected.z, actual.w+expected.w);
  assert.ok(Math.min(direct, negated) < 1e-10, message);
}

// A Home yaw beyond +/-90 degrees causes Three.js to expose an equivalent
// canonical Euler X on the alternate branch. V125's first pointermove wrote
// that Euler X through a clamp, flipping the globe even for horizontal-only drag.
const originalPitch = 0.7;
const originalYaw = 2.4;
const homePose = homeQuaternion(originalPitch, originalYaw);
const canonicalEulerX = Math.atan2(
  2 * (homePose.w * homePose.x - homePose.y * homePose.z),
  1 - 2 * (homePose.x * homePose.x + homePose.y * homePose.y)
);
assert.ok(canonicalEulerX < -2, 'Regression setup must reproduce the alternate Euler branch.');
const oldFirstMovePitch = Math.max(-1.25, Math.min(1.25, canonicalEulerX));
assert.ok(Math.abs(oldFirstMovePitch - originalPitch) > 1.5, 'Old Euler clamp must demonstrate the upside-down snap.');

const recoveredPitch = pitchFromQuaternion(homePose);
assert.ok(Math.abs(recoveredPitch - originalPitch) < 1e-10, 'Quaternion pitch recovery must preserve Home pitch even when yaw crosses 90 degrees.');

// A horizontal-only first drag must preserve pitch exactly, while yaw advances.
const yawDelta = 0.012;
const afterHorizontalDrag = multiply(homePose, axisQuaternion([0, 1, 0], yawDelta));
closeQuaternion(afterHorizontalDrag, homeQuaternion(originalPitch, originalYaw + yawDelta), 'Horizontal drag must preserve the inherited pitch and advance local yaw.');

// A vertical drag changes the tracked pitch using a world-X quaternion delta.
const pitchDelta = 0.009;
const afterVerticalDrag = multiply(axisQuaternion([1, 0, 0], pitchDelta), homePose);
closeQuaternion(afterVerticalDrag, homeQuaternion(originalPitch + pitchDelta, originalYaw), 'Vertical drag must change pitch without selecting another Euler branch.');

assert.match(controller, /earthDragPitch = homePitchFromQuaternion\(earthGroup\.quaternion\)/, 'Earth View must initialize drag pitch from the transferred quaternion.');
assert.match(controller, /earthGroup\.quaternion\.multiply\(dragYawDeltaQuaternion\)/, 'Horizontal drag must use local-Y quaternion multiplication.');
assert.match(controller, /earthGroup\.quaternion\.premultiply\(dragPitchDeltaQuaternion\)/, 'Vertical drag must use world-X quaternion multiplication.');
assert.doesNotMatch(controller, /earthGroup\.rotation\.[xy]\s*(?:\+=|=)/, 'Earth View gesture handler must not read-modify-write Euler X/Y after viewpoint transfer.');

console.log('Earth View quaternion-stable drag orientation tests passed.');
