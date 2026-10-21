LIVE // EARTH — SVG SKY CANVAS PATCH (V59)
===========================================

Scope
-----
Replaces the old Sun/Moon Sky View presentation with a clean canvas using the
already-committed responsive SVGs. It intentionally removes the old tray, arc,
event labels, metrics, timeline and footer. Those independent UI elements are
to be rebuilt in a later step.

Files in this ZIP
-----------------
sky-views.js
  Replacement for the existing repository-root sky-views.js.

SW-PATCH.txt
  Exact small edits needed in the existing sw.js. Do NOT replace sw.js with a
  reconstructed copy. Make these two edits to the current repository version.

Existing assets required (already committed on main)
----------------------------------------------------
sun-sky-background-responsive.svg
moon-sky-background-responsive.svg

Protected files
---------------
Do not edit index.html or orb-controls-v4.js.
The Home Page scene and its composition are not modified by this patch.

Apply
-----
1. Replace repository-root sky-views.js with the included file.
2. Edit sw.js exactly as described in SW-PATCH.txt.
3. Commit the changed files together.
4. Test Sun, Moon, Earth, Location and Stacks on device before treating this
   as accepted. This is a static-validated first canvas stage, not a claim that
   every runtime interaction has been device-tested.
