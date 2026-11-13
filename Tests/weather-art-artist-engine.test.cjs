'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Weather/Art/live-art-online.js'), 'utf8');
const clear = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/clear-valley-artist-001.json'), 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/art-library.json'), 'utf8'));
const direction = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/ART-DIRECTION.json'), 'utf8'));
const guide = fs.readFileSync(path.join(root, 'Weather/Art/LIVE-ART-PRODUCTION-GUIDE.md'), 'utf8');

const rainPath = path.join(root, 'Weather/Art/rainy-tea-afternoon-001.json');
const rain = fs.existsSync(rainPath)
  ? JSON.parse(fs.readFileSync(rainPath, 'utf8'))
  : {
      schemaVersion: 1, renderMode: 'ordered-ink-wash-paths', id: 'rain-v1-fixture',
      title: 'Rain fixture', palette: ['#211d19'], durationMs: 22000,
      paths: Array.from({ length: 20 }, () => [0, Buffer.from([0, 0, 2, 2, 2, 2]).toString('base64')])
    };

const calls = { fill: 0, stroke: 0, drawImage: 0 };
const rafQueue = [];
function context() {
  return {
    globalAlpha: 1, globalCompositeOperation: 'source-over', lineWidth: 1,
    save() {}, restore() {}, setTransform() {}, clearRect() {}, fillRect() {},
    beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
    stroke() { calls.stroke++; }, fill() { calls.fill++; },
    drawImage() { calls.drawImage++; },
    createLinearGradient() { return { addColorStop() {} }; }
  };
}
function fakeCanvas() {
  return {
    width: 0, height: 0, isConnected: true, className: '',
    getBoundingClientRect() { return { width: 600, height: 420 }; },
    getContext() { return context(); }, setAttribute() {}, replaceWith() {}, dataset: {}
  };
}
const document = {
  hidden: false, documentElement: {}, addEventListener() {}, removeEventListener() {},
  querySelector() { return null; }, getElementById() { return null; },
  createElement() { return fakeCanvas(); }
};
class MutationObserver { observe() {} disconnect() {} }
const window = {
  __liveEarthWeatherArtOnlineInstalled: false,
  __LIVE_EARTH_WEATHER_ART_TEST__: true,
  devicePixelRatio: 1, addEventListener() {}, removeEventListener() {},
  matchMedia() { return { matches: false }; }
};
const sandbox = {
  window, document, navigator: { onLine: true }, MutationObserver,
  console, URL, AbortController, atob: global.atob,
  performance: { now: () => 0 },
  requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame() {}, ResizeObserver: undefined
};
vm.runInNewContext(source, sandbox, { timeout: 5000 });
const api = window.__LIVE_EARTH_WEATHER_ART_TEST_API__;
assert.ok(api, 'The existing Rain renderer test API is available.');

// Clear must use exactly the same schema-v1 renderer path as Rain.
assert.equal(clear.schemaVersion, 1);
assert.equal(clear.renderMode, 'ordered-ink-wash-paths');
assert.equal(clear.id, 'clear-valley-artist-001');
assert.equal(clear.durationMs, 30000);
assert.equal(clear.paths.length, 100);
assert.equal(clear.paintingPlan.strokeCount, 100);
assert.ok(clear.paths.every(path => Array.isArray(path) && path.length === 2));
assert.ok(clear.paths.every(([colorIndex, encoded]) =>
  Number.isInteger(colorIndex) && colorIndex >= 0 && colorIndex < clear.palette.length && typeof encoded === 'string'));
const planned = clear.paintingPlan.stages;
assert.deepEqual(planned.map(stage => [stage.from, stage.to]), [
  [1, 20], [21, 35], [36, 50], [51, 65], [66, 85], [86, 90], [91, 100]
]);
assert.equal(planned[0].title, 'House / pavilion — thick structural strokes');
assert.equal(planned[1].title, 'Tree — thick trunk and main branches');
assert.equal(planned[2].title, 'Tree — thin branches and tapered twigs');
assert.equal(planned[6].title, 'Sun — final subject, painted last');
assert.equal(clear.paintingPlan.renderer, 'Rain schema-v1 ordered ink-wash paths');

