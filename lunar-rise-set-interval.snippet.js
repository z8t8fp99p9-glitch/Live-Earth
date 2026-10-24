/* Append this snippet to astronomy.js after its existing declarations.
   Low-precision, on-device crossing estimate; this does not claim ephemeris accuracy. */
export { moonPosition };
export function moonRiseSetInterval(lat, lon, now = new Date()) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const STEP = 5 * 60 * 1000;
  const nowMs = now.getTime();
  const from = nowMs - 36 * 60 * 60 * 1000;
  const to = nowMs + 36 * 60 * 60 * 1000;
  const events = [];
  let previousTime = from;
  let previousAltitude = moonPosition(new Date(previousTime), lat, lon).altitude;
  for (let t = from + STEP; t <= to; t += STEP) {
    const altitude = moonPosition(new Date(t), lat, lon).altitude;
    if (previousAltitude <= 0 && altitude > 0) {
      const fraction = previousAltitude / (previousAltitude - altitude);
      events.push({ type: "rise", time: previousTime + STEP * fraction });
    } else if (previousAltitude > 0 && altitude <= 0) {
      const fraction = previousAltitude / (previousAltitude - altitude);
      events.push({ type: "set", time: previousTime + STEP * fraction });
    }
    previousTime = t;
    previousAltitude = altitude;
  }
  const altitudeNow = moonPosition(now, lat, lon).altitude;
  let riseTime = null;
  let setTime = null;
  if (altitudeNow > 0) {
    for (const event of events) {
      if (event.type === "rise" && event.time <= nowMs) riseTime = event.time;
      if (event.type === "set" && event.time > nowMs) { setTime = event.time; break; }
    }
  } else {
    const rise = events.find(event => event.type === "rise" && event.time > nowMs);
    if (rise) {
      riseTime = rise.time;
      const set = events.find(event => event.type === "set" && event.time > rise.time);
      if (set) setTime = set.time;
    }
  }
  if (!Number.isFinite(riseTime) || !Number.isFinite(setTime) || setTime <= riseTime) return null;
  return {
    rise: new Date(riseTime),
    set: new Date(setTime),
    aboveHorizonNow: altitudeNow > 0,
    approximate: true
  };
}
