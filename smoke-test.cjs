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
  getBoundingClientRect(){return this._rect || {left:0,width:0,top:0,bottom:0,height:0};}
  querySelector(sel){
    if(this.id==='le-feature-dock') return this.children.find(el=>el.dataset?.view==='stacks') || null;
    if(this.id==='le-feature-stage'){ this._stageQueries ||= {}; return this._stageQueries[sel] ||= new FakeElement('div'); }
    if(this.id==='le-feature-library'){ this._libraryQueries ||= {}; return this._libraryQueries[sel] ||= new FakeElement('div'); }
    return null;
  }
  click(){(this.listeners.click||[]).forEach(fn=>fn({target:this,preventDefault(){},stopImmediatePropagation(){}}));}
}
class FakeEvent { constructor(type){this.type=type;} }
class FakeCustomEvent extends FakeEvent { constructor(type,opts={}){super(type);this.detail=opts.detail;} }

// Static Home CSS is updated too, so initial paint and post-bootstrap layout share one standard.
const indexSource = fs.readFileSync(__dirname + '/index.html', 'utf8');
assert(indexSource.includes('--le-orb-size-primary:clamp(49px,14.2vmin,76px)'), 'index.html defines the global primary Orb size token');
assert(indexSource.includes('.orbShell{position:relative;display:block;width:var(--le-orb-size-primary)'), 'initial Home Orb styling uses the shared size token');
assert(indexSource.includes('width:min(94vw,98vmin,520px)'), 'index.html caps the Home Orb group by the shorter side');
assert(indexSource.includes('@media(orientation:landscape){#navButtons{bottom:calc(env(safe-area-inset-bottom) + clamp(14px,4vmin,20px))}}'), 'static CSS moves Home navigation closer to the bottom in landscape');
assert(!indexSource.includes('width:clamp(68px,8vw,88px)'), 'legacy width-based landscape Orb size override was removed');
assert(!indexSource.includes('width:clamp(43px,11vw,63px)'), 'legacy width-based short-height Orb size override was removed');

