/* LIVE // EARTH — Little Lady GLB prototype preview.
 * Opt-in only: ?residentPrototype=little-lady
 * Uses the app's existing local Three.js r180 runtime. The pinned r180 GLTFLoader
 * source is fetched on first online use, import paths are rewritten to the local
 * same-origin Three.js module, and the source is retained in CacheStorage so the
 * preview can be reopened offline after its first successful load.
 */
import * as THREE from '../vendor/three.module.js';

const CACHE_NAME = 'live-earth-resident-prototype-v1';
const LOADER_SOURCE_URLS = Object.freeze([
  'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js',
  'https://unpkg.com/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'
]);
const MODEL_URL = new URL('./Residents/assets/little-lady-prototype-v02.glb', document.baseURI).href;
const LOADER_CACHE_KEY = new URL('./Residents/.prototype-cache/GLTFLoader-r180.js', document.baseURI).href;
const MODEL_CACHE_KEY = new URL('./Residents/.prototype-cache/LittleLady_Prototype_0.2.glb', document.baseURI).href;
let loaderModulePromise = null;

async function readOrFetchText(urls, cacheKey, minimumLength) {
  let cache = null;
  let key = null;
  try {
    cache = await caches.open(CACHE_NAME);
    key = new Request(cacheKey);
    const stored = await cache.match(key);
    if (stored) {
      const cachedText = await stored.text();
      if (cachedText.length >= minimumLength) return cachedText;
      await cache.delete(key).catch(() => {});
    }
  } catch (cacheError) {
    console.warn('[LIVE // EARTH] Prototype loader cache is unavailable; trying the online source.', cacheError?.message || cacheError);
  }

  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!response.ok || response.type === 'opaque') throw new Error(`Loader source returned HTTP ${response.status}`);
      const source = await response.text();
      if (source.length < minimumLength) throw new Error('Pinned loader source is empty or truncated.');
      if (cache && key) {
        try {
          await cache.put(key, new Response(source, {
            status: 200,
            headers: { 'Content-Type': 'text/javascript; charset=utf-8' }
          }));
        } catch (cacheError) {
          console.warn('[LIVE // EARTH] Could not persist the GLTFLoader source; current online preview can continue.', cacheError?.message || cacheError);
        }
      }
      return source;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Could not prepare the pinned Three.js r180 GLTFLoader. ${lastError?.message || ''}`);
}

function trianglesHelperSource(threeUrl) {
  return `
import { TrianglesDrawMode, TriangleFanDrawMode, TriangleStripDrawMode } from '${threeUrl}';
export function toTrianglesDrawMode(geometry, drawMode) {
  if (drawMode === TrianglesDrawMode) return geometry;
  if (drawMode !== TriangleFanDrawMode && drawMode !== TriangleStripDrawMode) return geometry;
  let index = geometry.getIndex();
  if (index === null) {
    const position = geometry.getAttribute('position');
    if (!position) return geometry;
    const indices = [];
    for (let i = 0; i < position.count; i++) indices.push(i);
    geometry.setIndex(indices);
    index = geometry.getIndex();
  }
  const triangleCount = index.count - 2;
  const indices = [];
  if (drawMode === TriangleFanDrawMode) {
    for (let i = 1; i <= triangleCount; i++) {
      indices.push(index.getX(0), index.getX(i), index.getX(i + 1));
    }
  } else {
    for (let i = 0; i < triangleCount; i++) {
      if (i % 2 === 0) indices.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      else indices.push(index.getX(i + 2), index.getX(i + 1), index.getX(i));
    }
  }
  const converted = geometry.clone();
  converted.setIndex(indices);
  converted.clearGroups();
  return converted;
}
`;
}

async function getGLTFLoaderClass() {
  if (!loaderModulePromise) {
    loaderModulePromise = (async () => {
      const source = await readOrFetchText(LOADER_SOURCE_URLS, LOADER_CACHE_KEY, 50000);
      const threeUrl = new URL('./vendor/three.module.js', document.baseURI).href;
      const helperBlobUrl = URL.createObjectURL(new Blob([trianglesHelperSource(threeUrl)], { type: 'text/javascript' }));
      let rewritten = source.replace(/from\s+['"]three['"]/g, `from '${threeUrl}'`);
      const helperImport = /import\s*\{\s*toTrianglesDrawMode\s*\}\s*from\s*['"]\.\.\/utils\/BufferGeometryUtils\.js['"]\s*;/;
      if (!helperImport.test(rewritten)) {
        URL.revokeObjectURL(helperBlobUrl);
        throw new Error('The pinned GLTFLoader import layout changed; refusing an unverified loader.');
      }
      rewritten = rewritten.replace(helperImport, `import { toTrianglesDrawMode } from '${helperBlobUrl}';`);
      if (/from\s+['"]three['"]/.test(rewritten)) {
        URL.revokeObjectURL(helperBlobUrl);
        throw new Error('GLTFLoader still contains an unresolved bare Three.js import.');
      }
      const loaderBlobUrl = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }));
      try {
        const loaded = await import(loaderBlobUrl);
        if (typeof loaded.GLTFLoader !== 'function') throw new Error('Pinned GLTFLoader did not export GLTFLoader.');
        return loaded.GLTFLoader;
      } finally {
        URL.revokeObjectURL(loaderBlobUrl);
        URL.revokeObjectURL(helperBlobUrl);
      }
    })().catch(error => {
      loaderModulePromise = null;
      throw error;
    });
  }
  return loaderModulePromise;
}

async function readModelBytes() {
  let cache = null;
  let key = null;
  try {
    cache = await caches.open(CACHE_NAME);
    key = new Request(MODEL_CACHE_KEY);
  } catch (cacheError) {
    console.warn('[LIVE // EARTH] Prototype model cache is unavailable; trying the online GLB.', cacheError?.message || cacheError);
  }

  try {
    const response = await fetch(MODEL_URL, { cache: 'no-store' });
    if (!response.ok || response.type === 'opaque') throw new Error(`Little Lady GLB returned HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 1000000) throw new Error('Little Lady GLB is empty or truncated.');
    if (cache && key) {
      try {
        await cache.put(key, new Response(bytes.slice(0), {
          status: 200,
          headers: { 'Content-Type': 'model/gltf-binary' }
        }));
      } catch (cacheError) {
        console.warn('[LIVE // EARTH] Could not persist the GLB in prototype cache; current online preview can continue.', cacheError?.message || cacheError);
      }
    }
    return bytes;
  } catch (networkError) {
    let stored = null;
    try { if (cache && key) stored = await cache.match(key); } catch (_) {}
    if (!stored) throw new Error(`Little Lady prototype is not cached yet and the network is unavailable. ${networkError?.message || ''}`);
    const bytes = await stored.arrayBuffer();
    if (bytes.byteLength < 1000000) throw new Error('Cached Little Lady GLB is empty or truncated.');
    return bytes;
  }
}

