/* LIVE // EARTH — Weather: live Japanese ink drawing, 2D.
   Design: expressive English editorial typography + quiet washi-paper ground +
   a weather-generated Japanese landscape. No photographic wallpaper, no 3D,
   no runtime image generation and no automatic geolocation request. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, el, isActive, globe } = runtime;
  const STYLE_ID = 'le-weather-live-ink-style';
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';
  const REFRESH_MS = 15 * 60 * 1000;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#f1eee5!important;isolation:isolate;pointer-events:none}
      .le-sfv--weather>.le-sfv-panel{display:none!important}
      .le-weather-screen{box-sizing:border-box;--paper:#f1eee5;--paper-deep:#e8e3d7;--ink:#202923;--muted:#68736c;--accent:#b84437;position:absolute;inset:0;z-index:1;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;color:var(--ink);background:radial-gradient(ellipse at 76% 45%,rgba(202,211,194,.30),transparent 42%),linear-gradient(160deg,var(--paper),var(--paper-deep));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;isolation:isolate}
      .le-weather-screen::-webkit-scrollbar{display:none}
      .le-weather-screen:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.23;background-image:repeating-linear-gradient(7deg,transparent 0 11px,rgba(78,68,51,.035) 12px,transparent 13px),repeating-linear-gradient(93deg,transparent 0 17px,rgba(78,68,51,.025) 18px,transparent 19px);mix-blend-mode:multiply}
      .le-weather-screen[data-phase="night"]{--paper:#202a2a;--paper-deep:#152223;--ink:#f0eee5;--muted:#bdc8bf;--accent:#d36b55;background:radial-gradient(ellipse at 77% 47%,rgba(74,103,98,.28),transparent 45%),linear-gradient(160deg,var(--paper),var(--paper-deep))}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"],.le-weather-screen[data-weather="fog"]{--paper:#e8e9df;--paper-deep:#d7dfd7}
      .le-weather-screen[data-phase="night"][data-weather="rain"],.le-weather-screen[data-phase="night"][data-weather="storm"],.le-weather-screen[data-phase="night"][data-weather="fog"]{--paper:#1b272b;--paper-deep:#101c21}
      .le-weather-content{box-sizing:border-box;position:relative;z-index:2;width:min(100%,760px);margin:0 auto;padding:calc(env(safe-area-inset-top) + 17px) clamp(20px,5vw,34px) calc(env(safe-area-inset-bottom) + 264px)}
      .le-weather-topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:31px}
      .le-weather-brand{font-size:11px;font-weight:800;letter-spacing:.2em;white-space:nowrap}.le-weather-brand span{font-weight:400;opacity:.65}
      .le-weather-place{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:10px;letter-spacing:.04em;white-space:nowrap}
      .le-weather-place svg{width:12px;height:15px;flex:0 0 auto}
      .le-weather-date-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:31px}
      .le-weather-date{color:var(--muted);font-size:8px;font-weight:750;letter-spacing:.22em;text-transform:uppercase}
      .le-weather-mode{display:flex;align-items:center;gap:5px;min-height:27px;padding:3px 8px;border:1px solid rgba(52,65,56,.22);border-radius:999px;background:rgba(255,255,255,.43);color:var(--muted);font-size:7px;font-weight:800;letter-spacing:.10em;white-space:nowrap}
      .le-weather-mode select{max-width:105px;border:0;outline:0;background:transparent;color:var(--ink);font:750 8px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.035em;appearance:none;-webkit-appearance:none;padding:4px 13px 4px 2px;background-image:linear-gradient(45deg,transparent 50%,var(--ink) 50%),linear-gradient(135deg,var(--ink) 50%,transparent 50%);background-position:calc(100% - 5px) 50%,calc(100% - 1px) 50%;background-size:4px 4px;background-repeat:no-repeat}
      .le-weather-mode option{background:var(--paper);color:var(--ink)}
      .le-weather-screen[data-preview="true"] .le-weather-mode{border-color:rgba(184,68,55,.42);color:var(--accent)}
      .le-weather-hero{position:relative;z-index:2;max-width:520px;margin-top:15px}
      .le-weather-headline{max-width:510px;margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(43px,11vw,70px);font-weight:400;line-height:.91;letter-spacing:-.055em;text-wrap:balance;color:var(--ink)}
      .le-weather-headline em{font-style:italic;font-weight:400;color:var(--ink)}
      .le-weather-headline:after{content:"";display:block;width:34px;height:2px;margin:15px 0 13px;background:var(--accent)}
      .le-weather-temperature-row{display:flex;align-items:center;gap:14px}
      .le-weather-temperature{font-family:Georgia,"Times New Roman",serif;font-size:clamp(78px,21vw,116px);font-weight:400;letter-spacing:-.095em;line-height:.82;white-space:nowrap;color:var(--ink)}
      .le-weather-temperature sup{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.27em;vertical-align:top;letter-spacing:0;margin-left:5px}
      .le-weather-condition{min-width:0;padding:3px 0 4px 14px;border-left:1px solid color-mix(in srgb,var(--ink) 38%,transparent)}
      .le-weather-condition-icon{display:block;width:34px;height:31px;margin-bottom:4px;color:var(--ink)}
      .le-weather-condition-name{font-family:Georgia,"Times New Roman",serif;font-size:16px;line-height:1.15}
      .le-weather-feels{margin-top:4px;color:var(--muted);font-size:10px}
      .le-weather-dashboard{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"hero" "scene" "summary" "studio" "hours";row-gap:12px;align-items:start;margin-top:14px}
      .le-weather-forecast-column,.le-weather-art-column{display:contents}
      .le-weather-hero{grid-area:hero;position:relative;z-index:2;max-width:520px;margin:0}
      .le-weather-art-stage{grid-area:scene;position:relative;z-index:1;height:clamp(190px,30vh,260px);margin:0 -10px;pointer-events:none;overflow:hidden}
      .le-weather-art-canvas{display:block;width:100%;height:100%;touch-action:none}
      .le-weather-summary{grid-area:summary;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:0;padding:12px 0;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
      .le-weather-stat{min-width:0;padding:0 10px;border-right:1px solid color-mix(in srgb,var(--ink) 17%,transparent)}.le-weather-stat:first-child{padding-left:2px}.le-weather-stat:last-child{border-right:0}
      .le-weather-stat-label{display:block;color:var(--muted);font-size:7px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
      .le-weather-stat-value{display:block;margin-top:6px;color:var(--ink);font-size:clamp(12px,3.5vw,15px);font-weight:730;white-space:nowrap}
      .le-weather-hourly-section{grid-area:hours;position:relative;z-index:2;margin:5px 0 0}
      .le-weather-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 1px 10px}
      .le-weather-section-title{margin:0;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:.2em}
      .le-weather-section-note{color:var(--muted);font-size:8px;letter-spacing:.09em}
      .le-weather-hourly{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:4px;overflow-x:auto;padding:8px 0 7px;scrollbar-width:none;overscroll-behavior-x:contain}
      .le-weather-hourly::-webkit-scrollbar{display:none}
      .le-weather-hour{display:grid;justify-items:center;align-content:start;gap:7px;min-width:0;padding:10px 2px 7px;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);text-align:center;color:var(--ink)}
      .le-weather-hour-time{font-size:9px;color:var(--muted);white-space:nowrap}.le-weather-hour-icon{width:25px;height:25px;color:var(--ink)}.le-weather-hour-temp{font-family:Georgia,"Times New Roman",serif;font-size:clamp(24px,5.8vw,34px);font-weight:400;letter-spacing:-.045em;white-space:nowrap;line-height:1}.le-weather-hour-rain{font-size:8px;color:#668b8a;white-space:nowrap}
      .le-weather-curve{display:block;width:100%;height:32px;margin-top:0;overflow:visible}.le-weather-curve path{fill:none;stroke:var(--ink);stroke-width:1.3;opacity:.72;vector-effect:non-scaling-stroke}.le-weather-curve circle{fill:var(--accent);stroke:var(--paper);stroke-width:1.1;vector-effect:non-scaling-stroke}
      .le-weather-studio{grid-area:studio;position:relative;min-width:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);border-radius:17px;background:linear-gradient(145deg,rgba(255,255,255,.40),rgba(214,218,204,.20));box-shadow:0 8px 26px rgba(41,48,40,.06),inset 0 1px rgba(255,255,255,.68);padding:13px 13px 10px}
      .le-weather-studio-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px}
      .le-weather-studio-kicker{display:block;color:var(--muted);font-size:7px;font-weight:850;letter-spacing:.20em;text-transform:uppercase}
      .le-weather-studio-title{margin:4px 0 0;font-family:Georgia,"Times New Roman",serif;font-size:20px;font-weight:400;line-height:1.05;letter-spacing:-.025em;color:var(--ink)}
      .le-weather-studio-state{flex:0 0 auto;color:var(--accent);font-size:7px;font-weight:850;letter-spacing:.13em;text-align:right;white-space:nowrap;padding-top:2px}
      .le-weather-studio-canvas{display:block;width:100%;height:clamp(180px,28vh,245px);border-radius:10px;background:radial-gradient(ellipse at 50% 46%,rgba(255,255,255,.48),rgba(231,229,215,.12) 72%);touch-action:none}
      .le-weather-studio-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;color:var(--muted);font-size:8px;letter-spacing:.03em}
      .le-weather-art-replay{appearance:none;border:1px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.34);color:var(--ink);font:750 7px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;cursor:pointer}
      .le-weather-art-replay:active{transform:scale(.97)}
      .le-weather-status{min-height:15px;margin:12px 1px 0;color:var(--muted);font-size:8px;line-height:1.45}.le-weather-status:empty{display:none}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"]{--accent:#4e8285}.le-weather-screen[data-weather="snow"]{--accent:#718c9e}.le-weather-screen[data-weather="hot"]{--accent:#bd6945}
      .le-weather-attribution{margin:13px 1px 0;color:var(--muted);font-size:7px;line-height:1.4;opacity:.78}
      @media(min-width:600px) and (orientation:portrait){.le-weather-content{width:min(100%,760px);padding-left:clamp(32px,7vw,60px);padding-right:clamp(32px,7vw,60px)}.le-weather-headline{font-size:clamp(64px,9vw,88px)}.le-weather-temperature{font-size:126px}.le-weather-art-stage{height:clamp(240px,34vh,320px)}.le-weather-studio-canvas{height:clamp(210px,30vh,280px)}}
      @media(orientation:landscape) and (min-width:650px){
        .le-weather-screen{overflow-y:auto}
        .le-weather-content{width:min(100%,1380px);min-height:100%;padding:calc(env(safe-area-inset-top) + 12px) clamp(24px,4vw,56px) calc(env(safe-area-inset-bottom) + 160px)}
        .le-weather-dashboard{grid-template-columns:minmax(280px,.88fr) minmax(380px,1.12fr);grid-template-areas:"hero scene" "summary studio" "hours studio";column-gap:clamp(24px,4vw,54px);row-gap:12px;margin-top:16px}
        .le-weather-headline{font-size:clamp(46px,5vw,72px)}.le-weather-temperature{font-size:clamp(82px,8vw,110px)}
        .le-weather-art-stage{height:clamp(190px,32vh,270px);margin:0;align-self:stretch}
        .le-weather-summary{align-self:start;padding:13px 0}.le-weather-hourly-section{margin:0;align-self:start}
        .le-weather-hourly{grid-auto-columns:minmax(0,1fr);overflow:visible;gap:3px}.le-weather-hour{gap:7px;padding:10px 1px 5px}.le-weather-hour-temp{font-size:clamp(23px,2.8vw,31px)}.le-weather-hour-time{font-size:9px}.le-weather-hour-icon{width:23px;height:23px}
        .le-weather-studio{align-self:stretch;padding:15px 16px 12px}.le-weather-studio-canvas{height:clamp(190px,26vh,218px)}.le-weather-studio-title{font-size:23px}
      }
      @media(max-width:430px){.le-weather-content{padding-left:17px;padding-right:17px;padding-bottom:calc(env(safe-area-inset-bottom) + 278px)}.le-weather-date-row{margin-top:24px;align-items:flex-start}.le-weather-headline{font-size:clamp(42px,11.5vw,52px)}.le-weather-temperature{font-size:clamp(74px,20vw,86px)}.le-weather-art-stage{height:clamp(158px,21vh,180px);margin-left:-9px;margin-right:-9px}.le-weather-summary{padding:10px 0}.le-weather-stat{padding:0 6px}.le-weather-stat-label{font-size:6px;letter-spacing:.08em}.le-weather-stat-value{font-size:11px}.le-weather-hourly-section{margin-top:2px}.le-weather-hourly{gap:1px;padding:6px 0}.le-weather-hour{gap:6px;padding:8px 1px 5px}.le-weather-hour-time{font-size:8px}.le-weather-hour-icon{width:21px;height:21px}.le-weather-hour-temp{font-size:clamp(21px,6vw,25px)}.le-weather-hour-rain{font-size:7px}.le-weather-curve{height:28px}.le-weather-studio{padding:11px 10px 9px;border-radius:14px}.le-weather-studio-title{font-size:18px}.le-weather-studio-canvas{height:clamp(138px,18vh,155px)}}
      @media(orientation:landscape) and (max-height:520px){.le-weather-content{padding-top:calc(env(safe-area-inset-top) + 8px);padding-bottom:calc(env(safe-area-inset-bottom) + 150px)}.le-weather-date-row{margin-top:5px}.le-weather-dashboard{margin-top:7px;column-gap:22px;row-gap:7px}.le-weather-headline{font-size:clamp(36px,4.6vw,48px)}.le-weather-headline:after{margin:10px 0 10px}.le-weather-temperature{font-size:clamp(66px,7vw,80px)}.le-weather-art-stage{height:clamp(130px,31vh,175px)}.le-weather-studio{padding:9px 11px}.le-weather-studio-canvas{height:clamp(118px,21vh,150px)}.le-weather-studio-title{font-size:18px}.le-weather-hourly{padding:4px 0}.le-weather-hour{gap:4px;padding:6px 1px}.le-weather-hour-temp{font-size:22px}.le-weather-hourly-section{margin:0}}
      @media(prefers-reduced-motion:reduce){.le-weather-screen *,.le-weather-screen *:before,.le-weather-screen *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      @media(prefers-reduced-transparency:reduce){.le-weather-mode{background:var(--paper)}}
    `;
    document.head.appendChild(style);
  }

  const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const hourOf = value => { const match = /T(\d{2}):/.exec(String(value || '')); return match ? Number(match[1]) : new Date().getHours(); };
  const isSnow = code => [71,73,75,77,85,86].includes(Number(code));
  const isRain = code => [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(Number(code));
  const isFog = code => [45,48].includes(Number(code));
  function conditionKind(code) {
    const n = Number(code);
    if ([95,96,99].includes(n)) return 'storm';
    if (isSnow(n)) return 'snow';
    if (isRain(n)) return 'rain';
    if (isFog(n)) return 'fog';
    if ([2,3].includes(n)) return 'cloudy';
    return 'clear';
  }
  function visualState(current) {
    const hour = hourOf(current.time);
    const night = Number(current.is_day) === 0;
    const phase = night ? 'night' : hour < 7 ? 'dawn' : hour >= 17 && hour < 20 ? 'evening' : 'day';
    const code = Number(current.weather_code);
    const wind = number(current.wind_speed_10m) ?? 0;
    let weather = conditionKind(code);
    if (weather === 'clear' && wind >= 30) weather = 'wind';
    if (number(current.temperature_2m) >= 35 && weather === 'clear') weather = 'hot';
    return { weather, phase, wind, direction: number(current.wind_direction_10m) ?? 270, precipitation: number(current.precipitation) ?? 0, snowfall: number(current.snowfall) ?? 0, cloud: number(current.cloud_cover) ?? 0 };
  }
  function conditionLabel(code, kind) {
    if (kind === 'wind') return 'Windy';
    if (kind === 'hot') return 'Clear and warm';
    const n = Number(code);
    if (n === 0) return 'Clear sky';
    if (n === 1) return 'Mainly clear';
    if (n === 2) return 'Partly cloudy';
    if (n === 3) return 'Overcast';
    if ([45,48].includes(n)) return 'Fog';
    if ([51,53,55,56,57].includes(n)) return 'Drizzle';
    if ([61,63,65,66,67,80,81,82].includes(n)) return 'Rain';
    if ([71,73,75,77,85,86].includes(n)) return 'Snow';
    if ([95,96,99].includes(n)) return 'Thunderstorm';
    return 'Current conditions';
  }
  function headlineFor(kind, phase) {
    const phrases = {
      clear: phase === 'night' ? 'A quiet night' : 'A bright day',
      cloudy: 'Clouds in motion', rain: phase === 'night' ? 'Rain after dark' : 'A rainy day',
      storm: 'A storm is passing', snow: 'A softer kind of snow', fog: 'A world in mist',
      wind: 'A day in motion', hot: 'Under a warm sun'
    };
    return phrases[kind] || 'Weather, in the moment';
  }
  function compass(value) {
    const n = number(value); if (n === null) return '—';
    return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(n / 22.5) % 16];
  }
  function formatLocalTime(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ''));
    if (!match) return deviceClock();
    const [,year,month,day,hour,minute] = match;
    const date = new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
    const dayLabel = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(date);
    const h = Number(hour);
    return `${dayLabel} · ${String(h % 12 || 12).padStart(2,'0')}:${minute} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function deviceClock() {
    const now = new Date();
    return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(now);
  }
  function localWallTime(date) {
    const pad = n => String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function sampleData(kind) {
    const samples = {
      clear:[27,29,0,5,51,6,315,28,17,0,0], cloudy:[22,23,3,88,67,9,250,24,18,15,0],
      rain:[17,15,63,96,88,6,247,17,12,80,2.8], storm:[15,11,95,100,94,38,290,17,13,100,6.2],
      snow:[1,-4,73,94,91,18,30,2,-3,75,.8], fog:[8,7,45,100,99,3,160,11,6,5,0],
      wind:[21,20,0,22,48,36,290,24,16,8,0], night:[18,17,0,4,63,4,15,21,15,0,0], hot:[38,40,0,2,27,8,90,40,26,0,0]
    };
    const [temp,feels,code,cloud,humidity,wind,direction,high,low,chance,precip]=samples[kind] || samples.clear;
    const now = new Date();
    const hours = Array.from({length:6},(_,i)=>{const d=new Date(now);if(i===0)return localWallTime(d);d.setMinutes(0,0,0);d.setHours(d.getHours()+i);return localWallTime(d);});
    const temps = Array.from({length:6},(_,i)=>Math.round(temp + (i===0?0:Math.sin(i*.85)*1.6 + (kind==='hot'?-i*.3:i*.2))));
    const codes = temps.map((_,i)=>kind==='night' ? 0 : (kind==='rain' && i>3 ? 61 : code));
    const isNight = kind === 'night' || (kind === 'auto' && new Date().getHours() < 6);
    return {
      current:{time:localWallTime(new Date()),temperature_2m:temp,apparent_temperature:feels,is_day:isNight?0:(new Date().getHours()>=6&&new Date().getHours()<19?1:0),precipitation:precip,rain:precip,snowfall:kind==='snow'?precip:0,weather_code:code,cloud_cover:cloud,wind_speed_10m:wind,wind_direction_10m:direction,wind_gusts_10m:wind*1.4},
      hourly:{time:hours,temperature_2m:temps,weather_code:codes,precipitation_probability:temps.map(()=>chance)},
      daily:{temperature_2m_max:[high],temperature_2m_min:[low],precipitation_probability_max:[chance]}
    };
  }
  function svgIcon(kind) {
    const paths = {
      clear:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
      cloudy:'<path d="M6 18h11a4 4 0 0 0 .3-8A6 6 0 0 0 6 8a5 5 0 0 0 0 10Z"/>',
      rain:'<path d="M6 15h11a4 4 0 0 0 .3-8A6 6 0 0 0 6 5a5 5 0 0 0 0 10Zm1 3-1 3m7-3-1 3m7-3-1 3"/>',
      storm:'<path d="M6 14h11a4 4 0 0 0 .3-8A6 6 0 0 0 6 4a5 5 0 0 0 0 10Z M13 14l-3 5h3l-1 4 5-7h-3l1-2"/>',
      snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2m-6 16 3-2 3 2"/>',
      fog:'<path d="M3 8h18M1 12h22M4 16h16M7 20h10"/>',
      wind:'<path d="M2 8h13a3 3 0 1 0-3-3M1 12h18a3 3 0 1 1-3 3M3 17h9"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.clear}</svg>`;
  }
  function renderHourly(screen,data) {
    const container=screen.querySelector('#le-weather-hourly');
    const times=data?.hourly?.time;
    if(!container||!Array.isArray(times)||!times.length){if(container)container.textContent='Hourly forecast unavailable';return;}
    const now=String(data.current?.time||''); let start=times.findIndex(t=>t>=now); if(start<0)start=0;
    const fragment=document.createDocumentFragment(), values=[];
    for(let i=start;i<Math.min(times.length,start+6);i++){
      const temp=number(data.hourly.temperature_2m?.[i]); const code=data.hourly.weather_code?.[i]; const chance=number(data.hourly.precipitation_probability?.[i]); const kind=conditionKind(code);
      values.push(temp);
      const item=el('div','le-weather-hour');
      const tm=times[i].match(/T(\d{2}):/);const hh=tm?Number(tm[1]):0;
      item.append(el('span','le-weather-hour-time',i===start?'NOW':`${String(hh%12||12).padStart(2,'0')}${hh<12?'a':'p'}`));
      const icon=el('span','le-weather-hour-icon');icon.innerHTML=svgIcon(kind);item.append(icon);
      item.append(el('strong','le-weather-hour-temp',temp===null?'—':`${Math.round(temp)}°`));
      item.append(el('span','le-weather-hour-rain',chance===null?'':`${Math.round(chance)}% rain`));
      fragment.append(item);
    }
    container.replaceChildren(fragment);
    const valid=values.filter(v=>v!==null); const svg=screen.querySelector('#le-weather-curve');
    if(svg&&valid.length>1){const min=Math.min(...valid),max=Math.max(...valid),span=Math.max(1,max-min);const pts=valid.map((v,i)=>({x:i/(valid.length-1)*320,y:22-(v-min)/span*15}));const d=pts.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');svg.innerHTML=`<path d="${d}"/>${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2"/>`).join('')}`;}
  }
  function setText(root,id,value){const node=root.querySelector(`#${id}`);if(node)node.textContent=value==null||value===''?'—':String(value);}
  function setTemp(root,value){const node=root.querySelector('#le-weather-temperature');if(!node)return;node.replaceChildren(document.createTextNode(value==null?'—':String(Math.round(value))));if(value!=null){const sup=document.createElement('sup');sup.textContent='°';node.append(sup);}}
  function paintData(screen,data,preview=false){
    const c=data.current||{},d=data.daily||{};const state=visualState(c);
    screen.dataset.weather=state.weather;screen.dataset.phase=state.phase;screen.dataset.preview=String(preview);screen.dataset.hasdata='true';
    setText(screen,'le-weather-place-text',preview?'LOCATION PREVIEW':'YOUR LOCATION');
    setText(screen,'le-weather-date',formatLocalTime(c.time));
    setText(screen,'le-weather-headline',headlineFor(state.weather,state.phase));
    const title=screen.querySelector('#le-weather-headline');if(title){const words=headlineFor(state.weather,state.phase).split(' ');const cut=Math.max(1,Math.ceil(words.length*.58));title.replaceChildren(document.createTextNode(words.slice(0,cut).join(' ')),document.createElement('br'));const em=document.createElement('em');em.textContent=words.slice(cut).join(' ');title.append(em);}
    setTemp(screen,number(c.temperature_2m));setText(screen,'le-weather-condition',conditionLabel(c.weather_code,state.weather));
    setText(screen,'le-weather-feels',number(c.apparent_temperature)==null?'':`Feels like ${Math.round(c.apparent_temperature)}°`);
    const icon=screen.querySelector('#le-weather-condition-icon');if(icon)icon.innerHTML=svgIcon(state.weather);
    setText(screen,'le-weather-highlow',`${number(d.temperature_2m_max?.[0])==null?'—':Math.round(d.temperature_2m_max[0])+'°'} / ${number(d.temperature_2m_min?.[0])==null?'—':Math.round(d.temperature_2m_min[0])+'°'}`);
    setText(screen,'le-weather-rainchance',number(d.precipitation_probability_max?.[0])==null?'—':`${Math.round(d.precipitation_probability_max[0])}%`);
    setText(screen,'le-weather-wind',number(c.wind_speed_10m)==null?'—':`${compass(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} km/h`);
    renderHourly(screen,data);
    screen.__weatherState=state;
    screen.__weatherCurrent=c;
    setText(screen,'le-weather-status',preview?'SAMPLE DATA · Choose AUTO to return to live weather when Location is enabled.':'');
  }
  function resetToSample(screen,kind='clear',message='Location is off. Showing a clearly labelled sample scene.'){
    paintData(screen,sampleData(kind),true);setText(screen,'le-weather-status',message);
  }

  // Deterministic 2D Japanese ink drawing. The scene is redrawn locally from
  // live weather state: no wallpaper, no image download, no WebGL or AI call.
  function makePainter(canvas){
    let ctx=null;try{ctx=canvas.getContext('2d',{alpha:true});}catch(_){ctx=null;}if(!ctx)return {setState(){},stop(){}};
    let width=0,height=0,dpr=1,raf=0,last=0,elapsed=0,state={weather:'clear',phase:'day',wind:4,direction:270,precipitation:0,snowfall:0,cloud:12};
    let snowLoad=0;
    const reduced=reducedMotion();
    const resize=()=>{const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
    const palette=()=>state.phase==='night'?{ink:'#d9e0d8',soft:'#9baea6',ridge:'#536b64',water:'#627d78',accent:'#c66d5d',paper:'#dce1d5'}:{ink:'#27332d',soft:'#68796e',ridge:'#87998b',water:'#9aaea0',accent:'#b84437',paper:'#dbe0d2'};
    const line=(points,color,alpha=1,widthPx=1.3)=>{ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=widthPx;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();};
    const wash=(x,y,w,h,color,alpha)=>{ctx.save();ctx.globalAlpha=alpha;const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,color);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore();};
    function drawSky(p,t){
      const {ink,soft,accent}=p;const night=state.phase==='night';
      const sx=width*(state.phase==='evening'?.78:.76),sy=height*.18,r=Math.min(width,height)*.065;
      ctx.save();ctx.globalAlpha=state.weather==='storm'?.38:state.weather==='fog'?.34:.56;ctx.fillStyle=night?'#dfe3d6':accent;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
      if(night){ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(sx+r*.36,sy-r*.22,r*.84,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';}
      ctx.globalAlpha=.23;ctx.strokeStyle=ink;ctx.lineWidth=.7;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(sx,sy,r*(.56+i*.13),r*(.62+i*.09),-.2,0,Math.PI*2);ctx.stroke();}ctx.restore();
      const cloudCount=state.cloud>72?4:state.cloud>32?2:1;
      for(let i=0;i<cloudCount;i++){const x=width*(.48+i*.12)+Math.sin(t*.12+i)*Math.max(2,state.wind*.45);const y=height*(.22+i*.065);const s=Math.min(width,height)*(.035+i*.004);ctx.save();ctx.globalAlpha=.16+state.cloud/550;ctx.strokeStyle=soft;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,s,.95,2.7);ctx.arc(x+s*.85,y-s*.12,s*.78,Math.PI,Math.PI*1.98);ctx.arc(x+s*1.65,y,s,.45,2.4);ctx.stroke();ctx.restore();}
    }
    function drawMountains(p,t){
      const {ink,soft,ridge}=p;const y=height*.61;const peaks=[[-.06,.12],[.13,.26],[.32,.06],[.48,.22],[.67,.02],[.84,.18],[1.06,.04]];
      for(let layer=0;layer<3;layer++){
        const offset=layer*height*.075;ctx.save();ctx.beginPath();ctx.moveTo(0,y+offset);
        peaks.forEach(([x,h],i)=>{const px=x*width,py=y-h*height+offset+Math.sin(t*.08+i)*.7;ctx.quadraticCurveTo(px-width*.045,py+height*.09,px,py);});
        ctx.lineTo(width,y+offset+height*.13);ctx.lineTo(0,y+offset+height*.13);ctx.closePath();ctx.globalAlpha=.10+layer*.045;ctx.fillStyle=layer===0?soft:ridge;ctx.fill();
        ctx.globalAlpha=.22-layer*.035;ctx.strokeStyle=ink;ctx.lineWidth=1.05;ctx.stroke();ctx.restore();
      }
      for(let i=0;i<3;i++){const yy=y+height*(.035+i*.055)+Math.sin(t*.12+i)*1.8;wash(width*.18,yy,width*.83,height*.055,p.paper,.12+ (state.weather==='fog'?.22:0));}
    }
    function drawWater(p,t){
      const {ink,water,soft}=p;const top=height*.77;ctx.save();const grad=ctx.createLinearGradient(0,top,0,height);grad.addColorStop(0,water+'30');grad.addColorStop(1,water+'05');ctx.fillStyle=grad;ctx.fillRect(0,top,width,height-top);ctx.restore();
      for(let row=0;row<9;row++){const y=top+(height-top)*row/9;const wave=Math.sin(t*.6+row)*Math.min(5,state.wind*.12);const alpha=.22-row*.014;line([[width*.08,y],[width*.24,y+wave],[width*.45,y-wave*.5],[width*.68,y+wave*.4],[width*.92,y]],soft,alpha,.7);}
      if(state.weather==='rain'||state.weather==='storm'){
        const rainScale=Math.min(1,state.precipitation/5);for(let i=0;i<Math.round(4+rainScale*11);i++){const x=((i*79+Math.floor(t*13)*17)%Math.max(1,Math.round(width)));const y=top+((i*31+Math.floor(t*18)*7)%Math.max(1,Math.round(height-top)));const pulse=(t*2+i)%1;ctx.save();ctx.globalAlpha=.34*(1-pulse);ctx.strokeStyle=soft;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x,y,4+pulse*12,1+pulse*3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
      }
    }
    function drawPagoda(p){
      const {ink,soft}=p;const x=width*.79,y=height*.63,s=Math.min(width,height)*.16;ctx.save();ctx.translate(x,y);ctx.scale(s/100,s/100);ctx.strokeStyle=ink;ctx.globalAlpha=.68;ctx.lineWidth=2.3;ctx.lineJoin='round';ctx.lineCap='round';
      const roof=(yy,half)=>{ctx.beginPath();ctx.moveTo(-half,yy+7);ctx.quadraticCurveTo(-half*.25,yy-7,0,yy-15);ctx.quadraticCurveTo(half*.25,yy-7,half,yy+7);ctx.lineTo(half*.76,yy+8);ctx.stroke();};
      roof(0,42);line([[-30,9],[-30,43],[30,9],[30,43]],ink,.62,1.8);roof(48,55);line([[-39,56],[-39,92],[39,56],[39,92]],ink,.58,2);line([[-47,95],[47,95]],ink,.58,2);line([[0,-15],[0,-30]],ink,.65,2);ctx.restore();
    }
    function drawBambooAndLeaves(p,t){
      const {ink,accent,soft}=p;const x0=width*.90,y0=height*.12;const gust=Math.min(1,state.wind/55);const dir=Math.sin(state.direction*Math.PI/180);const sway=reduced?0:Math.sin(t*(.6+gust*.8))*gust*9;
      ctx.save();ctx.strokeStyle=ink;ctx.globalAlpha=.62;ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(x0+width*.13,y0-height*.1);ctx.quadraticCurveTo(x0+width*.015+sway,y0+height*.18,x0-width*.08+sway,y0+height*.39);ctx.stroke();
      const leaves=[];for(let i=0;i<7;i++){const bx=x0+width*(.09-i*.022)+sway*(i/7);const by=y0+height*(i*.047);const side=i%2?1:-1;leaves.push({x:bx,y:by,side,i});ctx.save();ctx.translate(bx,by);ctx.rotate(side*(.45+sway*.006));ctx.fillStyle=i%3===0?accent:ink;ctx.globalAlpha=.48;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(side*13,-8,side*27,-2);ctx.quadraticCurveTo(side*15,8,0,0);ctx.fill();ctx.strokeStyle=soft;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*24,-2);ctx.stroke();ctx.restore();}
      if(state.weather==='snow'&&snowLoad>0){ctx.strokeStyle='#fff';ctx.globalAlpha=Math.min(.9,snowLoad);ctx.lineWidth=2.3;for(let i=0;i<leaves.length;i++){const l=leaves[i];ctx.beginPath();ctx.moveTo(l.x,l.y-2);ctx.quadraticCurveTo(l.x+l.side*8,l.y-9,l.x+l.side*16,l.y-5);ctx.stroke();}}
      if((state.weather==='rain'||state.weather==='storm')&&state.precipitation>.1){for(let i=0;i<leaves.length;i++){const l=leaves[i];const phase=(t*.32+i*.21)%1;const px=l.x+l.side*25;const py=l.y-2;ctx.save();ctx.fillStyle='#6d9ba0';ctx.globalAlpha=.35+.5*(1-phase);ctx.beginPath();ctx.ellipse(px,py+phase*18,1.7,3.1,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
      if(gust>.35&&!reduced){for(let i=0;i<Math.min(3,Math.floor(gust*4));i++){const xx=(width*(.62+i*.09)+((t*state.wind*2+i*87)%(width*.34)));const yy=height*(.42+(i%2)*.17+Math.sin(t+i)*.025);ctx.save();ctx.translate(xx,yy);ctx.rotate(dir*.5+Math.sin(t*1.2+i)*.4);ctx.fillStyle=accent;ctx.globalAlpha=.58;ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(0,-7,10,-1);ctx.quadraticCurveTo(2,7,-8,0);ctx.fill();ctx.restore();}}
      ctx.restore();
    }
    function drawSnow(p,t){if(state.weather!=='snow'){snowLoad=Math.max(0,snowLoad-.0015);return;}const {soft}=p;const amount=Math.max(.12,Math.min(1,state.snowfall/2));snowLoad=reduced?Math.max(snowLoad,amount*.32):Math.min(.92,snowLoad+amount*.00055);const count=Math.round(12+amount*22);for(let i=0;i<count;i++){const x=((i*83+Math.sin(t*.3+i)*13)%width+width)%width;const y=((i*47+t*(4+(i%4)*1.2))%height*.78);ctx.save();ctx.globalAlpha=.45+(i%3)*.12;ctx.fillStyle=soft;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.45,0,Math.PI*2);ctx.fill();ctx.restore();}}
    function drawRain(p,t){if(state.weather!=='rain'&&state.weather!=='storm')return;const {soft,ink}=p;const intensity=Math.min(1,Math.max(.18,state.precipitation/6));const count=Math.round(16+intensity*22);for(let i=0;i<count;i++){const x=((i*73+t*(state.wind*.8+9))%width+width)%width;const y=((i*49+t*(90+intensity*90))%height*.86);line([[x,y],[x-2+Math.sin(state.direction*Math.PI/180)*6,y+8+intensity*7]],soft,.23+intensity*.18,.65);}
      for(let i=0;i<5;i++){const x=width*(.12+i*.19);const y=height*(.75+(i%2)*.12);const phase=(t*.55+i*.27)%1;ctx.save();ctx.globalAlpha=.32*(1-phase);ctx.strokeStyle=ink;ctx.lineWidth=.75;ctx.beginPath();ctx.ellipse(x,y,4+phase*15,1.5+phase*3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
    function drawWindLines(p,t){if(state.wind<18)return;const {soft}=p;const alpha=Math.min(.30,state.wind/180);for(let i=0;i<4;i++){const y=height*(.38+i*.095)+Math.sin(t*.55+i)*3;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=soft;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(width*(.10+i*.03),y);ctx.bezierCurveTo(width*.35,y-5,width*.56,y+6,width*.88,y-3);ctx.stroke();ctx.restore();}}
    function drawFog(p,t){if(state.weather!=='fog'&&state.cloud<85)return;const {paper,soft}=p;for(let i=0;i<3;i++){const y=height*(.49+i*.075)+Math.sin(t*.15+i)*7;const g=ctx.createLinearGradient(0,y,width,y);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.48,state.weather==='fog'?'rgba(238,238,224,.34)':'rgba(238,238,224,.15)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.save();ctx.fillStyle=g;ctx.fillRect(0,y-9,width,19);ctx.restore();}}
    function draw(){const p=palette();const t=elapsed;ctx.clearRect(0,0,width,height);drawSky(p,t);drawMountains(p,t);drawWater(p,t);drawPagoda(p);drawBambooAndLeaves(p,t);drawWindLines(p,t);drawRain(p,t);drawSnow(p,t);drawFog(p,t);}
    function loop(now){raf=0;if(!canvas.isConnected||!isActive('weather')||document.hidden)return;if(now-last>=42){const delta=Math.min(.08,(now-last)/1000||.04);elapsed+=delta;last=now;draw();}raf=requestAnimationFrame(loop);}
    function onVisibility(){if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(!reduced&&!raf){last=0;raf=requestAnimationFrame(loop);}}
    document.addEventListener('visibilitychange',onVisibility);
    function setState(next){state=next||state;if(reduced){draw();return;}if(!raf)raf=requestAnimationFrame(loop);}
    resize();draw();if(!reduced)raf=requestAnimationFrame(loop);
    window.addEventListener('resize',resize,{passive:true});
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{resize();draw();}):null;observer?.observe(canvas);
    return {setState,stop(){if(raf)cancelAnimationFrame(raf);raf=0;observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);}};
  }

  // Initial, original weather-matched art studies. The registry is data-driven:
  // additional studies can be added by ID and condition tags without changing the renderer.
  const JAPANESE_ART_LIBRARY = [
    { id:'clear-pine-001', weather:['clear','hot'], title:'Red Sun over Pine Ridge', caption:'A red sun, distant peaks and a windswept pine', motif:'pine' },
    { id:'cloud-willow-001', weather:['cloudy'], title:'Clouds over the Willow', caption:'Soft cloud banks above a quiet river', motif:'willow' },
    { id:'rain-willow-001', weather:['rain'], title:'Willow in the Rain', caption:'Rain strokes fall into a still mountain pond', motif:'willow' },
    { id:'storm-wave-001', weather:['storm'], title:'Waves beneath the Storm', caption:'A storm crest rendered in sweeping ink', motif:'waves' },
    { id:'snow-pine-001', weather:['snow'], title:'Snow on the Pine Branches', caption:'White ink gathers on winter branches', motif:'snow' },
    { id:'fog-temple-001', weather:['fog'], title:'Temple in the Mist', caption:'A distant roof emerging through pale ink wash', motif:'temple' },
    { id:'wind-bamboo-001', weather:['wind'], title:'Bamboo in the Wind', caption:'Long leaves bend with the passing wind', motif:'bamboo' },
    { id:'night-moon-001', weather:['night'], title:'Moon over the Quiet Ridge', caption:'A crescent above layered mountain silhouettes', motif:'moon' }
  ];

  function makeArtStudyStrokes(state) {
    const kind=state.phase==='night'?'night':(state.weather==='hot'?'clear':state.weather);
    const study=JAPANESE_ART_LIBRARY.find(item=>item.weather.includes(kind)) || JAPANESE_ART_LIBRARY[0];
    const strokes=[];
    const add=(points,tone='ink',weight=1.7,alpha=.78,kind='line')=>strokes.push({points,tone,weight,alpha,kind});
    const sample=(fn,count=22)=>Array.from({length:count+1},(_,i)=>fn(i/count));
    const quad=(a,c,b,n=18)=>sample(t=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]],n);
    const cubic=(a,c1,c2,b,n=24)=>sample(t=>{const u=1-t;return [u*u*u*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*b[0],u*u*u*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*b[1]];},n);
    const paper=state.phase==='night'?'#d8ddd2':'#344239';
    // A quiet red sun / moon is the signature mark in every composition.
    if(state.phase==='night'||study.motif==='moon'){
      add(sample(t=>{const a=-Math.PI*.48+t*Math.PI*1.45;return [.74+Math.cos(a)*.095,.22+Math.sin(a)*.095]},36),'accent',2.2,.92);
      add(sample(t=>{const a=Math.PI*.1+t*Math.PI*1.18;return [.755+Math.cos(a)*.078,.205+Math.sin(a)*.078]},28),'soft',.8,.42);
    } else {
      add(sample(t=>[.74+Math.cos(t*Math.PI*2)*.093,.22+Math.sin(t*Math.PI*2)*.093],42),'accent',2.6,.88);
      add([[.65,.22],[.66,.20],[.68,.19],[.70,.19]],'accent',.8,.34);
    }
    // Broad, translucent ink washes establish the paper-and-pigment depth first.
    add(cubic([-.08,.66],[.16,.50],[.27,.55],[.43,.65]),'ridge',8.5,.16,'wash');
    add(cubic([.24,.69],[.43,.55],[.62,.58],[.82,.68]),'soft',7.2,.13,'wash');
    add(cubic([-.02,.78],[.23,.69],[.48,.73],[.71,.80]),'ridge',9.5,.12,'wash');
    // Distant mountain contours, painted in several separate passes.
    add(cubic([-.03,.66],[.13,.54],[.20,.57],[.33,.64]),'soft',1.35,.46);
    add(cubic([.20,.67],[.39,.50],[.48,.54],[.61,.64]),'ink',2.0,.68);
    add(cubic([.50,.67],[.66,.56],[.75,.54],[1.04,.65]),'soft',1.2,.42);
    add(cubic([.04,.73],[.26,.64],[.48,.69],[.68,.73]),'soft',1.0,.30);
    // Foreground ridge / riverbank.
    add(cubic([-.04,.83],[.22,.72],[.40,.77],[.60,.82]),'ink',1.7,.54);
    add(cubic([.48,.84],[.68,.74],[.84,.76],[1.04,.80]),'soft',1.4,.46);
    // A pine trunk and deliberate branch strokes.
    add(cubic([.82,.86],[.80,.68],[.84,.52],[.79,.34]),'ink',3.1,.88);
    for(let i=0;i<6;i++){
      const y=.40+i*.062, reach=.11+(i%3)*.025, sway=(i%2?1:-1)*.025;
      add(cubic([.80,y],[.80+reach*.12,y-.015],[.80+reach*.65,y+.025],[.80+reach+sway,y+.01]),'ink',1.55,.76);
      add(cubic([.80,y+.005],[.80-reach*.20,y-.025],[.80-reach*.60,y+.025],[.80-reach,y+.02]),'soft',1.2,.68);
      for(let j=0;j<4;j++){
        const bx=.80+(j-1.5)*reach*.48, by=y+(j%2?-.018:.018);
        add(cubic([bx,by],[bx+.018,by-.025],[bx+.035,by-.017],[bx+.05,by-.028]),j%3===0?'accent':'ink',.8,.65);
      }
      for(let j=0;j<5;j++){
        const bx=.80+(j-2)*reach*.30, by=y+(j%2?-.012:.013);
        add(cubic([bx,by],[bx-.006,by-.018],[bx-.025,by-.027],[bx-.039,by-.033]),'ink',.8,.50);
        add(cubic([bx,by],[bx+.006,by-.018],[bx+.026,by-.025],[bx+.040,by-.030]),'soft',.7,.46);
      }
    }
    // Small Japanese roof / pavilion silhouette, drawn as separate brush lines.
    const roofY=.71,rx=.60;
    add(cubic([rx-.105,roofY+.03],[rx-.055,roofY-.012],[rx+.045,roofY-.012],[rx+.105,roofY+.03]),'ink',1.8,.78);
    add([[rx-.105,roofY+.03],[rx+.105,roofY+.03]],'ink',1.2,.76);
    add([[rx-.072,roofY+.035],[rx-.072,roofY+.14],[rx+.072,roofY+.14],[rx+.072,roofY+.035]],'ink',1.25,.68);
    add(cubic([rx-.09,roofY+.14],[rx,roofY+.11],[rx+.09,roofY+.14],[rx+.12,roofY+.16]),'ink',1.1,.70);
    // Weather-specific motifs make the library selection visible, not just metadata.
    if(kind==='rain'||kind==='storm'){
      // Rain-cloud scallops, falling brush strokes and repeated water rings.
      add(cubic([.20,.30],[.24,.25],[.29,.27],[.31,.30]),'soft',1.5,.66);
      add(cubic([.31,.30],[.34,.25],[.40,.25],[.43,.30]),'soft',1.5,.66);
      // Drooping willow tassels: long, tapered, individually painted strokes.
      if(kind==='rain'){
        add(cubic([.17,.34],[.15,.48],[.20,.55],[.18,.67]),'ink',1.8,.65);
        add(cubic([.20,.33],[.23,.48],[.20,.57],[.25,.70]),'soft',1.2,.68);
        for(let i=0;i<9;i++){const x=.15+(i%3)*.035,y=.43+Math.floor(i/3)*.07;add(cubic([x,y],[x-.018,y+.045],[x-.010,y+.075],[x-.024,y+.12]),i%3?'ink':'soft',.8,.62);}
      }
      for(let i=0;i<11;i++){const x=.19+(i%6)*.105,y=.34+Math.floor(i/6)*.045;add([[x,y],[x-.012,y+.045],[x-.02,y+.075]],'soft',.9,.48);}
      for(let i=0;i<5;i++){
        const x=.16+i*.16,y=.88+(i%2)*.035;
        add(sample(t=>[x+Math.cos(t*Math.PI*2)*(.012+t*.025),y+Math.sin(t*Math.PI*2)*(.004+t*.008)],16),'water',.9,.52);
      }
      if(kind==='storm'){
        add(cubic([.10,.24],[.24,.14],[.40,.17],[.52,.25]),'ink',2.1,.72);
        add([[.49,.30],[.46,.38],[.51,.37],[.47,.46]],'accent',2.0,.82);
        // Large crashing wave and curling foam, built as layered brush arcs.
        add(cubic([.02,.82],[.16,.66],[.28,.67],[.38,.82]),'water',10,.20,'wash');
        add(cubic([.04,.80],[.18,.65],[.28,.66],[.40,.80]),'ink',2.8,.82);
        add(cubic([.23,.84],[.32,.72],[.44,.74],[.52,.85]),'soft',5.5,.20,'wash');
        add(cubic([.28,.79],[.38,.70],[.48,.76],[.53,.83]),'ink',1.9,.74);
        for(let i=0;i<8;i++){const x=.12+i*.045,y=.73-(i%3)*.025;add(cubic([x,y],[x+.018,y-.025],[x+.035,y-.018],[x+.044,y-.035]),'paper',.9,.82);}
      }
    } else if(kind==='snow'){
      for(let i=0;i<9;i++){
        const x=.16+(i%3)*.28,y=.24+Math.floor(i/3)*.16;
        add([[x-.012,y],[x+.012,y]],'soft',1.0,.70);add([[x,y-.012],[x,y+.012]],'soft',1.0,.70);
        add([[x-.008,y-.008],[x+.008,y+.008]],'soft',.75,.58);
      }
      for(let i=0;i<6;i++){const x=.78+(i-2.5)*.035,y=.45+i*.045;add([[x-.018,y],[x+.016,y-.006],[x+.035,y+.002]],'paper',2.2,.86);}
    } else if(kind==='fog'){
      for(let i=0;i<5;i++)add(cubic([.03,.47+i*.065],[.24,.42+i*.065],[.62,.52+i*.065],[.98,.46+i*.065]),'wash',6.5,.18,'wash');
    } else if(kind==='wind'||kind==='bamboo'){
      for(let i=0;i<7;i++){const x=.20+i*.11,y=.40+(i%3)*.06;add(cubic([x,y],[x+.06,y-.07],[x+.13,y+.04],[x+.22,y-.03]),'soft',1.15,.62);}
      for(let i=0;i<8;i++){const x=.82+(i%2)*.018,y=.29+i*.036;add(cubic([x,y],[x+.07,y-.01],[x+.12,y-.05],[x+.16,y-.02]),i%3?'ink':'accent',1.0,.72);}
    } else if(kind==='cloudy'){
      for(let i=0;i<4;i++)add(cubic([.08,.30+i*.055],[.20,.25+i*.055],[.31,.35+i*.055],[.45,.30+i*.055]),'soft',1.7,.55);
    } else if(kind==='night'){
      for(let i=0;i<9;i++){const x=.13+(i*37%70)/100,y=.18+(i*23%32)/100;add([[x-.006,y],[x+.006,y]],'soft',.9,.68);add([[x,y-.006],[x,y+.006]],'soft',.9,.68);}
    } else {
      add(cubic([.13,.34],[.24,.28],[.33,.30],[.43,.34]),'soft',1.25,.48);
    }
    // A few short water / ground lines anchor the composition.
    for(let i=0;i<5;i++)add(cubic([.10,.90+i*.012],[.28,.88+i*.012],[.48,.92+i*.012],[.66,.89+i*.012]),'water',.85,.42);
    return {study,strokes,paper};
  }

  function makeArtStudioPainter(canvas,onProgress){
    let ctx=null;try{ctx=canvas.getContext('2d',{alpha:true});}catch(_){ctx=null;}
    if(!ctx)return {setState(){},replay(){},stop(){}};
    let width=0,height=0,dpr=1,raf=0,replayTimer=0,startAt=0,elapsed=0,last=0,current=null,study=null,strokes=[],paper='#f1eee5',complete=false;
    const reduced=reducedMotion();
    const resize=()=>{const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);drawFrame(1);};
    const colors=()=>({ink:current?.phase==='night'?'#dce4dc':'#26312b',soft:current?.phase==='night'?'#9eaea2':'#718074',water:current?.phase==='night'?'#87a2a0':'#789a98',accent:current?.phase==='night'?'#cb7868':'#bb4438',paper:current?.phase==='night'?'#26332f':'#f3efe5'});
    function strokeOne(stroke,portion){
      if(!stroke.points||stroke.points.length<2||portion<=0)return;
      const palette=colors();const tone=stroke.tone==='accent'?palette.accent:stroke.tone==='soft'?palette.soft:stroke.tone==='ridge'?palette.ridge:stroke.tone==='water'?palette.water:stroke.tone==='paper'?palette.paper:palette.ink;
      const points=stroke.points;const scaled=points.map(pt=>[pt[0]*width,pt[1]*height]);
      const total=scaled.length-1,visible=Math.max(1,Math.min(total,Math.ceil(total*portion)));
      const isWash=stroke.kind==='wash';
      ctx.save();ctx.globalAlpha=stroke.alpha??.75;ctx.strokeStyle=tone;ctx.lineWidth=isWash?Math.max(5,Math.min(34,stroke.weight*Math.min(width,height)/70)):Math.max(.7,Math.min(12,stroke.weight*Math.min(width,height)/180));ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(scaled[0][0],scaled[0][1]);
      for(let i=1;i<=visible;i++){
        const index=Math.min(i,scaled.length-1);let x=scaled[index][0],y=scaled[index][1];
        if(i===visible&&portion<1){const fraction=total*portion-Math.floor(total*portion);const next=scaled[Math.min(index+1,scaled.length-1)];x=scaled[index][0]+(next[0]-scaled[index][0])*fraction;y=scaled[index][1]+(next[1]-scaled[index][1])*fraction;}
        ctx.lineTo(x,y);
      }
      ctx.stroke();
      // A restrained dry-brush echo gives the marks an ink-on-paper edge.
      if(!isWash&&stroke.weight>1.2){ctx.globalAlpha=(stroke.alpha??.75)*.17;ctx.lineWidth=Math.max(.4,ctx.lineWidth*.45);ctx.translate(.65,-.45);ctx.stroke();}
      ctx.restore();
    }
    function drawFrame(progress){
      const palette=colors();ctx.clearRect(0,0,width,height);ctx.fillStyle=palette.paper;ctx.fillRect(0,0,width,height);
      // Washed red sun, completed early as a soft pigment mark.
      ctx.save();ctx.globalAlpha=.12;ctx.fillStyle=palette.accent;ctx.beginPath();ctx.arc(width*.74,height*.22,Math.min(width,height)*.105,0,Math.PI*2);ctx.fill();ctx.restore();
      const units=Math.max(0,Math.min(1,progress))*strokes.length;const done=Math.floor(units);const partial=units-done;
      for(let i=0;i<done;i++)strokeOne(strokes[i],1);
      if(done<strokes.length&&partial>0)strokeOne(strokes[done],partial);
      if(progress>=1){ctx.save();ctx.globalAlpha=.08;ctx.fillStyle=palette.soft;for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(width*(.08+i*.14),height*(.17+(i%3)*.21),width*.025,height*.008,(i%2)*.2,0,Math.PI*2);ctx.fill();}ctx.restore();}
      if(typeof onProgress==='function')onProgress({title:study?.title||'Ink study',count:Math.min(strokes.length,done+(partial>0?1:0)),total:strokes.length,complete:progress>=1});
    }
    function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;if(replayTimer)clearTimeout(replayTimer);replayTimer=0;}
    function frame(now){raf=0;if(!canvas.isConnected||!isActive('weather')||document.hidden)return;const progress=Math.min(1,(now-startAt)/Math.max(12000,Math.min(22000,strokes.length*300)));drawFrame(progress);if(progress<1){raf=requestAnimationFrame(frame);}else{complete=true;replayTimer=window.setTimeout(()=>startDrawing(),11500);}}
    function startDrawing(){stopLoop();if(!current)return;startAt=performance.now();complete=false;last=0;drawFrame(0);if(reduced){drawFrame(1);complete=true;return;}raf=requestAnimationFrame(frame);}
    function choose(next){current=next||current;const built=makeArtStudyStrokes(current||{weather:'clear',phase:'day'});study=built.study;strokes=built.strokes;paper=built.paper;startDrawing();}
    function setState(next){const changed=!current||current.weather!==next.weather||current.phase!==next.phase||Math.abs((current.wind||0)-(next.wind||0))>8;current=next||current;if(changed){choose(current);} }
    function replay(){if(current)startDrawing();}
    function onVisibility(){if(document.hidden)stopLoop();else if(current&&!complete)startDrawing();}
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('resize',resize,{passive:true});
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{resize();}):null;observer?.observe(canvas);
    resize();
    return {setState,replay,stop(){stopLoop();observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);}};
  }

  function makeScreen(){
    const screen=el('div','le-weather-screen');screen.dataset.weather='clear';screen.dataset.phase='day';screen.dataset.preview='true';
    screen.innerHTML=`
      <div class="le-weather-content">
        <header class="le-weather-topbar"><div class="le-weather-brand">LIVE <span>//</span> EARTH</div><div class="le-weather-place"><svg viewBox="0 0 18 22" fill="none" aria-hidden="true"><path d="M9 20s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/></svg><span id="le-weather-place-text">LOCATION PREVIEW</span></div></header>
        <div class="le-weather-date-row"><div class="le-weather-date" id="le-weather-date">LOCAL TIME</div><label class="le-weather-mode"><span>SCENE</span><select id="le-weather-mode-select" aria-label="Weather scene preview"><option value="auto">AUTO</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="night">NIGHT</option><option value="hot">HOT</option></select></label></div>
        <div class="le-weather-dashboard">
          <div class="le-weather-forecast-column">
            <section class="le-weather-hero" aria-label="Current weather"><h1 class="le-weather-headline" id="le-weather-headline">A quiet sky.</h1><div class="le-weather-temperature-row"><div class="le-weather-temperature" id="le-weather-temperature">—</div><div class="le-weather-condition"><span class="le-weather-condition-icon" id="le-weather-condition-icon"></span><div class="le-weather-condition-name" id="le-weather-condition">Weather preview</div><div class="le-weather-feels" id="le-weather-feels">Sample values</div></div></div></section>
            <section class="le-weather-summary" aria-label="Important weather details"><div class="le-weather-stat"><span class="le-weather-stat-label">HIGH / LOW</span><strong class="le-weather-stat-value" id="le-weather-highlow">—</strong></div><div class="le-weather-stat"><span class="le-weather-stat-label">RAIN CHANCE</span><strong class="le-weather-stat-value" id="le-weather-rainchance">—</strong></div><div class="le-weather-stat"><span class="le-weather-stat-label">WIND</span><strong class="le-weather-stat-value" id="le-weather-wind">—</strong></div></section>
            <section class="le-weather-hourly-section" aria-label="Hourly forecast"><div class="le-weather-section-head"><h2 class="le-weather-section-title">THE HOURS AHEAD</h2><span class="le-weather-section-note">NEXT 6 HOURS</span></div><div class="le-weather-hourly" id="le-weather-hourly"></div><svg class="le-weather-curve" id="le-weather-curve" viewBox="0 0 320 26" preserveAspectRatio="none" aria-hidden="true"></svg></section>
          </div>
          <div class="le-weather-art-column">
            <div class="le-weather-art-stage" aria-label="Live weather illustration"><canvas class="le-weather-art-canvas" id="le-weather-art-canvas"></canvas></div>
            <section class="le-weather-studio" aria-label="Live Japanese art studio">
              <div class="le-weather-studio-head"><div><span class="le-weather-studio-kicker">LIVE ART · PAINTING THE WEATHER</span><h2 class="le-weather-studio-title" id="le-weather-studio-title">Red Sun over Pine Ridge</h2></div><span class="le-weather-studio-state" id="le-weather-studio-state" role="status">PREPARING</span></div>
              <canvas class="le-weather-studio-canvas" id="le-weather-studio-canvas" aria-label="Japanese ink artwork being drawn stroke by stroke"></canvas>
              <div class="le-weather-studio-foot"><span id="le-weather-studio-caption">Original Japanese ink study · Weather matched</span><button class="le-weather-art-replay" id="le-weather-art-replay" type="button">REPLAY ↻</button></div>
            </section>
          </div>
        </div>
        <p class="le-weather-status" id="le-weather-status" aria-live="polite"></p>
        <p class="le-weather-attribution">Weather data: Open-Meteo · Ink art is drawn locally from a weather-matched library</p>
      </div>`;
    return screen;
  }

  function activateWeather(){
    const view=mount('weather');if(!view)return;
    addStyles();const screen=makeScreen();view.panel.remove();view.root.replaceChildren(screen);
    const canvas=screen.querySelector('#le-weather-art-canvas');const painter=makePainter(canvas);const studioCanvas=screen.querySelector('#le-weather-studio-canvas');const studioState=screen.querySelector('#le-weather-studio-state');const studioTitle=screen.querySelector('#le-weather-studio-title');const studioCaption=screen.querySelector('#le-weather-studio-caption');const studioPainter=makeArtStudioPainter(studioCanvas,meta=>{if(studioState)studioState.textContent=meta.complete?'FINISHED':`DRAWING · ${String(meta.count).padStart(2,'0')} / ${meta.total}`;if(meta.title&&studioTitle)studioTitle.textContent=meta.title;});const replayButton=screen.querySelector('#le-weather-art-replay');const handleReplay=()=>studioPainter.replay();replayButton?.addEventListener('click',handleReplay);
    let abortController=null,pollTimer=0,refreshTimer=0,clockTimer=0,disposed=false,requestSerial=0,lastFetch=0,manualPreview=false;
    const selector=screen.querySelector('#le-weather-mode-select');
    const handleModeChange=()=>chooseMode(selector.value);
    const stopPolling=()=>{if(pollTimer)clearInterval(pollTimer);pollTimer=0;};
    function paint(data,preview=false){
      const c=data.current||{};const code=Number(c.weather_code);if(!Number.isFinite(code))throw new Error('Weather source returned unusable conditions.');
      paintData(screen,data,preview);painter.setState(screen.__weatherState);studioPainter.setState(screen.__weatherState);lastFetch=Date.now();
      const artKind=screen.__weatherState.phase==='night'?'night':screen.__weatherState.weather;const artRecord=JAPANESE_ART_LIBRARY.find(item=>item.weather.includes(artKind))||JAPANESE_ART_LIBRARY[0];if(studioCaption)studioCaption.textContent=`${artRecord.caption} · ${preview?'Sample scene':'Live weather matched'}`;
    }
    function showPreview(kind='clear',message='SAMPLE SCENE · Turn on Location for your live forecast.'){
      const data=sampleData(kind);paint(data,true);setText(screen,'le-weather-status',message);screen.dataset.preview='true';setText(screen,'le-weather-place-text','LOCATION PREVIEW');
    }
    function showLocationOff(){showPreview('clear','SAMPLE SCENE · Location is off. Choose a weather mode to explore, or turn on Location for live data.');}
    async function fetchLive(){
      if(disposed||!isActive('weather')||manualPreview)return;
      if(window.liveEarthLocationAllowed?.()!==true){showLocationOff();return;}
      if(navigator.onLine===false){showPreview('clear','OFFLINE · Showing sample art, not live conditions.');return;}
      const point=globe()?.getLocation?.();const lat=Number(point?.latitude),lon=Number(point?.longitude);
      if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lon)||lon < -180||lon>180){showLocationOff();return;}
      abortController?.abort();const controller=new AbortController();abortController=controller;const serial=++requestSerial;
      const query=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:'temperature_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,relative_humidity_2m',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:'1',timezone:'auto',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
      try{const response=await fetch(`${API_ROOT}?${query}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`Weather source returned ${response.status}.`);const data=await response.json();if(disposed||!isActive('weather')||serial!==requestSerial||window.liveEarthLocationAllowed?.()!==true)return;paint(data,false);setText(screen,'le-weather-place-text','YOUR LOCATION');}
      catch(error){if(error?.name!=='AbortError'&&!disposed&&isActive('weather')&&window.liveEarthLocationAllowed?.()===true)showPreview('clear','LIVE DATA UNAVAILABLE · Showing a labelled sample scene.');}
      finally{if(abortController===controller)abortController=null;}
    }
    function pollForFix(){stopPolling();let remaining=24;pollTimer=window.setInterval(()=>{if(disposed||!isActive('weather')){stopPolling();return;}if(window.liveEarthLocationAllowed?.()!==true){stopPolling();showLocationOff();return;}const p=globe()?.getLocation?.();if(p&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))){stopPolling();fetchLive();return;}if(--remaining<=0){stopPolling();showLocationOff();}},500);}
    function chooseMode(mode){
      manualPreview=mode!=='auto';if(mode==='auto'){if(window.liveEarthLocationAllowed?.()===true)fetchLive();else showLocationOff();return;}
      stopPolling();requestSerial++;abortController?.abort();abortController=null;showPreview(mode,`PREVIEW · ${mode.toUpperCase()} WEATHER — sample values only.`);
    }
    function onLocationState(event){if(!isActive('weather'))return;if(event.detail?.enabled===true&&window.liveEarthLocationAllowed?.()===true&&!manualPreview)pollForFix();else if(window.liveEarthLocationAllowed?.()!==true&&!manualPreview)showLocationOff();}
    function onLocationStop(){stopPolling();requestSerial++;abortController?.abort();abortController=null;if(!manualPreview)showLocationOff();}
    function onOnline(){if(!manualPreview&&window.liveEarthLocationAllowed?.()===true)fetchLive();}
    function onOffline(){stopPolling();requestSerial++;abortController?.abort();abortController=null;if(!manualPreview)showPreview('clear','OFFLINE · Showing a labelled sample scene, not live weather.');}
    function onVisibility(){if(!document.hidden&&!manualPreview&&window.liveEarthLocationAllowed?.()===true&&Date.now()-lastFetch>REFRESH_MS)fetchLive();}
    function updateLocalClock(){if(!screen.isConnected)return;setText(screen,'le-weather-date',deviceClock());}
    selector.addEventListener('change',handleModeChange);
    window.addEventListener('live-earth-location-state',onLocationState);window.addEventListener('live-earth-location-stop',onLocationStop);window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);document.addEventListener('visibilitychange',onVisibility);
    refreshTimer=window.setInterval(()=>{if(!disposed&&!document.hidden&&!manualPreview&&window.liveEarthLocationAllowed?.()===true)fetchLive();},REFRESH_MS);
    clockTimer=window.setInterval(updateLocalClock,30000);updateLocalClock();
    if(window.liveEarthLocationAllowed?.()===true)pollForFix();else showLocationOff();
    return()=>{disposed=true;requestSerial++;stopPolling();if(refreshTimer)clearInterval(refreshTimer);if(clockTimer)clearInterval(clockTimer);abortController?.abort();abortController=null;painter.stop();studioPainter.stop();replayButton?.removeEventListener('click',handleReplay);selector.removeEventListener('change',handleModeChange);window.removeEventListener('live-earth-location-state',onLocationState);window.removeEventListener('live-earth-location-stop',onLocationStop);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);document.removeEventListener('visibilitychange',onVisibility);screen.remove();document.getElementById(STYLE_ID)?.remove();};
  }

  runtime.registerFeature('weather',activateWeather);
})();
