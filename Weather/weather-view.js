/* LE-WEATHER-MAPLE-DIRECT-TRIANGLE-FOLIAGE-V57 */
/* LE-WEATHER-MAPLE-ADDITIVE-UPRIGHT-SHOOTS-V64
   Adds 14 steep branch shoots with independent foliage sprays; prior
   branch and foliage paths are retained without replacement. */
/* LE-WEATHER-MAPLE-BRANCH-ATTACHED-FOLIAGE-V59
   Every terminal twig and each smaller supporting branch tier receives
   anchored autumn leaves. One merged BufferGeometry/Mesh retains all six
   maple silhouettes with per-leaf transforms and dynamic camera-facing planes.
   Branch growth geometry and all Weather/pavilion systems remain unchanged.
*/

/* LIVE // EARTH — Weather View v2
   Full-screen Three.js weather world, forecast cards and temporary scene preview.
   Uses the existing Stacks feature runtime and Location privacy boundary. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather runtime unavailable.'); return;
  }
  const { mount, isActive, globe } = runtime;
  const API = 'https://api.open-meteo.com/v1/forecast';
  const REFRESH_MS = 15 * 60 * 1000;
  const STYLE_ID = 'le-weather-v2-style';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const n = v => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
  const codeLabel = code => ({0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm · hail',99:'Severe thunderstorm'}[code] || 'Weather conditions');
  const weatherKind = code => code >= 95 ? 'storm' : [71,73,75,77,85,86].includes(code) ? 'snow' : [45,48].includes(code) ? 'fog' : [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code) ? 'rain' : [2,3].includes(code) ? 'cloudy' : 'clear';
  const PREVIEW = {
    clear:{code:0,temp:26,feels:26,wind:8,humidity:42,rain:0,cloud:8}, cloudy:{code:3,temp:22,feels:22,wind:13,humidity:64,rain:20,cloud:92}, rain:{code:63,temp:19,feels:18,wind:17,humidity:86,rain:78,cloud:100}, storm:{code:95,temp:21,feels:20,wind:34,humidity:91,rain:95,cloud:100}, snow:{code:73,temp:-2,feels:-6,wind:15,humidity:78,rain:45,cloud:90}, fog:{code:45,temp:13,feels:12,wind:4,humidity:96,rain:5,cloud:100}, wind:{code:1,temp:20,feels:18,wind:42,humidity:48,rain:0,cloud:18}, hot:{code:0,temp:37,feels:40,wind:9,humidity:28,rain:0,cloud:5}, night:{code:0,temp:17,feels:16,wind:5,humidity:56,rain:0,cloud:8}
  };
  function addStyles(){
    document.getElementById(STYLE_ID)?.remove();
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`
      .le-weather-v2{position:absolute;inset:0;overflow:hidden;isolation:isolate;background:#0a1c2b;color:#f7f5ed;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      .le-weather-v2 *{box-sizing:border-box}.le-weather-v2 [hidden]{display:none!important}.le-weather-v2 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:manipulation;pointer-events:auto!important}
      /* LE-SQUARE-WORLD-CAMERA-V9: fixed square stage, centred and cropped by the display */
      .le-weather-v2 canvas{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:100vmax!important;height:100vmax!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;display:block;z-index:0;touch-action:pan-y}
      .le-weather-v2:after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(3,14,25,.30),transparent 28%,rgba(3,13,22,.10) 55%,rgba(2,10,18,.62));}
      .wx2-ui{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 22px) clamp(18px,5vw,48px) calc(env(safe-area-inset-bottom) + var(--wx2-dock,132px));pointer-events:none;}
      .wx2-top{max-width:min(100%,580px);text-shadow:0 2px 22px #06152380}.wx2-brand{font-size:9px;font-weight:800;letter-spacing:.24em;color:#e8eee9c9}.wx2-place{margin-top:12px;font-size:11px;font-weight:750;letter-spacing:.16em;text-transform:uppercase}.wx2-date{margin-top:5px;font-size:11px;color:#f3f3e9b8}
      .wx2-temp-row{display:flex;align-items:flex-start;gap:4px;margin-top:clamp(18px,3vh,30px)}.wx2-temp{font-size:clamp(76px,19vw,126px);font-weight:220;letter-spacing:-.09em;line-height:.80;font-variant-numeric:tabular-nums}.wx2-deg{font-size:clamp(24px,5vw,40px);font-weight:300;margin:4px 0 0 3px}.wx2-condition{margin-top:13px;font-size:clamp(22px,5.2vw,36px);font-weight:450;letter-spacing:-.045em;line-height:1.04}.wx2-feels{margin-top:7px;font-size:12px;color:#f4f2e9c7}
      .wx2-bottom.wx2-controls-collapsed .wx2-toolbar,.wx2-bottom.wx2-controls-collapsed .wx2-section-head,.wx2-bottom.wx2-controls-collapsed .wx2-hours,.wx2-bottom.wx2-controls-collapsed .wx2-week{display:none!important}.wx2-control-toggle{pointer-events:auto;position:absolute;z-index:4;right:clamp(18px,5vw,48px);bottom:calc(env(safe-area-inset-bottom) + var(--wx2-dock,132px) - 2px);width:42px;height:42px;border:1px solid #ffffff70;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#d8eef0d9,#08283bdc);color:#f8f7ef;box-shadow:0 5px 22px #00131f80,inset 0 1px 4px #ffffff80;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font:600 22px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}.wx2-control-toggle:active{transform:scale(.94)}.wx2-control-toggle:focus-visible{outline:2px solid white;outline-offset:3px}.wx2-control-toggle span{display:block;transform:translateY(-1px)}.wx2-bottom{width:min(100%,780px);pointer-events:auto;text-shadow:0 2px 18px #06152380}.wx2-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px}.wx2-mode{display:flex;gap:5px;padding:4px;border:1px solid #ffffff35;border-radius:999px;background:#061a2a70;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.wx2-mode button,.wx2-preview button{border:0;border-radius:999px;background:transparent;color:#f6f4eb;padding:8px 12px;font:700 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.07em;touch-action:manipulation}.wx2-mode button[aria-pressed="true"]{background:#f2f1e9;color:#122b3b}.wx2-preview{display:flex;align-items:center;gap:7px}.wx2-preview select{max-width:126px;border:1px solid #ffffff50;border-radius:999px;background:#061a2a9c;color:#fff;padding:9px 11px;font:700 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.07em;outline:none;color-scheme:dark;backdrop-filter:blur(14px)}.wx2-preview select:focus-visible,.wx2-mode button:focus-visible{outline:2px solid white;outline-offset:3px}
      .wx2-section-head{display:flex;justify-content:space-between;align-items:center;margin:0 1px 8px;color:#f4f3e9}.wx2-section-head strong{font-size:10px;letter-spacing:.14em;text-transform:uppercase}.wx2-section-head span{font-size:9px;color:#f2f1e9a8}
      .wx2-hours{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none;padding:1px 1px 8px;touch-action:pan-x}.wx2-hours::-webkit-scrollbar{display:none}.wx2-hour{flex:0 0 66px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:7px;padding:10px 7px;border:1px solid #ffffff28;border-radius:15px;background:linear-gradient(150deg,#ffffff22,#071d2d88);backdrop-filter:blur(13px);-webkit-backdrop-filter:blur(13px)}.wx2-hour.is-now{border-color:#f8f3d6a8;background:linear-gradient(150deg,#f5f0d63b,#071d2d9c)}.wx2-hour time{font-size:9px;color:#f2f0e6c9}.wx2-hour .wx2-icon{font-size:19px;line-height:1}.wx2-hour b{font-size:14px;font-weight:650}.wx2-hour small{font-size:8px;color:#e9e8dfb8;white-space:nowrap}
      .wx2-week{display:grid;gap:6px}.wx2-day{display:grid;grid-template-columns:minmax(48px,1fr) 24px 32px 32px minmax(36px,.8fr) 34px;align-items:center;gap:8px;padding:9px 12px;border:1px solid #ffffff20;border-radius:13px;background:#061b2b80;backdrop-filter:blur(12px);font-size:10px}.wx2-day .wx2-dayname{font-weight:650}.wx2-day .wx2-icon{text-align:center;font-size:16px}.wx2-day .wx2-low{color:#d6e1e0a8}.wx2-day .wx2-rain{text-align:right;color:#c6e7f2}.wx2-bar{height:4px;border-radius:5px;background:linear-gradient(90deg,#a6c8d0,#f3d99a);opacity:.85}
      .wx2-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:9px;padding-top:10px;border-top:1px solid #ffffff46}.wx2-metric label{display:block;font-size:8px;font-weight:750;letter-spacing:.13em;color:#f1efe5a8;text-transform:uppercase}.wx2-metric b{display:block;margin-top:5px;font-size:clamp(11px,2.4vw,16px);font-weight:600;white-space:nowrap}.wx2-status{margin-top:8px;font-size:9px;line-height:1.4;color:#f1efe5a8}
      @media(orientation:landscape){.wx2-ui{padding-left:calc(env(safe-area-inset-left) + 22px);padding-right:calc(env(safe-area-inset-right) + 22px);padding-top:calc(env(safe-area-inset-top) + 12px);padding-bottom:calc(env(safe-area-inset-bottom) + var(--wx2-dock,94px))}.wx2-top{max-width:300px}.wx2-temp{font-size:clamp(58px,9vw,86px)}.wx2-temp-row{margin-top:12px}.wx2-condition{font-size:clamp(19px,3vw,26px);margin-top:9px}.wx2-bottom{width:min(62vw,760px);align-self:flex-end}.wx2-hour{flex-basis:62px;padding:8px 6px}.wx2-day{padding:7px 10px}}
      @media(max-height:460px) and (orientation:landscape){.wx2-ui{padding-top:calc(env(safe-area-inset-top) + 5px)}.wx2-brand{font-size:8px}.wx2-place{margin-top:5px}.wx2-temp{font-size:54px}.wx2-temp-row{margin-top:8px}.wx2-condition{font-size:18px;margin-top:6px}.wx2-feels{margin-top:3px}.wx2-hour{gap:4px;padding:6px}.wx2-metrics{margin-top:4px;padding-top:5px}.wx2-status{margin-top:4px}}
      @media(prefers-reduced-motion:reduce){.wx2-mode,.wx2-hour,.wx2-day{backdrop-filter:none;-webkit-backdrop-filter:none}}
    `;document.head.appendChild(s);
  }
  const iconFor = code => code>=95?'⛈': [71,73,75,77,85,86].includes(code)?'❄': [45,48].includes(code)?'〰': [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)?'🌧': [2,3].includes(code)?'☁':'☀';
  const hourLabel = value => {const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString([], {hour:'numeric'});};
  const dayLabel = value => {const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'—':d.toLocaleDateString([], {weekday:'short'});};
  function makeScreen(){
    const root=document.createElement('main');root.className='le-weather-v2';root.setAttribute('aria-label','Immersive live weather and forecast');
    root.innerHTML=`<canvas aria-hidden="true"></canvas><div class="wx2-ui"><header class="wx2-top"><div class="wx2-brand">LIVE // EARTH · WEATHER</div><div class="wx2-place" data-w="place">YOUR LOCATION</div><div class="wx2-date" data-w="date">—</div><div class="wx2-temp-row"><span class="wx2-temp" data-w="temp">—</span><span class="wx2-deg">°</span></div><div class="wx2-condition" data-w="condition">Loading weather</div><div class="wx2-feels" data-w="feels">Feels like —</div></header><section class="wx2-bottom" id="wx2-bottom-controls"><div class="wx2-toolbar"><div class="wx2-mode" role="group" aria-label="Forecast range"><button type="button" data-range="hours" aria-pressed="true">TODAY</button><button type="button" data-range="week" aria-pressed="false">7 DAYS</button></div><div class="wx2-preview"><select aria-label="Temporary weather scene preview"><option value="auto">LIVE SCENE</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="hot">HEAT</option><option value="night">NIGHT</option></select></div></div><div class="wx2-section-head"><strong data-w="forecast-title">Today · Hourly</strong><span data-w="forecast-sub">Next hours</span></div><div class="wx2-hours" data-w="hours" aria-label="Hourly forecast"></div><div class="wx2-week" data-w="week" hidden aria-label="Seven day forecast"></div><div class="wx2-metrics"><div class="wx2-metric"><label>Humidity</label><b data-w="humidity">—</b></div><div class="wx2-metric"><label>Wind</label><b data-w="wind">—</b></div><div class="wx2-metric"><label>Rain chance</label><b data-w="rain">—</b></div><div class="wx2-metric"><label>UV index</label><b data-w="uv">—</b></div></div><div class="wx2-status" data-w="status" role="status" aria-live="polite">Waiting for location permission</div></section><button class="wx2-control-toggle" type="button" aria-label="Hide weather controls" aria-expanded="true" aria-controls="wx2-bottom-controls"><span aria-hidden="true">⌃</span></button></div>`;
    return root;
  }
  const put=(root,key,value)=>{const e=root.querySelector(`[data-w="${key}"]`);if(e)e.textContent=value;};
  function sampleData(kind='clear'){
    const p=PREVIEW[kind]||PREVIEW.clear,now=new Date(),times=[],temps=[],codes=[],prec=[];
    for(let i=0;i<24;i++){const d=new Date(now);d.setMinutes(0,0,0);d.setHours(d.getHours()+i);times.push(d.toISOString().slice(0,16));temps.push(p.temp+Math.round(Math.sin(i/24*Math.PI*2)*3));codes.push(p.code);prec.push(p.rain);}
    const dates=[],max=[],min=[],dc=[],dp=[];for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()+i);dates.push(d.toISOString().slice(0,10));max.push(p.temp+3+Math.round(Math.sin(i)*2));min.push(p.temp-4+Math.round(Math.cos(i)*2));dc.push(p.code);dp.push(p.rain);}
    return {current:{time:now.toISOString().slice(0,16),temperature_2m:p.temp,apparent_temperature:p.feels,weather_code:p.code,wind_speed_10m:p.wind,wind_direction_10m:250,relative_humidity_2m:p.humidity,is_day:kind==='night'?0:1},hourly:{time:times,temperature_2m:temps,weather_code:codes,precipitation_probability:prec},daily:{time:dates,temperature_2m_max:max,temperature_2m_min:min,weather_code:dc,precipitation_probability_max:dp,uv_index_max:[3,4,5,4,3,4,5]}};
  }
  function buildForecast(root,data){
    const h=root.querySelector('[data-w="hours"]'),w=root.querySelector('[data-w="week"]');h.replaceChildren();w.replaceChildren();
    const nowIndex=Math.max(0,(data.hourly?.time||[]).findIndex(t=>t>=String(data.current?.time||'').slice(0,13)));
    const times=data.hourly?.time||[],temps=data.hourly?.temperature_2m||[],codes=data.hourly?.weather_code||[],rain=data.hourly?.precipitation_probability||[];
    for(let i=nowIndex;i<Math.min(times.length,nowIndex+24);i++){
      const card=document.createElement('div');card.className='wx2-hour'+(i===nowIndex?' is-now':'');
      const time=document.createElement('time');time.textContent=i===nowIndex?'NOW':hourLabel(times[i]);
      const icon=document.createElement('span');icon.className='wx2-icon';icon.textContent=iconFor(Number(codes[i]));
      const temp=document.createElement('b');temp.textContent=n(temps[i])===null?'—':Math.round(temps[i])+'°';
      const pop=document.createElement('small');pop.textContent=n(rain[i])===null?'':Math.round(rain[i])+'% rain';card.append(time,icon,temp,pop);h.append(card);
    }
    const days=data.daily?.time||[],high=data.daily?.temperature_2m_max||[],low=data.daily?.temperature_2m_min||[],dc=data.daily?.weather_code||[],dp=data.daily?.precipitation_probability_max||[];
    for(let i=0;i<Math.min(7,days.length);i++){
      const row=document.createElement('div');row.className='wx2-day';
      const day=document.createElement('span');day.className='wx2-dayname';day.textContent=i===0?'Today':dayLabel(days[i]);
      const icon=document.createElement('span');icon.className='wx2-icon';icon.textContent=iconFor(Number(dc[i]));
      const hi=document.createElement('b');hi.textContent=n(high[i])===null?'—':Math.round(high[i])+'°';
      const lo=document.createElement('span');lo.className='wx2-low';lo.textContent=n(low[i])===null?'—':Math.round(low[i])+'°';
      const bar=document.createElement('span');bar.className='wx2-bar';
      const chance=document.createElement('span');chance.className='wx2-rain';chance.textContent=n(dp[i])===null?'':Math.round(dp[i])+'%';
      row.append(day,icon,hi,lo,bar,chance);w.append(row);
    }
  }
  async function createWorld(canvas,onDoorState=()=>{}){
    const THREE=await import(new URL('./vendor/three.module.js',document.baseURI).href);
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    const scene=new THREE.Scene();scene.background=new THREE.Color('#86aeb8');scene.fog=new THREE.FogExp2('#9eb8b7',.012);
    const camera=new THREE.PerspectiveCamera(42,1,.1,220);camera.position.set(0,7.2,18);camera.lookAt(0,2.5,0);
    scene.add(new THREE.HemisphereLight(0xcde6f2,0x243c3d,2.0));
    const sun=new THREE.DirectionalLight(0xffe1b2,3.1);sun.position.set(-8,13,7);scene.add(sun);
    const fill=new THREE.DirectionalLight(0x79b7d3,1.0);fill.position.set(8,7,-6);scene.add(fill);
    const mat=(color,roughness=.86,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
    const groundMat=mat('#344e42'),hillMats=['#274a45','#315951','#3d665c'].map(c=>mat(c));
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.18;scene.add(ground);
    // LE-WEATHER-HILLS-TERRAIN-V2 LE-WEATHER-HILLS-REAR-RIDGE-LOWERED-V1: three continuous rolling ridges.
    function createRollingRidge(zStart,depth,peak,phase,material){
      const nx=112,nz=30,positions=[],indices=[];
      for(let iz=0;iz<=nz;iz++){
        const t=iz/nz;
        for(let ix=0;ix<=nx;ix++){
          const u=ix/nx,x=-48+u*96;
          const crest=.68+.18*Math.sin(x*.105+phase)+.10*Math.sin(x*.19+phase*1.7);
          const shoulder=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.72);
          const y=peak*.55*shoulder*Math.max(.28,crest);
          const z=zStart+t*depth;
          positions.push(x,y,z);
          if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,c=a+(nx+1),d=c+1;indices.push(a,c,b,b,c,d);}
        }
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material);mesh.material.side=THREE.DoubleSide;scene.add(mesh);return mesh;
    }
    createRollingRidge(-43,15,8.5,.4,hillMats[0]);
    createRollingRidge(-36,14,10,1.8,hillMats[1]);
    createRollingRidge(-29,12,7,3.1,hillMats[2]);
    const fujiGroup=new THREE.Group();fujiGroup.position.set(3.75,6.048,-64);fujiGroup.scale.y=.54;fujiGroup.userData.refinement='LE-WEATHER-FUJI-HEIGHT-54-V3';scene.add(fujiGroup);
    const fujiBodyMat=new THREE.MeshStandardMaterial({color:'#657985',roughness:1});
    const fujiBody=new THREE.Mesh(new THREE.ConeGeometry(25,22,96,8),fujiBodyMat);fujiGroup.add(fujiBody);
    const snowVertices=[0,11,0],snowIndices=[],snowSegments=96;
    for(let i=0;i<snowSegments;i++){const a=i/snowSegments*Math.PI*2;const edge=3.05+.48*Math.sin(a*4+.55)+.22*Math.sin(a*9+1.1)+.12*Math.sin(a*15);const radius=25*(11-edge)/22;snowVertices.push(radius*Math.cos(a),edge,radius*Math.sin(a));}
    for(let i=0;i<snowSegments;i++)snowIndices.push(0,i+1,((i+1)%snowSegments)+1);
    const snowGeometry=new THREE.BufferGeometry();snowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(snowVertices,3));snowGeometry.setIndex(snowIndices);snowGeometry.computeVertexNormals();
    const snowMaterial=new THREE.MeshStandardMaterial({color:'#e7eeee',roughness:1,side:THREE.DoubleSide});
    fujiGroup.add(new THREE.Mesh(snowGeometry,snowMaterial));
    const waterMat=new THREE.MeshPhysicalMaterial({color:'#2c7180',roughness:.2,metalness:.15,clearcoat:.8,clearcoatRoughness:.18,transparent:true,opacity:.92});
    const water=new THREE.Mesh(new THREE.PlaneGeometry(90,36,40,20),waterMat);water.rotation.x=-Math.PI/2;water.position.set(0,.02,7);scene.add(water);
    // V22 — SUBTLE WATER REFLECTION ACCENTS.
    // Low-opacity warm glints and soft ripple rings sit just above the water surface
    // in front of the pavilion. They suggest lantern reflections without a costly
    // real-time reflection pass or changes to the existing water mesh.
    const waterShimmers=[],waterRipples=[];
    const shimmerPalette=[0xffd39a,0xe8c58e,0xb7d8d7,0xffe0b2];
    for(let i=0;i<12;i++){
      const material=new THREE.MeshBasicMaterial({
        color:shimmerPalette[i%shimmerPalette.length],
        transparent:true,opacity:.12,depthWrite:false
      });
      const length=.34+(i%4)*.22;
      const glint=new THREE.Mesh(new THREE.BoxGeometry(length,.012,.035+(i%3)*.012),material);
      glint.position.set(Math.sin(i*2.17)*(1.15+(i%3)*.42),.047,5.65+i*.38);
      glint.rotation.y=Math.sin(i*1.31)*.12;
      glint.userData.baseOpacity=.12;
      glint.userData.phase=i*1.37;
      scene.add(glint);waterShimmers.push(glint);
    }
    for(let i=0;i<4;i++){
      const material=new THREE.MeshBasicMaterial({
        color:0xe8c58e,transparent:true,opacity:.10,
        depthWrite:false,side:THREE.DoubleSide
      });
      const ring=new THREE.Mesh(new THREE.RingGeometry(.24,.29,48),material);
      ring.rotation.x=-Math.PI/2;
      ring.position.set((i%2?1:-1)*(.72+(i%3)*.42),.049,6.0+Math.floor(i/2)*1.55);
      ring.scale.set(1.65,1,1);
      ring.userData.baseOpacity=.10;
      ring.userData.phase=i*1.8;
      scene.add(ring);waterRipples.push(ring);
    }
    // Layered procedural islands and Japanese garden trees: all actual 3D geometry.
    const trunk=mat('#4b392b'),leafMats=['#244d3c','#2f6249','#47745a'].map(c=>mat(c));
    function tree(x,z,scale=1){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(.10*scale,.18*scale,1.6*scale,7),trunk);t.position.y=.8*scale;g.add(t);for(let k=0;k<3;k++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.9*scale-k*.12,1),leafMats[k]);crown.position.set((k-1)*.18*scale,(1.55+k*.46)*scale,0);crown.scale.set(1.0,.78,.85);g.add(crown);}g.position.set(x,0,z);scene.add(g);return g;}
    // Fuller Japanese garden trees return as balanced side framing around the pavilion.
    const trees=[];const treeLayout=[
      [-8.0,-5.0,.82],[-10.8,1.5,.72],[-8.8,8.2,.78],[-13.0,-12.0,.88],[-13.8,6.0,.70],
      [8.0,-5.0,.82],[10.8,1.5,.72],[8.8,8.2,.78],[13.0,-12.0,.88],[13.8,6.0,.70]
    ];
    for(const [x,z,scale] of treeLayout)trees.push(tree(x,z,scale));

    // V43 — JAPANESE RED MAPLE (MOMIJI), BUILT AS REAL 3D SCENERY.
    // A broad, irregular crown of individual five-lobed maple leaves sits on
    // a visible branching trunk. Instanced leaves keep the foliage detailed
    // without creating hundreds of separate draw calls. The tree frames the
    // pavilion from the right and remains independent of the house geometry.
    // V49 — BRANCH-FIRST MOMIJI SKELETON.
    // The current stage deliberately contains NO leaves. Build and approve the
    // complete woody architecture before any foliage is introduced.
    function createMomiji(x,z,scale=1){
      const maple=new THREE.Group();
      let seed=0x4d4f4d49;
      const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const signed=()=>rand()*2-1;
      const up=new THREE.Vector3(0,1,0);

      // All trunk, root, limb and twig surfaces are merged into one bark mesh.
      const positions=[],colors=[],indices=[];
      const barkPalette=[
        '#2b211d','#392820','#493126','#58402e','#674b35','#332820'
      ].map(c=>new THREE.Color(c));
      const radialSegments=14;
      let pathCount=0;

      function addTubePath(points,radius,tipRatio=.12,tone=1){
        if(!points||points.length<2)return;
        const count=points.length;
        const tangents=[];
        for(let i=0;i<count;i++){
          const before=points[Math.max(0,i-1)];
          const after=points[Math.min(count-1,i+1)];
          const tangent=after.clone().sub(before);
          if(tangent.lengthSq()<1e-9)tangent.set(0,1,0);
          tangents.push(tangent.normalize());
        }

        // Parallel-transported ring frames prevent sudden twists along curved limbs.
        const firstRef=Math.abs(tangents[0].y)>.92
          ?new THREE.Vector3(1,0,0):up.clone();
        let normal=new THREE.Vector3().crossVectors(tangents[0],firstRef).normalize();
        let binormal=new THREE.Vector3().crossVectors(tangents[0],normal).normalize();
        const base=positions.length/3;
        const phase=rand()*Math.PI*2;
        const bark=barkPalette[(tone+Math.floor(rand()*2))%barkPalette.length];

        for(let i=0;i<count;i++){
          const tangent=tangents[i];
          if(i>0){
            normal.addScaledVector(tangent,-normal.dot(tangent));
            if(normal.lengthSq()<1e-8){
              const ref=Math.abs(tangent.y)>.92?new THREE.Vector3(1,0,0):up;
              normal.crossVectors(tangent,ref);
            }
            normal.normalize();
            binormal.crossVectors(tangent,normal).normalize();
          }
          const t=i/(count-1);
          // A stronger natural taper, with a subtle basal flare and slow
          // longitudinal swell. This avoids the uniform pipe-like trunk look.
          const taper=tipRatio+(1-tipRatio)*Math.pow(1-t,1.34);
          const basalFlare=1+.13*Math.exp(-Math.pow(t/.105,2));
          const longitudinal=1+.022*Math.sin(t*10.5+phase);
          const localRadius=radius*taper*basalFlare*longitudinal;
          const grain=.965+rand()*.055;
          for(let j=0;j<=radialSegments;j++){
            const a=j/radialSegments*Math.PI*2;
            // Small irregularity keeps the bark from looking like smooth plumbing.
            const rough=1+.022*Math.sin(a*3+phase)+
              .010*Math.sin(a*5+phase*1.7)+
              .006*Math.sin(a*2+t*8.5+phase);
            const nx=normal.x*Math.cos(a)+binormal.x*Math.sin(a);
            const ny=normal.y*Math.cos(a)+binormal.y*Math.sin(a);
            const nz=normal.z*Math.cos(a)+binormal.z*Math.sin(a);
            positions.push(
              points[i].x+nx*localRadius*rough,
              points[i].y+ny*localRadius*rough,
              points[i].z+nz*localRadius*rough
            );
            const light=grain*(.86+.14*Math.cos(a*2+tone))*
              (.96+.04*Math.sin(t*15+phase));
            colors.push(bark.r*light,bark.g*light,bark.b*light);
            if(i<count-1&&j<radialSegments){
              const a0=base+i*(radialSegments+1)+j;
              const b0=a0+radialSegments+1;
              indices.push(a0,b0,a0+1,a0+1,b0,b0+1);
            }
          }
        }
        // Close each fine tip with a small bark-coloured cap.
        const tipIndex=positions.length/3;
        const tip=points[count-1];
        positions.push(tip.x,tip.y,tip.z);
        colors.push(bark.r*.88,bark.g*.88,bark.b*.88);
        const lastRing=base+(count-1)*(radialSegments+1);
        for(let j=0;j<radialSegments;j++)
          indices.push(tipIndex,lastRing+j,lastRing+j+1);
        pathCount++;
      }

      function bezierPath(p0,p1,p2,p3,steps=7){
        const out=[];
        for(let i=0;i<=steps;i++){
          const t=i/steps,q=1-t;
          out.push(new THREE.Vector3(
            q*q*q*p0.x+3*q*q*t*p1.x+3*q*t*t*p2.x+t*t*t*p3.x,
            q*q*q*p0.y+3*q*q*t*p1.y+3*q*t*t*p2.y+t*t*t*p3.y,
            q*q*q*p0.z+3*q*q*t*p1.z+3*q*t*t*p2.z+t*t*t*p3.z
          ));
        }
        return out;
      }

      function catmullPath(points,stepsPerSpan=6){
        const out=[];
        for(let i=0;i<points.length-1;i++){
          const p0=points[Math.max(0,i-1)],p1=points[i];
          const p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
          for(let j=0;j<stepsPerSpan;j++){
            const t=j/stepsPerSpan,t2=t*t,t3=t2*t;
            const p=new THREE.Vector3();
            for(const key of ['x','y','z']){
              p[key]=.5*((2*p1[key])+(-p0[key]+p2[key])*t+
                (2*p0[key]-5*p1[key]+4*p2[key]-p3[key])*t2+
                (-p0[key]+3*p1[key]-3*p2[key]+p3[key])*t3);
            }
            out.push(p);
          }
        }
        out.push(points[points.length-1].clone());
        return out;
      }

      function pointAt(path,t){
        const f=clamp(t,0,1)*(path.length-1);
        const i=Math.min(path.length-2,Math.floor(f));
        return path[i].clone().lerp(path[i+1],f-i);
      }
      function tangentAt(path,t){
        const f=clamp(t,0,1)*(path.length-1);
        const i=Math.min(path.length-2,Math.max(0,Math.floor(f)));
        return path[Math.min(path.length-1,i+1)].clone()
          .sub(path[Math.max(0,i-1)]).normalize();
      }
      function horizontalAngle(tangent){
        const h=new THREE.Vector3(tangent.x,0,tangent.z);
        if(h.lengthSq()<1e-7)h.set(1,0,0);
        h.normalize();
        return Math.atan2(h.z,h.x);
      }
      function growBranch(start,angle,length,rise,bend,radius,tone,steps=6,tipRatio=.13){
        const dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
        const side=new THREE.Vector3(-dir.z,0,dir.x);
        const end=start.clone().addScaledVector(dir,length)
          .add(new THREE.Vector3(0,rise,0))
          .addScaledVector(side,bend*.18);
        const c1=start.clone().addScaledVector(dir,length*.29)
          .add(new THREE.Vector3(0,.10+rise*.42,0))
          .addScaledVector(side,bend);
        const c2=start.clone().addScaledVector(dir,length*.77)
          .add(new THREE.Vector3(0,.035+rise*.90,0))
          .addScaledVector(side,-bend*.38);
        const path=bezierPath(start,c1,c2,end,steps);
        addTubePath(path,radius,tipRatio,tone);
        // Branch collars swell gently where each limb leaves its parent.
        // The short overlapping taper hides the hard cylinder-to-cylinder
        // junction and suggests the natural shoulder of mature maple wood.
        if(radius>=.090&&path.length>=4){
          addTubePath(path.slice(0,4),radius*1.13,.80,tone);
        }
        return path;
      }

      // A single old, twisting central trunk with a clear taper and a slight S-curve.
      const trunkControls=[
        new THREE.Vector3(0,-.16,0),
        new THREE.Vector3(-.13,.28,.025),
        new THREE.Vector3(-.25,.82,.055),
        new THREE.Vector3(-.22,1.38,.085),
        new THREE.Vector3(-.04,1.94,.105),
        new THREE.Vector3(.17,2.48,.045),
        new THREE.Vector3(.25,3.02,-.055),
        new THREE.Vector3(.12,3.54,-.135),
        new THREE.Vector3(-.06,4.02,-.19),
        new THREE.Vector3(-.10,4.38,-.21)
      ];
      const trunkPath=catmullPath(trunkControls,12);
      addTubePath(trunkPath,.285,.19,1);

      function trunkAt(height){
        for(let i=0;i<trunkPath.length-1;i++){
          const a=trunkPath[i],b=trunkPath[i+1];
          if(height>=a.y&&height<=b.y){
            const t=(height-a.y)/Math.max(.0001,b.y-a.y);
            return a.clone().lerp(b,t);
          }
        }
        return trunkPath[trunkPath.length-1].clone();
      }

      // Exposed, tapered roots spread from the flare and meet the terrain surface.
      const rootSpecs=[
        {a:.15,l:.83,b:.16,r:.105},
        {a:1.22,l:.66,b:-.12,r:.092},
        {a:2.35,l:.91,b:.18,r:.112},
        {a:3.42,l:.73,b:-.16,r:.088},
        {a:4.62,l:.88,b:.12,r:.105},
        {a:5.55,l:.59,b:-.10,r:.082},
        {a:2.92,l:.52,b:.22,r:.073}
      ];
      for(const root of rootSpecs){
        const start=new THREE.Vector3(-.045,.23,.012);
        const dir=new THREE.Vector3(Math.cos(root.a),0,Math.sin(root.a));
        const side=new THREE.Vector3(-dir.z,0,dir.x);
        const end=new THREE.Vector3(0,-.165,0)
          .addScaledVector(dir,root.l).addScaledVector(side,root.b);
        const c1=start.clone().addScaledVector(dir,root.l*.35)
          .add(new THREE.Vector3(0,-.12,0)).addScaledVector(side,root.b);
        const c2=end.clone().addScaledVector(dir,-root.l*.22)
          .add(new THREE.Vector3(0,.08,0));
        addTubePath(bezierPath(start,c1,c2,end,11),root.r,.19,0);
      }

      // Primary scaffold: irregular heights and directions make a layered,
      // wide crown rather than a radial fan of equal-length limbs.
      const primarySpecs=[
        // Balanced world-depth scaffold: a rounded 3D crown, not a flat fan.
        {h:1.62,a:2.48,len:2.48,rise:.42,bend:.42,r:.145},
        {h:2.02,a:-2.34,len:2.42,rise:-.22,bend:-.34,r:.142},
        {h:2.48,a:1.48,len:2.58,rise:.70,bend:.31,r:.134},
        {h:2.94,a:-1.58,len:2.46,rise:-.12,bend:-.29,r:.124},
        {h:1.88,a:.42,len:2.56,rise:.18,bend:-.40,r:.145},
        {h:2.34,a:3.02,len:2.40,rise:.52,bend:.38,r:.145},
        {h:3.12,a:-.48,len:2.38,rise:.02,bend:-.33,r:.129}
      ];
      const primaryPaths=[];
      for(let i=0;i<primarySpecs.length;i++){
        const spec=primarySpecs[i];
        const start=trunkAt(spec.h);
        const path=growBranch(start,spec.a,spec.len,spec.rise,spec.bend,
          spec.r,1,14,.18);
        primaryPaths.push({path,angle:spec.a});
      }

      // A slender central leader continues the S-curved trunk; small upper
      // limbs emerge from different heights instead of radiating from one hub.
      const leaderRoot=trunkPath[trunkPath.length-1].clone();
      const leaderPath=growBranch(leaderRoot,-.48,.92,.78,.10,.074,2,9,.15);
      const upperSpecs=[
        {start:trunkAt(3.48),a:2.58,l:.82,rise:.54,bend:.16},
        {start:trunkAt(3.86),a:-2.12,l:.76,rise:.42,bend:-.14},
        {start:pointAt(leaderPath,.56),a:1.88,l:.66,rise:.39,bend:.12},
        {start:pointAt(leaderPath,.82),a:-.92,l:.58,rise:.32,bend:-.11}
      ];
      const upperPaths=[];
      for(const spec of upperSpecs){
        upperPaths.push(growBranch(spec.start,spec.a,spec.l,spec.rise,spec.bend,.034,2,11,.18));
      }

      // Four secondary boughs leave each primary at uneven intervals.
      // They curve out from the limb, with varied angles and a few gentle droops.
      const secondaryAngleOffsets=[-1.08,.42,1.16,-.58];
      const secondaryRise=[.34,-.24,-.56,.08];
      const secondaryPaths=[];
      for(let i=0;i<primaryPaths.length;i++){
        const parent=primaryPaths[i];
        const positionsOnParent=[.30,.49,.69,.86];
        for(let j=0;j<4;j++){
          const t=positionsOnParent[j];
          const origin=pointAt(parent.path,t);
          const tangent=tangentAt(parent.path,t);
          const baseAngle=horizontalAngle(tangent);
          const angle=baseAngle+secondaryAngleOffsets[j]+signed()*.19;
          const length=.78+rand()*.52;
          const rise=secondaryRise[j]+(j===1||j===2?-rand()*.16:rand()*.20);
          const bend=signed()*.26;
          const path=growBranch(origin,angle,length,rise,bend,
            .043+rand()*.010,2,10,.18);
          secondaryPaths.push({path,angle});
        }
      }

      // Tertiary limbs split off the secondary boughs, alternating direction
      // and height so the structure is not a repeated comb or bottle brush.
      const tertiaryOffsets=[-1.02,.86,-.48];
      const tertiaryPaths=[];
      for(const parent of secondaryPaths){
        const positionsOnParent=[.39,.66,.87];
        for(let j=0;j<3;j++){
          const t=positionsOnParent[j];
          const origin=pointAt(parent.path,t);
          const tangent=tangentAt(parent.path,t);
          const angle=horizontalAngle(tangent)+tertiaryOffsets[j]+signed()*.26;
          const length=.48+rand()*.43;
          const rise=[-.34,.30,-.48][j]+(j===1?rand()*.16:-rand()*.14);
          const path=growBranch(origin,angle,length,rise,signed()*.18,
            .019+rand()*.005,3,9,.18);
          tertiaryPaths.push({path,angle});
        }
      }

      // Fine branchlets and terminal twigs: retain their paths so foliage
      // can grow directly from the slender wood rather than floating nearby.
      const terminalPaths=[];
      const twigOffsets=[-.94,.98];
      let fineTwigCount=0;
      for(const parent of tertiaryPaths){
        const positionsOnParent=[.57,.86];
        for(let j=0;j<2;j++){
          const t=positionsOnParent[j];
          const origin=pointAt(parent.path,t);
          const tangent=tangentAt(parent.path,t);
          const angle=horizontalAngle(tangent)+twigOffsets[j]+signed()*.34;
          const length=.27+rand()*.32;
          const rise=[.24,-.18,-.42,.06][(j+(fineTwigCount%4))%4]+signed()*.10;
          const twigPath=growBranch(origin,angle,length,rise,signed()*.13,
            .0085+rand()*.0035,4,8,.20);
          terminalPaths.push(twigPath);
          fineTwigCount++;
        }
      }

      // Hanging branch sprays descend from the undersides of the long boughs.
      // They create the layered, irregular Japanese maple silhouette instead
      // of the previous upward-only fan. Keep them slender and naturally tapered.
      let hangingSprayCount=0;
      for(let i=0;i<primaryPaths.length;i++){
        const parent=primaryPaths[i];
        for(const t of [.42,.68,.88]){
          const origin=pointAt(parent.path,t);
          const tangent=tangentAt(parent.path,t);
          const angle=horizontalAngle(tangent)+(rand()<.5?-.92:.84)+signed()*.22;
          const length=.42+rand()*.34;
          const rise=-.34-rand()*.34;
          const sprayPath=growBranch(origin,angle,length,rise,signed()*.16,
            .014+rand()*.004,3,8,.19);
          terminalPaths.push(sprayPath);
          hangingSprayCount++;
        }
      }

      // A small number of extra terminal forks break up the outline of long boughs.
      for(let i=0;i<primaryPaths.length;i++){
        const parent=primaryPaths[i];
        for(const t of [.91,.97]){
          const origin=pointAt(parent.path,t);
          const tangent=tangentAt(parent.path,t);
          const angle=horizontalAngle(tangent)+(rand()<.5?-.62:.71);
          const forkPath=growBranch(origin,angle,.30+rand()*.19,.12+rand()*.22,
            signed()*.10,.010,4,8,.16);
          terminalPaths.push(forkPath);
          fineTwigCount++;
        }
      }

      // V64 — ADDITIVE UPRIGHT SHOOTS ONLY.
      // These are entirely new branches grafted onto existing secondary
      // boughs. No existing primary/secondary/tertiary/terminal path is edited,
      // moved, replaced, or regenerated. Their elevation is 65–85 degrees
      // above horizontal; azimuths alternate so additions occupy depth as
      // well as the visible left/right silhouette.
      const uprightBranchPaths=[];
      const uprightBranchCount=Math.min(14,Math.floor(secondaryPaths.length/2));
      for(let i=0;i<uprightBranchCount;i++){
        const parent=secondaryPaths[(i*2+1)%secondaryPaths.length];
        const attachT=[.52,.66,.78,.59,.73,.86,.62][i%7];
        const origin=pointAt(parent.path,attachT);
        const tangent=tangentAt(parent.path,attachT);
        const azimuthOffset=(i%2===0?-1:1)*(.62+(i%3)*.22);
        const azimuth=horizontalAngle(tangent)+azimuthOffset+signed()*.10;
        const inclinationDeg=65+(i%7)*3+rand()*2;
        const inclination=inclinationDeg*Math.PI/180;
        const rise=.60+rand()*.18;
        const horizontalLength=rise/Math.tan(inclination);
        const path=growBranch(origin,azimuth,horizontalLength,rise,
          signed()*.14,.0125+rand()*.0025,3,9,.16);
        uprightBranchPaths.push(path);
      }

      // V65 — ADDITIVE CANOPY-FILLING BOUGHS.
      // V64's upright shoots were too short to create a fuller crown. These
      // longer new boughs grow from existing secondary limbs into open canopy
      // pockets, with paired tertiary forks. No existing path is modified.
      const canopyFillPaths=[];
      const canopyFillTwigPaths=[];
      const fillCount=12;
      for(let i=0;i<fillCount;i++){
        const parent=secondaryPaths[(i*3+1)%secondaryPaths.length];
        const attachT=[.34,.58,.76,.46,.68,.84][i%6];
        const origin=pointAt(parent.path,attachT);
        const tangent=tangentAt(parent.path,attachT);
        const base=horizontalAngle(tangent);
        const depthSign=(i%2===0?1:-1);
        const angle=base+depthSign*(.72+(i%3)*.20)+signed()*.14;
        const length=.82+rand()*.26;
        const rise=.18+rand()*.28;
        const bend=signed()*.22;
        const path=growBranch(origin,angle,length,rise,bend,
          .022+rand()*.004,3,10,.15);
        canopyFillPaths.push(path);
        for(let j=0;j<2;j++){
          const forkT=j===0?.56:.82;
          const forkOrigin=pointAt(path,forkT);
          const forkTangent=tangentAt(path,forkT);
          const forkAngle=horizontalAngle(forkTangent)+(j===0?-.82:.88)+signed()*.16;
          const fork=growBranch(forkOrigin,forkAngle,.43+rand()*.18,
            (j===0?.20:-.08)+signed()*.10,signed()*.12,
            .0105+rand()*.002,4,8,.17);
          canopyFillTwigPaths.push(fork);
        }
      }

      // V66 — CONTINUOUS LAYERED MAPLE CROWN.
      // Add a new fine-ramification network through open canopy volume.
      // All V65 branches and foliage remain untouched; these are additional
      // boughs, forks and leaf sprays, distributed across front/back and height.
      const crownBoughPaths=[];
      const crownTwigPaths=[];
      const crownAnchorSpecs=[
        ...primaryPaths.map((entry,i)=>({path:entry.path,t:[.34,.56,.76][i%3],tier:'primary',i})),
        ...secondaryPaths.filter((entry,i)=>i%3===1).map((entry,i)=>({path:entry.path,t:[.38,.62,.82][i%3],tier:'secondary',i}))
      ];
      for(let i=0;i<18;i++){
        const anchor=crownAnchorSpecs[(i*5+2)%crownAnchorSpecs.length];
        const origin=pointAt(anchor.path,anchor.t);
        const tangent=tangentAt(anchor.path,anchor.t);
        const base=horizontalAngle(tangent);
        const side=(i%2===0?1:-1);
        const azimuth=base+side*(.54+(i%4)*.23)+signed()*.18;
        const length=.68+rand()*.40;
        const rise=[.36,.12,-.08,.28,.48,-.18][i%6]+signed()*.08;
        const bend=signed()*.24;
        const bough=growBranch(origin,azimuth,length,rise,bend,
          .017+rand()*.004,3,11,.14);
        crownBoughPaths.push(bough);
        // Fine twigs fan from each new bough at unequal positions.
        for(let j=0;j<2;j++){
          const t=j===0?.48:.79;
          const twigOrigin=pointAt(bough,t);
          const twigTangent=tangentAt(bough,t);
          const twigAngle=horizontalAngle(twigTangent)+(j===0?-.92:.86)+signed()*.18;
          const twigRise=(j===0?.20:-.12)+signed()*.12;
          const twig=growBranch(twigOrigin,twigAngle,.34+rand()*.22,twigRise,
            signed()*.12,.0075+rand()*.0018,4,8,.18);
          crownTwigPaths.push(twig);
        }
      }

      // V67 — RAISED UMBRELLA CROWN (ADDITIVE).
      // The previous additions accumulated below the scaffold and read as a
      // hanging skirt. These new limbs start higher on the trunk/upper leader,
      // spread laterally through the upper crown, then fork into fine sprays.
      // No V66 branch path or leaf placement is changed.
      const raisedCrownPaths=[];
      const raisedCrownTwigPaths=[];
      const raisedAnchors=[
        trunkAt(2.62),trunkAt(2.98),trunkAt(3.34),trunkAt(3.70),
        pointAt(leaderPath,.34),pointAt(leaderPath,.68),
        ...upperPaths.map(path=>pointAt(path,.48))
      ];
      const raisedCount=12;
      for(let i=0;i<raisedCount;i++){
        const origin=raisedAnchors[i%raisedAnchors.length].clone();
        const azimuth=(i/raisedCount)*Math.PI*2 + (i%2===0?.16:-.13);
        const length=.98+rand()*.34;
        const rise=.30+rand()*.34;
        const bend=signed()*.18;
        const bough=growBranch(origin,azimuth,length,rise,bend,
          .024+rand()*.004,3,12,.14);
        raisedCrownPaths.push(bough);
        // Forks are biased outward and slightly upward, creating open pads.
        for(let j=0;j<2;j++){
          const t=j===0?.48:.78;
          const forkOrigin=pointAt(bough,t);
          const forkTangent=tangentAt(bough,t);
          const forkAzimuth=horizontalAngle(forkTangent)+(j===0?-.72:.76)+signed()*.12;
          const fork=growBranch(forkOrigin,forkAzimuth,.48+rand()*.20,
            .16+rand()*.18,signed()*.10,.009+rand()*.002,4,9,.16);
          raisedCrownTwigPaths.push(fork);
        }
      }

      // V68 — EXTENDED UPPER-CROWN RAMIFICATION (ADDITIVE ONLY).
      // Extend the raised V67 canopy outward and slightly upward. These are
      // new grafted limbs on the raised crown paths; no existing branch is
      // moved, shortened, replaced, or regenerated.
      const extendedCrownPaths=[];
      const extendedCrownTwigPaths=[];
      for(let i=0;i<raisedCrownPaths.length;i++){
        const parent=raisedCrownPaths[i];
        const attachT=[.38,.62,.46,.72][i%4];
        const origin=pointAt(parent,attachT);
        const tangent=tangentAt(parent,attachT);
        const baseAngle=horizontalAngle(tangent);
        // Alternate around the tree's depth axis to broaden the crown in 3D.
        const side=i%2===0?1:-1;
        const azimuth=baseAngle+side*(.66+(i%3)*.18)+signed()*.12;
        const length=1.22+rand()*.38;
        const rise=.26+rand()*.22;
        const bend=signed()*.18;
        const bough=growBranch(origin,azimuth,length,rise,bend,
          .019+rand()*.003,3,12,.14);
        extendedCrownPaths.push(bough);
        // Longer, fine outward forks soften each new bough into a leaf pad.
        for(let j=0;j<2;j++){
          const forkT=j===0?.46:.78;
          const forkOrigin=pointAt(bough,forkT);
          const forkTangent=tangentAt(bough,forkT);
          const forkAngle=horizontalAngle(forkTangent)+(j===0?-.78:.82)+signed()*.12;
          const forkLength=.58+rand()*.18;
          const forkRise=(j===0?.20:.10)+rand()*.10;
          const fork=growBranch(forkOrigin,forkAngle,forkLength,forkRise,
            signed()*.10,.0085+rand()*.0017,4,9,.16);
          extendedCrownTwigPaths.push(fork);
        }
      }

      // V70 — RIGHT-HAND CROWN BALANCING (ADDITIVE ONLY).
      // Select existing bough anchors on the tree's local +X side, which maps
      // to the right side of the Weather camera. Grow new outward boughs and
      // fine forks there only; V69's complete branch network is left intact.
      const rightCrownPaths=[];
      const rightCrownTwigPaths=[];
      const rightCandidates=[];
      function addRightCandidate(path,t,kind,index){
        const point=pointAt(path,t);
        if(point.x>.18&&point.y>1.35)
          rightCandidates.push({path,t,kind,index,point});
      }
      for(let i=0;i<primaryPaths.length;i++)
        addRightCandidate(primaryPaths[i].path,.72,'primary',i);
      for(let i=0;i<secondaryPaths.length;i++)
        addRightCandidate(secondaryPaths[i].path,.68,'secondary',i);
      for(let i=0;i<raisedCrownPaths.length;i++)
        addRightCandidate(raisedCrownPaths[i],.68,'raised',i);
      for(let i=0;i<extendedCrownPaths.length;i++)
        addRightCandidate(extendedCrownPaths[i],.68,'extended',i);
      for(let i=0;i<canopyFillPaths.length;i++)
        addRightCandidate(canopyFillPaths[i],.68,'fill',i);

      rightCandidates.sort((a,b)=>b.point.x-a.point.x);
      const selectedRightAnchors=[];
      for(const candidate of rightCandidates){
        if(selectedRightAnchors.length>=6)break;
        if(selectedRightAnchors.every(item=>item.point.distanceTo(candidate.point)>.30))
          selectedRightAnchors.push(candidate);
      }
      // In unusually narrow crowns, fill any remaining slots without modifying
      // the selected paths; each addition still grows outward on local +X.
      for(const candidate of rightCandidates){
        if(selectedRightAnchors.length>=6)break;
        if(!selectedRightAnchors.includes(candidate))
          selectedRightAnchors.push(candidate);
      }
      for(let i=0;i<selectedRightAnchors.length;i++){
        const anchor=selectedRightAnchors[i];
        const origin=pointAt(anchor.path,anchor.t);
        const azimuth=signed()*.40;
        const length=.82+rand()*.24;
        const rise=.18+rand()*.28;
        const main=growBranch(origin,azimuth,length,rise,signed()*.16,
          .016+rand()*.003,3,11,.15);
        rightCrownPaths.push(main);
        // Two new fine forks continue the rightward silhouette and add depth.
        for(let j=0;j<2;j++){
          const forkT=j===0?.54:.82;
          const forkOrigin=pointAt(main,forkT);
          const forkAngle=signed()*.72+(j===0?-.10:.10);
          const fork=growBranch(forkOrigin,forkAngle,.42+rand()*.16,
            .12+rand()*.16,signed()*.10,.0075+rand()*.0018,4,8,.17);
          rightCrownTwigPaths.push(fork);
        }
      }

      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const barkMaterial=new THREE.MeshStandardMaterial({
        color:'#ffffff',vertexColors:true,roughness:.96,metalness:0,
        side:THREE.DoubleSide
      });
      const barkMesh=new THREE.Mesh(geometry,barkMaterial);
      barkMesh.castShadow=true;
      barkMesh.receiveShadow=true;
      maple.add(barkMesh);

      // V55 — KEEP MAPLE FALLBACK STATE OUTSIDE THE OPTIONAL FOLIAGE SCOPE.
      // The V54 catch protected leaf creation, but its bookkeeping variables
      // were block-scoped inside try and then referenced after catch. That
      // second ReferenceError still aborted createMomiji and hid the tree.
      let renderedLeafCount=0;
      let leafShapeCount=0;
      let leafShapeInstances=[];
      // V62 — THREE-DIMENSIONAL BRANCH DISTRIBUTION; V61 FOLIAGE RETAINED.
      // Preserve the V59 branch skeleton and V60 leaf design. Slightly fuller clusters,
      // grouped colour and varied 3-D leaf planes replace the dense paper-card look.
      let foliageError=null;
      try {
        // Palmate five-lobed Japanese maple silhouettes. Each template varies
        // the lobe depth and serration slightly while retaining a clear leaf shape.
        const leafShapes=[
          [[0,-.52],[-.08,-.34],[-.20,-.31],[-.25,-.19],[-.39,-.22],[-.36,-.08],[-.53,-.02],[-.39,.08],[-.43,.24],[-.25,.19],[-.13,.39],[0,.30],[.13,.39],[.25,.19],[.43,.24],[.39,.08],[.53,-.02],[.36,-.08],[.39,-.22],[.25,-.19],[.20,-.31],[.08,-.34]],
          [[0,-.56],[-.07,-.35],[-.18,-.33],[-.28,-.18],[-.42,-.24],[-.38,-.07],[-.55,.02],[-.37,.12],[-.45,.28],[-.24,.20],[-.12,.42],[0,.32],[.12,.42],[.24,.20],[.45,.28],[.37,.12],[.55,.02],[.38,-.07],[.42,-.24],[.28,-.18],[.18,-.33],[.07,-.35]],
          [[0,-.49],[-.10,-.32],[-.22,-.29],[-.24,-.16],[-.40,-.17],[-.34,-.03],[-.51,.04],[-.36,.14],[-.39,.27],[-.22,.22],[-.10,.38],[0,.29],[.10,.38],[.22,.22],[.39,.27],[.36,.14],[.51,.04],[.34,-.03],[.40,-.17],[.24,-.16],[.22,-.29],[.10,-.32]],
          [[0,-.54],[-.06,-.36],[-.17,-.30],[-.29,-.22],[-.41,-.20],[-.35,-.05],[-.54,.00],[-.38,.11],[-.42,.25],[-.23,.18],[-.14,.40],[0,.33],[.14,.40],[.23,.18],[.42,.25],[.38,.11],[.54,.00],[.35,-.05],[.41,-.20],[.29,-.22],[.17,-.30],[.06,-.36]]
        ];
        const palette=[
          ['#a91f35','#bd2940','#cc3547'],
          ['#bd2637','#d13a3b','#df5140'],
          ['#c9432c','#df5a2e','#e97835'],
          ['#d65a2d','#e77735','#ed9340'],
          ['#a82c45','#c23b50','#d64b55'],
          ['#c34a32','#d86636','#e58a3e']
        ];
        const foliagePositions=[],foliageColors=[];
        leafShapeInstances=leafShapes.map(()=>0);
        let leafIndex=0;
        const worldUp=new THREE.Vector3(0,1,0);
        const foliageCameraWorld=new THREE.Vector3(0,7.0,27.7);

        function emitLeaf(path,t,shapeIndex,size,tintHex,clusterSide,clusterLift){
          const origin=pointAt(path,clamp(t,.03,.99));
          const tangent=tangentAt(path,clamp(t,.03,.99)).normalize();
          const worldOrigin=new THREE.Vector3(x+origin.x*scale,origin.y*scale,z+origin.z*scale);
          const toCamera=foliageCameraWorld.clone().sub(worldOrigin).normalize();
          // Keep the leaf partly dimensional: face the camera, but let its
          // normal retain a substantial component perpendicular to the twig.
          let normal=new THREE.Vector3().crossVectors(tangent,worldUp);
          if(normal.lengthSq()<.001) normal.set(1,0,0);
          normal.normalize();
          if(normal.dot(toCamera)<0) normal.negate();
          normal.lerp(toCamera,.48).normalize();
          let axis=tangent.clone().addScaledVector(normal,-tangent.dot(normal)).normalize();
          if(axis.lengthSq()<.001) axis.copy(worldUp).addScaledVector(normal,-worldUp.dot(normal)).normalize();
          const side=new THREE.Vector3().crossVectors(axis,normal).normalize();
          const roll=signed()*.42, cr=Math.cos(roll), sr=Math.sin(roll);
          const leafSide=side.clone().multiplyScalar(cr).addScaledVector(axis,sr);
          const leafAxis=axis.clone().multiplyScalar(cr).addScaledVector(side,-sr);
          // Cluster offsets are small and originate on the twig, never in free space.
          const anchor=origin.clone()
            .addScaledVector(side,clusterSide)
            .addScaledVector(normal,.012+clusterLift);
          const outline=leafShapes[shapeIndex];
          const tint=new THREE.Color(tintHex);
          const center=[0,.015];
          function vertex(q){
            const p=anchor.clone()
              .addScaledVector(leafSide,q[0]*size)
              .addScaledVector(leafAxis,(q[1]-center[1])*size)
              .addScaledVector(normal,.006+Math.abs(q[0])*.008);
            foliagePositions.push(p.x,p.y,p.z);
            foliageColors.push(tint.r,tint.g,tint.b);
          }
          for(let i=0;i<outline.length;i++){
            vertex(center); vertex(outline[i]); vertex(outline[(i+1)%outline.length]);
          }
          leafShapeInstances[shapeIndex]++;
          renderedLeafCount++;
        }

        function addLeafCluster(path,t,count,dominant){
          const family=palette[dominant%palette.length];
          // Each cluster fans around a single twig junction. Staggering along
          // the wood and across its depth prevents the overlapping-card effect.
          for(let k=0;k<count;k++){
            const spread=(k-(count-1)/2);
            const along=spread*.075+(signed()*.018);
            const leafT=clamp(t+along,.06,.985);
            const shapeIndex=(leafIndex+Math.floor(rand()*leafShapes.length))%leafShapes.length;
            const tint=family[Math.floor(rand()*family.length)];
            const size=.19+rand()*.075;
            const sideOffset=spread*.045+signed()*.018;
            const lift=.008+rand()*.018;
            emitLeaf(path,leafT,shapeIndex,size,tint,sideOffset,lift);
            leafIndex++;
          }
        }

        // V69 — modest fullness pass: extra sprays on existing wood only.
        // This increases foliage density without creating new branch geometry.
        for(let i=0;i<primaryPaths.length;i++)
          addLeafCluster(primaryPaths[i].path,.56,3,i+1);
        addLeafCluster(leaderPath,.58,3,2);
        for(let i=0;i<upperPaths.length;i++)
          addLeafCluster(upperPaths[i],.54,3,i+3);
        for(let i=0;i<secondaryPaths.length;i++)
          addLeafCluster(secondaryPaths[i].path,.54,3,i+2);
        for(let i=0;i<tertiaryPaths.length;i++)
          addLeafCluster(tertiaryPaths[i].path,.48,3,i+4);

        // Restrained upper accents; the tree's wood remains readable.
        for(let i=0;i<primaryPaths.length;i++){
          addLeafCluster(primaryPaths[i].path,.88,3,i);
        }
        addLeafCluster(leaderPath,.90,3,1);
        for(let i=0;i<upperPaths.length;i++) addLeafCluster(upperPaths[i],.88,3,i+2);

        // New upright shoots receive their own leaves; existing leaf sprays
        // below remain untouched and continue to use their original paths.
        for(let i=0;i<uprightBranchPaths.length;i++){
          addLeafCluster(uprightBranchPaths[i],.60,4,i+1);
          addLeafCluster(uprightBranchPaths[i],.94,4,i+1);
        }

        // New canopy-fill boughs receive two sprays each; their new forks
        // receive one spray each. Existing V64 leaf loops remain unchanged.
        for(let i=0;i<canopyFillPaths.length;i++){
          addLeafCluster(canopyFillPaths[i],.56,4,i+4);
          addLeafCluster(canopyFillPaths[i],.91,4,i+4);
        }
        for(let i=0;i<canopyFillTwigPaths.length;i++)
          addLeafCluster(canopyFillTwigPaths[i],.86,4,i+6);

        // Layered crown sprays: distribute compact clusters along the new
        // boughs and their fine twigs, not just at branch tips.
        for(let i=0;i<crownBoughPaths.length;i++){
          addLeafCluster(crownBoughPaths[i],.34,4,i+2);
          addLeafCluster(crownBoughPaths[i],.68,4,i+2);
          addLeafCluster(crownBoughPaths[i],.94,4,i+2);
        }
        for(let i=0;i<crownTwigPaths.length;i++){
          addLeafCluster(crownTwigPaths[i],.62,4,i+5);
          addLeafCluster(crownTwigPaths[i],.94,4,i+5);
        }

        // Raised crown foliage: leaf pads follow the new upper umbrella
        // scaffold and fine forks, keeping the canopy above the hanging skirt.
        for(let i=0;i<raisedCrownPaths.length;i++){
          addLeafCluster(raisedCrownPaths[i],.42,4,i+2);
          addLeafCluster(raisedCrownPaths[i],.76,4,i+2);
          addLeafCluster(raisedCrownPaths[i],.96,3,i+2);
        }
        for(let i=0;i<raisedCrownTwigPaths.length;i++){
          addLeafCluster(raisedCrownTwigPaths[i],.72,4,i+5);
          addLeafCluster(raisedCrownTwigPaths[i],.96,3,i+5);
        }

        // V68 leaf sprays follow the new extended boughs and fine forks.
        // Three small sprays along each bough, two along each fork.
        for(let i=0;i<extendedCrownPaths.length;i++){
          addLeafCluster(extendedCrownPaths[i],.34,4,i+3);
          addLeafCluster(extendedCrownPaths[i],.68,4,i+3);
          addLeafCluster(extendedCrownPaths[i],.95,4,i+3);
        }
        for(let i=0;i<extendedCrownTwigPaths.length;i++){
          addLeafCluster(extendedCrownTwigPaths[i],.58,3,i+5);
          addLeafCluster(extendedCrownTwigPaths[i],.94,3,i+5);
        }

        // V70 right-side leaf sprays: two clusters on every new bough and
        // one on each fine fork. Existing V69 foliage placement is unchanged.
        for(let i=0;i<rightCrownPaths.length;i++){
          addLeafCluster(rightCrownPaths[i],.58,4,i+7);
          addLeafCluster(rightCrownPaths[i],.94,4,i+7);
        }
        for(let i=0;i<rightCrownTwigPaths.length;i++)
          addLeafCluster(rightCrownTwigPaths[i],.88,4,i+9);

        // One compact cluster per secondary bough, two on each tertiary limb.
        for(let i=0;i<secondaryPaths.length;i++)
          addLeafCluster(secondaryPaths[i].path,.88,4,i+1);
        for(let i=0;i<tertiaryPaths.length;i++)
          addLeafCluster(tertiaryPaths[i].path,.78,4,i+2);

        // Every terminal twig is still dressed with a compact four-leaf spray;
        // the additional leaf restores canopy fullness without enlarging blades.
        for(let i=0;i<terminalPaths.length;i++)
          addLeafCluster(terminalPaths[i],.84,4,i+3);

        if(!renderedLeafCount||!foliagePositions.length)
          throw new Error('No maple leaf vertices were generated');
        const foliageGeometry=new THREE.BufferGeometry();
        foliageGeometry.setAttribute('position',new THREE.Float32BufferAttribute(foliagePositions,3));
        foliageGeometry.setAttribute('color',new THREE.Float32BufferAttribute(foliageColors,3));
        foliageGeometry.computeVertexNormals();
        const foliageMaterial=new THREE.MeshBasicMaterial({
          vertexColors:true,side:THREE.DoubleSide,transparent:false
        });
        const foliage=new THREE.Mesh(foliageGeometry,foliageMaterial);
        foliage.name='MomijiNaturalFiveLobeFoliageV61';
        foliage.frustumCulled=false;
        foliage.castShadow=false;
        foliage.receiveShadow=false;
        maple.add(foliage);
        leafShapeCount=leafShapes.length;
      } catch(error) {
        foliageError=String(error&&error.message||error);
        console.error('[LIVE // EARTH] Natural maple foliage build failed:',error);
      }
      maple.position.set(x,0,z);
      maple.scale.setScalar(scale*.765); // Final maple scale: 10% smaller than the previous 85% size.
      maple.userData.isMomiji=true;
      maple.userData.stage=renderedLeafCount?'natural-five-lobe-maple-foliage-v61':'branch-skeleton-fallback';
      maple.userData.foliageError=foliageError;
      maple.userData.branchCount={
        trunk:1,
        roots:rootSpecs.length,
        primary:primarySpecs.length,
        upperLeaders:1+upperSpecs.length,
        secondary:secondaryPaths.length,
        hangingSprays:hangingSprayCount,
        tertiary:tertiaryPaths.length,
        fineTwigs:fineTwigCount,
        addedUprightShoots:uprightBranchPaths.length,
        total:1+rootSpecs.length+primarySpecs.length+
          1+upperSpecs.length+secondaryPaths.length+
          tertiaryPaths.length+fineTwigCount+uprightBranchPaths.length
      };
      maple.userData.leafCount=renderedLeafCount;
      maple.userData.leafShapeCount=leafShapeCount;
      maple.userData.leafShapeInstances=leafShapeInstances;
      maple.userData.extendedCrownBoughs=extendedCrownPaths.length;
      maple.userData.extendedCrownForks=extendedCrownTwigPaths.length;
      maple.userData.rightCrownBoughs=rightCrownPaths.length;
      maple.userData.rightCrownTwigs=rightCrownTwigPaths.length;
      maple.userData.raisedCrownBoughs=raisedCrownPaths.length;
      maple.userData.raisedCrownTwigs=raisedCrownTwigPaths.length;
      maple.userData.crownBoughs=crownBoughPaths.length;
      maple.userData.crownFineTwigs=crownTwigPaths.length;
      maple.userData.canopyFillBoughs=canopyFillPaths.length;
      maple.userData.canopyFillTwigs=canopyFillTwigPaths.length;
      maple.userData.branchPathCount=pathCount+canopyFillPaths.length+canopyFillTwigPaths.length;
      maple.userData.leafCoverage={
        primary:primaryPaths.length,
        upper:1+upperPaths.length,
        secondary:secondaryPaths.length,
        tertiary:tertiaryPaths.length,
        terminal:terminalPaths.length,
        addedUpright:uprightBranchPaths.length
      };
      scene.add(maple);
      return maple;
    }
    // V54 — isolate the optional maple asset from the core Weather renderer.
    // Even an unexpected tree-build error must not blank the pavilion/world.
    try {
      const momiji=createMomiji(3.02,4.72,.92);
      trees.push(momiji);
    } catch(mapleError) {
      console.error('[LIVE // EARTH] Maple model failed; continuing with the Weather world.',mapleError);
    }


    // V72 — JAPANESE GARDEN LANTERN + EVERGREEN PINE.
    // Independent scenery additions: the existing maple, pavilion, camera and
    // all established tree placements remain untouched. Composition follows
    // the supplied reference: stone lantern on the left, sculpted green pine
    // as a quiet counterweight behind it.
    const gardenLantern=new THREE.Group();
    const lanternStone=mat('#77776c',.94),lanternEdge=mat('#969184',.9),
      lanternDark=mat('#343a39',.82),lanternGlow=new THREE.MeshStandardMaterial({
        color:'#ffc66f',emissive:'#ff9a35',emissiveIntensity:2.15,
        roughness:.48
      });
    function lanternBox(parent,material,x,y,z,sx,sy,sz){
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
      mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    // Broad foot, tapered stone shaft and cap create a traditional yukimi-style
    // garden lantern silhouette without relying on external models or textures.
    const lanternFoot=new THREE.Mesh(new THREE.BoxGeometry(1.05,.22,.92),lanternStone);
    lanternFoot.position.y=.12;gardenLantern.add(lanternFoot);
    const lanternFootLip=new THREE.Mesh(new THREE.BoxGeometry(.91,.10,.78),lanternEdge);
    lanternFootLip.position.y=.28;gardenLantern.add(lanternFootLip);
    const lanternStem=new THREE.Mesh(new THREE.CylinderGeometry(.25,.39,1.02,8),lanternStone);
    lanternStem.position.y=.84;gardenLantern.add(lanternStem);
    const lanternCollar=new THREE.Mesh(new THREE.BoxGeometry(.86,.16,.78),lanternEdge);
    lanternCollar.position.y=1.39;gardenLantern.add(lanternCollar);
    const chamber=new THREE.Group();chamber.position.y=1.78;gardenLantern.add(chamber);
    lanternBox(chamber,lanternDark,0,.28,0,.86,.66,.78);
    lanternBox(chamber,lanternGlow,0,.28,.397,.48,.43,.018);
    lanternBox(chamber,lanternGlow,0,.28,-.397,.48,.43,.018);
    lanternBox(chamber,lanternGlow,.437,.28,0,.018,.43,.46);
    lanternBox(chamber,lanternGlow,-.437,.28,0,.018,.43,.46);
    for(const x of [-.36,.36])for(const z of [-.32,.32]){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.075,.72,.075),lanternEdge);
      post.position.set(x,.28,z);chamber.add(post);
    }
    const chamberTop=new THREE.Mesh(new THREE.BoxGeometry(1.02,.13,.94),lanternEdge);
    chamberTop.position.y=.67;chamber.add(chamberTop);
    const lanternRoof=new THREE.Mesh(new THREE.CylinderGeometry(.12,.78,.30,4,1),lanternStone);
    lanternRoof.rotation.y=Math.PI/4;lanternRoof.position.y=2.52;gardenLantern.add(lanternRoof);
    const roofCap=new THREE.Mesh(new THREE.BoxGeometry(1.48,.12,1.34),lanternEdge);
    roofCap.position.y=2.65;gardenLantern.add(roofCap);
    const roofCrown=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),lanternStone);
    roofCrown.position.y=2.79;gardenLantern.add(roofCrown);
    gardenLantern.position.set(-5.25,0,2.65);
    gardenLantern.scale.setScalar(.78);
    scene.add(gardenLantern);

    // Low, layered evergreen with gently spreading, irregular pine pads.
    // Each pad is real 3D foliage geometry; the silhouette stays readable
    // against the hills and does not compete with the red maple crown.
    const pineGroup=new THREE.Group();
    const pineBark=mat('#49382b',.96),
      pineMats=['#183f35','#20513e','#2b6249','#3b7254'].map(c=>mat(c,.92));
    const pineTrunk=new THREE.Mesh(new THREE.CylinderGeometry(.075,.19,3.15,7),pineBark);
    pineTrunk.position.y=1.575;pineGroup.add(pineTrunk);
    const pineTiers=[
      {y:1.15,r:1.22,h:.70,lean:-.08,mat:0},
      {y:1.78,r:1.08,h:.68,lean:.10,mat:1},
      {y:2.38,r:.88,h:.62,lean:-.06,mat:2},
      {y:2.91,r:.62,h:.54,lean:.08,mat:3},
      {y:3.35,r:.36,h:.43,lean:-.04,mat:2}
    ];
    pineTiers.forEach((tier,index)=>{
      const pad=new THREE.Mesh(
        new THREE.ConeGeometry(tier.r,tier.h,9,2),
        pineMats[tier.mat]
      );
      pad.position.set(tier.lean,tier.y,0);
      pad.rotation.z=(index%2?-.055:.045);
      pineGroup.add(pad);
      // Flattened side bough pads give the tree a hand-shaped Japanese garden form.
      for(let side=0;side<3;side++){
        const angle=side*Math.PI*2/3+index*.47;
        const branchPad=new THREE.Mesh(
          new THREE.IcosahedronGeometry(tier.r*.48,1),
          pineMats[(tier.mat+1)%pineMats.length]
        );
        branchPad.position.set(
          Math.cos(angle)*tier.r*.48,
          tier.y-.07+Math.sin(side*2.1)*.045,
          Math.sin(angle)*tier.r*.48
        );
        branchPad.scale.set(1.12,.34,.82);
        branchPad.rotation.y=-angle;
        pineGroup.add(branchPad);
      }
    });
    pineGroup.position.set(-7.25,0,-2.15);
    pineGroup.scale.setScalar(.88);
    scene.add(pineGroup);

    // Main architectural landmark: open pavilion with curved eaves, columns and lanterns.
    const house=new THREE.Group();scene.add(house);house.position.set(0,0,-1.4);house.rotation.y=-15*Math.PI/180;house.userData.refinement='LE-WEATHER-PAVILION-ROTATION-CCW-15-V1';
    const timber=mat('#684a35'),wall=mat('#e6ddc6'),roof=mat('#263b43',.72,.12),dark=mat('#293b38'),gold= new THREE.MeshStandardMaterial({color:'#d69b55',emissive:'#a35b1e',emissiveIntensity:.65});
    function box(parent,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);parent.add(o);return o;}
    // LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1 LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2 LE-WEATHER-PAVILION-TRADITIONAL-STAIRS-PIERS-V3 LE-WEATHER-PAVILION-STAIR-INFILL-V4 LE-WEATHER-PAVILION-FOUR-SIDE-RAILS-V11: lowered proportionate guard rails; raised engawa deck with visible undercroft and centred four-step approach.
    const foundationStone=mat('#777465'),deckPlank=mat('#806044');
    // V3 SINGLE DECK ASSEMBLY: one perimeter frame directly supported by the existing piers.
    // Outer faces align with the single continuous deck-board footprint.
    // V12: slimmer perimeter beams; top remains at y=1.52 beneath the deck boards.
    box(house,timber,0,1.385,2.57,7.58,.27,.24);
    box(house,timber,0,1.385,-2.59,7.58,.27,.24);
    box(house,timber,-3.67,1.385,-.01,.24,.27,5.16);
    box(house,timber,3.67,1.385,-.01,.24,.27,5.16);
    // V13: one compact stone footing per pier; the timber remains the dominant support.
    // Stone runs from ground level to y=.40. The timber pier continues directly to
    // the unchanged perimeter-beam underside at y=1.25 (no stacked stone socket).
    const pierFootingHeight=.40,pierPostHeight=1.25-pierFootingHeight;
    const pierPositions=[];
    for(const x of [-3.42,0,3.42])for(const z of [-2.34,2.34])pierPositions.push([x,z]);
    for(const x of [-3.42,3.42])pierPositions.push([x,0]);
    for(const [x,z] of pierPositions){
      box(house,foundationStone,x,pierFootingHeight/2,z,.44,pierFootingHeight,.44);
      box(house,dark,x,pierFootingHeight+pierPostHeight/2,z,.30,pierPostHeight,.30);
    }
    // One continuous walking surface: ten close-laid boards with no open seams.
    // Boards sit directly on the single perimeter support frame.
    for(let i=0;i<10;i++){
      const z=-2.44+i*.54;
      box(house,deckPlank,0,1.55,z,7.58,.045,.54);
    }
    // V13: four evenly-rising closed timber risers with slimmer, single-board treads.
    // The 1.00-unit tread depth gives a restrained .05-unit overlap at the .95-unit pitch.
    // Each riser finishes against the underside of its tread; no duplicate infill is needed.
    // The final tread top remains exactly level with the single deck surface (y=1.5725).
    const stairBottom=.02,stairDeckTop=1.5725,stairRise=(stairDeckTop-stairBottom)/4;
    const treadThickness=.055,treadDepth=1.00,riserDepth=.055;
    const entranceSteps=[
      {z:4.20,front:stairBottom,top:stairBottom+stairRise},
      {z:3.25,front:stairBottom+stairRise,top:stairBottom+stairRise*2},
      {z:2.30,front:stairBottom+stairRise*2,top:stairBottom+stairRise*3},
      {z:1.35,front:stairBottom+stairRise*3,top:stairDeckTop}
    ];
    for(const step of entranceSteps){
      const rise=step.top-step.front;
      const riserHeight=rise-treadThickness;
      const riserCentreY=step.front+riserHeight/2;
      const riserCentreZ=step.z+treadDepth/2-riserDepth/2;
      // Thin closed riser terminates flush at the underside of the tread board.
      box(house,timber,0,riserCentreY,riserCentreZ,4.35,riserHeight,riserDepth);
      // One slim tread board with a small traditional nosing and exact finished height.
      box(house,deckPlank,0,step.top-treadThickness/2,step.z,4.48,treadThickness,treadDepth);
    }
    
    // V3 perimeter guard: one upper handrail; balusters start directly at the deck.
    // Side-rail outer faces coincide with the deck's left/right outer edges.
    for(const x of [-3.70,3.70]){
      box(house,timber,x,2.10,-.01,.18,.14,5.40);
      for(const z of [-1.71,-.01,1.69]){
        box(house,dark,x,1.83,z,.12,.48,.12);
      }
    }

    // Rear guard rail follows the full outer deck edge.
    box(house,timber,0,2.10,-2.62,7.58,.14,.18);
    for(const x of [-2.55,0,2.55]){
      box(house,dark,x,1.83,-2.62,.14,.48,.14);
    }

    // Front rail returns align with the outer edge and leave the full stair opening clear.
    for(const x of [-3.015,3.015]){
      box(house,timber,x,2.10,2.60,1.55,.14,.18);
      for(const offset of [-.52,.52]){
        box(house,dark,x+offset,1.83,2.60,.12,.48,.14);
      }
    }
    // V12: no secondary stair-infill layer; the four thin riser boards above close the stair fronts.
    
    // V14 — PAVILION WALL FRAMEWORK.
    // Replace the old opaque wall block with four readable elevations made from
    // individual timber-framed Shoji panels. The foundation, deck, rails, posts,
    // roof, camera and surrounding scenery remain untouched.
    const shojiPaper=new THREE.MeshStandardMaterial({
      color:'#e9e1ce',roughness:1,metalness:0,transparent:true,opacity:.84,
      depthWrite:false,side:THREE.DoubleSide
    });
    const wallBottom=1.66,wallTop=3.43,wallHeight=wallTop-wallBottom;
    const wallMid=(wallBottom+wallTop)/2;
    const frameDepth=.105,frameWidth=.065;
    const wallRailHeight=.075;
    // Build each Shoji leaf as its own group so the front doors can slide independently.
    function frontShojiPanel(parent,cx,panelWidth,z){
      const leaf=new THREE.Group();leaf.position.set(cx,0,z);parent.add(leaf);
      const innerW=panelWidth-frameWidth*2;
      box(leaf,shojiPaper,0,wallMid,0,innerW,wallHeight-frameWidth*2,.018);
      for(const x of [-panelWidth/2+frameWidth/2,panelWidth/2-frameWidth/2])
        box(leaf,timber,x,wallMid,0,frameWidth,wallHeight,frameDepth);
      for(const y of [wallBottom+frameWidth/2,wallTop-frameWidth/2])
        box(leaf,timber,0,y,0,panelWidth,frameWidth,frameDepth);
      // Two horizontal rails and two fine vertical lattice members form a calm Shoji grid.
      for(const y of [wallBottom+wallHeight/3,wallBottom+wallHeight*2/3])
        box(leaf,timber,0,y,.006,innerW,wallRailHeight,.045);
      for(const x of [-panelWidth/6,panelWidth/6])
        box(leaf,timber,x,wallMid,.008,.038,wallHeight-frameWidth*2,.045);
      return leaf;
    }
    const shojiDoors=[];
    // Side elevations use the same proportions, rotated into the pavilion depth.
    function sideShojiPanel(x,cz,panelWidth){
      const innerW=panelWidth-frameWidth*2;
      box(house,shojiPaper,x,wallMid,cz,.018,wallHeight-frameWidth*2,innerW);
      for(const z of [cz-panelWidth/2+frameWidth/2,cz+panelWidth/2-frameWidth/2])
        box(house,timber,x,wallMid,z,frameDepth,wallHeight,frameWidth);
      for(const y of [wallBottom+frameWidth/2,wallTop-frameWidth/2])
        box(house,timber,x,y,cz,frameDepth,frameWidth,panelWidth);
      for(const y of [wallBottom+wallHeight/3,wallBottom+wallHeight*2/3])
        box(house,timber,x+.006,y,cz, .045,wallRailHeight,innerW);
      for(const z of [cz-panelWidth/6,cz+panelWidth/6])
        box(house,timber,x+.008,wallMid,z,.045,wallHeight-frameWidth*2,.038);
    }
    const bayWidth=5.9/4;
    for(let i=0;i<4;i++){
      const cx=-5.9/2+bayWidth*(i+.5);
      // Four independent front leaves use two shallow tracks. The inner pair
      // stacks behind the outer pair when opened, clearing the central entrance.
      const frontLeaf=frontShojiPanel(house,cx,bayWidth,(i===0||i===3)?1.91:1.70);
      frontLeaf.userData.isShojiDoor=true;
      frontLeaf.userData.closedX=cx;
      frontLeaf.userData.openX=i===1?-5.9/2+bayWidth*.5:i===2?5.9/2-bayWidth*.5:cx;
      frontLeaf.userData.doorIndex=i;
      // Small bronze-toned recessed finger pulls sit near each leaf's meeting edge.
      // They move with the Shoji leaf and remain understated at the pavilion's viewing scale.
      const pullX=(i<2?1:-1)*(bayWidth/2-.13);
      const pullOuter=new THREE.Mesh(
        new THREE.CylinderGeometry(.072,.072,.026,16),
        mat('#8b7048',.48,.52)
      );
      pullOuter.rotation.x=Math.PI/2;
      pullOuter.position.set(pullX,wallMid,.075);
      frontLeaf.add(pullOuter);
      const pullInset=new THREE.Mesh(
        new THREE.CylinderGeometry(.043,.043,.029,16),
        mat('#302d27',.62,.22)
      );
      pullInset.rotation.x=Math.PI/2;
      pullInset.position.set(pullX,wallMid,.091);
      frontLeaf.add(pullInset);
      shojiDoors.push(frontLeaf);
      frontShojiPanel(house,cx,bayWidth,-1.82); // fixed rear Shoji bays
    }
    // Transparent hit surface across the front Shoji doorway for reliable direct tapping.
    const doorHitMaterial=new THREE.MeshBasicMaterial({
      transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide
    });
    const doorHitSurface=new THREE.Mesh(
      new THREE.BoxGeometry(5.98,wallHeight,.34),doorHitMaterial
    );
    doorHitSurface.position.set(0,wallMid,1.79);
    doorHitSurface.userData.isShojiDoorHitTarget=true;
    house.add(doorHitSurface);
    const sideBayWidth=3.64/2;
    for(const x of [-2.96,2.96])for(let i=0;i<2;i++){
      const cz=-1.82+sideBayWidth*(i+.5);
      sideShojiPanel(x,cz,sideBayWidth);
    }
    // V16 — PAVILION INTERIOR.
    // Quiet tatami flooring, a low tea table and floor cushions become visible
    // through the independently sliding front Shoji doors. All pieces sit on
    // the existing deck; no changes are made to the foundation, stairs or rails.
    const tatamiMat=mat('#b9a77a',.98),tatamiEdge=mat('#574638',.96);
    const tableWood=mat('#503a2d',.82),cushionMat=mat('#65766b',.96);
    const warmPaper=new THREE.MeshStandardMaterial({
      color:'#e9c98d',emissive:'#a66a2d',emissiveIntensity:.24,
      roughness:1,transparent:true,opacity:.92,side:THREE.DoubleSide
    });
    // Six fitted tatami panels form a restrained 3-by-2 interior floor pattern.
    for(const x of [-1.90,0,1.90])for(const z of [-.78,.78]){
      box(house,tatamiMat,x,1.586,z,1.82,.025,1.48);
      for(const edgeX of [x-.88,x+.88])
        box(house,tatamiEdge,edgeX,1.602,z,.045,.012,1.48);
      for(const edgeZ of [z-.72,z+.72])
        box(house,tatamiEdge,x,1.602,edgeZ,1.82,.012,.045);
    }
    // Low tea table with four short legs, centred toward the rear half of the room.
    const tableZ=-.48,tableTopY=2.02;
    box(house,tableWood,0,tableTopY,tableZ,1.48,.105,.86);
    for(const x of [-.61,.61])for(const z of [tableZ-.31,tableZ+.31])
      box(house,tableWood,x,1.82,z,.095,.36,.095);
    // Two simple floor cushions facing one another across the tea table.
    for(const x of [-1.12,1.12]){
      const cushion=box(house,cushionMat,x,1.665,tableZ,.66,.12,.66);
      cushion.rotation.y=x<0?-.12:.12;
      box(house,tableWood,x,1.728,tableZ,.52,.018,.52);
    }
    // Small warm interior lanterns at the rear corners, kept below the Shoji head rail.
    for(const x of [-2.34,2.34]){
      const interiorLantern=new THREE.Group();
      interiorLantern.position.set(x,1.66,-1.28);
      const glow=new THREE.Mesh(new THREE.BoxGeometry(.24,.42,.24),warmPaper);
      interiorLantern.add(glow);
      const topCap=new THREE.Mesh(new THREE.ConeGeometry(.19,.10,4),dark);
      topCap.position.y=.26;interiorLantern.add(topCap);
      const baseCap=new THREE.Mesh(new THREE.BoxGeometry(.27,.045,.27),tableWood);
      baseCap.position.y=-.23;interiorLantern.add(baseCap);
      house.add(interiorLantern);
    }
    // V22 — WARM PAVILION LIGHTING.
    // Soft point lights sit inside the paper lanterns and beneath the Shoji wall.
    // Their intensity follows the selected scene so they glow warmly at night
    // without washing out the pavilion during daylight previews.
    const pavilionLights=[];
    function addPavilionLight(color,intensity,distance,x,y,z){
      const light=new THREE.PointLight(color,intensity,distance,2);
      light.position.set(x,y,z);
      light.userData.dayIntensity=intensity*.22;
      light.userData.nightIntensity=intensity;
      house.add(light);
      pavilionLights.push(light);
    }
    addPavilionLight(0xffc783,.58,7,-3.4,2.58,2.35);
    addPavilionLight(0xffc783,.58,7, 3.4,2.58,2.35);
    addPavilionLight(0xffd49a,.48,5,-2.34,2.02,-1.28);
    addPavilionLight(0xffd49a,.48,5, 2.34,2.02,-1.28);
    addPavilionLight(0xffc783,.22,6,0,2.0,.65);
    // Continuous timber sill and head rails tie the separate panels into one wall system.
    box(house,timber,0,wallBottom,1.82,5.98,.10,.14);
    box(house,timber,0,wallTop,1.82,5.98,.10,.14);
    // Twin guide rails let the front leaves pass one another without intersecting.
    for(const z of [1.70,1.91]){
      box(house,timber,0,wallBottom+.085,z,5.98,.035,.045);
      box(house,timber,0,wallTop-.085,z,5.98,.035,.045);
    }
    box(house,timber,0,wallBottom,-1.82,5.98,.10,.14);
    box(house,timber,0,wallTop,-1.82,5.98,.10,.14);
    for(const x of [-2.96,2.96]){
      box(house,timber,x,wallBottom,0,.14,.10,3.72);
      box(house,timber,x,wallTop,0,.14,.10,3.72);
    }
    // Preserve the original upper timber beam and all four corner posts.
    box(house,timber,0,3.55,0,7.5,.22,5.2);
    for(const x of [-3.15,3.15])for(const z of [-1.85,1.85]){
      box(house,timber,x,2.5,z,.18,2.25,.18);
      // Traditional diagonal knee-brace tying each post into the upper frame.
      const brace=box(house,timber,x-Math.sign(x)*.25,3.27,z,.115,.52,.115);
      brace.rotation.z=-Math.sign(x)*.62;
      const sideBrace=box(house,timber,x,3.27,z-Math.sign(z)*.25,.115,.52,.115);
      sideBrace.rotation.x=Math.sign(z)*.62;
      box(house,mat('#806047',.9),x,3.56,z,.205,.055,.205);
    }
    // V27 — CURVED JAPANESE EAVES, BUILT ONLY WITH CORE THREE GEOMETRY.
    // Start from the known-working V25 pavilion and shape the roof with a
    // sampled surface. No TubeGeometry or CatmullRomCurve3 runtime dependency.
    const roofTopY=5.28,roofEaveY=3.72,roofHalfX=4.15,roofHalfZ=2.95;
    const roofCornerLift=.22,roofCurvePower=5.5;
    const roofPitchLift=0;
    const roofCornerFactor=u=>Math.pow(Math.abs(2*u-1),roofCurvePower);
    const roofSmoothstep=t=>{const q=clamp((t-.58)/.42,0,1);return q*q*(3-2*q);};
    const roofCrossProfile=t=>{
      // Cubic architectural sori: a quiet departure from the ridge,
      // a broad concave shoulder, and a steeper arrival at the eave.
      // This is the master profile shared by roof skin, gable and framing.
      const q=1-t;
      return 3*q*q*t*.04+3*q*t*t*.42+t*t*t;
    };
    function roofPoint(face,t,u,lift=0){
      const profile=roofCrossProfile(t);
      const cornerRise=roofCornerLift*roofCornerFactor(u)*roofSmoothstep(t);
      const pitchBow=roofPitchLift*Math.sin(Math.PI*t);
      let x,y,z;
      if(face==='left'||face==='right'){
        x=(face==='left'?-1:1)*roofHalfX*t;
        z=-roofHalfZ+2*roofHalfZ*u;
        y=roofTopY+(roofEaveY-roofTopY)*profile+cornerRise+pitchBow;
      }else{
        x=-roofHalfX+2*roofHalfX*u;
        z=(face==='front'?1:-1)*roofHalfZ;
        y=roofTopY+(roofEaveY-roofTopY)*profile+cornerRise+pitchBow;
      }
      return new THREE.Vector3(x,y+lift,z);
    }
    function roofFaceGeometry(face,rows=24,cols=36,offset=0){
      const positions=[],indices=[];
      for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
        const p=roofPoint(face,r/rows,c/cols,offset);
        positions.push(p.x,p.y,p.z);
        if(r<rows&&c<cols){
          const a=r*(cols+1)+c,b=a+1,d=(r+1)*(cols+1)+c,e=d+1;
          indices.push(a,d,b,b,d,e);
        }
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setIndex(indices);g.computeVertexNormals();return g;
    }
    const roofUnderMat=mat('#263a40',.82,.08);
    const roofTileMats=[mat('#263b43',.72,.12),mat('#30464b',.78,.08)];
    for(const face of ['left','right']){
      const shell=new THREE.Mesh(roofFaceGeometry(face,48,64,-.025),roofUnderMat);
      shell.material.side=THREE.DoubleSide;house.add(shell);
    }
    // Dense, individually separated tile courses follow the curved roof surface.
    const tilePositions=[[],[]],tileIndices=[[],[]],tileRows=12,tileCols=18;
    for(const face of ['left','right']){
      for(let row=0;row<tileRows;row++)for(let col=0;col<tileCols;col++){
        const t0=.035+row*.079,t1=t0+.067,u0=col/tileCols+.007,u1=(col+1)/tileCols-.007;
        const shade=(row+col+(face==='right'?1:0))%4===0?1:0;
        const verts=[roofPoint(face,t0,u0,.018),roofPoint(face,t1,u0,.018),
          roofPoint(face,t1,u1,.018),roofPoint(face,t0,u1,.018)];
        const arr=tilePositions[shade],idx=tileIndices[shade],b=arr.length/3;
        for(const p of verts)arr.push(p.x,p.y,p.z);
        idx.push(b,b+1,b+2,b,b+2,b+3);
      }
    }
    for(let shade=0;shade<2;shade++){
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(tilePositions[shade],3));
      g.setIndex(tileIndices[shade]);g.computeVertexNormals();
      const mesh=new THREE.Mesh(g,roofTileMats[shade]);mesh.material.side=THREE.DoubleSide;house.add(mesh);
    }
    // Rounded ceramic kawara end caps finish the lower edge of each tiled
    // roof plane. Each cap spans one tile module and follows the bowed eave
    // tangent, producing a restrained scalloped silhouette without a giant
    // continuous tube around the roof.
    const eaveCapMat=mat('#263b43',.62,.18);
    for(const face of ['left','right']){
      // Reserve both ends of each side eave for a single pointed corner finish.
      for(let col=1;col<tileCols-1;col++){
        const u0=col/tileCols+.008,u1=(col+1)/tileCols-.008;
        const a=roofPoint(face,.965,u0,.038);
        const b=roofPoint(face,.965,u1,.038);
        const direction=new THREE.Vector3().subVectors(b,a);
        const length=direction.length();
        if(length<.001)continue;
        const cap=new THREE.Mesh(
          new THREE.CylinderGeometry(.052,.052,length+.012,10),
          eaveCapMat
        );
        cap.position.copy(a).add(b).multiplyScalar(.5);
        cap.quaternion.setFromUnitVectors(
          new THREE.Vector3(0,1,0),direction.normalize()
        );
        house.add(cap);
        // Small rounded ends soften the joints between adjacent tile caps.
        for(const p of [a,b]){
          const end=new THREE.Mesh(new THREE.SphereGeometry(.052,10,7),eaveCapMat);
          end.position.copy(p);house.add(end);
        }
      }
    }
    const gableMat=mat('#49362c',.94),gableTrim=mat('#8a6041',.78);
    // A simple segmented timber beam makes smooth bends without optional curve classes.
    function addRoofBeam(points,radius,material,radialSegments=7){
      for(let i=0;i<points.length-1;i++){
        const a=points[i],b=points[i+1],direction=new THREE.Vector3().subVectors(b,a);
        const length=direction.length();
        if(length<.0001)continue;
        const beam=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,radialSegments),material);
        beam.position.copy(a).add(b).multiplyScalar(.5);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
        house.add(beam);
      }
    }
    function roofEdgePoints(face,samples=24,offset=-.035,trim=.0){
      const points=[];
      for(let i=0;i<=samples;i++){
        const u=trim+(1-2*trim)*i/samples;
        points.push(roofPoint(face,1,u,offset));
      }
      return points;
    }
    // A real timber fascia board gives the curved eave a substantial edge.
    // Short overlapping mesh sections follow the sampled curve and keep
    // the board's broad face aligned to the local eave tangent.
    function addRoofFascia(face,offset=-.125,height=.17,depth=.22,trim=.035){
      const points=roofEdgePoints(face,64,offset,trim);
      const axis=new THREE.Vector3(1,0,0);
      for(let i=0;i<points.length-1;i++){
        const a=points[i],b=points[i+1];
        const direction=new THREE.Vector3().subVectors(b,a);
        const length=direction.length();
        if(length<.0001)continue;
        const board=new THREE.Mesh(
          new THREE.BoxGeometry(length+.018,height,depth),
          timber
        );
        board.position.copy(a).add(b).multiplyScalar(.5);
        board.quaternion.setFromUnitVectors(axis,direction.normalize());
        house.add(board);
      }
    }
    // Four layered eaves: rounded outer nosing, substantial timber fascia,
    // and a fine lower shadow line.
    for(const face of ['left','right','front','back']){
      // Mitred ends leave a clean pocket for one unified pointed corner nose.
      addRoofBeam(roofEdgePoints(face,64,-.035,.035),.085,timber,8);
      addRoofFascia(face,-.125,.17,.22,.035);
      addRoofBeam(roofEdgePoints(face,64,-.225,.05),.014,gableTrim,6);
    }
    // Japanese bracket assemblies (tokyo-inspired): vertical bearing post,
    // outward cantilever, cross-arm and a compact bearing cap. The cantilever
    // changes axis on side eaves so all four elevations project outward.
    function eaveBracket(x,z,side='front',edgeY=roofEaveY){
      const y=edgeY-.32;
      const frontBack=side==='front'||side==='back';
      const outward=side==='front'?1:side==='back'?-1:side==='right'?1:-1;
      box(house,timber,x,y,z,.14,.34,.16);

      const cantilever=box(
        house,gableTrim,
        x+(frontBack?0:outward*.10),
        y+.09,
        z+(frontBack?outward*.10:0),
        frontBack?.20:.38,.085,frontBack?.38:.20
      );
      const crossArm=box(
        house,timber,x,y+.18,z,
        frontBack?.34:.20,.075,frontBack?.20:.34
      );
      const bearingCap=box(house,gableTrim,x,y+.245,z,.22,.065,.22);

      // A short timber haunch visually ties the cantilever back to its post.
      const haunch=box(
        house,timber,
        x+(frontBack?0:outward*.055),
        y+.055,
        z+(frontBack?outward*.055:0),
        frontBack?.16:.24,.12,frontBack?.24:.16
      );
      haunch.rotation.x=frontBack?outward*-.12:0;
      haunch.rotation.z=frontBack?0:outward*.12;
      cantilever.rotation.z=frontBack?(x===0?0:Math.sign(x)*-.018):0;
      crossArm.rotation.y=frontBack?0:outward*-.018;
      bearingCap.rotation.y=frontBack?0:outward*-.018;
    }
    for(const z of [-2.68,2.68])for(let i=0;i<9;i++){
      const x=-3.55+i*.8875,u=(x+roofHalfX)/(2*roofHalfX),face=z>0?'front':'back';
      eaveBracket(x,z,face,roofPoint(face,1,u).y);
    }
    for(const x of [-3.92,3.92])for(const z of [-1.95,-.65,.65,1.95]){
      const u=(z+roofHalfZ)/(2*roofHalfZ),face=x>0?'right':'left';
      eaveBracket(x,z,face,roofPoint(face,1,u).y);
    }
    // Exposed curved rafters: denser spacing gives the roof a readable
    // traditional timber rhythm instead of a few isolated structural lines.
    for(const face of ['left','right']){
      const outward=face==='left'?-1:1;
      for(let i=0;i<=14;i++){
        const u=.035+i*.93/14,points=[];
        for(let j=0;j<=10;j++){
          const t=.035+j*.091;
          points.push(roofPoint(face,t,u,-.082));
        }
        // Each rafter continues just beyond the fascia and turns gently upward,
        // creating a visible Japanese-style exposed rafter tail.
        const eave=roofPoint(face,1,u,-.082);
        points.push(eave.clone().add(new THREE.Vector3(outward*.075,.018,0)));
        points.push(eave.clone().add(new THREE.Vector3(outward*.17,.052,0)));
        addRoofBeam(points,.052,timber,8);
      }
      // Three continuous purlins sit beneath the rafters and follow the same
      // curved roof section. Their intersections make the underside legible.
      for(const t of [.30,.57,.82]){
        const purlin=[];
        for(let j=0;j<=64;j++)purlin.push(roofPoint(face,t,j/64,-.145));
        addRoofBeam(purlin,.047,gableTrim,8);
      }
    }
    // Raised ridge beam with overlapping Japanese half-round ceramic ridge tiles.
    box(house,timber,0,5.235,0,.28,.22,5.92);
    const ridgeTileMat=mat('#263b43',.58,.16);
    const ridgeEdgeMat=mat('#1d3038',.52,.20);
    const ridgeReliefMat=mat('#40565a',.55,.14);
    function ridgeCapGeometry(radius=.205,length=.68,arcSteps=18,lengthSteps=4){
      const positions=[],indices=[];
      for(let j=0;j<=lengthSteps;j++){
        const z=-length/2+length*j/lengthSteps;
        for(let i=0;i<=arcSteps;i++){
          const a=Math.PI*i/arcSteps;
          positions.push(radius*Math.cos(a),radius*Math.sin(a),z);
          if(i<arcSteps&&j<lengthSteps){
            const p=j*(arcSteps+1)+i,q=p+1,r=p+(arcSteps+1),s=r+1;
            indices.push(p,r,q,q,r,s);
          }
        }
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      return geometry;
    }
    const ridgeSegments=11,ridgePitch=.54,ridgeLength=.64;
    for(let i=0;i<ridgeSegments;i++){
      const z=-2.70+i*ridgePitch;
      const cap=new THREE.Mesh(ridgeCapGeometry(.205,ridgeLength),ridgeTileMat);
      cap.material.side=THREE.DoubleSide;
      cap.position.set(0,5.34,z);
      house.add(cap);
      // Fine raised ceramic beads finish both lower shoulders of each cap.
      for(const side of [-1,1]){
        const bead=new THREE.Mesh(
          new THREE.CylinderGeometry(.026,.026,ridgeLength+.018,8),
          ridgeEdgeMat
        );
        bead.rotation.x=Math.PI/2;
        bead.position.set(side*.205,5.34,z);
        house.add(bead);
      }
    }
    // Restrained onigawara-inspired end plaques face the front and rear gables.
    // A layered ceramic roundel and six-petal relief give the ridge a finished end.
    for(const side of [-1,1]){
      const z=side*3.015;
      const plaque=new THREE.Mesh(
        new THREE.CylinderGeometry(.235,.235,.13,16),
        ridgeEdgeMat
      );
      plaque.rotation.x=Math.PI/2;
      plaque.position.set(0,5.34,z);
      house.add(plaque);
      const inset=new THREE.Mesh(
        new THREE.CylinderGeometry(.177,.177,.055,16),
        ridgeTileMat
      );
      inset.rotation.x=Math.PI/2;
      inset.position.set(0,5.34,z+side*.078);
      house.add(inset);
      const centre=new THREE.Mesh(new THREE.SphereGeometry(.052,12,8),gold);
      centre.scale.set(1,.86,.42);
      centre.position.set(0,5.34,z+side*.112);
      house.add(centre);
      for(let petal=0;petal<6;petal++){
        const angle=petal*Math.PI/3;
        const relief=new THREE.Mesh(
          new THREE.SphereGeometry(.047,10,7),
          ridgeReliefMat
        );
        relief.scale.set(1,.72,.42);
        relief.position.set(
          Math.cos(angle)*.105,
          5.34+Math.sin(angle)*.105,
          z+side*.112
        );
        house.add(relief);
      }
    }
    // Front and rear gable infill follows the actual bowed roof pitch.
    // Its two rising shoulders use the same cross-section as the roof planes.
    function addGable(z){
      const faceZ=z+(z>0?.028:-.028),segments=64;
      const positions=[],indices=[],boundary=[];
      const gableY=(x)=>{
        const t=Math.abs(x)/roofHalfX;
        const u=(x+roofHalfX)/(2*roofHalfX);
        // At the front/rear roof boundary the plane's longitudinal factor is 1.
        // Match that exact boundary lift so the curved gable shoulder meets the roof.
        return roofTopY+(roofEaveY-roofTopY)*roofCrossProfile(t)
          +roofCornerLift*roofCornerFactor(u)*roofSmoothstep(t)
          +roofPitchLift*Math.sin(Math.PI*t);
      };
      // Left eave -> curved left shoulder -> ridge -> curved right shoulder -> right eave.
      for(let i=0;i<=segments;i++){
        const x=-roofHalfX+(roofHalfX*i/segments);
        boundary.push(new THREE.Vector3(x,gableY(x),faceZ));
      }
      for(let i=1;i<=segments;i++){
        const x=roofHalfX*i/segments;
        boundary.push(new THREE.Vector3(x,gableY(x),faceZ));
      }
      // Close the gable along the already-curved eave line.
      const basePoints=[];
      for(let i=0;i<=segments;i++){
        const u=i/segments,x=-roofHalfX+2*roofHalfX*u;
        const y=roofEaveY+roofCornerLift*roofCornerFactor(u);
        basePoints.push(new THREE.Vector3(x,y,faceZ));
      }
      for(let i=segments-1;i>=1;i--)boundary.push(basePoints[i]);

      // A centre-fan triangulation fills the curved perimeter without flattening it.
      const centre=new THREE.Vector3(0,4.42,faceZ);
      positions.push(centre.x,centre.y,centre.z);
      for(const p of boundary)positions.push(p.x,p.y,p.z);
      for(let i=0;i<boundary.length;i++){
        const a=1+i,b=1+((i+1)%boundary.length);
        indices.push(0,a,b);
      }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      g.setIndex(indices);g.computeVertexNormals();
      const panel=new THREE.Mesh(g,gableMat);panel.material.side=THREE.DoubleSide;house.add(panel);

      // Curved timber outlines follow both roof shoulders and the lower eave sweep.
      const leftShoulder=[],rightShoulder=[];
      for(let i=0;i<=segments;i++){
        const x=-roofHalfX+(roofHalfX*i/segments);
        leftShoulder.push(new THREE.Vector3(x,gableY(x),faceZ+.045));
      }
      for(let i=0;i<=segments;i++){
        const x=roofHalfX*i/segments;
        rightShoulder.push(new THREE.Vector3(x,gableY(x),faceZ+.045));
      }
      // Primary gable frame: substantial curved shoulders and a deep tie beam.
      addRoofBeam(leftShoulder,.092,gableTrim,8);
      addRoofBeam(rightShoulder,.092,gableTrim,8);
      addRoofBeam(basePoints.map(p=>p.clone().add(new THREE.Vector3(0,0,.045))),.088,gableTrim,8);

      function gableStrut(a,b,r,material=timber){
        const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
        addRoofBeam([start,end],r,material,8);
      }
      // Main king post and the original pair of principal truss braces.
      gableStrut([0,roofEaveY+.06,z+.065],[0,5.18,z+.065],.066,timber);
      gableStrut([-2.0,4.02,z+.065],[0,4.88,z+.065],.052,timber);
      gableStrut([2.0,4.02,z+.065],[0,4.88,z+.065],.052,timber);

      // Secondary collar tie and short upper braces create a readable
      // nested Japanese timber truss instead of a single triangular outline.
      const collarY=4.48,collarHalf=1.32,frontZ=z+.105;
      gableStrut([-collarHalf,collarY,frontZ],[collarHalf,collarY,frontZ],.047,gableTrim);
      gableStrut([-collarHalf,collarY,frontZ],[0,5.08,frontZ],.039,timber);
      gableStrut([collarHalf,collarY,frontZ],[0,5.08,frontZ],.039,timber);

      // Exposed joinery blocks mark the collar-to-post and brace intersections.
      for(const x of [-collarHalf,collarHalf]){
        const joint=box(house,gableTrim,x,collarY,frontZ+.012,.145,.145,.105);
        joint.rotation.z=Math.PI/4;
      }
      const crownJoint=box(house,gableTrim,0,5.075,frontZ+.018,.17,.17,.11);
      crownJoint.rotation.z=Math.PI/4;
      const tieJoint=box(house,gableTrim,0,4.02,z+.105,.19,.16,.12);
      tieJoint.rotation.z=Math.PI/4;
      for(const x of [-2.65,-1.8,-.9,.9,1.8,2.65]){
        const u=(x+roofHalfX)/(2*roofHalfX);
        const bottom=roofEaveY+roofCornerLift*roofCornerFactor(u);
        const top=Math.max(bottom+.10,4.90-Math.abs(x)/roofHalfX*.72);
        gableStrut([x,bottom+.045,z+.075],[x,top,z+.075],.021,timber);
      }
      // Exposed gable-end rafter tails sit beneath the curved tie beam.
      // Their spacing follows the bowed eave rather than a flat straight line.
      for(let i=0;i<=12;i++){
        const x=-roofHalfX+.22+i*((roofHalfX*2-.44)/12);
        const u=(x+roofHalfX)/(2*roofHalfX);
        const y=roofEaveY+roofCornerLift*roofCornerFactor(u);
        const tail=box(
          house,timber,x,y-.105,z+.085,
          .105,.19,.16
        );
        tail.rotation.z=(.5-u)*.16;
      }
      // Small bearing blocks make the meeting of the gable frame and eave
      // beam read as joined timber instead of thin lines laid on a panel.
      for(const x of [-2.65,-1.8,-.9,0,.9,1.8,2.65]){
        const u=(x+roofHalfX)/(2*roofHalfX);
        const y=roofEaveY+roofCornerLift*roofCornerFactor(u);
        box(house,gableTrim,x,y+.015,z+.105,.17,.105,.12);
      }
      // Restrained Japanese gable crest: layered diamond timber plaque and
      // a small warm-metal centre, aligned to the king post.
      const crestBase=box(house,gableTrim,0,4.67,z+.125,.245,.245,.095);
      crestBase.rotation.z=Math.PI/4;
      const crestInset=box(house,timber,0,4.67,z+.181,.145,.145,.045);
      crestInset.rotation.z=Math.PI/4;
      const medallion=new THREE.Mesh(new THREE.SphereGeometry(.064,12,8),gold);
      medallion.scale.set(1,.82,.34);
      medallion.position.set(0,4.67,z+.218);
      house.add(medallion);
    }
    addGable(2.94);addGable(-2.94);
    // One sharp, mitred timber nose unifies the four roof-edge layers.
    // The nose projects diagonally outward and slightly upward; a square
    // tapered section hides the separate fascia/trim terminations behind it.
    const roofCornerNoseMat=mat('#76543a',.72,.04);
    function addSharpRoofCorner(sx,sz){
      const face=sx<0?'left':'right',u=sz<0?0:1;
      const corner=roofPoint(face,1,u,-.025);
      const travel=new THREE.Vector3(sx*.36,.115,sz*.36);
      const axis=travel.clone().normalize();
      const sideA=new THREE.Vector3(-sz,0,sx).normalize();
      const sideB=new THREE.Vector3().crossVectors(axis,sideA).normalize();
      const baseCenter=corner.clone().addScaledVector(axis,-.055);
      const halfWidth=.145,halfHeight=.082;
      const vertices=[
        baseCenter.clone().addScaledVector(sideA,-halfWidth).addScaledVector(sideB,-halfHeight),
        baseCenter.clone().addScaledVector(sideA, halfWidth).addScaledVector(sideB,-halfHeight),
        baseCenter.clone().addScaledVector(sideA, halfWidth).addScaledVector(sideB, halfHeight),
        baseCenter.clone().addScaledVector(sideA,-halfWidth).addScaledVector(sideB, halfHeight),
        corner.clone().add(travel)
      ];
      const positions=[];
      for(const p of vertices)positions.push(p.x,p.y,p.z);
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex([0,1,4,1,2,4,2,3,4,3,0,4,0,2,1,0,3,2]);
      geometry.computeVertexNormals();
      const nose=new THREE.Mesh(geometry,roofCornerNoseMat);
      nose.material.side=THREE.DoubleSide;
      house.add(nose);
      // Small dark underside facet gives the point a clean shadow separation.
      const shadow=box(
        house,roof,
        corner.x+sx*.075,corner.y-.075,corner.z+sz*.075,
        .19,.045,.19
      );
      shadow.rotation.y=sx===sz?Math.PI/4:-Math.PI/4;
    }
    for(const sx of [-1,1])for(const sz of [-1,1])addSharpRoofCorner(sx,sz);
    // V42 — SUPPORTED EXTERIOR JAPANESE LANTERNS.
    // Each lantern is now physically tied back to the nearest front corner post:
    // a mounting block, diagonal timber cantilever, knee brace and hanging stem
    // replace the unsupported floating box. The warm paper body keeps its glow.
    const lanternFrameMat=mat('#65452f',.86,.02);
    const lanternRoofMat=mat('#263b3a',.72,.06);
    const lanternHardwareMat=mat('#8b7048',.48,.48);
    for(const sx of [-1,1]){
      const postX=sx*3.15,postZ=1.85,lanternX=sx*3.4,lanternZ=2.35;
      // Timber saddle is visibly fixed to the face of the corner post.
      box(house,timber,postX,3.16,postZ+.045,.23,.20,.19);
      // Project the bracket diagonally out from the post, directly above the lantern.
      const armLength=Math.hypot(lanternX-postX,lanternZ-postZ);
      const arm=box(house,timber,(postX+lanternX)/2,3.16,(postZ+lanternZ)/2,.15,.14,armLength+.10);
      arm.rotation.y=Math.atan2(lanternX-postX,lanternZ-postZ);
      // A diagonal haunch carries the cantilever back into the corner post.
      addRoofBeam([
        new THREE.Vector3(postX,2.91,postZ+.075),
        new THREE.Vector3(lanternX,3.105,lanternZ-.055)
      ],.047,timber,7);
      // Short dark suspension rod and bronze eye connect the arm to the lantern roof.
      const hanger=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.30,8),lanternHardwareMat);
      hanger.position.set(lanternX,2.99,lanternZ);house.add(hanger);
      const eye=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,7,14),lanternHardwareMat);
      eye.rotation.x=Math.PI/2;eye.position.set(lanternX,2.825,lanternZ);house.add(eye);

      const lantern=new THREE.Group();lantern.position.set(lanternX,2.42,lanternZ);house.add(lantern);
      // Translucent warm washi paper sits inside a visible timber cage.
      const body=new THREE.Mesh(new THREE.BoxGeometry(.34,.46,.34),warmPaper);lantern.add(body);
      for(const px of [-.18,.18])for(const pz of [-.18,.18])
        box(lantern,lanternFrameMat,px,0,pz,.045,.52,.045);
      box(lantern,lanternFrameMat,0,.245,0,.42,.055,.42);
      box(lantern,lanternFrameMat,0,-.245,0,.42,.055,.42);
      // Low four-sided roof cap and a small lower finial finish the lantern silhouette.
      const capPlate=new THREE.Mesh(new THREE.BoxGeometry(.43,.045,.43),lanternFrameMat);
      capPlate.position.y=.275;lantern.add(capPlate);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(.30,.15,4),lanternRoofMat);
      cap.position.y=.37;lantern.add(cap);
      const finial=new THREE.Mesh(new THREE.ConeGeometry(.065,.12,6),lanternHardwareMat);
      finial.rotation.x=Math.PI;finial.position.y=-.33;lantern.add(finial);
    }
    // Foreground stepping stones and garden boulders.
    const stone=mat('#81918a');for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.CylinderGeometry(.38,.45,.13,8),stone);s.position.set(-2.5+i*.78,.02,3.1+Math.sin(i*.8)*.25);s.rotation.y=i*.3;scene.add(s);}
    const cloudMat=new THREE.MeshStandardMaterial({color:'#edf3ee',transparent:true,opacity:.66,roughness:1});const clouds=[];
    for(let i=0;i<6;i++){const g=new THREE.Group();for(let j=0;j<4;j++){const c=new THREE.Mesh(new THREE.SphereGeometry(1.1+(j%2)*.35,12,10),cloudMat);c.position.set((j-1.5)*1.05,Math.sin(j*2)*.18,0);c.scale.y=.55;g.add(c);}g.position.set((i-2.5)*8,9+(i%3)*1.5,-13-(i%2)*3);scene.add(g);clouds.push(g);}
    const rainGeo=new THREE.BufferGeometry(),rainCount=520,rainPos=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainPos[i*3]=(Math.random()-.5)*34;rainPos[i*3+1]=Math.random()*18;rainPos[i*3+2]=(Math.random()-.5)*30;}rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0xbad8e8,size:.075,transparent:true,opacity:.7}));scene.add(rain);
    const snowGeo=new THREE.BufferGeometry(),snowCount=250,snowPos=new Float32Array(snowCount*3);for(let i=0;i<snowCount;i++){snowPos[i*3]=(Math.random()-.5)*32;snowPos[i*3+1]=Math.random()*18;snowPos[i*3+2]=(Math.random()-.5)*28;}snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:.12,transparent:true,opacity:.9}));scene.add(snow);
    const stars=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xe8f3ff,size:.11}));const starPos=new Float32Array(180*3);for(let i=0;i<180;i++){starPos[i*3]=(Math.random()-.5)*70;starPos[i*3+1]=12+Math.random()*20;starPos[i*3+2]=-25-Math.random()*35;}stars.geometry.setAttribute('position',new THREE.BufferAttribute(starPos,3));scene.add(stars);
    const state={kind:'clear',phase:'day'};let raf=0,last=0,elapsed=0,disposed=false,visible=!document.hidden,width=1,height=1;
    // Doors begin closed. Tapping any front Shoji leaf smoothly opens or closes
    // the pair; the inner leaves slide behind the outer leaves to reveal the centre.
    let doorsOpen=false,doorProgress=0;
    const doorRaycaster=new THREE.Raycaster(),doorPointer=new THREE.Vector2();
    function toggleShojiDoors(){doorsOpen=!doorsOpen;onDoorState(doorsOpen);return doorsOpen;}
    function onDoorPointer(event){
      const rect=canvas.getBoundingClientRect();
      doorPointer.x=((event.clientX-rect.left)/rect.width)*2-1;
      doorPointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
      doorRaycaster.setFromCamera(doorPointer,camera);
      const hits=doorRaycaster.intersectObjects([doorHitSurface,...shojiDoors],true);
      if(hits.length)toggleShojiDoors();
    }
    canvas.addEventListener('pointerup',onDoorPointer,{passive:true});
    const palettes={clear:['#7fb7c3','#d8c9a7'],cloudy:['#718d99','#9aa6a0'],rain:['#3f5e70','#637e84'],storm:['#1b2e43','#455b68'],snow:['#a6c5d1','#e2e7e0'],fog:['#a3b6b0','#d0d2c3'],wind:['#78a8b2','#d2c8a9'],hot:['#83b7bb','#e8c58e'],night:['#081a35','#273c55']};
    function setWeather(kind){state.kind=kind;const p=palettes[kind]||palettes.clear;scene.background.set(p[0]);scene.fog.color.set(p[1]);scene.fog.density=kind==='fog'?.035:kind==='rain'?.018:kind==='storm'?.024:.010;rain.visible=kind==='rain'||kind==='storm';snow.visible=kind==='snow';stars.visible=kind==='night';clouds.forEach((c,i)=>{c.visible=['cloudy','rain','storm','snow','fog'].includes(kind)||i<3;c.scale.setScalar(kind==='storm'?1.3:kind==='fog'?1.5:1);});sun.intensity=kind==='night'?.18:kind==='storm'?.55:kind==='cloudy'?1.1:kind==='rain'?1.35:3.1;fill.intensity=kind==='night'?.6:1.0;waterMat.roughness=kind==='storm'?.48:kind==='rain'?.34:.2;gold.emissiveIntensity=kind==='night'?1.7:.45;const glow=kind==='night'?1:kind==='storm'?.82:kind==='rain'?.62:kind==='fog'?.5:.22;pavilionLights.forEach(light=>{light.intensity=light.userData.dayIntensity+(light.userData.nightIntensity-light.userData.dayIntensity)*glow;});warmPaper.emissiveIntensity=kind==='night'?.58:kind==='storm'?.42:.22;waterShimmers.forEach(o=>{o.userData.baseOpacity=kind==='night'?.20:kind==='storm'?.07:kind==='rain'?.09:.12;});waterRipples.forEach(o=>{o.userData.baseOpacity=kind==='night'?.15:kind==='storm'?.055:.085;});}
    function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.0,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}
    function frame(ts){if(disposed||!visible)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(ts-last)/1000||0);last=ts;elapsed+=dt;
      doorProgress+=( (doorsOpen?1:0)-doorProgress )*Math.min(1,dt*5.5);
      const doorEase=doorProgress*doorProgress*(3-2*doorProgress);
      for(const leaf of shojiDoors)leaf.position.x=leaf.userData.closedX+(leaf.userData.openX-leaf.userData.closedX)*doorEase;
      const a=rain.geometry.attributes.position.array,b=snow.geometry.attributes.position.array;for(let i=0;i<rainCount;i++){a[i*3+1]-=dt*18;if(a[i*3+1]<0)a[i*3+1]=18;}rain.geometry.attributes.position.needsUpdate=true;for(let i=0;i<snowCount;i++){b[i*3+1]-=dt*1.7;if(b[i*3+1]<0)b[i*3+1]=18;b[i*3]+=Math.sin(elapsed+i)*dt*.18;}snow.geometry.attributes.position.needsUpdate=true;clouds.forEach((c,i)=>{c.position.x+=dt*(state.kind==='wind'?.42:.12)*(i%2?1:-1);if(c.position.x>28)c.position.x=-28;if(c.position.x< -28)c.position.x=28;});trees.forEach((t,i)=>{t.rotation.z=Math.sin(elapsed*.55+i)* (state.kind==='wind'?.06:.012);});waterShimmers.forEach(o=>{const pulse=.72+.28*Math.sin(elapsed*1.15+o.userData.phase);o.material.opacity=o.userData.baseOpacity*pulse;o.scale.x=1+.10*Math.sin(elapsed*.8+o.userData.phase);});waterRipples.forEach(o=>{const pulse=.65+.35*Math.sin(elapsed*.72+o.userData.phase);o.material.opacity=o.userData.baseOpacity*pulse;const swell=1+.12*Math.sin(elapsed*.72+o.userData.phase);o.scale.set(1.65*swell,swell,1);});waterMat.roughness=(state.kind==='storm'?.44:.2)+Math.sin(elapsed*1.2)*.025;renderer.render(scene,camera);}
    function start(){if(!disposed&&visible&&!raf)raf=requestAnimationFrame(frame);}function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
    const ro=new ResizeObserver(resize);ro.observe(canvas);const onResize=()=>resize();const onVisibility=()=>{visible=!document.hidden;if(visible){last=0;start();}else stop();};window.addEventListener('resize',onResize,{passive:true});document.addEventListener('visibilitychange',onVisibility);resize();setWeather('clear');start();
    return {setWeather,toggleDoors:toggleShojiDoors,dispose(){disposed=true;stop();canvas.removeEventListener('pointerup',onDoorPointer);ro.disconnect();window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose?.();}});renderer.dispose();renderer.forceContextLoss?.();}};
  }
  function activateWeather(){
    const view=mount('weather');if(!view)return;addStyles();const screen=makeScreen();view.root.replaceChildren(screen);
    const canvas=screen.querySelector('canvas');let world=null,worldReady=false,disposed=false,abort=null,refresh=0,clock=0,serial=0,manual=false,liveData=null,forecastMode='hours',previewKind='auto';
    const dock=document.getElementById('le-feature-dock');
    function syncDock(){if(!dock||dock.hidden||getComputedStyle(dock).display==='none'){screen.style.setProperty('--wx2-dock','24px');return;}const dr=dock.getBoundingClientRect(),sr=screen.getBoundingClientRect();if(dr.width&&dr.height)screen.style.setProperty('--wx2-dock',`${Math.ceil(Math.max(0,sr.bottom-dr.top)+12)}px`);}
    const dockObserver=dock&&'ResizeObserver'in window?new ResizeObserver(syncDock):null;dockObserver?.observe(dock);window.addEventListener('resize',syncDock,{passive:true});window.addEventListener('orientationchange',syncDock,{passive:true});syncDock();
    function paint(data,isPreview=false){const c=data.current||{},code=n(c.weather_code)??0,kind=weatherKind(code);const night=Number(c.is_day)===0&&kind==='clear';world?.setWeather(night?'night':kind);put(screen,'temp',n(c.temperature_2m)===null?'—':Math.round(c.temperature_2m));put(screen,'condition',night?'Night skies':codeLabel(code));put(screen,'feels',n(c.apparent_temperature)===null?'':`Feels like ${Math.round(c.apparent_temperature)}°`);put(screen,'date',c.time?new Date(c.time).toLocaleString([], {weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}):'');put(screen,'humidity',n(c.relative_humidity_2m)===null?'—':Math.round(c.relative_humidity_2m)+'%');put(screen,'wind',n(c.wind_speed_10m)===null?'—':Math.round(c.wind_speed_10m)+' km/h');put(screen,'rain',n(data.daily?.precipitation_probability_max?.[0])===null?'—':Math.round(data.daily.precipitation_probability_max[0])+'%');put(screen,'uv',n(data.daily?.uv_index_max?.[0])===null?'—':Number(data.daily.uv_index_max[0]).toFixed(1));buildForecast(screen,data);liveData=data;screen.dataset.preview=isPreview?'true':'false';}
    function setStatus(t){put(screen,'status',t);}
    function preview(kind){previewKind=kind;world?.setWeather(kind);put(screen,'place','TEMPORARY SCENE PREVIEW');put(screen,'condition',kind==='hot'?'Heat haze':kind==='wind'?'Strong winds':kind==='night'?'Night skies':codeLabel(PREVIEW[kind]?.code??0));setStatus(`SCENE PREVIEW ONLY · ${kind.toUpperCase()} · Weather readings and forecast remain unchanged.`);}
    function locationOff(){previewKind='auto';const data=sampleData('clear');paint(data,true);world?.setWeather('clear');put(screen,'place','WEATHER PREVIEW');setStatus('LOCATION OFF · Sample forecast values. Turn Location ON for local conditions.');}
    async function fetchLive(){if(disposed||!isActive('weather')||manual)return;if(window.liveEarthLocationAllowed?.()!==true){locationOff();return;}if(!navigator.onLine){setStatus('OFFLINE · No live weather request is available.');return;}const point=globe()?.getLocation?.(),lat=Number(point?.latitude),lon=Number(point?.longitude);if(!Number.isFinite(lat)||lat< -90||lat>90||!Number.isFinite(lon)||lon< -180||lon>180){setStatus('WAITING FOR A FRESH LOCATION FIX');return;}abort?.abort();const controller=new AbortController();abort=controller;const id=++serial;const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:'temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m',hourly:'temperature_2m,weather_code,precipitation_probability',daily:'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,uv_index_max',forecast_days:'7',forecast_hours:'24',timezone:'auto',wind_speed_unit:'kmh',temperature_unit:'celsius'});const timeout=setTimeout(()=>controller.abort(),18000);try{const response=await fetch(`${API}?${params}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`Weather source ${response.status}`);const data=await response.json();if(disposed||!isActive('weather')||id!==serial||window.liveEarthLocationAllowed?.()!==true)return;paint(data,false);screen.dataset.preview='false';put(screen,'place','YOUR LOCATION');setStatus('LIVE FORECAST · OPEN-METEO · UPDATED JUST NOW');}catch(error){if(error?.name!=='AbortError'&&!disposed&&isActive('weather'))setStatus('LIVE DATA UNAVAILABLE · Check connection and location fix.');}finally{clearTimeout(timeout);if(abort===controller)abort=null;}}
    async function init(){try{world=await createWorld(canvas);worldReady=true;if(disposed){world.dispose();return;}if(previewKind!=='auto')world.setWeather(previewKind);else if(liveData)world.setWeather(weatherKind(Number(liveData.current?.weather_code)));}catch(error){console.error('[LIVE // EARTH] Weather 3D renderer unavailable.',error);screen.classList.add('wx2-no-webgl');setStatus('3D rendering unavailable on this device. Forecast controls remain available.');}}
    init();
    const rangeButtons=[...screen.querySelectorAll('[data-range]')];function setRange(mode){forecastMode=mode;rangeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.range===mode)));screen.querySelector('[data-w="hours"]').hidden=mode!=='hours';screen.querySelector('[data-w="week"]').hidden=mode!=='week';put(screen,'forecast-title',mode==='hours'?'Today · Hourly':'Your week');put(screen,'forecast-sub',mode==='hours'?'Scroll through the day':'7-day outlook');}
    rangeButtons.forEach(b=>b.addEventListener('click',()=>setRange(b.dataset.range)));
    const controlsToggle=screen.querySelector('.wx2-control-toggle');
    const controlsPanel=screen.querySelector('.wx2-bottom');
    controlsToggle?.addEventListener('click',()=>{
      const collapsed=controlsPanel.classList.toggle('wx2-controls-collapsed');
      controlsToggle.setAttribute('aria-expanded',String(!collapsed));
      controlsToggle.setAttribute('aria-label',collapsed?'Show weather controls':'Hide weather controls');
      const glyph=controlsToggle.querySelector('span');
      if(glyph)glyph.textContent=collapsed?'⌄':'⌃';
    });const select=screen.querySelector('.wx2-preview select');function onPreview(){const k=select.value;if(k==='auto'){manual=false;previewKind='auto';if(liveData&&!screen.dataset.preview){paint(liveData,false);put(screen,'place','YOUR LOCATION');setStatus('LIVE FORECAST · OPEN-METEO');}else if(window.liveEarthLocationAllowed?.()===true)fetchLive();else locationOff();return;}manual=true;serial++;abort?.abort();preview(k);}select.addEventListener('change',onPreview);
    function onLocation(e){if(e.detail?.enabled===true&&window.liveEarthLocationAllowed?.()===true&&!manual)fetchLive();else if(window.liveEarthLocationAllowed?.()!==true&&!manual){serial++;abort?.abort();locationOff();}}
    function onStop(){serial++;abort?.abort();if(!manual)locationOff();}function onOnline(){if(!manual&&window.liveEarthLocationAllowed?.()===true)fetchLive();}function onOffline(){serial++;abort?.abort();if(!manual)setStatus('OFFLINE · Live readings are not being refreshed.');}
    function onVisibility(){if(!document.hidden&&!manual&&window.liveEarthLocationAllowed?.()===true)fetchLive();}
    window.addEventListener('live-earth-location-state',onLocation);window.addEventListener('live-earth-location-stop',onStop);window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);document.addEventListener('visibilitychange',onVisibility);
    if(window.liveEarthLocationAllowed?.()===true)fetchLive();else locationOff();refresh=setInterval(()=>{if(!disposed&&!document.hidden&&!manual&&window.liveEarthLocationAllowed?.()===true)fetchLive();},REFRESH_MS);
    const cleanup=()=>{disposed=true;serial++;clearInterval(refresh);clearInterval(clock);abort?.abort();world?.dispose();dockObserver?.disconnect();window.removeEventListener('resize',syncDock);window.removeEventListener('orientationchange',syncDock);window.removeEventListener('live-earth-location-state',onLocation);window.removeEventListener('live-earth-location-stop',onStop);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);document.removeEventListener('visibilitychange',onVisibility);select.removeEventListener('change',onPreview);screen.remove();document.getElementById(STYLE_ID)?.remove();};
    return cleanup;
  }
  runtime.registerFeature('weather',activateWeather);
})();

/* LE-WEATHER-SCENERY-V28 */

/* LIVE-EARTH-WEATHER-REAL-SCENE-V1
   The approved Weather scene is authored directly in this module.
   Do not regenerate it from service-worker string replacements.
   Pavilion guard rails are children of the rotated house group and are measured
   from the top of the raised deck (deck surface approx. y=1.588).
*/

/* LIVE-EARTH-WEATHER-REAL-SCENE-V2
   One deck surface: timber boards supported by discrete joists; redundant full slab removed.
   Four-side guard rails align their outer faces with the deck perimeter.
   Front guard rail remains split around the central stair opening.
*/

/* LIVE-EARTH-WEATHER-DECK-RAILS-V3
   One visible deck surface: ten edge-to-edge timber boards.
   One perimeter support frame: four beams, sitting directly on the existing piers.
   Removed the five intermediate joists and all secondary lower guard rails.
   Guard rail outer faces match the deck perimeter on left, right, rear and front returns.
   Vertical balusters begin at the deck surface and meet the single upper handrail.
   Front handrail remains open across the central four-step entrance.
*/

/* LE-WEATHER-PAVILION-RAIL-HEIGHT-V11
   Handrail centre lowered from y=2.35 to y=2.10.
   Balusters shortened from 0.70 to 0.48 and lowered to y=1.83.
   Deck top is approximately y=1.5725: balusters begin at y=1.59 and meet the handrail.
   Outer rail alignment and central stair opening are unchanged.
   Restored the pavilion wall panel as executable geometry.
*/


/* LE-WEATHER-LOWER-STRUCTURE-PROPORTIONS-V12
   Eight timber support pillars reduced from .88 to .66 units (25%).
   Stone footing sockets bridge the shortened pillars to the perimeter beams.
   Four perimeter beams reduced from .36 to .27 units (25%), with top alignment held.
   Four traditional stair treads use .07-unit single boards, replacing stacked .095 caps.
   Four thin closed riser boards replace the thick solid stair blocks and redundant infill.
   Last stair tread top is exactly aligned to the deck surface at y=1.5725.
   Main house, deck footprint, four-side rails, roof, walls, rotation, Fuji, hills, trees,
   camera, forecast toggle and Weather feature lifecycle are preserved.
*/

/* LE-WEATHER-LOWER-STRUCTURE-REFINEMENT-V13
   Eight supports now use one compact .44 x .40 x .44 stone footing each.
   Timber posts run continuously from y=.40 to the unchanged beam underside y=1.25 (.85 tall).
   Four stair rises are equal; each closed riser meets the underside of a .055-thick tread.
   Treads are 1.00 deep with .055-deep risers and a restrained .05 overlap at the .95 pitch.
   The top tread remains at y=1.5725. Deck, beams, rails, house, roof, scenery, camera and UI remain unchanged.
*/


/* LE-WEATHER-PAVILION-SHOJI-WALLS-V14
   Replaced the single opaque wall block with four elevations of separate Shoji panels:
   four front sliding leaves, four rear bays and two bays on each side.
   Each panel has a translucent paper field, timber perimeter, horizontal rails and
   vertical lattice members. Continuous sill/head rails connect the panels.
   Existing corner posts, roof/eaves, foundation, deck, rails, stairs, scenery and UI are unchanged.
*/

/* LE-WEATHER-PAVILION-SHOJI-SLIDING-DOORS-V15
   Four independently grouped front Shoji leaves now slide on twin timber tracks.
   Tapping a visible front leaf toggles a smooth open/close motion; the inner pair
   stacks behind the outer pair to reveal the central entrance. Rear and side panels
   remain fixed. No foundation, deck, stair, rail, roof, camera, scenery or UI geometry changed.
*/


/* LIVE-EARTH-WEATHER-PAVILION-INTERIOR-V16
   Added six bordered tatami floor panels, a low timber tea table, two cushions,
   and two warm interior lanterns, all placed on the existing raised deck.
   Sliding Shoji doors and their animation remain unchanged.
   Foundation, pillars, beams, deck, stairs, rails, walls, roof, scenery and UI are preserved.
*/


/* LE-WEATHER-PAVILION-DOOR-INTERACTION-V17
   Added an accessible, visible OPEN/CLOSE control as a reliable alternative to tapping the door.
   Direct Shoji tapping remains enabled. Inner leaves now use a properly separated rear track
   so they stack cleanly behind the outer leaves instead of intersecting their frames.
   Door animation and all pavilion dimensions outside the sliding-door tracks are preserved.
*/


/* LE-WEATHER-PAVILION-TAP-DOORS-V18
   Added a transparent hit surface across the front Shoji doorway so taps anywhere
   on the door elevation reliably toggle the sliding leaves, including the open doorway.
   The visible control reads TAP TO OPEN / TAP TO CLOSE. Existing door tracks,
   animation, interior, pavilion structure and Weather UI remain intact.
*/


/* LE-WEATHER-PAVILION-DIRECT-TOUCH-DOORS-V19
   Removed the floating OPEN/CLOSE text control entirely.
   Shoji doors now respond only to direct taps on the front door panels/opening
   through the dedicated 3D raycast hit surface. Door animation and pavilion
   structure, interior, rails, stairs, roof, scenery and forecast UI are preserved.
*/


/* LE-WEATHER-PAVILION-TOUCH-FIX-V20
   Replaced the zero-thickness front-door raycast plane with a shallow invisible
   hit volume spanning the complete Shoji doorway. Door activation now listens
   for pointerup (completed touch) rather than pointerdown, and the canvas uses
   touch-action:manipulation with explicit pointer targeting. No visible door
   controls or pavilion geometry were added; direct touch remains the only control.
*/


/* LE-WEATHER-PAVILION-FINISHING-DETAILS-V21
   Added subtle bronze-toned recessed finger pulls to all four front Shoji leaves,
   so the hardware moves with each sliding panel. Added restrained diagonal timber
   knee-braces and small post-cap joinery collars beneath the existing upper frame.
   No dimensions or geometry were changed to the foundation, supports, beams, deck,
   stairs, rails, wall layout, roof, scenery, camera, Weather UI or door interaction.
*/


/* LE-WEATHER-PAVILION-WARM-ATMOSPHERE-V22
   Added five soft warm point lights inside the pavilion and at its four lanterns.
   Light intensity follows the weather scene: restrained in daylight, warmer at night.
   Added low-opacity animated water glints and ripple rings in front of the pavilion
   to suggest lantern reflections without a costly real-time reflection render pass.
   Existing water geometry, pavilion architecture, Shoji interaction, camera, forecast
   UI, Location privacy boundary and Stacks feature lifecycle are preserved.
*/


/* LE-WEATHER-PAVILION-ROOF-ARCHITECTURE-V23
   Replaced the simple cone roof and flat eave slab with a four-plane hipped roof:
   long central ridge, gently lifted eave corners, separated charcoal tile courses,
   deep timber fascia, exposed underside rafters, segmented ridge caps and small
   upturned corner finials. Roof footprint and overall pavilion/camera composition
   are retained. Shoji doors, interior, supports, deck, stairs, rails, lighting,
   water, weather systems, forecast UI and Location privacy boundary are untouched.
*/


/* LE-WEATHER-PAVILION-ROOF-REFINEMENT-V24
   Architectural roof refinement based on the tested V23 roof:
   - Converted the shallow four-sided pyramid/hip appearance into two continuous
     sloping roof planes with a pronounced front/rear gable silhouette.
   - Added framed triangular gable tympanums with exposed truss members and a
     restrained central medallion.
   - Extended the ridge beam and segmented ridge caps along the full roof length.
   - Increased tile-course density and rafter spacing for a richer roof surface.
   - Added layered fascia/shadow lines and repeated bracket blocks beneath eaves.
   - Retained the established roof footprint, overall pavilion scale, camera,
     Shoji doors, interior, foundation, deck, stairs, rails, lanterns, lighting,
     water, weather systems, forecast UI and Location privacy boundary.
*/


/* LE-WEATHER-PAVILION-ROOF-RECOVERY-V25
   Critical V24 runtime fix: gableMat and gableTrim were declared after the
   eaveBracket() loops that use gableTrim. JavaScript therefore threw a
   ReferenceError during createWorld(), preventing the entire Weather scene
   from rendering. Moved both material declarations before the bracket helper
   and its immediate calls. No roof geometry, house geometry, door interaction,
   weather systems, camera or UI changes in this recovery patch.
*/


/* LE-WEATHER-PAVILION-ROOF-FIX-CURVED-EAVES-V27
   Rebased on the known-working V25 source and rebuilt the roof refinement using
   only core geometry already used elsewhere in this renderer. Avoids TubeGeometry
   and CatmullRomCurve3. Curved surface, tile courses, segmented fascia, underside
   rafters, brackets and gable base all share the same 0.62-unit upturned corner
   profile. The existing pavilion, doors, interior, foundation, deck, stairs, rails,
   lanterns, scene, camera, weather systems and forecast UI are preserved.
*/


/* LE-WEATHER-PAVILION-ROOF-GRACEFUL-EAVES-V28
   Refines the V27 roof after visual review: reduces the corner lift from 0.62
   to 0.22 scene units and concentrates it at the final portions of the eaves
   with a steeper easing exponent. Slims the curved fascia and shadow trim,
   removes the conflicting fixed-height fascia boxes, and reduces corner caps.
   Keeps the V27 core-geometry construction and all non-roof systems unchanged.
*/


/* LE-WEATHER-PAVILION-ROOF-CURVED-GABLE-PROFILE-V29
   Keeps the approved V28 outer eave sweep unchanged. Adds a restrained 0.18-unit
   bowed cross-section to the actual ridge-to-eave roof planes and tile courses.
   Rebuilds front/rear gable infill and timber shoulder outlines to follow the
   same curved roof profile, while retaining the V28 curved base/eave line.
   All non-roof systems and door interaction remain unchanged.
*/


/* LE-WEATHER-PAVILION-ROOF-CONCAVE-JAPANESE-PROFILE-V30
   Corrects the V29 roof-curve direction after visual review. The positive
   mid-slope bow that produced a domed/boat-like gable is reversed into a subtle
   concave Japanese roof sweep. The cross-profile interpolation is also adjusted
   to avoid lifting the entire middle of the slope. The approved V28 outer eave
   lift and V29 curved gable/roof continuity remain in place. No other scene,
   house, door, weather, camera or UI systems are changed.
*/


/* LE-WEATHER-PAVILION-ROOF-GABLE-CURVE-ALIGNMENT-V31
   Corrects the V30 sag visible in the mobile preview. Removes the negative
   mid-slope bow and restores the approved gentle V28 cross-section. Most
   importantly, the front/rear gable shoulder now uses the exact same
   cross-profile and corner-lift expression as the adjoining roof surface,
   eliminating the mismatch that made the gable appear to dip or kink.
   Retains the approved V28 outer eave sweep and all non-roof systems.
*/


/* LE-WEATHER-PAVILION-ROOF-CONTINUOUS-JAPANESE-SWEEP-V32
   Gives the actual front/rear roof shoulders a clearly visible but restrained
   continuous bow. The ridge and eave endpoints stay fixed; the slope rises
   smoothly above its straight chord by 0.218 scene units at mid-span. The
   profile remains monotonic (minimum derivative about 0.56), so it cannot
   reverse into a sag or kink. Gable outline and roof plane share this one
   profile function. Approved V28 corner lift, eave sweep, doors, interior,
   stairs, rails and all non-roof systems remain unchanged.
*/


/* LE-WEATHER-PAVILION-ROOF-ARCHITECTURAL-PROFILE-V33
   Architectural roof pass based on the actual current main source.
   Replaces the sine-wave adjustment with a cubic concave sori profile:
   a controlled ridge departure, broad shoulder and stronger descent to
   the eave. The exact same master profile is consumed by both roof planes
   and front/rear gable outlines. Roof skin, gable outline, eave mouldings
   and rafters receive denser sampling so the silhouette reads as one
   continuous 3D roof rather than separately bent trim pieces.
   Preserves the approved corner-lift function, roof footprint, ridge,
   tile materials, pavilion walls, doors, interior, stairs, rails and UI.
*/


/* LE-WEATHER-PAVILION-ROOF-FASCIA-STRUCTURE-V34
   Adds a substantial segmented timber fascia board along all four curved
   eaves. Each short board section follows the local roof-edge tangent,
   creating a continuous-looking architectural fascia with visible height
   and depth instead of relying on round tubes alone. Retains the rounded
   outer nosing and fine lower shadow trim. Roof surface, sori profile,
   gable, tiles, rafters, ridge, doors, interior, foundations, stairs,
   rails, camera, scenery and weather UI remain unchanged.
*/


/* LE-WEATHER-PAVILION-ROOF-BRACKET-ASSEMBLY-V35
   Refines the existing eave supports into layered Japanese timber bracket
   assemblies: bearing post, outward cantilever, cross-arm, haunch and cap.
   Corrects a directional defect in the former helper: side-eave arms now
   project along the X axis while front/rear arms project along Z. The
   assemblies remain positioned from the shared curved roof edge profile.
   No roof skin, fascia, gable, tile, door, interior, foundation, stair,
   rail, camera, scenery or weather UI geometry is changed.
*/


/* LE-WEATHER-PAVILION-ROOF-EXPOSED-RAFTERS-V36
   Increases the exposed curved rafter rhythm from 9 to 15 members per roof
   plane, extends each member beyond the fascia with a restrained upturned
   tail, and adds three continuous curved purlins per slope. All members are
   sampled from the existing shared roof profile. The roof skin, tile layout,
   ridge, gables, fascia, bracket assemblies, doors, interior, foundations,
   stairs, rails, camera, scenery and weather UI remain unchanged.
*/


/* LE-WEATHER-PAVILION-GABLE-RAFTER-TAILS-V37
   Adds 13 exposed timber rafter tails beneath each curved front/rear gable
   eave and seven compact bearing blocks per gable where the frame meets the
   curved tie beam. Positions are sampled from the existing bowed eave profile.
   No roof surface, tile, fascia, bracket, rafter/purlin, door, interior,
   foundation, stair, rail, camera, scenery or weather UI geometry is changed.
*/


/* LE-WEATHER-PAVILION-CERAMIC-EAVE-CAPS-V38
   Adds segmented rounded ceramic end caps to the lower edge of the two tiled
   roof planes. Cap modules follow the existing bowed eave geometry and tile
   spacing. No roof curvature, tile field, ridge, gable framing, exposed
   rafters, bracket assemblies, walls, doors, foundation, stairs, rails,
   camera, weather rendering or UI behavior is changed.
*/


/* LE-WEATHER-PAVILION-LAYERED-RIDGE-ORNAMENT-V39
   Replaces the simple cylindrical ridge caps with eleven overlapping,
   open half-round ceramic ridge tiles following the existing straight ridge.
   Adds restrained raised edge beads and matching front/rear onigawara-inspired
   end plaques with a small six-petal relief. The ridge beam, roof silhouette,
   roof planes, tiles, gables, curved eaves, fascia, rafters, brackets, walls,
   sliding doors, interior, foundation, deck, stairs, rails, camera, scenery,
   forecast UI and Location privacy boundary are preserved.
*/


/* LE-WEATHER-PAVILION-SHARP-MITRED-ROOF-CORNERS-V40
   Reworks only the four roof-corner terminations. The four perimeter edge
   trims and fascia boards now stop short with a small mitre allowance, and
   the two nearest ceramic end-cap modules are reserved out of each side
   corner. Replaces the small rounded cone finials with one unified, square-
   tapered timber nose at each corner, projecting diagonally outward and
   slightly upward to a distinct point. The approved roof sweep, roof planes,
   gable, ridge ornaments, tile field, rafters, brackets, walls, Shoji doors,
   interior, foundations, deck, stairs, rails, camera, scenery and weather UI
   remain unchanged.
*/


/* LE-WEATHER-PAVILION-GABLE-TRUSS-AND-JOINERY-V41
   Refines only the existing front and rear triangular gable assemblies.
   Thickens the curved primary shoulder beams and tie beam, strengthens the
   king post and principal braces, and adds a secondary collar tie with paired
   upper braces to create a nested Japanese timber truss. Adds visible diamond
   joinery blocks at structural intersections and replaces the simple round
   gable medallion with a restrained layered timber crest and small metal centre.
   The approved roof profile, V40 sharp corner tips, ridge, tiles, fascia,
   rafters, brackets, Shoji doors, interior, foundation, deck, stairs, rails,
   scenery, camera, forecast UI and Location privacy boundary are preserved.
*/


/* LE-WEATHER-PAVILION-SUPPORTED-EXTERIOR-LANTERNS-V42
   Replaces the two unsupported exterior lantern boxes with complete Japanese-style
   assemblies: corner-post mounting blocks, diagonal timber cantilevers, knee braces,
   bronze suspension eyes, hanging rods, framed warm washi bodies, low roof caps and
   lower finials. Lantern positions and existing warm-light sources are retained.
   No roof, wall, door, foundation, deck, stair, rail, camera, scenery, weather UI,
   Location privacy or Stacks lifecycle code is changed.
*/


/* LE-WEATHER-PAVILION-JAPANESE-RED-MAPLE-V43
   Adds a right-side Japanese momiji maple as genuine 3D scenery: a gently
   leaning, tapered trunk; visible primary limbs and fine twigs; and a broad,
   asymmetrical canopy made from 980 instanced five-lobed maple leaves in
   layered crimson, scarlet and autumn-red tones. A subtle warm uplight gives
   the foliage depth at night. The maple joins the existing wind-sway group.
   Pavilion, roof, lanterns, Shoji doors, interior, foundation, deck, stairs,
   rails, camera, forecast UI, Location privacy and Stacks lifecycle are unchanged.
*/


/* LE-WEATHER-PAVILION-MOMIJI-PORTRAIT-PLACEMENT-V44
   Moves the Japanese red maple inward from x=8.25 to x=5.35, forward from
   z=1.15 to z=2.45, and reduces scale from 1.12 to .88. The tree now sits
   beside the pavilion's front-right corner and within the portrait square
   camera framing, while its canopy still frames the pavilion in landscape.
   No tree geometry, pavilion geometry, camera, UI, weather, Location or
   Stacks behavior is changed.
*/


/* LE-WEATHER-PAVILION-MOMIJI-CROWN-GROWTH-V48
   Widens the Japanese maple crown envelope from 2.92 x 1.86 to 3.25 x 2.15
   local units, giving the canopy a broader, more naturally spreading silhouette.
   Increases the primary scaffold from nine to eleven limbs; each primary now
   supports four secondary branches, each with four finer twiglets. Branch radii
   are reduced progressively so the outer structure reads as delicate ramification.
   Increases leaf instances at every branch tier and expands terminal clusters for
   a denser red canopy. Moves the tree slightly farther forward on the pavilion's
   front-right side while retaining its established scale and portrait framing.
   Pavilion, roof, lanterns, Shoji doors, interior, foundation, deck, stairs, rails,
   weather camera, forecast UI, Location privacy and Stacks lifecycle are unchanged.
*/


/* LE-WEATHER-MAPLE-FALLBACK-SCOPE-FIX-V55
   Fixes the remaining V54 failure: renderedLeafCount and leaf metadata were
   declared inside the foliage try block but referenced after its catch. This
   caused a second ReferenceError, so createMomiji still failed and the maple
   was omitted even though the pavilion renderer recovered. Fallback counters
   now live in the enclosing function scope; successful foliage updates them,
   while a failed foliage pass safely retains the visible branch skeleton.
   No other Weather scene, pavilion, camera, forecast or lifecycle code changes.
*/

/* LE-WEATHER-MAPLE-LEAF-RENDER-RECOVERY-V54
   Fixes the V53 failure boundary: leaf generation is now isolated so an
   optional foliage error cannot abort createWorld() and remove the entire scene.
   ShapeGeometry is expanded to a non-indexed triangle list before leaf veins
   are appended, ensuring the leaf surface and vein buffers are well-formed.
   Maple construction itself is also guarded so the pavilion/weather world
   remains available if the optional tree model encounters a device-specific issue.
   V52 smooth wood, V51 branch directions, V53 six leaf silhouettes, tree placement,
   pavilion, weather UI, Location privacy and Stacks lifecycle are retained.
*/

/* LE-WEATHER-PAVILION-MOMIJI-BRANCH-SKELETON-V49
   Branch-first rebuild guided by the supplied Japanese maple GLB and its
   multi-angle reference screenshots. Builds a curved S-profile central trunk,
   seven exposed buttress roots, seven irregular primary scaffold limbs,
   a continuation leader with four offset upper limbs, 28 secondary boughs,
   84 tertiary branches and 182 fine terminal twig forks. Branches use one
   merged tapered bark mesh with low-sided cross-sections and vertex colour
   variation. No foliage geometry is generated in this milestone so the full
   woody architecture can be visually inspected before the leaf pass.
   Tree placement remains at the tested front-right location. Pavilion,
   roof, lanterns, doors, foundation, deck, stairs, rails, other scenery,
   camera, Weather UI, Location privacy and Stacks lifecycle are unchanged.
*/
