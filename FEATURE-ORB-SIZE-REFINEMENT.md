# Feature Orb sizing diagnosis (V88.9)

The scatter layout uses the area between the Stacks header and the bottom navigation to calculate safe positions. That affects where the Orbs may land, not their diameter.

The size mismatch in landscape came from a separate `@media(max-height:460px)` rule that explicitly reduced `.le-feature-library-item .orbShell` to `clamp(36px,10vmin,44px)`. The shared size token is `clamp(44px,12.5vmin,58px)`. V88.9 makes the short-height rule keep using `var(--le-orb-size-feature)` rather than overriding it with a smaller clamp. The shell remains width-driven with `aspect-ratio: 1 / 1`.
