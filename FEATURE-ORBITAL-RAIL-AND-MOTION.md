# V88.8 — Width-Driven Orbs + Orbital Rail

- Retains the V88.7 Orb Hunt: six feature Orbs scatter asymmetrically; the orbital paths are decorative and do not force the Orbs into a fixed lineup.
- Retains staggered collection toward the live Stacks Orb using CSS transform/opacity, without a JavaScript animation loop.
- Makes Orb diameter width-driven across Home/navigation shells, the three-Orb dock, scattered feature shells, and the preview emblem.
- Explicitly sets `height:auto`, `aspect-ratio:1 / 1`, `box-sizing:border-box`, and non-shrinking flex sizing. A short-landscape sizing override changes width only.
- The actual clickable feature button and visual Orb remain within the same transformed element.
- `prefers-reduced-motion` remains respected.

This draft corrects Orb geometry only. It does not address the separate suspected Home-globe vertical-stretch issue.
