/* LIVE // EARTH — Independent Sun View renderer.
   Standalone solar renderer, Arc, and time scroller.
   Uses the shared Sky stage and global ViewModules registry only.
   Does not fetch or use another view's renderer.
*/
/* LIVE // EARTH — dedicated Sun View controller and 3D renderer.
   Extracted without changing the renderer implementation or its compatibility contract.
   The shared full-screen sky stage remains in sky-view-controller.js. */
/* LIVE // EARTH Sun View — portrait arc-height refinement candidate.
 * Preserves the existing renderer lifecycle and app-shell readiness contract.
 * Home, sun-orbit.js, Earth scene, wallpaper, and Home orbital stardust are untouched.
 * The compact custom Sun albedo is embedded to preserve offline-first startup.
 */
(() => {
  "use strict";
  if (window.__liveEarthSunRendererInstalled || window.__liveEarthSunRendererBooting) return;
  window.__liveEarthSunRendererBooting = true;
  const SUN_TEXTURE_DATA = new URL("./sun-surface-equirectangular.png", document.baseURI).href;

  const root = document.getElementById("le-sky-view");
  if (!root) {
    window.__liveEarthSunRendererBooting = false;
    window.__liveEarthSolarStardustBooting = false;
    console.warn("[LIVE // EARTH] Sun renderer skipped: Sky View root is absent.");
    return;
  }

  const css = `
    #le-sky-view .le-sv-stage { position:absolute; inset:0; z-index:3; overflow:hidden; pointer-events:none; color:#eaf5ff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    #le-sky-view[data-view="sun"] { touch-action:auto; }
    #le-sky-view .le-sv-svg { position:absolute; z-index:1; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
    #le-sky-view .le-sv-canvas { position:absolute; z-index:2; inset:0; display:block; width:100%; height:100%; pointer-events:none; filter:drop-shadow(0 0 6px rgba(133,194,255,.72)) drop-shadow(0 0 16px rgba(65,136,255,.32)); }
    #le-sky-view .le-sv-path { fill:none; stroke-linecap:round; stroke-linejoin:round; }
    /* The geometric path remains for Sun positioning; fine particles render the visible star trail. */
    #le-sky-view .le-sv-path-main { stroke:none; stroke-width:0; filter:none; }
    #le-sky-view .le-sv-arc-sparkle { fill:#f8fcff; filter:drop-shadow(0 0 2px #d9efff) drop-shadow(0 0 5px #85c8ffb8); pointer-events:none; }
    #le-sky-view .le-sv-arc-dust-mote { fill:#cce8ff; opacity:.25; filter:drop-shadow(0 0 1.4px #8ecaff70); pointer-events:none; }
    #le-sky-view .le-sv-arc-sparkle-warm { fill:#ffe2b9; filter:drop-shadow(0 0 2px #fff0d8) drop-shadow(0 0 5px #ffbd6eaa); }
    #le-sky-view .le-sv-arc-sparkle-cool { fill:#d6efff; filter:drop-shadow(0 0 2px #f0faff) drop-shadow(0 0 5px #7bc5ffcc); }
    #le-sky-view .le-sv-arc-star-glow { fill:#e5f4ff; opacity:.48; filter:drop-shadow(0 0 4px #a9d9ff) drop-shadow(0 0 9px #89caffb8); pointer-events:none; }
    #le-sky-view .le-sv-arc-star { fill:#ffffff; opacity:.99; filter:drop-shadow(0 0 2.8px #f3faff) drop-shadow(0 0 7px #9bd3ff); pointer-events:none; }
    #le-sky-view .le-sv-horizontal-rail-sparkles { position:absolute; inset:0; z-index:1; display:block; width:100%; height:100%; overflow:visible; pointer-events:none; }
    #le-sky-view .le-sv-horizontal-trail-blue { fill:url(#leSvHorizontalTrailBlue); opacity:1; filter:drop-shadow(0 0 3.5px #8bd0ffed) drop-shadow(0 0 8px #369bff9a); pointer-events:none; }
    #le-sky-view .le-sv-horizontal-trail-gold { fill:url(#leSvHorizontalTrailGold); opacity:.98; filter:drop-shadow(0 0 2px #ffd58bba) drop-shadow(0 0 5px #e9a85b6b); pointer-events:none; }
    #le-sky-view .le-sv-vertical-ribbon-glow { fill:#58aaff; fill-opacity:.30; filter:blur(3px); pointer-events:none; }
    #le-sky-view .le-sv-vertical-trail-blue { fill:url(#leSvVerticalGradient); opacity:1; filter:drop-shadow(0 0 3.5px #8bd0ffed) drop-shadow(0 0 8px #369bff9a); pointer-events:none; }
    #le-sky-view .le-sv-vertical-trail-gold { fill:url(#leSvVerticalGoldGradient); opacity:.98; filter:drop-shadow(0 0 2px #ffd58bba) drop-shadow(0 0 5px #e9a85b6b); pointer-events:none; }
    #le-sky-view .le-sv-vertical-dust-blue { fill:#d9f0ff; filter:drop-shadow(0 0 2px #b7e5ffdf) drop-shadow(0 0 4px #6ebdff78); pointer-events:none; }
    #le-sky-view .le-sv-vertical-dust-gold { fill:#ffd58c; filter:drop-shadow(0 0 2px #ffcb7dd9) drop-shadow(0 0 4px #ffb84d80); pointer-events:none; }
    #le-sky-view .le-sv-vertical-star-core { fill:#f8fcff; filter:drop-shadow(0 0 2px #e1f4ff) drop-shadow(0 0 4px #75bdffbd); }
    #le-sky-view .le-sv-vertical-star-core-gold { fill:#fff0d3; filter:drop-shadow(0 0 2px #ffe9c4) drop-shadow(0 0 5px #ffbf6c); }
    #le-sky-view .le-sv-horizontal-dust-blue { fill:#d9f0ff; filter:drop-shadow(0 0 2px #b7e5ffdf) drop-shadow(0 0 4px #6ebdff78); pointer-events:none; }
    #le-sky-view .le-sv-horizontal-dust-gold { fill:#ffd58c; filter:drop-shadow(0 0 2px #ffcb7dd9) drop-shadow(0 0 4px #ffb84d80); pointer-events:none; }
    #le-sky-view .le-sv-scroller-star-gold { fill:#ffe2b6; filter:drop-shadow(0 0 2.6px #fff0d2) drop-shadow(0 0 6px #ffc36cbd); }
    #le-sky-view .le-sv-scroller-glow-gold { fill:#ffdba7; opacity:.48; filter:drop-shadow(0 0 4px #ffd28e) drop-shadow(0 0 8px #ffbc6e8c); }
    #le-sky-view .le-sv-scroller-core-gold { fill:#fff0d3; filter:drop-shadow(0 0 2px #ffe9c4) drop-shadow(0 0 5px #ffbf6c); }
    #le-sky-view .le-sv-horizontal-sun-marker { pointer-events:none; filter:drop-shadow(0 0 5px #77c5ffb8) drop-shadow(0 0 9px #4d9fff56); }
    #le-sky-view .le-sv-horizontal-sun-halo { fill:#75bfff; opacity:.24; }
    #le-sky-view .le-sv-horizontal-sun-surface { stroke:#f0f8ff; stroke-opacity:.95; stroke-width:.85; }
    #le-sky-view .le-sv-horizontal-sun-shade { pointer-events:none; }
    #le-sky-view .le-sv-horizontal-sun-rim { fill:none; stroke:#eef8ff; stroke-opacity:.9; stroke-width:.9; }
    #le-sky-view .le-sv-horizontal-rail-sparkles[hidden] { display:none !important; }
    #le-sky-view .le-sv-endpoint { fill:#deefff; filter:drop-shadow(0 0 5px #9bd8ff); }
    #le-sky-view .le-sv-endpoint-halo { fill:#73baff; fill-opacity:.15; }
    #le-sky-view .le-sv-main-rise-set-icon { pointer-events:none; filter:drop-shadow(0 0 4px #57b8ff70); }
    #le-sky-view .le-sv-event-label { fill:#bddfff; font-size:10px; letter-spacing:1.7px; paint-order:stroke; stroke:#031020b0; stroke-width:2px; }
    #le-sky-view #le-sv-rise-time, #le-sky-view #le-sv-set-time { display:none !important; }
    #le-sky-view .le-sv-event-time { fill:#f4f9ff; font-size:16px; font-weight:500; paint-order:stroke; stroke:#031020c9; stroke-width:2.6px; }
    #le-sky-view .le-sv-scroller-end-icon { display:block; flex:0 0 20px; width:30px; height:20px; align-self:center; margin:0 auto 1px; overflow:visible; filter:drop-shadow(0 0 2.4px #65baff8a); }
    @media (orientation:portrait) {
      /* Pin Portrait endpoint icons and their labels to fixed rail ends. Their horizontal
         positions must not depend on whether Location ON makes the time text appear. */
      #le-sky-view .le-sv-end-labels { transform:translate(2px, 20px); height:48px; min-height:48px; }
      #le-sky-view .le-sv-end-labels > .le-sv-endpoint-info { position:static; display:block; }
      #le-sky-view .le-sv-end-labels .le-sv-scroller-end-icon { position:absolute; top:0; bottom:auto; width:30px; height:20px; flex:none; margin:0; transform:translateX(-50%); }
      #le-sky-view .le-sv-endpoint-info-rise .le-sv-scroller-end-icon { left:5%; right:auto; transform:translateX(-50%); }
      #le-sky-view .le-sv-endpoint-info-set .le-sv-scroller-end-icon { left:95%; right:auto; transform:translateX(-50%); }
      #le-sky-view .le-sv-end-labels .le-sv-end-label-copy { position:absolute; top:21px; left:5%; right:auto; transform:translateX(-50%); align-items:center; text-align:center; }
      #le-sky-view .le-sv-endpoint-info-set .le-sv-end-label-copy { left:95%; }
    }
    #le-sky-view .le-sv-end-labels > .le-sv-endpoint-info { display:flex; flex-direction:column; align-items:center; gap:1px; min-width:0; text-align:center; }
    #le-sky-view .le-sv-end-label-copy { display:flex; flex-direction:column; align-items:center; white-space:nowrap; line-height:1.05; }
    #le-sky-view .le-sv-end-labels .end { flex-direction:column; justify-content:flex-start; align-items:center; text-align:center; }
    #le-sky-view .le-sv-end-labels .end .le-sv-end-label-copy { align-items:center; }
    #le-sky-view .le-sv-end-labels .start-label, #le-sky-view .le-sv-end-labels .end-label { font-size:12px; line-height:1.15; font-weight:500; color:#e4f4ff; }
    #le-sky-view .le-sv-end-labels .le-sv-end-label-copy small { margin-top:3px; font-size:8px; letter-spacing:1.7px; color:#9fcfff; }
    #le-sky-view .le-sv-timeline { position:absolute; z-index:4; left:7%; right:7%; bottom:calc(19% + env(safe-area-inset-bottom, 0px)); height:98px; display:block; pointer-events:auto; }
    /* The straight rail is replaced by two tapered SVG star-trail ribbons in portrait. */
    #le-sky-view .le-sv-timeline:before { display:none; }
    #le-sky-view .le-sv-timeline:after { content:""; position:absolute; left:0; right:0; bottom:29px; height:14px; background:linear-gradient(90deg,transparent 0 4.8%,#9bd2ff 4.8% 5.05%,transparent 5.05% 94.95%,#9bd2ff 94.95% 95.2%,transparent 95.2% 100%); opacity:.7; pointer-events:none; }
    #le-sky-view .le-sv-timeline[hidden], #le-sky-view .le-sv-location-note[hidden] { display:none !important; }
    #le-sky-view .le-sv-selected-time { position:absolute; top:0; left:50%; right:auto; display:block; width:max-content; max-width:78%; border:0; padding:0; margin:0; background:transparent; color:#ff7189; text-align:center; font:600 14px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; letter-spacing:.15px; text-shadow:0 0 4px #ff4b69bd,0 0 11px #ed173e91,0 1px 8px #000; cursor:pointer; -webkit-tap-highlight-color:transparent; transform:translate(-50%,-100%); z-index:5; }
    #le-sky-view .le-sv-timeline.le-sv-no-local-times .le-sv-end-labels .le-sv-end-label-copy { display:none !important; }
    #le-sky-view .le-sv-solar-info { position:absolute; z-index:3; top:calc(10.5% + env(safe-area-inset-top,0px) - 48px); left:7%; right:7%; height:104px; pointer-events:none; color:#bce7ff; text-shadow:0 1px 9px #020b1ccc,0 0 8px #3da8ff20; }
    #le-sky-view .le-sv-solar-phase { position:absolute; top:0; left:50%; width:68%; transform:translate(-50%, 4px); text-align:center; }
    #le-sky-view .le-sv-solar-kicker { color:#9bd9ff; font-size:10px; line-height:1.3; font-weight:600; letter-spacing:2.1px; text-transform:uppercase; white-space:nowrap; }
    #le-sky-view .le-sv-solar-illumination { margin-top:2px; color:#62baff; font-size:30px; line-height:1.05; font-weight:400; letter-spacing:.4px; text-shadow:0 0 5px #42aaff85,0 0 13px #168bff50; }
    #le-sky-view .le-sv-solar-subtitle { margin-top:3px; color:#9bdcff; font-size:9px; line-height:1.2; letter-spacing:2px; }
    #le-sky-view .le-sv-solar-side { position:absolute; top:65px; max-width:41%; }
    #le-sky-view .le-sv-solar-age { left:3%; text-align:left; transform:translateY(-15px); }
    #le-sky-view .le-sv-solar-next { right:2%; text-align:right; transform:translateY(-15px); }
    #le-sky-view .le-sv-solar-value { margin-top:3px; color:#c5eaff; font-size:15px; line-height:1.2; font-weight:500; letter-spacing:.1px; }
    #le-sky-view .le-sv-solar-countdown { margin-top:2px; color:#81c9ff; font-size:11px; line-height:1.25; }
    #le-sky-view .le-sv-range { position:absolute; left:0; right:0; bottom:14px; width:100%; height:44px; appearance:none; -webkit-appearance:none; background:transparent; margin:0; cursor:pointer; touch-action:pan-x; z-index:2; }
    #le-sky-view .le-sv-range::-webkit-slider-runnable-track { height:2px; border-radius:9px; background:transparent; }
    #le-sky-view .le-sv-range::-moz-range-track { height:2px; border-radius:9px; background:transparent; }
    #le-sky-view .le-sv-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:26px; height:26px; margin-top:-12px; border-radius:50%; border:1px solid transparent; background:transparent; box-shadow:none; }
    #le-sky-view .le-sv-range::-moz-range-thumb { width:26px; height:26px; border-radius:50%; border:1px solid transparent; background:transparent; box-shadow:none; }
    #le-sky-view .le-sv-end-labels { position:absolute; left:0; right:0; bottom:0; display:flex; justify-content:space-between; margin:0; font-size:11px; color:#e0ecfb; }
    #le-sky-view .le-sv-end-labels small { display:block; margin-top:3px; color:#9fb6d2; font-size:8px; letter-spacing:1.7px; }
    #le-sky-view .le-sv-end-labels .end { text-align:right; }
    #le-sky-view .le-sv-vertical-scroller { display:none; }
    #le-sky-view .le-sv-location-note { position:absolute; z-index:5; left:0; right:0; top:48%; padding:0 30px; color:#bfd1e6; font-size:11px; line-height:1.5; text-align:center; text-shadow:0 2px 10px #000; }
    @media (orientation:landscape) {
      /* Landscape-only information row. Solar Age is anchored to the viewport's exact horizontal midpoint. */
      #le-sky-view .le-sv-solar-info { display:block; top:3.5%; left:0; right:0; height:86px; }
      #le-sky-view .le-sv-solar-phase { top:0; left:3%; width:26%; transform:translateY(4px); text-align:center; }
      #le-sky-view .le-sv-solar-age { display:flex; align-items:baseline; justify-content:center; gap:9px; white-space:nowrap; top:0; left:50%; right:auto; width:max-content; max-width:none; transform:translateX(-50%); text-align:center; }
      #le-sky-view .le-sv-solar-age .le-sv-solar-value { margin-top:0; white-space:nowrap; }
      #le-sky-view .le-sv-solar-next { top:0; left:auto; right:13.5%; width:max-content; max-width:none; transform:none; text-align:center; }
      #le-sky-view .le-sv-main-rise-set-icon { display:none !important; }
      #le-sky-view .le-sv-scroller-end-icon { display:block; width:24px; height:15px; flex:0 0 15px; margin:0 auto 1px; }
      #le-sky-view .le-sv-endpoint-info-rise .le-sv-scroller-end-icon { transform:translateY(10px); }
      #le-sky-view .le-sv-end-labels > .le-sv-endpoint-info { display:block; text-align:center; }
      #le-sky-view .le-sv-end-labels .le-sv-end-label-copy { align-items:center; }
      #le-sky-view .le-sv-selected-time { color:#ff7189; text-shadow:0 0 4px #ff4b69bd,0 0 10px #ed173e78,0 1px 8px #000; transform:none; width:auto; }
      /* Landscape gets an independent vertical time rail at the side of the view.
         The rail controls time only; it does not control the Sun or arc layout. */
      #le-sky-view .le-sv-timeline { left:auto; right:2.4%; top:7.5%; bottom:7.5%; width:104px; height:auto; border:0; border-radius:0; padding:8px; background:transparent; box-shadow:none; -webkit-backdrop-filter:none; backdrop-filter:none; }
      #le-sky-view .le-sv-timeline:before, #le-sky-view .le-sv-timeline:after { display:none; }
      #le-sky-view .le-sv-horizontal-rail-sparkles { display:none; }
      #le-sky-view .le-sv-selected-time { top:10px; left:4px; right:4px; font-size:12px; line-height:1.25; padding:0 1px; z-index:2; }
      #le-sky-view .le-sv-vertical-scroller { display:block; position:absolute; top:76px; bottom:50px; left:4px; right:4px; pointer-events:none; }
      #le-sky-view .le-sv-vertical-scroller svg { display:block; width:100%; height:100%; overflow:visible; }
      /* Keep the curve as geometry only; the visible path is the same tapered stardust ribbon style as Portrait. */
      #le-sky-view .le-sv-vertical-path-glow, #le-sky-view .le-sv-vertical-path { fill:none; stroke:none; stroke-width:0; opacity:0; filter:none; }
      #le-sky-view .le-sv-vertical-end { fill:#e9f5ff; stroke:#8ccaff; stroke-width:1.5; }
      #le-sky-view .le-sv-vertical-end-halo { fill:#79bdff; fill-opacity:.22; }
      #le-sky-view .le-sv-vertical-marker-halo { fill:#5eafff; fill-opacity:.24; stroke:#a9d8ff; stroke-opacity:.68; stroke-width:1; filter:drop-shadow(0 0 5px #65baff9c); }
      #le-sky-view .le-sv-vertical-marker-disc { fill:url(#leSvVerticalSun); stroke:#e9f5ff; stroke-opacity:.88; stroke-width:1; }
      #le-sky-view .le-sv-vertical-crater { fill:#6b819c; fill-opacity:.64; }
      /* The transparent native range supplies accessible, reliable touch/keyboard input.
         Its visible marker is drawn on the independent curved SVG rail above. */
      #le-sky-view .le-sv-range { top:calc(50% + 13px); left:50%; right:auto; bottom:auto; width:clamp(120px,calc(84vh - 126px),340px); width:clamp(120px,calc(84dvh - 126px),340px); min-width:0; max-width:none; height:28px; transform:translate(-50%,-50%) rotate(-90deg); transform-origin:center; touch-action:none; z-index:3; opacity:.015; }
      #le-sky-view .le-sv-range::-webkit-slider-runnable-track { background:transparent; }
      #le-sky-view .le-sv-range::-moz-range-track { background:transparent; }
      #le-sky-view .le-sv-range::-webkit-slider-thumb { background:transparent; border-color:transparent; box-shadow:none; }
      #le-sky-view .le-sv-range::-moz-range-thumb { background:transparent; border-color:transparent; box-shadow:none; }
      /* Keep Rise and Set icons pinned to independent top/bottom anchors. Their positions must not depend on whether the local-time text is hidden when Location is OFF. */
      #le-sky-view .le-sv-end-labels { top:28px; bottom:18px; left:4px; right:4px; display:block; text-align:center; font-size:10px; pointer-events:none; }
      #le-sky-view .le-sv-end-labels > .le-sv-endpoint-info { display:block; position:static; text-align:center; }
      #le-sky-view .le-sv-end-labels .le-sv-scroller-end-icon { position:absolute; left:50%; top:0; bottom:auto; display:block; width:24px; height:15px; flex:none; margin:0; transform:translateX(-50%); }
      #le-sky-view .le-sv-endpoint-info-set .le-sv-scroller-end-icon { top:0; bottom:auto; transform:translateX(-50%); }
      #le-sky-view .le-sv-endpoint-info-rise .le-sv-scroller-end-icon { top:auto; bottom:18px; transform:translateX(-50%); }
      #le-sky-view .le-sv-end-labels .le-sv-end-label-copy { position:absolute; left:0; right:0; align-items:center; text-align:center; }
      #le-sky-view .le-sv-endpoint-info-set .le-sv-end-label-copy { top:18px; bottom:auto; }
      #le-sky-view .le-sv-endpoint-info-rise .le-sv-end-label-copy { top:calc(100% - 15px); bottom:auto; }
      #le-sky-view .le-sv-end-labels .end { text-align:center; }
      #le-sky-view .le-sv-end-labels small { font-size:7px; letter-spacing:1.3px; }
      #le-sky-view .le-sv-range:focus-visible { opacity:.1; outline:1px solid #a6d7ff; outline-offset:2px; border-radius:12px; }
      #le-sky-view .le-sv-event-label { font-size:9px; }
      #le-sky-view .le-sv-event-time { font-size:13px; }
    }
    @media (prefers-reduced-motion:reduce) { #le-sky-view .le-sv-stage * { animation:none!important; transition:none!important; } }
  `;
  const style = document.createElement("style");
  style.id = "le-sun-view-renderer-style";
  style.textContent = css + `
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
    ` + `
    /* SUN_AMBER_STARDUST_THEME — recolour the existing curved Solar Path only. */
    #le-sky-view[data-view="sun"] .le-sv-arc-sparkle {
      fill:#ffdfaa !important;
      filter:drop-shadow(0 0 2px #fff0d2) drop-shadow(0 0 5px #e8a64fbb) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-arc-dust-mote {
      fill:#e4a453 !important;
      filter:drop-shadow(0 0 1.4px #d88e3d70) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-arc-sparkle-warm {
      fill:#ffe5b8 !important;
      filter:drop-shadow(0 0 2px #fff1d8) drop-shadow(0 0 5px #f0b65fbb) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-arc-sparkle-cool {
      fill:#f2c27f !important;
      filter:drop-shadow(0 0 2px #ffe9c7) drop-shadow(0 0 5px #d99443bb) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-arc-star-glow {
      fill:#ffc875 !important;
      filter:drop-shadow(0 0 4px #e9a34c) drop-shadow(0 0 9px #d88b3bb8) !important;
    }
    #le-sky-view[data-view="sun"] .le-sv-arc-star {
      fill:#fff0d0 !important;
      opacity:.99 !important;
      filter:drop-shadow(0 0 2.8px #fff0d0) drop-shadow(0 0 7px #e6a34d) !important;
    }
    `;
  document.head.appendChild(style);

  const stage = document.createElement("div");
  stage.className = "le-sv-stage";
  stage.hidden = true;
  stage.innerHTML = `
    <svg class="le-sv-svg" aria-label="Fixed Sun guide arc with local rise and set times" role="img">
      <defs>
        <linearGradient id="leSvArcGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f0b875" stop-opacity=".98"/><stop offset="9%" stop-color="#c8e7ff"/><stop offset="28%" stop-color="#e8f7ff"/><stop offset="52%" stop-color="#ffffff"/><stop offset="73%" stop-color="#d3ecff"/><stop offset="91%" stop-color="#ffe0ad"/><stop offset="100%" stop-color="#f2bd78" stop-opacity=".96"/></linearGradient>
        <linearGradient id="leSvRiseSunFill" x1="0" y1="-1" x2="0.9" y2="1"><stop offset="0%" stop-color="#fff4d5"/><stop offset="48%" stop-color="#bfe7ff"/><stop offset="100%" stop-color="#579fff"/></linearGradient>
        <linearGradient id="leSvSetSunFill" x1="0" y1="-1" x2="0.9" y2="1"><stop offset="0%" stop-color="#effaff"/><stop offset="55%" stop-color="#b0dcff"/><stop offset="100%" stop-color="#568cff"/></linearGradient>
        <linearGradient id="leSvRiseWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16395b" stop-opacity=".92"/><stop offset="100%" stop-color="#07182c" stop-opacity=".98"/></linearGradient>
        <linearGradient id="leSvSetWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#143a61" stop-opacity=".92"/><stop offset="100%" stop-color="#06162b" stop-opacity=".98"/></linearGradient>
        <clipPath id="leSvRiseSunClip"><circle cx="0" cy="-8" r="10.5"/></clipPath>
        <clipPath id="leSvSetSunClip"><circle cx="0" cy="-8" r="10.5"/></clipPath>
      </defs>
      <path class="le-sv-path le-sv-path-main" id="le-sv-main"/><g id="le-sv-arc-sparkles" aria-hidden="true"></g>
      <circle class="le-sv-endpoint-halo" id="le-sv-rise-halo" r="8"/><circle class="le-sv-endpoint" id="le-sv-rise-dot" r="2.2"/><circle class="le-sv-endpoint-halo" id="le-sv-set-halo" r="8"/><circle class="le-sv-endpoint" id="le-sv-set-dot" r="2.2"/>
      <g id="le-sv-rise-icon" class="le-sv-main-rise-set-icon" display="none" aria-hidden="true">
        <circle cx="0" cy="-8" r="17" fill="#65baff" opacity=".12"/>
        <path d="M-22 2 C-22 -25 22 -25 22 2" fill="none" stroke="#f0c17b" stroke-width=".9" stroke-opacity=".92" stroke-dasharray="1.4 3.2" stroke-linecap="round"/>
        <path d="M-19 2 C-18 -20 18 -20 19 2" fill="none" stroke="#a8ddff" stroke-width=".65" stroke-opacity=".75"/>
        <circle cx="0" cy="-8" r="10.5" fill="url(#leSvRiseSunFill)" stroke="#f4fbff" stroke-width=".65"/>
        <image href="${SUN_TEXTURE_DATA}" x="-10.5" y="-18.5" width="21" height="21" preserveAspectRatio="xMidYMid slice" clip-path="url(#leSvRiseSunClip)" opacity=".96"/>
        <path d="M-24 2 Q-12 0 0 2 T24 2 L24 10 L-24 10 Z" fill="url(#leSvRiseWater)"/>
        <path d="M-24 2 Q-12 0 0 2 T24 2" fill="none" stroke="#ffe0a1" stroke-width="1.25" stroke-linecap="round" filter="drop-shadow(0 0 2px #ffd58b)"/>
        <path d="M-10 4 Q-4 3 2 4 M-7 6 Q0 5 8 6 M-4 8 Q0 7.7 5 8" fill="none" stroke="#ffd99a" stroke-width=".7" stroke-linecap="round" opacity=".9"/>
        <path d="M0 -36 L1.5 -30.5 L7 -29 L1.5 -27.5 L0 -22 L-1.5 -27.5 L-7 -29 L-1.5 -30.5 Z" fill="#ffe0a1" filter="drop-shadow(0 0 3px #ffd58b)"/>
        <circle cx="-18" cy="-12" r=".9" fill="#fff1c9"/><circle cx="15" cy="-18" r=".8" fill="#9ad9ff"/>
      </g>
      <g id="le-sv-set-icon" class="le-sv-main-rise-set-icon" display="none" aria-hidden="true">
        <circle cx="0" cy="-8" r="17" fill="#65baff" opacity=".12"/>
        <path d="M-22 2 C-22 -25 22 -25 22 2" fill="none" stroke="#99d4ff" stroke-width=".95" stroke-opacity=".92" stroke-dasharray="1.4 3.2" stroke-linecap="round"/>
        <path d="M-19 2 C-18 -20 18 -20 19 2" fill="none" stroke="#c9eaff" stroke-width=".65" stroke-opacity=".75"/>
        <circle cx="0" cy="-8" r="10.5" fill="url(#leSvSetSunFill)" stroke="#f4fbff" stroke-width=".65"/>
        <image href="${SUN_TEXTURE_DATA}" x="-10.5" y="-18.5" width="21" height="21" preserveAspectRatio="xMidYMid slice" clip-path="url(#leSvSetSunClip)" opacity=".96"/>
        <path d="M-24 2 Q-12 0 0 2 T24 2 L24 10 L-24 10 Z" fill="url(#leSvSetWater)"/>
        <path d="M-24 2 Q-12 0 0 2 T24 2" fill="none" stroke="#b7e3ff" stroke-width="1.25" stroke-linecap="round" filter="drop-shadow(0 0 2px #80c9ff)"/>
        <path d="M-10 4 Q-4 3 2 4 M-7 6 Q0 5 8 6 M-4 8 Q0 7.7 5 8" fill="none" stroke="#9bd5ff" stroke-width=".7" stroke-linecap="round" opacity=".9"/>
        <path d="M0 -36 L1.5 -30.5 L7 -29 L1.5 -27.5 L0 -22 L-1.5 -27.5 L-7 -29 L-1.5 -30.5 Z" fill="#a6dfff" filter="drop-shadow(0 0 3px #80c9ff)"/>
        <circle cx="-18" cy="-12" r=".9" fill="#d8f0ff"/><circle cx="15" cy="-18" r=".8" fill="#ffe0a1"/>
      </g>
      <text class="le-sv-event-label" id="le-sv-rise-label" text-anchor="start">SUNRISE</text><text class="le-sv-event-time" id="le-sv-rise-time" text-anchor="start"></text>
      <text class="le-sv-event-label" id="le-sv-set-label" text-anchor="end">SUNSET</text><text class="le-sv-event-time" id="le-sv-set-time" text-anchor="end"></text>
    </svg>
    <canvas class="le-sv-canvas" aria-hidden="true"></canvas>
    <div class="le-sv-solar-info" aria-label="Solar details">
      <div class="le-sv-solar-phase">
        <div id="le-sv-phase-name" class="le-sv-solar-kicker">--</div>
        <div class="le-sv-solar-illumination"><span id="le-sv-illumination-value">--%</span></div>
        <div class="le-sv-solar-subtitle">ALTITUDE</div>
      </div>
      <div class="le-sv-solar-side le-sv-solar-age">
        <div class="le-sv-solar-kicker">DAYLIGHT</div>
        <div id="le-sv-solar-age-value" class="le-sv-solar-value">-- days</div>
      </div>
      <div class="le-sv-solar-side le-sv-solar-next">
        <div class="le-sv-solar-kicker">SOLAR NOON</div>
        <div id="le-sv-next-phase-value" class="le-sv-solar-value">--</div>
        <div id="le-sv-next-phase-countdown" class="le-sv-solar-countdown">--</div>
      </div>
    </div>
    <div class="le-sv-timeline" hidden>
      <svg class="le-sv-horizontal-rail-sparkles" aria-hidden="true" viewBox="0 0 390 98" preserveAspectRatio="none">
        <defs>
          <linearGradient id="leSvHorizontalTrailBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#5aa9ff" stop-opacity=".62"/><stop offset="17%" stop-color="#8acbff"/><stop offset="34%" stop-color="#d9f2ff"/><stop offset="50%" stop-color="#ffffff"/><stop offset="66%" stop-color="#d8efff"/><stop offset="83%" stop-color="#86c7ff"/><stop offset="100%" stop-color="#4c9dff" stop-opacity=".68"/>
          </linearGradient>
          <linearGradient id="leSvHorizontalTrailGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d29a54" stop-opacity=".10"/><stop offset="18%" stop-color="#f2c47b" stop-opacity=".28"/><stop offset="34%" stop-color="#ffe1a0" stop-opacity=".56"/><stop offset="50%" stop-color="#ffd078" stop-opacity=".76"/><stop offset="66%" stop-color="#ffe5b0" stop-opacity=".48"/><stop offset="82%" stop-color="#edb866" stop-opacity=".30"/><stop offset="100%" stop-color="#cf914b" stop-opacity=".10"/>
          </linearGradient>
          <pattern id="leSvScrollerSunTexture" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${SUN_TEXTURE_DATA}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>
          <radialGradient id="leSvScrollerSunShade" cx="30%" cy="23%" r="82%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".30"/><stop offset="43%" stop-color="#d9e8f8" stop-opacity=".06"/><stop offset="100%" stop-color="#0c182b" stop-opacity=".62"/></radialGradient>
        </defs>
        <g id="le-sv-horizontal-trail-group"></g><g id="le-sv-horizontal-sparkle-group"></g>
        <g id="le-sv-horizontal-sun-marker" class="le-sv-horizontal-sun-marker" transform="translate(0 62)" aria-hidden="true">
          <circle class="le-sv-horizontal-sun-halo" r="16"/>
          <circle class="le-sv-horizontal-sun-surface" r="12.6" fill="url(#leSvScrollerSunTexture)"/>
          <circle class="le-sv-horizontal-sun-shade" r="12.6" fill="url(#leSvScrollerSunShade)"/>
          <circle class="le-sv-horizontal-sun-rim" r="12.6"/>
        </g>
      </svg>
      <button class="le-sv-selected-time" type="button" aria-label="Tap to return to live solar time">--:--</button>
      <input class="le-sv-range" type="range" min="0" max="1000" step="1" value="0" aria-label="Select a time between sunrise and sunset">
      <div class="le-sv-vertical-scroller" aria-hidden="true"><svg viewBox="0 0 100 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="leSvVerticalGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#cdeaff"/><stop offset="34%" stop-color="#66baff"/><stop offset="68%" stop-color="#83c5ff"/><stop offset="100%" stop-color="#c2e4ff"/></linearGradient>
          <linearGradient id="leSvVerticalGoldGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f4c987" stop-opacity=".72"/><stop offset="25%" stop-color="#ffe4b6"/><stop offset="55%" stop-color="#ffca78"/><stop offset="78%" stop-color="#ffe7bd"/><stop offset="100%" stop-color="#edbd77" stop-opacity=".72"/></linearGradient>
          <radialGradient id="leSvVerticalSun" cx="31%" cy="24%" r="78%"><stop offset="0%" stop-color="#fff"/><stop offset="42%" stop-color="#d9e7f8"/><stop offset="78%" stop-color="#92a9c6"/><stop offset="100%" stop-color="#516784"/></radialGradient>
          <pattern id="leSvVerticalSunTexture" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${SUN_TEXTURE_DATA}" x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>
          <radialGradient id="leSvVerticalSunShade" cx="30%" cy="23%" r="82%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".30"/><stop offset="43%" stop-color="#d9e8f8" stop-opacity=".06"/><stop offset="100%" stop-color="#0c182b" stop-opacity=".62"/></radialGradient>
        </defs>
        <path class="le-sv-vertical-path-glow" d="M50 4 C38 52 38 100 50 150 C62 200 62 248 50 296"/>
        <path class="le-sv-vertical-path" id="le-sv-vertical-path" d="M50 4 C38 52 38 100 50 150 C62 200 62 248 50 296"/>
        <g id="le-sv-vertical-trail-group" aria-hidden="true"></g>
        <g id="le-sv-vertical-dust-group" aria-hidden="true"></g>
        <g id="le-sv-vertical-sparkle-group" aria-hidden="true"></g>
        <circle class="le-sv-vertical-end-halo" cx="50" cy="5" r="8"/><circle class="le-sv-vertical-end" cx="50" cy="5" r="3"/>
        <circle class="le-sv-vertical-end-halo" cx="50" cy="295" r="8"/><circle class="le-sv-vertical-end" cx="50" cy="295" r="3"/>
        <g id="le-sv-vertical-marker" transform="translate(50 150)"><circle class="le-sv-vertical-marker-halo" r="19"/><circle class="le-sv-horizontal-sun-surface" r="13" fill="url(#leSvVerticalSunTexture)"/><circle class="le-sv-horizontal-sun-shade" r="13" fill="url(#leSvVerticalSunShade)"/><circle class="le-sv-horizontal-sun-rim" r="13"/></g>
      </svg></div>
      <div class="le-sv-end-labels">
        <div class="le-sv-endpoint-info le-sv-endpoint-info-rise">
          
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
      </svg>
          <span class="le-sv-end-label-copy"><span class="start-label">--:--</span><small>RISE</small></span>
        </div>
        <div class="end le-sv-endpoint-info le-sv-endpoint-info-set">
          
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
      </svg>
          <span class="le-sv-end-label-copy"><span class="end-label">--:--</span><small>SET</small></span>
        </div>
      </div>
    </div>
    <div class="le-sv-location-note" hidden>Location is off · local Sun path and rise/set times are hidden</div>`;
  root.appendChild(stage);

  const $ = selector => stage.querySelector(selector);
  const canvas = $(".le-sv-canvas"), svg = $(".le-sv-svg"), timeline = $(".le-sv-timeline");
  const selectedLabel = $(".le-sv-selected-time"), range = $(".le-sv-range"), locationNote = $(".le-sv-location-note");
  const phaseNameNode = $("#le-sv-phase-name"), illuminationNode = $("#le-sv-illumination-value");
  const solarAgeNode = $("#le-sv-solar-age-value"), nextPhaseNode = $("#le-sv-next-phase-value");
  const nextPhaseCountdownNode = $("#le-sv-next-phase-countdown");
  const dayLabel = $(".start-label"), setLabel = $(".end-label");
  const verticalPath = $("#le-sv-vertical-path"), verticalMarker = $("#le-sv-vertical-marker");
  const verticalTrailGroup = $("#le-sv-vertical-trail-group"), verticalDustGroup = $("#le-sv-vertical-dust-group");
  const verticalScrollerSvg = $(".le-sv-vertical-scroller svg");
  const horizontalRailSparkles = $(".le-sv-horizontal-rail-sparkles");
  const horizontalTrailGroup = $("#le-sv-horizontal-trail-group");
  const horizontalSparkleGroup = $("#le-sv-horizontal-sparkle-group");
  const horizontalSunMarker = $("#le-sv-horizontal-sun-marker");
  const verticalSparkleGroup = $("#le-sv-vertical-sparkle-group");
  const fmt = value => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const isLocationEnabled = () => window.liveEarthGetLocationState?.() === true;
  const SOLAR_SYNODIC_MONTH_DAYS = 29.530588853;



  function updateSolarInfo() {
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
  }

  function setScrollerLocationMode(hasLocalTimes) {
    // The visual scroller remains present regardless of Location. Only the local rise/set
    // labels are hidden when no user location is actively available.
    timeline.hidden = false;
    timeline.classList.toggle("le-sv-no-local-times", !hasLocalTimes);
    locationNote.hidden = true;
  }

  function fractionOfLocalDay(timestamp) {
    const d = new Date(timestamp);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return clamp((timestamp - dayStart) / 86400000, 0, 1);
  }

  function timestampAtLocalDayProgress(fraction, referenceTimestamp = Date.now()) {
    const d = new Date(referenceTimestamp);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return dayStart + clamp(fraction, 0, 1) * 86400000;
  }
  let active = false, astronomy = null, THREE = null, renderer = null, scene = null, camera = null;
  let sun = null, sunTexture = null;
  let frame = 0, timer = 0, observer = null, interval = null, selectedTime = Date.now(), progress = 0, live = false;
  let dimensions = { w: 0, h: 0, radius: 0 };
  let arcGeometry = null;
  let horizontalScrollerGeometry = null;
  let resizeFrame = 0, resizeObserver = null, lastResizeDpr = 0;
  let initialized = false, loading = null;

  function sunPositionUtcClock(date, lat, lon) {
    // Current astronomy.js uses getHours() while applying a longitude correction.
    // Present UTC clock fields without changing the instant used by sunCoords();
    // this avoids a local-timezone offset being added a second time on iPhone.
    const utcClock = {
      getTime: () => date.getTime(),
      getHours: () => date.getUTCHours(),
      getMinutes: () => date.getUTCMinutes(),
      getSeconds: () => date.getUTCSeconds()
    };
    return astronomy.sunPosition(utcClock, lat, lon);
  }
  function initRenderer() {
    if (initialized) return Promise.resolve();
    if (loading) return loading;
    loading = (async () => {
      THREE = await import(new URL("./vendor/three.module.js", document.baseURI).href);
      astronomy = await import(new URL("./astronomy.js", document.baseURI).href);
      // Finish one-time initialization even if the user closes/reopens the view
      // while imports are pending; activation checks below govern visible work.
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 500);
      camera.position.set(0, 0, 100);
      camera.lookAt(0, 0, 0);
      sunTexture = await new THREE.TextureLoader().loadAsync(SUN_TEXTURE_DATA);
      sunTexture.colorSpace = THREE.SRGBColorSpace;
      sunTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshBasicMaterial({ map: sunTexture, color: 0xffffff });
      sun = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), material);
      sun.name = "leSunView3DOrb"
      scene.add(sun);
      initialized = true;
      resize();
    })().catch(error => {
      console.error("[LIVE // EARTH] Sun renderer could not initialize.", error);
      locationNote.hidden = false;
      locationNote.textContent = "Sun renderer unavailable · the existing app remains available";
    }).finally(() => { loading = null; });
    return loading;
  }
  function resize() {
    if (!renderer || !camera) return;
    // Read the laid-out viewport instead of trusting a possibly stale iOS inner/client size
    // during the portrait <-> landscape transition.
    const rect = root.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const sizeChanged = w !== dimensions.w || h !== dimensions.h;
    const ratioChanged = pixelRatio !== lastResizeDpr;
    if (!sizeChanged && !ratioChanged) return;

    const landscape = w > h;
    dimensions = { w, h, radius: clamp(Math.min(w, h) * 0.052, 16, 42) };
    if (ratioChanged) {
      renderer.setPixelRatio(pixelRatio);
      lastResizeDpr = pixelRatio;
    }
    renderer.setSize(w, h, false);
    // Pixel-space orthographic projection: world (x,y) maps directly to screen
    // (x, h-y). This keeps the 3D sphere circular and aligned with SVG after rotation.
    camera.left = 0; camera.right = w; camera.top = h; camera.bottom = 0;
    camera.near = 0.1; camera.far = 500; camera.position.set(0, 0, 100); camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    drawPaths();
    renderOnce();
  }
  function setCircle(id, point) { const node = $("#" + id); node.removeAttribute("display"); node.setAttribute("cx", point.x); node.setAttribute("cy", point.y); }

  function clearPaths() {
    // Location OFF hides only private/local rise-set text and interval data.
    // The decorative fixed arc remains visible, independent of geolocation.
    ["le-sv-rise-label", "le-sv-rise-time", "le-sv-set-label", "le-sv-set-time"].forEach(id => {
      const node = $("#" + id);
      node.setAttribute("display", "none");
      node.textContent = "";
    });
    if (dimensions.w && dimensions.h) drawPaths();
  }

  // The decorative arc is intentionally fixed: it is a stable visual guide, not a live
  // projection of changing altitude/azimuth samples. Its endpoints follow the mountain
  // skyline in the background artwork after the same centered CSS `cover` crop is applied.
  // Reference-locked screen-space anchor positions. These ratios reproduce the supplied
  // Sun arc composition before the background artwork is replaced. The arc remains stable
  // across devices and orientations; later wallpaper tuning can align the mountains to it.
  function referenceBaseline(h, landscape) {
    // Portrait endpoints follow the reference's ~47.4% viewport line; landscape remains independent.
    return h * (landscape ? 0.543 : 0.474);
  }

  function drawPaths() {
    if (!dimensions.w || !dimensions.h) return;
    const { w, h } = dimensions;
    const landscape = w > h;
    const x0 = w * (landscape ? 0.16 : 0.114);
    const x1 = w * (landscape ? 0.80 : 0.921) - (landscape ? 6 : 0);
    const baseline = referenceBaseline(h, landscape);
    // Endpoint-only asymmetry: keep the approved control points and crest region;
    // lift the start by 8 CSS px and lower the end by 14 CSS px (6 px extra on the
    // right compared with the previous trial). Only the end point is adjusted further.
    const startY = baseline - 8;
    const endY = baseline + 14;
    const centerX = (x0 + x1) / 2;
    const rx = (x1 - x0) / 2;
    const ry = h * (landscape ? 0.35 : 0.208);
    const controlInset = (x1 - x0) * (landscape ? 0.30 : 0.15);
    const controlY = baseline - (4 / 3) * ry;
    arcGeometry = { x0, x1, baseline, startY, endY, centerX, rx, ry, controlInset, controlY, landscape };
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    $("#le-sv-main").setAttribute("d", `M ${x0.toFixed(2)} ${startY.toFixed(2)} C ${(x0 + controlInset).toFixed(2)} ${controlY.toFixed(2)}, ${(x1 - controlInset).toFixed(2)} ${controlY.toFixed(2)}, ${x1.toFixed(2)} ${endY.toFixed(2)}`);
    drawArcSparkles();
    drawScrollerSparkles();

    const rise = { x: x0, y: startY }, set = { x: x1, y: endY };
    ["le-sv-rise-halo", "le-sv-rise-dot", "le-sv-set-halo", "le-sv-set-dot"].forEach(id => $("#" + id).removeAttribute("display"));
    setCircle("le-sv-rise-halo", rise); setCircle("le-sv-rise-dot", rise);
    setCircle("le-sv-set-halo", set); setCircle("le-sv-set-dot", set);

    const showLocalTimes = Boolean(interval && observer && isLocationEnabled());
    const textIds = ["le-sv-rise-label", "le-sv-rise-time", "le-sv-set-label", "le-sv-set-time"];
    textIds.forEach(id => {
      const node = $("#" + id);
      if (showLocalTimes) node.removeAttribute("display");
      else { node.setAttribute("display", "none"); node.textContent = ""; }
    });
    const showLargeRiseSetIcons = false;
    ["le-sv-rise-icon", "le-sv-set-icon"].forEach(id => {
      const icon = $("#" + id);
      if (showLargeRiseSetIcons) icon.removeAttribute("display");
      else icon.setAttribute("display", "none");
    });
    if (showLargeRiseSetIcons) {
      $("#le-sv-rise-icon").setAttribute("transform", `translate(${(rise.x + 4).toFixed(2)} ${(rise.y + 33).toFixed(2)})`);
      $("#le-sv-set-icon").setAttribute("transform", `translate(${set.x.toFixed(2)} ${(set.y + 31).toFixed(2)})`);
    }
    if (showLocalTimes) {
      $("#le-sv-rise-label").setAttribute("x", Math.max(18, rise.x + 4));
      $("#le-sv-rise-label").setAttribute("y", rise.y + 55);
      $("#le-sv-rise-time").setAttribute("x", Math.max(18, rise.x + 4));
      $("#le-sv-rise-time").setAttribute("y", rise.y + 74);
      $("#le-sv-rise-time").textContent = fmt(interval.rise);
      $("#le-sv-set-label").setAttribute("x", Math.min(w - 18, set.x));
      $("#le-sv-set-label").setAttribute("y", set.y + 53);
      $("#le-sv-set-time").setAttribute("x", Math.min(w - 18, set.x));
      $("#le-sv-set-time").setAttribute("y", set.y + 72);
      $("#le-sv-set-time").textContent = fmt(interval.set);
    }
  }
  function setLocalInterval(now = Date.now()) {
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
  }

  function arcCurve(amount) {
    const t = clamp(amount, 0, 1), u = 1 - t;
    const { x0, x1, startY, endY, controlInset, controlY } = arcGeometry;
    const p0 = { x:x0, y:startY };
    const p1 = { x:x0 + controlInset, y:controlY };
    const p2 = { x:x1 - controlInset, y:controlY };
    const p3 = { x:x1, y:endY };
    const x = u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x;
    const y = u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y;
    const dx = 3*u*u*(p1.x-p0.x) + 6*u*t*(p2.x-p1.x) + 3*t*t*(p3.x-p2.x);
    const dy = 3*u*u*(p1.y-p0.y) + 6*u*t*(p2.y-p1.y) + 3*t*t*(p3.y-p2.y);
    return { x, y, dx, dy };
  }

  function pointOnArc(amount) {
    if (!arcGeometry) return { x: dimensions.w * 0.5, y: mountainBaseline(dimensions.w, dimensions.h, dimensions.w > dimensions.h) };
    const p = arcCurve(amount);
    return { x:p.x, y:p.y };
  }

  function arcFrame(amount) {
    const curve = arcCurve(amount);
    const p = { x:curve.x, y:curve.y };
    const length = Math.hypot(curve.dx, curve.dy) || 1;
    const tx = curve.dx / length, ty = curve.dy / length;
    // The chosen normal points out into the open sky above the upper arc.
    return { p, tx, ty, nx: ty, ny: -tx };
  }

  function offsetFromArc(amount, normalOffset, tangentOffset = 0) {
    const f = arcFrame(amount);
    return {
      x: f.p.x + f.nx * normalOffset + f.tx * tangentOffset,
      y: f.p.y + f.ny * normalOffset + f.ty * tangentOffset
    };
  }
  function currentPoint() { return pointOnArc(progress); }

  // Static stardust is scattered in a loose band around the arc, like the Home orbit.
  // Every point is deterministic and is rebuilt only when geometry changes; no animation loop.
  function drawArcSparkles() {
    const group = $("#le-sv-arc-sparkles");
    if (!group || !arcGeometry) return;
    group.replaceChildren();
    const ns = "http://www.w3.org/2000/svg";
    const scale = clamp(Math.min(dimensions.w, dimensions.h) / 430, 0.82, 1.35);
    let seed = arcGeometry.landscape ? 0x53A71 : 0x2C0A7;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const safe = (v, lo, hi) => clamp(v, lo, hi);

    // Portrait density is calibrated to the approved iPhone Air reference layout
    // (420 × 912 CSS px, about 554.4 CSS px of rendered arc). Measure the ACTUAL
    // SVG path so tall phones/tablets receive enough stars for the same visual
    // density, regardless of viewport dimensions. Landscape remains frozen at
    // its current density while we finish and approve portrait first.
    const PORTRAIT_REFERENCE_ARC_LENGTH = 554.4;
    let renderedArcLength = PORTRAIT_REFERENCE_ARC_LENGTH;
    if (!arcGeometry.landscape) {
      const arcPath = $("#le-sv-main");
      if (arcPath && typeof arcPath.getTotalLength === "function") {
        try {
          const measuredLength = arcPath.getTotalLength();
          if (Number.isFinite(measuredLength) && measuredLength > 0) renderedArcLength = measuredLength;
        } catch (_) { /* retain the iPhone Air reference as a safe fallback */ }
      }
    }
    const densityRatio = arcGeometry.landscape
      ? 1
      : clamp(renderedArcLength / PORTRAIT_REFERENCE_ARC_LENGTH, 0.60, 3.0);
    const trailParticleCount = arcGeometry.landscape
      ? 300
      : clamp(Math.round(300 * densityRatio), 180, 900);
    const ambientDustCount = arcGeometry.landscape
      ? 120
      : clamp(Math.round(120 * densityRatio), 72, 360);
    const coreParticleCount = Math.round(trailParticleCount * 0.8);

    // Extra ambient stardust: a second, much finer layer around BOTH sides of
    // the trail. Its portrait count adapts with the measured arc length; the
    // established landscape count is preserved for the later landscape pass.
    for (let i = 0; i < ambientDustCount; i++) {
      const t = 0.018 + rand() * 0.964;
      let normalOffset = (rand() + rand() - 1) * 27 * scale;
      if (rand() < 0.12) {
        normalOffset += (rand() < 0.5 ? -1 : 1) * (10 + rand() * 18) * scale;
      }
      const tangentOffset = (rand() + rand() - 1) * 14 * scale;
      const p = offsetFromArc(t, normalOffset, tangentOffset);
      const mote = document.createElementNS(ns, "circle");
      mote.setAttribute("cx", safe(p.x, 1, dimensions.w - 1).toFixed(2));
      mote.setAttribute("cy", safe(p.y, 1, dimensions.h - 1).toFixed(2));
      mote.setAttribute("r", (scale * (0.22 + rand() * 0.46)).toFixed(2));
      mote.setAttribute("opacity", (0.10 + rand() * 0.25).toFixed(2));
      mote.setAttribute("class", "le-sv-arc-dust-mote");
      group.appendChild(mote);
    }

    // A star trail replaces the drawn line. Portrait scales its particle count
    // by rendered arc length; about 80% stay close to the curve while the rest
    // drift farther out. Landscape keeps its existing 300-particle count.
    // Points remain deterministic and static, with no animation loop.
    for (let i = 0; i < trailParticleCount; i++) {
      const core = i < coreParticleCount;
      const t = 0.025 + rand() * 0.95;
      let normalOffset;
      let tangentOffset;
      if (core) {
        // Dense but irregular center trail: tiny pinpricks, not a continuous stroke.
        normalOffset = (rand() + rand() - 1) * 2.3 * scale;
        tangentOffset = (rand() + rand() - 1) * 2.8 * scale;
      } else {
        // A smaller halo of drifting stardust gives the trail a natural, airy edge.
        normalOffset = (rand() + rand() - 1) * 10 * scale;
        if (rand() < 0.24) {
          const side = rand() < 0.72 ? 1 : -1;
          normalOffset += side * (4 + rand() * 8) * scale;
        }
        tangentOffset = (rand() + rand() - 1) * 8 * scale;
      }
      const p = offsetFromArc(t, normalOffset, tangentOffset);
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", safe(p.x, 2, dimensions.w - 2).toFixed(2));
      dot.setAttribute("cy", safe(p.y, 2, dimensions.h - 2).toFixed(2));
      dot.setAttribute("r", (scale * (core ? 0.32 + rand() * 0.78 : 0.38 + rand() * 0.88)).toFixed(2));
      dot.setAttribute("opacity", (core ? 0.42 + rand() * 0.56 : 0.22 + rand() * 0.66).toFixed(2));
      const warmEnd = t < 0.105 || t > 0.895;
      const coolGlint = !core && rand() < 0.45;
      dot.setAttribute("class", warmEnd ? "le-sv-arc-sparkle le-sv-arc-sparkle-warm" : (coolGlint ? "le-sv-arc-sparkle le-sv-arc-sparkle-cool" : "le-sv-arc-sparkle"));
      group.appendChild(dot);
    }

    // Varied four-point glints: offset above AND below the curve, with intentional
    // clusters and quiet gaps like the reference's natural starlight trail.
    const flares = [
      { t:0.035, off:7, tan:-6, size:1.8, rot:-12 },
      { t:0.079, off:-14, tan:4, size:2.15, rot:17 },
      { t:0.158, off:-5, tan:7, size:2.45, rot:-21 },
      { t:0.278, off:6, tan:-8, size:2.75, rot:-8 },
      { t:0.309, off:-16, tan:3, size:1.55, rot:19 },
      { t:0.397, off:-7, tan:-4, size:2.25, rot:10 },
      { t:0.433, off:15, tan:6, size:1.7, rot:-18 },
      { t:0.452, off:-19, tan:1, size:2.55, rot:22 },
      { t:0.523, off:5, tan:-7, size:3.0, rot:7 },
      { t:0.628, off:16, tan:-3, size:2.2, rot:16 },
      { t:0.649, off:-12, tan:6, size:2.6, rot:-19 },
      { t:0.685, off:8, tan:-5, size:1.75, rot:12 },
      { t:0.713, off:-17, tan:2, size:2.0, rot:-9 },
      { t:0.773, off:10, tan:5, size:2.75, rot:18 },
      { t:0.863, off:14, tan:3, size:2.2, rot:11 },
      { t:0.882, off:-10, tan:-4, size:2.5, rot:-20 },
      { t:0.907, off:5, tan:7, size:1.65, rot:15 },
      { t:0.951, off:-15, tan:1, size:2.25, rot:-13 },
      { t:0.969, off:8, tan:-5, size:1.85, rot:9 },
      { t:0.985, off:-4, tan:2, size:2.1, rot:-17 }
    ];
    flares.forEach(({ t, off, tan, size, rot }) => {
      const p = offsetFromArc(t, off * scale, tan * scale);
      appendStaticStar(group, {
        x: safe(p.x, 4, dimensions.w - 4),
        y: safe(p.y, 4, dimensions.h - 4)
      }, size * scale * 0.82, ns, rot);
    });
  }

  function appendStaticStar(group, p, size, ns, rotation = 0) {
    const glow = document.createElementNS(ns, "circle");
    glow.setAttribute("cx", p.x.toFixed(2));
    glow.setAttribute("cy", p.y.toFixed(2));
    glow.setAttribute("r", (size * 1.35).toFixed(2));
    glow.setAttribute("class", "le-sv-arc-star-glow");
    group.appendChild(glow);
    const coreWidth = size * 0.16;
    const star = document.createElementNS(ns, "path");
    star.setAttribute("d", `M ${p.x.toFixed(2)} ${(p.y-size*2.1).toFixed(2)} L ${(p.x+coreWidth).toFixed(2)} ${(p.y-coreWidth).toFixed(2)} L ${(p.x+size*0.86).toFixed(2)} ${p.y.toFixed(2)} L ${(p.x+coreWidth).toFixed(2)} ${(p.y+coreWidth).toFixed(2)} L ${p.x.toFixed(2)} ${(p.y+size*2.1).toFixed(2)} L ${(p.x-coreWidth).toFixed(2)} ${(p.y+coreWidth).toFixed(2)} L ${(p.x-size*0.86).toFixed(2)} ${p.y.toFixed(2)} L ${(p.x-coreWidth).toFixed(2)} ${(p.y-coreWidth).toFixed(2)} Z`);
    star.setAttribute("class", "le-sv-arc-star");
    if (rotation) star.setAttribute("transform", `rotate(${rotation} ${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    group.appendChild(star);
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", p.x.toFixed(2)); dot.setAttribute("cy", p.y.toFixed(2));
    dot.setAttribute("r", Math.max(0.65, size * 0.18).toFixed(2));
    dot.setAttribute("class", "le-sv-scroller-sparkle-core");
    group.appendChild(dot);
  }

  function drawScrollerSparkles() {
    const ns = "http://www.w3.org/2000/svg";
    // Portrait: use the exact pixel width of the timeline so the four-point stars stay round.
    const railWidth = Math.max(1, timeline.clientWidth || dimensions.w * 0.86);
    const trailStart = railWidth * 0.05;
    const trailLength = railWidth * 0.90;
    horizontalRailSparkles.setAttribute("viewBox", `0 0 ${railWidth.toFixed(2)} 98`);
    horizontalTrailGroup.replaceChildren();
    horizontalSparkleGroup.replaceChildren();

    // Keep a full-width transparent touch range, but draw the visible artwork in the
    // middle 90% so rise/set gestures never require an uncomfortable edge reach.
    // Reference-matched broad wave: clear upper sweep, lower return, and a slight end-to-end tilt.
    // Both ribbons bloom through the middle and taper to fine tips at the ends.
    const blueCurveY = t => 61 + 6 * (1 - t) - 6 * t - 14.5 * Math.sin(2 * Math.PI * t) + 1.2 * Math.sin(4 * Math.PI * t - 0.30);
    const goldCurveY = t => 63.2 + 5 * (1 - t) - 5.8 * t - 13.0 * Math.sin(2 * Math.PI * t + 0.035) + 1.0 * Math.sin(4 * Math.PI * t + 0.28);
    horizontalScrollerGeometry = { railWidth, trailStart, trailLength, blueCurveY, goldCurveY };
    const makeTaperedRibbon = (curveY, endWidth, addedWidth, waveSamples = null) => {
      const samples = waveSamples || Math.max(90, Math.min(180, Math.ceil(railWidth / 2.5)));
      const upper = [], lower = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.22);
        const fullWidth = endWidth + addedWidth * taper;
        const x = trailStart + trailLength * t, y = curveY(t), half = fullWidth / 2;
        upper.push([x, y - half]); lower.push([x, y + half]);
      }
      const fmt = p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
      return `M ${fmt(upper[0])} ` + upper.slice(1).map(p => `L ${fmt(p)}`).join(" ") +
        " " + lower.reverse().map(p => `L ${fmt(p)}`).join(" ") + " Z";
    };
    const blueRibbon = document.createElementNS(ns, "path");
    blueRibbon.setAttribute("d", makeTaperedRibbon(blueCurveY, 0.14, 3.25));
    blueRibbon.setAttribute("class", "le-sv-horizontal-trail-blue");
    horizontalTrailGroup.appendChild(blueRibbon);
    const goldRibbon = document.createElementNS(ns, "path");
    goldRibbon.setAttribute("d", makeTaperedRibbon(goldCurveY, 0.08, 0.78));
    goldRibbon.setAttribute("class", "le-sv-horizontal-trail-gold");
    horizontalTrailGroup.appendChild(goldRibbon);

    // Fine static dust orbits around both curves. Count adapts to the actual rail width;
    // a seeded generator keeps the arrangement stable until the viewport changes.
    let dustSeed = (0x4D00D + Math.round(railWidth * 7)) >>> 0;
    const randDust = () => ((dustSeed = (dustSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const dustScale = clamp(railWidth / 360, 0.82, 1.3);
    const dustCount = clamp(Math.round(100 * railWidth / 360), 70, 220);
    for (let i = 0; i < dustCount; i++) {
      const t = 0.025 + randDust() * 0.95;
      const curveY = randDust() < 0.37 ? goldCurveY : blueCurveY;
      let normalOffset = (randDust() + randDust() - 1) * 19 * dustScale;
      if (randDust() < 0.20) normalOffset += (randDust() < 0.5 ? -1 : 1) * (10 + randDust() * 13) * dustScale;
      const x = clamp(trailStart + trailLength * t + (randDust() + randDust() - 1) * 4.8 * dustScale, trailStart + 1, trailStart + trailLength - 1);
      // Keep the pearls in the atmospheric band around the scroller, clear of the time text.
      const y = clamp(curveY(t) + normalOffset, 24, 77);
      const mote = document.createElementNS(ns, "circle");
      mote.setAttribute("cx", x.toFixed(2)); mote.setAttribute("cy", y.toFixed(2));
      mote.setAttribute("r", (dustScale * (0.34 + randDust() * 0.42)).toFixed(2));
      mote.setAttribute("opacity", (0.38 + randDust() * 0.48).toFixed(2));
      mote.setAttribute("class", randDust() < 0.14 ? "le-sv-horizontal-dust-gold" : "le-sv-horizontal-dust-blue");
      horizontalTrailGroup.appendChild(mote);
    }

    const horizontalStars = [
      {t:.045,s:1.25,o:-8,r:-14},{t:.085,s:1.0,o:6,r:12},{t:.132,s:1.3,o:-5,r:24},
      {t:.176,s:1.05,o:7,r:-8},{t:.218,s:1.22,o:-7,r:17},{t:.262,s:.92,o:5,r:-21},
      {t:.307,s:1.18,o:-4,r:8},{t:.352,s:1.3,o:7,r:-12},{t:.397,s:.96,o:-6,r:19},
      {t:.441,s:1.16,o:5,r:-7},{t:.486,s:1.32,o:-5,r:16},{t:.531,s:1.0,o:6,r:-19},
      {t:.576,s:1.22,o:-7,r:11},{t:.621,s:.9,o:4,r:-16},{t:.666,s:1.24,o:-5,r:18},
      {t:.711,s:1.02,o:7,r:-11},{t:.756,s:1.28,o:-6,r:15},{t:.801,s:.96,o:5,r:-18},
      {t:.846,s:1.2,o:-4,r:9},{t:.89,s:1.0,o:7,r:-13},{t:.932,s:1.24,o:-6,r:20},
      {t:.965,s:.95,o:4,r:-9}
    ];
    horizontalStars.forEach(({t,s,o,r}, index) => {
      const curveY = index % 2 ? goldCurveY : blueCurveY;
      const x = trailStart + trailLength * t;
      const y = clamp(curveY(t) + o, 38, 84);
      appendStaticStar(horizontalSparkleGroup, { x, y }, s * 0.72, ns, r);
      // Subtle gold glints alternate through the icy trail, without overpowering it.
      if ([2, 7, 12, 17, 20].includes(index)) {
        const base = index * 3;
        horizontalSparkleGroup.children[base].setAttribute("class", "le-sv-scroller-glow-gold");
        horizontalSparkleGroup.children[base + 1].setAttribute("class", "le-sv-arc-star le-sv-scroller-star-gold");
        horizontalSparkleGroup.children[base + 2].setAttribute("class", "le-sv-scroller-sparkle-core le-sv-scroller-core-gold");
      }
    });
    updateHorizontalMarker();

    // Landscape: rotate the portrait scroller's tapered two-colour ribbons into a
    // vertical winding rail. Density and particle sizing adapt to the rendered rail
    // height, while a seeded layout keeps the stardust stable between resizes.
    verticalTrailGroup.replaceChildren();
    verticalDustGroup.replaceChildren();
    verticalSparkleGroup.replaceChildren();
    if (dimensions.w > dimensions.h && verticalPath && typeof verticalPath.getTotalLength === "function") {
      try {
        const length = verticalPath.getTotalLength();
        const verticalRect = verticalScrollerSvg ? verticalScrollerSvg.getBoundingClientRect() : { width: 0, height: 0 };
        const renderedHeight = Math.max(120, verticalRect.height || Math.min(dimensions.h * 0.36, dimensions.w * 0.70));
        const adapt = clamp(renderedHeight / 230, 0.68, 1.5);
        const samples = clamp(Math.ceil(renderedHeight / 1.35), 120, 280);
        const pointOnRail = t => {
          const p = verticalPath.getPointAtLength(length * clamp(t, 0, 1));
          const before = verticalPath.getPointAtLength(length * clamp(t - 0.0035, 0, 1));
          const after = verticalPath.getPointAtLength(length * clamp(t + 0.0035, 0, 1));
          const dx = after.x - before.x, dy = after.y - before.y;
          const mag = Math.hypot(dx, dy) || 1;
          return { x:p.x, y:p.y, tx:dx/mag, ty:dy/mag, nx:dy/mag, ny:-dx/mag };
        };
        const ribbonD = (endWidth, addedWidth, normalOffset = 0) => {
          const upper = [], lower = [];
          for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const frame = pointOnRail(t);
            const taper = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.22);
            const halfWidth = (endWidth + addedWidth * taper) / 2;
            const cx = frame.x + frame.nx * normalOffset;
            const cy = frame.y + frame.ny * normalOffset;
            upper.push([cx + frame.nx * halfWidth, cy + frame.ny * halfWidth]);
            lower.push([cx - frame.nx * halfWidth, cy - frame.ny * halfWidth]);
          }
          const fmt = p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
          return `M ${fmt(upper[0])} ` + upper.slice(1).map(p => `L ${fmt(p)}`).join(" ") +
            " " + lower.reverse().map(p => `L ${fmt(p)}`).join(" ") + " Z";
        };
        const appendRibbon = (className, d) => {
          const path = document.createElementNS(ns, "path");
          path.setAttribute("d", d);
          path.setAttribute("class", className);
          verticalTrailGroup.appendChild(path);
        };
        appendRibbon("le-sv-vertical-ribbon-glow", ribbonD(0.3, 8.2));
        appendRibbon("le-sv-vertical-trail-blue", ribbonD(0.14, 3.25));
        appendRibbon("le-sv-vertical-trail-gold", ribbonD(0.08, 0.78, 0.42));

        let dustSeed = (0x725ED + Math.round(renderedHeight * 13) + Math.round((verticalRect.width || 80) * 7)) >>> 0;
        const randDust = () => ((dustSeed = (dustSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
        const dustCount = clamp(Math.round(renderedHeight * 0.29), 36, 145);
        for (let i = 0; i < dustCount; i++) {
          const t = 0.018 + randDust() * 0.964;
          const frame = pointOnRail(t);
          let normalOffset = (randDust() + randDust() - 1) * 12 * adapt;
          if (randDust() < 0.18) normalOffset += (randDust() < 0.5 ? -1 : 1) * (10 + randDust() * 12) * adapt;
          const tangentOffset = (randDust() + randDust() - 1) * 4.5 * adapt;
          const x = clamp(frame.x + frame.nx * normalOffset + frame.tx * tangentOffset, 1.5, 98.5);
          const y = clamp(frame.y + frame.ny * normalOffset + frame.ty * tangentOffset, 1.5, 298.5);
          const mote = document.createElementNS(ns, "circle");
          mote.setAttribute("cx", x.toFixed(2));
          mote.setAttribute("cy", y.toFixed(2));
          mote.setAttribute("r", (adapt * (0.30 + randDust() * 0.44)).toFixed(2));
          mote.setAttribute("opacity", (0.28 + randDust() * 0.52).toFixed(2));
          mote.setAttribute("class", randDust() < 0.16 ? "le-sv-vertical-dust-gold" : "le-sv-vertical-dust-blue");
          verticalDustGroup.appendChild(mote);
        }

        const starCount = clamp(Math.round(renderedHeight / 13.5), 12, 32);
        for (let i = 0; i < starCount; i++) {
          const t = (i + 0.5 + (randDust() - 0.5) * 0.28) / starCount;
          const frame = pointOnRail(t);
          let offset = (randDust() + randDust() - 1) * 7.2 * adapt;
          if (randDust() < 0.28) offset += (randDust() < 0.5 ? -1 : 1) * (3 + randDust() * 5) * adapt;
          const along = (randDust() + randDust() - 1) * 2.2 * adapt;
          const p = {
            x: clamp(frame.x + frame.nx * offset + frame.tx * along, 3, 97),
            y: clamp(frame.y + frame.ny * offset + frame.ty * along, 3, 297)
          };
          const starSize = (0.8 + randDust() * 0.58) * adapt;
          const rotation = Math.round(randDust() * 48 - 24);
          const first = verticalSparkleGroup.children.length;
          appendStaticStar(verticalSparkleGroup, p, starSize, ns, rotation);
          const gold = i % 5 === 2 || i % 7 === 5;
          verticalSparkleGroup.children[first + 2].setAttribute("class", gold ? "le-sv-vertical-star-core-gold" : "le-sv-vertical-star-core");
          if (gold) {
            verticalSparkleGroup.children[first].setAttribute("class", "le-sv-scroller-glow-gold");
            verticalSparkleGroup.children[first + 1].setAttribute("class", "le-sv-scroller-star-gold");
          }
        }
      } catch (_) {
        // Keep Sun/time input usable if this browser lacks SVG path measurements.
      }
    }
  }

  function updateSolarOrb() {
    if (!sun) return;
    const p = currentPoint(), h = dimensions.h;
    sun.position.set(p.x, h - p.y, 0);
    sun.scale.setScalar(dimensions.radius);
  }

  function updateHorizontalMarker() {
    if (!horizontalSunMarker || !horizontalScrollerGeometry) return;
    const { trailStart, trailLength, blueCurveY, goldCurveY } = horizontalScrollerGeometry;
    const t = clamp(progress, 0, 1);
    const x = trailStart + trailLength * t;
    const y = (blueCurveY(t) + goldCurveY(t)) / 2;
    horizontalSunMarker.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    selectedLabel.textContent = fmt(selectedTime);
    if (dimensions.w <= dimensions.h) {
      // Red clock is visually attached to the mini Sun; the transparent slider
      // still occupies the full width for comfortable thumb reach.
      selectedLabel.style.left = `${x.toFixed(2)}px`;
      selectedLabel.style.right = "auto";
      selectedLabel.style.width = "max-content";
      selectedLabel.style.top = `${Math.max(22, y - 13).toFixed(2)}px`;
      selectedLabel.style.transform = "translate(-50%,-100%)";
      selectedLabel.style.color = "#ff7189";
    } else {
      ["left", "right", "width", "top", "transform", "color"].forEach(name => selectedLabel.style.removeProperty(name));
    }
  }
  function updateVerticalMarker() {
    if (!verticalPath || !verticalMarker) return;
    try {
      const length = verticalPath.getTotalLength();
      const landscape = dimensions.w > dimensions.h;
      // Portrait remains exactly on its original progress mapping. Landscape alone
      // places Rise at the bottom and Set at the top of the vertical rail.
      const railProgress = landscape ? 1 - clamp(progress, 0, 1) : clamp(progress, 0, 1);
      const point = verticalPath.getPointAtLength(length * railProgress);
      verticalMarker.setAttribute("transform", `translate(${point.x} ${point.y})`);
      if (landscape && verticalScrollerSvg) {
        const railRect = verticalScrollerSvg.getBoundingClientRect();
        const timelineRect = timeline.getBoundingClientRect();
        const y = railRect.top - timelineRect.top + (point.y / 300) * railRect.height;
        // Keep the red timer attached just 4 CSS pixels to the Sun's left edge by a 4 CSS pixel gap (13px radius + 4px gap).
        selectedLabel.style.left = `${Math.max(2, railRect.left - timelineRect.left + railRect.width * (point.x / 100) - 17)}px`;
        selectedLabel.style.right = "auto";
        selectedLabel.style.width = "max-content";
        selectedLabel.style.top = `${y}px`;
        selectedLabel.style.transform = "translate(-100%,-50%)";
      }
      // Portrait's original attachment above the small Sun is positioned exclusively
      // by the unchanged updateHorizontalMarker function.
    } catch (_) { /* Keep the scroller usable if SVG path metrics are unavailable. */ }
  }
  function renderOnce() {
    updateSolarInfo();
    updateHorizontalMarker();
    updateVerticalMarker();
    if (!active || !renderer || !scene || !camera || !sun) return;
    updateSolarOrb();
    renderer.render(scene, camera);
  }
  function tickLiveTime() {
    if (!active) return;
    const now = Date.now();
    if (live && interval) {
      if (now >= interval.set) {
        setLocalInterval(now);
        return;
      }
      if (now >= interval.rise) {
        selectedTime = now;
        progress = clamp((now - interval.rise) / (interval.set - interval.rise), 0, 1);
        range.value = String(Math.round(progress * 1000));
        selectedLabel.textContent = fmt(selectedTime);
      }
    } else if (live && !interval) {
      // Location-independent scrub mode: use the device's local clock day only for
      // slider placement. No local rise/set values are inferred or displayed.
      selectedTime = now;
      progress = fractionOfLocalDay(now);
      range.value = String(Math.round(progress * 1000));
      selectedLabel.textContent = fmt(selectedTime);
    }
    renderOnce();
  }
  function queueRender() {
    if (!active || frame) return;
    frame = requestAnimationFrame(() => { frame = 0; renderOnce(); });
  }
  async function refreshLocation() {
    if (!active || !isLocationEnabled()) { observer = null; interval = null; clearPaths(); setScrollerLocationMode(false); setLocalIntervalNoLocation(); return; }
    if (!navigator.geolocation) { observer = null; interval = null; clearPaths(); setScrollerLocationMode(false); setLocalIntervalNoLocation(); return; }
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 }));
      if (!active || !isLocationEnabled()) return;
      observer = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocalInterval(Date.now());
    } catch (error) {
      observer = null; interval = null; clearPaths(); setScrollerLocationMode(false);
      setLocalIntervalNoLocation();
      console.info("[LIVE // EARTH] Sun View local path unavailable.", error?.message || error);
    }
  }
  function activate() {
    active = true; stage.hidden = false;
    initRenderer().then(() => {
      if (!active || !initialized) return;
      resize();
      if (isLocationEnabled()) refreshLocation();
      else { observer = null; interval = null; setScrollerLocationMode(false); setLocalIntervalNoLocation(); }
      if (!timer) timer = window.setInterval(tickLiveTime, 1000);
      queueRender();
    });
  }
  function setLocalIntervalNoLocation() {
    // Keep the visual scroller available without asking for location. With no local
    // rise/set interval, the marker is a neutral local-day scrub preview, not a claim
    // about the user's geographical Sunrise/Sunset times.
    setScrollerLocationMode(false);
    selectedTime = Date.now(); progress = fractionOfLocalDay(selectedTime); live = true;
    range.value = String(Math.round(progress * 1000)); selectedLabel.textContent = fmt(selectedTime);
    drawPaths();
    updateSolarInfo();
    if (astronomy) renderOnce();
  }
  function deactivate() {
    active = false;
    if (frame) cancelAnimationFrame(frame); frame = 0;
    if (resizeFrame) cancelAnimationFrame(resizeFrame); resizeFrame = 0;
    if (timer) clearInterval(timer); timer = 0;
    stage.hidden = true;
  }
  range.addEventListener("input", event => {
    live = false; progress = Number(event.target.value) / 1000;
    if (interval && observer && isLocationEnabled()) {
      selectedTime = interval.rise + progress * (interval.set - interval.rise);
    } else {
      selectedTime = timestampAtLocalDayProgress(progress, Date.now());
    }
    selectedLabel.textContent = fmt(selectedTime); updateSolarInfo(); queueRender();
  });
  selectedLabel.addEventListener("click", () => {
    if (observer && interval && Date.now() >= interval.rise && Date.now() < interval.set) {
      live = true; selectedTime = Date.now(); progress = (selectedTime - interval.rise) / (interval.set - interval.rise);
      range.value = String(Math.round(progress * 1000)); selectedLabel.textContent = fmt(selectedTime); queueRender();
    } else if (active && isLocationEnabled()) { if (observer) setLocalInterval(Date.now()); else refreshLocation(); }
    else if (active) setLocalIntervalNoLocation();
  });
  function queueResize() {
    if (!active || resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      if (active) resize();
    });
  }
  window.addEventListener("resize", queueResize, { passive: true });
  window.visualViewport?.addEventListener("resize", queueResize, { passive: true });
  window.addEventListener("orientationchange", queueResize, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(queueResize);
    resizeObserver.observe(root);
  }
  window.addEventListener("live-earth-location-state", event => {
    if (!active) return;
    if (!!event.detail?.enabled && isLocationEnabled()) refreshLocation();
    else { observer = null; interval = null; clearPaths(); setScrollerLocationMode(false); setLocalIntervalNoLocation(); }
  });
  window.addEventListener("live-earth-location-stop", () => {
    observer = null; interval = null; clearPaths();
    setScrollerLocationMode(false); setLocalIntervalNoLocation();
  });
  if (window.LiveEarthViewModules) {
    window.__liveEarthSunActualModule = { activate, deactivate };
  } else {
    window.addEventListener("live-earth-primary-view-change", event => {
      if (event.detail?.view === "sun") activate(); else deactivate();
    });
  }
  window.__liveEarthSunRendererInstalled = true;
  window.__liveEarthSunRendererBooting = false;
  // Compatibility markers retained because V95's protected startup gate checks these exact names.
  // The previous arc/scroller UI itself is retired; this module now owns the 3D Sun View.
  window.__liveEarthSolarStardustInstalled = true;
  window.__liveEarthSolarStardustBooting = false;
  window.dispatchEvent(new Event("live-earth-startup-ready"));
})();


/* Register the standalone Sun implementation through the unchanged global view registry. */
(() => {
  "use strict";
  if (window.LiveEarthViewModules?.has("sun-procedural-renderer")) return;
  const module = window.__liveEarthSunActualModule;
  if (!module || typeof module.activate !== "function" || typeof module.deactivate !== "function") {
    throw new Error("[LIVE // EARTH] Standalone Sun renderer did not initialize.");
  }
  if (!window.LiveEarthViewModules || typeof window.LiveEarthViewModules.register !== "function") {
    throw new Error("[LIVE // EARTH] Global view registry is unavailable to Sun View.");
  }
  window.LiveEarthViewModules.register("sun-procedural-renderer", {
    views: ["sun"],
    activate: () => module.activate(),
    deactivate: () => module.deactivate()
  });
  window.__liveEarthSunViewRegistered = true;
  window.dispatchEvent(new Event("live-earth-startup-ready"));
})();
