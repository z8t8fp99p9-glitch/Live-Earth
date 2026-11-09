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
    this.userData = {};
    this.visible = true;
    this.position = new Vector3();
    this.quaternion = new Quaternion();
  }
  add(...nodes) {
    for (const node of nodes) {
      if (node.parent) node.removeFromParent();
      node.parent = this;
      this.children.push(node);
    }
  }
  traverse(callback) {
    callback(this);
    for (const child of this.children) child.traverse?.(callback);
  }
  updateMatrixWorld() {}
  worldToLocal(vector) { return vector; }
  getWorldQuaternion(target) { return target.set(0, 0, 0, 1); }
  removeFromParent() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter(item => item !== this);
    this.parent = null;
  }
}

class Light extends Node3D {
  constructor(color, intensity, kind) {
    super();
    this.color = color;
    this.intensity = intensity;
    this.isAmbientLight = kind === 'ambient';
    this.isDirectionalLight = kind === 'directional';
    this.target = new Node3D();
  }
}
class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  normalize() { const n = Math.hypot(this.x, this.y, this.z) || 1; this.x /= n; this.y /= n; this.z /= n; return this; }
  multiplyScalar(k) { this.x *= k; this.y *= k; this.z *= k; return this; }
  applyQuaternion() { return this; }
}
class Quaternion {
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
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
  AmbientLight: class extends Light { constructor(color, intensity) { super(color, intensity, 'ambient'); } },
  DirectionalLight: class extends Light { constructor(color, intensity) { super(color, intensity, 'directional'); } },
  Vector3,
  Quaternion,
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
  assert.ok(homeModule.includes("import('./EarthEngine/Core/earth-engine.js')"), 'Home must create its globe through Earth Engine.');
  assert.ok(homeModule.includes("geometryDetail: 'high'"), 'Home must use one fixed high-detail sphere profile.');
  assert.ok(!homeModule.includes('initialRotationY'), 'Home must not override the Global Engine base calibration.');
  assert.ok(!/\bquality\b|\bBasic\b|\bHD\b|setQuality|zoomBy|pinch/i.test(homeModule), 'Home module must not contain Basic/HD quality or zoom controls.');
  assert.ok(homeModule.includes('const group = earthGlobe.group;'), 'Engine group identity must remain Home\'s transform group.');
  assert.ok(homeModule.includes('const earth = earthGlobe.surface;'), 'Engine surface identity must remain Home\'s Earth mesh.');
  assert.ok(homeModule.includes('scene.add(group);'), 'Home must attach the Engine group directly to its own scene.');
  assert.ok(homeModule.includes('createMoonOrbit(T, group'), 'The Home Moon orbit must receive that exact Engine group.');
  assert.ok(!/new T\.(?:AmbientLight|DirectionalLight)/.test(homeModule), 'Home must not construct its own scene lights.');
  assert.ok(homeModule.includes('zoom: { enabled: false }'), 'Home zoom must remain locked.');
  assert.ok(homeModule.includes('starPositions') && homeModule.includes('new T.Points'), 'Home star field must remain in the scene.');
  assert.ok(homeModule.includes('// LIVE_EARTH_HOME_RENDERER_HOOKS'), 'Service-worker injections must use the stable named hook.');
  assert.ok(!homeModule.includes('new T.SphereGeometry'), 'Home must not construct a duplicate Earth sphere.');
  assert.ok(!homeModule.includes('new T.MeshStandardMaterial'), 'Home must not construct a duplicate Earth surface material.');
  assert.ok(!homeModule.includes('new T.TextureLoader'), 'Home must not load the Earth texture outside Earth Engine.');
  assert.ok(homeModule.includes('displayDistanceFactor: 0.04'), 'The existing Home Moon orbit display scale must remain unchanged.');
  assert.ok(homeModule.includes('displayMoonRadius: 0.32'), 'The existing Home Moon display radius must remain unchanged.');
  assert.ok(homeIndex.includes('Drag with one finger to rotate.'), 'Home canvas guidance must reflect its fixed zoom and rotation-only gesture.');

