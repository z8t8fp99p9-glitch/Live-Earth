/* LIVE // EARTH — low-level 3D graphics primitives for the Earth Engine.
 * This module owns reusable texture leases and geometry/material construction.
 * It does not create scenes, cameras, renderers, lights, controls or view state.
 */
const textureRecords = new WeakMap();

export function acquireEarthTexture(THREE, textureUrl) {
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

  return record.promise.then(texture => {
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
  });
}

export function createEarthSurfaceGeometry(THREE, radius, geometryDetail) {
  return geometryDetail === "high"
    ? new THREE.SphereGeometry(radius, 96, 64)
    : new THREE.SphereGeometry(radius, 64, 48);
}

export function createEarthSurfaceMaterial(THREE, texture) {
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
}

export function createEarthAtmosphereGeometry(THREE, radius) {
  return new THREE.SphereGeometry(radius * 1.025, 64, 48);
}

export function createEarthAtmosphereMaterial(THREE, options = {}) {
  return new THREE.MeshBasicMaterial({
    color: options.color ?? 0x329dff,
    transparent: true,
    opacity: Number.isFinite(options.opacity) ? options.opacity : 0.13,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export function disposeGraphicsResource(resource) {
  try { resource?.dispose?.(); } catch (_) {}
}
