/* LIVE // EARTH — v4 orb controller, with Stage A readiness signal.
   Visual and navigation behaviour is intentionally kept from the known-good v4. */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('.orbButton[data-view]')];
  if (!buttons.length || window.__liveEarthControlsInstalled) return;
  window.__liveEarthControlsInstalled = true;

  // Global Orb contract: Main and active Feature dock share one diameter;
  // Hunter Orbs are 72% of that diameter. All diameters use the shorter viewport
  // side (vmin), and glass rings/glows scale in em units from each Orb diameter.
  // Bottom offsets are a separate layout measurement and never affect Orb size.
  const orbBottomSpacingStyle = document.createElement('style');
  orbBottomSpacingStyle.id = 'le-orb-bottom-spacing';
  orbBottomSpacingStyle.textContent = `
    /* Bottom placement only — never used to size an Orb. */
    html body #navButtons {
      bottom: calc(env(safe-area-inset-bottom) + clamp(16px, 4.5vmin, 24px)) !important;
    }
    @media (orientation: landscape) {
      html body #navButtons {
        bottom: calc(env(safe-area-inset-bottom) + clamp(7px, 2vmin, 10px)) !important;
      }
    }
    html body #le-feature-dock {
      bottom: calc(env(safe-area-inset-bottom) + clamp(12px, 4vmin, 19px)) !important;
    }
    @media (orientation: landscape) {
      html body #le-feature-dock {
        bottom: calc(env(safe-area-inset-bottom) + clamp(7px, 2vmin, 11px)) !important;
      }
    }

    /* One short-side sizing system:
       Main = 14.2% of the shorter viewport side, bounded 49–76px.
       Active Feature dock = exactly the same diameter.
       Hunter = exactly 72% of Main (same short-side basis and scaled bounds). */
    :root {
      --le-orb-main-size: clamp(49px, 14.2vmin, 76px);
      --le-orb-hunter-size: clamp(35.28px, 10.224vmin, 54.72px);
      --le-orb-size-primary: var(--le-orb-main-size) !important;
      --le-orb-size-dock: var(--le-orb-main-size) !important;
      --le-orb-size-feature: var(--le-orb-hunter-size) !important;
    }

    html body #navButtons .orbShell,
    html body #le-feature-dock .orbShell {
      width: var(--le-orb-main-size) !important;
      height: auto !important;
      aspect-ratio: 1 / 1 !important;
      flex: 0 0 auto !important;
      font-size: var(--le-orb-main-size) !important;
    }

    html body #le-feature-library .le-feature-library-item .orbShell {
      width: var(--le-orb-hunter-size) !important;
      height: auto !important;
      aspect-ratio: 1 / 1 !important;
      flex: 0 0 auto !important;
      font-size: var(--le-orb-hunter-size) !important;
    }

    /* Shared circular glass body and proportional outer luminous ring. */
    html body #navButtons .orbShell,
    html body #le-feature-dock .orbShell,
    html body #le-feature-library .le-feature-library-item .orbShell {
      box-sizing: border-box !important;
      border: .022em solid rgba(220,245,255,.42) !important;
      border-radius: 50% !important;
      background: linear-gradient(145deg,rgba(255,255,255,.16),rgba(94,149,190,.045) 42%,rgba(0,5,15,.42)) !important;
      box-shadow:
        inset .025em .025em .07em rgba(255,255,255,.38),
        inset -.04em -.06em .13em rgba(0,0,0,.62),
        0 .07em .15em rgba(0,0,0,.60),
        0 0 0 .018em rgba(160,220,255,.10) !important;
      overflow: visible !important;
      backdrop-filter: blur(.09em) !important;
      -webkit-backdrop-filter: blur(.09em) !important;
      filter:
        drop-shadow(0 .07em .13em rgba(0,0,0,.62))
        drop-shadow(0 0 .10em var(--orb-tint, var(--le-hunter-glow, rgba(125,210,255,.22)))) !important;
    }

    /* Same spherical highlight and inner glass rim in all three Orb scenes. */
    html body #navButtons .orbShell::before,
    html body #le-feature-dock .orbShell::before,
    html body #le-feature-library .le-feature-library-item .orbShell::before {
      content: "" !important;
      position: absolute !important;
      inset: 1.5% !important;
      z-index: 2 !important;
      border-radius: 50% !important;
      pointer-events: none !important;
      background:
        radial-gradient(ellipse at 28% 13%,rgba(255,255,255,.54),transparent 23%),
        radial-gradient(ellipse at 72% 88%,var(--orb-tint-soft, rgba(130,210,255,.10)),transparent 38%),
        linear-gradient(138deg,rgba(255,255,255,.22),rgba(255,255,255,.035) 25%,transparent 44%,rgba(255,255,255,.02) 68%,rgba(255,255,255,.18)) !important;
      box-shadow:
        inset .02em .02em .055em rgba(255,255,255,.66),
        inset -.035em -.055em .10em rgba(0,0,0,.52) !important;
    }

    html body #navButtons .orbShell::after,
    html body #le-feature-dock .orbShell::after,
    html body #le-feature-library .le-feature-library-item .orbShell::after {
      content: "" !important;
      position: absolute !important;
      z-index: 3 !important;
      left: 17% !important;
      top: 7% !important;
      width: 37% !important;
      height: 12% !important;
      border-radius: 50% !important;
      transform: rotate(-34deg) !important;
      background: linear-gradient(90deg,transparent,rgba(255,255,255,.92),rgba(255,255,255,.20),transparent) !important;
      filter: blur(.015em) !important;
      opacity: .82 !important;
      pointer-events: none !important;
    }

    html body #navButtons .orbImage,
    html body #le-feature-dock .orbImage,
    html body #le-feature-library .le-feature-library-item .orbImage {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      border-radius: 50% !important;
    }

    html body #navButtons .orbShine,
    html body #le-feature-dock .orbShine {
      position: absolute !important;
      inset: 1% !important;
      z-index: 4 !important;
      border-radius: 50% !important;
      pointer-events: none !important;
      mix-blend-mode: screen !important;
      opacity: .20 !important;
      box-shadow: inset 0 0 0 .018em rgba(255,255,255,.20) !important;
    }

    /* Keep the feature symbol above the shared glass reflections. */
    html body #le-feature-library .le-feature-library-item .le-feature-symbol {
      z-index: 4 !important;
    }

    /* Retain each Orb's own colour while keeping the glow proportional. */
    html body #le-feature-library .le-feature-library-item[data-feature="clouds"],
    html body #le-feature-dock .le-feature-orb[data-feature="clouds"] { --le-hunter-glow: rgba(156,207,255,.34); }
    html body #le-feature-library .le-feature-library-item[data-feature="weather"],
    html body #le-feature-dock .le-feature-orb[data-feature="weather"] { --le-hunter-glow: rgba(69,184,255,.40); }
    html body #le-feature-library .le-feature-library-item[data-feature="elevation"],
    html body #le-feature-dock .le-feature-orb[data-feature="elevation"] { --le-hunter-glow: rgba(108,206,156,.34); }
    html body #le-feature-library .le-feature-library-item[data-feature="earthquakes"],
    html body #le-feature-dock .le-feature-orb[data-feature="earthquakes"] { --le-hunter-glow: rgba(255,155,92,.36); }
    html body #le-feature-library .le-feature-library-item[data-feature="traffic"],
    html body #le-feature-dock .le-feature-orb[data-feature="traffic"] { --le-hunter-glow: rgba(88,233,189,.36); }

    html body #navButtons .orbButton[aria-pressed="true"] .orbShell,
    html body #le-feature-dock .orbButton[aria-pressed="true"] .orbShell,
    html body #le-feature-library .le-feature-library-item[aria-pressed="true"] .orbShell {
      border-color: rgba(235,250,255,.90) !important;
      box-shadow:
        inset .025em .025em .07em rgba(255,255,255,.62),
        inset -.04em -.06em .12em rgba(0,0,0,.54),
        0 0 0 .028em var(--orb-tint, var(--le-hunter-glow, rgba(125,210,255,.36))),
        0 0 .22em var(--orb-tint, var(--le-hunter-glow, rgba(125,210,255,.36))),
        0 .08em .17em rgba(0,0,0,.58) !important;
      filter:
        brightness(1.06) saturate(1.08)
        drop-shadow(0 .07em .13em rgba(0,0,0,.58))
        drop-shadow(0 0 .15em var(--orb-tint, var(--le-hunter-glow, rgba(125,210,255,.36)))) !important;
    }

    /* Location and Stacks keep their signature red and cyan active rings. */
    html body #le-feature-dock .orbButton[data-view="location"][aria-pressed="true"] .orbShell,
    html body #navButtons .orbButton[data-view="location"][aria-pressed="true"] .orbShell {
      border-color: rgba(255,170,180,.94) !important;
      box-shadow:
        inset .025em .025em .07em rgba(255,255,255,.68),
        inset -.04em -.06em .12em rgba(0,0,0,.54),
        0 0 0 .028em rgba(255,50,80,.54),
        0 0 .24em rgba(255,35,75,.62),
        0 .08em .17em rgba(0,0,0,.58) !important;
    }
    html body #le-feature-dock .orbButton[data-view="stacks"][aria-pressed="true"] .orbShell,
    html body #navButtons .orbButton[data-view="stacks"][aria-pressed="true"] .orbShell {
      border-color: rgba(190,255,255,.92) !important;
      box-shadow:
        inset .025em .025em .07em rgba(255,255,255,.68),
        inset -.04em -.06em .12em rgba(0,0,0,.54),
        0 0 0 .028em rgba(85,245,255,.42),
        0 0 .24em rgba(0,217,255,.60),
        0 .08em .17em rgba(0,0,0,.58) !important;
    }
  `;
  (document.head || document.documentElement).appendChild(orbBottomSpacingStyle);

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
