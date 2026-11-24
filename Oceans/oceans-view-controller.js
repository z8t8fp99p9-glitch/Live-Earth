/* LIVE // EARTH — Oceans View Controller.
   Uses the shared Earth Engine globe, Universal Grid System and GPU Grid Skin.
   Oceans owns ten registered dataset controls; configured fields load only
   verified current values from the Universal Central Database.
*/
(() => {
  'use strict';
  const flag = '__liveEarthOceansViewControllerInstalled';
  if (window[flag]) return;

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Oceans controller is waiting for the feature-view runtime.');
    return;
  }

  const WORLD = {
    id: 'oceans',
    title: 'Oceans',
    symbol: '≈',
    message: 'Select an available ocean field to load its verified current grid from the shared Earth data system.'
  };
  const VALUES_BASE_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/values/';

  function installHudStyle() {
    if (document.getElementById('le-oceans-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-oceans-cinematic-hud';
    style.textContent = `
      /* Atmosphere observatory: cinematic globe, quiet controls, precise data instrument. */
      .le-sfv--oceans .le-sfv-panel {
        display:flex; flex-direction:column; align-items:stretch;
        overflow:hidden; background:transparent!important;
        backdrop-filter:none!important; -webkit-backdrop-filter:none!important;
        padding:calc(env(safe-area-inset-top) + clamp(66px,9vmin,82px))
          clamp(15px,4vw,32px) 0;
      }
      .le-sfv--oceans .le-sfv-head { margin-bottom:9px; }
      /* The title is a permanent scene layer: the WebGL globe renders above it. */
      .le-ocean-scene-title {
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
      .le-ocean-scene-title::before,.le-ocean-scene-title::after {
        content:""; height:1px; flex:1 1 0; min-width:12px;
        background:linear-gradient(90deg,transparent,rgba(148,190,215,.46));
      }
      .le-ocean-scene-title::after { background:linear-gradient(90deg,rgba(148,190,215,.46),transparent); }
      .le-ocean-scene-title span {
        font:500 clamp(12px,3.25vmin,17px)/1.2 system-ui,-apple-system,sans-serif;
        letter-spacing:clamp(.24em,1.15vmin,.38em); white-space:nowrap;
        text-shadow:0 0 14px rgba(122,190,226,.20);
      }
      .le-ocean-scene-title i {
        position:absolute; left:16%; right:16%; top:calc(100% + 13px); height:1px;
        background:linear-gradient(90deg,transparent,rgba(50,155,232,.30) 28%,rgba(69,190,255,.9) 50%,rgba(50,155,232,.30) 72%,transparent);
        box-shadow:0 0 8px rgba(30,151,255,.45); font-style:normal;
      }
      .le-ocean-scene-title i::after {
        content:""; position:absolute; left:50%; top:50%; width:5px; height:5px; border-radius:50%;
        transform:translate(-50%,-50%); background:#a8eaff; box-shadow:0 0 6px 2px #168fff,0 0 15px 5px rgba(20,133,255,.55);
      }
      .le-ocean-hud-toggle {
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
      .le-ocean-hud-toggle:active { transform:scale(.94); }
      .le-ocean-hud-toggle:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-ocean-hud-toggle-icon { width:19px; height:19px; flex:none; color:#a6e5ff; }
      .le-ocean-hud-toggle[aria-expanded="true"] {
        border-color:rgba(111,218,255,.78);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 22px rgba(55,190,245,.25),0 5px 18px rgba(0,0,0,.28);
      }
      .le-ocean-dataset-orb-menu {
        position:absolute; z-index:6;
        top:calc(env(safe-area-inset-top) + 72px);
        right:max(14px,env(safe-area-inset-right));
        display:flex; flex-direction:column; align-items:center; gap:9px;
        opacity:0; visibility:hidden; pointer-events:none;
        transform:translateY(-7px) scale(.96);
        transform-origin:top center;
        transition:opacity .2s ease,transform .2s ease,visibility .2s ease;
      }
      .le-ocean-dataset-orb-menu.is-open {
        opacity:1; visibility:visible; pointer-events:auto;
        transform:translateY(0) scale(1);
      }
      /* Portrait: place the floating dataset control below the centered header.
         The menu follows the button so it opens directly beneath it on every screen size. */
      @media (orientation:portrait) {
        .le-ocean-hud-toggle { top:15svh; }
        .le-ocean-dataset-orb-menu {
          top:calc(15svh + clamp(46px,6vmin,52px) + 10px);
        }
      }
      /* Landscape: keep the dataset control lower and slightly inset from the edge. */
      @media (orientation:landscape) {
        .le-ocean-hud-toggle { top:8svh; right:8vw; }
        .le-ocean-dataset-orb-menu {
          top:calc(8svh + clamp(46px,6vmin,52px) + 10px);
          right:8vw;
        }
      }
      .le-ocean-dataset-orb {
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
      .le-ocean-dataset-orb:active { transform:scale(.92); }
      .le-ocean-dataset-orb:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-ocean-dataset-orb.is-selected {
        border-color:rgba(112,225,210,.9);
        box-shadow:inset 0 0 0 1px rgba(112,225,210,.22),0 0 19px rgba(72,220,196,.28),0 4px 13px rgba(0,0,0,.28);
        background:linear-gradient(155deg,rgba(15,65,72,.96),rgba(3,18,31,.98));
      }
      .le-ocean-dataset-orb:disabled { opacity:.48; cursor:progress; }
      .le-ocean-dataset-orb-icon { width:21px; height:21px; display:block; }
      .le-sfv--oceans .le-sfv-panel.le-ocean-hud-hidden {
        opacity:0; visibility:hidden; pointer-events:none;
        transition:opacity .2s ease,visibility .2s ease;
      }
      .le-sfv--oceans .le-sfv-panel { transition:opacity .2s ease,visibility .2s ease; }
      .le-sfv--oceans.le-world-engine-host .le-world-engine-canvas { z-index:2; }
      .le-sfv--oceans.le-world-engine-host .le-sfv-panel { z-index:3; }
      .le-sfv--oceans .le-sfv-pill { margin-bottom:10px; }

      .le-sfv--oceans.le-world-engine-host .le-sfv-body {
        display:block; box-sizing:border-box; width:min(100%,680px);
        margin:auto auto 0; min-height:0; max-height:min(48dvh,540px);
        overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        padding-bottom:calc(env(safe-area-inset-bottom) + 144px);
        scrollbar-width:none;
      }
      .le-sfv--oceans.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      /* Empty feature-body space must pass gestures through to the globe.
         Restore pointer handling only on actual content and controls. */
      .le-sfv--oceans.le-world-engine-host .le-sfv-body {
        pointer-events:none;
      }
      .le-sfv--oceans.le-world-engine-host .le-sfv-body > *,
      .le-sfv--oceans.le-world-engine-host .le-sfv-body :is(
        button, a, input, select, textarea, summary, [role="button"],
        .le-ocean-details, .le-ocean-scale-dock, .le-ocean-data-card
      ) {
        pointer-events:auto;
      }
      .le-sfv--oceans .le-sfv-status {
        display:inline-block; width:auto; max-width:100%; margin:0 0 9px;
        padding:7px 11px; border-radius:999px; font-size:9px; line-height:1.35;
        background:rgba(3,13,24,.54); border-color:rgba(126,228,189,.22);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      }
      .le-sfv--oceans .le-sfv-card {
        padding:13px 15px; border-radius:17px;
        border-color:rgba(159,211,249,.19);
        background:linear-gradient(145deg,rgba(8,23,40,.80),rgba(3,10,20,.78));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.22);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      }
      .le-sfv--oceans .le-sfv-card h2 {
        margin:0 0 4px; font-size:10px; letter-spacing:.12em;
        color:#a9c9de; text-transform:uppercase;
      }
      .le-ocean-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-ocean-range strong { color:#f2fbff; font-size:clamp(23px,6vw,31px); letter-spacing:-.035em; font-weight:760; }
      .le-ocean-range span { color:#a9c6d8; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }

      /* The scale is a floating instrument, not a card. Its text and spectrum share one track. */
      .le-ocean-scale-dock {
        container-type:inline-size;
        --ocean-action-space:42px;
        --ocean-track-gap:12px;
        --ocean-content-width:calc(100% - var(--ocean-action-space) - var(--ocean-track-gap));
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
      .le-ocean-scale-dock > .le-ocean-data-card { pointer-events:auto; }
      .le-ocean-scale-dock[hidden] { display:none!important; }
      /* Provenance opens as a separate panel anchored above the scale.
         It is removed from layout flow, so the scale deck never moves,
         grows, or changes its position when the panel is opened. */
      .le-ocean-scale-dock .le-ocean-data-card {
        display:none!important;
        position:absolute; left:0; right:0;
        bottom:calc(100% + clamp(10px,1.6svh,18px));
        width:100%; max-height:min(52svh,560px);
        box-sizing:border-box; margin:0;
        overflow:auto; overscroll-behavior:contain;
        pointer-events:auto; z-index:6;
      }
      .le-sfv--oceans.le-ocean-details-expanded .le-ocean-scale-dock .le-ocean-data-card {
        display:block!important;
      }
      .le-ocean-scale-dock .le-sfv-attribution { margin:8px 2px 0; }
      .le-ocean-scale-dock .le-ocean-details { pointer-events:auto; }

      .le-ocean-instrument-label {
        display:flex; align-items:center; justify-content:center; gap:7px;
        width:100%; margin:0 0 6px;
        color:#b7dff4; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:10px; font-weight:650; letter-spacing:.28em;
        line-height:1; text-align:center; text-transform:uppercase;
        text-shadow:0 0 16px rgba(65,176,235,.20);
      }
      .le-ocean-instrument-label::before,
      .le-ocean-instrument-label::after {
        content:""; display:block; flex:1 1 0; max-width:88px; height:1px;
        background:linear-gradient(90deg,transparent,rgba(104,190,231,.46));
      }
      .le-ocean-instrument-label::after {
        background:linear-gradient(90deg,rgba(104,190,231,.46),transparent);
      }
      .le-ocean-scale-heading {
        display:flex; flex-flow:row nowrap; justify-content:flex-start;
        align-items:center; gap:8px;
        width:var(--ocean-content-width); min-width:0;
        margin:0 0 5px; white-space:nowrap; line-height:1;
        text-align:left;
      }
      .le-ocean-legend-title {
        display:block; flex:0 1 auto; min-width:0; overflow:hidden; margin:0;
        padding:0; color:#c6ddeb;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,2.25cqi,11px); font-weight:620;
        letter-spacing:.055em; text-align:left;
        text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap;
      }
      .le-ocean-scale-range {
        display:block; flex:0 0 auto; min-width:0; margin:0;
        padding:0 0 0 8px; border-left:1px solid rgba(137,200,228,.56);
        color:#f7fbff;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(16px,4.1cqi,22px); font-weight:560;
        letter-spacing:-.025em; font-variant-numeric:tabular-nums;
        white-space:nowrap; text-align:left;
      }
      .le-ocean-scale-track-row {
        display:grid; grid-template-columns:minmax(0,1fr) var(--ocean-action-space);
        align-items:center; column-gap:var(--ocean-track-gap); min-width:0;
        --ocean-gradient-height:8px;
      }
      .le-ocean-scale-visual { min-width:0; width:100%; }
      .le-ocean-scale-track { min-width:0; width:100%; }
      .le-ocean-scale-more {
        position:relative; flex:none; display:grid; place-items:center;
        width:var(--ocean-action-space); height:var(--ocean-action-space);
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
        .le-ocean-scale-track-row { align-items:start; }
        .le-ocean-scale-more {
          align-self:start; justify-self:center;
          margin-top:calc((var(--ocean-gradient-height) - var(--ocean-action-space)) / 2);
        }
      }
      .le-ocean-scale-more:hover {
        border-color:rgba(150,232,255,.95);
        background:radial-gradient(circle at 35% 27%,rgba(78,190,229,.30),rgba(3,19,32,.82) 72%);
        box-shadow:0 0 16px rgba(49,177,228,.30);
      }
      .le-ocean-scale-more:active { transform:scale(.94); }
      .le-ocean-scale-more:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-ocean-legend-bar {
        width:100%; height:8px; border-radius:999px;
        background:linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.30),0 0 9px rgba(68,159,222,.24);
      }
      /* Three true internal graduations are drawn directly on the live scale bar. */
      .le-ocean-legend-graduations {
        position:absolute; inset:0; overflow:visible; pointer-events:none;
      }
      .le-ocean-legend-bar { position:relative; }
      .le-ocean-legend-graduations span {
        position:absolute; left:var(--ocean-graduation-position); top:50%;
        width:1px; height:14px; border-radius:1px;
        background:rgba(226,248,255,.92);
        box-shadow:0 0 3px rgba(112,220,255,.78);
        transform:translate(-50%,-50%);
      }
      .le-ocean-legend-ticks {
        position:relative; width:100%;
        height:14px; margin-top:4px;
        color:#b9cddd; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,1.8cqi,11px); font-weight:500;
        line-height:1; font-variant-numeric:tabular-nums;
      }
      .le-ocean-legend-ticks span {
        position:absolute; top:0; transform:translateX(-50%);
        white-space:nowrap; text-align:center;
      }
      .le-ocean-legend-ticks span::before {
        content:""; position:absolute; left:50%; top:-6px;
        width:1px; height:3px; background:rgba(171,211,233,.58);
        transform:translateX(-50%);
      }
      .le-ocean-legend-ticks span:first-child { transform:none; text-align:left; }
      .le-ocean-legend-ticks span:first-child::before { content:none; }
      .le-ocean-legend-ticks span:last-child { transform:translateX(-100%); text-align:right; }
      .le-ocean-legend-ticks span:last-child::before { content:none; left:100%; }

      .le-ocean-details { margin-top:10px; border-top:1px solid rgba(165,208,235,.14); padding-top:8px; }
      .le-ocean-details summary {
        list-style:none; cursor:pointer; color:#b7d8e9; font-size:10px;
        font-weight:700; letter-spacing:.08em; text-transform:uppercase;
        display:flex; justify-content:space-between; align-items:center; min-height:26px;
      }
      .le-ocean-details summary::-webkit-details-marker { display:none; }
      .le-ocean-details summary::after { content:'＋'; color:#82d9f5; font-size:15px; }
      .le-ocean-details[open] summary::after { content:'−'; }
      .le-sfv--oceans .le-sfv-metric-grid { margin-top:9px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
      .le-sfv--oceans .le-sfv-metric { padding:9px 10px; border-radius:11px; background:rgba(1,8,17,.42); }
      .le-sfv--oceans .le-sfv-metric-label { font-size:8px; margin-bottom:4px; }
      .le-sfv--oceans .le-sfv-metric-value { font-size:clamp(13px,3.5vw,17px); }
      .le-sfv--oceans .le-sfv-attribution { margin:7px 2px 0; font-size:8px; color:#8da9bc; }
      .le-sfv--oceans .le-ocean-dataset-card { margin-bottom:9px; }
      .le-ocean-dataset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
      .le-ocean-dataset-option {
        appearance:none; display:flex; flex-direction:column; align-items:flex-start;
        gap:4px; min-width:0; min-height:66px; padding:10px 11px;
        border:1px solid rgba(130,197,230,.22); border-radius:13px;
        color:#eaf7ff; text-align:left;
        background:linear-gradient(145deg,rgba(16,43,65,.82),rgba(4,13,25,.82));
        cursor:pointer; font:inherit;
        transition:border-color .18s ease,background .18s ease,transform .18s ease;
      }
      .le-ocean-dataset-option:active:not(:disabled) { transform:scale(.985); }
      .le-ocean-dataset-option.is-selected {
        border-color:rgba(91,222,190,.8);
        background:linear-gradient(145deg,rgba(15,76,75,.78),rgba(4,24,35,.92));
        box-shadow:inset 0 0 0 1px rgba(91,222,190,.14),0 0 18px rgba(62,218,181,.12);
      }
      .le-ocean-dataset-option:disabled { opacity:.48; cursor:not-allowed; }
      .le-ocean-dataset-name { font-size:12px; letter-spacing:.02em; }
      .le-ocean-dataset-detail { color:#a9c6d8; font-size:9px; line-height:1.35; }
      .le-ocean-dataset-state { margin-top:auto; color:#80d9c1; font-size:7px; font-weight:800; letter-spacing:.1em; }
      .le-ocean-dataset-option.is-unavailable .le-ocean-dataset-state { color:#91a4b4; }
    `;
    style.textContent += `
      /* Ten registered Oceans datasets: compact two-column orb grid. */
      .le-ocean-dataset-orb-menu {
        display:grid; grid-template-columns:repeat(2,clamp(42px,5.8vmin,48px));
        gap:8px; align-items:center; justify-items:center; width:max-content;
        max-height:min(68svh,440px); overflow-y:auto; overscroll-behavior:contain;
        padding:4px; scrollbar-width:none;
      }
      .le-ocean-dataset-orb-menu::-webkit-scrollbar { display:none; }
      .le-sfv--oceans .le-sfv-head, .le-sfv--oceans .le-sfv-pill { display:none!important; }
      .le-sfv--oceans.le-world-engine-host .le-sfv-body { pointer-events:none; }
      .le-sfv--oceans.le-world-engine-host .le-sfv-body > *,
      .le-sfv--oceans.le-world-engine-host .le-sfv-body :is(
        button,a,input,select,textarea,summary,[role="button"],.le-ocean-details,.le-ocean-scale-dock,.le-ocean-data-card
      ) { pointer-events:auto; }
    `;
    document.head.appendChild(style);
  }
  // 02 — Shared resource loading and time formatting.

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
  sceneTitle.className = "le-ocean-scene-title";
  sceneTitle.setAttribute("aria-label", "Oceans");
  sceneTitle.innerHTML = "<span>OCEANS</span><i aria-hidden=\"true\"></i>";
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
  const OCEANS_MAX_ZOOM = 3;
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
      atmosphere: true
    });
    if (disposed) { earthGlobe.dispose(); throw new Error("The world view closed while its Engine globe was loading."); }
    scene.add(earthGlobe.group);

    if (disposed) {
      earthGlobe.dispose();
      throw new Error("The Oceans view closed while its globe was loading.");
    }

    // Match the Home Earth location marker: a small red halo and dot attached
    // directly to this view's Earth surface, so it follows every globe rotation.
    locationVector = new T.Vector3();
    locationMarker = new T.Group();
    locationMarker.name = "liveEarthOceansLocationMarker";
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

    function syncOceansLocation() {
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
    window.addEventListener("live-earth-location-fix", syncOceansLocation);
    window.addEventListener("live-earth-location-state", syncOceansLocation);
    syncOceansLocation();

    // 04 — Shared globe interaction: surface-anchored drag and pinch zoom.
    // Oceans owns its gestures. A geographic surface point is picked once
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
        zoomFactor = Math.max(1, Math.min(OCEANS_MAX_ZOOM, value));
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
      window.removeEventListener("live-earth-location-fix", syncOceansLocation);
      window.removeEventListener("live-earth-location-state", syncOceansLocation);
      gestureController?.dispose?.(); gestureController = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      if (locationMarker?.parent) locationMarker.parent.remove(locationMarker);
      locationHalo?.geometry?.dispose?.(); locationHalo?.material?.dispose?.();
      locationDot?.geometry?.dispose?.(); locationDot?.material?.dispose?.();
      locationMarker = null; locationHalo = null; locationDot = null; locationVector = null;
      earthGlobe?.dispose?.(); earthGlobe = null;
      renderer?.dispose?.(); renderer?.forceContextLoss?.(); renderer = null;
      sceneTitle.remove();
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
    sceneTitle.remove();
    canvas.remove();
    root.classList.remove("le-world-engine-host");
    throw error;
  }
}

