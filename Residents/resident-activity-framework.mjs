/* LIVE // EARTH — Residents Shared Activity Framework
 * Shared, data-driven movement, personality, interaction and environment
 * primitives for procedural Residents activities. Activity-specific scenes
 * remain in resident-3d-engine.mjs; new activities should compose these
 * primitives instead of introducing another private movement system.
 */

const ACTIVITY_DEFINITIONS = Object.freeze({
  calm: Object.freeze({ movement: 'idle', interaction: null, environment: 'calm' }),
  morning: Object.freeze({ movement: 'gesture', interaction: null, environment: 'calm' }),
  play: Object.freeze({
    movement: 'locomotion',
    gait: Object.freeze({ speed: 4.0, stride: 0.33, bounce: 0.045 }),
    interaction: 'ball-exchange',
    environment: 'outdoor'
  }),
  walk: Object.freeze({
    movement: 'locomotion',
    gait: Object.freeze({ speed: 3.35, stride: 0.40, bounce: 0.025 }),
    interaction: null,
    environment: 'outdoor'
  }),
  rain: Object.freeze({ movement: 'weather-gesture', interaction: null, environment: 'rain' }),
  snow: Object.freeze({ movement: 'weather-gesture', interaction: null, environment: 'snow' }),
  heat: Object.freeze({ movement: 'weather-gesture', interaction: null, environment: 'heat' }),
  wind: Object.freeze({ movement: 'weather-lean', interaction: null, environment: 'wind' }),
  stargaze: Object.freeze({ movement: 'look-up', interaction: null, environment: 'night' }),
  kite: Object.freeze({ movement: 'reach-and-guide', interaction: 'kite', environment: 'wind' }),
  garden: Object.freeze({ movement: 'bend-and-reach', interaction: 'watering-can', environment: 'calm' }),
  festival: Object.freeze({ movement: 'dance', interaction: null, environment: 'celebration' }),
  picnic: Object.freeze({ movement: 'sit', interaction: 'picnic', environment: 'calm' }),
  camping: Object.freeze({ movement: 'sit', interaction: 'campfire', environment: 'night' })
});

const PERSONALITIES = Object.freeze({
  red: Object.freeze({ name: 'eager', footEnergy: 1, bodyFollowThrough: 1, gazeLead: 0.14 }),
  lady: Object.freeze({ name: 'light', footEnergy: 0.72, bodyFollowThrough: 0.82, gazeLead: 0.14 }),
  blue: Object.freeze({ name: 'gentle', footEnergy: 0.88, bodyFollowThrough: 0.92, gazeLead: 0.14 })
});

const DEFAULT_EXCHANGE = Object.freeze({
  segmentDuration: 2.25,
  kickTime: 0.17,
  launchTime: 0.28,
  travelDuration: 1.40,
  receiveWidth: 0.19,
  groundHeight: 0.112,
  arcHeight: 0.048
});

function applyGait(actor, time, index, profile = {}) {
  const speed = profile.speed ?? 3.7;
  const stride = profile.stride ?? 0.48;
  const bounce = profile.bounce ?? 0.035;
  const phase = time * speed + index * 1.25;
  const swing = Math.sin(phase);
  const lift = Math.max(0, Math.cos(phase));
  actor.legs[0].hip.rotation.x = swing * stride;
  actor.legs[1].hip.rotation.x = -swing * stride;
  actor.legs[0].knee.rotation.x = lift * 0.48;
  actor.legs[1].knee.rotation.x = Math.max(0, -Math.cos(phase)) * 0.48;
  actor.legs[0].ankle.rotation.x = -actor.legs[0].knee.rotation.x * 0.62;
  actor.legs[1].ankle.rotation.x = -actor.legs[1].knee.rotation.x * 0.62;
  actor.arms[0].shoulder.rotation.x = -swing * 0.46;
  actor.arms[1].shoulder.rotation.x = swing * 0.46;
  actor.arms[0].elbow.rotation.x = 0.14 + lift * 0.12;
  actor.arms[1].elbow.rotation.x = 0.14 + (1 - lift) * 0.12;
  actor.root.position.y = bounce * Math.max(0, Math.sin(phase * 2));
  actor.head.rotation.y = Math.sin(phase * 0.5) * 0.12;
  actor.head.rotation.z = Math.sin(phase) * 0.025;
}

