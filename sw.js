/* LIVE // EARTH — app shell with additive orb-controls integration */
const CACHE_NAME="live-earth-shell-v23-versioned-controls";
const APP_SHELL=["./","./index.html","./orb-controls-v4.js","./location.html","./manifest.json","./icon.svg","./data-store.js","./astronomy.js","./moon-orbit.js","./dataset-manifest.json","./earth.webp","./moon.webp","./sun.webp","./location.webp","./stacks.webp"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("live-earth-shell-")&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function networkFirst(req){
 const c=await caches.open(CACHE_NAME);
 try{
  const r=await fetch(req,{cache:"no-store"});
  if(r&&r.ok){
   const type=r.headers.get("content-type")||"";
   if(type.includes("text/html")&&new URL(req.url).pathname.endsWith("/index.html")||type.includes("text/html")&&new URL(req.url).pathname.endsWith("/")){
    let html=await r.clone().text();
    if(!html.includes("orb-controls-v4.js")){
     const tag='<script src="./orb-controls-v4.js" defer></script>';
     html=html.replace(/<\/body\s*>/i,tag+"\n</body>");
    }
    const headers=new Headers(r.headers);headers.delete("content-length");
    const transformed=new Response(html,{status:r.status,statusText:r.statusText,headers});
    await c.put(req,transformed.clone());return transformed;
   }
   await c.put(req,r.clone());
  }
  return r;
 }catch(e){
  const hit=await caches.match(req);if(hit)return hit;
  const fallback=await caches.match("./index.html");if(fallback)return fallback;throw e;
 }
}
async function cacheFirst(req){const hit=await caches.match(req);if(hit)return hit;const r=await fetch(req);if(r&&r.ok)await(await caches.open(CACHE_NAME)).put(req,r.clone());return r}
self.addEventListener("fetch",event=>{
 const r=event.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==self.location.origin)return;
 if(r.mode==="navigate"||r.destination==="document"||u.pathname.endsWith(".html")||u.pathname.endsWith("/")){event.respondWith(networkFirst(r));return}
 event.respondWith(cacheFirst(r));
});
