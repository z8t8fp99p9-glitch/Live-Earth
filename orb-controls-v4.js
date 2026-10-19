/* LIVE // EARTH — v4 orb controller, with Stage A readiness signal.
   Visual and navigation behaviour is intentionally kept from the known-good v4. */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('.orbButton[data-view]')];
  if (!buttons.length || window.__liveEarthControlsInstalled) return;
  window.__liveEarthControlsInstalled = true;

  const status = document.querySelector('#status');
  const panel = document.querySelector('#astroPanel');
  let selected = 'home';
  let locationEnabled = false;
  let locationWatch = null;
  const originalGetCurrentPosition = navigator.geolocation?.getCurrentPosition?.bind(navigator.geolocation);
  const originalWatchPosition = navigator.geolocation?.watchPosition?.bind(navigator.geolocation);
  const originalClearWatch = navigator.geolocation?.clearWatch?.bind(navigator.geolocation);
  const watches = new Set();

  const style = document.createElement('style');
  style.textContent = `
  .orbButton:not([aria-pressed="true"]) .orbShell{filter:brightness(.58) saturate(.62)!important;box-shadow:inset 1px 1px 3px #ffffff35,inset -2px -3px 5px #000b,0 3px 7px #000b!important}
  .orbButton:not([aria-pressed="true"]) .orbShine{opacity:.12!important}
  .orbButton[aria-pressed="true"] .orbShell{filter:brightness(1.08) saturate(1.12)!important}
  #le-control-panel{position:fixed;z-index:7;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88vw,420px);max-height:min(58vh,calc(var(--le-viewport-height,100vh) - 28px));overflow:auto;padding:18px;border:1px solid #b6e6ff50;border-radius:22px;background:linear-gradient(145deg,#102032f5,#050b16f7);box-shadow:inset 1px 1px 2px #ffffff20,0 12px 38px #000b,0 0 28px #38bfff18;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);touch-action:pan-y;color:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  #le-control-panel[hidden]{display:none}#le-control-panel h2{font-size:21px;margin:0 0 6px;font-weight:650}#le-control-panel p{font-size:12px;line-height:1.5;color:#a8bfd1;margin:0 0 14px}
  .le-choice{display:block;width:100%;margin:8px 0;padding:13px 14px;text-align:left;border:1px solid #8ecfff30;border-radius:14px;background:#ffffff08;color:#edf8ff;font:600 13px -apple-system,BlinkMacSystemFont,sans-serif}
  .le-choice[aria-pressed="true"]{border-color:#79d7ff99;background:#58bfff18;box-shadow:0 0 14px #36bfff20}
  .le-choice small{display:block;font-size:11px;font-weight:400;color:#9fb6ca;margin-top:4px}
  .le-panel-close{float:right;border:1px solid #8fb5d544;border-radius:50%;background:#ffffff0b;color:#e8f6ff;width:32px;height:32px;font-size:20px}
  .orbButton[data-view="location"][aria-pressed="true"] .orbShell{border-color:#ff8c9c!important;box-shadow:inset 1px 1px 3px #ffffff99,0 0 0 2px #ff334d55,0 0 23px #ff1d4f99!important}
  .orbButton[data-view="location"][aria-pressed="false"] .orbShell{box-shadow:inset 1px 1px 3px #ffffff66,inset -2px -3px 5px #0009,0 4px 8px #0009,0 0 5px #ff334d18!important}
  @media(prefers-reduced-motion:reduce){#le-control-panel *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  const featurePanel = document.createElement('section');
  featurePanel.id = 'le-control-panel';
  featurePanel.hidden = true;
  featurePanel.setAttribute('role','dialog');
  featurePanel.setAttribute('aria-modal','false');
  featurePanel.innerHTML = `
    <button class="le-panel-close" type="button" aria-label="Close panel">×</button>
    <h2 id="le-panel-title">Earth experience</h2>
    <p id="le-panel-desc">Choose how LIVE // EARTH should behave on this device.</p>
    <div id="le-panel-options"></div>`;
  document.body.appendChild(featurePanel);
  const panelTitle=featurePanel.querySelector('#le-panel-title');
  const panelDesc=featurePanel.querySelector('#le-panel-desc');
  const options=featurePanel.querySelector('#le-panel-options');
  featurePanel.querySelector('.le-panel-close').addEventListener('click',()=>{featurePanel.hidden=true;home(false)});

  // iOS can briefly retain the previous visual viewport after device rotation.
  // Re-measure without reloading the page or changing the approved globe scene.
  let viewportFrame=0;
  function syncViewport(){
    if(viewportFrame)cancelAnimationFrame(viewportFrame);
    viewportFrame=requestAnimationFrame(()=>{
      viewportFrame=0;
      const vv=window.visualViewport;
      const height=Math.max(240,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight));
      const width=Math.max(240,Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth));
      document.documentElement.style.setProperty('--le-viewport-height',`${height}px`);
      document.documentElement.style.setProperty('--le-viewport-width',`${width}px`);
      // Force the open panel to recalculate its hit box after orientation changes.
      for(const el of [panel,featurePanel]){
        if(!el||el.hidden)continue;
        el.style.maxHeight=`${Math.max(180,height-28)}px`;
        el.style.maxWidth=`${Math.max(240,Math.min(width-24,440))}px`;
        el.style.pointerEvents='auto';
        void el.offsetHeight;
      }
      const nav=document.querySelector('#navButtons');
      if(nav){nav.style.pointerEvents='auto';nav.querySelectorAll('.orbButton').forEach(b=>{b.style.pointerEvents='auto';});}
    });
  }
  window.addEventListener('orientationchange',syncViewport,{passive:true});
  window.addEventListener('resize',syncViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
  syncViewport();

  function setStatus(message, ms=2800) {
    if (!status) return;
    status.hidden=false; status.textContent=message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer=window.setTimeout(()=>{if(status.textContent===message)status.hidden=true},ms);
  }
  function paintButtons(){
    buttons.forEach(b=>{
      const id=b.dataset.view;
      const active=id==='location'?locationEnabled:(id==='earth'?false:(id===selected));
      b.setAttribute('aria-pressed',String(active));
      if(id==='location') b.setAttribute('aria-label',locationEnabled?'Location ON — tap to turn off':'Location OFF — tap to turn on');
    });
  }
  function home(showMessage=false){
    selected='home';
    featurePanel.hidden=true;
    if(panel) panel.hidden=true;
    paintButtons();
    if(showMessage)setStatus('Home · your Earth remains unchanged.');
    else if(status)status.hidden=true;
  }
  function showPanel(title,desc,items){
    if(panel)panel.hidden=true;
    panelTitle.textContent=title;panelDesc.textContent=desc;options.replaceChildren();
    items.forEach(item=>{
      const b=document.createElement('button');b.type='button';b.className='le-choice';b.setAttribute('aria-pressed',String(!!item.active));
      b.append(document.createTextNode(item.title));
      const small=document.createElement('small');small.textContent=item.detail;b.append(small);
      b.addEventListener('click',item.action);options.append(b);
    });
    featurePanel.hidden=false;
  }
  function stopOwnedLocation(){
    if(locationWatch!==null&&originalClearWatch){try{originalClearWatch(locationWatch)}catch(e){}locationWatch=null}
    for(const id of watches){try{originalClearWatch?.(id)}catch(e){}}
    watches.clear();
    window.dispatchEvent(new CustomEvent('live-earth-location-stop'));
  }
  function applyLocation(on){
    locationEnabled=!!on;
    try{localStorage.setItem('liveEarthLocationEnabled',String(locationEnabled))}catch(e){}
    if(!locationEnabled)stopOwnedLocation();
    window.dispatchEvent(new CustomEvent('live-earth-location-state',{detail:{enabled:locationEnabled}}));
    paintButtons();
    if(!locationEnabled){setStatus('Live Location OFF · fresh app location requests are blocked.');return}
    setStatus('Live Location ON · a feature may request location when you choose it.');
  }
  // Safety default: each fresh app launch starts with app-owned Live Location OFF.
  // The user must explicitly turn it on again during this session.
  locationEnabled=false;
  try{localStorage.setItem('liveEarthLocationEnabled','false')}catch(e){}
  if(navigator.geolocation&&originalGetCurrentPosition){
    try{
      navigator.geolocation.getCurrentPosition=function(success,error,opts){
        if(!locationEnabled){error?.({code:1,message:'LIVE // EARTH Location is OFF.'});return}
        return originalGetCurrentPosition(success,error,opts);
      };
      if(originalWatchPosition){
        navigator.geolocation.watchPosition=function(success,error,opts){
          if(!locationEnabled){error?.({code:1,message:'LIVE // EARTH Location is OFF.'});return -1}
          const id=originalWatchPosition(success,error,opts);watches.add(id);return id;
        };
      }
    }catch(e){console.warn('[LIVE // EARTH] Browser did not allow geolocation gating.',e)}
  }
  function stacksPanel(){
    showPanel('Stacks · More Options','Only layers that are actually connected should be enabled. These controls are honest placeholders until each data layer is integrated.',[
      {title:'Clouds',detail:'Not connected yet',action:()=>setStatus('Cloud layer is not connected yet.')},
      {title:'Elevation',detail:'Not connected yet',action:()=>setStatus('Elevation layer is not connected yet.')},
      {title:'Weather',detail:'Not connected yet',action:()=>setStatus('Weather layer is not connected yet.')},
      {title:'Earthquakes',detail:'Not connected yet',action:()=>setStatus('Earthquake layer is not connected yet.')},
      {title:'Traffic',detail:'Not connected yet',action:()=>setStatus('Traffic layer is not connected yet.')}
    ]);
  }
  function activate(id){
    if(id==='location'){featurePanel.hidden=true;applyLocation(!locationEnabled);return}
    if(id==='earth'){home(true);return}
    if(!['moon','sun','stacks'].includes(id))return;
    if(selected===id){home(true);return}
    selected=id;paintButtons();
    // Hide the previous feature immediately before showing the next one.
    featurePanel.hidden=true;
    if(panel)panel.hidden=true;
    if(id==='stacks'){stacksPanel();syncViewport();return}
    if(panel)panel.hidden=false;
    syncViewport();
    window.dispatchEvent(new CustomEvent('live-earth-astro-preview',{detail:{view:id}}));
  }
  buttons.forEach(b=>{
    const replacement=b.cloneNode(true);b.replaceWith(replacement);
    replacement.addEventListener('click',()=>activate(replacement.dataset.view));
  });
  const freshButtons=[...document.querySelectorAll('.orbButton[data-view]')];
  buttons.splice(0,buttons.length,...freshButtons);
  paintButtons();

  // Signal that the visual scene is ready before allowing old shell caches to
  // be removed. The homepage's status is hidden only after successful setup.
  const announceReady = () => {
    if (!status || status.hidden) {
      const controller = navigator.serviceWorker?.controller;
      controller?.postMessage({type:'LIVE_EARTH_APP_READY'});
      return true;
    }
    return false;
  };
  if (!announceReady()) {
    const readyTimer = window.setInterval(() => {
      if (announceReady()) window.clearInterval(readyTimer);
      else if (status && !status.hidden && !/Preparing Earth/i.test(status.textContent || '')) {
        // Keep the previous shell if the scene reports an error.
        window.clearInterval(readyTimer);
      }
    }, 250);
    window.addEventListener('pagehide',()=>window.clearInterval(readyTimer),{once:true});
  }

  window.addEventListener('live-earth-location-state',e=>{locationEnabled=!!e.detail?.enabled;paintButtons()});
  window.addEventListener('pagehide',stopOwnedLocation,{once:true});
  window.addEventListener('pagehide',()=>{if(viewportFrame)cancelAnimationFrame(viewportFrame)},{once:true});
  window.liveEarthLocationAllowed=()=>locationEnabled;
  window.liveEarthGetLocationState=()=>locationEnabled;
  window.addEventListener('live-earth-astro-preview',()=>{featurePanel.hidden=true});
})();
