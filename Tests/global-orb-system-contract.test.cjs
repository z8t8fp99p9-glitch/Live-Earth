const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const registry = read('Global/view-module-registry.js');
const manager = read('Global/view-manager.js');
const orbControls = read('Global/orb-controls-v4.js');
const stacksRuntime = read('Stacks/stacks-feature-views.js');
const sw = read('sw.js');
const updateManager = read('Global/update-manager.js');

// The central registry describes Home + Primary views + global Feature Orbs +
// every registered Secondary view in one normalized catalogue.
for (const id of ['home', 'earth', 'moon', 'sun', 'location', 'stacks']) {
  assert.ok(registry.includes(`id: "${id}"`), `${id} must have one global Orb/view registry identity`);
}
assert.match(registry, /kind: "primary-view", hasOrb: false, layout: "main", default: true/, 'Home remains the default Primary screen, not a sixth Orb button.');
assert.match(registry, /id: "location", title: "Location", kind: "feature-orb"/, 'Location is a utility Orb, not a view.');
assert.match(registry, /id: "stacks", title: "Stacks", kind: "feature-orb"/, 'Stacks is a library utility Orb, not a view.');
assert.match(registry, /kind: "secondary-view", hasOrb: true, layout: "stacks"/, 'Stack catalogue entries are Secondary views.');
assert.match(registry, /registerSecondary/, 'Future Secondary views must be addable through the global registration API.');
assert.match(registry, /reserved for a built-in Primary or Feature Orb/, 'Secondary registrations cannot shadow built-in Orb identities.');
assert.match(registry, /typeof options\.connected === \"boolean\" \? options\.connected/, 'Secondary metadata can update connected state in either direction.');
assert.match(registry, /getOrbRegistry/);
assert.match(registry, /getViewRegistry/);
assert.match(registry, /getActiveViewIdentity/);
assert.match(registry, /getLayout: \(\) => activeFeature \? "three-orb" : "five-orb"/);
assert.match(registry, /live-earth-orb-registry-change/);

// There can be only one selected Secondary view. The three-Orb dock remains
// [active Secondary] [Location] [Stacks], without introducing another close UI.
assert.match(registry, /let activeFeature = null/);
assert.match(registry, /dock\.append\(featureButton, locationButton, stacksButton\)/);
assert.match(registry, /featureButton\.addEventListener\("click", \(\) => closeActiveFeature\("orb-toggle"\)\)/);
assert.match(registry, /#le-feature-dock/);
assert.match(orbControls, /--le-orb-main-size/);
assert.match(orbControls, /--le-orb-hunter-size/);
assert.match(orbControls, /--le-orb-size-dock: var\(--le-orb-main-size\)/);
assert.match(read('Clouds/clouds-view.js'), /runtime\.registerFeature\('clouds'/);

// Location and Stacks toggles do not emit a view transition. Opening/closing
// the Stacks library is a layer over the currently active view.
const toggleLibrary = registry.slice(registry.indexOf('function toggleLibrary()'), registry.indexOf('function activateFeature('));
assert.doesNotMatch(toggleLibrary, /live-earth-view-transition|live-earth-view-changed/);
const locationListener = registry.slice(registry.indexOf('window.addEventListener("live-earth-location-state"'), registry.indexOf('window.addEventListener("live-earth-primary-view-change"'));
assert.doesNotMatch(locationListener, /live-earth-view-transition|live-earth-view-changed/);

// One lifecycle event fires before outgoing cleanup; one completion event fires
// after the incoming view has become active. Primary->Secondary is not split by
// a fake intermediate Home transition.
const primaryHandler = registry.slice(registry.indexOf('function onPrimaryViewChange'), registry.indexOf('window.addEventListener("live-earth-primary-view-change"'));
assert.ok(primaryHandler.indexOf('live-earth-view-transition') < primaryHandler.indexOf('safely(entry.deactivate'), 'Primary pre-transition must happen before outgoing module deactivation.');
const featureOpen = registry.slice(registry.indexOf('function activateFeature('), registry.indexOf('function closeActiveFeature('));
assert.ok(featureOpen.indexOf('live-earth-view-transition') < featureOpen.indexOf('previousFeature.deactivate'), 'Secondary pre-transition must happen before previous feature cleanup.');
assert.ok(featureOpen.includes('suppressPrimaryOwnerTransitions'), 'The underlying Home return is one internal transaction, not a second active-view change.');
const featureClose = registry.slice(registry.indexOf('function closeActiveFeature('), registry.indexOf('function onMainNavCapture('));
assert.ok(featureClose.indexOf('live-earth-view-transition') < featureClose.indexOf('previousFeature.deactivate'), 'Secondary close must signal before cleanup.');
assert.ok(featureClose.indexOf('live-earth-view-changed') > featureClose.indexOf('emitChange(null'), 'Secondary completion follows cleanup and UI restoration.');
assert.match(registry, /preparePrimaryOwnerTransition = \(next, previous\)/, 'Direct Primary navigation must also close a Secondary view through one transition.');

// The five-button and three-button layouts retain their existing controllers and
// CSS geometry. Home is selected by the absence of another Primary view.
assert.match(manager, /let activeView = "home"/);
assert.match(manager, /const supported = new Set\(\["home", "earth", "moon", "sun"\]\)/);
assert.match(orbControls, /const primaryActive =/);
assert.match(sw, /v131-home-location-marker/);
assert.match(updateManager, /v131-home-location-marker/);
assert.match(updateManager, /window\.LiveEarthOrbSystem/);
assert.match(sw, /window\.LiveEarthGlobalViewpoint && !!window\.LiveEarthOrbSystem/, 'Offline startup gate must wait for the new global Engine viewpoint and Orb system.');
assert.doesNotMatch(sw, /window\.LiveEarthViewpointBridge/, 'Offline startup must not wait for the retired Home-only bridge.');

console.log('Global Orb System registry and lifecycle contract tests passed.');
