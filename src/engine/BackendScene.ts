// ============================================================================
//  DO NOT MODIFY.
// ============================================================================
import * as THREE from 'three';
import type { BackendNode } from './CoordinateBridge';

const C0 = 0xe2c4a0;
const C1 = 0x4f8bd6;
const C2 = 0x6fa3e0;
const C3 = 0x35507a;

export const BACKEND_ASSEMBLY: BackendNode = {
  name: 'n0',
  shape: 'box',
  size: [0.62, 0.28, 1.0],
  color: C1,
  position: [0, 0, 1.25],
  rotationDeg: [0, 0, 0],
  children: [
    {
      name: 'n1',
      shape: 'sphere',
      size: [0.27],
      color: C0,
      position: [0, 0, 0.72],
      rotationDeg: [0, 0, 0],
      children: [
        { name: 'n2', shape: 'cone', size: [0.11, 0.3], color: 0xd14f4f, position: [0, 0.2, 0.02], rotationDeg: [-15, 0, 8] },
        { name: 'n13', shape: 'sphere', size: [0.045], color: 0x2b2b2b, position: [0.1, 0.2, 0.08], rotationDeg: [20, 90, 15] },
        { name: 'n14', shape: 'sphere', size: [0.045], color: 0x2b2b2b, position: [-0.1, 0.2, 0.08], rotationDeg: [20, -90, -15] },
      ],
    },
    {
      name: 'n3',
      shape: 'box',
      size: [0.13, 0.13, 0.55],
      color: C1,
      position: [0.42, 0, 0.3],
      rotationDeg: [0, 60, 0],
      children: [
        {
          name: 'n4',
          shape: 'box',
          size: [0.11, 0.11, 0.42],
          color: C2,
          position: [0, 0.12, 0.48],
          rotationDeg: [-28, 0, 0],
          children: [{ name: 'n5', shape: 'box', size: [0.12, 0.05, 0.11], color: C0, position: [0, 0, 0.36], rotationDeg: [-35, 0, 45] }],
        },
      ],
    },
    {
      name: 'n6',
      shape: 'box',
      size: [0.13, 0.13, 0.55],
      color: C1,
      position: [-0.42, 0, 0.18],
      rotationDeg: [0, 196, 0],
      children: [
        {
          name: 'n7',
          shape: 'box',
          size: [0.11, 0.11, 0.42],
          color: C2,
          position: [0, 0.12, 0.48],
          rotationDeg: [-18, 0, 0],
          children: [{ name: 'n8', shape: 'box', size: [0.12, 0.05, 0.11], color: C0, position: [0, 0, 0.36], rotationDeg: [-18, 0, -28] }],
        },
      ],
    },
    {
      name: 'n9',
      shape: 'box',
      size: [0.16, 0.16, 0.74],
      color: C3,
      position: [-0.17, 0, -0.88],
      rotationDeg: [0, 0, 0],
      children: [{ name: 'n11', shape: 'box', size: [0.14, 0.09, 0.3], color: C3, position: [0, 0.08, -0.44], rotationDeg: [-90, 0, 16] }],
    },
    {
      name: 'n10',
      shape: 'box',
      size: [0.16, 0.16, 0.74],
      color: C3,
      position: [0.17, 0, -0.88],
      rotationDeg: [0, 0, 0],
      children: [{ name: 'n12', shape: 'box', size: [0.14, 0.09, 0.3], color: C3, position: [0, 0.08, -0.44], rotationDeg: [-90, 0, -16] }],
    },
  ],
};

export function makeNodeMesh(node: BackendNode): THREE.Mesh {
  const geo =
    node.shape === 'sphere'
      ? new THREE.SphereGeometry(node.size?.[0] ?? 0.2, 20, 14)
      : node.shape === 'cone'
        ? new THREE.ConeGeometry(node.size?.[0] ?? 0.1, node.size?.[1] ?? 0.3, 20)
        : new THREE.BoxGeometry(node.size?.[0] ?? 0.3, node.size?.[1] ?? 0.3, node.size?.[2] ?? 0.3);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: node.color ?? 0x888888, side: THREE.DoubleSide, roughness: 0.6 }));
  mesh.name = node.name;
  mesh.userData.assembly = true;
  return mesh;
}

export function buildAssemblySkeleton(node: BackendNode = BACKEND_ASSEMBLY): THREE.Object3D {
  const mesh = makeNodeMesh(node);
  for (const child of node.children ?? []) mesh.add(buildAssemblySkeleton(child));
  return mesh;
}
