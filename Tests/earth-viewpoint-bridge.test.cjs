const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function createStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function loadBridge(sessionStorage, sharedWindow = null) {
  const source = read('Global/earth-viewpoint-bridge.js').replace(/^export function /gm, 'function ');
  const dispatched = [];
  const window = sharedWindow || {
    sessionStorage,
    dispatchEvent: event => dispatched.push(event.type)
  };
  const sandbox = {
    Math,
    Object,
    Number,
    JSON,
    Event: class Event { constructor(type) { this.type = type; } },
    window
  };
  vm.runInNewContext(`${source}\nglobalThis.__bridgeForTest = { publishHomeOrientation, getHomeOrientation, applyHomeOrientation };`, sandbox);
  return { bridge: sandbox.__bridgeForTest, window, dispatched };
}

function makeGroup(x = 0, y = 0, z = 0, w = 1) {
  return {
    quaternion: {
      x, y, z, w,
      set(nextX, nextY, nextZ, nextW) {
        this.x = nextX; this.y = nextY; this.z = nextZ; this.w = nextW;
      }
    },
    matrixUpdated: false,
    worldMatrixUpdated: false,
    updateMatrix() { this.matrixUpdated = true; },
    updateMatrixWorld(force) { this.worldMatrixUpdated = force === true; }
  };
}

const storage = createStorage();
const firstPage = loadBridge(storage);
const bridge = firstPage.bridge;
assert.equal(bridge.getHomeOrientation(), null, 'No viewpoint should exist before Home publishes one.');
assert.equal(bridge.applyHomeOrientation(makeGroup()), false, 'A target must not be modified before Home publishes a viewpoint.');

const home = makeGroup(0, 0.6, 0, 0.8);
assert.equal(bridge.publishHomeOrientation(home, { persist: false }), true, 'Home should publish live in-page orientation.');
assert.equal(storage.values.size, 0, 'Pointer-move updates should not write sessionStorage every frame.');
assert.equal(bridge.getHomeOrientation().y, 0.6);

home.quaternion.y = 0.8;
home.quaternion.w = 0.6;
assert.equal(bridge.publishHomeOrientation(home), true, 'The settled Home orientation should be persisted.');
assert.ok(storage.values.has('liveEarthHomeViewpointV1'), 'The settled orientation must survive same-tab navigation.');
assert.deepEqual(firstPage.dispatched, [
  'live-earth-viewpoint-bridge-ready',
  'live-earth-home-viewpoint-changed',
  'live-earth-home-viewpoint-changed'
]);

const samePageTarget = makeGroup();
assert.equal(bridge.applyHomeOrientation(samePageTarget), true);
assert.ok(Math.abs(samePageTarget.quaternion.y - 0.8) < 1e-12);
assert.ok(Math.abs(samePageTarget.quaternion.w - 0.6) < 1e-12);
assert.equal(samePageTarget.matrixUpdated, true);
assert.equal(samePageTarget.worldMatrixUpdated, true);

// Simulate Earth Modes opening as a new document: module memory is gone, but
// the same-tab sessionStorage snapshot must still be available to its module.
const secondPage = loadBridge(storage);
assert.ok(Math.abs(secondPage.bridge.getHomeOrientation().y - 0.8) < 1e-12, 'A new page must restore the saved Home orientation.');
const earthModesTarget = makeGroup();
assert.equal(secondPage.bridge.applyHomeOrientation(earthModesTarget), true, 'Earth Modes must accept the persisted Home orientation.');
assert.ok(Math.abs(earthModesTarget.quaternion.y - 0.8) < 1e-12);
assert.ok(Math.abs(earthModesTarget.quaternion.w - 0.6) < 1e-12);

// Simulate two module instances in one document: both must see the shared window state.
const duplicateInstance = loadBridge(storage, firstPage.window);
assert.ok(Math.abs(duplicateInstance.bridge.getHomeOrientation().y - 0.8) < 1e-12, 'Bridge instances must share the window-level snapshot.');

assert.equal(bridge.publishHomeOrientation({ quaternion: { x: 0, y: 0, z: 0, w: 0 } }), false, 'A zero-length quaternion must be rejected.');
assert.equal(bridge.publishHomeOrientation({}), false, 'Objects without a quaternion must be rejected.');

const index = read('index.html');
const earthController = read('Earth/earth-view-controller.js');
const earthModes = read('Earth/earth-orb-globe.js');
const sw = read('sw.js');
const updateManager = read('Global/update-manager.js');
assert.match(index, /import\('\.\/Global\/earth-viewpoint-bridge\.js'\)/, 'Home must load the bridge module.');
assert.match(index, /applyHomeOrientation\(group\)/, 'Home must restore the saved orientation after same-tab navigation.');
assert.match(index, /publishHomeOrientation\(group, \{ persist: false \}\)/, 'Home must publish live pointer movement without storage writes per frame.');
assert.match(index, /viewpointBridge\.publishHomeOrientation\(group\);\s*\n\s*\};/, 'Home must persist its settled orientation after pointer release.');
assert.match(earthController, /import\("\.\.\/Global\/earth-viewpoint-bridge\.js"\)/, 'Independent Earth View must load the bridge.');
assert.match(earthController, /applyHomeOrientation\?\.\(earthGroup\)/, 'Independent Earth View must consume Home orientation on activation.');
assert.match(earthModes, /import \{ applyHomeOrientation \} from "\.\.\/Global\/earth-viewpoint-bridge\.js"/, 'Earth Modes must load the bridge.');
assert.match(earthModes, /applyHomeOrientation\(group\)/, 'Earth Modes must consume Home orientation.');
assert.doesNotMatch(earthModes, /earth\.rotation\.y\s*=\s*-?0\.35/, 'Earth Modes surface must not add a longitude offset after applying Home group orientation.');
assert.match(sw, /v122-persistent-earth-viewpoint-bridge/, 'The service worker build identity must be bumped.');
assert.match(sw, /"\.\/Earth\/earth-orb-globe\.js"/, 'Earth Modes controller must remain an essential offline asset.');
assert.match(sw, /"\.\/Global\/earth-viewpoint-bridge\.js"/, 'The bridge must be an essential offline shell asset.');
assert.match(updateManager, /v122-persistent-earth-viewpoint-bridge/, 'Update manager and service worker must share the build identity.');
assert.doesNotMatch(earthController, /publishHomeOrientation/, 'Independent Earth View must not write its orientation back to Home.');
assert.doesNotMatch(earthModes, /publishHomeOrientation/, 'Earth Modes must not write its orientation back to Home.');

console.log('Persistent Earth viewpoint bridge tests passed.');
