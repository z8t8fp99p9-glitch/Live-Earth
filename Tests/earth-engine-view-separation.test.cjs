const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

class Geometry {
  constructor(radius, width, height) {
    this.type = 'SphereGeometry';
    this.parameters = { radius, width, height };
    this.disposed = false;
  }
  dispose() { this.disposed = true; }
}
class Material {
  constructor(options, type) {
    Object.assign(this, options);
    this.type = type;
    this.disposed = false;
  }
  dispose() { this.disposed = true; }
}
class StandardMaterial extends Material {
  constructor(options) { super(options, 'MeshStandardMaterial'); }
}
class BasicMaterial extends Material {
  constructor(options) { super(options, 'MeshBasicMaterial'); }
}
class Node3D {
  constructor() {
    this.children = [];
    this.parent = null;
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(node) {
    node.parent = this;
    this.children.push(node);
  }
  removeFromParent() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(item => item !== this);
    this.parent = null;
  }
}
class Mesh extends Node3D {
  constructor(geometry, material) {
    super();
    this.isMesh = true;
    this.geometry = geometry;
    this.material = material;
  }
}
class Texture {
  constructor(url) {
    this.url = url;
    this.disposed = false;
    this.anisotropy = 1;
  }
  dispose() { this.disposed = true; }
}
let textureLoads = 0;
class TextureLoader {
  load(url, onLoad) {
    textureLoads++;
    const texture = new Texture(url);
    queueMicrotask(() => onLoad(texture));
    return texture;
  }
}
const THREE = {
  Group: Node3D,
  Mesh,
  SphereGeometry: Geometry,
  MeshStandardMaterial: StandardMaterial,
  MeshBasicMaterial: BasicMaterial,
  TextureLoader,
  SRGBColorSpace: 'srgb',
  BackSide: 2,
  AdditiveBlending: 3
};

