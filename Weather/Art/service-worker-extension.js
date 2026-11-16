/* LIVE // EARTH — Weather square-world camera extension.
 * Keeps the Weather scene in one display-centric 1:1 camera frame.
 * The physical display becomes a centred crop window into that square.
 */
(() => {
  'use strict';

  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) {
    throw new Error('LIVE // EARTH app-shell list is unavailable.');
  }
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  const weatherPath = new URL('./Weather/weather-view.js', self.registration.scope).pathname;
  const patchMarker = 'LE-SQUARE-WORLD-CAMERA-V1';

  const originalCanvasRule =
    '.le-weather-v2 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:pan-y}';

  const squareCanvasRule = originalCanvasRule + `
      /* ${patchMarker}: fixed square stage, centred and cropped by the display */
      .le-weather-v2 canvas{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:100vmax!important;height:100vmax!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;display:block;z-index:0;touch-action:pan-y}`;

  const originalResize =
    'function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(width>height?0:0, width>height?6.1:7.2, width>height?20:18);camera.fov=width>height?38:42;camera.updateProjectionMatrix();}';

  const squareResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.2,18);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  function transformSource(source) {
    if (source.includes(patchMarker)) return source;
    if (!source.includes(originalCanvasRule) || !source.includes(originalResize)) {
      return null;
    }
    const updated = source
      .replace(originalCanvasRule, squareCanvasRule)
      .replace(originalResize, squareResize);
    return updated.includes(patchMarker) && updated.includes(squareResize) ? updated : null;
  }

  async function rewriteWeatherResponse(response) {
    if (!response || !response.ok || response.type === 'opaque') return null;
    const source = await response.clone().text();
    if (source.includes(patchMarker)) return null;
    const updated = transformSource(source);
    if (!updated) return null;

    const headers = new Headers(response.headers);
    ['content-length', 'content-encoding', 'etag', 'last-modified', 'content-md5']
      .forEach(name => headers.delete(name));

    return new Response(updated, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  // Patch the live network response before the main service worker caches it.
  // All other requests pass through untouched.
  const nativeFetch = self.fetch.bind(self);
  self.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    let pathname = '';
    try {
      const rawUrl = typeof input === 'string' || input instanceof URL ? input : input.url;
      pathname = new URL(rawUrl, self.location.href).pathname;
    } catch (_) {
      return response;
    }
    if (pathname !== weatherPath) return response;

    const patched = await rewriteWeatherResponse(response);
    if (patched) return patched;

    if (response.ok) {
      const source = await response.clone().text();
      if (!source.includes(patchMarker)) {
        console.error('[LIVE // EARTH] Square-world Weather patch did not match the current renderer source. The original response was preserved.');
      }
    }
    return response;
  };

  // Upgrade an already-cached Weather module too, so the square-world camera
  // is available immediately after activation, including on a later offline run.
  self.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const request = new Request(new URL('./Weather/weather-view.js', self.registration.scope).href);
      const cached = await cache.match(request);
      if (!cached) return;
      const patched = await rewriteWeatherResponse(cached);
      if (patched) await cache.put(request, patched);
    })());
  });
})();
