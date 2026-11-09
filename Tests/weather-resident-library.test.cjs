const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const residentsSource = read('Residents/resident-library.js');
const weatherSource = read('Weather/weather-view.js');

const styleNodes = new Map();
const fakeDocument = {
  head: { appendChild(node) { styleNodes.set(node.id, node); } },
  getElementById(id) { return styleNodes.get(id) || null; },
  createElement(tag) { return { tagName: tag.toUpperCase(), id: '', textContent: '' }; },
  createElementNS(_namespace, tag) {
    return {
      tagName: tag,
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      innerHTML: ''
    };
  }
};
const sandbox = { window: {}, document: fakeDocument, console };
vm.runInNewContext(residentsSource, sandbox, { filename: 'Residents/resident-library.js' });
const library = sandbox.window.LiveEarthResidentLibrary;

assert.ok(library, 'The shared Residents API must register on window');

assert.equal(library.version, '1.3.0');

const staleWindow = { LiveEarthResidentLibrary: { version: '1.2.0', mount() {} } };
vm.runInNewContext(residentsSource, { window: staleWindow }, { filename: 'Residents/resident-library.js' });
assert.equal(staleWindow.LiveEarthResidentLibrary.version, '1.3.0', 'A newer library must replace a stale global already present in the WebView');

const roster = library.getRoster();
assert.equal(roster.length, 3, 'The permanent cast must contain exactly three residents');
assert.deepEqual(Array.from(roster, person => person.id), ['one', 'two', 'three']);
assert.equal(new Set(Array.from(roster, person => person.displayName)).size, 3, 'Each resident must have a distinct stable identity');
assert.deepEqual(Array.from(roster, person => person.displayName), ['Red Hoodie Boy', 'Little Lady', 'Blue Jacket Boy']);
assert.ok(roster.every(person => person.asset && person.asset.endsWith('.webp')), 'Every resident must use an optimized WebP character asset');
assert.ok(roster.every(person => person.signature), 'Each resident must have a stable identifying visual detail');

const activities = library.getActivityCatalog();
for (const activity of ['calm', 'morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
  assert.ok(activities[activity], `The shared activity catalogue must include ${activity}`);
}
assert.equal(activities.festival.stage, 'shared-library', 'Festival is a host-selected activity, not an automatic Weather state');

const markup = library.renderMarkup();
assert.equal((markup.match(/class="le-weather-person le-weather-person--/g) || []).length, 3, 'SVG markup must render exactly three residents');
assert.equal((markup.match(/<image class="le-weather-character-art"/g) || []).length, 3, 'Each resident must render one image-backed character sprite');
for (const asset of ['resident-red-hoodie-boy.webp', 'resident-little-lady.webp', 'resident-blue-jacket-boy.webp']) {
  assert.ok(markup.includes(asset), `The roster must reference ${asset}`);
}
for (const asset of ['resident-red-hoodie-boy.webp', 'resident-little-lady.webp', 'resident-blue-jacket-boy.webp']) {
  assert.ok(fs.existsSync(path.join(root, 'Residents/assets', asset)), `The app asset ${asset} must be included beside the library`);
}
assert.equal((markup.match(/le-weather-prop--umbrella/g) || []).length, 2, 'Only two umbrella props should exist');
assert.ok(markup.includes('le-weather-prop--rain-joy'), 'Resident three must have the rain-enjoying pose');
assert.ok(markup.includes('le-weather-prop--snow') && markup.includes('le-weather-prop--heat'), 'Snow and heat props must be part of the shared artwork');
assert.ok(markup.includes('le-weather-prop--stargaze'), 'The cast must include a quiet stargazing pose');
assert.ok(markup.includes('le-weather-prop--exercise') && markup.includes('le-weather-prop--butterfly'), 'The morning park scene must include exercise and butterfly props');

const host = {
  dataset: {},
  children: [],
  replaceChildren(...items) { this.children = items; },
  appendChild(node) { this.children.push(node); }
};
assert.equal(library.mount(host), true, 'The library must mount into a view-owned host');
assert.equal(host.children.length, 1, 'Mount should add one SVG root');
assert.equal(host.children[0].attributes.viewBox, '0 0 420 250');
assert.equal(host.dataset.residentsVersion, '1.3.0');

for (const mode of ['morning', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
  assert.equal(library.setActivity(host, { mode, gustLevel: 'normal' }), true);
  assert.equal(host.dataset.activity, mode, `Host should select ${mode}`);
}
library.setActivity(host, { mode: 'wind', gustLevel: 'strong' });
assert.equal(host.dataset.gust, 'strong', 'Strong gust state must be passed into the resident host');
library.setActivity(host, { mode: 'unknown-activity' });
assert.equal(host.dataset.activity, 'calm', 'Unknown activities must fall back safely to calm');
library.unmount(host);
assert.equal(host.children.length, 0, 'Unmount must remove the SVG content');
assert.equal(host.dataset.residentsVersion, undefined, 'Unmount must clear resident ownership state');

assert.ok(weatherSource.includes("./Residents/resident-library.js"), 'Weather must load the separate reusable Residents library from the same origin');
assert.ok(weatherSource.includes('library.mount(residentHost)'), 'Weather must mount residents through the shared API');
assert.ok(weatherSource.includes("view.root.appendChild(residentHost)"), 'Residents must be positioned in the foreground overlay above the scene');
assert.ok(weatherSource.includes("residentHost.dataset.residentsMounted = 'true'"), 'Weather must mark a successful Residents mount');
assert.ok(residentsSource.includes('.le-weather-people[data-activity=\"rain\"]'), 'Resident activity selectors must stay host-owned and reusable across views');
assert.ok(weatherSource.includes('LiveEarthResidentLibrary?.setActivity(residentHost, state)'), 'Weather forecast selection must drive resident activity');
assert.ok(weatherSource.includes('LiveEarthResidentLibrary?.unmount(residentHost)'), 'Weather cleanup must unmount residents');
assert.ok(!weatherSource.includes('function characterMarkup('), 'Weather must not define duplicate resident artwork');
assert.ok(!weatherSource.includes('CHARACTER_POSITIONS'), 'Weather must not own a second resident roster');

console.log('Shared Residents roster, SVG mount, reusable activities and Weather integration tests passed.');
