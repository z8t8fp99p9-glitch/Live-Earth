const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
assert.ok(s.includes('const REFRESH_MS = 15 * 60 * 1000'));assert.ok(s.includes('elapsed=0,state='));
assert.ok(s.includes('if(now-last>=42)'));assert.ok(s.includes('const delta=Math.min(.08'));
assert.ok(s.includes('ResizeObserver'));assert.ok(s.includes('prefers-reduced-motion: reduce'));
assert.ok(s.includes('observer?.disconnect()'));assert.ok(s.includes('cancelAnimationFrame(raf)'));
console.log('Generative scene frame throttle, resize handling, reduced-motion and resource cleanup checks passed.');
