/* LIVE // EARTH — Weather runtime asset registration only.
 * The Weather scene is authored directly in Weather/weather-view.js.
 * This file must not rewrite, replace, or intercept the Weather module.
 */
(() => {
  'use strict';
  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) {
    throw new Error('LIVE // EARTH app-shell list is unavailable.');
  }
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);
})();
