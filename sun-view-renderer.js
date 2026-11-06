/* LIVE // EARTH — Sun View clone adapter.
   Builds the Sun controller from the exact Moon controller deployed beside it.
   This keeps the approved Moon geometry, trail rendering, responsive layout and scroller
   implementation in one source of truth. Only solar data/artwork and Sun module wiring differ.
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
    /* SUN_ENDPOINT_AMBER_THEME — limited to the two small Rise/Set scroller markers and captions. */
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon {
      filter:drop-shadow(0 0 2px #f5c36f) drop-shadow(0 0 5px #bd762b9c) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon {
      filter:drop-shadow(0 0 2px #e9a450) drop-shadow(0 0 5px #a85e279c) !important;
    }
    /* Rise: brighter honey-gold details, coloured individually. */
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon path:nth-of-type(1) { stroke:#d9963f !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon path:nth-of-type(2) { stroke:#f0b85f !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon path:nth-of-type(3) { fill:#f6bd65 !important; stroke:#fff0d0 !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon path:nth-of-type(4) { fill:#ffe2a2 !important; filter:drop-shadow(0 0 2px #ffc45e) !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon path:nth-of-type(5) { stroke:#f8ca7a !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-scroller-end-icon path:nth-of-type(6) { stroke:#e8ad5b !important; }
    /* Set: a slightly deeper sunset amber, with a soft champagne highlight. */
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon path:nth-of-type(1) { stroke:#c98237 !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon path:nth-of-type(2) { stroke:#e7a052 !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon path:nth-of-type(3) { fill:#eaa650 !important; stroke:#ffe4bb !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon path:nth-of-type(4) { fill:#ffd18d !important; filter:drop-shadow(0 0 2px #efa74c) !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon path:nth-of-type(5) { stroke:#e7a85c !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-scroller-end-icon path:nth-of-type(6) { stroke:#d99748 !important; }

    /* Local times and the small RISE/SET captions. These colours apply only to Sun View. */
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .start-label {
      color:#ffe4b2 !important;
      text-shadow:0 0 5px #e6a94f65,0 1px 5px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .end-label {
      color:#ffd79a !important;
      text-shadow:0 0 5px #d98d3e65,0 1px 5px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-rise .le-sv-end-label-copy small {
      color:#e8b86f !important;
      text-shadow:0 0 4px #d9963f55,0 1px 4px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-info-set .le-sv-end-label-copy small {
      color:#dca15d !important;
      text-shadow:0 0 4px #c77e3855,0 1px 4px #000 !important;
    }
    `;
    const styleInstall = '  style.textContent = css;\n  document.head.appendChild(style);';
    if (!source.includes(styleInstall)) throw new Error("Sun endpoint theme insertion point is missing.");
    source = source.replace(styleInstall,
      '  style.textContent = css + `' + sunAmberEndpointTheme + '`;\n  document.head.appendChild(style);');

    if (/(moon|lunar)/i.test(source) || !source.includes("function drawArcSparkles") ||
        !source.includes("function drawScrollerSparkles") || !source.includes("calculateAstronomy") ||
        !source.includes("window.__liveEarthSunActualModule = { activate, deactivate };")) {
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
