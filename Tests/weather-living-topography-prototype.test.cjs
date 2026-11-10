const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'Weather/LivingTopography/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'Weather/LivingTopography/living-topography.js'), 'utf8');

assert.match(html, /LIVING TOPOGRAPHY/);
assert.match(html, /CONTOUR FORECAST/);
assert.match(html, /STAGE 0/);
assert.match(html, /SIMULATED CONDITIONS · NOT CONNECTED TO LIVE WEATHER DATA/);
assert.match(html, /data-weather="rain"/);
assert.match(js, /from '\.\.\/\.\.\/vendor\/three\.module\.js'/, 'Must use the existing same-origin Three.js runtime');
assert.match(js, /function heightAt\(x, z\)/, 'Terrain must be generated as real 3D elevation');
assert.match(js, /buildContours\(\)/, 'Terrain must include elevation contour geometry');
assert.match(js, /new THREE\.InstancedMesh/, 'Vegetation must be instanced for mobile performance');
assert.match(js, /addCloud\(/, 'Independent 3D cloud volumes must be present');
assert.match(js, /new THREE\.MeshPhysicalMaterial/, 'Water and morphic surfaces must use dimensional materials');
assert.match(js, /prefers-reduced-motion/, 'Reduced-motion preference must be respected');
assert.match(js, /visibilitychange/, 'Animation must pause while hidden');
assert.match(js, /pagehide/, 'GPU resources must be released on exit');
assert.match(js, /renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, 1\.5\)\)/, 'Pixel ratio must be capped for mobile');
assert.doesNotMatch(js, /navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/, 'Prototype must not request location');
assert.doesNotMatch(js, /fetch\s*\(|XMLHttpRequest|localStorage|indexedDB|sessionStorage/, 'Stage 0 must not fetch data or write to app storage');
assert.doesNotMatch(js, /https?:\/\//, 'No external assets or CDN dependencies may be introduced');
assert.doesNotMatch(js, /earth-engine|moon-view|sun-view|orb-controls|data-store\.js/i, 'Prototype must remain isolated from protected engines');

console.log('Living Topography Stage 0 prototype contract checks passed.');
