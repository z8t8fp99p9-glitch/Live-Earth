LIVE // EARTH — Global View Manager Follow-up Fix

PURPOSE
Location and Stacks are global utility orbs, not primary views. Their clicks must not close Earth Explorer, Moon View, or Sun View. Only selecting another primary view (Earth, Moon, Sun) or tapping the currently active primary orb should switch/close the primary view.

FIX
- view-manager.js: removes the logic that returned the primary view to Home when Location or Stacks was tapped.
- sw.js: bumps the cache to v62 so the updated manager is fetched.
- sky-view-controller.js and earth-mode-navigation.js are included unchanged from the approved Global View Manager patch so all four files stay in sync.

UPLOAD
Replace/add all four JavaScript files in the repository root as applicable:
1. view-manager.js
2. sky-view-controller.js
3. earth-mode-navigation.js
4. sw.js

Upload all four together in one GitHub commit.

Suggested commit title:
Keep global utility orbs independent of primary views

TEST
1. Open Earth Explorer; tap Location and confirm Explorer remains active.
2. Open Moon View; tap Stacks and confirm Moon View remains active.
3. Open Sun View; tap Location and confirm Sun View remains active.
4. Tap Earth/Moon/Sun to switch primary views; only one should be active at a time.
5. Tap the active primary orb to return Home.

Validation: Node syntax checks passed. ZIP integrity checked. Live browser/iPhone behavior is not yet runtime-tested by ChatGPT.

No GitHub files have been changed by ChatGPT. Keep the original recovery ZIP unchanged.
