const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function loadBridge() {
  const source = read('Global/earth-viewpoint-bridge.js').replace(/^export function /gm, 'function ');
  const dispatched = [];
  const sandbox = {
    Math,
    Object,
    Number,
    Event: class Event { constructor(type) { this.type = type; } },
    window: { dispatchEvent: event => dispatched.push(event.type) }
  };
  vm.runInNewContext(`${source}\nglobalThis.__bridgeForTest = { publishHomeOrientation, getHomeOrientation, applyHomeOrientation };`, sandbox);
  return { bridge: sandbox.__bridgeForTest, window: sandbox.window, dispatched };
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

const { bridge, window, dispatched } = loadBridge();
assert.equal(bridge.getHomeOrientation(), null, 'No viewpoint should exist before Home publishes one.');
assert.equal(bridge.applyHomeOrientation(makeGroup()), false, 'A target must not be modified before Home publishes a viewpoint.');

const home = makeGroup(0, 0.6, 0, 0.8);
assert.equal(bridge.publishHomeOrientation(home), true, 'Home should publish a valid orientation.');
assert.equal(window.LiveEarthViewpointBridge.applyHomeOrientation, bridge.applyHomeOrientation, 'The global API should expose the same bridge functions.');
assert.deepEqual(dispatched, ['live-earth-viewpoint-bridge-ready', 'live-earth-home-viewpoint-changed']);

const snapshot = bridge.getHomeOrientation();
assert.ok(Math.abs(snapshot.y - 0.6) < 1e-12);
assert.ok(Math.abs(snapshot.w - 0.8) < 1e-12);
home.quaternion.y = 1;
assert.ok(Math.abs(bridge.getHomeOrientation().y - 0.6) < 1e-12, 'Published orientation must be an immutable snapshot.');

const target = makeGroup();
assert.equal(bridge.applyHomeOrientation(target), true, 'An independent Earth group should accept the Home orientation.');
assert.ok(Math.abs(target.quaternion.y - 0.6) < 1e-12);
assert.ok(Math.abs(target.quaternion.w - 0.8) < 1e-12);
assert.equal(target.matrixUpdated, true);
assert.equal(target.worldMatrixUpdated, true);

assert.equal(bridge.publishHomeOrientation({ quaternion: { x: 0, y: 0, z: 0, w: 0 } }), false, 'A zero-length quaternion must be rejected.');
assert.equal(bridge.publishHomeOrientation({}), false, 'Objects without a quaternion must be rejected.');

const index = read('index.html');
const earthController = read('Earth/earth-view-controller.js');
const sw = read('sw.js');
const updateManager = read('Global/update-manager.js');
assert.match(index, /import\('\.\/Global\/earth-viewpoint-bridge\.js'\)/, 'Home must load the bridge module.');
assert.match(index, /publishHomeOrientation\(group\)/, 'Home must publish its initial orientation and interactive rotation.');
assert.match(earthController, /import\("\.\.\/Global\/earth-viewpoint-bridge\.js"\)/, 'Independent Earth View must load the bridge.');
assert.match(earthController, /applyHomeOrientation\?\.\(earthGroup\)/, 'Earth View must consume Home orientation on activation.');
assert.match(sw, /"\.\/Global\/earth-viewpoint-bridge\.js"/, 'The bridge must be an essential offline shell asset.');
assert.match(sw, /!window\.LiveEarthViewpointBridge/, 'Startup repair must detect a missing bridge.');
assert.match(updateManager, /window\.LiveEarthViewpointBridge/, 'Verified startup must wait for the bridge.');
assert.doesNotMatch(earthController, /publishHomeOrientation/, 'Independent Earth View must not write its orientation back to Home.');

console.log('Earth viewpoint bridge tests passed.');
