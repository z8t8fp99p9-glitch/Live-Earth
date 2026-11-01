# Nature Live Feed workflow

**Active workflow path:** `.github/workflows/nature-publisher.yml`

Replace the entire current workflow with the separately supplied `nature-live-feed-workflow.yml`.

The workflow runs the Nature Collector followed by the Live-Feed-only Nature Publisher every three hours. Manual **Run workflow** does the same complete refresh.

- Collector: approved RSS/Atom collection, Commons file-page rights screening, and writes `.publisher-data/nature/`.
- Publisher: read-only SQLite access, shared Editorial Engine live mode, and validation/publication of `nature/published/live-feed.json` plus current image assets/rights metadata.
- GitHub Actions: schedule, cache the existing Nature database key family, and commit only validated public output.

There is no monthly trigger, magazine mode, PDF output, catalogue or issue archive. Failed publication validation leaves the previous last-good feed in place. Saved PDFs in the Global PDF Reader remain outside this publication workflow and are not modified.
