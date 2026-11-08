/* LIVE // EARTH — account-free local storage protection and portable recovery. */
import { openDatabase, getAllRecords } from './data-store.js';

(() => {
  'use strict';
  if (window.__liveEarthLocalRecoveryInstalled) return;
  window.__liveEarthLocalRecoveryInstalled = true;

  const BACKUP_FORMAT = 'live-earth-local-backup';
  const BACKUP_VERSION = 1;
  const STORE_NAMES = [
    'locations', 'preferences', 'dataset_catalog', 'astronomy_cache',
    'weather_cache', 'earthquakes', 'asset_metadata'
  ];
  const KEY_PATHS = {
    locations: 'id', preferences: 'key', dataset_catalog: 'id',
    astronomy_cache: 'key', weather_cache: 'key', earthquakes: 'id',
    asset_metadata: 'id'
  };
  const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
  let recoveryPanel = null;
  let messageNode = null;
  let statusNode = null;
  let busy = false;

  function setMessage(message, isError = false) {
    if (!messageNode) return;
    messageNode.textContent = message;
    messageNode.dataset.kind = isError ? 'error' : 'info';
  }

  function setBusy(value) {
    busy = value;
    recoveryPanel?.querySelectorAll('button').forEach(button => {
      button.disabled = value;
    });
  }

  async function getStorageStatus(requestProtection = false) {
    const storage = navigator.storage;
    if (!storage) return { supported: false, persistent: false, usage: null, quota: null };
    let persistent = false;
    if (typeof storage.persisted === 'function') {
      try { persistent = await storage.persisted(); } catch (_) { /* Report unavailable below. */ }
    }
    if (requestProtection && !persistent && typeof storage.persist === 'function') {
      try { persistent = await storage.persist(); } catch (_) { /* Browser may refuse or not implement it. */ }
    }
    let usage = null, quota = null;
    if (typeof storage.estimate === 'function') {
      try {
        const estimate = await storage.estimate();
        usage = Number.isFinite(estimate.usage) ? estimate.usage : null;
        quota = Number.isFinite(estimate.quota) ? estimate.quota : null;
      } catch (_) { /* Quota information is optional. */ }
    }
    return { supported: typeof storage.persisted === 'function', persistent, usage, quota };
  }

  function formatBytes(value) {
    if (!Number.isFinite(value) || value < 0) return '';
    if (value < 1024) return `${value} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = value / 1024, index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
    return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[index]}`;
  }

  async function refreshStorageStatus(requestProtection = false) {
    if (!statusNode) return;
    statusNode.textContent = 'Checking this browser’s storage protection…';
    const state = await getStorageStatus(requestProtection);
    if (!statusNode) return;
    if (!state.supported) {
      statusNode.textContent = 'Storage protection status is not available in this browser. Keep a backup file to protect your data.';
      statusNode.dataset.kind = 'warning';
      return;
    }
    const stateText = state.persistent
      ? 'Persistent storage is granted; automatic eviction protection is enabled where supported.'
      : 'Persistent storage was not granted. Browser cleanup or clearing site data can still remove local records.';
    const usageText = state.usage !== null && state.quota !== null
      ? ` Current site storage: ${formatBytes(state.usage)} of an estimated ${formatBytes(state.quota)}.`
      : '';
    statusNode.textContent = stateText + usageText;
    statusNode.dataset.kind = state.persistent ? 'good' : 'warning';
  }

  async function makeBackup() {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAMES, 'readonly');
    const done = transactionDone(tx);
    const stores = {};
    const reads = STORE_NAMES.map(name => new Promise((resolve, reject) => {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => { stores[name] = request.result; resolve(); };
      request.onerror = () => reject(request.error || new Error(`Could not read ${name}.`));
    }));
    await Promise.all(reads);
    await done;
    return {
      format: BACKUP_FORMAT,
      formatVersion: BACKUP_VERSION,
      app: 'LIVE // EARTH',
      exportedAt: new Date().toISOString(),
      database: { name: 'live-earth-local', version: 1 },
      note: 'Account-free local backup. Contains saved records and regenerable caches. Keep this file somewhere safe.',
      stores
    };
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function exportBackup() {
    if (busy) return;
    setBusy(true);
    setMessage('Preparing your local backup…');
    try {
      const backup = await makeBackup();
      const json = JSON.stringify(backup, null, 2);
      const fileName = `live-earth-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const file = new File([json], fileName, { type: 'application/json' });
      if (file.size > MAX_BACKUP_BYTES) throw new Error('This backup exceeds the 50 MB safety limit. Export from a device with more available memory or reduce the locally cached records first.');
      if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'LIVE // EARTH data backup', text: 'Save this backup in Files or another safe place.' });
          setMessage('Backup shared. Save the file somewhere safe so it survives browser removal.');
        } catch (error) {
          if (error?.name === 'AbortError') setMessage('Backup was prepared; sharing was cancelled. Tap Export backup again to save it.');
          else {
            downloadFile(file);
            setMessage('Backup prepared for download. Save the JSON file somewhere safe.');
          }
        }
      } else {
        downloadFile(file);
        setMessage('Backup prepared for download. Save the JSON file somewhere safe.');
      }
    } catch (error) {
      console.error('[LIVE // EARTH] Backup export failed.', error);
      setMessage(`Backup failed: ${error?.message || String(error)}`, true);
    } finally {
      setBusy(false);
    }
  }

  function validateBackup(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('This file is not a valid backup object.');
    if (payload.format !== BACKUP_FORMAT || payload.formatVersion !== BACKUP_VERSION) throw new Error('This backup format or version is not supported.');
    if (!payload.stores || typeof payload.stores !== 'object' || Array.isArray(payload.stores)) throw new Error('The backup has no store data.');
    const allowed = new Set(STORE_NAMES);
    for (const name of Object.keys(payload.stores)) {
      if (!allowed.has(name)) throw new Error(`The backup contains an unsupported data store: ${name}.`);
      if (!Array.isArray(payload.stores[name])) throw new Error(`The ${name} section is not a list of records.`);
    }
    const counts = {};
    for (const name of STORE_NAMES) {
      const records = payload.stores[name] ?? [];
      const seen = new Set();
      for (const record of records) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`The ${name} section contains an invalid record.`);
        const keyPath = KEY_PATHS[name];
        if (!(keyPath in record) || record[keyPath] === undefined || record[keyPath] === null) throw new Error(`A record in ${name} is missing its ${keyPath} key.`);
        const key = JSON.stringify(record[keyPath]);
        if (seen.has(key)) throw new Error(`The backup contains duplicate keys in ${name}; no data was imported.`);
        seen.add(key);
      }
      counts[name] = records.length;
    }
    return counts;
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('The database transaction failed.'));
    });
  }

  async function importBackup(file) {
    if (busy || !file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage('This backup is larger than the 50 MB safety limit.', true);
      return;
    }
    setBusy(true);
    setMessage('Checking the backup file before restoring…');
    try {
      const payload = JSON.parse(await file.text());
      const counts = validateBackup(payload);
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      if (!total) {
        setMessage('This backup contains no records to restore.', true);
        return;
      }
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAMES, 'readwrite');
      const done = transactionDone(tx);
      let added = 0, kept = 0;
      let pending = 0;
      for (const name of STORE_NAMES) {
        const store = tx.objectStore(name);
        const keyPath = KEY_PATHS[name];
        for (const record of (payload.stores[name] ?? [])) {
          pending += 1;
          const lookup = store.get(record[keyPath]);
          lookup.onsuccess = () => {
            if (lookup.result === undefined) {
              store.add(record);
              added += 1;
            } else {
              // Recovery is additive: existing live records are never replaced.
              kept += 1;
            }
            pending -= 1;
          };
        }
      }
      await done;
      if (pending !== 0) throw new Error('Restore did not finish all record checks.');
      setMessage(`Restore complete. Added ${added} records; kept ${kept} existing records unchanged. Nothing was deleted.`);
      await refreshStorageStatus(false);
    } catch (error) {
      console.error('[LIVE // EARTH] Backup import failed.', error);
      setMessage(`Restore failed safely: ${error?.message || String(error)}`, true);
    } finally {
      setBusy(false);
    }
  }

  function buildPanel() {
    const panel = document.createElement('section');
    panel.id = 'le-local-recovery';
    panel.setAttribute('aria-label', 'Local data protection and recovery');
    panel.innerHTML = `
      <div class="le-recovery-heading">Local data protection</div>
      <p class="le-recovery-copy">No login. No cloud account. Your records stay on this browser unless you export a backup.</p>
      <div class="le-recovery-status" data-kind="warning">Checking storage protection…</div>
      <div class="le-recovery-buttons">
        <button type="button" data-action="protect">Protect storage</button>
        <button type="button" data-action="export">Export backup</button>
        <button type="button" data-action="import">Restore backup</button>
      </div>
      <input type="file" accept=".json,application/json" hidden aria-label="Choose a LIVE // EARTH backup file">
      <div class="le-recovery-message" role="status" aria-live="polite">A backup file is the portable copy to keep outside this browser.</div>
    `;
    const style = document.createElement('style');
    style.id = 'le-local-recovery-style';
    style.textContent = `
      #le-local-recovery{margin:0 0 14px;padding:13px;border:1px solid rgba(137,207,255,.27);border-radius:15px;background:linear-gradient(145deg,rgba(65,120,158,.13),rgba(3,8,17,.32));color:#eaf5ff}
      #le-local-recovery .le-recovery-heading{font-size:14px;font-weight:700;letter-spacing:.02em;margin:0 0 5px}
      #le-local-recovery .le-recovery-copy{font-size:11px;line-height:1.45;color:#acc3d6;margin:0 0 9px}
      #le-local-recovery .le-recovery-status{font-size:11px;line-height:1.45;padding:8px 9px;border-radius:9px;background:rgba(255,255,255,.045);margin:0 0 9px;color:#cbd8e4}
      #le-local-recovery .le-recovery-status[data-kind="good"]{border-left:2px solid #65d9a5}
      #le-local-recovery .le-recovery-status[data-kind="warning"]{border-left:2px solid #e4bf6a}
      #le-local-recovery .le-recovery-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      #le-local-recovery button{min-height:36px;padding:8px 9px;border:1px solid rgba(153,213,246,.27);border-radius:10px;background:rgba(255,255,255,.055);color:#edf8ff;font:600 11px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}
      #le-local-recovery button[data-action="export"]{border-color:rgba(107,208,255,.55);background:rgba(46,142,192,.17)}
      #le-local-recovery button:disabled{opacity:.55}
      #le-local-recovery .le-recovery-message{font-size:11px;line-height:1.45;color:#b6cadd;margin-top:9px;overflow-wrap:anywhere}
      #le-local-recovery .le-recovery-message[data-kind="error"]{color:#ffb0b5}
      #le-local-recovery .le-recovery-message[data-kind="info"]{color:#b6cadd}
      @media(max-width:350px){#le-local-recovery .le-recovery-buttons{grid-template-columns:1fr} }
    `;
    document.head.appendChild(style);
    recoveryPanel = panel;
    statusNode = panel.querySelector('.le-recovery-status');
    messageNode = panel.querySelector('.le-recovery-message');
    const fileInput = panel.querySelector('input[type="file"]');
    panel.querySelector('[data-action="protect"]').addEventListener('click', async () => {
      if (busy) return;
      setBusy(true);
      try {
        await refreshStorageStatus(true);
        const state = await getStorageStatus(false);
        setMessage(state.persistent
          ? 'This browser granted persistent storage. Export a backup too, especially before removing the browser.'
          : 'The browser did not grant persistent storage. Export a backup file and keep it outside the browser.', !state.persistent);
      } catch (error) {
        setMessage(`Could not check storage protection: ${error?.message || String(error)}`, true);
      } finally { setBusy(false); }
    });
    panel.querySelector('[data-action="export"]').addEventListener('click', exportBackup);
    panel.querySelector('[data-action="import"]').addEventListener('click', () => {
      if (!busy) fileInput.click();
    });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) await importBackup(file);
    });
    return panel;
  }

  function attachToStacksPanel() {
    const title = document.querySelector('#le-panel-title');
    const panel = document.querySelector('#le-control-panel');
    const options = document.querySelector('#le-panel-options');
    if (!title || !panel || !options || !/^Stacks\b/i.test(title.textContent.trim())) return;
    if (!recoveryPanel) buildPanel();
    // Only refresh when the panel is first attached. The observer watches DOM
    // text mutations too, so refreshing on every mutation would loop forever.
    if (!recoveryPanel.isConnected) {
      panel.insertBefore(recoveryPanel, options);
      void refreshStorageStatus(false);
    }
  }

  const observer = new MutationObserver(attachToStacksPanel);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  attachToStacksPanel();

  // Best-effort request; the Stacks control offers a user-initiated retry if denied.
  getStorageStatus(true).then(state => {
    if (statusNode) refreshStorageStatus(false);
    if (!state.persistent) console.info('[LIVE // EARTH] Persistent storage was not granted; use Stacks to export a local backup.');
  }).catch(error => console.warn('[LIVE // EARTH] Storage persistence request was unavailable.', error));
})();
