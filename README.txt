# LIVE // EARTH v82 — Online-first launch / offline fallback patch

## What this patch changes

- When online, the Homepage is requested from the network first; the saved Homepage is used only when the device reports offline or the network request fails.
- Essential app-shell assets are requested from the network first when online, then refreshed in the versioned shell cache. Offline launches use saved essentials immediately.
- Optional browse-time resources are also network-first online, with the existing bounded optional cache retained as an offline fallback.
- The startup gate checks for a service-worker update before releasing Home. If an update is found, it waits for activation; if the check fails or times out, the installed shell can still start.
- The worker/cache build ID is bumped to `v82-online-first-launch` and the update manager uses the same ID, so the new essential shell is staged under a fresh cache name.

## Files changed

- `sw.js`
- `update-manager.js`

The patch does not change `index.html` visuals, Earth/Moon framing, Orb dimensions, Location privacy behavior, IndexedDB, the optional-cache name, or the 48-entry optional-cache bound.

## Baseline files this patch was generated from

- `sw.js` blob SHA: `d9a6b48f1264033a4fe71b68843b9e89b65b51f8`
- `update-manager.js` blob SHA: `812d04af10f9eedb4daa013a590695e61c1cfb6c`

## Apply from a local checkout

From the repository root:

```sh
git apply --check Live-Earth-online-offline-v82.patch
git apply Live-Earth-online-offline-v82.patch
git diff --check
node --check sw.js
node --check update-manager.js
```

Then commit the two-file patch as a single commit. Suggested commit title:

`Fix online-first essential loading with offline fallback (v82)`

## Verification limits

The patch structure and targeted source replacements were checked against the stated baseline blobs. It has **not** been pushed, deployed, or tested on an iPhone. After applying, test an online launch with a changed essential script, then launch in Airplane Mode and verify that saved essentials still open. Do not clear site data or IndexedDB during that test.
