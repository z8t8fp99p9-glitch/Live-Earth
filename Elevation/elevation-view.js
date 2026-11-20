/* LIVE // EARTH V155 — on-demand Elevation feature controller.
   Uses the shared Prime Earth layer interface; no second globe or location request is created. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Elevation feature runtime is unavailable.');
    return;
  }
  const { fetchImageBlob, textureFromBlob, getEarthRaster, timeLabel } = runtime;

  function activateElevation() {
    const view = runtime.mount('elevation'); if (!view) return () => {};
    const { body } = view;
    let reliefRequestController = null, elevationLookupController = null;
    const status = runtime.el('p', 'le-sfv-status', 'Preparing global shaded relief and bathymetry…'); body.appendChild(status);
    const controls = runtime.card('Relief layer', 'A global shaded-relief and bathymetry image over the same Earth sphere. This first layer changes the surface visualization; it does not physically displace the globe mesh.');
    const rangeLabel = runtime.el('label', 'le-sfv-range-label');
    const left = runtime.el('span', '', 'Overlay opacity'); const right = runtime.el('strong', '', '88%'); rangeLabel.append(left, right);
    const range = runtime.el('input', 'le-sfv-range'); range.type = 'range'; range.min = '25'; range.max = '100'; range.step = '5'; range.value = '88'; range.setAttribute('aria-label', 'Elevation layer opacity');
    const actions = runtime.el('div', 'le-sfv-controls');
    const refresh = runtime.button('Refresh relief layer', () => loadRelief());
    const toggle = runtime.button('Hide relief layer', () => {
      reliefVisible = !reliefVisible;
      if (reliefMesh) reliefMesh.visible = reliefVisible && !!reliefMaterial?.map;
      toggle.textContent = reliefVisible ? 'Hide relief layer' : 'Show relief layer';
      runtime.globe()?.requestRender?.();
    });
    actions.append(refresh, toggle); controls.append(rangeLabel, range, actions); body.appendChild(controls);

    const lookup = runtime.card('Point elevation lookup', 'Enter coordinates to ask Open-Meteo for a modelled surface elevation. Device location is never requested here. This image is a global relief/bathymetry baseline, not a time-varying live terrain scan; the coordinate lookup requires an internet connection. The numeric result is not a seafloor-depth measurement.');
    const inputRow = runtime.el('div', 'le-sfv-input-row');
    const latWrap = runtime.el('label', 'le-sfv-input-wrap', 'LATITUDE'); const latInput = runtime.el('input', 'le-sfv-input'); latInput.type = 'number'; latInput.min = '-90'; latInput.max = '90'; latInput.step = 'any'; latInput.placeholder = 'e.g. 27.0'; latInput.value = '0'; latWrap.appendChild(latInput);
    const lonWrap = runtime.el('label', 'le-sfv-input-wrap', 'LONGITUDE'); const lonInput = runtime.el('input', 'le-sfv-input'); lonInput.type = 'number'; lonInput.min = '-180'; lonInput.max = '180'; lonInput.step = 'any'; lonInput.placeholder = 'e.g. 78.0'; lonInput.value = '0'; lonWrap.appendChild(lonInput);
    inputRow.append(latWrap, lonWrap); lookup.appendChild(inputRow);
    const lookupStatus = runtime.el('p', 'le-sfv-status', 'No coordinate lookup requested.'); lookupStatus.style.marginTop = '10px'; lookup.appendChild(lookupStatus);
    const lookupActions = runtime.el('div', 'le-sfv-controls');
    const locate = runtime.button('Use enabled Location', () => {
      if (window.liveEarthLocationAllowed?.() !== true) { runtime.setStatus(lookupStatus, 'Location is OFF. Turn it ON first, or enter coordinates manually.', 'error'); return; }
      const point = runtime.globe()?.getLocation?.();
      if (!point) { runtime.setStatus(lookupStatus, 'Waiting for a fresh fix from the existing Location scanner.', 'error'); return; }
      latInput.value = point.latitude.toFixed(4); lonInput.value = point.longitude.toFixed(4);
      runtime.setStatus(lookupStatus, 'Copied the current enabled position into the fields. No new location request was made.');
    });
    const look = runtime.button('Look up elevation', async () => {
      const lat = Number(latInput.value), lon = Number(lonInput.value);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) { runtime.setStatus(lookupStatus, 'Enter a valid latitude (−90 to 90) and longitude (−180 to 180).', 'error'); return; }
      if (navigator.onLine === false) { runtime.setStatus(lookupStatus, 'Offline · internet is required for a point elevation lookup. No saved result is shown.', 'error'); return; }
      elevationLookupController?.abort();
      const controller = new AbortController(); elevationLookupController = controller;
      look.disabled = true; runtime.setStatus(lookupStatus, 'Querying the public elevation model online…');
      try {
        const q = new URLSearchParams({ latitude: String(lat), longitude: String(lon) });
        const response = await fetch(`https://api.open-meteo.com/v1/elevation?${q.toString()}`, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Elevation source returned ${response.status}.`);
        const data = await response.json();
        const elevation = Array.isArray(data?.elevation) ? Number(data.elevation[0]) : NaN;
        if (!Number.isFinite(elevation)) throw new Error('No elevation value was returned.');
        if (!runtime.isActive('elevation') || elevationLookupController !== controller) return;
        runtime.setStatus(lookupStatus, `Modelled surface elevation: ${Math.round(elevation).toLocaleString()} m at ${lat.toFixed(3)}°, ${lon.toFixed(3)}°.`, 'success');
      } catch (error) {
        if (error?.name !== 'AbortError' && runtime.isActive('elevation') && elevationLookupController === controller) {
          const offline = navigator.onLine === false ? ' Internet connection required; no saved result is used.' : '';
          runtime.setStatus(lookupStatus, `Elevation lookup unavailable: ${error?.message || 'connection failed'}.${offline}`, 'error');
        }
      } finally { if (elevationLookupController === controller) { elevationLookupController = null; look.disabled = false; } }
    });
    lookupActions.append(locate, look); lookup.appendChild(lookupActions); body.appendChild(lookup);
    runtime.attribution(body, [{ text: 'Global relief: ' }, { label: 'NASA GIBS', href: 'https://nasa-gibs.github.io/gibs-api-docs/' }, { text: ' · Point elevation: ' }, { label: 'Open-Meteo Elevation API', href: 'https://open-meteo.com/en/docs/elevation-api' }, { text: ' (90 m Copernicus DEM GLO-90 model estimate; Copernicus Programme attribution).' }]);

    let reliefMesh = null, reliefMaterial = null, reliefVisible = true, layerDispose = null, loading = false;
    layerDispose = runtime.attachLayer('elevation', ({ THREE, earth, redraw }) => {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: Number(range.value) / 100, depthWrite: false, depthTest: true, side: THREE.FrontSide });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 64), material);
      mesh.renderOrder = 2; mesh.visible = false; earth.add(mesh); reliefMesh = mesh; reliefMaterial = material;
      return () => {
        earth.remove(mesh); mesh.geometry.dispose(); material.map?.dispose(); material.dispose();
        if (reliefMesh === mesh) { reliefMesh = null; reliefMaterial = null; }
      };
    });
    range.addEventListener('input', () => { right.textContent = `${range.value}%`; if (reliefMaterial) { reliefMaterial.opacity = Number(range.value) / 100; reliefMaterial.needsUpdate = true; } runtime.globe()?.requestRender?.(); });
    async function loadRelief() {
      if (!runtime.isActive('elevation') || !reliefMaterial) return;
      if (navigator.onLine === false) {
        if (reliefMesh) reliefMesh.visible = false;
        runtime.setStatus(status, 'Offline · internet is required for the relief imagery. The base Earth remains unchanged.', 'error');
        runtime.globe()?.requestRender?.();
        return;
      }
      if (loading) return;
      loading = true; refresh.disabled = true;
      if (reliefMesh) reliefMesh.visible = false;
      runtime.globe()?.requestRender?.();
      runtime.setStatus(status, 'Loading NASA global shaded-relief and bathymetry imagery…');
      reliefRequestController?.abort();
      const controller = new AbortController(); reliefRequestController = controller;
      try {
        const url = await getEarthRaster('BlueMarble_ShadedRelief_Bathymetry');
        const result = await fetchImageBlob(url, 18000, controller.signal);
        const texture = await textureFromBlob(runtime.globe()?.getTHREE?.(), result.blob);
        if (!runtime.isActive('elevation') || !reliefMaterial || controller.signal.aborted) { texture.dispose(); return; }
        const old = reliefMaterial.map; reliefMaterial.map = texture; reliefMaterial.needsUpdate = true;
        if (reliefMesh) reliefMesh.visible = reliefVisible && !!reliefMaterial?.map;
        if (old && old !== texture) old.dispose();
        runtime.setStatus(status, `Global relief layer loaded from NASA · checked ${timeLabel(result.checkedAt)}.`, 'success');
        runtime.globe()?.requestRender?.();
      } catch (error) {
        if (error?.name !== 'AbortError' && runtime.isActive('elevation')) {
          const offline = navigator.onLine === false ? ' Internet connection required; no saved relief image is shown offline.' : '';
          runtime.setStatus(status, `Global relief imagery unavailable. The base Earth remains unchanged.${offline} ${error?.message || ''}`, 'error');
        }
      } finally {
        if (reliefRequestController === controller) { reliefRequestController = null; loading = false; refresh.disabled = false; }
      }
    }
    const networkOfflineHandler = () => {
      if (!runtime.isActive('elevation')) return;
      reliefRequestController?.abort();
      elevationLookupController?.abort();
      if (reliefMesh) reliefMesh.visible = false;
      const staleTexture = reliefMaterial?.map;
      if (reliefMaterial) { reliefMaterial.map = null; reliefMaterial.needsUpdate = true; }
      staleTexture?.dispose?.();
      runtime.setStatus(status, 'Offline · relief imagery is hidden until a fresh online request can be made. The base Earth remains unchanged.', 'error');
      runtime.setStatus(lookupStatus, 'Offline · internet is required for point elevation lookups. No saved result is shown.', 'error');
      refresh.disabled = false; look.disabled = false;
      runtime.globe()?.requestRender?.();
    };
    const networkOnlineHandler = () => {
      if (!runtime.isActive('elevation')) return;
      runtime.setStatus(status, 'Connection restored · requesting fresh relief imagery…');
      window.setTimeout(() => { if (runtime.isActive('elevation')) loadRelief(); }, 350);
      runtime.setStatus(lookupStatus, 'Online again · enter coordinates and request a fresh elevation result when needed.');
    };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    if (reliefMaterial && runtime.globe()?.getTHREE) loadRelief();
    else runtime.setStatus(status, 'The shared Earth layer interface is unavailable. The original Earth stays intact.', 'error');
    return () => {
      reliefRequestController?.abort(); reliefRequestController = null;
      elevationLookupController?.abort(); elevationLookupController = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      if (layerDispose) layerDispose(); layerDispose = null; reliefMesh = null; reliefMaterial = null;
    };
  }

  runtime.registerFeature('elevation', activateElevation, true);
})();
