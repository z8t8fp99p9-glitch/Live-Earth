const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const weather = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

// Integration contracts.
assert.ok(weather.includes("runtime.registerFeature('weather',activateWeather)"), 'Weather must stay on the existing Stacks route');
assert.ok(weather.includes("new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href"), 'Weather must use the already-cached same-origin Three.js runtime');
assert.ok(weather.includes('await import(THREE_MODULE_URL)'), 'Weather must dynamically load the shared 3D runtime');
assert.ok(weather.includes('new THREE.WebGLRenderer'), 'Weather must render a real 3D scene');
assert.ok(weather.includes('const MAX_FORECAST_HOURS = 18'), 'The 18-hour forecast remains intact');
assert.ok(weather.includes('https://api.open-meteo.com/v1/forecast'), 'Open-Meteo remains the source');
assert.ok(weather.includes('liveEarthLocationAllowed'), 'The shared Location permission gate remains authoritative');
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must never request GPS itself');
assert.ok(weather.includes('No old forecast is presented as current'), 'Offline freshness handling must stay intact');
assert.ok(weather.includes('renderer.forceContextLoss?.()'), 'WebGL resources must be released');
assert.ok(weather.includes('return () => {engineDisposed=true'), 'Stacks deactivation cleanup must remain');

// Full scene rebuild: no old board, slab, central spine or strip river.
assert.ok(weather.includes('const MAP_W = 28') && weather.includes('const MAP_D = 28'), 'The world must use a broad full-bleed environment footprint');
assert.ok(weather.includes('const westernPeaks =') && weather.includes('const centralPeaks =') && weather.includes('const easternPeaks ='), 'Multiple mountain groups must form the range');
assert.ok(weather.includes('const foothills ='), 'The mountain chain must transition into foothills and valleys');
assert.ok(weather.includes('const BACK_Z = -15.0') && weather.includes('const FRONT_Z = 13.0'), 'Terrain must extend across the scene depth');
assert.ok(!weather.includes('const plinthCore =') && !weather.includes('const plinthRim ='), 'The thick rectangular display slab must be removed');
assert.ok(!weather.includes('const edgeBands='), 'The old stacked platform walls must be removed');
assert.ok(!weather.includes('const riverPath=[[-1.15,-7.2]'), 'The old narrow straight river path must be removed');
assert.ok(weather.includes('const riverPath=[[-2.2,-11.2]'), 'The new river must begin in the high mountain valley');
assert.ok(weather.includes('const halfWidth=0.22+0.18*Math.sin(Math.PI*t)'), 'The river must be a single smoothly varying ribbon');
assert.ok(weather.includes('const coastFront = x => 8.7 +'), 'The shore must sit near the foreground, leaving the ocean secondary');
assert.ok(weather.includes('SEA_X=26,SEA_Z0=7.8,SEA_Z1=34'), 'Sea geometry must occupy only the foreground beyond the shoreline');
assert.ok(weather.includes('const coastCurve='), 'The coast must be irregular and continuous');

// Living terrain, forest and cloud layers.
assert.ok(weather.includes('makeSurfaceTexture'), 'Terrain must have fine surface grain');
assert.ok(weather.includes('const broadCanopy='), 'Broadleaf trees must have their own canopy silhouette');
assert.ok(weather.includes('const pineLower='), 'Conifers must have a different silhouette');
assert.ok(weather.includes('const broadLobes='), 'Broadleaf crowns must have uneven secondary foliage');
assert.ok(weather.includes('const forestClusters=['), 'Vegetation must grow in ecological clusters');
assert.ok(weather.includes('const shrubs='), 'The valley floor must include understorey');
assert.ok(weather.includes('const rockOutcrops='), 'Rocks must form grouped outcrops rather than cover the mountain randomly');
assert.ok(weather.includes('addCloud(-4.0,20.0,-12.0'), 'The high cloud shelf must sit visibly above the mountain range');
assert.ok(weather.includes('addCloud(8.0,16.6,-6.0'), 'Clouds must span across the upper sky');
assert.ok(!/support rod|cloud pole|cloud rod/i.test(weather), 'Clouds must have no static support rods');

// Weather instrument behaviour.
for (const token of [
  'const cloudCover=Number.isFinite(Number(next.cloudCover))',
  'cloud.visible=visibility>0.008', 'activeWind/38', 'targetSunPosition.set',
  "targetRain=(kind==='rain'||kind==='storm')?clamp(precipitation/3.5,0,1):0",
  'targetRiverFlow=0.58+Math.min(1.45,precipitation*0.30+targetRain*0.18)',
  'waterTexture.offset.y=', "activeWeather==='rain'||activeWeather==='storm'",
  "activeWeather==='storm'&&elapsed>=nextLightningAt", 'seaMaterial.roughness=clamp',
  'waterfallMaterial.opacity=', 'mistMaterial.opacity='
]) assert.ok(weather.includes(token), `Missing weather behaviour: ${token}`);

// Camera composition: portrait gets its own sky-forward view; world geometry is never stretched.
const profileSource = weather.match(/function weatherViewportProfile\(width, height\) \{[\s\S]*?\n  \}/);
assert.ok(profileSource, 'Viewport profile must be testable');
const viewportProfile = vm.runInNewContext(`(${profileSource[0]})`);
const cases = [
  ['small portrait',320,568],['phone portrait',393,852],['large portrait',430,932],
  ['phone landscape',844,390],['tablet portrait',820,1180],['tablet landscape',1180,820],
  ['desktop',1440,900],['ultrawide',2560,1080]
];
const profiles = cases.map(([name,w,h]) => ({name,...viewportProfile(w,h)}));
for (const p of profiles) {
  assert.ok(p.aspect>0 && Number.isFinite(p.aspect), `${p.name} needs a valid aspect`);
  assert.ok(p.fov>=40 && p.fov<=50, `${p.name} needs a usable field of view`);
  assert.ok(p.cameraRise>0 && p.cameraDepth>0, `${p.name} needs a stable camera offset`);
  assert.equal(p.scaleX,undefined, `${p.name} must not stretch terrain width`);
  assert.equal(p.scaleZ,undefined, `${p.name} must not stretch terrain depth`);
}
assert.ok(profiles[1].portrait && !profiles[3].portrait, 'Phones must switch composition by orientation');
assert.ok(profiles[1].targetY>10 && profiles[1].cameraRise<14, 'Portrait view must reserve a large sky window and use a low cinematic pitch');
assert.ok(profiles[1].fov>profiles[3].fov, 'Portrait needs a wider vertical sky frame');
assert.ok(profiles[4].tablet && !profiles[5].portrait, 'Tablets must be classified independently');
assert.ok(weather.includes('new ResizeObserver(resize)'), 'Container resizing must reframe the camera');
assert.ok(weather.includes("window.visualViewport?.addEventListener('resize',resize"), 'Mobile visual viewport changes must reframe the camera');

console.log('Full-bleed Living Coast scene, sky-forward portrait camera, weather systems, privacy and lifecycle checks passed.');
