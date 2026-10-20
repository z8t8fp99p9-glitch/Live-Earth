/* LIVE // EARTH — cache revision for the interactive Earth orb. */
const CACHE_PREFIX = "live-earth-shell-";
const CACHE_NAME = "live-earth-shell-v31-interactive-earth-orb";
const OPTIONAL_CACHE = "live-earth-optional-v1";
const OPTIONAL_LIMIT = 48;
const APP_SHELL = [
 "./","./index.html","./orb-controls-v4.js","./earth-mode-navigation.js",
 "./location.html","./earth-orb-globe.js","./manifest.json","./icon.svg","./data-store.js",
 "./astronomy.js","./moon-orbit.js","./dataset-manifest.json",
 "./earth.webp","./moon.webp","./sun.webp","./location.webp","./stacks.webp"
];
self.addEventListener("install",event=>{event.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);await c.addAll(APP_SHELL)})())});
self.addEventListener("activate",event=>{event.waitUntil((async()=>{await self.clients.claim()})())});
self.addEventListener("message",event=>{if(event.data?.type!=="LIVE_EARTH_APP_READY")return;event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)))})())});
async function networkFirst(req){const cache=await caches.open(CACHE_NAME);try{const response=await fetch(req,{cache:"no-store"});if(!response?.ok)throw Error("Network response not OK");const type=response.headers.get("content-type")||"",url=new URL(req.url),isHome=type.includes("text/html")&&(url.pathname.endsWith("/index.html")||url.pathname.endsWith("/"));if(isHome){let html=await response.clone().text();if(!html.includes("orb-controls-v4.js"))html=html.replace(/<\/body\s*>/i,'<script src="./orb-controls-v4.js" defer></script>\n</body>');if(!html.includes("earth-mode-navigation.js"))html=html.replace(/<\/body\s*>/i,'<script src="./earth-mode-navigation.js" defer></script>\n</body>');const h=new Headers(response.headers);h.delete("content-length");const transformed=new Response(html,{status:response.status,statusText:response.statusText,headers:h});await cache.put(req,transformed.clone());return transformed}await cache.put(req,response.clone());return response}catch(error){const hit=await caches.match(req);if(hit)return hit;const fallback=await caches.match("./index.html");if(fallback)return fallback;throw error}}
async function boundedOptionalCache(req){const cache=await caches.open(OPTIONAL_CACHE),hit=await cache.match(req);if(hit){await cache.delete(req);await cache.put(req,hit.clone());return hit}const response=await fetch(req);if(response?.ok){await cache.put(req,response.clone());const keys=await cache.keys();while(keys.length>OPTIONAL_LIMIT)await cache.delete(keys.shift())}return response}
self.addEventListener("fetch",event=>{const req=event.request,url=new URL(req.url);if(req.method!=="GET"||url.origin!==self.location.origin)return;if(req.mode==="navigate"||req.destination==="document"||url.pathname.endsWith(".html")||url.pathname.endsWith("/")){event.respondWith(networkFirst(req));return}const shell=new Set(APP_SHELL.map(p=>new URL(p,self.location.href).pathname));if(shell.has(url.pathname)){event.respondWith((async()=>{const c=await caches.open(CACHE_NAME),hit=await c.match(req);if(hit)return hit;const response=await fetch(req);if(response?.ok)await c.put(req,response.clone());return response})());return}event.respondWith(boundedOptionalCache(req))});
