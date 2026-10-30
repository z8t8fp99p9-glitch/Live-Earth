/* LIVE // EARTH — Alien World Main Page.
   This existing Main Page remains the view entry/consumer layer. It owns no feed
   collection, database writes, PDF composition or global reader implementation.
   Orb lifecycle/glow/navigation remains entirely owned by the shared Feature Orb system. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldViewInstalled || window.__liveEarthAlienWorldViewWaiting) return;
  window.__liveEarthAlienWorldViewWaiting = true;

  const ACTIONS_URL = 'https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/workflows/alien-world-publisher.yml';
  const DEFAULT_REQUEST = 'Create a cinematic, image-led space journal with a dramatic cover, clear story hierarchy, an explainer page, a timeline, source notes and a strong closing page. Use only Publisher-screened NASA imagery, retain visible credits and usage notes, and omit unsuitable images.';
  let servicesPromise = null;
  let refreshTimer = 0;
  let currentTab = 'live';
  let active = false;
  let root = null;
  let stage = null;
  let liveBody = null;
  let weeklyBody = null;
  let liveStatus = null;
  let weeklyStatus = null;
  let liveCount = null;
  let issueList = null;
  let requestBox = null;
  let latestCatalog = null;

  function loadScript(src) {
    const absolute = new URL(src, document.baseURI).href;
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === absolute);
      if (existing && existing.dataset.leLoaded === '1') { resolve(); return; }
      const script = existing || document.createElement('script');
      let settled = false;
      let timer = 0;
      const finish = callback => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        callback();
      };
      const done = () => finish(() => { script.dataset.leLoaded = '1'; resolve(); });
      const fail = () => finish(() => reject(new Error(`Could not load ${src}.`)));
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) { script.src = absolute; script.async = true; document.head.appendChild(script); }
      else if (script.dataset.leLoaded === '1' || script.readyState === 'complete') done();
      // A stalled optional service must not freeze Alien World indefinitely.
      timer = window.setTimeout(fail, 15000);
    });
  }

  function ensureServices() {
    if (window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer && window.LiveEarthAlienWorldPublisher) return Promise.resolve();
    if (servicesPromise) return servicesPromise;
    servicesPromise = loadScript('./universal-editorial-engine.js')
      .then(() => loadScript('./universal-pdf-viewer.js'))
      .then(() => loadScript('./alien-world-publisher-client.js'))
      .then(() => {
        if (!window.LiveEarthUniversalEditorialEngine || !window.LiveEarthUniversalPDFViewer || !window.LiveEarthAlienWorldPublisher) {
          throw new Error('A shared publication service did not register correctly.');
        }
      }).catch(error => { servicesPromise = null; throw error; });
    return servicesPromise;
  }

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function setStatus(node, message, kind = 'info') {
    if (!node) return;
    node.textContent = message;
    node.dataset.state = kind;
    node.hidden = !message;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Recently published';
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function buildStoryCard(story) {
    const article = create('article', 'le-aw-story');
    article.dataset.storyId = story.id;
    if (story.imageUrl && story.imageCredit) {
      const figure = create('figure', 'le-aw-story-media');
      const image = create('img');
      image.src = story.imageUrl;
      image.alt = story.title;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.decoding = 'async';
      image.addEventListener('error', () => figure.remove(), { once: true });
      figure.appendChild(image);
      const credit = create('figcaption', 'le-aw-image-credit', story.imageCredit);
      figure.appendChild(credit);
      if (story.imageRightsNote) {
        figure.appendChild(create('small', 'le-aw-image-rights', story.imageRightsNote));
      }
      article.appendChild(figure);
    }
    const body = create('div', 'le-aw-story-copy');
    const meta = create('div', 'le-aw-story-meta', `${story.sourceName || 'SPACE REPORT'}  ·  ${formatDate(story.publishedAt)}`);
    const title = create('h2', 'le-aw-story-title', story.title);
    const summary = create('p', 'le-aw-story-summary', story.summary || 'Open the original report for the full details and context.');
    const footer = create('div', 'le-aw-story-footer');
    const source = create('span', 'le-aw-story-source', story.sourceName || 'Original source');
    const link = create('a', 'le-aw-story-link', 'Read source ↗');
    link.href = story.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    footer.append(source, link);
    body.append(meta, title, summary, footer);
    article.appendChild(body);
    return article;
  }

  async function refreshLiveFeed() {
    if (!active || currentTab !== 'live' || !liveBody) return;
    setStatus(liveStatus, 'Connecting to the Alien World Publisher…');
    try {
      await ensureServices();
      const feed = await window.LiveEarthAlienWorldPublisher.loadLiveFeed();
      if (!active || currentTab !== 'live') return;
      liveBody.replaceChildren();
      if (!feed.stories.length) {
        setStatus(liveStatus, 'No eligible reports have been published in the current window yet.', 'empty');
      } else {
        for (const story of feed.stories) liveBody.appendChild(buildStoryCard(story));
        setStatus(liveStatus, `Updated ${formatDate(feed.generatedAt)}  ·  Rolling ${feed.windowHours}-hour feed`, 'success');
      }
      if (liveCount) liveCount.textContent = `${feed.storyCount} REPORTS`;
    } catch (error) {
      liveBody.replaceChildren();
      setStatus(liveStatus, navigator.onLine === false
        ? 'Alien World feeds are online publications. Reconnect to load the latest reports.'
        : `${error.message || 'The live feed is not available yet.'} The previous published edition remains on the repository.`, 'warning');
      if (liveCount) liveCount.textContent = 'LIVE FEEDS';
    }
  }

  function buildIssueCard(issue) {
    const card = create('article', 'le-aw-issue');
    const cover = create('div', 'le-aw-issue-cover');
    const coverKicker = create('span', 'le-aw-issue-kicker', 'THE SPACE JOURNAL');
    const coverTitle = create('strong', 'le-aw-issue-cover-title', issue.title || 'The Space Journal');
    const coverMeta = create('span', 'le-aw-issue-cover-meta', 'THE 48-HOUR EDITION');
    cover.append(coverKicker, coverTitle, coverMeta);
    const info = create('div', 'le-aw-issue-info');
    const title = create('h3', 'le-aw-issue-title', issue.title || 'The Space Journal');
    const date = create('p', 'le-aw-issue-date', `${formatDate(issue.publishedAt)}  ·  ${issue.pages || '—'} pages  ·  ${issue.storyCount || 0} reports`);
    const coverage = create('p', 'le-aw-issue-coverage', 'Coverage: previous 48 hours');
    const actions = create('div', 'le-aw-issue-actions');
    const receipt = issue.customRequestReceipt;
    let briefPanel = null;
    if (issue.customRequest || receipt) {
      briefPanel = create('div', 'le-aw-issue-brief');
      briefPanel.appendChild(create('strong', '', 'EDITORIAL ENGINE — CUSTOM REQUEST RECEIPT'));
      if (issue.customRequest) {
        const brief = create('p', '', `Brief: ${issue.customRequest}`);
        briefPanel.appendChild(brief);
      }
      if (receipt && Array.isArray(receipt.applied) && receipt.applied.length) {
        briefPanel.appendChild(create('p', 'le-aw-issue-applied', `Applied: ${receipt.applied.join(' · ')}`));
      }
      if (receipt && Array.isArray(receipt.unmapped) && receipt.unmapped.length) {
        briefPanel.appendChild(create('p', 'le-aw-issue-unmapped', `Not applied: ${receipt.unmapped.join(' · ')}`));
      }
      if (receipt && receipt.engineLimitation) {
        briefPanel.appendChild(create('p', 'le-aw-issue-limitation', receipt.engineLimitation));
      }
    }
    const read = create('button', 'le-aw-button le-aw-button-primary', 'Read Magazine');
    read.type = 'button';
    read.addEventListener('click', async () => {
      try { await ensureServices(); await window.LiveEarthAlienWorldPublisher.openMagazine(issue); }
      catch (error) { setStatus(weeklyStatus, error.message || 'Could not open this magazine.', 'warning'); }
    });
    actions.append(read);
    info.append(title, date, coverage);
    if (briefPanel) info.appendChild(briefPanel);
    info.appendChild(actions);
    card.append(cover, info);
    return card;
  }

  async function refreshCatalog() {
    if (!active || currentTab !== 'weekly' || !issueList) return;
    setStatus(weeklyStatus, 'Checking the published magazine library…');
    try {
      await ensureServices();
      const catalog = await window.LiveEarthAlienWorldPublisher.loadCatalog();
      if (!active || currentTab !== 'weekly') return;
      latestCatalog = catalog;
      issueList.replaceChildren();
      if (!catalog.issues.length) {
        setStatus(weeklyStatus, 'The first Space Journal has not been published yet. Open the Publisher to run a test edition.', 'empty');
      } else {
        for (const issue of catalog.issues) issueList.appendChild(buildIssueCard(issue));
        setStatus(weeklyStatus, `Latest publication: ${formatDate(catalog.generatedAt)}  ·  ${catalog.issues.length} saved editions`, 'success');
      }
    } catch (error) {
      issueList.replaceChildren();
      setStatus(weeklyStatus, navigator.onLine === false
        ? 'The magazine library requires a connection. PDFs opened and saved earlier remain available in the shared PDF Viewer.'
        : `${error.message || 'The magazine catalog is not available yet.'}`, 'warning');
    }
  }

  function setTab(tab) {
    currentTab = tab === 'weekly' ? 'weekly' : 'live';
    const liveButton = root.querySelector('[data-tab="live"]');
    const weeklyButton = root.querySelector('[data-tab="weekly"]');
    liveButton.setAttribute('aria-pressed', String(currentTab === 'live'));
    weeklyButton.setAttribute('aria-pressed', String(currentTab === 'weekly'));
    liveBody.hidden = currentTab !== 'live';
    weeklyBody.hidden = currentTab !== 'weekly';
    liveStatus.hidden = currentTab !== 'live';
    weeklyStatus.hidden = currentTab !== 'weekly';
    if (currentTab === 'live') refreshLiveFeed(); else refreshCatalog();
  }

  function buildRoot() {
    const style = create('style');
    style.id = 'le-alien-world-publisher-style';
    style.textContent = `
      #le-alien-world-view{position:fixed;inset:0;z-index:6;display:block;width:100%;height:100%;height:100dvh;overflow:hidden;isolation:isolate;color:#edf5ff;background:radial-gradient(ellipse at 50% 9%,rgba(45,75,111,.28),transparent 45%),radial-gradient(ellipse at 85% 54%,rgba(116,82,52,.12),transparent 42%),linear-gradient(180deg,#040811 0%,#07111d 52%,#02060d 100%);pointer-events:auto;}
      #le-alien-world-view[hidden]{display:none!important}
      #le-alien-world-view:before{content:"";position:absolute;inset:0;opacity:.28;pointer-events:none;background-image:radial-gradient(1px 1px at 12% 18%,#d8e8ff 98%,transparent),radial-gradient(1px 1px at 27% 72%,#b9c9ff 98%,transparent),radial-gradient(1px 1px at 44% 28%,#fff 98%,transparent),radial-gradient(1px 1px at 68% 16%,#c5d5ff 98%,transparent),radial-gradient(1px 1px at 83% 61%,#fff 98%,transparent),radial-gradient(1px 1px at 91% 34%,#c8d8ff 98%,transparent);}
      #le-alien-world-view .le-aw-scroll{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 22px) 17px calc(env(safe-area-inset-bottom) + 126px);scrollbar-width:none;}
      #le-alien-world-view .le-aw-scroll::-webkit-scrollbar{display:none}
      #le-alien-world-view .le-aw-masthead{max-width:900px;margin:0 auto 17px;text-align:center;}
      #le-alien-world-view .le-aw-eyebrow{font:700 9px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.34em;color:#d1b184;text-transform:uppercase;}
      #le-alien-world-view .le-aw-title{margin:8px 0 5px;font:760 clamp(25px,6.8vw,36px)/1.02 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.13em;color:#f2f4f7;text-shadow:0 4px 28px #5e8bb333;}
      #le-alien-world-view .le-aw-subtitle{margin:0;color:#96a9bb;font-size:11px;letter-spacing:.11em;text-transform:uppercase;}
      #le-alien-world-view .le-aw-tabs{display:flex;justify-content:center;gap:8px;max-width:510px;margin:18px auto 20px;padding:5px;border:1px solid #4350648a;border-radius:14px;background:#0c1725ba;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}
      #le-alien-world-view .le-aw-tab{flex:1;min-height:42px;border:1px solid transparent;border-radius:10px;background:transparent;color:#aebdca;font:700 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;}
      #le-alien-world-view .le-aw-tab[aria-pressed="true"]{border-color:#bd9c6d66;background:linear-gradient(135deg,#ab85552e,#ffffff08);color:#f0d3a6;box-shadow:inset 0 1px #ffffff1a,0 4px 22px #0006;}
      #le-alien-world-view .le-aw-content{width:min(100%,900px);margin:0 auto;}
      #le-alien-world-view .le-aw-content[hidden]{display:none!important}
      #le-alien-world-view .le-aw-section-head{display:flex;justify-content:space-between;align-items:end;gap:10px;margin:0 0 15px;padding:0 2px;}
      #le-alien-world-view .le-aw-section-title{margin:0;color:#e9edf3;font:680 19px/1.1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.02em;}
      #le-alien-world-view .le-aw-count{color:#bd9d70;font-size:8px;font-weight:750;letter-spacing:.16em;}
      #le-alien-world-view .le-aw-status{margin:0 0 14px;padding:11px 13px;border:1px solid #3a4b5e;border-radius:11px;background:#091421c7;color:#b9cad8;font-size:11px;line-height:1.5;}
      #le-alien-world-view .le-aw-status[data-state="success"]{border-color:#47766088;color:#b9d9ca;}
      #le-alien-world-view .le-aw-status[data-state="warning"]{border-color:#9c795388;color:#e2c79f;}
      #le-alien-world-view .le-aw-status[data-state="empty"]{border-color:#596577;color:#bdc7d1;}
      #le-alien-world-view .le-aw-story{overflow:hidden;margin:0 0 16px;border:1px solid #71849a3c;border-radius:16px;background:linear-gradient(145deg,#142131e8,#08111deF 72%);box-shadow:0 14px 35px #0005;}
      #le-alien-world-view .le-aw-story-media{margin:0;background:#09121d;}
      #le-alien-world-view .le-aw-story-media img{display:block;width:100%;max-height:clamp(190px,56vw,340px);object-fit:cover;}
      #le-alien-world-view .le-aw-image-credit{padding:6px 12px 0;color:#899dad;font-size:8px;line-height:1.4;}
      #le-alien-world-view .le-aw-image-rights{display:block;padding:3px 12px 9px;color:#74899a;font-size:7px;line-height:1.4;}
      #le-alien-world-view .le-aw-story-copy{padding:14px 15px 15px;}
      #le-alien-world-view .le-aw-story-meta{margin-bottom:8px;color:#c0a178;font-size:8px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;}
      #le-alien-world-view .le-aw-story-title{margin:0 0 9px;color:#f0f3f6;font:680 clamp(17px,4.7vw,22px)/1.17 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.02em;}
      #le-alien-world-view .le-aw-story-summary{margin:0;color:#bdcbd7;font-size:12px;line-height:1.62;}
      #le-alien-world-view .le-aw-story-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:13px;padding-top:10px;border-top:1px solid #8fa4b21c;}
      #le-alien-world-view .le-aw-story-source{color:#8fa1b2;font-size:9px;}
      #le-alien-world-view .le-aw-story-link{color:#d7b27d;text-decoration:none;font-size:10px;font-weight:700;white-space:nowrap;}
      #le-alien-world-view .le-aw-issue{overflow:hidden;margin:0 0 17px;border:1px solid #9d80534f;border-radius:16px;background:#0b1622e8;box-shadow:0 16px 34px #0006;}
      #le-alien-world-view .le-aw-issue-cover{min-height:170px;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;background:radial-gradient(ellipse at 75% 22%,#44627c78,transparent 42%),radial-gradient(ellipse at 21% 70%,#8c674957,transparent 38%),linear-gradient(135deg,#101e30,#050a13 82%);}
      #le-alien-world-view .le-aw-issue-kicker{color:#d6b27e;font-size:8px;font-weight:800;letter-spacing:.22em;}
      #le-alien-world-view .le-aw-issue-cover-title{max-width:470px;margin-top:12px;color:#f4f2ee;font:760 clamp(25px,7vw,38px)/.98 Georgia,serif;letter-spacing:-.035em;}
      #le-alien-world-view .le-aw-issue-cover-meta{margin-top:13px;color:#9eabb8;font-size:8px;letter-spacing:.2em;}
      #le-alien-world-view .le-aw-issue-info{padding:15px;}
      #le-alien-world-view .le-aw-issue-title{margin:0 0 7px;color:#edf2f6;font-size:16px;}
      #le-alien-world-view .le-aw-issue-brief{margin:10px 0 0;padding:10px 11px;border:1px solid #9b835333;border-radius:10px;background:#070f19;color:#b7c4cf;font-size:9px;line-height:1.5;}
      #le-alien-world-view .le-aw-issue-brief strong{display:block;margin-bottom:5px;color:#d8b681;font-size:8px;letter-spacing:.13em;}
      #le-alien-world-view .le-aw-issue-applied{margin:0;color:#bacdc4;}
      #le-alien-world-view .le-aw-issue-unmapped{margin:6px 0 0;color:#dfba8b;}
      #le-alien-world-view .le-aw-issue-limitation{margin:6px 0 0;color:#8496a6;font-size:8px;}
      #le-alien-world-view .le-aw-issue-date,#le-alien-world-view .le-aw-issue-coverage{margin:0 0 5px;color:#aab9c7;font-size:10px;line-height:1.5;}
      #le-alien-world-view .le-aw-issue-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
      #le-alien-world-view .le-aw-button{display:inline-flex;min-height:39px;align-items:center;justify-content:center;padding:9px 13px;border:1px solid #71869a70;border-radius:10px;text-decoration:none;font:700 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.06em;}
      #le-alien-world-view .le-aw-button-primary{background:linear-gradient(135deg,#ad86565a,#ffffff08);border-color:#d3b17d88;color:#f1d8b0;}
      #le-alien-world-view .le-aw-button-secondary{background:#17283a;color:#c4d1dc;}
      #le-alien-world-view .le-aw-publisher-panel{margin:18px 0 0;padding:15px;border:1px solid #7b8fa344;border-radius:14px;background:linear-gradient(145deg,#142231b8,#07111cdb);}
      #le-alien-world-view .le-aw-publisher-title{margin:0 0 7px;color:#e7edf2;font-size:14px;}
      #le-alien-world-view .le-aw-publisher-copy{margin:0 0 12px;color:#aabac8;font-size:10px;line-height:1.55;}
      #le-alien-world-view .le-aw-request{display:block;width:100%;min-height:112px;resize:vertical;border:1px solid #536678;border-radius:10px;background:#050c15;color:#dbe5ed;padding:10px;font:11px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      #le-alien-world-view .le-aw-publisher-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
      #le-alien-world-view .le-aw-footnote{margin:12px 0 0;color:#7e91a1;font-size:9px;line-height:1.5;}
      #le-alien-world-view .le-aw-bottom-fade{position:fixed;left:0;right:0;bottom:0;height:calc(env(safe-area-inset-bottom) + 112px);z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 0%,#03081145 38%,#030811d9 100%);}
      #le-alien-world-view .le-aw-scroll{z-index:0;}
      #le-alien-world-view .le-aw-bottom-fade{z-index:1;}
      #le-alien-world-view .le-aw-scroll{padding-bottom:calc(env(safe-area-inset-bottom) + 145px);}
      @media(min-width:700px){#le-alien-world-view .le-aw-story{display:grid;grid-template-columns:minmax(250px,42%) 1fr;}#le-alien-world-view .le-aw-story-media img{height:100%;max-height:none;min-height:220px;}#le-alien-world-view .le-aw-story-copy{align-self:center;padding:24px;}#le-alien-world-view .le-aw-issue{display:grid;grid-template-columns: minmax(250px,42%) 1fr;}#le-alien-world-view .le-aw-issue-cover{min-height:245px;}}
      @media(orientation:landscape){#le-alien-world-view .le-aw-scroll{padding-left:max(24px,env(safe-area-inset-left));padding-right:max(24px,env(safe-area-inset-right));}#le-alien-world-view .le-aw-title{font-size:27px;}#le-alien-world-view .le-aw-tabs{margin-top:12px;margin-bottom:15px;}}
      @media(prefers-reduced-motion:reduce){#le-alien-world-view *{scroll-behavior:auto!important;transition:none!important;animation:none!important;}}
    `;
    document.head.appendChild(style);
    root = create('section'); root.id = 'le-alien-world-view'; root.hidden = true;
    root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Alien World Main Page'); root.setAttribute('aria-hidden', 'true');
    const scroll = create('div', 'le-aw-scroll');
    const masthead = create('header', 'le-aw-masthead');
    const eyebrow = create('div', 'le-aw-eyebrow', 'A LIVE // EARTH VIEW');
    const title = create('h1', 'le-aw-title', 'ALIEN WORLD');
    const subtitle = create('p', 'le-aw-subtitle', 'Space science · Missions · Discoveries');
    masthead.append(eyebrow, title, subtitle);
    const tabs = create('nav', 'le-aw-tabs'); tabs.setAttribute('aria-label', 'Alien World publications');
    const liveTab = create('button', 'le-aw-tab', 'Live Feeds'); liveTab.type = 'button'; liveTab.dataset.tab = 'live'; liveTab.setAttribute('aria-pressed', 'true');
    const weeklyTab = create('button', 'le-aw-tab', 'Weekly Publish'); weeklyTab.type = 'button'; weeklyTab.dataset.tab = 'weekly'; weeklyTab.setAttribute('aria-pressed', 'false');
    tabs.append(liveTab, weeklyTab);
    const content = create('div', 'le-aw-content');
    liveBody = create('div', 'le-aw-live-list');
    const liveHead = create('div', 'le-aw-section-head');
    const liveTitle = create('h2', 'le-aw-section-title', 'Live Feeds');
    liveCount = create('span', 'le-aw-count', 'LIVE FEEDS'); liveHead.append(liveTitle, liveCount);
    liveStatus = create('p', 'le-aw-status', 'Connect to load the latest reports.'); liveStatus.hidden = false;
    liveBody.prepend(liveHead, liveStatus);
    weeklyBody = create('div', 'le-aw-weekly'); weeklyBody.hidden = true;
    const weeklyHead = create('div', 'le-aw-section-head');
    const weeklyTitle = create('h2', 'le-aw-section-title', 'Weekly Publish');
    const weeklyCount = create('span', 'le-aw-count', 'LAST 48 HOURS'); weeklyHead.append(weeklyTitle, weeklyCount);
    weeklyStatus = create('p', 'le-aw-status', 'The magazine library will appear here after the first publication.'); weeklyBody.append(weeklyHead, weeklyStatus);
    issueList = create('div', 'le-aw-issue-list'); weeklyBody.appendChild(issueList);
    const panel = create('section', 'le-aw-publisher-panel');
    const pTitle = create('h3', 'le-aw-publisher-title', 'Editorial request');
    const pCopy = create('p', 'le-aw-publisher-copy', 'Adjust the creative brief, then copy it into the Publisher run. The Publisher sends it to the shared Universal Editorial Engine.');
    requestBox = create('textarea', 'le-aw-request'); requestBox.value = DEFAULT_REQUEST; requestBox.maxLength = 1200; requestBox.setAttribute('aria-label', 'Custom editorial request');
    const panelActions = create('div', 'le-aw-publisher-actions');
    const copy = create('button', 'le-aw-button le-aw-button-secondary', 'Copy custom request'); copy.type = 'button';
    const openPublisher = create('a', 'le-aw-button le-aw-button-primary', 'Open Publisher'); openPublisher.href = ACTIONS_URL; openPublisher.target = '_blank'; openPublisher.rel = 'noopener noreferrer';
    panelActions.append(copy, openPublisher);
    const note = create('p', 'le-aw-footnote', 'The app does not store a GitHub token. Open Publisher securely in GitHub Actions, choose “magazine”, paste your request and run the test edition. The scheduled edition covers the previous 48 hours.');
    panel.append(pTitle, pCopy, requestBox, panelActions, note);
    weeklyBody.appendChild(panel);
    content.append(liveBody, weeklyBody);
    scroll.append(masthead, tabs, content);
    const fade = create('div', 'le-aw-bottom-fade'); fade.setAttribute('aria-hidden', 'true');
    root.append(scroll, fade);
    document.body.appendChild(root);

    liveTab.addEventListener('click', () => setTab('live'));
    weeklyTab.addEventListener('click', () => setTab('weekly'));
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(requestBox.value);
        setStatus(weeklyStatus, 'Custom editorial request copied. Paste it into the Publisher workflow input.', 'success');
      } catch (_) {
        requestBox.focus(); requestBox.select();
        setStatus(weeklyStatus, 'Select and copy the request text, then paste it into the Publisher workflow input.', 'info');
      }
    });
  }

  function activate() {
    const genericStage = document.getElementById('le-feature-stage');
    if (genericStage) genericStage.hidden = true;
    if (!root) buildRoot();
    active = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', { detail: { active: true } }));
    ensureServices().then(() => {
      if (!active) return;
      if (currentTab === 'live') refreshLiveFeed(); else refreshCatalog();
      window.clearInterval(refreshTimer);
      refreshTimer = window.setInterval(() => { if (active && currentTab === 'live') refreshLiveFeed(); }, 5 * 60 * 1000);
    }).catch(error => {
      if (currentTab === 'live') setStatus(liveStatus, `${error.message} Connect to load the online publication services.`, 'warning');
      else setStatus(weeklyStatus, `${error.message} Connect to load the online publication services.`, 'warning');
    });
  }

  function deactivate() {
    active = false;
    window.clearInterval(refreshTimer); refreshTimer = 0;
    if (window.LiveEarthUniversalPDFViewer?.isOpen?.()) window.LiveEarthUniversalPDFViewer.close();
    if (root) { root.hidden = true; root.setAttribute('aria-hidden', 'true'); }
    document.body.classList.remove('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', { detail: { active: false } }));
  }

  function install() {
    if (window.__liveEarthAlienWorldViewInstalled) return;
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return;
    api.register('alien-world', {
      title: 'Alien World',
      shortLabel: 'Alien World',
      symbol: '🛸',
      description: 'Alien World Main Page — live space feeds and the Space Journal.',
      connected: true,
      activate,
      deactivate
    });
    window.__liveEarthAlienWorldViewInstalled = true;
    window.__liveEarthAlienWorldViewWaiting = false;
    window.LiveEarthAlienWorldView = Object.freeze({
      open: () => api.open('alien-world', 'api'),
      close: () => api.close('api'),
      isOpen: () => api.isActive('alien-world')
    });
  }

  if (window.LiveEarthFeatureViews?.register) install();
  else window.addEventListener('live-earth-feature-views-ready', install, { once: true });
})();
