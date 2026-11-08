const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let textureFetches = 0;
let cacheWrites = 0;
let textureDisposeCount = 0;
let rendererDisposeCount = 0;
const listeners = new Map();
const savedResponses = new Map();

class Vec3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){return this.set(v,v,v);}
  clone(){return new Vec3(this.x,this.y,this.z);}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this;}
  normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;return this.set(this.x/n,this.y/n,this.z/n);}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
}
class FakeTexture {
  constructor(image){this.image=image;this.needsUpdate=false;this.disposed=false;}
  dispose(){textureDisposeCount++;this.disposed=true;}
}
class FakeTextureLoader {
  setCrossOrigin(value){this.crossOrigin=value;}
  async loadAsync(url){throw new Error('TextureLoader fallback should not be used in Cache Storage test: '+url);}
}
class FakeSphereGeometry {
  constructor(radius,widthSegments,heightSegments){this.parameters={radius,widthSegments,heightSegments};this.disposed=false;}
  dispose(){this.disposed=true;}
}
class FakeRingGeometry extends FakeSphereGeometry {}
class FakeMaterial {
  constructor(options={}){Object.assign(this,options);this.color={set(v){this.value=v;}};this.emissive={set(v){this.value=v;}};}
  dispose(){this.disposed=true;}
}
class Object3D {
  constructor(){this.children=[];this.parent=null;this.position=new Vec3();this.rotation=new Vec3();this.scale=new Vec3(1,1,1);this.visible=true;}
  add(child){child.parent=this;this.children.push(child);return this;}
  remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
  removeFromParent(){this.parent?.remove(this);}
  lookAt(){return this;}
}
class FakeMesh extends Object3D {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;}
}
class FakeLight extends Object3D {
  constructor(...args){super();this.args=args;}
}
class FakeCamera extends Object3D {
  constructor(fov,aspect,near,far){super();Object.assign(this,{fov,aspect,near,far});}
  updateProjectionMatrix(){}
}
class FakeDomElement {
  constructor(){this.style={};this.listeners=new Map();this.parentElement=null;}
  setAttribute(){}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  removeEventListener(type){this.listeners.delete(type);}
  setPointerCapture(){}
  remove(){this.parentElement?.removeChild?.(this);}
}
class FakeRenderer {
  constructor(){this.domElement=new FakeDomElement();}
  setPixelRatio(){}
  setClearColor(){}
  setSize(){}
  render(){}
  dispose(){rendererDisposeCount++;}
}
const THREE={
  Texture:FakeTexture,TextureLoader:FakeTextureLoader,SphereGeometry:FakeSphereGeometry,RingGeometry:FakeRingGeometry,
  MeshStandardMaterial:FakeMaterial,MeshBasicMaterial:FakeMaterial,MeshPhongMaterial:FakeMaterial,Mesh:FakeMesh,
  Object3D,Group:Object3D,Scene:Object3D,PerspectiveCamera:FakeCamera,WebGLRenderer:FakeRenderer,
  HemisphereLight:FakeLight,DirectionalLight:FakeLight,Vector3:Vec3,
  SRGBColorSpace:'srgb',ClampToEdgeWrapping:1001,RepeatWrapping:1000,DoubleSide:2
};
const window={devicePixelRatio:1,addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(){},dispatchEvent(){}};
const document={baseURI:'https://example.test/index.html',hidden:false};
const container=()=>({children:[],clientWidth:390,clientHeight:844,appendChild(node){this.children.push(node);node.parentElement=this;},removeChild(node){this.children=this.children.filter(n=>n!==node);node.parentElement=null;},getBoundingClientRect(){return {width:this.clientWidth,height:this.clientHeight};}});
const assetCache={
  async match(key){return savedResponses.get(String(key)) || null;},
  async put(key,response){cacheWrites++;savedResponses.set(String(key),response);}
};
const context={
  window,document,navigator:{onLine:true},
  caches:{async open(name){if(name!=='live-earth-moon-surface-v1')throw new Error('Unexpected cache name');return assetCache;}},
  async fetch(url,options){textureFetches++;if(options?.mode!=='cors')throw new Error('NASA texture request must use CORS');return {ok:true,type:'cors',headers:{get(){return 'image/jpeg';}},async blob(){return {size:447200};},clone(){return this;}};},
  async createImageBitmap(){return {width:2048,height:1024,close(){}};},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  URL,WeakMap,Map,Set,Promise,Math,Date,Number,TypeError,RangeError,Error,
  requestAnimationFrame:()=>1,cancelAnimationFrame(){},
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','moon-engine.js'),'utf8'),context,{filename:'moon-engine.js'});

(async()=>{
  const api=window.LiveEarthCelestialEngines.moon;
  if(!api || api.version!=='2.0.0') throw new Error('Moon Engine v2 API did not register');
  if(api.create!==api.createObject || api.createObject3D!==api.createObject) throw new Error('Public API aliases are missing');

  // Two view-owned Moon objects use separate geometry/material but one shared surface.
  const first=await api.createObject({THREE,radius:.25,widthSegments:32,heightSegments:24,position:{x:1,y:2,z:3},scale:.5});
  const second=await api.createObject({THREE,radius:.05,widthSegments:16,heightSegments:12});
  if(textureFetches!==1 || cacheWrites!==1 || savedResponses.size!==1) throw new Error('NASA image was not fetched once and saved in Cache Storage');
  if(first.texture!==second.texture) throw new Error('Moon objects do not share the loaded texture');
  if(first.mesh.geometry.parameters.radius!==.25 || second.mesh.geometry.parameters.radius!==.05) throw new Error('Moon radii are not independent');
  first.setPosition(4,5,6); first.setRotation({x:.1,y:.2,z:.3}); first.setScale({x:1,y:2,z:3}); first.updateMaterial({roughness:.6,color:'#ffffff'});
  const state=first.getState();
  if(state.position.x!==4 || state.rotation.y!==.2 || state.scale.y!==2 || first.mesh.material.roughness!==.6) throw new Error('Per-instance setters did not apply');
  const sharedTexture=first.texture;
  first.dispose();
  if(textureDisposeCount!==0 || second.texture.disposed) throw new Error('Disposing one Moon invalidated the shared surface texture');

  // Two full-screen preview instances can coexist with their own independent meshes.
  const previewA=await api.createPreview(container(),{THREE,radius:.88,cameraDistance:6.7});
  const previewB=await api.createPreview(container(),{THREE,radius:.14,cameraDistance:9.2});
  const previewMoonA=previewA.getObject3D().children.find(child=>child.geometry && child.material);
  const previewMoonB=previewB.getObject3D().children.find(child=>child.geometry && child.material);
  if(!previewMoonA || !previewMoonB) throw new Error('A preview Moon sphere was not created');
  if(previewMoonA.geometry.parameters.radius!==.88 || previewMoonB.geometry.parameters.radius!==.14) throw new Error('Preview sizing is not independent');
  if(previewMoonA.material.map!==previewMoonB.material.map || previewMoonA.material.map!==sharedTexture) throw new Error('Preview instances did not reuse the shared NASA texture');
  previewA.destroy();
  if(textureDisposeCount!==0 || previewMoonB.material.map.disposed) throw new Error('Destroying one preview invalidated the other preview');
  previewB.destroy();

  // Existing shared orbital-scene API remains separate and still creates its three scene objects.
  const shared=await api.mountShared(container(),{THREE});
  if(!shared.getState().orbitalPosition || !Number.isFinite(shared.getState().orbitalPosition.x)) throw new Error('Shared orbital model is missing');
  if(shared.getObject3D().children.length!==3) throw new Error('Shared Earth/Moon/orbit scene structure changed');
  api.releaseShared();

  second.dispose();
  if(textureDisposeCount!==0) throw new Error('Shared surface texture disposed before page unload');
  listeners.get('pagehide')?.({persisted:true});
  if(textureDisposeCount!==0) throw new Error('Back/forward cache pagehide should preserve active resources');
  listeners.get('pagehide')?.({persisted:false});
  if(textureDisposeCount!==1) throw new Error('Shared surface texture was not disposed exactly once on actual page unload');
  if(rendererDisposeCount!==3) throw new Error('One of the standalone preview/shared renderers was not cleaned up');

  // A fresh page context can now create the Moon while offline from the saved image.
  const offlineListeners=new Map();
  const offlineWindow={devicePixelRatio:1,addEventListener(type,fn){offlineListeners.set(type,fn);},removeEventListener(){},dispatchEvent(){}};
  let offlineFetchAttempts=0;
  const offlineContext={
    window:offlineWindow,document,navigator:{onLine:false},caches:{async open(){return assetCache;}},
    async fetch(){offlineFetchAttempts++;throw new Error('Network must not be used while offline');},
    async createImageBitmap(){return {width:2048,height:1024,close(){}};},
    CustomEvent:context.CustomEvent,URL,WeakMap,Map,Set,Promise,Math,Date,Number,TypeError,RangeError,Error,
    requestAnimationFrame:()=>1,cancelAnimationFrame(){}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','moon-engine.js'),'utf8'),offlineContext,{filename:'moon-engine-offline-test.js'});
  const offlineApi=offlineWindow.LiveEarthCelestialEngines.moon;
  const offlineMoon=await offlineApi.createObject({THREE,radius:.04,widthSegments:20,heightSegments:12});
  if(offlineFetchAttempts!==0 || savedResponses.size!==1) throw new Error('Cached NASA image was not reused while offline');
  offlineMoon.dispose();
  offlineListeners.get('pagehide')?.({persisted:false});
  if(textureDisposeCount!==2) throw new Error('Offline page did not dispose its own texture wrapper on unload');

  console.log(JSON.stringify({
    apiVersion:api.version, independentMoonObjects:2, independentPreviews:2,
    nasaTextureFetches:textureFetches,cacheWrites,offlineTextureReuse:true,
    sharedTexture:true,independentGeometry:true,independentTransforms:true,
    disposeIsolation:true,bfcacheSafeCleanup:true,sharedOrbitalScene:'preserved',rendererCleanup:'passed'
  }));
})().catch(error=>{console.error(error);process.exitCode=1;});
