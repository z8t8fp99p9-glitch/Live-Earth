/* LIVE // EARTH — Live Cameras workspace (Stacks feature slot).
   Uses the existing shared Home Earth layer and Stacks lifecycle.
   Public camera metadata/previews: OpenEye public catalogue API.
   No second globe, no Home Orb changes, no Location permission, no recording.
   Video feeds that cannot be embedded are opened at their publisher/source page. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Live Cameras runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive, globe, attachLayer } = runtime;
  const API = 'https://api.openeye.cam/v1';
  const MAP_URL = `${API}/catalog/map?bbox=-180,-85,180,85&zoom=3&cluster=auto&limit=500`;
  const CATALOG_URL = `${API}/catalog?bbox=-180,-85,180,85&limit=100&sort=fresh`;
  const OFFLINE_IMAGE = `${API}/offline.webp`;
  const cameraStyle = document.createElement('style');
  cameraStyle.id = 'le-live-cameras-style';
  cameraStyle.textContent = `
    .le-sfv--traffic .le-sfv-panel{background:radial-gradient(ellipse at 50% 0%,rgba(28,137,170,.23),transparent 52%),linear-gradient(180deg,rgba(3,20,34,.96),rgba(3,12,23,.93) 60%,rgba(2,7,14,.98))}
    .le-sfv--traffic .le-sfv-input{min-width:0;width:100%;min-height:42px;padding:10px 12px;border:1px solid rgba(157,213,238,.24);border-radius:12px;background:rgba(3,15,27,.72);color:#eaf8ff;font:500 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;outline:none}
    .le-sfv--traffic .le-sfv-input:focus{border-color:rgba(116,218,255,.8);box-shadow:0 0 0 2px rgba(77,188,231,.13)}
    .le-sfv--traffic .le-sfv-controls{display:flex;flex-wrap:wrap;gap:8px}
    .le-sfv--traffic .le-sfv-controls .le-sfv-input{flex:1 1 150px}
    .le-sfv--traffic .le-cameras-selected{display:grid;gap:8px}
    .le-sfv--traffic .le-cameras-name{margin:0;color:#f1faff;font-size:17px;line-height:1.3}
    .le-sfv--traffic .le-cameras-preview{display:block;width:100%;max-height:260px;object-fit:contain;border-radius:13px;background:#02070d;border:1px solid rgba(157,213,238,.2)}
    .le-sfv--traffic .le-cameras-row{width:100%;text-align:left;cursor:pointer;background:rgba(255,255,255,.035);border:1px solid rgba(160,207,231,.13)}
    .le-sfv--traffic .le-cameras-row[aria-pressed="true"]{border-color:rgba(255,211,107,.8);background:rgba(255,211,107,.08)}
    @media(max-width:420px){.le-sfv--traffic .le-sfv-controls{display:grid;grid-template-columns:1fr}.le-sfv--traffic .le-sfv-controls .le-sfv-input{width:100%}}
  `;
  document.head.appendChild(cameraStyle);
  const CATEGORY_LABELS = {
    all: 'All cameras', traffic: 'Traffic', ski: 'Mountains & ski', surf: 'Surf & coast',
    weather: 'Weather', wildlife: 'Wildlife', park: 'Parks', city: 'Cities',
    port: 'Ports', airport: 'Airports', volcano: 'Volcanoes', aurora: 'Aurora'
  };
  const validCoord = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const safeUrl = value => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
    catch (_) { return ''; }
  };
  function normalizeCamera(raw) {
    const lat = Number(raw?.lat), lon = Number(raw?.lon ?? raw?.lng);
    if (!raw || !raw.id || !validCoord(lat, lon)) return null;
    const view = raw.view && typeof raw.view === 'object' ? raw.view : {};
    const redistribution = raw.redistribution && typeof raw.redistribution === 'object' ? raw.redistribution : {};
    const attributionData = redistribution.attribution || {};
    const imageAllowed = view.render === 'image' && redistribution.preview_embed === true;
    const preview = imageAllowed ? safeUrl(view.url || raw.preview_url) : '';
    const watch = safeUrl(raw.watch_url || raw.source_url || (view.render === 'link' ? view.url : '') || raw.url);
    return {
      id: String(raw.id), handle: String(raw.handle || raw.id),
      title: String(raw.title || raw.name || 'Public camera').slice(0, 140),
      city: String(raw.city || '').slice(0, 90), country: String(raw.country || '').slice(0, 90),
      category: String(raw.category || 'other').toLowerCase(), lat, lon,
      live: raw.live === true, age: Number.isFinite(Number(raw.last_frame_age_s)) ? Number(raw.last_frame_age_s) : null,
      preview, watch, render: view.render || 'none',
      attribution: String(attributionData.name || raw.attribution || raw.source || 'Camera operator').slice(0, 120),
      attributionUrl: safeUrl(attributionData.url || raw.source_url || '')
    };
  }
  function ageLabel(seconds) {
    if (!Number.isFinite(seconds)) return 'Freshness not supplied';
    if (seconds < 60) return `Frame ${Math.max(0, Math.round(seconds))}s ago`;
    if (seconds < 3600) return `Frame ${Math.round(seconds / 60)}m ago`;
    if (seconds < 86400) return `Frame ${Math.round(seconds / 3600)}h ago`;
    return `Frame ${Math.round(seconds / 86400)}d ago`;
  }
  function cameraPlace(cam) { return [cam.city, cam.country].filter(Boolean).join(', ') || 'Location available on globe'; }

  function activateCameras() {
    const view = mount('traffic');
    if (!view) return () => {};
    const { root, body } = view;
    root.querySelector('.le-sfv-title').textContent = 'Live Cameras';
    root.querySelector('.le-sfv-subtitle').textContent = 'Explore public cameras around the planet';
    root.querySelector('.le-sfv-pill-text').textContent = 'PUBLIC CAMERA NETWORK · ONLINE';
    root.querySelector('.le-sfv-symbol').textContent = '◉';

    const status = el('p', 'le-sfv-status', 'Connecting to the public camera catalogue…');
    body.appendChild(status);
    const summary = el('div', 'le-sfv-metric-grid');
    const totalMetric = el('div', 'le-sfv-metric');
    totalMetric.append(el('span', 'le-sfv-metric-label', 'Cameras indexed globally'), el('strong', 'le-sfv-metric-value', '—'));
    const liveMetric = el('div', 'le-sfv-metric');
    liveMetric.append(el('span', 'le-sfv-metric-label', 'Recently active'), el('strong', 'le-sfv-metric-value', '—'));
    summary.append(totalMetric, liveMetric); body.appendChild(summary);

    const filters = card('Explore the globe', 'Camera pins are placed on the existing rotating Earth. Select a camera below to inspect its latest permitted preview or open the publisher’s viewer.');
    const search = el('input', 'le-sfv-input');
    search.type = 'search'; search.placeholder = 'Search city, country or camera'; search.setAttribute('aria-label', 'Search public cameras');
    const category = el('select', 'le-sfv-input'); category.setAttribute('aria-label', 'Filter camera category');
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) { const option = el('option', '', label); option.value = key; category.appendChild(option); }
    const filterRow = el('div', 'le-sfv-controls'); filterRow.append(search, category); filters.appendChild(filterRow); body.appendChild(filters);

    const selectedCard = card('Selected camera', 'Choose a camera from the list to view its available preview.');
    const selectedContent = el('div', 'le-cameras-selected'); selectedCard.appendChild(selectedContent); body.appendChild(selectedCard);
    const listCard = card('Cameras in this globe view', 'The directory is paged and sampled for a responsive mobile view. Camera availability can change at the source.');
    const list = el('div', 'le-sfv-list'); listCard.appendChild(list); body.appendChild(listCard);
    const actions = el('div', 'le-sfv-controls');
    const refresh = button('Refresh cameras', loadCameras);
    const openDirectory = button('Open full camera directory', () => window.open('https://openeye.cam/', '_blank', 'noopener,noreferrer'));
    actions.append(refresh, openDirectory); body.appendChild(actions);
    attribution(body, [
      { text: 'Camera catalogue and permitted previews: ' },
      { label: 'OpenEye', href: 'https://openeye.cam/' },
      { text: ' · Each camera’s operating agency is credited on its card. Public catalogue metadata is provided by the directory; video playback may open the publisher’s own player.' }
    ]);

    let cameras = [], mapPins = [], selectedId = '', selectedCategory = 'all', query = '';
    let controller = null, layerDispose = null, markerGroup = null, markerTHREE = null, markerGeometry = null, markerMaterials = null;
    let mapTotal = null, catalogTotal = null, refreshTimer = 0, observer = null;

    // Keep the existing Stacks orb identity and shared dock; relabel only its visible traffic slot.
    function relabelStacksCameraOrb() {
      document.querySelectorAll('[data-feature="traffic"]').forEach(node => {
        node.querySelectorAll('.le-feature-library-label,.orbLabel').forEach(label => { if (label.textContent !== 'Live Cameras') label.textContent = 'Live Cameras'; });
        node.querySelectorAll('.le-feature-library-detail').forEach(detail => { if (detail.textContent !== 'GLOBAL CAMERA NETWORK') detail.textContent = 'GLOBAL CAMERA NETWORK'; });
        if (node.matches('button') && node.getAttribute('aria-label') !== 'Live Cameras') node.setAttribute('aria-label', 'Live Cameras');
      });
    }
    observer = new MutationObserver(relabelStacksCameraOrb);
    observer.observe(document.body, { childList: true, subtree: true });
    relabelStacksCameraOrb();

    function visibleCameras() {
      const needle = query.trim().toLowerCase();
      return cameras.filter(cam => (selectedCategory === 'all' || cam.category === selectedCategory)
        && (!needle || `${cam.title} ${cam.city} ${cam.country} ${cam.category}`.toLowerCase().includes(needle)));
    }
    function clearMarkers() { if (markerGroup) markerGroup.clear(); }
    function paintMarkers() {
      if (!markerGroup || !markerTHREE || !markerGeometry || !markerMaterials) return;
      clearMarkers();
      const pins = mapPins.length ? mapPins : visibleCameras();
      // Map endpoint returns globally sampled camera points or zoom-level clusters.
      // Keep the scene lightweight; the searchable catalogue is independently paged.
      for (const pin of pins.slice(0, 450)) {
        const lat = Number(pin.lat), lon = Number(pin.lon ?? pin.lng);
        if (!validCoord(lat, lon)) continue;
        const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180;
        const selected = String(pin.id || '') === selectedId;
        const marker = new markerTHREE.Mesh(markerGeometry, selected ? markerMaterials.selected : markerMaterials.normal);
        marker.position.set(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).multiplyScalar(1.014);
        marker.scale.setScalar(selected ? 2.15 : Math.max(1, Math.min(2.6, 1 + Math.log2(Math.max(1, Number(pin.count) || 1)) * .22)));
        marker.userData.cameraId = String(pin.id || '');
        marker.userData.cameraCount = Number(pin.count) || 1;
        markerGroup.add(marker);
      }
      globe()?.requestRender?.();
    }
    layerDispose = attachLayer('traffic', ({ THREE, earth }) => {
      const group = new THREE.Group(); earth.add(group);
      markerGroup = group; markerTHREE = THREE;
      markerGeometry = new THREE.SphereGeometry(.0062, 8, 6);
      markerMaterials = {
        normal: new THREE.MeshBasicMaterial({ color: 0x7fe7ff, depthWrite: false }),
        selected: new THREE.MeshBasicMaterial({ color: 0xffd36b, depthWrite: false })
      };
      paintMarkers();
      return () => {
        earth.remove(group); group.clear(); markerGeometry?.dispose();
        Object.values(markerMaterials || {}).forEach(material => material.dispose());
        markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
      };
    });

    function renderSelected() {
      selectedContent.replaceChildren();
      const cam = cameras.find(item => item.id === selectedId);
      if (!cam) { selectedContent.appendChild(el('p', 'le-sfv-copy', 'Select a camera to inspect its available preview and source.')); return; }
      const heading = el('h3', 'le-cameras-name', cam.title);
      const place = el('p', 'le-sfv-copy', cameraPlace(cam));
      const meta = el('p', 'le-sfv-event-meta', `${cam.category.toUpperCase()} · ${cam.live ? 'RECENTLY ACTIVE' : 'STATUS UNCONFIRMED'} · ${ageLabel(cam.age)}`);
      selectedContent.append(heading, place, meta);
      if (cam.preview) {
        const image = el('img', 'le-cameras-preview');
        image.alt = `Permitted camera preview: ${cam.title}`;
        image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; image.src = cam.preview;
        image.onerror = () => { image.onerror = null; image.src = OFFLINE_IMAGE; image.alt = 'Camera preview unavailable'; };
        selectedContent.appendChild(image);
      } else {
        selectedContent.appendChild(el('p', 'le-sfv-status', cam.render === 'link' ? 'This camera must be watched on its publisher’s website.' : 'No embeddable preview is currently supplied for this camera.'));
      }
      const sourceLine = el('p', 'le-sfv-attribution');
      sourceLine.appendChild(document.createTextNode('Operator: '));
      if (cam.attributionUrl) { const a = el('a', '', cam.attribution); a.href = cam.attributionUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; sourceLine.appendChild(a); }
      else sourceLine.appendChild(document.createTextNode(cam.attribution));
      selectedContent.appendChild(sourceLine);
      if (cam.watch) {
        const watch = button(cam.preview ? 'Open camera source' : 'Watch at publisher', () => window.open(cam.watch, '_blank', 'noopener,noreferrer'));
        selectedContent.appendChild(watch);
      }
    }
    function renderList() {
      const rows = visibleCameras();
      list.replaceChildren();
      if (!rows.length) { list.appendChild(el('p', 'le-sfv-copy', cameras.length ? 'No cameras match this filter.' : 'No camera records are currently available. Refresh when online.')); }
      for (const cam of rows.slice(0, 60)) {
        const item = button('', () => { selectedId = cam.id; renderSelected(); renderList(); paintMarkers(); }, 'le-sfv-event le-cameras-row');
        item.setAttribute('aria-pressed', String(cam.id === selectedId));
        const title = el('span', 'le-sfv-event-place', cam.title);
        const detail = el('span', 'le-sfv-event-meta', `${cameraPlace(cam)} · ${cam.category} · ${ageLabel(cam.age)}`);
        const text = el('span', 'le-sfv-event-text'); text.append(title, detail);
        item.appendChild(text); list.appendChild(item);
      }
      if (rows.length > 60) list.appendChild(el('p', 'le-sfv-copy', `Showing 60 of ${rows.length} matching cameras. Narrow your search to explore more.`));
      totalMetric.querySelector('.le-sfv-metric-value').textContent = mapTotal !== null ? Number(mapTotal).toLocaleString() : String(catalogTotal ?? cameras.length);
      liveMetric.querySelector('.le-sfv-metric-value').textContent = String(cameras.filter(cam => cam.live).length);
    }
    search.addEventListener('input', () => { query = search.value; renderList(); paintMarkers(); });
    category.addEventListener('change', () => { selectedCategory = category.value; renderList(); paintMarkers(); });

    async function loadCameras() {
      if (!isActive('traffic')) return;
      if (navigator.onLine === false) {
        controller?.abort(); cameras = []; selectedId = ''; mapTotal = catalogTotal = null;
        renderList(); renderSelected(); paintMarkers();
        setStatus(status, 'Offline · public camera data is not shown from a saved snapshot.', 'error');
        refresh.disabled = false; return;
      }
      controller?.abort(); controller = new AbortController();
      const request = controller; refresh.disabled = true;
      setStatus(status, 'Loading current public camera locations…');
      try {
        const headers = { Accept: 'application/json' };
        const [mapResponse, catalogResponse] = await Promise.all([
          fetch(MAP_URL, { mode: 'cors', credentials: 'omit', cache: 'no-store', headers, signal: request.signal }),
          fetch(CATALOG_URL, { mode: 'cors', credentials: 'omit', cache: 'no-store', headers, signal: request.signal })
        ]);
        if (!mapResponse.ok) throw new Error(`Camera map returned ${mapResponse.status}.`);
        if (!catalogResponse.ok) throw new Error(`Camera catalogue returned ${catalogResponse.status}.`);
        const [mapPayload, catalogPayload] = await Promise.all([mapResponse.json(), catalogResponse.json()]);
        if (!isActive('traffic') || controller !== request) return;
        const rawRows = Array.isArray(catalogPayload.items) ? catalogPayload.items : Array.isArray(catalogPayload.cameras) ? catalogPayload.cameras : [];
        cameras = rawRows.map(normalizeCamera).filter(Boolean);
        mapPins = Array.isArray(mapPayload.items) ? mapPayload.items : Array.isArray(mapPayload.clusters) ? mapPayload.clusters : [];
        catalogTotal = Number.isFinite(Number(catalogPayload.total)) ? Number(catalogPayload.total) : cameras.length;
        mapTotal = Number.isFinite(Number(mapPayload.total)) ? Number(mapPayload.total) : catalogTotal;
        const first = cameras.find(cam => cam.preview || cam.watch);
        if (!cameras.some(cam => cam.id === selectedId)) selectedId = first?.id || cameras[0]?.id || '';
        renderList(); renderSelected(); paintMarkers();
        const mapItems = Array.isArray(mapPayload.items) ? mapPayload.items.length : Array.isArray(mapPayload.clusters) ? mapPayload.clusters.length : 0;
        setStatus(status, `Camera catalogue refreshed · ${mapTotal.toLocaleString()} locations indexed · ${mapItems} globe positions returned. Camera feeds may change at their source.`, 'success');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('traffic') && controller === request) {
          cameras = []; mapPins = []; selectedId = ''; mapTotal = catalogTotal = null;
          renderList(); renderSelected(); paintMarkers();
          setStatus(status, `The public camera catalogue is unavailable: ${error?.message || 'network error'}. No stale cameras are shown as live.`, 'error');
        }
      } finally { if (controller === request) refresh.disabled = false; }
    }
    const offline = () => {
      if (!isActive('traffic')) return;
      controller?.abort(); cameras = []; selectedId = ''; mapTotal = catalogTotal = null;
      renderList(); renderSelected(); paintMarkers();
      setStatus(status, 'Offline · live camera locations and previews are cleared.', 'error'); refresh.disabled = false;
    };
    const online = () => { if (isActive('traffic')) loadCameras(); };
    window.addEventListener('offline', offline); window.addEventListener('online', online);
    loadCameras();
    refreshTimer = window.setInterval(() => { if (isActive('traffic') && !document.hidden) loadCameras(); }, 5 * 60 * 1000);
    return () => {
      controller?.abort(); controller = null;
      if (refreshTimer) clearInterval(refreshTimer); refreshTimer = 0;
      window.removeEventListener('offline', offline); window.removeEventListener('online', online);
      observer?.disconnect(); observer = null;
      cameraStyle.remove();
      layerDispose?.(); layerDispose = null;
      cameras = []; mapPins = []; selectedId = ''; markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
    };
  }

  runtime.registerFeature('traffic', activateCameras, true);
})();
