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
      catch { throw new Error(`Feed Explorer received an unreadable response (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(result?.error || `Feed Explorer received HTTP ${response.status}.`);
      return result;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('This search took too long. Try a shorter date range or another website.');
      if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error?.message || '')) {
        throw new Error('The Feed Explorer service is not reachable. Its Python service must be running and connected to this app.');
      }
      throw error;
    } finally { window.clearTimeout(timer); }
  }

  function humanize(key) {
    const names = {
      schemaVersion:'Record format version', postId:'Article record ID', sourcePostId:'Source article ID',
      viewId:'View reference', sourceId:'Source reference', sourceName:'Publisher or website',
      sourcePlatform:'Publishing platform', sourceType:'Feed type', sourceFeedUrl:'Feed address',
      sourceWebsiteUrl:'Website address', originalUrl:'Original article address', canonicalUrl:'Preferred article address',
      title:'Headline', subtitle:'Subheading', summary:'Short summary', excerpt:'Article preview',
      fullText:'Full article text', fullTextHtml:'Original article formatting', authorName:'Author',
      authorId:'Author ID', authorUrl:'Author profile', contributors:'Other contributors',
      publishedAt:'Publication date', updatedAt:'Last updated', collectedAt:'When this page was checked',
      language:'Language', categories:'Categories', tags:'Tags', topics:'Topics', location:'Location',
      media:'Images and media', attachments:'Attachments', links:'Related links', engagement:'Reader activity',
      rightsMetadata:'Copyright and usage information', provenance:'Where this information came from',
      sourceMetadata:'Extra information supplied by the website', collectionContext:'Inspection context',
      url:'Web address', originalUrl:'Original image address', thumbnailUrl:'Preview image address',
      mediaType:'Media type', mediaId:'Image or media ID', titleText:'Title', caption:'Caption',
      altText:'Image description', creator:'Creator or photographer', credit:'Credit line',
      licenseName:'Licence', licenseUrl:'Licence details', rightsNotice:'Rights notice',
      mimeType:'File format', width:'Image width', height:'Image height', sourcePage:'Page containing this image',
      position:'Position in article', metadata:'Additional details', copyrightNotice:'Copyright notice',
      attribution:'Attribution', termsUrl:'Usage terms', sourcePageUrl:'Source page',
      views:'Views', likes:'Likes', reactions:'Reactions', comments:'Comments', shares:'Shares',
      saves:'Saves', score:'Score', requestedUrl:'Address requested', finalUrl:'Address reached',
      fetchedAt:'Time checked', httpStatus:'Website response', contentType:'Content format',
      etag:'ETag', lastModified:'Server last-modified date', feedUrl:'Feed address',
      discoveredFrom:'Found through', feedEntryId:'Feed entry ID', jobId:'Inspection job',
      profileId:'Profile reference', assignmentIds:'Assignment references', configVersion:'Configuration version',
      destinationDatabaseId:'Database reference', destinationDatabasePath:'Database path',
      collectorEntrypoint:'Collector entry point', collectorWorkflow:'Collector workflow',
      scheduledAt:'Scheduled time', requestWindowHours:'Request time window', trigger:'Inspection trigger',
      collectorVersion:'Collector version', sourceProvidedValue:'Value supplied by source',
      name:'Name', address:'Address', city:'City', region:'Region or state', country:'Country',
      latitude:'Latitude', longitude:'Longitude', placeId:'Place ID', viewsCount:'View count',
      durationSeconds:'Duration in seconds', fileSizeBytes:'File size in bytes'
    };
    if (names[key]) return names[key];
    return String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function field(host, label, value, options = {}) {
    const wrap = document.createElement('dl');
    wrap.className = `fc-field${options.wide ? ' is-wide' : ''}`;
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd');
    if (value === '' || value == null || (Array.isArray(value) && !value.length)) {
      dd.textContent = 'Not provided by the source';
      dd.classList.add('is-missing');
    } else if (Array.isArray(value)) {
      if (value.every(item => item == null || ['string','number','boolean'].includes(typeof item))) {
        const chips = document.createElement('div'); chips.className = 'fc-value-chips';
        value.forEach(item => { const chip = document.createElement('span'); chip.textContent = text(item); chips.appendChild(chip); });
        dd.appendChild(chips);
      } else {
        const list = document.createElement('div'); list.className = 'fc-nested-list';
        value.slice(0, 20).forEach((item, index) => {
          const card = document.createElement('div'); card.className = 'fc-nested-card';
          if (item && typeof item === 'object') {
            const preferred = ['title','caption','altText','url','originalUrl','creator','credit','licenseName','licenseUrl','rightsNotice','mimeType','width','height','rel','type'];
            const keys = [...preferred.filter(key => item[key] != null && item[key] !== ''), ...Object.keys(item).filter(key => !preferred.includes(key) && item[key] != null && item[key] !== '')];
            keys.slice(0, 12).forEach(key => {
              const line = document.createElement('p');
              const strong = document.createElement('strong'); strong.textContent = `${humanize(key)}: `;
              const span = document.createElement('span'); span.textContent = typeof item[key] === 'object' ? pretty(item[key]) : text(item[key]);
              line.append(strong, span); card.appendChild(line);
            });
          } else {
            const line = document.createElement('p'); line.textContent = text(item); card.appendChild(line);
          }
          list.appendChild(card);
        });
        if (value.length > 20) {
          const more = document.createElement('p'); more.className = 'fc-group-note';
          more.textContent = `${value.length - 20} more items are available in the technical source record.`;
          list.appendChild(more);
        }
        dd.appendChild(list);
      }
    } else if (typeof value === 'object') {
      const nested = document.createElement('div'); nested.className = 'fc-nested-value';
      const entries = Object.entries(value).filter(([, item]) => item !== '' && item != null && !(Array.isArray(item) && !item.length));
      if (!entries.length) {
        const missing = document.createElement('span'); missing.className = 'is-missing'; missing.textContent = 'No details supplied by the source'; nested.appendChild(missing);
      } else {
        entries.forEach(([key, item]) => {
          const line = document.createElement('div'); line.className = 'fc-nested-line';
          const name = document.createElement('span'); name.className = 'fc-nested-label'; name.textContent = humanize(key);
          const detail = document.createElement('span'); detail.className = 'fc-nested-detail';
          detail.textContent = typeof item === 'object' ? pretty(item) : text(item);
          line.append(name, detail); nested.appendChild(line);
        });
      }
      dd.appendChild(nested);
    } else {
      dd.textContent = text(value);
    }
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
      const count = document.createElement('span'); count.className = 'fc-count'; count.textContent = `${feed.entriesInWindow} stories`;
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
    stat($('feedStats'), result.statistics?.entriesInWindow, `Stories · ${result.lookbackDays} days`);
    stat($('feedStats'), result.statistics?.entriesTotal, 'Stories in feed');
    stat($('feedStats'), result.statistics?.undatedEntries, 'Without a date');
    stat($('feedStats'), result.statistics?.imageReferences, 'Image references');
    const metadata = $('feedMetadata'); metadata.replaceChildren();
    for (const [label, key] of [
      ['Feed name', 'title'], ['What this feed covers', 'description'], ['Website home', 'homePageUrl'],
      ['Feed address', 'feedUrl'], ['Language', 'language'], ['Last updated', 'updatedAt'],
      ['Feed software', 'generator'], ['Website response', 'httpStatus'], ['Content format', 'contentType'],
      ['Last changed marker', 'etag'], ['Server last-modified date', 'lastModified'], ['Time checked', 'fetchedAt'],
      ['Downloaded size (bytes)', 'responseBytes']
    ]) field(metadata, label, feed[key]);
    $('entryCount').textContent = `${result.records?.length || 0} stories`;
    renderEntries(result.records || [], $('entryList'), $('noEntries'));
    renderEntries(result.undatedRecords || [], $('undatedEntryList'), $('noUndatedEntries'));
    $('undatedCount').textContent = String(result.undatedRecords?.length || 0);
    $('feedRawMetadata').textContent = pretty({ feedInformation: feed, retrieval: feed.retrieval });
  }

  function firstImage(record) {
    const media = [...(record.media || []), ...(record.attachments || [])];
    return media.find(item => item && (item.mediaType === 'image' || /image/i.test(item.mimeType || '') || /\\.(jpe?g|png|gif|webp|avif|svg)(?:[?#].*)?$/i.test(item.url || ''))) || null;
  }

  function renderEntries(records, host, emptyNote) {
    host.replaceChildren();
    emptyNote.hidden = records.length > 0;
    for (const record of records) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'fc-entry-card';
      const image = firstImage(record);
      const url = image ? escapeUrl(image.thumbnailUrl || image.url) : '';
      if (url) {
        const thumb = document.createElement('img'); thumb.className = 'fc-entry-thumb';
        thumb.loading = 'lazy'; thumb.decoding = 'async'; thumb.src = url;
        thumb.alt = image.altText || image.caption || 'Story image';
        thumb.addEventListener('error', () => thumb.remove());
        button.appendChild(thumb);
      }
      const content = document.createElement('div'); content.className = 'fc-entry-content';
      const top = document.createElement('div'); top.className = 'fc-entry-card-top';
      const title = document.createElement('h3'); title.textContent = record.title || 'Untitled story';
      const date = document.createElement('span'); date.className = 'fc-count'; date.textContent = record.publishedAt || 'Date unavailable';
      top.append(title, date); content.appendChild(top);
      const meta = document.createElement('p'); meta.className = 'fc-entry-meta';
      meta.textContent = [record.authorName, record.language, `${(record.media || []).length} images`].filter(Boolean).join(' · ');
      content.appendChild(meta);
      const summary = document.createElement('p'); summary.className = 'fc-entry-summary';
      summary.textContent = record.summary || record.excerpt || (record.fullText || '').slice(0, 260) || 'Open this story to inspect the source article.';
      content.appendChild(summary);
      button.appendChild(content);
      button.addEventListener('click', () => openArticle(record));
      host.appendChild(button);
    }
  }

  function renderImageCard(image, host) {
    const card = document.createElement('article'); card.className = 'fc-image-card';
    const url = escapeUrl(image.url || image.originalUrl || image.thumbnailUrl);
    if (url) {
      const img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.src = url;
      img.alt = image.altText || image.caption || image.title || 'Original source image';
      img.addEventListener('error', () => img.removeAttribute('src'));
      card.appendChild(img);
    }
    const info = document.createElement('div'); info.className = 'fc-image-info';
    const name = document.createElement('strong'); name.textContent = image.title || image.caption || image.altText || 'Source image';
    info.appendChild(name);
    const attribution = [image.creator, image.credit, image.licenseName, image.rightsNotice].filter(Boolean).join(' · ');
    if (attribution) { const small = document.createElement('p'); small.textContent = attribution; info.appendChild(small); }
    if (url) {
      const link = document.createElement('a'); link.href = url; link.textContent = 'Open original image';
      link.target = '_blank'; link.rel = 'noopener noreferrer'; info.appendChild(link);
    }
    card.appendChild(info); host.appendChild(card);
  }

  function renderGroupedMetadata(result) {
    const record = result.record || {};
    const host = $('articleMetadata'); host.replaceChildren();
    const groups = [
      { title:'The story', note:'What the article is about', keys:['title','subtitle','summary','excerpt','fullText'] },
      { title:'Author and contributors', note:'Who created the article', keys:['authorName','authorId','authorUrl','contributors'] },
      { title:'Publication details', note:'When and where it appeared', keys:['publishedAt','updatedAt','language','categories','tags','topics'] },
      { title:'Publisher and source', note:'Where the article came from', keys:['sourceName','sourcePlatform','sourceType','sourceWebsiteUrl','sourceFeedUrl','originalUrl','canonicalUrl'] },
      { title:'Images, files and links', note:'Media and other material attached to the story', keys:['media','attachments','links'] },
      { title:'Copyright and usage', note:'Credits, licences and rights notices supplied by the source', keys:['rightsMetadata'] },
      { title:'Location and reader activity', note:'Place and engagement information, when supplied', keys:['location','engagement'] },
      { title:'Source trail', note:'How the information was reached and checked', keys:['provenance','collectedAt'] },
      { title:'Record identifiers', note:'Reference numbers used to identify this item', keys:['postId','sourcePostId','sourceId','viewId','schemaVersion'] },
      { title:'Additional source information', note:'Extra fields and original details supplied by the website', keys:['sourceMetadata'] },
      { title:'Inspection context', note:'Technical context; this is not a collection or publishing job', keys:['collectionContext','fullTextHtml'] }
    ];
    let shown = 0;
    for (const group of groups) {
      const details = document.createElement('details'); details.className = 'fc-info-group';
      if (['The story','Author and contributors','Publication details','Publisher and source'].includes(group.title)) details.open = true;
      const summary = document.createElement('summary');
      const heading = document.createElement('span'); heading.textContent = group.title;
      const count = document.createElement('span'); count.className = 'fc-group-count';
      count.textContent = `${group.keys.length} fields`;
      summary.append(heading, count); details.appendChild(summary);
      const note = document.createElement('p'); note.className = 'fc-group-note'; note.textContent = group.note;
      details.appendChild(note);
      const grid = document.createElement('div'); grid.className = 'fc-metadata';
      for (const key of group.keys) {
        if (key === 'fullText' && record[key]) {
          field(grid, 'Full article text', `${String(record[key]).slice(0, 1200)}${String(record[key]).length > 1200 ? ' … (continued in article above)' : ''}`, {wide:true});
        } else if (key === 'sourceMetadata' || key === 'collectionContext' || key === 'fullTextHtml') {
          const box = document.createElement('details'); box.className = 'fc-raw-field';
          const label = document.createElement('summary'); label.textContent = humanize(key);
          const pre = document.createElement('pre'); pre.textContent = record[key] == null || record[key] === '' ? 'Not provided by the source' : pretty(record[key]);
          box.append(label, pre); grid.appendChild(box);
        } else {
          field(grid, humanize(key), record[key], {wide:['summary','excerpt','rightsMetadata','provenance','media','attachments','links','location','engagement'].includes(key)});
        }
        shown++;
      }
      details.appendChild(grid); host.appendChild(details);
    }
    $('fieldCount').textContent = `${shown} information fields`;
  }

  function renderArticle(result) {
    const record = result.record || {};
    const article = result.fullArticle || {};
    $('articleTitle').textContent = article.title || record.title || 'Article';
    const articleUrl = article.articleUrl || record.canonicalUrl || record.originalUrl || '';
    $('articleUrl').textContent = articleUrl;
    $('articleUrl').href = escapeUrl(articleUrl);
    $('articleWordCount').textContent = `${Number(article.wordCount || 0).toLocaleString()} words`;
    $('articleStats').replaceChildren();
    stat($('articleStats'), result.originalImageRecords?.length, 'Source images');
    stat($('articleStats'), record.links?.length, 'Related links');
    stat($('articleStats'), article.pages?.length, 'Pages inspected');
    stat($('articleStats'), Object.keys(record).length, 'Information fields');

    const images = result.originalImageRecords || [];
    const lead = $('articleLead'); lead.replaceChildren();
    if (images.length) {
      const hero = document.createElement('figure'); hero.className = 'fc-article-hero';
      const heroUrl = escapeUrl(images[0].url || images[0].originalUrl || images[0].thumbnailUrl);
      if (heroUrl) {
        const img = document.createElement('img'); img.src = heroUrl; img.alt = images[0].altText || images[0].caption || article.title || 'Article image';
        img.loading = 'eager'; img.decoding = 'async';
        img.addEventListener('error', () => hero.remove());
        hero.appendChild(img);
      }
      const captionText = images[0].caption || images[0].credit || images[0].creator || '';
      if (captionText) { const caption = document.createElement('figcaption'); caption.textContent = captionText; hero.appendChild(caption); }
      if (hero.childNodes.length) lead.appendChild(hero);
    }
    const articleBody = $('articleBody');
    articleBody.textContent = article.fullText || record.fullText || '';
    $('noArticleText').hidden = !!articleBody.textContent.trim();

    const imageHost = $('articleImages'); imageHost.replaceChildren();
    $('articleImageCount').textContent = `${images.length} images`;
    $('noArticleImages').hidden = images.length > 0;
    images.forEach((image, index) => { if (index > 0) renderImageCard(image, imageHost); });

    renderGroupedMetadata(result);
    $('rightsEvidence').textContent = pretty({ retrieval: result.retrieval, sourceRightsEvidence: result.sourceRightsEvidence, pages: article.pages });
    $('rawRecord').textContent = pretty(record);
  }

  async function openFeed(feed) {
    state.selectedFeed = feed;
    state.selectedFeedResult = null;
    state.selectedArticle = null;
    showOnly('feedDetail');
    $('feedTitle').textContent = feed.title || 'Feed';
    $('entryList').replaceChildren();
    setStatus(`Opening ${feed.title || 'this feed'} and showing stories from the last ${period.value} days…`);
    try {
      const result = await apiPost('inspect-feed', { feedUrl: feed.url, lookbackDays: Number(period.value) });
      state.selectedFeedResult = result;
      renderFeedDetail(result);
      setStatus(`Found ${result.statistics.entriesInWindow} dated stories and ${result.statistics.undatedEntries} stories without dates.`, 'success');
      $('feedDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setStatus(error?.message || 'This feed could not be opened.', 'error');
    }
  }

  async function openArticle(record) {
    state.selectedArticle = record;
    showOnly('articleDetail');
    setStatus(`Opening “${record.title || 'this story'}”…`);
    const articleUrl = record.canonicalUrl || record.originalUrl || record.links?.[0]?.url;
    if (!articleUrl) {
      setStatus('This story does not include an article address. Its feed information is still available.', 'error');
      showOnly('feedDetail');
      return;
    }
    try {
      const result = await apiPost('inspect-article', { articleUrl, lookbackDays: Number(period.value) });
      renderArticle(result);
      setStatus(`Article opened. ${result.fullArticle.wordCount} words and ${result.originalImageRecords.length} source images found.`, 'success');
      $('articleDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setStatus(error?.message || 'The article could not be opened.', 'error');
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
    setStatus(`Searching this website for available feeds and stories from the last ${period.value} days…`);
    try {
      const result = await apiPost('discover', { url, lookbackDays: Number(period.value) });
      state.site = result.site; state.feeds = result.feeds || [];
      $('siteTitle').textContent = result.site?.title || 'Available feeds';
      $('siteUrlLabel').textContent = result.site?.finalUrl || url;
      renderFeedCards(); showOnly('feedResults');
      setStatus(`Search complete. Checked ${result.discovery.candidateLocationsChecked} feed addresses and found ${result.feedsFound} readable feeds.`, 'success');
      $('feedResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showOnly('feedResults');
      $('siteTitle').textContent = 'Search results'; $('siteUrlLabel').textContent = url;
      renderFeedCards();
      setStatus(error?.message || 'The website could not be searched.', 'error');
    } finally { discoverButton.disabled = false; discoverButton.textContent = 'Search website'; }
  });

  period.addEventListener('change', () => { if (state.site) form.requestSubmit(); });
  $('backToFeeds').addEventListener('click', () => { showOnly('feedResults'); setStatus('Choose another feed from this website.', 'success'); });
  $('backToFeed').addEventListener('click', () => { showOnly('feedDetail'); setStatus('Choose another story from this feed.', 'success'); });
})();
