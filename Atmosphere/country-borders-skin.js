/* LIVE // EARTH — shared Natural Earth country-boundary skin.
 * Geographic overlay only: independent of numerical grids and their palettes.
 * Natural Earth 1:50m Admin 0 land-boundary lines; public-domain source data.
 */
const DATA_URL = "./Atmosphere/Assets/country-boundaries-50m.json";
let boundaryDataPromise = null;

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

function toVector(THREE, lon, lat, radius) {
  const phi = THREE.MathUtils.degToRad(lat);
  const lambda = THREE.MathUtils.degToRad(lon);
  const cosPhi = Math.cos(phi);
  // Match the existing Earth numerical grid skin: lon=0 faces +Z.
  return [-radius * cosPhi * Math.sin(lambda), radius * Math.sin(phi), radius * cosPhi * Math.cos(lambda)];
}

export async function createCountryBordersSkin({ THREE, earthGroup, radius = 1.004,
  color = 0xa8d8e8, opacity = 0.62, linewidth = 1, renderOrder = 10, enabled = true } = {}) {
  if (!THREE || !earthGroup?.add) throw new TypeError("Three.js and an Earth group are required.");
  if (!enabled) return Object.freeze({ visible: false, dispose() {} });

  const data = await loadBoundaryData();
  const positions = [];
  for (const line of data.coordinates) {
    for (let i = 1; i < line.length; i++) {
      const a = toVector(THREE, line[i - 1][0], line[i - 1][1], radius);
      const b = toVector(THREE, line[i][0], line[i][1], radius);
      positions.push(...a, ...b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color, transparent: true, opacity, linewidth,
    depthTest: true, depthWrite: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "LIVE_EARTH_COUNTRY_BORDERS_50M";
  lines.renderOrder = Number.isFinite(renderOrder) ? renderOrder : 10;
  earthGroup.add(lines);

  let disposed = false;
  return Object.freeze({
    object: lines,
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
  version: "1.0.0",
  source: "Natural Earth 1:50m Admin 0 boundary lines land",
  create: createCountryBordersSkin
});
