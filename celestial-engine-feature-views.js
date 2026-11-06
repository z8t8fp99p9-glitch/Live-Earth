/* LIVE // EARTH — Three independent Feature Orb inspection workspaces.
 * These previews instantiate temporary engine instances only. They never mount
 * or modify the existing Home Earth, Moon View or Sun View renderers.
 */
(() => {
  'use strict';
  if (window.__liveEarthCelestialEngineFeatureViewsInstalled) return;
  const featureAPI = window.LiveEarthFeatureViews;
  if (!featureAPI?.register) {
    window.addEventListener('live-earth-feature-views-ready', () => {
      if (!window.__liveEarthCelestialEngineFeatureViewsInstalled) install();
    }, { once: true });
    return;
  }

  const definitions = [
    { id:'celestial-earth-engine', key:'earth', title:'Earth Engine', shortLabel:'Earth Engine', symbol:'🌎', subtitle:'The reusable Earth renderer, surface, axial tilt and sidereal rotation.', theme:'earth' },
    { id:'celestial-moon-engine', key:'moon', title:'Moon Engine', shortLabel:'Moon Engine', symbol:'🌕', subtitle:'The lunar surface, synchronous rotation and changing illumination in deep space.', theme:'moon' },
    { id:'celestial-sun-engine', key:'sun', title:'Sun Engine', shortLabel:'Sun Engine', symbol:'☀️', subtitle:'The solar surface renderer, rotation and reusable directional-light bridge.', theme:'sun' }
  ];
  const scriptPromises = new Map();
  const roots = new Map();
  const sessions = new Map();
  let styleReady = false;

  const engineFiles = { earth:'./earth-engine.js', moon:'./moon-engine.js', sun:'./sun-engine.js' };

  function ensureStyles() {
    if (styleReady || document.getElementById('le-celestial-engine-preview-style')) { styleReady=true; return; }
    const style=document.createElement('style');style.id='le-celestial-engine-preview-style';
    style.textContent=`
      .le-celestial-preview{position:fixed;inset:0;z-index:6;overflow:hidden;color:#edf6ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#050b15;isolation:isolate}
      .le-celestial-preview[hidden]{display:none!important}.le-celestial-preview *{box-sizing:border-box}
      .le-celestial-preview:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(1px 1px at 12% 18%,#d9eeff88 98%,transparent),radial-gradient(1px 1px at 82% 16%,#d9eeff77 98%,transparent),radial-gradient(1px 1px at 78% 72%,#d9eeff66 98%,transparent),radial-gradient(1px 1px at 24% 82%,#d9eeff55 98%,transparent),radial-gradient(ellipse at 50% 45%,#132c45 0,transparent 56%),linear-gradient(160deg,#081426,#030710 72%)}
      .le-celestial-preview--earth:before{background-color:#061321;background-image:radial-gradient(ellipse at 50% 45%,#124a69 0,transparent 48%),radial-gradient(1px 1px at 12% 18%,#d9eeff88 98%,transparent),radial-gradient(1px 1px at 82% 16%,#d9eeff77 98%,transparent),linear-gradient(160deg,#061426,#020710 72%)}
      .le-celestial-preview--moon:before{background-image:radial-gradient(ellipse at 50% 45%,#514b3e55 0,transparent 48%),radial-gradient(1px 1px at 12% 18%,#fff0d688 98%,transparent),radial-gradient(1px 1px at 82% 16%,#fff0d677 98%,transparent),linear-gradient(160deg,#171522,#05060d 72%)}
      .le-celestial-preview--sun:before{background-image:radial-gradient(ellipse at 50% 48%,#7b320f66 0,transparent 48%),radial-gradient(1px 1px at 12% 18%,#fff0d688 98%,transparent),radial-gradient(1px 1px at 82% 16%,#fff0d677 98%,transparent),linear-gradient(160deg,#1b100e,#06070b 72%)}
      .le-celestial-head{position:absolute;top:calc(env(safe-area-inset-top) + 18px);left:20px;right:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none}
      .le-celestial-brand{font-size:10px;font-weight:800;letter-spacing:.18em;color:#b8d5ed;text-transform:uppercase}
      .le-celestial-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#819bb5;text-align:right}
      .le-celestial-main{position:absolute;inset:calc(env(safe-area-inset-top) + 58px) 18px calc(env(safe-area-inset-bottom) + 104px);display:flex;flex-direction:column;align-items:center;min-height:0;gap:8px}
      .le-celestial-eyebrow{margin:0;color:#9dc6e6;font-size:9px;font-weight:750;letter-spacing:.2em;text-transform:uppercase;text-align:center}
      .le-celestial-title{margin:0;color:#f2f8ff;font-size:clamp(25px,6vw,38px);line-height:1.08;font-weight:780;letter-spacing:.015em;text-align:center;text-shadow:0 4px 26px #0008}
      .le-celestial-subtitle{margin:0 auto;max-width:36em;color:#aec2d5;font-size:11px;line-height:1.45;text-align:center;text-wrap:balance}
      .le-celestial-stage{position:relative;flex:1 1 auto;width:min(100%,760px);min-height:160px;max-height:62vh;margin:3px auto 0;overflow:hidden;border:1px solid #9bc9ed1b;border-radius:26px;background:radial-gradient(ellipse at 50% 45%,#12263b88,transparent 65%);box-shadow:inset 0 0 70px #68a9d41a,0 16px 50px #0005}
      .le-celestial-preview--sun .le-celestial-stage{background:radial-gradient(ellipse at 50% 48%,#6c2b0d33,transparent 68%);border-color:#f1ae7028}
      .le-celestial-preview--moon .le-celestial-stage{background:radial-gradient(ellipse at 50% 48%,#77705c20,transparent 68%);border-color:#c9c2aa25}
      .le-celestial-renderer{position:absolute;inset:0;width:100%;height:100%;}
      .le-celestial-state{position:absolute;left:12px;right:12px;bottom:11px;padding:8px 11px;border:1px solid #b9d8f01d;border-radius:12px;background:#030812a8;color:#bfd3e4;font-size:10px;line-height:1.35;text-align:center;letter-spacing:.025em;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:none}
      .le-celestial-controls{display:flex;justify-content:center;align-items:center;gap:7px;flex-wrap:wrap;width:100%;padding:3px 0}
      .le-celestial-controls button{appearance:none;border:1px solid #a7cce53a;border-radius:999px;padding:8px 13px;background:#0d1c2bc9;color:#e4f2ff;font:650 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.035em;cursor:pointer;touch-action:manipulation;min-height:32px}
      .le-celestial-controls button[aria-pressed="true"]{background:#244b66;border-color:#9bd6f5a6;color:#fff;box-shadow:0 0 16px #3b9aca36}
      .le-celestial-status{margin:0;min-height:13px;color:#8da9c1;font-size:9px;letter-spacing:.11em;text-transform:uppercase;text-align:center}
      .le-celestial-foot{position:absolute;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom) + 76px);margin:0;color:#718ba2;font-size:8px;line-height:1.35;letter-spacing:.09em;text-align:center;text-transform:uppercase;pointer-events:none}
      @media(orientation:landscape){.le-celestial-main{inset:calc(env(safe-area-inset-top) + 42px) 18px calc(env(safe-area-inset-bottom) + 83px);display:grid;grid-template-columns:minmax(190px,.75fr) minmax(260px,1.5fr);grid-template-rows:auto auto auto 1fr auto;column-gap:22px;row-gap:5px;max-width:1000px;margin:0 auto}.le-celestial-eyebrow,.le-celestial-title,.le-celestial-subtitle,.le-celestial-controls,.le-celestial-status{grid-column:1;justify-self:center}.le-celestial-title{align-self:end}.le-celestial-subtitle{max-width:280px}.le-celestial-stage{grid-column:2;grid-row:1 / span 5;width:100%;height:100%;max-height:none;min-height:0;margin:0}.le-celestial-foot{bottom:calc(env(safe-area-inset-bottom) + 54px)}}
      @media(max-height:520px) and (orientation:landscape){.le-celestial-main{inset:calc(env(safe-area-inset-top) + 30px) 14px calc(env(safe-area-inset-bottom) + 72px)}.le-celestial-title{font-size:24px}.le-celestial-subtitle{font-size:9px}.le-celestial-controls button{padding:6px 10px;min-height:27px}.le-celestial-foot{display:none}}
      @media(prefers-reduced-motion:reduce){.le-celestial-preview *{scroll-behavior:auto!important;transition:none!important}}
      /* Moon inspection: immersive space canvas, with no dashboard card or headings. */
      .le-celestial-preview--moon{background:#02040a}
      .le-celestial-preview--moon:before{
        background-color:#02040a;
        background-image:
          radial-gradient(1.4px 1.4px at 8% 12%,#ffffffcc 98%,transparent),
          radial-gradient(1px 1px at 19% 28%,#d9e9ff99 98%,transparent),
          radial-gradient(1.2px 1.2px at 31% 9%,#ffffffaa 98%,transparent),
          radial-gradient(1px 1px at 43% 22%,#d9e9ff88 98%,transparent),
          radial-gradient(1.5px 1.5px at 58% 11%,#ffffffbb 98%,transparent),
          radial-gradient(1px 1px at 73% 25%,#d9e9ff99 98%,transparent),
          radial-gradient(1.3px 1.3px at 89% 14%,#ffffffaa 98%,transparent),
          radial-gradient(1px 1px at 13% 49%,#d9e9ff88 98%,transparent),
          radial-gradient(1.4px 1.4px at 27% 68%,#ffffff99 98%,transparent),
          radial-gradient(1px 1px at 41% 83%,#d9e9ff88 98%,transparent),
          radial-gradient(1.2px 1.2px at 65% 71%,#ffffffaa 98%,transparent),
          radial-gradient(1px 1px at 82% 57%,#d9e9ff99 98%,transparent),
          radial-gradient(1.4px 1.4px at 94% 86%,#ffffffaa 98%,transparent),
          radial-gradient(ellipse at 50% 45%,#111a2a22 0,transparent 60%);
      }
      .le-celestial-preview--moon .le-celestial-head,
      .le-celestial-preview--moon .le-celestial-eyebrow,
      .le-celestial-preview--moon .le-celestial-title,
      .le-celestial-preview--moon .le-celestial-subtitle,
      .le-celestial-preview--moon .le-celestial-state,
      .le-celestial-preview--moon .le-celestial-controls,
      .le-celestial-preview--moon .le-celestial-status,
      .le-celestial-preview--moon .le-celestial-foot{display:none!important}
      .le-celestial-preview--moon .le-celestial-main{inset:0;display:block;min-height:0;margin:0;padding:0;}
      .le-celestial-preview--moon .le-celestial-stage{position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;min-width:0;min-height:0;margin:0;border:0;border-radius:0;background:transparent;box-shadow:none;overflow:hidden;}
      .le-celestial-preview--moon .le-celestial-renderer{position:absolute;inset:0;width:100%;height:100%;}
    `;
    document.head.appendChild(style);styleReady=true;
  }

  function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}

  function buildRoot(view){
    if(roots.has(view.key))return roots.get(view.key);
    ensureStyles();
    const root=element('section','le-celestial-preview le-celestial-preview--'+view.theme);root.id='le-'+view.key+'-engine-preview';root.hidden=true;root.setAttribute('role','region');root.setAttribute('aria-label',view.title);root.setAttribute('aria-hidden','true');
    const head=element('header','le-celestial-head');head.append(element('span','le-celestial-brand','LIVE // EARTH'),element('span','le-celestial-label','GLOBAL ENGINE INSPECTION'));
    const main=element('main','le-celestial-main');
    const eyebrow=element('p','le-celestial-eyebrow','GLOBAL JAVASCRIPT ENGINE · LIVE PREVIEW');
    const title=element('h1','le-celestial-title',view.title);
    const subtitle=element('p','le-celestial-subtitle',view.subtitle);
    const stage=element('div','le-celestial-stage');const rendererHost=element('div','le-celestial-renderer');
    const state=element('div','le-celestial-state','Preparing independent preview…');stage.append(rendererHost,state);
    const controls=element('div','le-celestial-controls');
    const toggle=element('button','','Pause');toggle.type='button';toggle.setAttribute('aria-pressed','false');
    const reset=element('button','','Reset');reset.type='button';
    const slow=element('button','','0.5×');slow.type='button';slow.dataset.speed='.5';slow.setAttribute('aria-pressed','false');
    const normal=element('button','','1×');normal.type='button';normal.dataset.speed='1';normal.setAttribute('aria-pressed','true');
    const fast=element('button','','2×');fast.type='button';fast.dataset.speed='2';fast.setAttribute('aria-pressed','false');
    controls.append(toggle,reset,slow,normal,fast);
    const status=element('p','le-celestial-status','LOADING ENGINE SCRIPT');
    main.append(eyebrow,title,subtitle,stage,controls,status);
    const foot=element('p','le-celestial-foot','Independent inspection preview · not connected to any production view');
    root.append(head,main,foot);document.body.appendChild(root);
    const refs={root,rendererHost,state,toggle,reset,speedButtons:[slow,normal,fast],status,view};
    toggle.addEventListener('click',()=>{
      const session=sessions.get(view.key);if(!session?.handle)return;
      session.paused=!session.paused;
      if(session.paused){session.handle.pause();toggle.textContent='Resume';toggle.setAttribute('aria-pressed','true');}
      else{session.handle.resume();toggle.textContent='Pause';toggle.setAttribute('aria-pressed','false');}
    });
    reset.addEventListener('click',()=>{const session=sessions.get(view.key);if(!session?.handle)return;session.handle.reset();session.paused=false;toggle.textContent='Pause';toggle.setAttribute('aria-pressed','false');refs.speedButtons.forEach(item=>item.setAttribute('aria-pressed',item.dataset.speed==='1'?'true':'false'));updateState(view.key);});
    refs.speedButtons.forEach(button=>button.addEventListener('click',()=>{
      const session=sessions.get(view.key);if(!session?.handle)return;
      const speed=Number(button.dataset.speed);session.handle.setSpeed(speed);
      refs.speedButtons.forEach(item=>item.setAttribute('aria-pressed',item===button?'true':'false'));
    }));
    roots.set(view.key,refs);return refs;
  }

  function loadEngine(key){
    const engine=window.LiveEarthCelestialEngines?.[key];if(engine)return Promise.resolve(engine);
    if(scriptPromises.has(key))return scriptPromises.get(key);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=new URL(engineFiles[key],document.baseURI).href;script.async=true;
      script.onload=()=>{const loaded=window.LiveEarthCelestialEngines?.[key];if(loaded)resolve(loaded);else reject(new Error(key+' engine script loaded without registering its API.'));};
      script.onerror=()=>reject(new Error('Could not load '+engineFiles[key]));document.head.appendChild(script);
    }).catch(error=>{scriptPromises.delete(key);throw error;});
    scriptPromises.set(key,promise);return promise;
  }

  function updateState(key){
    const session=sessions.get(key),refs=roots.get(key);if(!session?.handle||!refs)return;
    const s=session.handle.getState?.()||{};
    if(key==='moon')refs.state.textContent=`${s.phase||'Lunar cycle'}  ·  ${Number.isFinite(s.illumination)?Math.round(s.illumination*100)+'% illuminated':'Illumination preview'}  ·  Lunar age ${Number.isFinite(s.ageDays)?s.ageDays.toFixed(1)+' days':'—'}`;
    else if(key==='earth')refs.state.textContent=`Sidereal rotation  ·  ${Number.isFinite(s.rotationRadians)?(s.rotationRadians%(Math.PI*2)*180/Math.PI).toFixed(1)+'°':'—'}  ·  ${s.date?new Date(s.date).toLocaleTimeString():'—'}`;
    else refs.state.textContent=`Solar rotation  ·  25.38-day reference period  ·  ${s.date?new Date(s.date).toLocaleTimeString():'—'}`;
  }

  async function activate(view){
    const refs=buildRoot(view);refs.root.hidden=false;refs.root.setAttribute('aria-hidden','false');
    const previous=sessions.get(view.key);if(previous?.handle)previous.handle.destroy();if(previous?.timer)clearInterval(previous.timer);
    const token=(previous?.token||0)+1;const session={token,handle:null,timer:null,paused:false};sessions.set(view.key,session);
    refs.status.textContent='LOADING '+view.key.toUpperCase()+' ENGINE';refs.state.textContent='Preparing independent 3D preview…';
    try{
      const engine=await loadEngine(view.key);if(sessions.get(view.key)?.token!==token)return;
      const handle=await engine.createPreview(refs.rendererHost,{onStatus:message=>{if(sessions.get(view.key)?.token===token)refs.status.textContent=String(message).toUpperCase();}});
      if(sessions.get(view.key)?.token!==token){handle.destroy();return;}
      session.handle=handle;refs.status.textContent='ENGINE READY · PREVIEW INSTANCE';
      updateState(view.key);session.timer=setInterval(()=>updateState(view.key),700);
    }catch(error){if(sessions.get(view.key)?.token===token){refs.status.textContent='ENGINE PREVIEW COULD NOT START';refs.state.textContent=error?.message||'Unknown preview error';}}
  }

  function deactivate(view){
    const refs=roots.get(view.key);const session=sessions.get(view.key);
    if(session){session.token++;if(session.timer)clearInterval(session.timer);session.handle?.destroy();session.handle=null;}
    if(refs){refs.root.hidden=true;refs.root.setAttribute('aria-hidden','true');refs.status.textContent='PREVIEW CLOSED';}
  }

  function install(){
    const api=window.LiveEarthFeatureViews;if(!api?.register)return false;
    for(const view of definitions){
      api.register(view.id,{title:view.title,shortLabel:view.shortLabel,symbol:view.symbol,description:view.subtitle+' Separate inspection workspace; no production view is connected.',connected:false,activate:()=>activate(view),deactivate:()=>deactivate(view)});
    }
    window.__liveEarthCelestialEngineFeatureViewsInstalled=true;
    window.LiveEarthCelestialEngineViews=Object.freeze({
      open:id=>api.open(id,'api'),
      openEarth:()=>api.open('celestial-earth-engine','api'),
      openMoon:()=>api.open('celestial-moon-engine','api'),
      openSun:()=>api.open('celestial-sun-engine','api'),
      close:()=>api.close('api'),
      isActive:id=>api.isActive(id)
    });
    window.dispatchEvent(new Event('live-earth-celestial-engine-views-ready'));return true;
  }
  install();
})();
