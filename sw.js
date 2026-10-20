/* LIVE // EARTH — same-globe unlock flow, cache v32. */
const CACHE_PREFIX = "live-earth-shell-";
const CACHE_NAME = "live-earth-shell-v32-same-globe-unlock";
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
  const originalGeometry = earth.geometry;
  const reducedGeometry = new T.SphereGeometry(1, 64, 48);
  const fullGeometry = new T.SphereGeometry(1, 96, 64);
  function renderQuality(next) {
    quality = next === "hd" ? "hd" : "basic";
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === "hd" ? 1.5 : 1));
    if (earth.geometry !== (quality === "hd" ? fullGeometry : reducedGeometry)) {
      earth.geometry = quality === "hd" ? fullGeometry : reducedGeometry;
    }
    draw();
    return quality;
  }
  function animateCamera(targetZ, done) {
    if (animation) cancelAnimationFrame(animation);
    const startZ = camera.position.z;
    const start = performance.now();
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 620;
    const tick = now => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.z = startZ + (targetZ - startZ) * eased;
      camera.lookAt(0, 0, 0);
      draw();
      if (t < 1) animation = requestAnimationFrame(tick);
      else { animation = 0; done?.(); }
    };
    animation = requestAnimationFrame(tick);
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    window.__leEarthUnlocked = true;
    homeZ = camera.position.z;
    homeRotation = {x: group.rotation.x, y: group.rotation.y, z: group.rotation.z};
    renderQuality("basic");
    animateCamera(homeZ * 0.62);
  }
  function lock() {
    if (!unlocked) return;
    unlocked = false;
    window.__leEarthUnlocked = false;
    renderQuality("hd");
    if (homeRotation) {
      group.rotation.set(homeRotation.x, homeRotation.y, homeRotation.z);
    }
    animateCamera(homeZ);
  }
  function setQuality(next) {
    if (!unlocked) return quality;
    return renderQuality(next);
  }
  // fitCamera() runs on viewport changes. Keep the unlocked zoom proportional
  // without changing the approved Home framing.
  window.addEventListener("resize", () => {
    if (!unlocked) return;
    requestAnimationFrame(() => {
      homeZ = camera.position.z;
      camera.position.z = homeZ * 0.62;
      camera.lookAt(0, 0, 0);
      draw();
    });
  }, {passive:true});
  return {
    unlock, lock, setQuality,
    isUnlocked: () => unlocked,
    getQuality: () => quality
  };
})();
`;
    html = html.replace(anchor, api + "\n" + anchor);
  }
  return html;
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
