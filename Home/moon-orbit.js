/* LIVE // EARTH — additive, Earth-independent Moon orbit layer.
 * Moon geometry, position and orbit artwork are updated without writing to Earth.
 * Orbital distance keeps a lightweight Keplerian approximation; lunar direction uses the
 * app’s existing geocentric Moon model, converted into the equatorial inertial frame.
 * Display distance is intentionally reduced and Moon display radius enlarged for readability.
 * Earth radius = 1; display Moon radius = 0.32; display mean centre distance ~= 2.4 Earth radii.
 * Underlying calculated mean distance remains about 60.3 Earth radii. 721 rolling samples ~= hourly.
 */
const RAD = Math.PI / 180;
const J2000 = 2451545.0;

function eclipticToEquatorial(xEcliptic, yEcliptic, zEcliptic, date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const centuries = (jd - J2000) / 36525;
  const obliquity = (23.43929111 - 0.013004167 * centuries
    - 0.000000164 * centuries * centuries
    + 0.000000503 * centuries * centuries * centuries) * RAD;
  return {
    x: xEcliptic,
    y: yEcliptic * Math.cos(obliquity) - zEcliptic * Math.sin(obliquity),
    z: yEcliptic * Math.sin(obliquity) + zEcliptic * Math.cos(obliquity)
  };
}

function toScenePosition(T, p, scale) {
  // Equatorial inertial coordinates map to Three.js as X=east/west, Y=polar, Z=-Y-equatorial.
  return new T.Vector3(p.x * scale, p.z * scale, -p.y * scale);
}

export function moonPositionAt(T, date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - J2000;
  const rad = RAD;
  // Preserve the existing Keplerian distance variation and cinematic display scale.
  const a = 60.2666, e = 0.0549;
  const distanceMeanAnomaly = (((115.3654 + 13.0649929509 * d) % 360) + 360) % 360 * rad;
  let E = distanceMeanAnomaly;
  for (let k = 0; k < 10; k++) E -= (E - e * Math.sin(E) - distanceMeanAnomaly) / (1 - e * Math.cos(E));
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const r = Math.hypot(xv, yv);

  // Same low-precision geocentric lunar longitude/latitude approximation used by astronomy.js.
  const meanLongitude = ((218.316 + 13.176396 * d) % 360 + 360) % 360;
  const lunarAnomaly = ((134.963 + 13.064993 * d) % 360 + 360) % 360;
  const argumentLatitude = ((93.272 + 13.229350 * d) % 360 + 360) % 360;
  const lambda = (meanLongitude + 6.289 * Math.sin(lunarAnomaly * rad)) * rad;
  const beta = 5.128 * Math.sin(argumentLatitude * rad) * rad;
  const xEcliptic = r * Math.cos(beta) * Math.cos(lambda);
  const yEcliptic = r * Math.cos(beta) * Math.sin(lambda);
  const zEcliptic = r * Math.sin(beta);
  const equatorial = eclipticToEquatorial(xEcliptic, yEcliptic, zEcliptic, date);
  return { ...equatorial, distanceEarthRadii: r, date: date.toISOString() };
}
function loadSharedMoonSurfaceTexture(T) {
  // Home and Moon Engine use this same first-party image. sw.js precaches it
  // as an essential app-shell asset, including for fresh offline installations.
  const texture = new T.TextureLoader().load('./Home/moon-surface-lroc-1536.jpg');
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function createMoonOrbit(T, earthGroup, options = {}) {
  const { earthRadius = 1, samples = 721, displayDistanceFactor = 0.42, displayMoonRadius = 0.32 } = options;
  const system = new T.Group(); system.name = 'liveEarthMoonOrbitSystem';
  const start = Date.now() - 15 * 86400000, end = Date.now() + 15 * 86400000;
  const points = [];
  for (let n = 0; n < samples; n++) {
    const date = new Date(start + (end - start) * n / (samples - 1));
    const p = moonPositionAt(T, date); points.push(toScenePosition(T, p, earthRadius * displayDistanceFactor));
  }
  // Faint full-orbit guide, layered to suggest starlight without a harsh dashed line.
  const orbitGeometry = new T.BufferGeometry().setFromPoints(points);
  const orbit = new T.Line(orbitGeometry, new T.LineBasicMaterial({ color: 0x9bcfff, transparent: true, opacity: 0.085, depthWrite: false }));
  orbit.name = 'moonOrbit30DayStardustPath'; system.add(orbit);
  const haloOrbit = new T.Line(orbitGeometry, new T.LineBasicMaterial({ color: 0x429dff, transparent: true, opacity: 0.035, depthWrite: false, blending: T.AdditiveBlending }));
  haloOrbit.name = 'moonOrbitSoftBlueHalo'; system.add(haloOrbit);

  // Sparse, uneven stardust grains follow the same 3D curve. No flashing or neon ring.
  let seed = 90210; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dustPositions = [], dustColors = [];
  const dustCount = 1150;
  for (let n = 0; n < dustCount; n++) {
    const index = Math.floor(rand() * (points.length - 1));
    const p = points[index];
    const spread = 0.018 + rand() * 0.12;
    dustPositions.push(p.x + (rand() - 0.5) * spread, p.y + (rand() - 0.5) * spread, p.z + (rand() - 0.5) * spread);
    const tint = rand();
    dustColors.push(0.48 + tint * 0.34, 0.68 + tint * 0.25, 0.88 + tint * 0.12);
  }
  const dustGeometry = new T.BufferGeometry();
  dustGeometry.setAttribute('position', new T.Float32BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('color', new T.Float32BufferAttribute(dustColors, 3));
  const dust = new T.Points(dustGeometry, new T.PointsMaterial({ size: 0.022, vertexColors: true, transparent: true, opacity: 0.31, sizeAttenuation: true, depthWrite: false, blending: T.AdditiveBlending }));
  dust.name = 'moonOrbitStardustGrains'; system.add(dust);

  // Moon Orbit owns only its Moon/orbit objects. It must never look up or mutate
  // the Home Earth surface, transform, material, texture, camera or viewpoint.
  const moonGeometry = new T.SphereGeometry(earthRadius * displayMoonRadius, 56, 40);
  const texture = loadSharedMoonSurfaceTexture(T);
  const material = new T.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 1, metalness: 0 });
  const moon = new T.Mesh(moonGeometry, material); moon.name = 'liveMoonSphere'; system.add(moon);
  const update = (date = new Date()) => {
    const p = moonPositionAt(T, date);
    // Update only the Moon's own position. Earth orientation belongs exclusively to Home.
    moon.position.copy(toScenePosition(T, p, earthRadius * displayDistanceFactor));
    return p;
  };
  update();
  earthGroup.add(system);
  return { system, moon, orbit, dust, update, destroy: () => {
    earthGroup.remove(system); orbitGeometry.dispose(); dustGeometry.dispose(); moonGeometry.dispose(); texture.dispose(); material.dispose();
    orbit.material.dispose(); haloOrbit.material.dispose(); dust.material.dispose();
  } };
}
