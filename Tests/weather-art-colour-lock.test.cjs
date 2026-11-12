const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

const weatherPaletteStart = source.indexOf('const palette=()=>');
const weatherPaletteEnd = source.indexOf('const line=', weatherPaletteStart);
assert.ok(weatherPaletteStart >= 0 && weatherPaletteEnd > weatherPaletteStart);
const weatherPalette = source.slice(weatherPaletteStart, weatherPaletteEnd);
assert.ok(!weatherPalette.includes('state.phase'), 'Weather illustration palette must not change with day/night.');

const studioPaletteStart = source.indexOf('const colors=()=>({');
const studioPaletteEnd = source.indexOf('function strokeOne(', studioPaletteStart);
assert.ok(studioPaletteStart >= 0 && studioPaletteEnd > studioPaletteStart);
const studioPalette = source.slice(studioPaletteStart, studioPaletteEnd);
assert.ok(!studioPalette.includes('current?.phase'), 'Live Art palette must not change with day/night.');

const frameStart = source.indexOf('function drawFrame(progress)');
const moonMarker = source.indexOf('// A clear moon after dark', frameStart);
assert.ok(frameStart >= 0 && moonMarker > frameStart);
const frameBase = source.slice(frameStart, moonMarker);
assert.ok(!frameBase.includes("current?.phase==='night'"), 'Live Art paper wash/grain must keep the same colours at night.');

assert.ok(source.includes("const kind=state.phase==='night'?'night'"), 'Scene shape/content may still respond to night.');
assert.ok(source.includes("const artKind=screen.__weatherState.phase==='night'?'night'"), 'Live Art subject selection may still respond to night.');
assert.ok(source.includes("const palette=()=>({ink:'#27332d'"), 'Weather illustration must use the fixed approved ink palette.');
assert.ok(source.includes("ink:'#26312b',"), 'Live Art must use the fixed approved ink palette.');
assert.ok(source.includes("paper:'#f3efe5',"), 'Live Art paper colour must remain fixed.');
console.log('Weather and Live Art artwork colour-lock passed: stable palettes across day/night; scene content and weather effects remain responsive.');
