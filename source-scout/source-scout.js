(() => {
  'use strict';

  const READER_ORIGIN = 'https://r.jina.ai/';
  const MAX_SECTION_PAGES = 2;
  const MAX_FEED_PAGES = 2;
  const MAX_RESULTS = 150;

  const form = document.getElementById('scanForm');
  const input = document.getElementById('websiteInput');
  const scanButton = document.getElementById('scanButton');
  const statusBox = document.getElementById('statusMessage');
  const resultList = document.getElementById('resultsList');
  const resultCount = document.getElementById('resultCount');
  const filters = document.getElementById('filters');
  const actions = document.getElementById('resultActions');
  const emptyState = document.getElementById('emptyState');
  const toast = document.getElementById('toast');
  let discoveries = [];
  let currentFilter = 'All';
  let toastTimer = null;

  const safeText = value => String(value || '').replace(/\s+/g, ' ').trim();

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  function setStatus(message, kind = '') {
    statusBox.textContent = message;
    statusBox.className = `status${kind ? ` is-${kind}` : ''}`;
  }

  function normalizeWebsite(raw) {
    let value = safeText(raw);
    if (!value) throw new Error('Enter a website address first.');
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    let url;
    try { url = new URL(value); } catch { throw new Error('That website address does not look valid.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public HTTP or HTTPS websites can be scanned.');
    if (url.username || url.password) throw new Error('Please enter a public website address without login details.');
    const host = url.hostname.toLowerCase();
    const privateHost = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:') ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (privateHost) throw new Error('For safety, Source Scout only scans public websites.');
    url.hash = '';
    return url;
  }

  function isSameSite(candidate, root) {
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      const base = root.hostname.toLowerCase();
      return host === base || host.endsWith(`.${base}`);
    } catch { return false; }
  }

  function addCandidate(collection, urlValue, label, baseUrl) {
    if (!urlValue) return;
    try {
      const url = new URL(String(urlValue).trim(), baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      const sameSite = isSameSite(url.href, new URL(baseUrl));
      const externalFeed = classify(label, url.href) === 'RSS / Atom';
      if (!sameSite && !externalFeed) return;
      url.hash = '';
      const href = url.href.replace(/\/$/, '') || url.origin;
      if (!collection.has(href)) collection.set(href, safeText(label) || url.pathname.split('/').filter(Boolean).pop() || url.hostname);
    } catch { /* Ignore malformed or unsupported links. */ }
  }

  function recursivelyReadLinks(value, output, baseUrl) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(item => recursivelyReadLinks(item, output, baseUrl));
      return;
    }
    if (typeof value === 'object') {
      const url = value.url || value.href || value.link || value.uri;
      const label = value.title || value.text || value.label || value.name || value.anchor_text || value.description;
      if (typeof url === 'string') addCandidate(output, url, label, baseUrl);
      for (const [key, child] of Object.entries(value)) {
        if (['url', 'href', 'link', 'uri', 'title', 'text', 'label', 'name', 'anchor_text', 'description'].includes(key)) continue;
        if (child && typeof child === 'object') recursivelyReadLinks(child, output, baseUrl);
      }
    }
  }

  function linksFromText(text, output, baseUrl) {
    const source = String(text || '');
    const markdown = /\[([^\]]{1,180})\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
    const markdownImages = /!\[([^\]]{0,180})\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
    let match;
    while ((match = markdown.exec(source))) addCandidate(output, match[2].replace(/[.,;]+$/, ''), match[1], baseUrl);
    while ((match = markdownImages.exec(source))) addCandidate(output, match[2].replace(/[.,;]+$/, ''), match[1] || 'Media', baseUrl);
    const html = /href=["'](https?:\/\/[^"']+)["']/gi;
    while ((match = html.exec(source))) addCandidate(output, match[1], '', baseUrl);
  }

  function extractSitemapUrls(text, output, baseUrl) {
    const source = String(text || '');
    const locs = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
    let match;
    while ((match = locs.exec(source))) addCandidate(output, match[1], '', baseUrl);
    const urls = /https?:\/\/[^\s<>"')\]]+/g;
    while ((match = urls.exec(source))) {
      const href = match[0].replace(/[.,;]+$/, '');
      if (/sitemap|rss|feed|news|research|publication|media|image|video/i.test(href)) addCandidate(output, href, '', baseUrl);
    }
  }

  async function readPublicUrl(targetUrl) {
    // Reader's default response is Markdown. Keeping the request to a plain GET
    // avoids sending custom browser headers and keeps this three-file app small.
    const response = await fetch(READER_ORIGIN + targetUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit'
    });
    if (!response.ok) {
      if (response.status === 429) throw new Error('The reading service is busy. Please wait a moment before scanning again.');
      throw new Error(`The reading service could not open this page (HTTP ${response.status}).`);
    }
    const raw = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* The normal Reader response is Markdown text. */ }
    const data = parsed?.data || parsed || {};
    const content = typeof data.content === 'string' ? data.content : raw;
    const links = new Map();
    recursivelyReadLinks(data.links || data.link_summary || [], links, targetUrl);
    linksFromText(content, links, targetUrl);
    const heading = content.match(/^#\s+(.+)$/m);
    return {
      title: safeText(data.title || parsed?.title || heading?.[1]),
      url: safeText(data.url || targetUrl),
      content,
      links
    };
  }

  function classify(label, href) {
    let url;
    try { url = new URL(href); } catch { return 'Other'; }

    let path = url.pathname.toLowerCase();
    try { path = decodeURIComponent(path); } catch { /* Keep the encoded path if malformed. */ }
    const text = safeText(label).toLowerCase();
    const haystack = `${text} ${path}`;
    const segments = path.split('/').filter(Boolean);

    // Direct media files and clearly labelled image/video assets take priority.
    // This prevents captions such as "Image 5: Ocean research platform" from
    // being mislabelled as Research simply because the caption contains that word.
    if (/\.(png|jpe?g|gif|webp|svg|avif|tif?f|mp4|m4v|mov|webm|mp3|wav|m3u8)$/i.test(path) ||
        /\b(image|photo|photograph|picture|video|audio|gallery|multimedia|visuals|artwork|thumbnail)\b/.test(text) ||
        /(^|\/)(images?|photos?|videos?|audio|galleries|multimedia)(\/|$)/.test(path)) {
      return 'Media';
    }

    // Feed endpoints are distinct from ordinary pages and article links.
    if (/(^|[\/_.-])(rss|atom|feed)([\/_.?&=-]|$)|\.(rss|atom)(?:$)|atom\.xml|rss\.xml/.test(haystack) ||
        /(^|\/)feeds?(\/|$)/.test(path)) {
      return 'RSS / Atom';
    }

    // A clear news/press route wins over research-related words in a headline.
    const newsRoute = /^(news|press|press-releases?|releases?|stories|articles|blog|blogs|mission-updates?|latest)(-|$)/.test(segments[0] || '') ||
      segments.some(segment => /^(news|press|press-releases?|releases?|stories|articles|blog|blogs|mission-updates?|latest)$/.test(segment));
    if (newsRoute || /\b(news|press release|article|story|stories|mission update|blog post|latest updates)\b/.test(text)) {
      return 'News';
    }

    // Research requires a meaningful research/publication signal in the route
    // or description; broad words such as "science" or "report" alone are not enough.
    const researchRoute = segments.some(segment =>
      /^(research|science|publications?|journals?|papers?|repositories|repository|datasets?|studies|investigations|scientific-reports?|technical-reports?|arxiv|preprints?)$/.test(segment));
    if (researchRoute || /\b(research|science|publication|journal|scientific paper|research paper|repository|dataset|study|investigation|technical report|preprint)\b/.test(text)) {
      return 'Research';
    }

    if (/(^|\/)media(\/|$)/.test(path) || /\b(media|multimedia|image library|video library)\b/.test(text)) {
      return 'Media';
    }

    return 'Other';
  }

  function makeDiscoveryMap(rootUrl, linkMap, homepageTitle = '') {
    const found = new Map();
    addCandidate(found, rootUrl.href, homepageTitle || rootUrl.hostname, rootUrl.href);
    for (const [href, label] of linkMap) {
      const type = classify(label, href);
      if (type !== 'Other') found.set(href, { label: label || new URL(href).pathname, type });
    }
    return found;
  }

  function pickSectionPages(linkMap) {
    const picks = [];
    for (const [href, label] of linkMap) {
      if (!isSameSite(href, new URL(input.value.startsWith('http') ? input.value : `https://${input.value}`))) continue;
      const type = classify(label, href);
      if ((type === 'News' || type === 'Research' || type === 'Media') && !/\.(jpg|jpeg|png|gif|webp|mp4|pdf)(\?|$)/i.test(href)) {
        if (!picks.some(item => item.url === href)) picks.push({ url: href, label, type });
      }
    }
    return picks.slice(0, MAX_SECTION_PAGES);
  }

  async function scanWebsite(siteUrl) {
    const root = siteUrl.origin;
    const homepage = await readPublicUrl(siteUrl.href);
    const allLinks = new Map(homepage.links);

    const robotsUrl = `${root}/robots.txt`;
    const sitemapUrl = `${root}/sitemap.xml`;
    const baseReads = await Promise.allSettled([readPublicUrl(robotsUrl), readPublicUrl(sitemapUrl)]);
    const sitemaps = new Set([sitemapUrl]);
    let robotsText = '';
    for (const result of baseReads) {
      if (result.status !== 'fulfilled') continue;
      const body = result.value.content || '';
      if (result.value.url.includes('robots.txt')) robotsText = body;
      linksFromText(body, allLinks, root);
      extractSitemapUrls(body, allLinks, root);
      const sitemapLines = body.match(/^\s*Sitemap:\s*(https?:\/\/\S+)/gim) || [];
      sitemapLines.forEach(line => sitemaps.add(line.replace(/^\s*Sitemap:\s*/i, '').trim()));
    }
    const robotsSitemap = robotsText.match(/^\s*Sitemap:\s*(https?:\/\/\S+)/im);
    if (robotsSitemap?.[1]) sitemaps.add(robotsSitemap[1]);

    const sitemapTargets = [...sitemaps].slice(0, 2);
    const sitemapReads = await Promise.allSettled(sitemapTargets.map(readPublicUrl));
    for (const result of sitemapReads) {
      if (result.status !== 'fulfilled') continue;
      extractSitemapUrls(result.value.content, allLinks, root);
      linksFromText(result.value.content, allLinks, root);
    }

    const sectionPages = pickSectionPages(allLinks);
    const discoveredFeeds = [...allLinks].filter(([href, label]) => classify(label, href) === 'RSS / Atom').slice(0, MAX_FEED_PAGES);
    const inspectTargets = [
      ...sectionPages.map(item => item.url),
      ...discoveredFeeds.map(([href]) => href)
    ].slice(0, MAX_SECTION_PAGES + MAX_FEED_PAGES);
    const detailReads = await Promise.allSettled(inspectTargets.map(readPublicUrl));
    for (const result of detailReads) {
      if (result.status !== 'fulfilled') continue;
      for (const [href, label] of result.value.links) addCandidate(allLinks, href, label, result.value.url || root);
    }

    const mapped = makeDiscoveryMap(siteUrl, allLinks, homepage.title);
    const items = [];
    for (const [href, meta] of mapped) {
      if (typeof meta === 'object') {
        items.push({ url: href, title: meta.label || href, type: meta.type });
      } else {
        const type = classify(meta, href);
        if (type !== 'Other') items.push({ url: href, title: meta || href, type });
      }
    }

    // Include the public homepage as a useful entry only when it has a meaningful title.
    if (homepage.title) items.unshift({ url: siteUrl.href, title: homepage.title, type: 'Website' });
    const unique = new Map();
    for (const item of items) if (!unique.has(item.url)) unique.set(item.url, item);
    return [...unique.values()].slice(0, MAX_RESULTS);
  }

  function createCard(item, index) {
    const card = document.createElement('article');
    card.className = 'source-card';
    const checkbox = document.createElement('input');
    checkbox.className = 'source-check';
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.index = String(index);
    checkbox.setAttribute('aria-label', `Select ${item.title}`);

    const main = document.createElement('div');
    main.className = 'source-main';
    const meta = document.createElement('div');
    meta.className = 'source-meta';
    const pill = document.createElement('span');
    pill.className = 'type-pill';
    pill.textContent = item.type;
    meta.appendChild(pill);
    const title = document.createElement('span');
    title.className = 'source-title';
    title.textContent = item.title;
    const url = document.createElement('a');
    url.className = 'source-url';
    url.href = item.url;
    url.target = '_blank';
    url.rel = 'noopener noreferrer';
    url.textContent = item.url;
    const buttons = document.createElement('div');
    buttons.className = 'source-buttons';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.textContent = 'Open';
    openButton.addEventListener('click', () => window.open(item.url, '_blank', 'noopener,noreferrer'));

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy URL';
    copyButton.addEventListener('click', () => copyText(item.url));

    const testButton = document.createElement('button');
    testButton.type = 'button';
    testButton.textContent = 'Test';
    testButton.addEventListener('click', async () => {
      testButton.disabled = true;
      testButton.textContent = 'Testing…';
      try {
        await readPublicUrl(item.url);
        testButton.textContent = 'Readable';
      } catch (error) {
        testButton.textContent = 'Retry';
        showToast(error.message || 'This URL could not be tested.');
      } finally {
        testButton.disabled = false;
      }
    });

    buttons.append(openButton, copyButton, testButton);
    main.append(meta, title, url, buttons);
    card.append(checkbox, main);
    return card;
  }

  function selectedItems() {
    const selectedIndices = [...resultList.querySelectorAll('.source-check:checked')].map(node => Number(node.dataset.index));
    return selectedIndices.map(index => discoveries[index]).filter(Boolean);
  }

  function renderResults() {
    resultList.replaceChildren();
    const visible = discoveries.map((item, index) => ({ item, index })).filter(({ item }) => currentFilter === 'All' || item.type === currentFilter);
    resultCount.textContent = `${discoveries.length} found`;
    filters.hidden = discoveries.length === 0;
    actions.hidden = discoveries.length === 0;
    emptyState.hidden = discoveries.length > 0;
    if (!visible.length && discoveries.length) {
      const note = document.createElement('div');
      note.className = 'empty-state';
      note.textContent = 'No sources in this category were found.';
      resultList.appendChild(note);
    } else {
      for (const { item, index } of visible) resultList.appendChild(createCard(item, index));
    }
    const updateActions = () => {
      const hasSelection = selectedItems().length > 0;
      document.getElementById('copySelectedButton').disabled = !hasSelection;
      document.getElementById('exportButton').disabled = !hasSelection;
    };
    resultList.querySelectorAll('.source-check').forEach(node => node.addEventListener('change', updateActions));
    updateActions();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied.');
    } catch {
      showToast('Clipboard access is unavailable in this browser.');
    }
  }

  function exportSelected() {
    const rows = selectedItems();
    if (!rows.length) return;
    const quote = value => `"${String(value).replace(/"/g, '""')}"`;
    const csv = ['Type,Title,URL', ...rows.map(item => [item.type, item.title, item.url].map(quote).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'source-scout-results.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    showToast('Export ready.');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    let siteUrl;
    try { siteUrl = normalizeWebsite(input.value); }
    catch (error) { setStatus(error.message, 'error'); input.focus(); return; }

    scanButton.disabled = true;
    scanButton.innerHTML = '<span class="scan-icon" aria-hidden="true">…</span><span>Scanning</span>';
    discoveries = [];
    currentFilter = 'All';
    filters.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('is-active', chip.dataset.filter === 'All'));
    renderResults();
    setStatus(`Scanning ${siteUrl.hostname}. Looking for news, feeds, research and media pages…`, 'working');
    try {
      discoveries = await scanWebsite(siteUrl);
      renderResults();
      if (discoveries.length) setStatus(`Scan complete. Found ${discoveries.length} source URLs on ${siteUrl.hostname}. Select the ones you want to keep.`);
      else setStatus('The website opened, but no matching source URLs were found. Try its news or research section directly.', 'error');
    } catch (error) {
      setStatus(error.message || 'The website could not be scanned. It may restrict automated access.', 'error');
    } finally {
      scanButton.disabled = false;
      scanButton.innerHTML = '<span class="scan-icon" aria-hidden="true">⌕</span><span>Scan</span>';
    }
  });

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    currentFilter = button.dataset.filter;
    filters.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('is-active', chip === button));
    renderResults();
  });

  document.getElementById('copySelectedButton').addEventListener('click', () => {
    const urls = selectedItems().map(item => item.url).join('\n');
    if (urls) copyText(urls);
  });
  document.getElementById('exportButton').addEventListener('click', exportSelected);

  document.querySelectorAll('[data-site]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.dataset.site;
      input.focus();
    });
  });

  document.getElementById('closeButton').addEventListener('click', () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'LIVE_EARTH_SOURCE_SCOUT_CLOSE' }, window.location.origin);
    } else if (window.history.length > 1) {
      window.history.back();
    }
  });
})();
