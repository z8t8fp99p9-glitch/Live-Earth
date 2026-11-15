/* LIVE // EARTH — Weather: responsive 1:1 landmark world
   A layered 2.5D Canvas environment with an always-visible square hero composition.
   Preserves the shared Stacks runtime, Location permission boundary and Open-Meteo source.
   No second registry, dock, close control or external rendering library. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, isActive, globe } = runtime;
  const API = 'https://api.open-meteo.com/v1/forecast';
  const REFRESH_MS = 15 * 60 * 1000;
  const STYLE_ID = 'le-weather-world-style';
  const MASTER_SRC = new URL('./Weather/Art/weather-world-master-square.webp', document.baseURI).href;
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = v => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

  const MOODS = {
    dawn:   { sky:['#203a5b','#7895a5','#dfb28a'], mist:'#dce6dc', water:'#29495d', shade:.05 },
    day:    { sky:['#4c86a7','#a9c8cb','#f2d6ad'], mist:'#e7eee5', water:'#31586b', shade:0 },
    dusk:   { sky:['#263650','#9d7180','#efa979'], mist:'#e8cdbb', water:'#263e52', shade:.10 },
    night:  { sky:['#07172e','#1a344b','#3a5162'], mist:'#9cb1bb', water:'#101f36', shade:.54 },
    cloudy: { sky:['#445a68','#788f95','#b7bcb1'], mist:'#cbd7d5', water:'#294556', shade:.13 },
    rain:   { sky:['#293b4e','#5c7780','#99a9a5'], mist:'#c8d7d5', water:'#1e3c50', shade:.22 },
    storm:  { sky:['#152438','#354d5d','#687d81'], mist:'#9bacb2', water:'#142d42', shade:.43 },
    snow:   { sky:['#587d94','#a8c4c9','#e3e7dc'], mist:'#e6eee9', water:'#4c7181', shade:.08 },
    fog:    { sky:['#718b8d','#aebfba','#d8d9cb'], mist:'#e8ece0', water:'#526f76', shade:.11 },
    hot:    { sky:['#5f9cb0','#c4c5a7','#f0d09c'], mist:'#f2e0bf', water:'#527d7b', shade:.02 },
    wind:   { sky:['#3d7591','#9ebec0','#e8d2aa'], mist:'#dce8de', water:'#28566a', shade:.04 }
  };

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#142b3a!important;isolation:isolate;pointer-events:none}
      .le-sfv--weather>.le-sfv-panel{display:none!important}
      .le-weather-world{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:#172f42;color:#f8f7ef;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;contain:layout paint style}
      .le-weather-world *{box-sizing:border-box}
      .le-weather-world canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      .le-weather-world:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(4,18,31,.34),transparent 27%,transparent 63%,rgba(4,17,27,.48))}
      .le-wx-ui{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:calc(env(safe-area-inset-top) + clamp(18px,3.2vh,34px)) clamp(20px,5vw,54px) calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,142px));pointer-events:none}
      .le-wx-head{width:min(100%,520px);text-shadow:0 2px 22px rgba(8,20,31,.36)}
      .le-wx-brand{display:flex;align-items:center;gap:9px;font-size:9px;font-weight:760;letter-spacing:.24em;color:rgba(255,252,241,.78)}
      .le-wx-dot{width:7px;height:7px;border-radius:50%;background:#c2e6d2;box-shadow:0 0 12px rgba(194,230,210,.8)}
      .le-wx-place{margin-top:11px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,252,241,.92)}
      .le-wx-date{margin-top:5px;font-size:11px;letter-spacing:.035em;color:rgba(255,252,241,.72)}
      .le-wx-reading{display:flex;align-items:flex-start;gap:5px;margin-top:clamp(14px,2.8vh,28px)}
      .le-wx-temp{font-size:clamp(68px,17vw,112px);font-weight:230;line-height:.82;letter-spacing:-.085em;font-variant-numeric:tabular-nums}
      .le-wx-degree{font-size:clamp(23px,4vw,38px);font-weight:300;margin:3px 0 0 3px}
      .le-wx-condition{margin-top:12px;font-size:clamp(21px,4.5vw,34px);font-weight:420;letter-spacing:-.045em;line-height:1.05}
      .le-wx-feels{margin-top:7px;font-size:12px;color:rgba(255,252,241,.78);letter-spacing:.02em}
      .le-wx-bottom{width:min(100%,700px);pointer-events:auto;text-shadow:0 2px 18px rgba(8,20,31,.4)}
      .le-wx-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(8px,2vw,20px);padding-top:12px;border-top:1px solid rgba(255,252,241,.46)}
      .le-wx-label{font-size:8px;font-weight:760;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,252,241,.68)}
      .le-wx-value{margin-top:6px;font-size:clamp(12px,2.3vw,17px);font-weight:540;white-space:nowrap}
      .le-wx-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;color:rgba(255,252,241,.68);font-size:9px;letter-spacing:.055em}
      .le-wx-status{max-width:66%;line-height:1.4}
      .le-wx-scene{display:flex;align-items:center;gap:7px;pointer-events:auto}
      .le-wx-scene label{font-size:8px;font-weight:760;letter-spacing:.14em}
      .le-wx-scene select{max-width:112px;border:1px solid rgba(255,252,241,.42);border-radius:999px;background:rgba(12,31,46,.56);color:#fffdf4;padding:7px 9px;font:inherit;font-size:10px;outline:none;color-scheme:dark;backdrop-filter:blur(10px)}
      .le-wx-scene select:focus-visible{outline:2px solid #fffdf4;outline-offset:3px}
      @media(orientation:portrait){.le-wx-ui{padding-left:clamp(18px,5.5vw,30px);padding-right:clamp(18px,5.5vw,30px)}.le-wx-head{max-width:74%}.le-wx-temp{font-size:clamp(76px,20vw,112px)}.le-wx-condition{max-width:88%;font-size:clamp(22px,6vw,34px)}.le-wx-bottom{margin-top:auto}}
      @media(orientation:landscape){.le-wx-ui{padding-left:calc(env(safe-area-inset-left) + 20px);padding-right:calc(env(safe-area-inset-right) + 20px);padding-top:calc(env(safe-area-inset-top) + 12px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,112px))}.le-wx-head{width:clamp(170px,24vw,250px);max-width:30%}.le-wx-reading{margin-top:10px}.le-wx-temp{font-size:clamp(58px,9vw,84px)}.le-wx-condition{font-size:clamp(20px,3.3vw,27px);margin-top:9px}.le-wx-bottom{align-self:flex-start;width:clamp(170px,24vw,250px);max-width:30%}.le-wx-metrics{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:9px}.le-wx-footer{align-items:flex-start;flex-direction:column;margin-top:9px}}
      @media(max-height:440px) and (orientation:landscape){.le-wx-ui{padding-top:calc(env(safe-area-inset-top) + 7px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,84px))}.le-wx-brand{font-size:8px}.le-wx-place{margin-top:6px}.le-wx-reading{margin-top:7px}.le-wx-temp{font-size:clamp(48px,8vw,68px)}.le-wx-condition{font-size:18px;margin-top:6px}.le-wx-feels{margin-top:4px}.le-wx-metrics{gap:6px 11px;padding-top:8px}.le-wx-value{font-size:12px}.le-wx-footer{margin-top:6px}}
      @media(prefers-reduced-motion:reduce){.le-wx-dot{box-shadow:none}.le-wx-scene select{backdrop-filter:none}}
    `;
    document.head.appendChild(style);
  }

  function createScreen() {
    const el = document.createElement('main');
    el.className = 'le-weather-world';
    el.setAttribute('aria-label', 'Living mountain lake and live weather');
    el.innerHTML = `
      <canvas aria-hidden="true"></canvas>
      <div class="le-wx-ui">
        <header class="le-wx-head">
          <div class="le-wx-brand"><span class="le-wx-dot"></span><span>LIVE // EARTH · WEATHER</span></div>
          <div class="le-wx-place" data-wx="place">SCENE PREVIEW</div>
          <div class="le-wx-date" data-wx="date">—</div>
          <div class="le-wx-reading"><span class="le-wx-temp" data-wx="temp">20</span><span class="le-wx-degree">°</span></div>
          <div class="le-wx-condition" data-wx="condition">Clear sky</div>
          <div class="le-wx-feels" data-wx="feels">Feels like 19°</div>
        </header>
        <footer class="le-wx-bottom">
          <div class="le-wx-metrics">
            <div><div class="le-wx-label">Today</div><div class="le-wx-value" data-wx="range">— / —</div></div>
            <div><div class="le-wx-label">Rain chance</div><div class="le-wx-value" data-wx="rain">—</div></div>
            <div><div class="le-wx-label">Wind</div><div class="le-wx-value" data-wx="wind">—</div></div>
            <div><div class="le-wx-label">Humidity</div><div class="le-wx-value" data-wx="humidity">—</div></div>
          </div>
          <div class="le-wx-footer">
            <div class="le-wx-status" data-wx="status" role="status" aria-live="polite">Location is off · sample values</div>
            <div class="le-wx-scene"><label for="le-wx-scene-select">SCENE</label><select id="le-wx-scene-select" aria-label="Preview weather scene">
              <option value="auto">AUTO</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="hot">HEAT</option><option value="night">NIGHT</option>
            </select></div>
          </div>
        </footer>
      </div>`;
    return el;
  }

  const setText = (root, key, value) => { const node = root.querySelector(`[data-wx="${key}"]`); if (node) node.textContent = value; };
  function compass(deg) {
    const d = num(deg);
    return d === null ? '—' : ['N','NE','E','SE','S','SW','W','NW'][Math.round((((d % 360) + 360) % 360) / 45) % 8];
  }
  function formatDate(value) {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' });
  }
  function kindFor(code, current) {
    const wind = num(current.wind_speed_10m) || 0;
    const temp = num(current.temperature_2m);
    if (code === 0 && temp !== null && temp >= 34) return 'hot';
    if ([95,96,99].includes(code)) return 'storm';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([45,48].includes(code)) return 'fog';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
    if ([2,3].includes(code)) return 'cloudy';
    if (wind >= 34 && code <= 1) return 'wind';
    return 'clear';
  }
  function labelFor(code, kind) {
    const labels = {0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm · hail',99:'Severe thunderstorm'};
    if (kind === 'hot') return 'Heat over the lake';
    if (kind === 'wind') return 'Wind through the trees';
    if (kind === 'night') return 'Night over the mountains';
    return labels[code] || 'Weather conditions';
  }
  function sample(kind) {
    const values = {clear:[0,27,27,0,5,18,42],cloudy:[3,22,22,0,28,12,68],rain:[63,19,20,2.8,85,18,72],storm:[95,22,23,6.2,95,32,84],snow:[73,-2,-5,1.1,65,11,78],fog:[45,13,12,0,10,4,92],wind:[1,20,19,0,5,42,49],hot:[0,37,40,0,5,13,25],night:[0,17,16,0,3,5,58]};
    const v = values[kind] || values.clear;
    const now = new Date();
    return { current:{time:now.toISOString().slice(0,16),temperature_2m:v[1],apparent_temperature:v[2],is_day:kind === 'night' ? 0 : 1,weather_code:v[0],cloud_cover:v[4],wind_speed_10m:v[5],wind_direction_10m:245,relative_humidity_2m:v[6]}, daily:{temperature_2m_max:[v[1]+3],temperature_2m_min:[v[1]-4],precipitation_probability_max:[v[4]]} };
  }
  function parse(data) {
    const current = data?.current || {};
    const code = num(current.weather_code);
    if (code === null) throw new Error('Weather source returned unusable conditions.');
    const isDay = num(current.is_day) === null ? true : Number(current.is_day) === 1;
    let weather = kindFor(code, current);
    if (!isDay && weather === 'clear') weather = 'night';
    const sourceHour = current.time && String(current.time).includes('T') ? Number(String(current.time).slice(11,13)) : new Date().getHours();
    const hour = Number.isFinite(sourceHour) ? sourceHour : new Date().getHours();
    const phase = !isDay ? 'night' : hour < 7 ? 'dawn' : hour >= 17 ? 'dusk' : 'day';
    return { weather, phase, code, current, daily:data.daily || {}, cloud:num(current.cloud_cover) || 0, wind:num(current.wind_speed_10m) || 0 };
  }

  function createRenderer(canvas) {
    const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
    if (!ctx) throw new Error('Canvas rendering unavailable.');

    const master = new Image();
    const coreCanvas = document.createElement('canvas');
    const backdropCanvas = document.createElement('canvas');
    const backdropCtx = backdropCanvas.getContext('2d');
    let coreCacheReady = false, backdropKey = '';
    master.decoding = 'async';
    let imageReady = false;
    let w = 1, h = 1, dpr = 1, core = 1, coreX = 0, coreY = 0;
    let raf = 0, last = 0, time = 0, stopped = false, visible = !document.hidden;
    let state = parse(sample('clear'));
    let rain = [], snow = [], leaves = [], stars = [], fog = [], ripples = [];
    let flash = 0, nextFlash = 11, randomSeed = 463921;
    const reduced = reducedMotion();
    const rand = () => { randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0; return randomSeed / 4294967296; };

    function resetParticles() {
      rain = Array.from({length:clamp(Math.round(w*h/3600),70,320)}, () => ({x:rand()*w,y:rand()*h,z:.3+rand()*.9,s:280+rand()*520,len:8+rand()*20}));
      snow = Array.from({length:clamp(Math.round(w*h/8500),30,135)}, () => ({x:rand()*w,y:rand()*h,z:.35+rand()*.9,s:8+rand()*30,r:1+rand()*2.7,p:rand()*6.28}));
      leaves = Array.from({length:clamp(Math.round(w*h/18000),18,68)}, () => ({x:rand()*w,y:rand()*h,z:.4+rand()*.8,s:18+rand()*38,r:3+rand()*3.5,p:rand()*6.28,spin:(rand()-.5)*2}));
      stars = Array.from({length:clamp(Math.round(w*h/6500),35,140)}, () => ({x:rand()*w,y:rand()*h*.58,r:.4+rand()*1.1,p:rand()*6.28}));
      fog = Array.from({length:5}, (_,i) => ({x:rand()*w,y:coreY+core*.56+i*core*.025,z:.55+rand()*.9,a:.055+rand()*.055}));
      ripples = Array.from({length:18}, () => ({x:rand()*w,y:coreY+core*(.65+rand()*.31),r:8+rand()*22,p:rand()*6.28,rate:.18+rand()*.3}));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width); h = Math.max(1, rect.height);
      backdropKey = '';
      dpr = Math.min(1.8, window.devicePixelRatio || 1);
      canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      // The protected visual core is always a square sized from the shorter screen edge.
      core = Math.min(w,h)*.82;
      coreX = (w-core)/2; coreY = (h-core)/2;
      resetParticles(); draw(0);
    }

    function drawBackdrop(mood, t) {
      const key=[w,h,dpr,state.weather,state.phase,imageReady].join(':');
      if(backdropCtx&&key!==backdropKey){
        const bgRatio=Math.min(1,dpr);
        backdropCanvas.width=Math.max(1,Math.round(w*bgRatio));
        backdropCanvas.height=Math.max(1,Math.round(h*bgRatio));
        backdropCtx.setTransform(bgRatio,0,0,bgRatio,0,0);
        const grad=backdropCtx.createLinearGradient(0,0,0,h);
        grad.addColorStop(0,mood.sky[0]);grad.addColorStop(.56,mood.sky[1]);grad.addColorStop(1,mood.sky[2]);
        backdropCtx.fillStyle=grad;backdropCtx.fillRect(0,0,w,h);
        if(imageReady){
          const scale=Math.max(w/master.width,h/master.height)*1.28;
          const dw=master.width*scale,dh=master.height*scale;
          backdropCtx.save();backdropCtx.filter='blur(22px) saturate(1.12) brightness(.60)';backdropCtx.globalAlpha=.82;
          backdropCtx.drawImage(master,(w-dw)/2,(h-dh)/2,dw,dh);backdropCtx.restore();
        }
        backdropKey=key;
      }
      if(backdropCanvas.width&&backdropCanvas.height)ctx.drawImage(backdropCanvas,0,0,w,h);
      else {const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,mood.sky[0]);grad.addColorStop(.56,mood.sky[1]);grad.addColorStop(1,mood.sky[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);}

      // Orientation-aware extensions: side valleys in landscape, extra sky and lake in portrait.
      if (w > h) {
        const left = coreX, right = coreX+core;
        ctx.save();
        const edge = ctx.createLinearGradient(0,0,w,0);
        edge.addColorStop(0,'rgba(7,24,36,.22)'); edge.addColorStop(left/w,'rgba(7,24,36,0)');
        edge.addColorStop(right/w,'rgba(7,24,36,0)'); edge.addColorStop(1,'rgba(7,24,36,.18)');
        ctx.fillStyle = edge; ctx.fillRect(0,0,w,h);
        drawPines(left*.38,h*.70,core*.13, '#102f37', t, true);
        drawPines(right+(w-right)*.60,h*.69,core*.14, '#153a3d', t, true);
        ctx.restore();
      } else {
        const topFade = ctx.createLinearGradient(0,0,0,coreY+core*.18);
        topFade.addColorStop(0,'rgba(8,28,45,.06)'); topFade.addColorStop(1,'rgba(8,28,45,0)');
        ctx.fillStyle = topFade; ctx.fillRect(0,0,w,coreY+core*.18);
        const bottomY = coreY+core*.78;
        const waterFade = ctx.createLinearGradient(0,bottomY,0,h);
        waterFade.addColorStop(0,'rgba(17,51,65,0)'); waterFade.addColorStop(1,'rgba(8,31,46,.54)');
        ctx.fillStyle = waterFade; ctx.fillRect(0,bottomY,w,h-bottomY);
      }

      // Soft atmosphere bridges the square hero scene into its wider environment.
      const haze = ctx.createLinearGradient(0,coreY+core*.42,0,coreY+core*.80);
      haze.addColorStop(0,'rgba(226,236,227,0)'); haze.addColorStop(.48,mood.mist+'36'); haze.addColorStop(1,'rgba(226,236,227,0)');
      ctx.fillStyle = haze; ctx.fillRect(0,coreY+core*.38,w,core*.46);
    }

    function drawPines(x, ground, size, colour, t, cluster=false) {
      const count = cluster ? 7 : 3;
      for (let i=0;i<count;i++) {
        const spread = cluster ? (i-(count-1)/2)*size*.95 : (i-1)*size*1.4;
        const sx = x+spread, sy = ground+Math.sin(i*2.1)*size*.12, s = size*(.48+((i*17)%5)*.12);
        ctx.save(); ctx.translate(sx,sy);
        const sway = state.weather === 'wind' ? 0.052 : state.weather === 'storm' ? 0.038 : 0.018;
        ctx.rotate(Math.sin(t*.65+i)*sway);
        ctx.fillStyle = 'rgba(8,28,29,.48)'; ctx.fillRect(-s*1.8,-s*1.35,s*3.6,s*1.45);
        ctx.fillStyle = colour;
        for(let tier=0;tier<4;tier++){
          const yy=-s*5.3+tier*s*1.12, half=s*(2.55-tier*.35);
          ctx.beginPath(); ctx.moveTo(0,yy-s*1.6); ctx.lineTo(-half,yy+s*.7); ctx.quadraticCurveTo(0,yy+s*.25,half,yy+s*.7); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawClouds(t, density, mood, heavy=false) {
      const count = clamp(Math.round(2+density/14+(heavy?3:0)),2,10);
      for(let i=0;i<count;i++){
        const speed = heavy ? 13 : 5;
        const x = ((i*w/count+t*speed*(i%2?1:-1))%(w+core*.5)+w+core*.5)%(w+core*.5)-core*.25;
        const y = h*.08+(i%4)*h*.065;
        const scale = core*(.12+(i%3)*.035);
        const alpha = (heavy?.17:.07)+(density/100)*.12;
        const g = ctx.createRadialGradient(x,y,scale*.12,x,y,scale*1.75);
        g.addColorStop(0,`rgba(224,233,231,${alpha})`); g.addColorStop(.55,`rgba(204,219,221,${alpha*.62})`); g.addColorStop(1,'rgba(204,219,221,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,scale*1.7,scale*.48,0,0,Math.PI*2); ctx.fill();
      }
    }

    function drawCore(t, mood) {
      const ox = Math.sin(t*.13)*Math.min(2.4,core*.004), oy = Math.cos(t*.10)*Math.min(1.8,core*.003);
      if (imageReady) {
        ctx.save();
        ctx.shadowColor = 'rgba(5,17,28,.22)'; ctx.shadowBlur = core*.045;
        ctx.drawImage(coreCacheReady?coreCanvas:master,coreX+ox,coreY+oy,core,core);
        ctx.restore();
      } else drawFallbackCore(coreX+ox,coreY+oy,core,mood);

      // Colour response changes the atmosphere without swapping the world image.
      if (mood.shade>0) {
        const tint = ctx.createLinearGradient(0,coreY,0,coreY+core);
        tint.addColorStop(0,`rgba(9,24,43,${mood.shade*.72})`);
        tint.addColorStop(.62,`rgba(7,23,39,${mood.shade*.36})`);
        tint.addColorStop(1,`rgba(4,17,30,${mood.shade*.68})`);
        ctx.fillStyle=tint;ctx.fillRect(coreX,coreY,core,core);
      }
      if (state.weather==='storm') { ctx.fillStyle='rgba(14,28,43,.20)';ctx.fillRect(coreX,coreY,core,core); }
      if (state.weather==='snow') { ctx.fillStyle='rgba(205,225,230,.10)';ctx.fillRect(coreX,coreY,core,core); }
    }

    function drawFallbackCore(x,y,s,mood) {
      const g=ctx.createLinearGradient(0,y,0,y+s);g.addColorStop(0,mood.sky[1]);g.addColorStop(.55,'#405f67');g.addColorStop(1,'#173c4d');
      ctx.fillStyle=g;ctx.fillRect(x,y,s,s);
      ctx.save();ctx.translate(x,y);ctx.scale(s/1000,s/1000);
      const sun=ctx.createRadialGradient(760,190,18,760,190,260);sun.addColorStop(0,'rgba(255,226,164,.8)');sun.addColorStop(1,'rgba(255,226,164,0)');ctx.fillStyle=sun;ctx.fillRect(0,0,1000,1000);
      ctx.fillStyle='#5b7780';ctx.beginPath();ctx.moveTo(180,520);ctx.lineTo(500,145);ctx.lineTo(850,520);ctx.closePath();ctx.fill();
      ctx.fillStyle='#edf1e9';ctx.beginPath();ctx.moveTo(405,255);ctx.lineTo(500,145);ctx.lineTo(595,255);ctx.lineTo(548,240);ctx.lineTo(500,268);ctx.lineTo(453,240);ctx.closePath();ctx.fill();
      ctx.fillStyle='#284d4d';ctx.fillRect(0,510,1000,490);
      ctx.fillStyle='#31586b';ctx.fillRect(0,600,1000,400);
      ctx.fillStyle='#a72f2a';ctx.fillRect(252,440,24,250);ctx.fillRect(505,440,24,250);ctx.fillRect(205,414,372,26);ctx.fillRect(224,388,330,21);
      ctx.fillStyle='rgba(220,238,236,.42)';ctx.fillRect(0,690,1000,3);
      ctx.restore();
    }

    function drawFog(dt) {
      for(const bank of fog){
        bank.x += dt*(state.weather==='wind'?22:8)*bank.z;
        if(bank.x>w+core*.6)bank.x=-core*.6;
        const y=bank.y+Math.sin(time*.22+bank.z)*core*.012;
        const g=ctx.createRadialGradient(bank.x,y,core*.015,bank.x,y,core*.25);
        g.addColorStop(0,`rgba(226,237,231,${bank.a*1.8})`);g.addColorStop(1,'rgba(226,237,231,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(bank.x,y,core*.26*bank.z,core*.055*bank.z,0,0,Math.PI*2);ctx.fill();
      }
    }

    function drawWater(dt) {
      const waterTop=coreY+core*.62;
      ctx.save();ctx.globalAlpha=(state.weather==='rain'||state.weather==='storm') ? 0.55 : 0.32;
      for(const ripple of ripples){
        ripple.p+=dt*ripple.rate;
        const radius=ripple.r+(ripple.p%1)*core*.055;
        const alpha=(1-(ripple.p%1))*.26;
        ctx.strokeStyle=`rgba(226,239,232,${alpha})`;ctx.lineWidth=.8+(1-ripple.p%1)*.6;
        ctx.beginPath();ctx.ellipse(ripple.x,ripple.y,radius,radius*.22,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
      const shimmer=ctx.createLinearGradient(0,waterTop,0,h);
      shimmer.addColorStop(0,'rgba(203,224,218,.08)');shimmer.addColorStop(.55,'rgba(27,67,78,.04)');shimmer.addColorStop(1,'rgba(7,29,43,.20)');
      ctx.fillStyle=shimmer;ctx.fillRect(0,waterTop,w,h-waterTop);
    }

    function drawMapleLeaf(x,y,size,angle,alpha) {
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.fillStyle='#c84b34';ctx.strokeStyle='rgba(83,37,31,.44)';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.22,-size*.38);ctx.lineTo(size*.86,-size*.55);ctx.lineTo(size*.52,-size*.05);ctx.lineTo(size,-size*.02);ctx.lineTo(size*.38,size*.28);ctx.lineTo(size*.46,size*.86);ctx.lineTo(0,size*.48);ctx.lineTo(-size*.46,size*.86);ctx.lineTo(-size*.38,size*.28);ctx.lineTo(-size,size*.02);ctx.lineTo(-size*.52,-size*.05);ctx.lineTo(-size*.86,-size*.55);ctx.lineTo(-size*.22,-size*.38);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }

    function drawParticles(dt) {
      if(state.weather==='rain'||state.weather==='storm'){
        ctx.save();ctx.strokeStyle=state.weather==='storm'?'rgba(199,220,225,.50)':'rgba(204,226,229,.40)';ctx.lineCap='round';
        for(const drop of rain){drop.y+=drop.s*dt;drop.x-=drop.s*.12*dt;if(drop.y>h+20){drop.y=-20;drop.x=rand()*w;}if(drop.x<-20)drop.x=w+10;
          ctx.globalAlpha=.22+drop.z*.38;ctx.lineWidth=.55+drop.z*.8;ctx.beginPath();ctx.moveTo(drop.x,drop.y);ctx.lineTo(drop.x-drop.len*.22,drop.y+drop.len);ctx.stroke();}
        ctx.restore();
      }
      if(state.weather==='snow'){
        ctx.save();ctx.fillStyle='#f4f7f1';
        for(const flake of snow){flake.y+=flake.s*dt;flake.x+=Math.sin(time*.7+flake.p)*flake.z*10*dt;if(flake.y>h+8){flake.y=-8;flake.x=rand()*w;}if(flake.x<-8)flake.x=w+8;if(flake.x>w+8)flake.x=-8;ctx.globalAlpha=.36+flake.z*.5;ctx.beginPath();ctx.arc(flake.x,flake.y,flake.r*flake.z,0,Math.PI*2);ctx.fill();}
        ctx.restore();
      }
      if(state.weather==='wind'||state.weather==='hot'||state.weather==='clear'){
        const strength = state.weather === 'wind' ? 1.65 : state.weather === 'hot' ? 0.22 : 0.45;
        for(const leaf of leaves){leaf.x+=dt*(18+state.wind*.8)*strength*leaf.z;leaf.y+=Math.sin(time*.8+leaf.p)*dt*16*leaf.z;leaf.p+=dt*leaf.spin;if(leaf.x>w+30){leaf.x=-30;leaf.y=rand()*h;}drawMapleLeaf(leaf.x,leaf.y,leaf.r*leaf.z,leaf.p,.45*leaf.z);}
      }
      if(state.weather==='rain'||state.weather==='storm'){
        ctx.save();ctx.globalAlpha=.45;for(let i=0;i<2;i++){const x=rand()*w,y=coreY+core*(.7+rand()*.28);ctx.strokeStyle='rgba(218,236,235,.55)';ctx.beginPath();ctx.ellipse(x,y,5+rand()*12,2,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
      }
    }

    function drawNight(mood,t) {
      if(state.phase!=='night'&&state.weather!=='night')return;
      ctx.save();
      const moonX=w*.76,moonY=h*.17,r=Math.min(w,h)*.035;
      const halo=ctx.createRadialGradient(moonX,moonY,r*.2,moonX,moonY,r*5);halo.addColorStop(0,'rgba(200,224,237,.22)');halo.addColorStop(1,'rgba(200,224,237,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h*.55);
      ctx.fillStyle='rgba(226,237,238,.78)';ctx.beginPath();ctx.arc(moonX,moonY,r,0,Math.PI*2);ctx.fill();
      for(const star of stars){ctx.globalAlpha=.24+.42*Math.sin(t*.7+star.p);ctx.fillStyle='#f4f5e9';ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }

    function drawSnowCover() {
      if(state.weather!=='snow')return;
      ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle='#edf4f0';ctx.lineCap='round';ctx.lineJoin='round';
      ctx.lineWidth=Math.max(1.2,core*.009);
      // A light dusting catches the shrine roofline, nearby ridges and shore edges.
      ctx.beginPath();
      ctx.moveTo(coreX+core*.225,coreY+core*.405);
      ctx.quadraticCurveTo(coreX+core*.35,coreY+core*.382,coreX+core*.49,coreY+core*.404);
      ctx.moveTo(coreX+core*.06,coreY+core*.77);
      ctx.quadraticCurveTo(coreX+core*.12,coreY+core*.735,coreX+core*.19,coreY+core*.765);
      ctx.moveTo(coreX+core*.72,coreY+core*.76);
      ctx.quadraticCurveTo(coreX+core*.82,coreY+core*.735,coreX+core*.94,coreY+core*.77);
      ctx.stroke();ctx.restore();
    }

    function drawLightning(dt) {
      if(state.weather!=='storm')return;
      nextFlash-=dt;
      if(nextFlash<=0){flash=.18+rand()*.15;nextFlash=5+rand()*13;}
      if(flash>0){
        flash=Math.max(0,flash-dt);
        ctx.fillStyle=`rgba(220,239,244,${flash*1.05})`;ctx.fillRect(0,0,w,h);
        const startX=coreX+core*.72,startY=coreY+core*.05;
        ctx.save();ctx.strokeStyle=`rgba(238,248,249,${Math.min(.95,flash*4.8)})`;
        ctx.lineWidth=Math.max(1.4,core*.004);ctx.shadowColor='#e2f4f7';ctx.shadowBlur=core*.035;
        ctx.beginPath();ctx.moveTo(startX,startY);
        ctx.lineTo(startX-core*.035,startY+core*.105);
        ctx.lineTo(startX+core*.018,startY+core*.16);
        ctx.lineTo(startX-core*.06,startY+core*.255);
        ctx.stroke();ctx.restore();
      }
    }

    function draw(dt) {
      if(!w||!h)return;
      const baseMood=MOODS[state.weather]||MOODS.day;
      const mood=state.phase==='night'?{...baseMood,sky:MOODS.night.sky,shade:Math.max(baseMood.shade,.48)}:baseMood;
      drawBackdrop(mood,time);
      drawCore(time,mood);
      drawClouds(time,state.cloud,mood,state.weather==='storm'||state.weather==='rain');
      if(state.weather==='fog'||state.weather==='rain'||state.weather==='storm'||state.weather==='snow')drawFog(dt);
      drawWater(dt);
      drawSnowCover();
      drawNight(mood,time);
      drawParticles(dt);
      drawLightning(dt);
      if(state.weather==='hot'){
        const shimmer=ctx.createLinearGradient(0,coreY+core*.48,0,coreY+core*.78);
        shimmer.addColorStop(0,'rgba(255,221,165,0)');shimmer.addColorStop(.5,'rgba(255,222,164,.09)');shimmer.addColorStop(1,'rgba(255,221,165,0)');ctx.fillStyle=shimmer;ctx.fillRect(coreX,coreY+core*.45,core,core*.38);
      }
    }

    function loop(now) {
      if(stopped||!visible||document.hidden||!isActive('weather')){raf=0;return;}
      if(now-last>33){const dt=Math.min(.08,(now-last)/1000||.033);time+=dt;last=now;draw(dt);}
      raf=requestAnimationFrame(loop);
    }
    function start(){if(stopped)return;visible=!document.hidden;if(reduced){draw(0);return;}if(visible&&!raf){last=0;raf=requestAnimationFrame(loop);}}
    function setState(next){state=next||state;flash=0;nextFlash=3+rand()*8;draw(0);if(!reduced)start();}
    function onVisibility(){visible=!document.hidden;if(visible)start();else if(raf){cancelAnimationFrame(raf);raf=0;}}
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
    observer?.observe(canvas);
    window.addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',onVisibility);
    const onMasterLoad=()=>{
      imageReady=true;backdropKey='';
      try{
        const width=master.naturalWidth||master.width,height=master.naturalHeight||master.height;
        coreCanvas.width=width;coreCanvas.height=height;
        const coreCtx=coreCanvas.getContext('2d');
        coreCtx.drawImage(master,0,0,width,height);
        const pixels=coreCtx.getImageData(0,0,width,height),data=pixels.data,feather=Math.max(1,Math.round(Math.min(width,height)*.026));
        for(let y=0;y<height;y++){
          const fy=Math.min(1,y/feather,(height-1-y)/feather);
          for(let x=0;x<width;x++){
            const fx=Math.min(1,x/feather,(width-1-x)/feather),i=(y*width+x)*4;
            data[i+3]=Math.round(data[i+3]*clamp(Math.min(fx,fy),0,1));
          }
        }
        coreCtx.putImageData(pixels,0,0);coreCacheReady=true;
      }catch(error){coreCacheReady=false;console.warn('[LIVE // EARTH] Weather core feathering unavailable; using the source master.',error);}
      draw(0);
    };
    const onMasterError=()=>{imageReady=false;backdropKey='';draw(0);console.warn('[LIVE // EARTH] Weather master image unavailable; using procedural fallback.');};
    master.addEventListener('load',onMasterLoad,{once:true});
    master.addEventListener('error',onMasterError,{once:true});
    master.src=MASTER_SRC;
    resize();start();
    return {setState,stop(){stopped=true;if(raf)cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);master.removeEventListener('load',onMasterLoad);master.removeEventListener('error',onMasterError);}};
  }

  function activateWeather() {
    const view=mount('weather');
    if(!view)return;
    addStyles();
    const screen=createScreen();
    view.root.replaceChildren(screen);
    let renderer;
    try{renderer=createRenderer(screen.querySelector('canvas'));}
    catch(error){console.error('[LIVE // EARTH] Weather world renderer failed.',error);}

    const dock=document.getElementById('le-feature-dock');
    function syncDock(){
      if(!dock||dock.hidden||getComputedStyle(dock).display==='none'){screen.style.removeProperty('--le-weather-dock-clearance');return;}
      const dockRect=dock.getBoundingClientRect(),screenRect=screen.getBoundingClientRect();
      if(dockRect.width>0&&dockRect.height>0)screen.style.setProperty('--le-weather-dock-clearance',`${Math.ceil(Math.max(0,screenRect.bottom-dockRect.top)+14)}px`);
    }
    const dockObserver=dock&&typeof ResizeObserver==='function'?new ResizeObserver(syncDock):null;
    dockObserver?.observe(dock);
    window.addEventListener('resize',syncDock,{passive:true});
    window.addEventListener('orientationchange',syncDock,{passive:true});
    syncDock();

    let abort=null,poll=0,refresh=0,clock=0,disposed=false,serial=0,lastFetch=0,manual=false;
    const select=screen.querySelector('#le-wx-scene-select');
    const stopPoll=()=>{if(poll)clearInterval(poll);poll=0;};

    function paint(data,preview=false){
      const s=parse(data),c=s.current,d=s.daily;
      renderer?.setState(s);
      setText(screen,'temp',num(c.temperature_2m)===null?'—':String(Math.round(c.temperature_2m)));
      setText(screen,'condition',labelFor(s.code,s.weather));
      setText(screen,'feels',num(c.apparent_temperature)===null?'':`Feels like ${Math.round(c.apparent_temperature)}°`);
      const high=num(d.temperature_2m_max?.[0]),low=num(d.temperature_2m_min?.[0]);
      setText(screen,'range',`${high===null?'—':Math.round(high)+'°'} / ${low===null?'—':Math.round(low)+'°'}`);
      const chance=num(d.precipitation_probability_max?.[0]);
      setText(screen,'rain',chance===null?'—':`${Math.round(chance)}%`);
      const wind=num(c.wind_speed_10m);
      setText(screen,'wind',wind===null?'—':`${compass(c.wind_direction_10m)} ${Math.round(wind)} km/h`);
      const humidity=num(c.relative_humidity_2m);
      setText(screen,'humidity',humidity===null?'—':`${Math.round(humidity)}%`);
      setText(screen,'date',formatDate(c.time));
      screen.dataset.weather=s.weather;screen.dataset.phase=s.phase;screen.dataset.preview=preview?'true':'false';
      lastFetch=Date.now();
    }
    function preview(kind='clear',message='SAMPLE SCENE · Location is off.'){
      paint(sample(kind),true);setText(screen,'place','SCENE PREVIEW');setText(screen,'status',message);
    }
    function locationOff(){preview('clear','LOCATION OFF · Sample values, not a live forecast.');}

    async function fetchLive(){
      if(disposed||!isActive('weather')||manual)return;
      if(window.liveEarthLocationAllowed?.()!==true){locationOff();return;}
      if(navigator.onLine===false){preview('clear','OFFLINE · Sample scene, not live conditions.');return;}
      const point=globe()?.getLocation?.();
      const lat=Number(point?.latitude),lon=Number(point?.longitude);
      if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lon)||lon < -180||lon>180)return;
      abort?.abort();
      const controller=new AbortController();abort=controller;const id=++serial;
      const query=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:'temperature_2m,apparent_temperature,is_day,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,relative_humidity_2m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:'1',timezone:'auto',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
      const timeout=setTimeout(()=>controller.abort(),16000);
      try{
        const response=await fetch(`${API}?${query}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error(`Weather source ${response.status}`);
        const data=await response.json();
        if(disposed||!isActive('weather')||id!==serial||window.liveEarthLocationAllowed?.()!==true)return;
        paint(data,false);setText(screen,'place','YOUR LOCATION');setText(screen,'status','LIVE CONDITIONS · OPEN-METEO');
      }catch(error){
        if(error?.name!=='AbortError'&&!disposed&&isActive('weather'))preview('clear','LIVE DATA UNAVAILABLE · Labelled sample scene.');
      }finally{clearTimeout(timeout);if(abort===controller)abort=null;}
    }

    function pollForFix(){
      stopPoll();let tries=24;
      poll=setInterval(()=>{
        if(disposed||!isActive('weather')){stopPoll();return;}
        if(window.liveEarthLocationAllowed?.()!==true){stopPoll();locationOff();return;}
        const point=globe()?.getLocation?.();
        if(point&&Number.isFinite(Number(point.latitude))&&Number.isFinite(Number(point.longitude))){stopPoll();fetchLive();return;}
        if(--tries<=0){stopPoll();preview('clear','WAITING FOR LOCATION · No fresh fix yet.');}
      },500);
    }
    function choose(mode){
      manual=mode!=='auto';
      if(mode==='auto'){if(window.liveEarthLocationAllowed?.()===true)fetchLive();else locationOff();return;}
      stopPoll();serial++;abort?.abort();abort=null;
      preview(mode,`PREVIEW · ${mode.toUpperCase()} · SAMPLE VALUES, NOT A LIVE FORECAST.`);
    }
    function onLocation(event){
      if(!isActive('weather'))return;
      if(event.detail?.enabled===true&&window.liveEarthLocationAllowed?.()===true&&!manual)pollForFix();
      else if(window.liveEarthLocationAllowed?.()!==true&&!manual){stopPoll();serial++;abort?.abort();locationOff();}
    }
    function onStop(){stopPoll();serial++;abort?.abort();if(!manual)locationOff();}
    function onOnline(){if(!manual&&window.liveEarthLocationAllowed?.()===true)pollForFix();}
    function onOffline(){stopPoll();serial++;abort?.abort();if(!manual)preview('clear','OFFLINE · Sample scene, not live conditions.');}
    function onVisibility(){if(!document.hidden&&!manual&&window.liveEarthLocationAllowed?.()===true&&Date.now()-lastFetch>REFRESH_MS)fetchLive();}
    function updateClock(){if(screen.isConnected&&screen.dataset.preview==='true')setText(screen,'date',formatDate());}
    const onModeChange=()=>choose(select.value);

    select.addEventListener('change',onModeChange);
    window.addEventListener('live-earth-location-state',onLocation);
    window.addEventListener('live-earth-location-stop',onStop);
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);
    document.addEventListener('visibilitychange',onVisibility);
    refresh=setInterval(()=>{if(!disposed&&!document.hidden&&!manual&&window.liveEarthLocationAllowed?.()===true)fetchLive();},REFRESH_MS);
    clock=setInterval(updateClock,30000);updateClock();
    if(window.liveEarthLocationAllowed?.()===true)pollForFix();else locationOff();

    return ()=>{
      disposed=true;serial++;stopPoll();clearInterval(refresh);clearInterval(clock);abort?.abort();renderer?.stop();
      select.removeEventListener('change',onModeChange);
      window.removeEventListener('live-earth-location-state',onLocation);
      window.removeEventListener('live-earth-location-stop',onStop);
      window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);
      document.removeEventListener('visibilitychange',onVisibility);
      dockObserver?.disconnect();window.removeEventListener('resize',syncDock);window.removeEventListener('orientationchange',syncDock);
      screen.remove();document.getElementById(STYLE_ID)?.remove();
    };
  }

  runtime.registerFeature('weather',activateWeather);
})();
