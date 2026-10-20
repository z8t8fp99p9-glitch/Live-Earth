/* LIVE // EARTH — correct geographic solar direction and fixed-space sunlight, cache v36. */
const CACHE_PREFIX = "live-earth-shell-";
const CACHE_NAME = "live-earth-shell-v36-correct-solar-direction";
const OPTIONAL_CACHE = "live-earth-optional-v1";
const OPTIONAL_LIMIT = 48;
const APP_SHELL = [
 "./","./index.html","./orb-controls-v4.js","./earth-mode-navigation.js",
 "./location.html","./earth-orb-globe.js","./manifest.json","./icon.svg","./data-store.js",
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
  let animation = 0;
  let homeRotation = null;
  let homeZ = camera.position.z;
  const reducedGeometry = new T.SphereGeometry(1, 64, 48);
  const fullGeometry = new T.SphereGeometry(1, 96, 64);
  function renderQuality(next) {
    quality = next === "hd" ? "hd" : "basic";
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === "hd" ? 1.5 : 1));
    earth.geometry = quality === "hd" ? fullGeometry : reducedGeometry;
    draw();
    return quality;
  }
  function animateCamera(targetZ, done) {
    if (animation) cancelAnimationFrame(animation);
    const startZ = camera.position.z, start = performance.now();
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 620;
    const tick = now => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      camera.position.z = startZ + (targetZ - startZ) * (1 - Math.pow(1 - t, 3));
      camera.lookAt(0, 0, 0); draw();
      if (t < 1) animation = requestAnimationFrame(tick);
      else { animation = 0; done?.(); }
    };
    animation = requestAnimationFrame(tick);
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true; window.__leEarthUnlocked = true;
    homeZ = camera.position.z;
    homeRotation = {x:group.rotation.x,y:group.rotation.y,z:group.rotation.z};
    renderQuality("basic"); animateCamera(homeZ * 0.62);
  }
  function lock() {
    if (!unlocked) return;
    unlocked = false; window.__leEarthUnlocked = false;
    renderQuality("hd");
    if (homeRotation) group.rotation.set(homeRotation.x,homeRotation.y,homeRotation.z);
    animateCamera(homeZ);
  }
  function setQuality(next) { return unlocked ? renderQuality(next) : quality; }
  window.addEventListener("resize", () => {
    if (!unlocked) return;
    requestAnimationFrame(() => { homeZ = camera.position.z; camera.position.z = homeZ * 0.62; camera.lookAt(0,0,0); draw(); });
  }, {passive:true});
  return {unlock,lock,setQuality,isUnlocked:()=>unlocked,getQuality:()=>quality};
})();
`;
    html = html.replace(anchor, api + "\n" + anchor);
  }
  return html;
}

function injectSolarDayNight(html) {
  const anchor = "let active=null,x=0,y=0,drag=false;";
  if (!html.includes(anchor) || html.includes("LIVE_EARTH_SOLAR_DAY_NIGHT_V4")) return html;
  const code = `
/* LIVE_EARTH_SOLAR_DAY_NIGHT_V4 — update solar illumination; preserve the existing scene. */
(() => {
  const earthMesh = earth;
  const solarLight = sun;
  const sceneGroup = group;
  const solarVector = new T.Vector3();
  const utcDayOfYear = date => {
    const start = Date.UTC(date.getUTCFullYear(),0,0);
    return Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-start)/86400000);
  };
  function getSolarTarget(date = new Date()) {
    // Smoothly evaluate the solar direction from current UTC time on every frame.
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
    const lat = declination;
    // Three.js SphereGeometry's longitude orientation: Greenwich points along +X,
    // and east longitude proceeds toward -Z. Apply only the model's fixed base
    // rotation; never apply the user's drag rotation to the Sun direction.
    solarVector.set(Math.cos(lat)*Math.cos(subsolarLongitude), Math.sin(lat), -Math.cos(lat)*Math.sin(subsolarLongitude)).normalize();
    return solarVector.clone().applyEuler(earthMesh.rotation).multiplyScalar(12);
  }
  function updateSolarDayNight() {
    const target = getSolarTarget(new Date());
    // The Sun is fixed in world space. Earth rotation naturally moves its surface
    // through daylight; no easing lag is needed while the user drags the globe.
    solarLight.position.copy(target);
    solarLight.target.position.set(0,0,0);
    solarLight.target.updateMatrixWorld();
    draw();
  }
  // Remove the decorative blue shell (radius 1.025), preserving Earth and Moon.
  const blueShell = sceneGroup.children.find(o => o.isMesh && o.geometry?.parameters?.radius > 1.01 && o.geometry?.parameters?.radius < 1.04);
  if (blueShell) sceneGroup.remove(blueShell);
  // Remove the secondary blue directional fill; keep only the moving Sun light.
  scene.children.filter(o => o.isDirectionalLight && o !== solarLight).forEach(light => scene.remove(light));
  const ambient = scene.children.find(o => o.isAmbientLight);
  if (ambient) ambient.intensity = 0.035;
  solarLight.intensity = 2.3;
  let lastFrame = performance.now();
  let solarFrame = 0;
  function smoothSolarFrame(now) {
    if (document.hidden) { solarFrame = 0; return; }
    lastFrame = Math.max(0, now - lastFrame) > 100 ? now - 16.7 : lastFrame;
    updateSolarDayNight();
    lastFrame = now;
    solarFrame = requestAnimationFrame(smoothSolarFrame);
  }
  // Keep the solar vector current; user rotation moves Earth under a fixed Sun.
  solarFrame = requestAnimationFrame(smoothSolarFrame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && solarFrame) { cancelAnimationFrame(solarFrame); solarFrame = 0; }
    else if (!document.hidden && !solarFrame) { lastFrame = performance.now(); solarFrame = requestAnimationFrame(smoothSolarFrame); }
  });
  window.addEventListener("pagehide", () => { if (solarFrame) cancelAnimationFrame(solarFrame); }, {once:true});
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