  const engineSource = read('EarthEngine/Core/earth-engine.js');
  assert.ok(engineSource.includes('export async function createEarthGlobe'), 'Reusable Earth Engine export is required.');
  assert.ok(engineSource.includes('createEarthGraphics'), 'Public Core API must delegate to the Graphics Engine.');
  assert.ok(engineSource.includes('export const createGlobe = createEarthGlobe'), 'Legacy createGlobe alias must remain available.');
  const graphicsEngineSource = read('EarthEngine/Graphics/earth-engine-3d-graphics-engine.js');
  const graphicsCoreSource = read('EarthEngine/Graphics/earth-engine-3d-graphics-core.js');
  assert.ok(graphicsEngineSource.includes('const EARTH_BASE_SURFACE_ROTATION_Y = -0.35;'), 'Graphics Engine must own the one canonical surface calibration.');
  assert.ok(graphicsEngineSource.includes('surface.rotation.y = EARTH_BASE_SURFACE_ROTATION_Y;'), 'Every Engine-created Earth must use the canonical base surface orientation.');
  assert.ok(graphicsEngineSource.includes('setGeometryDetail'), 'Graphics Engine must expose generic geometry detail.');
  assert.ok(graphicsEngineSource.includes('createEngineLightRig'), 'Earth Engine must provide shared fallback scene lighting.');
  assert.ok(graphicsEngineSource.includes('collectSceneLights'), 'Earth Engine must reuse view-provided lights without duplicating them.');
  assert.ok(graphicsCoreSource.includes('textureRecords'), 'Graphics Core must safely share loaded textures.');
  assert.ok(graphicsCoreSource.includes('createEarthSurfaceGeometry'), 'Graphics Core must own low-level sphere geometry construction.');
  assert.ok(!/\bquality\b|\bBasic\b|\bHD\b|setQuality/i.test(engineSource + graphicsEngineSource), 'Earth Engine must not own Independent Earth View UI naming.');
  const engine = await import(pathToFileURL(path.join(root, 'EarthEngine/Core/earth-engine.js')).href);

  const homeGlobe = await engine.createEarthGlobe({
    THREE,
    radius: 1,
    textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png',
    geometryDetail: 'high'
  });
  assert.equal(homeGlobe.surface.geometry.parameters.width, 96, 'Home fixed high detail must match its former 96-segment sphere.');
  assert.equal(homeGlobe.surface.geometry.parameters.height, 64, 'Home fixed high detail must match its former 64-segment sphere.');
  assert.equal(homeGlobe.surface.rotation.y, -0.35, 'Home surface longitude alignment must be retained.');
  const engineRig = homeGlobe.group.children.find(child => child.name === 'liveEarthEngineLightRig');
  assert.ok(engineRig, 'Earth Engine must provide a light rig inside its returned globe group.');
  assert.equal(engineRig.children.filter(child => child.isAmbientLight).length, 1, 'Engine light rig must include one ambient light.');
  assert.equal(engineRig.children.filter(child => child.isDirectionalLight).length, 2, 'Engine light rig must include key sunlight and blue fill.');

  const homeScene = new Node3D();
  homeScene.add(homeGlobe.group);
  homeGlobe.surface.onBeforeRender({}, homeScene, {}, null, homeGlobe.surface.geometry, homeGlobe.surface.material, null);
  assert.equal(engineRig.children.find(child => child.isAmbientLight).visible, true, 'Home must use Engine fallback ambient lighting when it supplies no local lights.');
  assert.equal(engineRig.children.find(child => child.userData.leSolarKey).visible, true, 'Home must use Engine fallback sunlight when it supplies no local lights.');
  assert.equal(homeGlobe.daylight.getState().providesFallbackLights, true, 'Engine daylight state must report its fallback light rig.');

