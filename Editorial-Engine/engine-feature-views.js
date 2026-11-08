/* LIVE // EARTH — Universal Editorial Engine Feature Orb workspace.
   This module registers the Editorial Engine only. It does not create an Orb,
   alter Global Orb behaviour, or load any collection/publishing service. */
(() => {
  'use strict';
  if (window.__liveEarthEngineFeatureViewsInstalled) return;

  const view = {
    id: 'editorial-engine',
    title: 'Editorial Engine',
    shortLabel: 'Editorial',
    symbol: '✍️',
    description: 'A full-screen workspace for the Universal Editorial Engine.',
    label: 'LIVE // EARTH  ·  EDITORIAL WORKSPACE',
    titleLine: 'Editorial',
    accent: 'Engine',
    subtitle: 'Clarity, structure and visual rhythm — brought together in one editorial workspace.'
  };

  const css = `
    .le-engine-view{position:fixed;inset:0;z-index:6;display:grid;place-items:center;isolation:isolate;overflow:hidden;padding:calc(env(safe-area-inset-top) + 38px) 24px calc(env(safe-area-inset-bottom) + 112px);color:#f6f7f8;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .le-engine-view[hidden]{display:none!important}.le-engine-view *{box-sizing:border-box}
    .le-engine-view:before,.le-engine-view:after,.le-engine-art,.le-engine-art:before,.le-engine-art:after{content:"";position:absolute;inset:0;pointer-events:none}
    .le-engine-view:before{z-index:-2}.le-engine-view:after{z-index:-1;opacity:.42}.le-engine-art{z-index:-1;overflow:hidden}
    .le-engine-art:before,.le-engine-art:after{inset:auto;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%)}
    .le-engine-view--editorial{background:radial-gradient(ellipse at 50% 43%,#56371f 0,transparent 46%),radial-gradient(ellipse at 5% 5%,#a86a3444,transparent 40%),linear-gradient(145deg,#17120f,#090a0d 55%,#140d0b)}
    .le-engine-view--editorial:before{background:repeating-linear-gradient(0deg,transparent 0 47px,#dbb8890a 48px,transparent 49px),linear-gradient(90deg,transparent 10%,#d4a76b10 10.1%,transparent 10.3% 89.7%,#d4a76b10 89.9%,transparent 90%)}
    .le-engine-view--editorial:after{background-image:radial-gradient(1px 1px at 13% 20%,#efd4a588 98%,transparent),radial-gradient(1px 1px at 82% 17%,#efd4a566 98%,transparent),radial-gradient(1px 1px at 74% 76%,#efd4a577 98%,transparent)}
    .le-engine-view--editorial .le-engine-art:before{width:min(78vw,620px);aspect-ratio:1;border:1px solid #d6a66935;box-shadow:0 0 0 25px #d6a6690a,0 0 0 70px #d6a66908,inset 0 0 70px #d6a66912;transform:translate(-50%,-50%) rotate(-18deg)}
    .le-engine-view--editorial .le-engine-art:after{width:min(54vw,420px);aspect-ratio:1;background:radial-gradient(circle,#d0975330,#d0975309 48%,transparent 72%);filter:blur(5px)}
    .le-engine-view--editorial .le-engine-eyebrow{color:#e2bf89}.le-engine-view--editorial .le-engine-title span{color:#e2b777;text-shadow:0 0 34px #cf975355}.le-engine-view--editorial .le-engine-mark{background:linear-gradient(90deg,transparent,#c89a65,#f0d3a1,transparent)}
    .le-engine-header{position:absolute;top:calc(env(safe-area-inset-top) + 26px);left:24px;right:24px;display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left}
    .le-engine-brand{font-size:10px;font-weight:850;letter-spacing:.2em;color:#edf4f7;text-shadow:0 2px 12px #0008}.le-engine-label{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#e2edf4a6;text-align:right}
    .le-engine-content{position:relative;z-index:1;width:min(100%,720px);margin-top:-2vh}
    .le-engine-eyebrow{margin:0 0 18px;font-size:9px;font-weight:800;letter-spacing:.23em;line-height:1.5;text-transform:uppercase}
    .le-engine-title{margin:0;font-size:clamp(43px,11.5vw,82px);font-weight:650;letter-spacing:-.065em;line-height:.94;color:#f7f5f0;text-wrap:balance}
    .le-engine-title span{display:block;margin-top:.08em;font-weight:420;letter-spacing:-.045em}
    .le-engine-mark{width:min(120px,28vw);height:1px;margin:28px auto 22px;opacity:.9}
    .le-engine-subtitle{max-width:460px;margin:0 auto;color:#e5ebefc9;font-size:clamp(12px,3.2vw,14px);line-height:1.8;letter-spacing:.015em;text-wrap:balance}
    .le-feature-library-item .le-feature-symbol{font-size:clamp(30px,8vmin,42px);filter:drop-shadow(0 2px 5px rgba(0,0,0,.72))}
    #le-feature-dock .le-feature-orb .le-feature-symbol{font-size:clamp(30px,8vmin,42px)}
    #le-feature-library .le-feature-library-item[data-feature="editorial-engine"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="editorial-engine"] .orbShell{background:radial-gradient(circle at 30% 22%,#ffe0a8 0,#b7793d 24%,#4b281b 67%,#160e0b 100%);border-color:#f4d09a;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #160a0acc,0 0 22px #d69c5577,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item .orbShell:before{background:radial-gradient(ellipse at 28% 16%,rgba(255,255,255,.58),transparent 30%),linear-gradient(138deg,rgba(255,255,255,.25),rgba(255,255,255,.035) 27%,transparent 47%,rgba(255,255,255,.09) 76%,rgba(255,255,255,.22))}
    @media(min-width:700px){.le-engine-header{left:38px;right:38px}.le-engine-content{margin-top:-3vh}}
    @media(orientation:landscape) and (max-height:520px){.le-engine-view{padding-top:70px;padding-bottom:100px}.le-engine-content{margin-top:0}.le-engine-eyebrow{margin-bottom:10px}.le-engine-title{font-size:clamp(36px,9vh,58px)}.le-engine-mark{margin:16px auto 12px}.le-engine-subtitle{font-size:11px;max-width:540px}}
    @media(prefers-reduced-motion:reduce){.le-engine-view *{animation:none!important;transition:none!important}}
  `;

  let root = null;
  function ensureStyles() {
    if (document.getElementById('le-engine-feature-views-style')) return;
    const style = document.createElement('style');
    style.id = 'le-engine-feature-views-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build() {
    if (root?.isConnected) return root;
    ensureStyles();
    root = document.getElementById('le-editorial-engine-view');
    if (root) return root;
    root = document.createElement('section');
    root.id = 'le-editorial-engine-view';
    root.className = 'le-engine-view le-engine-view--editorial';
    root.dataset.feature = view.id;
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
    label.textContent = view.label;
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
    return root;
  }

  function activate() {
    const stage = document.getElementById('le-feature-stage');
    if (stage) stage.hidden = true;
    const element = build();
    element.hidden = false;
    element.setAttribute('aria-hidden', 'false');
  }

  function deactivate() {
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  }

  function install() {
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return false;
    api.register(view.id, {
      title: view.title,
      shortLabel: view.shortLabel,
      symbol: view.symbol,
      description: view.description,
      connected: true,
      activate,
      deactivate
    });
    const open = () => api.open(view.id, 'api');
    window.__liveEarthEngineFeatureViewsInstalled = true;
    window.LiveEarthEngineViews = Object.freeze({
      open,
      openEditorial: open,
      close: () => api.close('api'),
      isActive: () => api.isActive(view.id)
    });
    window.dispatchEvent(new Event('live-earth-engine-feature-views-ready'));
    return true;
  }

  if (!install()) window.addEventListener('live-earth-feature-views-ready', install, { once: true });
})();
