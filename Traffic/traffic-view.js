/* LIVE // EARTH — Minimal full-screen Traffic and Live Cams views.
   These are intentionally empty wallpaper canvases. No feeds, markers,
   camera services, globe, or renderer are mounted by this module.
   Each view releases its feature-stage mount when it is deactivated. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Stacks feature runtime is unavailable.');
    return;
  }
  const { mount } = runtime;
  if (!document.getElementById('le-empty-feature-wallpaper-style')) {
    const style = document.createElement('style');
    style.id = 'le-empty-feature-wallpaper-style';
    style.textContent = `
      .le-sfv--traffic,.le-sfv--live-cams{
        position:absolute!important;inset:0!important;z-index:6!important;
        pointer-events:none!important;background:#020306!important
      }
      .le-sfv--traffic .le-sfv-panel,.le-sfv--live-cams .le-sfv-panel{
        position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
        max-width:none!important;max-height:none!important;overflow:hidden!important;
        padding:0!important;margin:0!important;border:0!important;border-radius:0!important;
        background-color:#020306!important;
        background-image:url("./Stacks/Assets/feature-wallpaper.png")!important;
        background-position:center center!important;background-repeat:no-repeat!important;
        background-size:cover!important;box-shadow:none!important;backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;pointer-events:none!important
      }
      .le-sfv--traffic .le-sfv-head,.le-sfv--traffic .le-sfv-pill,.le-sfv--traffic .le-sfv-body,
      .le-sfv--live-cams .le-sfv-head,.le-sfv--live-cams .le-sfv-pill,.le-sfv--live-cams .le-sfv-body{
        display:none!important
      }
    `;
    document.head.appendChild(style);
  }

  function activateWallpaperView(id) {
    const view = mount(id);
    if (!view) return () => {};

    view.body.replaceChildren();
    view.root.querySelector('.le-sfv-head')?.remove();
    view.root.querySelector('.le-sfv-pill')?.remove();

    // The feature registry hides the stage on close, but this module owns the
    // mounted .le-sfv root and must remove it before the stage is hidden. Without
    // this, the Stacks stylesheet's .le-sfv-open display rule can cover Home.
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;

      const stage = view.root.parentElement;
      if (!stage) return;
      view.root.remove();

      // Do not disturb a newer feature if a stale cleanup is ever invoked late.
      if (!stage.querySelector('.le-sfv')) {
        stage.classList.remove('le-sfv-open');
        const stageCard = stage.querySelector('.le-feature-stage-card');
        if (stageCard) stageCard.hidden = false;
      }
    };
  }

  // Traffic still uses the Stacks runtime's normal cleanup wrapper.
  runtime.registerFeature('traffic', () => activateWallpaperView('traffic'));

  // Live Cams is registered directly with the Global Feature Orb registry, so
  // its deactivate callback must invoke the cleanup returned by mount().
  const featureRegistry = window.LiveEarthFeatureViews;
  if (featureRegistry && typeof featureRegistry.register === 'function') {
    let liveCamsCleanup = () => {};
    featureRegistry.register('live-cams', {
      title:'Live Cams', shortLabel:'Live Cams', symbol:'◉',
      description:'Live Cams', connected:false,
      activate:() => { liveCamsCleanup = activateWallpaperView('live-cams'); },
      deactivate:() => {
        liveCamsCleanup();
        liveCamsCleanup = () => {};
      }
    });
  } else {
    console.error('[LIVE // EARTH] Stacks Orb registry is unavailable; Live Cams could not register.');
  }
})();
