/* Source for model-thumbnails.js. The release bundle is built with:
 *   esbuild model-thumbnails.source.js --bundle --format=esm --minify
 *     --legal-comments=eof --outfile=model-thumbnails.js
 *   ruby -pi -e 'sub(/^[ ]+\t/, "\t"); sub(/[ \t]+$/, "")' model-thumbnails.js
 *
 * Models remain owned and fetched by the shell. This optional renderer receives
 * bytes through a narrow callback, paints one still image, and releases all GPU
 * geometry immediately afterwards. It never sees auth state or storage paths.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'meshoptimizer/decoder';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_MODEL_BYTES = 4 * 1024 * 1024;
const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const MAX_ACCESSOR_ITEMS = 4 * 1024 * 1024;
const THUMBNAIL_SIZE = 384;

function glbBytes(value) {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : ArrayBuffer.isView(value)
      ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      : null;
  if (!bytes || bytes.byteLength < 20 || bytes.byteLength > MAX_MODEL_BYTES) {
    throw new Error('3D model size is outside the map preview limit');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    throw new Error('Map preview accepts GLB 2.0 only');
  }
  const declared = view.getUint32(8, true);
  if (declared !== bytes.byteLength) throw new Error('Incomplete GLB model');
  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a || jsonLength < 2 || jsonLength + 20 > bytes.byteLength) {
    throw new Error('Invalid GLB JSON chunk');
  }
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', {fatal: true})
      .decode(bytes.subarray(20, 20 + jsonLength)));
  } catch (_) {
    throw new Error('Invalid GLB manifest');
  }
  const resources = [...(manifest.buffers || []), ...(manifest.images || [])];
  if (resources.some(resource => resource.uri &&
      (typeof resource.uri !== 'string' || !resource.uri.startsWith('data:')))) {
    throw new Error('External resources are not allowed in map GLB files');
  }
  const decodedBytes = (manifest.bufferViews || []).reduce((total, bufferView) => {
    const compressed = bufferView.extensions && bufferView.extensions.EXT_meshopt_compression;
    const size = compressed
      ? Number(compressed.count || 0) * Number(compressed.byteStride || 0)
      : Number(bufferView.byteLength || 0);
    return total + (Number.isFinite(size) && size > 0 ? size : 0);
  }, 0);
  const accessorItems = (manifest.accessors || []).reduce((total, accessor) =>
    total + Math.max(0, Number(accessor.count) || 0), 0);
  if (decodedBytes > MAX_DECODED_BYTES || accessorItems > MAX_ACCESSOR_ITEMS) {
    throw new Error('3D model is too complex for a map preview');
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function parseModel(loader, bytes) {
  return new Promise((resolve, reject) => loader.parse(bytes, '', resolve, reject));
}

function disposeModel(root) {
  const textures = new Set();
  const materials = new Set();
  root.traverse(node => {
    if (!node.isMesh) return;
    if (node.geometry) node.geometry.dispose();
    const list = Array.isArray(node.material) ? node.material : [node.material];
    list.filter(Boolean).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => {
        if (value && value.isTexture) textures.add(value);
      });
    });
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
}

function dataUrlFromCanvas(canvas) {
  const url = canvas.toDataURL('image/webp', .9);
  if (!url.startsWith('data:image/webp')) throw new Error('3D preview export failed');
  return url;
}

function rendererKit() {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(28, 1, .01, 40);
  camera.position.set(3.5, 2.55, 5.6);
  camera.lookAt(0, .68, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe5f7ff, 0x17202b, 2.65));
  const key = new THREE.DirectionalLight(0xffffff, 4.25);
  key.position.set(-3.8, 6.5, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8bdfff, 2.35);
  rim.position.set(4.5, 3.2, -4.4);
  scene.add(rim);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.ShadowMaterial({color: 0x00070b, opacity: .52}),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.012;
  ground.receiveShadow = true;
  scene.add(ground);
  return {renderer, camera, scene, ground};
}

function frameModel(root) {
  let box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error('3D model has no visible geometry');
  const size = box.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(extent) || extent <= 0) throw new Error('3D model has invalid bounds');
  root.scale.multiplyScalar(2.55 / extent);
  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= box.min.y;
  root.position.z -= center.z;
  root.rotation.y -= .42;
  root.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
}

function modelImage(figure) {
  const hit = document.createElementNS(SVG_NS, 'rect');
  hit.setAttribute('class', 'fs-model-hit');
  hit.setAttribute('data-fs-injected', 'model-hit');
  hit.setAttribute('x', '-58');
  hit.setAttribute('y', '-58');
  hit.setAttribute('width', '116');
  hit.setAttribute('height', '96');
  hit.setAttribute('rx', '18');
  const image = document.createElementNS(SVG_NS, 'image');
  image.setAttribute('class', 'fs-model-thumbnail');
  image.setAttribute('data-fs-injected', 'model-thumbnail');
  image.setAttribute('x', '-68');
  image.setAttribute('y', '-76');
  image.setAttribute('width', '136');
  image.setAttribute('height', '116');
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const body = figure.querySelector('[data-fs-injected="figure-body"]');
  figure.insertBefore(hit, body || figure.firstChild);
  figure.insertBefore(image, body || figure.firstChild);
  return {image, hit};
}

function loadModelImage(image, url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(reject, new Error('3D preview image timed out')), 5000);
    const finish = (callback, value) => {
      clearTimeout(timeout);
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', failed);
      callback(value);
    };
    const loaded = () => finish(resolve);
    const failed = () => finish(reject, new Error('3D preview image failed to load'));
    image.addEventListener('load', loaded, {once: true});
    image.addEventListener('error', failed, {once: true});
    image.setAttribute('href', url);
  });
}

/**
 * Paint exact per-object GLB files as still, transparent WebP miniatures.
 * The SVG remains the interaction and accessibility owner. At map scale a
 * pre-rendered view is visually equivalent to live geometry, while avoiding a
 * persistent WebGL scene and hundreds of thousands of triangles per object.
 */
