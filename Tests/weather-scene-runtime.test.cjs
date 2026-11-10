const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');
const match = source.match(/function weatherState\(data\) \{[\s\S]*?\n  \}/);
assert.ok(match, 'Weather state mapper must exist');
const weatherState = vm.runInNewContext(`(${match[0]})`);
const cases = [
  [{current:{weather_code:0,cloud_cover:0,is_day:1,time:'2026-11-10T12:00'}}, 'clear', 'day'],
  [{current:{weather_code:2,cloud_cover:45,is_day:1,time:'2026-11-10T10:00'}}, 'partly-cloudy', 'day'],
  [{current:{weather_code:3,cloud_cover:100,is_day:1,time:'2026-11-10T10:00'}}, 'overcast', 'day'],
  [{current:{weather_code:61,cloud_cover:100,is_day:1,time:'2026-11-10T10:00'}}, 'rain', 'day'],
  [{current:{weather_code:95,cloud_cover:100,is_day:1,time:'2026-11-10T10:00'}}, 'storm', 'day'],
  [{current:{weather_code:71,cloud_cover:100,is_day:1,time:'2026-11-10T10:00'}}, 'snow', 'day'],
  [{current:{weather_code:45,cloud_cover:100,is_day:1,time:'2026-11-10T10:00'}}, 'fog', 'day'],
  [{current:{weather_code:0,cloud_cover:0,is_day:0,time:'2026-11-10T23:00'}}, 'clear', 'night'],
  [{current:{weather_code:0,cloud_cover:0,is_day:1,time:'2026-11-10T06:00'}}, 'clear', 'dawn'],
  [{current:{weather_code:0,cloud_cover:0,is_day:1,time:'2026-11-10T18:00'}}, 'clear', 'evening']
];
for (const [data, condition, phase] of cases) {
  const actual = weatherState(data);
  assert.equal(actual.condition, condition);
  assert.equal(actual.phase, phase);
}
assert.equal(weatherState(null).condition, 'neutral');
assert.equal(weatherState({}).condition, 'neutral');
console.log('Current-weather mapping covers clear, cloud, rain, storm, snow, fog and local day phases.');
