const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const libraryPath = path.join(root, 'Residents', 'resident-library.js');
const source = fs.readFileSync(libraryPath, 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: 'resident-library.js' });

const library = context.window.LiveEarthResidentLibrary;
assert.ok(library, 'The shared Residents API must register');
assert.equal(library.version, '1.1.0', 'The Residents library version must advance');
assert.ok(library.getActivityCatalog().morning, 'Morning park activity must be catalogued');

const dawnHost = { dataset: {} };
library.setActivity(dawnHost, { mode: 'calm', phase: 'dawn', weather: 'clear' });
assert.equal(dawnHost.dataset.activity, 'morning', 'A fair local dawn must start the morning park activity');

const cloudyDawnHost = { dataset: {} };
library.setActivity(cloudyDawnHost, { mode: 'calm', phase: 'dawn', weather: 'cloudy' });
assert.equal(cloudyDawnHost.dataset.activity, 'morning', 'A fair cloudy dawn may still be suitable for exercise');

for (const weather of ['rain', 'storm', 'snow', 'fog', 'hot']) {
  const host = { dataset: {} };
  library.setActivity(host, { mode: 'calm', phase: 'dawn', weather });
  assert.equal(host.dataset.activity, 'calm', `Morning exercise must not override ${weather} conditions`);
}

const rainHost = { dataset: {} };
library.setActivity(rainHost, { mode: 'rain', phase: 'dawn', weather: 'rain' });
assert.equal(rainHost.dataset.activity, 'rain', 'Weather activity must keep priority over morning exercise');

const daytimeHost = { dataset: {} };
library.setActivity(daytimeHost, { mode: 'calm', phase: 'day', weather: 'clear' });
assert.equal(daytimeHost.dataset.activity, 'calm', 'The park routine must end outside the dawn window');

assert.match(source, /le-weather-person--one\{animation:le-resident-morning-jump/, 'Resident one must animate a morning exercise');
assert.match(source, /le-weather-person--two\{animation:le-resident-morning-stretch/, 'Resident two must animate a morning stretch');
assert.match(source, /le-weather-person--three\{animation:le-resident-butterfly-chase/, 'Resident three must chase the butterfly');
assert.match(source, /le-weather-prop--butterfly/, 'The third resident must own a butterfly prop');
assert.match(source, /le-resident-butterfly-flight/, 'The butterfly must have its own flutter animation');
assert.match(source, /\.le-sfv--weather \.le-sfv-body>\.le-sfv-card:first-of-type\{[^}]*background:transparent/, 'The top forecast card must become a transparent floating overlay');
assert.match(source, /\.le-sfv--weather \.le-weather-metric\{padding:0;border:0;border-radius:0;background:none/, 'Weather metrics must lose their individual tile backgrounds');
assert.match(source, /\.le-sfv--weather \.le-sfv-subtitle\{display:none\}/, 'The long Weather subtitle must no longer occupy the top of the scene');

console.log('Weather floating information overlay and morning Residents activity tests passed.');
