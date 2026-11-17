const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';

export async function collectUSGS({ fetchImpl = fetch, now = new Date() } = {}) {
  const response = await fetchImpl(USGS_FEED, {
    headers: { accept: 'application/geo+json, application/json' },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`USGS feed returned HTTP ${response.status}`);
  const body = await response.json();
  if (body?.type !== 'FeatureCollection' || !Array.isArray(body.features)) {
    throw new Error('USGS response is not a GeoJSON FeatureCollection.');
  }
  const collectedAt = now.toISOString();
  const records = [];
  for (const feature of body.features) {
    const p = feature?.properties || {};
    const coordinates = feature?.geometry?.coordinates || [];
    const observed = Number(p.time);
    const magnitude = p.mag == null ? NaN : Number(p.mag);
    if (!feature?.id || !Number.isFinite(observed) || !Number.isFinite(magnitude)) continue;
    records.push({
      id: `usgs:${feature.id}`,
      world: 'earth-activity',
      sourceId: 'usgs-comcat',
      sourceName: 'USGS Earthquake Hazards Program',
      sourceUrl: p.url || USGS_FEED,
      sourceRecordId: String(feature.id),
      signal: 'earthquake-magnitude',
      observedAt: new Date(observed).toISOString(),
      collectedAt,
      value: magnitude,
      unit: 'magnitude',
      latitude: coordinates[1] == null || !Number.isFinite(Number(coordinates[1])) ? null : Number(coordinates[1]),
      longitude: coordinates[0] == null || !Number.isFinite(Number(coordinates[0])) ? null : Number(coordinates[0]),
      depthKm: coordinates[2] == null || !Number.isFinite(Number(coordinates[2])) ? null : Number(coordinates[2]),
      place: typeof p.place === 'string' ? p.place : 'Location not supplied',
      status: typeof p.status === 'string' ? p.status : 'unknown',
      eventType: typeof p.type === 'string' ? p.type : 'earthquake',
      url: typeof p.url === 'string' ? p.url : USGS_FEED,
      tsunami: Number(p.tsunami) === 1,
      felt: p.felt == null || !Number.isFinite(Number(p.felt)) ? null : Number(p.felt)
    });
  }
  return {
    source: { id: 'usgs-comcat', name: 'USGS Earthquake Hazards Program', url: USGS_FEED },
    generatedAt: new Date(Number(body.metadata?.generated) || now.getTime()).toISOString(),
    collectedAt,
    records
  };
}
