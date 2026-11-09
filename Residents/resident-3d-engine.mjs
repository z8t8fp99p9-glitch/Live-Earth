/* LIVE // EARTH — Procedural Residents 3D Engine
   Small articulated mesh characters. No model downloads, video or extra renderer library. */
import * as THREE from '../vendor/three.module.js';

const COLORS = {
  skin: 0xf0bd99, hair: 0x49352f, darkHair: 0x372d2d,
  red: 0xb84238, redDark: 0x7e302d, denim: 0x537ca7,
  blue: 0x536e9a, navy: 0x324b70, cream: 0xf1e8d9,
  pants: 0x46536a, boots: 0x76513c, sole: 0xf3e9d9,
  brown: 0x784f38, gold: 0xf0c66c
};

function material(color, roughness = 0.78, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function sphere(parent, color, position, scale, options = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, options.segments || 20, options.rings || 14), material(color, options.roughness ?? 0.8, options.metalness ?? 0));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}
function box(parent, color, position, scale, radius = 0.06) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...scale), material(color));
  mesh.position.set(...position);
  mesh.userData.rounding = radius;
  parent.add(mesh);
  return mesh;
}
function tube(parent, points, color, radius = 0.018) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), material(color));
  parent.add(mesh);
  return mesh;
}
function segment(parent, color, start, length, width, depth = width) {
  return sphere(parent, color, [0, -length / 2, 0], [width, length / 2, depth]);
}
function joint(parent, position) {
  const group = new THREE.Group();
  group.position.set(...position);
  parent.add(group);
  return group;
}

function createFace(head, person) {
  const eyeGroups = [];
  for (const x of [-0.105, 0.105]) {
    const eye = joint(head, [x, 0.025, 0.248]);
    sphere(eye, 0xfffdf7, [0, 0, 0], [0.065, 0.083, 0.035], { segments: 16, rings: 12 });
    sphere(eye, 0x4a3027, [0.008, -0.006, 0.031], [0.033, 0.047, 0.018], { segments: 14, rings: 10 });
    sphere(eye, 0xffffff, [-0.005, 0.017, 0.047], [0.012, 0.016, 0.008], { segments: 10, rings: 8 });
    eyeGroups.push(eye);
    tube(head, [[x - 0.055, 0.13, 0.26], [x, 0.15, 0.275], [x + 0.05, 0.13, 0.26]], COLORS.darkHair, 0.012);
    sphere(head, 0xe98981, [x * 1.9, -0.105, 0.235], [0.052, 0.028, 0.012], { segments: 12, rings: 8 });
  }
  sphere(head, 0xe6a88c, [0, -0.04, 0.28], [0.035, 0.027, 0.03], { segments: 12, rings: 8 });
  tube(head, [[-0.052, -0.17, 0.255], [-0.025, -0.195, 0.278], [0.015, -0.198, 0.28], [0.052, -0.17, 0.255]], 0x965b50, 0.012);
  if (person.id === 'red') {
    // Soft freckles, kept subtle at the small on-screen scale.
    for (const x of [-0.14, -0.11, 0.11, 0.14]) sphere(head, 0xb86e5f, [x, -0.095, 0.252], [0.008, 0.008, 0.006], { segments: 8, rings: 6 });
  }
  return eyeGroups;
}

