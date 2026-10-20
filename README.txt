LIVE // EARTH — PRE-ROTATION-RECOVERY BASELINE

This ZIP rolls back the orientation-recovery experiment that began with the
portrait panel/touch recovery commits. It restores the earlier service-worker
integration and keeps the currently known-good v4 orb controller unchanged.

Included:
- sw.js — pre-recovery service worker (cache v25); no rotation-recovery.js injection
- orb-controls-v4.js — the known-good v4 controller, preserved unchanged

Not included / do not replace:
- index.html
- Earth/Moon/Sun artwork or assets
- manifest.json or other data files

iPhone upload:
1. Open the Live-Earth repository on branch main.
2. Replace ONLY sw.js and orb-controls-v4.js with these files.
3. Commit title: Restore pre-rotation-recovery app baseline
4. Let Pages deploy, then close the Home Screen app fully and reopen it online.
5. Test portrait -> landscape -> portrait.

This is a rollback to a known earlier code baseline, not a verified fix. It does
not change the homepage composition or globe dimensions. The orb controller is
included to ensure the known-good controller is restored alongside the shell.
