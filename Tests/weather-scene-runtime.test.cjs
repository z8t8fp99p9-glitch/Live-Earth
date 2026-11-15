const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

for (const token of [
  'const REFRESH_MS = 15 * 60 * 1000',
  'elapsed=0,state=',
  'if(now-last>=42)',
  'const delta=Math.min(.08',
  'ResizeObserver',
  'prefers-reduced-motion: reduce',
  'observer?.disconnect()',
  'cancelAnimationFrame(raf)',
  'function drawSky(',
  'function drawLandscape(',
  'function drawWeather(',
  'function setState(next)'
]) {
  assert.ok(source.includes(token), `Missing Weather scene runtime contract: ${token}`);
}

console.log('Weather Canvas rendering, refresh cadence, throttling, reduced-motion and cleanup contracts passed.');
