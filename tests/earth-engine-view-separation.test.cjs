const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

class Geometry { constructor(radius, width, height) { this.parameters = { radius, width, height }; this.disposed = false; } dispose() { this.disposed = true; } }
class Material { constructor(options) { Object.assign(this, options); this.disposed = false; } dispose() { this.disposed = true; } }
class Node3D { constructor() { this.children = []; this.parent = null; this.rotation = { y: 0 }; } add(node) { node.parent = this; this.children.push(node); } removeFromParent() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); this.parent = null; } }
class Mesh extends Node3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class Texture { constructor(url) { this.url = url; this.disposed = false; this.anisotropy = 1; } dispose() { this.disposed = true; } }
let textureLoads = 0;
class TextureLoader { load(url, done) { textureLoads++; const texture = new Texture(url); queueMicrotask(() => done(texture)); return texture; } }
const THREE = { Group: Node3D, Mesh, SphereGeometry: Geometry, MeshStandardMaterial: Material, MeshBasicMaterial: Material, TextureLoader, SRGBColorSpace: 'srgb', BackSide: 2, AdditiveBlending: 3 };

(async () => {
  const homeIndex = read('index.html');
  const homeModule = homeIndex.match(/<script type="module">\s*if \(window\.__leBootControlledAtStart[\s\S]*?<\/script>/)?.[0];
  assert.ok(homeModule, 'Original Home Earth inline module must remain present.');
  assert.ok(homeModule.includes('new T.WebGLRenderer'), 'Home Earth renderer must remain inline and untouched.');
  assert.equal(crypto.createHash('sha256').update(homeModule).digest('hex'), '4aaa570fc56266319eb2831e6d40ccbfeb49765a082bab044c428c5bdd795384', 'Home Earth inline renderer must remain byte-for-byte unchanged.');
  assert.ok(homeIndex.includes("'./earth-view-controller.js'"), 'Bootstrap must load the renamed Earth View Controller.');
  assert.ok(!homeIndex.includes("'./earth-mode-navigation.js'"), 'Old controller path must be retired.');

  const engineSource = read('earth-engine.js');
  assert.ok(engineSource.includes('export async function createEarthGlobe'), 'Reusable Earth Engine export is required.');
  assert.ok(engineSource.includes('textureRecords'), 'Earth Engine must share loaded textures safely.');
  const engine = await import(pathToFileURL(path.join(root, 'earth-engine.js')).href);
  const [first, second] = await Promise.all([
    engine.createEarthGlobe({ THREE, radius: 1, textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png', quality: 'basic', initialRotationY: -0.35 }),
    engine.createGlobe({ THREE, radius: 0.5, textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png', quality: 'basic' })
  ]);
  assert.equal(textureLoads, 1, 'Concurrent views must share a single surface texture load.');
  assert.notEqual(first.group, second.group, 'Each view must receive an independent Earth group.');
  assert.notEqual(first.surface, second.surface, 'Each view must receive an independent Earth surface mesh.');
  assert.equal(first.surface.rotation.y, -0.35, 'Initial texture alignment must be retained.');
  assert.equal(first.surface.geometry.parameters.width, 64, 'Basic geometry quality must be applied.');
  first.setQuality('hd');
  assert.equal(first.surface.geometry.parameters.width, 96, 'HD quality must replace only the selected instance geometry.');
  assert.equal(second.surface.geometry.parameters.radius, 0.5, 'The second view radius must remain independent.');
  const sharedTexture = first.surface.material.map;
  first.dispose();
  assert.equal(sharedTexture.disposed, false, 'Disposing one view must not invalidate another view texture.');
  second.dispose();
  assert.equal(sharedTexture.disposed, true, 'The shared texture must be released after the final view disposes.');
  const third = await engine.createEarthGlobe({ THREE, textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png' });
  assert.equal(textureLoads, 2, 'A later view must load a fresh texture after the previous shared texture was disposed.');
  assert.notEqual(third.surface.material.map, sharedTexture, 'A disposed shared texture must never be reused.');
  third.dispose();

  const controller = read('earth-view-controller.js');
  assert.ok(controller.includes('import("./earth-engine.js")'), 'Earth View Controller must use the reusable Engine.');
  assert.ok(controller.includes('earth-independent-renderer'), 'Independent Earth view registration must remain intact.');
  assert.ok(!controller.includes('moon-orbit.js'), 'Independent Earth View must not import the Home Moon orbit.');
  assert.ok(!/LiveEarthScene\.(?:unlock|lock|zoomBy)\s*\(/.test(controller), 'Earth View must not manipulate Home renderer state.');

  const sw = read('sw.js');
  const manager = read('update-manager.js');
  assert.ok(sw.includes('"./earth-engine.js"') && sw.includes('"./earth-view-controller.js"'), 'Both new Earth files must be in the essential offline app shell.');
  assert.ok(!sw.includes('earth-mode-navigation.js'), 'The old controller path must not remain in the service worker.');
  assert.ok(sw.includes('v114-reusable-earth-engine') && manager.includes('v114-reusable-earth-engine'), 'Service worker and update manager build IDs must match.');
  assert.ok(sw.includes('window.__liveEarthEarthRendererInstalled === true'), 'Startup gate must verify the Earth View Controller.');
  assert.ok(manager.includes('window.__liveEarthEarthRendererInstalled === true'), 'Update manager must verify the Earth View Controller.');
  assert.ok(sw.includes('html = injectSameGlobeAPI(html);') && sw.includes('html = injectSolarDayNight(html);'), 'Existing Home Earth service-worker injections must remain intact.');
  console.log(JSON.stringify({ earthEngine: 'passed', perViewGlobeIsolation: 'passed', sharedTextureLifecycle: 'passed', homeInlineRenderer: 'preserved', independentEarthController: 'passed', offlineShellWiring: 'passed' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
