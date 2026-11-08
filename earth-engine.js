/* LIVE // EARTH — reusable Earth Engine.
 * Builds an independent Earth globe object for any view that supplies its own Three.js scene.
 * It does not create or change a scene, camera, WebGL renderer, view state, or Home Earth.
 */
const textureRecords = new WeakMap();
const DEFAULT_TEXTURE = "./runtime-assets/earth-land-ocean-ice-2048.png";

function getTextureRecord(THREE, textureUrl) {
  let records = textureRecords.get(THREE);
  if (!records) {
    records = new Map();
    textureRecords.set(THREE, records);
  }
  let record = records.get(textureUrl);
  if (!record) {
    const loader = new THREE.TextureLoader();
    record = { refs: 0, texture: null, promise: null };
    record.promise = new Promise((resolve, reject) => {
      loader.load(textureUrl, resolve, undefined, reject);
    }).then(texture => {
      record.texture = texture;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }).catch(error => {
      if (records.get(textureUrl) === record) records.delete(textureUrl);
      throw error;
    });
    records.set(textureUrl, record);
  }
  return record;
}

async function acquireTexture(THREE, textureUrl) {
  const record = getTextureRecord(THREE, textureUrl);
  const records = textureRecords.get(THREE);
  const texture = await record.promise;
  record.refs += 1;
  let released = false;
  return {
    texture,
    release() {
      if (released) return;
      released = true;
      record.refs = Math.max(0, record.refs - 1);
      if (record.refs === 0) {
        try { record.texture?.dispose?.(); } catch (_) {}
        if (records.get(textureUrl) === record) records.delete(textureUrl);
      }
    }
  };
}

function geometryFor(THREE, radius, quality) {
  return quality === "hd"
    ? new THREE.SphereGeometry(radius, 96, 64)
    : new THREE.SphereGeometry(radius, 64, 48);
}

/**
 * Create one independently transformable Earth globe.
 *
 * @param {object} options
 * @param {object} options.THREE Three.js namespace supplied by the calling view.
 * @param {number} [options.radius=1] Surface sphere radius.
 * @param {string} [options.textureUrl] Same-origin Earth texture path.
 * @param {string} [options.quality="basic"] Initial geometry quality: basic or hd.
 * @param {number} [options.initialRotationY=0] Initial longitude alignment in radians.
 * @param {boolean} [options.atmosphere=true] Whether to include the translucent atmosphere shell.
 * @returns {Promise<{group:object,surface:object,atmosphere:object|null,setQuality:function,dispose:function,getState:function}>}
 */
export async function createEarthGlobe(options = {}) {
  const THREE = options.THREE;
  if (!THREE || typeof THREE.Group !== "function" || typeof THREE.Mesh !== "function" ||
      typeof THREE.SphereGeometry !== "function" || typeof THREE.MeshStandardMaterial !== "function" ||
      typeof THREE.TextureLoader !== "function") {
    throw new TypeError("Earth Engine requires the Three.js namespace from the calling view.");
  }

  const radius = Number.isFinite(options.radius) && options.radius > 0 ? options.radius : 1;
  const textureUrl = typeof options.textureUrl === "string" && options.textureUrl.trim()
    ? options.textureUrl.trim() : DEFAULT_TEXTURE;
  let quality = options.quality === "hd" ? "hd" : "basic";
  const initialRotationY = Number.isFinite(options.initialRotationY) ? options.initialRotationY : 0;
  const includeAtmosphere = options.atmosphere !== false;
  const textureLease = await acquireTexture(THREE, textureUrl);
  textureLease.texture.anisotropy = Math.max(1, Math.min(Number.isFinite(options.maxAnisotropy) ? options.maxAnisotropy : 4, 4));
  let group, surface, atmosphere = null, surfaceMaterial, surfaceGeometry, atmosphereGeometry, atmosphereMaterial;
  let disposed = false;

  try {
    group = new THREE.Group();
    group.name = "liveEarthEngineGlobe";
    surfaceGeometry = geometryFor(THREE, radius, quality);
    surfaceMaterial = new THREE.MeshStandardMaterial({ map: textureLease.texture, roughness: 1, metalness: 0 });
    surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surface.name = "liveEarthEngineSurface";
    surface.rotation.y = initialRotationY;
    group.add(surface);

    if (includeAtmosphere) {
      atmosphereGeometry = new THREE.SphereGeometry(radius * 1.025, 64, 48);
      atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: options.atmosphereColor ?? 0x329dff,
        transparent: true,
        opacity: Number.isFinite(options.atmosphereOpacity) ? options.atmosphereOpacity : 0.13,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      atmosphere.name = "liveEarthEngineAtmosphere";
      group.add(atmosphere);
    }
  } catch (error) {
    try { surfaceGeometry?.dispose?.(); } catch (_) {}
    try { surfaceMaterial?.dispose?.(); } catch (_) {}
    try { atmosphereGeometry?.dispose?.(); } catch (_) {}
    try { atmosphereMaterial?.dispose?.(); } catch (_) {}
    textureLease.release();
    throw error;
  }

  function setQuality(next) {
    if (disposed) return quality;
    const requested = next === "hd" ? "hd" : "basic";
    if (requested === quality) return quality;
    const replacement = geometryFor(THREE, radius, requested);
    const previous = surface.geometry;
    surface.geometry = replacement;
    surfaceGeometry = replacement;
    quality = requested;
    try { previous?.dispose?.(); } catch (_) {}
    return quality;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    try { group.removeFromParent?.(); } catch (_) {}
    try { surfaceGeometry?.dispose?.(); } catch (_) {}
    try { surfaceMaterial?.dispose?.(); } catch (_) {}
    try { atmosphereGeometry?.dispose?.(); } catch (_) {}
    try { atmosphereMaterial?.dispose?.(); } catch (_) {}
    textureLease.release();
  }

  return Object.freeze({
    group, surface, atmosphere,
    setQuality,
    dispose,
    getState: () => Object.freeze({ quality, radius, textureUrl, disposed })
  });
}

// Alias keeps call-sites readable across different view controllers.
export const createGlobe = createEarthGlobe;
export const EarthEngine = Object.freeze({ version: "1.0.0", createGlobe: createEarthGlobe, createEarthGlobe });

if (typeof window !== "undefined") {
  window.LiveEarthEngine = EarthEngine;
  window.__liveEarthEarthEngineModuleReady = true;
  window.dispatchEvent?.(new Event("live-earth-earth-engine-ready"));
}
