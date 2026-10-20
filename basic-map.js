/* LIVE // EARTH — Basic Live map Stage 1. */
(() => {
  'use strict';
  const message = document.querySelector('#message');
  const show = text => { message.textContent = text; message.hidden = false; };
  const hide = () => { message.hidden = true; };
  const params = new URLSearchParams(location.search);
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));

  if (!params.has('lat') || !params.has('lon') || !Number.isFinite(lat) ||
      !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    show('Basic Live needs an approved location first. Return Home, turn on the red Location orb, and choose Basic Live again.');
    return;
  }
  if (!window.maplibregl) {
    show('The map engine could not load. Check your internet connection and try again.');
    return;
  }

  try {
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lon, lat],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      dragRotate: false,
      touchPitch: false
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:false,visualizePitch:false}), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}), 'bottom-left');
    map.on('load', hide);
    map.on('error', e => {
      console.warn('[LIVE // EARTH] Basic map error', e?.error || e);
      if (message.hidden) show('The map data did not load. Check your connection and try again.');
    });
  } catch (error) {
    console.error('[LIVE // EARTH] Basic map failed to initialize', error);
    show('Basic Live could not start on this device. Return Home and try again.');
  }
})();
