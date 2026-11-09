const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const modulePath = path.join(__dirname, '..', 'Residents', 'resident-activity-framework.mjs');
  const { createResidentsActivityFramework } = await import(pathToFileURL(modulePath).href);
  const framework = createResidentsActivityFramework();

  const expectedActivities = [
    'calm', 'morning', 'play', 'walk', 'rain', 'snow', 'heat', 'wind',
    'stargaze', 'kite', 'garden', 'festival', 'picnic', 'camping'
  ];
  assert.deepEqual(framework.getActivityIds(), expectedActivities);
  assert.equal(framework.getActivity('play').interaction, 'ball-exchange');
  assert.deepEqual(framework.getActivity('play').gait, { speed: 4.0, stride: 0.33, bounce: 0.045 });
  assert.equal(framework.getActivity('walk').interaction, null);
  assert.equal(framework.getActivity('unknown'), null);

  for (const id of ['red', 'lady', 'blue']) {
    assert.ok(framework.getPersonality(id).name, `Missing personality profile for ${id}`);
  }
  assert.equal(framework.getPersonality('red').footEnergy, 1);
  assert.equal(framework.getPersonality('lady').footEnergy, 0.72);
  assert.equal(framework.getPersonality('blue').footEnergy, 0.88);

  const gaitActor = {
    root: { position: { y: 0 } },
    head: { rotation: { y: 0, z: 0 } },
    legs: Array.from({ length: 2 }, () => ({ hip: { rotation: { x: 0 } }, knee: { rotation: { x: 0 } }, ankle: { rotation: { x: 0 } } })),
    arms: Array.from({ length: 2 }, () => ({ shoulder: { rotation: { x: 0 } }, elbow: { rotation: { x: 0 } } }))
  };
  framework.movement.applyGait(gaitActor, 0.5, 1, framework.getActivity('play').gait);
  assert.notEqual(gaitActor.legs[0].hip.rotation.x, 0, 'Shared gait should animate articulated leg joints');
  assert.notEqual(gaitActor.arms[0].shoulder.rotation.x, 0, 'Shared gait should counter-swing the arms');
  assert.ok(Number.isFinite(gaitActor.root.position.y));

  const actor = (id, baseX) => ({
    person: { id },
    baseX,
    root: { position: { y: 0 }, rotation: { z: 0 } },
    head: { rotation: { x: 0, y: 0, z: 0 } },
    legs: Array.from({ length: 2 }, () => ({
      hip: { rotation: { x: 0 } },
      knee: { rotation: { x: 0 } },
      ankle: { rotation: { x: 0 } }
    }))
  });

  const red = actor('red', -1.25);
  const lady = actor('lady', 0);
  const blue = actor('blue', 1.25);
  const exchange = { fromIndex: 0, toIndex: 1, fromX: -1.25, toX: 0, ballX: -1.25, kick: 1, receive: 0 };
  const redResponse = framework.interactions.applyBallResponse(red, 0, exchange);
  assert.equal(redResponse.passing, true);
  assert.ok(red.legs[1].hip.rotation.x < 0, 'Passer should move the selected inside foot');
  assert.ok(red.root.position.y > 0, 'Red personality should retain its light energetic follow-through');
  const ladyResponse = framework.interactions.applyBallResponse(lady, 1, { ...exchange, kick: 0, receive: 1, ballX: 0 });
  assert.equal(ladyResponse.receiving, true);
  assert.ok(lady.legs[0].knee.rotation.x > 0, 'Receiver should cushion the incoming ball');
  const blueResponse = framework.interactions.applyBallResponse(blue, 2, { fromIndex: 2, toIndex: 0, fromX: 1.25, toX: -1.25, ballX: 1.25, kick: 1, receive: 0 });
  assert.equal(blueResponse.passing, true);
  assert.equal(blueResponse.footIndex, 0, 'Pass foot must follow the ball direction, even when the group order reverses');

  const calm = framework.environment.sample('calm', 1, 0, {});
  const wind = framework.environment.sample('wind', 1, 0, { gustLevel: 'strong' });
  assert.ok(Math.abs(wind.hairSway) > Math.abs(calm.hairSway));
  assert.ok(Math.abs(wind.fabricSway) > Math.abs(calm.fabricSway));
  assert.equal(wind.windLean, 1);

  console.log('Residents Activity Framework: registry, movement profiles, personality, interaction and environment tests passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
