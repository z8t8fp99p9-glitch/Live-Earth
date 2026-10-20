/* LIVE // EARTH — Earth mode chooser.
   Additive navigation layer: leaves the approved homepage scene and orb layout untouched. */
(() => {
  'use strict';
  if (window.__liveEarthModeNavigation) return;
  window.__liveEarthModeNavigation = true;

  const earthSelector = '.orbButton[data-view="earth"]';
  const style = document.createElement('style');
  style.textContent = `
    #le-mode-chooser {
      position:fixed; z-index:30; left:50%; top:50%; transform:translate(-50%,-50%);
      width:min(88vw,420px); max-height:calc(100dvh - 32px); overflow:auto;
      padding:18px; border:1px solid #b6e6ff50; border-radius:22px;
      background:linear-gradient(145deg,#102032f5,#050b16f7);
      box-shadow:inset 1px 1px 2px #ffffff20,0 12px 38px #000b,0 0 28px #38bfff18;
      backdrop-filter:blur(22px); -webkit-backdrop-filter:blur(22px);
      color:#eaf5ff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      touch-action:pan-y;
    }
    #le-mode-chooser[hidden]{display:none}
    #le-mode-chooser h2{font-size:21px;margin:0 42px 6px 0;font-weight:650}
    #le-mode-chooser p{font-size:12px;line-height:1.5;color:#a8bfd1;margin:0 0 14px}
    #le-mode-chooser .le-mode-close{float:right;border:1px solid #8fb5d544;border-radius:50%;
      background:#ffffff0b;color:#e8f6ff;width:32px;height:32px;font-size:20px}
    #le-mode-chooser .le-mode-choice{display:block;width:100%;margin:8px 0;padding:13px 14px;
      text-align:left;border:1px solid #8ecfff30;border-radius:14px;background:#ffffff08;
      color:#edf8ff;font:600 13px -apple-system,BlinkMacSystemFont,sans-serif}
    #le-mode-chooser .le-mode-choice:focus-visible{outline:2px solid #8de1ff;outline-offset:3px}
    #le-mode-chooser .le-mode-choice small{display:block;font-size:11px;font-weight:400;
      color:#9fb6ca;margin-top:4px;line-height:1.45}
    @media(prefers-reduced-motion:reduce){#le-mode-chooser *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('section');
  panel.id = 'le-mode-chooser';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'le-mode-title');
  panel.innerHTML = `
    <button class="le-mode-close" type="button" aria-label="Close Earth mode chooser">×</button>
    <h2 id="le-mode-title">Earth experience</h2>
    <p>Choose how you want to explore. Your Home Earth and Moon scene stays unchanged.</p>
    <div class="le-mode-options"></div>`;
  document.body.appendChild(panel);

  const options = panel.querySelector('.le-mode-options');
  const modes = [
    {
      mode: 'basic',
      title: 'Basic Live',
      detail: 'Interactive 2D street map · pan and zoom.',
      url: './location.html?mode=basic'
    },
    {
      mode: 'hd',
      title: 'HD Live',
      detail: 'Preview only: 3D buildings and richer imagery are not connected yet.',
      url: './location.html?mode=hd'
    },
    {
      mode: 'offline',
      title: 'Offline',
      detail: 'Preview only: saved map tiles are not bundled yet; no map-tile requests are made in this mode.',
      url: './location.html?mode=offline'
    }
  ];

  for (const item of modes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'le-mode-choice';
    button.append(document.createTextNode(item.title));
    const small = document.createElement('small');
    small.textContent = item.detail;
    button.append(small);
    button.addEventListener('click', () => {
      window.location.href = item.url;
    });
    options.append(button);
  }

  function closeChooser() {
    panel.hidden = true;
    const earth = document.querySelector(earthSelector);
    earth?.setAttribute('aria-expanded', 'false');
  }

  panel.querySelector('.le-mode-close').addEventListener('click', closeChooser);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) closeChooser();
  });

  // Capture the Earth click before the existing controller can treat it as Home.
  document.addEventListener('click', event => {
    const earth = event.target instanceof Element ? event.target.closest(earthSelector) : null;
    if (!earth) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    panel.hidden = !panel.hidden;
    earth.setAttribute('aria-expanded', String(!panel.hidden));
  }, true);
})();