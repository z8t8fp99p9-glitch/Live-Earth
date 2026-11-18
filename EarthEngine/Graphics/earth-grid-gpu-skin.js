/* LIVE // EARTH — dataset-agnostic GPU grid skin.
 * Renders normalized scalar grids. Views supply colour stops, ranges and contour settings.
 * No dataset IDs, units, scientific palettes or domain-specific rules live here.
 */
(() => {
  'use strict';
  const VERSION = '2.0.0';

  function makeRampTexture(T, stops) {
    const source = Array.isArray(stops) && stops.length >= 2
      ? stops
      : [[0, 0.055, 0.16, 0.48], [0.25, 0.02, 0.66, 0.88], [0.5, 0.18, 0.86, 0.66], [0.75, 1, 0.79, 0.28], [1, 0.91, 0.25, 0.17]];
    const normalized = source.map((entry, index) => {
      if (!Array.isArray(entry)) throw new TypeError('Each color stop must be [position, red, green, blue].');
      const values = entry.length === 4 ? entry : [index / (source.length - 1), ...entry];
      if (!values.every(Number.isFinite)) throw new TypeError('Color stops must contain finite numbers.');
      return values.map(Number);
    }).sort((a, b) => a[0] - b[0]);
    if (normalized.some(s => s[0] < 0 || s[0] > 1 || s.slice(1).some(c => c < 0 || c > 1))) {
      throw new RangeError('Color stop positions and RGB channels must be between 0 and 1.');
    }
    const pixels = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let right = normalized.findIndex(s => s[0] >= t);
      if (right < 0) right = normalized.length - 1;
      const a = normalized[Math.max(0, right - 1)], b = normalized[right];
      const span = b[0] - a[0];
      const f = span > 0 ? Math.max(0, Math.min(1, (t - a[0]) / span)) : 0;
      for (let c = 0; c < 3; c++) pixels[i * 4 + c] = Math.round((a[c + 1] + (b[c + 1] - a[c + 1]) * f) * 255);
      pixels[i * 4 + 3] = 255;
    }
    const texture = new T.DataTexture(pixels, 256, 1, T.RGBAFormat, T.UnsignedByteType);
    texture.needsUpdate = true;
    texture.magFilter = T.LinearFilter;
    texture.minFilter = T.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = T.ClampToEdgeWrapping;
    texture.wrapT = T.ClampToEdgeWrapping;
    texture.unpackAlignment = 1;
    return texture;
  }

  function create(options = {}) {
    const T = options.THREE;
    const grid = options.grid;
    if (!T || !grid?.definition || !grid?.values) throw new TypeError('Three.js and a normalized universal grid are required.');
    const d = grid.definition, count = d.width * d.height;
    if (grid.values.length !== count) throw new RangeError('Grid value count does not match its dimensions.');
    const min = Number.isFinite(options.min) ? options.min : (Number.isFinite(grid.min) ? grid.min : 0);
    const max = Number.isFinite(options.max) ? options.max : (Number.isFinite(grid.max) ? grid.max : 1);
    if (!(max > min)) throw new RangeError('GPU skin colour range is invalid.');
    const opacity = Number.isFinite(options.opacity) ? Math.max(0, Math.min(1, options.opacity)) : 0.88;
    const pixels = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      const value = Number(grid.values[i]);
      const valid = Number.isFinite(value) && (d.noDataValue == null || value !== Number(d.noDataValue));
      if (!valid) { pixels[i * 4 + 3] = 0; continue; }
      pixels[i * 4] = Math.round(Math.max(0, Math.min(1, (value - min) / (max - min))) * 255);
      pixels[i * 4 + 1] = 0;
      pixels[i * 4 + 2] = 0;
      pixels[i * 4 + 3] = 255;
    }
    const texture = new T.DataTexture(pixels, d.width, d.height, T.RGBAFormat, T.UnsignedByteType);
    texture.needsUpdate = true;
    texture.magFilter = T.LinearFilter;
    texture.minFilter = T.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.wrapS = T.RepeatWrapping;
    texture.wrapT = T.ClampToEdgeWrapping;
    texture.unpackAlignment = 1;

    const rampTexture = makeRampTexture(T, options.colorStops);
    const contourInterval = Number.isFinite(options.contourInterval) && options.contourInterval > 0 ? options.contourInterval : 0;
    const contourStrength = Number.isFinite(options.contourStrength) ? Math.max(0, Math.min(1, options.contourStrength)) : 0.18;
    const contourColor = Array.isArray(options.contourColor) && options.contourColor.length === 3 ? options.contourColor : [0.08, 0.12, 0.18];
    const geometry = new T.SphereGeometry(Number(options.radius) || 1.008, 256, 128);
    const material = new T.ShaderMaterial({
      uniforms: {
        uGrid: { value: texture }, uRamp: { value: rampTexture }, uOpacity: { value: opacity },
        uContours: { value: contourInterval > 0 ? 1 : 0 }, uContourInterval: { value: contourInterval },
        uContourStrength: { value: contourStrength }, uContourColor: { value: new T.Vector3(...contourColor) },
        uMin: { value: min }, uMax: { value: max },
        // Map globe UVs into the grid's declared geographic coordinate system.
        uLongitudeOffset: { value: (-180 - d.lonStart) / (d.lonStep * d.width) },
        uLongitudeScale: { value: 360 / (d.lonStep * d.width) },
        uLatitudeOffset: { value: (-90 - d.latStart) / (d.latStep * (d.height - 1)) },
        uLatitudeScale: { value: 180 / (d.latStep * (d.height - 1)) }
      },
      vertexShader: `varying vec2 vUv; varying vec3 vNormalView; void main(){ vUv=uv; vNormalView=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D uGrid; uniform sampler2D uRamp; uniform float uOpacity;
        uniform float uContours; uniform float uContourInterval; uniform float uContourStrength;
        uniform vec3 uContourColor; uniform float uMin; uniform float uMax;
        uniform float uLongitudeOffset; uniform float uLongitudeScale;
        uniform float uLatitudeOffset; uniform float uLatitudeScale;
        varying vec2 vUv; varying vec3 vNormalView;
        void main(){
          vec2 gridUv=vec2(fract(uLongitudeOffset+uLongitudeScale*vUv.x),clamp(uLatitudeOffset+uLatitudeScale*vUv.y,0.0,1.0));
          vec4 sampleValue=texture2D(uGrid,gridUv);
          if(sampleValue.a<0.5) discard;
          float t=sampleValue.r;
          vec3 colour=texture2D(uRamp,vec2(t,0.5)).rgb;
          if(uContours>0.5 && uContourInterval>0.0){
            float scalar=mix(uMin,uMax,t);
            float phase=fract(scalar/uContourInterval);
            float distanceToLine=min(phase,1.0-phase);
            float line=1.0-smoothstep(0.015,0.055,distanceToLine);
            colour=mix(colour,uContourColor,line*uContourStrength);
          }
          float edge=pow(1.0-abs(vNormalView.z),2.0);
          gl_FragColor=vec4(colour*(0.90+0.10*edge),uOpacity);
        }
      `,
      transparent: true, depthWrite: false, side: T.FrontSide, blending: T.NormalBlending
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.name = options.name || 'liveEarth-universal-gpu-grid-skin';
    mesh.renderOrder = 4;
    mesh.userData.liveEarthGrid = Object.freeze({
      version: VERSION, gridId: grid.gridId || null, datasetId: grid.datasetId,
      width: d.width, height: d.height, units: grid.units,
      observedAt: grid.observedAt, retrievedAt: grid.retrievedAt,
      colourRange: Object.freeze({ min, max })
    });
    let disposed = false;
    return Object.freeze({
      mesh,
      stats: Object.freeze({ width: d.width, height: d.height, textureBytes: pixels.byteLength, validCells: grid.validCount, min, max }),
      dispose() {
        if (disposed) return;
        disposed = true;
        mesh.removeFromParent?.();
        geometry.dispose(); material.dispose(); texture.dispose(); rampTexture.dispose();
      }
    });
  }
  window.LiveEarthGpuGridSkin = Object.freeze({ version: VERSION, create });
  window.dispatchEvent?.(new CustomEvent('live-earth-gpu-grid-skin-ready', { detail: { version: VERSION } }));
})();
