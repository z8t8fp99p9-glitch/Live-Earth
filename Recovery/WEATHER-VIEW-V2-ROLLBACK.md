# Weather View v2 rollback

This package replaces only `Weather/weather-view.js`.

If the new Weather view fails after extraction, restore `Weather/weather-view.js` from the repository commit immediately before this package was uploaded. The inspected pre-package `main` file blob SHA was `040a1555537dff3c4fff319065cc957b7af4519e` (15 November 2026 baseline). Do not restore or modify `index.html`, `sw.js`, the Stacks registry, Orb controls, Location, or other views for a Weather-only rollback.
