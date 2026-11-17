# Earth Intelligence — GitHub-only architecture

## Storage boundary

The public app repository is public. Raw observations must therefore never be committed there. The one-year archive belongs in a separate private GitHub repository. GitHub Actions checks out that private vault only into its runner workspace, processes it, and commits updates back to the private vault. Only Publisher snapshots are committed to the public app repository.

## Data lifecycle

1. Collector retrieves source records (currently USGS Earthquake GeoJSON).
2. Normaliser maps source fields into a stable record schema while retaining source identity and attribution.
3. Vault writer deduplicates records and partitions them by UTC observation day.
4. Retention removes daily partitions older than 365 days.
5. Publisher creates a small world-specific snapshot with at most 365 daily timeline points and a bounded event list.
6. GitHub Pages serves those curated snapshots.
7. The six world screens filter display windows client-side; the full archive remains private.

## Important limitations

- GitHub Actions is scheduled processing, not an always-on server. The current collector runs hourly; source update cadence still governs freshness.
- GitHub Pages is static hosting. It cannot execute private server-side calculations on demand. The scheduled Actions pipeline calculates and publishes ahead of time.
- A public app repository cannot protect raw records. The private vault and token are required for the one-year private archive.
- Only Earth Activity is connected in this initial implementation. Other worlds do not show invented data.
- The one-year history starts accumulating from the first successful scheduled run; it is not backfilled automatically by this initial release.

## Display periods

The Earth Activity view can display 24 hours, 7 days, 30 days, 90 days or 1 year. Changing the period only filters the curated snapshot; it does not alter private archive retention.
