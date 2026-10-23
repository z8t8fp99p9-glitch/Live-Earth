/* LIVE // EARTH — global iOS standalone root-flow A/B candidate v77.
 * Uses the successful v7 scrollable-root technique for the entire app shell.
 * A/B mode bypasses only the legacy Orb viewport-recovery event listeners
 * on iOS/iPadOS standalone, without deleting their implementation.
 * No location, localStorage, IndexedDB, or user-data access in this helper.
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
  if (root.classList.contains('le-ios-standalone-root-flow-v77')) return;

  // TEMPORARY A/B switch: bypass the old Orb recovery listeners for this
  // iOS standalone test only. The existing recovery code remains in the file.
  window.__LE_DISABLE_LEGACY_VIEWPORT_RECOVERY__ = true;
  root.classList.add('le-ios-standalone-root-flow-v77');

  const style = document.createElement('style');
  style.id = 'le-ios-standalone-root-flow-v77-style';
  style.textContent = `
    /* Successful isolated v7 technique: normal root flow, not a fixed body. */
    html.le-ios-standalone-root-flow-v77,
    html.le-ios-standalone-root-flow-v77 body {
      width: 100% !important;
      height: auto !important;
      min-height: calc(100vh + var(--le-ios-viewport-gap-v77, 0px)) !important;
      min-height: calc(100dvh + var(--le-ios-viewport-gap-v77, 0px)) !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: none !important;
      touch-action: auto !important;
    }
    html.le-ios-standalone-root-flow-v77 body {
      position: relative !important;
      inset: auto !important;
      padding: 0 !important;
    }
    /* Keep Home canvas geometry controlled by the app renderer; only move it
       into normal flow and let it track the newly expanded dynamic viewport. */
    html.le-ios-standalone-root-flow-v77 #scene {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: 100vh !important;
      height: 100dvh !important;
      display: block !important;
      touch-action: none !important;
    }
    /* Any app-level fixed sky-view can use the expanded viewport naturally. */
    html.le-ios-standalone-root-flow-v77 #le-sky-view {
      height: 100vh !important;
      height: 100dvh !important;
    }
  `;
  (document.head || root).appendChild(style);

  let timers = [];
  function syncRootGap() {
    const width = Math.max(1, window.innerWidth || root.clientWidth || 1);
    const height = Math.max(1, window.innerHeight || root.clientHeight || 1);
    const screenHeight = Number(window.screen && window.screen.height);
    // On iOS screen.height can remain portrait-sized while in landscape.
    // Only estimate the extra height in portrait; never extrapolate in landscape.
    const portrait = height >= width;
    const gap = portrait && Number.isFinite(screenHeight)
      ? Math.max(0, screenHeight - height)
      : 0;
    root.style.setProperty('--le-ios-viewport-gap-v77', `${gap}px`);
  }

  function settleAfterTransition() {
    timers.forEach(timer => window.clearTimeout(timer));
    timers = [];
    syncRootGap();
    for (const delay of [180, 420, 800]) {
      timers.push(window.setTimeout(syncRootGap, delay));
    }
  }

  syncRootGap();
  // Follow any iOS viewport expansion caused by switching the root into flow.
  window.addEventListener('resize', syncRootGap, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncRootGap, { passive: true });
  }
  window.addEventListener('orientationchange', settleAfterTransition, { passive: true });
  window.addEventListener('pageshow', settleAfterTransition, { passive: true });
  document.addEventListener('DOMContentLoaded', () => {
    syncRootGap();
    requestAnimationFrame(syncRootGap);
  }, { once: true });
})();
