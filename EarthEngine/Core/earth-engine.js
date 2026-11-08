/* LIVE // EARTH — Global Earth Engine.
 * All views use one globe factory. The Engine also owns the single global
 * rotation snapshot and follows the Global Orb System's active-view lifecycle.
 * It never shares cameras, zoom, scenes, renderers, lighting or child transforms.
 */
import { createEarthGraphics } from "../Graphics/earth-engine-3d-graphics-engine.js";

const VIEWPOINT_STATE_KEY = "__liveEarthGlobalViewpointV1";
const VIEWPOINT_STORAGE_KEY = "liveEarthGlobalViewpointV1";
const LEGACY_STORAGE_KEYS = [
  "liveEarthHomeViewpointV3",
  "liveEarthHomeViewpointV2",
  "liveEarthHomeViewpointV1"
];
let viewpointSnapshot = null;
let activeOwner = null;
let activeEarthGroup = null;
const earthGroupsByOwner = new Map();
let lifecycleInstalled = false;

function validQuaternion(value) {
  return !!value && [value.x, value.y, value.z, value.w].every(Number.isFinite);
}

function normalizeQuaternion(value) {
  if (!validQuaternion(value)) return null;
  const length = Math.hypot(value.x, value.y, value.z, value.w);
  if (!Number.isFinite(length) || length < 1e-12) return null;
  return Object.freeze({
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
    w: value.w / length
  });
}

function readStoredSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.sessionStorage;
    for (const key of [VIEWPOINT_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
      const raw = storage?.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const candidate = parsed?.orientation || parsed?.quaternion || parsed;
      const normalized = normalizeQuaternion(candidate);
      if (normalized) return normalized;
    }
  } catch (_) {
    // A blocked or malformed session store must not stop the globe from loading.
  }
  return null;
}

function getSnapshot() {
  if (typeof window !== "undefined") {
    const shared = normalizeQuaternion(window[VIEWPOINT_STATE_KEY]);
    if (shared) return shared;
  }
  if (viewpointSnapshot) return viewpointSnapshot;
  viewpointSnapshot = readStoredSnapshot();
  if (viewpointSnapshot && typeof window !== "undefined") {
    window[VIEWPOINT_STATE_KEY] = viewpointSnapshot;
  }
  return viewpointSnapshot;
}

function getCurrentOwner() {
  const globalSystem = typeof window !== "undefined" ? window.LiveEarthOrbSystem : null;
  if (typeof globalSystem?.getActiveViewIdentity === "function") {
    try {
      const identity = globalSystem.getActiveViewIdentity();
      if (typeof identity === "string" && identity.trim()) return identity;
    } catch (_) {}
  }
  const manager = typeof window !== "undefined" ? window.LiveEarthViewManager : null;
  const view = manager?.getCanonicalActiveView?.()
    || (manager?.getActiveView?.() === "explorer" ? "earth" : manager?.getActiveView?.())
    || "home";
  return `primary:${view}`;
}

function persistSnapshot(snapshot) {
  viewpointSnapshot = snapshot;
  if (typeof window === "undefined") return;
  window[VIEWPOINT_STATE_KEY] = snapshot;
  try {
    window.sessionStorage?.setItem(VIEWPOINT_STORAGE_KEY, JSON.stringify({ version: 1, orientation: snapshot }));
  } catch (_) {
    // The in-memory snapshot remains available when sessionStorage is unavailable.
  }
  window.dispatchEvent?.(new CustomEvent("live-earth-global-viewpoint-changed", {
    detail: { orientation: snapshot }
  }));
}

function captureEarthGroup(group) {
  const snapshot = normalizeQuaternion(group?.quaternion);
  if (!snapshot) return false;
  persistSnapshot(snapshot);
  return true;
}

function applyEarthGroupSnapshot(group) {
  const snapshot = getSnapshot();
  const quaternion = group?.quaternion;
  if (!snapshot || typeof quaternion?.set !== "function") return false;
  quaternion.set(snapshot.x, snapshot.y, snapshot.z, snapshot.w);
  group.updateMatrix?.();
  group.updateMatrixWorld?.(true);
  return true;
}

function incomingGroupFor(owner) {
  if (!owner) return null;
  const exact = earthGroupsByOwner.get(owner);
  if (exact) return exact;
  // Existing Stacks views are overlays on the persistent Home Earth scene.
  // If a future Secondary view creates its own Engine globe, createEarthGlobe
  // registers that group under its own secondary:<id> identity and takes priority.
  if (owner.startsWith("secondary:")) return earthGroupsByOwner.get("primary:home") || null;
  return null;
}

function installLifecycle() {
  if (lifecycleInstalled || typeof window === "undefined") return;
  lifecycleInstalled = true;
  activeOwner = getCurrentOwner();

  window.addEventListener("live-earth-view-transition", event => {
    const previousOwner = event.detail?.previousOwner || activeOwner;
    const outgoing = activeEarthGroup || earthGroupsByOwner.get(previousOwner) || null;
    if (outgoing) captureEarthGroup(outgoing);
  });

  window.addEventListener("live-earth-view-changed", event => {
    const nextOwner = event.detail?.nextOwner || getCurrentOwner();
    activeOwner = nextOwner;
    activeEarthGroup = incomingGroupFor(nextOwner);
    if (activeEarthGroup) applyEarthGroupSnapshot(activeEarthGroup);
  });

  window.addEventListener("live-earth-orb-system-ready", () => {
    const nextOwner = getCurrentOwner();
    if (nextOwner === activeOwner) return;
    activeOwner = nextOwner;
    activeEarthGroup = incomingGroupFor(nextOwner);
    if (activeEarthGroup) applyEarthGroupSnapshot(activeEarthGroup);
  });

  window.addEventListener("pagehide", () => {
    const group = activeEarthGroup || incomingGroupFor(getCurrentOwner());
    if (group) captureEarthGroup(group);
  }, { once: true });
}

function registerEarthGroup(globe, owner) {
  installLifecycle();
  const group = globe?.group;
  if (!group?.quaternion) return () => {};
  earthGroupsByOwner.set(owner, group);
  if (owner === getCurrentOwner()) {
    activeOwner = owner;
    activeEarthGroup = group;
    applyEarthGroupSnapshot(group);
  }
  return () => {
    if (earthGroupsByOwner.get(owner) === group) earthGroupsByOwner.delete(owner);
    if (activeEarthGroup === group) activeEarthGroup = null;
  };
}

export async function createEarthGlobe(options = {}) {
  installLifecycle();
  const ownerAtRequest = getCurrentOwner();
  const globe = await createEarthGraphics(options);
  const unregister = registerEarthGroup(globe, ownerAtRequest);
  let disposed = false;
  return Object.freeze({
    ...globe,
    dispose() {
      if (disposed) return;
      disposed = true;
      unregister();
      globe.dispose();
    }
  });
}

export const createGlobe = createEarthGlobe;
export const EarthEngine = Object.freeze({
  version: "2.0.0",
  createGlobe: createEarthGlobe,
  createEarthGlobe,
  getGlobalViewpoint: getSnapshot,
  getActiveViewOwner: getCurrentOwner
});

if (typeof window !== "undefined") {
  installLifecycle();
  window.LiveEarthEngine = EarthEngine;
  window.LiveEarthGlobalViewpoint = Object.freeze({
    getSnapshot,
    getActiveOwner: getCurrentOwner
  });
  window.__liveEarthEarthEngineModuleReady = true;
  window.dispatchEvent?.(new Event("live-earth-earth-engine-ready"));
}
