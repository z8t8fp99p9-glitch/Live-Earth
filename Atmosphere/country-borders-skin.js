/* LIVE // EARTH — Atmosphere-only Natural Earth country-boundary skin.
 * Coordinates deliberately mirror the Earth Graphics Engine's texture frame:
 * lon=0 faces +X; east-positive longitude moves toward -Z; +latitude points +Y.
 * Longitude is normalized to -180..180.
 * This layer is visual-only and never participates in globe raycasting.
 */
const DATA_URL = "./Atmosphere/Assets/country-boundaries-50m.json";
let boundaryDataPromise = null;

function normalizeLongitude(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

function positionOnEarth(THREE, latitude, longitude, radius) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(normalizeLongitude(longitude));
  const cosLat = Math.cos(lat);
  // Exact coordinate convention documented by Earth Graphics Engine's
  // subsolar-point calculation and used by its equirectangular texture.
  return new THREE.Vector3(
     radius * cosLat * Math.cos(lon),
     radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon)
  );
}

async function loadBoundaryData() {
  if (!boundaryDataPromise) {
    boundaryDataPromise = fetch(new URL(DATA_URL, document.baseURI), { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`Country boundary data request failed (${response.status}).`);
        return response.json();
      })
      .then(data => {
        if (data?.type !== "LiveEarthCountryBoundaryLines" || !Array.isArray(data.coordinates)) {
          throw new TypeError("Country boundary dataset has an invalid format.");
        }
        return data;
      })
      .catch(error => {
        boundaryDataPromise = null;
        throw error;
      });
  }
  return boundaryDataPromise;
}

export async function createCountryBordersSkin({
  THREE, earthGroup, radius = 1.010, color = 0xa8d8e8,
  opacity = 0.52, renderOrder = 10, enabled = true
} = {}) {
  if (!THREE || !earthGroup?.add) throw new TypeError("Three.js and the Earth surface are required.");
  if (!Number.isFinite(radius) || radius <= 1.009) {
    throw new RangeError("Country borders must sit above the numerical grid overlay.");
  }
  if (!enabled) return Object.freeze({ visible: false, dispose() {} });

  const data = await loadBoundaryData();
  const positions = [];
  let segmentCount = 0;

  for (const line of data.coordinates) {
    for (let i = 1; i < line.length; i++) {
      const [lonA, latA] = line[i - 1];
      const [lonB, latB] = line[i];
      if (![lonA, latA, lonB, latB].every(Number.isFinite)) continue;

      // Never bridge the antimeridian: those are separate visible line pieces.
      if (Math.abs(lonB - lonA) > 180) continue;

      const a = positionOnEarth(THREE, latA, lonA, radius);
      const b = positionOnEarth(THREE, latB, lonB, radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      segmentCount++;
    }
  }
  if (!segmentCount) throw new Error("Natural Earth boundary data produced no drawable segments.");

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.LineBasicMaterial({
    color, transparent: true, opacity: Math.max(0, Math.min(1, opacity)),
    depthTest: true, depthWrite: false, toneMapped: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "LIVE_EARTH_ATMOSPHERE_COUNTRY_BORDERS_50M";
  lines.renderOrder = renderOrder;
  lines.frustumCulled = true;

  // Critical: recursive raycasting from the Atmosphere gesture controller must
  // hit the Earth surface, never these decorative boundary segments.
  lines.raycast = function ignoreCountryBorderPicking() {};

  earthGroup.add(lines);
  let disposed = false;

  return Object.freeze({
    object: lines,
    segmentCount,
    setVisible(value) { if (!disposed) lines.visible = !!value; },
    setStyle(style = {}) {
      if (disposed) return;
      if (style.color !== undefined) material.color.set(style.color);
      if (Number.isFinite(style.opacity)) material.opacity = Math.max(0, Math.min(1, style.opacity));
      material.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      earthGroup.remove(lines);
      geometry.dispose();
      material.dispose();
    }
  });
}

export const CountryBordersSkin = Object.freeze({
  version: "1.1.0",
  source: "Natural Earth 1:50m Admin 0 boundary lines land",
  coordinateReference: "Earth Graphics Engine texture geographic frame",
  create: createCountryBordersSkin
});
