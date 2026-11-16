/* LIVE // EARTH — Weather square-world camera extension.
 * Keeps the approved V2 centred composition and gently lowers the camera
 * for a more front-facing pavilion view without moving the world anchor.
 */
(() => {
  'use strict';

  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) {
    throw new Error('LIVE // EARTH app-shell list is unavailable.');
  }
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  const weatherPath = new URL('./Weather/weather-view.js', self.registration.scope).pathname;
  const patchMarker = 'LE-SQUARE-WORLD-CAMERA-V7';
  const previousMarkers = [
    'LE-SQUARE-WORLD-CAMERA-V6',
    'LE-SQUARE-WORLD-CAMERA-V5',
    'LE-SQUARE-WORLD-CAMERA-V4',
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

  const squareResizeV1 =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.2,18);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const squareResizeV2 =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,9.55,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const angledResizeV4 =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(14.55,9.55,23.81);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const targetOffsetResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,9.55,27.7);camera.fov=42;const landscape=window.matchMedia("(orientation: landscape)").matches;const distance=Math.hypot(0,9.55-2.5,27.7+1.4);const frameWidth=2*distance*Math.tan(42*Math.PI/360);const targetX=landscape?0.30*(window.innerWidth/side)*frameWidth:0;camera.lookAt(targetX,2.5,-1.4);camera.updateProjectionMatrix();}';

  // V7: same centred target and distance, with a lower eye point for a
  // gentler downward pitch and a clearer view of the pavilion front elevation.
  const frontViewResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.0,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  function transformSource(source) {
    if (source.includes(patchMarker)) return null;
    let updated = source;
    let matched = false;

    const priorMarker = previousMarkers.find(marker => updated.includes(marker));
    if (priorMarker) {
      updated = updated.replaceAll(priorMarker, patchMarker);
      matched = true;
    }

    // Remove any old Landscape-only CSS translation.
    updated = updated.replace(landscapeOffsetRule, '');

    // Restore square canvas CSS for the original responsive renderer.
    if (updated.includes(originalCanvasRule) && updated.includes(originalResize)) {
      updated = updated.replace(originalCanvasRule, centredCanvasRule);
      matched = true;
    }

    // Replace any earlier or experimental camera resize with the V7 front view.
    const knownResizes = [
      targetOffsetResize,
      angledResizeV4,
      squareResizeV2,
      squareResizeV1,
      originalResize
    ];
    for (const known of knownResizes) {
      if (updated.includes(known)) {
        updated = updated.replace(known, frontViewResize);
        matched = true;
        break;
      }
    }

    if (!matched) return null;
    return updated.includes(patchMarker) &&
      updated.includes(frontViewResize) &&
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
        console.error('[LIVE // EARTH] Weather front-view camera patch did not match the expected renderer source. The original response was preserved.');
      }
    }
    return response;
  };

  // Upgrade already-cached Weather modules from V1–V6, including the current
  // centred V6 camera, so the framing updates without relying on a network fetch.
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
