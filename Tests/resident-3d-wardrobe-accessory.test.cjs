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
assert.ok(source.includes('details.frontPanel = curvedFabricPanel'), 'Blue Jacket Boy must retain his fitted jacket insert');
assert.ok(source.includes('const skirt = new THREE.Mesh(residentSkirtGeometry'), 'Little Lady must retain her shaped skirt shell');

// Rain umbrellas attach to the right palm and follow the raised holding arm.
assert.ok(source.includes('function createUmbrella(parent, color, heldInHand = false)'), 'Umbrella needs a hand-mounted mode');
assert.ok(source.includes('createUmbrella(arms[1].hand,'), 'Rain umbrella must be parented to the right hand');
assert.ok(source.includes('heldInHand ? 0.48 : 2.18'), 'Hand-mounted umbrella handle must meet the palm');
const rainStart = source.indexOf("} else if (mode === 'rain') {");
const snowStart = source.indexOf("} else if (mode === 'snow') {", rainStart);
assert.ok(rainStart >= 0 && snowStart > rainStart, 'Could not isolate rain pose');
const rainPose = source.slice(rainStart, snowStart);
assert.ok(rainPose.includes('right.shoulder.rotation.z = 2.05'), 'Umbrella holder must raise the arm to hold the shaft');
assert.ok(rainPose.includes('right.elbow.rotation.x = -0.32'), 'The holding elbow must remain softly bent');
assert.ok(!rainPose.includes('right.shoulder.rotation.z = 0.42'), 'Remove the old arms-down umbrella pose');

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
