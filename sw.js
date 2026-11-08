/* LIVE // EARTH V124 — complete Home-to-viewpoint bridge. */
const CACHE_PREFIX = "live-earth-shell-";
const BUILD_ID = "v125-global-earth-engine-isolated";
const CACHE_NAME = "live-earth-shell-v125-global-earth-engine-isolated";
const OPTIONAL_CACHE = "live-earth-optional-v1";
const OPTIONAL_LIMIT = 48;
const APP_SHELL = [
 "./","./index.html","./ios-standalone-root-flow.js","./Global/orb-controls-v4.js","./Global/earth-engine.js","./Global/earth-viewpoint-bridge.js","./Earth/earth-view-controller.js","./Global/view-manager.js","./Global/view-module-registry.js","./Stacks/stacks-feature-views.js","./Clouds/clouds-view.js","./Weather/weather-view.js","./Traffic/traffic-view.js","./Earthquakes/earthquakes-view.js","./Global/sky-view-controller.js","./Moon/moon-view-controller.js","./Moon/moon-lunar-interface.js","./Sun/sun-view-controller.js","./Sun/sun-surface-shared.webp",
 "./Earth/location.html","./Earth/earth-orb-globe.js","./manifest.json","./Global/icon.svg","./Data/data-store.js","./Location/location.js",
 "./Global/astronomy.js","./Home/moon-orbit.js","./Data/dataset-manifest.json",
 "./Home/moon-surface-lroc-1536.jpg",
 "./Moon/moon-sky-background-responsive.svg",
 "./Moon/moon-sky-background-portrait.webp","./Moon/moon-sky-background-landscape.webp",
 "./Sun/sun-sky-background-portrait.webp","./Sun/sun-sky-background-landscape.webp",
 "./Global/update-manager.js","./Data/data-recovery.js",
 "./Earth/earth.webp","./Moon/moon.webp","./Sun/sun.webp","./Location/location.webp","./Stacks/stacks.webp"
];

// These runtime assets are cached under same-origin virtual URLs. That lets the
// module loader and TextureLoader work offline without depending on a CDN at launch.
const RUNTIME_DEPENDENCIES = [
  {
    // Three.js r180's module entry imports this companion file relatively.
    // It must live at the matching same-origin path for offline ES-module resolution.
    path: "./vendor/three.core.js",
    urls: [
      "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.core.js",
      "https://unpkg.com/three@0.180.0/build/three.core.js"
    ]
  },
  {
    path: "./vendor/three.module.js",
    urls: [
      "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
      "https://unpkg.com/three@0.180.0/build/three.module.js"
    ]
  },
  {
    path: "./runtime-assets/earth-land-ocean-ice-2048.png",
    urls: [
      "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png",
      "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
    ]
  }
];

function runtimePath(path) {
  return new URL(path, self.registration.scope).pathname;
}

// Every install-time fetch is bounded. AbortController remains active while the
// response body is consumed, so a connection that returns headers but stalls
// mid-file cannot hold a fresh installation forever.
async function fetchBuffered(input, init = {}, timeoutMs = 30000, controller = new AbortController()) {
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response || !response.ok || response.type === "opaque") {
      throw new Error("Essential download did not return a usable response.");
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function expectedShellMime(path, type) {
  if (!type) return false;
  if (/\.js$/i.test(path)) return /(javascript|ecmascript)/i.test(type);
  if (/\.html?$/i.test(path) || path === "./" || /\/$/.test(path)) return /text\/html/i.test(type);
  if (/\.(png|webp|jpe?g)$/i.test(path)) return /^image\//i.test(type);
  if (/\.svg$/i.test(path)) return /(svg|image)/i.test(type);
  if (/\.json$/i.test(path)) return /(json|text\/plain)/i.test(type);
  return true;
}

function minimumShellBytes(path) {
  if (/\.js$/i.test(path)) return 100;
  if (/\.html?$/i.test(path) || path === "./" || /\/$/.test(path)) return 500;
  if (/\.json$/i.test(path)) return 16;
  if (/\.(png|webp|jpe?g|svg)$/i.test(path)) return 100;
  return 1;
}

async function shellResponseIsValid(response, path) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const contentType = response.headers.get("content-type") || "";
  if (!expectedShellMime(path, contentType)) return false;
  const bytes = await response.clone().arrayBuffer();
  return bytes.byteLength >= minimumShellBytes(path);
}

async function stageShellAsset(cache, path) {
  const request = new Request(new URL(path, self.registration.scope).href);
  const existing = await cache.match(request);
  if (existing && await shellResponseIsValid(existing, path)) return;
  if (existing) await cache.delete(request);
  const response = await fetchBuffered(request, { cache: "no-store" }, 30000);
  if (!(await shellResponseIsValid(response, path))) {
    throw new Error(`Essential app-shell file failed integrity checks: ${path}`);
  }
  await cache.put(request, response.clone());
  const stored = await cache.match(request);
  if (!(await shellResponseIsValid(stored, path))) {
    await cache.delete(request);
    throw new Error(`Essential app-shell file was not retained correctly: ${path}`);
  }
}

async function fetchRuntimeSource(dependency) {
  // Race the alternate origins instead of waiting for a stalled first CDN.
  // Each source is independently bounded; once one full file is read, abort the rest.
  const controllers = [];
  const attempts = dependency.urls.map(url => {
    const controller = new AbortController();
    controllers.push(controller);
    return fetchBuffered(url, { mode: "cors", cache: "no-store" }, 20000, controller).then(response => {
      const contentType = response.headers.get("content-type") || "";
      if (/three\.(module|core)\.js$/.test(dependency.path) && !/(javascript|ecmascript)/i.test(contentType)) {
        throw new Error(`Three.js source returned an unexpected content type: ${url}`);
      }
      if (dependency.path.endsWith(".png") && !/^image\//i.test(contentType)) {
        throw new Error(`Earth texture source returned an unexpected content type: ${url}`);
      }
      return { response, controller };
    });
  });
  try {
    const winner = await Promise.any(attempts);
    controllers.forEach(controller => { if (controller !== winner.controller) controller.abort(); });
    return winner.response;
  } catch (_) {
    controllers.forEach(controller => controller.abort());
    throw new Error(`All bounded download sources failed for ${dependency.path}. Check the connection and retry.`);
  }
}

async function localResponse(remoteResponse, dependency) {
  const contentType = remoteResponse.headers.get("content-type") || "";
  if (/three\.(module|core)\.js$/.test(dependency.path) && !/(javascript|ecmascript)/i.test(contentType)) {
    throw new Error(`Three.js module did not return a JavaScript content type: ${dependency.path}`);
  }
  if (dependency.path.endsWith(".png") && !/^image\//i.test(contentType)) {
    throw new Error("Earth texture did not return an image content type.");
  }
  // Rebuild the response as a same-origin response and retain only safe headers.
  // This avoids carrying the CDN response URL across the local cache boundary.
  const body = await remoteResponse.arrayBuffer();
  if (/three\.(module|core)\.js$/.test(dependency.path) && body.byteLength < 10000) {
    throw new Error(`Three.js module is empty or truncated: ${dependency.path}`);
  }
  if (dependency.path.endsWith(".png") && body.byteLength < 50000) {
    throw new Error(`Earth texture is empty or truncated: ${dependency.path}`);
  }
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000"
    }
  });
}

