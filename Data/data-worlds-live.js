/* LIVE // EARTH — curated GitHub Pages data reader.
   Reads only Publisher snapshots from Data/Published/worlds/.
   No local database, raw archive access, or client-side intelligence pipeline. */
(() => {
  'use strict';
  if (window.__liveEarthDataWorldsLiveInstalled) return;
  window.__liveEarthDataWorldsLiveInstalled = true;

  const PERIODS = [
    { id: '24h', label: '24 hours', ms: 86400000 },
    { id: '7d', label: '7 days', ms: 7 * 86400000 },
    { id: '30d', label: '30 days', ms: 30 * 86400000 },
    { id: '90d', label: '90 days', ms: 90 * 86400000 },
    { id: '1y', label: '1 year', ms: 365 * 86400000 }
  ];
  const cache = new WeakMap();
  const pending = new WeakMap();
  const WORLD_TITLES = {
    atmosphere: 'Atmosphere', oceans: 'Oceans', land: 'Land',
    'water-ice': 'Water & Ice', 'earth-activity': 'Earth Activity',
    'energy-humanity': 'Energy & Humanity'
  };

  const style = document.createElement('style');
  style.id = 'le-data-worlds-live-style';
  style.textContent = `
    .le-data-world .le-dw-periods{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:0 0 12px}
    .le-data-world .le-dw-period{appearance:none;border:1px solid rgba(var(--dw-rgb),.22);border-radius:999px;padding:7px 10px;background:rgba(5,19,31,.55);color:#bdd1df;font:650 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.04em}
    .le-data-world .le-dw-period[aria-pressed=true]{color:#f3fbff;border-color:var(--dw-accent);background:rgba(var(--dw-rgb),.18)}
    .le-data-world .le-dw-data-card{padding:10px;border:1px solid rgba(var(--dw-rgb),.18);border-radius:12px;background:rgba(var(--dw-rgb),.06);text-align:left;min-width:0}
    .le-data-world .le-dw-data-label{display:block;color:#9db8ca;font-size:9px;letter-spacing:.07em;text-transform:uppercase}
    .le-data-world .le-dw-data-value{display:block;margin-top:5px;color:#f1f8ff;font-size:18px;font-weight:720;overflow-wrap:anywhere}
    .le-data-world .le-dw-data-meta{display:block;margin-top:4px;color:#8eaabc;font-size:9px;line-height:1.45}
    .le-data-world .le-dw-live-event{display:flex;gap:9px;align-items:flex-start;padding:10px;border:1px solid rgba(var(--dw-rgb),.17);border-radius:12px;background:rgba(0,8,17,.35);color:#edf7ff;text-decoration:none;text-align:left}
    .le-data-world .le-dw-live-event strong{display:block;font-size:11px;line-height:1.4}
    .le-data-world .le-dw-live-event small{display:block;margin-top:4px;color:#9ab4c6;font-size:9px;line-height:1.45}
    .le-data-world .le-dw-live-mag{flex:0 0 auto;min-width:39px;padding:7px 4px;border-radius:9px;background:rgba(255,145,90,.12);border:1px solid rgba(255,145,90,.25);color:#ffd2b8;text-align:center;font-size:11px;font-weight:800}
    .le-data-world .le-dw-live-list{display:grid;gap:7px;margin-top:10px}
    .le-data-world .le-dw-live-note{margin:10px 0 0!important;color:#91aabd!important;font-size:9px!important;line-height:1.5!important}
    .le-data-world .le-dw-live-empty{grid-column:1/-1;padding:13px;border:1px solid rgba(var(--dw-rgb),.16);border-radius:12px;color:#a9c2d2;font-size:10px;line-height:1.55}
  `;
  document.head.appendChild(style);

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function number(value, digits = 0) {
    return Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, {
      maximumFractionDigits: digits, minimumFractionDigits: digits
    }) : '—';
  }
  function formatTime(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Time unavailable';
  }
  function periodFor(root) {
    return PERIODS.find(item => item.id === root.dataset.dwPeriod) || PERIODS[1];
  }
  function withinPeriod(items, period, timeField) {
    const cutoff = Date.now() - period.ms;
    return (Array.isArray(items) ? items : []).filter(item => {
      const time = Date.parse(item?.[timeField] || '');
      return Number.isFinite(time) && time >= cutoff && time <= Date.now();
    });
  }
  function empty(grid, message) {
    grid.replaceChildren(make('div', 'le-dw-live-empty', message));
  }
  function periodControls(root, grid, period) {
    let bar = root.querySelector('.le-dw-periods');
    if (!bar) {
      bar = make('div', 'le-dw-periods');
      bar.setAttribute('aria-label', 'Data display period');
      grid.parentNode.insertBefore(bar, grid);
    }
    bar.replaceChildren();
    PERIODS.forEach(option => {
      const button = make('button', 'le-dw-period', option.label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(option.id === period.id));
      button.addEventListener('click', () => {
        root.dataset.dwPeriod = option.id;
        render(root, root.dataset.dwTab || 'discover');
      });
      bar.appendChild(button);
    });
  }
  function metric(grid, label, value, meta = '') {
    const card = make('div', 'le-dw-data-card');
    card.append(make('span', 'le-dw-data-label', label), make('strong', 'le-dw-data-value', value));
    if (meta) card.appendChild(make('span', 'le-dw-data-meta', meta));
    grid.appendChild(card);
  }
  function addNote(grid, text) {
    grid.appendChild(make('p', 'le-dw-live-note', text));
  }
  function getCount(timeline, start, end) {
    return timeline.filter(point => {
      const time = Date.parse(point.date + 'T00:00:00Z');
      return time >= start && time < end;
    }).reduce((sum, point) => sum + (Number(point.count) || 0), 0);
  }

  function renderEarthActivity(root, snapshot, tab, period, heading, copy, grid) {
    const data = snapshot.data || {};
    const timeline = Array.isArray(data.timeline) ? data.timeline : [];
    const events = withinPeriod(data.events, period, 'time');
    const previousCount = getCount(timeline, Date.now() - period.ms * 2, Date.now() - period.ms);
    const currentCount = getCount(timeline, Date.now() - period.ms, Date.now() + 1);

    if (tab === 'discover') {
      heading.textContent = 'Recent Earth activity';
      copy.textContent = `${number(events.length)} catalogued earthquake records in the selected ${period.label.toLowerCase()} window.`;
      if (!events.length) empty(grid, 'No earthquake records are available in this display window. The archive and feed are checked on the next scheduled collection.');
      else {
        const list = make('div', 'le-dw-live-list');
        events.slice(0, 20).forEach(event => {
          const link = make('a', 'le-dw-live-event');
          link.href = event.url || 'https://earthquake.usgs.gov/earthquakes/feed/';
          link.target = '_blank'; link.rel = 'noopener noreferrer';
          link.appendChild(make('span', 'le-dw-live-mag', `M${number(event.magnitude, 1)}`));
          const text = make('span');
          text.appendChild(make('strong', '', event.place || 'Earthquake location not supplied'));
          text.appendChild(make('small', '', `${formatTime(event.time)} · Depth ${number(event.depthKm, 1)} km · ${event.status || 'USGS catalog record'}`));
          link.appendChild(text); list.appendChild(link);
        });
        grid.appendChild(list);
      }
    } else if (tab === 'signals') {
      heading.textContent = 'Earthquake signals';
      copy.textContent = `USGS catalog observations selected from the last ${period.label.toLowerCase()}. These are measured catalog records, not predictions.`;
      const max = events.reduce((value, item) => Math.max(value, Number(item.magnitude) || 0), 0);
      metric(grid, 'Catalog records', number(events.length), 'Within selected period');
      metric(grid, 'Largest magnitude', max ? `M${number(max, 1)}` : '—', 'Largest returned record');
      metric(grid, 'Magnitude 4.5+', number(events.filter(item => Number(item.magnitude) >= 4.5).length), 'Threshold count');
      metric(grid, 'Previous equal window', number(previousCount), 'For comparison');
      addNote(grid, 'Magnitude is the source-reported magnitude. Values may be revised by the USGS as event solutions are reviewed.');
    } else if (tab === 'timeline') {
      heading.textContent = 'Activity through time';
      copy.textContent = `Daily earthquake counts in the selected ${period.label.toLowerCase()} window.`;
      const selected = timeline.filter(point => Date.parse(point.date + 'T00:00:00Z') >= Date.now() - period.ms);
      if (!selected.length) empty(grid, 'No daily history is available yet for this period.');
      else {
        selected.slice(-90).forEach(point => {
          metric(grid, point.date, number(point.count), 'USGS catalog records');
        });
      }
    } else {
      heading.textContent = 'Compare activity';
      copy.textContent = `Compare the selected ${period.label.toLowerCase()} window with the immediately preceding equal-length window.`;
      metric(grid, 'Current window', number(currentCount), period.label);
      metric(grid, 'Previous window', number(previousCount), period.label);
      const delta = previousCount ? ((currentCount - previousCount) / previousCount) * 100 : null;
      metric(grid, 'Change', delta === null ? '—' : `${delta > 0 ? '+' : ''}${number(delta, 1)}%`, 'Record count; not seismic risk');
      addNote(grid, 'A change in catalog counts is not, by itself, evidence of increased or decreased earthquake hazard.');
    }
    addNote(grid, `Source: USGS Earthquake Hazards Program · Published ${formatTime(snapshot.generatedAt)} · ${data.sourceUrl || 'USGS GeoJSON feed'}`);
  }

  function render(root, tab) {
    const snapshot = cache.get(root);
    const detail = root.querySelector('.le-dw-detail');
    if (!detail) return;
    const heading = detail.querySelector('h2');
    const copy = detail.querySelector('.le-dw-detail-copy');
    const grid = detail.querySelector('.le-dw-signal-grid');
    if (!heading || !copy || !grid) return;
    root.dataset.dwTab = tab;
    const period = periodFor(root);
    periodControls(root, grid, period);
    grid.replaceChildren();

    const world = root.dataset.feature;
    if (!snapshot) {
      heading.textContent = 'Loading published intelligence';
      copy.textContent = 'Requesting the latest curated snapshot from LIVE // EARTH.';
      empty(grid, 'No local database is used. Only the Publisher’s public snapshot is requested.');
      return;
    }
    if (world !== 'earth-activity' || snapshot.status !== 'published') {
      heading.textContent = 'Data connection pending';
      copy.textContent = `${WORLD_TITLES[world] || 'This world'} is ready for numerical data, but a verified source adapter has not yet been activated.`;
      empty(grid, 'No measurements are fabricated or displayed until a source, units, update cadence and quality checks are approved.');
      addNote(grid, 'The other worlds remain visually available; their data feeds are not yet connected.');
      return;
    }
    renderEarthActivity(root, snapshot, tab, period, heading, copy, grid);
  }

  async function load(root) {
    if (pending.has(root)) return pending.get(root);
    const world = root.dataset.feature;
    if (!world || !WORLD_TITLES[world]) return;
    const url = new URL(`./Data/Published/worlds/${world}.json`, document.baseURI);
    const request = fetch(url.href, { cache: 'no-store', credentials: 'omit' })
      .then(response => {
        if (!response.ok) throw new Error(`Publisher snapshot returned ${response.status}.`);
        return response.json();
      })
      .then(snapshot => {
        cache.set(root, snapshot);
        render(root, root.dataset.dwTab || 'discover');
      })
      .catch(error => {
        cache.set(root, { status: 'unavailable', error: error?.message || 'Connection unavailable.' });
        render(root, root.dataset.dwTab || 'discover');
      })
      .finally(() => pending.delete(root));
    pending.set(root, request);
    return request;
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('.le-data-world [data-tab]');
    if (!button) return;
    const root = button.closest('.le-data-world');
    if (root) {
      root.dataset.dwTab = button.dataset.tab;
      if (cache.has(root)) render(root, button.dataset.tab);
      else load(root);
    }
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        const roots = [];
        if (node.matches?.('.le-data-world')) roots.push(node);
        node.querySelectorAll?.('.le-data-world').forEach(root => roots.push(root));
        roots.forEach(root => {
          root.dataset.dwPeriod = '7d';
          root.dataset.dwTab = 'discover';
          load(root);
        });
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll('.le-data-world').forEach(root => {
    root.dataset.dwPeriod = '7d';
    root.dataset.dwTab = 'discover';
    load(root);
  });
})();
