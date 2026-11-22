/* LIVE // EARTH — Atmosphere View Controller.
   First real consumer of the shared Universal Grid System and GPU grid skin.
   Reads the current NOAA GFS values; owns its layer only while open.
*/
(() => {
  'use strict';
  const flag = '__liveEarthAtmosphereViewControllerInstalled';
  if (window[flag]) return;
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Atmosphere controller is waiting for the feature-view runtime.');
    return;
  }
  const ATMOSPHERE_VIEW = { id: 'atmosphere', title: 'Atmosphere', symbol: '◉' };
  const VALUES_BASE_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/values/';
  // Temperature palette stops are normalized from 0 to 1. The verified
  // dataset minimum and maximum define the live colour domain; this palette
  // stretches across that range without fixed absolute temperature endpoints.
  const TEMPERATURE_COLOR_STOPS = [
    [0.000000, 0.0314, 0.0510, 0.1725], // 0% · midnight navy
    [0.071429, 0.0627, 0.1098, 0.3137], // 7.1% · polar indigo
    [0.142857, 0.1255, 0.2314, 0.5412], // 14.3% · deep blue
    [0.321429, 0.0863, 0.5373, 0.7216], // 32.1% · blue-cyan
    [0.500000, 0.2706, 0.7255, 0.4706], // 50% · green
    [0.678571, 0.9412, 0.7765, 0.2941], // 67.9% · gold
    [0.821429, 0.9412, 0.3922, 0.1608], // 82.1% · orange
    [0.892857, 0.7843, 0.2471, 0.2118], // 89.3% · red
    [0.946429, 0.5451, 0.0824, 0.1647], // 94.6% · deep crimson
    [1.000000, 0.2706, 0.0157, 0.0902]  // 100% · dark burgundy
  ];
  const TEMPERATURE_LEGEND = 'linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%)';
  const SCRIPT_PATHS = ['./EarthEngine/Graphics/universal-grid-system.js','./EarthEngine/Graphics/earth-grid-gpu-skin.js'];

  // 01 — Shared visual foundation: all controls use one common design system.
  function installHudStyle() {
    if (document.getElementById('le-atmosphere-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-atmosphere-cinematic-hud';
    style.textContent = `
      /* Atmosphere observatory: cinematic globe, quiet controls, precise data instrument. */
      .le-sfv--atmosphere .le-sfv-panel {
        display:flex; flex-direction:column; align-items:stretch;
        overflow:hidden; background:transparent!important;
        backdrop-filter:none!important; -webkit-backdrop-filter:none!important;
        padding:calc(env(safe-area-inset-top) + clamp(66px,9vmin,82px))
          clamp(15px,4vw,32px) 0;
      }
      .le-sfv--atmosphere .le-sfv-head { margin-bottom:9px; }
      /* The title is a permanent scene layer: the WebGL globe renders above it. */
      .le-atmo-scene-title {
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
      .le-atmo-scene-title::before,.le-atmo-scene-title::after {
        content:""; height:1px; flex:1 1 0; min-width:12px;
        background:linear-gradient(90deg,transparent,rgba(148,190,215,.46));
      }
      .le-atmo-scene-title::after { background:linear-gradient(90deg,rgba(148,190,215,.46),transparent); }
      .le-atmo-scene-title span {
        font:500 clamp(12px,3.25vmin,17px)/1.2 system-ui,-apple-system,sans-serif;
        letter-spacing:clamp(.24em,1.15vmin,.38em); white-space:nowrap;
        text-shadow:0 0 14px rgba(122,190,226,.20);
      }
      .le-atmo-scene-title i {
        position:absolute; left:16%; right:16%; top:calc(100% + 13px); height:1px;
        background:linear-gradient(90deg,transparent,rgba(50,155,232,.30) 28%,rgba(69,190,255,.9) 50%,rgba(50,155,232,.30) 72%,transparent);
        box-shadow:0 0 8px rgba(30,151,255,.45); font-style:normal;
      }
      .le-atmo-scene-title i::after {
        content:""; position:absolute; left:50%; top:50%; width:5px; height:5px; border-radius:50%;
        transform:translate(-50%,-50%); background:#a8eaff; box-shadow:0 0 6px 2px #168fff,0 0 15px 5px rgba(20,133,255,.55);
      }
      .le-atmo-hud-toggle {
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
      .le-atmo-hud-toggle:active { transform:scale(.94); }
      .le-atmo-hud-toggle:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-atmo-hud-toggle-icon { width:19px; height:19px; flex:none; color:#a6e5ff; }
      .le-atmo-hud-toggle[aria-expanded="true"] {
        border-color:rgba(111,218,255,.78);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 22px rgba(55,190,245,.25),0 5px 18px rgba(0,0,0,.28);
      }
      .le-atmo-dataset-orb-menu {
        position:absolute; z-index:6;
        top:calc(env(safe-area-inset-top) + 72px);
        right:max(14px,env(safe-area-inset-right));
        display:flex; flex-direction:column; align-items:center; gap:9px;
        opacity:0; visibility:hidden; pointer-events:none;
        transform:translateY(-7px) scale(.96);
        transform-origin:top center;
        transition:opacity .2s ease,transform .2s ease,visibility .2s ease;
      }
      .le-atmo-dataset-orb-menu.is-open {
        opacity:1; visibility:visible; pointer-events:auto;
        transform:translateY(0) scale(1);
      }
      /* Portrait: place the floating dataset control below the centered header.
         The menu follows the button so it opens directly beneath it on every screen size. */
      @media (orientation:portrait) {
        .le-atmo-hud-toggle { top:15svh; }
        .le-atmo-dataset-orb-menu {
          top:calc(15svh + clamp(46px,6vmin,52px) + 10px);
        }
      }
      /* Landscape: keep the dataset control lower and slightly inset from the edge. */
      @media (orientation:landscape) {
        .le-atmo-hud-toggle { top:8svh; right:8vw; }
        .le-atmo-dataset-orb-menu {
          top:calc(8svh + clamp(46px,6vmin,52px) + 10px);
          right:8vw;
        }
      }
      .le-atmo-dataset-orb {
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
      .le-atmo-dataset-orb:active { transform:scale(.92); }
      .le-atmo-dataset-orb:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-atmo-dataset-orb.is-selected {
        border-color:rgba(112,225,210,.9);
        box-shadow:inset 0 0 0 1px rgba(112,225,210,.22),0 0 19px rgba(72,220,196,.28),0 4px 13px rgba(0,0,0,.28);
        background:linear-gradient(155deg,rgba(15,65,72,.96),rgba(3,18,31,.98));
      }
      .le-atmo-dataset-orb:disabled { opacity:.48; cursor:progress; }
      .le-atmo-dataset-orb-icon { width:21px; height:21px; display:block; }
      .le-sfv--atmosphere .le-sfv-panel.le-atmo-hud-hidden {
        opacity:0; visibility:hidden; pointer-events:none;
        transition:opacity .2s ease,visibility .2s ease;
      }
      .le-sfv--atmosphere .le-sfv-panel { transition:opacity .2s ease,visibility .2s ease; }
      .le-sfv--atmosphere.le-world-engine-host .le-world-engine-canvas { z-index:2; }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-panel { z-index:3; }
      .le-sfv--atmosphere .le-sfv-pill { margin-bottom:10px; }

      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body {
        display:block; box-sizing:border-box; width:min(100%,680px);
        margin:auto auto 0; min-height:0; max-height:min(48dvh,540px);
        overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        padding-bottom:calc(env(safe-area-inset-bottom) + 144px);
        scrollbar-width:none;
      }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      /* Empty feature-body space must pass gestures through to the globe.
         Restore pointer handling only on actual content and controls. */
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body {
        pointer-events:none;
      }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body > *,
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body :is(
        button, a, input, select, textarea, summary, [role="button"],
        .le-atmo-details, .le-atmo-scale-dock, .le-atmo-data-card
      ) {
        pointer-events:auto;
      }
      .le-sfv--atmosphere .le-sfv-status {
        display:inline-block; width:auto; max-width:100%; margin:0 0 9px;
        padding:7px 11px; border-radius:999px; font-size:9px; line-height:1.35;
        background:rgba(3,13,24,.54); border-color:rgba(126,228,189,.22);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      }
      .le-sfv--atmosphere .le-sfv-card {
        padding:13px 15px; border-radius:17px;
        border-color:rgba(159,211,249,.19);
        background:linear-gradient(145deg,rgba(8,23,40,.80),rgba(3,10,20,.78));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.22);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      }
      .le-sfv--atmosphere .le-sfv-card h2 {
        margin:0 0 4px; font-size:10px; letter-spacing:.12em;
        color:#a9c9de; text-transform:uppercase;
      }
      .le-atmo-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-atmo-range strong { color:#f2fbff; font-size:clamp(23px,6vw,31px); letter-spacing:-.035em; font-weight:760; }
      .le-atmo-range span { color:#a9c6d8; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }

      /* The scale is a floating instrument, not a card. Its text and spectrum share one track. */
      .le-atmo-scale-dock {
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
      .le-atmo-scale-dock > .le-atmo-data-card { pointer-events:auto; }
      .le-atmo-scale-dock[hidden] { display:none!important; }
      /* Provenance opens as a separate panel anchored above the scale.
         It is removed from layout flow, so the scale deck never moves,
         grows, or changes its position when the panel is opened. */
      .le-atmo-scale-dock .le-atmo-data-card {
        display:none!important;
        position:absolute; left:0; right:0;
        bottom:calc(100% + clamp(10px,1.6svh,18px));
        width:100%; max-height:min(52svh,560px);
        box-sizing:border-box; margin:0;
        overflow:auto; overscroll-behavior:contain;
        pointer-events:auto; z-index:6;
      }
      .le-sfv--atmosphere.le-atmo-details-expanded .le-atmo-scale-dock .le-atmo-data-card {
        display:block!important;
      }
      .le-atmo-scale-dock .le-sfv-attribution { margin:8px 2px 0; }
      .le-atmo-scale-dock .le-atmo-details { pointer-events:auto; }

      .le-atmo-instrument-label {
        display:flex; align-items:center; justify-content:center; gap:7px;
        width:100%; margin:0 0 6px;
        color:#b7dff4; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:10px; font-weight:650; letter-spacing:.28em;
        line-height:1; text-align:center; text-transform:uppercase;
        text-shadow:0 0 16px rgba(65,176,235,.20);
      }
      .le-atmo-instrument-label::before,
      .le-atmo-instrument-label::after {
        content:""; display:block; flex:1 1 0; max-width:88px; height:1px;
        background:linear-gradient(90deg,transparent,rgba(104,190,231,.46));
      }
      .le-atmo-instrument-label::after {
        background:linear-gradient(90deg,rgba(104,190,231,.46),transparent);
      }
      .le-atmo-scale-heading {
        display:flex; flex-flow:row nowrap; justify-content:flex-start;
        align-items:center; gap:8px;
        width:var(--atmo-content-width); min-width:0;
        margin:0 0 5px; white-space:nowrap; line-height:1;
        text-align:left;
      }
      .le-atmo-legend-title {
        display:block; flex:0 1 auto; min-width:0; overflow:hidden; margin:0;
        padding:0; color:#c6ddeb;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,2.25cqi,11px); font-weight:620;
        letter-spacing:.055em; text-align:left;
        text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap;
      }
      .le-atmo-scale-range {
        display:block; flex:0 0 auto; min-width:0; margin:0;
        padding:0 0 0 8px; border-left:1px solid rgba(137,200,228,.56);
        color:#f7fbff;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(16px,4.1cqi,22px); font-weight:560;
        letter-spacing:-.025em; font-variant-numeric:tabular-nums;
        white-space:nowrap; text-align:left;
      }
      .le-atmo-scale-track-row {
        display:grid; grid-template-columns:minmax(0,1fr) var(--atmo-action-space);
        align-items:center; column-gap:var(--atmo-track-gap); min-width:0;
        --atmo-gradient-height:8px;
      }
      .le-atmo-scale-visual { min-width:0; width:100%; }
      .le-atmo-scale-track { min-width:0; width:100%; }
      .le-atmo-scale-more {
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
        .le-atmo-scale-track-row { align-items:start; }
        .le-atmo-scale-more {
          align-self:start; justify-self:center;
          margin-top:calc((var(--atmo-gradient-height) - var(--atmo-action-space)) / 2);
        }
      }
      .le-atmo-scale-more:hover {
        border-color:rgba(150,232,255,.95);
        background:radial-gradient(circle at 35% 27%,rgba(78,190,229,.30),rgba(3,19,32,.82) 72%);
        box-shadow:0 0 16px rgba(49,177,228,.30);
      }
      .le-atmo-scale-more:active { transform:scale(.94); }
      .le-atmo-scale-more:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-atmo-legend-bar {
        width:100%; height:8px; border-radius:999px;
        background:linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.30),0 0 9px rgba(68,159,222,.24);
      }
      .le-atmo-legend-ticks {
        position:relative; width:var(--atmo-content-width);
        height:14px; margin-top:4px;
        color:#b9cddd; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,1.8cqi,11px); font-weight:500;
        line-height:1; font-variant-numeric:tabular-nums;
      }
      .le-atmo-legend-ticks span {
        position:absolute; top:0; transform:translateX(-50%);
        white-space:nowrap; text-align:center;
      }
      .le-atmo-legend-ticks span::before {
        content:""; position:absolute; left:50%; top:-6px;
        width:1px; height:3px; background:rgba(171,211,233,.58);
        transform:translateX(-50%);
      }
      .le-atmo-legend-ticks span:first-child { transform:none; text-align:left; }
      .le-atmo-legend-ticks span:first-child::before { left:0; }
      .le-atmo-legend-ticks span:last-child { transform:translateX(-100%); text-align:right; }
      .le-atmo-legend-ticks span:last-child::before { left:100%; }

      .le-atmo-details { margin-top:10px; border-top:1px solid rgba(165,208,235,.14); padding-top:8px; }
      .le-atmo-details summary {
        list-style:none; cursor:pointer; color:#b7d8e9; font-size:10px;
        font-weight:700; letter-spacing:.08em; text-transform:uppercase;
        display:flex; justify-content:space-between; align-items:center; min-height:26px;
      }
      .le-atmo-details summary::-webkit-details-marker { display:none; }
      .le-atmo-details summary::after { content:'＋'; color:#82d9f5; font-size:15px; }
      .le-atmo-details[open] summary::after { content:'−'; }
      .le-sfv--atmosphere .le-sfv-metric-grid { margin-top:9px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
      .le-sfv--atmosphere .le-sfv-metric { padding:9px 10px; border-radius:11px; background:rgba(1,8,17,.42); }
      .le-sfv--atmosphere .le-sfv-metric-label { font-size:8px; margin-bottom:4px; }
      .le-sfv--atmosphere .le-sfv-metric-value { font-size:clamp(13px,3.5vw,17px); }
      .le-sfv--atmosphere .le-sfv-attribution { margin:7px 2px 0; font-size:8px; color:#8da9bc; }
      .le-sfv--atmosphere .le-atmo-dataset-card { margin-bottom:9px; }
      .le-atmo-dataset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
      .le-atmo-dataset-option {
        appearance:none; display:flex; flex-direction:column; align-items:flex-start;
        gap:4px; min-width:0; min-height:66px; padding:10px 11px;
        border:1px solid rgba(130,197,230,.22); border-radius:13px;
        color:#eaf7ff; text-align:left;
        background:linear-gradient(145deg,rgba(16,43,65,.82),rgba(4,13,25,.82));
        cursor:pointer; font:inherit;
        transition:border-color .18s ease,background .18s ease,transform .18s ease;
      }
      .le-atmo-dataset-option:active:not(:disabled) { transform:scale(.985); }
      .le-atmo-dataset-option.is-selected {
        border-color:rgba(91,222,190,.8);
        background:linear-gradient(145deg,rgba(15,76,75,.78),rgba(4,24,35,.92));
        box-shadow:inset 0 0 0 1px rgba(91,222,190,.14),0 0 18px rgba(62,218,181,.12);
      }
      .le-atmo-dataset-option:disabled { opacity:.48; cursor:not-allowed; }
      .le-atmo-dataset-name { font-size:12px; letter-spacing:.02em; }
      .le-atmo-dataset-detail { color:#a9c6d8; font-size:9px; line-height:1.35; }
      .le-atmo-dataset-state { margin-top:auto; color:#80d9c1; font-size:7px; font-weight:800; letter-spacing:.1em; }
      .le-atmo-dataset-option.is-unavailable .le-atmo-dataset-state { color:#91a4b4; }
    `;
    document.head.appendChild(style);
  }
  // 02 — Shared resource loading and time formatting.
  function loadScript(path, ready) {
    if (ready()) return Promise.resolve();
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
  }
  async function loadSharedGridTools() {
    await loadScript(SCRIPT_PATHS[0], () => !!window.LiveEarthUniversalGridSystem?.loadCurrentGrid);
    await loadScript(SCRIPT_PATHS[1], () => !!window.LiveEarthGpuGridSkin?.create);
  }
  // Match Moon and Sun: display each absolute timestamp in the device's
  // local timezone. The source instant remains UTC and is never shifted.
  function formatTime(value) {
    if (!value) return 'Time unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Time unavailable'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  // 03 — Earth renderer, location marker and globe lifecycle.
  // This controller calls the shared Earth Engine directly and owns its view renderer.
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
  sceneTitle.className = "le-atmo-scene-title";
  sceneTitle.setAttribute("aria-label", "Atmosphere");
  sceneTitle.innerHTML = "<span>ATMOSPHERE</span><i aria-hidden=\"true\"></i>";
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
  const ATMOSPHERE_MAX_ZOOM = 3;
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
      throw new Error("The Atmosphere view closed while its globe was loading.");
    }

    // Match the Home Earth location marker: a small red halo and dot attached
    // directly to this view's Earth surface, so it follows every globe rotation.
    locationVector = new T.Vector3();
    locationMarker = new T.Group();
    locationMarker.name = "liveEarthAtmosphereLocationMarker";
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

    function syncAtmosphereLocation() {
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
    window.addEventListener("live-earth-location-fix", syncAtmosphereLocation);
    window.addEventListener("live-earth-location-state", syncAtmosphereLocation);
    syncAtmosphereLocation();

    // 04 — Shared globe interaction: surface-anchored drag and pinch zoom.
    // Atmosphere owns its gestures. A geographic surface point is picked once
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
        zoomFactor = Math.max(1, Math.min(ATMOSPHERE_MAX_ZOOM, value));
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
      window.removeEventListener("live-earth-location-fix", syncAtmosphereLocation);
      window.removeEventListener("live-earth-location-state", syncAtmosphereLocation);
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


// 05 — Shared full-screen canvas and input-layer foundation.
function installStyles() {
  if (document.getElementById("le-world-engine-canvas-style")) return;
  const style = document.createElement("style");
  style.id = "le-world-engine-canvas-style";
  style.textContent = `
    /* Atmosphere is an exclusive full-screen world, not a transparent Home overlay. */
    body.le-atmosphere-fullscreen-open #scene{visibility:hidden!important;pointer-events:none!important}
    .le-sfv--atmosphere.le-world-engine-host{position:absolute;inset:0;isolation:isolate;background:radial-gradient(ellipse at 50% 43%,#0a1b2b 0%,#030914 58%,#010308 100%);pointer-events:none}
    .le-world-engine-host{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(15,47,75,.22),rgba(2,6,13,.88) 76%)}
    .le-world-engine-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;pointer-events:auto;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
    .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(3,12,23,.34),rgba(3,9,18,.04) 46%,rgba(2,7,14,.28));backdrop-filter:none;-webkit-backdrop-filter:none}
    .le-sfv--atmosphere.le-world-engine-host .le-sfv-panel{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}
    .le-world-engine-host .le-sfv-head,.le-world-engine-host .le-sfv-body{pointer-events:auto}
    .le-world-engine-host .le-sfv-body{max-height:calc(100% - 150px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .le-world-engine-host .le-sfv-head{ text-shadow:0 2px 18px rgba(0,0,0,.85) }
    
    .le-world-engine-host .le-sfv-card{background:rgba(4,13,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  `;
  document.head.appendChild(style);
}


  // 06 — Feature composition: controls, datasets, instruments and lifecycle.
  function activateView() {
    installHudStyle();
    installResponsivePresentationStyles();
    const view = runtime.mount(ATMOSPHERE_VIEW.id);
    if (!view) return () => {};
    document.body.classList.add('le-atmosphere-fullscreen-open');

    // The globe is the view's immediate baseline. Scientific tools and data
    // are deliberately not requested until the user chooses a dataset.
    const hudToggle = runtime.el('button', 'le-atmo-hud-toggle');
    hudToggle.type = 'button';
    const hudIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    hudIcon.setAttribute('viewBox', '0 0 24 24');
    hudIcon.setAttribute('aria-hidden', 'true');
    hudIcon.classList.add('le-atmo-hud-toggle-icon');
    hudIcon.innerHTML = '<path d="M4 7h7m4 0h5M4 17h3m4 0h9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="13" cy="7" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="17" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/>';
    // Compact round orb: keep the action discoverable through its accessible label.
    hudToggle.append(hudIcon);
    let datasetOrbMenu = null;
    let datasetOrbButtons = new Map();
    hudToggle.setAttribute('aria-controls', 'le-atmo-dataset-orb-menu');
    hudToggle.setAttribute('aria-expanded', 'false');
    hudToggle.setAttribute('aria-haspopup', 'true');
    hudToggle.setAttribute('aria-label', 'Open atmospheric datasets');
    hudToggle.addEventListener('click', () => {
      const open = datasetOrbMenu?.classList.toggle('is-open') || false;
      hudToggle.setAttribute('aria-expanded', String(open));
      hudToggle.setAttribute('aria-label', open ? 'Close atmospheric datasets' : 'Open atmospheric datasets');
    });
    view.root.appendChild(hudToggle);
    view.panel.id = 'le-atmo-hud-panel';
    const status = runtime.el('p', 'le-sfv-status', '');
    status.dataset.state = 'neutral';
    status.hidden = true;
    const showStatus = (message, state) => {
      status.hidden = false;
      if (!status.isConnected) view.body.appendChild(status);
      runtime.setStatus(status, message, state);
    };
    const clearStatus = () => {
      status.remove();
      status.hidden = true;
    };

    const selector = runtime.card('Atmosphere datasets', 'Choose a verified NOAA atmospheric field to render on the globe. Composition is available in its own World.');
    selector.classList.add('le-atmo-dataset-card');
    const datasetGrid = runtime.el('div', 'le-atmo-dataset-grid');
    const datasetOptions = [
      { id: 'temperature', label: 'Temperature', detail: '2 m air temperature · NOAA GFS' },
      { id: 'pressure', label: 'Pressure', detail: 'Mean sea-level pressure · kPa' },
      { id: 'wind', label: 'Wind', detail: '10 m wind speed + direction · U/V' },
      { id: 'moisture', label: 'Moisture', detail: '2 m relative humidity · %' }
    ];
    const FIELD_CONFIG = {
      temperature: { ids: ['earth.atmosphere.air_temperature'], title: 'NOAA · 2 m air temperature', units: 'degree_Celsius', displayUnits: '°C', min: null, max: null, ticks: null, source: 'NOAA NCEP · GFS 0.25° analysis · 2 m air temperature' },
      pressure: { ids: ['earth.atmosphere.atmospheric_pressure'], title: 'NOAA · Mean sea-level pressure', units: 'kilopascal', displayUnits: 'kPa', min: null, max: null, ticks: null, source: 'NOAA NCEP · GFS 0.25° analysis · mean sea-level pressure' },
      wind: { ids: ['earth.atmosphere.wind_speed','earth.atmosphere.wind_direction'], title: 'NOAA · 10 m wind', units: 'metre_per_second', displayUnits: 'm/s', min: 0, max: null, ticks: null, source: 'NOAA NCEP · GFS 0.25° analysis · 10 m wind speed and direction derived from U/V components' },
      moisture: { ids: ['earth.atmosphere.humidity'], title: 'NOAA · 2 m relative humidity', units: 'percent', displayUnits: '%', min: 0, max: 100, ticks: ['0%','25%','50%','75%','100%'], source: 'NOAA NCEP · GFS 0.25° analysis · 2 m relative humidity' }
    };
    const datasetButtons = new Map();
    let selectedDataset = null;
    for (const item of datasetOptions) {
      const button = runtime.el('button', 'le-atmo-dataset-option');
      button.type = 'button';
      button.dataset.dataset = item.id;
      const name = runtime.el('strong', 'le-atmo-dataset-name', item.label);
      const description = runtime.el('span', 'le-atmo-dataset-detail', item.detail);
      const state = runtime.el('span', 'le-atmo-dataset-state', 'LOAD VERIFIED FIELD');
      button.append(name, description, state);
      datasetGrid.appendChild(button);
      datasetButtons.set(item.id, button);
    }
    selector.appendChild(datasetGrid);
    // Dataset selection is presented by the floating four-orb menu, not duplicate cards.
    // Keep the original dataset buttons detached as the accessible action bridge to the
    // established selection/loading pipeline below.

    datasetOrbMenu = runtime.el('div', 'le-atmo-dataset-orb-menu');
    datasetOrbMenu.id = 'le-atmo-dataset-orb-menu';
    datasetOrbMenu.setAttribute('role', 'group');
    datasetOrbMenu.setAttribute('aria-label', 'Atmospheric datasets');

    const datasetOrbIcons = {
      temperature: '<path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 10v8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      pressure: '<path d="M4.5 17a8 8 0 1 1 15 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="m12 13 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="13" r="1.5" fill="currentColor"/>',
      wind: '<path d="M3 9h11a2.5 2.5 0 1 0-2.4-3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3 13h15a2 2 0 1 1-1.9 2.6M3 17h7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      moisture: '<path d="M12 3.5s-6 6.4-6 10.5a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 15.2a3.2 3.2 0 0 0 3.2 3.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
    };
    const datasetOrbColors = {
      temperature: '#ff9185',
      pressure: '#7be6c8',
      wind: '#82dcf8',
      moisture: '#c1a0ff'
    };
    for (const item of datasetOptions) {
      const orb = runtime.el('button', 'le-atmo-dataset-orb');
      orb.type = 'button';
      orb.dataset.dataset = item.id;
      orb.setAttribute('aria-label', item.label);
      orb.setAttribute('aria-pressed', 'false');
      orb.title = item.label;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('le-atmo-dataset-orb-icon');
      icon.style.color = datasetOrbColors[item.id];
      icon.innerHTML = datasetOrbIcons[item.id];
      orb.appendChild(icon);
      orb.addEventListener('click', () => {
        datasetButtons.get(item.id)?.click();
        datasetOrbMenu.classList.remove('is-open');
        hudToggle.setAttribute('aria-expanded', 'false');
        hudToggle.setAttribute('aria-label', 'Open atmospheric datasets');
      });
      datasetOrbMenu.appendChild(orb);
      datasetOrbButtons.set(item.id, orb);
    }
    view.root.appendChild(datasetOrbMenu);

    const details = runtime.card('NOAA · Atmospheric field', 'Select a dataset to load its current verified GFS grid values.');
    details.classList.add('le-atmo-data-card');
    details.hidden = true;
    const range = runtime.el('div', 'le-atmo-range');
    const rangeValue = runtime.el('strong', '', '—');
    range.appendChild(rangeValue);
    const rangeUnit = runtime.el('span', '', 'Current global range');
    range.appendChild(rangeUnit);
    details.appendChild(range);
    const scaleDock = runtime.el('section', 'le-atmo-scale-dock');
    scaleDock.setAttribute('aria-label', 'Active atmospheric field colour scale');
    scaleDock.hidden = true;
    const instrumentLabel = runtime.el('div', 'le-atmo-instrument-label');
    instrumentLabel.appendChild(
      runtime.el('span', 'le-atmo-instrument-name', 'Atmosphere')
    );
    // The verified data/provenance card is part of this instrument deck,
    // not part of the independently hideable feature-controls panel.
    scaleDock.appendChild(details);
    scaleDock.appendChild(instrumentLabel);
    const scaleHeading = runtime.el('div', 'le-atmo-scale-heading');
    const legendTitle = runtime.el('span', 'le-atmo-legend-title', '2 m air temp · °C');
    const scaleRange = runtime.el('span', 'le-atmo-scale-range', '—');
    scaleHeading.append(legendTitle, scaleRange);
    scaleDock.appendChild(scaleHeading);
    let scaleMore;
    const scaleTrackRow = runtime.el('div', 'le-atmo-scale-track-row');
    const scaleVisual = runtime.el('div', 'le-atmo-scale-visual');
    const scaleTrack = runtime.el('div', 'le-atmo-scale-track');
    const legendBar = runtime.el('div', 'le-atmo-legend-bar');
    legendBar.setAttribute('role', 'img');
    legendBar.setAttribute('aria-label', 'Atmospheric field colour gradient');
    scaleTrack.appendChild(legendBar);
    const legendTicks = runtime.el('div', 'le-atmo-legend-ticks');
    scaleVisual.append(scaleTrack, legendTicks);
    scaleMore = runtime.el('button', 'le-atmo-scale-more', '+');
    scaleMore.type = 'button';
    scaleMore.setAttribute('aria-label', 'Show atmospheric data details and provenance');
    scaleMore.setAttribute('aria-controls', 'le-atmosphere-data-details');
    scaleMore.setAttribute('aria-expanded', 'false');
    scaleTrackRow.append(scaleVisual, scaleMore);
    scaleDock.appendChild(scaleTrackRow);
    view.root.appendChild(scaleDock);
    const disclosure = runtime.el('details', 'le-atmo-details');
    disclosure.id = 'le-atmosphere-data-details';
    disclosure.appendChild(runtime.el('summary', '', 'Data details & provenance'));
    const syncScaleMore = () => {
      const expanded = disclosure.open;
      scaleMore.textContent = expanded ? '−' : '+';
      scaleMore.setAttribute('aria-expanded', String(expanded));
      scaleMore.setAttribute('aria-label', expanded
        ? 'Collapse atmospheric data details'
        : 'Expand atmospheric data details');
      view.root.classList.toggle('le-atmo-details-expanded', expanded);
    };
    scaleMore.addEventListener('click', () => {
      disclosure.open = !disclosure.open;
      syncScaleMore();
    });
    disclosure.addEventListener('toggle', syncScaleMore);
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    disclosure.appendChild(metric);
    details.appendChild(disclosure);
    const source = runtime.el('p', 'le-sfv-attribution', 'NOAA NCEP · Global Forecast System · 0.25° analysis');
    source.hidden = true;
    details.appendChild(source);

    let closed = false, layerDispose = null, gridHandle = null, windTracerHandle = null, gridRoot = null, worldGlobe = null;
    let dataRequest = null;
    function removeActiveLayer() {
      if (typeof layerDispose === 'function') {
        const dispose = layerDispose;
        layerDispose = null;
        dispose();
      }
      try { windTracerHandle?.dispose?.(); } catch (_) {}
      windTracerHandle = null;
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { gridRoot?.removeFromParent?.(); } catch (_) {}
      gridRoot = null;
      delete view.root.dataset.gridData;
    }

    const cleanup = () => {
      if (closed) return;
      closed = true;
      document.body.classList.remove('le-atmosphere-fullscreen-open');
      hudToggle.remove();
      scaleDock.remove();
      dataRequest?.abort();
      removeActiveLayer();
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Atmosphere Engine globe cleanup failed.', error); }
      worldGlobe = null;
    };

    function setSelectedDataset(id) {
      selectedDataset = id;
      for (const [key, button] of datasetButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
      for (const [key, orb] of datasetOrbButtons) {
        const active = key === id;
        orb.classList.toggle('is-selected', active);
        orb.setAttribute('aria-pressed', String(active));
      }
    }

    function formatFieldValue(value) {
      if (!Number.isFinite(value)) return '—';
      return value.toFixed(1);
    }

    function updateLegend(grid, config) {
      // Every field's visible scale follows the verified values in the loaded
      // grid. For temperature this makes the gradient endpoints the actual
      // observed minimum and maximum, never a hard-coded climatological range.
      const min = config.min === null ? grid.min : config.min;
      const max = config.max === null ? grid.max : config.max;
      legendTitle.textContent = config === FIELD_CONFIG.temperature
        ? '2 m air temp · °C'
        : `${config.title.replace('NOAA · ','')} · ${config.displayUnits}`;
      const horizontalGradient = config === FIELD_CONFIG.temperature
        ? TEMPERATURE_LEGEND
        : 'linear-gradient(90deg,#0e297a 0%,#05a8e0 25%,#2edca8 50%,#ffca47 75%,#e8402b 100%)';
      const verticalGradient = config === FIELD_CONFIG.temperature
        ? 'linear-gradient(0deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%)'
        : 'linear-gradient(0deg,#0e297a 0%,#05a8e0 25%,#2edca8 50%,#ffca47 75%,#e8402b 100%)';
      legendBar.style.background = horizontalGradient;
      legendBar.style.setProperty('--atmo-gradient-vertical', verticalGradient);

      legendTicks.replaceChildren();
      const tickValues = config.ticks
        ? config.ticks.map(label => {
            const match = String(label).match(/[−-]?\d+(?:\.\d+)?/);
            return { label, value: match ? Number(match[0].replace('−','-')) : min };
          })
        : Array.from({ length: 5 }, (_, index) => {
            const value = min + (max - min) * index / 4;
            const suffix = config === FIELD_CONFIG.temperature ? '°' : ` ${config.displayUnits}`;
            return { label: `${formatFieldValue(value)}${suffix}`, value };
          });
      for (const tick of tickValues) {
        const position = max > min ? Math.max(0, Math.min(100, ((tick.value - min) / (max - min)) * 100)) : 0;
        const node = runtime.el('span', '', tick.label);
        node.style.left = `${position}%`;
        node.style.setProperty('--atmo-tick-position', `${100 - position}%`);
        legendTicks.appendChild(node);
      }
      scaleRange.textContent = `${formatFieldValue(grid.min)} — ${formatFieldValue(grid.max)} ${config.displayUnits}`;
      scaleDock.hidden = false;
      return { min, max };
    }


    // 07 — Wind visualisation layer.
    // Direction is meteorological FROM-north; vectors are converted to the
    // direction the air travels. Particles are visual tracers, not live
    // measurements or a claim of physically scaled animation time.
    function makeWindTracers(THREE, earth, camera, speedGrid, directionGrid, requestRender) {
      const def=speedGrid.definition, dirDef=directionGrid.definition;
      if(def.width!==dirDef.width || def.height!==dirDef.height ||
         def.lonStart!==dirDef.lonStart || def.lonStep!==dirDef.lonStep ||
         def.latStart!==dirDef.latStart || def.latStep!==dirDef.latStep ||
         def.rowOrder!==dirDef.rowOrder) {
        throw new Error('Wind tracer grids do not share identical coordinates.');
      }

      // A denser field and longer history make the wind direction legible
      // without covering the underlying scientific colour layer.
      const COUNT=76, TRAIL_STEPS=12, RADIUS=1.014;
      const DEG=Math.PI/180, RAD=180/Math.PI;
      const speedValues=speedGrid.values, directionValues=directionGrid.values;
      const width=def.width, height=def.height;
      const wrap=(v,n)=>((v%n)+n)%n;

      function sampleWind(lat,lon) {
        const longitude=def.longitudeConvention==='0..360' ? wrap(lon,360) : wrap(lon+180,360)-180;
        const gx=wrap((longitude-def.lonStart)/def.lonStep,width);
        const gy=Math.max(0,Math.min(height-1,(lat-def.latStart)/def.latStep));
        const x0=Math.floor(gx), x1=(x0+1)%width, y0=Math.floor(gy), y1=Math.min(height-1,y0+1);
        const fx=gx-x0, fy=gy-y0;
        const cells=[
          [y0*width+x0,(1-fx)*(1-fy)], [y0*width+x1,fx*(1-fy)],
          [y1*width+x0,(1-fx)*fy], [y1*width+x1,fx*fy]
        ];
        let east=0,north=0,speed=0,total=0;
        for(const [index,w] of cells) {
          const sp=Number(speedValues[index]), from=Number(directionValues[index]);
          if(!Number.isFinite(sp)||!Number.isFinite(from)||sp<0) continue;
          const a=from*DEG;
          // Meteorological bearing points to where wind comes FROM.
          east+=-Math.sin(a)*sp*w;
          north+=-Math.cos(a)*sp*w;
          speed+=sp*w; total+=w;
        }
        if(total<0.5) return null;
        return {east:east/total,north:north/total,speed:speed/total};
      }

      const toLatLon=(p)=>({
        lat:Math.asin(THREE.MathUtils.clamp(p.y/Math.max(1e-9,p.length()),-1,1))*RAD,
        lon:Math.atan2(-p.z,p.x)*RAD
      });
      function localBasis(lat,lon) {
        const a=lat*DEG, b=lon*DEG, ca=Math.cos(a), sa=Math.sin(a), cb=Math.cos(b), sb=Math.sin(b);
        return {
          east:new THREE.Vector3(-sb,0,-cb),
          north:new THREE.Vector3(-sa*cb,ca,sa*sb)
        };
      }

      const positions=new Float32Array(COUNT*3);
      const trailPositions=new Float32Array(COUNT*TRAIL_STEPS*2*3);
      const particles=[];
      const pointGeometry=new THREE.BufferGeometry();
      pointGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
      const pointMaterial=new THREE.PointsMaterial({
        color:0xe4faff, size:0.009, sizeAttenuation:true,
        transparent:true, opacity:0.88, depthTest:true, depthWrite:false,
        blending:THREE.AdditiveBlending, toneMapped:false
      });
      const points=new THREE.Points(pointGeometry,pointMaterial);
      points.name='liveEarthWind76FlowHeads';
      points.renderOrder=12; points.frustumCulled=false; points.raycast=()=>{};

      const trailGeometry=new THREE.BufferGeometry();
      trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage));
      const trailMaterial=new THREE.LineBasicMaterial({
        color:0x9feaff, transparent:true, opacity:0.27,
        depthTest:true, depthWrite:false, blending:THREE.AdditiveBlending,
        toneMapped:false
      });
      const trails=new THREE.LineSegments(trailGeometry,trailMaterial);
      trails.name='liveEarthWind12StepFlowTrails';
      trails.renderOrder=11; trails.frustumCulled=false; trails.raycast=()=>{};
      earth.add(trails,points);

      const cameraLocal=new THREE.Vector3(), worldCamera=new THREE.Vector3();
      function getViewDirection() {
        camera.getWorldPosition(worldCamera);
        earth.worldToLocal(cameraLocal.copy(worldCamera));
        return cameraLocal.normalize();
      }
      function isVisible(p,viewDir) { return p.dot(viewDir)>0.10; }

      const helperAxis=new THREE.Vector3();
      const right=new THREE.Vector3();
      const up=new THREE.Vector3();
      const candidate=new THREE.Vector3();
      function randomVisiblePosition(viewDir) {
        // Uniform seeds across the visible hemisphere, away from the limb.
        helperAxis.set(0,Math.abs(viewDir.y)<0.9?1:0,Math.abs(viewDir.y)<0.9?0:1);
        right.crossVectors(viewDir,helperAxis).normalize();
        up.crossVectors(right,viewDir).normalize();
        for(let attempt=0;attempt<64;attempt++) {
          const z=Math.random()*0.82+0.14;
          const angle=Math.random()*Math.PI*2;
          const radial=Math.sqrt(1-z*z);
          candidate.copy(viewDir).multiplyScalar(z)
            .addScaledVector(up,radial*Math.cos(angle))
            .addScaledVector(right,radial*Math.sin(angle))
            .normalize().multiplyScalar(RADIUS);
          const ll=toLatLon(candidate), wind=sampleWind(ll.lat,ll.lon);
          if(wind && wind.speed>=0.8) return candidate.clone();
        }
        return null;
      }

      const initialView=getViewDirection();
      function seedParticle(particle,viewDir) {
        const seed=randomVisiblePosition(viewDir);
        if(!seed) {
          particle.position.set(0,0,0);
          for(const point of particle.history) point.set(0,0,0);
          particle.age=0;
          return false;
        }
        particle.position.copy(seed);
        for(const point of particle.history) point.copy(seed);
        particle.age=0;
        return true;
      }
      for(let i=0;i<COUNT;i++) {
        const particle={position:new THREE.Vector3(),history:Array.from({length:TRAIL_STEPS+1},()=>new THREE.Vector3()),age:0};
        seedParticle(particle,initialView);
        particles.push(particle);
      }

      function writeBuffers() {
        for(let i=0;i<COUNT;i++) {
          const p=particles[i], valid=p.position.lengthSq()>0.5;
          const head=valid?p.position:null, offset=i*3;
          positions[offset]=head?head.x:0; positions[offset+1]=head?head.y:0; positions[offset+2]=head?head.z:0;
          for(let j=0;j<TRAIL_STEPS;j++) {
            const a=p.history[j], b=p.history[j+1], k=(i*TRAIL_STEPS+j)*6;
            trailPositions[k]=a.x; trailPositions[k+1]=a.y; trailPositions[k+2]=a.z;
            trailPositions[k+3]=b.x; trailPositions[k+4]=b.y; trailPositions[k+5]=b.z;
          }
        }
        pointGeometry.attributes.position.needsUpdate=true;
        trailGeometry.attributes.position.needsUpdate=true;
        pointGeometry.computeBoundingSphere(); trailGeometry.computeBoundingSphere();
      }

      const tangent=new THREE.Vector3();
      const frameBasisEast=new THREE.Vector3(), frameBasisNorth=new THREE.Vector3();
      let disposed=false, frame=0, last=0, accumulator=0;
      const fixedStep=1/24;
      const animate=time=>{
        if(disposed) return;
        frame=requestAnimationFrame(animate);
        if(document.hidden) { last=time; return; }
        if(!last) last=time;
        accumulator+=Math.min(0.08,(time-last)/1000);
        last=time;
        if(accumulator<fixedStep) return;
        const dt=Math.min(0.05,accumulator);
        accumulator=0;
        const viewDir=getViewDirection();
        let changed=false;

        for(const particle of particles) {
          if(particle.position.lengthSq()<0.5 || !isVisible(particle.position.clone().normalize(),viewDir)) {
            seedParticle(particle,viewDir); changed=true; continue;
          }
          const ll=toLatLon(particle.position), wind=sampleWind(ll.lat,ll.lon);
          if(!wind || wind.speed<0.8) {
            // Calm or missing cells never produce invented decorative flow.
            seedParticle(particle,viewDir); changed=true; continue;
          }
          const a=ll.lat*DEG, b=ll.lon*DEG, ca=Math.cos(a), sa=Math.sin(a), cb=Math.cos(b), sb=Math.sin(b);
          frameBasisEast.set(-sb,0,-cb);
          frameBasisNorth.set(-sa*cb,ca,sa*sb);
          tangent.copy(frameBasisEast).multiplyScalar(wind.east)
            .addScaledVector(frameBasisNorth,wind.north);
          const magnitude=tangent.length();
          if(magnitude<0.001) continue;
          tangent.multiplyScalar(1/magnitude);

          // A restrained visual-time multiplier preserves relative speed:
          // stronger verified winds travel faster, without implying physical
          // distance or elapsed real-world forecast time.
          const angularStep=Math.min(0.0018,wind.speed*0.00075)*dt;
          particle.position.addScaledVector(tangent,angularStep*RADIUS).normalize().multiplyScalar(RADIUS);
          particle.age+=dt;
          particle.history.shift();
          particle.history.push(particle.position.clone());
          if(particle.age>24 || !isVisible(particle.position.clone().normalize(),viewDir)) seedParticle(particle,viewDir);
          changed=true;
        }
        if(changed) { writeBuffers(); requestRender?.(); }
      };
      writeBuffers();
      frame=requestAnimationFrame(animate);

      return {
        dispose() {
          if(disposed) return;
          disposed=true; cancelAnimationFrame(frame);
          points.removeFromParent(); trails.removeFromParent();
          pointGeometry.dispose(); trailGeometry.dispose();
          pointMaterial.dispose(); trailMaterial.dispose();
        },
        stats:{renderer:'76-visible-wind-flow-tracers',count:COUNT,trailSegments:COUNT*TRAIL_STEPS}
      };
    }

    // 08 — Dataset loading and verified grid attachment.
    async function selectDataset(datasetKey) {
      if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
      const config = FIELD_CONFIG[datasetKey];
      if (!config) return;
      if (selectedDataset === datasetKey && layerDispose) {
        dataRequest?.abort(); dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(null);
        details.hidden = true; source.hidden = true; scaleDock.hidden = true;
        clearStatus();
        worldGlobe?.requestRender?.();
        return;
      }
      dataRequest?.abort(); dataRequest = null;
      removeActiveLayer();
      scaleDock.hidden = true;
      setSelectedDataset(datasetKey);
      details.hidden = false; source.hidden = false;
      details.querySelector('h2').textContent = config.title;
      details.querySelector('p').textContent = `Current global ${config.displayUnits} field · NOAA GFS 0.25°`;
      source.textContent = config.source + ' · model analysis, not direct instrument readings';
      const controller = new AbortController();
      dataRequest = controller;
      const button = datasetButtons.get(datasetKey);
      button.disabled = true;
      const label = datasetOptions.find(item => item.id === datasetKey).label;
      showStatus(`Loading and verifying current NOAA ${label.toLowerCase()} grids…`, 'neutral');
      try {
        await loadSharedGridTools();
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        const grids = await Promise.all(config.ids.map(datasetId => window.LiveEarthUniversalGridSystem.loadCurrentGrid({
          baseUrl: VALUES_BASE_URL, datasetId, signal: controller.signal
        })));
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        const grid = grids[0];
        for (const item of grids) {
          if (item.definition.width !== 1440 || item.definition.height !== 721) throw new Error('A selected NOAA field does not match the approved 1440 × 721 grid.');
        }
        if (grid.units !== config.units) throw new Error(`Expected ${config.units}, received ${grid.units}.`);
        if (datasetKey === 'wind' && grids[1].units !== 'degree') throw new Error(`Expected wind direction in degrees, received ${grids[1].units}.`);
        const bounds = updateLegend(grid, config);
        rangeValue.textContent = `${formatFieldValue(grid.min)} — ${formatFieldValue(grid.max)}`;
        rangeUnit.textContent = `Current global range · ${config.displayUnits}`;
        metric.replaceChildren();
        const makeMetric = (labelText, value, unit = '') => {
          const item = runtime.el('div', 'le-sfv-metric');
          item.appendChild(runtime.el('span', 'le-sfv-metric-label', labelText));
          const v = runtime.el('strong', 'le-sfv-metric-value', value);
          if (unit) v.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
          item.appendChild(v); metric.appendChild(item);
        };
        makeMetric('Grid resolution', '0.25°', 'global');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), 'of ' + (grid.definition.width * grid.definition.height).toLocaleString());
        makeMetric('Observed / valid time', formatTime(grid.observedAt));
        makeMetric('Snapshot published', formatTime(grid.retrievedAt));
        makeMetric('Verified range', `${formatFieldValue(grid.min)} to ${formatFieldValue(grid.max)}`, config.displayUnits);
        if (datasetKey === 'wind') {
          makeMetric('Wind direction range', `${formatFieldValue(grids[1].min)} to ${formatFieldValue(grids[1].max)}`, 'degrees FROM north');
          makeMetric('Flow display', '76', 'animated tracers');
          makeMetric('Direction basis', 'From north', 'particles travel downwind');
        }
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe is not ready.');
        layerDispose = worldGlobe.attachLayer(`atmosphere-${datasetKey}`, ({ THREE, earth }) => {
          if (!THREE || !earth?.add) throw new Error('The Earth Engine did not provide its Three.js surface.');
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-atmosphere-${datasetKey}-layer`;
          const colorMin = datasetKey === 'moisture' ? 0 : bounds.min;
          const colorMax = datasetKey === 'moisture' ? 100 : bounds.max;
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE, grid, radius: 1.009,
            opacity: datasetKey === 'temperature' ? 0.75 : (datasetKey === 'wind' ? 0.86 : 0.78),
            min: colorMin, max: colorMax,
            colorStops: datasetKey === 'temperature' ? TEMPERATURE_COLOR_STOPS : (datasetKey === 'wind' ? [
              [0.00, 0.025, 0.055, 0.22],
              [0.16, 0.055, 0.19, 0.48],
              [0.32, 0.035, 0.43, 0.68],
              [0.48, 0.035, 0.62, 0.52],
              [0.64, 0.24, 0.72, 0.24],
              [0.76, 0.88, 0.78, 0.16],
              [0.88, 0.96, 0.43, 0.12],
              [1.00, 0.78, 0.12, 0.22]
            ] : undefined),
            thermalAura: datasetKey === 'temperature' ? {
              enabled: true,
              expansion: 0.0015,
              intensity: 0.075,
              diffusion: 0.012
            } : undefined,
            contourInterval: datasetKey === 'temperature' ? 5 : 0,
            contourStrength: datasetKey === 'temperature' ? 0.085 : 0.16,
            contourColor: [0.13, 0.10, 0.09],
            name: `NOAA-GFS-${datasetKey}`
          });
          gridRoot.add(gridHandle.mesh);
          if (gridHandle.auraMesh) gridRoot.add(gridHandle.auraMesh);
          earth.add(gridRoot);
          if (datasetKey === 'wind') {
            windTracerHandle = makeWindTracers(THREE, earth, worldGlobe.camera, grid, grids[1], () => worldGlobe?.requestRender?.());
          }
          return () => {
            try { windTracerHandle?.dispose?.(); } catch (_) {}
            windTracerHandle = null;
            try { gridHandle?.dispose?.(); } catch (_) {}
            gridHandle = null;
            try { gridRoot?.removeFromParent?.(); } catch (_) {}
            gridRoot = null;
          };
        });
        if (closed || controller.signal.aborted) { layerDispose?.(); layerDispose = null; return; }
        if (typeof layerDispose !== 'function') throw new Error(`The verified NOAA ${label.toLowerCase()} layer could not attach.`);
        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        view.root.dataset.gridData = `verified-noaa-gfs-${datasetKey}`;
        // No persistent success banner: the selected layer and live scale
        // provide the confirmation visually. Keep the interface uncluttered.
        clearStatus();
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          removeActiveLayer();
          setSelectedDataset(null);
          details.hidden = true; source.hidden = true; scaleDock.hidden = true;
          showStatus(`${label} data could not be displayed. The base globe remains active. ${error?.message || ''}`, 'error');
        }
      } finally {
        if (dataRequest === controller) dataRequest = null;
        button.disabled = false;
      }
    }

    for (const [key, button] of datasetButtons) button.addEventListener('click', () => selectDataset(key));

    (async () => {
      try {
        worldGlobe = await initializeEngineView(view, ATMOSPHERE_VIEW.id);
        if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id)) { worldGlobe?.dispose?.(); worldGlobe = null; return; }
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe could not be created.');
        view.root.dataset.globeEngine = 'ready';
        // A ready banner is intentionally not created or displayed.
        clearStatus();
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          showStatus(`The Earth Engine globe could not open. ${error?.message || ''}`, 'error');
        }
      }
    })();

    return cleanup;
  }

  // ---------------------------------------------------------------------------
  // FINAL PRESENTATION LAYER
  // Shared controls, data and interactions are created above without orientation
  // branches. This final layer changes presentation only. Portrait declarations
  // remain the original baseline; Landscape is intentionally unchanged for now.
  // ---------------------------------------------------------------------------
  function installResponsivePresentationStyles() {
    if (document.getElementById('le-atmo-responsive-presentation-style')) return;
    const style = document.createElement('style');
    style.id = 'le-atmo-responsive-presentation-style';
    style.textContent = `
      /* Compact-width presentation */
      @container (max-width:430px) {
        .le-atmo-scale-heading { gap:7px; }
        .le-atmo-legend-title { font-size:clamp(8.5px,2.2cqi,10px); letter-spacing:.025em; }
        .le-atmo-scale-range { padding-left:8px; font-size:clamp(15px,4cqi,19px); }
        .le-atmo-instrument-label { margin-bottom:6px; }
      }
      @container (max-width:350px) {
        .le-atmo-scale-dock { --atmo-action-space:40px; --atmo-track-gap:9px; }
        .le-atmo-scale-heading { gap:5px; margin-bottom:5px; }
        .le-atmo-legend-title { font-size:8px; }
        .le-atmo-scale-range { padding-left:6px; font-size:15px; }
        .le-atmo-instrument-label { font-size:9px; letter-spacing:.22em; margin-bottom:5px; }
        .le-atmo-legend-ticks { font-size:8px; }
      }
      @media (max-width:360px) {
        .le-atmo-dataset-grid { grid-template-columns:1fr; }
      }
      @media (max-height:700px) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { margin-top:clamp(145px,28vh,230px); }
        .le-sfv--atmosphere .le-sfv-panel { padding-bottom:calc(env(safe-area-inset-bottom) + 112px); }
      }

      /* Landscape presentation — scale only. Globe, header, orbs and shared
         feature controls retain their existing presentation and behavior. */
      @media (orientation:landscape) {
        .le-atmo-scene-title { top:3vh; top:3svh; }
        .le-atmo-scale-dock {
          left:6%; right:auto;
          top:50%; bottom:auto; transform:translateY(-50%);
          width:clamp(126px,12.24vw,151px); max-width:16.2vw;
          display:grid; grid-template-columns:minmax(0,1fr);
          grid-template-rows:auto auto auto auto; column-gap:0; row-gap:8px;
          padding:8px 8px 8px; border:1px solid rgba(112,190,226,.22);
          border-radius:16px; background:linear-gradient(150deg,rgba(8,25,42,.78),rgba(3,11,22,.68));
          box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 8px 28px rgba(0,0,0,.16);
          backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
          pointer-events:auto;
        }
        .le-atmo-instrument-label {
          grid-column:1 / -1; grid-row:1;
          width:100%; margin:0 0 1px; font-size:9px; letter-spacing:.18em;
        }
        .le-atmo-instrument-label::before,.le-atmo-instrument-label::after { max-width:24px; }

        /* Dataset label is vertical; the live numeric range stays horizontal. */
        .le-atmo-scale-heading { display:contents; }
        .le-atmo-legend-title {
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
        .le-atmo-scale-range {
          grid-column:1; grid-row:2;
          display:block; width:100%; min-width:0;
          padding:0; border:0; font-size:clamp(13px,1.45vw,16px);
          line-height:1.1; letter-spacing:-.035em;
          white-space:nowrap; text-align:center;
        }
        .le-atmo-scale-track-row { display:contents; }
        .le-atmo-scale-visual {
          grid-column:1; grid-row:3;
          display:grid; grid-template-columns:8px max-content;
          align-items:stretch; column-gap:7px;
          width:max-content; max-width:100%; min-width:0;
          justify-self:center;
        }
        .le-atmo-scale-track { width:8px; height:clamp(210px,48vh,300px); }
        .le-atmo-legend-bar {
          width:100%; height:100%; min-height:100%;
          background:var(--atmo-gradient-vertical)!important;
          border-radius:999px;
        }
        .le-atmo-legend-ticks {
          position:relative; width:max-content; height:auto; min-height:clamp(210px,48vh,300px);
          margin:0; font-size:clamp(8px,.85vw,10px); line-height:1;
        }
        .le-atmo-legend-ticks span {
          top:var(--atmo-tick-position); left:0!important;
          transform:translateY(-50%); text-align:left; white-space:nowrap;
        }
        .le-atmo-legend-ticks span::before {
          left:-7px; top:50%; width:4px; height:1px;
          transform:translateY(-50%);
        }
        .le-atmo-legend-ticks span:first-child { transform:translateY(-50%); }
        .le-atmo-legend-ticks span:last-child { transform:translateY(-50%); text-align:left; }
        .le-atmo-scale-more {
          grid-column:1; grid-row:4;
          width:34px; height:34px; justify-self:center; align-self:center;
          margin:1px 0 0;
        }

        /* The + control opens provenance in a right-side drawer, not above
           the scale, so the drawer stays inside the Landscape viewport. */
        .le-atmo-scale-dock .le-atmo-data-card {
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

  // 09 — Final presentation rules are installed after shared view composition.
  if (runtime.registerFeature(ATMOSPHERE_VIEW.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-atmosphere-view-controller-ready', { detail: { id: ATMOSPHERE_VIEW.id } }));
  }
})();
