/* LIVE // EARTH — ALIEN WORLD V100: cinematic 2.5D material and lighting upgrade.
   All game visuals are drawn procedurally on Canvas 2D using perspective projection,
   lighting gradients and reusable mathematical shapes. No external assets, network,
   geolocation, accounts or cloud services. The universe map is illustrative, not to scale;
   destination facts are kept separate from generated game-space coordinates. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldGameInstalled) return;
  window.__liveEarthAlienWorldGameInstalled = true;

  const FEATURE_ID = 'alien-world';
  const VERSION = 'v100-cinematic-material-upgrade';
  const STYLE_ID = 'le-alien-world-game-style';
  const SAVE_KEY = 'liveEarthAlienWorldProgress';
  const DESTINATIONS = [
    { id: 'moon', name: 'Moon', kind: 'Natural satellite', symbol: '☾', map: { x: 1.00, y: -.52, z: .10 }, palette: ['#f5f2e9','#a9afb9','#4a5260','#111827'], route: 'ROUTE 01', averageDistance: 'About 384,400 km from Earth on average', fact: 'Earth’s natural satellite has about one-sixth of Earth’s surface gravity and almost no atmosphere.', surface: 'Grey regolith, impact craters, ridges and long shadows.', facts: [['GRAVITY','About 1/6 of Earth’s surface gravity'],['ATMOSPHERE','Almost no atmosphere'],['SURFACE','Rocky regolith and impact craters'],['DISCOVERY','Its craters preserve a long record of impacts']], seed: 1001, seconds: 27 },
    { id: 'mars', name: 'Mars', kind: 'Terrestrial planet', symbol: '♂', map: { x: 1.42, y: -.92, z: .60 }, palette: ['#ffd1a0','#c46d4b','#71352f','#210f18'], route: 'ROUTE 02', averageDistance: 'Earth–Mars distance varies with their orbits', fact: 'Mars is a cold, rocky world with a thin atmosphere composed mostly of carbon dioxide.', surface: 'Rust-red dust, rocky slopes, distant ridgelines and a peach sky.', facts: [['GRAVITY','About 38% of Earth’s surface gravity'],['ATMOSPHERE','Thin; mostly carbon dioxide'],['SURFACE','Rock, dust and iron-rich material'],['EXPLORATION','Robotic orbiters, landers and rovers']], seed: 2003, seconds: 34 },
    { id: 'europa', name: 'Europa', kind: 'Moon of Jupiter', symbol: '✦', map: { x: .26, y: .82, z: 1.05 }, palette: ['#f1e9d6','#b7c9d6','#5a7892','#101e36'], route: 'ROUTE 03', averageDistance: 'Destination in the Jupiter system', fact: 'Europa is covered by an icy shell; evidence suggests a salty ocean may lie beneath it.', surface: 'Pale ice, long reddish fracture lines and a dark, distant sky.', facts: [['WORLD TYPE','Icy moon of Jupiter'],['SURFACE','Water ice with long fractures'],['OCEAN','A subsurface ocean is strongly suspected'],['EXPLORATION','A major target for future ocean-world science']], seed: 3001, seconds: 39 },
    { id: 'titan', name: 'Titan', kind: 'Moon of Saturn', symbol: '◉', map: { x: 1.20, y: .35, z: 1.60 }, palette: ['#ffd99a','#bc864d','#70462f','#211722'], route: 'ROUTE 04', averageDistance: 'Destination in the Saturn system', fact: 'Titan has a dense nitrogen-rich atmosphere and lakes and seas of liquid methane and ethane.', surface: 'Amber haze, dark dunes and a softly glowing orange horizon.', facts: [['WORLD TYPE','Largest moon of Saturn'],['ATMOSPHERE','Dense and nitrogen-rich'],['SURFACE LIQUIDS','Methane and ethane lakes'],['EXPLORATION','A remarkable world for studying prebiotic chemistry']], seed: 4001, seconds: 43 }
  ];

  let root = null, canvas = null, context = null, stage = null, stageCard = null, ui = null;
  let active = false, frameId = 0, lastFrame = 0, resizeHandler = null, keyDownHandler = null, keyUpHandler = null;
  let dpr = 1, state = null, stars = [], random = Math.random, seed = 1, spawnClock = 0, pointerDown = false;
  let savedProgress = { visited: [], successfulMissions: 0, launches: 0 };
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const selectedDestination = () => DESTINATIONS.find(d => d.id === state?.selectedId) || DESTINATIONS[0];

  const STYLE = `
    #le-feature-stage.le-aw-active{display:block!important;overflow:hidden!important;padding:0!important;touch-action:none;background:#020711!important}
    #le-feature-stage .le-feature-stage-card[hidden]{display:none!important}
    .le-aw-root{position:absolute;inset:0;z-index:7;color:#eef7ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;overflow:hidden;background:#020711}
    .le-aw-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:auto;touch-action:none}
    .le-aw-top{position:absolute;z-index:2;left:clamp(12px,4vw,20px);right:clamp(12px,4vw,20px);top:calc(env(safe-area-inset-top) + 12px);display:flex;align-items:flex-start;justify-content:space-between;gap:10px;pointer-events:none}
    .le-aw-brand{font-size:10px;font-weight:900;letter-spacing:.2em;color:#e1f2ff;text-shadow:0 2px 12px #000}
    .le-aw-route{margin-top:5px;color:#a6c2d8;font-size:9px;letter-spacing:.1em;text-shadow:0 2px 10px #000}
    .le-aw-hud{min-width:104px;padding:8px 10px;border:1px solid #9cd8ff38;border-radius:14px;background:#04101dc9;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 1px 1px 1px #ffffff14,0 8px 24px #0005;text-align:right}
    .le-aw-hud-label{display:block;color:#8eb3cf;font-size:8px;letter-spacing:.12em;text-transform:uppercase}
    .le-aw-hud-value{display:block;margin-top:3px;font-size:13px;font-weight:850;letter-spacing:.04em}
    .le-aw-progress{height:3px;margin-top:7px;overflow:hidden;border-radius:9px;background:#ffffff16}
    .le-aw-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#70d7ff,#d6fbff);box-shadow:0 0 12px #66d8ff9c;transition:width .16s linear}
    .le-aw-bottom-note{position:absolute;z-index:2;left:50%;bottom:calc(env(safe-area-inset-bottom) + 118px);transform:translateX(-50%);max-width:88vw;padding:8px 11px;border:1px solid #a6d8ff24;border-radius:999px;background:#04101dba;color:#c4dced;font-size:9px;letter-spacing:.045em;text-align:center;white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:none;text-shadow:0 1px 6px #000}
    .le-aw-root.le-aw-surface-mode .le-aw-bottom-note{bottom:calc(env(safe-area-inset-bottom) + 174px)}
    .le-aw-panel-wrap{position:absolute;z-index:4;inset:0;display:grid;place-items:center;padding:calc(env(safe-area-inset-top) + 58px) 14px calc(env(safe-area-inset-bottom) + 124px);pointer-events:none}
    .le-aw-panel{width:min(90vw,440px);max-height:100%;overflow:auto;padding:clamp(16px,4.5vw,24px);border:1px solid #b5ddff40;border-radius:24px;background:linear-gradient(150deg,#071a2bf0,#030812f2);box-shadow:inset 1px 1px 2px #ffffff18,0 18px 52px #0009,0 0 34px #66baff12;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);text-align:center;pointer-events:auto;overscroll-behavior:contain;scrollbar-width:none}
    .le-aw-panel::-webkit-scrollbar{display:none}
    .le-aw-root.le-aw-map-mode .le-aw-panel-wrap{place-items:end center;padding:calc(env(safe-area-inset-top) + 32px) 12px calc(env(safe-area-inset-bottom) + 124px)}
    .le-aw-root.le-aw-map-mode .le-aw-panel{max-height:min(43vh,390px);padding:12px 13px;border-color:#9bdfff48;background:linear-gradient(155deg,rgba(4,15,28,.91),rgba(2,7,16,.94));box-shadow:inset 1px 1px 2px #ffffff17,0 10px 34px #0008,0 0 26px #62c9ff13}
    .le-aw-root.le-aw-map-mode .le-aw-emblem{font-size:22px}
    .le-aw-root.le-aw-map-mode .le-aw-eyebrow{margin-top:3px;font-size:7px}
    .le-aw-root.le-aw-map-mode .le-aw-title{margin:4px 0;font-size:clamp(18px,4.8vw,22px)}
    .le-aw-root.le-aw-map-mode .le-aw-copy{font-size:9px;line-height:1.28;max-width:42em}
    .le-aw-root.le-aw-map-mode .le-aw-destinations{gap:6px;margin-top:8px}
    .le-aw-root.le-aw-map-mode .le-aw-destination{min-height:58px;padding:8px 9px;border-radius:11px}
    .le-aw-root.le-aw-map-mode .le-aw-destination-name{font-size:12px}
    .le-aw-root.le-aw-map-mode .le-aw-destination-type{font-size:8px;margin-top:2px}
    .le-aw-root.le-aw-map-mode .le-aw-destination-fact{font-size:8px;line-height:1.2;margin-top:4px}
    .le-aw-root.le-aw-map-mode .le-aw-actions{margin-top:9px}
    .le-aw-root.le-aw-map-mode .le-aw-button{min-height:34px;padding:8px 12px;font-size:8px}
    @media(orientation:landscape){.le-aw-root.le-aw-map-mode .le-aw-panel-wrap{inset:0 10px 0 auto;width:min(53vw,470px);display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 16px) 0 calc(env(safe-area-inset-bottom) + 62px)}.le-aw-root.le-aw-map-mode .le-aw-panel{max-height:82vh;width:100%;padding:12px}.le-aw-root.le-aw-map-mode .le-aw-destinations{grid-template-columns:repeat(2,minmax(0,1fr))}.le-aw-root.le-aw-map-mode .le-aw-destination{min-height:56px}.le-aw-root.le-aw-map-mode .le-aw-destination-fact{display:none}}
    @media(orientation:landscape){.le-aw-root.le-aw-surface-mode .le-aw-bottom-note{top:calc(env(safe-area-inset-top) + 54px);bottom:auto;max-width:55vw;white-space:normal}.le-aw-root.le-aw-surface-mode .le-aw-surface-controls{left:auto;right:calc(env(safe-area-inset-right) + 14px);bottom:calc(env(safe-area-inset-bottom) + 68px);transform:none;display:grid;grid-template-columns:1fr;width:82px;gap:6px}.le-aw-root.le-aw-surface-mode .le-aw-surface-controls .le-aw-button{min-width:0;width:82px;padding:8px 5px;font-size:8px}}
    .le-aw-emblem{font-size:clamp(34px,9vw,46px);line-height:1.1;filter:drop-shadow(0 0 14px #85d8ff35)}
    .le-aw-eyebrow{margin-top:7px;color:#7edbff;font-size:8px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
    .le-aw-title{margin:8px 0 7px;font-size:clamp(22px,5.8vw,30px);font-weight:850;letter-spacing:-.025em;line-height:1.08}
    .le-aw-copy{margin:0 auto;color:#b7cddd;font-size:11px;line-height:1.55;max-width:36em}
    .le-aw-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:14px 0 0;text-align:left}
    .le-aw-fact{min-width:0;padding:10px;border:1px solid #a4d5ff20;border-radius:13px;background:linear-gradient(145deg,#ffffff0a,#ffffff04)}
    .le-aw-fact strong{display:block;color:#dff4ff;font-size:9px;letter-spacing:.055em;text-transform:uppercase}
    .le-aw-fact span{display:block;margin-top:4px;color:#abc3d6;font-size:10px;line-height:1.4;overflow-wrap:anywhere}
    .le-aw-destinations{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px;text-align:left}
    .le-aw-destination{position:relative;min-width:0;min-height:94px;padding:11px;border:1px solid #9ccffb25;border-radius:15px;background:linear-gradient(145deg,#102a42d9,#06111fe8);color:#eff9ff;text-align:left;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .le-aw-destination[aria-pressed="true"]{border-color:#8be4ffb3;box-shadow:inset 0 0 0 1px #7ad9ff42,0 0 18px #52c9ff17;background:linear-gradient(145deg,#16405adf,#091727f0)}
    .le-aw-destination-name{display:block;font-size:13px;font-weight:850;letter-spacing:.01em}
    .le-aw-destination-type{display:block;margin-top:3px;color:#91b2cc;font-size:9px;line-height:1.3}
    .le-aw-destination-fact{display:block;margin-top:7px;color:#bfd4e5;font-size:9px;line-height:1.35}
    .le-aw-visited{position:absolute;right:8px;top:7px;color:#87efc6;font-size:8px;font-weight:900;letter-spacing:.08em}
    .le-aw-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:15px}
    .le-aw-button{appearance:none;min-height:40px;padding:10px 14px;border:1px solid #9bdcff55;border-radius:999px;background:linear-gradient(135deg,#2d82b96b,#ffffff0a);color:#f0faff;font:800 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.075em;text-transform:uppercase;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .le-aw-button.primary{background:linear-gradient(135deg,#3eafe7,#24699f);border-color:#9ce5ff9c;color:#fff;box-shadow:0 0 22px #3eb8f42b}
    .le-aw-button:active,.le-aw-destination:active{transform:scale(.985)}
    .le-aw-button:focus-visible,.le-aw-destination:focus-visible{outline:2px solid #a8e9ff;outline-offset:3px}
    .le-aw-button:disabled{opacity:.38}
    .le-aw-hidden{display:none!important}
    .le-aw-surface-controls{position:absolute;z-index:3;left:50%;bottom:calc(env(safe-area-inset-bottom) + 122px);transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:10px;pointer-events:auto;width:min(88vw,340px)}
    .le-aw-surface-controls .le-aw-button{min-width:56px;min-height:44px;border-radius:15px;font-size:12px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .le-aw-surface-controls .le-aw-button.inspect{min-width:110px;font-size:9px}
    @media(orientation:landscape){.le-aw-panel-wrap{padding-top:calc(env(safe-area-inset-top) + 44px);padding-bottom:calc(env(safe-area-inset-bottom) + 100px)}.le-aw-panel{width:min(74vw,520px);padding:14px 18px}.le-aw-emblem{font-size:30px}.le-aw-title{font-size:22px;margin:6px 0}.le-aw-copy{font-size:10px}.le-aw-facts{margin-top:9px;gap:6px}.le-aw-destinations{margin-top:9px;gap:6px}.le-aw-destination{min-height:72px;padding:8px}.le-aw-destination-fact{margin-top:4px}.le-aw-actions{margin-top:9px}.le-aw-surface-controls{bottom:calc(env(safe-area-inset-bottom) + 95px)}}
    @media(max-height:520px) and (orientation:landscape){.le-aw-panel{max-height:78vh}.le-aw-destination{min-height:64px}.le-aw-destination-fact{display:none}}
    @media(prefers-reduced-motion:reduce){.le-aw-progress-fill{transition:none}.le-aw-button:active,.le-aw-destination:active{transform:none}}
  `;

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }
  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = node('style', '', STYLE); style.id = STYLE_ID; document.head.appendChild(style);
  }
  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0 || 1;
  }
  function seededRandom() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function resetRandom(customSeed) { seed = (customSeed >>> 0) || 1; random = seededRandom; }
  function readProgress() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { visited: [], successfulMissions: 0, launches: 0 };
      const data = JSON.parse(raw);
      return {
        visited: Array.isArray(data.visited) ? data.visited.filter(id => DESTINATIONS.some(d => d.id === id)).slice(0, DESTINATIONS.length) : [],
        successfulMissions: Math.max(0, Math.min(100000, Number(data.successfulMissions) || 0)),
        launches: Math.max(0, Math.min(100000, Number(data.launches) || 0))
      };
    } catch (_) { return { visited: [], successfulMissions: 0, launches: 0 }; }
  }
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 1, ...savedProgress })); } catch (_) { /* Game still works if storage is unavailable. */ }
  }
  function createState() {
    return { mode: 'intro', progress: 0, hull: 3, playerX: 0, playerY: .76, asteroids: [], invulnerable: 0, damageFlash: 0, shake: 0, countdown: 3.1, landingTimer: 0, explorerX: .5, explorerDirection: 0, selectedId: 'moon', missionSeconds: 27, seed: 1, hitCount: 0, landmark: null, time: 0, hasLanded: false, surfaceFade: 0 };
  }
  function buildUI() {
    root = node('div', 'le-aw-root'); root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Alien World mathematical universe exploration game');
    canvas = node('canvas', 'le-aw-canvas'); canvas.setAttribute('aria-label', 'Procedural 2.5D universe map and spaceflight. Choose a destination, launch, and drag to steer around debris.');
    context = canvas.getContext('2d', { alpha: false, desynchronized: true }); root.appendChild(canvas);
    const top = node('div', 'le-aw-top');
    const brand = node('div', ''); brand.append(node('div', 'le-aw-brand', 'ALIEN WORLD'), node('div', 'le-aw-route', 'A MATHEMATICAL UNIVERSE'));
    top.appendChild(brand);
    const hud = node('div', 'le-aw-hud');
    const hudLabel = node('span', 'le-aw-hud-label', 'UNIVERSE LOG');
    const hullValue = node('strong', 'le-aw-hud-value', '0 WORLDS');
    const progress = node('div', 'le-aw-progress'); const progressFill = node('div', 'le-aw-progress-fill'); progress.appendChild(progressFill);
    hud.append(hudLabel, hullValue, progress); top.appendChild(hud); root.appendChild(top);
    const note = node('div', 'le-aw-bottom-note', 'CHOOSE A WORLD  ·  EVERY JOURNEY IS GENERATED MATHEMATICALLY'); root.appendChild(note);
    const wrap = node('div', 'le-aw-panel-wrap'); const panel = node('section', 'le-aw-panel'); panel.setAttribute('aria-live', 'polite');
    const emblem = node('div', 'le-aw-emblem', '✦');
    const eyebrow = node('div', 'le-aw-eyebrow', 'PROCEDURAL SPACE EXPLORATION');
    const title = node('h1', 'le-aw-title', 'A universe waiting to be discovered');
    const copy = node('p', 'le-aw-copy', 'Choose a world, launch through cinematic 2.5D space, dodge generated debris, then land and explore as your astronaut.');
    const facts = node('div', 'le-aw-facts'); const actions = node('div', 'le-aw-actions');
    const primary = node('button', 'le-aw-button primary', 'Open universe map'); primary.type = 'button';
    const secondary = node('button', 'le-aw-button', 'How to explore'); secondary.type = 'button'; actions.append(primary, secondary);
    panel.append(emblem, eyebrow, title, copy, facts, actions); wrap.appendChild(panel); root.appendChild(wrap);
    const controls = node('div', 'le-aw-surface-controls le-aw-hidden');
    const left = node('button', 'le-aw-button', '◀'); left.type = 'button'; left.setAttribute('aria-label', 'Walk left');
    const inspect = node('button', 'le-aw-button inspect', 'World facts'); inspect.type = 'button';
    const right = node('button', 'le-aw-button', '▶'); right.type = 'button'; right.setAttribute('aria-label', 'Walk right'); controls.append(left, inspect, right); root.appendChild(controls);
    stage.appendChild(root);
    ui = { top, hudLabel, hullValue, progressFill, note, wrap, panel, emblem, eyebrow, title, copy, facts, actions, primary, secondary, controls, left, right, inspect };
    primary.addEventListener('click', () => {
      if (!state) return;
      if (state.mode === 'intro') showMap();
      else if (state.mode === 'map') showBriefing();
      else if (state.mode === 'briefing') startMission();
      else if (state.mode === 'destroyed') startMission();
      else if (state.mode === 'arrived') enterSurface();
      else if (state.mode === 'facts') showMap();
      else if (state.mode === 'briefing-help') showMap();
    });
    secondary.addEventListener('click', () => {
      if (!state) return;
      if (state.mode === 'intro') showHowToPlay();
      else if (state.mode === 'map') showIntro();
      else if (state.mode === 'briefing') showMap();
      else if (state.mode === 'destroyed') showMap();
      else if (state.mode === 'arrived') showFacts();
      else if (state.mode === 'facts') enterSurface();
      else if (state.mode === 'briefing-help') showIntro();
    });
    inspect.addEventListener('click', showFacts);
    const setDirection = dir => { if (state?.mode === 'surface') state.explorerDirection = dir; };
    left.addEventListener('pointerdown', e => { e.preventDefault(); setDirection(-1); try { left.setPointerCapture(e.pointerId); } catch (_) {} });
    right.addEventListener('pointerdown', e => { e.preventDefault(); setDirection(1); try { right.setPointerCapture(e.pointerId); } catch (_) {} });
    for (const b of [left, right]) {
      b.addEventListener('pointerup', () => setDirection(0)); b.addEventListener('pointercancel', () => setDirection(0)); b.addEventListener('lostpointercapture', () => setDirection(0)); b.addEventListener('pointerleave', () => setDirection(0));
    }
    canvas.addEventListener('pointerdown', event => {
      if (!active || !state) return;
      if (state.mode === 'playing') { pointerDown = true; steerFlight(event); try { canvas.setPointerCapture(event.pointerId); } catch (_) {} }
      else if (state.mode === 'surface') { pointerDown = true; state.surfacePointerX = event.clientX; try { canvas.setPointerCapture(event.pointerId); } catch (_) {} }
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointerDown || !state) return;
      if (state.mode === 'playing') steerFlight(event);
      else if (state.mode === 'surface') {
        const dx = event.clientX - (state.surfacePointerX || event.clientX); state.surfacePointerX = event.clientX;
        state.explorerX = clamp(state.explorerX + dx / Math.max(1, canvas.clientWidth), .08, .92);
      }
    });
    canvas.addEventListener('pointerup', () => { pointerDown = false; if (state) { state.explorerDirection = 0; state.surfacePointerX = null; } });
    canvas.addEventListener('pointercancel', () => { pointerDown = false; if (state) { state.explorerDirection = 0; state.surfacePointerX = null; } });
    resizeHandler = resizeCanvas; window.addEventListener('resize', resizeHandler, { passive: true }); window.addEventListener('orientationchange', resizeHandler, { passive: true }); window.visualViewport?.addEventListener('resize', resizeHandler, { passive: true });
    keyDownHandler = event => {
      if (!active || !state) return;
      const key = event.key.toLowerCase();
      if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key) && ['playing','surface'].includes(state.mode)) event.preventDefault();
      if (state.mode === 'playing') {
        const step = .08;
        if (key === 'arrowleft' || key === 'a') state.playerX = clamp(state.playerX - step, -.85, .85);
        if (key === 'arrowright' || key === 'd') state.playerX = clamp(state.playerX + step, -.85, .85);
        if (key === 'arrowup' || key === 'w') state.playerY = clamp(state.playerY - step, .61, .88);
        if (key === 'arrowdown' || key === 's') state.playerY = clamp(state.playerY + step, .61, .88);
      } else if (state.mode === 'surface') {
        if (key === 'arrowleft' || key === 'a') state.explorerDirection = -1;
        if (key === 'arrowright' || key === 'd') state.explorerDirection = 1;
        if (key === 'escape') showFacts();
      }
    };
    keyUpHandler = event => { if (state && state.mode === 'surface' && ['arrowleft','arrowright','a','d'].includes(event.key.toLowerCase())) state.explorerDirection = 0; };
    window.addEventListener('keydown', keyDownHandler); window.addEventListener('keyup', keyUpHandler);
    resizeCanvas(); updateHUD();
  }

  function setPanel(mode, emblemText, eyebrow, title, copy, facts = [], primaryText = 'Continue', secondaryText = 'Back') {
    if (!ui || !state) return;
    state.mode = mode; if(root){root.classList.toggle('le-aw-map-mode',mode==='map');root.classList.toggle('le-aw-surface-mode',mode==='surface');} ui.facts.className = 'le-aw-facts'; ui.emblem.textContent = emblemText; ui.eyebrow.textContent = eyebrow; ui.title.textContent = title; ui.copy.textContent = copy; ui.facts.replaceChildren(); ui.primary.textContent = primaryText; ui.secondary.textContent = secondaryText; ui.wrap.classList.remove('le-aw-hidden'); ui.controls.classList.add('le-aw-hidden');
    for (const item of facts) addFact(item[0], item[1]);
    updateHUD();
  }
  function showIntro() {
    state.mode = 'intro';
    setPanel('intro','✦','A MATHEMATICAL UNIVERSE','A universe waiting to be discovered','Choose a world, launch through cinematic 2.5D space, dodge generated debris, then land and explore as your astronaut.',[['GENERATED SPACE','Stars, route visuals and hazards are created mathematically'],['EXPLORE','Visit worlds, learn and grow your discovery log'],['SMALL BY DESIGN','Reusable effects; compact local progress only']], 'Open universe map','How to explore');
    ui.note.textContent = 'BEAUTIFUL WORLDS  ·  MATHEMATICAL UNIVERSE  ·  CINEMATIC JOURNEYS';
  }
  function showHowToPlay() {
    setPanel('briefing-help','🧭','FLIGHT SCHOOL','Your journey, your discovery','Choose a destination. During flight, drag across the scene to steer in two directions. Avoid asteroids—three hull hits destroy the ship. After landing, use the ◀ ▶ controls to walk and open the world facts.',[['FLIGHT','Touch-drag or arrow keys / WASD'],['DAMAGE','Three hull hits end a mission'],['SURFACE','Walk left/right and inspect the world'],['UNIVERSE MAP','Positions are illustrative, not to scale']], 'Choose a world','Back');
    ui.note.textContent = 'LEARN THE CONTROLS  ·  THEN PICK A DESTINATION';
  }
  function showMap() {
    state.mode = 'map'; state.hasLanded = false;
    setPanel('map','✦','UNIVERSE NAVIGATOR','Choose your next world','Each destination has its own compact data record and generated visual setting. Map positions and flight lengths are game-space, not to scale.');
    ui.facts.classList.remove('le-aw-facts'); ui.facts.classList.add('le-aw-destinations');
    for (const dest of DESTINATIONS) {
      const button = node('button','le-aw-destination'); button.type = 'button'; button.dataset.destination = dest.id; button.setAttribute('aria-pressed',String(state.selectedId === dest.id));
      const name = node('span','le-aw-destination-name',dest.name); const type = node('span','le-aw-destination-type',dest.kind); const fact = node('span','le-aw-destination-fact',dest.averageDistance);
      button.append(name,type,fact);
      if (savedProgress.visited.includes(dest.id)) button.appendChild(node('span','le-aw-visited','DISCOVERED'));
      button.addEventListener('click',()=>{state.selectedId=dest.id; updateDestinationSelection();});
      ui.facts.appendChild(button);
    }
    ui.primary.textContent = `Review route: ${selectedDestination().name}`; ui.secondary.textContent = 'Back'; ui.note.textContent = `UNIVERSE MAP  ·  ${savedProgress.visited.length} / ${DESTINATIONS.length} WORLDS DISCOVERED`;
  }
  function updateDestinationSelection() {
    if (!ui || state?.mode !== 'map') return;
    ui.facts.querySelectorAll('[data-destination]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.destination === state.selectedId)));
    ui.primary.textContent = `Review route: ${selectedDestination().name}`; ui.note.textContent = `SELECTED DESTINATION  ·  ${selectedDestination().name.toUpperCase()}`;
  }
  function showBriefing() {
    const dest = selectedDestination();
    setPanel('briefing','🚀',dest.route,`Journey to ${dest.name}`,`A cinematic, game-compressed flight through mathematically generated space. The scenery is illustrative; the destination's scientific facts remain separate from the game map.`,[['DESTINATION',`${dest.name} · ${dest.kind}`],['ROUTE DATA',dest.averageDistance],['SHIP HULL','3 hull points · 3 hits destroy the ship'],['GAMEPLAY','Procedural debris and perspective flight']], 'Launch mission','Change destination');
    ui.note.textContent = `ROUTE LOCKED  ·  EARTH → ${dest.name.toUpperCase()}`;
  }
  function showDestroyed() {
    const dest = selectedDestination();
    setPanel('destroyed','✹','MISSION ENDED','Ship destroyed',`The hull took too many impacts on the route to ${dest.name}. Your route is regenerated from a small mathematical seed, so retrying does not download another level.`,[['DISTANCE','Partial route completed'],['HULL','0 / 3 remaining'],['ROUTE SEED',String(state.seed)]], 'Retry mission','Choose another world');
    ui.note.textContent = 'MISSION ENDED  ·  RESET, LEARN, TRY AGAIN';
  }
  function showArrived() {
    const dest = selectedDestination(); state.mode='arrived'; state.hasLanded=true; state.surfaceFade=reduceMotion()?0:.88;
    setPanel('arrived','🧑‍🚀','ARRIVAL CONFIRMED',`Welcome to ${dest.name}`,`The landing sequence is complete. Your small explorer is ready to step outside. Look around, inspect the landscape and discover what makes this world special.`,[['WORLD TYPE',dest.kind],['LANDING','Procedural illustrative surface'],['DISCOVERY LOG',`${savedProgress.visited.length} worlds visited`]], 'Step outside','World facts');
    ui.note.textContent = `LANDING COMPLETE  ·  ${dest.name.toUpperCase()}  ·  EXPLORER READY`;
  }
  function showFacts() {
    const dest=selectedDestination();
    setPanel('facts','🧑‍🚀','FIELD NOTES',`${dest.name}: world facts`,dest.fact,dest.facts,'Choose another world','Return to surface');
    ui.note.textContent = `FIELD NOTES  ·  ${dest.name.toUpperCase()}  ·  SCIENCE AND DISCOVERY`;
  }
  function enterSurface() {
    if (!state) return;
    state.mode='surface'; state.hasLanded=true; state.explorerDirection=0; state.explorerX=.48; root?.classList.add('le-aw-surface-mode');
    ui.wrap.classList.add('le-aw-hidden'); ui.controls.classList.remove('le-aw-hidden');
    ui.hudLabel.textContent='SURFACE EXPLORER'; ui.hullValue.textContent=selectedDestination().name.toUpperCase(); ui.progressFill.style.width='100%';
    ui.note.textContent='WALK WITH ◀ ▶ OR DRAG  ·  TAP WORLD FACTS TO LEARN';
  }
  function addFact(label,value) {
    const fact=node('div','le-aw-fact'); fact.append(node('strong','',label),node('span','',value)); ui.facts.appendChild(fact);
  }
  function startMission() {
    const dest=selectedDestination(); const missionSeed=hashString(`${dest.id}:${savedProgress.launches+1}:${dest.seed}`); resetRandom(missionSeed);
    state.mode='countdown'; state.seed=missionSeed; state.progress=0; state.hull=3; state.playerX=0; state.playerY=.76; state.asteroids=[]; state.invulnerable=0; state.damageFlash=0; state.shake=0; state.countdown=reduceMotion()?0.4:3.1; state.hitCount=0; state.time=0; state.hasLanded=false;
    state.missionSeconds=dest.seconds; state.explorerDirection=0; spawnClock=.6; stars=makeStars(170); lastFrame=0; pointerDown=false;
    savedProgress.launches=Math.min(100000,savedProgress.launches+1); saveProgress();
    ui.wrap.classList.add('le-aw-hidden'); ui.controls.classList.add('le-aw-hidden'); ui.hudLabel.textContent='SHIP HULL'; ui.note.textContent='LAUNCH CHECK  ·  ENGINES IGNITING'; updateHUD();
  }
  function updateHUD() {
    if (!ui || !state) return;
    if (['playing','countdown','landing','destroyed'].includes(state.mode)) {
      ui.hudLabel.textContent='SHIP HULL'; ui.hullValue.textContent=state.hull>0?'● '.repeat(state.hull).trim():'0 / 3';
      ui.progressFill.style.width=`${clamp(state.progress*100,0,100)}%`;
    } else if (state.mode==='surface') {
      ui.hudLabel.textContent='DISCOVERED'; ui.hullValue.textContent=`${savedProgress.visited.length} / ${DESTINATIONS.length}`; ui.progressFill.style.width=`${savedProgress.visited.length/DESTINATIONS.length*100}%`;
    } else {
      ui.hudLabel.textContent='UNIVERSE LOG'; ui.hullValue.textContent=`${savedProgress.visited.length} WORLDS`; ui.progressFill.style.width=`${savedProgress.visited.length/DESTINATIONS.length*100}%`;
    }
    ui.top.style.opacity=state.mode==='intro'?.82:1;
  }
  function steerFlight(event) {
    if (!canvas||!state) return; const rect=canvas.getBoundingClientRect();
    state.playerX=clamp(((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*2,-.88,.88);
    state.playerY=clamp((event.clientY-rect.top)/Math.max(1,rect.height),.60,.88);
  }
  function makeStars(count) {
    const out=[]; for(let i=0;i<count;i++) out.push({x:random()*2-1,y:random()*1.6-.55,z:.12+random()*2.4,size:.35+random()*1.35,phase:random()*Math.PI*2,speed:.25+random()*1.1,tint:random()}); return out;
  }
  function resizeCanvas() {
    if(!canvas) return; const rect=canvas.getBoundingClientRect(); const width=Math.max(1,rect.width||window.innerWidth), height=Math.max(1,rect.height||window.innerHeight);
    dpr=Math.min(window.devicePixelRatio||1,1.65); canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr);
    context=canvas.getContext('2d',{alpha:false,desynchronized:true}); context.setTransform(dpr,0,0,dpr,0,0); context.imageSmoothingEnabled=true; if(state) {state.playerX=clamp(state.playerX,-.88,.88);state.explorerX=clamp(state.explorerX,.08,.92);} 
  }
  function update(dt) {
    if(!state) return; state.time+=dt;
    if(state.mode==='countdown') {
      state.countdown-=dt;
      if(state.countdown>2.2) ui.note.textContent='LAUNCH CHECK  ·  SYSTEMS ONLINE';
      else if(state.countdown>1.3) ui.note.textContent='T−2  ·  ENGINES IGNITING';
      else if(state.countdown>.45) ui.note.textContent='T−1  ·  CLEAR FOR DEPARTURE';
      else {state.mode='playing';state.countdown=0;lastFrame=0;ui.note.textContent=`FLIGHT  ·  EARTH → ${selectedDestination().name.toUpperCase()}  ·  DODGE DEBRIS`;}
      updateHUD(); return;
    }
    if(state.mode==='playing') {
      const dest=selectedDestination();
      state.progress=Math.min(1,state.progress+dt/state.missionSeconds); state.invulnerable=Math.max(0,state.invulnerable-dt); state.damageFlash=Math.max(0,state.damageFlash-dt); state.shake=Math.max(0,state.shake-dt*2.6);
      spawnClock-=dt;
      if(spawnClock<=0) {
        const hazardSeed=Math.floor(random()*0xffffffff)>>>0; const rr=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        const asteroid={x:(rr()*1.7-.85),y:.13+rr()*.64,z:3.2+rr()*1.6,radius:7+rr()*7,spin:(rr()-.5)*2.5,angle:rr()*Math.PI*2,seed:hazardSeed,kind:rr()>.62?'ice':'rock',trail:[]};
        state.asteroids.push(asteroid); spawnClock=Math.max(.34,.82-state.progress*.24+rr()*.45);
      }
      for(let i=state.asteroids.length-1;i>=0;i--) {
        const a=state.asteroids[i]; a.z-=dt*(.82+state.progress*.24); a.angle+=a.spin*dt;
        if(a.z<.16) {
          const p=projectHazard(a,canvas.clientWidth,canvas.clientHeight);
          const sx=canvas.clientWidth/2+state.playerX*canvas.clientWidth*.31; const sy=state.playerY*canvas.clientHeight;
          const hit=Math.hypot(p.x-sx,p.y-sy)<p.r+15;
          if(hit&&state.invulnerable<=0){state.hull--;state.hitCount++;state.invulnerable=1.1;state.damageFlash=.32;state.shake=.24;}
          state.asteroids.splice(i,1);
          if(state.hull<=0){showDestroyed();break;}
        }
      }
      if(state.mode==='playing'&&state.progress>=1){state.asteroids.length=0;state.mode='landing';state.landingTimer=reduceMotion()?.6:3.2;ui.note.textContent=`ARRIVAL APPROACH  ·  ${dest.name.toUpperCase()}`;}
      updateHUD(); return;
    }
    if(state.mode==='landing') {
      state.landingTimer-=dt; state.progress=Math.min(1,state.progress+dt*.08);
      if(state.landingTimer<=0){const dest=selectedDestination();if(!savedProgress.visited.includes(dest.id))savedProgress.visited.push(dest.id);savedProgress.successfulMissions=Math.min(100000,savedProgress.successfulMissions+1);saveProgress();showArrived();}
      updateHUD(); return;
    }
    if(state.mode==='arrived' && state.surfaceFade>0) state.surfaceFade=Math.max(0,state.surfaceFade-dt*1.25);
    if(state.mode==='surface') {
      state.surfaceFade=Math.max(0,state.surfaceFade-dt*1.25);
      state.explorerX=clamp(state.explorerX+state.explorerDirection*dt*.30,.08,.92); updateHUD();
    }
  }
  function projectHazard(a,width,height) {
    const focalX=width*.48, focalY=height*.62, horizon=height*.34, den=Math.max(.42,a.z+.65);
    const scale=1/den; return {x:width/2+a.x*focalX*scale,y:horizon+a.y*focalY*scale,r:a.radius*(.7+scale*.75),scale};
  }
  // High-detail material maps are generated once per world and reused while the game is open.
  // Procedural textures live only in memory; the Moon reuses the app's existing lunar texture asset.
  const planetTextureCache = new Map();
  let sharedMoonSurfaceImage = null, moonSurfaceLoadRequested = false;
  function latticeNoise(ix, iy, salt) {
    let n = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(salt | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 4294967295;
  }
  function smoothNoise(x, y, scale, salt) {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = latticeNoise(x0, y0, salt), b = latticeNoise(x0 + 1, y0, salt);
    const c = latticeNoise(x0, y0 + 1, salt), d = latticeNoise(x0 + 1, y0 + 1, salt);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
  function projectMoonSurfaceImage(image) {
    // Convert the shared equirectangular lunar map into a front-facing sphere disk once.
    // This keeps the game 2.5D while matching the surface used by our Moon View.
    const source = document.createElement('canvas'); source.width = 512; source.height = 256;
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    sourceContext.drawImage(image, 0, 0, source.width, source.height);
    const sourcePixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
    const size = 256, result = document.createElement('canvas'); result.width = result.height = size;
    const resultContext = result.getContext('2d', { willReadFrequently: true });
    const output = resultContext.createImageData(size, size);
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      const ny = (half - (y + .5)) / half;
      for (let x = 0; x < size; x++) {
        const nx = ((x + .5) - half) / half, radius2 = nx * nx + ny * ny;
        const i = (y * size + x) * 4;
        if (radius2 >= .995) { output.data[i+3] = 0; continue; }
        const z = Math.sqrt(Math.max(0, 1 - radius2));
        const longitude = Math.atan2(nx, z), latitude = Math.asin(clamp(ny, -1, 1));
        const u = .5 + longitude / (Math.PI * 2), v = .5 - latitude / Math.PI;
        const sx = Math.min(source.width - 1, Math.max(0, Math.floor(u * source.width)));
        const sy = Math.min(source.height - 1, Math.max(0, Math.floor(v * source.height)));
        const si = (sy * source.width + sx) * 4;
        output.data[i] = sourcePixels[si]; output.data[i+1] = sourcePixels[si+1]; output.data[i+2] = sourcePixels[si+2]; output.data[i+3] = 255;
      }
    }
    resultContext.putImageData(output, 0, 0);
    return result;
  }
  function loadSharedMoonSurface() {
    if (sharedMoonSurfaceImage) {
      planetTextureCache.set('moon', projectMoonSurfaceImage(sharedMoonSurfaceImage));
      return;
    }
    if (moonSurfaceLoadRequested) return;
    moonSurfaceLoadRequested = true;
    const image = new Image();
    image.onload = () => {
      sharedMoonSurfaceImage = image;
      planetTextureCache.set('moon', projectMoonSurfaceImage(image));
      if (active && context && canvas && state) render(performance.now());
    };
    image.onerror = () => { moonSurfaceLoadRequested = false; /* procedural lunar fallback remains available */ };
    image.src = new URL('./alien-world-moon-surface.jpg', document.baseURI).href;
  }

  function makePlanetTexture(id) {
    if (planetTextureCache.has(id)) return planetTextureCache.get(id);
    const size = 256, tex = document.createElement('canvas'); tex.width = tex.height = size;
    const tctx = tex.getContext('2d', { alpha: false, willReadFrequently: true });
    const image = tctx.createImageData(size, size), data = image.data;
    const salt = ({earth:11,moon:23,mars:37,europa:41,titan:53}[id] || 71);
    for (let y = 0; y < size; y++) {
      const latitude = Math.sin((y / size) * Math.PI);
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const broad = smoothNoise(x, y, 78, salt), mid = smoothNoise(x, y, 29, salt + 7);
        const fine = smoothNoise(x, y, 8, salt + 15), grain = latticeNoise(x, y, salt + 29);
        let r = 0, g = 0, b = 0;
        if (id === 'earth') {
          const land = broad * .65 + mid * .35 > .52 + Math.abs(latitude - .5) * .09;
          if (land) { r=35 + mid*60 + fine*18; g=74 + broad*72 + fine*27; b=44 + mid*30 + fine*20; }
          else { r=6 + broad*16 + fine*4; g=28 + mid*44 + fine*7; b=65 + broad*94 + fine*18; }
          const cloud = smoothNoise(x, y, 17, salt + 103) * .68 + smoothNoise(x + 19, y - 8, 5, salt + 117) * .32;
          if (cloud > .73) { const veil = Math.min(.47, (cloud - .73) * 1.7); r=r*(1-veil)+215*veil; g=g*(1-veil)+231*veil; b=b*(1-veil)+241*veil; }
        } else if (id === 'moon') {
          const shade = (broad-.5)*34 + (mid-.5)*32 + (fine-.5)*19 + (grain-.5)*13;
          r=139+shade; g=145+shade; b=151+shade;
        } else if (id === 'mars') {
          const dust = (broad-.5)*36 + (mid-.5)*35 + (fine-.5)*19 + (grain-.5)*9;
          r=160+dust; g=77+dust*.62; b=54+dust*.48;
          if (mid > .69) { r+=18; g+=13; b+=8; }
        } else if (id === 'europa') {
          const ice = (broad-.5)*30 + (mid-.5)*26 + (fine-.5)*15 + (grain-.5)*7;
          r=190+ice; g=211+ice; b=223+ice;
        } else {
          const haze = (broad-.5)*27 + (mid-.5)*25 + (fine-.5)*14 + (grain-.5)*6;
          r=171+haze; g=118+haze*.78; b=70+haze*.55;
        }
        data[i]=Math.max(0,Math.min(255,r)); data[i+1]=Math.max(0,Math.min(255,g)); data[i+2]=Math.max(0,Math.min(255,b)); data[i+3]=255;
      }
    }
    tctx.putImageData(image, 0, 0);
    // Surface relief: irregular impact basins with shaded floors, raised rims and tiny secondary craters.
    if (['moon','mars','europa'].includes(id)) {
      let s = salt * 92821 + 17; const rnd = () => { s = (Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; };
      const count = id === 'moon' ? 68 : id === 'mars' ? 44 : 23;
      for (let n=0;n<count;n++) {
        const x=rnd()*size, y=rnd()*size, r=(id==='moon'?3:2.4)+Math.pow(rnd(),2)*(id==='moon'?19:13);
        const dark=tctx.createRadialGradient(x-r*.15,y-r*.18,r*.08,x,y,r);
        if(id==='europa') { dark.addColorStop(0,'rgba(77,111,139,.68)');dark.addColorStop(.68,'rgba(120,154,176,.36)');dark.addColorStop(.82,'rgba(245,251,255,.90)');dark.addColorStop(1,'rgba(92,128,151,0)'); }
        else { dark.addColorStop(0,'rgba(14,22,32,.65)');dark.addColorStop(.62,'rgba(34,42,52,.34)');dark.addColorStop(.82,id==='moon'?'rgba(247,248,244,.82)':'rgba(255,193,143,.70)');dark.addColorStop(1,'rgba(0,0,0,0)'); }
        tctx.fillStyle=dark;tctx.beginPath();tctx.arc(x,y,r,0,Math.PI*2);tctx.fill();
        if(id==='moon' && r>8) { tctx.strokeStyle='rgba(250,252,250,.26)';tctx.lineWidth=.8;tctx.beginPath();tctx.arc(x-r*.12,y-r*.14,r*.83,Math.PI*1.05,Math.PI*1.72);tctx.stroke(); }
      }
    }
    if (id === 'europa') {
      let s=811;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
      for(let i=0;i<42;i++) { const x=rnd()*size,y=rnd()*size; tctx.strokeStyle=i%3===0?'rgba(152,75,65,.54)':'rgba(100,139,164,.45)';tctx.lineWidth=.5+rnd()*1.7;tctx.beginPath();tctx.moveTo(x,y);tctx.bezierCurveTo(x+(rnd()-.5)*65,y+(rnd()-.5)*65,x+(rnd()-.5)*80,y+(rnd()-.5)*80,x+(rnd()-.5)*120,y+(rnd()-.5)*120);tctx.stroke(); }
    }
    // Fine film grain and surface flecks add texture without any external image.
    for(let i=0;i<850;i++){const x=latticeNoise(i,salt,1)*size,y=latticeNoise(i,salt,2)*size; tctx.globalAlpha=.06+latticeNoise(i,salt,3)*.12;tctx.fillStyle=id==='earth'?'#e4f8ff':id==='mars'?'#ffd4a4':'#ffffff';tctx.fillRect(x,y,.5+latticeNoise(i,salt,4)*1.2,.5+latticeNoise(i,salt,5)*1.2);}
    tctx.globalAlpha=1;
    planetTextureCache.set(id, tex);
    return tex;
  }
  function textureFor(destination) {
    const id = destination?.id || 'earth';
    // Prefer the exact lunar surface asset shared with Moon View when it has loaded;
    // use the local procedural material immediately as a safe startup/offline fallback.
    if (id === 'moon' && planetTextureCache.has('moon')) return planetTextureCache.get('moon');
    return makePlanetTexture(id);
  }

  function drawBackground(ctx,w,h,time,flight=false) {
    // Cinematic deep-space field, assembled procedurally so no large backdrop is downloaded.
    const bg=ctx.createLinearGradient(0,0,w*.22,h);bg.addColorStop(0,'#01030b');bg.addColorStop(.28,'#061324');bg.addColorStop(.62,'#081a31');bg.addColorStop(1,'#01030a');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const nebulae=[
      [w*.73,h*.22,Math.max(w,h)*.66,'#176b9e22','#3a327211'],
      [w*.23,h*.49,Math.max(w,h)*.44,'#753f8730','#173b6900'],
      [w*.88,h*.78,Math.max(w,h)*.47,'#174f8730','#07132700']
    ];
    for(const [nx,ny,nr,c1,c2] of nebulae){const n=ctx.createRadialGradient(nx,ny,2,nx,ny,nr);n.addColorStop(0,c1);n.addColorStop(.52,c2);n.addColorStop(1,'#00000000');ctx.fillStyle=n;ctx.fillRect(0,0,w,h);}
    // Subtle wide galactic cloud bands, feathered so they never look like hard stripes.
    ctx.save();ctx.translate(w*.5,h*.36);ctx.rotate(-.48);const band=ctx.createLinearGradient(0,-h*.42,0,h*.42);band.addColorStop(0,'#173d6b00');band.addColorStop(.34,'#1a5c8b12');band.addColorStop(.49,'#7d65a319');band.addColorStop(.63,'#1f5e8a10');band.addColorStop(1,'#10254400');ctx.fillStyle=band;ctx.fillRect(-w*.9,-h*.52,w*1.8,h*1.04);ctx.restore();
    // Three depth layers create parallax; near stars streak only during powered flight.
    for(const star of stars){
      let x,y,z=star.z; if(flight&&state?.mode==='playing') z-=state.progress*.30;
      if(flight){const den=Math.max(.20,z);x=w/2+star.x*w*.37/den;y=h*.31+star.y*h*.29/den;}
      else{x=star.x*w*.5+w*.5;y=((star.y+.55)*h*.62+(time*star.speed*.75))%(h*.74);}
      if(x< -18||x>w+18||y< -18||y>h+18)continue;
      const twinkle=.42+(.5+.5*Math.sin(time*.0013+star.phase))*.58;
      const rad=star.size*(flight?1+1/(z+.42)*.62:1);
      ctx.globalAlpha=twinkle;ctx.fillStyle=star.tint>.83?'#a6e7ff':star.tint>.58?'#d6d9ff':'#e7f5ff';
      ctx.shadowColor=star.tint>.92?'#5bbdff':'transparent';ctx.shadowBlur=(star.tint>.92&&rad>1.3)?3:0;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      if(flight&&z<.52){ctx.globalAlpha=twinkle*.55;ctx.strokeStyle='#9bdcff';ctx.lineWidth=Math.max(.45,rad*.34);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-star.x*20,y-star.y*15-9);ctx.stroke();}
    }
    ctx.globalAlpha=1;
    // Foreground dust creates a second depth cue without saving any particles.
    if(flight&&state?.mode==='playing'){
      for(let i=0;i<27;i++){const seed=i*71.7+12;const depth=.25+((i*37)%89)/100;const x=(Math.sin(seed+time*.00011*depth)*.5+.5)*w;const y=((i*83+time*.025*depth)%h);const r=.3+depth*1.05;ctx.globalAlpha=.13+depth*.20;ctx.fillStyle=i%4===0?'#77dfff':'#b4d4ea';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
    }
    const vignette=ctx.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.12,w*.5,h*.48,Math.max(w,h)*.78);vignette.addColorStop(0,'#00000000');vignette.addColorStop(.64,'#00050c29');vignette.addColorStop(1,'#000611d9');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function drawSphere(ctx,x,y,r,dest,time,alpha=1) {
    if(r<=0)return;
    const pal=dest?.palette||['#a5e8ff','#247cb8','#12334e','#020713'];
    ctx.save();ctx.globalAlpha=alpha;
    // Volumetric atmosphere/glow.
    const glow=ctx.createRadialGradient(x-r*.12,y-r*.18,r*.36,x,y,r*1.62);glow.addColorStop(0,pal[1]+'38');glow.addColorStop(.55,pal[1]+'19');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r*1.62,0,Math.PI*2);ctx.fill();
    const base=ctx.createRadialGradient(x-r*.34,y-r*.43,r*.02,x+r*.16,y+r*.22,r*1.22);base.addColorStop(0,pal[0]);base.addColorStop(.33,pal[1]);base.addColorStop(.69,pal[2]);base.addColorStop(1,pal[3]);ctx.fillStyle=base;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r*.985,0,Math.PI*2);ctx.clip();
    const id=dest?.id||'earth';
    // High-detail generated surface texture (cached by body, not regenerated each frame).
    const texture=textureFor(dest);ctx.globalAlpha=alpha*.96;ctx.drawImage(texture,x-r,y-r,r*2,r*2);ctx.globalAlpha=alpha;
    // Directional illumination: soft sunlight on upper-left, deep night-side at right.
    const light=ctx.createRadialGradient(x-r*.43,y-r*.48,r*.02,x-r*.18,y-r*.15,r*1.42);light.addColorStop(0,'#ffffff22');light.addColorStop(.42,'#ffffff08');light.addColorStop(1,'#00000000');ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);
    const terminator=ctx.createLinearGradient(x-r*.2,y-r*.1,x+r,y+r*.18);terminator.addColorStop(0,'#01071300');terminator.addColorStop(.38,'#0208140b');terminator.addColorStop(.72,'#02071548');terminator.addColorStop(1,'#00030bdc');ctx.fillStyle=terminator;ctx.fillRect(x-r,y-r,r*2,r*2);
    if(id==='earth' && r>38){
      // Cloud bands and tiny storm systems on top of the cached continent/ocean map.
      ctx.globalAlpha=alpha*.13;ctx.strokeStyle='#f3fcff';ctx.lineWidth=Math.max(.45,r*.014);
      for(let i=0;i<4;i++){const yy=y-r*.72+i*r*.20;ctx.beginPath();ctx.moveTo(x-r*.84,yy+Math.sin(i*2.1+time*.0005)*r*.06);ctx.bezierCurveTo(x-r*.36,yy-r*.11,x+r*.17,yy+r*.12,x+r*.84,yy-r*.05);ctx.stroke();}
      ctx.globalAlpha=alpha;
    } else if(id==='titan'){
      ctx.globalAlpha=alpha*.28;const haze=ctx.createLinearGradient(x-r,y-r,x+r,y+r);haze.addColorStop(0,'#fff0c8');haze.addColorStop(.5,'#e6a35c00');haze.addColorStop(1,'#241629');ctx.fillStyle=haze;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=alpha;
    }
    ctx.restore();
    // Fine luminous rim on the sun-facing edge and a subtle reflected-light crescent.
    ctx.shadowColor=pal[0];ctx.shadowBlur=Math.min(20,r*.23);ctx.strokeStyle=pal[0]+'9b';ctx.lineWidth=Math.max(.65,r*.025);ctx.beginPath();ctx.arc(x,y,r*.99,-Math.PI*.92,Math.PI*.56);ctx.stroke();ctx.shadowBlur=0;
    ctx.strokeStyle='#d6edff18';ctx.lineWidth=Math.max(.5,r*.012);ctx.beginPath();ctx.arc(x,y,r*.975,Math.PI*.55,Math.PI*1.34);ctx.stroke();
    ctx.restore();
  }
  function drawEarth(ctx,x,y,r,time) { drawSphere(ctx,x,y,r,{id:'earth',palette:['#c8f7ff','#2b94cf','#123a6d','#020816']},time); }
  // Destination records store mathematical X/Y/depth coordinates. The map applies
  // a lightweight perspective projection: this creates spatial depth without a 3D engine
  // or storing a 3D environment for each world. Coordinates are game-space, not astronomy.
  function projectMapPoint(destination,w,h,originX,originY) {
    const position=destination.map;
    const depth=Math.max(0,position.z||0);
    const perspective=1/(1+depth*.20);
    // A slight camera rotation folds depth into both screen axes: this is a navigational
    // game map, not a scientifically scaled chart, but destinations read as spatial points.
    const mapX=(position.x||0)-depth*.38;
    const mapY=(position.y||0)+depth*.17;
    const landscape=w>h;
    return { x:originX+mapX*w*(landscape?.30:.42)*perspective, y:originY+mapY*h*(landscape?.13:.21)*perspective, perspective };
  }
  function drawStarMap(ctx,w,h,time) {
    drawBackground(ctx,w,h,time,false);
    const landscape=w>h;const earthX=w*(landscape?.12:.24),earthY=h*(landscape?.38:.28),earthR=Math.min(w,h)*(landscape?.10:.079);drawEarth(ctx,earthX,earthY,earthR,time);
    // Faint navigational grid arcs and a radial origin beacon imply a much larger map.
    ctx.save();ctx.strokeStyle='#73bbec11';ctx.lineWidth=.7;
    for(let i=1;i<=4;i++){ctx.beginPath();ctx.ellipse(earthX+w*.11,earthY+h*.015,w*(.10+i*.045),h*(.045+i*.025),-.22,0,Math.PI*2);ctx.stroke();}
    const originGlow=ctx.createRadialGradient(earthX,earthY,earthR*.25,earthX,earthY,earthR*2.1);originGlow.addColorStop(0,'#75d9ff1a');originGlow.addColorStop(.6,'#4bb8ff0a');originGlow.addColorStop(1,'#4bb8ff00');ctx.fillStyle=originGlow;ctx.beginPath();ctx.arc(earthX,earthY,earthR*2.1,0,Math.PI*2);ctx.fill();ctx.restore();
    const projected=DESTINATIONS.map(destination=>({destination,...projectMapPoint(destination,w,h,earthX,earthY)}));
    ctx.save();ctx.setLineDash([3,7]);ctx.lineWidth=1;ctx.strokeStyle='#7acfff4e';
    for(const point of projected){
      const {destination,x,y,perspective}=point;
      ctx.globalAlpha=.48+.35*perspective;
      ctx.beginPath();ctx.moveTo(earthX+earthR*.62,earthY-earthR*.2);
      ctx.quadraticCurveTo(earthX+(x-earthX)*.45,earthY+(y-earthY)*.36,x,y);ctx.stroke();
    }
    ctx.restore();ctx.globalAlpha=1;
    for(const point of projected){
      const {destination:d,x,y,perspective}=point;
      const baseRadius=Math.min(w,h)*(d.id===state.selectedId ? .043 : .030);
      const r=baseRadius*(.78+perspective*.34);
      drawSphere(ctx,x,y,r,d,time,d.id===state.selectedId?1:.8);
      if(d.id===state.selectedId){ctx.strokeStyle='#9deaffb0';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x,y,r+7+Math.sin(time*.002)*2,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle=d.id===state.selectedId?'#e8f8ff':'#99b5cb';ctx.font=`${d.id===state.selectedId?'700':'500'} ${Math.max(9,Math.min(12,w*.027))}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;ctx.textAlign='center';const labelY=d.id==='mars'?y-r-8:y+r+15;ctx.fillText(d.name.toUpperCase(),x,labelY);
    }
    ctx.fillStyle='#7398b3';ctx.font='8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('GAME-SPACE MAP · NOT TO SCALE',w*.5,h*.93);
  }
  function drawShip(ctx,x,y,time,invulnerable,tilt=0,scale=1) {
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(scale,scale);
    if(invulnerable>0&&Math.floor(time*.018)%2===0)ctx.globalAlpha=.34;
    // Long, animated afterburner with a white-hot core and cyan-violet exhaust halo.
    const pulse=1+Math.sin(time*.018)*.11;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowColor='#4bd5ff';ctx.shadowBlur=25;
    const halo=ctx.createRadialGradient(0,9,1,0,17,26);halo.addColorStop(0,'#93edff55');halo.addColorStop(1,'#359aff00');ctx.fillStyle=halo;ctx.beginPath();ctx.ellipse(0,15,18,22,0,0,Math.PI*2);ctx.fill();
    for(const [ox,oy,wid,len] of [[-8,8,4,24],[0,10,6,34],[8,8,4,24]]){const flame=ctx.createLinearGradient(0,oy,0,oy+len*pulse);flame.addColorStop(0,'#ffffff');flame.addColorStop(.18,'#9af1ff');flame.addColorStop(.55,'#48caff');flame.addColorStop(1,'#386bff00');ctx.fillStyle=flame;ctx.beginPath();ctx.moveTo(ox-wid,oy);ctx.quadraticCurveTo(ox-wid*.4,oy+len*.25,ox,oy+len*pulse);ctx.quadraticCurveTo(ox+wid*.5,oy+len*.28,ox+wid,oy);ctx.closePath();ctx.fill();}ctx.restore();
    // Cast light from the engines onto a thin, faceted rear hull.
    ctx.fillStyle='#0a2035';ctx.beginPath();ctx.moveTo(-18,9);ctx.lineTo(-27,18);ctx.lineTo(-13,14);ctx.lineTo(0,12);ctx.lineTo(13,14);ctx.lineTo(27,18);ctx.lineTo(18,9);ctx.closePath();ctx.fill();
    // Wing silhouette, layered armor panels and bright edge highlights.
    ctx.shadowColor='#65dfff';ctx.shadowBlur=7;ctx.fillStyle='#233c56';ctx.strokeStyle='#a9eaff';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(10,-13);ctx.lineTo(27,5);ctx.lineTo(25,13);ctx.lineTo(12,10);ctx.lineTo(7,18);ctx.lineTo(0,14);ctx.lineTo(-7,18);ctx.lineTo(-12,10);ctx.lineTo(-25,13);ctx.lineTo(-27,5);ctx.lineTo(-10,-13);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#6687a5';ctx.beginPath();ctx.moveTo(-8,-14);ctx.lineTo(-22,7);ctx.lineTo(-12,5);ctx.lineTo(-5,-5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(8,-14);ctx.lineTo(22,7);ctx.lineTo(12,5);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d6f6ff74';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-20,7);ctx.lineTo(-12,7);ctx.lineTo(-5,1);ctx.moveTo(20,7);ctx.lineTo(12,7);ctx.lineTo(5,1);ctx.stroke();
    // Central fuselage with metallic planes and a dark central spine.
    const body=ctx.createLinearGradient(-12,-4,12,7);body.addColorStop(0,'#f8ffff');body.addColorStop(.22,'#cce7f5');body.addColorStop(.47,'#7e9eb7');body.addColorStop(.72,'#3e5b76');body.addColorStop(1,'#17283d');ctx.fillStyle=body;ctx.strokeStyle='#e6fbff';ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(9,-4);ctx.lineTo(6,11);ctx.lineTo(0,16);ctx.lineTo(-6,11);ctx.lineTo(-9,-4);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#24445f';ctx.beginPath();ctx.moveTo(0,-31);ctx.lineTo(4.2,-5);ctx.lineTo(0,4);ctx.lineTo(-4.2,-5);ctx.closePath();ctx.fill();
    // Cockpit glass with twin reflections.
    const cockpit=ctx.createLinearGradient(-4,-24,4,-8);cockpit.addColorStop(0,'#c8f7ff');cockpit.addColorStop(.23,'#49c7e9');cockpit.addColorStop(.62,'#165477');cockpit.addColorStop(1,'#07172c');ctx.fillStyle=cockpit;ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(4.2,-12);ctx.lineTo(0,-8);ctx.lineTo(-4.2,-12);ctx.closePath();ctx.fill();ctx.strokeStyle='#ddfaff';ctx.lineWidth=.6;ctx.stroke();ctx.strokeStyle='#ffffffb8';ctx.beginPath();ctx.moveTo(-1,-24);ctx.lineTo(1,-16);ctx.stroke();
    // Navigation lights and hull panel seams.
    ctx.fillStyle='#ffbd82';ctx.shadowColor='#ffad71';ctx.shadowBlur=6;ctx.fillRect(-23,7,3,2.5);ctx.fillRect(20,7,3,2.5);ctx.shadowBlur=0;ctx.fillStyle='#a7f0ff';ctx.fillRect(-6,11,3,2);ctx.fillRect(3,11,3,2);
    ctx.strokeStyle='#f5fcff4e';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-7,3);ctx.moveTo(13,0);ctx.lineTo(7,3);ctx.moveTo(-4,6);ctx.lineTo(-4,10);ctx.moveTo(4,6);ctx.lineTo(4,10);ctx.stroke();
    ctx.restore();
  }
  function drawAsteroid(ctx,a,p) {
    const x=p.x,y=p.y,r=p.r;ctx.save();ctx.translate(x,y);ctx.rotate(a.angle);
    const ice=a.kind==='ice';ctx.shadowColor=ice?'#82d9ff':'#ffad6c';ctx.shadowBlur=Math.min(22,r*.65);
    const g=ctx.createLinearGradient(-r,-r,r,r);if(ice){g.addColorStop(0,'#ecf8ff');g.addColorStop(.22,'#a4c4d8');g.addColorStop(.55,'#526f88');g.addColorStop(1,'#152438');}else{g.addColorStop(0,'#e1c2a2');g.addColorStop(.23,'#b18a70');g.addColorStop(.54,'#6a514a');g.addColorStop(.82,'#3a3339');g.addColorStop(1,'#181b29');}
    ctx.fillStyle=g;ctx.strokeStyle=ice?'#def8ffdc':'#ffd3a6c8';ctx.lineWidth=Math.max(.65,r*.045);ctx.beginPath();const n=9+Math.floor((a.seed%6));const verts=[];for(let i=0;i<n;i++){const ang=i/n*Math.PI*2;const irregular=.73+(((Math.floor(a.seed/((i+1)*13))^i*17)>>>0)%30)/100;const px=Math.cos(ang)*r*irregular,py=Math.sin(ang)*r*irregular;verts.push([px,py]);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    // Faceted planes catch the light while the far edge remains almost black.
    ctx.globalAlpha=.33;ctx.fillStyle=ice?'#f5fdff':'#e9c9a8';ctx.beginPath();ctx.moveTo(verts[0][0],verts[0][1]);ctx.lineTo(verts[Math.floor(n*.23)][0],verts[Math.floor(n*.23)][1]);ctx.lineTo(verts[Math.floor(n*.48)][0],verts[Math.floor(n*.48)][1]);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    // Craters have bevel rims and deeply shaded floors.
    const craterCount=r>24?7:r>13?5:3;for(let i=0;i<craterCount;i++){const cx=Math.sin(a.seed*.001+i*3.71)*r*.38,cy=Math.cos(a.seed*.0007+i*2.43)*r*.37,cr=r*(.045+((Math.floor(a.seed/((i+2)*7))+i*3)%8)/100);const cg=ctx.createRadialGradient(cx-cr*.28,cy-cr*.35,cr*.08,cx,cy,cr*1.35);cg.addColorStop(0,ice?'#091c2d':'#171820');cg.addColorStop(.62,ice?'#31495e':'#42363a');cg.addColorStop(.84,ice?'#b8d9ec':'#d0a282');cg.addColorStop(1,'#00000000');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(cx,cy,cr*1.3,cr,Math.sin(i)*.25,0,Math.PI*2);ctx.fill();}
    // Small sharp chips and mineral glints.
    for(let i=0;i<Math.min(18,Math.max(5,Math.floor(r*.42)));i++){const px=Math.sin(a.seed+i*17.37)*r*.78,py=Math.cos(a.seed*.3+i*11.13)*r*.78;ctx.globalAlpha=.13+(i%4)*.07;ctx.fillStyle=i%3===0?'#ffffff':ice?'#a5eaff':'#0b0d16';ctx.beginPath();ctx.arc(px,py,Math.max(.35,r*.012*(i%3+1)),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    if(ice){ctx.strokeStyle='#f0fbffb0';ctx.lineWidth=Math.max(.5,r*.027);ctx.beginPath();ctx.moveTo(-r*.58,-r*.16);ctx.lineTo(-r*.1,r*.03);ctx.lineTo(r*.12,-r*.18);ctx.lineTo(r*.45,-r*.31);ctx.stroke();}
    ctx.restore();
  }
  function drawFlight(ctx,w,h,time) {
    drawBackground(ctx,w,h,time,true);const dest=selectedDestination();const p=state.progress;const focal=Math.min(w,h)*.50;const earthX=w*.14-p*w*.06,earthY=h*.71+p*h*.09,earthR=Math.max(4,Math.min(w,h)*(.10*(1-p)+.016));drawEarth(ctx,earthX,earthY,earthR,time);
    const targetR=Math.min(w,h)*(.018+p*p*.11);const targetX=w*.79-p*w*.24+Math.sin(state.time*.2)*w*.015;const targetY=h*.27-p*h*.03;
    // Soft flight corridor and energy guide, no saved world geometry required.
    ctx.save();ctx.strokeStyle='#7ad5ff30';ctx.lineWidth=1;ctx.setLineDash([4,10]);ctx.beginPath();ctx.moveTo(w*.52,h*.75);ctx.quadraticCurveTo(w*.55,h*.25,targetX,targetY);ctx.stroke();ctx.restore();
    // Draw a faint navigation/orbit sweep behind the destination, so its line is occluded
    // by the planet instead of cutting across the visible surface like an artificial ring.
    if(p>.55){ctx.save();ctx.globalAlpha=(p-.55)*1.15;ctx.strokeStyle='#bdefff55';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(targetX,targetY,targetR*1.16,targetR*.30,-.18,0,Math.PI*2);ctx.stroke();ctx.restore();}
    drawSphere(ctx,targetX,targetY,targetR,dest,time,.55+p*.45);
    for(const a of state.asteroids){const pos=projectHazard(a,w,h);if(pos.x+pos.r< -25||pos.x-pos.r>w+25||pos.y+pos.r< -25||pos.y-pos.r>h+25)continue;drawAsteroid(ctx,a,pos);}
    const sx=w/2+state.playerX*w*.31,sy=state.playerY*h;const tilt=clamp(state.playerX*.14,-.14,.14);drawShip(ctx,sx,sy,time,state.invulnerable,tilt,clamp(Math.min(w,h)/390,0.92,1.42));
    // Edge lighting and soft camera vignette make the scene feel cinematic while staying 2D.
    const beam=ctx.createLinearGradient(w*.5,h*.25,w*.5,h*.85);beam.addColorStop(0,'#8de6ff00');beam.addColorStop(1,'#59b9ff0a');ctx.fillStyle=beam;ctx.fillRect(0,0,w,h);
    if(state.mode==='countdown'){const n=Math.max(1,Math.ceil(state.countdown));ctx.fillStyle='#dff8ff';ctx.globalAlpha=.5+Math.sin(time*.025)*.3;ctx.font=`900 ${Math.min(54,w*.15)}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;ctx.textAlign='center';ctx.fillText(state.countdown>2.2?'IGNITION':String(n),w*.5,h*.52);ctx.globalAlpha=1;}
    if(state.mode==='landing'){const alpha=clamp((.85-state.landingTimer)/.85,0,1);if(alpha>0){ctx.fillStyle=`rgba(1,4,10,${alpha})`;ctx.fillRect(0,0,w,h);}ctx.fillStyle='#e9f7ff';ctx.globalAlpha=clamp(1-state.landingTimer/3.2,0,1);ctx.font='800 10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('DESTINATION APPROACH',w/2,h*.58);ctx.globalAlpha=1;}
    if(state.damageFlash>0){ctx.fillStyle=`rgba(255,65,57,${Math.min(.22,state.damageFlash*.66)})`;ctx.fillRect(0,0,w,h);}
    return focal;
  }
  function drawTerrain(ctx,w,h,dest,time) {
    const id=dest.id;
    const skies={moon:['#01050f','#071a31','#798798'],mars:['#3f1d37','#a34e54','#e4a579'],europa:['#010716','#0d2949','#7f9eaf'],titan:['#35212a','#99573e','#e1a76a']};
    const colors=skies[id]||skies.moon;const sky=ctx.createLinearGradient(0,0,0,h*.73);sky.addColorStop(0,colors[0]);sky.addColorStop(.55,colors[1]);sky.addColorStop(1,colors[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // Atmosphere haze and a distant sun are fully procedural; the Moon keeps a crisp airless horizon.
    if(id!=='moon'&&id!=='europa') {const haze=ctx.createRadialGradient(w*.72,h*.36,2,w*.72,h*.36,Math.min(w,h)*.59);haze.addColorStop(0,id==='mars'?'#ffbf875d':'#ffc67b54');haze.addColorStop(.28,id==='mars'?'#ea76512a':'#e7a35d24');haze.addColorStop(1,'#e8a35b00');ctx.fillStyle=haze;ctx.fillRect(0,0,w,h*.73);}
    if(id==='moon'||id==='europa'){
      for(let i=0;i<118;i++){const x=(latticeNoise(i,13,5)*w),y=(latticeNoise(i,29,7)*h*.54);const a=.18+latticeNoise(i,31,9)*.62;ctx.globalAlpha=a;ctx.fillStyle=i%9===0?'#a7dfff':'#ffffff';ctx.beginPath();ctx.arc(x,y,.25+latticeNoise(i,37,11)*.85,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    }
    if(id==='moon'){
      const earthR=Math.min(w,h)*.060;drawEarth(ctx,w*.22,h*.205,earthR,time);
      // faint blue earthshine is reflected from the distant planet into the sky
      const earthGlow=ctx.createRadialGradient(w*.22,h*.205,earthR*.5,w*.22,h*.205,earthR*2.5);earthGlow.addColorStop(0,'#54bfff18');earthGlow.addColorStop(1,'#54bfff00');ctx.fillStyle=earthGlow;ctx.fillRect(0,0,w,h*.5);
    } else if(id==='mars') {
      const sun=ctx.createRadialGradient(w*.78,h*.29,2,w*.78,h*.29,Math.min(w,h)*.24);sun.addColorStop(0,'#ffe5ae');sun.addColorStop(.1,'#ffb26b8c');sun.addColorStop(1,'#ff8c5900');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h*.64);
    } else if(id==='europa') {
      const j=ctx.createRadialGradient(w*.76,h*.20,2,w*.76,h*.20,Math.min(w,h)*.20);j.addColorStop(0,'#e2bd9a');j.addColorStop(.32,'#b77a64');j.addColorStop(.6,'#69445a');j.addColorStop(1,'#251c3700');ctx.fillStyle=j;ctx.fillRect(0,0,w,h*.5);
    } else {
      const sun=ctx.createRadialGradient(w*.67,h*.32,2,w*.67,h*.32,Math.min(w,h)*.28);sun.addColorStop(0,'#ffe1a5');sun.addColorStop(.1,'#ffb75a94');sun.addColorStop(1,'#ef8b4700');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h*.6);
    }
    const horizon=h*.56;
    // Distant serrated mountains: multiple frequencies create realistic silhouettes.
    const ridge=(depth,phase,amp)=>{const pts=[];ctx.beginPath();ctx.moveTo(0,horizon+depth);for(let x=0;x<=w+8;x+=5){const fract=smoothNoise(x+phase*13,phase*31,19,phase*7+17);const sharp=Math.sin(x*.057+phase*2.2)*.006;const serr=Math.sin(x*(.012+depth*.00004)+phase)*.020+Math.sin(x*.031+phase*2.7)*.012+(fract-.5)*.045+sharp;const py=horizon+depth+serr*h*amp;pts.push([x,py]);ctx.lineTo(x,py);}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();ctx.beginPath();pts.forEach((pt,i)=>{if(i===0)ctx.moveTo(pt[0],pt[1]);else ctx.lineTo(pt[0],pt[1]);});ctx.strokeStyle=id==='moon'?'#dce8f52a':id==='mars'?'#ffd0a02a':id==='europa'?'#dff9ff2f':'#ffe0ae2b';ctx.lineWidth=1.15;ctx.stroke();};
    ctx.fillStyle=id==='moon'?'#131b2a':id==='mars'?'#4d2d3b':id==='europa'?'#203951':'#49302b';ridge(-h*.035,1.4,1.35);
    ctx.fillStyle=id==='moon'?'#293545':id==='mars'?'#793e43':id==='europa'?'#385a72':'#704532';ridge(h*.035,2.8,1.05);
    ctx.fillStyle=id==='moon'?'#3e4958':id==='mars'?'#a4514a':id==='europa'?'#67899e':'#9a623f';ridge(h*.10,4.2,.74);
    const ground=ctx.createLinearGradient(0,horizon,0,h);ground.addColorStop(0,id==='moon'?'#858b96':id==='mars'?'#bb6e5b':id==='europa'?'#b4d2df':'#c18b53');ground.addColorStop(.16,id==='moon'?'#616c7a':id==='mars'?'#985348':id==='europa'?'#7a9cad':'#9c6940');ground.addColorStop(.50,id==='moon'?'#353f4e':id==='mars'?'#69353a':id==='europa'?'#466d84':'#63412f');ground.addColorStop(1,'#080e19');ctx.fillStyle=ground;ctx.fillRect(0,horizon,w,h-horizon);
    // Ground texture: tiny light-facing pebbles and darker regolith flecks, generated from stable seeds.
    const count=Math.floor(w*h/1300);for(let i=0;i<count;i++){const x=latticeNoise(i,17,21)*w,y=horizon+latticeNoise(i,41,23)*(h-horizon),depth=(y-horizon)/(h-horizon),sz=.30+depth*2.05;ctx.globalAlpha=.16+latticeNoise(i,57,25)*.28;ctx.fillStyle=i%4===0?'#fff4dd':id==='moon'?'#101a2b':id==='mars'?'#401f2a':id==='europa'?'#d9f7ff':'#392224';ctx.beginPath();ctx.ellipse(x,y,sz*2.2,sz*.75,latticeNoise(i,71,27)*.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    // Large craters and depressions are shaded bowls, not flat outlined circles.
    const craterCount=id==='moon'?15:id==='europa'?10:7;for(let i=0;i<craterCount;i++){const x=latticeNoise(i,65,dest.seed)*w,y=horizon+(h-horizon)*(.10+latticeNoise(i,93,dest.seed+19)*.78),depth=(y-horizon)/(h-horizon),r=(Math.min(w,h)*(.018+latticeNoise(i,99,dest.seed+23)*.045))*(.52+depth*1.2);const cg=ctx.createRadialGradient(x-r*.14,y-r*.26,r*.06,x,y,r*1.4);cg.addColorStop(0,'#121b2a99');cg.addColorStop(.55,'#17202d9b');cg.addColorStop(.76,id==='moon'?'#c5cbd170':id==='mars'?'#e7a48a70':id==='europa'?'#ebfcff9b':'#e5b98770');cg.addColorStop(1,'#00000000');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(x,y,r*1.5,r*.65,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f7f5e82b';ctx.lineWidth=Math.max(.5,r*.035);ctx.beginPath();ctx.ellipse(x-r*.07,y-r*.05,r*1.2,r*.5,0,Math.PI*1.1,Math.PI*1.85);ctx.stroke();}
    // Three long silhouettes anchor the landscape and give the astronaut places to explore.
    const points=[{x:w*.16,y:horizon+h*.07,r:Math.min(w,h)*.052,label:'Crater Ridge'},{x:w*.54,y:horizon+h*.025,r:Math.min(w,h)*.072,label:'Rock Formation'},{x:w*.84,y:horizon+h*.09,r:Math.min(w,h)*.041,label:'Horizon Marker'}];
    for(const p of points){ctx.fillStyle=id==='moon'?'#aeb8c7':id==='mars'?'#d18a70':id==='europa'?'#d2e9f2':'#d5a16d';ctx.beginPath();ctx.moveTo(p.x-p.r*2,p.y+p.r*.25);ctx.lineTo(p.x-p.r*.95,p.y-p.r*.65);ctx.lineTo(p.x-p.r*.32,p.y-p.r*.85);ctx.lineTo(p.x+p.r*.25,p.y-p.r*.36);ctx.lineTo(p.x+p.r*.9,p.y-p.r*.28);ctx.lineTo(p.x+p.r*2,p.y+p.r*.3);ctx.closePath();ctx.fill();const shadow=ctx.createLinearGradient(p.x-p.r,p.y-p.r,p.x+p.r,p.y+p.r);shadow.addColorStop(0,'#ffffff30');shadow.addColorStop(1,'#00000080');ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*1.55,p.r*.42,0,0,Math.PI*2);ctx.fill();}
    // Fine atmospheric dust toward the horizon gives scale without costly geometry.
    if(id==='mars'||id==='titan'){ctx.globalAlpha=.11;for(let i=0;i<70;i++){const x=latticeNoise(i,101,seed)*w,y=horizon-latticeNoise(i,121,seed+1)*h*.18;ctx.fillStyle='#ffd6aa';ctx.fillRect(x,y,1.2,1.2);}ctx.globalAlpha=1;}
    return {horizon,points};
  }
  function drawAstronaut(ctx,x,y,scale,time) {
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const stride=state?.mode==='surface'?Math.sin(time*.011)*3.8:0;const armSwing=state?.mode==='surface'?Math.sin(time*.011)*2.5:0;
    // Long cast shadow and a small local blue-white rim light.
    const shadow=ctx.createRadialGradient(0,3,1,0,3,25);shadow.addColorStop(0,'#0009169e');shadow.addColorStop(1,'#00040a00');ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,4,28,8,0,0,Math.PI*2);ctx.fill();
    // Backpack with straps, indicator lights and side canisters.
    const pack=ctx.createLinearGradient(-17,-34,-5,-13);pack.addColorStop(0,'#f0fbff');pack.addColorStop(.36,'#91a9b9');pack.addColorStop(1,'#344c62');ctx.fillStyle=pack;ctx.strokeStyle='#e4f7ff';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-17,-35,12,24,3);ctx.fill();ctx.stroke();ctx.fillStyle='#233d53';ctx.fillRect(-15,-30,8,11);ctx.fillStyle='#57d9ff';ctx.shadowColor='#57d9ff';ctx.shadowBlur=5;ctx.fillRect(-14,-28,3,3);ctx.shadowBlur=0;ctx.fillStyle='#e9f4fb';ctx.fillRect(-14,-19,6,2);
    // Boots and legs with independent gait.
    ctx.lineCap='round';ctx.strokeStyle='#d9e8f2';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-5,-13);ctx.lineTo(-7+stride,-4);ctx.lineTo(-10+stride,-1);ctx.moveTo(5,-13);ctx.lineTo(7-stride,-4);ctx.lineTo(10-stride,-1);ctx.stroke();ctx.fillStyle='#263e54';ctx.beginPath();ctx.roundRect(-14+stride,-3,8,4,1.5);ctx.roundRect(6-stride,-3,8,4,1.5);ctx.fill();ctx.strokeStyle='#e7f8ff';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-13+stride,-1);ctx.lineTo(-7+stride,-1);ctx.moveTo(7-stride,-1);ctx.lineTo(13-stride,-1);ctx.stroke();
    // Suit torso, ribbed joints and chest life-support panel.
    const suit=ctx.createLinearGradient(-12,-33,12,-12);suit.addColorStop(0,'#ffffff');suit.addColorStop(.25,'#e8f4fa');suit.addColorStop(.55,'#b4c9d7');suit.addColorStop(.82,'#8097aa');suit.addColorStop(1,'#41596f');ctx.fillStyle=suit;ctx.strokeStyle='#f5fcff';ctx.lineWidth=1.1;ctx.beginPath();ctx.roundRect(-10,-34,20,23,5);ctx.fill();ctx.stroke();ctx.fillStyle='#7e98ad';ctx.fillRect(-8,-31,2,15);ctx.fillRect(6,-31,2,15);ctx.fillStyle='#1c3850';ctx.beginPath();ctx.roundRect(-5,-29,10,8,2);ctx.fill();ctx.fillStyle='#56d9ff';ctx.shadowColor='#56d9ff';ctx.shadowBlur=5;ctx.fillRect(-3,-27,6,2);ctx.shadowBlur=0;ctx.fillStyle='#f6ffff';ctx.fillRect(-3,-23,6,1);
    // Arms swing subtly while walking; gloves have a clear silhouette.
    ctx.strokeStyle='#cadce7';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-8,-29);ctx.lineTo(-13-armSwing,-21);ctx.moveTo(8,-29);ctx.lineTo(13+armSwing,-21);ctx.stroke();ctx.fillStyle='#405a70';ctx.beginPath();ctx.arc(-13-armSwing,-20,3.2,0,Math.PI*2);ctx.arc(13+armSwing,-20,3.2,0,Math.PI*2);ctx.fill();
    // Helmet with glossy glass, reflective gradient and multiple highlights.
    ctx.fillStyle='#e9f6fd';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,-42,11,0,Math.PI*2);ctx.fill();ctx.stroke();const visor=ctx.createLinearGradient(-9,-51,8,-32);visor.addColorStop(0,'#071b32');visor.addColorStop(.22,'#246c93');visor.addColorStop(.43,'#6de2ff');visor.addColorStop(.63,'#18516f');visor.addColorStop(1,'#061226');ctx.fillStyle=visor;ctx.beginPath();ctx.ellipse(1,-42,8.2,8.4,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b6f4ff';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(1,-42,8.2,-1.06,1.03);ctx.stroke();ctx.strokeStyle='#ffffffcc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-48);ctx.quadraticCurveTo(-1,-49,2,-45);ctx.stroke();ctx.strokeStyle='#8ddfff';ctx.beginPath();ctx.moveTo(3,-38);ctx.lineTo(5,-36);ctx.stroke();
    // Thin helmet microphone and suit stitching.
    ctx.strokeStyle='#b8d5e5';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(7,-35);ctx.lineTo(11,-31);ctx.lineTo(8,-28);ctx.stroke();ctx.strokeStyle='#ffffff60';ctx.beginPath();ctx.moveTo(-7,-16);ctx.lineTo(7,-16);ctx.moveTo(-7,-14);ctx.lineTo(7,-14);ctx.stroke();ctx.restore();
  }
  function drawSurface(ctx,w,h,time) {
    const dest=selectedDestination();drawTerrain(ctx,w,h,dest,time);const horizon=h*.57;
    // Ship rests on the surface at the left, the explorer walks nearby.
    ctx.save();ctx.translate(w*.19,horizon+h*.13);ctx.scale(.98,.98);ctx.fillStyle='#0b1927';ctx.beginPath();ctx.ellipse(0,8,31,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8297a7';ctx.strokeStyle='#d7f3ff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-33);ctx.lineTo(25,10);ctx.lineTo(13,12);ctx.lineTo(0,5);ctx.lineTo(-13,12);ctx.lineTo(-25,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#4bd5ff';ctx.beginPath();ctx.ellipse(0,-12,5,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const ex=w*state.explorerX;const ey=horizon+h*(w>h?.12:.19);drawAstronaut(ctx,ex,ey,Math.max(1,Math.min(1.38,h/660)),time);
    ctx.fillStyle='#d5eafa';ctx.font='700 8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText(dest.name.toUpperCase(),w*.5,h*.13);
    if(state.mode==='arrived'){ctx.fillStyle='#d5edff';ctx.font='800 10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.fillText('LANDING SITE  ·  EXPLORER READY',w*.5,h*.19);}
    if(state.mode==='surface'){
      const marker=ctx.createRadialGradient(ex,ey-50,2,ex,ey-50,32);marker.addColorStop(0,'#9deaff66');marker.addColorStop(1,'#9deaff00');ctx.fillStyle=marker;ctx.beginPath();ctx.arc(ex,ey-50,32,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#def4ff';ctx.font='700 8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.fillText('YOU',ex,ey-58);
    }
    if(state.surfaceFade>0){ctx.fillStyle=`rgba(1,4,10,${clamp(state.surfaceFade,0,.9)})`;ctx.fillRect(0,0,w,h);}
  }
  function render(time) {
    if(!context||!canvas||!state)return;const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;const ctx=context;
    ctx.save();if(state.shake>0&&state.mode==='playing'){ctx.translate((Math.sin(time*.09)*state.shake*10),(Math.cos(time*.13)*state.shake*8));}
    if(['countdown','playing','landing'].includes(state.mode))drawFlight(ctx,w,h,time);
    else if(state.hasLanded||['arrived','surface','facts'].includes(state.mode))drawSurface(ctx,w,h,time);
    else drawStarMap(ctx,w,h,time);
    ctx.restore();
  }
  function loop(time) {
    if(!active)return;const dt=lastFrame?Math.min(.04,Math.max(0,(time-lastFrame)/1000)):0;lastFrame=time;
    if(!document.hidden)update(dt);render(time);frameId=window.requestAnimationFrame(loop);
  }
  function activate() {
    if(active)return;stage=document.getElementById('le-feature-stage');if(!stage)return;
    addStyle();stageCard=stage.querySelector('.le-feature-stage-card');if(stageCard)stageCard.hidden=true;stage.classList.add('le-aw-active');
    loadSharedMoonSurface();savedProgress=readProgress();active=true;resetRandom(hashString(`${VERSION}:${Date.now()}`));state=createState();stars=makeStars(170);buildUI();showIntro();lastFrame=0;frameId=window.requestAnimationFrame(loop);
  }
  function deactivate() {
    active=false;pointerDown=false;if(frameId)window.cancelAnimationFrame(frameId);frameId=0;
    if(resizeHandler){window.removeEventListener('resize',resizeHandler);window.removeEventListener('orientationchange',resizeHandler);window.visualViewport?.removeEventListener('resize',resizeHandler);}if(keyDownHandler)window.removeEventListener('keydown',keyDownHandler);if(keyUpHandler)window.removeEventListener('keyup',keyUpHandler);
    resizeHandler=keyDownHandler=keyUpHandler=null;if(root)root.remove();root=null;canvas=null;context=null;ui=null;state=null;stars=[];planetTextureCache.clear();if(stage)stage.classList.remove('le-aw-active');if(stageCard)stageCard.hidden=false;stage=null;stageCard=null;
  }
  function install() {
    const api=window.LiveEarthFeatureViews;if(!api||typeof api.register!=='function')return false;
    api.register(FEATURE_ID,{title:'Alien World',shortLabel:'Alien World',symbol:'🛸',description:'A cinematic mathematical universe with selectable destinations, procedural 2.5D flight, and astronaut exploration.',connected:true,activate,deactivate});return true;
  }
  if(!install()){window.addEventListener('live-earth-feature-views-ready',install,{once:true});document.addEventListener('DOMContentLoaded',install,{once:true});}
})();
