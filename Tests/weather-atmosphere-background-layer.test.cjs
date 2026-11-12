const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const start = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const end = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', start);
assert.ok(start >= 0 && end > start, 'Landscape background block must exist.');
const landscape = source.slice(start, end);
const match = landscape.match(/url\("data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)"\)/);
assert.ok(match, 'One embedded watercolor background layer must be present.');
const svg = Buffer.from(match[1], 'base64').toString('utf8');
assert.ok(svg.includes('<svg'));
assert.ok(svg.includes('viewBox="0 0 1800 900"'));
assert.ok(svg.includes('fill="url(#far)"'));
assert.ok(svg.includes('fill="url(#middle)"'));
assert.ok(svg.includes('fill="url(#front)"'));
assert.ok(svg.includes('feGaussianBlur'));
assert.ok(landscape.includes('position:fixed;'));
assert.ok(landscape.includes('z-index:0;'));
assert.ok(landscape.includes('pointer-events:none;'));
assert.ok(landscape.includes('background-position:0 0,0 0,0 0,0 0,0 0,0 0,center bottom;'));
assert.ok(landscape.includes('background-repeat:no-repeat;'));

// Existing layout geometry and editor removal remain protected.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes('function drawMinimalLandscape(p,t)'));
assert.ok(!source.includes('installVisualLayoutEditor'));
assert.ok(!source.includes('le-weather-layout-edit-toggle'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));

console.log('Single low-contrast washi mountain background layer passed; layout, Live Art, and Orb dock remain protected.');
