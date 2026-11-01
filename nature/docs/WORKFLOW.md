# Nature Live Feed workflow

**Active workflow path:** `.github/workflows/nature-publisher.yml`

The copy-ready hourly replacement is `nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml`. Because the ZIP importer blocks `.github/`, manually replace the full contents of `.github/workflows/nature-publisher.yml` with that file.

The workflow runs the Nature Collector followed by the Live-Feed-only Nature Publisher hourly. Manual **Run workflow** does the same complete refresh.

- Collector: approved RSS/Atom collection, Commons file-page rights screening, and writes `.publisher-data/nature/`.
- Publisher: read-only SQLite access, shared Editorial Engine live mode, and validation/publication of `nature/published/live-feed.json` plus current image assets/rights metadata.
- GitHub Actions: schedule, cache the existing Nature database key family, and commit only validated public output.

There is no monthly trigger, magazine mode, PDF output, catalogue or issue archive. Failed publication validation leaves the previous last-good feed in place. Saved PDFs in the Global PDF Reader remain outside this publication workflow and are not modified.


The Nature database has a 32-day retention limit. The public Live Feed continues to show only the rolling 48-hour window, with up to 10 stories.
