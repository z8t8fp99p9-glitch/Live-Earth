LIVE // EARTH — Texture Fallback Fix

Upload ONLY index.html and sw.js to the root of the Live-Earth repository, replacing existing files. Leave all other files untouched.

This tries the NASA texture first, then a Three.js-hosted Earth texture if the first image fails. It also updates the service-worker cache name.

Commit title: Fix Earth texture loading with fallback source

This has not been verified on the iPhone yet. After deployment, test the live page.
