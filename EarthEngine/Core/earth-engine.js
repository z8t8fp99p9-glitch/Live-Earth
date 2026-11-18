/* LIVE // EARTH — Global Earth Engine.
 * All views use one globe factory. The Engine owns the global rotation snapshot,
 * the shared default finger gestures, active-view lifecycle and baseline Earth
 * lighting. Cameras, scenes, renderers, zoom limits and view-specific UI remain
 * view-owned; the Engine supplies lights when a view has not supplied its own.
 */
import { createEarthGraphics } from "../Graphics/earth-engine-3d-graphics-engine.js";
import { createCountryBordersSkin } from "../Graphics/country-borders-skin.js";

const VIEWPOINT_STATE_KEY = "__liveEarthGlobalViewpointV1";
const VIEWPOINT_STORAGE_KEY = "liveEarthGlobalViewpointV1";
let viewpointSnapshot = null;
let activeOwner = null;
let activeEarthGroup = null;
const earthGroupsByOwner = new Map();
const viewRuntimesByOwner = new Map();
let lifecycleInstalled = false;

// Universal default globe framing.
// The Engine provides the starting distance; views retain camera ownership.
export const EARTH_DEFAULT_FRAMING = Object.freeze({
  diameterFraction: 0.75,
  fieldOfView: 34
});

export function getDefaultCameraDistance({
  width,
  height,
  radius = 1,
  fieldOfView = EARTH_DEFAULT_FRAMING.fieldOfView,
  diameterFraction = EARTH_DEFAULT_FRAMING.diameterFraction
} = {}) {
  const values = [width, height, radius, fieldOfView, diameterFraction];

  if (!values.every(Number.isFinite) ||
      width <= 0 || height <= 0 || radius <= 0 ||
      fieldOfView <= 0 || fieldOfView >= 180 ||
      diameterFraction <= 0 || diameterFraction > 1) {
    throw new TypeError("Earth Engine requires valid viewport and framing values.");
  }

  const shortestSide = Math.min(width, height);
  const halfFovRadians = fieldOfView * Math.PI / 360;

  return radius * height /
    (diameterFraction * shortestSide * Math.tan(halfFovRadians));
}

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
    const raw = window.sessionStorage?.getItem(VIEWPOINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const candidate = parsed?.orientation || parsed?.quaternion || parsed;
    return normalizeQuaternion(candidate);
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
  // Existing Stacks features currently overlay Prime Earth. Independent views must create their own globe with createEarthGlobe().
  // A Secondary view with its own Engine globe takes precedence above.
  if (owner.startsWith("secondary:")) return earthGroupsByOwner.get("primary:home") || null;
  return null;
}

function callRuntime(runtime, method) {
  const callback = runtime?.callbacks?.[method];
  if (typeof callback !== "function") return;
  try {
    callback(Object.freeze({ owner: runtime.owner, activeOwner }));
  } catch (error) {
    console.error(`[LIVE // EARTH] Engine view runtime ${method} failed: ${error?.message || error}`, error);
    if (typeof window !== "undefined") {
      window.dispatchEvent?.(new CustomEvent("live-earth-engine-runtime-error", {
        detail: { owner: runtime.owner, method, error }
      }));
    }
  }
}

function setRuntimeActive(runtime, shouldBeActive) {
  if (!runtime) return;
  if (shouldBeActive && !runtime.active) {
    runtime.active = true;
    runtime.initialized = true;
    callRuntime(runtime, "activate");
  } else if (!shouldBeActive && (runtime.active || !runtime.initialized)) {
    runtime.active = false;
    runtime.initialized = true;
    callRuntime(runtime, "deactivate");
  }
}

function setActiveRuntimeOwner(owner) {
  const activeGroup = incomingGroupFor(owner);
  for (const runtime of viewRuntimesByOwner.values()) {
    setRuntimeActive(runtime, !!activeGroup && runtime.group === activeGroup);
  }
}

function suspendRuntimesForGroup(group) {
  if (!group) return;
  for (const runtime of viewRuntimesByOwner.values()) {
    if (runtime.group === group) setRuntimeActive(runtime, false);
  }
}

