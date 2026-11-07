/* LIVE // EARTH — Feed Collector mini-browser panel.
   Visual browsing only: the cross-origin publisher page is never read by this
   parent app. Feed discovery and article inspection remain separate operations. */
(() => {
  'use strict';
  if (window.__liveEarthFeedMiniBrowserInstalled) return;
  window.__liveEarthFeedMiniBrowserInstalled = true;

  const style = document.createElement('style');
  style.textContent = `
    .fc-mini-browser{margin:0 0 18px;border:1px solid #3a5b73a6;border-radius:17px;
      overflow:hidden;background:linear-gradient(145deg,#0c2337ef,#081725f2);
      box-shadow:0 14px 35px #0003,inset 0 1px #ffffff0b}
    .fc-mini-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 15px 8px}
    .fc-mini-head h2{font-size:16px;margin:0;color:#edf7ff}
    .fc-mini-head p{font-size:9px;letter-spacing:.14em;color:#83cce9;margin:0 0 5px;font-weight:800}
    .fc-mini-controls{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;padding:8px 12px 12px}
    .fc-mini-controls input{min-width:0;height:40px;border:1px solid #41647d;border-radius:9px;background:#04111e;color:#edf7ff;padding:0 10px;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .fc-mini-controls button,.fc-mini-controls a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 11px;border:1px solid #41647d;border-radius:9px;background:#0b2b40;color:#c9eafa;font:700 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;white-space:nowrap}
    .fc-mini-frame-wrap{height:min(62vh,620px);min-height:280px;background:#020a11;border-top:1px solid #29495f;position:relative}
    .fc-mini-frame{display:block;width:100%;height:100%;border:0;background:#fff}
    .fc-mini-note{margin:0;padding:9px 13px 12px;color:#9cb5c8;font-size:10px;line-height:1.5}
    .fc-mini-note strong{color:#cfeeff}
    @media(max-width:620px){.fc-mini-controls{grid-template-columns:minmax(0,1fr) auto}.fc-mini-controls a{grid-column:1/-1}.fc-mini-frame-wrap{height:55vh;min-height:260px}}
  `;
  document.head.appendChild(style);

  const search = document.getElementById('siteForm');
  const siteInput = document.getElementById('siteUrl');
  const articleLink = document.getElementById('articleUrl');
  const main = document.querySelector('.fc-main');
  if (!search || !siteInput || !main) return;

  const panel = document.createElement('section');
  panel.className = 'fc-mini-browser';
  panel.setAttribute('aria-label', 'Publisher mini browser');
  panel.innerHTML = `
    <div class="fc-mini-head"><div><p>LIVE PAGE · VISUAL VIEW</p><h2>Publisher Browser</h2></div></div>
    <div class="fc-mini-controls">
      <input type="url" inputmode="url" autocomplete="url" autocapitalize="none" spellcheck="false" aria-label="Browser address" placeholder="https://www.example.org">
      <button type="button" data-mini-go>Go</button>
      <a href="#" target="_blank" rel="noopener noreferrer" data-mini-external>Open outside</a>
    </div>
    <div class="fc-mini-frame-wrap"><iframe class="fc-mini-frame" title="Publisher website preview" referrerpolicy="no-referrer" loading="lazy"></iframe></div>
    <p class="fc-mini-note"><strong>Important:</strong> This window displays the publisher's page only. Some publishers block embedded viewing. It cannot bypass website security or expose page contents to Feed Collector.</p>
  `;
  search.insertAdjacentElement('afterend', panel);

  const address = panel.querySelector('input');
  const frame = panel.querySelector('iframe');
  const go = panel.querySelector('[data-mini-go]');
  const external = panel.querySelector('[data-mini-external]');
  let current = '';

  function safeUrl(value) {
    try {
      const u = new URL(String(value || '').trim());
      return u.protocol === 'https:' && !u.username && !u.password && !u.port ? u.href : '';
    } catch { return ''; }
  }

  function load(value) {
    const url = safeUrl(value);
    if (!url) {
      address.setCustomValidity('Enter a public HTTPS website address.');
      address.reportValidity();
      return;
    }
    address.setCustomValidity('');
    address.value = url;
    current = url;
    external.href = url;
    frame.src = url;
  }

  go.addEventListener('click', () => load(address.value));
  address.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); load(address.value); }
  });
  siteInput.addEventListener('input', () => {
    const url = safeUrl(siteInput.value);
    if (url) {
      address.value = url;
      external.href = url;
    }
  });

  // When the Collector starts a website search, load the same submitted URL.
  search.addEventListener('submit', () => {
    const url = safeUrl(siteInput.value);
    if (url) load(url);
  }, true);

  // When a story is opened, discovery.js updates this link with the canonical
  // article address. Follow it in the visual browser without reading its DOM.
  if (articleLink) {
    const observer = new MutationObserver(() => {
      const url = safeUrl(articleLink.href);
      if (url && url !== current) load(url);
    });
    observer.observe(articleLink, { attributes: true, attributeFilter: ['href'] });
  }

  // Start in step with a URL already present in the Collector field.
  if (siteInput.value.trim()) load(siteInput.value);
})();
