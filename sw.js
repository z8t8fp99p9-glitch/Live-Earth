/* LIVE // EARTH — automatic HTML refresh + precached orb controls */
const CACHE_NAME = "live-earth-shell-v14-shiny-orbs";
const APP_SHELL = [
  "./", "./index.html", "./manifest.json", "./icon.svg",
  "./data-store.js", "./dataset-manifest.json",
  "./earth.webp", "./moon.webp", "./sun.webp", "./location.webp", "./stacks.webp"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("live-earth-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match("./index.html");
    if (fallback) return fallback;
    throw error;
  }
}
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) await (await caches.open(CACHE_NAME)).put(request, response.clone());
  return response;
}
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" || request.destination === "document" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
    event.respondWith(networkFirst(request)); return;
  }
  event.respondWith(cacheFirst(request));
});
