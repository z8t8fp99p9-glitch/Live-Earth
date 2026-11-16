/* LIVE // EARTH — Weather square-world camera extension.
 * Restores a centred 1:1 canvas and applies a 30-degree horizontal camera orbit.
 * The camera keeps the pavilion centre as its target; no canvas offset is used.
 */
(() => {
  'use strict';

  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) {
    throw new Error('LIVE // EARTH app-shell list is unavailable.');
  }
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  const weatherPath = new URL('./Weather/weather-view.js', self.registration.scope).pathname;
  const patchMarker = 'LE-SQUARE-WORLD-CAMERA-V4';
  const markers = [
    'LE-SQUARE-WORLD-CAMERA-V3',
    'LE-SQUARE-WORLD-CAMERA-V2',
    'LE-SQUARE-WORLD-CAMERA-V1'
  ];

  const originalCanvasRule =
    '.le-weather-v2 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:pan-y}';

  const centredCanvasRule = originalCanvasRule + `
      /* ${patchMarker}: fixed square stage, centred and cropped by the display */
      .le-weather-v2 canvas{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:100vmax!important;height:100vmax!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;display:block;z-index:0;touch-action:pan-y}`;

  const landscapeOffsetRule =
    '\n      @media(orientation:landscape){.le-weather-v2 canvas{left:calc(50% - 30vw)!important}}';

  const originalResize =
    'function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(width>height?0:0, width>height?6.1:7.2, width>height?20:18);camera.fov=width>height?38:42;camera.updateProjectionMatrix();}';

  const oldSquareResizes = [
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.2,18);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}',
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,9.55,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}'
  ];

  // Orbit the camera 30 degrees around the house's vertical axis while
  // preserving its distance, elevation, field of view and exact look target.
  // Relative to target: (0, 7.05, 29.1) -> (14.55, 7.05, 25.21).
  const angledSquareResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(14.55,9.55,23.81);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  function transformSource(source) {
    if (source.includes(patchMarker)) return null;
    let updated = source;
    let matched = false;

    // The V3 package introduced the 30vw Landscape shift. Remove that exact
    // rule and restore the canvas's 50% centre anchor.
    if (updated.includes(markers[0])) {
      updated = updated.replaceAll(markers[0], patchMarker);
      updated = updated.replace(landscapeOffsetRule, '');
      matched = true;
    } else {
      const prior = markers.find(marker => updated.includes(marker));
      if (prior) {
        updated = updated.replaceAll(prior, patchMarker);
        matched = true;
      }
    }

    // If this is an original renderer, install the square canvas rule.
    if (!matched && updated.includes(originalCanvasRule) && updated.includes(originalResize)) {
      updated = updated.replace(originalCanvasRule, centredCanvasRule);
      matched = true;
    }

    // Replace whichever known square-camera baseline is present.
    for (const oldResize of oldSquareResizes) {
      if (updated.includes(oldResize)) {
        updated = updated.replace(oldResize, angledSquareResize);
        matched = true;
        break;
      }
    }

    if (!matched) return null;

    // Older cached variants may contain a Landscape offset without V3 marker.
    updated = updated.replace(landscapeOffsetRule, '');
    return updated.includes(patchMarker) &&
      updated.includes(angledSquareResize) &&
      !updated.includes('left:calc(50% - 30vw)')
      ? updated : null;
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
        console.error('[LIVE // EARTH] Square-world 30-degree camera update did not match the expected renderer source. The original response was preserved.');
      }
    }
    return response;
  };

  // Upgrade already-cached Weather modules during activation, including V3.
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
