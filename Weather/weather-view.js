/* LIVE // EARTH — Living Weather Background
   A single illustrated landscape that changes atmosphere with fresh local weather.
   No 3D scene, no terrain meshes, no weather dashboard or text controls.
   The shared Global Orb dock remains owned by the app shell. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Shared Stacks feature runtime is unavailable.');
    return;
  }

  const { mount, el, globe } = runtime;
  const STYLE_ID = 'le-weather-immersive-background-style';
  const SCRIPT_ID = 'le-weather-background-stage';
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';

  function installStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather {
        position:absolute!important; inset:0!important;
        width:100%!important; height:100%!important;
        max-width:none!important; overflow:hidden!important;
        padding:0!important; margin:0!important; border:0!important;
        border-radius:0!important; background:#9bbbc9!important;
        isolation:isolate; pointer-events:none;
      }
      .le-sfv--weather > .le-weather-immersive {
        position:absolute; inset:0; width:100%; height:100%;
        overflow:hidden; isolation:isolate;
        background:linear-gradient(180deg,#8ec4e6 0%,#c4e0e7 53%,#e6d7c5 100%);
        transition:background 1.8s ease;
      }
      .le-weather-immersive svg {
        position:absolute; inset:0; width:100%; height:100%;
        display:block; overflow:hidden;
      }
      .le-weather-immersive .le-weather-sky-art {
        z-index:0; pointer-events:none;
      }
      .le-weather-immersive .le-weather-land-art {
        z-index:1; pointer-events:none;
      }
      .le-weather-immersive .le-weather-wide-art { display:none; }
      @media (orientation: landscape) {
        .le-weather-immersive .le-weather-portrait-art { display:none; }
        .le-weather-immersive .le-weather-wide-art { display:block; }
      }
      .le-weather-immersive .le-weather-atmosphere {
        z-index:2; pointer-events:none; opacity:0;
        transition:opacity 1.2s ease;
      }
      .le-weather-immersive .le-weather-sun,
      .le-weather-immersive .le-weather-moon,
      .le-weather-immersive .le-weather-clouds,
      .le-weather-immersive .le-weather-stars { transition:opacity 1.4s ease; }
      .le-weather-immersive .le-weather-sun { opacity:1; }
      .le-weather-immersive .le-weather-moon,
      .le-weather-immersive .le-weather-stars { opacity:0; }
      .le-weather-immersive .le-weather-clouds { opacity:0; }
      .le-weather-immersive .le-weather-cloud { fill:#fffdf7; }
      .le-weather-immersive .le-weather-land-tint { opacity:0; transition:opacity 1.4s ease; }
      .le-weather-immersive[data-condition="neutral"] .le-weather-sun { opacity:.18; }
      .le-weather-immersive .le-weather-rain,
      .le-weather-immersive .le-weather-snow { opacity:0; }
      .le-weather-immersive .le-weather-rain line {
        stroke:#d9f1fb; stroke-width:2.2; stroke-linecap:round;
        animation:le-weather-rainfall .72s linear infinite;
      }
      .le-weather-immersive .le-weather-snow circle {
        fill:#fff; animation:le-weather-snowfall 5s ease-in-out infinite;
      }
      .le-weather-immersive .le-weather-river {
        stroke-dasharray:18 12;
        animation:le-weather-riverflow 12s linear infinite;
      }
      .le-weather-immersive[data-motion="reduced"] .le-weather-rain line,
      .le-weather-immersive[data-motion="reduced"] .le-weather-snow circle,
      .le-weather-immersive[data-motion="reduced"] .le-weather-river { animation:none!important; }
      .le-weather-immersive[data-phase="night"] {
        background:linear-gradient(180deg,#102b4a 0%,#274c6b 48%,#617b82 100%);
      }
      .le-weather-immersive[data-phase="dawn"] {
        background:linear-gradient(180deg,#879fbd 0%,#e8bcae 46%,#f2d8b9 100%);
      }
      .le-weather-immersive[data-phase="day"] {
        background:linear-gradient(180deg,#75b8e7 0%,#b8e1e8 52%,#f2e4ce 100%);
      }
      .le-weather-immersive[data-phase="evening"] {
        background:linear-gradient(180deg,#405d87 0%,#dc9a84 53%,#f1c79b 100%);
      }
      .le-weather-immersive[data-condition="cloudy"] .le-weather-clouds,
      .le-weather-immersive[data-condition="overcast"] .le-weather-clouds { opacity:.92; }
      .le-weather-immersive[data-condition="partly-cloudy"] .le-weather-clouds { opacity:.54; }
      .le-weather-immersive[data-condition="rain"] .le-weather-clouds,
      .le-weather-immersive[data-condition="storm"] .le-weather-clouds,
      .le-weather-immersive[data-condition="snow"] .le-weather-clouds,
      .le-weather-immersive[data-condition="fog"] .le-weather-clouds { opacity:.95; }
      .le-weather-immersive[data-condition="rain"] .le-weather-rain,
      .le-weather-immersive[data-condition="storm"] .le-weather-rain { opacity:.8; }
      .le-weather-immersive[data-condition="snow"] .le-weather-snow { opacity:.9; }
      .le-weather-immersive[data-condition="fog"] .le-weather-atmosphere { opacity:.48; }
      .le-weather-immersive[data-condition="storm"] .le-weather-atmosphere { opacity:.2; }
      .le-weather-immersive[data-condition="storm"] .le-weather-sun { opacity:0; }
      .le-weather-immersive[data-phase="night"] .le-weather-sun { opacity:0; }
      .le-weather-immersive[data-phase="night"] .le-weather-moon,
      .le-weather-immersive[data-phase="night"] .le-weather-stars { opacity:.9; }
      .le-weather-immersive[data-phase="dawn"] .le-weather-sun { opacity:.65; }
      .le-weather-immersive[data-phase="evening"] .le-weather-sun { opacity:.78; }
      .le-weather-immersive[data-condition="overcast"] .le-weather-sun,
      .le-weather-immersive[data-condition="rain"] .le-weather-sun,
      .le-weather-immersive[data-condition="snow"] .le-weather-sun,
      .le-weather-immersive[data-condition="fog"] .le-weather-sun { opacity:.12; }
      .le-weather-immersive[data-condition="storm"] {
        background:linear-gradient(180deg,#26374c 0%,#536a79 55%,#77827b 100%);
      }
      .le-weather-immersive[data-condition="fog"] {
        background:linear-gradient(180deg,#a9bdc2 0%,#c8d2cb 56%,#b7bda9 100%);
      }
      .le-weather-immersive[data-condition="snow"] {
        background:linear-gradient(180deg,#8daec7 0%,#d6e2e5 55%,#e8e5d8 100%);
      }
      .le-weather-immersive[data-phase="night"] .le-weather-land-tint { opacity:.46; }
      .le-weather-immersive[data-condition="rain"] .le-weather-land-tint,
      .le-weather-immersive[data-condition="storm"] .le-weather-land-tint { opacity:.23; }
      .le-weather-immersive[data-condition="fog"] .le-weather-land-tint { opacity:.16; }
      @keyframes le-weather-rainfall {
        from { transform:translateY(-12px); opacity:.12; }
        30% { opacity:.8; } to { transform:translateY(26px); opacity:0; }
      }
      @keyframes le-weather-snowfall {
        0%,100% { transform:translate(0,-8px); opacity:.2; }
        50% { transform:translate(12px,18px); opacity:.9; }
      }
      @keyframes le-weather-riverflow { to { stroke-dashoffset:-180; } }
      @media (prefers-reduced-motion: reduce) {
        .le-weather-immersive *, .le-weather-immersive *::before,
        .le-weather-immersive *::after { animation:none!important; transition:none!important; }
      }
    `;
    document.head.appendChild(style);
  }

  function weatherState(data) {
    const current = data?.current || {};
    const code = Number(current.weather_code);
    const cloud = Number(current.cloud_cover);
    const isDay = Number(current.is_day) === 1;
    if (!data?.current || !Number.isFinite(code)) return { condition: 'neutral', phase: 'day' };
    let condition = 'clear';

    if ([95, 96, 99].includes(code)) condition = 'storm';
    else if ([71, 73, 75, 77, 85, 86].includes(code)) condition = 'snow';
    else if ([45, 48].includes(code)) condition = 'fog';
    else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) condition = 'rain';
    else if ([3].includes(code) || (Number.isFinite(cloud) && cloud >= 85)) condition = 'overcast';
    else if ([1, 2].includes(code) || (Number.isFinite(cloud) && cloud >= 25)) condition = 'partly-cloudy';

    let phase = 'day';
    if (!isDay) phase = 'night';
    else {
      const hour = Number(String(current.time || '').slice(11, 13));
      if (Number.isFinite(hour) && hour >= 5 && hour < 8) phase = 'dawn';
      else if (Number.isFinite(hour) && hour >= 17 && hour < 20) phase = 'evening';
    }
    return { condition, phase };
  }

  function makeArtwork(stage) {
    stage.innerHTML = `
      <svg class="le-weather-sky-art le-weather-portrait-art" viewBox="0 0 1000 1600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="le-weather-sun-glow"><stop stop-color="#fff8d5" stop-opacity=".92"/><stop offset="1" stop-color="#fff8d5" stop-opacity="0"/></radialGradient>
          <linearGradient id="le-weather-cloud-shade" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".98"/><stop offset="1" stop-color="#e6e8ef" stop-opacity=".8"/></linearGradient>
          <linearGradient id="le-weather-river-fill" x2="0" y2="1"><stop stop-color="#8bd1d0"/><stop offset=".48" stop-color="#62b7bd"/><stop offset="1" stop-color="#438f9c"/></linearGradient>
          <linearGradient id="le-weather-hill-a" x2="0" y2="1"><stop stop-color="#b6c6a4"/><stop offset="1" stop-color="#718d7b"/></linearGradient>
          <linearGradient id="le-weather-hill-b" x2="0" y2="1"><stop stop-color="#a9b6b0"/><stop offset="1" stop-color="#748c91"/></linearGradient>
          <linearGradient id="le-weather-hill-c" x2="0" y2="1"><stop stop-color="#8ba6a1"/><stop offset="1" stop-color="#557e78"/></linearGradient>
          <linearGradient id="le-weather-front" x2="0" y2="1"><stop stop-color="#72917b"/><stop offset="1" stop-color="#3e6e62"/></linearGradient>
          <filter id="le-weather-soft"><feGaussianBlur stdDeviation="30"/></filter>
        </defs>
        <g class="le-weather-stars" fill="#fff">
          <circle cx="105" cy="130" r="2.5"/><circle cx="240" cy="210" r="2"/><circle cx="420" cy="115" r="2.3"/>
          <circle cx="640" cy="185" r="2"/><circle cx="830" cy="100" r="2.6"/><circle cx="920" cy="280" r="1.8"/>
          <circle cx="710" cy="330" r="1.6"/><circle cx="330" cy="330" r="1.7"/>
        </g>
        <g class="le-weather-sun">
          <circle cx="785" cy="410" r="170" fill="url(#le-weather-sun-glow)" filter="url(#le-weather-soft)"/>
          <circle cx="785" cy="410" r="45" fill="#fff4cf"/>
        </g>
        <g class="le-weather-moon">
          <circle cx="785" cy="410" r="48" fill="#edf0e9"/>
          <circle cx="805" cy="392" r="45" fill="#24445f"/>
        </g>
        <g class="le-weather-clouds" fill="url(#le-weather-cloud-shade)">
          <path class="le-weather-cloud" d="M-60 500 C-55 455 -15 430 30 445 C42 392 105 370 145 402 C185 365 255 385 266 435 C320 438 344 470 332 510 Z"/>
          <path class="le-weather-cloud" d="M360 330 C365 280 410 252 455 270 C470 210 545 190 585 230 C630 190 700 220 706 274 C760 278 785 312 770 350 Z"/>
          <path class="le-weather-cloud" d="M690 560 C700 520 742 500 778 515 C800 470 855 466 882 500 C925 475 980 500 985 545 C1020 550 1030 580 1015 608 Z"/>
          <path class="le-weather-cloud" d="M80 710 C90 675 130 660 160 674 C180 632 230 630 258 662 C300 640 345 665 346 700 L360 730 L60 730 Z"/>
        </g>
        <g class="le-weather-rain" stroke="#e4f4fa" stroke-width="3" stroke-linecap="round">
          <path d="M80 560l-22 56M150 550l-22 56M220 570l-22 56M420 440l-22 56M500 445l-22 56M580 455l-22 56M760 650l-22 56M850 640l-22 56M940 650l-22 56"/>
        </g>
        <g class="le-weather-snow" fill="#fff">
          <circle cx="130" cy="550" r="5"/><circle cx="260" cy="610" r="4"/><circle cx="430" cy="520" r="5"/>
          <circle cx="590" cy="590" r="4"/><circle cx="760" cy="520" r="5"/><circle cx="900" cy="610" r="4"/>
        </g>
      </svg>
      <svg class="le-weather-land-art le-weather-portrait-art" viewBox="0 0 1000 1600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="le-weather-river-fill-2" x2="0" y2="1"><stop stop-color="#a6d8d1"/><stop offset=".5" stop-color="#69bfc0"/><stop offset="1" stop-color="#378d98"/></linearGradient>
          <linearGradient id="le-weather-far-hills" x2="0" y2="1"><stop stop-color="#c6c9b2"/><stop offset="1" stop-color="#a2b49d"/></linearGradient>
          <linearGradient id="le-weather-mid-hills" x2="0" y2="1"><stop stop-color="#9eb49b"/><stop offset="1" stop-color="#6e967f"/></linearGradient>
          <linearGradient id="le-weather-near-hills" x2="0" y2="1"><stop stop-color="#779b7c"/><stop offset="1" stop-color="#456f64"/></linearGradient>
        </defs>
        <path d="M0 760 C120 690 220 720 330 680 C455 635 570 690 675 650 C805 600 900 660 1000 610 L1000 1600 L0 1600Z" fill="url(#le-weather-far-hills)"/>
        <path d="M0 850 C130 760 240 785 350 755 C470 720 590 790 700 740 C830 680 915 760 1000 710 L1000 1600 L0 1600Z" fill="url(#le-weather-mid-hills)"/>
        <path d="M0 1000 C105 910 225 940 345 900 C470 855 580 925 700 875 C835 820 915 900 1000 850 L1000 1600 L0 1600Z" fill="url(#le-weather-near-hills)"/>
        <path d="M0 1210 C160 1110 250 1155 380 1110 C500 1065 640 1145 760 1090 C865 1040 945 1090 1000 1050 L1000 1600 L0 1600Z" fill="#64866d"/>
        <path d="M-30 1010 C160 930 205 1000 325 970 C420 946 440 900 535 912 C640 924 640 1015 745 1020 C850 1024 875 960 1030 1000 L1030 1058 C875 1020 850 1080 745 1076 C620 1072 622 985 535 980 C455 975 430 1020 330 1032 C205 1050 150 1000 -30 1075Z" fill="url(#le-weather-river-fill-2)" opacity=".98"/>
        <path d="M-30 1045 C150 975 205 1030 325 1005 C425 982 445 936 535 946 C632 958 650 1040 745 1045 C850 1050 890 990 1030 1032" fill="none" stroke="#d5f2e8" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>
        <path d="M0 1250 C160 1180 245 1210 360 1178 C500 1140 620 1215 745 1168 C860 1125 930 1175 1000 1140 L1000 1600 L0 1600Z" fill="#4d786a" opacity=".7"/>
        <path d="M0 0H1000V1600H0Z" class="le-weather-land-tint" fill="#081b32" opacity="0"/>
      </svg>
      <svg class="le-weather-sky-art le-weather-wide-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="le-weather-sun-glow-wide"><stop stop-color="#fff8d5" stop-opacity=".92"/><stop offset="1" stop-color="#fff8d5" stop-opacity="0"/></radialGradient>
          <linearGradient id="le-weather-cloud-shade-wide" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".98"/><stop offset="1" stop-color="#e6e8ef" stop-opacity=".8"/></linearGradient>
        </defs>
        <g class="le-weather-stars" fill="#fff">
          <circle cx="130" cy="120" r="2.5"/><circle cx="360" cy="210" r="2"/><circle cx="620" cy="115" r="2.3"/>
          <circle cx="910" cy="180" r="2"/><circle cx="1240" cy="100" r="2.6"/><circle cx="1480" cy="250" r="1.8"/>
        </g>
        <g class="le-weather-sun">
          <circle cx="1260" cy="300" r="190" fill="url(#le-weather-sun-glow-wide)"/>
          <circle cx="1260" cy="300" r="48" fill="#fff4cf"/>
        </g>
        <g class="le-weather-moon">
          <circle cx="1260" cy="300" r="50" fill="#edf0e9"/>
          <circle cx="1282" cy="280" r="47" fill="#24445f"/>
        </g>
        <g class="le-weather-clouds" fill="url(#le-weather-cloud-shade-wide)">
          <path class="le-weather-cloud" d="M-40 370 C-20 320 35 300 80 320 C100 250 180 225 235 270 C285 230 365 260 370 320 C435 325 460 360 445 400Z"/>
          <path class="le-weather-cloud" d="M500 250 C515 195 575 175 625 195 C650 125 735 110 780 155 C830 110 915 140 925 205 C990 205 1020 245 1000 285Z"/>
          <path class="le-weather-cloud" d="M1040 420 C1050 370 1110 350 1150 370 C1170 315 1245 300 1280 340 C1335 305 1405 335 1410 390 C1475 395 1500 430 1480 465Z"/>
          <path class="le-weather-cloud" d="M1350 210 C1360 175 1400 160 1430 175 C1450 135 1500 135 1525 165 C1565 150 1605 175 1610 210Z"/>
        </g>
        <g class="le-weather-rain" stroke="#e4f4fa" stroke-width="3" stroke-linecap="round">
          <path d="M80 420l-25 65M160 415l-25 65M240 430l-25 65M550 330l-25 65M650 335l-25 65M750 340l-25 65M1110 500l-25 65M1210 490l-25 65M1310 500l-25 65M1450 480l-25 65"/>
        </g>
        <g class="le-weather-snow" fill="#fff">
          <circle cx="130" cy="480" r="5"/><circle cx="300" cy="500" r="4"/><circle cx="590" cy="420" r="5"/>
          <circle cx="820" cy="470" r="4"/><circle cx="1120" cy="560" r="5"/><circle cx="1430" cy="510" r="4"/>
        </g>
      </svg>
      <svg class="le-weather-land-art le-weather-wide-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="le-weather-wide-far" x2="0" y2="1"><stop stop-color="#c8cdb8"/><stop offset="1" stop-color="#9cae9a"/></linearGradient>
          <linearGradient id="le-weather-wide-mid" x2="0" y2="1"><stop stop-color="#a7b99c"/><stop offset="1" stop-color="#718e7b"/></linearGradient>
          <linearGradient id="le-weather-wide-near" x2="0" y2="1"><stop stop-color="#7d9c7c"/><stop offset="1" stop-color="#496f63"/></linearGradient>
          <linearGradient id="le-weather-wide-river" x2="0" y2="1"><stop stop-color="#a6d8d1"/><stop offset=".5" stop-color="#69bfc0"/><stop offset="1" stop-color="#378d98"/></linearGradient>
        </defs>
        <path d="M0 455 C120 410 210 430 315 385 C435 335 535 400 650 370 C765 335 860 390 970 360 C1085 330 1190 370 1300 345 C1420 320 1510 350 1600 315 L1600 900H0Z" fill="url(#le-weather-wide-far)"/>
        <path d="M0 550 C120 490 235 525 350 475 C470 425 570 500 690 460 C810 420 915 490 1030 445 C1150 400 1270 470 1385 425 C1480 390 1540 430 1600 405 L1600 900H0Z" fill="url(#le-weather-wide-mid)"/>
        <path d="M0 650 C120 585 250 625 370 570 C500 515 610 600 730 550 C860 500 965 585 1085 530 C1210 480 1330 560 1450 510 C1520 480 1570 500 1600 490 L1600 900H0Z" fill="url(#le-weather-wide-near)"/>
        <path d="M-30 700 C150 635 255 710 405 660 C540 615 615 550 735 570 C865 590 875 700 1015 705 C1150 710 1200 635 1350 655 C1450 670 1510 700 1630 670 L1630 900H-30Z" fill="#66866f" opacity=".9"/>
        <path d="M790 480 C820 530 930 555 900 605 C870 660 770 670 810 720 C850 770 1010 760 1040 810 C1070 850 1190 870 1320 930 L1400 930 C1270 840 1170 805 1140 765 C1100 710 940 720 920 680 C900 640 1000 615 985 565 C970 520 870 505 850 465Z" fill="url(#le-weather-wide-river)"/>
        <path d="M830 500 C860 545 950 570 925 610 C900 650 820 675 850 715 C890 760 1035 760 1070 815 C1100 855 1210 880 1335 930" fill="none" stroke="#d5f2e8" stroke-opacity=".72" stroke-width="5" stroke-linecap="round"/>
        <path d="M-20 0H1620V920H-20Z" class="le-weather-land-tint" fill="#081b32" opacity="0"/>
      </svg>
      <svg class="le-weather-atmosphere" viewBox="0 0 1000 1600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id="le-weather-fog-gradient" x2="0" y2="1"><stop stop-color="#eef4ef" stop-opacity=".05"/><stop offset=".55" stop-color="#f2f4ed" stop-opacity=".72"/><stop offset="1" stop-color="#e4e9df" stop-opacity=".12"/></linearGradient></defs>
        <path d="M0 580 Q250 520 500 590 T1000 570V1120Q750 1050 500 1120T0 1100Z" fill="url(#le-weather-fog-gradient)"/>
      </svg>`;
  }

  function classifyAndPaint(stage, data) {
    const { condition, phase } = weatherState(data);
    stage.dataset.condition = condition;
    stage.dataset.phase = phase;
  }

  function activateWeather() {
    const view = mount('weather');
    if (!view) return;
    installStyles();
    view.panel.remove();
    view.root.replaceChildren();

    const stage = el('div', 'le-weather-immersive');
    stage.id = SCRIPT_ID;
    stage.setAttribute('aria-hidden', 'true');
    stage.dataset.condition = 'neutral';
    stage.dataset.phase = 'day';
    makeArtwork(stage);
    view.root.appendChild(stage);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) stage.dataset.motion = 'reduced';

    let controller = null;
    let disposed = false;
    let requestSerial = 0;

    function clearWeather() {
      requestSerial++;
      controller?.abort();
      controller = null;
      stage.dataset.condition = 'neutral';
      stage.dataset.phase = 'day';
    }

    async function refreshWeather() {
      if (disposed) return;
      if (window.liveEarthLocationAllowed?.() !== true) {
        clearWeather();
        return;
      }
      const point = globe()?.getLocation?.();
      const latitude = Number(point?.latitude);
      const longitude = Number(point?.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        clearWeather();
        return;
      }
      if (navigator.onLine === false) {
        clearWeather();
        return;
      }

      const serial = ++requestSerial;
      controller?.abort();
      controller = new AbortController();
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'weather_code,cloud_cover,is_day',
        timezone: 'auto'
      });
      try {
        const response = await fetch(`${API_ROOT}?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}`);
        const data = await response.json();
        if (disposed || serial !== requestSerial || window.liveEarthLocationAllowed?.() !== true) return;
        classifyAndPaint(stage, data);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          clearWeather();
          console.warn('[LIVE // EARTH] Weather background could not refresh.', error);
        }
      }
    }

    const onLocationState = event => {
      if (event.detail?.enabled === true && event.detail?.status === 'active') refreshWeather();
      else if (event.detail?.enabled === false && event.detail?.status !== 'pending') clearWeather();
    };
    const onLocationStop = clearWeather;
    const onOnline = () => refreshWeather();
    const onOffline = clearWeather;
    window.addEventListener('live-earth-location-state', onLocationState);
    window.addEventListener('live-earth-location-stop', onLocationStop);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (window.liveEarthLocationAllowed?.() === true) refreshWeather();

    return () => {
      disposed = true;
      requestSerial++;
      controller?.abort();
      window.removeEventListener('live-earth-location-state', onLocationState);
      window.removeEventListener('live-earth-location-stop', onLocationStop);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      stage.remove();
    };
  }

  runtime.registerFeature('weather', activateWeather);
})();
