/* LIVE // EARTH — Nature Live Feeds view.
   This view folder owns its controller and browser feed client. */
(() => {
  'use strict';
  if (window.LiveEarthNatureViewModule) return;

  const VIEW_ID='nature';
  const ROOT_ID='le-nature-view';
  const REFRESH_MS=5*60*1000;
  let root=null,active=false,refreshTimer=0,servicesPromise=null,feedArea=null;

  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined&&text!==null)node.textContent=String(text);
    return node;
  };
  const dateText=value=>{
    const date=new Date(value);
    return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(date):'Recently reported';
  };
  function loadScript(path,globalName){
    if(window[globalName])return Promise.resolve();
    const url=new URL(path,document.baseURI).href;
    return new Promise((resolve,reject)=>{
      let script=[...document.scripts].find(item=>item.src===url),settled=false,timer=0;
      const finish=fn=>{if(settled)return;settled=true;clearTimeout(timer);fn();};
      if(!script){script=document.createElement('script');script.src=url;script.async=true;}
      script.addEventListener('load',()=>finish(()=>window[globalName]?resolve():reject(new Error(`${path} did not register.`))),{once:true});
      script.addEventListener('error',()=>finish(()=>reject(new Error(`Could not load ${path}.`))),{once:true});
      if(!script.isConnected)document.head.appendChild(script);
      timer=setTimeout(()=>finish(()=>reject(new Error(`Timed out loading ${path}.`))),15000);
    });
  }
  function ensureServices(){
    if(window.LiveEarthUniversalEditorialEngine?.validateFeed&&window.LiveEarthNaturePublisher?.loadFeed)return Promise.resolve();
    if(servicesPromise)return servicesPromise;
    servicesPromise=loadScript('./editorial-engine/universal-editorial-engine.js','LiveEarthUniversalEditorialEngine')
      .then(()=>loadScript('./nature/view/nature-publisher-client.js','LiveEarthNaturePublisher'))
      .catch(error=>{servicesPromise=null;throw error;});
    return servicesPromise;
  }
  function imageFigure(story){
    const figure=el('figure','le-nature-photo');
    const img=el('img','le-nature-photo-image');
    img.src=story.imageUrl;img.alt=story.imageCaption||story.title||'Documentary photograph';
    img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>figure.replaceChildren(el('div','le-nature-photo-missing','Photograph temporarily unavailable')),{once:true});
    figure.appendChild(img);
    if(story.imageCaption)figure.appendChild(el('figcaption','le-nature-photo-caption',story.imageCaption));
    if(story.imageCredit){
      const credit=el('div','le-nature-photo-credit',story.imageCredit);
      if(story.imageSourceUrl){const link=el('a','le-nature-credit-link','Original photo record ↗');link.href=story.imageSourceUrl;link.target='_blank';link.rel='noopener noreferrer';credit.append(' · ',link);}
      figure.appendChild(credit);
    }
    if(story.imageRightsNote)figure.appendChild(el('div','le-nature-photo-note',story.imageRightsNote));
    return figure;
  }
  function storyCard(story,index){
    const card=el('article','le-nature-story');
    card.dataset.storyId=story.id||`story-${index+1}`;
    card.appendChild(el('div','le-nature-story-number',String(index+1).padStart(2,'0')));
    const body=el('div','le-nature-story-body');
    body.appendChild(el('div','le-nature-story-meta',`${story.sourceName||'SOURCE REPORT'} · ${dateText(story.publishedAt)}`));
    body.appendChild(el('h2','le-nature-story-title',story.title||'Nature report'));
    if(story.imageUrl)body.appendChild(imageFigure(story));
    else body.appendChild(el('div','le-nature-no-photo','FIELD NOTE · No exact, rights-verified photograph was available for this report.'));
    body.appendChild(el('p','le-nature-story-summary',story.summary||'Read the original report for the full account.'));
    const footer=el('div','le-nature-story-footer');
    footer.appendChild(el('span','le-nature-source-name',story.sourceName||'Original publisher'));
    const link=el('a','le-nature-source-link','Read original report ↗');
    link.href=story.url;link.target='_blank';link.rel='noopener noreferrer';
    footer.appendChild(link);body.appendChild(footer);card.appendChild(body);
    return card;
  }
  function renderFeed(feed){
    if(!feedArea)return;
    feedArea.replaceChildren();
    const stories=Array.isArray(feed?.stories)?feed.stories:[];
    if(!stories.length){feedArea.appendChild(el('p','le-nature-empty','No eligible Nature reports are available in the current rolling feed yet.'));return;}
    stories.forEach((story,index)=>feedArea.appendChild(storyCard(story,index)));
  }
  async function refresh(){
    if(!active||!feedArea)return;
    feedArea.replaceChildren(el('p','le-nature-empty','Loading Nature Live Feeds…'));
    try{
      await ensureServices();
      const feed=await window.LiveEarthNaturePublisher.loadFeed();
      if(!active)return;
      renderFeed(feed);
    }catch(error){
      if(!active)return;
      const message=navigator.onLine===false
        ?'Nature Live Feeds need an internet connection. Reconnect to load current reports.'
        :`${error?.message||'Nature Live Feeds are temporarily unavailable.'} Please try again shortly.`;
      feedArea.replaceChildren(el('p','le-nature-empty',message));
    }
  }
  function build(){
    if(root)return;
    const style=el('style');style.id='le-nature-module-style';
    style.textContent=`
      #${ROOT_ID}{position:fixed;inset:0;z-index:6;display:block;overflow:hidden;isolation:isolate;color:#edf1e6;background:radial-gradient(ellipse at 50% 0%,#78926a42,transparent 45%),linear-gradient(180deg,#091a12,#14281d 52%,#08150f);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID} .le-nature-scroll{position:absolute;inset:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top) + 22px) 16px calc(env(safe-area-inset-bottom) + 130px);scrollbar-width:none}
      #${ROOT_ID} .le-nature-scroll::-webkit-scrollbar{display:none}
      #${ROOT_ID} .le-nature-inner{max-width:900px;margin:auto}
      #${ROOT_ID} .le-nature-mast{position:relative;text-align:center;margin:0 auto;padding:0 0 20px;border-bottom:1px solid #d0dabb28}
      #${ROOT_ID} .le-nature-eyebrow{color:#c5b985;font-size:8px;font-weight:800;letter-spacing:.27em;text-transform:uppercase}
      #${ROOT_ID} .le-nature-wordmark{font:750 clamp(32px,8vw,46px)/1 Georgia,serif;letter-spacing:.14em;color:#f2ecd8;margin:9px 0 6px;text-shadow:0 4px 24px #0008}
      #${ROOT_ID} .le-nature-subtitle{margin:0;color:#aebda9;font-size:9px;letter-spacing:.14em;text-transform:uppercase}
      #${ROOT_ID} .le-nature-section-title{margin:22px 1px 14px;color:#edf0dc;font:750 18px Georgia,serif;letter-spacing:.12em;text-transform:uppercase}
      #${ROOT_ID} .le-nature-feed{display:grid;gap:12px}
      #${ROOT_ID} .le-nature-story{display:grid;grid-template-columns:30px minmax(0,1fr);gap:8px;margin:0;padding:15px 13px;border:1px solid #c7d5b32a;border-radius:17px;background:linear-gradient(140deg,#20392be8,#0d1c14ed);box-shadow:0 14px 30px #0004}
      #${ROOT_ID} .le-nature-story-number{color:#cfbf8a;font:italic 14px Georgia,serif;padding-top:3px}
      #${ROOT_ID} .le-nature-story-meta{margin:0 0 8px;color:#d4c58d;font-size:7px;font-weight:800;letter-spacing:.14em;line-height:1.5;text-transform:uppercase}
      #${ROOT_ID} .le-nature-story-title{margin:0 0 11px;color:#f2eedf;font:700 clamp(18px,4.8vw,24px)/1.16 Georgia,serif;letter-spacing:-.01em}
      #${ROOT_ID} .le-nature-photo{margin:0 0 12px;overflow:hidden;border-radius:13px;border:1px solid #d2dfc322;background:#07130d}
      #${ROOT_ID} .le-nature-photo-image{display:block;width:100%;max-height:310px;object-fit:cover;background:#0d1b13}
      #${ROOT_ID} .le-nature-photo-caption{padding:9px 10px 2px;color:#d5d9c8;font:italic 11px/1.45 Georgia,serif}
      #${ROOT_ID} .le-nature-photo-credit,#${ROOT_ID} .le-nature-photo-note{padding:5px 10px 8px;color:#9eae9b;font-size:8px;line-height:1.45;overflow-wrap:anywhere}
      #${ROOT_ID} .le-nature-photo-note{color:#cbbd91;padding-top:0}
      #${ROOT_ID} .le-nature-credit-link,#${ROOT_ID} .le-nature-source-link{color:#e2d39e;text-decoration:none;font-weight:750}
      #${ROOT_ID} .le-nature-no-photo{margin:0 0 10px;padding:10px 12px;border:1px solid #d2c58b44;border-radius:10px;color:#c5bd99;font-size:9px;line-height:1.45;background:#0a170f}
      #${ROOT_ID} .le-nature-photo-missing{padding:35px 15px;text-align:center;color:#b6c4aa;font:italic 14px Georgia,serif}
      #${ROOT_ID} .le-nature-story-summary{margin:0;color:#cad3c4;font-size:11px;line-height:1.65;white-space:pre-line}
      #${ROOT_ID} .le-nature-story-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:13px;padding-top:10px;border-top:1px solid #d4dfc51b}
      #${ROOT_ID} .le-nature-source-name{color:#9eae9c;font-size:8px}
      #${ROOT_ID} .le-nature-empty{margin:0;padding:15px;border:1px dashed #b5c89a44;border-radius:12px;color:#b6c4aa;font-size:10px;line-height:1.55;background:#0a170f88}
      #${ROOT_ID} .le-nature-bottom-fade{position:fixed;left:0;right:0;bottom:0;height:calc(env(safe-area-inset-bottom) + 100px);z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent,#091710de)}
      @media(min-width:760px){#${ROOT_ID} .le-nature-story{grid-template-columns:42px minmax(0,1fr)}#${ROOT_ID} .le-nature-photo-image{max-height:440px}}
      @media(orientation:landscape){#${ROOT_ID} .le-nature-scroll{padding-left:max(22px,env(safe-area-inset-left));padding-right:max(22px,env(safe-area-inset-right))}#${ROOT_ID} .le-nature-wordmark{font-size:30px}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    if(!document.getElementById(style.id))document.head.appendChild(style);
    root=el('section');root.id=ROOT_ID;root.hidden=true;root.setAttribute('role','region');root.setAttribute('aria-label','Nature Live Feeds');
    const scroll=el('div','le-nature-scroll'),inner=el('div','le-nature-inner'),mast=el('header','le-nature-mast');
    mast.append(el('div','le-nature-eyebrow','A LIVE // EARTH VIEW'),el('h1','le-nature-wordmark','NATURE'),el('p','le-nature-subtitle','Wildlife · Ecology · Oceans · Conservation'));
    const heading=el('h2','le-nature-section-title','LIVE FEEDS');
    feedArea=el('div','le-nature-feed');
    inner.append(mast,heading,feedArea);scroll.append(inner);
    const fade=el('div','le-nature-bottom-fade');fade.setAttribute('aria-hidden','true');
    root.append(scroll,fade);document.body.append(root);
  }
  function activate(){
    const stage=document.getElementById('le-feature-stage');if(stage)stage.hidden=true;
    build();active=true;root.hidden=false;root.setAttribute('aria-hidden','false');
    document.body.classList.add('le-nature-view-open');
    window.dispatchEvent(new CustomEvent('live-earth-nature-view-change',{detail:{active:true}}));
    refresh();clearInterval(refreshTimer);
    refreshTimer=window.setInterval(()=>{if(active&&navigator.onLine!==false&&!document.hidden)refresh();},REFRESH_MS);
  }
  function deactivate(){
    active=false;clearInterval(refreshTimer);refreshTimer=0;
    if(feedArea)feedArea.replaceChildren();
    if(root){root.hidden=true;root.setAttribute('aria-hidden','true');}
    document.body.classList.remove('le-nature-view-open');
    window.dispatchEvent(new CustomEvent('live-earth-nature-view-change',{detail:{active:false}}));
  }
  function onOffline(){if(active&&feedArea)feedArea.replaceChildren(el('p','le-nature-empty','Nature Live Feeds are online-only. Reconnect to load current reports.'));}
  function onOnline(){if(active)refresh();}
  function install(){
    const api=window.LiveEarthFeatureViews;
    if(!api?.register)return false;
    api.register(VIEW_ID,{title:'Nature',shortLabel:'Nature',symbol:'🌿',description:'Live nature reports about wildlife, ecology, oceans and conservation.',connected:true,activate,deactivate});
    window.__liveEarthNatureViewInstalled=true;
    window.LiveEarthNatureView=Object.freeze({open:()=>api.open(VIEW_ID,'api'),close:()=>api.close(VIEW_ID),isOpen:()=>api.isActive(VIEW_ID),refresh});
    window.addEventListener('offline',onOffline);
    window.addEventListener('online',onOnline);
    return true;
  }
  window.LiveEarthNatureViewModule=Object.freeze({activate,deactivate,refresh,showTab:()=>false});
  if(!install())window.addEventListener('live-earth-feature-views-ready',install,{once:true});
})();
