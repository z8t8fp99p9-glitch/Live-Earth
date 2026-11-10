/* LIVE // EARTH — Weather
   Forecast-driven illustrated landscape with a minimal, accessible weather UI.
   The illustration is 2D SVG; no characters, 3D renderer, terrain engine or duplicate Orb dock.
   Location is read only from the existing shared Location Orb service. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Shared Stacks feature runtime is unavailable.');
    return;
  }

  const { mount, el, globe, isActive } = runtime;
  const STYLE_ID = 'le-weather-living-ui-style';
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';
  const MAX_HOURS = 18;

  function installStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather {
        position:absolute!important; inset:0!important; width:100%!important; height:100%!important;
        max-width:none!important; overflow:hidden!important; padding:0!important; margin:0!important;
        border:0!important; border-radius:0!important; background:#9bbbc9!important;
        isolation:isolate; pointer-events:none;
      }
      .le-sfv--weather > .le-sfv-panel { display:none!important; }
      .le-sfv--weather > .le-weather-app {
        position:absolute; inset:0; width:100%; height:100%; overflow:hidden;
        isolation:isolate; pointer-events:none;
        background:linear-gradient(180deg,#79b9e8 0%,#c5e2e8 54%,#f3dfc9 100%);
        color:#fff; font-family:system-ui,-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;
      }
      .le-weather-app::before {
        content:""; position:absolute; z-index:3; inset:0 0 auto; height:58%;
        background:linear-gradient(180deg,rgba(14,39,62,.19),rgba(14,39,62,.07) 52%,transparent);
        pointer-events:none;
      }
      .le-weather-app *, .le-weather-app *::before, .le-weather-app *::after { box-sizing:border-box; }
      .le-weather-art { position:absolute; inset:0; width:100%; height:100%; overflow:hidden; pointer-events:none; }
      .le-weather-art svg { position:absolute; inset:0; width:100%; height:100%; display:block; }
      .le-weather-art .le-weather-wide { display:none; }
      .le-weather-art .le-weather-sky { z-index:0; }
      .le-weather-art .le-weather-land { z-index:1; }
      .le-weather-art .le-weather-effects { z-index:2; }
      .le-weather-app[data-orientation="landscape"] .le-weather-portrait { display:none; }
      .le-weather-app[data-orientation="landscape"] .le-weather-wide { display:block; }
      .le-weather-app[data-phase="day"] { background:linear-gradient(180deg,#69afe5 0%,#b9dfe9 53%,#f4e2cf 100%); }
      .le-weather-app[data-phase="dawn"] { background:linear-gradient(180deg,#718cb7 0%,#d8a9a7 43%,#f5d4b3 100%); }
      .le-weather-app[data-phase="evening"] { background:linear-gradient(180deg,#394f7d 0%,#c07f83 48%,#f2bd91 100%); }
      .le-weather-app[data-phase="night"] { background:linear-gradient(180deg,#14274c 0%,#344c78 54%,#596d83 100%); }
      .le-weather-app[data-condition="overcast"] { background:linear-gradient(180deg,#71899c 0%,#a9bdc3 55%,#c5c8bd 100%); }
      .le-weather-app[data-condition="rain"] { background:linear-gradient(180deg,#536d86 0%,#879eac 54%,#9caeaa 100%); }
      .le-weather-app[data-condition="storm"] { background:linear-gradient(180deg,#202f49 0%,#526577 56%,#667a78 100%); }
      .le-weather-app[data-condition="fog"] { background:linear-gradient(180deg,#a5b9c1 0%,#c6d0cb 56%,#b7c1b3 100%); }
      .le-weather-app[data-condition="snow"] { background:linear-gradient(180deg,#91b2cd 0%,#d7e3e8 56%,#e9e8df 100%); }
      .le-weather-app[data-condition="neutral"] { background:linear-gradient(180deg,#7899b1 0%,#b5c9ca 55%,#c5c6b5 100%); }

      .le-weather-sun,.le-weather-moon,.le-weather-stars,.le-weather-clouds,
      .le-weather-rain,.le-weather-snow,.le-weather-fog { transition:opacity 1.2s ease; }
      .le-weather-sun { opacity:1; }
      .le-weather-moon,.le-weather-stars,.le-weather-clouds,.le-weather-rain,.le-weather-snow,.le-weather-fog { opacity:0; }
      .le-weather-clouds { transform:translateX(0); animation:le-weather-cloud-drift var(--cloud-duration,54s) ease-in-out infinite alternate; transform-origin:center; }
      .le-weather-cloud { fill:#fffdf8; }
      .le-weather-rain line { stroke:#eaf7ff; stroke-width:3; stroke-linecap:round; animation:le-weather-rainfall .78s linear infinite; }
      .le-weather-snow circle { fill:#fff; animation:le-weather-snowfall 5.5s ease-in-out infinite; }
      .le-weather-river-highlight { stroke-dasharray:18 18; animation:le-weather-riverflow 15s linear infinite; }
      .le-weather-fog { fill:#f4f5ef; opacity:0; filter:blur(16px); }
      .le-weather-app[data-condition="partly-cloudy"] .le-weather-clouds { opacity:.48; }
      .le-weather-app[data-condition="cloudy"] .le-weather-clouds,
      .le-weather-app[data-condition="overcast"] .le-weather-clouds { opacity:.92; }
      .le-weather-app[data-condition="rain"] .le-weather-clouds,
      .le-weather-app[data-condition="storm"] .le-weather-clouds,
      .le-weather-app[data-condition="snow"] .le-weather-clouds,
      .le-weather-app[data-condition="fog"] .le-weather-clouds { opacity:.98; }
      .le-weather-app[data-condition="rain"] .le-weather-rain,
      .le-weather-app[data-condition="storm"] .le-weather-rain { opacity:.86; }
      .le-weather-app[data-condition="snow"] .le-weather-snow { opacity:.95; }
      .le-weather-app[data-condition="fog"] .le-weather-fog { opacity:.44; }
      .le-weather-app[data-phase="night"] .le-weather-sun { opacity:0; }
      .le-weather-app[data-phase="night"] .le-weather-moon,
      .le-weather-app[data-phase="night"] .le-weather-stars { opacity:.94; }
      .le-weather-app[data-phase="dawn"] .le-weather-sun,
      .le-weather-app[data-phase="evening"] .le-weather-sun { opacity:.78; }
      .le-weather-app[data-condition="overcast"] .le-weather-sun,
      .le-weather-app[data-condition="rain"] .le-weather-sun,
      .le-weather-app[data-condition="snow"] .le-weather-sun,
      .le-weather-app[data-condition="fog"] .le-weather-sun,
      .le-weather-app[data-condition="storm"] .le-weather-sun { opacity:.08; }
      .le-weather-app[data-phase="night"] .le-weather-land-tint { opacity:.42; }
      .le-weather-app[data-condition="rain"] .le-weather-land-tint,
      .le-weather-app[data-condition="storm"] .le-weather-land-tint { opacity:.18; }
      .le-weather-app[data-condition="fog"] .le-weather-land-tint { opacity:.12; }

      .le-weather-atmosphere { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; isolation:isolate; }
      .le-weather-sky { position:absolute; inset:0; background:linear-gradient(180deg,#78b8e5 0%,#c7e2e7 55%,#f2d9b9 100%); transition:background 1.5s ease,filter 1.5s ease; }
      .le-weather-stars { position:absolute; z-index:1; top:8%; left:8%; width:2px; height:2px; opacity:0; background:#fff; border-radius:50%; box-shadow:42px 55px 0 0 #fff,112px 18px 0 0 #fff,178px 95px 0 0 #fff,245px 42px 0 0 #fff,310px 120px 0 0 #fff,375px 22px 0 0 #fff,445px 82px 0 0 #fff,510px 35px 0 0 #fff,585px 105px 0 0 #fff,660px 48px 0 0 #fff,725px 125px 0 0 #fff,805px 64px 0 0 #fff; transition:opacity 1s ease; animation:le-weather-star-twinkle 4.8s ease-in-out infinite alternate; }
      .le-weather-app[data-phase="night"] .le-weather-stars { opacity:.82; }
      .le-weather-sun { position:absolute; top:var(--sun-top,13%); right:14%; width:clamp(58px,16vw,104px); aspect-ratio:1; border-radius:50%; opacity:.9; background:radial-gradient(circle,#fffde7 0 24%,#ffe6a0 44%,#ffdb7b99 61%,transparent 72%); filter:drop-shadow(0 0 25px #ffe9a8aa); transition:opacity 1s ease,transform 1.5s ease; }
      .le-weather-sun::after { content:""; position:absolute; inset:-28%; border-radius:50%; background:repeating-conic-gradient(from 0deg,#fff0 0 9deg,#fff5 10deg 11deg,#fff0 12deg 30deg); mask:radial-gradient(circle,transparent 47%,#000 50% 55%,transparent 60%); animation:le-weather-sun-turn 90s linear infinite; }
      .le-weather-moon { position:absolute; top:12%; right:16%; width:clamp(44px,12vw,76px); aspect-ratio:1; border-radius:50%; opacity:0; background:radial-gradient(circle at 36% 34%,#fff 0 5%,#e7efff 40%,#b7c7e5 74%,#9aafd0 100%); box-shadow:0 0 28px #d7e7ff88; transition:opacity 1s ease; }
      .le-weather-cloud-layer { position:absolute; inset:5% -10% auto; height:38%; opacity:var(--le-cloud-opacity,.35); transition:opacity 1s ease; }
      .le-weather-cloud { position:absolute; width:clamp(145px,42vw,280px); height:auto; fill:#fff; filter:drop-shadow(0 8px 12px #456d8640); animation:le-weather-cloud-drift var(--cloud-duration,54s) ease-in-out infinite alternate; }
      .le-weather-cloud--one { top:20%; left:-3%; }
      .le-weather-cloud--two { top:1%; right:5%; width:clamp(125px,34vw,225px); opacity:.83; animation-direction:alternate-reverse; animation-duration:68s; }
      .le-weather-cloud--three { top:48%; left:39%; width:clamp(110px,30vw,205px); opacity:.65; animation-duration:77s; }
      .le-weather-landscape { position:absolute; left:0; right:0; bottom:0; width:100%; height:72%; overflow:hidden; }
      .le-weather-landscape svg { display:block; width:100%; height:100%; overflow:hidden; }
      .le-weather-landscape-wide { display:none; position:absolute; inset:auto 0 0; width:100%; height:78%; overflow:hidden; }
      .le-weather-landscape-wide svg { display:block; width:100%; height:100%; }
      @media (orientation:landscape) {
        .le-weather-landscape { display:none; }
        .le-weather-landscape-wide { display:block; }
      }
      .le-weather-river-flow { stroke-dasharray:9 8; animation:le-weather-riverflow 10s linear infinite; }
      .le-weather-rain,.le-weather-snow { position:absolute; inset:-8% 0 0; overflow:hidden; opacity:0; transition:opacity .5s ease; }
      .le-weather-particle { position:absolute; top:-12%; left:var(--particle-x); animation:le-weather-fall var(--particle-duration,1.3s) linear var(--particle-delay,0s) infinite; will-change:transform; }
      .le-weather-rain .le-weather-particle { width:1.5px; height:clamp(15px,3.5vh,28px); border-radius:2px; background:linear-gradient(180deg,transparent,#e5f7ffcc); transform:rotate(13deg); }
      .le-weather-snow .le-weather-particle { width:var(--particle-size,5px); height:var(--particle-size,5px); border-radius:50%; background:#fff; box-shadow:0 0 8px #fff9; animation-name:le-weather-snow-fall; animation-duration:var(--particle-duration,5s); }
      .le-weather-fog { position:absolute; inset:38% -20% 0; opacity:0; background:linear-gradient(180deg,#e7f1ed00,#e2eee8a8 54%,#e8f0e8aa); filter:blur(16px); transition:opacity 1.2s ease; }
      .le-weather-lightning { position:absolute; inset:0; opacity:0; background:#e9f6ff; mix-blend-mode:screen; pointer-events:none; }
      .le-weather-app[data-phase="dawn"] .le-weather-sky { background:linear-gradient(180deg,#90b9d8,#e9c4aa 58%,#f3d4a8); }
      .le-weather-app[data-phase="day"] .le-weather-sky { background:linear-gradient(180deg,#69b7e5,#c9e6e9 57%,#f2d8ad); }
      .le-weather-app[data-phase="evening"] .le-weather-sky { background:linear-gradient(180deg,#697fb3 0%,#d69b9b 52%,#f2c18d 100%); }
      .le-weather-app[data-phase="night"] .le-weather-sky { background:linear-gradient(180deg,#172c50 0%,#344c70 58%,#667a86 100%); }
      .le-weather-app[data-condition="cloudy"] .le-weather-sky,
      .le-weather-app[data-condition="overcast"] .le-weather-sky { filter:saturate(.68) brightness(.94); }
      .le-weather-app[data-condition="rain"] .le-weather-sky,
      .le-weather-app[data-condition="storm"] .le-weather-sky { background:linear-gradient(180deg,#425b76 0%,#718b9a 58%,#94a6a1 100%); filter:saturate(.7) brightness(.82); }
      .le-weather-app[data-condition="snow"] .le-weather-sky { background:linear-gradient(180deg,#819eb7 0%,#d0e0e7 65%,#e8eee9 100%); }
      .le-weather-app[data-condition="fog"] .le-weather-sky { background:linear-gradient(180deg,#9aaeb7,#c5d1cc 70%,#dce3d8); }
      .le-weather-app[data-phase="night"] .le-weather-sun { opacity:0; transform:translateY(24px); }
      .le-weather-app[data-phase="night"] .le-weather-moon { opacity:.96; }
      .le-weather-app[data-condition="rain"] .le-weather-sun,
      .le-weather-app[data-condition="storm"] .le-weather-sun { opacity:0; }
      .le-weather-app[data-condition="rain"] .le-weather-cloud-layer,
      .le-weather-app[data-condition="storm"] .le-weather-cloud-layer { opacity:var(--le-cloud-opacity,.8); }
      .le-weather-app[data-condition="rain"] .le-weather-rain,
      .le-weather-app[data-condition="storm"] .le-weather-rain { opacity:var(--le-rain-opacity,.7); }
      .le-weather-app[data-condition="snow"] .le-weather-snow { opacity:var(--le-snow-opacity,.8); }
      .le-weather-app[data-condition="fog"] .le-weather-fog { opacity:.9; }
      .le-weather-app[data-condition="storm"] .le-weather-lightning { animation:le-weather-flash 9s linear infinite; }
      .le-weather-app[data-condition="rain"] .le-weather-landscape,
      .le-weather-app[data-condition="storm"] .le-weather-landscape { filter:saturate(.86) brightness(.9); }
      .le-weather-app[data-condition="snow"] .le-weather-landscape { filter:saturate(.72) brightness(1.08); }
      .le-weather-app[data-condition="fog"] .le-weather-landscape { filter:saturate(.72) brightness(1.05); }
      .le-weather-app[data-condition="neutral"] .le-weather-sun { opacity:.28; }
      @keyframes le-weather-sun-turn { to { transform:rotate(360deg); } }
      @keyframes le-weather-star-twinkle { from { filter:opacity(.55); } to { filter:opacity(1); } }
      @keyframes le-weather-fall { to { transform:translate3d(var(--particle-drift,16px),115vh,0); } }
      @keyframes le-weather-snow-fall { 0% { transform:translate3d(0,-8vh,0); } 50% { transform:translate3d(var(--particle-drift,18px),48vh,0); } 100% { transform:translate3d(calc(var(--particle-drift,18px) * -1),110vh,0); } }
      @keyframes le-weather-flash { 0%,92%,94%,100% { opacity:0; } 92.5% { opacity:.22; } 93% { opacity:0; } 93.5% { opacity:.12; } }
      .le-weather-top {
        position:absolute; z-index:4; top:calc(env(safe-area-inset-top,0px) + 18px);
        left:clamp(20px,4.8vw,54px); right:clamp(20px,4.8vw,54px);
        pointer-events:none; text-shadow:0 2px 16px rgba(17,43,65,.22);
      }
      .le-weather-brand { display:flex; align-items:center; gap:12px; font-size:clamp(22px,3.4vh,30px); font-weight:650; letter-spacing:-.04em; }
      .le-weather-brand-mark {
        width:42px;height:42px;display:grid;place-items:center;border-radius:50%;
        background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.5);
        box-shadow:inset 0 1px 4px #fff8,0 5px 18px #17344a30;font-size:22px;
      }
      .le-weather-location { margin:8px 0 0 54px; font-size:10px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; opacity:.86; }
      .le-weather-location::before { content:""; display:inline-block; width:7px;height:7px;border-radius:50%;background:#bdf1cf;margin:0 9px 1px 0;box-shadow:0 0 10px #d8ffe3; }
      .le-weather-hero {
        position:absolute; z-index:4; top:clamp(150px,23vh,230px);
        left:clamp(22px,5vw,58px); right:clamp(22px,5vw,58px);
        display:flex; align-items:center; gap:clamp(12px,3vw,28px);
        pointer-events:none; text-shadow:0 3px 18px rgba(17,43,65,.2);
      }
      .le-weather-hero-copy { min-width:0; }
      .le-weather-eyebrow { font-size:10px; font-weight:750; letter-spacing:.25em; text-transform:uppercase; opacity:.88; margin-bottom:7px; }
      .le-weather-temp-line { display:flex; align-items:flex-start; gap:5px; line-height:.9; }
      .le-weather-temperature { font-size:clamp(76px,14vw,116px); font-weight:300; letter-spacing:-.085em; font-variant-numeric:tabular-nums; }
      .le-weather-degree { font-size:clamp(28px,5vw,42px); font-weight:350; margin-top:7px; }
      .le-weather-time { margin-top:14px; font-size:13px; font-weight:500; letter-spacing:.015em; opacity:.92; }
      .le-weather-condition-vertical {
        writing-mode:vertical-rl; transform:rotate(180deg); font-size:clamp(15px,2.2vw,19px);
        font-weight:600; letter-spacing:.01em; opacity:.96; max-height:118px;
        overflow:hidden; text-overflow:ellipsis;
      }
      .le-weather-unavailable { font-size:14px; margin-top:12px; opacity:.92; max-width:280px; line-height:1.45; }
      .le-weather-card {
        position:absolute; z-index:5; left:clamp(14px,3.5vw,40px); right:clamp(14px,3.5vw,40px);
        bottom:calc(env(safe-area-inset-bottom,0px) + clamp(142px,18vh,184px));
        min-height:164px; padding:18px 18px 16px; border-radius:28px;
        color:#17212a; background:rgba(255,255,255,.96);
        box-shadow:0 18px 50px rgba(20,42,55,.18),0 2px 8px rgba(20,42,55,.08);
        border:1px solid rgba(255,255,255,.8); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
        pointer-events:auto; overflow:hidden;
      }
      .le-weather-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:15px; }
      .le-weather-card-title { margin:0; font-size:15px; font-weight:700; letter-spacing:-.015em; }
      .le-weather-card-subtitle { font-size:10px; color:#78828a; letter-spacing:.12em; text-transform:uppercase; white-space:nowrap; }
      .le-weather-empty { min-height:88px; display:flex; align-items:center; justify-content:center; text-align:center; color:#71808a; font-size:13px; line-height:1.45; padding:8px 20px; }
      .le-weather-hours {
        display:flex; gap:10px; overflow-x:auto; overflow-y:hidden; padding:1px 1px 9px;
        scrollbar-width:thin; scrollbar-color:#c7d3d9 transparent; overscroll-behavior-x:contain;
        -webkit-overflow-scrolling:touch;
      }
      .le-weather-hours::-webkit-scrollbar { height:4px; }
      .le-weather-hours::-webkit-scrollbar-thumb { background:#c7d3d9; border-radius:4px; }
      .le-weather-hour {
        appearance:none; flex:0 0 66px; min-width:66px; min-height:91px; border:1px solid #e8edf0;
        border-radius:17px; background:#f8fafb; color:#19232c; display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:7px; padding:9px 5px;
        font:inherit; cursor:pointer; transition:background .2s ease,border-color .2s ease,transform .2s ease;
      }
      .le-weather-hour[aria-pressed="true"] { background:#eaf5fb; border-color:#a8d1e5; box-shadow:inset 0 0 0 1px #c3e2ef; }
      .le-weather-hour:focus-visible { outline:3px solid #367ea5; outline-offset:2px; }
      .le-weather-hour-time { font-size:10px; color:#69757d; font-weight:600; white-space:nowrap; }
      .le-weather-hour-icon { font-size:21px; line-height:1; }
      .le-weather-hour-temp { font-size:17px; font-weight:700; font-variant-numeric:tabular-nums; }
      .le-weather-attribution {
        position:absolute; z-index:5; left:20px; right:20px;
        bottom:calc(env(safe-area-inset-bottom,0px) + clamp(119px,15.2vh,155px));
        text-align:center; font-size:10px; color:rgba(255,255,255,.95);
        text-shadow:0 1px 7px rgba(10,28,42,.45); pointer-events:auto;
      }
      .le-weather-attribution a { color:inherit; text-underline-offset:2px; }
      .le-weather-app[data-loading="true"] .le-weather-card-subtitle { color:#8a969d; }
      .le-weather-app[data-layout="compact"] .le-weather-hero { top:clamp(125px,19vh,180px); }
      .le-weather-app[data-layout="compact"] .le-weather-card { min-height:148px; padding:14px; }
      .le-weather-app[data-layout="compact"] .le-weather-hour { flex-basis:59px; min-width:59px; min-height:82px; }
      .le-weather-app[data-orientation="landscape"] .le-weather-top { top:calc(env(safe-area-inset-top,0px) + 14px); }
      .le-weather-app[data-orientation="landscape"] .le-weather-hero {
        top:clamp(105px,19vh,165px); left:clamp(24px,4vw,64px); right:auto; width:min(40vw,470px);
      }
      .le-weather-app[data-orientation="landscape"] .le-weather-temperature { font-size:clamp(64px,11vh,94px); }
      .le-weather-app[data-orientation="landscape"] .le-weather-card {
        left:auto; right:clamp(20px,3vw,48px); bottom:calc(env(safe-area-inset-bottom,0px) + clamp(112px,14vh,145px));
        width:min(53vw,760px); min-height:154px;
      }
      .le-weather-app[data-orientation="landscape"] .le-weather-attribution {
        left:auto; right:clamp(24px,4vw,64px); width:min(50vw,720px);
        bottom:calc(env(safe-area-inset-bottom,0px) + clamp(88px,10vh,110px)); text-align:right;
      }
      @media(max-width:390px) {
        .le-weather-card { padding:15px 13px 13px; min-height:154px; }
        .le-weather-hour { flex-basis:59px; min-width:59px; }
        .le-weather-card-subtitle { font-size:9px; }
        .le-weather-hero { top:clamp(142px,21vh,190px); }
        .le-weather-temperature { font-size:clamp(70px,18vw,88px); }
      }
      @media(max-height:720px) and (orientation:portrait) {
        .le-weather-hero { top:calc(env(safe-area-inset-top,0px) + 122px); }
        .le-weather-temperature { font-size:clamp(62px,12vw,88px); }
        .le-weather-card { bottom:calc(env(safe-area-inset-bottom,0px) + 128px); min-height:142px; }
        .le-weather-hour { min-height:76px; }
        .le-weather-attribution { bottom:calc(env(safe-area-inset-bottom,0px) + 106px); }
      }
      @media(orientation:landscape) and (max-height:520px) {
        .le-weather-app[data-orientation="landscape"] .le-weather-hero { top:calc(env(safe-area-inset-top,0px) + 90px); }
        .le-weather-app[data-orientation="landscape"] .le-weather-card { bottom:calc(env(safe-area-inset-bottom,0px) + 82px); min-height:128px; padding:12px; }
        .le-weather-app[data-orientation="landscape"] .le-weather-hour { min-height:72px; }
        .le-weather-app[data-orientation="landscape"] .le-weather-attribution { bottom:calc(env(safe-area-inset-bottom,0px) + 60px); }
      }
      @media(prefers-reduced-motion:reduce) {
        .le-weather-app *, .le-weather-app *::before, .le-weather-app *::after {
          animation:none!important; transition:none!important; scroll-behavior:auto!important;
        }
      }
      @media(prefers-contrast:more) {
        .le-weather-app::before { background:linear-gradient(180deg,rgba(5,24,42,.34),rgba(5,24,42,.12) 60%,transparent); }
        .le-weather-card { border:2px solid #263c4b; }
        .le-weather-hour { border-color:#8c9aa3; }
      }
      @media(forced-colors:active) {
        .le-weather-card,.le-weather-hour { border:1px solid CanvasText; }
        .le-weather-hour[aria-pressed="true"] { outline:2px solid Highlight; }
      }
      @keyframes le-weather-cloud-drift { from { transform:translateX(0); } to { transform:translateX(var(--le-cloud-drift,18px)); } }
      @keyframes le-weather-rainfall { from { transform:translateY(-12px); opacity:.12; } 30% { opacity:.8; } to { transform:translateY(28px); opacity:0; } }
      @keyframes le-weather-snowfall { 0%,100% { transform:translate(0,-8px); opacity:.2; } 50% { transform:translate(12px,18px); opacity:.9; } }
      @keyframes le-weather-riverflow { to { stroke-dashoffset:-180; } }
    `;
    document.head.appendChild(style);
  }

  function artworkMarkup() {
    return `
      <div class="le-weather-atmosphere" aria-hidden="true">
        <div class="le-weather-sky"></div>
        <div class="le-weather-stars" aria-hidden="true"></div>
        <div class="le-weather-sun"></div>
        <div class="le-weather-moon"></div>
        <div class="le-weather-cloud-layer">
          <svg class="le-weather-cloud le-weather-cloud--one" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
          <svg class="le-weather-cloud le-weather-cloud--two" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
          <svg class="le-weather-cloud le-weather-cloud--three" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
        </div>
        <div class="le-weather-fog"></div>
        <div class="le-weather-rain"></div>
        <div class="le-weather-snow"></div>
        <div class="le-weather-lightning"></div>
        <div class="le-weather-landscape">
          <svg viewBox="0 0 420 520" preserveAspectRatio="xMidYMax slice">
            <defs>
              <linearGradient id="le-weather-land-far" x2="0" y2="1"><stop stop-color="#c9c4c4"/><stop offset="1" stop-color="#a4a9b7"/></linearGradient>
              <linearGradient id="le-weather-land-mid" x2="0" y2="1"><stop stop-color="#b3a9c4"/><stop offset="1" stop-color="#858caf"/></linearGradient>
              <linearGradient id="le-weather-land-near" x2="0" y2="1"><stop stop-color="#91a9b1"/><stop offset="1" stop-color="#617e91"/></linearGradient>
              <linearGradient id="le-weather-land-front" x2="0" y2="1"><stop stop-color="#6d8e8e"/><stop offset="1" stop-color="#3f6d6c"/></linearGradient>
              <linearGradient id="le-weather-river" x2="0" y2="1"><stop stop-color="#a5d9dc"/><stop offset=".5" stop-color="#65b7c5"/><stop offset="1" stop-color="#4189a2"/></linearGradient>
            </defs>
            <g>
              <path d="M0 115 Q62 72 121 112 T242 103 T420 95 V520 H0Z" fill="url(#le-weather-land-far)" opacity=".96"/>
              <path d="M0 180 Q67 122 144 172 T286 160 T420 148 V520 H0Z" fill="url(#le-weather-land-mid)"/>
              <path d="M0 250 Q79 190 158 244 T310 232 T420 218 V520 H0Z" fill="url(#le-weather-land-near)"/>
              <path d="M0 330 Q76 275 146 320 T286 310 T420 298 V520 H0Z" fill="url(#le-weather-land-front)"/>
              <path d="M0 405 Q74 365 145 395 T286 390 T420 375 V520 H0Z" fill="#557e80" opacity=".7"/>
              <path d="M165 520 Q177 474 196 442 Q212 412 205 382 Q196 352 218 329 Q241 304 250 276 Q258 246 240 222 Q226 204 239 185 Q255 166 268 148 L290 148 Q272 180 264 201 Q253 228 273 250 Q294 276 276 309 Q261 337 239 359 Q219 380 231 410 Q244 442 225 472 Q214 494 207 520Z" fill="url(#le-weather-river)"/>
              <path class="le-weather-river-flow" d="M195 520 Q207 475 220 445 Q232 414 215 385 Q200 355 226 330 Q250 306 262 277 Q273 248 253 224 Q239 207 254 184 Q265 165 277 148" fill="none" stroke="#e3f6ef" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>
              <path d="M0 455 Q92 425 158 452 T286 448 T420 432 V520 H0Z" fill="#426e6d" opacity=".52"/>
              <g fill="#f4d8c8" stroke="#806b7b" stroke-width="2">
                <path d="M86 290 L109 269 L132 290 V320 H86Z"/><path d="M80 290 L109 263 L138 290" fill="none" stroke="#b78383" stroke-width="5"/>
                <path d="M294 350 L315 330 L337 350 V378 H294Z"/><path d="M288 350 L315 324 L343 350" fill="none" stroke="#b78383" stroke-width="5"/>
              </g>
              <g fill="#698d83">
                <circle cx="42" cy="320" r="20"/><circle cx="62" cy="330" r="16"/><circle cx="365" cy="375" r="23"/><circle cx="392" cy="386" r="17"/>
                <circle cx="146" cy="380" r="13"/><circle cx="275" cy="420" r="15"/>
              </g>
              <g stroke="#735b57" stroke-width="5" stroke-linecap="round">
                <path d="M42 330 V370 M62 338 V373 M365 385 V425 M392 395 V430 M146 389 V416 M275 430 V460"/>
              </g>
              <g fill="#f4e9e2">
                <rect x="96" y="295" width="9" height="11" rx="2"/><rect x="113" y="295" width="9" height="11" rx="2"/>
                <rect x="305" y="355" width="9" height="11" rx="2"/><rect x="320" y="355" width="9" height="11" rx="2"/>
              </g>
              <path d="M0 485 Q110 460 202 482 T420 475" fill="none" stroke="#b5d3c5" stroke-width="4" opacity=".65"/>
            </g>
          </svg>
        </div>
        <div class="le-weather-landscape-wide">
          <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="le-weather-wide-far" x2="0" y2="1"><stop stop-color="#c9c4c4"/><stop offset="1" stop-color="#a4a9b7"/></linearGradient>
              <linearGradient id="le-weather-wide-mid" x2="0" y2="1"><stop stop-color="#b3a9c4"/><stop offset="1" stop-color="#858caf"/></linearGradient>
              <linearGradient id="le-weather-wide-near" x2="0" y2="1"><stop stop-color="#91a9b1"/><stop offset="1" stop-color="#617e91"/></linearGradient>
              <linearGradient id="le-weather-wide-river" x2="0" y2="1"><stop stop-color="#a5d9dc"/><stop offset=".5" stop-color="#65b7c5"/><stop offset="1" stop-color="#4189a2"/></linearGradient>
            </defs>
            <path d="M0 440 C120 390 220 420 330 380 C455 330 565 400 690 365 C820 325 930 390 1050 350 C1190 310 1320 370 1440 330 C1510 310 1560 320 1600 300 L1600 900H0Z" fill="url(#le-weather-wide-far)"/>
            <path d="M0 540 C130 475 250 510 370 470 C500 425 610 495 735 450 C860 405 980 480 1100 435 C1230 385 1370 455 1480 410 C1530 390 1570 400 1600 390 L1600 900H0Z" fill="url(#le-weather-wide-mid)"/>
            <path d="M0 650 C125 575 260 615 385 570 C520 520 635 595 760 545 C895 495 1010 575 1140 525 C1270 475 1400 550 1510 500 C1550 485 1580 490 1600 480 L1600 900H0Z" fill="url(#le-weather-wide-near)"/>
            <path d="M0 745 C145 675 275 710 410 670 C555 625 665 690 805 650 C940 610 1060 685 1190 640 C1330 590 1460 655 1600 610 L1600 900H0Z" fill="#648b88"/>
            <path d="M-30 780 C160 700 310 760 470 720 C610 685 670 610 810 625 C950 640 965 750 1110 755 C1245 760 1300 685 1450 710 C1510 720 1560 735 1630 715 L1630 900H-30Z" fill="#527f7e"/>
            <path d="M760 500 C805 560 900 570 890 625 C880 675 780 695 815 745 C850 790 1000 780 1045 825 C1080 865 1190 885 1300 930 L1400 930 C1280 855 1190 820 1150 775 C1105 720 960 735 930 685 C900 635 1000 620 975 570 C950 525 855 520 820 480Z" fill="url(#le-weather-wide-river)"/>
            <path class="le-weather-river-flow" d="M800 510 C850 560 930 580 915 625 C900 670 820 700 850 745 C890 790 1030 785 1080 835 C1120 875 1210 895 1340 930" fill="none" stroke="#e1f5ee" stroke-width="5" stroke-linecap="round" opacity=".9"/>
            <g fill="#f4d8c8" stroke="#806b7b" stroke-width="3">
              <path d="M270 680 L310 642 L350 680 V735 H270Z"/><path d="M258 680 L310 632 L362 680" fill="none" stroke="#b78383" stroke-width="7"/>
              <path d="M1290 620 L1322 590 L1355 620 V666 H1290Z"/><path d="M1280 620 L1322 580 L1365 620" fill="none" stroke="#b78383" stroke-width="6"/>
            </g>
            <g fill="#698d83">
              <circle cx="170" cy="710" r="30"/><circle cx="220" cy="720" r="24"/><circle cx="1390" cy="665" r="31"/><circle cx="1450" cy="680" r="24"/>
            </g>
            <g stroke="#735b57" stroke-width="8" stroke-linecap="round"><path d="M170 720V770M220 730V780M1390 675V725M1450 690V735"/></g>
          </svg>
        </div>
      </div>`;
  }

  function n(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function rounded(value) {
    const parsed = n(value);
    return parsed === null ? '—' : String(Math.round(parsed));
  }
  function hourOf(time) {
    const match = /T(\d{2}):/.exec(String(time || ''));
    return match ? Number(match[1]) : 12;
  }
  function formatHour(time, index) {
    if (!time) return index === 0 ? 'NOW' : '—';
    const hour = hourOf(time);
    return index === 0 ? 'NOW' : `${String(hour).padStart(2, '0')}:00`;
  }
  function formatClock(time) {
    if (!time) return 'Local time';
    const hour = hourOf(time);
    return `${String(hour).padStart(2, '0')}:00`;
  }
  function conditionFor(code, precipitation, snowfall) {
    const c = n(code);
    if (n(snowfall) > 0 || [71,73,75,77,85,86].includes(c)) return 'Snow';
    if ([95,96,99].includes(c)) return 'Thunderstorm';
    if ([45,48].includes(c)) return 'Foggy';
    if (n(precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)) return 'Rain';
    if (c === 0) return 'Clear sky';
    if (c === 1) return 'Mostly clear';
    if (c === 2) return 'Partly cloudy';
    if (c === 3) return 'Overcast';
    return 'Weather';
  }
  function iconFor(code, precipitation, snowfall, isDay = 1) {
    const c = n(code);
    if (n(snowfall) > 0 || [71,73,75,77,85,86].includes(c)) return '❄️';
    if ([95,96,99].includes(c)) return '⛈️';
    if ([45,48].includes(c)) return '🌫️';
    if (n(precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)) return '🌧️';
    if (c === 3) return '☁️';
    if (c === 2) return '⛅';
    if (c === 1) return '🌤️';
    return Number(isDay) === 0 ? '🌙' : '☀️';
  }
  function phaseFor(item) {
    const hour = hourOf(item.time);
    if (n(item.is_day) === 0 || hour >= 20 || hour < 5) return 'night';
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'day';
  }
  function heroCondition(item) {
    const label = conditionFor(item.weather_code, item.precipitation, item.snowfall);
    const phrases = {
      'Clear sky':'Sunny', 'Mostly clear':'Mostly sunny', 'Partly cloudy':'Partly cloudy',
      'Overcast':'Overcast', 'Rain':'Rainy', 'Snow':'Snowing',
      'Thunderstorm':'Stormy', 'Foggy':'Foggy'
    };
    return phrases[label] || label;
  }
  function conditionKey(item) {
    const c = n(item.weather_code);
    if (n(item.snowfall) > 0 || [71,73,75,77,85,86].includes(c)) return 'snow';
    if ([95,96,99].includes(c)) return 'storm';
    if ([45,48].includes(c)) return 'fog';
    if (n(item.precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)) return 'rain';
    if (c === 3) return 'overcast';
    if (c === 1 || c === 2) return 'partly-cloudy';
    return 'clear';
  }
  function weatherState(item) {
    if (!item || !Number.isFinite(n(item.weather_code))) return { condition:'neutral', phase:'day' };
    const condition = conditionKey(item);
    return { condition, phase:phaseFor(item) };
  }
  function buildForecast(data) {
    const h = data?.hourly;
    if (!h || !Array.isArray(h.time)) return [];
    const currentTime = data?.current?.time ? Date.parse(data.current.time) : Date.now();
    const currentLabel = data?.current?.time || '';
    let start = currentLabel
      ? h.time.findIndex(time => String(time) >= String(currentLabel))
      : h.time.findIndex(time => Date.parse(time) >= currentTime - 30 * 60 * 1000);
    if (start < 0) start = 0;
    const fields = ['temperature_2m','apparent_temperature','precipitation_probability','precipitation','rain','showers','snowfall','weather_code','cloud_cover','wind_speed_10m','wind_gusts_10m','wind_direction_10m','is_day'];
    const list = [];
    for (let i = start; i < h.time.length && list.length < MAX_HOURS; i++) {
      const item = { time:h.time[i] };
      for (const field of fields) item[field] = Array.isArray(h[field]) ? h[field][i] : null;
      list.push(item);
    }
    if (data.current && list.length) {
      const current = data.current;
      list[0] = {
        ...list[0], time:current.time || list[0].time,
        temperature_2m:current.temperature_2m,
        apparent_temperature:current.apparent_temperature,
        weather_code:current.weather_code,
        cloud_cover:current.cloud_cover,
        is_day:current.is_day,
        precipitation:current.precipitation
      };
    }
    return list;
  }

  function createParticles(layer, kind, item) {
    if (!layer) return;
    layer.replaceChildren();
    const amount = n(kind === 'rain' ? item.precipitation : item.snowfall) ?? 0;
    const windDirection = n(item.wind_direction_10m) ?? 270;
    const drift = -Math.sin(windDirection * Math.PI / 180) * 18;
    const probability = n(item.precipitation_probability) ?? 0;
    const base = kind === 'rain'
      ? Math.round(Math.min(30, Math.max(6, probability * .19 + amount * 5)))
      : Math.round(Math.min(26, Math.max(7, amount * 15 + 7)));
    const count = Math.max(0, Math.min(30, base));
    for (let i = 0; i < count; i++) {
      const particle = el('span', 'le-weather-particle');
      particle.style.setProperty('--particle-x', `${(i * 37 + 7) % 100}%`);
      particle.style.setProperty('--particle-delay', `${-((i * 17) % 31) / 10}s`);
      particle.style.setProperty('--particle-duration', kind === 'rain'
        ? `${Math.max(.55, 1.75 - amount * .08)}s`
        : `${4.2 + (i % 5) * .6}s`);
      particle.style.setProperty('--particle-drift', `${Math.round(drift + ((i * 13) % 15) - 7)}px`);
      if (kind === 'snow') particle.style.setProperty('--particle-size', `${3 + (i % 4)}px`);
      layer.appendChild(particle);
    }
  }

  function activateWeather() {
    const view = mount('weather');
    if (!view) return;
    installStyles();
    view.root.replaceChildren();

    const app = el('div', 'le-weather-app');
    app.dataset.condition = 'neutral';
    app.dataset.phase = 'day';
    app.dataset.loading = 'true';
    app.dataset.orientation = window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
    app.innerHTML = artworkMarkup();

    const top = el('header', 'le-weather-top');
    const brand = el('div', 'le-weather-brand');
    const mark = el('span', 'le-weather-brand-mark', '🌤');
    mark.setAttribute('aria-hidden', 'true');
    brand.append(mark, el('span', '', 'Weather'));
    const location = el('div', 'le-weather-location', 'LOCAL FORECAST');
    top.append(brand, location);

    const hero = el('section', 'le-weather-hero');
    hero.setAttribute('aria-label', 'Current weather');
    const heroCopy = el('div', 'le-weather-hero-copy');
    const eyebrow = el('div', 'le-weather-eyebrow', 'YOUR WEATHER');
    const tempLine = el('div', 'le-weather-temp-line');
    const temperature = el('span', 'le-weather-temperature', '—');
    temperature.setAttribute('aria-live', 'polite');
    const degree = el('span', 'le-weather-degree', '°');
    tempLine.append(temperature, degree);
    const time = el('div', 'le-weather-time', 'Turn on Location for local weather');
    heroCopy.append(eyebrow, tempLine, time);
    const condition = el('div', 'le-weather-condition-vertical', 'Weather unavailable');
    condition.setAttribute('aria-label', 'Weather condition unavailable');
    hero.append(heroCopy, condition);

    const card = el('section', 'le-weather-card');
    card.setAttribute('aria-label', 'Hourly weather forecast');
    const cardHead = el('div', 'le-weather-card-head');
    const cardTitle = el('h2', 'le-weather-card-title', 'Weather Today');
    const cardSubtitle = el('span', 'le-weather-card-subtitle', 'Hourly forecast');
    cardHead.append(cardTitle, cardSubtitle);
    const hours = el('div', 'le-weather-hours');
    hours.setAttribute('role', 'group');
    hours.setAttribute('aria-label', 'Hourly forecast. Select an hour to preview its weather.');
    const emptyState = el('div', 'le-weather-empty', 'Turn on Location to see your local forecast.');
    card.append(cardHead, emptyState, hours);

    const attribution = el('div', 'le-weather-attribution');
    attribution.innerHTML = 'Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · CC BY 4.0';

    app.append(top, hero, card, attribution);
    view.root.appendChild(app);

    let forecast = [];
    let selectedIndex = 0;
    let controller = null;
    let pollTimer = 0;
    let disposed = false;
    let serial = 0;
    let locationHandler = null;
    let locationStopHandler = null;
    let onlineHandler = null;
    let offlineHandler = null;
    let resizeHandler = null;
    const media = window.matchMedia('(orientation: landscape)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setOrientation() {
      app.dataset.orientation = media.matches ? 'landscape' : 'portrait';
      const compact = window.innerHeight < 720 || window.innerWidth < 390;
      app.dataset.layout = compact ? 'compact' : 'regular';
    }
    setOrientation();
    resizeHandler = () => setOrientation();
    window.addEventListener('resize', resizeHandler);
    media.addEventListener?.('change', setOrientation);
    if (reducedMotion) app.dataset.motion = 'reduced';

    function paint(item) {
      const state = weatherState(item);
      app.dataset.condition = state.condition;
      app.dataset.phase = state.phase;
      const wind = n(item.wind_speed_10m) ?? 0;
      const gust = n(item.wind_gusts_10m) ?? wind;
      const cloud = n(item.cloud_cover) ?? 0;
      const hour = hourOf(item.time);
      app.style.setProperty('--sun-top', state.phase === 'dawn' ? '26%' : state.phase === 'evening' ? '31%' : state.phase === 'night' ? '12%' : `${Math.max(10, 16 - Math.max(0, hour - 12) * .45)}%`);
      const rain = n(item.precipitation) ?? 0;
      const snow = n(item.snowfall) ?? 0;
      app.style.setProperty('--cloud-duration', `${Math.max(20, 70 - wind * .7)}s`);
      app.style.setProperty('--le-cloud-opacity', String(.16 + Math.min(100, cloud) / 100 * .82));
      app.style.setProperty('--le-rain-opacity', String(Math.min(.95, .4 + rain * .2)));
      app.style.setProperty('--le-snow-opacity', String(Math.min(.95, .45 + snow * .35)));
      createParticles(app.querySelector('.le-weather-rain'), 'rain', item);
      createParticles(app.querySelector('.le-weather-snow'), 'snow', item);
      const drift = -Math.sin((n(item.wind_direction_10m) ?? 270) * Math.PI / 180) * Math.max(5, wind * .45);
      app.style.setProperty('--le-cloud-drift', `${Math.round(drift)}px`);
      app.style.setProperty('--le-gust-duration', `${Math.max(.65, 2.2 - gust / 90)}s`);
      temperature.textContent = rounded(item.temperature_2m);
      const desc = conditionFor(item.weather_code, item.precipitation, item.snowfall);
      const heroDescription = heroCondition(item);
      condition.textContent = `It's ${heroDescription}`;
      condition.setAttribute('aria-label', `It's ${heroDescription}`);
      time.textContent = `${formatClock(item.time)} · ${state.phase === 'night' ? 'Night' : state.phase === 'dawn' ? 'First light' : state.phase === 'evening' ? 'Evening' : 'Daylight'}`;
      cardSubtitle.textContent = selectedIndex === 0 ? 'Next 18 hours' : 'Selected hour';
      emptyState.hidden = true;
      hours.querySelectorAll('.le-weather-hour').forEach((node, i) => node.setAttribute('aria-pressed', String(i === selectedIndex)));
    }

    function renderForecast() {
      hours.replaceChildren();
      forecast.forEach((item, index) => {
        const hour = el('button', 'le-weather-hour');
        hour.type = 'button';
        hour.setAttribute('aria-pressed', String(index === selectedIndex));
        const label = `${index === 0 ? 'Now' : formatHour(item.time,index)}, ${rounded(item.temperature_2m)} degrees, ${conditionFor(item.weather_code,item.precipitation,item.snowfall)}`;
        hour.setAttribute('aria-label', label);
        hour.append(
          el('span', 'le-weather-hour-time', index === 0 ? 'NOW' : formatHour(item.time,index)),
          el('span', 'le-weather-hour-icon', iconFor(item.weather_code,item.precipitation,item.snowfall,item.is_day)),
          el('strong', 'le-weather-hour-temp', `${rounded(item.temperature_2m)}°`)
        );
        hour.addEventListener('click', () => {
          selectedIndex = index;
          paint(item);
        });
        hours.appendChild(hour);
      });
    }

    function clearWeather(message) {
      serial++;
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      controller?.abort();
      controller = null;
      forecast = [];
      selectedIndex = 0;
      hours.replaceChildren();
      emptyState.hidden = false;
      emptyState.textContent = message;
      app.dataset.condition = 'neutral';
      app.dataset.phase = 'day';
      app.dataset.loading = 'false';
      app.querySelector('.le-weather-rain')?.replaceChildren();
      app.querySelector('.le-weather-snow')?.replaceChildren();
      temperature.textContent = '—';
      condition.textContent = 'Weather unavailable';
      condition.setAttribute('aria-label', 'Weather unavailable');
      time.textContent = message;
      cardSubtitle.textContent = 'Forecast unavailable';
    }

    async function refreshWeather() {
      if (disposed || !isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) {
        clearWeather('Turn on Location for your local forecast');
        return;
      }
      if (navigator.onLine === false) {
        clearWeather('Connect to the internet for a fresh forecast');
        return;
      }
      const point = globe()?.getLocation?.();
      const latitude = Number(point?.latitude);
      const longitude = Number(point?.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        waitForLocation();
        return;
      }
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;

      serial++;
      const requestId = serial;
      controller?.abort();
      controller = new AbortController();
      app.dataset.loading = 'true';
      cardSubtitle.textContent = 'Updating';
      const params = new URLSearchParams({
        latitude:String(latitude), longitude:String(longitude),
        current:'temperature_2m,apparent_temperature,weather_code,cloud_cover,is_day,precipitation',
        hourly:'temperature_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',
        forecast_days:'2', timezone:'auto', temperature_unit:'celsius',
        wind_speed_unit:'kmh', precipitation_unit:'mm'
      });
      try {
        const response = await fetch(`${API_ROOT}?${params.toString()}`, {
          mode:'cors', credentials:'omit', cache:'no-store',
          headers:{ Accept:'application/json' }, signal:controller.signal
        });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}.`);
        const data = await response.json();
        if (disposed || requestId !== serial || !isActive('weather') ||
            window.liveEarthLocationAllowed?.() !== true) return;
        const next = buildForecast(data);
        if (!next.length || !Number.isFinite(n(next[0].temperature_2m))) throw new Error('No usable hourly forecast was returned.');
        forecast = next;
        selectedIndex = 0;
        app.dataset.loading = 'false';
        renderForecast();
        paint(forecast[0]);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (!disposed && requestId === serial && isActive('weather')) {
          clearWeather('Weather could not be refreshed. Check your connection and Location permission.');
          console.warn('[LIVE // EARTH] Weather forecast refresh failed.', error);
        }
      } finally {
        if (requestId === serial) app.dataset.loading = 'false';
      }
    }

    function waitForLocation() {
      if (pollTimer) clearInterval(pollTimer);
      let attempts = 24;
      pollTimer = window.setInterval(() => {
        if (disposed || !isActive('weather')) { clearInterval(pollTimer); pollTimer = 0; return; }
        if (window.liveEarthLocationAllowed?.() !== true) {
          clearInterval(pollTimer); pollTimer = 0;
          clearWeather('Turn on Location for your local forecast'); return;
        }
        const point = globe()?.getLocation?.();
        if (point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))) {
          clearInterval(pollTimer); pollTimer = 0; refreshWeather(); return;
        }
        if (--attempts <= 0) {
          clearInterval(pollTimer); pollTimer = 0;
          clearWeather('Location is on. Waiting for the shared Location Orb to settle.');
        }
      }, 500);
    }

    locationStopHandler = () => {
      if (!isActive('weather')) return;
      clearWeather('Turn on Location to see your local forecast');
    };
    locationHandler = event => {
      if (!isActive('weather')) return;
      if (event.detail?.enabled === true && window.liveEarthLocationAllowed?.() === true) {
        refreshWeather();
      } else if (event.detail?.enabled === false) {
        clearWeather('Turn on Location for your local forecast');
      }
    };
    onlineHandler = () => {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() === true) refreshWeather();
    };
    offlineHandler = () => {
      if (!isActive('weather')) return;
      clearWeather('Offline · reconnect for a fresh local forecast');
    };
    window.addEventListener('live-earth-location-state', locationHandler);
    window.addEventListener('live-earth-location-stop', locationStopHandler);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    if (window.liveEarthLocationAllowed?.() === true) refreshWeather();
    else clearWeather('Turn on Location for your local forecast');

    return () => {
      disposed = true;
      serial++;
      controller?.abort();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      window.removeEventListener('live-earth-location-state', locationHandler);
      window.removeEventListener('live-earth-location-stop', locationStopHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('resize', resizeHandler);
      media.removeEventListener?.('change', setOrientation);
      app.remove();
    };
  }

  runtime.registerFeature('weather', activateWeather);
})();