function addHair(head, person) {
  const hair = person.id === 'blue' ? 0x493a35 : 0x49352f;
  sphere(head, hair, [0, 0.16, -0.015], [0.33, 0.235, 0.29]);
  if (person.id === 'lady') {
    // Wavy chestnut bob, longer around the cheeks and nape.
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      sphere(head, hair, [Math.cos(a) * 0.275, -0.015 + Math.sin(a) * 0.035, Math.sin(a) * 0.16 - 0.015], [0.085, 0.19, 0.09], { segments: 14, rings: 10 });
    }
    for (let i = 0; i < 5; i++) sphere(head, 0x62483a, [-0.18 + i * 0.085, 0.22 + Math.sin(i) * 0.025, 0.19], [0.105, 0.09, 0.11], { segments: 14, rings: 10 });
  } else {
    // Separate tousled curls create a sculpted 3D hair silhouette.
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2;
      const r = i % 3 === 0 ? 0.24 : 0.18;
      sphere(head, i % 4 === 0 ? 0x62483c : hair,
        [Math.cos(a) * r, 0.19 + Math.sin(i * 2.1) * 0.045, Math.sin(a) * 0.18],
        [0.105, 0.11, 0.09], { segments: 12, rings: 9 });
    }
    sphere(head, hair, [-0.12, 0.24, 0.19], [0.13, 0.12, 0.12]);
    sphere(head, hair, [0.015, 0.29, 0.17], [0.14, 0.095, 0.12]);
    sphere(head, 0x62483c, [0.15, 0.23, 0.16], [0.12, 0.09, 0.11]);
  }
}

function makeArm(root, side, sleeveColor, skinColor) {
  const shoulder = joint(root, [side * 0.30, 1.24, 0]);
  sphere(shoulder, sleeveColor, [side * 0.035, -0.10, 0], [0.115, 0.205, 0.12]);
  const elbow = joint(shoulder, [side * 0.04, -0.27, 0]);
  sphere(elbow, sleeveColor, [0, -0.12, 0], [0.082, 0.17, 0.085]);
  const wrist = joint(elbow, [0, -0.25, 0]);
  sphere(wrist, skinColor, [0, -0.045, 0.005], [0.067, 0.09, 0.068]);
  return { shoulder, elbow, wrist };
}

function makeLeg(root, side, pantsColor, shoeColor, soleColor) {
  const hip = joint(root, [side * 0.145, 0.58, 0]);
  sphere(hip, pantsColor, [0, -0.14, 0], [0.125, 0.205, 0.14]);
  const knee = joint(hip, [0, -0.27, 0]);
  sphere(knee, pantsColor, [0, -0.14, 0], [0.105, 0.18, 0.115]);
  sphere(knee, shoeColor, [0, -0.315, 0.055], [0.13, 0.085, 0.19]);
  sphere(knee, soleColor, [0, -0.365, 0.06], [0.135, 0.025, 0.195]);
  return { hip, knee };
}

function createUmbrella(parent, color) {
  const group = new THREE.Group();
  group.position.set(0, 2.12, 0.02);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), material(color));
  canopy.scale.y = 0.48;
  group.add(canopy);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 8), material(0xf3e8d4));
  stem.position.y = -0.18;
  group.add(stem);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), material(0xf3e8d4));
  hook.position.set(0, -0.5, 0);
  group.add(hook);
  group.visible = false;
  parent.add(group);
  return group;
}

function createAccessories(root, person) {
  const accessories = {};
  accessories.umbrella = createUmbrella(root, person.id === 'red' ? 0xe77f72 : 0x718fc7);
  accessories.hat = sphere(root, 0x7894bd, [0, 1.91, 0], [0.31, 0.16, 0.29]);
  accessories.hat.visible = false;
  accessories.hatPom = sphere(root, 0xffffff, [0, 2.055, 0], [0.065, 0.06, 0.065]);
  accessories.hatPom.visible = false;
  accessories.scarf = sphere(root, 0xd87875, [0, 1.23, 0.03], [0.31, 0.10, 0.22]);
  accessories.scarf.visible = false;
  accessories.fan = box(root, 0xf1d18e, [0.43, 1.22, 0.06], [0.25, 0.22, 0.035]);
  accessories.fan.visible = false;
  accessories.kite = new THREE.Group();
  const kiteBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), material(0xe77f72));
  kiteBody.scale.y = 1.25;
  accessories.kite.add(kiteBody);
  tube(accessories.kite, [[0, -0.2, 0], [0.06, -0.32, 0], [-0.04, -0.43, 0]], 0xffe2a1, 0.012);
  accessories.kite.position.set(0.65, 2.15, -0.12);
  accessories.kite.visible = false;
  root.add(accessories.kite);
  accessories.wateringCan = new THREE.Group();
  sphere(accessories.wateringCan, 0x8cc8be, [0, 0, 0], [0.15, 0.11, 0.1]);
  tube(accessories.wateringCan, [[0.08, 0, 0], [0.2, 0.02, 0], [0.27, 0.10, 0]], 0x8cc8be, 0.025);
  accessories.wateringCan.position.set(0.36, 0.85, 0.12);
  accessories.wateringCan.visible = false;
  root.add(accessories.wateringCan);
  return accessories;
}