async function stageRuntimeDependency(cache, dependency) {
  const localRequest = new Request(new URL(dependency.path, self.registration.scope).href);
  const existing = await cache.match(localRequest);
  if (existing) {
    try {
      // Reuse a fully verified entry from a previous interrupted install attempt.
      await localResponse(existing.clone(), dependency);
      return;
    } catch (_) {
      await cache.delete(localRequest);
    }
  }
  const remote = await fetchRuntimeSource(dependency);
  const local = await localResponse(remote, dependency);
  await cache.put(localRequest, local.clone());
  const stored = await cache.match(localRequest);
  if (!stored) throw new Error(`Runtime dependency was not retained in cache: ${dependency.path}`);
  await localResponse(stored.clone(), dependency);
}

async function runtimeResponse(request, dependency) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const remote = await fetchRuntimeSource(dependency);
  const local = await localResponse(remote, dependency);
  await cache.put(request, local.clone());
  return local;
}

function injectSameGlobeAPI(html) {
  const anchor = "// LIVE_EARTH_HOME_RENDERER_HOOKS";
  if (html.includes(anchor) && !html.includes("window.LiveEarthScene")) {
    const api = `
window.LiveEarthScene = (() => {
  // Home-only Location marker: parent it to the exact Engine surface so it
  // follows the same rotation without changing the globe or its geometry.
  const locationVector = new T.Vector3();
  const locationMarker = new T.Group();
  const locationHalo = new T.Mesh(
    new T.SphereGeometry(0.031, 16, 12),
    new T.MeshBasicMaterial({color:0xff234d,transparent:true,opacity:0.28,depthWrite:false})
  );
  const locationDot = new T.Mesh(
    new T.SphereGeometry(0.014, 16, 12),
    new T.MeshBasicMaterial({color:0xff183f,depthWrite:false})
  );
  locationMarker.add(locationHalo, locationDot);
  locationMarker.visible = false;
  earth.add(locationMarker);

  let locationEnabled = false;
  let hasLocation = false;
  let locationCoordinates = null;
  const featureLayers = new Map();

  function syncLocationMarker() {
    locationMarker.visible = hasLocation && locationEnabled;
    draw();
  }

  function setLocation(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return false;
    }
    const phi = latitude * Math.PI / 180;
    const lambda = longitude * Math.PI / 180;
    locationVector.set(
      Math.cos(phi) * Math.cos(lambda),
      Math.sin(phi),
      -Math.cos(phi) * Math.sin(lambda)
    ).normalize();
    locationHalo.position.copy(locationVector).multiplyScalar(1.006);
    locationDot.position.copy(locationVector).multiplyScalar(1.019);
    locationCoordinates = { latitude, longitude, capturedAt: Date.now() };
    hasLocation = true;
    syncLocationMarker();
    return true;
  }

  function setLocationEnabled(enabled) {
    locationEnabled = enabled === true;
    if (!locationEnabled) {
      hasLocation = false;
      locationCoordinates = null;
    }
    syncLocationMarker();
  }

  function getLocation() {
    if (!locationEnabled || !hasLocation || !locationCoordinates) return null;
    if (Date.now() - locationCoordinates.capturedAt > 120000) return null;
    return {
      latitude: locationCoordinates.latitude,
      longitude: locationCoordinates.longitude,
      capturedAt: locationCoordinates.capturedAt
    };
  }

  function removeLayer(id) {
    const cleanup = featureLayers.get(id);
    if (!cleanup) return false;
    featureLayers.delete(id);
    try { cleanup(); }
    catch (error) { console.warn("[LIVE // EARTH] Layer cleanup failed:", id, error); }
    draw();
    return true;
  }

  function registerLayer(id, factory) {
    if (typeof id !== "string" || !id.trim() || typeof factory !== "function") {
      throw new TypeError("An Earth layer needs a stable id and a factory function.");
    }
    removeLayer(id);
    const cleanup = factory({
      THREE: T,
      scene,
      earth,
      group,
      camera,
      renderer,
      redraw: draw,
      requestRender: draw,
      getLocation
    });
    if (typeof cleanup === "function") featureLayers.set(id, cleanup);
    draw();
    return () => removeLayer(id);
  }

  return Object.freeze({
    setLocation,
    setLocationEnabled,
    getLocation,
    registerLayer,
    unregisterLayer: removeLayer,
    getTHREE: () => T,
    requestRender: draw
  });
})();
window.dispatchEvent(new Event("live-earth-scene-ready"));
`;
    html = html.replace(anchor, api + "\n" + anchor);
  }
  return html;
}

