/* LIVE // EARTH local data foundation. No UI or network calls are made here. */
const DB_NAME = 'live-earth-local';
const DB_VERSION = 1;
export const RETENTION_MS = Object.freeze({
  astronomy: 30 * 24 * 60 * 60 * 1000,
  weather: 3 * 24 * 60 * 60 * 1000,
  earthquakes: 365 * 24 * 60 * 60 * 1000
});
const STORE_DEFS = [
  ['locations', { keyPath: 'id' }],
  ['preferences', { keyPath: 'key' }],
  ['dataset_catalog', { keyPath: 'id' }],
  ['astronomy_cache', { keyPath: 'key' }],
  ['weather_cache', { keyPath: 'key' }],
  ['earthquakes', { keyPath: 'id' }],
  ['asset_metadata', { keyPath: 'id' }]
];
let dbPromise;
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
  });
}
export function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB is unavailable in this browser context.'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, options] of STORE_DEFS) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, options);
          if (name === 'astronomy_cache') store.createIndex('expiresAt', 'expiresAt', { unique: false });
          if (name === 'weather_cache') store.createIndex('expiresAt', 'expiresAt', { unique: false });
          if (name === 'earthquakes') {
            store.createIndex('eventTime', 'eventTime', { unique: false });
            store.createIndex('expiresAt', 'expiresAt', { unique: false });
          }
          if (name === 'asset_metadata') store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
        }
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => { dbPromise = null; reject(request.error || new Error('Could not open local database')); };
    request.onblocked = () => console.warn('[LIVE // EARTH] Database upgrade is blocked by another open tab.');
  });
  return dbPromise;
}
export async function putRecord(storeName, record) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const done = transactionDone(tx);
  const result = await requestResult(tx.objectStore(storeName).put(record));
  await done;
  return result;
}
export async function getRecord(storeName, key) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  return requestResult(tx.objectStore(storeName).get(key));
}
export async function deleteRecord(storeName, key) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(storeName).delete(key);
  await done;
}
export async function getAllRecords(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  return requestResult(tx.objectStore(storeName).getAll());
}
export async function saveLocation(location) {
  if (!location || !location.id || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) throw new TypeError('A location requires id, latitude and longitude.');
  return putRecord('locations', { ...location, updatedAt: Date.now() });
}
export async function savePreference(key, value) {
  if (!key) throw new TypeError('Preference key is required.');
  return putRecord('preferences', { key, value, updatedAt: Date.now() });
}
export async function saveAstronomy(key, data, calculatedAt = Date.now()) {
  return putRecord('astronomy_cache', { key, data, calculatedAt, expiresAt: calculatedAt + RETENTION_MS.astronomy });
}
export async function saveWeather(key, locationId, forecast, fetchedAt = Date.now()) {
  return putRecord('weather_cache', { key, locationId, forecast, fetchedAt, expiresAt: fetchedAt + RETENTION_MS.weather });
}
export async function saveEarthquake(event) {
  if (!event || !event.id || !event.eventTime || !Number.isFinite(event.magnitude) || !event.location || !event.url) throw new TypeError('Earthquake event requires id, eventTime, magnitude, location and official URL.');
  const receivedAt = Number.isFinite(event.receivedAt) ? event.receivedAt : Date.now();
  return putRecord('earthquakes', { ...event, receivedAt, expiresAt: Number(event.eventTime) + RETENTION_MS.earthquakes });
}
export async function saveAssetMetadata(asset) {
  if (!asset || !asset.id) throw new TypeError('Asset metadata requires an id.');
  return putRecord('asset_metadata', { ...asset, lastUsedAt: Date.now() });
}
export async function syncDatasetCatalog(manifest) {
  if (!manifest || !Array.isArray(manifest.datasets)) throw new TypeError('Dataset manifest must contain a datasets array.');
  const db = await openDatabase();
  const tx = db.transaction('dataset_catalog', 'readwrite');
  const done = transactionDone(tx);
  const store = tx.objectStore('dataset_catalog');
  for (const item of manifest.datasets) {
    if (!item.id || !item.version || !item.description) throw new TypeError('Each dataset requires id, version and description.');
    store.put({ ...item, manifestVersion: manifest.manifestVersion || 1, catalogSyncedAt: Date.now() });
  }
  await done;
  return manifest.datasets.length;
}
export async function cleanupExpired(now = Date.now()) {
  const db = await openDatabase();
  const stores = ['astronomy_cache', 'weather_cache', 'earthquakes'];
  let removed = 0;
  for (const name of stores) {
    const tx = db.transaction(name, 'readwrite');
    const done = transactionDone(tx);
    const store = tx.objectStore(name);
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    await new Promise((resolve, reject) => {
      const request = index.openCursor(range);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve();
        cursor.delete(); removed += 1; cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error('Expiry cleanup failed'));
    });
    await done;
  }
  return removed;
}
export async function initializeLocalDatabase({ selfTest = true } = {}) {
  const db = await openDatabase();
  await cleanupExpired();
  if (selfTest) {
    const key = '__live_earth_db_smoke_test__';
    const marker = { key, value: 'ok', updatedAt: Date.now() };
    await putRecord('preferences', marker);
    const readBack = await getRecord('preferences', key);
    await deleteRecord('preferences', key);
    if (!readBack || readBack.value !== 'ok') throw new Error('Local database save/retrieve self-test failed.');
  }
  return { ok: true, database: DB_NAME, version: DB_VERSION, stores: STORE_DEFS.map(([name]) => name), selfTest: Boolean(selfTest) };
}
