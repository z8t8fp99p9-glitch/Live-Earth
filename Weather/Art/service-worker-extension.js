/* LIVE // EARTH — Weather V22 slimmer foundation and four light entrance treads.
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
  const versionMarker = 'LE-WEATHER-SCENERY-V23';

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


    // V18: orient the pavilion 15 degrees counter-clockwise from its original axis.
    // Corrects the previous +20 degree turn by 35 degrees without changing position.
    const houseAnchor = "const house=new THREE.Group();scene.add(house);house.position.set(0,0,-1.4);";
    const priorRotation = "house.rotation.y=20*Math.PI/180;house.userData.refinement='LE-WEATHER-PAVILION-ROTATION-CW-20-V1';";
    const correctedRotation = "house.rotation.y=-15*Math.PI/180;house.userData.refinement='LE-WEATHER-PAVILION-ROTATION-CCW-15-V1';";
    if (updated.includes(priorRotation)) {
      updated = updated.replace(priorRotation, correctedRotation);
      changed = true;
    } else if (updated.includes(houseAnchor) && !updated.includes('LE-WEATHER-PAVILION-ROTATION-CCW-15-V1')) {
      updated = updated.replace(houseAnchor, houseAnchor + "house.rotation.y=-15*Math.PI/180;house.userData.refinement='LE-WEATHER-PAVILION-ROTATION-CCW-15-V1';");
      changed = true;
    }


    // V19: add a compact floating toggle for forecast controls.
    const bottomSection = '<section class="wx2-bottom">';
    const identifiedBottom = '<section class="wx2-bottom" id="wx2-bottom-controls">';
    if (updated.includes(bottomSection) && !updated.includes('id="wx2-bottom-controls"')) {
      updated = updated.replace(bottomSection, identifiedBottom);
      changed = true;
    }

    const closingUi = '</section></div>`;';
    const toggleMarkup = '</section><button class="wx2-control-toggle" type="button" aria-label="Hide weather controls" aria-expanded="true" aria-controls="wx2-bottom-controls"><span aria-hidden="true">⌃</span></button></div>`;';
    if (updated.includes(closingUi) && !updated.includes('wx2-control-toggle')) {
      updated = updated.replace(closingUi, toggleMarkup);
      changed = true;
    }

    const toolbarCssAnchor = '.wx2-bottom{width:min(100%,780px);pointer-events:auto;';
    const toolbarCss = '.wx2-bottom.wx2-controls-collapsed .wx2-toolbar,.wx2-bottom.wx2-controls-collapsed .wx2-section-head,.wx2-bottom.wx2-controls-collapsed .wx2-hours,.wx2-bottom.wx2-controls-collapsed .wx2-week{display:none!important}.wx2-control-toggle{position:absolute;z-index:4;right:clamp(18px,5vw,48px);bottom:calc(env(safe-area-inset-bottom) + var(--wx2-dock,132px) - 2px);width:42px;height:42px;border:1px solid #ffffff70;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#d8eef0d9,#08283bdc);color:#f8f7ef;box-shadow:0 5px 22px #00131f80,inset 0 1px 4px #ffffff80;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font:600 22px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}.wx2-control-toggle:active{transform:scale(.94)}.wx2-control-toggle:focus-visible{outline:2px solid white;outline-offset:3px}.wx2-control-toggle span{display:block;transform:translateY(-1px)}' + toolbarCssAnchor;
    if (updated.includes(toolbarCssAnchor) && !updated.includes('.wx2-control-toggle{')) {
      updated = updated.replace(toolbarCssAnchor, toolbarCss);
      changed = true;
    }

    const rangeBinding = "rangeButtons.forEach(b=>b.addEventListener('click',()=>setRange(b.dataset.range)));";
    const toggleBinding = rangeBinding + `
    const controlsToggle=screen.querySelector('.wx2-control-toggle');
    const controlsPanel=screen.querySelector('.wx2-bottom');
    controlsToggle?.addEventListener('click',()=>{
      const collapsed=controlsPanel.classList.toggle('wx2-controls-collapsed');
      controlsToggle.setAttribute('aria-expanded',String(!collapsed));
      controlsToggle.setAttribute('aria-label',collapsed?'Show weather controls':'Hide weather controls');
      const glyph=controlsToggle.querySelector('span');
      if(glyph)glyph.textContent=collapsed?'⌄':'⌃';
    });`;
    if (updated.includes(rangeBinding) && !updated.includes("const controlsToggle=screen.querySelector")) {
      updated = updated.replace(rangeBinding, toggleBinding);
      changed = true;
    }


    // V20: .wx2-ui intentionally ignores pointer input; opt the floating button back in.
    const toggleCssBefore = '.wx2-control-toggle{position:absolute;';
    const toggleCssAfter = '.wx2-control-toggle{pointer-events:auto;position:absolute;';
    if (updated.includes(toggleCssBefore) && !updated.includes(toggleCssAfter)) {
      updated = updated.replace(toggleCssBefore, toggleCssAfter);
      changed = true;
    }


    // V21: raised Japanese engawa foundation, perimeter framing, piers and broad entrance steps.
    const foundationMarker = 'LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1';
    if (updated.includes("function box(parent,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);parent.add(o);return o;}") &&
        !updated.includes(foundationMarker)) {
      const baseSlab = "box(house,timber,0,1.45,0,6.8,.25,4.5);";
      const expandedSlab = "box(house,timber,0,1.45,0,7.8,.25,5.6);";
      if (updated.includes(baseSlab)) {
        updated = updated.replace(baseSlab, expandedSlab);
        changed = true;
      }
      const boxHelper = "function box(parent,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);parent.add(o);return o;}";
      const foundationParts = `
    // ${foundationMarker}: raised engawa deck with visible undercroft and centred three-step approach.
    const foundationStone=mat('#777465'),deckPlank=mat('#806044'),stepTop=mat('#98724f');
    // Deep perimeter beams frame the wider platform.
    box(house,timber,0,1.20,2.76,7.86,.25,.24);
    box(house,timber,0,1.20,-2.76,7.86,.25,.24);
    box(house,timber,-3.81,1.20,0,.24,.25,5.28);
    box(house,timber,3.81,1.20,0,.24,.25,5.28);
    // Stone pads and timber piers lift the deck visibly above the garden ground.
    for(const x of [-3.42,0,3.42]){
      for(const z of [-2.34,2.34]){
        box(house,foundationStone,x,.14,z,.48,.28,.48);
        box(house,dark,x,.73,z,.30,1.18,.30);
      }
    }
    for(const x of [-3.42,3.42]){
      box(house,foundationStone,x,.14,0,.48,.28,.48);
      box(house,dark,x,.73,0,.30,1.18,.30);
    }
    // Fine deck boards are visible around the building as a veranda.
    for(let i=0;i<10;i++){
      const z=-2.46+i*.545;
      box(house,deckPlank,0,1.565,z,7.58,.045,.50);
    }
    // Three broad solid timber steps meet the front edge of the raised deck.
    const entranceSteps=[{z:4.35,h:.50},{z:3.25,h:1.00},{z:2.15,h:1.50}];
    for(const step of entranceSteps){
      box(house,timber,0,step.h/2,step.z,4.35,step.h,1.12);
      box(house,stepTop,0,step.h+.025,step.z,4.28,.05,1.06);
    }
    `;
      if (updated.includes(boxHelper)) {
        updated = updated.replace(boxHelper, boxHelper + foundationParts);
        changed = true;
      }
    }


    // V22: slim the platform framing by 40% and replace bulky stair blocks with four light treads.
    const slimFoundationMarker = 'LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2';
    if (updated.includes('LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1') &&
        !updated.includes(slimFoundationMarker)) {
      const geometryReplacements = [
        ['box(house,timber,0,1.45,0,7.8,.25,5.6);','box(house,timber,0,1.50,0,7.8,.15,5.6);'],
        ['box(house,timber,0,1.20,2.76,7.86,.25,.24);','box(house,timber,0,1.25,2.76,7.86,.15,.24);'],
        ['box(house,timber,0,1.20,-2.76,7.86,.25,.24);','box(house,timber,0,1.25,-2.76,7.86,.15,.24);'],
        ['box(house,timber,-3.81,1.20,0,.24,.25,5.28);','box(house,timber,-3.81,1.25,0,.24,.15,5.28);'],
        ['box(house,timber,3.81,1.20,0,.24,.25,5.28);','box(house,timber,3.81,1.25,0,.24,.15,5.28);']
      ];
      for(const [before,after] of geometryReplacements){
        if(updated.includes(before)){updated=updated.replace(before,after);changed=true;}
      }
      const oldStairs = `    // Three broad solid timber steps meet the front edge of the raised deck.
    const entranceSteps=[{z:4.35,h:.50},{z:3.25,h:1.00},{z:2.15,h:1.50}];
    for(const step of entranceSteps){
      box(house,timber,0,step.h/2,step.z,4.35,step.h,1.12);
      box(house,stepTop,0,step.h+.025,step.z,4.28,.05,1.06);
    }`;
      const newStairs = `    // Four slim, open-riser timber treads; each tread is a light 0.16-unit board.
    const entranceSteps=[{z:4.35,top:.34},{z:3.45,top:.68},{z:2.55,top:1.02},{z:1.65,top:1.36}];
    for(const step of entranceSteps){
      box(house,timber,0,step.top-.08,step.z,4.35,.16,.88);
      box(house,stepTop,0,step.top-.012,step.z,4.28,.024,.84);
    }`;
      if(updated.includes(oldStairs)){updated=updated.replace(oldStairs,newStairs);changed=true;}
      updated=updated.replace('LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1','LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1 '+slimFoundationMarker);
      changed=true;
    }


    // V23: shorten the exposed veranda piers and replace floating plank treads with traditional solid timber steps.
    const traditionalFoundationMarker='LE-WEATHER-PAVILION-TRADITIONAL-STAIRS-PIERS-V3';
    if(updated.includes('LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2') && !updated.includes(traditionalFoundationMarker)){
      const pierReplacements=[
        ['box(house,dark,x,.73,z,.30,1.18,.30);','box(house,dark,x,.72,z,.30,.88,.30);'],
        ['box(house,dark,x,.73,0,.30,1.18,.30);','box(house,dark,x,.72,0,.30,.88,.30);']
      ];
      for(const [before,after] of pierReplacements){
        if(updated.includes(before)){updated=updated.replace(before,after);changed=true;}
      }
      const oldStairs=`    // Four slim, open-riser timber treads; each tread is a light 0.16-unit board.
    const entranceSteps=[{z:4.35,top:.34},{z:3.45,top:.68},{z:2.55,top:1.02},{z:1.65,top:1.36}];
    for(const step of entranceSteps){
      box(house,timber,0,step.top-.08,step.z,4.35,.16,.88);
      box(house,stepTop,0,step.top-.012,step.z,4.28,.024,.84);
    }`;
      const newStairs=`    // Four traditional solid timber risers with deep, overhanging treads.
    // Each step has a low vertical riser and a broad cap, creating a connected old-wood stair profile.
    const entranceSteps=[
      {z:4.20,front:.16,top:.34},
      {z:3.25,front:.48,top:.68},
      {z:2.30,front:.80,top:1.02},
      {z:1.35,front:1.12,top:1.36}
    ];
    for(const step of entranceSteps){
      box(house,timber,0,(step.front+step.top)/2,step.z,4.35,step.top-step.front,.98);
      box(house,deckPlank,0,step.top-.035,step.z+.035,4.48,.07,1.10);
      box(house,stepTop,0,step.top+.006,step.z+.035,4.38,.025,1.00);
    }`;
      if(updated.includes(oldStairs)){updated=updated.replace(oldStairs,newStairs);changed=true;}
      updated=updated.replace('LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2','LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2 '+traditionalFoundationMarker);
      changed=true;
    }

    if (!changed) return null;
    const hasFuji = updated.includes(`fujiGroup.userData.refinement='${fujiMarker}'`) &&
      updated.includes('fujiGroup.scale.y=.54') &&
      updated.includes('fujiGroup.position.set(3.75,6.048,-64)');
    const hasHills = updated.includes('LE-WEATHER-HILLS-REAR-RIDGE-LOWERED-V1') && updated.includes('createRollingRidge(-43,15,8.5,.4,hillMats[0])') && updated.includes('createRollingRidge(-36,14,10,1.8,hillMats[1])') && updated.includes('createRollingRidge(-29,12,7,3.1,hillMats[2])');
    const hasCamera = updated.includes(frontResize) && updated.includes(cameraMarker);
    const hasTrees = updated.includes('const treeLayout=');
    const hasHouseRotation = updated.includes('house.rotation.y=-15*Math.PI/180') && updated.includes('LE-WEATHER-PAVILION-ROTATION-CCW-15-V1');
    const hasControlsToggle = updated.includes('wx2-control-toggle') && updated.includes('wx2-controls-collapsed') && updated.includes('const controlsToggle=screen.querySelector') && updated.includes('.wx2-control-toggle{pointer-events:auto;position:absolute;');
    const hasRaisedFoundation = updated.includes('LE-WEATHER-PAVILION-RAISED-FOUNDATION-V1') && updated.includes('box(house,timber,0,1.50,0,7.8,.15,5.6)') && updated.includes('LE-WEATHER-PAVILION-SLIM-FOUNDATION-V2') && updated.includes('LE-WEATHER-PAVILION-TRADITIONAL-STAIRS-PIERS-V3') && updated.includes('const entranceSteps=[') && updated.includes('box(house,dark,x,.72,z,.30,.88,.30)') && updated.includes('step.top-step.front,.98)') && updated.includes('const entranceSteps=') && updated.includes('foundationStone') && updated.includes('deckPlank');
    if (!hasFuji || !hasHills || !hasCamera || !hasTrees || !hasHouseRotation || !hasControlsToggle || !hasRaisedFoundation ||
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
        console.error('[LIVE // EARTH] Weather V23 traditional stair and pier refinement transform did not match; original Weather response preserved.');
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
