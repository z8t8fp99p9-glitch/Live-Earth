/* LIVE // EARTH — Traffic remains an empty black view.
   Live Cams owns its renderer and camera, and calls only the shared Earth
   Engine globe factory. It never imports Home, Moon, or Home scene code. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  const featureApi = window.LiveEarthFeatureViews;
  if (!runtime || typeof runtime.mount !== 'function' ||
      !featureApi || typeof featureApi.register !== 'function') {
    console.error('[LIVE // EARTH] Stacks feature registry is unavailable.');
    return;
  }

  const { mount } = runtime;
  const styleId = 'le-live-cams-independent-earth-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .le-sfv--traffic .le-sfv-panel{background:#020306!important;overflow:hidden!important}
      .le-sfv--live-cams{pointer-events:none!important;background:#020306!important}
      .le-sfv--live-cams .le-sfv-panel{
        position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;
        height:100%!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;
        overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;
        padding:0 0 calc(env(safe-area-inset-bottom) + 118px)!important;margin:0!important;
        border:0!important;border-radius:0!important;background:#020306!important;
        box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
        scrollbar-width:none!important;pointer-events:auto!important
      }
      .le-sfv--live-cams .le-sfv-panel::-webkit-scrollbar{display:none}
      .le-sfv--live-cams .le-sfv-head,.le-sfv--live-cams .le-sfv-pill{display:none!important}
      .le-sfv--live-cams .le-sfv-body{
        display:block!important;width:100%!important;max-width:none!important;
        min-height:170svh!important;margin:0!important;padding:0!important
      }
      .le-live-cams-earth-wrap{
        position:relative;width:100%;height:72svh;min-height:440px;max-height:820px;
        overflow:hidden;background:#020306;touch-action:pan-y
      }
      .le-live-cams-earth-canvas{display:block;width:100%;height:100%;outline:none;touch-action:none}
      .le-live-cams-scroll-space{height:88svh;min-height:520px;background:#020306}
      @media(orientation:landscape){
        .le-live-cams-earth-wrap{height:76svh;min-height:300px}
        .le-live-cams-scroll-space{height:72svh;min-height:260px}
      }
    `;
    document.head.appendChild(style);
  }

  function openTraffic() {
    const view = mount('traffic');
    if (!view) return () => {};
    view.body.replaceChildren();
    view.root.querySelector('.le-sfv-head')?.remove();
    view.root.querySelector('.le-sfv-pill')?.remove();
    return () => {};
  }

  function openLiveCamsEarth() {
    const view = mount('live-cams');
    if (!view) return () => {};
    view.root.querySelector('.le-sfv-head')?.remove();
    view.root.querySelector('.le-sfv-pill')?.remove();
    view.body.replaceChildren();

    const wrap = document.createElement('div');
    wrap.className = 'le-live-cams-earth-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'le-live-cams-earth-canvas';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','Interactive Earth globe');
    wrap.appendChild(canvas);
    const scrollSpace = document.createElement('div');
    scrollSpace.className = 'le-live-cams-scroll-space';
    view.body.append(wrap,scrollSpace);

    let active = true, frame = 0, resizeObserver = null;
    let renderer = null, scene = null, camera = null, earthGlobe = null, interactions = null, THREE = null;
    let disposed = false;

    function render() {
      if (active && renderer && scene && camera) renderer.render(scene,camera);
    }
    function resize() {
      if (!active || !renderer || !camera || !THREE) return;
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(1,Math.round(rect.width));
      const height = Math.max(1,Math.round(rect.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
      renderer.setSize(width,height,false);
      camera.aspect = width/height;
      camera.updateProjectionMatrix();
      const fit = height/(0.78*Math.min(width,height)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
      camera.position.z = Math.min(camera.position.z || fit,fit*1.08);
      camera.lookAt(0,0,0);
      render();
    }
    function stop() {
      if (disposed) return;
      disposed = true;
      active = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      interactions?.dispose();
      interactions = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('resize',resize);
      window.visualViewport?.removeEventListener('resize',resize);
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer = null;
      }
      earthGlobe?.dispose();
      earthGlobe = null;
      scene?.clear();
      scene = null;
      camera = null;
      THREE = null;
    }

    (async () => {
      try {
        // Fresh view-owned Three.js renderer. No Home canvas or scene is reused.
        THREE = await import('./vendor/three.module.js');
        if (!active || disposed) return;
        renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x020306,1);

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020306);
        camera = new THREE.PerspectiveCamera(34,1,0.1,180);
        camera.position.set(0,0,3.1);
        camera.lookAt(0,0,0);
        scene.add(new THREE.AmbientLight(0x8aa7c8,0.12));
        const sunlight = new THREE.DirectionalLight(0xffffff,2.3);
        sunlight.position.set(-3,2,4);
        sunlight.userData.leSolarKey = true;
        scene.add(sunlight);
        const fill = new THREE.DirectionalLight(0x245b9b,0.055);
        fill.position.set(4,-2,-3);
        scene.add(fill);

        // A new Engine globe, owned only by this Live Cams view.
        const engine = await import('./EarthEngine/Core/earth-engine.js');
        if (!active || disposed) return;
        const createEarthGlobe = engine.createEarthGlobe || engine.createGlobe;
        if (typeof createEarthGlobe !== 'function') throw new Error('The Earth Engine globe factory is unavailable.');
        earthGlobe = await createEarthGlobe({
          THREE,radius:1,
          textureUrl:'./EarthEngine/Assets/earth-land-ocean-ice-2048.png',
          geometryDetail:'high',
          maxAnisotropy:renderer.capabilities.getMaxAnisotropy(),
          atmosphere:true
        });
        if (!active || disposed) { earthGlobe.dispose(); earthGlobe=null; return; }
        scene.add(earthGlobe.group);

        const fitDistance = () => {
          const rect = wrap.getBoundingClientRect();
          const width = Math.max(1,rect.width),height = Math.max(1,rect.height);
          return height/(0.78*Math.min(width,height)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
        };
        interactions = earthGlobe.attachInteractions({
          element:canvas,
          enabled:() => active,
          rotation:{sensitivityX:0.009,sensitivityY:0.0055,minPitch:-1.15,maxPitch:1.15},
          zoom:{
            enabled:true,
            getDistance:() => camera.position.z,
            setDistance:distance => {camera.position.z=distance;camera.lookAt(0,0,0);},
            minDistance:() => fitDistance()*0.82,
            maxDistance:() => fitDistance()*1.08
          },
          onRotate:render,
          onZoom:render
        });

        resize();
        if (typeof ResizeObserver === 'function') {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(wrap);
        }
        window.addEventListener('resize',resize,{passive:true});
        window.visualViewport?.addEventListener('resize',resize,{passive:true});
        const tick = () => { if (!active) return; render(); frame=requestAnimationFrame(tick); };
        frame = requestAnimationFrame(tick);
      } catch (error) {
        console.error('[LIVE // EARTH] Independent Live Cams Earth could not initialize.',error);
        const note = document.createElement('p');
        note.style.cssText='color:#b7c8d8;padding:18px;font:14px system-ui';
        note.textContent='Earth could not be initialized. Home Earth remains untouched.';
        view.body.prepend(note);
        stop();
      }
    })();
    return stop;
  }

  runtime.registerFeature('traffic',openTraffic);
  featureApi.register('live-cams',{
    title:'Live Cams',shortLabel:'Live Cams',symbol:'◉',
    description:'Independent Earth Engine view',connected:true,
    activate:() => { window.__liveEarthLiveCamsCleanup = openLiveCamsEarth(); },
    deactivate:() => { window.__liveEarthLiveCamsCleanup?.(); window.__liveEarthLiveCamsCleanup = null; }
  });
})();
