// ============================================================================
//  EDITABLE.
// ============================================================================
import * as THREE from 'three';
import type { EventManager } from './EventManager';
import { RotationGizmo, type GizmoSpace } from './RotationGizmo';

const HOVER_RAYCAST_INTERVAL_MS = 150;

export class SelectionManager {
  selectedObject: THREE.Object3D | null = null;
  orbit: { enabled: boolean } | null = null;
  private box: THREE.LineSegments;
  private gizmo: RotationGizmo;
  private hovered: THREE.Object3D | null = null;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private lastHoverRaycastAt = 0;
  private pendingHoverPoint: { clientX: number; clientY: number } | null = null;
  private hoverRaycastTimer: number | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private dom: HTMLElement,
    public events: EventManager
  ) {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const mat = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false });
    this.box = new THREE.LineSegments(geo, mat);
    this.box.visible = false;
    this.box.renderOrder = 999;
    this.scene.add(this.box);

    this.gizmo = new RotationGizmo(scene, camera, dom);

    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  select(object: THREE.Object3D | null): void {
    this.selectedObject = object;
    this.box.visible = !!object;
    this.gizmo.attach(object);
    if (object) this.fitBox();
    this.events.dispatch('selection_changed', object);
  }

  private fitBox(): void {
    const obj = this.selectedObject;
    if (!obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    if (box.isEmpty()) {
      obj.getWorldPosition(center);
      size.setScalar(0.3);
    } else {
      box.getSize(size);
      box.getCenter(center);
    }
    this.box.position.copy(center);
    this.box.scale.set(Math.max(size.x, 0.05), Math.max(size.y, 0.05), Math.max(size.z, 0.05));
  }

  setGizmoSpace(space: GizmoSpace): void {
    this.gizmo.setSpace(space);
  }

  tick(): void {
    this.gizmo.tick();
    if (this.selectedObject) this.fitBox();
  }

  private raycast(clientX: number, clientY: number): THREE.Object3D | null {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.ray.setFromCamera(this.ndc, this.camera as THREE.PerspectiveCamera);
    const hits = this.ray.intersectObjects(this.scene.children, true);
    const hit = hits.find((h) => (h.object as THREE.Mesh).isMesh && !h.object.userData.gizmo);
    return hit ? hit.object : null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.clearScheduledHoverRaycast();
    if (this.gizmo.tryStartDrag(e.clientX, e.clientY)) {
      if (this.orbit) this.orbit.enabled = false;
      return;
    }
    this.select(this.raycast(e.clientX, e.clientY));
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.gizmo.isDragging) {
      this.clearScheduledHoverRaycast();
      if (this.gizmo.drag(e.clientX, e.clientY) && this.selectedObject) {
        this.events.dispatch('object_rotation_changed', this.selectedObject);
      }
      return;
    }
    if (this.gizmo.setRingHover(e.clientX, e.clientY)) {
      this.clearScheduledHoverRaycast();
      this.setHover(this.hovered, false);
      this.hovered = null;
      return;
    }
    this.updateHover(e.clientX, e.clientY);
  };

  private updateHover(clientX: number, clientY: number): void {
    const now = performance.now();
    const elapsed = now - this.lastHoverRaycastAt;

    if (elapsed >= HOVER_RAYCAST_INTERVAL_MS) {
      this.applyHoverRaycast(clientX, clientY, now);
      return;
    }

    this.pendingHoverPoint = { clientX, clientY };
    if (this.hoverRaycastTimer !== null) return;

    this.hoverRaycastTimer = window.setTimeout(() => {
      this.hoverRaycastTimer = null;
      const point = this.pendingHoverPoint;
      this.pendingHoverPoint = null;
      if (point) this.applyHoverRaycast(point.clientX, point.clientY, performance.now());
    }, HOVER_RAYCAST_INTERVAL_MS - elapsed);
  }

  private applyHoverRaycast(clientX: number, clientY: number, timestamp: number): void {
    this.lastHoverRaycastAt = timestamp;
    const hit = this.raycast(clientX, clientY);
    if (hit === this.hovered) return;
    this.setHover(this.hovered, false);
    this.setHover(hit, true);
    this.hovered = hit;
  }

  private clearScheduledHoverRaycast(): void {
    this.pendingHoverPoint = null;
    if (this.hoverRaycastTimer === null) return;
    window.clearTimeout(this.hoverRaycastTimer);
    this.hoverRaycastTimer = null;
  }

  private setHover(obj: THREE.Object3D | null, on: boolean): void {
    const mat = obj && ((obj as THREE.Mesh).material as THREE.MeshStandardMaterial);
    if (mat && mat.emissive) mat.emissive.setHex(on ? 0x335533 : 0x000000);
  }

  private onPointerUp = () => {
    this.gizmo.endDrag();
    if (this.orbit) this.orbit.enabled = true;
    if (this.selectedObject) this.fitBox();
  };
}
