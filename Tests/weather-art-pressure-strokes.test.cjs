const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Weather/Art/live-art-online.js'), 'utf8');
const clear = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/clear-maple-pavilion-002.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/art-library.json'), 'utf8'));
const strokeIndex = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/Plans/clear-maple-pavilion-002-stroke-intent.json'), 'utf8'));

const drawCalls = { fill: 0, stroke: 0, drawImage: 0 };
function makeContext() {
  return {
    setTransform() {}, clearRect() {}, fillRect() {}, save() {}, restore() {},
    beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
    fill() { drawCalls.fill++; }, stroke() { drawCalls.stroke++; },
    drawImage() { drawCalls.drawImage++; },
    createLinearGradient() { return { addColorStop() {} }; }
  };
}
const rafQueue = [];
const doc = {
  documentElement: {}, hidden: false,
  querySelector() { return null; }, getElementById() { return null; },
  addEventListener() {}, removeEventListener() {},
  createElement() { return { width: 0, height: 0, getContext() { return makeContext(); }, style: {}, dataset: {}, setAttribute() {} }; }
};
class MutationObserver { observe() {} disconnect() {} }
const win = {
  __liveEarthWeatherArtOnlineInstalled: false,
  __LIVE_EARTH_WEATHER_ART_TEST__: true,
  devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {},
  matchMedia() { return { matches: false }; }
};
const sandbox = {
  window: win, document: doc, navigator: { onLine: false }, MutationObserver,
  console, URL, AbortController, atob: global.atob, performance: { now: () => 0 },
  requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame() {}, ResizeObserver: undefined
};
vm.runInNewContext(source, sandbox, { timeout: 3000 });
const api = win.__LIVE_EARTH_WEATHER_ART_TEST_API__;
assert.ok(api, 'Test API is available only under the explicit test flag');

const prepared = api.prepareArtwork(clear);
assert.equal(prepared.rendererVersion, 2);
assert.equal(prepared.id, 'clear-maple-pavilion-002');
assert.equal(prepared.strokes.length, 63);
assert.equal(prepared.durationMs, 75000);
assert.equal(prepared.strokes[0].order, 1);
assert.equal(prepared.strokes[62].order, 63);
assert.equal(strokeIndex.renderReady, true);
assert.equal(strokeIndex.strokeCount, 63);
assert.equal(strokeIndex.runtimeAssetPath, 'Weather/Art/clear-maple-pavilion-002.json');
assert.ok(prepared.strokes.every(s => s.samples.length >= 7 && s.length > 0));
assert.ok(prepared.strokes.every(s => s.samples.every(p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 && p.pressure > 0 && p.pressure <= 1)));

const rainV1 = { schemaVersion: 1, renderMode: 'ordered-ink-wash-paths', id: 'rain-v1', title: 'Rain',
  palette: ['#211d19'], durationMs: 22000,
  paths: Array.from({ length: 20 }, () => [0, Buffer.from([0,0,2,2,2,2]).toString('base64')]) };
const legacy = api.prepareArtwork(rainV1);
assert.equal(legacy.rendererVersion, 1);
assert.equal(legacy.paths.length, 20);

// Exercise the actual v2 pressure-ribbon renderer, not just its JSON parser.
const canvas = { width: 0, height: 0, isConnected: true,
  getBoundingClientRect() { return { width: 600, height: 420 }; },
  getContext() { return makeContext(); } };
const progressEvents = [];
const renderer = api.createRenderer(canvas, prepared, meta => progressEvents.push(meta));
renderer.replay();
assert.equal(progressEvents.at(-1).count, 0, 'Replay begins before the first gesture');
assert.ok(rafQueue.length > 0, 'Replay schedules animation frames');
rafQueue.shift()(37500);
assert.ok(progressEvents.at(-1).count > 0 && progressEvents.at(-1).count < 63, 'Midpoint reports a partial painting');
while (rafQueue.length) rafQueue.shift()(75000);
assert.equal(progressEvents.at(-1).count, 63);
assert.equal(progressEvents.at(-1).complete, true, 'Replay reaches a terminal FINISHED state');
assert.ok(drawCalls.fill >= 63, 'Renderer paints the pressure ribbons into the canvas');
renderer.stop();

// Confirm the legacy v1 painter still completes and remains selectable.
const legacyProgress = [];
const legacyCanvas = { width: 0, height: 0, isConnected: true,
  getBoundingClientRect() { return { width: 600, height: 420 }; },
  getContext() { return makeContext(); } };
const legacyRenderer = api.createRenderer(legacyCanvas, legacy, meta => legacyProgress.push(meta));
legacyRenderer.replay();
assert.ok(rafQueue.length > 0, 'Legacy artwork still schedules Replay');
rafQueue.shift()(22000);
assert.equal(legacyProgress.at(-1).complete, true, 'Legacy v1 renderer still completes normally');
legacyRenderer.stop();

const bad = JSON.parse(JSON.stringify(clear));
bad.strokes[0].points[0][2] = 1.5;
assert.throws(() => api.prepareArtwork(bad), /outside its normalized range/);
const wrongOrder = JSON.parse(JSON.stringify(clear));
wrongOrder.strokes[0].order = 2;
assert.throws(() => api.prepareArtwork(wrongOrder), /authored array order/);

const activeClear = catalog.artworks.find(item => item.weather.includes('clear'));
const activeRain = catalog.artworks.find(item => item.weather.includes('rain'));
assert.equal(activeClear.id, 'clear-maple-pavilion-002');
assert.equal(activeClear.renderMode, 'ordered-pressure-strokes');
assert.equal(activeRain.id, 'rainy-tea-afternoon-001');
assert.equal(activeRain.renderMode, 'ordered-ink-wash-paths');
assert.equal(catalog.productionStandard.guideAddendumPath, 'Weather/Art/LIVE-ART-PRODUCTION-GUIDE-ADDENDUM-2.3.md');

console.log('PASS: 63 schema-v2 Clear gestures validate with pressure, order and duration.');
console.log('PASS: schema-v2 renderer draws and completes all 63 authored gestures.');
console.log('PASS: schema-v1 Rain renderer still paints and completes legacy records.');
console.log('PASS: invalid pressure and out-of-order strokes are rejected.');
console.log('PASS: catalogue routes Clear to v2 and keeps Rain on v1.');
