/* LIVE // EARTH — Orientation Guardian candidate
   One confirmation opportunity per page launch. Physical orientation locking is
   attempted only after a user gesture and may be unsupported by iOS web apps. */
(() => {
  'use strict';
  if (window.__liveEarthOrientationGuardian) return;
  window.__liveEarthOrientationGuardian = true;
  const root = document.documentElement;
  const orientationOf = () => {
    const type = screen.orientation && screen.orientation.type;
    if (type) return type.startsWith('landscape') ? 'landscape' : 'portrait';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  };
  let launchOrientation = orientationOf();
  let acceptedOrientation = launchOrientation;
  let opportunityUsed = false;
  let promptTimer = 0;
  let prompt = null;
  let hintTimer = 0;

  const style = document.createElement('style');
  style.textContent = `
    #le-orientation-prompt{position:fixed;z-index:10000;left:50%;top:calc(env(safe-area-inset-top) + 14px);transform:translateX(-50%);width:min(92vw,390px);padding:15px;border:1px solid #8edfff77;border-radius:18px;background:linear-gradient(145deg,#102032f7,#050b16f9);box-shadow:0 12px 38px #000c,0 0 24px #38bfff20;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);color:#eaf5ff;font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #le-orientation-prompt[hidden]{display:none}#le-orientation-prompt strong{display:block;font-size:15px;margin-bottom:4px}#le-orientation-prompt p{margin:0 0 10px;color:#abc2d5}#le-orientation-prompt .le-orient-actions{display:flex;gap:8px}#le-orientation-prompt button{flex:1;min-height:42px;border:1px solid #8edfff66;border-radius:12px;background:#8edfff16;color:#f1fbff;font:600 12px -apple-system,BlinkMacSystemFont,sans-serif;touch-action:manipulation}
    #le-orientation-prompt .le-orient-count{height:3px;margin-top:11px;background:#ffffff16;border-radius:9px;overflow:hidden}#le-orientation-prompt .le-orient-count span{display:block;height:100%;width:100%;background:#70d9ff;transform-origin:left;animation:leOrientCountdown 3s linear forwards}@keyframes leOrientCountdown{to{transform:scaleX(0)}}
    .le-orientation-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.le-orientation-options button{min-height:42px;padding:10px;border:1px solid #8edfff44;border-radius:12px;background:#ffffff09;color:#eaf5ff;font:600 12px -apple-system,BlinkMacSystemFont,sans-serif}.le-orientation-options button[aria-pressed="true"]{border-color:#79d7ff99;background:#58bfff18;box-shadow:0 0 14px #36bfff20}
  `;
  document.head.appendChild(style);

  prompt = document.createElement('section');
  prompt.id = 'le-orientation-prompt';
  prompt.hidden = true;
  prompt.setAttribute('role', 'dialog');
  prompt.setAttribute('aria-live', 'polite');
  prompt.innerHTML = `<strong>Orientation changed</strong><p id="le-orient-message">Switch the app view?</p><div class="le-orient-actions"><button type="button" id="le-orient-confirm">Switch view</button><button type="button" id="le-orient-keep">Keep current view</button></div><div class="le-orient-count"><span></span></div>`;
  document.body.appendChild(prompt);
  const message = prompt.querySelector('#le-orient-message');
  const confirmButton = prompt.querySelector('#le-orient-confirm');
  const keepButton = prompt.querySelector('#le-orient-keep');

  function closePrompt() {
    window.clearTimeout(promptTimer);
    prompt.hidden = true;
  }
  function notify(text) {
    const status = document.querySelector('#status');
    if (!status) return;
    status.textContent = text;
    status.hidden = false;
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => { if (status.textContent === text) status.hidden = true; }, 2600);
  }
  async function selectOrientation(value, fromGesture = false) {
    acceptedOrientation = value;
    root.dataset.leOrientationPreference = value;
    try { sessionStorage.setItem('leOrientationPreference', value); } catch (_) {}
    if (fromGesture && screen.orientation && typeof screen.orientation.lock === 'function') {
      try {
        await screen.orientation.lock(value);
        notify(`Orientation set to ${value}.`);
        return true;
      } catch (_) {
        // iOS Safari/PWA commonly rejects or does not implement orientation lock.
      }
    }
    notify(`Preferred view: ${value}. If iOS allows orientation lock, use an installed-app context to apply it.`);
    return false;
  }
  confirmButton.addEventListener('click', async () => {
    const target = orientationOf();
    closePrompt();
    await selectOrientation(target, true);
  });
  keepButton.addEventListener('click', () => {
    closePrompt();
    notify(`Keeping the ${acceptedOrientation} view preference.`);
  });

  function orientationChanged() {
    const now = orientationOf();
    if (now === launchOrientation || opportunityUsed) return;
    opportunityUsed = true;
    message.textContent = `Switch the app view to ${now}? Choose within 3 seconds. Otherwise, keep your current view preference; you can change it later in Stacks.`;
    prompt.querySelector('.le-orient-count').innerHTML = '<span></span>';
    prompt.hidden = false;
    window.clearTimeout(promptTimer);
    promptTimer = window.setTimeout(() => {
      closePrompt();
      notify(`Orientation choice expired. Use Stacks to change your view preference.`);
    }, 3000);
  }
  window.addEventListener('orientationchange', () => requestAnimationFrame(orientationChanged), { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(orientationChanged), { passive: true });
  screen.orientation?.addEventListener?.('change', orientationChanged);

  function addStacksOption() {
    const title = document.querySelector('#le-panel-title');
    const options = document.querySelector('#le-panel-options');
    if (!title || !options || !/^Stacks/i.test(title.textContent.trim()) || options.querySelector('.le-orientation-options')) return;
    const wrap = document.createElement('div');
    wrap.className = 'le-orientation-options';
    wrap.innerHTML = `<button type="button" data-orient="portrait">Portrait view</button><button type="button" data-orient="landscape">Landscape view</button>`;
    const refresh = () => wrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.orient === acceptedOrientation)));
    wrap.addEventListener('click', async e => {
      const b = e.target.closest('button[data-orient]');
      if (!b) return;
      await selectOrientation(b.dataset.orient, true);
      refresh();
    });
    options.appendChild(wrap);
    refresh();
  }
  const observer = new MutationObserver(addStacksOption);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  addStacksOption();
  try {
    const saved = sessionStorage.getItem('leOrientationPreference');
    if (saved === 'portrait' || saved === 'landscape') acceptedOrientation = saved;
  } catch (_) {}
})();
