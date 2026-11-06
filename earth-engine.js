/* LIVE // EARTH — Global Earth Engine (standalone engine + bridge API).
 * This file defines the reusable Earth renderer. It does not attach to any app view.
 * Preview instances are temporary; mountShared() owns one reusable global instance.
 */
(() => {
  'use strict';
  const engines = window.LiveEarthCelestialEngines || (window.LiveEarthCelestialEngines = {});
  if (engines.earth) return;

  const THREE_URL = new URL('./vendor/three.module.js', document.baseURI).href;
  const EARTH_TEXTURE_URL = new URL('./runtime-assets/earth-land-ocean-ice-2048.png', document.baseURI).href;
  const SIDEREAL_DAY_MS = 86164090.5;
  const PREVIEW_RATE = SIDEREAL_DAY_MS / 120000; // One visible rotation in about two minutes.
  let sharedInstance = null;

  function greenwichSiderealAngle(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const d = jd - 2451545.0;
    const t = d / 36525;
    const degrees = ((280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - t * t * t / 38710000) % 360 + 360) % 360;
    return degrees * Math.PI / 180;
  }

  function makeFallbackTexture(T) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
    ocean.addColorStop(0, '#174b78'); ocean.addColorStop(.5, '#0b3159'); ocean.addColorStop(1, '#123b65');
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const continents = [
      [[.07,.20],[.14,.12],[.22,.15],[.25,.23],[.21,.31],[.24,.39],[.19,.50],[.15,.54],[.12,.43],[.09,.36]],
      [[.20,.52],[.24,.56],[.26,.68],[.23,.82],[.20,.91],[.17,.79],[.18,.66]],
      [[.43,.17],[.50,.13],[.57,.17],[.61,.25],[.57,.35],[.52,.39],[.49,.50],[.45,.43],[.42,.31]],
      [[.50,.48],[.57,.49],[.60,.59],[.57,.74],[.53,.86],[.49,.76],[.47,.63]],
      [[.68,.20],[.77,.16],[.86,.22],[.91,.31],[.86,.39],[.80,.36],[.76,.44],[.71,.38],[.67,.29]],
      [[.79,.51],[.84,.48],[.88,.56],[.86,.68],[.82,.75],[.78,.65]],
      [[.94,.78],[.98,.80],[.99,.86],[.95,.89]]
    ];
    ctx.fillStyle = '#8b9c76';
    continents.forEach(poly => {
      ctx.beginPath(); poly.forEach((p, i) => { const x=p[0]*canvas.width,y=p[1]*canvas.height; if (!i) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.closePath(); ctx.fill();
    });
    ctx.globalAlpha = .2; ctx.fillStyle = '#d6e6e8';
    for (let i=0;i<1600;i++) { const x=Math.random()*canvas.width,y=Math.random()*canvas.height; ctx.fillRect(x,y,1+Math.random()*3,1+Math.random()*2); }
    ctx.globalAlpha = 1;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4;
    return texture;
  }

  async function makeInstance(container, options = {}) {
    if (!container || !container.appendChild) throw new TypeError('Earth Engine needs a container element.');
    const T = await import(THREE_URL);
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.domElement.className = 'le-celestial-engine-canvas';
    renderer.domElement.setAttribute('aria-label', 'Interactive three-dimensional Earth preview');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab;';
    container.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, .1, 40);
    camera.position.set(0, 0, 3.25);
    const rig = new T.Group(); scene.add(rig);
    const axis = new T.Group(); axis.rotation.z = 23.439281 * Math.PI / 180; rig.add(axis);
    const geometry = new T.SphereGeometry(1, 112, 80);
    const fallback = makeFallbackTexture(T);
    const material = new T.MeshPhongMaterial({ map: fallback, color: 0xffffff, specular: 0x28435b, shininess: 9 });
    const globe = new T.Mesh(geometry, material); axis.add(globe);
    const atmosphere = new T.Mesh(
      new T.SphereGeometry(1.025, 96, 64),
      new T.ShaderMaterial({
        transparent: true, depthWrite: false, side: T.BackSide,
        vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vNormal=normalize(normalMatrix*normal); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
        fragmentShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ float f=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),2.5); gl_FragColor=vec4(0.16,0.56,1.0,f*0.42); }'
      })
    ); axis.add(atmosphere);
    scene.add(new T.HemisphereLight(0x9ecbff, 0x101827, .62));
    const sun = new T.DirectionalLight(0xfff3dc, 2.15); sun.position.set(4.5, 1.6, 5.5); scene.add(sun);
    const fill = new T.DirectionalLight(0x32669f, .18); fill.position.set(-4, -2, -3); scene.add(fill);

    let simDate = options.date instanceof Date ? new Date(options.date) : new Date();
    let speed = Number.isFinite(options.speed) ? Math.max(0, options.speed) : 1;
    const timeScale = options.preview === false ? 1 : PREVIEW_RATE;
    let paused = options.paused === true;
    let disposed = false, raf = 0, previous = 0, resizeObserver = null;
    let width = 1, height = 1, activeContainer = container;

    const resize = () => {
      if (disposed) return;
      const rect = activeContainer.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width || activeContainer.clientWidth || 320));
      height = Math.max(1, Math.round(rect.height || activeContainer.clientHeight || 320));
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(activeContainer); }
    else window.addEventListener('resize', resize, { passive: true });
    resize();

    const loader = new T.TextureLoader();
    loader.load(EARTH_TEXTURE_URL, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      material.map?.dispose?.(); material.map = texture; material.needsUpdate = true; fallback.dispose();
      options.onStatus?.('NASA Earth surface loaded');
    }, undefined, () => { if (!disposed) options.onStatus?.('Using built-in Earth surface fallback'); });

    let dragging = false, lastX = 0, lastY = 0;
    const pointerDown = event => { dragging = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.style.cursor='grabbing'; renderer.domElement.setPointerCapture?.(event.pointerId); };
    const pointerMove = event => { if (!dragging) return; const dx=event.clientX-lastX,dy=event.clientY-lastY; lastX=event.clientX; lastY=event.clientY; rig.rotation.y += dx*.006; rig.rotation.x = Math.max(-.75,Math.min(.75,rig.rotation.x+dy*.004)); };
    const pointerUp = () => { dragging=false; renderer.domElement.style.cursor='grab'; };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerUp);

    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) { previous=now; return; }
      const delta = previous ? Math.min(80, now-previous) : 0; previous=now;
      if (!paused && delta > 0) simDate = new Date(simDate.getTime() + delta * timeScale * speed);
      globe.rotation.y = greenwichSiderealAngle(simDate);
      renderer.render(scene,camera);
    }
    raf = requestAnimationFrame(frame);

    const api = {
      id: 'earth',
      pause(){ paused=true; }, resume(){ paused=false; },
      setSpeed(value){ if (!Number.isFinite(value) || value < 0) throw new RangeError('Speed must be zero or greater.'); speed=value; },
      setDate(value){ const date=value instanceof Date?value:new Date(value); if (!Number.isFinite(date.getTime())) throw new TypeError('A valid date is required.'); simDate=date; },
      reset(){ simDate=new Date(); rig.rotation.set(0,0,0); paused=false; speed=1; },
      getState(){ return Object.freeze({ date: simDate.toISOString(), speed, paused, rotationRadians: globe.rotation.y, siderealDayHours: 23.9344696 }); },
      getObject3D(){ return axis; },
      attach(nextContainer){ if (!nextContainer?.appendChild) throw new TypeError('A container element is required.'); if (renderer.domElement.parentElement !== nextContainer) nextContainer.appendChild(renderer.domElement); resizeObserver?.unobserve(activeContainer); activeContainer=nextContainer; resizeObserver?.observe(activeContainer); resize(); },
      destroy(){
        if (disposed) return; disposed=true; cancelAnimationFrame(raf); resizeObserver?.disconnect();
        window.removeEventListener('resize',resize);
        renderer.domElement.removeEventListener('pointerdown',pointerDown); renderer.domElement.removeEventListener('pointermove',pointerMove);
        renderer.domElement.removeEventListener('pointerup',pointerUp); renderer.domElement.removeEventListener('pointercancel',pointerUp);
        renderer.dispose(); geometry.dispose(); material.map?.dispose?.(); material.dispose(); fallback.dispose(); atmosphere.geometry.dispose(); atmosphere.material.dispose();
        renderer.domElement.remove();
      }
    };
    return api;
  }

  async function mountShared(container, options = {}) {
    if (!sharedInstance) sharedInstance = await makeInstance(container, { ...options, preview: false });
    else sharedInstance.attach(container);
    return sharedInstance;
  }

  // Keep the shared slot private; mountShared() is its only creator.
  engines.earth = Object.freeze({
    id: 'earth', name: 'Earth Engine', version: '1.0.0',
    createPreview: (container, options = {}) => makeInstance(container, { ...options, preview: true }),
    mountShared,
    getShared: () => sharedInstance,
    releaseShared: () => { if (sharedInstance) sharedInstance.destroy(); sharedInstance = null; }
  });
  window.dispatchEvent(new CustomEvent('live-earth-celestial-engine-ready', { detail: { engine: 'earth' } }));
})();
