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
      .le-weather-screen{--paper:#f1eee5;--paper-deep:#e8e3d7;--ink:#202923;--muted:#68736c;--accent:#b84437;position:absolute;inset:0;z-index:1;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;color:var(--ink);background:radial-gradient(ellipse at 76% 45%,rgba(202,211,194,.30),transparent 42%),linear-gradient(160deg,var(--paper),var(--paper-deep));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;isolation:isolate}
      .le-weather-screen::-webkit-scrollbar{display:none}
      .le-weather-screen:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.23;background-image:repeating-linear-gradient(7deg,transparent 0 11px,rgba(78,68,51,.035) 12px,transparent 13px),repeating-linear-gradient(93deg,transparent 0 17px,rgba(78,68,51,.025) 18px,transparent 19px);mix-blend-mode:multiply}
      .le-weather-screen[data-phase="night"]{--paper:#202a2a;--paper-deep:#152223;--ink:#f0eee5;--muted:#bdc8bf;--accent:#d36b55;background:radial-gradient(ellipse at 77% 47%,rgba(74,103,98,.28),transparent 45%),linear-gradient(160deg,var(--paper),var(--paper-deep))}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"],.le-weather-screen[data-weather="fog"]{--paper:#e8e9df;--paper-deep:#d7dfd7}
      .le-weather-screen[data-phase="night"][data-weather="rain"],.le-weather-screen[data-phase="night"][data-weather="storm"],.le-weather-screen[data-phase="night"][data-weather="fog"]{--paper:#1b272b;--paper-deep:#101c21}
      .le-weather-content{position:relative;z-index:2;width:min(100%,760px);margin:0 auto;padding:calc(env(safe-area-inset-top) + 17px) clamp(20px,5vw,34px) calc(env(safe-area-inset-bottom) + 214px)}
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
      .le-weather-art-stage{position:relative;z-index:1;height:clamp(190px,35vh,310px);margin:-2px -14px 0;pointer-events:none}
      .le-weather-art-canvas{display:block;width:100%;height:100%;touch-action:none}
      .le-weather-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin-top:0;padding:12px 0;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
      .le-weather-stat{min-width:0;padding:0 10px;border-right:1px solid color-mix(in srgb,var(--ink) 17%,transparent)}.le-weather-stat:first-child{padding-left:2px}.le-weather-stat:last-child{border-right:0}
      .le-weather-stat-label{display:block;color:var(--muted);font-size:7px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
      .le-weather-stat-value{display:block;margin-top:6px;color:var(--ink);font-size:clamp(12px,3.5vw,15px);font-weight:730;white-space:nowrap}
      .le-weather-hourly-section{position:relative;z-index:2;margin-top:19px}
      .le-weather-section-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 1px 9px}
      .le-weather-section-title{margin:0;color:var(--muted);font-size:8px;font-weight:800;letter-spacing:.2em}
      .le-weather-section-note{color:var(--muted);font-size:7px;letter-spacing:.09em}
      .le-weather-hourly{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(45px,1fr);gap:2px;overflow-x:auto;padding:5px 0 7px;scrollbar-width:none;overscroll-behavior-x:contain}
      .le-weather-hourly::-webkit-scrollbar{display:none}
      .le-weather-hour{display:grid;justify-items:center;align-content:start;gap:6px;min-width:0;padding:8px 2px 5px;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);text-align:center;color:var(--ink)}
      .le-weather-hour-time{font-size:8px;color:var(--muted);white-space:nowrap}.le-weather-hour-icon{width:19px;height:19px;color:var(--ink)}.le-weather-hour-temp{font-size:13px;font-weight:750;white-space:nowrap}.le-weather-hour-rain{font-size:7px;color:#668b8a;white-space:nowrap}
      .le-weather-curve{display:block;width:100%;height:26px;margin-top:0;overflow:visible}.le-weather-curve path{fill:none;stroke:var(--ink);stroke-width:1.3;opacity:.72;vector-effect:non-scaling-stroke}.le-weather-curve circle{fill:var(--accent);stroke:var(--paper);stroke-width:1.1;vector-effect:non-scaling-stroke}
      .le-weather-status{min-height:15px;margin:12px 1px 0;color:var(--muted);font-size:8px;line-height:1.45}.le-weather-status:empty{display:none}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"]{--accent:#4e8285}.le-weather-screen[data-weather="snow"]{--accent:#718c9e}.le-weather-screen[data-weather="hot"]{--accent:#bd6945}
      .le-weather-attribution{margin:13px 1px 0;color:var(--muted);font-size:7px;line-height:1.4;opacity:.78}
      @media(min-width:600px) and (orientation:portrait){.le-weather-content{width:min(100%,760px);padding-left:clamp(32px,7vw,60px);padding-right:clamp(32px,7vw,60px)}.le-weather-headline{font-size:clamp(64px,9vw,88px)}.le-weather-temperature{font-size:126px}.le-weather-art-stage{height:clamp(240px,38vh,360px)}}
      @media(orientation:landscape) and (min-width:650px){
        .le-weather-screen{overflow-y:auto}
        .le-weather-content{width:min(100%,1240px);min-height:100%;padding:calc(env(safe-area-inset-top) + 12px) clamp(24px,4vw,56px) calc(env(safe-area-inset-bottom) + 150px);display:grid;grid-template-columns:minmax(260px,.88fr) minmax(340px,1.12fr);grid-template-areas:"top top" "date date" "hero art" "summary art" "hours hours" "status status" "credit credit";column-gap:clamp(20px,4vw,58px);row-gap:7px;align-content:start;align-items:center}
        .le-weather-topbar{grid-area:top}.le-weather-date-row{grid-area:date;margin-top:10px}.le-weather-hero{grid-area:hero;margin-top:5px;align-self:center}.le-weather-art-stage{grid-area:art;height:clamp(210px,49vh,430px);margin:0 -8px;align-self:stretch}.le-weather-summary{grid-area:summary;margin:0;align-self:start}.le-weather-hourly-section{grid-area:hours;margin-top:8px}.le-weather-status{grid-area:status;margin-top:0}.le-weather-attribution{grid-area:credit;margin-top:0}.le-weather-headline{font-size:clamp(45px,5vw,76px)}.le-weather-temperature{font-size:clamp(82px,8vw,112px)}.le-weather-hourly{grid-auto-columns:minmax(0,1fr);overflow:visible}.le-weather-hour{gap:4px}.le-weather-summary{max-width:540px}
      }
      @media(max-width:390px){.le-weather-content{padding-left:16px;padding-right:16px;padding-bottom:calc(env(safe-area-inset-bottom) + 226px)}.le-weather-date-row{margin-top:24px}.le-weather-headline{font-size:clamp(40px,11.3vw,48px)}.le-weather-temperature{font-size:clamp(72px,20vw,82px)}.le-weather-art-stage{height:clamp(174px,31vh,230px);margin-left:-9px;margin-right:-9px}.le-weather-summary{padding:10px 0}.le-weather-stat{padding:0 6px}.le-weather-stat-label{font-size:6px;letter-spacing:.08em}.le-weather-stat-value{font-size:11px}.le-weather-hourly-section{margin-top:16px}}
      @media(orientation:landscape) and (max-height:520px){.le-weather-content{padding-top:calc(env(safe-area-inset-top) + 8px);padding-bottom:calc(env(safe-area-inset-bottom) + 146px);row-gap:4px}.le-weather-date-row{margin-top:5px}.le-weather-headline{font-size:clamp(36px,5vw,52px)}.le-weather-headline:after{margin:9px 0 9px}.le-weather-temperature{font-size:clamp(68px,8vw,82px)}.le-weather-art-stage{height:clamp(145px,38vh,210px)}.le-weather-hourly-section{margin-top:4px}}
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
    const start = new Date(); start.setMinutes(0,0,0);
    const hours = Array.from({length:6},(_,i)=>{const d=new Date(start);d.setHours(d.getHours()+i);return localWallTime(d);});
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

  function makeScreen(){
    const screen=el('div','le-weather-screen');screen.dataset.weather='clear';screen.dataset.phase='day';screen.dataset.preview='true';
    screen.innerHTML=`
      <div class="le-weather-content">
        <header class="le-weather-topbar"><div class="le-weather-brand">LIVE <span>//</span> EARTH</div><div class="le-weather-place"><svg viewBox="0 0 18 22" fill="none" aria-hidden="true"><path d="M9 20s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/></svg><span id="le-weather-place-text">LOCATION PREVIEW</span></div></header>
        <div class="le-weather-date-row"><div class="le-weather-date" id="le-weather-date">LOCAL TIME</div><label class="le-weather-mode"><span>SCENE</span><select id="le-weather-mode-select" aria-label="Weather scene preview"><option value="auto">AUTO</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="night">NIGHT</option><option value="hot">HOT</option></select></label></div>
        <section class="le-weather-hero" aria-label="Current weather"><h1 class="le-weather-headline" id="le-weather-headline">A quiet sky.</h1><div class="le-weather-temperature-row"><div class="le-weather-temperature" id="le-weather-temperature">—</div><div class="le-weather-condition"><span class="le-weather-condition-icon" id="le-weather-condition-icon"></span><div class="le-weather-condition-name" id="le-weather-condition">Weather preview</div><div class="le-weather-feels" id="le-weather-feels">Sample values</div></div></div></section>
        <div class="le-weather-art-stage" aria-hidden="true"><canvas class="le-weather-art-canvas" id="le-weather-art-canvas"></canvas></div>
        <section class="le-weather-summary" aria-label="Important weather details"><div class="le-weather-stat"><span class="le-weather-stat-label">HIGH / LOW</span><strong class="le-weather-stat-value" id="le-weather-highlow">—</strong></div><div class="le-weather-stat"><span class="le-weather-stat-label">RAIN CHANCE</span><strong class="le-weather-stat-value" id="le-weather-rainchance">—</strong></div><div class="le-weather-stat"><span class="le-weather-stat-label">WIND</span><strong class="le-weather-stat-value" id="le-weather-wind">—</strong></div></section>
        <section class="le-weather-hourly-section" aria-label="Hourly forecast"><div class="le-weather-section-head"><h2 class="le-weather-section-title">THE HOURS AHEAD</h2><span class="le-weather-section-note">NEXT 6 HOURS</span></div><div class="le-weather-hourly" id="le-weather-hourly"></div><svg class="le-weather-curve" id="le-weather-curve" viewBox="0 0 320 26" preserveAspectRatio="none" aria-hidden="true"></svg></section>
        <p class="le-weather-status" id="le-weather-status" aria-live="polite"></p>
        <p class="le-weather-attribution">Weather data: Open-Meteo · Japanese ink drawing generated locally from live conditions</p>
      </div>`;
    return screen;
  }

  function activateWeather(){
    const view=mount('weather');if(!view)return;
    addStyles();const screen=makeScreen();view.panel.remove();view.root.replaceChildren(screen);
    const canvas=screen.querySelector('#le-weather-art-canvas');const painter=makePainter(canvas);
    let abortController=null,pollTimer=0,refreshTimer=0,clockTimer=0,disposed=false,requestSerial=0,lastFetch=0,manualPreview=false;
    const selector=screen.querySelector('#le-weather-mode-select');
    const handleModeChange=()=>chooseMode(selector.value);
    const stopPolling=()=>{if(pollTimer)clearInterval(pollTimer);pollTimer=0;};
    function paint(data,preview=false){
      const c=data.current||{};const code=Number(c.weather_code);if(!Number.isFinite(code))throw new Error('Weather source returned unusable conditions.');
      paintData(screen,data,preview);painter.setState(screen.__weatherState);lastFetch=Date.now();
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
    return()=>{disposed=true;requestSerial++;stopPolling();if(refreshTimer)clearInterval(refreshTimer);if(clockTimer)clearInterval(clockTimer);abortController?.abort();abortController=null;painter.stop();selector.removeEventListener('change',handleModeChange);window.removeEventListener('live-earth-location-state',onLocationState);window.removeEventListener('live-earth-location-stop',onLocationStop);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);document.removeEventListener('visibilitychange',onVisibility);screen.remove();document.getElementById(STYLE_ID)?.remove();};
  }

  runtime.registerFeature('weather',activateWeather);
})();