function createCharacter(person) {
  const root = new THREE.Group();
  const parts = {};
  parts.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshBasicMaterial({ color: 0x173b4a, transparent: true, opacity: 0.18, depthWrite: false }));
  parts.shadow.rotation.x = -Math.PI / 2;
  parts.shadow.position.y = 0.012;
  root.add(parts.shadow);

  const shirt = person.id === 'red' ? COLORS.red : person.id === 'lady' ? COLORS.cream : COLORS.blue;
  const pants = COLORS.pants;
  const torso = sphere(root, shirt, [0, 1.03, 0], [0.31, 0.40, 0.22]);
  parts.torso = torso;
  if (person.id === 'red') {
    sphere(root, COLORS.redDark, [0, 1.28, -0.08], [0.25, 0.18, 0.16]);
    tube(root, [[-0.09, 1.28, 0.20], [-0.08, 1.12, 0.225]], 0xf5eee1, 0.009);
    tube(root, [[0.09, 1.28, 0.20], [0.08, 1.12, 0.225]], 0xf5eee1, 0.009);
  } else if (person.id === 'lady') {
    // Denim pinafore panel, skirt, shoulder straps and warm satchel.
    sphere(root, COLORS.denim, [0, 1.03, 0.12], [0.27, 0.30, 0.09]);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.43, 0.42, 20, 1), material(COLORS.denim));
    skirt.position.set(0, 0.67, 0);
    root.add(skirt);
    for (const x of [-0.15, 0.15]) {
      const strap = box(root, 0x41678f, [x, 1.31, 0.18], [0.075, 0.33, 0.045]);
      strap.rotation.z = x * -0.35;
      sphere(root, COLORS.gold, [x, 1.24, 0.224], [0.026, 0.026, 0.018], { segments: 10, rings: 8 });
    }
    tube(root, [[-0.17, 1.32, 0.17], [0, 1.20, 0.20], [0.17, 1.32, 0.17]], COLORS.cream, 0.035);
    const bag = box(root, COLORS.brown, [-0.36, 0.84, 0.16], [0.19, 0.18, 0.11]);
    bag.rotation.z = -0.2;
    tube(root, [[-0.27, 1.35, 0.19], [-0.24, 1.1, 0.22], [-0.36, 0.92, 0.2]], 0x9b704d, 0.025);
  } else {
    // Blue jacket over a light hoodie, plus a small Earth-colour badge.
    sphere(root, COLORS.navy, [0, 1.02, 0.10], [0.31, 0.39, 0.14]);
    sphere(root, COLORS.cream, [0, 1.10, 0.225], [0.12, 0.28, 0.035]);
    tube(root, [[-0.035, 1.28, 0.26], [-0.035, 0.93, 0.26]], 0xf4eadd, 0.012);
    sphere(root, 0xe2bb62, [0.22, 1.17, 0.23], [0.065, 0.065, 0.025]);
    sphere(root, 0x389f96, [0.22, 1.17, 0.255], [0.044, 0.044, 0.014]);
  }

  parts.arms = [makeArm(root, -1, person.id === 'red' ? COLORS.red : person.id === 'lady' ? COLORS.cream : COLORS.navy, COLORS.skin),
                makeArm(root, 1, person.id === 'red' ? COLORS.red : person.id === 'lady' ? COLORS.cream : COLORS.navy, COLORS.skin)];
  parts.legs = [makeLeg(root, -1, pants, person.id === 'lady' ? COLORS.boots : 0x59616f, COLORS.sole),
                makeLeg(root, 1, pants, person.id === 'lady' ? COLORS.boots : 0x59616f, COLORS.sole)];
  if (person.id === 'lady') {
    for (const leg of parts.legs) {
      sphere(leg.knee, COLORS.boots, [0, -0.31, 0.045], [0.13, 0.09, 0.19]);
      sphere(leg.knee, 0x9c6a43, [0, -0.29, 0.12], [0.085, 0.012, 0.015]);
    }
  }

  const headPivot = joint(root, [0, 1.61, 0]);
  parts.head = headPivot;
  sphere(headPivot, COLORS.skin, [0, 0, 0], [0.31, 0.35, 0.275]);
  addHair(headPivot, person);
  parts.eyes = createFace(headPivot, person);
  if (person.id === 'red') {
    // Hood rim sits behind the neck without hiding the face.
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 8, 20, Math.PI), material(COLORS.redDark));
    hood.position.set(0, 1.48, -0.06); hood.rotation.z = Math.PI;
    root.add(hood);
  }
  parts.accessories = createAccessories(root, person);
  parts.baseY = 0;
  parts.person = person;
  return { root, ...parts };
}

