/* LIVE // EARTH — v79 launch update recovery + verified Sun asset shell. */
const CACHE_PREFIX = "live-earth-shell-";
const BUILD_ID = "v80-sun-bluehour-amber";
const CACHE_NAME = "live-earth-shell-v80-sun-bluehour-amber";
const OPTIONAL_CACHE = "live-earth-optional-v1";
const OPTIONAL_LIMIT = 48;
const APP_SHELL = [
 "./","./index.html","./ios-standalone-root-flow.js","./orb-controls-v4.js","./earth-mode-navigation.js","./sky-view-controller.js","./view-manager.js",
 "./location.html","./earth-orb-globe.js","./manifest.json","./icon.svg","./data-store.js","./location-scanner.js",
 "./astronomy.js","./moon-orbit.js","./dataset-manifest.json",
 "./moon-sky-background-responsive.svg",
 "./moon-sky-background-portrait.webp","./moon-sky-background-landscape.webp",
 "./sun-sky-background-portrait.webp","./sun-sky-background-landscape.webp",
 "./update-manager.js","./data-recovery.js",
 "./earth.webp","./moon.webp","./sun.webp","./location.webp","./stacks.webp"
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
  const anchor = "let active=null,x=0,y=0,drag=false;";
  if (html.includes(anchor) && !html.includes("window.LiveEarthScene")) {
    const api = `
window.__leEarthUnlocked = false;
window.LiveEarthScene = (() => {
  let unlocked = false;
  let quality = "basic";
  try { quality = localStorage.getItem("liveEarthQuality") === "hd" ? "hd" : "basic"; } catch (_) {}
  let animation = 0;
  let homeRotation = null;
  let homeZ = camera.position.z;
  // HOME VISUAL LOCK: capture the original Home geometry and renderer density
  // before any exploration quality profile is applied.
  const homeGeometry = earth.geometry;
  const homePixelRatio = renderer.getPixelRatio();
  const reducedGeometry = new T.SphereGeometry(1, 64, 48);
  const fullGeometry = new T.SphereGeometry(1, 96, 64);
  // LOCATION MARKER: a small surface-anchored point, parented to the same
  // rotating group as Earth. Home always shows it when tracking is enabled;
  // Exploration shows it only while its independent Scanner control is on.
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
  locationMarker.add(locationHalo,locationDot);
  locationMarker.visible = false;
  earth.add(locationMarker);
  let locationEnabled = false;
  let scannerVisible = false;
  let hasLocation = false;
  function syncLocationMarker() {
    locationMarker.visible = hasLocation && locationEnabled && (!unlocked || scannerVisible);
    draw();
  }
  function setLocation(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
    const phi = lat * Math.PI / 180;
    const lambda = lon * Math.PI / 180;
    // Match the solar/texture convention: lon 0° faces local +X;
    // east-positive longitude turns toward local -Z.
    locationVector.set(Math.cos(phi)*Math.cos(lambda), Math.sin(phi), -Math.cos(phi)*Math.sin(lambda)).normalize();
    locationHalo.position.copy(locationVector).multiplyScalar(1.006);
    locationDot.position.copy(locationVector).multiplyScalar(1.019);
    hasLocation = true;
    syncLocationMarker();
    return true;
  }
  function setLocationEnabled(enabled) {
    locationEnabled = !!enabled;
    if (!locationEnabled) { hasLocation = false; scannerVisible = false; }
    syncLocationMarker();
  }
  function setScannerVisible(visible) {
    scannerVisible = !!visible;
    syncLocationMarker();
  }
  function getScannerVisible() { return scannerVisible; }
  function restoreHomeVisualState() {
    earth.geometry = homeGeometry;
    renderer.setPixelRatio(homePixelRatio);
    draw();
  }
  function renderQuality(next) {
    quality = next === "hd" ? "hd" : "basic";
    // Quality selection is remembered globally, but only affects the globe
    // while Exploration is unlocked. Home always uses its captured baseline.
    if (!unlocked) {
      restoreHomeVisualState();
      return quality;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === "hd" ? 1.5 : 1));
    earth.geometry = quality === "hd" ? fullGeometry : reducedGeometry;
    draw();
    return quality;
  }
  function animateCamera(targetZ, done, targetRotation = null) {
    if (animation) cancelAnimationFrame(animation);
    const startZ = camera.position.z, start = performance.now();
    const startRotation = {x:group.rotation.x,y:group.rotation.y,z:group.rotation.z};
    const angleDelta = targetRotation ? {
      x:Math.atan2(Math.sin(targetRotation.x-startRotation.x),Math.cos(targetRotation.x-startRotation.x)),
      y:Math.atan2(Math.sin(targetRotation.y-startRotation.y),Math.cos(targetRotation.y-startRotation.y)),
      z:Math.atan2(Math.sin(targetRotation.z-startRotation.z),Math.cos(targetRotation.z-startRotation.z))
    } : null;
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 720;
    const tick = now => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.z = startZ + (targetZ - startZ) * eased;
      if (targetRotation && angleDelta) {
        group.rotation.set(
          startRotation.x + angleDelta.x * eased,
          startRotation.y + angleDelta.y * eased,
          startRotation.z + angleDelta.z * eased
        );
        if (t === 1) group.rotation.set(targetRotation.x,targetRotation.y,targetRotation.z);
      }
      camera.lookAt(0, 0, 0); draw();
      if (t < 1) animation = requestAnimationFrame(tick);
      else { animation = 0; done?.(); }
    };
    animation = requestAnimationFrame(tick);
  }
  function unlock() {
    if (unlocked) return;
    // Capture the actual Home camera before entering exploration. Never derive
    // the saved Home distance from the already-zoomed exploration camera.
    homeZ = camera.position.z;
    homeRotation = {x:group.rotation.x,y:group.rotation.y,z:group.rotation.z};
    unlocked = true; window.__leEarthUnlocked = true;
    scannerVisible = false;
    syncLocationMarker();
    renderQuality(quality);
    animateCamera(homeZ * 0.62);
  }
  function lock() {
    if (!unlocked) return;
    unlocked = false; window.__leEarthUnlocked = false;
    // Restore Home's original geometry and pixel density before returning.
    // The saved Basic/HD choice remains available for the next exploration,
    // but cannot alter the protected Home celestial view.
    scannerVisible = false;
    restoreHomeVisualState();
    syncLocationMarker();
    // Keep the latest explored globe rotation; only the camera returns Home.
    animateCamera(homeZ);
  }
  function setQuality(next) {
    quality = next === "hd" ? "hd" : "basic";
    try { localStorage.setItem("liveEarthQuality", quality); } catch (_) {}
    return renderQuality(quality);
  }
  function zoomBy(factor, smooth = true) {
    if (!unlocked || !Number.isFinite(factor) || factor <= 0) return camera.position.z;
    // Give Basic a modestly closer view, while HD unlocks the strongest
    // zoom-in range. Both profiles remain bounded by the approved Home scale.
    const minZ = quality === "hd" ? 0.88 : 1.30;
    const maxZ = Math.max(minZ, homeZ);
    const targetZ = Math.max(minZ, Math.min(maxZ, camera.position.z * factor));
    if (smooth) animateCamera(targetZ);
    else { if (animation) cancelAnimationFrame(animation); animation = 0; camera.position.z = targetZ; camera.lookAt(0,0,0); draw(); }
    return targetZ;
  }
  // Multi-touch is enabled only while exploring. The existing single-finger
  // pointer drag remains responsible for rotating the same globe.
  const pointers = new Map();
  let pinching = false;
  let pinchDistance = 0;
  function pointerPoint(event) { return {x:event.clientX,y:event.clientY}; }
  canvas.addEventListener("pointerdown", event => {
    if (!unlocked) return;
    pointers.set(event.pointerId, pointerPoint(event));
    if (pointers.size >= 2) {
      pinching = true;
      drag = false;
      active = null;
      pinchDistance = pointerGap();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, {capture:true,passive:false});
  canvas.addEventListener("pointermove", event => {
    if (!unlocked || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, pointerPoint(event));
    if (pinching && pointers.size >= 2) {
      const nextDistance = pointerGap();
      if (pinchDistance > 0 && nextDistance > 0) zoomBy(pinchDistance / nextDistance, false);
      pinchDistance = nextDistance;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, {capture:true,passive:false});
  function pointerGap() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y);
  }
  function finishPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const wasPinching = pinching;
    pointers.delete(event.pointerId);
    if (wasPinching) {
      event.preventDefault();
      event.stopImmediatePropagation();
      drag = false;
      active = null;
      if (pointers.size < 2) { pinching = false; pinchDistance = 0; pointers.clear(); }
    }
  }
  canvas.addEventListener("pointerup", finishPointer, {capture:true,passive:false});
  canvas.addEventListener("pointercancel", finishPointer, {capture:true,passive:false});
  // The quality selection is global and persistent. Keep the Home camera
  // baseline separate from the exploration zoom when orientation changes.
  window.addEventListener("resize", () => {
    requestAnimationFrame(() => {
      const fittedZ = camera.position.z; // index.html's fitCamera runs on resize
      if (unlocked) {
        if (Number.isFinite(fittedZ) && fittedZ > 0) homeZ = fittedZ;
        camera.position.z = homeZ * 0.62;
        renderQuality(quality);
      } else {
        homeZ = fittedZ;
        restoreHomeVisualState();
      }
      camera.lookAt(0,0,0); draw();
    });
  }, {passive:true});
  // Apply the saved global profile from first render; Basic is the safe default.
  renderQuality(quality);
  return {unlock,lock,setQuality,zoomBy,isUnlocked:()=>unlocked,getQuality:()=>quality,setLocation,setLocationEnabled,setScannerVisible,getScannerVisible};
})();
window.dispatchEvent(new Event("live-earth-scene-ready"));
`;
    html = html.replace(anchor, api + "\n" + anchor);
  }
  return html;
}

