LIVE // EARTH — Global Primary View Manager Patch
Prepared from the user-uploaded Live-Earth-main 6.zip.

GOAL
Establish one mutually exclusive primary-view state:
- home
- explorer (the existing Earth Explorer)
- moon
- sun

BEHAVIOUR
- From Home: Earth opens Explorer; Moon opens Moon View; Sun opens Sun View.
- Tapping the active primary orb returns Home.
- Tapping a different primary orb closes the current view before activating the new one.
- The global view manager is the single authority for primary view transitions.
- Earth Explorer's existing globe implementation and controls are reused; no second globe is created.
- Location and Stacks remain their existing independent features. Activating either while a primary view is active returns the primary view to Home before its existing handler runs.
- The existing Home canvas and visual composition are not edited.

FILES TO UPLOAD
1. Replace sw.js with the version in this patch.
2. Replace earth-mode-navigation.js with the version in this patch.
3. Add sky-view-controller.js to the repository root.
4. Add view-manager.js to the repository root.
Do not upload the patch ZIP itself. Do not delete other files.

UPLOAD ORDER / COMMIT
Upload all four files together in one commit so the controllers and service worker stay in sync.

Suggested GitHub commit title:
Establish global primary view management

VALIDATION
- Node.js syntax checks passed for view-manager.js, sky-view-controller.js, earth-mode-navigation.js, and sw.js.
- Static checks confirm the service worker precaches the new scripts and background assets, injects the controllers, and uses cache version v61.
- No live browser or iPhone runtime test has been performed yet.

SAFETY / ROLLBACK
- The original user-uploaded ZIP remains untouched.
- No GitHub changes, commits, or deployments were performed by ChatGPT.
- If the deployed app behaves incorrectly, restore the previous sw.js and earth-mode-navigation.js and remove the two new JS files, then allow the service worker cache to refresh.
