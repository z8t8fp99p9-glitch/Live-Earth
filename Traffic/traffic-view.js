/* LIVE // EARTH — Traffic and dedicated Live Cams feature modules.
   Traffic remains its own Stacks feature. Live Cams is a separate feature Orb.
   Live Cams uses the existing shared Earth only; no second scene or renderer. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Traffic/Live Cams runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive, globe, attachLayer } = runtime;

  // TRAFFIC — retain the original honest preview; do not repurpose this Orb.
  function activateTraffic() {
    const view = mount('traffic'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Preview ready · no live traffic requests are made.');
    body.appendChild(status);
    const intro = card('Traffic layer · source pending', 'This view is reserved for traffic information. A verified live traffic source is not connected, so no congestion or road speeds are fabricated.');
    const rows = el('div', 'le-sfv-metric-grid');
    for (const [label, value] of [['Road network', 'Not connected'], ['Live congestion', 'Not connected'], ['Route speeds', 'Not connected'], ['Offline snapshot', 'Not available']]) {
      const item = el('div', 'le-sfv-metric');
      item.append(el('span', 'le-sfv-metric-label', label), el('strong', 'le-sfv-metric-value', value));
      rows.appendChild(item);
    }
    intro.appendChild(rows); body.appendChild(intro);
    attribution(body, [{ text: 'Traffic data source has not yet been connected.' }]);
    return () => {};
  }

  const API = 'https://api.openeye.cam/v1';
  const MAP_URL = `${API}/catalog/map?bbox=-180,-85,180,85&zoom=3&cluster=auto&limit=500`;
  const CATALOG_URL = `${API}/catalog?bbox=-180,-85,180,85&limit=100&sort=fresh`;
  const safeUrl = value => {
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; }
    catch (_) { return ''; }
  };
  const validCoord = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  function normalizeCamera(raw) {
    const lat = Number(raw?.lat), lon = Number(raw?.lon ?? raw?.lng);
    if (!raw || raw.id == null || !validCoord(lat, lon)) return null;
    const view = raw.view && typeof raw.view === 'object' ? raw.view : {};
    const rights = raw.redistribution && typeof raw.redistribution === 'object' ? raw.redistribution : {};
    const attributionData = rights.attribution || {};
    const preview = view.render === 'image' && rights.preview_embed === true
      ? safeUrl(view.url || raw.preview_url) : '';
    return {
      id: String(raw.id), title: String(raw.title || raw.name || 'Public camera').slice(0, 120),
      city: String(raw.city || ''), country: String(raw.country || ''),
      category: String(raw.category || 'other').toLowerCase(),
      lat, lon, live: raw.live === true,
      age: Number.isFinite(Number(raw.last_frame_age_s)) ? Number(raw.last_frame_age_s) : null,
      preview, watch: safeUrl(raw.watch_url || raw.source_url || (view.render === 'link' ? view.url : '') || raw.url),
      attribution: String(attributionData.name || raw.attribution || raw.source || 'Camera operator').slice(0, 120),
      attributionUrl: safeUrl(attributionData.url || raw.source_url || '')
    };
  }
  function activateLiveCams() {
    const view = mount('live-cams'); if (!view) return () => {};
    const { root, body } = view;
    root.querySelector('.le-sfv-title').textContent = 'Live Cams';
    root.querySelector('.le-sfv-subtitle').textContent = 'Explore public cameras around the planet';
    root.querySelector('.le-sfv-pill-text').textContent = 'PUBLIC CAMERA NETWORK';
    root.querySelector('.le-sfv-symbol').textContent = '◉';

    // Globe-first composition: leave the shared Earth visible through the entire view.
    const style = document.createElement('style');
    style.id = 'le-live-cams-globe-first-style';
    style.textContent = `
      .le-sfv--live-cams{z-index:6;pointer-events:none}
      .le-sfv--live-cams .le-sfv-panel{
        position:absolute;inset:0;overflow:hidden;padding:
        calc(env(safe-area-inset-top) + 62px) 18px calc(env(safe-area-inset-bottom) + 116px);
        background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
      }
      .le-sfv--live-cams .le-sfv-head{margin:0 auto 10px;pointer-events:none;text-shadow:0 2px 12px #00101c}
      .le-sfv--live-cams .le-sfv-pill{margin:0 auto;pointer-events:none}
      .le-sfv--live-cams .le-sfv-body{position:absolute;left:18px;right:18px;bottom:calc(env(safe-area-inset-bottom) + 116px);width:auto;max-height:34vh;overflow:auto;display:block;pointer-events:auto}
      .le-sfv--live-cams .le-sfv-card{background:rgba(3,15,27,.76);border:1px solid rgba(153,220,248,.25);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      .le-sfv--live-cams .le-sfv-status{margin:0 0 8px;background:rgba(2,12,23,.72);backdrop-filter:blur(12px)}
      .le-sfv--live-cams .le-cams-list{display:grid;gap:6px;max-height:20vh;overflow:auto;margin-top:8px}
      .le-sfv--live-cams .le-cams-item{display:block;width:100%;padding:9px 11px;text-align:left;border:1px solid rgba(153,201,234,.18);border-radius:11px;background:rgba(255,255,255,.045);color:#eef8ff}
      .le-sfv--live-cams .le-cams-item[aria-pressed="true"]{border-color:#ffd36b;background:rgba(255,211,107,.12)}
      .le-sfv--live-cams .le-cams-item small{display:block;color:#9db8cb;margin-top:3px}
      .le-sfv--live-cams .le-cams-preview{display:block;width:100%;max-height:150px;object-fit:contain;margin-top:8px;border-radius:10px;background:#02070d}
      .le-sfv--live-cams .le-cams-controls{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}
      .le-sfv--live-cams .le-cams-controls input{min-width:0}
      @media(orientation:landscape){.le-sfv--live-cams .le-sfv-body{left:auto;right:16px;bottom:calc(env(safe-area-inset-bottom) + 82px);width:min(360px,42vw);max-height:58vh}}
    `;
    document.head.appendChild(style);

    const status = el('p', 'le-sfv-status', 'Loading camera locations for the shared Earth…');
    body.appendChild(status);
    const panel = card('Find a camera', 'The Earth stays visible. Camera markers are plotted using their catalogue coordinates.');
    const search = el('input', 'le-sfv-input');
    search.type = 'search'; search.placeholder = 'Search city, country or camera';
    search.setAttribute('aria-label', 'Search cameras');
    const refresh = button('Refresh', load);
    const controls = el('div', 'le-cams-controls'); controls.append(search, refresh);
    panel.appendChild(controls);
    const selected = el('div', 'le-sfv-copy', 'Select a camera marker or a result below.');
    panel.appendChild(selected);
    const list = el('div', 'le-cams-list'); panel.appendChild(list);
    body.appendChild(panel);
    attribution(body, [
      { text: 'Public catalogue: ' },
      { label: 'OpenEye', href: 'https://openeye.cam/' },
      { text: ' · previews are shown only when redistribution is explicitly permitted.' }
    ]);

    let cameras = [], mapPins = [], selectedId = '';
    let controller = null, layerDispose = null, markerGroup = null, markerTHREE = null;
    let markerGeometry = null, markerMaterials = null, refreshTimer = 0;

    function candidatePins() {
      // The catalogue itself carries valid lat/lon. Use it when the map endpoint
      // returns no positions; never report a zero-pin globe while coordinates exist.
      return mapPins.length ? mapPins : cameras.map(c => ({
        id: c.id, lat: c.lat, lon: c.lon, count: 1
      }));
    }
    function paintMarkers() {
      if (!markerGroup || !markerTHREE || !markerGeometry || !markerMaterials) return;
      markerGroup.clear();
      const pins = candidatePins();
      for (const pin of pins.slice(0, 450)) {
        const lat = Number(pin.lat), lon = Number(pin.lon ?? pin.lng);
        if (!validCoord(lat, lon)) continue;
        const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180;
        const isSelected = String(pin.id || '') === selectedId;
        const marker = new markerTHREE.Mesh(markerGeometry, isSelected ? markerMaterials.selected : markerMaterials.normal);
        marker.position.set(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).multiplyScalar(1.016);
        marker.scale.setScalar(isSelected ? 2.2 : 1.35);
        marker.userData.cameraId = String(pin.id || '');
        markerGroup.add(marker);
      }
      globe()?.requestRender?.();
      return pins.length;
    }
    layerDispose = attachLayer('live-cams', ({ THREE, earth }) => {
      const group = new THREE.Group(); earth.add(group);
      markerGroup = group; markerTHREE = THREE;
      markerGeometry = new THREE.SphereGeometry(.0068, 10, 8);
      markerMaterials = {
        normal: new THREE.MeshBasicMaterial({ color: 0x77e7ff, depthWrite: false }),
        selected: new THREE.MeshBasicMaterial({ color: 0xffd36b, depthWrite: false })
      };
      paintMarkers();
      return () => {
        earth.remove(group); group.clear(); markerGeometry?.dispose();
        Object.values(markerMaterials || {}).forEach(m => m.dispose());
        markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
      };
    });

    function renderSelected() {
      const cam = cameras.find(c => c.id === selectedId);
      selected.replaceChildren();
      if (!cam) { selected.textContent = 'Select a camera marker or a result below.'; return; }
      const title = el('strong', '', cam.title);
      const place = el('span', '', ` · ${[cam.city, cam.country].filter(Boolean).join(', ') || 'Location on globe'}`);
      selected.append(title, place);
      if (cam.preview) {
        const img = el('img', 'le-cams-preview'); img.alt = `Permitted preview: ${cam.title}`;
        img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.src = cam.preview;
        selected.appendChild(img);
      }
      if (cam.watch) {
        const open = button('Open publisher camera', () => window.open(cam.watch, '_blank', 'noopener,noreferrer'));
        selected.appendChild(open);
      } else if (!cam.preview) {
        selected.appendChild(el('p', 'le-sfv-copy', 'No embeddable preview or publisher link is supplied.'));
      }
    }
    function renderList() {
      const q = search.value.trim().toLowerCase();
      const rows = cameras.filter(c => !q || `${c.title} ${c.city} ${c.country} ${c.category}`.toLowerCase().includes(q));
      list.replaceChildren();
      rows.slice(0, 18).forEach(cam => {
        const item = button('', () => {
          selectedId = cam.id; renderSelected(); renderList(); paintMarkers();
        }, 'le-cams-item');
        item.setAttribute('aria-pressed', String(cam.id === selectedId));
        item.append(el('span', '', cam.title), el('small', '', `${[cam.city, cam.country].filter(Boolean).join(', ') || 'Mapped location'} · ${cam.category}`));
        list.appendChild(item);
      });
      if (!rows.length) list.appendChild(el('p', 'le-sfv-copy', 'No matching cameras in the current catalogue sample.'));
    }
    search.addEventListener('input', renderList);

    async function load() {
      if (!isActive('live-cams')) return;
      if (navigator.onLine === false) {
        controller?.abort(); cameras = []; mapPins = []; selectedId = '';
        renderList(); renderSelected(); paintMarkers();
        setStatus(status, 'Offline · live camera markers and previews are cleared.', 'error');
        refresh.disabled = false; return;
      }
      controller?.abort(); controller = new AbortController();
      const request = controller; refresh.disabled = true;
      setStatus(status, 'Fetching camera coordinates…');
      try {
        const headers = { Accept: 'application/json' };
        const [mapRes, catalogRes] = await Promise.all([
          fetch(MAP_URL, { mode: 'cors', credentials: 'omit', cache: 'no-store', headers, signal: request.signal }),
          fetch(CATALOG_URL, { mode: 'cors', credentials: 'omit', cache: 'no-store', headers, signal: request.signal })
        ]);
        if (!mapRes.ok || !catalogRes.ok) throw new Error(`Camera catalogue returned ${mapRes.status}/${catalogRes.status}.`);
        const [mapData, catalogData] = await Promise.all([mapRes.json(), catalogRes.json()]);
        if (!isActive('live-cams') || controller !== request) return;
        const raw = Array.isArray(catalogData.items) ? catalogData.items : Array.isArray(catalogData.cameras) ? catalogData.cameras : [];
        cameras = raw.map(normalizeCamera).filter(Boolean);
        mapPins = Array.isArray(mapData.items) ? mapData.items : Array.isArray(mapData.clusters) ? mapData.clusters : [];
        selectedId = cameras.some(c => c.id === selectedId) ? selectedId : (cameras[0]?.id || '');
        renderList(); renderSelected();
        const pinCount = paintMarkers() || 0;
        const indexed = Number(mapData.total ?? catalogData.total ?? cameras.length);
        setStatus(status, `${indexed.toLocaleString()} locations indexed · ${pinCount} globe positions plotted · ${cameras.length} camera records loaded.`, 'success');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('live-cams') && controller === request) {
          cameras = []; mapPins = []; selectedId = '';
          renderList(); renderSelected(); paintMarkers();
          setStatus(status, `Camera locations unavailable: ${error?.message || 'network error'}. The shared Earth remains visible.`, 'error');
        }
      } finally { if (controller === request) refresh.disabled = false; }
    }
    const offline = () => {
      if (!isActive('live-cams')) return;
      controller?.abort(); cameras = []; mapPins = []; selectedId = '';
      renderList(); renderSelected(); paintMarkers();
      setStatus(status, 'Offline · live camera markers and previews are cleared.', 'error');
      refresh.disabled = false;
    };
    const online = () => { if (isActive('live-cams')) load(); };
    window.addEventListener('offline', offline); window.addEventListener('online', online);
    load();
    refreshTimer = window.setInterval(() => { if (isActive('live-cams') && !document.hidden) load(); }, 5 * 60 * 1000);
    return () => {
      controller?.abort(); controller = null;
      if (refreshTimer) clearInterval(refreshTimer);
      window.removeEventListener('offline', offline); window.removeEventListener('online', online);
      layerDispose?.(); layerDispose = null; style.remove();
      cameras = []; mapPins = []; selectedId = '';
    };
  }

  // The original Traffic feature stays registered; Live Cams gets its own Orb.
  runtime.registerFeature('traffic', activateTraffic);
  runtime.registerFeature('live-cams', activateLiveCams, true);
})();
