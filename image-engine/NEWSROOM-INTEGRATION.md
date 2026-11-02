# LIVE // EARTH — Image Engine Newsroom Integration

**Existing Engine:** `LIVE // EARTH Global Image Engine` version `0.2.0`  
**New hand-off module:** `image_engine_newsroom.py` version `1.0.0`  
**Status:** Code prepared · not integrated into scheduled live workflows · testing deferred

## Agreed Newsroom position

`Global Collection Manager → Global Collector → Global Checker → Image Engine → Universal Editorial Engine → Global Checker final review → View-owned database → View Publisher`

The Image Engine is shared across Views. The same Engine code is used for Nature and Alien World, but it uses the existing View-specific asset directories and the exact image policy already stored in the one Global Checker registry.

## What was already in the repository

The existing `image-engine/image_engine.py` remains the core Engine:
- Bounded Wikimedia Commons discovery and metadata extraction.
- Exact file page, Creator, Credit and accepted licence metadata.
- Bounded image download, decode and local JPEG normalization.
- Local procedural illustrations made with Pillow.
- Unique staging paths, content hashes and safe asset publication.
- Exact GREEN Global Checker decision required before a staged asset can be copied into a View's published asset folder.

The existing `image_engine_integration.py` and current Publisher hand-offs are preserved. This addition does not replace them.

## What this build adds

`image_engine_newsroom.py` connects the existing Engine to the new Global Checker collection-intake hand-off.

Input:
- Only `imageEngineInputs` from `global_checker_workflow.review_collection_batch(...)`.
- One View per hand-off.
- Only fields the Checker explicitly allowed to leave intake (the headline is used only when `headingLinkUse` is allowed).
- No source summary, raw article body or arbitrary story payload.

Decision order:
1. If a source image was already independently approved by Global Checker intake, the Checker hand-off does not send that story to this fallback module. Its approved image continues with the editorial input.
2. Nature may try Wikimedia Commons using permitted headline context. Each candidate must include a Commons file page, creator, credit and one of the three currently accepted licences. Candidates must also pass a basic title/caption relevance screen.
3. Every Commons candidate is independently re-evaluated by Global Checker. Only exact GREEN decisions continue.
4. If no Commons candidate passes, Nature uses the local procedural illustration fallback.
5. Alien World uses the local procedural illustration fallback when its original NASA image is absent/rejected. The current registry does **not** authorize a Wikimedia Commons image route for Alien World; this build does not broaden that policy.
6. Every local illustration is independently evaluated by Global Checker. Only exact GREEN decisions continue.
7. If no replacement passes, the result is `text-only`; the image failure does not reject eligible text.

## Exact current Checker policy limits

- `imagePolicies.wikimediaCommons` accepts CC0 1.0, CC BY 4.0 and CC BY-SA 4.0, but the executable image route is currently Nature-specific. The existing Global Checker does not provide an Alien World Commons route. This build respects that.
- `imagePolicies.nasa` remains the original Alien World documentary-media route. This Engine does not search for or substitute similar NASA images.
- `imagePolicies.imageEngineOriginalIllustration` accepts only the registered Engine identity and version `0.2.0`, and only the exact `nature/published/assets/` or `alien-world/published/assets/` asset directory. This package therefore reuses the core Engine file without changing its version or the central rights registry.

No new image source, domain, licence, API, hosted inference service, paid service, key or cloud resource is introduced.

## Output

The output is a View-scoped JSON hand-off with:
- one result per requested story;
- approved image metadata and its exact Global Checker decision, or `text-only`;
- asset path and SHA-256;
- the exact Checker decisions for later recording/review in the same View's own database.

The Image Engine itself does not open or write either View database. The View-specific integration adapter must store the decisions through the existing Global Checker using that View's already-open database connection. The Editor receives only the approved image and its provenance metadata.

## Asset locations

- Nature: `nature/published/assets/`
- Alien World: `alien-world/published/assets/`

Raw asset URLs are formed only for those exact repository paths. No arbitrary media host is accepted.

## Run contract (for later integration)

From the repository root, with a JSON output from Global Checker intake:

```bash
python image-engine/image_engine_newsroom.py --intake-file checker-intake.json
```

The JSON result is written to standard output. The CLI does not write a database, Live Feed, Magazine PDF or browser cache.

## Existing live behaviour preserved

- Existing `image_engine.py` remains version `0.2.0` to match `global-checker/source-registry.json`.
- Existing `image_engine_integration.py` is unchanged.
- Existing Collector, Checker bootstrap, Publisher and workflow YAML files are unchanged.
- Nature and Alien World remain separate.
- Approved original images retain precedence; the fallback is for missing or rejected images only.
- No suitable approved image means text-only can continue when the text route is eligible.
- Generated images remain visibly labelled **ILLUSTRATION / NOT A PHOTOGRAPH**.
- No tests were run. Full Image Engine and Newsroom regression testing remains deferred until every component is built.
