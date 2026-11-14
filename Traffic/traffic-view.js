/* LIVE // EARTH — Live Cams discovery workspace.
   Editorial camera discovery built on the existing Stacks feature stage.
   No globe, map renderer, WebGL context, or paid live-video session is created.
   Preview images are shown only when the directory explicitly permits embedding
   and provides the required publisher credit. */
(() => {
  'use strict';

  const API_BASE = 'https://api.openeye.cam/v1';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  const featureRegistry = window.LiveEarthFeatureViews;

  if (!runtime || typeof runtime.mount !== 'function') {
    console.error('[LIVE // EARTH] Stacks runtime is unavailable; Live Cams was not registered.');
    return;
  }
  if (!featureRegistry || typeof featureRegistry.register !== 'function') {
    console.error('[LIVE // EARTH] Feature Orb registry is unavailable; Live Cams was not registered.');
    return;
  }

  const CATEGORY_TILES = [
    { id: 'wildlife', title: 'Nature & Wildlife', subtitle: 'Wild places and animals', icon: '✦', image: 'wildlife' },
    { id: 'surf', title: 'Oceans', subtitle: 'Coasts, surf and harbours', icon: '≈', image: 'oceans' },
    { id: 'city', title: 'Cities', subtitle: 'Streets and skylines', icon: '⌂', image: 'cities' },
    { id: 'weather', title: 'Weather Windows', subtitle: 'The atmosphere, live', icon: '☁', image: 'weather' },
    { id: 'ski', title: 'Mountains', subtitle: 'Snow, peaks and resorts', icon: '△', image: 'mountains' },
    { id: 'aurora', title: 'Night Skies', subtitle: 'Aurora and dark skies', icon: '☾', image: 'night-skies' }
  ];

  // Bounding boxes follow OpenEye's documented west,south,east,north order.
  // They are broad discovery windows, not political or precise continent borders.
  const REGION_TILES = [
    { id: 'asia', title: 'Asia', subtitle: 'East to South Asia', bbox: '60,-10,180,85', icon: '◉', image: 'cities' },
    { id: 'europe', title: 'Europe', subtitle: 'Cities and landscapes', bbox: '-25,34,60,72', icon: '⌁', image: 'mountains' },
    { id: 'africa', title: 'Africa', subtitle: 'Wild places and horizons', bbox: '-20,-35,55,38', icon: '◇', image: 'wildlife' },
    { id: 'americas', title: 'Americas', subtitle: 'North, Central and South', bbox: '-170,-60,-30,80', icon: '✧', image: 'weather' },
    { id: 'oceania', title: 'Oceania', subtitle: 'Australia and the Pacific', bbox: '110,-50,180,0', icon: '≈', image: 'oceans' },
    { id: 'antarctica', title: 'Antarctica', subtitle: 'The southern frontier', bbox: '-180,-90,180,-60', icon: '❄', image: 'night-skies' }
  ];

  // Keep the separate Traffic Orb's previous wallpaper placeholder intact.
  // The Live Cams redesign must not turn the Traffic feature into an unavailable view.
  if (!document.getElementById('le-traffic-wallpaper-style')) {
    const trafficStyle = document.createElement('style');
    trafficStyle.id = 'le-traffic-wallpaper-style';
    trafficStyle.textContent = `
      .le-sfv--traffic{position:absolute!important;inset:0!important;z-index:6!important;pointer-events:none!important;background:#020306!important}
      .le-sfv--traffic .le-sfv-panel{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background-color:#020306!important;background-image:url("./Stacks/Assets/feature-wallpaper.png")!important;background-position:center center!important;background-repeat:no-repeat!important;background-size:cover!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;pointer-events:none!important}
      .le-sfv--traffic .le-sfv-head,.le-sfv--traffic .le-sfv-pill,.le-sfv--traffic .le-sfv-body{display:none!important}
    `;
    document.head.appendChild(trafficStyle);
  }
  function activateTrafficWallpaper() {
    const trafficView = runtime.mount('traffic');
    if (!trafficView) return () => {};
    trafficView.body.replaceChildren();
    trafficView.root.querySelector('.le-sfv-head')?.remove();
    trafficView.root.querySelector('.le-sfv-pill')?.remove();
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      const host = trafficView.root.parentElement;
      if (!host) return;
      trafficView.root.remove();
      if (!host.querySelector('.le-sfv')) {
        host.classList.remove('le-sfv-open');
        const stageCard = host.querySelector('.le-feature-stage-card');
        if (stageCard) stageCard.hidden = false;
      }
    };
  }
  runtime.registerFeature('traffic', activateTrafficWallpaper);

  const style = document.createElement('style');
  style.id = 'le-live-cams-discovery-style';
  style.textContent = `
    .le-sfv--live-cams{pointer-events:none;color:#eef6ff}
    /* Explicitly honour hidden states even when component rules set display:inline-flex/grid. */
    .le-sfv--live-cams [hidden]{display:none!important}
    .le-sfv--live-cams .le-sfv-panel{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
      max-width:none!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;
      overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;
      pointer-events:auto!important;padding:calc(env(safe-area-inset-top) + 16px) clamp(15px,4.2vw,28px) calc(env(safe-area-inset-bottom) + 188px)!important;
      border:0!important;border-radius:0!important;
      background-image:radial-gradient(ellipse 110% 33% at 50% 0%,rgba(23,74,108,.48),transparent 72%),
        linear-gradient(180deg,rgba(3,11,20,.78) 0%,rgba(4,15,26,.88) 52%,rgba(2,8,15,.96) 100%),
        url("./Traffic/Assets/live-cams-discovery/weather.jpg")!important;
      background-position:center top!important;background-size:auto,auto,cover!important;background-repeat:no-repeat!important;
      box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important
    }
    .le-sfv--live-cams .le-sfv-panel::-webkit-scrollbar{display:none}
    .le-lc-wrap{width:min(100%,760px);margin:0 auto;display:grid;gap:19px}
    .le-lc-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:0 2px 2px}
    .le-lc-brand{margin:0 0 5px;color:#a9c6db;font-size:9px;font-weight:800;letter-spacing:.32em}
    .le-lc-title{margin:0;color:#f4f7fb;font:italic 500 clamp(37px,10vw,56px)/.98 Georgia,'Times New Roman',serif;letter-spacing:-.045em}
    .le-lc-tagline{margin:9px 0 0;color:#9cb3c7;font:500 9px/1.5 Georgia,'Times New Roman',serif;letter-spacing:.24em}
    .le-lc-live-mark{display:inline-flex;align-items:center;gap:6px;margin-top:28px;padding:7px 10px;border:1px solid rgba(255,90,106,.25);border-radius:999px;background:rgba(125,20,33,.18);color:#ffe7ea;font-size:9px;font-weight:800;letter-spacing:.12em;white-space:nowrap}
    .le-lc-live-dot{width:6px;height:6px;border-radius:50%;background:#ff5368;box-shadow:0 0 10px #ff5368}
    .le-lc-hero{position:relative;display:block;width:100%;min-height:154px;max-height:310px;aspect-ratio:2.32/1;overflow:hidden;border:1px solid rgba(190,221,243,.22);border-radius:23px;background:linear-gradient(140deg,#16354a,#091521 62%,#07101b);box-shadow:0 17px 38px rgba(0,0,0,.30),inset 0 1px rgba(255,255,255,.08);text-align:left;color:inherit;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .le-lc-hero img,.le-lc-card-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .le-lc-hero:after,.le-lc-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.06) 12%,transparent 37%,rgba(0,0,0,.78) 100%);pointer-events:none}
    .le-lc-image-fallback{position:absolute;inset:0;display:grid;place-items:center;padding:20px;background-position:center;background-size:cover;color:#e5f3fb;font:italic 22px Georgia,serif;text-align:center;text-shadow:0 2px 14px #000;}
    .le-lc-image-fallback[hidden],.le-lc-badge[hidden],.le-lc-hero-credit[hidden],.le-lc-hero-dots[hidden]{display:none!important}
    .le-lc-hero-content{position:absolute;z-index:1;left:15px;right:15px;bottom:13px;display:grid;gap:4px;pointer-events:none}
    .le-lc-hero>.le-lc-badge{position:absolute;z-index:2;left:13px;top:13px}
    .le-lc-hero:disabled{cursor:default;opacity:1}
    .le-lc-hero-dots{display:flex;justify-content:center;align-items:center;gap:7px;margin:-9px 0 -2px;min-height:10px}
    .le-lc-hero-dot{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:rgba(195,218,234,.38);cursor:pointer}
    .le-lc-hero-dot[aria-pressed="true"]{background:#e9f7ff;box-shadow:0 0 9px rgba(151,225,255,.5)}
    .le-lc-badge{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:6px 9px;border-radius:999px;background:rgba(128,22,35,.88);color:#fff;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;backdrop-filter:blur(8px)}
    .le-lc-badge .le-lc-live-dot{width:5px;height:5px}
    .le-lc-camera-title{margin:0;color:#fff;font:600 clamp(23px,6.4vw,31px)/1.05 Georgia,'Times New Roman',serif;text-shadow:0 2px 12px #0009}
    .le-lc-location{margin:0;color:#e1eaf0;font:500 12px/1.4 Georgia,'Times New Roman',serif;text-shadow:0 1px 8px #000}
    .le-lc-section{display:grid;gap:10px;min-width:0}
    .le-lc-section-head{display:flex;align-items:end;justify-content:space-between;gap:12px}
    .le-lc-section-title{margin:0;color:#f0f4f8;font:500 clamp(21px,5.4vw,27px)/1.08 Georgia,'Times New Roman',serif;letter-spacing:-.02em}
    .le-lc-section-note{margin:5px 0 0;color:#8fa9bd;font-size:9px;letter-spacing:.14em;text-transform:uppercase}
    .le-lc-link{border:0;background:transparent;color:#b6d5e8;font:600 11px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;white-space:nowrap;padding:6px 0;cursor:pointer}
    .le-lc-category-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .le-lc-region-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
    .le-lc-region{position:relative;isolation:isolate;min-width:0;min-height:0;aspect-ratio:.78/1;display:grid;align-content:end;gap:0;padding:6px;border:1px solid rgba(168,207,231,.22);border-radius:15px;overflow:hidden;background:#102536;color:#edf6fc;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .le-lc-region:before{content:'';position:absolute;z-index:1;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(1,8,15,.08) 0%,rgba(1,8,15,.18) 38%,rgba(1,8,15,.88) 100%)}
    .le-lc-region-image,.le-lc-category-image{position:absolute;z-index:0;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
    .le-lc-region:active .le-lc-region-image,.le-lc-category:active .le-lc-category-image{transform:scale(1.04)}
    .le-lc-region-icon{display:none}
    .le-lc-region-name{position:relative;z-index:2;display:block;font:600 clamp(9px,2.45vw,13px)/1.05 Georgia,'Times New Roman',serif;text-shadow:0 2px 10px #000;overflow-wrap:anywhere}
    .le-lc-region-sub{display:none}
    .le-lc-category{position:relative;isolation:isolate;min-width:0;min-height:106px;display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:10px;padding:12px;border:1px solid rgba(158,197,223,.22);border-radius:16px;overflow:hidden;background:#102536;color:#edf6fc;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .le-lc-category:before{content:'';position:absolute;z-index:1;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(2,10,18,.10),rgba(2,10,18,.70) 43%,rgba(2,10,18,.86) 100%)}
    .le-lc-category-icon{position:relative;z-index:2;display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(200,229,246,.30);border-radius:12px;background:rgba(8,27,41,.58);color:#e4f6ff;font:500 20px Georgia,serif;backdrop-filter:blur(7px)}
    .le-lc-category-name{position:relative;z-index:2;display:block;font:600 14px/1.2 Georgia,'Times New Roman',serif;text-shadow:0 2px 10px #000}
    .le-lc-category-sub{position:relative;z-index:2;display:block;margin-top:4px;color:#d0e2ee;font-size:9px;line-height:1.3;text-shadow:0 1px 7px #000}
    .le-lc-category-count{position:relative;z-index:2;display:block;margin-top:5px;color:#7ce0fa;font-size:9px;font-weight:750;letter-spacing:.05em;text-shadow:0 1px 7px #000}
    .le-lc-rail{display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - 18px)/3);gap:9px;overflow-x:auto;overscroll-behavior-x:contain;padding:1px 1px 7px;scroll-snap-type:x mandatory;scrollbar-width:none}
    .le-lc-rail::-webkit-scrollbar{display:none}
    .le-lc-card{position:relative;display:block;min-width:0;width:100%;aspect-ratio:1.36/1;overflow:hidden;border:1px solid rgba(182,215,237,.19);border-radius:17px;background:linear-gradient(140deg,#18374c,#091723);color:inherit;text-align:left;padding:0;cursor:pointer;scroll-snap-align:start;-webkit-tap-highlight-color:transparent}
    .le-lc-card-content{position:absolute;z-index:1;left:12px;right:12px;bottom:11px;display:grid;gap:4px;pointer-events:none}
    .le-lc-card-title{margin:0;color:#fff;font:600 17px/1.05 Georgia,'Times New Roman',serif;text-shadow:0 2px 8px #000}
    .le-lc-card-location{margin:0;color:#e0eaf1;font:500 10px/1.35 Georgia,'Times New Roman',serif;text-shadow:0 1px 6px #000}
    .le-lc-card-shell{display:grid;gap:4px;min-width:0}
    .le-lc-card-credit{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#afc7d8;font-size:8px;line-height:1.4;text-decoration:none;padding:0 3px}
    .le-lc-hero-credit{display:block;margin:-5px 3px 0;color:#afc7d8;font-size:9px;line-height:1.35;text-decoration:none}
    .le-lc-card-credit:focus-visible,.le-lc-hero-credit:focus-visible{outline:2px solid #8de1ff;outline-offset:2px;border-radius:3px}
    .le-lc-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
    .le-lc-search{width:100%;min-width:0;min-height:44px;padding:0 14px;border:1px solid rgba(156,196,224,.20);border-radius:13px;background:rgba(8,20,32,.88);color:#f2f7fb;font:500 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;outline:none}
    .le-lc-search::placeholder{color:#7f9aae}
    .le-lc-search:focus{border-color:rgba(111,199,231,.68);box-shadow:0 0 0 3px rgba(69,163,203,.12)}
    .le-lc-search-button,.le-lc-secondary-button{min-height:44px;padding:0 15px;border:1px solid rgba(125,198,230,.28);border-radius:13px;background:linear-gradient(135deg,rgba(53,132,170,.34),rgba(20,45,64,.58));color:#eff8ff;font-size:11px;font-weight:750;letter-spacing:.04em;cursor:pointer}
    .le-lc-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .le-lc-load-more{justify-self:center;min-height:42px;padding:0 18px;border:1px solid rgba(125,198,230,.25);border-radius:999px;background:rgba(28,74,96,.36);color:#d9f2ff;font-size:10px;font-weight:750;letter-spacing:.06em;cursor:pointer}
    .le-lc-load-more[hidden]{display:none}
    .le-lc-load-more:disabled{opacity:.55}
    .le-lc-results .le-lc-card{aspect-ratio:1.08/1}
    .le-lc-empty{grid-column:1/-1;margin:0;padding:14px;border:1px solid rgba(153,195,224,.13);border-radius:14px;background:rgba(5,15,25,.42);color:#9db6c8;font-size:10px;line-height:1.5}
    .le-lc-empty--inline{padding:7px 2px;border:0;border-radius:0;background:transparent;font-size:10px}
    .le-lc-state{margin:0;padding:9px 11px;border:1px solid rgba(151,194,223,.13);border-radius:12px;background:rgba(4,13,23,.42);color:#98b4c8;font-size:9px;line-height:1.45}
    .le-lc-state[hidden],.le-lc-results[hidden],.le-lc-results-title[hidden]{display:none!important}
    .le-lc-state[data-kind="error"]{border-color:rgba(255,130,140,.25);color:#ffc0c5}
    .le-lc-state[data-kind="success"]{border-color:rgba(103,213,180,.2);color:#a8e9d4}
    .le-lc-modal{position:fixed;z-index:20;inset:0;display:grid;align-items:end;padding:16px 12px calc(env(safe-area-inset-bottom) + 112px);background:rgba(0,4,9,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:auto}
    .le-lc-modal[hidden]{display:none}
    .le-lc-modal-panel{position:relative;width:min(100%,560px);max-height:min(72vh,680px);overflow:auto;margin:0 auto;padding:13px;border:1px solid rgba(173,215,241,.22);border-radius:23px;background:linear-gradient(155deg,#122638,#07131f 75%);box-shadow:0 22px 70px #000a}
    .le-lc-modal-close{position:absolute;z-index:2;right:22px;top:22px;width:36px;height:36px;border:1px solid #ffffff55;border-radius:50%;background:#071522dd;color:#fff;font-size:20px;cursor:pointer}
    .le-lc-modal-image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:15px;background:#0b1a26}.le-lc-modal-image[hidden]{display:none!important}
    .le-lc-modal h3{margin:14px 44px 5px 2px;color:#fff;font:600 23px/1.08 Georgia,'Times New Roman',serif}
    .le-lc-modal-location{margin:0 2px 10px;color:#abc1d2;font:12px Georgia,'Times New Roman',serif}
    .le-lc-modal-meta{margin:0 2px 12px;color:#8faabd;font-size:10px;line-height:1.55}
    .le-lc-modal-credit{margin:0 2px 14px;color:#aec6d7;font-size:10px;line-height:1.5}
    .le-lc-modal-credit a{color:#9cddf7;text-underline-offset:3px}
    .le-lc-modal-actions{display:flex;flex-wrap:wrap;gap:8px}
    .le-lc-modal-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 14px;border:1px solid rgba(125,198,230,.28);border-radius:12px;background:rgba(53,132,170,.22);color:#eff8ff;font-size:11px;font-weight:700;text-decoration:none}
    @media(min-width:620px){.le-lc-region-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:9px}.le-lc-region{aspect-ratio:1.02/1;min-height:100px;padding:9px}.le-lc-region-name{font-size:clamp(12px,1.6vw,16px)}.le-lc-region-sub{display:block;font-size:9px}.le-lc-category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.le-lc-results{grid-template-columns:repeat(3,minmax(0,1fr))}.le-lc-rail{grid-auto-columns:minmax(160px,31%)} }
    @media(orientation:landscape) and (max-height:560px){
      .le-sfv--live-cams .le-sfv-panel{padding-top:calc(env(safe-area-inset-top) + 10px)!important;padding-bottom:calc(env(safe-area-inset-bottom) + 160px)!important}
      .le-lc-wrap{gap:14px}.le-lc-title{font-size:37px}.le-lc-hero{aspect-ratio:2.4/1;min-height:132px}.le-lc-region-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.le-lc-category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.le-lc-results{grid-template-columns:repeat(3,minmax(0,1fr))}
    }
    @media(prefers-reduced-motion:reduce){.le-sfv--live-cams *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `;
  document.head.appendChild(style);

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function discoveryImage(name) {
    const allowed = new Set(['wildlife', 'oceans', 'cities', 'weather', 'mountains', 'night-skies']);
    const key = allowed.has(name) ? name : 'night-skies';
    return `./Traffic/Assets/live-cams-discovery/${key}.jpg`;
  }
  function safeHttps(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const raw = value.trim();
      const url = new URL(raw);
      return url.protocol === 'https:' ? raw : '';
    } catch (_) { return ''; }
  }
  function cameraCredit(camera) {
    const credit = camera?.redistribution?.attribution;
    const name = typeof credit?.name === 'string' ? credit.name.trim() : '';
    const url = safeHttps(credit?.url);
    return name && url ? { name, url } : null;
  }
  function frameAgeSeconds(camera) {
    const suppliedAge = camera?.last_frame_age_s;
    if (suppliedAge !== undefined && suppliedAge !== null && suppliedAge !== '') {
      const age = Number(suppliedAge);
      if (Number.isFinite(age)) return age;
    }
    const timestamp = Number(camera?.frame_ts);
    if (Number.isFinite(timestamp) && timestamp > 0) return Math.max(0, (Date.now() - timestamp) / 1000);
    return NaN;
  }
  function isFresh(camera) {
    if (camera?.live !== true) return false;
    const age = frameAgeSeconds(camera);
    // OpenEye keeps a camera in its live/degradation window for up to seven days.
    // Older stored images must not be presented as current directory previews.
    return Number.isFinite(age) && age >= 0 && age <= 7 * 86400;
  }
  function cameraFreshnessLabel(camera) {
    const age = frameAgeSeconds(camera);
    return Number.isFinite(age) && age <= 86400 ? 'LIVE' : 'RECENT';
  }
  function cameraArtwork(camera) {
    const category = String(camera?.category || '').toLowerCase();
    const artwork = ({ wildlife: 'wildlife', surf: 'oceans', city: 'cities', weather: 'weather', ski: 'mountains', aurora: 'night-skies' })[category] || 'night-skies';
    return discoveryImage(artwork);
  }
  function previewUrl(camera) {
    if (camera?.is_free !== true) return '';
    if (camera?.view?.render !== 'image') return '';
    if (camera?.redistribution?.preview_embed !== true) return '';
    if (!cameraCredit(camera)) return '';
    return safeHttps(camera?.view?.url || camera?.preview_url);
  }
  // A directory record can be useful even when its imagery cannot be embedded.
  // OpenEye's enriched catalogue explicitly distinguishes image, link and none.
  // Only image rows with preview_embed + attribution are loaded into <img> tags;
  // link rows open their publisher viewer, while paid/non-live rows stay excluded.
  function cameraDestinationUrl(camera) {
    const render = String(camera?.view?.render || '').toLowerCase();
    if (render === 'link') return safeHttps(camera?.view?.url || sourceUrl(camera));
    return safeHttps(camera?.source_url || camera?.publisher_url || camera?.viewer_url || camera?.website);
  }
  function displayable(camera) {
    if (!camera || !camera.id || camera.is_free !== true || !isFresh(camera)) return false;
    return !!previewUrl(camera) || !!cameraDestinationUrl(camera);
  }
  function itemsFrom(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.streams)) return payload.streams;
    if (payload?.item && typeof payload.item === 'object') return [payload.item];
    if (payload?.id && typeof payload === 'object') return [payload];
    return [];
  }
  function nextCursorFrom(payload) {
    const cursor = payload?.next_cursor ?? payload?.nextCursor ?? payload?.pagination?.next_cursor ?? payload?.page?.next_cursor;
    return typeof cursor === 'string' && cursor.trim() ? cursor.trim() : '';
  }
  function countryLabel(camera) {
    return [camera?.city, camera?.region, camera?.country].filter(v => typeof v === 'string' && v.trim()).join(', ')
      || (typeof camera?.location === 'string' ? camera.location : 'Location not supplied');
  }
  function categoryLabel(camera) {
    const raw = String(camera?.category || 'camera').replace(/[_-]+/g, ' ');
    return raw.replace(/\b\w/g, value => value.toUpperCase());
  }
  function sourceUrl(camera) {
    return safeHttps(camera?.source_url || camera?.publisher_url || camera?.viewer_url || camera?.website);
  }
  function timeLabel(camera) {
    const timestamp = Number(camera?.frame_ts);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      try { return `Frame captured ${new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`; }
      catch (_) {}
    }
    const age = Number(camera?.last_frame_age_s);
    if (Number.isFinite(age)) return `Last frame ${Math.max(0, Math.round(age / 60))} min ago`;
    return 'Capture time not supplied';
  }

  function activateLiveCams() {
    const view = runtime.mount('live-cams');
    if (!view?.root || !view?.body) return () => {};

    const { root, body } = view;
    root.querySelector('.le-sfv-head')?.remove();
    root.querySelector('.le-sfv-pill')?.remove();
    root.classList.add('le-sfv--live-cams');
    body.className = 'le-lc-body';
    body.replaceChildren();

    const wrap = make('div', 'le-lc-wrap');
    body.appendChild(wrap);

    const header = make('header', 'le-lc-header');
    const heading = make('div', '');
    heading.append(make('p', 'le-lc-brand', 'LIVE // EARTH'));
    heading.append(make('h1', 'le-lc-title', 'Live Cams'));
    heading.append(make('p', 'le-lc-tagline', 'WINDOWS TO OUR WORLD'));
    const liveMark = make('span', 'le-lc-live-mark');
    liveMark.append(make('span', 'le-lc-live-dot'), make('span', '', 'LIVE DIRECTORY'));
    header.append(heading, liveMark);
    wrap.appendChild(header);

    const heroButton = make('button', 'le-lc-hero');
    heroButton.type = 'button';
    heroButton.setAttribute('aria-label', 'Featured live camera details');
    const heroFallback = make('div', 'le-lc-image-fallback', 'The world, right now.');
    const heroImage = make('img', '');
    heroImage.alt = '';
    heroImage.loading = 'eager';
    heroImage.decoding = 'async';
    heroImage.referrerPolicy = 'no-referrer';
    heroImage.hidden = true;
    const heroContent = make('div', 'le-lc-hero-content');
    const heroBadge = make('span', 'le-lc-badge');
    heroBadge.append(make('span', 'le-lc-live-dot'), make('span', '', 'LIVE WINDOW'));
    const heroTitle = make('h2', 'le-lc-camera-title', 'Finding a window into the world…');
    const heroLocation = make('p', 'le-lc-location', 'Connecting to public cameras');
    heroContent.append(heroTitle, heroLocation);
    heroButton.append(heroImage, heroFallback, heroBadge, heroContent);
    wrap.appendChild(heroButton);
    const heroDots = make('div', 'le-lc-hero-dots');
    heroDots.hidden = true;
    heroDots.setAttribute('aria-label', 'Featured camera previews');
    wrap.appendChild(heroDots);
    const heroCredit = make('a', 'le-lc-hero-credit');
    heroCredit.hidden = true;
    heroCredit.target = '_blank';
    heroCredit.rel = 'noopener noreferrer';
    wrap.appendChild(heroCredit);

    const featuredSection = make('section', 'le-lc-section');
    const featuredHead = make('div', 'le-lc-section-head');
    const featuredHeading = make('div', '');
    featuredHeading.append(make('h2', 'le-lc-section-title', 'Featured Windows'));
    featuredHeading.append(make('p', 'le-lc-section-note', 'Live views from around the Earth'));
    const featuredRefresh = make('button', 'le-lc-link', 'Refresh');
    featuredRefresh.type = 'button';
    featuredHead.append(featuredHeading, featuredRefresh);
    const featuredRail = make('div', 'le-lc-rail');
    featuredSection.append(featuredHead, featuredRail);
    wrap.appendChild(featuredSection);

    const regionSection = make('section', 'le-lc-section');
    const regionHead = make('div', 'le-lc-section-head');
    const regionHeading = make('div', '');
    regionHeading.append(make('h2', 'le-lc-section-title', 'Explore by Region'));
    regionHeading.append(make('p', 'le-lc-section-note', 'Live cameras across the continents'));
    regionHead.appendChild(regionHeading);
    const regionGrid = make('div', 'le-lc-region-grid');
    REGION_TILES.forEach(region => {
      const tile = make('button', 'le-lc-region');
      tile.type = 'button';
      const image = make('img', 'le-lc-region-image');
      image.src = discoveryImage(region.image);
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.onerror = () => { image.hidden = true; };
      tile.append(image, make('span', 'le-lc-region-icon', region.icon));
      const text = make('span', '');
      text.append(make('span', 'le-lc-region-name', region.title));
      text.append(make('span', 'le-lc-region-sub', region.subtitle));
      tile.appendChild(text);
      tile.addEventListener('click', () => loadRegion(region));
      regionGrid.appendChild(tile);
    });
    regionSection.append(regionHead, regionGrid);
    wrap.appendChild(regionSection);

    const categorySection = make('section', 'le-lc-section');
    const categoryHead = make('div', 'le-lc-section-head');
    const categoryHeading = make('div', '');
    categoryHeading.append(make('h2', 'le-lc-section-title', 'Discover the Planet'));
    categoryHeading.append(make('p', 'le-lc-section-note', 'Choose the kind of place you want to visit'));
    categoryHead.appendChild(categoryHeading);
    const categoryGrid = make('div', 'le-lc-category-grid');
    categorySection.append(categoryHead, categoryGrid);
    wrap.appendChild(categorySection);

    const browseSection = make('section', 'le-lc-section');
    const browseHeading = make('div', '');
    browseHeading.append(make('h2', 'le-lc-section-title', 'Explore the world'));
    browseHeading.append(make('p', 'le-lc-section-note', 'Search public camera windows by place or subject'));
    const searchRow = make('form', 'le-lc-search-row');
    searchRow.setAttribute('role', 'search');
    const searchInput = make('input', 'le-lc-search');
    searchInput.type = 'search';
    searchInput.placeholder = 'Try Tokyo, ocean, wildlife…';
    searchInput.setAttribute('aria-label', 'Search cameras by place or subject');
    const searchButton = make('button', 'le-lc-search-button', 'Search');
    searchButton.type = 'submit';
    searchRow.append(searchInput, searchButton);
    const resultsTitle = make('div', 'le-lc-section-head le-lc-results-title');
    resultsTitle.hidden = true;
    const resultsHeading = make('h3', 'le-lc-section-title', 'Camera results');
    const clearButton = make('button', 'le-lc-link', 'Clear');
    clearButton.type = 'button';
    clearButton.hidden = true;
    resultsTitle.append(resultsHeading, clearButton);
    const resultGrid = make('div', 'le-lc-results');
    resultGrid.hidden = true;
    const loadMoreButton = make('button', 'le-lc-load-more', 'Load more cameras');
    loadMoreButton.type = 'button';
    loadMoreButton.hidden = true;
    browseSection.append(browseHeading, searchRow, resultsTitle, resultGrid, loadMoreButton);
    wrap.appendChild(browseSection);

    const status = make('p', 'le-lc-state', 'Connecting to the public camera directory…');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    wrap.appendChild(status);

    const modal = make('div', 'le-lc-modal');
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Camera details');
    const modalPanel = make('div', 'le-lc-modal-panel');
    const closeButton = make('button', 'le-lc-modal-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close camera details');
    const modalImage = make('img', 'le-lc-modal-image');
    modalImage.alt = '';
    modalImage.referrerPolicy = 'no-referrer';
    const modalTitle = make('h3', '');
    const modalLocation = make('p', 'le-lc-modal-location');
    const modalMeta = make('p', 'le-lc-modal-meta');
    const modalCredit = make('p', 'le-lc-modal-credit');
    const modalActions = make('div', 'le-lc-modal-actions');
    modalPanel.append(closeButton, modalImage, modalTitle, modalLocation, modalMeta, modalCredit, modalActions);
    modal.appendChild(modalPanel);
    root.appendChild(modal);

    let disposed = false;
    let activeRequest = null;
    let refreshTimer = 0;
    let currentCategory = '';
    let currentRegion = null;
    let currentQuery = '';
    let featuredCameras = [];
    let activeHeroIndex = 0;
    let resultCameras = [];
    let paginationCursor = '';
    let loadingMore = false;
    let lastFocused = null;

    function setStatus(message, kind = '') {
      status.textContent = message;
      if (kind) status.dataset.kind = kind; else status.removeAttribute('data-kind');
      status.hidden = kind === 'success';
    }
    function setHero(camera) {
      if (!camera) {
        heroImage.hidden = true;
        heroFallback.hidden = false;
        heroTitle.textContent = 'The world, right now.';
        heroLocation.textContent = 'No eligible featured preview is available at the moment';
        heroBadge.hidden = true;
        heroFallback.style.backgroundImage = `linear-gradient(180deg,rgba(1,8,15,.04),rgba(1,8,15,.72)),url('${discoveryImage('night-skies')}')`;
        heroButton.onclick = null;
        heroButton.disabled = true;
        heroCredit.hidden = true;
        heroCredit.removeAttribute('href');
        return;
      }
      const imageUrl = previewUrl(camera);
      const destination = cameraDestinationUrl(camera);
      heroButton.disabled = !imageUrl && !destination;
      heroBadge.hidden = !imageUrl;
      if (imageUrl) {
        heroBadge.replaceChildren(make('span', 'le-lc-live-dot'), make('span', '', `${cameraFreshnessLabel(camera)} WINDOW`));
      }
      heroFallback.style.backgroundImage = `linear-gradient(180deg,rgba(1,8,15,.10),rgba(1,8,15,.76)),url('${cameraArtwork(camera)}')`;
      heroFallback.textContent = imageUrl ? 'Camera preview temporarily unavailable' : 'Open this camera at its publisher';
      heroButton.onclick = () => openDetails(camera);
      heroImage.hidden = !imageUrl;
      heroFallback.hidden = !!imageUrl;
      heroImage.onerror = () => {
        heroImage.hidden = true;
        heroFallback.hidden = false;
        heroFallback.textContent = destination ? 'Preview unavailable · open publisher camera' : 'Camera preview temporarily unavailable';
        heroBadge.hidden = true;
        heroButton.disabled = !destination;
        heroDots.hidden = featuredCameras.length < 2;
      };
      if (imageUrl) heroImage.src = imageUrl;
      else heroImage.removeAttribute('src');
      heroTitle.textContent = camera.title || camera.name || 'Live camera';
      heroLocation.textContent = countryLabel(camera);
      const credit = cameraCredit(camera);
      heroCredit.textContent = credit?.name || '';
      if (credit) heroCredit.href = credit.url; else heroCredit.removeAttribute('href');
      heroCredit.hidden = !credit;
    }
    function makeCameraCard(camera) {
      const shell = make('article', 'le-lc-card-shell');
      const card = make('button', 'le-lc-card');
      card.type = 'button';
      card.setAttribute('aria-label', `Open details for ${camera.title || camera.name || 'live camera'}`);
      const image = make('img', 'le-lc-card-image');
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      const imageUrl = previewUrl(camera);
      const destination = cameraDestinationUrl(camera);
      if (imageUrl) {
        image.src = imageUrl;
        image.onerror = () => {
          // A failed source image is not replaced with scenic artwork.
          shell.remove();
        };
      } else {
        image.src = cameraArtwork(camera);
        image.classList.add('le-lc-card-artwork');
        image.onerror = () => { image.hidden = true; card.style.background = 'linear-gradient(145deg,#153247,#07111c)'; };
      }
      const content = make('div', 'le-lc-card-content');
      const badge = make('span', 'le-lc-badge');
      if (imageUrl) badge.append(make('span', 'le-lc-live-dot'), make('span', '', cameraFreshnessLabel(camera)));
      else badge.append(make('span', '', '↗'), make('span', '', 'OPEN SOURCE'));
      const title = make('h3', 'le-lc-card-title', camera.title || camera.name || 'Live camera');
      const location = make('p', 'le-lc-card-location', countryLabel(camera));
      content.append(badge, title, location);
      card.append(image, content);
      card.addEventListener('click', () => openDetails(camera));
      shell.appendChild(card);
      const credit = cameraCredit(camera);
      if (credit) {
        const link = make('a', 'le-lc-card-credit', credit.name);
        link.href = credit.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        shell.appendChild(link);
      }
      return shell;
    }
    function renderHeroDots(cameras) {
      heroDots.replaceChildren();
      const count = Math.min(cameras.length, 5);
      heroDots.hidden = count < 2;
      for (let index = 0; index < count; index += 1) {
        const dot = make('button', 'le-lc-hero-dot');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Show featured camera ${index + 1}`);
        dot.setAttribute('aria-pressed', index === activeHeroIndex ? 'true' : 'false');
        dot.addEventListener('click', () => {
          activeHeroIndex = index;
          setHero(featuredCameras[index] || null);
          renderHeroDots(featuredCameras);
        });
        heroDots.appendChild(dot);
      }
    }
    function renderFeatured(cameras) {
      featuredRail.replaceChildren();
      const filtered = cameras.filter(displayable);
      featuredCameras = filtered;
      activeHeroIndex = Math.max(0, filtered.findIndex(camera => !!previewUrl(camera)));
      setHero(filtered[activeHeroIndex] || filtered[0] || null);
      renderHeroDots(filtered);
      filtered.filter((camera, index) => index !== activeHeroIndex).slice(0, 6).forEach(camera => featuredRail.appendChild(makeCameraCard(camera)));
      if (!filtered.length) {
        featuredRail.appendChild(make('p', 'le-lc-empty le-lc-empty--inline', 'No public preview is ready to feature right now. Explore a region or search the directory below.'));
      } else if (filtered.length === 1) {
        featuredRail.appendChild(make('p', 'le-lc-empty le-lc-empty--inline', 'More camera windows will appear here as eligible public previews become available.'));
      }
      resultCameras = filtered;
      resultsTitle.hidden = true;
      resultGrid.hidden = true;
      loadMoreButton.hidden = true;
    }
    function mergeUnique(existing, incoming) {
      const map = new Map();
      [...existing, ...incoming].forEach(camera => { if (camera?.id) map.set(camera.id, camera); });
      return [...map.values()];
    }
    function renderCategories(categoriesPayload) {
      const raw = itemsFrom(categoriesPayload);
      const counts = new Map(raw.map(item => [String(item.category || '').toLowerCase(), Number(item.count) || 0]));
      categoryGrid.replaceChildren();
      CATEGORY_TILES.forEach(item => {
        const tile = make('button', 'le-lc-category');
        tile.type = 'button';
        const image = make('img', 'le-lc-category-image');
        image.src = discoveryImage(item.image);
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.onerror = () => { image.hidden = true; };
        tile.append(image, make('span', 'le-lc-category-icon', item.icon));
        const text = make('span', '');
        text.append(make('span', 'le-lc-category-name', item.title));
        text.append(make('span', 'le-lc-category-sub', item.subtitle));
        const count = counts.get(item.id);
        if (Number.isFinite(count)) text.append(make('span', 'le-lc-category-count', `${count.toLocaleString()} listed`));
        tile.appendChild(text);
        tile.addEventListener('click', () => loadCategory(item.id));
        categoryGrid.appendChild(tile);
      });
    }
    function renderResults(cameras, title, { append = false } = {}) {
      resultsTitle.hidden = false;
      resultGrid.hidden = false;
      resultsHeading.textContent = title;
      const filtered = cameras.filter(displayable);
      resultCameras = append ? mergeUnique(resultCameras, filtered) : filtered;
      resultGrid.replaceChildren();
      if (!resultCameras.length) {
        resultGrid.appendChild(make('p', 'le-lc-empty', 'No camera previews match this view yet. Try another subject or place. Only public previews that permit embedding and include publisher credit are shown here.'));
      } else {
        resultCameras.forEach(camera => resultGrid.appendChild(makeCameraCard(camera)));
      }
      loadMoreButton.hidden = !paginationCursor;
      loadMoreButton.disabled = loadingMore;
      loadMoreButton.textContent = loadingMore ? 'Loading…' : 'Load more cameras';
    }
    function openDetails(camera) {
      if (disposed || !displayable(camera)) return;
      lastFocused = document.activeElement;
      const imageUrl = previewUrl(camera);
      modalImage.hidden = !imageUrl;
      if (imageUrl) {
        modalImage.src = imageUrl;
        modalImage.onerror = () => { modalImage.hidden = true; modalImage.removeAttribute('src'); };
      } else {
        modalImage.removeAttribute('src');
      }
      modalTitle.textContent = camera.title || camera.name || 'Live camera';
      modalLocation.textContent = countryLabel(camera);
      modalMeta.textContent = `${categoryLabel(camera)} · ${timeLabel(camera)} · ${imageUrl ? 'Public preview' : 'Publisher-hosted camera'}`;
      modalCredit.replaceChildren();
      const credit = cameraCredit(camera);
      if (credit) {
        modalCredit.appendChild(document.createTextNode('Publisher credit: '));
        const link = make('a', '', credit.name);
        link.href = credit.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        modalCredit.appendChild(link);
      }
      modalActions.replaceChildren();
      const publisher = cameraDestinationUrl(camera) || sourceUrl(camera);
      if (publisher) {
        const link = make('a', '', imageUrl ? 'Open publisher' : 'Open live camera at publisher');
        link.href = publisher;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        modalActions.appendChild(link);
      }
      if (!publisher) modalActions.appendChild(make('p', 'le-lc-modal-meta', imageUrl ? 'This directory record does not provide a separate publisher link. The preview is shown under its listed embed permission.' : 'The directory lists this camera, but its publisher has not supplied an embeddable preview or a direct viewing link.'));
      modal.hidden = false;
      closeButton.focus?.();
    }
    function closeDetails() {
      modal.hidden = true;
      if (lastFocused?.focus) lastFocused.focus();
      lastFocused = null;
    }
    async function requestJson(path, signal) {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      if (signal?.aborted) controller.abort();
      else signal?.addEventListener('abort', onAbort, { once: true });
      const timeout = window.setTimeout(() => controller.abort(), 16000);
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
          const error = new Error(`Camera directory returned ${response.status}.`);
          error.status = response.status;
          throw error;
        }
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (!type.includes('json')) throw new Error('Camera directory returned an unexpected response.');
        return await response.json();
      } finally {
        window.clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
      }
    }
    function startRequest() {
      activeRequest?.abort();
      activeRequest = new AbortController();
      return activeRequest;
    }
    async function requestCatalog(params, signal) {
      const original = new URLSearchParams(params);
      const variants = [new URLSearchParams(original), new URLSearchParams(original), new URLSearchParams(original)];
      variants[1].delete('sort');
      variants[2].delete('sort');
      variants[2].delete('embeddable');
      let lastError = null;
      const seen = new Set();
      for (const query of variants) {
        const key = query.toString();
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          return await requestJson(`/catalog?${key}`, signal);
        } catch (error) {
          if (signal?.aborted) throw error;
          if (!(Number(error?.status) >= 500 && Number(error?.status) <= 599)) throw error;
          lastError = error;
        }
      }

      // The lean map projection is a documented fallback for regional/category
      // discovery. Resolve only a small first page to full records before rendering.
      // This preserves the directory's image-permission and attribution checks.
      if (original.has('bbox') || original.has('category')) {
        const mapParams = new URLSearchParams({ limit: '18' });
        if (original.has('bbox')) mapParams.set('bbox', original.get('bbox'));
        if (original.has('category')) mapParams.set('category', original.get('category'));
        try {
          const mapPayload = await requestJson(`/catalog/map?${mapParams.toString()}`, signal);
          const candidates = itemsFrom(mapPayload).filter(item => item?.id).slice(0, 18);
          const detailResults = await Promise.allSettled(candidates.map(item =>
            requestJson(`/catalog/${encodeURIComponent(item.id)}`, signal)
          ));
          const records = detailResults
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value?.item || result.value)
            .filter(record => record && typeof record === 'object');
          return { items: records, total: Number(mapPayload?.total) || records.length, next_cursor: null };
        } catch (error) {
          if (signal?.aborted) throw error;
          lastError = error || lastError;
        }
      }
      throw lastError || new Error('Camera directory could not complete this search.');
    }
    async function loadHome({ silent = false } = {}) {
      const request = startRequest();
      if (!silent) setStatus('Finding fresh camera windows around the world…');
      try {
        const [featuredResult, categoriesResult] = await Promise.allSettled([
          requestJson('/catalog/featured', request.signal),
          requestJson('/catalog/categories', request.signal)
        ]);
        if (disposed || request.signal.aborted) return;
        const hasFeatured = featuredResult.status === 'fulfilled';
        const hasCategories = categoriesResult.status === 'fulfilled';
        let cameras = hasFeatured ? itemsFrom(featuredResult.value).filter(displayable) : [];
        // The current OpenEye catalogue documents /catalog as an enriched,
        // pageable camera feed. Use it to backfill the editorial showcase when
        // the curated featured endpoint is empty or temporarily incomplete.
        if (cameras.length < 6) {
          try {
            const backfill = await requestCatalog(new URLSearchParams({ limit: '36', sort: 'fresh' }), request.signal);
            if (disposed || request.signal.aborted) return;
            cameras = mergeUnique(cameras, itemsFrom(backfill).filter(displayable));
          } catch (backfillError) {
            if (request.signal.aborted) return;
            console.warn('[LIVE // EARTH] Featured catalogue backfill unavailable:', backfillError?.message || backfillError);
          }
        }
        // /catalog/random is documented as the last-resort public, live camera.
        if (cameras.length < 2) {
          try {
            const randomCamera = await requestJson('/catalog/random', request.signal);
            if (disposed || request.signal.aborted) return;
            cameras = mergeUnique(cameras, itemsFrom(randomCamera).filter(displayable));
          } catch (randomError) {
            if (request.signal.aborted) return;
            console.warn('[LIVE // EARTH] Random camera fallback unavailable:', randomError?.message || randomError);
          }
        }
        if (hasCategories) renderCategories(categoriesResult.value);
        renderFeatured(cameras);
        if (cameras.length) {
          const imageCount = cameras.filter(camera => !!previewUrl(camera)).length;
          const sourceCount = cameras.length - imageCount;
          setStatus(`${cameras.length} public camera windows are available${imageCount ? ` · ${imageCount} embeddable previews` : ''}${sourceCount ? ` · ${sourceCount} publisher-view cameras` : ''}.`, 'success');
        } else if (!hasFeatured) {
          setStatus(`The featured directory could not be reached. ${featuredResult.reason?.message || 'Try a region or search again.'}`, 'error');
        } else {
          setStatus('No public preview is ready to feature right now. Try a region or search the directory.', '');
        }
        if (!hasCategories && cameras.length) setStatus('Camera previews loaded. Category counts are temporarily unavailable.', '');
      } catch (error) {
        if (disposed || request.signal.aborted) return;
        setHero(null);
        if (!silent) setStatus(navigator.onLine === false ? 'You are offline. Live camera records are not shown from an old cache.' : `Camera directory could not be reached. ${error?.message || 'Please try again.'}`, 'error');
      }
    }
    async function loadRegion(region) {
      currentCategory = '';
      currentRegion = region;
      currentQuery = '';
      searchInput.value = '';
      clearButton.hidden = false;
      paginationCursor = '';
      loadingMore = false;
      const title = `${region.title} · Live Cameras`;
      resultsHeading.textContent = title;
      setStatus(`Opening the ${region.title} camera window…`);
      const request = startRequest();
      try {
        const payload = await requestCatalog(new URLSearchParams({ bbox: region.bbox, limit: '48', sort: 'fresh' }), request.signal);
        if (disposed || request.signal.aborted) return;
        paginationCursor = nextCursorFrom(payload);
        const cameras = itemsFrom(payload).filter(displayable);
        renderResults(cameras, title);
        setStatus(cameras.length ? `${cameras.length} eligible previews in the ${region.title} discovery window${paginationCursor ? ' · more cameras are available' : ''}.` : `No eligible embedded previews were found in the ${region.title} discovery window right now. Try another region.`, cameras.length ? 'success' : '');
      } catch (error) {
        if (disposed || request.signal.aborted) return;
        renderResults([], title);
        setStatus(`Could not load ${region.title}. ${error?.message || 'Please try again.'}`, 'error');
      }
    }

    async function loadCategory(category) {
      currentCategory = category;
      currentRegion = null;
      currentQuery = '';
      searchInput.value = '';
      clearButton.hidden = false;
      const title = CATEGORY_TILES.find(item => item.id === category)?.title || categoryLabel({ category });
      resultsHeading.textContent = title;
      setStatus(`Looking for ${title.toLowerCase()} around the world…`);
      paginationCursor = '';
      loadingMore = false;
      const request = startRequest();
      try {
        const payload = await requestCatalog(new URLSearchParams({ category, limit: '48', sort: 'fresh' }), request.signal);
        if (disposed || request.signal.aborted) return;
        const cameras = itemsFrom(payload).filter(displayable);
        paginationCursor = nextCursorFrom(payload);
        renderResults(cameras, title);
        setStatus(cameras.length ? `${cameras.length} eligible ${title.toLowerCase()} previews in this result. Publisher-only cameras remain available from their original directory page.` : `No eligible embedded previews were found in ${title.toLowerCase()} right now. Try another category.`, cameras.length ? 'success' : '');
      } catch (error) {
        if (disposed || request.signal.aborted) return;
        renderResults([], title);
        setStatus(`Could not load this category. ${error?.message || 'Please try again.'}`, 'error');
      }
    }
    async function runSearch(query) {
      const normalized = String(query || '').trim();
      if (!normalized) { resetBrowse(); return; }
      currentCategory = '';
      currentRegion = null;
      currentQuery = normalized;
      clearButton.hidden = false;
      resultsHeading.textContent = `Results for “${normalized}”`;
      setStatus(`Searching public cameras for “${normalized}”…`);
      paginationCursor = '';
      loadingMore = false;
      const request = startRequest();
      try {
        const payload = await requestCatalog(new URLSearchParams({ q: normalized, limit: '48', sort: 'fresh' }), request.signal);
        if (disposed || request.signal.aborted) return;
        const cameras = itemsFrom(payload).filter(displayable);
        paginationCursor = nextCursorFrom(payload);
        renderResults(cameras, `Results for “${normalized}”`);
        setStatus(cameras.length ? `Found ${cameras.length} eligible previews. Results are limited to public images with explicit embed permission and publisher credit.` : 'No eligible camera previews matched that search. Try a different place or subject.', cameras.length ? 'success' : '');
      } catch (error) {
        if (disposed || request.signal.aborted) return;
        renderResults([], `Results for “${normalized}”`);
        setStatus(`Search could not be completed. ${error?.message || 'Please try again.'}`, 'error');
      }
    }
    async function loadMore() {
      if (!paginationCursor || loadingMore || (!currentCategory && !currentRegion && !currentQuery)) return;
      const title = currentQuery ? `Results for “${currentQuery}”`
        : currentRegion ? `${currentRegion.title} · Live Cameras`
          : (CATEGORY_TILES.find(item => item.id === currentCategory)?.title || categoryLabel({ category: currentCategory }));
      loadingMore = true;
      loadMoreButton.disabled = true;
      loadMoreButton.textContent = 'Loading…';
      const params = new URLSearchParams({ limit: '48', sort: 'fresh', cursor: paginationCursor });
      if (currentCategory) params.set('category', currentCategory);
      else if (currentRegion) params.set('bbox', currentRegion.bbox);
      else params.set('q', currentQuery);
      const request = startRequest();
      try {
        const payload = await requestCatalog(params, request.signal);
        if (disposed || request.signal.aborted) return;
        paginationCursor = nextCursorFrom(payload);
        renderResults(itemsFrom(payload), title, { append: true });
        setStatus(`Showing ${resultCameras.length} eligible previews${paginationCursor ? ' · more cameras are available' : ' · end of these results'}.`, 'success');
      } catch (error) {
        if (disposed || request.signal.aborted) return;
        setStatus(`Could not load more cameras. ${error?.message || 'Please try again.'}`, 'error');
      } finally {
        loadingMore = false;
        if (!disposed) {
          loadMoreButton.disabled = !paginationCursor;
          loadMoreButton.textContent = 'Load more cameras';
          loadMoreButton.hidden = !paginationCursor;
        }
      }
    }

    function resetBrowse() {
      currentCategory = '';
      currentRegion = null;
      currentQuery = '';
      searchInput.value = '';
      clearButton.hidden = true;
      paginationCursor = '';
      loadingMore = false;
      resultsTitle.hidden = true;
      resultGrid.hidden = true;
      loadMoreButton.hidden = true;
      resultCameras = featuredCameras;
      setStatus('Choose a region, category, or search for a place to explore public camera windows.');
    }
    function refreshCurrent() {
      if (currentQuery) runSearch(currentQuery);
      else if (currentCategory) loadCategory(currentCategory);
      else if (currentRegion) loadRegion(currentRegion);
      else loadHome({ silent: true });
    }

    const onSubmit = event => {
      event.preventDefault();
      runSearch(searchInput.value);
    };
    const onClear = () => resetBrowse();
    const onRefresh = () => refreshCurrent();
    const onCloseModal = () => closeDetails();
    const onModalBackdrop = event => { if (event.target === modal) closeDetails(); };
    const onKeyDown = event => { if (event.key === 'Escape' && !modal.hidden) closeDetails(); };
    const onOnline = () => { setStatus('Connection restored. Refreshing camera directory…'); refreshCurrent(); };
    const onOffline = () => setStatus('You are offline. Live camera records are not shown from an old cache.', 'error');
    const onVisibility = () => { if (!document.hidden && !disposed) refreshCurrent(); };

    searchRow.addEventListener('submit', onSubmit);
    clearButton.addEventListener('click', onClear);
    featuredRefresh.addEventListener('click', onRefresh);
    loadMoreButton.addEventListener('click', loadMore);
    closeButton.addEventListener('click', onCloseModal);
    modal.addEventListener('click', onModalBackdrop);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    loadHome();
    refreshTimer = window.setInterval(() => {
      if (!disposed && !document.hidden && navigator.onLine !== false) refreshCurrent();
    }, 5 * 60 * 1000);

    return () => {
      if (disposed) return;
      disposed = true;
      activeRequest?.abort();
      activeRequest = null;
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = 0;
      searchRow.removeEventListener('submit', onSubmit);
      clearButton.removeEventListener('click', onClear);
      featuredRefresh.removeEventListener('click', onRefresh);
      loadMoreButton.removeEventListener('click', loadMore);
      closeButton.removeEventListener('click', onCloseModal);
      modal.removeEventListener('click', onModalBackdrop);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
      modal.remove();
      // Preserve the stage reference before removing the mounted feature root.
      const host = root.parentElement;
      root.remove();
      // runtime.mount() owns the stage class and hidden-card restoration. Its
      // root is removed here; the wrapper cleanup remains idempotent on close.
      if (host && !host.querySelector('.le-sfv')) {
        host.classList.remove('le-sfv-open');
        const stageCard = host.querySelector('.le-feature-stage-card');
        if (stageCard) stageCard.hidden = false;
      }
    };
  }

  let liveCamsCleanup = () => {};
  featureRegistry.register('live-cams', {
    title: 'Live Cams',
    shortLabel: 'Live Cams',
    symbol: '◉',
    description: 'Explore live camera windows from around the world.',
    connected: true,
    activate: () => { liveCamsCleanup = activateLiveCams(); },
    deactivate: () => {
      liveCamsCleanup();
      liveCamsCleanup = () => {};
    }
  });
})();
