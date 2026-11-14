/* LIVE // EARTH — Traffic stays an empty black view.
   Live Cams owns its renderer, camera and Engine globe. It never imports Home,
   the Home scene, the Moon module, or Home's renderer. */
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
  if (!document.getElementById?.(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Traffic is deliberately an empty black canvas. Its source remains pending. */
      .le-sfv--traffic .le-sfv-panel { background:#020306!important; overflow:hidden!important; }
      /* Live Cams has its own scroll surface and renderer canvas. */
      .le-sfv--live-cams { pointer-events:none!important; background:#020306!important; }
      .le-sfv--live-cams .le-sfv-panel {
        position:absolute!important; inset:0!important; width:100%!important; max-width:none!important;
        height:100%!important; max-height:none!important; overflow-y:auto!important; overflow-x:hidden!important;
        overscroll-behavior:contain!important; -webkit-overflow-scrolling:touch!important;
        padding:0 0 calc(env(safe-area-inset-bottom) + 118px)!important; margin:0!important;
        border:0!important; border-radius:0!important; background:#020306!important;
        box-shadow:none!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important;
        scrollbar-width:none!important; pointer-events:auto!important;
      }
      .le-sfv--live-cams .le-sfv-panel::-webkit-scrollbar { display:none; }
      .le-sfv--live-cams .le-sfv-head,.le-sfv--live-cams .le-sfv-pill { display:none!important; }
      .le-sfv--live-cams .le-sfv-body {
        display:block!important; width:100%!important; max-width:none!important;
        min-height:170svh!important; margin:0!important; padding:0!important;
      }
      .le-live-cams-earth-wrap {
        position:relative; width:100%; height:72svh; min-height:440px; max-height:820px;
        overflow:hidden; background:#020306;
      }
      .le-live-cams-earth-canvas {
        display:block; width:100%; height:100%; outline:none; touch-action:none;
        -webkit-tap-highlight-color:transparent;
      }
      .le-live-cams-scroll-space { height:98svh; min-height:600px; background:#020306; }
      @media(orientation:landscape) {
        .le-live-cams-earth-wrap { height:76svh; min-height:300px; }
        .le-live-cams-scroll-space { height:74svh; min-height:280px; }
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

  let liveCamsCleanup = () => {};

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
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive Earth globe');
    wrap.appendChild(canvas);

    const scrollSpace = document.createElement('div');
    scrollSpace.className = 'le-live-cams-scroll-space';
    view.body.append(wrap, scrollSpace);

    let alive = true;
    let engineActive = false;
    let disposed = false;
    let drawFrame = 0;
    let resizeObserver = null;
    let runtimeUnregister = null;

    let THREE = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let earthGlobe = null;
    let earthInteractions = null;

    let baseDistance = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastPixelRatio = 0;

    const FOV = 34;
    const DIAMETER_FRACTION = 0.75;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function distanceForDiameter(fraction) {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(1, rect.width || wrap.clientWidth || window.innerWidth || 1);
      const height = Math.max(1, rect.height || wrap.clientHeight || window.innerHeight || 1);
      const shortest = Math.max(1, Math.min(width, height));
      return height / (fraction * shortest * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    }

    function requestRender() {
      if (!alive || !engineActive || !renderer || !scene || !camera || drawFrame) return;
      drawFrame = requestAnimationFrame(() => {
        drawFrame = 0;
        if (alive && engineActive && renderer && scene && camera) renderer.render(scene, camera);
      });
    }

    function resizeRenderer() {
      if (!alive || !renderer || !camera || !THREE) return;

      const rect = wrap.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || wrap.clientWidth || window.innerWidth || 1));
      const height = Math.max(1, Math.round(rect.height || wrap.clientHeight || window.innerHeight || 1));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

      if (width !== lastWidth || height !== lastHeight || pixelRatio !== lastPixelRatio) {
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        lastWidth = width;
        lastHeight = height;
        lastPixelRatio = pixelRatio;
      }

      const previousBase = baseDistance || distanceForDiameter(DIAMETER_FRACTION);
      const previousRatio = baseDistance > 0 && camera.position.z > 0
        ? camera.position.z / previousBase
        : 1;

      camera.aspect = width / height;
      camera.fov = FOV;
      camera.updateProjectionMatrix();

      baseDistance = distanceForDiameter(DIAMETER_FRACTION);
      // Match Home's 75%-of-short-edge framing without using Home's Earth object or camera.
      camera.position.z = clamp(
        baseDistance * previousRatio,
        baseDistance * 0.82,
        baseDistance * 1.08
      );
      camera.lookAt(0, 0, 0);
      requestRender();
    }

    function pauseRenderer() {
      engineActive = false;
      if (drawFrame) cancelAnimationFrame(drawFrame);
      drawFrame = 0;
      earthInteractions?.reset();
    }

    function resumeRenderer() {
      if (!alive || disposed || !renderer || !scene || !camera) return;
      engineActive = true;
      resizeRenderer();
      requestRender();
    }

    function stop() {
      if (!alive && disposed) return;
      alive = false;
      pauseRenderer();

      // Unregister this view before disposing its Engine globe. The Engine then
      // resumes the original Home renderer when the feature returns to Home.
      runtimeUnregister?.();
      runtimeUnregister = null;

      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('resize', resizeRenderer);
      window.visualViewport?.removeEventListener('resize', resizeRenderer);

      earthInteractions?.dispose();
      earthInteractions = null;

      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        // Do not force WebGL context loss: Home owns a separate, persistent context.
        renderer = null;
      }

      earthGlobe?.dispose();
      earthGlobe = null;

      scene?.clear();
      scene = null;
      camera = null;
      THREE = null;
      disposed = true;
    }

    async function initialize() {
      try {
        // Traffic/ is one folder below the app root: module imports are parent-relative.
        THREE = await import('../vendor/three.module.js');
        if (!alive || disposed) return;

        renderer = new THREE.WebGLRenderer({
          canvas, antialias:true, alpha:false, powerPreference:'low-power'
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setClearColor(0x020306, 1);

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020306);

        camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 180);
        camera.position.set(0, 0, 1);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0x8aa7c8, 0.12));
        const sunlight = new THREE.DirectionalLight(0xffffff, 2.3);
        sunlight.userData.leSolarKey = true;
        sunlight.position.set(-3, 2, 4);
        scene.add(sunlight);
        const fill = new THREE.DirectionalLight(0x245b9b, 0.055);
        fill.position.set(4, -2, -3);
        scene.add(fill);

        // Create a new Engine globe for secondary:live-cams. No Home or Moon import.
        const engineModule = await import('../EarthEngine/Core/earth-engine.js');
        if (!alive || disposed) return;

        const createEarthGlobe = engineModule.createEarthGlobe || engineModule.createGlobe;
        if (typeof createEarthGlobe !== 'function') {
          throw new Error('The Earth Engine globe factory is unavailable.');
        }

        earthGlobe = await createEarthGlobe({
          THREE,
          radius: 1,
          textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png',
          geometryDetail: 'high',
          maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
          atmosphere: true
        });

        if (!alive || disposed) {
          earthGlobe.dispose();
          earthGlobe = null;
          return;
        }

        scene.add(earthGlobe.group);

        earthInteractions = earthGlobe.attachInteractions({
          element: canvas,
          enabled: () => alive && engineActive,
          rotation: {
            sensitivityX: 0.009,
            sensitivityY: 0.0055,
            minPitch: -1.15,
            maxPitch: 1.15
          },
          zoom: {
            enabled: true,
            getDistance: () => camera.position.z,
            setDistance: distance => {
              camera.position.z = clamp(distance, baseDistance * 0.82, baseDistance * 1.08);
              camera.lookAt(0, 0, 0);
            },
            minDistance: () => baseDistance * 0.82,
            maxDistance: () => baseDistance * 1.08
          },
          onRotate: requestRender,
          onZoom: requestRender
        });

        resizeRenderer();

        // This renderer follows the same owner lifecycle used by Home's renderer.
        runtimeUnregister = earthGlobe.registerViewRuntime({
          activate: resumeRenderer,
          deactivate: pauseRenderer
        });

        if (typeof ResizeObserver === 'function') {
          resizeObserver = new ResizeObserver(resizeRenderer);
          resizeObserver.observe(wrap);
        }
        window.addEventListener('resize', resizeRenderer, { passive:true });
        window.visualViewport?.addEventListener('resize', resizeRenderer, { passive:true });
        requestRender();
      } catch (error) {
        if (!alive || disposed) return;
        console.error('[LIVE // EARTH] Independent Live Cams Earth could not initialize.', error);
        const note = document.createElement('p');
        note.style.cssText = 'color:#b7c8d8;padding:18px;font:14px system-ui';
        note.textContent = 'Earth could not be initialized: ' + String(error?.message || error);
        view.body.prepend(note);
        stop();
      }
    }

    initialize();
    return stop;
  }

  runtime.registerFeature('traffic', openTraffic);
  featureApi.register('live-cams', {
    title:'Live Cams',
    shortLabel:'Live Cams',
    symbol:'◉',
    description:'Independent Earth Engine view',
    connected:true,
    activate:() => { liveCamsCleanup = openLiveCamsEarth(); },
    deactivate:() => {
      liveCamsCleanup?.();
      liveCamsCleanup = () => {};
    }
  });
})();
