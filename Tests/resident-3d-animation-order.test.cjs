const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const enginePath = path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs');
const source = fs.readFileSync(enginePath, 'utf8');
const animateStart = source.indexOf('function animate(now) {');
assert.ok(animateStart >= 0, 'Missing Residents animation loop');

const actorLoopStart = source.indexOf('actors.forEach((actor, index) => {', animateStart);
assert.ok(actorLoopStart > animateStart, 'Missing per-resident animation pass');
const actorLoopEnd = source.indexOf('\n    });', actorLoopStart);
assert.ok(actorLoopEnd > actorLoopStart, 'Could not isolate per-resident animation pass');
const actorLoop = source.slice(actorLoopStart, actorLoopEnd);

const declaration = actorLoop.indexOf('const environmentMotion = activityFramework.environment.sample(mode, elapsed, index, state);');
assert.ok(declaration >= 0, 'Environment motion must be sampled once for each resident');
for (const property of ['environmentMotion.fabricSway', 'environmentMotion.accessorySway', 'environmentMotion.hairSway']) {
  const read = actorLoop.indexOf(property);
  assert.ok(read >= 0, `Missing environment motion use: ${property}`);
  assert.ok(declaration < read, `${property} is read before environmentMotion is initialized`);
}
assert.equal(actorLoop.match(/const environmentMotion =/g)?.length, 1, 'Sample environment motion only once per resident pass');

console.log('Residents 3D animation variable-order regression passed.');
