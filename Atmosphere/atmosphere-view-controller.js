/* LIVE // EARTH — Atmosphere View Controller.
   First real consumer of the shared Universal Grid System and GPU grid skin.
   Reads only the verified NOAA GFS snapshot; owns its layer only while open.
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
  const MANIFEST_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/published/atmosphere/manifest.json';
  // Temperature uses an expanded cold-to-hot scale. The original deep blue
  // remains anchored at -60 C; values below it progress into midnight blues.
  // The original green and gold identity is retained; values above 45 C deepen
  // through crimson to burgundy at +60 C. GPU renderer remains unchanged.
  const TEMPERATURE_COLOR_STOPS = [
    [0.000000, 0.0314, 0.0510, 0.1725], // -80 C · midnight navy
    [0.071429, 0.0627, 0.1098, 0.3137], // -70 C · polar indigo
    [0.142857, 0.1255, 0.2314, 0.5412], // -60 C · original deep blue
    [0.321429, 0.0863, 0.5373, 0.7216], // -35 C · original blue-cyan
    [0.500000, 0.2706, 0.7255, 0.4706], // -10 C · original green
    [0.678571, 0.9412, 0.7765, 0.2941], // +15 C · original gold
    [0.821429, 0.9412, 0.3922, 0.1608], // +35 C · orange
    [0.892857, 0.7843, 0.2471, 0.2118], // +45 C · original red
    [0.946429, 0.5451, 0.0824, 0.1647], // +52.5 C · deep crimson
    [1.000000, 0.2706, 0.0157, 0.0902]  // +60 C · dark burgundy
  ];
  const TEMPERATURE_LEGEND = 'linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%)';
  const SCRIPT_PATHS = ['./EarthEngine/Graphics/universal-grid-system.js','./EarthEngine/Graphics/earth-grid-gpu-skin.js'];

  function installHudStyle() {
    if (document.getElementById('le-atmosphere-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-atmosphere-cinematic-hud';
    style.textContent = `
      /* Atmosphere: keep the centre of the shared globe visually clear. */
      .le-sfv--atmosphere .le-sfv-panel {
        display:flex; flex-direction:column; align-items:stretch;
        overflow:hidden;
        background:transparent;
        backdrop-filter:none; -webkit-backdrop-filter:none;
        padding:calc(env(safe-area-inset-top) + clamp(66px,9vmin,82px))
          clamp(15px,4vw,32px) 0;
      }
      .le-sfv--atmosphere .le-sfv-head { margin-bottom: 9px; }
      /* A compact Atmosphere-only floating control. It stays in the top safe
         area so it never competes with the protected Global Orb dock below. */
      .le-atmo-hud-toggle {
        position:absolute; z-index:5; isolation:isolate; overflow:hidden;
        top:calc(env(safe-area-inset-top) + 14px);
        right:max(14px,env(safe-area-inset-right));
        display:grid; place-items:center;
        width:clamp(54px,6.5vw,62px); height:clamp(54px,6.5vw,62px);
        min-height:54px; padding:0;
        border:1px solid rgba(211,235,255,.72); border-radius:50%;
        color:#f5fbff; font-family:inherit; font-size:24px; font-weight:500; line-height:1;
        background:
          radial-gradient(ellipse at 28% 17%,rgba(255,255,255,.94) 0%,rgba(255,255,255,.34) 9%,transparent 32%),
          radial-gradient(circle at 35% 30%,rgba(143,198,255,.98),rgba(91,117,245,.88) 43%,rgba(61,68,165,.94) 72%,rgba(25,35,79,.98) 100%);
        box-shadow:inset 2px 2px 5px rgba(255,255,255,.72),inset -5px -7px 13px rgba(12,24,75,.52),
          0 7px 18px rgba(0,0,0,.34),0 0 25px rgba(111,157,255,.42),0 0 48px rgba(104,132,255,.19);
        backdrop-filter:blur(22px) saturate(175%); -webkit-backdrop-filter:blur(22px) saturate(175%);
        cursor:pointer; touch-action:manipulation; pointer-events:auto;
        -webkit-tap-highlight-color:transparent;
        transition:transform .24s cubic-bezier(.2,.8,.2,1),box-shadow .24s ease,filter .24s ease;
      }
      .le-atmo-hud-toggle::before {
        content:""; position:absolute; z-index:-1; inset:4px; border-radius:inherit; pointer-events:none;
        border:1px solid rgba(255,255,255,.32);
        background:linear-gradient(145deg,rgba(255,255,255,.25),transparent 42%,rgba(13,25,83,.18));
        box-shadow:inset 0 1px 2px rgba(255,255,255,.35);
      }
      .le-atmo-hud-toggle:hover { transform:translateY(-2px); filter:brightness(1.08); }
      .le-atmo-hud-toggle:active { transform:scale(.94); }
      .le-atmo-hud-toggle:focus-visible { outline:2px solid #a8e5ff; outline-offset:4px; }
      @media (prefers-reduced-motion:reduce) { .le-atmo-hud-toggle { transition:none; } }
      .le-sfv--atmosphere .le-sfv-panel.le-atmo-hud-hidden {
        opacity:0; visibility:hidden; pointer-events:none; transition:opacity .2s ease,visibility .2s ease;
      }
      .le-sfv--atmosphere .le-sfv-panel { transition:opacity .2s ease,visibility .2s ease; }

      .le-sfv--atmosphere .le-sfv-pill { margin-bottom: 10px; }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body {
        display:block; box-sizing:border-box; width:min(100%,680px);
        margin:auto auto 0; min-height:0;
        max-height:min(48dvh,540px); overflow-y:auto; overflow-x:hidden;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
        padding-bottom:calc(env(safe-area-inset-bottom) + 144px);
        scrollbar-width:none;
      }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      @media (orientation:landscape) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { max-height:min(48dvh,350px); }
      }
      .le-sfv--atmosphere .le-sfv-status {
        display:inline-block; width:auto; max-width:100%; margin:0 0 9px;
        padding:7px 11px; border-radius:999px; font-size:9px; line-height:1.35;
        background:rgba(3,13,24,.54); border-color:rgba(126,228,189,.22);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      }
      .le-sfv--atmosphere .le-sfv-card {
        padding:13px 15px; border-radius:19px;
        border-color:rgba(159,211,249,.22);
        background:linear-gradient(135deg,rgba(8,22,38,.78),rgba(4,10,20,.72));
        box-shadow:inset 1px 1px 1px rgba(255,255,255,.10),0 12px 34px rgba(0,0,0,.25),0 0 28px rgba(69,169,226,.08);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      }
      .le-sfv--atmosphere .le-sfv-card h2 { margin:0 0 4px; font-size:10px; letter-spacing:.13em; color:#9fc5dc; text-transform:uppercase; }
      .le-atmo-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-atmo-range strong { color:#f2fbff; font-size:clamp(23px,6vw,31px); letter-spacing:-.035em; font-weight:760; }
      .le-atmo-range span { color:#a9c6d8; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
      .le-atmo-legend { margin:10px 0 2px; padding:9px 10px; border:1px solid rgba(159,211,249,.13); border-radius:12px; background:rgba(1,8,17,.34); }
      .le-atmo-legend-title { display:block; margin-bottom:7px; color:#a9c6d8; font-size:8px; font-weight:750; letter-spacing:.12em; text-transform:uppercase; }
      .le-atmo-legend-bar { height:9px; border-radius:999px; background:linear-gradient(90deg,#203b8a,#1689b8,#45b978,#f0c64b,#c83f36); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); }
      .le-atmo-legend-ticks { display:flex; justify-content:space-between; gap:5px; margin-top:5px; color:#b8cbd8; font-size:8px; font-variant-numeric:tabular-nums; }
      .le-atmo-details { margin-top:10px; border-top:1px solid rgba(165,208,235,.14); padding-top:8px; }
      .le-atmo-details summary { list-style:none; cursor:pointer; color:#b7d8e9; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center; min-height:26px; }
      .le-atmo-details summary::-webkit-details-marker { display:none; }
      .le-atmo-details summary::after { content:'＋'; color:#82d9f5; font-size:15px; }
      .le-atmo-details[open] summary::after { content:'−'; }
      .le-sfv--atmosphere .le-sfv-metric-grid { margin-top:9px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
      .le-sfv--atmosphere .le-sfv-metric { padding:9px 10px; border-radius:11px; background:rgba(1,8,17,.42); }
      .le-sfv--atmosphere .le-sfv-metric-label { font-size:8px; margin-bottom:4px; }
      .le-sfv--atmosphere .le-sfv-metric-value { font-size:clamp(13px,3.5vw,17px); }
      .le-sfv--atmosphere .le-sfv-attribution { margin:7px 2px 0; font-size:8px; color:#8da9bc; }
      .le-sfv--atmosphere .le-atmo-dataset-card { margin-bottom:9px; }
      /* Four atmospheric fields: luminous glass tiles with restrained orbital
         emblems. The decoration is CSS-only; dataset controls and data flow stay intact. */
      .le-atmo-dataset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(7px,1.8vw,11px); }
      .le-atmo-dataset-option {
        appearance:none; position:relative; isolation:isolate; overflow:hidden;
        display:flex; flex-direction:column; align-items:flex-start; gap:5px;
        min-width:0; min-height:clamp(78px,10dvh,94px);
        padding:12px 13px; border:1px solid rgba(151,207,239,.25);
        border-radius:19px; color:#effaff; text-align:left;
        background:linear-gradient(145deg,rgba(22,52,76,.78),rgba(5,15,29,.84) 68%),
          radial-gradient(circle at 100% 0%,rgba(100,190,230,.14),transparent 58%);
        box-shadow:inset 1px 1px 0 rgba(255,255,255,.13),
          inset -1px -1px 0 rgba(0,0,0,.24),0 9px 24px rgba(0,0,0,.20);
        backdrop-filter:blur(18px) saturate(135%); -webkit-backdrop-filter:blur(18px) saturate(135%);
        cursor:pointer; font:inherit; text-align:left;
        transition:border-color .22s ease,background .22s ease,box-shadow .22s ease,transform .22s ease;
      }
      .le-atmo-dataset-option::before {
        content:""; position:absolute; z-index:-1; width:clamp(36px,8vw,46px);
        aspect-ratio:1; right:12px; top:10px; border-radius:50%;
        border:1px solid rgba(255,255,255,.32);
        background:radial-gradient(circle at 32% 25%,rgba(255,255,255,.92),rgba(255,255,255,.20) 13%,transparent 30%),
          radial-gradient(circle at 38% 34%,var(--atmo-orb-core),var(--atmo-orb-mid) 48%,var(--atmo-orb-edge) 78%,rgba(4,13,26,.2));
        box-shadow:inset -5px -7px 12px rgba(0,0,0,.28),inset 2px 2px 7px rgba(255,255,255,.26),
          0 0 19px var(--atmo-orb-glow),0 0 34px color-mix(in srgb,var(--atmo-orb-glow) 45%,transparent);
        opacity:.92; pointer-events:none;
      }
      .le-atmo-dataset-option::after {
        content:attr(data-orb-symbol); position:absolute; right:12px; top:10px;
        width:clamp(36px,8vw,46px); aspect-ratio:1; display:grid; place-items:center;
        color:rgba(255,255,255,.94); font-size:clamp(17px,4vw,22px); font-weight:500;
        text-shadow:0 1px 8px rgba(0,0,0,.55); pointer-events:none;
      }
      .le-atmo-dataset-option[data-dataset="temperature"] { --atmo-orb-core:#fff1a5; --atmo-orb-mid:#f09b48; --atmo-orb-edge:#a83d35; --atmo-orb-glow:rgba(255,151,75,.44); }
      .le-atmo-dataset-option[data-dataset="pressure"] { --atmo-orb-core:#d8f5ff; --atmo-orb-mid:#62b9df; --atmo-orb-edge:#315b9a; --atmo-orb-glow:rgba(91,184,231,.42); }
      .le-atmo-dataset-option[data-dataset="wind"] { --atmo-orb-core:#d8fff0; --atmo-orb-mid:#54d5b4; --atmo-orb-edge:#187c80; --atmo-orb-glow:rgba(65,224,183,.40); }
      .le-atmo-dataset-option[data-dataset="moisture"] { --atmo-orb-core:#e3e8ff; --atmo-orb-mid:#899bf0; --atmo-orb-edge:#4852a6; --atmo-orb-glow:rgba(133,147,255,.42); }
      .le-atmo-dataset-option[data-orb-symbol=""]::after { content:""; }
      .le-atmo-dataset-option:active:not(:disabled) { transform:scale(.975); }
      .le-atmo-dataset-option:hover:not(:disabled) { border-color:rgba(190,232,255,.58); box-shadow:inset 1px 1px 0 rgba(255,255,255,.18),0 12px 30px rgba(0,0,0,.25),0 0 22px var(--atmo-orb-glow); }
      .le-atmo-dataset-option.is-selected {
        border-color:rgba(132,255,224,.88);
        background:linear-gradient(145deg,rgba(14,75,75,.78),rgba(4,22,34,.94) 72%);
        box-shadow:inset 0 0 0 1px rgba(130,255,224,.20),inset 1px 1px 0 rgba(255,255,255,.18),
          0 0 0 1px rgba(91,222,190,.12),0 0 24px rgba(62,218,181,.19);
      }
      .le-atmo-dataset-option.is-selected::before { opacity:1; transform:scale(1.06); }
      .le-atmo-dataset-option:focus-visible { outline:2px solid #9be8ff; outline-offset:3px; }

      /* Liquid Clay Glass flower menu: four atmospheric fields orbit a soft
         central glass hub. All visuals are Atmosphere-only; the Global Orb dock
         and its layout are deliberately not selected or restyled here. */
      .le-sfv--atmosphere .le-atmo-dataset-card {
        position:relative; isolation:isolate; overflow:hidden;
        width:min(100%,344px); box-sizing:border-box; margin:0 auto 12px;
        padding:17px 14px; border:1px solid rgba(204,231,255,.48);
        border-radius:42px 50px 42px 50px;
        background:
          radial-gradient(ellipse at 24% 8%,rgba(255,255,255,.28),transparent 43%),
          linear-gradient(145deg,rgba(155,190,237,.22),rgba(54,82,145,.34) 52%,rgba(15,25,65,.58));
        box-shadow:inset 2px 2px 6px rgba(255,255,255,.28),inset -6px -8px 18px rgba(4,12,39,.38),
          0 17px 38px rgba(0,0,0,.30),0 0 34px rgba(107,163,255,.18);
        backdrop-filter:blur(28px) saturate(170%); -webkit-backdrop-filter:blur(28px) saturate(170%);
      }
      .le-sfv--atmosphere .le-atmo-dataset-card::before {
        content:""; position:absolute; z-index:-1; inset:1px; border-radius:inherit; pointer-events:none;
        background:linear-gradient(130deg,rgba(255,255,255,.16),transparent 34%,rgba(104,147,255,.09) 70%,rgba(255,255,255,.08));
      }
      .le-sfv--atmosphere .le-atmo-dataset-card h2,
      .le-sfv--atmosphere .le-atmo-dataset-card > p { display:none; }
      .le-atmo-dataset-grid {
        position:relative; display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
        grid-template-rows:repeat(3,clamp(72px,19vw,94px));
        justify-items:center; align-items:center; gap:clamp(3px,1.3vw,8px);
      }
      .le-atmo-dataset-grid::before {
        content:"≋"; position:absolute; z-index:0; left:50%; top:50%;
        width:clamp(58px,15vw,72px); aspect-ratio:1; transform:translate(-50%,-50%);
        display:grid; place-items:center; border:1px solid rgba(231,244,255,.66); border-radius:50%;
        color:rgba(238,249,255,.96); font-size:clamp(25px,6vw,31px); font-weight:400;
        background:radial-gradient(ellipse at 27% 18%,rgba(255,255,255,.86),rgba(255,255,255,.16) 13%,transparent 36%),
          radial-gradient(circle at 36% 30%,rgba(135,193,255,.96),rgba(94,116,239,.82) 50%,rgba(45,55,137,.96) 100%);
        box-shadow:inset 2px 2px 5px rgba(255,255,255,.72),inset -5px -7px 12px rgba(10,22,73,.48),
          0 0 22px rgba(117,159,255,.48),0 8px 18px rgba(0,0,0,.28);
        pointer-events:none;
      }
      .le-atmo-dataset-option {
        position:relative; z-index:1; width:clamp(72px,19vw,94px); min-height:0; aspect-ratio:1;
        box-sizing:border-box; align-items:center; justify-content:center; gap:3px; padding:8px 5px;
        border:1px solid rgba(226,242,255,.70); border-radius:50%; color:#f7fbff; text-align:center;
        background:
          radial-gradient(ellipse at 29% 17%,rgba(255,255,255,.88),rgba(255,255,255,.18) 11%,transparent 35%),
          radial-gradient(circle at 35% 30%,var(--atmo-orb-core),var(--atmo-orb-mid) 46%,var(--atmo-orb-edge) 82%,rgba(9,18,47,.96));
        box-shadow:inset 2px 2px 6px rgba(255,255,255,.68),inset -6px -8px 14px rgba(3,12,35,.46),
          0 8px 18px rgba(0,0,0,.30),0 0 19px var(--atmo-orb-glow);
        backdrop-filter:blur(20px) saturate(175%); -webkit-backdrop-filter:blur(20px) saturate(175%);
        transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;
      }
      .le-atmo-dataset-option:nth-child(1) { grid-column:2; grid-row:1; }
      .le-atmo-dataset-option:nth-child(2) { grid-column:2; grid-row:3; }
      .le-atmo-dataset-option:nth-child(3) { grid-column:1; grid-row:2; }
      .le-atmo-dataset-option:nth-child(4) { grid-column:3; grid-row:2; }
      .le-atmo-dataset-option::before {
        content:""; position:absolute; inset:4px; width:auto; aspect-ratio:auto; right:4px; top:4px;
        border:1px solid rgba(255,255,255,.30); border-radius:50%; opacity:.9;
        background:linear-gradient(145deg,rgba(255,255,255,.17),transparent 45%,rgba(0,0,0,.11));
        box-shadow:inset 0 1px 3px rgba(255,255,255,.36); pointer-events:none;
      }
      .le-atmo-dataset-option::after {
        position:relative; inset:auto; order:0; width:100%; height:auto; aspect-ratio:auto;
        display:block; color:rgba(255,255,255,.99); font-size:clamp(19px,5vw,25px);
        line-height:1.05; text-shadow:0 2px 9px rgba(0,0,0,.40);
      }
      .le-atmo-dataset-name { order:1; max-width:100%; margin-top:2px; font-size:clamp(9px,2.5vw,11px);
        line-height:1.15; letter-spacing:.01em; text-shadow:0 1px 7px rgba(0,0,0,.42); }
      .le-atmo-dataset-detail,.le-atmo-dataset-state { display:none; }
      .le-atmo-dataset-option:hover:not(:disabled) { transform:translateY(-2px) scale(1.035); filter:brightness(1.10);
        box-shadow:inset 2px 2px 6px rgba(255,255,255,.76),inset -6px -8px 14px rgba(3,12,35,.40),
          0 11px 23px rgba(0,0,0,.34),0 0 27px var(--atmo-orb-glow); }
      .le-atmo-dataset-option.is-selected { border-color:rgba(255,255,255,.98);
        box-shadow:inset 2px 2px 7px rgba(255,255,255,.82),inset -6px -8px 14px rgba(3,12,35,.38),
          0 0 0 3px rgba(211,239,255,.24),0 0 32px var(--atmo-orb-glow); }
      .le-atmo-dataset-option.is-selected::before { transform:scale(.92); opacity:1; }
      .le-atmo-dataset-option:disabled { opacity:.48; cursor:not-allowed; filter:saturate(.55); }
      .le-atmo-dataset-name { position:relative; z-index:1; max-width:calc(100% - 48px); font-size:12px; letter-spacing:.02em; font-weight:750; }
      .le-atmo-dataset-detail { position:relative; z-index:1; max-width:calc(100% - 2px); color:#b5d0df; font-size:9px; line-height:1.35; }
      .le-atmo-dataset-state { position:relative; z-index:1; margin-top:auto; color:#8be7d0; font-size:7px; font-weight:800; letter-spacing:.1em; }
      .le-atmo-dataset-option.is-unavailable .le-atmo-dataset-state { color:#91a4b4; }
      @media (max-width:360px) {
        .le-sfv--atmosphere .le-atmo-dataset-card { padding:12px 8px; }
        .le-atmo-dataset-grid { grid-template-rows:repeat(3,72px); gap:2px; }
        .le-atmo-dataset-option { width:68px; }
      }
      @media (prefers-reduced-motion:reduce) {
        .le-atmo-dataset-option { transition:none; }
        .le-atmo-dataset-option:active:not(:disabled) { transform:none; }
      }
      @media (max-height:700px) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { margin-top:clamp(145px,28vh,230px); }
        .le-sfv--atmosphere .le-sfv-panel { padding-bottom:calc(env(safe-area-inset-bottom) + 112px); }
      }
      @media (orientation:landscape) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { width:min(70vw,620px); margin-top:clamp(105px,22vh,190px); }
      }
    `;
    document.head.appendChild(style);
  }
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
    await loadScript(SCRIPT_PATHS[0], () => !!window.LiveEarthUniversalGridSystem?.loadSnapshot);
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
  // This controller calls the shared Earth Engine directly and owns its view renderer.
async function initializeEngineView(view, viewId) {
  if (!view?.root || !view?.panel || !viewId) throw new TypeError("A mounted world view and stable world id are required.");
  const T = await import("../vendor/three.module.js");
  const engine = await import("../EarthEngine/Core/earth-engine.js");
  const { createCountryBordersSkin } = await import("./country-borders-skin.js");
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

  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGlobe = null;
  let countryBorders = null;
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
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.75 });
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
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.75 });
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

    // Country boundaries are an Atmosphere-only overlay. Attach them to the
    // surface so they inherit its base texture alignment and globe rotation.
    try {
      countryBorders = await createCountryBordersSkin({
        THREE: T,
        earthGroup: earthGlobe.surface,
        // Hug the satellite surface (radius 1.000) with only 0.0015 clearance.
        // This prevents the country overlay from protruding beyond the globe limb.
        radius: 1.0015,
        color: 0x3a5568,
        opacity: 0.20,
        lineWidth: 0.0048,
        renderOrder: 10
      });
      if (countryBorders) root.dataset.countryBorders = "natural-earth-50m";
    } catch (error) {
      console.warn("[LIVE // EARTH] Atmosphere country borders could not be loaded; the base globe will remain available.", error);
    }
    if (disposed) {
      countryBorders?.dispose?.(); countryBorders = null;
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
      };
      const onPointerDown = event => {
        if (!isEnabled()) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        if (pointers.size === 1) {
          beginAnchor(pointers.get(event.pointerId));
        } else if (pointers.size === 2) {
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
      countryBorders?.dispose?.(); countryBorders = null;
      delete root.dataset.countryBorders;
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
      setCountryBordersStyle(style) {
        countryBorders?.setStyle?.(style);
        requestRender();
      },
      requestRender,
      dispose
    });
  } catch (error) {
    disposed = true;
    resizeObserver?.disconnect();
    gestureController?.dispose?.();
    countryBorders?.dispose?.(); countryBorders = null;
    earthGlobe?.dispose?.();
    renderer?.dispose?.();
    canvas.remove();
    root.classList.remove("le-world-engine-host");
    throw error;
  }
}


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
    .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(3,12,23,.48),rgba(3,9,18,.16) 48%,rgba(2,7,14,.62));backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
    .le-world-engine-host .le-sfv-head,.le-world-engine-host .le-sfv-body{pointer-events:auto}
    .le-world-engine-host .le-sfv-body{max-height:calc(100% - 150px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .le-world-engine-host .le-sfv-head{ text-shadow:0 2px 18px rgba(0,0,0,.85) }
    .le-world-engine-host .le-sfv-card{background:rgba(4,13,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  `;
  document.head.appendChild(style);
}


  function activateView() {
    installHudStyle();
    const view = runtime.mount(ATMOSPHERE_VIEW.id);
    if (!view) return () => {};
    document.body.classList.add('le-atmosphere-fullscreen-open');

    // The globe is the view's immediate baseline. Scientific tools and data
    // are deliberately not requested until the user chooses a dataset.
    // Start with the globe unobstructed. The Atmosphere-only round button
    // reveals the existing datasets, colour scale and provenance on demand.
    // Global Orbs and their shared dock remain owned by the existing runtime.
    view.panel.id = 'le-atmo-hud-panel';
    view.panel.classList.add('le-atmo-hud-hidden');
    const hudToggle = runtime.el('button', 'le-atmo-hud-toggle', '☰');
    hudToggle.type = 'button';
    hudToggle.setAttribute('aria-controls', 'le-atmo-hud-panel');
    hudToggle.setAttribute('aria-expanded', 'false');
    hudToggle.setAttribute('aria-label', 'Open Atmosphere controls');
    hudToggle.title = 'Open Atmosphere controls';
    hudToggle.addEventListener('click', () => {
      const hidden = view.panel.classList.toggle('le-atmo-hud-hidden');
      const label = hidden ? 'Open Atmosphere controls' : 'Close Atmosphere controls';
      hudToggle.textContent = hidden ? '☰' : '×';
      hudToggle.setAttribute('aria-expanded', String(!hidden));
      hudToggle.setAttribute('aria-label', label);
      hudToggle.title = label;
    });
    view.root.appendChild(hudToggle);
    const status = runtime.el('p', 'le-sfv-status', 'Opening the Earth Engine globe…');
    status.dataset.state = 'neutral';
    view.body.appendChild(status);

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
      temperature: { ids: ['earth.atmosphere.air_temperature'], title: 'NOAA · 2 m air temperature', units: 'degree_Celsius', displayUnits: '°C', min: -80, max: 60, ticks: ['−80°','−60°','−10°','45°','60°'], source: 'NOAA NCEP · GFS 0.25° analysis · 2 m air temperature' },
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
      button.dataset.orbSymbol = ({ temperature: '°', pressure: '◉', wind: '↗', moisture: '≈' })[item.id] || '';
      button.setAttribute('aria-label', `${item.label}. ${item.detail}. Load verified NOAA field.`);
      const name = runtime.el('strong', 'le-atmo-dataset-name', item.label);
      const description = runtime.el('span', 'le-atmo-dataset-detail', item.detail);
      const state = runtime.el('span', 'le-atmo-dataset-state', 'LOAD VERIFIED FIELD');
      button.append(name, description, state);
      datasetGrid.appendChild(button);
      datasetButtons.set(item.id, button);
    }
    selector.appendChild(datasetGrid);
    view.body.appendChild(selector);

    const details = runtime.card('NOAA · Atmospheric field', 'Select a dataset to load its latest verified GFS grid.');
    details.hidden = true;
    const range = runtime.el('div', 'le-atmo-range');
    const rangeValue = runtime.el('strong', '', '—');
    range.appendChild(rangeValue);
    const rangeUnit = runtime.el('span', '', 'Verified global range');
    range.appendChild(rangeUnit);
    details.appendChild(range);
    const legend = runtime.el('div', 'le-atmo-legend');
    legend.setAttribute('role', 'img');
    legend.setAttribute('aria-label', 'Selected atmospheric field colour scale');
    const legendTitle = runtime.el('span', 'le-atmo-legend-title', 'Field scale');
    legend.appendChild(legendTitle);
    legend.appendChild(runtime.el('div', 'le-atmo-legend-bar'));
    const legendTicks = runtime.el('div', 'le-atmo-legend-ticks');
    legend.appendChild(legendTicks);
    details.appendChild(legend);
    const disclosure = runtime.el('details', 'le-atmo-details');
    disclosure.appendChild(runtime.el('summary', '', 'Data details & provenance'));
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    disclosure.appendChild(metric);
    details.appendChild(disclosure);
    view.body.appendChild(details);
    const source = runtime.el('p', 'le-sfv-attribution', 'NOAA NCEP · Global Forecast System · 0.25° analysis');
    source.hidden = true;
    view.body.appendChild(source);

    let closed = false, layerDispose = null, gridHandle = null, windArrowsHandle = null, gridRoot = null, worldGlobe = null;
    let dataRequest = null;
    function removeActiveLayer() {
      if (typeof layerDispose === 'function') {
        const dispose = layerDispose;
        layerDispose = null;
        dispose();
      }
      try { windArrowsHandle?.dispose?.(); } catch (_) {}
      windArrowsHandle = null;
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
      dataRequest?.abort();
      removeActiveLayer();
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Atmosphere Engine globe cleanup failed.', error); }
      worldGlobe = null;
    };

    function setSelectedDataset(id) {
      selectedDataset = id;
      if (worldGlobe?.setCountryBordersStyle) {
        if (id === "temperature") {
          // Temperature overlay sits at renderOrder 4. Keep borders beneath it.
          worldGlobe.setCountryBordersStyle({ color: 0x263746, opacity: 0.32, renderOrder: 3 });
        } else if (id) {
          // Other atmospheric fields retain the subdued satellite guide style.
          worldGlobe.setCountryBordersStyle({ color: 0x3a5568, opacity: 0.32, renderOrder: 10 });
        }
      }
      for (const [key, button] of datasetButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
    }

    function formatFieldValue(value) {
      if (!Number.isFinite(value)) return '—';
      return value.toFixed(1);
    }

    function updateLegend(grid, config) {
      const min = config.min === null ? grid.min : config.min;
      const max = config.max === null ? grid.max : config.max;
      legendTitle.textContent = `${config.title.replace('NOAA · ','')} · ${config.displayUnits}`;
      const legendBar = legend.querySelector('.le-atmo-legend-bar');
      if (legendBar) legendBar.style.background = config === FIELD_CONFIG.temperature ? TEMPERATURE_LEGEND : '';
      legendTicks.replaceChildren();
      const ticks = config.ticks || Array.from({ length: 5 }, (_, index) => {
        const value = min + (max - min) * index / 4;
        return `${formatFieldValue(value)} ${config.displayUnits}`;
      });
      for (const tick of ticks) legendTicks.appendChild(runtime.el('span', '', tick));
      return { min, max };
    }

    function makeWindArrows(THREE, earth, directionGrid) {
      const def = directionGrid.definition;
      const values = directionGrid.values;
      const positions = [];
      const rowStep = 36;
      const colStep = 48;
      const rad = Math.PI / 180;
      for (let y = 18; y < def.height - 18; y += rowStep) {
        const latitude = def.latStart + y * def.latStep;
        const phi = latitude * rad;
        for (let x = 24; x < def.width - 24; x += colStep) {
          const index = y * def.width + x;
          const direction = values[index];
          if (!Number.isFinite(direction)) continue;
          const longitude = def.lonStart + x * def.lonStep;
          const lambda = longitude * rad;
          const normal = new THREE.Vector3(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).normalize();
          const north = new THREE.Vector3(-Math.sin(phi) * Math.cos(lambda), Math.cos(phi), Math.sin(phi) * Math.sin(lambda)).normalize();
          const east = new THREE.Vector3(-Math.sin(lambda), 0, -Math.cos(lambda)).normalize();
          const bearingTo = ((direction + 180) % 360) * rad;
          const tangent = north.multiplyScalar(Math.cos(bearingTo)).add(east.multiplyScalar(Math.sin(bearingTo))).normalize();
          const side = new THREE.Vector3().crossVectors(normal, tangent).normalize();
          const start = normal.clone().multiplyScalar(1.018);
          const tip = normal.clone().add(tangent.clone().multiplyScalar(0.028)).normalize().multiplyScalar(1.018);
          const headBase = tip.clone().add(tangent.clone().multiplyScalar(-0.009));
          const headLeft = headBase.clone().add(side.clone().multiplyScalar(0.006));
          const headRight = headBase.clone().add(side.clone().multiplyScalar(-0.006));
          positions.push(start.x,start.y,start.z,tip.x,tip.y,tip.z,
            tip.x,tip.y,tip.z,headLeft.x,headLeft.y,headLeft.z,
            tip.x,tip.y,tip.z,headRight.x,headRight.y,headRight.z);
        }
      }
      if (!positions.length) return null;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({ color: 0xe5f8ff, transparent: true, opacity: 0.88, depthTest: true, depthWrite: false });
      const lines = new THREE.LineSegments(geometry, material);
      lines.name = 'liveEarthAtmosphereWindDirectionVectors';
      lines.renderOrder = 9;
      earth.add(lines);
      return { dispose() { lines.removeFromParent(); geometry.dispose(); material.dispose(); } };
    }

    async function selectDataset(datasetKey) {
      if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
      const config = FIELD_CONFIG[datasetKey];
      if (!config) return;
      if (selectedDataset === datasetKey && layerDispose) {
        dataRequest?.abort(); dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(null);
        details.hidden = true; source.hidden = true;
        runtime.setStatus(status, `${datasetOptions.find(item => item.id === datasetKey).label} layer hidden. The Earth remains active.`, 'neutral');
        worldGlobe?.requestRender?.();
        return;
      }
      dataRequest?.abort(); dataRequest = null;
      removeActiveLayer();
      setSelectedDataset(datasetKey);
      details.hidden = false; source.hidden = false;
      details.querySelector('h2').textContent = config.title;
      details.querySelector('p').textContent = `Verified global ${config.displayUnits} field · NOAA GFS 0.25°`;
      source.textContent = config.source + ' · model analysis, not direct instrument readings';
      const controller = new AbortController();
      dataRequest = controller;
      const button = datasetButtons.get(datasetKey);
      button.disabled = true;
      const label = datasetOptions.find(item => item.id === datasetKey).label;
      runtime.setStatus(status, `Loading and verifying NOAA ${label.toLowerCase()} grids…`, 'neutral');
      try {
        await loadSharedGridTools();
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        const grids = await Promise.all(config.ids.map(datasetId => window.LiveEarthUniversalGridSystem.loadSnapshot({
          manifestUrl: MANIFEST_URL, datasetId, signal: controller.signal
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
        rangeUnit.textContent = `Verified global range · ${config.displayUnits}`;
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
          makeMetric('Wind vectors', '10 m', 'U/V components');
        }
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe is not ready.');
        layerDispose = worldGlobe.attachLayer(`atmosphere-${datasetKey}`, ({ THREE, earth }) => {
          if (!THREE || !earth?.add) throw new Error('The Earth Engine did not provide its Three.js surface.');
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-atmosphere-${datasetKey}-layer`;
          const colorMin = datasetKey === 'temperature' ? -80 : (datasetKey === 'moisture' ? 0 : bounds.min);
          const colorMax = datasetKey === 'temperature' ? 60 : (datasetKey === 'moisture' ? 100 : bounds.max);
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE, grid, radius: 1.009,
            opacity: datasetKey === 'temperature' ? 0.75 : 0.78,
            min: colorMin, max: colorMax,
            colorStops: datasetKey === 'temperature' ? TEMPERATURE_COLOR_STOPS : undefined,
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
          if (datasetKey === 'wind') windArrowsHandle = makeWindArrows(THREE, earth, grids[1]);
          gridRoot.add(gridHandle.mesh);
          if (gridHandle.auraMesh) gridRoot.add(gridHandle.auraMesh);
          earth.add(gridRoot);
          return () => {
            try { windArrowsHandle?.dispose?.(); } catch (_) {}
            windArrowsHandle = null;
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
        const confirmation = datasetKey === 'wind'
          ? 'Wind · colour shows speed; directional arrows show the 10 m wind direction.'
          : `${label} · NOAA GFS global grid verified.`;
        runtime.setStatus(status, confirmation, 'success');
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          removeActiveLayer();
          setSelectedDataset(null);
          details.hidden = true; source.hidden = true;
          runtime.setStatus(status, `${label} data could not be displayed. The base globe remains active. ${error?.message || ''}`, 'error');
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
        runtime.setStatus(status, 'Earth Engine globe ready · choose an atmospheric dataset to add its live layer.', 'success');
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          runtime.setStatus(status, `The Earth Engine globe could not open. ${error?.message || ''}`, 'error');
        }
      }
    })();

    return cleanup;
  }
  if (runtime.registerFeature(ATMOSPHERE_VIEW.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-atmosphere-view-controller-ready', { detail: { id: ATMOSPHERE_VIEW.id } }));
  }
})();
