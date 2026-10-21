LIVE // EARTH — Cinematic Sun & Moon Views Patch
Prepared from the uploaded Live-Earth-main 6.zip and checked against current GitHub main.

FILES IN THIS PATCH
1. sky-view-controller.js — new isolated full-screen Sun/Moon background layer.
2. sw.js — adds the controller and existing background assets to the app shell, and bumps the cache version.
3. This instruction file.

WHAT IT DOES
- Tap Moon to open Moon View; tap Moon again to return Home.
- Tap Sun to open Sun View; tap Sun again to return Home.
- The selected Sun/Moon orb uses the existing aria-pressed/global glow styling.
- The existing five navigation orbs remain in their original dock.
- Tapping Earth, Location, or Stacks closes the sky view and lets that existing control continue normally.
- A discreet close button and Escape key also close the view.
- Uses the existing moon-sky-background-responsive.svg and sun-sky-background-responsive.svg files already present on GitHub main.
- Does not edit index.html, orb-controls-v4.js, earth-mode-navigation.js, Earth geometry, or Home Page composition.

UPLOAD INSTRUCTIONS
1. Keep your full Live-Earth-main 6.zip as the untouched recovery copy.
2. Open the GitHub repository and make sure you are on branch main.
3. Upload/replace ONLY sw.js and add sky-view-controller.js in the repository root.
4. Do not upload this patch ZIP itself. Do not delete other files.
5. Use the commit title below.
6. After GitHub Pages redeploys, test on the iPhone: tap Moon, tap Moon again, then test Sun, and verify Earth/Location/Stacks still respond.
7. If anything looks wrong, restore the previous sw.js and delete sky-view-controller.js.

GITHUB COMMIT TITLE
Add cinematic Sun and Moon views

VALIDATION
- JavaScript syntax checks passed for both JS files.
- Service-worker cache list and HTML injection were statically checked.
- The two referenced background SVGs were confirmed to exist on current GitHub main.
- Real iPhone/browser runtime testing has not yet been performed.
