/* LIVE // EARTH — V58 dedicated Sun and Moon Sky Views.
   Lightweight location-based arc calculation; protected Home scene is not modified. */
(() => {
  "use strict";
  if (window.__liveEarthSkyViews) return;
  window.__liveEarthSkyViews = true;

  const css = `
  #le-sky-view{position:fixed;inset:0;z-index:8;overflow:hidden;color:#f3f7ff;background:#071323;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:pan-y}
  #le-sky-view[hidden]{display:none}
  #le-sky-view .le-sky-bg{position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,var(--sky-top) 0%,var(--sky-mid) 53%,var(--sky-low) 100%)}
  #le-sky-view .le-stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 12% 12%,#ffffffc9 98%,transparent),radial-gradient(1px 1px at 25% 22%,#ffffffa0 98%,transparent),radial-gradient(1px 1px at 72% 14%,#ffffffb0 98%,transparent),radial-gradient(1.5px 1.5px at 88% 28%,#ffffffaa 98%,transparent),radial-gradient(1px 1px at 53% 17%,#ffffff90 98%,transparent),radial-gradient(1px 1px at 40% 31%,#ffffff90 98%,transparent),radial-gradient(1px 1px at 8% 43%,#ffffff80 98%,transparent),radial-gradient(1px 1px at 93% 46%,#ffffff80 98%,transparent);opacity:var(--stars)}
  #le-sky-view .le-sky-haze{position:absolute;left:-20%;right:-20%;top:27%;height:35%;background:radial-gradient(ellipse, var(--haze) 0%, transparent 70%);filter:blur(20px)}
  #le-sky-view .le-mountain{position:absolute;left:-3%;right:-3%;bottom:23%;width:106%;height:30%;filter:drop-shadow(0 -9px 24px #0003)}
  #le-sky-view .le-mountain.back{bottom:22%;opacity:.78}
  #le-sky-view .le-water{position:absolute;bottom:0;height:27%;left:0;right:0;background:linear-gradient(180deg,var(--water-top),#020711 95%);overflow:hidden}
  #le-sky-view .le-water:before{content:"";position:absolute;left:25%;width:50%;top:0;height:75%;background:linear-gradient(180deg,var(--reflection),transparent);filter:blur(13px);opacity:.55}
  #le-sky-view .le-reflection{position:absolute;left:35%;width:30%;top:5%;height:80%;background:repeating-linear-gradient(180deg,var(--reflection) 0 1px,transparent 1px 9px);opacity:.3;mask-image:linear-gradient(180deg,#000,transparent)}
  #le-sky-view .le-head{position:absolute;z-index:2;top:calc(env(safe-area-inset-top) + 20px);left:22px;right:22px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  #le-sky-view .le-kicker{font-size:10px;letter-spacing:.24em;font-weight:750;opacity:.78}
  #le-sky-view .le-title{font-size:clamp(25px,6vw,37px);font-weight:650;letter-spacing:-.04em;margin-top:6px}
  #le-sky-view .le-subtitle{font-size:11px;opacity:.78;margin-top:5px;letter-spacing:.08em}
  #le-sky-view .le-close{width:42px;height:42px;border:1px solid #ffffff42;border-radius:50%;background:#ffffff16;color:white;font-size:23px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  #le-sky-view .le-position{position:absolute;inset:17% 8% 28%;z-index:1;pointer-events:none}
  #le-sky-view .le-position svg{width:100%;height:100%;overflow:visible}
  #le-sky-view .le-data{position:absolute;z-index:3;left:18px;right:18px;bottom:calc(env(safe-area-inset-bottom) + 94px);border:1px solid #ffffff25;border-radius:23px;background:linear-gradient(145deg,#ffffff24,#07111fc9 72%);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 12px 40px #0004;padding:15px}
  #le-sky-view .le-data-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
  #le-sky-view .le-event-label{font-size:9px;letter-spacing:.18em;opacity:.68;text-transform:uppercase}
  #le-sky-view .le-event-time{font-size:19px;font-weight:650;margin-top:4px}
  #le-sky-view .le-live{border:1px solid var(--accent);border-radius:999px;padding:9px 12px;background:color-mix(in srgb,var(--accent) 15%,transparent);color:#fff;font-size:10px;font-weight:800;letter-spacing:.13em}
  #le-sky-view .le-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:15px}
  #le-sky-view .le-metric{border-left:1px solid #ffffff25;padding-left:9px;min-width:0}
  #le-sky-view .le-metric:first-child{border-left:0;padding-left:0}
  #le-sky-view .le-metric small{display:block;font-size:9px;letter-spacing:.1em;opacity:.65;text-transform:uppercase}
  #le-sky-view .le-metric strong{display:block;font-size:13px;font-weight:650;margin-top:5px;white-space:nowrap}
  #le-sky-view .le-timeline{margin-top:16px}
  #le-sky-view .le-time-labels{display:flex;justify-content:space-between;font-size:10px;opacity:.8;margin-bottom:9px}
  #le-sky-view input[type=range]{display:block;width:100%;accent-color:var(--accent);height:22px;margin:0;touch-action:pan-x}
  #le-sky-view .le-time-current{text-align:center;font-size:12px;font-weight:650;margin-top:6px}
  #le-sky-view .le-footer{position:absolute;z-index:4;bottom:calc(env(safe-area-inset-bottom) + 22px);left:0;right:0;text-align:center;font-size:9px;letter-spacing:.18em;opacity:.58}
  #le-sky-view .le-error{font-size:10px;opacity:.72;margin-top:7px;line-height:1.4}
  @media(max-height:740px){#le-sky-view .le-position{inset:15% 8% 32%}#le-sky-view .le-data{bottom:calc(env(safe-area-inset-bottom) + 72px);padding:12px}#le-sky-view .le-metrics{margin-top:10px}#le-sky-view .le-timeline{margin-top:10px}#le-sky-view .le-footer{display:none}}
  `;
  const style=document.createElement("style"); style.textContent=css; document.head.appendChild(style);

  const root=document.createElement("section");
  root.id="le-sky-view"; root.hidden=true; root.setAttribute("aria-label","Sky View");
  root.innerHTML=`
    <div class="le-sky-bg">
      <div class="le-stars"></div><div class="le-sky-haze"></div>
      <svg class="le-mountain back" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden="true"><path d="M0 135 L42 70 L67 104 L112 26 L157 99 L204 52 L248 111 L293 41 L339 103 L371 65 L400 120 L400 180 L0 180Z" fill="var(--mount-back)"/></svg>
      <svg class="le-mountain" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100 L42 52 L82 92 L124 62 L165 110 L211 44 L256 97 L303 55 L351 100 L379 74 L400 91 L400 180 L0 180Z" fill="var(--mount-front)"/></svg>
      <div class="le-water"><div class="le-reflection"></div></div>
    </div>
    <header class="le-head"><div><div class="le-kicker">LIVE // EARTH · CELESTIAL OBSERVATORY</div><div class="le-title"></div><div class="le-subtitle"></div></div><button class="le-close" aria-label="Close Sky View">×</button></header>
    <div class="le-position"><svg viewBox="0 0 320 260" role="img" aria-label="Calculated celestial path"><path d="M14 230 Q160 -8 306 230" fill="none" stroke="#ffffff50" stroke-width="1.2" stroke-dasharray="4 6"/><path class="le-arc" d="" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/><path class="le-progress" d="" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round"/><circle class="le-body-halo" cx="160" cy="100" r="17" fill="var(--accent)" opacity=".22"/><circle class="le-body" cx="160" cy="100" r="8" fill="var(--accent)"/><text x="160" y="254" text-anchor="middle" fill="#ffffffa0" font-size="9" letter-spacing="2">NORTH-REFERENCED SKY ARC</text></svg></div>
    <div class="le-data"><div class="le-data-top"><div><div class="le-event-label"></div><div class="le-event-time"></div></div><button class="le-live" hidden>LIVE</button></div><div class="le-metrics"><div class="le-metric"><small>Altitude</small><strong data-metric="alt">—</strong></div><div class="le-metric"><small>Azimuth</small><strong data-metric="az">—</strong></div><div class="le-metric"><small>Location</small><strong data-metric="loc">Manual</strong></div></div><div class="le-timeline"><div class="le-time-labels"><span data-label="start">—</span><span data-label="end">—</span></div><input type="range" min="0" max="1439" step="5" value="720" aria-label="Select time along the sky arc"><div class="le-time-current"></div></div><div class="le-error"></div></div>
    <div class="le-footer">FIXED COMPASS · LOCATION-CALCULATED SKY</div>`;
  document.body.appendChild(root);

  const $=s=>root.querySelector(s);
  let active=null, preview=false, selectedMinute=0, timer=0, observer={lat:null,lon:null,label:"Location unavailable"}, arcCache=null, arcKey="", isDragging=false;
  const fmtTime=d=>d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  const dateKey=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  function getLocalCoordinates(date, lat, lon, ra, dec) {
    // Convert RA/declination to local hour angle, then to east/north/up.
    const jd=date.getTime()/86400000+2440587.5, T=(jd-2451545)/36525;
    let gmst=280.46061837+360.98564736629*(jd-2451545)+0.000387933*T*T-T*T*T/38710000;
    const lst=((gmst+lon)%360+360)%360*Math.PI/180;
    const H=lst-ra, p=lat*Math.PI/180;
    const east=-Math.cos(dec)*Math.sin(H);
    const north=Math.sin(dec)*Math.cos(p)-Math.cos(dec)*Math.cos(H)*Math.sin(p);
    const up=Math.sin(dec)*Math.sin(p)+Math.cos(dec)*Math.cos(H)*Math.cos(p);
    return {az:(Math.atan2(east,north)*180/Math.PI+360)%360,alt:Math.asin(Math.max(-1,Math.min(1,up)))*180/Math.PI};
  }
  function sunEquatorial(date) {
    const jd=date.getTime()/86400000+2440587.5,n=jd-2451545;
    const L=((280.460+0.9856474*n)%360+360)%360, g=((357.528+0.9856003*n)%360+360)%360*Math.PI/180;
    const lambda=(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*Math.PI/180;
    const eps=(23.439-0.0000004*n)*Math.PI/180;
    return {ra:Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda)),dec:Math.asin(Math.sin(eps)*Math.sin(lambda))};
  }
  function moonEquatorial(date) {
    // Lightweight low-precision lunar approximation; adequate for a visual path, not navigation.
    const jd=date.getTime()/86400000+2440587.5,d=jd-2451543.5;
    const N=(125.1228-0.0529538083*d)*Math.PI/180, i=5.1454*Math.PI/180;
    const w=(318.0634+0.1643573223*d)*Math.PI/180, a=60.2666, e=0.0549;
    const M=((115.3654+13.0649929509*d)%360+360)%360*Math.PI/180;
    let E=M+e*Math.sin(M)*(1+e*Math.cos(M));
    for(let k=0;k<3;k++) E-= (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
    const xv=a*(Math.cos(E)-e), yv=a*Math.sqrt(1-e*e)*Math.sin(E), v=Math.atan2(yv,xv), r=Math.hypot(xv,yv);
    const xh=r*(Math.cos(N)*Math.cos(v+w)-Math.sin(N)*Math.sin(v+w)*Math.cos(i));
    const yh=r*(Math.sin(N)*Math.cos(v+w)+Math.cos(N)*Math.sin(v+w)*Math.cos(i));
    const zh=r*Math.sin(v+w)*Math.sin(i);
    const lon=Math.atan2(yh,xh), lat=Math.atan2(zh,Math.hypot(xh,yh));
    const eps=23.4393*Math.PI/180;
    const x=Math.cos(lat)*Math.cos(lon), y=Math.cos(lat)*Math.sin(lon), z=Math.sin(lat);
    const ye=y*Math.cos(eps)-z*Math.sin(eps), ze=y*Math.sin(eps)+z*Math.cos(eps);
    return {ra:Math.atan2(ye,x),dec:Math.atan2(ze,Math.hypot(x,ye))};
  }
  function bodyCoords(date,view) {
    const eq=view==="sun"?sunEquatorial(date):moonEquatorial(date);
    return getLocalCoordinates(date,observer.lat,observer.lon,eq.ra,eq.dec);
  }
  function arcFor(date,view) {
    const key=`${view}|${dateKey(date)}|${observer.lat}|${observer.lon}`;
    if(key===arcKey && arcCache) return arcCache;
    const start=new Date(date); start.setHours(0,0,0,0);
    const points=[];
    for(let minute=0;minute<=1440;minute+=10){
      const t=new Date(start.getTime()+minute*60000), c=bodyCoords(t,view);
      points.push({minute,alt:c.alt,az:c.az,visible:c.alt>=0});
    }
    arcKey=key; arcCache=points; return points;
  }
  function project(p) {
    // Fixed north-referenced compass projection. East/west determine horizontal position;
    // altitude determines height. The display is an illustrative sky dome, not a camera view.
    const x=160+Math.sin(p.az*Math.PI/180)*132*Math.cos(p.alt*Math.PI/180);
    const y=220-(Math.max(-10,Math.min(90,p.alt))+10)/100*195;
    return {x,y};
  }
  function pathFrom(points) {
    let d="",pen=false;
    for(const p of points){
      if(!p.visible){pen=false;continue}
      const q=project(p); d+=(pen?" L":" M")+q.x.toFixed(1)+" "+q.y.toFixed(1); pen=true;
    }
    return d;
  }
  function nearestEvents(date,view) {
    const points=arcFor(date,view);
    const crossings=[];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if((a.alt<0&&b.alt>=0)||(a.alt>=0&&b.alt<0)){
        const frac=Math.abs(a.alt)/(Math.abs(a.alt)+Math.abs(b.alt));
        crossings.push({minute:a.minute+(b.minute-a.minute)*frac,rise:b.alt>a.alt});
      }
    }
    const nowMinute=date.getHours()*60+date.getMinutes();
    let rise=crossings.find(e=>e.rise&&e.minute>nowMinute);
    let set=crossings.find(e=>!e.rise&&e.minute>nowMinute);
    if(!rise) rise=crossings.find(e=>e.rise);
    if(!set) set=crossings.find(e=>!e.rise);
    return {rise,set};
  }
  function getLocation() {
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos=>{
      observer={lat:pos.coords.latitude,lon:pos.coords.longitude,label:`${Math.abs(pos.coords.latitude).toFixed(1)}°${pos.coords.latitude>=0?"N":"S"} · ${Math.abs(pos.coords.longitude).toFixed(1)}°${pos.coords.longitude>=0?"E":"W"}`};
      arcKey=""; if(active) render();
    },()=>{}, {enableHighAccuracy:false,maximumAge:300000,timeout:4000});
  }
  function setTheme(view) {
    if(view==="sun"){
      root.style.setProperty("--sky-top","#101e39");root.style.setProperty("--sky-mid","#b87553");root.style.setProperty("--sky-low","#f0b76b");
      root.style.setProperty("--haze","#ffc47755");root.style.setProperty("--mount-back","#374253");root.style.setProperty("--mount-front","#172433");
      root.style.setProperty("--water-top","#202b3c");root.style.setProperty("--reflection","#ffd18a");root.style.setProperty("--accent","#ffca71");root.style.setProperty("--stars",".24");
    } else {
      root.style.setProperty("--sky-top","#020914");root.style.setProperty("--sky-mid","#102b4a");root.style.setProperty("--sky-low","#294762");
      root.style.setProperty("--haze","#8bc7ff30");root.style.setProperty("--mount-back","#24374c");root.style.setProperty("--mount-front","#0a1726");
      root.style.setProperty("--water-top","#10283c");root.style.setProperty("--reflection","#9dcfff");root.style.setProperty("--accent","#a9d9ff");root.style.setProperty("--stars",".9");
    }
  }
  function render() {
    if(!active) return;
    const now=new Date(), base=new Date(now);
    if(preview){base.setHours(0,0,0,0);base.setMinutes(selectedMinute);}
    const pts=arcFor(base,active), arc=$(".le-arc");
    arc.setAttribute("d",pathFrom(pts));
    const chosen=bodyCoords(base,active), pp=project({...chosen,visible:true});
    $(".le-body").setAttribute("cx",pp.x);$(".le-body").setAttribute("cy",pp.y);
    $(".le-body-halo").setAttribute("cx",pp.x);$(".le-body-halo").setAttribute("cy",pp.y);
    const prog=pts.filter(p=>p.minute<=(preview?selectedMinute:now.getHours()*60+now.getMinutes()));
    $(".le-progress").setAttribute("d",pathFrom(prog));
    $("[data-metric=alt]").textContent=`${chosen.alt.toFixed(1)}°`;
    $("[data-metric=az]").textContent=`${Math.round(chosen.az)}°`;
    $("[data-metric=loc]").textContent=observer.label;
    $(".le-event-label").textContent=active==="sun"?"NEXT SOLAR EVENT":"NEXT LUNAR EVENT";
    const events=nearestEvents(now,active), ev=events.rise||events.set;
    $(".le-event-time").textContent=ev?`${ev.rise?"Rise":"Set"} · ${fmtTime(new Date(new Date(now).setHours(0,0,0,0).getTime()+ev.minute*60000))}`:"No horizon crossing today";
    $(".le-time-current").textContent=(preview?"PREVIEW · ":"LIVE · ")+fmtTime(base);
    $(".le-live").hidden=!preview;
    $(".le-error").textContent=observer.lat===null?"Location unavailable — allow location for a personalized arc. This view currently shows a placeholder arc until coordinates are available.":"Arc calculated for "+observer.label+".";
    $(".le-position").setAttribute("aria-label",`${active==="sun"?"Sun":"Moon"} at altitude ${chosen.alt.toFixed(1)} degrees and azimuth ${Math.round(chosen.az)} degrees`);
    const slider=$('input[type=range]');
    if(!isDragging) slider.value=String(preview?selectedMinute:now.getHours()*60+now.getMinutes());
    slider.min="0";slider.max="1439";slider.step="5";
    $("[data-label=start]").textContent=active==="sun"?"SUNRISE":"MOONRISE";
    $("[data-label=end]").textContent=active==="sun"?"SUNSET":"MOONSET";
    if(observer.lat===null){
      // Do not imply a personalized physical path without a location.
      $(".le-body").setAttribute("opacity",".45");
    } else $(".le-body").removeAttribute("opacity");
  }
  function open(view) {
    if(view!=="sun"&&view!=="moon") return;
    active=view; preview=false; selectedMinute=new Date().getHours()*60+new Date().getMinutes();
    setTheme(view);
    $(".le-title").textContent=view==="sun"?"Sun Sky View":"Moon Sky View";
    $(".le-subtitle").textContent=view==="sun"?"SOLAR PATH · LOCAL HORIZON":"LUNAR PATH · LOCAL HORIZON";
    $(".le-close").onclick=close;
    $(".le-live").onclick=()=>{preview=false;arcKey="";render()};
    root.hidden=false;
    document.body.style.overflow="hidden";
    getLocation(); render();
    if(timer) clearInterval(timer);
    timer=setInterval(()=>{if(active&&!preview)render()},60000);
    window.dispatchEvent(new CustomEvent("live-earth-sky-view",{detail:{active:view}}));
  }
  function close() {
    if(!active)return;
    const closed=active; active=null; preview=false;
    if(timer)clearInterval(timer);timer=0;
    root.hidden=true;document.body.style.overflow="";
    window.dispatchEvent(new CustomEvent("live-earth-sky-view",{detail:{active:null,closed}}));
  }
  root.querySelector(".le-close").addEventListener("click",close);
  const slider=$('input[type=range]');
  slider.addEventListener("pointerdown",()=>{isDragging=true;});
  slider.addEventListener("input",()=>{if(!active)return;preview=true;selectedMinute=Number(slider.value);render();});
  ["pointerup","change","pointercancel"].forEach(type=>slider.addEventListener(type,()=>{isDragging=false;if(active)render()}));
  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target:null;
    const button=target?.closest('.orbButton[data-view]');
    if(!button)return;
    const id=button.dataset.view;
    if(id==="sun"||id==="moon"){
      event.preventDefault();event.stopImmediatePropagation();
      if(active===id) close(); else open(id);
      return;
    }
    if(id==="earth"&&active){
      close();
    }
  },true);
  window.addEventListener("live-earth-location-state",e=>{if(e.detail?.enabled){getLocation()}});
  window.LiveEarthSkyViews=Object.freeze({open,close,isOpen:()=>!!active,getActive:()=>active});
})();