(async () => {
  const homeIndex = read('index.html');
  const homeModule = homeIndex.match(/<script type="module">\s*if \(window\.__leBootControlledAtStart[\s\S]*?<\/script>/)?.[0];
  assert.ok(homeModule, 'Home Earth module must remain in index.html.');
  assert.ok(homeModule.includes("import('./Global/earth-engine.js')"), 'Home must create its globe through Earth Engine.');
  assert.ok(homeModule.includes("geometryDetail: 'high'"), 'Home must use one fixed high-detail sphere profile.');
  assert.ok(!homeModule.includes('initialRotationY'), 'Home must not override the Global Engine base calibration.');
  assert.ok(!/\bquality\b|\bBasic\b|\bHD\b|setQuality|zoomBy|pinch/i.test(homeModule), 'Home module must not contain Basic/HD quality or zoom controls.');
  assert.ok(homeModule.includes('const group = earthGlobe.group;'), 'Engine group identity must remain Home\'s transform group.');
  assert.ok(homeModule.includes('const earth = earthGlobe.surface;'), 'Engine surface identity must remain Home\'s Earth mesh.');
  assert.ok(homeModule.includes('scene.add(group);'), 'Home must attach the Engine group directly to its own scene.');
  assert.ok(homeModule.includes('createMoonOrbit(T, group'), 'The Home Moon orbit must receive that exact Engine group.');
  assert.ok(homeModule.includes('// LIVE_EARTH_HOME_RENDERER_HOOKS'), 'Service-worker injections must use the stable named hook.');
  assert.ok(!homeModule.includes('new T.SphereGeometry'), 'Home must not construct a duplicate Earth sphere.');
  assert.ok(!homeModule.includes('new T.MeshStandardMaterial'), 'Home must not construct a duplicate Earth surface material.');
  assert.ok(!homeModule.includes('new T.TextureLoader'), 'Home must not load the Earth texture outside Earth Engine.');
  assert.ok(homeModule.includes('displayDistanceFactor: 0.04'), 'The existing Home Moon orbit display scale must remain unchanged.');
  assert.ok(homeModule.includes('displayMoonRadius: 0.32'), 'The existing Home Moon display radius must remain unchanged.');
  assert.ok(homeIndex.includes('Drag with one finger to rotate.'), 'Home canvas guidance must reflect its fixed zoom and rotation-only gesture.');

  const engineSource = read('Global/earth-engine.js');
  assert.ok(engineSource.includes('export async function createEarthGlobe'), 'Reusable Earth Engine export is required.');
  assert.ok(engineSource.includes('textureRecords'), 'Earth Engine must safely share loaded textures.');
  assert.ok(engineSource.includes('setGeometryDetail'), 'Engine must expose a generic geometry-detail API.');
  assert.ok(engineSource.includes('const EARTH_BASE_SURFACE_ROTATION_Y = -0.35;'), 'Global Earth Engine must own the one canonical surface calibration.');
  assert.ok(engineSource.includes('surface.rotation.y = EARTH_BASE_SURFACE_ROTATION_Y;'), 'Every Engine-created Earth must use the canonical base surface orientation.');
  assert.ok(!/\bquality\b|\bBasic\b|\bHD\b|setQuality/i.test(engineSource), 'Engine must not own Independent Earth View UI naming.');
  const engine = await import(pathToFileURL(path.join(root, 'Global/earth-engine.js')).href);

  const homeGlobe = await engine.createEarthGlobe({
    THREE,
    radius: 1,
    textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png',
    geometryDetail: 'high'
  });
  assert.equal(homeGlobe.surface.geometry.parameters.width, 96, 'Home fixed high detail must match its former 96-segment sphere.');
  assert.equal(homeGlobe.surface.geometry.parameters.height, 64, 'Home fixed high detail must match its former 64-segment sphere.');
  assert.equal(homeGlobe.surface.rotation.y, -0.35, 'Home surface longitude alignment must be retained.');

  assert.equal(homeGlobe.group.children[0], homeGlobe.surface, 'The Engine-owned surface remains the first direct child in Home group.');

  const [first, second] = await Promise.all([
    engine.createEarthGlobe({ THREE, radius: 1, textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png', geometryDetail: 'standard' }),
    engine.createGlobe({ THREE, radius: 0.5, textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png', geometryDetail: 'standard' })
  ]);
  assert.equal(textureLoads, 1, 'Concurrent views must share a single surface texture load.');
  assert.notEqual(first.group, second.group, 'Each view must receive an independent Earth group.');
  assert.notEqual(first.surface, second.surface, 'Each view must receive an independent Earth surface mesh.');
  assert.equal(first.surface.geometry.parameters.width, 64, 'Standard geometry detail must use 64 width segments.');
  first.setGeometryDetail('high');
  assert.equal(first.surface.geometry.parameters.width, 96, 'High geometry detail must replace only the selected instance geometry.');
  assert.equal(second.surface.geometry.parameters.radius, 0.5, 'The second view radius must remain independent.');

  const sharedTexture = first.surface.material.map;
  first.dispose();
  assert.equal(sharedTexture.disposed, false, 'Disposing one view must not invalidate another view texture.');
  second.dispose();
  assert.equal(sharedTexture.disposed, false, 'Home must keep the shared surface texture alive while it still owns a lease.');
  homeGlobe.dispose();
  assert.equal(sharedTexture.disposed, true, 'The shared texture must release only after the final view disposes.');
  const third = await engine.createEarthGlobe({ THREE, textureUrl: './runtime-assets/earth-land-ocean-ice-2048.png' });
  assert.equal(textureLoads, 2, 'A later view must load a fresh texture after the previous shared texture was disposed.');
  assert.notEqual(third.surface.material.map, sharedTexture, 'A disposed shared texture must never be reused.');
  third.dispose();

  const moonSource = read('Home/moon-orbit.js');
  assert.ok(!moonSource.includes('earthGroup.children.find'), 'Moon Orbit must never look up or take ownership of the Earth mesh.');
  assert.ok(!moonSource.includes('earthSurface'), 'Moon Orbit must not keep a reference to the Earth surface.');
  assert.ok(!moonSource.includes('greenwichMeanSiderealAngle'), 'Moon Orbit must not calculate or apply Earth sidereal rotation.');
  assert.ok(!/\.rotation\.[xyz]\s*=|\.rotation\.[xyz]\s*\+=/.test(moonSource), 'Moon Orbit must not write any rotation values.');
  assert.ok(moonSource.includes('moon.position.copy'), 'Moon Orbit may update only its own Moon position.');
  assert.ok(moonSource.includes('earthGroup.add(system)'), 'Moon Orbit remains an additive visual layer under the Home Earth group.');

  const earthModes = read('Earth/earth-orb-globe.js');
  assert.ok(earthModes.includes('import { createEarthGlobe } from "../Global/earth-engine.js"'), 'Earth Modes must use the canonical Global Earth Engine.');
  assert.ok(earthModes.includes('textureUrl: "../runtime-assets/earth-land-ocean-ice-2048.png"'), 'Earth Modes must use the canonical local Earth texture.');
  assert.ok(!earthModes.includes('initialRotationY'), 'Earth Modes must not override the Global Engine base calibration.');
  assert.ok(earthModes.includes('geometryDetail: mode === "hd" ? "high" : "standard"'), 'Earth Modes must map HD to the shared Engine geometry profile.');
  assert.ok(!earthModes.includes('new T.SphereGeometry'), 'Earth Modes must not construct a duplicate Earth sphere.');
  assert.ok(!earthModes.includes('new T.MeshStandardMaterial'), 'Earth Modes must not construct a duplicate Earth material.');
  assert.ok(!earthModes.includes('https://eoimages.gsfc.nasa.gov'), 'Earth Modes must not bypass the local shared texture.');
  assert.ok(earthModes.includes('applyHomeOrientation(group)'), 'Earth Modes must apply only Home group orientation after Engine creation.');

  const controller = read('Earth/earth-view-controller.js');
  assert.ok(controller.includes('import("../Global/earth-engine.js")'), 'Independent Earth View must also use Earth Engine.');
  assert.ok(controller.includes('T = await import("../vendor/three.module.js")'), 'Home and Independent Earth View must resolve the same Three.js namespace.');
  assert.ok(controller.includes('earth-independent-renderer'), 'Independent Earth view registration must remain intact.');
  assert.ok(controller.includes('data-quality="basic"') && controller.includes('data-quality="hd"'), 'Basic/HD choices must remain in Independent Earth View.');
  assert.ok(controller.includes('earthGlobe.setGeometryDetail(quality === "hd" ? "high" : "standard")'), 'Independent Earth UI must map Basic/HD to generic Engine detail.');
  assert.ok(!controller.includes('initialRotationY'), 'Independent Earth View must not override the Global Engine base calibration.');
  assert.ok(!controller.includes('earthGlobe.setQuality'), 'Independent Earth View must not call the removed Engine quality API.');
  assert.ok(!controller.includes('moon-orbit.js'), 'Independent Earth View must not import the Home Moon orbit.');
  assert.ok(!/LiveEarthScene\.(?:unlock|lock|zoomBy|setQuality)\s*\(/.test(controller), 'Independent Earth View must not control Home camera or geometry.');

  const sw = read('sw.js');
  const manager = read('Global/update-manager.js');
  assert.ok(sw.includes('"./Global/earth-engine.js"') && sw.includes('"./Earth/earth-view-controller.js"'), 'Both Earth files must remain essential offline shell assets.');
  assert.ok(sw.includes('"./runtime-assets/earth-land-ocean-ice-2048.png"'), 'Home Engine texture must remain an offline runtime dependency.');
  assert.ok(!sw.includes('earth-mode-navigation.js'), 'The retired controller path must not remain in the service worker.');
  assert.ok(sw.includes('v126-quaternion-stable-earth-drag') && manager.includes('v126-quaternion-stable-earth-drag'), 'Service worker and update manager build IDs must match.');
  assert.ok(sw.includes('const anchor = "// LIVE_EARTH_HOME_RENDERER_HOOKS";'), 'Home API injection must use the stable named hook.');
  assert.ok(sw.includes('const readableRemoteThreeImport = /try\\s*\\{'), 'Service worker must transform the readable Home Three.js import.');
  assert.ok(sw.includes("html = html.replace(readableRemoteThreeImport, \"T = await import('./vendor/three.module.js');\");"), 'Readable Home import must resolve to the staged offline Three.js module.');
  const patternStart = sw.indexOf('const readableRemoteThreeImport = ') + 'const readableRemoteThreeImport = '.length;
  const patternEnd = sw.indexOf(';\n  if (readableRemoteThreeImport', patternStart);
  assert.ok(patternStart >= 0 && patternEnd > patternStart, 'Readable Three.js import pattern must be extractable.');
  const readableImportPattern = vm.runInNewContext(sw.slice(patternStart, patternEnd));
  const readableImportSample = "try {\n  T = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');\n} catch (primaryError) {\n  T = await import('https://unpkg.com/three@0.180.0/build/three.module.js');\n}";
  assert.ok(readableImportPattern.test(readableImportSample), 'Service-worker pattern must recognize the formatted Home CDN fallback block.');
  assert.equal(readableImportSample.replace(readableImportPattern, "T = await import('./vendor/three.module.js');"), "T = await import('./vendor/three.module.js');", 'Formatted Home import must transform to the staged offline module.');
  assert.equal(sw.split('const anchor = "// LIVE_EARTH_HOME_RENDERER_HOOKS";').length - 1, 2, 'Home API and solar injections must share the stable marker.');

  const apiStart = sw.indexOf('function injectSameGlobeAPI(html) {');
  const solarStart = sw.indexOf('function injectSolarDayNight(html) {', apiStart);
  const injectionEnd = sw.indexOf('\nself.addEventListener("install"', solarStart);
  assert.ok(apiStart >= 0 && solarStart > apiStart && injectionEnd > solarStart, 'Service-worker injection functions must retain their expected order.');
  const apiSource = sw.slice(apiStart, solarStart);
  for (const removedHomeControl of ['setQuality', 'zoomBy', 'function unlock', 'function lock', 'liveEarthQuality', 'getScannerVisible', 'setScannerVisible']) {
    assert.ok(!apiSource.includes(removedHomeControl), `Home API must not retain obsolete mode control: ${removedHomeControl}`);
  }
  for (const requiredMethod of ['setLocation', 'setLocationEnabled', 'getLocation', 'registerLayer', 'unregisterLayer', 'getTHREE', 'requestRender']) {
    assert.ok(apiSource.includes(requiredMethod), `Home API must retain required integration method: ${requiredMethod}`);
  }
  const injectionContext = {};
  vm.runInNewContext(`${sw.slice(apiStart, injectionEnd)}\nthis.injectHomeLayers = html => injectSolarDayNight(injectSameGlobeAPI(html));`, injectionContext);
  const injectedHome = injectionContext.injectHomeLayers(homeIndex);
  assert.ok(injectedHome.includes('window.LiveEarthScene = (() => {'), 'LiveEarthScene must still be injected into Home module.');
  assert.ok(injectedHome.includes('LIVE_EARTH_SOLAR_DAY_NIGHT_V9'), 'Existing solar/day-night layer must still be injected.');
  assert.ok(injectedHome.indexOf('window.LiveEarthScene = (() => {') < injectedHome.indexOf('// LIVE_EARTH_HOME_RENDERER_HOOKS'), 'Home API must be inserted before the stable marker.');
  assert.ok(injectedHome.indexOf('LIVE_EARTH_SOLAR_DAY_NIGHT_V9') < injectedHome.indexOf('// LIVE_EARTH_HOME_RENDERER_HOOKS'), 'Solar layer must be inserted before the stable marker.');

  console.log(JSON.stringify({
    homeEarthUsesSharedEngine: 'passed',
    homeFixedGeometryAndLockedZoom: 'passed',
    homeEarthMeshIdentityPreserved: 'passed',
    moonOrbitCannotMutateEarth: 'passed',
    engineGenericGeometryDetailAPI: 'passed',
    enginePerViewIsolation: 'passed',
    sharedTextureLifecycle: 'passed',
    independentEarthBasicHdMapping: 'passed',
    homeLocationAndFeatureLayerAPI: 'passed',
    offlineShellAndBuildIdentity: 'passed',
    serviceWorkerHomeAndSolarInjection: 'passed'
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
