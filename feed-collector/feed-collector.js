(() => {
  'use strict';
  if (window.__liveEarthFeedCollectorPageInstalled) return;
  window.__liveEarthFeedCollectorPageInstalled = true;

  const $ = id => document.getElementById(id);
  const form = $('inspectForm');
  const input = $('sourceUrl');
  const inspectButton = $('inspectButton');
  const status = $('status');
  const results = $('results');
  const missing = 'Not available in the supplied source';
  const maxHtmlBytes = 20 * 1024 * 1024;
  let currentRecord = null;

  const clean = value => value == null ? '' : String(value).replace(/\u00a0/g, ' ').replace(/[\t\f\v ]+/g, ' ').trim();
  const unique = values => [...new Set(values.filter(Boolean))];
  const wordCount = value => (String(value || '').match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
  const safeText = value => clean(value).slice(0, 12000);

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.className = `fc-status${kind ? ` is-${kind}` : ''}`;
  }

  function normalizeUrl(raw, optional = false) {
    let value = clean(raw);
    if (!value) {
      if (optional) return null;
      throw new Error('Enter a public article URL, or use the HTML import option.');
    }
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    let url;
    try { url = new URL(value); } catch { throw new Error('That page URL is not valid.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public HTTP and HTTPS pages are supported.');
    if (url.username || url.password) throw new Error('URLs containing login credentials are not supported.');
    const host = url.hostname.toLowerCase();
    const privateHost = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:') ||
      /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (privateHost) throw new Error('For safety, only public websites can be inspected.');
    url.hash = '';
    return url;
  }

  function resolveHttpUrl(value, baseUrl) {
    const raw = clean(value);
    if (!raw || /^(?:data:|javascript:|blob:|mailto:|tel:)/i.test(raw)) return '';
    try {
      const candidate = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
      return ['http:', 'https:'].includes(candidate.protocol) ? candidate.href : '';
    } catch { return ''; }
  }

  async function directFetch(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      // Deliberately request the source itself. No proxy, third-party reader or credentials.
      const response = await fetch(url.href, {
        method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
        redirect: 'follow', signal: controller.signal,
        headers: { Accept: 'text/html,application/xhtml+xml;q=0.9' }
      });
      if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`);
      const finalUrl = normalizeUrl(response.url || url.href);
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > maxHtmlBytes) throw new Error('This page is larger than the 20 MB inspection limit.');
      const contentType = response.headers.get('content-type') || '';
      if (contentType && !/(?:text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
        throw new Error(`The URL returned ${contentType}, not an HTML page.`);
      }
      const html = await response.text();
      if (!html.trim()) throw new Error('The website returned an empty page.');
      if (new Blob([html]).size > maxHtmlBytes) throw new Error('This page is larger than the 20 MB inspection limit.');
      return {
        html,
        baseUrl: finalUrl.href,
        requestedUrl: url.href,
        retrievalMethod: 'Direct browser fetch',
        httpStatus: `${response.status} ${response.statusText || 'OK'}`,
        contentType: contentType || missing,
        responseHeaders: {
          contentType,
          contentLanguage: response.headers.get('content-language') || '',
          lastModified: response.headers.get('last-modified') || '',
          etag: response.headers.get('etag') || ''
        }
      };
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('The website took too long to respond. You can try importing its saved HTML instead.');
      if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error?.message || '')) {
        throw new Error('Your browser could not read this website directly. The site may block cross-origin browser access (CORS). No proxy or external reader is used. Save the page as an HTML file and import it below, or paste its HTML source.');
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function getMeta(doc, names) {
    const wanted = new Set(names.map(value => value.toLowerCase()));
    for (const meta of doc.querySelectorAll('meta[name],meta[property],meta[itemprop]')) {
      const key = clean(meta.getAttribute('property') || meta.getAttribute('name') || meta.getAttribute('itemprop')).toLowerCase();
      if (wanted.has(key)) {
        const value = clean(meta.getAttribute('content') || meta.getAttribute('value'));
        if (value) return value;
      }
    }
    return '';
  }

  function parseJsonLd(doc) {
    const records = [];
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      const raw = script.textContent || '';
      if (!raw.trim()) continue;
      try { records.push(JSON.parse(raw)); }
      catch { records.push({ _parseError: 'Invalid JSON-LD block', raw: raw.slice(0, 4000) }); }
    }
    return records;
  }

  function flattenStructuredData(value, output = [], depth = 0) {
    if (depth > 8 || value == null) return output;
    if (Array.isArray(value)) { for (const item of value) flattenStructuredData(item, output, depth + 1); return output; }
    if (typeof value !== 'object') return output;
    output.push(value);
    if (value['@graph']) flattenStructuredData(value['@graph'], output, depth + 1);
    for (const key of ['mainEntity','mainEntityOfPage','article','itemListElement','hasPart','subjectOf']) {
      if (value[key] && typeof value[key] === 'object') flattenStructuredData(value[key], output, depth + 1);
    }
    return output;
  }

  function findArticleObject(jsonLd) {
    const all = flattenStructuredData(jsonLd);
    return all.find(item => {
      const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
      return types.some(type => /Article|NewsArticle|BlogPosting|Report|ScholarlyArticle|SocialMediaPosting/i.test(String(type || '')));
    }) || null;
  }

  function textBlocksFromElement(element) {
    if (!element) return [];
    const clone = element.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,canvas,nav,footer,aside,form,button,iframe,dialog,[hidden],[aria-hidden="true"],.advertisement,.advert,.social-share,.related-content,.newsletter,.cookie,.paywall').forEach(node => node.remove());
    const blocks = [];
    const candidates = clone.querySelectorAll('h1,h2,h3,h4,h5,p,li,blockquote,pre,figcaption');
    for (const node of candidates) {
      const content = clean(node.textContent);
      if (content.length < 2) continue;
      const tag = node.tagName.toLowerCase();
      const block = { tag: /^h[1-5]$/.test(tag) ? tag : tag === 'li' ? 'li' : tag === 'blockquote' ? 'blockquote' : 'p', text: content };
      const previous = blocks[blocks.length - 1];
      if (previous && previous.text === block.text) continue;
      blocks.push(block);
    }
    if (blocks.length) return blocks;
    const fallback = clean(clone.textContent).split(/\n{2,}|(?<=[.!?])\s{2,}/).map(clean).filter(Boolean);
    return fallback.map(text => ({ tag: 'p', text }));
  }

  function articleBlocks(doc, articleObject) {
    if (articleObject && typeof articleObject.articleBody === 'string' && clean(articleObject.articleBody)) {
      const body = articleObject.articleBody.trim();
      const fragment = new DOMParser().parseFromString(`<div>${body}</div>`, 'text/html').body.firstElementChild;
      if (fragment && /<\/?(?:p|h[1-6]|ul|ol|li|blockquote|br)\b/i.test(body)) {
        const blocks = textBlocksFromElement(fragment);
        if (blocks.length) return { blocks, method: 'JSON-LD articleBody' };
      }
      return { blocks: body.split(/\n{2,}/).map(clean).filter(Boolean).map(text => ({ tag: 'p', text })), method: 'JSON-LD articleBody' };
    }
    const candidates = [
      doc.querySelector('[itemprop="articleBody"]'),
      doc.querySelector('article'),
      doc.querySelector('[role="main"]'),
      doc.querySelector('main'),
      doc.body
    ].filter(Boolean);
    let selected = [];
    for (const candidate of candidates) {
      const blocks = textBlocksFromElement(candidate);
      const chars = blocks.reduce((sum, block) => sum + block.text.length, 0);
      if (chars > selected.reduce((sum, block) => sum + block.text.length, 0)) selected = blocks;
      if (chars > 500) return { blocks, method: candidate.tagName.toLowerCase() };
    }
    return { blocks: selected, method: 'page text fallback' };
  }

  function getImageUrl(image, baseUrl) {
    const attrs = ['src','data-src','data-original','data-lazy-src','data-url','srcset'];
    for (const attr of attrs) {
      const value = image.getAttribute?.(attr);
      if (!value) continue;
      const candidate = attr === 'srcset' ? value.split(',').map(part => clean(part).split(/\s+/)[0]).filter(Boolean).pop() : value;
      const resolved = resolveHttpUrl(candidate, baseUrl);
      if (resolved) return resolved;
    }
    return '';
  }

  function structuredImageValues(jsonLd, baseUrl, output, seen) {
    const all = flattenStructuredData(jsonLd);
    for (const item of all) {
      const value = item.image || item.thumbnailUrl || item.thumbnail;
      const values = Array.isArray(value) ? value : [value];
      for (const entry of values) {
        const urlValue = typeof entry === 'string' ? entry : entry?.url || entry?.contentUrl || entry?.thumbnailUrl;
        const url = resolveHttpUrl(urlValue, baseUrl);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        output.push({ url, alt: clean(entry?.caption || item.headline || item.name), caption: clean(entry?.caption || ''), credit: clean(entry?.creditText || entry?.copyrightHolder?.name || entry?.creator?.name || '') });
      }
    }
  }

  function extractImages(doc, jsonLd, baseUrl) {
    const output = [];
    const seen = new Set();
    const add = (urlValue, details = {}) => {
      const url = resolveHttpUrl(urlValue, baseUrl);
      if (!url || seen.has(url)) return;
      seen.add(url);
      output.push({ url, alt: safeText(details.alt), caption: safeText(details.caption), credit: safeText(details.credit), source: details.source || 'HTML image reference' });
    };
    for (const meta of doc.querySelectorAll('meta[property="og:image"],meta[property="og:image:url"],meta[name="twitter:image"],meta[name="twitter:image:src"]')) {
      add(meta.content, { alt: getMeta(doc, ['og:image:alt','twitter:image:alt']), source: 'Open Graph / Twitter metadata' });
    }
    for (const video of doc.querySelectorAll('video[poster]')) {
      add(video.getAttribute('poster'), { alt: 'Video poster image', caption: clean(video.getAttribute('title')), source: 'HTML video poster' });
    }
    for (const img of doc.querySelectorAll('img,picture source')) {
      const url = getImageUrl(img, baseUrl);
      if (!url) continue;
      const figure = img.closest('figure');
      const caption = clean(figure?.querySelector('figcaption')?.textContent || img.getAttribute('title') || '');
      const explicitCredit = img.getAttribute('data-credit') || img.getAttribute('data-creator') || '';
      const captionCredit = /(?:photo|image|picture|credit|courtesy|source)\s*[:—-]/i.test(caption) ? caption : '';
      add(url, { alt: img.getAttribute('alt'), caption, credit: explicitCredit || captionCredit, source: 'HTML img/source element' });
    }
    structuredImageValues(jsonLd, baseUrl, output, seen);
    return output;
  }

  function extractLinks(doc, baseUrl) {
    const links = [];
    const seen = new Set();
    for (const anchor of doc.querySelectorAll('a[href]')) {
      if (links.length >= 2000) break;
      const url = resolveHttpUrl(anchor.getAttribute('href'), baseUrl);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      let host = '';
      try { host = new URL(url).hostname; } catch { /* ignore */ }
      links.push({ url, label: safeText(anchor.textContent || anchor.getAttribute('aria-label') || anchor.getAttribute('title')) || host || url, kind: baseUrl && host === new URL(baseUrl).hostname ? 'INTERNAL' : 'EXTERNAL' });
    }
    return links;
  }

  function extractMedia(doc, baseUrl) {
    const videos = unique([...doc.querySelectorAll('video[src],video source[src]')].map(node => resolveHttpUrl(node.getAttribute('src'), baseUrl)));
    const audios = unique([...doc.querySelectorAll('audio[src],audio source[src]')].map(node => resolveHttpUrl(node.getAttribute('src'), baseUrl)));
    return { videos, audios };
  }

  function extractFeedRefs(doc, baseUrl) {
    return unique([...doc.querySelectorAll('link[rel~="alternate"][href]')]
      .filter(link => /rss|atom|feed|xml/i.test(`${link.type || ''} ${link.title || ''} ${link.href || ''}`))
      .map(link => resolveHttpUrl(link.getAttribute('href'), baseUrl)));
  }

  function extractSitemaps(doc, baseUrl) {
    const fromLinks = [...doc.querySelectorAll('a[href],link[href]')]
      .filter(node => /sitemap(?:\.xml)?/i.test(`${node.getAttribute('href') || ''} ${node.textContent || ''}`))
      .map(node => resolveHttpUrl(node.getAttribute('href'), baseUrl));
    return unique(fromLinks);
  }

  function jsonValue(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(jsonValue).filter(Boolean).join(', ');
    if (typeof value === 'object') return clean(value.name || value.url || value['@id'] || JSON.stringify(value));
    return '';
  }

  function buildRecord(source) {
    const doc = new DOMParser().parseFromString(source.html, 'text/html');
    if (!doc || !doc.documentElement) throw new Error('The supplied content could not be parsed as an HTML document.');
    const baseFromDocument = doc.querySelector('base[href]')?.getAttribute('href') || source.baseUrl || '';
    const baseUrl = resolveHttpUrl(baseFromDocument, source.baseUrl || '') || source.baseUrl || '';
    const jsonLd = parseJsonLd(doc);
    const article = findArticleObject(jsonLd);
    const extracted = articleBlocks(doc, article);
    const fullText = extracted.blocks.map(block => block.text).join('\n\n').trim();
    if (!fullText && !doc.querySelector('meta, title')) throw new Error('No readable article text or page metadata was found in this HTML.');

    const images = extractImages(doc, jsonLd, baseUrl);
    const links = extractLinks(doc, baseUrl);
    const media = extractMedia(doc, baseUrl);
    const feedRefs = extractFeedRefs(doc, baseUrl);
    const sitemapRefs = extractSitemaps(doc, baseUrl);
    const metaTitle = getMeta(doc, ['og:title','twitter:title','headline']);
    const title = clean(article?.headline || article?.name || doc.querySelector('title')?.textContent || metaTitle || 'Untitled page');
    const canonicalUrl = resolveHttpUrl(doc.querySelector('link[rel~="canonical"]')?.getAttribute('href') || getMeta(doc, ['og:url']), baseUrl) || (baseUrl || missing);
    const author = jsonValue(article?.author) || getMeta(doc, ['author','article:author','byl','parsely-author']);
    const publisher = jsonValue(article?.publisher) || getMeta(doc, ['og:site_name','publisher','application-name']);
    const published = jsonValue(article?.datePublished) || getMeta(doc, ['article:published_time','datepublished','pubdate','publish-date','date']);
    const modified = jsonValue(article?.dateModified) || getMeta(doc, ['article:modified_time','datemodified','last-modified','updated']);
    const imageCredits = images.map(image => image.credit).filter(Boolean);
    const contentText = fullText;
    const words = wordCount(contentText);
    const headingCount = extracted.blocks.filter(block => /^h[1-5]$/.test(block.tag)).length;
    const paragraphs = extracted.blocks.filter(block => block.tag === 'p').length;
    const internalLinks = links.filter(link => link.kind === 'INTERNAL').length;
    const externalLinks = links.filter(link => link.kind === 'EXTERNAL').length;
    const types = unique(flattenStructuredData(jsonLd).flatMap(item => Array.isArray(item['@type']) ? item['@type'] : [item['@type']]).map(clean));
    const robots = getMeta(doc, ['robots','googlebot','bingbot']);
    const copyright = getMeta(doc, ['copyright','license','dcterms.rights','rights']);
    const requestedUrl = source.requestedUrl || canonicalUrl || 'Imported HTML source';
    const sourceName = publisher || clean(doc.querySelector('meta[property="og:site_name"]')?.content) || (baseUrl ? new URL(baseUrl).hostname : 'Imported HTML');
    const recordId = `fc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const rawSourceMetadata = {
      retrievalMethod: source.retrievalMethod,
      requestedUrl: source.requestedUrl || '',
      resolvedBaseUrl: baseUrl || '',
      httpStatus: source.httpStatus || 'Not applicable — local source import',
      contentType: source.contentType || 'text/html (local source)',
      responseHeaders: source.responseHeaders || {},
      documentTitle: clean(doc.querySelector('title')?.textContent),
      metaTags: [...doc.querySelectorAll('meta')].map(meta => ({ name: meta.getAttribute('name') || '', property: meta.getAttribute('property') || '', itemprop: meta.getAttribute('itemprop') || '', content: meta.getAttribute('content') || '' })),
      linkTags: [...doc.querySelectorAll('link[href]')].map(link => ({ rel: link.rel || '', type: link.type || '', title: link.title || '', href: resolveHttpUrl(link.getAttribute('href'), baseUrl) || link.getAttribute('href') || '' })),
      jsonLd,
      articleExtractionMethod: extracted.method,
      imageReferences: images,
      discoveredLinks: links,
      feedReferences: feedRefs,
      sitemapReferences: sitemapRefs
    };

    const fields = [
      ['Record ID', recordId],
      ['Input URL', source.requestedUrl || 'Imported HTML source'],
      ['Resolved page URL', source.baseUrl || missing],
      ['Canonical URL', canonicalUrl],
      ['Domain', baseUrl ? new URL(baseUrl).hostname : missing],
      ['Source / publisher name', sourceName],
      ['Page title', title],
      ['Article headline', clean(article?.headline || metaTitle) || title],
      ['Subtitle / description', jsonValue(article?.description) || getMeta(doc, ['description','og:description','twitter:description'])],
      ['Meta description', getMeta(doc, ['description','og:description'])],
      ['Language', doc.documentElement.getAttribute('lang') || getMeta(doc, ['language','og:locale'])],
      ['Article type', jsonValue(article?.['@type']) || getMeta(doc, ['og:type','type'])],
      ['Section / category', jsonValue(article?.articleSection) || getMeta(doc, ['article:section','section','category'])],
      ['Tags / keywords', jsonValue(article?.keywords) || getMeta(doc, ['keywords','news_keywords'])],
      ['Author', author],
      ['Publisher', publisher],
      ['Published date', published],
      ['Last modified date', modified],
      ['Timezone', getMeta(doc, ['timezone','time_zone'])],
      ['Inspection time (UTC)', new Date().toISOString()],
      ['Retrieval method', source.retrievalMethod],
      ['HTTP status', source.httpStatus || 'Not applicable — local HTML import'],
      ['Content type', source.contentType || 'text/html (local source)'],
      ['Full text characters', contentText.length],
      ['Estimated word count', words],
      ['Paragraph count', paragraphs],
      ['Heading count', headingCount],
      ['Image reference count', images.length],
      ['Video URL count', media.videos.length],
      ['Audio URL count', media.audios.length],
      ['Total discovered links', links.length],
      ['Internal links', internalLinks],
      ['External links', externalLinks],
      ['Robots directive', robots],
      ['Open Graph title', getMeta(doc, ['og:title'])],
      ['Open Graph description', getMeta(doc, ['og:description'])],
      ['Open Graph image', getMeta(doc, ['og:image','og:image:url'])],
      ['Twitter card', getMeta(doc, ['twitter:card'])],
      ['Structured data types', types.join(', ')],
      ['RSS / Atom references', feedRefs.join(' | ')],
      ['Sitemap references', sitemapRefs.join(' | ')],
      ['Image credits / attribution', imageCredits.join(' | ')],
      ['Copyright / licence notice', copyright],
      ['Full text found in source', contentText ? 'Yes' : 'No'],
      ['Original image references found', images.length ? 'Yes' : 'No'],
      ['Article extraction method', extracted.method],
      ['Page canonical declaration', doc.querySelector('link[rel~="canonical"]')?.getAttribute('href') || missing],
      ['HTML document title', clean(doc.querySelector('title')?.textContent)],
      ['Structured data blocks', jsonLd.length]
    ].map(([label, value]) => ({ label, value: value === '' || value == null ? missing : value }));

    return {
      schema: 'LIVE_EARTH_FEED_INSPECTION_V2',
      inspectedAt: new Date().toISOString(),
      requestedUrl,
      title,
      fullText,
      textBlocks: extracted.blocks,
      images,
      links,
      videoUrls: media.videos,
      audioUrls: media.audios,
      fields,
      rawSourceMetadata,
      extraction: { method: source.retrievalMethod, articleMethod: extracted.method, characters: fullText.length, words, images: images.length, links: links.length, videos: media.videos.length, audios: media.audios.length, fields: fields.length }
    };
  }

  function renderArticle(record) {
    const target = $('articleBody');
    target.replaceChildren();
    for (const block of record.textBlocks || []) {
      const tag = /^h[1-5]$/.test(block.tag) ? block.tag : block.tag === 'blockquote' ? 'blockquote' : 'p';
      const node = document.createElement(tag);
      node.textContent = block.text;
      target.appendChild(node);
    }
    if (!target.childElementCount && record.fullText) {
      for (const paragraph of record.fullText.split(/\n{2,}/).map(clean).filter(Boolean)) {
        const node = document.createElement('p'); node.textContent = paragraph; target.appendChild(node);
      }
    }
    $('wordCount').textContent = `${record.extraction.words.toLocaleString()} words`;
  }

  function renderImages(record) {
    const host = $('images');
    host.replaceChildren();
    $('imageCount').textContent = String(record.images.length);
    $('noImages').hidden = record.images.length > 0;
    for (const image of record.images) {
      const card = document.createElement('article'); card.className = 'fc-image-card';
      const img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.src = image.url; img.alt = image.alt || image.caption || 'Original source image';
      img.addEventListener('error', () => { img.alt = 'Image host blocked direct preview; open the original image URL below.'; img.removeAttribute('src'); img.style.minHeight = '110px'; });
      const info = document.createElement('div'); info.className = 'fc-image-info';
      const title = document.createElement('strong'); title.textContent = image.caption || image.alt || 'Source image';
      const link = document.createElement('a'); link.href = image.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = image.url;
      info.append(title, link);
      if (image.credit) { const credit = document.createElement('small'); credit.textContent = `Credit: ${image.credit}`; info.appendChild(credit); }
      card.append(img, info); host.appendChild(card);
    }
  }

  function renderFields(record) {
    const host = $('metadata'); host.replaceChildren();
    for (const field of record.fields) {
      const wrapper = document.createElement('dl'); wrapper.className = 'fc-field';
      const dt = document.createElement('dt'); dt.textContent = field.label;
      const dd = document.createElement('dd'); dd.textContent = String(field.value);
      if (field.value === missing) dd.classList.add('is-missing');
      wrapper.append(dt, dd); host.appendChild(wrapper);
    }
    $('fieldCount').textContent = `${record.fields.length} fields`;
  }

  function renderLinks(record) {
    const host = $('links'); host.replaceChildren();
    const entries = [
      ...record.links,
      ...record.videoUrls.map(url => ({ url, label: 'Video media', kind: 'VIDEO' })),
      ...record.audioUrls.map(url => ({ url, label: 'Audio media', kind: 'AUDIO' }))
    ];
    $('linkCount').textContent = String(entries.length);
    $('noLinks').hidden = entries.length > 0;
    for (const entry of entries) {
      const row = document.createElement('div'); row.className = 'fc-link-item';
      const anchor = document.createElement('a'); anchor.href = entry.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.textContent = entry.label || entry.url;
      const kind = document.createElement('span'); kind.className = 'fc-link-kind'; kind.textContent = entry.kind;
      row.append(anchor, kind); host.appendChild(row);
    }
  }

  function display(record) {
    currentRecord = record;
    $('articleTitle').textContent = record.title;
    const sourceLink = $('sourceLink');
    sourceLink.textContent = record.requestedUrl;
    const sourceIsUrl = /^https?:\/\//i.test(record.requestedUrl);
    if (sourceIsUrl) sourceLink.href = record.requestedUrl;
    else sourceLink.removeAttribute('href');
    $('stats').replaceChildren();
    [
      [record.extraction.words.toLocaleString(), 'WORDS'],
      [record.images.length.toLocaleString(), 'IMAGES'],
      [record.links.length.toLocaleString(), 'LINKS'],
      [record.fields.length.toLocaleString(), 'FIELDS']
    ].forEach(([value, label]) => {
      const box = document.createElement('div'); box.className = 'fc-stat';
      const strong = document.createElement('strong'); strong.textContent = value;
      const span = document.createElement('span'); span.textContent = label;
      box.append(strong, span); $('stats').appendChild(box);
    });
    renderImages(record); renderArticle(record); renderFields(record); renderLinks(record);
    $('rawMetadata').textContent = JSON.stringify(record.rawSourceMetadata, null, 2);
    results.hidden = false;
  }

  function safeFilename(title) {
    return (clean(title).normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 64) || 'feed-inspection');
  }

  function exportRecord() {
    if (!currentRecord) return;
    const blob = new Blob([JSON.stringify(currentRecord, null, 2)], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = `${safeFilename(currentRecord.title)}-inspection.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    setStatus('Export prepared. The JSON contains the extracted article text, source fields, original image URLs, links and raw metadata evidence.', 'success');
  }

  async function shareRecord() {
    if (!currentRecord) return;
    const record = currentRecord;
    const body = [
      record.title,
      `Source: ${record.requestedUrl}`,
      '',
      'FULL SOURCE TEXT',
      record.fullText,
      '',
      'IMAGE REFERENCES',
      ...record.images.map(image => `${image.url}${image.credit ? ` — ${image.credit}` : ''}`),
      '',
      'LINKS',
      ...record.links.map(link => `${link.label}: ${link.url}`),
      '',
      'SOURCE FIELDS',
      ...record.fields.map(field => `${field.label}: ${field.value}`),
      '',
      'RAW SOURCE METADATA',
      JSON.stringify(record.rawSourceMetadata, null, 2)
    ].join('\n');
    try {
      const file = new File([body], `${safeFilename(record.title)}-inspection.txt`, { type: 'text/plain' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: record.title, text: `Source inspection: ${record.requestedUrl}`, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: record.title, text: body.slice(0, 12000) });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body);
        setStatus('Complete inspection text copied to the clipboard.', 'success');
      } else throw new Error('Sharing and clipboard access are unavailable here. Use Export instead.');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setStatus(error?.message || 'The share action could not be completed. You can still use Export.', 'error');
    }
  }

  async function inspectSource(source) {
    results.hidden = true;
    currentRecord = null;
    setStatus('Reading the supplied HTML locally and extracting article text, images, links and source metadata…');
    const record = buildRecord(source);
    display(record);
    setStatus(`Inspection complete. Extracted ${record.extraction.words.toLocaleString()} words, ${record.images.length} image references and ${record.fields.length} source fields. Missing metadata is shown rather than guessed.`, 'success');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    let url;
    try { url = normalizeUrl(input.value); }
    catch (error) { setStatus(error.message, 'error'); return; }
    inspectButton.disabled = true; inspectButton.textContent = 'Reading…';
    try {
      const source = await directFetch(url);
      await inspectSource(source);
    } catch (error) {
      setStatus(error?.message || 'The page could not be inspected.', 'error');
    } finally {
      inspectButton.disabled = false; inspectButton.textContent = 'Inspect URL';
    }
  });

  $('htmlFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') { setStatus('Choose an HTML or HTM file.', 'error'); return; }
    if (file.size > maxHtmlBytes) { setStatus('This HTML file is larger than the 20 MB inspection limit.', 'error'); return; }
    let baseUrl;
    try { baseUrl = normalizeUrl(input.value, true)?.href || ''; }
    catch (error) { setStatus(error.message, 'error'); return; }
    try {
      const html = await file.text();
      await inspectSource({ html, baseUrl, requestedUrl: baseUrl || `Imported HTML file: ${file.name}`, retrievalMethod: 'Local HTML file import', httpStatus: 'Not applicable — local HTML file', contentType: file.type || 'text/html' });
    } catch (error) {
      setStatus(error?.message || 'The HTML file could not be inspected.', 'error');
    }
  });

  $('inspectHtmlButton').addEventListener('click', async () => {
    const html = $('sourceHtml').value;
    if (!clean(html)) { setStatus('Paste the page HTML source first.', 'error'); return; }
    if (new Blob([html]).size > maxHtmlBytes) { setStatus('The pasted HTML is larger than the 20 MB inspection limit.', 'error'); return; }
    let baseUrl;
    try { baseUrl = normalizeUrl(input.value, true)?.href || ''; }
    catch (error) { setStatus(error.message, 'error'); return; }
    $('inspectHtmlButton').disabled = true;
    try {
      await inspectSource({ html, baseUrl, requestedUrl: baseUrl || 'Pasted HTML source', retrievalMethod: 'Pasted HTML source', httpStatus: 'Not applicable — pasted HTML', contentType: 'text/html (pasted)' });
    } catch (error) {
      setStatus(error?.message || 'The pasted HTML could not be inspected.', 'error');
    } finally { $('inspectHtmlButton').disabled = false; }
  });

  $('clearHtmlButton').addEventListener('click', () => {
    $('sourceHtml').value = '';
    $('htmlFile').value = '';
    setStatus('Local HTML source cleared.');
  });
  $('shareButton').addEventListener('click', shareRecord);
  $('exportButton').addEventListener('click', exportRecord);
})();
