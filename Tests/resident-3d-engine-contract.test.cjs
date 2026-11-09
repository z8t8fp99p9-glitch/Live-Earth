const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const librarySource = fs.readFileSync(path.join(root, 'Residents/resident-library.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'Residents/resident-3d-engine.mjs'), 'utf8');
const fakeDocument = {
  head: { appendChild() {} },
  getElementById() { return null; },
  createElement(tag) { return { tagName: tag.toUpperCase(), id: '', textContent: '' }; }
};
const sandbox = { window: {}, document: fakeDocument, console };
vm.runInNewContext(librarySource, sandbox, { filename: 'Residents/resident-library.js' });
const library = sandbox.window.LiveEarthResidentLibrary;

assert.equal(library.renderer, 'threejs-procedural-3d');
assert.equal(library.getRoster().length, 3);
assert.deepEqual(Array.from(library.getRoster(), resident => resident.displayName), ['Red Hoodie Boy', 'Little Lady', 'Blue Jacket Boy']);

const host = { dataset: {} };
for (const mode of ['morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
  assert.equal(library.setActivity(host, { mode }), true);
  assert.equal(host.dataset.activity, mode);
}
library.setActivity(host, { mode: 'wind', gustLevel: 'strong' });
assert.equal(host.dataset.gust, 'strong');

for (const feature of ['WebGLRenderer', 'OrthographicCamera', 'HemisphereLight', 'DirectionalLight', 'ResizeObserver', 'requestAnimationFrame', 'makeArm', 'makeLeg', 'createFace', 'addHair', 'createUmbrella', 'poseActor']) {
  assert.ok(engineSource.includes(feature), `Missing 3D engine capability: ${feature}`);
}
assert.ok(engineSource.includes("import * as THREE from '../vendor/three.module.js'"));
assert.ok(engineSource.includes('renderer.forceContextLoss?.()'), 'WebGL resources must be released on deactivation');
assert.ok(engineSource.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"), 'Reduced-motion preference must be respected');
assert.ok(engineSource.includes("mode === 'festival'"), 'Festival has a distinct movement pattern');
assert.ok(engineSource.includes("mode === 'rain'"), 'Rain has umbrellas and a rain-dance pattern');
assert.ok(engineSource.includes("mode === 'snow'"), 'Snow has winter clothing and shivering');

console.log('Procedural 3D Residents engine contract passed.');