function registerEarthViewRuntime(owner, group, callbacks = {}) {
  if (typeof owner !== "string" || !owner.trim()) {
    throw new TypeError("An Engine view runtime requires a stable owner identity.");
  }
  if (!callbacks || typeof callbacks !== "object") {
    throw new TypeError("An Engine view runtime requires lifecycle callbacks.");
  }
  if (viewRuntimesByOwner.has(owner)) {
    throw new Error(`An Engine view runtime is already registered for ${owner}.`);
  }
  const runtime = { owner, group, callbacks, active: false, initialized: false };
  viewRuntimesByOwner.set(owner, runtime);
  const currentOwner = getCurrentOwner();
  activeOwner = currentOwner;
  setActiveRuntimeOwner(currentOwner);
  return () => {
    if (viewRuntimesByOwner.get(owner) !== runtime) return;
    setRuntimeActive(runtime, false);
    viewRuntimesByOwner.delete(owner);
  };
}

function installLifecycle() {
  if (lifecycleInstalled || typeof window === "undefined") return;
  lifecycleInstalled = true;
  activeOwner = getCurrentOwner();

  window.addEventListener("live-earth-view-transition", event => {
    const previousOwner = event.detail?.previousOwner || activeOwner;
    // The lifecycle event names the outgoing owner. Prefer that exact registered
    // group over the cached active pointer, which may lag during async view startup.
    const outgoing = earthGroupsByOwner.get(previousOwner)
      || (activeOwner === previousOwner ? activeEarthGroup : null);
    if (outgoing) captureEarthGroup(outgoing);
    const nextOwner = event.detail?.nextOwner || null;
    const incoming = incomingGroupFor(nextOwner);
    // Suspend a renderer only when ownership moves to a different Engine Earth
    // group. Secondary overlays that use Home's persistent group still need it.
    if (outgoing && outgoing !== incoming) suspendRuntimesForGroup(outgoing);
  });

  window.addEventListener("live-earth-view-changed", event => {
    const nextOwner = event.detail?.nextOwner || getCurrentOwner();
    activeOwner = nextOwner;
    activeEarthGroup = incomingGroupFor(nextOwner);
    if (activeEarthGroup) applyEarthGroupSnapshot(activeEarthGroup);
    // Resume the incoming renderer only after its latest shared quaternion lands.
    setActiveRuntimeOwner(nextOwner);
  });

  window.addEventListener("live-earth-orb-system-ready", () => {
    const nextOwner = getCurrentOwner();
    if (nextOwner === activeOwner) return;
    activeOwner = nextOwner;
    activeEarthGroup = incomingGroupFor(nextOwner);
    if (activeEarthGroup) applyEarthGroupSnapshot(activeEarthGroup);
    setActiveRuntimeOwner(nextOwner);
  });

  window.addEventListener("pagehide", () => {
    const owner = getCurrentOwner();
    const group = earthGroupsByOwner.get(owner)
      || (activeOwner === owner ? activeEarthGroup : null);
    if (group) captureEarthGroup(group);
    setActiveRuntimeOwner(null);
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
  const anchoredRotation = rotation.anchored === true;
  const trackballPrevious = new THREE.Vector3();
  const trackballCurrent = new THREE.Vector3();
  const trackballDelta = new THREE.Quaternion();
  const dragStartQuaternion = new THREE.Quaternion();
  const minPitch = Number.isFinite(rotation.minPitch) ? rotation.minPitch : -1.15;
  const maxPitch = Number.isFinite(rotation.maxPitch) ? rotation.maxPitch : 1.15;
  let dragPitch = 0;
  let pinchDistance = 0;
  let hasTrackballAnchor = false;
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

  // Map the finger to a virtual sphere fitted to the actual canvas. Rotating
  // from the previous surface vector to the current one makes the touched
  // point follow the finger instead of applying a fixed degrees-per-pixel rate.
  function setTrackballVector(target, clientX, clientY) {
    const rect = element.getBoundingClientRect?.();
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) return false;
    const size = Math.min(rect.width, rect.height);
    let x = ((clientX - rect.left - rect.width / 2) * 2) / size;
    let y = (-(clientY - rect.top - rect.height / 2) * 2) / size;
    const lengthSquared = x * x + y * y;
    if (lengthSquared <= 1) {
      target.set(x, y, Math.sqrt(1 - lengthSquared));
    } else {
      const inverseLength = 1 / Math.sqrt(lengthSquared);
      target.set(x * inverseLength, y * inverseLength, 0);
    }
    return true;
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
      hasTrackballAnchor = anchoredRotation &&
        setTrackballVector(trackballPrevious, event.clientX, event.clientY);
      if (anchoredRotation) dragStartQuaternion.copy(group.quaternion);
    } else if (pointers.size === 2) {
      hasTrackballAnchor = false;
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

    if (rotation.enabled !== false && anchoredRotation) {
      if (hasTrackballAnchor && setTrackballVector(trackballCurrent, current.x, current.y)) {
        trackballDelta.setFromUnitVectors(trackballPrevious, trackballCurrent);
        group.quaternion.copy(trackballDelta).multiply(dragStartQuaternion).normalize();
        // Advance the anchor after every move. Keeping the pointer-down quaternion
        // here makes later deltas overwrite one another, which feels like slipping
        // or shaking when the globe is zoomed in.
        dragStartQuaternion.copy(group.quaternion);
        trackballPrevious.copy(trackballCurrent);
        options.onRotate?.(group.quaternion, event);
      }
    } else if (rotation.enabled !== false) {
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
      // Re-anchor the remaining finger after a pinch without a rotation jump.
      dragPitch = pitchFromQuaternion(group.quaternion);
      const remaining = [...pointers.values()][0];
      hasTrackballAnchor = anchoredRotation &&
        setTrackballVector(trackballPrevious, remaining.x, remaining.y);
      if (anchoredRotation) dragStartQuaternion.copy(group.quaternion);
    } else {
      hasTrackballAnchor = false;
    }
    if (enabled()) consume(event);
  }

  function reset() {
    pointers.clear();
    pinchDistance = 0;
    dragPitch = pitchFromQuaternion(group.quaternion);
    hasTrackballAnchor = false;
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
    // A newly-created Engine globe may replace the fallback Home group for an
    // already-active Secondary owner; switch render ownership immediately.
    setActiveRuntimeOwner(owner);
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
  // Shared geographic skin: every view created by the Earth Engine receives
  // the same country borders, independent of its numerical data layer.
  let countryBorders = null;
  try {
    countryBorders = await createCountryBordersSkin({
      THREE: options.THREE,
      earthGroup: globe.group,
      radius: options.countryBorders?.radius ?? 1.004,
      color: options.countryBorders?.color ?? 0xa8d8e8,
      opacity: options.countryBorders?.opacity ?? 0.62,
      enabled: options.countryBorders?.enabled !== false
    });
  } catch (error) {
    console.warn("[LIVE // EARTH] Country borders could not be loaded; continuing without the overlay.", error);
  }
  const unregister = registerEarthGroup(globe, ownerAtRequest);
  const interactionControllers = new Set();
  const runtimeUnregisters = new Set();
  let disposed = false;

  function registerViewRuntime(callbacks = {}) {
    if (disposed) throw new Error("Cannot register a runtime for a disposed Earth globe.");
    const unregisterRuntime = registerEarthViewRuntime(ownerAtRequest, globe.group, callbacks);
    runtimeUnregisters.add(unregisterRuntime);
    return () => {
      if (!runtimeUnregisters.delete(unregisterRuntime)) return;
      unregisterRuntime();
    };
  }

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
    registerViewRuntime,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const interaction of interactionControllers) interaction.dispose();
      interactionControllers.clear();
      for (const unregisterRuntime of runtimeUnregisters) unregisterRuntime();
      runtimeUnregisters.clear();
      unregister();
      countryBorders?.dispose?.();
      globe.dispose();
    }
  });
}

export const createGlobe = createEarthGlobe;
export const EarthEngine = Object.freeze({
  version: "2.5.0",
  createGlobe: createEarthGlobe,
  createEarthGlobe,
  getDefaultCameraDistance,
  defaultFraming: EARTH_DEFAULT_FRAMING,
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
