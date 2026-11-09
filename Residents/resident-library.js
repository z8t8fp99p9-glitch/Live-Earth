/* LIVE // EARTH — Residents Library
   Original small, chibi-inspired neighbours for the living world.
   This file owns their identities, artwork, poses and reusable activity catalogue.
   Keep the cast at exactly three unless the product owner explicitly changes it. */
(() => {
  'use strict';

  const STYLE_ID = 'le-world-residents-library-style';
  const ROSTER = Object.freeze([
    Object.freeze({ id: 'one', displayName: 'Resident One', x: 92, y: 116, skin: '#f0bd99', shirt: '#e99568', shorts: '#405b86', hair: '#443331', accent: '#f3c36f', signature: 'little side tuft' }),
    Object.freeze({ id: 'two', displayName: 'Resident Two', x: 210, y: 122, skin: '#d89b7b', shirt: '#809fd8', shorts: '#584d86', hair: '#302d35', accent: '#f2a5a0', signature: 'round bob and hair clip' }),
    Object.freeze({ id: 'three', displayName: 'Resident Three', x: 328, y: 116, skin: '#efc39e', shirt: '#e4b95e', shorts: '#477d75', hair: '#3e312e', accent: '#9dc9c1', signature: 'soft curls' })
  ]);

  const ACTIVITY_CATALOG = Object.freeze({
    calm: Object.freeze({ label: 'A quiet little moment', stage: 'weather-ready' }),
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
    .le-weather-person:nth-child(2){animation-delay:-1.3s}.le-weather-person:nth-child(3){animation-delay:-2.4s}
    .le-weather-person .le-weather-shadow{fill:#173b4a33}
    .le-weather-person .le-weather-head{stroke:#704f43;stroke-width:1.15}
    .le-weather-person .le-weather-body{stroke:#263f5c;stroke-width:1.2;stroke-linejoin:round}
    .le-weather-person .le-weather-limbs{fill:none;stroke:#3e4c61;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
    .le-weather-prop{opacity:0;transition:opacity .35s ease;pointer-events:none}
    .le-weather-prop--umbrella,.le-weather-prop--rain-joy,.le-weather-prop--heat,.le-weather-prop--snow,.le-weather-prop--stargaze,.le-weather-prop--kite,.le-weather-prop--picnic,.le-weather-prop--garden,.le-weather-prop--festival,.le-weather-prop--camping{display:none}
    .le-weather-ball{opacity:0;transform-box:fill-box;transform-origin:center;fill:#f6c85f;stroke:#fff8;stroke-width:2}
    .le-weather-people[data-activity="play"] .le-weather-ball{opacity:1;animation:le-weather-ball-play 2.8s ease-in-out infinite}
    .le-weather-people[data-activity="play"] .le-weather-person{animation:le-weather-play 1.7s ease-in-out infinite}
    .le-weather-people[data-activity="rain"] .le-weather-prop--umbrella,.le-weather-people[data-activity="rain"] .le-weather-prop--rain-joy{display:block;opacity:1}
    .le-weather-people[data-activity="rain"] .le-weather-person--three{animation:le-weather-rain-joy 2.2s ease-in-out infinite}
    .le-weather-people[data-activity="heat"] .le-weather-prop--heat{display:block;opacity:1}
    .le-weather-people[data-activity="heat"] .le-weather-person{animation:le-weather-heat 3.8s ease-in-out infinite}
    .le-weather-people[data-activity="snow"] .le-weather-prop--snow{display:block;opacity:1}
    .le-weather-people[data-activity="snow"] .le-weather-person{animation:le-weather-shiver .22s linear infinite}
    .le-weather-people[data-activity="wind"] .le-weather-person{animation:le-weather-gust var(--le-gust-duration,1.6s) ease-in-out infinite alternate}
    .le-weather-people[data-activity="wind"] .le-weather-person:nth-child(2){animation-delay:-.7s}
    .le-weather-people[data-activity="wind"] .le-weather-person:nth-child(3){animation-delay:-1.1s}
    .le-weather-people[data-activity="wind"][data-gust="strong"] .le-weather-person--three{animation:le-weather-gust-lift .85s ease-in-out infinite alternate}
    .le-weather-people[data-activity="stargaze"] .le-weather-prop--stargaze{display:block;opacity:1}
    .le-weather-people[data-activity="stargaze"] .le-weather-person{animation:le-weather-look-up 5s ease-in-out infinite}
    .le-weather-people[data-activity="walk"] .le-weather-person{animation:le-resident-walk 1.2s ease-in-out infinite}
    .le-weather-people[data-activity="kite"] .le-weather-prop--kite{display:block;opacity:1}
    .le-weather-people[data-activity="picnic"] .le-weather-prop--picnic{display:block;opacity:1}
    .le-weather-people[data-activity="garden"] .le-weather-prop--garden{display:block;opacity:1}
    .le-weather-people[data-activity="festival"] .le-weather-prop--festival{display:block;opacity:1}
    .le-weather-people[data-activity="camping"] .le-weather-prop--camping{display:block;opacity:1}
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
    @media(prefers-reduced-motion:reduce){.le-weather-person,.le-weather-ball{animation:none!important;transition:none!important}}
  `;

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  function hairMarkup(person) {
    if (person.id === 'one') return `
      <path d="M-17 21 Q-23 2 -7 -5 Q2 -12 11 -3 Q23 2 17 22 Q10 14 3 13 Q-5 20 -17 21Z" fill="${person.hair}"/>
      <path d="M-4 -4 Q-1 -13 7 -12 Q6 -5 2 1" fill="${person.hair}"/>`;
    if (person.id === 'two') return `
      <path d="M-18 22 Q-24 0 -8 -7 Q8 -15 17 -1 Q23 13 18 38 L12 33 L10 14 Q0 18 -8 13 L-13 35 L-19 37Z" fill="${person.hair}"/>
      <path d="M10 1 l7 -3 l2 7 l-7 2Z" fill="${person.accent}"/>`;
    return `
      <g fill="${person.hair}">
        <circle cx="-12" cy="7" r="8"/><circle cx="0" cy="1" r="10"/><circle cx="12" cy="7" r="8"/>
        <circle cx="-17" cy="17" r="6"/><circle cx="17" cy="17" r="6"/>
      </g>
      <path d="M-7 1 Q0 -6 7 1" fill="none" stroke="#ffffff35" stroke-width="2" stroke-linecap="round"/>`;
  }

  function personMarkup(person) {
    const { id, x, y, skin, shirt, shorts, accent } = person;
    const umbrella = id !== 'three' ? `
      <g class="le-weather-prop le-weather-prop--umbrella" transform="translate(0 -28)">
        <path d="M-25 18 Q0 -13 25 18 Q15 12 8 19 Q0 12 -8 19 Q-16 12 -25 18Z" fill="${id === 'one' ? '#e77f72' : '#718fc7'}" stroke="#fff9" stroke-width="1.7"/>
        <path d="M0 16 V43 Q0 49 6 45" fill="none" stroke="#f4e9d0" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M-8 17 Q0 12 8 17" fill="none" stroke="#fff8" stroke-width="1.4"/>
      </g>` : '';
    const rainJoy = id === 'three' ? `
      <g class="le-weather-prop le-weather-prop--rain-joy" fill="none" stroke="#3e4c61" stroke-width="5.5" stroke-linecap="round">
        <path d="M-9 45 Q-25 29 -34 7 M9 45 Q25 29 34 7"/>
        <path d="M-34 7 l-5 -5 M34 7 l5 -5" stroke="${skin}" stroke-width="5"/>
      </g>` : '';
    return `
      <g class="le-weather-person le-weather-person--${id}" transform="translate(${x} ${y})" data-resident-id="${id}">
        <ellipse class="le-weather-shadow" cx="0" cy="108" rx="20" ry="5"/>
        <g class="le-weather-character-base">
          <path d="M-7 92 L-9 101 M7 92 L10 101" fill="none" stroke="${skin}" stroke-width="7" stroke-linecap="round"/>
          <path d="M-9 100 l-7 4 M10 100 l7 4" fill="none" stroke="#34475f" stroke-width="5.5" stroke-linecap="round"/>
          <path class="le-weather-body" d="M-13 48 Q0 40 13 48 L16 77 Q0 85 -16 77Z" fill="${shirt}"/>
          <path d="M-11 76 Q0 81 12 76 L12 87 Q0 91 -12 87Z" fill="${shorts}"/>
          <path class="le-weather-limbs" d="M-10 51 Q-20 63 -17 75 M10 51 Q20 63 17 75"/>
          <path d="M-17 73 l-1 4 M17 73 l1 4" fill="none" stroke="${skin}" stroke-width="6" stroke-linecap="round"/>
          <ellipse class="le-weather-head" cx="0" cy="20" rx="18" ry="20" fill="${skin}"/>
          ${hairMarkup(person)}
          <ellipse cx="-6" cy="22" rx="2.3" ry="3" fill="#342a2a"/><ellipse cx="6" cy="22" rx="2.3" ry="3" fill="#342a2a"/>
          <circle cx="-12" cy="29" r="3.2" fill="#e9847c" opacity=".58"/><circle cx="12" cy="29" r="3.2" fill="#e9847c" opacity=".58"/>
          <path d="M-3 33 Q0 36 4 32" fill="none" stroke="#9e6257" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M-8 13 Q-4 10 -1 12 M4 12 Q7 10 9 13" fill="none" stroke="#493d3a" stroke-width="1.3" stroke-linecap="round"/>
        </g>
        <g class="le-weather-prop le-weather-prop--snow">
          <path d="M-16 47 Q0 39 16 47 L19 79 Q0 91 -19 79Z" fill="#f0f5f5" stroke="#a5c1d4" stroke-width="1.6"/>
          <path d="M-15 48 Q0 57 15 48 L17 58 Q0 67 -17 58Z" fill="#d87875"/>
          <path d="M-15 4 Q-16 -18 0 -19 Q16 -18 15 4Z" fill="#7894bd" stroke="#f4f8fc" stroke-width="1.6"/>
          <path d="M-18 4 Q0 -2 18 4" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>
          <circle cx="0" cy="-17" r="3" fill="#fff"/>
        </g>
        ${umbrella}${rainJoy}
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
    host.dataset.residentsVersion = '1';
    host.dataset.activity = 'calm';
    return true;
  }

  function setActivity(host, state = {}) {
    if (!host) return false;
    const requested = String(state.mode || 'calm');
    host.dataset.activity = Object.prototype.hasOwnProperty.call(ACTIVITY_CATALOG, requested) ? requested : 'calm';
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
    version: '1.0.0',
    getRoster: () => ROSTER,
    getActivityCatalog: () => ACTIVITY_CATALOG,
    renderMarkup,
    mount,
    setActivity,
    unmount
  });

  if (!window.LiveEarthResidentLibrary) window.LiveEarthResidentLibrary = api;
})();
