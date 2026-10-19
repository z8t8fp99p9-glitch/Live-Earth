const CACHE_NAME = "live-earth-shell-v11-personalisation";
const ASSET_CACHE = "live-earth-personal-assets-v1";
const APP_SHELL = [
  "./", "./index.html", "./manifest.json", "./icon.svg",
  "./data-store.js", "./dataset-manifest.json",
  "./earth.webp", "./moon.webp", "./sun.webp", "./location.webp", "./stacks.webp",
  "./deck_cosmic.png", "./deck_earth_nature.png", "./deck_frost_fire.png",
  "./deck_frost_glass.png", "./deck_nebula_cloud.png",
  "./frost-bite-ice-deck.webp", "./fire-sand-nation-deck.webp"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    Promise.all(APP_SHELL.map(url => cache.add(url).catch(error => {
      console.warn("[LIVE // EARTH] Asset will retry on demand:", url, error);
    })))
  ).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("live-earth-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(url.pathname.endsWith(".webp") || url.pathname.endsWith(".png") ? ASSET_CACHE : CACHE_NAME)
        .then(cache => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match("./index.html"))));
});
