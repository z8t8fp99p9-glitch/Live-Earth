# V110 Local Validation Report

**Date:** 30 October 2026  
**Candidate:** Alien World Publisher + Global Editorial Engine + Global PDF Viewer

## Results

- `python -m unittest discover -s tests -v`: **20 tests passed** across Publisher, Engine and integration-contract suites.
- `node --check` for `alien-world-view-controller.js`, `alien-world-publisher-client.js`, `universal-editorial-engine.js`, and `universal-pdf-viewer.js`: **passed**.
- `python -m py_compile` for the Publisher and Engine: **passed**.
- Strict pypdf read and generated page count checks: **passed** in Engine tests.
- Database ownership/collision, read-only Engine access, RSS de-duplication, Atom summary/date parsing, custom layout directive mapping, 6-page and 8-page output, and insufficient-story last-good protection: covered.
- Feed/catalog/PDF outputs use a public cross-origin repository endpoint so the app service worker cannot cache view-specific content; the PDF Viewer stores only explicitly opened PDF blobs in its separate bounded library.

## Not yet verified

The GitHub Actions workflow has not yet been installed or run on the user's repository. Live NASA feed availability, real image eligibility, GitHub Actions cache restoration, automated Pages rebuild, deployed website behaviour, and real iPhone PDF viewing/download/offline behaviour remain pending.

A Chromium browser UI test was attempted locally, but the container's browser policy blocked navigation before the page loaded (`ERR_BLOCKED_BY_ADMINISTRATOR`). This is an environment blocker, not a passed test; device verification remains essential.
