const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const enginePath = path.join(__dirname, '..', 'Residents', 'resident-3d-engine.mjs');
  const frameworkPath = path.join(__dirname, '..', 'Residents', 'resident-activity-framework.mjs');
  const source = fs.readFileSync(enginePath, 'utf8');
  assert.ok(source.includes("import { createResidentsActivityFramework } from './resident-activity-framework.mjs'"), 'The 3D engine must use the shared activity framework');
  assert.ok(source.includes('activityFramework.interactions.applyBallResponse(actor, index, playBeat)'), 'Evening Play must use shared interaction responses');
  assert.ok(source.includes('activityFramework.environment.sample(mode, elapsed, index, state)'), 'Activity rendering must use shared environment reactions');
  assert.ok(source.includes('activityFramework.movement.applyGait(actor, time, index, profile)'), 'Locomotion must use the shared movement engine');

  const playStart = source.indexOf("} else if (mode === 'play' || mode === 'walk') {");
  const rainStart = source.indexOf("} else if (mode === 'rain') {", playStart);
  assert.ok(playStart >= 0 && rainStart > playStart, 'Could not isolate the play pose');
  const playPose = source.slice(playStart, rainStart);
  assert.ok(playPose.includes('right.shoulder.rotation.z = 0.16'), 'Red should keep the near arm relaxed');
  assert.ok(playPose.includes('left.shoulder.rotation.z = -0.15'), 'The lady should keep her arms close for balance');
  assert.ok(playPose.includes('left.shoulder.rotation.z = -0.18'), 'Blue should keep the near arm relaxed');
  assert.ok(!playPose.includes('right.shoulder.rotation.z = 0.50'), 'Remove the old reaching gesture');
  assert.ok(!playPose.includes('left.shoulder.rotation.z = -0.68'), 'Remove the old reaching gesture');

  const { createResidentsActivityFramework } = await import(pathToFileURL(frameworkPath).href);
  const framework = createResidentsActivityFramework();
  const getBallExchange = framework.interactions.getBallExchange;
  const actors = [{ baseX: -1.25 }, { baseX: 0 }, { baseX: 1.25 }];
  const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not near ${expected}`);

  const redKick = getBallExchange(0.17, actors);
  assert.equal(redKick.fromIndex, 0);
  assert.equal(redKick.toIndex, 1);
  assert.ok(redKick.kick > 0.99, 'Red should initiate the first pass');
  near(redKick.ballX, -1.25);
  near(getBallExchange(0.25, actors).ballX, -1.25);
  const midpoint = getBallExchange(0.28 + 1.40 / 2, actors);
  assert.ok(midpoint.ballX > -1.25 && midpoint.ballX < 0, 'First pass should travel between Red and the lady');
  const ladyReceive = getBallExchange(0.28 + 1.40, actors);
  near(ladyReceive.ballX, 0);
  assert.ok(ladyReceive.receive > 0.99, 'The lady should react as the ball arrives');
  const receivePause = getBallExchange(1.95, actors);
  near(receivePause.ballX, 0);
  assert.equal(receivePause.receive, 0, 'The receiving pause should settle before the next kick');

  const ladyKick = getBallExchange(2.25 + 0.17, actors);
  assert.equal(ladyKick.fromIndex, 1);
  assert.equal(ladyKick.toIndex, 2);
  near(ladyKick.ballX, 0);
  const blueKick = getBallExchange(4.50 + 0.17, actors);
  assert.equal(blueKick.fromIndex, 2);
  assert.equal(blueKick.toIndex, 0);
  near(blueKick.ballX, 1.25);
  near(getBallExchange(6.75 + 0.17, actors).ballX, redKick.ballX);
  assert.ok(redKick.ballY >= 0.112 && redKick.ballY <= 0.160, 'Ball should remain at foot level with only a soft lift');

  const narrowActors = [{ baseX: -0.82 }, { baseX: 0 }, { baseX: 0.82 }];
  const narrowMidpoint = getBallExchange(0.28 + 0.70, narrowActors);
  assert.ok(narrowMidpoint.ballX > -0.82 && narrowMidpoint.ballX < 0, 'Pass must adapt to narrower actor spacing');

  console.log('Residents 3D shared-framework play integration passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
