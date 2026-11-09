const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const enginePath = path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs');
const source = fs.readFileSync(enginePath, 'utf8');

assert.ok(source.includes('function getPlayBeat(time, actors)'), 'Missing shared-play timing helper');
assert.ok(source.includes('poseActor(actor, mode, elapsed, index, state, playBeat);'), 'The same play beat must drive all three residents');
assert.ok(source.includes('props.ball.position.set(playBeat.ballX, playBeat.ballY, 0.36);'), 'The ball must use the shared interaction path');
assert.ok(source.includes('const footIndex = receiving ? (index === 0 ? 1 : 0) : (index === 2 ? 0 : 1);'), 'Passers and receivers must use their appropriate inside feet');
assert.ok(source.includes("mode === 'play' ? 4.0 : 3.35"), 'Play gait should remain gentler than walking');

const playStart = source.indexOf("} else if (mode === 'play' || mode === 'walk') {");
const rainStart = source.indexOf("} else if (mode === 'rain') {", playStart);
assert.ok(playStart >= 0 && rainStart > playStart, 'Could not isolate the play pose');
const playPose = source.slice(playStart, rainStart);
assert.ok(playPose.includes('right.shoulder.rotation.z = 0.16'), 'Red should keep the near arm relaxed');
assert.ok(playPose.includes('left.shoulder.rotation.z = -0.15'), 'The lady should keep her arms close for balance');
assert.ok(playPose.includes('left.shoulder.rotation.z = -0.18'), 'Blue should keep the near arm relaxed');
assert.ok(!playPose.includes('right.shoulder.rotation.z = 0.50'), 'Remove the old reaching gesture');
assert.ok(!playPose.includes('left.shoulder.rotation.z = -0.68'), 'Remove the old reaching gesture');

const start = source.indexOf('function getPlayBeat(time, actors) {');
const end = source.indexOf('\nfunction poseActor(', start);
assert.ok(start >= 0 && end > start, 'Could not isolate the pure play-beat helper');
const helperSource = `${source.slice(start, end)}\ngetPlayBeat`;
const getPlayBeat = vm.runInNewContext(helperSource, {});
const actors = [{ baseX: -1.25 }, { baseX: 0 }, { baseX: 1.25 }];
const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not near ${expected}`);

// Red waits for contact, then the ball travels smoothly to the lady.
const redKick = getPlayBeat(0.17, actors);
assert.equal(redKick.fromIndex, 0);
assert.equal(redKick.toIndex, 1);
assert.ok(redKick.kick > 0.99, 'Red should initiate the first pass');
near(redKick.ballX, -1.25);
const preLaunch = getPlayBeat(0.25, actors);
near(preLaunch.ballX, -1.25);
const midpoint = getPlayBeat(0.28 + 1.40 / 2, actors);
assert.ok(midpoint.ballX > -1.25 && midpoint.ballX < 0, 'First pass should travel between Red and the lady');
const ladyReceive = getPlayBeat(0.28 + 1.40, actors);
near(ladyReceive.ballX, 0);
assert.ok(ladyReceive.receive > 0.99, 'The lady should react as the ball arrives');
const receivePause = getPlayBeat(1.95, actors);
near(receivePause.ballX, 0);
assert.equal(receivePause.receive, 0, 'The receiving pause should settle before the next kick');

// Lady -> Blue -> Red: sender/receiver roles rotate without breaking the loop.
const ladyKick = getPlayBeat(2.25 + 0.17, actors);
assert.equal(ladyKick.fromIndex, 1);
assert.equal(ladyKick.toIndex, 2);
near(ladyKick.ballX, 0);
const blueKick = getPlayBeat(4.50 + 0.17, actors);
assert.equal(blueKick.fromIndex, 2);
assert.equal(blueKick.toIndex, 0);
near(blueKick.ballX, 1.25);
const nextCycle = getPlayBeat(6.75 + 0.17, actors);
near(nextCycle.ballX, redKick.ballX);
assert.ok(nextCycle.ballY >= 0.112 && nextCycle.ballY <= 0.160, 'Ball should stay at foot level with only a soft lift');

// The responsive actor coordinates must determine the path on any layout.
const narrowActors = [{ baseX: -0.82 }, { baseX: 0 }, { baseX: 0.82 }];
const narrowMidpoint = getPlayBeat(0.28 + 0.70, narrowActors);
assert.ok(narrowMidpoint.ballX > -0.82 && narrowMidpoint.ballX < 0, 'Pass must adapt to narrower actor spacing');

console.log('Residents 3D refined play interaction checks passed.');
