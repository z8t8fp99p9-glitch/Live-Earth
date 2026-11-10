const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');
const profileStart = source.indexOf('  function weatherViewportProfile(width, height) {');
const functionStart = source.indexOf('  async function mountLivingTopography(host) {');
const functionEnd = source.indexOf('\n  function activateWeather()', functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, 'The direct Weather scene factory must be available');
let factorySource = source.slice(profileStart, functionStart) + source.slice(functionStart, functionEnd);
factorySource = factorySource.replace('const THREE = await import(THREE_MODULE_URL);', 'const THREE = THREE_TEST;');

class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;this.x/=n;this.y/=n;this.z/=n;return this;}
}
class Color {
  constructor(value='#ffffff'){this.isColor=true;this.set(value);}
  set(value){if(value instanceof Color){this.r=value.r;this.g=value.g;this.b=value.b;}else{this.r=0.7;this.g=0.7;this.b=0.7;}return this;}
  copy(value){return this.set(value);}
  clone(){return new Color(this);}
  lerp(value,t){this.r+=(value.r-this.r)*t;this.g+=(value.g-this.g)*t;this.b+=(value.b-this.b)*t;return this;}
  multiplyScalar(v){this.r*=v;this.g*=v;this.b*=v;return this;}
  setHSL(h,s,l){this.r=h;this.g=s;this.b=l;return this;}
}
class Matrix4 { makeScale(){return this;} }
class Object3D {
  constructor(){this.position=new Vector3();this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;},setScalar(v){this.x=this.y=this.z=v;}};this.userData={};this.children=[];this.matrix=new Matrix4();this.visible=true;}
  add(...nodes){this.children.push(...nodes);}
  updateMatrix(){}
  traverse(fn){fn(this);for(const child of this.children)child.traverse?child.traverse(fn):fn(child);}
}
class Group extends Object3D{}
class Scene extends Group {constructor(){super();this.background=null;this.fog=null;}}
class Geometry {
  constructor(){this.attributes={};this.index=null;this.disposed=false;}
  setAttribute(name,value){this.attributes[name]=value;return this;}
  setIndex(value){this.index=value;return this;}
  computeVertexNormals(){}
  dispose(){this.disposed=true;}
  setFromPoints(points){this.points=points;return this;}
}
class BufferAttribute {constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;this.needsUpdate=false;}getY(i){return 0.4+Math.sin(i)*0.1;}}
class Material {
  constructor(options={}){Object.assign(this,options);this.color=new Color(options.color||'#ffffff');this.opacity=options.opacity??1;this.roughness=options.roughness??1;this.disposed=false;}
  dispose(){this.disposed=true;}
}
class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.castShadow=false;this.receiveShadow=false;}}
class InstancedMesh extends Mesh {
  constructor(geometry,material,count){super(geometry,material);this.capacity=count;this.count=count;this.instanceMatrix={needsUpdate:false};this.instanceColor={needsUpdate:false};}
  setMatrixAt(){}
  setColorAt(){}
}
class Light extends Object3D {constructor(color,intensity=1){super();this.color=new Color(color);this.intensity=intensity;this.shadow={bias:0,normalBias:0,camera:{},mapSize:{set(){}}};this.groundColor=new Color('#334433');}}
class Camera extends Object3D {constructor(fov=35){super();this.fov=fov;this.aspect=1;}updateProjectionMatrix(){}lookAt(){}}
class Texture {constructor(){this.wrapS=0;this.wrapT=0;this.repeat={set(){}};this.offset={x:0,y:0};this.colorSpace='';this.anisotropy=1;}}
class Curve {
  constructor(points=[]){this.points=points;}
  getPoint(t){const n=this.points.length-1;const p=Math.max(0,Math.min(n,t*n));const i=Math.min(n-1,Math.floor(p));const a=this.points[i]||new Vector3();const b=this.points[i+1]||a;const f=p-i;return new Vector3(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,a.z+(b.z-a.z)*f);}
  getPointAt(t){return this.getPoint(t);}
  getTangent(t){const a=this.getPoint(Math.max(0,t-0.001)),b=this.getPoint(Math.min(1,t+0.001));return new Vector3(b.x-a.x,b.y-a.y,b.z-a.z).normalize();}
}
const genericGeometry = class extends Geometry {constructor(...args){super();this.args=args;this.attributes.position=new BufferAttribute(new Float32Array(60),3);}};
const THREE_TEST = {
  Color,Vector3,Matrix4,Object3D,Group,Scene,BufferGeometry:Geometry,Float32BufferAttribute:BufferAttribute,BufferAttribute,
  Mesh,InstancedMesh,MeshStandardMaterial:Material,MeshPhysicalMaterial:Material,MeshBasicMaterial:Material,
  LineBasicMaterial:Material,PointsMaterial:Material,PerspectiveCamera:Camera,WebGLRenderer:class{
    constructor(){this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.renderCount=0;}
    setPixelRatio(){}setSize(){}render(){this.renderCount++;}dispose(){}forceContextLoss(){}
  },
  HemisphereLight:Light,DirectionalLight:Light,PointLight:class extends Light{},
  SphereGeometry:genericGeometry,BoxGeometry:genericGeometry,CircleGeometry:genericGeometry,TorusGeometry:genericGeometry,
  BufferGeometry:Geometry,PlaneGeometry:genericGeometry,CylinderGeometry:genericGeometry,ConeGeometry:genericGeometry,
  IcosahedronGeometry:genericGeometry,DodecahedronGeometry:genericGeometry,TubeGeometry:genericGeometry,
  CatmullRomCurve3:Curve,Line:Mesh,LineSegments:Mesh,Points:Mesh,CanvasTexture:Texture,
  Clock:class{getDelta(){return 0.016;}start(){}},FogExp2:class{constructor(color,density){this.color=new Color(color);this.density=density;this.isFogExp2=true;}},
  MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t,degToRad:v=>v*Math.PI/180},
  SRGBColorSpace:'srgb',BackSide:1,DoubleSide:2,RepeatWrapping:3,PCFSoftShadowMap:4,ACESFilmicToneMapping:5
};

