/* LIVE // EARTH — Land View Controller.
   Numerical-only Land observatory. Reads verified records from the central
   current-values store; never substitutes imagery or fabricates grid cells. */
(() => {
  'use strict';
  const flag = '__liveEarthLandViewControllerInstalled';
  if (window[flag]) return;
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Land controller is waiting for the feature-view runtime.');
    return;
  }

  const WORLD = { id: 'land', title: 'Land', symbol: '⌁' };
  const VALUES_BASE_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/values/';
  const DATASETS = [
    { id:'land_temperature', datasetId:'earth.land.land_temperature', label:'Land temperature', unit:'°C', available:true, kind:'point_samples', note:'NASA POWER · daily 2 m air temperature · six regional point samples' },
    { id:'soil_moisture', datasetId:'earth.land.soil_moisture', label:'Soil moisture' },
    { id:'soil_properties', datasetId:'earth.land.soil_properties', label:'Soil properties' },
    { id:'elevation', datasetId:'earth.land.elevation', label:'Elevation' },
    { id:'terrain', datasetId:'earth.land.terrain', label:'Terrain' },
    { id:'land_cover', datasetId:'earth.land.land_cover', label:'Land cover' },
    { id:'vegetation_health', datasetId:'earth.land.vegetation_health', label:'Vegetation health' },
    { id:'forest_change', datasetId:'earth.land.forest_change', label:'Forest change' },
    { id:'surface_reflectance', datasetId:'earth.land.surface_reflectance', label:'Surface reflectance' },
    { id:'urban_expansion', datasetId:'earth.land.urban_expansion', label:'Urban expansion' }
  ];
  const REGION_NAMES = {
    north_america:'North America', south_america:'South America',
    europe_north_africa:'Europe & North Africa', east_africa:'East Africa',
    south_asia:'South Asia', east_asia_pacific:'East Asia & Pacific'
  };

  function installStyles() {
    if (document.getElementById('le-land-observatory-style')) return;
    const style = document.createElement('style');
    style.id = 'le-land-observatory-style';
    style.textContent = `
      .le-world-engine-host{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(15,47,75,.22),rgba(2,6,13,.88) 76%)}
      .le-world-engine-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
      .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      .le-world-engine-host .le-sfv-body,.le-world-engine-host .le-sfv-head{pointer-events:auto}
      .le-sfv--land .le-sfv-panel{display:flex;flex-direction:column;overflow:hidden;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:calc(env(safe-area-inset-top) + 68px) clamp(14px,4vw,30px) 0}
      .le-sfv--land .le-sfv-head{margin-bottom:8px}
      .le-land-title{position:absolute;z-index:2;top:12svh;left:50%;transform:translateX(-50%);color:rgba(230,242,248,.92);font:500 clamp(13px,3.2vmin,17px)/1.2 system-ui,sans-serif;letter-spacing:.3em;white-space:nowrap;pointer-events:none;text-shadow:0 2px 16px #000}
      .le-land-hud-toggle{position:absolute;z-index:8;top:calc(env(safe-area-inset-top) + 14px);right:max(14px,env(safe-area-inset-right));width:48px;height:48px;border-radius:50%;border:1px solid rgba(142,203,226,.5);color:#dff5ff;background:linear-gradient(145deg,rgba(15,44,64,.96),rgba(3,13,24,.97));font-size:20px;cursor:pointer;pointer-events:auto}
      .le-land-menu{position:absolute;z-index:9;top:calc(env(safe-area-inset-top) + 70px);right:max(14px,env(safe-area-inset-right));display:grid;grid-template-columns:repeat(2,minmax(132px,1fr));gap:7px;width:min(310px,calc(100vw - 28px));max-height:min(58svh,480px);overflow:auto;padding:10px;border:1px solid rgba(140,195,218,.24);border-radius:18px;background:rgba(3,14,27,.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-6px);transition:.18s ease}
      .le-land-menu.is-open{opacity:1;visibility:visible;pointer-events:auto;transform:none}
      .le-land-option{min-height:54px;text-align:left;padding:8px 10px;border:1px solid rgba(135,180,205,.18);border-radius:11px;color:#e5f3fb;background:rgba(15,37,55,.78);font:600 11px/1.25 system-ui,sans-serif;cursor:pointer}
      .le-land-option small{display:block;margin-top:5px;color:#8fb4c9;font-size:9px;font-weight:500}
      .le-land-option[disabled]{opacity:.48;cursor:not-allowed}
      .le-land-option[aria-pressed="true"]{border-color:rgba(103,218,190,.8);background:rgba(21,76,72,.45)}
      .le-land-data-panel{position:absolute;z-index:4;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100vw - 28px));max-height:min(42svh,390px);overflow:auto;padding:14px;border:1px solid rgba(146,193,216,.26);border-radius:17px;color:#e8f4fa;background:rgba(3,13,25,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 36px rgba(0,0,0,.25)}
      .le-land-data-panel[hidden]{display:none}
      .le-land-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .le-land-panel-title{margin:0;font:600 14px/1.3 system-ui,sans-serif}
      .le-land-panel-subtitle{margin:5px 0 0;color:#91afc1;font:10px/1.45 system-ui,sans-serif}
      .le-land-close{width:32px;height:32px;border:1px solid rgba(160,200,220,.24);border-radius:50%;color:#dcecf4;background:rgba(255,255,255,.06);font-size:18px}
      .le-land-samples{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}
      .le-land-sample{padding:9px 10px;border:1px solid rgba(142,185,207,.15);border-radius:10px;background:rgba(21,45,63,.55)}
      .le-land-sample-name{display:block;color:#9ebdce;font:10px/1.3 system-ui,sans-serif}
      .le-land-sample-value{display:block;margin-top:4px;color:#f2fbff;font:600 19px/1.1 system-ui,sans-serif;font-variant-numeric:tabular-nums}
      .le-land-sample-coord{display:block;margin-top:4px;color:#7f9eaf;font:9px/1.3 ui-monospace,monospace}
      .le-land-provenance{margin:11px 0 0;color:#91aebe;font:9px/1.5 system-ui,sans-serif}
      .le-land-status{margin:8px 0 0;color:#b8d1df;font:11px/1.45 system-ui,sans-serif}
      .le-land-status[data-state="error"]{color:#ffb5a8}
      @media(orientation:landscape){.le-land-title{top:3svh}.le-land-data-panel{left:auto;right:18px;bottom:18px;transform:none;width:min(420px,42vw);max-height:70svh}.le-land-menu{top:calc(env(safe-area-inset-top) + 70px)}}
      @media(max-width:380px){.le-land-samples{grid-template-columns:1fr}.le-land-data-panel{max-height:45svh}}
    `;
    document.head.appendChild(style);
  }

  async function initializeGlobe(view) {
    const T = await import('../vendor/three.module.js');
    const engine = await import('../EarthEngine/Core/earth-engine.js');
    const createGlobe = engine.createEarthGlobe || engine.createGlobe;
    if (typeof createGlobe !== 'function') throw new Error('The shared Earth Engine factory is unavailable.');
    const root = view.root;
    root.classList.add('le-world-engine-host');
    const canvas = document.createElement('canvas');
    canvas.className = 'le-world-engine-canvas';
    canvas.setAttribute('aria-label','Interactive Earth globe for numerical Land observations');
    canvas.setAttribute('role','img');
    root.insertBefore(canvas,root.firstChild);
    let renderer=null,scene=null,camera=null,globe=null,interactions=null,observer=null,disposed=false,queued=false;
    const render=()=>{if(disposed||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!disposed&&renderer&&scene&&camera)renderer.render(scene,camera);});};
    const resize=()=>{if(disposed||!renderer||!camera)return;const r=root.getBoundingClientRect();const w=Math.max(1,Math.round(r.width||innerWidth));const h=Math.max(1,Math.round(r.height||innerHeight));renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();};
    try{
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x02050b,0);
      scene=new T.Scene();scene.background=null;
      const r=root.getBoundingClientRect();camera=new T.PerspectiveCamera(38,Math.max(1,r.width)/Math.max(1,r.height),.1,100);camera.position.set(0,0,3.15);camera.lookAt(0,0,0);
      scene.add(new T.AmbientLight(0x8aa7c8,.28));
      const key=new T.DirectionalLight(0xffffff,2);key.position.set(-3,2,4);scene.add(key);
      const fill=new T.DirectionalLight(0x245b9b,.1);fill.position.set(4,-2,-3);scene.add(fill);
      globe=await createGlobe({THREE:T,radius:1,textureUrl:'./EarthEngine/Assets/earth-land-ocean-ice-2048.png',geometryDetail:'standard',maxAnisotropy:renderer.capabilities.getMaxAnisotropy(),atmosphere:true});
      if(disposed){globe.dispose();throw new Error('Land view closed while the globe was loading.');}
      scene.add(globe.group);
      interactions=globe.attachInteractions({element:canvas,enabled:()=>!disposed&&root.isConnected&&runtime.isActive(WORLD.id),rotation:{sensitivityX:.008,sensitivityY:.006,minPitch:-1.25,maxPitch:1.25},zoom:{enabled:true,getDistance:()=>camera.position.z,setDistance:d=>{camera.position.z=Math.max(1.45,Math.min(4.2,d));camera.lookAt(0,0,0);render();},minDistance:1.45,maxDistance:4.2},onRotate:render,onZoom:render});
      resize();
      if(typeof ResizeObserver==='function'){observer=new ResizeObserver(resize);observer.observe(root);}
      window.addEventListener('resize',resize,{passive:true});window.addEventListener('orientationchange',resize,{passive:true});
      return {THREE:T,scene,camera,renderer,globe,render,dispose(){if(disposed)return;disposed=true;window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);observer?.disconnect();interactions?.dispose?.();globe?.dispose?.();renderer?.dispose?.();renderer?.forceContextLoss?.();canvas.remove();root.classList.remove('le-world-engine-host');}};
    }catch(e){disposed=true;observer?.disconnect();interactions?.dispose?.();globe?.dispose?.();renderer?.dispose?.();canvas.remove();root.classList.remove('le-world-engine-host');throw e;}
  }

  function formatDate(value){
    if(!value)return 'Time unavailable';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'Time unavailable':new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(d)+' UTC';
  }
  function formatNumber(value){
    return Number.isFinite(value)?value.toLocaleString(undefined,{maximumFractionDigits:2}):'—';
  }

  function activateView(){
    installStyles();
    const view=runtime.mount(WORLD.id);
    if(!view)return ()=>{};
    view.root.querySelector('.le-sfv-head')?.remove();
    view.root.querySelector('.le-sfv-pill')?.remove();
    document.body.classList.add('le-land-fullscreen-open');

    const title=runtime.el('div','le-land-title','LAND');
    title.setAttribute('aria-hidden','true');
    const toggle=runtime.el('button','le-land-hud-toggle','⌁');
    toggle.type='button';toggle.setAttribute('aria-label','Open Land datasets');toggle.setAttribute('aria-expanded','false');
    const menu=runtime.el('div','le-land-menu');menu.setAttribute('role','group');menu.setAttribute('aria-label','Land numerical datasets');
    toggle.setAttribute('aria-controls','le-land-dataset-menu');menu.id='le-land-dataset-menu';
    const panel=runtime.el('section','le-land-data-panel');panel.hidden=true;
    panel.setAttribute('aria-live','polite');
    const status=runtime.el('p','le-land-status','Choose a numerical Land field.');
    status.dataset.state='neutral';
    const panelHead=runtime.el('div','le-land-panel-head');
    const heading=runtime.el('div');
    const panelTitle=runtime.el('h2','le-land-panel-title','');
    const subtitle=runtime.el('p','le-land-panel-subtitle','');
    heading.append(panelTitle,subtitle);
    const close=runtime.el('button','le-land-close','×');close.type='button';close.setAttribute('aria-label','Close dataset details');
    panelHead.append(heading,close);
    const samples=runtime.el('div','le-land-samples');
    const provenance=runtime.el('p','le-land-provenance','');
    panel.append(panelHead,samples,provenance,status);
    view.root.append(title,toggle,menu,panel);

    const buttons=new Map();
    let closed=false,globe=null,request=null,selected=null;
    const setStatus=(message,state='neutral')=>{status.textContent=message;status.dataset.state=state;};
    const closePanel=()=>{panel.hidden=true;selected=null;for(const [id,b] of buttons){b.setAttribute('aria-pressed','false');}};
    toggle.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close Land datasets':'Open Land datasets');});
    close.addEventListener('click',closePanel);

    for(const item of DATASETS){
      const b=runtime.el('button','le-land-option');
      b.type='button';b.disabled=!item.available;b.setAttribute('aria-pressed','false');
      const label=runtime.el('span','',item.label);
      const detail=runtime.el('small','',item.available?'NASA POWER · numerical point samples':'Source adapter not configured');
      b.append(label,detail);
      b.addEventListener('click',()=>loadDataset(item));
      menu.appendChild(b);buttons.set(item.id,b);
    }

    async function loadDataset(item){
      if(closed||!runtime.isActive(WORLD.id))return;
      menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open Land datasets');
      request?.abort();request=null;
      if(selected===item.id&&!panel.hidden){closePanel();return;}
      selected=item.id;
      for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(id===item.id));
      panel.hidden=false;samples.replaceChildren();panelTitle.textContent=item.label;
      subtitle.textContent='Verified numerical observations · no imagery layer';
      provenance.textContent='';
      setStatus('Loading and validating regional numerical records…');
      const controller=new AbortController();request=controller;
      try{
        const base=`${VALUES_BASE_URL}${item.datasetId}/`;
        const [metaResponse,dataResponse]=await Promise.all([
          fetch(base+'metadata.json',{cache:'no-store',signal:controller.signal}),
          fetch(base+'records.jsonl',{cache:'no-store',signal:controller.signal})
        ]);
        if(!metaResponse.ok||!dataResponse.ok)throw new Error(`Stored dataset request failed (${metaResponse.status}/${dataResponse.status}).`);
        const metadata=await metaResponse.json();
        const text=await dataResponse.text();
        const records=text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
        if(closed||controller.signal.aborted||!runtime.isActive(WORLD.id))return;
        if(metadata.dataset_id!==item.datasetId)throw new Error('Dataset identity does not match the Land registry.');
        if(metadata.format!=='records'||metadata.data_kind!=='point_samples')throw new Error('This controller expects the registered numerical point-sample format.');
        const valid=records.filter(r=>r.dataset_id===item.datasetId&&Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)&&Number.isFinite(r.value)&&r.unit===item.unit);
        if(!valid.length)throw new Error('No valid numerical point records were found.');
        if(valid.length!==metadata.record_count)throw new Error(`Record count mismatch: metadata declares ${metadata.record_count}, received ${valid.length}.`);
        for(const record of valid){
          const card=runtime.el('div','le-land-sample');
          card.append(runtime.el('span','le-land-sample-name',REGION_NAMES[record.quality?.sample_tile_id]||record.quality?.sample_tile_id||'Regional sample'));
          card.append(runtime.el('strong','le-land-sample-value',`${formatNumber(record.value)} ${item.unit}`));
          card.append(runtime.el('span','le-land-sample-coord',`${formatNumber(record.latitude)}°, ${formatNumber(record.longitude)}°`));
          samples.appendChild(card);
        }
        const observed=valid.map(r=>r.observed_at).filter(Boolean).sort();
        subtitle.textContent=`${valid.length} regional point samples · observed ${formatDate(observed[0])}`;
        provenance.textContent=[item.note,metadata.source_name,`Updated ${formatDate(metadata.updated_at_utc)}`,'Values are point samples, not a continuous global field.'].filter(Boolean).join(' · ');
        setStatus(`${valid.length} numeric records verified. No raster or imagery data was loaded.`,'success');
        view.root.dataset.landDataset=item.datasetId;
      }catch(error){
        if(error?.name==='AbortError')return;
        samples.replaceChildren();setStatus(`Could not load ${item.label}: ${error?.message||'unknown error'}`,'error');
      }finally{if(request===controller)request=null;}
    }

    let enginePromise=null;
    (async()=>{
      try{
        enginePromise=initializeGlobe(view);
        globe=await enginePromise;
        if(closed||!runtime.isActive(WORLD.id)){globe.dispose();globe=null;return;}
        view.root.dataset.gridRenderingSkin='engine-ready';
        setStatus('Earth Engine ready. Select Land temperature to inspect its six verified NASA POWER numerical samples. Other fields remain visible but unavailable until their collectors are configured.','success');
        globe.render();
      }catch(error){if(!closed&&runtime.isActive(WORLD.id))setStatus(`Earth globe unavailable. ${error?.message||''}`,'error');}
    })();

    return ()=>{
      if(closed)return;closed=true;request?.abort();request=null;
      try{globe?.dispose?.();}catch(_){}
      globe=null;menu.remove();toggle.remove();title.remove();panel.remove();
      document.body.classList.remove('le-land-fullscreen-open');
      delete view.root.dataset.landDataset;
      delete view.root.dataset.gridRenderingSkin;
    };
  }

  if(runtime.registerFeature(WORLD.id,activateView,false)){
    window[flag]=true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready',{detail:{id:WORLD.id}}));
  }
})();
