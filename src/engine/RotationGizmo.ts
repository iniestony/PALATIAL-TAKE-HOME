// ============================================================================
//  Part 2 lives here.
//   2a — implement the two hooks marked "IMPLEMENT ME" (getGizmoOrientation,
//        applyAxisRotation). The rings, picking, and drag→swept-angle math below
//        are provided; for correct behavior you need only the two hooks.
//   2b — once behavior is correct, this WHOLE file is yours: improve the gizmo,
//        visually and to use. Keep the 2a rotation behavior correct.
// ============================================================================
import * as THREE from 'three';

export type GizmoSpace = 'local' | 'world';

const AXIS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const AXIS_COLOR = [0xff5566, 0x66dd66, 0x5588ff];

export class RotationGizmo {
  group = new THREE.Group();
  private rings: THREE.Mesh[] = [];
  object: THREE.Object3D | null = null;
  space: GizmoSpace = 'local';

  private dragging = false;
  private worldAxis = new THREE.Vector3();
  private pivot = new THREE.Vector3();
  private center = new THREE.Vector3();
  private prevVec = new THREE.Vector3();
  private plane = new THREE.Plane();
  private ray = new THREE.Raycaster();
  private hoveredRing: THREE.Mesh | null = null;
  private draggedRing: THREE.Mesh | null = null;
  private axes: THREE.AxesHelper;
  private _q = new THREE.Quaternion();

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private dom: HTMLElement
  ) {
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.TorusGeometry(1, 0.04, 10, 72);
      if (i === 0) geo.rotateY(Math.PI / 2);
      else if (i === 1) geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: AXIS_COLOR[i], depthTest: false });
      const ring = new THREE.Mesh(geo, mat);
      ring.renderOrder = 1000;
      ring.userData.axisIndex = i;
      ring.userData.gizmo = true;
      ring.userData.baseColor = new THREE.Color(AXIS_COLOR[i]);
      ring.userData.hiColor = new THREE.Color(AXIS_COLOR[i]).lerp(new THREE.Color(0xffffff), 0.6);
      this.rings.push(ring);
      this.group.add(ring);
    }
    this.group.visible = false;
    this.scene.add(this.group);

    this.axes = new THREE.AxesHelper(1.3);
    (this.axes.material as THREE.Material).depthTest = false;
    this.axes.renderOrder = 1001;
    this.axes.visible = false;
    this.scene.add(this.axes);
  }

  attach(object: THREE.Object3D | null): void {
    this.object = object;
    this.group.visible = !!object;
    this.axes.visible = !!object;
    this.hover(null);
    if (object) this.update();
  }

  setSpace(space: GizmoSpace): void {
    this.space = space;
    this.update();
  }

  update(): void {
    const obj = this.object;
    if (!obj || !this.group.visible || this.dragging) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) obj.getWorldPosition(this.center);
    else box.getCenter(this.center);
    this.group.position.copy(this.center);
    this.group.quaternion.copy(this.getGizmoOrientation(obj, this.space));
    this.tick();
    this.updateAxes();
  }

  tick(): void {
    if (!this.object || !this.group.visible) return;
    const s = Math.max(this.camera.position.distanceTo(this.center) * 0.12, 0.05);
    this.group.scale.setScalar(s);
    this.axes.scale.setScalar(s);
  }

  private updateAxes(): void {
    const obj = this.object;
    if (!obj) return;
    if (this.space === 'world') {
      this._q.identity();
    } else {
      obj.updateWorldMatrix(true, false);
      obj.getWorldQuaternion(this._q);
    }
    this.axes.position.copy(this.center);
    this.axes.quaternion.copy(this._q);
  }

  setRingHover(clientX: number, clientY: number): boolean {
    if (!this.object || !this.group.visible || this.dragging) {
      this.hover(null);
      return false;
    }
    const hit = this.pointerRay(clientX, clientY).intersectObjects(this.rings, false)[0];
    const ring = hit ? (hit.object as THREE.Mesh) : null;
    this.hover(ring);
    return !!ring;
  }

  private hover(ring: THREE.Mesh | null): void {
    if (this.hoveredRing === ring) return;
    if (this.hoveredRing && this.hoveredRing !== this.draggedRing) this.setHi(this.hoveredRing, false);
    this.hoveredRing = ring;
    if (ring && ring !== this.draggedRing) this.setHi(ring, true);
  }

  private setHi(ring: THREE.Mesh, on: boolean): void {
    (ring.material as THREE.MeshBasicMaterial).color.copy(on ? ring.userData.hiColor : ring.userData.baseColor);
  }

  // IMPLEMENT ME — return the rings' orientation for the given space ('local' | 'world').
  getGizmoOrientation(object: THREE.Object3D, space: GizmoSpace): THREE.Quaternion {
    if (space === 'world') return new THREE.Quaternion();
    object.updateWorldMatrix(true, false);
    return object.getWorldQuaternion(new THREE.Quaternion());
  }

  // IMPLEMENT ME — rotate `object` by `angle` radians about world axis `worldAxis`,
  // pivoting around world point `pivot`.
  applyAxisRotation(object: THREE.Object3D, angle: number, worldAxis: THREE.Vector3, pivot: THREE.Vector3): void {
    if (
      !Number.isFinite(angle) ||
      !Number.isFinite(worldAxis.x) ||
      !Number.isFinite(worldAxis.y) ||
      !Number.isFinite(worldAxis.z) ||
      !Number.isFinite(pivot.x) ||
      !Number.isFinite(pivot.y) ||
      !Number.isFinite(pivot.z) ||
      worldAxis.lengthSq() === 0
    ) {
      return;
    }

    object.updateWorldMatrix(true, false);

    const axis = worldAxis.clone().normalize();
    const toOrigin = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    const rotate = new THREE.Matrix4().makeRotationAxis(axis, angle);
    const fromOrigin = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z);
    const nextWorld = new THREE.Matrix4()
      .multiplyMatrices(fromOrigin, rotate)
      .multiply(toOrigin)
      .multiply(object.matrixWorld);

    const parentInverse = new THREE.Matrix4();
    if (object.parent) {
      object.parent.updateWorldMatrix(true, false);
      if (Math.abs(object.parent.matrixWorld.determinant()) < Number.EPSILON) return;
      parentInverse.copy(object.parent.matrixWorld).invert();
    }

    const nextLocal = new THREE.Matrix4().multiplyMatrices(parentInverse, nextWorld);
    nextLocal.decompose(object.position, object.quaternion, object.scale);
    object.updateMatrix();
  }

  // ──── provided scaffolding (only the two hooks are needed for 2a; all of this is yours to change for 2b) ────

  private pointerRay(clientX: number, clientY: number): THREE.Raycaster {
    const rect = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.ray.setFromCamera(ndc, this.camera as THREE.PerspectiveCamera);
    return this.ray;
  }

  tryStartDrag(clientX: number, clientY: number): boolean {
    if (!this.object || !this.group.visible) return false;
    const ray = this.pointerRay(clientX, clientY);
    const hit = ray.intersectObjects(this.rings, false)[0];
    if (!hit) return false;

    const ring = hit.object as THREE.Mesh;
    const axisIndex = ring.userData.axisIndex as number;
    this.draggedRing = ring;
    this.setHi(ring, true);
    this.worldAxis.copy(AXIS[axisIndex]).applyQuaternion(this.getGizmoOrientation(this.object, this.space)).normalize();
    this.pivot.copy(this.center);
    this.plane.setFromNormalAndCoplanarPoint(this.worldAxis, this.pivot);
    const p = ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    if (!p) return false;
    this.prevVec.copy(p).sub(this.pivot);
    this.dragging = true;
    return true;
  }

  drag(clientX: number, clientY: number): boolean {
    if (!this.dragging || !this.object) return false;
    const ray = this.pointerRay(clientX, clientY);
    const p = ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    if (!p) return false;
    const v = p.sub(this.pivot);
    const cross = new THREE.Vector3().crossVectors(this.prevVec, v);
    const delta = Math.atan2(cross.dot(this.worldAxis), this.prevVec.dot(v));
    this.prevVec.copy(v);

    this.applyAxisRotation(this.object, delta, this.worldAxis, this.pivot);
    this.object.updateMatrixWorld(true);
    this.group.quaternion.copy(this.getGizmoOrientation(this.object, this.space));
    this.updateAxes();
    return true;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  endDrag(): void {
    if (this.draggedRing) {
      this.setHi(this.draggedRing, false);
      this.draggedRing = null;
    }
    this.dragging = false;
    this.update();
  }
}
