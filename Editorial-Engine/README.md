# LIVE // EARTH — Universal Editorial Engine

**Status:** retained core; no Newsroom collection or publishing services are installed.

## Retained files

- `universal_editorial_engine.py` — the preserved Python editorial/PDF output core.
- `universal-editorial-engine.js` — the preserved browser-side output-contract helper.
- `editorial_text_intelligence.py` — extractive editorial text analysis and structure tools.
- `Tests/test_editorial_phases_1_2_3.py` — editorial structure and integrity tests.
- `Tests/test_editorial_text_intelligence.py` — text-intelligence tests.
- `requirements.txt` — dependencies for the retained Python core.

The Python core and browser helper are retained unchanged by the Newsroom removal. The Editorial Engine Feature Orb remains available in the app. Its workspace does not register or load any collection, policy-checking, image-processing, database-writing, source-discovery or Publisher views.

## Current boundary

The Global Newsroom services and their related collection/publishing interfaces have been removed. There is no active source collector, rights-checking pipeline, newsroom database writer, scheduled workflow or view Publisher in this application package.

The preserved Python core still contains its existing read-only approved-record input contract. That contract is dormant because its former source and publishing services have been removed. The retained Engine is not represented as a working live-feed pipeline and does not fetch sources or persist records by itself.

## Editorial integrity

The text-intelligence utilities use source-grounded, extractive selection and structure. They are designed to preserve source order and protect figures, quotations, negation and uncertainty. They do not invent reporting or claim independent fact verification.

## Dependencies

Install from the repository root with:

```bash
python -m pip install -r Editorial-Engine/requirements.txt
```

## Test scope

The two retained test modules cover the independent text-intelligence and editorial-structure utilities. They do not test a collection pipeline or a Publisher integration, because those systems are no longer part of the application.