function injectSolarDayNight(html) {
  const anchor = "let active=null,x=0,y=0,drag=false;";
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
    // Keep the previous shared shell until this build reports verified startup.
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
        <div class="le-gate-planet"><img src="./earth.webp" alt="" draggable="false" onerror="this.style.display='none'"></div>
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
    async function repairPath(path) {
      const cache = await caches.open(CACHE_NAME);
      const url = new URL(path, document.baseURI).href;
      await cache.delete(url);
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
        } catch (error) { lastError = error; }
      }
      throw lastError || new Error('Asset repair failed');
    }
    function getMissingControllers() {
      const paths = [...knownBadPaths];
      if (!window.LiveEarthScene) paths.push('./vendor/three.module.js','./vendor/three.core.js','./runtime-assets/earth-land-ocean-ice-2048.png');
      if (!window.LiveEarthViewManager) paths.push('./view-manager.js');
      if (!window.LiveEarthSkyViews) paths.push('./sky-view-controller.js');
      if (!window.__liveEarthControlsInstalled || typeof window.liveEarthLocationAllowed !== 'function') paths.push('./orb-controls-v4.js');
      if (!window.__liveEarthLocationScannerInstalled) paths.push('./location-scanner.js');
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
      try { sessionStorage.removeItem(REPAIR_MARKER); } catch (_) {}
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
      return document.readyState === 'complete' &&
        !!window.LiveEarthScene && !!window.LiveEarthViewManager && !!window.LiveEarthSkyViews &&
        window.__liveEarthControlsInstalled === true && window.__liveEarthLocationScannerInstalled === true &&
        typeof window.liveEarthLocationAllowed === 'function' && window.liveEarthLocationAllowed() === false && imagesReady;
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
        if (!('caches' in window)) throw new Error('This browser does not expose the local cache needed for safe startup.');
        setStage(3, 'Checking essential assets', 'Verifying the globe, views, navigation and location tools');
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
        fail(message + ' Your saved local data has not been changed by this check.');
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
        const scriptPaths = ['./orb-controls-v4.js','./earth-mode-navigation.js','./sky-view-controller.js','./view-manager.js','./update-manager.js','./data-recovery.js','./location-scanner.js','./moon-orbit.js','./data-store.js'];
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
  const remoteThreeImport = "try{T=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js')}catch(e){T=await import('https://unpkg.com/three@0.180.0/build/three.module.js')}";
  if (html.includes(remoteThreeImport)) {
    html = html.replace(remoteThreeImport, "T=await import('./vendor/three.module.js');");
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
    html = html.replace(/<\/body\s*>/i, '<script src="./orb-controls-v4.js" defer></script>\n</body>');
  }
  if (!html.includes("earth-mode-navigation.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./earth-mode-navigation.js" defer></script>\n</body>');
  }
  if (!html.includes("location-scanner.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./location-scanner.js" defer></script>\n</body>');
  }
  if (!html.includes("sky-view-controller.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./sky-view-controller.js" defer></script>\n</body>');
  }
  if (!html.includes("view-manager.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./view-manager.js" defer></script>\n</body>');
  }
  if (!html.includes("update-manager.js")) {
    html = html.replace(/<\/body\s*>/i, '<script src="./update-manager.js" defer></script>\n</body>');
  }
  if (!html.includes("data-recovery.js")) {
    html = html.replace(/<\/body\s*>/i, '<script type="module" src="./data-recovery.js"></script>\n</body>');
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
  // Keep launch deterministic: use this worker build's fully staged shell first.
  // A deployment becomes current through service-worker install + silent activation,
  // never by mixing live HTML with an older set of scripts mid-session.
  const activeBuildHit = await cache.match(request);
  if (activeBuildHit) return await transformHomeHTML(request, activeBuildHit);
  try {
    const response = await fetchBuffered(request, { cache: "no-store" }, 30000);
    if (!response?.ok) throw Error("Network response not OK");
    const type = response.headers.get("content-type") || "";
    const url = new URL(request.url);
    const isHome = type.includes("text/html") &&
      (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/"));
    if (isHome) return await transformHomeHTML(request, response);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    // A failed first navigation can fall back to the cached shell. The transform
    // functions are idempotent, so already transformed HTML stays unchanged.
    const hit = await cache.match(request);
    if (hit) return await transformHomeHTML(request, hit);
    const fallback = await cache.match("./index.html");
    if (fallback) return await transformHomeHTML(request, fallback, true);
    throw error;
  }
}
async function boundedOptionalCache(request) {
  const cache = await caches.open(OPTIONAL_CACHE);
  const hit = await cache.match(request);
  if (hit) {
    await cache.delete(request);
    await cache.put(request, hit.clone());
    return hit;
  }
  const response = await fetch(request);
  if (response?.ok) {
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    while (keys.length > OPTIONAL_LIMIT) await cache.delete(keys.shift());
  }
  return response;
}
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
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
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetchBuffered(request, { cache: "reload" }, 30000);
      await cache.put(request, response.clone());
      return response;
    })());
    return;
  }
  event.respondWith(boundedOptionalCache(request));
});
