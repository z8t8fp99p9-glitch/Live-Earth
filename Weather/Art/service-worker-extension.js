/* LIVE // EARTH — Weather square-world scene extension.
 * Keeps the approved V7 front-facing camera, replaces the oversized rear
 * hills with a distant snow-capped Mount Fuji, and scales the garden trees down.
 */
(() => {
  'use strict';

  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) {
    throw new Error('LIVE // EARTH app-shell list is unavailable.');
  }
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  const weatherPath = new URL('./Weather/weather-view.js', self.registration.scope).pathname;
  const patchMarker = 'LE-SQUARE-WORLD-CAMERA-V8';
  const sceneMarker = 'LE-WEATHER-FUJI-GARDEN-V1';
  const previousMarkers = [
    'LE-SQUARE-WORLD-CAMERA-V7',
    'LE-SQUARE-WORLD-CAMERA-V6',
    'LE-SQUARE-WORLD-CAMERA-V5',
    'LE-SQUARE-WORLD-CAMERA-V4',
    'LE-SQUARE-WORLD-CAMERA-V3',
    'LE-SQUARE-WORLD-CAMERA-V2',
    'LE-SQUARE-WORLD-CAMERA-V1'
  ];

  const originalCanvasRule =
    '.le-weather-v2 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:pan-y}';

  const centredCanvasRule = originalCanvasRule + `
      /* ${patchMarker}: fixed square stage, centred and cropped by the display */
      .le-weather-v2 canvas{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:100vmax!important;height:100vmax!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;display:block;z-index:0;touch-action:pan-y}`;

  const landscapeOffsetRule =
    '\n      @media(orientation:landscape){.le-weather-v2 canvas{left:calc(50% - 30vw)!important}}';

  const originalResize =
    'function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(width>height?0:0, width>height?6.1:7.2, width>height?20:18);camera.fov=width>height?38:42;camera.updateProjectionMatrix();}';

  const squareResizeV1 =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.2,18);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const squareResizeV2 =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,9.55,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const angledResizeV4 =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(14.55,9.55,23.81);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const targetOffsetResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,9.55,27.7);camera.fov=42;const landscape=window.matchMedia("(orientation: landscape)").matches;const distance=Math.hypot(0,9.55-2.5,27.7+1.4);const frameWidth=2*distance*Math.tan(42*Math.PI/360);const targetX=landscape?0.30*(window.innerWidth/side)*frameWidth:0;camera.lookAt(targetX,2.5,-1.4);camera.updateProjectionMatrix();}';

  // Preserve the V7 camera exactly: same front-facing view and centre anchor.
  const frontViewResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.0,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const oldHillBlock = [
    "    const groundMat=mat('#344e42'),hillMats=['#274a45','#315951','#3d665c'].map(c=>mat(c));",
    '    const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.18;scene.add(ground);',
    '    function hill(x,z,sx,sy,sz,index){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),hillMats[index%3]);m.position.set(x,sy*.45,z);m.scale.set(sx,sy,sz);scene.add(m);return m;}',
    '    for(let i=0;i<14;i++){const x=(i-6.5)*7;hill(x,-23-(i%3)*2,5+(i%4)*1.7,5+(i%3)*1.5,4+(i%5),i);}'
  ].join('\n');

  const fujiWorld = [
    "    const groundMat=mat('#344e42');",
    '    const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.18;scene.add(ground);',
    `    // ${sceneMarker}: a distant, snow-capped Fuji replaces the oversized rear hill row.`,
    '    const fujiGroup=new THREE.Group();fujiGroup.position.set(0,1.5,-24);scene.add(fujiGroup);',
    "    const fujiBodyMat=new THREE.MeshStandardMaterial({color:'#4b6573',roughness:1,flatShading:true});",
    '    const fujiBody=new THREE.Mesh(new THREE.ConeGeometry(13.2,11,72,6),fujiBodyMat);fujiGroup.add(fujiBody);',
    '    const snowPositions=[];const snowSegments=72;const fujiTop=5.5;const fujiHeight=11;const fujiRadius=13.2;',
    '    for(let i=0;i<snowSegments;i++){',
    '      const a0=i/snowSegments*Math.PI*2;const a1=(i+1)/snowSegments*Math.PI*2;',
    '      const edge0=2.25+.34*Math.sin(a0*5+.4)+.16*Math.sin(a0*11);',
    '      const edge1=2.25+.34*Math.sin(a1*5+.4)+.16*Math.sin(a1*11);',
    '      const r0=fujiRadius*(fujiTop-edge0)/fujiHeight;const r1=fujiRadius*(fujiTop-edge1)/fujiHeight;',
    '      snowPositions.push(0,fujiTop,0,r0*Math.cos(a0),edge0,r0*Math.sin(a0),r1*Math.cos(a1),edge1,r1*Math.sin(a1));',
    '    }',
    '    const fujiSnowGeometry=new THREE.BufferGeometry();fujiSnowGeometry.setAttribute(\'position\',new THREE.Float32BufferAttribute(snowPositions,3));fujiSnowGeometry.computeVertexNormals();',
    "    const fujiSnowMat=new THREE.MeshStandardMaterial({color:'#e3ecec',roughness:1,flatShading:true,side:THREE.DoubleSide});",
    '    fujiGroup.add(new THREE.Mesh(fujiSnowGeometry,fujiSnowMat));'
  ].join('\n');

  const oldTreeBlock =
    '    const trees=[];for(let i=0;i<18;i++){const side=i%2?1:-1;trees.push(tree(side*(5.2+(i%4)*1.7),-2+(i%6)*2.2,.65+(i%3)*.18));}';

  const smallTreeBlock = [
    '    // Smaller garden trees frame the pavilion without obscuring Fuji or the roof.',
    '    const trees=[];const treeLayout=[',
    '      [-8.6,-7.0,.44],[-10.2,1.0,.39],[-8.8,8.0,.42],[-12.6,-14.0,.46],[-12.8,6.2,.38],',
    '      [8.6,-7.0,.44],[10.2,1.0,.39],[8.8,8.0,.42],[12.6,-14.0,.46],[12.8,6.2,.38]',
    '    ];',
    '    for(const [x,z,scale] of treeLayout)trees.push(tree(x,z,scale));'
  ].join('\n');

  function transformSource(source) {
    if (source.includes(patchMarker)) return null;
    let updated = source;
    let matched = false;

    const priorMarker = previousMarkers.find(marker => updated.includes(marker));
    if (priorMarker) {
      updated = updated.replaceAll(priorMarker, patchMarker);
      matched = true;
    }

    // Remove any old Landscape-only CSS translation.
    updated = updated.replace(landscapeOffsetRule, '');

    // Restore square canvas CSS for the original responsive renderer.
    if (updated.includes(originalCanvasRule) && updated.includes(originalResize)) {
      updated = updated.replace(originalCanvasRule, centredCanvasRule);
      matched = true;
    }

    // Keep the established V7 front camera while upgrading older cached builds.
    const knownResizes = [
      frontViewResize,
      targetOffsetResize,
      angledResizeV4,
      squareResizeV2,
      squareResizeV1,
      originalResize
    ];
    for (const known of knownResizes) {
      if (updated.includes(known)) {
        if (known !== frontViewResize) updated = updated.replace(known, frontViewResize);
        matched = true;
        break;
      }
    }

    // Replace both scene blocks together; fail closed if the expected source changed.
    if (!updated.includes(sceneMarker)) {
      if (!updated.includes(oldHillBlock) || !updated.includes(oldTreeBlock)) return null;
      updated = updated.replace(oldHillBlock, fujiWorld);
      updated = updated.replace(oldTreeBlock, smallTreeBlock);
      matched = true;
    }

    if (!matched) return null;
    return updated.includes(patchMarker) &&
      updated.includes(frontViewResize) &&
      updated.includes(sceneMarker) &&
      !updated.includes('left:calc(50% - 30vw)')
      ? updated : null;
  }

  async function rewriteWeatherResponse(response) {
    if (!response || !response.ok || response.type === 'opaque') return null;
    const source = await response.clone().text();
    if (source.includes(patchMarker) && source.includes(sceneMarker)) return null;
    const updated = transformSource(source);
    if (!updated) return null;

    const headers = new Headers(response.headers);
    ['content-length', 'content-encoding', 'etag', 'last-modified', 'content-md5']
      .forEach(name => headers.delete(name));

    return new Response(updated, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  const nativeFetch = self.fetch.bind(self);
  self.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    let pathname = '';
    try {
      const rawUrl = typeof input === 'string' || input instanceof URL ? input : input.url;
      pathname = new URL(rawUrl, self.location.href).pathname;
    } catch (_) {
      return response;
    }
    if (pathname !== weatherPath) return response;

    const patched = await rewriteWeatherResponse(response);
    if (patched) return patched;

    if (response.ok) {
      const source = await response.clone().text();
      if (!source.includes(patchMarker) || !source.includes(sceneMarker)) {
        console.error('[LIVE // EARTH] Weather Fuji garden scene patch did not match the expected renderer source. The original response was preserved.');
      }
    }
    return response;
  };

  // Upgrade cached V1–V7 Weather modules to the Fuji garden scene while
  // preserving the V7 front-facing camera and centre anchor.
  self.addEventListener('activate', event => {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const request = new Request(new URL('./Weather/weather-view.js', self.registration.scope).href);
      const cached = await cache.match(request);
      if (!cached) return;
      const patched = await rewriteWeatherResponse(cached);
      if (patched) await cache.put(request, patched);
    })());
  });
})();