  const secondGlobeForExternalLights = await engine.createEarthGlobe({ THREE, textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png' });
  const externalScene = new Node3D();
  const externalAmbient = new THREE.AmbientLight(0x8aa7c8, 0.24);
  const externalSun = new THREE.DirectionalLight(0xffffff, 2.3);
  externalSun.userData.leSolarKey = true;
  const externalFill = new THREE.DirectionalLight(0x245b9b, 0.055);
  externalScene.add(externalAmbient, externalSun, externalFill, secondGlobeForExternalLights.group);
  secondGlobeForExternalLights.surface.onBeforeRender({}, externalScene, {}, null, secondGlobeForExternalLights.surface.geometry, secondGlobeForExternalLights.surface.material, null);
  const externalRig = secondGlobeForExternalLights.group.children.find(child => child.name === 'liveEarthEngineLightRig');
  assert.equal(externalRig.children.find(child => child.isAmbientLight).visible, false, 'Engine ambient fallback must hide when a view already supplies ambient lighting.');
  assert.equal(externalRig.children.find(child => child.userData.leSolarKey).visible, false, 'Engine sunlight fallback must hide when a view already supplies sunlight.');
  assert.equal(externalRig.children.find(child => child.userData.leFillKey).visible, false, 'Engine fill fallback must hide when a view already supplies secondary directional lighting.');
  assert.equal(externalAmbient.intensity, 0.12, 'Engine must standardize the existing view ambient light.');
  secondGlobeForExternalLights.dispose();

  assert.equal(homeGlobe.group.children[0], homeGlobe.surface, 'The Engine-owned surface remains the first direct child in Home group.');

  const [first, second] = await Promise.all([
    engine.createEarthGlobe({ THREE, radius: 1, textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png', geometryDetail: 'standard' }),
    engine.createGlobe({ THREE, radius: 0.5, textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png', geometryDetail: 'standard' })
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
  const third = await engine.createEarthGlobe({ THREE, textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png' });
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
  assert.ok(earthModes.includes('import { createEarthGlobe } from "../EarthEngine/Core/earth-engine.js"'), 'Earth Modes must use the canonical Earth Engine.');
  assert.ok(earthModes.includes('textureUrl: "../EarthEngine/Assets/earth-land-ocean-ice-2048.png"'), 'Earth Modes must use the canonical local Earth texture.');
  assert.ok(!earthModes.includes('initialRotationY'), 'Earth Modes must not override the Global Engine base calibration.');
  assert.ok(earthModes.includes('geometryDetail: mode === "hd" ? "high" : "standard"'), 'Earth Modes must map HD to the shared Engine geometry profile.');
  assert.ok(!earthModes.includes('new T.SphereGeometry'), 'Earth Modes must not construct a duplicate Earth sphere.');
  assert.ok(!earthModes.includes('new T.MeshStandardMaterial'), 'Earth Modes must not construct a duplicate Earth material.');
  assert.ok(!earthModes.includes('https://eoimages.gsfc.nasa.gov'), 'Earth Modes must not bypass the local shared texture.');
  assert.doesNotMatch(earthModes, /viewpoint-bridge|applyHomeOrientation|publishHomeOrientation/, 'Earth Modes must receive global rotation from Earth Engine without per-view bridge wiring.');

  const controller = read('Earth/earth-view-controller.js');
  assert.ok(controller.includes('import("../EarthEngine/Core/earth-engine.js")'), 'Independent Earth View must also use Earth Engine.');
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
  assert.ok(sw.includes('"./EarthEngine/Core/earth-engine.js"'), 'The canonical Earth Engine must remain an essential offline shell asset.');
  assert.ok(!sw.includes('earth-viewpoint-bridge.js'), 'The retired Home-only viewpoint bridge must not remain in the offline shell.');
  assert.ok(sw.includes('v132-residents-removed'), 'The service-worker cache identity must advance when the app shell contract changes.');
  assert.ok(sw.includes('"./EarthEngine/Graphics/earth-engine-3d-graphics-engine.js"') && sw.includes('"./EarthEngine/Graphics/earth-engine-3d-graphics-core.js"'), 'Both graphics modules must remain essential offline shell assets.');
  assert.ok(sw.includes('"./EarthEngine/Assets/earth-land-ocean-ice-2048.png"'), 'Home Engine texture must remain an offline runtime dependency.');
  assert.ok(!sw.includes('earth-mode-navigation.js'), 'The retired controller path must not remain in the service worker.');
  assert.ok(sw.includes('v132-residents-removed') && manager.includes('v132-residents-removed'), 'Service worker and update manager build IDs must match.');
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
  assert.equal(sw.split('const anchor = "// LIVE_EARTH_HOME_RENDERER_HOOKS";').length - 1, 2, 'Home API and retained legacy solar injector must share the stable marker.');

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
  vm.runInNewContext(`${sw.slice(apiStart, injectionEnd)}\nthis.injectHomeLayers = html => injectSameGlobeAPI(html);`, injectionContext);
  const injectedHome = injectionContext.injectHomeLayers(homeIndex);
  assert.ok(injectedHome.includes('window.LiveEarthScene = (() => {'), 'LiveEarthScene integration API must still be injected into Home.');
  assert.ok(injectedHome.includes('const locationMarker = new T.Group();'), 'Home must create its Location marker group.');
  assert.ok(injectedHome.includes('earth.add(locationMarker);'), 'Home Location marker must follow the exact Engine Earth surface.');
  assert.ok(injectedHome.includes('locationMarker.visible = hasLocation && locationEnabled;'), 'Home Location marker must respect the Location enabled state.');
  assert.ok(injectedHome.includes('locationHalo.position.copy(locationVector)'), 'Home Location halo must use the validated geographic coordinates.');
  assert.ok(injectedHome.includes('locationDot.position.copy(locationVector)'), 'Home Location dot must use the validated geographic coordinates.');
  assert.doesNotMatch(injectedHome, /LIVE_EARTH_SOLAR_DAY_NIGHT_V9/, 'The legacy Service Worker solar layer must not be injected.');
  assert.ok(sw.includes('// html = injectSolarDayNight(html);'), 'Legacy Service Worker day/night injection must remain explicitly commented out.');
  assert.doesNotMatch(sw, /^\s*html = injectSolarDayNight\(html\);/m, 'Legacy Service Worker day/night injection must not execute.');
  assert.ok(injectedHome.indexOf('window.LiveEarthScene = (() => {') < injectedHome.indexOf('// LIVE_EARTH_HOME_RENDERER_HOOKS'), 'Home integration API must be inserted before the stable marker.');

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
    serviceWorkerHomeIntegrationWithLocationMarkerAndWithoutLegacySolarInjection: 'passed'
  }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
