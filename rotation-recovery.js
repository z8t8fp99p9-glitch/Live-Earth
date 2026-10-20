/* LIVE // EARTH — portrait coordinate recovery.
   Recovers the browser viewport after orientation changes without moving or
   resizing the approved Earth/Moon composition or changing orb layout. */
(() => {
  'use strict';
  if (window.__liveEarthRotationRecovery) return;
  window.__liveEarthRotationRecovery = true;

  const root = document.documentElement;
  const body = document.body;
  const canvas = document.getElementById('scene');
  let lastPointerId = null;
  let settleTimer = 0;
  let recoveryFrame = 0;

  // Keep the existing page gesture policy; the globe keeps its own touch-action:none.
  if (root) root.style.touchAction = 'pan-y';
  if (body) body.style.touchAction = 'pan-y';

  if (canvas) {
    canvas.addEventListener('pointerdown', event => {
      if (event.isPrimary) lastPointerId = event.pointerId;
    }, { capture: true, passive: true });
    const clearPointer = event => {
      if (lastPointerId === event.pointerId) lastPointerId = null;
    };
    canvas.addEventListener('pointerup', clearPointer, true);
    canvas.addEventListener('pointercancel', clearPointer, true);
    canvas.addEventListener('lostpointercapture', clearPointer, true);
  }

  function recover() {
    if (recoveryFrame) cancelAnimationFrame(recoveryFrame);
    // Two frames let iOS finish applying its new orientation and viewport metrics.
    recoveryFrame = requestAnimationFrame(() => {
      recoveryFrame = requestAnimationFrame(() => {
        recoveryFrame = 0;

        // The app is a fixed, non-scrolling canvas. Clear any stale page scroll
        // offset Safari may retain across a portrait/landscape transition.
        try { window.scrollTo(0, 0); } catch (_) {}
        if (root && root.scrollTop) root.scrollTop = 0;
        if (body && body.scrollTop) body.scrollTop = 0;

        const vv = window.visualViewport;
        const width = Math.max(1, Math.round(vv?.width || window.innerWidth || root.clientWidth));
        const height = Math.max(1, Math.round(vv?.height || window.innerHeight || root.clientHeight));
        root.style.setProperty('--le-viewport-width', `${width}px`);
        root.style.setProperty('--le-viewport-height', `${height}px`);

        // Force a fresh layout/hit-test pass without changing element geometry.
        void root.getBoundingClientRect();
        const nav = document.getElementById('navButtons');
        if (nav) {
          nav.style.pointerEvents = 'auto';
          for (const button of nav.querySelectorAll('.orbButton')) button.style.pointerEvents = 'auto';
          void nav.getBoundingClientRect();
        }

        if (canvas && lastPointerId !== null) {
          const id = lastPointerId;
          try { if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch (_) {}
          try { canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true })); } catch (_) {}
          lastPointerId = null;
        }

        for (const panel of document.querySelectorAll('#astroPanel:not([hidden]), #le-control-panel:not([hidden])')) {
          panel.style.pointerEvents = 'auto';
          panel.style.maxHeight = `${Math.max(180, height - 28)}px`;
          panel.style.maxWidth = `${Math.max(240, Math.min(width - 24, 440))}px`;
          void panel.getBoundingClientRect();
        }
        window.dispatchEvent(new CustomEvent('live-earth-viewport-settled', {
          detail: { width, height, offsetTop: Math.round(vv?.offsetTop || 0), offsetLeft: Math.round(vv?.offsetLeft || 0) }
        }));
      });
    });
  }

  function scheduleRecovery() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(recover, 180);
  }
  window.addEventListener('orientationchange', scheduleRecovery, { passive: true });
  window.addEventListener('resize', scheduleRecovery, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleRecovery, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleRecovery, { passive: true });
  window.addEventListener('pageshow', scheduleRecovery, { passive: true });
  scheduleRecovery();
})();
