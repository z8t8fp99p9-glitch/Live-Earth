/* LIVE // EARTH — Minimal full-screen Traffic and Live Cams views.
   These are intentionally empty wallpaper canvases. No feeds, markers,
   camera services, globe, or renderer are mounted by this module.
   Existing Stacks feature registration and stage lifecycle are preserved. */
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
    return () => {};
  }
  runtime.registerFeature('traffic', () => activateWallpaperView('traffic'));
  const featureRegistry = window.LiveEarthFeatureViews;
  if (featureRegistry && typeof featureRegistry.register === 'function') {
    featureRegistry.register('live-cams', {
      title:'Live Cams', shortLabel:'Live Cams', symbol:'◉',
      description:'Live Cams', connected:false,
      activate:() => activateWallpaperView('live-cams'),
      deactivate:() => {}
    });
  } else {
    console.error('[LIVE // EARTH] Stacks Orb registry is unavailable; Live Cams could not register.');
  }
})();
