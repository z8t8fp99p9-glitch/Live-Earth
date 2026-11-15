/* LIVE // EARTH — Weather: full-screen living atmosphere.
   Live weather model: Open-Meteo current conditions and daily summary.
   A procedural, animated landscape changes with actual Open-Meteo conditions.
   Location is consumed only from the app's explicitly enabled Location service.
   This module is a Stacks feature: no second view registry, dock or close control. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, isActive, globe } = runtime;
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';
  const REFRESH_MS = 15 * 60 * 1000;
  const STYLE_ID = 'le-weather-world-style-v1';
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  const PALETTES = {
    clear:  { sky1:'#6db4d2', sky2:'#d4dfd0', glow:'#ffe1a1', far:'#708d91', mid:'#496f69', near:'#274b45', water:'#497f88', cloud:'#f4f2e8' },
    cloudy: { sky1:'#778f9d', sky2:'#c3c8c0', glow:'#d7d8cc', far:'#78888a', mid:'#586c69', near:'#344e4a', water:'#58757a', cloud:'#e6e8e4' },
    rain:   { sky1:'#526b7d', sky2:'#899b9e', glow:'#b8c6c5', far:'#61777d', mid:'#405f60', near:'#263f40', water:'#3c6974', cloud:'#cbd5d3' },
    storm:  { sky1:'#283d55', sky2:'#697c86', glow:'#a8b6b7', far:'#526872', mid:'#354e50', near:'#1c3439', water:'#2e5865', cloud:'#aebdc1' },
    snow:   { sky1:'#8baec0', sky2:'#d9e5e4', glow:'#f5f1e4', far:'#a6b9bc', mid:'#728f8e', near:'#476564', water:'#7198a0', cloud:'#f5f7f3' },
    fog:    { sky1:'#9daead', sky2:'#d7dcd2', glow:'#ece9d9', far:'#9aa9a4', mid:'#71857d', near:'#526a61', water:'#809c99', cloud:'#edf0e7' },
    wind:   { sky1:'#72a8b7', sky2:'#c8d5c5', glow:'#f3d6a1', far:'#788f89', mid:'#4e7165', near:'#2c5146', water:'#58838a', cloud:'#e7e9dd' },
    hot:    { sky1:'#79b8ce', sky2:'#e5d2a7', glow:'#ffcf7d', far:'#a68b70', mid:'#8b795d', near:'#5e624e', water:'#718d88', cloud:'#f5e6c7' },
    night:  { sky1:'#101e3a', sky2:'#344d65', glow:'#d9e4e9', far:'#536b7b', mid:'#344f55', near:'#1c343b', water:'#203f55', cloud:'#8799a4' }
  };

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#172b39!important;isolation:isolate;pointer-events:none}
      .le-sfv--weather>.le-sfv-panel{display:none!important}
      .le-weather-world{--wx-ink:#f8f5e9;--wx-muted:rgba(248,245,233,.72);position:absolute;inset:0;overflow:hidden;isolation:isolate;background:#1d3544;color:var(--wx-ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;contain:layout paint style}
      .le-weather-world *, .le-weather-world *::before,.le-weather-world *::after{box-sizing:border-box}
      .le-weather-world canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0}
      .le-weather-world::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(8,20,31,.36) 0%,rgba(8,20,31,.02) 37%,rgba(7,19,26,.10) 62%,rgba(4,14,20,.55) 100%),linear-gradient(90deg,rgba(6,18,29,.22),transparent 72%)}
      .le-weather-world::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.12;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E");mix-blend-mode:soft-light}
      .le-weather-ui{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:calc(env(safe-area-inset-top) + clamp(22px,4vh,44px)) clamp(22px,5vw,68px) calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,142px));pointer-events:none}
      .le-weather-top{max-width:min(100%,720px);pointer-events:none;text-shadow:0 2px 22px rgba(0,0,0,.22)}
      .le-weather-eyebrow{display:flex;align-items:center;gap:10px;font-size:10px;font-weight:750;letter-spacing:.23em;text-transform:uppercase;color:var(--wx-muted)}
      .le-weather-live-dot{width:7px;height:7px;border-radius:50%;background:#b9e4c0;box-shadow:0 0 12px #b9e4c0;flex:none}
      .le-weather-place{margin-top:14px;font-size:clamp(12px,1.7vw,15px);font-weight:650;letter-spacing:.17em;text-transform:uppercase;color:rgba(255,255,255,.82)}
      .le-weather-date{margin-top:5px;font-size:12px;letter-spacing:.04em;color:var(--wx-muted)}
      .le-weather-reading{margin-top:clamp(20px,4vh,40px);display:flex;align-items:flex-start;gap:10px}
      .le-weather-temp{font-size:clamp(86px,22vw,156px);font-weight:220;line-height:.82;letter-spacing:-.095em;font-variant-numeric:tabular-nums;color:#fffdf4;text-shadow:0 8px 38px rgba(0,0,0,.15)}
      .le-weather-degree{font-size:clamp(30px,5vw,48px);font-weight:300;line-height:1;margin:5px 0 0 5px;opacity:.92}
      .le-weather-condition{margin-top:18px;font-size:clamp(25px,5vw,43px);font-weight:380;letter-spacing:-.045em;line-height:1.05;color:#fffdf4;text-shadow:0 3px 26px rgba(0,0,0,.18)}
      .le-weather-feels{margin-top:9px;font-size:14px;letter-spacing:.03em;color:rgba(255,255,255,.79)}
      .le-weather-bottom{width:min(100%,740px);pointer-events:auto;text-shadow:0 2px 18px rgba(0,0,0,.24)}
      .le-weather-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2.4vw,28px);padding-top:15px;border-top:1px solid rgba(255,255,255,.33)}
      .le-weather-metric-label{font-size:9px;font-weight:750;letter-spacing:.19em;text-transform:uppercase;color:rgba(255,255,255,.65)}
      .le-weather-metric-value{margin-top:7px;font-size:clamp(14px,2.6vw,20px);font-weight:520;letter-spacing:-.02em;color:#fffdf4;white-space:nowrap}
      .le-weather-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:17px;color:rgba(255,255,255,.62);font-size:10px;letter-spacing:.07em}
      .le-weather-status{max-width:65%;line-height:1.45}
      .le-weather-preview{display:flex;align-items:center;gap:8px;pointer-events:auto}
      .le-weather-preview label{font-size:9px;font-weight:750;letter-spacing:.16em;color:rgba(255,255,255,.7);text-transform:uppercase}
      .le-weather-preview select{max-width:122px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(8,20,31,.32);color:#fff;padding:7px 10px;font:inherit;font-size:11px;outline:none;color-scheme:dark}
      .le-weather-preview select:focus-visible{outline:2px solid rgba(255,255,255,.85);outline-offset:3px}
      @media (orientation:portrait){
        .le-weather-ui{padding-left:clamp(22px,6vw,34px);padding-right:clamp(22px,6vw,34px)}
        .le-weather-top{max-width:82%}
        .le-weather-reading{margin-top:clamp(27px,5vh,54px)}
        .le-weather-temp{font-size:clamp(106px,27vw,154px)}
        .le-weather-condition{max-width:82%;font-size:clamp(29px,8vw,42px)}
        .le-weather-bottom{margin-top:auto}
      }
      @media (orientation:landscape){
        .le-weather-ui{padding-left:calc(env(safe-area-inset-left) + clamp(24px,5vw,74px));padding-right:calc(env(safe-area-inset-right) + clamp(24px,5vw,74px));padding-top:calc(env(safe-area-inset-top) + 18px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,118px));}
        .le-weather-top{width:43%;max-width:530px}
        .le-weather-reading{margin-top:clamp(16px,3vh,26px)}
        .le-weather-temp{font-size:clamp(82px,14vw,132px)}
        .le-weather-condition{font-size:clamp(25px,4vw,38px);margin-top:12px}
        .le-weather-feels{margin-top:6px}
        .le-weather-bottom{width:43%;max-width:530px;margin-top:12px}
        .le-weather-metrics{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:11px;padding-top:11px}
        .le-weather-metric-value{margin-top:4px}
        .le-weather-footer{margin-top:10px}
        .le-weather-status{max-width:55%}
      }
      @media (max-height:480px) and (orientation:landscape){
        .le-weather-ui{padding-top:calc(env(safe-area-inset-top) + 10px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,96px))}
        .le-weather-place{margin-top:7px}.le-weather-date{margin-top:2px}.le-weather-reading{margin-top:12px}
        .le-weather-temp{font-size:clamp(66px,12vw,94px)}.le-weather-condition{font-size:23px;margin-top:8px}
        .le-weather-bottom{margin-top:5px}.le-weather-metrics{gap:8px 18px}.le-weather-metric-value{font-size:14px}
        .le-weather-footer{margin-top:7px}
      }
      @media (prefers-reduced-motion:reduce){.le-weather-live-dot{box-shadow:none}}
    `;
    document.head.appendChild(style);
  }

  function createScreen() {
    const screen = document.createElement('main');
    screen.className = 'le-weather-world';
    screen.setAttribute('aria-label', 'Live weather and animated atmospheric landscape');
    screen.innerHTML = `
      <canvas class="le-weather-canvas" aria-hidden="true"></canvas>
      <div class="le-weather-ui">
        <header class="le-weather-top">
          <div class="le-weather-eyebrow"><span class="le-weather-live-dot"></span><span>LIVE // EARTH · WEATHER</span></div>
          <div class="le-weather-place" data-wx="place">LOCATION PREVIEW</div>
          <div class="le-weather-date" data-wx="date">—</div>
          <div class="le-weather-reading"><span class="le-weather-temp" data-wx="temp">24</span><span class="le-weather-degree">°</span></div>
          <div class="le-weather-condition" data-wx="condition">Clear sky</div>
          <div class="le-weather-feels" data-wx="feels">Feels like 24°</div>
        </header>
        <footer class="le-weather-bottom">
          <div class="le-weather-metrics">
            <div><div class="le-weather-metric-label">Today</div><div class="le-weather-metric-value" data-wx="range">— / —</div></div>
            <div><div class="le-weather-metric-label">Rain chance</div><div class="le-weather-metric-value" data-wx="rain">—</div></div>
            <div><div class="le-weather-metric-label">Wind</div><div class="le-weather-metric-value" data-wx="wind">—</div></div>
            <div><div class="le-weather-metric-label">Humidity</div><div class="le-weather-metric-value" data-wx="humidity">—</div></div>
          </div>
          <div class="le-weather-footer">
            <div class="le-weather-status" data-wx="status" role="status" aria-live="polite">Location is off · sample scene</div>
            <div class="le-weather-preview"><label for="le-weather-preview-select">Scene</label><select id="le-weather-preview-select" aria-label="Preview weather scene">
              <option value="auto">AUTO</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="hot">HEAT</option><option value="night">NIGHT</option>
            </select></div>
          </div>
        </footer>
      </div>`;
    return screen;
  }

  const $ = (root, key) => root.querySelector(`[data-wx="${key}"]`);
  const n = value => value === null || value === undefined || value === '' ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function weatherKind(code, current = {}) {
    const wind = n(current.wind_speed_10m) || 0;
    const temp = n(current.temperature_2m);
    if (code === 0 && temp !== null && temp >= 34) return 'hot';
    if ([95,96,99].includes(code)) return 'storm';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([45,48].includes(code)) return 'fog';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
    if ([2,3].includes(code)) return 'cloudy';
    if (wind >= 34 && code <= 1) return 'wind';
    return 'clear';
  }

  function conditionLabel(code, kind) {
    const labels = {
      0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',
      51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',
      61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',
      71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Showers',82:'Heavy showers',
      85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm · hail',99:'Severe thunderstorm'
    };
    if (kind === 'hot') return 'Heat and open sky';
    if (kind === 'wind') return 'Wind across the land';
    if (kind === 'night') return 'Night sky';
    return labels[code] || 'Weather conditions';
  }

  function compass(degrees) {
    const d = n(degrees);
    if (d === null) return '—';
    return ['N','NE','E','SE','S','SW','W','NW'][Math.round((((d % 360) + 360) % 360) / 45) % 8];
  }

  function formatTime(value) {
    if (!value) return new Date().toLocaleString(undefined, { weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' });
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(undefined, { weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' });
  }

  function sampleData(kind) {
    const now = new Date();
    const hour = now.getHours();
    const isNight = kind === 'night' || (kind === 'auto' && (hour < 6 || hour >= 19));
    const samples = {
      clear:[0,27,27,0,0,8,12,56], cloudy:[3,22,22,0,0,78,12,68], rain:[63,19,20,2.8,1.8,94,18,72],
      storm:[95,22,23,6.2,4.8,100,32,84], snow:[73,-2,-5,1.1,0,96,11,78], fog:[45,13,12,0,0,100,4,92],
      wind:[1,20,19,0,0,24,42,49], hot:[0,37,40,0,0,9,13,25], night:[0,17,16,0,0,3,5,58]
    };
    const v = samples[kind] || samples.clear;
    const temp = v[1], feels = v[2], code = v[0];
    return {
      current:{ time:now.toISOString().slice(0,16), temperature_2m:temp, apparent_temperature:feels,
        is_day:isNight?0:1, precipitation:v[3], rain:v[4], snowfall:kind==='snow'?v[3]:0,
        weather_code:code, cloud_cover:v[5], wind_speed_10m:v[6], wind_direction_10m:245, relative_humidity_2m:v[7] },
      daily:{ temperature_2m_max:[temp+3], temperature_2m_min:[temp-4], precipitation_probability_max:[kind==='rain'?85:kind==='storm'?95:kind==='snow'?65:kind==='cloudy'?28:5] }
    };
  }

  function stateFromData(data) {
    const c = data?.current || {};
    const code = n(c.weather_code);
    if (code === null) throw new Error('Weather source returned unusable conditions.');
    const isDay = n(c.is_day) === null ? true : Number(c.is_day) === 1;
    let kind = weatherKind(code, c);
    if (!isDay && kind === 'clear') kind = 'night';
    return { weather:kind, phase:isDay?'day':'night', isDay, code, cloudCover:n(c.cloud_cover) ?? 0, current:c, daily:data?.daily || {} };
  }

  function seedRandom(seed) {
    let value = seed >>> 0;
    return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  }

  function makeAtmosphere(canvas) {
    const context = canvas.getContext('2d', { alpha:false, desynchronized:true });
    if (!context) throw new Error('Canvas rendering is unavailable on this device.');
    let width=0,height=0,dpr=1,raf=0,last=0,elapsed=0,state=stateFromData(sampleData('clear'));
    let visible=!document.hidden, stopped=false, particles=[], stars=[], lightning=0,nextLightning=8;
    const random=seedRandom(24071991);
    const prefersReduced = reducedMotion();

    function resize() {
      const rect=canvas.getBoundingClientRect();
      width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      dpr=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      context.setTransform(dpr,0,0,dpr,0,0);
      particles=Array.from({length:Math.round(clamp(width*height/9000,50,260))},()=>({x:random()*width,y:random()*height,z:.35+random()*.9,speed:.35+random()*1.8,length:5+random()*16,drift:(random()-.5)*.8,size:.7+random()*1.4,phase:random()*Math.PI*2}));
      stars=Array.from({length:Math.round(clamp(width*height/9000,40,160))},()=>({x:random()*width,y:random()*height*.59,r:.3+random()*1.2,a:.25+random()*.55,p:random()*Math.PI*2}));
      draw(0);
    }

    function pathRidge(ctx, y, amplitude, phase, fill, opacity=1) {
      ctx.beginPath();ctx.moveTo(0,height);
      const step=width/7;
      const points=[];
      for(let i=0;i<=7;i++){
        const x=i*step;
        const wave=Math.sin(i*1.57+phase)*amplitude*.48+Math.sin(i*2.33+phase*.7)*amplitude*.22;
        points.push({x,y:y+wave});
      }
      ctx.lineTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++){
        const p0=points[i-1],p1=points[i];
        ctx.quadraticCurveTo((p0.x+p1.x)/2,p0.y-((i%2)?amplitude*.14:-amplitude*.12),p1.x,p1.y);
      }
      ctx.lineTo(width,height);ctx.closePath();ctx.globalAlpha=opacity;ctx.fillStyle=fill;ctx.fill();ctx.globalAlpha=1;
    }

    function cloud(ctx,x,y,scale,fill,alpha=1) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;ctx.fillStyle=fill;
      ctx.beginPath();ctx.moveTo(-76,18);ctx.bezierCurveTo(-98,12,-97,-20,-68,-24);ctx.bezierCurveTo(-60,-58,-13,-67,5,-36);ctx.bezierCurveTo(27,-65,77,-48,78,-16);ctx.bezierCurveTo(111,-8,108,29,76,31);ctx.lineTo(-70,31);ctx.closePath();ctx.fill();ctx.restore();
    }

    function tree(ctx,x,ground,scale,color) {
      ctx.save();ctx.translate(x,ground);ctx.scale(scale,scale);ctx.fillStyle=color;ctx.strokeStyle=color;
      ctx.fillRect(-2,-30,4,32);
      for(let i=0;i<4;i++){
        const y=-31+i*8,half=15-i*2.8;
        ctx.beginPath();ctx.moveTo(0,y-17);ctx.quadraticCurveTo(-half,y+1,-half*.68,y+1);ctx.lineTo(half*.68,y+1);ctx.quadraticCurveTo(half,y+1,0,y-17);ctx.fill();
      }
      ctx.restore();
    }

    function drawSky(ctx, p, t) {
      const gradient=ctx.createLinearGradient(0,0,0,height);
      gradient.addColorStop(0,p.sky1);gradient.addColorStop(.52,p.sky2);gradient.addColorStop(1,p.glow);
      ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      if(state.phase==='night'){ctx.fillStyle=state.weather==='night'?'rgba(8,18,43,.08)':'rgba(8,18,43,.48)';ctx.fillRect(0,0,width,height*.78);}
      const glow=ctx.createRadialGradient(width*.74,height*.2,4,width*.74,height*.2,Math.max(width,height)*.64);
      glow.addColorStop(0,p.glow+'88');glow.addColorStop(1,p.glow+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height*.85);
      if(state.phase==='night'){
        for(const s of stars){ctx.globalAlpha=s.a*(.72+.28*Math.sin(t*.8+s.p));ctx.fillStyle='#f5f3dc';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
      }
      const sunX=width*(state.phase==='night'?.78:.76),sunY=height*(state.phase==='night'?.22:.25),sunR=Math.min(width,height)*.052;
      const halo=ctx.createRadialGradient(sunX,sunY,sunR*.2,sunX,sunY,sunR*3.8);
      halo.addColorStop(0,state.phase==='night'?'rgba(226,237,243,.30)':'rgba(255,225,163,.44)');halo.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=halo;ctx.beginPath();ctx.arc(sunX,sunY,sunR*3.8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=state.phase==='night'?'#dce7e6':'#ffe9b7';ctx.globalAlpha=state.weather==='storm'?.55:state.weather==='fog'?.7:1;
      ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      const coverCount=Math.round(1+clamp(state.cloudCover,0,100)/18);
      const cloudCount=state.weather==='storm'?Math.max(6,coverCount):state.weather==='fog'?Math.max(5,coverCount):clamp(coverCount,1,7);
      for(let i=0;i<cloudCount;i++){
        const baseX=((i*width/(cloudCount-1||1)+t*(state.weather==='wind'?16:5)*(i%2?-1:1))%(width+240))-120;
        const y=height*(.18+(i%3)*.095);
        const scale=.42+(i%4)*.11+(state.weather==='storm'?.2:0);
        cloud(ctx,baseX,y,scale,p.cloud,state.weather==='clear'?.26:state.weather==='storm'?.64:state.weather==='fog'?.48:.48);
      }
    }

    function drawLandscape(ctx,t,p) {
      const horizon=height*(width/height>1.25?.57:.54);
      pathRidge(ctx,horizon-.12*height,.18*height,.4,p.far,.75);
      pathRidge(ctx,horizon+.015*height,.15*height,2.1,p.mid,.92);
      pathRidge(ctx,horizon+.13*height,.12*height,4.3,p.near,1);
      const waterTop=horizon+height*.18;
      const water=ctx.createLinearGradient(0,waterTop,0,height);
      water.addColorStop(0,p.water);water.addColorStop(1,state.phase==='night'?'#122d3d':'#244b51');
      ctx.fillStyle=water;ctx.fillRect(0,waterTop,width,height-waterTop);
      // Long, shifting reflected light streaks make the lake visibly alive.
      for(let i=0;i<28;i++){
        const y=waterTop+((i*19+t*(state.weather==='wind'?17:5))%(height-waterTop));
        const x=((i*73+t*(i%2?11:-8))%(width+120))-60;
        const length=(width*.025)+(i%5)*width*.012;
        ctx.globalAlpha=(.035+(i%4)*.014)*(state.weather==='storm'?.55:1);
        ctx.strokeStyle=i%3===0?'#e8e5d2':'#c4d8d3';ctx.lineWidth=1+(i%3)*.5;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y);ctx.stroke();
      }
      ctx.globalAlpha=1;
      // Banks and foreground silhouettes.
      pathRidge(ctx,height*.83,.045*height,1.8,state.weather==='snow'?'#819b9b':p.near,.96);
      const treeCount=Math.round(clamp(width/145,4,11));
      for(let i=0;i<treeCount;i++){
        const x=(i/(treeCount-1||1))*width+Math.sin(i*8.7)*12;
        const base=height*(.88+(i%3)*.018);
        tree(ctx,x,base,.55+(i%4)*.12,state.weather==='snow'?'#405b5b':'#172f33');
      }
      if(state.weather==='snow'){
        ctx.fillStyle='rgba(237,244,239,.78)';
        ctx.beginPath();ctx.moveTo(0,height*.82);ctx.quadraticCurveTo(width*.24,height*.79,width*.48,height*.84);ctx.quadraticCurveTo(width*.73,height*.79,width,height*.83);ctx.lineTo(width,height);ctx.lineTo(0,height);ctx.fill();
      }
      if(state.weather==='hot'){
        ctx.save();ctx.globalAlpha=.12;
        for(let i=0;i<8;i++){const y=height*(.58+i*.045);ctx.strokeStyle='#ffe7b2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,y+Math.sin(t+i)*3);ctx.bezierCurveTo(width*.3,y-5,width*.65,y+6,width,y+Math.sin(t*.7+i)*3);ctx.stroke();}
        ctx.restore();
      }
    }

    function drawWeather(ctx,dt,t,p) {
      if(state.weather==='rain'||state.weather==='storm'){
        const amount=state.weather==='storm'?particles.length:Math.round(particles.length*.55);
        ctx.strokeStyle=state.weather==='storm'?'rgba(224,239,244,.42)':'rgba(229,244,248,.34)';ctx.lineWidth=1;
        for(let i=0;i<amount;i++){
          const a=particles[i];a.y+=a.speed*(state.weather==='storm'?1.85:1.15)*dt*60;a.x+=(a.drift+2.4)*dt*60;
          if(a.y>height+20){a.y=-20;a.x=random()*width;}if(a.x>width+20)a.x=-20;
          ctx.globalAlpha=.2+a.z*.35;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x-3,a.y+a.length*a.z);ctx.stroke();
        }
        ctx.globalAlpha=1;
      } else if(state.weather==='snow') {
        ctx.fillStyle='rgba(255,255,250,.84)';
        for(const a of particles){a.y+=a.speed*.32*dt*60;a.x+=Math.sin(t+a.phase)*.32*dt*60+a.drift*.2;if(a.y>height+5){a.y=-5;a.x=random()*width;}if(a.x<0)a.x=width;if(a.x>width)a.x=0;ctx.globalAlpha=.35+a.z*.5;ctx.beginPath();ctx.arc(a.x,a.y,a.size*a.z,0,Math.PI*2);ctx.fill();}
        ctx.globalAlpha=1;
      } else if(state.weather==='wind') {
        for(let i=0;i<particles.length*.35;i++){
          const a=particles[i];a.x+= (1.8+a.speed)*dt*60;a.y+=Math.sin(t*1.8+a.phase)*.55;
          if(a.x>width+15){a.x=-15;a.y=random()*height*.8;}
          ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.sin(t+a.phase)*.8);ctx.strokeStyle='rgba(242,222,171,.72)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,5*a.z,2*a.z,.3,0,Math.PI*2);ctx.stroke();ctx.restore();
        }
      }
      if(state.weather==='fog'){
        for(let i=0;i<4;i++){
          const y=height*(.48+i*.11);const x=((t*(8+i*3)+i*width*.29)%(width+width*.5))-width*.25;
          const g=ctx.createLinearGradient(x-width*.3,y,x+width*.45,y+height*.025);g.addColorStop(0,'rgba(236,239,228,0)');g.addColorStop(.5,`rgba(237,242,231,${.16-i*.018})`);g.addColorStop(1,'rgba(236,239,228,0)');
          ctx.fillStyle=g;ctx.fillRect(0,y-height*.04,width,height*.1);
        }
      }
      if(state.weather==='storm'){
        nextLightning-=dt;
        if(nextLightning<=0){lightning=.9;nextLightning=5+random()*9;}
        if(lightning>0){ctx.fillStyle=`rgba(225,238,246,${Math.min(.23,lightning*.24)})`;ctx.fillRect(0,0,width,height);lightning=Math.max(0,lightning-dt*2.7);}
      } else {lightning=0;nextLightning=Math.max(nextLightning,3);}
    }

    function draw(dt) {
      if(!width||!height)return;
      const ctx=context,p=PALETTES[state.weather]||PALETTES.clear,t=elapsed;
      ctx.clearRect(0,0,width,height);
      drawSky(ctx,p,t);drawLandscape(ctx,t,p);drawWeather(ctx,dt,t,p);
      // Atmospheric veil softens the transition between sky, ridgelines and water.
      const veil=ctx.createLinearGradient(0,height*.42,0,height*.76);
      veil.addColorStop(0,'rgba(230,232,219,0)');veil.addColorStop(.55,state.weather==='fog'?'rgba(226,232,224,.34)':'rgba(230,232,219,.05)');veil.addColorStop(1,'rgba(230,232,219,0)');
      ctx.fillStyle=veil;ctx.fillRect(0,height*.42,width,height*.34);
    }

    function loop(now) {
      if(stopped||!visible||document.hidden||!isActive('weather')){raf=0;return;}
      if(now-last>=42){const delta=Math.min(.08,(now-last)/1000||.042);elapsed+=delta;last=now;draw(delta);}
      raf=requestAnimationFrame(loop);
    }
    function start(){if(stopped)return;visible=!document.hidden;if(prefersReduced){draw(0);return;}if(visible&&!raf){last=0;raf=requestAnimationFrame(loop);}}
    function stop(){stopped=true;if(raf)cancelAnimationFrame(raf);raf=0;observer?.disconnect();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('resize',onResize);}
    function onVisibility(){visible=!document.hidden;if(visible)start();else if(raf){cancelAnimationFrame(raf);raf=0;}}
    function onResize(){resize();}
    function setState(next){state=next||state;lightning=0;nextLightning=4+random()*5;draw(0);if(!prefersReduced)start();}
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
    observer?.observe(canvas);window.addEventListener('resize',onResize,{passive:true});document.addEventListener('visibilitychange',onVisibility);
    resize();start();
    return {setState,stop};
  }

  function activateWeather() {
    const view=mount('weather');
    if(!view)return;
    addStyles();
    const screen=createScreen();
    view.root.replaceChildren(screen);

    const canvas=screen.querySelector('canvas');
    let atmosphere;
    try { atmosphere=makeAtmosphere(canvas); }
    catch(error){
      const fallback=canvas.getContext('2d');
      if(fallback){fallback.fillStyle='#385565';fallback.fillRect(0,0,canvas.width,canvas.height);}
      console.error('[LIVE // EARTH] Weather atmosphere could not initialize.',error);
    }

    const dock=document.getElementById('le-feature-dock');
    function syncDockClearance(){
      if(!dock||dock.hidden||getComputedStyle(dock).display==='none'){
        screen.style.removeProperty('--le-weather-dock-clearance');return;
      }
      const d=dock.getBoundingClientRect(),s=screen.getBoundingClientRect();
      if(!(d.width>0)||!(d.height>0)||!Number.isFinite(d.top)){screen.style.removeProperty('--le-weather-dock-clearance');return;}
      screen.style.setProperty('--le-weather-dock-clearance',`${Math.ceil(Math.max(0,s.bottom-d.top)+14)}px`);
    }
    const dockObserver=dock&&typeof ResizeObserver==='function'?new ResizeObserver(syncDockClearance):null;
    dockObserver?.observe(dock);window.addEventListener('resize',syncDockClearance,{passive:true});window.addEventListener('orientationchange',syncDockClearance,{passive:true});syncDockClearance();

    let abortController=null,pollTimer=0,refreshTimer=0,clockTimer=0,disposed=false,requestSerial=0,lastFetch=0,manualPreview=false;
    const selector=screen.querySelector('#le-weather-preview-select');
    const stopPolling=()=>{if(pollTimer)clearInterval(pollTimer);pollTimer=0;};
    const setText=(key,value)=>{const node=$(screen,key);if(node)node.textContent=value;};

    function paint(data,preview=false){
      const state=stateFromData(data),c=state.current,d=state.daily;
      atmosphere?.setState(state);
      setText('temp',n(c.temperature_2m)===null?'—':String(Math.round(Number(c.temperature_2m))));
      setText('condition',conditionLabel(state.code,state.weather));
      setText('feels',n(c.apparent_temperature)===null?'':`Feels like ${Math.round(Number(c.apparent_temperature))}°`);
      const high=n(d.temperature_2m_max?.[0]),low=n(d.temperature_2m_min?.[0]);
      setText('range',`${high===null?'—':Math.round(high)+'°'} / ${low===null?'—':Math.round(low)+'°'}`);
      const rain=n(d.precipitation_probability_max?.[0]);setText('rain',rain===null?'—':`${Math.round(rain)}%`);
      const wind=n(c.wind_speed_10m);setText('wind',wind===null?'—':`${compass(c.wind_direction_10m)} ${Math.round(wind)} km/h`);
      const humidity=n(c.relative_humidity_2m);setText('humidity',humidity===null?'—':`${Math.round(humidity)}%`);
      setText('date',formatTime(c.time));
      screen.dataset.weather=state.weather;screen.dataset.phase=state.phase;screen.dataset.preview=preview?'true':'false';
      lastFetch=Date.now();
    }

    function showPreview(kind='clear',message='SAMPLE SCENE · Location is off.'){ 
      const data=sampleData(kind);paint(data,true);setText('status',message);setText('place','SCENE PREVIEW');
    }
    function showLocationOff(){showPreview('clear','Location is OFF · sample conditions, not live data.');}

    async function fetchLive(){
      if(disposed||!isActive('weather')||manualPreview)return;
      if(window.liveEarthLocationAllowed?.()!==true){showLocationOff();return;}
      if(navigator.onLine===false){showPreview('clear','OFFLINE · sample scene, not live conditions.');return;}
      const point=globe()?.getLocation?.(),lat=Number(point?.latitude),lon=Number(point?.longitude);
      if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lon)||lon < -180||lon>180){showLocationOff();return;}
      abortController?.abort();const controller=new AbortController();abortController=controller;const serial=++requestSerial;
      const query=new URLSearchParams({
        latitude:String(lat),longitude:String(lon),
        current:'temperature_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
        daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:'1',timezone:'auto',
        wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'
      });
      let timeout=window.setTimeout(()=>controller.abort(),16000);
      try{
        const response=await fetch(`${API_ROOT}?${query.toString()}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error(`Weather source returned ${response.status}.`);
        const data=await response.json();
        if(disposed||!isActive('weather')||serial!==requestSerial||window.liveEarthLocationAllowed?.()!==true)return;
        paint(data,false);setText('place','YOUR LOCATION');setText('status','LIVE CONDITIONS · OPEN-METEO');
      }catch(error){
        if(error?.name!=='AbortError'&&!disposed&&isActive('weather')&&window.liveEarthLocationAllowed?.()===true){
          showPreview('clear','LIVE DATA UNAVAILABLE · Showing a labelled sample scene.');
        }
      }finally{clearTimeout(timeout);if(abortController===controller)abortController=null;}
    }

    function pollForFix(){
      stopPolling();let remaining=24;
      pollTimer=window.setInterval(()=>{
        if(disposed||!isActive('weather')){stopPolling();return;}
        if(window.liveEarthLocationAllowed?.()!==true){stopPolling();showLocationOff();return;}
        const point=globe()?.getLocation?.();
        if(point&&Number.isFinite(Number(point.latitude))&&Number.isFinite(Number(point.longitude))){stopPolling();fetchLive();return;}
        if(--remaining<=0){stopPolling();showPreview('clear','WAITING FOR LOCATION · No fresh fix is available yet.');}
      },500);
    }

    function chooseMode(mode){
      manualPreview=mode!=='auto';
      if(mode==='auto'){
        if(window.liveEarthLocationAllowed?.()===true)fetchLive();else showLocationOff();
        return;
      }
      stopPolling();requestSerial++;abortController?.abort();abortController=null;
      showPreview(mode,`PREVIEW · ${mode.toUpperCase()} · SAMPLE VALUES, NOT A LIVE FORECAST.`);
    }
    function onLocationState(event){
      if(!isActive('weather'))return;
      if(event.detail?.enabled===true&&window.liveEarthLocationAllowed?.()===true&&!manualPreview)pollForFix();
      else if(window.liveEarthLocationAllowed?.()!==true&&!manualPreview){stopPolling();requestSerial++;abortController?.abort();abortController=null;showLocationOff();}
    }
    function onLocationStop(){stopPolling();requestSerial++;abortController?.abort();abortController=null;if(!manualPreview)showLocationOff();}
    function onOnline(){if(!manualPreview&&window.liveEarthLocationAllowed?.()===true)pollForFix();}
    function onOffline(){stopPolling();requestSerial++;abortController?.abort();abortController=null;if(!manualPreview)showPreview('clear','OFFLINE · sample scene, not live conditions.');}
    function onVisibility(){if(!document.hidden&&!manualPreview&&window.liveEarthLocationAllowed?.()===true&&Date.now()-lastFetch>REFRESH_MS)fetchLive();}
    function onModeChange(){chooseMode(selector.value);}
    function updateClock(){if(screen.isConnected&&screen.dataset.preview==='true')setText('date',formatTime(null));}

    selector.addEventListener('change',onModeChange);
    window.addEventListener('live-earth-location-state',onLocationState);
    window.addEventListener('live-earth-location-stop',onLocationStop);
    window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);
    document.addEventListener('visibilitychange',onVisibility);
    refreshTimer=window.setInterval(()=>{if(!disposed&&!document.hidden&&!manualPreview&&window.liveEarthLocationAllowed?.()===true)fetchLive();},REFRESH_MS);
    clockTimer=window.setInterval(updateClock,30000);updateClock();
    if(window.liveEarthLocationAllowed?.()===true)pollForFix();else showLocationOff();

    return () => {
      disposed=true;requestSerial++;stopPolling();
      if(refreshTimer)clearInterval(refreshTimer);if(clockTimer)clearInterval(clockTimer);
      abortController?.abort();abortController=null;atmosphere?.stop();
      selector.removeEventListener('change',onModeChange);
      window.removeEventListener('live-earth-location-state',onLocationState);
      window.removeEventListener('live-earth-location-stop',onLocationStop);
      window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);
      document.removeEventListener('visibilitychange',onVisibility);
      dockObserver?.disconnect();window.removeEventListener('resize',syncDockClearance);window.removeEventListener('orientationchange',syncDockClearance);
      screen.remove();document.getElementById(STYLE_ID)?.remove();
    };
  }

  runtime.registerFeature('weather',activateWeather);
})();
