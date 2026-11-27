/* LIVE // EARTH — optional HD terrain controller.
 * Uses public Mapzen/Tilezen Terrarium elevation tiles hosted by AWS Open Data.
 * This module owns only its terrain meshes, tile requests and temporary GPU resources.
 * It never creates or owns an Earth globe, scene, camera, renderer or gestures.
 */

const TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const ATTRIBUTION_URL = "https://github.com/tilezen/joerd/blob/master/docs/attribution.md";
const EARTH_RADIUS_METRES = 6371000;
const VERTICAL_EXAGGERATION = 8;
const SURFACE_OFFSET = 0.0008;
const MAX_ZOOM = 8;
const MAX_MEMORY_TILES = 32;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function wrappedTileX(value, count) {
  return ((value % count) + count) % count;
}

function latitudeFromMercatorY(globalY, count) {
  const mercator = Math.PI * (1 - 2 * globalY / count);
  return Math.atan(Math.sinh(mercator));
}

function tileForLocation(longitude, latitude, zoom) {
  const count = 2 ** zoom;
  const safeLatitude = clamp(latitude, -85.05112878, 85.05112878);
  const x = wrappedTileX(Math.floor(((longitude + Math.PI) / (2 * Math.PI)) * count), count);
  const mercatorY = (1 - Math.asinh(Math.tan(safeLatitude)) / Math.PI) / 2;
  const y = clamp(Math.floor(mercatorY * count), 0, count - 1);
  return { x, y, z: zoom };
}

