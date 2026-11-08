const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'Earth/earth-orb-globe.js'), 'utf8');
assert.match(source, /applyHomeOrientation\(group\)/, 'Earth Modes must apply Home group orientation.');
assert.doesNotMatch(source, /earth\.rotation\.y\s*=\s*-?0\.35/, 'Earth Modes must not add the old -0.35 radian surface offset.');
assert.match(source, /group\.add\(earth\);\s*\/\//, 'Earth surface must be attached without a secondary rotation offset.');
console.log('Earth Modes surface alignment test passed.');
