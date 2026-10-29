/* LIVE // EARTH Magazine Engine V1 — reusable, text-first editorial renderer.
   Loaded only when a reader opens Weekly Publish; never part of the app shell.
   The engine renders already-validated issue data. It does not fetch news, create
   facts, save content, or download images. Any future editorial profile can reuse it. */
(() => {
  'use strict';
  if (window.LiveEarthMagazineEngine?.version === 'v1') return;

  const STYLE_ID = 'le-live-earth-magazine-engine-v1-style';
  const PROFILES = Object.freeze({
    'space-journal': { name: 'The Sunday Space Journal', strap: 'A considered view of the cosmos', accent: '#e1b58b', soft: 'rgba(225,181,139,.15)', deep: '#091522', ink: '#f5f2ed', muted: '#aebdca' },
    'earth-journal': { name: 'Earth Journal', strap: 'A living planet, closely observed', accent: '#8bd2a8', soft: 'rgba(139,210,168,.15)', deep: '#071a17', ink: '#eff8f1', muted: '#b0c9bc' },
    'moon-journal': { name: 'Moon Journal', strap: 'Light, shadow and lunar time', accent: '#b8d0f7', soft: 'rgba(184,208,247,.16)', deep: '#0c1425', ink: '#f2f5fc', muted: '#b0bdd3' },
    'solar-journal': { name: 'Solar Journal', strap: 'Reading the moods of our star', accent: '#ffc078', soft: 'rgba(255,192,120,.16)', deep: '#21120b', ink: '#fff4e8', muted: '#d5bda5' },
    'deep-space-journal': { name: 'Deep Space Journal', strap: 'Signals from the far reaches', accent: '#c0a8ff', soft: 'rgba(192,168,255,.16)', deep: '#151027', ink: '#f6f2ff', muted: '#c2b8df' },
    'alien-world': { name: 'Alien World', strap: 'Worlds imagined carefully, discoveries reported clearly', accent: '#dfad82', soft: 'rgba(223,173,130,.16)', deep: '#1a1112', ink: '#fff4ec', muted: '#c9b8ad' },
    'climate-journal': { name: 'Climate Journal', strap: 'Evidence, impact and possible futures', accent: '#86d0cb', soft: 'rgba(134,208,203,.16)', deep: '#071c20', ink: '#eff9f8', muted: '#acc8c9' },
    'ocean-journal': { name: 'Ocean Journal', strap: 'Stories from a blue world', accent: '#73c8f0', soft: 'rgba(115,200,240,.16)', deep: '#061a2a', ink: '#eff9ff', muted: '#a8c8da' },
    'wildlife-journal': { name: 'Wildlife Journal', strap: 'Small details, wild lives', accent: '#c5d28a', soft: 'rgba(197,210,138,.16)', deep: '#171c0d', ink: '#f5f7e9', muted: '#c1c9a8' },
    'future-tech-journal': { name: 'Future Journal', strap: 'The ideas changing what comes next', accent: '#7ed9ef', soft: 'rgba(126,217,239,.16)', deep: '#071720', ink: '#f0fbff', muted: '#a9c7d1' }
  });

  const CSS = `
    #le-aw-discovery-root .le-magazine-engine{--le-mag-accent:#e1b58b;--le-mag-soft:rgba(225,181,139,.15);--le-mag-deep:#091522;--le-mag-ink:#f5f2ed;--le-mag-muted:#aebdca;display:grid;gap:0;position:relative;isolation:isolate;overflow:hidden;margin:14px 0 8px;border:1px solid color-mix(in srgb,var(--le-mag-accent) 27%,transparent);border-radius:24px;color:var(--le-mag-ink);background:linear-gradient(155deg,color-mix(in srgb,var(--le-mag-deep) 92%,#172435),#050a12 78%);box-shadow:0 18px 48px rgba(0,0,0,.24)}
    #le-aw-discovery-root .le-magazine-engine[data-profile="earth-journal"]{--le-mag-accent:#8bd2a8;--le-mag-soft:rgba(139,210,168,.15);--le-mag-deep:#071a17;--le-mag-ink:#eff8f1;--le-mag-muted:#b0c9bc}
    #le-aw-discovery-root .le-magazine-engine[data-profile="moon-journal"]{--le-mag-accent:#b8d0f7;--le-mag-soft:rgba(184,208,247,.16);--le-mag-deep:#0c1425;--le-mag-ink:#f2f5fc;--le-mag-muted:#b0bdd3}
    #le-aw-discovery-root .le-magazine-engine[data-profile="solar-journal"]{--le-mag-accent:#ffc078;--le-mag-soft:rgba(255,192,120,.16);--le-mag-deep:#21120b;--le-mag-ink:#fff4e8;--le-mag-muted:#d5bda5}
    #le-aw-discovery-root .le-magazine-engine[data-profile="deep-space-journal"]{--le-mag-accent:#c0a8ff;--le-mag-soft:rgba(192,168,255,.16);--le-mag-deep:#151027;--le-mag-ink:#f6f2ff;--le-mag-muted:#c2b8df}
    #le-aw-discovery-root .le-magazine-engine[data-profile="alien-world"]{--le-mag-accent:#dfad82;--le-mag-soft:rgba(223,173,130,.16);--le-mag-deep:#1a1112;--le-mag-ink:#fff4ec;--le-mag-muted:#c9b8ad}
    #le-aw-discovery-root .le-magazine-engine[data-profile="climate-journal"]{--le-mag-accent:#86d0cb;--le-mag-soft:rgba(134,208,203,.16);--le-mag-deep:#071c20;--le-mag-ink:#eff9f8;--le-mag-muted:#acc8c9}
    #le-aw-discovery-root .le-magazine-engine[data-profile="ocean-journal"]{--le-mag-accent:#73c8f0;--le-mag-soft:rgba(115,200,240,.16);--le-mag-deep:#061a2a;--le-mag-ink:#eff9ff;--le-mag-muted:#a8c8da}
    #le-aw-discovery-root .le-magazine-engine[data-profile="wildlife-journal"]{--le-mag-accent:#c5d28a;--le-mag-soft:rgba(197,210,138,.16);--le-mag-deep:#171c0d;--le-mag-ink:#f5f7e9;--le-mag-muted:#c1c9a8}
    #le-aw-discovery-root .le-magazine-engine[data-profile="future-tech-journal"]{--le-mag-accent:#7ed9ef;--le-mag-soft:rgba(126,217,239,.16);--le-mag-deep:#071720;--le-mag-ink:#f0fbff;--le-mag-muted:#a9c7d1}
    #le-aw-discovery-root .le-magazine-engine:before{content:"";position:absolute;z-index:-1;pointer-events:none;inset:0;background:radial-gradient(ellipse at 87% 5%,var(--le-mag-soft),transparent 43%),radial-gradient(ellipse at 2% 41%,rgba(85,132,170,.08),transparent 40%)}
    #le-aw-discovery-root .le-mag-engine-cover{position:relative;isolation:isolate;overflow:hidden;padding:24px 18px 21px;border-bottom:1px solid rgba(220,230,240,.12);background:linear-gradient(145deg,rgba(255,255,255,.035),transparent 55%)}
    #le-aw-discovery-root .le-mag-engine-cover:after{content:"";position:absolute;z-index:-1;width:210px;height:210px;right:-92px;top:-88px;border:1px solid color-mix(in srgb,var(--le-mag-accent) 34%,transparent);border-radius:50%;box-shadow:0 0 0 22px color-mix(in srgb,var(--le-mag-accent) 5%,transparent),0 0 0 52px color-mix(in srgb,var(--le-mag-accent) 4%,transparent),inset 0 0 35px color-mix(in srgb,var(--le-mag-accent) 6%,transparent);pointer-events:none}
    #le-aw-discovery-root .le-mag-engine-mast{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 25px;padding-bottom:12px;border-bottom:1px solid color-mix(in srgb,var(--le-mag-accent) 22%,transparent)}
    #le-aw-discovery-root .le-mag-engine-brand{margin:0;color:var(--le-mag-accent);font-size:9px;line-height:1.3;font-weight:900;letter-spacing:.19em;text-transform:uppercase}
    #le-aw-discovery-root .le-mag-engine-date{margin:0;color:var(--le-mag-muted);font-size:9px;line-height:1.4;letter-spacing:.045em;text-align:right}
    #le-aw-discovery-root .le-mag-engine-eyebrow{margin:0 0 9px;color:var(--le-mag-accent);font-size:9px;font-weight:850;letter-spacing:.19em;text-transform:uppercase}
    #le-aw-discovery-root .le-mag-engine-title{max-width:10ch;margin:0;color:var(--le-mag-ink);font-size:clamp(28px,8.1vw,44px);line-height:.99;letter-spacing:-.055em;font-weight:850;text-wrap:balance}
    #le-aw-discovery-root .le-mag-engine-dek{max-width:42em;margin:13px 0 0;color:var(--le-mag-muted);font-size:12px;line-height:1.65}
    #le-aw-discovery-root .le-mag-engine-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:17px}
    #le-aw-discovery-root .le-mag-engine-stat{display:inline-flex;align-items:center;min-height:27px;padding:6px 9px;border:1px solid color-mix(in srgb,var(--le-mag-accent) 23%,transparent);border-radius:999px;background:rgba(0,0,0,.12);color:var(--le-mag-ink);font-size:8px;line-height:1.3;letter-spacing:.045em}
    #le-aw-discovery-root .le-mag-engine-feature{display:grid;grid-template-columns:minmax(0,1fr);gap:0;padding:0;border-bottom:1px solid rgba(220,230,240,.12)}
    #le-aw-discovery-root .le-mag-engine-feature-kicker{display:flex;align-items:center;gap:8px;margin:0 0 11px;color:var(--le-mag-accent);font-size:8px;line-height:1.4;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
    #le-aw-discovery-root .le-mag-engine-feature-kicker:before{content:"";display:inline-block;width:22px;height:1px;background:var(--le-mag-accent)}
    #le-aw-discovery-root .le-mag-engine-feature-copy{padding:23px 18px 24px}
    #le-aw-discovery-root .le-mag-engine-feature-title{max-width:20ch;margin:0;color:var(--le-mag-ink);font-size:clamp(22px,6.1vw,32px);line-height:1.08;letter-spacing:-.04em;font-weight:830;text-wrap:balance}
    #le-aw-discovery-root .le-mag-engine-feature-summary{margin:12px 0 0;color:var(--le-mag-muted);font-size:12px;line-height:1.75}
    #le-aw-discovery-root .le-mag-engine-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px 10px;margin-top:15px;color:var(--le-mag-muted);font-size:9px;line-height:1.5}
    #le-aw-discovery-root .le-mag-engine-source{display:inline-flex;align-items:center;gap:5px;color:var(--le-mag-accent);font-size:10px;font-weight:850;text-decoration:none;white-space:nowrap}
    #le-aw-discovery-root .le-mag-engine-source:focus-visible{outline:2px solid var(--le-mag-accent);outline-offset:3px;border-radius:4px}
    #le-aw-discovery-root .le-mag-engine-sectionhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:19px 18px 10px}
    #le-aw-discovery-root .le-mag-engine-sectiontitle{margin:0;color:var(--le-mag-ink);font-size:15px;line-height:1.25;letter-spacing:-.02em;font-weight:820}
    #le-aw-discovery-root .le-mag-engine-sectionmeta{margin:0;color:var(--le-mag-muted);font-size:8px;line-height:1.4;letter-spacing:.11em;text-transform:uppercase;white-space:nowrap}
    #le-aw-discovery-root .le-mag-engine-storylist{display:grid;grid-template-columns:minmax(0,1fr);padding:0 18px 8px}
    #le-aw-discovery-root .le-mag-engine-story{display:grid;grid-template-columns:31px minmax(0,1fr);gap:0 10px;padding:17px 0 18px;border-top:1px solid rgba(220,230,240,.12)}
    #le-aw-discovery-root .le-mag-engine-story-index{grid-row:1 / span 4;display:flex;align-items:flex-start;padding-top:2px;color:var(--le-mag-accent);font-size:9px;line-height:1.4;font-weight:900;letter-spacing:.07em}
    #le-aw-discovery-root .le-mag-engine-story-title{margin:0;color:var(--le-mag-ink);font-size:clamp(16px,4.3vw,20px);line-height:1.24;letter-spacing:-.025em;font-weight:800;text-wrap:balance}
    #le-aw-discovery-root .le-mag-engine-story-summary{margin:9px 0 0;color:var(--le-mag-muted);font-size:11px;line-height:1.7}
    #le-aw-discovery-root .le-mag-engine-story .le-mag-engine-meta{margin-top:10px;font-size:8px}
    #le-aw-discovery-root .le-mag-engine-media{overflow:hidden;margin:14px 0 0;border:1px solid color-mix(in srgb,var(--le-mag-accent) 20%,transparent);border-radius:13px;background:var(--le-mag-deep)}
    #le-aw-discovery-root .le-mag-engine-media img{display:block;width:100%;max-height:260px;aspect-ratio:16/9;object-fit:cover}
    #le-aw-discovery-root .le-mag-engine-credit{margin:0;padding:7px 9px;color:var(--le-mag-muted);font-size:8px;line-height:1.45}
    #le-aw-discovery-root .le-mag-engine-endmark{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0;padding:14px 18px 17px;border-top:1px solid rgba(220,230,240,.1);color:var(--le-mag-muted);font-size:8px;line-height:1.5;letter-spacing:.035em}
    #le-aw-discovery-root .le-mag-engine-endmark strong{color:var(--le-mag-accent);font-weight:850;letter-spacing:.12em}
    #le-aw-discovery-root .le-mag-engine-print{display:inline-flex;align-items:center;justify-content:center;min-height:39px;margin-top:13px;padding:9px 12px;border:1px solid color-mix(in srgb,var(--le-mag-accent) 35%,transparent);border-radius:11px;background:var(--le-mag-soft);color:var(--le-mag-ink);font-size:10px;font-weight:800;touch-action:manipulation}
    #le-aw-discovery-root .le-mag-engine-print:focus-visible{outline:2px solid var(--le-mag-accent);outline-offset:3px}
    @media(min-width:560px){#le-aw-discovery-root .le-mag-engine-cover{padding:29px 25px 25px}#le-aw-discovery-root .le-mag-engine-mast{margin-bottom:31px}#le-aw-discovery-root .le-mag-engine-feature-copy{padding:27px 25px 29px}#le-aw-discovery-root .le-mag-engine-sectionhead{padding:22px 25px 12px}#le-aw-discovery-root .le-mag-engine-storylist{padding:0 25px 10px}#le-aw-discovery-root .le-mag-engine-story{grid-template-columns:40px minmax(0,1fr);gap:0 13px;padding:20px 0 21px}#le-aw-discovery-root .le-mag-engine-endmark{padding-left:25px;padding-right:25px}}
    @media(orientation:landscape) and (max-height:500px){#le-aw-discovery-root .le-mag-engine-cover{padding-top:18px;padding-bottom:18px}#le-aw-discovery-root .le-mag-engine-mast{margin-bottom:18px}#le-aw-discovery-root .le-mag-engine-title{font-size:clamp(26px,5vw,38px)}}
    @media(prefers-reduced-motion:reduce){#le-aw-discovery-root .le-mag-engine-media img{scroll-behavior:auto}}
    @media print{#le-aw-discovery-root .le-magazine-engine{display:block;overflow:visible;border:0;border-radius:0;box-shadow:none;background:#fff!important;color:#111!important}#le-aw-discovery-root .le-magazine-engine:before,#le-aw-discovery-root .le-mag-engine-cover:after{display:none}#le-aw-discovery-root .le-mag-engine-cover,#le-aw-discovery-root .le-mag-engine-feature,#le-aw-discovery-root .le-mag-engine-story{background:#fff!important;border-color:#ddd!important;break-inside:avoid}#le-aw-discovery-root .le-mag-engine-brand,#le-aw-discovery-root .le-mag-engine-date,#le-aw-discovery-root .le-mag-engine-eyebrow,#le-aw-discovery-root .le-mag-engine-title,#le-aw-discovery-root .le-mag-engine-dek,#le-aw-discovery-root .le-mag-engine-stat,#le-aw-discovery-root .le-mag-engine-feature-title,#le-aw-discovery-root .le-mag-engine-feature-summary,#le-aw-discovery-root .le-mag-engine-sectiontitle,#le-aw-discovery-root .le-mag-engine-sectionmeta,#le-aw-discovery-root .le-mag-engine-story-index,#le-aw-discovery-root .le-mag-engine-story-title,#le-aw-discovery-root .le-mag-engine-story-summary,#le-aw-discovery-root .le-mag-engine-meta,#le-aw-discovery-root .le-mag-engine-endmark{color:#222!important}#le-aw-discovery-root .le-mag-engine-print{display:none!important}#le-aw-discovery-root .le-mag-engine-source{color:#222!important;text-decoration:underline}}
  `;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  function node(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined && text !== null) item.textContent = String(text);
    return item;
  }
  function cleanText(value, max = 1000) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function safeExternalUrl(value) {
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; }
    catch (_) { return ''; }
  }
  function formatDate(value, long = false) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Date not supplied';
    return new Intl.DateTimeFormat(undefined, long
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }
  function createMeta(story, options) {
    const meta = node('div', 'le-mag-engine-meta');
    const publisher = cleanText(story.publisher || 'Original source', 100);
    const published = formatDate(story.publishedAt || story.published || '');
    meta.appendChild(node('span', '', publisher));
    meta.appendChild(node('span', '', '·'));
    meta.appendChild(node('time', '', published));
    const href = safeExternalUrl(story.url);
    if (href) {
      const source = node('a', 'le-mag-engine-source', 'Read original ↗');
      source.href = href; source.target = '_blank'; source.rel = 'noopener noreferrer';
      meta.appendChild(source);
    }
    return meta;
  }
  function approvedVisual(story, online) {
    if (!online) return null;
    const image = story?.visual;
    if (!image || image.approved !== true) return null;
    const href = safeExternalUrl(image.url);
    const credit = cleanText(image.credit, 180);
    const rights = cleanText(image.rights, 180);
    if (!href || !credit || !rights) return null;
    return { url: href, alt: cleanText(image.alt || story.title, 240), credit, rights };
  }
  function appendApprovedVisual(parent, story, online) {
    const visual = approvedVisual(story, online);
    if (!visual) return;
    const wrap = node('figure', 'le-mag-engine-media');
    const image = node('img');
    image.src = visual.url; image.alt = visual.alt; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => wrap.remove(), { once: true });
    wrap.appendChild(image);
    wrap.appendChild(node('figcaption', 'le-mag-engine-credit', `${visual.credit} · ${visual.rights}`));
    parent.appendChild(wrap);
  }
  function storyBlock(story, index, options, featured = false) {
    const article = node('article', featured ? 'le-mag-engine-feature' : 'le-mag-engine-story');
    if (featured) {
      const copy = node('div', 'le-mag-engine-feature-copy');
      copy.appendChild(node('p', 'le-mag-engine-feature-kicker', 'THE LEAD REPORT · 01'));
      copy.appendChild(node('h3', 'le-mag-engine-feature-title', cleanText(story.title, 200) || 'Untitled report'));
      copy.appendChild(node('p', 'le-mag-engine-feature-summary', cleanText(story.summary, 900) || 'No summary was provided in this edition.'));
      appendApprovedVisual(copy, story, options.online === true);
      copy.appendChild(createMeta(story, options));
      article.appendChild(copy);
      return article;
    }
    article.appendChild(node('span', 'le-mag-engine-story-index', String(index + 1).padStart(2, '0')));
    article.appendChild(node('h3', 'le-mag-engine-story-title', cleanText(story.title, 200) || 'Untitled report'));
    article.appendChild(node('p', 'le-mag-engine-story-summary', cleanText(story.summary, 900) || 'No summary was provided in this edition.'));
    appendApprovedVisual(article, story, options.online === true);
    article.appendChild(createMeta(story, options));
    return article;
  }
  function renderEdition(issue, options = {}) {
    installStyle();
    const requestedProfile = cleanText(options.profile || issue?.magazineProfile || issue?.profile || 'space-journal', 80);
    const profileKey = Object.prototype.hasOwnProperty.call(PROFILES, requestedProfile) ? requestedProfile : 'space-journal';
    const profile = PROFILES[profileKey];
    const stories = Array.isArray(issue?.stories) ? issue.stories.filter(Boolean).slice(0, 24) : [];
    const root = node('section', 'le-magazine-engine');
    root.dataset.profile = profileKey;
    root.setAttribute('aria-label', `${profile.name} edition`);

    const cover = node('header', 'le-mag-engine-cover');
    const mast = node('div', 'le-mag-engine-mast');
    mast.appendChild(node('p', 'le-mag-engine-brand', `LIVE // EARTH · ${profile.name}`));
    mast.appendChild(node('p', 'le-mag-engine-date', formatDate(issue?.publishedAt || issue?.releaseDate || '')));
    cover.appendChild(mast);
    cover.appendChild(node('p', 'le-mag-engine-eyebrow', 'THE WEEKLY EDITION'));
    cover.appendChild(node('h2', 'le-mag-engine-title', cleanText(issue?.title || profile.name, 160)));
    cover.appendChild(node('p', 'le-mag-engine-dek', cleanText(issue?.coverageNote || profile.strap, 320)));
    const stats = node('div', 'le-mag-engine-stats');
    stats.appendChild(node('span', 'le-mag-engine-stat', `${stories.length.toString().padStart(2, '0')} REPORTS`));
    stats.appendChild(node('span', 'le-mag-engine-stat', 'SOURCES PRESERVED'));
    stats.appendChild(node('span', 'le-mag-engine-stat', options.online === true ? 'ONLINE EDITION' : 'SAVED FOR OFFLINE'));
    cover.appendChild(stats);
    if (typeof options.onPrint === 'function') {
      const print = node('button', 'le-mag-engine-print', 'Print / Save PDF');
      print.type = 'button'; print.addEventListener('click', options.onPrint); cover.appendChild(print);
    }
    root.appendChild(cover);

    if (stories.length) {
      root.appendChild(storyBlock(stories[0], 0, options, true));
      if (stories.length > 1) {
        const sectionHead = node('header', 'le-mag-engine-sectionhead');
        sectionHead.appendChild(node('h3', 'le-mag-engine-sectiontitle', 'Inside this edition'));
        sectionHead.appendChild(node('p', 'le-mag-engine-sectionmeta', `${String(stories.length - 1).padStart(2, '0')} MORE STORIES`));
        root.appendChild(sectionHead);
        const list = node('div', 'le-mag-engine-storylist');
        stories.slice(1).forEach((story, index) => list.appendChild(storyBlock(story, index + 1, options, false)));
        root.appendChild(list);
      }
    } else {
      const empty = node('p', 'le-mag-engine-dek', 'This edition has no stories yet. The engine will not invent reports to fill the page.');
      empty.style.padding = '22px 18px'; root.appendChild(empty);
    }

    const endmark = node('footer', 'le-mag-engine-endmark');
    endmark.appendChild(node('span', '', 'Original reports remain one tap away at their source.'));
    endmark.appendChild(node('strong', '', 'END OF EDITION'));
    root.appendChild(endmark);
    return root;
  }

  window.LiveEarthMagazineEngine = Object.freeze({
    version: 'v1',
    profiles: Object.freeze(Object.keys(PROFILES)),
    renderEdition,
    hasProfile: name => Object.prototype.hasOwnProperty.call(PROFILES, name)
  });
})();
