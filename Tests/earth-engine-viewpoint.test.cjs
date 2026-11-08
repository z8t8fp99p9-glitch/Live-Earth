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
const storageReads = [];
let storageWrites = 0;
const storage = {
  getItem(key) { storageReads.push(key); return storageValues.has(key) ? storageValues.get(key) : null; },
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

// An old V3 value may still exist in a user's session, but the current Engine
// must not read or restore it. Only the Engine-owned global V1 key is accepted.
storage.setItem('liveEarthHomeViewpointV3', JSON.stringify({
  version: 3,
  orientation: { x: 0, y: 0.6, z: 0, w: 0.8 }
}));
storageWrites = 0;
storageReads.length = 0;

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
  assert.equal(engine.getSnapshot(), null, 'The Engine must not resurrect an obsolete Home-only V3 viewpoint.');
  assert.deepEqual(storageReads, ['liveEarthGlobalViewpointV1'], 'Only the current Engine storage key may be read.');

  const home = await engine.createEarthGlobe({ name: 'home' });
  assert.deepEqual(
    [home.group.quaternion.x, home.group.quaternion.y, home.group.quaternion.z, home.group.quaternion.w],
    [0, 0, 0, 1],
    'Home must start from its current Engine pose, not stale V3 data.'
  );

  // Home → Earth: capture synchronously before outgoing cleanup.
  setUnit(home.group.quaternion, 0.2, 0.4, 0.1, 0.8);
  const beforeHomeToEarthWrites = storageWrites;
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'primary:home', nextOwner: 'primary:earth' }
  }));
  assert.equal(storageWrites, beforeHomeToEarthWrites + 1, 'A transition must persist one settled quaternion immediately.');
  assert.ok(storageValues.has('liveEarthGlobalViewpointV1'), 'The Engine must persist its single global quaternion key.');

  activeOwner = 'primary:earth';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:home', nextOwner: 'primary:earth' }
  }));
  const earth = await engine.createEarthGlobe({ name: 'earth' });
  const asArray = group => [group.quaternion.x, group.quaternion.y, group.quaternion.z, group.quaternion.w];
  assert.deepEqual(asArray(earth.group), asArray(home.group), 'A globe registered after activation must receive the current snapshot immediately.');

  // Simulate a stale cached active-group pointer: Home is currently cached,
  // while the lifecycle event correctly identifies Earth as the outgoing owner.
  activeOwner = 'primary:home';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:earth', nextOwner: 'primary:home' }
  }));

  // Earth → Home: the exact previous-owner group must win over that stale pointer.
  setUnit(earth.group.quaternion, 0.1, 0.75, -0.2, 0.62);
  const expectedEarth = asArray(earth.group);
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'primary:earth', nextOwner: 'primary:home' }
  }));
  const persisted = engine.getSnapshot();
  assert.ok(Math.abs(persisted.x - expectedEarth[0]) < 1e-12);
  assert.ok(Math.abs(persisted.y - expectedEarth[1]) < 1e-12);
  assert.ok(Math.abs(persisted.z - expectedEarth[2]) < 1e-12);
  assert.ok(Math.abs(persisted.w - expectedEarth[3]) < 1e-12);

  activeOwner = 'primary:home';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:earth', nextOwner: 'primary:home' }
  }));
  assert.deepEqual(asArray(home.group), expectedEarth, 'Home must receive the outgoing Earth quaternion synchronously on the view-changed event.');

  // Secondary overlays without their own globe resolve to the Home group.
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-transition', {
    detail: { previousOwner: 'primary:home', nextOwner: 'secondary:clouds' }
  }));
  activeOwner = 'secondary:clouds';
  windowMock.dispatchEvent(new CustomEventMock('live-earth-view-changed', {
    detail: { previousOwner: 'primary:home', nextOwner: 'secondary:clouds' }
  }));
  assert.equal(engine.getCurrentOwner(), 'secondary:clouds');

  const cloudsGlobe = await engine.createEarthGlobe({ name: 'clouds-independent-earth' });
  assert.deepEqual(asArray(cloudsGlobe.group), expectedEarth, 'A separately-created Secondary globe must inherit the latest global quaternion.');

  // The snapshot is deliberately quaternion-only: no Euler angles, camera or zoom.
  assert.deepEqual(Object.keys(engine.getSnapshot()).sort(), ['w', 'x', 'y', 'z']);
  assert.ok(!source.includes('LEGACY_STORAGE_KEYS'), 'No legacy storage migration list may remain.');
  assert.ok(!source.includes('liveEarthHomeViewpointV3'), 'The Engine must not reference the removed V3 key.');
  assert.ok(!read('sw.js').includes('earth-viewpoint-bridge.js'), 'The retired bridge must not remain in the offline shell.');
  assert.ok(!fs.existsSync(path.join(root, 'EarthEngine/Core/earth-viewpoint-bridge.js')), 'The obsolete bridge source must be deleted.');
  assert.ok(!fs.existsSync(path.join(root, 'Tests/earth-viewpoint-bridge.test.cjs')), 'The obsolete bridge test must be replaced.');

  const homeSource = read('index.html');
  assert.match(homeSource, /earthGlobe\.attachInteractions\(/, 'Home must use the Engine-owned interaction controller.');
  assert.match(homeSource, /zoom:\s*\{\s*enabled:\s*false\s*\}/, 'Home zoom must remain locked.');
  assert.doesNotMatch(homeSource, /(?:group|earthGroup)\.rotation\.[xy]\s*(?:\+=|=)/, 'Home must not contain direct Euler drag writes.');
  assert.match(read('Earth/earth-view-controller.js'), /earthGlobe\.attachInteractions\(/, 'Independent Earth View must also use the Engine interaction controller.');

  const beforePageHide = asArray(home.group);
  windowMock.dispatchEvent(new EventMock('pagehide'));
  assert.deepEqual(asArray(home.group), beforePageHide);
  cloudsGlobe.dispose();
  assert.equal(created.find(item => item.globe.group === cloudsGlobe.group).globe.disposed, true);
  console.log('Engine-owned quaternion viewpoint lifecycle tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
