const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const librarySource = fs.readFileSync(path.join(root, 'Residents/resident-library.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'Residents/resident-3d-engine.mjs'), 'utf8');
const frameworkSource = fs.readFileSync(path.join(root, 'Residents/resident-activity-framework.mjs'), 'utf8');
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
assert.ok(engineSource.includes("from './resident-activity-framework.mjs'"), 'The Residents 3D engine must use the shared activity framework');
assert.ok(frameworkSource.includes('function applyGait('));
assert.ok(frameworkSource.includes('function getBallExchange('));
assert.ok(frameworkSource.includes('function applyBallResponse('));
assert.ok(frameworkSource.includes('function sampleEnvironment('));
assert.ok(engineSource.includes('renderer.forceContextLoss?.()'));
assert.ok(engineSource.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"));
assert.ok(engineSource.includes("mode === 'festival'"));
assert.ok(engineSource.includes("mode === 'rain'"));
assert.ok(engineSource.includes("mode === 'snow'"));

console.log('Procedural 3D Residents engine and shared activity-framework contract passed.');
