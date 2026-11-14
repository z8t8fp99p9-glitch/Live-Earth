const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Traffic', 'traffic-view.js'), 'utf8');

// The new workspace must use the existing feature registry and stage lifecycle.
assert.match(source, /runtime\.registerFeature\('traffic', activateTrafficWallpaper\)/,
  'The existing Traffic feature must remain registered and unchanged in purpose.');
assert.match(source, /featureRegistry\.register\('live-cams',\s*\{/ ,
  'Live Cams must remain registered as its own Secondary feature view.');
assert.match(source, /const view = runtime\.mount\('live-cams'\)/,
  'Live Cams must mount inside the existing Stacks stage.');
assert.match(source, /liveCamsCleanup\(\)/,
  'Closing Live Cams must invoke its cleanup callback.');
assert.match(source, /activeRequest\?\.abort\(\)/,
  'Closing Live Cams must abort outstanding camera directory requests.');
assert.match(source, /window\.clearInterval\(refreshTimer\)/,
  'Closing Live Cams must stop its refresh cadence.');

// Do not render a frame unless the directory explicitly grants embed permission,
// identifies it as an image, marks it free, says it is live/fresh, and supplies credit.
assert.match(source, /camera\?\.is_free !== true/);
assert.match(source, /camera\?\.view\?\.render !== 'image'/);
assert.match(source, /camera\?\.redistribution\?\.preview_embed !== true/);
assert.match(source, /function cameraCredit\(camera\)/);
assert.match(source, /function isFresh\(camera\)/);
assert.match(source, /age <= 86400/);
assert.match(source, /credit\.name/);
assert.match(source, /credit\.url/);
assert.match(source, /url\.protocol === 'https:'/);
assert.match(source, /le-lc-card-credit/);
assert.match(source, /heroCredit\.href/);

// Protect the existing app architecture: no second globe, map renderer or paid stream session.
assert.doesNotMatch(source, /WebGLRenderer|createEarthGlobe|LiveEarthScene|forceContextLoss|whep\/offer|open_live|streams\/.*\/frame/,
  'The discovery-only Live Cams view must not create a globe or start metered video playback.');
assert.match(source, /\/catalog\/featured/);
assert.match(source, /\/catalog\/categories/);
assert.match(source, /\/catalog\?q=/);
assert.match(source, /REGION_TILES/);
assert.match(source, /\/catalog\?bbox=/);
assert.match(source, /\/catalog\?category=/);
assert.match(source, /function loadMore\(\)/);
assert.match(source, /cursor: paginationCursor/);
assert.match(source, /nextCursorFrom\(payload\)/);
assert.match(source, /Load more cameras/);

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.textContent = '';
    this.parentElement = null;
    this.listeners = new Map();
    this.classList = { add() {}, remove() {} };
  }
  append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
  appendChild(node) { if (node && typeof node === 'object') { this.children.push(node); node.parentElement = this; } return node; }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, fn) { const values = this.listeners.get(name) || new Set(); values.add(fn); this.listeners.set(name, values); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  remove() { this.removed = true; if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this); this.parentElement = null; }
  focus() { this.focused = true; }
  querySelector() { return null; }
}

async function exerciseLifecycle() {
  let registered;
  let trafficRegistered;
  let intervalCleared = false;
  let timeoutCleared = false;
  let hostClassRemoved = false;
  let rootRemoved = false;
  const stageCard = new FakeElement('div');
  stageCard.hidden = true;
  const host = new FakeElement('section');
  host.querySelector = selector => selector === '.le-feature-stage-card' ? stageCard : null;
  host.classList.remove = name => { if (name === 'le-sfv-open') hostClassRemoved = true; };
  const mountedRoot = new FakeElement('div');
  mountedRoot.parentElement = host;
  mountedRoot.remove = function() { rootRemoved = true; this.parentElement = null; };
  const body = new FakeElement('div');
  const view = { root: mountedRoot, body };
  const mockDocument = {
    head: new FakeElement('head'),
    activeElement: new FakeElement('button'),
    hidden: false,
    createElement: tag => new FakeElement(tag),
    getElementById: () => null,
    createTextNode: text => ({ textContent: String(text) }),
    addEventListener() {},
    removeEventListener() {}
  };
  const mockWindow = {
    LiveEarthStacksFeatureRuntime: { mount: () => view, registerFeature: (id, activate) => { if (id === 'traffic') trafficRegistered = activate; } },
    LiveEarthFeatureViews: { register: (id, options) => { if (id === 'live-cams') registered = options; } },
    setTimeout: () => 1,
    clearTimeout: () => { timeoutCleared = true; },
    setInterval: () => 2,
    clearInterval: () => { intervalCleared = true; },
    addEventListener() {},
    removeEventListener() {}
  };
  const fetchStub = async url => ({
    ok: true,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: async () => url.includes('/catalog/categories') ? { items: [] } : { items: [] }
  });
  const context = {
    window: mockWindow,
    document: mockDocument,
    navigator: { onLine: true },
    fetch: fetchStub,
    URL,
    console,
    AbortController,
    Map,
    Promise,
    Date,
    Number,
    String,
    Math
  };
  vm.runInNewContext(source, context, { filename: 'Traffic/traffic-view.js' });
  assert.equal(typeof trafficRegistered, 'function', 'Traffic should remain registered.');
  assert.equal(typeof registered?.activate, 'function', 'Live Cams should expose activate.');
  assert.equal(typeof registered?.deactivate, 'function', 'Live Cams should expose deactivate.');

  registered.activate();
  await new Promise(resolve => setTimeout(resolve, 0));
  registered.deactivate();
  assert.equal(rootRemoved, true, 'Closing Live Cams must remove its stage root.');
  assert.equal(hostClassRemoved, true, 'Closing Live Cams must remove the stage-open class.');
  assert.equal(stageCard.hidden, false, 'Closing Live Cams must restore the stage card.');
  assert.equal(intervalCleared, true, 'Closing Live Cams must stop the refresh timer.');
  assert.equal(timeoutCleared, true, 'Any in-flight request timeout must be cleared.');
  registered.deactivate();
  assert.equal(rootRemoved, true, 'Repeated close remains safe.');
}

exerciseLifecycle().then(() => {
  console.log('Live Cams discovery, permissions, and lifecycle tests passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
