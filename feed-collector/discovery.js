(() => {
  'use strict';
  if (window.__liveEarthFeedDiscoveryInstalled) return;
  window.__liveEarthFeedDiscoveryInstalled = true;

  const $ = id => document.getElementById(id);
  const form = $('siteForm');
  const input = $('siteUrl');
  const period = $('lookbackDays');
  const discoverButton = $('discoverButton');
  const status = $('status');
  const panels = ['feedResults', 'feedDetail', 'articleDetail'];
  const state = { site: null, feeds: [], selectedFeed: null, selectedFeedResult: null, selectedArticle: null };
  const API_BASE = String(window.LIVE_EARTH_FEED_COLLECTOR_API_BASE || '/api/feed-collector').replace(/\/$/, '');

  const text = value => value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  const pretty = value => JSON.stringify(value ?? {}, null, 2);
  const escapeUrl = value => {
    try { const url = new URL(String(value)); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  const showOnly = id => panels.forEach(panel => { $(panel).hidden = panel !== id; });

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.className = `fc-status${kind ? ` is-${kind}` : ''}`;
  }

  async function apiPost(route, body) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(`${API_BASE}/${route}`, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal
      });
      let result;
      try { result = await response.json(); }
      catch { throw new Error(`Feed Collector service returned an unreadable response (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(result?.error || `Feed Collector service returned HTTP ${response.status}.`);
      return result;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('The inspection took too long. Try again with a smaller period or a website with fewer feed links.');
      if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error?.message || '')) {
        throw new Error('The Feed Collector service could not be reached. The Python inspection service must be deployed and connected to this app before live URL discovery can run.');
      }
      throw error;
    } finally { window.clearTimeout(timer); }
  }

  function field(host, label, value) {
    const wrap = document.createElement('dl'); wrap.className = 'fc-field';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value === '' || value == null ? 'Not supplied by source' : text(value);
    wrap.append(dt, dd); host.appendChild(wrap);
  }

  function stat(host, value, label) {
    const node = document.createElement('div'); node.className = 'fc-stat';
    const strong = document.createElement('strong'); strong.textContent = Number(value || 0).toLocaleString();
    const span = document.createElement('span'); span.textContent = label;
    node.append(strong, span); host.appendChild(node);
  }

  function renderFeedCards() {
    const host = $('feedList'); host.replaceChildren();
    $('feedCount').textContent = `${state.feeds.length} feeds`;
    $('noFeeds').hidden = state.feeds.length !== 0;
    for (const feed of state.feeds) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'fc-feed-card';
      const top = document.createElement('div'); top.className = 'fc-feed-card-top';
      const heading = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = feed.title || 'Untitled feed';
      const url = document.createElement('p'); url.className = 'fc-feed-url'; url.textContent = feed.url;
      heading.append(title, url);
      const count = document.createElement('span'); count.className = 'fc-count'; count.textContent = `${feed.entriesInWindow} recent`;
      top.append(heading, count); button.appendChild(top);
      if (feed.description) { const desc = document.createElement('p'); desc.textContent = feed.description; button.appendChild(desc); }
      const chips = document.createElement('div'); chips.className = 'fc-chip-row';
      for (const value of [`${String(feed.format || '').toUpperCase()} feed`, `${feed.entriesTotal} total`, `${feed.undatedEntries} undated`]) {
        const chip = document.createElement('span'); chip.className = 'fc-chip'; chip.textContent = value; chips.appendChild(chip);
      }
      button.appendChild(chips);
      button.addEventListener('click', () => openFeed(feed));
      host.appendChild(button);
    }
  }

  function renderFeedDetail(result) {
    const feed = result.feed || {};
    $('feedTitle').textContent = feed.title || 'Untitled feed';
    $('feedUrl').textContent = feed.finalUrl || feed.feedUrl || '';
    $('feedUrl').href = escapeUrl(feed.finalUrl || feed.feedUrl);
    $('feedFormat').textContent = String(feed.format || 'feed').toUpperCase();
    $('feedStats').replaceChildren();
    stat($('feedStats'), result.statistics?.entriesInWindow, `Entries · ${result.lookbackDays} days`);
    stat($('feedStats'), result.statistics?.entriesTotal, 'Entries total');
    stat($('feedStats'), result.statistics?.undatedEntries, 'Undated entries');
    stat($('feedStats'), result.statistics?.imageReferences, 'Image references');
    const metadata = $('feedMetadata'); metadata.replaceChildren();
    for (const [label, key] of [
      ['Feed title', 'title'], ['Description', 'description'], ['Homepage', 'homePageUrl'],
      ['Feed address', 'feedUrl'], ['Language', 'language'], ['Last updated', 'updatedAt'],
      ['Generator', 'generator'], ['HTTP status', 'httpStatus'], ['Content type', 'contentType'],
      ['ETag', 'etag'], ['Last modified', 'lastModified'], ['Fetched at', 'fetchedAt'],
      ['Response size (bytes)', 'responseBytes']
    ]) field(metadata, label, feed[key]);
    $('entryCount').textContent = `${result.records?.length || 0} entries`;
    renderEntries(result.records || [], $('entryList'), $('noEntries'));
    renderEntries(result.undatedRecords || [], $('undatedEntryList'), $('noUndatedEntries'));
    $('undatedCount').textContent = String(result.undatedRecords?.length || 0);
    $('feedRawMetadata').textContent = pretty({ rawMetadata: feed.rawMetadata, retrieval: feed });
  }

  function renderEntries(records, host, emptyNote) {
    host.replaceChildren();
    emptyNote.hidden = records.length > 0;
    for (const record of records) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'fc-entry-card';
      const top = document.createElement('div'); top.className = 'fc-entry-card-top';
      const title = document.createElement('h3'); title.textContent = record.title || 'Untitled entry';
      const date = document.createElement('span'); date.className = 'fc-count'; date.textContent = record.publishedAt || 'Date unavailable';
      top.append(title, date); button.appendChild(top);
      const meta = document.createElement('p'); meta.className = 'fc-entry-meta';
      meta.textContent = [record.authorName, record.language, `${(record.media || []).length} media`].filter(Boolean).join(' · ');
      button.appendChild(meta);
      const summary = document.createElement('p'); summary.className = 'fc-entry-summary';
      summary.textContent = record.summary || record.excerpt || (record.fullText || '').slice(0, 260) || 'No article text was included in this feed entry.';
      button.appendChild(summary);
      button.addEventListener('click', () => openArticle(record));
      host.appendChild(button);
    }
  }

  function renderArticle(result) {
    const record = result.record || {};
    const article = result.fullArticle || {};
    $('articleTitle').textContent = article.title || record.title || 'Article details';
    const articleUrl = article.articleUrl || record.canonicalUrl || record.originalUrl || '';
    $('articleUrl').textContent = articleUrl;
    $('articleUrl').href = escapeUrl(articleUrl);
    $('articleWordCount').textContent = `${Number(article.wordCount || 0).toLocaleString()} words`;
    $('articleStats').replaceChildren();
    stat($('articleStats'), result.originalImageRecords?.length, 'Images');
    stat($('articleStats'), record.links?.length, 'Links');
    stat($('articleStats'), article.pages?.length, 'Pages retrieved');
    stat($('articleStats'), Object.keys(record).length, 'Fields');
    const articleBody = $('articleBody');
    articleBody.textContent = article.fullText || record.fullText || '';
    $('noArticleText').hidden = !!articleBody.textContent.trim();
    const imageHost = $('articleImages'); imageHost.replaceChildren();
    const images = result.originalImageRecords || [];
    $('articleImageCount').textContent = `${images.length} images`;
    $('noArticleImages').hidden = images.length > 0;
    for (const image of images) {
      const card = document.createElement('article'); card.className = 'fc-image-card';
      const url = escapeUrl(image.url);
      if (url) {
        const img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.src = url;
        img.alt = image.altText || image.caption || image.title || 'Original source image';
        img.addEventListener('error', () => img.removeAttribute('src'));
        card.appendChild(img);
      }
      const info = document.createElement('div'); info.className = 'fc-image-info';
      const name = document.createElement('strong'); name.textContent = image.title || image.caption || image.altText || 'Source image';
      const link = document.createElement('a'); link.href = url || '#'; link.textContent = image.url || 'No image URL'; link.target = '_blank'; link.rel = 'noopener noreferrer';
      info.append(name, link);
      const attribution = [image.creator, image.credit, image.licenseName, image.rightsNotice].filter(Boolean).join(' · ');
      if (attribution) { const small = document.createElement('p'); small.textContent = attribution; info.appendChild(small); }
      card.appendChild(info); imageHost.appendChild(card);
    }
    const metaHost = $('articleMetadata'); metaHost.replaceChildren();
    for (const key of (result.recordFields || Object.keys(record))) field(metaHost, key, record[key]);
    $('rightsEvidence').textContent = pretty({ retrieval: result.retrieval, sourceRightsEvidence: result.sourceRightsEvidence, pages: article.pages });
    $('rawRecord').textContent = pretty(record);
  }

  async function openFeed(feed) {
    state.selectedFeed = feed;
    state.selectedFeedResult = null;
    state.selectedArticle = null;
    showOnly('feedDetail');
    $('feedTitle').textContent = feed.title;
    $('entryList').replaceChildren();
    setStatus(`Reading ${feed.title} and collecting all entries from the last ${period.value} days…`);
    try {
      const result = await apiPost('inspect-feed', { feedUrl: feed.url, lookbackDays: Number(period.value) });
      state.selectedFeedResult = result;
      renderFeedDetail(result);
      setStatus(`Feed inspection complete. ${result.statistics.entriesInWindow} entries fall inside the last ${result.lookbackDays} days; ${result.statistics.undatedEntries} undated entries are shown separately.`, 'success');
      $('feedDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setStatus(error?.message || 'This feed could not be inspected.', 'error');
    }
  }

  async function openArticle(record) {
    state.selectedArticle = record;
    showOnly('articleDetail');
    setStatus(`Retrieving full source details for ${record.title || 'this entry'}…`);
    const articleUrl = record.canonicalUrl || record.originalUrl || record.links?.[0]?.url;
    if (!articleUrl) {
      setStatus('This feed entry has no article URL. Its complete 38-field feed record remains available in the feed result.', 'error');
      showOnly('feedDetail');
      return;
    }
    try {
      const result = await apiPost('inspect-article', { articleUrl, lookbackDays: Number(period.value) });
      renderArticle(result);
      setStatus(`Article inspection complete. ${result.fullArticle.wordCount} words, ${result.originalImageRecords.length} original image references, and ${result.fullArticle.pages.length} source page(s) inspected.`, 'success');
      $('articleDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setStatus(error?.message || 'The article could not be retrieved.', 'error');
      showOnly('feedDetail');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const url = input.value.trim();
    if (!url) { setStatus('Enter a website address first.', 'error'); return; }
    discoverButton.disabled = true; discoverButton.textContent = 'Searching…';
    $('feedResults').hidden = true; $('feedDetail').hidden = true; $('articleDetail').hidden = true;
    state.site = null; state.feeds = []; state.selectedFeed = null;
    setStatus(`Discovering feeds and checking entries from the last ${period.value} days…`);
    try {
      const result = await apiPost('discover', { url, lookbackDays: Number(period.value) });
      state.site = result.site; state.feeds = result.feeds || [];
      $('siteTitle').textContent = result.site?.title || 'Available feeds';
      $('siteUrlLabel').textContent = result.site?.finalUrl || url;
      renderFeedCards(); showOnly('feedResults');
      setStatus(`Discovery complete. Checked ${result.discovery.candidateLocationsChecked} feed locations and found ${result.feedsFound} readable feeds.`, 'success');
      $('feedResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showOnly('feedResults');
      $('siteTitle').textContent = 'Feed discovery'; $('siteUrlLabel').textContent = url;
      renderFeedCards();
      setStatus(error?.message || 'The website could not be inspected.', 'error');
    } finally { discoverButton.disabled = false; discoverButton.textContent = 'Find feeds'; }
  });

  period.addEventListener('change', () => { if (state.site) form.requestSubmit(); });

  $('backToFeeds').addEventListener('click', () => { showOnly('feedResults'); setStatus('Choose another discovered feed.', 'success'); });
  $('backToFeed').addEventListener('click', () => { showOnly('feedDetail'); setStatus('Choose another entry in this feed.', 'success'); });
})();
