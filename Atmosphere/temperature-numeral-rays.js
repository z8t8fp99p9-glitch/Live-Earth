/* LIVE // EARTH — Atmosphere temperature light rays.
   Uses only verified NOAA grid samples. All geometry is attached to the
   Earth surface using the Earth Engine's established geographic convention.
*/
(() => {
  'use strict';
  const API = 'LiveEarthTemperatureNumeralRays';
  if (window[API]?.create) return;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function colorFor(temp) {
    if (temp <= -25) return 0x91eaff;
    if (temp <= -5) return 0x63cfff;
    if (temp < 10) return 0xc5f4ff;
    if (temp < 20) return 0xffdf83;
    if (temp < 30) return 0xff9b43;
    return 0xff493d;
  }

  function sampleAt(grid, lat, lon) {
    const d = grid.definition;
    const col = ((Math.round((lon - d.lonStart) / d.lonStep) % d.width) + d.width) % d.width;
    const row = Math.round((lat - d.latStart) / d.latStep);
    if (row < 0 || row >= d.height) return null;
    const value = grid.values[row * d.width + col];
    return Number.isFinite(value) && value !== d.noDataValue ? value : null;
  }

  function selectLocations(grid, limit) {
    const points = [];
    // Sparse global sampling. Each displayed number is derived from a real
    // nearest NOAA cell and rounded only to the requested 5-degree display step.
    for (let lat = -65; lat <= 65; lat += 15) {
      for (let lon = -180; lon < 180; lon += 24) {
        const temp = sampleAt(grid, lat, lon);
        if (temp !== null) points.push({ lat, lon, temp });
      }
    }
    const selected = [];
    while (points.length && selected.length < limit) {
      let best = 0, bestDistance = -1;
      for (let i = 0; i < points.length; i++) {
        let nearest = 180;
        for (const p of selected) {
          const a = points[i].lat * Math.PI / 180;
          const b = p.lat * Math.PI / 180;
          const dl = (p.lon - points[i].lon) * Math.PI / 180;
          const dp = b - a;
          const h = Math.sin(dp / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(dl / 2) ** 2;
          nearest = Math.min(nearest, 2 * Math.asin(Math.sqrt(clamp(h, 0, 1))) * 180 / Math.PI);
        }
        const score = selected.length ? nearest : 180 - Math.abs(points[i].lat);
        if (score > bestDistance) { bestDistance = score; best = i; }
      }
      if (selected.length && bestDistance < 20) break;
      selected.push(points.splice(best, 1)[0]);
    }
    return selected;
  }

  function makeNumberTexture(THREE, label, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 512, 256);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 116px system-ui, -apple-system, sans-serif';
    c.shadowColor = `#${color.toString(16).padStart(6, '0')}`;
    c.shadowBlur = 42; c.fillStyle = '#fff';
    c.fillText(label, 256, 128);
    c.shadowBlur = 18; c.fillText(label, 256, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  function create({ THREE, earth, grid, maximumLabels = 16 } = {}) {
    if (!THREE || !earth?.add || !grid?.values) {
      throw new TypeError('A Three.js Earth surface and verified NOAA grid are required.');
    }
    const root = new THREE.Group();
    root.name = 'liveEarth-atmosphere-temperature-light-rays';
    const up = new THREE.Vector3(0, 1, 0);
    const records = [];

    for (const point of selectLocations(grid, clamp(maximumLabels, 8, 16))) {
      const rounded = Math.round(point.temp / 5) * 5;
      const label = `${rounded < 0 ? '−' : ''}${Math.abs(rounded)}°`;
      const color = colorFor(point.temp);
      const phi = point.lat * Math.PI / 180;
      const lambda = point.lon * Math.PI / 180;
      const normal = new THREE.Vector3(
        Math.cos(phi) * Math.cos(lambda),
        Math.sin(phi),
        -Math.cos(phi) * Math.sin(lambda)
      ).normalize();

      // Long central shaft plus two fine companion streaks. These extend
      // conspicuously beyond the limb rather than sitting as tiny surface spikes.
      const height = 0.34 + Math.min(0.22, Math.abs(point.temp) / 180);
      const beamGroup = new THREE.Group();
      beamGroup.position.copy(normal).multiplyScalar(1.012);
      beamGroup.quaternion.setFromUnitVectors(up, normal);
      beamGroup.renderOrder = 8;

      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0025, 0.012, height, 7, 1, true),
        new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.88,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      core.position.y = height * 0.5;
      core.renderOrder = 8;
      beamGroup.add(core);

      const halo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.045, height * 0.92, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.20,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      halo.position.y = height * 0.48;
      halo.renderOrder = 8;
      beamGroup.add(halo);

      for (const offset of [-0.035, 0.035]) {
        const streak = new THREE.Mesh(
          new THREE.CylinderGeometry(0.001, 0.0035, height * 0.78, 4, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.62,
            blending: THREE.AdditiveBlending, depthWrite: false
          })
        );
        streak.position.set(offset, height * 0.45, 0);
        streak.renderOrder = 8;
        beamGroup.add(streak);
      }
      root.add(beamGroup);

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeNumberTexture(THREE, label, color),
        color: 0xffffff, transparent: true, opacity: 1,
        depthWrite: false, depthTest: true,
        blending: THREE.AdditiveBlending
      }));
      sprite.position.copy(normal).multiplyScalar(1.035 + height);
      sprite.scale.set(0.34, 0.17, 1);
      sprite.renderOrder = 10;
      root.add(sprite);
      records.push({ beamGroup, sprite, core, halo, height });
    }

    earth.add(root);
    let disposed = false;
    return {
      count: records.length,
      update(seconds) {
        if (disposed) return;
        const pulse = 0.5 + 0.5 * Math.sin(seconds * 1.7);
        for (const r of records) {
          r.halo.material.opacity = 0.15 + pulse * 0.12;
          r.core.material.opacity = 0.76 + pulse * 0.18;
          r.sprite.material.opacity = 0.88 + pulse * 0.12;
        }
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              material.map?.dispose?.();
              material.dispose?.();
            }
          }
        });
        root.clear();
      }
    };
  }

  window[API] = Object.freeze({ create });
})();
