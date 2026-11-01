/* LIVE // EARTH — self-contained procedural 3D Sun View.
   Reuses the app's already-cached Three.js module. No new engine, texture, video,
   external URL, API, or saved animation frames. The Sun sphere never spins or travels. */
(() => {
  "use strict";
  if (window.__liveEarthSunViewInstalled) return;
  window.__liveEarthSunViewInstalled = true;

  const vertexShader = `
    varying vec3 vObjectPosition;
    varying vec3 vNormalView;
    varying vec3 vViewPosition;
    void main() {
      vObjectPosition = normalize(position);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormalView = normalize(normalMatrix * normal);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const surfaceFragmentShader = `
    precision highp float;
    uniform float uTime;
    varying vec3 vObjectPosition;
    varying vec3 vNormalView;
    varying vec3 vViewPosition;

    float hash31(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }
    float noise3(vec3 x) {
      vec3 i = floor(x), f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash31(i);
      float n100 = hash31(i + vec3(1.0,0.0,0.0));
      float n010 = hash31(i + vec3(0.0,1.0,0.0));
      float n110 = hash31(i + vec3(1.0,1.0,0.0));
      float n001 = hash31(i + vec3(0.0,0.0,1.0));
      float n101 = hash31(i + vec3(1.0,0.0,1.0));
      float n011 = hash31(i + vec3(0.0,1.0,1.0));
      float n111 = hash31(i + vec3(1.0,1.0,1.0));
      float a = mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y);
      float b = mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y);
      return mix(a,b,f.z);
    }
    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.56;
      for (int i=0; i<3; i++) {
        value += amplitude * noise3(p);
        p *= 2.02;
        amplitude *= 0.48;
      }
      return value;
    }
    void main() {
      vec3 p = normalize(vObjectPosition);
      // This changes only the shader's plasma field. The sphere's world transform is fixed.
      vec3 flow = p * 4.7 + vec3(uTime * 0.095, sin(uTime * 0.22) * 0.045, -uTime * 0.047);
      float broad = fbm(flow * 1.12);
      float fine = noise3(flow * 8.8 + vec3(7.1, 2.4, 5.8));
      float medium = noise3(flow * 3.6 + vec3(2.0, 9.2, 4.1));
      float granulation = clamp(broad * 0.58 + medium * 0.29 + fine * 0.13, 0.0, 1.0);
      float filaments = 0.5 + 0.5 * sin((broad * 8.3 + medium * 2.8 + fine * 0.9) * 10.2);
      float brightFilament = smoothstep(0.54, 0.95, filaments) * smoothstep(0.23, 0.70, fine);
      float darkChannel = smoothstep(0.60, 0.77, fbm(flow * 1.72 + vec3(16.0, 3.0, 8.0)));
      float activeRegion = smoothstep(0.49, 0.75, broad * 0.68 + medium * 0.32);

      vec3 deepRed = vec3(0.20, 0.012, 0.001);
      vec3 burntOrange = vec3(0.68, 0.045, 0.002);
      vec3 solarOrange = vec3(1.00, 0.16, 0.006);
      vec3 goldPlasma = vec3(1.00, 0.43, 0.030);
      vec3 hotGold = vec3(1.00, 0.75, 0.19);
      vec3 whiteHot = vec3(1.00, 0.94, 0.69);
      vec3 color = mix(deepRed, burntOrange, smoothstep(0.02, 0.43, granulation));
      color = mix(color, solarOrange, smoothstep(0.25, 0.63, granulation));
      color = mix(color, goldPlasma, brightFilament * 0.70);
      color = mix(color, hotGold, activeRegion * 0.48);
      color = mix(color, whiteHot, pow(brightFilament * activeRegion, 2.0) * 0.72);
      color *= 1.0 - darkChannel * 0.48;

      vec3 n = normalize(vNormalView);
      vec3 viewDir = normalize(vViewPosition);
      float limb = pow(1.0 - max(dot(n, viewDir), 0.0), 1.45);
      color += vec3(1.0, 0.24, 0.018) * limb * 0.24;
      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  const coronaFragmentShader = `
    precision highp float;
    uniform float uTime;
    varying vec3 vNormalView;
    varying vec3 vViewPosition;
    void main() {
      vec3 n = normalize(vNormalView);
      vec3 v = normalize(vViewPosition);
      float edge = 1.0 - max(dot(n, v), 0.0);
      float pulse = 0.88 + 0.12 * sin(uTime * 0.62 + n.x * 6.5 + n.y * 9.0);
      float fringe = pow(edge, 2.45) * pulse;
      float threads = smoothstep(0.68, 0.98, sin(atan(n.y, n.x) * 13.0 + uTime * 0.12));
      vec3 amber = vec3(1.0, 0.26, 0.025);
      vec3 gold = vec3(1.0, 0.69, 0.20);
      vec3 color = mix(amber, gold, threads * 0.65);
      gl_FragColor = vec4(color, clamp(fringe * 0.53 + threads * fringe * 0.17, 0.0, 0.68));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  async function mount(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("Sun renderer needs a canvas.");
    // This is the same local Three.js module already verified and cached by sw.js.
    const THREE = await import("./vendor/three.module.js");
    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true, powerPreference: "low-power", premultipliedAlpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.set(0, 0, 3.55);
    camera.lookAt(0, 0, 0);

    const sunGroup = new THREE.Group();
    sunGroup.position.y = 0.13; // A fixed, slightly raised composition leaves room for the time cards.
    scene.add(sunGroup);

    const sunMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader,
      fragmentShader: surfaceFragmentShader,
      toneMapped: true
    });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.59, 72, 56), sunMaterial);
    sun.name = "leProceduralSunSphere";
    sunGroup.add(sun);

    const coronaMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader,
      fragmentShader: coronaFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
      toneMapped: true
    });
    const corona = new THREE.Mesh(new THREE.SphereGeometry(0.625, 64, 48), coronaMaterial);
    corona.name = "leProceduralSunCorona";
    sunGroup.add(corona);

    const activeFlares = [];
    const maxFlares = 3;
    let randomState = ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
    const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
    let elapsed = 0;
    let nextFlareAt = 0.75 + random() * 1.2;
    const flareColors = [0xff6b12, 0xffa52e, 0xffd071];

    function spawnFlare(now) {
      if (activeFlares.length >= maxFlares) return;
      const startAngle = random() * Math.PI * 2;
      const direction = random() < 0.5 ? -1 : 1;
      const span = direction * (0.38 + random() * 0.82);
      const lift = 0.075 + random() * 0.20;
      const points = [];
      const samples = 64;
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const a = startAngle + span * t;
        const radius = 0.596 + lift * Math.sin(Math.PI * t);
        const z = 0.055 + 0.10 * Math.sin(Math.PI * t) + 0.018 * Math.sin(2 * Math.PI * t);
        points.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, samples, 0.0035 + random() * 0.0025, 4, false);
      const material = new THREE.MeshBasicMaterial({
        color: flareColors[Math.floor(random() * flareColors.length)],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 5;
      sunGroup.add(mesh);
      activeFlares.push({ mesh, start: now, duration: 2.0 + random() * 2.1, samples });
    }

    let active = false;
    let stopped = false;
    let raf = 0;
    let lastFrame = 0;
    let lastWidth = 0, lastHeight = 0;
    let resizeObserver = null;
    const reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width; lastHeight = height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    function cleanFlare(flare, index) {
      sunGroup.remove(flare.mesh);
      flare.mesh.geometry.dispose();
      flare.mesh.material.dispose();
      activeFlares.splice(index, 1);
    }
    function drawFrame(timestamp) {
      raf = 0;
      if (stopped || !active || document.hidden) return;
      if (timestamp - lastFrame < 32) { requestDraw(); return; }
      const delta = lastFrame ? Math.min(0.05, (timestamp - lastFrame) / 1000) : 0;
      lastFrame = timestamp;
      if (!reducedMotion) elapsed += delta;
      resize();

      sunMaterial.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      coronaMaterial.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      if (!reducedMotion && elapsed >= nextFlareAt) {
        spawnFlare(elapsed);
        nextFlareAt = elapsed + 1.65 + random() * 2.85;
      }
      for (let i = activeFlares.length - 1; i >= 0; i--) {
        const flare = activeFlares[i];
        const progress = (elapsed - flare.start) / flare.duration;
        if (progress >= 1) { cleanFlare(flare, i); continue; }
        const envelope = Math.sin(Math.PI * progress);
        // Reveal the tube along its curve, then shorten it again so the flare appears
        // to emerge from the limb and retract instead of just fading as a static line.
        const reach = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        const indexCount = flare.mesh.geometry.index?.count || 0;
        flare.mesh.geometry.setDrawRange(0, Math.max(0, Math.floor(indexCount * reach)));
        flare.mesh.material.opacity = Math.max(0, envelope * (0.42 + 0.48 * reach));
        flare.mesh.visible = !reducedMotion && reach > 0.02;
      }
      renderer.render(scene, camera);
      if (!reducedMotion) requestDraw();
    }
    function requestDraw() {
      if (stopped || !active || document.hidden || raf) return;
      raf = requestAnimationFrame(drawFrame);
    }
    const onResize = () => requestDraw();
    const onVisibility = () => {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
      else requestDraw();
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.visualViewport?.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(canvas);
    }

    function dispose() {
      stopped = true; active = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      resizeObserver?.disconnect();
      activeFlares.forEach(flare => { sunGroup.remove(flare.mesh); flare.mesh.geometry.dispose(); flare.mesh.material.dispose(); });
      sun.geometry.dispose(); corona.geometry.dispose();
      sunMaterial.dispose(); coronaMaterial.dispose(); renderer.dispose();
    }
    resize();
    renderer.render(scene, camera);
    return {
      setActive(nextActive) {
        active = !!nextActive;
        lastFrame = 0;
        if (active) requestDraw();
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      },
      dispose
    };
  }

  window.LiveEarthSun3D = Object.freeze({ mount });

  /* Sun view layer: the existing shared sky container and Sun wallpaper remain intact. */
  const root = document.getElementById("le-sky-view");
  if (!root) return;

  const style = document.createElement("style");
  style.id = "le-sun-view-renderer-style";
  style.textContent = `
    #le-sky-view .le-sun-stage { position:absolute; inset:0; z-index:2; overflow:hidden; color:#fff0d6; pointer-events:none; }
    #le-sky-view .le-sun-stage[hidden] { display:none !important; }
    #le-sky-view .le-sun-canvas { position:absolute; inset:0; display:block; width:100%; height:100%; pointer-events:none; }
    #le-sky-view .le-sun-brand { position:absolute; z-index:2; top:calc(env(safe-area-inset-top) + 20px); left:22px; right:22px; color:#f9e8d2; font-size:12px; font-weight:800; letter-spacing:.24em; text-shadow:0 2px 12px #000; }
    #le-sky-view .le-sun-brand span { color:#ffb548; }
    #le-sky-view .le-sun-subtitle { display:block; margin-top:7px; color:#d1a878; font-size:9px; font-weight:500; letter-spacing:.18em; }
    #le-sky-view .le-sun-times { position:absolute; z-index:3; left:7%; right:7%; bottom:calc(env(safe-area-inset-bottom) + 44px); display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    #le-sky-view .le-sun-time-card { min-width:0; padding:11px 13px 10px; border:1px solid #f6c16c42; border-radius:14px; background:linear-gradient(145deg,#160e08d9,#050505c7); box-shadow:inset 0 1px #fff2d012,0 12px 30px #0005; text-align:left; }
    #le-sky-view .le-sun-time-label { display:block; color:#dfb780; font-size:9px; letter-spacing:.16em; }
    #le-sky-view .le-sun-time-value { display:block; min-height:26px; margin-top:6px; color:#fff0d6; font-size:clamp(18px,4.8vw,24px); line-height:1.2; font-weight:500; }
    #le-sky-view .le-sun-time-note { display:block; margin-top:4px; color:#a38a70; font-size:7px; line-height:1.4; letter-spacing:.08em; }
    #le-sky-view .le-sun-renderer-error { position:absolute; z-index:5; left:10%; right:10%; top:50%; transform:translateY(-50%); color:#ffe3b3; font-size:12px; text-align:center; text-shadow:0 2px 10px #000; }
    #le-sky-view .le-sun-renderer-error[hidden] { display:none !important; }
    @media (orientation:landscape) {
      #le-sky-view .le-sun-brand { top:calc(env(safe-area-inset-top) + 14px); left:20px; }
      #le-sky-view .le-sun-times { left:5%; right:auto; bottom:calc(env(safe-area-inset-bottom) + 20px); width:min(410px,52vw); gap:10px; }
      #le-sky-view .le-sun-time-card { padding:8px 11px; }
      #le-sky-view .le-sun-time-value { font-size:20px; }
    }
    @media (prefers-reduced-motion:reduce) { #le-sky-view .le-sun-stage * { animation:none !important; transition:none !important; } }
  `;
  document.head.appendChild(style);

  const stage = document.createElement("div");
  stage.className = "le-sun-stage";
  stage.hidden = true;
  stage.innerHTML = `
    <canvas class="le-sun-canvas" aria-label="Stationary 3D Sun with flowing simulated plasma and occasional simulated flares"></canvas>
    <div class="le-sun-brand">LIVE <span>//</span> EARTH<span class="le-sun-subtitle">SUN VIEW</span></div>
    <div class="le-sun-times" aria-label="Local sunrise and sunset">
      <div class="le-sun-time-card"><span class="le-sun-time-label">☀ SUNRISE</span><strong class="le-sun-time-value" data-sunrise>--:--</strong><small class="le-sun-time-note" data-sunrise-note>LOCATION OFF · TIMES HIDDEN</small></div>
      <div class="le-sun-time-card"><span class="le-sun-time-label">☼ SUNSET</span><strong class="le-sun-time-value" data-sunset>--:--</strong><small class="le-sun-time-note" data-sunset-note>LOCATION OFF · TIMES HIDDEN</small></div>
    </div>
    <div class="le-sun-renderer-error" hidden></div>`;
  root.appendChild(stage);

  const canvas = stage.querySelector(".le-sun-canvas");
  const sunriseValue = stage.querySelector("[data-sunrise]");
  const sunsetValue = stage.querySelector("[data-sunset]");
  const sunriseNote = stage.querySelector("[data-sunrise-note]");
  const sunsetNote = stage.querySelector("[data-sunset-note]");
  const errorNode = stage.querySelector(".le-sun-renderer-error");
  const isLocationEnabled = () => window.liveEarthGetLocationState?.() === true;
  let active = false, renderer = null, loading = null, observer = null, astronomy = null, timeTimer = 0;
  let latestLocalDay = "";
  let locationAttempt = null;

  function setHiddenTimes(note) {
    sunriseValue.textContent = "--:--";
    sunsetValue.textContent = "--:--";
    sunriseNote.textContent = note;
    sunsetNote.textContent = note;
  }
  function formatLocalTime(iso) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  }
  function updateTimesForObserver() {
    if (!active || !observer || !isLocationEnabled() || !astronomy) return;
    try {
      const result = astronomy.calculateAstronomy(observer.latitude, observer.longitude, new Date());
      if (!result?.sun) throw new Error("Solar times unavailable");
      const polar = result.sun.polar;
      sunriseValue.textContent = result.sun.sunrise ? formatLocalTime(result.sun.sunrise) : (polar === "midnight sun" ? "24-hour sun" : "No sunrise");
      sunsetValue.textContent = result.sun.sunset ? formatLocalTime(result.sun.sunset) : (polar === "midnight sun" ? "No sunset today" : "No sunset");
      const status = polar ? String(polar).toUpperCase() : "LOCAL TIME · APPROXIMATE";
      sunriseNote.textContent = status;
      sunsetNote.textContent = status;
      latestLocalDay = result.date || "";
    } catch (_) { setHiddenTimes("LOCAL TIMES UNAVAILABLE"); }
  }
  async function refreshObserverLocation() {
    if (!active || !isLocationEnabled()) { observer = null; setHiddenTimes("LOCATION OFF · TIMES HIDDEN"); return; }
    if (locationAttempt) return locationAttempt;
    if (!navigator.geolocation) { observer = null; setHiddenTimes("LOCATION UNAVAILABLE"); return; }
    locationAttempt = (async () => {
      try {
        astronomy = astronomy || await import("./astronomy.js");
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, maximumAge: 120000, timeout: 10000
        }));
        if (!active || !isLocationEnabled()) return;
        observer = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        updateTimesForObserver();
      } catch (error) {
        observer = null;
        if (!isLocationEnabled()) setHiddenTimes("LOCATION OFF · TIMES HIDDEN");
        else setHiddenTimes("LOCAL TIMES UNAVAILABLE");
        console.info("[LIVE // EARTH] Sun local-time calculation unavailable.", error?.message || error);
      } finally { locationAttempt = null; }
    })();
    return locationAttempt;
  }
  async function initializeRenderer() {
    if (renderer) return renderer;
    if (loading) return loading;
    loading = window.LiveEarthSun3D.mount(canvas).then(instance => {
      renderer = instance;
      return instance;
    }).catch(error => {
      errorNode.hidden = false;
      errorNode.textContent = "The 3D Sun could not start on this device. Home and Moon remain available.";
      console.error("[LIVE // EARTH] 3D Sun renderer could not initialize.", error);
      throw error;
    }).finally(() => { loading = null; });
    return loading;
  }
  async function activate() {
    active = true;
    stage.hidden = false;
    if (!isLocationEnabled()) setHiddenTimes("LOCATION OFF · TIMES HIDDEN");
    try {
      await initializeRenderer();
      if (!active) return;
      errorNode.hidden = true;
      renderer.setActive(true);
    } catch (_) { /* Preserve the rest of the app if this device cannot start WebGL. */ }
    if (isLocationEnabled()) {
      if (observer && astronomy) updateTimesForObserver();
      else refreshObserverLocation();
    }
    if (!timeTimer) timeTimer = window.setInterval(() => {
      if (!active) return;
      if (!isLocationEnabled()) { observer = null; setHiddenTimes("LOCATION OFF · TIMES HIDDEN"); return; }
      if (observer && astronomy) {
        const today = new Date();
        const key = astronomy.dayKey ? astronomy.dayKey(today) : `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
        if (key !== latestLocalDay) updateTimesForObserver();
      }
    }, 60000);
  }
  function deactivate() {
    active = false;
    stage.hidden = true;
    renderer?.setActive(false);
    if (timeTimer) window.clearInterval(timeTimer);
    timeTimer = 0;
  }
  window.addEventListener("live-earth-location-state", event => {
    if (event.detail?.enabled === true && isLocationEnabled()) {
      if (active) refreshObserverLocation();
    } else {
      observer = null;
      if (active) setHiddenTimes("LOCATION OFF · TIMES HIDDEN");
    }
  });
  window.addEventListener("live-earth-location-stop", () => {
    observer = null;
    if (active) setHiddenTimes("LOCATION OFF · TIMES HIDDEN");
  });
  window.LiveEarthViewModules.register("sun-procedural-renderer", { views: ["sun"], activate, deactivate });
})();
