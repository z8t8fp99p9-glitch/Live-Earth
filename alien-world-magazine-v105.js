/* LIVE // EARTH V105 — Alien World Magazine atmosphere + editorial layout.
   Add-on for the existing V104 Alien World controller.
   Uses only actual image URLs already present in rendered article/image elements.
   It does not invent content, download/store article snapshots, or alter other views. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldMagazineV105Installed) return;

  const ROOT_ID = 'le-aw-discovery-root';
  const STYLE_ID = 'le-alien-world-magazine-v105-style';
  const ROOT_CLASS = 'aw-magazine-v105';
  const CARD_SELECTOR = '.aw-news-card, .aw-featured, .aw-photo-card, .aw-world-card, .aw-world-hero';
  let currentRoot = null;
  let domObserver = null;
  let contentObserver = null;
  let scrollHandler = null;
  let resizeHandler = null;
  let raf = 0;
  let lastImageUrl = '';
  let activeLayer = 0;
  let layers = [];

  const CSS = `
    #${ROOT_ID}.${ROOT_CLASS} {
      background: linear-gradient(180deg, rgba(4,7,12,.18), rgba(4,7,12,.56) 34%, rgba(4,7,12,.82) 100%) !important;
      color: #f8f5f0;
      isolation: isolate;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-v105 {
      position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
      background: radial-gradient(ellipse at 12% 13%, rgba(198,103,49,.15), transparent 50%),
                  radial-gradient(ellipse at 88% 65%, rgba(60,121,164,.13), transparent 52%),
                  #05070b;
      transform: translateZ(0);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-v105::before,
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-v105::after {
      content: ""; position: absolute; inset: 0; pointer-events: none;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-v105::before {
      z-index: 3;
      background: linear-gradient(180deg, rgba(4,7,12,.26) 0%, rgba(4,7,12,.12) 23%, rgba(4,7,12,.34) 56%, rgba(4,7,12,.80) 100%),
                  radial-gradient(ellipse at 18% 16%, rgba(217,125,63,.12), transparent 47%),
                  radial-gradient(ellipse at 85% 44%, rgba(81,139,183,.10), transparent 52%);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-v105::after {
      z-index: 4; opacity: .35;
      background: linear-gradient(115deg, rgba(255,176,105,.045), transparent 43%, rgba(109,177,220,.055));
      mix-blend-mode: screen;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-image-v105 {
      position: absolute; inset: -8%; width: 116%; height: 116%; opacity: 0;
      transition: opacity 1250ms cubic-bezier(.2,.65,.25,1);
      will-change: opacity; overflow: hidden;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-image-v105.is-active { opacity: .78; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-image-v105 img {
      display: block; width: 100%; height: 100%; object-fit: cover;
      filter: blur(42px) saturate(1.42) brightness(.42) contrast(1.08);
      transform: scale(1.08); opacity: .94;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-wrap {
      position: relative; z-index: 2; width: min(100%, 790px); margin: 0 auto;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-topbar {
      padding-top: 9px; padding-bottom: 24px; align-items: flex-start;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-brand-title {
      font-size: clamp(25px, 7vw, 38px); letter-spacing: .105em; line-height: 1;
      text-shadow: 0 2px 20px rgba(0,0,0,.38);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-brand-sub {
      margin-top: 9px; font-size: 9px; letter-spacing: .2em; color: #e0bda1;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-live-pill {
      border-color: rgba(247,188,143,.24); background: rgba(17,13,12,.32);
      color: #f4d9c4; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-searchbar {
      margin-bottom: 29px; padding: 6px; border-radius: 16px;
      border-color: rgba(255,224,199,.15); background: rgba(10,12,17,.35);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 10px 34px rgba(0,0,0,.12), inset 0 1px rgba(255,255,255,.045);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-searchbar input { padding: 11px 12px; font-size: 14px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-searchbar input::placeholder { color: rgba(225,213,204,.62); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-icon-button,
    #${ROOT_ID}.${ROOT_CLASS} .aw-button {
      border-color: rgba(245,185,138,.25); background: rgba(27,20,17,.55); color: #fff1e4;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-button.primary {
      border-color: rgba(255,191,142,.52);
      background: linear-gradient(135deg, rgba(172,91,47,.88), rgba(85,45,32,.9));
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-section { margin-bottom: 34px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-section-head { align-items: flex-start; margin-bottom: 15px; gap: 12px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-eyebrow {
      color: #efb47f; font-size: 9px; letter-spacing: .2em; margin-bottom: 8px;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-h2 {
      font-size: clamp(23px, 6vw, 31px); line-height: 1.08; letter-spacing: -.035em;
      font-weight: 760; text-wrap: balance;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-subtle {
      margin-top: 9px; color: rgba(238,230,224,.78); font-size: 12px; line-height: 1.68;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-inline-link { color: #ffc99e; font-size: 10px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-list { display: grid; grid-template-columns: minmax(0,1fr); gap: 20px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-card {
      border: 1px solid rgba(255,231,211,.14); border-radius: 22px;
      background: linear-gradient(145deg, rgba(18,18,22,.56), rgba(7,10,15,.69));
      box-shadow: 0 18px 46px rgba(0,0,0,.20), inset 0 1px rgba(255,255,255,.055);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-media {
      aspect-ratio: 16 / 10; max-height: 360px; background: rgba(4,7,12,.55);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-media img {
      transition: transform 800ms cubic-bezier(.2,.65,.25,1), filter 800ms ease;
      filter: saturate(1.08) contrast(1.02);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-image-source {
      border-color: rgba(255,235,219,.2); border-radius: 999px;
      background: rgba(6,7,10,.56); padding: 6px 10px; color: #fff2e8;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-body {
      display: flex; flex-direction: column; align-items: stretch; gap: 0; padding: 16px 16px 17px;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-title {
      font-size: clamp(20px, 5.4vw, 26px); line-height: 1.17; letter-spacing: -.027em;
      font-weight: 790; text-wrap: balance;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-summary {
      margin-top: 10px; color: rgba(238,231,226,.86); font-size: 13px; line-height: 1.72;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-meta {
      gap: 8px 11px; margin-top: 12px; color: rgba(221,201,187,.76); font-size: 10px;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-open {
      align-self: flex-start; margin-top: 14px; border-color: rgba(255,199,157,.27);
      border-radius: 999px; padding: 9px 13px; background: rgba(28,21,18,.48);
      color: #ffd3b0; font-size: 10px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-news-card:nth-child(2n) .aw-news-media { aspect-ratio: 16 / 9; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-featured {
      border-radius: 24px; border-color: rgba(255,226,204,.16);
      background: linear-gradient(145deg, rgba(20,19,23,.6), rgba(7,10,15,.78));
      box-shadow: 0 18px 46px rgba(0,0,0,.2), inset 0 1px rgba(255,255,255,.055);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-featured-media { aspect-ratio: 4 / 3; min-height: 215px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-featured-media img { filter: saturate(1.08) contrast(1.02); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-featured-body { padding: 18px 18px 20px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-featured-title {
      font-size: clamp(23px, 6vw, 31px); line-height: 1.12; font-weight: 800; letter-spacing: -.035em;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-featured-copy { font-size: 13px; line-height: 1.75; color: rgba(240,232,226,.88); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-credit { font-size: 10px; color: rgba(222,201,188,.75); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-credit a,
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-copy a,
    #${ROOT_ID}.${ROOT_CLASS} .aw-exoplanet-row a { color: #ffc89d; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-category-row { gap: 9px; margin-bottom: 18px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-chip {
      border-color: rgba(255,224,204,.16); background: rgba(13,14,19,.43); color: rgba(239,222,209,.82);
      padding: 10px 14px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-chip[aria-pressed="true"] {
      border-color: rgba(255,194,146,.48); background: linear-gradient(135deg, rgba(139,76,43,.66), rgba(39,27,24,.76));
      color: #fff1e5; box-shadow: 0 0 20px rgba(222,128,68,.09);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-grid,
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-grid,
    #${ROOT_ID}.${ROOT_CLASS} .aw-exoplanet-list { gap: 13px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-card,
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-card,
    #${ROOT_ID}.${ROOT_CLASS} .aw-exoplanet-row {
      border-color: rgba(255,226,204,.13); border-radius: 18px;
      background: linear-gradient(145deg, rgba(20,19,23,.56), rgba(7,10,15,.72));
      box-shadow: 0 12px 30px rgba(0,0,0,.14);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-media,
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-media { aspect-ratio: 4 / 3; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-copy,
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-copy { padding: 13px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-name { font-size: 14px; line-height: 1.35; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-type,
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-meta { font-size: 10px; line-height: 1.5; color: rgba(221,201,187,.72); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-photo-title { font-size: 13px; line-height: 1.45; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-hero { border-radius: 24px; background: rgba(9,11,16,.58); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-hero img { max-height: 390px; aspect-ratio: 4 / 3; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-intro { padding: 19px; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-title { font-size: clamp(30px, 8vw, 42px); line-height: 1.04; }
    #${ROOT_ID}.${ROOT_CLASS} .aw-world-desc,
    #${ROOT_ID}.${ROOT_CLASS} .aw-fact-card p { font-size: 13px; line-height: 1.75; color: rgba(240,232,226,.88); }
    #${ROOT_ID}.${ROOT_CLASS} .aw-fact-card,
    #${ROOT_ID}.${ROOT_CLASS} .aw-status {
      border-color: rgba(255,226,204,.13); border-radius: 17px;
      background: rgba(10,12,17,.48); color: rgba(240,232,226,.83);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-footer {
      margin-top: 28px; padding-top: 17px; border-color: rgba(255,226,204,.11);
      color: rgba(203,185,173,.58); font-size: 9px;
    }
    #${ROOT_ID}.${ROOT_CLASS} .aw-footer a { color: #e7b78f; }
    @media (min-width: 700px) {
      #${ROOT_ID}.${ROOT_CLASS} .aw-news-list { grid-template-columns: repeat(2, minmax(0,1fr)); align-items: start; }
      #${ROOT_ID}.${ROOT_CLASS} .aw-news-card:first-child { grid-column: 1 / -1; }
      #${ROOT_ID}.${ROOT_CLASS} .aw-news-card:first-child .aw-news-media { aspect-ratio: 16 / 8; max-height: 420px; }
      #${ROOT_ID}.${ROOT_CLASS} .aw-news-card:first-child .aw-news-title { font-size: clamp(27px, 3vw, 36px); }
      #${ROOT_ID}.${ROOT_CLASS} .aw-featured { grid-template-columns: 1.05fr 1fr; }
      #${ROOT_ID}.${ROOT_CLASS} .aw-featured-media { min-height: 100%; aspect-ratio: auto; }
    }
    @media (orientation: landscape) {
      #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-image-v105 img { filter: blur(38px) saturate(1.32) brightness(.36); }
    }
    @media (prefers-reduced-motion: reduce) {
      #${ROOT_ID}.${ROOT_CLASS} .aw-atmosphere-image-v105,
      #${ROOT_ID}.${ROOT_CLASS} .aw-news-media img { transition: none !important; }
    }
  `;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function createAtmosphere(root) {
    let atmosphere = root.querySelector('.aw-atmosphere-v105');
    if (atmosphere) return atmosphere;
    atmosphere = document.createElement('div');
    atmosphere.className = 'aw-atmosphere-v105';
    atmosphere.setAttribute('aria-hidden', 'true');
    layers = [];
    for (let i = 0; i < 2; i += 1) {
      const layer = document.createElement('div');
      layer.className = 'aw-atmosphere-image-v105';
      const image = document.createElement('img');
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.decoding = 'async';
      image.loading = 'eager';
      layer.appendChild(image);
      atmosphere.appendChild(layer);
      layers.push({ layer, image });
    }
    root.insertBefore(atmosphere, root.firstChild);
    return atmosphere;
  }

  function usableImageUrl(image) {
    if (!image) return '';
    const raw = image.currentSrc || image.src || image.getAttribute('src') || '';
    if (!raw || /^data:/i.test(raw)) return '';
    try {
      const parsed = new URL(raw, document.baseURI);
      return ['http:', 'https:', 'blob:'].includes(parsed.protocol) ? parsed.href : '';
    } catch (_) { return ''; }
  }

  function imageForCard(card) {
    if (!card) return '';
    const images = card.querySelectorAll('img');
    for (const image of images) {
      const url = usableImageUrl(image);
      if (url && image.complete !== false && (image.naturalWidth === undefined || image.naturalWidth > 0)) return url;
      if (url && image.complete === false) return url;
    }
    return '';
  }

  function setAmbientImage(url) {
    if (!url || url === lastImageUrl || !layers.length) return;
    lastImageUrl = url;
    const nextIndex = activeLayer === 0 ? 1 : 0;
    const next = layers[nextIndex];
    next.layer.classList.remove('is-active');
    next.image.onload = () => {
      next.layer.classList.add('is-active');
      const previous = layers[activeLayer];
      if (previous && previous !== next) previous.layer.classList.remove('is-active');
      activeLayer = nextIndex;
      next.image.onload = null;
      next.image.onerror = null;
    };
    next.image.onerror = () => {
      next.image.onload = null;
      next.image.onerror = null;
      if (lastImageUrl === url) lastImageUrl = '';
    };
    next.image.src = url;
    if (next.image.complete && next.image.naturalWidth > 0) next.image.onload();
  }

  function visibleCards(root) {
    return Array.from(root.querySelectorAll(CARD_SELECTOR)).filter(card => {
      if (!card.isConnected || card.closest('.aw-atmosphere-v105')) return false;
      const rect = card.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0;
    });
  }

  function updateAmbient(root) {
    raf = 0;
    if (!root || !root.isConnected || !layers.length) return;
    const cards = visibleCards(root);
    if (!cards.length) return;
    // Favor the story occupying the central reading area, not merely the first
    // image near the top. This keeps the ambient colour moving with the reader.
    const targetY = Math.min(window.innerHeight * 0.43, window.innerHeight - 160);
    let best = null;
    let bestScore = Infinity;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const midpoint = Math.max(rect.top, Math.min(targetY, rect.bottom));
      const distance = Math.abs(midpoint - targetY);
      const image = imageForCard(card);
      if (!image) continue;
      const score = distance - Math.min(rect.height, 500) * 0.08;
      if (score < bestScore) { best = image; bestScore = score; }
    }
    if (best) setAmbientImage(best);
  }

  function scheduleAmbient(root) {
    if (raf) return;
    raf = window.requestAnimationFrame(() => updateAmbient(root));
  }

  function enhance(root) {
    if (!root || root === currentRoot && root.dataset.awMagazineEnhanced === 'true') {
      if (root) scheduleAmbient(root);
      return;
    }
    cleanupCurrent();
    currentRoot = root;
    root.classList.add(ROOT_CLASS);
    root.dataset.awMagazineEnhanced = 'true';
    installStyle();
    createAtmosphere(root);
    scrollHandler = () => scheduleAmbient(root);
    resizeHandler = () => scheduleAmbient(root);
    root.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler, { passive: true });
    contentObserver = new MutationObserver(() => scheduleAmbient(root));
    contentObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
    scheduleAmbient(root);
  }

  function cleanupCurrent() {
    if (currentRoot) {
      if (scrollHandler) currentRoot.removeEventListener('scroll', scrollHandler);
      currentRoot.classList.remove(ROOT_CLASS);
      delete currentRoot.dataset.awMagazineEnhanced;
    }
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (contentObserver) contentObserver.disconnect();
    contentObserver = null; scrollHandler = null; resizeHandler = null;
    if (currentRoot) {
      const atmosphere = currentRoot.querySelector('.aw-atmosphere-v105');
      if (atmosphere) atmosphere.remove();
    }
    currentRoot = null; layers = []; lastImageUrl = ''; activeLayer = 0;
  }

  function scan() {
    const root = document.getElementById(ROOT_ID);
    if (root) enhance(root);
    else if (currentRoot) cleanupCurrent();
  }

  function start() {
    if (window.__liveEarthAlienWorldMagazineV105Installed) return;
    window.__liveEarthAlienWorldMagazineV105Installed = true;
    installStyle();
    scan();
    domObserver = new MutationObserver(scan);
    domObserver.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('live-earth-alien-world-magazine-refresh', scan);
    window.addEventListener('pagehide', () => {
      if (domObserver) domObserver.disconnect();
      if (contentObserver) contentObserver.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      cleanupCurrent();
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
