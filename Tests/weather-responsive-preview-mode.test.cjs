const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
assert.ok(s.includes('id="le-weather-mode-select"'));
for(const mode of ['auto','clear','cloudy','rain','storm','snow','fog','wind','night','hot'])assert.ok(s.includes(`<option value="${mode}"`),`Missing scene mode ${mode}`);
assert.ok(s.includes('SAMPLE SCENE'));assert.ok(s.includes('manualPreview=mode!==\'auto\''));assert.ok(s.includes('function sampleData(kind)'));
assert.ok(s.includes('deviceClock()'));assert.ok(s.includes('clockTimer=window.setInterval(updateLocalClock,30000)'));
assert.ok(s.includes('Location is off. Choose a weather mode'));
console.log('Live/sample selector, ten test conditions, clear sample labelling and device clock checks passed.');
