# Alien World published output

`alien-world/published/` is a public-output directory, not a documentation folder.

It contains one file only:

- `live-feed.json` — all validated Alien World items available in the rolling 32-day window, with no story-count cap.

The source database and its retained records stay in the view-specific GitHub Actions cache at `.publisher-data/alien-world/`; they are not published or committed. No Alien World magazine PDF, catalogue, issue record, latest-publication pointer or archive is generated.
