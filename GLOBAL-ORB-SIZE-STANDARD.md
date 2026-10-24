# LIVE // EARTH — Global Orb Size Standard (V88.8)

## Single sizing principle

The declared **width is the only source of each Orb's diameter**. The Orb's height stays `auto`, and `aspect-ratio: 1 / 1` derives its height from its width. Each shell uses `box-sizing: border-box` so the border remains included in its measured diameter. Shells do not flex-shrink.

## Size roles

- Home/navigation Orb: `--le-orb-size-primary`
- Scattered feature Orb: `--le-orb-size-feature`
- Three-Orb feature dock: `--le-orb-size-dock`
- Feature preview emblem: `--le-orb-size-hero`

Each size token is derived from `vmin`, the shorter viewport dimension, and is bounded with `clamp()`. A very-short-landscape exception reduces only the feature Orb's **width**; the 1:1 ratio and auto height still apply.

## Preserved behaviour

- Random, asymmetric Orb Hunt placement remains.
- The two decorative orbital rails and staggered transform/opacity collection remain.
- Reduced-motion preference skips the collection transition.
- Home navigation, Earth renderer/camera and Moon geometry are outside this replacement.
