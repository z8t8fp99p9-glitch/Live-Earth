const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');
const start = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const end = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', start);
assert.ok(start >= 0 && end > start);
const landscape = source.slice(start, end);
assert.ok(landscape.includes('rgba(190,91,67,.24)'));
assert.ok(landscape.includes('rgba(75,105,89,.34)'));
assert.ok(landscape.includes('repeating-linear-gradient(4deg'));
assert.ok(landscape.includes('rgba(103,128,103,.34)'));
assert.ok(landscape.includes('filter:blur(9px);'));
// This patch is background-only: typography declarations are not changed by this test's target patch.
assert.ok(landscape.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(landscape.includes('font-size:clamp(17px,1.9vw,20px);'));
console.log('Landscape background-only polish passed; Weather typography remains on its approved values.');
