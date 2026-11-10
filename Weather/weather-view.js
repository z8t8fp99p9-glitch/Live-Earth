/* LIVE // EARTH — Weather foundation, rebuilt cleanly.
   Visible scene scope for this stage: continuous terrain, low mountain forms,
   and one naturally winding river. No forecast UI, location reads, clouds,
   vegetation, decorative props, ocean, or weather effects are created here.
   The existing shared Stacks runtime and Global three-Orb dock remain the host. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Shared Stacks feature runtime is unavailable.');
    return;
  }

  const { mount, el } = runtime;
  const WEATHER_SCRIPT_URL = document.currentScript?.src || new URL('./Weather/weather-view.js', document.baseURI).href;
  const THREE_MODULE_URL = new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href;
  const STYLE_ID = 'le-weather-foundation-style';
  const LEGACY_STYLE_ID = 'le-weather-living-topography-style';

  function installStyles() {
    document.getElementById(LEGACY_STYLE_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #91bdc9 !important;
        isolation: isolate;
        pointer-events: none;
      }
      .le-sfv--weather > .le-weather-foundation-stage {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: linear-gradient(180deg, #91bdc9 0%, #a8cbd0 48%, #789b83 100%);
      }
      .le-sfv--weather .le-weather-foundation-canvas {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        outline: none;
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function gaussian(x, z, cx, cz, sx, sz, height) {
    const dx = (x - cx) / sx;
    const dz = (z - cz) / sz;
    return height * Math.exp(-0.5 * (dx * dx + dz * dz));
  }

  function weatherViewportProfile(width, height) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const aspect = safeWidth / safeHeight;
    const portrait = aspect < 0.90;
    const shortLandscape = !portrait && safeHeight < 520;
    const tablet = Math.min(safeWidth, safeHeight) >= 700;
    return {
      aspect,
      portrait,
      shortLandscape,
      tablet,
      fov: portrait ? (tablet ? 41 : 43) : shortLandscape ? 45 : 42,
      lookY: portrait ? 1.45 : 1.55,
      lookZ: portrait ? -3.6 : -2.0,
      rise: portrait ? (tablet ? 16.2 : 15.0) : shortLandscape ? 18.5 : 17.0,
      depth: portrait ? 39.0 : shortLandscape ? 39.0 : 38.0,
      yaw: portrait ? 0.0 : 0.10
    };
  }

  async function createTerrainRiver(host) {
    const THREE = await import(THREE_MODULE_URL);
    if (!host.isConnected) return { dispose() {} };

    const canvas = el('canvas', 'le-weather-foundation-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const deviceMemory = Number(navigator.deviceMemory || 8);
    const lowMemory = deviceMemory <= 4;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !lowMemory,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch (error) {
      console.error('[LIVE // EARTH] Terrain renderer could not start.', error);
      return { dispose() { canvas.remove(); } };
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#9bc2cc');

    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 240);

    // Neutral natural light only; there are no visible sky objects or weather FX.
    const hemisphere = new THREE.HemisphereLight('#eaf4ef', '#526d52', 1.55);
    scene.add(hemisphere);
    const sunlight = new THREE.DirectionalLight('#fff0d6', 2.05);
    sunlight.position.set(-15, 22, 16);
    sunlight.castShadow = true;
    sunlight.shadow.bias = -0.0002;
    sunlight.shadow.normalBias = 0.025;
    sunlight.shadow.mapSize.set(lowMemory ? 512 : 1024, lowMemory ? 512 : 1024);
    sunlight.shadow.camera.left = -36;
    sunlight.shadow.camera.right = 36;
    sunlight.shadow.camera.top = 38;
    sunlight.shadow.camera.bottom = -38;
    scene.add(sunlight);

    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // A broad continuous landform. Its far edge is gently irregular, not a platform.
    const MAP_W = 64;
    const BACK_Z = -32;
    const FRONT_Z = 38;
    const GRID_X = lowMemory ? 112 : 168;
    const GRID_Z = lowMemory ? 150 : 224;
    const HALF_W = MAP_W / 2;

    // The river guide is shared by the valley cut and the visible water ribbon.
    // Coordinates progress from the mountain headwaters toward the near foreground.
    const riverGuide = [
      [-1.6, -31.0], [-0.9, -27.0], [0.7, -23.0], [3.1, -19.0],
      [4.7, -15.0], [4.0, -11.0], [1.6, -7.0], [-1.2, -3.0],
      [-3.2, 1.0], [-3.5, 5.0], [-1.6, 9.0], [1.1, 13.0],
      [2.5, 18.0], [1.8, 23.0], [0.0, 28.0], [-0.8, 34.0], [0.2, 39.0]
    ];

    function riverCenterX(z) {
      if (z <= riverGuide[0][1]) return riverGuide[0][0];
      const last = riverGuide.length - 1;
      if (z >= riverGuide[last][1]) return riverGuide[last][0];
      for (let i = 0; i < last; i++) {
        const a = riverGuide[i];
        const b = riverGuide[i + 1];
        if (z >= a[1] && z <= b[1]) {
          const t = smoothstep(a[1], b[1], z);
          return a[0] + (b[0] - a[0]) * t;
        }
      }
      return 0;
    }

    const mountainPeaks = [
      { x: -21.0, z: -20.0, sx: 4.8, sz: 5.8, h: 2.55 },
      { x: -14.0, z: -22.5, sx: 4.2, sz: 5.2, h: 3.35 },
      { x: -6.0, z: -19.7, sx: 4.3, sz: 5.1, h: 3.75 },
      { x: 3.0, z: -21.0, sx: 4.1, sz: 5.2, h: 3.30 },
      { x: 12.5, z: -18.6, sx: 4.8, sz: 5.9, h: 2.85 },
      { x: 21.0, z: -21.3, sx: 5.0, sz: 5.8, h: 2.25 }
    ];

    function rawTerrainHeight(x, z) {
      const broadRolling =
        0.42 +
        0.17 * Math.sin(x * 0.19 + z * 0.075) +
        0.14 * Math.cos(z * 0.21 - x * 0.13) +
        0.075 * Math.sin((x + z) * 0.48) * Math.cos(x * 0.31);

      const ridgeCenter = -2.2 + 0.19 * (z + 18) + 1.1 * Math.sin(z * 0.16);
      const connectedRidge =
        0.92 * Math.exp(-((x - ridgeCenter) ** 2) / (2 * 4.4 * 4.4)) *
        smoothstep(-30, -24, z) * (1 - smoothstep(-6, 1, z));

      let peaks = 0;
      for (const peak of mountainPeaks) {
        peaks += gaussian(x, z, peak.x, peak.z, peak.sx, peak.sz, peak.h);
      }

      const foothills =
        gaussian(x, z, -21, -5, 8.5, 11.0, 1.05) +
        gaussian(x, z, 15, -5.5, 9.0, 10.5, 0.95) +
        gaussian(x, z, -4, 4, 12.0, 13.0, 0.50) +
        gaussian(x, z, 18, 13, 10.0, 12.0, 0.34);

      const softDetail =
        0.055 * Math.sin(x * 0.76 + z * 0.57) +
        0.040 * Math.cos(z * 0.83 - x * 0.42);

      return Math.max(0.10, broadRolling + connectedRidge + peaks + foothills + softDetail);
    }

    function terrainHeightAt(x, z) {
      const distance = x - riverCenterX(z);
      const broadValley = 0.50 * Math.exp(-(distance * distance) / (2 * 1.45 * 1.45));
      const channelBed = 0.13 * Math.exp(-(distance * distance) / (2 * 0.50 * 0.50));
      return Math.max(0.06, rawTerrainHeight(x, z) - broadValley - channelBed);
    }

    const terrainPositions = [];
    const terrainColors = [];
    const terrainIndices = [];
    const grassLow = new THREE.Color('#527b55');
    const grassMid = new THREE.Color('#789565');
    const meadow = new THREE.Color('#98a675');
    const warmStone = new THREE.Color('#a47c58');
    const highStone = new THREE.Color('#b69a78');
    const vertexColor = new THREE.Color();

    for (let iz = 0; iz <= GRID_Z; iz++) {
      const v = iz / GRID_Z;
      for (let ix = 0; ix <= GRID_X; ix++) {
        const u = ix / GRID_X;
        const x = -HALF_W + u * MAP_W;
        const backEdge = BACK_Z + 1.35 * Math.sin(x * 0.115) + 0.62 * Math.sin(x * 0.31 + 0.8);
        const z = backEdge + v * (FRONT_Z - backEdge);
        const y = terrainHeightAt(x, z);

        vertexColor.copy(grassLow).lerp(grassMid, smoothstep(0.25, 1.35, y) * 0.9);
        vertexColor.lerp(meadow, smoothstep(0.9, 2.3, y) * 0.42);
        vertexColor.lerp(warmStone, smoothstep(2.1, 3.45, y) * 0.72);
        vertexColor.lerp(highStone, smoothstep(3.15, 4.25, y) * 0.62);
        const grain = 0.965 + 0.035 * Math.sin(x * 0.44 + z * 0.35) * Math.cos(z * 0.39 - x * 0.24);
        vertexColor.multiplyScalar(grain);

        terrainPositions.push(x, y, z);
        terrainColors.push(vertexColor.r, vertexColor.g, vertexColor.b);

        if (ix < GRID_X && iz < GRID_Z) {
          const a = iz * (GRID_X + 1) + ix;
          const b = (iz + 1) * (GRID_X + 1) + ix;
          const c = a + 1;
          const d = b + 1;
          terrainIndices.push(a, b, c, c, b, d);
        }
      }
    }

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
    terrainGeometry.setIndex(terrainIndices);
    terrainGeometry.computeVertexNormals();
    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.0
    });
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    terrainGroup.add(terrain);

    // A single continuous, smooth ribbon follows the carved valley.
    const riverPoints = riverGuide.map(([x, z]) => new THREE.Vector3(x, terrainHeightAt(x, z) + 0.035, z));
    const riverCurve = new THREE.CatmullRomCurve3(riverPoints, false, 'centripetal', 0.42);
    const RIVER_SEGMENTS = lowMemory ? 176 : 280;
    const RIVER_ROWS = RIVER_SEGMENTS + 1;
    const riverPositions = [];
    const riverColors = [];
    const riverUvs = [];
    const riverIndices = [];
    const deepWater = new THREE.Color('#287f8e');
    const midWater = new THREE.Color('#3ca5ad');
    const shallowWater = new THREE.Color('#83d0c4');
    const waterColor = new THREE.Color();

    for (let i = 0; i <= RIVER_SEGMENTS; i++) {
      const t = i / RIVER_SEGMENTS;
      const point = riverCurve.getPoint(t);
      const tangent = riverCurve.getTangent(t);
      const sideX = -tangent.z;
      const sideZ = tangent.x;
      const sideLength = Math.hypot(sideX, sideZ) || 1;
      const nx = sideX / sideLength;
      const nz = sideZ / sideLength;
      const widening = smoothstep(0.02, 0.46, t) * (1 - smoothstep(0.86, 1.0, t));
      const halfWidth = 0.48 + 0.30 * widening + 0.075 * Math.sin(t * Math.PI * 5.0);

      for (let cross = 0; cross < 3; cross++) {
        const across = cross - 1;
        const x = point.x + nx * halfWidth * across;
        const z = point.z + nz * halfWidth * across;
        const y = terrainHeightAt(x, z) + 0.065;
        riverPositions.push(x, y, z);
        riverUvs.push(t * 3.4, (across + 1) * 0.5);

        if (cross === 1) waterColor.copy(deepWater).lerp(midWater, 0.22);
        else waterColor.copy(midWater).lerp(shallowWater, 0.62);
        riverColors.push(waterColor.r, waterColor.g, waterColor.b);
      }

      if (i < RIVER_SEGMENTS) {
        const row = i * 3;
        const next = row + 3;
        riverIndices.push(
          row, row + 1, next,
          row + 1, next + 1, next,
          row + 1, row + 2, next + 1,
          row + 2, next + 2, next + 1
        );
      }
    }

    const riverGeometry = new THREE.BufferGeometry();
    riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
    riverGeometry.setAttribute('color', new THREE.Float32BufferAttribute(riverColors, 3));
    riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(riverUvs, 2));
    riverGeometry.setIndex(riverIndices);
    riverGeometry.computeVertexNormals();

    const riverMaterial = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.19,
      metalness: 0.035,
      clearcoat: 0.92,
      clearcoatRoughness: 0.13,
      side: THREE.DoubleSide
    });
    const river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.receiveShadow = true;
    terrainGroup.add(river);

    // Only a restrained surface movement on the river itself; no additional FX.
    const riverBasePositions = new Float32Array(riverPositions);
    const riverPositionAttribute = riverGeometry.attributes.position;
    const resize = () => {
      if (disposed) return;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || host.clientWidth || innerWidth));
      const height = Math.max(1, Math.round(rect.height || host.clientHeight || innerHeight));
      const profile = weatherViewportProfile(width, height);
      camera.fov = profile.fov;
      camera.aspect = profile.aspect;
      camera.updateProjectionMatrix();
      const target = new THREE.Vector3(0, profile.lookY, profile.lookZ);
      const horizontal = Math.sqrt(Math.max(0, 1 - Math.pow(profile.rise / Math.hypot(profile.rise, profile.depth), 2)));
      const distance = Math.hypot(profile.rise, profile.depth);
      camera.position.set(
        target.x + Math.sin(profile.yaw) * distance * horizontal,
        target.y + profile.rise,
        target.z + Math.cos(profile.yaw) * distance * horizontal
      );
      camera.lookAt(target);

      const dprCap = lowMemory ? 1.0 : 1.35;
      const pixelBudget = Math.sqrt(1900000 / Math.max(1, width * height));
      renderer.setPixelRatio(Math.max(0.8, Math.min(window.devicePixelRatio || 1, dprCap, pixelBudget)));
      renderer.setSize(width, height, false);
      if (reducedMotion) renderer.render(scene, camera);
    };

    let animationFrame = 0;
    let disposed = false;
    let lastFrame = 0;
    let elapsed = 0;
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', resize, { passive: true });
    window.visualViewport?.addEventListener('resize', resize, { passive: true });

    function render(now = 0) {
      if (disposed || document.hidden || !host.isConnected) return;
      if (!reducedMotion) animationFrame = requestAnimationFrame(render);
      if (now - lastFrame < 1000 / 30) return;
      const delta = Math.min((now - (lastFrame || now)) / 1000 || 0.016, 0.045);
      lastFrame = now;
      elapsed += delta;
      if (!reducedMotion) {
        const positions = riverPositionAttribute.array;
        for (let i = 0; i < riverBasePositions.length; i += 3) {
          const rowT = Math.floor(i / 9) / RIVER_SEGMENTS;
          const cross = (i % 9) / 3;
          const ripple = Math.sin(elapsed * 1.45 - rowT * 17.0 + cross * 0.7) * 0.008;
          positions[i + 1] = riverBasePositions[i + 1] + ripple;
        }
        riverPositionAttribute.needsUpdate = true;
      }
      renderer.render(scene, camera);
    }

    function onVisibility() {
      if (document.hidden) {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else if (!reducedMotion && !animationFrame && !disposed) {
        lastFrame = 0;
        animationFrame = requestAnimationFrame(render);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    resize();
    if (reducedMotion) renderer.render(scene, camera);
    else animationFrame = requestAnimationFrame(render);

    function dispose() {
      if (disposed) return;
      disposed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      terrainGeometry.dispose();
      terrainMaterial.dispose();
      riverGeometry.dispose();
      riverMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
    }

    return { dispose };
  }

  function activateWeather() {
    const view = mount('weather');
    if (!view) return;

    installStyles();
    // Remove the former Weather header, pill, status, data and controls entirely.
    // The three Global Orbs are owned by the shared shell and are not touched.
    view.panel.remove();
    view.root.replaceChildren();
    const stage = el('div', 'le-weather-foundation-stage');
    stage.setAttribute('aria-hidden', 'true');
    view.root.appendChild(stage);

    let disposed = false;
    let engine = null;
    const enginePromise = createTerrainRiver(stage).then(instance => {
      if (disposed) {
        instance.dispose?.();
        return null;
      }
      engine = instance;
      return instance;
    }).catch(error => {
      console.error('[LIVE // EARTH] Terrain and river scene failed to initialize.', error);
      return null;
    });

    return () => {
      disposed = true;
      if (engine) engine.dispose?.();
      else enginePromise.then(instance => instance?.dispose?.());
    };
  }

  // Foundation stage intentionally does not call liveEarthLocationAllowed() or
  // request Open-Meteo data. Those integrations are deferred until the base world
  // is approved. No browser Geolocation API, storage, or network request is used.
  runtime.registerFeature('weather', activateWeather);
})();
