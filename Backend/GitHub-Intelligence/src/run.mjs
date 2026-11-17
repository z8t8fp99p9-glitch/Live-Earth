import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectUSGS } from './collect-usgs.mjs';
import { appendAndPruneVault } from './vault.mjs';
import { buildPublishedSnapshots } from './publish.mjs';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
const vaultPath = path.resolve(arg('--vault', process.env.EARTH_INTELLIGENCE_VAULT || './vault'));
const publishPath = path.resolve(arg('--publish', './Data/Published/worlds'));
const now = new Date();

const batch = await collectUSGS({ now });
const stored = await appendAndPruneVault(vaultPath, [batch], now);
const snapshots = buildPublishedSnapshots(stored.records, now);
await mkdir(publishPath, { recursive: true });
for (const [world, snapshot] of Object.entries(snapshots)) {
  await writeFile(path.join(publishPath, `${world}.json`), JSON.stringify(snapshot, null, 2) + '\n');
}
const report = {
  ok: true,
  source: batch.source.id,
  collected: batch.records.length,
  inserted: stored.inserted,
  retained: stored.records.length,
  removedArchiveFiles: stored.removedFiles,
  retentionDays: stored.retentionDays,
  publishedWorlds: Object.keys(snapshots),
  connectedWorlds: Object.keys(snapshots).filter(world => snapshots[world].status === 'published')
};
console.log(JSON.stringify(report, null, 2));