async function decodeTerrariumTile(response) {
  const blob = await response.blob();
  let bitmap = null;
  let image = null;
  let objectUrl = null;
  let width = 0;
  let height = 0;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The browser could not prepare an elevation tile.");

  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(blob);
      width = bitmap.width;
      height = bitmap.height;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(bitmap, 0, 0);
    } else {
      objectUrl = URL.createObjectURL(blob);
      image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("An elevation tile could not be decoded."));
        image.src = objectUrl;
      });
      width = image.naturalWidth;
      height = image.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0);
    }
    if (!(width > 0 && height > 0)) throw new Error("An elevation tile was empty.");
    const pixels = context.getImageData(0, 0, width, height).data;
    return { width, height, pixels };
  } finally {
    bitmap?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function sampleElevation(tile, u, v) {
  const x = clamp(u, 0, 1) * (tile.width - 1);
  const y = clamp(v, 0, 1) * (tile.height - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(tile.width - 1, x0 + 1);
  const y1 = Math.min(tile.height - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const read = (px, py) => {
    const offset = (py * tile.width + px) * 4;
    const red = tile.pixels[offset];
    const green = tile.pixels[offset + 1];
    const blue = tile.pixels[offset + 2];
    return red * 256 + green + blue / 256 - 32768;
  };
  const top = read(x0, y0) * (1 - tx) + read(x1, y0) * tx;
  const bottom = read(x0, y1) * (1 - tx) + read(x1, y1) * tx;
  return top * (1 - ty) + bottom * ty;
}

export function createEarthTerrainController(options = {}) {
  const THREE = options.THREE;
  const earthMesh = options.earthMesh;
  const requestRender = typeof options.requestRender === "function" ? options.requestRender : () => {};
  const getCameraDistance = typeof options.getCameraDistance === "function" ? options.getCameraDistance : () => 5;
  const getHomeDistance = typeof options.getHomeDistance === "function" ? options.getHomeDistance : () => 9;
  const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
  const onUnavailable = typeof options.onUnavailable === "function" ? options.onUnavailable : () => {};

  if (!THREE?.BufferGeometry || !THREE?.Mesh || !earthMesh?.add || !earthMesh?.material?.map) {
    throw new TypeError("Earth Terrain requires the active Earth View globe and its Three.js namespace.");
  }

  let enabled = false;
  let disposed = false;
  let scheduleTimer = 0;
  let generation = 0;
  let material = null;
  let credit = null;
  let unavailableReported = false;
  const meshes = new Map();
  const decodedTiles = new Map();
  const inFlight = new Map();
  let desiredKeys = new Set();

  function tileKey(tile) { return `${tile.z}/${tile.x}/${tile.y}`; }

  function rememberTile(key, tile) {
    decodedTiles.delete(key);
    decodedTiles.set(key, tile);
    while (decodedTiles.size > MAX_MEMORY_TILES) {
      decodedTiles.delete(decodedTiles.keys().next().value);
    }
  }

  async function fetchTile(tile) {
    const key = tileKey(tile);
    if (decodedTiles.has(key)) return decodedTiles.get(key);
    if (inFlight.has(key)) return inFlight.get(key).promise;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 14000);
    const url = TILE_URL.replace("{z}", tile.z).replace("{x}", tile.x).replace("{y}", tile.y);
    let promise = null;
    promise = (async () => {
      try {
        const response = await fetch(url, {
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok || response.type === "opaque") {
          throw new Error(`Elevation tile request returned ${response.status || "an unusable response"}.`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (!/^image\//i.test(contentType)) throw new Error("The elevation provider returned a non-image tile.");
        const decoded = await decodeTerrariumTile(response);
        // A Basic/HD toggle must not discard a tile that has already been
        // downloaded. Keep decoded data while the view is alive, even if HD
        // was switched off during the request. Only final disposal cancels it.
        if (controller.signal.aborted || disposed) {
          const abortError = new Error("The terrain request was cancelled.");
          abortError.name = "AbortError";
          throw abortError;
        }
        rememberTile(key, decoded);
        return decoded;
      } finally {
        window.clearTimeout(timeout);
        if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
      }
    })();
    inFlight.set(key, { controller, promise });
    return promise;
  }

  function createTileGeometry(tile, decoded) {
    const segments = tile.z >= 6 ? 128 : tile.z >= 4 ? 96 : tile.z >= 3 ? 64 : 32;
    const stride = segments + 1;
    const positions = new Float32Array(stride * stride * 3);
    const uvs = new Float32Array(stride * stride * 2);
    const indices = [];
    const count = 2 ** tile.z;

    for (let row = 0; row <= segments; row++) {
      const v = row / segments;
      const globalY = tile.y + v;
      const latitude = latitudeFromMercatorY(globalY, count);
      const cosLatitude = Math.cos(latitude);
      for (let column = 0; column <= segments; column++) {
        const u = column / segments;
        const globalX = tile.x + u;
        const longitude = (globalX / count) * Math.PI * 2 - Math.PI;
        const elevation = Math.max(0, sampleElevation(decoded, u, v));
        const radius = 1 + SURFACE_OFFSET + elevation * VERTICAL_EXAGGERATION / EARTH_RADIUS_METRES;
        const index = row * stride + column;
        positions[index * 3] = radius * cosLatitude * Math.cos(longitude);
        positions[index * 3 + 1] = radius * Math.sin(latitude);
        positions[index * 3 + 2] = -radius * cosLatitude * Math.sin(longitude);
        uvs[index * 2] = (longitude + Math.PI) / (Math.PI * 2);
        uvs[index * 2 + 1] = (latitude + Math.PI / 2) / Math.PI;
      }
    }

    for (let row = 0; row < segments; row++) {
      for (let column = 0; column < segments; column++) {
        const a = row * stride + column;
        const b = (row + 1) * stride + column;
        const c = row * stride + column + 1;
        const d = (row + 1) * stride + column + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function addTileMesh(tile, decoded) {
    const key = tileKey(tile);
    if (!enabled || !desiredKeys.has(key) || meshes.has(key)) return false;
    const geometry = createTileGeometry(tile, decoded);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `liveEarthTerrain-${key.replaceAll("/", "-")}`;
    mesh.frustumCulled = true;
    mesh.renderOrder = 1;
    earthMesh.add(mesh);
    meshes.set(key, mesh);
    requestRender();
    return true;
  }

  function removeMesh(key) {
    const mesh = meshes.get(key);
    if (!mesh) return;
    mesh.removeFromParent?.();
    mesh.geometry?.dispose?.();
    meshes.delete(key);
  }

  function getVisibleCenter() {
    const worldFacing = new THREE.Vector3(0, 0, 1);
    const inverse = new THREE.Quaternion();
    earthMesh.getWorldQuaternion(inverse);
    inverse.invert();
    worldFacing.applyQuaternion(inverse).normalize();
    return {
      latitude: Math.asin(clamp(worldFacing.y, -1, 1)),
      longitude: Math.atan2(-worldFacing.z, worldFacing.x)
    };
  }

  function chooseZoom() {
    const distance = Math.max(1.2, Number(getCameraDistance()) || 5);
    const home = Math.max(distance, Number(getHomeDistance()) || 9);
    return clamp(Math.round(1 + Math.log2(home / distance) * 2.2), 2, MAX_ZOOM);
  }

  function desiredTiles() {
    const center = getVisibleCenter();
    const zoom = chooseZoom();
    const centerTile = tileForLocation(center.longitude, center.latitude, zoom);
    const radius = zoom >= 4 ? 2 : 1;
    const count = 2 ** zoom;
    const tiles = new Map();
    for (let yOffset = -radius; yOffset <= radius; yOffset++) {
      const y = centerTile.y + yOffset;
      if (y < 0 || y >= count) continue;
      for (let xOffset = -radius; xOffset <= radius; xOffset++) {
        const x = wrappedTileX(centerTile.x + xOffset, count);
        const tile = { z: zoom, x, y };
        tiles.set(tileKey(tile), tile);
      }
    }
    return [...tiles.values()];
  }

  async function updateTiles() {
    if (!enabled || disposed || !navigator.onLine) return;
    const requestGeneration = ++generation;
    const tiles = desiredTiles();
    desiredKeys = new Set(tiles.map(tileKey));
    const results = await Promise.allSettled(tiles.map(async tile => {
      const key = tileKey(tile);
      if (meshes.has(key)) return true;
      const decoded = await fetchTile(tile);
      return addTileMesh(tile, decoded);
    }));

    if (!enabled || disposed || requestGeneration !== generation) return;
    const loaded = results.some(result => result.status === "fulfilled" && result.value);
    if (loaded || tiles.every(tile => meshes.has(tileKey(tile)))) {
      for (const key of [...meshes.keys()]) {
        if (!desiredKeys.has(key)) removeMesh(key);
      }
      requestRender();
    } else if (meshes.size === 0 && !unavailableReported) {
      unavailableReported = true;
      onUnavailable(new Error("No elevation tiles could be loaded."));
    }
  }

  function scheduleUpdate(immediate = false) {
    if (!enabled || disposed) return;
    if (scheduleTimer) window.clearTimeout(scheduleTimer);
    scheduleTimer = window.setTimeout(() => {
      scheduleTimer = 0;
      updateTiles().catch(error => {
        if (!enabled || disposed || error?.name === "AbortError") return;
        if (meshes.size === 0 && !unavailableReported) {
          unavailableReported = true;
          onUnavailable(error);
        }
      });
    }, immediate ? 0 : 260);
  }

  function showCredit() {
    if (credit?.isConnected) return;
    credit = document.createElement("div");
    credit.id = "le-earth-terrain-credit";
    credit.style.cssText = "position:fixed;z-index:11;left:12px;top:calc(env(safe-area-inset-top) + 12px);max-width:min(58vw,260px);padding:5px 8px;border:1px solid rgba(180,220,245,.18);border-radius:8px;background:rgba(2,8,18,.58);color:rgba(220,237,250,.72);font:500 9px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;letter-spacing:.025em;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:auto";
    credit.innerHTML = `
      <div style="color:#e5f4ff;font-weight:650">Elevation tiles: AWS Open Data / Tilezen</div>
      <details style="margin-top:3px">
        <summary style="color:#9bdcff;cursor:pointer">Required source credits</summary>
        <div style="max-height:30vh;overflow:auto;padding:5px 2px 2px;line-height:1.45">
          <div>ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc. imagery and funded under National Science Foundation awards 1043681, 1559691 and 1542736.</div>
          <div>Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017.</div>
          <div>Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich.</div>
          <div>Canada terrain data contains information licensed under the Open Government Licence – Canada.</div>
          <div>Europe terrain data produced using Copernicus data and information funded by the European Union – EU-DEM layers.</div>
          <div>Global ETOPO1 terrain data: U.S. National Oceanic and Atmospheric Administration.</div>
          <div>Mexico terrain data source: INEGI, Continental relief, 2016.</div>
          <div>New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved).</div>
          <div>Norway terrain data © Kartverket.</div>
          <div>United Kingdom terrain data © Environment Agency copyright and/or database right 2015.</div>
          <div>United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.</div>
          <a href="${ATTRIBUTION_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:5px;color:#9bdcff;text-decoration:underline">Full attribution and licence notes</a>
        </div>
      </details>`;
    document.body.appendChild(credit);
  }

  function removeCredit() {
    credit?.remove?.();
    credit = null;
  }

  function enable() {
    if (disposed) throw new Error("The terrain controller has been disposed.");
    if (!navigator.onLine) throw new Error("HD terrain requires an internet connection.");
    if (enabled) return true;
    enabled = true;
    unavailableReported = false;
    material = earthMesh.material.clone();
    material.side = THREE.FrontSide;
    material.depthWrite = true;
    material.transparent = false;
    showCredit();
    onStatus("HD terrain · loading real elevation tiles…");
    scheduleUpdate(true);
    return true;
  }

  function disable() {
    if (!enabled && !meshes.size && !credit) return;
    enabled = false;
    generation++;
    if (scheduleTimer) window.clearTimeout(scheduleTimer);
    scheduleTimer = 0;
    // Basic hides HD geometry, but retains decoded elevation tiles and lets
    // already-started downloads finish. Re-entering HD can rebuild meshes
    // from memory instead of downloading the same tiles again.
    for (const key of [...meshes.keys()]) removeMesh(key);
    material?.dispose?.();
    material = null;
    desiredKeys.clear();
    removeCredit();
    requestRender();
  }

  function dispose() {
    if (disposed) return;
    disable();
    disposed = true;
    // The cache belongs to this Earth View session, not to the next one.
    for (const request of inFlight.values()) request.controller.abort();
    inFlight.clear();
    decodedTiles.clear();
  }

  return Object.freeze({
    enable,
    disable,
    dispose,
    scheduleUpdate: () => scheduleUpdate(false),
    getState: () => Object.freeze({ enabled, tileCount: meshes.size, pendingCount: inFlight.size })
  });
}
