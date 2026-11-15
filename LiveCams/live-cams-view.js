/* LIVE // EARTH — Independent Live Cams discovery feature.
   Editorial camera discovery built on the existing Stacks feature stage.
   No globe, map renderer, WebGL context, or paid live-video session is created.
   Public directory rows remain discoverable; images, publisher links and unavailable
   entries are rendered separately according to the directory's declared permissions. */
(() => {
  'use strict';

  const API_BASE = 'https://api.openeye.cam/v1';
  const runtime = window.LiveEarthStacksFeatureRuntime;

  if (!runtime || typeof runtime.mount !== 'function') {
    console.error('[LIVE // EARTH] Stacks runtime is unavailable; Live Cams was not registered.');
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

  const style = document.createElement('style');
  style.id = 'le-live-cams-discovery-style';
  style.textContent = `
    .le-sfv--live-cams{pointer-events:none;color:#eef6ff}
    /* Explicitly honour hidden states even when component rules set display:inline-flex/grid. */
    .le-sfv--live-cams [hidden]{display:none!important}
    .le-sfv--live-cams .le-sfv-panel{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
      max-width:none!important;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;
      overscroll-behavior-y:contain;overscroll-behavior-x:none;-webkit-overflow-scrolling:touch;scrollbar-width:none;touch-action:pan-y;
      pointer-events:auto!important;padding:calc(env(safe-area-inset-top) + 16px) clamp(15px,4.2vw,28px) calc(env(safe-area-inset-bottom) + 188px)!important;
      border:0!important;border-radius:0!important;
      background-image:radial-gradient(ellipse 110% 33% at 50% 0%,rgba(23,74,108,.48),transparent 72%),
        linear-gradient(180deg,rgba(3,11,20,.78) 0%,rgba(4,15,26,.88) 52%,rgba(2,8,15,.96) 100%),
        url("./LiveCams/Assets/weather.jpg")!important;
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
    .le-lc-hero{touch-action:pan-y;position:relative;display:block;width:100%;min-height:154px;max-height:310px;aspect-ratio:2.32/1;overflow:hidden;border:1px solid rgba(190,221,243,.22);border-radius:23px;background:linear-gradient(140deg,#16354a,#091521 62%,#07101b);box-shadow:0 17px 38px rgba(0,0,0,.30),inset 0 1px rgba(255,255,255,.08);text-align:left;color:inherit;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
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
    .le-lc-diagnostics{border:1px solid rgba(151,194,223,.16);border-radius:13px;background:rgba(4,13,23,.62);padding:10px 12px;color:#9db6c8;font-size:10px}
    .le-lc-diagnostics[hidden]{display:none!important}
    .le-lc-diagnostics summary{cursor:pointer;color:#b8d3e4;font-weight:650;letter-spacing:.04em}
    .le-lc-diagnostics-text{max-height:190px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;color:#8faabd;font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
    .le-lc-modal{position:fixed;z-index:20;inset:0;display:grid;align-items:end;padding:16px 12px calc(env(safe-area-inset-bottom) + 112px);background:rgba(0,4,9,.78);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:auto}
    .le-lc-modal[hidden]{display:none}
    .le-lc-modal-panel{position:relative;width:min(100%,560px);max-height:min(72vh,680px);overflow:auto;margin:0 auto;padding:13px;border:1px solid rgba(173,215,241,.22);border-radius:23px;background:linear-gradient(155deg,#122638,#07131f 75%);box-shadow:0 22px 70px #000a}
    .le-lc-modal-close{position:absolute;z-index:2;right:22px;top:22px;width:36px;height:36px;border:1px solid #ffffff55;border-radius:50%;background:#071522dd;color:#fff;font-size:20px;cursor:pointer}
    .le-lc-modal-image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:15px;background:#0b1a26}.le-lc-modal-image[hidden]{display:none!important}
    .le-lc-live-video{display:block;width:100%;max-height:48vh;aspect-ratio:16/9;object-fit:contain;border-radius:15px;background:#02070d;margin:0 0 10px}.le-lc-live-video[hidden],.le-lc-video-status[hidden]{display:none!important}
    .le-lc-video-status{margin:0 2px 12px;padding:9px 11px;border:1px solid rgba(125,198,230,.18);border-radius:11px;background:rgba(4,13,23,.55);color:#acd2e8;font-size:10px;line-height:1.5}
    .le-lc-video-status[data-kind="error"]{border-color:rgba(255,130,140,.28);color:#ffc0c5}
    .le-lc-video-status[data-kind="success"]{border-color:rgba(103,213,180,.22);color:#a8e9d4}
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
    return `./LiveCams/Assets/${key}.jpg`;
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
    const suppliedTimestamp = camera?.frame_ts;
    if (typeof suppliedTimestamp === 'string' && !/^\d+(?:\.\d+)?$/.test(suppliedTimestamp.trim())) {
      const parsed = Date.parse(suppliedTimestamp);
      if (Number.isFinite(parsed)) return Math.max(0, (Date.now() - parsed) / 1000);
    }
    const timestamp = Number(suppliedTimestamp);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      // OpenEye documents frame_ts in milliseconds. Also accept epoch seconds
      // for older adapters without silently turning them into ancient frames.
      const milliseconds = timestamp < 100000000000 ? timestamp * 1000 : timestamp;
      return Math.max(0, (Date.now() - milliseconds) / 1000);
    }
    return NaN;
  }
  // Some upstream adapters serialize SQLite boolean columns as 0/1 or strings.
  // Normalize only unambiguous boolean representations; unknown stays unknown.
  function booleanFlag(value) {
    if (value === true || value === 1 || value === '1' || value === 'true') return true;
    if (value === false || value === 0 || value === '0' || value === 'false') return false;
    return null;
  }
  function accessFlag(camera) { return booleanFlag(camera?.is_free); }
  function liveFlag(camera) { return booleanFlag(camera?.live); }
  function isFresh(camera) {
    if (liveFlag(camera) === false) return false;
    const age = frameAgeSeconds(camera);
    if (Number.isFinite(age)) return age >= 0 && age <= 7 * 86400;
    return liveFlag(camera) === true;
  }
  function cameraFreshnessLabel(camera) {
    const age = frameAgeSeconds(camera);
    if (liveFlag(camera) === true && (!Number.isFinite(age) || age <= 7 * 86400)) return 'LIVE FRAME';
    if (Number.isFinite(age)) return 'RECENT FRAME';
    return 'FRAME · TIME UNKNOWN';
  }
  function cameraArtwork(camera) {
    const category = String(camera?.category || '').toLowerCase();
    const artwork = ({ wildlife: 'wildlife', surf: 'oceans', city: 'cities', weather: 'weather', ski: 'mountains', aurora: 'night-skies' })[category] || 'night-skies';
    return discoveryImage(artwork);
  }
  function previewUrl(camera) {
    const view = camera?.view || {};
    const render = String(view.render || '').toLowerCase();
    const redistribution = camera?.redistribution || {};
    const previewEmbedPermitted = redistribution.preview_embed === true;
    const hasDirectoryPoster = !!safeHttps(camera?.preview_url);
    const isPermittedPreviewImage = render === 'image' && previewEmbedPermitted;
    const isDirectSourceImage = render === 'image' && view.hosted === 'source' && view.url_type === 'image' && redistribution.frame_reuse === 'fetch-from-source';
    const isSignedDirectoryPoster = (render === 'image' || render === 'link') && hasDirectoryPoster && previewEmbedPermitted;
    if (!isPermittedPreviewImage && !isDirectSourceImage && !isSignedDirectoryPoster) return '';
    // Embedding permission is a separate contract from full-feed pricing.
    // A permitted poster may be shown even when the access flag is omitted;
    // the app still will not open a full source or start a metered video session.
    if (redistribution.attribution?.required === true && !cameraCredit(camera)) return '';
    const declaredUrl = safeHttps(camera?.preview_url || view.url);
    return declaredUrl || '';
  }
  function cameraDestinationUrl(camera) {
    if (accessFlag(camera) !== true) return '';
    const view = camera?.view || {};
    const render = String(view.render || '').toLowerCase();
    if (render === 'none') return '';
    if (render === 'link') return safeHttps(view.url || sourceUrl(camera));
    return safeHttps(camera?.source_url || camera?.publisher_url || camera?.viewer_url || camera?.website);
  }
  function cameraFeedKind(camera) {
    const raw = camera?.feed_kind ?? camera?.kind ?? camera?.stream?.feed_kind ?? camera?.stream?.kind ?? '';
    return String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
  }
  function isLiveVideoCamera(camera) {
    // OpenEye's WHEP endpoint is explicitly limited to feed_kind=live_video.
    // A still-image refresh feed or an HTML publisher page must never be guessed as video.
    return cameraFeedKind(camera) === 'live_video';
  }
  function canStartLiveVideo(camera) {
    // The OpenEye catalogue's live flag is the provider's active-camera signal.
    // A still-frame timestamp is not the health clock for a continuous video feed.
    // Require an explicit live_video kind, free access, and live=true before WHEP.
    return isLiveVideoCamera(camera) && accessFlag(camera) === true && liveFlag(camera) === true;
  }
  function displayable(camera) {
    // A catalogue row is a directory result even when it is paid, stale, source-
    // only, missing an image, or missing optional health metadata. The UI labels
    // those states explicitly and never opens a paid/restricted media endpoint.
    return !!camera && typeof camera.id === 'string' && camera.id.trim().length > 0;
  }
  function hasDisplayRoute(camera) {
    return !!previewUrl(camera) || (accessFlag(camera) === true && !!cameraDestinationUrl(camera)) || canStartLiveVideo(camera);
  }
  function cameraCardState(camera) {
    const access = accessFlag(camera);
    const live = liveFlag(camera);
    const imageUrl = previewUrl(camera);
    if (live === false) return imageUrl ? 'LAST FRAME · OFFLINE' : 'OFFLINE / STALE';
    if (canStartLiveVideo(camera)) return 'LIVE VIDEO · TAP TO PLAY';
    const age = frameAgeSeconds(camera);
    if (Number.isFinite(age) && age > 7 * 86400) return imageUrl ? 'OLD PREVIEW · NOT LIVE' : 'STALE · NOT LIVE';
    if (imageUrl && access === null) return 'PREVIEW PERMITTED · FEED ACCESS UNKNOWN';
    if (imageUrl && access === false) return 'PAID PREVIEW · FULL FEED LOCKED';
    if (imageUrl) return cameraFreshnessLabel(camera);
    if (access === false) return 'PAID FEED · NOT OPENED';
    if (access !== true) return 'ACCESS UNCONFIRMED';
    if (cameraDestinationUrl(camera)) return 'OPEN SOURCE';
    if (String(camera?.view?.render || '').toLowerCase() === 'none') return 'NO PUBLIC VIEW';
    return live === true ? 'PREVIEW UNAVAILABLE' : 'STATUS UNKNOWN';
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
    const suppliedTimestamp = camera?.frame_ts;
    let timestamp = NaN;
    if (typeof suppliedTimestamp === 'string' && !/^\d+(?:\.\d+)?$/.test(suppliedTimestamp.trim())) {
      timestamp = Date.parse(suppliedTimestamp);
    } else {
      timestamp = Number(suppliedTimestamp);
      if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < 100000000000) timestamp *= 1000;
    }
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
    const diagnosticsPanel = make('details', 'le-lc-diagnostics');
    const diagnosticsSummary = make('summary', '', 'Camera connection details');
    const diagnosticsText = make('pre', 'le-lc-diagnostics-text', 'Waiting for the first directory request…');
    const diagnosticsCopy = make('button', 'le-lc-secondary-button', 'Copy diagnostics');
    diagnosticsCopy.type = 'button';
    diagnosticsPanel.append(diagnosticsSummary, diagnosticsText, diagnosticsCopy);
    diagnosticsPanel.hidden = true;
    wrap.appendChild(diagnosticsPanel);

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
    const modalVideo = make('video', 'le-lc-live-video');
    modalVideo.hidden = true;
    modalVideo.controls = true;
    modalVideo.autoplay = true;
    modalVideo.playsInline = true;
    modalVideo.setAttribute('playsinline', '');
    modalVideo.muted = true;
    modalVideo.preload = 'none';
    const modalVideoStatus = make('p', 'le-lc-video-status', 'Live video is not connected.');
    modalVideoStatus.hidden = true;
    const modalTitle = make('h3', '');
    const modalLocation = make('p', 'le-lc-modal-location');
    const modalMeta = make('p', 'le-lc-modal-meta');
    const modalCredit = make('p', 'le-lc-modal-credit');
    const modalActions = make('div', 'le-lc-modal-actions');
    modalPanel.append(closeButton, modalImage, modalVideo, modalVideoStatus, modalTitle, modalLocation, modalMeta, modalCredit, modalActions);
    modal.appendChild(modalPanel);
    root.appendChild(modal);

    let disposed = false;
    let activeRequest = null;
    let refreshTimer = 0;
    let activeVideoPlayer = null;
    let activeVideoPlayButton = null;
    let videoEnginePromise = null;
    let videoRequestSerial = 0;
    let currentCategory = '';
    let currentRegion = null;
    let currentQuery = '';
    let featuredCameras = [];
    let activeHeroIndex = 0;
    let heroRotationTimer = 0;
    let heroTouchStartX = 0;
    let heroTouchStartY = 0;
    let heroTouchStartAt = 0;
    let heroSwipeHandled = false;
    let resultCameras = [];
    let paginationCursor = '';
    let loadingMore = false;
    let lastFocused = null;
    const diagnosticLog = [];
    function refreshDiagnosticPanel() {
      if (!diagnosticLog.length) return;
      diagnosticsPanel.hidden = false;
      diagnosticsText.textContent = diagnosticLog.slice(-18).map(entry => {
        const details = [entry.status ? `HTTP ${entry.status}` : entry.error || 'request failed', `${entry.ms} ms`];
        if (entry.shape) details.push(entry.shape);
        if (entry.rows !== undefined) details.push(`${entry.rows} rows`);
        if (entry.ids !== undefined) details.push(`${entry.ids} IDs`);
        if (entry.live !== undefined) details.push(`${entry.live} live`);
        if (entry.images !== undefined) details.push(`${entry.images} images`);
        if (entry.previewPermitted !== undefined) details.push(`${entry.previewPermitted} embed-approved`);
        if (entry.signedPosters !== undefined) details.push(`${entry.signedPosters} signed posters`);
        if (entry.links !== undefined) details.push(`${entry.links} links`);
        if (entry.none !== undefined) details.push(`${entry.none} no-view`);
        if (entry.total !== undefined && entry.total !== null) details.push(`total ${entry.total}`);
        if (entry.free !== undefined && entry.free !== null) details.push(`free ${entry.free}`);
        if (entry.failed !== undefined && entry.failed !== null) details.push(`${entry.failed} detail failures`);
        return `${entry.endpoint} — ${details.join(' · ')}`;
      }).join('\n');
      window.LiveEarthCameraDiagnostics = {
        updatedAt: new Date().toISOString(),
        recentRequests: diagnosticLog.slice(-18).map(entry => ({ ...entry }))
      };
    }
    function recordDiagnostic(entry) {
      diagnosticLog.push({ ...entry, at: new Date().toISOString() });
      if (diagnosticLog.length > 40) diagnosticLog.shift();
      refreshDiagnosticPanel();
    }
    async function copyDiagnostics() {
      const report = diagnosticsText.textContent || 'No camera request diagnostics yet.';
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(report);
        else throw new Error('Clipboard unavailable');
        diagnosticsCopy.textContent = 'Copied';
      } catch (_) {
        diagnosticsCopy.textContent = 'Select the diagnostic text to copy';
      }
    }

    function cameraSummary(cameras) {
      const total = cameras.length;
      const live = cameras.filter(camera => liveFlag(camera) === true && isFresh(camera)).length;
      const previews = cameras.filter(camera => !!previewUrl(camera)).length;
      const publisher = cameras.filter(camera => accessFlag(camera) === true && !!cameraDestinationUrl(camera)).length;
      const paid = cameras.filter(camera => accessFlag(camera) === false).length;
      const inactive = cameras.filter(camera => liveFlag(camera) === false || (Number.isFinite(frameAgeSeconds(camera)) && frameAgeSeconds(camera) > 7 * 86400)).length;
      const unknown = cameras.filter(camera => accessFlag(camera) === null).length;
      return `${total} directory records · ${live} live · ${previews} permitted image previews · ${publisher} publisher links · ${paid} paid · ${inactive} stale/offline${unknown ? ` · ${unknown} access unknown` : ''}`;
    }

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
      const videoAvailable = canStartLiveVideo(camera);
      heroButton.disabled = !imageUrl && !destination && !videoAvailable;
      heroBadge.hidden = !imageUrl && !videoAvailable;
      if (imageUrl || videoAvailable) {
        heroBadge.replaceChildren(make('span', 'le-lc-live-dot'), make('span', '', cameraCardState(camera)));
      }
      heroFallback.style.backgroundImage = `linear-gradient(180deg,rgba(1,8,15,.10),rgba(1,8,15,.76)),url('${cameraArtwork(camera)}')`;
      heroFallback.textContent = imageUrl ? 'Camera preview temporarily unavailable'
        : videoAvailable ? 'Tap to open in-app live video'
          : destination ? 'Open this camera at its publisher'
            : accessFlag(camera) === false ? 'Paid camera · preview only'
              : accessFlag(camera) === null ? 'Preview or source access is not confirmed'
                : liveFlag(camera) === false ? 'Camera currently offline'
                  : 'No public preview or publisher view is available';
      heroButton.onclick = () => openDetails(camera);
      heroImage.hidden = !imageUrl;
      heroFallback.hidden = !!imageUrl;
      heroImage.onerror = () => {
        heroImage.hidden = true;
        heroFallback.hidden = false;
        heroFallback.textContent = destination ? 'Preview unavailable · open publisher camera' : 'Camera preview temporarily unavailable';
        heroBadge.hidden = true;
        heroButton.disabled = !destination && !videoAvailable;
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
      const videoAvailable = canStartLiveVideo(camera);
      const canOpen = !!imageUrl || (accessFlag(camera) === true && !!destination) || videoAvailable;
      if (imageUrl) {
        image.src = imageUrl;
        image.onerror = () => {
          image.removeAttribute('src');
          image.hidden = true;
          card.disabled = !destination && !videoAvailable;
          card.classList.add('le-lc-card-no-image');
        };
      } else {
        // Scenic art is only a labelled directory placeholder, never a frame.
        image.src = cameraArtwork(camera);
        image.classList.add('le-lc-card-artwork');
        image.onerror = () => { image.hidden = true; card.style.background = 'linear-gradient(145deg,#153247,#07111c)'; };
      }
      card.disabled = !canOpen;
      const content = make('div', 'le-lc-card-content');
      const badge = make('span', 'le-lc-badge');
      const cardState = cameraCardState(camera);
      if (imageUrl || videoAvailable) badge.append(make('span', 'le-lc-live-dot'), make('span', '', cardState));
      else if (destination) badge.append(make('span', '', '↗'), make('span', '', cardState));
      else badge.append(make('span', '', '•'), make('span', '', cardState));
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
    function stopHeroRotation() {
      if (heroRotationTimer) window.clearInterval(heroRotationTimer);
      heroRotationTimer = 0;
    }
    function startHeroRotation() {
      stopHeroRotation();
      if (featuredCameras.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      heroRotationTimer = window.setInterval(() => {
        if (disposed || document.hidden || modal.hidden) return;
        activeHeroIndex = (activeHeroIndex + 1) % Math.min(featuredCameras.length, 5);
        setHero(featuredCameras[activeHeroIndex] || null);
        renderHeroDots(featuredCameras);
      }, 6500);
    }
    function showHeroAt(index) {
      if (!featuredCameras.length) return;
      activeHeroIndex = (index + featuredCameras.length) % featuredCameras.length;
      setHero(featuredCameras[activeHeroIndex] || null);
      renderHeroDots(featuredCameras);
      startHeroRotation();
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
        dot.addEventListener('click', () => showHeroAt(index));
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
      startHeroRotation();
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
        resultGrid.appendChild(make('p', 'le-lc-empty', 'No camera with a permitted preview or confirmed public viewing page is available for this view. Try another subject or place.'));
      } else {
        resultCameras.forEach(camera => resultGrid.appendChild(makeCameraCard(camera)));
      }
      loadMoreButton.hidden = !paginationCursor;
      loadMoreButton.disabled = loadingMore;
      loadMoreButton.textContent = loadingMore ? 'Loading…' : 'Load more cameras';
    }
    function setVideoStatus(message, kind = '') {
      modalVideoStatus.textContent = message;
      modalVideoStatus.hidden = false;
      if (kind) modalVideoStatus.dataset.kind = kind;
      else modalVideoStatus.removeAttribute('data-kind');
    }
    function ensureVideoEngine() {
      if (window.LiveEarthLiveVideoEngine) return Promise.resolve(window.LiveEarthLiveVideoEngine);
      if (videoEnginePromise) return videoEnginePromise;
      videoEnginePromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-live-earth-video-engine="1"]');
        if (existing) {
          existing.addEventListener('load', () => window.LiveEarthLiveVideoEngine ? resolve(window.LiveEarthLiveVideoEngine) : reject(new Error('Live Video Engine loaded without registering.')), { once: true });
          existing.addEventListener('error', () => reject(new Error('Live Video Engine could not be loaded.')), { once: true });
          return;
        }
        const script = document.createElement('script');
        script.src = new URL('./LiveCams/live-video-engine.js', document.baseURI).href;
        script.async = true;
        script.dataset.liveEarthVideoEngine = '1';
        script.onload = () => window.LiveEarthLiveVideoEngine
          ? resolve(window.LiveEarthLiveVideoEngine)
          : reject(new Error('Live Video Engine loaded without registering.'));
        script.onerror = () => reject(new Error('Live Video Engine failed to load. Check the app update and network connection.'));
        (document.head || document.documentElement).appendChild(script);
      }).catch(error => {
        videoEnginePromise = null;
        throw error;
      });
      return videoEnginePromise;
    }
    function stopLiveVideo(message = '', kind = '') {
      videoRequestSerial += 1;
      const player = activeVideoPlayer;
      activeVideoPlayer = null;
      if (player) player.stop().catch(() => {});
      if (activeVideoPlayButton?.isConnected) {
        activeVideoPlayButton.disabled = false;
        activeVideoPlayButton.textContent = 'Play live video here';
      }
      activeVideoPlayButton = null;
      try { modalVideo.pause(); } catch (_) {}
      modalVideo.srcObject = null;
      modalVideo.removeAttribute('src');
      modalVideo.load?.();
      modalVideo.hidden = true;
      if (message) setVideoStatus(message, kind);
      else modalVideoStatus.hidden = true;
    }
    async function startLiveVideo(camera, playButton) {
      if (!canStartLiveVideo(camera)) {
        setVideoStatus('This camera is not confirmed as a free, active live_video stream. No video session was started.', 'error');
        return;
      }
      stopLiveVideo();
      const requestSerial = videoRequestSerial;
      activeVideoPlayButton = playButton;
      playButton.disabled = true;
      playButton.textContent = 'Connecting…';
      modalVideo.hidden = false;
      modalVideo.poster = previewUrl(camera) || '';
      modalVideoStatus.hidden = false;
      setVideoStatus('Preparing a secure live-video connection…');
      try {
        const Engine = await ensureVideoEngine();
        if (disposed || modal.hidden || requestSerial !== videoRequestSerial) return;
        const player = new Engine({
          streamId: camera.id,
          videoElement: modalVideo,
          onState: state => {
            if (requestSerial !== videoRequestSerial || disposed) return;
            if (state === 'preparing') setVideoStatus('Preparing WebRTC connection…');
            else if (state === 'connecting') setVideoStatus('Negotiating with the camera…');
            else if (state === 'connected') setVideoStatus('Live video connected.', 'success');
            else if (state === 'disconnected') setVideoStatus('The live connection was interrupted. Waiting for recovery…');
            else if (state === 'autoplay-blocked') setVideoStatus('Connected. Tap Play in the video controls to begin.', 'success');
            else if (state === 'closed' && !modal.hidden && !modalVideoStatus.dataset.kind) setVideoStatus('Live video session closed.');
          },
          onTrack: () => {
            if (requestSerial !== videoRequestSerial || disposed) return;
            modalImage.hidden = true;
            modalVideo.hidden = false;
          },
          onError: error => {
            if (requestSerial !== videoRequestSerial || disposed) return;
            const message = error?.message || 'The camera video session failed.';
            setVideoStatus(message, 'error');
            playButton.disabled = false;
            playButton.textContent = 'Try live video again';
          }
        });
        activeVideoPlayer = player;
        await player.start();
        if (requestSerial !== videoRequestSerial || disposed || modal.hidden) {
          await player.stop();
          return;
        }
        playButton.textContent = 'Live video requested';
        playButton.disabled = true;
        setVideoStatus('The video session is ready. Waiting for the live camera track…');
      } catch (error) {
        if (requestSerial !== videoRequestSerial || disposed) return;
        activeVideoPlayer?.stop().catch(() => {});
        activeVideoPlayer = null;
        activeVideoPlayButton = null;
        modalVideo.hidden = true;
        playButton.disabled = false;
        playButton.textContent = 'Try live video again';
        setVideoStatus(error?.message || 'The live-video connection could not be started.', 'error');
      }
    }

    function openDetails(camera) {
      if (disposed || !displayable(camera)) return;
      stopLiveVideo();
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
      const publisher = cameraDestinationUrl(camera);
      const accessLabel = accessFlag(camera) === false ? (imageUrl ? 'Paid feed — approved preview only; full feed not opened' : 'Paid feed — not opened in Live Cams')
        : accessFlag(camera) === null ? (imageUrl ? 'Preview embedding is permitted; full-feed access is unconfirmed' : 'Access status not supplied')
          : liveFlag(camera) === false ? 'Camera currently marked offline'
            : imageUrl ? 'Approved camera preview' : publisher ? 'Publisher-hosted camera' : 'Preview unavailable';
      modalMeta.textContent = `${categoryLabel(camera)} · ${timeLabel(camera)} · ${accessLabel}`;
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
      modalVideo.hidden = true;
      modalVideoStatus.hidden = true;
      modalVideo.poster = imageUrl || '';
      if (isLiveVideoCamera(camera)) {
        if (canStartLiveVideo(camera)) {
          const playButton = make('button', 'le-lc-secondary-button', 'Play live video here');
          playButton.type = 'button';
          playButton.addEventListener('click', () => startLiveVideo(camera, playButton));
          modalActions.appendChild(playButton);
          modalActions.appendChild(make('p', 'le-lc-modal-meta', 'In-app WebRTC playback. OpenEye documents WHEP live sessions as potentially metered at US$0.002 per second. Playback starts only after this tap; LIVE // EARTH does not submit payments or settle a 402 request.'));
        } else {
          const reason = accessFlag(camera) === false
            ? 'This live-video stream is marked paid. Live Cams will not start a metered session or make a payment.'
            : accessFlag(camera) === null
              ? 'The provider has not confirmed free access for this live-video stream. No session was started.'
              : liveFlag(camera) !== true || !isFresh(camera)
                ? 'The provider has not confirmed a fresh, active video signal for this camera. No session was started.'
                : 'This camera is not a supported live_video feed. No session was started.';
          modalActions.appendChild(make('p', 'le-lc-modal-meta', reason));
          if (publisher) {
            const link = make('a', '', 'Open publisher (optional)');
            link.href = publisher;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            modalActions.appendChild(link);
          }
        }
      } else if (publisher) {
        const link = make('a', '', imageUrl ? 'Open publisher' : 'Open live camera at publisher');
        link.href = publisher;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        modalActions.appendChild(link);
      }
      if (!publisher && !isLiveVideoCamera(camera)) {
        const explanation = accessFlag(camera) === false
          ? 'This camera is a paid feed. Only the provider-approved preview is shown; Live Cams does not initiate paid frame or video sessions.'
          : accessFlag(camera) === null
            ? (imageUrl ? 'The provider permits this preview image, but full-feed access was not confirmed. No live session or publisher page is opened.' : 'The directory did not provide a confirmed access flag, so this camera is listed but not opened.')
            : liveFlag(camera) === false
              ? 'The directory currently marks this camera offline. No live preview is shown.'
              : imageUrl
                ? 'The preview is shown under its listed embed permission.'
                : 'The directory lists this camera, but no embeddable preview or publisher viewing link was supplied.';
        modalActions.appendChild(make('p', 'le-lc-modal-meta', explanation));
      }
      modal.hidden = false;
      closeButton.focus?.();
    }
    function closeDetails() {
      stopLiveVideo();
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
      const startedAt = Date.now();
      const endpoint = path.split('?')[0];
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        const statusCode = response.status;
        if (!response.ok) {
          const message = statusCode === 401 || statusCode === 403
            ? `Camera directory returned ${statusCode}. It may require a free API key or access permission.`
            : statusCode === 429
              ? 'Camera directory rate limit reached (HTTP 429). Wait before refreshing; do not keep retrying.'
              : `Camera directory returned ${statusCode}.`;
          const error = new Error(message);
          error.status = statusCode;
          recordDiagnostic({ endpoint, status: statusCode, ms: Date.now() - startedAt, error: message });
          throw error;
        }
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (!type.includes('json')) {
          const error = new Error(`Camera directory returned non-JSON content (${type || 'unknown content type'}).`);
          error.status = statusCode;
          recordDiagnostic({ endpoint, status: statusCode, ms: Date.now() - startedAt, error: error.message });
          throw error;
        }
        const payload = await response.json();
        const rows = itemsFrom(payload);
        const clusters = Array.isArray(payload?.clusters) ? payload.clusters : [];
        const allRows = [...rows, ...clusters];
        const renderCounts = allRows.reduce((counts, row) => {
          const kind = String(row?.view?.render || 'unknown').toLowerCase();
          counts[kind] = (counts[kind] || 0) + 1;
          return counts;
        }, {});
        recordDiagnostic({
          endpoint, status: statusCode, ms: Date.now() - startedAt,
          shape: payload?.mode || (clusters.length ? 'clusters' : Array.isArray(payload?.items) ? 'items' : Object.keys(payload || {}).slice(0, 6).join(',')),
          rows: allRows.length,
          ids: allRows.filter(row => typeof row?.id === 'string' && row.id.trim()).length,
          live: allRows.filter(row => liveFlag(row) === true).length,
          images: renderCounts.image || 0,
          links: renderCounts.link || 0,
          none: renderCounts.none || 0,
          previewPermitted: allRows.filter(row => row?.redistribution?.preview_embed === true).length,
          signedPosters: allRows.filter(row => !!safeHttps(row?.preview_url)).length,
          unknownRender: renderCounts.unknown || 0,
          total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : undefined,
          free: Number.isFinite(Number(payload?.free)) ? Number(payload.free) : undefined
        });
        return payload;
      } catch (error) {
        if (!error?.status && !signal?.aborted) {
          recordDiagnostic({ endpoint, ms: Date.now() - startedAt, error: `${error?.name || 'Error'}: ${error?.message || 'Network/CORS/timeout failure'}` });
        }
        throw error;
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
      // OpenEye's embeddable=1 filter returns only rows with a permitted visible
      // preview or a usable public-view path, instead of source-only catalogue entries.
      original.set('embeddable', '1');
      const variants = [new URLSearchParams(original), new URLSearchParams(original)];
      variants[1].delete('sort');
      let lastError = null;
      let lastEmptyPayload = null;
      const seen = new Set();
      const needsSpatialRecovery = original.has('bbox') || original.has('category');
      for (const query of variants) {
        const key = query.toString();
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const payload = await requestJson(`/catalog?${key}`, signal);
          const rows = itemsFrom(payload);
          if (rows.some(displayable)) return payload;
          // HTTP 200 + an empty/unusable page is not proof that the region is
          // empty. Keep the response and continue to map-to-detail recovery.
          lastEmptyPayload = payload;
          if (!needsSpatialRecovery) return payload;
        } catch (error) {
          if (signal?.aborted) throw error;
          if (!(Number(error?.status) >= 500 && Number(error?.status) <= 599)) throw error;
          lastError = error;
        }
      }

      // The map projection is lean and zoom-dependent. Below zoom 10 it returns
      // count clusters rather than individual cameras. Ask for camera-level
      // representatives at zoom 11, and resolve IDs from either `items` or
      // `clusters` through the enriched /catalog/{id} endpoint.
      if (needsSpatialRecovery) {
        const mapParams = new URLSearchParams({ limit: '36', zoom: '11', cluster: 'auto' });
        if (original.has('bbox')) mapParams.set('bbox', original.get('bbox'));
        if (original.has('category')) mapParams.set('category', original.get('category'));
        try {
          const mapPayload = await requestJson(`/catalog/map?${mapParams.toString()}`, signal);
          const mapItems = itemsFrom(mapPayload);
          const mapClusters = Array.isArray(mapPayload?.clusters) ? mapPayload.clusters : [];
          const candidateIds = [...new Set([...mapItems, ...mapClusters]
            .map(item => item?.id)
            .filter(id => typeof id === 'string' && id.trim()))].slice(0, 12);
          if (!candidateIds.length) {
            return { items: [], total: Number(mapPayload?.total) || 0, next_cursor: null };
          }
          const detailResults = await Promise.allSettled(candidateIds.map(id =>
            requestJson(`/catalog/${encodeURIComponent(id)}`, signal)
          ));
          const fulfilled = detailResults.filter(result => result.status === 'fulfilled');
          const rejected = detailResults.filter(result => result.status === 'rejected');
          if (!fulfilled.length) {
            const failed = rejected[0];
            throw failed?.reason || new Error('Camera map candidates could not be resolved.');
          }
          const records = fulfilled
            .map(result => result.value?.item || result.value)
            .filter(record => record && typeof record === 'object' && displayable(record));
          recordDiagnostic({ endpoint: '/catalog/map → /catalog/{id}', status: 200,
            ms: 0, shape: `${mapPayload?.mode || 'map'} · ${candidateIds.length} IDs · ${fulfilled.length} resolved`,
            rows: records.length, ids: records.length,
            live: records.filter(record => liveFlag(record) === true).length,
            images: records.filter(record => String(record?.view?.render || '').toLowerCase() === 'image').length,
            links: records.filter(record => String(record?.view?.render || '').toLowerCase() === 'link').length,
            none: records.filter(record => String(record?.view?.render || '').toLowerCase() === 'none').length,
            total: Number(mapPayload?.total) || 0, free: Number(mapPayload?.free) || 0, failed: rejected.length });
          return { items: records, total: Number(mapPayload?.total) || records.length,
            free: Number(mapPayload?.free) || 0, next_cursor: null };
        } catch (error) {
          if (signal?.aborted) throw error;
          lastError = error || lastError;
        }
      }
      if (lastEmptyPayload && !lastError) return lastEmptyPayload;
      throw lastError || new Error('Camera catalogue and regional map both returned no camera IDs. Open the connection details for endpoint counts.');
    }
    async function hydrateCameras(cameras, signal, limit = 12) {
      const rows = Array.isArray(cameras) ? cameras : [];
      const candidates = rows.filter(camera => displayable(camera) &&
        (typeof camera.is_free !== 'boolean' || !camera.view || !camera.view.render ||
          (!camera.preview_url && !camera.view.url) ||
          (!camera.feed_kind && !camera.kind && !camera.stream?.feed_kind && !camera.stream?.kind))).slice(0, limit);
      if (!candidates.length) return rows;
      const details = await Promise.allSettled(candidates.map(camera =>
        requestJson(`/catalog/${encodeURIComponent(camera.id)}`, signal)
      ));
      const byId = new Map();
      details.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const detail = result.value?.item || result.value;
        if (detail && typeof detail === 'object') {
          byId.set(candidates[index].id, { ...candidates[index], ...detail,
            view: detail.view || candidates[index].view,
            redistribution: detail.redistribution || candidates[index].redistribution });
        }
      });
      return rows.map(camera => byId.get(camera.id) || camera);
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
            const backfill = await requestCatalog(new URLSearchParams({ limit: '36', sort: 'fresh', embeddable: '1' }), request.signal);
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
        // Featured and legacy catalogue rows can be lean. Resolve missing
        // access/media metadata before deciding whether a camera can be opened.
        cameras = await hydrateCameras(cameras, request.signal, 12);
        if (disposed || request.signal.aborted) return;
        // Never fill the featured rail with catalogue-only rows that cannot show
        // a provider-permitted preview or open a confirmed public source page.
        cameras = cameras.filter(hasDisplayRoute);
        if (hasCategories) renderCategories(categoriesResult.value);
        renderFeatured(cameras);
        if (cameras.length) {
          setStatus(cameraSummary(cameras), 'success');
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
        const resolved = await hydrateCameras(itemsFrom(payload).filter(displayable), request.signal, 12);
        if (disposed || request.signal.aborted) return;
        const cameras = resolved.filter(hasDisplayRoute);
        renderResults(cameras, title);
        setStatus(cameras.length ? `${region.title}: ${cameraSummary(cameras)}${paginationCursor ? ' · more results available' : ''}`
          : `No camera with a permitted preview or confirmed public viewing page is available for ${region.title}. Check Camera connection details below for the provider response.`, cameras.length ? 'success' : 'error');
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
        const resolved = await hydrateCameras(itemsFrom(payload).filter(displayable), request.signal, 12);
        if (disposed || request.signal.aborted) return;
        const cameras = resolved.filter(hasDisplayRoute);
        paginationCursor = nextCursorFrom(payload);
        renderResults(cameras, title);
        setStatus(cameras.length ? `${title}: ${cameraSummary(cameras)}`
          : `No camera with a permitted preview or confirmed public viewing page is available for ${title.toLowerCase()}. Check Camera connection details below for the provider response.`, cameras.length ? 'success' : 'error');
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
        const resolved = await hydrateCameras(itemsFrom(payload).filter(displayable), request.signal, 12);
        if (disposed || request.signal.aborted) return;
        const cameras = resolved.filter(hasDisplayRoute);
        paginationCursor = nextCursorFrom(payload);
        renderResults(cameras, `Results for “${normalized}”`);
        setStatus(cameras.length ? `Search: ${cameraSummary(cameras)}`
          : 'No camera with a permitted preview or confirmed public viewing page matched that search. Check Camera connection details below for provider status and media counts.', cameras.length ? 'success' : 'error');
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
        const resolved = await hydrateCameras(itemsFrom(payload).filter(displayable), request.signal, 12);
        if (disposed || request.signal.aborted) return;
        renderResults(resolved.filter(hasDisplayRoute), title, { append: true });
        setStatus(`Showing ${resultCameras.length} cameras with permitted previews or confirmed public viewing pages${paginationCursor ? ' · more results are available' : ' · end of these results'}.`, 'success');
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
    const onCopyDiagnostics = () => { copyDiagnostics(); };
    const onModalBackdrop = event => { if (event.target === modal) closeDetails(); };
    const onKeyDown = event => { if (event.key === 'Escape' && !modal.hidden) closeDetails(); };
    const onOnline = () => { setStatus('Connection restored. Refreshing camera directory…'); refreshCurrent(); };
    const onOffline = () => setStatus('You are offline. Live camera records are not shown from an old cache.', 'error');
    const onVisibility = () => {
      if (document.hidden) {
        stopHeroRotation();
        if (activeVideoPlayer) stopLiveVideo('Live video paused because the app went into the background. Tap Play to reconnect.');
      } else if (!disposed) {
        refreshCurrent();
        startHeroRotation();
      }
    };

    heroButton.addEventListener('click', event => {
      if (heroSwipeHandled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        heroSwipeHandled = false;
      }
    }, true);
    heroButton.addEventListener('pointerdown', event => {
      heroTouchStartX = event.clientX;
      heroTouchStartY = event.clientY;
      heroTouchStartAt = Date.now();
      stopHeroRotation();
    }, { passive: true });
    heroButton.addEventListener('pointerup', event => {
      const dx = event.clientX - heroTouchStartX;
      const dy = event.clientY - heroTouchStartY;
      if (Date.now() - heroTouchStartAt < 900 && Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        heroSwipeHandled = true;
        showHeroAt(activeHeroIndex + (dx < 0 ? 1 : -1));
      } else {
        startHeroRotation();
      }
    }, { passive: true });
    heroButton.addEventListener('pointercancel', startHeroRotation, { passive: true });
    heroButton.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); showHeroAt(activeHeroIndex + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); showHeroAt(activeHeroIndex - 1); }
    });

    searchRow.addEventListener('submit', onSubmit);
    clearButton.addEventListener('click', onClear);
    featuredRefresh.addEventListener('click', onRefresh);
    loadMoreButton.addEventListener('click', loadMore);
    diagnosticsCopy.addEventListener('click', onCopyDiagnostics);
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
      stopLiveVideo();
      activeRequest?.abort();
      activeRequest = null;
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = 0;
      stopHeroRotation();
      searchRow.removeEventListener('submit', onSubmit);
      clearButton.removeEventListener('click', onClear);
      featuredRefresh.removeEventListener('click', onRefresh);
      loadMoreButton.removeEventListener('click', loadMore);
      diagnosticsCopy.removeEventListener('click', onCopyDiagnostics);
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

  runtime.registerFeature('live-cams', activateLiveCams, true);
})();
