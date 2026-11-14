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
assert.match(source, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
  'The six region cards should sit in one photo-led strip on mobile.');
assert.match(source, /aspect-ratio:2\.32\/1/,
  'The featured hero should use the wide cinematic reference ratio.');
assert.match(source, /grid-auto-columns:calc\(\(100% - 18px\)\/3\)/,
  'The featured rail should show three compact windows across the mobile viewport.');
assert.match(source, /le-lc-badge\[hidden\].*display:none!important/,
  'Hidden fallback badges must not be exposed by the badge display rule.');
assert.match(source, /function renderHeroDots\(cameras\)/,
  'Multiple featured camera previews should have accessible carousel controls.');
assert.match(source, /resultsTitle\.hidden = true/,
  'The default landing view should place the directory search directly after categories.');
assert.match(source, /limit: '36'/,
  'An empty featured endpoint should backfill from the enriched public camera catalogue.');
assert.match(source, /\/catalog\/random/,
  'The documented random public-camera endpoint should be the last-resort fallback.');
assert.match(source, /function discoveryImage\(name\)/);
assert.match(source, /\.le-sfv--live-cams \[hidden\]\{display:none!important\}/,
  'Hidden state must win against component display styles, especially the featured LIVE badge.');
assert.match(source, /heroBadge\.hidden = true/,
  'A scenic fallback or failed image must never retain a LIVE WINDOW badge.');
assert.match(source, /shell\.remove\(\);/,
  'A broken camera card must be removed rather than replaced with decorative art under a live label.');
assert.match(source, /image: 'night-skies' \}/,
  'The Antarctica tile must not reuse the Europe mountain photograph.');
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
assert.match(source, /zoom: '11', cluster: 'auto'/,
  'Spatial recovery must request camera-level map detail instead of low-zoom count bubbles.');
assert.match(source, /Array\.isArray\(mapPayload\?\.clusters\)/,
  'Spatial recovery must handle clustered map responses as well as individual items.');
assert.match(source, /HTTP 200 \+ an empty\/unusable page/,
  'Successful empty catalogue responses must trigger spatial recovery.');
assert.match(source, /become neutral unavailable cards/,
  'Free live directory rows without an image or link must remain visible but neutral.');
