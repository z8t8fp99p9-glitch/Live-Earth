const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'Weather/weather-view.js'), 'utf8');

const factoryStart = source.indexOf('  function clamp(value, min, max) {');
const factoryEnd = source.indexOf('\n  function activateWeather()', factoryStart);
assert.ok(factoryStart >= 0 && factoryEnd > factoryStart, 'Terrain scene factory must be extractable for a runtime smoke test');
let factorySource = source.slice(factoryStart, factoryEnd);
factorySource = factorySource.replace('const THREE = await import(THREE_MODULE_URL);', 'const THREE = THREE_TEST;');

const madeMeshes = [];
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;this.x/=n;this.y/=n;this.z/=n;return this;}
}
class Color {
  constructor(value='#ffffff'){this.set(value);}
  set(value){
    if(value instanceof Color){this.r=value.r;this.g=value.g;this.b=value.b;return this;}
    const hex=String(value).replace('#','');
    const n=parseInt(hex.length===3?hex.split('').map(c=>c+c).join(''):hex,16)||0xffffff;
    this.r=((n>>16)&255)/255;this.g=((n>>8)&255)/255;this.b=(n&255)/255;return this;
  }
  copy(value){return this.set(value);}
  lerp(value,t){this.r+=(value.r-this.r)*t;this.g+=(value.g-this.g)*t;this.b+=(value.b-this.b)*t;return this;}
  multiplyScalar(value){this.r*=value;this.g*=value;this.b*=value;return this;}
}
class Object3D {
  constructor(){this.position=new Vector3();this.children=[];this.rotation={};this.visible=true;this.castShadow=false;this.receiveShadow=false;}
  add(...items){this.children.push(...items);}
  traverse(fn){fn(this);for(const child of this.children)child.traverse?child.traverse(fn):fn(child);}
}
class Group extends Object3D{}
class Scene extends Group {constructor(){super();this.background=null;}}
class Attribute {
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;this.needsUpdate=false;}
}
class Geometry {
  constructor(){this.attributes={};this.index=null;this.disposed=false;}
  setAttribute(name,value){this.attributes[name]=value;return this;}
  setIndex(value){this.index=value;return this;}
  computeVertexNormals(){this.normalsComputed=true;}
  dispose(){this.disposed=true;}
}
class Material {
  constructor(options={}){Object.assign(this,options);this.disposed=false;}
  dispose(){this.disposed=true;}
}
class Mesh extends Object3D {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;madeMeshes.push(this);}
}
class Light extends Object3D {
  constructor(color,intensity){super();this.color=new Color(color);this.intensity=intensity;this.shadow={bias:0,normalBias:0,mapSize:{set(){}},camera:{}};}
}
class Camera extends Object3D {
  constructor(fov,aspect){super();this.fov=fov;this.aspect=aspect;}
  updateProjectionMatrix(){}
  lookAt(target){this.target=target;}
}
class Curve {
  constructor(points){this.points=points;}
  getPoint(t){
    const n=this.points.length-1;
    const p=Math.max(0,Math.min(n,t*n));
    const i=Math.min(n-1,Math.floor(p));
    const a=this.points[i],b=this.points[i+1],f=p-i;
    return new Vector3(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,a.z+(b.z-a.z)*f);
  }
  getTangent(t){
    const a=this.getPoint(Math.max(0,t-0.001));
    const b=this.getPoint(Math.min(1,t+0.001));
    return new Vector3(b.x-a.x,b.y-a.y,b.z-a.z).normalize();
  }
}
class Renderer {
  constructor({canvas}){this.canvas=canvas;this.shadowMap={};this.renderCount=0;this.disposed=false;this.contextLost=false;}
  setPixelRatio(value){this.pixelRatio=value;}
  setSize(width,height){this.width=width;this.height=height;}
  render(){this.renderCount++;}
  dispose(){this.disposed=true;}
  forceContextLoss(){this.contextLost=true;}
}
const THREE_TEST={
  Color,Vector3,Group,Scene,BufferGeometry:Geometry,
  Float32BufferAttribute:Attribute,
  Mesh,
  MeshStandardMaterial:Material,
  MeshPhysicalMaterial:Material,
  PerspectiveCamera:Camera,
  WebGLRenderer:Renderer,
  HemisphereLight:Light,
  DirectionalLight:Light,
  CatmullRomCurve3:Curve,
  MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},
  SRGBColorSpace:'srgb',ACESFilmicToneMapping:1,PCFSoftShadowMap:2,DoubleSide:3
};

