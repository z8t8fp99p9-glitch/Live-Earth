/* LIVE // EARTH — Original Living Landscape Background
   Restored directly from the user-supplied 2026-11-09 Weather ZIP.
   Only the illustrated 2D atmosphere remains: no characters and no visible UI.
   Weather data is supplied by Open-Meteo; the shared Global Orb dock stays app-owned. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, el, isActive, globe } = runtime;
  const STYLE_ID = 'le-weather-original-landscape-style';
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather {
        position:absolute!important; inset:0!important; width:100%!important; height:100%!important;
        max-width:none!important; overflow:hidden!important; padding:0!important; margin:0!important;
        border:0!important; border-radius:0!important; background:#8bc8e8!important;
        isolation:isolate; pointer-events:none;
      }
      .le-sfv--weather > .le-sfv-panel { display:none!important; }
      .le-weather-atmosphere {
        position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; isolation:isolate;
        background:linear-gradient(180deg,#8bc8e8 0%,#d8e8e8 47%,#e9d5ad 100%);
        transition:background 1.2s ease;
      }
      .le-weather-sky {
        position:absolute; inset:0;
        background:linear-gradient(180deg,#6fb5df 0%,#c5e1e7 56%,#f2d8ae 100%);
        transition:background 1.5s ease,filter 1.5s ease;
      }
      .le-weather-sun {
        position:absolute; top:13%; right:14%; width:clamp(58px,16vw,104px); aspect-ratio:1;
        border-radius:50%; opacity:.88;
        background:radial-gradient(circle,#fffde7 0 24%,#ffe6a0 44%,#ffdb7b99 61%,transparent 72%);
        filter:drop-shadow(0 0 25px #ffe9a8aa); transition:opacity 1s ease,transform 1.5s ease;
      }
      .le-weather-sun:after {
        content:""; position:absolute; inset:-28%; border-radius:50%;
        background:repeating-conic-gradient(from 0deg,#fff0 0 9deg,#fff5 10deg 11deg,#fff0 12deg 30deg);
        mask:radial-gradient(circle,transparent 47%,#000 50% 55%,transparent 60%);
        animation:le-weather-sun-turn 90s linear infinite;
      }
      .le-weather-moon {
        position:absolute; top:12%; right:16%; width:clamp(44px,12vw,76px); aspect-ratio:1;
        border-radius:50%; opacity:0;
        background:radial-gradient(circle at 36% 34%,#fff 0 5%,#e7efff 40%,#b7c7e5 74%,#9aafd0 100%);
        box-shadow:0 0 28px #d7e7ff88; transition:opacity 1s ease;
      }
      .le-weather-cloud-layer {
        position:absolute; inset:5% -10% auto; height:38%;
        opacity:var(--le-cloud-opacity,.35); transition:opacity 1s ease;
      }
      .le-weather-cloud {
        position:absolute; width:clamp(145px,42vw,280px); height:auto; fill:#fff;
        filter:drop-shadow(0 8px 12px #456d8640);
        animation:le-weather-cloud-drift var(--le-cloud-duration,54s) linear infinite alternate;
      }
      .le-weather-cloud--one { top:20%; left:-3%; }
      .le-weather-cloud--two { top:1%; right:5%; width:clamp(125px,34vw,225px); opacity:.83; animation-duration:68s; animation-direction:alternate-reverse; }
      .le-weather-cloud--three { top:48%; left:39%; width:clamp(110px,30vw,205px); opacity:.65; animation-duration:77s; }
      .le-weather-landscape {
        position:absolute; left:0; right:0; bottom:0; width:100%; height:58%; overflow:visible;
      }
      .le-weather-landscape svg { display:block; width:100%; height:100%; overflow:visible; }
      .le-weather-rain,.le-weather-snow {
        position:absolute; inset:-8% 0 0; overflow:hidden; opacity:0; transition:opacity .5s ease;
      }
      .le-weather-particle {
        position:absolute; top:-12%; left:var(--particle-x);
        animation:le-weather-fall var(--particle-duration,1.3s) linear var(--particle-delay,0s) infinite;
        will-change:transform;
      }
      .le-weather-rain .le-weather-particle {
        width:1.5px; height:clamp(15px,3.5vh,28px); border-radius:2px;
        background:linear-gradient(180deg,transparent,#e5f7ffcc); transform:rotate(13deg);
      }
      .le-weather-snow .le-weather-particle {
        width:var(--particle-size,5px); height:var(--particle-size,5px); border-radius:50%;
        background:#fff; box-shadow:0 0 8px #fff9;
        animation-name:le-weather-snow-fall; animation-duration:var(--particle-duration,5s);
      }
      .le-weather-fog {
        position:absolute; inset:38% -20% 0; opacity:0;
        background:linear-gradient(180deg,#e7f1ed00,#e2eee8a8 54%,#e8f0e8aa);
        filter:blur(16px); transition:opacity 1.2s ease;
      }
      .le-weather-lightning {
        position:absolute; inset:0; opacity:0; background:#e9f6ff;
        mix-blend-mode:screen; pointer-events:none;
      }
      .le-weather-scene[data-phase="dawn"] .le-weather-sky { background:linear-gradient(180deg,#90b9d8,#e9c4aa 58%,#f3d4a8); }
      .le-weather-scene[data-phase="day"] .le-weather-sky { background:linear-gradient(180deg,#69b7e5,#c9e6e9 57%,#f2d8ad); }
      .le-weather-scene[data-phase="evening"] .le-weather-sky { background:linear-gradient(180deg,#697fb3 0%,#d69b9b 52%,#f2c18d 100%); }
      .le-weather-scene[data-phase="night"] .le-weather-sky { background:linear-gradient(180deg,#172c50 0%,#344c70 58%,#667a86 100%); }
      .le-weather-scene[data-weather="cloudy"] .le-weather-sky { filter:saturate(.68) brightness(.94); }
      .le-weather-scene[data-weather="rain"] .le-weather-sky,
      .le-weather-scene[data-weather="storm"] .le-weather-sky {
        background:linear-gradient(180deg,#425b76 0%,#718b9a 58%,#94a6a1 100%); filter:saturate(.7) brightness(.82);
      }
      .le-weather-scene[data-weather="snow"] .le-weather-sky { background:linear-gradient(180deg,#819eb7 0%,#d0e0e7 65%,#e8eee9 100%); }
      .le-weather-scene[data-weather="fog"] .le-weather-sky { background:linear-gradient(180deg,#9aaeb7,#c5d1cc 70%,#dce3d8); }
      .le-weather-scene[data-weather="hot"] .le-weather-sky { filter:saturate(1.12) brightness(1.08); }
      .le-weather-scene[data-phase="night"] .le-weather-sun { opacity:0; transform:translateY(24px); }
      .le-weather-scene[data-phase="night"] .le-weather-moon { opacity:.96; }
      .le-weather-scene[data-weather="rain"] .le-weather-sun,
      .le-weather-scene[data-weather="storm"] .le-weather-sun { opacity:0; }
      .le-weather-scene[data-weather="rain"] .le-weather-cloud-layer,
      .le-weather-scene[data-weather="storm"] .le-weather-cloud-layer { opacity:var(--le-cloud-opacity,.8); }
      .le-weather-scene[data-weather="rain"] .le-weather-rain,
      .le-weather-scene[data-weather="storm"] .le-weather-rain { opacity:var(--le-rain-opacity,.7); }
      .le-weather-scene[data-weather="snow"] .le-weather-snow { opacity:var(--le-snow-opacity,.8); }
      .le-weather-scene[data-weather="fog"] .le-weather-fog { opacity:.9; }
      .le-weather-scene[data-weather="storm"] .le-weather-lightning { animation:le-weather-flash 9s linear infinite; }
      .le-weather-scene[data-weather="rain"] .le-weather-landscape { filter:saturate(.86); }
      @keyframes le-weather-sun-turn { to { transform:rotate(360deg); } }
      @keyframes le-weather-cloud-drift { from { transform:translateX(0); } to { transform:translateX(var(--le-cloud-drift,13vw)); } }
      @keyframes le-weather-fall { to { transform:translate3d(var(--particle-drift,16px),115vh,0); } }
      @keyframes le-weather-snow-fall {
        0% { transform:translate3d(0,-8vh,0); }
        50% { transform:translate3d(var(--particle-drift,18px),48vh,0); }
        100% { transform:translate3d(calc(var(--particle-drift,18px) * -1),110vh,0); }
      }
      @keyframes le-weather-flash { 0%,92%,94%,100% { opacity:0; } 92.5% { opacity:.22; } 93% { opacity:0; } 93.5% { opacity:.12; } }
      @media (orientation:landscape) and (max-height:520px) { .le-weather-landscape { height:67%; } }
      @media (prefers-reduced-motion:reduce) {
        .le-weather-atmosphere *, .le-weather-atmosphere *::before, .le-weather-atmosphere *::after {
          animation:none!important; scroll-behavior:auto!important; transition:none!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createAtmosphere() {
    const scene = el('div', 'le-weather-atmosphere le-weather-scene');
    scene.dataset.weather = 'clear';
    scene.dataset.phase = 'day';
    scene.dataset.mode = 'calm';
    scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = `
      <div class="le-weather-sky"></div>
      <div class="le-weather-sun"></div><div class="le-weather-moon"></div>
      <div class="le-weather-cloud-layer">
        <svg class="le-weather-cloud le-weather-cloud--one" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
        <svg class="le-weather-cloud le-weather-cloud--two" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
        <svg class="le-weather-cloud le-weather-cloud--three" viewBox="0 0 240 100"><path d="M34 76 C9 76 5 45 25 32 C32 12 60 7 79 22 C98 -2 135 5 145 29 C169 18 196 35 196 57 C224 57 226 84 200 87 H37Z"/></svg>
      </div>
      <div class="le-weather-fog"></div>
      <div class="le-weather-rain"></div><div class="le-weather-snow"></div>
      <div class="le-weather-lightning"></div>
      <div class="le-weather-landscape">
        <svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMax slice">
          <path d="M0 83 Q62 44 121 91 T242 81 T420 76 V300 H0Z" fill="#8bb59d" opacity=".78"/>
          <path d="M0 133 Q67 82 144 131 T286 122 T420 110 V300 H0Z" fill="#5e9a80"/>
          <path d="M0 174 Q79 127 158 174 T310 168 T420 158 V300 H0Z" fill="#477e6b"/>
          <path d="M0 220 Q76 190 146 221 T286 211 T420 219 V300 H0Z" fill="#356b60"/>
          <path d="M168 300 Q194 256 211 227 Q231 199 252 218 Q281 244 301 300Z" fill="#8fc5c2" opacity=".78"/>
          <path d="M0 268 Q74 244 142 266 T273 265 T420 251 V300 H0Z" fill="#2d665e"/>
          <g fill="#f4d8ad" stroke="#805f55" stroke-width="2">
            <path d="M44 165 L67 143 L90 165 V197 H44Z"/><path d="M39 165 L67 137 L96 165" fill="none" stroke="#a86e65" stroke-width="5"/>
            <path d="M333 151 L357 130 L382 151 V183 H333Z"/><path d="M327 151 L357 124 L388 151" fill="none" stroke="#a86e65" stroke-width="5"/>
          </g>
          <g fill="#6a8d69"><circle cx="26" cy="176" r="17"/><circle cx="108" cy="183" r="21"/><circle cx="310" cy="165" r="18"/><circle cx="399" cy="177" r="22"/></g>
          <g stroke="#735b47" stroke-width="5" stroke-linecap="round"><path d="M26 185 V215 M108 193 V224 M310 174 V207 M399 187 V220"/></g>
          <g fill="#f4e9d7"><rect x="55" y="169" width="10" height="12" rx="2"/><rect x="73" y="169" width="10" height="12" rx="2"/><rect x="345" y="155" width="10" height="12" rx="2"/><rect x="364" y="155" width="10" height="12" rx="2"/></g>
          <path d="M0 287 Q110 267 202 288 T420 281" fill="none" stroke="#a5c99c" stroke-width="4" opacity=".65"/>
        </svg>
      </div>
    `;
    return scene;
  }

  function number(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function hourOf(time) {
    const match = /T(\d{2}):/.exec(String(time || ''));
    return match ? Number(match[1]) : 12;
  }
  function isSnow(item) {
    return number(item.snowfall) > 0 || [71,73,75,77,85,86].includes(number(item.weather_code));
  }
  function isRain(item) {
    return number(item.rain) > 0 || number(item.showers) > 0 || number(item.precipitation) > 0 ||
      [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(number(item.weather_code));
  }
  function isFog(item) { return [45,48].includes(number(item.weather_code)); }
  function visualState(item) {
    const temperature = number(item.feelsLike) ?? number(item.temperature);
    const wind = number(item.wind) ?? 0;
    const gusts = number(item.gusts) ?? wind;
    const cloud = number(item.cloudCover) ?? 0;
    const hour = hourOf(item.time);
    const evening = hour >= 16 && hour <= 19;
    const night = number(item.isDay) === 0 || hour >= 20 || hour < 5;
    const dawn = !night && hour >= 5 && hour <= 7;
    const phase = night ? 'night' : dawn ? 'dawn' : evening ? 'evening' : 'day';
    const snow = isSnow(item);
    const rain = isRain(item);
    const thunder = [95,96,99].includes(number(item.weather_code));
    const fog = isFog(item);
    const hot = temperature !== null && temperature >= 34;
    const weather = snow ? 'snow' : thunder ? 'storm' : rain ? 'rain' : fog ? 'fog' : cloud >= 65 ? 'cloudy' : hot ? 'hot' : 'clear';
    return { phase, weather, cloud, wind, gusts };
  }
  function createParticles(layer, kind, item) {
    layer.replaceChildren();
    const amount = number(kind === 'rain' ? item.precipitation : item.snowfall) ?? 0;
    const windDirection = number(item.windDirection) ?? 270;
    const directionalDrift = -Math.sin(windDirection * Math.PI / 180) * 18;
    const base = kind === 'rain'
      ? Math.round(Math.min(30, Math.max(6, amount * 5)))
      : Math.round(Math.min(26, Math.max(7, amount * 15 + 7)));
    const count = Math.max(0, Math.min(30, base));
    for (let i = 0; i < count; i++) {
      const particle = el('span', 'le-weather-particle');
      particle.style.setProperty('--particle-x', `${(i * 37 + 7) % 100}%`);
      particle.style.setProperty('--particle-delay', `${-((i * 17) % 31) / 10}s`);
      particle.style.setProperty('--particle-duration', kind === 'rain'
        ? `${Math.max(.55, 1.75 - amount * .08)}s`
        : `${4.2 + (i % 5) * .6}s`);
      particle.style.setProperty('--particle-drift', `${Math.round(directionalDrift + ((i * 13) % 15) - 7)}px`);
      if (kind === 'snow') particle.style.setProperty('--particle-size', `${3 + (i % 4)}px`);
      layer.appendChild(particle);
    }
  }

  function activateWeather() {
    const view = mount('weather');
    if (!view) return;
    addStyles();
    const scene = createAtmosphere();
    view.panel.remove();
    view.root.replaceChildren(scene);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scene.dataset.motion = 'reduced';
    }

    let abortController = null;
    let pollTimer = 0;
    let disposed = false;
    let requestSerial = 0;

    function clearVisualWeather() {
      requestSerial++;
      abortController?.abort();
      abortController = null;
      scene.dataset.weather = 'clear';
      scene.dataset.phase = 'day';
      scene.style.setProperty('--le-cloud-opacity', '.22');
      scene.style.setProperty('--le-rain-opacity', '0');
      scene.style.setProperty('--le-snow-opacity', '0');
      scene.querySelector('.le-weather-rain')?.replaceChildren();
      scene.querySelector('.le-weather-snow')?.replaceChildren();
    }

    function paintCurrentWeather(current) {
      const item = {
        time: current.time,
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        isDay: current.is_day,
        precipitation: current.precipitation,
        rain: current.rain,
        showers: current.showers,
        snowfall: current.snowfall,
        weather_code: current.weather_code,
        cloudCover: current.cloud_cover,
        wind: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        gusts: current.wind_gusts_10m
      };
      const state = visualState(item);
      scene.dataset.weather = state.weather;
      scene.dataset.phase = state.phase;
      scene.style.setProperty('--le-cloud-opacity', String(.12 + Math.max(0, Math.min(100, state.cloud)) / 100 * .85));
      scene.style.setProperty('--le-rain-opacity', String(Math.min(.95, .42 + (number(item.precipitation) ?? 0) * .22)));
      scene.style.setProperty('--le-snow-opacity', String(Math.min(.95, .45 + (number(item.snowfall) ?? 0) * .38)));
      const windDirection = number(item.windDirection) ?? 270;
      const windDrift = -Math.sin(windDirection * Math.PI / 180) * Math.max(5, state.wind * .45);
      scene.style.setProperty('--le-wind-drift', `${Math.round(windDrift)}px`);
      scene.style.setProperty('--le-cloud-drift', `${Math.round(Math.sign(windDrift || 1) * Math.max(24, Math.abs(windDrift) * 6))}px`);
      scene.style.setProperty('--le-cloud-duration', `${Math.max(20, 62 - state.wind * .55)}s`);
      createParticles(scene.querySelector('.le-weather-rain'), 'rain', item);
      createParticles(scene.querySelector('.le-weather-snow'), 'snow', item);
    }

    function waitingForLocation() {
      if (pollTimer) clearInterval(pollTimer);
      let remaining = 24;
      pollTimer = window.setInterval(() => {
        if (disposed || !isActive('weather')) { clearInterval(pollTimer); pollTimer = 0; return; }
        if (window.liveEarthLocationAllowed?.() !== true) {
          clearInterval(pollTimer); pollTimer = 0; clearVisualWeather(); return;
        }
        const point = globe()?.getLocation?.();
        if (point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))) {
          clearInterval(pollTimer); pollTimer = 0; readExistingLocation(); return;
        }
        remaining--;
        if (remaining <= 0) { clearInterval(pollTimer); pollTimer = 0; clearVisualWeather(); }
      }, 500);
    }

    async function readExistingLocation() {
      if (disposed || !isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { clearVisualWeather(); return; }
      if (navigator.onLine === false) { clearVisualWeather(); return; }
      const point = globe()?.getLocation?.();
      const latitude = Number(point?.latitude), longitude = Number(point?.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        waitingForLocation(); return;
      }
      abortController?.abort();
      const controller = new AbortController();
      abortController = controller;
      const serial = ++requestSerial;
      const query = new URLSearchParams({
        latitude: String(latitude), longitude: String(longitude),
        current: 'temperature_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        timezone: 'auto', wind_speed_unit: 'kmh', temperature_unit: 'celsius', precipitation_unit: 'mm'
      });
      try {
        const response = await fetch(`${API_ROOT}?${query.toString()}`, {
          mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
        });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}.`);
        const data = await response.json();
        if (disposed || !isActive('weather') || serial !== requestSerial ||
            window.liveEarthLocationAllowed?.() !== true) return;
        if (!data?.current || !Number.isFinite(Number(data.current.weather_code))) {
          throw new Error('The weather source did not return usable current conditions.');
        }
        paintCurrentWeather(data.current);
      } catch (error) {
        if (error?.name !== 'AbortError' && !disposed && isActive('weather') &&
            window.liveEarthLocationAllowed?.() === true) clearVisualWeather();
      } finally {
        if (abortController === controller) abortController = null;
      }
    }

    function onLocationState(event) {
      if (!isActive('weather')) return;
      if (event.detail?.enabled === true && window.liveEarthLocationAllowed?.() === true) waitingForLocation();
      else { if (pollTimer) clearInterval(pollTimer); pollTimer = 0; clearVisualWeather(); }
    }
    function onLocationStop() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      clearVisualWeather();
    }
    function onOnline() {
      if (window.liveEarthLocationAllowed?.() === true) readExistingLocation();
    }
    function onOffline() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      clearVisualWeather();
    }

    window.addEventListener('live-earth-location-state', onLocationState);
    window.addEventListener('live-earth-location-stop', onLocationStop);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (window.liveEarthLocationAllowed?.() === true) waitingForLocation();
    else clearVisualWeather();

    return () => {
      disposed = true;
      requestSerial++;
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0;
      abortController?.abort();
      abortController = null;
      window.removeEventListener('live-earth-location-state', onLocationState);
      window.removeEventListener('live-earth-location-stop', onLocationStop);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      scene.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  }

  runtime.registerFeature('weather', activateWeather);
})();
