/* LIVE // EARTH V118 — Earthquakes full-screen feature view.
   Uses the shared Stacks feature runtime and existing Home Earth layer contract.
   The Global three-Orb dock and its lifecycle remain owned by the Global registry. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] earthquakes feature runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive, globe } = runtime;
  const { attachLayer, timeLabel } = runtime;

  const QUAKE_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  function simplifyQuakes(payload) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    return features.map(item => {
      const c = item?.geometry?.coordinates, p = item?.properties;
      if (!Array.isArray(c) || c.length < 3 || !p) return null;
      const lon = Number(c[0]), lat = Number(c[1]), depth = Number(c[2]), mag = Number(p.mag);
      if (![lon, lat, depth, mag].every(Number.isFinite) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      const url = typeof p.url === 'string' && p.url.startsWith('https://earthquake.usgs.gov/earthquakes/eventpage/') ? p.url : 'https://earthquake.usgs.gov/earthquakes/';
      return { id: String(item.id || `${lon}:${lat}:${p.time}`), mag, place: String(p.place || 'Location not supplied').slice(0, 160), time: Number(p.time) || 0, depth, lat, lon, url };
    }).filter(Boolean).sort((a, b) => b.mag - a.mag).slice(0, 120);
  }
  function formatAgo(timestamp) {
    const mins = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60); if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} d ago`;
  }
  function activateEarthquakes() {
    const view = mount('earthquakes'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Checking the recent USGS earthquake feed…'); body.appendChild(status);
    const summary = el('div', 'le-sfv-metric-grid');
    const countMetric = el('div', 'le-sfv-metric'); countMetric.append(el('span', 'le-sfv-metric-label', 'Events today'), el('strong', 'le-sfv-metric-value', '—'));
    const largestMetric = el('div', 'le-sfv-metric'); largestMetric.append(el('span', 'le-sfv-metric-label', 'Largest reported'), el('strong', 'le-sfv-metric-value', '—'));
    summary.append(countMetric, largestMetric); body.appendChild(summary);
    const listCard = card('Largest recent events', 'Select an event to open its official USGS details. Markers are placed on the existing rotating Earth. The feed is refreshed while this view is open; no saved snapshot is presented as live.');
    const list = el('div', 'le-sfv-list'); listCard.appendChild(list); body.appendChild(listCard);
    const refresh = button('Refresh USGS feed', loadQuakes); const row = el('div', 'le-sfv-controls'); row.appendChild(refresh); body.appendChild(row);
    attribution(body, [{ text: 'Event data: ' }, { label: 'USGS real-time GeoJSON feeds', href: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php' }, { text: ' · The official latest-day feed is generally refreshed every minute.' }]);
    let events = [], savedAt = 0, refreshTimer = 0, visibilityHandler = null;
    let layerDispose = null, markerGroup = null, markerTHREE = null, markerMaterials = null, markerGeometry = null, requestController = null;
    function clearMarkerChildren() {
      if (!markerGroup || !markerTHREE) return;
      markerGroup.clear();
    }
    function paintMarkers() {
      if (!markerGroup || !markerTHREE || !markerMaterials || !markerGeometry) return;
      clearMarkerChildren();
      for (const event of events.slice(0, 120)) {
        const phi = event.lat * Math.PI / 180, lambda = event.lon * Math.PI / 180;
        const marker = new markerTHREE.Mesh(markerGeometry, event.mag >= 5 ? markerMaterials.high : event.mag >= 3.5 ? markerMaterials.mid : markerMaterials.low);
        marker.position.set(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).multiplyScalar(1.012);
        const scale = Math.max(.75, Math.min(2.7, .55 + Math.pow(10, Math.max(0, event.mag) * .20) * .19));
        marker.scale.setScalar(scale); markerGroup.add(marker);
      }
      globe()?.requestRender?.();
    }
    layerDispose = attachLayer('earthquakes', ({ THREE, earth }) => {
      const group = new THREE.Group(); earth.add(group);
      markerGroup = group; markerTHREE = THREE; markerGeometry = new THREE.SphereGeometry(.0055, 8, 6);
      markerMaterials = {
        low: new THREE.MeshBasicMaterial({ color: 0xffd18a, depthWrite: false }),
        mid: new THREE.MeshBasicMaterial({ color: 0xff8d4d, depthWrite: false }),
        high: new THREE.MeshBasicMaterial({ color: 0xff365d, depthWrite: false })
      };
      paintMarkers();
      return () => {
        earth.remove(group); group.clear(); markerGeometry?.dispose();
        Object.values(markerMaterials || {}).forEach(material => material.dispose());
        markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
      };
    });
    function renderEventList() {
      countMetric.querySelector('.le-sfv-metric-value').textContent = String(events.length);
      largestMetric.querySelector('.le-sfv-metric-value').textContent = events.length ? `M ${events[0].mag.toFixed(1)}` : '—';
      list.replaceChildren();
      if (!events.length) {
        list.appendChild(el('p', 'le-sfv-copy', 'No live events are currently displayed. Connect to the internet or refresh to request the official feed. This view does not show saved events as current data.'));
        // Clear globe markers as well as the list when offline or when the feed fails.
        paintMarkers();
        return;
      }
      for (const event of events.slice(0, 6)) {
        const link = el('a', 'le-sfv-event'); link.href = event.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.appendChild(el('span', 'le-sfv-mag', `M${event.mag.toFixed(1)}`));
        const details = el('span', 'le-sfv-event-text');
        details.appendChild(el('span', 'le-sfv-event-place', event.place));
        details.appendChild(el('span', 'le-sfv-event-meta', `${formatAgo(event.time)} · depth ${Number(event.depth).toFixed(1)} km`));
        link.appendChild(details); list.appendChild(link);
      }
      paintMarkers();
    }
    async function loadQuakes() {
      if (!isActive('earthquakes')) return;
      if (navigator.onLine === false) {
        requestController?.abort();
        events = []; savedAt = 0; renderEventList();
        setStatus(status, 'Offline · internet is required for the current USGS feed. No saved earthquake data is shown.', 'error');
        refresh.disabled = false; globe()?.requestRender?.();
        return;
      }
      if (requestController) requestController.abort();
      requestController = new AbortController();
      const controller = requestController; refresh.disabled = true;
      setStatus(status, 'Loading the latest USGS feed from the internet…');
      try {
        const response = await fetch(QUAKE_FEED, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`USGS feed returned ${response.status}.`);
        const payload = await response.json();
        const fresh = simplifyQuakes(payload);
        if (!fresh.length && !Array.isArray(payload?.features)) throw new Error('The USGS feed format was not recognized.');
        if (!isActive('earthquakes') || requestController !== controller) return;
        events = fresh; savedAt = Number(payload?.metadata?.generated) || Date.now(); renderEventList();
        setStatus(status, `USGS feed refreshed ${timeLabel(savedAt)} · latest-day catalogue.`, 'success');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('earthquakes') && requestController === controller) {
          events = []; savedAt = 0; renderEventList();
          const offline = navigator.onLine === false ? ' Internet connection required; no cached earthquake data is shown offline.' : ' No saved snapshot is presented as live data.';
          setStatus(status, `The live USGS feed is unavailable: ${error?.message || 'connection failed'}.${offline}`, 'error');
        }
      } finally { if (requestController === controller) refresh.disabled = false; }
    }
    const networkOfflineHandler = () => {
      if (!isActive('earthquakes')) return;
      requestController?.abort();
      events = []; savedAt = 0; renderEventList();
      setStatus(status, 'Offline · internet is required for the current USGS feed. No saved earthquake data is shown.', 'error');
      refresh.disabled = false; globe()?.requestRender?.();
    };
    const networkOnlineHandler = () => { if (isActive('earthquakes')) loadQuakes(); };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    renderEventList();
    loadQuakes();
    refreshTimer = window.setInterval(() => { if (isActive('earthquakes') && !document.hidden) loadQuakes(); }, 60 * 1000);
    visibilityHandler = () => { if (!document.hidden && isActive('earthquakes')) loadQuakes(); };
    document.addEventListener('visibilitychange', visibilityHandler);
    return () => {
      if (refreshTimer) clearInterval(refreshTimer); refreshTimer = 0;
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      requestController?.abort(); requestController = null;
      if (layerDispose) layerDispose(); layerDispose = null;
      markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
    };
  }



  runtime.registerFeature('earthquakes', activateEarthquakes);
})();
