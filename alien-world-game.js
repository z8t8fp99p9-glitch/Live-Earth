/* LIVE // EARTH — Alien World first playable prototype.
   Self-contained procedural canvas game: no external assets, no network calls,
   no location permission, and no persistent storage. Uses the existing Stacks
   feature lifecycle; it does not create or modify the app's real Earth scene. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldGameInstalled) return;
  window.__liveEarthAlienWorldGameInstalled = true;

  const FEATURE_ID = 'alien-world';
  const STYLE_ID = 'le-alien-world-game-style';
  let root = null;
  let canvas = null;
  let context = null;
  let active = false;
  let frameId = 0;
  let resizeHandler = null;
  let keyHandler = null;
  let pointerDown = false;
  let stageCard = null;
  let stage = null;
  let ui = null;
  let lastFrame = 0;
  let elapsed = 0;
  let spawnClock = 0;
  let seed = 1;
  let random = Math.random;
  let state = null;
  let stars = [];

  const STYLE = `
    #le-feature-stage.le-aw-active{display:block!important;overflow:hidden!important;padding:0!important;touch-action:none}
    #le-feature-stage .le-feature-stage-card[hidden]{display:none!important}
    .le-aw-root{position:absolute;inset:0;z-index:7;color:#eef7ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;overflow:hidden}
    .le-aw-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:auto;touch-action:none}
    .le-aw-top{position:absolute;z-index:2;left:16px;right:16px;top:calc(env(safe-area-inset-top) + 12px);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;pointer-events:none}
    .le-aw-brand{font-size:10px;font-weight:850;letter-spacing:.2em;color:#d5ecff;text-shadow:0 2px 12px #000}
    .le-aw-route{margin-top:5px;color:#9fbdd5;font-size:9px;letter-spacing:.12em}
    .le-aw-hud{min-width:112px;padding:9px 11px;border:1px solid #9cd8ff38;border-radius:14px;background:#04101dbd;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 1px 1px 1px #ffffff14,0 8px 24px #0005;text-align:right}
    .le-aw-hud-label{display:block;color:#8eb3cf;font-size:8px;letter-spacing:.12em;text-transform:uppercase}
    .le-aw-hud-value{display:block;margin-top:3px;font-size:13px;font-weight:800;letter-spacing:.04em}
    .le-aw-progress{height:3px;margin-top:7px;overflow:hidden;border-radius:9px;background:#ffffff16}
    .le-aw-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#70d7ff,#b6f2ff);box-shadow:0 0 10px #66d8ff9c;transition:width .12s linear}
    .le-aw-bottom-note{position:absolute;z-index:2;left:50%;bottom:calc(env(safe-area-inset-bottom) + 112px);transform:translateX(-50%);max-width:82vw;padding:8px 12px;border:1px solid #a6d8ff24;border-radius:999px;background:#04101d99;color:#b8d2e5;font-size:9px;letter-spacing:.045em;text-align:center;white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:none}
    .le-aw-panel-wrap{position:absolute;z-index:4;inset:0;display:grid;place-items:center;padding:calc(env(safe-area-inset-top) + 68px) 20px calc(env(safe-area-inset-bottom) + 124px);pointer-events:none}
    .le-aw-panel{width:min(88vw,390px);max-height:100%;overflow:auto;padding:clamp(18px,5vw,25px);border:1px solid #b5ddff40;border-radius:24px;background:linear-gradient(150deg,#071a2beF,#030812f2);box-shadow:inset 1px 1px 2px #ffffff18,0 18px 52px #0009,0 0 28px #66baff10;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);text-align:center;pointer-events:auto;overscroll-behavior:contain}
    .le-aw-emblem{font-size:42px;line-height:1.15;filter:drop-shadow(0 0 14px #85d8ff35)}
    .le-aw-title{margin:10px 0 7px;font-size:clamp(22px,6vw,30px);font-weight:850;letter-spacing:-.025em}
    .le-aw-copy{margin:0 auto;color:#afc8dc;font-size:12px;line-height:1.6;max-width:34em}
    .le-aw-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:16px 0 0;text-align:left}
    .le-aw-fact{padding:10px;border:1px solid #a4d5ff20;border-radius:13px;background:#ffffff07}
    .le-aw-fact strong{display:block;color:#dff4ff;font-size:10px;letter-spacing:.04em}
    .le-aw-fact span{display:block;margin-top:4px;color:#a8c3d8;font-size:10px;line-height:1.4}
    .le-aw-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:17px}
    .le-aw-button{appearance:none;min-height:42px;padding:11px 16px;border:1px solid #9bdcff55;border-radius:999px;background:linear-gradient(135deg,#2d82b96b,#ffffff0a);color:#f0faff;font:800 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .le-aw-button.primary{background:linear-gradient(135deg,#3eafe7,#24699f);border-color:#9ce5ff9c;color:#fff;box-shadow:0 0 22px #3eb8f42b}
    .le-aw-button:active{transform:scale(.98)}
    .le-aw-button:focus-visible{outline:2px solid #a8e9ff;outline-offset:3px}
    .le-aw-hidden{display:none!important}
    @media(orientation:landscape){.le-aw-panel-wrap{padding-top:calc(env(safe-area-inset-top) + 46px);padding-bottom:calc(env(safe-area-inset-bottom) + 94px)}.le-aw-panel{width:min(76vw,450px);padding:16px 20px}.le-aw-emblem{font-size:32px}.le-aw-title{font-size:22px;margin:6px 0}.le-aw-copy{font-size:11px}.le-aw-facts{margin-top:10px}.le-aw-actions{margin-top:10px}}
    @media(prefers-reduced-motion:reduce){.le-aw-progress-fill{transition:none}}
  `;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function seededRandom() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function resetRandom() {
    seed = ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
    random = seededRandom;
  }
  function createState() {
    return { mode: 'intro', progress: 0, hull: 3, shipX: Math.max(100, window.innerWidth * 0.5), asteroids: [], invulnerable: 0, damageFlash: 0, missionSeconds: 34, seed };
  }
  function buildUI() {
    root = node('div', 'le-aw-root');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Alien World spaceflight game prototype');
    canvas = node('canvas', 'le-aw-canvas');
    canvas.setAttribute('aria-label', 'Spaceflight scene. Drag left or right to steer the spaceship and avoid debris.');
    context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    root.appendChild(canvas);

    const top = node('div', 'le-aw-top');
    const brand = node('div', '');
    brand.appendChild(node('div', 'le-aw-brand', 'ALIEN WORLD'));
    brand.appendChild(node('div', 'le-aw-route', 'EARTH  →  MOON  ·  FLIGHT 01'));
    top.appendChild(brand);
    const hud = node('div', 'le-aw-hud');
    const hullLabel = node('span', 'le-aw-hud-label', 'SHIP HULL');
    const hullValue = node('strong', 'le-aw-hud-value', '● ● ●');
    const progress = node('div', 'le-aw-progress');
    const progressFill = node('div', 'le-aw-progress-fill');
    progress.appendChild(progressFill);
    hud.append(hullLabel, hullValue, progress);
    top.appendChild(hud);
    root.appendChild(top);

    const note = node('div', 'le-aw-bottom-note', 'DRAG TO STEER  ·  DODGE THE GLOWING DEBRIS');
    root.appendChild(note);

    const wrap = node('div', 'le-aw-panel-wrap');
    const panel = node('section', 'le-aw-panel');
    panel.setAttribute('aria-live', 'polite');
    const emblem = node('div', 'le-aw-emblem', '🚀');
    const title = node('h1', 'le-aw-title', 'Your first journey awaits');
    const copy = node('p', 'le-aw-copy', 'Launch from Earth, steer through space debris, and reach the Moon. Three hull points. Every collision matters.');
    const facts = node('div', 'le-aw-facts');
    const actions = node('div', 'le-aw-actions');
    const primary = node('button', 'le-aw-button primary', 'Launch mission');
    primary.type = 'button';
    const secondary = node('button', 'le-aw-button', 'Mission briefing');
    secondary.type = 'button';
    actions.append(primary, secondary);
    panel.append(emblem, title, copy, facts, actions);
    wrap.appendChild(panel);
    root.appendChild(wrap);
    stage.appendChild(root);

    ui = { top, hullValue, progressFill, note, wrap, panel, emblem, title, copy, facts, actions, primary, secondary };
    primary.addEventListener('click', () => {
      if (state?.mode === 'arrived') { showMoonFacts(); return; }
      if (state?.mode === 'facts') { startMission(); return; }
      if (state?.mode === 'destroyed') { startMission(); return; }
      if (state?.mode === 'briefing') { startMission(); return; }
      if (state?.mode === 'intro') startMission();
    });
    secondary.addEventListener('click', () => {
      if (state?.mode === 'intro') showBriefing();
      else if (state?.mode === 'briefing') showIntro();
      else if (state?.mode === 'arrived') showMoonFacts();
      else if (state?.mode === 'facts') showArrived();
      else if (state?.mode === 'destroyed') showBriefing();
    });
    canvas.addEventListener('pointerdown', event => {
      if (!active || state?.mode !== 'playing') return;
      pointerDown = true;
      steer(event);
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointermove', event => { if (pointerDown) steer(event); });
    canvas.addEventListener('pointerup', () => { pointerDown = false; });
    canvas.addEventListener('pointercancel', () => { pointerDown = false; });
    resizeHandler = resizeCanvas;
    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('orientationchange', resizeHandler, { passive: true });
    keyHandler = event => {
      if (!active || state?.mode !== 'playing') return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { event.preventDefault(); state.shipX -= Math.max(22, canvas.clientWidth * 0.055); }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { event.preventDefault(); state.shipX += Math.max(22, canvas.clientWidth * 0.055); }
      clampShip();
    };
    window.addEventListener('keydown', keyHandler);
    resizeCanvas();
    showIntro();
  }
  function resizeCanvas() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || window.innerWidth);
    const height = Math.max(1, rect.height || window.innerHeight);
    const dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.min(95, Math.max(44, Math.round(width * height / 9000))) }, () => ({ x: Math.random() * width, y: Math.random() * height, size: 0.45 + Math.random() * 1.4, phase: Math.random() * Math.PI * 2, speed: 5 + Math.random() * 13 }));
    if (state) { state.shipX = Math.min(width - 24, Math.max(24, state.shipX || width * 0.5)); }
  }
  function steer(event) {
    const rect = canvas.getBoundingClientRect();
    state.shipX = event.clientX - rect.left;
    clampShip();
  }
  function clampShip() {
    if (!state || !canvas) return;
    state.shipX = Math.max(24, Math.min(canvas.clientWidth - 24, state.shipX));
  }
  function showIntro() {
    if (!ui) return;
    state.mode = 'intro';
    ui.emblem.textContent = '🚀';
    ui.title.textContent = 'Your first journey awaits';
    ui.copy.textContent = 'Launch from Earth, steer through space debris, and reach the Moon. Three hull points. Every collision matters.';
    ui.facts.replaceChildren();
    ui.primary.textContent = 'Launch mission';
    ui.secondary.textContent = 'Mission briefing';
    ui.wrap.classList.remove('le-aw-hidden');
    ui.note.textContent = 'DRAG TO STEER  ·  DODGE THE GLOWING DEBRIS';
  }
  function showBriefing() {
    if (!ui) return;
    state.mode = 'briefing';
    ui.emblem.textContent = '🧭';
    ui.title.textContent = 'Mission briefing';
    ui.copy.textContent = 'Your route runs from Earth to the Moon. Move your ship horizontally by dragging across the space scene. Glowing debris damages the hull. Three hits end the mission.';
    ui.facts.replaceChildren();
    addFact('MISSION', 'Earth → Moon');
    addFact('SHIP HULL', '3 hits available');
    addFact('CONTROLS', 'Touch-drag or arrow keys');
    addFact('DATA USE', 'Procedural; no network required');
    ui.primary.textContent = 'Begin flight';
    ui.secondary.textContent = 'Back';
    ui.wrap.classList.remove('le-aw-hidden');
    ui.note.textContent = 'READY FOR LAUNCH';
  }
  function showDestroyed() {
    state.mode = 'destroyed';
    ui.emblem.textContent = '💥';
    ui.title.textContent = 'Ship destroyed';
    ui.copy.textContent = 'Too many impacts damaged the hull. Every route is generated mathematically, so you can launch again without downloading a new level.';
    ui.facts.replaceChildren();
    addFact('DISTANCE', `${Math.round(state.progress * 100)}% of route`);
    addFact('HULL', '0 / 3 remaining');
    ui.primary.textContent = 'Retry mission';
    ui.secondary.textContent = 'Mission briefing';
    ui.wrap.classList.remove('le-aw-hidden');
    ui.note.textContent = 'MISSION ENDED';
  }
  function showArrived() {
    state.mode = 'arrived';
    ui.emblem.textContent = '🧑‍🚀';
    ui.title.textContent = 'Landed on the Moon!';
    ui.copy.textContent = 'Landing complete. Your tiny explorer has stepped outside the ship. You made it through the debris field.';
    ui.facts.replaceChildren();
    addFact('GRAVITY', 'About 1/6 of Earth');
    addFact('ATMOSPHERE', 'Almost none');
    addFact('SURFACE', 'Rocky, cratered terrain');
    addFact('NEXT STEP', 'Explore the Moon');
    ui.primary.textContent = 'Explore Moon facts';
    ui.secondary.textContent = 'Fly again';
    ui.wrap.classList.remove('le-aw-hidden');
    ui.note.textContent = 'ARRIVAL CONFIRMED  ·  ASTRONAUT DEPLOYED';
  }
  function showMoonFacts() {
    state.mode = 'facts';
    ui.emblem.textContent = '🧑‍🚀';
    ui.title.textContent = 'Your first world';
    ui.copy.textContent = 'The Moon is Earth’s natural satellite. Its gravity is about one-sixth of Earth’s, it has no substantial atmosphere, and its surface preserves impact craters from billions of years of history.';
    ui.facts.replaceChildren();
    addFact('DISTANCE', 'About 384,400 km from Earth on average');
    addFact('DAY/NIGHT', 'A lunar day lasts about 29.5 Earth days');
    addFact('TEMPERATURE', 'Varies greatly between sunlight and shadow');
    addFact('EXPLORATION', 'Robotic missions and human Apollo landings');
    ui.primary.textContent = 'Fly again';
    ui.secondary.textContent = 'Back to arrival';
    ui.wrap.classList.remove('le-aw-hidden');
    ui.note.textContent = 'DESTINATION LOGGED  ·  MOON';
  }
  function addFact(label, value) {
    const fact = node('div', 'le-aw-fact');
    fact.append(node('strong', '', label), node('span', '', value));
    ui.facts.appendChild(fact);
  }
  function startMission() {
    resetRandom();
    state = createState();
    state.mode = 'playing';
    state.shipX = canvas.clientWidth * 0.5;
    elapsed = 0;
    spawnClock = 0.3;
    lastFrame = 0;
    ui.wrap.classList.add('le-aw-hidden');
    ui.note.textContent = 'DRAG TO STEER  ·  AVOID THE GLOWING DEBRIS';
    updateHUD();
  }
  function updateHUD() {
    if (!ui || !state) return;
    ui.hullValue.textContent = state.hull > 0 ? '● '.repeat(state.hull).trim() : '0 / 3';
    ui.progressFill.style.width = `${Math.max(0, Math.min(100, state.progress * 100))}%`;
    ui.top.style.opacity = state.mode === 'intro' || state.mode === 'briefing' ? '0.58' : '1';
  }
  function update(dt, width, height) {
    if (!state || state.mode !== 'playing') return;
    elapsed += dt;
    state.progress = Math.min(1, elapsed / state.missionSeconds);
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.damageFlash = Math.max(0, state.damageFlash - dt);
    spawnClock -= dt;
    if (spawnClock <= 0) {
      const radius = 8 + random() * 11;
      state.asteroids.push({ x: width * (0.08 + random() * 0.84), y: -radius - 8, radius, speed: 92 + random() * 105 + state.progress * 48, drift: (random() - 0.5) * 40, spin: (random() - 0.5) * 3, angle: random() * Math.PI * 2, seed: random() });
      spawnClock = Math.max(0.38, 0.95 - state.progress * 0.38 + random() * 0.48);
    }
    const shipY = height * 0.77;
    for (let i = state.asteroids.length - 1; i >= 0; i--) {
      const a = state.asteroids[i];
      a.y += a.speed * dt;
      a.x += a.drift * dt;
      a.angle += a.spin * dt;
      if (a.x < 10 || a.x > width - 10) a.drift *= -1;
      if (a.y > height + 40) { state.asteroids.splice(i, 1); continue; }
      if (state.invulnerable <= 0 && Math.abs(a.y - shipY) < a.radius + 11 && Math.abs(a.x - state.shipX) < a.radius + 14) {
        state.asteroids.splice(i, 1);
        state.hull -= 1;
        state.invulnerable = 1.05;
        state.damageFlash = 0.28;
        if (state.hull <= 0) { showDestroyed(); break; }
      }
    }
    if (state.mode === 'playing' && state.progress >= 1) {
      state.asteroids.length = 0;
      showArrived();
    }
    updateHUD();
  }
  function drawPlanet(ctx, x, y, radius, type, time) {
    const gradient = ctx.createRadialGradient(x - radius * 0.32, y - radius * 0.34, radius * 0.06, x, y, radius);
    if (type === 'earth') {
      gradient.addColorStop(0, '#8eeaff'); gradient.addColorStop(0.34, '#2487c6'); gradient.addColorStop(0.72, '#0b345f'); gradient.addColorStop(1, '#020817');
    } else {
      gradient.addColorStop(0, '#f4efda'); gradient.addColorStop(0.38, '#a8a99f'); gradient.addColorStop(0.76, '#555b64'); gradient.addColorStop(1, '#151d29');
    }
    ctx.save(); ctx.shadowColor = type === 'earth' ? '#47baff' : '#c7dcff'; ctx.shadowBlur = type === 'earth' ? 24 : 15;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius * 0.94, 0, Math.PI * 2); ctx.clip();
    if (type === 'earth') {
      ctx.fillStyle = '#54bd91';
      ctx.beginPath(); ctx.ellipse(x - radius * .22, y - radius * .08, radius * .28, radius * .46, -.42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + radius * .36, y + radius * .25, radius * .17, radius * .27, .25, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e3faff77'; ctx.lineWidth = Math.max(1, radius * .06); ctx.beginPath(); ctx.ellipse(x, y, radius * .88, radius * .28, Math.sin(time * .0002) * .1, 0, Math.PI * 2); ctx.stroke();
    } else {
      for (let i = 0; i < 7; i++) { const cx = x + Math.sin(i * 7.1) * radius * .62, cy = y + Math.cos(i * 3.7) * radius * .58, r = radius * (.05 + (i % 3) * .025); ctx.fillStyle = '#343b43aa'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    ctx.strokeStyle = type === 'earth' ? '#a9eeff70' : '#e5edff55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function drawShip(ctx, x, y, time, invulnerable) {
    ctx.save(); ctx.translate(x, y);
    if (invulnerable > 0 && Math.floor(time / 90) % 2 === 0) ctx.globalAlpha = .38;
    ctx.shadowColor = '#7bdcff'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#dff7ff'; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(11, 11); ctx.lineTo(0, 6); ctx.lineTo(-11, 11); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#3189bc'; ctx.beginPath(); ctx.ellipse(0, -2, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (state?.mode === 'playing') {
      const flame = 8 + Math.sin(time * .035) * 4;
      ctx.fillStyle = '#ffb65f'; ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(0, 10 + flame); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b5efff'; ctx.beginPath(); ctx.moveTo(-2, 9); ctx.lineTo(0, 10 + flame * .62); ctx.lineTo(2, 9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawAsteroid(ctx, asteroid) {
    ctx.save(); ctx.translate(asteroid.x, asteroid.y); ctx.rotate(asteroid.angle);
    const r = asteroid.radius;
    ctx.shadowColor = '#ffae67'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#9b725f'; ctx.strokeStyle = '#ffcc8d'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const rr = r * (0.78 + ((Math.floor(asteroid.seed * 1000 + i * 17) % 7) / 20)); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#4a3c39'; ctx.beginPath(); ctx.arc(-r * .16, -r * .06, r * .18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function render(time) {
    if (!context || !canvas) return;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const ctx = context;
    const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, '#020712'); bg.addColorStop(.5, '#071629'); bg.addColorStop(1, '#01040c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
    for (const star of stars) {
      const twinkle = .48 + (Math.sin(time * .0012 + star.phase) + 1) * .23;
      ctx.globalAlpha = twinkle; ctx.fillStyle = '#d7edff'; ctx.beginPath(); ctx.arc(star.x, (star.y + (state?.mode === 'playing' ? time * star.speed * .00018 : 0)) % height, star.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const earthR = Math.min(72, Math.max(38, width * .105));
    const moonR = Math.min(27, Math.max(17, width * .038));
    const earthX = earthR * .55, earthY = height * .88;
    const moonX = width - moonR * 1.55, moonY = Math.max(105, height * .2);
    drawPlanet(ctx, earthX, earthY, earthR, 'earth', time);
    drawPlanet(ctx, moonX, moonY, moonR, 'moon', time);
    ctx.save(); ctx.setLineDash([4, 9]); ctx.lineWidth = 1; ctx.strokeStyle = '#7acfff4c'; ctx.beginPath(); ctx.moveTo(earthX + earthR * .6, earthY - earthR * .55); ctx.quadraticCurveTo(width * .55, height * .44, moonX - moonR, moonY + moonR * .8); ctx.stroke(); ctx.restore();
    if (state?.mode === 'playing') for (const asteroid of state.asteroids) drawAsteroid(ctx, asteroid);
    if (state) drawShip(ctx, state.shipX || width * .5, height * .77, time, state.invulnerable || 0);
    if (state?.damageFlash > 0) { ctx.fillStyle = `rgba(255,75,64,${Math.min(.22, state.damageFlash * .65)})`; ctx.fillRect(0, 0, width, height); }
  }
  function loop(time) {
    if (!active) return;
    const dt = lastFrame ? Math.min(.04, Math.max(0, (time - lastFrame) / 1000)) : 0;
    lastFrame = time;
    if (!document.hidden) update(dt, canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
    render(time);
    frameId = window.requestAnimationFrame(loop);
  }
  function activate() {
    if (active) return;
    stage = document.getElementById('le-feature-stage');
    if (!stage) return;
    addStyle();
    stageCard = stage.querySelector('.le-feature-stage-card');
    if (stageCard) stageCard.hidden = true;
    stage.classList.add('le-aw-active');
    active = true;
    resetRandom();
    state = createState();
    buildUI();
    lastFrame = 0;
    frameId = window.requestAnimationFrame(loop);
  }
  function deactivate() {
    active = false;
    pointerDown = false;
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); window.removeEventListener('orientationchange', resizeHandler); }
    if (keyHandler) window.removeEventListener('keydown', keyHandler);
    resizeHandler = null; keyHandler = null;
    if (root) root.remove();
    root = null; canvas = null; context = null; ui = null; state = null; stars = [];
    if (stage) stage.classList.remove('le-aw-active');
    if (stageCard) stageCard.hidden = false;
    stage = null; stageCard = null;
  }
  function install() {
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return false;
    api.register(FEATURE_ID, {
      title: 'Alien World',
      shortLabel: 'Alien World',
      symbol: '🛸',
      description: 'Procedural Earth-to-Moon spaceflight prototype. No external assets or live data required.',
      connected: true,
      activate,
      deactivate
    });
    return true;
  }
  if (!install()) {
    window.addEventListener('live-earth-feature-views-ready', install, { once: true });
    document.addEventListener('DOMContentLoaded', install, { once: true });
  }
})();
