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

  async function mountLivingTopography(host) {
    const THREE = await import(THREE_MODULE_URL);
    if (!host.isConnected) return { setState() {}, dispose() {} };
    const canvas = el('canvas','le-weather-world-canvas');
    canvas.setAttribute('aria-label','Three-dimensional Living Topography with raised mountains, forested valleys, floating clouds and water');
    host.appendChild(canvas);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = Math.min(host.clientWidth || innerWidth,host.clientHeight || innerHeight) < 620;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({canvas,antialias:!small,alpha:false,powerPreference:'low-power'});
    } catch (error) {
      const fallback=el('div','le-weather-world-fallback','This device could not start the 3D weather renderer. Weather readings remain available.');
      host.appendChild(fallback);
      console.warn('[LIVE // EARTH] 3D Weather renderer unavailable.',error);
      return {setState(){},dispose(){canvas.remove();fallback.remove();}};
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
    renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.06;

    const scene=new THREE.Scene();
    scene.background=new THREE.Color('#91afa5');
    scene.fog=new THREE.FogExp2('#9bb8a9',0.011);
    const camera=new THREE.PerspectiveCamera(36,Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight),0.1,90);
    camera.position.set(0.2,12.4,23.5);camera.lookAt(0,2.15,-1.7);
    const hemi=new THREE.HemisphereLight('#edf6e7','#314a3e',1.2);scene.add(hemi);
    const sun=new THREE.DirectionalLight('#fff0cc',2.45);sun.position.set(-9,17,10);sun.castShadow=true;
    sun.shadow.mapSize.set(small?768:1024,small?768:1024);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.bias=-0.00025;sun.shadow.normalBias=0.025;scene.add(sun);

    const world=new THREE.Group();scene.add(world);
    const worldSize=26,half=worldSize/2,grid=small?96:120;
    const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
    const gaussian=(x,z,cx,cz,sx,sz,h)=>h*Math.exp(-(((x-cx)**2)/(2*sx*sx)+((z-cz)**2)/(2*sz*sz)));
    function heightAt(x,z){
      const peaks=gaussian(x,z,-6.2,-7,2.2,3.1,5.3)+gaussian(x,z,-1.8,-8.8,2.3,3,6)+gaussian(x,z,3.1,-7.3,2.8,3.4,4.7)+gaussian(x,z,7.2,-3.9,2,3.7,3.7)+gaussian(x,z,-9,-1,2,4,2.4);
      const rolling=.48*Math.sin(x*.48+z*.19)+.25*Math.cos(z*.62-x*.17)+.14*Math.sin((x+z)*.92);
      const valleyX=2.2*Math.sin(z*.28)-.3;
      const valley=Math.exp(-((x-valleyX)**2)/2)*smooth(-12,5,z);
      const edge=.92+.08*Math.cos((x/half)*Math.PI*.5)*Math.cos((z/half)*Math.PI*.5);
      return Math.max(-.2,(.45+peaks+rolling-valley)*edge);
    }
    const terrainGeometry=new THREE.PlaneGeometry(worldSize,worldSize,grid,grid);terrainGeometry.rotateX(-Math.PI/2);
    const positions=terrainGeometry.attributes.position,colors=[];
    const grass=new THREE.Color('#66896a'),meadow=new THREE.Color('#91a978'),rock=new THREE.Color('#777d70'),snowColor=new THREE.Color('#d8dfd1'),wet=new THREE.Color('#456f67'),tmpColor=new THREE.Color();
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i),y=heightAt(x,z);positions.setY(i,y);
      const noise=Math.abs(Math.sin(x*.75)*Math.cos(z*.63));tmpColor.copy(grass).lerp(meadow,smooth(.1,2.2,y)*.82);
      if(y>3.1)tmpColor.lerp(rock,smooth(3,4.8,y)*.85);if(y>4.9)tmpColor.lerp(snowColor,smooth(4.9,6,y)*.88);
      tmpColor.lerp(wet,smooth(.45,0,Math.abs(x-(2.2*Math.sin(z*.28)-.3)))*.42).multiplyScalar(.94+noise*.09);colors.push(tmpColor.r,tmpColor.g,tmpColor.b);
    }
    terrainGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeometry.computeVertexNormals();
    const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:.02});
    const terrain=new THREE.Mesh(terrainGeometry,terrainMaterial);terrain.receiveShadow=true;terrain.castShadow=true;world.add(terrain);
    const deepEarth=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:'#344b3b',roughness:1}));deepEarth.rotation.x=-Math.PI/2;deepEarth.position.y=-.35;deepEarth.receiveShadow=true;world.add(deepEarth);

    // Contour geometry is sampled from this exact terrain height field.
    const contourVertices=[],edgePairs=[[0,1],[1,2],[2,3],[3,0]],steps=54,levels=[1.15,1.75,2.35,2.95,3.55,4.15,4.75,5.35];
    for(const level of levels){
      for(let iz=0;iz<steps;iz++)for(let ix=0;ix<steps;ix++){
        const x0=-half+ix/steps*worldSize,x1=-half+(ix+1)/steps*worldSize,z0=-half+iz/steps*worldSize,z1=-half+(iz+1)/steps*worldSize;
        const corners=[[x0,z0,heightAt(x0,z0)],[x1,z0,heightAt(x1,z0)],[x1,z1,heightAt(x1,z1)],[x0,z1,heightAt(x0,z1)]],hits=[];
        for(const [a,b] of edgePairs){const va=corners[a][2]-level,vb=corners[b][2]-level;if((va<0&&vb>=0)||(va>=0&&vb<0)){const t=va/(va-vb);hits.push([THREE.MathUtils.lerp(corners[a][0],corners[b][0],t),THREE.MathUtils.lerp(corners[a][1],corners[b][1],t)]);}}
        if(hits.length>=2){const pairs=hits.length===4?[[0,1],[2,3]]:[[0,1]];for(const [a,b] of pairs)for(const p of [hits[a],hits[b]])contourVertices.push(p[0],heightAt(p[0],p[1])+.035,p[1]);}
      }
    }
    const contourGeometry=new THREE.BufferGeometry();contourGeometry.setAttribute('position',new THREE.Float32BufferAttribute(contourVertices,3));
    const contourMaterial=new THREE.LineBasicMaterial({color:'#d9e8bd',transparent:true,opacity:.25,depthWrite:false});
    const contours=new THREE.LineSegments(contourGeometry,contourMaterial);contours.renderOrder=2;world.add(contours);

    // A reflective river traces the low valley and spills into a sculpted pool.
    const riverPoints=[];for(let i=0;i<=70;i++){const z=THREE.MathUtils.lerp(-12.4,12,i/70),x=2.2*Math.sin(z*.28)-.3;riverPoints.push(new THREE.Vector3(x,heightAt(x,z)+.055,z));}
    const riverCurve=new THREE.CatmullRomCurve3(riverPoints),riverVerts=[],riverIndices=[],riverUvs=[],riverSegments=220;
    for(let i=0;i<=riverSegments;i++){const t=i/riverSegments,p=riverCurve.getPoint(t),tan=riverCurve.getTangent(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize(),width=.22+.36*smooth(.15,1,t);for(const sign of [-1,1]){const v=p.clone().addScaledVector(side,sign*width);v.y=heightAt(v.x,v.z)+.075;riverVerts.push(v.x,v.y,v.z);riverUvs.push(0,t);}if(i<riverSegments){const a=i*2,b=a+1,c=a+2,d=a+3;riverIndices.push(a,c,b,b,c,d);}}
    const riverGeometry=new THREE.BufferGeometry();riverGeometry.setAttribute('position',new THREE.Float32BufferAttribute(riverVerts,3));riverGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(riverUvs,2));riverGeometry.setIndex(riverIndices);riverGeometry.computeVertexNormals();
    const riverMaterial=new THREE.MeshPhysicalMaterial({color:'#75b8b0',roughness:.16,metalness:.12,clearcoat:1,clearcoatRoughness:.1,transparent:true,opacity:.88});
    const river=new THREE.Mesh(riverGeometry,riverMaterial);river.receiveShadow=true;world.add(river);
    const fallGeometry=new THREE.PlaneGeometry(.72,1.1,1,12),fallMaterial=new THREE.MeshPhysicalMaterial({color:'#c0e8df',transparent:true,opacity:.72,roughness:.12,metalness:.08,side:THREE.DoubleSide,depthWrite:false});
    const waterfall=new THREE.Mesh(fallGeometry,fallMaterial);waterfall.position.set(1,.58,8);waterfall.rotation.x=-.22;world.add(waterfall);
    const poolGeometry=new THREE.CircleGeometry(1,40),poolMaterial=new THREE.MeshPhysicalMaterial({color:'#76b7ad',roughness:.14,metalness:.1,clearcoat:1,transparent:true,opacity:.72});
    const pool=new THREE.Mesh(poolGeometry,poolMaterial);pool.rotation.x=-Math.PI/2;pool.position.set(1,.14,8.75);world.add(pool);
    const lensGeometry=new THREE.TorusGeometry(.55,.018,8,64),lensMaterial=new THREE.MeshPhysicalMaterial({color:'#e4fff0',transparent:true,opacity:.28,roughness:.08,metalness:.12,clearcoat:1});
    const opticalRing=new THREE.Mesh(lensGeometry,lensMaterial);opticalRing.rotation.x=-Math.PI/2;opticalRing.position.set(1,.17,8.75);world.add(opticalRing);

    // Tree instances add scale and forest depth without hundreds of draw calls.
    const treeCount=small?280:460,trunkGeometry=new THREE.CylinderGeometry(.035,.06,.7,5),crownGeometry=new THREE.ConeGeometry(.36,1.2,6,2);
    const trunkMaterial=new THREE.MeshStandardMaterial({color:'#5c4935',roughness:1}),crownMaterial=new THREE.MeshStandardMaterial({color:'#355f49',roughness:.92,flatShading:true});
    const trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,treeCount),crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,treeCount);trunks.castShadow=crowns.castShadow=true;trunks.receiveShadow=crowns.receiveShadow=true;
    const dummy=new THREE.Object3D();let seed=1847;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};let treeIndex=0;
    for(let tries=0;tries<treeCount*8&&treeIndex<treeCount;tries++){const x=(rand()-.5)*23.5,z=(rand()-.5)*22.5,y=heightAt(x,z),riverX=2.2*Math.sin(z*.28)-.3;if(y<.35||y>3.1||Math.abs(x-riverX)<1.05||rand()<.16)continue;const scale=.62+rand()*.72;dummy.position.set(x,y+.34*scale,z);dummy.rotation.set(0,rand()*Math.PI*2,0);dummy.scale.setScalar(scale);dummy.updateMatrix();trunks.setMatrixAt(treeIndex,dummy.matrix);dummy.position.set(x,y+.95*scale,z);dummy.rotation.set(0,rand()*Math.PI*2,0);dummy.scale.set(scale,scale*(.82+rand()*.42),scale);dummy.updateMatrix();crowns.setMatrixAt(treeIndex,dummy.matrix);crowns.setColorAt(treeIndex,new THREE.Color().setHSL(.31+rand()*.055,.27+rand()*.18,.25+rand()*.12));treeIndex++;}
    trunks.count=crowns.count=treeIndex;trunks.instanceMatrix.needsUpdate=crowns.instanceMatrix.needsUpdate=true;if(crowns.instanceColor)crowns.instanceColor.needsUpdate=true;world.add(trunks,crowns);

    // Separate 3D cloud volumes float at different heights and depths.
    const cloudMaterial=new THREE.MeshStandardMaterial({color:'#f3f7ec',roughness:.88,transparent:true,opacity:.9});
    const cloudGeometry=new THREE.SphereGeometry(1,16,12),clouds=[];
    function addCloud(x,y,z,scale,drift,offset){const group=new THREE.Group();group.position.set(x,y,z);group.userData.drift=drift;for(let i=0;i<7;i++){const angle=i/7*Math.PI*2+offset,puff=new THREE.Mesh(cloudGeometry,cloudMaterial),r=i===0?0:.62+(i%3)*.08;puff.position.set(Math.cos(angle)*r*scale*.8,(i%3)*.13*scale,Math.sin(angle)*r*scale*.48);puff.scale.set(scale*(.68+(i%3)*.13),scale*(.44+(i%2)*.12),scale*(.55+(i%2)*.12));puff.castShadow=true;group.add(puff);}clouds.push(group);scene.add(group);}
    addCloud(-5.4,7,-4.8,1.55,.12,.2);addCloud(1.7,8.6,-8,1.2,-.08,1.4);addCloud(6.1,6.6,-2.2,1.72,.09,.8);addCloud(-1.8,6.2,3.5,.84,-.06,2.1);
    const mistGeometry=new THREE.PlaneGeometry(34,4),mistMaterial=new THREE.MeshBasicMaterial({color:'#e1eee0',transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
    const mist=new THREE.Mesh(mistGeometry,mistMaterial);mist.position.set(0,3,-10.2);mist.rotation.x=-.08;scene.add(mist);

    const particleCount=small?190:300,particlePositions=new Float32Array(particleCount*3),particleSpeeds=new Float32Array(particleCount);
    for(let i=0;i<particleCount;i++){particlePositions[i*3]=(rand()-.5)*27;particlePositions[i*3+1]=rand()*16;particlePositions[i*3+2]=(rand()-.5)*27;particleSpeeds[i]=.04+rand()*.08;}
    const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
    const particleMaterial=new THREE.PointsMaterial({color:'#e8f5f1',size:.055,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});
    const particles=new THREE.Points(particleGeometry,particleMaterial);scene.add(particles);

    const weatherLooks={
      neutral:{sky:'#82958d',fog:'#9aaa9b',density:.014,cloud:.68,light:1.35,particles:0,scale:1},
      clear:{sky:'#a8c6bd',fog:'#a9c4b8',density:.011,cloud:.58,light:2.45,particles:0,scale:1},
      cloudy:{sky:'#90a9a8',fog:'#9caeaa',density:.014,cloud:.96,light:1.72,particles:0,scale:1.13},
      rain:{sky:'#536f79',fog:'#738b88',density:.019,cloud:1,light:1.02,particles:.64,scale:1.2},
      storm:{sky:'#394e5f',fog:'#657c7c',density:.024,cloud:1,light:.82,particles:.78,scale:1.25},
      snow:{sky:'#aebfc0',fog:'#b8c7c2',density:.016,cloud:.9,light:1.55,particles:.78,scale:1.06},
      fog:{sky:'#b6c3b7',fog:'#c1ccc0',density:.035,cloud:.78,light:1.12,particles:.12,scale:1.08},
      hot:{sky:'#c6b894',fog:'#c9bfa5',density:.012,cloud:.22,light:2.65,particles:0,scale:.94}
    };
    const phaseLooks={dawn:['#a8a9a4','#bea99a'],day:['#a8c6bd','#a9c4b8'],evening:['#7f8794','#a98f89'],night:['#1b2c3c','#43535a']};
    let activeWeather='clear',activePhase='day',activeWind=0,windDirection=270;
    let targetSky=new THREE.Color(weatherLooks.clear.sky),targetFog=new THREE.Color(weatherLooks.clear.fog),targetLook=weatherLooks.clear;
    let animationFrame=0,lastFrame=0,elapsed=0,disposed=false;
    function setState(next={}){
      const kind=weatherLooks[next.weather]?next.weather:'clear',phase=phaseLooks[next.phase]?next.phase:'day';
      activeWeather=kind;activePhase=phase;activeWind=Math.max(0,number(next.wind)??0);windDirection=number(next.windDirection)??270;
      const look={...weatherLooks[kind]};
      if(phase==='night'){look.light*=.38;look.cloud=Math.max(.22,look.cloud*.74);}
      if(phase==='dawn'||phase==='evening')look.light*=.78;
      if(kind==='clear'&&number(next.cloudCover)!==null)look.cloud=.12+Math.min(100,Math.max(0,number(next.cloudCover)))/100*.62;
      targetLook=look;targetSky.set(kind==='clear'||kind==='hot'?phaseLooks[phase][0]:look.sky);targetFog.set(phase==='night'&&kind==='clear'?phaseLooks.night[1]:look.fog);
      particleMaterial.size=kind==='rain'||kind==='storm'?.045:.065;
      particleMaterial.color.set(kind==='rain'||kind==='storm'?'#c5e8f1':'#f6fff9');
      if(reducedMotion){scene.background.copy(targetSky);scene.fog.color.copy(targetFog);scene.fog.density=look.density;sun.intensity=look.light;cloudMaterial.opacity=look.cloud;particleMaterial.opacity=look.particles;clouds.forEach((cloud,index)=>cloud.scale.setScalar(look.scale*(.96+index*.015)));renderer.render(scene,camera);}
    }
    function resize(){if(disposed)return;const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);camera.aspect=width/height;camera.fov=width<height?36:31;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));renderer.setSize(width,height,false);if(reducedMotion)renderer.render(scene,camera);}
    const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(animationFrame);animationFrame=0;}else if(!reducedMotion&&!animationFrame){lastFrame=0;animationFrame=requestAnimationFrame(render);}};
    const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;resizeObserver?.observe(host);
    window.addEventListener('resize',resize,{passive:true});window.addEventListener('orientationchange',resize,{passive:true});document.addEventListener('visibilitychange',onVisibility);
    const clock=new THREE.Clock();
    function render(now=0){if(disposed||document.hidden||!host.isConnected)return;if(!reducedMotion)animationFrame=requestAnimationFrame(render);const delta=Math.min(clock.getDelta(),.045);elapsed+=delta;const morph=1-Math.exp(-delta*1.35);scene.background.lerp(targetSky,morph);scene.fog.color.lerp(targetFog,morph);scene.fog.density=THREE.MathUtils.lerp(scene.fog.density,targetLook.density,morph);sun.intensity=THREE.MathUtils.lerp(sun.intensity,targetLook.light,morph);cloudMaterial.opacity=THREE.MathUtils.lerp(cloudMaterial.opacity,targetLook.cloud,morph);particleMaterial.opacity=THREE.MathUtils.lerp(particleMaterial.opacity,targetLook.particles,morph);clouds.forEach((cloud,index)=>cloud.scale.setScalar(THREE.MathUtils.lerp(cloud.scale.x,targetLook.scale*(.96+index*.015),morph)));if(now-lastFrame<1000/30){if(reducedMotion)renderer.render(scene,camera);return;}lastFrame=now;clouds.forEach((cloud,index)=>{const direction=Math.sin(windDirection*Math.PI/180);cloud.position.x+=cloud.userData.drift*delta*(1+Math.min(1.2,activeWind/50))*(direction<0?-1:1)*(activeWeather==='rain'||activeWeather==='storm'?.75:1);if(cloud.position.x>15)cloud.position.x=-15;if(cloud.position.x<-15)cloud.position.x=15;cloud.position.y+=Math.sin(elapsed*.24+index)*.0009;});if(activeWeather==='rain'||activeWeather==='storm'||activeWeather==='snow'){const p=particleGeometry.attributes.position;for(let i=0;i<particleCount;i++){p.array[i*3+1]-=particleSpeeds[i]*(activeWeather==='snow'?.8:2.1);p.array[i*3]+=activeWeather==='snow'?-0.008:.018;if(p.array[i*3+1]<-.4){p.array[i*3+1]=13+rand()*3;p.array[i*3]=(rand()-.5)*27;}}p.needsUpdate=true;}riverMaterial.opacity=.84+Math.sin(elapsed*1.1)*.035;waterfall.rotation.z=Math.sin(elapsed*1.8)*.012;opticalRing.rotation.z=Math.sin(elapsed*.16)*.025;renderer.render(scene,camera);}
    resize();setState({weather:'neutral',phase:'day'});
    if(reducedMotion)renderer.render(scene,camera);else animationFrame=requestAnimationFrame(render);
    function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(animationFrame);resizeObserver?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);document.removeEventListener('visibilitychange',onVisibility);scene.traverse(object=>{if(object.geometry&&object.geometry!==cloudGeometry)object.geometry.dispose();if(object.material&&object.material!==cloudMaterial)object.material.dispose();});cloudGeometry.dispose();cloudMaterial.dispose();renderer.dispose();renderer.forceContextLoss?.();canvas.remove();}
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

    return ()=>{engineDisposed=true;if(pollTimer)clearInterval(pollTimer);pollTimer=0;abortController?.abort();abortController=null;if(locationEventHandler)window.removeEventListener('live-earth-location-state',locationEventHandler);if(networkOfflineHandler)window.removeEventListener('offline',networkOfflineHandler);if(networkOnlineHandler)window.removeEventListener('online',networkOnlineHandler);if(engine)engine.dispose?.();else enginePromise?.then(instance=>instance?.dispose?.());};
  }

  runtime.registerFeature('weather',activateWeather);
})();
