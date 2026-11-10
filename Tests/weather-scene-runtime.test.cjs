const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');
const start = source.indexOf('  function number(value) {');
const end = source.indexOf('  function createParticles(', start);
assert.ok(start >= 0 && end > start, 'Weather state helpers must exist');
const helpers = source.slice(start, end);
const api = vm.runInNewContext(`(() => { ${helpers}; return { visualState }; })()`);
const cases = [
  [{time:'2026-11-10T12:00',temperature:23,feelsLike:24,isDay:1,weather_code:0,cloudCover:5,wind:4,gusts:6}, 'clear', 'day'],
  [{time:'2026-11-10T06:00',temperature:19,isDay:1,weather_code:1,cloudCover:10}, 'clear', 'dawn'],
  [{time:'2026-11-10T18:00',temperature:22,isDay:1,weather_code:2,cloudCover:40}, 'clear', 'evening'],
  [{time:'2026-11-10T23:00',temperature:18,isDay:0,weather_code:0,cloudCover:0}, 'clear', 'night'],
  [{time:'2026-11-10T14:00',temperature:22,isDay:1,weather_code:3,cloudCover:90}, 'cloudy', 'day'],
  [{time:'2026-11-10T14:00',temperature:21,isDay:1,weather_code:61,precipitation:1}, 'rain', 'day'],
  [{time:'2026-11-10T14:00',temperature:2,isDay:1,weather_code:71,snowfall:1}, 'snow', 'day'],
  [{time:'2026-11-10T14:00',temperature:20,isDay:1,weather_code:45}, 'fog', 'day'],
  [{time:'2026-11-10T14:00',temperature:25,isDay:1,weather_code:95}, 'storm', 'day'],
  [{time:'2026-11-10T14:00',temperature:36,isDay:1,weather_code:0,cloudCover:5}, 'hot', 'day']
];
for (const [item, weather, phase] of cases) {
  const actual = api.visualState(item);
  assert.equal(actual.weather, weather);
  assert.equal(actual.phase, phase);
}
console.log('Weather-to-background state mapping passed for clear, cloudy, rain, storm, snow, fog, hot and day phases.');
