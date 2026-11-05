/* LIVE // EARTH — v4 orb controller, with Stage A readiness signal.
   Visual and navigation behaviour is intentionally kept from the known-good v4. */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('.orbButton[data-view]')];
  if (!buttons.length || window.__liveEarthControlsInstalled) return;
  window.__liveEarthControlsInstalled = true;

  const status = document.querySelector('#status');
  let selected = 'home';
  let locationEnabled = false;
  let locationWatch = null;
  const originalGetCurrentPosition = navigator.geolocation?.getCurrentPosition?.bind(navigator.geolocation);
  const originalWatchPosition = navigator.geolocation?.watchPosition?.bind(navigator.geolocation);
  const originalClearWatch = navigator.geolocation?.clearWatch?.bind(navigator.geolocation);
  const watches = new Set();


  // Attempt 1: recover stale iOS standalone-app layout/hit-test geometry after rotation.
  // Do not resize, reposition, zoom, or otherwise touch the Earth/Moon canvas.
  let viewportFrame=0;
  let viewportTimers=[];
  function syncViewport(){
    if(viewportFrame)cancelAnimationFrame(viewportFrame);
    viewportFrame=requestAnimationFrame(()=>{
      viewportFrame=0;
      const vv=window.visualViewport;
      const height=Math.max(240,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight));
      const width=Math.max(240,Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth));
      const root=document.documentElement;
      root.style.setProperty('--le-viewport-height',`${height}px`);
      root.style.setProperty('--le-viewport-width',`${width}px`);
      for(const el of [panel]){
        if(!el||el.hidden)continue;
        el.style.maxHeight=`${Math.max(180,height-28)}px`;
        el.style.maxWidth=`${Math.max(240,Math.min(width-24,440))}px`;
        el.style.pointerEvents='auto';
        void el.getBoundingClientRect();
      }
      const nav=document.querySelector('#navButtons');
      if(nav){
        nav.style.pointerEvents='auto';
        nav.querySelectorAll('.orbButton').forEach(b=>{b.style.pointerEvents='auto';});
        // Force a fresh layout/hit-test calculation without changing nav geometry.
        void nav.getBoundingClientRect();
      }
      void root.getBoundingClientRect();
    });
  }
  function settleAfterRotation(){
    viewportTimers.forEach(timer=>window.clearTimeout(timer));
    viewportTimers=[];
    // Safari may emit several intermediate resize events; measure again after it settles.
    syncViewport();
    for(const delay of [180,420,800]){
      viewportTimers.push(window.setTimeout(()=>{
        // Only clear stale scroll on an orientation transition, not ordinary resize.
        try{window.scrollTo(0,0)}catch(_){}
        if(document.documentElement.scrollTop)document.documentElement.scrollTop=0;
        if(document.body.scrollTop)document.body.scrollTop=0;
        syncViewport();
      },delay));
    }
  }
  // Temporary A/B test: the iOS root-flow helper may set the global flag before
  // this controller loads. Keep initial syncViewport() active, but conditionally
  // bypass only the old recovery event listeners while testing the new root flow.
  const disableLegacyViewportRecoveryForAB = window.__LE_DISABLE_LEGACY_VIEWPORT_RECOVERY__ === true;
  if(!disableLegacyViewportRecoveryForAB){
    window.addEventListener('orientationchange',settleAfterRotation,{passive:true});
    window.addEventListener('resize',syncViewport,{passive:true});
    window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
    window.addEventListener('pageshow',settleAfterRotation,{passive:true});
  }
  syncViewport();

  function setStatus(message, ms=2800) {
    if (!status) return;
    status.hidden=false; status.textContent=message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer=window.setTimeout(()=>{if(status.textContent===message)status.hidden=true},ms);
  }
  function paintButtons(){
    const earthActive = !!document.querySelector('.orbButton[data-view="earth"]')?.classList.contains('le-earth-exploration-active');
    const managedView = window.LiveEarthViewManager?.getActiveView?.();
    // The view manager owns Earth/Moon/Sun. This controller owns Location.
    // Stacks pressed-state belongs exclusively to LiveEarthFeatureViews.
    buttons.forEach(b=>{
      const id=b.dataset.view;
      if(id === 'stacks') return;
      const primaryActive = managedView
        ? (id==='earth' ? managedView==='explorer' : id==='moon' ? managedView==='moon' : id==='sun' ? managedView==='sun' : false)
        : (id==='earth' ? earthActive : (!earthActive && id===selected));
      const active = id==='location' ? locationEnabled
        : ['earth','moon','sun'].includes(id) ? primaryActive : false;
      b.setAttribute('aria-pressed',String(active));
      if(id==='location') b.setAttribute('aria-label',locationEnabled?'Location ON — tap to turn off':'Location OFF — tap to turn on');
    });
  }
  function home(showMessage=false){
    selected='home';
    if(panel) panel.hidden=true;
    paintButtons();
    if(showMessage)setStatus('Home · your Earth remains unchanged.');
    else if(status)status.hidden=true;
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
  function activate(id){
    if(id==='location'){applyLocation(!locationEnabled);return}
    if(id==='earth'){if(window.LiveEarthViewManager)window.LiveEarthViewManager.requestView('explorer');else home(true);return}
    if(id==='stacks'){
      // The shared Stacks controller owns the library and its open/close state.
      // This is a fallback bridge only; do not build a second panel here.
      const stacks = window.LiveEarthFeatureViews;
      if(stacks?.toggleLibrary) stacks.toggleLibrary();
      else setStatus('Stacks is still loading. Please try again.');
      return;
    }
    // Primary views are managed centrally; do not let this utility controller
    // reset them or close Stacks if a legacy handler is ever reached.
    if(['moon','sun'].includes(id) && window.LiveEarthViewManager){window.LiveEarthViewManager.requestView(id);return}
    return;
  }
  buttons.forEach(b=>{
    const replacement=b.cloneNode(true);b.replaceWith(replacement);
    replacement.addEventListener('click',()=>activate(replacement.dataset.view));
  });
  const freshButtons=[...document.querySelectorAll('.orbButton[data-view]')];
  buttons.splice(0,buttons.length,...freshButtons);
  paintButtons();

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
        window.clearInterval(readyTimer);
      }
    }, 250);
    window.addEventListener('pagehide',()=>window.clearInterval(readyTimer),{once:true});
  }

  window.addEventListener('live-earth-location-state',e=>{locationEnabled=!!e.detail?.enabled;paintButtons()});
  window.addEventListener('live-earth-exclusive-mode',e=>{
    // Keep legacy selection state in sync; Stacks state belongs to its controller.
    if(e.detail?.active) selected='home';
    paintButtons();
  });
  window.addEventListener('pagehide',stopOwnedLocation,{once:true});
  window.addEventListener('pagehide',()=>{
    if(viewportFrame)cancelAnimationFrame(viewportFrame);
    viewportTimers.forEach(timer=>window.clearTimeout(timer));
    viewportTimers=[];
  },{once:true});
  window.liveEarthLocationAllowed=()=>locationEnabled;
  window.liveEarthGetLocationState=()=>locationEnabled;
})();
