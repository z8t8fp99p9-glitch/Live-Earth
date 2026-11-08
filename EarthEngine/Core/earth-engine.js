/* LIVE // EARTH — public Earth Engine API.
 * Exposes one stable globe factory while delegating 3D object assembly to the
 * EarthEngine/Graphics layer. Each view still owns its own scene and renderer.
 */
import { createEarthGraphics } from "../Graphics/earth-engine-3d-graphics-engine.js";

export async function createEarthGlobe(options = {}) {
  return createEarthGraphics(options);
}

export const createGlobe = createEarthGlobe;
export const EarthEngine = Object.freeze({
  version: "1.0.0",
  createGlobe: createEarthGlobe,
  createEarthGlobe
});

if (typeof window !== "undefined") {
  window.LiveEarthEngine = EarthEngine;
  window.__liveEarthEarthEngineModuleReady = true;
  window.dispatchEvent?.(new Event("live-earth-earth-engine-ready"));
}
