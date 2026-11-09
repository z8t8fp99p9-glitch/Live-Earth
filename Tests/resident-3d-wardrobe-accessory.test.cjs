const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs'), 'utf8');

// Exercise the same torso-surface mapping used to place the Lady's bib and
// Blue Jacket Boy's front insert, rather than only checking for marker text.
const profileStart = source.indexOf('const RESIDENT_TORSO_FRONT_PROFILE = Object.freeze([');
const panelStart = source.indexOf('\nfunction curvedFabricPanel(', profileStart);
assert.ok(profileStart >= 0 && panelStart > profileStart, 'Missing fitted torso surface profile');
const profileRuntime = vm.runInNewContext(
  `${source.slice(profileStart, panelStart)}\n({ residentTorsoSurfaceZ })`,
  {}
);
const surfaceZ = profileRuntime.residentTorsoSurfaceZ;
const center = surfaceZ(0, 1.01);
const side = surfaceZ(0.18, 1.01);
const upper = surfaceZ(0, 1.34);
assert.ok(center > side, 'Torso surface should curve away toward the side edges');
assert.ok(center > upper, 'Upper chest must follow the narrower shoulder profile');
assert.ok(center > 0.20 && center < 0.24, 'Center insert must sit close to the torso shell');

assert.ok(source.includes('const y = positions.getY(i);'), 'Fabric panels must conform in both width and height');
assert.ok(source.includes('residentTorsoSurfaceZ(x, y, surfaceOffset)'), 'Extruded panels must use the measured torso surface');
assert.ok(!source.includes('const curvature = options.curvature ?? 0.04'), 'Remove the old width-only parabolic panel warp');
assert.ok(source.includes('details.bib = curvedFabricPanel'), 'Little Lady must retain her shaped pinafore bib');
assert.ok(source.includes('const strap = capsule(root, COLORS.denim'), 'Pinafore straps should have soft cloth edges');
assert.ok(source.includes('const strap = capsule(root, COLORS.denim'), 'Pinafore straps should have soft cloth edges');
assert.ok(source.includes('details.frontPanel = curvedFabricPanel'), 'Blue Jacket Boy must retain his fitted jacket insert');
assert.ok(source.includes('const hoodLining = new THREE.Mesh(new THREE.TorusGeometry'), 'Blue jacket hood lining should sit behind the front panel');
assert.ok(!source.includes('tube(root, [[-0.09, 1.27, 0.23], [-0.07, 1.13, 0.25]]'), 'Remove the crossing cream decorative overlays');
assert.ok(source.includes('const hoodLining = new THREE.Mesh(new THREE.TorusGeometry'), 'Blue jacket hood lining should sit behind the front panel');
assert.ok(!source.includes('tube(root, [[-0.09, 1.27, 0.23], [-0.07, 1.13, 0.25]]'), 'Remove the crossing cream decorative overlays');
assert.ok(source.includes('const skirt = new THREE.Mesh(residentSkirtGeometry'), 'Little Lady must retain her shaped skirt shell');

// Rain umbrellas attach to the right palm and follow the raised holding arm.
assert.ok(source.includes('function createUmbrella(parent, color, heldInHand = false)'), 'Umbrella needs a hand-mounted mode');
assert.ok(source.includes('createUmbrella(arms[1].hand,'), 'Rain umbrella must be parented to the right hand');
assert.ok(source.includes('group.position.set(0, heldInHand ? 0 : 2.18, 0.03)'), 'Hand-mounted umbrella must start at the palm');
assert.ok(source.includes("geometry('resident-umbrella-canopy-32'"), 'Umbrella needs a reusable dome canopy');
assert.ok(source.includes('side: THREE.DoubleSide'), 'The canopy underside must render from the low Weather camera');
assert.ok(source.includes('canopy.scale.y = -canopyDepth'), 'Canopy crown must point away from the hand');
assert.ok(source.includes('const canopyY = -0.68'), 'Canopy must sit beyond the hand along the shaft');
assert.ok(source.includes('for (let rib = 0; rib < 8; rib++)'), 'Canopy needs eight visible curved ribs');
assert.ok(source.includes('resident-umbrella-rim-32'), 'Canopy needs a defined rim');
assert.ok(source.includes('new THREE.TorusGeometry(0.047, 0.010'), 'Hand grip needs a hook handle');
const rainStart = source.indexOf("} else if (mode === 'rain') {");
const snowStart = source.indexOf("} else if (mode === 'snow') {", rainStart);
assert.ok(rainStart >= 0 && snowStart > rainStart, 'Could not isolate rain pose');
const rainPose = source.slice(rainStart, snowStart);
assert.ok(rainPose.includes('right.shoulder.rotation.z = 2.72'), 'Umbrella holder must raise the arm mostly vertically');
assert.ok(rainPose.includes('right.elbow.rotation.z = -0.12'), 'The holding elbow must have a gentle in-plane bend');
assert.ok(rainPose.includes('right.elbow.rotation.x = -0.04'), 'The forearm must avoid an exaggerated twist');
assert.ok(!rainPose.includes('right.shoulder.rotation.z = 2.05'), 'Remove the old overly outward umbrella pose');

// Snow accessories now follow head movement rather than floating in world space.
assert.ok(source.includes('accessories.hat = sphere(head,'), 'Snow cap must be parented to the head');
assert.ok(source.includes('accessories.hatBrim = sphere(head,'), 'Snow cap needs a soft fitted brim');
assert.ok(source.includes("accessories.hatBrim.visible = mode === 'snow'"), 'Snow brim must follow the snow activity visibility contract');
assert.ok(source.includes('accessories.hatPom = sphere(head,'), 'Snow pom-pom must move with the head');
assert.ok(source.includes('accessories.scarf = sphere(root, 0xd87875, [0, 1.385'), 'Scarf must sit close to the neck');

// Character identities and the shared animation contract remain unchanged.
for (const id of ['red', 'lady', 'blue']) assert.ok(source.includes(`person.id === '${id}'`));
assert.ok(source.includes("from './resident-activity-framework.mjs'"));
assert.ok(source.includes('function createResidents3D('));
assert.ok(source.includes("powerPreference: 'low-power'"));
assert.ok(source.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"));

console.log('Residents 3D wardrobe fit, hand-held rain props and head-mounted snow accessories passed.');
