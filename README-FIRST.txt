LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Current source checkpoint: 24 November 2026
Latest verified main commit: 05bb2c968d901b58b41bf9d42db80175d47b1435

READ IN THIS ORDER
1. PROJECT-CONTINUITY.md — source of truth, scope, safety and release workflow.
2. GLOBAL-STANDARDS.md — application-wide behaviour and architecture rules.
3. PROTECTED-DECISIONS.md — areas that require owner approval.
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md — immutable ZIP/extractor contract.
5. Documentation/INDEX.md — single catalogue for all project documentation.
6. Documentation/CURRENT-STATUS.md — current source, data, deployment evidence and open gates.
7. STARTUP-ESSENTIALS-POLICY.md — read before touching startup, caching, service-worker or update code.

CURRENT SOURCE AND DEPLOYMENT EVIDENCE
- Latest verified source checkpoint: 05bb2c968d901b58b41bf9d42db80175d47b1435 on main (24 November 2026), “Remove preview overlays from scientific globe views”.
- Matching source build identity remains v155-on-demand-feature-views in sw.js and Global/update-manager.js.
- GitHub Pages run 45315989551 completed successfully for that exact commit at 02:57:22 UTC on 24 November 2026. This confirms the Pages gate for that revision, not installed-iPhone activation or device acceptance.
- Universal Data Refresh run 45303947702 (run #41) completed successfully at 01:18:41 UTC on 24 November 2026: 8 datasets updated, 18 skipped because stored values already matched the source cycle, and 0 failed. The workflow runs hourly at minute 55 UTC and supports manual dispatch.
- The Universal registry contains 56 datasets: 26 configured for collection and 30 not configured. See Documentation/SCIENTIFIC-DATA-COLLECTION.md for the current-value and status semantics.

IMPORTANT BOUNDARIES
- Startup Essentials are separate from optional feature resources. Do not change the startup shell, readiness, recovery or update policy as part of optional-cache work.
- Home/Prime Earth, five Home Orbs, shared three-Orb feature dock, primary Earth, separate Moon and Sun views, Location OFF privacy, Earth Engine, local data and recovery remain protected.
- Atmosphere, Oceans and Atmospheric Composition have been confirmed working in the app. Keep source freshness/coverage distinct from view/controller functionality.
- Atmospheric Composition is a separate Stacks view, not a seventh original database World. Its seven dataset IDs and the outstanding registry-assignment mismatch are documented in Documentation/ATMOSPHERIC-COMPOSITION-DATA.md.
- Weather-view refactoring remains deferred until Weather work resumes. Do not bundle it into unrelated reliability changes.
- The repository Tests/ directory was retired by explicit owner direction; do not restore it or claim it ran.

WORKFLOW
Use current GitHub main as the only repository source. Make narrow, tested changes. Prepare a manifest-validated ZIP for the user to upload and commit manually. Never write directly to GitHub. Verify extraction, Actions, Pages and installed-device behaviour separately.
