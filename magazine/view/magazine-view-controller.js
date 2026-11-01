/* LIVE // EARTH — Magazine blank full-screen Feature Orb view.
   This is intentionally an empty view shell. No feed, publication or reader is connected. */
(() => {
  'use strict';
  if (window.LiveEarthMagazineViewModule) return;

  const VIEW_ID = 'magazine';
  const ROOT_ID = 'le-magazine-view';
  let root = null;

  function build() {
    if (root) return;

    const style = document.createElement('style');
    style.id = 'le-magazine-view-style';
    style.textContent = `
      #${ROOT_ID}{
        position:fixed;
        inset:0;
        z-index:6;
        display:block;
        overflow:hidden;
        isolation:isolate;
        background:#030509;
      }
      #${ROOT_ID}[hidden]{display:none!important}
    `;
    if (!document.getElementById(style.id)) document.head.appendChild(style);

    // Keep the view itself completely empty: no masthead, cards, controls or placeholder copy.
    root = document.createElement('section');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Magazine');
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  }

  function activate() {
    const stage = document.getElementById('le-feature-stage');
    if (stage) stage.hidden = true;
    build();
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('le-magazine-view-open');
  }

  function deactivate() {
    if (root) {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('le-magazine-view-open');
  }

  function install() {
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return false;

    api.register(VIEW_ID, {
      title: 'Magazine',
      shortLabel: 'Magazine',
      symbol: '📖',
      description: 'Blank full-screen Magazine view.',
      connected: true,
      activate,
      deactivate
    });

    window.__liveEarthMagazineViewInstalled = true;
    window.LiveEarthMagazineView = Object.freeze({
      open: () => api.open(VIEW_ID, 'api'),
      close: () => api.close('api'),
      isOpen: () => api.isActive(VIEW_ID)
    });
    return true;
  }

  window.LiveEarthMagazineViewModule = Object.freeze({ activate, deactivate });
  if (!install()) {
    window.addEventListener('live-earth-feature-views-ready', install, { once: true });
  }
})();
