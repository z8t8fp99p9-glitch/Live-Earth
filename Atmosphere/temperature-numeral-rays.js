/* LIVE // EARTH — Atmosphere temperature numeral rays.
   A lightweight, Atmosphere-owned overlay built only from the verified NOAA grid.
   Geographic positions use the same convention as the Earth Engine location marker.
*/
(() => {
  'use strict';

  const API_NAME = 'LiveEarthTemperatureNumeralRays';
  if (window[API_NAME]?.create) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function temperatureColor(value) {
    if (value <= -25) return 0x9cddff;
    if (value <= -5) return 0x75cfff;
    if (value < 10) return 0xb5e8ff;
    if (value < 20) return 0xffdf8a;
    if (value < 30) return 0xffa34d;
    return 0xff5748;
  }

  function readGridValue(grid, latitude, longitude) {
    const d = grid?.definition;
    const values = d?.values;
    if (!d || !values || !d.width || !d.height) return null;

    const colFloat = (longitude - d.lonStart) / d.lonStep;
    const rowFloat = (latitude - d.latStart) / d.latStep;
    const col = ((Math.round(colFloat) % d.width) + d.width) % d.width;
    const row = Math.round(rowFloat);
    if (row < 0 || row >= d.height) return null;

    const value = values[row * d.width + col];
    if (!Number.isFinite(value) || value === d.noDataValue) return null;
    return value;
  }

  function chooseSamples(grid, maximum) {
    const candidates = [];
    // A deliberately sparse geographic lattice; the values always come from
    // the verified grid, never from generated or interpolated weather.
    for (let latitude = -70; latitude <= 70; latitude += 20) {
      for (let longitude = -180; longitude < 180; longitude += 30) {
        const value = readGridValue(grid, latitude, longitude);
        if (value == null) continue;
        candidates.push({ latitude, longitude, value });
      }
    }

    // Greedy geographic spacing keeps the numerals legible on a phone.
    const chosen = [];
    const minSeparation = 25;
    while (candidates.length && chosen.length < maximum) {
      let bestIndex = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        let nearest = 180;
        for (const existing of chosen) {
          const lat1 = candidate.latitude * Math.PI / 180;
          const lat2 = existing.latitude * Math.PI / 180;
          const dLat = lat2 - lat1;
          let dLon = (existing.longitude - candidate.longitude) * Math.PI / 180;
          while (dLon > Math.PI) dLon -= Math.PI * 2;
          while (dLon < -Math.PI) dLon += Math.PI * 2;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
          nearest = Math.min(nearest, 2 * Math.asin(Math.sqrt(clamp(a, 0, 1))) * 180 / Math.PI);
        }
        const score = chosen.length ? nearest : 180 - Math.abs(candidate.latitude);
        if (score > bestScore) { bestScore = score; bestIndex = i; }
      }
      if (bestIndex < 0 || (chosen.length && bestScore < minSeparation)) break;
      chosen.push(candidates.splice(bestIndex, 1)[0]);
    }
    return chosen;
  }

  function makeLabelTexture(THREE, text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '700 62px system-ui, -apple-system, sans-serif';
    context.shadowColor = `#${color.toString(16).padStart(6, '0')}`;
    context.shadowBlur = 24;
    context.fillStyle = '#ffffff';
    context.fillText(text, 128, 64);
    context.shadowBlur = 8;
    context.fillText(text, 128, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  function create({ THREE, earth, grid, maximumLabels = 18 } = {}) {
    if (!THREE || !earth?.add || !grid?.definition) {
      throw new TypeError('Three.js, the Earth surface and a verified NOAA grid are required.');
    }

    const root = new THREE.Group();
    root.name = 'liveEarth-atmosphere-temperature-numeral-rays';
    const items = [];
    const samples = chooseSamples(grid, clamp(maximumLabels, 8, 18));

    for (const sample of samples) {
      const rounded = Math.round(sample.value / 5) * 5;
      const label = `${rounded < 0 ? '−' : ''}${Math.abs(rounded)}°`;
      const color = temperatureColor(sample.value);

      const phi = sample.latitude * Math.PI / 180;
      const lambda = sample.longitude * Math.PI / 180;
      // Same geographic convention as the trusted Earth Engine marker.
      const normal = new THREE.Vector3(
        Math.cos(phi) * Math.cos(lambda),
        Math.sin(phi),
        -Math.cos(phi) * Math.sin(lambda)
      ).normalize();

      const beamLength = 0.075 + Math.min(0.045, Math.abs(sample.value) / 900);
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.009, beamLength, 5, 1, true),
        new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.48,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      beam.position.copy(normal).multiplyScalar(1.018 + beamLength * 0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      beam.renderOrder = 6;
      root.add(beam);

      const texture = makeLabelTexture(THREE, label, color);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture, color: 0xffffff, transparent: true,
        opacity: 0.92, depthWrite: false, depthTest: true,
        blending: THREE.AdditiveBlending
      }));
      sprite.position.copy(normal).multiplyScalar(1.115 + beamLength);
      sprite.scale.set(0.19, 0.095, 1);
      sprite.renderOrder = 7;
      root.add(sprite);

      items.push({ beam, sprite, baseOpacity: 0.48 + Math.min(0.18, Math.abs(sample.value) / 500) });
    }

    earth.add(root);
    let disposed = false;

    return {
      count: items.length,
      update(seconds) {
        if (disposed) return;
        const pulse = 0.5 + 0.5 * Math.sin(seconds * 1.35);
        for (const item of items) {
          item.beam.material.opacity = item.baseOpacity * (0.82 + pulse * 0.18);
          item.sprite.material.opacity = 0.82 + pulse * 0.12;
        }
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        for (const item of items) {
          item.beam.geometry.dispose();
          item.beam.material.dispose();
          item.sprite.material.map?.dispose();
          item.sprite.material.dispose();
        }
        root.clear();
      }
    };
  }

  window[API_NAME] = Object.freeze({ create });
})();
