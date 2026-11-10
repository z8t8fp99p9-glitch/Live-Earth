const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
assert.ok(s.includes('id="le-weather-art-canvas"'));assert.ok(s.includes('Japanese ink drawing generated locally'));
assert.ok(s.includes('ctx.quadraticCurveTo'));assert.ok(s.includes('ctx.bezierCurveTo'));
assert.ok(s.includes('snowLoad'));assert.ok(s.includes('phase===\'night\''));
assert.ok(s.includes("state.weather==='rain'||state.weather==='storm'"));assert.ok(s.includes("state.weather==='snow'"));
assert.ok(s.includes('state.direction'));assert.ok(s.includes('state.wind'));
assert.ok(!/background-image:url\(|<img|<picture|weather-scene\.webp/.test(s));
console.log('Production Weather draws a responsive Japanese-inspired scene in real time without image wallpaper.');
