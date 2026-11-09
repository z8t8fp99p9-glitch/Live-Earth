/* LIVE // EARTH — Residents Library
   Original small, chibi-inspired neighbours for the living world.
   This file owns their identities, artwork, poses and reusable activity catalogue.
   Keep the cast at exactly three unless the product owner explicitly changes it. */
(() => {
  'use strict';

  const STYLE_ID = 'le-world-residents-library-style';
  const VERSION = '1.3.0';
  const ROSTER = Object.freeze([
    Object.freeze({ id: 'one', displayName: 'Red Hoodie Boy', asset: 'resident-red-hoodie-boy.webp', x: 92, y: 116, skin: '#f0bd99', shirt: '#b84238', shorts: '#46536a', hair: '#443331', accent: '#f3c36f', signature: 'tousled curls and red hoodie' }),
    Object.freeze({ id: 'two', displayName: 'Little Lady', asset: 'resident-little-lady.webp', x: 210, y: 122, skin: '#f0bd99', shirt: '#537ca7', shorts: '#405b86', hair: '#443331', accent: '#f3c36f', signature: 'chestnut bob, denim pinafore and satchel' }),
    Object.freeze({ id: 'three', displayName: 'Blue Jacket Boy', asset: 'resident-blue-jacket-boy.webp', x: 328, y: 116, skin: '#efc39e', shirt: '#536e9a', shorts: '#47536c', hair: '#3e312e', accent: '#9dc9c1', signature: 'soft curls and blue jacket' })
  ]);

  const ACTIVITY_CATALOG = Object.freeze({
    calm: Object.freeze({ label: 'A quiet little moment', stage: 'weather-ready' }),
    morning: Object.freeze({ label: 'Morning park exercise and a butterfly chase', stage: 'weather-ready' }),
    play: Object.freeze({ label: 'Playing together', stage: 'weather-ready' }),
    rain: Object.freeze({ label: 'Two umbrellas and one rain dancer', stage: 'weather-ready' }),
    snow: Object.freeze({ label: 'Bundled up and shivering', stage: 'weather-ready' }),
    heat: Object.freeze({ label: 'Fanning themselves in the heat', stage: 'weather-ready' }),
    wind: Object.freeze({ label: 'Bracing against the gusts', stage: 'weather-ready' }),
    stargaze: Object.freeze({ label: 'Watching the stars', stage: 'weather-ready' }),
    walk: Object.freeze({ label: 'A little neighbourhood walk', stage: 'shared-library' }),
    picnic: Object.freeze({ label: 'A tiny picnic by the river', stage: 'shared-library' }),
    kite: Object.freeze({ label: 'Flying a kite together', stage: 'shared-library' }),
    garden: Object.freeze({ label: 'Looking after the garden', stage: 'shared-library' }),
    festival: Object.freeze({ label: 'A local celebration', stage: 'shared-library' }),
    camping: Object.freeze({ label: 'A night under the stars', stage: 'shared-library' })
  });

  const STYLE_TEXT = `
    .le-weather-person{transform-box:fill-box;transform-origin:50% 100%;animation:le-weather-idle 4.5s ease-in-out infinite;transition:transform .65s ease}
    .le-weather-character-art{display:block;pointer-events:none;overflow:visible;filter:drop-shadow(0 2px 2px #102b3a35)}
    .le-weather-person--two{animation-delay:-1.3s}.le-weather-person--three{animation-delay:-2.4s}
    .le-weather-person .le-weather-shadow{fill:#173b4a33}
    .le-weather-prop{opacity:0;transition:opacity .35s ease;pointer-events:none}
    .le-weather-prop--umbrella,.le-weather-prop--rain-joy,.le-weather-prop--heat,.le-weather-prop--snow,.le-weather-prop--stargaze,.le-weather-prop--kite,.le-weather-prop--picnic,.le-weather-prop--garden,.le-weather-prop--festival,.le-weather-prop--camping,.le-weather-prop--exercise,.le-weather-prop--butterfly{display:none}
    .le-weather-ball{opacity:0;transform-box:fill-box;transform-origin:center;fill:#f6c85f;stroke:#fff8;stroke-width:2}
    .le-weather-people[data-activity="play"] .le-weather-ball{opacity:1;animation:le-weather-ball-play 2.8s ease-in-out infinite}
    .le-weather-people[data-activity="play"] .le-weather-person{animation:le-weather-play 1.7s ease-in-out infinite}
    .le-weather-people[data-activity="rain"] .le-weather-prop--umbrella,.le-weather-people[data-activity="rain"] .le-weather-prop--rain-joy{display:block;opacity:1}
    .le-weather-people[data-activity="rain"] .le-weather-person--two{animation:le-weather-rain-joy 2.2s ease-in-out infinite}
    .le-weather-people[data-activity="heat"] .le-weather-prop--heat{display:block;opacity:1}
    .le-weather-people[data-activity="heat"] .le-weather-person{animation:le-weather-heat 3.8s ease-in-out infinite}
    .le-weather-people[data-activity="snow"] .le-weather-prop--snow{display:block;opacity:1}
    .le-weather-people[data-activity="snow"] .le-weather-person{animation:le-weather-shiver .22s linear infinite}
    .le-weather-people[data-activity="wind"] .le-weather-person{animation:le-weather-gust var(--le-gust-duration,1.6s) ease-in-out infinite alternate}
    .le-weather-people[data-activity="wind"] .le-weather-person--two{animation-delay:-.7s}
    .le-weather-people[data-activity="wind"] .le-weather-person--three{animation-delay:-1.1s}
    .le-weather-people[data-activity="wind"][data-gust="strong"] .le-weather-person--three{animation:le-weather-gust-lift .85s ease-in-out infinite alternate}
    .le-weather-people[data-activity="stargaze"] .le-weather-prop--stargaze{display:block;opacity:1}
    .le-weather-people[data-activity="stargaze"] .le-weather-person{animation:le-weather-look-up 5s ease-in-out infinite}
    .le-weather-people[data-activity="walk"] .le-weather-person{animation:le-resident-walk 1.2s ease-in-out infinite}
    .le-weather-people[data-activity="kite"] .le-weather-prop--kite{display:block;opacity:1}
    .le-weather-people[data-activity="picnic"] .le-weather-prop--picnic{display:block;opacity:1}
    .le-weather-people[data-activity="garden"] .le-weather-prop--garden{display:block;opacity:1}
    .le-weather-people[data-activity="festival"] .le-weather-prop--festival{display:block;opacity:1}
    .le-weather-people[data-activity="camping"] .le-weather-prop--camping{display:block;opacity:1}
    .le-weather-people[data-activity="morning"] .le-weather-prop--exercise,.le-weather-people[data-activity="morning"] .le-weather-prop--butterfly{display:block;opacity:1}
    .le-weather-people[data-activity="morning"] .le-weather-person--one{animation:le-resident-morning-jump 1.55s ease-in-out infinite}
    .le-weather-people[data-activity="morning"] .le-weather-person--two{animation:le-resident-butterfly-chase 1.35s ease-in-out infinite}
    .le-weather-people[data-activity="morning"] .le-weather-person--three{animation:le-resident-morning-stretch 3.1s ease-in-out infinite}
    .le-weather-people[data-activity="morning"] .le-weather-butterfly{transform-box:fill-box;transform-origin:center;animation:le-resident-butterfly-flight 1.25s ease-in-out infinite alternate}


    @keyframes le-weather-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
    @keyframes le-weather-play{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(3deg)}}
    @keyframes le-weather-rain-joy{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(5deg) translateY(-5px)}}
    @keyframes le-weather-heat{0%,100%{transform:rotate(1deg)}50%{transform:rotate(-2deg) translateY(1px)}}
    @keyframes le-weather-shiver{0%,100%{transform:translateX(-1px) rotate(-1deg)}50%{transform:translateX(1px) rotate(1deg)}}
    @keyframes le-weather-gust{from{transform:translateX(0) rotate(-3deg)}to{transform:translateX(var(--le-wind-drift,9px)) rotate(9deg)}}
    @keyframes le-weather-gust-lift{from{transform:translate(0,0) rotate(-8deg)}to{transform:translate(var(--le-wind-drift,16px),-15px) rotate(18deg)}}
    @keyframes le-weather-ball-play{0%,100%{transform:translate(0,0)}50%{transform:translate(32px,-24px)}}
    @keyframes le-weather-look-up{0%,100%{transform:rotate(0)}50%{transform:rotate(-6deg) translateY(-3px)}}
    @keyframes le-resident-walk{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}
    @keyframes le-resident-morning-jump{0%,100%{transform:translateY(0) rotate(-2deg)}25%{transform:translateY(-7px) rotate(2deg)}50%{transform:translateY(0) rotate(3deg)}75%{transform:translateY(-5px) rotate(-2deg)}}
    @keyframes le-resident-morning-stretch{0%,100%{transform:rotate(0) translateY(0)}35%{transform:rotate(-5deg) translateY(-2px)}70%{transform:rotate(5deg) translateY(-2px)}}
    @keyframes le-resident-butterfly-chase{0%,100%{transform:translateX(0) rotate(2deg)}50%{transform:translateX(7px) rotate(-5deg)}}
    @keyframes le-resident-butterfly-flight{from{transform:translate(0,0) rotate(-9deg)}to{transform:translate(-13px,-12px) rotate(12deg)}}
    @media(prefers-reduced-motion:reduce){.le-weather-person,.le-weather-ball,.le-weather-butterfly{animation:none!important;transition:none!important}}
  `;

  function installStyles() {
    if (typeof document === 'undefined') return;
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    // Replace stale resident CSS in-place when the library upgrades in a live WebView.
    if (style.textContent !== STYLE_TEXT) style.textContent = STYLE_TEXT;
  }

  function personMarkup(person) {
    const { id, x, y, skin, shirt, shorts, accent } = person;
    const umbrella = id !== 'two' ? `
      <g class="le-weather-prop le-weather-prop--umbrella" transform="translate(0 -28)">
        <path d="M-25 18 Q0 -13 25 18 Q15 12 8 19 Q0 12 -8 19 Q-16 12 -25 18Z" fill="${id === 'one' ? '#e77f72' : '#718fc7'}" stroke="#fff9" stroke-width="1.7"/>
        <path d="M0 16 V43 Q0 49 6 45" fill="none" stroke="#f4e9d0" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M-8 17 Q0 12 8 17" fill="none" stroke="#fff8" stroke-width="1.4"/>
      </g>` : '';
    const rainJoy = id === 'two' ? `
      <g class="le-weather-prop le-weather-prop--rain-joy" fill="none" stroke="#3e4c61" stroke-width="5.5" stroke-linecap="round">
        <path d="M-9 45 Q-25 29 -34 7 M9 45 Q25 29 34 7"/>
        <path d="M-34 7 l-5 -5 M34 7 l5 -5" stroke="${skin}" stroke-width="5"/>
      </g>` : '';
    const exercise = id === 'one' ? `
      <g class="le-weather-prop le-weather-prop--exercise" fill="none" stroke="#3e4c61" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-10 52 Q-18 41 -22 24 M10 52 Q18 41 22 24"/>
        <path d="M-22 24 l-5 -5 M22 24 l5 -5" stroke="${skin}" stroke-width="5"/>
        <path d="M-15 6 Q0 1 15 6" stroke="#f5d17c" stroke-width="4"/>
      </g>` : '';
    const butterfly = id === 'two' ? `
      <g class="le-weather-prop le-weather-prop--butterfly" transform="translate(34 1)">
        <g class="le-weather-butterfly">
          <path d="M0 0 C-11 -20 -27 -13 -19 1 C-13 10 -5 7 0 1 C5 7 13 10 19 1 C27 -13 11 -20 0 0Z" fill="#f5a6cf" stroke="#fff5" stroke-width="1.4"/>
          <path d="M0 -2 C-8 -15 -18 -12 -14 -2 C-10 4 -4 4 0 1 C4 4 10 4 14 -2 C18 -12 8 -15 0 -2Z" fill="#b9a5ed" opacity=".8"/>
          <ellipse cx="0" cy="0" rx="1.8" ry="8" fill="#4d475d"/>
          <path d="M-1 -7 Q-7 -15 -10 -12 M1 -7 Q7 -15 10 -12" fill="none" stroke="#4d475d" stroke-width="1.1" stroke-linecap="round"/>
        </g>
      </g>` : '';
    return `
      <g class="le-weather-person-anchor le-weather-person-anchor--${id}" transform="translate(${x} ${y})" data-resident-id="${id}">
        <g class="le-weather-person le-weather-person--${id}">
        <ellipse class="le-weather-shadow" cx="0" cy="108" rx="20" ry="5"/>
        <image class="le-weather-character-art" href="./Residents/assets/${person.asset}" x="-46" y="-16" width="92" height="128" preserveAspectRatio="xMidYMax meet"/>
        ${umbrella}${rainJoy}${exercise}${butterfly}
        <g class="le-weather-prop le-weather-prop--snow">
          <path d="M-16 47 Q0 39 16 47 L19 79 Q0 91 -19 79Z" fill="#f0f5f5" stroke="#a5c1d4" stroke-width="1.6"/>
          <path d="M-15 48 Q0 57 15 48 L17 58 Q0 67 -17 58Z" fill="#d87875"/>
          <path d="M-15 4 Q-16 -18 0 -19 Q16 -18 15 4Z" fill="#7894bd" stroke="#f4f8fc" stroke-width="1.6"/>
          <path d="M-18 4 Q0 -2 18 4" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>
          <circle cx="0" cy="-17" r="3" fill="#fff"/>
        </g>
        <g class="le-weather-prop le-weather-prop--heat">
          <path d="M-16 17 Q-23 5 -16 -7" stroke="#fff3c4" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M15 38 Q26 26 20 12" stroke="#fff3c4" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M18 43 l13 -8 l8 14 l-13 8Z" fill="#f4d28c" stroke="#fff7" stroke-width="1.4"/>
          <path d="M25 39 l4 14 M31 36 l4 14" stroke="#c38e59" stroke-width="1.2"/>
          <path d="M-20 26 Q-26 20 -22 14 Q-15 15 -16 23Z" fill="#aee8ff"/>
        </g>
        <g class="le-weather-prop le-weather-prop--stargaze" fill="#fff3bd">
          <path d="M-31 0 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2Z"/>
          <path d="M29 14 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5Z"/>
        </g>
        <g class="le-weather-prop le-weather-prop--kite">
          <path d="M25 55 Q50 20 55 -24" stroke="#fff4" stroke-width="1.5" fill="none"/>
          <path d="M55 -24 l-9 -12 l14 -8 l8 13Z" fill="#e77f72" stroke="#fff" stroke-width="1.3"/>
        </g>
        <g class="le-weather-prop le-weather-prop--picnic">
          <path d="M-30 112 h60 l-7 8 h-46Z" fill="#e9aa78"/>
          <circle cx="-10" cy="110" r="4" fill="#e57666"/><circle cx="8" cy="109" r="4" fill="#e6c35b"/>
        </g>
        <g class="le-weather-prop le-weather-prop--garden">
          <path d="M18 61 q10 6 15 16 l-8 5 q-9 -9 -10 -17Z" fill="#86bdd0" stroke="#fff8" stroke-width="1.2"/>
          <path d="M30 80 q7 8 7 15" fill="none" stroke="#bde9ff" stroke-width="2" stroke-linecap="round"/>
        </g>
        <g class="le-weather-prop le-weather-prop--festival">
          <path d="M-28 -12 Q0 -30 28 -12" fill="none" stroke="#fff3" stroke-width="1.4"/>
          <circle cx="-24" cy="-13" r="3" fill="#f1d36f"/><circle cx="0" cy="-23" r="3" fill="#e77f72"/><circle cx="24" cy="-13" r="3" fill="#8cc9bc"/>
        </g>
        <g class="le-weather-prop le-weather-prop--camping">
          <path d="M-31 112 L0 84 L31 112Z" fill="#7e9cbb" stroke="#fff8" stroke-width="1.4"/>
          <path d="M0 84 V112" stroke="#f4d59a" stroke-width="1.4"/>
          <circle cx="0" cy="108" r="4" fill="#ffd98b"/>
        </g>
        </g>
      </g>`;
  }

  function renderMarkup() {
    const people = ROSTER.map(personMarkup).join('');
    return `${people}
      <circle class="le-weather-ball" cx="151" cy="224" r="8"/>
      <path class="le-weather-prop le-weather-prop--festival" d="M40 60 Q120 15 210 53 T380 49" fill="none" stroke="#f5e7a2" stroke-width="1.4" stroke-dasharray="3 6"/>`;
  }

  function mount(host) {
    if (!host || typeof host.replaceChildren !== 'function') return false;
    installStyles();
    host.replaceChildren();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 420 250');
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Three little LIVE Earth neighbours in their shared world');
    svg.innerHTML = renderMarkup();
    host.appendChild(svg);
    host.dataset.residentsVersion = VERSION;
    host.dataset.activity = 'calm';
    return true;
  }

  function setActivity(host, state = {}) {
    if (!host) return false;
    const requested = String(state.mode || 'calm');
    const weather = String(state.weather || 'clear');
    const weatherAllowsMorning = !['rain', 'storm', 'snow', 'fog', 'hot'].includes(weather);
    // Weather marks the 05:00–07:00 local forecast as dawn. On a fair dawn,
    // the neighbours start their park routine; severe weather modes still win.
    const morning = requested === 'calm' && state.phase === 'dawn' && weatherAllowsMorning;
    const activity = morning ? 'morning' : requested;
    host.dataset.activity = Object.prototype.hasOwnProperty.call(ACTIVITY_CATALOG, activity) ? activity : 'calm';
    host.dataset.gust = state.gustLevel === 'strong' ? 'strong' : 'normal';
    return true;
  }

  function unmount(host) {
    if (!host) return;
    host.replaceChildren();
    delete host.dataset.residentsVersion;
    delete host.dataset.activity;
    delete host.dataset.gust;
  }

  const api = Object.freeze({
    version: VERSION,
    getRoster: () => ROSTER,
    getActivityCatalog: () => ACTIVITY_CATALOG,
    renderMarkup,
    mount,
    setActivity,
    unmount
  });

  if (!window.LiveEarthResidentLibrary || window.LiveEarthResidentLibrary.version !== VERSION) {
    window.LiveEarthResidentLibrary = api;
  }
})();
