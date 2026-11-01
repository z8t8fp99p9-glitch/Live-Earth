LIVE // EARTH — NATURE BUILD
Upload package: LIVE_EARTH_MAIN_UPLOAD.zip

This is a code + folder migration package, not a deployment. The assistant has not written to GitHub.

After the ZIP Extractor commits:
1. Wait for the repository's ZIP Extractor workflow to finish successfully.
2. Check that the Pages build succeeds.
3. Add `.github/workflows/nature-publisher.yml` separately using NATURE_WORKFLOW_SETUP.md. The main ZIP importer does not permit `.github/` files.
4. Run the Nature Monthly Publisher workflow manually with mode `all` for the first collection/publication attempt. During November 2026, the Collector imports the eight curated October summaries once and then verifies the six Commons photo candidates.
5. Confirm its logs report enough eligible monthly stories and documentary photographs before accepting a current issue.
6. Open Stacks → Nature on iPhone online. Confirm source-linked stories, photo captions/credits and the current PDF. Save it through the shared PDF Reader, then test that saved PDF in Airplane Mode.

Do not clear Safari data, app storage, caches or IndexedDB. Do not uninstall the PWA. Nature live stories require the internet; only PDFs saved via the existing global reader remain available offline.

One commit title:
Move Nature into its own verified monthly publishing pipeline

Protected Home, Moon, Sun, Stacks, Location-OFF, service-worker startup and all existing IndexedDB data are outside this patch.
