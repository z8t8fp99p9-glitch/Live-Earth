const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

for (const token of [
  "window.addEventListener('live-earth-location-state',onLocationState)",
  "window.addEventListener('live-earth-location-stop',onLocationStop)",
  "window.addEventListener('online',onOnline)",
  "window.addEventListener('offline',onOffline)",
  "document.addEventListener('visibilitychange',onVisibility)",
  "window.removeEventListener('live-earth-location-state',onLocationState)",
  "window.removeEventListener('live-earth-location-stop',onLocationStop)",
  "window.removeEventListener('online',onOnline)",
  "window.removeEventListener('offline',onOffline)",
  "document.removeEventListener('visibilitychange',onVisibility)",
  'abortController?.abort()',
  'REFRESH_MS = 15 * 60 * 1000',
  'atmosphere?.stop()',
  'dockObserver?.disconnect()'
]) {
  assert.ok(source.includes(token), `Missing Weather lifecycle contract: ${token}`);
}

assert.ok(source.includes('window.liveEarthLocationAllowed?.()'));
assert.ok(source.includes('globe()?.getLocation?.()'));
assert.ok(!source.includes('navigator.geolocation'));
assert.ok(source.includes("selector.removeEventListener('change',onModeChange)"));

console.log('Weather Location privacy, online/offline events, request cancellation and close cleanup contracts passed.');
