/* LIVE // EARTH — iOS standalone root-flow candidate.
 * Experimental and additive: keep orb-controls-v4.js viewport recovery unchanged.
 * Runs only in an iOS/iPadOS Home Screen standalone app. No storage/location access.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
  const standaloneQuery = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isStandalone = navigator.standalone === true || standaloneQuery;
  if (!isIOS || !isStandalone) return;
  if (root.classList.contains('le-ios-standalone-root-flow-candidate')) return;

  root.classList.add('le-ios-standalone-root-flow-candidate');

  const style = document.createElement('style');
  style.id = 'le-ios-standalone-root-flow-candidate-style';
  style.textContent = `
    /* Mirror the successful isolated v7 scrollable-root experiment. */
    html.le-ios-standalone-root-flow-candidate,
    html.le-ios-standalone-root-flow-candidate body {
      width: 100% !important;
      height: auto !important;
      min-height: calc(100vh + var(--le-ios-viewport-gap, 0px)) !important;
      min-height: calc(100dvh + var(--le-ios-viewport-gap, 0px)) !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: none !important;
      touch-action: auto !important;
    }
    html.le-ios-standalone-root-flow-candidate body {
      position: relative !important;
      inset: auto !important;
      padding: 0 !important;
    }
    /* Let the scene create a real in-flow height, as in test v7. */
    html.le-ios-standalone-root-flow-candidate #scene {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;
      display: block !important;
      touch-action: none !important;
    }
  `;
  (document.head || root).appendChild(style);

  let timers = [];
  function syncRootGap() {
    const width = Math.max(1, window.innerWidth || root.clientWidth || 1);
    const height = Math.max(1, window.innerHeight || root.clientHeight || 1);
    const screenHeight = Number(window.screen && window.screen.height);
    // screen.height may remain in portrait coordinates during landscape.
    // Never extrapolate a portrait-sized gap while the viewport is landscape.
    const isPortrait = height >= width;
    const gap = isPortrait && Number.isFinite(screenHeight)
      ? Math.max(0, screenHeight - height)
      : 0;
    root.style.setProperty('--le-ios-viewport-gap', `${gap}px`);
  }

  function settleRootAfterTransition() {
    timers.forEach(timer => window.clearTimeout(timer));
    timers = [];
    syncRootGap();
    for (const delay of [180, 420, 800]) {
      timers.push(window.setTimeout(syncRootGap, delay));
    }
  }

  // Prime the height before the app's main layout is parsed, then follow iOS
  // viewport changes. The original Orb hit-test recovery remains responsible
  // for its own remeasurement and scroll-to-top handling after transitions.
  syncRootGap();
  window.addEventListener('resize', syncRootGap, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncRootGap, { passive: true });
  }
  window.addEventListener('orientationchange', settleRootAfterTransition, { passive: true });
  window.addEventListener('pageshow', settleRootAfterTransition, { passive: true });
})();
