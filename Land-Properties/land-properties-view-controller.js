/* LIVE // EARTH — Land Properties View Controller.
   Globe-first Land Properties observatory using the shared Universal Grid System and GPU
   Grid Skin. Property layers remain explicitly pending until verified source grids are registered; no placeholder measurements are displayed.
*/
(() => {
  'use strict';
  const flag = '__liveEarthLandPropertiesViewControllerInstalled';
  if (window[flag]) return;

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Land Properties controller is waiting for the feature-view runtime.');
    return;
  }

  const WORLD = {
    id: 'land-properties',
    title: 'Land Properties',
    symbol: '▤',
    message: 'Select a soil property and profile depth. Global grids appear only after their verified collectors are registered.'
  };
  const VALUES_BASE_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/values/';
    // SoilGrids property adapters will be added here only after verified current-grid
  // storage and metadata are registered in the Universal Central Database.
  const LAND_PROPERTIES_DATASETS = {};
  const DEFAULT_SOIL_PALETTE = ['#3f2920','#80563a','#c49a63','#d8c58c','#6b8b57'];
  const LAND_PROPERTIES_PALETTES = Object.create(null);


  const DATASET_OPTIONS = [
    { id:'ph', label:'Soil pH', icon:'ph', color:'#d5a66c', category:'Chemistry & fertility' },
    { id:'organic_carbon', label:'Organic carbon', icon:'carbon', color:'#b98a5a', category:'Chemistry & fertility' },
    { id:'total_nitrogen', label:'Total nitrogen', icon:'nitrogen', color:'#8ebd83', category:'Chemistry & fertility' },
    { id:'cation_exchange_capacity', label:'Cation exchange capacity', icon:'exchange', color:'#c4a2d8', category:'Chemistry & fertility' },

    { id:'clay_content', label:'Clay content', icon:'clay', color:'#b87958', category:'Texture & structure' },
    { id:'sand_content', label:'Sand content', icon:'sand', color:'#e0c27e', category:'Texture & structure' },
    { id:'silt_content', label:'Silt content', icon:'silt', color:'#aab9bd', category:'Texture & structure' },
    { id:'bulk_density', label:'Bulk density', icon:'density', color:'#9cb4c5', category:'Texture & structure' },
    { id:'coarse_fragments', label:'Coarse fragments', icon:'fragments', color:'#a7a1a0', category:'Texture & structure' },

    { id:'organic_carbon_density', label:'Organic carbon density', icon:'carbon_density', color:'#bf8954', category:'Carbon' },
    { id:'organic_carbon_stock', label:'Organic carbon stock', icon:'carbon_stock', color:'#9c7049', category:'Carbon' },

    { id:'water_content_10kpa', label:'Water content · 10 kPa', icon:'water_10', color:'#75c9ed', category:'Water retention' },
    { id:'water_content_33kpa', label:'Water content · 33 kPa', icon:'water_33', color:'#5ca9d5', category:'Water retention' },
    { id:'water_content_1500kpa', label:'Water content · 1500 kPa', icon:'water_1500', color:'#497fae', category:'Water retention' }
  ];

  function loadSharedGridTools() {
    const scripts = [
      ['./EarthEngine/Graphics/universal-grid-system.js', () => !!window.LiveEarthUniversalGridSystem?.loadCurrentGrid],
      ['./EarthEngine/Graphics/earth-grid-gpu-skin.js', () => !!window.LiveEarthGpuGridSkin?.create]
    ];
    return scripts.reduce((chain, [path, ready]) => chain.then(() => {
      if (ready()) return;
      const key = `__leScriptPromise:${path}`;
      if (window[key]) return window[key];
      window[key] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(path, document.baseURI).href;
        script.async = true;
        script.onload = () => ready() ? resolve() : reject(new Error(`${path} loaded without its public API.`));
        script.onerror = () => reject(new Error(`Could not load ${path}.`));
        (document.head || document.documentElement).appendChild(script);
      }).catch(error => { window[key] = null; throw error; });
      return window[key];
    }), Promise.resolve());
  }


  const ICONS = {
    ph:'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8m-4-4v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    carbon:'<path d="M18.8 5.2C11 5.4 6 8.2 6 13.5c0 3 2 5.3 5 5.3 5.1 0 7.5-5.3 7.8-13.6Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c3-4 6.5-7 11.5-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    nitrogen:'<path d="M6 19V5l12 14V5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    exchange:'<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 12h5l2-3 2 6 2-3h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    clay:'<circle cx="7" cy="8" r="2.1" fill="currentColor"/><circle cx="16.5" cy="7" r="2.8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="16.5" r="3.1" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    sand:'<circle cx="6" cy="8" r="1.1" fill="currentColor"/><circle cx="12" cy="6" r="1.1" fill="currentColor"/><circle cx="18" cy="9" r="1.1" fill="currentColor"/><circle cx="8" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="16" r="1.1" fill="currentColor"/><circle cx="11" cy="20" r="1.1" fill="currentColor"/>',
    silt:'<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="7" r="1.1" fill="#071725"/><circle cx="15" cy="12" r="1.1" fill="#071725"/>',
    density:'<path d="M5 19V5m5 14V9m5 10V6m5 13V3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    fragments:'<path d="m5 8 3-3 3 3-2 4-4-1Zm8-2 4-2 3 4-3 3-4-2Zm-5 9 4-3 4 3-2 4-5 0Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    carbon_density:'<path d="M12 3v18M5 7h14M5 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    carbon_stock:'<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 4v6m5-1v6m5-1v6" stroke="currentColor" stroke-width="1.5"/>',
    water_10:'<path d="M12 3s-6 6.3-6 10.3a6 6 0 0 0 12 0C18 9.3 12 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 14h8" stroke="currentColor" stroke-width="1.5"/>',
    water_33:'<path d="M12 3s-6 6.3-6 10.3a6 6 0 0 0 12 0C18 9.3 12 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h8m-6 4h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
    water_1500:'<path d="M12 3s-6 6.3-6 10.3a6 6 0 0 0 12 0C18 9.3 12 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 13.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
  };

  function installHudStyle() {
    if (document.getElementById('le-land-properties-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-land-properties-cinematic-hud';
    style.textContent = `
      /* Land Properties observatory: cinematic globe, quiet controls, precise data instrument. */
      .le-sfv--land-properties .le-sfv-panel {
        display:flex; flex-direction:column; align-items:stretch;
        overflow:hidden; background:transparent!important;
        backdrop-filter:none!important; -webkit-backdrop-filter:none!important;
        padding:calc(env(safe-area-inset-top) + clamp(66px,9vmin,82px))
          clamp(15px,4vw,32px) 0;
      }
      .le-sfv--land-properties .le-sfv-head { margin-bottom:9px; }
      /* The title is a permanent scene layer: the WebGL globe renders above it. */
      .le-land-properties-scene-title {
        /* Portrait header anchor: 12% down from the screen top.
           Keep the position proportional across screen sizes. */
        position:absolute; z-index:1;
        top:12vh;
        top:12svh;
        left:50%; right:auto; width:min(84vw,620px);
        box-sizing:border-box; transform:translateX(-50%);
        display:flex; align-items:center; justify-content:center;
        gap:clamp(12px,3vw,24px);
        color:rgba(226,241,250,.88); pointer-events:none; user-select:none;
      }
      .le-land-properties-scene-title::before,.le-land-properties-scene-title::after {
        content:""; height:1px; flex:1 1 0; min-width:12px;
        background:linear-gradient(90deg,transparent,rgba(148,190,215,.46));
      }
      .le-land-properties-scene-title::after { background:linear-gradient(90deg,rgba(148,190,215,.46),transparent); }
      .le-land-properties-scene-title span {
        font:500 clamp(12px,3.25vmin,17px)/1.2 system-ui,-apple-system,sans-serif;
        letter-spacing:clamp(.24em,1.15vmin,.38em); white-space:nowrap;
        text-shadow:0 0 14px rgba(122,190,226,.20);
      }
      .le-land-properties-scene-title i {
        position:absolute; left:16%; right:16%; top:calc(100% + 13px); height:1px;
        background:linear-gradient(90deg,transparent,rgba(50,155,232,.30) 28%,rgba(69,190,255,.9) 50%,rgba(50,155,232,.30) 72%,transparent);
        box-shadow:0 0 8px rgba(30,151,255,.45); font-style:normal;
      }
      .le-land-properties-scene-title i::after {
        content:""; position:absolute; left:50%; top:50%; width:5px; height:5px; border-radius:50%;
        transform:translate(-50%,-50%); background:#a8eaff; box-shadow:0 0 6px 2px #168fff,0 0 15px 5px rgba(20,133,255,.55);
      }
      .le-land-properties-hud-toggle {
        position:absolute; z-index:5; top:calc(env(safe-area-inset-top) + 14px);
        right:max(14px,env(safe-area-inset-right));
        display:grid; place-items:center;
        width:clamp(46px,6vmin,52px); height:clamp(46px,6vmin,52px);
        min-width:44px; min-height:44px; padding:0; aspect-ratio:1;
        border:1px solid rgba(135,205,239,.48); border-radius:50%;
        color:#eaf7ff;
        background:
          radial-gradient(circle at 34% 25%,rgba(112,207,245,.18),transparent 48%),
          linear-gradient(155deg,rgba(13,39,61,.94),rgba(3,12,24,.96));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.16),
          inset 0 0 0 3px rgba(122,205,240,.035),
          0 0 18px rgba(54,174,231,.14),
          0 5px 18px rgba(0,0,0,.28);
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
        cursor:pointer; touch-action:manipulation; pointer-events:auto;
        transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,transform .2s ease;
      }
      .le-land-properties-hud-toggle:active { transform:scale(.94); }
      .le-land-properties-hud-toggle:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-land-properties-hud-toggle-icon { width:19px; height:19px; flex:none; color:#a6e5ff; }
      .le-land-properties-hud-toggle[aria-expanded="true"] {
        border-color:rgba(111,218,255,.78);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 22px rgba(55,190,245,.25),0 5px 18px rgba(0,0,0,.28);
      }
      .le-land-properties-dataset-orb-menu {
        position:absolute; z-index:6;
        top:calc(env(safe-area-inset-top) + 72px);
        right:max(14px,env(safe-area-inset-right));
        display:grid; grid-template-columns:repeat(2,clamp(42px,5.8vmin,48px));
        gap:8px; align-items:center; justify-items:center; width:max-content;
        max-height:min(68svh,440px); overflow-y:auto; overscroll-behavior:contain;
        padding:4px; scrollbar-width:none;
        opacity:0; visibility:hidden; pointer-events:none;
        transform:translateY(-7px) scale(.96);
        transform-origin:top center;
        transition:opacity .2s ease,transform .2s ease,visibility .2s ease;
      }
      .le-land-properties-dataset-orb-menu::-webkit-scrollbar { display:none; }
      .le-land-properties-dataset-orb-menu.is-open {
        opacity:1; visibility:visible; pointer-events:auto;
        transform:translateY(0) scale(1);
      }
      /* Portrait: place the floating dataset control below the centered header.
         The menu follows the button so it opens directly beneath it on every screen size. */
      @media (orientation:portrait) {
        .le-land-properties-hud-toggle { top:15svh; }
        .le-land-properties-dataset-orb-menu {
          top:calc(15svh + clamp(46px,6vmin,52px) + 10px);
        }
      }
      /* Landscape: keep the dataset control lower and slightly inset from the edge. */
      @media (orientation:landscape) {
        .le-land-properties-hud-toggle { top:8svh; right:8vw; }
        .le-land-properties-dataset-orb-menu {
          top:calc(8svh + clamp(46px,6vmin,52px) + 10px);
          right:8vw;
        }
      }
      .le-land-properties-dataset-orb {
        appearance:none; display:grid; place-items:center;
        width:clamp(42px,5.8vmin,48px); height:clamp(42px,5.8vmin,48px);
        min-width:42px; min-height:42px; padding:0; border-radius:50%;
        border:1px solid rgba(122,205,240,.42);
        color:#eaf7ff;
        background:
          radial-gradient(circle at 34% 24%,rgba(111,204,245,.2),transparent 52%),
          linear-gradient(155deg,rgba(12,37,58,.96),rgba(3,12,24,.97));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 0 15px rgba(54,174,231,.13),0 4px 13px rgba(0,0,0,.28);
        backdrop-filter:blur(13px); -webkit-backdrop-filter:blur(13px);
        cursor:pointer; touch-action:manipulation;
        transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;
      }
      .le-land-properties-dataset-orb:active { transform:scale(.92); }
      .le-land-properties-dataset-orb:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-land-properties-dataset-orb.is-selected {
        border-color:rgba(112,225,210,.9);
        box-shadow:inset 0 0 0 1px rgba(112,225,210,.22),0 0 19px rgba(72,220,196,.28),0 4px 13px rgba(0,0,0,.28);
        background:linear-gradient(155deg,rgba(15,65,72,.96),rgba(3,18,31,.98));
      }
      .le-land-properties-dataset-orb:disabled { opacity:.48; cursor:progress; }
      .le-land-properties-dataset-orb-icon { width:21px; height:21px; display:block; }
      .le-land-properties-category {
        grid-column:1/-1; justify-self:stretch; padding:7px 3px 1px;
        color:rgba(223,195,151,.88); font-size:8px; line-height:1.1;
        font-weight:800; letter-spacing:.16em; text-transform:uppercase;
        text-shadow:0 1px 7px #000;
      }
      .le-land-properties-depth-selector {
        position:absolute; z-index:5; left:4vw; right:clamp(66px,15vw,92px);
        top:15svh; min-width:0; max-width: min(74vw,480px);
        display:flex; align-items:center; gap:4px; overflow-x:auto; overflow-y:hidden;
        padding:4px 5px; border:1px solid rgba(198,166,124,.22); border-radius:999px;
        background:rgba(7,15,23,.50); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
        scrollbar-width:none; pointer-events:auto;
      }
      .le-land-properties-depth-selector::-webkit-scrollbar { display:none; }
      .le-land-properties-depth-label {
        flex:0 0 auto; padding:0 5px; color:#c9b08a; font-size:7px;
        font-weight:800; letter-spacing:.10em; text-transform:uppercase;
      }
      .le-land-properties-depth-option {
        flex:0 0 auto; min-height:23px; padding:4px 7px; border:1px solid rgba(184,157,121,.20);
        border-radius:999px; color:#cfdae0; background:rgba(11,25,35,.68);
        font:600 8px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        white-space:nowrap; cursor:pointer; touch-action:manipulation;
      }
      .le-land-properties-depth-option.is-selected {
        color:#fff2dc; border-color:rgba(223,177,112,.72);
        background:linear-gradient(145deg,rgba(103,72,44,.72),rgba(37,27,21,.92));
        box-shadow:0 0 12px rgba(204,155,91,.18);
      }
      @media (orientation:landscape) {
        .le-land-properties-depth-selector { top:11svh; left:3vw; right:auto; max-width:min(58vw,480px); }
      }
      .le-sfv--land-properties .le-sfv-panel.le-land-properties-hud-hidden {
        opacity:0; visibility:hidden; pointer-events:none;
        transition:opacity .2s ease,visibility .2s ease;
      }
      .le-sfv--land-properties .le-sfv-panel { transition:opacity .2s ease,visibility .2s ease; }
      .le-sfv--land-properties.le-world-engine-host .le-world-engine-canvas { z-index:2; }
      .le-sfv--land-properties.le-world-engine-host .le-sfv-panel { z-index:3; }
      .le-sfv--land-properties .le-sfv-pill { margin-bottom:10px; }

      .le-sfv--land-properties.le-world-engine-host .le-sfv-body {
        display:block; box-sizing:border-box; width:min(100%,680px);
        margin:auto auto 0; min-height:0; max-height:min(48dvh,540px);
        overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        padding-bottom:calc(env(safe-area-inset-bottom) + 144px);
        scrollbar-width:none;
      }
      .le-sfv--land-properties.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      /* Empty feature-body space must pass gestures through to the globe.
         Restore pointer handling only on actual content and controls. */
      .le-sfv--land-properties.le-world-engine-host .le-sfv-body {
        pointer-events:none;
      }
      .le-sfv--land-properties.le-world-engine-host .le-sfv-body > *,
      .le-sfv--land-properties.le-world-engine-host .le-sfv-body :is(
        button, a, input, select, textarea, summary, [role="button"],
        .le-land-properties-details, .le-land-properties-scale-dock, .le-land-properties-data-card
      ) {
        pointer-events:auto;
      }
      .le-sfv--land-properties .le-sfv-status {
        display:inline-block; width:auto; max-width:100%; margin:0 0 9px;
        padding:7px 11px; border-radius:999px; font-size:9px; line-height:1.35;
        background:rgba(3,13,24,.54); border-color:rgba(126,228,189,.22);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      }
      .le-sfv--land-properties .le-sfv-card {
        padding:13px 15px; border-radius:17px;
        border-color:rgba(159,211,249,.19);
        background:linear-gradient(145deg,rgba(8,23,40,.80),rgba(3,10,20,.78));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.22);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      }
      .le-sfv--land-properties .le-sfv-card h2 {
        margin:0 0 4px; font-size:10px; letter-spacing:.12em;
        color:#a9c9de; text-transform:uppercase;
      }
      .le-land-properties-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-land-properties-range strong { color:#f2fbff; font-size:clamp(23px,6vw,31px); letter-spacing:-.035em; font-weight:760; }
      .le-land-properties-range span { color:#a9c6d8; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }

      /* The scale is a floating instrument, not a card. Its text and spectrum share one track. */
      .le-land-properties-grid-count {
        color:rgba(190,211,226,.82); font:500 clamp(8px,2.1vmin,11px)/1.35 system-ui,-apple-system,sans-serif;
        letter-spacing:.13em; text-transform:uppercase; font-variant-numeric:tabular-nums;
      }
      .le-land-properties-scale-dock {
        container-type:inline-size;
        --atmo-action-space:42px;
        --atmo-track-gap:12px;
        --atmo-content-width:calc(100% - var(--atmo-action-space) - var(--atmo-track-gap));
        position:absolute; z-index:4;
        left:clamp(20px,4.5vw,48px); right:clamp(20px,4.5vw,48px);
        bottom:calc(env(safe-area-inset-bottom) + clamp(82px,12svh,112px));
        box-sizing:border-box; width:min(calc(100% - 40px),760px);
        margin:0 auto; padding:0;
        border:0; border-radius:0; color:#eff8ff;
        background:transparent; box-shadow:none;
        backdrop-filter:none; -webkit-backdrop-filter:none;
        pointer-events:none;
      }
      .le-land-properties-scale-dock > .le-land-properties-data-card { pointer-events:auto; }
      .le-land-properties-scale-dock[hidden] { display:none!important; }
      /* Provenance opens as a separate panel anchored above the scale.
         It is removed from layout flow, so the scale deck never moves,
         grows, or changes its position when the panel is opened. */
      .le-land-properties-scale-dock .le-land-properties-data-card {
        display:none!important;
        position:absolute; left:0; right:0;
        bottom:calc(100% + clamp(10px,1.6svh,18px));
        width:100%; max-height:min(52svh,560px);
        box-sizing:border-box; margin:0;
        overflow:auto; overscroll-behavior:contain;
        pointer-events:auto; z-index:6;
      }
      .le-sfv--land-properties.le-land-properties-details-expanded .le-land-properties-scale-dock .le-land-properties-data-card {
        display:block!important;
      }
      .le-land-properties-scale-dock .le-sfv-attribution { margin:8px 2px 0; }
      .le-land-properties-scale-dock .le-land-properties-details { pointer-events:auto; }

      .le-land-properties-instrument-label {
        display:flex; align-items:center; justify-content:center; gap:7px;
        width:100%; margin:0 0 6px;
        color:#b7dff4; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:10px; font-weight:650; letter-spacing:.28em;
        line-height:1; text-align:center; text-transform:uppercase;
        text-shadow:0 0 16px rgba(65,176,235,.20);
      }
      .le-land-properties-instrument-label::before,
      .le-land-properties-instrument-label::after {
        content:""; display:block; flex:1 1 0; max-width:88px; height:1px;
        background:linear-gradient(90deg,transparent,rgba(104,190,231,.46));
      }
      .le-land-properties-instrument-label::after {
        background:linear-gradient(90deg,rgba(104,190,231,.46),transparent);
      }
      .le-land-properties-scale-heading {
        display:flex; flex-flow:row nowrap; justify-content:flex-start;
        align-items:center; gap:8px;
        width:var(--atmo-content-width); min-width:0;
        margin:0 0 5px; white-space:nowrap; line-height:1;
        text-align:left;
      }
      .le-land-properties-legend-title {
        display:block; flex:0 1 auto; min-width:0; overflow:hidden; margin:0;
        padding:0; color:#c6ddeb;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,2.25cqi,11px); font-weight:620;
        letter-spacing:.055em; text-align:left;
        text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap;
      }
      .le-land-properties-scale-range {
        display:block; flex:0 0 auto; min-width:0; margin:0;
        padding:0 0 0 8px; border-left:1px solid rgba(137,200,228,.56);
        color:#f7fbff;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(16px,4.1cqi,22px); font-weight:560;
        letter-spacing:-.025em; font-variant-numeric:tabular-nums;
        white-space:nowrap; text-align:left;
      }
      .le-land-properties-scale-track-row {
        display:grid; grid-template-columns:minmax(0,1fr) var(--atmo-action-space);
        align-items:center; column-gap:var(--atmo-track-gap); min-width:0;
        --atmo-gradient-height:8px;
      }
      .le-land-properties-scale-visual { min-width:0; width:100%; }
      .le-land-properties-scale-track { min-width:0; width:100%; }
      .le-land-properties-scale-more {
        position:relative; flex:none; display:grid; place-items:center;
        width:var(--atmo-action-space); height:var(--atmo-action-space);
        margin:0; padding:0; justify-self:center; align-self:center;
        border:1px solid rgba(116,218,250,.78); border-radius:50%;
        color:#d9f7ff;
        background:radial-gradient(circle at 35% 27%,rgba(78,190,229,.18),rgba(3,19,32,.72) 72%);
        box-shadow:0 0 0 1px rgba(82,186,228,.07),0 0 13px rgba(49,177,228,.20),
          inset 0 1px 4px rgba(255,255,255,.10);
        font:300 22px/1 ui-sans-serif,system-ui,sans-serif;
        cursor:pointer; pointer-events:auto; touch-action:manipulation;
        transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;
      }
      /* Portrait: centre the + control on the colour gradient itself,
         not on the combined gradient-and-tick-label block. The offset is
         derived from the live control size and gradient thickness. */
      @media (orientation:portrait) {
        .le-land-properties-scale-track-row { align-items:start; }
        .le-land-properties-scale-more {
          align-self:start; justify-self:center;
          margin-top:calc((var(--atmo-gradient-height) - var(--atmo-action-space)) / 2);
        }
      }
      .le-land-properties-scale-more:hover {
        border-color:rgba(150,232,255,.95);
        background:radial-gradient(circle at 35% 27%,rgba(78,190,229,.30),rgba(3,19,32,.82) 72%);
        box-shadow:0 0 16px rgba(49,177,228,.30);
      }
      .le-land-properties-scale-more:active { transform:scale(.94); }
      .le-land-properties-scale-more:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-land-properties-legend-bar {
        width:100%; height:8px; border-radius:999px;
        background:linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.30),0 0 9px rgba(68,159,222,.24);
      }
      /* Three true internal graduations are drawn directly on the live scale bar. */
      .le-land-properties-legend-graduations {
        position:absolute; inset:0; overflow:visible; pointer-events:none;
      }
      .le-land-properties-legend-bar { position:relative; }
      .le-land-properties-legend-graduations span {
        position:absolute; left:var(--atmo-graduation-position); top:50%;
        width:1px; height:14px; border-radius:1px;
        background:rgba(226,248,255,.92);
        box-shadow:0 0 3px rgba(112,220,255,.78);
        transform:translate(-50%,-50%);
      }
      .le-land-properties-legend-ticks {
        position:relative; width:100%;
        height:14px; margin-top:4px;
        color:#b9cddd; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,1.8cqi,11px); font-weight:500;
        line-height:1; font-variant-numeric:tabular-nums;
      }
      .le-land-properties-legend-ticks span {
        position:absolute; top:0; transform:translateX(-50%);
        white-space:nowrap; text-align:center;
      }
      .le-land-properties-legend-ticks span::before {
        content:""; position:absolute; left:50%; top:-6px;
        width:1px; height:3px; background:rgba(171,211,233,.58);
        transform:translateX(-50%);
      }
      .le-land-properties-legend-ticks span:first-child { transform:none; text-align:left; }
      .le-land-properties-legend-ticks span:first-child::before { content:none; }
      .le-land-properties-legend-ticks span:last-child { transform:translateX(-100%); text-align:right; }
      .le-land-properties-legend-ticks span:last-child::before { content:none; left:100%; }

      .le-land-properties-details { margin-top:10px; border-top:1px solid rgba(165,208,235,.14); padding-top:8px; }
      .le-land-properties-details summary {
        list-style:none; cursor:pointer; color:#b7d8e9; font-size:10px;
        font-weight:700; letter-spacing:.08em; text-transform:uppercase;
        display:flex; justify-content:space-between; align-items:center; min-height:26px;
      }
      .le-land-properties-details summary::-webkit-details-marker { display:none; }
      .le-land-properties-details summary::after { content:'＋'; color:#82d9f5; font-size:15px; }
      .le-land-properties-details[open] summary::after { content:'−'; }
      .le-sfv--land-properties .le-sfv-metric-grid { margin-top:9px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
      .le-sfv--land-properties .le-sfv-metric { padding:9px 10px; border-radius:11px; background:rgba(1,8,17,.42); }
      .le-sfv--land-properties .le-sfv-metric-label { font-size:8px; margin-bottom:4px; }
      .le-sfv--land-properties .le-sfv-metric-value { font-size:clamp(13px,3.5vw,17px); }
      .le-sfv--land-properties .le-sfv-attribution { margin:7px 2px 0; font-size:8px; color:#8da9bc; }
      .le-sfv--land-properties .le-land-properties-dataset-card { margin-bottom:9px; }
      .le-land-properties-dataset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
      .le-land-properties-dataset-option {
        appearance:none; display:flex; flex-direction:column; align-items:flex-start;
        gap:4px; min-width:0; min-height:66px; padding:10px 11px;
        border:1px solid rgba(130,197,230,.22); border-radius:13px;
        color:#eaf7ff; text-align:left;
        background:linear-gradient(145deg,rgba(16,43,65,.82),rgba(4,13,25,.82));
        cursor:pointer; font:inherit;
        transition:border-color .18s ease,background .18s ease,transform .18s ease;
      }
      .le-land-properties-dataset-option:active:not(:disabled) { transform:scale(.985); }
      .le-land-properties-dataset-option.is-selected {
        border-color:rgba(91,222,190,.8);
        background:linear-gradient(145deg,rgba(15,76,75,.78),rgba(4,24,35,.92));
        box-shadow:inset 0 0 0 1px rgba(91,222,190,.14),0 0 18px rgba(62,218,181,.12);
      }
      .le-land-properties-dataset-option:disabled { opacity:.48; cursor:not-allowed; }
      .le-land-properties-dataset-name { font-size:12px; letter-spacing:.02em; }
      .le-land-properties-dataset-detail { color:#a9c6d8; font-size:9px; line-height:1.35; }
      .le-land-properties-dataset-state { margin-top:auto; color:#80d9c1; font-size:7px; font-weight:800; letter-spacing:.1em; }
      .le-land-properties-dataset-option.is-unavailable .le-land-properties-dataset-state { color:#91a4b4; }
    `;
    document.head.appendChild(style);
  }

  

  // Complete Atmosphere/Oceans globe transfer: adaptive frame, resize, shared
  // location marker, globe-surface drag, pinch admission and full cleanup.
  function installStyles() {
  if (document.getElementById("le-land-properties-world-engine-canvas-style")) return;
  const style = document.createElement("style");
  style.id = "le-land-properties-world-engine-canvas-style";
  style.textContent = `
    /* Land Properties is an exclusive full-screen observatory, not a transparent Home overlay. */
    body.le-land-properties-fullscreen-open #scene{visibility:hidden!important;pointer-events:none!important}
    .le-sfv--land-properties.le-world-engine-host{position:absolute;inset:0;isolation:isolate;background:radial-gradient(ellipse at 50% 43%,#0a1b2b 0%,#030914 58%,#010308 100%);pointer-events:none}
    .le-world-engine-host{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(15,47,75,.22),rgba(2,6,13,.88) 76%)}
    .le-world-engine-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;pointer-events:auto;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
    .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(3,12,23,.34),rgba(3,9,18,.04) 46%,rgba(2,7,14,.28));backdrop-filter:none;-webkit-backdrop-filter:none}
    .le-sfv--land-properties.le-world-engine-host .le-sfv-panel{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
    .le-world-engine-host .le-sfv-head,.le-world-engine-host .le-sfv-body{pointer-events:auto}
    .le-world-engine-host .le-sfv-body{max-height:calc(100% - 150px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .le-world-engine-host .le-sfv-head{ text-shadow:0 2px 18px rgba(0,0,0,.85) }
    
    .le-world-engine-host .le-sfv-card{background:rgba(4,13,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  `;
  document.head.appendChild(style);
}

async function initializeEngineView(view, viewId) {
  if (!view?.root || !view?.panel || !viewId) throw new TypeError("A mounted world view and stable world id are required.");
  const T = await import("../vendor/three.module.js");
  const engine = await import("../EarthEngine/Core/earth-engine.js");
  const createEarthGlobe = engine.createEarthGlobe || engine.createGlobe;
  const getDefaultCameraDistance = engine.getDefaultCameraDistance;
  if (typeof getDefaultCameraDistance !== "function") throw new Error("Earth Engine default framing API is unavailable.");
  if (typeof createEarthGlobe !== "function") throw new Error("The reusable Earth Engine factory is unavailable.");

  const root = view.root;
  root.classList.add("le-world-engine-host");
  const canvas = document.createElement("canvas");
  canvas.className = "le-world-engine-canvas";
  canvas.setAttribute("aria-label", `${viewId} independent interactive Earth globe`);
  canvas.setAttribute("role", "img");
  root.insertBefore(canvas, root.firstChild);
  installStyles();
  const sceneTitle = document.createElement("div");
  sceneTitle.className = "le-land-properties-scene-title";
  sceneTitle.setAttribute("aria-label", "Land Properties");
  sceneTitle.innerHTML = "<span>LAND PROPERTIES</span><i aria-hidden=\"true\"></i>";
  root.appendChild(sceneTitle);

  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGlobe = null;
  let gestureController = null;
  let locationMarker = null;
  let locationHalo = null;
  let locationDot = null;
  let locationVector = null;
  let disposed = false;
  let renderQueued = false;
  let resizeObserver = null;
  let defaultCameraDistance = 3.15;
  const LAND_PROPERTIES_MAX_ZOOM = 3;
  let zoomFactor = 1;
  const layers = new Map();
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

  function requestRender() {
    if (disposed || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (!disposed && renderer && scene && camera) renderer.render(scene, camera);
    });
  }

  function resize() {
    if (disposed || !renderer || !camera) return;
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight || 1));
    renderer.setPixelRatio(maxPixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.71 });
    camera.position.z = defaultCameraDistance / zoomFactor;
    requestRender();
  }

  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.setClearColor(0x02050b, 0);
    scene = new T.Scene();
    scene.background = null;
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, rect.width || window.innerWidth || 1);
    const height = Math.max(1, rect.height || window.innerHeight || 1);
    camera = new T.PerspectiveCamera(38, width / height, 0.1, 100);
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.71 });
    camera.position.set(0, 0, defaultCameraDistance);
    camera.lookAt(0, 0, 0);
    scene.add(new T.AmbientLight(0x8aa7c8, 0.28));
    const key = new T.DirectionalLight(0xffffff, 2.0);
    key.position.set(-3, 2, 4);
    scene.add(key);
    const fill = new T.DirectionalLight(0x245b9b, 0.10);
    fill.position.set(4, -2, -3);
    scene.add(fill);

    earthGlobe = await createEarthGlobe({
      THREE: T,
      radius: 1,
      textureUrl: "./EarthEngine/Assets/earth-land-ocean-ice-2048.png",
      geometryDetail: "standard",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      land: true
    });
    if (disposed) { earthGlobe.dispose(); throw new Error("The world view closed while its Engine globe was loading."); }
    scene.add(earthGlobe.group);

    if (disposed) {
      earthGlobe.dispose();
      throw new Error("The Land Properties view closed while its globe was loading.");
    }

    // Match the Home Earth location marker: a small red halo and dot attached
    // directly to this view's Earth surface, so it follows every globe rotation.
    locationVector = new T.Vector3();
    locationMarker = new T.Group();
    locationMarker.name = "liveEarthLandLocationMarker";
    locationHalo = new T.Mesh(
      new T.SphereGeometry(0.031, 16, 12),
      new T.MeshBasicMaterial({
        color: 0xff234d, transparent: true, opacity: 0.28,
        depthTest: false, depthWrite: false
      })
    );
    locationDot = new T.Mesh(
      new T.SphereGeometry(0.014, 16, 12),
      new T.MeshBasicMaterial({
        color: 0xff183f, depthTest: false, depthWrite: false
      })
    );
    // The universal temperature skin renders at order 4. Draw the Home-style
    // location marker afterward so the data surface cannot cover it.
    locationHalo.renderOrder = 20;
    locationDot.renderOrder = 21;
    locationMarker.add(locationHalo, locationDot);
    locationMarker.visible = false;
    earthGlobe.surface.add(locationMarker);

    function syncLandPropertiesLocation() {
      const fix = window.liveEarthGetLocationState?.() === true
        ? window.liveEarthGetLocationFix?.()
        : null;
      if (!fix || !locationMarker || !locationVector) {
        if (locationMarker) locationMarker.visible = false;
        requestRender();
        return;
      }
      const phi = fix.latitude * Math.PI / 180;
      const lambda = fix.longitude * Math.PI / 180;
      locationVector.set(
        Math.cos(phi) * Math.cos(lambda),
        Math.sin(phi),
        -Math.cos(phi) * Math.sin(lambda)
      ).normalize();
      locationHalo.position.copy(locationVector).multiplyScalar(1.006);
      locationDot.position.copy(locationVector).multiplyScalar(1.019);
      locationMarker.visible = true;
      requestRender();
    }
    window.addEventListener("live-earth-location-fix", syncLandPropertiesLocation);
    window.addEventListener("live-earth-location-state", syncLandPropertiesLocation);
    syncLandPropertiesLocation();

    // 04 — Shared globe interaction: surface-anchored drag and pinch zoom.
    // Land owns its gestures. A geographic surface point is picked once
    // on pointer-down; every drag move rotates the globe until that same local
    // point intersects the camera ray beneath the finger.
    gestureController = (() => {
      const raycaster = new T.Raycaster();
      const pointerNdc = new T.Vector2();
      const anchorLocal = new T.Vector3();
      const anchorWorld = new T.Vector3();
      const targetWorld = new T.Vector3();
      const sphere = new T.Sphere(new T.Vector3(0, 0, 0), 1.001);
      const deltaRotation = new T.Quaternion();
      // Match Home/Earth's shared north-south tilt limits. Horizontal heading
      // remains unrestricted; only the globe's vertical tilt is clamped.
      const MIN_GLOBE_TILT = -1.15;
      const MAX_GLOBE_TILT = 1.15;
      const worldXAxis = new T.Vector3(1, 0, 0);
      const localYAxis = new T.Vector3(0, 1, 0);
      const tiltRotation = new T.Quaternion();
      const headingRotation = new T.Quaternion();
      const pointers = new Map();
      let activePointerId = null;
      let pinchStartDistance = 0;
      let pinchStartZoom = 1;
      let hasAnchor = false;

      const isEnabled = () => !disposed && root.isConnected && runtime.isActive(viewId);
      const updatePointerRay = (x, y) => {
        const rect = canvas.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) return false;
        pointerNdc.set(
          ((x - rect.left) / rect.width) * 2 - 1,
          -((y - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(pointerNdc, camera);
        return true;
      };
      const pickSurfacePoint = (x, y, target) => {
        if (!updatePointerRay(x, y)) return false;
        const hits = raycaster.intersectObject(earthGlobe.surface, true);
        if (!hits.length) return false;
        earthGlobe.group.updateMatrixWorld(true);
        target.copy(hits[0].point);
        earthGlobe.group.worldToLocal(target);
        return target.lengthSq() > 0;
      };
      const pointerRayToSphere = (x, y, target) => {
        if (!updatePointerRay(x, y)) return false;
        const hit = raycaster.ray.intersectSphere(sphere, target);
        if (!hit) return false;
        target.normalize();
        return true;
      };
      const clampGlobeTilt = () => {
        const q = earthGlobe.group.quaternion;
        // Decompose using the same q = qX(tilt) * qY(heading) convention
        // used by Earth Engine's standard globe gestures.
        const headingHalf = Math.atan2(q.y, q.w);
        const sinHalfTilt = q.x * Math.cos(headingHalf) + q.z * Math.sin(headingHalf);
        const cosHalfTilt = Math.hypot(q.w, q.y);
        const tilt = 2 * Math.atan2(sinHalfTilt, cosHalfTilt);
        const boundedTilt = Math.max(MIN_GLOBE_TILT, Math.min(MAX_GLOBE_TILT, tilt));
        const heading = 2 * headingHalf;

        // Rebuild without roll so the poles can never turn over, while heading
        // can continue through a complete 360 degrees in either direction.
        tiltRotation.setFromAxisAngle(worldXAxis, boundedTilt);
        headingRotation.setFromAxisAngle(localYAxis, heading);
        q.copy(tiltRotation).multiply(headingRotation).normalize();
      };
      const pointerDistance = () => {
        const values = [...pointers.values()];
        if (values.length < 2) return 0;
        return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
      };
      const setZoom = value => {
        zoomFactor = Math.max(1, Math.min(LAND_PROPERTIES_MAX_ZOOM, value));
        camera.position.z = defaultCameraDistance / zoomFactor;
        camera.lookAt(0, 0, 0);
        requestRender();
      };
      const beginAnchor = pointer => {
        hasAnchor = pickSurfacePoint(pointer.x, pointer.y, anchorLocal);
        activePointerId = hasAnchor ? pointer.id : null;
        return hasAnchor;
      };
      const onPointerDown = event => {
        if (!isEnabled()) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        const startedOnGlobe = pickSurfacePoint(pointer.x, pointer.y, anchorLocal);
        // Ignore touches that begin outside the visible globe. They must not
        // become a drag or a pinch participant, even if they later move over it.
        if (!startedOnGlobe) return;

        pointers.set(event.pointerId, pointer);
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        if (pointers.size === 1) {
          beginAnchor(pointer);
        } else if (pointers.size === 2) {
          // Both pointers are admitted only after independently hitting the
          // globe surface, so pinch zoom cannot start from the surrounding UI.
          hasAnchor = false;
          activePointerId = null;
          pinchStartDistance = Math.max(1, pointerDistance());
          pinchStartZoom = zoomFactor;
        }
        event.preventDefault();
      };
      const onPointerMove = event => {
        if (!isEnabled() || !pointers.has(event.pointerId)) return;
        const pointer = pointers.get(event.pointerId);
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (pointers.size >= 2) {
          const distance = pointerDistance();
          if (pinchStartDistance > 0) setZoom(pinchStartZoom * distance / pinchStartDistance);
          event.preventDefault();
          return;
        }
        if (pointers.size !== 1 || event.pointerId !== activePointerId || !hasAnchor) return;
        if (!pointerRayToSphere(pointer.x, pointer.y, targetWorld)) return;

        earthGlobe.group.updateMatrixWorld(true);
        anchorWorld.copy(anchorLocal).applyQuaternion(earthGlobe.group.quaternion).normalize();
        deltaRotation.setFromUnitVectors(anchorWorld, targetWorld);
        earthGlobe.group.quaternion.premultiply(deltaRotation).normalize();
        clampGlobeTilt();
        earthGlobe.group.updateMatrixWorld(true);
        requestRender();
        event.preventDefault();
      };
      const onPointerUp = event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.delete(event.pointerId);
        try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch (_) {}
        hasAnchor = false;
        activePointerId = null;
        if (pointers.size === 1) {
          const remaining = [...pointers.values()][0];
          beginAnchor(remaining);
        } else if (pointers.size >= 2) {
          pinchStartDistance = Math.max(1, pointerDistance());
          pinchStartZoom = zoomFactor;
        }
      };
      const onPointerCancel = event => onPointerUp(event);
      canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
      canvas.addEventListener("pointermove", onPointerMove, { passive: false });
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerCancel);
      canvas.addEventListener("lostpointercapture", onPointerCancel);
      return {
        dispose() {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerCancel);
          canvas.removeEventListener("lostpointercapture", onPointerCancel);
          pointers.clear();
          hasAnchor = false;
        }
      };
    })();
    resize();
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);
    }
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("orientationchange", resize, { passive: true });

    function attachLayer(id, factory) {
      if (disposed) throw new Error("This world globe has already been disposed.");
      if (typeof id !== "string" || !id.trim() || typeof factory !== "function") throw new TypeError("A layer needs an id and factory.");
      removeLayer(id);
      const cleanup = factory({
        THREE: T,
        scene,
        earth: earthGlobe.surface,
        group: earthGlobe.group,
        camera,
        renderer,
        redraw: requestRender,
        requestRender
      });
      if (typeof cleanup === "function") layers.set(id, cleanup);
      requestRender();
      return () => removeLayer(id);
    }

    function removeLayer(id) {
      const cleanup = layers.get(id);
      if (!cleanup) return false;
      layers.delete(id);
      try { cleanup(); } catch (error) { console.warn(`[LIVE // EARTH] ${viewId} layer cleanup failed:`, error); }
      requestRender();
      return true;
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      resizeObserver?.disconnect(); resizeObserver = null;
      window.removeEventListener("live-earth-location-fix", syncLandPropertiesLocation);
      window.removeEventListener("live-earth-location-state", syncLandPropertiesLocation);
      gestureController?.dispose?.(); gestureController = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      if (locationMarker?.parent) locationMarker.parent.remove(locationMarker);
      locationHalo?.geometry?.dispose?.(); locationHalo?.material?.dispose?.();
      locationDot?.geometry?.dispose?.(); locationDot?.material?.dispose?.();
      locationMarker = null; locationHalo = null; locationDot = null; locationVector = null;
      earthGlobe?.dispose?.(); earthGlobe = null;
      renderer?.dispose?.(); renderer?.forceContextLoss?.(); renderer = null;
      canvas.remove();
      scene = null; camera = null;
      root.classList.remove("le-world-engine-host");
    }

    requestRender();
    return Object.freeze({
      THREE: T,
      scene,
      camera,
      renderer,
      canvas,
      globe: earthGlobe,
      earth: earthGlobe.surface,
      attachLayer,
      removeLayer,
      requestRender,
      dispose
    });
  } catch (error) {
    disposed = true;
    resizeObserver?.disconnect();
    gestureController?.dispose?.();
    earthGlobe?.dispose?.();
    renderer?.dispose?.();
    canvas.remove();
    root.classList.remove("le-world-engine-host");
    throw error;
  }
}

  function formatNumber(value) {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })
      : '—';
  }
  function formatTime(value) {
    if (!value) return 'Time unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Time unavailable'
      : new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeStyle:'short' }).format(date);
  }

  function installResponsivePresentationStyles() {
    if (document.getElementById('le-land-properties-responsive-presentation-style')) return;
    const style = document.createElement('style');
    style.id = 'le-land-properties-responsive-presentation-style';
    style.textContent = `
      /* Compact-width presentation */
      @container (max-width:430px) {
        .le-land-properties-scale-heading { gap:7px; }
        .le-land-properties-legend-title { font-size:clamp(8.5px,2.2cqi,10px); letter-spacing:.025em; }
        .le-land-properties-scale-range { padding-left:8px; font-size:clamp(15px,4cqi,19px); }
        .le-land-properties-instrument-label { margin-bottom:6px; }
      }
      @container (max-width:350px) {
        .le-land-properties-scale-dock { --atmo-action-space:40px; --atmo-track-gap:9px; }
        .le-land-properties-scale-heading { gap:5px; margin-bottom:5px; }
        .le-land-properties-legend-title { font-size:8px; }
        .le-land-properties-scale-range { padding-left:6px; font-size:15px; }
        .le-land-properties-instrument-label { font-size:9px; letter-spacing:.22em; margin-bottom:5px; }
        .le-land-properties-legend-ticks { font-size:8px; }
      }
      @media (max-width:360px) {
        .le-land-properties-dataset-grid { grid-template-columns:1fr; }
      }
      @media (max-height:700px) {
        .le-sfv--land-properties.le-world-engine-host .le-sfv-body { margin-top:clamp(145px,28vh,230px); }
        .le-sfv--land-properties .le-sfv-panel { padding-bottom:calc(env(safe-area-inset-bottom) + 112px); }
      }

      /* Landscape presentation — scale only. Globe, header, orbs and shared
         feature controls retain their existing presentation and behavior. */
      @media (orientation:landscape) {
        .le-land-properties-scene-title { top:3vh; top:3svh; }
        .le-land-properties-scale-dock {
          left:6%; right:auto;
          top:50%; bottom:auto; transform:translateY(-50%);
          width:clamp(126px,12.24vw,151px); max-width:16.2vw;
          display:grid; grid-template-columns:minmax(0,1fr);
          grid-template-rows:auto auto auto auto; column-gap:0; row-gap:8px;
          padding:8px 8px 8px; border:0; border-radius:0; background:transparent;
          box-shadow:none;
          backdrop-filter:none; -webkit-backdrop-filter:none;
          pointer-events:auto;
        }
        .le-land-properties-instrument-label {
          grid-column:1 / -1; grid-row:1;
          width:100%; margin:0 0 1px; font-size:9px; letter-spacing:.18em;
        }
        .le-land-properties-instrument-label::before,.le-land-properties-instrument-label::after { max-width:24px; }

        /* Dataset label is vertical; the live numeric range stays horizontal. */
        .le-land-properties-scale-heading { display:contents; }
        .le-land-properties-legend-title {
          position:absolute; z-index:1;
          left:7px; top:53%;
          grid-column:auto; grid-row:auto;
          align-self:auto; justify-self:auto;
          display:flex; align-items:center; justify-content:center;
          width:18px; max-width:none; overflow:visible;
          writing-mode:vertical-rl; transform:translateY(-50%) rotate(180deg);
          font-size:9px; letter-spacing:.08em; text-align:center;
          text-overflow:clip; white-space:nowrap;
        }
        .le-land-properties-scale-range {
          grid-column:1; grid-row:2;
          display:block; width:100%; min-width:0;
          padding:0; border:0; font-size:clamp(13px,1.45vw,16px);
          line-height:1.1; letter-spacing:-.035em;
          white-space:nowrap; text-align:center;
        }
        .le-land-properties-scale-track-row { display:contents; }
        .le-land-properties-scale-visual {
          grid-column:1; grid-row:3;
          display:grid; grid-template-columns:8px max-content;
          align-items:stretch; column-gap:7px;
          width:max-content; max-width:100%; min-width:0;
          justify-self:center;
        }
        .le-land-properties-scale-track { width:8px; height:clamp(210px,48vh,300px); }
        .le-land-properties-legend-bar {
          width:100%; height:100%; min-height:100%;
          background:var(--land-gradient-vertical)!important;
          border-radius:999px;
        }
        .le-land-properties-legend-graduations span {
          left:50%; top:var(--atmo-graduation-position);
          width:14px; height:1px;
          transform:translate(-50%,-50%);
        }
        .le-land-properties-legend-ticks {
          position:relative; width:max-content; height:auto; min-height:clamp(210px,48vh,300px);
          margin:0; font-size:clamp(8px,.85vw,10px); line-height:1;
        }
        .le-land-properties-legend-ticks span {
          top:var(--atmo-tick-position); left:0!important;
          transform:translateY(-50%); text-align:left; white-space:nowrap;
        }
        .le-land-properties-legend-ticks span::before {
          left:-7px; top:50%; width:4px; height:1px;
          transform:translateY(-50%);
        }
        .le-land-properties-legend-ticks span:first-child { transform:translateY(-50%); }
        .le-land-properties-legend-ticks span:last-child { transform:translateY(-50%); text-align:left; }
        .le-land-properties-scale-more {
          grid-column:1; grid-row:4;
          width:34px; height:34px; justify-self:center; align-self:center;
          margin:1px 0 0;
        }

        /* The + control opens provenance in a right-side drawer, not above
           the scale, so the drawer stays inside the Landscape viewport. */
        .le-land-properties-scale-dock .le-land-properties-data-card {
          left:calc(100% + 14px); right:auto;
          top:50%; bottom:auto; transform:translateY(-50%);
          width:min(42vw,620px);
          max-width:calc(80vw - 200px);
          max-height:85svh; overflow:auto;
          border-radius:16px;
        }
      }
    
    `;
    document.head.appendChild(style);
  }

