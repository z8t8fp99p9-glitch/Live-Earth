/* LIVE // EARTH — additive Moon orbit layer.
 * LIVE // EARTH cinematic display mode. Earth mesh/material are never edited.
 * Orbital angles and eccentricity come from a lightweight Keplerian approximation;
 * display distance is intentionally reduced and Moon display radius enlarged for readability.
 * Earth radius = 1; display Moon radius = 0.38; display mean centre distance ~= 25.3 Earth radii.
 * Underlying calculated mean distance remains about 60.3 Earth radii. 721 rolling samples ~= hourly.
 */
export function moonPositionAt(T, date = new Date()) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const rad = Math.PI / 180;
  const N = (125.1228 - 0.0529538083 * d) * rad;
  const i = 5.1454 * rad;
  const w = (318.0634 + 0.1643573223 * d) * rad;
  const a = 60.2666, e = 0.0549;
  const M = (((115.3654 + 13.0649929509 * d) % 360) + 360) % 360 * rad;
  let E = M;
  for (let k = 0; k < 10; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
  const x = r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i));
  const y = r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i));
  const z = r * Math.sin(v + w) * Math.sin(i);
  return { x, y, z, distanceEarthRadii: r, date: date.toISOString() };
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
  const { earthRadius = 1, samples = 721, displayDistanceFactor = 0.42, displayMoonRadius = 0.38 } = options;
  const system = new T.Group(); system.name = 'liveEarthMoonOrbitSystem';
  const start = Date.now() - 15 * 86400000, end = Date.now() + 15 * 86400000;
  const points = [];
  for (let n = 0; n < samples; n++) {
    const date = new Date(start + (end - start) * n / (samples - 1));
    const p = moonPositionAt(T, date); points.push(new T.Vector3(p.x * earthRadius * displayDistanceFactor, p.z * earthRadius * displayDistanceFactor, -p.y * earthRadius * displayDistanceFactor));
  }
  // Faint full-orbit guide, layered to suggest starlight without a harsh dashed line.
  const orbitGeometry = new T.BufferGeometry().setFromPoints(points);
  const orbit = new T.Line(orbitGeometry, new T.LineBasicMaterial({ color: 0x9bcfff, transparent: true, opacity: 0.15, depthWrite: false }));
  orbit.name = 'moonOrbit30DayStardustPath'; system.add(orbit);
  const haloOrbit = new T.Line(orbitGeometry, new T.LineBasicMaterial({ color: 0x429dff, transparent: true, opacity: 0.055, depthWrite: false, blending: T.AdditiveBlending }));
  haloOrbit.name = 'moonOrbitSoftBlueHalo'; system.add(haloOrbit);

  // Sparse, uneven stardust grains follow the same 3D curve. No flashing or neon ring.
  let seed = 90210; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dustPositions = [], dustColors = [];
  const dustCount = 2100;
  for (let n = 0; n < dustCount; n++) {
    const index = Math.floor(rand() * (points.length - 1));
    const p = points[index];
    const spread = 0.025 + rand() * 0.20;
    dustPositions.push(p.x + (rand() - 0.5) * spread, p.y + (rand() - 0.5) * spread, p.z + (rand() - 0.5) * spread);
    const tint = rand();
    dustColors.push(0.48 + tint * 0.34, 0.68 + tint * 0.25, 0.88 + tint * 0.12);
  }
  const dustGeometry = new T.BufferGeometry();
  dustGeometry.setAttribute('position', new T.Float32BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('color', new T.Float32BufferAttribute(dustColors, 3));
  const dust = new T.Points(dustGeometry, new T.PointsMaterial({ size: 0.032, vertexColors: true, transparent: true, opacity: 0.48, sizeAttenuation: true, depthWrite: false, blending: T.AdditiveBlending }));
  dust.name = 'moonOrbitStardustGrains'; system.add(dust);

  // Brighter, soft-edged section trailing the Moon. Rebuilt from the same time-based orbit calculation.
  const tailCoreMaterial = new T.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.72, depthWrite: false, blending: T.AdditiveBlending });
  const tailGlowMaterial = new T.LineBasicMaterial({ color: 0x3c9dff, transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending });
  const tailCore = new T.Line(new T.BufferGeometry(), tailCoreMaterial); tailCore.name = 'moonStarlightTailCore'; system.add(tailCore);
  const tailGlow = new T.Line(new T.BufferGeometry(), tailGlowMaterial); tailGlow.name = 'moonStarlightTailGlow'; system.add(tailGlow);
  const updateTail = (date) => {
    const tailPoints = [];
    // Trail behind the Moon for ~1.7 days; fine samples create a flowing curve rather than dashes.
    const tailStart = date.getTime() - 1.7 * 86400000;
    const tailEnd = date.getTime() - 4 * 60000;
    for (let n = 0; n <= 130; n++) {
      const t = new Date(tailStart + (tailEnd - tailStart) * n / 130);
      const p = moonPositionAt(T, t);
      tailPoints.push(new T.Vector3(p.x * earthRadius * displayDistanceFactor, p.z * earthRadius * displayDistanceFactor, -p.y * earthRadius * displayDistanceFactor));
    }
    tailCore.geometry.dispose(); tailCore.geometry = new T.BufferGeometry().setFromPoints(tailPoints);
    tailGlow.geometry.dispose(); tailGlow.geometry = new T.BufferGeometry().setFromPoints(tailPoints);
  };
  const moonGeometry = new T.SphereGeometry(earthRadius * displayMoonRadius, 56, 40);
  const texture = makeProceduralMoonTexture(T);
  const material = new T.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 1, metalness: 0 });
  const moon = new T.Mesh(moonGeometry, material); moon.name = 'liveMoonSphere'; system.add(moon);
  const update = (date = new Date()) => {
    const p = moonPositionAt(T, date);
    moon.position.set(p.x * earthRadius * displayDistanceFactor, p.z * earthRadius * displayDistanceFactor, -p.y * earthRadius * displayDistanceFactor);
    updateTail(date);
    return p;
  };
  update();
  // Initial cinematic orientation: Moon begins left of Earth in the landscape composition.
  // This rotates only the additive Moon/orbit group; it never changes the Earth mesh.
  system.rotation.y = -Math.PI / 2 - Math.atan2(moon.position.x, moon.position.z);
  earthGroup.add(system);
  return { system, moon, orbit, dust, update, destroy: () => {
    earthGroup.remove(system); orbitGeometry.dispose(); dustGeometry.dispose(); moonGeometry.dispose(); texture.dispose(); material.dispose();
    orbit.material.dispose(); haloOrbit.material.dispose(); dust.material.dispose(); tailCore.geometry.dispose(); tailGlow.geometry.dispose(); tailCoreMaterial.dispose(); tailGlowMaterial.dispose();
  } };
}
