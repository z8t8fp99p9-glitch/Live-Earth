const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Traffic', 'traffic-view.js'), 'utf8');

// Live Cams branding and photo-led destination browsing.
assert.match(source, /'LIVE \/\/ EARTH'/, 'The product header must use the app name LIVE // EARTH.');
assert.doesNotMatch(source, /'EARTH \/\/ LIVE'/, 'The reversed app name must not remain in the visible header.');
assert.match(source, /le-lc-region-image/);
assert.match(source, /le-lc-category-image/);
assert.match(source, /function discoveryImage\(name\)/);
for (const image of ['wildlife', 'oceans', 'cities', 'weather', 'mountains', 'night-skies']) {
  assert.ok(fs.existsSync(path.join(root, 'Traffic', 'Assets', 'live-cams-discovery', `${image}.jpg`)),
    `The packaged ${image} discovery image must exist.`);
}

// Existing feature-stage registration, cleanup and protected-view boundaries.
assert.match(source, /runtime\.registerFeature\('traffic', activateTrafficWallpaper\)/,
  'The existing Traffic feature must remain registered.');
assert.match(source, /featureRegistry\.register\('live-cams',\s*\{/,
  'Live Cams must remain registered as its own Stacks feature view.');
assert.match(source, /const view = runtime\.mount\('live-cams'\)/,
  'Live Cams must mount inside the existing Stacks stage.');
assert.match(source, /liveCamsCleanup\(\)/);
assert.match(source, /activeRequest\?\.abort\(\)/);
assert.match(source, /window\.clearInterval\(refreshTimer\)/);
assert.doesNotMatch(source, /WebGLRenderer|createEarthGlobe|LiveEarthScene|forceContextLoss|whep\/offer|open_live|streams\/.*\/frame/,
  'Live Cams must not create a globe or initiate metered live-video playback.');

// Directory-permission and freshness rules follow the current OpenEye contract.
assert.match(source, /camera\?\.is_free !== true/);
assert.match(source, /camera\?\.view\?\.render !== 'image'/);
assert.match(source, /camera\?\.redistribution\?\.preview_embed !== true/);
assert.match(source, /function cameraCredit\(camera\)/);
assert.match(source, /function frameAgeSeconds\(camera\)/);
assert.match(source, /age <= 7 \* 86400/,
  'Eligible previews can remain in the documented seven-day directory window.');
assert.match(source, /cameraFreshnessLabel/,
  'Older eligible preview frames must not be labelled LIVE.');
assert.match(source, /credit\.name/);
assert.match(source, /credit\.url/);
assert.match(source, /url\.protocol === 'https:'/);

// API requests retry simpler catalog filters and have a map-to-detail fallback.
assert.match(source, /async function requestCatalog\(params, signal\)/);
assert.match(source, /variants\[1\]\.delete\('sort'\)/);
assert.match(source, /variants\[2\]\.delete\('embeddable'\)/);
assert.match(source, /\/catalog\/map\?/);
assert.match(source, /\/catalog\/\$\{encodeURIComponent\(item\.id\)\}/);
assert.match(source, /\/catalog\/featured/);
assert.match(source, /\/catalog\/categories/);
assert.match(source, /function loadMore\(\)/);
assert.match(source, /cursor: paginationCursor/);

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
function findAll(node, className, output = []) {
  if (!node || typeof node !== 'object') return output;
  if (node.className === className) output.push(node);
  for (const child of node.children || []) findAll(child, className, output);
  return output;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function exerciseLifecycleAndDirectoryFallback() {
  let registered;
  let trafficRegistered;
  let intervalCleared = false;
  let timeoutCleared = false;
  let rootRemoved = false;
  const requestLog = [];
  const stageCard = new FakeElement('div');
  stageCard.hidden = true;
  const host = new FakeElement('section');
  host.querySelector = selector => selector === '.le-feature-stage-card' ? stageCard : null;
  host.classList.remove = () => {};
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
  const camera = {
    id: 'stream_test_01', title: 'Alpine valley camera', city: 'Zermatt', country: 'Switzerland', category: 'ski',
    live: true, is_free: true, last_frame_age_s: 172800,
    view: { render: 'image', url: 'https://images.example.test/alpine.webp' },
    redistribution: { preview_embed: true, attribution: { name: 'Camera operator', url: 'https://operator.example.test' } },
    source_url: 'https://operator.example.test/camera'
  };
  const fetchStub = async (url) => {
    requestLog.push(String(url));
    const value = String(url);
    let payload = { items: [] };
    let status = 200;
    if (value.includes('/catalog/featured')) payload = { items: [camera] };
    else if (value.includes('/catalog/categories')) payload = { items: [{ category: 'wildlife', count: 466 }] };
    else if (value.includes('/catalog?bbox=') && value.includes('-25%2C34%2C60%2C72')) status = 500;
    else if (value.includes('/catalog?bbox=') && (value.includes('sort=fresh') || value.includes('embeddable=1'))) status = 500;
    else if (value.includes('/catalog?bbox=')) payload = { items: [camera] };
    else if (value.includes('/catalog/map?')) payload = { mode: 'items', items: [{ id: camera.id }], total: 1 };
    else if (value.includes(`/catalog/${camera.id}`)) payload = { item: camera };
    else if (value.includes('/catalog?category=')) payload = { items: [camera] };
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: async () => payload
    };
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
  const context = {
    window: mockWindow,
    document: mockDocument,
    navigator: { onLine: true },
    fetch: fetchStub,
    URL,
    URLSearchParams,
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
  await wait(5);
  const regionTiles = findAll(body, 'le-lc-region');
  const regionTile = regionTiles[0];
  const europeTile = regionTiles[1];
  const categoryTile = findAll(body, 'le-lc-category')[0];
  assert.ok(regionTile, 'Region tiles should be rendered.');
  assert.ok(europeTile, 'The Europe region tile should be rendered.');
  assert.ok(categoryTile, 'Category tiles should be rendered.');
  assert.ok(findAll(body, 'le-lc-region-image').length === 6, 'All six regions should have photographic image elements.');
  assert.ok(findAll(body, 'le-lc-category-image').length === 6, 'All six categories should have photographic image elements.');
  assert.ok(requestLog.some(url => url.includes('/catalog/featured')), 'Home should request featured cameras.');

  // Region click: the strict preferred query and its reduced variant return 500;
  // the plain documented catalogue request is then retried and returns a photo.
  for (const listener of regionTile.listeners.get('click') || []) listener();
  await wait(20);
  assert.ok(requestLog.some(url => url.includes('/catalog?bbox=') && url.includes('sort=fresh')));
  assert.ok(requestLog.some(url => url.includes('/catalog?bbox=') && !url.includes('embeddable=1') && !url.includes('sort=fresh')),
    'Region browsing must retry without the failing optional filters.');
  const resultCards = findAll(body, 'le-lc-card');
  assert.ok(resultCards.length > 0, 'A successful fallback response should render camera cards.');

  // Europe deliberately keeps returning 500 for all catalog-query variants;
  // the documented map projection and per-camera detail lookup must recover it.
  for (const listener of europeTile.listeners.get('click') || []) listener();
  await wait(25);
  assert.ok(requestLog.some(url => url.includes('/catalog/map?') && url.includes('bbox=-25%2C34%2C60%2C72')),
    'A persistent region 500 must trigger the documented map-projection fallback.');
  assert.ok(requestLog.some(url => url.includes(`/catalog/${camera.id}`)),
    'Map IDs must be resolved to full camera records before rendering.');

  // Category taps use the same robust catalog path.
  for (const listener of categoryTile.listeners.get('click') || []) listener();
  await wait(15);
  assert.ok(requestLog.some(url => url.includes('/catalog?category=wildlife')),
    'Category tiles must start a catalogue query when tapped.');
  assert.ok(findAll(body, 'le-lc-card').length > 0, 'Category results should render camera cards.');

  registered.deactivate();
  assert.equal(rootRemoved, true, 'Closing Live Cams must remove its stage root.');
  assert.equal(intervalCleared, true, 'Closing Live Cams must stop the refresh timer.');
  assert.equal(timeoutCleared, true, 'Request timeouts must be cleared.');
  registered.deactivate();
  assert.equal(rootRemoved, true, 'Repeated close remains safe.');
}

exerciseLifecycleAndDirectoryFallback().then(() => {
  console.log('Live Cams imagery, API fallback, permission and lifecycle tests passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
