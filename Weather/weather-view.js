/* LIVE // EARTH — Weather: Japanese living landscape
   Procedural Canvas environment with weather-driven motion.
   Preserves the Stacks feature runtime, location permission boundary and Open-Meteo source.
   No external imagery, libraries, second registry, dock or close control. */
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
  const STYLE_ID = 'le-weather-japanese-world-style';
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = v => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

  const PALETTES = {
    dawn:  { sky:['#344b68','#b77e83','#f0bd91'], sun:'#ffe0ad', far:'#81949a', mid:'#526f70', near:'#294c4b', water:'#315d68', mist:'#f3d6c0' },
    day:   { sky:['#5796b0','#a8c6bd','#e7d5b1'], sun:'#fff0c4', far:'#8ba9a4', mid:'#557b70', near:'#294e43', water:'#477c83', mist:'#e8eee0' },
    dusk:  { sky:['#3a4566','#a66f83','#e9a47f'], sun:'#ffd2a0', far:'#7b8795', mid:'#53636f', near:'#293f4e', water:'#344e66', mist:'#e5c2bb' },
    night: { sky:['#101b36','#263e5a','#40586a'], sun:'#e0e9ee', far:'#536a7b', mid:'#354f5b', near:'#1b3540', water:'#172f49', mist:'#9aafbd' },
    rain:  { sky:['#344a5d','#607b83','#9ba9a2'], sun:'#c7d3d0', far:'#718b8e', mid:'#476568', near:'#233f43', water:'#2d5965', mist:'#cbd8d4' },
    storm: { sky:['#1e2b42','#405767','#71848a'], sun:'#aebdc0', far:'#536c78', mid:'#344e59', near:'#192f39', water:'#203f51', mist:'#9eafb3' },
    snow:  { sky:['#668ca4','#b7c9cb','#e4e9dc'], sun:'#f4f2e7', far:'#9fb7bb', mid:'#6f9291', near:'#466a68', water:'#648a95', mist:'#f1f3e9' },
    fog:   { sky:['#819a9d','#b9c8bd','#dfe0cd'], sun:'#eee9d2', far:'#a4b6ae', mid:'#7c9a8e', near:'#536f66', water:'#789a99', mist:'#edf0df' },
    hot:   { sky:['#6ca9bd','#d0c3a0','#f0d29e'], sun:'#ffdd99', far:'#aa9a7d', mid:'#8b8066', near:'#5c6550', water:'#648b88', mist:'#f3dfbb' },
    wind:  { sky:['#508ca7','#b4cbbb','#e9d5ac'], sun:'#ffe2a8', far:'#829f99', mid:'#52766b', near:'#254a40', water:'#447b82', mist:'#e5e9d8' }
  };

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .le-sfv--weather{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#172b39!important;isolation:isolate;pointer-events:none}
      .le-sfv--weather>.le-sfv-panel{display:none!important}
      .le-weather-jp{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:#203b4a;color:#fffaf0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;contain:layout paint style}
      .le-weather-jp *{box-sizing:border-box}
      .le-weather-jp canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      .le-weather-jp:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(8,20,34,.42),transparent 36%,rgba(8,20,30,.05) 58%,rgba(5,17,26,.68));z-index:1}
      .le-jp-ui{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:calc(env(safe-area-inset-top) + clamp(24px,4vh,44px)) clamp(23px,5vw,64px) calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,142px));pointer-events:none}
      .le-jp-top{max-width:min(100%,700px);text-shadow:0 2px 24px #14233166}
      .le-jp-brand{display:flex;align-items:center;gap:10px;font-size:10px;font-weight:750;letter-spacing:.24em;color:#f8f2e4c9}
      .le-jp-dot{width:7px;height:7px;border-radius:50%;background:#b7e4c7;box-shadow:0 0 12px #b7e4c7}
      .le-jp-place{margin-top:14px;font-size:clamp(12px,1.7vw,15px);font-weight:650;letter-spacing:.16em;text-transform:uppercase;color:#fff9eddb}
      .le-jp-date{margin-top:5px;font-size:12px;letter-spacing:.035em;color:#fff9edb8}
      .le-jp-reading{margin-top:clamp(24px,4vh,42px);display:flex;align-items:flex-start;gap:8px}
      .le-jp-temp{font-size:clamp(92px,23vw,154px);font-weight:220;line-height:.82;letter-spacing:-.09em;font-variant-numeric:tabular-nums}
      .le-jp-degree{font-size:clamp(29px,5vw,46px);font-weight:300;margin:5px 0 0 4px}
      .le-jp-condition{margin-top:17px;font-size:clamp(27px,5.4vw,43px);font-weight:380;letter-spacing:-.045em;line-height:1.05}
      .le-jp-feels{margin-top:9px;font-size:14px;color:#fff9edc9;letter-spacing:.025em}
      .le-jp-bottom{width:min(100%,740px);pointer-events:auto;text-shadow:0 2px 18px #14233166}
      .le-jp-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(9px,2.2vw,26px);padding-top:15px;border-top:1px solid #fff9ed66}
      .le-jp-label{font-size:9px;font-weight:750;letter-spacing:.18em;text-transform:uppercase;color:#fff9edaa}
      .le-jp-value{margin-top:7px;font-size:clamp(14px,2.6vw,20px);font-weight:520;white-space:nowrap}
      .le-jp-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;color:#fff9edaa;font-size:10px;letter-spacing:.07em}
      .le-jp-status{max-width:65%;line-height:1.45}
      .le-jp-scene{display:flex;align-items:center;gap:8px;pointer-events:auto}
      .le-jp-scene label{font-size:9px;font-weight:750;letter-spacing:.16em}
      .le-jp-scene select{max-width:122px;border:1px solid #fff9ed55;border-radius:999px;background:#10263866;color:#fffaf0;padding:7px 10px;font:inherit;font-size:11px;outline:none;color-scheme:dark}
      .le-jp-scene select:focus-visible{outline:2px solid #fffaf0;outline-offset:3px}
      @media(orientation:portrait){.le-jp-ui{padding-left:clamp(22px,6vw,34px);padding-right:clamp(22px,6vw,34px)}.le-jp-top{max-width:82%}.le-jp-temp{font-size:clamp(106px,27vw,154px)}.le-jp-condition{max-width:82%;font-size:clamp(29px,8vw,42px)}.le-jp-bottom{margin-top:auto}}
      @media(orientation:landscape){.le-jp-ui{padding-left:calc(env(safe-area-inset-left) + 5vw);padding-right:calc(env(safe-area-inset-right) + 5vw);padding-top:calc(env(safe-area-inset-top) + 18px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,118px))}.le-jp-top,.le-jp-bottom{width:44%;max-width:530px}.le-jp-reading{margin-top:16px}.le-jp-temp{font-size:clamp(82px,14vw,132px)}.le-jp-condition{font-size:clamp(25px,4vw,38px);margin-top:12px}.le-jp-metrics{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:10px}.le-jp-footer{margin-top:10px}}
      @media(max-height:480px) and (orientation:landscape){.le-jp-ui{padding-top:calc(env(safe-area-inset-top) + 9px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--le-weather-dock-clearance,94px))}.le-jp-reading{margin-top:10px}.le-jp-temp{font-size:clamp(65px,12vw,94px)}.le-jp-condition{font-size:22px;margin-top:8px}.le-jp-metrics{gap:7px 16px}.le-jp-value{font-size:14px}}
      @media(prefers-reduced-motion:reduce){.le-jp-dot{box-shadow:none}}
    `;
    document.head.appendChild(s);
  }

  function createScreen() {
    const el = document.createElement('main');
    el.className = 'le-weather-jp';
    el.setAttribute('aria-label','Japanese living landscape and live weather');
    el.innerHTML = `
      <canvas aria-hidden="true"></canvas>
      <div class="le-jp-ui">
        <header class="le-jp-top">
          <div class="le-jp-brand"><span class="le-jp-dot"></span><span>LIVE // EARTH · WEATHER</span></div>
          <div class="le-jp-place" data-wx="place">SCENE PREVIEW</div>
          <div class="le-jp-date" data-wx="date">—</div>
          <div class="le-jp-reading"><span class="le-jp-temp" data-wx="temp">20</span><span class="le-jp-degree">°</span></div>
          <div class="le-jp-condition" data-wx="condition">Wind across the land</div>
          <div class="le-jp-feels" data-wx="feels">Feels like 19°</div>
        </header>
        <footer class="le-jp-bottom">
          <div class="le-jp-metrics">
            <div><div class="le-jp-label">Today</div><div class="le-jp-value" data-wx="range">— / —</div></div>
            <div><div class="le-jp-label">Rain chance</div><div class="le-jp-value" data-wx="rain">—</div></div>
            <div><div class="le-jp-label">Wind</div><div class="le-jp-value" data-wx="wind">—</div></div>
            <div><div class="le-jp-label">Humidity</div><div class="le-jp-value" data-wx="humidity">—</div></div>
          </div>
          <div class="le-jp-footer">
            <div class="le-jp-status" data-wx="status" role="status" aria-live="polite">Location is off · sample scene</div>
            <div class="le-jp-scene"><label for="le-jp-scene-select">Scene</label><select id="le-jp-scene-select" aria-label="Preview weather scene">
              <option value="auto">AUTO</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="hot">HEAT</option><option value="night">NIGHT</option>
            </select></div>
          </div>
        </footer>
      </div>`;
    return el;
  }

  const setText = (root,key,value) => { const node=root.querySelector(`[data-wx="${key}"]`); if(node) node.textContent=value; };
  function compass(deg) { const d=num(deg); return d===null?'—':['N','NE','E','SE','S','SW','W','NW'][Math.round((((d%360)+360)%360)/45)%8]; }
  function formatDate(value) { const d=value?new Date(value):new Date(); return Number.isNaN(d.getTime())?'—':d.toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}); }
  function kindFor(code,c) {
    const wind=num(c.wind_speed_10m)||0, temp=num(c.temperature_2m);
    if(code===0&&temp!==null&&temp>=34)return 'hot';
    if([95,96,99].includes(code))return 'storm';
    if([71,73,75,77,85,86].includes(code))return 'snow';
    if([45,48].includes(code))return 'fog';
    if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return 'rain';
    if([2,3].includes(code))return 'cloudy';
    if(wind>=34&&code<=1)return 'wind';
    return 'clear';
  }
  function labelFor(code,kind) {
    const labels={0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm · hail',99:'Severe thunderstorm'};
    if(kind==='hot')return 'Heat over the valley';
    if(kind==='wind')return 'Wind through the pines';
    if(kind==='night')return 'Moon over the mountains';
    return labels[code]||'Weather conditions';
  }
  function sample(kind) {
    const values={clear:[0,27,27,0,5,18,42],cloudy:[3,22,22,0,28,12,68],rain:[63,19,20,2.8,85,18,72],storm:[95,22,23,6.2,95,32,84],snow:[73,-2,-5,1.1,65,11,78],fog:[45,13,12,0,10,4,92],wind:[1,20,19,0,5,42,49],hot:[0,37,40,0,5,13,25],night:[0,17,16,0,3,5,58]};
    const v=values[kind]||values.clear,now=new Date();
    return {current:{time:now.toISOString().slice(0,16),temperature_2m:v[1],apparent_temperature:v[2],is_day:kind==='night'?0:1,weather_code:v[0],cloud_cover:v[4],wind_speed_10m:v[5],wind_direction_10m:245,relative_humidity_2m:v[6]},daily:{temperature_2m_max:[v[1]+3],temperature_2m_min:[v[1]-4],precipitation_probability_max:[v[4]]}};
  }
  function parse(data) {
    const c=data?.current||{},code=num(c.weather_code);
    if(code===null)throw new Error('Weather source returned unusable conditions.');
    const isDay=num(c.is_day)===null?true:Number(c.is_day)===1;
    let weather=kindFor(code,c);if(!isDay&&weather==='clear')weather='night';
    return {weather,phase:isDay?'day':'night',code,current:c,daily:data.daily||{},cloud:num(c.cloud_cover)||0};
  }

  function createRenderer(canvas) {
    const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
    if(!ctx)throw new Error('Canvas rendering unavailable.');
    let w=1,h=1,dpr=1,raf=0,last=0,time=0,stopped=false,visible=!document.hidden;
    let state=parse(sample('clear')),drops=[],petals=[],stars=[],fogBanks=[],lightning=0,flashIn=8;
    let randomSeed=918273;
    const rand=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
    const reduced=reducedMotion();

    function resize() {
      const r=canvas.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);dpr=Math.min(2,devicePixelRatio||1);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=clamp(Math.round(w*h/6500),55,220);
      drops=Array.from({length:count},()=>({x:rand()*w,y:rand()*h,z:.35+rand()*.9,s:1+rand()*2.5,len:5+rand()*15}));
      petals=Array.from({length:Math.round(clamp(w*h/12500,24,90))},()=>({x:rand()*w,y:rand()*h,z:.4+rand()*.8,r:2+rand()*3,a:rand()*6.28,spin:(rand()-.5)*2}));
      stars=Array.from({length:Math.round(clamp(w*h/7500,35,150))},()=>({x:rand()*w,y:rand()*h*.6,r:.3+rand()*1.1,p:rand()*6.28}));
      fogBanks=Array.from({length:5},(_,i)=>({x:rand()*w,y:h*(.39+i*.095),scale:.7+rand()*.8,alpha:.08+rand()*.08}));
      draw(0);
    }
    function pathMountain(points,fill) {
      ctx.beginPath();ctx.moveTo(points[0][0],h);
      ctx.lineTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.quadraticCurveTo((points[i-1][0]+points[i][0])/2,points[i-1][1],points[i][0],points[i][1]);
      ctx.lineTo(w,h);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    }
    function pine(x,y,size,color,sway=0) {
      ctx.save();ctx.translate(x,y);ctx.rotate(sway);ctx.scale(size,size);
      ctx.fillStyle=color;ctx.fillRect(-1.4,-24,2.8,26);
      for(let i=0;i<4;i++){const yy=-27+i*7,half=10-i*1.5;ctx.beginPath();ctx.moveTo(0,yy-12);ctx.lineTo(-half,yy+4);ctx.lineTo(half,yy+4);ctx.closePath();ctx.fill();}
      ctx.restore();
    }
    function drawFuji(baseY,scale,color) {
      const peakX=w*.52,peakY=baseY-h*.43,half=w*scale;
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(peakX-half,baseY);ctx.lineTo(peakX,peakY);ctx.lineTo(peakX+half,baseY);ctx.closePath();ctx.fill();
      const cap=half*.35;
      ctx.fillStyle=state.weather==='snow'?'#f7f6eb':'#e9e7dc';
      ctx.beginPath();ctx.moveTo(peakX-cap,peakY+cap*.53);ctx.lineTo(peakX,peakY);ctx.lineTo(peakX+cap,peakY+cap*.53);
      ctx.lineTo(peakX+cap*.55,peakY+cap*.34);ctx.lineTo(peakX+cap*.28,peakY+cap*.5);ctx.lineTo(peakX,peakY+cap*.28);ctx.lineTo(peakX-cap*.28,peakY+cap*.5);ctx.lineTo(peakX-cap*.55,peakY+cap*.34);ctx.closePath();ctx.fill();
    }
    function drawTorii(x,y,scale,color) {
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(-20,-39);ctx.moveTo(20,0);ctx.lineTo(20,-39);ctx.stroke();
      ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-34,-39);ctx.quadraticCurveTo(0,-47,34,-39);ctx.stroke();
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-25,-31);ctx.lineTo(25,-31);ctx.stroke();ctx.restore();
    }
    function cloud(x,y,scale,color,alpha,drift) {
      const xx=((x+drift)%(w+220)+w+220)%(w+220)-110;
      ctx.save();ctx.translate(xx,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;ctx.fillStyle=color;
      ctx.beginPath();ctx.moveTo(-75,16);ctx.bezierCurveTo(-104,8,-94,-22,-65,-24);ctx.bezierCurveTo(-57,-56,-17,-64,4,-35);ctx.bezierCurveTo(30,-62,74,-47,77,-15);ctx.bezierCurveTo(108,-7,104,26,72,29);ctx.lineTo(-70,29);ctx.closePath();ctx.fill();ctx.restore();
    }
    function sky(p,t) {
      const hour=new Date().getHours(),phase=state.phase==='night'?'night':hour<7?'dawn':hour>=17?'dusk':'day';
      const colors=phase==='night'?PALETTES.night:phase==='dawn'?PALETTES.dawn:phase==='dusk'?PALETTES.dusk:p;
      const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,colors.sky[0]);g.addColorStop(.56,colors.sky[1]);g.addColorStop(1,colors.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      const sx=w*.76,sy=h*(phase==='night'?.22:.25),sr=Math.min(w,h)*.047;
      const halo=ctx.createRadialGradient(sx,sy,sr*.3,sx,sy,sr*5);halo.addColorStop(0,colors.sun+'66');halo.addColorStop(1,colors.sun+'00');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h*.78);
      ctx.fillStyle=colors.sun;ctx.globalAlpha=state.weather==='storm'?.55:1;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(phase==='night'){for(const s of stars){ctx.globalAlpha=.4+.35*Math.sin(t*.6+s.p);ctx.fillStyle='#f7f4e9';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
      const n=clamp(Math.round(1+state.cloud/17),1,7)+(state.weather==='storm'?3:0);
      for(let i=0;i<n;i++)cloud(i*w/(n||1),h*(.16+(i%3)*.09),.48+(i%4)*.12,colors.sky[2],state.weather==='clear'?.17:state.weather==='storm'?.58:.35,t*(state.weather==='wind'?18:state.weather==='storm'?9:4)*(i%2?1:-1));
    }
    function ridge(points, fill, shade, softness=0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0,h);
      ctx.lineTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++){
        const prev=points[i-1],cur=points[i];
        ctx.quadraticCurveTo((prev[0]+cur[0])/2,prev[1],cur[0],cur[1]);
      }
      ctx.lineTo(w,h);ctx.closePath();
      const g=ctx.createLinearGradient(0,Math.min(...points.map(q=>q[1])),0,h);
      g.addColorStop(0,fill);g.addColorStop(1,shade||fill);
      ctx.fillStyle=g;ctx.fill();
      if(softness>0){ctx.globalAlpha=softness;ctx.strokeStyle='#e8eee5';ctx.lineWidth=12;ctx.stroke();}
      ctx.restore();
    }
    function mountainRange(base, peakX, peakY, width, color, snow=false) {
      ctx.save();
      const left=peakX-width*.58,right=peakX+width*.62;
      const g=ctx.createLinearGradient(peakX-width*.3,peakY,peakX+width*.4,base);
      g.addColorStop(0,'#d5d8d0');g.addColorStop(.24,color);g.addColorStop(1,color);
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(left,base);
      ctx.lineTo(peakX-width*.28,peakY+width*.22);
      ctx.lineTo(peakX-width*.10,peakY+width*.13);
      ctx.lineTo(peakX,peakY);
      ctx.lineTo(peakX+width*.13,peakY+width*.12);
      ctx.lineTo(peakX+width*.29,peakY+width*.18);
      ctx.lineTo(right,base);ctx.closePath();ctx.fill();
      // Broken snow and exposed rock bands follow the mountain's irregular shoulders.
      if(snow||state.weather==='snow'){
        ctx.fillStyle='#e9eee7';ctx.globalAlpha=.78;ctx.beginPath();
        ctx.moveTo(peakX-width*.16,peakY+width*.16);
        ctx.lineTo(peakX-width*.10,peakY+width*.13);
        ctx.lineTo(peakX,peakY+4);
        ctx.lineTo(peakX+width*.09,peakY+width*.10);
        ctx.lineTo(peakX+width*.16,peakY+width*.16);
        ctx.lineTo(peakX+width*.08,peakY+width*.13);
        ctx.lineTo(peakX+width*.025,peakY+width*.19);
        ctx.lineTo(peakX-width*.04,peakY+width*.14);
        ctx.closePath();ctx.fill();ctx.globalAlpha=1;
      }
      // A few broad, translucent rock faces break the flat polygon silhouette.
      ctx.globalAlpha=.12;ctx.fillStyle='#203d45';ctx.beginPath();
      ctx.moveTo(peakX,peakY);ctx.lineTo(peakX+width*.13,peakY+width*.12);
      ctx.lineTo(peakX+width*.29,base);ctx.lineTo(peakX+width*.04,base);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    function forestBand(y, spacing, color, scale, phase, t, detail=true) {
      for(let i=-2;i<Math.ceil(w/spacing)+2;i++){
        const seed=i*17+phase;
        const x=i*spacing+((seed*13)%spacing);
        const height=scale*(.72+((seed*7)%11)/18);
        const sway=state.weather==='wind'?Math.sin(t*1.1+i*.7)*.018:Math.sin(t*.35+i)*.003;
        ctx.save();ctx.translate(x,y+Math.sin(i*2.13+phase)*scale*.12);ctx.rotate(sway);
        ctx.fillStyle=color;
        // Irregular layered pine crowns, not repeated triangular icons.
        for(let k=0;k<4;k++){
          const yy=-height*(.88-k*.17),ww=height*(.30+k*.09),hh=height*.27;
          ctx.beginPath();ctx.moveTo(0,yy-hh*.52);
          ctx.bezierCurveTo(-ww*.55,yy-hh*.2,-ww*1.08,yy+hh*.35,-ww*.92,yy+hh*.55);
          ctx.quadraticCurveTo(0,yy+hh*.32,ww*.92,yy+hh*.55);
          ctx.bezierCurveTo(ww*1.08,yy+hh*.35,ww*.55,yy-hh*.2,0,yy-hh*.52);
          ctx.fill();
        }
        ctx.fillRect(-height*.035,-height*.16,height*.07,height*.2);
        if(detail){ctx.globalAlpha=.18;ctx.strokeStyle='#d2d8c9';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-height*.22,-height*.48);ctx.lineTo(0,-height*.67);ctx.lineTo(height*.18,-height*.43);ctx.stroke();}
        ctx.restore();
      }
    }
    function landscape(p,t) {
      const portrait=h>w*1.05;
      const horizon=h*(portrait?.55:.52);
      const waterY=h*(portrait?.79:.70);
      // Atmospheric distance: a sequence of ridges fading into the valley.
      ridge([[0,horizon*.94],[w*.12,horizon*.79],[w*.24,horizon*.88],[w*.38,horizon*.68],[w*.53,horizon*.82],[w*.69,horizon*.66],[w*.83,horizon*.84],[w,horizon*.73]],p.far,'#344f58',.08);
      ridge([[0,horizon*1.08],[w*.13,horizon*.91],[w*.27,horizon*1.02],[w*.43,horizon*.83],[w*.58,horizon*.99],[w*.76,horizon*.82],[w*.9,horizon*.96],[w,horizon*.86]],p.mid,'#294a4b',.04);
      // The dominant mountain sits away from the information column in both orientations.
      const mx=portrait?w*.70:w*.70;
      const mw=portrait?w*.78:w*.50;
      mountainRange(horizon*1.24,mx,horizon*.28,mw,p.far,state.weather==='snow');
      // Sunlight breaks across slopes as a soft, directional wash.
      const light=ctx.createLinearGradient(mx-mw*.45,horizon*.1,mx+mw*.4,horizon*1.2);
      light.addColorStop(0,'#fff4d0');light.addColorStop(.42,'#fff4d000');light.addColorStop(1,'#172d3900');
      ctx.globalAlpha=state.weather==='storm'?.06:state.weather==='fog'?.10:.18;
      ctx.fillStyle=light;ctx.fillRect(mx-mw,horizon*.08,mw*2,horizon*1.2);ctx.globalAlpha=1;
      // Forested valley slopes with fine, irregular tree silhouettes.
      ridge([[0,horizon*1.22],[w*.12,horizon*1.08],[w*.25,horizon*1.2],[w*.4,horizon*1.04],[w*.56,horizon*1.18],[w*.72,horizon*1.01],[w*.88,horizon*1.17],[w,horizon*1.08]],p.mid,'#254b45');
      forestBand(horizon*1.2,22,p.mid,portrait?28:22,3,t,false);
      // Lake and shore sit low in frame; the portrait view keeps enough water visible.
      const lakeY=waterY;
      const water=ctx.createLinearGradient(0,lakeY,0,h);
      water.addColorStop(0,p.water);water.addColorStop(.35,state.weather==='storm'?'#284957':'#47747a');
      water.addColorStop(1,state.phase==='night'?'#102b3c':'#1b4148');
      ctx.fillStyle=water;ctx.fillRect(0,lakeY,w,h-lakeY);
      // Distant shore, reeds and reflections soften the waterline.
      ctx.fillStyle='#203f42';ctx.beginPath();ctx.moveTo(0,lakeY+h*.025);
      for(let i=0;i<=24;i++){const x=i*w/24,y=lakeY+h*(.015+Math.sin(i*1.7)*.012);ctx.lineTo(x,y);}
      ctx.lineTo(w,lakeY+h*.06);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
      // Fine ripples gather under the mountain and lengthen with wind.
      const rippleCount=portrait?64:48;
      for(let i=0;i<rippleCount;i++){
        const yy=lakeY+h*.035+((i*23+t*(state.weather==='wind'?13:state.weather==='storm'?8:3))%(h-lakeY));
        const center=mx,spread=(yy-lakeY)/(h-lakeY);
        const xx=((i*97+t*(i%2?7:-5))%(w+100))-50;
        const len=(w*(.012+(i%7)*.008))*(.45+spread);
        ctx.globalAlpha=(.025+(i%5)*.012)*(state.weather==='storm'?.55:1);
        ctx.strokeStyle=i%4===0?'#f5e8ce':'#a9d2cc';ctx.lineWidth=.6+(i%3)*.35;
        ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+len*.5,yy+Math.sin(t+i)*1.4,xx+len,yy);ctx.stroke();
        if(i%8===0){ctx.globalAlpha=.035;ctx.beginPath();ctx.moveTo(center+(xx-center)*.15,yy);ctx.lineTo(center+(xx-center)*.15+len*.28,yy);ctx.stroke();}
      }
      ctx.globalAlpha=1;
      // Near-bank forest frames the scene with depth and organic variation.
      ridge([[0,h*.88],[w*.08,h*.83],[w*.18,h*.9],[w*.3,h*.84],[w*.43,h*.92],[w*.57,h*.85],[w*.72,h*.91],[w*.86,h*.84],[w,h*.89]],p.near,'#122f32');
      forestBand(h*.98,18,p.near,portrait?48:37,9,t,true);
      // A restrained torii is a distant landmark, not a floating graphic.
      drawTorii(w*.82,lakeY+h*.09,clamp(w/1250,.28,.58),state.weather==='night'?'#986a68':'#925044');
      // Foreground grasses and reeds create a tangible edge to the lake.
      ctx.save();ctx.strokeStyle=state.weather==='snow'?'#d6dfd7':'#9db4a0';ctx.globalAlpha=.3;ctx.lineWidth=1;
      for(let i=0;i<Math.round(w/9);i++){const x=(i*37)%w,y=h*(.96+(i%4)*.009),height=5+(i%9)*1.7;
        ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.sin(t*.8+i)*3,y-height*.7,x+(i%2?3:-3),y-height);ctx.stroke();}
      ctx.restore();
      // A few close cherry blossoms remain as a subtle Japanese signature.
      if(state.weather==='clear'||state.weather==='wind'||state.weather==='cloudy'){
        ctx.save();ctx.translate(-w*.05,h*.12);ctx.rotate(Math.sin(t*.55)*(state.weather==='wind'?.018:.006));
        ctx.strokeStyle='#463d3e';ctx.lineWidth=Math.max(2,w*.0035);ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(w*.11,h*.01,w*.24,h*.10);ctx.stroke();
        for(let i=0;i<9;i++){const x=w*(.02+i*.026),y=h*(.015+Math.sin(i*.8)*.04);
          for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ctx.fillStyle=j%2?'#e8b3b8':'#f1c9c3';ctx.beginPath();ctx.ellipse(x+Math.cos(a)*3.2,y+Math.sin(a)*2.7,2.7,2.1,a,0,Math.PI*2);ctx.fill();}}
        ctx.restore();
      }
    }
    function atmosphere(p,dt,t) {
      if(state.weather==='rain'||state.weather==='storm'){
        const count=state.weather==='storm'?drops.length:Math.round(drops.length*.58);ctx.strokeStyle=state.weather==='storm'?'#e3f0f488':'#e5f1f277';ctx.lineWidth=1;
        for(let i=0;i<count;i++){const d=drops[i];d.y+=d.s*dt*60*(state.weather==='storm'?1.9:1.1);d.x+=dt*60*(state.weather==='storm'?4:2);if(d.y>h+20){d.y=-20;d.x=rand()*w;}if(d.x>w+10)d.x=-10;ctx.globalAlpha=.2+d.z*.32;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-3,d.y+d.len*d.z);ctx.stroke();}ctx.globalAlpha=1;
      } else if(state.weather==='snow'){
        ctx.fillStyle='#fffdf0dd';for(const d of drops){d.y+=d.s*.32*dt*60;d.x+=Math.sin(t+d.len)*.35;if(d.y>h+5){d.y=-5;d.x=rand()*w;}ctx.globalAlpha=.35+d.z*.5;ctx.beginPath();ctx.arc(d.x,d.y,d.z*1.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
      } else if(state.weather==='wind'||state.weather==='clear'||state.weather==='cloudy'){
        for(const q of petals){q.x+=dt*60*(state.weather==='wind'?1.6:.48)*q.z;q.y+=Math.sin(t*1.3+q.a)*dt*15*q.z;q.a+=dt*q.spin; if(q.x>w+20){q.x=-20;q.y=rand()*h*.72;}ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.a);ctx.fillStyle='#f2b9c1';ctx.globalAlpha=.56*q.z;ctx.beginPath();ctx.ellipse(0,0,q.r,q.r*.58,.3,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.globalAlpha=1;
      }
      if(state.weather==='fog'||state.weather==='rain'||state.weather==='storm'){
        for(const f of fogBanks){f.x+=dt*(state.weather==='storm'?12:6);if(f.x>w+260)f.x=-260;const g=ctx.createLinearGradient(f.x-220,f.y,f.x+250,f.y);g.addColorStop(0,'#ffffff00');g.addColorStop(.5,`rgba(232,239,229,${f.alpha})`);g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,f.y-h*.045,w,h*.09);}
      }
      if(state.weather==='storm'){flashIn-=dt;if(flashIn<=0){lightning=.85;flashIn=5+rand()*10;}if(lightning>0){ctx.fillStyle=`rgba(224,238,244,${lightning*.2})`;ctx.fillRect(0,0,w,h);lightning=Math.max(0,lightning-dt*2.4);}}
      else{lightning=0;flashIn=5;}
      // Weather changes the air itself, not only the particles in front of it.
      if(state.weather==='fog'||state.weather==='rain'||state.weather==='snow'){
        const veil=ctx.createLinearGradient(0,h*.25,0,h*.82);
        veil.addColorStop(0,'#e9eee900');
        veil.addColorStop(.52,state.weather==='fog'?'rgba(225,235,226,.24)':state.weather==='rain'?'rgba(194,211,211,.10)':'rgba(238,243,239,.12)');
        veil.addColorStop(1,'#e9eee900');
        ctx.fillStyle=veil;ctx.fillRect(0,h*.2,w,h*.68);
      }
      if(state.weather==='rain'||state.weather==='storm'){
        // Wet air and fine lake spray soften distant contrast.
        ctx.globalAlpha=state.weather==='storm'?.10:.055;
        ctx.fillStyle='#d8e5e6';ctx.fillRect(0,h*.38,w,h*.48);ctx.globalAlpha=1;
      }
    }
    function draw(dt) {
      if(!w||!h)return;const p=PALETTES[state.weather]||PALETTES.day,t=time;
      ctx.clearRect(0,0,w,h);sky(p,t);landscape(p,t);atmosphere(p,dt,t);
      const haze=ctx.createLinearGradient(0,h*.28,0,h*.82);
      haze.addColorStop(0,'#e9eee000');
      haze.addColorStop(.42,state.weather==='fog'?'rgba(235,239,226,.20)':'rgba(233,238,224,.035)');
      haze.addColorStop(1,'#e9eee000');ctx.fillStyle=haze;ctx.fillRect(0,h*.28,w,h*.54);
      if(state.weather==='snow'){
        const bank=ctx.createLinearGradient(0,h*.9,0,h);
        bank.addColorStop(0,'rgba(226,235,231,0)');bank.addColorStop(1,'rgba(226,235,231,.30)');
        ctx.fillStyle=bank;ctx.fillRect(0,h*.88,w,h*.12);
      }
    }
    function loop(now){if(stopped||!visible||document.hidden||!isActive('weather')){raf=0;return;}if(now-last>40){const dt=Math.min(.08,(now-last)/1000||.04);time+=dt;last=now;draw(dt);}raf=requestAnimationFrame(loop);}
    function start(){if(stopped)return;visible=!document.hidden;if(reduced){draw(0);return;}if(visible&&!raf){last=0;raf=requestAnimationFrame(loop);}}
    function setState(next){state=next||state;lightning=0;flashIn=4;draw(0);if(!reduced)start();}
    function onVisibility(){visible=!document.hidden;if(visible)start();else if(raf){cancelAnimationFrame(raf);raf=0;}}
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(canvas);
    window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',onVisibility);resize();start();
    return {setState,stop(){stopped=true;if(raf)cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);}};
  }

  function activateWeather() {
    const view=mount('weather');if(!view)return;
    addStyles();const screen=createScreen();view.root.replaceChildren(screen);
    let renderer;try{renderer=createRenderer(screen.querySelector('canvas'));}catch(e){console.error('[LIVE // EARTH] Japanese weather renderer failed.',e);}
    const dock=document.getElementById('le-feature-dock');
    function syncDock(){if(!dock||dock.hidden||getComputedStyle(dock).display==='none'){screen.style.removeProperty('--le-weather-dock-clearance');return;}const d=dock.getBoundingClientRect(),r=screen.getBoundingClientRect();if(d.width>0&&d.height>0)screen.style.setProperty('--le-weather-dock-clearance',`${Math.ceil(Math.max(0,r.bottom-d.top)+14)}px`);}
    const dockObserver=dock&&typeof ResizeObserver==='function'?new ResizeObserver(syncDock):null;dockObserver?.observe(dock);window.addEventListener('resize',syncDock,{passive:true});window.addEventListener('orientationchange',syncDock,{passive:true});syncDock();

    let abort=null,poll=0,refresh=0,clock=0,disposed=false,serial=0,lastFetch=0,manual=false;
    const select=screen.querySelector('#le-jp-scene-select');
    const stopPoll=()=>{if(poll)clearInterval(poll);poll=0;};
    function paint(data,preview=false){const s=parse(data),c=s.current,d=s.daily;renderer?.setState(s);
      setText(screen,'temp',num(c.temperature_2m)===null?'—':String(Math.round(c.temperature_2m)));
      setText(screen,'condition',labelFor(s.code,s.weather));setText(screen,'feels',num(c.apparent_temperature)===null?'':`Feels like ${Math.round(c.apparent_temperature)}°`);
      const hi=num(d.temperature_2m_max?.[0]),lo=num(d.temperature_2m_min?.[0]);setText(screen,'range',`${hi===null?'—':Math.round(hi)+'°'} / ${lo===null?'—':Math.round(lo)+'°'}`);
      const rain=num(d.precipitation_probability_max?.[0]);setText(screen,'rain',rain===null?'—':`${Math.round(rain)}%`);
      const wind=num(c.wind_speed_10m);setText(screen,'wind',wind===null?'—':`${compass(c.wind_direction_10m)} ${Math.round(wind)} km/h`);
      const hum=num(c.relative_humidity_2m);setText(screen,'humidity',hum===null?'—':`${Math.round(hum)}%`);
      setText(screen,'date',formatDate(c.time));screen.dataset.weather=s.weather;screen.dataset.phase=s.phase;screen.dataset.preview=preview?'true':'false';lastFetch=Date.now();
    }
    function preview(kind='clear',message='SAMPLE SCENE · Location is off.'){paint(sample(kind),true);setText(screen,'place','SCENE PREVIEW');setText(screen,'status',message);}
    function locationOff(){preview('clear','LOCATION OFF · Sample values, not a live forecast.');}
    async function fetchLive(){
      if(disposed||!isActive('weather')||manual)return;
      if(window.liveEarthLocationAllowed?.()!==true){locationOff();return;}
      if(navigator.onLine===false){preview('clear','OFFLINE · Sample scene, not live conditions.');return;}
      const point=globe()?.getLocation?.(),lat=Number(point?.latitude),lon=Number(point?.longitude);
      if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lon)||lon < -180||lon>180)return;
      abort?.abort();const controller=new AbortController();abort=controller;const id=++serial;
      const q=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:'temperature_2m,apparent_temperature,is_day,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,relative_humidity_2m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:'1',timezone:'auto',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
      const timeout=setTimeout(()=>controller.abort(),16000);
      try{const res=await fetch(`${API}?${q}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error(`Weather source ${res.status}`);const data=await res.json();if(disposed||!isActive('weather')||id!==serial||window.liveEarthLocationAllowed?.()!==true)return;paint(data,false);setText(screen,'place','YOUR LOCATION');setText(screen,'status','LIVE CONDITIONS · OPEN-METEO');}
      catch(e){if(e?.name!=='AbortError'&&!disposed&&isActive('weather'))preview('clear','LIVE DATA UNAVAILABLE · Labelled sample scene.');}
      finally{clearTimeout(timeout);if(abort===controller)abort=null;}
    }
    function pollForFix(){stopPoll();let tries=24;poll=setInterval(()=>{if(disposed||!isActive('weather')){stopPoll();return;}if(window.liveEarthLocationAllowed?.()!==true){stopPoll();locationOff();return;}const p=globe()?.getLocation?.();if(p&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))){stopPoll();fetchLive();return;}if(--tries<=0){stopPoll();preview('clear','WAITING FOR LOCATION · No fresh fix yet.');}},500);}
    function choose(mode){manual=mode!=='auto';if(mode==='auto'){if(window.liveEarthLocationAllowed?.()===true)fetchLive();else locationOff();return;}stopPoll();serial++;abort?.abort();abort=null;preview(mode,`PREVIEW · ${mode.toUpperCase()} · SAMPLE VALUES, NOT A LIVE FORECAST.`);}
    function onLocation(e){if(!isActive('weather'))return;if(e.detail?.enabled===true&&window.liveEarthLocationAllowed?.()===true&&!manual)pollForFix();else if(window.liveEarthLocationAllowed?.()!==true&&!manual){stopPoll();serial++;abort?.abort();locationOff();}}
    function onStop(){stopPoll();serial++;abort?.abort();if(!manual)locationOff();}
    function onOnline(){if(!manual&&window.liveEarthLocationAllowed?.()===true)pollForFix();}
    function onOffline(){stopPoll();serial++;abort?.abort();if(!manual)preview('clear','OFFLINE · Sample scene, not live conditions.');}
    function onVisibility(){if(!document.hidden&&!manual&&window.liveEarthLocationAllowed?.()===true&&Date.now()-lastFetch>REFRESH_MS)fetchLive();}
    function updateClock(){if(screen.isConnected&&screen.dataset.preview==='true')setText(screen,'date',formatDate());}
    const onModeChange=()=>choose(select.value);
    select.addEventListener('change',onModeChange);
    window.addEventListener('live-earth-location-state',onLocation);window.addEventListener('live-earth-location-stop',onStop);window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);document.addEventListener('visibilitychange',onVisibility);
    refresh=setInterval(()=>{if(!disposed&&!document.hidden&&!manual&&window.liveEarthLocationAllowed?.()===true)fetchLive();},REFRESH_MS);clock=setInterval(updateClock,30000);updateClock();
    if(window.liveEarthLocationAllowed?.()===true)pollForFix();else locationOff();
    return ()=>{disposed=true;serial++;stopPoll();clearInterval(refresh);clearInterval(clock);abort?.abort();renderer?.stop();select.removeEventListener('change',onModeChange);window.removeEventListener('live-earth-location-state',onLocation);window.removeEventListener('live-earth-location-stop',onStop);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);document.removeEventListener('visibilitychange',onVisibility);dockObserver?.disconnect();window.removeEventListener('resize',syncDock);window.removeEventListener('orientationchange',syncDock);screen.remove();document.getElementById(STYLE_ID)?.remove();};
  }
  runtime.registerFeature('weather',activateWeather);
})();