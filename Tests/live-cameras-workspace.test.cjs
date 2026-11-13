const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Traffic', 'traffic-view.js'), 'utf8');
const checks = [
  ['uses the existing Stacks runtime', /LiveEarthStacksFeatureRuntime/.test(source)],
  ['registers through the existing Traffic feature slot', /registerFeature\('traffic',\s*activateCameras,\s*true\)/.test(source)],
  ['uses the public OpenEye catalogue', /https:\/\/api\.openeye\.cam\/v1/.test(source)],
  ['attaches markers to the shared Earth layer', /attachLayer\('traffic'/.test(source)],
  ['uses global map camera and cluster coordinates', /mapPins = Array\.isArray\(mapPayload\.items\)/.test(source) && /pin\.count/.test(source)],
  ['validates geographic coordinates', /validCoord\(lat, lon\)/.test(source)],
  ['requires explicit preview redistribution permission', /redistribution\.preview_embed === true/.test(source)],
  ['uses source links for non-embeddable feeds', /Watch at publisher/.test(source)],
  ['clears live records while offline', /Offline · live camera locations and previews are cleared/.test(source)],
  ['aborts requests and disposes the globe layer', /controller\?\.abort\(\)[\s\S]*layerDispose\?\.\(\)/.test(source)],
  ['does not request geolocation', !/geolocation|getCurrentPosition|watchPosition/.test(source)],
  ['does not alter Home navigation or Orb geometry', !/navButtons|orbShell|orbButton/.test(source)]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
if (failed) process.exitCode = 1;
