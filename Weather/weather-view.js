/* LIVE // EARTH — Weather: Living Coast / horizon-led Living Topography.
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
    const temperature = number(item.temperature) ?? 20;
    const feelsLike = number(item.feelsLike) ?? temperature;
    const cloud = number(item.cloudCover) ?? 0;
    const wind = number(item.wind) ?? 0;
    const code = number(item.weather_code);
    const snow = number(item.snowfall) > 0 || [71,73,75,77,85,86].includes(code);
    const rain = number(item.precipitation) > 0 || [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code);
    const storm = [95,96,99].includes(code);
    const fog = [45,48].includes(code);
    const weather = snow ? 'snow' : storm ? 'storm' : rain ? 'rain' : fog ? 'fog' : cloud >= 65 ? 'cloudy' : temperature >= 34 ? 'hot' : 'clear';
    return { weather, phase: phaseOf(item), localHour: hourOf(item.time), temperature, feelsLike, humidity: number(item.humidity) ?? 50, cloudCover: cloud, wind, windDirection: number(item.windDirection) ?? 270, precipitation: number(item.precipitation) ?? 0, rainChance: number(item.rainChance) ?? 0, snowfall: number(item.snowfall) ?? 0 };
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
    const portrait = aspect < 0.86;
    const shortLandscape = !portrait && safeHeight < 520;
    const tablet = Math.min(safeWidth, safeHeight) >= 700;
    return {
      aspect,
      portrait,
      shortLandscape,
      tablet,
      // The model keeps one physical aspect ratio. Only its camera composition changes.
      fov: portrait ? (tablet ? 34 : 32) : shortLandscape ? 39 : 35,
      targetY: portrait ? 2.55 : 2.45,
      targetZ: portrait ? -0.65 : -0.8,
      cameraYaw: portrait ? 0.015 : 0.22,
      elevation: portrait ? 0.46 : shortLandscape ? 0.44 : 0.53
    };
  }

  async function mountLivingTopography(host) {
    const THREE = await import(THREE_MODULE_URL);
    if (!host.isConnected) return { setState() {}, dispose() {} };

    const canvas = el('canvas', 'le-weather-world-canvas');
    canvas.setAttribute('aria-label', 'Detailed three-dimensional topographic weather world with raised mountain ridges, textured lowlands, forest, coastal water, flowing river, waterfall and volumetric clouds');
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

    // A distinct atmospheric horizon separates the weather sky from distant sea.
    // The board remains in front; distant coastal headlands sit between sea and sky.
    const horizonRows = [-24.0, -5.0, 0.7, 2.1, 3.1, 5.2, 42.0];
    const initialHorizonPalette = ['#124b61','#1c6d7d','#397f8a','#98b9b6','#d6e6df','#8fc0d2','#4d7899'];
    const horizonPositions = [], horizonColors = [], horizonIndices = [];
    for (let row=0; row<horizonRows.length; row++) {
      const y = horizonRows[row];
      horizonPositions.push(-48,y,-13.42, 48,y,-13.42);
      const color = new THREE.Color(initialHorizonPalette[row]);
      horizonColors.push(color.r,color.g,color.b,color.r,color.g,color.b);
      if (row < horizonRows.length-1) {
        const a=row*2,b=a+1,c=a+2,d=a+3;
        horizonIndices.push(a,c,b,b,c,d);
      }
    }
    const horizonGeometry = new THREE.BufferGeometry();
    horizonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(horizonPositions,3));
    horizonGeometry.setAttribute('color',new THREE.Float32BufferAttribute(horizonColors,3));
    horizonGeometry.setIndex(horizonIndices);
    horizonGeometry.computeVertexNormals();
    const horizonMaterial = new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:false,fog:false});
    const horizonBackdrop = new THREE.Mesh(horizonGeometry,horizonMaterial);
    horizonBackdrop.renderOrder = -82;
    world.add(horizonBackdrop);
    const horizonColorAttribute = horizonGeometry.attributes.color;
    const horizonCurrentColors = initialHorizonPalette.map(value=>new THREE.Color(value));
    let horizonTargetColors = initialHorizonPalette.map(value=>new THREE.Color(value));

    const horizonLayerMaterials = [];
    function addDistantHeadland(z, baseY, amplitude, opacity, peaks, color) {
      const segments=150, positions=[], indices=[];
      for(let i=0;i<=segments;i++){
        const x=-48+(i/segments)*96;
        let crest=baseY + 0.18*Math.sin(x*0.21+z*0.08) + 0.10*Math.sin(x*0.47-z*0.03);
        for(const peak of peaks) crest += peak.height*Math.exp(-((x-peak.x)**2)/(2*peak.width*peak.width));
        crest += amplitude*0.12*Math.max(0,Math.sin(x*0.32+z*0.06));
        positions.push(x,baseY-7,z,x,crest,z);
        if(i<segments){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c);}
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,fog:false});
      const ridge=new THREE.Mesh(geometry,material); ridge.renderOrder=-72+horizonLayerMaterials.length;
      world.add(ridge); horizonLayerMaterials.push(material); return ridge;
    }
    addDistantHeadland(-14.18,0.18,2.7,0.62,[{x:-29,width:8,height:2.4},{x:-13,width:5,height:1.6},{x:12,width:8,height:2.5},{x:31,width:6,height:1.8}],'#718d88');
    addDistantHeadland(-13.92,0.22,2.1,0.78,[{x:-36,width:5,height:1.45},{x:-20,width:7,height:2.35},{x:3,width:6,height:1.55},{x:25,width:8,height:2.1}],'#587b73');
    addDistantHeadland(-13.62,0.10,1.5,0.94,[{x:-31,width:7,height:1.2},{x:-7,width:5,height:1.4},{x:17,width:7,height:1.25},{x:37,width:5,height:0.95}],'#3f6558');

    const celestialMaterial = new THREE.MeshBasicMaterial({color:'#fff0c8',transparent:true,opacity:0.94,depthWrite:false,fog:false});
    const celestialHaloMaterial = new THREE.MeshBasicMaterial({color:'#fff0c8',transparent:true,opacity:0.18,depthWrite:false,fog:false});
    const celestialBody = new THREE.Mesh(new THREE.SphereGeometry(0.56,24,16),celestialMaterial);
    const celestialHalo = new THREE.Mesh(new THREE.SphereGeometry(1.18,24,16),celestialHaloMaterial);
    celestialBody.position.set(-4.8,5.6,-13.34); celestialHalo.position.copy(celestialBody.position);
    world.add(celestialHalo,celestialBody);

    // LIVING TOPOGRAPHY — the reference is a detailed terrain model on a screen-sized
    // rectangular surface, not a round floating island. The model keeps fixed proportions.
    const MAP_W = 13.0;
    const MAP_D = 25.6;
    const compact = smallScreen || lowMemory;
    const HALF_W = MAP_W / 2;
    const HALF_D = MAP_D / 2;
    const GRID_X = compact ? 144 : 190;
    const GRID_Z = compact ? 208 : 272;

    const clamp01 = value => Math.max(0, Math.min(1, value));
    const coastFront = x => 7.35 + 0.86*Math.sin(x*0.24) + 0.46*Math.sin(x*0.61+0.5)
      + 0.58*Math.exp(-((x+4.1)**2)/2.1) - 0.42*Math.exp(-((x-2.7)**2)/1.55)
      + 0.22*Math.sin(x*1.08+0.7);
    const coastEast = z => 5.35 + 0.34*Math.sin(z*0.28) + 0.20*Math.sin(z*0.67)
      + 0.36*Math.exp(-((z-4.2)**2)/5.5) - 0.28*Math.exp(-((z+2.8)**2)/3.0);
    const waterCoverage = (x,z) => Math.max(
      smooth(coastFront(x)-1.12, coastFront(x)+0.46, z),
      smooth(coastEast(z)-0.70, coastEast(z)+0.52, x) * smooth(-4.1,-1.2,z)
    );

    // A long, jagged central mountain spine rises behind the green foothills.
    // Height is continuous across the tile; water occupies a real coastal region.
    function rawLandHeight(x,z) {
      const wx = x + 0.22*Math.sin(z*0.43) + 0.10*Math.sin(z*1.17+x*0.31);
      const wz = z + 0.24*Math.sin(x*0.37) + 0.12*Math.cos(x*0.81-z*0.23);
      const spineX = -2.15 + 0.31*(wz+5.2) + 0.42*Math.sin(wz*0.29);
      const spineDist = wx-spineX;
      const spine = 3.45*Math.exp(-(spineDist*spineDist)/7.1)*smooth(-12,-5.5,wz)*smooth(2.7,7.6,wz);
      const secondarySpineX = 3.55 + 0.22*(wz+4.0) + 0.38*Math.sin(wz*0.25+1.2);
      const secondarySpine = 1.75*Math.exp(-((wx-secondarySpineX)**2)/3.6)*smooth(-10,-4.5,wz)*smooth(1.8,6.0,wz);
      const peaks =
        gaussian(wx,wz,-3.55,-7.0,2.45,3.1,6.6) +
        gaussian(wx,wz,-0.8,-8.2,2.5,3.0,8.1) +
        gaussian(wx,wz,2.05,-6.1,2.5,3.1,6.4) +
        gaussian(wx,wz,-5.7,-4.4,2.05,2.9,4.8) +
        gaussian(wx,wz,4.65,-3.5,2.15,3.6,4.15) +
        gaussian(wx,wz,-4.9,-1.4,2.5,3.8,2.5) +
        gaussian(wx,wz,4.2,-0.6,2.6,3.5,2.2);
      const shoulders =
        gaussian(wx,wz,-6.0,-0.5,3.4,4.0,1.55) +
        gaussian(wx,wz,4.8,0.1,3.7,4.5,1.35) +
        gaussian(wx,wz,-1.1,2.5,5.1,3.7,0.95);
      const foldedNoise =
        0.22*Math.sin(wx*1.38+wz*0.44) +
        0.17*Math.cos(wz*1.56-wx*0.36) +
        0.12*Math.sin((wx+wz)*2.15) +
        0.08*Math.cos(wx*3.2+wz*2.6);
      const sharpRidge = Math.pow(Math.max(0,Math.sin(wx*1.15+wz*0.72)),7)*0.72*smooth(2.9,5.6,peaks+spine);
      const alpineDetail = (0.24*Math.sin(wx*2.65+wz*1.72)*Math.cos(wz*2.9-wx*0.62)+0.13*Math.sin((wx-wz)*3.4))*smooth(2.4,5.2,peaks+spine);
      return Math.max(0.22,0.48+peaks+spine+secondarySpine+shoulders+foldedNoise+sharpRidge+alpineDetail);
    }
    function heightAt(x,z) {
      const sea = waterCoverage(x,z);
      const land = rawLandHeight(x,z);
      // A broad, shallow shelf fades into the coast rather than cutting an oval cliff wall.
      const shoreFade = smooth(0.13,0.83,sea);
      return THREE.MathUtils.lerp(land,-0.20,shoreFade);
    }

    // The miniature world sits on a slim beveled map-board, visible only at its edge.
    const plinthCore = new THREE.Mesh(
      new THREE.BoxGeometry(MAP_W+0.42,0.46,MAP_D+0.42),
      new THREE.MeshStandardMaterial({color:'#203c40',roughness:0.82,metalness:0.10})
    );
    plinthCore.position.set(0,-0.48,0);
    plinthCore.castShadow = true;
    plinthCore.receiveShadow = true;
    world.add(plinthCore);
    const plinthRim = new THREE.Mesh(
      new THREE.BoxGeometry(MAP_W+0.18,0.075,MAP_D+0.18),
      new THREE.MeshStandardMaterial({color:'#6f796c',roughness:0.78,metalness:0.08})
    );
    plinthRim.position.set(0,-0.19,0);
    plinthRim.castShadow = true;
    plinthRim.receiveShadow = true;
    world.add(plinthRim);

    // Fine procedural grain gives soil and exposed rock a tactile miniature-model finish.
    function makeGrainTexture(kind='earth') {
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = textureCanvas.height = 512;
      const ctx = textureCanvas.getContext('2d');
      const image = ctx.createImageData(512,512);
      for (let i=0;i<image.data.length;i+=4) {
        const n = 226 + Math.floor(seedRandom()*29);
        image.data[i]=n; image.data[i+1]=n; image.data[i+2]=n; image.data[i+3]=255;
      }
      ctx.putImageData(image,0,0);
      ctx.globalAlpha = kind==='rock' ? 0.18 : 0.10;
      for (let i=0;i<2600;i++) {
        const x=seedRandom()*512, y=seedRandom()*512;
        const len=2+seedRandom()*22;
        ctx.strokeStyle = seedRandom()<0.5 ? '#3b3932' : '#ffffff';
        ctx.lineWidth=0.35+seedRandom()*1.2;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+len*(seedRandom()-0.35),y+len*0.24); ctx.stroke();
      }
      ctx.globalAlpha=1;
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.repeat.set(kind==='rock'?3.2:4.6,kind==='rock'?5.5:7.2);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      return texture;
    }
    const earthGrain = makeGrainTexture('earth');
    const rockGrain = makeGrainTexture('rock');

    const terrainPositions=[];
    const terrainColors=[];
    const terrainUvs=[];
    const terrainIndices=[];
    const sandColor = new THREE.Color('#d6bd91');
    const darkGreen = new THREE.Color('#315b3e');
    const grassGreen = new THREE.Color('#6c985d');
    const meadowGreen = new THREE.Color('#91ad6c');
    const copper = new THREE.Color('#c56d32');
    const ochre = new THREE.Color('#d59a49');
    const warmRock = new THREE.Color('#93634b');
    const greyRock = new THREE.Color('#77766f');
    const summitRock = new THREE.Color('#d1c5ae');
    const snowCap = new THREE.Color('#e8e9e2');
    const vertexColor = new THREE.Color();
    for(let iz=0;iz<=GRID_Z;iz++){
      const z=-HALF_D+(iz/GRID_Z)*MAP_D;
      for(let ix=0;ix<=GRID_X;ix++){
        const x=-HALF_W+(ix/GRID_X)*MAP_W;
        const y=heightAt(x,z);
        const raw=rawLandHeight(x,z);
        const wet=waterCoverage(x,z);
        const mountainMask=clamp01(gaussian(x,z,-1.2,-7.0,4.0,5.0,1.0)+gaussian(x,z,2.4,-4.8,3.8,4.8,0.28));
        const rockBand=smooth(3.25,5.35,raw);
        const beach=smooth(0.11,0.63,wet);
        vertexColor.copy(darkGreen).lerp(grassGreen,smooth(0.25,2.1,raw)*0.92);
        vertexColor.lerp(meadowGreen,smooth(1.15,3.5,raw)*0.42);
        vertexColor.lerp(warmRock,rockBand*0.43);
        vertexColor.lerp(copper,rockBand*mountainMask*0.90);
        vertexColor.lerp(ochre,smooth(4.0,7.1,raw)*mountainMask*0.26);
        vertexColor.lerp(greyRock,smooth(6.6,8.1,raw)*0.55);
        vertexColor.lerp(summitRock,smooth(8.0,9.35,raw)*0.72);
        vertexColor.lerp(snowCap,smooth(9.1,10.0,raw)*0.55);
        vertexColor.lerp(sandColor,beach*0.93);
        const grain=0.965+0.035*Math.sin(x*3.1+z*1.9)*Math.cos(z*2.7-x*0.8);
        vertexColor.multiplyScalar(grain);
        terrainPositions.push(x,y,z);
        terrainColors.push(vertexColor.r,vertexColor.g,vertexColor.b);
        terrainUvs.push(ix/GRID_X,iz/GRID_Z);
        if(ix<GRID_X&&iz<GRID_Z){
          const a=iz*(GRID_X+1)+ix, b=(iz+1)*(GRID_X+1)+ix, c=a+1, d=b+1;
          terrainIndices.push(a,b,c,c,b,d);
        }
      }
    }
    const terrainGeometry=new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(terrainPositions,3));
    terrainGeometry.setAttribute('color',new THREE.Float32BufferAttribute(terrainColors,3));
    terrainGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(terrainUvs,2));
    terrainGeometry.setIndex(terrainIndices);
    terrainGeometry.computeVertexNormals();
    const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:earthGrain,roughness:0.94,metalness:0.01});
    const terrain=new THREE.Mesh(terrainGeometry,terrainMaterial);
    terrain.castShadow=true; terrain.receiveShadow=true;
    world.add(terrain);

    // Close the map tile down to the board with three visible geological side bands.
    // The side walls follow the terrain edge heights, rather than wrapping an oval island.
    const mapEdges=[
      Array.from({length:GRID_X+1},(_,ix)=>({x:-HALF_W+(ix/GRID_X)*MAP_W,z:-HALF_D})),
      Array.from({length:GRID_Z+1},(_,iz)=>({x:HALF_W,z:-HALF_D+(iz/GRID_Z)*MAP_D})),
      Array.from({length:GRID_X+1},(_,ix)=>({x:HALF_W-(ix/GRID_X)*MAP_W,z:HALF_D})),
      Array.from({length:GRID_Z+1},(_,iz)=>({x:-HALF_W,z:HALF_D-(iz/GRID_Z)*MAP_D}))
    ];
    const edgeBands=[{top:0,bottom:0.20,color:'#c8a77c'},{top:0.20,bottom:0.56,color:'#765f4c'},{top:0.56,bottom:1,color:'#314b49'}];
    for(const band of edgeBands){
      const edgePositions=[];
      for(const edge of mapEdges){
        for(let i=0;i<edge.length-1;i++){
          const a=edge[i],b=edge[i+1],ay=heightAt(a.x,a.z),by=heightAt(b.x,b.z);
          const ya0=THREE.MathUtils.lerp(ay,-0.11,band.top),ya1=THREE.MathUtils.lerp(ay,-0.11,band.bottom);
          const yb0=THREE.MathUtils.lerp(by,-0.11,band.top),yb1=THREE.MathUtils.lerp(by,-0.11,band.bottom);
          edgePositions.push(a.x,ya0,a.z,b.x,yb0,b.z,b.x,yb1,b.z,a.x,ya0,a.z,b.x,yb1,b.z,a.x,ya1,a.z);
        }
      }
      const edgeGeometry=new THREE.BufferGeometry();
      edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(edgePositions,3));
      edgeGeometry.computeVertexNormals();
      const edgeMesh=new THREE.Mesh(edgeGeometry,new THREE.MeshStandardMaterial({color:band.color,roughness:0.94,metalness:0.04,side:THREE.DoubleSide}));
      edgeMesh.castShadow=true;edgeMesh.receiveShadow=true;world.add(edgeMesh);
    }

    // Keep the front edge slim: the land, not a thick stack of platform boxes,
    // should be the visual subject of the coastal world.
    const frontStrata=[];
    for(let layer=0;layer<2;layer++){
      const y=-0.10-layer*0.085;
      const mat=new THREE.MeshStandardMaterial({color:['#8d765e','#344b49'][layer],roughness:0.94,metalness:0.03});
      const strip=new THREE.Mesh(new THREE.BoxGeometry(MAP_W+0.25-layer*0.08,0.065,MAP_D+0.25-layer*0.08),mat);
      strip.position.set(0,y,0);
      strip.castShadow=true; strip.receiveShadow=true;
      world.add(strip); frontStrata.push(strip);
    }

    // The sea follows an irregular front and right-hand coast inside the same map board.
    const seaPositions=[], seaUvs=[], seaIndices=[];
    for(let iz=0;iz<=GRID_Z;iz++){
      const z=-HALF_D+(iz/GRID_Z)*MAP_D;
      for(let ix=0;ix<=GRID_X;ix++){
        const x=-HALF_W+(ix/GRID_X)*MAP_W;
        seaPositions.push(x,0.075,z); seaUvs.push(x/MAP_W+0.5,z/MAP_D+0.5);
      }
    }
    for(let iz=0;iz<GRID_Z;iz++){
      const z=-HALF_D+((iz+0.5)/GRID_Z)*MAP_D;
      for(let ix=0;ix<GRID_X;ix++){
        const x=-HALF_W+((ix+0.5)/GRID_X)*MAP_W;
        if(waterCoverage(x,z)<0.53) continue;
        const a=iz*(GRID_X+1)+ix,b=(iz+1)*(GRID_X+1)+ix,c=a+1,d=b+1;
        seaIndices.push(a,b,c,c,b,d);
      }
    }
    const seaGeometry=new THREE.BufferGeometry();
    seaGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seaPositions,3));
    seaGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(seaUvs,2));
    seaGeometry.setIndex(seaIndices); seaGeometry.computeVertexNormals();
    const waterCanvas=document.createElement('canvas'); waterCanvas.width=512; waterCanvas.height=256;
    const wctx=waterCanvas.getContext('2d');
    const wg=wctx.createLinearGradient(0,0,0,256); wg.addColorStop(0,'#80d6d2'); wg.addColorStop(0.48,'#39a9b5'); wg.addColorStop(1,'#166b82');
    wctx.fillStyle=wg; wctx.fillRect(0,0,512,256);
    for(let i=0;i<900;i++){
      const y=seedRandom()*256, x=seedRandom()*512, len=8+seedRandom()*65;
      wctx.strokeStyle=seedRandom()<0.55?'rgba(220,255,249,.23)':'rgba(2,74,99,.16)';
      wctx.lineWidth=0.4+seedRandom()*1.5; wctx.beginPath(); wctx.moveTo(x,y); wctx.lineTo(x+len,y+(seedRandom()-0.5)*2.2); wctx.stroke();
    }
    const waterTexture=new THREE.CanvasTexture(waterCanvas);
    waterTexture.wrapS=waterTexture.wrapT=THREE.RepeatWrapping;
    waterTexture.repeat.set(2.5,5.5); waterTexture.colorSpace=THREE.SRGBColorSpace;
    waterTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const seaMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',map:waterTexture,roughness:0.22,metalness:0.12,clearcoat:1,clearcoatRoughness:0.16,transparent:true,opacity:0.96,side:THREE.DoubleSide});
    const sea=new THREE.Mesh(seaGeometry,seaMaterial); sea.receiveShadow=true; world.add(sea);

    // Shallow turquoise shelves sit just inside the coast and make the shore readable.
    const shelfGeometry=new THREE.BufferGeometry();
    const shelfPos=[],shelfColor=[],shelfIndices=[];
    for(let i=0;i<320;i++){
      const x=-HALF_W+seedRandom()*MAP_W;
      const z=coastFront(x)-0.1+(seedRandom()*2.8);
      if(z>HALF_D)continue;
      const width=0.18+seedRandom()*0.58;
      const base=shelfPos.length/3;
      shelfPos.push(x-width,0.095,z,x+width,0.095,z,x+width*0.72,0.095,z+0.28,x-width*0.72,0.095,z+0.28);
      shelfIndices.push(base,base+3,base+2,base,base+2,base+1);
      const c=new THREE.Color(seedRandom()<0.5?'#71d2c9':'#a0dacf');
      for(let j=0;j<4;j++)shelfColor.push(c.r,c.g,c.b);
    }
    shelfGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shelfPos,3));
    shelfGeometry.setAttribute('color',new THREE.Float32BufferAttribute(shelfColor,3));
    shelfGeometry.setIndex(shelfIndices);
    shelfGeometry.computeVertexNormals();
    const shelf=new THREE.Mesh(shelfGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.36,side:THREE.DoubleSide,depthWrite:false}));
    world.add(shelf);

    // Fine coast traces and short wave fronts follow the actual shore curve.
    const coastPoints=[];
    for(let i=0;i<=180;i++){
      const x=-HALF_W+(i/180)*MAP_W;
      const z=coastFront(x);
      coastPoints.push(new THREE.Vector3(x,heightAt(x,z)+0.045,z));
    }
    const coastCurve=new THREE.CatmullRomCurve3(coastPoints,false,'centripetal');
    const coastLine=new THREE.Mesh(new THREE.TubeGeometry(coastCurve,220,0.035,5,false),new THREE.MeshBasicMaterial({color:'#e8ddbd',transparent:true,opacity:0.8}));
    world.add(coastLine);
    const waveCurves=[];
    for(let band=0;band<3;band++){
      const pts=[];
      for(let i=0;i<=150;i++){
        const x=-HALF_W+(i/150)*MAP_W;
        const z=coastFront(x)+0.45+band*0.52;
        pts.push(new THREE.Vector3(x,0.092-band*0.001,z));
      }
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#d3f3ea',transparent:true,opacity:0.20-band*0.045}));
      world.add(line); waveCurves.push(line);
    }

    // Raised contour ribbons are actual elevation shelves, restricted to the land.
    const contourVertices=[];
    const contourEdges=[[0,1],[1,2],[2,3],[3,0]];
    const contourLevels=[0.95,1.55,2.25,3.0,3.8,4.7,5.6,6.5,7.4];
    const contourSteps=66;
    for(const level of contourLevels){
      for(let iz=0;iz<contourSteps;iz++){
        const z0=-HALF_D+(iz/contourSteps)*MAP_D,z1=-HALF_D+((iz+1)/contourSteps)*MAP_D;
        for(let ix=0;ix<contourSteps;ix++){
          const x0=-HALF_W+(ix/contourSteps)*MAP_W,x1=-HALF_W+((ix+1)/contourSteps)*MAP_W;
          const corners=[[x0,z0,heightAt(x0,z0)],[x1,z0,heightAt(x1,z0)],[x1,z1,heightAt(x1,z1)],[x0,z1,heightAt(x0,z1)]];
          const hits=[];
          for(const [a,b] of contourEdges){const va=corners[a][2]-level,vb=corners[b][2]-level;if((va<0&&vb>=0)||(va>=0&&vb<0)){const t=va/(va-vb),x=THREE.MathUtils.lerp(corners[a][0],corners[b][0],t),z=THREE.MathUtils.lerp(corners[a][1],corners[b][1],t);if(waterCoverage(x,z)<0.38)hits.push([x,z]);}}
          if(hits.length>=2){const pairs=hits.length===4?[[0,1],[2,3]]:[[0,1]];for(const [a,b] of pairs)for(const p of [hits[a],hits[b]])contourVertices.push(p[0],heightAt(p[0],p[1])+0.035,p[1]);}
        }
      }
    }
    const contourGeometry=new THREE.BufferGeometry(); contourGeometry.setAttribute('position',new THREE.Float32BufferAttribute(contourVertices,3));
    const contourMaterial=new THREE.LineBasicMaterial({color:'#f4e3c2',transparent:true,opacity:0.30,depthWrite:false});
    const contours=new THREE.LineSegments(contourGeometry,contourMaterial); contours.renderOrder=2; world.add(contours);


    // Valley trail is a narrow ochre line, distinct from the moving water system.
    const trailPoints=[];
    for(let i=0;i<=64;i++){
      const t=i/64,z=-4.8+t*10.5,x=-5.1+0.27*(z+4.8)+0.55*Math.sin(z*0.44);
      if(waterCoverage(x,z)<0.34)trailPoints.push(new THREE.Vector3(x,heightAt(x,z)+0.055,z));
    }
    if(trailPoints.length>3){const trail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trailPoints),100,0.055,5,false),new THREE.MeshStandardMaterial({color:'#b99466',roughness:1}));world.add(trail);}

    // The river begins high in the mountain valley, winds through forest clearings,
    // and drops over a real coastal lip into the sea. Its surface carries a flow texture.
    const riverPoints=[];
    const riverPath=[[-1.15,-7.2],[-0.8,-5.0],[0.35,-3.2],[1.8,-1.1],[1.55,1.1],[2.45,3.25],[3.15,5.4],[3.7,7.05]];
    for(let i=0;i<riverPath.length;i++){
      const [x,z]=riverPath[i];
      riverPoints.push(new THREE.Vector3(x,heightAt(x,z)+0.14,z));
    }
    const riverCurve=new THREE.CatmullRomCurve3(riverPoints,false,'centripetal',0.35);
    const riverPositions=[],riverUvs=[],riverIndices=[];
    const riverSegments=280;
    for(let i=0;i<=riverSegments;i++){
      const t=i/riverSegments,point=riverCurve.getPoint(t),tangent=riverCurve.getTangent(t);
      const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      const halfWidth=0.14+0.26*Math.sin(Math.PI*t)+0.06*t;
      for(let edge=0;edge<2;edge++){
        const sign=edge===0?-1:1,x=point.x+side.x*halfWidth*sign,z=point.z+side.z*halfWidth*sign;
        riverPositions.push(x,heightAt(x,z)+0.16,z); riverUvs.push(t,edge);
      }
      if(i<riverSegments){const a=i*2;riverIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const riverGeometry=new THREE.BufferGeometry();
    riverGeometry.setAttribute('position',new THREE.Float32BufferAttribute(riverPositions,3));
    riverGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(riverUvs,2));
    riverGeometry.setIndex(riverIndices); riverGeometry.computeVertexNormals();
    const riverMaterial=new THREE.MeshPhysicalMaterial({color:'#85e1dc',map:waterTexture,roughness:0.13,metalness:0.12,clearcoat:1,clearcoatRoughness:0.08,side:THREE.DoubleSide,transparent:true,opacity:0.95});
    const river=new THREE.Mesh(riverGeometry,riverMaterial); river.receiveShadow=true; world.add(river);

    const waterfallTop=riverCurve.getPoint(1);
    const waterfallDrop=Math.max(1.55,heightAt(waterfallTop.x,waterfallTop.z)-0.14);
    const waterfallGeometry=new THREE.PlaneGeometry(1.42,waterfallDrop,2,28);
    const waterfallMaterial=new THREE.MeshPhysicalMaterial({color:'#d7ffff',map:waterTexture,transparent:true,opacity:0.88,roughness:0.08,metalness:0.03,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
    const waterfall=new THREE.Mesh(waterfallGeometry,waterfallMaterial);
    const waterfallBaseY=(heightAt(waterfallTop.x,waterfallTop.z)+0.14)/2;
    waterfall.position.set(waterfallTop.x,waterfallBaseY,coastFront(waterfallTop.x)+0.48);
    world.add(waterfall);
    const waterfallPool=new THREE.Mesh(new THREE.CircleGeometry(1.18,56),new THREE.MeshPhysicalMaterial({color:'#5ac9cf',roughness:0.13,metalness:0.12,clearcoat:1,transparent:true,opacity:0.90}));
    waterfallPool.rotation.x=-Math.PI/2; waterfallPool.position.set(waterfallTop.x,0.10,waterfall.position.z+0.32); world.add(waterfallPool);
    const waterfallSprayGeometry=new THREE.BufferGeometry();
    const sprayPositions=new Float32Array(96*3);
    for(let i=0;i<96;i++){sprayPositions[i*3]=waterfallTop.x+(seedRandom()-0.5)*2.4;sprayPositions[i*3+1]=0.2+seedRandom()*0.8;sprayPositions[i*3+2]=waterfall.position.z+(seedRandom()-0.5)*1.6;}
    waterfallSprayGeometry.setAttribute('position',new THREE.BufferAttribute(sprayPositions,3));
    const waterfallSprayMaterial=new THREE.PointsMaterial({color:'#e8ffff',size:0.055,transparent:true,opacity:0.50,depthWrite:false});
    const waterfallSpray=new THREE.Points(waterfallSprayGeometry,waterfallSprayMaterial); world.add(waterfallSpray);
    const opticalRing=new THREE.Mesh(new THREE.TorusGeometry(0.88,0.022,7,72),new THREE.MeshBasicMaterial({color:'#c4f8ec',transparent:true,opacity:0.34}));
    opticalRing.rotation.x=Math.PI/2; opticalRing.position.copy(waterfallPool.position); opticalRing.position.y+=0.035; world.add(opticalRing);

    // Flow markers travel downstream so the river is visibly alive even in clear weather.
    const foamGeometry=new THREE.SphereGeometry(1,8,6);
    const foamMaterial=new THREE.MeshBasicMaterial({color:'#e6ffff',transparent:true,opacity:0.64,depthWrite:false});
    const riverFoam=[];
    for(let i=0;i<24;i++){
      const foam=new THREE.Mesh(foamGeometry,foamMaterial);
      foam.scale.set(0.055+seedRandom()*0.07,0.012,0.10+seedRandom()*0.13);
      world.add(foam); riverFoam.push(foam);
    }

    // Mixed forest: tall pines, rounded broadleaf canopies, understorey and clearings.
    const trunkCount=lowMemory?250:smallScreen?360:560;
    const trunkGeometry=new THREE.CylinderGeometry(0.035,0.075,0.92,7);
    const trunkMaterial=new THREE.MeshStandardMaterial({color:'#6c4b32',roughness:1});
    const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,trunkCount);
    const pineLowerGeometry=new THREE.ConeGeometry(0.68,1.42,10,2);
    const pineUpperGeometry=new THREE.ConeGeometry(0.49,1.24,10,2);
    const pineLower=new THREE.InstancedMesh(pineLowerGeometry,new THREE.MeshStandardMaterial({color:'#285c3c',roughness:0.95}),trunkCount);
    const pineUpper=new THREE.InstancedMesh(pineUpperGeometry,new THREE.MeshStandardMaterial({color:'#3a7448',roughness:0.95}),trunkCount);
    const broadGeometry=new THREE.IcosahedronGeometry(0.72,1);
    const broadCanopy=new THREE.InstancedMesh(broadGeometry,new THREE.MeshStandardMaterial({color:'#3f7448',roughness:0.98,flatShading:true}),trunkCount);
    const broadTop=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.48,1),new THREE.MeshStandardMaterial({color:'#68975b',roughness:0.98,flatShading:true}),trunkCount);
    const broadLobes=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.39,1),new THREE.MeshStandardMaterial({color:'#53844c',roughness:0.98,flatShading:true}),trunkCount);
    const shrubCount=lowMemory?145:smallScreen?220:330;
    const shrubGeometry=new THREE.IcosahedronGeometry(0.24,1);
    const shrubs=new THREE.InstancedMesh(shrubGeometry,new THREE.MeshStandardMaterial({color:'#8eaa63',roughness:1,flatShading:true}),shrubCount);
    const dummy=new THREE.Object3D();
    const forestClusters=[
      [-5.2,-0.7,1.45],[-4.2,2.6,1.65],[-4.9,5.3,1.15],[-3.1,0.2,1.3],
      [5.0,-0.1,1.45],[4.1,2.6,1.45],[5.1,5.2,1.1],[3.3,4.2,1.1],
      [-2.3,4.6,1.25],[-0.7,5.5,1.0],[1.0,6.1,1.1],[-5.2,7.0,0.95],[5.2,7.8,0.8]
    ];
    let treeIndex=0;
    const treeTypes=[];
    for(let attempt=0;attempt<trunkCount*30&&treeIndex<trunkCount;attempt++){
      const cluster=forestClusters[Math.floor(seedRandom()*forestClusters.length)];
      const x=cluster[0]+(seedRandom()+seedRandom()-1)*cluster[2]*2.0;
      const z=cluster[1]+(seedRandom()+seedRandom()-1)*cluster[2]*2.1;
      const raw=rawLandHeight(x,z),wet=waterCoverage(x,z);
      if(x<-HALF_W+0.35||x>HALF_W-0.35||z<-HALF_D+0.6||z>HALF_D-0.7||wet>0.38||raw<0.45||raw>3.8)continue;
      const riverX=1.6+0.4*Math.sin(z*0.44);
      if(Math.abs(x-riverX)<0.82&&z>-5)continue;
      if(seedRandom()<0.15)continue;
      const scale=0.64+seedRandom()*0.82;
      const pine=seedRandom()<0.46;
      const yaw=seedRandom()*Math.PI*2;
      dummy.position.set(x,raw+0.42*scale,z); dummy.rotation.set(0,yaw,0); dummy.scale.set(0.82*scale,scale,0.82*scale); dummy.updateMatrix(); trunks.setMatrixAt(treeIndex,dummy.matrix);
      if(pine){
        dummy.position.set(x,raw+0.88*scale,z); dummy.rotation.set(0,yaw,0); dummy.scale.set(scale,scale,scale); dummy.updateMatrix(); pineLower.setMatrixAt(treeIndex,dummy.matrix);
        dummy.position.set(x,raw+1.57*scale,z); dummy.scale.set(0.73*scale,0.82*scale,0.73*scale); dummy.updateMatrix(); pineUpper.setMatrixAt(treeIndex,dummy.matrix);
        pineLower.setColorAt(treeIndex,new THREE.Color().setHSL(0.34+seedRandom()*0.05,0.42,0.19+seedRandom()*0.10));
        pineUpper.setColorAt(treeIndex,new THREE.Color().setHSL(0.34+seedRandom()*0.05,0.38,0.24+seedRandom()*0.12));
        broadCanopy.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0)); broadTop.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0)); broadLobes.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0));
      }else{
        dummy.position.set(x,raw+1.13*scale,z); dummy.rotation.set(seedRandom()*0.18,yaw,seedRandom()*0.15); dummy.scale.set(scale,scale*(0.75+seedRandom()*0.28),scale*0.92); dummy.updateMatrix(); broadCanopy.setMatrixAt(treeIndex,dummy.matrix);
        dummy.position.set(x-0.16*scale,raw+1.62*scale,z+0.09*scale); dummy.scale.set(0.65*scale,0.66*scale,0.65*scale); dummy.updateMatrix(); broadTop.setMatrixAt(treeIndex,dummy.matrix);
        broadCanopy.setColorAt(treeIndex,new THREE.Color().setHSL(0.30+seedRandom()*0.07,0.38+seedRandom()*0.18,0.20+seedRandom()*0.10));
        broadTop.setColorAt(treeIndex,new THREE.Color().setHSL(0.31+seedRandom()*0.07,0.38+seedRandom()*0.15,0.27+seedRandom()*0.11));
        dummy.position.set(x+Math.cos(yaw)*0.39*scale,raw+1.04*scale,z+Math.sin(yaw)*0.39*scale);
        dummy.rotation.set(seedRandom()*0.20,yaw+1.7,seedRandom()*0.16); dummy.scale.set(0.58*scale,0.62*scale,0.58*scale); dummy.updateMatrix(); broadLobes.setMatrixAt(treeIndex,dummy.matrix);
        broadLobes.setColorAt(treeIndex,new THREE.Color().setHSL(0.29+seedRandom()*0.08,0.36+seedRandom()*0.16,0.22+seedRandom()*0.11));
        pineLower.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0)); pineUpper.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0));
      }
      treeTypes.push({x,z,pine,scale,yaw}); treeIndex++;
    }
    trunks.count=pineLower.count=pineUpper.count=broadCanopy.count=broadTop.count=treeIndex;
    for(const mesh of [trunks,pineLower,pineUpper,broadCanopy,broadTop,broadLobes]){mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;world.add(mesh);}

    let shrubIndex=0;
    for(let attempt=0;attempt<shrubCount*22&&shrubIndex<shrubCount;attempt++){
      const x=(seedRandom()-0.5)*(MAP_W-1.2),z=(seedRandom()-0.5)*(MAP_D-1.4),raw=rawLandHeight(x,z);
      if(waterCoverage(x,z)>0.32||raw<0.35||raw>3.1||seedRandom()<0.30)continue;
      const scale=0.35+seedRandom()*0.75;
      dummy.position.set(x,raw+0.12*scale,z);dummy.rotation.set(seedRandom()*0.15,seedRandom()*Math.PI,seedRandom()*0.15);dummy.scale.set(scale,scale*(0.55+seedRandom()*0.3),scale);dummy.updateMatrix();
      shrubs.setMatrixAt(shrubIndex,dummy.matrix);shrubs.setColorAt(shrubIndex,new THREE.Color().setHSL(0.25+seedRandom()*0.14,0.28+seedRandom()*0.2,0.28+seedRandom()*0.18));shrubIndex++;
    }
    shrubs.count=shrubIndex;shrubs.instanceMatrix.needsUpdate=true;if(shrubs.instanceColor)shrubs.instanceColor.needsUpdate=true;shrubs.castShadow=true;world.add(shrubs);

    // Rock fragments and scree sit along the exposed mountain flanks, not randomly in the sea.
    const rockCount=lowMemory?95:smallScreen?145:240;
    const rockGeometry=new THREE.DodecahedronGeometry(0.43,1);
    const rocks=new THREE.InstancedMesh(rockGeometry,new THREE.MeshStandardMaterial({color:'#9a7960',map:rockGrain,roughness:0.98,flatShading:true}),rockCount);
    let rockIndex=0;
    for(let attempt=0;attempt<rockCount*24&&rockIndex<rockCount;attempt++){
      const x=-5.7+seedRandom()*9.8,z=-10.6+seedRandom()*8.4,raw=rawLandHeight(x,z);
      if(raw<3.4||waterCoverage(x,z)>0.15||seedRandom()<0.28)continue;
      const scale=0.26+seedRandom()*0.85;
      dummy.position.set(x,raw+0.13*scale,z);dummy.rotation.set(seedRandom()*0.7,seedRandom()*Math.PI,seedRandom()*0.7);dummy.scale.set(scale,scale*(0.48+seedRandom()*0.50),scale*(0.75+seedRandom()*0.45));dummy.updateMatrix();
      rocks.setMatrixAt(rockIndex,dummy.matrix);rocks.setColorAt(rockIndex,new THREE.Color().setHSL(0.075+seedRandom()*0.06,0.20+seedRandom()*0.16,0.34+seedRandom()*0.22));rockIndex++;
    }
    rocks.count=rockIndex;rocks.instanceMatrix.needsUpdate=true;if(rocks.instanceColor)rocks.instanceColor.needsUpdate=true;rocks.castShadow=rocks.receiveShadow=true;world.add(rocks);

    // Small rock shelves and scree fans add fine scale to the orange mountain face.
    const screeGeometry=new THREE.BufferGeometry(),screePos=[],screeCol=[];
    for(let i=0;i<1450;i++){
      const x=-6.4+seedRandom()*10.8,z=-10.7+seedRandom()*8.8,raw=rawLandHeight(x,z);
      if(raw<3.4||waterCoverage(x,z)>0.1)continue;
      const r=0.025+seedRandom()*0.10,y=heightAt(x,z)+0.045;
      const angle=seedRandom()*Math.PI*2;
      screePos.push(x+Math.cos(angle)*r,y,z+Math.sin(angle)*r,x+Math.cos(angle+2.1)*r*0.6,y+0.015,z+Math.sin(angle+2.1)*r*0.6);
      const c=new THREE.Color(seedRandom()<0.5?'#d39a65':'#8f705e');screeCol.push(c.r,c.g,c.b,c.r,c.g,c.b);
    }
    screeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(screePos,3));screeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(screeCol,3));
    const scree=new THREE.LineSegments(screeGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.50}));world.add(scree);

    // Volumetric cloud masses are layered clusters of softened 3D lobes, not flat icons or poles.
    const cloudMaterial = new THREE.MeshPhysicalMaterial({ color: '#f6f8ef', roughness: 0.96, metalness: 0, clearcoat: 0.08, sheen: 0.28, transparent: true, opacity: 0.94 });
    const cloudGeometry = new THREE.SphereGeometry(1, 20, 14);
    const cloudInstances = [];
    function addCloud(x, y, z, scale, drift, phase) {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.userData.drift = drift;
      group.userData.phase = phase;
      group.userData.baseScale = scale;
      group.userData.basePosition = group.position.clone();
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
    addCloud(-5.3, 11.2, -6.2, 1.72, 0.095, 0.4);
    addCloud(-0.7, 13.0, -8.7, 2.15, -0.072, 1.6);
    addCloud(4.6, 10.7, -4.8, 1.68, 0.082, 2.7);
    addCloud(-4.0, 9.2, 0.0, 1.22, -0.052, 3.2);
    addCloud(2.5, 10.4, 2.2, 1.42, 0.065, 4.1);
    addCloud(6.1, 12.1, 5.4, 1.10, -0.044, 5.3);

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
      particlePositions[i * 3] = (seedRandom() - 0.5) * MAP_W;
      particlePositions[i * 3 + 1] = seedRandom() * 15;
      particlePositions[i * 3 + 2] = (seedRandom() - 0.5) * MAP_D;
      particleSpeeds[i] = 0.05 + seedRandom() * 0.1;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: '#edf8f4', size: 0.06, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    world.add(particles);

    // Rain appears as downward streaks under cloud bases; these are precipitation,
    // never poles or static supports. Snow continues to use slower soft particles.
    const rainStreakCount = lowMemory ? 90 : smallScreen ? 140 : 220;
    const rainStreakPositions = new Float32Array(rainStreakCount * 6);
    const rainStreakVelocity = new Float32Array(rainStreakCount);
    const rainStreakGeometry = new THREE.BufferGeometry();
    for(let i=0;i<rainStreakCount;i++){
      const x=(seedRandom()-0.5)*MAP_W, y=2.0+seedRandom()*11.0, z=(seedRandom()-0.5)*MAP_D;
      rainStreakPositions.set([x,y,z,x+0.035,y-0.28,z+0.015],i*6);
      rainStreakVelocity[i]=0.8+seedRandom()*1.6;
    }
    rainStreakGeometry.setAttribute('position',new THREE.BufferAttribute(rainStreakPositions,3));
    const rainStreakMaterial=new THREE.LineBasicMaterial({color:'#c6edf5',transparent:true,opacity:0,depthWrite:false});
    const rainStreaks=new THREE.LineSegments(rainStreakGeometry,rainStreakMaterial);
    world.add(rainStreaks);

    const stormFlash = new THREE.PointLight('#d9ecff',0,44,2);
    stormFlash.position.set(-2,12,-3);
    world.add(stormFlash);
    let nextLightningAt=10+seedRandom()*14;
    let lightningPulse=0;


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
    const horizonPalettes = {
      dawn:['#24596a','#477e86','#91aaa6','#f0c2a6','#e2ad9e','#b68088','#617286'],
      day:['#15556b','#267989','#6fa2a5','#d5e8df','#a4d0df','#7ab3d1','#4d7898'],
      evening:['#173e55','#365e70','#8e7b84','#e2a181','#c89091','#78617c','#3c4d69'],
      night:['#081b30','#102c43','#263f53','#465b6c','#2b435d','#1a324e','#0e223c']
    };
    const horizonLayerPalettes = {
      dawn:['#7f8e89','#677a73','#4e6257'],
      day:['#718f89','#55786e','#3d6253'],
      evening:['#776d73','#635a5e','#4b4b4c'],
      night:['#33495a','#263e4d','#1b303d']
    };
    let activeWeather = 'neutral';
    let activePhase = 'day';
    let activeWind = 0;
    let windDirection = 270;
    let targetLook = weatherLooks.neutral;
    let targetSky = new THREE.Color(targetLook.sky);
    let targetFog = new THREE.Color(targetLook.fog);
    let targetCloudColor = new THREE.Color(targetLook.cloudColor);
    let targetHorizonColors = horizonPalettes.day.map(value=>new THREE.Color(value));
    let horizonLayerTargets = horizonLayerPalettes.day.map(value=>new THREE.Color(value));
    let targetSunColor = new THREE.Color('#fff1d6');
    let targetHemisphereSky = new THREE.Color('#f4f7ed');
    let targetHemisphereGround = new THREE.Color('#344d43');
    let targetSunPosition = new THREE.Vector3(-11,19,13);
    let targetHumidity = 0.5;
    let targetRainIntensity = 0;
    let riverFlowRate = 0.7;
    let targetHeatHaze = 0;
    let animationFrame = 0;
    let elapsed = 0;
    let disposed = false;
    let lastFrame = 0;
    const clock = new THREE.Clock();

    function setState(next = {}) {
      const kind=weatherLooks[next.weather]?next.weather:'neutral';
      const phase=phaseLooks[next.phase]?next.phase:'day';
      activeWeather=kind; activePhase=phase;
      activeWind=Math.max(0,Number(next.wind)||0);
      windDirection=Number.isFinite(Number(next.windDirection))?Number(next.windDirection):270;
      const look={...weatherLooks[kind]};
      const cloudCover=Number.isFinite(Number(next.cloudCover))?clamp(Number(next.cloudCover),0,100):({clear:18,cloudy:78,rain:94,storm:100,snow:91,fog:82,hot:12,neutral:42}[kind]??42);
      const effectiveCloudCover=Math.max(cloudCover,kind==='storm'?96:kind==='rain'?82:kind==='snow'?86:kind==='fog'?46:0);
      const humidity=Number.isFinite(Number(next.humidity))?clamp(Number(next.humidity),0,100)/100:0.5;
      const precipitation=Math.max(0,Number(next.precipitation)||0);
      const rainChance=Number.isFinite(Number(next.rainChance))?clamp(Number(next.rainChance),0,100):0;
      const snowAmount=Math.max(0,Number(next.snowfall)||0);
      const localHour=Number.isFinite(Number(next.localHour))?clamp(Number(next.localHour),0,23):12;
      targetHumidity=humidity;
      targetRainIntensity=(kind==='rain'||kind==='storm')?clamp(precipitation/3.8,0,1):0;
      // Wind roughens the coast; measured precipitation, not wind speed, feeds stream response.
      riverFlowRate=0.62+Math.min(1.35,precipitation*0.28*(kind==='snow'?0.18:1)+targetRainIntensity*0.24);
      targetHeatHaze=Number.isFinite(Number(next.temperature))?clamp((Number(next.temperature)-27)/18,0,1):0;
      mistMaterial.opacity=0.045+targetHumidity*0.10+targetHeatHaze*0.12;

      // Cloud cover is an actual model input, not a generic weather-type switch.
      look.cloud=0.18+effectiveCloudCover/100*0.82;
      if(kind==='clear')look.cloud=Math.min(0.72,look.cloud);
      if(kind==='rain'||kind==='storm'||kind==='snow')look.cloud=Math.max(0.90,look.cloud);
      if(phase==='night'){
        look.light*=0.30;
        look.cloud=Math.max(0.38,look.cloud*0.88);
      }else if(phase==='dawn'||phase==='evening')look.light*=0.78;
      if(kind==='hot')look.light*=1.08;
      targetLook=look;
      const baseSky=kind==='clear'||kind==='hot'?phaseLooks[phase][0]:look.sky;
      targetSky.set(baseSky);
      targetFog.set(phase==='night'&&kind==='clear'?phaseLooks.night[1]:look.fog);
      targetCloudColor.set(look.cloudColor);
      targetHorizonColors = horizonPalettes[phase].map(value=>new THREE.Color(value));
      horizonLayerTargets = horizonLayerPalettes[phase].map(value=>new THREE.Color(value));
      const weatherHorizonTint = kind==='storm'?'#53616c':kind==='rain'?'#70818a':kind==='cloudy'?'#829497':kind==='fog'?'#b6c4bf':null;
      if(weatherHorizonTint){
        const tint=new THREE.Color(weatherHorizonTint),strength=kind==='storm'?0.58:kind==='rain'?0.36:kind==='cloudy'?0.24:0.42;
        targetHorizonColors=targetHorizonColors.map(color=>color.clone().lerp(tint,strength));
        horizonLayerTargets=horizonLayerTargets.map(color=>color.clone().lerp(tint,strength*0.8));
      }
      if(kind==='hot')targetHorizonColors=targetHorizonColors.map(color=>color.clone().lerp(new THREE.Color('#d6ae86'),0.20));
      const horizonAttribute=horizonGeometry.attributes.color;
      for(let row=0;row<horizonCurrentColors.length;row++){
        const color=horizonCurrentColors[row];
        for(let side=0;side<2;side++){const offset=(row*2+side)*3;horizonAttribute.array[offset]=color.r;horizonAttribute.array[offset+1]=color.g;horizonAttribute.array[offset+2]=color.b;}
      }
      horizonAttribute.needsUpdate=true;
      if(phase==='dawn'){targetSunColor.set('#ffbd91');targetHemisphereSky.set('#f3c5aa');targetHemisphereGround.set('#725a55');targetSunPosition.set(-15,7,8);}
      else if(phase==='evening'){targetSunColor.set('#ff9e70');targetHemisphereSky.set('#d3a18f');targetHemisphereGround.set('#4f4745');targetSunPosition.set(12,8,5);}
      else if(phase==='night'){targetSunColor.set('#91bce1');targetHemisphereSky.set('#607c9e');targetHemisphereGround.set('#182c39');targetSunPosition.set(-4,4,-12);}
      else{targetSunColor.set(kind==='hot'?'#fff0cc':'#fff1d6');targetHemisphereSky.set('#dcefe9');targetHemisphereGround.set('#344d43');}
      const sunArc=(localHour-12)/12*Math.PI;
      targetSunPosition.set(-Math.sin(sunArc)*13,3+Math.max(0,Math.cos(sunArc))*18,10);
      const daylight=phase!=='night';
      celestialMaterial.color.set(daylight?'#fff0c8':'#d5e5f8');
      celestialHaloMaterial.color.set(daylight?'#ffe3ad':'#94c7ef');
      celestialMaterial.opacity=daylight?(kind==='storm'?0.22:kind==='rain'?0.42:0.92):0.72;
      celestialHaloMaterial.opacity=daylight?(kind==='storm'?0.04:0.13):0.08;
      const sunX=-Math.sin(sunArc)*10.8;
      const sunY=3.35+Math.max(0,Math.cos(sunArc))*5.6;
      celestialBody.position.set(sunX,sunY,-13.34); celestialHalo.position.copy(celestialBody.position);
      particleMaterial.size=kind==='rain'||kind==='storm'?0.045:0.075;
      particleMaterial.color.set(kind==='rain'||kind==='storm'?'#c5e7f1':'#f7fff9');
      particleMaterial.opacity=look.particles;
      rainStreakMaterial.opacity=(kind==='rain'||kind==='storm')?targetRainIntensity*0.70:0;
      waterfallMaterial.opacity=0.76+Math.min(0.18,precipitation*0.035+targetRainIntensity*0.08);
      waterfallSprayMaterial.opacity=0.30+Math.min(0.48,precipitation*0.08);
      seaMaterial.roughness=clamp(0.29-activeWind*0.002+(kind==='storm'?0.18:0),0.12,0.55);
      riverMaterial.roughness=clamp(0.18-activeWind*0.0015,0.08,0.28);
      cloudInstances.forEach((cloud,index)=>{
        const threshold=0.13+index*0.115;
        const visibility=clamp((effectiveCloudCover/100-threshold)/0.24,0,1);
        cloud.visible=visibility>0.005;
        cloud.userData.targetVisibility=visibility;
        const size=0.66+effectiveCloudCover/100*0.54;
        cloud.userData.targetScale=size*(0.94+index*0.025);
      });
      if(kind==='storm')nextLightningAt=Math.min(nextLightningAt,elapsed+4+seedRandom()*7);
      if(reducedMotion){
        scene.background=targetSky.clone();scene.fog=new THREE.FogExp2(targetFog,look.density);
        sun.intensity=look.light;sun.color.copy(targetSunColor);hemisphere.color.copy(targetHemisphereSky);hemisphere.groundColor.copy(targetHemisphereGround);
        horizonCurrentColors.forEach((color,index)=>color.copy(targetHorizonColors[index]));
        horizonLayerMaterials.forEach((material,index)=>material.color.copy(horizonLayerTargets[index]));
        const horizonAttribute=horizonGeometry.attributes.color;
        for(let row=0;row<horizonCurrentColors.length;row++)for(let side=0;side<2;side++){const offset=(row*2+side)*3,color=horizonCurrentColors[row];horizonAttribute.array[offset]=color.r;horizonAttribute.array[offset+1]=color.g;horizonAttribute.array[offset+2]=color.b;}
        horizonAttribute.needsUpdate=true;
        cloudMaterial.color.copy(targetCloudColor);cloudMaterial.opacity=look.cloud;
        cloudInstances.forEach(cloud=>cloud.scale.setScalar((cloud.userData.targetScale||1)*(cloud.userData.targetVisibility??1)));
        renderer.render(scene,camera);
      }
    }

    function resize() {
      if (disposed) return;
      const rect=host.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width||host.clientWidth||innerWidth));
      const height=Math.max(1,Math.round(rect.height||host.clientHeight||innerHeight));
      const profile=weatherViewportProfile(width,height);
      const {aspect,portrait,shortLandscape,tablet,fov,targetY,targetZ,cameraYaw,elevation}=profile;
      // Never stretch the terrain. Portrait is the master composition; other screens
      // get a different camera distance/angle while the world geometry stays unchanged.
      world.scale.set(1,1,1);
      world.rotation.y=portrait?0.035:cameraYaw;
      camera.fov=fov;
      camera.aspect=aspect;
      camera.updateProjectionMatrix();
      const desiredVertical=portrait?(tablet?34.0:31.6):shortLandscape?24.5:27.4;
      const distance=desiredVertical/(2*Math.tan(THREE.MathUtils.degToRad(fov*0.5)));
      const target=new THREE.Vector3(0,targetY,targetZ);
      const horizontal=Math.sqrt(Math.max(0,1-elevation*elevation));
      camera.position.set(target.x+Math.sin(cameraYaw)*distance*horizontal,target.y+distance*elevation,target.z+Math.cos(cameraYaw)*distance*horizontal);
      camera.lookAt(target);
      const dprCap=lowMemory?1.1:smallScreen?1.25:1.55;
      const pixelBudget=Math.sqrt(2300000/Math.max(1,width*height));
      renderer.setPixelRatio(Math.max(0.8,Math.min(window.devicePixelRatio||1,dprCap,pixelBudget)));
      renderer.setSize(width,height,false);
      if(reducedMotion)renderer.render(scene,camera);
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
      sun.color.lerp(targetSunColor,morph);
      horizonCurrentColors.forEach((color,index)=>color.lerp(targetHorizonColors[index],morph));
      horizonLayerMaterials.forEach((material,index)=>material.color.lerp(horizonLayerTargets[index],morph));
      const horizonAttribute=horizonGeometry.attributes.color;
      for(let row=0;row<horizonCurrentColors.length;row++)for(let side=0;side<2;side++){const offset=(row*2+side)*3,color=horizonCurrentColors[row];horizonAttribute.array[offset]=color.r;horizonAttribute.array[offset+1]=color.g;horizonAttribute.array[offset+2]=color.b;}
      horizonAttribute.needsUpdate=true;
      sun.position.lerp(targetSunPosition,morph);
      hemisphere.color.lerp(targetHemisphereSky,morph);
      hemisphere.groundColor.lerp(targetHemisphereGround,morph);
      cloudMaterial.color.lerp(targetCloudColor, morph);
      skyMaterial.color.lerp(targetSky, morph);
      cloudMaterial.opacity = lerp(cloudMaterial.opacity, targetLook.cloud, morph);
      particleMaterial.opacity = lerp(particleMaterial.opacity, targetLook.particles, morph);
      if(scene.fog)scene.fog.density=lerp(scene.fog.density,targetLook.density+targetHumidity*0.004,morph);
      cloudInstances.forEach((cloud, index) => {
        const wanted = (cloud.userData.targetScale || (0.78 + index * 0.018)) * (cloud.userData.targetVisibility ?? 1);
        cloud.scale.setScalar(lerp(cloud.scale.x, wanted, morph));
      });
      if (now - lastFrame < 1000 / 30) return;
      lastFrame = now;
      // Open-Meteo wind direction is the direction wind comes FROM; cloud drift uses the downwind vector.
      const windRadians = ((windDirection + 180) * Math.PI) / 180;
      const windX = Math.cos(windRadians);
      const windZ = Math.sin(windRadians);
      cloudInstances.forEach((cloud, index) => {
        const drift = cloud.userData.drift * (1 + Math.min(1.5, activeWind / 42));
        cloud.position.x += windX * drift * delta;
        cloud.position.z += windZ * drift * delta * 0.18;
        if (cloud.position.x > 9) cloud.position.x = -9;
        if (cloud.position.x < -9) cloud.position.x = 9;
        cloud.position.y += Math.sin(elapsed * 0.22 + index * 1.7) * 0.0008;
      });
      if (activeWeather === 'rain' || activeWeather === 'storm' || activeWeather === 'snow') {
        const positions = particleGeometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
          positions.array[i * 3 + 1] -= particleSpeeds[i] * (activeWeather === 'snow' ? 0.72 : 2.15);
          positions.array[i * 3] += activeWeather === 'snow' ? -0.008 : 0.018;
          if (positions.array[i * 3 + 1] < -0.6) {
            positions.array[i * 3 + 1] = 13 + seedRandom() * 3;
            positions.array[i * 3] = (seedRandom() - 0.5) * MAP_W;
          }
        }
        positions.needsUpdate = true;
      }
      // Weather-reactive rain streaks descend from cloud base only when rain/storm is present.
      const streakAttribute=rainStreakGeometry.attributes.position;
      if(activeWeather==='rain'||activeWeather==='storm'){
        for(let i=0;i<rainStreakCount;i++){
          const offset=i*6;
          rainStreakPositions[offset+1]-=rainStreakVelocity[i]*delta*(1+targetRainIntensity*1.8);
          rainStreakPositions[offset+4]=rainStreakPositions[offset+1]-0.32;
          if(rainStreakPositions[offset+1]<0.15){
            const x=(seedRandom()-0.5)*MAP_W,z=(seedRandom()-0.5)*MAP_D,y=5+seedRandom()*9;
            rainStreakPositions.set([x,y,z,x+0.035,y-0.32,z+0.015],offset);
          }
        }
        streakAttribute.needsUpdate=true;
      }
      // Stream foam advances down the river; rainfall and wind strengthen the flow.
      riverFoam.forEach((foam,index)=>{
        const progress=(elapsed*0.045*riverFlowRate+index/riverFoam.length)%1;
        const point=riverCurve.getPoint(progress);
        foam.position.set(point.x,point.y+0.035,point.z);
        foam.rotation.y=Math.atan2(riverCurve.getTangent(progress).x,riverCurve.getTangent(progress).z);
        foam.visible=activeWeather!=='snow'&&activeWeather!=='fog';
      });
      const flowPulse=0.5+0.5*Math.sin(elapsed*1.4*riverFlowRate);
      riverMaterial.opacity=0.88+flowPulse*0.10;
      waterTexture.offset.x=(waterTexture.offset.x+delta*(0.012+activeWind*0.00035))%1;
      waterTexture.offset.y=(waterTexture.offset.y-delta*(0.035+riverFlowRate*0.025))%1;
      waterfall.position.y=waterfallBaseY+Math.sin(elapsed*1.9)*0.025;
      waterfall.scale.x=1+targetRainIntensity*0.12;
      waterfallSpray.rotation.y=Math.sin(elapsed*0.5)*0.08;
      const sprayAttribute=waterfallSprayGeometry.attributes.position;
      for(let i=0;i<96;i++){const offset=i*3;sprayPositions[offset+1]-=delta*(0.48+targetRainIntensity*0.45);if(sprayPositions[offset+1]<0.08){sprayPositions[offset]=waterfallTop.x+(seedRandom()-0.5)*2.0;sprayPositions[offset+1]=0.45+seedRandom()*0.85;sprayPositions[offset+2]=waterfall.position.z+(seedRandom()-0.5)*1.4;}}
      sprayAttribute.needsUpdate=true;
      waterfallSpray.position.y=0.08+Math.sin(elapsed*2.1)*0.035;
      opticalRing.scale.setScalar(1+Math.sin(elapsed*0.65)*0.025+targetRainIntensity*0.08);
      waveCurves.forEach((wave,index)=>{wave.material.opacity=0.13+0.08*(0.5+0.5*Math.sin(elapsed*0.7+index*1.5))+Math.min(0.08,activeWind*0.001);});
      if(activeWeather==='storm'&&elapsed>=nextLightningAt){lightningPulse=0.18;nextLightningAt=elapsed+7+seedRandom()*13;}
      if(lightningPulse>0){stormFlash.intensity=18*(lightningPulse/0.18);lightningPulse=Math.max(0,lightningPulse-delta);}
      else stormFlash.intensity=0;
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