function activateView() {
    installHudStyle();
    installResponsivePresentationStyles();
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};
    view.root.querySelector('.le-sfv-head')?.remove();
    view.root.querySelector('.le-sfv-pill')?.remove();
    document.body.classList.add('le-land-properties-fullscreen-open');

    const status = runtime.el('p', 'le-sfv-status', '');
    status.dataset.state = 'neutral';
    status.hidden = true;
    const showStatus = (message, state = 'neutral') => {
      status.hidden = false;
      if (!status.isConnected) view.body.appendChild(status);
      runtime.setStatus(status, message, state);
    };
    const clearStatus = () => {
      status.remove();
      status.hidden = true;
    };

    // Match the compact Atmosphere/Oceans settings orb and ten-dataset menu.
    const hudToggle = runtime.el('button', 'le-land-properties-hud-toggle');
    hudToggle.type = 'button';
    const hudIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    hudIcon.setAttribute('viewBox', '0 0 24 24');
    hudIcon.setAttribute('aria-hidden', 'true');
    hudIcon.classList.add('le-land-properties-hud-toggle-icon');
    hudIcon.innerHTML = '<path d="M4 7h7m4 0h5M4 17h3m4 0h9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="13" cy="7" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="17" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/>';
    hudToggle.append(hudIcon);

    const datasetOrbMenu = runtime.el('div', 'le-land-properties-dataset-orb-menu');
    datasetOrbMenu.id = 'le-land-properties-dataset-orb-menu';
    datasetOrbMenu.setAttribute('role', 'group');
    datasetOrbMenu.setAttribute('aria-label', 'Land Properties datasets');
    hudToggle.setAttribute('aria-controls', datasetOrbMenu.id);
    hudToggle.setAttribute('aria-expanded', 'false');
    hudToggle.setAttribute('aria-haspopup', 'true');
    hudToggle.setAttribute('aria-label', 'Open Land Properties datasets');
    hudToggle.addEventListener('click', () => {
      const open = datasetOrbMenu.classList.toggle('is-open');
      hudToggle.setAttribute('aria-expanded', String(open));
      hudToggle.setAttribute('aria-label', open ? 'Close Land Properties datasets' : 'Open Land Properties datasets');
    });
    view.root.appendChild(hudToggle);

    // The Land Properties information instrument mirrors the Atmosphere/Oceans numerical
    // grid summary. The globe itself displays the source grid through the GPU skin.
    const details = runtime.card('Land Properties', 'Soil profile properties and source-grid provenance.');
    details.classList.add('le-land-properties-data-card');
    details.hidden = true;
    const summaryRange = runtime.el('div', 'le-land-properties-summary-range', '—');
    const summaryTitle = runtime.el('div', 'le-land-properties-summary-title', 'Land Properties · global value range');
    const summaryHeading = runtime.el('div', 'le-land-properties-scale-heading');
    summaryHeading.append(summaryTitle, summaryRange);
    const scaleDock = runtime.el('section', 'le-land-properties-scale-dock');
    scaleDock.setAttribute('aria-label', 'Land Properties numerical grid summary');
    scaleDock.hidden = true;
    const instrumentLabel = runtime.el('div', 'le-land-properties-instrument-label');
    instrumentLabel.appendChild(runtime.el('span', 'le-land-properties-instrument-name', 'LAND PROPERTIES'));
    const legendTitle = runtime.el('span','le-land-properties-legend-title','Soil property data');
    const legendRange = runtime.el('span','le-land-properties-scale-range','—');
    summaryHeading.replaceChildren(legendTitle,legendRange);
    const scaleVisual = runtime.el('div','le-land-properties-scale-visual');
    const scaleTrack = runtime.el('div','le-land-properties-scale-track');
    const legendBar = runtime.el('div','le-land-properties-legend-bar');
    legendBar.setAttribute('role','img');
    legendBar.setAttribute('aria-label','Land Properties dataset colour gradient');
    const legendGraduations = runtime.el('div','le-land-properties-legend-graduations');
    legendBar.appendChild(legendGraduations);
    scaleTrack.appendChild(legendBar);
    const legendTicks = runtime.el('div','le-land-properties-legend-ticks');
    scaleVisual.append(scaleTrack,legendTicks);
    scaleDock.append(details, instrumentLabel, summaryHeading);

    const summaryTrackRow = runtime.el('div', 'le-land-properties-scale-track-row');
    const gridCount = runtime.el('div', 'le-land-properties-grid-count');
    const gridCountLabel = runtime.el('span', 'le-land-properties-grid-count-label', 'Global grid · loading');
    gridCount.appendChild(gridCountLabel);
    const scaleMore = runtime.el('button', 'le-land-properties-scale-more', '+');
    scaleMore.type = 'button';
    scaleMore.setAttribute('aria-label', 'Show Land Properties grid details and provenance');
    scaleMore.setAttribute('aria-controls', 'le-land-properties-data-details');
    scaleMore.setAttribute('aria-expanded', 'false');
    summaryTrackRow.append(scaleVisual, scaleMore);
    scaleDock.appendChild(summaryTrackRow);
    scaleDock.appendChild(gridCount);
    view.root.appendChild(scaleDock);

    const gridNote = runtime.el('div', 'le-land-properties-grid-note');
    const disclosure = runtime.el('details', 'le-land-properties-details');
    disclosure.id = 'le-land-properties-data-details';
    disclosure.appendChild(runtime.el('summary', '', 'Data details & provenance'));
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    disclosure.appendChild(metric);
    const provenance = runtime.el('p', 'le-land-properties-provenance-note', '');
    details.append(gridNote, disclosure, provenance);

    const syncScaleMore = () => {
      const expanded = disclosure.open;
      scaleMore.textContent = expanded ? '−' : '+';
      scaleMore.setAttribute('aria-expanded', String(expanded));
      scaleMore.setAttribute('aria-label', expanded ? 'Collapse Land Properties grid details and provenance' : 'Expand Land Properties observations and provenance');
      view.root.classList.toggle('le-land-properties-details-expanded', expanded);
    };
    scaleMore.addEventListener('click', () => {
      disclosure.open = !disclosure.open;
      syncScaleMore();
    });
    disclosure.addEventListener('toggle', syncScaleMore);

    const datasetOrbButtons = new Map();
    let selectedDataset = null;
    let activeDepthId = '0-5';
    let activeDepthLabel = '0–5 cm';
    let currentDatasetCategory = '';
    for (const item of DATASET_OPTIONS) {
      if (item.category !== currentDatasetCategory) {
        currentDatasetCategory = item.category;
        datasetOrbMenu.appendChild(runtime.el('div', 'le-land-properties-category', currentDatasetCategory));
      }
      const orb = runtime.el('button', 'le-land-properties-dataset-orb');
      orb.type = 'button';
      orb.dataset.dataset = item.id;
      orb.setAttribute('aria-label', item.label);
      orb.setAttribute('aria-pressed', 'false');
      orb.title = `${item.label} · SoilGrids adapter not connected`; 
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('le-land-properties-dataset-orb-icon');
      icon.style.color = item.color;
      icon.innerHTML = ICONS[item.icon];
      orb.appendChild(icon);
      orb.addEventListener('click', () => selectDataset(item));
      datasetOrbMenu.appendChild(orb);
      datasetOrbButtons.set(item.id, orb);
    }
    view.root.appendChild(datasetOrbMenu);

    const depthOptions = [
      { id:'0-5', label:'0–5 cm', short:'0–5' },
      { id:'5-15', label:'5–15 cm', short:'5–15' },
      { id:'15-30', label:'15–30 cm', short:'15–30' },
      { id:'30-60', label:'30–60 cm', short:'30–60' },
      { id:'60-100', label:'60–100 cm', short:'60–100' },
      { id:'100-200', label:'100–200 cm', short:'100–200' }
    ];
    const depthSelector = runtime.el('div', 'le-land-properties-depth-selector');
    depthSelector.setAttribute('role', 'group');
    depthSelector.setAttribute('aria-label', 'Soil profile depth');
    depthSelector.appendChild(runtime.el('span', 'le-land-properties-depth-label', 'Depth'));
    const depthButtons = new Map();
    for (const depth of depthOptions) {
      const button = runtime.el('button', 'le-land-properties-depth-option', depth.short);
      button.type = 'button';
      button.title = depth.label;
      button.setAttribute('aria-label', `Select soil depth ${depth.label}`);
      button.setAttribute('aria-pressed', String(depth.id === activeDepthId));
      button.classList.toggle('is-selected', depth.id === activeDepthId);
      button.addEventListener('click', () => setActiveDepth(depth));
      depthSelector.appendChild(button);
      depthButtons.set(depth.id, button);
    }
    view.root.appendChild(depthSelector);

    let closed = false;
    let layerDispose = null;
    let worldGlobe = null;
    let dataRequest = null;
    let engineReady = null;

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        if (datasetOrbMenu.classList.contains('is-open')) {
          datasetOrbMenu.classList.remove('is-open');
          hudToggle.setAttribute('aria-expanded', 'false');
          hudToggle.setAttribute('aria-label', 'Open Land Properties datasets');
        } else if (disclosure.open) {
          disclosure.open = false;
          syncScaleMore();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    function setSelectedDataset(id) {
      selectedDataset = id;
      if (id) {
        view.root.dataset.landPropertiesDataset = id;
        view.root.dataset.landPropertiesDepth = activeDepthId;
      } else {
        delete view.root.dataset.landPropertiesDataset;
        delete view.root.dataset.landPropertiesDepth;
      }
      for (const [key, orb] of datasetOrbButtons) {
        const active = key === id;
        orb.classList.toggle('is-selected', active);
        orb.setAttribute('aria-pressed', String(active));
      }
    }

    function setActiveDepth(depth) {
      activeDepthId = depth.id;
      activeDepthLabel = depth.label;
      view.root.dataset.landPropertiesDepth = depth.id;
      for (const [key, button] of depthButtons) {
        const active = key === depth.id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
      if (selectedDataset) {
        const item = DATASET_OPTIONS.find(option => option.id === selectedDataset);
        if (item) showStatus(`${item.label} · ${activeDepthLabel}. This depth is selected; its verified SoilGrids layer is not connected yet.`, 'neutral');
      }
    }

    function removeActiveLayer() {
      if (typeof layerDispose === 'function') {
        const dispose = layerDispose;
        layerDispose = null;
        try { dispose(); } catch (error) { console.warn('[LIVE // EARTH] Land Properties grid layer detach failed.', error); }
      }
      delete view.root.dataset.landPropertiesObservations;
      delete view.root.dataset.landPropertiesGrid;
      delete view.root.dataset.gridRenderingSkin;
      delete view.root.dataset.gridData;
    }

    function makeMetric(labelText, value, unit = '') {
      const item = runtime.el('div', 'le-sfv-metric');
      item.appendChild(runtime.el('span', 'le-sfv-metric-label', labelText));
      const valueNode = runtime.el('strong', 'le-sfv-metric-value', value);
      if (unit) valueNode.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
      item.appendChild(valueNode);
      metric.appendChild(item);
    }

    function formatFieldValue(value) {
      if (!Number.isFinite(value)) return '—';
      return value.toLocaleString(undefined, { maximumFractionDigits: Math.abs(value) >= 100 ? 1 : 2, minimumFractionDigits: 0 });
    }

    function formatGridResolution(value) {
      if (!Number.isFinite(value)) return '—';
      return value < 0.01 ? value.toFixed(5) : formatNumber(value);
    }

    function formatPaletteStops(colors) {
      return colors.map((hex, index) => {
        const value = Number.parseInt(hex.slice(1), 16);
        return [index / Math.max(1, colors.length - 1), ((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
      });
    }

    function validateDatasetGrid(metadata, grid, config) {
      if (metadata.dataset_id !== config.datasetId) throw new Error('Dataset identity does not match the Land Properties registry.');
      if (metadata.data_kind !== 'grid' || metadata.value_file !== 'values.bin') throw new Error('The selected Land Properties layer is not stored as a numerical grid.');
      const sourceMatches = config.gridId
        ? metadata.grid_id === config.gridId
        : metadata.source_id === config.sourceId;
      if (!sourceMatches || metadata.units !== config.units) throw new Error('Land Properties grid source or units do not match the registered dataset.');
      if (!grid?.definition || !grid?.values || grid.values.length !== grid.definition.width * grid.definition.height) throw new Error('The decoded Land Properties grid does not match its declared dimensions.');
      if (!(grid.validCount > 0) || !Number.isFinite(grid.min) || !Number.isFinite(grid.max) || grid.max < grid.min) throw new Error('The verified Land Properties grid contains no valid numeric cells.');
      if (metadata.sha256_uncompressed_values !== undefined && !/^[a-f0-9]{64}$/i.test(metadata.sha256_uncompressed_values)) throw new Error('Land Properties grid metadata has an invalid decoded-value checksum.');
    }

    function attachGridLayer(grid, config) {
      if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe is not ready.');
      let handle = null;
      let root = null;
      layerDispose = worldGlobe.attachLayer(`land-properties-${config.id}-grid`, ({ THREE, earth }) => {
        if (!THREE?.Group || !earth?.add) throw new Error('The Earth Engine did not provide its Three.js globe surface.');
        root = new THREE.Group();
        root.name = `liveEarth-land-properties-${config.id}-grid-layer`;
        handle = window.LiveEarthGpuGridSkin.create({
          THREE,
          grid,
          radius: 1.009,
          opacity: 0.88,
          contourInterval: 0,
          contourStrength: 0.14,
          contourColor: [0.18,0.13,0.10],
          min: grid.min,
          max: grid.max,
          colorStops: formatPaletteStops(config.palette || LAND_PROPERTIES_PALETTES[config.id] || DEFAULT_SOIL_PALETTE),
          name: `LAND-PROPERTIES-${config.id.toUpperCase()}-GRID`
        });
        root.add(handle.mesh);
        earth.add(root);
        return () => {
          try { handle?.dispose?.(); } catch (_) {}
          handle = null;
          try { root?.removeFromParent?.(); } catch (_) {}
          root = null;
        };
      });
      if (typeof layerDispose !== 'function') throw new Error('The Land numerical grid layer could not attach.');
      view.root.dataset.landPropertiesGrid = `verified-${config.id}-global-grid`;
      view.root.dataset.gridRenderingSkin = 'gpu-ready';
      view.root.dataset.gridData = `central-database-${config.id}`;
      worldGlobe.requestRender?.();
    }

    async function selectDataset(item) {
      if (closed || !runtime.isActive(WORLD.id)) return;
      datasetOrbMenu.classList.remove('is-open');
      hudToggle.setAttribute('aria-expanded', 'false');
      hudToggle.setAttribute('aria-label', 'Open Land Properties datasets');

      const config = LAND_PROPERTIES_DATASETS[item.id];
      if (!config) {
        dataRequest?.abort();
        dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(item.id);
        details.hidden = true;
        scaleDock.hidden = true;
        disclosure.open = false;
        syncScaleMore();
        showStatus(`${item.label} · ${activeDepthLabel}. Its verified SoilGrids global grid is not connected yet; the Earth globe remains interactive.`, 'neutral');
        worldGlobe?.requestRender?.();
        return;
      }

      if (selectedDataset === item.id && layerDispose) {
        dataRequest?.abort();
        dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(null);
        details.hidden = true;
        scaleDock.hidden = true;
        disclosure.open = false;
        syncScaleMore();
        clearStatus();
        worldGlobe?.requestRender?.();
        return;
      }

      dataRequest?.abort();
      dataRequest = null;
      removeActiveLayer();
      scaleDock.hidden = true;
      details.hidden = true;
      disclosure.open = false;
      syncScaleMore();
      setSelectedDataset(item.id);
      summaryTitle.textContent = `${config.label} · global grid range`;
      const controller = new AbortController();
      dataRequest = controller;
      const button = datasetOrbButtons.get(item.id);
      if (button) button.disabled = true;
      showStatus(`Loading and verifying the ${config.sourceLabel} grid…`, 'neutral');

      try {
        await loadSharedGridTools();
        if (engineReady) await engineReady;
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        const base = `${VALUES_BASE_URL}${config.datasetId}/`;
        const metadataResponse = await fetch(`${base}metadata.json`, { cache:'no-store', signal:controller.signal });
        if (!metadataResponse.ok) throw new Error(`Stored Land Properties grid metadata request failed (${metadataResponse.status}).`);
        const metadata = await metadataResponse.json();
        const grid = await window.LiveEarthUniversalGridSystem.loadCurrentGrid({
          baseUrl: VALUES_BASE_URL,
          datasetId: config.datasetId,
          signal: controller.signal
        });
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        validateDatasetGrid(metadata, grid, config);

        const width = grid.definition.width;
        const height = grid.definition.height;
        const totalCells = width * height;
        const updated = metadata.updated_at_utc || grid.retrievedAt;
        const observed = grid.observedAt || metadata.observed_at_utc || metadata.valid_time_utc || metadata.source_observation_period;
        const gridStep = Math.max(Math.abs(grid.definition.latStep), Math.abs(grid.definition.lonStep));
        const nativeResolution = metadata.native_grid_spacing_degrees ?? gridStep;
        const displayResolution = metadata.grid_resolution_degrees ?? gridStep;
        const rangeMin = formatFieldValue(grid.min);
        const rangeMax = formatFieldValue(grid.max);
        const unit = config.displayUnit || grid.units;

        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        attachGridLayer(grid, config);
        buildGridSummary(gridNote, metadata, config, grid);
        details.querySelector('h2').textContent = config.label;
        const subtitle = details.querySelector('p');
        if (subtitle) subtitle.textContent = `${metadata.source_name || metadata.product || config.sourceLabel} · ${width.toLocaleString()} × ${height.toLocaleString()} global grid`;
        summaryRange.textContent = `${rangeMin}–${rangeMax} ${unit}`;
        legendRange.textContent = `${rangeMin} — ${rangeMax} ${unit}`;
        legendTitle.textContent = `${config.label} · ${unit}`;
        const palette = config.palette || LAND_PROPERTIES_PALETTES[config.id] || DEFAULT_SOIL_PALETTE;
        const gradient = `linear-gradient(90deg,${palette.map((c,i,a)=>`${c} ${i/(a.length-1)*100}%`).join(',')})`;
        legendBar.style.background = gradient;
        legendBar.style.setProperty('--land-gradient-vertical',gradient.replace('90deg','0deg'));
        legendTicks.replaceChildren();
        legendGraduations.replaceChildren();
        const legendMin = grid.min;
        const legendMax = grid.max;
        for(let i=0;i<5;i++){
          const fraction=i/4, value=legendMin+(legendMax-legendMin)*fraction, position=fraction*100;
          const tick=runtime.el('span','',formatFieldValue(value));
          tick.style.left=`${position}%`;
          tick.style.setProperty('--atmo-tick-position',`${100-position}%`);
          legendTicks.appendChild(tick);
          if(i>0 && i<4){
            const mark=runtime.el('span');
            mark.style.setProperty('--atmo-graduation-position',`${position}%`);
            legendGraduations.appendChild(mark);
          }
        }
        gridCountLabel.textContent = `${grid.validCount.toLocaleString()} valid grid cells`;
        details.hidden = false;
        scaleDock.hidden = false;
        metric.replaceChildren();
        makeMetric('Grid dimensions', `${width.toLocaleString()} × ${height.toLocaleString()}`, 'cells');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), `of ${totalCells.toLocaleString()}`);
        if (Number.isFinite(displayResolution)) makeMetric('Display grid spacing', `${formatGridResolution(displayResolution)}°`);
        if (Number.isFinite(nativeResolution)) makeMetric('Native source spacing', `${formatGridResolution(nativeResolution)}°`);
        makeMetric('Observed / valid time', formatTime(observed));
        makeMetric('Current values updated', formatTime(updated));
        makeMetric('Grid value range', `${rangeMin} to ${rangeMax} ${unit}`);
        makeMetric('Source', metadata.source_name || metadata.product || config.sourceLabel);
        const sourceUrl = metadata.source_url || metadata.source_urls?.[0];
        const notes = [
          metadata.source_observation_period ? `Source period: ${metadata.source_observation_period}.` : '',
          metadata.aggregation_method ? `Grid processing: ${metadata.aggregation_method}` : '',
          metadata.interpretation_note || metadata.note || config.note,
          (metadata.attribution || metadata.source_attribution) ? `Attribution: ${metadata.attribution || metadata.source_attribution}.` : ''
        ].filter(Boolean).join(' ');
        provenance.replaceChildren();
        provenance.appendChild(document.createTextNode(
          `Observed ${formatTime(observed)}. Updated ${formatTime(updated)}. ${notes} Source: ${metadata.source_name || metadata.product || config.sourceLabel}. `
        ));
        if (typeof sourceUrl === 'string') {
          try {
            const url = new URL(sourceUrl);
            const allowedHosts = ['power.larc.nasa.gov','www.ncei.noaa.gov','storage.googleapis.com','nomads.ncep.noaa.gov'];
            if (url.protocol === 'https:' && allowedHosts.includes(url.hostname)) {
              const link = runtime.el('a', '', 'Open source data');
              link.href = url.href;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.style.color = '#8edcff';
              provenance.appendChild(link);
            }
          } catch (_) {}
        }
        view.root.dataset.landPropertiesDataset = config.datasetId;
        clearStatus();
        worldGlobe?.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(WORLD.id)) {
          removeActiveLayer();
          setSelectedDataset(null);
          details.hidden = true;
          scaleDock.hidden = true;
          showStatus(`${config.label} grid could not be displayed. The base Earth globe remains active. ${error?.message || ''}`, 'error');
        }
      } finally {
        if (dataRequest === controller) {
          dataRequest = null;
          if (button) button.disabled = false;
        }
      }
    }

    function buildGridSummary(host, metadata, config, grid) {
      const width = grid.definition.width;
      const height = grid.definition.height;
      const resolution = metadata.grid_resolution_degrees ?? Math.max(Math.abs(grid.definition.latStep), Math.abs(grid.definition.lonStep));
      const resolutionLabel = Number.isFinite(resolution) ? `${formatGridResolution(resolution)}° grid spacing` : 'source grid spacing';
      const coverage = metadata.coverage_note || 'Global gridded source field';
      host.textContent = `${coverage} · ${width.toLocaleString()} × ${height.toLocaleString()} cells · ${resolutionLabel} · ${grid.validCount.toLocaleString()} valid cells`;
    }


    const cleanup = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('le-land-properties-fullscreen-open');
      dataRequest?.abort();
      dataRequest = null;
      hudToggle.remove();
      datasetOrbMenu.remove();
      depthSelector.remove();
      scaleDock.remove();
      status.remove();
      removeActiveLayer();
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Land Properties Engine globe cleanup failed.', error); }
      worldGlobe = null;
      delete view.root.dataset.landPropertiesDataset;
      delete view.root.dataset.landPropertiesDepth;
      delete view.root.dataset.landPropertiesObservations;
      delete view.root.dataset.landPropertiesGrid;
      delete view.root.dataset.globeEngine;
      view.root.classList.remove('le-land-properties-details-expanded');
    };

    // Start the base globe immediately. Dataset requests remain user initiated.
    engineReady = (async () => {
      try {
        const globe = await initializeEngineView(view, WORLD.id);
        if (closed || !runtime.isActive(WORLD.id)) {
          globe?.dispose?.();
          return null;
        }
        if (!globe || typeof globe.attachLayer !== 'function') throw new Error('The Earth Engine globe could not be created.');
        worldGlobe = globe;
        view.root.dataset.globeEngine = 'ready';
        globe.requestRender?.();
        return globe;
      } catch (error) {
        if (!closed && runtime.isActive(WORLD.id)) showStatus(`The Earth Engine globe could not open. ${error?.message || ''}`, 'error');
        throw error;
      }
    })();
    engineReady.catch(() => {});

    return cleanup;
  }

  if (runtime.registerFeature(WORLD.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready', { detail:{ id:WORLD.id } }));
  }
})();
