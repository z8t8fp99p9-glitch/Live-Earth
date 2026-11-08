/* LIVE // EARTH — Home-to-viewpoint bridge.
 * Home publishes its Earth group orientation. Independent Earth Engine views may
 * read and apply that snapshot without sharing scenes, cameras, renderers or state.
 * The bridge is intentionally one-way: secondary views never write back to Home.
 */
let homeOrientationSnapshot = null;

function validQuaternion(quaternion) {
  if (!quaternion) return false;
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w].every(Number.isFinite);
}

export function publishHomeOrientation(homeEarthGroup) {
  const quaternion = homeEarthGroup?.quaternion;
  if (!validQuaternion(quaternion)) return false;

  const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  if (!Number.isFinite(length) || length < 1e-12) return false;

  homeOrientationSnapshot = Object.freeze({
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent?.(new Event("live-earth-home-viewpoint-changed"));
  }
  return true;
}

export function getHomeOrientation() {
  return homeOrientationSnapshot ? Object.freeze({ ...homeOrientationSnapshot }) : null;
}

export function applyHomeOrientation(targetEarthGroup) {
  const snapshot = homeOrientationSnapshot;
  const targetQuaternion = targetEarthGroup?.quaternion;
  if (!snapshot || typeof targetQuaternion?.set !== "function") return false;

  targetQuaternion.set(snapshot.x, snapshot.y, snapshot.z, snapshot.w);
  targetEarthGroup.updateMatrix?.();
  targetEarthGroup.updateMatrixWorld?.(true);
  return true;
}

const api = Object.freeze({
  publishHomeOrientation,
  getHomeOrientation,
  applyHomeOrientation
});

if (typeof window !== "undefined") {
  window.LiveEarthViewpointBridge = api;
  window.dispatchEvent?.(new Event("live-earth-viewpoint-bridge-ready"));
}