assert.match(source, /\/catalog\/\$\{encodeURIComponent\(id\)\}/);
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
  const randomCamera = {
    ...camera, id: 'stream_test_02', title: 'Lake panorama', category: 'surf', last_frame_age_s: 45,
    view: { render: 'image', url: 'https://images.example.test/lake.webp' }
  };
  const publisherOnlyCamera = {
    id: 'stream_test_03', title: 'Harbour entrance camera', city: 'Bergen', country: 'Norway', category: 'port',
    live: true, is_free: true, last_frame_age_s: 80,
    view: { render: 'link', url: 'https://publisher.example.test/harbour-live' },
    redistribution: { preview_embed: false }
  };
  const unavailableCamera = {
    id: 'stream_test_04', title: 'Cape observation camera', city: 'Cape Town', country: 'South Africa', category: 'city',
    live: true, is_free: true, last_frame_age_s: 70,
    view: { render: 'none', url_type: 'none' },
    redistribution: { preview_embed: false }
  };
  const fetchStub = async (url) => {
    requestLog.push(String(url));
    const value = String(url);
    let payload = { items: [] };
    let status = 200;
    if (value.includes('/catalog/featured')) payload = { items: [] };
    else if (value.includes('/catalog/categories')) payload = { items: [{ category: 'wildlife', count: 466 }] };
    else if (value.includes('/catalog?limit=36&sort=fresh')) payload = { items: [publisherOnlyCamera] };
    else if (value.includes('/catalog/random')) payload = randomCamera;
    else if (value.includes('/catalog?bbox=') && value.includes('-25%2C34%2C60%2C72')) status = 500;
    else if (value.includes('/catalog?bbox=') && (value.includes('60%2C-10%2C180%2C85') || value.includes('-20%2C-35%2C55%2C38'))) payload = { items: [] };
    else if (value.includes('/catalog?bbox=')) payload = { items: [camera] };
    else if (value.includes('/catalog/map?') && value.includes('60%2C-10%2C180%2C85')) payload = { mode: 'clusters', clusters: [{ id: camera.id, count: 12, free: 10 }], total: 12 };
    else if (value.includes('/catalog/map?') && value.includes('-20%2C-35%2C55%2C38')) payload = { mode: 'clusters', clusters: [{ id: unavailableCamera.id, count: 5, free: 5 }], total: 5 };
    else if (value.includes('/catalog/map?')) payload = { mode: 'items', items: [{ id: camera.id }], total: 1 };
    else if (value.includes(`/catalog/${camera.id}`)) payload = { item: camera };
    else if (value.includes(`/catalog/${publisherOnlyCamera.id}`)) payload = { item: publisherOnlyCamera };
    else if (value.includes(`/catalog/${unavailableCamera.id}`)) payload = { item: unavailableCamera };
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
  await wait(15);
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
  assert.ok(requestLog.some(url => url.includes('/catalog?limit=36&sort=fresh') && !url.includes('embeddable=1')),
    'An empty curated featured response should trigger a broad catalogue backfill that includes publisher-view cameras.');
  assert.ok(requestLog.some(url => url.includes('/catalog/random')),
    'A sparse backfill should trigger the documented random camera fallback.');
  assert.equal(findAll(body, 'le-lc-badge')[0]?.hidden, false,
    'The featured hero badge should be visible for a verified camera preview.');
  assert.equal(findAll(body, 'le-lc-hero-dots').length, 1,
    'The hero carousel control row should be present.');
  assert.equal(findAll(body, 'le-lc-card').length, 1,
    'A publisher-view camera should remain available in the Featured Windows rail beside the image hero.');
  assert.ok(findAll(body, 'le-lc-badge').some(node => (node.children || []).some(child => child.textContent === 'OPEN SOURCE')),
    'Publisher-only cards must be identified as source links rather than false live image previews.');
  const sourceCard = findAll(body, 'le-lc-card')[0];
  const sourceArtwork = findAll(sourceCard, 'le-lc-card-image')[0];
  assert.ok(String(sourceArtwork?.src || '').endsWith('.jpg'),
    'Publisher-only records must use local directory artwork, never the publisher URL as an image source.');
  assert.notEqual(sourceArtwork?.src, 'https://publisher.example.test/harbour-live');
  for (const listener of sourceCard.listeners.get('click') || []) listener();
  const detailsModal = findAll(mountedRoot, 'le-lc-modal')[0];
  assert.equal(detailsModal.hidden, false, 'Publisher-only camera details must open.');
  const modalImage = findAll(detailsModal, 'le-lc-modal-image')[0];
  assert.equal(modalImage.hidden, true, 'Publisher-only records must not be rendered as camera images.');
  const publisherAction = findAll(detailsModal, 'le-lc-modal-actions')[0]?.children?.[0];
  assert.equal(publisherAction?.href, 'https://publisher.example.test/harbour-live',
    'Publisher-only details must provide the documented HTTPS camera destination.');
  assert.equal(findAll(body, 'le-lc-results').length, 1,
    'The search-results grid should exist but remain collapsed on the landing screen.');
  assert.equal(findAll(body, 'le-lc-results')[0].hidden, true,
    'The home screen should not show a second full catalogue below the search field.');
  assert.equal(findAll(body, 'le-lc-state')[0]?.hidden, true,
    'A successful home load should not leave a bulky status panel in the editorial layout.');

  // Region click: the strict preferred query and its reduced variant return 500;
  // the plain documented catalogue request is then retried and returns a photo.
  for (const listener of regionTile.listeners.get('click') || []) listener();
  await wait(20);
  assert.ok(requestLog.some(url => url.includes('/catalog?bbox=') && url.includes('sort=fresh')));
  assert.ok(requestLog.some(url => url.includes('/catalog?bbox=') && !url.includes('embeddable=1') && !url.includes('sort=fresh')),
    'Region browsing must retry without optional filters while still accepting source-only camera records.');
  const resultCards = findAll(body, 'le-lc-card');
  assert.ok(resultCards.length > 0, 'A successful fallback response should render camera cards.');

  assert.ok(requestLog.some(url => url.includes('/catalog/map?') && url.includes('zoom=11') && url.includes('cluster=auto') && url.includes('60%2C-10%2C180%2C85')),
    'An HTTP 200 empty regional catalogue page must trigger a zoom-11 map recovery request.');
  assert.ok(requestLog.some(url => url.includes(`/catalog/${camera.id}`)),
    'Cluster representative IDs must be resolved into enriched camera records.');

  // Africa reproduces the user's screenshot: a successful but empty catalogue
  // page, followed by a clustered map response. The returned record must surface.
  const africaTile = regionTiles[2];
  for (const listener of africaTile.listeners.get('click') || []) listener();
  await wait(25);
  assert.ok(requestLog.some(url => url.includes('/catalog/map?') && url.includes('-20%2C-35%2C55%2C38') && url.includes('zoom=11')),
    'The Africa empty-result path must call the high-zoom map endpoint.');
  assert.ok(requestLog.some(url => url.includes(`/catalog/${unavailableCamera.id}`)),
    'Africa cluster IDs must be resolved through the enriched detail endpoint.');
  const unavailableCard = findAll(body, 'le-lc-card').find(card => card.attributes['aria-label']?.includes('Cape observation camera'));
  assert.ok(unavailableCard, 'A current free camera with render:none should remain visible in the results.');
  assert.equal(unavailableCard.disabled, true,
    'A camera with no permitted preview and no publisher URL must be a neutral, non-clickable card.');
  assert.ok(findAll(unavailableCard, 'le-lc-badge').some(node => node.children.some(child => child.textContent === 'PREVIEW UNAVAILABLE')),
    'The no-preview record must be clearly labelled as unavailable, not live.');

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
  assert.ok(requestLog.some(url => url.includes('/catalog?category=wildlife') && !url.includes('embeddable=1')),
    'Category tiles must query the enriched directory without suppressing publisher-view records.');
  assert.ok(findAll(body, 'le-lc-card').length > 0, 'Category results should render camera cards.');

  registered.deactivate();
  assert.equal(rootRemoved, true, 'Closing Live Cams must remove its stage root.');
  assert.equal(intervalCleared, true, 'Closing Live Cams must stop the refresh timer.');
  assert.equal(timeoutCleared, true, 'Request timeouts must be cleared.');
  registered.deactivate();
  assert.equal(rootRemoved, true, 'Repeated close remains safe.');
}

exerciseLifecycleAndDirectoryFallback().then(() => {
  console.log('Live Cams empty-result recovery, clustered map resolution, unavailable-camera state, publisher-link, preview-permission and lifecycle tests passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
