const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Traffic', 'traffic-view.js'), 'utf8');

const checks = [
  ['keeps Traffic as a separate empty black Stacks view', /runtime\.registerFeature\('traffic',\s*openTraffic\)/.test(source) && /source remains pending/.test(source)],
  ['registers Live Cams as its own Stacks Orb', /featureApi\.register\('live-cams',\s*\{/.test(source)],
  ['labels the Orb Live Cams', /title:\s*'Live Cams'/.test(source) && /shortLabel:\s*'Live Cams'/.test(source)],
  ['creates a Live Cams-owned canvas, scene, camera and renderer', /le-live-cams-earth-canvas/.test(source) && /new THREE\.WebGLRenderer/.test(source) && /new THREE\.Scene/.test(source) && /new THREE\.PerspectiveCamera/.test(source)],
  ['imports Three.js from the correct parent-relative app path', /import\('\.\.\/vendor\/three\.module\.js'\)/.test(source)],
  ['calls the shared Earth Engine Core factory', /import\('\.\.\/EarthEngine\/Core\/earth-engine\.js'\)/.test(source) && /createEarthGlobe\(\{/.test(source)],
  ['uses the canonical root-relative Earth texture', /textureUrl:\s*'\.\/EarthEngine\/Assets\/earth-land-ocean-ice-2048\.png'/.test(source)],
  ['fits the initial globe to the viewport instead of retaining a close-up camera distance', /camera\.position\.z\s*=\s*clamp\([\s\S]*baseDistance \* previousRatio/.test(source) && /DIAMETER_FRACTION\s*=\s*0\.75/.test(source)],
  ['uses Earth Engine drag rotation and pinch zoom', /earthGlobe\.attachInteractions\(\{[\s\S]*rotation:\s*\{[\s\S]*zoom:\s*\{[\s\S]*enabled:\s*true/.test(source)],
  ['registers Live Cams with the Engine owner lifecycle', /earthGlobe\.registerViewRuntime\(\{[\s\S]*activate:\s*resumeRenderer[\s\S]*deactivate:\s*pauseRenderer/.test(source)],
  ['unregisters its runtime and disposes its own globe and renderer', /runtimeUnregister\?\.\(\)[\s\S]*earthGlobe\?\.dispose\(\)/.test(source) && /renderer\.dispose\(\)/.test(source)],
  ['does not force a WebGL context loss on Home when closing Live Cams', !/forceContextLoss/.test(source)],
  ['does not use the Home scene, shared Home layer API, or Moon module', !/LiveEarthScene|Home\/moon-orbit|Moon\/moon-view-controller|attachLayer\(/.test(source)],
  ['keeps a full-height scroll surface beneath the Earth canvas', /overflow-y:auto/.test(source) && /le-live-cams-scroll-space/.test(source)],
  ['does not request device location or fetch camera feeds', !/geolocation|getCurrentPosition|watchPosition|api\.openeye\.cam|fetch\s*\(/.test(source)],
  ['does not alter Home navigation or Orb markup', !/navButtons|orbShell|orbButton/.test(source)]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exitCode = 1;
