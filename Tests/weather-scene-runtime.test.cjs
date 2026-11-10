const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');
const start = source.indexOf('  function n(value) {');
const end = source.indexOf('  function activateWeather() {');
assert.ok(start >= 0 && end > start, 'Weather data helpers must exist');
const helpers = source.slice(start, end);
const api = vm.runInNewContext(`(() => { const MAX_HOURS = 18; ${helpers}; return { weatherState, buildForecast, conditionFor, iconFor }; })()`);

const cases = [
  [{weather_code:0,cloud_cover:0,is_day:1,time:'2026-11-10T12:00',precipitation:0}, 'clear', 'day'],
  [{weather_code:2,cloud_cover:45,is_day:1,time:'2026-11-10T10:00'}, 'partly-cloudy', 'day'],
  [{weather_code:3,cloud_cover:100,is_day:1,time:'2026-11-10T10:00'}, 'overcast', 'day'],
  [{weather_code:61,is_day:1,time:'2026-11-10T10:00',precipitation:1}, 'rain', 'day'],
  [{weather_code:95,is_day:1,time:'2026-11-10T10:00'}, 'storm', 'day'],
  [{weather_code:71,is_day:1,time:'2026-11-10T10:00',snowfall:1}, 'snow', 'day'],
  [{weather_code:45,is_day:1,time:'2026-11-10T10:00'}, 'fog', 'day'],
  [{weather_code:0,is_day:0,time:'2026-11-10T23:00'}, 'clear', 'night'],
  [{weather_code:0,is_day:1,time:'2026-11-10T06:00'}, 'clear', 'dawn'],
  [{weather_code:0,is_day:1,time:'2026-11-10T18:00'}, 'clear', 'evening']
];
for (const [item, condition, phase] of cases) {
  const actual = api.weatherState(item);
  assert.equal(actual.condition, condition);
  assert.equal(actual.phase, phase);
}
assert.equal(api.weatherState(null).condition, 'neutral');

const data = {
  current: {time:'2026-11-10T08:30',temperature_2m:23,apparent_temperature:25,weather_code:1,cloud_cover:10,is_day:1,precipitation:0},
  hourly: {
    time:['2026-11-10T08:00','2026-11-10T09:00','2026-11-10T10:00','2026-11-10T11:00'],
    temperature_2m:[21,24,26,27], apparent_temperature:[22,25,27,28],
    precipitation_probability:[0,0,5,10], precipitation:[0,0,0,0], rain:[0,0,0,0],
    showers:[0,0,0,0], snowfall:[0,0,0,0], weather_code:[0,1,1,2],
    cloud_cover:[0,5,10,20], wind_speed_10m:[2,3,3,4], wind_gusts_10m:[4,5,5,7],
    wind_direction_10m:[90,90,100,110], is_day:[1,1,1,1]
  }
};
const forecast = api.buildForecast(data);
assert.equal(forecast.length,3);
assert.equal(forecast[0].temperature_2m,23,'Current observed temperature replaces the past hourly estimate');
assert.equal(forecast[0].weather_code,1);
assert.equal(forecast[0].time,'2026-11-10T08:30');
assert.equal(api.conditionFor(61,1,0),'Rain');
assert.equal(api.iconFor(71,0,1,1),'❄️');
console.log('Weather mapping, local phases and current-plus-hourly forecast checks passed.');
