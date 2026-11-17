/* LIVE // EARTH — Universal GPU grid skin for regular global lat/lon grids.
 * One compact RGBA texture + one sphere; never creates one JS mesh per cell.
 */
(() => {
  'use strict';
  const VERSION = '1.0.0';
  function create(options = {}) {
    const T = options.THREE;
    const grid = options.grid;
    if (!T || !grid?.definition || !grid?.values) throw new TypeError('Three.js and a normalized universal grid are required.');
    const d = grid.definition, count = d.width * d.height;
    if (grid.values.length !== count) throw new RangeError('Grid value count does not match its dimensions.');
    const min = Number.isFinite(options.min) ? options.min : -80;
    const max = Number.isFinite(options.max) ? options.max : 45;
    if (!(max > min)) throw new RangeError('GPU skin colour range is invalid.');
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
      uniforms: { uGrid: { value: texture }, uOpacity: { value: Number.isFinite(options.opacity) ? options.opacity : 0.88 } },
      vertexShader: `varying vec2 vUv; varying vec3 vNormalView; void main(){ vUv=uv; vNormalView=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D uGrid; uniform float uOpacity;
        varying vec2 vUv; varying vec3 vNormalView;
        vec3 ramp(float t){
          vec3 a=vec3(0.055,0.16,0.48), b=vec3(0.02,0.66,0.88), c=vec3(0.18,0.86,0.66), d=vec3(1.0,0.79,0.28), e=vec3(0.91,0.25,0.17);
          if(t<0.25) return mix(a,b,smoothstep(0.0,0.25,t));
          if(t<0.50) return mix(b,c,smoothstep(0.25,0.50,t));
          if(t<0.75) return mix(c,d,smoothstep(0.50,0.75,t));
          return mix(d,e,smoothstep(0.75,1.0,t));
        }
        void main(){
          vec2 uv=vec2(fract(vUv.x), clamp(vUv.y,0.0,1.0));
          vec4 sampleValue=texture2D(uGrid,uv);
          if(sampleValue.a<0.5) discard;
          float t=sampleValue.r;
          vec3 colour=ramp(t);
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
