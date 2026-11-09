const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const enginePath = path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs');
const source = fs.readFileSync(enginePath, 'utf8');

assert.ok(source.includes('function getPlayBeat(time, actors)'), 'Missing shared-play timing helper');
assert.ok(source.includes('poseActor(actor, mode, elapsed, index, state, playBeat);'), 'The same play beat must drive all three residents');
assert.ok(source.includes('props.ball.position.set(playBeat.ballX, playBeat.ballY, 0.36);'), 'The ball must use the shared interaction path');
assert.ok(source.includes('const insideLeg = actor.legs[index === 2 ? 0 : 1];'), 'Each resident must use the inward foot for the pass');
assert.ok(source.includes("mode === 'play' ? 4.0 : 3.35"), 'Play gait should be gentler than walking');

const start = source.indexOf('function getPlayBeat(time, actors) {');
const end = source.indexOf('\nfunction poseActor(', start);
assert.ok(start >= 0 && end > start, 'Could not isolate the pure play-beat helper');
const helperSource = `${source.slice(start, end)}\ngetPlayBeat`;
const getPlayBeat = vm.runInNewContext(helperSource, {});
const actors = [{ baseX: -1.25 }, { baseX: 0 }, { baseX: 1.25 }];
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not near ${expected}`);

// Red -> Lady: kickoff, smooth travel and a soft receive at the centre.
const redKick = getPlayBeat(0.14, actors);
assert.equal(redKick.fromIndex, 0);
assert.equal(redKick.toIndex, 1);
assert.ok(redKick.kick > 0.99, 'Red should initiate the first pass');
const midpoint = getPlayBeat(0.14 + 1.48 / 2, actors);
assert.ok(midpoint.ballX > -1.25 && midpoint.ballX < 0, 'First pass should travel between Red and the lady');
const ladyReceive = getPlayBeat(1.48, actors);
near(ladyReceive.ballX, 0);
assert.ok(ladyReceive.receive > 0.99, 'The lady should react as the ball arrives');

// Lady -> Blue -> Red: the direction and receiver rotate through the trio.
const ladyKick = getPlayBeat(2.05 + 0.14, actors);
assert.equal(ladyKick.fromIndex, 1);
assert.equal(ladyKick.toIndex, 2);
assert.ok(ladyKick.ballX >= 0 && ladyKick.ballX <= 1.25);
const blueKick = getPlayBeat(4.10 + 0.14, actors);
assert.equal(blueKick.fromIndex, 2);
assert.equal(blueKick.toIndex, 0);
assert.ok(blueKick.ballX <= 1.25 && blueKick.ballX >= -1.25);
const nextCycle = getPlayBeat(6.15 + 0.14, actors);
near(nextCycle.ballX, redKick.ballX);
assert.ok(nextCycle.ballY >= 0.145 && nextCycle.ballY <= 0.21, 'Ball should stay close to foot level');

console.log('Residents 3D play interaction checks passed.');
