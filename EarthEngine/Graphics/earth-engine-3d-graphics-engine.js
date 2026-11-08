/* LIVE // EARTH — Earth 3D graphics assembly engine.
 * Builds the reusable Earth group/surface/atmosphere using the low-level
 * primitives in earth-engine-3d-graphics-core.js. View-specific scene,
 * camera, renderer, light, zoom and interaction remain outside this module.
 */
import {
  acquireEarthTexture,
  createEarthSurfaceGeometry,
  createEarthSurfaceMaterial,
  createEarthAtmosphereGeometry,
  createEarthAtmosphereMaterial,
  disposeGraphicsResource
} from "./earth-engine-3d-graphics-core.js";

const EARTH_BASE_SURFACE_ROTATION_Y = -0.35;
const DEFAULT_TEXTURE = "./EarthEngine/Assets/earth-land-ocean-ice-2048.png";

function normalizeGeometryDetail(value) {
  return value === "high" ? "high" : "standard";
}

export async function createEarthGraphics(options = {}) {
  const THREE = options.THREE;
  if (!THREE || typeof THREE.Group !== "function" || typeof THREE.Mesh !== "function" ||
      typeof THREE.SphereGeometry !== "function" || typeof THREE.MeshStandardMaterial !== "function" ||
      typeof THREE.TextureLoader !== "function") {
    throw new TypeError("Earth Graphics Engine requires the Three.js namespace from the calling view.");
  }

  const radius = Number.isFinite(options.radius) && options.radius > 0 ? options.radius : 1;
  const textureUrl = typeof options.textureUrl === "string" && options.textureUrl.trim()
    ? options.textureUrl.trim() : DEFAULT_TEXTURE;
  let geometryDetail = normalizeGeometryDetail(options.geometryDetail);
  const includeAtmosphere = options.atmosphere !== false;
  const textureLease = await acquireEarthTexture(THREE, textureUrl);
  textureLease.texture.anisotropy = Math.max(1, Math.min(
    Number.isFinite(options.maxAnisotropy) ? options.maxAnisotropy : 4, 4
  ));

  let group;
  let surface;
  let atmosphere = null;
  let surfaceGeometry;
  let surfaceMaterial;
  let atmosphereGeometry;
  let atmosphereMaterial;
  let disposed = false;

  try {
    group = new THREE.Group();
    group.name = "liveEarthEngineGlobe";
    surfaceGeometry = createEarthSurfaceGeometry(THREE, radius, geometryDetail);
    surfaceMaterial = createEarthSurfaceMaterial(THREE, textureLease.texture);
    surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surface.name = "liveEarthEngineSurface";
    surface.rotation.y = EARTH_BASE_SURFACE_ROTATION_Y;
    group.add(surface);

    if (includeAtmosphere) {
      atmosphereGeometry = createEarthAtmosphereGeometry(THREE, radius);
      atmosphereMaterial = createEarthAtmosphereMaterial(THREE, {
        color: options.atmosphereColor,
        opacity: options.atmosphereOpacity
      });
      atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      atmosphere.name = "liveEarthEngineAtmosphere";
      group.add(atmosphere);
    }
  } catch (error) {
    disposeGraphicsResource(surfaceGeometry);
    disposeGraphicsResource(surfaceMaterial);
    disposeGraphicsResource(atmosphereGeometry);
    disposeGraphicsResource(atmosphereMaterial);
    textureLease.release();
    throw error;
  }

  function setGeometryDetail(next) {
    if (disposed) return geometryDetail;
    const requested = normalizeGeometryDetail(next);
    if (requested === geometryDetail) return geometryDetail;
    const replacement = createEarthSurfaceGeometry(THREE, radius, requested);
    const previous = surface.geometry;
    surface.geometry = replacement;
    surfaceGeometry = replacement;
    geometryDetail = requested;
    disposeGraphicsResource(previous);
    return geometryDetail;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    try { group.removeFromParent?.(); } catch (_) {}
    disposeGraphicsResource(surfaceGeometry);
    disposeGraphicsResource(surfaceMaterial);
    disposeGraphicsResource(atmosphereGeometry);
    disposeGraphicsResource(atmosphereMaterial);
    textureLease.release();
  }

  return Object.freeze({
    group,
    surface,
    atmosphere,
    setGeometryDetail,
    dispose,
    getState: () => Object.freeze({ geometryDetail, radius, textureUrl, disposed })
  });
}
