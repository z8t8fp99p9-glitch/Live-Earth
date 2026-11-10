const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
assert.ok(s.includes('overflow-x:hidden;overflow-y:auto'));assert.ok(s.includes('padding:calc(env(safe-area-inset-top) + 17px)'));
assert.ok(s.includes('calc(env(safe-area-inset-bottom) + 214px)'));assert.ok(s.includes('calc(env(safe-area-inset-bottom) + 226px)'));
assert.ok(s.includes('view.panel.remove()'));assert.ok(s.includes('view.root.replaceChildren(screen)'));
assert.ok(s.includes('grid-template-areas:"top top" "date date" "hero art" "summary art" "hours hours"'));
assert.ok(s.includes('le-weather-summary'));assert.ok(s.includes('le-weather-hourly-section'));
console.log('Compact portrait scroll clearance and two-column landscape layout checks passed.');
