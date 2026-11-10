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
      .le-weather-art-fallback{background:linear-gradient(160deg,#12343a,#466a69 52%,#0b292c)}
      .le-weather-art{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#102c30}
      .le-weather-art-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:54% 48%;transform:scale(1.015);filter:saturate(.92) contrast(1.08) brightness(.78);transition:filter 1.5s ease,transform 8s ease;will-change:filter}
      .le-weather-art-wash{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(3,19,23,.24) 0%,rgba(3,19,23,.10) 28%,rgba(3,18,22,.28) 57%,rgba(2,14,18,.72) 100%),linear-gradient(90deg,rgba(2,18,22,.62) 0%,rgba(2,18,22,.20) 56%,rgba(2,18,22,.02) 100%);transition:background 1.4s ease}
      .le-weather-art-light{position:absolute;inset:-8%;z-index:1;pointer-events:none;background:radial-gradient(ellipse at 72% 27%,rgba(255,226,177,.22),transparent 38%);opacity:.7;transition:opacity 1.5s ease,background 1.5s ease}
      .le-weather-rain,.le-weather-snow{position:absolute;inset:0;z-index:3;overflow:hidden;opacity:0;transition:opacity .8s ease}
      .le-weather-particle{position:absolute;top:-12%;left:var(--particle-x);pointer-events:none;will-change:transform;animation:le-weather-fall var(--particle-duration,1.6s) linear var(--particle-delay,0s) infinite}
      .le-weather-rain .le-weather-particle{width:1.25px;height:clamp(15px,3.6vh,28px);border-radius:2px;background:linear-gradient(180deg,transparent,#e7f6f3d8);transform:rotate(13deg);filter:drop-shadow(0 0 2px #d9f4f2aa)}
      .le-weather-snow .le-weather-particle{width:var(--particle-size,4px);height:var(--particle-size,4px);border-radius:50%;background:#f8fbf6;box-shadow:0 0 7px #fff9;animation-name:le-weather-snow-fall;animation-duration:var(--particle-duration,5s)}
      .le-weather-fog{position:absolute;inset:35% -14% 0;z-index:2;opacity:0;pointer-events:none;background:linear-gradient(180deg,transparent 0%,rgba(222,233,226,.05) 18%,rgba(215,227,219,.38) 58%,rgba(215,227,219,.17) 100%);filter:blur(13px);transition:opacity 1.2s ease}
      .le-weather-lightning{position:absolute;inset:0;z-index:4;opacity:0;background:rgba(230,243,247,.72);mix-blend-mode:screen;pointer-events:none}
      .le-weather-ripples{position:absolute;inset:56% 0 0;z-index:2;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .8s ease}
      .le-weather-ripple{position:absolute;left:var(--ripple-x);top:var(--ripple-y);width:var(--ripple-size);aspect-ratio:1;border:1px solid rgba(224,245,239,.42);border-radius:50%;transform:scale(.15);opacity:0;animation:le-weather-ripple 3.4s ease-out var(--ripple-delay) infinite}
      .le-weather-dew-drops{position:absolute;inset:0;z-index:3;pointer-events:none;opacity:0;transition:opacity .7s ease}
      .le-weather-dew-drop{position:absolute;top:var(--drop-y);left:var(--drop-x);width:4px;height:7px;border-radius:65% 35% 65% 35%;transform:rotate(35deg);background:linear-gradient(145deg,#f5ffffcc,#9bc8d588 62%,#e9ffffaa);box-shadow:0 0 5px #d9f7ff88}
      .le-weather-leaf-motion{position:absolute;inset:0;z-index:2;overflow:hidden;pointer-events:none}
      .le-weather-live-leaf{position:absolute;left:var(--leaf-x);top:var(--leaf-y);width:var(--leaf-size);height:auto;opacity:var(--leaf-opacity,.62);filter:drop-shadow(0 2px 5px #061a1c66);transform-origin:70% 50%;animation:le-weather-leaf-drift var(--leaf-duration,12s) ease-in-out var(--leaf-delay,0s) infinite alternate}
      .le-weather-live-leaf path{fill:#b83a35;stroke:#5e2428;stroke-width:1.1;stroke-linejoin:round}
      .le-weather-live-leaf line{stroke:#ed8d74;stroke-width:1;opacity:.7}
      .le-weather-screen[data-weather="clear"] .le-weather-art-image{filter:saturate(1.08) contrast(1.03) brightness(.98)}
      .le-weather-screen[data-weather="cloudy"] .le-weather-art-image{filter:saturate(.78) contrast(1.04) brightness(.84)}
      .le-weather-screen[data-weather="rain"] .le-weather-art-image{filter:saturate(.88) contrast(1.10) brightness(.72)}
      .le-weather-screen[data-weather="storm"] .le-weather-art-image{filter:saturate(.72) contrast(1.16) brightness(.58)}
      .le-weather-screen[data-weather="snow"] .le-weather-art-image{filter:saturate(.48) contrast(1.02) brightness(1.04)}
      .le-weather-screen[data-weather="fog"] .le-weather-art-image{filter:saturate(.62) contrast(.94) brightness(.94)}
      .le-weather-screen[data-weather="hot"] .le-weather-art-image{filter:saturate(1.18) contrast(1.02) brightness(1.08)}
      .le-weather-screen[data-phase="dawn"] .le-weather-art-light{background:radial-gradient(ellipse at 68% 38%,rgba(255,188,135,.30),transparent 44%);opacity:.95}
      .le-weather-screen[data-phase="evening"] .le-weather-art-light{background:radial-gradient(ellipse at 74% 35%,rgba(255,140,100,.25),transparent 46%);opacity:.9}
      .le-weather-screen[data-phase="night"] .le-weather-art-image{filter:saturate(.65) brightness(.48) contrast(1.08)}
      .le-weather-screen[data-phase="night"] .le-weather-art-light{background:radial-gradient(ellipse at 76% 34%,rgba(137,171,220,.16),transparent 42%);opacity:.72}
      .le-weather-screen[data-weather="rain"] .le-weather-rain,.le-weather-screen[data-weather="storm"] .le-weather-rain{opacity:var(--le-rain-opacity,.65)}
      .le-weather-screen[data-weather="snow"] .le-weather-snow{opacity:var(--le-snow-opacity,.72)}
      .le-weather-screen[data-weather="fog"] .le-weather-fog{opacity:.92}
      .le-weather-screen[data-weather="rain"] .le-weather-ripples,.le-weather-screen[data-weather="storm"] .le-weather-ripples{opacity:var(--le-rain-opacity,.65)}
      .le-weather-screen[data-weather="rain"] .le-weather-dew-drops,.le-weather-screen[data-weather="storm"] .le-weather-dew-drops{opacity:.92}
      .le-weather-screen[data-weather="storm"] .le-weather-lightning{animation:le-weather-flash 11s linear infinite}
      .le-weather-screen[data-weather="rain"] .le-weather-art-wash,.le-weather-screen[data-weather="storm"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(4,18,25,.48),rgba(6,23,29,.22) 35%,rgba(3,17,23,.74) 100%),linear-gradient(90deg,rgba(3,17,23,.66),transparent 84%)}
      .le-weather-screen[data-phase="dawn"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(26,39,43,.14),rgba(30,34,35,.04) 38%,rgba(4,22,25,.72) 100%),linear-gradient(90deg,rgba(5,22,25,.36),transparent 80%)}
      .le-weather-screen[data-phase="evening"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(38,23,35,.30),rgba(20,24,32,.14) 38%,rgba(4,20,24,.80) 100%),linear-gradient(90deg,rgba(5,20,26,.42),transparent 84%)}
      .le-weather-screen[data-phase="night"] .le-weather-art-wash{background:linear-gradient(180deg,rgba(3,9,24,.54),rgba(4,15,29,.25) 38%,rgba(2,10,21,.86) 100%),linear-gradient(90deg,rgba(3,11,22,.58),transparent 82%)}
      .le-weather-content{position:relative;z-index:2;width:min(100%,760px);margin:0 auto;padding:calc(env(safe-area-inset-top) + 18px) clamp(20px,5.2vw,36px) calc(env(safe-area-inset-bottom) + 192px)}
      .le-weather-topbar{display:flex;justify-content:space-between;align-items:center;gap:14px;min-height:34px;text-shadow:0 2px 16px #061b1d99}
      .le-weather-brand{font-size:12px;font-weight:780;letter-spacing:.19em;white-space:nowrap}
      .le-weather-brand span{font-weight:400;opacity:.78}
      .le-weather-location{display:flex;align-items:center;gap:7px;color:#e9efea;font-size:11px;letter-spacing:.035em;min-width:0}
      .le-weather-location svg{width:13px;height:16px;flex:0 0 auto;opacity:.9}
      .le-weather-date-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:40px}
      .le-weather-date{color:#e4e9e3;font-size:9px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;text-shadow:0 2px 18px #061a1d}
      .le-weather-art-mark{width:36px;height:36px;flex:0 0 auto;opacity:.78;filter:drop-shadow(0 2px 9px #061a1d99)}
      .le-weather-art-mark circle{fill:none;stroke:#d45b4d;stroke-width:1.3}
      .le-weather-art-mark path{fill:none;stroke:#e8e3d5;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}
      .le-weather-art-mark .mark-leaf{fill:#bd4a40;stroke:none}
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
      @keyframes le-weather-ripple{0%{transform:scale(.18);opacity:.72}100%{transform:scale(1);opacity:0}}
      @keyframes le-weather-leaf-drift{0%{transform:translate3d(0,0,0) rotate(-4deg)}100%{transform:translate3d(var(--leaf-drift,18px),var(--leaf-rise,-5px),0) rotate(8deg)}}
      @keyframes le-weather-drop-release{0%{transform:translateY(0) scale(.9);opacity:.9}70%{opacity:.8}100%{transform:translateY(20px) scale(.72);opacity:0}}
      @media(min-width:700px){.le-weather-content{padding-top:32px;padding-bottom:150px}.le-weather-date-row{margin-top:52px}.le-weather-headline{font-size:clamp(68px,8vw,104px)}.le-weather-temperature{font-size:136px}.le-weather-data-strip{max-width:680px}.le-weather-hourly{grid-auto-columns:minmax(68px,1fr)}.le-weather-metrics{max-width:680px}}
      @media(max-width:390px){.le-weather-content{padding-left:17px;padding-right:17px}.le-weather-date-row{margin-top:31px}.le-weather-data-strip{padding:13px 4px}.le-weather-stat{padding:0 6px}.le-weather-stat-label{font-size:7px;letter-spacing:.09em}.le-weather-stat-value{font-size:12px}.le-weather-headline{font-size:clamp(41px,11.5vw,54px)}.le-weather-poetry{font-size:14px}.le-weather-metric{padding:10px 8px}}
      @media(orientation:landscape) and (max-height:520px){.le-weather-content{padding-top:calc(env(safe-area-inset-top) + 12px);padding-bottom:calc(env(safe-area-inset-bottom) + 105px)}.le-weather-date-row{margin-top:18px}.le-weather-headline{font-size:42px}.le-weather-temperature{font-size:72px}.le-weather-data-strip{margin-top:15px}.le-weather-section-head{margin-top:16px}}
      @media(prefers-reduced-motion:reduce){.le-weather-screen *,.le-weather-screen *:before,.le-weather-screen *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      @media(prefers-reduced-transparency:reduce){.le-weather-data-strip,.le-weather-metric{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(7,25,28,.92)}}
    `;
    document.head.appendChild(style);
  }

  function createArt() {
    const art = el('div', 'le-weather-art');
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = `
      <img class="le-weather-art-image" src="./Weather/Assets/weather-scene.webp" alt="" decoding="async" fetchpriority="high">
      <div class="le-weather-art-wash"></div>
      <div class="le-weather-art-light"></div>
      <div class="le-weather-leaf-motion"></div>
      <div class="le-weather-dew-drops">
        <span class="le-weather-dew-drop" style="--drop-x:77%;--drop-y:22%"></span>
        <span class="le-weather-dew-drop" style="--drop-x:83%;--drop-y:28%"></span>
        <span class="le-weather-dew-drop" style="--drop-x:89%;--drop-y:19%"></span>
        <span class="le-weather-dew-drop" style="--drop-x:71%;--drop-y:31%"></span>
      </div>
      <div class="le-weather-ripples">
        <span class="le-weather-ripple" style="--ripple-x:12%;--ripple-y:35%;--ripple-size:42px;--ripple-delay:-.8s"></span>
        <span class="le-weather-ripple" style="--ripple-x:48%;--ripple-y:66%;--ripple-size:66px;--ripple-delay:-2.1s"></span>
        <span class="le-weather-ripple" style="--ripple-x:83%;--ripple-y:43%;--ripple-size:50px;--ripple-delay:-1.4s"></span>
      </div>
      <div class="le-weather-fog"></div>
      <div class="le-weather-rain"></div>
      <div class="le-weather-snow"></div>
      <div class="le-weather-lightning"></div>
    `;
    const image = art.querySelector('.le-weather-art-image');
    image?.addEventListener('error', () => {
      art.classList.add('le-weather-art-fallback');
    }, { once: true });
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
  function renderWindLeaves(screen, windSpeed, windDirection) {
    const layer = screen.querySelector('.le-weather-leaf-motion');
    if (!layer) return;
    layer.replaceChildren();
    const speed = Math.max(0, number(windSpeed) ?? 0);
    if (speed < 5 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count = Math.min(4, Math.max(1, Math.ceil(speed / 12)));
    const direction = number(windDirection) ?? 270;
    const drift = Math.max(-34, Math.min(34, -Math.sin(direction * Math.PI / 180) * (8 + speed * .72)));
    for (let index = 0; index < count; index++) {
      const leaf = el('span', 'le-weather-live-leaf');
      const x = 63 + ((index * 17) % 28);
      const y = 13 + ((index * 19) % 34);
      leaf.style.setProperty('--leaf-x', `${x}%`);
      leaf.style.setProperty('--leaf-y', `${y}%`);
      leaf.style.setProperty('--leaf-size', `${15 + ((index * 7) % 13)}px`);
      leaf.style.setProperty('--leaf-duration', `${Math.max(4.5, 16 - speed * .35 + index * .8)}s`);
      leaf.style.setProperty('--leaf-delay', `${-index * 1.7}s`);
      leaf.style.setProperty('--leaf-drift', `${Math.round(drift + (index % 2 ? 8 : -7))}px`);
      leaf.style.setProperty('--leaf-rise', `${index % 2 ? -7 : 5}px`);
      leaf.innerHTML = '<svg viewBox="0 0 64 42" aria-hidden="true"><path d="M3 21C13 17 17 8 23 2c2 8 7 11 12 10 0-5 3-8 8-11-1 7 2 11 7 13 4-2 8-2 11 0-7 4-9 8-8 13-7-2-12 0-15 6-5-7-10-8-16-6-2 5-6 8-13 10 2-8 0-12-6-16Z"/><line x1="5" y1="21" x2="58" y2="21"/><line x1="23" y1="21" x2="28" y2="6"/><line x1="36" y1="21" x2="48" y2="12"/><line x1="41" y1="21" x2="43" y2="34"/></svg>';
      layer.appendChild(leaf);
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
        <div class="le-weather-date-row">
          <div class="le-weather-date" id="le-weather-date">LOCAL CONDITIONS</div>
          <svg class="le-weather-art-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15.5"/><path d="M9 27c8-5 12-11 17-20M16 22c-2-4-5-6-8-6m13-1c3 0 6 1 9 4m-13 7c2 2 3 4 3 7"/><path class="mark-leaf" d="M8 15c4-1 7 1 8 5-4 1-7-1-8-5Zm13-2c1-4 4-6 8-6 0 4-3 7-8 6Zm3 10c3-3 7-3 10-1-2 4-6 5-10 1Z"/></svg>
        </div>
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
    const rainAmount = Math.max(number(current.precipitation) ?? 0, number(current.rain) ?? 0, number(current.showers) ?? 0);
    screen.style.setProperty('--le-rain-opacity', String(Math.min(.94, .28 + rainAmount * .22)));
    screen.style.setProperty('--le-snow-opacity', String(Math.min(.86, .32 + (number(current.snowfall) ?? 0) * .30)));
    renderWindLeaves(screen, current.wind_speed_10m, current.wind_direction_10m);
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
