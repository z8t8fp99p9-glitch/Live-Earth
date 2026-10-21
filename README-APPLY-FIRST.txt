LIVE // EARTH — V55 EARTH-ONLY LIGHTING TEST

Purpose:
V54 reversed the shared solar vector and visibly changed Moon illumination, but did not correct Earth's day/night appearance. V55 restores the original shared solar direction for the scene's directional light and reverses only the custom Earth day/night shader uniform.

Files:
- sw.js — V53 baseline with the isolated Earth shader-direction experiment and a new cache name.
- earth-mode-navigation.js — preserved V53 Explorer orb-routing behavior.

Apply:
1. Keep your current files/ZIP as a rollback copy.
2. Replace only these two files with the files in this archive.
3. Commit and deploy with: Test Earth-only day-night shader direction
4. Reload the site on your iPhone and compare the same globe orientation.

Scope:
No Earth/Moon geometry, Home camera/framing, orb layout, or globe sizing changes.

Status:
This is an isolated experiment, not a confirmed fix. JavaScript syntax and ZIP integrity should be checked before use; runtime behavior must be verified on device.
