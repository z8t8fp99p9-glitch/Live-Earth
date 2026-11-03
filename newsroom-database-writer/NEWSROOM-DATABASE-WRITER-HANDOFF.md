# Shared Newsroom Database Writer — Handoff

- Uses the Manager-selected destination database for the current View.
- Initializes/migrates only generic shared Newsroom schema, additively and without reset.
- Validates existing `publisher_meta.view_id`; refuses unowned or cross-View databases.
- Persists only final Checker-approved stories with individual `PASS` decisions.
- Enforces each View's Manager `retentionDays` setting without pruning another View.
- Keeps private Image Engine assets under `.publisher-data/<viewId>/`.
- Does not collect sources, approve rights, publish assets, or write public feeds.

Nature and Alien World currently retain separate 32-day databases and hourly schedules. Future Views use the same Writer implementation and register a destination in Manager configuration; no View-specific database bootstrap code is added.
