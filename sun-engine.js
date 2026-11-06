/* LIVE // EARTH — Global Sun Engine (standalone engine + bridge API).
 * Owns the solar surface renderer, rotation and reusable directional-light bridge.
 * This definition is independent of the existing dedicated Sun View renderer.
 */
(() => {
  'use strict';
  const engines=window.LiveEarthCelestialEngines||(window.LiveEarthCelestialEngines={});
  if(engines.sun)return;
  const THREE_URL=new URL('./vendor/three.module.js',document.baseURI).href;
  const SUN_TEXTURE_URL=new URL('./sun-surface-equirectangular.png',document.baseURI).href;
  const ROTATION_PERIOD_MS=25.38*86400000;
  const PREVIEW_RATE=ROTATION_PERIOD_MS/120000;
  let sharedInstance=null;

  function fallbackTexture(T){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
    const ctx=canvas.getContext('2d');const g=ctx.createLinearGradient(0,0,0,512);
    g.addColorStop(0,'#7f2a08');g.addColorStop(.35,'#f17b16');g.addColorStop(.7,'#ffbd45');g.addColorStop(1,'#9a300b');
    ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
    let seed=0x51a7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1700;i++){const x=rnd()*1024,y=rnd()*512,r=1+rnd()*12;const p=ctx.createRadialGradient(x,y,0,x,y,r);p.addColorStop(0,'rgba(255,244,175,.34)');p.addColorStop(1,'rgba(255,111,12,0)');ctx.fillStyle=p;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  function makeGlowTexture(T){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');
    const g=ctx.createRadialGradient(128,128,10,128,128,126);g.addColorStop(0,'rgba(255,246,210,.62)');g.addColorStop(.22,'rgba(255,176,67,.31)');g.addColorStop(.52,'rgba(255,105,28,.12)');g.addColorStop(1,'rgba(255,78,15,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,256,256);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;
  }

  async function makeInstance(container,options={}){
    if(!container||!container.appendChild)throw new TypeError('Sun Engine needs a container element.');
    const T=await import(THREE_URL);
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.domElement.className='le-celestial-engine-canvas';renderer.domElement.setAttribute('aria-label','Interactive three-dimensional Sun preview');renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab;';container.appendChild(renderer.domElement);
    const scene=new T.Scene();const camera=new T.PerspectiveCamera(38,1,.1,40);camera.position.set(0,0,3.3);
    const rig=new T.Group();scene.add(rig);
    const fallback=fallbackTexture(T);const geometry=new T.SphereGeometry(1,112,80);
    const material=new T.MeshBasicMaterial({map:fallback,color:0xffffff});const sun=new T.Mesh(geometry,material);rig.add(sun);
    const glowTexture=makeGlowTexture(T);const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:0xffb85d,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));glow.scale.set(4.2,4.2,1);rig.add(glow);
    const corona=new T.Mesh(new T.SphereGeometry(1.12,96,64),new T.ShaderMaterial({
      transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,
      vertexShader:'varying vec3 vN; varying vec3 vV; void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'varying vec3 vN; varying vec3 vV; void main(){float rim=pow(1.0-max(dot(normalize(vN),normalize(vV)),0.0),2.0);gl_FragColor=vec4(1.0,.37,.08,rim*.46);}'
    }));rig.add(corona);

    let simDate=options.date instanceof Date?new Date(options.date):new Date();let speed=Number.isFinite(options.speed)?Math.max(0,options.speed):1;
    const timeScale=options.preview===false?1:PREVIEW_RATE;let paused=options.paused===true,disposed=false,raf=0,previous=0,resizeObserver=null;
    let activeContainer=container;
    const resize=()=>{if(disposed)return;const r=activeContainer.getBoundingClientRect();const w=Math.max(1,Math.round(r.width||activeContainer.clientWidth||320)),h=Math.max(1,Math.round(r.height||activeContainer.clientHeight||320));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(activeContainer);}else window.addEventListener('resize',resize,{passive:true});resize();

    const loader=new T.TextureLoader();loader.load(SUN_TEXTURE_URL,texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());material.map?.dispose?.();material.map=texture;material.needsUpdate=true;fallback.dispose();options.onStatus?.('Solar surface texture loaded');},undefined,()=>{if(!disposed)options.onStatus?.('Using built-in solar surface fallback');});
    let dragging=false,lastX=0,lastY=0;const down=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.style.cursor='grabbing';renderer.domElement.setPointerCapture?.(e.pointerId);};
    const move=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;rig.rotation.y+=dx*.006;rig.rotation.x=Math.max(-.75,Math.min(.75,rig.rotation.x+dy*.004));};
    const up=()=>{dragging=false;renderer.domElement.style.cursor='grab';};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
    function frame(now){if(disposed)return;raf=requestAnimationFrame(frame);if(document.hidden){previous=now;return;}const delta=previous?Math.min(80,now-previous):0;previous=now;if(!paused&&delta>0)simDate=new Date(simDate.getTime()+delta*timeScale*speed);sun.rotation.y=((simDate.getTime()%ROTATION_PERIOD_MS)/ROTATION_PERIOD_MS)*Math.PI*2;renderer.render(scene,camera);}
    raf=requestAnimationFrame(frame);
    return {
      id:'sun',
      pause(){paused=true;},resume(){paused=false;},
      setSpeed(v){if(!Number.isFinite(v)||v<0)throw new RangeError('Speed must be zero or greater.');speed=v;},
      setDate(v){const d=v instanceof Date?v:new Date(v);if(!Number.isFinite(d.getTime()))throw new TypeError('A valid date is required.');simDate=d;},
      reset(){simDate=new Date();speed=1;paused=false;rig.rotation.set(0,0,0);},
      getState(){return Object.freeze({date:simDate.toISOString(),speed,paused,rotationPeriodDays:25.38,rotationRadians:sun.rotation.y});},
      getObject3D(){return rig;},
      attach(nextContainer){if(!nextContainer?.appendChild)throw new TypeError('A container element is required.');if(renderer.domElement.parentElement!==nextContainer)nextContainer.appendChild(renderer.domElement);resizeObserver?.unobserve(activeContainer);activeContainer=nextContainer;resizeObserver?.observe(activeContainer);resize();},
      destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.dispose();geometry.dispose();material.map?.dispose?.();material.dispose();fallback.dispose();glowTexture.dispose();glow.material.dispose();corona.geometry.dispose();corona.material.dispose();renderer.domElement.remove();}
    };
  }

  async function createDirectionalLight(scene,options={}){
    const T=await import(THREE_URL);if(!scene?.add)throw new TypeError('Sun lighting needs a Three.js scene.');
    const light=new T.DirectionalLight(options.color??0xfff4df,Number.isFinite(options.intensity)?options.intensity:2.2);
    const target=new T.Object3D();target.position.set(0,0,0);light.position.set(8,3,5);light.target=target;scene.add(target,light);
    return Object.freeze({light,target,setDirection(x,y,z){if([x,y,z].every(Number.isFinite))light.position.set(x,y,z);},setIntensity(value){if(Number.isFinite(value)&&value>=0)light.intensity=value;},dispose(){scene.remove(light,target);light.dispose?.();}});
  }
  async function mountShared(container,options={}){if(!sharedInstance)sharedInstance=await makeInstance(container,{...options,preview:false});else sharedInstance.attach(container);return sharedInstance;}
  engines.sun=Object.freeze({
    id:'sun',name:'Sun Engine',version:'1.0.0',
    createPreview:(container,options={})=>makeInstance(container,{...options,preview:true}),
    mountShared,getShared:()=>sharedInstance,
    createDirectionalLight,
    releaseShared:()=>{if(sharedInstance)sharedInstance.destroy();sharedInstance=null;}
  });
  window.dispatchEvent(new CustomEvent('live-earth-celestial-engine-ready',{detail:{engine:'sun'}}));
})();
