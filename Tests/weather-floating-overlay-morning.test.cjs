const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');
const residentSource = fs.readFileSync(path.join(root, 'Residents/resident-library.js'), 'utf8');

const stylesStart = weather.indexOf('style.textContent = `');
const stylesEnd = weather.indexOf('document.head.appendChild(style)', stylesStart);
assert.ok(stylesStart >= 0 && stylesEnd > stylesStart, 'Weather must own an installable style block');
const styles = weather.slice(stylesStart, stylesEnd);
assert.match(styles, /\.le-sfv--weather \.le-sfv-panel\{[^}]*background:transparent!important/, 'Weather view must have no opaque panel background');
assert.match(styles, /\.le-sfv--weather \.le-sfv-body>\.le-sfv-card\{border:0!important;border-radius:0!important;background:transparent!important/, 'Forecast cards must float without boxed backgrounds');
assert.match(styles, /\.le-sfv--weather \.le-weather-metric\{padding:0;border:0;border-radius:0;background:none/, 'Metrics must not render as individual tiles');
assert.match(styles, /\.le-sfv--weather \.le-sfv-subtitle\{display:none!important\}/, 'The long Weather subtitle must not consume top-screen space');
assert.match(styles, /\.le-sfv--weather \.le-sfv-body>\.le-sfv-status\{[^}]*background:none/, 'Location and model status must be plain floating text');
assert.match(styles, /\.le-sfv--weather \.le-weather-hour\{flex-basis:54px/, 'Hourly forecast must be compact');
assert.match(styles, /\.le-sfv--weather>\.le-weather-resident-overlay\{[^}]*z-index:5/, 'The 3D residents must remain in the foreground overlay');

assert.match(weather, /const night = hour >= 20 \|\| hour < 5;/, 'Night must follow the forecast local hour');
assert.match(weather, /const dawn = hour >= 5 && hour <= 7;/, '05:00-07:00 local forecast must be treated as dawn');
assert.match(weather, /RESIDENT_LIBRARY_VERSION = '1\.3\.0'/, 'Weather must retain the public Residents API version');
assert.match(weather, /residentHost\.classList\.add\('le-weather-resident-overlay'\)/, 'Residents must be promoted into the dedicated foreground overlay');
assert.match(weather, /view\.root\.appendChild\(residentHost\)/, 'The resident host must be a direct child of the Weather root');
assert.match(weather, /residentHost\.dataset\.residentsMounted = 'true'/, 'Successful resident mounting must leave a testable lifecycle marker');
assert.ok(weather.includes('LiveEarthResidentLibrary?.setActivity(residentHost, state)'), 'Selected forecast hour must drive 3D resident activity');
assert.ok(weather.includes("removeEventListener('live-earth-location-state'"), 'Location listeners must be removed on deactivation');

const styleNodes = new Map();
const fakeDocument = {
  head: { appendChild(node) { styleNodes.set(node.id, node); } },
  getElementById(id) { return styleNodes.get(id) || null; },
  createElement(tag) { return { tagName: tag.toUpperCase(), id: '', textContent: '' }; }
};
const sandbox = { window: {}, document: fakeDocument, console };
vm.runInNewContext(residentSource, sandbox, { filename: 'Residents/resident-library.js' });
const library = sandbox.window.LiveEarthResidentLibrary;
assert.ok(library, 'Residents API must register');
assert.equal(library.getRoster().length, 3, 'The app must retain exactly three neighbours');
assert.equal(library.renderer, 'threejs-procedural-3d');
assert.ok(library.getActivityCatalog().morning, 'Morning park activity must be registered');

for (const weatherState of ['clear', 'cloudy']) {
  const dawn = { dataset: {} };
  library.setActivity(dawn, { mode: 'calm', phase: 'dawn', weather: weatherState });
  assert.equal(dawn.dataset.activity, 'morning');
}
for (const weatherState of ['rain', 'storm', 'snow', 'fog', 'hot']) {
  const dawn = { dataset: {} };
  library.setActivity(dawn, { mode: 'calm', phase: 'dawn', weather: weatherState });
  assert.equal(dawn.dataset.activity, 'calm');
}
console.log('Weather floating overlay, local dawn classification and 3D Residents mounting tests passed.');
