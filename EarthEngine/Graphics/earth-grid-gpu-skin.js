/* LIVE // EARTH — Universal GPU grid skin for regular global lat/lon grids.
 * One compact RGBA texture + one sphere; never creates one JS mesh per cell.
 * Temperature styling is dataset-specific; generic grid rendering stays unchanged.
 */
(() => {
  'use strict';
  const VERSION = '1.1.0';
  function create(options = {}) {
    const T = options.THREE;
    const grid = options.grid;
    if (!T || !grid?.definition || !grid?.values) throw new TypeError('Three.js and a normalized universal grid are required.');
    const d = grid.definition, count = d.width * d.height;
    if (grid.values.length !== count) throw new RangeError('Grid value count does not match its dimensions.');
    const min = Number.isFinite(options.min) ? options.min : -80;
    const max = Number.isFinite(options.max) ? options.max : 45;
    if (!(max > min)) throw new RangeError('GPU skin colour range is invalid.');
    const isAtmosphereTemperature = grid.datasetId === 'ATMOSPHERE_01' && grid.units === 'degree_Celsius';
    const pixels = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      const value = Number(grid.values[i]);
      const valid = Number.isFinite(value) && (d.noDataValue === null || value !== Number(d.noDataValue));
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
    const geometry = new T.SphereGeometry(Number(options.radius) || 1.008, 256, 128);
    const material = new T.ShaderMaterial({
      uniforms: {
        uGrid: { value: texture },
        uOpacity: { value: isAtmosphereTemperature ? 0.74 : (Number.isFinite(options.opacity) ? options.opacity : 0.88) },
        uTime: { value: 0 },
        uContours: { value: options.contours === true ? 1 : 0 },
        uContourStrength: { value: isAtmosphereTemperature ? 0.34 : (Number.isFinite(options.contourStrength) ? options.contourStrength : 0.22) },
        uTemperaturePalette: { value: isAtmosphereTemperature ? 1 : 0 },
        uMin: { value: min },
        uMax: { value: max },
        // Convert globe UV coordinates into the source grid's declared
        // geographic coordinate system. This avoids a 180-degree shift
        // and east/west reversal for NOAA's 0..360 east-positive grid.
        uLongitudeOffset: { value: (-180 - d.lonStart) / (d.lonStep * d.width) },
        uLongitudeScale: { value: 360 / (d.lonStep * d.width) },
        uLatitudeOffset: { value: (-90 - d.latStart) / (d.latStep * (d.height - 1)) },
        uLatitudeScale: { value: 180 / (d.latStep * (d.height - 1)) }
      },
      vertexShader: `varying vec2 vUv; varying vec3 vNormalView; void main(){ vUv=uv; vNormalView=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D uGrid; uniform float uOpacity;
        uniform float uTime; uniform float uContours; uniform float uContourStrength;
        uniform float uTemperaturePalette; uniform float uMin; uniform float uMax;
        uniform float uLongitudeOffset; uniform float uLongitudeScale;
        uniform float uLatitudeOffset; uniform float uLatitudeScale;
        varying vec2 vUv; varying vec3 vNormalView;

        vec3 temperatureRamp(float t) {
          vec3 c0 = vec3(0.055, 0.105, 0.34);  // deep cold
          vec3 c1 = vec3(0.12, 0.34, 0.78);    // cold blue
          vec3 c2 = vec3(0.20, 0.70, 0.84);    // icy cyan
          vec3 c3 = vec3(0.28, 0.70, 0.55);    // cool green
          vec3 c4 = vec3(0.72, 0.79, 0.34);    // mild
          vec3 c5 = vec3(0.96, 0.78, 0.24);    // warm yellow
          vec3 c6 = vec3(0.94, 0.39, 0.16);    // hot orange
          vec3 c7 = vec3(0.78, 0.12, 0.20);    // extreme heat
          vec3 c8 = vec3(0.48, 0.075, 0.34);   // hottest
          if (t < 0.14) return mix(c0, c1, smoothstep(0.0, 0.14, t));
          if (t < 0.29) return mix(c1, c2, smoothstep(0.14, 0.29, t));
          if (t < 0.43) return mix(c2, c3, smoothstep(0.29, 0.43, t));
          if (t < 0.57) return mix(c3, c4, smoothstep(0.43, 0.57, t));
          if (t < 0.71) return mix(c4, c5, smoothstep(0.57, 0.71, t));
          if (t < 0.84) return mix(c5, c6, smoothstep(0.71, 0.84, t));
          if (t < 0.94) return mix(c6, c7, smoothstep(0.84, 0.94, t));
          return mix(c7, c8, smoothstep(0.94, 1.0, t));
        }

        vec3 genericRamp(float t) {
          vec3 a=vec3(0.055,0.16,0.48), b=vec3(0.02,0.66,0.88), c=vec3(0.18,0.86,0.66), d=vec3(1.0,0.79,0.28), e=vec3(0.91,0.25,0.17);
          if(t<0.25) return mix(a,b,smoothstep(0.0,0.25,t));
          if(t<0.50) return mix(b,c,smoothstep(0.25,0.50,t));
          if(t<0.75) return mix(c,d,smoothstep(0.50,0.75,t));
          return mix(d,e,smoothstep(0.75,1.0,t));
        }

        void main(){
          // SphereGeometry's U axis runs opposite to east-positive longitude.
          // Its centre meridian is 0 degrees; source grid metadata supplies
          // the first longitude/latitude and signed grid steps.
          vec2 gridUv = vec2(
            fract(uLongitudeOffset + uLongitudeScale * vUv.x),
            clamp(uLatitudeOffset + uLatitudeScale * vUv.y, 0.0, 1.0)
          );
          vec4 sampleValue=texture2D(uGrid,gridUv);
          if(sampleValue.a<0.5) discard;
          float t=sampleValue.r;
          vec3 colour = uTemperaturePalette > 0.5 ? temperatureRamp(t) : genericRamp(t);

          // Temperature isolines are calculated from the verified Celsius
          // values, at 5 C intervals. They are static measurement contours,
          // not animated weather motion.
          if (uContours > 0.5 && uTemperaturePalette > 0.5) {
            float temperatureC = mix(uMin, uMax, t);
            float phase = fract(temperatureC / 5.0);
            float distanceToLine = min(phase, 1.0 - phase);
            float line = 1.0 - smoothstep(0.012, 0.050, distanceToLine);
            colour = mix(colour, vec3(0.075, 0.105, 0.16), line * uContourStrength);
          } else if (uContours > 0.5) {
            float contourPhase = fract(t * 18.0);
            float contourDistance = min(contourPhase, 1.0 - contourPhase);
            float contourLine = 1.0 - smoothstep(0.018, 0.055, contourDistance);
            float contourPulse = 0.82 + 0.18 * sin(uTime * 1.15 + t * 9.0);
            vec3 contourColour = mix(vec3(0.55, 0.91, 1.0), vec3(0.88, 0.98, 1.0), contourPulse);
            colour = mix(colour, contourColour, contourLine * uContourStrength);
          }

          float edge=pow(1.0-abs(vNormalView.z),2.0);
          float glow=0.90+0.10*edge;
          gl_FragColor=vec4(colour*glow,uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: T.FrontSide,
      blending: T.NormalBlending
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
        geometry.dispose(); material.dispose(); texture.dispose();
      }
    });
  }
  window.LiveEarthGpuGridSkin = Object.freeze({ version: VERSION, create });
  window.dispatchEvent?.(new CustomEvent('live-earth-gpu-grid-skin-ready', { detail: { version: VERSION } }));
})();
