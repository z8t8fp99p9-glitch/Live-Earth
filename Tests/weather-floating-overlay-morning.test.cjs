const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');
const stylesStart = weather.indexOf('style.textContent = `');
const stylesEnd = weather.indexOf('document.head.appendChild(style)', stylesStart);
assert.ok(stylesStart >= 0 && stylesEnd > stylesStart, 'Weather must own an installable immersive overlay style block');
const styles = weather.slice(stylesStart, stylesEnd);

assert.match(styles, /\.le-sfv--weather \.le-sfv-panel\{[^}]*background:linear-gradient/, 'The UI panel must remain transparent over the 3D world');
assert.match(styles, /\.le-sfv--weather \.le-weather-world-stage\{position:absolute;inset:0/, 'The world must fill the full Weather view');
assert.match(styles, /\.le-sfv--weather \.le-weather-timeline\{[^}]*backdrop-filter:blur/, 'The forecast shelf must retain its layered morphism material');
assert.match(styles, /\.le-sfv--weather \.le-weather-hour\[aria-pressed="true"\]/, 'Selected forecast hour must have a readable active state');
assert.match(styles, /\.le-sfv--weather \.le-weather-main-readout\{display:grid/, 'Current conditions must remain readable over the world');
assert.match(styles, /env\(safe-area-inset-top\)/, 'Top controls must respect device safe areas');
assert.match(styles, /env\(safe-area-inset-bottom\)/, 'Bottom controls must respect device safe areas and the dock');
assert.match(styles, /@media\(orientation:portrait\)/, 'Portrait layout must be explicitly defined');
assert.match(styles, /@media\(orientation:landscape\) and \(min-width:560px\)/, 'Landscape layout must become a balanced two-column composition');
assert.match(styles, /grid-template-columns:minmax\(0,\.82fr\) minmax\(0,1\.18fr\)/, 'Landscape conditions and forecast must occupy separate adaptive columns');
assert.match(styles, /@media\(min-width:760px\) and \(orientation:portrait\)/, 'Tablet portrait must use a wider reading column');
assert.match(styles, /@media\(max-height:520px\) and \(orientation:landscape\)/, 'Short landscape view must compress safely');
assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/, 'Reduced-motion users must retain a static scene');
assert.ok(weather.includes("if (hour >= 5 && hour <= 7) return 'dawn'"), '05:00-07:00 local time must produce dawn lighting');
assert.ok(weather.includes("if (hour >= 16 && hour <= 19) return 'evening'"), '16:00-19:00 local time must produce evening lighting');
assert.ok(weather.includes("if (Number(item.isDay) === 0 || hour >= 20 || hour < 5) return 'night'"), 'Night must follow the selected local forecast hour');
assert.ok(weather.includes('resizeObserver?.disconnect()'), 'Renderer resize observer must be released on close');
assert.ok(weather.includes('renderer.forceContextLoss?.()'), 'Renderer must release WebGL context on close');
assert.ok(!/resident|Residents|people svg|data-resident-host/i.test(styles), 'No character-specific visual layer may remain');

console.log('Adaptive Weather layout, forecast shelf, local day phases and cleanup checks passed.');
