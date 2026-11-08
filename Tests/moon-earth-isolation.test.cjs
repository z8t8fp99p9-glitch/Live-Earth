const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'Home', 'moon-orbit.js');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/^export function /gm, 'function ');

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  copy(value) { this.x = value.x; this.y = value.y; this.z = value.z; return this; }
}
class Node3D {
  constructor() { this.children = []; this.parent = null; this.rotation = { x: 0, y: 0, z: 0 }; this.position = new Vector3(); }
  add(child) { child.parent = this; this.children.push(child); return this; }
  remove(child) { this.children = this.children.filter(item => item !== child); child.parent = null; }
}
class Geometry {
  constructor(radius = 0) { this.type = 'SphereGeometry'; this.parameters = { radius }; this.disposed = false; }
  setFromPoints(points) { this.points = points; return this; }
  setAttribute(name, value) { this[name] = value; return this; }
  dispose() { this.disposed = true; }
}
class Material { constructor(options = {}) { Object.assign(this, options); this.disposed = false; } dispose() { this.disposed = true; } }
class Mesh extends Node3D { constructor(geometry, material) { super(); this.isMesh = true; this.geometry = geometry; this.material = material; } }
class TextureLoader { load() { return { colorSpace: null, anisotropy: 1, dispose() {} }; } }
class Attribute { constructor(array, size) { this.array = array; this.itemSize = size; } }
class Line extends Node3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class Points extends Line {}
const THREE = {
  Group: Node3D, Vector3, BufferGeometry: Geometry, Float32BufferAttribute: Attribute,
  Line, Points, LineBasicMaterial: Material, PointsMaterial: Material,
  SphereGeometry: Geometry, Mesh, MeshStandardMaterial: Material, TextureLoader,
  SRGBColorSpace: 'srgb', AdditiveBlending: 2
};
const sandbox = { Math, Date, THREE };
vm.runInNewContext(`${source}\nglobalThis.__createMoonOrbit = createMoonOrbit;`, sandbox);

const earthGroup = new Node3D();
const earthSurface = new Mesh(new Geometry(1), new Material());
earthSurface.rotation.y = -0.35;
earthGroup.add(earthSurface);
const initialEarthRotation = { ...earthSurface.rotation };
const initialGroupRotation = { ...earthGroup.rotation };
const moonSystem = sandbox.__createMoonOrbit(THREE, earthGroup, { samples: 5, earthRadius: 1, displayDistanceFactor: 0.04, displayMoonRadius: 0.32 });
assert.deepEqual(earthSurface.rotation, initialEarthRotation, 'Creating Moon Orbit must not rotate the Earth surface.');
assert.deepEqual(earthGroup.rotation, initialGroupRotation, 'Creating Moon Orbit must not rotate the Earth group.');

const first = moonSystem.update(new Date('2026-11-08T00:00:00Z'));
const firstMoonPosition = { ...moonSystem.moon.position };
const second = moonSystem.update(new Date('2026-11-09T00:00:00Z'));
assert.notDeepEqual(firstMoonPosition, moonSystem.moon.position, 'Moon updates must continue moving the Moon.');
assert.notDeepEqual(first, second, 'The orbital calculation must advance with time.');
assert.deepEqual(earthSurface.rotation, initialEarthRotation, 'Timed Moon updates must not rotate the Earth surface.');
assert.deepEqual(earthGroup.rotation, initialGroupRotation, 'Timed Moon updates must not rotate the Earth group.');
assert.equal(earthSurface.parent, earthGroup, 'The original Home Earth surface object and parent relationship must remain intact.');
moonSystem.destroy();
console.log('Moon/Earth isolation tests passed.');
