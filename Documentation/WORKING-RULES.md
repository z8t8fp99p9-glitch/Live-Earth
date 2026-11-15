# Working Rules

## Before source changes

1. Read the root continuity, global standards and protected-decision documents.
2. Read `CURRENT-STATUS.md` and the relevant component note.
3. Inspect current `main`, source, callers, runtime references and standalone entry points.
4. Identify the smallest file scope and protected boundaries.

## During changes

- Do not refactor unrelated views or shared infrastructure.
- Do not modify Home, Orb behaviour, Moon, Sun, Location, Stacks lifecycle, service worker or update manager as a side effect of a feature task.
- Do not delete runtime files, engines, assets, recovery material or data based on age or filename. Trace dependencies first.
- Test files may be retired only when explicitly authorized; the current `Tests/` directory retirement is an explicit user decision.
- Do not reintroduce the retired publishing systems.
- `.github/` is protected from the ZIP extractor; workflow changes require a separate manual process.

## Verification and reporting

- Report exact syntax/source checks and failures. The repository's automated `Tests/` suite has been retired; do not imply it still exists or claim automated regression coverage.
- Distinguish local checks, ZIP manifest validation, GitHub Actions, Pages deployment and installed-device acceptance.
- Review the exact changed/deleted file list before packaging.

## Repository release

Follow the root `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` unchanged. The user uploads one manifest-validated ZIP to the repository root on `main` and commits through the automatic extractor. Do not write directly to GitHub. After upload, verify the extractor run, resulting commit and Pages deployment.

## Documentation

Keep a short current-state reference and concise component contracts. Keep durable decisions in `PROJECT-HISTORY.md`; do not retain every trial as a separate current-looking document. Git history preserves removed documentation. Never delete application source as part of documentation cleanup.
