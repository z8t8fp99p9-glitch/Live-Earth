/* LIVE // EARTH — Earth Modes renderer.
 * Uses the canonical Global Earth Engine and receives only Home's user viewpoint.
 * Camera, renderer, zoom, controls and scene remain owned by this page.
 */
import { createEarthGlobe } from "../EarthEngine/Core/earth-engine.js";

(() => {
  "use strict";
  const orb = document.querySelector("#earth-orb");
  const canvas = document.querySelector("#earth-canvas");
  const status = document.querySelector("#status");
  if (!orb || !canvas || !status) return;

  const mode = new URLSearchParams(location.search).get("mode") || "basic";
  let T = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGlobe = null;
  let group = null;
  let frame = 0;
  let disposed = false;
  let zoom = 3.25;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastPinch = 0;
  let suppressTap = 0;
  const pointers = new Map();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const say = message => { status.textContent = message; };
  const draw = () => {
    if (!renderer || frame || disposed || document.hidden) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!disposed) renderer.render(scene, camera);
    });
  };
  const home = () => { location.href = "../"; };

  document.querySelector("#home-control")?.addEventListener("click", home);
  orb.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { orb.setPointerCapture(event.pointerId); } catch (_) {}
    if (pointers.size === 1) {
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      moved = false;
      orb.classList.add("dragging");
    } else if (pointers.size === 2) {
      const points = [...pointers.values()];
      lastPinch = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      moved = true;
      suppressTap = Date.now() + 800;
    }
    event.preventDefault();
  }, { passive: false });

  orb.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const points = [...pointers.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (lastPinch > 0 && distance > 0) {
        zoom = clamp(zoom * lastPinch / distance, 1.7, 5.8);
        if (camera) camera.position.z = zoom;
        draw();
      }
      lastPinch = distance;
      moved = true;
      suppressTap = Date.now() + 800;
    } else {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 7) moved = true;
      if (moved && group) {
        group.rotation.y += dx * 0.008;
        group.rotation.x = clamp(group.rotation.x + dy * 0.006, -1.25, 1.25);
        draw();
      }
      lastX = event.clientX;
      lastY = event.clientY;
    }
    event.preventDefault();
  }, { passive: false });

  function end(event) {
    const hadPointer = pointers.has(event.pointerId);
    pointers.delete(event.pointerId);
    if (pointers.size < 2) lastPinch = 0;
    if (!pointers.size) {
      orb.classList.remove("dragging");
      if (hadPointer && !moved && Date.now() > suppressTap) home();
      if (moved) suppressTap = Date.now() + 500;
      moved = false;
    }
  }
  orb.addEventListener("pointerup", end);
  orb.addEventListener("pointercancel", event => {
    pointers.delete(event.pointerId);
    if (!pointers.size) { orb.classList.remove("dragging"); moved = false; }
  });
  orb.addEventListener("lostpointercapture", event => {
    pointers.delete(event.pointerId);
    if (!pointers.size) { orb.classList.remove("dragging"); moved = false; }
  });
  orb.addEventListener("contextmenu", event => event.preventDefault());
  orb.addEventListener("wheel", event => {
    event.preventDefault();
    zoom = clamp(zoom + Math.sign(event.deltaY) * 0.18, 1.7, 5.8);
    if (camera) camera.position.z = zoom;
    draw();
  }, { passive: false });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else draw();
  });

  function resize() {
    if (!renderer || !camera || !orb) return;
    const bounds = orb.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mode === "hd" ? 1.5 : 1.25));
    renderer.setSize(Math.max(1, Math.round(bounds.width)), Math.max(1, Math.round(bounds.height)), false);
    camera.aspect = bounds.width / Math.max(1, bounds.height);
    camera.updateProjectionMatrix();
    draw();
  }

  async function start() {
    try {
      // Use the same staged local Three.js module and canonical Earth Engine as Home/Earth View.
      T = await import("../vendor/three.module.js");
      if (disposed) return;
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.setClearColor(0, 0);
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(36, 1, 0.1, 40);
      camera.position.z = zoom;
      scene.add(new T.AmbientLight(0x7898bc, 0.55));
      const sunlight = new T.DirectionalLight(0xffffff, 2);
      sunlight.position.set(-3, 2, 4);
      scene.add(sunlight);
      const fill = new T.DirectionalLight(0x2867a9, 0.16);
      fill.position.set(4, -2, -3);
      scene.add(fill);

      earthGlobe = await createEarthGlobe({
        THREE: T,
        radius: 1,
        textureUrl: "../EarthEngine/Assets/earth-land-ocean-ice-2048.png",
        geometryDetail: mode === "hd" ? "high" : "standard",
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
          atmosphere: true
      });
      if (disposed) { earthGlobe.dispose(); earthGlobe = null; return; }
      group = earthGlobe.group;
      scene.add(group);
      orb.classList.add("globe-ready");
      say(mode === "offline"
        ? "Globe ready · using the saved local Earth texture when available."
        : "3D Earth ready · drag to rotate, pinch to zoom.");
      resize();
      if ("ResizeObserver" in window) new ResizeObserver(resize).observe(orb);
      else addEventListener("resize", resize, { passive: true });
    } catch (error) {
      console.error("[LIVE // EARTH] Globe startup failed", error);
      say("Interactive 3D is unavailable. The saved Earth artwork remains visible; check connection and reload.");
    }
  }

  addEventListener("pagehide", () => {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    earthGlobe?.dispose?.();
    renderer?.dispose?.();
  }, { once: true });
  start();
})();