function injectSolarDayNight(html) {
  const anchor = "// LIVE_EARTH_HOME_RENDERER_HOOKS";
  if (!html.includes(anchor) || html.includes("LIVE_EARTH_SOLAR_DAY_NIGHT_V9")) return html;
  const code = `
/* LIVE_EARTH_SOLAR_DAY_NIGHT_V9 — geographically aligned solar terminator + restrained night-side terrain reveal. */
(() => {
  const earthMesh = earth;
  const solarLight = sun;
  const solarVector = new T.Vector3();
  const solarLocal = new T.Vector3();
  const worldQuaternion = new T.Quaternion();
  const ambient = scene.children.find(o => o.isAmbientLight);
  if (ambient) ambient.intensity = 0.12;
  solarLight.intensity = 2.3;

  const utcDayOfYear = date => {
    const start = Date.UTC(date.getUTCFullYear(),0,0);
    return Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-start)/86400000);
  };
  function getSolarLocalDirection(date = new Date()) {
    const day = utcDayOfYear(date);
    const hour = date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600 + date.getUTCMilliseconds()/3600000;
    const gamma = 2*Math.PI/365*(day-1+(hour-12)/24);
    const declination = 0.006918 - 0.399912*Math.cos(gamma) + 0.070257*Math.sin(gamma)
      - 0.006758*Math.cos(2*gamma) + 0.000907*Math.sin(2*gamma)
      - 0.002697*Math.cos(3*gamma) + 0.00148*Math.sin(3*gamma);
    const equationMinutes = 229.18*(0.000075 + 0.001868*Math.cos(gamma) - 0.032077*Math.sin(gamma)
      - 0.014615*Math.cos(2*gamma) - 0.040849*Math.sin(2*gamma));
    const solarMinutes = hour*60 + equationMinutes;
    const subsolarLongitude = (720-solarMinutes)*Math.PI/720;
    // Three.js SphereGeometry maps the texture's central meridian (longitude 0°)
    // to local +X. East-positive longitude maps toward local -Z.
    // Subsolar unit vector: (cos(dec)*cos(lon), sin(dec), -cos(dec)*sin(lon)).
    solarLocal.set(
      Math.cos(declination)*Math.cos(subsolarLongitude),
      Math.sin(declination),
      -Math.cos(declination)*Math.sin(subsolarLongitude)
    ).normalize();
    return solarLocal;
  }

  function updateSolarDayNight(date = new Date()) {
    getSolarLocalDirection(date);
    // Follow the same model transform as the texture-bearing Earth mesh. This
    // keeps the terminator aligned when the user rotates the globe by touch.
    earthMesh.getWorldQuaternion(worldQuaternion);
    solarVector.copy(solarLocal).applyQuaternion(worldQuaternion).normalize();
    solarLight.position.copy(solarVector).multiplyScalar(12);
    solarLight.target.position.set(0,0,0);
    solarLight.target.updateMatrixWorld();
    if (shaderUniforms?.uLESunDirection) shaderUniforms.uLESunDirection.value.copy(solarVector).negate();
    draw();
  }

  let shaderUniforms = null;
  const material = earthMesh.material;
  const previousCompile = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    previousCompile?.(shader);
    shader.uniforms.uLESunDirection = {value:solarVector.clone()};
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec3 vLEWorldNormal;\\nvoid main() {")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\\n vLEWorldNormal = normalize(mat3(modelMatrix) * objectNormal);");
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec3 uLESunDirection;\\nvarying vec3 vLEWorldNormal;\\nvoid main() {")
      .replace("#include <emissivemap_fragment>", \`#include <emissivemap_fragment>
        float leSolarDot = dot(normalize(vLEWorldNormal), normalize(uLESunDirection));
        float leNight = 1.0 - smoothstep(-0.10, 0.08, leSolarDot);
        float leTwilight = 1.0 - smoothstep(0.015, 0.24, abs(leSolarDot));
        // Very restrained, texture-coloured fill reveals terrain without washing
        // out the daylight hemisphere. A cool twilight rim softens the terminator.
        totalEmissiveRadiance += diffuseColor.rgb * leNight * 0.14;
        totalEmissiveRadiance += vec3(0.012, 0.026, 0.052) * leTwilight * 0.20;\`);
    shaderUniforms = shader.uniforms;
  };
  material.needsUpdate = true;

  updateSolarDayNight();
  // Recompute when the globe is manually rotated; the solar vector follows
  // the globe's model transform instead of drifting away from the visible map.
  canvas.addEventListener("pointermove", () => updateSolarDayNight(), {passive:true});
  let solarTimer = 0;
  function startSolarClock() {
    if (solarTimer || document.hidden) return;
    solarTimer = setInterval(() => updateSolarDayNight(new Date()), 30000);
  }
  function stopSolarClock() {
    if (solarTimer) clearInterval(solarTimer);
    solarTimer = 0;
  }
  startSolarClock();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopSolarClock();
    else { updateSolarDayNight(new Date()); startSolarClock(); }
  });
  window.addEventListener("pagehide", stopSolarClock, {once:true});
  window.LiveEarthSolar = {update:updateSolarDayNight};
})();
`;
  return html.replace(anchor, code + "\n" + anchor);
}

self.addEventListener("install", event => {
  // Activate only after every essential file has a verified cached copy. A failed
  // candidate never takes control; any completed, validated files remain dormant
  // in its versioned cache so a retry can reuse them without another full download.
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      // Stage first-party files concurrently and wait for every request to settle
      // before activation. Invalid or missing resources are never written to cache.
      const shellResults = await Promise.allSettled(APP_SHELL.map(path => stageShellAsset(cache, path)));
      const shellFailure = shellResults.find(result => result.status === "rejected");
      if (shellFailure) throw new Error(`App-shell staging failed: ${shellFailure.reason?.message || shellFailure.reason}`);
      // Three independent large/runtime resources can stage in parallel. Each has
      // two raced origins and a hard timeout, so a stalled CDN cannot freeze install.
      const runtimeResults = await Promise.allSettled(RUNTIME_DEPENDENCIES.map(dependency => stageRuntimeDependency(cache, dependency)));
      const runtimeFailure = runtimeResults.find(result => result.status === "rejected");
      if (runtimeFailure) throw new Error(`Runtime staging failed: ${runtimeFailure.reason?.message || runtimeFailure.reason}`);
      await self.skipWaiting();
    } catch (error) {
      // Keep already verified candidate entries for a user-requested retry.
      // They are not serving pages because this worker never activates on failure.
      // On the next install, every retained entry is rechecked before reuse.
      throw error;
    }
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // The old weekly reader cache is obsolete. User IndexedDB and other
    // bounded optional resources remain untouched.
    await caches.delete("live-earth-weekly-reader-v1");
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  const message = event.data || {};
  // Compatibility with an older already-open v68/v69 page: never let an old
  // build label strand the new waiting worker after explicit user interaction.
  if (message.type === "LIVE_EARTH_SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (message.type !== "LIVE_EARTH_APP_READY_V75" || message.buildId !== BUILD_ID) return;
  event.waitUntil((async () => {
    // Keep exactly one active app-shell cache after the new app verifies startup.
    // The bounded optional-data cache and user IndexedDB are intentionally untouched.
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
  })());
});

