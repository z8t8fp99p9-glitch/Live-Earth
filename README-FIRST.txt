LIVE // EARTH — GLOBAL PUBLISHER REPAIR
Prepared: 3 November 2026
Repository: z8t8fp99p9-glitch/Live-Earth
Branch: main
Baseline inspected: c35cac4006446fc2eeb2c3515fed3a007ebf17ec

WHAT THIS PACKAGE CHANGES
1. The shared Global Checker startup hook now routes a Publisher only when its
   command is a supported Live command. Invalid/malformed arguments and --help
   are left for the original Publisher command-line parser. This is generic
   for every registered Collector/Publisher entrypoint; no View-specific
   exception or rights-policy change is added.
2. The shared Image Engine integration now supplies the existing View ID to
   its staging-folder helper, keeping temporary staging separated by View.
3. Deterministic tests cover the shared startup behavior and verify both
   Nature and Alien World pass their own View ID into the shared staging helper.

FILES REPLACED
- global-checker/live_earth_global_checker_bootstrap.py
- global-checker/tests/test_bootstrap.py
- image-engine/image_engine_integration.py

FILE ADDED
- image-engine/tests/test_image_engine_integration.py

DOCUMENTATION ADDED
- README-FIRST.txt
- recovery/GLOBAL_PUBLISHER_REPAIR_ROLLBACK_2026-11-03.md

NOT CHANGED
- No .github/workflows YAML files.
- No Global source/rights registry or Checker rules.
- No Nature or Alien World Collector, database, cache, feed, or Publisher output.
- No shared Newsroom orchestration or Editorial rules.
- No app Home, Moon, Sun, Orb, offline, or local recovery features.
- No database reset, deletion, or migration.

UPLOAD METHOD — IMPORTANT
Upload this exact ZIP, named LIVE_EARTH_MAIN_UPLOAD.zip, to the ROOT of
z8t8fp99p9-glitch/Live-Earth on branch main. Do not upload the extracted files
one by one. The existing .github/workflows/zip-extract-auto-upload.yml watches
for this exact root filename, verifies UPLOAD_MANIFEST.json and every file's
size/SHA-256, then applies the listed paths and removes the uploaded ZIP.

The extractor intentionally refuses .github/ and .git/ paths. This package
contains no workflow YAML. Its automatic application commit title is:
Apply LIVE // EARTH Main Upload

After the extractor succeeds, run the existing Alien World Live Feed Publisher
workflow first. Confirm the Publisher step succeeds and the last-good feed is
preserved on any failure. Then run Nature as the shared-code regression check.

STATUS
Prepared for upload. Local archive and focused test checks must be reviewed in
the accompanying delivery message. This is not uploaded, committed, deployed,
or device-verified until those later steps actually occur.