function createPropScene(scene) {
  const props = {};
  props.ball = sphere(scene, 0xf2c65f, [0, 0.26, 0.25], [0.12, 0.12, 0.12], { segments: 16, rings: 12 });
  props.ball.visible = false;
  props.butterfly = new THREE.Group();
  sphere(props.butterfly, 0xf6a3c9, [-0.08, 0, 0], [0.08, 0.12, 0.025]);
  sphere(props.butterfly, 0xf6a3c9, [0.08, 0, 0], [0.08, 0.12, 0.025]);
  sphere(props.butterfly, 0x4c465c, [0, 0, 0.025], [0.018, 0.095, 0.02]);
  props.butterfly.position.set(0.15, 2.1, 0.4);
  scene.add(props.butterfly);
  props.picnic = new THREE.Group();
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.62), material(0xc86f69));
  blanket.position.set(0, 0.03, 0);
  props.picnic.add(blanket);
  sphere(props.picnic, 0xf2c75f, [-0.2, 0.12, 0], [0.09, 0.09, 0.09]);
  sphere(props.picnic, 0x8ab9a6, [0.16, 0.12, 0.03], [0.11, 0.08, 0.09]);
  props.picnic.position.set(0, 0, -0.2);
  props.picnic.visible = false;
  scene.add(props.picnic);
  props.tent = new THREE.Group();
  const tent = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.8, 3), material(0x728ba7));
  tent.rotation.y = Math.PI / 2; tent.position.set(0, 0.42, -0.1); props.tent.add(tent);
  tube(props.tent, [[0, 0.02, 0.22], [0, 0.48, -0.1], [0, 0.02, -0.42]], 0xf1d8a8, 0.018);
  props.tent.position.set(0, 0, -0.1); props.tent.visible = false; scene.add(props.tent);
  props.fire = new THREE.Group();
  sphere(props.fire, 0xffbd63, [0, 0.16, 0], [0.12, 0.22, 0.12]);
  sphere(props.fire, 0xffe6a1, [0, 0.21, 0.05], [0.065, 0.14, 0.07]);
  props.fire.position.set(0.72, 0, 0.1); props.fire.visible = false; scene.add(props.fire);
  props.confetti = [];
  for (let i = 0; i < 16; i++) {
    const confetti = sphere(scene, [0xf1cf75,0xef8e83,0x8acfc0,0x9faee4][i % 4], [0, 0, 0], [0.025, 0.045, 0.018], { segments: 8, rings: 6 });
    confetti.visible = false;
    props.confetti.push(confetti);
  }
  return props;
}

