const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Weather', 'weather-view.js'), 'utf8');

// Landscape masthead and content stay inside both physical safe areas.
assert.ok(source.includes('grid-template-columns:minmax(0,1fr) auto auto auto;'));
assert.ok(source.includes('padding-left:max(env(safe-area-inset-left),clamp(26px,3.4vw,42px))'));
assert.ok(source.includes('padding-right:max(env(safe-area-inset-right),clamp(26px,3.4vw,42px))'));
assert.ok(source.includes('font-size:clamp(12px,1.35vw,14px)'));
assert.ok(source.includes('font-size:clamp(9px,1.05vw,11px)'));

// Keep the 36/64 Weather-to-Live-Art balance and let only the Weather canvas bleed left.
assert.ok(source.includes('grid-template-columns:minmax(210px,.56fr) minmax(0,1fr);'));
const landscapeStart = source.indexOf('@media (orientation:landscape) and (min-width:650px) {');
const landscapeEnd = source.indexOf('@media (orientation:landscape) and (min-width:650px) and (max-width:820px)', landscapeStart);
assert.ok(landscapeStart >= 0 && landscapeEnd > landscapeStart);
const landscape = source.slice(landscapeStart, landscapeEnd);
assert.ok(landscape.includes('grid-template-rows:minmax(0,1fr) auto;'));
assert.ok(landscape.includes('grid-template-areas:"scene" "summary";'));
assert.ok(landscape.includes('padding-bottom:clamp(22px,7vh,30px);'));
assert.ok(landscape.includes('--le-weather-scene-flow-x:clamp(82px,8.7vw,132px);'));
assert.ok(landscape.includes('width:calc(100% + var(--le-weather-landscape-gap) + (2 * var(--le-weather-scene-flow-x)));'));
assert.ok(landscape.includes('margin-left:calc(-1 * var(--le-weather-scene-flow-x));'));
assert.ok(landscape.includes('z-index:2;'));
assert.ok(landscape.includes('z-index:3;'));
assert.ok(landscape.includes('z-index:5;'));
assert.ok(landscape.includes('.le-weather-dashboard::before'));
assert.ok(landscape.includes('font-size:clamp(40px,4.15vw,57px);'));
assert.ok(landscape.includes('font-size:clamp(72px,5.8vw,94px);'));
assert.ok(landscape.includes('top:clamp(108px,19vh,140px);'));
assert.ok(landscape.includes('position:absolute;\n          z-index:4;\n          top:0;'));
assert.ok(landscape.includes('min-height:120px;'));

// Rain Chance no longer sits on an opaque strip. The hairlines fade into the background.
assert.ok(landscape.includes('background:transparent;\n          backdrop-filter:none;\n          -webkit-backdrop-filter:none;'));
assert.ok(landscape.includes('color-mix(in srgb,var(--muted) 10%,transparent) 5%'));
assert.ok(landscape.includes('color-mix(in srgb,var(--muted) 25%,transparent) 50%'));
assert.ok(landscape.includes('.le-weather-summary::before { top:0;opacity:.82; }'));
assert.ok(landscape.includes('.le-weather-summary::after { bottom:0;opacity:.58; }'));
assert.ok(!landscape.includes('backdrop-filter:blur(2px);'));

// The copy alignment is tied to the masthead; the masthead itself is not edited.
assert.ok(landscape.includes('left:var(--le-weather-scene-flow-x);'));
assert.ok(source.includes('LIVE <span>//</span> EARTH'));
assert.ok(source.includes('transform:translate3d(0,2.4vh,0) scale(1.11);'));
assert.ok(source.includes('transform:translate3d(0,2.3vh,0) scale(1.31);'));

// Temporary layout editor is fully removed, including injection and styling.
for (const token of ['installVisualLayoutEditor','layoutEditorCleanup','EDIT SIZE & POSITION','le-weather-layout-edit','le-layout-editing','data-le-layout']) {
  assert.ok(!source.includes(token), `Editor residue remains: ${token}`);
}

// Portrait, Live Art and shared Orb dock remain protected.
assert.ok(source.includes('aspect-ratio:10 / 7;'));
assert.ok(source.includes("document.getElementById('le-feature-dock')"));
assert.ok(!/#le-feature-dock\s*\{/.test(source));
assert.ok(!/weatherDock\.style\.(?:bottom|top|left|right|transform|width|height)/.test(source));

console.log('Landscape safe areas, weather-only canvas bleed, masthead-aligned text, seamless Rain Chance rules, editor removal and protected Live Art/Portrait/dock passed.');
