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
assert.match(styles, /\.le-sfv--weather \.le-sfv-body>\.le-sfv-card:nth-of-type\(2\)>h2/, 'The timeline title and copy must not add a large text block');

assert.match(weather, /const night = hour >= 20 \|\| hour < 5;/, 'Night must follow the forecast local hour rather than is_day alone');
assert.match(weather, /const dawn = hour >= 5 && hour <= 7;/, '05:00-07:00 local forecast must be treated as dawn');
assert.doesNotMatch(weather, /number\(item\.isDay\) === 0 \|\| hour >= 20/, 'A sunrise is_day flag must not incorrectly keep 05:00 in night mode');
assert.ok(weather.includes("import('./Residents/resident-library.js')"), 'Weather must continue loading the shared Residents library');
assert.ok(weather.includes('LiveEarthResidentLibrary?.setActivity(residentHost, state)'), 'Selected forecast hour must drive resident activity');
assert.match(weather, /status\.hidden = true;[\s\S]*setStatus\(status, '', 'success'\)/, 'Successful forecast must hide the verbose status paragraph');
assert.ok(weather.includes("{ text: 'Weather data by ' }"), 'Weather attribution must be compact');
assert.ok(weather.includes("{ label: 'Open-Meteo.com', href: 'https://open-meteo.com/' }"), 'Provider must remain credited with a link');
assert.ok(weather.includes("{ label: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' }"), 'The data licence must remain credited with a link');

const styleNodes = new Map();
const fakeDocument = {
  head: { appendChild(node) { styleNodes.set(node.id, node); } },
  getElementById(id) { return styleNodes.get(id) || null; },
  createElement(tag) { return { tagName: tag.toUpperCase(), id: '', textContent: '' }; },
  createElementNS(_ns, tag) { return { tagName: tag, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, innerHTML: '' }; }
};
const sandbox = { window: {}, document: fakeDocument, console };
vm.runInNewContext(residentSource, sandbox, { filename: 'Residents/resident-library.js' });
const library = sandbox.window.LiveEarthResidentLibrary;
assert.ok(library, 'Residents API must register');
assert.equal(library.version, '1.2.0', 'The shared library version must advance after removing Weather-only layout rules');
assert.equal(library.getRoster().length, 3, 'The app must retain exactly three neighbours');
assert.ok(library.getActivityCatalog().morning, 'Morning park activity must be registered');

const markup = library.renderMarkup();
assert.equal((markup.match(/class="le-weather-person le-weather-person--/g) || []).length, 3, 'Morning scene must retain exactly three residents');
assert.equal((markup.match(/le-weather-prop--exercise/g) || []).length, 2, 'Only the first two residents should have exercise props');
assert.ok(markup.includes('le-weather-prop--butterfly'), 'The third resident must have a butterfly to chase');
const positionedAnchors = Array.from(markup.matchAll(/<g class="le-weather-person-anchor le-weather-person-anchor--(one|two|three)" transform="translate\((\d+) (\d+)\)" data-resident-id="(one|two|three)">\s*<g class="le-weather-person le-weather-person--(one|two|three)">/g));
assert.equal(positionedAnchors.length, 3, 'Each resident must have a stationary position anchor and a separate animated child');
assert.deepEqual(positionedAnchors.map(match => [match[1], match[2], match[3]]), [['one','92','116'],['two','210','122'],['three','328','116']], 'Each resident must retain its own designed scene position');
assert.match(residentSource, /\.le-weather-person--two\{animation-delay:-1\.3s\}\.le-weather-person--three\{animation-delay:-2\.4s\}/, 'Idle animation staggering must use stable resident IDs after nesting');
assert.doesNotMatch(residentSource, /\.le-sfv--weather/, 'Weather layout styles must not be owned by the reusable Residents library');

for (const weatherState of ['clear', 'cloudy']) {
  const host = { dataset: {} };
  library.setActivity(host, { mode: 'calm', phase: 'dawn', weather: weatherState });
  assert.equal(host.dataset.activity, 'morning', `Fair ${weatherState} dawn should select the park routine`);
}
for (const weatherState of ['rain', 'storm', 'snow', 'fog', 'hot']) {
  const host = { dataset: {} };
  library.setActivity(host, { mode: 'calm', phase: 'dawn', weather: weatherState });
  assert.equal(host.dataset.activity, 'calm', `Morning exercise must not override ${weatherState}`);
}
const wind = { dataset: {} };
library.setActivity(wind, { mode: 'wind', phase: 'dawn', weather: 'clear' });
assert.equal(wind.dataset.activity, 'wind', 'Wind behaviour must retain priority');
const daytime = { dataset: {} };
library.setActivity(daytime, { mode: 'calm', phase: 'day', weather: 'clear' });
assert.equal(daytime.dataset.activity, 'calm', 'Morning routine must end outside the dawn window');

assert.match(residentSource, /le-weather-person--one\{animation:le-resident-morning-jump/, 'Resident one must exercise');
assert.match(residentSource, /le-weather-person--two\{animation:le-resident-morning-stretch/, 'Resident two must stretch');
assert.match(residentSource, /le-weather-person--three\{animation:le-resident-butterfly-chase/, 'Resident three must chase the butterfly');
assert.match(residentSource, /le-resident-butterfly-flight/, 'The butterfly must flutter independently');

console.log('Weather floating overlay, local dawn classification and Residents morning activity tests passed.');
