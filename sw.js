/* LIVE // EARTH — correct geographic solar direction and fixed-space sunlight, cache v42 corrected longitude basis. */
const CACHE_PREFIX = "live-earth-shell-";
const CACHE_NAME = "live-earth-shell-v55-earth-only-lighting-test";
const OPTIONAL_CACHE = "live-earth-optional-v1";
const OPTIONAL_LIMIT = 48;
const APP_SHELL = [
 "./","./index.html","./orb-controls-v4.js","./earth-mode-navigation.js",
 "./location.html","./earth-orb-globe.js","./manifest.json","./icon.svg","./data-store.js","./location-scanner.js",
 "./astronomy.js","./moon-orbit.js","./dataset-manifest.json",
 "./earth.webp","./moon.webp","./sun.webp","./location.webp","./stacks.webp"
];

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
    // but cannot alter the protected celestial Home view.
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
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type !== "LIVE_EARTH_APP_READY") return;
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, {cache:"no-store"});
    if (!response?.ok) throw Error("Network response not OK");
    const type = response.headers.get("content-type") || "";
    const url = new URL(request.url);
    const isHome = type.includes("text/html") && (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/"));
    if (isHome) {
      let html = await response.clone().text();
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
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      const transformed = new Response(html, {status:response.status,statusText:response.statusText,headers});
      await cache.put(request, transformed.clone());
      return transformed;
    }
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await caches.match(request);
    if (hit) return hit;
    const fallback = await caches.match("./index.html");
    if (fallback) return fallback;
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
  const shell = new Set(APP_SHELL.map(path => new URL(path, self.location.href).pathname));
  if (shell.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response?.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }
  event.respondWith(boundedOptionalCache(request));
});
