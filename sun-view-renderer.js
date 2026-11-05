/* LIVE // EARTH — Sun View arc + solar-time interface.
   Replaces the old procedural 3D Sun with the Moon View's curved arc and draggable time-scroller pattern.
   Uses the existing local astronomy module and the app's existing Location ON/OFF permission state.
   Moon, Home Earth, shared sky backgrounds, and Orb navigation are left untouched. */
(() => {
  "use strict";
  if (window.__liveEarthSunViewInstalled || window.__liveEarthSunViewBooting) return;
  window.__liveEarthSunViewBooting = true;

  const root = document.getElementById("le-sky-view");
  if (!root) {
    window.__liveEarthSunViewBooting = false;
    console.warn("[LIVE // EARTH] Sun arc interface skipped: Sky View root is absent.");
    return;
  }

  const astronomyUrl = new URL("./astronomy.js", document.baseURI).href;
  const css = `
    #le-sky-view .le-sun-ui {
      position:absolute; inset:0; z-index:4; overflow:hidden;
      opacity:0; visibility:hidden; pointer-events:none;
      transition:opacity .28s ease,visibility .28s ease;
      color:#fff2db; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #le-sky-view[data-view="sun"] .le-sun-ui { opacity:1; visibility:visible; }
    #le-sky-view .le-sun-svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
    #le-sky-view .le-sun-arc { fill:none; stroke:url(#leSunArcGradient); stroke-width:1.9; stroke-linecap:round; filter:drop-shadow(0 0 3px #ffd08acc) drop-shadow(0 0 9px #ff9c3d55); }
    #le-sky-view .le-sun-arc-halo { fill:none; stroke:#ffb45d; stroke-opacity:.18; stroke-width:6; }
    #le-sky-view .le-sun-rail { fill:none; stroke:url(#leSunRailGradient); stroke-width:1.8; stroke-linecap:round; filter:drop-shadow(0 0 3px #ffd28aaa); }
    #le-sky-view .le-sun-hit { fill:none; stroke:transparent; stroke-width:36; pointer-events:stroke; touch-action:none; cursor:grab; outline:none; }
    #le-sky-view .le-sun-hit:active { cursor:grabbing; }
    #le-sky-view .le-sun-hit:focus-visible { stroke:#ffe1ad66; stroke-width:28; }
    #le-sky-view .le-sun-endpoint { fill:#ffe3ad; filter:drop-shadow(0 0 5px #ffc26b); }
    #le-sky-view .le-sun-endpoint-halo { fill:#ffc36f; fill-opacity:.16; }
    #le-sky-view .le-sun-label { fill:#ffe0ad; font-size:10px; letter-spacing:1.65px; paint-order:stroke; stroke:#1c1209b8; stroke-width:2.4px; stroke-linejoin:round; }
    #le-sky-view .le-sun-event-time { fill:#fff4df; font-size:15px; font-weight:600; paint-order:stroke; stroke:#1b1109bd; stroke-width:2.7px; stroke-linejoin:round; }
    #le-sky-view .le-sun-current-time { fill:#fff5e4; font-size:15px; font-weight:600; letter-spacing:.2px; text-anchor:middle; paint-order:stroke; stroke:#201207cf; stroke-width:3px; stroke-linejoin:round; }
    #le-sky-view .le-sun-hint { fill:#e7c99e; opacity:.9; font-size:9px; letter-spacing:1.2px; text-anchor:middle; paint-order:stroke; stroke:#180f08cc; stroke-width:2px; }
    #le-sky-view .le-sun-info { fill:#f2d4a7; opacity:.9; font-size:9px; letter-spacing:1.1px; text-anchor:middle; paint-order:stroke; stroke:#180f08cc; stroke-width:2px; }
    #le-sky-view .le-sun-tick { stroke:#ffe1b7; stroke-width:1; stroke-opacity:.42; }
    #le-sky-view .le-sun-dust { fill:#ffe6bf; filter:drop-shadow(0 0 2px #ffc36c); animation:le-sun-dust-pulse 2.4s ease-in-out infinite alternate; }
    #le-sky-view .le-sun-ray { stroke:#ffd98e; stroke-width:2.1; stroke-linecap:round; opacity:.9; }
    #le-sky-view .le-sun-disc { fill:url(#leSunDiscGradient); stroke:#fff0c6; stroke-opacity:.88; stroke-width:1.1; }
    #le-sky-view .le-sun-disc-glint { fill:#fff4d9; opacity:.36; }
    #le-sky-view .le-sun-brand { position:absolute; z-index:5; top:calc(env(safe-area-inset-top) + 20px); left:22px; right:22px; color:#f9e8d2; font-size:12px; font-weight:800; letter-spacing:.24em; text-shadow:0 2px 12px #000; pointer-events:none; }
    #le-sky-view .le-sun-brand span { color:#ffb548; }
    #le-sky-view .le-sun-subtitle { display:block; margin-top:7px; color:#d1a878; font-size:9px; font-weight:500; letter-spacing:.18em; }
    #le-sky-view .le-sun-live {
      position:absolute; z-index:5; min-width:70px; min-height:32px; padding:7px 12px;
      border:1px solid #ffd28a75; border-radius:999px;
      background:linear-gradient(135deg,#d8852b35,#251609a8);
      color:#ffe9c5; font:700 9px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:1.8px; text-align:center; box-shadow:0 4px 16px #0005,inset 0 1px #fff2;
      pointer-events:auto; touch-action:manipulation; -webkit-tap-highlight-color:transparent;
    }
    #le-sky-view .le-sun-live[aria-pressed="true"] { border-color:#ffdc9baa; color:#fff3d9; box-shadow:0 0 12px #f8a94745,inset 0 1px #fff3; }
    #le-sky-view .le-sun-live:before { content:""; display:inline-block; width:5px; height:5px; margin:0 6px 1px 0; border-radius:50%; background:#ffca70; box-shadow:0 0 7px #ffb84e; vertical-align:middle; }
    #le-sky-view .le-sun-live:focus-visible { outline:2px solid #ffe1ad; outline-offset:4px; }
    #le-sky-view .le-sun-live:active { transform:scale(.97); }
    @keyframes le-sun-dust-pulse { from { opacity:.22; } to { opacity:.88; } }
    @media (orientation:landscape) {
      #le-sky-view .le-sun-label { font-size:9px; letter-spacing:1.2px; }
      #le-sky-view .le-sun-event-time,#le-sky-view .le-sun-current-time { font-size:13px; }
      #le-sky-view .le-sun-live { min-width:64px; min-height:29px; }
    }
    @media (prefers-reduced-motion:reduce) {
      #le-sky-view .le-sun-ui,#le-sky-view .le-sun-dust { transition:none!important; animation:none!important; }
    }
  `;
  const style = document.createElement("style");
  style.id = "le-sun-arc-interface-style";
  style.textContent = css;
  document.head.appendChild(style);

  const ui = document.createElement("div");
  ui.className = "le-sun-ui";
  ui.setAttribute("aria-hidden", "true");
  ui.innerHTML = `
    <svg class="le-sun-svg" aria-label="Solar path and local sunrise-to-sunset time scroller" role="group">
      <defs>
        <linearGradient id="leSunArcGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#ffb95f" stop-opacity=".38"/>
          <stop offset="28%" stop-color="#ffcf87" stop-opacity=".92"/>
          <stop offset="52%" stop-color="#fff0ca"/>
          <stop offset="76%" stop-color="#ffd48d" stop-opacity=".94"/>
          <stop offset="100%" stop-color="#f5a64d" stop-opacity=".42"/>
        </linearGradient>
        <linearGradient id="leSunRailGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#f8c77f" stop-opacity=".58"/>
          <stop offset="50%" stop-color="#ffe4b1"/>
          <stop offset="100%" stop-color="#f2ad5b" stop-opacity=".62"/>
        </linearGradient>
        <radialGradient id="leSunDiscGradient" cx="32%" cy="25%" r="78%">
          <stop offset="0%" stop-color="#fff9db"/>
          <stop offset="42%" stop-color="#ffe29b"/>
          <stop offset="76%" stop-color="#ffad42"/>
          <stop offset="100%" stop-color="#e87522"/>
        </radialGradient>
        <radialGradient id="leSunGlowGradient">
          <stop offset="0%" stop-color="#ffd98c" stop-opacity=".50"/>
          <stop offset="62%" stop-color="#ffb653" stop-opacity=".18"/>
          <stop offset="100%" stop-color="#ff9e36" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <path class="le-sun-arc-halo" id="le-sun-arc-halo"/>
      <path class="le-sun-arc" id="le-sun-arc"/>
      <path class="le-sun-hit" id="le-sun-arc-hit" tabindex="0" role="slider" aria-label="Select a time along the Sun's arc" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/>
      <g id="le-sun-arc-dust"></g>
      <circle class="le-sun-endpoint-halo" id="le-sun-rise-halo" r="10"/>
      <circle class="le-sun-endpoint" id="le-sun-rise-dot" r="2.5"/>
      <circle class="le-sun-endpoint-halo" id="le-sun-set-halo" r="10"/>
      <circle class="le-sun-endpoint" id="le-sun-set-dot" r="2.5"/>
      <text class="le-sun-label" id="le-sun-rise-label"></text>
      <text class="le-sun-event-time" id="le-sun-rise-time"></text>
      <text class="le-sun-label" id="le-sun-set-label" text-anchor="end"></text>
      <text class="le-sun-event-time" id="le-sun-set-time" text-anchor="end"></text>
      <g id="le-sun-main">
        <circle class="le-sun-glow" r="48" fill="url(#leSunGlowGradient)"/>
        <g class="le-sun-rays">
          <path class="le-sun-ray" d="M0 -27 V-34 M0 27 V34 M-27 0 H-34 M27 0 H34 M-19.1 -19.1 L-24.2 -24.2 M19.1 19.1 L24.2 24.2 M19.1 -19.1 L24.2 -24.2 M-19.1 19.1 L-24.2 24.2"/>
        </g>
        <circle class="le-sun-disc" r="21"/>
        <ellipse class="le-sun-disc-glint" cx="-5.5" cy="-9" rx="7" ry="4" transform="rotate(-28 -5.5 -9)"/>
      </g>
      <path class="le-sun-rail" id="le-sun-rail"/>
      <path class="le-sun-hit" id="le-sun-rail-hit" tabindex="0" role="slider" aria-label="Scrub solar time" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/>
      <g id="le-sun-rail-ticks"></g>
      <g id="le-sun-rail-dust"></g>
      <circle id="le-sun-rail-marker-halo" r="13" fill="url(#leSunGlowGradient)"/>
      <circle id="le-sun-rail-marker" r="6.2" fill="url(#leSunDiscGradient)" stroke="#ffe3ae" stroke-width=".8"/>
      <text class="le-sun-current-time" id="le-sun-current-time"></text>
      <text class="le-sun-info" id="le-sun-info"></text>
      <text class="le-sun-hint" id="le-sun-hint"></text>
    </svg>
    <div class="le-sun-brand">LIVE <span>//</span> EARTH<span class="le-sun-subtitle">SUN VIEW</span></div>
    <button class="le-sun-live" type="button" aria-pressed="true" aria-label="Solar time is live. Tap to pause.">LIVE</button>`;
  root.appendChild(ui);

  const $ = selector => ui.querySelector(selector);
  const svg = $(".le-sun-svg");
  const arc = $("#le-sun-arc");
  const arcHalo = $("#le-sun-arc-halo");
  const rail = $("#le-sun-rail");
  const arcHit = $("#le-sun-arc-hit");
  const railHit = $("#le-sun-rail-hit");
  const sun = $("#le-sun-main");
  const railMarker = $("#le-sun-rail-marker-halo");
  const currentTimeText = $("#le-sun-current-time");
  const infoText = $("#le-sun-info");
  const hint = $("#le-sun-hint");
  const liveButton = $(".le-sun-live");
  const riseLabel = $("#le-sun-rise-label");
  const riseTime = $("#le-sun-rise-time");
  const setLabel = $("#le-sun-set-label");
  const setTime = $("#le-sun-set-time");

  let astronomyModule = null;
  let active = false;
  let enabled = false;
  let observer = null;
  let interval = null;
  let timer = 0;
  let selectedTime = Date.now();
  let progress = 0;
  let live = true;
  let dragging = null;
  let dragFrame = 0;
  let pendingDragPoint = null;
  let width = 0, height = 0;
  let latestLocalDay = "";
  let locationAttempt = null;
  let geometry = {};
  const pathMetrics = new WeakMap();
  const PATH_SAMPLE_STEPS = 240;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fmt = timestamp => new Intl.DateTimeFormat(undefined, { hour:"numeric", minute:"2-digit" }).format(new Date(timestamp));
  const isLocationEnabled = () => window.liveEarthGetLocationState?.() === true;

  function cachePath(path) {
    try {
      const length = path.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return;
      const points = new Array(PATH_SAMPLE_STEPS + 1);
      for (let i = 0; i <= PATH_SAMPLE_STEPS; i++) {
        const point = path.getPointAtLength(length * i / PATH_SAMPLE_STEPS);
        points[i] = { x:point.x, y:point.y };
      }
      pathMetrics.set(path, { length, steps:PATH_SAMPLE_STEPS, points });
    } catch (_) { /* Preserve the time control if SVG path metrics are unavailable. */ }
  }

  function pathPoint(path, amount) {
    const metrics = pathMetrics.get(path);
    if (!metrics) return { x:width * .5, y:height * .5 };
    const scaled = clamp(amount,0,1) * metrics.steps;
    const index = Math.min(metrics.steps - 1, Math.floor(scaled));
    const fraction = scaled - index;
    const a = metrics.points[index], b = metrics.points[Math.min(metrics.steps,index+1)];
    return { x:a.x + (b.x-a.x)*fraction, y:a.y + (b.y-a.y)*fraction };
  }

  function writePoint(id, point) {
    const element = $(id);
    element.setAttribute("cx", point.x.toFixed(2));
    element.setAttribute("cy", point.y.toFixed(2));
  }

  function addDust(group, path, count, phase) {
    group.replaceChildren();
    for (let i = 0; i < count; i++) {
      const point = pathPoint(path, (i + .5) / count);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", point.x.toFixed(2));
      circle.setAttribute("cy", point.y.toFixed(2));
      circle.setAttribute("r", (i % 7 === 0 ? 1.35 : i % 3 === 0 ? .95 : .58).toString());
      circle.setAttribute("class", "le-sun-dust");
      circle.style.animationDelay = `${((i * .37 + phase) % 4).toFixed(2)}s`;
      group.appendChild(circle);
    }
  }

  function buildGeometry() {
    width = Math.max(1, root.clientWidth || window.innerWidth || 1);
    height = Math.max(1, root.clientHeight || window.innerHeight || 1);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    const landscape = width > height;
    const x0 = width * (landscape ? .13 : .105);
    const x1 = width * (landscape ? .87 : .895);
    const arcY = height * (landscape ? .43 : .455);
    const arcControlY = height * .015;
    const railY = height * (landscape ? .665 : .715);
    const railAmp = Math.min(height * (landscape ? .045 : .031), landscape ? 24 : 27);
    const arcD = `M ${x0} ${arcY} Q ${width/2} ${arcControlY} ${x1} ${arcY}`;
    const railD = `M ${x0} ${railY} C ${x0+(x1-x0)*.24} ${railY-railAmp}, ${x0+(x1-x0)*.29} ${railY-railAmp}, ${width/2} ${railY} C ${x0+(x1-x0)*.71} ${railY+railAmp}, ${x0+(x1-x0)*.76} ${railY+railAmp}, ${x1} ${railY}`;
    arc.setAttribute("d",arcD); arcHalo.setAttribute("d",arcD); arcHit.setAttribute("d",arcD);
    rail.setAttribute("d",railD); railHit.setAttribute("d",railD);
    pathMetrics.delete(arc); pathMetrics.delete(rail);
    cachePath(arc); cachePath(rail);
    geometry = {x0,x1,arcY,railY,railAmp,landscape};
    writePoint("#le-sun-rise-halo",{x:x0,y:arcY});
    writePoint("#le-sun-rise-dot",{x:x0,y:arcY});
    writePoint("#le-sun-set-halo",{x:x1,y:arcY});
    writePoint("#le-sun-set-dot",{x:x1,y:arcY});
    const labelInset = Math.min(48,width*.15);
    riseLabel.setAttribute("x",x0+labelInset); riseLabel.setAttribute("y",arcY+23);
    riseLabel.setAttribute("text-anchor","start"); riseLabel.textContent="SUNRISE";
    riseTime.setAttribute("x",x0+labelInset); riseTime.setAttribute("y",arcY+42);
    riseTime.setAttribute("text-anchor","start");
    setLabel.setAttribute("x",x1-labelInset); setLabel.setAttribute("y",arcY+23);
    setLabel.setAttribute("text-anchor","end"); setLabel.textContent="SUNSET";
    setTime.setAttribute("x",x1-labelInset); setTime.setAttribute("y",arcY+42);
    setTime.setAttribute("text-anchor","end");
    hint.setAttribute("x",width/2); hint.setAttribute("y",Math.min(height-82,railY+railAmp+30));
    infoText.setAttribute("x",width/2); infoText.setAttribute("y",Math.min(height-103,railY+railAmp+13));
    addDust($("#le-sun-arc-dust"),arc,landscape?34:46,.5);
    addDust($("#le-sun-rail-dust"),rail,landscape?22:30,1.3);
    const ticks=$("#le-sun-rail-ticks"); ticks.replaceChildren();
    for(let i=0;i<=24;i++){
      const p=pathPoint(rail,i/24);
      const line=document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1",p.x); line.setAttribute("x2",p.x);
      line.setAttribute("y1",p.y-(i%6===0?5:2.5)); line.setAttribute("y2",p.y+(i%6===0?5:2.5));
      line.setAttribute("class","le-sun-tick"); ticks.appendChild(line);
    }
    const pillX=width*(landscape?.80:.82), pillY=railY-railAmp-29;
    liveButton.style.left=`${clamp(pillX,8,width-82)}px`;
    liveButton.style.top=`${clamp(pillY,12,height-46)}px`;
    renderPosition();
  }

  function nearestProgress(path,clientX,clientY){
    const matrix=svg.getScreenCTM(),metrics=pathMetrics.get(path);
    if(!matrix||!metrics)return progress;
    const point=svg.createSVGPoint(); point.x=clientX; point.y=clientY;
    const local=point.matrixTransform(matrix.inverse());
    let bestIndex=0,bestDistance=Infinity;
    for(let i=0;i<metrics.points.length;i++){
      const p=metrics.points[i],dx=p.x-local.x,dy=p.y-local.y,d=dx*dx+dy*dy;
      if(d<bestDistance){bestDistance=d;bestIndex=i;}
    }
    return bestIndex/metrics.steps;
  }

  function updateLiveButton(){
    liveButton.setAttribute("aria-pressed",String(live));
    liveButton.setAttribute("aria-label",live?"Solar time is live. Tap to pause.":"Return solar time to live");
  }

  function setProgress(value){
    if(!interval)return;
    progress=clamp(value,0,1);
    selectedTime=interval.rise.getTime()+progress*(interval.set.getTime()-interval.rise.getTime());
    live=false; updateLiveButton(); renderPosition();
  }

  function renderPosition(){
    if(!arc||!rail||!width||!height)return;
    const mainPoint=pathPoint(arc,progress),railPoint=pathPoint(rail,progress);
    sun.setAttribute("transform",`translate(${mainPoint.x.toFixed(2)} ${mainPoint.y.toFixed(2)})`);
    writePoint("#le-sun-rail-marker-halo",railPoint);
    writePoint("#le-sun-rail-marker",railPoint);
    const anchor=progress>.70?"end":progress<.30?"start":"middle";
    const labelX=progress>.70?railPoint.x-17:progress<.30?railPoint.x+17:railPoint.x;
    currentTimeText.setAttribute("x",clamp(labelX,12,width-12));
    currentTimeText.setAttribute("y",railPoint.y-26);
    currentTimeText.setAttribute("text-anchor",anchor);
    currentTimeText.textContent=fmt(selectedTime);
    const value=String(Math.round(progress*100));
    [arcHit,railHit].forEach(hit=>hit.setAttribute("aria-valuenow",value));
    if(observer&&astronomyModule?.sunPosition){
      try{
        const position=astronomyModule.sunPosition(new Date(selectedTime),observer.latitude,observer.longitude);
        infoText.textContent=`ALT ${position.altitude.toFixed(1)}°  ·  AZ ${Math.round(position.azimuth)}°`;
      }catch(_){infoText.textContent="LOCAL SOLAR POSITION";}
    }else infoText.textContent="LOCAL SOLAR POSITION";
    updateLiveButton();
  }

  function showUnavailable(message){
    interval=null; riseTime.textContent="—"; setTime.textContent="—";
    hint.textContent=message; infoText.textContent="";
    selectedTime=Date.now(); progress=0; renderPosition();
  }

  async function loadAstronomy(){
    if(astronomyModule)return astronomyModule;
    astronomyModule=await import(astronomyUrl);
    if(typeof astronomyModule.calculateAstronomy!=="function"||typeof astronomyModule.sunPosition!=="function"){
      throw new Error("Solar calculations are unavailable in astronomy.js");
    }
    return astronomyModule;
  }

  function setSolarDay(result,now=Date.now(),preserveSelection=false){
    const sunrise=result?.sun?.sunrise, sunset=result?.sun?.sunset;
    if(!sunrise||!sunset){
      interval=null;
      const polar=result?.sun?.polar;
      showUnavailable(polar==="midnight sun"?"MIDNIGHT SUN · NO DAILY SUNRISE OR SUNSET":"POLAR NIGHT · SUN BELOW THE HORIZON");
      return;
    }
    const rise=new Date(sunrise),set=new Date(sunset);
    if(!Number.isFinite(rise.getTime())||!Number.isFinite(set.getTime())||set<=rise){
      showUnavailable("LOCAL SUNRISE AND SUNSET UNAVAILABLE"); return;
    }
    interval={rise,set};
    riseTime.textContent=fmt(rise.getTime()); setTime.textContent=fmt(set.getTime());
    hint.textContent="DRAG THE SUN ARC TO EXPLORE LOCAL SOLAR TIME";
    const target=preserveSelection&&!live?selectedTime:now;
    selectedTime=clamp(target,rise.getTime(),set.getTime());
    progress=(selectedTime-rise.getTime())/(set.getTime()-rise.getTime());
    latestLocalDay=result.date||"";
    renderPosition();
  }

  async function refreshSolarDay(now=Date.now(),preserveSelection=false){
    if(!active||!observer||!isLocationEnabled())return;
    try{
      const astronomy=await loadAstronomy();
      if(!active||!observer||!isLocationEnabled())return;
      const result=astronomy.calculateAstronomy(observer.latitude,observer.longitude,new Date(now));
      setSolarDay(result,now,preserveSelection);
    }catch(error){showUnavailable("LOCAL SOLAR TIMES UNAVAILABLE");console.info("[LIVE // EARTH] Solar time calculation unavailable.",error?.message||error);}
  }

  async function refreshObserverLocation(){
    enabled=isLocationEnabled();
    if(!enabled){observer=null;interval=null;showUnavailable("LOCATION OFF · LOCAL SOLAR TIMES HIDDEN");return;}
    if(!active)return;
    if(locationAttempt)return locationAttempt;
    if(!navigator.geolocation){observer=null;showUnavailable("LOCAL LOCATION UNAVAILABLE");return;}
    locationAttempt=(async()=>{
      try{
        const astronomy=await loadAstronomy();
        const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{
          enableHighAccuracy:false,maximumAge:120000,timeout:10000
        }));
        if(!active||!isLocationEnabled())return;
        observer={latitude:position.coords.latitude,longitude:position.coords.longitude};
        const result=astronomy.calculateAstronomy(observer.latitude,observer.longitude,new Date());
        setSolarDay(result,Date.now());
      }catch(error){
        observer=null;
        if(!isLocationEnabled())showUnavailable("LOCATION OFF · LOCAL SOLAR TIMES HIDDEN");
        else showUnavailable("COULD NOT CALCULATE LOCAL SOLAR TIMES · CHECK LOCATION PERMISSION");
        console.info("[LIVE // EARTH] Solar local-time calculation unavailable.",error?.message||error);
      }finally{locationAttempt=null;}
    })();
    return locationAttempt;
  }

  function tick(){
    if(!active||!enabled||!observer||!interval)return;
    const now=Date.now();
    const today=astronomyModule?.dayKey?astronomyModule.dayKey(new Date(now)):`${new Date(now).getFullYear()}-${new Date(now).getMonth()+1}-${new Date(now).getDate()}`;
    if(today!==latestLocalDay){refreshSolarDay(now,true);return;}
    if(live){
      selectedTime=clamp(now,interval.rise.getTime(),interval.set.getTime());
      progress=(selectedTime-interval.rise.getTime())/(interval.set.getTime()-interval.rise.getTime());
      renderPosition();
    }
  }

  function activate(view){
    active=view==="sun";
    ui.setAttribute("aria-hidden",String(!active));
    if(!active){
      if(timer)window.clearInterval(timer); timer=0;
      if(dragFrame)window.cancelAnimationFrame(dragFrame); dragFrame=0;
      pendingDragPoint=null; dragging=null;
      return;
    }
    buildGeometry();
    enabled=isLocationEnabled();
    if(!enabled)showUnavailable("LOCATION OFF · LOCAL SOLAR TIMES HIDDEN");
    else refreshObserverLocation();
    if(!timer)timer=window.setInterval(tick,1000);
  }

  function beginDrag(event,path){
    if(!active||(event.button!==undefined&&event.button!==0)||!interval)return;
    dragging=path; live=false;
    setProgress(nearestProgress(path,event.clientX,event.clientY));
    try{svg.setPointerCapture(event.pointerId);}catch(_){}
    event.preventDefault();
  }
  function moveDrag(event){
    if(!dragging)return;
    pendingDragPoint={clientX:event.clientX,clientY:event.clientY};
    if(!dragFrame){dragFrame=window.requestAnimationFrame(()=>{
      dragFrame=0;const point=pendingDragPoint;pendingDragPoint=null;
      if(dragging&&point)setProgress(nearestProgress(dragging,point.clientX,point.clientY));
    });}
    event.preventDefault();
  }
  function endDrag(){
    if(dragFrame)window.cancelAnimationFrame(dragFrame);dragFrame=0;
    const point=pendingDragPoint;pendingDragPoint=null;
    if(dragging&&point)setProgress(nearestProgress(dragging,point.clientX,point.clientY));
    dragging=null;
  }

  [arcHit,railHit].forEach(path=>{
    path.addEventListener("pointerdown",event=>beginDrag(event,path),{passive:false});
    path.addEventListener("keydown",event=>{
      if(!interval)return;
      if(event.key==="ArrowLeft"||event.key==="ArrowDown"){setProgress(progress-.01);event.preventDefault();}
      else if(event.key==="ArrowRight"||event.key==="ArrowUp"){setProgress(progress+.01);event.preventDefault();}
      else if(event.key==="Home"){setProgress(0);event.preventDefault();}
      else if(event.key==="End"){setProgress(1);event.preventDefault();}
    });
  });
  svg.addEventListener("pointermove",moveDrag,{passive:false});
  svg.addEventListener("pointerup",endDrag);
  svg.addEventListener("pointercancel",endDrag);
  svg.addEventListener("lostpointercapture",endDrag);
  liveButton.addEventListener("click",()=>{
    if(!interval){if(isLocationEnabled())refreshObserverLocation();return;}
    live=true;tick();updateLiveButton();
  });
  liveButton.addEventListener("pointerdown",event=>event.stopPropagation());
  if(window.LiveEarthViewModules){
    window.LiveEarthViewModules.register("sun-procedural-renderer",{
      views:["sun"],activate:()=>activate("sun"),deactivate:()=>activate("home")
    });
  }else{
    window.addEventListener("live-earth-primary-view-change",event=>activate(event.detail?.view||"home"));
  }
  window.addEventListener("live-earth-location-state",event=>{
    const next=!!event.detail?.enabled&&isLocationEnabled();
    if(!next){enabled=false;observer=null;interval=null;if(active)showUnavailable("LOCATION OFF · LOCAL SOLAR TIMES HIDDEN");}
    else{enabled=true;if(active)refreshObserverLocation();}
  });
  window.addEventListener("live-earth-location-stop",()=>{
    enabled=false;observer=null;interval=null;
    if(active)showUnavailable("LOCATION OFF · LOCAL SOLAR TIMES HIDDEN");
  });
  window.addEventListener("resize",()=>{if(active)buildGeometry();},{passive:true});
  window.visualViewport?.addEventListener("resize",()=>{if(active)buildGeometry();},{passive:true});
  let resizeObserver=null;
  if(typeof ResizeObserver!=="undefined"){
    resizeObserver=new ResizeObserver(()=>{if(active)buildGeometry();});
    resizeObserver.observe(root);
  }
  window.addEventListener("pagehide",()=>{
    if(timer)window.clearInterval(timer);timer=0;
    if(dragFrame)window.cancelAnimationFrame(dragFrame);dragFrame=0;
    resizeObserver?.disconnect();
  },{once:true});

  buildGeometry();
  showUnavailable("LOCATION OFF · LOCAL SOLAR TIMES HIDDEN");
  if(window.LiveEarthViewManager?.getActiveView?.()==="sun")activate("sun");

  window.__liveEarthSunViewInstalled=true;
  window.__liveEarthSunRendererInstalled=true;
  window.__liveEarthSunViewBooting=false;
  window.dispatchEvent(new Event("live-earth-sun-view-ready"));
})();
