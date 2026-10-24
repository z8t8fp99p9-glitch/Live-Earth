const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
class FakeElement {
  constructor(tag='div') { this.tagName=tag.toUpperCase(); this.children=[]; this.attributes={}; this.hidden=false; this.dataset={}; this.style={setProperty(k,v){this[k]=v;}}; this.className=''; this._classes=new Set(); this.classList={add:v=>this._classes.add(v),remove:v=>this._classes.delete(v),toggle:(v,on)=>{if(on===undefined)on=!this._classes.has(v);on?this._classes.add(v):this._classes.delete(v);return on;},contains:v=>this._classes.has(v)}; this._text=''; this._html=''; this.listeners={}; this.id=''; this._rect={left:0,top:0,right:0,bottom:0,width:0,height:0}; this.offsetWidth=0; this.offsetHeight=0; }
  set textContent(v){this._text=String(v);this.children=[];} get textContent(){return this._text;}
  set innerHTML(v){this._html=String(v);this.children=[];} get innerHTML(){return this._html;}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.children.push(node);return node;}
  replaceChildren(...nodes){this.children=[...nodes];}
  get childElementCount(){return this.children.length;}
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
  setAttribute(k,v){this.attributes[k]=String(v);}
  removeAttribute(k){delete this.attributes[k];}
  closest(sel){if(this===stacksBtn && sel.includes('#navButtons') && sel.includes('stacks')) return this;return null;}
  getBoundingClientRect(){return this._rect;}
  querySelector(sel){
    if(sel==='.orbShell') { if(!this._shell){this._shell=new FakeElement('span');this._shell._rect=this._rect;} return this._shell; }
    if(this.id==='le-feature-dock') return this.children.find(el=>el.dataset?.view==='stacks') || null;
    if(this.id==='le-feature-stage'){this._stageQueries ||= {};return this._stageQueries[sel] ||= new FakeElement('div');}
    if(this.id==='le-feature-library'){this._libraryQueries ||= {}; const e=this._libraryQueries[sel] ||= new FakeElement('div'); if(sel.includes('grid')){e._rect={left:0,top:0,right:420,bottom:844,width:420,height:844};} if(sel.includes('head')){e._rect={left:50,top:65,right:370,bottom:105,width:320,height:40};} if(sel.includes('panel')){e._rect={left:0,top:0,right:420,bottom:844,width:420,height:844};} return e;}
    return null;
  }
  click(){(this.listeners.click||[]).forEach(fn=>fn({target:this,preventDefault(){},stopImmediatePropagation(){}}));}
}
class FakeEvent { constructor(type){this.type=type;} }
class FakeCustomEvent extends FakeEvent { constructor(type,opts={}){super(type);this.detail=opts.detail;} }
const indexSource=fs.readFileSync(__dirname+'/index.html','utf8');
assert(indexSource.includes('--le-orb-size-primary:clamp(49px,14.2vmin,76px)'), 'Home Orb size remains based on the shorter viewport side');
assert(indexSource.includes('width:min(94vw,98vmin,520px)'), 'Home Orbs stay grouped on wide screens');
const mainNav=new FakeElement('nav');mainNav.id='navButtons';mainNav._rect={left:0,top:730,right:420,bottom:810,width:420,height:80};
const locationBtn=new FakeElement('button');locationBtn.dataset.view='location';locationBtn._rect={left:270,top:740,right:320,bottom:790,width:50,height:50};locationBtn.click=()=>{win.dispatchEvent(new FakeCustomEvent('live-earth-location-state',{detail:{enabled:false}}));};
const stacksBtn=new FakeElement('button');stacksBtn.dataset.view='stacks';stacksBtn._rect={left:340,top:730,right:390,bottom:810,width:50,height:80};stacksBtn._shell=new FakeElement('span');stacksBtn._shell._rect={left:346,top:734,right:384,bottom:772,width:38,height:38};
mainNav.querySelector=sel=>sel.includes('location')?locationBtn:sel.includes('stacks')?stacksBtn:null;
const body=new FakeElement('body'),head=new FakeElement('head'),docRoot=new FakeElement('html');
const doc={readyState:'complete',body,head,documentElement:docRoot,getElementById:id=>id==='navButtons'?mainNav:null,createElement:tag=>new FakeElement(tag),addEventListener(){}};
let activePrimaryView='moon';const win={LiveEarthViewManager:{getActiveView:()=>activePrimaryView,requestView:view=>{const previous=activePrimaryView;activePrimaryView=view;win.dispatchEvent(new FakeCustomEvent('live-earth-primary-view-change',{detail:{view,previous}}));return activePrimaryView;}},listeners:{},innerWidth:420,innerHeight:844,visualViewport:{addEventListener(){}},matchMedia:()=>({matches:false}),requestAnimationFrame:cb=>cb(),addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},dispatchEvent(event){(this.events ||= []).push(event);(this.listeners[event.type]||[]).forEach(fn=>fn(event));return true;},liveEarthLocationAllowed:()=>false};
mainNav.querySelector('x');
const context={window:win,document:doc,console,Map,Set,Object,Array,String,TypeError,Event:FakeEvent,CustomEvent:FakeCustomEvent,Element:FakeElement,navigator:{},setTimeout,clearTimeout,Math};
vm.runInNewContext(fs.readFileSync(__dirname+'/view-module-registry.js','utf8'),context);
const api=win.LiveEarthFeatureViews;assert(api,'feature view API installed');
const style=head.children.find(el=>el.id==='le-feature-orb-contract-style');assert(style,'feature styles installed');
assert(style.textContent.includes('position:absolute;inset:0;pointer-events:none;overflow:hidden'), 'scatter field fills one fixed viewport coordinate system');
assert(style.textContent.includes('.le-feature-library-item{position:absolute'), 'each orb is independently positioned');
assert(style.textContent.includes('touch-action:manipulation'), 'each floating Orb has its own button hitbox');
assert(style.textContent.includes('@keyframes le-feature-orb-drift'), 'Orbs get subtle independent drift');
assert(!style.textContent.includes('le-feature-library-scroll{flex:1'), 'no nested scrolling container can offset touch hitboxes');
assert.equal(api.list().length,6,'six feature Orbs registered');
api.toggleLibrary();assert.equal(api.isLibraryOpen(),true,'Stacks opens');
const library=body.children.find(el=>el.id==='le-feature-library');const grid=library._libraryQueries['.le-feature-library-grid'];
assert.equal(grid.children.length,6,'six floating buttons are rendered');
const centers=grid.children.map(item=>({x:parseFloat(item.style.left),y:parseFloat(item.style.top)}));
assert(centers.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'all Orbs receive actual touch-aligned coordinates');
assert(centers.some((p,i)=>i>0&&Math.abs(p.x-centers[0].x)>30),'scatter positions are not a single straight column');
assert(centers.every(p=>p.x>=55&&p.x<=365&&p.y>=145&&p.y<=690),'scattered buttons stay inside safe area between header and bottom navigation');
for(let i=0;i<centers.length;i++)for(let j=i+1;j<centers.length;j++)assert(!(Math.abs(centers[i].x-centers[j].x)<107&&Math.abs(centers[i].y-centers[j].y)<89.5),'scatter buttons do not overlap');
assert(grid.children.every(item=>item.children.length===3&&item.children[1].className==='le-feature-library-label'&&item.children[2].className==='le-feature-library-detail'),'each touch target includes the Orb, matching label, and preview caption');
// Simulate landscape: the same open hunt repositions into its new full-screen viewport.
win.innerWidth=844;win.innerHeight=390;grid._rect={left:0,top:0,right:844,bottom:390,width:844,height:390};
library._libraryQueries['.le-feature-library-head']._rect={left:240,top:28,right:604,bottom:60,width:364,height:32};
mainNav._rect={left:0,top:270,right:844,bottom:350,width:844,height:80};
stacksBtn._shell._rect={left:792,top:282,right:830,bottom:320,width:38,height:38};
(win.listeners.resize||[]).forEach(fn=>fn());
const landscapeCenters=grid.children.map(item=>({x:parseFloat(item.style.left),y:parseFloat(item.style.top)}));
assert(landscapeCenters.every(p=>p.x>=46&&p.x<=798&&p.y>=72&&p.y<=258),'landscape scatter stays within the screen and above navigation');
for(let i=0;i<landscapeCenters.length;i++)for(let j=i+1;j<landscapeCenters.length;j++)assert(!(Math.abs(landscapeCenters[i].x-landscapeCenters[j].x)<88&&Math.abs(landscapeCenters[i].y-landscapeCenters[j].y)<81.5),'landscape buttons do not overlap');
// Restore the portrait mock viewport for the feature lifecycle checks below.
win.innerWidth=420;win.innerHeight=844;grid._rect={left:0,top:0,right:420,bottom:844,width:420,height:844};
library._libraryQueries['.le-feature-library-head']._rect={left:50,top:65,right:370,bottom:105,width:320,height:40};
mainNav._rect={left:0,top:730,right:420,bottom:810,width:420,height:80};
stacksBtn._shell._rect={left:346,top:734,right:384,bottom:772,width:38,height:38};
(win.listeners.resize||[]).forEach(fn=>fn());
const order=[];api.register('weather',{activate:()=>order.push('weather:activate'),deactivate:()=>order.push('weather:deactivate')});api.register('alien-world',{activate:()=>order.push('alien:activate'),deactivate:()=>order.push('alien:deactivate')});
assert(api.open('weather'));assert.equal(activePrimaryView,'home','opening a feature closes previous Moon view');assert.equal(api.getActive(),'weather');
assert(api.open('alien-world'));assert.deepEqual(order,['weather:activate','weather:deactivate','alien:activate'],'outgoing feature is cleaned before incoming activation');
assert.equal(mainNav.hidden,true,'original Home navigation hidden only while feature view is active');
assert(api.close());assert.equal(mainNav.hidden,false,'closing feature restores the Home navigation');
api.toggleLibrary();assert.equal(api.isLibraryOpen(),true,'Stacks can open again in Home mode');
console.log('PASS: six randomized asymmetrical Orb positions; full-screen coordinate space; button hitboxes move with their visible Orbs; no nested scroll-offset container; preview captions retained; Home sizing unchanged; feature cleanup ordering; Stacks open/close; Home navigation restore.');
