LIVE // EARTH — Five Default Buttons Patch

This patch removes the orb images, deck designs, Orb Studio, and Deck Studio from the app interface. It leaves five plain text buttons: Earth, Moon, Sun, Location, and Stacks. The existing rotating Earth globe and one-finger drag behavior are preserved.

The currently selected button is saved locally in this browser using localStorage. Moon, Sun, Location, and Stacks are navigation placeholders; this patch does not pretend their underlying features are implemented. Earth returns to the globe without a message.

Files in this patch:
- index.html
- sw.js

Upload instructions:
1. Open the Live-Earth repository on GitHub, branch main.
2. Replace only the root index.html and sw.js with the files in this patch.
3. Leave manifest.json, icon.svg, data-store.js, dataset-manifest.json, and other files in place.
4. Commit title: Simplify navigation to five default buttons

The old image files may remain in the repository but this version does not display or precache the orb/deck images. No GitHub change has been made by creating this ZIP.

Verification: ZIP integrity and JavaScript syntax checks are run when this bundle is created. This has not been deployed or tested on a physical iPhone.