export function mountModelThumbnails({figures, requestModel, limit = 8}) {
  let disposed = false;
  let kit = null;
  const inserted = new Set();
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  async function paint(figure) {
    if (disposed || !figure.isConnected) return;
    figure.setAttribute('data-fs-model-loading', '1');
    let root;
    let previewSrc = '';
    let previewNodes = null;
    try {
      const raw = await requestModel(figure, MAX_MODEL_BYTES);
      if (disposed || !figure.isConnected) return;
      await MeshoptDecoder.ready;
      const gltf = await parseModel(loader, glbBytes(raw));
      root = gltf.scene;
      if (disposed || !figure.isConnected) {
        disposeModel(root);
        root = null;
        return;
      }
      frameModel(root);
      if (!kit) kit = rendererKit();
      kit.scene.add(root);
      kit.renderer.render(kit.scene, kit.camera);
      previewSrc = dataUrlFromCanvas(kit.renderer.domElement);
      kit.scene.remove(root);
      disposeModel(root);
      root = null;
      if (disposed || !figure.isConnected) return;
      previewNodes = modelImage(figure);
      inserted.add(previewNodes.hit); inserted.add(previewNodes.image);
      await loadModelImage(previewNodes.image, previewSrc);
      if (disposed || !figure.isConnected) return;
      figure.setAttribute('data-fs-model-ready', '1');
      figure.removeAttribute('data-fs-model-loading');
    } catch (_) {
      if (root) {
        if (root.parent) root.parent.remove(root);
        disposeModel(root);
      }
      if (previewNodes) {
        previewNodes.hit.remove();
        previewNodes.image.remove();
        inserted.delete(previewNodes.hit);
        inserted.delete(previewNodes.image);
      }
      if (!disposed && figure.isConnected) {
        figure.removeAttribute('data-fs-model-loading');
        figure.setAttribute('data-fs-model-error', '1');
      }
    }
  }

  const chosen = figures.filter(figure => figure.getAttribute('data-model-document'))
    .slice(0, Math.max(0, limit));
  const ready = chosen.reduce((previous, figure) => previous.then(() => paint(figure)),
    Promise.resolve());

  return {
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      inserted.forEach(image => image.remove());
      figures.forEach(figure => {
        figure.removeAttribute('data-fs-model-loading');
        figure.removeAttribute('data-fs-model-ready');
        figure.removeAttribute('data-fs-model-error');
      });
      if (kit) {
        kit.ground.geometry.dispose();
        kit.ground.material.dispose();
        kit.renderer.dispose();
        kit.renderer.forceContextLoss();
      }
    },
  };
}
