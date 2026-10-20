/* Isolated Basic Live test: no GPS request and no location dependency. */
(() => {
  'use strict';
  const message = document.querySelector('#message');
  const show = text => { message.textContent = text; message.hidden = false; };
  if (!window.maplibregl) {
    show('The map engine could not load. Check your internet connection and try again.');
    return;
  }
  try {
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [0, 20],
      zoom: 1.6,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      dragRotate: false,
      touchPitch: false
    });
    map.addControl(new maplibregl.NavigationControl({showCompass:false,visualizePitch:false}), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}), 'bottom-left');
    map.once('load', () => { message.hidden = true; });
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
