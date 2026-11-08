/* LIVE // EARTH V118 — Weather full-screen feature view.
   Uses the shared Stacks feature runtime and existing Home Earth layer contract.
   The Global three-Orb dock and its lifecycle remain owned by the Global registry. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] weather feature runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive, globe } = runtime;

  // WEATHER — reads only a fresh position already supplied by the Location system.
  // It never calls geolocation itself. Turning Location OFF clears the view immediately.
  function activateWeather() {
    const view = mount('weather'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Checking Location permission…');
    body.appendChild(status);
    const metrics = el('div', 'le-sfv-metric-grid');
    const currentCard = card('Current conditions', 'Turn the red Location Orb ON to load weather for your current position. Weather requests are not made while Location is OFF.');
    currentCard.appendChild(metrics);
    const controls = el('div', 'le-sfv-controls');
    const refresh = button('Refresh weather', () => readExistingLocation());
    controls.appendChild(refresh); currentCard.appendChild(controls); body.appendChild(currentCard);
    attribution(body, [{ text: 'Weather data: ' }, { label: 'Open-Meteo', href: 'https://open-meteo.com/' }, { text: ' · CC BY 4.0 attribution required.' }]);
    let abortController = null, pollTimer = 0, locationEventHandler = null;
    function clearMetrics() { metrics.replaceChildren(); }
    function privacyState() {
      clearMetrics();
      setStatus(status, 'Location OFF · weather data cleared from this view. Turn ON the red Location Orb to request fresh local weather.');
      currentCard.querySelector('.le-sfv-copy').textContent = 'No weather request is made while Location is OFF. Coordinates are not saved by this view.';
      refresh.disabled = false;
    }
    function loadingState() {
      setStatus(status, 'Location is ON. Waiting for the existing location scanner to supply a fresh fix…');
      currentCard.querySelector('.le-sfv-copy').textContent = 'This view waits for the shared Location system; it does not start a separate location request.';
    }
    async function readExistingLocation() {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { privacyState(); return; }
      if (navigator.onLine === false) {
        clearMetrics();
        setStatus(status, 'Offline · internet is required for current weather. No saved weather is shown.', 'error');
        currentCard.querySelector('.le-sfv-copy').textContent = 'Weather data is unavailable offline. Reconnect to request a fresh model update.';
        refresh.disabled = false;
        return;
      }
      const point = globe()?.getLocation?.();
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) { loadingState(); return; }
      if (abortController) abortController.abort();
      abortController = new AbortController();
      const controller = abortController;
      refresh.disabled = true; clearMetrics();
      setStatus(status, 'Loading current conditions for the fresh, enabled location…');
      try {
        const q = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m', timezone: 'auto' });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${q.toString()}`, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}.`);
        const data = await response.json();
        if (!isActive('weather') || window.liveEarthLocationAllowed?.() !== true || abortController !== controller) return;
        const current = data?.current;
        if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error('The weather response did not contain current conditions.');
        const values = [
          ['Temperature', current.temperature_2m, data.current_units?.temperature_2m || '°C'],
          ['Feels like', current.apparent_temperature, data.current_units?.apparent_temperature || '°C'],
          ['Humidity', current.relative_humidity_2m, data.current_units?.relative_humidity_2m || '%'],
          ['Wind', current.wind_speed_10m, data.current_units?.wind_speed_10m || 'km/h'],
          ['Cloud cover', current.cloud_cover, data.current_units?.cloud_cover || '%'],
          ['Precipitation', current.precipitation, data.current_units?.precipitation || 'mm']
        ];
        metrics.replaceChildren();
        for (const [labelText, raw, unit] of values) {
          const metric = el('div', 'le-sfv-metric');
          metric.appendChild(el('span', 'le-sfv-metric-label', labelText));
          const val = raw === undefined || raw === null || !Number.isFinite(Number(raw)) ? '—' : String(raw);
          const valueNode = el('strong', 'le-sfv-metric-value', val);
          const unitNode = el('span', 'le-sfv-metric-unit', ` ${unit}`); valueNode.appendChild(unitNode);
          metric.appendChild(valueNode); metrics.appendChild(metric);
        }
        const observed = current.time ? new Date(current.time).toLocaleString() : 'time not supplied';
        setStatus(status, `Open-Meteo current-model snapshot · ${observed}. Coordinates remain in memory only.`, 'success');
        currentCard.querySelector('.le-sfv-copy').textContent = 'Conditions are model-based estimates for the enabled location, not an on-site weather-station reading.';
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('weather') && window.liveEarthLocationAllowed?.() === true) setStatus(status, `Weather could not be loaded: ${error?.message || 'connection unavailable'}.`, 'error');
      } finally {
        if (abortController === controller) { refresh.disabled = false; }
      }
    }
    function waitForExistingFix() {
      if (pollTimer) clearInterval(pollTimer);
      let remaining = 24;
      pollTimer = window.setInterval(() => {
        if (!isActive('weather')) { clearInterval(pollTimer); pollTimer = 0; return; }
        if (window.liveEarthLocationAllowed?.() !== true) { clearInterval(pollTimer); pollTimer = 0; privacyState(); return; }
        const point = globe()?.getLocation?.();
        if (point) { clearInterval(pollTimer); pollTimer = 0; readExistingLocation(); return; }
        remaining--;
        if (remaining <= 0) { clearInterval(pollTimer); pollTimer = 0; setStatus(status, 'Location is ON, but no fresh position is available yet. Wait for the red scanner to settle, then refresh.', 'error'); }
      }, 500);
    }
    locationEventHandler = event => {
      if (!isActive('weather')) return;
      if (event.detail?.enabled !== true || window.liveEarthLocationAllowed?.() !== true) {
        abortController?.abort(); privacyState();
      } else { loadingState(); waitForExistingFix(); }
    };
    const networkOfflineHandler = () => {
      if (!isActive('weather')) return;
      abortController?.abort();
      clearMetrics();
      setStatus(status, 'Offline · internet is required for current weather. No saved weather is shown.', 'error');
      currentCard.querySelector('.le-sfv-copy').textContent = 'Weather data is unavailable offline. Reconnect to request a fresh model update.';
      refresh.disabled = false;
    };
    const networkOnlineHandler = () => {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { privacyState(); return; }
      loadingState();
      if (globe()?.getLocation?.()) readExistingLocation();
      else waitForExistingFix();
    };
    window.addEventListener('live-earth-location-state', locationEventHandler);
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    if (window.liveEarthLocationAllowed?.() === true) { loadingState(); waitForExistingFix(); }
    else privacyState();
    return () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0; abortController?.abort(); abortController = null;
      if (locationEventHandler) window.removeEventListener('live-earth-location-state', locationEventHandler);
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
    };
  }



  runtime.registerFeature('weather', activateWeather);
})();
