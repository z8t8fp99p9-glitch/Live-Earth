const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const residentsSource = read('Residents/resident-library.js');
const engineSource = read('Residents/resident-3d-engine.mjs');
const weatherSource = read('Weather/weather-view.js');

const styleNodes = new Map();
const fakeDocument = {
  head: { appendChild(node) { styleNodes.set(node.id, node); } },
  getElementById(id) { return styleNodes.get(id) || null; },
  createElement(tag) { return { tagName: tag.toUpperCase(), id: '', textContent: '' }; }
};
const sandbox = { window: {}, document: fakeDocument, console };
vm.runInNewContext(residentsSource, sandbox, { filename: 'Residents/resident-library.js' });
const library = sandbox.window.LiveEarthResidentLibrary;

assert.ok(library, 'The shared Residents API must register on window');
assert.equal(library.version, '1.3.0', 'The Weather public version contract must remain compatible');
assert.equal(library.renderer, 'threejs-procedural-3d', 'The normal Residents renderer must be actual Three.js 3D');

const roster = library.getRoster();
assert.equal(roster.length, 3, 'The permanent cast must contain exactly three residents');
assert.deepEqual(Array.from(roster, person => person.id), ['one', 'two', 'three']);
assert.deepEqual(Array.from(roster, person => person.displayName), ['Red Hoodie Boy', 'Little Lady', 'Blue Jacket Boy']);
assert.deepEqual(Array.from(roster, person => person.kind), ['red', 'lady', 'blue']);
assert.ok(roster.every(person => person.asset && person.asset.endsWith('.webp')), 'Original art references remain available as a fallback');

const activities = library.getActivityCatalog();
for (const activity of ['calm', 'morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
  assert.ok(activities[activity], `The shared activity catalogue must include ${activity}`);
}
assert.equal(activities.festival.stage, 'shared-library');

const fallback = library.renderMarkup();
assert.equal((fallback.match(/class="le-resident-fallback-person"/g) || []).length, 3, 'A lightweight fallback remains available if WebGL cannot initialize');
assert.ok(fallback.includes('resident-little-lady.webp'), 'The little lady remains present in the fallback roster');

const host = { dataset: {} };
for (const mode of ['morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
  assert.equal(library.setActivity(host, { mode, gustLevel: 'normal' }), true);
  assert.equal(host.dataset.activity, mode, `Host should select ${mode}`);
}
library.setActivity(host, { mode: 'wind', gustLevel: 'strong' });
assert.equal(host.dataset.gust, 'strong');
library.setActivity(host, { mode: 'unknown-activity' });
assert.equal(host.dataset.activity, 'calm', 'Unknown activities must safely fall back to calm');

for (const weatherState of ['clear', 'cloudy']) {
  const dawn = { dataset: {} };
  library.setActivity(dawn, { mode: 'calm', phase: 'dawn', weather: weatherState });
  assert.equal(dawn.dataset.activity, 'morning', `Fair ${weatherState} dawn should select the park routine`);
}
for (const weatherState of ['rain', 'storm', 'snow', 'fog', 'hot']) {
  const severeDawn = { dataset: {} };
  library.setActivity(severeDawn, { mode: 'calm', phase: 'dawn', weather: weatherState });
  assert.equal(severeDawn.dataset.activity, 'calm', `${weatherState} must take priority over morning exercise`);
}

for (const feature of ['WebGLRenderer', 'OrthographicCamera', 'HemisphereLight', 'DirectionalLight', 'requestAnimationFrame', 'ResizeObserver']) {
  assert.ok(engineSource.includes(feature), `The 3D renderer must use ${feature}`);
}
for (const feature of ['makeArm', 'makeLeg', 'createFace', 'createHair', 'poseActor', 'createUmbrella']) {
  if (feature === 'createHair') assert.ok(engineSource.includes('function addHair'), 'The model must build dimensional hair');
  else assert.ok(engineSource.includes(feature), `The character rig must include ${feature}`);
}
assert.ok(engineSource.includes("person.id === 'lady'"), 'The little lady needs her own clothing/model design');
assert.ok(engineSource.includes("person.id === 'red'"), 'The red-hoodie boy needs his own clothing/model design');
assert.ok(engineSource.includes("person.id === 'blue'"), 'The blue-jacket boy needs his own clothing/model design');
assert.ok(engineSource.includes("mode === 'festival'"), 'Festival must have its own animation state');
assert.ok(engineSource.includes("mode === 'rain'"), 'Rain must have articulated movement and umbrellas');
assert.ok(engineSource.includes("mode === 'snow'"), 'Snow must have articulated shivering and winter wear');
assert.ok(engineSource.includes('eye.scale.y'), 'Faces must blink independently');
assert.ok(!engineSource.includes('GLTFLoader') && !engineSource.includes('new Video'), 'The first procedural engine must not add model downloads or video');

assert.ok(residentsSource.includes("'./Residents/resident-3d-engine.mjs'"), 'The shared library must load the actual 3D engine');
assert.ok(residentsSource.includes('mounted.engine?.dispose()'), 'The renderer must dispose when the host view closes');
assert.ok(weatherSource.includes("RESIDENT_LIBRARY_VERSION = '1.3.0'"), 'Weather must keep its current Residents loader contract');
assert.ok(weatherSource.includes('LiveEarthResidentLibrary?.setActivity(residentHost, state)'), 'Forecast state must drive the articulated 3D activity');
assert.ok(weatherSource.includes('function applyResidentPreview(id)'), 'The normal Weather preview controls must continue to work');

console.log('Residents 3D roster, articulated models, movement states, lifecycle and Weather integration tests passed.');
