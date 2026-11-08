const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const engineSource = read('EarthEngine/Core/earth-engine.js');
const controller = read('Earth/earth-view-controller.js');
const home = read('index.html');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
}
class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.set(x, y, z, w); }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  setFromAxisAngle(axis, angle) {
    const half = angle / 2, s = Math.sin(half);
    return this.set(axis.x * s, axis.y * s, axis.z * s, Math.cos(half));
  }
  multiply(q) {
    const a = this, b = q;
    return this.set(
      a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
      a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
      a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
      a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z
    );
  }
  premultiply(q) {
    const a = q, b = this;
    return this.set(
      a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
      a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
      a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,
      a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z
    );
  }
  normalize() {
    const length = Math.hypot(this.x, this.y, this.z, this.w) || 1;
    this.x /= length; this.y /= length; this.z /= length; this.w /= length;
    return this;
  }
}
class EventTargetMock {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback, options = false) {
    const entries = this.listeners.get(type) || [];
    entries.push({ callback, capture: options === true || options?.capture === true });
    this.listeners.set(type, entries);
  }
  removeEventListener(type, callback) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.callback !== callback));
  }
  setPointerCapture() {}
  dispatch(type, values) {
    let stopped = false;
    const event = {
      type, pointerType: 'touch', button: 0, isPrimary: values.pointerId === 1,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { stopped = true; },
      ...values
    };
    for (const item of this.listeners.get(type) || []) {
      if (stopped) break;
      item.callback(event);
    }
    return event;
  }
}

const validMatch = engineSource.match(/function validQuaternion\(value\) \{[\s\S]*?\n\}/);
const normalizeMatch = engineSource.match(/function normalizeQuaternion\(value\) \{[\s\S]*?\n\}/);
const interactionsMatch = engineSource.match(/function createEarthInteractions\(THREE, group, options = \{\}\) \{[\s\S]*?\n\}/);
assert.ok(validMatch, 'The Engine must validate transferred quaternions.');
assert.ok(normalizeMatch, 'The Engine must normalize transferred quaternions.');
assert.ok(interactionsMatch, 'The shared Engine gesture controller must exist.');
const sandbox = { Math, Number, Map, Set, Object, TypeError, Error, THREE: { Vector3, Quaternion } };
vm.runInNewContext(
  `${validMatch[0]}\n${normalizeMatch[0]}\n${interactionsMatch[0]}\nglobalThis.createInteractions = createEarthInteractions;`,
  sandbox
);

function homeQuaternion(pitch, yaw) {
  const sx = Math.sin(pitch / 2), cx = Math.cos(pitch / 2);
  const sy = Math.sin(yaw / 2), cy = Math.cos(yaw / 2);
  return new Quaternion(sx * cy, cx * sy, sx * sy, cx * cy);
}
function recoveredPitch(q) {
  const yawHalf = Math.atan2(q.y, q.w);
  const sinHalf = q.x * Math.cos(yawHalf) + q.z * Math.sin(yawHalf);
  return 2 * Math.atan2(sinHalf, Math.hypot(q.w, q.y));
}
function close(actual, expected, message) {
  const direct = Math.hypot(actual.x-expected.x, actual.y-expected.y, actual.z-expected.z, actual.w-expected.w);
  const negated = Math.hypot(actual.x+expected.x, actual.y+expected.y, actual.z+expected.z, actual.w+expected.w);
  assert.ok(Math.min(direct, negated) < 1e-10, message);
}

// Recreate the reported Home → Earth View → Home pose: yaw has crossed 90°,
// but pitch remains valid. The first Home touch must not select an Euler branch.
const group = { quaternion: homeQuaternion(0.7, 2.4) };
const canvas = new EventTargetMock();
let rotations = 0;
let homeZoomUpdates = 0;
const homeGestures = sandbox.createInteractions({ Vector3, Quaternion }, group, {
  element: canvas,
  rotation: { sensitivityX: 0.009, sensitivityY: 0.0055, minPitch: -1.15, maxPitch: 1.15 },
  zoom: { enabled: false },
  onRotate: () => rotations++,
  onZoom: () => homeZoomUpdates++
});
const initialPitch = recoveredPitch(group.quaternion);
assert.ok(Math.abs(initialPitch - 0.7) < 1e-10, 'Engine must recover the inherited Home pitch from the quaternion.');
canvas.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
canvas.dispatch('pointermove', { pointerId: 1, clientX: 112, clientY: 100 });
assert.ok(Math.abs(recoveredPitch(group.quaternion) - 0.7) < 1e-10, 'The first horizontal touch must not flip or tilt the globe.');
assert.ok(rotations === 1, 'A drag must invoke the view redraw callback.');
canvas.dispatch('pointermove', { pointerId: 1, clientX: 112, clientY: 110 });
assert.ok(Math.abs(recoveredPitch(group.quaternion) - 0.755) < 1e-9, 'Vertical movement must change only the tracked pitch.');
canvas.dispatch('pointerup', { pointerId: 1, clientX: 112, clientY: 110 });

