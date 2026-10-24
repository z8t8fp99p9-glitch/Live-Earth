# LIVE // EARTH — Global Orb Size Standard (V88.4 draft)

## Core rule

Use `vmin` as the global sizing reference. `1vmin` is 1% of the shorter viewport side, so turning a phone from portrait to landscape does not change the sizing reference merely because the long side became the width.

## Proposed size tiers

- **Home / primary Orbs:** `clamp(49px, 14.2vmin, 76px)`. This keeps the familiar portrait size (around 60 CSS px on a 420 CSS px short side) while preventing the old desktop/wide-screen override from making the same Orbs larger in landscape.
- **Stacks feature-picker Orbs:** `clamp(40px, 11vmin, 52px)`. Smaller than Home but derived from the same `vmin` reference.
- **Active three-Orb dock:** `clamp(44px, 13.5vmin, 64px)`.
- **Large feature-preview emblem:** `clamp(60px, 22vmin, 96px)`.

These are separate roles, not separate screen-specific systems. The roles retain different visual hierarchy while sharing one measurement rule.

## Navigation grouping and position

The five Home Orbs use `width: min(94vw, 98vmin, 520px)` so wide landscape screens do not spread the controls across the full width. The usual bottom spacing remains driven by `vmin`; landscape uses a smaller bottom offset (`clamp(14px, 4vmin, 20px)`, plus the safe-area inset).

The three-Orb dock uses the same sizing tokens and a compact width cap.

## Stick Stacks rule

The rail reads the current visible Stacks button's `getBoundingClientRect()` on each open/resize/orientation update. It uses that rectangle to set the rail's horizontal center and its bottom stop, while clamping the rail inside the viewport. It checks the five-Orb Home navigation first, then the three-Orb feature dock, then the original button as a fallback.

The chooser itself has no card, border, backdrop blur or dim scrim. The heading stays fixed and only the inner feature list has vertical scrolling. On very short landscape viewports the rail’s top inset and list gaps tighten, but the Orb diameter remains controlled by the same feature-size token so orientation alone does not resize it.

## Explicit protections

- Do not resize/reframe the Earth scene, camera, Moon or stardust composition.
- Do not remove or replace any of the five Home Orb functions.
- Preserve the Location OFF privacy behaviour and local stored data.
- Do not enable actual feature data integrations as part of this styling/navigation fix.
