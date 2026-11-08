/* LIVE // EARTH V118 — Clouds full-screen feature view.
   Uses the shared Stacks feature runtime and existing Home Earth layer contract.
   The Global three-Orb dock and its lifecycle remain owned by the Global registry. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] clouds feature runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive, globe } = runtime;
  const { attachLayer, fetchImageBlob, textureFromBlob, getEarthRaster, timeLabel } = runtime;

  // CLOUDS — NASA's daily cloud-fraction visualization is a real data layer,
  // not a fabricated procedural cloud skin. The image is checked hourly while active;
  // the source product itself is daily/nearest-available, not a guaranteed hourly composite.
  function activateClouds() {
    const view = mount('clouds'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Preparing the latest available NASA cloud-fraction image…');
    body.appendChild(status);
    const controls = card('Layer controls', 'This is an observed cloud-fraction data product. Its colors represent cloud fraction; it is not a photographic cloud texture. The source composite is daily, and the app checks for a newer image hourly while this view is open.');
    const rangeLabel = el('label', 'le-sfv-range-label');
    const label = el('span', '', 'Layer opacity');
    const value = el('strong', '', '58%');
    rangeLabel.append(label, value);
    const range = el('input', 'le-sfv-range'); range.type = 'range'; range.min = '10'; range.max = '95'; range.step = '5'; range.value = '58'; range.setAttribute('aria-label', 'Cloud layer opacity');
    controls.append(rangeLabel, range);
    const actionRow = el('div', 'le-sfv-controls');
    const refresh = button('Refresh imagery', () => { loadCloudTexture(); });
    const toggle = button('Hide layer', () => {
      cloudVisible = !cloudVisible;
      if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && !!cloudMaterial?.map;
      toggle.textContent = cloudVisible ? 'Hide layer' : 'Show layer';
      globe()?.requestRender?.();
    });
    actionRow.append(refresh, toggle);
    controls.append(actionRow);
    body.appendChild(controls);
    attribution(body, [
      { text: 'Imagery: ' },
      { label: 'NASA Global Imagery Browse Services (GIBS)', href: 'https://nasa-gibs.github.io/gibs-api-docs/' },
      { text: ' · MODIS/Terra Cloud Fraction (Day).' }
    ]);
    let cloudVisible = true, cloudLayerMesh = null, cloudMaterial = null, layerDispose = null, hourlyTimer = 0, loading = false, cloudRequestController = null;
    function setCloudStatus(message, state = '') { if (isActive('clouds')) setStatus(status, message, state); }
    layerDispose = attachLayer('clouds', ({ THREE, earth, redraw }) => {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: Number(range.value) / 100, depthWrite: false, depthTest: true, side: THREE.FrontSide });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.009, 96, 64), material);
      mesh.renderOrder = 3; mesh.visible = false; earth.add(mesh);
      cloudLayerMesh = mesh; cloudMaterial = material;
      return () => {
        earth.remove(mesh); mesh.geometry.dispose(); material.map?.dispose(); material.dispose();
        if (cloudLayerMesh === mesh) { cloudLayerMesh = null; cloudMaterial = null; }
      };
    });
    range.addEventListener('input', () => {
      value.textContent = `${range.value}%`;
      if (cloudMaterial) { cloudMaterial.opacity = Number(range.value) / 100; cloudMaterial.needsUpdate = true; }
      globe()?.requestRender?.();
    });
    async function loadCloudTexture() {
      if (!isActive('clouds') || loading || !cloudMaterial) return;
      loading = true; refresh.disabled = true;
      // Never leave an older image visible while waiting for a fresh online response.
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      globe()?.requestRender?.();
      const request = new AbortController(); cloudRequestController = request;
      const requestedDates = [0, 1, 2].map(daysAgo => {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - daysAgo); return d.toISOString().slice(0, 10);
      });
      try {
        let result = null, usedDate = '', lastError = null;
        for (let i = 0; i < requestedDates.length; i++) {
          const date = requestedDates[i];
          try {
            const url = await getEarthRaster('MODIS_Terra_Cloud_Fraction_Day', date);
            result = await fetchImageBlob(url, 12000, request.signal);
            usedDate = date;
            break;
          } catch (error) {
            lastError = error;
            if (!isActive('clouds') || request.signal.aborted || error?.name === 'AbortError') throw error;
            if (i < requestedDates.length - 1) {
              setCloudStatus(`The cloud product for ${date} is not available yet. Trying the previous daily observation…`);
            }
          }
        }
        if (!result) throw lastError || new Error('No recent daily cloud product was returned.');
        const texture = await textureFromBlob(globeContextThree(), result.blob);
        if (!isActive('clouds') || cloudRequestController !== request || request.signal.aborted || !cloudMaterial) { texture.dispose(); return; }
        const old = cloudMaterial.map;
        cloudMaterial.map = texture; cloudMaterial.needsUpdate = true;
        if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && !!cloudMaterial?.map;
        if (old && old !== texture) old.dispose();
        setCloudStatus(`NASA cloud-fraction image loaded · product date ${usedDate} · checked ${timeLabel(result.checkedAt)}. This is a daily product, not a minute-by-minute live cloud feed.`, 'success');
        globe()?.requestRender?.();
      } catch (error) {
        if (request.signal.aborted || error?.name === 'AbortError' || !isActive('clouds') || cloudRequestController !== request) return;
        const offline = navigator.onLine === false ? ' An internet connection is required; no saved cloud image is shown offline.' : '';
        setCloudStatus(`Cloud imagery is unavailable. The base Earth remains unchanged.${offline} ${error?.message || ''}`, 'error');
      } finally {
        if (cloudRequestController === request) cloudRequestController = null;
        loading = false; refresh.disabled = false;
      }
    }
    function globeContextThree() { return window.LiveEarthScene?.getTHREE?.() || null; }
    // Get THREE from the shared layer contract; older cached contracts fail gracefully.
    if (!cloudMaterial || !globe()?.getTHREE) {
      setCloudStatus('The shared Earth layer interface is unavailable. Your original Earth stays intact.', 'error');
    } else loadCloudTexture();
    hourlyTimer = window.setInterval(() => { if (isActive('clouds') && !document.hidden) loadCloudTexture(); }, 60 * 60 * 1000);
    const networkOfflineHandler = () => {
      if (!isActive('clouds')) return;
      cloudRequestController?.abort();
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      const staleTexture = cloudMaterial?.map;
      if (cloudMaterial) { cloudMaterial.map = null; cloudMaterial.needsUpdate = true; }
      staleTexture?.dispose?.();
      setCloudStatus('Offline · cloud imagery is hidden. An internet connection is required for a fresh image.', 'error');
      globe()?.requestRender?.();
    };
    const networkOnlineHandler = () => {
      if (!isActive('clouds')) return;
      setCloudStatus('Connection restored · requesting the latest available NASA cloud image…');
      window.setTimeout(() => { if (isActive('clouds')) loadCloudTexture(); }, 350);
    };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    return () => {
      if (hourlyTimer) clearInterval(hourlyTimer);
      hourlyTimer = 0; cloudRequestController?.abort(); cloudRequestController = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      if (layerDispose) layerDispose();
      layerDispose = null; cloudLayerMesh = null; cloudMaterial = null;
    };
  }



  runtime.registerFeature('clouds', activateClouds);
})();