function fakeNode(tag='div'){
  return {
    tagName:tag.toUpperCase(),className:'',isConnected:true,children:[],attributes:{},style:{},
    setAttribute(name,value){this.attributes[name]=value;},
    appendChild(node){this.children.push(node);node.parentNode=this;},
    remove(){this.removed=true;this.isConnected=false;},
    getBoundingClientRect(){return {width:430,height:932};}
  };
}
const host=fakeNode();host.clientWidth=430;host.clientHeight=932;
const canvas=fakeNode('canvas');
const frameQueue=[];
const listeners=new Map();
const windowMock={
  devicePixelRatio:3,
  visualViewport:{addEventListener(){},removeEventListener(){}},
  matchMedia(){return {matches:false};},
  addEventListener(){},removeEventListener(){}
};
const documentMock={
  hidden:false,
  addEventListener(name,fn){listeners.set(name,fn);},
  removeEventListener(name){listeners.delete(name);}
};
const context=vm.createContext({
  THREE_TEST,host,THREE_MODULE_URL:'file:///vendor/three.module.js',
  el(tag,className){const node=tag==='canvas'?canvas:fakeNode(tag);node.className=className;return node;},
  window:windowMock,document:documentMock,navigator:{deviceMemory:8},
  innerWidth:430,innerHeight:932,ResizeObserver:class{observe(){}disconnect(){this.disconnected=true;}},
  requestAnimationFrame(fn){frameQueue.push(fn);return frameQueue.length;},cancelAnimationFrame(){},
  console,Math,Number,Array,Float32Array,Map,Set,URL,performance:{now:()=>0}
});

(async()=>{
  const instance=await vm.runInContext(`(async()=>{${factorySource}\nreturn createTerrainRiver(host);})()`,context);
  assert.ok(instance&&typeof instance.dispose==='function','Scene factory must return a disposal function');
  assert.equal(madeMeshes.length,2,'Only the terrain and the river meshes may be created');
  const terrainMesh=madeMeshes.find(mesh=>mesh.geometry.attributes.color?.count>1000);
  const riverMesh=madeMeshes.find(mesh=>mesh.geometry.attributes.uv?.count>100);
  assert.ok(terrainMesh,'A dense terrain surface must be constructed');
  assert.ok(riverMesh,'A continuous river surface must be constructed');
  assert.ok(terrainMesh.geometry.index.length>1000,'Terrain surface must contain indexed triangles');
  assert.ok(riverMesh.geometry.index.length>1000,'River must contain continuous indexed triangles');
  assert.ok([...terrainMesh.geometry.attributes.position.array].every(Number.isFinite),'Terrain vertex coordinates must be finite');
  assert.ok([...riverMesh.geometry.attributes.position.array].every(Number.isFinite),'River vertex coordinates must be finite');
  const firstFrame=frameQueue.shift();
  if(firstFrame)firstFrame(50);
  assert.equal(riverMesh.geometry.attributes.position.needsUpdate,true,'The river surface should receive its small movement update');
  instance.dispose();
  assert.equal(terrainMesh.geometry.disposed,true,'Terrain geometry must be released');
  assert.equal(riverMesh.geometry.disposed,true,'River geometry must be released');
  assert.ok(canvas.removed,'The world canvas must be removed on deactivation');
  console.log('Fresh terrain and river scene construction, geometry integrity, subtle river movement and disposal smoke test passed (Three.js mocked).');
})().catch(error=>{console.error(error);process.exitCode=1;});
