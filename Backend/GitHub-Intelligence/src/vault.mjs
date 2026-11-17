import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const DAY = 86400000;
const isoDay = value => new Date(value).toISOString().slice(0, 10);

export async function appendAndPruneVault(vaultRoot, batches, now = new Date()) {
  const root = path.resolve(vaultRoot, 'archive');
  await mkdir(root, { recursive: true });
  const incoming = batches.flatMap(batch => batch.records || []);
  const cutoff = now.getTime() - 365 * DAY;
  const grouped = new Map();

  for (const record of incoming) {
    const time = Date.parse(record.observedAt);
    if (!Number.isFinite(time) || time < cutoff || time > now.getTime() + 5 * 60 * 1000) continue;
    const day = isoDay(record.observedAt);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(record);
  }

  let inserted = 0;
  for (const [day, records] of grouped) {
    const file = path.join(root, `${day}.jsonl`);
    let existing = [];
    try {
      existing = (await readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const ids = new Set(existing.map(item => item.id));
    for (const record of records) {
      if (!ids.has(record.id)) {
        existing.push(record);
        ids.add(record.id);
        inserted++;
      }
    }
    existing.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
    await writeFile(file, existing.map(item => JSON.stringify(item)).join('\n') + (existing.length ? '\n' : ''));
  }

  const files = await readdir(root);
  let removed = 0;
  const retained = [];
  for (const name of files) {
    if (!/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)) continue;
    const date = Date.parse(name.slice(0, 10) + 'T00:00:00Z');
    if (!Number.isFinite(date) || date < cutoff) {
      await rm(path.join(root, name), { force: true });
      removed++;
    } else {
      retained.push(path.join(root, name));
    }
  }

  const all = [];
  for (const file of retained.sort()) {
    const lines = (await readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const record = JSON.parse(line);
      const time = Date.parse(record.observedAt);
      if (Number.isFinite(time) && time >= cutoff && time <= now.getTime() + 5 * 60 * 1000) all.push(record);
    }
  }
  return { records: all, inserted, removedFiles: removed, retentionDays: 365 };
}
