# LIVE // EARTH — Global Checker v2

A clean eight-section Checker implementation. It is not an adapter around the previous Checker.

## Section ownership

| Section | Owner | Purpose |
|---|---|---|
| 1. Manager ID Card | Collector | Original Manager job envelope; read-only |
| 2. Full Article | Collector | Article text and continuation evidence; read-only |
| 3. Original Image Records | Collector | Original candidate URLs and metadata; read-only |
| 4. Source & Rights Evidence | Collector | Source, author, credit, licence and provenance evidence; read-only |
| 5. Image URL Checker & Final Image | Checker | U01–U09 candidate checks, deterministic candidate ranking, one URL or `NO IMAGE SELECTED`; does not authorize use |
| 6. All the Checks | Checker | One consolidated audit list of every check executed in Sections 5, 7 and 8 |
| 7. Text Approval Checks | Checker | Independent text/source and use-permission decision |
| 8. Image Approval Checks | Checker | Rights decision for the exact URL selected in Section 5 |

## Binary execution rule

Every check record has `executed: YES` and `passed: YES/NO`; its `result` is `PASS`, `FAIL`, or `UNKNOWN`. UNKNOWN is never a pass. Section 6 copies every individual check result and reports execution completeness. (No check may be silently omitted.)

## Image selection

Image Engine may propose candidates but cannot approve them. Section 5 compares each candidate against its originating article, original URL, HTTPS validity, image identity, derivative status, duplicates, article-metadata relevance and source consistency. Only candidates passing every U01–U09 check are eligible. The deterministic ranking uses article-title metadata overlap, then available credit/dimensions, then stable identifiers. It selects one exact URL or `NO IMAGE SELECTED`.

This implementation does not download or visually inspect image pixels. U07 is explicitly metadata relevance, not a claim of visual verification. Rights approval is separate and happens only in Section 8.

## Policy inputs

The caller supplies policy decisions as explicit structured inputs; this engine does not infer permission from a domain, credit, educational purpose, or public-agency identity. Text policy shape:

```python
text_policy = {
  "policyId": "...", "sourceMatch": True,
  "permissions": {
    "temporaryProcessing": "allowed",
    "transformation": "allowed",
    "derivedOutputStorage": "allowed",
    "derivedOutputDisplay": "allowed"
  },
  "fullArticlePermissions": {"temporaryProcessing": "allowed"}
}
```

Image policies are keyed by `postId` and must explicitly match the exact selected candidate:

```python
image_policies = {
  "POST_ID": {
    "policyId": "...", "policyMatch": True,
    "permissions": {
      "editorialUse": "allowed", "attribution": "allowed",
      "modification": "allowed", "storage": "allowed"
    }
  }
}
```

Missing, conflicting or unrecognized permissions remain UNKNOWN/NO. Section 5 selection is not rights approval.

## API

```python
from global_checker import GlobalChecker
report = GlobalChecker().run(
    collector_batch,
    text_policy=text_policy,
    image_policies=image_policies,
    image_engine_candidates={"POST_ID": [candidate, ...]},
)
```

The returned object contains `sections` with all eight named sections and a per-post view of Sections 5–8. Sections 1–4 are passed through unchanged. This component performs no network access, image downloads, database writes, content editing, or publication.

## Important integration note

This is a new standalone Checker module and contract. It is not yet wired into the scheduled Newsroom orchestrator or existing database writer. The handoff integration must be performed and tested as a separate step; uploading this package alone does not establish production pipeline integration.
