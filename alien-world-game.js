/* LIVE // EARTH — ALIEN WORLD V99: mathematical universe + cinematic 2.5D game.
   All game visuals are drawn procedurally on Canvas 2D using perspective projection,
   lighting gradients and reusable mathematical shapes. No external assets, network,
   geolocation, accounts or cloud services. The universe map is illustrative, not to scale;
   destination facts are kept separate from generated game-space coordinates. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldGameInstalled) return;
  window.__liveEarthAlienWorldGameInstalled = true;

  const FEATURE_ID = 'alien-world';
  const VERSION = 'v99-mathematical-universe-cinematic-2p5d';
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
    .le-aw-panel-wrap{position:absolute;z-index:4;inset:0;display:grid;place-items:center;padding:calc(env(safe-area-inset-top) + 58px) 14px calc(env(safe-area-inset-bottom) + 124px);pointer-events:none}
    .le-aw-panel{width:min(90vw,440px);max-height:100%;overflow:auto;padding:clamp(16px,4.5vw,24px);border:1px solid #b5ddff40;border-radius:24px;background:linear-gradient(150deg,#071a2bf0,#030812f2);box-shadow:inset 1px 1px 2px #ffffff18,0 18px 52px #0009,0 0 34px #66baff12;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);text-align:center;pointer-events:auto;overscroll-behavior:contain;scrollbar-width:none}
    .le-aw-panel::-webkit-scrollbar{display:none}
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
    state.mode = mode; ui.facts.className = 'le-aw-facts'; ui.emblem.textContent = emblemText; ui.eyebrow.textContent = eyebrow; ui.title.textContent = title; ui.copy.textContent = copy; ui.facts.replaceChildren(); ui.primary.textContent = primaryText; ui.secondary.textContent = secondaryText; ui.wrap.classList.remove('le-aw-hidden'); ui.controls.classList.add('le-aw-hidden');
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
    state.mode='surface'; state.hasLanded=true; state.explorerDirection=0; state.explorerX=.48;
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
  function drawBackground(ctx,w,h,time,flight=false) {
    const bg=ctx.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#030816');bg.addColorStop(.45,'#071b31');bg.addColorStop(.76,'#06111f');bg.addColorStop(1,'#01040b');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    const neb=ctx.createRadialGradient(w*.68,h*.25,4,w*.68,h*.25,Math.max(w,h)*.76);neb.addColorStop(0,'#1a5c8732');neb.addColorStop(.45,'#16385a18');neb.addColorStop(1,'#02071100');ctx.fillStyle=neb;ctx.fillRect(0,0,w,h);
    // Low-cost layered starfield. The apparent drift differs by depth to imply vast space.
    for(const star of stars) {
      let x,y,z=star.z;
      if(flight&&state?.mode==='playing') z-=state.progress*.22;
      if(flight) {const den=Math.max(.20,z);x=w/2+star.x*w*.32/den;y=h*.30+star.y*h*.25/den;}
      else {x=star.x*w*.5+w*.5;y=((star.y+.55)*h*.58+(time*star.speed*.8))%(h*.72);}
      if(x< -4||x>w+4||y< -4||y>h+4) continue;
      const twinkle=.35+(.5+.5*Math.sin(time*1.3+star.phase))*.65;ctx.globalAlpha=twinkle;ctx.fillStyle=star.tint>.85?'#9edfff':'#e0f1ff';ctx.beginPath();ctx.arc(x,y,star.size*(flight?1+1/(z+.5)*.4:1),0,Math.PI*2);ctx.fill();
      if(flight&&z<.42){ctx.globalAlpha=twinkle*.42;ctx.strokeStyle='#9edfff';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-star.x*12,y-star.y*9-7);ctx.stroke();}
    }
    ctx.globalAlpha=1;
    const vignette=ctx.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.18,w*.5,h*.48,Math.max(w,h)*.76);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#0009147a');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }
  function drawSphere(ctx,x,y,r,dest,time,alpha=1) {
    if(r<=0)return;const pal=dest?.palette||['#a5e8ff','#247cb8','#12334e','#020713'];ctx.save();ctx.globalAlpha=alpha;
    const glow=ctx.createRadialGradient(x,y,r*.45,x,y,r*1.5);glow.addColorStop(0,pal[1]+'28');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r*1.5,0,Math.PI*2);ctx.fill();
    const g=ctx.createRadialGradient(x-r*.35,y-r*.42,r*.03,x+r*.08,y+r*.08,r*1.2);g.addColorStop(0,pal[0]);g.addColorStop(.38,pal[1]);g.addColorStop(.73,pal[2]);g.addColorStop(1,pal[3]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(x,y,r*.97,0,Math.PI*2);ctx.clip();
    const id=dest?.id||'earth';
    if(id==='earth'){
      ctx.fillStyle='#50b78b88';ctx.beginPath();ctx.ellipse(x-r*.24,y-r*.08,r*.28,r*.45,-.45,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+r*.39,y+r*.20,r*.14,r*.26,.25,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#bfefff55';ctx.lineWidth=Math.max(.6,r*.045);ctx.beginPath();ctx.ellipse(x,y,r*.89,r*.23,Math.sin(time*.3)*.08,0,Math.PI*2);ctx.stroke();
    } else if(id==='moon'){
      for(let i=0;i<Math.min(24,Math.max(5,Math.floor(r*.22)));i++){const a=i*2.399,dist=(.18+((i*37)%63)/100)*r,cr=r*(.035+((i*13)%6)/120);const cx=x+Math.cos(a)*dist,cy=y+Math.sin(a)*dist;ctx.fillStyle='#141d2a30';ctx.beginPath();ctx.ellipse(cx,cy,cr*1.25,cr,.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff35';ctx.lineWidth=Math.max(.45,r*.007);ctx.beginPath();ctx.arc(cx-cr*.16,cy-cr*.16,cr*.85,Math.PI,Math.PI*1.65);ctx.stroke();}
    } else if(id==='mars'){
      ctx.fillStyle='#5b292b68';for(let i=0;i<10;i++){const cx=x+Math.sin(i*8.13)*r*.66,cy=y+Math.cos(i*4.37)*r*.58,cr=r*(.06+(i%3)*.025);ctx.beginPath();ctx.ellipse(cx,cy,cr*1.5,cr*.65,.35,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='#ffd2a455';ctx.lineWidth=Math.max(.5,r*.018);ctx.beginPath();ctx.ellipse(x-r*.1,y+r*.2,r*.7,r*.15,-.15,0,Math.PI*2);ctx.stroke();
    } else if(id==='europa'){
      ctx.strokeStyle='#e9f6ff8c';ctx.lineWidth=Math.max(.7,r*.017);for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(x-r*.9,y-r*(.55-i*.12));ctx.bezierCurveTo(x-r*.25,y-r*(.45-i*.12),x+r*.15,y+r*(.14+i*.10),x+r*.88,y+r*(.2-i*.12));ctx.stroke();}
    } else if(id==='titan'){
      ctx.globalAlpha*=.5;ctx.fillStyle='#f4bd7370';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(x+Math.sin(i*3.4)*r*.4,y+Math.cos(i*2.8)*r*.5,r*.28,r*.07,i*.4,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
    // Atmosphere/rim and terminator give the sphere a more cinematic rendered feel.
    ctx.strokeStyle=pal[0]+'7a';ctx.lineWidth=Math.max(.7,r*.035);ctx.beginPath();ctx.arc(x,y,r*.99,-Math.PI*.94,Math.PI*.7);ctx.stroke();
    const shadow=ctx.createLinearGradient(x-r,y-r*.1,x+r,y+r*.15);shadow.addColorStop(0,'#00000000');shadow.addColorStop(.55,'#00000004');shadow.addColorStop(1,'#000b1980');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawEarth(ctx,x,y,r,time) { drawSphere(ctx,x,y,r,{id:'earth',palette:['#c8f7ff','#2b94cf','#123a6d','#020816']},time); }
  // Destination records store mathematical X/Y/depth coordinates. The map applies
  // a lightweight perspective projection: this creates spatial depth without a 3D engine
  // or storing a 3D environment for each world. Coordinates are game-space, not astronomy.
  function projectMapPoint(destination,w,h,originX,originY) {
    const position=destination.map;
    const perspective=1/(1+Math.max(0,position.z||0)*.28);
    return {
      x:originX+(position.x||0)*w*.33*perspective,
      y:originY+(position.y||0)*h*.34*perspective,
      perspective
    };
  }
  function drawStarMap(ctx,w,h,time) {
    drawBackground(ctx,w,h,time,false);
    const earthX=w*.19,earthY=h*.53,earthR=Math.min(w,h)*.092;drawEarth(ctx,earthX,earthY,earthR,time);
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
      ctx.fillStyle=d.id===state.selectedId?'#e8f8ff':'#99b5cb';ctx.font=`${d.id===state.selectedId?'700':'500'} ${Math.max(9,Math.min(12,w*.027))}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;ctx.textAlign='center';ctx.fillText(d.name.toUpperCase(),x,y+r+15);
    }
    ctx.fillStyle='#7398b3';ctx.font='8px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('GAME-SPACE MAP · NOT TO SCALE',w*.5,h*.93);
  }
  function drawShip(ctx,x,y,time,invulnerable,tilt=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);if(invulnerable>0&&Math.floor(time*18)%2===0)ctx.globalAlpha=.34;
    // Engine plume and soft glow.
    const flame=11+Math.sin(time*19)*3.2;ctx.shadowColor='#57cfff';ctx.shadowBlur=18;const plume=ctx.createLinearGradient(0,7,0,35+flame);plume.addColorStop(0,'#ecfbff');plume.addColorStop(.35,'#64ddff');plume.addColorStop(1,'#2c71ff00');ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(-5,7);ctx.lineTo(0,23+flame);ctx.lineTo(5,7);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    // Wing silhouette with faceted metal shading.
    ctx.fillStyle='#526f8d';ctx.strokeStyle='#d5f5ff';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(16,9);ctx.lineTo(10,15);ctx.lineTo(2,9);ctx.lineTo(0,13);ctx.lineTo(-2,9);ctx.lineTo(-10,15);ctx.lineTo(-16,9);ctx.closePath();ctx.fill();ctx.stroke();
    const body=ctx.createLinearGradient(-8,-8,8,8);body.addColorStop(0,'#ffffff');body.addColorStop(.35,'#cbe5f4');body.addColorStop(.65,'#7898b6');body.addColorStop(1,'#26394f');ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(0,-27);ctx.lineTo(8,6);ctx.lineTo(0,12);ctx.lineTo(-8,6);ctx.closePath();ctx.fill();
    ctx.fillStyle='#102b49';ctx.beginPath();ctx.ellipse(0,-7,3.8,6.3,-.04,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b8f2ff';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(-.7,-8,2.4,3.6,-.15,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
    ctx.fillStyle='#e0f8ff';ctx.fillRect(-11,9,3,2);ctx.fillRect(8,9,3,2);ctx.restore();
  }
  function drawAsteroid(ctx,a,p) {
    const x=p.x,y=p.y,r=p.r;ctx.save();ctx.translate(x,y);ctx.rotate(a.angle);ctx.shadowColor=a.kind==='ice'?'#82d9ff':'#ffad6c';ctx.shadowBlur=Math.min(16,r*.55);
    const g=ctx.createLinearGradient(-r,-r,r,r);if(a.kind==='ice'){g.addColorStop(0,'#e6f4fb');g.addColorStop(.35,'#789cb7');g.addColorStop(1,'#263a55');}else{g.addColorStop(0,'#d5ad8c');g.addColorStop(.35,'#76584e');g.addColorStop(1,'#292733');}
    ctx.fillStyle=g;ctx.strokeStyle=a.kind==='ice'?'#c8f0ffb0':'#ffcfaa84';ctx.lineWidth=Math.max(.6,r*.055);ctx.beginPath();const n=8+Math.floor((a.seed%5));for(let i=0;i<n;i++){const angle=i/n*Math.PI*2;const irregular=.70+(((Math.floor(a.seed/((i+1)*13))^i*17)>>>0)%30)/100;const px=Math.cos(angle)*r*irregular,py=Math.sin(angle)*r*irregular;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#171b278a';for(let i=0;i<3;i++){const cx=Math.sin(a.seed+i*3.7)*r*.36,cy=Math.cos(a.seed*.7+i*2.1)*r*.35,cr=r*(.08+i*.025);ctx.beginPath();ctx.ellipse(cx,cy,cr*1.3,cr,.35*i,0,Math.PI*2);ctx.fill();}
    if(a.kind==='ice'){ctx.strokeStyle='#f0fbff8a';ctx.lineWidth=Math.max(.5,r*.04);ctx.beginPath();ctx.moveTo(-r*.55,-r*.15);ctx.lineTo(r*.12,r*.18);ctx.lineTo(r*.43,-r*.35);ctx.stroke();}ctx.restore();
  }
  function drawFlight(ctx,w,h,time) {
    drawBackground(ctx,w,h,time,true);const dest=selectedDestination();const p=state.progress;const focal=Math.min(w,h)*.50;const earthX=w*.14-p*w*.06,earthY=h*.71+p*h*.09,earthR=Math.max(4,Math.min(w,h)*(.10*(1-p)+.016));drawEarth(ctx,earthX,earthY,earthR,time);
    const targetR=Math.min(w,h)*(.018+p*p*.11);const targetX=w*.79-p*w*.24+Math.sin(state.time*.2)*w*.015;const targetY=h*.27-p*h*.03;
    // Soft flight corridor and energy guide, no saved world geometry required.
    ctx.save();ctx.strokeStyle='#7ad5ff30';ctx.lineWidth=1;ctx.setLineDash([4,10]);ctx.beginPath();ctx.moveTo(w*.52,h*.75);ctx.quadraticCurveTo(w*.55,h*.25,targetX,targetY);ctx.stroke();ctx.restore();
    drawSphere(ctx,targetX,targetY,targetR,dest,time,.55+p*.45);
    if(p>.55){ctx.save();ctx.globalAlpha=(p-.55)*1.6;ctx.strokeStyle='#bdefff88';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(targetX,targetY,targetR*1.12,targetR*.26,-.18,0,Math.PI*2);ctx.stroke();ctx.restore();}
    for(const a of state.asteroids){const pos=projectHazard(a,w,h);if(pos.x+pos.r< -25||pos.x-pos.r>w+25||pos.y+pos.r< -25||pos.y-pos.r>h+25)continue;drawAsteroid(ctx,a,pos);}
    const sx=w/2+state.playerX*w*.31,sy=state.playerY*h;const tilt=clamp(state.playerX*.14,-.14,.14);drawShip(ctx,sx,sy,time,state.invulnerable,tilt);
    // Edge lighting and soft camera vignette make the scene feel cinematic while staying 2D.
    const beam=ctx.createLinearGradient(w*.5,h*.25,w*.5,h*.85);beam.addColorStop(0,'#8de6ff00');beam.addColorStop(1,'#59b9ff0a');ctx.fillStyle=beam;ctx.fillRect(0,0,w,h);
    if(state.mode==='countdown'){const n=Math.max(1,Math.ceil(state.countdown));ctx.fillStyle='#dff8ff';ctx.globalAlpha=.5+Math.sin(time*.025)*.3;ctx.font=`900 ${Math.min(54,w*.15)}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;ctx.textAlign='center';ctx.fillText(state.countdown>2.2?'IGNITION':String(n),w*.5,h*.52);ctx.globalAlpha=1;}
    if(state.mode==='landing'){const alpha=clamp((.85-state.landingTimer)/.85,0,1);if(alpha>0){ctx.fillStyle=`rgba(1,4,10,${alpha})`;ctx.fillRect(0,0,w,h);}ctx.fillStyle='#e9f7ff';ctx.globalAlpha=clamp(1-state.landingTimer/3.2,0,1);ctx.font='800 10px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('DESTINATION APPROACH',w/2,h*.58);ctx.globalAlpha=1;}
    if(state.damageFlash>0){ctx.fillStyle=`rgba(255,65,57,${Math.min(.22,state.damageFlash*.66)})`;ctx.fillRect(0,0,w,h);}
    return focal;
  }
  function drawTerrain(ctx,w,h,dest,time) {
    const sky=ctx.createLinearGradient(0,0,0,h*.68);const id=dest.id;
    if(id==='mars'||id==='titan'){sky.addColorStop(0,id==='mars'?'#572f42':'#593b31');sky.addColorStop(.5,id==='mars'?'#bd755c':'#c78c51');sky.addColorStop(1,id==='mars'?'#e6aa7b':'#ddaa67');}
    else if(id==='europa'){sky.addColorStop(0,'#020918');sky.addColorStop(.65,'#122c49');sky.addColorStop(1,'#647e93');}
    else{sky.addColorStop(0,'#020611');sky.addColorStop(.62,'#0b1930');sky.addColorStop(1,'#788291');}
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    if(id==='moon'){
      const earthR=Math.min(w,h)*.052;drawEarth(ctx,w*.23,h*.19,earthR,time);ctx.globalAlpha=.25;ctx.fillStyle='#8ba1b7';for(let i=0;i<80;i++){const x=(i*73%w),y=(i*37%Math.max(1,h*.6));ctx.fillRect(x,y,.7,.7);}ctx.globalAlpha=1;
    } else if(id==='mars'){
      // Distant dark planet and faint dust haze.
      const glow=ctx.createRadialGradient(w*.78,h*.25,2,w*.78,h*.25,Math.min(w,h)*.30);glow.addColorStop(0,'#ffd5a04b');glow.addColorStop(1,'#ffd5a000');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h*.6);
    } else if(id==='europa'){
      const jup=ctx.createRadialGradient(w*.76,h*.2,3,w*.76,h*.2,Math.min(w,h)*.18);jup.addColorStop(0,'#e7b98c');jup.addColorStop(.5,'#9b6d59');jup.addColorStop(1,'#321e2c00');ctx.fillStyle=jup;ctx.fillRect(0,0,w,h*.5);
    } else {
      const haze=ctx.createRadialGradient(w*.5,h*.42,2,w*.5,h*.42,Math.min(w,h)*.6);haze.addColorStop(0,'#e9bd7850');haze.addColorStop(1,'#e9bd7800');ctx.fillStyle=haze;ctx.fillRect(0,0,w,h*.7);
    }
    // Two layers of mathematically shaped hills/ridges imply an enormous surface without terrain files.
    const horizon=h*.57;ctx.fillStyle=id==='moon'?'#29313e':id==='mars'?'#733e39':id==='europa'?'#334d64':'#6c492f';ctx.beginPath();ctx.moveTo(0,horizon);for(let x=0;x<=w+20;x+=20){const y=horizon+Math.sin(x*.008+(id==='europa'?1.8:0))*h*.05+Math.sin(x*.021+1.4)*h*.025;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
    ctx.fillStyle=id==='moon'?'#454e5d':id==='mars'?'#a4513f':id==='europa'?'#728b9a':'#9b6b3e';ctx.beginPath();ctx.moveTo(0,horizon+h*.07);for(let x=0;x<=w+16;x+=16){const y=horizon+h*.08+Math.sin(x*.017+time*.01)*h*.022+Math.cos(x*.009+2)*h*.026;ctx.lineTo(x,y);}ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
    const ground=ctx.createLinearGradient(0,horizon,0,h);ground.addColorStop(0,id==='moon'?'#858a8e':id==='mars'?'#a65b43':id==='europa'?'#b7d1dc':'#b57f4c');ground.addColorStop(.28,id==='moon'?'#505965':id==='mars'?'#7f3e36':id==='europa'?'#597b94':'#815632');ground.addColorStop(1,'#12131c');ctx.fillStyle=ground;ctx.fillRect(0,horizon,w,h-horizon);
    // Scattered rocks/craters are procedural and reused each frame from formulas.
    for(let i=0;i<36;i++){const x=((i*97+Math.sin(i*7.2)*19)%w+w)%w;const y=horizon+((i*47)%Math.max(1,h-horizon));const size=2+(i%5)*1.4;ctx.fillStyle=id==='moon'?'#161f2a77':id==='mars'?'#4f282788':id==='europa'?'#2e536b88':'#4a302677';ctx.beginPath();ctx.ellipse(x,y,size*1.8,size*.62,Math.sin(i)*.15,0,Math.PI*2);ctx.fill();if(i%4===0){ctx.strokeStyle='#ffffff16';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x-size*.2,y-size*.12,size*1.3,size*.45,0,Math.PI,Math.PI*1.8);ctx.stroke();}}
    // Landmark silhouettes are stable, selectable by name, but generated from mathematical outlines.
    const points=[{x:w*.19,y:horizon+h*.05,r:Math.min(w,h)*.045,label:'Crater Ridge'},{x:w*.53,y:horizon+h*.02,r:Math.min(w,h)*.06,label:'Rock Formation'},{x:w*.82,y:horizon+h*.08,r:Math.min(w,h)*.035,label:'Horizon Marker'}];
    for(const p of points){ctx.fillStyle=id==='moon'?'#aeb6bf':id==='mars'?'#c46b51':id==='europa'?'#d4e5ea':'#d7ab69';ctx.beginPath();ctx.ellipse(p.x,p.y,p.r*1.65,p.r*.62,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#11192770';ctx.beginPath();ctx.ellipse(p.x-p.r*.15,p.y,p.r*.72,p.r*.32,0,0,Math.PI*2);ctx.fill();}
    return {horizon,points};
  }
  function drawAstronaut(ctx,x,y,scale,time) {
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const stride=state?.mode==='surface'?Math.sin(time*11)*2.8:0;
    // Cast shadow.
    ctx.fillStyle='#02050b70';ctx.beginPath();ctx.ellipse(0,1,16,4,0,0,Math.PI*2);ctx.fill();
    // Backpack.
    ctx.fillStyle='#516b82';ctx.strokeStyle='#d8f3ff';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-13,-29,9,20,3);ctx.fill();ctx.stroke();
    // Legs and boots.
    ctx.strokeStyle='#dcecf5';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-4,-13);ctx.lineTo(-6+stride,-3);ctx.lineTo(-9+stride,-1);ctx.moveTo(4,-13);ctx.lineTo(6-stride,-3);ctx.lineTo(9-stride,-1);ctx.stroke();
    // Suit body.
    const suit=ctx.createLinearGradient(-9,-30,9,-12);suit.addColorStop(0,'#ffffff');suit.addColorStop(.52,'#d2e6ef');suit.addColorStop(1,'#647c91');ctx.fillStyle=suit;ctx.strokeStyle='#f0fbff';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-9,-31,18,20,5);ctx.fill();ctx.stroke();
    ctx.fillStyle='#a4c6d7';ctx.fillRect(-5,-27,10,7);ctx.fillStyle='#55caff';ctx.fillRect(-3,-25,6,3);
    // Helmet and reflective visor.
    ctx.fillStyle='#d9edf7';ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-38,10,0,Math.PI*2);ctx.fill();ctx.stroke();const visor=ctx.createLinearGradient(-7,-45,6,-31);visor.addColorStop(0,'#173a54');visor.addColorStop(.4,'#4ac4e9');visor.addColorStop(1,'#08182b');ctx.fillStyle=visor;ctx.beginPath();ctx.ellipse(1,-38,7,7.5,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff9a';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(-1,-41,4,Math.PI*1.1,Math.PI*1.65);ctx.stroke();
    // Arms.
    ctx.strokeStyle='#cedfe8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-8,-28);ctx.lineTo(-14,-19);ctx.moveTo(8,-28);ctx.lineTo(13,-19);ctx.stroke();ctx.restore();
  }
  function drawSurface(ctx,w,h,time) {
    const dest=selectedDestination();drawTerrain(ctx,w,h,dest,time);const horizon=h*.57;
    // Ship rests on the surface at the left, the explorer walks nearby.
    ctx.save();ctx.translate(w*.20,horizon+h*.17);ctx.scale(.86,.86);ctx.fillStyle='#0b1927';ctx.beginPath();ctx.ellipse(0,8,31,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8297a7';ctx.strokeStyle='#d7f3ff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-33);ctx.lineTo(25,10);ctx.lineTo(13,12);ctx.lineTo(0,5);ctx.lineTo(-13,12);ctx.lineTo(-25,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#4bd5ff';ctx.beginPath();ctx.ellipse(0,-12,5,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const ex=w*state.explorerX;const ey=horizon+h*.27;drawAstronaut(ctx,ex,ey,Math.max(.82,Math.min(1.25,h/800)),time);
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
    savedProgress=readProgress();active=true;resetRandom(hashString(`${VERSION}:${Date.now()}`));state=createState();stars=makeStars(170);buildUI();showIntro();lastFrame=0;frameId=window.requestAnimationFrame(loop);
  }
  function deactivate() {
    active=false;pointerDown=false;if(frameId)window.cancelAnimationFrame(frameId);frameId=0;
    if(resizeHandler){window.removeEventListener('resize',resizeHandler);window.removeEventListener('orientationchange',resizeHandler);window.visualViewport?.removeEventListener('resize',resizeHandler);}if(keyDownHandler)window.removeEventListener('keydown',keyDownHandler);if(keyUpHandler)window.removeEventListener('keyup',keyUpHandler);
    resizeHandler=keyDownHandler=keyUpHandler=null;if(root)root.remove();root=null;canvas=null;context=null;ui=null;state=null;stars=[];if(stage)stage.classList.remove('le-aw-active');if(stageCard)stageCard.hidden=false;stage=null;stageCard=null;
  }
  function install() {
    const api=window.LiveEarthFeatureViews;if(!api||typeof api.register!=='function')return false;
    api.register(FEATURE_ID,{title:'Alien World',shortLabel:'Alien World',symbol:'🛸',description:'A cinematic mathematical universe with selectable destinations, procedural 2.5D flight, and astronaut exploration.',connected:true,activate,deactivate});return true;
  }
  if(!install()){window.addEventListener('live-earth-feature-views-ready',install,{once:true});document.addEventListener('DOMContentLoaded',install,{once:true});}
})();
