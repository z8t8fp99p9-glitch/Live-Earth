LIVE // EARTH — Orb Material Update

This ZIP contains a focused CSS patch for the five current orb buttons. It adds
 glassmorphism, neumorphic inner depth, curved highlights, individual colored
rim lighting, subtle floating motion, and reduced-motion support.

This is a patch, not a full replacement app. To protect the working globe, the
existing index.html should be edited minimally:

1. Open the repository on GitHub, branch main, then open root index.html.
2. Tap Edit (pencil).
3. Find the existing <style> section in the <head>.
4. Paste all contents of orb-materials.css just before </style>.
5. Remove this exact HTML line:
   <div class="hint">Drag globe to rotate · Choose an orb</div>
6. Commit title:
   Add glassmorphic orb depth and remove bottom hint
7. Wait for GitHub Pages deployment, then reopen LIVE // EARTH online.

Do not change the Three.js globe script or sw.js. The deck is intentionally not
included yet. This patch has not been uploaded or deployed by ChatGPT.
