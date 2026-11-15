/* LIVE // EARTH — Weather Live Art compatibility shell entry.
 * The old renderer is no longer injected into new Home documents.
 * Keep its no-op file in the essential shell so previously transformed,
 * cached Home HTML can still resolve its legacy script reference offline.
 */
(() => {
  'use strict';
  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) {
    throw new Error('LIVE // EARTH app-shell list is unavailable.');
  }
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);
})();
