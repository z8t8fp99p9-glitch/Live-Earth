const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Traffic', 'traffic-view.js'), 'utf8');

// Guard the integration contract that caused the Home overlay regression.
assert.match(source, /featureRegistry\.register\('live-cams',\s*\{/,
  'Live Cams must remain a dedicated Global Feature Orb.');
assert.match(source, /activate:\s*\(\)\s*=>\s*\{\s*liveCamsCleanup\s*=\s*activateWallpaperView\('live-cams'\);\s*\}/,
  'Live Cams activation must retain its mount cleanup callback.');
assert.match(source, /deactivate:\s*\(\)\s*=>\s*\{\s*liveCamsCleanup\(\);/,
  'Closing the Live Cams Orb must execute its cleanup callback.');
assert.match(source, /stage\.classList\.remove\('le-sfv-open'\)/,
  'Deactivation must remove the class that forces the feature stage visible.');
assert.match(source, /view\.root\.remove\(\)/,
  'Deactivation must remove the mounted feature root.');
assert.doesNotMatch(source, /WebGLRenderer|createEarthGlobe|LiveEarthScene|forceContextLoss/,
  'The empty wallpaper view must not allocate or dispose Home/Engine rendering resources.');

// Exercise the actual module registration and close callback with a small DOM/runtime fake.
let trafficActivate;
let liveCamsEntry;
let mountedId = null;
let rootRemovalCount = 0;
let classRemovalCount = 0;
let stageClassRemoved = false;
let rootRemoved = false;
let cardHidden = true;

const stageCard = { set hidden(value) { cardHidden = value; }, get hidden() { return cardHidden; } };
const stage = {
  classList: { remove(name) { if (name === 'le-sfv-open') { stageClassRemoved = true; classRemovalCount++; } } },
  querySelector(selector) { return selector === '.le-feature-stage-card' ? stageCard : null; }
};
const viewRoot = {
  parentElement: stage,
  querySelector() { return null; },
  remove() { rootRemoved = true; rootRemovalCount++; this.parentElement = null; }
};
const view = { root: viewRoot, body: { replaceChildren() {} } };
const styleNode = { id: '', textContent: '' };
const mockDocument = {
  head: { appendChild() {} },
  getElementById() { return null; },
  createElement() { return styleNode; }
};
const mockWindow = {
  LiveEarthStacksFeatureRuntime: {
    registerFeature(id, activate) {
      if (id === 'traffic') trafficActivate = activate;
    },
    mount(id) { mountedId = id; return view; }
  },
  LiveEarthFeatureViews: {
    register(id, entry) { if (id === 'live-cams') liveCamsEntry = entry; }
  }
};

vm.runInNewContext(source, { window: mockWindow, document: mockDocument, console });
assert.equal(typeof trafficActivate, 'function', 'Traffic must still register through the Stacks runtime.');
assert.equal(typeof liveCamsEntry?.activate, 'function', 'Live Cams must register an activation callback.');
assert.equal(typeof liveCamsEntry?.deactivate, 'function', 'Live Cams must register a deactivation callback.');

liveCamsEntry.activate();
assert.equal(mountedId, 'live-cams', 'Live Cams must mount its own wallpaper view.');
liveCamsEntry.deactivate();
assert.equal(rootRemoved, true, 'Live Cams close must remove its mounted stage root.');
assert.equal(stageClassRemoved, true, 'Live Cams close must remove le-sfv-open.');
assert.equal(cardHidden, false, 'Live Cams close must restore the underlying stage card state.');

// Cleanup is intentionally idempotent; a repeated close must not remove anything twice.
liveCamsEntry.deactivate();
assert.equal(rootRemovalCount, 1, 'Repeated close must not remove the stage root twice.');
assert.equal(classRemovalCount, 1, 'Repeated close must not alter the stage a second time.');
console.log('Live Cams stage lifecycle regression tests passed.');
