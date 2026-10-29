/* LIVE // EARTH V106 — Alien World with separate Live Updates and Weekly Publish modes.
   Live Updates remains network-only. Weekly Publish reads an independent IndexedDB archive;
   no issue text, image bundle or weekly payload is part of the verified app shell.
   NASA media API results are filtered to exclude explicit illustration/artist-concept labels.
   No AI-generated or locally fabricated pictures are used as content fallbacks. */
(() => {
  'use strict';
  const FEATURE_ID = 'alien-world';
  const STYLE_ID = 'le-alien-world-discovery-v104-style';
  const ROOT_ID = 'le-aw-discovery-root';
  if (window.__liveEarthAlienWorldDiscoveryInstalled) return;

  const NASA_IMAGES_API = 'https://images-api.nasa.gov/search';
  const NASA_CMS_API = 'https://science.nasa.gov/wp-json/wp/v2';
  const NASA_NEWS_URL = 'https://www.nasa.gov/news-release/';
  const SPACE_NEWS_API = 'https://api.spaceflightnewsapi.net/v4/articles/';
  const EXOPLANET_ARCHIVE_API = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
  const PAGE_SIZE = 4;
  const REQUEST_TIMEOUT_MS = 14000;

  const WORLD_GROUPS = {
    planets: {
      label: 'Planets',
      items: [
        { name: 'Mercury', type: 'Planet', query: 'MESSENGER Mercury surface', slug: 'mercury', url: 'https://science.nasa.gov/mercury/' },
        { name: 'Venus', type: 'Planet', query: 'Magellan Venus radar surface', slug: 'venus', url: 'https://science.nasa.gov/venus/' },
        { name: 'Earth', type: 'Planet', query: 'NASA Earth from space photograph', slug: 'earth', url: 'https://science.nasa.gov/earth/' },
        { name: 'Mars', type: 'Planet', query: 'Mars rover real surface photograph', slug: 'mars', url: 'https://science.nasa.gov/mars/' },
        { name: 'Jupiter', type: 'Planet', query: 'Juno spacecraft Jupiter real image', slug: 'jupiter', url: 'https://science.nasa.gov/jupiter/' },
        { name: 'Saturn', type: 'Planet', query: 'Cassini Saturn real image', slug: 'saturn', url: 'https://science.nasa.gov/saturn/' },
        { name: 'Uranus', type: 'Planet', query: 'Voyager 2 Uranus image', slug: 'uranus', url: 'https://science.nasa.gov/uranus/' },
        { name: 'Neptune', type: 'Planet', query: 'Voyager 2 Neptune image', slug: 'neptune', url: 'https://science.nasa.gov/neptune/' },
        { name: 'Pluto', type: 'Dwarf planet', query: 'New Horizons Pluto image', slug: 'pluto', url: 'https://science.nasa.gov/dwarf-planets/pluto/' }
      ]
    },
    moons: {
      label: 'Moons',
      items: [
        { name: "Earth's Moon", type: 'Natural satellite', query: 'Apollo lunar surface photograph', slug: 'earths-moon', url: 'https://science.nasa.gov/moon/' },
        { name: 'Europa', type: 'Moon of Jupiter', query: 'Galileo spacecraft Europa image', slug: 'europa', url: 'https://science.nasa.gov/jupiter/moons/europa/' },
        { name: 'Titan', type: 'Moon of Saturn', query: 'Cassini Huygens Titan image', slug: 'titan', url: 'https://science.nasa.gov/saturn/moons/titan/' },
        { name: 'Enceladus', type: 'Moon of Saturn', query: 'Cassini Enceladus image', slug: 'enceladus', url: 'https://science.nasa.gov/saturn/moons/enceladus/' },
        { name: 'Ganymede', type: 'Moon of Jupiter', query: 'Galileo spacecraft Ganymede image', slug: 'ganymede', url: 'https://science.nasa.gov/jupiter/moons/ganymede/' },
        { name: 'Io', type: 'Moon of Jupiter', query: 'Galileo spacecraft Io image', slug: 'io', url: 'https://science.nasa.gov/jupiter/moons/io/' },
        { name: 'Phobos', type: 'Moon of Mars', query: 'Mars Express Phobos image', slug: 'phobos', url: 'https://science.nasa.gov/mars/moons/phobos/' },
        { name: 'Deimos', type: 'Moon of Mars', query: 'Mars Reconnaissance Orbiter Deimos image', slug: 'deimos', url: 'https://science.nasa.gov/mars/moons/deimos/' }
      ]
    },
    deepSpace: {
      label: 'Galaxies & nebulae',
      items: [
        { name: 'Andromeda Galaxy', type: 'Galaxy', query: 'Hubble Andromeda Galaxy observation', slug: '', url: 'https://science.nasa.gov/universe/galaxies/' },
        { name: 'Orion Nebula', type: 'Nebula', query: 'Hubble Orion Nebula observation', slug: '', url: 'https://science.nasa.gov/universe/nebulae/' },
        { name: 'Carina Nebula', type: 'Nebula', query: 'Hubble Carina Nebula observation', slug: '', url: 'https://science.nasa.gov/universe/nebulae/' },
        { name: 'Eagle Nebula', type: 'Nebula', query: 'Hubble Eagle Nebula observation', slug: '', url: 'https://science.nasa.gov/universe/nebulae/' },
        { name: 'Crab Nebula', type: 'Supernova remnant', query: 'Hubble Crab Nebula observation', slug: '', url: 'https://science.nasa.gov/universe/nebulae/' },
        { name: 'Pillars of Creation', type: 'Star-forming region', query: 'Hubble Pillars of Creation observation', slug: '', url: 'https://science.nasa.gov/universe/nebulae/' }
      ]
    }
  };

  const state = {
    installed: false,
    featureRegistrationInstalled: false,
    active: false,
    stage: null,
    stageCard: null,
    root: null,
    page: null,
    route: { name: 'home' },
    category: 'planets',
    worldOffset: 0,
    searchText: '',
    mode: 'live',
    modeBar: null,
    liveModeButton: null,
    weeklyModeButton: null,
    searchbar: null,
    modePillLabel: null,
    weeklyScriptPromise: null,
    token: 0,
    controllers: new Set(),
    objectUrls: new Set(),
    onlineHandler: null,
    offlineHandler: null
  };

  const CSS = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:6;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;color:#f0f7ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(ellipse at 80% 0%,rgba(23,66,97,.42),transparent 46%),linear-gradient(180deg,#050b14,#071321 55%,#030811);pointer-events:auto;padding:calc(env(safe-area-inset-top) + 10px) 15px calc(env(safe-area-inset-bottom) + 178px);box-sizing:border-box}
    #${ROOT_ID}::after{content:"";position:fixed;z-index:10;left:0;right:0;bottom:0;height:calc(env(safe-area-inset-bottom) + 150px);pointer-events:none;background:linear-gradient(180deg,rgba(3,8,17,0),rgba(3,8,17,.34) 28%,rgba(3,8,17,.76) 64%,rgba(3,8,17,.94) 100%)}
    #${ROOT_ID}::-webkit-scrollbar{display:none}
    #${ROOT_ID} *{box-sizing:border-box}
    #${ROOT_ID} button,#${ROOT_ID} input{font:inherit}
    .aw-wrap{width:min(100%,920px);margin:0 auto}
    .aw-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 17px}
    .aw-brand{min-width:0}
    .aw-brand-title{margin:0;font-size:clamp(22px,6vw,32px);line-height:1.02;font-weight:850;letter-spacing:.15em;color:#eff8ff}
    .aw-brand-sub{margin:7px 0 0;color:#8eb8d3;font-size:9px;letter-spacing:.18em;text-transform:uppercase}
    .aw-live-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid #5299bd42;border-radius:999px;padding:7px 9px;background:#0a1b2ab0;color:#b7d8eb;white-space:nowrap;font-size:8px;letter-spacing:.12em;text-transform:uppercase}
    .aw-live-dot{width:6px;height:6px;border-radius:50%;background:#6fe5bd;box-shadow:0 0 9px #6fe5bd75}
    .aw-searchbar{display:flex;gap:8px;margin:0 0 12px;padding:5px;border:1px solid #98c8e328;border-radius:15px;background:#091725d9;box-shadow:inset 1px 1px 2px #ffffff08}
    .aw-modebar{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:0 0 20px;padding:4px;border:1px solid rgba(153,194,220,.17);border-radius:15px;background:rgba(5,13,23,.76)}
    .aw-mode-button{min-height:39px;padding:9px 8px;border:1px solid transparent;border-radius:11px;background:transparent;color:#a3b8c8;font-size:10px;font-weight:800;letter-spacing:.01em;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .aw-mode-button[aria-pressed="true"]{border-color:rgba(125,202,235,.34);background:linear-gradient(135deg,rgba(26,74,100,.9),rgba(8,24,39,.96));color:#f0faff;box-shadow:inset 0 1px rgba(255,255,255,.06)}
    .aw-mode-button[data-mode="weekly"][aria-pressed="true"]{border-color:rgba(218,173,130,.42);background:linear-gradient(135deg,rgba(92,59,40,.72),rgba(18,23,30,.96));color:#fff2e4}
    .aw-searchbar[hidden]{display:none!important}
    .aw-searchbar input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#edf7ff;padding:9px 10px;font-size:13px}
    .aw-searchbar input::placeholder{color:#718ba2}
    .aw-icon-button,.aw-button{border:1px solid #8dc9e83a;border-radius:12px;background:linear-gradient(135deg,#19425a9c,#0a1725);color:#eaf8ff;padding:10px 13px;font-size:10px;font-weight:750;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .aw-icon-button:active,.aw-button:active,.aw-chip:active,.aw-world-card:active{transform:scale(.985)}
    .aw-button.primary{border-color:#7bd7ff80;background:linear-gradient(135deg,#2d8dbc,#1b577c);box-shadow:0 0 18px #3fb6e719}
    .aw-section{margin:0 0 24px}
    .aw-section-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin:0 0 11px}
    .aw-eyebrow{margin:0 0 5px;color:#77c9ef;font-size:8px;font-weight:850;letter-spacing:.17em;text-transform:uppercase}
    .aw-h2{margin:0;color:#eff7ff;font-size:clamp(17px,4.4vw,22px);font-weight:800;letter-spacing:-.02em;line-height:1.18}
    .aw-subtle{margin:7px 0 0;color:#91aabe;font-size:10px;line-height:1.5}
    .aw-inline-link{color:#83d9ff;text-decoration:none;font-size:9px;font-weight:750;white-space:nowrap}
    .aw-news-list{display:grid;gap:12px}
    .aw-news-card{display:flex;min-width:0;flex-direction:column;gap:0;overflow:hidden;border:1px solid #a2cde52b;border-radius:17px;background:linear-gradient(145deg,#0d2131f2,#07121ff0);box-shadow:inset 1px 1px 1px #ffffff08,0 8px 22px #0002}
    .aw-news-media{position:relative;display:block;width:100%;aspect-ratio:16/8;max-height:220px;overflow:hidden;background:#07111b;text-decoration:none}
    .aw-news-media img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform .35s ease}
    .aw-news-media:active img{transform:scale(1.015)}
    .aw-news-image-source{position:absolute;left:9px;bottom:9px;max-width:calc(100% - 18px);padding:5px 8px;border:1px solid #d9edff24;border-radius:8px;background:rgba(2,8,15,.76);color:#e2f1fc;font-size:8px;line-height:1.25;letter-spacing:.025em;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .aw-news-body{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:start;padding:12px 13px 13px}
    .aw-news-copy{min-width:0}
    .aw-news-title{margin:0;color:#f0f7ff;font-size:13px;line-height:1.36;font-weight:760}
    .aw-news-summary{margin:7px 0 0;color:#afc2d2;font-size:10px;line-height:1.5}
    .aw-news-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;color:#7896ac;font-size:8px;letter-spacing:.025em}
    .aw-news-open{display:inline-flex;align-items:center;justify-content:center;border:1px solid #80c6e93a;border-radius:10px;padding:8px 9px;color:#b5e8ff;text-decoration:none;font-size:9px;white-space:nowrap;background:#091c2a}
    .aw-featured{position:relative;overflow:hidden;border:1px solid #8bc9ec2b;border-radius:20px;background:linear-gradient(140deg,#102c40,#07111d);box-shadow:0 14px 30px #0003}
    .aw-featured-media{position:relative;aspect-ratio:16/9;min-height:154px;background:radial-gradient(ellipse at 74% 30%,#24465c,#09131f 65%);overflow:hidden}
    .aw-featured-media img{display:block;width:100%;height:100%;object-fit:cover}
    .aw-image-placeholder{display:flex;min-height:130px;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:18px;text-align:center;color:#8fa9bd;background:radial-gradient(ellipse at 70% 15%,#18364b,#07111d 68%)}
    .aw-image-placeholder .aw-ph-symbol{font-size:27px;opacity:.7}
    .aw-image-placeholder p{max-width:34em;margin:0;font-size:10px;line-height:1.5}
    .aw-featured-body{padding:13px 14px 15px}
    .aw-featured-title{margin:4px 0 7px;font-size:clamp(17px,4.8vw,23px);font-weight:820;line-height:1.14;letter-spacing:-.025em}
    .aw-featured-copy{margin:0;color:#b3c6d6;font-size:11px;line-height:1.58}
    .aw-credit{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:11px;color:#7895aa;font-size:8px;line-height:1.45}
    .aw-credit a{color:#9bddf9;text-decoration:none}
    .aw-category-row{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin:0 0 13px;padding:1px 0 4px}
    .aw-category-row::-webkit-scrollbar{display:none}
    .aw-chip{flex:0 0 auto;border:1px solid #80b6d52a;border-radius:999px;padding:9px 12px;background:#0a1927;color:#8caec5;font-size:9px;font-weight:750;touch-action:manipulation}
    .aw-chip[aria-pressed="true"]{border-color:#74cef984;background:linear-gradient(135deg,#164766,#0c2438);color:#e5f8ff;box-shadow:0 0 15px #39a6db13}
    .aw-world-grid,.aw-photo-grid,.aw-exoplanet-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .aw-world-card{display:flex;min-width:0;flex-direction:column;overflow:hidden;padding:0;text-align:left;border:1px solid #94c9e321;border-radius:16px;background:linear-gradient(155deg,#0d2131,#07111c);color:#eaf5ff;touch-action:manipulation}
    .aw-world-media{aspect-ratio:4/3;background:radial-gradient(ellipse at 68% 20%,#28485e,#07111a 70%);overflow:hidden}
    .aw-world-media img,.aw-photo-media img{width:100%;height:100%;object-fit:cover;display:block}
    .aw-world-copy{padding:10px 10px 11px}
    .aw-world-name{display:block;font-size:12px;font-weight:820;line-height:1.3}
    .aw-world-type{display:block;margin-top:4px;color:#86a5bc;font-size:8px;letter-spacing:.08em;text-transform:uppercase}
    .aw-photo-media{aspect-ratio:4/3;overflow:hidden;background:radial-gradient(ellipse at 66% 20%,#26475a,#06111b 72%)}
    .aw-photo-card{overflow:hidden;min-width:0;border:1px solid #94c9e321;border-radius:15px;background:#091725}
    .aw-photo-copy{padding:10px}
    .aw-photo-title{margin:0;font-size:10px;font-weight:780;line-height:1.4;color:#e9f6ff}
    .aw-photo-meta{margin:5px 0 0;color:#7898af;font-size:8px;line-height:1.45}
    .aw-photo-copy a{display:inline-block;margin-top:8px;color:#8cdfff;font-size:8px;text-decoration:none}
    .aw-status{margin:0;padding:12px 13px;border:1px solid #88bad322;border-radius:13px;background:#091927b8;color:#a6c0d1;font-size:10px;line-height:1.55}
    .aw-status.error{border-color:#e68a8a35;color:#ffc2c2}
    .aw-status.good{border-color:#80dcb532;color:#a5f1d0}
    .aw-action-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
    .aw-world-head{display:flex;align-items:center;gap:9px;margin:0 0 16px}
    .aw-back{border:1px solid #9ccbe32e;border-radius:999px;background:#0a1b2bbd;color:#cdeeff;padding:9px 12px;font-size:10px;font-weight:750}
    .aw-world-hero{overflow:hidden;border:1px solid #9ac5df2c;border-radius:19px;background:#081521}
    .aw-world-hero img{display:block;width:100%;max-height:310px;aspect-ratio:16/9;object-fit:cover;background:#091623}
    .aw-world-intro{padding:14px}
    .aw-world-title{margin:4px 0 8px;font-size:clamp(23px,6vw,31px);letter-spacing:-.035em;line-height:1.08;font-weight:850}
    .aw-world-desc{margin:0;color:#b3c7d7;font-size:11px;line-height:1.6}
    .aw-fact-card{padding:13px;border:1px solid #99c9e121;border-radius:15px;background:linear-gradient(135deg,#0d2030,#08131e)}
    .aw-fact-card p{margin:0;color:#c5d5e1;font-size:11px;line-height:1.6;white-space:pre-wrap}
    .aw-exoplanet-row{padding:12px;border:1px solid #8cc0de24;border-radius:14px;background:#0b1b2a;min-width:0}
    .aw-exoplanet-row h3{margin:0;font-size:11px;line-height:1.35;overflow-wrap:anywhere}
    .aw-exoplanet-row p{margin:7px 0 0;color:#91adc2;font-size:9px;line-height:1.55}
    .aw-exoplanet-row a{display:inline-block;margin-top:9px;color:#8cddff;font-size:8px;text-decoration:none}
    .aw-footer{margin:22px 0 0;padding:14px 0 0;border-top:1px solid #84adc51a;color:#6e8ca2;font-size:8px;line-height:1.55}
    .aw-footer a{color:#9bdcf7;text-decoration:none}
    @media(min-width:700px){.aw-news-list{grid-template-columns:repeat(2,minmax(0,1fr))}.aw-world-grid,.aw-photo-grid,.aw-exoplanet-list{grid-template-columns:repeat(3,minmax(0,1fr))}.aw-featured{display:grid;grid-template-columns:1.1fr 1fr}.aw-featured-media{height:100%;min-height:250px;aspect-ratio:auto}.aw-featured-body{align-self:center;padding:22px}.aw-world-hero{display:grid;grid-template-columns:1.1fr 1fr}.aw-world-hero img{height:100%;max-height:none;min-height:260px;aspect-ratio:auto}.aw-world-intro{align-self:center;padding:24px}}
    @media(orientation:landscape){#${ROOT_ID}{padding-top:calc(env(safe-area-inset-top) + 8px);padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right));padding-bottom:calc(env(safe-area-inset-bottom) + 144px)}#${ROOT_ID}::after{height:calc(env(safe-area-inset-bottom) + 118px)}.aw-topbar{padding-bottom:10px}.aw-section{margin-bottom:19px}.aw-featured-media{min-height:116px}.aw-world-grid,.aw-photo-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.aw-news-media{aspect-ratio:16/7;max-height:190px}}
    @media(prefers-reduced-motion:reduce){#${ROOT_ID} *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }
  function safeUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' ? parsed.href : null;
    } catch (_) { return null; }
  }
  function safeImageUrl(value) {
    // Article providers may still publish legacy http image URLs. Upgrade these
    // to HTTPS for the embedded image request; if that host cannot serve HTTPS,
    // the image's error handler removes it instead of fabricating a fallback.
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'https:') return parsed.href;
      if (parsed.protocol === 'http:') { parsed.protocol = 'https:'; return parsed.href; }
    } catch (_) {}
    return null;
  }
  function formatDate(value) {
    if (!value) return 'Date not supplied';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Date not supplied';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
  }
  function shorten(value, max = 230) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  }
  function htmlToText(value) {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
    doc.querySelectorAll('script,style,noscript,iframe,svg').forEach(el => el.remove());
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function looksIllustrative(text) {
    return /artist[’']?s?\s+(concept|impression|rendering|illustration|depiction|view)|artist concept|illustration|concept art|computer[- ]generated|digital (art|render|illustration)|rendered (view|image|model)|artist.?s rendition|artist.?s view|simulation|simulated view|infographic|diagram|drawing of|painting of|model of the|animation still|graphic depiction|not to scale graphic/i.test(String(text || ''));
  }
  function isCurrent(token) { return state.active && token === state.token && !!state.root; }
  function rootNode() { return state.root; }
  function pageNode() { return state.page; }
  function clearImages() {
    for (const url of state.objectUrls) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    state.objectUrls.clear();
  }
  function abortRequests() {
    for (const controller of state.controllers) {
      try { controller.abort(); } catch (_) {}
    }
    state.controllers.clear();
    clearImages();
  }
  async function request(url, kind = 'json') {
    if (!state.active || navigator.onLine === false) throw new Error('An internet connection is required.');
    const controller = new AbortController();
    state.controllers.add(controller);
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Online source returned ${response.status}.`);
      return kind === 'blob' ? await response.blob() : await response.json();
    } finally {
      window.clearTimeout(timeout);
      state.controllers.delete(controller);
    }
  }
  function allocObjectUrl(blob) {
    const url = URL.createObjectURL(blob);
    state.objectUrls.add(url);
    return url;
  }
  function refreshSourceLinks(container, label, href) {
    const link = node('a', 'aw-inline-link', label);
    const safe = safeUrl(href);
    if (!safe) return null;
    link.href = safe; link.target = '_blank'; link.rel = 'noopener noreferrer';
    container.appendChild(link);
    return link;
  }
  function setStatus(container, message, kind = '') {
    container.replaceChildren();
    const status = node('p', `aw-status${kind ? ` ${kind}` : ''}`, message);
    container.appendChild(status);
  }
  function section(title, eyebrow, description, linkLabel, linkUrl) {
    const wrap = node('section', 'aw-section');
    const head = node('div', 'aw-section-head');
    const left = node('div');
    if (eyebrow) left.appendChild(node('p', 'aw-eyebrow', eyebrow));
    left.appendChild(node('h2', 'aw-h2', title));
    if (description) left.appendChild(node('p', 'aw-subtle', description));
    head.appendChild(left);
    if (linkLabel && linkUrl) refreshSourceLinks(head, linkLabel, linkUrl);
    wrap.appendChild(head);
    return { wrap, body: node('div') };
  }
  function buildHeader() {
    const header = node('header', 'aw-topbar');
    const brand = node('div', 'aw-brand');
    brand.appendChild(node('h1', 'aw-brand-title', 'ALIEN WORLD'));
    brand.appendChild(node('p', 'aw-brand-sub', 'Explore · Discover · Understand'));
    header.append(brand);
    const online = node('span', 'aw-live-pill');
    online.appendChild(node('span', 'aw-live-dot'));
    state.modePillLabel = node('span', '', 'LIVE UPDATES · ONLINE');
    online.appendChild(state.modePillLabel);
    header.appendChild(online);
    return header;
  }
  function buildSearchbar() {
    const form = node('form', 'aw-searchbar');
    const input = node('input');
    input.type = 'search'; input.name = 'q'; input.autocomplete = 'off'; input.spellcheck = false;
    input.placeholder = 'Search planets, moons, galaxies…'; input.setAttribute('aria-label', 'Search the universe');
    input.value = state.searchText;
    const submit = node('button', 'aw-icon-button', 'Search'); submit.type = 'submit';
    form.append(input, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      state.searchText = q;
      navigate({ name: 'search', query: q });
    });
    return form;
  }
  function updateModeUI() {
    const weekly = state.mode === 'weekly';
    if (state.liveModeButton) state.liveModeButton.setAttribute('aria-pressed', String(!weekly));
    if (state.weeklyModeButton) state.weeklyModeButton.setAttribute('aria-pressed', String(weekly));
    if (state.searchbar) state.searchbar.hidden = weekly;
    if (state.modePillLabel) state.modePillLabel.textContent = weekly ? 'LOCAL WEEKLY ARCHIVE' : 'LIVE UPDATES · ONLINE';
  }
  function loadWeeklyScript() {
    if (['v106', 'v107'].includes(window.LiveEarthWeeklyPublish?.version)) return Promise.resolve(window.LiveEarthWeeklyPublish);
    if (state.weeklyScriptPromise) return state.weeklyScriptPromise;
    state.weeklyScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./alien-world-weekly-publish.js', document.baseURI).href;
      script.async = true;
      script.onload = () => {
        if (['v106', 'v107'].includes(window.LiveEarthWeeklyPublish?.version)) resolve(window.LiveEarthWeeklyPublish);
        else reject(new Error('The weekly reader did not initialize correctly.'));
      };
      script.onerror = () => reject(new Error('The small weekly reader could not be loaded. No magazine issue was downloaded.'));
      document.body.appendChild(script);
    }).catch(error => { state.weeklyScriptPromise = null; throw error; });
    return state.weeklyScriptPromise;
  }
  function renderWeeklyView() {
    if (!state.active || state.mode !== 'weekly' || !state.page) return;
    const token = ++state.token;
    state.root?.removeAttribute('data-state');
    state.page.replaceChildren();
    const waiting = node('p', 'aw-status', 'Opening the local Weekly Publish library…');
    state.page.appendChild(waiting);
    loadWeeklyScript().then(api => {
      if (!isCurrent(token) || state.mode !== 'weekly') return;
      return api.render(state.page, {});
    }).catch(error => {
      if (!isCurrent(token) || state.mode !== 'weekly') return;
      state.page.replaceChildren();
      const card = node('section', 'aw-featured-body');
      card.appendChild(node('p', 'aw-eyebrow', 'WEEKLY PUBLISH'));
      card.appendChild(node('h2', 'aw-h2', 'The local library is unavailable'));
      card.appendChild(node('p', 'aw-subtle', `${error?.message || 'The weekly reader could not be opened.'} Live Earth launch and other views remain independent.`));
      const retry = node('button', 'aw-button primary', 'Retry library');
      retry.type = 'button'; retry.addEventListener('click', () => renderWeeklyView());
      card.appendChild(retry); state.page.appendChild(card);
    });
  }
  function enterWeeklyPublish() {
    if (!state.active) return;
    abortRequests();
    state.mode = 'weekly';
    state.route = { name: 'weekly' };
    updateModeUI();
    renderWeeklyView();
    if (state.root) state.root.scrollTo({ top: 0, behavior: 'auto' });
  }
  function enterLiveUpdates() {
    if (!state.active) return;
    abortRequests();
    state.mode = 'live';
    state.route = { name: 'home' };
    updateModeUI();
    renderCurrent();
    if (state.root) state.root.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
  }
  function showOffline() {
    abortRequests();
    if (!state.page || !state.active) return;
    if (state.mode === 'weekly') { renderWeeklyView(); return; }
    state.token++;
    state.page.replaceChildren();
    const card = node('section', 'aw-featured-body');
    card.appendChild(node('p', 'aw-eyebrow', 'LIVE UPDATES · OFFLINE'));
    card.appendChild(node('h2', 'aw-h2', 'Current headlines are unavailable'));
    card.appendChild(node('p', 'aw-subtle', 'Live Updates never shows old headlines as current and makes no network requests while offline. Use the Weekly Publish tab above to read saved Sunday editions.'));
    const button = node('button', 'aw-button primary', 'Try Live Updates again');
    button.type = 'button'; button.addEventListener('click', () => { if (navigator.onLine !== false) renderCurrent(); });
    card.appendChild(button); state.page.appendChild(card);
    state.root.setAttribute('data-state', 'offline');
  }
  function renderShell() {
    const host = document.body;
    if (!host) return false;
    const root = node('div'); root.id = ROOT_ID; root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Alien World space discovery');
    const wrap = node('div', 'aw-wrap');
    wrap.appendChild(buildHeader());
    state.searchbar = buildSearchbar();
    wrap.appendChild(state.searchbar);
    const modes = node('nav', 'aw-modebar');
    modes.setAttribute('aria-label', 'Alien World modes');
    state.liveModeButton = node('button', 'aw-mode-button', 'Live Updates');
    state.liveModeButton.type = 'button'; state.liveModeButton.dataset.mode = 'live';
    state.liveModeButton.addEventListener('click', enterLiveUpdates);
    state.weeklyModeButton = node('button', 'aw-mode-button', 'Weekly Publish');
    state.weeklyModeButton.type = 'button'; state.weeklyModeButton.dataset.mode = 'weekly';
    state.weeklyModeButton.addEventListener('click', enterWeeklyPublish);
    modes.append(state.liveModeButton, state.weeklyModeButton);
    state.modeBar = modes; wrap.appendChild(modes);
    const page = node('main', 'aw-main');
    wrap.appendChild(page);
    const footer = node('footer', 'aw-footer');
    footer.appendChild(document.createTextNode('LIVE UPDATES ARE ONLINE-ONLY · WEEKLY PUBLISH SAVES THE LATEST 3 TEXT EDITIONS LOCALLY. '));
    const nasa = node('a', '', 'NASA Image Library'); nasa.href = 'https://images.nasa.gov/'; nasa.target = '_blank'; nasa.rel = 'noopener noreferrer'; footer.appendChild(nasa);
    footer.appendChild(document.createTextNode(' · '));
    const archive = node('a', '', 'NASA Exoplanet Archive'); archive.href = 'https://exoplanetarchive.ipac.caltech.edu/'; archive.target = '_blank'; archive.rel = 'noopener noreferrer'; footer.appendChild(archive);
    wrap.appendChild(footer); root.appendChild(wrap); host.appendChild(root);
    state.root = root; state.page = page;
    updateModeUI();
    return true;
  }
  function setPageRoute(route) { state.route = route; }
  function navigate(route) {
    if (!state.active) return;
    abortRequests();
    setPageRoute(route);
    state.token++;
    if (navigator.onLine === false) { showOffline(); return; }
    renderCurrent();
    if (state.root) state.root.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
  }
  function appendEmptyState(parent, message, label, href) {
    const box = node('div', 'aw-status'); box.appendChild(node('p', '', message));
    if (label && href) {
      const link = node('a', 'aw-inline-link', label); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; box.appendChild(link);
    }
    parent.appendChild(box); return box;
  }
  function getNewsUrl(search = '') {
    const url = new URL(SPACE_NEWS_API);
    url.searchParams.set('limit', '6');
    url.searchParams.set('ordering', '-published_at');
    if (search) url.searchParams.set('search', search);
    return url.href;
  }
  async function loadNews(container, token, query = '') {
    setStatus(container, 'Loading the latest reports from online space-news sources…');
    try {
      const payload = await request(getNewsUrl(query));
      if (!isCurrent(token)) return;
      const items = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
      const valid = items.filter(item => safeUrl(item.url) && item.title && item.published_at).slice(0, 6);
      container.replaceChildren();
      if (!valid.length) {
        appendEmptyState(container, 'No current articles were returned by the online feed.');
        return;
      }
      valid.forEach(article => {
        const card = node('article', 'aw-news-card');
        const articleUrl = safeUrl(article.url);
        const publisher = String(article.news_site || article.source || 'Space news source');
        // Spaceflight News API's image_url is the cover/header image attached to
        // the publisher's article. Show that exact online image; never generate or
        // invent a replacement. Cross-origin image requests are not handled by the
        // app's same-origin service worker and no app-managed image cache is used.
        const imageUrl = safeImageUrl(article.image_url);
        if (imageUrl && articleUrl) {
          const imageLink = node('a', 'aw-news-media');
          imageLink.href = articleUrl; imageLink.target = '_blank'; imageLink.rel = 'noopener noreferrer';
          imageLink.setAttribute('aria-label', `Open original article: ${article.title}`);
          const img = node('img');
          img.alt = `Image supplied with article: ${article.title}`;
          img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
          img.src = imageUrl;
          img.addEventListener('error', () => imageLink.remove(), { once: true });
          imageLink.appendChild(img);
          imageLink.appendChild(node('span', 'aw-news-image-source', `ARTICLE IMAGE · ${publisher}`));
          card.appendChild(imageLink);
        }
        const body = node('div', 'aw-news-body');
        const copy = node('div', 'aw-news-copy');
        copy.appendChild(node('h3', 'aw-news-title', article.title));
        if (article.summary) copy.appendChild(node('p', 'aw-news-summary', shorten(article.summary, 205)));
        const meta = node('div', 'aw-news-meta');
        meta.appendChild(node('span', '', publisher));
        meta.appendChild(node('span', '', formatDate(article.published_at)));
        if (article.updated_at && article.updated_at !== article.published_at) meta.appendChild(node('span', '', `Updated ${formatDate(article.updated_at)}`));
        copy.appendChild(meta);
        const link = node('a', 'aw-news-open', 'Original ↗'); link.href = articleUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
        body.append(copy, link); card.appendChild(body); container.appendChild(card);
      });
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      setStatus(container, 'The live news feed could not be reached. No saved or outdated stories are shown.', 'error');
      const link = node('a', 'aw-inline-link', 'Open official NASA news ↗'); link.href = NASA_NEWS_URL; link.target = '_blank'; link.rel = 'noopener noreferrer'; container.appendChild(link);
    }
  }
  async function loadApod(container, token) {
    const media = node('div', 'aw-featured-media');
    media.appendChild(node('div', 'aw-image-placeholder', 'Loading today’s NASA astronomy feature…'));
    container.appendChild(media);
    const body = node('div', 'aw-featured-body');
    body.appendChild(node('p', 'aw-eyebrow', 'NASA ASTRONOMY PICTURE OF THE DAY'));
    body.appendChild(node('h3', 'aw-featured-title', 'Loading the featured discovery…'));
    body.appendChild(node('p', 'aw-featured-copy', 'Retrieving today’s entry and its original source details.'));
    container.appendChild(body);
    try {
      const payload = await request(`${NASA_CMS_API}/apod-basic/`);
      if (!isCurrent(token)) return;
      const item = Array.isArray(payload) ? payload[0] : payload?.data && Array.isArray(payload.data) ? payload.data[0] : payload;
      if (!item || !item.title) throw new Error('The NASA daily feature did not return an entry.');
      const title = String(item.title);
      const explanation = String(item.explanation || item.description || item.excerpt?.rendered || 'Open NASA’s original entry for the full explanation.');
      const sourcePage = safeUrl(item.permalink || item.link || item.url) || 'https://science.nasa.gov/solar-system/';
      body.querySelector('.aw-featured-title').textContent = title;
      body.querySelector('.aw-featured-copy').textContent = shorten(explanation, 520);
      const copy = body.querySelector('.aw-featured-copy');
      if (item.media_type !== 'video' && !looksIllustrative(`${title} ${explanation} ${item.credit || ''} ${item.copyright || ''}`)) {
        const imageUrl = safeUrl(item.hdurl || item.image_url || item.image);
        if (imageUrl) {
          try {
            const blob = await request(imageUrl, 'blob');
            if (!isCurrent(token)) return;
            const objectUrl = allocObjectUrl(blob);
            const img = node('img'); img.alt = `${title} — NASA Astronomy Picture of the Day`; img.loading = 'eager'; img.decoding = 'async'; img.src = objectUrl;
            media.replaceChildren(img);
          } catch (_) {
            if (isCurrent(token)) {
              media.replaceChildren();
              media.appendChild(node('div', 'aw-image-placeholder', 'This photograph is not available directly right now. Open the original NASA record to view it online.'));
            }
          }
        } else {
          media.replaceChildren();
          media.appendChild(node('div', 'aw-image-placeholder', 'This NASA entry does not supply a direct photograph, so none is substituted.'));
        }
      } else {
        media.replaceChildren();
        media.appendChild(node('div', 'aw-image-placeholder', 'This daily feature is not clearly identified as a real photograph, so we are not displaying it as one.'));
      }
      const credit = node('div', 'aw-credit');
      const left = node('span', '', `${formatDate(item.date || item.date_created)} · NASA APOD${item.credit || item.copyright ? ` · Credit: ${item.credit || item.copyright}` : ''}`);
      credit.appendChild(left);
      const link = node('a', '', 'Original entry ↗'); link.href = sourcePage; link.target = '_blank'; link.rel = 'noopener noreferrer'; credit.appendChild(link);
      body.appendChild(credit);
      // Keep keyboard/screen-reader semantics explicit without any animation loop.
      media.setAttribute('role', 'img'); media.setAttribute('aria-label', `NASA daily astronomy feature: ${title}`);
      if (copy) copy.setAttribute('data-content-source', 'NASA APOD');
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      media.replaceChildren(); media.appendChild(node('div', 'aw-image-placeholder', 'NASA’s current daily feature is temporarily unavailable online. No older image is substituted.'));
      body.querySelector('.aw-featured-title').textContent = 'Featured discovery unavailable';
      body.querySelector('.aw-featured-copy').textContent = 'Reconnect or visit NASA’s official Solar System pages to keep exploring.';
      const link = node('a', 'aw-inline-link', 'Visit NASA Science ↗'); link.href = 'https://science.nasa.gov/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; body.appendChild(link);
    }
  }
  function nasaSearchUrl(query) {
    const url = new URL(NASA_IMAGES_API);
    url.searchParams.set('q', query);
    url.searchParams.set('media_type', 'image');
    url.searchParams.set('page_size', '30');
    return url.href;
  }
  async function findRealNasaImages(query, signalToken) {
    const payload = await request(nasaSearchUrl(query));
    if (!isCurrent(signalToken)) return [];
    const items = payload?.collection?.items || [];
    return items.map(item => {
      const meta = Array.isArray(item.data) ? item.data[0] : null;
      const links = Array.isArray(item.links) ? item.links : [];
      const imageLink = links.find(link => link.render === 'image' && (link.rel === 'preview' || link.href)) || links.find(link => link.render === 'image');
      const href = safeUrl(imageLink?.href);
      return { meta, imageUrl: href, sourceUrl: meta?.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id)}` : null };
    }).filter(item => {
      if (!item.meta || item.meta.media_type !== 'image' || !item.imageUrl || !item.sourceUrl || !item.meta.title) return false;
      const metadata = `${item.meta.title} ${item.meta.description || ''} ${(item.meta.keywords || []).join(' ')} ${item.meta.center || ''} ${item.meta.photographer || ''}`;
      return !looksIllustrative(metadata);
    }).sort((a, b) => new Date(b.meta.date_created || 0) - new Date(a.meta.date_created || 0));
  }
  function photoCard(item, token) {
    const card = node('article', 'aw-photo-card');
    const media = node('div', 'aw-photo-media');
    media.appendChild(node('div', 'aw-image-placeholder', 'Loading source image…'));
    const copy = node('div', 'aw-photo-copy');
    copy.appendChild(node('h3', 'aw-photo-title', item.meta.title));
    const detailBits = [item.meta.center, formatDate(item.meta.date_created), item.meta.photographer ? `Photo: ${item.meta.photographer}` : 'NASA image record'].filter(Boolean);
    copy.appendChild(node('p', 'aw-photo-meta', detailBits.join(' · ')));
    const link = node('a', '', 'View NASA source record ↗'); link.href = item.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; copy.appendChild(link);
    card.append(media, copy);
    request(item.imageUrl, 'blob').then(blob => {
      if (!isCurrent(token) || !card.isConnected) return;
      const objectUrl = allocObjectUrl(blob);
      const img = node('img'); img.alt = item.meta.title; img.loading = 'lazy'; img.decoding = 'async'; img.src = objectUrl;
      media.replaceChildren(img);
    }).catch(error => {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      media.replaceChildren();
      media.appendChild(node('div', 'aw-image-placeholder', 'Photograph not available directly. The original NASA record remains available below.'));
    });
    return card;
  }
  async function loadPhotoGrid(container, token, query, max = PAGE_SIZE) {
    setStatus(container, 'Loading photographs directly from NASA’s online image library…');
    try {
      const results = await findRealNasaImages(query, token);
      if (!isCurrent(token)) return;
      container.replaceChildren();
      const selected = results.slice(0, max);
      if (!selected.length) {
        appendEmptyState(container, 'No clearly photographic image passed the source metadata checks for this query. We will not replace it with an illustration.', 'Search NASA Image Library ↗', 'https://images.nasa.gov/');
        return;
      }
      container.classList.add('aw-photo-grid');
      selected.forEach(item => container.appendChild(photoCard(item, token)));
      const note = node('p', 'aw-subtle', 'Only NASA image records without explicit artist-concept or illustration labels are shown. Open each source record for its full metadata and credit.');
      container.appendChild(note);
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      setStatus(container, 'NASA’s image service could not be reached. No saved images or substitute artwork are shown.', 'error');
      const link = node('a', 'aw-inline-link', 'Open NASA Image Library ↗'); link.href = 'https://images.nasa.gov/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; container.appendChild(link);
    }
  }
  function categoryButton(label, value) {
    const button = node('button', 'aw-chip', label); button.type = 'button'; button.setAttribute('aria-pressed', String(state.category === value));
    button.addEventListener('click', () => {
      state.category = value; state.worldOffset = 0;
      navigate({ name: value === 'exoplanets' ? 'exoplanets' : 'browse', category: value });
    });
    return button;
  }
  function worldCard(world, token) {
    const card = node('button', 'aw-world-card'); card.type = 'button'; card.setAttribute('aria-label', `Open ${world.name} details`);
    const media = node('div', 'aw-world-media');
    media.appendChild(node('div', 'aw-image-placeholder', 'Loading real source image…'));
    const copy = node('div', 'aw-world-copy');
    copy.appendChild(node('span', 'aw-world-name', world.name));
    copy.appendChild(node('span', 'aw-world-type', world.type));
    card.append(media, copy);
    card.addEventListener('click', () => navigate({ name: 'world', world }));
    findRealNasaImages(world.query, token).then(items => {
      if (!isCurrent(token) || !card.isConnected) return;
      const item = items[0];
      if (!item) {
        media.replaceChildren(); media.appendChild(node('div', 'aw-image-placeholder', 'No clearly photographic image available from this search.'));
        return;
      }
      return request(item.imageUrl, 'blob').then(blob => {
        if (!isCurrent(token) || !card.isConnected) return;
        const objectUrl = allocObjectUrl(blob);
        const img = node('img'); img.src = objectUrl; img.alt = `${world.name}: ${item.meta.title}`; img.loading = 'lazy'; img.decoding = 'async';
        media.replaceChildren(img);
      });
    }).catch(error => {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      media.replaceChildren(); media.appendChild(node('div', 'aw-image-placeholder', 'Image unavailable online.'));
    });
    return card;
  }
  function createWorldExplorer(container, token, category = 'planets') {
    const heading = section('Explore the universe', 'WORLD DIRECTORY', 'Open a world to read its current online overview, view real mission imagery and follow related discoveries.', 'NASA Science ↗', 'https://science.nasa.gov/');
    const chips = node('div', 'aw-category-row');
    chips.append(categoryButton('Planets', 'planets'), categoryButton('Moons', 'moons'), categoryButton('Galaxies & nebulae', 'deepSpace'), categoryButton('Exoplanets', 'exoplanets'));
    heading.wrap.appendChild(chips);
    const grid = node('div', 'aw-world-grid');
    heading.wrap.appendChild(grid);
    container.appendChild(heading.wrap);
    const worlds = WORLD_GROUPS[category]?.items || WORLD_GROUPS.planets.items;
    const start = state.worldOffset || 0;
    const slice = worlds.slice(start, start + PAGE_SIZE);
    slice.forEach(world => grid.appendChild(worldCard(world, token)));
    if (start + PAGE_SIZE < worlds.length) {
      const moreRow = node('div', 'aw-action-row');
      const more = node('button', 'aw-button', 'Next worlds'); more.type = 'button';
      more.addEventListener('click', () => { state.worldOffset += PAGE_SIZE; navigate({ name: 'browse', category }); });
      moreRow.appendChild(more); heading.wrap.appendChild(moreRow);
    }
  }
  async function loadPlanetOverview(world, container, token) {
    setStatus(container, 'Requesting the current NASA world overview…');
    try {
      let payload = await request(`${NASA_CMS_API}/pages?slug=${encodeURIComponent(world.slug || world.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}&per_page=1&_fields=slug,title,link,modified,excerpt,content`);
      if (!isCurrent(token)) return;
      let page = Array.isArray(payload) ? payload[0] : null;
      if (!page) {
        const fallback = new URL(`${NASA_CMS_API}/search`);
        fallback.searchParams.set('search', world.name); fallback.searchParams.set('per_page', '5'); fallback.searchParams.set('_fields', 'title,url,type,subtype,id');
        const records = await request(fallback.href);
        if (!isCurrent(token)) return;
        page = Array.isArray(records) ? records.find(item => safeUrl(item.url) && new URL(item.url).hostname.endsWith('nasa.gov')) : null;
        if (page) {
          const box = node('div', 'aw-fact-card');
          box.appendChild(node('p', '', `NASA’s online search returned an official resource for ${world.name}. Open it for the complete scientific description and current mission information.`));
          const link = node('a', 'aw-inline-link', `Open ${htmlToText(page.title?.rendered || page.title || world.name)} at NASA ↗`); link.href = safeUrl(page.url); link.target = '_blank'; link.rel = 'noopener noreferrer'; box.appendChild(link);
          container.replaceChildren(box); return;
        }
      }
      if (!page) throw new Error('No matching NASA page was returned.');
      const title = htmlToText(page.title?.rendered || page.title || world.name);
      const excerpt = htmlToText(page.excerpt?.rendered || '');
      const content = htmlToText(page.content?.rendered || '');
      const summary = shorten(excerpt || content, 950);
      const box = node('div', 'aw-fact-card');
      box.appendChild(node('p', '', summary || 'NASA returned a page record but no readable overview. Open the source page for the full information.'));
      if (page.modified) box.appendChild(node('p', 'aw-photo-meta', `NASA page updated ${formatDate(page.modified)}`));
      const link = node('a', 'aw-inline-link', `Read the full ${title} page at NASA ↗`); link.href = safeUrl(page.link) || world.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; box.appendChild(link);
      container.replaceChildren(box);
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      container.replaceChildren();
      appendEmptyState(container, 'The online overview could not be loaded. We will not fill this page with unsourced facts.', 'Open official source ↗', world.url || 'https://science.nasa.gov/');
    }
  }
  async function loadExoplanets(container, token) {
    setStatus(container, 'Querying the NASA Exoplanet Archive for confirmed-planet records…');
    try {
      const query = 'select top 16 pl_name,hostname,disc_year,sy_dist,pl_rade,pl_orbper from ps where pl_name is not null order by disc_year desc';
      const url = new URL(EXOPLANET_ARCHIVE_API); url.searchParams.set('query', query); url.searchParams.set('format', 'json');
      const data = await request(url.href);
      if (!isCurrent(token)) return;
      const records = Array.isArray(data) ? data.filter(item => item.pl_name) : [];
      container.replaceChildren();
      if (!records.length) { appendEmptyState(container, 'The archive returned no confirmed exoplanet records.'); return; }
      const grid = node('div', 'aw-exoplanet-list');
      records.forEach(item => {
        const card = node('article', 'aw-exoplanet-row');
        card.appendChild(node('h3', '', item.pl_name));
        const facts = [];
        if (item.hostname) facts.push(`Host star: ${item.hostname}`);
        if (item.disc_year) facts.push(`Discovery year: ${item.disc_year}`);
        if (Number.isFinite(Number(item.sy_dist))) facts.push(`Distance: ${Number(item.sy_dist).toLocaleString(undefined, {maximumFractionDigits:2})} parsecs`);
        if (Number.isFinite(Number(item.pl_rade))) facts.push(`Radius: ${Number(item.pl_rade).toLocaleString(undefined, {maximumFractionDigits:2})} Earth radii`);
        if (Number.isFinite(Number(item.pl_orbper))) facts.push(`Orbital period: ${Number(item.pl_orbper).toLocaleString(undefined, {maximumFractionDigits:2})} days`);
        card.appendChild(node('p', '', facts.join('\n') || 'Open the archive record for the current available measurements.'));
        const link = node('a', '', 'Open archive ↗'); link.href = 'https://exoplanetarchive.ipac.caltech.edu/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; card.appendChild(link);
        grid.appendChild(card);
      });
      container.appendChild(grid);
      container.appendChild(node('p', 'aw-subtle', 'Exoplanets are presented as catalogued data. No fictional surface photographs or artist concepts are shown as real images.'));
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      setStatus(container, 'NASA’s Exoplanet Archive could not be reached. No saved catalogue is shown.', 'error');
      const link = node('a', 'aw-inline-link', 'Open NASA Exoplanet Archive ↗'); link.href = 'https://exoplanetarchive.ipac.caltech.edu/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; container.appendChild(link);
    }
  }
  function renderHome(token) {
    const newsSection = section('What’s happening in space?', 'LATEST SPACE NEWS', 'Recent reports with publication dates, the reporting outlet and a link to the original article.', 'NASA News ↗', NASA_NEWS_URL);
    newsSection.body.className = 'aw-news-list'; setStatus(newsSection.body, 'Loading the latest online reports…'); newsSection.wrap.appendChild(newsSection.body); state.page.appendChild(newsSection.wrap);
    loadNews(newsSection.body, token);

    const featureSection = section('Featured discovery', 'A VIEW INTO THE UNIVERSE', 'A daily astronomy feature, with its original NASA credit and source record. Only clearly photographic entries are displayed as images.');
    const feature = node('div', 'aw-featured'); featureSection.wrap.appendChild(feature); state.page.appendChild(featureSection.wrap);
    loadApod(feature, token);

    createWorldExplorer(state.page, token, state.category);
  }
  function renderBrowse(token, category) {
    if (category === 'exoplanets') {
      const heading = section('Confirmed exoplanets', 'NASA EXOPLANET ARCHIVE', 'Explore catalogued planets around other stars through measured and reported data—not invented surface images.', 'Open archive ↗', 'https://exoplanetarchive.ipac.caltech.edu/');
      const list = node('div'); heading.wrap.appendChild(list); state.page.appendChild(heading.wrap); loadExoplanets(list, token); return;
    }
    createWorldExplorer(state.page, token, category);
  }
  async function loadWorldHero(world, media, token, creditHost) {
    try {
      const results = await findRealNasaImages(world.query, token);
      if (!isCurrent(token)) return;
      const item = results[0];
      if (!item) {
        media.replaceChildren();
        media.appendChild(node('div', 'aw-image-placeholder', 'No clearly photographic image passed the source metadata checks. We will not substitute artwork.'));
        return;
      }
      try {
        const blob = await request(item.imageUrl, 'blob');
        if (!isCurrent(token)) return;
        const objectUrl = allocObjectUrl(blob);
        const img = node('img'); img.alt = `${world.name}: ${item.meta.title}`; img.loading = 'eager'; img.decoding = 'async'; img.src = objectUrl;
        media.replaceChildren(img);
        const credit = node('p', 'aw-photo-meta', `NASA image record · ${formatDate(item.meta.date_created)}${item.meta.center ? ` · ${item.meta.center}` : ''}`);
        const sourceLink = node('a', 'aw-inline-link', 'Open original image record ↗'); sourceLink.href = item.sourceUrl; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
        creditHost.append(credit, sourceLink);
      } catch (error) {
        if (!isCurrent(token) || error?.name === 'AbortError') return;
        media.replaceChildren(); media.appendChild(node('div', 'aw-image-placeholder', 'The source image is not available directly right now. Open the official NASA record to view it online.'));
      }
    } catch (error) {
      if (!isCurrent(token) || error?.name === 'AbortError') return;
      media.replaceChildren(); media.appendChild(node('div', 'aw-image-placeholder', 'NASA’s online image library could not be reached. No saved image or substitute artwork is shown.'));
    }
  }
  async function renderWorld(token, world) {
    const backRow = node('div', 'aw-world-head');
    const back = node('button', 'aw-back', '← Explore'); back.type = 'button'; back.addEventListener('click', () => navigate({ name: 'home' }));
    backRow.appendChild(back); backRow.appendChild(node('p', 'aw-eyebrow', world.type || 'WORLD PROFILE'));
    state.page.appendChild(backRow);

    const hero = node('section', 'aw-world-hero');
    const media = node('div', 'aw-featured-media'); media.appendChild(node('div', 'aw-image-placeholder', 'Searching the NASA image library for source photographs…'));
    const intro = node('div', 'aw-world-intro');
    intro.appendChild(node('p', 'aw-eyebrow', 'WORLD PROFILE · ONLINE SOURCES'));
    intro.appendChild(node('h2', 'aw-world-title', world.name));
    intro.appendChild(node('p', 'aw-world-desc', 'Photographs, descriptions and related discoveries are requested from their original sources when you open this page.'));
    const source = node('a', 'aw-inline-link', 'Official science source ↗'); source.href = world.url || 'https://science.nasa.gov/'; source.target = '_blank'; source.rel = 'noopener noreferrer'; intro.appendChild(source);
    hero.append(media, intro); state.page.appendChild(hero);
    loadWorldHero(world, media, token, intro);

    const overviewSection = section('World overview', 'SCIENTIFIC INFORMATION', 'Loaded from NASA’s current online page record. If the source cannot be reached, we show no substitute facts.');
    const overviewBody = node('div'); overviewSection.wrap.appendChild(overviewBody); state.page.appendChild(overviewSection.wrap);
    loadPlanetOverview(world, overviewBody, token);

    const imagesSection = section('Photographs & observations', 'ORIGINAL SOURCE IMAGERY', 'Only source records without explicit artist-concept or illustration labels are shown. Every item links to its NASA image record.');
    const photoGrid = node('div', 'aw-photo-grid'); imagesSection.wrap.appendChild(photoGrid); state.page.appendChild(imagesSection.wrap);
    loadPhotoGrid(photoGrid, token, world.query, 4);

    const newsSection = section(`Latest updates about ${world.name}`, 'RELATED SPACE NEWS', 'Fresh article records are loaded online; open the original publisher for the full story.', 'NASA News ↗', NASA_NEWS_URL);
    const news = node('div', 'aw-news-list'); setStatus(news, 'Loading related online reports…'); newsSection.wrap.appendChild(news); state.page.appendChild(newsSection.wrap);
    loadNews(news, token, world.name);
  }
  function renderSearch(token, query) {
    const heading = section(`Search results for “${query}”`, 'NASA IMAGE LIBRARY', 'Searches current online NASA media metadata. Explicit artist concepts and illustrations are excluded from photo cards.');
    const results = node('div', 'aw-photo-grid'); heading.wrap.appendChild(results); state.page.appendChild(heading.wrap);
    loadPhotoGrid(results, token, query, 12);
  }
  function renderCurrent() {
    if (!state.active || !state.page) return;
    if (state.mode === 'weekly') { renderWeeklyView(); return; }
    if (navigator.onLine === false) { showOffline(); return; }
    abortRequests();
    const token = ++state.token;
    state.page.replaceChildren(); state.root?.removeAttribute('data-state');
    if (state.route.name === 'home') renderHome(token);
    else if (state.route.name === 'browse') renderBrowse(token, state.route.category || state.category);
    else if (state.route.name === 'exoplanets') renderBrowse(token, 'exoplanets');
    else if (state.route.name === 'world') void renderWorld(token, state.route.world);
    else if (state.route.name === 'search') renderSearch(token, state.route.query || state.searchText);
    else renderHome(token);
  }
  function activate() {
    if (state.active) return;
    // Stacks features get their own full-screen stage plus the shared three-Orb dock.
    // Do not register Alien World with LiveEarthViewManager (Home/Earth/Moon/Sun).
    state.stage = document.getElementById('le-feature-stage');
    if (!state.stage || window.LiveEarthFeatureViews?.getActive?.() !== FEATURE_ID) return;
    state.stageCard = state.stage.querySelector('.le-feature-stage-card');
    if (state.stageCard) state.stageCard.hidden = true;
    if (!document.getElementById(STYLE_ID)) {
      const style = node('style'); style.id = STYLE_ID; style.textContent = CSS; document.head.appendChild(style);
    }
    state.active = true;
    if (!renderShell()) { state.active = false; if (state.stageCard) state.stageCard.hidden = false; return; }
    state.route = { name: 'home' };
    state.category = 'planets'; state.worldOffset = 0;
    state.mode = 'live';
    state.offlineHandler = () => { if (state.active) showOffline(); };
    state.onlineHandler = () => { if (state.active) renderCurrent(); };
    window.addEventListener('offline', state.offlineHandler);
    window.addEventListener('online', state.onlineHandler);
    if (navigator.onLine === false) showOffline(); else renderCurrent();
  }
  function deactivate() {
    state.active = false; state.token++;
    abortRequests();
    if (state.offlineHandler) window.removeEventListener('offline', state.offlineHandler);
    if (state.onlineHandler) window.removeEventListener('online', state.onlineHandler);
    state.offlineHandler = state.onlineHandler = null;
    if (state.root) state.root.remove();
    if (state.stageCard) state.stageCard.hidden = false;
    state.root = null; state.page = null; state.stage = null; state.stageCard = null;
    state.modeBar = null; state.liveModeButton = null; state.weeklyModeButton = null; state.searchbar = null; state.modePillLabel = null;
    state.route = { name: 'home' }; state.mode = 'live'; state.searchText = ''; state.worldOffset = 0;
  }
  function install() {
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return false;
    api.register(FEATURE_ID, {
      title: 'Alien World', shortLabel: 'Alien World', symbol: '🪐',
      description: 'Explore real-source astronomy online, or read your saved Sunday editions offline with Weekly Publish.',
      connected: true, activate, deactivate
    });
    state.featureRegistrationInstalled = true;
    window.__liveEarthAlienWorldDiscoveryInstalled = true;
    return true;
  }
  if (!install()) {
    window.addEventListener('live-earth-feature-views-ready', install, { once: true });
    window.addEventListener('load', install, { once: true });
    document.addEventListener('DOMContentLoaded', install, { once: true });
  }
})();
