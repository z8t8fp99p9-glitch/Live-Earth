const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const extension = fs.readFileSync(path.join(root, 'Weather', 'Art', 'service-worker-extension.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'Weather', 'Art', 'live-art-online.js'), 'utf8');

assert.ok(extension.includes("const rendererPath = './Weather/Art/live-art-online.js'"));
assert.ok(extension.includes('APP_SHELL.push(rendererPath)'),
  'The compatibility stub must remain available to older cached Home documents.');
assert.doesNotMatch(extension, /transformHomeHTML\s*=|new Response|<script|scriptAlreadyInjected/,
  'The service-worker extension must not inject the legacy renderer into new Home responses.');
assert.doesNotMatch(renderer, /MutationObserver|querySelector|addEventListener|fetch\(|requestAnimationFrame/,
  'The retired renderer must remain an inert compatibility stub.');

console.log('Legacy Weather Art injection is retired; offline compatibility remains inert.');
