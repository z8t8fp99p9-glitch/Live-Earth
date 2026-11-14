const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Traffic', 'traffic-view.js'), 'utf8');

const checks = [
  ['keeps the existing Traffic feature registered', /runtime\.registerFeature\('traffic',\s*activateTraffic\)/.test(source)],
  ['registers a distinct Live Cams Orb in the Stacks registry', /featureOrbRegistry\.register\('live-cams',\s*\{/.test(source)],
  ['labels the new Orb Live Cams', /title:\s*'Live Cams'/.test(source) && /shortLabel:\s*'Live Cams'/.test(source)],
  ['uses the shared Earth layer for camera markers', /attachLayer\('live-cams'/.test(source)],
  ['uses the public OpenEye camera catalogue', /https:\/\/api\.openeye\.cam\/v1/.test(source)],
  ['validates camera coordinates', /validCoord\(lat, lon\)/.test(source)],
  ['shows preview images only with explicit redistribution permission', /rights\.preview_embed === true/.test(source)],
  ['keeps non-embeddable cameras linked to their publisher', /Open publisher camera/.test(source)],
  ['clears live camera data when offline', /Offline · live camera markers and previews are cleared/.test(source)],
  ['cleans up camera requests, timers, listeners and globe layer', /controller\?\.abort\(\)[\s\S]*clearInterval\(refreshTimer\)[\s\S]*removeEventListener\('offline'[\s\S]*layerDispose\?\.\(\)/.test(source)],
  ['disposes the Live Cams view when its Orb closes', /deactivate:\s*\(\)\s*=>\s*\{[\s\S]*liveCamsCleanup\(\)/.test(source)],
  ['does not request device location', !/geolocation|getCurrentPosition|watchPosition/.test(source)],
  ['does not modify Home Orb or navigation code', !/navButtons|orbShell|orbButton/.test(source)]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exitCode = 1;
