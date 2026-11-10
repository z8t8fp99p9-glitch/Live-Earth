const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
const a=s.indexOf('  const number =');const b=s.indexOf('  function conditionLabel(',a);assert.ok(a>=0&&b>a);
const code=s.slice(a,b);const api=vm.runInNewContext(`(()=>{${code};return {visualState};})()`);
const cases=[
[{time:'2026-11-10T12:00',temperature_2m:23,is_day:1,weather_code:0,wind_speed_10m:4,wind_direction_10m:40},'clear','day'],
[{time:'2026-11-10T06:00',temperature_2m:19,is_day:1,weather_code:1,wind_speed_10m:4},'clear','dawn'],
[{time:'2026-11-10T18:00',temperature_2m:22,is_day:1,weather_code:2,wind_speed_10m:4},'cloudy','evening'],
[{time:'2026-11-10T23:00',temperature_2m:18,is_day:0,weather_code:0,wind_speed_10m:4},'clear','night'],
[{time:'2026-11-10T14:00',temperature_2m:22,is_day:1,weather_code:3,wind_speed_10m:4},'cloudy','day'],
[{time:'2026-11-10T14:00',temperature_2m:21,is_day:1,weather_code:61,precipitation:2,wind_speed_10m:6},'rain','day'],
[{time:'2026-11-10T14:00',temperature_2m:2,is_day:1,weather_code:71,snowfall:1,wind_speed_10m:4},'snow','day'],
[{time:'2026-11-10T14:00',temperature_2m:20,is_day:1,weather_code:45,wind_speed_10m:4},'fog','day'],
[{time:'2026-11-10T14:00',temperature_2m:25,is_day:1,weather_code:95,wind_speed_10m:4},'storm','day'],
[{time:'2026-11-10T14:00',temperature_2m:38,is_day:1,weather_code:0,wind_speed_10m:4},'hot','day'],
[{time:'2026-11-10T14:00',temperature_2m:21,is_day:1,weather_code:0,wind_speed_10m:36},'wind','day']
];
for(const [item,weather,phase] of cases){const v=api.visualState(item);assert.equal(v.weather,weather);assert.equal(v.phase,phase);}
console.log('Weather-to-generative-art state mapping passed for clear, cloud, rain, storm, snow, fog, wind, hot and day/night phases.');
