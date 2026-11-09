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
assert.equal(library.version, '1.0.0');
const roster = library.getRoster();
assert.equal(roster.length, 3, 'The permanent cast must contain exactly three residents');
assert.deepEqual(Array.from(roster, person => person.id), ['one', 'two', 'three']);
assert.equal(new Set(Array.from(roster, person => person.shirt)).size, 3, 'Each resident must retain a distinct shirt colour');
assert.ok(roster.every(person => person.signature), 'Each resident must have a stable identifying visual detail');

const activities = library.getActivityCatalog();
for (const activity of ['calm', 'play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
  assert.ok(activities[activity], `The shared activity catalogue must include ${activity}`);
}
assert.equal(activities.festival.stage, 'shared-library', 'Festival is a host-selected activity, not an automatic Weather state');

const markup = library.renderMarkup();
assert.equal((markup.match(/class="le-weather-person le-weather-person--/g) || []).length, 3, 'SVG markup must render exactly three residents');
assert.equal((markup.match(/le-weather-prop--umbrella/g) || []).length, 2, 'Only two umbrella props should exist');
assert.ok(markup.includes('le-weather-prop--rain-joy'), 'Resident three must have the rain-enjoying pose');
assert.ok(markup.includes('le-weather-prop--snow') && markup.includes('le-weather-prop--heat'), 'Snow and heat props must be part of the shared artwork');
assert.ok(markup.includes('le-weather-prop--stargaze'), 'The cast must include a quiet stargazing pose');

const host = {
  dataset: {},
  children: [],
  replaceChildren(...items) { this.children = items; },
  appendChild(node) { this.children.push(node); }
};
assert.equal(library.mount(host), true, 'The library must mount into a view-owned host');
assert.equal(host.children.length, 1, 'Mount should add one SVG root');
assert.equal(host.children[0].attributes.viewBox, '0 0 420 250');
assert.equal(host.dataset.residentsVersion, '1');

for (const mode of ['play', 'rain', 'snow', 'heat', 'wind', 'stargaze', 'walk', 'picnic', 'kite', 'garden', 'festival', 'camping']) {
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

assert.ok(weatherSource.includes("import('./Residents/resident-library.js')"), 'Weather must dynamically load the separate reusable library without adding a blocking script tag');
assert.ok(weatherSource.includes('library.mount(residentHost)'), 'Weather must mount residents through the shared API');
assert.ok(residentsSource.includes('.le-weather-people[data-activity=\"rain\"]'), 'Resident activity selectors must stay host-owned and reusable across views');
assert.ok(weatherSource.includes('LiveEarthResidentLibrary?.setActivity(residentHost, state)'), 'Weather forecast selection must drive resident activity');
assert.ok(weatherSource.includes('LiveEarthResidentLibrary?.unmount(residentHost)'), 'Weather cleanup must unmount residents');
assert.ok(!weatherSource.includes('function characterMarkup('), 'Weather must not define duplicate resident artwork');
assert.ok(!weatherSource.includes('CHARACTER_POSITIONS'), 'Weather must not own a second resident roster');

console.log('Shared Residents roster, SVG mount, reusable activities and Weather integration tests passed.');