function injectStartupGate(html) {
  if (html.includes('id="le-startup-gate"')) return html;

  const expectedPaths = JSON.stringify([...APP_SHELL, ...RUNTIME_DEPENDENCIES.map(item => item.path)]);
  const cacheName = JSON.stringify(CACHE_NAME);
  const buildId = JSON.stringify(BUILD_ID);
  const style = `<style id="le-startup-gate-style">
  #le-startup-gate{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;overflow:hidden;isolation:isolate;box-sizing:border-box;padding:24px 22px calc(24px + env(safe-area-inset-bottom));color:#edf8ff;background:radial-gradient(ellipse at 50% 34%,#102b46 0%,#071321 38%,#030811 72%,#02050b 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;opacity:1;transition:opacity .42s ease;touch-action:pan-y}
  #le-startup-gate[hidden]{display:none}
  #le-startup-gate:before{content:"";position:absolute;inset:0;z-index:-2;background-image:radial-gradient(1px 1px at 7% 18%,#d7f4ffad 98%,transparent),radial-gradient(1px 1px at 19% 72%,#d7f4ff80 98%,transparent),radial-gradient(1.3px 1.3px at 78% 16%,#e4f8ffba 98%,transparent),radial-gradient(1px 1px at 87% 64%,#b9e9ff8c 98%,transparent),radial-gradient(1px 1px at 61% 83%,#e4f8ff8c 98%,transparent),radial-gradient(1px 1px at 35% 33%,#e4f8ff70 98%,transparent),radial-gradient(1px 1px at 93% 38%,#d7f4ff70 98%,transparent);opacity:.8}
  #le-startup-gate:after{content:"";position:absolute;inset:auto -20% -36% -20%;height:55%;z-index:-1;background:radial-gradient(ellipse at center,#0d42684d,transparent 68%);pointer-events:none}
  #le-startup-gate *{box-sizing:border-box}
  #le-startup-gate .le-gate-panel{position:relative;width:min(100%,390px);margin:auto;padding:15px 0 8px}
  #le-startup-gate .le-gate-brand{font-size:13px;font-weight:800;letter-spacing:.23em;color:#f3faff;white-space:nowrap;text-shadow:0 0 24px #5ecbff35}
  #le-startup-gate .le-gate-brand .le-gate-slash{color:#62d6ff;margin:0 .25em}
  #le-startup-gate .le-gate-world{position:relative;width:clamp(142px,42vw,186px);aspect-ratio:1;margin:29px auto 29px;display:grid;place-items:center;isolation:isolate}
  #le-startup-gate .le-gate-orbit{position:absolute;inset:-6%;border:1px solid #71d5ff34;border-radius:50%;transform:rotate(-27deg) scaleY(.38);box-shadow:0 0 18px #54caff12;animation:le-gate-orbit 5.5s linear infinite}
  #le-startup-gate .le-gate-orbit:after{content:"";position:absolute;left:17%;top:12%;width:7px;height:7px;border-radius:50%;background:#8de4ff;box-shadow:0 0 12px 3px #64d9ff86}
  #le-startup-gate .le-gate-orbit-two{inset:6%;transform:rotate(32deg) scaleY(.42);border-color:#9ecfff21;animation-direction:reverse;animation-duration:7.5s}
  #le-startup-gate .le-gate-orbit-two:after{left:auto;right:18%;top:auto;bottom:12%;width:4px;height:4px;background:#d6f5ff;box-shadow:0 0 9px 2px #70d8ff72}
  #le-startup-gate .le-gate-planet{position:relative;width:78%;aspect-ratio:1;overflow:hidden;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 31% 23%,#a0edff 0%,#2e91bf 18%,#125078 47%,#041929 76%);box-shadow:inset -16px -13px 27px #000a,inset 5px 4px 10px #a4edff52,0 0 30px #2fbfff32,0 0 70px #298dce13}
  #le-startup-gate .le-gate-planet img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;filter:drop-shadow(0 0 13px #55caff30)}
  #le-startup-gate .le-gate-title{margin:0;font-size:clamp(22px,6vw,27px);font-weight:650;letter-spacing:-.035em;line-height:1.2;color:#f1f8ff}
  #le-startup-gate .le-gate-message{margin:12px 0 0;min-height:20px;font-size:13px;line-height:1.5;letter-spacing:.015em;color:#b7d2e5}
  #le-startup-gate .le-gate-track{height:4px;margin:26px auto 13px;width:min(100%,292px);overflow:hidden;border-radius:999px;background:#b3deff19;box-shadow:inset 0 0 0 1px #9adfff12}
  #le-startup-gate .le-gate-fill{height:100%;width:2%;border-radius:inherit;background:linear-gradient(90deg,#319ed2,#74e2ff 64%,#d0f7ff);box-shadow:0 0 16px #52caff64;transition:width .22s ease}
  #le-startup-gate .le-gate-detail{margin:0;min-height:18px;font-size:11px;line-height:1.5;letter-spacing:.045em;color:#789bb5}
  #le-startup-gate .le-gate-failure{margin:23px auto 0;max-width:320px}
  #le-startup-gate .le-gate-failure[hidden]{display:none}
  #le-startup-gate .le-gate-failure p{margin:0 0 14px;font-size:13px;line-height:1.55;color:#c5d8e7}
  #le-startup-gate .le-gate-retry{appearance:none;min-height:42px;padding:11px 21px;border:1px solid #79d6ff76;border-radius:999px;background:linear-gradient(135deg,#2d9acb36,#ffffff08);color:#ecf9ff;font:650 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.055em;box-shadow:0 0 20px #46caff15}
  #le-startup-gate .le-gate-retry:focus-visible{outline:2px solid #b8efff;outline-offset:4px}
  #le-startup-gate.le-gate-ready{opacity:0;pointer-events:none}
  @keyframes le-gate-orbit{to{transform:rotate(333deg) scaleY(.38)}}
  @media(prefers-reduced-motion:reduce){#le-startup-gate,#le-startup-gate .le-gate-fill{transition:none}#le-startup-gate .le-gate-orbit{animation:none}}
  </style>`;

  const markup = `
  <div id="le-startup-gate" role="status" aria-live="polite" aria-label="LIVE // EARTH startup readiness">
    <div class="le-gate-panel">
      <div class="le-gate-brand"><span style="color:#62d6ff">LIVE</span><span class="le-gate-slash">//</span> EARTH</div>
      <div class="le-gate-world" aria-hidden="true">
        <div class="le-gate-orbit"></div><div class="le-gate-orbit le-gate-orbit-two"></div>
        <div class="le-gate-planet"><img src="./Earth/earth.webp" alt="" draggable="false" onerror="this.style.display='none'"></div>
      </div>
      <h1 class="le-gate-title">Preparing your world</h1>
      <p id="le-gate-message" class="le-gate-message">Checking essential assets…</p>
      <div class="le-gate-track" role="progressbar" aria-label="Startup preparation" aria-valuemin="0" aria-valuemax="100"><div id="le-gate-fill" class="le-gate-fill"></div></div>
      <p id="le-gate-detail" class="le-gate-detail">Verifying local resources before entering orbit</p>
      <div id="le-gate-failure" class="le-gate-failure" hidden><p id="le-gate-error-text">A required file could not be verified.</p><button id="le-gate-retry" class="le-gate-retry" type="button">Retry preparation</button></div>
    </div>
  </div>
  <script id="le-startup-gate-script">
  (() => {
    'use strict';
    const BUILD_ID = ${buildId};
    const CACHE_NAME = ${cacheName};
    const EXPECTED_PATHS = ${expectedPaths};
    const REPAIR_MARKER = 'le-startup-repair-' + BUILD_ID;
    const RETRY_MARKER = 'le-startup-auto-retry-' + BUILD_ID;
    const gate = document.getElementById('le-startup-gate');
    const message = document.getElementById('le-gate-message');
    const detail = document.getElementById('le-gate-detail');
    const fill = document.getElementById('le-gate-fill');
    const failure = document.getElementById('le-gate-failure');
    const errorText = document.getElementById('le-gate-error-text');
    const retry = document.getElementById('le-gate-retry');
    let busy = false;
    let failed = false;
    let ready = false;
    let lastInvalid = [];
    let sceneFailure = '';
    let knownBadPaths = [];
    let repairAttempted = false;
    let lastAssetCheck = 0;
    // OFFLINE STARTUP CONTRACT: transient service-worker/network failures receive
    // two bounded automatic preparation retries before asking the user to retry.
    // This never bypasses cache integrity, controller, Location-OFF, or renderer checks.
    const MAX_AUTOMATIC_RETRIES = 2;
    let automaticRetriesUsed = 0;
    try {
      const savedRetries = Number(sessionStorage.getItem(RETRY_MARKER) || 0);
      automaticRetriesUsed = Number.isFinite(savedRetries)
        ? Math.max(0, Math.min(MAX_AUTOMATIC_RETRIES, Math.floor(savedRetries)))
        : 0;
    } catch (_) { /* Some private browsing modes may restrict session storage. */ }

    function setStage(percent, title, subline) {
      message.textContent = title;
      detail.textContent = subline || '';
      fill.style.width = Math.max(2, Math.min(100, percent)) + '%';
      const track = gate.querySelector('.le-gate-track');
      if (track) track.setAttribute('aria-valuenow', String(Math.round(percent)));
    }
    function fail(text) {
      failed = true;
      failure.hidden = false;
      errorText.textContent = text;
      retry.disabled = false;
      retry.textContent = 'Retry preparation';
      setStage(100, 'One more check is needed', 'Home stays protected until the essentials are ready');
    }
    function expectedMime(path, type) {
      if (!type) return false;
      if (/\\.js$/i.test(path)) return /(javascript|ecmascript)/i.test(type);
      if (/\\.html?$/i.test(path) || /\\/$/.test(path) || path === './') return /text\\/html/i.test(type);
      if (/\\.(png|webp|jpe?g)$/i.test(path)) return /^image\\//i.test(type);
      if (/\\.svg$/i.test(path)) return /(svg|image)/i.test(type);
      if (/\\.json$/i.test(path)) return /(json|text\\/plain)/i.test(type);
      return true;
    }
    function minBytes(path) {
      if (/three\\.(module|core)\\.js$/i.test(path)) return 10000;
      if (/earth-land-ocean-ice-2048\\.png$/i.test(path)) return 50000;
      if (/\\.js$/i.test(path)) return 100;
      if (/\\.html?$/i.test(path) || path === './' || /\\/$/.test(path)) return 500;
      if (/\\.json$/i.test(path)) return 16;
      if (/\\.(png|webp|jpe?g|svg)$/i.test(path)) return 100;
      return 1;
    }
    async function inspectPath(path, cache) {
      const url = new URL(path, document.baseURI).href;
      try {
        const response = await cache.match(url);
        if (!response) return 'missing';
        if (!response.ok || response.type === 'opaque') return 'invalid response';
        const type = response.headers.get('content-type') || '';
        if (!expectedMime(path, type)) return 'unexpected file type';
        const bytes = await response.clone().arrayBuffer();
        if (bytes.byteLength < minBytes(path)) return 'empty or truncated file';
        return '';
      } catch (_) { return 'unreadable cache entry'; }
    }
    async function inspectAll() {
      const cache = await caches.open(CACHE_NAME);
      const invalid = [];
      let count = 0;
      for (const path of EXPECTED_PATHS) {
        const issue = await inspectPath(path, cache);
        count++;
        setStage(4 + Math.round(63 * count / EXPECTED_PATHS.length), 'Checking essential assets', count + ' of ' + EXPECTED_PATHS.length + ' resources verified');
        if (issue) invalid.push({path, issue});
      }
      lastAssetCheck = Date.now();
      return invalid;
    }
    // PRODUCT RULE: try a fresh network sync first when online, then verify the full
    // shell before Home is released. Offline use is allowed only from the saved shell.
    // navigator.onLine can remain true when an installed iOS web app cannot reach its
    // origin, so a complete network-layer failure may use the saved shell as fallback.
    // Do not treat partial syncs, HTTP/content-type errors, or invalid files as offline.
    // Wallpaper decoding is intentionally not an additional startup gate.
    function isNetworkUnavailableError(error) {
      const text = String(error && error.message ? error.message : error).toLowerCase();
      return [
        'load failed', 'failed to fetch', 'network error', 'network request failed',
        'fetch failed', 'networkerror', 'network unreachable', 'connection reset',
        'connection closed', 'connection failed', 'internet disconnected'
      ].some(marker => text.includes(marker));
    }
    async function syncOnlineAssets() {
      const total = EXPECTED_PATHS.length;
      let completed = 0;
      const results = await Promise.allSettled(EXPECTED_PATHS.map(async path => {
        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const url = new URL(path, document.baseURI).href;
            const response = await fetch(url, {
              cache: 'no-store',
              credentials: 'same-origin',
              headers: { 'X-Live-Earth-Force-Fresh': '1' }
            });
            if (!response || !response.ok || response.type === 'opaque') throw new Error('Fresh download returned no usable response');
            const type = response.headers.get('content-type') || '';
            if (!expectedMime(path, type)) throw new Error('Downloaded file has the wrong content type');
            const bytes = await response.clone().arrayBuffer();
            if (bytes.byteLength < minBytes(path)) throw new Error('Downloaded file is empty or truncated');
            return true;
          } catch (error) { lastError = error; }
        }
        throw new Error(path + ': ' + (lastError?.message || 'fresh download failed'));
      }).map(async promise => {
        try { return await promise; }
        finally {
          completed++;
          setStage(3 + Math.round(63 * completed / Math.max(1, total)), 'Downloading fresh online files', completed + ' of ' + total + ' essential resources synchronized');
        }
      }));
      const failedIndex = results.findIndex(result => result.status === 'rejected');
      if (failedIndex >= 0) {
        // FALLBACK RULE: if every essential request failed at the network layer,
        // defer to inspectAll() to verify the complete saved shell. A partial sync or
        // a response that fails integrity checks still blocks startup, preserving the
        // fresh-online contract whenever a usable live response is available.
        const allUnavailable = results.length > 0 && results.every(result =>
          result.status === 'rejected' && isNetworkUnavailableError(result.reason)
        );
        if (allUnavailable) return false;
        const reason = results[failedIndex].reason;
        throw new Error('Online sync failed: ' + (reason?.message || String(reason)) + '. Home remains protected; retry when the connection is stable.');
      }
      return true;
    }
    async function repairPath(path) {
      const cache = await caches.open(CACHE_NAME);
      const url = new URL(path, document.baseURI).href;
      // Keep any existing saved entry until a new network response has passed verification.
      const previous = await cache.match(url);
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(url, {cache:'reload', credentials:'same-origin'});
          if (!response || !response.ok || response.type === 'opaque') throw new Error('Download did not return a usable response');
          await cache.put(url, response.clone());
          const issue = await inspectPath(path, cache);
          if (!issue) return true;
          lastError = new Error(issue);
          await cache.delete(url);
          if (previous) await cache.put(url, previous.clone());
        } catch (error) { lastError = error; }
      }
      throw lastError || new Error('Asset repair failed');
    }
    function getMissingControllers() {
      const paths = [...knownBadPaths];
      if (!window.LiveEarthScene) paths.push('./vendor/three.module.js','./vendor/three.core.js','./runtime-assets/earth-land-ocean-ice-2048.png');
      if (!window.LiveEarthEngine) paths.push('./Global/earth-engine.js');
      if (!window.LiveEarthViewpointBridge) paths.push('./Global/earth-viewpoint-bridge.js');
      if (window.__liveEarthEarthRendererInstalled !== true) paths.push('./Earth/earth-view-controller.js');
      if (!window.LiveEarthViewManager) paths.push('./Global/view-manager.js');
      if (!window.LiveEarthSkyViews) paths.push('./Global/sky-view-controller.js');
      if (!window.__liveEarthMoonRendererInstalled) paths.push('./Moon/moon-view-controller.js');
      if (!window.__liveEarthStacksFeatureViewsInstalled) paths.push('./Stacks/stacks-feature-views.js');
      if (!window.__liveEarthControlsInstalled || typeof window.liveEarthLocationAllowed !== 'function') paths.push('./Global/orb-controls-v4.js');
      if (!window.__liveEarthLocationScannerInstalled) paths.push('./Location/location.js');
      const brokenImages = [...document.querySelectorAll('#navButtons .orbImage')].filter(img => img.complete && img.naturalWidth === 0);
      for (const img of brokenImages) {
        const src = img.getAttribute('src');
        if (src) paths.push(src);
      }
      return [...new Set(paths)];
    }
    async function repairThenReload(paths, userRequested) {
      let markerExists = false;
      try { markerExists = sessionStorage.getItem(REPAIR_MARKER) === '1'; } catch (_) { markerExists = true; }
      if (markerExists && !userRequested) return false;
      if (navigator.onLine === false) return false;
      repairAttempted = true;
      try { sessionStorage.setItem(REPAIR_MARKER, '1'); } catch (_) { if (!userRequested) return false; }
      setStage(75, 'Repairing an essential file', 'Replacing only the resource that failed verification');
      for (let i = 0; i < paths.length; i++) {
        setStage(75 + Math.round(12 * (i + 1) / Math.max(1, paths.length)), 'Repairing an essential file', (i + 1) + ' of ' + paths.length + ' resources refreshed');
        await repairPath(paths[i]);
      }
      setStage(90, 'Rechecking the repaired files', 'Restarting from the verified local copy');
      const remaining = await inspectAll();
      if (remaining.length) throw new Error('Some resources still failed verification');
      location.reload();
      return true;
    }
    async function finishReady() {
      if (ready || failed) return;
      window.__liveEarthStartupReady = true;
      window.dispatchEvent(new Event('live-earth-startup-ready'));
      automaticRetriesUsed = 0;
      try { sessionStorage.removeItem(REPAIR_MARKER); } catch (_) {}
      try { sessionStorage.removeItem(RETRY_MARKER); } catch (_) {}
      ready = true;
      failure.hidden = true;
      setStage(100, 'Your world is ready', 'All essential systems verified · enjoy LIVE // EARTH');
      gate.setAttribute('aria-label', 'LIVE // EARTH is ready');
      setTimeout(() => {
        gate.classList.add('le-gate-ready');
        setTimeout(() => { gate.hidden = true; }, 460);
      }, 220);
    }
    function coreReady() {
      const orbImages = [...document.querySelectorAll('#navButtons .orbImage')];
      const imagesReady = orbImages.length === 5 && orbImages.every(img => img.complete && img.naturalWidth > 0);
      const modules = window.LiveEarthViewModules;
      return document.readyState === 'complete' &&
        !!window.LiveEarthScene && !!window.LiveEarthEngine && !!window.LiveEarthViewpointBridge && window.__liveEarthEarthRendererInstalled === true &&
        !!window.LiveEarthViewManager && !!modules && modules.has('earth-independent-renderer') &&
        modules.has('sky-container') && modules.has('moon-lunar-interface') &&
        window.__liveEarthMoonRendererInstalled === true && window.__liveEarthStacksFeatureViewsInstalled === true && !!window.LiveEarthSkyViews &&
        window.__liveEarthControlsInstalled === true && window.__liveEarthLocationScannerInstalled === true &&
        typeof window.liveEarthLocationAllowed === 'function' && window.liveEarthLocationAllowed() === false && imagesReady;
    }
    async function waitForOnlineWorkerUpdate() {
      if (navigator.onLine === false || !('serviceWorker' in navigator)) return;
      let registration = null;
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(resolve => setTimeout(() => resolve(null), 12000))
        ]);
      } catch (_) { return; }
      if (!registration) return;

      let observedWorker = null;
      const onUpdateFound = () => { observedWorker = registration.installing; };
      registration.addEventListener('updatefound', onUpdateFound, { once: true });
      try {
        await Promise.race([
          registration.update(),
          new Promise(resolve => setTimeout(resolve, 15000))
        ]);
      } catch (_) {
        // A failed update check should not prevent an already-installed app
        // from starting; the verified local shell remains the fallback.
      }
      registration.removeEventListener('updatefound', onUpdateFound);

      const worker = registration.installing || observedWorker;
      if (!worker || worker.state === 'activated' || worker.state === 'redundant') return;
      await Promise.race([
        new Promise(resolve => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            worker.removeEventListener('statechange', check);
            resolve();
          };
          const check = () => {
            if (worker.state === 'activated' || worker.state === 'redundant') finish();
          };
          const timer = setTimeout(finish, 35000);
          worker.addEventListener('statechange', check);
          check();
        }),
        new Promise(resolve => setTimeout(resolve, 35000))
      ]);
    }

    async function prepare(userRequested = false) {
      if (busy || ready) return;
      busy = true;
      failed = false;
      failure.hidden = true;
      retry.disabled = true;
      retry.textContent = 'Checking…';
      window.__liveEarthStartupReady = false;
      try {
        if (navigator.onLine !== false) {
          setStage(1, 'Checking for a fresh online app', 'Checking for updates before releasing Home');
          await waitForOnlineWorkerUpdate();
        }
        if (!('caches' in window)) throw new Error('This browser does not expose the local cache needed for safe startup.');
        let usingSavedOfflineShell = navigator.onLine === false;
        if (navigator.onLine !== false) {
          setStage(3, 'Refreshing essential app files', 'Downloading the current online files before Home opens');
          const freshSyncCompleted = await syncOnlineAssets();
          if (freshSyncCompleted === false) {
            // The network could not deliver any essential file. Continue only by
            // validating every saved entry; inspectAll() below remains the gate.
            usingSavedOfflineShell = true;
            setStage(3, 'Checking saved offline files', 'Fresh sync could not reach the server; verifying the last saved shell');
          }
        } else {
          setStage(3, 'Checking saved offline files', 'Using the last saved essential shell');
        }
        setStage(67, usingSavedOfflineShell ? 'Checking saved offline files' : 'Checking essential assets',
          usingSavedOfflineShell ? 'Verifying every required file in the saved shell' : 'Verifying the globe, views, navigation and location tools');
        let invalid = await inspectAll();
        if (invalid.length) {
          lastInvalid = invalid.map(item => item.path);
          setStage(70, 'Repairing a missing essential', invalid.length + ' resource(s) need a fresh verified copy');
          try {
            for (let i = 0; i < invalid.length; i++) {
              setStage(70 + Math.round(5 * (i + 1) / invalid.length), 'Repairing a missing essential', (i + 1) + ' of ' + invalid.length + ' files refreshed');
              await repairPath(invalid[i].path);
            }
            invalid = await inspectAll();
            if (invalid.length) throw new Error('One or more essential files still failed verification');
            const reloaded = await repairThenReload([], userRequested);
            if (reloaded) return;
            throw new Error('A corrected cache is ready, but a clean reload is required to use it. Tap Retry preparation.');
          } catch (repairError) {
            if (usingSavedOfflineShell) {
              throw new Error('A saved offline file is missing or failed verification. Connect to the internet and retry preparation.');
            }
            throw new Error('A required file could not be repaired. Connect to the internet and retry.');
          }
        }
        setStage(80, 'Warming up the globe', 'Initializing the Earth renderer and view systems');
        const start = Date.now();
        while (!coreReady()) {
          if (sceneFailure) {
            const missing = getMissingControllers();
            const repairPaths = missing.length ? missing : ['./vendor/three.module.js','./vendor/three.core.js','./runtime-assets/earth-land-ocean-ice-2048.png'];
            try { if (await repairThenReload(repairPaths, userRequested)) return; } catch (_) {}
            throw new Error(sceneFailure);
          }
          if (Date.now() - start > 45000) {
            const missing = getMissingControllers();
            if (missing.length) {
              const reloaded = await repairThenReload(missing, userRequested);
              if (reloaded) return;
            }
            throw new Error('The globe or one of its controls did not finish initializing.');
          }
          await new Promise(resolve => setTimeout(resolve, 180));
        }
        try {
          // The main scene's first requestAnimationFrame was queued before this gate.
          // Two frames later, verify that its WebGL2 surface exists and the context is alive.
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const sceneCanvas = document.getElementById('scene');
          const context = sceneCanvas && sceneCanvas.getContext('webgl2');
          if (!sceneCanvas || sceneCanvas.width < 1 || sceneCanvas.height < 1 || !context || context.isContextLost()) {
            throw new Error('The Earth renderer did not complete its first frame.');
          }
        } catch (renderError) {
          const missing = getMissingControllers();
          const repairPaths = missing.length ? missing : ['./vendor/three.module.js','./vendor/three.core.js','./runtime-assets/earth-land-ocean-ice-2048.png'];
          try { if (await repairThenReload(repairPaths, userRequested)) return; } catch (_) {}
          throw renderError;
        }
        await finishReady();
      } catch (error) {
        const message = error && error.message ? error.message : 'Startup could not be verified.';
        // Retry only offline/network-style failures automatically. Other integrity
        // or readiness errors are surfaced immediately so we do not hide real faults.
        // Retry transient network failures AND one-off online startup/renderer faults.
        // A full reload re-runs the script bootstrap; a persisted session counter prevents loops.
        const retryable = navigator.onLine === false || /online sync failed|fetchevent\.respondwith received an error|load failed|failed to fetch|network error|network request failed|networkerror|connection reset|connection closed|connection failed|network unreachable|startup script or the earth renderer encountered an error|required startup script failed to load|startup task failed|globe or one of its controls did not finish initializing|earth renderer did not complete its first frame|one or more essential files still failed verification|a required file could not be repaired/i.test(message);
        if (retryable && automaticRetriesUsed < MAX_AUTOMATIC_RETRIES) {
          automaticRetriesUsed++;
          let persistedRetry = false;
          try {
            sessionStorage.setItem(RETRY_MARKER, String(automaticRetriesUsed));
            persistedRetry = sessionStorage.getItem(RETRY_MARKER) === String(automaticRetriesUsed);
          } catch (_) {}
          failed = false;
          failure.hidden = true;
          retry.disabled = true;
          setStage(96, 'Retrying preparation automatically', 'Automatic retry ' + automaticRetriesUsed + ' of ' + MAX_AUTOMATIC_RETRIES + ' · Home remains protected');
          // Reload to give script and renderer startup a genuinely fresh attempt.
          // If session storage is unavailable, retry in place rather than risk a reload loop.
          window.setTimeout(() => {
            if (ready) return;
            if (persistedRetry) {
              location.reload();
            } else {
              sceneFailure = '';
              prepare(false);
            }
          }, 900);
        } else {
          automaticRetriesUsed = 0;
          try { sessionStorage.removeItem(RETRY_MARKER); } catch (_) {}
          fail(message + ' Your saved local data has not been changed by this check.');
        }
      } finally {
        busy = false;
        retry.disabled = false;
      }
    }
    retry.addEventListener('click', () => {
      failed = false;
      sceneFailure = '';
      const currentStatus = document.getElementById('status');
      if (currentStatus && /^Earth failed to load:/i.test(currentStatus.textContent || '')) sceneFailure = currentStatus.textContent.slice(0,180);
      prepare(true);
    });
    window.addEventListener('online', () => { if (failed && !busy) prepare(true); });
    window.addEventListener('error', event => {
      if (event.target && event.target.tagName === 'SCRIPT') {
        const src = event.target.src || '';
        const scriptPaths = ['./Global/orb-controls-v4.js','./Global/earth-engine.js','./Earth/earth-view-controller.js','./Global/view-manager.js','./Global/view-module-registry.js','./Stacks/stacks-feature-views.js','./Clouds/clouds-view.js','./Weather/weather-view.js','./Traffic/traffic-view.js','./Earthquakes/earthquakes-view.js','./Global/sky-view-controller.js','./Moon/moon-view-controller.js','./Sun/sun-view-controller.js','./Global/update-manager.js','./Data/data-recovery.js','./Location/location.js','./Home/moon-orbit.js','./Data/data-store.js'];
        for (const path of scriptPaths) if (src.endsWith(path.slice(1))) knownBadPaths.push(path);
        sceneFailure = 'A required startup script failed to load.';
      } else if (event.error) {
        sceneFailure = 'A startup script or the Earth renderer encountered an error.';
      }
    }, true);
    window.addEventListener('unhandledrejection', event => {
      if (event.reason) sceneFailure = 'A startup task failed: ' + String(event.reason.message || event.reason).slice(0,120);
    });
    const statusNode = document.getElementById('status');
    if (statusNode && window.MutationObserver) {
      new MutationObserver(() => {
        if (/^Earth failed to load:/i.test(statusNode.textContent || '')) sceneFailure = (statusNode.textContent || 'Earth failed to load.').slice(0,180);
      }).observe(statusNode, {childList:true,subtree:true,characterData:true,attributes:true});
    }
    prepare(false);
  })();
  </script>`;

  html = html.replace(/<\/head\s*>/i, style + '</head>');
  html = html.replace(/<body\b[^>]*>/i, function (tag) { return tag + markup; });
  return html;
}

