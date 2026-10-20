/* LIVE // EARTH — Basic Live map: always opens, with optional location. */
(() => {
  'use strict';
  const message = document.querySelector('#message');
  const show = text => { message.textContent = text; message.hidden = false; };
  const hide = () => { message.hidden = true; };
  const params = new URLSearchParams(location.search);
  const hasLat = params.has('lat'), hasLon = params.has('lon');
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  const hasValidLocation = hasLat && hasLon && Number.isFinite(lat) && Number.isFinite(lon) &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const notice = params.get('notice');

  if (!window.maplibregl) {
    show('The map engine could not load. Check your internet connection and try again.');
    return;
  }

  try {
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: hasValidLocation ? [lon, lat] : [0, 20],
      zoom: hasValidLocation ? 12 : 1.6,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      dragRotate: false,
      touchPitch: false
    });
    if (hasValidLocation) {
      map.once('load', () => {
        new maplibregl.Marker({color:'#ff425d'}).setLngLat([lon,lat]).addTo(map);
      });
    }
    map.addControl(new maplibregl.NavigationControl({showCompass:false,visualizePitch:false}), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}), 'bottom-left');
    if (notice) show(notice);
    else if (!hasValidLocation) show('Basic Live map · location is off. Explore freely; turn on the red Location orb when you want to center on yourself.');
    map.on('error', e => {
      console.warn('[LIVE // EARTH] Basic map error', e?.error || e);
      if (!message.hidden) return;
      show('Some map data could not load. Check your internet connection.');
    });
  } catch (error) {
    console.error('[LIVE // EARTH] Basic map failed to initialize', error);
    show('Basic Live could not start on this device. Check your connection and try again.');
  }
})();
