/* LIVE // EARTH — orientation recovery + Location OFF cache release.
   Preserves the existing v4 orb-controller injection and homepage scene.
   New workers precache the complete shell, wait for a safe activation, and
   retain previous shells until the new page confirms successful startup. */
const CACHE_PREFIX = "live-earth-shell-";
const CACHE_NAME = "live-earth-shell-v25-orientation-location-off";
const OPTIONAL_CACHE = "live-earth-optional-v1";
const OPTIONAL_LIMIT = 48;
const APP_SHELL = [
  "./", "./index.html", "./orb-controls-v4.js", "./location.html",
  "./manifest.json", "./icon.svg", "./data-store.js", "./astronomy.js",
  "./moon-orbit.js", "./dataset-manifest.json", "./earth.webp",
  "./moon.webp", "./sun.webp", "./location.webp", "./stacks.webp"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll is atomic from the install's point of view: a failed essential
    // fetch rejects installation, leaving the current worker in control.
    await cache.addAll(APP_SHELL);
    // Deliberately do NOT call skipWaiting(). Safe activation happens after
    // the old page/client is gone and the user next opens/reloads the app.
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Do not delete older shell caches yet. Keep them as a rollback cushion
    // until the new homepage confirms that its scene has started successfully.
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "LIVE_EARTH_APP_READY") return;
  event.waitUntil((async () => {
    // The active client reports ready only after the Earth scene has hidden
    // its initial loading status. Keep current and new cache; remove stale
    // app-shell versions only after that signal.
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
  })());
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(req, { cache: "no-store" });
    if (!response || !response.ok) throw new Error("Network response not OK");
    const type = response.headers.get("content-type") || "";
    const url = new URL(req.url);
    const isHome = type.includes("text/html") &&
      (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/"));
    if (isHome) {
      let html = await response.clone().text();
      // Keep the established v4 integration for this stability pass. A later
      // isolated refactor can move it into index.html after device validation.
      if (!html.includes("orb-controls-v4.js")) {
        html = html.replace(/<\/body\s*>/i,
          '<script src="./orb-controls-v4.js" defer></script>\n</body>');
      }
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      const transformed = new Response(html, {
        status: response.status, statusText: response.statusText, headers
      });
      await cache.put(req, transformed.clone());
      return transformed;
    }
    await cache.put(req, response.clone());
    return response;
  } catch (error) {
    const hit = await caches.match(req);
    if (hit) return hit;
    const fallback = await caches.match("./index.html");
    if (fallback) return fallback;
    throw error;
  }
}

async function boundedOptionalCache(req) {
  const cache = await caches.open(OPTIONAL_CACHE);
  const hit = await cache.match(req);
  if (hit) {
    // Refresh insertion order as a lightweight LRU approximation.
    await cache.delete(req);
    await cache.put(req, hit.clone());
    return hit;
  }
  const response = await fetch(req);
  if (response && response.ok) {
    await cache.put(req, response.clone());
    const keys = await cache.keys();
    while (keys.length > OPTIONAL_LIMIT) {
      await cache.delete(keys.shift());
    }
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document" ||
      url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  const shellPaths = new Set(APP_SHELL.map(path => new URL(path, self.location.href).pathname));
  if (shellPaths.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  // Only same-origin optional assets are eligible. External libraries and
  // third-party map tiles are deliberately not intercepted or cached here.
  event.respondWith(boundedOptionalCache(request));
});
