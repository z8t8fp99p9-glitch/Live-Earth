const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

class FakeElement {
  constructor(tag='div') { this.tagName=tag.toUpperCase(); this.children=[]; this.attributes={}; this.hidden=false; this.dataset={}; this.style={}; this.className=''; this._classes=new Set(); this.classList={add:(v)=>this._classes.add(v),remove:(v)=>this._classes.delete(v),toggle:(v,on)=>{if(on===undefined)on=!this._classes.has(v);on?this._classes.add(v):this._classes.delete(v);return on;},contains:(v)=>this._classes.has(v)}; this._text=''; this._html=''; this.listeners={}; this.id=''; }
  set textContent(v){this._text=String(v); this.children=[];} get textContent(){return this._text;}
  set innerHTML(v){this._html=String(v); this.children=[];} get innerHTML(){return this._html;}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.children.push(node);return node;}
  replaceChildren(...nodes){this.children=[...nodes];}
  get childElementCount(){return this.children.length;}
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
  setAttribute(k,v){this.attributes[k]=String(v);}
  removeAttribute(k){delete this.attributes[k];}
  closest(sel){if(this===stacksBtn && sel.includes('#navButtons') && sel.includes('stacks')) return this;return null;}
  querySelector(sel){
    if(this.id==='le-feature-stage'){ this._stageQueries ||= {}; return this._stageQueries[sel] ||= new FakeElement('div'); }
    if(this.id==='le-feature-library'){ this._libraryQueries ||= {}; return this._libraryQueries[sel] ||= new FakeElement('div'); }
    return null;
  }
  click(){(this.listeners.click||[]).forEach(fn=>fn({target:this,preventDefault(){},stopImmediatePropagation(){}}));}
}
class FakeEvent { constructor(type){this.type=type;} }
class FakeCustomEvent extends FakeEvent { constructor(type,opts={}){super(type);this.detail=opts.detail;} }
const mainNav = new FakeElement('nav'); mainNav.id='navButtons';
const locationBtn = new FakeElement('button'); locationBtn.dataset.view='location'; locationBtn.click=()=>{ win.dispatchEvent(new FakeCustomEvent('live-earth-location-state',{detail:{enabled:false}})); };
const stacksBtn = new FakeElement('button'); stacksBtn.dataset.view='stacks';
mainNav.querySelector = sel => sel.includes('location') ? locationBtn : sel.includes('stacks') ? stacksBtn : null;
const body = new FakeElement('body');
const head = new FakeElement('head');
const doc = {
  readyState:'complete', body, head,
  getElementById:id=>id==='navButtons'?mainNav:null,
  createElement:tag=>new FakeElement(tag),
  addEventListener(){},
  get documentElement(){return new FakeElement('html');}
};
const win = {
  LiveEarthViewManager:{getActiveView:()=> 'home'},
  listeners:{},
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},
  dispatchEvent(event){(this.events ||= []).push(event); (this.listeners[event.type]||[]).forEach(fn=>fn(event)); return true;},
  liveEarthLocationAllowed:()=>false
};
const context = {window:win, document:doc, console, Map, Set, Object, Array, String, TypeError, Event:FakeEvent, CustomEvent:FakeCustomEvent, Element:FakeElement, navigator:{}, setTimeout, clearTimeout};
vm.runInNewContext(fs.readFileSync(__dirname+'/view-module-registry.js','utf8'),context);
const api=win.LiveEarthFeatureViews;
assert(api,'feature view API installed');
assert.equal(api.list().length,6,'six default Stacks Orb entries registered');
assert(api.list().some(x=>x.id==='alien-world'),'Alien World default Orb registered');
api.toggleLibrary();
assert.equal(api.isLibraryOpen(),true,'Stacks library opens');
api.toggleLibrary();
assert.equal(api.isLibraryOpen(),false,'Stacks Orb toggles library closed');
const order=[];
api.register('weather',{activate:()=>order.push('weather:activate'),deactivate:()=>order.push('weather:deactivate')});
api.register('alien-world',{activate:()=>order.push('alien:activate'),deactivate:()=>order.push('alien:deactivate')});
assert(api.open('weather'));
assert.equal(api.getActive(),'weather');
assert.equal(mainNav.hidden,true,'original five-Orb navigation hidden only in feature mode');
assert(body.classList.contains('le-feature-view-active'),'feature mode flag is set');
assert(api.open('alien-world'));
assert.deepEqual(order,['weather:activate','weather:deactivate','alien:activate'],'outgoing feature cleanup runs before incoming activation');
assert.equal(api.getActive(),'alien-world');
assert(api.close());
assert.equal(api.getActive(),null);
assert.equal(mainNav.hidden,false,'closing restores original five-Orb navigation');
assert(!body.classList.contains('le-feature-view-active'),'feature mode flag is removed on close');
assert.deepEqual(order,['weather:activate','weather:deactivate','alien:activate','alien:deactivate']);
console.log('PASS: 6 default feature Orbs, feature open/switch/close, cleanup-before-activation, and Home navigation restore.');
