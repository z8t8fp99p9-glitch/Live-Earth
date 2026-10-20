/* LIVE // EARTH — adaptive viewport/touch recovery.
   Portrait panel fix: restore vertical touch scrolling outside the globe canvas.
   Does not lock orientation or change the approved Earth composition. */
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

  // The page originally set touch-action:none on html AND body. That ancestor
  // restriction can cancel pan-y scrolling inside an overflow:auto portrait
  // panel. Allow page-level vertical gestures; the globe canvas retains its
  // own CSS touch-action:none, so one-finger globe rotation remains supported.
  if (root) root.style.touchAction = 'pan-y';
  if (body) body.style.touchAction = 'pan-y';

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
        const width = Math.max(1, Math.round(vv?.width || window.innerWidth || root.clientWidth));
        const height = Math.max(1, Math.round(vv?.height || window.innerHeight || root.clientHeight));
        root.style.setProperty('--le-viewport-width', `${width}px`);
        root.style.setProperty('--le-viewport-height', `${height}px`);

        // Cancel a gesture interrupted by rotation so it cannot leave the globe
        // in a stale dragging state or retain an obsolete pointer capture.
        if (canvas && lastPointerId !== null) {
          const id = lastPointerId;
          try { if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch (_) {}
          try { canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true })); } catch (_) {}
          lastPointerId = null;
        }

        // Restore hit testing and recalculate open panel bounds after the viewport settles.
        for (const element of document.querySelectorAll('#navButtons, #navButtons .orbButton, #astroPanel, #le-control-panel')) {
          if (element && (!('hidden' in element) || !element.hidden)) element.style.pointerEvents = 'auto';
        }
        for (const panel of document.querySelectorAll('#astroPanel:not([hidden]), #le-control-panel:not([hidden])')) {
          panel.style.maxHeight = `${Math.max(180, height - 28)}px`;
          panel.style.maxWidth = `${Math.max(240, Math.min(width - 24, 440))}px`;
          void panel.offsetHeight;
        }
        window.dispatchEvent(new CustomEvent('live-earth-viewport-settled', { detail: { width, height } }));
      });
    });
  }

  function scheduleRecovery() {
    window.clearTimeout(settleTimer);
    // iOS can emit several resize events while its visual viewport settles.
    settleTimer = window.setTimeout(recover, 120);
  }
  window.addEventListener('orientationchange', scheduleRecovery, { passive: true });
  window.addEventListener('resize', scheduleRecovery, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleRecovery, { passive: true });
  window.addEventListener('pageshow', scheduleRecovery, { passive: true });
  scheduleRecovery();
})();
