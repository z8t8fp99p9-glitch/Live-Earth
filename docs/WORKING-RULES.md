# LIVE // EARTH — Working Rules

## Before changing code

- Inspect `main` and confirm the current commit.
- Read the relevant current controller/engine and its callers.
- Read the matching project standard and tests.
- Explain the proposed scope in plain language before risky or architectural changes.
- Do not treat old dated notes as active instructions without checking their status.

## Protected boundaries

- Do not change Global Orb behaviour or dependencies unless explicitly requested.
- Do not merge Moon and Sun implementations; they are independent views.
- Do not remove offline/runtime assets during code or documentation cleanup.
- Keep shared engines global and reusable.
- Do not reactivate retired Nature or Alien World workflows from historical notes.
- Do not change unrelated files to make a patch appear more complete.

## Documentation

- Keep `docs/INDEX.md`, `docs/CURRENT-STATUS.md`, and `docs/ARCHITECTURE.md` as the concise starting point.
- Keep component-specific technical contracts beside their component.
- Put new long-form decision records in a clearly named dated note, then add a link in `docs/HISTORY-INDEX.md`.
- Mark superseded decisions clearly; preserve history unless deletion is explicitly requested.
- Do not move old files in bulk until links and references have been checked.

## Tests and reporting

- Run the narrowest relevant tests first, then broader checks when appropriate.
- Separate checks that passed from checks not run.
- Do not claim live feeds, GitHub Actions, deployment or iPhone behaviour was tested unless it actually was.
- Inspect the final diff for accidental changes to protected files.

## ZIP upload

Follow `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md`. A valid package needs a root-level manifest, exact sizes and SHA-256 checksums, a meaningful `commitTitle`, and safe deletion paths. Upload one ZIP to the repository root without unpacking it. Confirm the Actions run and resulting commit afterward.
