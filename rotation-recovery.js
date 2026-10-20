/* LIVE // EARTH — adaptive viewport/touch recovery.
   Does not lock orientation or change the approved Earth composition. */
(() => {
  'use strict';
  if (window.__liveEarthRotationRecovery) return;
  window.__liveEarthRotationRecovery = true;

  const canvas = document.getElementById('scene');
  let lastPointerId = null;
  let settleTimer = 0;
  let recoveryFrame = 0;

  // Track the active touch before the globe's own pointer handlers run.
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
    recoveryFrame = requestAnimationFrame(() => {
      recoveryFrame = requestAnimationFrame(() => {
        recoveryFrame = 0;
        const vv = window.visualViewport;
        const width = Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth));
        const height = Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight));
        document.documentElement.style.setProperty('--le-viewport-width', `${width}px`);
        document.documentElement.style.setProperty('--le-viewport-height', `${height}px`);

        // Cancel a gesture interrupted by rotation so it cannot leave the globe
        // in a stale dragging state or retain an obsolete pointer capture.
        if (canvas && lastPointerId !== null) {
          const id = lastPointerId;
          try { if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch (_) {}
          try { canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true })); } catch (_) {}
          lastPointerId = null;
        }

        // Restore hit testing after the viewport and CSS layout have settled.
        for (const element of document.querySelectorAll('#navButtons, #navButtons .orbButton, #astroPanel, #le-control-panel')) {
          if (element && (!('hidden' in element) || !element.hidden)) element.style.pointerEvents = 'auto';
        }
        window.dispatchEvent(new CustomEvent('live-earth-viewport-settled', { detail: { width, height } }));
      });
    });
  }

  function scheduleRecovery() {
    window.clearTimeout(settleTimer);
    // iOS can emit several resize events while its visual viewport settles.
    settleTimer = window.setTimeout(recover, 100);
  }
  window.addEventListener('orientationchange', scheduleRecovery, { passive: true });
  window.addEventListener('resize', scheduleRecovery, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleRecovery, { passive: true });
  window.addEventListener('pageshow', scheduleRecovery, { passive: true });
  scheduleRecovery();
})();