async function transformHomeHTML(request, response, forceHome = false) {
  const type = response.headers.get("content-type") || "";
  const url = new URL(request.url);
  const isHome = forceHome || (type.includes("text/html") &&
    (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")));
  if (!isHome) return response;

  let html = await response.clone().text();
  // Support both the historical compact Home module and the readable module
  // block. Both forms resolve through the same staged same-origin Three.js file.
  const compactRemoteThreeImport = "try{T=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js')}catch(e){T=await import('https://unpkg.com/three@0.180.0/build/three.module.js')}";
  if (html.includes(compactRemoteThreeImport)) {
    html = html.replace(compactRemoteThreeImport, "T=await import('./vendor/three.module.js');");
  }
  const readableRemoteThreeImport = /try\s*\{\s*T\s*=\s*await import\(['"]https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/build\/three\.module\.js['"]\);\s*\}\s*catch\s*\([^)]*\)\s*\{\s*T\s*=\s*await import\(['"]https:\/\/unpkg\.com\/three@0\.180\.0\/build\/three\.module\.js['"]\);\s*\}/;
  if (readableRemoteThreeImport.test(html)) {
    html = html.replace(readableRemoteThreeImport, "T = await import('./vendor/three.module.js');");
  }
  // v71 could cache this malformed adjacent-statement sequence in transformed HTML.
  // Repair it explicitly so an old transformed cache cannot poison the v72 launch.
  html = html.replace(
    /T=await import\(['"]\.\/vendor\/three\.module\.js['"]\)\s*(?=const renderer\s*=)/g,
    "T=await import('./vendor/three.module.js');"
  );
  html = html.replaceAll(
    "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png",
    "./runtime-assets/earth-land-ocean-ice-2048.png"
  );
  html = html.replaceAll(
    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
    "./runtime-assets/earth-land-ocean-ice-2048.png"
  );
  html = injectSameGlobeAPI(html);
  html = injectSolarDayNight(html);
  if (!html.includes("orb-controls-v4.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Global/orb-controls-v4.js" defer></script>\n</body>');
  }
  if (!html.includes("earth-view-controller.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Earth/earth-view-controller.js" defer></script>\n</body>');
  }
  if (!html.includes("location.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Location/location.js" defer></script>\n</body>');
  }
  if (!html.includes("sky-view-controller.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Global/sky-view-controller.js" defer></script>\n</body>');
  }
  if (!html.includes("moon-view-controller.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Moon/moon-view-controller.js" defer></script>\n</body>');
  }
  if (!html.includes("view-manager.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Global/view-manager.js" defer></script>\n</body>');
  }
  // Prefer adding the registry to the existing sequential controller bootstrap,
  // preserving manager -> registry -> view-controller ordering on older cached HTML.
  if (!html.includes("view-module-registry.js")) {
    const bootstrapAnchor = "'./Global/view-manager.js',";
    if (html.includes(bootstrapAnchor)) {
      html = html.replace(bootstrapAnchor, bootstrapAnchor + "\n    './Global/view-module-registry.js',");
    } else {
      html = html.replace(/<\/body\s*>/i, '<script src="./Global/view-module-registry.js" defer></script>\n</body>');
    }
  }
  if (!html.includes("stacks-feature-views.js")) {
    const registryAnchor = "'./Global/view-module-registry.js',";
    if (html.includes(registryAnchor)) {
      html = html.replace(registryAnchor, registryAnchor + "\n    './Stacks/stacks-feature-views.js',");
    } else {
      html = html.replace(/<\/body\s*>/i, '<script src="./Stacks/stacks-feature-views.js" defer></script>\n</body>');
    }
  }
  if (!html.includes("update-manager.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./Global/update-manager.js" defer></script>\n</body>');
  }
  if (!html.includes("data-recovery.js")) {
    html = html.replace(/<\/body\s*>/i, '<script type="module" src="./Data/data-recovery.js"></script>\n</body>');
  }
  html = injectStartupGate(html);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  const transformed = new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, transformed.clone());
  return transformed;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const offlineFallback = async error => {
    const hit = await cache.match(request);
    if (hit) return await transformHomeHTML(request, hit);
    const fallback = await cache.match("./index.html");
    if (fallback) return await transformHomeHTML(request, fallback, true);
    throw error || new Error("No network connection and no saved essential Homepage is available.");
  };

  // Offline means the saved essential shell is the fast path. Online means
  // fetch the current Homepage first; Cache Storage is only a failure fallback.
  if (self.navigator && self.navigator.onLine === false) {
    return offlineFallback(new Error("Device reports no network connection."));
  }

  try {
    const response = await fetchBuffered(request, { cache: "no-store", credentials: "same-origin" }, 30000);
    const type = response.headers.get("content-type") || "";
    const url = new URL(request.url);
    const isHome = type.includes("text/html") &&
      (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/"));
    if (isHome) return await transformHomeHTML(request, response);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Only use the saved shell when the online request actually fails.
    return offlineFallback(error);
  }
}
async function boundedOptionalCache(request) {
  const cache = await caches.open(OPTIONAL_CACHE);

  // Optional online resources are refreshed from the network first. When the
  // device is offline, use the bounded saved copy immediately when available.
  if (self.navigator && self.navigator.onLine === false) {
    const hit = await cache.match(request);
    if (hit) return hit;
    return fetch(request);
  }

  let response;
  try {
    response = await fetch(request, { cache: "no-store" });
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }

  if (response?.ok && response.type !== "opaque") {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    while (keys.length > OPTIONAL_LIMIT) await cache.delete(keys.shift());
  }
  return response;
}
async function forceFreshEssential(request) {
  const url = new URL(request.url);
  const dependency = RUNTIME_DEPENDENCIES.find(item => runtimePath(item.path) === url.pathname);
  const cache = await caches.open(CACHE_NAME);

  // Runtime libraries are fetched fresh from the approved primary/backup origins.
  // Validate completely before replacing the last saved copy.
  if (dependency) {
    const remote = await fetchRuntimeSource(dependency);
    const local = await localResponse(remote, dependency);
    const key = new Request(new URL(dependency.path, self.registration.scope).href);
    await cache.put(key, local.clone());
    const stored = await cache.match(key);
    await localResponse(stored.clone(), dependency);
    return local;
  }

  const path = APP_SHELL.find(item => new URL(item, self.registration.scope).pathname === url.pathname);
  if (!path) throw new Error(`Online sync rejected a non-essential path: ${url.pathname}`);
  const networkRequest = new Request(request.url, { method: "GET", credentials: "same-origin", cache: "no-store" });
  const response = await fetchBuffered(networkRequest, { cache: "no-store", credentials: "same-origin" }, 30000);
  if (!(await shellResponseIsValid(response, path))) {
    throw new Error(`Fresh essential download failed validation: ${path}`);
  }
  const key = new Request(new URL(path, self.registration.scope).href);
  await cache.put(key, response.clone());
  const stored = await cache.match(key);
  if (!(await shellResponseIsValid(stored, path))) {
    throw new Error(`Fresh essential file was not retained correctly: ${path}`);
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // The startup gate marks required files that must come from the live network.
  // This route never silently substitutes a cached file for a failed online download.
  if (request.headers.get("X-Live-Earth-Force-Fresh") === "1") {
    event.respondWith(forceFreshEssential(request));
    return;
  }
  // ONLINE/OFFLINE CONTRACT: navigation and required resources prefer fresh online
  // content; saved verified shell is the offline path/recovery fallback. The marked
  // startup sync above specifically refuses a silent cache fallback while online.
  if (request.mode === "navigate" || request.destination === "document" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(networkFirst(request));
    return;
  }
  const runtimeDependency = RUNTIME_DEPENDENCIES.find(dependency => runtimePath(dependency.path) === url.pathname);
  if (runtimeDependency) {
    event.respondWith(runtimeResponse(request, runtimeDependency));
    return;
  }
  const shell = new Set(APP_SHELL.map(path => new URL(path, self.location.href).pathname));
  if (shell.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // Online essentials are refreshed before use. Saved entries are the
      // offline path or a recovery fallback if the network request fails.
      if (self.navigator && self.navigator.onLine === false) {
        const cached = await cache.match(request);
        if (cached) return cached;
      }
      try {
        const response = await fetchBuffered(request, { cache: "no-store" }, 30000);
        await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const hit = await cache.match(request);
        if (hit) return hit;
        throw error;
      }
    })());
    return;
  }
  event.respondWith(boundedOptionalCache(request));
});
