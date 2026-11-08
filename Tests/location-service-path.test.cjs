const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const exists = (file) => fs.existsSync(path.join(__dirname, '..', file));

const locationServicePath = 'Location/location.js';
assert.ok(exists(locationServicePath), 'Shared Location service must exist in Location/');
assert.ok(!exists('Location/location-orb-controller.js'), 'Previous controller-style filename must be removed');
assert.ok(!exists('Location/location-scanner.js'), 'Original ambiguous filename must remain removed');

const locationService = read(locationServicePath);
assert.match(locationService, /navigator\.geolocation\.watchPosition/, 'Location service must own the GPS watch');
assert.match(locationService, /window\.__liveEarthLocationScannerInstalled = true/, 'Legacy readiness marker must remain for compatibility');
assert.match(locationService, /liveEarthLocationAllowed/, 'Location service must expose the existing permission/fresh-fix API');
assert.match(locationService, /#navButtons \.orbButton\[data-view="location"\]/, 'Location service must bind the Home Location Orb');

const earth = read('Earth/earth-view-controller.js');
assert.match(earth, /id = "le-location-scanner"/, 'Earth View must own the visible Scanner button');
assert.match(earth, /liveEarthLocationAllowed\?\.\(\) !== true/, 'Earth Scanner must require already-approved Location');
assert.doesNotMatch(earth, /navigator\.geolocation/, 'Earth Scanner must never request geolocation');

const index = read('index.html');
assert.ok(index.includes(`./${locationServicePath}`), 'App shell must load the Location service');
assert.ok(!index.includes('location-scanner.js'), 'App shell must not retain the old script path');

const worker = read('sw.js');
assert.ok(worker.includes(`./${locationServicePath}`), 'Service-worker shell/recovery must use the Location service');
assert.ok(worker.includes('if (!html.includes("location.js"))'), 'Startup fallback injection must detect the Location service');
assert.ok(worker.includes("'./Location/location.js'"), 'Startup script-error repair must use the Location service');
assert.ok(!worker.includes('location-scanner.js'), 'Service worker must not retain the original script path');
assert.ok(!worker.includes('location-orb-controller.js'), 'Service worker must not retain the intermediate filename');
assert.ok(worker.includes('v126-quaternion-stable-earth-drag'), 'Service worker build identity must be advanced');
assert.ok(read('Global/update-manager.js').includes('v126-quaternion-stable-earth-drag'), 'Update manager identity must match service worker');

console.log('Location service path and Earth Scanner ownership checks passed.');
