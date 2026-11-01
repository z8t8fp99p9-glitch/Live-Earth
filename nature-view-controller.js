/* LIVE // EARTH — Nature Stacks View.
   This consumer reads only completed Nature publication outputs. It owns no
   source collection, database writes, PDF generation or separate PDF reader. */
(() => {
  'use strict';
  if (window.__liveEarthNatureViewInstalled || window.__liveEarthNatureViewWaiting) return;
  window.__liveEarthNatureViewWaiting = true;

  let root = null;
  let active = false;
  let servicesPromise = null;
  let currentTab = 'discover';
  let feedData = null;
  let catalogData = null;
  let statusNode = null;
  let storyList = null;
  let issueArea = null;
  let savedArea = null;

  function loadScript(src) {
    const absolute = new URL(src, document.baseURI).href;
    return new Promise((resolve, reject) => {
      if (src.includes('universal-editorial-engine.js') && window.LiveEarthUniversalEditorialEngine) return resolve();
      if (src.includes('universal-pdf-viewer.js') && window.LiveEarthUniversalPDFViewer) return resolve();
      if (src.includes('nature-publisher-client.js') && window.LiveEarthNaturePublisher) return resolve();
      const existing = [...document.scripts].find(script => script.src === absolute);
      if (existing && existing.dataset.leLoaded === '1') return resolve();
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
      else if (script.readyState === 'complete') done();
      timer = window.setTimeout(fail, 15000);
    });
  }

  function ensureServices() {
    if (window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer && window.LiveEarthNaturePublisher) return Promise.resolve();
    if (servicesPromise) return servicesPromise;
    servicesPromise = loadScript('./editorial-engine/universal-editorial-engine.js')
      .then(() => loadScript('./universal-pdf-viewer.js'))
      .then(() => loadScript('./nature-publisher-client.js'))
      .then(() => {
        if (!window.LiveEarthUniversalEditorialEngine || !window.LiveEarthUniversalPDFViewer || !window.LiveEarthNaturePublisher) {
          throw new Error('A shared Nature publication service did not register correctly.');
        }
      }).catch(error => { servicesPromise = null; throw error; });
    return servicesPromise;
  }

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = value;
    return node;
  }
  function status(message, kind = 'info') {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = kind;
    statusNode.hidden = !message;
  }
  function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Date not supplied';
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
  function formatRange(start, end) {
    const a = new Date(start), b = new Date(new Date(end).getTime() - 1);
    if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) return 'Monthly archive';
    const month = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(a);
    return `${month} · ${formatDate(a)} — ${formatDate(b)}`;
  }
  function categoryFor(story) {
    const haystack = `${story.title || ''} ${story.sourceName || ''}`.toLowerCase();
    if (/ocean|sea|marine|coral|canyon/.test(haystack)) return ['OCEANS', '◌'];
    if (/bird|tiger|bear|species|wildlife|animal/.test(haystack)) return ['WILDLIFE', '⌁'];
    if (/lily|plant|forest|tree|botanical/.test(haystack)) return ['PLANT LIFE', '❧'];
    if (/desert|landscape|ecosystem|conservation|habitat/.test(haystack)) return ['ECOSYSTEMS', '✳'];
    return ['FIELD REPORT', '✦'];
  }
  function makeStoryCard(story, index) {
    const [category, symbol] = categoryFor(story);
    const card = create('article', 'le-nature-story');
    card.dataset.storyId = story.id;
    const visual = create('div', `le-nature-story-visual le-nature-story-visual-${index % 4}`);
    visual.appendChild(create('span', 'le-nature-story-symbol', symbol));
    visual.appendChild(create('span', 'le-nature-story-index', String(index + 1).padStart(2, '0')));
    const body = create('div', 'le-nature-story-body');
    body.appendChild(create('div', 'le-nature-story-meta', `${category}  ·  ${story.sourceName || 'SOURCE REPORT'}  ·  ${formatDate(story.publishedAt)}`));
    body.appendChild(create('h2', 'le-nature-story-title', story.title));
    body.appendChild(create('p', 'le-nature-story-summary', story.summary || 'Open the original report for more detail.'));
    const footer = create('div', 'le-nature-story-footer');
    footer.appendChild(create('span', 'le-nature-story-source', story.sourceName || 'Original source'));
    const link = create('a', 'le-nature-link', 'Read original ↗');
    link.href = story.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    footer.appendChild(link);
    body.appendChild(footer);
    card.append(visual, body);
    return card;
  }

  function renderFeed(feed) {
    if (!storyList) return;
    storyList.replaceChildren();
    const stories = Array.isArray(feed?.stories) ? feed.stories : [];
    for (let i = 0; i < stories.length; i++) storyList.appendChild(makeStoryCard(stories[i], i));
    const count = root?.querySelector('[data-nature-count]');
    if (count) count.textContent = `${stories.length} REPORTS`;
    if (!stories.length) status('No Nature reports are available in the current published feed.', 'empty');
    else status(`${stories.length} source-linked reports · monthly archive window`, 'success');
  }

  function renderSaved(items) {
    if (!savedArea) return;
    savedArea.replaceChildren();
    const panel = create('section', 'le-nature-saved-panel');
    panel.appendChild(create('h3', 'le-nature-panel-title', 'Saved for offline reading'));
    panel.appendChild(create('p', 'le-nature-panel-copy', 'Magazines saved through the Global PDF Reader remain available on this device. Live Nature reports are not stored offline.'));
    if (!items.length) panel.appendChild(create('p', 'le-nature-muted', 'No saved Nature magazines on this device yet.'));
    for (const item of items) {
      const row = create('div', 'le-nature-saved-row');
      const info = create('div', 'le-nature-saved-info');
      info.appendChild(create('strong', 'le-nature-saved-title', item.title || 'The Living World'));
      info.appendChild(create('span', 'le-nature-saved-meta', `${Number(item.pages) || 'PDF'} pages · ${formatDate(item.savedAt)}`));
      const open = create('button', 'le-nature-button le-nature-button-small', 'Open');
      open.type = 'button';
      open.addEventListener('click', async () => {
        try { await window.LiveEarthNaturePublisher.openSaved(item); }
        catch (error) { status(error?.message || 'Could not open the saved magazine.', 'warning'); }
      });
      row.append(info, open); panel.appendChild(row);
    }
    savedArea.appendChild(panel);
  }

  function renderIssue(catalog) {
    if (!issueArea) return;
    issueArea.replaceChildren();
    const issue = catalog?.issues?.[0];
    if (!issue) {
      issueArea.appendChild(create('p', 'le-nature-status', 'The monthly catalogue does not contain a completed issue yet.'));
      return;
    }
    const card = create('article', 'le-nature-issue');
    const cover = create('div', 'le-nature-issue-cover');
    cover.style.backgroundImage = 'linear-gradient(180deg,rgba(7,23,17,.04),rgba(7,23,17,.82)),url("./assets/nature/nature-cover-art.svg")';
    cover.appendChild(create('span', 'le-nature-issue-kicker', 'THE MONTHLY FIELD JOURNAL'));
    cover.appendChild(create('strong', 'le-nature-issue-cover-title', issue.title || 'The Living World'));
    cover.appendChild(create('span', 'le-nature-issue-cover-meta', formatRange(issue.coverageStart, issue.coverageEnd).toUpperCase()));
    const info = create('div', 'le-nature-issue-info');
    info.appendChild(create('div', 'le-nature-issue-label', 'LATEST MONTHLY EDITION'));
    info.appendChild(create('h2', 'le-nature-issue-heading', issue.title || 'The Living World'));
    info.appendChild(create('p', 'le-nature-issue-description', `${issue.storyCount || 0} selected reports · ${issue.pages || 0} pages · ${formatRange(issue.coverageStart, issue.coverageEnd)}.`));
    info.appendChild(create('p', 'le-nature-issue-note', 'This edition covers one complete calendar month. Stories are attributed to their original publishers; the magazine is an editorial reading layout, not a replacement for the original reporting.'));
    const actions = create('div', 'le-nature-actions');
    const open = create('button', 'le-nature-button le-nature-button-primary', 'Read monthly magazine');
    open.type = 'button';
    open.addEventListener('click', async () => {
      try { status('Opening the monthly edition…'); await window.LiveEarthNaturePublisher.openMagazine(issue); status('The monthly edition is open in the Global PDF Reader.', 'success'); }
      catch (error) { status(error?.message || 'Could not open the monthly magazine.', 'warning'); }
    });
    const refresh = create('button', 'le-nature-button le-nature-button-secondary', 'Refresh catalogue');
    refresh.type = 'button';
    refresh.addEventListener('click', refreshAll);
    actions.append(open, refresh); info.appendChild(actions);
    card.append(cover, info); issueArea.appendChild(card);
  }

  async function refreshAll() {
    if (!active) return;
    status('Loading the latest published Nature reports…');
    try {
      await ensureServices();
      if (!active) return;
      const [feed, catalog] = await Promise.all([
        window.LiveEarthNaturePublisher.loadFeed(),
        window.LiveEarthNaturePublisher.loadCatalog()
      ]);
      if (!active) return;
      feedData = feed; catalogData = catalog;
      renderFeed(feed);
      renderIssue(catalog);
      const saved = await window.LiveEarthNaturePublisher.listSavedMagazines().catch(() => []);
      if (active) renderSaved(saved);
    } catch (error) {
      if (!active) return;
      if (navigator.onLine === false) {
        if (storyList) storyList.replaceChildren();
        status('You are offline. Live Nature reports have been cleared; previously saved magazines remain available below.', 'warning');
      } else {
        status(`${error?.message || 'Nature publications could not be loaded.'} Reconnect and refresh to try again.`, 'warning');
      }
      try {
        await ensureServices();
        const saved = await window.LiveEarthNaturePublisher.listSavedMagazines();
        if (active) renderSaved(saved);
      } catch (_) { /* No local reader is available in this session. */ }
    }
  }

  function setTab(tab) {
    currentTab = tab === 'monthly' ? 'monthly' : 'discover';
    const discover = root?.querySelector('[data-tab="discover"]');
    const monthly = root?.querySelector('[data-tab="monthly"]');
    if (discover) discover.setAttribute('aria-pressed', String(currentTab === 'discover'));
    if (monthly) monthly.setAttribute('aria-pressed', String(currentTab === 'monthly'));
    const discoverBody = root?.querySelector('.le-nature-discover');
    const monthlyBody = root?.querySelector('.le-nature-monthly');
    if (discoverBody) discoverBody.hidden = currentTab !== 'discover';
    if (monthlyBody) monthlyBody.hidden = currentTab !== 'monthly';
    if (currentTab === 'monthly' && catalogData) renderIssue(catalogData);
  }

  function buildRoot() {
    if (root) return;
    const style = create('style');
    style.id = 'le-nature-view-style';
    style.textContent = `
      #le-nature-view{position:fixed;inset:0;z-index:6;display:block;width:100%;height:100%;height:100dvh;overflow:hidden;isolation:isolate;color:#edf2e7;background:radial-gradient(ellipse at 50% 2%,#688b5c38,transparent 44%),linear-gradient(180deg,#0b1d16 0%,#142c20 52%,#0a1712 100%);pointer-events:auto}
      #le-nature-view[hidden]{display:none!important}
      #le-nature-view:before{content:"";position:absolute;inset:0;opacity:.14;pointer-events:none;background-image:radial-gradient(1px 1px at 13% 20%,#e8ddb5 98%,transparent),radial-gradient(1px 1px at 27% 71%,#e8ddb5 98%,transparent),radial-gradient(1px 1px at 64% 31%,#e8ddb5 98%,transparent),radial-gradient(1px 1px at 83% 67%,#e8ddb5 98%,transparent)}
      #le-nature-view .le-nature-scroll{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 20px) 16px calc(env(safe-area-inset-bottom) + 132px);scrollbar-width:none}
      #le-nature-view .le-nature-scroll::-webkit-scrollbar{display:none}
      #le-nature-view .le-nature-masthead{width:min(100%,920px);margin:0 auto 16px;text-align:center}
      #le-nature-view .le-nature-eyebrow{font-size:8px;font-weight:800;letter-spacing:.32em;color:#c9bd8b;text-transform:uppercase}
      #le-nature-view .le-nature-title{margin:8px 0 4px;color:#f2ead8;font:760 clamp(28px,7vw,40px)/1 Georgia,serif;letter-spacing:.12em;text-shadow:0 4px 26px #0008}
      #le-nature-view .le-nature-subtitle{margin:0;color:#b8c5a8;font-size:10px;letter-spacing:.11em;text-transform:uppercase}
      #le-nature-view .le-nature-tabs{display:flex;gap:7px;width:min(100%,520px);margin:18px auto 20px;padding:5px;border:1px solid #c6d2a52b;border-radius:15px;background:#0a1b13bb;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
      #le-nature-view .le-nature-tab{flex:1;min-height:42px;border:1px solid transparent;border-radius:10px;background:transparent;color:#b9c7b3;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      #le-nature-view .le-nature-tab[aria-pressed="true"]{border-color:#d0c18b66;background:linear-gradient(135deg,#c2b17826,#ffffff08);color:#f1e5c5;box-shadow:inset 0 1px #fff2,0 4px 20px #0005}
      #le-nature-view .le-nature-content{width:min(100%,920px);margin:0 auto}
      #le-nature-view .le-nature-content[hidden]{display:none!important}
      #le-nature-view .le-nature-section-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin:0 0 14px;padding:0 2px}
      #le-nature-view .le-nature-section-title{margin:0;color:#f0eadb;font:650 19px/1.1 Georgia,serif}
      #le-nature-view .le-nature-count{color:#c8bd8b;font-size:8px;font-weight:800;letter-spacing:.15em}
      #le-nature-view .le-nature-status{margin:0 0 13px;padding:11px 13px;border:1px solid #c6d2a52b;border-radius:12px;background:#0a1b13b9;color:#c8d3c1;font-size:10px;line-height:1.5}
      #le-nature-view .le-nature-status[data-state="success"]{border-color:#98bd8a55;color:#d6e8ce}
      #le-nature-view .le-nature-status[data-state="warning"]{border-color:#c9a66b77;color:#ead6ac}
      #le-nature-view .le-nature-status[data-state="empty"]{color:#c8d3c1}
      #le-nature-view .le-nature-story{overflow:hidden;margin:0 0 14px;border:1px solid #b5c89a26;border-radius:17px;background:linear-gradient(145deg,#263c2ee8,#102219ed 75%);box-shadow:0 14px 30px #0004}
      #le-nature-view .le-nature-story-visual{position:relative;display:flex;align-items:flex-end;justify-content:space-between;min-height:94px;padding:14px 17px;background:radial-gradient(ellipse at 73% 24%,#e2d6a45c,transparent 32%),linear-gradient(135deg,#536f50,#182f24)}
      #le-nature-view .le-nature-story-visual-1{background:radial-gradient(ellipse at 25% 22%,#c6d4a444,transparent 35%),linear-gradient(135deg,#496b64,#16362e)}
      #le-nature-view .le-nature-story-visual-2{background:radial-gradient(ellipse at 72% 22%,#e7c27b55,transparent 30%),linear-gradient(135deg,#68784f,#243b29)}
      #le-nature-view .le-nature-story-visual-3{background:radial-gradient(ellipse at 72% 16%,#a5c7c455,transparent 35%),linear-gradient(135deg,#335f5d,#132d2c)}
      #le-nature-view .le-nature-story-symbol{font:42px/1 Georgia,serif;color:#efe5c8b9;text-shadow:0 4px 15px #0005}
      #le-nature-view .le-nature-story-index{color:#f0e8cfb8;font:italic 14px Georgia,serif;letter-spacing:.12em}
      #le-nature-view .le-nature-story-body{padding:13px 15px 14px}
      #le-nature-view .le-nature-story-meta{margin:0 0 7px;color:#d2c48c;font-size:7px;font-weight:800;letter-spacing:.12em;line-height:1.5}
      #le-nature-view .le-nature-story-title{margin:0 0 8px;color:#f2eedf;font:680 clamp(17px,4.8vw,22px)/1.18 Georgia,serif;letter-spacing:-.015em}
      #le-nature-view .le-nature-story-summary{margin:0;color:#c6d0c2;font-size:11px;line-height:1.6;white-space:pre-line}
      #le-nature-view .le-nature-story-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;padding-top:9px;border-top:1px solid #d4dfc51a}
      #le-nature-view .le-nature-story-source{color:#9eae9c;font-size:8px}
      #le-nature-view .le-nature-link{color:#e1d29e;text-decoration:none;font-size:9px;font-weight:750;white-space:nowrap}
      #le-nature-view .le-nature-issue{overflow:hidden;border:1px solid #cabb8c55;border-radius:19px;background:linear-gradient(140deg,#253d2d,#0d1d15);box-shadow:0 18px 40px #0006}
      #le-nature-view .le-nature-issue-cover{min-height:245px;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;background-position:center;background-size:cover}
      #le-nature-view .le-nature-issue-kicker{color:#e5d6a8;font-size:8px;font-weight:800;letter-spacing:.22em}
      #le-nature-view .le-nature-issue-cover-title{max-width:500px;margin-top:10px;color:#f5f0df;font:750 clamp(28px,8vw,42px)/.98 Georgia,serif;text-shadow:0 3px 20px #0008}
      #le-nature-view .le-nature-issue-cover-meta{margin-top:12px;color:#e0d7bb;font-size:8px;font-weight:750;letter-spacing:.14em}
      #le-nature-view .le-nature-issue-info{padding:17px}
      #le-nature-view .le-nature-issue-label{color:#d5c38c;font-size:8px;font-weight:800;letter-spacing:.18em}
      #le-nature-view .le-nature-issue-heading{margin:7px 0;color:#f3ecd9;font:700 20px Georgia,serif}
      #le-nature-view .le-nature-issue-description,#le-nature-view .le-nature-issue-note{margin:7px 0;color:#c4d0bf;font-size:10px;line-height:1.55}
      #le-nature-view .le-nature-issue-note{color:#9eaf9b}
      #le-nature-view .le-nature-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
      #le-nature-view .le-nature-button{appearance:none;display:inline-flex;min-height:40px;align-items:center;justify-content:center;padding:9px 14px;border:1px solid #b9c99a55;border-radius:11px;background:#22382a;color:#e8ecd9;font:750 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.07em;touch-action:manipulation}
      #le-nature-view .le-nature-button-primary{border-color:#d5c18b99;background:linear-gradient(135deg,#a58b4d8a,#62774999);color:#fff4d8}
      #le-nature-view .le-nature-button-secondary{background:#14291f;color:#cbd5c3}
      #le-nature-view .le-nature-button-small{min-height:34px;padding:7px 11px}
      #le-nature-view .le-nature-saved-panel{margin:17px 0 0;padding:14px;border:1px solid #b5c89a30;border-radius:15px;background:#0b1b13c9}
      #le-nature-view .le-nature-panel-title{margin:0 0 5px;color:#edf0dc;font-size:13px}
      #le-nature-view .le-nature-panel-copy,#le-nature-view .le-nature-muted{margin:0 0 10px;color:#9eaf9c;font-size:9px;line-height:1.5}
      #le-nature-view .le-nature-saved-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #d0dcc21b}
      #le-nature-view .le-nature-saved-info{display:flex;flex-direction:column;gap:4px;min-width:0}
      #le-nature-view .le-nature-saved-title{color:#ecebdc;font-size:10px}
      #le-nature-view .le-nature-saved-meta{color:#97a895;font-size:8px}
      #le-nature-view .le-nature-bottom-fade{position:fixed;left:0;right:0;bottom:0;height:calc(env(safe-area-inset-bottom) + 100px);z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent,#0b1913cc)}
      @media(min-width:760px){#le-nature-view .le-nature-story{display:grid;grid-template-columns:minmax(180px,32%) 1fr}#le-nature-view .le-nature-story-visual{height:100%;min-height:220px}#le-nature-view .le-nature-issue{display:grid;grid-template-columns:minmax(240px,44%) 1fr}#le-nature-view .le-nature-issue-cover{min-height:380px}}
      @media(orientation:landscape){#le-nature-view .le-nature-scroll{padding-left:max(22px,env(safe-area-inset-left));padding-right:max(22px,env(safe-area-inset-right))}#le-nature-view .le-nature-title{font-size:27px}}
      @media(prefers-reduced-motion:reduce){#le-nature-view *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);

    root = create('section'); root.id = 'le-nature-view'; root.hidden = true;
    root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Nature view'); root.setAttribute('aria-hidden', 'true');
    const scroll = create('div', 'le-nature-scroll');
    const masthead = create('header', 'le-nature-masthead');
    masthead.append(
      create('div', 'le-nature-eyebrow', 'A LIVE // EARTH VIEW'),
      create('h1', 'le-nature-title', 'NATURE'),
      create('p', 'le-nature-subtitle', 'Wildlife · Ecology · Oceans · Conservation')
    );
    const tabs = create('nav', 'le-nature-tabs'); tabs.setAttribute('aria-label', 'Nature publications');
    const discoverTab = create('button', 'le-nature-tab', 'Field Reports'); discoverTab.type = 'button'; discoverTab.dataset.tab = 'discover'; discoverTab.setAttribute('aria-pressed', 'true');
    const monthlyTab = create('button', 'le-nature-tab', 'Monthly Journal'); monthlyTab.type = 'button'; monthlyTab.dataset.tab = 'monthly'; monthlyTab.setAttribute('aria-pressed', 'false');
    tabs.append(discoverTab, monthlyTab);

    const discoverBody = create('div', 'le-nature-content le-nature-discover');
    const feedHead = create('div', 'le-nature-section-head');
    feedHead.append(create('h2', 'le-nature-section-title', 'From the living world'), create('span', 'le-nature-count', 'MONTHLY ARCHIVE'));
    feedHead.lastChild.dataset.natureCount = 'true';
    statusNode = create('p', 'le-nature-status', 'Connect to load the latest published Nature reports.');
    storyList = create('div', 'le-nature-story-list');
    discoverBody.append(feedHead, statusNode, storyList);

    const monthlyBody = create('div', 'le-nature-content le-nature-monthly'); monthlyBody.hidden = true;
    const monthlyHead = create('div', 'le-nature-section-head');
    monthlyHead.append(create('h2', 'le-nature-section-title', 'The Living World'), create('span', 'le-nature-count', 'ONE MONTH · ONE EDITION'));
    issueArea = create('div', 'le-nature-issue-area');
    savedArea = create('div', 'le-nature-saved-area');
    monthlyBody.append(monthlyHead, issueArea, savedArea);

    scroll.append(masthead, tabs, discoverBody, monthlyBody);
    const fade = create('div', 'le-nature-bottom-fade'); fade.setAttribute('aria-hidden', 'true');
    root.append(scroll, fade);
    document.body.appendChild(root);
    discoverTab.addEventListener('click', () => setTab('discover'));
    monthlyTab.addEventListener('click', () => setTab('monthly'));
  }

  function activate() {
    if (active) return;
    const genericStage = document.getElementById('le-feature-stage');
    if (genericStage) genericStage.hidden = true;
    buildRoot();
    active = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('le-nature-view-open');
    window.dispatchEvent(new CustomEvent('live-earth-nature-view-change', { detail: { active: true } }));
    refreshAll();
  }
  function deactivate() {
    active = false;
    if (window.LiveEarthUniversalPDFViewer?.isOpen?.()) window.LiveEarthUniversalPDFViewer.close();
    if (root) { root.hidden = true; root.setAttribute('aria-hidden', 'true'); }
    document.body.classList.remove('le-nature-view-open');
    window.dispatchEvent(new CustomEvent('live-earth-nature-view-change', { detail: { active: false } }));
  }
  function install() {
    if (window.__liveEarthNatureViewInstalled) return;
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return;
    api.register('nature', {
      title: 'Nature',
      shortLabel: 'Nature',
      symbol: '🌿',
      description: 'A living-world journal for wildlife, ecology, oceans and conservation.',
      connected: true,
      activate,
      deactivate
    });
    window.__liveEarthNatureViewInstalled = true;
    window.__liveEarthNatureViewWaiting = false;
    window.LiveEarthNatureView = Object.freeze({
      open: () => api.open('nature', 'api'),
      close: () => api.close('api'),
      isOpen: () => api.isActive('nature'),
      refresh: refreshAll
    });
  }

  window.addEventListener('offline', () => {
    if (!active) return;
    if (storyList) storyList.replaceChildren();
    status('You are offline. Live Nature reports have been cleared; previously saved magazines remain available in the Monthly Journal.', 'warning');
    ensureServices().then(() => window.LiveEarthNaturePublisher.listSavedMagazines()).then(renderSaved).catch(() => {});
  });
  window.addEventListener('live-earth-pdf-viewer-close', () => {
    if (!active || currentTab !== 'monthly') return;
    window.LiveEarthNaturePublisher?.listSavedMagazines?.().then(renderSaved).catch(() => {});
  });

  if (window.LiveEarthFeatureViews?.register) install();
  else window.addEventListener('live-earth-feature-views-ready', install, { once: true });
})();
