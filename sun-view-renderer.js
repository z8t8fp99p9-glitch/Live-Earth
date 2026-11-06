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

    const amberTheme = `
    /* Sun-only amber treatment: preserve Moon View's original blue theme and layout. */
    #le-sky-view[data-view="sun"] .le-sv-stage { color:#f6d49a; }
    #le-sky-view[data-view="sun"] .le-sv-solar-info {
      color:#f4c77d;
      text-shadow:0 1px 9px #020b1ccc,0 0 8px #f0a43b24;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-kicker { color:#e9b96f !important; }
    #le-sky-view[data-view="sun"] .le-sv-solar-illumination {
      color:#ffd184 !important;
      text-shadow:0 0 5px #ffbd5a90,0 0 13px #e78c2e58 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-solar-subtitle { color:#e8bd7c !important; }
    #le-sky-view[data-view="sun"] .le-sv-solar-value { color:#ffe0a6 !important; }
    #le-sky-view[data-view="sun"] .le-sv-solar-countdown { color:#dcae69 !important; }
    #le-sky-view[data-view="sun"] .le-sv-selected-time {
      color:#ffd080 !important;
      text-shadow:0 0 4px #f3a43cbd,0 0 11px #d9772291,0 1px 8px #000 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-event-label { fill:#e9bd78 !important; }
    #le-sky-view[data-view="sun"] .le-sv-event-time { fill:#ffe0a6 !important; }
    #le-sky-view[data-view="sun"] .le-sv-end-labels .start-label,
    #le-sky-view[data-view="sun"] .le-sv-end-labels .end-label { color:#ffe0a6 !important; }
    #le-sky-view[data-view="sun"] .le-sv-end-labels .le-sv-end-label-copy small,
    #le-sky-view[data-view="sun"] .le-sv-end-labels small { color:#d7a65f !important; }
    #le-sky-view[data-view="sun"] .le-sv-location-note { color:#edc888 !important; }
    #le-sky-view[data-view="sun"] .le-sv-arc-sparkle,
    #le-sky-view[data-view="sun"] .le-sv-arc-star {
      fill:#ffe7b6 !important;
      filter:drop-shadow(0 0 2px #fff0ce) drop-shadow(0 0 6px #ffb84dba) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-arc-dust-mote,
    #le-sky-view[data-view="sun"] .le-sv-arc-sparkle-cool { fill:#edc47f !important; }
    #le-sky-view[data-view="sun"] .le-sv-arc-sparkle-warm,
    #le-sky-view[data-view="sun"] .le-sv-arc-star-glow { fill:#ffd58e !important; }
    #le-sky-view[data-view="sun"] .le-sv-horizontal-trail-blue,
    #le-sky-view[data-view="sun"] .le-sv-horizontal-trail-gold,
    #le-sky-view[data-view="sun"] .le-sv-vertical-trail-blue,
    #le-sky-view[data-view="sun"] .le-sv-vertical-trail-gold { filter:drop-shadow(0 0 3px #ffc66fba) drop-shadow(0 0 8px #e8913780) !important; }
    #le-sky-view[data-view="sun"] .le-sv-horizontal-dust-blue,
    #le-sky-view[data-view="sun"] .le-sv-vertical-dust-blue { fill:#f6d89e !important; }
    #le-sky-view[data-view="sun"] .le-sv-horizontal-dust-gold,
    #le-sky-view[data-view="sun"] .le-sv-vertical-dust-gold { fill:#ffd58c !important; }
    #le-sky-view[data-view="sun"] .le-sv-horizontal-sun-marker { filter:drop-shadow(0 0 5px #ffc66fba) drop-shadow(0 0 9px #e8913780) !important; }
    #le-sky-view[data-view="sun"] .le-sv-horizontal-sun-halo { fill:#ffbf62 !important; }
    #le-sky-view[data-view="sun"] .le-sv-horizontal-sun-surface,
    #le-sky-view[data-view="sun"] .le-sv-horizontal-sun-rim { stroke:#ffe0a6 !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint { fill:#ffe3ad !important; filter:drop-shadow(0 0 5px #e9aa4f) !important; }
    #le-sky-view[data-view="sun"] .le-sv-endpoint-halo { fill:#eaa94c !important; }
    #le-sky-view[data-view="sun"] .le-sv-main-rise-set-icon,
    #le-sky-view[data-view="sun"] .le-sv-scroller-end-icon { filter:drop-shadow(0 0 3px #f0b95eaa) !important; }
    #le-sky-view[data-view="sun"] .le-sv-scroller-end-icon path[stroke],
    #le-sky-view[data-view="sun"] .le-sv-main-rise-set-icon path[stroke] { stroke:#f0bd70 !important; }
    #le-sky-view[data-view="sun"] .le-sv-scroller-end-icon path[fill],
    #le-sky-view[data-view="sun"] .le-sv-main-rise-set-icon path[fill] { fill:#f7ca7c !important; }
    #le-sky-view[data-view="sun"] .le-sv-vertical-ribbon-glow { fill:#e9a23d !important; }
    #le-sky-view[data-view="sun"] .le-sv-vertical-dust-gold,
    #le-sky-view[data-view="sun"] .le-sv-horizontal-dust-gold { filter:drop-shadow(0 0 2px #ffcf7d) drop-shadow(0 0 4px #ffad4d80) !important; }
    #navButtons:has(.orbButton[data-view="sun"][aria-pressed="true"]) .orbLabel {
      color:#ffd080 !important;
      text-shadow:0 1px 7px #000,0 0 9px #e9a54470 !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvHorizontalTrail"],
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvVertical"] {
      color:#f1bd72;
    }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvHorizontalTrail"] stop:nth-child(1),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvVertical"] stop:nth-child(1) { stop-color:#d28b3f !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvHorizontalTrail"] stop:nth-child(2),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvVertical"] stop:nth-child(2) { stop-color:#efb45f !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvHorizontalTrail"] stop:nth-child(3),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvVertical"] stop:nth-child(3) { stop-color:#ffe5ae !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvHorizontalTrail"] stop:nth-child(4),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvVertical"] stop:nth-child(4) { stop-color:#ffcd7b !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(1),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(7) { stop-color:#e2a04d !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(2),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(6) { stop-color:#f3c779 !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(3),
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(5) { stop-color:#fff0ca !important; }
    #le-sky-view[data-view="sun"] .le-sv-svg linearGradient[id^="leSvArc"] stop:nth-child(4) { stop-color:#ffe0a1 !important; }
  `;
    const styleInstall = '  style.textContent = css;\n  document.head.appendChild(style);';
    if (!source.includes(styleInstall)) throw new Error("Sun amber theme insertion point is missing.");
    source = source.replace(styleInstall, '  style.textContent = css + `' + amberTheme + '`;\n  document.head.appendChild(style);');

    if (/(moon|lunar)/i.test(source) || !source.includes("function drawArcSparkles") ||
        !source.includes("function drawScrollerSparkles") || !source.includes("calculateAstronomy") ||
        !source.includes("window.__liveEarthSunActualModule = { activate, deactivate };") ||
        !source.includes("le-sv-solar-illumination") || !source.includes("#ffd080")) {
      throw new Error("Converted Sun controller failed its structural checks.");
    }
    return source;
  }

  async function waitForSkyRoot() {
    if (document.getElementById("le-sky-view")) return;
    await new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        if (document.getElementById("le-sky-view")) {
          observer.disconnect();
          resolve();
        }
      });
      const target = document.documentElement || document;
      observer.observe(target, { childList: true, subtree: true });
      // The shared Sky View controller creates this root during startup.
      // Keep waiting for that controller instead of treating early startup as a fatal error.
    });
  }

  async function loadAndInstallClone() {
    await waitForSkyRoot();
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
        loadPromise = null;
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
