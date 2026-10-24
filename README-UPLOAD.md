# Upload Instructions — V88.8

1. Back up your current `view-module-registry.js`.
2. Compare it with `ROLLBACK-view-module-registry-V88.7.js` and the version baseline in `VALIDATION-REPORT.md`. Do not overwrite newer local edits without reconciling them.
3. Replace only `view-module-registry.js` with the packaged V88.8 file.
4. Test Stacks open/scatter, selecting a feature, collecting back to Stacks, Home navigation, and portrait/landscape rotation on the iPhone.
5. Do not deploy until those checks pass.

`PREVIEW-HARNESS.html` is a lightweight visual harness, not the full LIVE // EARTH application. The live Home globe is not included or changed by this patch.
