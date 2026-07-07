/* LowerStructure — undercarriage: track frames, rollers, center frame.
   The "Base" subsystem of the Simscape mechanical system. */
import * as THREE from 'three';
import { MAT, box, shadowed } from './parts.js';

export function buildLowerStructure() {
  const group = new THREE.Group();
  const meshes = [];
  for (const side of [1, -1]) {
    const t = new THREE.Group();
    t.position.z = side * 1.25;
    group.add(t);
    const frame = box(3.6, 0.85, 0.72, MAT.dark, 0, -0.48, 0);
    t.add(frame); meshes.push(frame);
    for (const e of [1.8, -1.8]) {
      const wheel = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.72, 20), MAT.dark));
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(e, -0.48, 0);
      t.add(wheel); meshes.push(wheel);
    }
  }
  const center = box(1.6, 0.5, 1.9, MAT.dark, 0, -0.15, 0); // center frame
  group.add(center); meshes.push(center);
  return { group, meshes };
}
