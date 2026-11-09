/* LIVE // EARTH — Weather: one living 2D landscape, driven by forecast data.
   The illustration never swaps scenes. Weather changes only its atmosphere,
   particles and the behaviour of three small characters. Location remains owned
   by the shared Location Orb; cyclones are deliberately outside this view. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] weather feature runtime is unavailable.');
    return;
  }

  const { mount, el, setStatus, button, card, attribution, isActive, globe } = runtime;
  let residentLibraryPromise = null;

  function ensureResidentLibrary() {
    if (window.LiveEarthResidentLibrary?.mount) return Promise.resolve(window.LiveEarthResidentLibrary);
    if (residentLibraryPromise) return residentLibraryPromise;
    residentLibraryPromise = import('./Residents/resident-library.js').then(() => {
      if (window.LiveEarthResidentLibrary?.mount) return window.LiveEarthResidentLibrary;
      throw new Error('The Residents library loaded without registering its API.');
    }).catch(error => {
      residentLibraryPromise = null;
      throw error;
    });
    return residentLibraryPromise;
  }

  // Warm the shared library as soon as the Weather module is registered. The
  // existing same-origin runtime cache retains it for subsequent offline visits.
  ensureResidentLibrary().catch(error => console.warn('[LIVE // EARTH] Residents library will retry when Weather opens.', error));
  const STYLE_ID = 'le-weather-living-landscape-style';
  const MAX_FORECAST_HOURS = 18;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather{--le-weather-ink:#f7fbff;color:#f7fbff}
      .le-sfv--weather .le-sfv-panel{z-index:2;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding-top:calc(env(safe-area-inset-top) + clamp(64px,9vmin,82px));}
      .le-sfv--weather .le-sfv-head{position:relative;z-index:3;margin-bottom:12px;text-shadow:0 2px 16px #10253a88}
      .le-sfv--weather .le-sfv-symbol{background:radial-gradient(circle at 32% 22%,#fff9,rgba(96,171,210,.3) 48%,rgba(4,20,36,.88));box-shadow:inset 1px 1px 4px #fff7,inset -3px -4px 8px #0008,0 0 22px #9de7ff55}
      .le-sfv--weather .le-sfv-subtitle{color:#e6f3ff;text-shadow:0 1px 8px #10253acc}
      .le-sfv--weather .le-sfv-panel>.le-sfv-body{position:relative;z-index:3;display:grid;grid-template-columns:minmax(0,1fr);gap:11px;width:min(100%,760px);padding-bottom:12px}
      .le-sfv--weather .le-sfv-card{border:1px solid rgba(239,249,255,.26);border-radius:20px;background:linear-gradient(145deg,rgba(18,42,62,.56),rgba(12,29,49,.34));box-shadow:inset 1px 1px 1px #fff2,0 12px 30px #122c4560;backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px)}
      .le-sfv--weather .le-sfv-card h2{color:#f5fbff;font-size:12px;letter-spacing:.075em;text-transform:uppercase}
      .le-sfv--weather .le-sfv-copy{color:#e4f2fa;font-size:11px}
      .le-sfv--weather .le-sfv-status{border-color:#e7f7ff44;background:#102f4d55;color:#f2f9ff;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
      .le-sfv--weather .le-sfv-attribution{color:#e2edf5;text-shadow:0 1px 4px #10253acc}
      .le-sfv--weather .le-sfv-attribution a{color:#fff;text-decoration-thickness:1px}
      /* Compact, transparent Weather overlay. All forecast text floats over the scene. */
      .le-sfv--weather .le-sfv-panel{padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 128px)!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      .le-sfv--weather .le-sfv-head{gap:8px;margin:0 0 2px;text-shadow:0 2px 14px #10253a99}
      .le-sfv--weather .le-sfv-symbol{width:32px;min-width:32px;border:0;background:none;box-shadow:none;font-size:24px}
      .le-sfv--weather .le-sfv-title{font-size:clamp(21px,5.8vw,25px);line-height:1.05}
      .le-sfv--weather .le-sfv-subtitle{display:none!important}
      .le-sfv--weather .le-sfv-pill{margin:0 0 6px 40px;padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;font-size:8px;letter-spacing:.085em;text-shadow:0 1px 8px #10253acc}
      .le-sfv--weather .le-sfv-panel>.le-sfv-body{display:flex;flex-direction:column;gap:0;width:min(100%,760px);padding:0 0 10px;position:relative}
      .le-sfv--weather .le-sfv-body>.le-sfv-status{order:0;margin:0 0 7px 40px;padding:0;border:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;color:#eef7ff;font-size:8px;line-height:1.35;text-shadow:0 1px 8px #10253acc}
      .le-sfv--weather .le-sfv-body>.le-sfv-card{border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:0!important}
      .le-sfv--weather .le-sfv-body>.le-sfv-card:first-of-type{order:1;margin:0 0 8px}
      .le-sfv--weather .le-sfv-body>.le-sfv-card:first-of-type>h2,.le-sfv--weather .le-sfv-body>.le-sfv-card:first-of-type>.le-sfv-copy{display:none!important}
      .le-sfv--weather .le-weather-now{align-items:center;gap:10px}
      .le-sfv--weather .le-weather-condition-icon{width:34px;height:34px;min-width:34px;border:0;border-radius:0;background:none;box-shadow:none;font-size:28px}
      .le-sfv--weather .le-weather-temp{font-size:clamp(44px,12vw,54px);line-height:.88;text-shadow:0 2px 16px #193c5d88}
      .le-sfv--weather .le-weather-condition{margin-top:4px;font-size:11px}
      .le-sfv--weather .le-weather-local-time{margin-top:2px;font-size:9px;color:#e6f1f8}
      .le-sfv--weather .le-weather-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px 12px;margin-top:9px;max-width:440px}
      .le-sfv--weather .le-weather-metric{padding:0;border:0;border-radius:0;background:none;text-align:left}
      .le-sfv--weather .le-weather-metric-label{font-size:7px;letter-spacing:.075em;color:#e0edf5}
      .le-sfv--weather .le-weather-metric-value{margin-top:2px;font-size:11px;line-height:1.15}
      .le-sfv--weather .le-sfv-body>.le-sfv-card:nth-of-type(2){order:2;margin-top:8px}
      .le-sfv--weather .le-sfv-body>.le-sfv-card:nth-of-type(2)>h2,.le-sfv--weather .le-sfv-body>.le-sfv-card:nth-of-type(2)>.le-sfv-copy{display:none!important}
      .le-sfv--weather .le-weather-timeline{gap:5px;padding-bottom:0}
      .le-sfv--weather .le-weather-hour-strip{gap:6px;padding:1px 1px 6px}
      .le-sfv--weather .le-weather-hour{flex-basis:54px;min-height:60px;padding:5px 4px;border-radius:12px;background:rgba(7,29,47,.16);border-color:#e5f4ff35;gap:3px}
      .le-sfv--weather .le-weather-hour[aria-pressed="true"]{background:rgba(225,247,255,.18);box-shadow:0 0 0 1px #fff3,0 0 14px #b8eaff55}
      .le-sfv--weather .le-weather-hour-icon{font-size:15px}
      .le-sfv--weather .le-weather-hour-temp{font-size:12px}
      .le-sfv--weather .le-weather-hour-time{font-size:8px}
      .le-sfv--weather .le-weather-range-label{font-size:8px}
      .le-sfv--weather .le-weather-range{min-height:20px}
      .le-sfv--weather .le-sfv-controls{margin-top:5px;gap:6px}
      .le-sfv--weather .le-weather-refresh{min-height:30px;padding:7px 11px;background:rgba(9,39,58,.14);font-size:9px}
      .le-sfv--weather .le-sfv-attribution{margin-top:6px;font-size:7px;line-height:1.3;text-align:right;opacity:.82;text-shadow:0 1px 5px #10253acc}
      .le-sfv--weather .le-sfv-attribution a{color:#f4fbff;text-underline-offset:2px}
      @media(max-width:390px){.le-sfv--weather .le-weather-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 9px}.le-sfv--weather .le-weather-hour{flex-basis:50px;min-height:57px}}
      .le-weather-atmosphere{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;isolation:isolate;background:linear-gradient(180deg,#8bc8e8 0%,#d8e8e8 47%,#e9d5ad 100%);transition:background 1.2s ease}
      .le-weather-sky{position:absolute;inset:0;background:linear-gradient(180deg,#6fb5df 0%,#c5e1e7 56%,#f2d8ae 100%);transition:background 1.5s ease,filter 1.5s ease}
      .le-weather-sun{position:absolute;top:13%;right:14%;width:clamp(58px,16vw,104px);aspect-ratio:1;border-radius:50%;opacity:.88;background:radial-gradient(circle,#fffde7 0 24%,#ffe6a0 44%,#ffdb7b99 61%,transparent 72%);filter:drop-shadow(0 0 25px #ffe9a8aa);transition:opacity 1s ease,transform 1.5s ease}
      .le-weather-sun:after{content:"";position:absolute;inset:-28%;border-radius:50%;background:repeating-conic-gradient(from 0deg,#fff0 0 9deg,#fff5 10deg 11deg,#fff0 12deg 30deg);mask:radial-gradient(circle,transparent 47%,#000 50% 55%,transparent 60%);animation:le-weather-sun-turn 90s linear infinite}
      .le-weather-moon{position:absolute;top:12%;right:16%;width:clamp(44px,12vw,76px);aspect-ratio:1;border-radius:50%;opacity:0;background:radial-gradient(circle at 36% 34%,#fff 0 5%,#e7efff 40%,#b7c7e5 74%,#9aafd0 100%);box-shadow:0 0 28px #d7e7ff88;transition:opacity 1s ease}
      .le-weather-cloud-layer{position:absolute;inset:5% -10% auto;height:38%;opacity:var(--le-cloud-opacity,.35);transition:opacity 1s ease}
      .le-weather-cloud{position:absolute;width:clamp(145px,42vw,280px);height:auto;fill:#fff;filter:drop-shadow(0 8px 12px #456d8640);animation:le-weather-cloud-drift var(--le-cloud-duration,54s) linear infinite alternate}
      .le-weather-cloud--one{top:20%;left:-3%}.le-weather-cloud--two{top:1%;right:5%;width:clamp(125px,34vw,225px);opacity:.83;animation-duration:68s;animation-direction:alternate-reverse}.le-weather-cloud--three{top:48%;left:39%;width:clamp(110px,30vw,205px);opacity:.65;animation-duration:77s}
      .le-weather-landscape{position:absolute;left:0;right:0;bottom:0;width:100%;height:58%;overflow:visible}
      .le-weather-landscape svg,.le-weather-people svg{display:block;width:100%;height:100%;overflow:visible}
      .le-weather-people{position:absolute;left:0;right:0;bottom:3%;height:43%;z-index:2;overflow:visible}
      .le-weather-people svg{overflow:visible}
      .le-weather-rain,.le-weather-snow{position:absolute;inset:-8% 0 0;overflow:hidden;opacity:0;transition:opacity .5s ease}
      .le-weather-particle{position:absolute;top:-12%;left:var(--particle-x);animation:le-weather-fall var(--particle-duration,1.3s) linear var(--particle-delay,0s) infinite;will-change:transform}
      .le-weather-rain .le-weather-particle{width:1.5px;height:clamp(15px,3.5vh,28px);border-radius:2px;background:linear-gradient(180deg,transparent,#e5f7ffcc);transform:rotate(13deg)}
      .le-weather-snow .le-weather-particle{width:var(--particle-size,5px);height:var(--particle-size,5px);border-radius:50%;background:#fff;box-shadow:0 0 8px #fff9;animation-name:le-weather-snow-fall;animation-duration:var(--particle-duration,5s)}
      .le-weather-fog{position:absolute;inset:38% -20% 0;opacity:0;background:linear-gradient(180deg,#e7f1ed00,#e2eee8a8 54%,#e8f0e8aa);filter:blur(16px);transition:opacity 1.2s ease}
      .le-weather-lightning{position:absolute;inset:0;opacity:0;background:#e9f6ff;mix-blend-mode:screen;pointer-events:none}
      .le-weather-now{display:flex;align-items:center;gap:14px;min-width:0}
      .le-weather-condition-icon{flex:0 0 auto;display:grid;place-items:center;width:58px;height:58px;border-radius:19px;background:radial-gradient(circle at 32% 24%,#fff5,#8bc9e544 55%,#0e2a4566);border:1px solid #e7f8ff55;font-size:31px;box-shadow:0 8px 24px #102f4c44,inset 0 1px 1px #fff7}
      .le-weather-temp{display:block;font-size:clamp(42px,12vw,62px);line-height:.95;font-weight:760;letter-spacing:-.065em;color:#fff;text-shadow:0 2px 16px #193c5d66;font-variant-numeric:tabular-nums}
      .le-weather-condition{margin-top:6px;color:#f1f8fc;font-size:12px;font-weight:650;text-shadow:0 1px 6px #10253a88}
      .le-weather-local-time{margin-top:4px;color:#d9ebf5;font-size:10px}
      .le-weather-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:14px}
      .le-weather-metric{min-width:0;padding:9px 7px;border:1px solid #e5f4ff26;border-radius:13px;background:#0c294244;text-align:center}
      .le-weather-metric-label{display:block;color:#d0e5f1;font-size:8px;letter-spacing:.06em;text-transform:uppercase}
      .le-weather-metric-value{display:block;margin-top:5px;color:#fff;font-size:clamp(13px,3.8vw,17px);font-weight:720;font-variant-numeric:tabular-nums;white-space:nowrap}
      .le-weather-timeline{position:relative;display:grid;gap:10px;padding-bottom:4px}
      .le-weather-timeline:after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,#dff8ffb8,transparent);background-size:220% 100%;animation:le-weather-time-glint 5.5s ease-in-out infinite;opacity:.75;pointer-events:none}
      .le-weather-hour-strip{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 9px;scrollbar-width:none;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
      .le-weather-hour-strip::-webkit-scrollbar{display:none}
      .le-weather-hour{flex:0 0 66px;min-height:76px;padding:8px 5px;border:1px solid #e5f4ff2b;border-radius:15px;background:#0c294244;color:#e9f5fb;display:grid;justify-items:center;align-content:center;gap:4px;font:600 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;scroll-snap-align:start;touch-action:manipulation}
      .le-weather-hour[aria-pressed="true"]{border-color:#fff9;background:linear-gradient(160deg,#fff5,#8ed9ff38);box-shadow:0 0 0 1px #fff3,0 0 18px #b8eaff77;transform:translateY(-2px)}
      .le-weather-hour-icon{font-size:18px;line-height:1.2}.le-weather-hour-temp{font-size:13px;color:#fff;font-weight:750}.le-weather-hour-time{font-size:9px;color:#d3e7f3}
      .le-weather-range{width:100%;margin:0;accent-color:#eaf8ff;touch-action:pan-x}
      .le-weather-range:focus-visible,.le-weather-hour:focus-visible,.le-weather-refresh:focus-visible{outline:2px solid #fff;outline-offset:3px}
      .le-weather-range-label{display:flex;justify-content:space-between;gap:8px;color:#e2eff7;font-size:9px}
      .le-weather-refresh{min-height:38px;padding:9px 14px;border:1px solid #dff4ff66;border-radius:999px;background:#17405c66;color:#fff;font:700 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}
      .le-weather-scene-caption{position:absolute;left:12px;right:12px;bottom:2.5%;z-index:1;text-align:center;color:#f7fbffb8;font-size:8px;letter-spacing:.08em;text-shadow:0 1px 7px #18354c88;pointer-events:none}
      .le-weather-scene[data-phase="dawn"] .le-weather-sky{background:linear-gradient(180deg,#90b9d8,#e9c4aa 58%,#f3d4a8)}
      .le-weather-scene[data-phase="day"] .le-weather-sky{background:linear-gradient(180deg,#69b7e5,#c9e6e9 57%,#f2d8ad)}
      .le-weather-scene[data-phase="evening"] .le-weather-sky{background:linear-gradient(180deg,#697fb3 0%,#d69b9b 52%,#f2c18d 100%)}
      .le-weather-scene[data-phase="night"] .le-weather-sky{background:linear-gradient(180deg,#172c50 0%,#344c70 58%,#667a86 100%)}
      .le-weather-scene[data-weather="cloudy"] .le-weather-sky{filter:saturate(.68) brightness(.94)}
      .le-weather-scene[data-weather="rain"] .le-weather-sky,.le-weather-scene[data-weather="storm"] .le-weather-sky{background:linear-gradient(180deg,#425b76 0%,#718b9a 58%,#94a6a1 100%);filter:saturate(.7) brightness(.82)}
      .le-weather-scene[data-weather="snow"] .le-weather-sky{background:linear-gradient(180deg,#819eb7 0%,#d0e0e7 65%,#e8eee9 100%)}
      .le-weather-scene[data-weather="fog"] .le-weather-sky{background:linear-gradient(180deg,#9aaeb7,#c5d1cc 70%,#dce3d8)}
      .le-weather-scene[data-weather="hot"] .le-weather-sky{filter:saturate(1.12) brightness(1.08)}
      .le-weather-scene[data-phase="night"] .le-weather-sun{opacity:0;transform:translateY(24px)}
      .le-weather-scene[data-phase="night"] .le-weather-moon{opacity:.96}
      .le-weather-scene[data-weather="rain"] .le-weather-sun,.le-weather-scene[data-weather="storm"] .le-weather-sun{opacity:0}
      .le-weather-scene[data-weather="rain"] .le-weather-cloud-layer,.le-weather-scene[data-weather="storm"] .le-weather-cloud-layer{opacity:var(--le-cloud-opacity,.8)}
      .le-weather-scene[data-weather="rain"] .le-weather-rain,.le-weather-scene[data-weather="storm"] .le-weather-rain{opacity:var(--le-rain-opacity,.7)}
      .le-weather-scene[data-weather="snow"] .le-weather-snow{opacity:var(--le-snow-opacity,.8)}
      .le-weather-scene[data-weather="fog"] .le-weather-fog{opacity:.9}
      .le-weather-scene[data-weather="storm"] .le-weather-lightning{animation:le-weather-flash 9s linear infinite}
      .le-weather-scene[data-mode="rain"] .le-weather-landscape,.le-weather-scene[data-mode="wind"] .le-weather-landscape{filter:saturate(.86)}
      @keyframes le-weather-sun-turn{to{transform:rotate(360deg)}}
      @keyframes le-weather-time-glint{0%,100%{background-position:100% 0;opacity:.2}50%{background-position:0 0;opacity:.85}}
      @keyframes le-weather-cloud-drift{from{transform:translateX(0)}to{transform:translateX(var(--le-cloud-drift,13vw))}}
      @keyframes le-weather-fall{to{transform:translate3d(var(--particle-drift,16px),115vh,0)}}
      @keyframes le-weather-snow-fall{0%{transform:translate3d(0,-8vh,0)}50%{transform:translate3d(var(--particle-drift,18px),48vh,0)}100%{transform:translate3d(calc(var(--particle-drift,18px) * -1),110vh,0)}}
      @keyframes le-weather-flash{0%,92%,94%,100%{opacity:0}92.5%{opacity:.22}93%{opacity:0}93.5%{opacity:.12}}
      @media(max-width:390px){.le-weather-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.le-weather-hour{flex-basis:60px}}
      @media(orientation:landscape) and (max-height:520px){.le-sfv--weather .le-sfv-head{margin-bottom:7px}.le-weather-landscape{height:67%}.le-weather-people{height:50%}.le-weather-now{gap:9px}.le-weather-condition-icon{width:46px;height:46px}.le-weather-temp{font-size:38px}}
      @media(prefers-reduced-motion:reduce){.le-weather-atmosphere *,.le-weather-atmosphere *:before,.le-weather-atmosphere *:after{animation:none!important;scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function createAtmosphere() {
    const scene = el('div', 'le-weather-atmosphere le-weather-scene');
    scene.dataset.weather = 'clear';
    scene.dataset.phase = 'day';
    scene.dataset.mode = 'calm';
    scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = `
      <div class="le-weather-sky"></div>
      <div class="le-weather-sun"></div><div class="le-weather-moon"></div>
      <div class="le-weather-cloud-layer">
        <svg class="le-weather-cloud le-weather-cloud--one" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
        <svg class="le-weather-cloud le-weather-cloud--two" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
        <svg class="le-weather-cloud le-weather-cloud--three" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
      </div>
      <div class="le-weather-fog"></div>
      <div class="le-weather-rain"></div><div class="le-weather-snow"></div>
      <div class="le-weather-lightning"></div>
      <div class="le-weather-landscape">
        <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMax slice">
          <path d="M0 83 Q62 44 121 91 T242 81 T420 76 V300 H0Z" fill="#8bb59d" opacity=".78"/>
          <path d="M0 133 Q67 82 144 131 T286 122 T420 110 V300 H0Z" fill="#5e9a80"/>
          <path d="M0 174 Q79 127 158 174 T310 168 T420 158 V300 H0Z" fill="#477e6b"/>
          <path d="M0 220 Q76 190 146 221 T286 211 T420 219 V300 H0Z" fill="#356b60"/>
          <path d="M168 300 Q194 256 211 227 Q231 199 252 218 Q281 244 301 300Z" fill="#8fc5c2" opacity=".78"/>
          <path d="M0 268 Q74 244 142 266 T273 265 T420 251 V300 H0Z" fill="#2d665e"/>
          <g fill="#f4d8ad" stroke="#805f55" stroke-width="2">
            <path d="M44 165 L67 143 L90 165 V197 H44Z"/><path d="M39 165 L67 137 L96 165" fill="none" stroke="#a86e65" stroke-width="5"/>
            <path d="M333 151 L357 130 L382 151 V183 H333Z"/><path d="M327 151 L357 124 L388 151" fill="none" stroke="#a86e65" stroke-width="5"/>
          </g>
          <g fill="#6a8d69"><circle cx="26" cy="176" r="17"/><circle cx="108" cy="183" r="21"/><circle cx="310" cy="165" r="18"/><circle cx="399" cy="177" r="22"/></g>
          <g stroke="#735b47" stroke-width="5" stroke-linecap="round"><path d="M26 185 V215 M108 193 V224 M310 174 V207 M399 187 V220"/></g>
          <g fill="#f4e9d7"><rect x="55" y="169" width="10" height="12" rx="2"/><rect x="73" y="169" width="10" height="12" rx="2"/><rect x="345" y="155" width="10" height="12" rx="2"/><rect x="364" y="155" width="10" height="12" rx="2"/></g>
          <path d="M0 287 Q110 267 202 288 T420 281" fill="none" stroke="#a5c99c" stroke-width="4" opacity=".65"/>
        </svg>
      </div>
      <div class="le-weather-people" data-resident-host data-activity="calm"></div>
      <div class="le-weather-scene-caption">ONE LITTLE WORLD · CHANGING WITH THE WEATHER</div>`;
    return scene;
  }

  function number(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function round(value, digits = 0) {
    const parsed = number(value);
    if (parsed === null) return '—';
    const factor = 10 ** digits;
    return String(Math.round(parsed * factor) / factor);
  }
  function hourOf(time) {
    const match = /T(\d{2}):/.exec(String(time || ''));
    return match ? Number(match[1]) : 12;
  }
  function formatTime(time, index) {
    if (!time) return index === 0 ? 'Now' : '—';
    const h = hourOf(time);
    return `${String(h).padStart(2, '0')}:00`;
  }
  function weatherDescription(code, snowfall, rain, fog) {
    const value = number(code);
    if (number(snowfall) > 0 || [71, 73, 75, 77, 85, 86].includes(value)) return 'Snow';
    if ([95, 96, 99].includes(value)) return 'Thunderstorm';
    if (number(fog) > 0 || [45, 48].includes(value)) return 'Foggy';
    if (number(rain) > 0 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return 'Rain';
    if (value === 0) return 'Clear sky';
    if (value === 1) return 'Mostly clear';
    if (value === 2) return 'Partly cloudy';
    if (value === 3) return 'Overcast';
    return 'Weather conditions';
  }
  function weatherIcon(code, snowfall, rain) {
    const value = number(code);
    if (number(snowfall) > 0 || [71, 73, 75, 77, 85, 86].includes(value)) return '❄️';
    if ([95, 96, 99].includes(value)) return '⛈️';
    if ([45, 48].includes(value)) return '🌫️';
    if (number(rain) > 0 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(value)) return '🌧️';
    if (value === 3) return '☁️';
    if (value === 2) return '⛅';
    if (value === 1) return '🌤️';
    return '☀️';
  }
  function isSnow(item) {
    return number(item.snowfall) > 0 || [71, 73, 75, 77, 85, 86].includes(number(item.weather_code));
  }
  function isRain(item) {
    return number(item.rain) > 0 || number(item.showers) > 0 || number(item.precipitation) > 0 ||
      [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(number(item.weather_code));
  }
  function isFog(item) { return [45, 48].includes(number(item.weather_code)); }
  function rainAmount(item) {
    return Math.max(number(item.rain) ?? 0, number(item.showers) ?? 0, number(item.precipitation) ?? 0);
  }
  function describeItem(item) {
    return weatherDescription(item.weather_code, item.snowfall, rainAmount(item), isFog(item) ? 1 : 0);
  }
  function iconForItem(item) { return weatherIcon(item.weather_code, item.snowfall, rainAmount(item)); }

  function makeForecast(data) {
    const hourly = data?.hourly;
    if (!hourly || !Array.isArray(hourly.time) || !hourly.time.length) return [];
    const currentTime = String(data?.current?.time || hourly.time[0]);
    let start = -1;
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i] <= currentTime) start = i;
      else break;
    }
    if (start < 0) start = Math.max(0, hourly.time.findIndex(time => time >= currentTime));
    return hourly.time.slice(start, start + MAX_FORECAST_HOURS).map((time, offset) => {
      const i = start + offset;
      const read = key => Array.isArray(hourly[key]) ? hourly[key][i] : null;
      return {
        time,
        temperature: read('temperature_2m'),
        feelsLike: read('apparent_temperature'),
        humidity: read('relative_humidity_2m'),
        rainChance: read('precipitation_probability'),
        precipitation: read('precipitation'),
        rain: read('rain'),
        showers: read('showers'),
        snowfall: read('snowfall'),
        weather_code: read('weather_code'),
        cloudCover: read('cloud_cover'),
        wind: read('wind_speed_10m'),
        gusts: read('wind_gusts_10m'),
        windDirection: read('wind_direction_10m'),
        isDay: read('is_day')
      };
    });
  }

  function visualState(item) {
    const temperature = number(item.feelsLike) ?? number(item.temperature);
    const wind = number(item.wind) ?? 0;
    const gusts = number(item.gusts) ?? wind;
    const cloud = number(item.cloudCover) ?? 0;
    const hour = hourOf(item.time);
    const evening = hour >= 16 && hour <= 19;
    const night = hour >= 20 || hour < 5;
    const dawn = hour >= 5 && hour <= 7;
    const phase = night ? 'night' : dawn ? 'dawn' : evening ? 'evening' : 'day';
    const snow = isSnow(item);
    const rain = isRain(item);
    const thunder = [95, 96, 99].includes(number(item.weather_code));
    const fog = isFog(item);
    const fastWind = gusts >= 48 || wind >= 35;
    const hot = temperature !== null && temperature >= 34;
    const pleasant = temperature !== null && temperature >= 17 && temperature <= 30 &&
      !rain && !snow && !fog && cloud <= 55 && wind < 28 && gusts < 40;
    let weather = snow ? 'snow' : thunder ? 'storm' : rain ? 'rain' : fog ? 'fog' : cloud >= 65 ? 'cloudy' : hot ? 'hot' : 'clear';
    const stargazing = night && !rain && !snow && !thunder && !fog && cloud <= 35 && !fastWind;
    let mode = snow ? 'snow' : (rain || thunder) ? 'rain' : fastWind ? 'wind' : hot ? 'heat' : (evening && pleasant ? 'play' : stargazing ? 'stargaze' : 'calm');
    // A pleasant evening is the only time the trio plays together.
    return { phase, weather, mode, cloud, wind, gusts, temperature, gustLevel: gusts >= 65 ? 'strong' : 'normal' };
  }

  function createParticles(layer, kind, item) {
    layer.replaceChildren();
    const amount = number(kind === 'rain' ? item.precipitation : item.snowfall) ?? 0;
    const windDirection = number(item.windDirection) ?? 270;
    const directionalDrift = -Math.sin(windDirection * Math.PI / 180) * 18;
    const probability = number(item.rainChance) ?? 0;
    const base = kind === 'rain' ? Math.round(Math.min(30, Math.max(6, probability * .19 + amount * 5))) :
      Math.round(Math.min(26, Math.max(7, amount * 15 + 7)));
    const count = Math.max(0, Math.min(30, base));
    for (let i = 0; i < count; i++) {
      const particle = el('span', 'le-weather-particle');
      particle.style.setProperty('--particle-x', `${(i * 37 + 7) % 100}%`);
      particle.style.setProperty('--particle-delay', `${-((i * 17) % 31) / 10}s`);
      particle.style.setProperty('--particle-duration', kind === 'rain'
        ? `${Math.max(.55, 1.75 - (number(item.precipitation) ?? 0) * .08)}s`
        : `${4.2 + (i % 5) * .6}s`);
      particle.style.setProperty('--particle-drift', `${Math.round(directionalDrift + ((i * 13) % 15) - 7)}px`);
      if (kind === 'snow') particle.style.setProperty('--particle-size', `${3 + (i % 4)}px`);
      layer.appendChild(particle);
    }
  }

  function activateWeather() {
    const view = mount('weather');
    if (!view) return;
    addStyles();

    const scene = createAtmosphere();
    view.root.insertBefore(scene, view.root.firstChild);
    const residentHost = scene.querySelector('[data-resident-host]');
    let residentsDisposed = false;
    ensureResidentLibrary().then(library => {
      if (residentsDisposed || !isActive('weather') || !residentHost?.isConnected) return;
      library.mount(residentHost);
      // The forecast may finish before the separately loaded SVG library. Reapply
      // the latest selected hour after mounting so the cast never falls back to calm.
      if (forecast.length) renderSelected(selectedIndex);
      else library.setActivity(residentHost, { mode: 'calm', gustLevel: 'normal' });
    }).catch(error => {
      console.warn('[LIVE // EARTH] The little residents are resting until their library is available.', error);
    });
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Checking Location permission…');
    body.appendChild(status);

    const summaryCard = card('Weather around you', 'Turn the red Location Orb ON to load a fresh local forecast.');
    const now = el('div', 'le-weather-now');
    const icon = el('div', 'le-weather-condition-icon', '🌤️');
    icon.setAttribute('aria-hidden', 'true');
    const summary = el('div', 'le-weather-summary');
    const temperature = el('strong', 'le-weather-temp', '—°');
    const condition = el('div', 'le-weather-condition', 'Waiting for weather');
    const localTime = el('div', 'le-weather-local-time', 'A little world, waiting for its forecast');
    summary.append(temperature, condition, localTime);
    now.append(icon, summary);
    summaryCard.appendChild(now);
    const metricGrid = el('div', 'le-weather-metric-grid');
    const metricNodes = {};
    for (const [key, label] of [['feels', 'Feels like'], ['humidity', 'Humidity'], ['wind', 'Wind'], ['gusts', 'Gusts'], ['rain', 'Rain chance'], ['clouds', 'Clouds']]) {
      const metric = el('div', 'le-weather-metric');
      metric.appendChild(el('span', 'le-weather-metric-label', label));
      metricNodes[key] = el('strong', 'le-weather-metric-value', '—');
      metric.appendChild(metricNodes[key]);
      metricGrid.appendChild(metric);
    }
    summaryCard.appendChild(metricGrid);
    body.appendChild(summaryCard);

    const timelineCard = card('Travel through the next hours', 'Choose an hour to watch the same little world respond to its forecast.');
    const timeline = el('div', 'le-weather-timeline');
    const hourStrip = el('div', 'le-weather-hour-strip');
    hourStrip.setAttribute('role', 'group');
    hourStrip.setAttribute('aria-label', 'Hourly weather forecast');
    const rangeLabel = el('div', 'le-weather-range-label');
    const rangeStart = el('span', '', 'Now');
    const rangeSelected = el('strong', '', 'Waiting for forecast');
    rangeLabel.append(rangeStart, rangeSelected);
    const range = el('input', 'le-weather-range');
    range.type = 'range'; range.min = '0'; range.max = '0'; range.step = '1'; range.value = '0';
    range.disabled = true;
    range.setAttribute('aria-label', 'Select forecast hour');
    timeline.append(hourStrip, rangeLabel, range);
    timelineCard.appendChild(timeline);
    body.appendChild(timelineCard);

    const actionRow = el('div', 'le-sfv-controls');
    const refresh = button('Refresh forecast', () => readExistingLocation());
    refresh.classList.add('le-weather-refresh');
    actionRow.appendChild(refresh);
    timelineCard.appendChild(actionRow);
    attribution(body, [
      { text: 'Weather data by ' },
      { label: 'Open-Meteo.com', href: 'https://open-meteo.com/' },
      { text: ' · ' },
      { label: 'CC BY 4.0', href: 'https://creativecommons.org/licenses/by/4.0/' }
    ]);

    let abortController = null;
    let pollTimer = 0;
    let locationEventHandler = null;
    let networkOfflineHandler = null;
    let networkOnlineHandler = null;
    let forecast = [];
    let selectedIndex = 0;

    function clearForecast() {
      forecast = [];
      selectedIndex = 0;
      hourStrip.replaceChildren();
      range.max = '0'; range.value = '0'; range.disabled = true;
      rangeSelected.textContent = 'No forecast';
      temperature.textContent = '—°';
      condition.textContent = 'Weather unavailable';
      localTime.textContent = 'Enable Location and connect to the internet';
      icon.textContent = '🌤️';
      for (const node of Object.values(metricNodes)) node.textContent = '—';
      scene.dataset.weather = 'clear'; scene.dataset.phase = 'day'; scene.dataset.mode = 'calm';
      window.LiveEarthResidentLibrary?.setActivity(residentHost, { mode: 'calm', gustLevel: 'normal' });
      scene.style.setProperty('--le-cloud-opacity', '.22');
      scene.style.setProperty('--le-rain-opacity', '.0');
      scene.style.setProperty('--le-snow-opacity', '.0');
      scene.querySelector('.le-weather-rain').replaceChildren();
      scene.querySelector('.le-weather-snow').replaceChildren();
    }

    function renderSelected(index) {
      if (!forecast.length) return;
      selectedIndex = Math.max(0, Math.min(forecast.length - 1, Number(index) || 0));
      const item = forecast[selectedIndex];
      const state = visualState(item);
      const description = describeItem(item);
      const emoji = iconForItem(item);
      const time = formatTime(item.time, selectedIndex);
      scene.dataset.weather = state.weather;
      scene.dataset.phase = state.phase;
      scene.dataset.mode = state.mode;
      window.LiveEarthResidentLibrary?.setActivity(residentHost, state);
      scene.dataset.gust = state.gustLevel;
      scene.style.setProperty('--le-cloud-opacity', String(.12 + (Math.max(0, Math.min(100, state.cloud)) / 100) * .85));
      scene.style.setProperty('--le-rain-opacity', String(Math.min(.95, .42 + (number(item.precipitation) ?? 0) * .22)));
      scene.style.setProperty('--le-snow-opacity', String(Math.min(.95, .45 + (number(item.snowfall) ?? 0) * .38)));
      const windDirection = number(item.windDirection) ?? 270;
      const windDrift = -Math.sin(windDirection * Math.PI / 180) * Math.max(5, state.wind * .45);
      scene.style.setProperty('--le-wind-drift', `${Math.round(windDrift)}px`);
      scene.style.setProperty('--le-cloud-drift', `${Math.round(Math.sign(windDrift || 1) * Math.max(24, Math.abs(windDrift) * 6))}px`);
      scene.style.setProperty('--le-cloud-duration', `${Math.max(20, 62 - state.wind * .55)}s`);
      scene.style.setProperty('--le-gust-duration', `${Math.max(.65, 2.2 - state.gusts / 90)}s`);
      createParticles(scene.querySelector('.le-weather-rain'), 'rain', item);
      createParticles(scene.querySelector('.le-weather-snow'), 'snow', item);

      icon.textContent = emoji;
      temperature.textContent = `${round(item.temperature)}°`;
      condition.textContent = description;
      localTime.textContent = `${time} forecast · ${state.phase === 'evening' ? 'Evening light' : state.phase === 'night' ? 'Night atmosphere' : state.phase === 'dawn' ? 'First light' : 'Daylight'}`;
      metricNodes.feels.textContent = `${round(item.feelsLike)}°`;
      metricNodes.humidity.textContent = `${round(item.humidity)}%`;
      metricNodes.wind.textContent = `${round(item.wind)} km/h`;
      metricNodes.gusts.textContent = `${round(item.gusts)} km/h`;
      metricNodes.rain.textContent = `${round(item.rainChance)}%`;
      metricNodes.clouds.textContent = `${round(item.cloudCover)}%`;
      range.value = String(selectedIndex);
      rangeSelected.textContent = `${time} · ${round(item.temperature)}° · ${description}`;
      hourStrip.querySelectorAll('.le-weather-hour').forEach((node, i) => node.setAttribute('aria-pressed', String(i === selectedIndex)));
    }

    function buildTimeline() {
      hourStrip.replaceChildren();
      forecast.forEach((item, index) => {
        const time = formatTime(item.time, index);
        const hourButton = button('', () => renderSelected(index), 'le-weather-hour');
        hourButton.setAttribute('aria-pressed', String(index === selectedIndex));
        hourButton.setAttribute('aria-label', `${time}, ${round(item.temperature)} degrees, ${describeItem(item)}`);
        hourButton.append(
          el('span', 'le-weather-hour-time', index === 0 ? 'NOW' : time),
          el('span', 'le-weather-hour-icon', iconForItem(item)),
          el('strong', 'le-weather-hour-temp', `${round(item.temperature)}°`)
        );
        hourStrip.appendChild(hourButton);
      });
      range.max = String(Math.max(0, forecast.length - 1));
      range.value = String(selectedIndex);
      range.disabled = forecast.length < 2;
    }

    function privacyState() {
      status.hidden = false;
      abortController?.abort();
      clearForecast();
      summaryCard.querySelector('.le-sfv-copy').textContent = 'No weather request is made while Location is OFF. Coordinates are not saved by this view.';
      setStatus(status, 'Location OFF · local weather is cleared. Turn ON the red Location Orb to request a fresh forecast.');
      refresh.disabled = false;
      rangeSelected.textContent = 'Location is off';
    }
    function loadingState() {
      status.hidden = false;
      setStatus(status, 'Location is ON · waiting for the shared Location Orb to provide a fresh position…');
      localTime.textContent = 'The Weather view never requests GPS by itself';
    }
    function offlineState() {
      status.hidden = false;
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      abortController?.abort();
      clearForecast();
      summaryCard.querySelector('.le-sfv-copy').textContent = 'Weather data is unavailable offline. Reconnect to request a fresh model update.';
      setStatus(status, 'Offline · a fresh weather forecast needs an internet connection. No old forecast is shown as current.', 'error');
      rangeSelected.textContent = 'Offline · no stale forecast';
      refresh.disabled = false;
    }

    async function readExistingLocation() {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { privacyState(); return; }
      if (navigator.onLine === false) { offlineState(); return; }
      const point = globe()?.getLocation?.();
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
        loadingState(); waitForExistingFix(); return;
      }
      if (abortController) abortController.abort();
      abortController = new AbortController();
      const controller = abortController;
      refresh.disabled = true;
      setStatus(status, 'Loading the latest conditions and hourly forecast…');
      try {
        const query = new URLSearchParams({
          latitude: String(point.latitude),
          longitude: String(point.longitude),
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
          hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',
          forecast_days: '2',
          timezone: 'auto',
          wind_speed_unit: 'kmh',
          temperature_unit: 'celsius',
          precipitation_unit: 'mm'
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, {
          mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
        });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}.`);
        const data = await response.json();
        if (!isActive('weather') || window.liveEarthLocationAllowed?.() !== true || abortController !== controller) return;
        if (!data?.current || !Number.isFinite(Number(data.current.temperature_2m))) {
          throw new Error('The weather response did not contain usable current conditions.');
        }
        const nextForecast = makeForecast(data);
        if (!nextForecast.length) throw new Error('The weather source did not return an hourly forecast.');
        forecast = nextForecast;
        selectedIndex = 0;
        buildTimeline();
        renderSelected(0);
        // The successful forecast needs no large status paragraph. The compact
        // provider attribution remains visible at the foot of the floating overlay.
        status.hidden = true;
        setStatus(status, '', 'success');
        summaryCard.querySelector('.le-sfv-copy').textContent = 'One landscape, changing with the forecast. Three little neighbours react to the conditions outside.';
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('weather') && window.liveEarthLocationAllowed?.() === true) {
          status.hidden = false;
          clearForecast();
          summaryCard.querySelector('.le-sfv-copy').textContent = 'The forecast could not be refreshed. The scene is kept neutral until fresh data is available.';
          setStatus(status, `Weather could not be loaded: ${error?.message || 'connection unavailable'}.`, 'error');
        }
      } finally {
        if (abortController === controller) refresh.disabled = false;
      }
    }

    function waitForExistingFix() {
      if (pollTimer) clearInterval(pollTimer);
      let remaining = 24;
      pollTimer = window.setInterval(() => {
        if (!isActive('weather')) { clearInterval(pollTimer); pollTimer = 0; return; }
        if (window.liveEarthLocationAllowed?.() !== true) {
          clearInterval(pollTimer); pollTimer = 0; privacyState(); return;
        }
        const point = globe()?.getLocation?.();
        if (point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
          clearInterval(pollTimer); pollTimer = 0; readExistingLocation(); return;
        }
        remaining--;
        if (remaining <= 0) {
          clearInterval(pollTimer); pollTimer = 0;
          setStatus(status, 'Location is ON, but the shared scanner has not supplied a fresh position yet. Wait for it to settle, then refresh.', 'error');
        }
      }, 500);
    }

    range.addEventListener('input', () => renderSelected(range.value));
    locationEventHandler = event => {
      if (!isActive('weather')) return;
      if (event.detail?.enabled !== true || window.liveEarthLocationAllowed?.() !== true) {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = 0;
        privacyState();
      } else { loadingState(); waitForExistingFix(); }
    };
    networkOfflineHandler = () => { if (isActive('weather')) offlineState(); };
    networkOnlineHandler = () => {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { privacyState(); return; }
      loadingState();
      if (globe()?.getLocation?.()) readExistingLocation(); else waitForExistingFix();
    };
    window.addEventListener('live-earth-location-state', locationEventHandler);
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);

    if (window.liveEarthLocationAllowed?.() === true) { loadingState(); waitForExistingFix(); }
    else privacyState();

    return () => {
      residentsDisposed = true;
      window.LiveEarthResidentLibrary?.unmount(residentHost);
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      abortController?.abort(); abortController = null;
      if (locationEventHandler) window.removeEventListener('live-earth-location-state', locationEventHandler);
      if (networkOfflineHandler) window.removeEventListener('offline', networkOfflineHandler);
      if (networkOnlineHandler) window.removeEventListener('online', networkOnlineHandler);
    };
  }

  runtime.registerFeature('weather', activateWeather);
})();
