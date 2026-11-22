# Working Rules — Execution Checklist

This page is a compact checklist, not a second copy of the governing project rules. For source authority and non-negotiable safeguards, read [`../PROJECT-CONTINUITY.md`](../PROJECT-CONTINUITY.md). For protected behaviour, read [`../PROTECTED-DECISIONS.md`](../PROTECTED-DECISIONS.md).

## Before changing source

1. Fetch the latest `main` and confirm the exact commit/ref.
2. Read [`CURRENT-STATUS.md`](CURRENT-STATUS.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), the startup policy if relevant, and the owning component contract.
3. Trace callers, static/dynamic imports, service-worker routing, cache ownership, standalone entry points and compatibility paths.
4. Write down the requested scope, protected boundaries, expected changed files and targeted acceptance checks.

## While changing source

- Keep the patch narrow; do not mix unrelated refactors or visual changes.
- Preserve the app shell, startup readiness/recovery, user data and shared navigation unless explicitly in scope.
- Keep feature loading and close behaviour within the feature's existing lifecycle.
- Do not restore retired publishing systems or the retired `Tests/` directory. Do not modify `.github/` through the standard ZIP workflow.

## Verification and release

- Run syntax checks and targeted mocks for the affected logic; report exactly what passed and what was not tested.
- Review the final diff and changed/deleted paths. Do not claim device acceptance based on local tests or a green Pages workflow.
- Follow the root `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` unchanged. User uploads and commits the single manifest-validated ZIP; do not write directly to GitHub.
- Verify the extractor commit, exact resulting `main` identity, Actions, Pages and installed-iPhone online/offline behaviour as separate gates.
