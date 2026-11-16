/* LIVE // EARTH — Weather Fuji garden scenery refinement.
 * Preserves V9 camera, Fuji, garden trees, pavilion and square composition.
 * Rear green hills are reduced to 55% of their former vertical height.
 */
(() => {
  'use strict';
  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) throw new Error('LIVE // EARTH app-shell list is unavailable.');
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  const weatherPath = new URL('./Weather/weather-view.js', self.registration.scope).pathname;
  const cameraMarker = 'LE-SQUARE-WORLD-CAMERA-V9';
  const sceneMarker = 'LE-WEATHER-FUJI-GARDEN-V2';
  const hillMarker = 'LE-WEATHER-HILLS-HEIGHT-55-V1';
  const fujiMarker = 'LE-WEATHER-FUJI-HEIGHT-60-V1';
  const priorCameraMarkers = [
    'LE-SQUARE-WORLD-CAMERA-V8','LE-SQUARE-WORLD-CAMERA-V7',
    'LE-SQUARE-WORLD-CAMERA-V6','LE-SQUARE-WORLD-CAMERA-V5',
    'LE-SQUARE-WORLD-CAMERA-V4','LE-SQUARE-WORLD-CAMERA-V3',
    'LE-SQUARE-WORLD-CAMERA-V2','LE-SQUARE-WORLD-CAMERA-V1'
  ];
  const priorSceneMarkers = ['LE-WEATHER-FUJI-GARDEN-V1'];

  const originalCanvasRule =
    '.le-weather-v2 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:pan-y}';
  const centredCanvasRule = originalCanvasRule + `
      /* ${cameraMarker}: fixed square stage, centred and cropped by the display */
      .le-weather-v2 canvas{position:absolute!important;inset:auto!important;left:50%!important;top:50%!important;width:100vmax!important;height:100vmax!important;max-width:none!important;max-height:none!important;transform:translate(-50%,-50%)!important;display:block;z-index:0;touch-action:pan-y}`;

  const originalResize =
    'function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(width>height?0:0, width>height?6.1:7.2, width>height?20:18);camera.fov=width>height?38:42;camera.updateProjectionMatrix();}';
  const frontResize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,7.0,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';
  const v2Resize =
    'function resize(){const r=canvas.getBoundingClientRect();const side=Math.max(1,r.width,r.height);width=side;height=side;renderer.setSize(side,side,false);camera.aspect=1;camera.position.set(0,9.55,27.7);camera.fov=42;camera.lookAt(0,2.5,-1.4);camera.updateProjectionMatrix();}';

  const sceneryBlock = [
    "    const groundMat=mat('#344e42'),hillMats=['#274a45','#315951','#3d665c'].map(c=>mat(c));",
    '    const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.18;scene.add(ground);',
    `    // ${sceneMarker}: Fuji is distant; ${hillMarker} preserves hill footprints while lowering their crests.`,
    '    function hill(x,z,sx,sy,sz,index){const geo=new THREE.IcosahedronGeometry(1,2);const m=new THREE.Mesh(geo,hillMats[index%hillMats.length]);m.position.set(x,-.05*sy,z);m.scale.set(sx,.55*sy,sz);scene.add(m);return m;}',
    '    const rearHills=[',
    '      [-25,-34,12,7,8,0],[-17,-31,10,6,7,1],[-8,-36,12,7,8,2],[8,-35,13,7,8,0],[20,-32,11,6,8,1],[29,-36,13,7,9,2],',
    '      [-32,-25,9,5,7,1],[-20,-25,10,5.5,7,2],[20,-26,10,5.5,7,0],[33,-25,9,5,7,1]',
    '    ];',
    '    rearHills.forEach(([x,z,sx,sy,sz,index])=>hill(x,z,sx,sy,sz,index));',
    '    const fujiGroup=new THREE.Group();fujiGroup.position.set(0,6.72,-64);fujiGroup.scale.y=.60;fujiGroup.userData.refinement='LE-WEATHER-FUJI-HEIGHT-60-V1';scene.add(fujiGroup);',
    "    const fujiBodyMat=new THREE.MeshStandardMaterial({color:'#657985',roughness:1});",
    '    const fujiBody=new THREE.Mesh(new THREE.ConeGeometry(25,22,96,8),fujiBodyMat);fujiGroup.add(fujiBody);',
    '    const snowVertices=[0,11,0],snowIndices=[],snowSegments=96;',
    '    for(let i=0;i<snowSegments;i++){',
    '      const a=i/snowSegments*Math.PI*2;',
    '      const edge=3.05+.48*Math.sin(a*4+.55)+.22*Math.sin(a*9+1.1)+.12*Math.sin(a*15);',
    '      const radius=25*(11-edge)/22;',
    '      snowVertices.push(radius*Math.cos(a),edge,radius*Math.sin(a));',
    '    }',
    '    for(let i=0;i<snowSegments;i++)snowIndices.push(0,i+1,((i+1)%snowSegments)+1);',
    '    const snowGeometry=new THREE.BufferGeometry();snowGeometry.setAttribute("position",new THREE.Float32BufferAttribute(snowVertices,3));snowGeometry.setIndex(snowIndices);snowGeometry.computeVertexNormals();',
    "    const snowMaterial=new THREE.MeshStandardMaterial({color:'#e7eeee',roughness:1,side:THREE.DoubleSide});",
    '    fujiGroup.add(new THREE.Mesh(snowGeometry,snowMaterial));'
  ].join('\n');

  const treeBlock = [
    '    // Fuller Japanese garden trees return as balanced side framing around the pavilion.',
    '    const trees=[];const treeLayout=[',
    '      [-8.0,-5.0,.82],[-10.8,1.5,.72],[-8.8,8.2,.78],[-13.0,-12.0,.88],[-13.8,6.0,.70],',
    '      [8.0,-5.0,.82],[10.8,1.5,.72],[8.8,8.2,.78],[13.0,-12.0,.88],[13.8,6.0,.70]',
    '    ];',
    '    for(const [x,z,scale] of treeLayout)trees.push(tree(x,z,scale));'
  ].join('\n');

  function transformSource(source) {
    if (source.includes(cameraMarker) && source.includes(sceneMarker) && source.includes(hillMarker) && source.includes(fujiMarker)) return null;
    let updated = source;
    let changed = false;

    const hasOldCamera = priorCameraMarkers.some(m => updated.includes(m));
    if (hasOldCamera) {
      for (const marker of priorCameraMarkers) updated = updated.replaceAll(marker, cameraMarker);
      changed = true;
    }
    const hasOldScene = priorSceneMarkers.some(m => updated.includes(m));
    if (hasOldScene) {
      for (const marker of priorSceneMarkers) updated = updated.replaceAll(marker, sceneMarker);
      changed = true;
    }

    updated = updated.replace(
      '\n      @media(orientation:landscape){.le-weather-v2 canvas{left:calc(50% - 30vw)!important}}',
      ''
    );
    if (updated.includes(originalCanvasRule) && !updated.includes(cameraMarker)) {
      updated = updated.replace(originalCanvasRule, centredCanvasRule);
      changed = true;
    }
    if (updated.includes(originalResize)) {
      updated = updated.replace(originalResize, frontResize);
      changed = true;
    } else if (updated.includes(v2Resize)) {
      updated = updated.replace(v2Resize, frontResize);
      changed = true;
    }

    // Upgrade an already-patched V9 scene without rebuilding or moving other scenery.
    const oldHillFunction = 'function hill(x,z,sx,sy,sz,index){const geo=new THREE.IcosahedronGeometry(1,2);const m=new THREE.Mesh(geo,hillMats[index%hillMats.length]);m.position.set(x,sy*.40,z);m.scale.set(sx,sy,sz);scene.add(m);return m;}';
    const reducedHillFunction = 'function hill(x,z,sx,sy,sz,index){const geo=new THREE.IcosahedronGeometry(1,2);const m=new THREE.Mesh(geo,hillMats[index%hillMats.length]);m.position.set(x,-.05*sy,z);m.scale.set(sx,.55*sy,sz);scene.add(m);return m;}';
    if (updated.includes(oldHillFunction) && !updated.includes(hillMarker)) {
      updated = updated.replace(oldHillFunction, reducedHillFunction);
      updated = updated.replace(sceneMarker + ': Fuji is distant; layered hills restore the original garden depth.',
        sceneMarker + ': Fuji is distant; ' + hillMarker + ' preserves hill footprints while lowering their crests.');
      changed = true;
    }

    // Lower Mount Fuji by 40% vertically while keeping its width and ground contact.
    const oldFujiTransform = "const fujiGroup=new THREE.Group();fujiGroup.position.set(0,11.2,-64);scene.add(fujiGroup);";
    const reducedFujiTransform = "const fujiGroup=new THREE.Group();fujiGroup.position.set(0,6.72,-64);fujiGroup.scale.y=.60;fujiGroup.userData.refinement='LE-WEATHER-FUJI-HEIGHT-60-V1';scene.add(fujiGroup);";
    if (updated.includes(oldFujiTransform) && !updated.includes(fujiMarker)) {
      updated = updated.replace(oldFujiTransform, reducedFujiTransform);
      changed = true;
    }
    // Existing injected scenery block already carries the reduced Fuji transform.
    if (updated.includes(reducedFujiTransform)) changed = true;

    // Replace the rear landscape block when upgrading the original source.
    const worldPattern = /    const groundMat=mat\('#344e42'\)(?:,[\s\S]*?)?;\n    const ground=new THREE\.Mesh\(new THREE\.PlaneGeometry\(180,180\),groundMat\);[\s\S]*?(?=    const waterMat=)/;
    if (worldPattern.test(updated) && !updated.includes('fujiGroup.position.set(0,6.72,-64)') && updated.includes('fujiGroup.scale.y=.60')) {
      updated = updated.replace(worldPattern, sceneryBlock + '\n');
      changed = true;
    }

    const treePattern = /    const trees=\[\];[\s\S]*?(?=\n    \/\/ Main architectural landmark)/;
    if (treePattern.test(updated) && !updated.includes('const treeLayout=')) {
      updated = updated.replace(treePattern, treeBlock);
      changed = true;
    }

    if (!changed) return null;
    return updated.includes(cameraMarker) && updated.includes(sceneMarker) &&
      updated.includes(hillMarker) && updated.includes(fujiMarker) && updated.includes(frontResize) &&
      updated.includes('fujiGroup.position.set(0,6.72,-64)') && updated.includes('fujiGroup.scale.y=.60') &&
      updated.includes('m.scale.set(sx,.55*sy,sz)') && updated.includes(fujiMarker) &&
      updated.includes('const treeLayout=') &&
      !updated.includes('left:calc(50% - 30vw)') ? updated : null;
  }

  async function rewriteWeatherResponse(response) {
    if (!response || !response.ok || response.type === 'opaque') return null;
    const source = await response.clone().text();
    if (source.includes(cameraMarker) && source.includes(sceneMarker) && source.includes(hillMarker) && source.includes(fujiMarker)) return null;
    const updated = transformSource(source);
    if (!updated) return null;
    const headers = new Headers(response.headers);
    ['content-length','content-encoding','etag','last-modified','content-md5'].forEach(k=>headers.delete(k));
    return new Response(updated,{status:response.status,statusText:response.statusText,headers});
  }

  const nativeFetch=self.fetch.bind(self);
  self.fetch=async(input,init)=>{
    const response=await nativeFetch(input,init);
    let pathname='';
    try{const raw=typeof input==='string'||input instanceof URL?input:input.url;pathname=new URL(raw,self.location.href).pathname;}catch(_){return response;}
    if(pathname!==weatherPath)return response;
    const patched=await rewriteWeatherResponse(response);
    if(patched)return patched;
    if(response.ok){
      const source=await response.clone().text();
      if(!source.includes(cameraMarker)||!source.includes(sceneMarker)||!source.includes(hillMarker))
        console.error('[LIVE // EARTH] Fuji garden/hill refinement did not match; original Weather response preserved.');
    }
    return response;
  };

  self.addEventListener('activate',event=>{
    event.waitUntil((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const request=new Request(new URL('./Weather/weather-view.js',self.registration.scope).href);
      const cached=await cache.match(request);
      if(!cached)return;
      const patched=await rewriteWeatherResponse(cached);
      if(patched)await cache.put(request,patched);
    })());
  });
})();
