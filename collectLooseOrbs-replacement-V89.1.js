    function collectLooseOrbs(done) {
      if (collectingOrbs) return false;
      collectingOrbs = true;
      const anchor = getVisibleStacksAnchor();
      const layerRect = getLibraryRect();
      const items = [...(libraryGrid?.children || [])];
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
      for (const [index, item] of items.entries()) {
        item.classList.remove('le-orb-deployed');
        item.classList.add('le-orb-collecting');
        item.style.animation = 'none';
        item.style.pointerEvents = 'none';
        item.style.transition = reducedMotion
          ? 'none'
          : 'transform 620ms cubic-bezier(0.22,0.76,0.22,1), opacity 440ms ease, filter 440ms ease';
        item.style.transitionDelay = reducedMotion ? '0ms' : `${Math.min(index * 16, 80)}ms`;
        setOrbCenter(item, anchor.x, anchor.y - getOrbCenterOffsetY(item), layerRect);
      }

      // Finish on the final Orb's actual transform transition, but retain the
      // original 760 ms safety fallback in case Safari omits a transition event.
      let finished = false;
      const pendingTransforms = new Set(items);
      const cleanupListeners = () => {
        items.forEach(item => item.removeEventListener('transitionend', onTransitionEnd));
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        if (collectingTimer) {
          clearTimeout(collectingTimer);
          collectingTimer = null;
        }
        cleanupListeners();
        done?.();
      };
      const onTransitionEnd = event => {
        if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
        pendingTransforms.delete(event.currentTarget);
        if (!pendingTransforms.size) finish();
      };

      if (reducedMotion || !items.length) {
        finish();
      } else {
        items.forEach(item => item.addEventListener('transitionend', onTransitionEnd));
        collectingTimer = setTimeout(finish, 760);
      }
      return true;
    }
