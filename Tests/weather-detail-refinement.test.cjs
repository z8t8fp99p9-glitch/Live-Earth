const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
assert.ok(s.includes('getContext(\'2d\''));assert.ok(s.includes('function drawBambooAndLeaves'));assert.ok(s.includes('function drawMountains'));assert.ok(s.includes('function drawWater'));assert.ok(s.includes('function drawPagoda'));
assert.ok(s.includes('LIVE ART · PAINTING THE WEATHER'));assert.ok(s.includes('function makeArtStudioPainter(canvas,onProgress)'));assert.ok(s.includes('const JAPANESE_ART_LIBRARY = ['));
assert.ok(!s.includes('weather-scene.webp'));assert.ok(!s.includes('weather-scene-landscape.webp'));assert.ok(!s.includes('<picture'));
assert.ok(!/characterMarkup|le-weather-person|le-weather-people|le-weather-ball|日本語/.test(s));
console.log('Paper-ground generative Japanese landscape replaces wallpaper; restrained art and no-character checks passed.');
