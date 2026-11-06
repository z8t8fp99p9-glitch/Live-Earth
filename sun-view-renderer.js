/* LIVE // EARTH — Sun View clone adapter.
   Builds the Sun controller from the exact Moon controller deployed beside it.
   This keeps the approved Moon geometry, trail rendering, responsive layout and scroller
   implementation in one source of truth. Sun-specific endpoint icon artwork, solar data and wiring differ.
*/
(() => {
  "use strict";

  if (window.__liveEarthSunCloneAdapterInstalled) return;
  window.__liveEarthSunCloneAdapterInstalled = true;

  const currentScript = document.currentScript;
  const scriptNonce = currentScript?.nonce || document.querySelector("script[nonce]")?.nonce || "";
  let requested = false;
  let actualActive = false;
  let loadPromise = null;

  function replaceBetween(source, start, end, replacement) {
    const from = source.indexOf(start);
    const to = source.indexOf(end, from + start.length);
    if (from < 0 || to < 0) throw new Error("Moon-to-Sun conversion marker missing: " + start);
    return source.slice(0, from) + replacement + "\n\n" + source.slice(to);
  }

  function convertMoonController(source) {
    const textureDeclaration = /const MOON_TEXTURE_DATA = "data:image\/jpeg;base64," \+\s*\n\s*"[^"]+";/;
    if (!textureDeclaration.test(source)) throw new Error("The deployed Moon texture declaration has changed.");
    source = source.replace(textureDeclaration,
      'const SUN_TEXTURE_DATA = new URL("./sun-surface-equirectangular.png", document.baseURI).href;');

    source = source
      .replace(/MOON/g, "SUN")
      .replace(/Moon/g, "Sun")
      .replace(/moon/g, "sun")
      .replace(/LUNAR/g, "SOLAR")
      .replace(/Lunar/g, "Solar")
      .replace(/lunar/g, "solar")
      .replace(/le-mv/g, "le-sv")
      .replace(/leMv/g, "leSv")
      .replace(/__liveEarthMoonRendererInstalled/g, "__liveEarthSunRendererInstalled")
      .replace(/__liveEarthMoonRendererBooting/g, "__liveEarthSunRendererBooting")
      .replace(/__liveEarthLunarStardustInstalled/g, "__liveEarthSolarStardustInstalled")
      .replace(/__liveEarthLunarStardustBooting/g, "__liveEarthSolarStardustBooting");

    source = source
      .replace('<div class="le-sv-solar-kicker">SOLAR AGE</div>', '<div class="le-sv-solar-kicker">DAYLIGHT</div>')
      .replace('<div class="le-sv-solar-kicker">NEXT PHASE</div>', '<div class="le-sv-solar-kicker">SOLAR NOON</div>')
      .replace(">ILLUMINATED<", ">ALTITUDE<");

    source = replaceBetween(source,
      "  function nextMajorSolarPhase(",
      "  function updateSolarInfo()",
      "");

    source = replaceBetween(source,
      "  function updateSolarInfo() {",
      "  function setScrollerLocationMode",
      `  function updateSolarInfo() {
    if (!astronomy) return;
    try {
      if (!observer || !isLocationEnabled()) {
        phaseNameNode.textContent = "SOLAR POSITION";
        illuminationNode.textContent = "--°";
        solarAgeNode.textContent = "--";
        nextPhaseNode.textContent = "--";
        nextPhaseCountdownNode.textContent = "LOCATION OFF";
        return;
      }
      const point = sunPositionUtcClock(new Date(selectedTime), observer.latitude, observer.longitude);
      const daily = astronomy.calculateAstronomy(observer.latitude, observer.longitude, new Date(selectedTime)).sun;
      phaseNameNode.textContent = "SOLAR POSITION";
      illuminationNode.textContent = Number(point.altitude).toFixed(1) + "°";
      const minutes = Math.max(0, Number(daily.daylightMinutes) || 0);
      solarAgeNode.textContent = Math.floor(minutes / 60) + "h " + String(minutes % 60).padStart(2, "0") + "m";
      nextPhaseNode.textContent = daily.solarNoon ? fmt(daily.solarNoon) : (daily.polar || "--");
      nextPhaseCountdownNode.textContent = "LOCAL SOLAR TIME";
    } catch (_) { /* Keep the last valid solar details when a sample is unavailable. */ }
  }`);

    const vectorStart = source.indexOf("  function vectorFromAltAz(");
    const positionStart = source.indexOf("  function sunPositionUtcClock(", vectorStart);
    const lightStart = source.indexOf("  function lightVectorAt(", positionStart);
    const initStart = source.indexOf("  function initRenderer()", lightStart);
    if (vectorStart < 0 || positionStart < 0 || lightStart < 0 || initStart < 0) {
      throw new Error("The deployed Moon solar-position helper structure has changed.");
    }
    source = source.slice(0, vectorStart) + source.slice(positionStart, lightStart) + source.slice(initStart);

    source = source
      .replace('  let sun = null, sunTexture = null, sunLight = null, sunLightTarget = null;', '  let sun = null, sunTexture = null;')
      .replace('  const radians = Math.PI / 180;\n', "")
      .replace('  let cachedLightDirection = null;\n', "")
      .replace('      scene.add(new THREE.AmbientLight(0x9cb7d6, 0.12));\n      const fill = new THREE.HemisphereLight(0xb5d1f1, 0x10182a, 0.055); scene.add(fill);\n      sunLight = new THREE.DirectionalLight(0xffffff, 3.0);\n      sunLightTarget = new THREE.Object3D();\n      scene.add(sunLight, sunLightTarget);\n      sunLight.target = sunLightTarget;\n', "")
      .replace('new THREE.MeshStandardMaterial({ map: sunTexture, color: 0xffffff, roughness: 1, metalness: 0 })', 'new THREE.MeshBasicMaterial({ map: sunTexture, color: 0xffffff })')
      .replace('sun.name = "leSunView3DPrototype";', 'sun.name = "leSunView3DOrb"');

    source = replaceBetween(source,
      "  function setLocalInterval(now = Date.now()) {",
      "  function arcCurve",
      `  function setLocalInterval(now = Date.now()) {
    if (!observer || !astronomy) return;
    const currentDate = new Date(now);
    let daily = astronomy.calculateAstronomy(observer.latitude, observer.longitude, currentDate).sun;
    let rise = daily.sunrise ? Date.parse(daily.sunrise) : NaN;
    let set = daily.sunset ? Date.parse(daily.sunset) : NaN;
    if (Number.isFinite(set) && now >= set) {
      const tomorrow = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 12);
      daily = astronomy.calculateAstronomy(observer.latitude, observer.longitude, tomorrow).sun;
      rise = daily.sunrise ? Date.parse(daily.sunrise) : NaN;
      set = daily.sunset ? Date.parse(daily.sunset) : NaN;
    }
    if (!Number.isFinite(rise) || !Number.isFinite(set) || set <= rise) {
      interval = null; clearPaths(); setScrollerLocationMode(false);
      selectedTime = now; progress = fractionOfLocalDay(now); live = true;
      range.value = String(Math.round(progress * 1000)); selectedLabel.textContent = fmt(selectedTime);
      renderOnce(); return;
    }
    interval = { rise, set }; setScrollerLocationMode(true);
    dayLabel.textContent = fmt(rise); setLabel.textContent = fmt(set);
    if (now >= rise && now < set) { progress = (now - rise) / (set - rise); selectedTime = now; }
    else { progress = 0; selectedTime = rise; }
    live = true; range.value = String(Math.round(progress * 1000));
    selectedLabel.textContent = fmt(selectedTime); drawPaths(); renderOnce();
  }`);

    source = replaceBetween(source,
      "  function updateLighting(date) {",
      "  function updateHorizontalMarker",
      `  function updateSolarOrb() {
    if (!sun) return;
    const p = currentPoint(), h = dimensions.h;
    sun.position.set(p.x, h - p.y, 0);
    sun.scale.setScalar(dimensions.radius);
  }`);

    source = source
      .replace(/cachedLightDirection = null; ?/g, "")
      .replace("updateLighting(new Date(selectedTime))", "updateSolarOrb()")
      .replace('window.LiveEarthViewModules.register("sun-solar-interface", { views: ["sun"], activate, deactivate });',
        'window.__liveEarthSunActualModule = { activate, deactivate };');

    source = source
      .replace('await import("./vendor/three.module.js")', 'await import(new URL("./vendor/three.module.js", document.baseURI).href)')
      .replace('await import("./astronomy.js")', 'await import(new URL("./astronomy.js", document.baseURI).href)');
    const sunAmberEndpointTheme = `
    /* SUN_ENDPOINT_AMBER_THEME — Sun View only; the original blue icon set stays unchanged. */
    #le-sky-view[data-view="sun"] .le-sv-sun-rise-icon {
      filter:drop-shadow(0 0 2px #ffd88c) drop-shadow(0 0 5px #d78e3b9c) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-sun-set-icon {
      filter:drop-shadow(0 0 2px #f5b96a) drop-shadow(0 0 5px #bb682c9c) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .start-label {
      color:#ffe6b8 !important;
      text-shadow:0 0 5px #e6a94f65,0 1px 5px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .end-label {
      color:#ffd79b !important;
      text-shadow:0 0 5px #d98d3e65,0 1px 5px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-end-label-copy small {
      color:#edbd78 !important;
      text-shadow:0 0 4px #d9963f55,0 1px 4px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-end-label-copy small {
      color:#dca15d !important;
      text-shadow:0 0 4px #c77e3855,0 1px 4px #000 !important;
    }
    `;

    const solarPathTheme = `
    /* SOLAR_PLASMA_WAVE_TRAIL — applies only to the Sun's curved sky path. */
    #le-sky-view[data-view="sun"] .le-sv-solar-plasma-glow {
      fill:none; stroke:#ff9d43; stroke-width:15; stroke-linecap:round; stroke-linejoin:round;
      opacity:.20; filter:blur(4px) drop-shadow(0 0 9px #ff9d43a8); pointer-events:none;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-plasma-core {
      fill:none; stroke:#f6a64e; stroke-width:5.2; stroke-linecap:round; stroke-linejoin:round;
      opacity:.72; filter:drop-shadow(0 0 4px #ffc56e) drop-shadow(0 0 9px #ed8d35a8); pointer-events:none;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-liquid-ribbon {
      fill:#f6a64e; opacity:.32; filter:drop-shadow(0 0 4px #f8aa53a0) drop-shadow(0 0 9px #e98b3d70);
      pointer-events:none;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-liquid-highlight {
      fill:#ffe2a5; opacity:.34; filter:drop-shadow(0 0 3px #ffe0a0b8); pointer-events:none;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-core-highlight {
      fill:none; stroke:#fff0cb; stroke-width:1.15; stroke-linecap:round; stroke-linejoin:round;
      opacity:.88; filter:drop-shadow(0 0 3px #ffe4af); pointer-events:none;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-light-streak {
      fill:none; stroke:#fff0c8; stroke-width:1.2; stroke-linecap:round; stroke-linejoin:round;
      stroke-dasharray:2 24; opacity:.88; filter:drop-shadow(0 0 3px #ffd98e) drop-shadow(0 0 6px #f5a64d);
      animation:leSvSolarStreakFlow 3.8s linear infinite; pointer-events:none;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-light-streak-secondary {
      fill:none; stroke:#ffd28c; stroke-width:.85; stroke-linecap:round; stroke-linejoin:round;
      stroke-dasharray:1.4 38; opacity:.72; filter:drop-shadow(0 0 3px #ffbd70);
      animation:leSvSolarStreakFlow 6.2s linear infinite reverse; pointer-events:none;
    }
    @keyframes leSvSolarStreakFlow { to { stroke-dashoffset:-52; } }
    @media (prefers-reduced-motion: reduce) {
      #le-sky-view[data-view="sun"] .le-sv-solar-light-streak,
      #le-sky-view[data-view="sun"] .le-sv-solar-light-streak-secondary { animation:none !important; }
    }
    `;

    /* Custom miniature SVG artwork — independently coloured sunrise and sunset. */
    const sunRiseIcon = `
      <svg class="le-sv-scroller-end-icon le-sv-sun-rise-icon" viewBox="0 0 42 25" role="img" aria-label="Sunrise">
        <defs>
          <linearGradient id="leSvRiseAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff0bd"/><stop offset="48%" stop-color="#ffc96f"/><stop offset="100%" stop-color="#df8736"/>
          </linearGradient>
        </defs>
        <path d="M21 1.4V4.3 M10.2 5.1L12.4 7.4 M31.8 5.1L29.6 7.4 M5.4 11.2L9 12.2 M36.6 11.2L33 12.2"
          fill="none" stroke="#f4bd68" stroke-width="1.15" stroke-linecap="round"/>
        <path d="M13.4 16.4A7.6 7.6 0 0 1 28.6 16.4Z" fill="url(#leSvRiseAmber)" stroke="#fff0ca" stroke-width=".65"/>
        <path d="M11.4 16.6A9.6 9.6 0 0 1 30.6 16.6" fill="none" stroke="#ffe2a5" stroke-width=".65" opacity=".78"/>
        <path d="M3.2 17H38.8" fill="none" stroke="#f0b85f" stroke-width="1.25" stroke-linecap="round"/>
        <path d="M5.2 19.6Q10.2 17.9 15.2 19.6T25.2 19.6T36.8 19.6 M9 22.3Q13 21 17 22.3T25 22.3T33 22.3"
          fill="none" stroke="#e5a24d" stroke-width=".8" stroke-linecap="round" opacity=".92"/>
        <circle cx="21" cy="16.1" r=".85" fill="#fff7df"/>
      </svg>`;

    const sunSetIcon = `
      <svg class="le-sv-scroller-end-icon le-sv-sun-set-icon" viewBox="0 0 42 25" role="img" aria-label="Sunset">
        <defs>
          <linearGradient id="leSvSetAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffe2a7"/><stop offset="48%" stop-color="#f4ad55"/><stop offset="100%" stop-color="#c66a2b"/>
          </linearGradient>
        </defs>
        <path d="M10.1 7.4L12.5 9.2 M31.9 7.4L29.5 9.2" fill="none" stroke="#e6a052" stroke-width="1.05" stroke-linecap="round"/>
        <path d="M13.8 16.5A7.2 7.2 0 0 1 28.2 16.5Z" fill="url(#leSvSetAmber)" stroke="#ffe7bf" stroke-width=".65"/>
        <path d="M11.8 16.7A9.2 9.2 0 0 1 30.2 16.7" fill="none" stroke="#edb36a" stroke-width=".65" opacity=".82"/>
        <path d="M3.2 16.9H38.8" fill="none" stroke="#dfa052" stroke-width="1.25" stroke-linecap="round"/>
        <path d="M21 17.7V21.7 M16.2 17.8L14.4 20.8 M25.8 17.8L27.6 20.8"
          fill="none" stroke="#d98a43" stroke-width=".85" stroke-linecap="round" opacity=".9"/>
        <path d="M5.2 21.1Q10.2 19.7 15.2 21.1T25.2 21.1T36.8 21.1 M12 23.4Q16 22.5 20 23.4T28 23.4"
          fill="none" stroke="#f2bd78" stroke-width=".72" stroke-linecap="round" opacity=".9"/>
        <circle cx="21" cy="16.3" r=".8" fill="#fff0d2"/>
      </svg>`;

    function replaceSunEndpointIcon(endpointClass, endpointMarker, iconMarkup) {
      const endpointAt = source.indexOf(endpointMarker);
      const iconStart = source.indexOf('<svg class="le-sv-scroller-end-icon"', endpointAt);
      const iconEnd = source.indexOf("</svg>", iconStart);
      if (endpointAt < 0 || iconStart < 0 || iconEnd < 0) {
        throw new Error("Sun " + endpointClass + " icon insertion point is missing.");
      }
      source = source.slice(0, iconStart) + iconMarkup + source.slice(iconEnd + 6);
    }
    replaceSunEndpointIcon(
      "rise",
      '<div class="le-sv-endpoint-info le-sv-endpoint-info-rise">',
      sunRiseIcon
    );
    replaceSunEndpointIcon(
      "set",
      '<div class="end le-sv-endpoint-info le-sv-endpoint-info-set">',
      sunSetIcon
    );

    const solarArcRenderer = `  function drawArcSparkles() {
    const group = $("#le-sv-arc-sparkles");
    const mainPath = $("#le-sv-main");
    if (!group || !mainPath || !arcGeometry) return;
    group.replaceChildren();
    const ns = "http://www.w3.org/2000/svg";
    const mainD = mainPath.getAttribute("d");
    if (!mainD) return;
    const sampleCount = clamp(Math.ceil((dimensions.w + dimensions.h) * 0.28), 180, 420);
    const pointText = point => point[0].toFixed(2) + " " + point[1].toFixed(2);

    // A gently undulating, tapered ribbon creates the liquid-light surface.
    // The original arc geometry remains the positioning source of truth.
    const ribbonPath = (baseOffset, maxWidth, waveAmplitude, phase) => {
      const upper = [], lower = [];
      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const frame = arcFrame(t);
        const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.86);
        const wave = waveAmplitude * taper * (
          Math.sin(t * Math.PI * 8 + phase) + 0.30 * Math.sin(t * Math.PI * 15 - phase)
        );
        const center = baseOffset + wave;
        const halfWidth = 0.32 + (maxWidth * 0.5) * taper;
        upper.push([
          frame.p.x + frame.nx * (center + halfWidth),
          frame.p.y + frame.ny * (center + halfWidth)
        ]);
        lower.push([
          frame.p.x + frame.nx * (center - halfWidth),
          frame.p.y + frame.ny * (center - halfWidth)
        ]);
      }
      return "M " + pointText(upper[0]) + " " + upper.slice(1).map(point => "L " + pointText(point)).join(" ") +
        " " + lower.reverse().map(point => "L " + pointText(point)).join(" ") + " Z";
    };

    const offsetLine = (baseOffset, waveAmplitude, phase) => {
      const points = [];
      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const frame = arcFrame(t);
        const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.9);
        const wave = waveAmplitude * taper * Math.sin(t * Math.PI * 8 + phase);
        const offset = baseOffset + wave;
        points.push([
          frame.p.x + frame.nx * offset,
          frame.p.y + frame.ny * offset
        ]);
      }
      return "M " + pointText(points[0]) + " " + points.slice(1).map(point => "L " + pointText(point)).join(" ");
    };

    const addPath = (className, d) => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", className);
      path.setAttribute("d", d);
      path.setAttribute("aria-hidden", "true");
      group.appendChild(path);
      return path;
    };

    // Layer order: soft plasma bloom, flowing liquid ribbons, hot arc core, then moving streaks.
    addPath("le-sv-solar-plasma-glow", mainD);
    addPath("le-sv-solar-liquid-ribbon", ribbonPath(0, 5.8, 1.15, 0.25));
    addPath("le-sv-solar-liquid-highlight", ribbonPath(-1.55, 2.25, 0.72, 1.65));
    addPath("le-sv-solar-plasma-core", mainD);
    addPath("le-sv-solar-core-highlight", offsetLine(-0.55, 0.42, 0.6));
    addPath("le-sv-solar-light-streak", offsetLine(-2.15, 0.72, 0.15));
    addPath("le-sv-solar-light-streak-secondary", offsetLine(2.25, 0.62, 2.05));
  }`;
    source = replaceBetween(source,
      "  function drawArcSparkles() {",
      "  function appendStaticStar(",
      solarArcRenderer
    );

    const styleInstall = '  style.textContent = css;\n  document.head.appendChild(style);';
    if (!source.includes(styleInstall)) throw new Error("Sun endpoint theme insertion point is missing.");
    source = source.replace(styleInstall,
      '  style.textContent = css + `' + sunAmberEndpointTheme + '` + `' + solarPathTheme + '`;\n  document.head.appendChild(style);');

    if (/(moon|lunar)/i.test(source) || !source.includes("function drawArcSparkles") ||
        !source.includes("function drawScrollerSparkles") || !source.includes("calculateAstronomy") ||
        !source.includes("window.__liveEarthSunActualModule = { activate, deactivate };") ||
        !source.includes("le-sv-sun-rise-icon") || !source.includes("le-sv-sun-set-icon") ||
        !source.includes("le-sv-solar-plasma-core") || !source.includes("le-sv-solar-liquid-ribbon")) {
      throw new Error("Converted Sun controller failed its structural checks.");
    }
    return source;
  }

  async function loadAndInstallClone() {
    const moonUrl = new URL("./moon-view-controller.js", document.baseURI);
    const response = await fetch(moonUrl.href, { credentials: "same-origin", cache: "no-cache" });
    if (!response.ok) throw new Error("Moon controller fetch failed: HTTP " + response.status);
    const original = await response.text();
    if (!original.includes("le-mv-stage") || !original.includes("moonRiseSetInterval")) {
      throw new Error("Fetched Moon controller does not match the expected deployed version.");
    }
    const converted = convertMoonController(original);
    window.__liveEarthSunActualModule = null;

    const injected = document.createElement("script");
    if (scriptNonce) injected.nonce = scriptNonce;
    injected.textContent = converted;
    (document.head || document.documentElement).appendChild(injected);
    injected.remove();

    if (!window.__liveEarthSunActualModule) {
      throw new Error("Converted Sun controller did not initialize; check the Sky View root and script policy.");
    }
    return window.__liveEarthSunActualModule;
  }

  function ensureLoaded() {
    if (!loadPromise) {
      loadPromise = loadAndInstallClone().catch(error => {
        console.error("[LIVE // EARTH] Sun View clone could not be installed.", error);
        window.__liveEarthSunRendererBooting = false;
        throw error;
      });
    }
    return loadPromise;
  }

  if (!window.LiveEarthViewModules || typeof window.LiveEarthViewModules.register !== "function") {
    console.error("[LIVE // EARTH] Sun View could not register: view module manager is not ready.");
    window.__liveEarthSunCloneAdapterInstalled = false;
    return;
  }

  window.LiveEarthViewModules.register("sun-procedural-renderer", {
    views: ["sun"],
    activate() {
      requested = true;
      ensureLoaded().then(module => {
        if (requested && !actualActive) {
          actualActive = true;
          module.activate();
        }
      }).catch(() => {});
    },
    deactivate() {
      requested = false;
      if (actualActive && window.__liveEarthSunActualModule) {
        actualActive = false;
        window.__liveEarthSunActualModule.deactivate();
      }
    }
  });

  ensureLoaded().then(module => {
    if (requested && !actualActive) {
      actualActive = true;
      module.activate();
    }
  }).catch(() => {});
})();
