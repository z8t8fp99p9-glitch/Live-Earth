/* LIVE // EARTH — additive Moon orbit layer.
 * LIVE // EARTH cinematic display mode. Earth mesh/material are never edited.
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

function greenwichMeanSiderealAngle(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const centuries = (jd - J2000) / 36525;
  const degrees = ((280.46061837
    + 360.98564736629 * (jd - J2000)
    + 0.000387933 * centuries * centuries
    - centuries * centuries * centuries / 38710000) % 360 + 360) % 360;
  return degrees * RAD;
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
function makeProceduralMoonTexture(T) {
  // Offline-first procedural albedo with layered maria and craters; spherical lighting supplies relief cues.
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d', { alpha: false });
  const img = ctx.createImageData(canvas.width, canvas.height);
  let seed = 991827; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const n = (rand() - .5) * 19 + Math.sin(x * .033) * 4 + Math.cos(y * .061) * 3;
    const k = (y * canvas.width + x) * 4, v = Math.max(92, Math.min(205, 164 + n));
    img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = Math.min(220, v + 5); img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Broad low-contrast lunar maria, repeated around the equirectangular map.
  for (let n = 0; n < 34; n++) {
    const x = rand() * canvas.width, y = 25 + rand() * (canvas.height - 50), rx = 18 + rand() * 85, ry = 8 + rand() * 27;
    ctx.fillStyle = `rgba(63,68,78,${.045 + rand() * .085})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  // Crater rims and shadowed floors, kept subtle so directional light remains dominant.
  for (let n = 0; n < 1250; n++) {
    const x = rand() * canvas.width, y = 4 + rand() * (canvas.height - 8), r = 1.2 + Math.pow(rand(), 2) * 12;
    ctx.strokeStyle = `rgba(235,238,244,${.08 + rand() * .20})`; ctx.lineWidth = Math.max(.6, r * .13);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * (.62 + rand() * .38), rand() * .4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(48,53,63,${.035 + rand() * .12})`; ctx.beginPath(); ctx.ellipse(x + r * .12, y + r * .13, r * .74, r * .65, 0, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4; return texture;
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

  // The live Earth surface is the radius-matching standard-material sphere; the atmosphere shell
  // has a different radius/material. Its rotation aligns geographic longitudes with the inertial Moon.
  const earthSurface = earthGroup.children.find(child => child.isMesh
    && child.geometry?.type === 'SphereGeometry'
    && Math.abs((child.geometry.parameters?.radius ?? 0) - earthRadius) < 1e-8
    && child.material?.type === 'MeshStandardMaterial');
  const moonGeometry = new T.SphereGeometry(earthRadius * displayMoonRadius, 56, 40);
  const texture = makeProceduralMoonTexture(T);
  const material = new T.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 1, metalness: 0 });
  const moon = new T.Mesh(moonGeometry, material); moon.name = 'liveMoonSphere'; system.add(moon);
  const update = (date = new Date()) => {
    const p = moonPositionAt(T, date);
    // Earth turns underneath the inertial orbit at sidereal rate; camera, size and framing are untouched.
    if (earthSurface) earthSurface.rotation.y = greenwichMeanSiderealAngle(date);
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
