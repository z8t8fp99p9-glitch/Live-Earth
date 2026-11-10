const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

// Mountain range: separate peaks with sharper ridge shoulders and a broad copper exposure mask.
for (const token of [
  'gaussian(wx,wz,-7.2,-10.5,1.12,1.90,8.35)',
  'gaussian(wx,wz,-1.55,-10.8,1.16,1.92,8.95)',
  'gaussian(wx,wz,10.75,-11.2,1.18,1.85,7.65)',
  'const ridgeTeeth=0.48*Math.pow',
  'const brokenFaces=0.10*Math.sin',
  'gaussian(x,z,7.8,-9.0,4.3,4.0,0.88)'
]) assert.ok(source.includes(token), `Missing mountain detail: ${token}`);

// Clouds occupy the upper camera band; actual cloud cover still determines visibility.
assert.ok(source.includes('addCloud(-5.0,24.2,-12.4'), 'A large cloud mass must occupy the upper sky');
assert.ok(source.includes('addCloud(-1.8,25.5,-16.0'), 'A second cloud depth layer must be available');
assert.ok(source.includes('const threshold=0.06+index*0.11'), 'Cloud visibility remains based on selected forecast cover');
assert.ok(source.includes('cloud.visible=visibility>0.008'), 'Zero cloud cover must not fabricate visible cumulus');

// River: one shared headwater guide, natural width progression and independent flow texture.
assert.ok(source.includes('const riverPath=[[-2.8,-12.1]'), 'The river must start in the mountain headwaters');
assert.ok(source.includes('const riverCenterX = z =>'), 'Forest clearings must use the same river path guide');
assert.ok(source.includes('const riverTexture=new THREE.CanvasTexture(riverCanvas)'), 'The river must not reuse the ocean wave texture');
assert.ok(source.includes('riverTexture.offset.x=(riverTexture.offset.x-delta*(0.045+targetRiverFlow*0.065))%1'), 'Texture movement must follow downstream UV direction');
assert.ok(source.includes('const halfWidth=0.18+0.42*smooth(0.0,0.28,t)'), 'The river must widen naturally toward its lower channel');
assert.ok(source.includes('waterfall.position.set(waterfallTop.x,waterfallBaseY,waterfallTop.z+0.56)'), 'The cascade must continue from the river lip');

// Coast remains a secondary foreground and the sea edge must stay outside the viewport.
assert.ok(source.includes('SEA_X=36,SEA_Z0=7.6,SEA_Z1=52'), 'Ocean mesh must extend beyond the visible lower frame');
assert.ok(source.includes('const coastCurve='), 'The shore remains an irregular, continuous curve');

// Resource cleanup includes procedural textures introduced for the river.
assert.ok(source.includes('textures.forEach(texture=>texture.dispose())'), 'All generated canvas textures must be disposed on close');
console.log('Weather mountain, cloud placement, river flow, coastal framing and texture-cleanup refinements passed.');
