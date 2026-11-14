const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const featureFiles = [
  ['clouds', 'Clouds/clouds-view.js'],
  ['weather', 'Weather/weather-view.js'],
  ['traffic', 'Traffic/traffic-view.js'],
  ['earthquakes', 'Earthquakes/earthquakes-view.js']
];
for (const [id, file] of featureFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `${id} folder must contain its view module`);
  const source = read(file);
  assert.ok(source.includes(`runtime.registerFeature('${id}'`), `${id} must register through the shared Stacks runtime`);
  assert.ok(source.includes('return () =>'), `${id} must provide deactivation cleanup`);
  assert.ok(!/button\(['"](?:Close|Back|Exit)/i.test(source), `${id} must not introduce a separate close button`);
}

const stacks = read('Stacks/stacks-feature-views.js');
assert.ok(stacks.includes('window.LiveEarthStacksFeatureRuntime = Object.freeze'), 'Shared feature runtime must be exposed before child modules load');
assert.ok(stacks.includes("new URL(path, document.baseURI).href"), 'Feature modules must load from root-relative paths');
assert.ok(stacks.includes("registerFeature('elevation', activateElevation)"), 'Elevation must remain in the shared Stacks module');
assert.ok(stacks.includes("new URL('./Stacks/stacks-feature-views.js', document.baseURI).href"), 'Registry-ready retry must use the reorganized Stacks path');
assert.ok(stacks.includes('position:absolute;inset:0;transform:none;width:100%;max-width:none'), 'Dedicated views must occupy the complete feature stage');
assert.ok(stacks.includes('.le-sfv--elevation .le-sfv-panel{position:absolute;left:50%'), 'Elevation must retain its compact panel layout');
assert.ok(stacks.includes("window.__liveEarthStacksFeatureViewsInstalled = true"), 'Readiness flag must be set after feature module registration');

const expectedRegistrationOrder = [
  "{ id: 'clouds', path: './Clouds/clouds-view.js' }",
  "{ id: 'weather', path: './Weather/weather-view.js' }",
  "{ id: 'earthquakes', path: './Earthquakes/earthquakes-view.js' }",
  "{ id: 'traffic', path: './Traffic/traffic-view.js' }"
];
let previous = -1;
for (const item of expectedRegistrationOrder) {
  const at = stacks.indexOf(item);
  assert.ok(at > previous, `Module loader order must preserve the original feature catalog: ${item}`);
  previous = at;
}
assert.ok(stacks.includes('if (index === 2) registerFeature(\'elevation\', activateElevation);'), 'Elevation must be registered between Weather and Earthquakes to preserve Orb scatter order');

const weather = read('Weather/weather-view.js');
assert.ok(weather.includes('liveEarthLocationAllowed'), 'Weather must respect the existing Location permission state');
assert.ok(weather.includes('Open-Meteo'), 'Weather must retain the real Open-Meteo source');
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must never request device location itself');

const clouds = read('Clouds/clouds-view.js');
assert.ok(clouds.includes('MODIS_Terra_Cloud_Fraction_Day'), 'Clouds must retain the real NASA cloud fraction layer');
assert.ok(read('Stacks/stacks-feature-views.js').includes('gibs.earthdata.nasa.gov'), 'Shared imagery helper must retain the NASA GIBS endpoint');

const quakes = read('Earthquakes/earthquakes-view.js');
assert.ok(quakes.includes('earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'), 'Earthquakes must retain the official USGS latest-day feed');
assert.ok(quakes.includes("attachLayer('earthquakes'"), 'Earthquake markers must attach to the existing shared Earth layer host');

const traffic = read('Traffic/traffic-view.js');
assert.ok(traffic.includes('source remains pending'), 'Traffic must remain transparent about the unconnected feed');
assert.ok(!/fetch\s*\(/.test(traffic), 'Traffic preview must not call an unapproved traffic endpoint');

const registry = read('Global/view-module-registry.js');
assert.ok(registry.includes('active feature toggle') && registry.includes('[active feature toggle] [Location toggle] [Stacks library]'), 'Global three-Orb contract must remain in the registry');
assert.ok(registry.includes('dock.append(featureButton, locationButton, stacksButton)'), 'Feature dock must remain exactly three Orbs');
assert.ok(registry.includes('featureButton.addEventListener("click", () => closeActiveFeature("orb-toggle"))'), 'Tapping the active feature Orb must remain the close action');

const sw = read('sw.js');
const manager = read('Global/update-manager.js');
const build = sw.match(/const BUILD_ID = "([^"]+)"/);
assert.ok(build, 'Service worker must declare a build id');
assert.ok(manager.includes(`const BUILD_ID = "${build[1]}"`), 'Service worker and update manager build ids must match');
for (const [, file] of featureFiles) {
  assert.ok(sw.includes(`"./${file}"`), `${file} must be in the essential offline shell`);
  assert.ok(sw.includes(`'./${file}'`), `${file} must be included in startup script recovery paths`);
}

console.log('Stacks feature-folder and Global three-Orb contract tests passed.');

(async () => {
  const vm = require('node:vm');
  const registered = [];
  const windowMock = {
    LiveEarthFeatureViews: {
      register(id, config) { registered.push({ id, config }); }
    },
    addEventListener() {},
    dispatchEvent() {}
  };
  const documentMock = {
    baseURI: 'https://live-earth.test/index.html',
    head: {
      appendChild(node) {
        if (!node.src) return;
        const url = new URL(node.src);
        const relative = url.pathname.replace(/^\//, '');
        try {
          vm.runInContext(read(relative), context, { filename: relative });
          node.onload?.();
        } catch (error) {
          node.onerror?.(error);
        }
      }
    },
    documentElement: { appendChild(node) { documentMock.head.appendChild(node); } },
    createElement(tag) { return { tagName: String(tag).toUpperCase(), setAttribute() {} }; }
  };
  class EventMock { constructor(type) { this.type = type; } }
  const context = vm.createContext({
    window: windowMock,
    document: documentMock,
    URL,
    Event: EventMock,
    console,
    navigator: { onLine: true },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    AbortController,
    fetch: async () => { throw new Error('Unexpected test fetch'); }
  });
  vm.runInContext(stacks, context, { filename: 'Stacks/stacks-feature-views.js' });
  for (let attempt = 0; attempt < 20 && !windowMock.__liveEarthStacksFeatureViewsInstalled; attempt++) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(windowMock.__liveEarthStacksFeatureViewsInstalled, true, 'Feature runtime must finish loading all modules');
  assert.deepEqual(
    registered.map(item => item.id),
    ['clouds', 'weather', 'elevation', 'earthquakes', 'traffic', 'live-cams'],
    'All feature modules must register in the original order, with Live Cams added after Traffic'
  );
  assert.equal(registered[0].config.connected, true);
  assert.equal(registered[4].config.connected, false, 'Traffic must remain a preview until a verified source is connected');
  assert.equal(registered[5].config.connected, true, 'Live Cams must be registered as the independent Engine view');
  console.log('Stacks feature runtime registration-order test passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
