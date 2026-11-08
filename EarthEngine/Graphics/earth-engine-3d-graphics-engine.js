/* LIVE // EARTH — Earth 3D graphics assembly engine.
 * Builds the reusable Earth group/surface/atmosphere using the low-level
 * primitives in earth-engine-3d-graphics-core.js. The Engine also provides
 * the shared Earth light rig, solar direction and day/night surface treatment.
 * Views keep their scenes, cameras, renderers, framing, zoom policies and UI.
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
const DAYLIGHT_DEFAULTS = Object.freeze({
  ambientIntensity: 0.12,
  sunlightIntensity: 2.3,
  fillIntensity: 0.055,
  lightDistance: 12,
  nightTerrainFill: 0.14,
  twilightFill: 0.20
});

function normalizeGeometryDetail(value) {
  return value === "high" ? "high" : "standard";
}

function solarLocalDirection(THREE, date, target) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000;
  const gamma = 2 * Math.PI / 365 * (day - 1 + (hour - 12) / 24);
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const equationMinutes = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const subsolarLongitude = (720 - (hour * 60 + equationMinutes)) * Math.PI / 720;

  // The Engine texture's central meridian maps to local +X; east-positive
  // longitude maps toward local -Z. This produces the geographic subsolar point.
  return target.set(
    Math.cos(declination) * Math.cos(subsolarLongitude),
    Math.sin(declination),
    -Math.cos(declination) * Math.sin(subsolarLongitude)
  ).normalize();
}

function installDayNightShader(shader, solarDirection) {
  if (!shader?.vertexShader || !shader?.fragmentShader || !shader.uniforms) return;

  if (!shader.vertexShader.includes("varying vec3 vLEWorldNormal;")) {
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "varying vec3 vLEWorldNormal;\nvoid main() {"
    );
  }
  if (!shader.vertexShader.includes("vLEWorldNormal =")) {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\n vLEWorldNormal = normalize(mat3(modelMatrix) * objectNormal);"
    );
  }
  if (!shader.fragmentShader.includes("uniform vec3 uLESunDirection;")) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      "uniform vec3 uLESunDirection;\nvarying vec3 vLEWorldNormal;\nvoid main() {"
    );
  } else if (!shader.fragmentShader.includes("varying vec3 vLEWorldNormal;")) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      "varying vec3 vLEWorldNormal;\nvoid main() {"
    );
  }
  if (!shader.fragmentShader.includes("float leSolarDot =")) {
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float leSolarDot = dot(normalize(vLEWorldNormal), normalize(uLESunDirection));
      float leNight = 1.0 - smoothstep(-0.10, 0.08, leSolarDot);
      float leTwilight = 1.0 - smoothstep(0.015, 0.24, abs(leSolarDot));
      // A restrained, texture-coloured night fill keeps the dark hemisphere
      // legible without washing out the day side. Twilight stays cool and soft.
      totalEmissiveRadiance += diffuseColor.rgb * leNight * ${DAYLIGHT_DEFAULTS.nightTerrainFill.toFixed(2)};
      totalEmissiveRadiance += vec3(0.012, 0.026, 0.052) * leTwilight * ${DAYLIGHT_DEFAULTS.twilightFill.toFixed(2)};`);
  }

  const current = shader.uniforms.uLESunDirection || { value: solarDirection.clone() };
  if (current.value?.copy) current.value.copy(solarDirection);
  else current.value = solarDirection.clone();
  shader.uniforms.uLESunDirection = current;
}

function createEngineLightRig(THREE, group) {
  if (typeof THREE.AmbientLight !== "function" || typeof THREE.DirectionalLight !== "function") {
    throw new TypeError("Earth Engine daylight requires Three.js AmbientLight and DirectionalLight.");
  }

  const rig = new THREE.Group();
  rig.name = "liveEarthEngineLightRig";

  const ambient = new THREE.AmbientLight(0x8aa7c8, DAYLIGHT_DEFAULTS.ambientIntensity);
  ambient.name = "liveEarthEngineAmbientLight";
  ambient.userData = { ...ambient.userData, leEarthEngineLight: true, leEarthEngineAmbient: true };

  const sunlight = new THREE.DirectionalLight(0xffffff, DAYLIGHT_DEFAULTS.sunlightIntensity);
  sunlight.name = "liveEarthEngineSunlight";
  sunlight.userData = { ...sunlight.userData, leEarthEngineLight: true, leSolarKey: true };
  sunlight.position.set(-3, 2, 4);
  sunlight.target.position.set(0, 0, 0);

  const fill = new THREE.DirectionalLight(0x245b9b, DAYLIGHT_DEFAULTS.fillIntensity);
  fill.name = "liveEarthEngineBlueFill";
  fill.userData = { ...fill.userData, leEarthEngineLight: true, leFillKey: true };
  fill.position.set(4, -2, -3);
  fill.target.position.set(0, 0, 0);

  // Parenting the rig to the Engine group makes its default lighting available
  // on the very first frame. Both directional targets follow the globe transform.
  rig.add(ambient, sunlight, sunlight.target, fill, fill.target);
  group.add(rig);
  return Object.freeze({ rig, ambient, sunlight, fill });
}

function collectSceneLights(scene) {
  const lights = [];
  if (typeof scene?.traverse === "function") {
    scene.traverse(object => {
      if (object?.isAmbientLight || object?.isDirectionalLight) lights.push(object);
    });
    return lights;
  }

  const visit = object => {
    if (!object) return;
    if (object.isAmbientLight || object.isDirectionalLight) lights.push(object);
    for (const child of object.children || []) visit(child);
  };
  visit(scene);
  return lights;
}

function createSolarDaylightController(THREE, surface, group, options = {}) {
  const enabled = options.enabled !== false;
  const lightRig = enabled ? createEngineLightRig(THREE, group) : null;
  const localDirection = new THREE.Vector3();
  const worldDirection = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  let shaderUniforms = null;
  let compileWrapper = null;
  let cacheKeyWrapper = null;
  let boundScene = null;
  let previousSceneHook = null;
  let sceneHook = null;
  let disposed = false;

  function ensureMaterialHooks() {
    const material = surface.material;
    if (!material) return;

    if (material.onBeforeCompile !== compileWrapper) {
      const previous = material.onBeforeCompile;
      compileWrapper = function (shader, renderer) {
        if (typeof previous === "function") previous.call(this, shader, renderer);
        installDayNightShader(shader, worldDirection);
        shaderUniforms = shader.uniforms;
      };
      material.onBeforeCompile = compileWrapper;
      material.needsUpdate = true;
    }

    if (material.customProgramCacheKey !== cacheKeyWrapper) {
      const previousKey = material.customProgramCacheKey;
      cacheKeyWrapper = function () {
        const base = typeof previousKey === "function" ? previousKey.call(this) : "";
        return `${base}|live-earth-engine-daylight-v1`;
      };
      material.customProgramCacheKey = cacheKeyWrapper;
      material.needsUpdate = true;
    }
  }

  function setWorldPosition(object, position) {
    if (!object?.position) return;
    const local = position.clone();
    if (object.parent?.worldToLocal) {
      object.parent.updateMatrixWorld?.(true);
      object.parent.worldToLocal(local);
    }
    object.position.copy(local);
    object.updateMatrixWorld?.(true);
  }

  function updateSolarLighting(scene, date = new Date()) {
    if (!enabled || disposed || !scene) return false;
    // The Engine group is quaternion-driven. Refresh its world transform before
    // deriving the Sun vector, without reading or writing any Euler rotation.
    group.updateMatrixWorld?.(true);
    solarLocalDirection(THREE, date, localDirection);
    surface.getWorldQuaternion(worldQuaternion);
    worldDirection.copy(localDirection).applyQuaternion(worldQuaternion).normalize();

    const lights = collectSceneLights(scene);
    const externalAmbient = lights.find(object => object.isAmbientLight && !object.userData?.leEarthEngineLight);
    const externalDirectional = lights.filter(object => object.isDirectionalLight && !object.userData?.leEarthEngineLight);
    const engineAmbient = lightRig?.ambient || null;
    const engineSunlight = lightRig?.sunlight || null;
    const engineFill = lightRig?.fill || null;

    // Reuse a view's existing lights when it has supplied them. Otherwise the
    // Engine's own rig is the complete default, so Home needs no light objects.
    if (engineAmbient) engineAmbient.visible = !externalAmbient;
    const ambient = externalAmbient || engineAmbient;
    if (ambient) ambient.intensity = DAYLIGHT_DEFAULTS.ambientIntensity;

    const externalSunlight = externalDirectional.find(object => object.userData?.leSolarKey)
      || externalDirectional.slice().sort((a, b) => (b.intensity || 0) - (a.intensity || 0))[0];
    const sunlight = externalSunlight || engineSunlight;
    if (engineSunlight) engineSunlight.visible = !externalSunlight;
    if (sunlight) {
      sunlight.intensity = DAYLIGHT_DEFAULTS.sunlightIntensity;
      const sunPosition = worldDirection.clone().multiplyScalar(DAYLIGHT_DEFAULTS.lightDistance);
      setWorldPosition(sunlight, sunPosition);
      if (sunlight.target?.position) {
        sunlight.target.position.set(0, 0, 0);
        sunlight.target.updateMatrixWorld?.(true);
      }
    }

    const externalFill = externalDirectional.find(object => object !== externalSunlight);
    const fill = externalFill || engineFill;
    if (engineFill) engineFill.visible = !externalFill;
    if (fill) fill.intensity = DAYLIGHT_DEFAULTS.fillIntensity;

    if (shaderUniforms?.uLESunDirection) {
      const value = shaderUniforms.uLESunDirection.value;
      if (value?.copy) value.copy(worldDirection);
      else shaderUniforms.uLESunDirection.value = worldDirection.clone();
    }
    return true;
  }

  function ensureSceneHook(scene) {
    if (!scene || typeof scene !== "object") return;
    if (boundScene === scene && scene.onBeforeRender === sceneHook) return;

    if (boundScene && sceneHook && boundScene.onBeforeRender === sceneHook) {
      boundScene.onBeforeRender = previousSceneHook;
    }

    boundScene = scene;
    previousSceneHook = scene.onBeforeRender;
    sceneHook = function (renderer, activeScene, camera, renderTarget) {
      if (typeof previousSceneHook === "function") {
        previousSceneHook.call(this, renderer, activeScene, camera, renderTarget);
      }
      updateSolarLighting(activeScene || scene);
    };
    scene.onBeforeRender = sceneHook;
  }

  const previousSurfaceHook = surface.onBeforeRender;
  surface.onBeforeRender = function (renderer, scene, camera, geometry, material, objectGroup) {
    if (typeof previousSurfaceHook === "function") {
      previousSurfaceHook.call(this, renderer, scene, camera, geometry, material, objectGroup);
    }
    ensureMaterialHooks();
    ensureSceneHook(scene);
    // Covers the first frame; later frames are updated at scene.onBeforeRender,
    // before Three.js collects lights for rendering.
    updateSolarLighting(scene);
  };

  return Object.freeze({
    update: updateSolarLighting,
    getState: () => Object.freeze({
      enabled,
      ambientIntensity: DAYLIGHT_DEFAULTS.ambientIntensity,
      sunlightIntensity: DAYLIGHT_DEFAULTS.sunlightIntensity,
      fillIntensity: DAYLIGHT_DEFAULTS.fillIntensity,
      nightTerrainFill: DAYLIGHT_DEFAULTS.nightTerrainFill,
      twilightFill: DAYLIGHT_DEFAULTS.twilightFill,
      providesFallbackLights: !!lightRig
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      if (surface.onBeforeRender !== previousSurfaceHook) surface.onBeforeRender = previousSurfaceHook;
      if (boundScene && sceneHook && boundScene.onBeforeRender === sceneHook) {
        boundScene.onBeforeRender = previousSceneHook;
      }
      boundScene = null;
      shaderUniforms = null;
      lightRig?.rig.removeFromParent?.();
    }
  });
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
  let daylight = null;
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

    daylight = createSolarDaylightController(THREE, surface, group, {
      enabled: options.daylight !== false
    });
  } catch (error) {
    daylight?.dispose();
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
    daylight?.dispose();
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
    daylight,
    setGeometryDetail,
    dispose,
    getState: () => Object.freeze({
      geometryDetail,
      radius,
      textureUrl,
      daylight: daylight?.getState?.() || null,
      disposed
    })
  });
}