function disposeObjectResources(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const imageBitmaps = new Set();
  root?.traverse?.(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture) textures.add(value);
        }
      }
    }
    if (object.skeleton) object.skeleton.dispose?.();
  });
  textures.forEach(texture => {
    const image = texture.source?.data || texture.image;
    for (const candidate of Array.isArray(image) ? image : [image]) {
      if (candidate && typeof candidate.close === 'function') imageBitmaps.add(candidate);
    }
    texture.dispose();
  });
  imageBitmaps.forEach(bitmap => bitmap.close());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export function createLittleLadyPrototype(canvas, initialState = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.2, 2.2, 1.16, -1.16, 0.1, 40);
  camera.position.set(0.16, 1.42, 8);
  camera.lookAt(0, 1.12, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  scene.add(new THREE.HemisphereLight(0xfff7ed, 0x60756d, 1.55));
  const key = new THREE.DirectionalLight(0xffefdf, 1.90);
  key.position.set(-3.2, 5.2, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd4e5ff, 0.58);
  fill.position.set(4, 2.4, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd6a6, 0.78);
  rim.position.set(0, 3, -3);
  scene.add(rim);

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 32),
    new THREE.MeshBasicMaterial({ color: 0x183b39, transparent: true, opacity: 0.12, depthWrite: false })
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.y = 0.008;
  groundShadow.scale.set(1.42, 0.72, 1);
  scene.add(groundShadow);

  let alive = true;
  let modelRoot = null;
  let mixer = null;
  let idleAction = null;
  let walkAction = null;
  let smileAction = null;
  let activeAction = null;
  let frame = 0;
  let lastRender = 0;
  let width = 0;
  let height = 0;
  let mode = initialState.mode || 'calm';
  let reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const clock = new THREE.Clock();

  const resize = () => {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === width && h === height) return;
    width = w;
    height = h;
    const aspect = w / h;
    const halfHeight = 1.16;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  resize();

  function selectAction(nextAction) {
    if (!nextAction || nextAction === activeAction) return;
    nextAction.reset();
    nextAction.setLoop(THREE.LoopRepeat, Infinity);
    nextAction.fadeIn(0.22).play();
    activeAction?.fadeOut(0.22);
    activeAction = nextAction;
  }

  function setActivity(nextState = {}) {
    mode = String(nextState.mode || 'calm');
    if (['morning', 'play', 'walk'].includes(mode)) selectAction(walkAction || idleAction);
    else selectAction(idleAction);
    if (smileAction && ['play', 'festival'].includes(mode)) {
      smileAction.reset();
      smileAction.setLoop(THREE.LoopOnce, 1);
      smileAction.clampWhenFinished = true;
      smileAction.fadeIn(0.12).play();
    } else if (smileAction) {
      smileAction.stop();
    }
    return true;
  }

  const ready = (async () => {
    const [GLTFLoader, bytes] = await Promise.all([getGLTFLoaderClass(), readModelBytes()]);
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(bytes, new URL('./Residents/assets/', document.baseURI).href);
    if (!alive) {
      disposeObjectResources(gltf.scene);
      return;
    }
    modelRoot = gltf.scene;
    modelRoot.traverse(object => {
      if (object.isMesh || object.isSkinnedMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
      }
    });
    modelRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = 2.08;
    const scale = targetHeight / Math.max(0.001, size.y);
    modelRoot.scale.setScalar(scale);
    modelRoot.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    modelRoot.rotation.y = 0;
    scene.add(modelRoot);

    mixer = new THREE.AnimationMixer(modelRoot);
    const findClip = name => gltf.animations.find(clip => clip.name === name);
    const idleClip = findClip('Idle_Breath_and_Gaze');
    const walkClip = findClip('Walk_In_Place');
    const smileClip = findClip('Smile_Expression');
    if (idleClip) idleAction = mixer.clipAction(idleClip);
    if (walkClip) walkAction = mixer.clipAction(walkClip);
    if (smileClip) smileAction = mixer.clipAction(smileClip);
    selectAction(idleAction || walkAction);
    setActivity(initialState);
  })();

  function animate(now) {
    if (!alive) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden || now - lastRender < 32) return;
    lastRender = now;
    const dt = Math.min(0.06, Math.max(0, clock.getDelta()));
    if (mixer && !reducedMotion) mixer.update(dt);
    else if (mixer) mixer.update(dt * 0.28);
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);

  return Object.freeze({
    ready,
    setActivity,
    dispose() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      mixer?.stopAllAction();
      if (modelRoot) disposeObjectResources(modelRoot);
      groundShadow.geometry.dispose();
      groundShadow.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    }
  });
}
