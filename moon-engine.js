/* LIVE // EARTH — Global Moon Engine (standalone engine + bridge API).
 * The engine owns the lunar surface, illumination, spin and orbital model.
 * Its preview includes a small reference Earth; it is not connected to Home or Moon View.
 */
(() => {
  'use strict';
  const engines = window.LiveEarthCelestialEngines || (window.LiveEarthCelestialEngines = {});
  if (engines.moon) return;

  const THREE_URL = new URL('./vendor/three.module.js', document.baseURI).href;
  const SYNODIC_MONTH_DAYS = 29.530588853;
  const SIDEREAL_MONTH_DAYS = 27.321661;
  const PREVIEW_RATE = SYNODIC_MONTH_DAYS * 86400000 / 120000;
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  let sharedInstance = null;

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  }

  function makeMoonTexture(T) {
    const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const base = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    base.addColorStop(0,'#a6a49d'); base.addColorStop(.48,'#888780'); base.addColorStop(1,'#a09e97');
    ctx.fillStyle=base; ctx.fillRect(0,0,canvas.width,canvas.height);
    const rand=seededRandom(0x4d4f4f4e);
    // Broad lunar maria: layered, softly edged dark plains in an equirectangular map.
    const maria=[
      [.22,.36,.085,.115],[.31,.47,.055,.08],[.40,.31,.07,.095],[.49,.47,.09,.10],
      [.61,.36,.065,.085],[.72,.48,.08,.11],[.82,.31,.052,.08],[.91,.49,.045,.07],
      [.13,.60,.06,.075],[.56,.67,.07,.085],[.77,.72,.045,.06]
    ];
    maria.forEach(([x,y,rx,ry])=>{
      const px=x*canvas.width,py=y*canvas.height;
      const g=ctx.createRadialGradient(px,py,2,px,py,rx*canvas.width);
      g.addColorStop(0,'rgba(49,49,47,.42)');g.addColorStop(.66,'rgba(65,65,62,.22)');g.addColorStop(1,'rgba(70,70,67,0)');
      ctx.save();ctx.translate(px,py);ctx.scale(1,ry/rx);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx*canvas.width,0,Math.PI*2);ctx.fill();ctx.restore();
    });
    // Small mineral variation keeps the surface from looking like a flat grey disk.
    ctx.globalAlpha=.09;
    for(let i=0;i<18000;i++){
      const x=rand()*canvas.width,y=rand()*canvas.height,r=.4+rand()*2.0;
      ctx.fillStyle=rand()>.5?'#f0eee5':'#30302e';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Craters use a bright raised rim and a shadowed interior; sizes vary by order of magnitude.
    for(let i=0;i<1250;i++){
      const x=rand()*canvas.width,y=rand()*canvas.height;
      const radius=1.4+Math.pow(rand(),2.2)*24;
      const g=ctx.createRadialGradient(x-radius*.18,y-radius*.22,radius*.08,x,y,radius);
      g.addColorStop(0,'rgba(39,39,37,.50)');g.addColorStop(.58,'rgba(64,64,61,.28)');
      g.addColorStop(.79,'rgba(222,219,209,.23)');g.addColorStop(1,'rgba(236,233,224,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
    }
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.anisotropy=4;
    return texture;
  }

  function lunarPosition(date) {
    const days=(date.getTime()-J2000)/86400000;
    const rad=Math.PI/180, a=2.35, e=.0549;
    const mean=(((115.3654+13.0649929509*days)%360)+360)%360*rad;
    let eccentric=mean;
    for(let i=0;i<10;i++) eccentric-=(eccentric-e*Math.sin(eccentric)-mean)/(1-e*Math.cos(eccentric));
    const x=a*(Math.cos(eccentric)-e), y=a*Math.sqrt(1-e*e)*Math.sin(eccentric);
    const node=125.08*rad, inclination=5.145*rad, periapsis=318.15*rad;
    const px=x*Math.cos(periapsis)-y*Math.sin(periapsis);
    const py=x*Math.sin(periapsis)+y*Math.cos(periapsis);
    const X=Math.cos(node)*px-Math.sin(node)*py*Math.cos(inclination);
    const Y=Math.sin(node)*px+Math.cos(node)*py*Math.cos(inclination);
    const Z=py*Math.sin(inclination);
    return { x:X, y:Z, z:Y, daysFromJ2000:days, meanAnomaly:mean };
  }

  function phaseName(illumination, waxing) {
    if(illumination<.035) return 'New Moon';
    if(illumination>.965) return 'Full Moon';
    if(illumination<.48) return waxing?'Waxing Crescent':'Waning Crescent';
    return waxing?'Waxing Gibbous':'Waning Gibbous';
  }

  async function makeInstance(container, options = {}) {
    if (!container || !container.appendChild) throw new TypeError('Moon Engine needs a container element.');
    const T=await import(THREE_URL);
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.domElement.className='le-celestial-engine-canvas';renderer.domElement.setAttribute('aria-label','Interactive three-dimensional Moon and orbit preview');
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab;';container.appendChild(renderer.domElement);
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(39,1,.1,50);camera.position.set(0,1.05,6.25);
    const rig=new T.Group();scene.add(rig);
    const orbitGeometry=new T.RingGeometry(2.16,2.18,192);const orbitMaterial=new T.MeshBasicMaterial({color:0x7592b8,transparent:true,opacity:.34,side:T.DoubleSide});
    const orbit=new T.Mesh(orbitGeometry,orbitMaterial);orbit.rotation.x=Math.PI/2;rig.add(orbit);
    const earthGeometry=new T.SphereGeometry(.22,48,32);const earthMaterial=new T.MeshPhongMaterial({color:0x226ca0,emissive:0x06192c,shininess:18});
    const earthReference=new T.Mesh(earthGeometry,earthMaterial);rig.add(earthReference);
    const moonGeometry=new T.SphereGeometry(.72,96,64);const moonTexture=makeMoonTexture(T);
    const moonMaterial=new T.MeshStandardMaterial({map:moonTexture,roughness:.98,metalness:0});
    const moon=new T.Mesh(moonGeometry,moonMaterial);rig.add(moon);
    const ambient=new T.HemisphereLight(0xb8c9df,0x141923,.28);scene.add(ambient);
    const sunlight=new T.DirectionalLight(0xfff2dc,2.25);sunlight.position.set(5,2.2,4);scene.add(sunlight);
    const faintFill=new T.DirectionalLight(0x526d94,.12);faintFill.position.set(-4,-1,-3);scene.add(faintFill);

    let simDate=options.date instanceof Date?new Date(options.date):new Date();
    let speed=Number.isFinite(options.speed)?Math.max(0,options.speed):1;
    const timeScale=options.preview===false?1:PREVIEW_RATE;
    let paused=options.paused===true,disposed=false,raf=0,previous=0,resizeObserver=null;
    let width=1,height=1,latest={},activeContainer=container;
    const resize=()=>{if(disposed)return;const r=activeContainer.getBoundingClientRect();width=Math.max(1,Math.round(r.width||activeContainer.clientWidth||320));height=Math.max(1,Math.round(r.height||activeContainer.clientHeight||320));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};
    if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(activeContainer);}else window.addEventListener('resize',resize,{passive:true});resize();

    let dragging=false,lastX=0,lastY=0;
    const down=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.style.cursor='grabbing';renderer.domElement.setPointerCapture?.(e.pointerId);};
    const move=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;rig.rotation.y+=dx*.006;rig.rotation.x=Math.max(-.45,Math.min(.45,rig.rotation.x+dy*.004));};
    const up=()=>{dragging=false;renderer.domElement.style.cursor='grab';};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);

    function updateObjects(){
      const p=lunarPosition(simDate);moon.position.set(p.x,p.y,p.z);moon.lookAt(earthReference.position);
      const toEarth=new T.Vector3().subVectors(earthReference.position,moon.position).normalize();
      const toSun=sunlight.position.clone().sub(moon.position).normalize();
      const illumination=Math.max(0,Math.min(1,(1-toSun.dot(toEarth))*.5));
      const age=((simDate.getTime()-Date.UTC(2000,0,6,18,14))/86400000%SYNODIC_MONTH_DAYS+SYNODIC_MONTH_DAYS)%SYNODIC_MONTH_DAYS;
      const waxing=age<SYNODIC_MONTH_DAYS/2;
      latest={date:simDate.toISOString(),phase:phaseName(illumination,waxing),illumination,ageDays:age,orbitalPosition:{x:p.x,y:p.y,z:p.z},siderealMonthDays:SIDEREAL_MONTH_DAYS};
    }
    function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);if(document.hidden){previous=now;return;}const delta=previous?Math.min(80,now-previous):0;previous=now;if(!paused&&delta>0)simDate=new Date(simDate.getTime()+delta*timeScale*speed);updateObjects();renderer.render(scene,camera);}
    updateObjects();raf=requestAnimationFrame(frame);

    return {
      id:'moon',pause(){paused=true;},resume(){paused=false;},
      setSpeed(v){if(!Number.isFinite(v)||v<0)throw new RangeError('Speed must be zero or greater.');speed=v;},
      setDate(v){const d=v instanceof Date?v:new Date(v);if(!Number.isFinite(d.getTime()))throw new TypeError('A valid date is required.');simDate=d;updateObjects();},
      reset(){simDate=new Date();speed=1;paused=false;rig.rotation.set(0,0,0);updateObjects();},
      getState(){return Object.freeze({...latest,speed,paused});},
      getObject3D(){return rig;},
      attach(nextContainer){if(!nextContainer?.appendChild)throw new TypeError('A container element is required.');if(renderer.domElement.parentElement!==nextContainer)nextContainer.appendChild(renderer.domElement);resizeObserver?.unobserve(activeContainer);activeContainer=nextContainer;resizeObserver?.observe(activeContainer);resize();},
      destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.dispose();orbitGeometry.dispose();orbitMaterial.dispose();earthGeometry.dispose();earthMaterial.dispose();moonGeometry.dispose();moonTexture.dispose();moonMaterial.dispose();renderer.domElement.remove();}
    };
  }

  async function mountShared(container,options={}){if(!sharedInstance)sharedInstance=await makeInstance(container,{...options,preview:false});else sharedInstance.attach?.(container);return sharedInstance;}
  engines.moon=Object.freeze({
    id:'moon',name:'Moon Engine',version:'1.0.0',
    createPreview:(container,options={})=>makeInstance(container,{...options,preview:true}),
    mountShared,getShared:()=>sharedInstance,
    releaseShared:()=>{if(sharedInstance)sharedInstance.destroy();sharedInstance=null;}
  });
  window.dispatchEvent(new CustomEvent('live-earth-celestial-engine-ready',{detail:{engine:'moon'}}));
})();
