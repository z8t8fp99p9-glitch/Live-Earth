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
  THREE, earthGroup, radius = 1.0015, color = 0xa8d8e8,
  opacity = 0.62, lineWidth = 0.0048, renderOrder = 10, enabled = true
} = {}) {
  if (!THREE || !earthGroup?.add) throw new TypeError("Three.js and the Earth surface are required.");
  if (!Number.isFinite(radius) || radius <= 1.0) {
    throw new RangeError("Country borders must sit just above the Earth surface radius of 1.0.");
  }
  if (!enabled) return Object.freeze({ visible: false, dispose() {} });

  const data = await loadBoundaryData();
  const positions = [];
  const indices = [];
  let segmentCount = 0;
  const halfWidth = Math.max(0.0005, lineWidth * 0.5);
  const radial = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (const line of data.coordinates) {
    for (let i = 1; i < line.length; i++) {
      const [lonA, latA] = line[i - 1];
      const [lonB, latB] = line[i];
      if (![lonA, latA, lonB, latB].every(Number.isFinite)) continue;

      // Never bridge the antimeridian: those are separate visible line pieces.
      if (Math.abs(lonB - lonA) > 180) continue;

      const a = positionOnEarth(THREE, latA, lonA, radius);
      const b = positionOnEarth(THREE, latB, lonB, radius);
      direction.subVectors(b, a);
      radial.copy(a).add(b).normalize();
      side.crossVectors(radial, direction).normalize();
      if (side.lengthSq() < 1e-10) continue;

      // Build one camera-independent ribbon quad per geographic segment.
      // This creates genuinely thicker spherical lines; WebGL LineBasicMaterial
      // linewidth is ignored on many mobile browsers.
      const offset = side.multiplyScalar(halfWidth);
      const base = positions.length / 3;
      positions.push(
        a.x + offset.x, a.y + offset.y, a.z + offset.z,
        a.x - offset.x, a.y - offset.y, a.z - offset.z,
        b.x + offset.x, b.y + offset.y, b.z + offset.z,
        b.x - offset.x, b.y - offset.y, b.z - offset.z
      );
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      segmentCount++;
    }
  }
  if (!segmentCount) throw new Error("Natural Earth boundary data produced no drawable segments.");

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: Math.max(0, Math.min(1, opacity)),
    depthTest: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  });
  const lines = new THREE.Mesh(geometry, material);
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
    lineWidth,
    setVisible(value) { if (!disposed) lines.visible = !!value; },
    setStyle(style = {}) {
      if (disposed) return;
      if (style.color !== undefined) material.color.set(style.color);
      if (Number.isFinite(style.opacity)) material.opacity = Math.max(0, Math.min(1, style.opacity));
      if (Number.isFinite(style.renderOrder)) lines.renderOrder = style.renderOrder;
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
  version: "1.2.0",
  source: "Natural Earth 1:50m Admin 0 boundary lines land",
  coordinateReference: "Earth Graphics Engine texture geographic frame",
  create: createCountryBordersSkin
});
