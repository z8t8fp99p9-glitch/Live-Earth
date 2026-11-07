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
  const MOON_SURFACE_URL = './runtime-assets/moon-surface-lroc-1536.jpg';
  const textureCaches = new WeakMap();
  const liveTextureEntries = new Set();
  let pageHideCleanupInstalled = false;

  function textureCacheFor(T) {
    let cache = textureCaches.get(T);
    if (!cache) {
      cache = new Map();
      textureCaches.set(T, cache);
    }
    return cache;
  }

  function disposeSharedTextures(event) {
    // A page entering the back/forward cache is still alive; keep its reusable
    // texture resources intact until the browser truly unloads the page.
    if (event?.persisted) return;
    for (const entry of liveTextureEntries) {
      if (entry.texture && !entry.disposed) {
        entry.texture.dispose?.();
        entry.texture.image?.close?.();
        entry.disposed = true;
      }
    }
    liveTextureEntries.clear();
  }

  async function loadMoonSurfaceTexture(T, url) {
    // This first-party image is included in the app shell and precached by sw.js.
    // A fresh installation therefore has the Moon surface available offline.
    const loader = new T.TextureLoader();
    return loader.loadAsync(url);
  }

  async function acquireMoonSurface(T, url = MOON_SURFACE_URL) {
    if (!T?.TextureLoader || !T?.Texture) throw new TypeError('Moon Engine needs a compatible Three.js namespace.');
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new TypeError('Moon surface URL must be an absolute HTTP(S) URL.');
    }
    const cache = textureCacheFor(T);
    let entry = cache.get(url);
    if (!entry) {
      entry = { url, texture: null, references: 0, disposed: false, promise: null };
      entry.promise = loadMoonSurfaceTexture(T, url).then(texture => {
        if (!texture) throw new Error('The NASA Moon surface image returned no texture.');
        texture.colorSpace = T.SRGBColorSpace ?? texture.colorSpace;
        texture.wrapS = T.ClampToEdgeWrapping ?? texture.wrapS;
        texture.anisotropy = 4;
        entry.texture = texture;
        return texture;
      }).catch(error => {
        cache.delete(url);
        liveTextureEntries.delete(entry);
        throw new Error('Could not load the NASA LROC Moon surface texture. Check the connection and image access, then retry. ' + (error?.message || error));
      });
      cache.set(url, entry);
      liveTextureEntries.add(entry);
    }
    const texture = await entry.promise;
    if (entry.disposed) throw new Error('The shared Moon surface texture has already been released. Reload the page before creating another Moon.');
    entry.references++;
    if (!pageHideCleanupInstalled) {
      window.addEventListener('pagehide', disposeSharedTextures);
      pageHideCleanupInstalled = true;
    }
    let released = false;
    return {
      texture,
      url,
      release() {
        if (released) return;
        released = true;
        entry.references = Math.max(0, entry.references - 1);
        // Keep the decoded source warm for the life of this page. Other views can
        // open later without another NASA download; final cleanup occurs on pagehide.
      }
    };
  }

  function finiteNumber(value, fallback, label) {
    if (value === undefined || value === null) return fallback;
    if (!Number.isFinite(value)) throw new TypeError(label + ' must be a finite number.');
    return value;
  }

  async function createMoonObject(T, options = {}) {
    const radius = finiteNumber(options.radius, 1, 'Moon radius');
    if (radius <= 0) throw new RangeError('Moon radius must be greater than zero.');
    const widthSegments = Math.max(8, Math.min(256, Math.floor(finiteNumber(options.widthSegments, 96, 'Width segments'))));
    const heightSegments = Math.max(6, Math.min(256, Math.floor(finiteNumber(options.heightSegments, 64, 'Height segments'))));
    const surface = await acquireMoonSurface(T, options.textureUrl || MOON_SURFACE_URL);
    let geometry = null, material = null, mesh = null;
    try {
      geometry = new T.SphereGeometry(radius, widthSegments, heightSegments);
      const extras = options.materialOptions && typeof options.materialOptions === 'object' ? options.materialOptions : {};
      const materialOptions = {
        ...extras,
        map: surface.texture,
        roughness: finiteNumber(options.roughness, extras.roughness ?? 0.98, 'Roughness'),
        metalness: finiteNumber(options.metalness, extras.metalness ?? 0, 'Metalness')
      };
      material = new T.MeshStandardMaterial(materialOptions);
      mesh = new T.Mesh(geometry, material);
    } catch (error) {
      geometry?.dispose?.();
      material?.dispose?.();
      surface.release();
      throw error;
    }
    try {
      mesh.castShadow = options.castShadow === true;
      mesh.receiveShadow = options.receiveShadow === true;
      if (options.position) {
        const p = options.position;
        mesh.position.set(finiteNumber(p.x ?? p[0], 0, 'X position'), finiteNumber(p.y ?? p[1], 0, 'Y position'), finiteNumber(p.z ?? p[2], 0, 'Z position'));
      }
      if (options.rotation) {
        const r = options.rotation;
        mesh.rotation.set(finiteNumber(r.x ?? r[0], 0, 'X rotation'), finiteNumber(r.y ?? r[1], 0, 'Y rotation'), finiteNumber(r.z ?? r[2], 0, 'Z rotation'));
      }
      if (options.scale !== undefined) {
        if (Number.isFinite(options.scale)) mesh.scale.setScalar(options.scale);
        else if (options.scale && typeof options.scale === 'object') {
          const v = options.scale;
          mesh.scale.set(finiteNumber(v.x ?? v[0], 1, 'X scale'), finiteNumber(v.y ?? v[1], 1, 'Y scale'), finiteNumber(v.z ?? v[2], 1, 'Z scale'));
        } else throw new TypeError('Moon scale must be a number or a three-component object/array.');
      }
    } catch (error) {
      geometry.dispose();
      material.dispose();
      surface.release();
      throw error;
    }
    let disposed = false;
    return Object.freeze({
      id: 'moon-object',
      object3D: mesh,
      mesh,
      texture: surface.texture,
      textureUrl: surface.url,
      setPosition(x, y, z) {
        if (disposed) return;
        if (typeof x === 'object' && x !== null) mesh.position.set(finiteNumber(x.x ?? x[0], 0, 'X position'), finiteNumber(x.y ?? x[1], 0, 'Y position'), finiteNumber(x.z ?? x[2], 0, 'Z position'));
        else mesh.position.set(finiteNumber(x, 0, 'X position'), finiteNumber(y, 0, 'Y position'), finiteNumber(z, 0, 'Z position'));
      },
      setScale(value, y, z) {
        if (disposed) return;
        if (Number.isFinite(value)) mesh.scale.setScalar(value);
        else if (value && typeof value === 'object') mesh.scale.set(finiteNumber(value.x ?? value[0], 1, 'X scale'), finiteNumber(value.y ?? value[1], 1, 'Y scale'), finiteNumber(value.z ?? value[2], 1, 'Z scale'));
        else mesh.scale.set(finiteNumber(value, 1, 'X scale'), finiteNumber(y, 1, 'Y scale'), finiteNumber(z, 1, 'Z scale'));
      },
      setRotation(x, y, z) {
        if (disposed) return;
        if (typeof x === 'object' && x !== null) mesh.rotation.set(finiteNumber(x.x ?? x[0], 0, 'X rotation'), finiteNumber(x.y ?? x[1], 0, 'Y rotation'), finiteNumber(x.z ?? x[2], 0, 'Z rotation'));
        else mesh.rotation.set(finiteNumber(x, 0, 'X rotation'), finiteNumber(y, 0, 'Y rotation'), finiteNumber(z, 0, 'Z rotation'));
      },
      setVisible(value) { if (!disposed) mesh.visible = !!value; },
      updateMaterial(patch = {}) {
        if (disposed || !patch || typeof patch !== 'object') return;
        if ('color' in patch) material.color?.set ? material.color.set(patch.color) : material.color = patch.color;
        if ('emissive' in patch) material.emissive?.set ? material.emissive.set(patch.emissive) : material.emissive = patch.emissive;
        for (const key of ['roughness', 'metalness', 'emissiveIntensity', 'opacity', 'transparent', 'wireframe']) {
          if (key in patch) material[key] = patch[key];
        }
        material.needsUpdate = true;
      },
      getState() {
        return Object.freeze({
          radius: geometry.parameters.radius,
          position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
          rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
          scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
          visible: mesh.visible,
          textureUrl: surface.url,
          disposed
        });
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        mesh.removeFromParent?.();
        geometry.dispose();
        material.dispose();
        surface.release();
      }
    });
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
    const T=options.THREE || await import(THREE_URL);
    const previewMode=options.preview!==false;
    const cameraFov=finiteNumber(options.cameraFov,39,'Camera field of view');
    const cameraDistance=finiteNumber(options.cameraDistance,previewMode?6.7:6.25,'Camera distance');
    if (cameraFov <= 0 || cameraFov >= 180) throw new RangeError('Camera field of view must be between 0 and 180 degrees.');
    if (cameraDistance <= 0) throw new RangeError('Camera distance must be greater than zero.');
    const moonHandle = await createMoonObject(T, {
      radius: finiteNumber(options.radius, previewMode ? 0.88 : 0.72, 'Moon radius'),
      widthSegments: options.widthSegments ?? 96,
      heightSegments: options.heightSegments ?? 64,
      roughness: options.roughness ?? 0.98,
      metalness: options.metalness ?? 0,
      textureUrl: options.textureUrl || MOON_SURFACE_URL
    });
    let renderer;
    try { renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'}); }
    catch (error) { moonHandle.dispose(); throw error; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.domElement.className='le-celestial-engine-canvas';renderer.domElement.setAttribute('aria-label','Interactive three-dimensional Moon in deep-space preview');
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;cursor:grab;';container.appendChild(renderer.domElement);
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(cameraFov,1,.1,50);camera.position.set(0,0,cameraDistance);camera.lookAt(0,0,0);
    const rig=new T.Group();scene.add(rig);
    // Inspection mode is an uncluttered Moon sphere. The reusable shared engine
    // retains the full Earth/Moon orbital scene for a later production connection.
    const orbitGeometry=previewMode?null:new T.RingGeometry(2.16,2.18,192);
    const orbitMaterial=previewMode?null:new T.MeshBasicMaterial({color:0x7592b8,transparent:true,opacity:.34,side:T.DoubleSide});
    const orbit=previewMode?null:new T.Mesh(orbitGeometry,orbitMaterial);
    if(orbit){orbit.rotation.x=Math.PI/2;rig.add(orbit);}
    const earthGeometry=previewMode?null:new T.SphereGeometry(.22,48,32);
    const earthMaterial=previewMode?null:new T.MeshPhongMaterial({color:0x226ca0,emissive:0x06192c,shininess:18});
    const earthReference=previewMode?new T.Object3D():new T.Mesh(earthGeometry,earthMaterial);rig.add(earthReference);
    const moon = moonHandle.mesh;rig.add(moon);
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

    // One finger rotates the Moon; two fingers pinch to zoom in/out.
    // Gesture zoom is limited to the independent inspection preview so the
    // shared production engine keeps its existing camera and interaction model.
    let dragging=false,lastX=0,lastY=0,pinchDistance=0;
    const activePointers=new Map();
    const zoomLimits={min:3.8,max:12.5};
    const clampCamera=()=>{camera.position.z=Math.max(zoomLimits.min,Math.min(zoomLimits.max,camera.position.z));camera.lookAt(0,0,0);};
    const distanceBetween=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const down=e=>{
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      renderer.domElement.setPointerCapture?.(e.pointerId);
      if(activePointers.size>=2){
        const pts=[...activePointers.values()];pinchDistance=distanceBetween(pts[0],pts[1]);dragging=false;
      }else{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.style.cursor='grabbing';}
    };
    const move=e=>{
      if(!activePointers.has(e.pointerId))return;
      const previous=activePointers.get(e.pointerId);activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(previewMode&&activePointers.size>=2){
        const pts=[...activePointers.values()];const nextDistance=distanceBetween(pts[0],pts[1]);
        if(pinchDistance>0&&nextDistance>0){camera.position.z*=pinchDistance/nextDistance;clampCamera();}
        pinchDistance=nextDistance;dragging=false;return;
      }
      if(!dragging||activePointers.size!==1)return;
      const dx=e.clientX-previous.x,dy=e.clientY-previous.y;lastX=e.clientX;lastY=e.clientY;
      rig.rotation.y+=dx*.006;rig.rotation.x=Math.max(-.45,Math.min(.45,rig.rotation.x+dy*.004));
    };
    const up=e=>{
      activePointers.delete(e.pointerId);
      if(activePointers.size>=2){const pts=[...activePointers.values()];pinchDistance=distanceBetween(pts[0],pts[1]);dragging=false;}
      else if(activePointers.size===1){const remaining=[...activePointers.values()][0];lastX=remaining.x;lastY=remaining.y;dragging=true;pinchDistance=0;}
      else{dragging=false;pinchDistance=0;renderer.domElement.style.cursor='grab';}
    };
    const wheel=e=>{if(!previewMode)return;e.preventDefault();camera.position.z*=Math.exp(e.deltaY*.001);clampCamera();};
    renderer.domElement.addEventListener('pointerdown',down);
    renderer.domElement.addEventListener('pointermove',move);
    renderer.domElement.addEventListener('pointerup',up);
    renderer.domElement.addEventListener('pointercancel',up);
    renderer.domElement.addEventListener('wheel',wheel,{passive:false});

    function updateObjects(){
      const p=lunarPosition(simDate);
      const age=((simDate.getTime()-Date.UTC(2000,0,6,18,14))/86400000%SYNODIC_MONTH_DAYS+SYNODIC_MONTH_DAYS)%SYNODIC_MONTH_DAYS;
      const waxing=age<SYNODIC_MONTH_DAYS/2;
      let toEarth;
      if(previewMode){
        // Keep the Moon centred for the immersive inspection view while its
        // synchronous spin and lunar phase continue to follow the orbital date.
        moon.position.set(0,0,0);
        moon.rotation.set(0,Math.atan2(-p.x,-p.z),0);
        const phaseAngle=2*Math.PI*age/SYNODIC_MONTH_DAYS;
        sunlight.position.set(Math.sin(phaseAngle)*8,0,Math.cos(phaseAngle)*8);
        toEarth=new T.Vector3(0,0,1);
      }else{
        moon.position.set(p.x,p.y,p.z);moon.lookAt(earthReference.position);
        toEarth=new T.Vector3().subVectors(earthReference.position,moon.position).normalize();
      }
      const toSun=sunlight.position.clone().sub(moon.position).normalize();
      const illumination=Math.max(0,Math.min(1,(1-toSun.dot(toEarth))*.5));
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
      destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('wheel',wheel);renderer.dispose();orbitGeometry?.dispose();orbitMaterial?.dispose();earthGeometry?.dispose();earthMaterial?.dispose();moonHandle.dispose();renderer.domElement.remove();}
    };
  }

  let sharedInstancePromise = null;
  async function mountShared(container,options={}){
    if (sharedInstance) { sharedInstance.attach?.(container); return sharedInstance; }
    if (!sharedInstancePromise) {
      sharedInstancePromise = makeInstance(container,{...options,preview:false})
        .then(instance => { sharedInstance = instance; return instance; })
        .finally(() => { sharedInstancePromise = null; });
    }
    return sharedInstancePromise;
  }
  async function createObject(options = {}) {
    const T = options.THREE || await import(THREE_URL);
    return createMoonObject(T, options);
  }

  // create/createObject/createObject3D returns only a Moon mesh handle. The
  // caller adds object3D to its own scene and owns its camera, renderer and lights.
  engines.moon=Object.freeze({
    id:'moon',name:'Moon Engine',version:'2.0.0',
    surface:Object.freeze({url:MOON_SURFACE_URL,source:'NASA LROC global colour map (user-supplied 1536 × 768 copy)',projection:'equirectangular',offlineAsset:true}),
    create:createObject,
    createObject:createObject,
    createObject3D:createObject,
    createPreview:(container,options={})=>makeInstance(container,{...options,preview:true}),
    mountShared,getShared:()=>sharedInstance,
    releaseShared:()=>{if(sharedInstance)sharedInstance.destroy();sharedInstance=null;},
    getSurfaceInfo:()=>Object.freeze({url:MOON_SURFACE_URL,source:'NASA LROC global colour map',precachedByServiceWorker:true})
  });
  window.dispatchEvent(new CustomEvent('live-earth-celestial-engine-ready',{detail:{engine:'moon'}}));
})();
