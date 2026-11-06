# LIVE // EARTH — Flexible ZIP Upload & Related Commit Title Standard

**Prepared:** 6 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`

## Approved behaviour

The Auto Upload extractor no longer depends on a fixed ZIP filename. An upload may use any filename ending in `.zip`, provided the ZIP is uploaded to the repository root on `main`.

The extractor accepts exactly one root-level ZIP changed by the push, and there must be exactly one root-level ZIP present in the repository during that attempt. This avoids guessing when multiple uploads are present. A failed upload ZIP must be removed before retrying with another archive.

Do not unpack the ZIP before uploading it. The archive must contain `UPLOAD_MANIFEST.json` at its root. The manifest uses `schemaVersion: 1` and lists every payload file with its repository-relative path, exact byte size and SHA-256 checksum. An optional `delete` list may request safe file deletions.

## Required related GitHub commit title

Every upload manifest must include a `commitTitle` string. It must be a meaningful, task-specific, one-line title between 1 and 100 characters. The extractor uses this exact value as the GitHub commit title after a successful extraction.

Examples:

- `Fix Location Orb GPS activation and stale-fix handling`
- `Update Moon view controls without changing Home layout`
- `Document flexible ZIP uploads and commit-title rules`

Avoid vague titles such as `Update`, `Fix files`, `Upload ZIP`, or a repeated generic title. The title must describe the actual change contained in that particular ZIP.

The assistant must provide a related, copyable GitHub commit title whenever preparing a repository change package. If a workflow file needs manual installation, provide a separate title specifically describing that workflow change. Do not reuse the payload ZIP's title for a different manual workflow commit.

## Safety checks retained

- Manifest must be present at the ZIP root and use the supported schema version.
- ZIP file membership must exactly match the manifest file list.
- Every payload byte count and SHA-256 checksum is verified before any repository file is changed.
- Duplicate paths, traversal paths, absolute paths, symbolic links, unsafe destinations and conflicting write/delete paths are rejected.
- `.git/` and `.github/` are protected from ZIP payload changes.
- The upload archive cannot be used as a payload file, and payloads cannot create additional `.zip` files.
- Existing upload limits remain: 100 MiB compressed ZIP, 50 MiB per file, 250 MiB total uncompressed content and 5,000 total ZIP file entries, including UPLOAD_MANIFEST.json.
- The uploaded archive is removed only after successful validation and application. Failed packages are not treated as successful uploads.

## Workflow bootstrap rule

The extractor protects `.github/` paths, including its own workflow. Consequently, changing `.github/workflows/zip-extract-auto-upload.yml` cannot be done through the currently installed ZIP extractor. Install the approved workflow YAML manually in GitHub first, with a separate descriptive commit title. After that bootstrap change is committed, ordinary payload ZIPs may use any root-level `.zip` filename.

## Upload procedure

1. Prepare the payload files and their SHA-256 hashes.
2. Add root-level `UPLOAD_MANIFEST.json`, including the task-specific `commitTitle`.
3. Zip the manifest and payload files without adding a wrapper folder.
4. Upload exactly one `.zip` to the repository root on `main`; do not unpack it.
5. Check the GitHub Actions run and resulting commit. The run must validate the manifest and apply only its listed files/deletions.

**Important:** The automatic extractor's commit title comes from `commitTitle`, not from the ZIP filename and not from a fixed workflow message.
