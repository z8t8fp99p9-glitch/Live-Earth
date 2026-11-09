/* LIVE // EARTH — Residents 3D Engine v1.1
   Refined procedural character models with articulated limbs, expressive faces,
   reusable materials and independent activity animation. Uses the app's existing
   same-origin Three.js runtime; no external models, textures or added libraries. */
import * as THREE from '../vendor/three.module.js';
import { createResidentsActivityFramework } from './resident-activity-framework.mjs';

const activityFramework = createResidentsActivityFramework();

const COLORS = {
  skin: 0xf0bd99, skinShade: 0xd99578, cheek: 0xe5a19a,
  hair: 0x49352f, hairLight: 0x735446, hairDark: 0x342927,
  red: 0xb84238, redDark: 0x87312d, redLight: 0xd45d51,
  denim: 0x537ca7, denimDark: 0x385e83, denimLight: 0x7399bd,
  blue: 0x536e9a, navy: 0x324b70, navyLight: 0x7189b1,
  cream: 0xf1e8d9, creamShade: 0xd7c9b6,
  pants: 0x46536a, pantsLight: 0x647087,
  boots: 0x76513c, bootLight: 0x9b704d, sole: 0xf3e9d9,
  brown: 0x784f38, gold: 0xf0c66c, eye: 0x4a3027, white: 0xfffdf7
};

