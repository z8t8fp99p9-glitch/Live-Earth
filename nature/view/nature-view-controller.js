/* LIVE // EARTH — Nature Stacks view module.
   Reads published feed/catalog only; the global PDF Reader handles saved PDFs. */
(() => {
  'use strict';
  if (window.LiveEarthNatureViewModule) return;
  let root = null, active = false, servicesPromise = null;
  let feedArea = null, feedStatus = null, issueArea = null, savedArea = null;
  let currentFeed = null, currentCatalog = null;

  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const dateText = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(date) : '';
  };
  function setStatus(message, state='info') {
    if (!feedStatus) return;
    feedStatus.textContent = message;
    feedStatus.dataset.state = state;
    feedStatus.hidden = !message;
  }
  function loadScript(path, globalName) {
    if (window[globalName]) return Promise.resolve();
    const url = new URL(path, document.baseURI).href;
    return new Promise((resolve,reject) => {
      let script = [...document.scripts].find(item => item.src === url);
      let settled = false, timer;
      const finish = (fn) => { if (settled) return; settled=true; clearTimeout(timer); fn(); };
      if (!script) { script=document.createElement('script'); script.src=url; script.async=true; }
      script.addEventListener('load',()=>finish(()=>window[globalName]?resolve():reject(new Error(`${path} did not register.`))),{once:true});
      script.addEventListener('error',()=>finish(()=>reject(new Error(`Could not load ${path}.`))),{once:true});
      if (!script.isConnected) document.head.appendChild(script);
      timer=setTimeout(()=>finish(()=>reject(new Error(`Timed out loading ${path}.`))),15000);
    });
  }
  function ensureServices() {
    if (window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer && window.LiveEarthNaturePublisher) return Promise.resolve();
    if (servicesPromise) return servicesPromise;
    servicesPromise = loadScript('./editorial-engine/universal-editorial-engine.js','LiveEarthUniversalEditorialEngine')
      .then(()=>loadScript('./universal-pdf-viewer.js','LiveEarthUniversalPDFViewer'))
      .then(()=>loadScript('./nature/view/nature-publisher-client.js','LiveEarthNaturePublisher'))
      .catch(error=>{servicesPromise=null;throw error;});
    return servicesPromise;
  }
  function imageFigure(story) {
    const figure=el('figure','le-nature-photo');
    if (story.imageUrl) {
      const img=el('img','');
      img.src=story.imageUrl;
      img.alt=story.imageCaption || story.title || 'Documentary photograph';
      img.loading='lazy';
      img.decoding='async';
      img.referrerPolicy='no-referrer';
      img.addEventListener('error',()=>{figure.replaceChildren(el('div','le-nature-photo-missing','Photograph temporarily unavailable'));},{once:true});
      figure.appendChild(img);
      if (story.imageCaption) figure.appendChild(el('figcaption','le-nature-photo-caption',story.imageCaption));
      if (story.imageCredit) {
        const credit=el('div','le-nature-photo-credit',story.imageCredit);
        if (story.imageSourceUrl) {
          const link=el('a','le-nature-credit-link','Original photo record ↗');
          link.href=story.imageSourceUrl; link.target='_blank'; link.rel='noopener noreferrer';
          credit.append(' · ',link);
        }
        figure.appendChild(credit);
      }
      if (story.imageRightsNote) figure.appendChild(el('div','le-nature-photo-note',story.imageRightsNote));
    } else {
      figure.appendChild(el('div','le-nature-photo-missing','No verified documentary photograph for this report'));
    }
    return figure;
  }
  function storyCard(story,index) {
    const card=el('article','le-nature-story');
    card.appendChild(el('div','le-nature-story-number',String(index+1).padStart(2,'0')));
    const body=el('div','le-nature-story-body');
    body.appendChild(el('div','le-nature-story-meta',`${story.sourceName || 'SOURCE REPORT'} · ${dateText(story.publishedAt)}`));
    body.appendChild(el('h2','le-nature-story-title',story.title || 'Nature report'));
    if (story.imageUrl) body.appendChild(imageFigure(story));
    else {
      const noImage=el('div','le-nature-no-photo','FIELD NOTE · No exact, rights-verified photograph was available for this report.');
      body.appendChild(noImage);
    }
    body.appendChild(el('p','le-nature-story-summary',story.summary || 'Read the original report for the full account.'));
    const footer=el('div','le-nature-story-footer');
    const link=el('a','le-nature-source-link','Read original report ↗');
    link.href=story.url; link.target='_blank'; link.rel='noopener noreferrer';
    footer.appendChild(el('span','le-nature-source-name',story.sourceName || 'Original publisher'));
    footer.appendChild(link); body.appendChild(footer); card.appendChild(body);
    return card;
  }
  function renderFeed(feed) {
    if (!feedArea) return;
    feedArea.replaceChildren();
    const stories=Array.isArray(feed?.stories)?feed.stories:[];
    stories.forEach((story,index)=>feedArea.appendChild(storyCard(story,index)));
    setStatus(stories.length ? `${stories.length} source-linked reports · ${feed.documentaryImageCount || stories.filter(s=>s.imageUrl).length} credited documentary photographs` :
      'No Nature reports are in the current published feed.', stories.length?'success':'empty');
  }
  function renderIssue(catalog) {
    if (!issueArea) return;
    issueArea.replaceChildren();
    const issue=catalog?.issues?.[0];
    if (!issue) { issueArea.appendChild(el('p','le-nature-empty','No completed monthly issue is published yet.')); return; }
    const card=el('article','le-nature-issue');
    if (issue.coverImageUrl) {
      const img=el('img','le-nature-cover-image');
      img.src=issue.coverImageUrl; img.alt=issue.coverImageCaption || 'Nature issue cover photograph';
      img.loading='lazy'; img.decoding='async'; card.appendChild(img);
      if (issue.coverImageCredit) card.appendChild(el('div','le-nature-cover-credit',issue.coverImageCredit));
    } else card.appendChild(el('div','le-nature-cover-art','THE LIVING WORLD'));
    const info=el('div','le-nature-issue-info');
    info.appendChild(el('div','le-nature-eyebrow','THE MONTHLY FIELD JOURNAL'));
    info.appendChild(el('h2','le-nature-issue-title',issue.title || 'The Living World'));
    info.appendChild(el('p','le-nature-issue-description',`${issue.storyCount || 0} selected reports · ${issue.documentaryImageCount || 0} photographs · ${issue.pages || 0} pages`));
    info.appendChild(el('p','le-nature-issue-period',`${dateText(issue.coverageStart)} — ${dateText(new Date(new Date(issue.coverageEnd).getTime()-1))}`));
    info.appendChild(el('p','le-nature-issue-note','One current public edition. Older editions saved through the Global PDF Reader remain on this device.'));
    const open=el('button','le-nature-open','Read monthly edition');
    open.type='button';
    open.addEventListener('click',async()=>{
      try { await ensureServices(); setStatus('Opening the monthly edition…'); await window.LiveEarthNaturePublisher.openMagazine(issue); }
      catch(error) { setStatus(error?.message || 'The monthly edition could not be opened.','warning'); }
    });
    info.appendChild(open); card.appendChild(info); issueArea.appendChild(card);
  }
  async function renderSaved() {
    if (!savedArea) return;
    savedArea.replaceChildren();
    const panel=el('section','le-nature-saved-panel');
    panel.appendChild(el('h3','le-nature-section-title','Saved for offline reading'));
    panel.appendChild(el('p','le-nature-muted','These are PDFs you chose to save in the Global PDF Reader. Live reports are not stored offline.'));
    try {
      const items=await window.LiveEarthNaturePublisher.listSavedMagazines();
      if (!items.length) panel.appendChild(el('p','le-nature-muted','No saved Nature editions on this device yet.'));
      for (const item of items) {
        const row=el('div','le-nature-saved-row');
        row.appendChild(el('span','le-nature-saved-name',item.title || 'The Living World'));
        const button=el('button','le-nature-saved-open','Open'); button.type='button';
        button.addEventListener('click',async()=>{ try { await window.LiveEarthNaturePublisher.openSaved(item); } catch(error) { setStatus(error?.message || 'Could not open saved PDF.','warning'); } });
        row.appendChild(button); panel.appendChild(row);
      }
    } catch (_) { panel.appendChild(el('p','le-nature-muted','Saved editions are unavailable until the shared PDF Reader is ready.')); }
    savedArea.appendChild(panel);
  }
  async function refresh() {
    if (!active) return;
    setStatus('Loading published Nature reports…');
    try {
      await ensureServices();
      if (!active) return;
      const [feed,catalog]=await Promise.all([window.LiveEarthNaturePublisher.loadFeed(),window.LiveEarthNaturePublisher.loadCatalog()]);
      if (!active) return;
      currentFeed=feed; currentCatalog=catalog;
      renderFeed(feed); renderIssue(catalog); await renderSaved();
    } catch(error) {
      currentFeed=null;
      if (feedArea) feedArea.replaceChildren();
      if (navigator.onLine===false) {
        currentCatalog=null;
        if (issueArea) issueArea.replaceChildren();
        setStatus('You are offline. Live Nature reports and the online catalogue have been cleared. Previously saved PDFs remain available in the Monthly Journal.','warning');
      }
      else setStatus(`${error?.message || 'Nature publications are unavailable.'} Reconnect and refresh to try again.`,'warning');
      try { await ensureServices(); if (active) await renderSaved(); } catch (_) {}
    }
  }
  function build() {
    if (root) return;
    const style=el('style');
    style.id='le-nature-module-style';
    style.textContent=`
      #le-nature-view{position:fixed;inset:0;z-index:6;display:block;overflow:hidden;isolation:isolate;color:#edf1e6;background:radial-gradient(ellipse at 50% 0%,#78926a42,transparent 45%),linear-gradient(180deg,#091a12,#14281d 52%,#08150f);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #le-nature-view[hidden]{display:none!important}
      #le-nature-view .le-nature-scroll{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 22px) 16px calc(env(safe-area-inset-bottom) + 130px);scrollbar-width:none}
      #le-nature-view .le-nature-scroll::-webkit-scrollbar{display:none}
      #le-nature-view .le-nature-inner{max-width:900px;margin:auto}
      #le-nature-view .le-nature-mast{text-align:center;margin:0 auto 20px}
      #le-nature-view .le-nature-eyebrow{color:#c5b985;font-size:8px;font-weight:800;letter-spacing:.27em;text-transform:uppercase}
      #le-nature-view .le-nature-wordmark{font:750 clamp(32px,8vw,46px)/1 Georgia,serif;letter-spacing:.14em;color:#f2ecd8;margin:9px 0 6px;text-shadow:0 4px 24px #0008}
      #le-nature-view .le-nature-subtitle{margin:0;color:#aebda9;font-size:9px;letter-spacing:.14em;text-transform:uppercase}
      #le-nature-view .le-nature-tabs{display:flex;gap:7px;max-width:520px;margin:18px auto;padding:5px;border:1px solid #d0dabb30;border-radius:14px;background:#07150fcc;backdrop-filter:blur(16px)}
      #le-nature-view .le-nature-tab{flex:1;min-height:40px;border:1px solid transparent;border-radius:10px;background:transparent;color:#b9c6b4;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
      #le-nature-view .le-nature-tab[aria-pressed=true]{border-color:#d6c58b88;background:linear-gradient(130deg,#c4b47838,#ffffff0b);color:#f4eac8;box-shadow:inset 0 1px #ffffff22}
      #le-nature-view .le-nature-status{margin:0 0 14px;padding:11px 13px;border:1px solid #c2d3ad30;border-radius:12px;background:#07150fba;color:#c2d2bc;font-size:10px;line-height:1.5}
      #le-nature-view .le-nature-status[data-state=success]{color:#d7e6cc;border-color:#9aba8466}
      #le-nature-view .le-nature-status[data-state=warning]{color:#ead6ad;border-color:#c5a36a77}
      #le-nature-view .le-nature-story{display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;margin:0 0 15px;padding:15px 13px;border:1px solid #c7d5b32a;border-radius:17px;background:linear-gradient(140deg,#20392be8,#0d1c14ed);box-shadow:0 14px 30px #0004}
      #le-nature-view .le-nature-story-number{color:#cfbf8a;font:italic 14px Georgia,serif;padding-top:3px}
      #le-nature-view .le-nature-story-meta{margin:0 0 8px;color:#d4c58d;font-size:7px;font-weight:800;letter-spacing:.14em;line-height:1.5;text-transform:uppercase}
      #le-nature-view .le-nature-story-title{margin:0 0 11px;color:#f2eedf;font:700 clamp(18px,4.8vw,24px)/1.16 Georgia,serif;letter-spacing:-.01em}
      #le-nature-view .le-nature-photo{margin:0 0 12px;overflow:hidden;border-radius:13px;border:1px solid #d2dfc322;background:#07130d}
      #le-nature-view .le-nature-photo img{display:block;width:100%;max-height:310px;object-fit:cover;background:#0d1b13}
      #le-nature-view .le-nature-photo-caption{padding:9px 10px 2px;color:#d5d9c8;font:italic 11px/1.45 Georgia,serif}
      #le-nature-view .le-nature-photo-credit,#le-nature-view .le-nature-photo-note{padding:5px 10px 8px;color:#9eae9b;font-size:8px;line-height:1.45;overflow-wrap:anywhere}
      #le-nature-view .le-nature-photo-note{color:#cbbd91;padding-top:0}
      #le-nature-view .le-nature-credit-link,#le-nature-view .le-nature-source-link{color:#e2d39e;text-decoration:none;font-weight:750}
      #le-nature-view .le-nature-no-photo{margin:0 0 10px;padding:10px 12px;border:1px solid #d2c58b44;border-radius:10px;color:#c5bd99;font-size:9px;line-height:1.45;background:#0a170f}
      #le-nature-view .le-nature-photo-missing{padding:35px 15px;text-align:center;color:#b6c4aa;font:italic 14px Georgia,serif}
      #le-nature-view .le-nature-story-summary{margin:0;color:#cad3c4;font-size:11px;line-height:1.65;white-space:pre-line}
      #le-nature-view .le-nature-story-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:13px;padding-top:10px;border-top:1px solid #d4dfc51b}
      #le-nature-view .le-nature-source-name{color:#9eae9c;font-size:8px}
      #le-nature-view .le-nature-issue{overflow:hidden;border:1px solid #cabb8c55;border-radius:18px;background:linear-gradient(140deg,#253d2d,#0d1d15);box-shadow:0 18px 40px #0006}
      #le-nature-view .le-nature-cover-image{display:block;width:100%;max-height:340px;object-fit:cover}
      #le-nature-view .le-nature-cover-credit{padding:7px 13px 0;color:#aeb99f;font-size:8px}
      #le-nature-view .le-nature-cover-art{min-height:230px;display:flex;align-items:end;padding:21px;color:#eee6c9;background:radial-gradient(ellipse at 70% 20%,#b5be7755,transparent 30%),linear-gradient(140deg,#42604a,#0c1d14);font:750 29px Georgia,serif;letter-spacing:.12em}
      #le-nature-view .le-nature-issue-info{padding:17px}
      #le-nature-view .le-nature-issue-title{margin:8px 0;color:#f3ecd9;font:700 22px Georgia,serif}
      #le-nature-view .le-nature-issue-description,#le-nature-view .le-nature-issue-period,#le-nature-view .le-nature-issue-note{margin:7px 0;color:#c4d0bf;font-size:10px;line-height:1.55}
      #le-nature-view .le-nature-issue-note{color:#9eaf9b}
      #le-nature-view .le-nature-open,#le-nature-view .le-nature-saved-open{appearance:none;min-height:42px;padding:10px 14px;border:1px solid #d5c18b99;border-radius:11px;background:linear-gradient(135deg,#a58b4d8a,#62774999);color:#fff4d8;font-size:9px;font-weight:800;letter-spacing:.08em}
      #le-nature-view .le-nature-section-title{margin:0 0 8px;color:#edf0dc;font:700 18px Georgia,serif}
      #le-nature-view .le-nature-saved-panel{margin:17px 0 0;padding:14px;border:1px solid #b5c89a30;border-radius:15px;background:#0b1b13c9}
      #le-nature-view .le-nature-muted,#le-nature-view .le-nature-empty{color:#9eaf9c;font-size:9px;line-height:1.5}
      #le-nature-view .le-nature-saved-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #d0dcc21b}
      #le-nature-view .le-nature-saved-name{color:#ecebdc;font-size:10px}
      #le-nature-view .le-nature-bottom-fade{position:fixed;left:0;right:0;bottom:0;height:calc(env(safe-area-inset-bottom) + 100px);z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent,#091710de)}
      @media(min-width:760px){#le-nature-view .le-nature-story{grid-template-columns:42px minmax(0,1fr)}#le-nature-view .le-nature-photo img{max-height:440px}}
      @media(orientation:landscape){#le-nature-view .le-nature-scroll{padding-left:max(22px,env(safe-area-inset-left));padding-right:max(22px,env(safe-area-inset-right))}#le-nature-view .le-nature-wordmark{font-size:30px}}
      @media(prefers-reduced-motion:reduce){#le-nature-view *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
    root=el('section'); root.id='le-nature-view'; root.hidden=true; root.setAttribute('role','region'); root.setAttribute('aria-label','Nature view');
    const scroll=el('div','le-nature-scroll'), inner=el('div','le-nature-inner'), mast=el('header','le-nature-mast');
    mast.append(el('div','le-nature-eyebrow','A LIVE // EARTH VIEW'),el('h1','le-nature-wordmark','NATURE'),el('p','le-nature-subtitle','Wildlife · Ecology · Oceans · Conservation'));
    const tabs=el('nav','le-nature-tabs'); tabs.setAttribute('aria-label','Nature publications');
    const discover=el('button','le-nature-tab','Field Reports'); discover.type='button'; discover.setAttribute('aria-pressed','true');
    const monthly=el('button','le-nature-tab','Monthly Journal'); monthly.type='button'; monthly.setAttribute('aria-pressed','false');
    tabs.append(discover,monthly);
    const content=el('div','le-nature-discover');
    feedStatus=el('p','le-nature-status','Connect to load Nature reports.');
    feedArea=el('div','le-nature-feed');
    content.append(feedStatus,feedArea);
    const journal=el('div','le-nature-journal'); journal.hidden=true;
    issueArea=el('div','le-nature-issue-area');
    savedArea=el('div','le-nature-saved-area');
    journal.append(issueArea,savedArea);
    discover.addEventListener('click',()=>{content.hidden=false;journal.hidden=true;discover.setAttribute('aria-pressed','true');monthly.setAttribute('aria-pressed','false');});
    monthly.addEventListener('click',()=>{content.hidden=true;journal.hidden=false;discover.setAttribute('aria-pressed','false');monthly.setAttribute('aria-pressed','true');if(currentCatalog)renderIssue(currentCatalog);});
    inner.append(mast,tabs,content,journal); scroll.append(inner);
    const fade=el('div','le-nature-bottom-fade'); fade.setAttribute('aria-hidden','true');
    root.append(scroll,fade); document.body.append(root);
  }
  async function activate() {
    if (active) return;
    if (!window.LiveEarthFeatureViews?.isActive?.('nature')) { /* Stacks may call activation before its state flips. */ }
    const stage=document.getElementById('le-feature-stage'); if (stage) stage.hidden=true;
    build(); active=true; root.hidden=false; root.setAttribute('aria-hidden','false');
    document.body.classList.add('le-nature-view-open');
    window.dispatchEvent(new CustomEvent('live-earth-nature-view-change',{detail:{active:true}}));
    await refresh();
  }
  function deactivate() {
    active=false;
    if (window.LiveEarthUniversalPDFViewer?.isOpen?.()) window.LiveEarthUniversalPDFViewer.close();
    if (root) {root.hidden=true;root.setAttribute('aria-hidden','true');}
    document.body.classList.remove('le-nature-view-open');
    window.dispatchEvent(new CustomEvent('live-earth-nature-view-change',{detail:{active:false}}));
  }
  function showTab(tab) {
    const tabs=root?.querySelectorAll('.le-nature-tab'); if (!tabs) return;
    const discover= root.querySelector('.le-nature-discover'), journal=root.querySelector('.le-nature-journal');
    const isMonthly=tab==='monthly';
    discover.hidden=isMonthly; journal.hidden=!isMonthly;
    tabs[0].setAttribute('aria-pressed',String(!isMonthly)); tabs[1].setAttribute('aria-pressed',String(isMonthly));
    if (isMonthly && currentCatalog) renderIssue(currentCatalog);
  }
  window.addEventListener('offline',()=>{
    if (!active) return;
    currentFeed=null; currentCatalog=null;
    if(feedArea)feedArea.replaceChildren();
    if(issueArea)issueArea.replaceChildren();
    setStatus('You are offline. Live Nature reports and the online catalogue have been cleared. PDFs saved through the Global PDF Reader remain available.','warning');
    ensureServices().then(()=>renderSaved()).catch(()=>{});
  });
  window.addEventListener('online',()=>{if(active)refresh();});
  window.addEventListener('live-earth-pdf-viewer-close',()=>{if(active)renderSaved();});
  window.LiveEarthNatureViewModule=Object.freeze({activate,deactivate,refresh,showTab});
})();
