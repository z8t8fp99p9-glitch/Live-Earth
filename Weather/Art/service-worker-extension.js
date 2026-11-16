/* LIVE // EARTH — Weather V17 pavilion clockwise rotation.
 * Preserves the approved front-facing camera and square canvas.
 * Reduces rear hills by 45% and Mount Fuji by 40%, keeping Fuji grounded.
 */
(() => {
  'use strict';
  const rendererPath = './Weather/Art/live-art-online.js';
  if (!Array.isArray(APP_SHELL)) throw new Error('LIVE // EARTH app-shell list is unavailable.');
  if (!APP_SHELL.includes(rendererPath)) APP_SHELL.push(rendererPath);

  const weatherPath = new URL('./Weather/weather-view.js', self.registration.scope).pathname;
  const cameraMarker = 'LE-SQUARE-WORLD-CAMERA-V9';
  const sceneMarker = 'LE-WEATHER-FUJI-GARDEN-V2';
  const hillsMarker = 'LE-WEATHER-HILLS-HEIGHT-55-V2';
  const fujiMarker = 'LE-WEATHER-FUJI-HEIGHT-54-V3';
  const versionMarker = 'LE-WEATHER-SCENERY-V17';

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
    "    const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.18;scene.add(ground);",
    "    // LE-WEATHER-HILLS-TERRAIN-V2 LE-WEATHER-HILLS-REAR-RIDGE-LOWERED-V1: three continuous rolling ridges.",
    "    function createRollingRidge(zStart,depth,peak,phase,material){",
    "      const nx=112,nz=30,positions=[],indices=[];",
    "      for(let iz=0;iz<=nz;iz++){",
    "        const t=iz/nz;",
    "        for(let ix=0;ix<=nx;ix++){",
    "          const u=ix/nx,x=-48+u*96;",
    "          const crest=.68+.18*Math.sin(x*.105+phase)+.10*Math.sin(x*.19+phase*1.7);",
    "          const shoulder=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.72);",
    "          const y=peak*.55*shoulder*Math.max(.28,crest);",
    "          const z=zStart+t*depth;",
    "          positions.push(x,y,z);",
    "          if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,c=a+(nx+1),d=c+1;indices.push(a,c,b,b,c,d);}",
    "        }",
    "      }",
    "      const geometry=new THREE.BufferGeometry();",
    "      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));",
    "      geometry.setIndex(indices);geometry.computeVertexNormals();",
    "      const mesh=new THREE.Mesh(geometry,material);mesh.material.side=THREE.DoubleSide;scene.add(mesh);return mesh;",
    "    }",
    "    createRollingRidge(-43,15,8.5,.4,hillMats[0]);",
    "    createRollingRidge(-36,14,10,1.8,hillMats[1]);",
    "    createRollingRidge(-29,12,7,3.1,hillMats[2]);",
    "    const fujiGroup=new THREE.Group();fujiGroup.position.set(3.75,6.048,-64);fujiGroup.scale.y=.54;fujiGroup.userData.refinement='LE-WEATHER-FUJI-HEIGHT-54-V3';scene.add(fujiGroup);",
    "    const fujiBodyMat=new THREE.MeshStandardMaterial({color:'#657985',roughness:1});",
    "    const fujiBody=new THREE.Mesh(new THREE.ConeGeometry(25,22,96,8),fujiBodyMat);fujiGroup.add(fujiBody);",
    "    const snowVertices=[0,11,0],snowIndices=[],snowSegments=96;",
    "    for(let i=0;i<snowSegments;i++){const a=i/snowSegments*Math.PI*2;const edge=3.05+.48*Math.sin(a*4+.55)+.22*Math.sin(a*9+1.1)+.12*Math.sin(a*15);const radius=25*(11-edge)/22;snowVertices.push(radius*Math.cos(a),edge,radius*Math.sin(a));}",
    "    for(let i=0;i<snowSegments;i++)snowIndices.push(0,i+1,((i+1)%snowSegments)+1);",
    "    const snowGeometry=new THREE.BufferGeometry();snowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(snowVertices,3));snowGeometry.setIndex(snowIndices);snowGeometry.computeVertexNormals();",
    "    const snowMaterial=new THREE.MeshStandardMaterial({color:'#e7eeee',roughness:1,side:THREE.DoubleSide});",
    "    fujiGroup.add(new THREE.Mesh(snowGeometry,snowMaterial));"
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
    if (source.includes(versionMarker)) return null;
    let updated = source;
    let changed = false;

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

    // V14: replace angular low-poly mounds with continuous smooth rolling hill surfaces.
    const oldV13HillGeometry = "function hill(x,z,sx,sy,sz,index){const geo=new THREE.IcosahedronGeometry(1,2);const m=new THREE.Mesh(geo,hillMats[index%hillMats.length]);m.position.set(x,0,z);m.scale.set(sx,.55*sy,sz);scene.add(m);return m;}";
    const smoothHillGeometry = "function hill(x,z,sx,sy,sz,index){const geo=new THREE.SphereGeometry(1,48,32);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);const ripple=1+.035*Math.sin(px*4.2+index*.8)*Math.cos(pz*3.6-index*.55)+.018*Math.sin(px*8.1+pz*5.2+index);p.setXYZ(i,px*ripple,py*(1+.018*Math.sin(px*3.1+pz*2.7+index)),pz*ripple);}geo.computeVertexNormals();const m=new THREE.Mesh(geo,hillMats[index%hillMats.length]);m.position.set(x,0,z);m.scale.set(sx,.55*sy,sz);scene.add(m);return m;}";
    if (updated.includes(oldV13HillGeometry)) {
      updated = updated.replace(oldV13HillGeometry, smoothHillGeometry);
      updated = updated.replace(hillsMarker, hillsMarker + ' LE-WEATHER-HILLS-ROLLING-SMOOTH-V1');
      changed = true;
    }

    // Upgrade a cached V9 scene in place, retaining all other scene objects.
    const oldHillFunction = /function hill\(x,z,sx,sy,sz,index\)\{const (?:geo=new THREE\.IcosahedronGeometry\(1,2\);)?const m=new THREE\.Mesh\((?:new THREE\.IcosahedronGeometry\(1,2\)|geo),hillMats\[index%hillMats\.length\]\);m\.position\.set\(x,(?:sy\*\.40|sy\*\.45),z\);m\.scale\.set\(sx,sy,sz\);scene\.add\(m\);return m;\}/;
    if (oldHillFunction.test(updated)) {
      updated = updated.replace(oldHillFunction,
        'function hill(x,z,sx,sy,sz,index){const geo=new THREE.SphereGeometry(1,48,32);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i);const ripple=1+.035*Math.sin(px*4.2+index*.8)*Math.cos(pz*3.6-index*.55)+.018*Math.sin(px*8.1+pz*5.2+index);p.setXYZ(i,px*ripple,py*(1+.018*Math.sin(px*3.1+pz*2.7+index)),pz*ripple);}geo.computeVertexNormals();const m=new THREE.Mesh(geo,hillMats[index%hillMats.length]);m.position.set(x,0,z);m.scale.set(sx,.55*sy,sz);scene.add(m);return m;}');
      updated = updated.replace(sceneMarker, sceneMarker + ' ' + hillsMarker);
      changed = true;
    }

    const priorV12Fuji = "const fujiGroup=new THREE.Group();fujiGroup.position.set(0,6.72,-64);fujiGroup.scale.y=.60;fujiGroup.userData.refinement='LE-WEATHER-FUJI-HEIGHT-60-V2';scene.add(fujiGroup);";
    const priorV9Fuji = "const fujiGroup=new THREE.Group();fujiGroup.position.set(0,11.2,-64);scene.add(fujiGroup);";
    const refinedFuji = `const fujiGroup=new THREE.Group();fujiGroup.position.set(3.75,6.048,-64);fujiGroup.scale.y=.54;fujiGroup.userData.refinement='${fujiMarker}';scene.add(fujiGroup);`;
    if (updated.includes(priorV12Fuji)) {
      updated = updated.replace(priorV12Fuji, refinedFuji);
      changed = true;
    } else if (updated.includes(priorV9Fuji)) {
      updated = updated.replace(priorV9Fuji, refinedFuji);
      changed = true;
    }

    // Transform the original procedural world block into the layered Fuji scene.
    const worldPattern = /    const groundMat=mat\('#344e42'\)(?:,[\s\S]*?)?;\n    const ground=new THREE\.Mesh\(new THREE\.PlaneGeometry\(180,180\),groundMat\);[\s\S]*?(?=    const waterMat=)/;
    if (worldPattern.test(updated) && !updated.includes('const fujiGroup=')) {
      updated = updated.replace(worldPattern, sceneryBlock + '\n');
      changed = true;
    }

    // Restore the balanced side-tree layout only when transforming the original tree loop.
    const treePattern = /    const trees=\[\];for\(let i=0;i<18;i\+\+\)\{[\s\S]*?\}\n    \/\/ Main architectural landmark/;
    if (treePattern.test(updated) && !updated.includes('const treeLayout=')) {
      updated = updated.replace(treePattern, treeBlock + '\n    // Main architectural landmark');
      changed = true;
    }


    // V16: lower only the distant dark-green ridge in an already-built V15 scene.
    // Replace the entire marked terrain section, preserving the approved Fuji group.
    if (updated.includes('LE-WEATHER-SCENERY-V15') &&
        !updated.includes('LE-WEATHER-HILLS-REAR-RIDGE-LOWERED-V1')) {
      const terrainAt = updated.indexOf('LE-WEATHER-HILLS-TERRAIN-V2');
      const terrainLineStart = terrainAt >= 0 ? updated.lastIndexOf('\n', terrainAt) + 1 : -1;
      const fujiAt = terrainAt >= 0 ? updated.indexOf('const fujiGroup=', terrainAt) : -1;
      if (terrainLineStart >= 0 && fujiAt > terrainLineStart) {
        const fujiLineStart = updated.lastIndexOf('\n', fujiAt) + 1;
        updated = updated.slice(0, terrainLineStart) +
          `    // LE-WEATHER-HILLS-TERRAIN-V2 LE-WEATHER-HILLS-REAR-RIDGE-LOWERED-V1
    function createRollingRidge(zStart,depth,peak,phase,material){
      const nx=112,nz=30,positions=[],indices=[];
      for(let iz=0;iz<=nz;iz++){
        const t=iz/nz;
        for(let ix=0;ix<=nx;ix++){
          const u=ix/nx,x=-48+u*96;
          const crest=.68+.18*Math.sin(x*.105+phase)+.10*Math.sin(x*.19+phase*1.7);
          const shoulder=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.72);
          const y=peak*.55*shoulder*Math.max(.28,crest);
          const z=zStart+t*depth;
          positions.push(x,y,z);
          if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,c=a+(nx+1),d=c+1;indices.push(a,c,b,b,c,d);}
        }
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material);mesh.material.side=THREE.DoubleSide;scene.add(mesh);return mesh;
    }
    createRollingRidge(-43,15,8.5,.4,hillMats[0]);
    createRollingRidge(-36,14,10,1.8,hillMats[1]);
    createRollingRidge(-29,12,7,3.1,hillMats[2]);\n` + updated.slice(fujiLineStart);
        changed = true;
      }
    }


    // V17: rotate the complete pavilion group 20 degrees clockwise around its vertical axis.
    const houseAnchor = "const house=new THREE.Group();scene.add(house);house.position.set(0,0,-1.4);";
    const rotatedHouse = houseAnchor + "house.rotation.y=20*Math.PI/180;house.userData.refinement='LE-WEATHER-PAVILION-ROTATION-CW-20-V1';";
    if (updated.includes(houseAnchor) && !updated.includes('LE-WEATHER-PAVILION-ROTATION-CW-20-V1')) {
      updated = updated.replace(houseAnchor, rotatedHouse);
      changed = true;
    }

    if (!changed) return null;
    const hasFuji = updated.includes(`fujiGroup.userData.refinement='${fujiMarker}'`) &&
      updated.includes('fujiGroup.scale.y=.54') &&
      updated.includes('fujiGroup.position.set(3.75,6.048,-64)');
    const hasHills = updated.includes('LE-WEATHER-HILLS-REAR-RIDGE-LOWERED-V1') && updated.includes('createRollingRidge(-43,15,8.5,.4,hillMats[0])') && updated.includes('createRollingRidge(-36,14,10,1.8,hillMats[1])') && updated.includes('createRollingRidge(-29,12,7,3.1,hillMats[2])');
    const hasCamera = updated.includes(frontResize) && updated.includes(cameraMarker);
    const hasTrees = updated.includes('const treeLayout=');
    const hasHouseRotation = updated.includes('house.rotation.y=20*Math.PI/180') && updated.includes('LE-WEATHER-PAVILION-ROTATION-CW-20-V1');
    if (!hasFuji || !hasHills || !hasCamera || !hasTrees || !hasHouseRotation ||
        updated.includes('left:calc(50% - 30vw)')) return null;
    return updated + `\n/* ${versionMarker} */\n`;
  }

  async function rewriteWeatherResponse(response) {
    if (!response || !response.ok || response.type === 'opaque') return null;
    const source = await response.clone().text();
    if (source.includes(versionMarker)) return null;
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
      if(!source.includes(versionMarker))
        console.error('[LIVE // EARTH] Weather V17 pavilion rotation transform did not match; original Weather response preserved.');
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