const materialCache = new Map();
const skinMaterialCache = new Map();
const skinFaceMaterialCache = new Map();
const geometryCache = new Map();
function mat(color, roughness = 0.84, metalness = 0) {
  const key = `${color}:${roughness}:${metalness}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materialCache.get(key);
}
// Skin gets a very restrained clear-coat response: enough to catch soft
// highlights on cheeks and hands without making the characters look glossy.
function skinMat(color = COLORS.skin, roughness = 0.90) {
  const key = `${color}:${roughness}`;
  if (!skinMaterialCache.has(key)) {
    skinMaterialCache.set(key, new THREE.MeshPhysicalMaterial({
      color, roughness, metalness: 0, clearcoat: 0.045, clearcoatRoughness: 0.88
    }));
  }
  return skinMaterialCache.get(key);
}
// The face uses vertex-coloured skin so warmth is blended into the cheek
// planes instead of sitting on top as two separate pink discs.
function skinFaceMat(roughness = 0.90) {
  const key = `vertex-skin:${roughness}`;
  if (!skinFaceMaterialCache.has(key)) {
    skinFaceMaterialCache.set(key, new THREE.MeshPhysicalMaterial({
      color: 0xffffff, vertexColors: true, roughness, metalness: 0,
      clearcoat: 0.035, clearcoatRoughness: 0.90
    }));
  }
  return skinFaceMaterialCache.get(key);
}
function geometry(key, make) {
  if (!geometryCache.has(key)) geometryCache.set(key, make());
  return geometryCache.get(key);
}
const sphereGeometry = geometry('sphere-32x24', () => new THREE.SphereGeometry(1, 32, 24));

// One continuous scalp shell replaces the clustered bead-like hair base.
// The lower edge remains open so the forehead and side locks keep their shape.
const residentHairCapGeometry = geometry('resident-hair-cap-40x28', () =>
  new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, 2.20)
);

// A thin, softly flared shell gives the pinafore skirt a real hem and inner
// return instead of the flat cut edge of a simple cylinder.
const residentSkirtGeometry = geometry('resident-skirt-soft-hem-40', () => new THREE.LatheGeometry([
  new THREE.Vector2(0.255, 0.220),
  new THREE.Vector2(0.265, 0.165),
  new THREE.Vector2(0.305, -0.105),
  new THREE.Vector2(0.415, -0.220),
  new THREE.Vector2(0.405, -0.198),
  new THREE.Vector2(0.292, -0.092),
  new THREE.Vector2(0.252, 0.165)
], 40));

// A softly tapered jaw and fuller cheek plane give the head a more sculpted
// silhouette than a plain ellipsoid while preserving the established scale.
const residentHeadGeometry = geometry('resident-head-soft-jaw-32x24', () => {
  const shape = new THREE.SphereGeometry(1, 32, 24);
  const positions = shape.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const lowerFace = Math.max(0, -y - 0.02);
    const jawTaper = 1 - lowerFace * 0.12;
    const cheekFullness = 1 + 0.035 * Math.exp(-Math.pow((y + 0.10) / 0.28, 2));
    positions.setX(i, positions.getX(i) * jawTaper * cheekFullness);
    positions.setZ(i, positions.getZ(i) * (1 - lowerFace * 0.055));
  }
  positions.needsUpdate = true;
  // Gentle vertex blush follows the cheek planes and fades into the base skin.
  // It is intentionally low contrast so it reads as warmth beneath the skin,
  // not makeup painted onto the surface.
  const baseSkin = new THREE.Color(COLORS.skin);
  const cheekWarmth = new THREE.Color(COLORS.cheek);
  const vertexColors = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const frontFacing = Math.max(0, Math.min(1, (z - 0.18) / 0.72));
    const leftBlush = Math.exp(-1.55 * (((x + 0.43) / 0.28) ** 2 + ((y + 0.28) / 0.20) ** 2));
    const rightBlush = Math.exp(-1.55 * (((x - 0.43) / 0.28) ** 2 + ((y + 0.28) / 0.20) ** 2));
    const warmth = Math.max(leftBlush, rightBlush) * frontFacing * 0.14;
    const color = baseSkin.clone().lerp(cheekWarmth, warmth);
    vertexColors.push(color.r, color.g, color.b);
  }
  shape.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  shape.computeVertexNormals();
  return shape;
});

// One smooth lathed nose shell replaces the stacked spherical bridge and tip.
// Its profile is fuller at the tip and tapers gently into the upper bridge.
const residentNoseGeometry = geometry('resident-nose-soft-profile-24', () => new THREE.LatheGeometry([
  new THREE.Vector2(0.00, -0.56),
  new THREE.Vector2(0.34, -0.48),
  new THREE.Vector2(0.70, -0.26),
  new THREE.Vector2(0.88, -0.04),
  new THREE.Vector2(0.78, 0.20),
  new THREE.Vector2(0.48, 0.40),
  new THREE.Vector2(0.00, 0.52)
], 24));

// A gentle shoulder-to-waist profile makes the body read as a volume instead
// of a round ball. It remains normalized so existing breathing animation and
// clothing anchors retain their original dimensions.
const residentTorsoGeometry = geometry('resident-torso-tailored-36', () => new THREE.LatheGeometry([
  new THREE.Vector2(0.00, -1.00),
  new THREE.Vector2(0.58, -1.00),
  new THREE.Vector2(0.78, -0.88),
  new THREE.Vector2(0.94, -0.54),
  new THREE.Vector2(1.00, -0.08),
  new THREE.Vector2(0.96, 0.42),
  new THREE.Vector2(0.78, 0.80),
  new THREE.Vector2(0.52, 0.98),
  new THREE.Vector2(0.00, 1.00)
], 36));
function sphere(parent, color, position, scale, options = {}) {
  const material = options.skin ? skinMat(color, options.roughness ?? 0.90) : mat(color, options.roughness ?? 0.84, options.metalness ?? 0);
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}
function capsule(parent, color, position, radius, length, options = {}) {
  const key = `capsule:${radius}:${length}`;
  const material = options.skin ? skinMat(color, options.roughness ?? 0.90) : mat(color, options.roughness ?? 0.86, options.metalness ?? 0);
  const mesh = new THREE.Mesh(
    geometry(key, () => new THREE.CapsuleGeometry(radius, length, 12, 20)),
    material
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function box(parent, color, position, scale, options = {}) {
  const key = `box:${scale.join(',')}`;
  const geo = geometry(key, () => new THREE.BoxGeometry(...scale));
  const mesh = new THREE.Mesh(geo, mat(color, options.roughness ?? 0.88, options.metalness ?? 0));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
function cylinder(parent, color, position, radiusTop, radiusBottom, height, segments = 20) {
  const key = `cyl:${radiusTop}:${radiusBottom}:${height}:${segments}`;
  const mesh = new THREE.Mesh(geometry(key, () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)), mat(color));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
function tube(parent, points, color, radius = 0.012, tubularSegments = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false), mat(color, 0.86));
  parent.add(mesh);
  return mesh;
}

// Front-surface profile for the shared tailored torso. Using the same profile
// as residentTorsoGeometry keeps fabric inserts on the body at the shoulders,
// waist and sides instead of cutting through it or floating above it.
const RESIDENT_TORSO_FRONT_PROFILE = Object.freeze([
  Object.freeze([0.665, 0.58]), Object.freeze([0.710, 0.78]),
  Object.freeze([0.8375, 0.94]), Object.freeze([1.010, 1.00]),
  Object.freeze([1.1975, 0.96]), Object.freeze([1.340, 0.78]),
  Object.freeze([1.4075, 0.52]), Object.freeze([1.415, 0.00])
]);
function residentTorsoSurfaceZ(x, y, offset = 0.008) {
  let radial = RESIDENT_TORSO_FRONT_PROFILE[0][1];
  for (let i = 1; i < RESIDENT_TORSO_FRONT_PROFILE.length; i++) {
    const [nextY, nextRadius] = RESIDENT_TORSO_FRONT_PROFILE[i];
    const [previousY, previousRadius] = RESIDENT_TORSO_FRONT_PROFILE[i - 1];
    if (y <= nextY) {
      const t = Math.max(0, Math.min(1, (y - previousY) / (nextY - previousY)));
      radial = previousRadius + (nextRadius - previousRadius) * t;
      break;
    }
    radial = nextRadius;
  }
  const availableWidth = Math.max(0.025, 0.305 * radial);
  const across = Math.min(0.985, Math.abs(x) / availableWidth);
  return 0.215 * radial * Math.sqrt(1 - across * across) + offset;
}

function curvedFabricPanel(parent, color, drawShape, options = {}) {
  const shape = new THREE.Shape();
  drawShape(shape);
  const depth = options.depth ?? 0.020;
  const bevel = options.bevel ?? 0.004;
  const surfaceOffset = options.surfaceOffset ?? 0.008;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel * 0.65,
    curveSegments: 16
  });
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    // The back of the extrusion sits just inside the fabric/body join; its
    // visible front face lands a few millimetres above the torso surface.
    const backSurface = residentTorsoSurfaceZ(x, y, surfaceOffset) - depth;
    positions.setZ(i, positions.getZ(i) + backSurface);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  const panel = new THREE.Mesh(geometry, mat(color, options.roughness ?? 0.9));
  panel.castShadow = true;
  parent.add(panel);
  return panel;
}
function joint(parent, position) {
  const group = new THREE.Group();
  group.position.set(...position);
  parent.add(group);
  return group;
}
function setVisible(object, visible) { object.visible = visible; }

function createFace(head, person) {
  const eyes = [];
  const brows = [];
  const cheeks = [];
  // Ears now have a shallow inner bowl and a fine raised helix, so they sit
  // naturally against the head rather than reading as separate round beads.
  for (const side of [-1, 1]) {
    sphere(head, COLORS.skin, [side * 0.292, -0.015, 0.008], [0.069, 0.088, 0.073], { roughness: 0.90, skin: true });
    sphere(head, COLORS.skinShade, [side * 0.300, -0.025, 0.061], [0.026, 0.043, 0.014], { roughness: 0.92, skin: true });
    tube(head, [[side * 0.279, 0.035, 0.049], [side * 0.315, 0.015, 0.072], [side * 0.319, -0.040, 0.069], [side * 0.286, -0.075, 0.052]], COLORS.skinShade, 0.006, 10);
  }
  for (const x of [-0.105, 0.105]) {
    // A warm recessed socket creates a transition from cheek to eyelid.
    sphere(head, 0xdba58d, [x, 0.035, 0.238], [0.067, 0.080, 0.018], { roughness: 0.96 });
    const eye = joint(head, [x, 0.035, 0.247]);
    sphere(eye, COLORS.white, [0, 0, 0], [0.054, 0.063, 0.030], { roughness: 0.28 });
    sphere(eye, COLORS.eye, [0.008, -0.004, 0.026], [0.028, 0.038, 0.018], { roughness: 0.24 });
    const limbalRing = new THREE.Mesh(geometry('resident-eye-limbal-ring-24', () => new THREE.TorusGeometry(0.029, 0.0026, 6, 24)), mat(0x34241f, 0.48));
    limbalRing.position.set(0.008, -0.004, 0.042);
    eye.add(limbalRing);
    sphere(eye, 0x211815, [0.009, -0.007, 0.041], [0.014, 0.024, 0.010], { roughness: 0.18 });
    sphere(eye, 0xffffff, [-0.006, 0.018, 0.050], [0.010, 0.013, 0.008], { roughness: 0.18 });
    sphere(eye, 0xffffff, [0.022, -0.019, 0.045], [0.004, 0.005, 0.003], { roughness: 0.18 });
    // A thin upper lid and a quieter lower rim integrate the eyeball into the face.
    tube(eye, [[-0.052, 0.012, 0.012], [-0.030, 0.055, 0.019], [0.006, 0.068, 0.018], [0.040, 0.048, 0.015], [0.052, 0.012, 0.010]], COLORS.skinShade, 0.0055, 12);
    tube(eye, [[-0.043, -0.035, 0.011], [0.000, -0.055, 0.013], [0.043, -0.034, 0.010]], 0xd99d83, 0.004, 9);
    eyes.push(eye);

    // Brows have independent pivots for subtle surprise, concentration and joy.
    const brow = joint(head, [x, 0.13, 0.25]);
    tube(brow, [[-0.048, 0, 0.005], [-0.018, 0.016, 0.022], [0.032, 0.004, 0.01]], COLORS.hairDark, 0.009, 9);
    brows.push(brow);

    // Cheek warmth is vertex-blended into the head shell, not a separate mesh.
  }
  // A single sculpted bridge/tip gives the nose a continuous profile in side view.
  const nose = new THREE.Mesh(residentNoseGeometry, skinMat(0xe8ae94, 0.90));
  nose.position.set(0, -0.045, 0.278);
  nose.scale.set(0.029, 0.060, 0.038);
  head.add(nose);
  for (const side of [-1, 1]) {
    sphere(head, 0xb98070, [side * 0.014, -0.084, 0.307], [0.0038, 0.0028, 0.0025], { roughness: 0.98 });
  }

  // Gentle smile and lower-lip highlight remain the default expression.
  const smile = joint(head, [0, 0, 0]);
  tube(smile, [[-0.050, -0.163, 0.254], [-0.025, -0.186, 0.275], [0.012, -0.188, 0.278], [0.050, -0.162, 0.254]], 0x925c52, 0.009, 14);
  sphere(smile, 0xc98278, [0, -0.192, 0.269], [0.018, 0.005, 0.006], { roughness: 0.92 });

  // A small open-mouth smile appears only during joyful action beats.
  const openMouth = joint(head, [0, -0.174, 0.274]);
  sphere(openMouth, 0x6f3738, [0, 0, 0], [0.039, 0.027, 0.012]);
  sphere(openMouth, 0xd96f79, [0, -0.016, 0.009], [0.022, 0.008, 0.006]);
  openMouth.visible = false;

  if (person.id === 'red' || person.id === 'lady') {
    for (const x of [-0.145, -0.115, 0.115, 0.145]) {
      sphere(head, 0xb86e5f, [x, -0.09 + (Math.abs(x) > 0.13 ? 0.012 : 0), 0.249], [0.006, 0.006, 0.004], { roughness: 0.95 });
    }
  }
  return { eyes, brows, cheeks, smile, openMouth };
}

function addHair(head, person) {
  const hairRoot = joint(head, [0, 0, 0]);
  const base = person.id === 'blue' ? 0x493a35 : COLORS.hair;
  const cap = new THREE.Mesh(residentHairCapGeometry, mat(base, 0.94));
  cap.position.set(0, 0.145, -0.025);
  cap.scale.set(0.337, 0.245, 0.30);
  hairRoot.add(cap);

  // Keep every raised strand close to the curved surface of the cap. This
  // avoids the detached, floating-lock look while retaining sculpted volume.
  const hairSurfaceZ = (x, y, lift = 0.012) => {
    const remaining = 1 - (x / 0.337) ** 2 - ((y - 0.145) / 0.245) ** 2;
    return -0.025 + 0.30 * Math.sqrt(Math.max(0.035, remaining)) + lift;
  };
  const surfacePath = points => points.map(([x, y, lift = 0.012]) => [x, y, hairSurfaceZ(x, y, lift)]);

  if (person.id === 'lady') {
    // A continuous chestnut bob: a smooth cap, two soft side panels and a
    // swept fringe. The side locks overlap the cap instead of forming beads.
    for (const side of [-1, 1]) {
      const sideLock = capsule(hairRoot, base, [side * 0.255, -0.055, 0.018], 0.082, 0.22, { roughness: 0.94 });
      sideLock.rotation.z = side * -0.045;
      tube(hairRoot, surfacePath([
        [side * 0.275, 0.16, 0.012],
        [side * 0.294, 0.045, 0.012],
        [side * 0.276, -0.10, 0.012]
      ]), 0x795847, 0.0065, 14);
    }
    tube(hairRoot, surfacePath([
      [-0.245, 0.155, 0.018], [-0.19, 0.245, 0.020],
      [-0.095, 0.278, 0.020], [0.015, 0.270, 0.020],
      [0.14, 0.225, 0.020], [0.235, 0.145, 0.018]
    ]), 0x5b4035, 0.026, 24);
    tube(hairRoot, surfacePath([
      [-0.16, 0.235, 0.026], [-0.10, 0.295, 0.026],
      [0.005, 0.305, 0.026], [0.12, 0.260, 0.026]
    ]), 0x8a6651, 0.0065, 18);
    for (const side of [-1, 1]) {
      tube(hairRoot, surfacePath([
        [side * 0.105, 0.235, 0.014],
        [side * 0.178, 0.165, 0.014],
        [side * 0.235, 0.055, 0.014]
      ]), 0x6c4d3d, 0.0055, 12);
    }
  } else {
    // The boys keep their signature tousled curls, now formed as a small
    // number of connected raised locks over one continuous scalp surface.
    const curlPaths = [
      [[-0.275, 0.115, 0.014], [-0.245, 0.205, 0.014], [-0.175, 0.275, 0.014], [-0.095, 0.305, 0.014]],
      [[-0.185, 0.205, 0.018], [-0.135, 0.285, 0.018], [-0.045, 0.335, 0.018], [0.045, 0.315, 0.018]],
      [[-0.045, 0.205, 0.014], [0.025, 0.285, 0.014], [0.115, 0.295, 0.014], [0.195, 0.235, 0.014]],
      [[0.135, 0.145, 0.014], [0.215, 0.195, 0.014], [0.270, 0.145, 0.014]],
      [[-0.255, 0.040, 0.012], [-0.225, 0.115, 0.012], [-0.155, 0.165, 0.012]],
      [[0.205, 0.045, 0.012], [0.245, 0.105, 0.012], [0.255, 0.155, 0.012]]
    ];
    curlPaths.forEach((points, index) => {
      tube(hairRoot, surfacePath(points), index % 2 ? 0x60483c : 0x62483c, index < 4 ? 0.019 : 0.015, 18);
    });
    // Fine curved strands catch the key light and connect the curls into a cap.
    for (let i = 0; i < 5; i++) {
      const x = -0.17 + i * 0.085;
      tube(hairRoot, surfacePath([
        [x - 0.025, 0.19, 0.008],
        [x, 0.255 + Math.sin(i * 0.8) * 0.018, 0.010],
        [x + 0.025, 0.29, 0.008]
      ]), i % 2 ? 0x684d40 : 0x755645, 0.0045, 10);
    }
  }
  return hairRoot;
}

function makeHand(parent, side, skinColor) {
  const hand = new THREE.Group();
  sphere(hand, skinColor, [0, -0.035, 0.02], [0.068, 0.076, 0.048], { roughness: 0.90, skin: true });
  // Individually rounded fingers and a tapered thumb make the hand read as a
  // small articulated form while retaining the existing rig pivot.
  const fingerLengths = [0.046, 0.056, 0.052, 0.042];
  for (let i = 0; i < 4; i++) {
    const x = -0.046 + i * 0.030;
    const finger = capsule(hand, skinColor, [x, -0.101 - (i === 1 ? 0.005 : 0), 0.022], 0.0115, fingerLengths[i], { roughness: 0.90, skin: true });
    finger.rotation.z = (i - 1.5) * 0.035;
  }
  const thumb = capsule(hand, skinColor, [side * 0.068, -0.062, 0.025], 0.016, 0.038, { roughness: 0.90, skin: true });
  thumb.rotation.z = side * -0.48;
  parent.add(hand);
  return hand;
}

function makeArm(root, side, sleeveColor, skinColor) {
  const shoulder = joint(root, [side * 0.265, 1.265, 0]);
  // Overlapping rounded capsules remove the visible ball-joint gaps while
  // retaining separate shoulder, elbow and wrist pivots for animation.
  capsule(shoulder, sleeveColor, [side * 0.018, -0.125, 0], 0.073, 0.17);
  sphere(shoulder, sleeveColor, [side * 0.025, -0.235, 0], [0.061, 0.064, 0.062]);
  const elbow = joint(shoulder, [side * 0.035, -0.245, 0]);
  capsule(elbow, sleeveColor, [0, -0.112, 0], 0.061, 0.15);
  sphere(elbow, sleeveColor, [0, -0.218, 0], [0.050, 0.052, 0.052]);
  const wrist = joint(elbow, [0, -0.225, 0]);
  const cuff = cylinder(wrist, sleeveColor, [0, 0.005, 0], 0.064, 0.069, 0.052, 18);
  // Cylinder's native Y axis follows the forearm; keep the cuff square to the wrist.
  const hand = makeHand(wrist, side, skinColor);
  return { shoulder, elbow, wrist, hand };
}

function makeShoe(foot, person) {
  const isBoot = person.id === 'lady';
  const shoe = isBoot ? COLORS.boots : person.id === 'red' ? 0x5e6677 : 0x68758a;
  sphere(foot, shoe, [0, 0.025, 0.055], [0.13, 0.073, 0.18], { roughness: 0.74 });
  sphere(foot, isBoot ? COLORS.bootLight : 0xe6e7e9, [0, 0.052, 0.13], [0.105, 0.048, 0.105], { roughness: 0.74 });
  sphere(foot, COLORS.sole, [0, -0.035, 0.06], [0.135, 0.025, 0.19], { roughness: 0.82 });
  for (let i = 0; i < 3; i++) {
    const z = 0.01 + i * 0.035;
    tube(foot, [[-0.035, 0.092, z], [0, 0.096, z + 0.01], [0.035, 0.092, z]], isBoot ? 0xc18c58 : 0xe9edf1, 0.006, 6);
  }
  if (isBoot) {
    tube(foot, [[-0.085, 0.02, -0.03], [-0.087, 0.075, 0.015], [-0.08, 0.03, 0.065]], 0xc18c58, 0.008, 8);
  }
}

function makeLeg(root, side, person) {
  const hip = joint(root, [side * 0.145, 0.665, 0]);
  capsule(hip, COLORS.pants, [0, -0.125, 0], 0.087, 0.16);
  sphere(hip, COLORS.pants, [0, -0.232, 0], [0.073, 0.070, 0.074]);
  const knee = joint(hip, [0, -0.25, 0]);
  const lowerLegColor = person.id === 'lady' ? COLORS.skin : COLORS.pants;
  capsule(knee, lowerLegColor, [0, -0.112, 0], person.id === 'lady' ? 0.070 : 0.074, 0.145, { skin: person.id === 'lady' });
  sphere(knee, lowerLegColor, [0, -0.211, 0], [0.057, 0.058, 0.060], { skin: person.id === 'lady' });
  const ankle = joint(knee, [0, -0.235, 0]);
  sphere(ankle, lowerLegColor, [0, -0.035, 0], [0.057, 0.060, 0.058], { skin: person.id === 'lady' });
  const foot = joint(ankle, [0, -0.075, 0.04]);
  makeShoe(foot, person);
  return { hip, knee, ankle, foot };
}

function addClothing(root, person, torso) {
  const details = {};
  if (person.id === 'red') {
    sphere(root, COLORS.redDark, [0, 1.27, -0.075], [0.255, 0.19, 0.16]);
    // Kangaroo pocket, seams and soft drawstrings.
    const pocket = box(root, 0xa63a34, [0, 0.89, 0.208], [0.25, 0.13, 0.025]);
    pocket.rotation.x = -0.08;
    tube(root, [[-0.12, 0.95, 0.22], [-0.11, 0.84, 0.22], [0.11, 0.84, 0.22], [0.12, 0.95, 0.22]], 0x7f2d2a, 0.006);
    for (const x of [-0.07, 0.07]) {
      tube(root, [[x, 1.31, 0.205], [x * 0.9, 1.12, 0.222], [x * 0.9, 1.02, 0.225]], 0xf4eadc, 0.009, 9);
      sphere(root, COLORS.gold, [x * 0.9, 1.01, 0.225], [0.012, 0.018, 0.012]);
    }
    details.pocket = pocket;
  } else if (person.id === 'lady') {
    // Cream blouse under a shaped denim bib with a beveled cloth edge.
    details.bib = curvedFabricPanel(root, COLORS.denim, shape => {
      shape.moveTo(-0.215, 1.235);
      shape.bezierCurveTo(-0.165, 1.315, 0.165, 1.315, 0.215, 1.235);
      shape.lineTo(0.165, 0.925);
      shape.bezierCurveTo(0.085, 0.875, -0.085, 0.875, -0.165, 0.925);
      shape.closePath();
    }, { surfaceOffset: 0.008, depth: 0.020, bevel: 0.004, roughness: 0.91 });
    const skirt = new THREE.Mesh(residentSkirtGeometry, mat(COLORS.denim, 0.89));
    skirt.position.set(0, 0.665, 0);
    root.add(skirt);
    details.skirt = skirt;
    for (const x of [-0.15, 0.15]) {
      const strap = capsule(root, COLORS.denim, [x, 1.30, 0.185], 0.034, 0.22, { roughness: 0.90 });
      strap.rotation.z = x * -0.28;
      sphere(root, COLORS.gold, [x, 1.225, 0.222], [0.028, 0.028, 0.018], { metalness: 0.25 });
    }
    tube(root, [[-0.17, 1.32, 0.18], [0, 1.225, 0.21], [0.17, 1.32, 0.18]], COLORS.cream, 0.024);
    tube(root, [[-0.31, 0.82, 0.12], [-0.2, 0.74, 0.20], [0, 0.72, 0.23], [0.2, 0.74, 0.20], [0.31, 0.82, 0.12]], COLORS.denimLight, 0.006, 18);
    for (const x of [-0.12, 0, 0.12]) tube(root, [[x, 0.85, 0.19], [x * 1.5, 0.67, 0.35], [x * 1.7, 0.52, 0.33]], COLORS.denimDark, 0.004, 9);
    const bag = box(root, COLORS.brown, [-0.36, 0.86, 0.18], [0.18, 0.19, 0.11]);
    bag.rotation.z = -0.18;
    details.bag = bag;
    box(root, COLORS.bootLight, [-0.36, 0.91, 0.238], [0.19, 0.07, 0.018]);
    sphere(root, COLORS.gold, [-0.36, 0.85, 0.252], [0.016, 0.016, 0.01]);
    tube(root, [[-0.28, 1.36, 0.21], [-0.23, 1.14, 0.24], [-0.31, 0.98, 0.23], [-0.36, 0.91, 0.22]], 0x9b704d, 0.022, 14);
  } else {
    // Layered jacket: the navy tailored torso carries a curved, beveled
    // cream front insert, while the rear collar and zip retain their design.
    details.frontPanel = curvedFabricPanel(root, COLORS.cream, shape => {
      shape.moveTo(-0.175, 1.315);
      shape.bezierCurveTo(-0.105, 1.365, 0.105, 1.365, 0.175, 1.315);
      shape.lineTo(0.190, 1.105);
      shape.lineTo(0.145, 0.925);
      shape.bezierCurveTo(0.075, 0.865, -0.075, 0.865, -0.145, 0.925);
      shape.lineTo(-0.190, 1.105);
      shape.closePath();
    }, { surfaceOffset: 0.008, depth: 0.020, bevel: 0.004, roughness: 0.90 });
    // The hood lining stays behind the neck; the front remains one calm,
    // fitted cream insert with a single zipper line and clean navy piping.
    const hoodLining = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.032, 8, 28), mat(COLORS.cream, 0.92));
    hoodLining.position.set(0, 1.315, -0.095);
    hoodLining.rotation.x = Math.PI / 2;
    root.add(hoodLining);
    tube(root, [[-0.155, 1.30, 0.205], [-0.135, 1.16, 0.225], [-0.12, 1.04, 0.225]], COLORS.navyLight, 0.009, 12);
    tube(root, [[0.155, 1.30, 0.205], [0.135, 1.16, 0.225], [0.12, 1.04, 0.225]], COLORS.navyLight, 0.009, 12);
    tube(root, [[0, 1.265, 0.235], [0, 1.105, 0.235], [0, 0.955, 0.225]], 0xd3d5d9, 0.006, 14);
    sphere(root, COLORS.gold, [0.22, 1.16, 0.218], [0.065, 0.065, 0.025], { metalness: 0.18 });
    sphere(root, 0x389f96, [0.22, 1.16, 0.242], [0.044, 0.044, 0.014]);
  }
  return details;
}

function createCharacter(person) {
  const root = new THREE.Group();
  root.position.y = 0;
  const facingYaw = person.id === 'red' ? 0.085 : person.id === 'blue' ? -0.085 : 0;
  root.rotation.y = facingYaw;
  const shadow = new THREE.Mesh(geometry('ground-shadow', () => new THREE.CircleGeometry(0.34, 32)), new THREE.MeshBasicMaterial({ color: 0x183b39, transparent: true, opacity: 0.075, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.008;
  shadow.scale.set(1.42, 0.72, 1);
  root.add(shadow);
  const contactShadow = new THREE.Mesh(geometry('ground-contact-shadow', () => new THREE.CircleGeometry(0.19, 28)), new THREE.MeshBasicMaterial({ color: 0x12332f, transparent: true, opacity: 0.085, depthWrite: false }));
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.010;
  contactShadow.scale.set(1.25, 0.78, 1);
  root.add(contactShadow);

  const shirt = person.id === 'red' ? COLORS.red : person.id === 'lady' ? COLORS.cream : COLORS.navy;
  const torso = new THREE.Mesh(residentTorsoGeometry, mat(shirt, 0.91));
  torso.position.set(0, 1.04, 0);
  torso.scale.set(0.305, 0.375, 0.215);
  root.add(torso);
  const clothing = addClothing(root, person, torso);
  const sleeve = person.id === 'red' ? COLORS.red : person.id === 'lady' ? COLORS.cream : COLORS.blue;
  const arms = [makeArm(root, -1, sleeve, COLORS.skin), makeArm(root, 1, sleeve, COLORS.skin)];
  const legs = [makeLeg(root, -1, person), makeLeg(root, 1, person)];
  // A short blended neck bridges the collar and head so the silhouette
  // reads as one soft character rather than a floating head on a torso.
  capsule(root, COLORS.skin, [0, 1.385, -0.005], 0.101, 0.12, { skin: true });
  const head = joint(root, [0, 1.625, 0]);
  // Keep the friendly chibi identity, but ease the head/body ratio slightly
  // so the neck and shoulders read more like a small animated child.
  head.scale.setScalar(0.965);
  const headMesh = new THREE.Mesh(residentHeadGeometry, skinFaceMat(0.90));
  headMesh.scale.set(0.305, 0.34, 0.27);
  head.add(headMesh);
  const hair = addHair(head, person);
  const face = createFace(head, person);
  const eyes = face.eyes;

  if (person.id === 'red') {
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.065, 10, 28, Math.PI), mat(COLORS.redDark));
    hood.position.set(0, -0.10, -0.075);
    hood.rotation.z = Math.PI;
    root.add(hood);
  }

  const accessories = createAccessories(root, person, arms, head);
  return { root, torso, head, hair, face, eyes, arms, legs, accessories, clothing, shadow, contactShadow, person, facingYaw, baseX: 0 };
}

function createUmbrella(parent, color, heldInHand = false) {
  const group = new THREE.Group();
  group.position.set(0, heldInHand ? 0 : 2.18, 0.03);

  // The hand is at the shaft's lower end. The canopy's crown points away from
  // the palm, along local -Y, so the open underside faces the character/camera.
  const canopyRadius = 0.36;
  const canopyDepth = 0.48;
  const canopyY = -0.68;
  const canopyGeometry = geometry('resident-umbrella-canopy-32', () =>
    new THREE.SphereGeometry(canopyRadius, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2)
  );
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0,
    side: THREE.DoubleSide
  });
  const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
  canopy.position.set(0, canopyY, 0);
  canopy.scale.y = -canopyDepth;
  canopy.castShadow = true;
  group.add(canopy);

  // A slender shaft reaches from the palm to the canopy crown; the hook sits
  // below the grip rather than dangling from the canopy side of the hand.
  cylinder(group, 0xe9dfcf, [0, -0.425, 0], 0.008, 0.009, 0.85, 10);
  cylinder(group, 0x9a704e, [0, 0.035, 0], 0.015, 0.015, 0.11, 10);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.010, 8, 16, Math.PI), mat(0xe9dfcf, 0.78));
  hook.position.set(0, 0.105, 0);
  group.add(hook);

  // Eight curved ribs make the underside legible from the low, front-facing
  // Weather camera. They follow the dome rather than crossing it as straight bars.
  const ribColor = color === 0xe77f72 ? 0xb75f58 : 0x526f9c;
  for (let rib = 0; rib < 8; rib++) {
    const angle = (rib / 8) * Math.PI * 2;
    const points = [];
    for (let step = 0; step <= 5; step++) {
      const theta = 0.10 + (Math.PI / 2 - 0.10) * (step / 5);
      const radial = canopyRadius * Math.sin(theta);
      const y = canopyY - canopyRadius * canopyDepth * Math.cos(theta) + 0.007;
      points.push([radial * Math.cos(angle), y, radial * Math.sin(angle)]);
    }
    tube(group, points, ribColor, 0.0045, 12);
  }

  const rim = new THREE.Mesh(
    geometry('resident-umbrella-rim-32', () => new THREE.TorusGeometry(0.352, 0.008, 7, 32)),
    mat(color === 0xe77f72 ? 0xc56a61 : 0x617eab, 0.72)
  );
  rim.position.set(0, canopyY, 0);
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const crown = sphere(group, color === 0xe77f72 ? 0xc96e64 : 0x6684b2,
    [0, canopyY - canopyRadius * canopyDepth, 0], [0.035, 0.018, 0.035], { roughness: 0.68 });
  crown.castShadow = false;
  group.visible = false;
  parent.add(group);
  return group;
}

function createAccessories(root, person, arms, head) {
  const accessories = {};
  // Umbrellas are parented to the right palm; the pole now terminates at the
  // hand, so the rain pose visibly holds the prop instead of wearing it.
  accessories.umbrella = createUmbrella(arms[1].hand, person.id === 'red' ? 0xe77f72 : 0x718fc7, true);
  // The snow cap follows head motion and sits over the scalp rather than in
  // world space. A low, soft brim and pom-pom complete the knitted silhouette.
  accessories.hat = sphere(head, 0x7894bd, [0, 0.405, -0.01], [0.312, 0.132, 0.286], { roughness: 0.94 });
  accessories.hatBrim = sphere(head, 0x657fa6, [0, 0.318, 0.012], [0.303, 0.040, 0.278], { roughness: 0.96 });
  accessories.hatPom = sphere(head, 0xffffff, [0, 0.535, -0.01], [0.052, 0.052, 0.052], { roughness: 0.90 });
  accessories.scarf = sphere(root, 0xd87875, [0, 1.385, 0.03], [0.245, 0.058, 0.185], { roughness: 0.94 });
  accessories.fan = new THREE.Group();
  sphere(accessories.fan, 0x9c704d, [0, -0.10, 0], [0.018, 0.11, 0.018]);
  const fanDisk = new THREE.Mesh(new THREE.CircleGeometry(0.12, 18), mat(0xf1d18e));
  fanDisk.position.set(0, 0.045, 0.008);
  accessories.fan.add(fanDisk);
  for (let i = -2; i <= 2; i++) tube(accessories.fan, [[0, 0.045, 0.018], [i * 0.035, 0.10, 0.018]], 0xb78652, 0.004, 5);
  accessories.fan.position.set(0.42, 1.31, 0.25);
  accessories.fan.visible = false;
  root.add(accessories.fan);

  accessories.kite = new THREE.Group();
  const kiteBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat(0xe77f72));
  kiteBody.scale.y = 1.3;
  accessories.kite.add(kiteBody);
  tube(accessories.kite, [[0, -0.20, 0], [0.06, -0.32, 0], [-0.04, -0.43, 0]], 0xffe2a1, 0.011);
  accessories.kite.position.set(0.65, 2.18, -0.12);
  accessories.kite.visible = false;
  root.add(accessories.kite);

  accessories.wateringCan = new THREE.Group();
  sphere(accessories.wateringCan, 0x8cc8be, [0, 0, 0], [0.14, 0.11, 0.10]);
  tube(accessories.wateringCan, [[0.08, 0, 0], [0.18, 0.02, 0], [0.27, 0.10, 0]], 0x8cc8be, 0.022, 9);
  accessories.wateringCan.position.set(0.37, 0.93, 0.18);
  accessories.wateringCan.visible = false;
  root.add(accessories.wateringCan);

  accessories.umbrella.visible = false;
  accessories.hat.visible = false;
  accessories.hatBrim.visible = false;
  accessories.hatPom.visible = false;
  accessories.scarf.visible = false;
  return accessories;
}

function createPropScene(scene) {
  const props = {};
  props.ball = sphere(scene, 0xf2c65f, [0, 0.22, 0.35], [0.105, 0.105, 0.105]);
  props.ball.visible = false;
  props.butterfly = new THREE.Group();
  props.wingLeft = sphere(props.butterfly, 0xf6a3c9, [-0.075, 0, 0], [0.075, 0.115, 0.022]);
  props.wingRight = sphere(props.butterfly, 0xf6a3c9, [0.075, 0, 0], [0.075, 0.115, 0.022]);
  sphere(props.butterfly, 0x4c465c, [0, 0, 0.025], [0.014, 0.09, 0.018]);
  props.butterfly.position.set(0.1, 2.05, 0.48);
  scene.add(props.butterfly);
  props.picnic = new THREE.Group();
  box(props.picnic, 0xc86f69, [0, 0.025, 0], [0.95, 0.025, 0.60]);
  sphere(props.picnic, 0xf2c75f, [-0.2, 0.11, 0], [0.075, 0.075, 0.075]);
  sphere(props.picnic, 0x8ab9a6, [0.16, 0.11, 0.03], [0.095, 0.075, 0.08]);
  props.picnic.visible = false;
  scene.add(props.picnic);
  props.tent = new THREE.Group();
  const tent = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.78, 3), mat(0x728ba7));
  tent.rotation.y = Math.PI / 2;
  tent.position.set(0, 0.40, -0.10);
  props.tent.add(tent);
  tube(props.tent, [[0, 0.02, 0.22], [0, 0.47, -0.10], [0, 0.02, -0.42]], 0xf1d8a8, 0.016);
  props.tent.visible = false;
  scene.add(props.tent);
  props.fire = new THREE.Group();
  sphere(props.fire, 0xffbd63, [0, 0.14, 0], [0.10, 0.19, 0.10]);
  sphere(props.fire, 0xffe6a1, [0, 0.18, 0.04], [0.055, 0.12, 0.06]);
  props.fire.position.set(0.72, 0, 0.18);
  props.fire.visible = false;
  scene.add(props.fire);
  props.confetti = [];
  const confettiGeometry = geometry('festival-paper-confetti-1x1', () => new THREE.BoxGeometry(1, 1, 0.10));
  for (let i = 0; i < 18; i++) {
    const paper = new THREE.Mesh(confettiGeometry, mat([0xf1cf75, 0xef8e83, 0x8acfc0, 0x9faee4][i % 4], 0.78));
    paper.scale.set(0.016 + (i % 3) * 0.002, 0.026 + (i % 4) * 0.002, 0.0025);
    paper.visible = false;
    scene.add(paper);
    props.confetti.push(paper);
  }
  return props;
}

function createAccessoriesVisibility(actors, props, mode) {
  props.ball.visible = mode === 'play';
  props.butterfly.visible = mode === 'morning';
  props.picnic.visible = mode === 'picnic';
  props.tent.visible = mode === 'camping';
  props.fire.visible = mode === 'camping';
  props.confetti.forEach(item => { item.visible = mode === 'festival'; });
  for (const actor of actors) {
    const accessories = actor.accessories;
    accessories.umbrella.visible = mode === 'rain' && actor.person.id !== 'lady';
    accessories.hat.visible = mode === 'snow';
    accessories.hatBrim.visible = mode === 'snow';
    accessories.hatPom.visible = mode === 'snow';
    accessories.scarf.visible = mode === 'snow';
    accessories.fan.visible = mode === 'heat' && actor.person.id === 'lady';
    accessories.kite.visible = mode === 'kite' && actor.person.id === 'blue';
    accessories.wateringCan.visible = mode === 'garden' && actor.person.id === 'lady';
  }
}

function resetActor(actor) {
  actor.root.rotation.set(0, actor.facingYaw || 0, 0);
  actor.root.position.set(actor.baseX, 0, 0);
  actor.torso.scale.y = 0.375;
  actor.head.rotation.set(0, 0, 0);
  actor.hair.rotation.set(0, 0, 0);
  actor.accessories.umbrella.rotation.set(0, 0, 0);
  actor.accessories.scarf.rotation.set(0, 0, 0);
  actor.accessories.fan.rotation.set(0, 0, 0);
  actor.accessories.kite.rotation.set(0, 0, 0);
  actor.accessories.wateringCan.rotation.set(0, 0, 0);
  actor.accessories.kite.position.set(0.65, 2.18, -0.12);
  for (const arm of actor.arms) {
    arm.shoulder.rotation.set(0, 0, 0);
    arm.elbow.rotation.set(0, 0, 0);
    arm.wrist.rotation.set(0, 0, 0);
  }
  for (const leg of actor.legs) {
    leg.hip.rotation.set(0, 0, 0);
    leg.knee.rotation.set(0, 0, 0);
    leg.ankle.rotation.set(0, 0, 0);
    leg.foot.rotation.set(0, 0, 0);
  }
}

function walkCycle(actor, time, index, speed = 3.7, stride = 0.48, bounce = 0.035) {
  const profile = typeof speed === 'object' ? speed : { speed, stride, bounce };
  activityFramework.movement.applyGait(actor, time, index, profile);
}

function easeActorPose(actor, dt) {
  // Blend the target pose over a short interval so activity changes feel
  // weighted rather than snapping between unrelated limb positions.
  const nodes = [
    actor.root, actor.head, actor.hair,
    ...actor.arms.flatMap(arm => [arm.shoulder, arm.elbow, arm.wrist]),
    ...actor.legs.flatMap(leg => [leg.hip, leg.knee, leg.ankle, leg.foot])
  ];
  const alpha = 1 - Math.exp(-Math.min(0.08, dt) * 11.5);
  if (!actor.poseMemory) actor.poseMemory = nodes.map(node => ({
    quaternion: node.quaternion.clone(),
    position: node.position.clone()
  }));
  nodes.forEach((node, index) => {
    const memory = actor.poseMemory[index];
    // THREE.Euler has no lerp() method. Quaternion.slerp() is the supported,
    // smooth interpolation path for articulated 3D rotations.
    memory.quaternion.slerp(node.quaternion, alpha);
    memory.position.lerp(node.position, alpha);
    node.quaternion.copy(memory.quaternion);
    node.position.copy(memory.position);
  });
}

function getPlayBeat(time, actors) {
  return activityFramework.interactions.getBallExchange(time, actors);
}

function poseActor(actor, mode, time, index, state, playBeat) {
  const phase = time * 2.8 + index * 1.37;
  const wave = Math.sin(phase);
  const left = actor.arms[0];
  const right = actor.arms[1];
  const isRed = actor.person.id === 'red';
  const isLady = actor.person.id === 'lady';
  const isBlue = actor.person.id === 'blue';

  if (mode === 'calm') {
    actor.torso.scale.y = 0.375 + Math.sin(time * 1.8 + index) * 0.012;
    actor.root.position.x = actor.baseX + Math.sin(time * 0.34 + index * 1.8) * 0.018;
    actor.head.rotation.y = Math.sin(time * 0.62 + index * 1.5) * 0.13;
    actor.head.rotation.z = Math.sin(time * 0.82 + index * 1.7) * 0.026;
    actor.hair.rotation.z = Math.sin(time * 1.0 + index) * 0.012;
    left.shoulder.rotation.z = -0.045 + wave * 0.018;
    right.shoulder.rotation.z = 0.045 - wave * 0.018;
  } else if (mode === 'morning') {
    if (isRed) {
      const jump = Math.max(0, Math.sin(time * 6.4 + index));
      actor.root.position.y = jump * 0.15;
      left.shoulder.rotation.z = -0.72 - jump * 0.22;
      right.shoulder.rotation.z = 0.72 + jump * 0.22;
      actor.legs[0].hip.rotation.x = wave * 0.43;
      actor.legs[1].hip.rotation.x = -wave * 0.43;
      actor.legs[0].knee.rotation.x = Math.max(0, wave) * 0.18;
      actor.legs[1].knee.rotation.x = Math.max(0, -wave) * 0.18;
    } else if (isLady) {
      walkCycle(actor, time, index, 3.2, 0.35, 0.026);
      actor.root.position.x = actor.baseX + Math.sin(time * 1.55) * 0.075;
      actor.head.rotation.y = Math.sin(time * 1.8) * 0.34;
      right.shoulder.rotation.z = 0.86 + Math.sin(time * 3.0) * 0.16;
      right.elbow.rotation.x = -0.55;
      left.shoulder.rotation.z = -0.28;
    } else {
      actor.root.rotation.z = Math.sin(time * 1.55) * 0.075;
      left.shoulder.rotation.z = -1.25 + Math.sin(time * 2.4) * 0.08;
      right.shoulder.rotation.z = 0.26;
      right.elbow.rotation.x = -0.4;
      actor.head.rotation.z = -0.06;
    }
  } else if (mode === 'play' || mode === 'walk') {
    const activity = activityFramework.getActivity(mode);
    walkCycle(actor, time, index, activity?.gait || { speed: 3.7, stride: 0.4, bounce: 0.025 });
    if (mode === 'play') {
      // Keep hands comfortably apart and close to the body so the trio reads
      // as playing together, not holding hands. The walk-cycle X swing supplies
      // the natural counter-balance while the elbows stay softly bent.
      const greeting = Math.sin(time * 2.7 + index * 1.55);
      if (isRed) {
        actor.head.rotation.y = 0.18 + Math.sin(time * 1.8) * 0.08;
        right.shoulder.rotation.z = 0.16 + Math.sin(time * 3.8) * 0.035;
        right.elbow.rotation.x = -0.28 - Math.max(0, greeting) * 0.06;
        left.shoulder.rotation.z = -0.12;
        left.elbow.rotation.x = -0.22;
        right.wrist.rotation.z = Math.sin(time * 4.2) * 0.08;
      }
      if (isLady) {
        actor.head.rotation.y = Math.sin(time * 1.75 + 0.4) * 0.24;
        actor.head.rotation.z = Math.sin(time * 2.2) * 0.04;
        right.shoulder.rotation.z = 0.15 + Math.max(0, greeting) * 0.035;
        right.elbow.rotation.x = -0.25;
        left.shoulder.rotation.z = -0.15 - Math.max(0, -greeting) * 0.035;
        left.elbow.rotation.x = -0.24;
      }
      if (isBlue) {
        actor.head.rotation.y = -0.18 - Math.sin(time * 1.7) * 0.07;
        left.shoulder.rotation.z = -0.18 - Math.sin(time * 3.4 + 0.7) * 0.035;
        left.elbow.rotation.x = -0.29;
        right.shoulder.rotation.z = 0.12;
        right.elbow.rotation.x = -0.22;
        left.wrist.rotation.z = Math.sin(time * 3.9 + 0.5) * 0.08;
      }

      // Shared interaction engine owns gaze, pass/receive footwork and
      // character-specific follow-through for every ball-based activity.
      if (playBeat) activityFramework.interactions.applyBallResponse(actor, index, playBeat);
    }
  } else if (mode === 'rain') {
    if (isLady) {
      actor.root.rotation.z = Math.sin(time * 2.8) * 0.12;
      actor.root.position.y = Math.max(0, Math.sin(time * 5.0) * 0.065);
      left.shoulder.rotation.z = -0.78 + Math.sin(time * 3.2) * 0.2;
      right.shoulder.rotation.z = 0.78 - Math.sin(time * 3.2) * 0.2;
      left.elbow.rotation.x = -0.28;
      right.elbow.rotation.x = -0.28;
      actor.head.rotation.y = Math.sin(time * 2.2) * 0.16;
    } else {
      left.shoulder.rotation.z = -0.18;
      left.elbow.rotation.x = -0.30;
      // The right arm rises mostly upward; a small Z bend keeps the elbow soft.
      // The umbrella shaft extends along the forearm axis from the palm.
      right.shoulder.rotation.z = 2.72;
      right.elbow.rotation.z = -0.12;
      right.elbow.rotation.x = -0.04;
      right.wrist.rotation.z = Math.sin(time * 1.15 + index) * 0.012;
      actor.head.rotation.z = Math.sin(time * 1.15 + index) * 0.025;
    }
  } else if (mode === 'snow') {
    actor.root.rotation.z = Math.sin(time * 14 + index) * 0.027;
    actor.head.rotation.z = Math.sin(time * 13 + index) * 0.022;
    left.shoulder.rotation.z = -0.52 + Math.sin(time * 4 + index) * 0.06;
    right.shoulder.rotation.z = 0.52 - Math.sin(time * 4 + index) * 0.06;
    left.elbow.rotation.x = -0.4;
    right.elbow.rotation.x = -0.4;
    actor.legs[0].knee.rotation.x = Math.max(0, wave) * 0.08;
    actor.legs[1].knee.rotation.x = Math.max(0, -wave) * 0.08;
    actor.accessories.scarf.rotation.z = Math.sin(time * 5 + index) * 0.06;
  } else if (mode === 'heat') {
    if (isLady) {
      right.shoulder.rotation.z = 0.82 + Math.sin(time * 6.5) * 0.12;
      right.elbow.rotation.x = -0.25;
      actor.accessories.fan.rotation.z = Math.sin(time * 7.8) * 0.36;
    } else {
      right.shoulder.rotation.z = 0.82;
      right.elbow.rotation.x = -0.7 + Math.sin(time * 3.8) * 0.12;
      actor.head.rotation.z = Math.sin(time * 1.5 + index) * 0.035;
    }
    actor.torso.scale.y = 0.375 + Math.sin(time * 2.4 + index) * 0.012;
    left.shoulder.rotation.z = -0.12;
  } else if (mode === 'wind') {
    const gust = state.gustLevel === 'strong' ? 1 : 0.5;
    actor.root.rotation.z = -0.17 * gust + Math.sin(time * 2.1 + index) * 0.025;
    actor.root.position.x = actor.baseX + Math.sin(time * 2.2 + index) * 0.075 * gust;
    left.shoulder.rotation.z = -0.72 * gust;
    right.shoulder.rotation.z = 0.34 * gust;
    actor.hair.rotation.z = -0.10 * gust + Math.sin(time * 4.0 + index) * 0.055;
    if (isBlue && state.gustLevel === 'strong') actor.root.position.y = Math.max(0, Math.sin(time * 4) * 0.085);
  } else if (mode === 'stargaze') {
    actor.head.rotation.x = -0.22;
    actor.head.rotation.y = Math.sin(time * 0.42 + index) * 0.08;
    actor.head.rotation.z = Math.sin(time * 0.5 + index) * 0.025;
    left.shoulder.rotation.z = -0.08;
    right.shoulder.rotation.z = 0.08;
  } else if (mode === 'kite') {
    if (isBlue) {
      left.shoulder.rotation.z = -0.92;
      right.shoulder.rotation.z = 0.60;
      left.elbow.rotation.x = -0.35;
      right.elbow.rotation.x = -0.48;
      actor.head.rotation.y = -0.22 + Math.sin(time * 1.5) * 0.08;
      actor.accessories.kite.position.y = 2.18 + Math.sin(time * 2.2) * 0.13;
      actor.accessories.kite.rotation.z = Math.sin(time * 1.8) * 0.12;
    } else {
      actor.head.rotation.y = isRed ? 0.32 : -0.28;
      actor.head.rotation.x = -0.12;
    }
  } else if (mode === 'garden') {
    if (isLady) {
      right.shoulder.rotation.z = 0.83 + Math.sin(time * 3.4) * 0.14;
      right.elbow.rotation.x = -0.6;
      actor.head.rotation.x = 0.13;
      actor.accessories.wateringCan.rotation.z = Math.sin(time * 2.8) * 0.08;
    } else {
      actor.head.rotation.y = isRed ? 0.24 : -0.2;
      left.shoulder.rotation.z = -0.12 + Math.sin(time * 1.3 + index) * 0.08;
    }
  } else if (mode === 'festival') {
    const beat = time * 4.7 + index * 1.65;
    actor.root.position.y = Math.max(0, Math.sin(beat) * 0.12);
    actor.root.rotation.z = Math.sin(beat * 0.56) * 0.12;
    left.shoulder.rotation.z = -0.92 + Math.sin(beat) * 0.19;
    right.shoulder.rotation.z = 0.92 - Math.sin(beat + 0.7) * 0.19;
    left.elbow.rotation.x = -0.35;
    right.elbow.rotation.x = -0.35;
    actor.legs[0].hip.rotation.x = Math.sin(beat) * 0.34;
    actor.legs[1].hip.rotation.x = -Math.sin(beat) * 0.34;
    actor.head.rotation.y = Math.sin(beat * 0.5) * 0.14;
  } else if (mode === 'picnic' || mode === 'camping') {
    actor.root.position.y = -0.12 + Math.sin(time * 1.4 + index) * 0.012;
    actor.legs[0].hip.rotation.x = 0.75;
    actor.legs[1].hip.rotation.x = 0.75;
    actor.legs[0].knee.rotation.x = -0.92;
    actor.legs[1].knee.rotation.x = -0.92;
    actor.head.rotation.x = 0.1;
    left.shoulder.rotation.z = -0.2;
    right.shoulder.rotation.z = 0.2 + Math.sin(time * 1.6 + index) * 0.05;
    if (mode === 'camping') actor.head.rotation.y = Math.sin(time * 0.8 + index) * 0.12;
  }
}

export function createResidents3D(canvas, roster, initialState = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.2, 2.2, 1.16, -1.16, 0.1, 40);
  camera.position.set(0.16, 1.42, 8);
  camera.lookAt(0, 1.12, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene.add(new THREE.HemisphereLight(0xfff7ed, 0x60756d, 1.55));
  const key = new THREE.DirectionalLight(0xffefdf, 1.90);
  key.position.set(-3.2, 5.2, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd4e5ff, 0.58);
  fill.position.set(4, 2.4, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd6a6, 0.78);
  rim.position.set(0, 3, -3);
  scene.add(rim);

  const actors = roster.map(person => createCharacter(person));
  actors.forEach(actor => scene.add(actor.root));
  const props = createPropScene(scene);
  let mode = initialState.mode || 'calm';
  let state = { ...initialState };
  let alive = true;
  let frame = 0;
  let lastRender = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  const resize = () => {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w;
    height = h;
    const aspect = w / h;
    const halfHeight = 1.16;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    const spacing = Math.min(1.34, Math.max(0.53, aspect * 0.71));
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
    createAccessoriesVisibility(actors, props, mode);
    return true;
  }
  setActivity(state);

  function animate(now) {
    if (!alive) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    // A 30 fps ceiling limits GPU cost on iPhone while keeping limb motion fluid.
    if (now - lastRender < 32) return;
    const dt = Math.min(0.06, (now - (lastRender || now)) / 1000);
    lastRender = now;
    elapsed += dt * (reducedMotion ? 0.28 : 1);
    const playBeat = mode === 'play' ? getPlayBeat(elapsed, actors) : null;

    actors.forEach((actor, index) => {
      resetActor(actor);
      poseActor(actor, mode, elapsed, index, state, playBeat);
      // Sample environment motion before any clothing or accessory reads.
      // Keeping this binding at the top of the actor pass avoids a temporal
      // dead-zone ReferenceError that would stop the entire render loop.
      const environmentMotion = activityFramework.environment.sample(mode, elapsed, index, state);

      // Small secondary motions keep the trio expressive without making
      // them bounce continuously: head follow-through, relaxed wrists,
      // fabric sway and a gentle counter-motion through the torso.
      const phase = elapsed * 2.15 + index * 1.73;
      actor.head.rotation.x += Math.sin(phase * 0.62) * 0.018;
      actor.head.rotation.z += Math.sin(phase) * 0.012;
      actor.arms[0].wrist.rotation.x = Math.sin(phase + 0.8) * 0.055;
      actor.arms[1].wrist.rotation.x = Math.sin(phase + 2.1) * 0.055;
      actor.legs[0].foot.rotation.x += Math.sin(phase + 0.5) * 0.018;
      actor.legs[1].foot.rotation.x += Math.sin(phase + 2.0) * 0.018;
      actor.root.rotation.y += Math.sin(phase * 0.45) * 0.012;
      if (actor.clothing.skirt) {
        actor.clothing.skirt.rotation.z = environmentMotion.fabricSway;
      }
      if (actor.accessories.bag) {
        actor.accessories.bag.rotation.z = environmentMotion.accessorySway;
      }
      easeActorPose(actor, dt);

      const blinkPulse = Math.max(0, Math.sin((elapsed * 0.56 + index * 0.37) * Math.PI * 2));
      const blink = Math.pow(blinkPulse, 32);
      actor.eyes.forEach((eye, eyeIndex) => {
        eye.scale.y = 1 - blink * 0.88;
        // Tiny eye-line shifts help them look toward one another in shared play.
        const inwardLook = mode === 'play' ? (index === 0 ? 0.07 : index === 2 ? -0.07 : Math.sin(elapsed * 1.2) * 0.035) : 0;
        eye.rotation.y = inwardLook + Math.sin(elapsed * 0.48 + index + eyeIndex * 0.35) * 0.018;
      });

      const joyful = mode === 'play' || mode === 'festival' ||
        (mode === 'morning' && (index === 0 || index === 1)) ||
        (mode === 'rain' && index === 1);
      const expressionBeat = Math.sin(elapsed * (mode === 'festival' ? 4.2 : 2.55) + index * 1.9);
      const laughing = joyful && expressionBeat > (mode === 'festival' ? 0.82 : 0.91);
      actor.face.openMouth.visible = laughing;
      actor.face.smile.visible = !laughing;
      actor.face.brows.forEach((brow, browIndex) => {
        const side = browIndex === 0 ? -1 : 1;
        const lift = mode === 'snow' ? -0.028 : mode === 'heat' ? -0.018 : joyful ? 0.045 + Math.max(0, expressionBeat) * 0.025 : mode === 'stargaze' ? 0.035 : 0;
        brow.rotation.z = side * lift;
      });
      actor.face.cheeks.forEach((cheek, cheekIndex) => {
        cheek.scale.y = 0.031 + (joyful ? 0.003 : 0) + Math.sin(elapsed * 1.4 + index + cheekIndex) * 0.001;
      });
      actor.hair.rotation.x = environmentMotion.hairSway;
      actor.accessories.kite.position.x = mode === 'kite' ? 0.65 + Math.sin(elapsed * 1.4) * 0.13 : 0.65;
      actor.accessories.fan.rotation.z = mode === 'heat' && actor.person.id === 'lady' ? Math.sin(elapsed * 8) * 0.40 : 0;
    });

    if (playBeat) {
      props.ball.position.set(playBeat.ballX, playBeat.ballY, 0.36);
    }
    props.butterfly.position.set(0.1 + Math.sin(elapsed * 1.65) * 0.30, 2.05 + Math.sin(elapsed * 2.7) * 0.16, 0.48);
    props.butterfly.rotation.z = Math.sin(elapsed * 4) * 0.20;
    props.wingLeft.rotation.z = Math.sin(elapsed * 12) * 0.55;
    props.wingRight.rotation.z = -Math.sin(elapsed * 12) * 0.55;
    props.picnic.rotation.y = Math.sin(elapsed * 0.4) * 0.025;
    props.fire.scale.y = 1 + Math.sin(elapsed * 7) * 0.12;
    props.confetti.forEach((item, index) => {
      item.position.set(Math.sin(elapsed * 0.7 + index * 1.9) * (0.45 + (index % 3) * 0.22),
        1.0 + ((elapsed * 0.45 + index * 0.19) % 1.2), 0.28 - (index % 3) * 0.12);
      item.rotation.x = Math.sin(elapsed * 3.1 + index * 1.7) * 0.65;
      item.rotation.y = elapsed * (index % 2 ? 1.25 : -1.10);
      item.rotation.z = elapsed * (index % 2 ? 1.8 : -1.5);
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
      const sharedGeometries = new Set(geometryCache.values());
      const sharedMaterials = new Set([...materialCache.values(), ...skinMaterialCache.values(), ...skinFaceMaterialCache.values()]);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse(object => {
        if (object.geometry && !sharedGeometries.has(object.geometry)) geometries.add(object.geometry);
        if (object.material) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(item => { if (!sharedMaterials.has(item)) materials.add(item); });
        }
      });
      // Shared primitive geometry/materials remain cached for the next Weather visit.
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      renderer.dispose();
      renderer.forceContextLoss?.();
    }
  });
}
