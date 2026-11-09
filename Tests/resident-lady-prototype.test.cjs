const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const library = read('Residents/resident-library.js');
const preview = read('Residents/resident-lady-gltf-preview.mjs');
const engine = read('Residents/resident-3d-engine.mjs');
const modelPath = path.join(root, 'Residents/assets/little-lady-prototype-v02.glb');
const glb = fs.readFileSync(modelPath);

// The existing production engine remains procedural and does not acquire a
// model-loader dependency. The GLB preview is an explicit opt-in branch only.
assert.ok(library.includes("new URLSearchParams(window.location.search).get('residentPrototype') === 'little-lady'"));
assert.ok(library.includes("const useLittleLadyPrototype = prototypeRequested()"));
assert.ok(library.includes('module.createLittleLadyPrototype(canvas, state.activity)'));
assert.ok(library.includes('module.createResidents3D(canvas, engineRoster, state.activity)'));
assert.ok(library.includes('restoring the original three-Resident renderer'));
assert.ok(library.includes('state.engine?.dispose()'), 'Failed prototype resources must be disposed before fallback');
assert.ok(library.includes('host.replaceChildren(fallbackCanvas)'), 'The protected renderer must receive a fresh canvas after prototype context loss');
assert.ok(library.includes("renderer: 'threejs-procedural-3d'"), 'The public renderer contract remains stable');
assert.ok(library.includes("const VERSION = '1.3.0'"), 'The Weather loader version remains stable');
assert.ok(!engine.includes('GLTFLoader'), 'The production procedural renderer remains isolated from GLTFLoader');
assert.ok(engine.includes('sphere(eye, COLORS.eye,'), 'The existing CI eye-colour implementation mismatch is corrected');

// The optional preview pins its loader to the application's exact Three.js r180
// runtime and rewrites imports to the same-origin module rather than loading a
// second Three.js instance.
assert.ok(preview.includes('three@0.180.0/examples/jsm/loaders/GLTFLoader.js'));
assert.ok(preview.includes("new URL('./vendor/three.module.js', document.baseURI).href"));
assert.ok(library.includes('live-earth-resident-prototype-v1'), 'The prototype module source must have a durable offline cache');
assert.ok(library.includes('resident-lady-gltf-preview-v149.mjs'));
assert.ok(library.includes('URL.createObjectURL(new Blob([rewritten]'), 'The cached preview source must be imported from a Blob module');
assert.ok(library.includes('const rewritten = source.replace(threeImport'), 'Preview module must resolve Three.js to the app-local runtime');
assert.ok(preview.includes('GLTFLoader-r180.js'));
assert.ok(preview.includes('CacheStorage') || preview.includes('caches.open'));
assert.ok(preview.includes('LittleLady_Prototype_0.2.glb'));
assert.ok(preview.includes('createLittleLadyPrototype'));
assert.ok(preview.includes('AnimationMixer'));
assert.ok(preview.includes('renderer.forceContextLoss?.()'));
assert.ok(preview.includes("'(prefers-reduced-motion: reduce)'"));

// Validate the actual binary GLB header and JSON chunk, then check model payload.
assert.equal(glb.toString('ascii', 0, 4), 'glTF', 'GLB magic header must be present');
assert.equal(glb.readUInt32LE(4), 2, 'GLB version must be 2');
assert.equal(glb.readUInt32LE(8), glb.byteLength, 'GLB declared length must match the file');
let offset = 12;
let documentJson = null;
const chunks = [];
let binaryChunk = null;
while (offset + 8 <= glb.byteLength) {
  const length = glb.readUInt32LE(offset);
  const type = glb.readUInt32LE(offset + 4);
  const start = offset + 8;
  const end = start + length;
  assert.ok(end <= glb.byteLength, 'GLB chunk must remain within the file');
  chunks.push({ type, start, end, length });
  if (type === 0x4e4f534a) documentJson = JSON.parse(glb.toString('utf8', start, end).trim());
  if (type === 0x004e4942) binaryChunk = { start, end, length };
  offset = end;
}
assert.equal(offset, glb.byteLength, 'GLB chunks must cover the declared file');
assert.ok(documentJson, 'GLB must contain a JSON chunk');
assert.equal(documentJson.asset.version, '2.0');
assert.equal(documentJson.skins?.length, 1, 'Little Lady must have one reusable skin');
assert.equal(documentJson.skins[0].joints.length, 20, 'The prototype rig must retain its 20-joint skeleton');
const jointNames = documentJson.skins[0].joints.map(index => documentJson.nodes[index]?.name);
for (const name of ['root', 'pelvis', 'spine', 'chest', 'neck', 'head', 'upperArm_L', 'forearm_L', 'hand_L', 'upperArm_R', 'forearm_R', 'hand_R', 'thigh_L', 'calf_L', 'foot_L', 'thigh_R', 'calf_R', 'foot_R']) {
  assert.ok(jointNames.includes(name), `Missing required prototype bone: ${name}`);
}
assert.equal(documentJson.animations?.length, 3, 'The prototype must include its three review clips');
const clipNames = documentJson.animations.map(clip => clip.name);
for (const name of ['Idle_Breath_and_Gaze', 'Walk_In_Place', 'Smile_Expression']) {
  assert.ok(clipNames.includes(name), `Missing required animation clip: ${name}`);
}
assert.equal(documentJson.images?.length, 9, 'All nine image textures must be embedded in the GLB');
assert.ok(documentJson.images.every(image => Number.isInteger(image.bufferView)), 'Every image must be embedded, not a remote URL');
assert.ok(documentJson.meshes?.length >= 1);

const skinWeightAccessors = [];
for (const mesh of documentJson.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    if (primitive.attributes?.WEIGHTS_0 !== undefined) {
      skinWeightAccessors.push(documentJson.accessors[primitive.attributes.WEIGHTS_0]);
    }
  }
}
assert.ok(skinWeightAccessors.length > 0, 'Skinned meshes must contain vertex weights');
assert.ok(skinWeightAccessors.every(accessor => accessor.type === 'VEC4' && accessor.componentType === 5126));
assert.ok(binaryChunk, 'GLB must include a binary geometry/texture chunk');
for (const accessor of skinWeightAccessors) {
  const view = documentJson.bufferViews[accessor.bufferView];
  const stride = view.byteStride || 16;
  const start = binaryChunk.start + (view.byteOffset || 0) + (accessor.byteOffset || 0);
  for (let vertex = 0; vertex < accessor.count; vertex++) {
    const base = start + vertex * stride;
    const sum = glb.readFloatLE(base) + glb.readFloatLE(base + 4) + glb.readFloatLE(base + 8) + glb.readFloatLE(base + 12);
    assert.ok(Math.abs(sum - 1) < 0.015, `Vertex skin weights must normalize to 1 (got ${sum})`);
  }
}

console.log('Little Lady GLB preview checks passed: opt-in routing, protected fallback, r180 loader contract, embedded textures, skeleton, animation clips and skin weights.');
