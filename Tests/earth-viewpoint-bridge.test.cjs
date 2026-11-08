const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const listeners = new Map();
const eventLog = [];
let activeOwner = 'primary:home';
const storageValues = new Map();
let storageWrites = 0;
const storage = {
  getItem(key) { return storageValues.has(key) ? storageValues.get(key) : null; },
  setItem(key, value) { storageWrites++; storageValues.set(key, String(value)); },
  removeItem(key) { storageValues.delete(key); }
};
class EventMock { constructor(type) { this.type = type; } }
class CustomEventMock extends EventMock { constructor(type, init = {}) { super(type); this.detail = init.detail || {}; } }

function setUnit(quaternion, x, y, z, w) {
  const length = Math.hypot(x, y, z, w);
  quaternion.set(x / length, y / length, z / length, w / length);
}

function makeGroup(initial = { x: 0, y: 0, z: 0, w: 1 }) {
  return {
    quaternion: {
      ...initial,
      set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; }
    },
    matrixUpdated: 0,
    worldMatrixUpdated: 0,
    updateMatrix() { this.matrixUpdated++; },
    updateMatrixWorld(force) { if (force) this.worldMatrixUpdated++; }
  };
}

const created = [];
async function createEarthGraphics(options) {
  const group = makeGroup();
  const globe = {
    group,
    surface: { rotation: { y: -0.35 } },
    atmosphere: null,
    setGeometryDetail(value) { return value; },
    getState() { return { disposed: false }; },
    dispose() { globe.disposed = true; }
  };
  created.push({ options, globe });
  return globe;
}

const windowMock = {
  sessionStorage: storage,
  LiveEarthOrbSystem: { getActiveViewIdentity: () => activeOwner },
  LiveEarthViewManager: { getCanonicalActiveView: () => activeOwner.split(':')[1] || 'home' },
  addEventListener(type, callback) {
    const entries = listeners.get(type) || [];
    entries.push(callback);
    listeners.set(type, entries);
  },
  dispatchEvent(event) {
    eventLog.push(event.type);
    for (const callback of listeners.get(event.type) || []) callback(event);
    return true;
  }
};

// Legacy V3 Home data is migrated on read; subsequent writes use the Engine's
// single global V1 quaternion key.
storage.setItem('liveEarthHomeViewpointV3', JSON.stringify({
  version: 3,
  orientation: { x: 0, y: 0.6, z: 0, w: 0.8 }
}));
storageWrites = 0;

let source = read('EarthEngine/Core/earth-engine.js');
source = source.replace('import { createEarthGraphics } from "../Graphics/earth-engine-3d-graphics-engine.js";', 'const createEarthGraphics = (...args) => globalThis.__createEarthGraphics(...args);');
source = source.replace(/^export async function /gm, 'async function ');
source = source.replace(/^export const /gm, 'const ');
source += '\nglobalThis.__engineTestApi = { createEarthGlobe, createGlobe, EarthEngine, getSnapshot, getCurrentOwner };';
const sandbox = vm.createContext({
  window: windowMock,
  Event: EventMock,
  CustomEvent: CustomEventMock,
  console,
  Math,
  JSON,
  Number,
  String,
  Object,
  Map,
  Promise,
  globalThis: null,
  __createEarthGraphics: createEarthGraphics
});
sandbox.globalThis = sandbox;
vm.runInContext(source, sandbox, { filename: 'EarthEngine/Core/earth-engine.js' });

