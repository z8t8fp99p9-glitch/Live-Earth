(() => {
  'use strict';
  if (window.__liveEarthFeedCollectorPageInstalled) return;
  window.__liveEarthFeedCollectorPageInstalled = true;

  const READER = 'https://r.jina.ai/';
  const $ = id => document.getElementById(id);
  const form = $('inspectForm');
  const input = $('sourceUrl');
  const inspectButton = $('inspectButton');
  const status = $('status');
  const results = $('results');
  let currentRecord = null;

  const text = value => value == null ? '' : String(value).trim();
  const compact = value => text(value).replace(/\s+/g, ' ');
  const missing = 'Not available from this source';
  const unique = values => [...new Set(values.filter(Boolean))];

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.className = `fc-status${kind ? ` is-${kind}` : ''}`;
  }

  function normalizeUrl(raw) {
    let value = compact(raw);
    if (!value) throw new Error('Enter an article or website URL.');
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    let url;
    try { url = new URL(value); } catch { throw new Error('That URL is not valid.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only public HTTP and HTTPS pages can be inspected.');
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

  async function readPage(url) {
    const endpoint = READER + url.href;
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'GET', cache: 'no-store', credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
    } catch (error) {
      throw new Error(`The public reading service could not be reached: ${error?.message || 'network error'}`);
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error('The reading service is busy. Wait a moment and try again.');
      throw new Error(`The reading service could not read this page (HTTP ${response.status}).`);
    }
    const raw = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* The Reader can return Markdown instead of JSON. */ }
    const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : (parsed && typeof parsed === 'object' ? parsed : {});
    const content = typeof data.content === 'string' ? data.content :
      typeof data.markdown === 'string' ? data.markdown : raw;
    if (!content.trim()) throw new Error('The reading service returned no article text.');
    return { raw, parsed, data, content, requestedUrl: url.href };
  }

  function collectImageCandidates(value, output, baseUrl, seen = new Set(), depth = 0) {
    if (depth > 7 || value == null) return;
    if (typeof value === 'string') {
      const candidate = value.trim();
      if (/^https?:\/\//i.test(candidate) && /\.(png|jpe?g|gif|webp|avif|svg|tiff?)(?:[?#]|$)/i.test(candidate)) {
        try { const u = new URL(candidate, baseUrl); if (!seen.has(u.href)) { seen.add(u.href); output.push({ url: u.href, alt: '', caption: '', credit: '' }); } } catch {}
      }
      return;
    }
    if (Array.isArray(value)) { value.forEach(item => collectImageCandidates(item, output, baseUrl, seen, depth + 1)); return; }
    if (typeof value !== 'object') return;
    const url = value.url || value.src || value.href || value.image_url || value.imageUrl || value.contentUrl || value.thumbnail;
    const type = `${value.type || ''} ${value.mimeType || value.mime_type || ''}`.toLowerCase();
    if (typeof url === 'string' && (/image|photo|thumbnail|picture/.test(type) || /\.(png|jpe?g|gif|webp|avif|svg|tiff?)(?:[?#]|$)/i.test(url))) {
      try {
        const resolved = new URL(url, baseUrl).href;
        if (!seen.has(resolved)) {
          seen.add(resolved);
          output.push({ url: resolved, alt: compact(value.alt || value.altText || value.name || value.title), caption: compact(value.caption || value.description || value.title), credit: compact(value.credit || value.attribution || value.author) });
        }
      } catch {}
    }
    for (const [key, child] of Object.entries(value)) {
      if (/^(images?|image_url|imageurl|thumbnail|thumbnails|og:image|twitter:image)$/i.test(key) || (child && typeof child === 'object')) {
        collectImageCandidates(child, output, baseUrl, seen, depth + 1);
      }
    }
  }

  function extractImages(content, data, baseUrl) {
    const found = [];
    const seen = new Set();
    collectImageCandidates(data, found, baseUrl, seen);
    const patterns = [
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g,
      /<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi
    ];
    let match;
    while ((match = patterns[0].exec(content))) {
      try {
        const url = new URL(match[2].replace(/[),.;]+$/, ''), baseUrl).href;
        if (!seen.has(url)) { seen.add(url); found.push({ url, alt: compact(match[1]), caption: '', credit: '' }); }
      } catch {}
    }
    while ((match = patterns[1].exec(content))) {
      try {
        const url = new URL(match[1], baseUrl).href;
        if (!seen.has(url)) {
          seen.add(url);
          const alt = (match[0].match(/\balt=["']([^"']*)["']/i) || [])[1] || '';
          found.push({ url, alt: compact(alt), caption: '', credit: '' });
        }
      } catch {}
    }
    return found;
  }

  function extractLinks(content, data, baseUrl) {
    const links = [];
    const seen = new Set();
    const add = (urlValue, label = '') => {
      try {
        const url = new URL(urlValue, baseUrl);
        if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) return;
        seen.add(url.href);
        links.push({ url: url.href, label: compact(label) || url.hostname, kind: url.hostname === new URL(baseUrl).hostname ? 'INTERNAL' : 'EXTERNAL' });
      } catch {}
    };
    const scan = (value, depth = 0) => {
      if (depth > 6 || value == null) return;
      if (Array.isArray(value)) return value.forEach(v => scan(v, depth + 1));
      if (typeof value !== 'object') return;
      const href = value.url || value.href || value.link || value.uri;
      const label = value.title || value.text || value.label || value.name || value.anchor_text;
      if (typeof href === 'string') add(href, label);
      Object.values(value).forEach(v => { if (v && typeof v === 'object') scan(v, depth + 1); });
    };
    scan(data.links || data.link_summary || data);
    const markdown = /\[([^\]]{1,240})\]\((https?:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
    let match;
    while ((match = markdown.exec(content))) add(match[2].replace(/[.,;]+$/, ''), match[1]);
    const html = /href=["'](https?:\/\/[^"']+)["']/gi;
    while ((match = html.exec(content))) add(match[1]);
    return links;
  }

  function plainMarkdown(markdown) {
    const container = document.createElement('div');
    const lines = String(markdown || '').replace(/\r/g, '').split('\n');
    let paragraph = [];
    let list = null;
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const p = document.createElement('p');
      p.textContent = paragraph.join(' ').trim();
      container.appendChild(p);
      paragraph = [];
    };
    const closeList = () => { if (list) { container.appendChild(list); list = null; } };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) { flushParagraph(); closeList(); continue; }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) { flushParagraph(); closeList(); const h = document.createElement(`h${Math.min(4, heading[1].length)}`); h.textContent = heading[2]; container.appendChild(h); continue; }
      if (/^[-*_]{3,}$/.test(line)) { flushParagraph(); closeList(); const hr = document.createElement('hr'); container.appendChild(hr); continue; }
      const quote = line.match(/^>\s?(.*)$/);
      if (quote) { flushParagraph(); closeList(); const b = document.createElement('blockquote'); b.textContent = quote[1]; container.appendChild(b); continue; }
      const item = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/);
      if (item) { flushParagraph(); if (!list) list = document.createElement(/^\s*\d/.test(line) ? 'ol' : 'ul'); const li = document.createElement('li'); li.textContent = item[1]; list.appendChild(li); continue; }
      closeList(); paragraph.push(line);
    }
    flushParagraph(); closeList();
    return container;
  }

  function getMeta(data, parsed, keyList) {
    const pools = [data?.metadata, data?.meta, data?.open_graph, data?.openGraph, data?.twitter, data, parsed?.metadata, parsed];
    for (const pool of pools) {
      if (!pool || typeof pool !== 'object') continue;
      for (const key of keyList) {
        const value = pool[key];
        if (value != null && value !== '') return Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    return '';
  }

  function makeRecord(result, url) {
    const { data, parsed, content } = result;
    const images = extractImages(content, data, url.href);
    const links = extractLinks(content, data, url.href);
    const titleFromMarkdown = (content.match(/^#\s+(.+)$/m) || [])[1] || '';
    const title = compact(data.title || data.headline || getMeta(data, parsed, ['og:title', 'og_title', 'title']) || titleFromMarkdown || url.hostname);
    const paragraphs = content.split(/\n\s*\n/).filter(part => part.trim()).length;
    const headings = (content.match(/^#{1,6}\s+/gm) || []).length;
    const words = (content.match(/[\p{L}\p{N}]+/gu) || []).length;
    const videos = unique([...(content.match(/https?:\/\/[^\s)"']+\.(?:mp4|m4v|mov|webm|m3u8)(?:\?[^\s)"']*)?/gi) || [])]);
    const audios = unique([...(content.match(/https?:\/\/[^\s)"']+\.(?:mp3|wav|ogg|m4a|aac)(?:\?[^\s)"']*)?/gi) || [])]);
    const canonical = getMeta(data, parsed, ['canonical', 'canonical_url', 'canonicalUrl']) || data.url || url.href;
    const metadata = [
      ['Record ID', `fc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`],
      ['Input URL', url.href],
      ['Reader resolved URL', data.url || parsed?.url || missing],
      ['Canonical URL', canonical],
      ['Domain', url.hostname],
      ['Source / publisher name', getMeta(data, parsed, ['site_name','publisher','source','author_name']) || url.hostname],
      ['Page title', title],
      ['Article headline', getMeta(data, parsed, ['headline','og:title']) || title],
      ['Subtitle', getMeta(data, parsed, ['subtitle','subheadline','deck'])],
      ['Meta description', getMeta(data, parsed, ['description','og:description','meta_description'])],
      ['Language', getMeta(data, parsed, ['language','lang','og:locale'])],
      ['Article type', getMeta(data, parsed, ['type','og:type','article_type'])],
      ['Category', getMeta(data, parsed, ['category','section'])],
      ['Tags / keywords', getMeta(data, parsed, ['keywords','tags','article:tag'])],
      ['Author', getMeta(data, parsed, ['author','byline','article:author','author_name'])],
      ['Publisher', getMeta(data, parsed, ['publisher','site_name','organization'])],
      ['Published date', getMeta(data, parsed, ['published_time','published','datePublished','date'])],
      ['Last modified date', getMeta(data, parsed, ['modified_time','updated','dateModified','last_modified'])],
      ['Timezone', getMeta(data, parsed, ['timezone','time_zone'])],
      ['Inspection time (UTC)', new Date().toISOString()],
      ['Retrieval service', 'Jina Reader (r.jina.ai)'],
      ['Reader response format', parsed ? 'JSON / structured response' : 'Markdown / text response'],
      ['HTTP status', '200 OK'],
      ['Content type', getMeta(data, parsed, ['content_type','mime_type']) || (parsed ? 'application/json response' : 'text/markdown response')],
      ['Full text characters', content.length],
      ['Estimated word count', words],
      ['Paragraph / block count', paragraphs],
      ['Heading count', headings],
      ['Image count', images.length],
      ['Video URL count', videos.length],
      ['Audio URL count', audios.length],
      ['Total discovered links', links.length],
      ['Internal links', links.filter(x => x.kind === 'INTERNAL').length],
      ['External links', links.filter(x => x.kind === 'EXTERNAL').length],
      ['Robots directive', getMeta(data, parsed, ['robots','robots_meta','robots_directive'])],
      ['Open Graph title', getMeta(data, parsed, ['og:title','og_title'])],
      ['Open Graph description', getMeta(data, parsed, ['og:description','og_description'])],
      ['Open Graph image', getMeta(data, parsed, ['og:image','og_image','image'])],
      ['Twitter card', getMeta(data, parsed, ['twitter:card','twitter_card'])],
      ['Structured data types', getMeta(data, parsed, ['structured_data_types','schema_types','json_ld_type'])],
      ['RSS / Atom references', getMeta(data, parsed, ['feeds','feed_urls','rss'])],
      ['Sitemap references', getMeta(data, parsed, ['sitemaps','sitemap_urls','sitemap'])],
      ['Image credits / attribution', images.map(x => x.credit).filter(Boolean).join(' | ')],
      ['Copyright notice', getMeta(data, parsed, ['copyright','copyright_notice','license'])],
      ['Full article text retrieved', content.trim().length ? 'Yes' : 'No'],
      ['Original image URLs retrieved', images.length ? 'Yes' : 'No'],
      ['Extraction notes', getMeta(data, parsed, ['warning','notes','extraction_notes'])],
      ['Reader request ID', getMeta(data, parsed, ['id','request_id'])]
    ];
    return {
      schema: 'LIVE_EARTH_FEED_INSPECTION_V1',
      inspectedAt: new Date().toISOString(),
      requestedUrl: url.href,
      title,
      fullText: content,
      images,
      links,
      videoUrls: videos,
      audioUrls: audios,
      fields: metadata.map(([label, value]) => ({ label, value: value == null || value === '' ? missing : value })),
      rawReaderResponse: parsed || { content },
      extraction: { reader: 'Jina Reader', responseWasJson: !!parsed, characters: content.length, words, images: images.length, links: links.length }
    };
  }

  function renderArticle(record) {
    const target = $('articleBody');
    target.replaceChildren(plainMarkdown(record.fullText));
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
    const entries = [...record.links, ...record.videoUrls.map(url => ({ url, label: 'Video media', kind: 'VIDEO' })), ...record.audioUrls.map(url => ({ url, label: 'Audio media', kind: 'AUDIO' }))];
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
    $('sourceLink').href = record.requestedUrl;
    $('sourceLink').textContent = record.requestedUrl;
    $('stats').replaceChildren();
    [
      [record.extraction.words.toLocaleString(), 'WORDS'],
      [record.images.length.toLocaleString(), 'IMAGES'],
      [record.links.length.toLocaleString(), 'LINKS'],
      [record.fields.length.toLocaleString(), 'FIELDS']
    ].forEach(([value, label]) => { const box = document.createElement('div'); box.className = 'fc-stat'; const strong = document.createElement('strong'); strong.textContent = value; const span = document.createElement('span'); span.textContent = label; box.append(strong, span); $('stats').appendChild(box); });
    renderImages(record); renderArticle(record); renderFields(record); renderLinks(record);
    $('rawMetadata').textContent = JSON.stringify(record.rawReaderResponse, null, 2);
    results.hidden = false;
  }

  function safeFilename(title) {
    return (text(title).normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 64) || 'feed-inspection');
  }

  function exportRecord() {
    if (!currentRecord) return;
    const blob = new Blob([JSON.stringify(currentRecord, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${safeFilename(currentRecord.title)}-inspection.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus('Export prepared: complete retrieved article text, all available fields, image URLs, links and raw reader response are included.', 'success');
  }

  async function shareRecord() {
    if (!currentRecord) return;
    const record = currentRecord;
    const textBody = `${record.title}\n\nSource: ${record.requestedUrl}\n\n${record.fullText}\n\nImages:\n${record.images.map(x => x.url).join('\n')}\n\nSource fields:\n${record.fields.map(x => `${x.label}: ${x.value}`).join('\n')}`;
    try {
      const file = new File([textBody], `${safeFilename(record.title)}-inspection.txt`, { type: 'text/plain' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: record.title, text: `Complete source inspection: ${record.requestedUrl}`, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: record.title, text: `${record.title}\n${record.requestedUrl}\n\n${record.fullText.slice(0, 5000)}` });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textBody);
        setStatus('Complete inspection text copied to the clipboard.', 'success');
      } else {
        throw new Error('Sharing and clipboard access are not available in this browser. Use Export instead.');
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setStatus(error?.message || 'The share action could not be completed. You can still use Export.', 'error');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    results.hidden = true; currentRecord = null;
    let url;
    try { url = normalizeUrl(input.value); }
    catch (error) { setStatus(error.message, 'error'); return; }
    inspectButton.disabled = true; inspectButton.textContent = 'Reading…';
    setStatus('Reading the public page and extracting its full text, images, links and source metadata…');
    try {
      const result = await readPage(url);
      const record = makeRecord(result, url);
      display(record);
      setStatus(`Inspection complete. Retrieved ${record.extraction.words.toLocaleString()} words, ${record.images.length} image URLs and ${record.fields.length} source fields. Missing metadata is labelled rather than guessed.`, 'success');
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setStatus(error?.message || 'The page could not be inspected.', 'error');
    } finally {
      inspectButton.disabled = false; inspectButton.textContent = 'Inspect';
    }
  });
  $('shareButton').addEventListener('click', shareRecord);
  $('exportButton').addEventListener('click', exportRecord);
})();
