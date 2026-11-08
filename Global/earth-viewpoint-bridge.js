/* LIVE // EARTH — Home-to-viewpoint bridge.
 * Shares the Home Earth orientation with independent views in this document and
 * across same-tab navigation to Earth Modes. It never shares a scene or camera.
 */
const STATE_KEY = "__liveEarthHomeViewpointV1";
const STORAGE_KEY = "liveEarthHomeViewpointV1";
let localSnapshot = null;

function validSnapshot(value) {
  return !!value && [value.x, value.y, value.z, value.w].every(Number.isFinite);
}

function copySnapshot(value) {
  return Object.freeze({ x: value.x, y: value.y, z: value.z, w: value.w });
}

function readStoredSnapshot() {
  try {
    const raw = window?.sessionStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !validSnapshot(parsed.orientation)) return null;
    const length = Math.hypot(parsed.orientation.x, parsed.orientation.y, parsed.orientation.z, parsed.orientation.w);
    if (!Number.isFinite(length) || length < 1e-12) return null;
    return copySnapshot({
      x: parsed.orientation.x / length,
      y: parsed.orientation.y / length,
      z: parsed.orientation.z / length,
      w: parsed.orientation.w / length
    });
  } catch (_) {
    return null;
  }
}

function currentSnapshot() {
  if (typeof window !== "undefined") {
    const shared = window[STATE_KEY];
    if (validSnapshot(shared)) return copySnapshot(shared);
  }
  if (validSnapshot(localSnapshot)) return copySnapshot(localSnapshot);
  const stored = readStoredSnapshot();
  if (stored) {
    localSnapshot = stored;
    if (typeof window !== "undefined") window[STATE_KEY] = stored;
    return copySnapshot(stored);
  }
  return null;
}

export function publishHomeOrientation(homeEarthGroup, options = {}) {
  const quaternion = homeEarthGroup?.quaternion;
  if (!quaternion || ![quaternion.x, quaternion.y, quaternion.z, quaternion.w].every(Number.isFinite)) return false;

  const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  if (!Number.isFinite(length) || length < 1e-12) return false;

  const snapshot = copySnapshot({
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length
  });
  localSnapshot = snapshot;

  if (typeof window !== "undefined") {
    // Keep one shared in-page state even if a caller reaches this module by a
    // second import URL. sessionStorage carries the last settled pose across
    // same-tab navigation to Earth Modes without touching user data or caches.
    window[STATE_KEY] = snapshot;
    if (options.persist !== false) {
      try {
        window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify({ version: 1, orientation: snapshot }));
      } catch (_) { /* In-memory bridge remains available when storage is blocked. */ }
    }
    window.dispatchEvent?.(new Event("live-earth-home-viewpoint-changed"));
  }
  return true;
}

export function getHomeOrientation() {
  return currentSnapshot();
}

export function applyHomeOrientation(targetEarthGroup) {
  const snapshot = currentSnapshot();
  const targetQuaternion = targetEarthGroup?.quaternion;
  if (!snapshot || typeof targetQuaternion?.set !== "function") return false;

  targetQuaternion.set(snapshot.x, snapshot.y, snapshot.z, snapshot.w);
  targetEarthGroup.updateMatrix?.();
  targetEarthGroup.updateMatrixWorld?.(true);
  return true;
}

const api = Object.freeze({ publishHomeOrientation, getHomeOrientation, applyHomeOrientation });
if (typeof window !== "undefined") {
  window.LiveEarthViewpointBridge = api;
  window.dispatchEvent?.(new Event("live-earth-viewpoint-bridge-ready"));
}
