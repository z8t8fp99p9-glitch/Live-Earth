/* LIVE // EARTH — Weather: Japanese art-led 2D immersive view.
   Design language: expressive editorial typography + full-screen atmosphere +
   Japanese minimalist art (ink-wash mountains, woodblock colour, maple foliage).
   Runtime contract: uses only an already-enabled fresh Location fix; no GPS request,
   no second globe, no WebGL/3D, no external art dependency. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, el, isActive, globe } = runtime;
  const STYLE_ID = 'le-weather-japanese-editorial-2d-style';
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';
  const REFRESH_MS = 15 * 60 * 1000;
  const MAX_PARTICLES = 22;

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather {
        position:absolute!important; inset:0!important; width:100%!important; height:100%!important;
        max-width:none!important; overflow:hidden!important; padding:0!important; margin:0!important;
        border:0!important; border-radius:0!important; background:#0d282b!important;
        isolation:isolate; pointer-events:none;
      }
      .le-sfv--weather > .le-sfv-panel { display:none!important; }
      .le-weather-screen {
        --le-weather-ink:#f7f5ee; --le-weather-muted:#d3ddd8; --le-weather-line:#f4f3e94d;
        --le-weather-glass:rgba(10,34,35,.48); --le-weather-accent:#cf493e;
        position:absolute; inset:0; z-index:1; overflow-x:hidden; overflow-y:auto;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch; scrollbar-width:none;
        color:var(--le-weather-ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        background:#10282b; pointer-events:auto; isolation:isolate;
      }
      .le-weather-screen::-webkit-scrollbar{display:none}
      .le-weather-art{position:fixed;inset:0;z-index:-2;overflow:hidden;pointer-events:none;background:linear-gradient(180deg,#12363b,#183c3c 53%,#09282a)}
      .le-weather-art svg{display:block;width:100%;height:100%;min-height:100%;object-fit:cover}
      .le-weather-art-wash{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,24,28,.34) 0%,rgba(5,25,29,.12) 27%,rgba(5,25,28,.26) 57%,rgba(4,22,24,.75) 100%),linear-gradient(90deg,rgba(4,24,27,.60),transparent 78%);transition:background 1.4s ease}
      .le-weather-sun-disk{fill:var(--le-art-sun,#c9473d);opacity:.9;transition:fill 1.3s ease,opacity 1.3s ease}
      .le-weather-moon-disk{fill:#e6e7df;opacity:0;transition:opacity 1.2s ease}
      .le-weather-maple{fill:var(--le-art-maple,#c8443b);stroke:#671e24;stroke-width:.8;stroke-linejoin:round;transition:fill 1.2s ease}
      .le-weather-ink-ridge{fill:var(--le-art-ridge,#263f3d);transition:fill 1.2s ease}
      .le-weather-pagoda{fill:var(--le-art-building,#142b2d);stroke:var(--le-art-line,#d7d2c2);stroke-width:1.1;stroke-linejoin:round;transition:fill 1.2s ease,stroke 1.2s ease}
      .le-weather-water{fill:var(--le-art-water,#244c4a);transition:fill 1.2s ease}
      .le-weather-rain,.le-weather-snow{position:absolute;inset:0;overflow:hidden;opacity:0;transition:opacity .8s ease}
      .le-weather-particle{position:absolute;top:-12%;left:var(--particle-x);pointer-events:none;will-change:transform;animation:le-weather-fall var(--particle-duration,1.6s) linear var(--particle-delay,0s) infinite}
      .le-weather-rain .le-weather-particle{width:1.2px;height:clamp(13px,3vh,23px);border-radius:2px;background:linear-gradient(180deg,transparent,#e7f6f3c9);transform:rotate(13deg)}
      .le-weather-snow .le-weather-particle{width:var(--particle-size,4px);height:var(--particle-size,4px);border-radius:50%;background:#f8fbf6;box-shadow:0 0 7px #fff9;animation-name:le-weather-snow-fall;animation-duration:var(--particle-duration,5s)}
      .le-weather-fog{position:absolute;inset:42% -14% 0;opacity:0;pointer-events:none;background:linear-gradient(180deg,transparent 0%,rgba(222,233,226,.05) 18%,rgba(215,227,219,.36) 58%,rgba(215,227,219,.14) 100%);filter:blur(13px);transition:opacity 1.2s ease}
      .le-weather-lightning{position:absolute;inset:0;opacity:0;background:rgba(230,243,247,.72);mix-blend-mode:screen;pointer-events:none}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"]{--le-art-sun:#bd4941;--le-art-maple:#a93637;--le-art-ridge:#233d3d;--le-art-building:#112a2c;--le-art-water:#163f41}
      .le-weather-screen[data-weather="snow"]{--le-art-sun:#d5d4c8;--le-art-maple:#8e4550;--le-art-ridge:#7c9293;--le-art-building:#344b50;--le-art-water:#819b9c}
      .le-weather-screen[data-weather="fog"]{--le-art-sun:#c8c9bd;--le-art-maple:#98605a;--le-art-ridge:#718783;--le-art-building:#334b4a;--le-art-water:#5d7d79}
      .le-weather-screen[data-weather="cloudy"]{--le-art-sun:#c3bca9;--le-art-maple:#ab5047;--le-art-ridge:#425b54;--le-art-building:#1b3938;--le-art-water:#315a55}
      .le-weather-screen[data-weather="hot"]{--le-art-sun:#d69a57;--le-art-maple:#b84e37;--le-art-ridge:#66594b;--le-art-building:#493c34;--le-art-water:#536d63}
      .le-weather-screen[data-phase="night"]{--le-art-sun:#d7d3bd;--le-art-maple:#7c3945;--le-art-ridge:#182b32;--le-art-building:#101d27;--le-art-water:#102b35}
      .le-weather-screen[data-phase="night"] .le-weather-sun-disk{opacity:0}
      .le-weather-screen[data-phase="night"] .le-weather-moon-disk{opacity:.92}
      .le-weather-screen[data-weather="rain"] .le-weather-rain,.le-weather-screen[data-weather="storm"] .le-weather-rain{opacity:var(--le-rain-opacity,.65)}
      .le-weather-screen[data-weather="snow"] .le-weather-snow{opacity:var(--le-snow-opacity,.72)}
      .le-weather-screen[data-weather="fog"] .le-weather-fog{opacity:.92}
      .le-weather-screen[data-weather="storm"] .le-weather-lightning{animation:le-weather-flash 11s linear infinite}
      .le-weather-screen[data-weather="rain"] .le-weather-art-wash,.le-weather-screen[data-weather="storm"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(4,18,25,.52),rgba(6,23,29,.26) 35%,rgba(3,17,23,.76) 100%),linear-gradient(90deg,rgba(3,17,23,.69),transparent 84%)}
      .le-weather-screen[data-phase="dawn"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(26,39,43,.14),rgba(30,34,35,.04) 38%,rgba(4,22,25,.72) 100%),linear-gradient(90deg,rgba(5,22,25,.36),transparent 80%)}
      .le-weather-screen[data-phase="evening"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(38,23,35,.30),rgba(20,24,32,.14) 38%,rgba(4,20,24,.80) 100%),linear-gradient(90deg,rgba(5,20,26,.42),transparent 84%)}
      .le-weather-screen[data-phase="night"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(3,9,24,.54),rgba(4,15,29,.25) 38%,rgba(2,10,21,.86) 100%),linear-gradient(90deg,rgba(3,11,22,.58),transparent 82%)}
      .le-weather-content{position:relative;z-index:2;width:min(100%,760px);margin:0 auto;padding:calc(env(safe-area-inset-top) + 18px) clamp(20px,5.2vw,36px) calc(env(safe-area-inset-bottom) + 118px)}
      .le-weather-topbar{display:flex;justify-content:space-between;align-items:center;gap:14px;min-height:34px;text-shadow:0 2px 16px #061b1d99}
      .le-weather-brand{font-size:12px;font-weight:780;letter-spacing:.19em;white-space:nowrap}
      .le-weather-brand span{font-weight:400;opacity:.78}
      .le-weather-location{display:flex;align-items:center;gap:7px;color:#e9efea;font-size:11px;letter-spacing:.035em;min-width:0}
      .le-weather-location svg{width:13px;height:16px;flex:0 0 auto;opacity:.9}
      .le-weather-date{margin-top:40px;color:#e4e9e3;font-size:9px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;text-shadow:0 2px 18px #061a1d}
      .le-weather-hero{position:relative;margin-top:15px;max-width:540px;text-shadow:0 3px 22px rgba(0,15,20,.42)}
      .le-weather-headline{margin:0;max-width:520px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(44px,12vw,76px);font-weight:400;line-height:.91;letter-spacing:-.055em;text-wrap:balance}
      .le-weather-headline em{font-weight:400;color:#fff;font-style:italic}
      .le-weather-headline::after{content:"";display:block;width:38px;height:2px;background:var(--le-weather-accent);margin:18px 0 15px;box-shadow:0 0 12px #d44a3e55}
      .le-weather-temperature-row{display:flex;align-items:center;gap:17px}
      .le-weather-temperature{font-family:Georgia,"Times New Roman",serif;font-size:clamp(86px,22vw,124px);font-weight:400;letter-spacing:-.09em;line-height:.83;white-space:nowrap}
      .le-weather-temperature sup{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.31em;vertical-align:top;letter-spacing:-.02em;margin-left:5px}
      .le-weather-condition{border-left:1px solid rgba(245,246,239,.48);padding:4px 0 5px 16px;min-width:0}
      .le-weather-condition-icon{width:42px;height:36px;display:block;margin-bottom:5px;color:#f4f5ee}
      .le-weather-condition-name{font-family:Georgia,"Times New Roman",serif;font-size:17px;line-height:1.15}
      .le-weather-feels{margin-top:5px;color:#d1dbd8;font-size:12px}
      .le-weather-poetry{margin:20px 0 0 2px;max-width:380px;color:#e4e8df;font-family:Georgia,"Times New Roman",serif;font-size:15px;font-style:italic;line-height:1.5}
      .le-weather-data-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:28px;padding:15px 8px;border:1px solid rgba(222,242,234,.22);border-radius:17px;background:linear-gradient(130deg,rgba(230,246,236,.16),rgba(14,46,47,.42) 44%,rgba(4,25,28,.60));box-shadow:inset 0 1px rgba(255,255,255,.18),0 12px 34px rgba(0,10,16,.14);backdrop-filter:blur(13px) saturate(1.12);-webkit-backdrop-filter:blur(13px) saturate(1.12)}
      .le-weather-stat{min-width:0;padding:0 9px;border-right:1px solid rgba(232,244,235,.23)}.le-weather-stat:last-child{border-right:0}
      .le-weather-stat-label{display:block;color:#d0ddd6;font-size:8px;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}
      .le-weather-stat-value{display:block;margin-top:7px;color:#fff;font-size:clamp(12px,3.3vw,17px);font-weight:680;line-height:1.1;white-space:nowrap}
      .le-weather-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:27px 2px 12px}
      .le-weather-section-title{margin:0;color:#eef1e9;font-size:9px;font-weight:760;letter-spacing:.22em;text-transform:uppercase}
      .le-weather-section-note{color:#d0ddd7;font-size:9px;letter-spacing:.08em;text-transform:uppercase}
      .le-weather-hourly{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(52px,1fr);gap:3px;overflow-x:auto;padding:5px 0 9px;scrollbar-width:none;overscroll-behavior-x:contain}
      .le-weather-hourly::-webkit-scrollbar{display:none}
      .le-weather-hour{display:grid;justify-items:center;align-content:start;gap:8px;min-width:0;padding:9px 3px 7px;border-top:1px solid rgba(238,245,237,.25);color:#f2f4ee;text-align:center}
      .le-weather-hour-time{font-size:9px;color:#d7e1da;white-space:nowrap}
      .le-weather-hour-icon{width:24px;height:24px;color:#f1f2eb}
      .le-weather-hour-temp{font-size:15px;font-weight:680;white-space:nowrap}
      .le-weather-hour-rain{font-size:8px;color:#9bd8e3;white-space:nowrap}
      .le-weather-curve{display:block;width:100%;height:38px;margin-top:-2px;overflow:visible;opacity:.92}
      .le-weather-curve path{fill:none;stroke:#e9eee5;stroke-width:1.55;vector-effect:non-scaling-stroke}
      .le-weather-curve circle{fill:#f1f2eb;stroke:#25464a;stroke-width:1.2;vector-effect:non-scaling-stroke}
      .le-weather-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px}
      .le-weather-metric{min-width:0;padding:12px 10px 13px;border:1px solid rgba(226,242,232,.18);border-radius:13px;background:linear-gradient(145deg,rgba(229,246,236,.14),rgba(8,32,34,.58));box-shadow:inset 0 1px rgba(255,255,255,.12);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
      .le-weather-metric-label{display:block;color:#c9d8d0;font-size:8px;letter-spacing:.13em;text-transform:uppercase}
      .le-weather-metric-value{display:block;margin-top:7px;color:#fff;font-size:16px;font-weight:690;line-height:1.1;overflow-wrap:anywhere}
      .le-weather-metric-note{display:block;margin-top:4px;color:#c0d0c9;font-size:9px;line-height:1.3}
      .le-weather-status{margin:16px 2px 0;color:#d0ded5;font-size:10px;line-height:1.55;text-shadow:0 1px 10px #071c1d}
      .le-weather-status:empty{display:none}
      .le-weather-attribution{margin:22px 2px 0;color:#c0d0c7;font-size:8px;line-height:1.5;opacity:.78}
      .le-weather-screen[data-weather="rain"] .le-weather-rain,.le-weather-screen[data-weather="storm"] .le-weather-rain{display:block}
      @keyframes le-weather-fall{to{transform:translate3d(var(--particle-drift,12px),112vh,0)}}
      @keyframes le-weather-snow-fall{0%{transform:translate3d(0,-8vh,0)}50%{transform:translate3d(var(--particle-drift,14px),50vh,0)}100%{transform:translate3d(calc(var(--particle-drift,14px) * -1),112vh,0)}}
      @keyframes le-weather-flash{0%,91%,94%,100%{opacity:0}92%{opacity:.16}92.6%{opacity:0}93.2%{opacity:.10}}
      @media(min-width:700px){.le-weather-content{padding-top:32px;padding-bottom:34px}.le-weather-date{margin-top:52px}.le-weather-headline{font-size:clamp(68px,8vw,104px)}.le-weather-temperature{font-size:136px}.le-weather-data-strip{max-width:680px}.le-weather-hourly{grid-auto-columns:minmax(68px,1fr)}.le-weather-metrics{max-width:680px}}
      @media(max-width:390px){.le-weather-content{padding-left:17px;padding-right:17px}.le-weather-date{margin-top:31px}.le-weather-data-strip{padding:13px 4px}.le-weather-stat{padding:0 6px}.le-weather-stat-label{font-size:7px;letter-spacing:.09em}.le-weather-stat-value{font-size:12px}.le-weather-headline{font-size:clamp(41px,11.5vw,54px)}.le-weather-poetry{font-size:14px}.le-weather-metric{padding:10px 8px}}
      @media(orientation:landscape) and (max-height:520px){.le-weather-content{padding-top:calc(env(safe-area-inset-top) + 12px);padding-bottom:calc(env(safe-area-inset-bottom) + 105px)}.le-weather-date{margin-top:18px}.le-weather-headline{font-size:42px}.le-weather-temperature{font-size:72px}.le-weather-data-strip{margin-top:15px}.le-weather-section-head{margin-top:16px}}
      @media(prefers-reduced-motion:reduce){.le-weather-screen *,.le-weather-screen *:before,.le-weather-screen *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      @media(prefers-reduced-transparency:reduce){.le-weather-data-strip,.le-weather-metric{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(7,25,28,.92)}}
    `;
    document.head.appendChild(style);
  }

  function createArt() {
    const art = el('div', 'le-weather-art');
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = `
      <svg viewBox="0 0 430 820" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id="le-weather-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#35545a"/><stop offset=".48" stop-color="#94aaa3"/><stop offset="1" stop-color="#d3d0bd"/></linearGradient>
          <linearGradient id="le-weather-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#527c78"/><stop offset=".42" stop-color="#244f50"/><stop offset="1" stop-color="#102d31"/></linearGradient>
          <linearGradient id="le-weather-mist" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6e4d7" stop-opacity="0"/><stop offset=".48" stop-color="#e6e4d7" stop-opacity=".64"/><stop offset="1" stop-color="#e6e4d7" stop-opacity="0"/></linearGradient>
          <linearGradient id="le-weather-ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#243c3b"/><stop offset="1" stop-color="#0e292d"/></linearGradient>
          <pattern id="le-weather-paper-grain" width="19" height="19" patternUnits="userSpaceOnUse"><path d="M2 5l3-.4M11 14l2-.3M16 3l1.4-.2" stroke="#f2ead9" stroke-opacity=".10" stroke-width=".7"/></pattern>
        </defs>
        <rect width="430" height="820" fill="url(#le-weather-sky)"/>
        <circle class="le-weather-sun-disk" cx="336" cy="190" r="61"/>
        <circle class="le-weather-moon-disk" cx="336" cy="190" r="42"/>
        <g opacity=".24" fill="none" stroke="#f4f0e4" stroke-width="1.2"><path d="M280 189c24-7 43-7 70-1M297 202c20-5 36-5 57-1M315 174c16-3 28-2 39 1"/></g>
        <path class="le-weather-ink-ridge" opacity=".38" d="M0 370L42 316 74 336 111 272 148 326 183 245 215 305 259 247 292 301 333 228 371 295 430 251V540H0Z"/>
        <path class="le-weather-ink-ridge" opacity=".72" d="M0 426L51 372 91 398 142 325 174 366 219 300 258 356 303 314 341 363 389 315 430 350V564H0Z"/>
        <path d="M0 462c56-25 99-14 144-32 49-21 84-4 123-16 63-21 105-4 163-25v172H0Z" fill="#bac3b4" opacity=".28"/>
        <path d="M0 493c53-17 107-12 151-21 48-9 98-3 139-18 55-20 92-5 140-24v109H0Z" fill="url(#le-weather-mist)" opacity=".72"/>
        <g class="le-weather-pagoda" transform="translate(294 366)">
          <path d="M55 20L84 4 112 20 106 25H62Z"/><path d="M60 24H107V31H60Z"/>
          <path d="M70 31V76H98V31" fill="none" stroke-width="3"/><path d="M63 77H105V83H63Z"/>
          <path d="M42 84L84 64 127 84 119 90H51Z"/><path d="M48 90H120V96H48Z"/>
          <path d="M58 96V143H110V96" fill="none" stroke-width="3.2"/><path d="M50 143H119V150H50Z"/>
          <path d="M28 153L84 128 141 153 133 160H36Z"/><path d="M36 160H134V168H36Z"/>
          <path d="M72 168V204H96V168" fill="none" stroke-width="3"/><path d="M65 205H103V212H65Z"/>
          <path d="M84 4V-10M79-7H89" fill="none" stroke-width="2"/>
          <g fill="#e6b47a" stroke="none" opacity=".9"><rect x="72" y="108" width="8" height="19" rx="2"/><rect x="91" y="108" width="8" height="19" rx="2"/><rect x="76" y="43" width="6" height="17" rx="2"/><rect x="91" y="43" width="6" height="17" rx="2"/></g>
        </g>
        <g class="le-weather-ink-ridge" opacity=".9">
          <path d="M0 500q34-34 67-5 28-46 61-12 32-43 62-9 37-42 73-8 34-39 71-6 33-39 69-7v165H0Z"/>
          <path d="M0 538q34-20 74 1 32-27 65 0 39-30 77 0 40-24 77 2 44-27 84 0 28-16 53-3v126H0Z" fill="#183b3a"/>
        </g>
        <g fill="none" stroke="#d4d1be" stroke-width="2" stroke-linecap="round" opacity=".30"><path d="M18 470q44-14 88-2t91-5 102 1 111-9"/><path d="M31 486q40-11 78-4t77-2 78 2 126-8"/><path d="M0 516q49-10 95-3t95 0 93-4 147-5"/></g>
        <rect y="553" width="430" height="267" fill="url(#le-weather-water)"/>
        <path d="M0 556q66 13 127 0t125 0 178-1" fill="none" stroke="#d0d4c2" stroke-opacity=".45" stroke-width="2"/>
        <g fill="none" stroke="#b6c9bc" stroke-linecap="round" opacity=".34"><path d="M0 588q59 8 114 0t106 1 104-2 106 0"/><path d="M25 621q52 7 103 1t105-1 92 2 90-2"/><path d="M0 671q61-7 125 2t123-1 182-2"/><path d="M30 733q70-7 131 2t124-2 139 0"/></g>
        <g fill="none" stroke="#e2d9c6" stroke-width="1.5" opacity=".38"><ellipse cx="91" cy="628" rx="23" ry="4"/><ellipse cx="91" cy="628" rx="39" ry="7"/><ellipse cx="333" cy="689" rx="27" ry="5"/><ellipse cx="333" cy="689" rx="43" ry="9"/><ellipse cx="219" cy="765" rx="32" ry="6"/></g>
        <g class="le-weather-maple">
          <path d="M345 0c-9 32-21 52-39 75-15-15-30-19-47-17 7 13 17 20 33 25-23 5-39 17-51 33 21 1 39-4 55-17-5 21-2 40 10 57 9-20 11-38 7-57 16 16 35 23 57 22-11-17-27-29-48-34 21-7 34-20 41-39-20 2-37 9-51 24 5-26 14-49 33-72Z"/>
          <path d="M420 46c-13 28-26 46-44 63-13-12-26-15-41-12 7 11 16 16 30 19-20 5-34 15-44 28 18 1 33-3 47-14-4 18-1 34 9 48 8-17 10-32 7-48 14 14 30 20 49 19-10-15-23-25-42-29 18-6 29-17 35-33-17 2-31 8-44 21 5-21 14-41 38-62Z"/>
          <path d="M304 35q28 36 68 67M367 70q-16 19-24 40" fill="none" stroke="#67313a" stroke-width="2"/>
        </g>
        <g class="le-weather-maple" opacity=".74" transform="translate(0 280) scale(.54)"><path d="M55 0c-6 24-15 39-29 57C14 46 2 43-11 46-5 56 3 62 16 65-2 70-15 80-24 92-8 93 6 89 18 79 14 96 17 111 26 124 33 109 35 95 32 80 44 92 59 98 76 97 67 84 55 75 40 72 56 67 68 57 74 43 58 45 44 51 34 64 39 43 48 25 55 0Z"/></g>
        <g fill="none" stroke="#e8e0cf" stroke-width="1.3" opacity=".28"><path d="M45 352q18-33 37-42M84 310q21 15 39 41M365 295q16-19 29-44M383 276q20 7 32 26"/></g>
        <rect width="430" height="820" fill="url(#le-weather-paper-grain)" opacity=".75"/>
      </svg>
      <div class="le-weather-art-wash"></div>
      <div class="le-weather-fog"></div>
      <div class="le-weather-rain"></div>
      <div class="le-weather-snow"></div>
      <div class="le-weather-lightning"></div>
    `;
    return art;
  }

  function number(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function hourOf(time) {
    const match = /T(\d{2}):/.exec(String(time || ''));
    return match ? Number(match[1]) : 12;
  }
  function isSnow(item) {
    return number(item.snowfall) > 0 || [71,73,75,77,85,86].includes(number(item.weather_code));
  }
  function isRain(item) {
    return number(item.rain) > 0 || number(item.showers) > 0 || number(item.precipitation) > 0 ||
      [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(number(item.weather_code));
  }
  function isFog(item) { return [45,48].includes(number(item.weather_code)); }
  function visualState(item) {
    const temperature = number(item.feelsLike) ?? number(item.temperature);
    const wind = number(item.wind) ?? 0;
    const gusts = number(item.gusts) ?? wind;
    const cloud = number(item.cloudCover) ?? 0;
    const hour = hourOf(item.time);
    const isDay = number(item.isDay);
    const evening = hour >= 16 && hour <= 19;
    const night = isDay === 0 || (isDay === null && (hour >= 20 || hour < 5));
    const dawn = !night && hour >= 5 && hour <= 7;
    const phase = night ? 'night' : dawn ? 'dawn' : evening ? 'evening' : 'day';
    const snow = isSnow(item);
    const rain = isRain(item);
    const thunder = [95,96,99].includes(number(item.weather_code));
    const fog = isFog(item);
    const actualTemperature = number(item.temperature) ?? temperature;
    const hot = actualTemperature !== null && actualTemperature >= 34;
    const weather = snow ? 'snow' : thunder ? 'storm' : rain ? 'rain' : fog ? 'fog' : cloud >= 65 ? 'cloudy' : hot ? 'hot' : 'clear';
    return { phase, weather, cloud, wind, gusts };
  }
  function conditionLabel(code) {
    const value = number(code);
    if (value === 0) return 'Clear sky';
    if (value === 1) return 'Mainly clear';
    if (value === 2) return 'Partly cloudy';
    if (value === 3) return 'Overcast';
    if (value === 45 || value === 48) return 'Fog';
    if ([51,53,55,56,57].includes(value)) return 'Drizzle';
    if ([61,63,65,66,67,80,81,82].includes(value)) return 'Rain';
    if ([71,73,75,77,85,86].includes(value)) return 'Snow';
    if ([95,96,99].includes(value)) return 'Thunderstorm';
    return 'Current conditions';
  }
  function conditionKind(code) {
    const value = number(code);
    if ([95,96,99].includes(value)) return 'storm';
    if ([71,73,75,77,85,86].includes(value)) return 'snow';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(value)) return 'rain';
    if ([45,48].includes(value)) return 'fog';
    if (value === 1 || value === 2 || value === 3) return 'cloudy';
    return 'clear';
  }
  function compass(degrees) {
    const value = number(degrees);
    if (value === null) return '—';
    return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(value / 22.5) % 16];
  }
  function formatHour(value, isFirst) {
    if (isFirst) return 'NOW';
    const match = /T(\d{2}):/.exec(String(value || ''));
    if (!match) return '—';
    const hour = Number(match[1]);
    return `${String(hour % 12 || 12).padStart(2,'0')}${hour < 12 ? 'a' : 'p'}`;
  }
  function formatDateTime(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ''));
    if (!match) return 'LOCAL WEATHER';
    const [,year,month,day,hour,minute] = match;
    // Open-Meteo returns the forecast location's local wall-clock time. Build
    // the weekday from its calendar date without shifting it to device timezone.
    const date = new Date(Date.UTC(Number(year), Number(month)-1, Number(day)));
    const label = date.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric', timeZone:'UTC' });
    const h = Number(hour);
    return `${label} · ${String(h % 12 || 12).padStart(2,'0')}:${minute} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function headlineFor(kind, phase) {
    const options = {
      clear: phase === 'night' ? 'A clear night' : 'A bright day',
      cloudy: phase === 'night' ? 'Clouds drift softly' : 'A quiet sky',
      rain: phase === 'night' ? 'Rain after dark' : 'A rainy morning',
      storm: phase === 'night' ? 'Storm after dark' : 'A storm is passing',
      snow: phase === 'night' ? 'Snow beneath the moon' : 'A softer kind of snow',
      fog: phase === 'night' ? 'A misty night' : 'A world in mist',
      hot: 'Under a warm sun'
    };
    const phrase = options[kind] || 'Weather, in the moment';
    return phase === 'evening' && kind === 'rain' ? 'Rain in the evening' : phrase;
  }
  function sceneNote(kind, temperature) {
    const notes = {
      clear: 'A little room for sunlight. Take the long way home.',
      cloudy: 'A quiet sky, changing gently through the day.',
      rain: 'A quiet day beneath the clouds. Carry an umbrella.',
      storm: 'Storm conditions nearby. Take care outdoors.',
      snow: 'A slower day under falling snow. Wrap up warmly.',
      fog: 'A softened horizon. Take extra care while travelling.',
      hot: 'Strong warmth through the day. Stay hydrated.'
    };
    if (kind === 'hot' && temperature !== null && temperature >= 40) return 'Very high temperatures. Avoid prolonged time in direct sun.';
    return notes[kind] || 'A closer look at the sky above you.';
  }
  function createParticles(layer, kind, item) {
    layer.replaceChildren();
    const amount = number(kind === 'rain' ? item.precipitation : item.snowfall) ?? 0;
    const windDirection = number(item.windDirection) ?? 270;
    const directionalDrift = -Math.sin(windDirection * Math.PI / 180) * 16;
    const base = kind === 'rain'
      ? Math.round(Math.min(MAX_PARTICLES, Math.max(5, amount * 4)))
      : Math.round(Math.min(MAX_PARTICLES, Math.max(7, amount * 13 + 5)));
    const count = Math.max(0, Math.min(MAX_PARTICLES, base));
    for (let i = 0; i < count; i++) {
      const particle = el('span', 'le-weather-particle');
      particle.style.setProperty('--particle-x', `${(i * 37 + 7) % 100}%`);
      particle.style.setProperty('--particle-delay', `${-((i * 17) % 31) / 10}s`);
      particle.style.setProperty('--particle-duration', kind === 'rain'
        ? `${Math.max(.75, 2.0 - amount * .06)}s`
        : `${4.4 + (i % 5) * .65}s`);
      particle.style.setProperty('--particle-drift', `${Math.round(directionalDrift + ((i * 11) % 13) - 6)}px`);
      if (kind === 'snow') particle.style.setProperty('--particle-size', `${3 + (i % 3)}px`);
      layer.appendChild(particle);
    }
  }
  function iconMarkup(kind) {
    const common = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    const paths = {
      clear: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
      cloudy: '<path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.7A3.2 3.2 0 0 0 7 18Z"/>',
      rain: '<path d="M7 15h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.7A3.2 3.2 0 0 0 7 15Z"/><path d="m8 18-1 3m6-3-1 3m6-3-1 3"/>',
      snow: '<path d="M7 14h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 7.7 3.2 3.2 0 0 0 7 14Z"/><path d="M8 17v4m-2-2h4m5-2v4m-2-2h4"/>',
      storm: '<path d="M7 14h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 7.7 3.2 3.2 0 0 0 7 14Z"/><path d="m13 15-3 4h3l-1 3 4-5h-3l1-2"/>',
      fog: '<path d="M4 10h16M2 14h18M5 18h14"/><path d="M7 6h10"/>'
    };
    const body = paths[kind] || paths.cloudy;
    return `<svg viewBox="0 0 24 24" aria-hidden="true" ${common}>${body}</svg>`;
  }

  function makeScreen() {
    const screen = el('div', 'le-weather-screen');
    screen.dataset.weather = 'clear';
    screen.dataset.phase = 'day';
    screen.innerHTML = `
      <div class="le-weather-content">
        <header class="le-weather-topbar">
          <div class="le-weather-brand">LIVE <span>//</span> EARTH</div>
          <div class="le-weather-location"><svg viewBox="0 0 18 22" fill="none" aria-hidden="true"><path d="M9 20s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/></svg><span id="le-weather-place">YOUR LOCATION</span></div>
        </header>
        <div class="le-weather-date" id="le-weather-date">LOCAL CONDITIONS</div>
        <section class="le-weather-hero" aria-label="Current weather">
          <h1 class="le-weather-headline" id="le-weather-headline">A quiet day<br><em>under open skies.</em></h1>
          <div class="le-weather-temperature-row">
            <div class="le-weather-temperature" id="le-weather-temperature">—<sup>°</sup></div>
            <div class="le-weather-condition"><span class="le-weather-condition-icon" id="le-weather-condition-icon"></span><div class="le-weather-condition-name" id="le-weather-condition">Waiting for weather</div><div class="le-weather-feels" id="le-weather-feels">Location is off</div></div>
          </div>
          <p class="le-weather-poetry" id="le-weather-poetry">Switch on the Location Orb to reveal the sky above you.</p>
        </section>
        <section class="le-weather-data-strip" aria-label="Today's summary">
          <div class="le-weather-stat"><span class="le-weather-stat-label">HIGH / LOW</span><strong class="le-weather-stat-value" id="le-weather-highlow">— / —</strong></div>
          <div class="le-weather-stat"><span class="le-weather-stat-label">RAIN CHANCE</span><strong class="le-weather-stat-value" id="le-weather-rainchance">—</strong></div>
          <div class="le-weather-stat"><span class="le-weather-stat-label">WIND</span><strong class="le-weather-stat-value" id="le-weather-wind">—</strong></div>
          <div class="le-weather-stat"><span class="le-weather-stat-label">HUMIDITY</span><strong class="le-weather-stat-value" id="le-weather-humidity">—</strong></div>
        </section>
        <section aria-label="Hourly forecast">
          <div class="le-weather-section-head"><h2 class="le-weather-section-title">THE HOURS AHEAD</h2><span class="le-weather-section-note">HOURLY FORECAST</span></div>
          <div class="le-weather-hourly" id="le-weather-hourly"><div class="le-weather-hour"><span class="le-weather-hour-time">—</span><span class="le-weather-hour-icon">·</span><strong class="le-weather-hour-temp">—</strong></div></div>
          <svg class="le-weather-curve" id="le-weather-curve" viewBox="0 0 320 38" preserveAspectRatio="none" aria-hidden="true"><path d="M0 25Q80 5 160 21T320 14"/><circle cx="0" cy="25" r="2.3"/><circle cx="160" cy="21" r="2.3"/><circle cx="320" cy="14" r="2.3"/></svg>
        </section>
        <section class="le-weather-metrics" aria-label="More weather details">
          <div class="le-weather-metric"><span class="le-weather-metric-label">UV INDEX</span><strong class="le-weather-metric-value" id="le-weather-uv">—</strong><span class="le-weather-metric-note" id="le-weather-uv-note">Not available</span></div>
          <div class="le-weather-metric"><span class="le-weather-metric-label">PRESSURE</span><strong class="le-weather-metric-value" id="le-weather-pressure">—</strong><span class="le-weather-metric-note">hPa</span></div>
          <div class="le-weather-metric"><span class="le-weather-metric-label">VISIBILITY</span><strong class="le-weather-metric-value" id="le-weather-visibility">—</strong><span class="le-weather-metric-note">km</span></div>
        </section>
        <p class="le-weather-status" id="le-weather-status" aria-live="polite">Switch on the Location Orb to reveal your local forecast.</p>
        <p class="le-weather-attribution">Forecast data: Open-Meteo · Art direction: Japanese ink-wash and woodblock-inspired 2D landscape</p>
      </div>`;
    screen.prepend(createArt());
    return screen;
  }

  function setText(screen, id, value) {
    const node = screen.querySelector(`#${id}`);
    if (node) node.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
  }
  function setTemperature(screen, value) {
    const node = screen.querySelector('#le-weather-temperature');
    if (!node) return;
    node.replaceChildren(document.createTextNode(value === null ? '—' : String(Math.round(value))));
    if (value !== null) {
      const degree = document.createElement('sup');
      degree.textContent = '°';
      node.appendChild(degree);
    }
  }
  function uvLabel(value) {
    const n = number(value);
    if (n === null) return 'Not available';
    if (n < 3) return 'Low';
    if (n < 6) return 'Moderate';
    if (n < 8) return 'High';
    if (n < 11) return 'Very high';
    return 'Extreme';
  }
  function updateCurve(screen, values) {
    const svg = screen.querySelector('#le-weather-curve');
    const safe = values.map(number).filter(value => value !== null);
    if (!svg || safe.length < 2) return;
    const min = Math.min(...safe), max = Math.max(...safe), span = Math.max(1, max - min);
    const points = safe.map((value, index) => ({
      x: (index / Math.max(1, safe.length - 1)) * 320,
      y: 29 - ((value - min) / span) * 22
    }));
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    svg.innerHTML = `<path d="${path}"/>${points.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.2"/>`).join('')}`;
  }
  function renderHourly(screen, data, currentTime) {
    const container = screen.querySelector('#le-weather-hourly');
    const times = data?.hourly?.time;
    if (!container || !Array.isArray(times) || !times.length) {
      if (container) container.textContent = 'Hourly forecast unavailable';
      return;
    }
    let start = times.findIndex(value => value >= currentTime);
    if (start < 0) start = 0;
    const end = Math.min(times.length, start + 6);
    const fragment = document.createDocumentFragment();
    const temperatures = [];
    for (let index = start; index < end; index++) {
      const temperature = number(data.hourly.temperature_2m?.[index]);
      const code = data.hourly.weather_code?.[index];
      const chance = number(data.hourly.precipitation_probability?.[index]);
      const kind = conditionKind(code);
      temperatures.push(temperature);
      const item = el('div', 'le-weather-hour');
      item.appendChild(el('span', 'le-weather-hour-time', formatHour(times[index], index === start)));
      const icon = el('span', 'le-weather-hour-icon');
      icon.innerHTML = iconMarkup(kind);
      item.appendChild(icon);
      item.appendChild(el('strong', 'le-weather-hour-temp', temperature === null ? '—' : `${Math.round(temperature)}°`));
      item.appendChild(el('span', 'le-weather-hour-rain', chance === null ? ' ' : `${Math.round(chance)}% rain`));
      fragment.appendChild(item);
    }
    container.replaceChildren(fragment);
    updateCurve(screen, temperatures);
  }
  function paintCurrentWeather(screen, data) {
    const current = data.current;
    const daily = data.daily || {};
    const state = visualState({
      time: current.time,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      isDay: current.is_day,
      precipitation: current.precipitation,
      rain: current.rain,
      showers: current.showers,
      snowfall: current.snowfall,
      weather_code: current.weather_code,
      cloudCover: current.cloud_cover,
      wind: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      gusts: current.wind_gusts_10m
    });
    screen.dataset.weather = state.weather;
    screen.dataset.phase = state.phase;
    screen.style.setProperty('--le-rain-opacity', String(Math.min(.88, .35 + (number(current.precipitation) ?? 0) * .16)));
    screen.style.setProperty('--le-snow-opacity', String(Math.min(.82, .38 + (number(current.snowfall) ?? 0) * .28)));
    const rainLayer = screen.querySelector('.le-weather-rain');
    const snowLayer = screen.querySelector('.le-weather-snow');
    createParticles(rainLayer, 'rain', { precipitation: current.precipitation, windDirection: current.wind_direction_10m });
    createParticles(snowLayer, 'snow', { snowfall: current.snowfall, windDirection: current.wind_direction_10m });

    const condition = conditionLabel(current.weather_code);
    const headline = headlineFor(state.weather, state.phase);
    const titleNode = screen.querySelector('#le-weather-headline');
    if (titleNode) {
      const parts = headline.split(' ');
      const splitAt = Math.max(1, Math.ceil(parts.length * .55));
      titleNode.replaceChildren(document.createTextNode(parts.slice(0, splitAt).join(' ')));
      titleNode.appendChild(document.createElement('br'));
      const emphasis = document.createElement('em');
      emphasis.textContent = parts.slice(splitAt).join(' ');
      titleNode.appendChild(emphasis);
    }
    setText(screen, 'le-weather-date', formatDateTime(current.time));
    setTemperature(screen, number(current.temperature_2m));
    setText(screen, 'le-weather-condition', condition);
    setText(screen, 'le-weather-feels', number(current.apparent_temperature) === null ? 'Feels like —' : `Feels like ${Math.round(number(current.apparent_temperature))}°`);
    setText(screen, 'le-weather-poetry', sceneNote(state.weather, number(current.temperature_2m)));
    const icon = screen.querySelector('#le-weather-condition-icon');
    if (icon) icon.innerHTML = iconMarkup(conditionKind(current.weather_code));

    const high = number(daily.temperature_2m_max?.[0]);
    const low = number(daily.temperature_2m_min?.[0]);
    const rainChance = number(daily.precipitation_probability_max?.[0]);
    const wind = number(current.wind_speed_10m);
    const humidity = number(current.relative_humidity_2m);
    setText(screen, 'le-weather-highlow', `${high === null ? '—' : `${Math.round(high)}°`} / ${low === null ? '—' : `${Math.round(low)}°`}`);
    setText(screen, 'le-weather-rainchance', rainChance === null ? '—' : `${Math.round(rainChance)}%`);
    setText(screen, 'le-weather-wind', wind === null ? '—' : `${compass(current.wind_direction_10m)} ${Math.round(wind)} km/h`);
    setText(screen, 'le-weather-humidity', humidity === null ? '—' : `${Math.round(humidity)}%`);

    const hourlyTimes = data.hourly?.time || [];
    let currentHourIndex = hourlyTimes.findIndex(value => value >= current.time);
    if (currentHourIndex < 0) currentHourIndex = 0;
    const uv = number(data.hourly?.uv_index?.[currentHourIndex]) ?? number(daily.uv_index_max?.[0]);
    const pressure = number(current.pressure_msl);
    const visibility = number(data.hourly?.visibility?.[currentHourIndex]);
    setText(screen, 'le-weather-uv', uv === null ? '—' : uv.toFixed(0));
    setText(screen, 'le-weather-uv-note', uvLabel(uv));
    setText(screen, 'le-weather-pressure', pressure === null ? '—' : Math.round(pressure));
    setText(screen, 'le-weather-visibility', visibility === null ? '—' : (visibility / 1000).toFixed(1));
    renderHourly(screen, data, current.time);
    setText(screen, 'le-weather-status', '');
  }

  function resetWeather(screen, message, keepArtwork = true) {
    setTemperature(screen, null);
    for (const id of ['le-weather-condition','le-weather-feels','le-weather-highlow','le-weather-rainchance','le-weather-wind','le-weather-humidity','le-weather-uv','le-weather-pressure','le-weather-visibility']) setText(screen, id, '—');
    setText(screen, 'le-weather-date', 'LOCAL WEATHER');
    setText(screen, 'le-weather-headline', 'A quiet day under open skies.');
    setText(screen, 'le-weather-poetry', 'The artwork stays with you while live conditions are unavailable.');
    setText(screen, 'le-weather-uv-note', 'Not available');
    setText(screen, 'le-weather-condition', 'Weather unavailable');
    setText(screen, 'le-weather-feels', 'No live reading');
    setText(screen, 'le-weather-status', message);
    const hourly = screen.querySelector('#le-weather-hourly');
    if (hourly) hourly.replaceChildren(el('div', 'le-weather-hour', 'Hourly forecast unavailable'));
    if (keepArtwork) {
      screen.dataset.weather = 'clear';
      screen.dataset.phase = 'day';
      screen.querySelector('.le-weather-rain')?.replaceChildren();
      screen.querySelector('.le-weather-snow')?.replaceChildren();
    }
  }

  function activateWeather() {
    const view = mount('weather');
    if (!view) return;
    addStyles();
    const screen = makeScreen();
    view.panel.remove();
    view.root.replaceChildren(screen);

    let abortController = null;
    let pollTimer = 0;
    let refreshTimer = 0;
    let disposed = false;
    let requestSerial = 0;
    let lastSuccessfulFetch = 0;

    function stopPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
    }
    function clearVisualWeather(message) {
      requestSerial++;
      abortController?.abort();
      abortController = null;
      resetWeather(screen, message || 'Switch on the Location Orb to reveal your local forecast.');
    }
    function paintCurrent(currentData) {
      if (!currentData?.current || !Number.isFinite(Number(currentData.current.weather_code))) {
        throw new Error('The weather source did not return usable current conditions.');
      }
      paintCurrentWeather(screen, currentData);
      lastSuccessfulFetch = Date.now();
    }
    function waitingForLocation() {
      stopPolling();
      let remaining = 24;
      pollTimer = window.setInterval(() => {
        if (disposed || !isActive('weather')) { stopPolling(); return; }
        if (window.liveEarthLocationAllowed?.() !== true) {
          stopPolling(); clearVisualWeather('Location is OFF. Switch on the Location Orb to see local weather.'); return;
        }
        const point = globe()?.getLocation?.();
        if (point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))) {
          stopPolling(); readExistingLocation(); return;
        }
        remaining--;
        if (remaining <= 0) { stopPolling(); clearVisualWeather('Waiting for a fresh Location fix. The Location Orb remains in control.'); }
      }, 500);
    }
    async function readExistingLocation() {
      if (disposed || !isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) {
        clearVisualWeather('Location is OFF. Switch on the Location Orb to see local weather.'); return;
      }
      if (navigator.onLine === false) {
        resetWeather(screen, 'You are offline. Live conditions are not presented as current.'); return;
      }
      const point = globe()?.getLocation?.();
      const latitude = Number(point?.latitude), longitude = Number(point?.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        waitingForLocation(); return;
      }
      abortController?.abort();
      const controller = new AbortController();
      abortController = controller;
      const serial = ++requestSerial;
      const query = new URLSearchParams({
        latitude: String(latitude), longitude: String(longitude),
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        hourly: 'temperature_2m,precipitation_probability,weather_code,visibility,uv_index',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
        forecast_days: '1', timezone: 'auto', wind_speed_unit: 'kmh', temperature_unit: 'celsius', precipitation_unit: 'mm'
      });
      try {
        const response = await fetch(`${API_ROOT}?${query.toString()}`, {
          mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
        });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}.`);
        const data = await response.json();
        if (disposed || !isActive('weather') || serial !== requestSerial ||
            window.liveEarthLocationAllowed?.() !== true) return;
        paintCurrent(data);
      } catch (error) {
        if (error?.name !== 'AbortError' && !disposed && isActive('weather') &&
            window.liveEarthLocationAllowed?.() === true) {
          resetWeather(screen, 'The weather service is unavailable right now. The artwork remains available.');
        }
      } finally {
        if (abortController === controller) abortController = null;
      }
    }
    function onLocationState(event) {
      if (!isActive('weather')) return;
      if (event.detail?.enabled === true && window.liveEarthLocationAllowed?.() === true) waitingForLocation();
      else { stopPolling(); clearVisualWeather('Location is OFF. Switch on the Location Orb to see local weather.'); }
    }
    function onLocationStop() {
      stopPolling();
      clearVisualWeather('Location has been turned off. No location data is being requested.');
    }
    function onOnline() {
      if (window.liveEarthLocationAllowed?.() === true) readExistingLocation();
    }
    function onOffline() {
      stopPolling();
      abortController?.abort();
      abortController = null;
      resetWeather(screen, 'You are offline. Live conditions are not presented as current.');
    }
    function onVisibility() {
      if (!document.hidden && window.liveEarthLocationAllowed?.() === true && Date.now() - lastSuccessfulFetch > REFRESH_MS) readExistingLocation();
    }

    window.addEventListener('live-earth-location-state', onLocationState);
    window.addEventListener('live-earth-location-stop', onLocationStop);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    refreshTimer = window.setInterval(() => {
      if (!disposed && isActive('weather') && !document.hidden && window.liveEarthLocationAllowed?.() === true) readExistingLocation();
    }, REFRESH_MS);

    if (window.liveEarthLocationAllowed?.() === true) waitingForLocation();
    else resetWeather(screen, 'Switch on the Location Orb to reveal your local forecast.');

    return () => {
      disposed = true;
      requestSerial++;
      stopPolling();
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = 0;
      abortController?.abort();
      abortController = null;
      window.removeEventListener('live-earth-location-state', onLocationState);
      window.removeEventListener('live-earth-location-stop', onLocationStop);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      screen.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  }

  runtime.registerFeature('weather', activateWeather);
})();
