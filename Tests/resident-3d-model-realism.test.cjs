const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs'), 'utf8');

// Face skin now carries very low-contrast cheek warmth in its own vertex data.
assert.ok(source.includes('function skinFaceMat('), 'Head needs a dedicated vertex-colour skin material');
assert.ok(source.includes('vertexColors: true'), 'Face material must consume the blended cheek colours');
assert.ok(source.includes('const vertexColors = []'), 'Head geometry needs per-vertex skin colour data');
assert.ok(source.includes('baseSkin.clone().lerp(cheekWarmth, warmth)'), 'Cheek warmth must softly blend into base skin');
assert.ok(source.includes('shape.setAttribute(\'color\', new THREE.Float32BufferAttribute(vertexColors, 3))'));
assert.ok(!source.includes('sphere(head, COLORS.cheek'), 'Remove separate pink cheek discs');

// Keep the friendly stylized identity while subtly reducing toy-like joints.
assert.ok(source.includes('head.scale.setScalar(0.965)'), 'Head/body ratio should be eased without redesigning the character');
assert.ok(source.includes('[0.061, 0.064, 0.062]'), 'Shoulder cap should blend more subtly');
assert.ok(source.includes('[0.050, 0.052, 0.052]'), 'Elbow cap should blend more subtly');
assert.ok(source.includes('[0.073, 0.070, 0.074]'), 'Hip join should not read as a separate ball');
assert.ok(source.includes('[0.057, 0.058, 0.060]'), 'Knee join should be softened');
assert.ok(source.includes('[0.057, 0.060, 0.058]'), 'Ankle join should be softened');
assert.ok(source.includes('roughness: 0.74'), 'Shoes should have a more natural matte finish');

// Slightly stronger key-to-fill ratio restores modelling without increasing renderer cost.
assert.ok(source.includes('new THREE.HemisphereLight(0xfff7ed, 0x60756d, 1.55)'));
assert.ok(source.includes('new THREE.DirectionalLight(0xffefdf, 1.90)'));
assert.ok(source.includes('new THREE.DirectionalLight(0xd4e5ff, 0.58)'));

// The new material cache must be retained between Weather mounts, like the others.
assert.ok(source.includes('const skinFaceMaterialCache = new Map()'));
assert.ok(source.includes('...skinFaceMaterialCache.values()'), 'Do not dispose the shared face material during a view remount');

// Preserve the actual runtime and animation contract.
assert.ok(source.includes("import * as THREE from '../vendor/three.module.js'"));
assert.ok(source.includes("from './resident-activity-framework.mjs'"));
assert.ok(source.includes('function poseActor('));
assert.ok(source.includes('function createResidents3D('));
assert.ok(source.includes("powerPreference: 'low-power'"));
assert.ok(source.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)')"));
assert.ok(source.includes('now - lastRender < 32'));

console.log('Residents stylized-realism checks passed: blended face colour, softened anatomy, matte footwear, light balance and cache lifecycle.');
