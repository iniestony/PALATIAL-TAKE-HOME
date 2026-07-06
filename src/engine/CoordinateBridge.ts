// ============================================================================
//  EDITABLE.
// ============================================================================
import * as THREE from 'three';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type Up = 'x' | 'y' | 'z' | '-x' | '-y' | '-z';
export type Handed = 'left' | 'right';
export type EulerOrder = THREE.EulerOrder;
export const DEFAULT_EULER_ORDER: EulerOrder = 'ZYX';
export interface Convention {
  up: Up;
  handed: Handed;
}

export interface BackendNode {
  name: string;
  position: [number, number, number];
  rotationDeg: [number, number, number];
  children?: BackendNode[];
  shape?: 'box' | 'sphere' | 'cone';
  size?: number[];
  color?: number;
}

const UP_VEC: Record<Up, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
  '-x': new THREE.Vector3(-1, 0, 0),
  '-y': new THREE.Vector3(0, -1, 0),
  '-z': new THREE.Vector3(0, 0, -1),
};

function basis(conv: Convention): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), UP_VEC[conv.up])
  );
  if (conv.handed === 'left') m.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  return m;
}

function nodeLocalMatrix(node: BackendNode, order: EulerOrder): THREE.Matrix4 {
  const position = new THREE.Vector3(node.position[0], node.position[1], node.position[2]);
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(node.rotationDeg[0] * DEG, node.rotationDeg[1] * DEG, node.rotationDeg[2] * DEG, order)
  );
  return new THREE.Matrix4().compose(position, rotation, new THREE.Vector3(1, 1, 1));
}

function applyAssemblyNode(obj: THREE.Object3D, node: BackendNode, conv: Convention, order: EulerOrder, isRoot: boolean): void {
  const local = nodeLocalMatrix(node, order);
  const matrix = isRoot ? new THREE.Matrix4().multiplyMatrices(basis(conv), local) : local;
  matrix.decompose(obj.position, obj.quaternion, obj.scale);
  obj.updateMatrix();

  const kids = node.children ?? [];
  for (let i = 0; i < kids.length; i++) applyAssemblyNode(obj.children[i], kids[i], conv, order, false);
}

export function applyAssembly(obj: THREE.Object3D, node: BackendNode, conv: Convention, order: EulerOrder = DEFAULT_EULER_ORDER): void {
  applyAssemblyNode(obj, node, conv, order, true);
}

function readAssemblyNode(obj: THREE.Object3D, node: BackendNode, conv: Convention, order: EulerOrder, isRoot: boolean): BackendNode {
  obj.updateMatrix();

  const matrix = new THREE.Matrix4();
  if (isRoot) {
    obj.updateWorldMatrix(true, false);
    matrix.multiplyMatrices(basis(conv).invert(), obj.matrixWorld);
  } else {
    matrix.copy(obj.matrix);
  }

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(pos, quat, scale);
  const e = new THREE.Euler().setFromQuaternion(quat, order);
  const kids = node.children ?? [];
  return {
    ...node,
    position: [pos.x, pos.y, pos.z],
    rotationDeg: [e.x * RAD, e.y * RAD, e.z * RAD],
    children: kids.map((c, i) => readAssemblyNode(obj.children[i], c, conv, order, false)),
  };
}

export function readAssembly(obj: THREE.Object3D, node: BackendNode, conv: Convention, order: EulerOrder = DEFAULT_EULER_ORDER): BackendNode {
  return readAssemblyNode(obj, node, conv, order, true);
}