function setVisibleProps(actors, props, mode) {
  props.ball.visible = mode === 'play';
  props.butterfly.visible = mode === 'morning';
  props.picnic.visible = mode === 'picnic';
  props.tent.visible = mode === 'camping';
  props.fire.visible = mode === 'camping';
  props.confetti.forEach(item => { item.visible = mode === 'festival'; });
  for (const actor of actors) {
    const a = actor.accessories;
    a.umbrella.visible = mode === 'rain' && actor.person.id !== 'lady';
    a.hat.visible = mode === 'snow';
    a.hatPom.visible = mode === 'snow';
    a.scarf.visible = mode === 'snow';
    a.fan.visible = mode === 'heat' && actor.person.id === 'lady';
    a.kite.visible = mode === 'kite' && actor.person.id === 'blue';
    a.wateringCan.visible = mode === 'garden' && actor.person.id === 'lady';
  }
}

function basePose(actor) {
  for (const arm of actor.arms) { arm.shoulder.rotation.set(0, 0, 0); arm.elbow.rotation.set(0, 0, 0); }
  for (const leg of actor.legs) { leg.hip.rotation.set(0, 0, 0); leg.knee.rotation.set(0, 0, 0); }
  actor.root.rotation.set(0, 0, 0);
  actor.root.position.y = 0;
  actor.root.position.x = actor.baseX || 0;
  actor.head.rotation.set(0, 0, 0);
  actor.torso.scale.y = actor.person.id === 'lady' ? 0.40 : 0.40;
}

