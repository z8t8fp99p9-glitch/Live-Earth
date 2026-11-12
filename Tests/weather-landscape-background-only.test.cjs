const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'Weather', 'weather-view.js'),
  'utf8'
);
const start = source.indexOf(
  '@media (orientation:landscape) and (min-width:650px) {'
);
const end = source.indexOf(
  '@media (orientation:landscape) and (min-width:650px) and (max-width:820px)',
  start
);

assert.ok(start >= 0 && end > start, 'Expected the primary Landscape CSS block.');
const landscape = source.slice(start, end);

// Match the currently approved, restrained washi background in production.
assert.ok(
  landscape.includes('radial-gradient(ellipse at 3% 4%,rgba(190,91,67,.12) 0,transparent 23%)'),
  'Landscape warm accent should remain at the approved subtle .12 opacity.'
);
assert.ok(landscape.includes('radial-gradient(ellipse at 98% 8%,rgba(138,151,126,.13) 0,transparent 25%)'));
assert.ok(landscape.includes('radial-gradient(ellipse at 7% 100%,rgba(91,116,99,.20) 0,transparent 30%)'));
assert.ok(landscape.includes('radial-gradient(ellipse at 94% 100%,rgba(91,116,99,.18) 0,transparent 32%)'));
assert.ok(landscape.includes('radial-gradient(ellipse at 48% 88%,rgba(196,205,185,.25) 0,transparent 44%)'));
assert.ok(landscape.includes('linear-gradient(180deg,rgba(249,245,236,.18),rgba(239,237,226,.035) 55%,rgba(211,218,204,.13))'));

// Preserve the approved Weather typography while this test guards the background only.
assert.ok(landscape.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(landscape.includes('font-size:clamp(17px,1.9vw,20px);'));

console.log('Landscape background-only polish passed; approved background and Weather typography are preserved.');
