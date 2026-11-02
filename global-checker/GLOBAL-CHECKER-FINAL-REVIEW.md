# LIVE // EARTH — Global Checker Final Editorial Review

**Adapter:** `global_checker_final_review.py`  
**Adapter version:** `1.0.0`  
**Existing Checker workflow:** `global_checker_workflow.py`  
**Existing Checker workflow version:** `2.0.0`

## Purpose

This is a guarded Newsroom hand-off to the existing Global Checker final-review function. It is not a replacement Checker and does not define or change any source, text-use, image, or publication rights.

It checks that:

- the intake review is the completed `collection-intake` output for one registered View;
- the Manager Source Registry and Global Checker policy registry have not changed since intake;
- the editorial package identifies the registered Universal Editorial Engine core and its Newsroom adapter version;
- every story in the package belongs to the exact `editorialInputs` branch and cites its exact intake decision;
- an item released only through `imageEngineInputs` is never promoted into editorial production;
- story and evidence provenance match the same View, source policy and Checker decision;
- the Editorial Engine's declared privacy/ownership boundaries are present; and
- raw source-body fields do not appear inside editorial story objects.

After these checks, it delegates the substantive review to the existing:

`global_checker_workflow.review_editorial_package(...)`

The existing Checker remains the sole approval authority. It performs the material-claim traceability review, risk review, View alignment, duplicate/related-story review, source-identity checks, text-permission checks and independent image-rights review.

## Output and routing

The output preserves the existing Checker result and adds adapter/provenance metadata. It contains:

- `approvedStories`: only stories whose final Checker verdict is exactly `GREEN`;
- `reviews`: the per-story final Checker decisions;
- `held`: stories not approved for storage and publishing;
- the View ID and registered profile identity;
- registry versions and final-review adapter identity; and
- explicit privacy and ownership assertions.

Only `approvedStories` may continue to the **correct View-owned database writer**. That writer and the View-specific Publisher are later systems; this adapter does not invoke them.

## Strict branch separation

`editorialInputs` and `imageEngineInputs` are separate intake branches. This adapter accepts story content only from `editorialInputs`. A story that was eligible only for Image Engine work does not become editorially eligible because an image was produced or approved. That parallel Image Engine branch still needs a separately designed downstream coordination step; this adapter intentionally does not bridge or promote it.

## Ownership and non-actions

This adapter does not:

- collect or fetch source websites;
- call hosted AI, paid APIs or inference services;
- alter the source registry or View profiles;
- create or self-approve Checker decisions;
- open or write either View database;
- write Checker audit rows;
- persist evidence excerpts or raw source text;
- generate or publish Live Feed JSON or Magazine PDFs; or
- call a View Publisher.

Evidence excerpts are passed transiently to the existing Checker for traceability. The Checker stores excerpt hashes and source references in the approved evidence ledger, not the excerpts themselves. The final-review adapter itself writes no files or database rows.

## What the review means

A `GREEN` result means the story passed the current deterministic workflow checks and is approved for the next storage/publishing step. Claim traceability is a deterministic source-reference and text-consistency check, **not independent scientific, legal, or journalistic fact-checking**. Risk flags may require a hold. An image failure is independent of otherwise eligible text: text may continue text-only if the Checker approves it.

## Command line

```bash
python global-checker/global_checker_final_review.py \
  --editorial-package /path/to/editorial-package.json \
  --intake-review /path/to/global-checker-intake.json \
  --repository-root .
```

Optional same-View retained stories may be supplied for duplicate review:

```bash
--retained-records /path/to/retained-stories.json
```

The command writes the review result to standard output. It does not save it to a database or publication destination. A calling workflow must route only `approvedStories` to the matching View-owned database writer.
