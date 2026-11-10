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
      aspect, portrait, shortLandscape, tablet,
      // Portrait is the authored master: broad sky, layered land and a narrow sea foreground.
      fov: portrait ? (tablet ? 46 : 49) : shortLandscape ? 43 : 46,
      targetY: portrait ? 11.0 : 8.2,
      targetZ: portrait ? -4.0 : -2.0,
      cameraRise: portrait ? (tablet ? 13.0 : 12.0) : shortLandscape ? 17.0 : 15.0,
      cameraDepth: portrait ? 40.0 : shortLandscape ? 38.0 : 35.0,
      yaw: portrait ? 0.0 : 0.12
    };
  }

  async function mountLivingTopography(host) {
    const THREE = await import(THREE_MODULE_URL);
    if (!host.isConnected) return { setState() {}, dispose() {} };

    const canvas = el('canvas', 'le-weather-world-canvas');
    canvas.setAttribute('aria-label', 'Full-screen weather world with expansive sky, layered coastal mountains, green river valleys, waterfalls and a narrow ocean foreground');
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
      console.warn('[LIVE // EARTH] Weather world renderer unavailable.', error);
      return { setState() {}, dispose() { canvas.remove(); fallback.remove(); } };
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const clamp = THREE.MathUtils.clamp;
    const lerp = THREE.MathUtils.lerp;
    const smooth = (a, b, value) => {
      const t = clamp((value - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
    const gaussian = (x, z, cx, cz, sx, sz, height) => height * Math.exp(-(((x-cx)**2)/(2*sx*sx)+((z-cz)**2)/(2*sz*sz)));
    const seedRandom = (() => {
      let seed = 764321;
      return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    })();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(49, 1, 0.1, 360);
    const world = new THREE.Group();
    scene.add(world);

    // A continuous sky dome fills the entire viewport; it is not a small backdrop panel.
    const skyGeometry = new THREE.SphereGeometry(220, 48, 32);
    const skyColors = [];
    const skyPosition = skyGeometry.attributes.position;
    const skyHorizonColor = new THREE.Color('#d4e6e5');
    const skyZenithColor = new THREE.Color('#235b88');
    const skyVertexColor = new THREE.Color();
    for (let i=0;i<skyPosition.count;i++) {
      const elevation = clamp((skyPosition.getY(i)/220 + 0.025)/0.92, 0, 1);
      skyVertexColor.copy(skyHorizonColor).lerp(skyZenithColor, smooth(0.02,0.98,elevation));
      skyColors.push(skyVertexColor.r,skyVertexColor.g,skyVertexColor.b);
    }
    skyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(skyColors,3));
    const skyMaterial = new THREE.MeshBasicMaterial({vertexColors:true,color:'#ffffff',side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false});
    skyMaterial.toneMapped = false;
    const sky = new THREE.Mesh(skyGeometry,skyMaterial);
    sky.frustumCulled = false;
    sky.renderOrder = -100;
    scene.add(sky);
    scene.background = new THREE.Color('#78a9bf');

    const hemisphere = new THREE.HemisphereLight('#e6f4f6','#314d42',1.45);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight('#fff0d4',2.4);
    sun.position.set(-13,22,9);
    sun.castShadow = true;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.025;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.shadow.mapSize.set(lowMemory?512:1024,lowMemory?512:1024);
    scene.add(sun);

    // WEATHER WORLD GEOMETRY -------------------------------------------------
    // One broad continuous land surface replaces the narrow boxed slab and single central mound.
    const MAP_W = 28;
    const MAP_D = 28;
    const HALF_W = MAP_W/2;
    const BACK_Z = -15.0;
    const FRONT_Z = 13.0;
    const GRID_X = lowMemory?112:144;
    const GRID_Z = lowMemory?124:168;
    const coastFront = x => 8.7 + 0.92*Math.sin(x*0.18+0.25) + 0.48*Math.sin(x*0.43-0.8)
      + 0.68*Math.exp(-((x+5.1)**2)/4.2) - 0.52*Math.exp(-((x-4.2)**2)/2.7)
      + 0.22*Math.sin(x*0.93);
    const riverCenterX = z => -1.25 + 0.85*Math.sin(z*0.27) + 0.20*z + 0.24*Math.sin(z*0.69);

    function rawLandHeight(x,z) {
      const wx = x + 0.28*Math.sin(z*0.36) + 0.12*Math.sin(z*0.92+x*0.28);
      const wz = z + 0.24*Math.sin(x*0.31) + 0.11*Math.cos(x*0.77-z*0.24);
      // Three connected mountain groups with separate shoulders: not one triangular slab.
      const westernPeaks =
        gaussian(wx,wz,-9.0,-8.2,2.0,3.1,4.4) +
        gaussian(wx,wz,-6.4,-10.2,1.85,2.4,6.4) +
        gaussian(wx,wz,-3.9,-8.1,2.0,2.8,4.2);
      const centralPeaks =
        gaussian(wx,wz,-1.4,-10.5,1.9,2.5,7.4) +
        gaussian(wx,wz,1.8,-8.0,1.9,2.8,5.8) +
        gaussian(wx,wz,4.3,-10.0,2.1,2.5,6.4);
      const easternPeaks =
        gaussian(wx,wz,8.1,-8.7,2.4,3.3,5.6) +
        gaussian(wx,wz,10.2,-11.5,1.8,2.3,4.9);
      const mainSpineX = -1.0 + 0.45*Math.sin(wz*0.29) + 0.18*wz;
      const spine = 1.1*Math.exp(-((wx-mainSpineX)**2)/2.4)*smooth(-14,-8,wz)*(1-smooth(-5,-0.8,wz));
      const shoulderRidge = 0.65*Math.exp(-((wx-(6.5+0.24*wz))**2)/2.8)*smooth(-13,-7,wz)*(1-smooth(-4,0,wz));
      const foothills =
        gaussian(wx,wz,-9.0,-1.0,4.8,4.8,2.7) +
        gaussian(wx,wz,-3.8,0.5,4.4,4.9,2.0) +
        gaussian(wx,wz,4.5,0.0,4.8,4.5,2.5) +
        gaussian(wx,wz,9.0,1.3,3.8,4.1,2.2);
      const folded = 0.28*Math.sin(wx*0.76+wz*0.38)+0.20*Math.cos(wz*0.91-wx*0.24)+0.11*Math.sin((wx+wz)*1.55);
      const alpine = (0.24*Math.sin(wx*2.0+wz*1.33)*Math.cos(wz*2.2-wx*0.55)+0.10*Math.sin((wx-wz)*3.1))*smooth(2.8,6.0,westernPeaks+centralPeaks+easternPeaks+spine);
      return Math.max(0.16,0.32+westernPeaks+centralPeaks+easternPeaks+spine+shoulderRidge+foothills+folded+alpine);
    }
    function heightAt(x,z) {
      const raw = rawLandHeight(x,z);
      // Soft beach and wetland shelf, then a local cliff fall where the coast is rocky.
      const coast = coastFront(x);
      const beach = smooth(coast-1.55,coast-0.12,z);
      const coveCliff = (0.45*gaussian(x,z,-8.5,7.2,2.7,1.5,1)+0.55*gaussian(x,z,6.8,7.8,2.5,1.7,1));
      const coastalHeight = lerp(raw,0.18,smooth(coast-0.46,coast+0.28,z));
      return Math.max(0.08,coastalHeight + (1-beach)*coveCliff*0.30);
    }
    const waterCoverage = (x,z) => smooth(coastFront(x)-0.12,coastFront(x)+0.72,z);

    // Procedural soil/rock grain adds small-scale detail without external assets.
    function makeSurfaceTexture(kind='soil') {
      const texCanvas=document.createElement('canvas');
      texCanvas.width=texCanvas.height=256;
      const ctx=texCanvas.getContext('2d');
      const pixels=ctx.createImageData(256,256);
      for(let i=0;i<pixels.data.length;i+=4){const n=222+Math.floor(seedRandom()*32);pixels.data[i]=n;pixels.data[i+1]=n;pixels.data[i+2]=n;pixels.data[i+3]=255;}
      ctx.putImageData(pixels,0,0);
      ctx.globalAlpha=kind==='rock'?0.20:0.10;
      for(let i=0;i<1400;i++){
        const x=seedRandom()*256,y=seedRandom()*256,len=1+seedRandom()*12;
        ctx.strokeStyle=seedRandom()<0.5?'#52463a':'#ffffff';ctx.lineWidth=0.3+seedRandom()*0.9;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y+(seedRandom()-0.5)*2);ctx.stroke();
      }
      ctx.globalAlpha=1;
      const texture=new THREE.CanvasTexture(texCanvas);
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.repeat.set(kind==='rock'?6:4,kind==='rock'?8:6);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      return texture;
    }
    const soilTexture=makeSurfaceTexture('soil');
    const rockTexture=makeSurfaceTexture('rock');

    const terrainPositions=[],terrainColors=[],terrainUvs=[],terrainIndices=[];
    const deepForest=new THREE.Color('#355d3e');
    const meadow=new THREE.Color('#79a45f');
    const sunlitGrass=new THREE.Color('#a3bb70');
    const copperRock=new THREE.Color('#bd6938');
    const ochreRock=new THREE.Color('#d39a50');
    const weatheredStone=new THREE.Color('#777a73');
    const summitStone=new THREE.Color('#c5c5b5');
    const snowCap=new THREE.Color('#edf1ed');
    const sand=new THREE.Color('#d7bf94');
    const vColor=new THREE.Color();
    for(let iz=0;iz<=GRID_Z;iz++){
      const z=BACK_Z+(iz/GRID_Z)*MAP_D;
      for(let ix=0;ix<=GRID_X;ix++){
        const x=-HALF_W+(ix/GRID_X)*MAP_W;
        const y=heightAt(x,z), raw=rawLandHeight(x,z), wet=waterCoverage(x,z);
        const peakMask=clamp(gaussian(x,z,-0.5,-9.6,7.8,4.2,1),0,1);
        const rockBand=smooth(4.4,7.0,raw);
        const grain=0.965+0.035*Math.sin(x*1.9+z*1.3)*Math.cos(z*2.1-x*0.7);
        vColor.copy(deepForest).lerp(meadow,smooth(0.25,2.7,raw)*0.90);
        vColor.lerp(sunlitGrass,smooth(1.7,4.0,raw)*0.27);
        vColor.lerp(copperRock,rockBand*peakMask*0.78);
        vColor.lerp(ochreRock,smooth(5.6,8.5,raw)*peakMask*0.28);
        vColor.lerp(weatheredStone,smooth(7.4,9.2,raw)*0.52);
        vColor.lerp(summitStone,smooth(9.0,10.4,raw)*0.68);
        vColor.lerp(snowCap,smooth(10.2,11.2,raw)*0.78);
        vColor.lerp(sand,smooth(0.18,0.88,wet)*0.94);
        vColor.multiplyScalar(grain);
        terrainPositions.push(x,y,z);terrainColors.push(vColor.r,vColor.g,vColor.b);terrainUvs.push(ix/GRID_X,iz/GRID_Z);
        if(ix<GRID_X&&iz<GRID_Z){
          const a=iz*(GRID_X+1)+ix,b=(iz+1)*(GRID_X+1)+ix,c=a+1,d=b+1;
          const nextX=-HALF_W+((ix+1)/GRID_X)*MAP_W;
          const nextZ=BACK_Z+((iz+1)/GRID_Z)*MAP_D;
          // Clip land triangles at the irregular shoreline so no pale terrain shelf
          // continues underneath the sea as a rectangular strip.
          if(waterCoverage((x+nextX)*0.5,(z+nextZ)*0.5)<0.52) terrainIndices.push(a,b,c,c,b,d);
        }
      }
    }
    const terrainGeometry=new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(terrainPositions,3));
    terrainGeometry.setAttribute('color',new THREE.Float32BufferAttribute(terrainColors,3));
    terrainGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(terrainUvs,2));
    terrainGeometry.setIndex(terrainIndices);terrainGeometry.computeVertexNormals();
    const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:soilTexture,roughness:0.94,metalness:0.01});
    const terrain=new THREE.Mesh(terrainGeometry,terrainMaterial);terrain.castShadow=true;terrain.receiveShadow=true;world.add(terrain);

    // Distant ridge silhouettes blend the actual mountain chain into the atmospheric horizon.
    const distantRidgeMaterials=[];
    function addDistantRidge(z,baseY,peaks,color,opacity){
      const positions=[],indices=[],segments=180;
      for(let i=0;i<=segments;i++){
        const x=-32+i/segments*64;
        let crest=baseY+0.13*Math.sin(x*0.24+z*0.08)+0.09*Math.sin(x*0.54-z*0.04);
        for(const peak of peaks)crest+=peak.h*Math.exp(-((x-peak.x)**2)/(2*peak.w*peak.w));
        positions.push(x,baseY-6.0,z,x,crest,z);
        if(i<segments){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,b,c,b,d,c);}
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,fog:false});
      const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=-18+distantRidgeMaterials.length;world.add(mesh);distantRidgeMaterials.push(material);return mesh;
    }
    addDistantRidge(-16.3,1.0,[{x:-25,w:7,h:2.1},{x:-11,w:6,h:2.7},{x:7,w:8,h:2.3},{x:24,w:7,h:2.0}],'#718d91',0.42);
    addDistantRidge(-15.9,0.8,[{x:-20,w:6,h:1.8},{x:-2,w:5,h:2.1},{x:16,w:7,h:1.8}],'#54766f',0.52);

    // An irregular coastal sea fills only the foreground beyond the natural shore.
    const SEA_X=26,SEA_Z0=7.8,SEA_Z1=34,SEA_NX=132,SEA_NZ=94;
    const seaPositions=[],seaUvs=[],seaIndices=[];
    for(let iz=0;iz<=SEA_NZ;iz++){
      const z=SEA_Z0+(iz/SEA_NZ)*(SEA_Z1-SEA_Z0);
      for(let ix=0;ix<=SEA_NX;ix++){
        const x=-SEA_X+(ix/SEA_NX)*(SEA_X*2);
        seaPositions.push(x,0.035,z);seaUvs.push(x/SEA_X*0.5+0.5,(z-SEA_Z0)/(SEA_Z1-SEA_Z0));
      }
    }
    for(let iz=0;iz<SEA_NZ;iz++)for(let ix=0;ix<SEA_NX;ix++){
      const x=-SEA_X+((ix+0.5)/SEA_NX)*(SEA_X*2),z=SEA_Z0+((iz+0.5)/SEA_NZ)*(SEA_Z1-SEA_Z0);
      if(waterCoverage(x,z)<0.36)continue;
      const a=iz*(SEA_NX+1)+ix,b=(iz+1)*(SEA_NX+1)+ix,c=a+1,d=b+1;
      seaIndices.push(a,b,c,c,b,d);
    }
    const seaGeometry=new THREE.BufferGeometry();seaGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seaPositions,3));seaGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(seaUvs,2));seaGeometry.setIndex(seaIndices);seaGeometry.computeVertexNormals();
    const waterCanvas=document.createElement('canvas');waterCanvas.width=512;waterCanvas.height=256;
    const wctx=waterCanvas.getContext('2d');
    const waterGradient=wctx.createLinearGradient(0,0,0,256);waterGradient.addColorStop(0,'#73c8c6');waterGradient.addColorStop(0.32,'#2799a9');waterGradient.addColorStop(1,'#10516d');
    wctx.fillStyle=waterGradient;wctx.fillRect(0,0,512,256);
    for(let i=0;i<1200;i++){const x=seedRandom()*512,y=seedRandom()*256,len=5+seedRandom()*68;wctx.strokeStyle=seedRandom()<0.56?'rgba(222,255,248,.24)':'rgba(0,50,80,.20)';wctx.lineWidth=0.35+seedRandom()*1.2;wctx.beginPath();wctx.moveTo(x,y);wctx.lineTo(x+len,y+(seedRandom()-0.5)*2);wctx.stroke();}
    const waterTexture=new THREE.CanvasTexture(waterCanvas);waterTexture.wrapS=waterTexture.wrapT=THREE.RepeatWrapping;waterTexture.repeat.set(2.3,5.8);waterTexture.colorSpace=THREE.SRGBColorSpace;waterTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const seaMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',map:waterTexture,roughness:0.23,metalness:0.12,clearcoat:1,clearcoatRoughness:0.18,side:THREE.DoubleSide});
    const sea=new THREE.Mesh(seaGeometry,seaMaterial);sea.receiveShadow=true;world.add(sea);

    // Shallow coves and beach shelves soften the land/sea boundary.
    const shelfPositions=[],shelfColors=[],shelfIndices=[];
    for(let i=0;i<380;i++){
      const x=-HALF_W+seedRandom()*MAP_W,z=coastFront(x)+0.05+seedRandom()*1.35;
      const width=0.15+seedRandom()*0.48,base=shelfPositions.length/3;
      shelfPositions.push(x-width,0.075,z,x+width,0.075,z,x+width*0.68,0.075,z+0.30,x-width*0.68,0.075,z+0.30);
      shelfIndices.push(base,base+3,base+2,base,base+2,base+1);
      const color=new THREE.Color(seedRandom()<0.5?'#68cfc5':'#9bded2');for(let j=0;j<4;j++)shelfColors.push(color.r,color.g,color.b);
    }
    const shelfGeometry=new THREE.BufferGeometry();shelfGeometry.setAttribute('position',new THREE.Float32BufferAttribute(shelfPositions,3));shelfGeometry.setAttribute('color',new THREE.Float32BufferAttribute(shelfColors,3));shelfGeometry.setIndex(shelfIndices);shelfGeometry.computeVertexNormals();
    const shelfMaterial=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.36,side:THREE.DoubleSide,depthWrite:false});
    const shelves=new THREE.Mesh(shelfGeometry,shelfMaterial);world.add(shelves);

    const coastPoints=[];
    for(let i=0;i<=220;i++){const x=-HALF_W+(i/220)*MAP_W,z=coastFront(x);coastPoints.push(new THREE.Vector3(x,heightAt(x,z)+0.045,z));}
    const coastCurve=new THREE.CatmullRomCurve3(coastPoints,false,'centripetal');
    const coastLine=new THREE.Mesh(new THREE.TubeGeometry(coastCurve,260,0.028,5,false),new THREE.MeshBasicMaterial({color:'#f0e2c1',transparent:true,opacity:0.72}));world.add(coastLine);
    const waveLines=[];
    for(let band=0;band<3;band++){
      const points=[];for(let i=0;i<=180;i++){const x=-HALF_W+(i/180)*MAP_W,z=coastFront(x)+0.65+band*0.78;points.push(new THREE.Vector3(x,0.052-band*0.002,z));}
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#d8fbf3',transparent:true,opacity:0.20-band*0.045}));world.add(line);waveLines.push(line);
    }

    // River ribbon: one continuous water surface, with banks and a real drop to the coast.
    const riverPath=[[-2.2,-11.2],[-1.5,-8.9],[-0.7,-6.3],[0.3,-4.1],[1.6,-1.5],[1.0,1.1],[2.4,3.6],[3.4,6.4],[4.0,9.15]];
    const riverPoints=riverPath.map(([x,z])=>new THREE.Vector3(x,heightAt(x,z)+0.16,z));
    const riverCurve=new THREE.CatmullRomCurve3(riverPoints,false,'centripetal',0.35);
    const riverPositions=[],riverUvs=[],riverIndices=[];
    const riverSegments=320;
    for(let i=0;i<=riverSegments;i++){
      const t=i/riverSegments,p=riverCurve.getPoint(t),tangent=riverCurve.getTangent(t),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      const halfWidth=0.22+0.18*Math.sin(Math.PI*t)+0.06*Math.sin(t*6.2);
      for(let edge=0;edge<2;edge++){const sign=edge===0?-1:1,x=p.x+side.x*halfWidth*sign,z=p.z+side.z*halfWidth*sign;riverPositions.push(x,heightAt(x,z)+0.18,z);riverUvs.push(t,edge);}
      if(i<riverSegments){const a=i*2;riverIndices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const riverGeometry=new THREE.BufferGeometry();riverGeometry.setAttribute('position',new THREE.Float32BufferAttribute(riverPositions,3));riverGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(riverUvs,2));riverGeometry.setIndex(riverIndices);riverGeometry.computeVertexNormals();
    const riverMaterial=new THREE.MeshPhysicalMaterial({color:'#8be3dc',map:waterTexture,roughness:0.12,metalness:0.08,clearcoat:1,clearcoatRoughness:0.07,side:THREE.DoubleSide,transparent:true,opacity:0.94});
    const river=new THREE.Mesh(riverGeometry,riverMaterial);river.receiveShadow=true;world.add(river);
    const riverBankMaterial=new THREE.MeshStandardMaterial({color:'#8f866c',roughness:1});
    const riverLeftPoints=[],riverRightPoints=[];
    for(let i=0;i<=100;i++){const t=i/100,p=riverCurve.getPoint(t),tan=riverCurve.getTangent(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize(),w=0.38+0.18*Math.sin(Math.PI*t);riverLeftPoints.push(new THREE.Vector3(p.x-side.x*w,heightAt(p.x-side.x*w,p.z-side.z*w)+0.035,p.z-side.z*w));riverRightPoints.push(new THREE.Vector3(p.x+side.x*w,heightAt(p.x+side.x*w,p.z+side.z*w)+0.035,p.z+side.z*w));}
    const bankLeft=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverLeftPoints),140,0.055,5,false),riverBankMaterial);
    const bankRight=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverRightPoints),140,0.055,5,false),riverBankMaterial);world.add(bankLeft,bankRight);
    const waterfallTop=riverCurve.getPoint(1);
    const waterfallDrop=Math.max(1.25,heightAt(waterfallTop.x,waterfallTop.z)-0.08);
    const waterfallGeometry=new THREE.PlaneGeometry(1.22,waterfallDrop,2,28);
    const waterfallMaterial=new THREE.MeshPhysicalMaterial({color:'#d9ffff',map:waterTexture,transparent:true,opacity:0.78,roughness:0.08,metalness:0.02,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
    const waterfall=new THREE.Mesh(waterfallGeometry,waterfallMaterial);
    const waterfallBaseY=waterfallDrop*0.5;
    waterfall.position.set(waterfallTop.x,waterfallBaseY,coastFront(waterfallTop.x)+0.20);
    world.add(waterfall);
    const waterfallPool=new THREE.Mesh(new THREE.CircleGeometry(0.9,48),new THREE.MeshPhysicalMaterial({color:'#54c3c7',roughness:0.13,metalness:0.12,clearcoat:1,transparent:true,opacity:0.84}));
    waterfallPool.rotation.x=-Math.PI/2;waterfallPool.position.set(waterfallTop.x,0.075,waterfall.position.z+0.5);world.add(waterfallPool);
    const waterfallMist=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.6),new THREE.MeshBasicMaterial({color:'#e7fbf4',transparent:true,opacity:0.18,depthWrite:false,side:THREE.DoubleSide}));
    waterfallMist.position.set(waterfallTop.x,0.68,waterfall.position.z+0.12);world.add(waterfallMist);

    // Layered forest: different canopy silhouettes, clearings and an open river corridor.
    const treeCapacity=lowMemory?250:smallScreen?330:470;
    const trunkGeometry=new THREE.CylinderGeometry(0.045,0.085,0.92,7);
    const trunkMaterial=new THREE.MeshStandardMaterial({color:'#65462f',roughness:1});
    const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,treeCapacity);
    const broadGeometry=new THREE.IcosahedronGeometry(0.64,2);
    const broadMaterial=new THREE.MeshStandardMaterial({color:'#377444',roughness:0.96});
    const broadCanopy=new THREE.InstancedMesh(broadGeometry,broadMaterial,treeCapacity);
    const broadLobeGeometry=new THREE.IcosahedronGeometry(0.42,1);
    const broadLobes=new THREE.InstancedMesh(broadLobeGeometry,new THREE.MeshStandardMaterial({color:'#5b8d50',roughness:0.96}),treeCapacity);
    const pineLower=new THREE.InstancedMesh(new THREE.ConeGeometry(0.55,1.45,9,2),new THREE.MeshStandardMaterial({color:'#285b43',roughness:0.96}),treeCapacity);
    const pineUpper=new THREE.InstancedMesh(new THREE.ConeGeometry(0.40,1.18,9,2),new THREE.MeshStandardMaterial({color:'#3c7650',roughness:0.96}),treeCapacity);
    const dummy=new THREE.Object3D();
    const forestClusters=[
      [-11,-0.2,2.5],[-8,2.8,2.1],[-5.8,5.4,1.8],[-10,7.2,1.4],
      [10,-0.3,2.4],[7.8,2.7,2.0],[5.8,5.4,1.8],[10,7.1,1.5],
      [-4.8,2.5,1.6],[4.0,1.6,1.6],[-7.5,-3.0,1.2],[8.0,-2.2,1.2]
    ];
    let treeIndex=0;
    for(let attempt=0;attempt<treeCapacity*35&&treeIndex<treeCapacity;attempt++){
      const cluster=forestClusters[Math.floor(seedRandom()*forestClusters.length)];
      const x=cluster[0]+(seedRandom()+seedRandom()-1)*cluster[2]*2.0;
      const z=cluster[1]+(seedRandom()+seedRandom()-1)*cluster[2]*2.0;
      const raw=rawLandHeight(x,z);
      if(x<-HALF_W+0.5||x>HALF_W-0.5||z<-13||z>7.1||waterCoverage(x,z)>0.1||raw<0.35||raw>4.8)continue;
      const rx=riverCenterX(z);
      if(Math.abs(x-rx)<1.05&&z>-9)continue;
      if(seedRandom()<0.17)continue;
      const scale=0.72+seedRandom()*0.78,yaw=seedRandom()*Math.PI*2,pine=seedRandom()<0.38;
      dummy.position.set(x,raw+0.4*scale,z);dummy.rotation.set(0,yaw,0);dummy.scale.set(0.82*scale,scale,0.82*scale);dummy.updateMatrix();trunks.setMatrixAt(treeIndex,dummy.matrix);
      if(pine){
        dummy.position.set(x,raw+0.92*scale,z);dummy.scale.set(scale,scale,scale);dummy.updateMatrix();pineLower.setMatrixAt(treeIndex,dummy.matrix);
        dummy.position.set(x,raw+1.54*scale,z);dummy.scale.set(0.75*scale,0.78*scale,0.75*scale);dummy.updateMatrix();pineUpper.setMatrixAt(treeIndex,dummy.matrix);
        pineLower.setColorAt(treeIndex,new THREE.Color().setHSL(0.34+seedRandom()*0.06,0.40,0.19+seedRandom()*0.10));
        pineUpper.setColorAt(treeIndex,new THREE.Color().setHSL(0.34+seedRandom()*0.06,0.38,0.23+seedRandom()*0.10));
        broadCanopy.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0));broadLobes.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0));
      }else{
        dummy.position.set(x,raw+1.12*scale,z);dummy.rotation.set(seedRandom()*0.15,yaw,seedRandom()*0.12);dummy.scale.set(1.05*scale,0.80*scale,0.95*scale);dummy.updateMatrix();broadCanopy.setMatrixAt(treeIndex,dummy.matrix);
        dummy.position.set(x+Math.cos(yaw)*0.36*scale,raw+1.02*scale,z+Math.sin(yaw)*0.36*scale);dummy.rotation.set(0,yaw+1.1,0);dummy.scale.set(0.68*scale,0.62*scale,0.68*scale);dummy.updateMatrix();broadLobes.setMatrixAt(treeIndex,dummy.matrix);
        broadCanopy.setColorAt(treeIndex,new THREE.Color().setHSL(0.30+seedRandom()*0.07,0.38+seedRandom()*0.16,0.22+seedRandom()*0.09));
        broadLobes.setColorAt(treeIndex,new THREE.Color().setHSL(0.30+seedRandom()*0.08,0.40+seedRandom()*0.18,0.28+seedRandom()*0.10));
        pineLower.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0));pineUpper.setMatrixAt(treeIndex,new THREE.Matrix4().makeScale(0,0,0));
      }
      treeIndex++;
    }
    for(const mesh of [trunks,broadCanopy,broadLobes,pineLower,pineUpper]){
      mesh.count=treeIndex;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);
    }

    // Shrubs, grass mounds and small flower patches create a lived-in valley floor.
    const shrubCount=lowMemory?180:smallScreen?240:360;
    const shrubs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22,1),new THREE.MeshStandardMaterial({color:'#7fa35d',roughness:1}),shrubCount);
    let shrubIndex=0;
    for(let attempt=0;attempt<shrubCount*26&&shrubIndex<shrubCount;attempt++){
      const x=(seedRandom()-0.5)*(MAP_W-1),z=-2+seedRandom()*9,raw=rawLandHeight(x,z);
      if(waterCoverage(x,z)>0.2||raw>3.1||raw<0.25||Math.abs(x-riverCenterX(z))<0.75||seedRandom()<0.28)continue;
      const scale=0.28+seedRandom()*0.68;
      dummy.position.set(x,raw+0.10*scale,z);dummy.rotation.set(0,seedRandom()*Math.PI,0);dummy.scale.set(scale,scale*0.55,scale);dummy.updateMatrix();
      shrubs.setMatrixAt(shrubIndex,dummy.matrix);shrubs.setColorAt(shrubIndex,new THREE.Color().setHSL(0.25+seedRandom()*0.14,0.30+seedRandom()*0.22,0.29+seedRandom()*0.16));shrubIndex++;
    }
    shrubs.count=shrubIndex;shrubs.instanceMatrix.needsUpdate=true;if(shrubs.instanceColor)shrubs.instanceColor.needsUpdate=true;shrubs.castShadow=true;world.add(shrubs);

    // Rock outcrops are placed in coherent cliff/slope groups instead of random stones everywhere.
    const rockCapacity=lowMemory?55:92;
    const rockGeometry=new THREE.DodecahedronGeometry(0.34,1);
    const rockMaterial=new THREE.MeshStandardMaterial({color:'#91745a',map:rockTexture,roughness:0.98,flatShading:true});
    const rockOutcrops=new THREE.InstancedMesh(rockGeometry,rockMaterial,rockCapacity);
    const outcropZones=[[-11,-7,2.2,3.0],[-7,-11,2.4,2.4],[0,-8,3.0,3.0],[7,-9,2.4,3.5],[11,5,1.6,2.0]];
    let rockIndex=0;
    for(let attempt=0;attempt<rockCapacity*30&&rockIndex<rockCapacity;attempt++){
      const zone=outcropZones[Math.floor(seedRandom()*outcropZones.length)];
      const x=zone[0]+(seedRandom()-0.5)*zone[2]*2,z=zone[1]+(seedRandom()-0.5)*zone[3]*2,raw=rawLandHeight(x,z);
      if(raw<3.0||waterCoverage(x,z)>0.1||seedRandom()<0.40)continue;
      const scale=0.25+seedRandom()*0.55;
      dummy.position.set(x,raw+0.10*scale,z);dummy.rotation.set(seedRandom()*0.45,seedRandom()*Math.PI,seedRandom()*0.45);dummy.scale.set(scale*1.15,scale*0.72,scale);dummy.updateMatrix();
      rockOutcrops.setMatrixAt(rockIndex,dummy.matrix);rockOutcrops.setColorAt(rockIndex,new THREE.Color().setHSL(0.075+seedRandom()*0.06,0.16+seedRandom()*0.12,0.34+seedRandom()*0.17));rockIndex++;
    }
    rockOutcrops.count=rockIndex;rockOutcrops.instanceMatrix.needsUpdate=true;if(rockOutcrops.instanceColor)rockOutcrops.instanceColor.needsUpdate=true;rockOutcrops.castShadow=true;world.add(rockOutcrops);

    // Volumetric cloud families live high in the sky, spatially independent of terrain.
    const cloudMaterial=new THREE.MeshPhysicalMaterial({color:'#f8fbf5',roughness:0.96,metalness:0,clearcoat:0.05,sheen:0.32,transparent:true,opacity:0.94});
    const cloudGeometry=new THREE.SphereGeometry(1,24,16);
    const cloudFamilies=[];
    function addCloud(x,y,z,scale,drift,phase){
      const group=new THREE.Group();group.position.set(x,y,z);group.userData.drift=drift;group.userData.phase=phase;group.userData.baseScale=scale;group.userData.baseX=x;group.userData.baseZ=z;
      const puffs=[
        [0,0,0,1.28,0.58,0.84],[-0.93,-0.02,0.03,0.88,0.58,0.72],[0.92,-0.03,-0.02,0.94,0.60,0.78],
        [-0.55,0.40,0,0.78,0.65,0.72],[0.38,0.45,-0.04,0.84,0.72,0.76],[0.02,0.58,0.06,0.78,0.72,0.76],
        [-1.28,0.14,-0.03,0.55,0.46,0.52],[1.26,0.16,0.08,0.56,0.48,0.54],
        [-0.18,-0.18,0.52,0.76,0.46,0.58],[0.58,-0.18,-0.42,0.70,0.46,0.58]
      ];
      for(let i=0;i<puffs.length;i++){
        const p=puffs[i],mesh=new THREE.Mesh(cloudGeometry,cloudMaterial);
        mesh.position.set(p[0]*scale,p[1]*scale,p[2]*scale);mesh.scale.set(p[3]*scale,p[4]*scale,p[5]*scale);mesh.castShadow=i<6;group.add(mesh);
      }
      world.add(group);cloudFamilies.push(group);
    }
    addCloud(-9.0,17.0,-8.0,1.65,0.070,0.2);
    addCloud(-4.0,20.0,-12.0,2.05,-0.055,1.1);
    addCloud(2.0,18.2,-9.0,1.82,0.060,2.0);
    addCloud(8.0,16.6,-6.0,1.55,-0.050,2.8);
    addCloud(-7.0,15.1,1.0,1.24,0.045,3.4);
    addCloud(5.0,16.0,2.6,1.32,-0.038,4.2);

    // Mountain mist is a soft horizontal atmospheric veil, not a cloud support.
    const mistMaterial=new THREE.MeshBasicMaterial({color:'#e5f1e9',transparent:true,opacity:0.12,depthWrite:false,side:THREE.DoubleSide});
    const mistBands=[];
    for(let i=0;i<3;i++){
      const mist=new THREE.Mesh(new THREE.PlaneGeometry(24,1.6+i*0.35),mistMaterial);
      mist.position.set((i-1)*1.8,4.4+i*0.45,-8.8+i*0.55);mist.rotation.x=-0.11;world.add(mist);mistBands.push(mist);
    }

    // Weather particles: rain streaks and slow snow particles are separate systems.
    const particleCount=lowMemory?100:smallScreen?145:220;
    const particlePositions=new Float32Array(particleCount*3),particleSpeeds=new Float32Array(particleCount);
    for(let i=0;i<particleCount;i++){particlePositions[i*3]=(seedRandom()-0.5)*24;particlePositions[i*3+1]=seedRandom()*18;particlePositions[i*3+2]=-10+seedRandom()*25;particleSpeeds[i]=0.07+seedRandom()*0.11;}
    const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
    const particleMaterial=new THREE.PointsMaterial({color:'#edf8f4',size:0.065,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});
    const particles=new THREE.Points(particleGeometry,particleMaterial);world.add(particles);
    const rainCount=lowMemory?75:smallScreen?110:170;
    const rainPositions=new Float32Array(rainCount*6),rainVelocity=new Float32Array(rainCount);
    for(let i=0;i<rainCount;i++){const x=(seedRandom()-0.5)*24,y=7+seedRandom()*13,z=-12+seedRandom()*25;rainPositions.set([x,y,z,x+0.04,y-0.30,z+0.01],i*6);rainVelocity[i]=1.0+seedRandom()*1.7;}
    const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
    const rainMaterial=new THREE.LineBasicMaterial({color:'#c8edf6',transparent:true,opacity:0,depthWrite:false});
    const rainStreaks=new THREE.LineSegments(rainGeometry,rainMaterial);world.add(rainStreaks);
    const stormFlash=new THREE.PointLight('#dceeff',0,52,2);stormFlash.position.set(-3,18,-7);world.add(stormFlash);

    // Small sun/moon orb marks the selected local hour; actual lighting comes from the directional light.
    const celestialMaterial=new THREE.MeshBasicMaterial({color:'#fff0c7',transparent:true,opacity:0.92,depthWrite:false});
    const celestialHaloMaterial=new THREE.MeshBasicMaterial({color:'#ffe5ad',transparent:true,opacity:0.16,depthWrite:false});
    const celestial=new THREE.Mesh(new THREE.SphereGeometry(0.52,24,16),celestialMaterial);
    const celestialHalo=new THREE.Mesh(new THREE.SphereGeometry(1.15,24,16),celestialHaloMaterial);
    celestial.position.set(9,18,-14);celestialHalo.position.copy(celestial.position);world.add(celestialHalo,celestial);

    // Water animation points follow the actual curved river path.
    const foamGeometry=new THREE.SphereGeometry(1,8,6);
    const foamMaterial=new THREE.MeshBasicMaterial({color:'#e8ffff',transparent:true,opacity:0.60,depthWrite:false});
    const riverFoam=[];
    for(let i=0;i<18;i++){const foam=new THREE.Mesh(foamGeometry,foamMaterial);foam.scale.set(0.06,0.014,0.12);world.add(foam);riverFoam.push(foam);}
    const wavePhase=[0,1.9,3.7];

    const weatherLooks={
      neutral:{sky:'#76a1b2',fog:'#b4c9c6',density:0.008,cloud:0.46,cloudColor:'#f2f7f2',light:1.55,particles:0},
      clear:{sky:'#75b7d2',fog:'#c1d8d0',density:0.0055,cloud:0.18,cloudColor:'#fffdf5',light:2.75,particles:0},
      cloudy:{sky:'#7897a5',fog:'#b2c4c0',density:0.010,cloud:0.78,cloudColor:'#d9e2e2',light:1.75,particles:0},
      rain:{sky:'#506d7e',fog:'#81999e',density:0.017,cloud:0.96,cloudColor:'#aabac0',light:1.10,particles:0.66},
      storm:{sky:'#243d56',fog:'#637a87',density:0.022,cloud:1,cloudColor:'#657e8b',light:0.78,particles:0.84},
      snow:{sky:'#8aaab6',fog:'#c9d9dc',density:0.013,cloud:0.96,cloudColor:'#f1f7fa',light:1.55,particles:0.80},
      fog:{sky:'#9db7b7',fog:'#d1d9d0',density:0.032,cloud:0.66,cloudColor:'#e6ede7',light:1.12,particles:0.08},
      hot:{sky:'#d8b58d',fog:'#dfc8a7',density:0.006,cloud:0.10,cloudColor:'#fff0d8',light:2.95,particles:0}
    };
    const phaseLooks={
      dawn:{sky:'#d79c86',horizon:'#f1c3a6',sun:'#ffbf93',ambient:'#f4cdb4',ground:'#69554c'},
      day:{sky:'#75b7d2',horizon:'#c8e3dc',sun:'#fff0d4',ambient:'#dff1ec',ground:'#314d42'},
      evening:{sky:'#8b7890',horizon:'#e3a181',sun:'#ff9c70',ambient:'#d2a08f',ground:'#514448'},
      night:{sky:'#10253e',horizon:'#344e66',sun:'#a8c4e5',ambient:'#58718e',ground:'#1a2e3b'}
    };

    let activeWeather='neutral',activePhase='day',activeWind=0,windDirection=270;
    let targetLook=weatherLooks.neutral;
    let targetSky=new THREE.Color(targetLook.sky),targetFog=new THREE.Color('#b4c9c6'),targetCloudColor=new THREE.Color('#f2f7f2');
    let targetSunColor=new THREE.Color('#fff0d4'),targetAmbient=new THREE.Color('#dff1ec'),targetGround=new THREE.Color('#314d42');
    let targetSunPosition=new THREE.Vector3(-12,20,10);
    let targetHumidity=0.5,targetRain=0,targetRiverFlow=0.7;
    let targetCloudCoverage=46;
    let animationFrame=0,elapsed=0,disposed=false,lastFrame=0;
    const clock=new THREE.Clock();

    function setState(next={}){
      const kind=weatherLooks[next.weather]?next.weather:'neutral';
      const phase=phaseLooks[next.phase]?next.phase:'day';
      activeWeather=kind;activePhase=phase;
      activeWind=Math.max(0,Number(next.wind)||0);
      windDirection=Number.isFinite(Number(next.windDirection))?Number(next.windDirection):270;
      const look={...weatherLooks[kind]};
      const cloudCover=Number.isFinite(Number(next.cloudCover))?clamp(Number(next.cloudCover),0,100):({clear:18,cloudy:78,rain:94,storm:100,snow:91,fog:80,hot:12,neutral:46}[kind]??46);
      const effectiveCloudCover=Math.max(cloudCover,kind==='storm'?98:kind==='rain'?88:kind==='snow'?88:kind==='fog'?54:0);
      const precipitation=Math.max(0,Number(next.precipitation)||0);
      const humidity=Number.isFinite(Number(next.humidity))?clamp(Number(next.humidity),0,100)/100:0.5;
      const localHour=Number.isFinite(Number(next.localHour))?clamp(Number(next.localHour),0,23):12;
      targetHumidity=humidity;
      targetRain=(kind==='rain'||kind==='storm')?clamp(precipitation/3.5,0,1):0;
      targetRiverFlow=0.58+Math.min(1.45,precipitation*0.30+targetRain*0.18);
      targetCloudCoverage=effectiveCloudCover;
      look.cloud=0.12+effectiveCloudCover/100*0.88;
      if(kind==='clear')look.cloud=Math.min(0.48,look.cloud);
      if(kind==='rain'||kind==='storm'||kind==='snow')look.cloud=Math.max(0.92,look.cloud);
      if(phase==='night'){look.light*=0.28;look.cloud=Math.max(0.24,look.cloud*0.88);}
      else if(phase==='dawn'||phase==='evening')look.light*=0.78;
      if(kind==='hot')look.light*=1.07;
      targetLook=look;
      targetSky.set(kind==='clear'||kind==='hot'?phaseLooks[phase].sky:look.sky);
      targetFog.set(phase==='night'&&kind==='clear'?phaseLooks.night.horizon:look.fog);
      targetCloudColor.set(look.cloudColor);
      targetSunColor.set(phaseLooks[phase].sun);
      targetAmbient.set(phaseLooks[phase].ambient);
      targetGround.set(phaseLooks[phase].ground);
      const sunArc=(localHour-12)/12*Math.PI;
      targetSunPosition.set(-Math.sin(sunArc)*16,5+Math.max(0,Math.cos(sunArc))*18,-8);
      const daylight=phase!=='night';
      celestialMaterial.color.set(daylight?'#fff0c7':'#d8e8ff');
      celestialHaloMaterial.color.set(daylight?'#ffe5ad':'#98c5ec');
      celestialMaterial.opacity=daylight?(kind==='storm'?0.20:kind==='rain'?0.42:0.95):0.78;
      celestialHaloMaterial.opacity=daylight?0.14:0.09;
      celestial.position.set(-Math.sin(sunArc)*13,11+Math.max(0,Math.cos(sunArc))*7,-14);
      celestialHalo.position.copy(celestial.position);
      cloudFamilies.forEach((cloud,index)=>{
        const threshold=0.06+index*0.11;
        const visibility=clamp((effectiveCloudCover/100-threshold)/0.28,0,1);
        cloud.visible=visibility>0.008;
        cloud.userData.targetVisibility=visibility;
        cloud.userData.targetScale=(0.78+effectiveCloudCover/100*0.48)*(0.94+index*0.025);
      });
      particleMaterial.color.set(kind==='snow'?'#f5fbff':'#e4f4f6');
      particleMaterial.size=kind==='snow'?0.08:0.055;
      particleMaterial.opacity=look.particles;
      rainMaterial.opacity=(kind==='rain'||kind==='storm')?targetRain*0.76:0;
      waterfallMaterial.opacity=0.68+Math.min(0.22,precipitation*0.035);
      waterfallMist.material.opacity=0.12+Math.min(0.22,precipitation*0.035)+humidity*0.08;
      seaMaterial.roughness=clamp(0.29-activeWind*0.002+(kind==='storm'?0.18:0),0.12,0.58);
      riverMaterial.roughness=clamp(0.16-activeWind*0.0014,0.08,0.28);
      mistMaterial.opacity=0.035+humidity*0.095+(kind==='fog'?0.16:0);
      if(kind==='storm')nextLightningAt=Math.min(nextLightningAt,elapsed+3+seedRandom()*5);
      if(reducedMotion){
        scene.background.copy(targetSky);scene.fog=new THREE.FogExp2(targetFog,look.density);
        sun.intensity=look.light;sun.color.copy(targetSunColor);hemisphere.color.copy(targetAmbient);hemisphere.groundColor.copy(targetGround);
        cloudMaterial.color.copy(targetCloudColor);cloudFamilies.forEach(cloud=>cloud.scale.setScalar((cloud.userData.targetScale||1)*(cloud.userData.targetVisibility??1)));
        renderer.render(scene,camera);
      }
    }
    let nextLightningAt=12+seedRandom()*10,lightningPulse=0;

    function resize(){
      if(disposed)return;
      const rect=host.getBoundingClientRect();
      const width=Math.max(1,Math.round(rect.width||host.clientWidth||innerWidth));
      const height=Math.max(1,Math.round(rect.height||host.clientHeight||innerHeight));
      const profile=weatherViewportProfile(width,height);
      const {aspect,portrait,shortLandscape,tablet,targetY,targetZ,cameraRise,cameraDepth,yaw,fov}=profile;
      camera.fov=fov;camera.aspect=aspect;camera.updateProjectionMatrix();
      const target=new THREE.Vector3(0,targetY,targetZ);
      camera.position.set(target.x+Math.sin(yaw)*cameraDepth,target.y+cameraRise,target.z+Math.cos(yaw)*cameraDepth);
      camera.lookAt(target);
      const dprCap=lowMemory?1.1:smallScreen?1.25:1.5;
      const pixelBudget=Math.sqrt(2300000/Math.max(1,width*height));
      renderer.setPixelRatio(Math.max(0.8,Math.min(window.devicePixelRatio||1,dprCap,pixelBudget)));
      renderer.setSize(width,height,false);
      if(reducedMotion)renderer.render(scene,camera);
    }

    function onVisibility(){
      if(document.hidden){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;}
      else if(!reducedMotion&&!animationFrame&&!disposed){clock.start();lastFrame=0;animationFrame=requestAnimationFrame(render);}
    }
    const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
    resizeObserver?.observe(host);
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('orientationchange',resize,{passive:true});
    window.visualViewport?.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',onVisibility);

    function render(now=0){
      if(disposed||document.hidden||!host.isConnected)return;
      if(!reducedMotion)animationFrame=requestAnimationFrame(render);
      const delta=Math.min(clock.getDelta(),0.045);elapsed+=delta;
      const morph=1-Math.exp(-delta*1.35);
      if(scene.background?.isColor)scene.background.lerp(targetSky,morph);else scene.background=new THREE.Color(targetSky);
      if(!scene.fog?.isFogExp2)scene.fog=new THREE.FogExp2(targetFog,targetLook.density);
      scene.fog.color.lerp(targetFog,morph);scene.fog.density=lerp(scene.fog.density,targetLook.density+targetHumidity*0.003,morph);
      sun.intensity=lerp(sun.intensity,targetLook.light,morph);sun.color.lerp(targetSunColor,morph);sun.position.lerp(targetSunPosition,morph);
      hemisphere.color.lerp(targetAmbient,morph);hemisphere.groundColor.lerp(targetGround,morph);
      skyMaterial.color.lerp(targetSky,morph);cloudMaterial.color.lerp(targetCloudColor,morph);
      cloudMaterial.opacity=lerp(cloudMaterial.opacity,targetLook.cloud,morph);
      cloudFamilies.forEach((cloud,index)=>{
        const visibility=cloud.userData.targetVisibility??1;
        const targetScale=(cloud.userData.targetScale||1)*visibility;
        cloud.scale.setScalar(lerp(cloud.scale.x,targetScale,morph));
        cloud.position.y=cloud.userData.baseY+Math.sin(elapsed*0.20+index*1.4)*0.07;
      });
      if(now-lastFrame<1000/30)return;
      lastFrame=now;
      // Meteorological wind direction is the direction wind comes from; clouds move downwind.
      const windRadians=(windDirection+180)*Math.PI/180;
      const windX=Math.cos(windRadians),windZ=Math.sin(windRadians);
      cloudFamilies.forEach((cloud,index)=>{
        const drift=cloud.userData.drift*(1+Math.min(1.7,activeWind/38));
        cloud.position.x+=windX*drift*delta;
        cloud.position.z+=windZ*drift*delta*0.16;
        if(cloud.position.x>16)cloud.position.x=-16;
        if(cloud.position.x<-16)cloud.position.x=16;
      });
      if(activeWeather==='rain'||activeWeather==='storm'||activeWeather==='snow'){
        const pos=particleGeometry.attributes.position;
        for(let i=0;i<particleCount;i++){
          pos.array[i*3+1]-=particleSpeeds[i]*(activeWeather==='snow'?0.62:2.1);
          pos.array[i*3]+=activeWeather==='snow'?-0.009:0.014;
          if(pos.array[i*3+1]<0.05){pos.array[i*3+1]=13+seedRandom()*8;pos.array[i*3]=(seedRandom()-0.5)*24;}
        }
        pos.needsUpdate=true;
      }
      const rainAttr=rainGeometry.attributes.position;
      if(activeWeather==='rain'||activeWeather==='storm'){
        for(let i=0;i<rainCount;i++){
          const o=i*6;rainPositions[o+1]-=rainVelocity[i]*delta*(1+targetRain*2);rainPositions[o+4]=rainPositions[o+1]-0.31;
          if(rainPositions[o+1]<0.15){const x=(seedRandom()-0.5)*24,y=10+seedRandom()*10,z=-12+seedRandom()*25;rainPositions.set([x,y,z,x+0.04,y-0.31,z+0.01],o);}
        }
        rainAttr.needsUpdate=true;
      }
      riverFoam.forEach((foam,index)=>{
        const t=(elapsed*0.055*targetRiverFlow+index/riverFoam.length)%1,p=riverCurve.getPoint(t);
        foam.position.set(p.x,p.y+0.045,p.z);foam.rotation.y=Math.atan2(riverCurve.getTangent(t).x,riverCurve.getTangent(t).z);
        foam.visible=activeWeather!=='snow'&&activeWeather!=='fog';
      });
      waterTexture.offset.x=(waterTexture.offset.x+delta*(0.010+activeWind*0.00028))%1;
      waterTexture.offset.y=(waterTexture.offset.y-delta*(0.025+targetRiverFlow*0.018))%1;
      riverMaterial.opacity=0.88+0.08*(0.5+0.5*Math.sin(elapsed*1.5*targetRiverFlow));
      waterfall.position.y=waterfallBaseY+Math.sin(elapsed*1.8)*0.02;
      waterfall.scale.x=1+targetRain*0.15;
      waterfallMist.material.opacity=lerp(waterfallMist.material.opacity,0.10+targetHumidity*0.12+targetRain*0.16,0.05);
      waveLines.forEach((line,index)=>{line.material.opacity=0.12+0.08*(0.5+0.5*Math.sin(elapsed*0.65+wavePhase[index]))+Math.min(0.08,activeWind*0.001);});
      if(activeWeather==='storm'&&elapsed>=nextLightningAt){lightningPulse=0.17;nextLightningAt=elapsed+6+seedRandom()*14;}
      if(lightningPulse>0){stormFlash.intensity=18*(lightningPulse/0.17);lightningPulse=Math.max(0,lightningPulse-delta);}else stormFlash.intensity=0;
      renderer.render(scene,camera);
    }

    // Save cloud altitude before the animation loop begins.
    cloudFamilies.forEach(cloud=>{cloud.userData.baseY=cloud.position.y;});
    resize();
    setState({weather:'neutral',phase:'day',cloudCover:46,humidity:52,precipitation:0,localHour:12});
    if(reducedMotion)renderer.render(scene,camera);else animationFrame=requestAnimationFrame(render);

    function dispose(){
      if(disposed)return;disposed=true;
      if(animationFrame)cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);
      window.visualViewport?.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);
      const geometries=new Set(),materials=new Set();
      scene.traverse(object=>{
        if(object.geometry)geometries.add(object.geometry);
        if(object.material){if(Array.isArray(object.material))object.material.forEach(material=>materials.add(material));else materials.add(object.material);}
      });
      geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
      renderer.dispose();renderer.forceContextLoss?.();canvas.remove();
    }
    return {setState,dispose};
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
