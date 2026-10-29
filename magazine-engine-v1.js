/* LIVE // EARTH Magazine Engine V1 — reusable, text-first editorial renderer.
   Loaded only when a reader opens Weekly Publish; never part of the app shell.
   The engine renders already-validated issue data. It does not fetch news, create
   facts, save content, or download images. Any future editorial profile can reuse it. */
(() => {
  'use strict';
  if (window.LiveEarthMagazineEngine?.version === 'v108') return;

  const STYLE_ID = 'le-live-earth-magazine-engine-v108-style';
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
    #le-aw-discovery-root .le-magazine-engine{--a:#e1b58b;--d:#091522;--i:#f5f2ed;--m:#b8c4cf;color:var(--i);margin:14px 0 110px;border:1px solid color-mix(in srgb,var(--a) 28%,transparent);border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at 80% 0%,rgba(225,181,139,.14),transparent 46%),linear-gradient(155deg,#101c2a,#050a12 80%);box-shadow:0 18px 48px #0005;isolation:isolate}
    #le-aw-discovery-root .le-magazine-engine[data-profile="earth-journal"]{--a:#8bd2a8;--d:#071a17}#le-aw-discovery-root .le-magazine-engine[data-profile="moon-journal"]{--a:#b8d0f7;--d:#0c1425}#le-aw-discovery-root .le-magazine-engine[data-profile="solar-journal"]{--a:#ffc078;--d:#21120b}#le-aw-discovery-root .le-magazine-engine[data-profile="deep-space-journal"]{--a:#c0a8ff;--d:#151027}#le-aw-discovery-root .le-magazine-engine[data-profile="alien-world"]{--a:#dfad82;--d:#1a1112}#le-aw-discovery-root .le-magazine-engine[data-profile="climate-journal"]{--a:#86d0cb;--d:#071c20}#le-aw-discovery-root .le-magazine-engine[data-profile="ocean-journal"]{--a:#73c8f0;--d:#061a2a}#le-aw-discovery-root .le-magazine-engine[data-profile="wildlife-journal"]{--a:#c5d28a;--d:#171c0d}#le-aw-discovery-root .le-magazine-engine[data-profile="future-tech-journal"]{--a:#7ed9ef;--d:#071720}
    #le-aw-discovery-root .le-mag-book{padding:10px;background:linear-gradient(135deg,#ffffff04,transparent)}
    #le-aw-discovery-root .le-mag-page{position:relative;display:none;flex-direction:column;min-height:clamp(490px,66svh,760px);padding:22px 19px 18px;border:1px solid #ffffff16;border-radius:15px;background:radial-gradient(ellipse at 90% 0%,color-mix(in srgb,var(--a) 10%,transparent),transparent 45%),linear-gradient(160deg,#111f2d,#080e17 75%);box-shadow:inset 0 1px #ffffff0a,0 8px 24px #0003;overflow:hidden;animation:le-mag-in .24s ease both}
    #le-aw-discovery-root .le-mag-page.is-active{display:flex}#le-aw-discovery-root .le-mag-page[data-kind="cover"]{justify-content:space-between;min-height:clamp(520px,70svh,790px);background:radial-gradient(ellipse at 72% 28%,color-mix(in srgb,var(--a) 20%,transparent),transparent 40%),linear-gradient(150deg,#101e2d,#070b12 72%)}
    #le-aw-discovery-root .le-mag-mast{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid color-mix(in srgb,var(--a) 40%,transparent);padding-bottom:11px;margin-bottom:24px;color:var(--a);font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
    #le-aw-discovery-root .le-mag-kicker{margin:0 0 10px;color:var(--a);font-size:9px;font-weight:900;letter-spacing:.19em;text-transform:uppercase}
    #le-aw-discovery-root .le-mag-cover-title{font-size:clamp(40px,12vw,66px);line-height:.91;letter-spacing:-.065em;font-weight:900;margin:0;max-width:8ch;text-wrap:balance;color:#fff8f0}
    #le-aw-discovery-root .le-mag-dek{font-size:13px;line-height:1.7;color:#bbc6d0;margin:16px 0 0;max-width:40em}
    #le-aw-discovery-root .le-mag-cover-image{display:block;width:100%;height:clamp(180px,34svh,330px);object-fit:cover;margin:25px 0 8px;border-radius:11px;border:1px solid #ffffff20;background:var(--d)}
    #le-aw-discovery-root .le-mag-cover-mark{margin:25px 0 14px;aspect-ratio:4/3;max-height:245px;border-radius:12px;overflow:hidden;background:radial-gradient(ellipse at 52% 48%,color-mix(in srgb,var(--a) 28%,transparent),transparent 36%),radial-gradient(ellipse at 52% 48%,#5b647466,transparent 62%),linear-gradient(155deg,#1b2f43,#090d15);border:1px solid #ffffff15;display:grid;place-items:center;font-size:72px;color:color-mix(in srgb,var(--a) 80%,white);text-shadow:0 0 30px color-mix(in srgb,var(--a) 55%,transparent)}
    #le-aw-discovery-root .le-mag-statline{color:#afbdca;font-size:9px;line-height:1.55;border-top:1px solid #ffffff20;padding-top:12px}
    #le-aw-discovery-root .le-mag-page-title{font-size:clamp(27px,7.3vw,42px);line-height:1.04;letter-spacing:-.045em;color:#f8f3ed;margin:0 0 16px;font-weight:860;text-wrap:balance}
    #le-aw-discovery-root .le-mag-page-body{font-size:13px;line-height:1.85;color:#d0d8df;white-space:pre-line;margin:0}
    #le-aw-discovery-root .le-mag-page-image{width:100%;max-height:36svh;object-fit:cover;display:block;border-radius:9px;margin:0 0 18px;border:1px solid #ffffff20;background:#101b29}
    #le-aw-discovery-root .le-mag-caption{font-size:9px;line-height:1.5;color:#9aaaba;margin:7px 0 15px}
    #le-aw-discovery-root .le-mag-dropcap:first-letter{float:left;color:var(--a);font-size:3.3em;line-height:.8;padding:.08em .12em 0 0;font-weight:900}
    #le-aw-discovery-root .le-mag-rule{height:1px;background:color-mix(in srgb,var(--a) 45%,transparent);margin:19px 0}
    #le-aw-discovery-root .le-mag-toc{display:grid;gap:0;margin-top:10px}#le-aw-discovery-root .le-mag-toc button{display:grid;grid-template-columns:33px 1fr 24px;align-items:start;gap:8px;width:100%;padding:14px 0;text-align:left;border:0;border-top:1px solid #ffffff20;background:transparent;color:#f4eee8;font-weight:750;font-size:12px;line-height:1.4}#le-aw-discovery-root .le-mag-toc span{color:var(--a);font-size:10px}
    #le-aw-discovery-root .le-mag-page-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:20px;color:#8b9bad;font-size:8px;letter-spacing:.08em;text-transform:uppercase}
    #le-aw-discovery-root .le-mag-controls{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px 2px 5px;color:#c5d0d9}
    #le-aw-discovery-root .le-mag-nav{min-height:42px;border:1px solid color-mix(in srgb,var(--a) 34%,transparent);border-radius:12px;padding:10px 12px;background:color-mix(in srgb,var(--a) 9%,#0b121c);color:#f6f0e9;font-size:11px;font-weight:800;touch-action:manipulation}#le-aw-discovery-root .le-mag-nav:disabled{opacity:.3}#le-aw-discovery-root .le-mag-count{text-align:center;font-variant-numeric:tabular-nums;font-size:10px;white-space:nowrap}
    #le-aw-discovery-root .le-mag-actions{display:flex;justify-content:center;gap:8px;padding:6px 2px 2px}#le-aw-discovery-root .le-mag-actions .le-mag-nav{min-height:36px;font-size:10px}
    @keyframes le-mag-in{from{opacity:.5;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
    @media(min-width:700px){#le-aw-discovery-root .le-mag-book{padding:18px}#le-aw-discovery-root .le-mag-page{padding:30px 34px;min-height:680px;max-width:760px;margin:0 auto}#le-aw-discovery-root .le-mag-page[data-kind="cover"]{min-height:760px}}
    @media(prefers-reduced-motion:reduce){#le-aw-discovery-root .le-mag-page{animation:none}}
    @media print{@page{size:A4 portrait;margin:14mm}html,body{background:#fff!important}#le-aw-discovery-root .aw-weekly-hero,#le-aw-discovery-root .aw-weekly-archive{display:none!important}#le-aw-discovery-root .le-magazine-engine{display:block!important;margin:0!important;overflow:visible!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important}#le-aw-discovery-root .le-mag-book{padding:0!important}#le-aw-discovery-root .le-mag-page,#le-aw-discovery-root .le-mag-page.is-active{display:flex!important;min-height:0!important;height:255mm!important;max-width:none!important;margin:0!important;padding:12mm!important;overflow:hidden!important;break-after:page;page-break-after:always;border:0!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;color:#111!important;animation:none!important}#le-aw-discovery-root .le-mag-page:last-child{break-after:auto;page-break-after:auto}#le-aw-discovery-root .le-mag-cover-title,#le-aw-discovery-root .le-mag-page-title{color:#111!important}#le-aw-discovery-root .le-mag-page-body,#le-aw-discovery-root .le-mag-dek,#le-aw-discovery-root .le-mag-caption,#le-aw-discovery-root .le-mag-page-foot,#le-aw-discovery-root .le-mag-mast{color:#333!important}#le-aw-discovery-root .le-mag-controls,#le-aw-discovery-root .le-mag-actions{display:none!important}#le-aw-discovery-root .le-mag-page-image,#le-aw-discovery-root .le-mag-cover-image{max-height:105mm;break-inside:avoid}}
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
  function makePage(kind, issue, profile, number, total) {
    const page = node('article', 'le-mag-page'); page.dataset.kind = kind;
    const mast = node('div', 'le-mag-mast'); mast.appendChild(node('span', '', profile.name)); mast.appendChild(node('span', '', formatDate(issue?.publishedAt || issue?.releaseDate || ''))); page.appendChild(mast);
    const foot = node('footer', 'le-mag-page-foot'); foot.appendChild(node('span', '', 'LIVE // EARTH · SUNDAY JOURNAL')); foot.appendChild(node('span', '', `${String(number).padStart(2,'0')} / ${String(total).padStart(2,'0')}`)); page._foot=foot; return page;
  }
  function renderEdition(issue, options = {}) {
    installStyle();
    const requestedProfile = cleanText(options.profile || issue?.magazineProfile || issue?.profile || 'space-journal', 80);
    const profileKey = Object.prototype.hasOwnProperty.call(PROFILES, requestedProfile) ? requestedProfile : 'space-journal';
    const profile = PROFILES[profileKey];
    const stories = Array.isArray(issue?.stories) ? issue.stories.filter(Boolean).slice(0, 8) : [];
    const total = Math.max(2, stories.length + 2);
    const root = node('section', 'le-magazine-engine'); root.dataset.profile = profileKey; root.setAttribute('aria-label', `${profile.name} magazine`);
    const book = node('div', 'le-mag-book'); root.appendChild(book); const pages = [];
    const cover = makePage('cover',issue,profile,1,total); cover.appendChild(node('p','le-mag-kicker','THE WEEKLY EDITION')); cover.appendChild(node('h2','le-mag-cover-title',cleanText(issue?.title || profile.name,160))); cover.appendChild(node('p','le-mag-dek',cleanText(issue?.coverageNote || profile.strap,320))); const coverVisual=stories.length?approvedVisual(stories[0],options.online===true):null; if(coverVisual){const coverImage=node('img','le-mag-cover-image');coverImage.src=coverVisual.url;coverImage.alt=coverVisual.alt;coverImage.loading='lazy';coverImage.decoding='async';coverImage.referrerPolicy='no-referrer';coverImage.addEventListener('error',()=>coverImage.remove(),{once:true});cover.appendChild(coverImage);cover.appendChild(node('p','le-mag-caption',`${coverVisual.credit} · ${coverVisual.rights}`))}else{cover.appendChild(node('div','le-mag-cover-mark','✦'))} cover.appendChild(node('p','le-mag-statline',`${stories.length} source-linked reports  ·  ${options.online === true ? 'ONLINE EDITION' : 'SAVED FOR OFFLINE'}\nOriginal publishers and links are preserved throughout.`)); cover.appendChild(cover._foot); pages.push(cover);
    const contents=makePage('contents',issue,profile,2,total); contents.appendChild(node('p','le-mag-kicker','IN THIS EDITION')); contents.appendChild(node('h2','le-mag-page-title','A field guide to this week')); const toc=node('div','le-mag-toc');
    stories.forEach((story,index)=>{const b=node('button');b.type='button';b.dataset.goPage=String(index+2);b.appendChild(node('span','',String(index+1).padStart(2,'0')));b.appendChild(node('strong','',cleanText(story.title,160)||'Untitled report'));b.appendChild(node('span','',String(index+3).padStart(2,'0')));toc.appendChild(b)});
    if(!stories.length) toc.appendChild(node('p','le-mag-page-body','No reports are available in this edition. The magazine will not invent stories to fill its pages.'));
    contents.appendChild(toc);contents.appendChild(contents._foot);pages.push(contents);
    stories.forEach((story,index)=>{const page=makePage('story',issue,profile,index+3,total);page.appendChild(node('p','le-mag-kicker',index===0?'THE LEAD STORY':`FIELD REPORT · ${String(index+1).padStart(2,'0')}`));
      const visual=approvedVisual(story,options.online===true);if(visual){const img=node('img','le-mag-page-image');img.src=visual.url;img.alt=visual.alt;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});page.appendChild(img);page.appendChild(node('p','le-mag-caption',`${visual.credit} · ${visual.rights}`))}
      page.appendChild(node('h2','le-mag-page-title',cleanText(story.title,200)||'Untitled report'));page.appendChild(node('p','le-mag-page-body le-mag-dropcap',cleanText(story.summary,900)||'No summary was provided.'));
      const rule=node('div','le-mag-rule');page.appendChild(rule);page.appendChild(createMeta(story,options));page.appendChild(page._foot);pages.push(page)});
    pages.forEach((p,i)=>{p.dataset.page=String(i);p.setAttribute('aria-hidden',i===0?'false':'true');p.classList.toggle('is-active',i===0);book.appendChild(p)});
    const controls=node('div','le-mag-controls');const prev=node('button','le-mag-nav','← Previous');prev.type='button';const count=node('span','le-mag-count',`Page 1 of ${pages.length}`);const next=node('button','le-mag-nav','Next →');next.type='button';controls.append(prev,count,next);root.appendChild(controls);
    const actions=node('div','le-mag-actions');if(typeof options.onPrint==='function'){const print=node('button','le-mag-nav','Print / Save PDF');print.type='button';print.addEventListener('click',options.onPrint);actions.appendChild(print)}root.appendChild(actions);
    let current=0;function go(to){current=Math.max(0,Math.min(pages.length-1,to));pages.forEach((p,i)=>{p.classList.toggle('is-active',i===current);p.setAttribute('aria-hidden',i===current?'false':'true')});count.textContent=`Page ${current+1} of ${pages.length}`;prev.disabled=current===0;next.disabled=current===pages.length-1;root.dataset.currentPage=String(current)}
    prev.addEventListener('click',()=>go(current-1));next.addEventListener('click',()=>go(current+1));toc.querySelectorAll('[data-go-page]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.goPage))));
    let touchX=0,touchY=0;root.addEventListener('touchstart',e=>{const t=e.changedTouches?.[0];if(t){touchX=t.clientX;touchY=t.clientY}},{passive:true});root.addEventListener('touchend',e=>{const t=e.changedTouches?.[0];if(!t)return;const dx=t.clientX-touchX,dy=t.clientY-touchY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)go(current+(dx<0?1:-1))},{passive:true});
    root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){go(current+1)}else if(e.key==='ArrowLeft'){go(current-1)}});go(0);return root;
  }

  window.LiveEarthMagazineEngine = Object.freeze({
    version: 'v108',
    profiles: Object.freeze(Object.keys(PROFILES)),
    renderEdition,
    hasProfile: name => Object.prototype.hasOwnProperty.call(PROFILES, name)
  });
})();