// Home's two-finger gesture is consumed without changing its locked camera
// distance or applying a second rotation path.
const beforeHomePinch = { ...group.quaternion };
canvas.dispatch('pointerdown', { pointerId: 1, clientX: 40, clientY: 50 });
canvas.dispatch('pointerdown', { pointerId: 2, clientX: 140, clientY: 50 });
canvas.dispatch('pointermove', { pointerId: 2, clientX: 190, clientY: 50 });
close(group.quaternion, beforeHomePinch, 'Home pinch input must not rotate the globe.');
assert.equal(homeZoomUpdates, 0, 'Home pinch input must not change its locked camera distance.');
canvas.dispatch('pointerup', { pointerId: 2, clientX: 190, clientY: 50 });
canvas.dispatch('pointerup', { pointerId: 1, clientX: 40, clientY: 50 });
homeGestures.dispose();

// Earth View opts into the same Engine pinch gesture and provides its own
// camera-distance adapter and limits. Zoom remains local to that view.
const earthCanvas = new EventTargetMock();
let cameraDistance = 10;
let zoomUpdates = 0;
const earthGestures = sandbox.createInteractions({ Vector3, Quaternion }, group, {
  element: earthCanvas,
  rotation: { sensitivityX: 0.008, sensitivityY: 0.006, minPitch: -1.25, maxPitch: 1.25 },
  zoom: {
    enabled: true,
    getDistance: () => cameraDistance,
    setDistance: value => { cameraDistance = value; },
    minDistance: 8,
    maxDistance: 12
  },
  onZoom: () => zoomUpdates++
});
const beforePinch = { ...group.quaternion };
earthCanvas.dispatch('pointerdown', { pointerId: 1, clientX: 40, clientY: 50 });
earthCanvas.dispatch('pointerdown', { pointerId: 2, clientX: 140, clientY: 50 });
earthCanvas.dispatch('pointermove', { pointerId: 2, clientX: 180, clientY: 50 });
assert.equal(cameraDistance, 8, 'Earth View pinch zoom must respect the view-owned minimum camera distance.');
assert.equal(zoomUpdates, 1, 'A pinch update must invoke the view redraw callback.');
close(group.quaternion, beforePinch, 'A two-finger pinch must not rotate the Earth group.');
earthCanvas.dispatch('pointerup', { pointerId: 2, clientX: 180, clientY: 50 });
earthGestures.reset();
earthGestures.dispose();

// Home and Earth View must both use the same Engine interaction API. Home's
// zoom is deliberately disabled; Earth View supplies its own camera adapter.
assert.match(home, /earthGlobe\.attachInteractions\(/, 'Home must use Engine-provided gestures.');
assert.match(home, /zoom:\s*\{\s*enabled:\s*false\s*\}/, 'Home camera zoom must remain locked.');
assert.doesNotMatch(home, /group\.rotation\.[xy]\s*(?:\+=|=)/, 'Home must not retain an Euler-based drag path.');
assert.match(controller, /earthGlobe\.attachInteractions\(/, 'Independent Earth View must use the same Engine gestures.');
assert.match(controller, /zoom:\s*\{[\s\S]*?enabled:\s*true[\s\S]*?getDistance:[\s\S]*?setDistance:/, 'Earth View must enable shared Engine pinch zoom with its own camera adapter.');
assert.doesNotMatch(controller, /earthGroup\.rotation\.[xy]\s*(?:\+=|=)/, 'Earth View must not retain a second Euler drag implementation.');

console.log('Shared Earth Engine rotation and pinch-zoom regression tests passed.');