const mainNav = new FakeElement('nav'); mainNav.id='navButtons';
const locationBtn = new FakeElement('button'); locationBtn.dataset.view='location'; locationBtn.click=()=>{ win.dispatchEvent(new FakeCustomEvent('live-earth-location-state',{detail:{enabled:false}})); };
const stacksBtn = new FakeElement('button'); stacksBtn.dataset.view='stacks'; stacksBtn._rect={left:340,width:50,top:730,bottom:780,height:50};
mainNav.querySelector = sel => sel.includes('location') ? locationBtn : sel.includes('stacks') ? stacksBtn : null;
const body = new FakeElement('body');
const head = new FakeElement('head');
const docRoot = new FakeElement('html');
const doc = {
  readyState:'complete', body, head, documentElement:docRoot,
  getElementById:id=>id==='navButtons'?mainNav:null,
  createElement:tag=>new FakeElement(tag),
  addEventListener(){}
};
let activePrimaryView = 'moon';
const win = {
  LiveEarthViewManager:{
    getActiveView:()=>activePrimaryView,
    requestView:view=>{const previous=activePrimaryView;activePrimaryView=view;win.dispatchEvent(new FakeCustomEvent('live-earth-primary-view-change',{detail:{view,previous}}));return activePrimaryView;}
  },
  listeners:{}, innerWidth:420, innerHeight:844,
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},
  dispatchEvent(event){(this.events ||= []).push(event); (this.listeners[event.type]||[]).forEach(fn=>fn(event)); return true;},
  liveEarthLocationAllowed:()=>false
};
const context = {window:win, document:doc, console, Map, Set, Object, Array, String, TypeError, Event:FakeEvent, CustomEvent:FakeCustomEvent, Element:FakeElement, navigator:{}, setTimeout, clearTimeout};
vm.runInNewContext(fs.readFileSync(__dirname+'/view-module-registry.js','utf8'),context);
const api=win.LiveEarthFeatureViews;
assert(api,'feature view API installed');
const contractStyle=head.children.find(el=>el.id==='le-feature-orb-contract-style');
assert(contractStyle,'feature styling installed');
assert(contractStyle.textContent.includes('.le-feature-library-grid{display:flex;flex-direction:column;'), 'Stacks Orb choices are arranged in one vertical column');
assert(contractStyle.textContent.includes('left:50%;right:auto;transform:translateX(-50%)'), 'Stacks rail uses a centered panel whose actual left coordinate is measured at runtime');
assert(!contractStyle.textContent.includes('left:calc(100vw - 65px)'), 'Stacks rail does not use a hard-coded screen coordinate');
assert(contractStyle.textContent.includes('--le-orb-size-primary:clamp(49px,14.2vmin,76px)'), 'primary Orb size uses the shortest viewport side and preserves its approved baseline minimum');
assert(contractStyle.textContent.includes('--le-orb-size-feature:clamp(40px,11vmin,52px)'), 'feature-picker Orb size uses a smaller tier from the same short-side standard');
assert(contractStyle.textContent.includes('--le-orb-size-dock:clamp(44px,13.5vmin,64px)'), 'active dock shares the global short-side standard');
assert(contractStyle.textContent.includes('width:min(94vw,98vmin,520px)!important'), 'Home Orbs stay grouped on wide landscape viewports');
assert(contractStyle.textContent.includes('bottom:calc(env(safe-area-inset-bottom) + clamp(14px,4vmin,20px))!important'), 'landscape navigation uses the lower bottom offset even against legacy important rules');
assert(contractStyle.textContent.includes('@media(orientation:landscape){#navButtons{bottom:calc(env(safe-area-inset-bottom) + clamp(14px,4vmin,20px))!important}}'), 'landscape navigation moves closer to the bottom');
assert(contractStyle.textContent.includes('touch-action:pan-y!important'), 'Stacks-only scrolling overrides the fixed scene gesture restriction while open');
assert(contractStyle.textContent.includes('background:transparent;box-shadow:none;backdrop-filter:none'), 'Stacks chooser has no glass panel or blur');
assert(contractStyle.textContent.includes('.le-feature-library-scroll{flex:1 1 auto;min-height:0;overflow-y:auto'), 'only the feature list owns the vertical scroll area');
assert.equal(api.list().length,6,'six default Stacks Orb entries registered');
assert(api.list().some(x=>x.id==='alien-world'),'Alien World default Orb registered');
api.toggleLibrary();
assert.equal(api.isLibraryOpen(),true,'Stacks library opens');
const libraryEl=body.children.find(el=>el.id==='le-feature-library');
const libraryPanel=libraryEl._libraryQueries['.le-feature-library-panel'];
assert.equal(libraryPanel.style.left,'361.5px','floating list follows the live Stacks Orb and stays inside the viewport edge');
assert.equal(libraryPanel.style.bottom,'124px','floating list stops just above the actual Stacks Orb instead of using a guessed bottom offset');
assert(docRoot.classList.contains('le-stacks-library-open'), 'Stacks open state enables vertical pan for its inner scroll list');
api.toggleLibrary();
assert.equal(api.isLibraryOpen(),false,'Stacks Orb toggles library closed');
assert(!docRoot.classList.contains('le-stacks-library-open'), 'closing Stacks restores normal scene gesture handling');
const order=[];
api.register('weather',{activate:()=>order.push('weather:activate'),deactivate:()=>order.push('weather:deactivate')});
api.register('alien-world',{activate:()=>order.push('alien:activate'),deactivate:()=>order.push('alien:deactivate')});
assert(api.open('weather'));
assert.equal(activePrimaryView,'home','opening a feature closes the previously active Moon/primary view to Home');
assert.equal(api.getReturnView(),'home','feature mode returns to Home, not the stale primary scene');
assert.equal(api.getActive(),'weather');
assert.equal(mainNav.hidden,true,'original five-Orb navigation hidden only in feature mode');
assert(body.classList.contains('le-feature-view-active'),'feature mode flag is set');
assert(api.open('alien-world'));
assert.deepEqual(order,['weather:activate','weather:deactivate','alien:activate'],'outgoing feature cleanup runs before incoming activation');
assert.equal(api.getActive(),'alien-world');
// In feature mode, the visible anchor is the Stacks Orb in the three-Orb dock, not the hidden Home button.
const dock = body.children.find(el=>el.id==='le-feature-dock');
dock.children[2]._rect={left:315,width:50,top:700,bottom:750,height:50};
api.toggleLibrary();
const dockPanel = libraryEl._libraryQueries['.le-feature-library-panel'];
assert.equal(dockPanel.style.left,'340px','rail follows the currently visible dock Stacks Orb while Home navigation is hidden');
assert.equal(dockPanel.style.bottom,'154px','dock-anchored rail ends above the visible Stacks Orb');
// Simulate a wide landscape viewport and verify the live anchor is measured again.
win.innerWidth=844; win.innerHeight=390;
dock.children[2]._rect={left:750,width:50,top:320,bottom:370,height:50};
(win.listeners.resize||[]).forEach(fn=>fn());
assert.equal(dockPanel.style.left,'775px','orientation/resize recalculates the rail from the live Stacks Orb');
assert.equal(dockPanel.style.bottom,'80px','orientation/resize recalculates the scroll rail bottom from the live Stacks Orb');
api.toggleLibrary();
assert(api.close());
assert.equal(api.getActive(),null);
assert.equal(mainNav.hidden,false,'closing restores original five-Orb navigation');
assert(!body.classList.contains('le-feature-view-active'),'feature mode flag is removed on close');
assert.deepEqual(order,['weather:activate','weather:deactivate','alien:activate','alien:deactivate']);
console.log('PASS: 6 feature Orbs; dynamically anchored/clamped Stacks rail in Home and dock modes; resize/orientation re-anchoring; rail bottom tied to the live Stacks Orb; shared vmin sizing; compact Home grouping; landscape bottom offset; Stacks-only vertical pan; primary-view cleanup; lifecycle ordering; Home navigation restoration.');
