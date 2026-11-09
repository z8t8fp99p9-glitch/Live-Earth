const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');

const stylesStart = weather.indexOf('style.textContent = `');
const stylesEnd = weather.indexOf('document.head.appendChild(style)', stylesStart);
assert.ok(stylesStart >= 0 && stylesEnd > stylesStart, 'Weather must own an installable style block');
const styles = weather.slice(stylesStart, stylesEnd);
assert.match(styles, /\.le-sfv--weather \.le-sfv-panel\{[^}]*background:transparent!important/, 'Weather must retain the transparent floating panel');
assert.match(styles, /\.le-sfv--weather \.le-sfv-body>\.le-sfv-card\{border:0!important;border-radius:0!important;background:transparent!important/, 'Forecast cards must float without boxed backgrounds');
assert.match(styles, /\.le-sfv--weather \.le-weather-metric\{padding:0;border:0;border-radius:0;background:none/, 'Metrics must remain plain floating text');
assert.match(styles, /\.le-sfv--weather \.le-sfv-subtitle\{display:none!important\}/, 'The long subtitle must not consume top-screen space');
assert.match(styles, /\.le-sfv--weather \.le-sfv-body>.le-sfv-status\{[^}]*background:none/, 'Weather status must remain floating text');
assert.match(styles, /\.le-sfv--weather \.le-weather-hour\{flex-basis:54px/, 'Hourly forecast cards must remain compact');
assert.match(styles, /\.le-weather-landscape\{position:absolute/, 'The illustrated landscape must remain the foreground artwork');
assert.ok(!/resident|Residents|people svg|data-resident-host/i.test(styles), 'No resident-specific styles or overlay should remain');

assert.match(weather, /const night = hour >= 20 \|\| hour < 5;/, 'Night must follow the selected local forecast hour');
assert.match(weather, /const dawn = hour >= 5 && hour <= 7;/, '05:00-07:00 local forecast must be treated as dawn');
assert.match(weather, /const phase = night \? 'night' : dawn \? 'dawn' : evening \? 'evening' : 'day';/, 'The scene must keep its dawn/day/evening/night phases');
assert.ok(weather.includes("removeEventListener('live-earth-location-state'"), 'Location listeners must be removed on deactivation');
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must not request Location permission directly');
assert.ok(!/resident|Residents|LiveEarthResidentLibrary|data-resident-host/i.test(weather), 'The Weather module must be entirely free of Residents references');

console.log('Weather floating layout, local dawn classification and resident-free scene checks passed.');