const prepared = api.prepareArtwork(clear);
assert.equal(prepared.rendererVersion, 1);
assert.equal(prepared.id, clear.id);
assert.equal(prepared.paths.length, 100);
assert.ok(prepared.paths.every(path => path.points.length >= 3));
assert.ok(prepared.paths.flatMap(path => path.points).every(([x, y]) =>
  x >= 0 && x <= 1 && y >= 0 && y <= 1));

// Exercise the actual existing Rain renderer with Clear: 0%, 25%, 50%, 75%, 100%.
const clearProgress = [];
const clearRenderer = api.createRenderer(fakeCanvas(), prepared, meta => clearProgress.push(meta));
clearRenderer.replay();
assert.equal(clearProgress.at(-1).count, 0, 'Replay begins before the first path.');
for (const [time, expected] of [[7500, 25], [15000, 50], [22500, 75], [30000, 100]]) {
  const frame = rafQueue.shift();
  assert.equal(typeof frame, 'function', 'Replay schedules the next frame.');
  frame(time);
  assert.equal(clearProgress.at(-1).count, expected, `Progress reaches ${expected}/100.`);
  assert.equal(clearProgress.at(-1).total, 100);
}
assert.equal(clearProgress.at(-1).complete, true, 'Clear completes at 100/100.');
clearRenderer.stop();
assert.ok(calls.fill >= 100, 'The Rain renderer fills the completed Clear paths.');
assert.ok(calls.stroke > 0, 'The Rain renderer traces partial path outlines.');
assert.ok(calls.drawImage > 0, 'The Rain renderer rebuilds the visible canvas from its retained drawing surface.');

// Confirm Rain's source record still validates through renderer v1.
const rainPrepared = api.prepareArtwork(rain);
assert.equal(rainPrepared.rendererVersion, 1);
assert.ok(rainPrepared.paths.length >= 20);
const rainProgress = [];
const rainRenderer = api.createRenderer(fakeCanvas(), rainPrepared, meta => rainProgress.push(meta));
rainRenderer.replay();
const rainFrame = rafQueue.shift();
assert.equal(typeof rainFrame, 'function');
rainFrame(22000);
assert.equal(rainProgress.at(-1).complete, true, 'Rain schema-v1 fixture completes normally.');
rainRenderer.stop();

// Catalogue routing must select the same renderer for both Clear and Rain.
const clearRecord = catalogue.artworks.find(item => item.weather.includes('clear'));
const rainRecord = catalogue.artworks.find(item => item.weather.includes('rain'));
assert.equal(clearRecord.id, clear.id);
assert.equal(clearRecord.rendererVersion, 1);
assert.equal(clearRecord.renderMode, 'ordered-ink-wash-paths');
assert.equal(clearRecord.pathCount, 100);
assert.equal(rainRecord.id, 'rainy-tea-afternoon-001');
assert.equal(rainRecord.rendererVersion, 1);
assert.equal(rainRecord.renderMode, 'ordered-ink-wash-paths');
assert.equal(direction.activeClearArtwork.pathCount, 100);
assert.equal(direction.activeClearArtwork.sunIsFinalSubject, true);
assert.equal(direction.rendererCharacteristics.usesExistingRainRenderer, true);
assert.match(guide, /same schema-v1 `ordered-ink-wash-paths` renderer as Rain/);
assert.match(guide, /does not simulate dynamic pressure/);

// Retired score formats must not accidentally be registered as active Clear.
assert.throws(() => api.prepareArtwork({ schemaVersion: 2, renderMode: 'ordered-pressure-strokes', palette: ['#000000'] }), /Unsupported artwork version/);
assert.throws(() => api.prepareArtwork({ schemaVersion: 3, renderMode: 'ordered-master-brush-reveal', palette: ['#000000'] }), /Unsupported artwork version/);

console.log('PASS: Clear is schema v1 and contains exactly 100 ordered path strokes.');
console.log('PASS: the existing Rain renderer draws Clear progressively and completes at 100/100.');
console.log('PASS: the same schema-v1 renderer continues to accept and complete Rain.');
console.log('PASS: catalogue, direction and production guide consistently select Rain renderer v1 for Clear.');
