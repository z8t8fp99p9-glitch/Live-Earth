/* LIVE // EARTH — Living Topography Stage 0 visual prototype.
   Standalone by design: no production Weather replacement, live data request,
   geolocation access, storage write, or dependency download is performed here. */
import * as THREE from '../../vendor/three.module.js';

(() => {
  'use strict';

  const canvas = document.getElementById('world');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 600;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    document.body.innerHTML = '<main style="min-height:100%;display:grid;place-items:center;padding:32px;text-align:center;background:linear-gradient(155deg,#213b3b,#789681 58%,#c6c4a1);color:#f3f8ed;font:14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><div><strong style="letter-spacing:.2em">LIVE // EARTH</strong><h1>Living Topography</h1><p>3D rendering is unavailable on this device or browser.</p><p style="opacity:.75;font-size:12px">The prototype has not changed any app data.</p></div></main>';
    console.warn('[LIVE // EARTH] WebGL unavailable for the Weather visual prototype.', error);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9bbab2');
  scene.fog = new THREE.FogExp2('#a9c4b8', 0.012);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 90);
  camera.position.set(0.2, 12.4, 23.5);
  camera.lookAt(0, 2.15, -1.7);

  const hemisphere = new THREE.HemisphereLight('#e9f6e5', '#344b3f', 1.25);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#fff0cb', 2.6);
  sun.position.set(-9, 17, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isSmall ? 768 : 1024, isSmall ? 768 : 1024);
  sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);

  const world = new THREE.Group();
  scene.add(world);
  const WORLD_SIZE = 26;
  const HALF = WORLD_SIZE / 2;
  const GRID = isSmall ? 104 : 132;
  const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const gaussian = (x, z, cx, cz, sx, sz, height) => height * Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((z - cz) ** 2) / (2 * sz * sz)));

  function heightAt(x, z) {
    const ridge =
      gaussian(x, z, -6.2, -7.0, 2.2, 3.1, 5.3) +
      gaussian(x, z, -1.8, -8.8, 2.3, 3.0, 6.0) +
      gaussian(x, z, 3.1, -7.3, 2.8, 3.4, 4.7) +
      gaussian(x, z, 7.2, -3.9, 2.0, 3.7, 3.7) +
      gaussian(x, z, -9.0, -1.0, 2.0, 4.0, 2.4);
    const rolling = 0.48 * Math.sin(x * 0.48 + z * 0.19) + 0.25 * Math.cos(z * 0.62 - x * 0.17) + 0.14 * Math.sin((x + z) * 0.92);
    const valleyX = 2.2 * Math.sin(z * 0.28) - 0.3;
    const valley = 1.0 * Math.exp(-((x - valleyX) ** 2) / 2.0) * smooth(-12, 5, z);
    const edgeFade = 0.92 + 0.08 * Math.cos((x / HALF) * Math.PI * 0.5) * Math.cos((z / HALF) * Math.PI * 0.5);
    return Math.max(-0.2, (0.45 + ridge + rolling - valley) * edgeFade);
  }

  const terrainGeometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, GRID, GRID);
  terrainGeometry.rotateX(-Math.PI / 2);
  const positions = terrainGeometry.attributes.position;
  const colors = [];
  const colorGrass = new THREE.Color('#66896a');
  const colorMeadow = new THREE.Color('#91a978');
  const colorRock = new THREE.Color('#777d70');
  const colorSnow = new THREE.Color('#d8dfd1');
  const colorWet = new THREE.Color('#456f67');
  const tmpColor = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const y = heightAt(x, z);
    positions.setY(i, y);
    const slopeNoise = Math.abs(Math.sin(x * 0.75) * Math.cos(z * 0.63));
    const meadowMix = smooth(0.1, 2.2, y);
    tmpColor.copy(colorGrass).lerp(colorMeadow, meadowMix * 0.82);
    if (y > 3.1) tmpColor.lerp(colorRock, smooth(3.0, 4.8, y) * 0.85);
    if (y > 4.9) tmpColor.lerp(colorSnow, smooth(4.9, 6.0, y) * 0.88);
    tmpColor.lerp(colorWet, smooth(0.45, 0.0, Math.abs(x - (2.2 * Math.sin(z * 0.28) - 0.3))) * 0.42);
    tmpColor.multiplyScalar(0.94 + slopeNoise * 0.09);
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
  }
  terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeometry.computeVertexNormals();
  const terrainMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.02 });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  world.add(terrain);

  // A quiet deep-earth foundation fills the lower field without a floating-island rim.
  const earthBase = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: '#344b3b', roughness: 1 })
  );
  earthBase.rotation.x = -Math.PI / 2;
  earthBase.position.y = -0.35;
  earthBase.position.z = 0;
  earthBase.receiveShadow = true;
  world.add(earthBase);

  // True elevation contours are sampled from the same height field as the terrain.
  function buildContours() {
    const points = [];
    const steps = 64;
    const levels = [1.15, 1.75, 2.35, 2.95, 3.55, 4.15, 4.75, 5.35];
    const edges = [[0,1],[1,2],[2,3],[3,0]];
    for (const level of levels) {
      for (let iz = 0; iz < steps; iz++) {
        const z0 = -HALF + (iz / steps) * WORLD_SIZE;
        const z1 = -HALF + ((iz + 1) / steps) * WORLD_SIZE;
        for (let ix = 0; ix < steps; ix++) {
          const x0 = -HALF + (ix / steps) * WORLD_SIZE;
          const x1 = -HALF + ((ix + 1) / steps) * WORLD_SIZE;
          const corners = [
            [x0,z0,heightAt(x0,z0)],[x1,z0,heightAt(x1,z0)],
            [x1,z1,heightAt(x1,z1)],[x0,z1,heightAt(x0,z1)]
          ];
          const intersections = [];
          for (const [a,b] of edges) {
            const va = corners[a][2] - level, vb = corners[b][2] - level;
            if ((va < 0 && vb >= 0) || (va >= 0 && vb < 0)) {
              const t = va / (va - vb);
              intersections.push([
                THREE.MathUtils.lerp(corners[a][0],corners[b][0],t),
                THREE.MathUtils.lerp(corners[a][1],corners[b][1],t)
              ]);
            }
          }
          if (intersections.length === 2) {
            for (const p of intersections) points.push(p[0], heightAt(p[0],p[1]) + 0.035, p[1]);
          } else if (intersections.length === 4) {
            for (const idx of [0,1,2,3]) { const p = intersections[idx]; points.push(p[0],heightAt(p[0],p[1])+0.035,p[1]); }
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#d4e5bc', transparent: true, opacity: 0.23, depthWrite: false }));
    lines.renderOrder = 2;
    world.add(lines);
  }
  buildContours();

  // River follows the sculpted valley and widens toward the viewer.
  const riverPoints = [];
  for (let i = 0; i <= 70; i++) {
    const z = THREE.MathUtils.lerp(-12.4, 12.0, i / 70);
    const x = 2.2 * Math.sin(z * 0.28) - 0.3;
    riverPoints.push(new THREE.Vector3(x, heightAt(x,z) + 0.055, z));
  }
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
  const riverVerts = [], riverIndices = [], riverUvs = [];
  const riverSegments = 220;
  for (let i = 0; i <= riverSegments; i++) {
    const t = i / riverSegments;
    const point = riverCurve.getPoint(t);
    const tangent = riverCurve.getTangent(t);
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const width = 0.22 + 0.36 * smooth(0.15, 1, t);
    for (const sign of [-1,1]) {
      const p = point.clone().addScaledVector(side, sign * width);
      p.y = heightAt(p.x,p.z) + 0.075;
      riverVerts.push(p.x,p.y,p.z);
      riverUvs.push(0,t);
    }
    if (i < riverSegments) { const a=i*2,b=a+1,c=a+2,d=a+3; riverIndices.push(a,c,b,b,c,d); }
  }
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverVerts,3));
  riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(riverUvs,2));
  riverGeometry.setIndex(riverIndices);
  riverGeometry.computeVertexNormals();
  const riverMaterial = new THREE.MeshPhysicalMaterial({ color:'#75b8b0', roughness:0.18, metalness:0.12, clearcoat:0.9, clearcoatRoughness:0.12, transparent:true, opacity:0.88 });
  const river = new THREE.Mesh(riverGeometry,riverMaterial);
  river.receiveShadow = true;
  world.add(river);

  // Small cascade at the lower valley lip; it remains part of the same terrain.
  const fallGeometry = new THREE.PlaneGeometry(0.72, 1.1, 1, 12);
  const fallMaterial = new THREE.MeshPhysicalMaterial({ color:'#b7e4db', transparent:true, opacity:0.7, roughness:0.12, metalness:0.08, side:THREE.DoubleSide, depthWrite:false });
  const waterfall = new THREE.Mesh(fallGeometry,fallMaterial);
  waterfall.position.set(1.0,0.58,8.0);
  waterfall.rotation.x = -0.22;
  world.add(waterfall);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.0,40), new THREE.MeshPhysicalMaterial({color:'#76b7ad',roughness:0.16,metalness:0.1,clearcoat:1,transparent:true,opacity:0.7}));
  pool.rotation.x = -Math.PI/2; pool.position.set(1.0,0.14,8.75); world.add(pool);

  // Dense but instanced vegetation gives the terrain scale without hundreds of draw calls.
  const treeCount = isSmall ? 360 : 620;
  const trunkGeometry = new THREE.CylinderGeometry(0.035,0.06,0.7,5);
  const crownGeometry = new THREE.ConeGeometry(0.36,1.2,6,2);
  const trunkMaterial = new THREE.MeshStandardMaterial({color:'#5c4935',roughness:1});
  const crownMaterial = new THREE.MeshStandardMaterial({color:'#355f49',roughness:0.92,flatShading:true});
  const trunks = new THREE.InstancedMesh(trunkGeometry,trunkMaterial,treeCount);
  const crowns = new THREE.InstancedMesh(crownGeometry,crownMaterial,treeCount);
  trunks.castShadow = crowns.castShadow = true;
  trunks.receiveShadow = crowns.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let seed = 1847;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let treeIndex = 0;
  for (let tries = 0; tries < treeCount * 8 && treeIndex < treeCount; tries++) {
    const x = (rand() - 0.5) * 23.5;
    const z = (rand() - 0.5) * 22.5;
    const y = heightAt(x,z);
    const riverX = 2.2 * Math.sin(z * 0.28) - 0.3;
    if (y < 0.35 || y > 3.1 || Math.abs(x-riverX) < 1.05 || rand() < 0.16) continue;
    const scale = 0.62 + rand() * 0.72;
    dummy.position.set(x,y+0.34*scale,z); dummy.rotation.set(0,rand()*Math.PI*2,0); dummy.scale.setScalar(scale); dummy.updateMatrix(); trunks.setMatrixAt(treeIndex,dummy.matrix);
    dummy.position.set(x,y+0.95*scale,z); dummy.rotation.set(0,rand()*Math.PI*2,0); dummy.scale.set(scale,scale*(0.82+rand()*0.42),scale); dummy.updateMatrix(); crowns.setMatrixAt(treeIndex,dummy.matrix);
    const shade = new THREE.Color().setHSL(0.31 + rand()*0.055,0.27+rand()*0.18,0.25+rand()*0.12);
    crowns.setColorAt(treeIndex,shade);
    treeIndex++;
  }
  trunks.count = crowns.count = treeIndex;
  trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  world.add(trunks,crowns);

  // Independent volumetric cloud forms: clustered soft ellipsoids, not flat icons.
  const cloudMaterial = new THREE.MeshStandardMaterial({color:'#f3f7ec',roughness:0.9,metalness:0,transparent:true,opacity:0.93});
  const cloudGeometry = new THREE.SphereGeometry(1,16,12);
  const clouds = [];
  function addCloud(x,y,z,scale,drift,seedOffset=0) {
    const group = new THREE.Group(); group.position.set(x,y,z); group.userData.drift = drift;
    const puffCount = 7;
    for (let i=0;i<puffCount;i++) {
      const angle = (i/puffCount)*Math.PI*2 + seedOffset;
      const puff = new THREE.Mesh(cloudGeometry,cloudMaterial);
      const r = i===0 ? 0 : 0.62 + (i%3)*0.08;
      puff.position.set(Math.cos(angle)*r*scale*0.8,(i%3)*0.13*scale,Math.sin(angle)*r*scale*0.48);
      puff.scale.set(scale*(0.68+(i%3)*0.13),scale*(0.44+(i%2)*0.12),scale*(0.55+(i%2)*0.12));
      puff.castShadow = true; puff.receiveShadow = true; group.add(puff);
    }
    clouds.push(group); scene.add(group); return group;
  }
  addCloud(-5.4,7.0,-4.8,1.55,0.12,0.2);
  addCloud(1.7,8.6,-8.0,1.2,-0.08,1.4);
  addCloud(6.1,6.6,-2.2,1.72,0.09,0.8);
  addCloud(-1.8,6.2,3.5,0.84,-0.06,2.1);

  // A sparse mist ribbon gives distance depth without obscuring the terrain.
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(34,4),new THREE.MeshBasicMaterial({color:'#e1eee0',transparent:true,opacity:0.13,depthWrite:false,side:THREE.DoubleSide}));
  mist.position.set(0,3.0,-10.2); mist.rotation.x = -0.08; scene.add(mist);

  // Weather particles are lightweight and only illustrative in this Stage 0 demo.
  const particleCount = isSmall ? 280 : 420;
  const particlePositions = new Float32Array(particleCount*3);
  const particleSpeeds = new Float32Array(particleCount);
  for (let i=0;i<particleCount;i++) {
    particlePositions[i*3] = (rand()-0.5)*27;
    particlePositions[i*3+1] = rand()*16;
    particlePositions[i*3+2] = (rand()-0.5)*27;
    particleSpeeds[i] = 0.04 + rand()*0.08;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
  const particles = new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:'#e8f5f1',size:0.055,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true}));
  scene.add(particles);

  const atmosphere = {
    clear:{sky:'#a8c6bd',fog:'#a9c4b8',fogDensity:0.012,cloudOpacity:0.72,light:2.6,particleOpacity:0,cloudScale:1},
    cloudy:{sky:'#90a9a8',fog:'#9caeaa',fogDensity:0.014,cloudOpacity:1,light:1.75,particleOpacity:0,cloudScale:1.16},
    rain:{sky:'#536f79',fog:'#738b88',fogDensity:0.019,cloudOpacity:1,light:1.05,particleOpacity:0.66,cloudScale:1.22},
    snow:{sky:'#aebfc0',fog:'#b8c7c2',fogDensity:0.016,cloudOpacity:0.9,light:1.65,particleOpacity:0.78,cloudScale:1.06},
    fog:{sky:'#b6c3b7',fog:'#c1ccc0',fogDensity:0.035,cloudOpacity:0.8,light:1.15,particleOpacity:0.12,cloudScale:1.1}
  };
  let activeWeather = 'clear';
  let targetSky = new THREE.Color(atmosphere.clear.sky);
  let targetFog = new THREE.Color(atmosphere.clear.fog);
  let targetAtmosphere = atmosphere.clear;
  let animationFrame = 0;
  let lastFrame = 0;
  let elapsed = 0;
  function setWeather(kind) {
    const state = atmosphere[kind] || atmosphere.clear;
    activeWeather = kind;
    targetSky.set(state.sky);
    targetFog.set(state.fog);
    targetAtmosphere = state;
    particles.material.size = kind==='rain' ? 0.038 : 0.065;
    particles.material.color.set(kind==='rain'?'#c5e8f1':'#f6fff9');
    document.querySelectorAll('.morph-button[data-weather]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.weather===kind)));
    if(reducedMotion) {
      scene.background.copy(targetSky); scene.fog.color.copy(targetFog); scene.fog.density=state.fogDensity;
      sun.intensity=state.light; cloudMaterial.opacity=state.cloudOpacity; particles.material.opacity=state.particleOpacity;
      clouds.forEach((cloud,index)=>cloud.scale.setScalar(state.cloudScale*(0.96+index*0.015)));
      renderer.render(scene,camera);
    }
    const copy = {
      clear:['24°','Clear skies','Warm natural light'],
      cloudy:['23°','Cloud layers','Independent cloud volumes'],
      rain:['19°','Rainfall','Water response · soft storm light'],
      snow:['2°','Snowfall','Cool atmosphere · drifting particles'],
      fog:['16°','Valley mist','Layered depth · diffused light']
    }[kind];
    document.getElementById('temperature').textContent = copy[0];
    document.getElementById('condition').textContent = copy[1];
    document.getElementById('weatherDetail').innerHTML = `${copy[2]}<br>Simulated visual state`;
    document.getElementById('morphLabel').textContent = `${kind} · fluid transition`;
    document.querySelector('.sky-wash').style.background = kind==='rain'||kind==='fog'
      ? 'linear-gradient(180deg,rgba(21,49,61,.48),rgba(28,55,57,.12) 48%,rgba(7,23,26,.35))'
      : 'linear-gradient(180deg,rgba(21,49,61,.27),transparent 29%,transparent 66%,rgba(7,23,26,.25))';
  }
  document.querySelectorAll('.morph-button').forEach(button=>button.addEventListener('click',()=>setWeather(button.dataset.weather)));

  function resize() {
    const width = window.innerWidth, height = window.innerHeight;
    camera.aspect = width/height; camera.fov = width < height ? 36 : 31; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.setSize(width,height,false);
  }
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('orientationchange',resize,{passive:true});
  const visibility = () => { if(document.hidden){cancelAnimationFrame(animationFrame);animationFrame=0;} else if(!reducedMotion && !animationFrame){lastFrame=0;animationFrame=requestAnimationFrame(render);} };
  document.addEventListener('visibilitychange',visibility);

  const clock = new THREE.Clock();
  function render(now=0) {
    if(document.hidden)return;
    animationFrame=requestAnimationFrame(render);
    if(reducedMotion){if(!animationFrame)animationFrame=1;renderer.render(scene,camera);return;}
    const delta=Math.min(clock.getDelta(),0.045);
    elapsed+=delta;
    const morph = 1 - Math.exp(-delta * 1.45);
    scene.background.lerp(targetSky,morph);
    scene.fog.color.lerp(targetFog,morph);
    scene.fog.density = THREE.MathUtils.lerp(scene.fog.density,targetAtmosphere.fogDensity,morph);
    sun.intensity = THREE.MathUtils.lerp(sun.intensity,targetAtmosphere.light,morph);
    cloudMaterial.opacity = THREE.MathUtils.lerp(cloudMaterial.opacity,targetAtmosphere.cloudOpacity,morph);
    particles.material.opacity = THREE.MathUtils.lerp(particles.material.opacity,targetAtmosphere.particleOpacity,morph);
    clouds.forEach((cloud,index)=>{ const s=targetAtmosphere.cloudScale*(0.96+index*0.015); cloud.scale.setScalar(THREE.MathUtils.lerp(cloud.scale.x,s,morph)); });
    if(now-lastFrame<1000/30)return;
    lastFrame=now;
    clouds.forEach((cloud,index)=>{
      cloud.position.x+=cloud.userData.drift*delta*(activeWeather==='rain'?0.65:1);
      if(cloud.position.x>15)cloud.position.x=-15;
      if(cloud.position.x<-15)cloud.position.x=15;
      cloud.position.y+=Math.sin(elapsed*0.24+index)*0.0009;
    });
    if(activeWeather==='rain'||activeWeather==='snow'){
      const p=particleGeometry.attributes.position;
      for(let i=0;i<particleCount;i++){
        p.array[i*3+1]-=particleSpeeds[i]*(activeWeather==='rain'?2.1:0.8);
        p.array[i*3]+=activeWeather==='rain'?0.018:-0.008;
        if(p.array[i*3+1]<-0.4){p.array[i*3+1]=13+Math.random()*3;p.array[i*3]=(Math.random()-0.5)*27;}
      }
      p.needsUpdate=true;
    }
    riverMaterial.opacity=0.84+Math.sin(elapsed*1.1)*0.035;
    waterfall.rotation.z=Math.sin(elapsed*1.8)*0.012;
    renderer.render(scene,camera);
  }
  if(reducedMotion){renderer.render(scene,camera);}else{animationFrame=requestAnimationFrame(render);}

  // Release the GPU resources if this standalone preview is closed or navigated away.
  window.addEventListener('pagehide',()=>{
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize',resize);
    document.removeEventListener('visibilitychange',visibility);
    scene.traverse(object=>{
      if(object.geometry && object.geometry!==cloudGeometry) object.geometry.dispose();
      if(object.material && object.material!==cloudMaterial && !Array.isArray(object.material)) object.material.dispose();
    });
    cloudGeometry.dispose(); cloudMaterial.dispose(); renderer.dispose();
  },{once:true});
})();
