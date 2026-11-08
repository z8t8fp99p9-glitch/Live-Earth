/* LIVE // EARTH — Earth View Controller.
   Owns the full-screen Earth View lifecycle, controls and camera.
   Default finger rotation and pinch zoom are supplied by the reusable Earth Engine. */
(() => {
  "use strict";
  if (window.__liveEarthEarthRendererInstalled) return;

  const STYLE_ID = "le-independent-earth-view-style";
  const STAGE_ID = "le-ev-stage";
  const QUALITY_KEY = "liveEarthQuality";
  const FOV = 34;
  const TARGET_DIAMETER = 1.34;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #le-sky-view .le-ev-stage{position:absolute;z-index:2;inset:0;overflow:hidden;touch-action:none;background:transparent}
    #le-sky-view .le-ev-canvas{display:block;width:100%;height:100%;outline:none;touch-action:none;-webkit-tap-highlight-color:transparent}
    #le-quality-controls{position:fixed;z-index:12;left:50%;bottom:calc(env(safe-area-inset-bottom) + 139px);transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:10px;padding:6px;border:1px solid rgba(210,240,255,.26);border-radius:999px;background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(16,34,54,.72) 48%,rgba(0,5,15,.76));box-shadow:inset 1px 1px 2px rgba(255,255,255,.25),inset -2px -3px 6px rgba(0,0,0,.45),0 8px 24px #0008;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);pointer-events:auto}
    #le-quality-controls[hidden],#le-location-scanner[hidden]{display:none}
    #le-quality-controls button{touch-action:manipulation}
    .le-quality-button{min-width:78px;padding:10px 13px;border-radius:999px;border:1px solid rgba(197,230,255,.24);color:#cfe8f8;background:rgba(255,255,255,.045);font:650 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.09em;text-transform:uppercase;-webkit-tap-highlight-color:transparent}
    .le-quality-button[aria-pressed="true"]{color:#f5fcff;border-color:rgba(153,226,255,.8);background:linear-gradient(135deg,rgba(102,204,255,.25),rgba(255,255,255,.1));box-shadow:inset 1px 1px 2px #ffffff50,0 0 14px rgba(71,187,255,.22)}
    .le-quality-button:active,.le-zoom-button:active{transform:scale(.96)}
    .le-zoom-button{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(197,230,255,.28);color:#edf9ff;background:rgba(255,255,255,.07);font:600 23px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    .le-zoom-button:focus-visible,.le-quality-button:focus-visible{outline:2px solid #8de1ff;outline-offset:3px}
    #le-location-scanner{position:fixed;z-index:12;right:max(16px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 16px);display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:999px;border:1px solid rgba(255,70,100,.42);color:#ffeaf0;background:linear-gradient(145deg,rgba(90,12,32,.72),rgba(5,8,18,.84));box-shadow:inset 1px 1px 2px #ffffff24,0 5px 18px #0008;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #le-location-scanner[aria-pressed="true"]{border-color:rgba(255,105,130,.95);box-shadow:inset 1px 1px 2px #ffffff30,0 0 14px rgba(255,35,75,.38),0 5px 18px #0008;color:#fff}
    #le-location-scanner .le-radar-dot{width:7px;height:7px;border-radius:50%;background:#ff234d;box-shadow:0 0 8px #ff234d}
    @media(max-height:560px){#le-quality-controls{bottom:calc(env(safe-area-inset-bottom) + 100px)}.le-quality-button{min-width:68px;padding:8px 10px}.le-zoom-button{width:34px;height:34px}}
    @media(prefers-reduced-motion:reduce){#le-quality-controls,.le-quality-button{transition:none!important}}
  `;
  document.head.appendChild(style);

  const controls = document.createElement("div");
  controls.id = "le-quality-controls";
  controls.hidden = true;
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Independent Earth View controls");
  controls.innerHTML = `
    <button type="button" class="le-zoom-button" data-zoom="out" aria-label="Zoom out" title="Zoom out">−</button>
    <button type="button" class="le-quality-button" data-quality="basic" aria-pressed="true">Basic</button>
    <button type="button" class="le-quality-button" data-quality="hd" aria-pressed="false">HD</button>
    <button type="button" class="le-zoom-button" data-zoom="in" aria-label="Zoom in" title="Zoom in">+</button>`;
  document.body.appendChild(controls);

  const scannerButton = document.createElement("button");
  scannerButton.type = "button";
  scannerButton.id = "le-location-scanner";
  scannerButton.hidden = true;
  scannerButton.setAttribute("aria-pressed", "false");
  scannerButton.setAttribute("aria-label", "Show or hide the approved Location marker in Earth View");
  scannerButton.innerHTML = '<span class="le-radar-dot" aria-hidden="true"></span><span>Scanner</span>';
  document.body.appendChild(scannerButton);

  let stage = null;
  let canvas = null;
  let T = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGroup = null;
  let earthMesh = null;
  let atmosphere = null;
  let locationMarker = null;
  let earthGlobe = null;
  let earthInteractions = null;
  let quality = "basic";
  let active = false;
  let activationGeneration = 0;
  let initialized = false;
  let initPromise = null;
  let drawFrame = 0;
  let animationFrame = 0;
  let solarTimer = 0;
  let resizeObserver = null;
  let baseDistance = 0;
  let scannerVisible = false;
  let entering = false;
  let lastWidth = 0;
  let lastHeight = 0;
  let lastPixelRatio = 0;
  const fovRadians = FOV * Math.PI / 180;
  let solarVector = null;
  let shaderUniforms = null;
  let resizeSettleTimers = [];

  try { quality = localStorage.getItem(QUALITY_KEY) === "hd" ? "hd" : "basic"; } catch (_) {}

  function showStatus(message, duration = 2600) {
    const status = document.querySelector("#status");
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    if (duration > 0) window.setTimeout(() => {
      if (status.textContent === message) status.hidden = true;
    }, duration);
  }

  function paintQuality() {
    controls.querySelectorAll("[data-quality]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.quality === quality));
    });
  }

  function makeStage() {
    if (stage?.isConnected) return;
    const root = document.getElementById("le-sky-view");
    if (!root) throw new Error("The shared Sky View stage is not ready.");
    stage = document.createElement("div");
    stage.id = STAGE_ID;
    stage.className = "le-ev-stage";
    stage.hidden = true;
    canvas = document.createElement("canvas");
    canvas.className = "le-ev-canvas";
    canvas.setAttribute("aria-label", "Interactive independent 3D Earth");
    canvas.setAttribute("role", "img");
    stage.appendChild(canvas);
    root.appendChild(stage);
    // The Engine binds the shared capture-phase pointer handler after creating
    // its globe. No view-specific drag implementation is installed here.
    if (resizeObserver) {
      resizeObserver.observe(stage);
      stage.dataset.resizeObserved = "true";
    }
  }

  function viewport() {
    const rect = stage?.getBoundingClientRect?.() || { width: 0, height: 0 };
    const visual = window.visualViewport;
    return {
      width: Math.max(1, Math.round(rect.width || visual?.width || window.innerWidth || 1)),
      height: Math.max(1, Math.round(rect.height || visual?.height || window.innerHeight || 1))
    };
  }

  function distanceForDiameter(diameterFraction) {
    const size = viewport();
    const shortest = Math.max(1, Math.min(size.width, size.height));
    return size.height / (diameterFraction * shortest * Math.tan(fovRadians / 2));
  }

  function homeEquivalentDistance() {
    // Home's approved camera fits the globe to 75% of the shorter screen edge.
    return distanceForDiameter(0.75);
  }

  function cinematicDistance() {
    return distanceForDiameter(TARGET_DIAMETER);
  }

  function queueDraw() {
    if (!active || !renderer || !scene || !camera || drawFrame) return;
    drawFrame = requestAnimationFrame(() => {
      drawFrame = 0;
      if (active && renderer && scene && camera) renderer.render(scene, camera);
    });
  }

  function stopCameraAnimation() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function animateCamera(target, duration = 860, onComplete = null) {
    stopCameraAnimation();
    if (!camera) return;
    const startDistance = camera.position.z;
    const startedAt = performance.now();
    const length = reducedMotion() ? 0 : duration;
    const tick = now => {
      if (!active || !camera) { animationFrame = 0; return; }
      const progress = length ? clamp((now - startedAt) / length, 0, 1) : 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      camera.position.z = startDistance + (target - startDistance) * eased;
      camera.lookAt(0, 0, 0);
      queueDraw();
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
      else { animationFrame = 0; onComplete?.(); }
    };
    if (!length) {
      camera.position.z = target;
      camera.lookAt(0, 0, 0);
      queueDraw();
      onComplete?.();
      return;
    }
    animationFrame = requestAnimationFrame(tick);
  }

  function setQuality(next) {
    quality = next === "hd" ? "hd" : "basic";
    try { localStorage.setItem(QUALITY_KEY, quality); } catch (_) {}
    if (renderer && earthMesh && earthGlobe) {
      earthGlobe.setGeometryDetail(quality === "hd" ? "high" : "standard");
      const pixelRatio = Math.min(window.devicePixelRatio || 1, quality === "hd" ? 1.5 : 1);
      renderer.setPixelRatio(pixelRatio);
      lastPixelRatio = pixelRatio;
      resizeRenderer(false);
    }
    paintQuality();
    queueDraw();
    return quality;
  }

  function zoomBy(factor) {
    if (!active || !camera || !Number.isFinite(factor) || factor <= 0) return;
    entering = false;
    const minimum = cinematicDistance() * (quality === "hd" ? 0.72 : 0.86);
    const maximum = baseDistance || homeEquivalentDistance();
    const target = clamp(camera.position.z * factor, minimum, maximum);
    animateCamera(target, 360);
  }

  function syncLocationMarker() {
    if (!locationMarker) return;
    const allowed = window.liveEarthLocationAllowed?.() === true;
    const api = window.LiveEarthScene;
    const position = allowed ? api?.getLocation?.() : null;
    if (!position || !Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)) {
      locationMarker.visible = false;
      queueDraw();
      return;
    }
    const latitude = position.latitude * Math.PI / 180;
    const longitude = position.longitude * Math.PI / 180;
    const vector = new T.Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      -Math.cos(latitude) * Math.sin(longitude)
    ).normalize();
    locationMarker.children[0].position.copy(vector).multiplyScalar(1.006);
    locationMarker.children[1].position.copy(vector).multiplyScalar(1.019);
    locationMarker.visible = scannerVisible;
    queueDraw();
  }

  function updateSolarDirection(date = new Date()) {
    if (!earthMesh || !solarVector || !T) return;
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
    const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const gamma = 2 * Math.PI / 365 * (day - 1 + (hour - 12) / 24);
    const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    const equationMinutes = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const subsolarLongitude = (720 - (hour * 60 + equationMinutes)) * Math.PI / 720;
    const local = new T.Vector3(
      Math.cos(declination) * Math.cos(subsolarLongitude),
      Math.sin(declination),
      -Math.cos(declination) * Math.sin(subsolarLongitude)
    ).normalize();
    const worldQuaternion = new T.Quaternion();
    earthMesh.getWorldQuaternion(worldQuaternion);
    solarVector.copy(local).applyQuaternion(worldQuaternion).normalize();
    const light = scene.children.find(object => object.isDirectionalLight && object.userData.leSolarKey);
    if (light) {
      light.position.copy(solarVector).multiplyScalar(12);
      light.target.position.set(0, 0, 0);
      light.target.updateMatrixWorld();
    }
    if (shaderUniforms?.uLESunDirection) shaderUniforms.uLESunDirection.value.copy(solarVector).negate();
    queueDraw();
  }

  function installDayNightShader(material) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uLESunDirection = { value: solarVector.clone().negate() };
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec3 vLEWorldNormal;\nvoid main() {")
        .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n vLEWorldNormal = normalize(mat3(modelMatrix) * objectNormal);");
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 uLESunDirection;\nvarying vec3 vLEWorldNormal;\nvoid main() {")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          float leSolarDot = dot(normalize(vLEWorldNormal), normalize(uLESunDirection));
          float leNight = 1.0 - smoothstep(-0.10, 0.08, leSolarDot);
          float leTwilight = 1.0 - smoothstep(0.015, 0.24, abs(leSolarDot));
          totalEmissiveRadiance += diffuseColor.rgb * leNight * 0.14;
          totalEmissiveRadiance += vec3(0.012, 0.026, 0.052) * leTwilight * 0.20;`);
      shaderUniforms = shader.uniforms;
    };
    material.customProgramCacheKey = () => "live-earth-independent-day-night-v1";
    material.needsUpdate = true;
  }

  function addStars() {
    const positions = [];
    let seed = 721;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 500; i++) {
      const radius = 18 + random() * 25;
      const angle = random() * Math.PI * 2;
      const z = random() * 2 - 1;
      const ring = Math.sqrt(1 - z * z);
      positions.push(radius * ring * Math.cos(angle), radius * z, radius * ring * Math.sin(angle));
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    scene.add(new T.Points(geometry, new T.PointsMaterial({ color: 0xa9c9ec, size: 0.045, transparent: true, opacity: 0.72 })));
  }

  function addLocationMarker() {
    locationMarker = new T.Group();
    const halo = new T.Mesh(
      new T.SphereGeometry(0.031, 16, 12),
      new T.MeshBasicMaterial({ color: 0xff234d, transparent: true, opacity: 0.28, depthWrite: false })
    );
    const dot = new T.Mesh(
      new T.SphereGeometry(0.014, 16, 12),
      new T.MeshBasicMaterial({ color: 0xff183f, depthWrite: false })
    );
    locationMarker.add(halo, dot);
    locationMarker.visible = false;
    earthMesh.add(locationMarker);
  }

  async function initializeRenderer() {
    if (initialized) return true;
    if (initPromise) return initPromise;
    makeStage();
    initPromise = (async () => {
      T = await import("../vendor/three.module.js");
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.setClearColor(0x02050b, 1);
      scene = new T.Scene();
      scene.background = new T.Color(0x02050b);
      const size = viewport();
      camera = new T.PerspectiveCamera(FOV, size.width / size.height, 0.1, 180);
      camera.position.set(0, 0, homeEquivalentDistance());
      camera.lookAt(0, 0, 0);

      scene.add(new T.AmbientLight(0x8aa7c8, 0.12));
      const sunlight = new T.DirectionalLight(0xffffff, 2.3);
      sunlight.userData.leSolarKey = true;
      sunlight.position.set(-3, 2, 4);
      scene.add(sunlight);
      const fill = new T.DirectionalLight(0x245b9b, 0.055);
      fill.position.set(4, -2, -3);
      scene.add(fill);

      const engineModule = await import("../EarthEngine/Core/earth-engine.js");
      const createEarthGlobe = engineModule.createEarthGlobe || engineModule.createGlobe || window.LiveEarthEngine?.createGlobe;
      if (typeof createEarthGlobe !== "function") throw new Error("The reusable Earth Engine API is unavailable.");
      earthGlobe = await createEarthGlobe({
        THREE: T,
        radius: 1,
        textureUrl: "./EarthEngine/Assets/earth-land-ocean-ice-2048.png",
        geometryDetail: quality === "hd" ? "high" : "standard",
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
        atmosphere: true
      });
      earthGroup = earthGlobe.group;
      earthMesh = earthGlobe.surface;
      atmosphere = earthGlobe.atmosphere;
      scene.add(earthGroup);
      earthInteractions = earthGlobe.attachInteractions({
        element: canvas,
        enabled: () => active,
        rotation: {
          sensitivityX: 0.008,
          sensitivityY: 0.006,
          minPitch: -1.25,
          maxPitch: 1.25
        },
        zoom: {
          enabled: true,
          getDistance: () => camera.position.z,
          setDistance: distance => {
            camera.position.z = distance;
            camera.lookAt(0, 0, 0);
          },
          minDistance: () => cinematicDistance() * (quality === "hd" ? 0.72 : 0.86),
          maxDistance: () => baseDistance || homeEquivalentDistance()
        },
        onStart: () => {
          entering = false;
          stopCameraAnimation();
        },
        onRotate: () => {
          updateSolarDirection();
          queueDraw();
        },
        onZoom: () => {
          camera.lookAt(0, 0, 0);
          queueDraw();
        }
      });
      solarVector = new T.Vector3(0, 0, 1);
      installDayNightShader(earthMesh.material);
      addLocationMarker();
      addStars();
      initialized = true;
      setQuality(quality);
      resizeRenderer(true);
      updateSolarDirection();
      queueDraw();
      return true;
    })().catch(error => {
      initPromise = null;
      console.error("[LIVE // EARTH] Independent Earth renderer could not initialize.", error);
      showStatus("Earth View could not load its local 3D resources. Home Earth remains untouched.", 6000);
      throw error;
    });
    return initPromise;
  }

  function resizeRenderer(resetDistance = false) {
    if (!active || !renderer || !camera || !stage) return;
    const size = viewport();
    const previousBase = baseDistance || homeEquivalentDistance();
    const previousRatio = camera.position.z > 0 ? camera.position.z / previousBase : 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, quality === "hd" ? 1.5 : 1);
    if (size.width !== lastWidth || size.height !== lastHeight || pixelRatio !== lastPixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(size.width, size.height, false);
      lastWidth = size.width;
      lastHeight = size.height;
      lastPixelRatio = pixelRatio;
    }
    camera.aspect = size.width / size.height;
    camera.fov = FOV;
    camera.updateProjectionMatrix();
    baseDistance = homeEquivalentDistance();
    if (resetDistance) camera.position.z = baseDistance;
    else {
      const minimum = cinematicDistance() * (quality === "hd" ? 0.72 : 0.86);
      camera.position.z = clamp(baseDistance * previousRatio, minimum, baseDistance);
    }
    camera.lookAt(0, 0, 0);
    queueDraw();
  }

  function queueResize(settle = false) {
    if (!active) return;
    const continueEntry = entering;
    if (settle) {
      resizeSettleTimers.forEach(timer => clearTimeout(timer));
      resizeSettleTimers = [100, 300, 650].map(delay => window.setTimeout(() => {
        if (!active) return;
        stopCameraAnimation();
        resizeRenderer(false);
        if (continueEntry && entering) animateCamera(cinematicDistance(), 380, () => { entering = false; });
      }, delay));
    }
    requestAnimationFrame(() => {
      if (!active) return;
      stopCameraAnimation();
      resizeRenderer(false);
      if (continueEntry && entering) animateCamera(cinematicDistance(), 380, () => { entering = false; });
    });
  }

  function activate() {
    active = true;
    const activation = ++activationGeneration;
    makeStage();
    stage.hidden = false;
    controls.hidden = false;
    scannerButton.hidden = false;
    paintQuality();
    initializeRenderer().then(() => {
      if (!active || activation !== activationGeneration) return;
      resizeRenderer(true);
      camera.position.z = baseDistance;
      camera.lookAt(0, 0, 0);
      syncLocationMarker();
      updateSolarDirection();
      queueDraw();
      entering = true;
      animateCamera(cinematicDistance(), 900, () => { entering = false; });
      if (!solarTimer) solarTimer = window.setInterval(() => {
        if (active && !document.hidden) updateSolarDirection(new Date());
      }, 30000);
    }).catch(() => {});
    window.dispatchEvent(new CustomEvent("live-earth-exclusive-mode", { detail: { active: true } }));
  }

  function deactivate() {
    active = false;
    activationGeneration++;
    entering = false;
    stopCameraAnimation();
    earthInteractions?.reset();
    if (drawFrame) cancelAnimationFrame(drawFrame);
    drawFrame = 0;
    if (solarTimer) window.clearInterval(solarTimer);
    solarTimer = 0;
    resizeSettleTimers.forEach(timer => clearTimeout(timer));
    resizeSettleTimers = [];
    if (stage) stage.hidden = true;
    controls.hidden = true;
    scannerButton.hidden = true;
    scannerVisible = false;
    scannerButton.setAttribute("aria-pressed", "false");
    if (locationMarker) locationMarker.visible = false;
    window.dispatchEvent(new CustomEvent("live-earth-exclusive-mode", { detail: { active: false } }));
  }

  controls.querySelectorAll("[data-quality]").forEach(button => {
    button.addEventListener("click", () => setQuality(button.dataset.quality));
  });
  controls.querySelectorAll("[data-zoom]").forEach(button => {
    button.addEventListener("click", () => zoomBy(button.dataset.zoom === "in" ? 0.82 : 1.22));
  });
  scannerButton.addEventListener("click", () => {
    if (window.liveEarthLocationAllowed?.() !== true) {
      scannerVisible = false;
      scannerButton.setAttribute("aria-pressed", "false");
      syncLocationMarker();
      showStatus("Turn the Location Orb ON first. Earth View will not request your location.");
      return;
    }
    scannerVisible = !scannerVisible;
    scannerButton.setAttribute("aria-pressed", String(scannerVisible));
    syncLocationMarker();
    showStatus(scannerVisible ? "Location Scanner ON · showing the approved marker in Earth View." : "Location Scanner hidden · Location remains ON.");
  });

  window.addEventListener("live-earth-location-state", event => {
    if (event.detail?.enabled !== true) {
      scannerVisible = false;
      scannerButton.setAttribute("aria-pressed", "false");
    }
    if (active) syncLocationMarker();
  });
  window.addEventListener("live-earth-location-stop", () => {
    scannerVisible = false;
    scannerButton.setAttribute("aria-pressed", "false");
    if (active) syncLocationMarker();
  });
  window.addEventListener("resize", () => queueResize(false), { passive: true });
  window.addEventListener("orientationchange", () => queueResize(true), { passive: true });
  window.addEventListener("pageshow", () => queueResize(true), { passive: true });
  window.visualViewport?.addEventListener("resize", () => queueResize(true), { passive: true });
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(() => queueResize(false));
  }

  function registerModule() {
    if (!window.LiveEarthViewModules || window.LiveEarthViewModules.has("earth-independent-renderer")) return;
    window.LiveEarthViewModules.register("earth-independent-renderer", {
      views: ["earth"],
      activate,
      deactivate
    });
    window.__liveEarthEarthRendererInstalled = true;
    window.dispatchEvent(new Event("live-earth-startup-ready"));
  }

  function registerAfterSkyHost() {
    // Register after the shared host so the registry opens #le-sky-view before
    // this controller attempts to create its independent Earth stage.
    if (window.LiveEarthSkyViews && document.getElementById("le-sky-view")) {
      registerModule();
      return;
    }
    window.addEventListener("live-earth-sky-view-ready", registerModule, { once: true });
  }
  if (window.LiveEarthViewModules) registerAfterSkyHost();
  else window.addEventListener("live-earth-view-modules-ready", registerAfterSkyHost, { once: true });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !window.LiveEarthViewManager?.isActive("earth")) return;
    window.LiveEarthViewManager.requestView("home");
  });
})();
