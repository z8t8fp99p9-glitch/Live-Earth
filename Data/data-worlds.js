/* LIVE // EARTH — Six numerical discovery worlds.
   Visual-first feature layer. Uses the existing Stacks registry, stage and dock.
   No imagery feeds, fabricated measurements or speculative event claims. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Data Worlds waiting for the shared feature runtime.');
    return;
  }
  if (window.__liveEarthDataWorldsRegistered) return;
  window.__liveEarthDataWorldsRegistered = true;

  const WORLDS = [
    { id:'atmosphere', title:'Atmosphere', symbol:'◉', subtitle:'The moving skin of our planet', accent:'#73dfff', rgb:[76,207,255], mode:'air',
      intro:'Pressure, heat, moisture and wind — interacting as one living system.',
      signals:['Temperature','Pressure','Wind fields','Humidity','Water vapour','Cloud fraction','CO₂','Methane','Ozone','Carbon monoxide','Aerosols','Jet stream'] },
    { id:'oceans', title:'Oceans', symbol:'≈', subtitle:'A planet in constant motion', accent:'#48e5d2', rgb:[48,220,205], mode:'water',
      intro:'Currents, heat and chemistry reveal the changing pulse of the blue planet.',
      signals:['Sea temperature','Currents','Salinity','Sea level','Wave height','Chlorophyll','Ocean heat','Marine productivity','Sea ice'] },
    { id:'land', title:'Land', symbol:'⌁', subtitle:'The living surface beneath us', accent:'#a9e88c', rgb:[132,218,112], mode:'land',
      intro:'Soil, terrain and vegetation form a changing portrait of the continents.',
      signals:['Land temperature','Soil moisture','Soil properties','Elevation','Land cover','Vegetation health','Forest change','Surface reflectance','Urban expansion'] },
    { id:'water-ice', title:'Water & Ice', symbol:'❄', subtitle:'The planet’s freshwater memory', accent:'#a9d9ff', rgb:[126,190,255], mode:'ice',
      intro:'Rain, snow, glaciers and groundwater connect the atmosphere to the land.',
      signals:['Rainfall','Snow cover','Glaciers','Ice sheets','Groundwater','Surface water','Flood extent','Evapotranspiration','Water storage'] },
    { id:'earth-activity', title:'Earth Activity', symbol:'✧', subtitle:'A restless and dynamic world', accent:'#ffb16d', rgb:[255,137,74], mode:'fire',
      intro:'Geophysical and environmental events, observed through measured signals.',
      signals:['Wildfires','Earthquakes','Volcanoes','Cyclones','Dust storms','Landslides','Algal blooms','Lightning'] },
    { id:'energy-humanity', title:'Energy & Humanity', symbol:'✺', subtitle:'Our footprint on a changing Earth', accent:'#ffd77d', rgb:[255,194,83], mode:'light',
      intro:'Radiation, night lights and human activity connect people with planetary systems.',
      signals:['Solar radiation','Earth albedo','Outgoing radiation','Night lights','Population','Land use','Energy indicators'] }
  ];

  const css = document.createElement('style');
  css.id = 'le-data-worlds-style';
  css.textContent = `
    .le-sfv.le-data-world{--dw-accent:#73dfff;--dw-rgb:76,207,255}
    .le-data-world .le-sfv-panel{padding:0!important;overflow:hidden!important;background:#020811!important;backdrop-filter:none!important}
    .le-data-world .le-sfv-head,.le-data-world .le-sfv-pill{display:none!important}
    .le-data-world .le-dw-scene{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 38%,rgba(var(--dw-rgb),.18),transparent 48%),linear-gradient(180deg,#071725,#020711 72%)}
    .le-data-world .le-dw-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.98}
    .le-data-world .le-dw-vignette{position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,7,15,.20),transparent 27%,rgba(2,7,15,.12) 58%,#020711 100%),radial-gradient(ellipse at 50% 42%,transparent 30%,rgba(0,4,12,.5) 100%);pointer-events:none}
    .le-data-world .le-dw-top{position:absolute;z-index:2;top:calc(env(safe-area-inset-top) + 24px);left:clamp(20px,5vw,46px);right:clamp(20px,5vw,46px);display:flex;align-items:center;justify-content:space-between;gap:16px}
    .le-data-world .le-dw-kicker{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:rgba(220,241,255,.66)}
    .le-data-world .le-dw-index{font-size:10px;letter-spacing:.18em;color:var(--dw-accent)}
    .le-data-world .le-dw-hero{position:absolute;z-index:2;top:clamp(104px,18vh,170px);left:clamp(22px,7vw,72px);right:clamp(22px,7vw,72px);text-align:center;pointer-events:none}
    .le-data-world .le-dw-symbol{font-size:clamp(30px,7vw,54px);line-height:1;color:var(--dw-accent);text-shadow:0 0 28px rgba(var(--dw-rgb),.55);margin-bottom:15px}
    .le-data-world .le-dw-title{margin:0;color:#f2f8ff;font-size:clamp(30px,8vw,58px);font-weight:650;letter-spacing:-.055em;line-height:1.02;text-shadow:0 8px 36px #000}
    .le-data-world .le-dw-subtitle{margin:12px 0 0;color:rgba(218,237,249,.76);font-size:clamp(11px,2.7vw,14px);letter-spacing:.08em}
    .le-data-world .le-dw-orbit-label{position:absolute;z-index:2;left:50%;top:52%;transform:translate(-50%,-50%);white-space:nowrap;color:rgba(229,246,255,.55);font-size:9px;letter-spacing:.24em;text-transform:uppercase;pointer-events:none}
    .le-data-world .le-dw-bottom{position:absolute;z-index:3;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 104px);padding:0 clamp(18px,5vw,42px);display:grid;gap:13px}
    .le-data-world .le-dw-intro{max-width:560px;margin:0 auto;text-align:center;color:#d1e3ef;font-size:12px;line-height:1.55;text-shadow:0 2px 14px #000}
    .le-data-world .le-dw-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:8px}
    .le-data-world .le-dw-action{appearance:none;min-height:39px;padding:9px 15px;border-radius:999px;border:1px solid rgba(var(--dw-rgb),.34);background:rgba(5,19,31,.58);color:#eaf7ff;font:650 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);touch-action:manipulation}
    .le-data-world .le-dw-action[aria-pressed=true]{background:rgba(var(--dw-rgb),.19);border-color:var(--dw-accent);box-shadow:0 0 20px rgba(var(--dw-rgb),.16)}
    .le-data-world .le-dw-detail{position:absolute;z-index:4;left:clamp(18px,5vw,42px);right:clamp(18px,5vw,42px);top:calc(env(safe-area-inset-top) + 76px);max-height:calc(100% - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 220px);overflow:auto;padding:18px;border:1px solid rgba(var(--dw-rgb),.25);border-radius:22px;background:rgba(3,13,24,.78);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);color:#eaf7ff;display:none}
    .le-data-world .le-dw-detail.is-open{display:block;animation:dw-rise .28s ease both}
    .le-data-world .le-dw-detail h2{margin:0 0 8px;font-size:19px;font-weight:650;letter-spacing:-.025em}
    .le-data-world .le-dw-detail p{margin:0;color:#b6ccdc;font-size:11px;line-height:1.6}
    .le-data-world .le-dw-signal-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:14px}
    .le-data-world .le-dw-signal{padding:9px 7px;border:1px solid rgba(var(--dw-rgb),.16);border-radius:11px;background:rgba(var(--dw-rgb),.055);color:#dcecf7;text-align:center;font-size:9px;line-height:1.35}
    .le-data-world .le-dw-note{margin-top:13px!important;padding-top:12px;border-top:1px solid rgba(210,235,250,.12);font-size:10px!important;color:#8faabd!important}
    @keyframes dw-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @media(orientation:landscape){.le-data-world .le-dw-hero{top:clamp(76px,13vh,112px);left:32%;right:32%}.le-data-world .le-dw-symbol{font-size:28px;margin-bottom:8px}.le-data-world .le-dw-title{font-size:clamp(28px,5vw,48px)}.le-data-world .le-dw-subtitle{margin-top:7px}.le-data-world .le-dw-bottom{bottom:calc(env(safe-area-inset-bottom) + 72px)}.le-data-world .le-dw-detail{left:auto;right:22px;top:calc(env(safe-area-inset-top) + 66px);width:min(390px,42vw);max-height:calc(100% - 150px)}}
    @media(max-height:520px) and (orientation:landscape){.le-data-world .le-dw-hero{top:58px}.le-data-world .le-dw-symbol{display:none}.le-data-world .le-dw-title{font-size:30px}.le-data-world .le-dw-bottom{bottom:65px}.le-data-world .le-dw-intro{font-size:10px}}
    @media(prefers-reduced-motion:reduce){.le-data-world *{animation:none!important;transition:none!important}}
  `;
  // Give each library Orb its own material identity without changing shared Orb geometry.
  css.textContent += WORLDS.map(world => `
    .le-feature-library-item[data-feature="${world.id}"] .orbShell,
    .le-feature-orb[data-feature="${world.id}"] .orbShell{
      border:1px solid ${world.accent}88!important;
      background:radial-gradient(circle at 30% 22%,${world.accent}66,transparent 36%),radial-gradient(circle at 70% 78%,${world.accent}33,transparent 48%),linear-gradient(145deg,#193247,#030914 72%)!important;
      box-shadow:inset 1px 1px 4px #ffffff66,inset -4px -5px 9px #000b,0 0 20px ${world.accent}55,0 5px 12px #000b!important;
    }
    .le-feature-library-item[data-feature="${world.id}"] .le-feature-symbol,
    .le-feature-orb[data-feature="${world.id}"] .le-feature-symbol{
      color:${world.accent}!important;
      text-shadow:0 0 15px ${world.accent}aa,0 2px 5px #000!important;
    }
  `).join('');
  document.head.appendChild(css);

  function drawWorld(canvas, world, reduced) {
    const ctx = canvas.getContext('2d', { alpha:true });
    if (!ctx) return () => {};
    let raf=0, w=0, h=0, dpr=1, t=0, points=[];
    const [r,g,b]=world.rgb;
    const resize=()=>{
      const rect=canvas.getBoundingClientRect(); w=Math.max(1,rect.width);h=Math.max(1,rect.height);
      dpr=Math.min(window.devicePixelRatio||1,1.7);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=Math.min(170,Math.round(w*h/7000));
      points=Array.from({length:count},(_,i)=>({x:Math.random()*w,y:Math.random()*h,z:.3+Math.random()*.7,p:Math.random()*Math.PI*2,s:.5+Math.random()*1.7}));
    };
    const stroke=(x1,y1,x2,y2,a,width)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=`rgba(${r},${g},${b},${a})`;ctx.lineWidth=width;ctx.stroke()};
    function frame(){
      t+=.006;ctx.clearRect(0,0,w,h);
      const cx=w*.5,cy=h*.53,scale=Math.min(w,h)*.36;
      const glow=ctx.createRadialGradient(cx,cy,scale*.12,cx,cy,scale*1.55);
      glow.addColorStop(0,`rgba(${r},${g},${b},.13)`);glow.addColorStop(.48,`rgba(${r},${g},${b},.055)`);glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
      // Large, elegant orbital geometry: each world has a different motion language.
      ctx.save();ctx.translate(cx,cy);ctx.rotate(t*(world.mode==='fire'?.11:.035));
      ctx.setLineDash(world.mode==='ice'?[2,8]:world.mode==='water'?[1,7]:[]);
      for(let j=0;j<4;j++){
        ctx.beginPath();ctx.ellipse(0,0,scale*(.72+j*.19),scale*(.23+j*.09),j*.18,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${r},${g},${b},${.18-j*.027})`;ctx.lineWidth=j===0?1.2:.65;ctx.stroke();
      }
      ctx.setLineDash([]);ctx.restore();
      if(world.mode==='air'||world.mode==='water'||world.mode==='ice'){
        for(let k=0;k<8;k++){
          const yy=cy-scale*.55+k*scale*.16;
          ctx.beginPath();
          for(let x=0;x<=w;x+=8){const y=yy+Math.sin(x*.008+t*1.5+k)*scale*.11+Math.sin(x*.018-t+k*2)*scale*.035;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
          ctx.strokeStyle=`rgba(${r},${g},${b},${.055+k*.009})`;ctx.lineWidth=1.2+k*.16;ctx.stroke();
        }
      } else if(world.mode==='land'){
        for(let k=0;k<7;k++){ctx.beginPath();for(let x=0;x<=w;x+=7){const y=cy+scale*.25+k*10+Math.sin(x*.009+t+k)*scale*.09;if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=`rgba(${r},${g},${b},.10)`;ctx.lineWidth=1;ctx.stroke();}
      } else if(world.mode==='fire'){
        for(let k=0;k<18;k++){const a=t*.5+k*Math.PI/9,rr=scale*(.2+.65*((k%4)/4));const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a*1.7)*rr*.55;ctx.beginPath();ctx.arc(x,y,2+(k%3),0,Math.PI*2);ctx.fillStyle=`rgba(${r},${g},${b},.55)`;ctx.fill();}
      } else {
        for(let k=0;k<9;k++){const a=k*Math.PI*2/9+t*.2;const x=cx+Math.cos(a)*scale*.72,y=cy+Math.sin(a)*scale*.42;stroke(cx,cy,x,y,.15,.8);ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fillStyle=`rgba(${r},${g},${b},.65)`;ctx.fill();}
      }
      points.forEach(p=>{p.y-=p.s*(world.mode==='air'?1.2:.45);p.x+=Math.sin(t*2+p.p)*.22;if(p.y< -4)p.y=h+4;ctx.beginPath();ctx.arc(p.x,p.y,p.s*p.z,0,Math.PI*2);ctx.fillStyle=`rgba(${r},${g},${b},${.15+p.z*.42})`;ctx.fill();});
      // Fine luminous horizon arc.
      ctx.beginPath();ctx.ellipse(cx,cy+scale*.65,scale*1.3,scale*.19,0,Math.PI*1.05,Math.PI*1.95);ctx.strokeStyle=`rgba(${r},${g},${b},.24)`;ctx.lineWidth=1;ctx.stroke();
      if(!reduced)raf=requestAnimationFrame(frame);
    }
    resize();frame();
    const observer=new ResizeObserver(resize);observer.observe(canvas);
    return ()=>{cancelAnimationFrame(raf);observer.disconnect();};
  }

  function activate(world) {
    const view=runtime.mount(world.id);
    if(!view)return ()=>{};
    const {root,body}=view;
    root.classList.add('le-data-world');
    root.style.setProperty('--dw-accent',world.accent);
    root.style.setProperty('--dw-rgb',world.rgb.join(','));
    const panel=root.querySelector('.le-sfv-panel');
    panel.innerHTML=`
      <div class="le-dw-scene"><canvas class="le-dw-canvas" aria-hidden="true"></canvas><div class="le-dw-vignette"></div></div>
      <div class="le-dw-top"><span class="le-dw-kicker">LIVE // EARTH · PLANETARY INTELLIGENCE</span><span class="le-dw-index">WORLD ${String(WORLDS.indexOf(world)+1).padStart(2,'0')} / 06</span></div>
      <header class="le-dw-hero"><div class="le-dw-symbol" aria-hidden="true">${world.symbol}</div><h1 class="le-dw-title">${world.title}</h1><p class="le-dw-subtitle">${world.subtitle}</p></header>
      <div class="le-dw-orbit-label">NUMERICAL EARTH SYSTEMS</div>
      <section class="le-dw-detail" aria-live="polite"><h2></h2><p class="le-dw-detail-copy"></p><div class="le-dw-signal-grid"></div><p class="le-dw-note">Data connection is the next phase. No live measurements or events are being simulated or invented in this visual prototype.</p></section>
      <footer class="le-dw-bottom"><p class="le-dw-intro">${world.intro}</p><nav class="le-dw-actions" aria-label="${world.title} exploration">
        <button class="le-dw-action" data-tab="discover" aria-pressed="true">Discover</button>
        <button class="le-dw-action" data-tab="signals" aria-pressed="false">Signals</button>
        <button class="le-dw-action" data-tab="timeline" aria-pressed="false">Timeline</button>
        <button class="le-dw-action" data-tab="compare" aria-pressed="false">Compare</button>
      </nav></footer>`;
    const canvas=panel.querySelector('canvas');
    const stopDraw=drawWorld(canvas,world,window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const detail=panel.querySelector('.le-dw-detail');
    const heading=detail.querySelector('h2'),copy=detail.querySelector('.le-dw-detail-copy'),grid=detail.querySelector('.le-dw-signal-grid');
    const content={
      discover:['Discovery','A live event will appear here when verified numerical observations reveal a meaningful pattern.','No event is being presented until its source data, location, time window and confidence can be checked.'],
      signals:['Numerical signals',`This world is organised around ${world.signals.length} numerical signal families.`, 'Select a signal family in the next data-connection phase to inspect its units, source, spatial coverage and update cadence.'],
      timeline:['Evolution over time','Explore how a verified pattern develops, strengthens, weakens or resolves.','Timeline playback will be driven by timestamped observations — not decorative or fabricated values.'],
      compare:['Compare systems','Compare regions, time windows or related Earth systems using aligned numerical measurements.','Comparisons will expose units, missing data and uncertainty before drawing conclusions.']
    };
    function selectTab(tab){
      panel.querySelectorAll('[data-tab]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.tab===tab)));
      const item=content[tab];heading.textContent=item[0];copy.textContent=item[1];
      grid.replaceChildren();
      if(tab==='signals')world.signals.forEach(signal=>{const chip=document.createElement('div');chip.className='le-dw-signal';chip.textContent=signal;grid.appendChild(chip);});
      else {const chip=document.createElement('div');chip.className='le-dw-signal';chip.textContent=tab==='discover'?'VERIFIED EVENT FEED · NOT CONNECTED':tab==='timeline'?'TIME-SERIES PLAYBACK · NOT CONNECTED':'REGIONAL COMPARISON · NOT CONNECTED';grid.appendChild(chip);}
      detail.classList.add('is-open');
    }
    panel.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>selectTab(btn.dataset.tab)));
    selectTab('discover');
    return ()=>{stopDraw();};
  }

  WORLDS.forEach(world=>runtime.registerFeature(world.id,()=>activate(world),true));
  window.dispatchEvent(new CustomEvent('live-earth-data-worlds-ready',{detail:{count:WORLDS.length}}));
})();
