const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

// The selector must be available in the production Weather view, not a separate test page.
assert.ok(source.includes('id="le-weather-mode-select"'));
for (const mode of ['auto','clear','cloudy','rain','storm','snow','fog','night']) {
  assert.ok(source.includes(`<option value="${mode}"`), `Missing Weather scene option: ${mode}`);
}
assert.ok(source.includes('PREVIEW · SAMPLE'));
assert.ok(source.includes('applyPreview(mode)'));
assert.ok(source.includes("window.liveEarthLocationAllowed?.()"));
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(source));

// Test the six sample data fixtures; each one must drive real UI render functions
// while staying explicitly identified as sample data.
const start = source.indexOf('  function localWallTime(date) {');
const end = source.indexOf('  function makeScreen() {', start);
assert.ok(start >= 0 && end > start, 'Preview fixture helpers must exist');
const helpers = source.slice(start, end);
const api = vm.runInNewContext(`(() => { ${helpers}; return { makePreviewData }; })()`);
const expected = {
  clear: [27, 0, 0], cloudy: [22, 3, 0], rain: [17, 63, 2.8],
  storm: [15, 95, 6.2], snow: [1, 73, .8], fog: [8, 45, 0], night: [27, 0, 0]
};
for (const [mode, [temperature, code, amount]] of Object.entries(expected)) {
  const data = api.makePreviewData(mode);
  assert.equal(Number(data.current.temperature_2m), temperature, `${mode} temperature`);
  assert.equal(Number(data.current.weather_code), code, `${mode} condition code`);
  assert.ok(Array.isArray(data.hourly.time) && data.hourly.time.length === 6, `${mode} six-hour forecast`);
  assert.ok(Array.isArray(data.daily.temperature_2m_max), `${mode} daily high`);
  assert.equal(Number(data.current.precipitation), amount, `${mode} precipitation`);
  if (mode === 'night') assert.equal(Number(data.current.is_day), 0, 'night preview forces night lighting');
}

// Responsive contract: landscape is an actual two-column composition; portrait
// gets compact spacing and a real dock-clearance scroll area.
assert.ok(source.includes('@media(orientation:landscape) and (min-width:760px) and (min-height:500px)'));
assert.ok(source.includes('./Weather/Assets/weather-scene-landscape.webp'));
assert.ok(source.includes('media="(orientation: landscape) and (min-width: 760px)"'));
assert.ok(source.includes('<picture class="le-weather-art-picture">'));
assert.ok(source.includes('grid-template-areas:"top top" "date date" "hero summary" "hours metrics"'));
assert.ok(source.includes('padding-bottom:calc(env(safe-area-inset-bottom) + 236px)'));
assert.ok(source.includes('deviceDateTime()'));
assert.ok(source.includes('clockTimer = window.setInterval(updateLocalClock, 30000)'));
console.log('Weather preview selector, seven sample scenes including night, device time, Location privacy, separate landscape artwork and responsive layout checks passed.');
