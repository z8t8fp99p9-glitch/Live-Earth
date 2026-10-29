/* LIVE // EARTH V106 — optional Weekly Publish reader and local issue store.
   Issue payloads are NEVER part of the app shell or service-worker caches.
   This small controller is loaded from the verified shell only when the user
   opens Weekly Publish. Issue metadata/text is fetched on-demand and saved to
   IndexedDB; at most three complete editions are retained. */
(() => {
  'use strict';
  if (window.LiveEarthWeeklyPublish?.version === 'v106') return;

  const DB_NAME = 'liveEarthWeeklyPublish';
  const DB_VERSION = 1;
  const STORE = 'issues';
  const MAX_ISSUES = 3;
  const MAX_STORIES = 8;
  const MANIFEST_URL = new URL('./alien-world-weekly-manifest.json', document.baseURI);
  const REQUEST_TIMEOUT_MS = 12000;
  const MAX_MANIFEST_BYTES = 16 * 1024;
  const MAX_ISSUE_BYTES = 64 * 1024;
  const STYLE_ID = 'le-aw-weekly-publish-v106-style';
  let dbPromise = null;
  let publishPromise = null;
  let selectedIssueId = null;
  let persistRequested = false;

  const CSS = `
    #le-aw-discovery-root .aw-weekly-root{display:grid;gap:15px;padding-bottom:10px}
    #le-aw-discovery-root .aw-weekly-hero{position:relative;overflow:hidden;border:1px solid rgba(189,139,93,.32);border-radius:22px;padding:21px 17px;background:radial-gradient(ellipse at 90% 0%,rgba(178,112,62,.19),transparent 55%),linear-gradient(145deg,rgba(26,29,35,.94),rgba(8,13,21,.96));box-shadow:inset 0 1px rgba(255,255,255,.07),0 15px 36px rgba(0,0,0,.18)}
    #le-aw-discovery-root .aw-weekly-kicker{margin:0 0 8px;color:#e4b78d;font-size:9px;font-weight:850;letter-spacing:.2em;text-transform:uppercase}
    #le-aw-discovery-root .aw-weekly-title{margin:0;color:#fff6ed;font-size:clamp(25px,7vw,35px);line-height:1.03;letter-spacing:-.045em;font-weight:850}
    #le-aw-discovery-root .aw-weekly-lede{margin:11px 0 0;max-width:650px;color:#c0b5aa;font-size:11px;line-height:1.65}
    #le-aw-discovery-root .aw-weekly-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
    #le-aw-discovery-root .aw-weekly-tag{display:inline-flex;align-items:center;max-width:100%;padding:7px 10px;border:1px solid rgba(226,188,151,.22);border-radius:999px;background:rgba(255,255,255,.035);color:#e7d6c6;font-size:9px;line-height:1.3}
    #le-aw-discovery-root .aw-weekly-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
    #le-aw-discovery-root .aw-weekly-action{min-height:40px;border:1px solid rgba(226,188,151,.33);border-radius:12px;padding:10px 13px;background:linear-gradient(135deg,rgba(106,67,43,.56),rgba(15,24,35,.95));color:#fff4e8;font-size:10px;font-weight:800;touch-action:manipulation}
    #le-aw-discovery-root .aw-weekly-action:disabled{opacity:.48}
    #le-aw-discovery-root .aw-weekly-status{margin:0;padding:12px 13px;border:1px solid rgba(143,180,206,.2);border-radius:13px;background:rgba(9,20,32,.64);color:#aec3d3;font-size:10px;line-height:1.55}
    #le-aw-discovery-root .aw-weekly-status.error{border-color:rgba(232,143,116,.38);color:#f2c4b3}
    #le-aw-discovery-root .aw-weekly-archive{display:grid;gap:8px}
    #le-aw-discovery-root .aw-weekly-archive-title{margin:0 0 2px;color:#d8c0a7;font-size:9px;letter-spacing:.17em;font-weight:850;text-transform:uppercase}
    #le-aw-discovery-root .aw-weekly-issue-choice{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;text-align:left;border:1px solid rgba(180,202,220,.17);border-radius:12px;padding:11px 12px;background:rgba(9,19,30,.78);color:#edf5fb}
    #le-aw-discovery-root .aw-weekly-issue-choice[aria-pressed="true"]{border-color:rgba(226,188,151,.65);background:linear-gradient(100deg,rgba(92,59,40,.5),rgba(10,21,32,.9));box-shadow:inset 2px 0 #d9a87d}
    #le-aw-discovery-root .aw-weekly-issue-choice strong{display:block;font-size:11px;line-height:1.35}
    #le-aw-discovery-root .aw-weekly-issue-choice small{display:block;margin-top:4px;color:#91aabe;font-size:9px;line-height:1.4}
    #le-aw-discovery-root .aw-weekly-count{flex:0 0 auto;color:#c9ab8a;font-size:9px}
    #le-aw-discovery-root .aw-weekly-edition{overflow:hidden;border:1px solid rgba(190,206,221,.17);border-radius:19px;background:linear-gradient(155deg,rgba(12,25,38,.97),rgba(6,12,20,.98));box-shadow:0 12px 30px rgba(0,0,0,.16)}
    #le-aw-discovery-root .aw-weekly-edition-head{padding:17px 15px 13px;border-bottom:1px solid rgba(190,206,221,.12)}
    #le-aw-discovery-root .aw-weekly-edition-title{margin:0;color:#f7f0e9;font-size:clamp(20px,5.5vw,27px);line-height:1.1;letter-spacing:-.025em}
    #le-aw-discovery-root .aw-weekly-edition-sub{margin:8px 0 0;color:#9bb2c5;font-size:10px;line-height:1.5}
    #le-aw-discovery-root .aw-weekly-stories{display:grid;gap:0}
    #le-aw-discovery-root .aw-weekly-story{padding:15px;border-bottom:1px solid rgba(190,206,221,.1)}
    #le-aw-discovery-root .aw-weekly-story:last-child{border-bottom:0}
    #le-aw-discovery-root .aw-weekly-story-media{display:block;overflow:hidden;margin:0 0 12px;border-radius:12px;background:linear-gradient(145deg,#182a3a,#090f19);aspect-ratio:16/7;max-height:220px}
    #le-aw-discovery-root .aw-weekly-story-media img{display:block;width:100%;height:100%;object-fit:cover;opacity:.96}
    #le-aw-discovery-root .aw-weekly-story-eyebrow{margin:0 0 7px;color:#d5ad86;font-size:8px;letter-spacing:.16em;font-weight:850;text-transform:uppercase}
    #le-aw-discovery-root .aw-weekly-story-title{margin:0;color:#edf6fc;font-size:clamp(16px,4.4vw,20px);line-height:1.22;letter-spacing:-.015em;font-weight:820}
    #le-aw-discovery-root .aw-weekly-story-copy{margin:9px 0 0;color:#b2c3d1;font-size:11px;line-height:1.7;white-space:pre-line}
    #le-aw-discovery-root .aw-weekly-story-source{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:11px;color:#849db1;font-size:9px;line-height:1.5}
    #le-aw-discovery-root .aw-weekly-story-link{color:#8ed9ff;font-size:10px;font-weight:800;text-decoration:none}
    #le-aw-discovery-root .aw-weekly-footnote{margin:0;color:#7f99ad;font-size:9px;line-height:1.55}
    @media(min-width:700px){#le-aw-discovery-root .aw-weekly-hero{padding:27px 25px}#le-aw-discovery-root .aw-weekly-story{padding:19px}#le-aw-discovery-root .aw-weekly-story-media{aspect-ratio:16/6;max-height:260px}}
    @media print{html,body{position:static!important;height:auto!important;overflow:visible!important;background:#fff!important;color:#111!important}#le-aw-discovery-root{position:static!important;inset:auto!important;height:auto!important;overflow:visible!important;padding:0!important;background:#fff!important;color:#111!important}#le-aw-discovery-root:after,#le-aw-discovery-root .aw-topbar,#le-aw-discovery-root .aw-searchbar,#le-aw-discovery-root .aw-modebar,#le-aw-discovery-root .aw-footer,#le-aw-discovery-root .aw-weekly-actions,#le-aw-discovery-root .aw-weekly-archive,#le-aw-discovery-root .aw-weekly-status{display:none!important}#le-aw-discovery-root .aw-weekly-root,#le-aw-discovery-root .aw-weekly-edition{display:block!important;overflow:visible!important;border:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}#le-aw-discovery-root .aw-weekly-hero{padding:10px 0;border:0!important;background:#fff!important;box-shadow:none!important}#le-aw-discovery-root .aw-weekly-title,#le-aw-discovery-root .aw-weekly-edition-title,#le-aw-discovery-root .aw-weekly-story-title{color:#111!important}#le-aw-discovery-root .aw-weekly-lede,#le-aw-discovery-root .aw-weekly-edition-sub,#le-aw-discovery-root .aw-weekly-story-copy,#le-aw-discovery-root .aw-weekly-story-source{color:#333!important}#le-aw-discovery-root .aw-weekly-story{break-inside:avoid;border-bottom:1px solid #ddd!important}}
  `;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function el(tag, className, value) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined && value !== null) item.textContent = String(value);
    return item;
  }
  function safeUrl(value) {
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : null; }
    catch (_) { return null; }
  }
  function safeImageUrl(value) {
    try {
      const url = new URL(String(value || ''));
      if (url.protocol === 'http:') url.protocol = 'https:';
      return url.protocol === 'https:' ? url.href : null;
    } catch (_) { return null; }
  }
  function textOnly(value) {
    const source = String(value || '');
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    parsed.querySelectorAll('script,style,noscript,iframe,svg,object,embed').forEach(item => item.remove());
    return (parsed.body?.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function clip(value, limit) {
    const clean = textOnly(value);
    if (clean.length <= limit) return clean;
    return clean.slice(0, limit - 1).replace(/\s+\S*$/, '') + '…';
  }
  function issueDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function dateLabel(value, long = false) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat(undefined, long
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('This browser does not provide local database storage.')); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { dbPromise = null; reject(request.error || new Error('Could not open the local magazine library.')); };
      request.onblocked = () => { dbPromise = null; reject(new Error('The local magazine library is busy in another app tab. Close the other tab and retry.')); };
    });
    return dbPromise;
  }
  function readAllIssues() {
    return openDb().then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => (b.savedAt || b.publishedAt || 0) - (a.savedAt || a.publishedAt || 0)));
      request.onerror = () => reject(request.error || new Error('Could not read saved editions.'));
      transaction.onabort = () => reject(transaction.error || new Error('The local issue read was interrupted.'));
    }));
  }
  function saveAndRotate(issue) {
    if (!issue || !issue.id || !Array.isArray(issue.stories) || issue.stories.length < 3) {
      return Promise.reject(new Error('The new edition was incomplete; saved editions were left untouched.'));
    }
    return openDb().then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      store.put(issue);
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const rows = (allRequest.result || []).sort((a, b) => (b.savedAt || b.publishedAt || 0) - (a.savedAt || a.publishedAt || 0));
        rows.slice(MAX_ISSUES).forEach(oldIssue => store.delete(oldIssue.id));
      };
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error || new Error('The issue could not be saved locally.'));
      transaction.onabort = () => reject(transaction.error || new Error('The local save was cancelled; previous editions remain intact.'));
    }));
  }
  function askForPersistentStorage() {
    if (persistRequested) return;
    persistRequested = true;
    try {
      const storage = navigator.storage;
      if (typeof storage?.persisted === 'function' && typeof storage?.persist === 'function') {
        // Never hold the reading UI open while the browser decides about persistence.
        Promise.resolve(storage.persisted()).then(persisted => persisted ? true : storage.persist()).catch(() => {});
      }
    } catch (_) { /* Browser policy may decline persistence; IndexedDB still works. */ }
  }
  async function fetchWithTimeout(url, maxBytes) {
    if (navigator.onLine === false) throw new Error('You are offline. No publication network request was made.');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
        redirect: 'follow', referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (!response.ok) throw new Error(`The publication server returned ${response.status}.`);
      const body = await response.arrayBuffer();
      if (body.byteLength > maxBytes) throw new Error('The publication file exceeded its safety size limit. Saved editions remain untouched.');
      return body;
    } finally {
      window.clearTimeout(timer);
    }
  }
  async function fetchManifest() {
    const bytes = await fetchWithTimeout(MANIFEST_URL.href, MAX_MANIFEST_BYTES);
    let manifest;
    try { manifest = JSON.parse(new TextDecoder().decode(bytes)); }
    catch (_) { throw new Error('The Sunday manifest was not valid JSON. Saved editions remain untouched.'); }
    const entry = manifest?.currentIssue;
    if (manifest?.schemaVersion !== 1 || !entry || entry.schemaVersion !== 1 ||
        typeof entry.id !== 'string' || !entry.id.startsWith('sunday-') ||
        typeof entry.title !== 'string' || !entry.title.trim() ||
        typeof entry.path !== 'string' || !entry.path.trim() ||
        !/^[a-f0-9]{64}$/i.test(String(entry.sha256 || '')) ||
        !Number.isInteger(entry.byteLength) || entry.byteLength < 100 || entry.byteLength > MAX_ISSUE_BYTES ||
        !Number.isInteger(entry.storyCount) || entry.storyCount < 3 || entry.storyCount > MAX_STORIES ||
        !Number.isFinite(Date.parse(entry.publishedAt))) {
      throw new Error('The Sunday manifest failed its structure check. Saved editions remain untouched.');
    }
    const url = new URL(entry.path, MANIFEST_URL.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(new URL('.', MANIFEST_URL.href).pathname)) {
      throw new Error('The Sunday manifest points outside the app publication folder.');
    }
    return { manifest, entry, issueUrl: url.href };
  }
  async function sha256Hex(bytes) {
    if (!window.crypto?.subtle?.digest) throw new Error('This browser cannot securely verify the Sunday issue file. Saved editions remain untouched.');
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function normalizePublishedIssue(raw, entry, bytesSha256) {
    if (!raw || raw.schemaVersion !== 1 || raw.id !== entry.id || raw.kind !== 'sunday' ||
        !raw.title || !Array.isArray(raw.stories) || raw.stories.length !== entry.storyCount ||
        raw.stories.length < 3 || raw.stories.length > MAX_STORIES) {
      throw new Error('The Sunday issue was incomplete or did not match its manifest. Saved editions remain untouched.');
    }
    const stories = raw.stories.map((story, index) => {
      const title = clip(story?.title, 200);
      const summary = clip(story?.summary, 900);
      const url = safeUrl(story?.url);
      const publishedAt = Date.parse(story?.publishedAt);
      if (!title || !summary || !url || !Number.isFinite(publishedAt)) return null;
      return {
        id: clip(story?.id || `report-${index + 1}`, 100),
        title,
        summary,
        publisher: clip(story?.publisher || 'Original source', 100),
        publishedAt,
        url,
        imageUrl: safeImageUrl(story?.imageUrl) || ''
      };
    }).filter(Boolean);
    if (stories.length !== entry.storyCount) throw new Error('One or more stories failed validation. Saved editions remain untouched.');
    const publishedAt = Date.parse(raw.publishedAt);
    if (!Number.isFinite(publishedAt) || publishedAt !== Date.parse(entry.publishedAt)) {
      throw new Error('The issue publication date did not match its manifest. Saved editions remain untouched.');
    }
    return {
      id: raw.id,
      kind: 'sunday',
      title: clip(raw.title, 160),
      publishedAt,
      savedAt: Date.now(),
      releaseDate: new Date(publishedAt).toISOString().slice(0, 10),
      coverageNote: clip(raw.coverageNote || 'A verified Sunday edition, saved locally on this device.', 320),
      manifestRevision: entry.sha256.toLowerCase(),
      saveFormat: 'published-json-sha256-v1',
      stories
    };
  }
  async function syncPublishedIssue(knownIssues) {
    const { entry, issueUrl } = await fetchManifest();
    const local = knownIssues.find(issue => issue.id === entry.id);
    if (local && local.manifestRevision === entry.sha256.toLowerCase() && local.stories?.length === entry.storyCount) {
      return { updated: false, issue: local, entry };
    }
    const bytes = await fetchWithTimeout(issueUrl, MAX_ISSUE_BYTES);
    if (bytes.byteLength !== entry.byteLength) throw new Error('The downloaded issue size did not match its manifest. Saved editions remain untouched.');
    const hash = await sha256Hex(bytes);
    if (hash !== entry.sha256.toLowerCase()) throw new Error('The downloaded issue failed its SHA-256 check. Saved editions remain untouched.');
    let raw;
    try { raw = JSON.parse(new TextDecoder().decode(bytes)); }
    catch (_) { throw new Error('The downloaded Sunday issue was not valid JSON. Saved editions remain untouched.'); }
    const issue = normalizePublishedIssue(raw, entry, hash);
    await saveAndRotate(issue);
    selectedIssueId = issue.id;
    return { updated: true, issue, entry };
  }
  function createButton(label, onClick, disabled = false) {
    const button = el('button', 'aw-weekly-action', label);
    button.type = 'button'; button.disabled = !!disabled;
    button.addEventListener('click', onClick);
    return button;
  }
  function statusLine(parent, message, error = false) {
    const status = el('p', `aw-weekly-status${error ? ' error' : ''}`, message);
    parent.appendChild(status); return status;
  }
  function renderStory(issue, story, online) {
    const card = el('article', 'aw-weekly-story');
    if (online && story.imageUrl) {
      const media = el('div', 'aw-weekly-story-media');
      const image = el('img');
      image.src = story.imageUrl;
      image.alt = `Image from the online source for: ${story.title}`;
      image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => media.remove(), { once: true });
      media.appendChild(image); card.appendChild(media);
    } else if (!online && story.imageUrl) {
      const media = el('div', 'aw-weekly-story-media');
      media.style.display = 'grid'; media.style.placeItems = 'center'; media.style.aspectRatio = 'auto'; media.style.minHeight = '48px'; media.style.maxHeight = 'none';
      media.appendChild(el('span', 'aw-weekly-footnote', 'Image preview needs a connection · saved story text is available offline'));
      card.appendChild(media);
    }
    card.appendChild(el('p', 'aw-weekly-story-eyebrow', `REPORT ${String(issue.stories.indexOf(story) + 1).padStart(2, '0')}`));
    card.appendChild(el('h3', 'aw-weekly-story-title', story.title));
    card.appendChild(el('p', 'aw-weekly-story-copy', story.summary));
    const meta = el('div', 'aw-weekly-story-source');
    const published = dateLabel(story.publishedAt);
    meta.appendChild(el('span', '', `${story.publisher} · ${published}`));
    const source = el('a', 'aw-weekly-story-link', 'Read original ↗');
    source.href = story.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
    meta.appendChild(source); card.appendChild(meta);
    return card;
  }
  function printIssue() {
    try { window.print(); } catch (_) { /* Printing is optional on standalone browsers. */ }
  }
  function renderIssue(parent, issue, online) {
    const edition = el('section', 'aw-weekly-edition');
    const heading = el('header', 'aw-weekly-edition-head');
    heading.appendChild(el('p', 'aw-weekly-kicker', 'SUNDAY RELEASE'));
    heading.appendChild(el('h2', 'aw-weekly-edition-title', issue.title || 'Weekly Space Briefing'));
    heading.appendChild(el('p', 'aw-weekly-edition-sub', `${dateLabel(issue.publishedAt, true)} · ${issue.stories.length} source-linked reports · ${issue.coverageNote || 'Saved locally on this device.'}`));
    const actions = el('div', 'aw-weekly-actions');
    actions.appendChild(createButton('Print / Save PDF', printIssue));
    heading.appendChild(actions);
    edition.appendChild(heading);
    const list = el('div', 'aw-weekly-stories');
    issue.stories.forEach(story => list.appendChild(renderStory(issue, story, online)));
    edition.appendChild(list);
    return edition;
  }
  async function render(container, options = {}) {
    addStyle();
    askForPersistentStorage();
    container.replaceChildren();
    const online = navigator.onLine !== false;
    let issues = [];
    let publicationError = '';
    try { issues = await readAllIssues(); }
    catch (error) { statusLine(container, `The local magazine library could not be opened: ${error?.message || error}`, true); return; }

    let updated = false;
    if (online) {
      statusLine(container, 'Checking the small Sunday manifest…');
      try {
        const result = await syncPublishedIssue(issues);
        updated = result.updated;
        issues = await readAllIssues();
      } catch (error) {
        publicationError = error?.message || 'The Sunday release could not be checked. Saved editions have been kept.';
        try { issues = await readAllIssues(); } catch (_) {}
      }
      container.replaceChildren();
    }

    const root = el('div', 'aw-weekly-root');
    const hero = el('section', 'aw-weekly-hero');
    hero.appendChild(el('p', 'aw-weekly-kicker', 'LIVE // EARTH · WEEKLY PUBLISH'));
    hero.appendChild(el('h2', 'aw-weekly-title', 'The Sunday Space Journal'));
    hero.appendChild(el('p', 'aw-weekly-lede', 'Published Sunday editions are checked only when you open this screen. A tiny manifest is checked first; the issue file is downloaded only if this device is missing it or its published revision changed. Verified text and source details are saved locally—not in the app launch bundle.'));
    const meta = el('div', 'aw-weekly-meta');
    meta.appendChild(el('span', 'aw-weekly-tag', `${Math.min(issues.length, MAX_ISSUES)} of ${MAX_ISSUES} editions saved`));
    meta.appendChild(el('span', 'aw-weekly-tag', online ? 'Manifest checked online' : 'Offline reading'));
    meta.appendChild(el('span', 'aw-weekly-tag', 'Local IndexedDB · no account'));
    hero.appendChild(meta);
    if (online) hero.appendChild(createButton('Check for published issue', () => void render(container, { selectedIssueId: selectedIssueId || issues[0]?.id } )));
    root.appendChild(hero);

    if (publicationError) statusLine(root, `${publicationError} ${issues.length ? 'Your saved editions are still available.' : 'No complete edition could be saved yet.'}`, true);
    if (updated) statusLine(root, 'A new Sunday edition was verified and saved locally. Older editions were rotated only after the new edition completed its IndexedDB transaction.');
    if (issues.length) {
      const archive = el('section', 'aw-weekly-archive');
      archive.appendChild(el('h3', 'aw-weekly-archive-title', 'Your saved editions'));
      issues.forEach(issue => {
        const button = el('button', 'aw-weekly-issue-choice');
        button.type = 'button';
        const label = el('span');
        label.appendChild(el('strong', '', issue.title || 'The Sunday Space Journal'));
        label.appendChild(el('small', '', `${dateLabel(issue.publishedAt, true)} · Sunday edition`));
        button.appendChild(label);
        button.appendChild(el('span', 'aw-weekly-count', `${issue.stories.length} reports`));
        const issueIsSelected = (options.selectedIssueId || selectedIssueId || issues[0].id) === issue.id;
        button.setAttribute('aria-pressed', String(issueIsSelected));
        button.addEventListener('click', () => { selectedIssueId = issue.id; void render(container, { selectedIssueId: issue.id }); });
        archive.appendChild(button);
      });
      root.appendChild(archive);
      const selected = issues.find(issue => issue.id === (options.selectedIssueId || selectedIssueId)) || issues[0];
      selectedIssueId = selected.id;
      root.appendChild(renderIssue(root, selected, online));
      statusLine(root, online
        ? 'Story text and source metadata are saved locally. This phase does not download or cache image files; any supplied image URL is only loaded lazily while connected.'
        : 'Saved story text, dates, source names and original links are available offline. No publication network request was made, and remote images are not saved in this phase.');
    } else {
      statusLine(root, online
        ? 'No Sunday edition has been saved on this device yet. The app can only download an issue that is present in the published manifest; a missing or failed issue does not create a local substitute.'
        : 'No Sunday edition is saved on this device yet. Reconnect and open Weekly Publish to check the published manifest. Nothing was fetched while offline.');
    }
    container.appendChild(root);
  }

  window.LiveEarthWeeklyPublish = {
    version: 'v106',
    render,
    getSavedIssues: readAllIssues
  };
})();
