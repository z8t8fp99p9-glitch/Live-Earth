'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Weather/Art/live-art-online.js'), 'utf8');
const clearPath = path.join(root, 'Weather/Art/clear-valley-artist-001.json');
const clear = JSON.parse(fs.readFileSync(clearPath, 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/art-library.json'), 'utf8'));
const direction = JSON.parse(fs.readFileSync(path.join(root, 'Weather/Art/ART-DIRECTION.json'), 'utf8'));
const guide = fs.readFileSync(path.join(root, 'Weather/Art/LIVE-ART-PRODUCTION-GUIDE.md'), 'utf8');

const rainBytes = Buffer.from([200,1,200,1,200,1,0,0,200,1,199,1,0]).toString('base64');
const rain = {
  schemaVersion: 1, renderMode: 'ordered-ink-wash-paths', id: 'rain-regression', title: 'Rain',
  caption: 'Rain', durationMs: 22000, palette: ['#211d19'],
  paths: Array.from({ length: 20 }, () => [0, rainBytes])
};
const calls = { stroke: 0, fill: 0, drawImage: 0, fillRect: 0 };
const rafQueue = [];
function context() {
  return {
    globalAlpha: 1, globalCompositeOperation: 'source-over', lineWidth: 1,
    save() {}, restore() {}, setTransform() {}, translate() {}, rotate() {}, clearRect() {},
    fillRect() { calls.fillRect++; }, beginPath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, closePath() {}, stroke() { calls.stroke++; }, fill() { calls.fill++; },
    arc() {}, ellipse() {}, drawImage() { calls.drawImage++; },
    createLinearGradient() { return { addColorStop() {} }; },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    putImageData() {}
  };
}
function fakeCanvas() {
  return { width: 0, height: 0, isConnected: true, className: '',
    getBoundingClientRect() { return { width: 600, height: 420 }; },
    getContext() { return context(); }, setAttribute() {}, replaceWith() {}, dataset: {} };
}
const document = {
  hidden: false, documentElement: {}, head: { appendChild() {} },
  addEventListener() {}, removeEventListener() {}, querySelector() { return null; },
  getElementById() { return null; },
  createElement(tag) { return tag === 'canvas' ? fakeCanvas() : { style: {}, setAttribute() {}, appendChild() {} }; }
};
class MutationObserver { observe() {} disconnect() {} }
const window = {
  __liveEarthWeatherArtOnlineInstalled: false, __LIVE_EARTH_WEATHER_ART_TEST__: true,
  devicePixelRatio: 1, addEventListener() {}, removeEventListener() {},
  matchMedia() { return { matches: false }; }
};
const sandbox = {
  window, document, navigator: { onLine: true }, MutationObserver,
  console, URL, AbortController, atob: global.atob,
  performance: { now: () => 1000 },
  requestAnimationFrame(fn) { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame() {}, ResizeObserver: undefined
};
vm.runInNewContext(source, sandbox, { timeout: 5000 });
const api = window.__LIVE_EARTH_WEATHER_ART_TEST_API__;
assert.ok(api, 'Test API is available under the explicit test flag');

// Independent Clear score: an original 10:7 artist-authored scene, not an image-derived asset.
assert.equal(clear.schemaVersion, 4);
assert.equal(clear.renderMode, 'artist-led-pigment-painting');
assert.deepEqual(clear.canvas, [1000, 700]);
assert.equal(clear.eventCount, 80);
assert.equal(clear.events.length, 80);
assert.equal(clear.medium.sourceArtwork, null);
assert.equal(clear.medium.revealMasks, null);
assert.ok(clear.events.every((event, i) => event.order === i + 1));
assert.ok(clear.events.every(event => event.phase && event.tool && Number.isFinite(event.durationWeight)));
assert.ok(clear.events.every(event => event.kind === 'mass' ? event.region.length >= 4 : event.points.length >= 2));
assert.ok(clear.events.some(event => event.tool === 'dry'));
assert.ok(clear.events.some(event => event.tool === 'wash'));
assert.ok(clear.events.some(event => event.tool === 'calligraphy'));

const prepared = api.prepareArtwork(clear);
assert.equal(prepared.rendererVersion, 4);
assert.equal(prepared.id, 'clear-valley-artist-001');
assert.equal(prepared.events.length, 80);
assert.ok(prepared.events.every((event, i) => event.order === i + 1));
assert.ok(prepared.events.every(event => event.samples.length >= (event.kind === 'mass' ? 8 : 10) && event.length > 0));
assert.ok(prepared.events.some(event => event.kind === 'mass' && event.dabs.length >= 8));
assert.ok(prepared.events.some(event => event.tool === 'detail'));
assert.ok(Object.keys(api.BRUSHES).length >= 6, 'Distinct physical brush profiles are available');

// Actual painter replay: partial pigment deposition followed by completion.
const progress = [];
const canvas = fakeCanvas();
const renderer = api.createRenderer(canvas, prepared, meta => progress.push(meta));
renderer.replay();
assert.equal(progress.at(-1).count, 0, 'Opening frame is paper, not a completed-image reveal');
assert.ok(rafQueue.length > 0, 'Replay schedules animation frames');
rafQueue.shift()(15000);
assert.ok(progress.at(-1).count > 0 && progress.at(-1).count < 80, 'Mid-replay is an unfinished painting');
assert.ok(calls.stroke > 0, 'Individual bristle strokes are deposited');
assert.ok(calls.fill > 0, 'Granulation deposits pigment particles');
rafQueue.shift()(57000);
assert.equal(progress.at(-1).complete, true, 'Replay reaches FINISHED at the authored duration');
assert.equal(progress.at(-1).count, 80);
renderer.stop();

// Replay rebuild and deterministic manual timeline seek.
const secondProgress = [];
const secondRenderer = api.createRenderer(fakeCanvas(), prepared, meta => secondProgress.push(meta));
secondRenderer.renderAt(28000);
assert.ok(secondProgress.at(-1).count > 0 && secondProgress.at(-1).count < 80);
secondRenderer.renderAt(56000);
assert.equal(secondProgress.at(-1).complete, true);
secondRenderer.stop();

// Rain schema v1 remains supported; no edits are made to its original source record.
const rainPrepared = api.prepareArtwork(rain);
assert.equal(rainPrepared.rendererVersion, 1);
assert.equal(rainPrepared.paths.length, 20);
const rainProgress = [];
const rainRenderer = api.createRenderer(fakeCanvas(), rainPrepared, meta => rainProgress.push(meta));
rainRenderer.replay();
assert.ok(rafQueue.length > 0);
rafQueue.shift()(23000);
assert.equal(rainProgress.at(-1).complete, true, 'Rain v1 still completes');
rainRenderer.stop();

// Retired implementations must not re-enter the active renderer.
assert.throws(() => api.prepareArtwork({ schemaVersion: 2, renderMode: 'ordered-pressure-strokes', palette: ['#000000'] }), /Unsupported artwork version/);
assert.throws(() => api.prepareArtwork({ schemaVersion: 3, renderMode: 'ordered-master-brush-reveal', palette: ['#000000'] }), /Unsupported artwork version/);
assert.doesNotMatch(source, /createMasterRevealRenderer|masterImagePath|stageMaskAtlasPath|fetchMasterImage|ordered-master-brush-reveal|drawImage\(masterImage/);

const activeClear = catalogue.artworks.find(item => item.weather.includes('clear'));
const activeRain = catalogue.artworks.find(item => item.weather.includes('rain'));
assert.equal(activeClear.id, 'clear-valley-artist-001');
assert.equal(activeClear.rendererVersion, 4);
assert.equal(activeClear.eventCount, 80);
assert.equal(activeClear.sourceImage, null);
assert.equal(activeClear.maskAtlas, null);
assert.equal(activeRain.id, 'rainy-tea-afternoon-001');
assert.equal(activeRain.rendererVersion, 1);
assert.deepEqual(catalogue.productionStandard.rendererSupportsSchemaVersions, [1, 4]);
assert.equal(direction.rendererCompatibility.schema4, 'artist-led-pigment-painting');
assert.equal(direction.rendererCompatibility.schema3MasterReveal, false);
assert.match(guide, /The artist, not a reveal effect/);
assert.match(guide, /Rain schema-v1 regression passes unchanged/);

console.log('PASS: original schema-v4 Clear score validates: 80 ordered artist-authored events on a 10:7 canvas.');
console.log('PASS: live painter deposits bristle strokes, pigment masses and granulation progressively.');
console.log('PASS: early, middle and final states rebuild from paint events with no source image or reveal-mask path.');
console.log('PASS: Replay completes; deterministic seek/rebuild works.');
console.log('PASS: Rain schema-v1 path renderer still validates and completes.');
console.log('PASS: schema-v2 ribbons and schema-v3 master reveal are rejected by the active runtime.');
console.log('PASS: catalogue, art direction and production guide agree on the artist-led engine.');
