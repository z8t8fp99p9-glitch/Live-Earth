# LIVE // EARTH — Global Content Rights & Provenance Checker

**Version:** 1.0.3  
**Registry:** 2026-11-02.3  
**Status:** Shared Checker v1.0.3, tested integration runner and copy-ready workflow replacements are included. The 30-test deterministic suite passes. Runtime enforcement becomes active after the two staged workflow files replace the existing files under `.github/workflows/` (the root ZIP importer intentionally blocks `.github/`).

## Purpose

One shared standard for every content-producing view. It decides whether text and images may be stored and published, records the evidence behind each decision, and performs a final gate immediately before a Publisher replaces its public feed.

It is not a Collector, Publisher or Editorial Engine. It does not fetch the internet, own a view database, create schedules, generate summaries, write public feeds or change how a view looks.

## The two gates

1. **Pre-storage gate — Collector:** resolve the article/feed against `source-registry.json`; assess the story's exact text rights; independently assess any exact image and its rights evidence. Only allowed uses are persisted. A restricted feed policy can force the Collector to store headline/link/date only and discard its summary. Record every decision in the current view's own SQLite DB.
2. **Pre-publication gate — Publisher:** after the Universal Editorial Engine returns a candidate feed, call `gate_feed(feed, readonly_connection, view_id)`. Every story needs a matching GREEN/AMBER text decision. The decision must match the story URL. A story's image is stripped unless a separate GREEN/AMBER image decision matches the same story. If fewer than the Publisher's minimum stories remain, the gate raises and the Publisher must preserve the last-good feed.

## Standard verdicts

| Verdict | Meaning | Behaviour |
|---|---|---|
| GREEN | The exact item passed the registered policy for the stated use | May proceed within the listed use scope |
| AMBER | A limited, conditional use passed | Only the exact limited use may proceed; e.g. headline/link/date only |
| RED | A prohibition or explicit restriction was found | Do not store or publish the affected content |
| UNKNOWN | Evidence is missing, conflicting or not registered | Hold; do not store or publish |

The checker fails closed. A GREEN text decision does not clear the image. A GREEN image decision does not clear the article text. Credits are not a substitute for permission. A source hostname is not an item-level licence.

## Initial source decisions

- **NASA official feed and NASA.gov text:** conditional. The source feed and article must both be NASA, item metadata must contain no third-party/copyright restriction, and any exposed author must identify NASA/government authorship. Attribution is NASA. If the source does not expose an author, the rule relies on official NASA feed/article provenance and visible restriction screening; that is still not proof that every embedded passage is a federal work. This is not blanket permission for every file or article on nasa.gov.
- **Phys.org RSS:** AMBER, headline/link/date only. Summary text is not stored. Headlines and links must remain unchanged and Phys.org must be attributed.
- **ScienceDaily:** RED for the current persistent SQLite workflow because its RSS terms prohibit database storage without prior written consent.
- **Mongabay:** no item is cleared unless the exact article exposes an accepted open licence and author evidence. The current RSS parser does not yet retrieve per-article licence fields, so current items remain UNKNOWN and are held.
- **Nature Portfolio:** RED for the current automated persistent-database route. The general site terms prohibit using site content/feed data to populate a database unless specifically permitted; the runner skips this feed before making a request.
- **Wikimedia Commons images:** individual file page, creator, CC0/CC BY/CC BY-SA licence, attribution, contextual caption and modification record required.
- **NASA images:** exact NASA article association, NASA-hosted image/source, credit, caption and no visible third-party/copyright/stock or non-photographic concept-art markers required.

## Data ownership and retention

The Checker adds one evidence table, `global_checker_decisions`, to each existing view-owned SQLite database. It does not merge Nature and Alien World databases. The packaged runner creates the evidence table in each existing view database and prunes the decision record to the same 32-day horizon. It does not reset the story database or introduce a new database.

The table is additive and keyed by `(view_id, story_id, content_kind)`. It stores the verdict, policy/version, decision ID, exact evidence JSON and timestamp. Each decision is retained for a bounded 32-day audit period from its latest check; an old decision can remain briefly after the story row expires. No new cloud service or database is introduced.

## Python API

```python
from global_checker import (
    ensure_decision_table,
    evaluate_and_record_text,
    evaluate_and_record_image,
    prune_decisions,
    gate_feed,
)

# Collector, before its INSERT/upsert of a story:
ensure_decision_table(connection)
text_decision = evaluate_and_record_text(connection, "alien-world", story)
if not text_decision["allowed"]:
    # Do not persist this story.
    continue
if not text_decision["summaryAllowed"]:
    story["summary"] = ""  # obey headline/link-only restriction

# Collector, after extracting one image candidate and before using it:
image_decision = evaluate_and_record_image(
    connection, "alien-world", story_id, image_candidate,
    article_url=story["url"], source_name=story["sourceName"]
)
if not image_decision["allowed"]:
    # Keep the story as text; do not attach the image.
    pass

# Publisher, after Engine returns a candidate and before atomic_json:
feed = gate_feed(candidate["feed"], readonly_connection, "alien-world", minimum_stories=2)
```

The packaged `run_pipeline.py` adapter applies the same contract around the current Collectors and Publishers without replacing their view-specific ownership. It filters RED and unregistered feed routes before network retrieval; registry routes must match the exact reviewed feed URL, not merely the same hostname, intercepts story persistence before the SQLite story write, applies and records the shared Commons/NASA image policy before download, checks the downloaded image again before its database update, backfills and audits retained rows, and wraps the Publisher's final atomic-feed boundary. Nature's image-rights manifest is held until the final feed gate succeeds, keeping it aligned with the last-good feed. Existing low-level HTTPS/redirect, timeout, byte-limit, MIME/decode, file-path and atomic-write safeguards remain in place; those are transport/integrity controls, not competing rights verdicts.

## Last-good output rule

Never write a new public feed before `gate_feed()` succeeds. The caller must continue using its existing atomic output function. If the Checker fails, its registry is unreadable, evidence is missing, or too few stories remain, abort publication and preserve the previous last-good feed. Do not replace failure with an empty feed.

## Files

- `global_checker.py` — shared policy evaluator, SQLite evidence record and final publication gate.
- `run_pipeline.py` — wraps the existing view-specific Collector and Publisher entry points with the common pre-storage/image/final-publication gates.
- `source-registry.json` — versioned source and image policy records.
- `tests/` — deterministic policy and runner tests with no external requests.
- `integrations/INTEGRATION-CONTRACT.md` — exact call-site and migration standard.
- `workflows/` — staged replacements for the current Nature and Alien World workflows; manually copy these into `.github/workflows/` after the ZIP extracts.
- `GLOBAL-CHECKER-STANDARD-2026-11-02.md` — app-wide policy decision record.

## Important boundary

Automated screening is a reproducible internal rights/provenance control, not a legal opinion and not a guarantee that a source has disclosed every relevant right. If a material rights fact is uncertain, the correct outcome is UNKNOWN and the item is held.