function getBallExchange(time, actors, options = {}) {
  if (!Array.isArray(actors) || actors.length < 2) {
    throw new TypeError('Ball exchange requires at least two positioned actors.');
  }
  const config = { ...DEFAULT_EXCHANGE, ...options };
  const cycleDuration = config.segmentDuration * actors.length;
  const cycleTime = ((time % cycleDuration) + cycleDuration) % cycleDuration;
  const fromIndex = Math.floor(cycleTime / config.segmentDuration);
  const localTime = cycleTime - fromIndex * config.segmentDuration;
  const toIndex = (fromIndex + 1) % actors.length;
  const progress = Math.min(1, Math.max(0, (localTime - config.launchTime) / config.travelDuration));
  const eased = progress * progress * (3 - 2 * progress);
  const fromX = actors[fromIndex].baseX;
  const toX = actors[toIndex].baseX;
  const receiveTime = config.launchTime + config.travelDuration;

  return Object.freeze({
    fromIndex,
    toIndex,
    fromX,
    toX,
    progress,
    ballX: fromX + (toX - fromX) * eased,
    ballY: config.groundHeight + Math.sin(progress * Math.PI) * config.arcHeight,
    kick: Math.max(0, 1 - Math.abs(localTime - config.kickTime) / 0.15),
    receive: Math.max(0, 1 - Math.abs(localTime - receiveTime) / config.receiveWidth)
  });
}

function applyBallResponse(actor, index, beat) {
  if (!beat) return null;
  const personality = PERSONALITIES[actor.person?.id] || PERSONALITIES.blue;
  const lookX = Math.max(-0.17, Math.min(0.17, (beat.ballX - actor.baseX) * personality.gazeLead));
  actor.head.rotation.y = actor.head.rotation.y * 0.55 + lookX * 0.45;

  const passing = beat.fromIndex === index;
  const receiving = beat.toIndex === index;
  const touch = passing ? beat.kick : receiving ? beat.receive : 0;
  if (touch <= 0) return { passing, receiving, touch: 0 };

  // Select the foot on the ball-facing side from world-space direction. This
  // works for any actor count/order, not only the current three-person loop.
  const otherX = passing ? beat.toX : beat.fromX;
  const footIndex = Number.isFinite(otherX) ? (otherX >= actor.baseX ? 1 : 0) : (index === 2 ? 0 : 1);
  const insideLeg = actor.legs[footIndex];
  if (passing) {
    insideLeg.hip.rotation.x -= touch * 0.34 * personality.footEnergy;
    insideLeg.knee.rotation.x = Math.max(insideLeg.knee.rotation.x, touch * 0.24 * personality.footEnergy);
    insideLeg.ankle.rotation.x += touch * 0.14 * personality.footEnergy;
  } else {
    insideLeg.hip.rotation.x += touch * 0.13 * personality.footEnergy;
    insideLeg.knee.rotation.x = Math.max(insideLeg.knee.rotation.x, touch * 0.36 * personality.footEnergy);
    insideLeg.ankle.rotation.x -= touch * 0.16 * personality.footEnergy;
    actor.head.rotation.x += touch * 0.045 * personality.bodyFollowThrough;
  }

  if (actor.person?.id === 'red') {
    actor.root.position.y += touch * (passing ? 0.022 : 0.008);
    actor.head.rotation.z += touch * 0.03;
  } else if (actor.person?.id === 'lady') {
    actor.root.rotation.z += touch * (passing ? 0.022 : -0.018);
  } else {
    actor.head.rotation.z -= touch * 0.035;
  }
  return { passing, receiving, touch, footIndex };
}

function sampleEnvironment(mode, time, index, state = {}) {
  const phase = time * 2.15 + index * 1.73;
  const windy = mode === 'wind';
  const gust = state.gustLevel === 'strong' ? 1 : 0.5;
  return Object.freeze({
    hairSway: Math.sin(time * 1.45 + index * 2.15) * (windy ? 0.06 : 0.018),
    fabricSway: Math.sin(phase * 0.8) * (windy ? 0.075 : 0.026),
    accessorySway: Math.sin(phase * 1.1) * 0.035,
    windLean: windy ? gust : 0
  });
}

export function createResidentsActivityFramework() {
  return Object.freeze({
    getActivity(mode) {
      return ACTIVITY_DEFINITIONS[mode] || null;
    },
    getActivityIds() {
      return Object.keys(ACTIVITY_DEFINITIONS);
    },
    getPersonality(id) {
      return PERSONALITIES[id] || PERSONALITIES.blue;
    },
    movement: Object.freeze({ applyGait }),
    interactions: Object.freeze({ getBallExchange, applyBallResponse }),
    environment: Object.freeze({ sample: sampleEnvironment })
  });
}
