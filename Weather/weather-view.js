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
      .le-weather-v2 *{box-sizing:border-box}.le-weather-v2 [hidden]{display:none!important}.le-weather-v2 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:pan-y}
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
  async function createWorld(canvas){
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
    // Layered procedural islands and Japanese garden trees: all actual 3D geometry.
    const trunk=mat('#4b392b'),leafMats=['#244d3c','#2f6249','#47745a'].map(c=>mat(c));
    function tree(x,z,scale=1){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(.10*scale,.18*scale,1.6*scale,7),trunk);t.position.y=.8*scale;g.add(t);for(let k=0;k<3;k++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.9*scale-k*.12,1),leafMats[k]);crown.position.set((k-1)*.18*scale,(1.55+k*.46)*scale,0);crown.scale.set(1.0,.78,.85);g.add(crown);}g.position.set(x,0,z);scene.add(g);return g;}
    // Fuller Japanese garden trees return as balanced side framing around the pavilion.
    const trees=[];const treeLayout=[
      [-8.0,-5.0,.82],[-10.8,1.5,.72],[-8.8,8.2,.78],[-13.0,-12.0,.88],[-13.8,6.0,.70],
      [8.0,-5.0,.82],[10.8,1.5,.72],[8.8,8.2,.78],[13.0,-12.0,.88],[13.8,6.0,.70]
    ];
    for(const [x,z,scale] of treeLayout)trees.push(tree(x,z,scale));
    // Main architectural landmark: open pavilion with curved eaves, columns and lanterns.
    const house=new THREE.Group();scene.add(house);house.position.set(0,0,-1.4);house.rotation.y=-15*Math.PI/180;house.userData.refinement='LE-WEATHER-PAVILION-ROTATION-CCW-15-V1';
    const timber=mat('#684a35'),wall=mat('#e6ddc6'),roof=mat('#263b43',.72,.12),dark=mat('#293b38'),gold= new THREE.MeshStandardMaterial({color:'#d69b55',emissive:'#a35b1e',emissiveIntensity:.65});
    function box(parent,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);parent.add(o);return o;}
    // LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1 LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2 LE-WEATHER-PAVILION-TRADITIONAL-STAIRS-PIERS-V3 LE-WEATHER-PAVILION-STAIR-INFILL-V4 LE-WEATHER-PAVILION-FOUR-SIDE-RAILS-V9: raised engawa deck with visible undercroft and centred three-step approach.
    const foundationStone=mat('#777465'),deckPlank=mat('#806044'),stepTop=mat('#98724f');
    // Deep perimeter beams frame the wider platform.
    box(house,timber,0,1.25,2.76,7.86,.15,.24);
    box(house,timber,0,1.25,-2.76,7.86,.15,.24);
    box(house,timber,-3.81,1.25,0,.24,.15,5.28);
    box(house,timber,3.81,1.25,0,.24,.15,5.28);
    // Stone pads and timber piers lift the deck visibly above the garden ground.
    for(const x of [-3.42,0,3.42]){
      for(const z of [-2.34,2.34]){
        box(house,foundationStone,x,.14,z,.48,.28,.48);
        box(house,dark,x,.72,z,.30,.88,.30);
      }
    }
    for(const x of [-3.42,3.42]){
      box(house,foundationStone,x,.14,0,.48,.28,.48);
      box(house,dark,x,.72,0,.30,.88,.30);
    }
    // Fine deck boards are visible around the building as a veranda.
    for(let i=0;i<10;i++){
      const z=-2.46+i*.545;
      box(house,deckPlank,0,1.565,z,7.58,.045,.50);
    }
    // Four traditional solid timber risers with deep, overhanging treads.
    // Each step has a low vertical riser and a broad cap, creating a connected old-wood stair profile.
    const entranceSteps=[
      {z:4.20,front:.16,top:.34},
      {z:3.25,front:.48,top:.68},
      {z:2.30,front:.80,top:1.02},
      {z:1.35,front:1.12,top:1.36}
    ];
    for(const step of entranceSteps){
      box(house,timber,0,(step.front+step.top)/2,step.z,4.35,step.top-step.front,.98);
      box(house,deckPlank,0,step.top-.035,step.z+.035,4.48,.07,1.10);
      box(house,stepTop,0,step.top+.006,step.z+.035,4.38,.025,1.00);
    } 
    
    // Left and right long sides: upper/lower rails and three vertical timber balusters per side.
    for(const x of [-3.70,3.70]){
      box(house,timber,x,2.35,0,.18,.16,5.40);
      box(house,deckPlank,x,1.78,0,.13,.12,5.40);
      for(const z of [-1.70,0,1.70]){
        box(house,dark,x,2.06,z,.12,.56,.12);
      }
    }

    // Rear short side: a continuous upper and lower rail with three vertical balusters.
    box(house,timber,0,2.35,-2.62,7.58,.16,.18);
    box(house,deckPlank,0,1.78,-2.62,7.58,.12,.14);
    for(const x of [-2.55,0,2.55]){
      box(house,dark,x,2.06,-2.62,.14,.56,.14);
    }

    // Front short side: matching rail returns leave the centred staircase entrance open.
    for(const x of [-3.015,3.015]){
      box(house,timber,x,2.35,2.605,1.55,.16,.18);
      box(house,deckPlank,x,1.78,2.605,1.55,.12,.14);
      for(const offset of [-.52,.52]){
        box(house,dark,x+offset,2.06,2.605,.12,.56,.14);
      }
    }
    // Continuous vertical timber infill closes the exposed middle gaps between each tread.
    for(let i=1;i<entranceSteps.length;i++){
      const lower=entranceSteps[i-1];
      const upper=entranceSteps[i];
      const rise=Math.max(0,upper.front-lower.top);
      if(rise>0){
        box(house,timber,0,(lower.top+upper.front)/2,upper.z+.505,4.34,rise,.10);
        box(house,deckPlank,0,(lower.top+upper.front)/2,upper.z+.562,4.38,rise*.72,.018);
      }
    }
    
    // Single veranda floor: the ten timber deck boards above are the visible walking surface.
    // Narrow joists replace the redundant full-area slab and bridge onto the perimeter beams.
    for(const z of [-2.34,-1.25,-.16,.93,2.02]){
      box(house,timber,0,1.43,z,7.52,.21,.14);
    }box(house,wall,0,2.55,-.08,5.9,2.0,3.7);
    // Shoji divisions on the front elevation.
    for(let i=0;i<7;i++){const x=-2.55+i*.85;box(house,timber,x,2.55,1.82,.075,1.9,.09);}
    box(house,timber,0,1.62,1.88,6.15,.10,.12);box(house,timber,0,3.55,0,7.5,.22,5.2);
    for(const x of [-3.15,3.15])for(const z of [-1.85,1.85])box(house,timber,x,2.5,z,.18,2.25,.18);
    const roofGeo=new THREE.ConeGeometry(5.2,1.55,4,1);roofGeo.rotateY(Math.PI/4);const roofMesh=new THREE.Mesh(roofGeo,roof);roofMesh.position.set(0,4.15,-.05);roofMesh.scale.set(1.05,1,.78);house.add(roofMesh);
    const eave=box(house,roof,0,3.55,.05,8.3,.18,5.9);eave.rotation.x=-.035;
    for(const x of [-3.4,3.4]){const lantern=new THREE.Group();lantern.position.set(x,2.5,2.35);const body=new THREE.Mesh(new THREE.BoxGeometry(.38,.5,.38),gold);lantern.add(body);const cap=new THREE.Mesh(new THREE.ConeGeometry(.34,.18,4),dark);cap.position.y=.34;lantern.add(cap);house.add(lantern);}
    // Foreground stepping stones and garden boulders.
    const stone=mat('#81918a');for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.CylinderGeometry(.38,.45,.13,8),stone);s.position.set(-2.5+i*.78,.02,3.1+Math.sin(i*.8)*.25);s.rotation.y=i*.3;scene.add(s);}
    const cloudMat=new THREE.MeshStandardMaterial({color:'#edf3ee',transparent:true,opacity:.66,roughness:1});const clouds=[];
    for(let i=0;i<6;i++){const g=new THREE.Group();for(let j=0;j<4;j++){const c=new THREE.Mesh(new THREE.SphereGeometry(1.1+(j%2)*.35,12,10),cloudMat);c.position.set((j-1.5)*1.05,Math.sin(j*2)*.18,0);c.scale.y=.55;g.add(c);}g.position.set((i-2.5)*8,9+(i%3)*1.5,-13-(i%2)*3);scene.add(g);clouds.push(g);}
    const rainGeo=new THREE.BufferGeometry(),rainCount=520,rainPos=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainPos[i*3]=(Math.random()-.5)*34;rainPos[i*3+1]=Math.random()*18;rainPos[i*3+2]=(Math.random()-.5)*30;}rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0xbad8e8,size:.075,transparent:true,opacity:.7}));scene.add(rain);
    const snowGeo=new THREE.BufferGeometry(),snowCount=250,snowPos=new Float32Array(snowCount*3);for(let i=0;i<snowCount;i++){snowPos[i*3]=(Math.random()-.5)*32;snowPos[i*3+1]=Math.random()*18;snowPos[i*3+2]=(Math.random()-.5)*28;}snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:.12,transparent:true,opacity:.9}));scene.add(snow);
    const stars=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xe8f3ff,size:.11}));const starPos=new Float32Array(180*3);for(let i=0;i<180;i++){starPos[i*3]=(Math.random()-.5)*70;starPos[i*3+1]=12+Math.random()*20;starPos[i*3+2]=-25-Math.random()*35;}stars.geometry.setAttribute('position',new THREE.BufferAttribute(starPos,3));scene.add(stars);
    const state={kind:'clear',phase:'day'};let raf=0,last=0,elapsed=0,disposed=false,visible=!document.hidden,width=1,height=1;
    const palettes={clear:['#7fb7c3','#d8c9a7'],cloudy:['#718d99','#9aa6a0'],rain:['#3f5e70','#637e84'],storm:['#1b2e43','#455b68'],snow:['#a6c5d1','#e2e7e0'],fog:['#a3b6b0','#d0d2c3'],wind:['#78a8b2','#d2c8a9'],hot:['#83b7bb','#e8c58e'],night:['#081a35','#273c55']};
    function setWeather(kind){state.kind=kind;const p=palettes[kind]||palettes.clear;scene.background.set(p[0]);scene.fog.color.set(p[1]);scene.fog.density=kind==='fog'?.035:kind==='rain'?.018:kind==='storm'?.024:.010;rain.visible=kind==='rain'||kind==='storm';snow.visible=kind==='snow';stars.visible=kind==='night';clouds.forEach((c,i)=>{c.visible=['cloudy','rain','storm','snow','fog'].includes(kind)||i<3;c.scale.setScalar(kind==='storm'?1.3:kind==='fog'?1.5:1);});sun.intensity=kind==='night'?.18:kind==='storm'?.55:kind==='cloudy'?1.1:kind==='rain'?1.35:3.1;fill.intensity=kind==='night'?.6:1.0;waterMat.roughness=kind==='storm'?.48:kind==='rain'?.34:.2;gold.emissiveIntensity=kind==='night'?1.7:.45;}
    function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.0,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}
    function frame(ts){if(disposed||!visible)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(ts-last)/1000||0);last=ts;elapsed+=dt;const a=rain.geometry.attributes.position.array,b=snow.geometry.attributes.position.array;for(let i=0;i<rainCount;i++){a[i*3+1]-=dt*18;if(a[i*3+1]<0)a[i*3+1]=18;}rain.geometry.attributes.position.needsUpdate=true;for(let i=0;i<snowCount;i++){b[i*3+1]-=dt*1.7;if(b[i*3+1]<0)b[i*3+1]=18;b[i*3]+=Math.sin(elapsed+i)*dt*.18;}snow.geometry.attributes.position.needsUpdate=true;clouds.forEach((c,i)=>{c.position.x+=dt*(state.kind==='wind'?.42:.12)*(i%2?1:-1);if(c.position.x>28)c.position.x=-28;if(c.position.x< -28)c.position.x=28;});trees.forEach((t,i)=>{t.rotation.z=Math.sin(elapsed*.55+i)* (state.kind==='wind'?.06:.012);});waterMat.roughness=(state.kind==='storm'?.44:.2)+Math.sin(elapsed*1.2)*.025;renderer.render(scene,camera);}
    function start(){if(!disposed&&visible&&!raf)raf=requestAnimationFrame(frame);}function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
    const ro=new ResizeObserver(resize);ro.observe(canvas);const onResize=()=>resize();const onVisibility=()=>{visible=!document.hidden;if(visible){last=0;start();}else stop();};window.addEventListener('resize',onResize,{passive:true});document.addEventListener('visibilitychange',onVisibility);resize();setWeather('clear');start();
    return {setWeather,dispose(){disposed=true;stop();ro.disconnect();window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose?.();}});renderer.dispose();renderer.forceContextLoss?.();}};
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
