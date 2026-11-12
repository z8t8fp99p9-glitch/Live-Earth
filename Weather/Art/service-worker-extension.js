/* LIVE // EARTH — narrow Weather Live Art service-worker extension.
 * Loaded from the bottom of sw.js via importScripts(). This registers the small
 * renderer as an essential shell script, but does not cache catalogue/art data.
 */
(() => {
  'use strict';
  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) throw new Error('LIVE // EARTH app-shell list is unavailable.');
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  if (typeof transformHomeHTML !== 'function') throw new Error('LIVE // EARTH Home transformer is unavailable.');
  const originalTransformHomeHTML = transformHomeHTML;
  transformHomeHTML = async function (request, response, forceHome = false) {
    const transformed = await originalTransformHomeHTML(request, response, forceHome);
    const url = new URL(request.url);
    const isHome = forceHome || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
    if (!isHome) return transformed;

    const html = await transformed.clone().text();
    if (html.includes('Weather/Art/live-art-online.js')) return transformed;
    const augmented = html.replace(
      /<\/body\s*>/i,
      '<script src="./Weather/Art/live-art-online.js" defer></script>\n</body>'
    );
    if (augmented === html) throw new Error('LIVE // EARTH Weather Live Art script could not be injected into Home.');

    const headers = new Headers(transformed.headers);
    headers.delete('content-length');
    const result = new Response(augmented, {
      status: transformed.status,
      statusText: transformed.statusText,
      headers
    });
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, result.clone());
    return result;
  };
})();
