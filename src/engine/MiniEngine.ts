// ============================================================================
//  EDITABLE.
// ============================================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EventManager } from './EventManager';
import { SelectionManager } from './SelectionManager';
import { buildScene } from './SceneFactory';
import { BACKEND_ASSEMBLY, buildAssemblySkeleton } from './BackendScene';
import { applyAssembly, readAssembly, DEFAULT_EULER_ORDER, type Convention, type BackendNode } from './CoordinateBridge';

function makeBackground(): THREE.DataTexture {
  const size = 2048;
  const data = new Uint8Array(size * size * 4);
  data.fill(30);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function disposeMaterial(material: THREE.Material, disposedTextures: Set<THREE.Texture>): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
      value.dispose();
      disposedTextures.add(value);
    }
  }
  material.dispose();
}

function disposeObjectTree(object: THREE.Object3D): void {
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();

    const material = mesh.material;
    if (Array.isArray(material)) {
      for (const mat of material) {
        if (disposedMaterials.has(mat)) continue;
        disposeMaterial(mat, disposedTextures);
        disposedMaterials.add(mat);
      }
    } else if (material && !disposedMaterials.has(material)) {
      disposeMaterial(material, disposedTextures);
      disposedMaterials.add(material);
    }
  });
}

function disposeSceneBackground(scene: THREE.Scene): void {
  if (scene.background instanceof THREE.Texture) scene.background.dispose();
  scene.background = null;
}

function makeHandednessCurl(): THREE.Group {
  const g = new THREE.Group();
  const R = 1.2;
  const arc = Math.PI * 1.5;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd24a, depthTest: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 48, arc), mat);
  ring.renderOrder = 1002;
  ring.userData.gizmo = true;
  g.add(ring);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 12), mat);
  head.renderOrder = 1002;
  head.userData.gizmo = true;
  head.position.set(Math.cos(arc) * R, Math.sin(arc) * R, 0);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(arc), Math.cos(arc), 0));
  g.add(head);
  return g;
}

export type SceneName = 'A' | 'B' | 'coords';

const UP_AXIS: Record<Convention['up'], [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
  '-x': [-1, 0, 0],
  '-y': [0, -1, 0],
  '-z': [0, 0, -1],
};

export class MiniEngine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls!: OrbitControls;
  events = new EventManager();
  selection: SelectionManager;
  root: THREE.Group | null = null;

  fps = 0;

  convention: Convention = { up: 'y', handed: 'right' };
  currentScene: SceneName = 'A';

  private assemblyRoot: THREE.Object3D | null = null;
  private assemblyData: BackendNode = BACKEND_ASSEMBLY;
  private worldAxes: THREE.AxesHelper;
  private handednessCurl: THREE.Group;
  private sceneLog: { name: SceneName; t: number }[] = [];

  private raf = 0;
  private frames = 0;
  private fpsLast = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
    this.camera.position.set(3, 3, 8);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(5, 8, 5);
    this.scene.add(dir);

    this.worldAxes = new THREE.AxesHelper(2.2);
    this.worldAxes.visible = false;
    this.scene.add(this.worldAxes);

    this.handednessCurl = makeHandednessCurl();
    this.handednessCurl.visible = false;
    this.scene.add(this.handednessCurl);

    this.selection = new SelectionManager(this.scene, this.camera, canvas, this.events);

    this.makeControls(new THREE.Vector3(0, 1, 0));

    const loop = () => {
      this.controls.update();
      this.selection.tick();
      this.renderer.render(this.scene, this.camera);

      this.frames++;
      const now = performance.now();
      if (now - this.fpsLast >= 500) {
        this.fps = Math.round((this.frames * 1000) / (now - this.fpsLast));
        this.frames = 0;
        this.fpsLast = now;
      }

      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  loadScene(name: SceneName): void {
    this.selection.select(null);
    if (this.root) {
      this.scene.remove(this.root);
      disposeObjectTree(this.root);
      this.root = null;
    }
    disposeSceneBackground(this.scene);

    this.currentScene = name;
    this.sceneLog.push({ name, t: performance.now() });

    if (name === 'coords') {
      this.assemblyData = JSON.parse(JSON.stringify(BACKEND_ASSEMBLY)) as BackendNode;
      this.assemblyRoot = buildAssemblySkeleton(BACKEND_ASSEMBLY);
      applyAssembly(this.assemblyRoot, this.assemblyData, this.convention, DEFAULT_EULER_ORDER);
      const group = new THREE.Group();
      group.name = 'Assembly';
      group.add(this.assemblyRoot);
      this.root = group;
      this.worldAxes.visible = true;
      this.handednessCurl.visible = true;
      this.updateGnomon();
      this.frameCamera();
    } else {
      this.assemblyRoot = null;
      this.root = buildScene(name);
      this.worldAxes.visible = false;
      this.handednessCurl.visible = false;
      this.frameCamera();
    }

    this.scene.add(this.root);
    this.scene.background = makeBackground();
    this.events.dispatch('scene_loaded', this.root);
  }

  setConvention(conv: Convention): void {
    if (this.currentScene === 'coords' && this.assemblyRoot) {
      this.selection.select(null);
      this.assemblyData = readAssembly(this.assemblyRoot, this.assemblyData, this.convention, DEFAULT_EULER_ORDER);
      this.convention = conv;
      applyAssembly(this.assemblyRoot, this.assemblyData, this.convention, DEFAULT_EULER_ORDER);
      this.updateGnomon();
      this.frameCamera();
      this.events.dispatch('object_rotation_changed', this.root);
    } else {
      this.convention = conv;
    }
    this.events.dispatch('convention_changed', conv);
  }

  private refBasis(): THREE.Matrix4 {
    const B = new THREE.Matrix4().makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...UP_AXIS[this.convention.up]))
    );
    if (this.convention.handed === 'left') B.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
    return B;
  }

  private updateGnomon(): void {
    this.worldAxes.quaternion.identity();
    this.worldAxes.scale.set(1, 1, 1);
    this.updateHandedness();
  }

  private updateHandedness(): void {
    this.handednessCurl.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(...UP_AXIS[this.convention.up])
    );
    this.handednessCurl.scale.set(this.convention.handed === 'left' ? -1 : 1, 1, 1);
  }

  private frameCamera(): void {
    let target: THREE.Vector3;
    if (this.currentScene === 'coords') {
      const B = this.refBasis();
      const center = new THREE.Vector3(0, 0, 1.25).applyMatrix4(B);
      const up = new THREE.Vector3(...UP_AXIS[this.convention.up]);
      const front = new THREE.Vector3(0, 1, 0).transformDirection(B);
      const side = new THREE.Vector3().crossVectors(front, up).normalize();
      this.camera.up.copy(up);
      this.camera.position.copy(center).addScaledVector(front, 6).addScaledVector(up, 1.2).addScaledVector(side, 2.2);
      this.camera.lookAt(center);
      target = center;
    } else {
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(3, 3, 8);
      this.camera.lookAt(0, 1, 0);
      target = new THREE.Vector3(0, 1, 0);
    }
    this.makeControls(target);
  }

  private makeControls(target: THREE.Vector3): void {
    if (this.controls) this.controls.dispose();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.copy(target);
    this.controls.update();
    this.selection.orbit = this.controls;
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.selection.select(null);
    if (this.root) {
      this.scene.remove(this.root);
      disposeObjectTree(this.root);
      this.root = null;
    }
    disposeSceneBackground(this.scene);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
