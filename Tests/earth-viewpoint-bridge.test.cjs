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
  const source = read('EarthEngine/Core/earth-viewpoint-bridge.js').replace(/^export function /gm, 'function ');
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
assert.ok(storage.values.has('liveEarthHomeViewpointV3'), 'The settled orientation must survive same-tab navigation.');
assert.deepEqual(firstPage.dispatched, [
  'live-earth-viewpoint-bridge-ready',
  'live-earth-home-viewpoint-changed',
  'live-earth-home-viewpoint-changed'
]);

const samePageTarget = makeGroup();
const independentSurface = { quaternion: { x: 0, y: 0, z: 0, w: 1, set(x, y, z, w) { this.x=x; this.y=y; this.z=z; this.w=w; } } };
assert.equal(bridge.applyHomeOrientation(samePageTarget, independentSurface), true);
assert.ok(Math.abs(samePageTarget.quaternion.y - 0.8) < 1e-12);
assert.ok(Math.abs(samePageTarget.quaternion.w - 0.6) < 1e-12);
assert.deepEqual([independentSurface.quaternion.x, independentSurface.quaternion.y, independentSurface.quaternion.z, independentSurface.quaternion.w], [0, 0, 0, 1], 'Bridge must not apply any child-surface transform.');
assert.equal(Object.prototype.hasOwnProperty.call(bridge.getHomeOrientation(), 'surface'), false, 'Snapshot must contain only Home user-controlled group orientation.');
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

// V124 stored an extra child-surface quaternion. V125 must migrate only the group pose.
const v124Storage = createStorage();
v124Storage.setItem('liveEarthHomeViewpointV2', JSON.stringify({
  version: 2,
  orientation: { x: 0, y: 0.6, z: 0, w: 0.8, surface: { x: 0, y: 0.7, z: 0, w: Math.sqrt(1 - 0.7 * 0.7) } }
}));
const migratedPage = loadBridge(v124Storage);
assert.ok(Math.abs(migratedPage.bridge.getHomeOrientation().y - 0.6) < 1e-12, 'V124 group orientation must remain available during migration.');
assert.equal(Object.prototype.hasOwnProperty.call(migratedPage.bridge.getHomeOrientation(), 'surface'), false, 'V124 Moon-driven surface data must be discarded.');
const migratedTarget = makeGroup();
const protectedSurface = { quaternion: { x: 0, y: 0, z: 0, w: 1, set() { throw new Error('Surface must never be changed.'); } } };
assert.equal(migratedPage.bridge.applyHomeOrientation(migratedTarget, protectedSurface), true);
assert.deepEqual([protectedSurface.quaternion.x, protectedSurface.quaternion.y, protectedSurface.quaternion.z, protectedSurface.quaternion.w], [0, 0, 0, 1]);
assert.equal(migratedPage.bridge.publishHomeOrientation(migratedTarget), true);
assert.ok(v124Storage.values.has('liveEarthHomeViewpointV3'), 'Next Home publish must save the new group-only V3 format.');

assert.equal(bridge.publishHomeOrientation({ quaternion: { x: 0, y: 0, z: 0, w: 0 } }), false, 'A zero-length quaternion must be rejected.');
assert.equal(bridge.publishHomeOrientation({}), false, 'Objects without a quaternion must be rejected.');

const index = read('index.html');
const earthController = read('Earth/earth-view-controller.js');
const earthModes = read('Earth/earth-orb-globe.js');
const sw = read('sw.js');
const updateManager = read('Global/update-manager.js');
assert.match(index, /import\('\.\/EarthEngine\/Core\/earth-viewpoint-bridge\.js'\)/, 'Home must load the bridge module.');
assert.match(index, /applyHomeOrientation\(group\)/, 'Home must restore the saved orientation after same-tab navigation.');
assert.match(index, /publishHomeOrientation\(group, \{ persist: false \}\)/, 'Home must publish live pointer movement without storage writes per frame.');
assert.match(index, /viewpointBridge\.publishHomeOrientation\(group\);\s*\n\s*\};/, 'Home must persist its settled orientation after pointer release.');
assert.match(earthController, /import\("\.\.\/EarthEngine\/Core\/earth-viewpoint-bridge\.js"\)/, 'Independent Earth View must load the bridge.');
assert.match(earthController, /applyHomeOrientation\?\.\(earthGroup\)/, 'Independent Earth View must consume Home orientation on activation.');
assert.match(earthModes, /import \{ applyHomeOrientation \} from "\.\.\/EarthEngine\/Core\/earth-viewpoint-bridge\.js"/, 'Earth Modes must load the bridge.');
assert.match(earthModes, /applyHomeOrientation\(group\)/, 'Earth Modes must consume Home orientation.');
assert.match(earthModes, /import \{ createEarthGlobe \} from "\.\.\/EarthEngine\/Core\/earth-engine\.js"/, 'Earth Modes must use the canonical Global Earth Engine.');
assert.match(sw, /v127-earthengine-root-folder/, 'The service worker build identity must be bumped.');
assert.match(sw, /"\.\/Earth\/earth-orb-globe\.js"/, 'Earth Modes controller must remain an essential offline asset.');
assert.match(sw, /"\.\/EarthEngine\/Core\/earth-viewpoint-bridge\.js"/, 'The bridge must be an essential offline shell asset.');
assert.match(updateManager, /v127-earthengine-root-folder/, 'Update manager and service worker must share the build identity.');
assert.doesNotMatch(earthController, /publishHomeOrientation/, 'Independent Earth View must not write its orientation back to Home.');
assert.doesNotMatch(earthModes, /publishHomeOrientation/, 'Earth Modes must not write its orientation back to Home.');

console.log('Persistent Earth viewpoint bridge tests passed.');
