const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

const contracts = [
  ['shared Stacks registration', /runtime\.registerFeature\('weather',activateWeather\)/],
  ['full-screen Canvas surface', /screen\.className = 'le-weather-world'/],
  ['Open-Meteo current and daily data', /https:\/\/api\.open-meteo\.com\/v1\/forecast/],
  ['explicit fresh-location permission gate', /window\.liveEarthLocationAllowed\?\.\(\)!==true/],
  ['shared approved location accessor', /globe\(\)\?\.getLocation\?\.\(\)/],
  ['network-only request', /credentials:'omit',cache:'no-store',signal:controller\.signal/],
  ['bounded request timeout', /setTimeout\(\(\)=>controller\.abort\(\),16000\)/],
  ['stale response rejection', /serial!==requestSerial/],
  ['15-minute refresh', /const REFRESH_MS = 15 \* 60 \* 1000/],
  ['clearly labelled sample values', /SAMPLE VALUES, NOT A LIVE FORECAST/],
  ['offline sample state', /OFFLINE · sample scene, not live conditions\./],
  ['reduced-motion support', /prefers-reduced-motion: reduce/],
  ['animation frame throttle', /if\(now-last>=42\)/],
  ['animation and observer cleanup', /cancelAnimationFrame\(raf\)/],
  ['feature-close cleanup', /atmosphere\?\.stop\(\)/],
  ['dock observer cleanup', /dockObserver\?\.disconnect\(\)/]
];

for (const [name, pattern] of contracts) {
  assert.match(source, pattern, `Missing current Weather contract: ${name}`);
}

assert.doesNotMatch(source, /navigator\.geolocation|getCurrentPosition|watchPosition/,
  'Weather must not request browser geolocation.');
assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB)\b/,
  'Weather must not write to browser storage.');
assert.doesNotMatch(source, /JAPANESE_ART_LIBRARY|aspect-ratio:10 \/ 7|le-weather-hourly/,
  'Superseded Live Art and hourly-card layout must not return.');
assert.doesNotMatch(source, /#le-feature-dock\s*\{|dock\.style\./,
  'Weather may measure the shared dock but must not restyle it.');

console.log(`Current Weather feature contracts passed (${contracts.length} positive checks plus privacy and regression guards).`);