const fakeCanvas = () => {
  const ctx={
    createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){},
    createLinearGradient(){return {addColorStop(){}};},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}
  };
  return {width:0,height:0,getContext(){return ctx;},setAttribute(){},remove(){},style:{}};
};
const frameQueue=[];
const documentMock={hidden:false,createElement(tag){return tag==='canvas'?fakeCanvas():{setAttribute(){},remove(){}};},addEventListener(){},removeEventListener(){}};
const windowMock={devicePixelRatio:3,visualViewport:{addEventListener(){},removeEventListener(){}},matchMedia(){return {matches:false};},addEventListener(){},removeEventListener(){}};
const host={isConnected:true,clientWidth:430,clientHeight:932,children:[],appendChild(node){this.children.push(node);},getBoundingClientRect(){return {width:this.clientWidth,height:this.clientHeight};}};
const context=vm.createContext({
  THREE_TEST,host,THREE_MODULE_URL:'file:///vendor/three.module.js',
  el(tag,className){const node=fakeCanvas();node.tagName=tag;node.className=className;return node;},
  window:windowMock,document:documentMock,navigator:{deviceMemory:8},innerWidth:430,innerHeight:932,
  ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame(fn){frameQueue.push(fn);return frameQueue.length;},cancelAnimationFrame(){},
  console,Math,Number,Array,Float32Array,Map,Set,URL,performance:{now:()=>0}
});

(async()=>{
  const instance=await vm.runInContext(`(async()=>{${factorySource}\nreturn mountLivingTopography(host);})()`,context);
  assert.ok(instance&&typeof instance.setState==='function'&&typeof instance.dispose==='function','Scene factory must return update and disposal controls');
  for(const state of [
    {weather:'clear',phase:'dawn',localHour:6,temperature:18,humidity:42,cloudCover:8,wind:4,windDirection:90,precipitation:0,rainChance:0,snowfall:0},
    {weather:'rain',phase:'day',localHour:13,temperature:22,humidity:94,cloudCover:100,wind:24,windDirection:250,precipitation:3.2,rainChance:95,snowfall:0},
    {weather:'storm',phase:'evening',localHour:18,temperature:20,humidity:100,cloudCover:100,wind:45,windDirection:290,precipitation:7,rainChance:100,snowfall:0},
    {weather:'snow',phase:'night',localHour:23,temperature:-2,humidity:86,cloudCover:96,wind:18,windDirection:180,precipitation:0.4,rainChance:0,snowfall:1.8}
  ]) {
    instance.setState(state);
    const frame=frameQueue.shift();
    if(frame)frame(1000+frameQueue.length*20);
    frameQueue.length=0;
  }
  instance.dispose();
  assert.ok(host.children.every(node=>node.removed||node.tagName==='canvas'),'Scene canvas must be removable on deactivation');
  console.log('Weather scene construction, forecast-state updates and disposal smoke test passed (Three.js API mocked; no visual/WebGL claim).');
})().catch(error=>{console.error(error);process.exitCode=1;});