function poseActor(actor, mode, time, index, state) {
  const phase = time * 2.8 + index * 1.35;
  const wave = Math.sin(phase);
  const left = actor.arms[0], right = actor.arms[1];
  if (mode === 'calm') {
    actor.torso.scale.y = 0.40 + Math.sin(time * 2.1 + index) * 0.012;
    actor.head.rotation.z = Math.sin(time * 0.8 + index * 1.7) * 0.035;
    left.shoulder.rotation.z = -0.05 + wave * 0.025;
    right.shoulder.rotation.z = 0.05 - wave * 0.025;
  } else if (mode === 'morning') {
    if (actor.person.id === 'red') {
      actor.root.position.y = Math.max(0, Math.sin(time * 7) * 0.14 + 0.06);
      left.shoulder.rotation.z = -0.8 + Math.sin(time * 7) * 0.18;
      right.shoulder.rotation.z = 0.8 - Math.sin(time * 7) * 0.18;
      actor.legs[0].hip.rotation.x = wave * 0.5;
      actor.legs[1].hip.rotation.x = -wave * 0.5;
    } else if (actor.person.id === 'lady') {
      actor.root.position.x = actor.baseX + Math.sin(time * 1.7) * 0.07;
      actor.head.rotation.y = Math.sin(time * 1.8) * 0.35;
      right.shoulder.rotation.z = 1.0 + Math.sin(time * 3) * 0.18;
      left.shoulder.rotation.z = -0.45;
      actor.legs[0].hip.rotation.x = Math.max(0, wave) * 0.45;
      actor.legs[1].hip.rotation.x = -Math.max(0, -wave) * 0.45;
    } else {
      actor.root.rotation.z = Math.sin(time * 1.7) * 0.09;
      left.shoulder.rotation.z = -1.35;
      right.shoulder.rotation.z = 0.28;
      actor.head.rotation.z = -0.08;
    }
  } else if (mode === 'play' || mode === 'walk') {
    const speed = mode === 'play' ? 5.6 : 3.8;
    actor.root.position.y = Math.abs(Math.sin(time * speed + index)) * (mode === 'play' ? 0.09 : 0.035);
    actor.legs[0].hip.rotation.x = Math.sin(time * speed + index) * 0.48;
    actor.legs[1].hip.rotation.x = -Math.sin(time * speed + index) * 0.48;
    left.shoulder.rotation.x = -actor.legs[0].hip.rotation.x * 0.72;
    right.shoulder.rotation.x = -actor.legs[1].hip.rotation.x * 0.72;
    if (mode === 'play') actor.head.rotation.y = Math.sin(time * 2.4 + index) * 0.22;
  } else if (mode === 'rain') {
    if (actor.person.id === 'lady') {
      left.shoulder.rotation.z = -0.95 + Math.sin(time * 3.2) * 0.2;
      right.shoulder.rotation.z = 0.95 - Math.sin(time * 3.2) * 0.2;
      actor.root.rotation.z = Math.sin(time * 2.8) * 0.12;
      actor.root.position.y = Math.max(0, Math.sin(time * 5) * 0.055);
    } else {
      left.shoulder.rotation.z = -0.22;
      right.shoulder.rotation.z = 0.22;
      actor.head.rotation.z = Math.sin(time * 1.3 + index) * 0.04;
    }
  } else if (mode === 'snow') {
    actor.root.rotation.z = Math.sin(time * 19 + index) * 0.035;
    actor.head.rotation.z = Math.sin(time * 17 + index) * 0.025;
    left.shoulder.rotation.z = -0.32 + Math.sin(time * 4 + index) * 0.08;
    right.shoulder.rotation.z = 0.32 - Math.sin(time * 4 + index) * 0.08;
  } else if (mode === 'heat') {
    left.shoulder.rotation.z = -0.2;
    right.shoulder.rotation.z = actor.person.id === 'lady' ? 0.85 + Math.sin(time * 7) * 0.1 : 0.12;
    actor.head.rotation.z = Math.sin(time * 1.5 + index) * 0.035;
  } else if (mode === 'wind') {
    const gust = state.gustLevel === 'strong' ? 1 : 0.45;
    actor.root.rotation.z = -0.18 * gust;
    actor.root.position.x = actor.baseX + Math.sin(time * 2.2 + index) * 0.10 * gust;
    left.shoulder.rotation.z = -0.85 * gust;
    right.shoulder.rotation.z = 0.35 * gust;
    if (actor.person.id === 'blue' && state.gustLevel === 'strong') actor.root.position.y = Math.max(0, Math.sin(time * 4) * 0.10);
  } else if (mode === 'stargaze') {
    actor.head.rotation.x = -0.24;
    actor.head.rotation.z = Math.sin(time * 0.5 + index) * 0.035;
    left.shoulder.rotation.z = -0.1;
    right.shoulder.rotation.z = 0.1;
  } else if (mode === 'kite') {
    left.shoulder.rotation.z = -0.9;
    right.shoulder.rotation.z = 0.55;
    actor.head.rotation.y = -0.22 + Math.sin(time * 1.5) * 0.08;
    actor.accessories.kite.position.y = 2.12 + Math.sin(time * 2.2) * 0.13;
  } else if (mode === 'garden') {
    right.shoulder.rotation.z = 0.85 + Math.sin(time * 3.4) * 0.14;
    actor.head.rotation.x = 0.14;
  } else if (mode === 'festival') {
    actor.root.position.y = Math.max(0, Math.sin(time * 6 + index) * 0.12);
    actor.root.rotation.z = Math.sin(time * 3.2 + index) * 0.13;
    left.shoulder.rotation.z = -1.0 + Math.sin(time * 5 + index) * 0.2;
    right.shoulder.rotation.z = 1.0 - Math.sin(time * 5 + index) * 0.2;
    actor.legs[0].hip.rotation.x = wave * 0.35;
    actor.legs[1].hip.rotation.x = -wave * 0.35;
  } else if (mode === 'picnic') {
    actor.root.rotation.x = -0.10;
    actor.head.rotation.x = 0.12;
    left.shoulder.rotation.z = -0.22;
    right.shoulder.rotation.z = 0.22;
  } else if (mode === 'camping') {
    actor.head.rotation.x = -0.12;
    left.shoulder.rotation.z = -0.18;
    right.shoulder.rotation.z = 0.18;
  }
}

