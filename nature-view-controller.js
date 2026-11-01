/* Legacy compatibility loader. The actual Nature view controller lives in nature/view/. */
(() => {
  'use strict';
  if (window.LiveEarthNatureViewModule || window.__liveEarthNatureViewModuleLoading) return;
  window.__liveEarthNatureViewModuleLoading = true;
  const path = './nature/view/nature-view-controller.js';
  const url = new URL(path, document.baseURI).href;
  let script = [...document.scripts].find(item => item.src === url);
  if (script) return;
  script = document.createElement('script');
  script.src = path;
  script.async = true;
  script.onload = () => { window.__liveEarthNatureViewModuleLoading = false; };
  script.onerror = () => { window.__liveEarthNatureViewModuleLoading = false; console.error('[LIVE // EARTH] Nature view controller could not be loaded.'); };
  document.head.appendChild(script);
})();
