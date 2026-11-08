/* LIVE // EARTH — Global Earth Engine.
 * All views use one globe factory. The Engine owns the global rotation snapshot,
 * the shared default finger gestures, active-view lifecycle and baseline Earth
 * lighting. Cameras, scenes, renderers, zoom limits and view-specific UI remain
 * view-owned; the Engine supplies lights when a view has not supplied its own.
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
  // A Secondary view with its own Engine globe takes precedence above.
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

// One implementation for every Engine-created globe. It never owns a camera:
// a view supplies small zoom adapters and its own limits when pinch zoom is on.
function createEarthInteractions(THREE, group, options = {}) {
  if (!THREE?.Vector3 || !THREE?.Quaternion || !group?.quaternion) {
    throw new TypeError("Earth interactions require the calling view's Three.js namespace and Engine group.");
  }
  const element = options.element;
  if (!element?.addEventListener || !element?.removeEventListener) {
    throw new TypeError("Earth interactions require a DOM event target.");
  }

  const rotation = options.rotation === false ? { enabled: false } : (options.rotation || {});
  const zoom = options.zoom || { enabled: false };
  const enabled = () => {
    try { return typeof options.enabled === "function" ? options.enabled() !== false : options.enabled !== false; }
    catch (_) { return false; }
  };
  const valueOf = value => typeof value === "function" ? value() : value;
  const pointers = new Map();
  const worldXAxis = new THREE.Vector3(1, 0, 0);
  const localYAxis = new THREE.Vector3(0, 1, 0);
  const pitchDelta = new THREE.Quaternion();
  const yawDelta = new THREE.Quaternion();
  const sensitivityX = Number.isFinite(rotation.sensitivityX) ? rotation.sensitivityX : 0.009;
  const sensitivityY = Number.isFinite(rotation.sensitivityY) ? rotation.sensitivityY : 0.0055;
  const minPitch = Number.isFinite(rotation.minPitch) ? rotation.minPitch : -1.15;
  const maxPitch = Number.isFinite(rotation.maxPitch) ? rotation.maxPitch : 1.15;
  let dragPitch = 0;
  let pinchDistance = 0;
  let disposed = false;

  function pitchFromQuaternion(quaternion) {
    const normalized = normalizeQuaternion(quaternion);
    if (!normalized) return 0;
    // All default gestures use q = qX(pitch) * qY(yaw), never Euler extraction.
    const yawHalf = Math.atan2(normalized.y, normalized.w);
    const sinHalfPitch = normalized.x * Math.cos(yawHalf) + normalized.z * Math.sin(yawHalf);
    const cosHalfPitch = Math.hypot(normalized.w, normalized.y);
    const pitch = 2 * Math.atan2(sinHalfPitch, cosHalfPitch);
    return Number.isFinite(pitch) ? Math.max(minPitch, Math.min(maxPitch, pitch)) : 0;
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function consume(event) {
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
  }

  function onPointerDown(event) {
    if (disposed || !enabled() || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.pointerType === "touch" && event.isPrimary === false && pointers.size === 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { element.setPointerCapture?.(event.pointerId); } catch (_) {}
    if (pointers.size === 1) {
      dragPitch = pitchFromQuaternion(group.quaternion);
      pinchDistance = 0;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = distanceBetween(a, b);
    }
    options.onStart?.(event);
    consume(event);
  }

  function onPointerMove(event) {
    if (disposed || !enabled() || !pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const nextPinchDistance = distanceBetween(a, b);
      if (zoom.enabled === true && pinchDistance > 0 && nextPinchDistance > 0 &&
          typeof zoom.getDistance === "function" && typeof zoom.setDistance === "function") {
        const currentDistance = Number(zoom.getDistance());
        if (Number.isFinite(currentDistance) && currentDistance > 0) {
          const minimum = Number(valueOf(zoom.minDistance));
          const maximum = Number(valueOf(zoom.maxDistance));
          let nextDistance = currentDistance * pinchDistance / nextPinchDistance;
          if (Number.isFinite(minimum)) nextDistance = Math.max(minimum, nextDistance);
          if (Number.isFinite(maximum)) nextDistance = Math.min(maximum, nextDistance);
          if (Math.abs(nextDistance - currentDistance) > 1e-9) {
            zoom.setDistance(nextDistance);
            options.onZoom?.(nextDistance, event);
          }
        }
      }
      pinchDistance = nextPinchDistance;
      consume(event);
      return;
    }

    if (rotation.enabled !== false) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      let changed = false;
      if (dx) {
        yawDelta.setFromAxisAngle(localYAxis, dx * sensitivityX);
        group.quaternion.multiply(yawDelta);
        changed = true;
      }
      if (dy) {
        const nextPitch = Math.max(minPitch, Math.min(maxPitch, dragPitch + dy * sensitivityY));
        const pitchChange = nextPitch - dragPitch;
        if (Math.abs(pitchChange) > 1e-12) {
          pitchDelta.setFromAxisAngle(worldXAxis, pitchChange);
          group.quaternion.premultiply(pitchDelta);
          dragPitch = nextPitch;
          changed = true;
        }
      }
      if (changed) {
        group.quaternion.normalize();
        options.onRotate?.(group.quaternion, event);
      }
    }
    consume(event);
  }

  function finishPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 1) {
      // A remaining finger can continue rotating without a position jump.
      dragPitch = pitchFromQuaternion(group.quaternion);
    }
    if (enabled()) consume(event);
  }

  function reset() {
    pointers.clear();
    pinchDistance = 0;
    dragPitch = pitchFromQuaternion(group.quaternion);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    reset();
    element.removeEventListener("pointerdown", onPointerDown, true);
    element.removeEventListener("pointermove", onPointerMove, true);
    element.removeEventListener("pointerup", finishPointer, true);
    element.removeEventListener("pointercancel", finishPointer, true);
    element.removeEventListener("lostpointercapture", finishPointer, true);
  }

  // Capture-phase listeners take ownership before legacy per-view handlers.
  // This prevents a second, conflicting Euler-based drag implementation.
  element.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
  element.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
  element.addEventListener("pointerup", finishPointer, true);
  element.addEventListener("pointercancel", finishPointer, true);
  element.addEventListener("lostpointercapture", finishPointer, true);

  return Object.freeze({ reset, dispose });
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
  const interactionControllers = new Set();
  let disposed = false;

  function attachInteractions(interactionOptions = {}) {
    if (disposed) throw new Error("Cannot attach gestures to a disposed Earth globe.");
    const interaction = createEarthInteractions(options.THREE, globe.group, interactionOptions);
    interactionControllers.add(interaction);
    return Object.freeze({
      reset: interaction.reset,
      dispose() {
        if (!interactionControllers.delete(interaction)) return;
        interaction.dispose();
      }
    });
  }

  return Object.freeze({
    ...globe,
    attachInteractions,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const interaction of interactionControllers) interaction.dispose();
      interactionControllers.clear();
      unregister();
      globe.dispose();
    }
  });
}

export const createGlobe = createEarthGlobe;
export const EarthEngine = Object.freeze({
  version: "2.3.0",
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
