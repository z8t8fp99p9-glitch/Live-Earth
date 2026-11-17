const WORLDS = ['atmosphere', 'oceans', 'land', 'water-ice', 'earth-activity', 'energy-humanity'];
const DAY = 86400000;
const isoDay = value => new Date(value).toISOString().slice(0, 10);

function dailyCounts(records, now) {
  const counts = new Map();
  for (const record of records) {
    const day = isoDay(record.observedAt);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  const output = [];
  for (let offset = 364; offset >= 0; offset--) {
    const date = isoDay(new Date(now.getTime() - offset * DAY));
    output.push({ date, count: counts.get(date) || 0 });
  }
  return output;
}

export function buildPublishedSnapshots(records, now = new Date()) {
  const snapshots = {};
  for (const world of WORLDS) {
    const worldRecords = records.filter(record => record.world === world);
    if (world === 'earth-activity') {
      const events = worldRecords
        .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))
        .slice(0, 500)
        .map(record => ({
          id: record.id,
          time: record.observedAt,
          magnitude: record.value,
          place: record.place,
          depthKm: record.depthKm,
          status: record.status,
          url: record.url,
          latitude: record.latitude,
          longitude: record.longitude,
          tsunami: record.tsunami
        }));
      snapshots[world] = {
        schemaVersion: 1,
        world,
        status: 'published',
        generatedAt: now.toISOString(),
        data: {
          source: 'USGS Earthquake Hazards Program',
          sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
          recordCount: worldRecords.length,
          events,
          timeline: dailyCounts(worldRecords, now)
        },
        displayPolicy: { maxEventsPerView: 20, timelineDays: 365 }
      };
    } else {
      snapshots[world] = {
        schemaVersion: 1,
        world,
        status: 'awaiting-source',
        generatedAt: now.toISOString(),
        data: { events: [], timeline: [] },
        message: 'No approved numerical source adapter is connected to this world yet.'
      };
    }
  }
  return snapshots;
}