export function createResidents3D(canvas, roster, initialState = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.2, 2.2, 1.15, -1.15, 0.1, 40);
  camera.position.set(0, 1.1, 8);
  camera.lookAt(0, 1.03, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x48665d, 2.15));
  const key = new THREE.DirectionalLight(0xffe7cf, 2.0);
  key.position.set(-3.5, 5, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9dcff, 0.75);
  fill.position.set(4, 2, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd7a1, 1.2);
  rim.position.set(0, 3, -3); scene.add(rim);

  const actors = roster.map(person => createCharacter(person));
  actors.forEach(actor => scene.add(actor.root));
  const props = createPropScene(scene);
  let mode = initialState.mode || 'calm';
  let state = { ...initialState };
  let alive = true;
  let frame = 0;
  let lastRender = 0;
  let elapsed = 0;
  let width = 0, height = 0;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const resize = () => {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w; height = h;
    const aspect = w / h;
    const halfHeight = 1.16;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    const spacing = Math.min(1.28, Math.max(0.50, aspect * 0.70));
    actors[0].baseX = -spacing;
    actors[1].baseX = 0;
    actors[2].baseX = spacing;
    actors.forEach(actor => { actor.root.position.x = actor.baseX; });
    renderer.setSize(w, h, false);
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  resize();

  function setActivity(nextState = {}) {
    mode = String(nextState.mode || 'calm');
    state = { ...nextState };
    setVisibleProps(actors, props, mode);
    return true;
  }
  setActivity(state);

  function animate(now) {
    if (!alive) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    // 30 fps is ample for the small scene and lowers mobile GPU/battery cost.
    if (now - lastRender < 32) return;
    const dt = Math.min(0.06, (now - (lastRender || now)) / 1000);
    lastRender = now;
    elapsed += dt * (reducedMotion ? 0.32 : 1);
    actors.forEach((actor, i) => {
      basePose(actor);
      poseActor(actor, mode, elapsed, i, state);
      const blinkPulse = Math.max(0, Math.sin((elapsed * 0.62 + i * 0.31) * Math.PI * 2));
      const blink = Math.pow(blinkPulse, 34);
      actor.eyes.forEach(eye => { eye.scale.y = Math.max(0.12, 1 - blink * 0.9); });
      actor.accessories.kite.position.x = mode === 'kite' ? 0.65 + Math.sin(elapsed * 1.4) * 0.13 : 0.65;
    });
    props.ball.position.set(Math.sin(elapsed * 2.1) * 0.85, 0.24 + Math.abs(Math.sin(elapsed * 4.2)) * 0.45, 0.2);
    props.butterfly.position.set(0.15 + Math.sin(elapsed * 1.6) * 0.28, 2.05 + Math.sin(elapsed * 2.7) * 0.17, 0.42);
    props.butterfly.rotation.z = Math.sin(elapsed * 4) * 0.25;
    props.picnic.rotation.y = Math.sin(elapsed * 0.4) * 0.025;
    props.fire.scale.y = 1 + Math.sin(elapsed * 7) * 0.12;
    props.confetti.forEach((item, i) => {
      item.position.set(Math.sin(elapsed * 0.7 + i * 1.9) * (0.45 + i % 3 * 0.22),
        1.05 + ((elapsed * 0.45 + i * 0.19) % 1.15), 0.15 - (i % 3) * 0.12);
      item.rotation.z = elapsed * (i % 2 ? 1.8 : -1.5);
    });
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);

  return Object.freeze({
    setActivity,
    dispose() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(item => item.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss?.();
    }
  });
}
