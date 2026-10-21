LIVE // EARTH — SUN & MOON VIEW CLEANUP
Changed-files-only patch for the current repository ZIP supplied by the user.

WHAT THIS PATCH DOES
- Removes the dedicated Sun/Moon sky-view loader and its background assets.
- Removes the older local Sun/Moon astronomy preview panel and its trigger.
- Keeps the Home Page Sun and Moon orb artwork, layout, size, and positions.
- Sun/Moon orb taps no longer open a separate view.
- Preserves the Earth globe, existing Home composition, Location/Stacks controls, and astronomy.js because another experimental page references it.
- Updates the service-worker cache name and removes sky-views.js from its app shell and HTML injection.

HOW TO APPLY
1. Upload/replace index.html, orb-controls-v4.js, and sw.js with the three files in this ZIP.
2. Delete every path listed in DELETE-FILES.txt from the repository root.
3. Commit using: Remove Sun and Moon Sky Views
4. After deployment, reopen the app and refresh/clear the old site cache if the old screen remains. The service-worker cache version was bumped to help retire cached files.

IMPORTANT
This ZIP does not commit or deploy anything. It contains only replacement files plus a deletion checklist because a ZIP upload does not itself delete repository files.
The Home Page's visual Earth/Moon/Sun orb artwork is intentionally preserved. This patch was checked statically; it has not been tested on an iPhone runtime.
