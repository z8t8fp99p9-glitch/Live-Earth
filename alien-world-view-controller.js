/* LIVE // EARTH — Alien World full-screen view shell.
   Content is intentionally empty: the global Publisher/Editorial Engine will supply it.
   Orb opening, closing, animation, glow and Location/Stacks controls remain owned by
   the shared Feature Orb system. This file does not collect data or build magazines. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldViewInstalled || window.__liveEarthAlienWorldViewWaiting) return;
  window.__liveEarthAlienWorldViewWaiting = true;

  function install() {
    if (window.__liveEarthAlienWorldViewInstalled) return;
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return;

    const STYLE_ID = 'le-alien-world-view-style';
    const ROOT_ID = 'le-alien-world-view';

    const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{
      position:fixed;
      inset:0;
      z-index:6;
      display:block;
      width:100%;
      height:100%;
      height:100dvh;
      overflow:hidden;
      isolation:isolate;
      color:#edf5ff;
      background:
        radial-gradient(ellipse at 50% 42%,rgba(48,39,91,.18),transparent 52%),
        radial-gradient(ellipse at 15% 8%,rgba(30,78,105,.15),transparent 38%),
        linear-gradient(180deg,#050711 0%,#080b18 52%,#03050c 100%);
      pointer-events:none;
    }
    #${ROOT_ID}[hidden]{display:none!important}
    #${ROOT_ID}::before{
      content:"";
      position:absolute;
      inset:0;
      opacity:.34;
      background-image:
        radial-gradient(1px 1px at 12% 18%,#d8e8ff 98%,transparent),
        radial-gradient(1px 1px at 27% 72%,#b9c9ff 98%,transparent),
        radial-gradient(1px 1px at 44% 28%,#fff 98%,transparent),
        radial-gradient(1px 1px at 68% 16%,#c5d5ff 98%,transparent),
        radial-gradient(1px 1px at 83% 61%,#fff 98%,transparent),
        radial-gradient(1px 1px at 91% 34%,#c8d8ff 98%,transparent),
        radial-gradient(1px 1px at 57% 84%,#fff 98%,transparent);
      background-size:100% 100%;
      pointer-events:none;
    }
    #${ROOT_ID} .le-aw-canvas{
      position:absolute;
      inset:0;
      padding:
        calc(env(safe-area-inset-top) + 18px)
        18px
        calc(env(safe-area-inset-bottom) + 112px);
      pointer-events:none;
    }
    #${ROOT_ID} .le-aw-title{
      position:absolute;
      top:calc(env(safe-area-inset-top) + 22px);
      left:0;
      right:0;
      margin:0;
      text-align:center;
      color:rgba(231,239,255,.76);
      font:750 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:.34em;
      text-transform:uppercase;
      text-shadow:0 2px 14px #000;
    }
    @media(prefers-reduced-motion:reduce){
      #${ROOT_ID}::before{scroll-behavior:auto}
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.hidden = true;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Alien World');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="le-aw-canvas" aria-hidden="true">
      <h1 class="le-aw-title">ALIEN WORLD</h1>
    </div>
  `;
  document.body.appendChild(root);

  const stage = () => document.getElementById('le-feature-stage');

  function activate() {
    const genericStage = stage();
    if (genericStage) genericStage.hidden = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', {
      detail: { active: true }
    }));
  }

  function deactivate() {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('le-alien-world-open');
    window.dispatchEvent(new CustomEvent('live-earth-alien-world-view-change', {
      detail: { active: false }
    }));
  }

    api.register('alien-world', {
    title: 'Alien View',
    shortLabel: 'Alien View',
    symbol: '🛸',
    description: 'Full-screen Alien View.',
    connected: true,
    activate,
    deactivate
  });

    window.__liveEarthAlienWorldViewInstalled = true;
    window.__liveEarthAlienWorldViewWaiting = false;
    window.LiveEarthAlienWorldView = Object.freeze({
      open: () => api.open('alien-world', 'api'),
      close: () => api.close('api'),
      isOpen: () => api.isActive('alien-world')
    });
  }

  if (window.LiveEarthFeatureViews?.register) install();
  else window.addEventListener('live-earth-feature-views-ready', install, { once: true });
})();
