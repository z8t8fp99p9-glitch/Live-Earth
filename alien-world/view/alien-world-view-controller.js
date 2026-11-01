/* LIVE // EARTH — Alien World feature view.
   Displays finished Collector/Publisher output only. The Collector owns source
   access and the database; the Publisher owns editorial production; shared
   services provide the Editorial Engine and Global PDF Reader. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldViewInstalled || window.__liveEarthAlienWorldViewWaiting) return;
  window.__liveEarthAlienWorldViewWaiting = true;

  const VIEW_ID = 'alien-world';
  const ROOT_ID = 'le-alien-world-view';
  const ACTIONS_URL = 'https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/workflows/alien-world-publisher.yml';
  const DEFAULT_BRIEF = 'Create a cinematic, image-led space journal with a dramatic cover, clear story hierarchy, a useful explainer, a mission/discovery timeline, source notes and a memorable closing page. Use only automatically screened NASA source-post imagery beside its originating factual story. Preserve exact source links, visible image credits and rights notes. Do not imply NASA endorsement and do not pad the edition.';
  const REFRESH_MS = 5 * 60 * 1000;

  let active = false;
  let activeTab = 'live';
  let refreshTimer = 0;
  let servicesPromise = null;
  let root = null;
  let livePanel = null;
  let journalPanel = null;
  let liveList = null;
  let issueList = null;
  let liveStatus = null;
  let journalStatus = null;
  let liveCount = null;
  let briefInput = null;
  let savedList = null;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  function setStatus(node, message, state = 'info') {
    if (!node) return;
    node.textContent = message || '';
    node.dataset.state = state;
    node.hidden = !message;
  }

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
      window.LiveEarthUniversalEditorialEngine &&
      window.LiveEarthUniversalPDFViewer &&
      window.LiveEarthAlienWorldPublisher
    );
    if (ready()) return Promise.resolve();
    if (servicesPromise) return servicesPromise;
    servicesPromise = loadScript('./editorial-engine/universal-editorial-engine.js',
      () => Boolean(window.LiveEarthUniversalEditorialEngine))
      .then(() => loadScript('./universal-pdf-viewer.js',
        () => Boolean(window.LiveEarthUniversalPDFViewer)))
      .then(() => loadScript('./alien-world/view/alien-world-publisher-client.js',
        () => Boolean(window.LiveEarthAlienWorldPublisher)))
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
      #${ROOT_ID}{position:fixed;inset:0;z-index:6;color:#edf4fb;background:radial-gradient(ellipse at 50% 0%,#1a293b 0%,#0a111c 42%,#050910 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      #${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID}:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.45;background-image:radial-gradient(1px 1px at 12% 18%,#d5eaffaa 98%,transparent),radial-gradient(1px 1px at 83% 13%,#c8e7ffaa 98%,transparent),radial-gradient(1px 1px at 71% 59%,#d5eaff77 98%,transparent),radial-gradient(1px 1px at 21% 77%,#d5eaff66 98%,transparent),radial-gradient(1px 1px at 92% 88%,#d5eaff88 98%,transparent)}
      #${ROOT_ID} .le-aw-scroll{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 24px) max(17px,env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 132px) max(17px,env(safe-area-inset-left));}
      #${ROOT_ID} .le-aw-wrap{width:min(100%,820px);margin:0 auto;position:relative}
      #${ROOT_ID} .le-aw-masthead{position:relative;padding:18px 4px 20px;border-bottom:1px solid #9eb5ca24}
      #${ROOT_ID} .le-aw-orbit-mark{position:absolute;right:10px;top:10px;width:84px;height:84px;border:1px solid #c58d5540;border-radius:50%;transform:rotate(-28deg) scaleY(.45);pointer-events:none}
      #${ROOT_ID} .le-aw-orbit-mark:after{content:"";position:absolute;left:18%;top:5%;width:7px;height:7px;border-radius:50%;background:#d9a46d;box-shadow:0 0 14px #d9a46dcc}
      #${ROOT_ID} .le-aw-kicker{margin:0 0 9px;color:#d5a875;font-size:10px;font-weight:800;letter-spacing:.24em;text-transform:uppercase}
      #${ROOT_ID} .le-aw-title{margin:0;color:#f4f6fa;font-size:clamp(29px,8vw,43px);line-height:1;letter-spacing:.10em;font-weight:850;text-shadow:0 5px 26px #0008}
      #${ROOT_ID} .le-aw-subtitle{margin:11px 0 0;color:#a9bacb;font-size:13px;line-height:1.5;letter-spacing:.025em;max-width:420px}
      #${ROOT_ID} .le-aw-tabs{display:flex;gap:8px;margin:18px 0 16px;padding:5px;border:1px solid #adbacb30;border-radius:14px;background:#09121dd9;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
      #${ROOT_ID} .le-aw-tab{flex:1;min-height:42px;padding:9px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:#9fb0c1;font:750 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.10em;text-transform:uppercase;touch-action:manipulation}
      #${ROOT_ID} .le-aw-tab[aria-pressed="true"]{border-color:#d3a16b7a;background:linear-gradient(140deg,#aa764b42,#ffffff08);color:#f2d6b4;box-shadow:inset 1px 1px 1px #ffffff18,0 6px 18px #0005}
      #${ROOT_ID} .le-aw-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:15px 1px 10px}
      #${ROOT_ID} .le-aw-section-title{margin:0;color:#f0f3f7;font-size:17px;font-weight:760;letter-spacing:.015em}
      #${ROOT_ID} .le-aw-count{flex:0 0 auto;color:#d9a976;font-size:9px;font-weight:800;letter-spacing:.13em}
      #${ROOT_ID} .le-aw-status{margin:10px 0 14px;padding:12px 13px;border:1px solid #8296ab30;border-radius:12px;background:#0d1824b8;color:#aebfd0;font-size:11px;line-height:1.5}
      #${ROOT_ID} .le-aw-status[hidden]{display:none}
      #${ROOT_ID} .le-aw-status[data-state="success"]{border-color:#7ebc9b55;color:#bfe0ce}
      #${ROOT_ID} .le-aw-status[data-state="warning"]{border-color:#d19c5b66;color:#e4c49c}
      #${ROOT_ID} .le-aw-status[data-state="empty"]{color:#9aabba}
      #${ROOT_ID} .le-aw-story-list,#${ROOT_ID} .le-aw-issue-list{display:grid;gap:12px}
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
      #${ROOT_ID} .le-aw-issue{display:grid;grid-template-columns:minmax(112px,34%) 1fr;gap:13px;padding:12px;border:1px solid #a6b9ca32;border-radius:16px;background:linear-gradient(145deg,#172434e8,#09121ceF 72%);box-shadow:inset 1px 1px 1px #ffffff10,0 12px 28px #0005}
      #${ROOT_ID} .le-aw-cover{min-height:150px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;padding:13px 11px;border:1px solid #dbad784d;border-radius:11px;background:radial-gradient(ellipse at 60% 18%,#8f64494d,transparent 48%),linear-gradient(155deg,#27384a,#0a121d 65%,#05080d);position:relative}
      #${ROOT_ID} .le-aw-cover:after{content:"";position:absolute;width:125%;height:48px;left:-10%;top:42%;border:1px solid #d4a16c66;border-radius:50%;transform:rotate(-34deg);pointer-events:none}
      #${ROOT_ID} .le-aw-cover-kicker{position:relative;z-index:1;color:#d8af83;font-size:8px;font-weight:850;letter-spacing:.16em}
      #${ROOT_ID} .le-aw-cover-title{position:relative;z-index:1;color:#f4f1ea;font-size:clamp(15px,4vw,21px);line-height:1.05;font-weight:850;letter-spacing:.035em;overflow-wrap:anywhere}
      #${ROOT_ID} .le-aw-cover-meta{position:relative;z-index:1;color:#97a8b7;font-size:8px;letter-spacing:.13em}
      #${ROOT_ID} .le-aw-issue-info{min-width:0;display:flex;flex-direction:column;justify-content:center;gap:6px}
      #${ROOT_ID} .le-aw-issue-title{margin:0;color:#f1f4f7;font-size:14px;line-height:1.25;font-weight:780}
      #${ROOT_ID} .le-aw-issue-meta{margin:0;color:#aab9c7;font-size:10px;line-height:1.5}
      #${ROOT_ID} .le-aw-issue-brief{margin-top:4px;padding:9px 10px;border-left:2px solid #bc8d5d;background:#c48d5020;color:#b7c2cc;font-size:9px;line-height:1.5}
      #${ROOT_ID} .le-aw-issue-brief strong{display:block;margin-bottom:4px;color:#e3bd91;font-size:8px;letter-spacing:.12em}
      #${ROOT_ID} .le-aw-button{display:inline-flex;align-items:center;justify-content:center;min-height:39px;padding:9px 13px;border:1px solid #b7c5d244;border-radius:10px;background:#152333;color:#dce6ee;text-decoration:none;font:750 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase;touch-action:manipulation}
      #${ROOT_ID} .le-aw-button-primary{border-color:#d7a56d99;background:linear-gradient(140deg,#a9764a66,#ffffff09);color:#f0d3ad}
      #${ROOT_ID} .le-aw-button:focus-visible,#${ROOT_ID} .le-aw-tab:focus-visible{outline:2px solid #e8be91;outline-offset:3px}
      #${ROOT_ID} .le-aw-issue-actions{margin-top:6px}
      #${ROOT_ID} .le-aw-publisher-panel,#${ROOT_ID} .le-aw-saved-panel{margin-top:14px;padding:15px;border:1px solid #a6b9ca36;border-radius:16px;background:linear-gradient(145deg,#172434db,#08121eeF);box-shadow:inset 1px 1px 1px #ffffff0c,0 10px 25px #0004;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      #${ROOT_ID} .le-aw-panel-title{margin:0 0 7px;color:#f0f3f6;font-size:14px;font-weight:780}
      #${ROOT_ID} .le-aw-panel-copy{margin:0 0 12px;color:#a9bac8;font-size:10px;line-height:1.55}
      #${ROOT_ID} .le-aw-brief{display:block;width:100%;min-height:104px;resize:vertical;padding:11px;border:1px solid #8fa2b44a;border-radius:11px;background:#050c15;color:#e4edf4;font:11px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #${ROOT_ID} .le-aw-panel-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      #${ROOT_ID} .le-aw-footnote{margin:11px 0 0;color:#75899b;font-size:9px;line-height:1.55}
      #${ROOT_ID} .le-aw-saved-list{display:grid;gap:8px;margin-top:10px}
      #${ROOT_ID} .le-aw-saved-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #a8b8c722}
      #${ROOT_ID} .le-aw-saved-copy{min-width:0;display:flex;flex-direction:column;gap:4px}
      #${ROOT_ID} .le-aw-saved-title{color:#e9edf1;font-size:11px;font-weight:750;line-height:1.35;overflow-wrap:anywhere}
      #${ROOT_ID} .le-aw-saved-meta{color:#91a3b2;font-size:9px}
      #${ROOT_ID} .le-aw-empty{margin:0;padding:15px;border:1px dashed #91a5b433;border-radius:12px;color:#94a6b5;font-size:11px;line-height:1.5}
      @media(min-width:680px){#${ROOT_ID} .le-aw-story{display:grid;grid-template-columns:minmax(220px,38%) 1fr}#${ROOT_ID} .le-aw-story-media{display:flex;flex-direction:column;justify-content:center}#${ROOT_ID} .le-aw-story-image{height:100%;max-height:none;min-height:190px}#${ROOT_ID} .le-aw-story-copy{align-self:center;padding:20px}#${ROOT_ID} .le-aw-issue{grid-template-columns:minmax(150px,28%) 1fr}#${ROOT_ID} .le-aw-cover{min-height:178px}}
      @media(orientation:landscape){#${ROOT_ID} .le-aw-scroll{padding-left:max(24px,env(safe-area-inset-left));padding-right:max(24px,env(safe-area-inset-right))}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function storyCard(story, index) {
    const card = element('article', 'le-aw-story');
    card.dataset.storyId = story.id || `story-${index + 1}`;
    if (story.imageUrl && story.imageCredit) {
      const media = element('figure', 'le-aw-story-media');
      const imageUrl = safeHttpsUrl(story.imageUrl);
      if (imageUrl) {
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
    }

    const copy = element('div', 'le-aw-story-copy');
    copy.appendChild(element('div', 'le-aw-story-meta', `${story.sourceName || 'SPACE REPORT'} · ${dateLabel(story.publishedAt)}`));
    copy.appendChild(element('h2', 'le-aw-story-title', story.title || 'Space science report'));
    copy.appendChild(element('p', 'le-aw-story-summary', story.summary || 'Open the original report for the complete details.'));
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

  function issueCard(issue) {
    const card = element('article', 'le-aw-issue');
    const cover = element('div', 'le-aw-cover');
    cover.append(
      element('span', 'le-aw-cover-kicker', 'LIVE // EARTH · JOURNAL'),
      element('strong', 'le-aw-cover-title', issue.title || 'The Space Journal'),
      element('span', 'le-aw-cover-meta', 'THE 48-HOUR EDITION')
    );
    const info = element('div', 'le-aw-issue-info');
    info.appendChild(element('h3', 'le-aw-issue-title', issue.title || 'The Space Journal'));
    info.appendChild(element('p', 'le-aw-issue-meta', `${dateLabel(issue.publishedAt)} · ${issue.pages || '—'} pages · ${issue.storyCount || 0} reports`));
    info.appendChild(element('p', 'le-aw-issue-meta', 'Coverage window: previous 48 hours'));
    if (issue.customRequest || issue.customRequestReceipt) {
      const receipt = issue.customRequestReceipt || {};
      const panel = element('div', 'le-aw-issue-brief');
      panel.appendChild(element('strong', '', 'EDITORIAL BRIEF RECEIPT'));
      if (issue.customRequest) panel.appendChild(element('div', '', `Brief: ${issue.customRequest}`));
      if (Array.isArray(receipt.applied) && receipt.applied.length) panel.appendChild(element('div', '', `Applied: ${receipt.applied.join(' · ')}`));
      if (Array.isArray(receipt.unmapped) && receipt.unmapped.length) panel.appendChild(element('div', '', `Not applied: ${receipt.unmapped.join(' · ')}`));
      if (receipt.engineLimitation) panel.appendChild(element('div', '', receipt.engineLimitation));
      info.appendChild(panel);
    }
    const actions = element('div', 'le-aw-issue-actions');
    const open = element('button', 'le-aw-button le-aw-button-primary', 'Read Space Journal');
    open.type = 'button';
    open.addEventListener('click', async () => {
      try {
        await ensureServices();
        await window.LiveEarthAlienWorldPublisher.openMagazine(issue);
      } catch (error) {
        setStatus(journalStatus, error?.message || 'The Space Journal could not be opened.', 'warning');
      }
    });
    actions.appendChild(open);
    info.appendChild(actions);
    card.append(cover, info);
    return card;
  }

  async function refreshLiveFeed() {
    if (!active || activeTab !== 'live' || !liveList) return;
    setStatus(liveStatus, 'Contacting the Alien World publication feed…');
    try {
      await ensureServices();
      const feed = await window.LiveEarthAlienWorldPublisher.loadLiveFeed();
      if (!active || activeTab !== 'live') return;
      liveList.replaceChildren();
      if (!feed.stories.length) {
        setStatus(liveStatus, 'No eligible NASA reports have been published in the current 48-hour window.', 'empty');
      } else {
        feed.stories.forEach((story, index) => liveList.appendChild(storyCard(story, index)));
        setStatus(liveStatus, `Updated ${dateLabel(feed.generatedAt)} · Rolling ${feed.windowHours || 48}-hour window`, 'success');
      }
      if (liveCount) liveCount.textContent = `${feed.storyCount || feed.stories.length} REPORTS`;
    } catch (error) {
      liveList.replaceChildren();
      const message = navigator.onLine === false
        ? 'Live space reports are online-only. Reconnect to load the latest verified feed.'
        : `${error?.message || 'The live feed is not available yet.'} The last successful publication remains preserved.`;
      setStatus(liveStatus, message, 'warning');
      if (liveCount) liveCount.textContent = 'LIVE FEED';
    }
  }

  async function refreshJournal() {
    if (!active || activeTab !== 'journal' || !issueList) return;
    setStatus(journalStatus, 'Checking the published Space Journal catalogue…');
    try {
      await ensureServices();
      const catalog = await window.LiveEarthAlienWorldPublisher.loadCatalog();
      if (!active || activeTab !== 'journal') return;
      issueList.replaceChildren();
      if (!catalog.issues.length) {
        issueList.appendChild(element('p', 'le-aw-empty', 'The first Space Journal has not been published yet. Use the Publisher controls below when you are ready to create an edition.'));
        setStatus(journalStatus, 'No completed journal edition is published yet.', 'empty');
      } else {
        catalog.issues.forEach(issue => issueList.appendChild(issueCard(issue)));
        setStatus(journalStatus, `${catalog.issues.length} completed edition${catalog.issues.length === 1 ? '' : 's'} in the public catalogue.`, 'success');
      }
    } catch (error) {
      issueList.replaceChildren();
      setStatus(journalStatus, navigator.onLine === false
        ? 'The public catalogue needs an internet connection. Previously saved PDFs remain available below.'
        : `${error?.message || 'The catalogue is not available yet.'} The last successful publication is preserved.`, 'warning');
    }
    await refreshSavedLibrary();
  }

  async function refreshSavedLibrary() {
    if (!savedList || !window.LiveEarthAlienWorldPublisher?.listSavedMagazines) return;
    savedList.replaceChildren();
    try {
      const saved = await window.LiveEarthAlienWorldPublisher.listSavedMagazines();
      if (!saved.length) {
        savedList.appendChild(element('p', 'le-aw-empty', 'No Space Journal has been saved on this device yet. Open an edition in the Global PDF Reader and use its Save option to keep a local copy.'));
        return;
      }
      for (const item of saved) {
        const row = element('div', 'le-aw-saved-row');
        const copy = element('div', 'le-aw-saved-copy');
        copy.appendChild(element('strong', 'le-aw-saved-title', item.title || 'The Space Journal'));
        copy.appendChild(element('span', 'le-aw-saved-meta', `${item.pages || 'PDF'} pages · ${item.savedAt ? `Saved ${dateLabel(Number(item.savedAt))}` : 'Saved on this device'}`));
        const open = element('button', 'le-aw-button', 'Open');
        open.type = 'button';
        open.addEventListener('click', async () => {
          try { await window.LiveEarthAlienWorldPublisher.openSaved(item); }
          catch (error) { setStatus(journalStatus, error?.message || 'The saved PDF could not be opened.', 'warning'); }
        });
        row.append(copy, open);
        savedList.appendChild(row);
      }
    } catch (_) {
      savedList.appendChild(element('p', 'le-aw-empty', 'The Global PDF Reader library is unavailable in this session. Existing saved files have not been changed.'));
    }
  }

  function setTab(tab) {
    activeTab = tab === 'journal' ? 'journal' : 'live';
    if (!root) return;
    root.querySelectorAll('[data-aw-tab]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.awTab === activeTab));
    });
    if (livePanel) livePanel.hidden = activeTab !== 'live';
    if (journalPanel) journalPanel.hidden = activeTab !== 'journal';
    if (active) {
      if (activeTab === 'live') refreshLiveFeed();
      else refreshJournal();
    }
  }

  function buildRoot() {
    if (root) return;
    addStyles();
    root = element('section');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Alien World space science view');
    root.setAttribute('aria-hidden', 'true');

    const scroll = element('div', 'le-aw-scroll');
    const wrap = element('div', 'le-aw-wrap');
    const masthead = element('header', 'le-aw-masthead');
    masthead.appendChild(element('div', 'le-aw-orbit-mark'));
    masthead.append(
      element('p', 'le-aw-kicker', 'LIVE // EARTH · DEEP SPACE REPORT'),
      element('h1', 'le-aw-title', 'ALIEN WORLD'),
      element('p', 'le-aw-subtitle', 'Space science, missions and discoveries — gathered from official NASA sources.')
    );

    const tabs = element('nav', 'le-aw-tabs');
    tabs.setAttribute('aria-label', 'Alien World sections');
    const liveTab = element('button', 'le-aw-tab', 'Live Reports');
    liveTab.type = 'button'; liveTab.dataset.awTab = 'live'; liveTab.setAttribute('aria-pressed', 'true');
    const journalTab = element('button', 'le-aw-tab', 'Space Journal');
    journalTab.type = 'button'; journalTab.dataset.awTab = 'journal'; journalTab.setAttribute('aria-pressed', 'false');
    tabs.append(liveTab, journalTab);

    livePanel = element('section', 'le-aw-panel');
    const liveHead = element('div', 'le-aw-section-head');
    liveHead.appendChild(element('h2', 'le-aw-section-title', 'Latest from space'));
    liveCount = element('span', 'le-aw-count', 'LIVE FEED');
    liveHead.appendChild(liveCount);
    liveStatus = element('p', 'le-aw-status', 'Connect to load the latest published reports.');
    livePanel.append(liveHead, liveStatus);
    liveList = element('div', 'le-aw-story-list');
    livePanel.appendChild(liveList);

    journalPanel = element('section', 'le-aw-panel');
    journalPanel.hidden = true;
    const journalHead = element('div', 'le-aw-section-head');
    journalHead.appendChild(element('h2', 'le-aw-section-title', 'The Space Journal'));
    journalHead.appendChild(element('span', 'le-aw-count', '48-HOUR EDITION'));
    journalStatus = element('p', 'le-aw-status', 'The catalogue appears here when an edition has been published.');
    issueList = element('div', 'le-aw-issue-list');
    journalPanel.append(journalHead, journalStatus, issueList);

    const publisher = element('section', 'le-aw-publisher-panel');
    publisher.append(
      element('h3', 'le-aw-panel-title', 'Create a Space Journal'),
      element('p', 'le-aw-panel-copy', 'Shape the editorial brief, then open the secure GitHub Actions Publisher. The Collector gathers source material; the Publisher reads its database and commands the shared Editorial Engine.')
    );
    briefInput = element('textarea', 'le-aw-brief');
    briefInput.value = DEFAULT_BRIEF;
    briefInput.maxLength = 1400;
    briefInput.setAttribute('aria-label', 'Custom Space Journal editorial brief');
    const actions = element('div', 'le-aw-panel-actions');
    const copyButton = element('button', 'le-aw-button', 'Copy editorial brief');
    copyButton.type = 'button';
    const openPublisher = element('a', 'le-aw-button le-aw-button-primary', 'Open Publisher');
    openPublisher.href = ACTIONS_URL;
    openPublisher.target = '_blank';
    openPublisher.rel = 'noopener noreferrer';
    actions.append(copyButton, openPublisher);
    publisher.append(actions, element('p', 'le-aw-footnote', 'The app never stores a GitHub token. In GitHub Actions, choose live, magazine or all; paste the brief into the custom request field when creating a journal. Live reports and the public catalogue require a connection.'));

    const saved = element('section', 'le-aw-saved-panel');
    saved.append(
      element('h3', 'le-aw-panel-title', 'Saved on this device'),
      element('p', 'le-aw-panel-copy', 'Only PDFs you explicitly save in the Global PDF Reader appear here. Live reports are not stored offline.')
    );
    savedList = element('div', 'le-aw-saved-list');
    saved.appendChild(savedList);
    journalPanel.append(publisher, saved);

    wrap.append(masthead, tabs, livePanel, journalPanel);
    scroll.appendChild(wrap);
    root.appendChild(scroll);
    document.body.appendChild(root);

    liveTab.addEventListener('click', () => setTab('live'));
    journalTab.addEventListener('click', () => setTab('journal'));
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(briefInput.value);
        setStatus(journalStatus, 'Editorial brief copied. Paste it into the custom request field in GitHub Actions.', 'success');
      } catch (_) {
        briefInput.focus();
        briefInput.select();
        setStatus(journalStatus, 'Select and copy the highlighted brief, then paste it into GitHub Actions.', 'info');
      }
    });
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
    ensureServices().then(() => {
      if (!active) return;
      if (activeTab === 'live') refreshLiveFeed();
      else refreshJournal();
      window.clearInterval(refreshTimer);
      refreshTimer = window.setInterval(() => {
        if (active && activeTab === 'live') refreshLiveFeed();
      }, REFRESH_MS);
      refreshSavedLibrary();
    }).catch(error => {
      const target = activeTab === 'live' ? liveStatus : journalStatus;
      setStatus(target, `${error?.message || 'The Alien World services are not available.'} Connect to load public output.`, 'warning');
    });
  }

  function deactivate() {
    active = false;
    window.clearInterval(refreshTimer);
    refreshTimer = 0;
    if (window.LiveEarthUniversalPDFViewer?.isOpen?.()) window.LiveEarthUniversalPDFViewer.close();
    if (root) {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', { detail: { active: false } }));
  }

  function onOffline() {
    if (!active || !liveList) return;
    liveList.replaceChildren();
    setStatus(liveStatus, 'Live space reports are online-only. Reconnect to load the latest verified feed.', 'warning');
    if (liveCount) liveCount.textContent = 'LIVE FEED';
    refreshSavedLibrary();
  }

  function onOnline() {
    if (!active) return;
    if (activeTab === 'live') refreshLiveFeed();
    else refreshJournal();
  }

  function install() {
    if (window.__liveEarthAlienWorldViewInstalled) return;
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return;
    api.register(VIEW_ID, {
      title: 'Alien World',
      shortLabel: 'Alien World',
      symbol: '🛸',
      description: 'Space science, missions, discoveries and the Space Journal.',
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
