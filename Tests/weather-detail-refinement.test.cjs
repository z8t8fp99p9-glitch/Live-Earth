const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

assert.ok(source.includes('viewBox="0 0 420 300"'));
assert.ok(source.includes('preserveAspectRatio="xMidYMax slice"'));
assert.ok(source.includes('le-weather-landscape'));
assert.ok(source.includes('M0 83 Q62 44 121 91'));
assert.ok(source.includes('M0 133 Q67 82 144 131'));
assert.ok(source.includes('M0 174 Q79 127 158 174'));
assert.ok(source.includes('le-weather-cloud--one'));
assert.ok(source.includes('le-weather-cloud--two'));
assert.ok(source.includes('le-weather-cloud--three'));
assert.ok(source.includes('prefers-reduced-motion:reduce'));
assert.doesNotMatch(source, /CHARACTER_POSITIONS|characterMarkup|le-weather-person|le-weather-people|le-weather-ball/);
console.log('Original ZIP 2D scene geometry and character-free illustration checks passed.');
