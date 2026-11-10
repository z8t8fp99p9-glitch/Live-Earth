const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const weather = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');
const profileSource = weather.match(/function weatherViewportProfile\(width, height\) \{[\s\S]*?\n  \}/);
assert.ok(profileSource, 'Weather must expose a testable viewport composition profile');
const profile = vm.runInNewContext(`(${profileSource[0]})`);

for (const [name, width, height] of [
  ['small portrait', 320, 568], ['iPhone portrait', 393, 852], ['large portrait', 430, 932],
  ['tablet portrait', 820, 1180]
]) {
  const view = profile(width, height);
  assert.equal(view.portrait, true, `${name} must use the portrait master composition`);
  assert.deepEqual({ ...view.composition }, { sky: 0.50, land: 0.35, water: 0.15 }, `${name} must use the sky-dominant 50/35/15 design target`);
  assert.ok(view.elevation >= 0.30 && view.elevation <= 0.34, `${name} must use the lower cinematic camera pitch`);
  assert.ok(view.targetY >= 5.0, `${name} must keep the far horizon near the composition midpoint`);
}

const coast = weather.match(/const coastFront = x => ([^\n]+)/);
assert.ok(coast && coast[1].startsWith('8.65 +'), 'The visible shoreline must sit forward, limiting the ocean foreground');
assert.ok(weather.includes('const riverPath=[[-1.15,-7.2]'), 'The river must still originate high in the mountain valley');
assert.ok(weather.includes('[3.15,6.2],[3.7,8.35]'), 'The river must reach the smaller coastal foreground');
assert.ok(weather.includes('const horizonRows = [-24.0, -5.0, 0.7, 2.1, 3.1, 5.2, 52.0]'), 'The sky backdrop must extend above the expanded cloud field');

// Ensure the composition pass changes framing only, not weather data or ownership.
for (const token of [
  'cloud.visible=visibility>0.005', 'activeWind / 42', 'targetSunPosition.set',
  'targetRainIntensity=(kind===\'rain\'||kind===\'storm\')?clamp(precipitation/3.8,0,1):0',
  'riverFlowRate=0.62+Math.min(1.35,precipitation*0.28', 'seaMaterial.roughness=clamp',
  'runtime.registerFeature(\'weather\',activateWeather)', 'liveEarthLocationAllowed'
]) assert.ok(weather.includes(token), `The composition update must preserve ${token}`);

console.log('Sky-dominant 50/35/15 Weather composition and forecast-reactive scene checks passed.');
