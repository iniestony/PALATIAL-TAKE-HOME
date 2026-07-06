// ============================================================================
//  DO NOT MODIFY.
// ============================================================================
import * as THREE from 'three';

const MODULES = 10;
const SUBS = 10;
const PARTS = 25;
const MESH_EVERY = 10;
const SPHERE_SEG = 120;
const TEX_SIZE = 512;
const SPREAD = 0.12;

function makeTexture(): THREE.DataTexture {
  const data = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
  data.fill(255);
  const tex = new THREE.DataTexture(data, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function buildScene(name: 'A' | 'B'): THREE.Group {
  const root = new THREE.Group();
  root.name = name === 'A' ? 'RobotA' : 'RobotB';
  const baseColor = name === 'A' ? 0x66c9b8 : 0xcf7070;

  let globalPart = 0;
  let meshCount = 0;

  const geo = new THREE.SphereGeometry(0.3, SPHERE_SEG, SPHERE_SEG);
  geo.translate(0, 0.6, 0);

  for (let m = 0; m < MODULES; m++) {
    const module = new THREE.Group();
    module.name = `Module_${m}`;
    module.position.set(m * SPREAD - MODULES * SPREAD * 0.5, 0, 0);
    module.rotation.set(0, 0, m * 0.3);
    module.scale.set(1 + (m % 2) * 0.5, 1 - (m % 2) * 0.35, 1 + (m % 3) * 0.15);
    root.add(module);

    for (let s = 0; s < SUBS; s++) {
      const sub = new THREE.Group();
      sub.name = `Sub_${m}_${s}`;
      sub.position.set(0, 0.1, s * SPREAD - SUBS * SPREAD * 0.5);
      sub.rotation.set(s * 0.2, 0, 0);
      module.add(sub);

      for (let p = 0; p < PARTS; p++, globalPart++) {
        const part = new THREE.Group();
        part.name = `Part_${m}_${s}_${p}`;
        part.position.set(0, p * SPREAD * 0.25 + 0.2, 0);
        sub.add(part);

        if (globalPart % MESH_EVERY === 0) {
          const mat = new THREE.MeshStandardMaterial({ color: baseColor, map: makeTexture() });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.name = `Mesh_${meshCount}`;
          part.add(mesh);
          meshCount++;
        }
      }
    }
  }

  return root;
}
