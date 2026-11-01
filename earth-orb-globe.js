/* Interactive 3D Earth orb for Earth-mode screens only. Home index.html is not modified. */
(() => {
'use strict';
const orb=document.querySelector('#earth-orb'),canvas=document.querySelector('#earth-canvas'),status=document.querySelector('#status');
if(!orb||!canvas||!status)return;
const mode=new URLSearchParams(location.search).get('mode')||'basic';
let T,renderer,scene,camera,group,frame=0,disposed=false,zoom=3.25,moved=false,startX=0,startY=0,lastX=0,lastY=0,lastPinch=0,suppressTap=0;
const pointers=new Map(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const say=t=>status.textContent=t;
const draw=()=>{if(!renderer||frame||disposed||document.hidden)return;frame=requestAnimationFrame(()=>{frame=0;if(!disposed)renderer.render(scene,camera)})};
const home=()=>location.href='./';
document.querySelector('#home-control')?.addEventListener('click',home);
orb.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{orb.setPointerCapture(e.pointerId)}catch(_){}if(pointers.size===1){startX=lastX=e.clientX;startY=lastY=e.clientY;moved=false;orb.classList.add('dragging')}else if(pointers.size===2){const p=[...pointers.values()];lastPinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);moved=true;suppressTap=Date.now()+800}e.preventDefault()},{passive:false});
orb.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastPinch>0&&d>0){zoom=clamp(zoom*lastPinch/d,1.7,5.8);camera.position.z=zoom;draw()}lastPinch=d;moved=true;suppressTap=Date.now()+800}else{const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.hypot(e.clientX-startX,e.clientY-startY)>7)moved=true;if(moved&&group){group.rotation.y+=dx*.008;group.rotation.x=clamp(group.rotation.x+dy*.006,-1.25,1.25);draw()}lastX=e.clientX;lastY=e.clientY}e.preventDefault()},{passive:false});
function end(e){const had=pointers.has(e.pointerId);pointers.delete(e.pointerId);if(pointers.size<2)lastPinch=0;if(!pointers.size){orb.classList.remove('dragging');if(had&&!moved&&Date.now()>suppressTap)home();if(moved)suppressTap=Date.now()+500;moved=false}}
orb.addEventListener('pointerup',end);orb.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(!pointers.size){orb.classList.remove('dragging');moved=false}});orb.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size){orb.classList.remove('dragging');moved=false}});
orb.addEventListener('contextmenu',e=>e.preventDefault());orb.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom+Math.sign(e.deltaY)*.18,1.7,5.8);if(camera)camera.position.z=zoom;draw()},{passive:false});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0}else draw()});
async function texture(T,urls){for(const url of urls){try{return await new Promise((resolve,reject)=>{const l=new T.TextureLoader();l.setCrossOrigin('anonymous');l.load(url,resolve,undefined,reject)})}catch(_){}}throw Error('Earth texture unavailable')}
function resize(){if(!renderer||!camera)return;const b=orb.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,mode==='hd'?1.5:1.25));renderer.setSize(Math.max(1,Math.round(b.width)),Math.max(1,Math.round(b.height)),false);camera.aspect=b.width/Math.max(1,b.height);camera.updateProjectionMatrix();draw()}
async function start(){try{try{T=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js')}catch(_){T=await import('https://unpkg.com/three@0.180.0/build/three.module.js')}if(disposed)return;
renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,mode==='hd'?1.5:1.25));renderer.setSize(orb.clientWidth,orb.clientHeight,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0,0);
scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,40);camera.position.z=zoom;
scene.add(new T.AmbientLight(0x7898bc,.55));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(-3,2,4);scene.add(sun);const fill=new T.DirectionalLight(0x2867a9,.16);fill.position.set(4,-2,-3);scene.add(fill);
group=new T.Group();scene.add(group);let tex;try{tex=await texture(T,['https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png','https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'])}catch(e){say('Live texture unavailable. Showing the saved Earth artwork instead.');return}if(disposed){tex.dispose();return}
tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);const seg=mode==='hd'?112:80;
const earth=new T.Mesh(new T.SphereGeometry(1,seg,Math.round(seg*.67)),new T.MeshStandardMaterial({map:tex,roughness:1,metalness:0}));earth.rotation.y=-.35;group.add(earth);
group.add(new T.Mesh(new T.SphereGeometry(1.028,64,48),new T.MeshBasicMaterial({color:0x329dff,transparent:true,opacity:.17,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false})));
orb.classList.add('globe-ready');say(mode==='offline'?'Globe ready · full offline operation still depends on cached engine and texture.':'3D Earth ready · drag to rotate, pinch to zoom.');resize();if('ResizeObserver'in window)new ResizeObserver(resize).observe(orb);else addEventListener('resize',resize,{passive:true})
}catch(e){console.error('[LIVE // EARTH] Globe startup failed',e);say('Interactive 3D is unavailable. The saved Earth artwork remains visible; check connection and reload.')}}
addEventListener('pagehide',()=>{disposed=true;if(frame)cancelAnimationFrame(frame);renderer?.dispose()},{once:true});start();
})();