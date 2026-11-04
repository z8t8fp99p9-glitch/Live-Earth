# LIVE // EARTH — Global Editorial Engine, Phase 1

## Release scope

This package upgrades **text editing only** inside the existing shared Universal Editorial Engine.
It does not change the Newsroom structure, Collector, Global Collection Manager, Global Checker,
Image Engine, database writer, View databases, Publishers, workflows, browser views, or app shell.

## Text improvements

- Weighted TextRank-style sentence ranking using local TF-IDF similarity.
- Maximal Marginal Relevance (MMR) to reduce repeated information while retaining distinct points.
- Near-duplicate reduction for shorter source summaries.
- Source-order restoration after sentence selection.
- Protection against collapsing changed numbers/measurements, different quoted wording,
  negation, and uncertainty/modal language.
- No invented sentences, no padding, and no alteration of the preserved source record.
- Short source material remains short when there is not enough distinct material to reach 200 words.

The implementation is extractive, not generative: it selects and orders complete source sentences.
It does not paraphrase or create a new headline.

## Local-only guarantees

- Standard-library Python only for the text-intelligence module.
- No network requests, third-party NLP packages, hosted models, paid APIs, API keys,
  downloaded language models, or new dependencies.
- The Editor continues to accept only the completed Global Checker handoff.
- Explicit Checker summary permission remains required.

## Validation performed

- Python compilation: passed.
- Package-specific Editor suite: 29 tests passed.
- Global Checker downstream post-editorial verification suite in the local repository test copy:
  19 tests passed.
- ZIP manifest/file-size/SHA-256 verification: performed when packaging.

These are local tests. GitHub upload, Actions extraction, deployment, and iPhone acceptance testing
have not yet occurred.

## Phase 2 — image editing

Phase 2 is **not included in this package**. The current Editor handoff carries an approved image
record, URL, dimensions and rights metadata, but does not provide a supported binary-image input
and derivative-asset output contract. Editing pixels without a defined derivative/provenance path
could cause the published image to differ from the exact media record reviewed by the Global Checker.

Do not treat image editing as completed by this Phase 1 release. It must preserve the approved
original and remain compatible with the existing Checker authority and Newsroom boundaries.

## Upload

Upload this archive, unchanged, to the repository root on `main` as:

`LIVE_EARTH_MAIN_UPLOAD.zip`

The existing ZIP Extractor requires a root-level `UPLOAD_MANIFEST.json` with exact file sizes and
SHA-256 hashes. This archive includes that manifest. Do not rename it or place it in a folder.
