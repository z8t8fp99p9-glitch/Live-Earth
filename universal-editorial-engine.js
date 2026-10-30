/* LIVE // EARTH — GLOBAL Universal Editorial Engine client contract.
   The publishing implementation is editorial-engine/universal_editorial_engine.py.
   This browser layer is subject-independent: it validates published view outputs
   and exposes safe shared helpers; it does not fetch sources or write databases. */
(() => {
  'use strict';
  if (window.__liveEarthUniversalEditorialEngineInstalled) return;

  const VERSION = '1.0.0';
  const ENGINE = 'Universal Editorial Engine';
  const MAX_FEED_STORIES = 100;

  function safeText(value, limit = 3000) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
  }
  function safeHttps(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && !u.username && !u.password;
    } catch (_) { return false; }
  }
  function safeNasaImage(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && u.hostname === 'images-assets.nasa.gov' && !u.username && !u.password;
    } catch (_) { return false; }
  }
  function validateFeed(payload, expectedViewId) {
    if (!payload || payload.schemaVersion !== 1 || payload.viewId !== expectedViewId || !Array.isArray(payload.stories)) {
      throw new Error('The published feed does not match the requested view contract.');
    }
    const stories = [];
    const seen = new Set();
    for (const item of payload.stories.slice(0, MAX_FEED_STORIES)) {
      const id = safeText(item && item.id, 100);
      const title = safeText(item && item.title, 240);
      const url = safeText(item && item.url, 1000);
      if (!id || !title || !safeHttps(url) || seen.has(url)) continue;
      seen.add(url);
      const imageUrl = safeNasaImage(item.imageUrl) ? item.imageUrl : '';
      stories.push({
        id, title, url,
        summary: safeText(item.summary, 1900),
        sourceName: safeText(item.sourceName, 120),
        sourceUrl: safeHttps(item.sourceUrl) ? item.sourceUrl : '',
        publishedAt: safeText(item.publishedAt, 80),
        imageUrl,
        imageCredit: safeText(item.imageCredit, 240),
        imageSourceUrl: safeHttps(item.imageSourceUrl) ? item.imageSourceUrl : '',
        imageRightsNote: safeText(item.imageRightsNote, 500)
      });
    }
    return Object.freeze({
      schemaVersion: 1,
      viewId: expectedViewId,
      generatedAt: safeText(payload.generatedAt, 80),
      windowHours: Number.isFinite(payload.windowHours) ? payload.windowHours : 48,
      storyCount: stories.length,
      stories: Object.freeze(stories)
    });
  }
  function normalizedHttpsUrl(value) {
    try {
      const url = new URL(value, document.baseURI);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function validateReceipt(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const cleanList = key => Array.isArray(value[key])
      ? value[key].slice(0, 12).map(item => safeText(item, 240)).filter(Boolean)
      : [];
    return Object.freeze({
      applied: Object.freeze(cleanList('applied')),
      unmapped: Object.freeze(cleanList('unmapped')),
      palette: safeText(value.palette, 80),
      photoLed: typeof value.photoLed === 'boolean' ? value.photoLed : null,
      includeTimeline: typeof value.includeTimeline === 'boolean' ? value.includeTimeline : null,
      includeExplainer: typeof value.includeExplainer === 'boolean' ? value.includeExplainer : null,
      requestedPageCount: Number(value.requestedPageCount) || 0,
      actualPageCount: Number(value.actualPageCount) || 0,
      note: safeText(value.note, 500),
      engineLimitation: safeText(value.engineLimitation, 500)
    });
  }
  function validateCatalog(payload, expectedViewId) {
    if (!payload || payload.schemaVersion !== 1 || payload.viewId !== expectedViewId || !Array.isArray(payload.issues)) {
      throw new Error('The magazine catalog does not match the requested view contract.');
    }
    const issues = [];
    for (const issue of payload.issues.slice(0, 8)) {
      if (!issue) continue;
      const issueId = safeText(issue.issueId, 100);
      const pdfUrl = normalizedHttpsUrl(issue.pdfUrl);
      const sha256 = /^[a-f0-9]{64}$/i.test(String(issue.sha256 || '')) ? String(issue.sha256).toLowerCase() : '';
      if (!issueId || !pdfUrl || !sha256) continue;
      issues.push({
        issueId,
        title: safeText(issue.title, 180),
        publishedAt: safeText(issue.publishedAt, 80),
        coverageStart: safeText(issue.coverageStart, 80),
        coverageEnd: safeText(issue.coverageEnd, 80),
        windowHours: Number(issue.windowHours) || 48,
        pdfUrl,
        pages: Number(issue.pages) || 0,
        bytes: Number(issue.bytes) || 0,
        sha256,
        storyCount: Number(issue.storyCount) || 0,
        customRequest: safeText(issue.customRequest, 1200),
        customRequestReceipt: validateReceipt(issue.customRequestReceipt)
      });
    }
    return Object.freeze({ viewId: expectedViewId, generatedAt: safeText(payload.generatedAt, 80), issues: Object.freeze(issues) });
  }

  window.LiveEarthUniversalEditorialEngine = Object.freeze({
    name: ENGINE,
    version: VERSION,
    validateFeed,
    validateCatalog,
    safeText,
    safeHttps
  });
  window.__liveEarthUniversalEditorialEngineInstalled = true;
  window.dispatchEvent(new Event('live-earth-universal-editorial-engine-ready'));
})();
