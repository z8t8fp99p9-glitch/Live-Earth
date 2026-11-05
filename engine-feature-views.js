/* LIVE // EARTH — dedicated full-screen workspaces for the shared Global Engines. */
(() => {
  'use strict';
  if (window.__liveEarthEngineFeatureViewsInstalled) return;

  const views = [
    {id:'editorial-engine',title:'Editorial Engine',shortLabel:'Editorial',symbol:'✒',
      description:'A full-screen workspace for the shared Global Editorial Engine.',
      label:'LIVE // EARTH  ·  GLOBAL EDITORIAL SYSTEM',titleLine:'Editorial',accent:'Engine',
      subtitle:'Clarity, structure and visual rhythm — brought together in one editorial workspace.'},
    {id:'image-engine',title:'Image Engine',shortLabel:'Image',symbol:'◉',
      description:'A full-screen workspace for the shared Global Image Engine.',
      label:'LIVE // EARTH  ·  GLOBAL IMAGE SYSTEM',titleLine:'Image',accent:'Engine',
      subtitle:'Discovery, preparation and visual intelligence — together in one image workspace.'}
  ];

  const css = [
    '.le-engine-view{position:fixed;inset:0;z-index:6;display:grid;place-items:center;isolation:isolate;overflow:hidden;padding:calc(env(safe-area-inset-top) + 38px) 24px calc(env(safe-area-inset-bottom) + 112px);color:#f6f2ea;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.le-engine-view[hidden]{display:none!important}.le-engine-view *{box-sizing:border-box}',
    '.le-engine-view:before,.le-engine-view:after,.le-engine-art,.le-engine-art:before,.le-engine-art:after{content:"";position:absolute;inset:0;pointer-events:none}',
    '.le-engine-view:before{z-index:-2}.le-engine-view:after{z-index:-1;opacity:.32}.le-engine-art{z-index:-1;overflow:hidden}',
    '.le-engine-art:before,.le-engine-art:after{inset:auto;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%)}',
    '.le-engine-view--editorial{background:radial-gradient(ellipse at 50% 43%,#422b1b 0,transparent 46%),radial-gradient(ellipse at 5% 5%,#8a562b44,transparent 40%),linear-gradient(145deg,#17120f,#090a0d 55%,#140d0b)}',
    '.le-engine-view--editorial:before{background:repeating-linear-gradient(0deg,transparent 0 47px,#dbb88908 48px,transparent 49px),linear-gradient(90deg,transparent 10%,#d4a76b0b 10.1%,transparent 10.3% 89.7%,#d4a76b0b 89.9%,transparent 90%)}',
    '.le-engine-view--editorial:after{background-image:radial-gradient(1px 1px at 13% 20%,#efd4a588 98%,transparent),radial-gradient(1px 1px at 82% 17%,#efd4a566 98%,transparent),radial-gradient(1px 1px at 74% 76%,#efd4a577 98%,transparent)}',
    '.le-engine-view--editorial .le-engine-art:before{width:min(78vw,620px);aspect-ratio:1;border:1px solid #d6a6692b;box-shadow:0 0 0 25px #d6a66908,0 0 0 70px #d6a66906,inset 0 0 70px #d6a6690b;transform:translate(-50%,-50%) rotate(-18deg)}',
    '.le-engine-view--editorial .le-engine-art:after{width:min(54vw,420px);aspect-ratio:1;background:radial-gradient(circle,#d0975324,#d0975309 48%,transparent 72%);filter:blur(5px)}',
    '.le-engine-view--editorial .le-engine-eyebrow{color:#d6b27e}.le-engine-view--editorial .le-engine-title span{color:#d9ad72;text-shadow:0 0 34px #cf975338}.le-engine-view--editorial .le-engine-mark{background:linear-gradient(90deg,transparent,#c89a65,#f0d3a1,transparent)}',
    '.le-engine-view--image{background:radial-gradient(ellipse at 50% 43%,#126f933d,transparent 46%),radial-gradient(ellipse at 88% 12%,#5c4bb840,transparent 38%),linear-gradient(145deg,#06111c,#050a14 52%,#0a0b1c)}',
    '.le-engine-view--image:before{background:linear-gradient(#65c3e108 1px,transparent 1px),linear-gradient(90deg,#65c3e108 1px,transparent 1px);background-size:38px 38px;mask-image:radial-gradient(ellipse at center,#000 12%,transparent 78%)}',
    '.le-engine-view--image:after{background-image:radial-gradient(1px 1px at 16% 18%,#b7f4ff99 98%,transparent),radial-gradient(1px 1px at 85% 24%,#b7f4ff77 98%,transparent),radial-gradient(1px 1px at 76% 82%,#b7f4ff88 98%,transparent)}',
    '.le-engine-view--image .le-engine-art:before{width:min(82vw,660px);aspect-ratio:1;border:1px solid #59d2ef30;box-shadow:0 0 0 24px #59d2ef09,0 0 0 62px #59d2ef06,0 0 0 108px #7e69e809,inset 0 0 80px #37b7dc12}',
    '.le-engine-view--image .le-engine-art:after{width:min(58vw,460px);aspect-ratio:1;background:radial-gradient(circle,#37cae126,#5173db14 42%,transparent 72%);filter:blur(8px)}',
    '.le-engine-view--image .le-engine-eyebrow{color:#8dd9ec}.le-engine-view--image .le-engine-title span{color:#81d9ec;text-shadow:0 0 34px #39c5e73f}.le-engine-view--image .le-engine-mark{background:linear-gradient(90deg,transparent,#4fc3df,#a4a0ff,transparent)}',
    '.le-engine-header{position:absolute;top:calc(env(safe-area-inset-top) + 26px);left:24px;right:24px;display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left}',
    '.le-engine-brand{font-size:10px;font-weight:850;letter-spacing:.2em;color:#edf4f7;text-shadow:0 2px 12px #0008}.le-engine-label{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#e2edf496}',
    '.le-engine-content{position:relative;z-index:1;width:min(100%,720px);margin-top:-2vh}',
    '.le-engine-eyebrow{margin:0 0 18px;font-size:9px;font-weight:800;letter-spacing:.23em;line-height:1.5;text-transform:uppercase}',
    '.le-engine-title{margin:0;font-size:clamp(43px,11.5vw,82px);font-weight:650;letter-spacing:-.065em;line-height:.94;color:#f7f5f0;text-wrap:balance}',
    '.le-engine-title span{display:block;margin-top:.08em;font-weight:420;letter-spacing:-.045em}',
    '.le-engine-mark{width:min(120px,28vw);height:1px;margin:28px auto 22px;opacity:.8}',
    '.le-engine-subtitle{max-width:440px;margin:0 auto;color:#e5ebefc2;font-size:clamp(12px,3.2vw,14px);line-height:1.8;letter-spacing:.015em;text-wrap:balance}',
    '@media(min-width:700px){.le-engine-header{left:38px;right:38px}.le-engine-content{margin-top:-3vh}}',
    '@media(orientation:landscape) and (max-height:520px){.le-engine-view{padding-top:70px;padding-bottom:100px}.le-engine-content{margin-top:0}.le-engine-eyebrow{margin-bottom:10px}.le-engine-title{font-size:clamp(36px,9vh,58px)}.le-engine-mark{margin:16px auto 12px}.le-engine-subtitle{font-size:11px;max-width:540px}}',
    '@media(prefers-reduced-motion:reduce){.le-engine-view *{animation:none!important;transition:none!important}}'
  ].join('\n');

  const roots = new Map();
  function ensureStyles() {
    if (document.getElementById('le-engine-feature-views-style')) return;
    const style = document.createElement('style');
    style.id = 'le-engine-feature-views-style';
    style.textContent = css;
    document.head.appendChild(style);
  }
  function build(view) {
    if (roots.has(view.id)) return roots.get(view.id);
    ensureStyles();
    const root = document.createElement('section');
    root.id = 'le-' + view.id + '-view';
    root.className = 'le-engine-view le-engine-view--' + (view.id === 'editorial-engine' ? 'editorial' : 'image');
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', view.title);
    root.setAttribute('aria-hidden', 'true');

    const art = document.createElement('div');
    art.className = 'le-engine-art';
    art.setAttribute('aria-hidden', 'true');
    const header = document.createElement('header');
    header.className = 'le-engine-header';
    const brand = document.createElement('span');
    brand.className = 'le-engine-brand';
    brand.textContent = 'LIVE // EARTH';
    const label = document.createElement('span');
    label.className = 'le-engine-label';
    label.textContent = 'GLOBAL WORKSPACE';
    header.append(brand, label);

    const main = document.createElement('main');
    main.className = 'le-engine-content';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'le-engine-eyebrow';
    eyebrow.textContent = view.label;
    const title = document.createElement('h1');
    title.className = 'le-engine-title';
    title.textContent = view.titleLine;
    const accent = document.createElement('span');
    accent.textContent = view.accent;
    title.appendChild(accent);
    const mark = document.createElement('div');
    mark.className = 'le-engine-mark';
    mark.setAttribute('aria-hidden', 'true');
    const subtitle = document.createElement('p');
    subtitle.className = 'le-engine-subtitle';
    subtitle.textContent = view.subtitle;
    main.append(eyebrow, title, mark, subtitle);
    root.append(art, header, main);
    document.body.appendChild(root);
    roots.set(view.id, root);
    return root;
  }
  function activate(view) {
    const stage = document.getElementById('le-feature-stage');
    if (stage) stage.hidden = true;
    const root = build(view);
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
  }
  function deactivate(view) {
    const root = roots.get(view.id);
    if (root) {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
    }
  }
  function install() {
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return false;
    for (const view of views) {
      api.register(view.id, {
        title:view.title, shortLabel:view.shortLabel, symbol:view.symbol,
        description:view.description, connected:true,
        activate:() => activate(view),
        deactivate:() => deactivate(view)
      });
    }
    window.__liveEarthEngineFeatureViewsInstalled = true;
    window.LiveEarthEngineViews = Object.freeze({
      openEditorial:() => api.open('editorial-engine','api'),
      openImage:() => api.open('image-engine','api'),
      close:() => api.close('api'),
      isActive:id => api.isActive(id)
    });
    window.dispatchEvent(new Event('live-earth-engine-feature-views-ready'));
    return true;
  }
  if (!install()) window.addEventListener('live-earth-feature-views-ready', install, {once:true});
})();