(async () => {
  const engine = sandbox.__engineTestApi;
  const migrated = engine.getSnapshot();
  assert.ok(Math.abs(migrated.y - 0.6) < 1e-12, 'The Engine must migrate the last Home-only quaternion.');
  assert.ok(Math.abs(migrated.w - 0.8) < 1e-12);

  const home = await engine.createEarthGlobe({ name: 'home' });
  assert.ok(Math.abs(home.group.quaternion.y - 0.6) < 1e-12, 'A newly-created Home globe must receive the global snapshot automatically.');
  assert.equal(home.group.matrixUpdated, 1);
  assert.equal(home.group.worldMatrixUpdated, 1);

  // Rotating the outgoing globe is not persisted during movement. The one
  // synchronous pre-transition event captures its final quaternion once.
  setUnit(home.group.quaternion, 0.2, 0.4, 0.1, 0.8);
  const beforeHomeToEarthWrites = storageWrites;
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'primary:home', nextOwner: 'primary:earth' }
  }));
  assert.equal(storageWrites, beforeHomeToEarthWrites + 1, 'One view transition must write one snapshot, not a stream of rotations.');
  assert.ok(storageValues.has('liveEarthGlobalViewpointV1'), 'The Engine must persist one global quaternion key.');

  activeOwner = 'primary:earth';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:home', nextOwner: 'primary:earth' }
  }));
  const earth = await engine.createEarthGlobe({ name: 'earth' });
  const sameAsHome = () => [home.group.quaternion.x, home.group.quaternion.y, home.group.quaternion.z, home.group.quaternion.w];
  const sameAsEarth = () => [earth.group.quaternion.x, earth.group.quaternion.y, earth.group.quaternion.z, earth.group.quaternion.w];
  assert.deepEqual(sameAsEarth(), sameAsHome(), 'An Engine globe created after its view activates must receive the saved rotation.');

  setUnit(earth.group.quaternion, 0.1, 0.75, -0.2, 0.62);
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'primary:earth', nextOwner: 'secondary:clouds' }
  }));
  activeOwner = 'secondary:clouds';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:earth', nextOwner: 'secondary:clouds' }
  }));
  assert.deepEqual(sameAsHome(), sameAsEarth(), 'A Secondary overlay without its own globe must reuse the shared Home Earth rotation.');

  const cloudsGlobe = await engine.createEarthGlobe({ name: 'clouds-independent-earth' });
  assert.deepEqual(
    [cloudsGlobe.group.quaternion.x, cloudsGlobe.group.quaternion.y, cloudsGlobe.group.quaternion.z, cloudsGlobe.group.quaternion.w],
    sameAsEarth(),
    'A future Secondary view that creates its own Engine globe must automatically receive the global rotation.'
  );

  setUnit(cloudsGlobe.group.quaternion, -0.15, 0.5, 0.3, 0.78);
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'secondary:clouds', nextOwner: 'primary:moon' }
  }));
  activeOwner = 'primary:moon';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'secondary:clouds', nextOwner: 'primary:moon' }
  }));
  assert.equal(engine.getCurrentOwner(), 'primary:moon');

  // An incoming view may create its Engine globe after the transition. It gets
  // the most recently captured quaternion without any view-specific bridge call.
  activeOwner = 'primary:home';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'primary:moon', nextOwner: 'primary:home' }
  }));
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:moon', nextOwner: 'primary:home' }
  }));
  const finalHome = await engine.createEarthGlobe({ name: 'later-home-instance' });
  const saved = engine.getSnapshot();
  assert.ok(Math.abs(finalHome.group.quaternion.x - saved.x) < 1e-12);
  assert.ok(Math.abs(finalHome.group.quaternion.y - saved.y) < 1e-12);
  assert.ok(Math.abs(finalHome.group.quaternion.z - saved.z) < 1e-12);
  assert.ok(Math.abs(finalHome.group.quaternion.w - saved.w) < 1e-12);

  // The snapshot is deliberately a quaternion only. Camera, zoom and child
  // surface state are never included.
  assert.deepEqual(Object.keys(saved).sort(), ['w', 'x', 'y', 'z']);
  assert.equal(storageWrites <= 4, true, 'Rotation persistence must happen only on transitions or page hide.');
  assert.ok(!read('index.html').includes('publishHomeOrientation'), 'Home must not publish rotations from pointer movement.');
  assert.ok(!read('Earth/earth-view-controller.js').includes('applyHomeOrientation'), 'Independent Earth must not contain a view-specific viewpoint bridge call.');
  assert.ok(!read('Earth/earth-orb-globe.js').includes('applyHomeOrientation'), 'Earth Modes must rely on the Engine automatically.');

  const finalQuaternion = [finalHome.group.quaternion.x, finalHome.group.quaternion.y, finalHome.group.quaternion.z, finalHome.group.quaternion.w];
  windowMock.dispatchEvent(new EventMock('pagehide'));
  assert.deepEqual([engine.getSnapshot().x, engine.getSnapshot().y, engine.getSnapshot().z, engine.getSnapshot().w], finalQuaternion);

  cloudsGlobe.dispose();
  assert.equal(created.find(item => item.globe.group === cloudsGlobe.group).globe.disposed, true);
  console.log('Global Earth Engine viewpoint lifecycle tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
