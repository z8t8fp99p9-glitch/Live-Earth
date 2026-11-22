LIVE // EARTH — START HERE
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Current source checkpoint: 22 November 2026

READ IN THIS ORDER
1. PROJECT-CONTINUITY.md — source of truth, scope, safety and release workflow.
2. GLOBAL-STANDARDS.md — application-wide behaviour and architecture rules.
3. PROTECTED-DECISIONS.md — areas that require owner approval.
4. ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md — immutable ZIP/extractor contract.
5. Documentation/INDEX.md — single catalogue for all project documentation.
6. Documentation/CURRENT-STATUS.md — current source, deployment evidence and open gates.
7. STARTUP-ESSENTIALS-POLICY.md — read before touching startup, caching, service-worker or update code.

CURRENT SOURCE AND DEPLOYMENT EVIDENCE
- Latest verified source checkpoint in this record: d1aa269836069554cb27888f6b611e446407478c on main (22 November 2026).
- Matching source build identity: v155-on-demand-feature-views in sw.js and Global/update-manager.js.
- GitHub Pages run 45076364772 completed successfully for that exact commit. This confirms the Pages workflow gate, not installed-iPhone activation or device acceptance.

IMPORTANT BOUNDARIES
- Startup Essentials are separate from optional feature resources. Do not change the startup shell, readiness, recovery or update policy as part of optional-cache work.
- Home/Prime Earth, five Home Orbs, shared three-Orb feature dock, primary Earth, separate Moon and Sun views, Location OFF privacy, Earth Engine, local data and recovery remain protected.
- Weather-view refactoring is deferred until Weather work resumes. Do not bundle it into unrelated reliability changes.
- The repository Tests/ directory was retired by explicit owner direction; do not restore it or claim it ran.

WORKFLOW
Use current GitHub main as the only repository source. Make narrow, tested changes. Prepare a manifest-validated ZIP for the user to upload and commit manually. Never write directly to GitHub. Verify extraction, Actions, Pages and installed-device behaviour separately.
