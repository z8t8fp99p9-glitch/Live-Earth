/* LIVE // EARTH — Alien World Live Feeds view.
   Displays the finished Live Feed only. Collector, Publisher and shared Engine
   own data preparation; this browser view is a read-only presentation layer. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldViewInstalled || window.__liveEarthAlienWorldViewWaiting) return;
  window.__liveEarthAlienWorldViewWaiting = true;

  const VIEW_ID = 'alien-world';
  const ROOT_ID = 'le-alien-world-view';
  const REFRESH_MS = 5 * 60 * 1000;

  let active = false;
  let refreshTimer = 0;
  let servicesPromise = null;
  let root = null;
  let liveList = null;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  function dateLabel(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Recently published';
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function loadScript(path, ready) {
    if (ready()) return Promise.resolve();
    const url = new URL(path, document.baseURI).href;
    return new Promise((resolve, reject) => {
      let script = [...document.scripts].find(item => item.src === url);
      let settled = false;
      let timer = 0;
      const finish = callback => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        callback();
      };
      const onLoad = () => finish(() => ready()
        ? resolve()
        : reject(new Error(`${path} loaded but did not register its service.`)));
      const onError = () => finish(() => reject(new Error(`Could not load ${path}.`)));

      if (script && script.dataset.leLoaded === '1' && ready()) {
        resolve();
        return;
      }
      if (!script) {
        script = document.createElement('script');
        script.src = url;
        script.async = true;
      }
      script.addEventListener('load', () => {
        script.dataset.leLoaded = '1';
        onLoad();
      }, { once: true });
      script.addEventListener('error', onError, { once: true });
      if (!script.isConnected) document.head.appendChild(script);
      else if (script.readyState === 'complete' && ready()) onLoad();
      timer = window.setTimeout(onError, 15000);
    });
  }

  function ensureServices() {
    const ready = () => Boolean(
      window.LiveEarthUniversalEditorialEngine?.validateFeed &&
      window.LiveEarthAlienWorldPublisher?.loadLiveFeed
    );
    if (ready()) return Promise.resolve();
    if (servicesPromise) return servicesPromise;
    servicesPromise = loadScript('./editorial-engine/universal-editorial-engine.js',
      () => Boolean(window.LiveEarthUniversalEditorialEngine?.validateFeed))
      .then(() => loadScript('./alien-world/view/alien-world-publisher-client.js',
        () => Boolean(window.LiveEarthAlienWorldPublisher?.loadLiveFeed)))
      .catch(error => {
        servicesPromise = null;
        throw error;
      });
    return servicesPromise;
  }

  function addStyles() {
    if (document.getElementById('le-alien-world-style')) return;
    const style = element('style');
    style.id = 'le-alien-world-style';
    style.textContent = `
      #${ROOT_ID}{position:fixed;inset:0;z-index:6;color:#edf4fb;background:radial-gradient(ellipse at 50% 0%,#1a293b 0%,#0a111c 42%,#050910 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID}:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.45;background-image:radial-gradient(1px 1px at 12% 18%,#d5eaffaa 98%,transparent),radial-gradient(1px 1px at 83% 13%,#c8e7ffaa 98%,transparent),radial-gradient(1px 1px at 71% 59%,#d5eaff77 98%,transparent),radial-gradient(1px 1px at 21% 77%,#d5eaff66 98%,transparent),radial-gradient(1px 1px at 92% 88%,#d5eaff88 98%,transparent)}
      #${ROOT_ID} .le-aw-scroll{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 24px) max(17px,env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 132px) max(17px,env(safe-area-inset-left))}
      #${ROOT_ID} .le-aw-wrap{width:min(100%,820px);margin:0 auto;position:relative}
      #${ROOT_ID} .le-aw-masthead{position:relative;padding:18px 4px 20px;border-bottom:1px solid #9eb5ca24}
      #${ROOT_ID} .le-aw-orbit-mark{position:absolute;right:10px;top:10px;width:84px;height:84px;border:1px solid #c58d5540;border-radius:50%;transform:rotate(-28deg) scaleY(.45);pointer-events:none}
      #${ROOT_ID} .le-aw-orbit-mark:after{content:"";position:absolute;left:18%;top:5%;width:7px;height:7px;border-radius:50%;background:#d9a46d;box-shadow:0 0 14px #d9a46dcc}
      #${ROOT_ID} .le-aw-kicker{margin:0 0 9px;color:#d5a875;font-size:10px;font-weight:800;letter-spacing:.24em;text-transform:uppercase}
      #${ROOT_ID} .le-aw-title{margin:0;color:#f4f6fa;font-size:clamp(29px,8vw,43px);line-height:1;letter-spacing:.10em;font-weight:850;text-shadow:0 5px 26px #0008}
      #${ROOT_ID} .le-aw-subtitle{margin:11px 0 0;color:#a9bacb;font-size:13px;line-height:1.5;letter-spacing:.025em;max-width:440px}
      #${ROOT_ID} .le-aw-section-head{display:flex;align-items:center;margin:22px 1px 14px}
      #${ROOT_ID} .le-aw-section-title{margin:0;color:#f0f3f7;font-size:18px;font-weight:780;letter-spacing:.09em;text-transform:uppercase}
      #${ROOT_ID} .le-aw-story-list{display:grid;gap:12px}
      #${ROOT_ID} .le-aw-story{overflow:hidden;border:1px solid #a6b9ca2c;border-radius:16px;background:linear-gradient(145deg,#172434e8,#09121ceF 72%);box-shadow:inset 1px 1px 1px #ffffff10,0 12px 28px #0005;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      #${ROOT_ID} .le-aw-story-media{margin:0;background:#050b12}
      #${ROOT_ID} .le-aw-story-image{display:block;width:100%;max-height:270px;object-fit:cover;background:#0a111a}
      #${ROOT_ID} .le-aw-story-copy{padding:14px 15px 15px}
      #${ROOT_ID} .le-aw-story-meta{margin:0 0 8px;color:#d0a16e;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
      #${ROOT_ID} .le-aw-story-title{margin:0 0 9px;color:#f2f5f8;font-size:17px;line-height:1.25;font-weight:780}
      #${ROOT_ID} .le-aw-story-summary{margin:0;color:#b2c1ce;font-size:12px;line-height:1.6}
      #${ROOT_ID} .le-aw-image-credit{padding:8px 12px;color:#9eacb9;background:#060d15;font-size:9px;line-height:1.45}
      #${ROOT_ID} .le-aw-image-rights{display:block;padding:0 12px 10px;color:#75899a;background:#060d15;font-size:8px;line-height:1.45}
      #${ROOT_ID} .le-aw-story-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:13px;padding-top:10px;border-top:1px solid #9eb5ca20}
      #${ROOT_ID} .le-aw-story-source{color:#8295a7;font-size:9px;letter-spacing:.07em;text-transform:uppercase}
      #${ROOT_ID} .le-aw-source-link{color:#e2b988;font-size:10px;font-weight:750;text-decoration:none;white-space:nowrap}
      #${ROOT_ID} .le-aw-empty{margin:0;padding:15px;border:1px dashed #91a5b433;border-radius:12px;color:#94a6b5;font-size:11px;line-height:1.5}
      @media(min-width:680px){#${ROOT_ID} .le-aw-story{display:grid;grid-template-columns:minmax(220px,38%) 1fr}#${ROOT_ID} .le-aw-story-media{display:flex;flex-direction:column;justify-content:center}#${ROOT_ID} .le-aw-story-image{height:100%;max-height:none;min-height:190px}#${ROOT_ID} .le-aw-story-copy{align-self:center;padding:20px}}
      @media(orientation:landscape){#${ROOT_ID} .le-aw-scroll{padding-left:max(24px,env(safe-area-inset-left));padding-right:max(24px,env(safe-area-inset-right))}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function storyCard(story, index) {
    const card = element('article', 'le-aw-story');
    card.dataset.storyId = story.id || `story-${index + 1}`;
    const imageUrl = safeHttpsUrl(story.imageUrl);
    if (imageUrl && story.imageCredit) {
      const media = element('figure', 'le-aw-story-media');
      const image = element('img', 'le-aw-story-image');
      image.src = imageUrl;
      image.alt = story.imageCaption || story.title || 'NASA source image';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => media.remove(), { once: true });
      media.appendChild(image);
      media.appendChild(element('figcaption', 'le-aw-image-credit', story.imageCredit));
      if (story.imageRightsNote) media.appendChild(element('small', 'le-aw-image-rights', story.imageRightsNote));
      card.appendChild(media);
    }

    const copy = element('div', 'le-aw-story-copy');
    copy.appendChild(element('div', 'le-aw-story-meta', `${story.sourceName || 'SPACE REPORT'} · ${dateLabel(story.publishedAt)}`));
    copy.appendChild(element('h2', 'le-aw-story-title', story.title || 'Space science report'));
    copy.appendChild(element('p', 'le-aw-story-summary', story.summary || 'Open the original report for complete details.'));
    const footer = element('div', 'le-aw-story-footer');
    footer.appendChild(element('span', 'le-aw-story-source', story.sourceName || 'Original source'));
    const sourceUrl = safeHttpsUrl(story.url);
    if (sourceUrl) {
      const link = element('a', 'le-aw-source-link', 'Read original ↗');
      link.href = sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      footer.appendChild(link);
    }
    copy.appendChild(footer);
    card.appendChild(copy);
    return card;
  }

  async function refreshLiveFeed() {
    if (!active || !liveList) return;
    liveList.replaceChildren(element('p', 'le-aw-empty', 'Loading Live Feeds…'));
    try {
      await ensureServices();
      const feed = await window.LiveEarthAlienWorldPublisher.loadLiveFeed();
      if (!active) return;
      liveList.replaceChildren();
      if (!feed.stories.length) {
        liveList.appendChild(element('p', 'le-aw-empty', 'No eligible NASA reports are available in the current rolling feed yet.'));
      } else {
        feed.stories.forEach((story, index) => liveList.appendChild(storyCard(story, index)));
      }
    } catch (error) {
      if (!active) return;
      liveList.replaceChildren();
      const message = navigator.onLine === false
        ? 'Live Feeds need an internet connection. Reconnect to load the current reports.'
        : `${error?.message || 'Live Feeds are temporarily unavailable.'} Please try again shortly.`;
      liveList.appendChild(element('p', 'le-aw-empty', message));
    }
  }

  function buildRoot() {
    if (root) return;
    addStyles();
    root = element('section');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Alien World live space science reports');
    root.setAttribute('aria-hidden', 'true');

    const scroll = element('div', 'le-aw-scroll');
    const wrap = element('div', 'le-aw-wrap');
    const masthead = element('header', 'le-aw-masthead');
    masthead.appendChild(element('div', 'le-aw-orbit-mark'));
    masthead.append(
      element('p', 'le-aw-kicker', 'LIVE // EARTH · DEEP SPACE REPORT'),
      element('h1', 'le-aw-title', 'ALIEN WORLD'),
      element('p', 'le-aw-subtitle', 'Current space science, missions and discoveries — gathered from official NASA sources.')
    );

    const sectionHead = element('div', 'le-aw-section-head');
    sectionHead.appendChild(element('h2', 'le-aw-section-title', 'LIVE FEEDS'));
    liveList = element('div', 'le-aw-story-list');

    wrap.append(masthead, sectionHead, liveList);
    scroll.appendChild(wrap);
    root.appendChild(scroll);
    document.body.appendChild(root);
  }

  function activate() {
    const genericStage = document.getElementById('le-feature-stage');
    if (genericStage) genericStage.hidden = true;
    buildRoot();
    active = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', { detail: { active: true } }));
    refreshLiveFeed();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(() => {
      if (active && navigator.onLine !== false) refreshLiveFeed();
    }, REFRESH_MS);
  }

  function deactivate() {
    active = false;
    window.clearInterval(refreshTimer);
    refreshTimer = 0;
    if (root) {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', { detail: { active: false } }));
  }

  function onOffline() {
    if (!active || !liveList) return;
    liveList.replaceChildren(element('p', 'le-aw-empty', 'Live Feeds need an internet connection. Reconnect to load the current reports.'));
  }

  function onOnline() {
    if (active) refreshLiveFeed();
  }

  function install() {
    if (window.__liveEarthAlienWorldViewInstalled) return;
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return;
    api.register(VIEW_ID, {
      title: 'Alien World',
      shortLabel: 'Alien World',
      symbol: '🛸',
      description: 'Live space science reports, missions and discoveries from NASA sources.',
      connected: true,
      activate,
      deactivate
    });
    window.__liveEarthAlienWorldViewInstalled = true;
    window.__liveEarthAlienWorldViewWaiting = false;
    window.LiveEarthAlienWorldView = Object.freeze({
      open: () => api.open(VIEW_ID, 'api'),
      close: () => api.close('api'),
      isOpen: () => api.isActive(VIEW_ID)
    });
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
  }

  if (window.LiveEarthFeatureViews?.register) install();
  else window.addEventListener('live-earth-feature-views-ready', install, { once: true });
})();
