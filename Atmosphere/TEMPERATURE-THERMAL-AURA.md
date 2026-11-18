# Atmosphere Temperature Thermal Aura

The temperature view opts into the generic GPU grid skin's optional thermal presentation.
- The underlying NOAA temperature field and colour ramp remain unchanged.
- A five-tap local field blend adds restrained thermal diffusion to the temperature surface.
- A separate, temperature-coloured shell extends only 0.0015 world units beyond the temperature mesh.
- Aura intensity is capped and fades by view angle; it is not a fixed blue outline or animated pulse.
- The effect is enabled only by the Atmosphere Temperature dataset configuration.
- Other GPU grid callers retain their existing appearance because the feature is opt-in.
- The aura mesh ignores raycasting so it cannot interfere with globe gesture picking.
