'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const sourceRoot = path.resolve(__dirname, '../..');
const feed = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'published/nature/live-feed.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'published/nature/catalog.json'), 'utf8'));
const engineClientSource = fs.readFileSync(path.join(sourceRoot, 'editorial-engine/universal-editorial-engine.js'), 'utf8');
const natureClientSource = fs.readFileSync(path.join(sourceRoot, 'nature-publisher-client.js'), 'utf8');
const natureControllerSource = fs.readFileSync(path.join(sourceRoot, 'nature-view-controller.js'), 'utf8');
const updateManagerSource = fs.readFileSync(path.join(sourceRoot, 'update-manager.js'), 'utf8');

(async () => {
  // The global browser contract accepts the monthly feed/catalog for viewId=nature.
  const contractWindow = { dispatchEvent() {} };
  const contractContext = {
    window: contractWindow,
    document: { baseURI: 'https://z8t8fp99p9-glitch.github.io/Live-Earth/' },
    URL, Event, CustomEvent: class CustomEvent extends Event { constructor(type, init = {}) { super(type); this.detail = init.detail; } },
    Object, Array, String, Number, Boolean, Set, Map, Math, RegExp, Error
  };
  vm.runInNewContext(engineClientSource, contractContext);
  const safeFeed = contractWindow.LiveEarthUniversalEditorialEngine.validateFeed(feed, 'nature');
  const safeCatalog = contractWindow.LiveEarthUniversalEditorialEngine.validateCatalog(catalog, 'nature');
  assert.equal(safeFeed.storyCount, 8);
  assert.equal(safeCatalog.issues.length, 1);
  assert.equal(safeCatalog.issues[0].issueId, 'nature-202610');
  assert.match(safeCatalog.issues[0].pdfUrl, /^https:\/\/raw\.githubusercontent\.com\//);

  // The view-specific Publisher client opens the validated monthly issue with the one shared reader.
  let opened = null;
  const publisherFetches = [];
  const publisherWindow = {
    LiveEarthUniversalEditorialEngine: contractWindow.LiveEarthUniversalEditorialEngine,
    LiveEarthUniversalPDFViewer: { open: async options => { opened = options; return true; }, listSaved: async () => [] },
    addEventListener() {}, dispatchEvent() {}
  };
  const publisherContext = {
    window: publisherWindow,
    document: { baseURI: 'https://z8t8fp99p9-glitch.github.io/Live-Earth/' },
    navigator: { onLine: true }, URL, Date, String, Object, Array, Promise, Error, Event,
    fetch: async (url, init) => {
      publisherFetches.push({ url: String(url), cache: init?.cache });
      return {
      ok: true,
      json: async () => String(url).includes('catalog.json') ? catalog : feed
      };
    }
  };
  vm.runInNewContext(natureClientSource, publisherContext);
  const loadedFeed = await publisherWindow.LiveEarthNaturePublisher.loadFeed();
  const loadedCatalog = await publisherWindow.LiveEarthNaturePublisher.loadCatalog();
  await publisherWindow.LiveEarthNaturePublisher.openMagazine(loadedCatalog.issues[0]);
  assert.equal(loadedFeed.storyCount, 8);
  assert.equal(loadedCatalog.issues[0].issueId, 'nature-202610');
  assert.equal(opened.viewId, 'nature');
  assert.equal(opened.returnTo, 'monthly-journal');
  assert.match(opened.url, /^https:\/\/raw\.githubusercontent\.com\//);
  assert.equal(publisherFetches.length, 2);
  assert.ok(publisherFetches.every(item => item.url.startsWith('https://raw.githubusercontent.com/') && item.cache === 'no-store'));

  // The view registers only a Stacks feature; no primary Home Orb or primary-view API is changed.
  const registrations = new Map();
  const viewWindow = {
    LiveEarthFeatureViews: {
      register(id, options) { registrations.set(id, options); return { id }; },
      open() {}, close() {}, isActive() { return false; }
    },
    addEventListener() {}, dispatchEvent() {}
  };
  vm.runInNewContext(natureControllerSource, { window: viewWindow, document: {}, URL, Promise, Object, Array, String, Number, Date, Error });
  assert.equal(viewWindow.__liveEarthNatureViewInstalled, true);
  assert.equal(registrations.has('nature'), true);
  assert.equal(registrations.get('nature').symbol, '🌿');
  assert.equal(registrations.get('nature').connected, true);
  assert.equal(typeof registrations.get('nature').activate, 'function');
  assert.equal(typeof registrations.get('nature').deactivate, 'function');

  // Updated manager loads Nature as an optional script after the Stacks registry exists.
  const managerWindow = {
    LiveEarthViewModules: { has: id => id === 'sun-procedural-renderer' },
    LiveEarthFeatureViews: { register() {} },
    addEventListener() {},
    __liveEarthNatureViewInstalled: false
  };
  const serviceWorker = { controller: null, addEventListener() {}, ready: Promise.resolve({ update: async () => {} }) };
  const managerDocument = {
    readyState: 'complete',
    baseURI: 'https://z8t8fp99p9-glitch.github.io/Live-Earth/',
    createElement: () => ({ async: false, src: '', onload: null, onerror: null }),
    head: { appendChild(script) { managerWindow.__liveEarthNatureViewInstalled = true; queueMicrotask(() => script.onload()); } }
  };
  vm.runInNewContext(updateManagerSource, {
    window: managerWindow,
    navigator: { serviceWorker, onLine: true },
    location: { protocol: 'https:' },
    document: managerDocument,
    URL, Promise, Boolean, Error, console, queueMicrotask
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(managerWindow.__liveEarthNatureViewInstalled, true);

  console.log('PASS — monthly feed/catalog contract, PDF Reader handoff, Stacks Nature registration, optional startup loader.');
})();
