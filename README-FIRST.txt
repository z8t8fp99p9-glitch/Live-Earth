LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Current documentation baseline: 15 November 2026

READ IN THIS ORDER
1. PROJECT-CONTINUITY.md
2. GLOBAL-STANDARDS.md
3. PROTECTED-DECISIONS.md
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md (do not edit)
5. Documentation/INDEX.md
6. Documentation/CURRENT-STATUS.md

CURRENT POSITION
- Latest inspected source before this cleanup: `v137-github-pages-public-cameras` on `main` (15 November 2026).
- Current cleanup package removes the entire Live Cams implementation and reduces the source-defined startup essentials from 54 to 45.
- Service Worker and Update Manager are advanced together to `v138-core-essential-shell`.
- This is a source package only; upload, GitHub Actions, Pages deployment and installed-iPhone acceptance remain separate checks.
- GitHub Actions validates upload packages and builds Pages; it does not run the repository's regression test files.

PROTECT
- Five Home Orbs and the shared three-Orb feature dock.
- Home Earth composition, Earth Engine ownership, independent Moon and Sun views.
- Location OFF by default; no automatic GPS permission.
- Stacks lifecycle, offline startup, service-worker/update safeguards and local recovery.
- User data, IndexedDB and Cache Storage.
- Retained Universal Editorial Engine; do not restore removed publishing systems.

WORKFLOW
Inspect current main, source, callers and relevant tests before source changes. Make narrow changes. User uploads and commits manually through the manifest-validated ZIP workflow. Do not write directly to GitHub. Verify the extractor, resulting commit, Pages deployment and device behaviour separately.
