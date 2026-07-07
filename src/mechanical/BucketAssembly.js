/* BucketAssembly — curved shell from pivot C4 over the back to the cutting
   edge D2, side plates with side cutters, mounting ears with pin bosses at
   C4/D1, teeth on adapters, and the soil-load visual. */
import * as THREE from 'three';
import { PIN } from '../ExcavatorParams.js';
import { MAT, box, profile, lateralCyl, shadowed } from './parts.js';

export function buildBucketAssembly(bucketG) {
  const g = new THREE.Group();
  g.position.set(-PIN.C4[0], -PIN.C4[1], 0);
  bucketG.add(g);
  const meshes = [];
  const add = m => { g.add(m); meshes.push(m); return m; };

  // shell: deeper belly and a straight lip to the cutting edge
  add(profile([
    [7.55, 1.08], [8.55, 0.95, 8.92, 0.15], [8.72, -0.55, 8.35, -0.89],
    [8.05, -0.5, 7.78, 0.18], [7.4, 0.72],
  ], 1.22, MAT.steel, 0, true));

  // side plates + protruding side cutters
  for (const side of [1, -1]) {
    add(profile([[7.55, 1.08], [8.8, 0.35], [8.35, -0.89], [7.45, 0.55]], 0.05, MAT.steel, side * 0.63));
    add(profile([[8.15, -0.35], [8.45, -0.75], [8.35, -0.95], [8.0, -0.55]], 0.06, MAT.pin, side * 0.64));
  }

  // mounting ears: twin plates C4 -> D1 with pin bosses
  for (const z of [0.3, -0.3])
    add(profile([[7.45, 0.75], [8.0, 1.5], [8.3, 1.3], [7.75, 0.6]], 0.06, MAT.steel, z));
  add(lateralCyl(0.11, 0.72, MAT.pin, PIN.C4[0], PIN.C4[1]));
  add(lateralCyl(0.09, 0.72, MAT.pin, PIN.D1[0], PIN.D1[1]));

  // teeth on adapter wedges along the cutting edge
  for (const z of [-0.45, -0.15, 0.15, 0.45]) {
    const adapter = box(0.28, 0.14, 0.14, MAT.pin, 8.3, -0.82, z);
    adapter.rotation.z = -0.5;
    add(adapter);
    const tooth = box(0.3, 0.1, 0.1, MAT.steel, 8.52, -0.98, z);
    tooth.rotation.z = -0.55;
    add(tooth);
  }

  // wear strips on the shell back
  for (const z of [-0.3, 0.3])
    add(profile([[8.6, 0.4], [8.85, -0.1], [8.75, -0.45], [8.5, 0.1]], 0.05, MAT.pin, z));

  const soilLoad = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x6b5637 })));
  soilLoad.scale.set(1.05, 0.7, 1.1);
  soilLoad.visible = false;
  soilLoad.position.set(8.0, 0.15, 0);
  g.add(soilLoad);

  return { meshes, soilLoad };
}