function installStyles() {
  if (document.getElementById("le-oceans-world-engine-canvas-style")) return;
  const style = document.createElement("style");
  style.id = "le-oceans-world-engine-canvas-style";
  style.textContent = `
    /* Oceans is an exclusive full-screen world, not a transparent Home overlay. */
    body.le-oceans-fullscreen-open #scene{visibility:hidden!important;pointer-events:none!important}
    .le-sfv--oceans.le-world-engine-host{position:absolute;inset:0;isolation:isolate;background:radial-gradient(ellipse at 50% 43%,#0a1b2b 0%,#030914 58%,#010308 100%);pointer-events:none}
    .le-world-engine-host{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(15,47,75,.22),rgba(2,6,13,.88) 76%)}
    .le-world-engine-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;pointer-events:auto;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
    .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
    .le-sfv--oceans.le-world-engine-host .le-sfv-panel{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
    .le-world-engine-host .le-sfv-head,.le-world-engine-host .le-sfv-body{pointer-events:auto}
    .le-world-engine-host .le-sfv-body{max-height:calc(100% - 150px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .le-world-engine-host .le-sfv-head{ text-shadow:0 2px 18px rgba(0,0,0,.85) }
    
    .le-world-engine-host .le-sfv-card{background:rgba(4,13,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  `;
  document.head.appendChild(style);
}

  // 06 — Oceans view composition. The shared Earth Engine globe and
  // Universal current-grid pipeline power every configured scalar ocean field.
  function activateView() {
    installHudStyle();
    installResponsivePresentationStyles();
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};
    // Clean globe-first presentation, consistent with Atmosphere.
    // This view owns its scene title and controls; no generic intro is needed.
    view.root.querySelector('.le-sfv-head')?.remove();
    view.root.querySelector('.le-sfv-pill')?.remove();
    document.body.classList.add('le-oceans-fullscreen-open');

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

    // Atmosphere's floating control orb and dataset-orb interaction pattern.
    const hudToggle = runtime.el('button', 'le-ocean-hud-toggle');
    hudToggle.type = 'button';
    const hudIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    hudIcon.setAttribute('viewBox', '0 0 24 24');
    hudIcon.setAttribute('aria-hidden', 'true');
    hudIcon.classList.add('le-ocean-hud-toggle-icon');
    hudIcon.innerHTML = '<path d="M4 7h7m4 0h5M4 17h3m4 0h9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="13" cy="7" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="17" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/>';
    hudToggle.append(hudIcon);
    const datasetOrbMenu = runtime.el('div', 'le-ocean-dataset-orb-menu');
    datasetOrbMenu.id = 'le-ocean-dataset-orb-menu';
    datasetOrbMenu.setAttribute('role', 'group');
    datasetOrbMenu.setAttribute('aria-label', 'Ocean datasets');
    hudToggle.setAttribute('aria-controls', datasetOrbMenu.id);
    hudToggle.setAttribute('aria-expanded', 'false');
    hudToggle.setAttribute('aria-haspopup', 'true');
    hudToggle.setAttribute('aria-label', 'Open ocean datasets');
    hudToggle.addEventListener('click', () => {
      const open = datasetOrbMenu.classList.toggle('is-open');
      hudToggle.setAttribute('aria-expanded', String(open));
      hudToggle.setAttribute('aria-label', open ? 'Close ocean datasets' : 'Open ocean datasets');
    });
    view.root.appendChild(hudToggle);

    const DATASET_OPTIONS = [
    {
        "id": "sea_temperature",
        "datasetId": "OCEANS_01",
        "label": "Sea temperature",
        "icon": "temperature",
        "color": "#ff9c68",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "ocean_currents",
        "datasetId": "OCEANS_02",
        "label": "Ocean currents",
        "icon": "currents",
        "color": "#71d9f7",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "salinity",
        "datasetId": "OCEANS_03",
        "label": "Salinity",
        "icon": "salinity",
        "color": "#75baff",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "sea_level",
        "datasetId": "OCEANS_04",
        "label": "Sea level",
        "icon": "sea_level",
        "color": "#87d7ce",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "wave_height",
        "datasetId": "OCEANS_05",
        "label": "Wave height",
        "icon": "waves",
        "color": "#6bc9ff",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "chlorophyll",
        "datasetId": "OCEANS_06",
        "label": "Chlorophyll",
        "icon": "chlorophyll",
        "color": "#8ce09b",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "ocean_colour",
        "datasetId": "OCEANS_07",
        "label": "Ocean colour",
        "icon": "colour",
        "color": "#b5a4ff",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "marine_productivity",
        "datasetId": "OCEANS_08",
        "label": "Marine productivity",
        "icon": "productivity",
        "color": "#a5dc88",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "ocean_heat",
        "datasetId": "OCEANS_09",
        "label": "Ocean heat",
        "icon": "heat",
        "color": "#ff8d7a",
        "status": "collector_configured_pending_first_success"
    },
    {
        "id": "sea_ice",
        "datasetId": "OCEANS_10",
        "label": "Sea ice",
        "icon": "ice",
        "color": "#a9eaff",
        "status": "collector_configured_pending_first_success"
    }
];
    const datasetOrbButtons = new Map();
    let selectedDataset = null;
    const selectedDatasetConfig = new Map([
      ['sea_temperature', { id: 'sea_temperature', label: 'Sea temperature', datasetId: 'earth.oceans.sea_temperature', width: 1440, height: 720, units: 'degree_C', displayUnit: '°C' }],
      ['ocean_currents', { id: 'ocean_currents', label: 'Ocean currents', datasetId: 'earth.oceans.ocean_currents', width: 1440, height: 720, units: 'metre_per_second', displayUnit: 'm/s', note: 'Geostrophic current speed derived from NOAA eastward and northward components' }],
      ['salinity', { id: 'salinity', label: 'Salinity', datasetId: 'earth.oceans.salinity', width: 1440, height: 720, units: 'PSU', displayUnit: 'PSU' }],
      ['sea_level', { id: 'sea_level', label: 'Sea level', datasetId: 'earth.oceans.sea_level', width: 1440, height: 720, units: 'm', displayUnit: 'm' }],
      ['wave_height', { id: 'wave_height', label: 'Wave height', datasetId: 'earth.oceans.wave_height', width: 1440, height: 721, units: 'm', displayUnit: 'm', note: 'NOAA GFS-Wave model forecast · HTSGW' }],
      ['chlorophyll', { id: 'chlorophyll', label: 'Chlorophyll', datasetId: 'earth.oceans.chlorophyll', width: 2880, height: 1440, units: 'mg m-3', displayUnit: 'mg/m³' }],
      ['ocean_colour', { id: 'ocean_colour', label: 'Ocean colour', datasetId: 'earth.oceans.ocean_colour', width: 2880, height: 1440, units: 'W m-2 um-1 sr-1', displayUnit: 'W/m²/μm/sr', note: 'NASA Aqua MODIS normalized fluorescence line height · ocean-optics indicator, not reflectance' }],
      ['marine_productivity', { id: 'marine_productivity', label: 'Marine productivity', datasetId: 'earth.oceans.marine_productivity', width: 2880, height: 1440, units: 'mg C m-2 day-1', displayUnit: 'mg C/m²/day' }],
      ['ocean_heat', { id: 'ocean_heat', label: 'Ocean heat', datasetId: 'earth.oceans.ocean_heat', width: 360, height: 180, units: '10^18 J', displayUnit: '10¹⁸ J', note: 'Monthly 0–2000 m ocean heat-content anomaly · native 1° grid' }],
      ['sea_ice', { id: 'sea_ice', label: 'Sea ice', datasetId: 'earth.oceans.sea_ice', width: 1440, height: 720, units: '1', displayUnit: 'fraction' }]
    ]);
    const PALETTES = {
      'sea_temperature': ['#080d2c', '#203b8a', '#1689b8', '#45b978', '#f0c64b', '#f06429', '#8b152a'],
      'ocean_currents': ['#07152e', '#124c78', '#168caa', '#57c6b5', '#d7edb4', '#fff1bb'],
      'salinity': ['#17143d', '#264a85', '#267fa7', '#31b8a2', '#b9d88a', '#fff0b0'],
      'sea_level': ['#30134b', '#4555a1', '#278eae', '#68c4ab', '#e5e9a0', '#fff2c4'],
      'wave_height': ['#071a3a', '#12598e', '#168fba', '#48c5c3', '#d8edcc', '#fff2c0'],
      'chlorophyll': ['#20113e', '#3c357f', '#247b80', '#48a45f', '#b5c84c', '#f4e46c'],
      'ocean_colour': ['#17123b', '#393b8f', '#376ca8', '#39a6a2', '#b6d56c', '#fff0a8'],
      'marine_productivity': ['#1a1c3e', '#285b78', '#3c9b72', '#9acb55', '#f0dc67', '#fff3b0'],
      'ocean_heat': ['#243b8a', '#3f85b5', '#80c5bb', '#f0d17a', '#e77c50', '#8d263b'],
      'sea_ice': ['#061b3a', '#14518a', '#3c91c4', '#9bd8e8', '#e5f5f5', '#ffffff']
    };

    const iconMarkup = {
      temperature: '<path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 10v8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      currents: '<path d="M3 8h12a2.5 2.5 0 1 0-2.4-3M3 12h17M3 16h11a2.5 2.5 0 1 1-2.4 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      salinity: '<path d="M12 3.5s-6 6.4-6 10.5a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 15.2a3.2 3.2 0 0 0 3.2 3.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      sea_level: '<path d="M4 17h16M6 17V9m12 8V9M4 9h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 6c1.5-1.5 3 .9 4.5-.6S14.5 4.5 17 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      waves: '<path d="M3 9c2.2-2.2 4.5-2.2 6.7 0s4.5 2.2 6.7 0 4.5-2.2 4.6-2.1M3 15c2.2-2.2 4.5-2.2 6.7 0s4.5 2.2 6.7 0 4.5-2.2 4.6-2.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      chlorophyll: '<path d="M19.5 4.5C11 4.5 5 7.4 5 13.2c0 3.3 2.3 5.3 5.3 5.3 5.8 0 8.7-6 9.2-14Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20c3.2-4.4 6.6-7.1 12-10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      colour: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" fill="none" stroke="currentColor" stroke-width="1.2"/>',
      productivity: '<path d="M4 18c4-1 7-4 8-9 2 4 4 6 8 7-2 3-5 4-8 4H4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 20c3-5 7-8 12-10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      heat: '<path d="M13.5 3.5c.7 3.2-2.9 4.4-2.9 7.4 0 1.5.8 2.5 1.8 3.1-.1-2.1 1.3-3.2 2.5-4.2 2.1 2.1 3.3 4.1 3.3 6.2a6.2 6.2 0 1 1-12.4 0c0-3.5 2.1-6.7 7.7-12.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      ice: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.7l3 2.1 3-2.1M9 19.3l3-2.1 3 2.1M4.8 10.2l.2-3.7 3.5 1M19.2 13.8l-.2 3.7-3.5-1M8.5 16.5l-3.5 1-.2-3.7M15.5 7.5l3.5-1 .2 3.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>'
    };

    function setSelectedDataset(id) {
      selectedDataset = id;
      for (const [key, button] of datasetOrbButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
    }

    function paletteStops(colors) {
      return colors.map((hex, index) => {
        const value = Number.parseInt(hex.slice(1), 16);
        return [
          index / Math.max(1, colors.length - 1),
          ((value >> 16) & 255) / 255,
          ((value >> 8) & 255) / 255,
          (value & 255) / 255
        ];
      });
    }

    function paletteGradient(colors, angle = '90deg') {
      const last = Math.max(1, colors.length - 1);
      return `linear-gradient(${angle},${colors.map((color, index) => `${color} ${index / last * 100}%`).join(',')})`;
    }

    function formatFieldValue(value) {
      if (!Number.isFinite(value)) return '—';
      const absolute = Math.abs(value);
      const digits = absolute >= 1000 ? 0 : (absolute >= 100 ? 1 : 2);
      return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    }

    function formatTime(value) {
      if (!value) return 'Time unavailable';
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? 'Time unavailable'
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }

    function updateLegend(grid, config) {
      const min = grid.min;
      const max = grid.max;
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
        throw new Error('The selected ocean dataset has no valid numeric range for its colour scale.');
      }
      const unit = config.displayUnit || (grid.units === 'degree_C' ? '°C' : (grid.units || 'source units not supplied'));
      const colors = PALETTES[config.id];
      if (!colors) throw new Error(`No colour palette is registered for ${config.label}.`);
      legendTitle.textContent = `${config.label} · ${unit}`;
      legendBar.style.background = paletteGradient(colors, '90deg');
      scaleDock.style.setProperty('--ocean-gradient-vertical', paletteGradient(colors, '0deg'));
      legendBar.setAttribute('aria-label', `${config.label} from ${formatFieldValue(min)} to ${formatFieldValue(max)} ${unit}`);
      legendTicks.replaceChildren();
      legendGraduations.replaceChildren();
      for (let index = 0; index < 5; index++) {
        const fraction = index / 4;
        const value = min + (max - min) * fraction;
        const position = max === min ? fraction * 100 : ((value - min) / (max - min)) * 100;
        const node = runtime.el('span', '', `${formatFieldValue(value)}${unit === '°C' ? '°' : ''}`);
        node.style.left = `${position}%`;
        node.style.setProperty('--ocean-tick-position', `${100 - position}%`);
        legendTicks.appendChild(node);
        if (index > 0 && index < 4) {
          const graduation = runtime.el('span');
          graduation.style.setProperty('--ocean-graduation-position', `${position}%`);
          legendGraduations.appendChild(graduation);
        }
      }
      scaleRange.textContent = `${formatFieldValue(min)} — ${formatFieldValue(max)} ${unit}`;
      scaleDock.hidden = false;
      return { min, max };
    }

    function makeMetric(labelText, value, unit = '') {
      const item = runtime.el('div', 'le-sfv-metric');
      item.appendChild(runtime.el('span', 'le-sfv-metric-label', labelText));
      const valueNode = runtime.el('strong', 'le-sfv-metric-value', value);
      if (unit) valueNode.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
      item.appendChild(valueNode);
      metric.appendChild(item);
    }

    async function selectDataset(item) {
      if (closed || !runtime.isActive(WORLD.id)) return;
      const datasetKey = item.id;
      const config = selectedDatasetConfig.get(datasetKey);
      datasetOrbMenu.classList.remove('is-open');
      hudToggle.setAttribute('aria-expanded', 'false');
      hudToggle.setAttribute('aria-label', 'Open ocean datasets');

      // Six configured scalar ocean fields share the verified Universal Grid
      // System and GPU skin. Remaining registered controls stay inert.
      if (!config) {
        dataRequest?.abort();
        dataRequest = null;
        for (const button of datasetOrbButtons.values()) button.disabled = false;
        removeActiveLayer();
        setSelectedDataset(datasetKey);
        details.hidden = true;
        source.hidden = true;
        scaleDock.hidden = true;
        showStatus(`${item.label} · This dataset is registered, but its source adapter has not been configured yet. The base Earth globe remains fully interactive.`, 'neutral');
        worldGlobe?.requestRender?.();
        return;
      }

      if (selectedDataset === datasetKey && layerDispose) {
        dataRequest?.abort();
        dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(null);
        details.hidden = true;
        source.hidden = true;
        scaleDock.hidden = true;
        clearStatus();
        worldGlobe?.requestRender?.();
        return;
      }

      dataRequest?.abort();
      dataRequest = null;
      for (const button of datasetOrbButtons.values()) button.disabled = false;
      removeActiveLayer();
      scaleDock.hidden = true;
      setSelectedDataset(datasetKey);
      details.hidden = false;
      source.hidden = false;
      disclosure.open = false;
      syncScaleMore();
      details.querySelector('h2').textContent = config.label;
      if (placeholderDescription) placeholderDescription.hidden = true;
      source.textContent = '';

      const controller = new AbortController();
      dataRequest = controller;
      const button = datasetOrbButtons.get(datasetKey);
      if (button) button.disabled = true;
      showStatus(`Loading and verifying ${config.label.toLowerCase()} grid values…`, 'neutral');

      try {
        await loadSharedGridTools();
        if (engineReady) await engineReady;
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        if (!window.LiveEarthUniversalGridSystem?.loadCurrentGrid) {
          throw new Error('The shared Universal Grid System is unavailable.');
        }
        const grid = await window.LiveEarthUniversalGridSystem.loadCurrentGrid({
          baseUrl: VALUES_BASE_URL,
          datasetId: config.datasetId,
          signal: controller.signal
        });
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        if (!grid?.definition || !grid?.values) {
          throw new Error('The dataset did not return a verified numerical grid.');
        }
        if (grid.definition.width !== config.width || grid.definition.height !== config.height) {
          throw new Error(`The stored ${config.label.toLowerCase()} grid is ${grid.definition.width} × ${grid.definition.height}; expected the registered ${config.width} × ${config.height} grid.`);
        }
        if (grid.units !== config.units) {
          throw new Error(`The stored ${config.label.toLowerCase()} grid uses ${grid.units || 'unknown units'}; expected ${config.units}.`);
        }
        if (!(grid.validCount > 0)) throw new Error('The selected ocean field contains no valid cells.');

        const bounds = updateLegend(grid, config);
        let sourceHost = null;
        if (grid.sourceUrl) {
          try { sourceHost = new URL(grid.sourceUrl).hostname; } catch (_) {}
        }
        source.textContent = [
          config.note,
          grid.provider,
          grid.product,
          grid.processingLevel ? `Processing: ${grid.processingLevel}` : null,
          sourceHost ? `Source: ${sourceHost}` : null
        ].filter(Boolean).join(' · ');
        const unit = config.displayUnit || (grid.units === 'degree_C' ? '°C' : (grid.units || 'source units not supplied'));
        rangeValue.textContent = `${formatFieldValue(grid.min)} — ${formatFieldValue(grid.max)}`;
        rangeUnit.textContent = `Current global range · ${unit}`;
        metric.replaceChildren();
        makeMetric('Grid dimensions', `${grid.definition.width} × ${grid.definition.height}`, 'cells');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), `of ${(grid.definition.width * grid.definition.height).toLocaleString()}`);
        makeMetric('Observed / valid time', formatTime(grid.observedAt));
        makeMetric('Snapshot published', formatTime(grid.retrievedAt));
        if (grid.processingLevel) makeMetric('Processing level', grid.processingLevel);

        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') {
          throw new Error('The Earth Engine globe is not ready.');
        }
        layerDispose = worldGlobe.attachLayer(`oceans-${datasetKey}`, ({ THREE, earth }) => {
          if (!THREE?.Group || !earth?.add) {
            throw new Error('The Earth Engine did not provide its Three.js globe surface.');
          }
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-oceans-${datasetKey}-grid-layer`;
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE,
            grid,
            radius: 1.009,
            opacity: 0.80,
            min: bounds.min,
            max: bounds.max,
            colorStops: paletteStops(PALETTES[datasetKey]),
            contourInterval: 0,
            contourStrength: 0.14,
            contourColor: [0.12, 0.10, 0.15],
            name: `OCEANS-${datasetKey}`
          });
          gridRoot.add(gridHandle.mesh);
          earth.add(gridRoot);
          return () => {
            try { gridHandle?.dispose?.(); } catch (_) {}
            gridHandle = null;
            try { gridRoot?.removeFromParent?.(); } catch (_) {}
            gridRoot = null;
          };
        });
        if (closed || controller.signal.aborted) {
          layerDispose?.();
          layerDispose = null;
          return;
        }
        if (typeof layerDispose !== 'function') {
          throw new Error(`The ${config.label.toLowerCase()} grid layer could not attach.`);
        }
        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        view.root.dataset.gridData = `central-database-${datasetKey}`;
        clearStatus();
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(WORLD.id)) {
          removeActiveLayer();
          setSelectedDataset(null);
          details.hidden = true;
          source.hidden = true;
          scaleDock.hidden = true;
          showStatus(`${config.label} data could not be displayed. The base globe remains active. ${error?.message || ''}`, 'error');
        }
      } finally {
        if (dataRequest === controller) {
          dataRequest = null;
          if (button) button.disabled = false;
        }
      }
    }

    for (const item of DATASET_OPTIONS) {
      const orb = runtime.el('button', 'le-ocean-dataset-orb');
      orb.type = 'button';
      orb.dataset.dataset = item.id;
      orb.setAttribute('aria-label', item.label);
      orb.setAttribute('aria-pressed', 'false');
      orb.title = `${item.label} · ${item.datasetId}`;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('le-ocean-dataset-orb-icon');
      icon.style.color = item.color;
      icon.innerHTML = iconMarkup[item.icon];
      orb.appendChild(icon);
      orb.addEventListener('click', () => selectDataset(item));
      datasetOrbMenu.appendChild(orb);
      datasetOrbButtons.set(item.id, orb);
    }
    view.root.appendChild(datasetOrbMenu);

    // Keep the existing Oceans instrument and populate it only from a verified
    // current grid returned by the shared Universal Grid System.
    const details = runtime.card('Ocean dataset', 'Verified source metadata and measurements will appear when the selected ocean layer is connected.');
    details.classList.add('le-ocean-data-card');
    details.hidden = true;
    const range = runtime.el('div', 'le-ocean-range');
    const rangeValue = runtime.el('strong', '', '—');
    const rangeUnit = runtime.el('span', '', 'Current global range');
    range.append(rangeValue, rangeUnit);
    details.appendChild(range);
    const placeholderDescription = details.querySelector('p');

    const scaleDock = runtime.el('section', 'le-ocean-scale-dock');
    scaleDock.setAttribute('aria-label', 'Active ocean field colour scale');
    scaleDock.hidden = true;
    const instrumentLabel = runtime.el('div', 'le-ocean-instrument-label');
    instrumentLabel.appendChild(runtime.el('span', 'le-ocean-instrument-name', 'Oceans'));
    scaleDock.append(details, instrumentLabel);
    const scaleHeading = runtime.el('div', 'le-ocean-scale-heading');
    const legendTitle = runtime.el('span', 'le-ocean-legend-title', 'Select an ocean field');
    const scaleRange = runtime.el('span', 'le-ocean-scale-range', '—');
    scaleHeading.append(legendTitle, scaleRange);
    scaleDock.appendChild(scaleHeading);
    const scaleTrackRow = runtime.el('div', 'le-ocean-scale-track-row');
    const scaleVisual = runtime.el('div', 'le-ocean-scale-visual');
    const scaleTrack = runtime.el('div', 'le-ocean-scale-track');
    const legendBar = runtime.el('div', 'le-ocean-legend-bar');
    legendBar.setAttribute('role', 'img');
    legendBar.setAttribute('aria-label', 'Ocean field colour gradient');
    const legendGraduations = runtime.el('div', 'le-ocean-legend-graduations');
    legendGraduations.setAttribute('aria-hidden', 'true');
    legendBar.appendChild(legendGraduations);
    scaleTrack.appendChild(legendBar);
    const legendTicks = runtime.el('div', 'le-ocean-legend-ticks');
    scaleVisual.append(scaleTrack, legendTicks);
    const scaleMore = runtime.el('button', 'le-ocean-scale-more', '+');
    scaleMore.type = 'button';
    scaleMore.setAttribute('aria-label', 'Show ocean data details and provenance');
    scaleMore.setAttribute('aria-controls', 'le-oceans-data-details');
    scaleMore.setAttribute('aria-expanded', 'false');
    scaleTrackRow.append(scaleVisual, scaleMore);
    scaleDock.appendChild(scaleTrackRow);
    view.root.appendChild(scaleDock);

    const disclosure = runtime.el('details', 'le-ocean-details');
    disclosure.id = 'le-oceans-data-details';
    disclosure.appendChild(runtime.el('summary', '', 'Data details & provenance'));
    const syncScaleMore = () => {
      const expanded = disclosure.open;
      scaleMore.textContent = expanded ? '−' : '+';
      scaleMore.setAttribute('aria-expanded', String(expanded));
      scaleMore.setAttribute('aria-label', expanded ? 'Collapse ocean data details' : 'Expand ocean data details');
      view.root.classList.toggle('le-ocean-details-expanded', expanded);
    };
    scaleMore.addEventListener('click', () => { disclosure.open = !disclosure.open; syncScaleMore(); });
    disclosure.addEventListener('toggle', syncScaleMore);
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    disclosure.appendChild(metric);
    const source = runtime.el('p', 'le-sfv-attribution', 'Verified dataset attribution and source metadata will be displayed when the selected field is connected.');
    source.hidden = true;
    details.append(disclosure, source);

    let closed = false;
    let layerDispose = null;
    let gridHandle = null;
    let gridRoot = null;
    let worldGlobe = null;
    let dataRequest = null;
    let engineReady = null;

    const onKeyDown = event => {
      if (event.key === 'Escape' && datasetOrbMenu.classList.contains('is-open')) {
        datasetOrbMenu.classList.remove('is-open');
        hudToggle.setAttribute('aria-expanded', 'false');
        hudToggle.setAttribute('aria-label', 'Open ocean datasets');
      }
    };
    document.addEventListener('keydown', onKeyDown);

    function removeActiveLayer() {
      if (typeof layerDispose === 'function') {
        const dispose = layerDispose;
        layerDispose = null;
        try { dispose(); } catch (error) { console.warn(`[LIVE // EARTH] ${WORLD.id} layer detach failed.`, error); }
      }
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { gridRoot?.removeFromParent?.(); } catch (_) {}
      gridRoot = null;
      delete view.root.dataset.gridData;
    }

    const cleanup = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('le-oceans-fullscreen-open');
      dataRequest?.abort();
      hudToggle.remove();
      datasetOrbMenu.remove();
      scaleDock.remove();
      status.remove();
      removeActiveLayer();
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn(`[LIVE // EARTH] ${WORLD.id} Engine globe cleanup failed.`, error); }
      worldGlobe = null;
    };

    // Initialize the base globe immediately, as Composition does. Grid tools and
    // the data request are loaded only when a registered dataset is selected.
    engineReady = (async () => {
      try {
        const globe = await initializeEngineView(view, WORLD.id);
        if (closed || !runtime.isActive(WORLD.id)) {
          globe?.dispose?.();
          return null;
        }
        if (!globe || typeof globe.attachLayer !== 'function') {
          throw new Error('The Earth Engine globe could not be created.');
        }
        worldGlobe = globe;
        view.root.dataset.globeEngine = 'ready';
        globe.requestRender?.();
        return globe;
      } catch (error) {
        if (!closed && runtime.isActive(WORLD.id)) {
          showStatus(`The Earth Engine globe could not open. ${error?.message || ''}`, 'error');
        }
        throw error;
      }
    })();
    // Prevent an unhandled rejection if the Engine fails before a dataset is selected.
    engineReady.catch(() => {});

    return cleanup;
  }

  function installResponsivePresentationStyles() {
    if (document.getElementById('le-oceans-responsive-presentation-style')) return;
    const style = document.createElement('style');
    style.id = 'le-oceans-responsive-presentation-style';
    style.textContent = `
      /* Compact-width presentation */
      @container (max-width:430px) {
        .le-ocean-scale-heading { gap:7px; }
        .le-ocean-legend-title { font-size:clamp(8.5px,2.2cqi,10px); letter-spacing:.025em; }
        .le-ocean-scale-range { padding-left:8px; font-size:clamp(15px,4cqi,19px); }
        .le-ocean-instrument-label { margin-bottom:6px; }
      }
      @container (max-width:350px) {
        .le-ocean-scale-dock { --ocean-action-space:40px; --ocean-track-gap:9px; }
        .le-ocean-scale-heading { gap:5px; margin-bottom:5px; }
        .le-ocean-legend-title { font-size:8px; }
        .le-ocean-scale-range { padding-left:6px; font-size:15px; }
        .le-ocean-instrument-label { font-size:9px; letter-spacing:.22em; margin-bottom:5px; }
        .le-ocean-legend-ticks { font-size:8px; }
      }
      @media (max-width:360px) {
        .le-ocean-dataset-grid { grid-template-columns:1fr; }
      }
      @media (max-height:700px) {
        .le-sfv--oceans.le-world-engine-host .le-sfv-body { margin-top:clamp(145px,28vh,230px); }
        .le-sfv--oceans .le-sfv-panel { padding-bottom:calc(env(safe-area-inset-bottom) + 112px); }
      }

      /* Landscape presentation — scale only. Globe, header, orbs and shared
         feature controls retain their existing presentation and behavior. */
      @media (orientation:landscape) {
        .le-ocean-scene-title { top:3vh; top:3svh; }
        .le-ocean-scale-dock {
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
        .le-ocean-instrument-label {
          grid-column:1 / -1; grid-row:1;
          width:100%; margin:0 0 1px; font-size:9px; letter-spacing:.18em;
        }
        .le-ocean-instrument-label::before,.le-ocean-instrument-label::after { max-width:24px; }

        /* Dataset label is vertical; the live numeric range stays horizontal. */
        .le-ocean-scale-heading { display:contents; }
        .le-ocean-legend-title {
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
        .le-ocean-scale-range {
          grid-column:1; grid-row:2;
          display:block; width:100%; min-width:0;
          padding:0; border:0; font-size:clamp(13px,1.45vw,16px);
          line-height:1.1; letter-spacing:-.035em;
          white-space:nowrap; text-align:center;
        }
        .le-ocean-scale-track-row { display:contents; }
        .le-ocean-scale-visual {
          grid-column:1; grid-row:3;
          display:grid; grid-template-columns:8px max-content;
          align-items:stretch; column-gap:7px;
          width:max-content; max-width:100%; min-width:0;
          justify-self:center;
        }
        .le-ocean-scale-track { width:8px; height:clamp(210px,48vh,300px); }
        .le-ocean-legend-bar {
          width:100%; height:100%; min-height:100%;
          background:var(--ocean-gradient-vertical)!important;
          border-radius:999px;
        }
        .le-ocean-legend-graduations span {
          left:50%; top:var(--ocean-graduation-position);
          width:14px; height:1px;
          transform:translate(-50%,-50%);
        }
        .le-ocean-legend-ticks {
          position:relative; width:max-content; height:auto; min-height:clamp(210px,48vh,300px);
          margin:0; font-size:clamp(8px,.85vw,10px); line-height:1;
        }
        .le-ocean-legend-ticks span {
          top:var(--ocean-tick-position); left:0!important;
          transform:translateY(-50%); text-align:left; white-space:nowrap;
        }
        .le-ocean-legend-ticks span::before {
          left:-7px; top:50%; width:4px; height:1px;
          transform:translateY(-50%);
        }
        .le-ocean-legend-ticks span:first-child { transform:translateY(-50%); }
        .le-ocean-legend-ticks span:last-child { transform:translateY(-50%); text-align:left; }
        .le-ocean-scale-more {
          grid-column:1; grid-row:4;
          width:34px; height:34px; justify-self:center; align-self:center;
          margin:1px 0 0;
        }

        /* The + control opens provenance in a right-side drawer, not above
           the scale, so the drawer stays inside the Landscape viewport. */
        .le-ocean-scale-dock .le-ocean-data-card {
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

  if (runtime.registerFeature(WORLD.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready', {
      detail: { id: WORLD.id }
    }));
  }
})();
