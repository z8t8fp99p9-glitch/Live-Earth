# LIVE // EARTH — Independent Global Checker Report Archive

Version: 1.0.0

## Purpose

Store completed 13-section Global Checker reports outside the Nature and Alien World story databases. The archive is View-isolated and does not publish, modify story records, or open either View database.

## Storage locations

- Nature: `.checker-report-archive/nature/`
- Alien World: `.checker-report-archive/alien-world/`

Each completed report is one immutable JSON file, named by report/job identity. Existing files are never overwritten.

## Stored content and privacy

The archive retains the report's section order, all 13 section objects, per-check outcomes, reasons, identifiers, source/image references, approved-image SHA-256 values, and final decisions. Section 2 full-article body fields (`text`, `fullText`, `fullArticleText`, `articleText`, `rawText`, `articleBody`, `body`) are removed from the durable copy and replaced by SHA-256/word-count integrity receipts. Machine-local image staging paths are removed. The incoming report is never mutated.

## Retention

The archive applies the existing 32-day Newsroom retention period to its own report JSON files only. Malformed or unreadable records are preserved for recovery. The cleanup function cannot delete databases, story rows, published assets, or media folders.

## Integration boundary

The archive accepts only a completed report containing exactly 13 ordered sections, including Section 12 `liveFeedOutput` and Section 13 `postEditorialFinalVerification`. It is intended to be called after Section 13 finalization and before the Database Writer. Only Section 13 `APPROVE_FOR_DATABASE` records should be handed to the Writer; the archive records both approved and held outcomes.

This module is an additive archive component. It does not by itself activate Section 13 or change the scheduled Newsroom pipeline. The production call site must be integrated only after the Section 13 Checker and Writer handoff contracts are implemented and tested.
