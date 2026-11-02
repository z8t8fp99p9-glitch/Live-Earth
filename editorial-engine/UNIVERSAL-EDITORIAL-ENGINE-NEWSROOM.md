# LIVE // EARTH — Universal Editorial Engine Newsroom Adapter

**Core Engine retained:** `universal_editorial_engine.py` v1.3.0  
**Browser contract retained:** `universal-editorial-engine.js`  
**Additive Newsroom adapter:** `universal_editorial_engine_newsroom.py` v1.0.0  
**Status:** Prepared for upload · integration tests deferred until the Newsroom build is complete

## Purpose

The existing Universal Editorial Engine remains the single shared production Engine for Live Feed and optional Magazine/PDF outputs. This addition gives it a separate Newsroom intake adapter that creates a structured editorial package for the existing Global Checker final-review API.

It does not replace the existing Engine, its PDF design, browser validators, Nature Publisher, Alien World Publisher, their workflows, their databases, or their current live-feed outputs.

## Position in the approved pipeline

`Global Collection Manager → Global Collector → Global Checker → Image Engine → Universal Editorial Engine → Global Checker final review → correct View-owned database → View Publisher → independent Live Feed`

The adapter consumes only the `editorialInputs` array released by `global_checker_workflow.review_collection_batch(...)`. Every item must match its exact View, source record, source URL, Checker decision ID, permission matrix and current registry versions.

## Editorial production

- Creates a neutral View-labelled headline treatment without adding a new factual claim.
- Creates an attributed, deterministic editorial digest from substantial sentences in the permitted source summary.
- Produces material-claim references and transient evidence excerpts tied to the exact intake source URL, source-policy reference and Checker decision ID.
- Adds only Collection Profile topic tags grounded in the permitted title/summary text.
- Applies a bounded keyword risk screen. A detected risk is left unresolved and therefore held by the final Checker; the Engine does not silently clear it.
- Reuses an original image only when the Global Checker already approved that exact image at collection intake. Otherwise the story can continue text-only.

This initial adapter is intentionally deterministic and transparent. It is not an open-ended generative paraphrasing service, does not claim to independently fact-check reporting, and does not invent details to make a story more engaging. The selected source sentences remain traceable evidence; the Engine supplies attribution and editorial packaging. Future richer editorial transformation must remain within the same explicit permission and evidence rules.

## Permission and privacy controls

The adapter requires these dimensions to be explicitly `allowed`:

- `temporaryProcessing`
- `transformation`
- `derivedOutputStorage`
- `derivedOutputDisplay`
- `headingLinkUse`

Missing or conditional permissions are not treated as approval. It never requires or grants `rawTextStorage`; raw article text/HTML fields are rejected. Evidence excerpts are included only in the transient package for the final Checker and are not to be persisted. The Checker returns an evidence ledger with source identifiers and hashes instead.

## Ownership boundaries

- No source website fetching or collection.
- No hosted AI/model inference, paid API, API key or new cloud service.
- No View database opened or written.
- No Live Feed, PDF, catalogue or publication output written.
- No Checker decision created or self-approved.
- No Nature/Alien World data mixing.
- No policy broadening for image sources or licences.

The caller must pass the package and the exact matching collection-intake review to `global_checker_workflow.review_editorial_package(...)`. Only GREEN `approvedStories` can continue to the correct View-owned database writer and that View's Publisher.

## Run contract (integration phase, not yet scheduled)

```bash
python editorial-engine/universal_editorial_engine_newsroom.py --intake-file checker-intake.json --repository-root .
```

The JSON package is written to standard output. The command does not write project data files.

## Existing functionality preserved

- `universal_editorial_engine.py` remains version 1.3.0 and keeps its current `run_engine(...)` signature.
- `universal-editorial-engine.js` is unchanged.
- Current Publisher code and workflow YAML are unchanged.
- Existing feed and Magazine/PDF output paths are unchanged.
- The adapter is additive and is not wired into scheduled workflows in this package.
- No tests were run; full integration and regression tests remain deferred until all Newsroom systems are built.
