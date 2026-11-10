const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const weather = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');
const match = weather.match(/function weatherViewportProfile\(width, height\) \{[\s\S]*?\n  \}/);
assert.ok(match, 'Adaptive camera profile must exist');
const profile = vm.runInNewContext(`(${match[0]})`);
for (const [name,w,h] of [['small phone',320,568],['iPhone',393,852],['large phone',430,932],['tablet',820,1180]]) {
  const p=profile(w,h);
  assert.equal(p.portrait,true,`${name} remains portrait`);
  assert.ok(p.fov>=46 && p.fov<=49,`${name} gets a sky-forward portrait FOV`);
  assert.ok(p.targetY>=10.5,`${name} keeps the distant skyline around mid-frame`);
  assert.ok(p.cameraRise<=13,`${name} uses a low viewing angle`);
}
assert.ok(weather.includes('const cloudFamilies=[]'), 'Independent volumetric cloud families must occupy the sky');
assert.ok(weather.includes('const westernPeaks =') && weather.includes('const centralPeaks =') && weather.includes('const easternPeaks ='), 'Mountain groups span the middle of the scene');
assert.ok(weather.includes('const riverPath=[[-2.2,-11.2]'), 'Riverlands connect from mountain source to coast');
assert.ok(weather.includes('SEA_X=26,SEA_Z0=7.8,SEA_Z1=34'), 'Ocean remains a lower foreground');
assert.ok(!weather.includes('const plinthCore ='), 'No display slab may remain');
console.log('Sky-forward portrait composition and full-scene structural checks passed.');
