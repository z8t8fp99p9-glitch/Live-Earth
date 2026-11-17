# LIVE // EARTH private intelligence vault

This repository must remain **Private**.

The scheduled workflow in the public `Live-Earth` repository writes rolling daily archive files here:

- `archive/YYYY-MM-DD.jsonl`

Each line is one source observation with source attribution, source record ID, timestamp, value, unit, and available event metadata. The collector deduplicates by stable source record ID and removes day partitions older than 365 days.

Do not enable GitHub Pages for this repository. Do not copy the archive into the public app repository.
