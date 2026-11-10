/* LIVE // EARTH — Weather: immersive Living Topography.
   Main Weather is a designed miniature 3D world driven by the user's actual
   enabled-location forecast. Weather owns no geolocation permission and stores
   no coordinates. The separate Earth Engine remains the geographic Explorer. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, el, setStatus, button, attribution, isActive, globe } = runtime;
  const WEATHER_SCRIPT_URL = document.currentScript?.src || new URL('./Weather/weather-view.js', document.baseURI).href;
  const THREE_MODULE_URL = new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href;
  const MAX_FORECAST_HOURS = 18;
  const STYLE_ID = 'le-weather-living-topography-style';

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather{background:#172d2b;color:#f4f8ef;isolation:isolate}
      .le-sfv--weather .le-weather-world-stage{position:absolute;inset:0;z-index:0;overflow:hidden;background:linear-gradient(180deg,#829e99,#2c4941 72%,#1c342d);pointer-events:none}
      .le-sfv--weather .le-weather-world-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none}
      .le-sfv--weather .le-weather-world-fallback{position:absolute;inset:0;display:grid;place-items:center;padding:32px;text-align:center;color:#f4f8ef;background:radial-gradient(ellipse at 50% 25%,#8da89a,#29483e 62%,#172d2b);font-size:12px}
      .le-sfv--weather .le-sfv-panel{z-index:2;display:flex;flex-direction:column;overflow:hidden!important;padding:calc(env(safe-area-inset-top) + 18px) 17px calc(env(safe-area-inset-bottom) + 105px)!important;background:linear-gradient(180deg,rgba(7,24,25,.24),transparent 26%,transparent 58%,rgba(4,20,20,.24))!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;scrollbar-width:none}
      .le-sfv--weather .le-sfv-head{position:relative;z-index:3;display:flex;align-items:center;gap:10px;width:100%;margin:0;text-shadow:0 2px 16px #061a1a99}
      .le-sfv--weather .le-sfv-symbol{width:31px;min-width:31px;border:1px solid #e9fff077;background:linear-gradient(145deg,#e5f7e638,#173b3566);box-shadow:inset 0 1px 4px #fff5,0 4px 18px #08231d55;font-size:17px}
      .le-sfv--weather .le-sfv-title{font-size:clamp(21px,5.4vw,26px);font-weight:650;letter-spacing:-.035em;color:#f5f8ee}
      .le-sfv--weather .le-sfv-subtitle{display:none!important}
      .le-sfv--weather .le-sfv-pill{width:fit-content;margin:7px 0 0 41px;padding:0;border:0;background:none;box-shadow:none;color:#dceade;font-size:7px;letter-spacing:.12em;text-shadow:0 1px 8px #102b27}
      .le-sfv--weather .le-sfv-dot{width:5px;height:5px;background:#b8e8c8;box-shadow:0 0 8px #c2f2ce}
      .le-sfv--weather .le-sfv-panel>.le-sfv-body{position:relative;z-index:3;display:flex;flex:1;flex-direction:column;justify-content:space-between;gap:12px;width:100%;max-width:760px;margin:0 auto;padding:clamp(18px,5vh,42px) 0 0}
      .le-sfv--weather .le-weather-main-readout{display:grid;gap:7px;max-width:320px;text-shadow:0 2px 18px #10251caa;pointer-events:none}
      .le-sfv--weather .le-weather-place-label{font-size:8px;font-weight:750;letter-spacing:.18em;color:#e1eee1;text-transform:uppercase}
      .le-sfv--weather .le-weather-current-row{display:flex;align-items:flex-end;gap:10px}
      .le-sfv--weather .le-weather-temp{font-size:clamp(54px,14vw,76px);font-weight:300;line-height:.88;letter-spacing:-.085em;color:#fffdf2;font-variant-numeric:tabular-nums}
      .le-sfv--weather .le-weather-condition{padding-bottom:5px;font-size:12px;font-weight:650;color:#f4f7ed}
      .le-sfv--weather .le-weather-local-time{font-size:9px;color:#e0ede2}
      .le-sfv--weather .le-weather-metric-line{display:flex;flex-wrap:wrap;gap:6px 13px;margin-top:2px;color:#eff6ed;font-size:9px}
      .le-sfv--weather .le-weather-metric-line span{white-space:nowrap}
      .le-sfv--weather .le-weather-insight{width:fit-content;max-width:100%;margin-top:3px;padding:7px 10px;border-left:1px solid #e6fff0a6;background:linear-gradient(90deg,#e4fff02b,transparent);color:#f1f7eb;font-size:9px;line-height:1.4}
      .le-sfv--weather .le-weather-bottom{display:grid;gap:9px;pointer-events:auto}
      .le-sfv--weather .le-weather-timeline{position:relative;padding:12px 12px 9px;border:1px solid rgba(232,255,239,.43);border-radius:19px 19px 14px 14px;background:linear-gradient(145deg,rgba(225,255,236,.22),rgba(37,77,66,.48) 36%,rgba(8,32,30,.72));box-shadow:inset 0 1px 1px #fff8,inset 0 -1px #03181599,0 14px 36px #061d19a1;backdrop-filter:blur(17px) saturate(1.2);-webkit-backdrop-filter:blur(17px) saturate(1.2);overflow:hidden}
      .le-sfv--weather .le-weather-timeline:before{content:"";position:absolute;inset:4px;border:1px solid #e9fff018;border-radius:15px;pointer-events:none}
      .le-sfv--weather .le-weather-timeline:after{content:"";position:absolute;left:9%;right:9%;top:0;height:1px;background:linear-gradient(90deg,transparent,#f3fff0c9,transparent);pointer-events:none}
      .le-sfv--weather .le-weather-timeline-head{display:flex;justify-content:space-between;gap:8px;align-items:center;position:relative;z-index:1}
      .le-sfv--weather .le-weather-timeline-title{font-size:8px;font-weight:800;letter-spacing:.16em;color:#ebf7e9}
      .le-sfv--weather .le-weather-timeline-meta{font-size:7px;color:#c8ddce;letter-spacing:.08em}
      .le-sfv--weather .le-weather-hour-strip{display:flex;gap:5px;overflow-x:auto;padding:10px 1px 4px;scrollbar-width:none;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;position:relative;z-index:1}
      .le-sfv--weather .le-weather-hour-strip::-webkit-scrollbar{display:none}
      .le-sfv--weather .le-weather-hour{flex:0 0 49px;min-height:57px;padding:5px 3px;border:1px solid #e8fff02c;border-radius:11px;background:linear-gradient(160deg,#d8f4e51b,#08241f2d);color:#edf6eb;display:grid;justify-items:center;align-content:center;gap:3px;font:600 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;scroll-snap-align:start;touch-action:manipulation}
      .le-sfv--weather .le-weather-hour[aria-pressed="true"]{border-color:#f2fff0ac;background:linear-gradient(160deg,#e8fff08a,#4c8171a6);color:#102d28;box-shadow:inset 0 1px #fff,0 0 14px #d3f4d55e;transform:translateY(-2px)}
      .le-sfv--weather .le-weather-hour-time{font-size:7px;color:inherit;opacity:.82}
      .le-sfv--weather .le-weather-hour-icon{font-size:14px;line-height:1.05}
      .le-sfv--weather .le-weather-hour-temp{font-size:11px;color:inherit;font-weight:750;font-variant-numeric:tabular-nums}
      .le-sfv--weather .le-weather-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:1px;padding-top:7px;border-top:1px solid #eafff022;position:relative;z-index:1}
      .le-sfv--weather .le-weather-range-label{font-size:7px;color:#c3d8c9;letter-spacing:.08em}
      .le-sfv--weather .le-weather-range{width:100%;min-width:0;min-height:20px;margin:2px 0 0;accent-color:#e8fff0;touch-action:pan-x}
      .le-sfv--weather .le-weather-refresh{min-height:29px;padding:6px 10px;border:1px solid #e7fff05c;border-radius:999px;background:linear-gradient(145deg,#e8fff02e,#12392f70);color:#f5faee;font:700 8px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation;white-space:nowrap}
      .le-sfv--weather .le-weather-refresh:focus-visible,.le-sfv--weather .le-weather-hour:focus-visible,.le-sfv--weather .le-weather-range:focus-visible{outline:2px solid #f4fff1;outline-offset:2px}
      .le-sfv--weather .le-sfv-status{order:-1;margin:0;padding:5px 0;border:0;border-radius:0;background:none;color:#eaf3e9;font-size:8px;line-height:1.4;text-shadow:0 1px 8px #0b2924;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
      .le-sfv--weather .le-sfv-status[data-state="error"]{color:#ffe0d4}
      .le-sfv--weather .le-sfv-status[data-state="success"]{color:#dff7df}
      .le-sfv--weather .le-sfv-attribution{margin:0;text-align:right;color:#e0ebdf;font-size:7px;line-height:1.3;text-shadow:0 1px 8px #08211b}
      .le-sfv--weather .le-sfv-attribution a{color:#f3fff0;text-underline-offset:2px}
      .le-sfv--weather .le-sfv-head,.le-sfv--weather .le-sfv-pill{flex-shrink:0}
      @media(max-width:390px){.le-sfv--weather .le-sfv-panel{padding-left:13px!important;padding-right:13px!important}.le-sfv--weather .le-weather-hour{flex-basis:45px;min-height:54px}.le-sfv--weather .le-weather-main-readout{padding-top:0}}
      @media(max-height:700px){.le-sfv--weather .le-sfv-panel{padding-top:calc(env(safe-area-inset-top) + 12px)!important;padding-bottom:calc(env(safe-area-inset-bottom) + 89px)!important}.le-sfv--weather .le-sfv-panel>.le-sfv-body{padding-top:8px}.le-sfv--weather .le-weather-temp{font-size:clamp(45px,11vw,60px)}.le-sfv--weather .le-weather-timeline{padding:9px 10px 7px}.le-sfv--weather .le-weather-hour{min-height:49px}}
      @media(orientation:landscape){.le-sfv--weather .le-sfv-panel>.le-sfv-body{padding-top:8px}.le-sfv--weather .le-weather-main-readout{max-width:280px}.le-sfv--weather .le-weather-timeline{max-width:720px;margin-left:auto;margin-right:auto;width:100%}}
      @media(prefers-reduced-motion:reduce){.le-sfv--weather .le-weather-world-canvas{animation:none!important;transition:none!important}}

      /* Responsive composition: the 3D world reframes itself while the controls
         reorganize for portrait phones, compact landscape phones, tablets and desktop. */
      .le-sfv--weather .le-sfv-panel{box-sizing:border-box;min-width:0;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;padding-left:clamp(12px,3.2vw,34px)!important;padding-right:clamp(12px,3.2vw,34px)!important;padding-top:calc(env(safe-area-inset-top) + clamp(12px,2.8vh,26px))!important;padding-bottom:calc(env(safe-area-inset-bottom) + clamp(92px,12vh,126px))!important}
      .le-sfv--weather .le-sfv-panel>.le-sfv-body{box-sizing:border-box;min-height:0;min-width:0;width:min(100%,1180px);max-width:1180px;padding:clamp(12px,3vh,34px) 0 0;gap:clamp(10px,2.4vh,22px)}
      .le-sfv--weather .le-weather-main-readout{width:min(100%,520px);max-width:520px;gap:clamp(5px,1vh,9px)}
      .le-sfv--weather .le-weather-temp{font-size:clamp(50px,11.5vw,88px)}
      .le-sfv--weather .le-weather-condition{font-size:clamp(11px,1.5vw,15px)}
      .le-sfv--weather .le-weather-local-time{font-size:clamp(9px,1.1vw,11px)}
      .le-sfv--weather .le-weather-metric-line{font-size:clamp(8px,1vw,10px);gap:5px clamp(9px,1.7vw,16px)}
      .le-sfv--weather .le-weather-insight{font-size:clamp(8px,.95vw,10px);max-width:min(100%,520px)}
      .le-sfv--weather .le-weather-bottom{width:100%;min-width:0}
      .le-sfv--weather .le-weather-timeline{width:100%;box-sizing:border-box;padding:clamp(9px,1.4vh,13px) clamp(9px,1.5vw,15px) 8px;border-radius:clamp(15px,2vw,22px)}
      .le-sfv--weather .le-weather-hour{flex-basis:clamp(43px,5vw,58px);min-height:clamp(48px,7vh,62px)}
      .le-sfv--weather .le-weather-attribution{max-width:100%}
      @media(orientation:portrait){
        .le-sfv--weather .le-sfv-panel>.le-sfv-body{display:flex;flex-direction:column;justify-content:space-between;align-items:stretch}
        .le-sfv--weather .le-weather-main-readout{margin-top:clamp(2px,1vh,12px)}
        .le-sfv--weather .le-weather-bottom{margin-top:auto}
        .le-sfv--weather .le-weather-timeline{max-width:100%}
      }
      @media(orientation:landscape) and (min-width:560px){
        .le-sfv--weather .le-sfv-panel{padding-top:calc(env(safe-area-inset-top) + 8px)!important;padding-bottom:calc(env(safe-area-inset-bottom) + 96px)!important}
        .le-sfv--weather .le-sfv-panel>.le-sfv-body{display:grid;grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr);grid-template-rows:auto minmax(0,1fr) auto;align-items:center;column-gap:clamp(18px,4vw,58px);row-gap:clamp(6px,1.4vh,12px);padding-top:clamp(6px,1.4vh,14px)}
        .le-sfv--weather .le-sfv-status{grid-area:1/1/2/3}
        .le-sfv--weather .le-weather-main-readout{grid-area:2/1/3/2;align-self:center;max-width:440px}
        .le-sfv--weather .le-weather-bottom{grid-area:2/2/3/3;align-self:center}
        .le-sfv--weather .le-sfv-attribution{grid-area:3/1/4/3;justify-self:end}
        .le-sfv--weather .le-weather-timeline{max-width:none}
        .le-sfv--weather .le-weather-hour{flex-basis:clamp(41px,5vw,54px);min-height:clamp(44px,12vh,58px)}
        .le-sfv--weather .le-weather-temp{font-size:clamp(46px,7vw,74px)}
      }
      @media(min-width:760px) and (orientation:portrait){
        .le-sfv--weather .le-sfv-panel>.le-sfv-body{width:min(88%,820px)}
        .le-sfv--weather .le-weather-main-readout{max-width:580px}
        .le-sfv--weather .le-weather-timeline{padding:15px 17px 12px}
      }
      @media(min-width:1200px){
        .le-sfv--weather .le-sfv-panel{padding-left:clamp(34px,5vw,76px)!important;padding-right:clamp(34px,5vw,76px)!important}
        .le-sfv--weather .le-sfv-panel>.le-sfv-body{width:min(100%,1320px)}
      }
      @media(max-height:520px) and (orientation:landscape){
        .le-sfv--weather .le-sfv-panel{padding-bottom:calc(env(safe-area-inset-bottom) + 68px)!important}
        .le-sfv--weather .le-sfv-panel>.le-sfv-body{grid-template-rows:auto minmax(0,1fr) auto;row-gap:4px;padding-top:3px}
        .le-sfv--weather .le-weather-main-readout{gap:4px}
        .le-sfv--weather .le-weather-temp{font-size:clamp(38px,8vh,56px)}
        .le-sfv--weather .le-weather-insight{padding:4px 7px}
        .le-sfv--weather .le-weather-timeline{padding:6px 8px 5px}
        .le-sfv--weather .le-weather-hour{min-height:39px;padding:3px 2px}
        .le-sfv--weather .le-weather-hour-strip{padding:5px 1px 2px}
        .le-sfv--weather .le-weather-footer{padding-top:4px}
      }
      @media(max-width:360px){
        .le-sfv--weather .le-weather-timeline-meta{display:none}
        .le-sfv--weather .le-weather-temp{font-size:clamp(46px,14vw,60px)}
        .le-sfv--weather .le-weather-metric-line{column-gap:8px}
      }
      @media(max-height:700px) and (orientation:portrait){
        .le-sfv--weather .le-sfv-panel{padding-top:calc(env(safe-area-inset-top) + 9px)!important;padding-bottom:calc(env(safe-area-inset-bottom) + 88px)!important}
        .le-sfv--weather .le-sfv-panel>.le-sfv-body{padding-top:7px;gap:8px}
        .le-sfv--weather .le-weather-temp{font-size:clamp(44px,11vw,62px)}
        .le-sfv--weather .le-weather-insight{padding:5px 8px}
        .le-sfv--weather .le-weather-timeline{padding:8px 9px 6px}
        .le-sfv--weather .le-weather-hour{min-height:43px}
      }
    `;
    document.head.appendChild(style);
  }

  function number(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function round(value) {
    const parsed = number(value);
    return parsed === null ? '—' : String(Math.round(parsed));
  }
  function hourOf(time) {
    const match = /T(\d{2}):/.exec(String(time || ''));
    return match ? Number(match[1]) : 12;
  }
  function phaseOf(item) {
    const hour = hourOf(item.time);
    if (Number(item.isDay) === 0 || hour >= 20 || hour < 5) return 'night';
    if (hour >= 5 && hour <= 7) return 'dawn';
    if (hour >= 16 && hour <= 19) return 'evening';
    return 'day';
  }
  function formatTime(time, index) {
    if (!time) return index === 0 ? 'Now' : '—';
    return `${String(hourOf(time)).padStart(2, '0')}:00`;
  }
  function weatherDescription(code, snowfall, precipitation) {
    const value = number(code);
    if (number(snowfall) > 0 || [71,73,75,77,85,86].includes(value)) return 'Snow';
    if ([95,96,99].includes(value)) return 'Thunderstorm';
    if ([45,48].includes(value)) return 'Fog';
    if (number(precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(value)) return 'Rain';
    if (value === 0) return 'Clear sky';
    if (value === 1) return 'Mostly clear';
    if (value === 2) return 'Partly cloudy';
    if (value === 3) return 'Overcast';
    return 'Weather conditions';
  }
  function weatherIcon(code, snowfall, precipitation) {
    const value = number(code);
    if (number(snowfall) > 0 || [71,73,75,77,85,86].includes(value)) return '❄';
    if ([95,96,99].includes(value)) return '⛈';
    if ([45,48].includes(value)) return '◌';
    if (number(precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(value)) return '☂';
    if (value === 3) return '☁';
    if (value === 2) return '◒';
    if (value === 1) return '◔';
    return '☼';
  }
  function visualState(item) {
    const temperature = number(item.feelsLike) ?? number(item.temperature);
    const cloud = number(item.cloudCover) ?? 0;
    const wind = number(item.wind) ?? 0;
    const code = number(item.weather_code);
    const snow = number(item.snowfall) > 0 || [71,73,75,77,85,86].includes(code);
    const rain = number(item.precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code);
    const storm = [95,96,99].includes(code);
    const fog = [45,48].includes(code);
    const weather = snow ? 'snow' : storm ? 'storm' : rain ? 'rain' : fog ? 'fog' : cloud >= 65 ? 'cloudy' : temperature >= 34 ? 'hot' : 'clear';
    return { weather, phase: phaseOf(item), cloudCover: cloud, wind, windDirection: number(item.windDirection) ?? 270, precipitation: number(item.precipitation) ?? 0, snowfall: number(item.snowfall) ?? 0 };
  }
  function makeForecast(data) {
    const hourly = data?.hourly;
    if (!hourly || !Array.isArray(hourly.time) || !hourly.time.length) return [];
    const currentTime = String(data?.current?.time || hourly.time[0]);
    let start = -1;
    for (let i=0;i<hourly.time.length;i++) { if (hourly.time[i] <= currentTime) start=i; else break; }
    if (start < 0) start = Math.max(0, hourly.time.findIndex(time => time >= currentTime));
    return hourly.time.slice(start,start+MAX_FORECAST_HOURS).map((time,offset) => {
      const i=start+offset, read=key => Array.isArray(hourly[key]) ? hourly[key][i] : null;
      return {time,temperature:read('temperature_2m'),feelsLike:read('apparent_temperature'),humidity:read('relative_humidity_2m'),rainChance:read('precipitation_probability'),precipitation:Math.max(number(read('precipitation'))??0,number(read('rain'))??0,number(read('showers'))??0),snowfall:read('snowfall'),weather_code:read('weather_code'),cloudCover:read('cloud_cover'),wind:read('wind_speed_10m'),gusts:read('wind_gusts_10m'),windDirection:read('wind_direction_10m'),isDay:read('is_day')};
    });
  }

  function weatherViewportProfile(width, height) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const aspect = safeWidth / safeHeight;
    const clampRange = (value, min, max) => Math.min(max, Math.max(min, value));
    const portrait = aspect < 0.82;
    return {
      aspect,
      portrait,
      scaleX: clampRange(0.45 + aspect * 0.72, 0.72, 1.85),
      scaleZ: clampRange(1.58 - Math.max(0, aspect - 0.42) * 0.58, 0.78, 1.58),
      fov: portrait ? 38 : aspect > 1.55 ? 34 : 36
    };
  }

  async function mountLivingTopography(host) {
    const THREE = await import(THREE_MODULE_URL);
    if (!host.isConnected) return { setState() {}, dispose() {} };

    const canvas = el('canvas', 'le-weather-world-canvas');
    canvas.setAttribute('aria-label', 'Adaptive three-dimensional island world with sculpted mountains, coast, forests, river, waterfall and volumetric clouds');
    host.appendChild(canvas);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
    const smallScreen = Math.min(host.clientWidth || innerWidth, host.clientHeight || innerHeight) < 620;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !smallScreen, alpha: false, powerPreference: 'low-power' });
    } catch (error) {
      const fallback = el('div', 'le-weather-world-fallback', 'This device could not start the 3D world. Your live weather readings remain available.');
      host.appendChild(fallback);
      console.warn('[LIVE // EARTH] 3D Weather renderer unavailable.', error);
      return { setState() {}, dispose() { canvas.remove(); fallback.remove(); } };
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const clamp = THREE.MathUtils.clamp;
    const lerp = THREE.MathUtils.lerp;
    const smooth = (a, b, value) => {
      const t = clamp((value - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
    const gaussian = (x, z, cx, cz, sx, sz, height) => height * Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((z - cz) ** 2) / (2 * sz * sz)));
    const seedRandom = (() => {
      let seed = 28471;
      return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    })();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 320);
    // A large gradient sky dome gives the miniature world a continuous horizon.
    const skyGeometry = new THREE.SphereGeometry(240, 36, 24);
    const skyColors = [];
    const skyPosition = skyGeometry.attributes.position;
    const skyHorizon = new THREE.Color('#ffffff');
    const skyZenith = new THREE.Color('#405c72');
    const skyVertex = new THREE.Color();
    for (let i = 0; i < skyPosition.count; i++) {
      const elevation = clamp((skyPosition.getY(i) / 240 + 0.04) / 0.94, 0, 1);
      skyVertex.copy(skyHorizon).lerp(skyZenith, smooth(0.02, 0.96, elevation));
      skyColors.push(skyVertex.r, skyVertex.g, skyVertex.b);
    }
    skyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
    const skyMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
    skyMaterial.toneMapped = false;
    const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    skyDome.frustumCulled = false;
    skyDome.renderOrder = -100;
    scene.add(skyDome);
    const hemisphere = new THREE.HemisphereLight('#f4f7ed', '#344d43', 1.5);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.65);
    sun.position.set(-11, 19, 13);
    sun.castShadow = true;
    sun.shadow.bias = -0.00022;
    sun.shadow.normalBias = 0.028;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.mapSize.set(lowMemory ? 512 : 1024, lowMemory ? 512 : 1024);
    scene.add(sun);

    const world = new THREE.Group();
    scene.add(world);


    // Irregular oval island perimeter: no rectangular ground plane or square horizon.
    function boundaryAt(angle) {
      return 1
        + 0.073 * Math.sin(angle * 3 + 0.42)
        + 0.046 * Math.sin(angle * 5 - 1.18)
        + 0.027 * Math.cos(angle * 9 + 0.7)
        + 0.014 * Math.sin(angle * 13 - 0.3);
    }
    function islandRadius(x, z) {
      const angle = Math.atan2(z / 9.15, x / 11.6);
      const ellipse = Math.sqrt((x / 11.6) ** 2 + (z / 9.15) ** 2);
      return ellipse / boundaryAt(angle);
    }
    function clampToIsland(x, z) {
      const radius = islandRadius(x, z);
      if (radius > 0.992) {
        const scale = 0.992 / radius;
        return [x * scale, z * scale];
      }
      return [x, z];
    }

    // Interlocking peaks and a winding central spine form real land relief.
    function heightAt(x, z) {
      const warpX = x + 0.34 * Math.sin(z * 0.47) + 0.16 * Math.sin(z * 1.13 + x * 0.31);
      const warpZ = z + 0.26 * Math.sin(x * 0.39) + 0.13 * Math.cos(x * 0.92 - z * 0.28);
      const peaks =
        gaussian(warpX, warpZ, -5.4, -4.2, 2.55, 3.0, 4.15) +
        gaussian(warpX, warpZ, -1.9, -6.1, 2.2, 2.7, 5.35) +
        gaussian(warpX, warpZ, 2.0, -4.4, 2.6, 3.0, 4.05) +
        gaussian(warpX, warpZ, 5.7, -1.8, 2.35, 3.05, 3.15) +
        gaussian(warpX, warpZ, -7.1, 0.0, 1.8, 3.2, 2.35);
      const spineX = -1.1 + 1.55 * Math.sin(warpZ * 0.28) + 0.45 * Math.sin(warpZ * 0.73);
      const spine = 1.15 * Math.exp(-((warpX - spineX) ** 2) / 2.9) * smooth(-8, 3, warpZ);
      const ridgeNoise = 0.25 * Math.sin(warpX * 0.78 + warpZ * 0.34) + 0.17 * Math.cos(warpZ * 0.84 - warpX * 0.25) + 0.10 * Math.sin((warpX + warpZ) * 1.37);
      const radial = islandRadius(x, z);
      const shore = smooth(0.76, 1.005, radial);
      const inland = 0.52 + peaks + spine + ridgeNoise;
      return Math.max(0.12, lerp(inland, 0.28, shore * 0.92));
    }

    const landWidth = 27.0;
    const landDepth = 21.5;
    const compact = smallScreen || lowMemory;
    const columns = compact ? 112 : 152;
    const rows = compact ? 92 : 118;

    // Open water surrounding the land makes the coastline and floating base readable.
    const oceanGeometry = new THREE.CircleGeometry(35, 112);
    const oceanMaterial = new THREE.MeshPhysicalMaterial({ color: '#246f83', roughness: 0.24, metalness: 0.16, clearcoat: 1, clearcoatRoughness: 0.18 });
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.33;
    ocean.receiveShadow = true;
    world.add(ocean);

    // Subtle broad wave rings sit on the ocean surface, below the island cliffs.
    const waveMaterial = new THREE.MeshBasicMaterial({ color: '#9de0df', transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
    const waveRings = [];
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(11.8 + i * 2.1, 0.035, 5, 120), waveMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(1.0, 0.78, 1.0);
      ring.position.set(0, -1.285 + i * 0.002, 0.3);
      world.add(ring);
      waveRings.push(ring);
    }

    // Build a clipped, triangulated top surface so the island has an organic edge.
    const terrainPositions = [];
    const terrainColors = [];
    const sand = new THREE.Color('#d7b982');
    const copperRock = new THREE.Color('#c47a48');
    const grass = new THREE.Color('#6f986d');
    const meadow = new THREE.Color('#8cae78');
    const forestFloor = new THREE.Color('#476f51');
    const stone = new THREE.Color('#827d70');
    const highStone = new THREE.Color('#aaa18e');
    const snow = new THREE.Color('#f0eee4');
    const vertexColor = new THREE.Color();

    function pushLandVertex(x, z) {
      const point = clampToIsland(x, z);
      const px = point[0];
      const pz = point[1];
      const radial = islandRadius(px, pz);
      const y = heightAt(px, pz);
      const grain = 0.94 + 0.06 * Math.abs(Math.sin(px * 1.71) * Math.cos(pz * 1.33));
      vertexColor.copy(forestFloor).lerp(grass, smooth(0.12, 1.75, y) * 0.88);
      vertexColor.lerp(meadow, smooth(1.0, 2.7, y) * 0.34);
      if (y > 2.65) vertexColor.lerp(stone, smooth(2.5, 4.25, y) * 0.88);
      const copperExposure = clamp(gaussian(px, pz, -1.8, -6.0, 4.0, 3.5, 1.0) + gaussian(px, pz, 2.5, -4.7, 3.0, 3.4, 0.42), 0, 1);
      vertexColor.lerp(copperRock, smooth(2.4, 4.6, y) * copperExposure * 0.82);
      if (y > 4.5) vertexColor.lerp(highStone, smooth(4.35, 5.25, y) * 0.55);
      if (y > 5.15) vertexColor.lerp(snow, smooth(5.0, 5.9, y) * 0.94);
      vertexColor.lerp(sand, smooth(0.77, 0.96, radial) * 0.98).multiplyScalar(grain);
      terrainPositions.push(px, y, pz);
      terrainColors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    function addLandTriangle(a, b, c) {
      const cx = (a[0] + b[0] + c[0]) / 3;
      const cz = (a[1] + b[1] + c[1]) / 3;
      if (islandRadius(cx, cz) > 1.012) return;
      pushLandVertex(a[0], a[1]);
      pushLandVertex(b[0], b[1]);
      pushLandVertex(c[0], c[1]);
    }

    for (let iz = 0; iz < rows; iz++) {
      const z0 = -landDepth / 2 + (iz / rows) * landDepth;
      const z1 = -landDepth / 2 + ((iz + 1) / rows) * landDepth;
      for (let ix = 0; ix < columns; ix++) {
        const x0 = -landWidth / 2 + (ix / columns) * landWidth;
        const x1 = -landWidth / 2 + ((ix + 1) / columns) * landWidth;
        // Clockwise winding viewed from above keeps the terrain normals facing the sky.
        addLandTriangle([x0, z0], [x0, z1], [x1, z0]);
        addLandTriangle([x1, z0], [x0, z1], [x1, z1]);
      }
    }

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
    // The clipped mesh is non-indexed at its coastline. Average normals by shared
    // world-space vertices so the continuous hills remain smoothly shaded instead
    // of becoming thousands of tiny flat-shaded triangles.
    const normalSums = new Map();
    for (let i = 0; i < terrainPositions.length; i += 9) {
      const ax = terrainPositions[i], ay = terrainPositions[i + 1], az = terrainPositions[i + 2];
      const bx = terrainPositions[i + 3], by = terrainPositions[i + 4], bz = terrainPositions[i + 5];
      const cx = terrainPositions[i + 6], cy = terrainPositions[i + 7], cz = terrainPositions[i + 8];
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      for (let j = 0; j < 3; j++) {
        const offset = i + j * 3;
        const key = `${Math.round(terrainPositions[offset] * 10000)}:${Math.round(terrainPositions[offset + 2] * 10000)}`;
        const total = normalSums.get(key) || [0, 0, 0];
        total[0] += nx; total[1] += ny; total[2] += nz;
        normalSums.set(key, total);
      }
    }
    const smoothNormals = [];
    for (let i = 0; i < terrainPositions.length; i += 3) {
      const key = `${Math.round(terrainPositions[i] * 10000)}:${Math.round(terrainPositions[i + 2] * 10000)}`;
      const normal = normalSums.get(key) || [0, 1, 0];
      const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
      smoothNormals.push(normal[0] / length, normal[1] / length, normal[2] / length);
    }
    terrainGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(smoothNormals, 3));
    const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.015 });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    world.add(terrain);

    // Layered island walls: warm sediment, exposed earth and a dark basalt footing.
    function makeCliffBand(outerRadius, outerDrop, innerRadius, innerDrop, color) {
      const positions = [];
      const count = 220;
      for (let i = 0; i < count; i++) {
        const a0 = (i / count) * Math.PI * 2;
        const a1 = ((i + 1) / count) * Math.PI * 2;
        const make = (angle, radius, drop) => {
          const boundary = boundaryAt(angle) * radius;
          const x = Math.cos(angle) * 11.6 * boundary;
          const z = Math.sin(angle) * 9.15 * boundary;
          return [x, heightAt(x, z) - drop, z];
        };
        const a = make(a0, outerRadius, outerDrop);
        const b = make(a1, outerRadius, outerDrop);
        const c = make(a1, innerRadius, innerDrop);
        const d = make(a0, innerRadius, innerDrop);
        positions.push(...a, ...d, ...b, ...b, ...d, ...c);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.96, side: THREE.DoubleSide, flatShading: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      world.add(mesh);
      return mesh;
    }
    makeCliffBand(0.992, 0.00, 1.025, 0.34, '#c39a6b');
    makeCliffBand(1.025, 0.34, 1.018, 0.92, '#987354');
    makeCliffBand(1.018, 0.92, 0.965, 1.58, '#4c625d');

    // A fine shoreline highlight separates the sculpted land from the surrounding water.
    const shorelinePoints = [];
    for (let i = 0; i <= 240; i++) {
      const angle = (i / 240) * Math.PI * 2;
      const radius = boundaryAt(angle) * 0.998;
      const x = Math.cos(angle) * 11.6 * radius;
      const z = Math.sin(angle) * 9.15 * radius;
      shorelinePoints.push(new THREE.Vector3(x, heightAt(x, z) + 0.045, z));
    }
    const shorelineCurve = new THREE.CatmullRomCurve3(shorelinePoints, true, 'centripetal');
    const shoreline = new THREE.Mesh(new THREE.TubeGeometry(shorelineCurve, 240, 0.038, 5, true), new THREE.MeshBasicMaterial({ color: '#f0e2bd', transparent: true, opacity: 0.76 }));
    world.add(shoreline);

    // Raised contour ribbons trace selected elevation shelves rather than drawing decoration on a flat plane.
    const contourVertices = [];
    const contourEdges = [[0, 1], [1, 2], [2, 3], [3, 0]];
    const contourSteps = 68;
    const contourLevels = [1.15, 1.85, 2.55, 3.25, 3.95, 4.65];
    for (const level of contourLevels) {
      for (let iz = 0; iz < contourSteps; iz++) {
        for (let ix = 0; ix < contourSteps; ix++) {
          const x0 = -11.8 + (ix / contourSteps) * 23.6;
          const x1 = -11.8 + ((ix + 1) / contourSteps) * 23.6;
          const z0 = -9.6 + (iz / contourSteps) * 19.2;
          const z1 = -9.6 + ((iz + 1) / contourSteps) * 19.2;
          const corners = [[x0, z0, heightAt(x0, z0)], [x1, z0, heightAt(x1, z0)], [x1, z1, heightAt(x1, z1)], [x0, z1, heightAt(x0, z1)]];
          const hits = [];
          for (const [a, b] of contourEdges) {
            const va = corners[a][2] - level;
            const vb = corners[b][2] - level;
            if ((va < 0 && vb >= 0) || (va >= 0 && vb < 0)) {
              const t = va / (va - vb);
              const x = lerp(corners[a][0], corners[b][0], t);
              const z = lerp(corners[a][1], corners[b][1], t);
              if (islandRadius(x, z) <= 0.985) hits.push([x, z]);
            }
          }
          if (hits.length >= 2) {
            const pairs = hits.length === 4 ? [[0, 1], [2, 3]] : [[0, 1]];
            for (const [a, b] of pairs) {
              for (const point of [hits[a], hits[b]]) contourVertices.push(point[0], heightAt(point[0], point[1]) + 0.052, point[1]);
            }
          }
        }
      }
    }
    const contourGeometry = new THREE.BufferGeometry();
    contourGeometry.setAttribute('position', new THREE.Float32BufferAttribute(contourVertices, 3));
    const contourMaterial = new THREE.LineBasicMaterial({ color: '#f1e6c9', transparent: true, opacity: 0.26, depthWrite: false });
    const contours = new THREE.LineSegments(contourGeometry, contourMaterial);
    contours.renderOrder = 2;
    world.add(contours);

    // A winding river follows a valley to the visible front-right waterfall and tidal pool.
    const riverPoints = [];
    for (let i = 0; i <= 96; i++) {
      const t = i / 96;
      const z = lerp(-6.7, 8.12, t);
      const x = 1.15 + 0.88 * Math.sin(z * 0.31) + 0.13 * z;
      riverPoints.push(new THREE.Vector3(x, heightAt(x, z) + 0.09, z));
    }
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints, false, 'centripetal');
    const riverPositions = [];
    const riverIndices = [];
    const riverSegments = 230;
    for (let i = 0; i <= riverSegments; i++) {
      const t = i / riverSegments;
      const point = riverCurve.getPoint(t);
      const tangent = riverCurve.getTangent(t);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const halfWidth = 0.17 + 0.20 * Math.sin(Math.PI * t) + 0.09 * t;
      for (const sign of [-1, 1]) {
        const x = point.x + side.x * halfWidth * sign;
        const z = point.z + side.z * halfWidth * sign;
        riverPositions.push(x, heightAt(x, z) + 0.11, z);
      }
      if (i < riverSegments) {
        const a = i * 2;
        riverIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const riverGeometry = new THREE.BufferGeometry();
    riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
    riverGeometry.setIndex(riverIndices);
    riverGeometry.computeVertexNormals();
    const riverMaterial = new THREE.MeshPhysicalMaterial({ color: '#54b9c5', roughness: 0.14, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
    const river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.receiveShadow = true;
    world.add(river);

    const waterfallTop = riverCurve.getPoint(1);
    const fallHeight = Math.max(1.35, heightAt(waterfallTop.x, waterfallTop.z) + 1.12);
    const waterfallGeometry = new THREE.PlaneGeometry(0.92, fallHeight, 1, 18);
    const waterfallMaterial = new THREE.MeshPhysicalMaterial({ color: '#b8eef0', transparent: true, opacity: 0.86, roughness: 0.11, metalness: 0.06, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const waterfall = new THREE.Mesh(waterfallGeometry, waterfallMaterial);
    const waterfallBaseY = (heightAt(waterfallTop.x, waterfallTop.z) - 1.05) / 2;
    waterfall.position.set(waterfallTop.x, waterfallBaseY, 8.93);
    waterfall.rotation.x = -0.04;
    world.add(waterfall);
    const waterfallPool = new THREE.Mesh(new THREE.CircleGeometry(0.92, 48), new THREE.MeshPhysicalMaterial({ color: '#4dc1c8', roughness: 0.12, metalness: 0.18, clearcoat: 1, transparent: true, opacity: 0.88 }));
    waterfallPool.rotation.x = -Math.PI / 2;
    waterfallPool.position.set(waterfallTop.x, -1.255, 8.15);
    world.add(waterfallPool);
    const opticalRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.022, 7, 72), new THREE.MeshBasicMaterial({ color: '#c1f8ed', transparent: true, opacity: 0.38 }));
    opticalRing.rotation.x = Math.PI / 2;
    opticalRing.position.set(waterfallTop.x, -1.22, 8.15);
    world.add(opticalRing);

    // Vegetation uses three distinct silhouettes and clustered distributions, not repeated cones.
    const trunkCount = lowMemory ? 185 : smallScreen ? 260 : 410;
    const trunkGeometry = new THREE.CylinderGeometry(0.045, 0.075, 0.78, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#624a35', roughness: 1 });
    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trunkCount);
    const firGeometry = new THREE.ConeGeometry(0.54, 1.65, 8, 2);
    const firMaterial = new THREE.MeshStandardMaterial({ color: '#285a43', roughness: 0.94, flatShading: true });
    const firs = new THREE.InstancedMesh(firGeometry, firMaterial, trunkCount);
    const crownGeometry = new THREE.IcosahedronGeometry(0.68, 1);
    const crownMaterial = new THREE.MeshStandardMaterial({ color: '#477a55', roughness: 0.98, flatShading: true });
    const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, trunkCount);
    const shrubGeometry = new THREE.IcosahedronGeometry(0.32, 1);
    const shrubMaterial = new THREE.MeshStandardMaterial({ color: '#6f955e', roughness: 1, flatShading: true });
    const shrubCount = lowMemory ? 100 : smallScreen ? 145 : 235;
    const shrubs = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, shrubCount);
    const dummy = new THREE.Object3D();

    const forestClusters = [
      [-8.0, -0.7, 1.8], [-6.2, 3.0, 1.9], [-4.9, -2.2, 1.55],
      [6.9, -3.1, 1.6], [7.1, 1.2, 1.7], [4.8, 3.6, 1.4],
      [-2.8, 4.5, 1.25], [2.8, 1.8, 1.15], [-8.0, -4.2, 1.3]
    ];
    let treeIndex = 0;
    for (let attempt = 0; attempt < trunkCount * 24 && treeIndex < trunkCount; attempt++) {
      const cluster = forestClusters[Math.floor(seedRandom() * forestClusters.length)];
      const x = cluster[0] + (seedRandom() + seedRandom() - 1) * cluster[2] * 2.35;
      const z = cluster[1] + (seedRandom() + seedRandom() - 1) * cluster[2] * 2.15;
      const radial = islandRadius(x, z);
      const y = heightAt(x, z);
      if (radial > 0.84 || y < 0.46 || y > 3.85 || (Math.abs(x - (1.15 + 0.88 * Math.sin(z * 0.31) + 0.13 * z)) < 0.86)) continue;
      if (seedRandom() < 0.18) continue;
      const scale = 0.62 + seedRandom() * 0.92;
      const type = seedRandom();
      dummy.position.set(x, y + 0.34 * scale, z);
      dummy.rotation.set(0, seedRandom() * Math.PI * 2, (seedRandom() - 0.5) * 0.08);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(treeIndex, dummy.matrix);

      if (type < 0.47) {
        dummy.position.set(x, y + 1.14 * scale, z);
        dummy.rotation.set(0, seedRandom() * Math.PI * 2, 0);
        dummy.scale.set(scale, scale * (0.82 + seedRandom() * 0.38), scale);
        dummy.updateMatrix();
        firs.setMatrixAt(treeIndex, dummy.matrix);
        firs.setColorAt(treeIndex, new THREE.Color().setHSL(0.36 + seedRandom() * 0.045, 0.34, 0.20 + seedRandom() * 0.10));
        crowns.setMatrixAt(treeIndex, new THREE.Matrix4().makeScale(0, 0, 0));
      } else {
        dummy.position.set(x, y + 0.94 * scale, z);
        dummy.rotation.set(seedRandom() * 0.25, seedRandom() * Math.PI * 2, seedRandom() * 0.18);
        dummy.scale.set(scale * 0.9, scale * (0.72 + seedRandom() * 0.38), scale * 0.86);
        dummy.updateMatrix();
        crowns.setMatrixAt(treeIndex, dummy.matrix);
        crowns.setColorAt(treeIndex, new THREE.Color().setHSL(0.31 + seedRandom() * 0.09, 0.28 + seedRandom() * 0.2, 0.22 + seedRandom() * 0.13));
        firs.setMatrixAt(treeIndex, new THREE.Matrix4().makeScale(0, 0, 0));
      }
      treeIndex++;
    }
    trunks.count = firs.count = crowns.count = treeIndex;
    trunks.instanceMatrix.needsUpdate = firs.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
    if (firs.instanceColor) firs.instanceColor.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    trunks.castShadow = firs.castShadow = crowns.castShadow = true;
    trunks.receiveShadow = firs.receiveShadow = crowns.receiveShadow = true;
    world.add(trunks, firs, crowns);

    let shrubIndex = 0;
    for (let attempt = 0; attempt < shrubCount * 18 && shrubIndex < shrubCount; attempt++) {
      const x = (seedRandom() - 0.5) * 20.2;
      const z = (seedRandom() - 0.5) * 16.2;
      const radial = islandRadius(x, z);
      const y = heightAt(x, z);
      if (radial > 0.84 || y < 0.35 || y > 2.6 || seedRandom() < 0.38) continue;
      const scale = 0.35 + seedRandom() * 0.65;
      dummy.position.set(x, y + 0.17 * scale, z);
      dummy.rotation.set(0, seedRandom() * Math.PI, 0);
      dummy.scale.set(scale, scale * (0.55 + seedRandom() * 0.35), scale);
      dummy.updateMatrix();
      shrubs.setMatrixAt(shrubIndex, dummy.matrix);
      shrubs.setColorAt(shrubIndex, new THREE.Color().setHSL(0.28 + seedRandom() * 0.13, 0.25 + seedRandom() * 0.22, 0.28 + seedRandom() * 0.17));
      shrubIndex++;
    }
    shrubs.count = shrubIndex;
    shrubs.instanceMatrix.needsUpdate = true;
    if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
    shrubs.castShadow = true;
    world.add(shrubs);

    // Natural rock outcrops add a second material scale between terrain and trees.
    const rockCount = lowMemory ? 58 : smallScreen ? 88 : 146;
    const rockGeometry = new THREE.DodecahedronGeometry(0.44, 1);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: '#8d887b', roughness: 0.96, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
    let rockIndex = 0;
    for (let attempt = 0; attempt < rockCount * 12 && rockIndex < rockCount; attempt++) {
      const x = (seedRandom() - 0.5) * 21.2;
      const z = (seedRandom() - 0.5) * 17.4;
      const radial = islandRadius(x, z);
      const y = heightAt(x, z);
      if (radial > 0.88 || y < 0.6 || (y < 2.2 && seedRandom() < 0.72)) continue;
      const scale = 0.32 + seedRandom() * 0.92;
      dummy.position.set(x, y + 0.18 * scale, z);
      dummy.rotation.set(seedRandom() * 0.45, seedRandom() * Math.PI, seedRandom() * 0.45);
      dummy.scale.set(scale, scale * (0.48 + seedRandom() * 0.42), scale * (0.72 + seedRandom() * 0.48));
      dummy.updateMatrix();
      rocks.setMatrixAt(rockIndex, dummy.matrix);
      rocks.setColorAt(rockIndex, new THREE.Color().setHSL(0.10 + seedRandom() * 0.06, 0.08 + seedRandom() * 0.08, 0.38 + seedRandom() * 0.23));
      rockIndex++;
    }
    rocks.count = rockIndex;
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.castShadow = rocks.receiveShadow = true;
    world.add(rocks);

    // Volumetric cloud masses are layered clusters of softened 3D lobes, not flat icons or poles.
    const cloudMaterial = new THREE.MeshPhysicalMaterial({ color: '#f6f8ef', roughness: 0.96, metalness: 0, clearcoat: 0.08, sheen: 0.28, transparent: true, opacity: 0.94 });
    const cloudGeometry = new THREE.SphereGeometry(1, 20, 14);
    const cloudInstances = [];
    function addCloud(x, y, z, scale, drift, phase) {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.userData.drift = drift;
      group.userData.phase = phase;
      const lobes = [
        [0, 0, 0, 1.28, 0.58, 0.82],
        [-0.84, -0.03, 0.08, 0.88, 0.58, 0.72],
        [0.82, -0.02, 0.02, 0.92, 0.61, 0.74],
        [-0.48, 0.36, -0.05, 0.74, 0.66, 0.7],
        [0.38, 0.42, -0.04, 0.82, 0.68, 0.72],
        [0.02, 0.5, 0.02, 0.78, 0.72, 0.72],
        [-1.16, 0.16, -0.02, 0.52, 0.44, 0.52],
        [1.2, 0.15, 0.08, 0.55, 0.44, 0.55],
        [-0.08, -0.22, 0.48, 0.78, 0.44, 0.55],
        [0.5, -0.2, -0.42, 0.66, 0.48, 0.58]
      ];
      for (let i = 0; i < lobes.length; i++) {
        const lobe = lobes[i];
        const puff = new THREE.Mesh(cloudGeometry, cloudMaterial);
        puff.position.set(lobe[0] * scale, lobe[1] * scale, lobe[2] * scale);
        puff.scale.set(lobe[3] * scale, lobe[4] * scale, lobe[5] * scale);
        puff.castShadow = i < 6;
        group.add(puff);
      }
      group.scale.setScalar(1);
      world.add(group);
      cloudInstances.push(group);
    }
    addCloud(-6.0, 8.1, -3.8, 1.55, 0.10, 0.4);
    addCloud(0.0, 9.5, -7.1, 1.9, -0.075, 1.6);
    addCloud(6.4, 7.5, -1.8, 1.48, 0.085, 2.7);
    addCloud(-2.3, 7.3, 3.5, 1.03, -0.055, 3.2);

    const mistGeometry = new THREE.PlaneGeometry(28, 3.4);
    const mistMaterial = new THREE.MeshBasicMaterial({ color: '#e5f2e9', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    const mist = new THREE.Mesh(mistGeometry, mistMaterial);
    mist.position.set(0, 3.9, -9.2);
    mist.rotation.x = -0.12;
    world.add(mist);

    const particleCount = lowMemory ? 105 : smallScreen ? 150 : 245;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (seedRandom() - 0.5) * 25;
      particlePositions[i * 3 + 1] = seedRandom() * 15;
      particlePositions[i * 3 + 2] = (seedRandom() - 0.5) * 24;
      particleSpeeds[i] = 0.05 + seedRandom() * 0.1;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: '#edf8f4', size: 0.06, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    world.add(particles);

    const weatherLooks = {
      neutral: { sky: '#8ca69d', fog: '#a7b8aa', density: 0.010, cloud: 0.88, cloudColor: '#f4f6ed', light: 1.55, particles: 0, scale: 1 },
      clear: { sky: '#8ec4d2', fog: '#b5d0c5', density: 0.007, cloud: 0.82, cloudColor: '#fffdf3', light: 2.8, particles: 0, scale: 1 },
      cloudy: { sky: '#849da4', fog: '#a4b5ae', density: 0.012, cloud: 1, cloudColor: '#dce5e5', light: 1.85, particles: 0, scale: 1.05 },
      rain: { sky: '#526d79', fog: '#7e9696', density: 0.017, cloud: 1, cloudColor: '#9eafb5', light: 1.12, particles: 0.66, scale: 1.12 },
      storm: { sky: '#344a60', fog: '#647d84', density: 0.022, cloud: 1, cloudColor: '#657b87', light: 0.86, particles: 0.82, scale: 1.18 },
      snow: { sky: '#a7c0c5', fog: '#c6d3cf', density: 0.013, cloud: 1, cloudColor: '#f6fbff', light: 1.75, particles: 0.82, scale: 1.03 },
      fog: { sky: '#aabdb7', fog: '#c8d2c8', density: 0.032, cloud: 0.9, cloudColor: '#e9eee8', light: 1.28, particles: 0.10, scale: 1.06 },
      hot: { sky: '#d5b98b', fog: '#d9c5a4', density: 0.009, cloud: 0.55, cloudColor: '#fff0d5', light: 2.95, particles: 0, scale: 0.96 }
    };
    const phaseLooks = {
      dawn: ['#d3a58e', '#bea99b'],
      day: ['#8ec4d2', '#b5d0c5'],
      evening: ['#8a8499', '#b68d83'],
      night: ['#182b42', '#405460']
    };
    let activeWeather = 'neutral';
    let activePhase = 'day';
    let activeWind = 0;
    let windDirection = 270;
    let targetLook = weatherLooks.neutral;
    let targetSky = new THREE.Color(targetLook.sky);
    let targetFog = new THREE.Color(targetLook.fog);
    let targetCloudColor = new THREE.Color(targetLook.cloudColor);
    let animationFrame = 0;
    let elapsed = 0;
    let disposed = false;
    let lastFrame = 0;
    const clock = new THREE.Clock();

    function setState(next = {}) {
      const kind = weatherLooks[next.weather] ? next.weather : 'neutral';
      const phase = phaseLooks[next.phase] ? next.phase : 'day';
      activeWeather = kind;
      activePhase = phase;
      activeWind = Math.max(0, Number(next.wind) || 0);
      windDirection = Number.isFinite(Number(next.windDirection)) ? Number(next.windDirection) : 270;
      const look = { ...weatherLooks[kind] };
      if (phase === 'night') {
        look.light *= 0.34;
        look.cloud = Math.max(0.38, look.cloud * 0.86);
      } else if (phase === 'dawn' || phase === 'evening') {
        look.light *= 0.78;
      }
      if (kind === 'clear' && next.cloudCover !== null && next.cloudCover !== undefined && Number.isFinite(Number(next.cloudCover))) {
        look.cloud = 0.52 + clamp(Number(next.cloudCover), 0, 100) / 100 * 0.46;
      }
      targetLook = look;
      targetSky.set(kind === 'clear' || kind === 'hot' ? phaseLooks[phase][0] : look.sky);
      targetFog.set(phase === 'night' && kind === 'clear' ? phaseLooks.night[1] : look.fog);
      targetCloudColor.set(look.cloudColor);
      particleMaterial.size = kind === 'rain' || kind === 'storm' ? 0.045 : 0.065;
      particleMaterial.color.set(kind === 'rain' || kind === 'storm' ? '#c5e7f1' : '#f7fff9');
      if (reducedMotion) {
        scene.background = targetSky.clone();
        scene.fog = new THREE.FogExp2(targetFog, look.density);
        sun.intensity = look.light;
        cloudMaterial.color.copy(targetCloudColor);
        cloudMaterial.opacity = look.cloud;
        particleMaterial.opacity = look.particles;
        cloudInstances.forEach((cloud, index) => cloud.scale.setScalar(look.scale * (0.96 + index * 0.018)));
        renderer.render(scene, camera);
      }
    }

    function resize() {
      if (disposed) return;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || host.clientWidth || innerWidth));
      const height = Math.max(1, Math.round(rect.height || host.clientHeight || innerHeight));
      const profile = weatherViewportProfile(width, height);
      const { aspect, portrait, scaleX, scaleZ, fov } = profile;
      // The island changes its footprint with the viewport: narrow/tall on phones,
      // broader on tablets and desktop. All world assets share this transform.
      world.scale.set(scaleX, 1, scaleZ);
      camera.fov = fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      const projectedWidth = 25.9 * scaleX;
      const projectedHeight = 20.3 * scaleZ * 0.86 + 6.7 * 0.48;
      const requiredHeight = Math.max(projectedHeight * (portrait ? 1.12 : 1.08), (projectedWidth / Math.max(0.3, aspect)) * 1.08);
      const distance = requiredHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov * 0.5)));
      const target = new THREE.Vector3(0, portrait ? 2.4 : 2.0, portrait ? 0.2 : 0.0);
      camera.position.set(target.x, target.y + distance * 0.48, target.z + distance * 0.878);
      camera.lookAt(target);
      const dprCap = lowMemory ? 1.1 : smallScreen ? 1.25 : 1.55;
      const pixelBudget = Math.sqrt(2200000 / Math.max(1, width * height));
      renderer.setPixelRatio(Math.max(0.8, Math.min(window.devicePixelRatio || 1, dprCap, pixelBudget)));
      renderer.setSize(width, height, false);
      if (reducedMotion) renderer.render(scene, camera);
    }

    function onVisibility() {
      if (document.hidden) {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (!reducedMotion && !animationFrame && !disposed) {
        clock.start();
        lastFrame = 0;
        animationFrame = requestAnimationFrame(render);
      }
    }
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', resize, { passive: true });
    window.visualViewport?.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    function render(now = 0) {
      if (disposed || document.hidden || !host.isConnected) return;
      if (!reducedMotion) animationFrame = requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.045);
      elapsed += delta;
      const morph = 1 - Math.exp(-delta * 1.2);
      if (!scene.background?.isColor) scene.background = new THREE.Color(targetSky);
      scene.background.lerp(targetSky, morph);
      if (!scene.fog?.isFogExp2) scene.fog = new THREE.FogExp2(targetFog, targetLook.density);
      scene.fog.color.lerp(targetFog, morph);
      scene.fog.density = lerp(scene.fog.density, targetLook.density, morph);
      sun.intensity = lerp(sun.intensity, targetLook.light, morph);
      cloudMaterial.color.lerp(targetCloudColor, morph);
      skyMaterial.color.lerp(targetSky, morph);
      cloudMaterial.opacity = lerp(cloudMaterial.opacity, targetLook.cloud, morph);
      particleMaterial.opacity = lerp(particleMaterial.opacity, targetLook.particles, morph);
      cloudInstances.forEach((cloud, index) => {
        const wanted = targetLook.scale * (0.96 + index * 0.018);
        cloud.scale.setScalar(lerp(cloud.scale.x, wanted, morph));
      });
      if (now - lastFrame < 1000 / 30) return;
      lastFrame = now;
      const windRadians = (windDirection * Math.PI) / 180;
      const windX = Math.cos(windRadians);
      const windZ = Math.sin(windRadians);
      cloudInstances.forEach((cloud, index) => {
        const drift = cloud.userData.drift * (1 + Math.min(1.5, activeWind / 42));
        cloud.position.x += windX * drift * delta;
        cloud.position.z += windZ * drift * delta * 0.18;
        if (cloud.position.x > 15) cloud.position.x = -15;
        if (cloud.position.x < -15) cloud.position.x = 15;
        cloud.position.y += Math.sin(elapsed * 0.22 + index * 1.7) * 0.0008;
      });
      if (activeWeather === 'rain' || activeWeather === 'storm' || activeWeather === 'snow') {
        const positions = particleGeometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
          positions.array[i * 3 + 1] -= particleSpeeds[i] * (activeWeather === 'snow' ? 0.72 : 2.15);
          positions.array[i * 3] += activeWeather === 'snow' ? -0.008 : 0.018;
          if (positions.array[i * 3 + 1] < -0.6) {
            positions.array[i * 3 + 1] = 13 + seedRandom() * 3;
            positions.array[i * 3] = (seedRandom() - 0.5) * 25;
          }
        }
        positions.needsUpdate = true;
      }
      riverMaterial.opacity = 0.94 + Math.sin(elapsed * 1.15) * 0.025;
      waterfall.position.y = waterfallBaseY + Math.sin(elapsed * 1.9) * 0.012;
      opticalRing.rotation.z = Math.sin(elapsed * 0.19) * 0.025;
      waveRings.forEach((ring, index) => { ring.rotation.z = Math.sin(elapsed * 0.08 + index) * 0.012; });
      renderer.render(scene, camera);
    }

    resize();
    setState({ weather: 'neutral', phase: 'day' });
    if (reducedMotion) renderer.render(scene, camera);
    else animationFrame = requestAnimationFrame(render);

    function dispose() {
      if (disposed) return;
      disposed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
          else materials.add(object.material);
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
    }
    return { setState, dispose };
  }
  function activateWeather() {
    const view=mount('weather');if(!view)return;
    addStyles();
    const worldStage=el('div','le-weather-world-stage');worldStage.setAttribute('aria-hidden','true');view.root.insertBefore(worldStage,view.root.firstChild);
    const {body}=view;
    const status=el('p','le-sfv-status','Checking Location permission…');body.appendChild(status);
    const readout=el('section','le-weather-main-readout');
    const placeLabel=el('div','le-weather-place-label','YOUR WEATHER WORLD');
    const currentRow=el('div','le-weather-current-row');
    const temperature=el('strong','le-weather-temp','—°');
    const condition=el('div','le-weather-condition','Waiting for weather');
    currentRow.append(temperature,condition);
    const localTime=el('div','le-weather-local-time','The world is ready for your local forecast');
    const metricLine=el('div','le-weather-metric-line');
    const feels=el('span','','Feels like —°'),rangeMetric=el('span','','H —° · L —°'),windMetric=el('span','','Wind — km/h');
    metricLine.append(feels,rangeMetric,windMetric);
    const insight=el('div','le-weather-insight','Turn on Location to bring your weather to this world.');
    readout.append(placeLabel,currentRow,localTime,metricLine,insight);body.appendChild(readout);

    const bottom=el('section','le-weather-bottom');
    const timeline=el('div','le-weather-timeline');
    const timelineHead=el('div','le-weather-timeline-head');
    timelineHead.append(el('span','le-weather-timeline-title','18-HOUR FORECAST'),el('span','le-weather-timeline-meta','CONTOUR MORPHISM'));
    const hourStrip=el('div','le-weather-hour-strip');hourStrip.setAttribute('role','group');hourStrip.setAttribute('aria-label','Hourly weather forecast');
    const footer=el('div','le-weather-footer');
    const rangeWrap=el('div','');rangeWrap.style.flex='1';
    const rangeLabel=el('label','le-weather-range-label','SCRUB THE WEATHER WORLD');
    const range=el('input','le-weather-range');range.type='range';range.min='0';range.max='0';range.step='1';range.value='0';range.disabled=true;range.setAttribute('aria-label','Select forecast hour');
    rangeWrap.append(rangeLabel,range);
    const refresh=button('Refresh',()=>readExistingLocation(),'le-weather-refresh');
    footer.append(rangeWrap,refresh);timeline.append(timelineHead,hourStrip,footer);bottom.appendChild(timeline);body.appendChild(bottom);
    attribution(body,[{text:'Weather data by '},{label:'Open-Meteo.com',href:'https://open-meteo.com/'},{text:' · '},{label:'CC BY 4.0',href:'https://creativecommons.org/licenses/by/4.0/'}]);

    let engine=null,engineDisposed=false,enginePromise=null,abortController=null,pollTimer=0,locationEventHandler=null,networkOfflineHandler=null,networkOnlineHandler=null,forecast=[],selectedIndex=0;
    enginePromise=mountLivingTopography(worldStage).then(instance=>{if(engineDisposed){instance.dispose?.();return null;}engine=instance;if(forecast.length)renderSelected(selectedIndex);return instance;}).catch(error=>{console.error('[LIVE // EARTH] Living Topography initialization failed.',error);if(!engineDisposed){const fallback=el('div','le-weather-world-fallback','The 3D world could not be started. Your forecast controls remain available.');worldStage.appendChild(fallback);setStatus(status,'3D rendering is unavailable on this device. Weather readings can still be viewed.','error');}return null;});

    function clearForecast(){forecast=[];selectedIndex=0;hourStrip.replaceChildren();range.max='0';range.value='0';range.disabled=true;temperature.textContent='—°';condition.textContent='Weather unavailable';localTime.textContent='Enable Location and connect to the internet';feels.textContent='Feels like —°';rangeMetric.textContent='H —° · L —°';windMetric.textContent='Wind — km/h';insight.textContent='Fresh location weather will appear here when available.';engine?.setState({weather:'neutral',phase:'day'});}
    function renderSelected(index){if(!forecast.length)return;selectedIndex=Math.max(0,Math.min(forecast.length-1,Number(index)||0));const item=forecast[selectedIndex],state=visualState(item),time=formatTime(item.time,selectedIndex),description=weatherDescription(item.weather_code,item.snowfall,item.precipitation);engine?.setState(state);temperature.textContent=`${round(item.temperature)}°`;condition.textContent=description;localTime.textContent=`${time} · ${state.phase==='night'?'Night':state.phase==='dawn'?'First light':state.phase==='evening'?'Evening light':'Daylight'}`;feels.textContent=`Feels like ${round(item.feelsLike)}°`;const values=forecast.map(point=>number(point.temperature)).filter(value=>value!==null);rangeMetric.textContent=values.length?`H ${Math.round(Math.max(...values))}° · L ${Math.round(Math.min(...values))}°`:'H —° · L —°';windMetric.textContent=`Wind ${round(item.wind)} km/h`;const laterRain=forecast.slice(selectedIndex+1).find(point=>(number(point.rainChance)??0)>=45||(number(point.precipitation)??0)>=.3);insight.textContent= laterRain?`Rain possible around ${formatTime(laterRain.time,0)} · ${round(laterRain.rainChance)}% chance`:state.weather==='storm'?'Thunderstorm conditions in the selected forecast.':state.weather==='snow'?'Snow is included in the selected forecast.':state.weather==='fog'?'Reduced visibility is indicated in the selected forecast.':state.weather==='hot'?'Warm conditions · keep hydrated and limit direct sun exposure.':'No significant precipitation signal in the selected hours.';range.value=String(selectedIndex);range.disabled=forecast.length<2;hourStrip.querySelectorAll('.le-weather-hour').forEach((node,i)=>node.setAttribute('aria-pressed',String(i===selectedIndex)));}
    function buildTimeline(){hourStrip.replaceChildren();forecast.forEach((item,index)=>{const time=formatTime(item.time,index),hourButton=button('',()=>renderSelected(index),'le-weather-hour');hourButton.setAttribute('aria-pressed',String(index===selectedIndex));hourButton.setAttribute('aria-label',`${time}, ${round(item.temperature)} degrees, ${weatherDescription(item.weather_code,item.snowfall,item.precipitation)}`);hourButton.append(el('span','le-weather-hour-time',index===0?'NOW':time),el('span','le-weather-hour-icon',weatherIcon(item.weather_code,item.snowfall,item.precipitation)),el('strong','le-weather-hour-temp',`${round(item.temperature)}°`));hourStrip.appendChild(hourButton);});range.max=String(Math.max(0,forecast.length-1));range.value=String(selectedIndex);range.disabled=forecast.length<2;}
    function privacyState(){status.hidden=false;abortController?.abort();clearForecast();setStatus(status,'Location OFF · local weather is cleared. Turn ON the red Location Orb to load your forecast.');refresh.disabled=false;}
    function loadingState(){status.hidden=false;setStatus(status,'Location is ON · waiting for a fresh position from the shared Location Orb…');localTime.textContent='The Weather view never requests GPS by itself';}
    function offlineState(){status.hidden=false;if(pollTimer)clearInterval(pollTimer);pollTimer=0;abortController?.abort();clearForecast();setStatus(status,'Offline · reconnect to request a fresh forecast. No old forecast is presented as current.','error');refresh.disabled=false;}

    async function readExistingLocation(){if(!isActive('weather'))return;if(window.liveEarthLocationAllowed?.()!==true){privacyState();return;}if(navigator.onLine===false){offlineState();return;}const point=globe()?.getLocation?.();if(!point||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)){loadingState();waitForExistingFix();return;}abortController?.abort();abortController=new AbortController();const controller=abortController;refresh.disabled=true;setStatus(status,'Loading current conditions and the next 18 hours…');try{const query=new URLSearchParams({latitude:String(point.latitude),longitude:String(point.longitude),current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',hourly:'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',forecast_days:'2',timezone:'auto',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});const response=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`Weather source returned ${response.status}.`);const data=await response.json();if(!isActive('weather')||window.liveEarthLocationAllowed?.()!==true||abortController!==controller)return;if(!data?.current||!Number.isFinite(Number(data.current.temperature_2m)))throw new Error('The response did not contain usable current conditions.');const nextForecast=makeForecast(data);if(!nextForecast.length)throw new Error('The source did not return an hourly forecast.');const current=data.current||{};Object.assign(nextForecast[0],{time:current.time||nextForecast[0].time,temperature:current.temperature_2m??nextForecast[0].temperature,feelsLike:current.apparent_temperature??nextForecast[0].feelsLike,humidity:current.relative_humidity_2m??nextForecast[0].humidity,precipitation:current.precipitation??nextForecast[0].precipitation,weather_code:current.weather_code??nextForecast[0].weather_code,cloudCover:current.cloud_cover??nextForecast[0].cloudCover,wind:current.wind_speed_10m??nextForecast[0].wind,windDirection:current.wind_direction_10m??nextForecast[0].windDirection,gusts:current.wind_gusts_10m??nextForecast[0].gusts,isDay:current.is_day??nextForecast[0].isDay});forecast=nextForecast;selectedIndex=0;buildTimeline();renderSelected(0);status.hidden=true;setStatus(status,'','success');}catch(error){if(error?.name==='AbortError')return;if(isActive('weather')&&window.liveEarthLocationAllowed?.()===true){status.hidden=false;clearForecast();setStatus(status,`Weather could not be loaded: ${error?.message||'connection unavailable'}.`,'error');}}finally{if(abortController===controller)refresh.disabled=false;}}
    function waitForExistingFix(){if(pollTimer)clearInterval(pollTimer);let remaining=24;pollTimer=window.setInterval(()=>{if(!isActive('weather')){clearInterval(pollTimer);pollTimer=0;return;}if(window.liveEarthLocationAllowed?.()!==true){clearInterval(pollTimer);pollTimer=0;privacyState();return;}const point=globe()?.getLocation?.();if(point&&Number.isFinite(point.latitude)&&Number.isFinite(point.longitude)){clearInterval(pollTimer);pollTimer=0;readExistingLocation();return;}remaining--;if(remaining<=0){clearInterval(pollTimer);pollTimer=0;setStatus(status,'Location is ON, but the shared scanner has not provided a fresh fix yet. Refresh when it settles.','error');}},500);}

    range.addEventListener('input',()=>renderSelected(range.value));
    locationEventHandler=event=>{if(!isActive('weather'))return;if(event.detail?.enabled!==true||window.liveEarthLocationAllowed?.()!==true){if(pollTimer)clearInterval(pollTimer);pollTimer=0;privacyState();}else{loadingState();waitForExistingFix();}};
    networkOfflineHandler=()=>{if(isActive('weather'))offlineState();};
    networkOnlineHandler=()=>{if(!isActive('weather'))return;if(window.liveEarthLocationAllowed?.()!==true){privacyState();return;}loadingState();if(globe()?.getLocation?.())readExistingLocation();else waitForExistingFix();};
    window.addEventListener('live-earth-location-state',locationEventHandler);window.addEventListener('offline',networkOfflineHandler);window.addEventListener('online',networkOnlineHandler);
    if(window.liveEarthLocationAllowed?.()===true){loadingState();waitForExistingFix();}else privacyState();

    return () => {engineDisposed=true;if(pollTimer)clearInterval(pollTimer);pollTimer=0;abortController?.abort();abortController=null;if(locationEventHandler)window.removeEventListener('live-earth-location-state',locationEventHandler);if(networkOfflineHandler)window.removeEventListener('offline',networkOfflineHandler);if(networkOnlineHandler)window.removeEventListener('online',networkOnlineHandler);if(engine)engine.dispose?.();else enginePromise?.then(instance=>instance?.dispose?.());};
  }

  runtime.registerFeature('weather',activateWeather);
})();
