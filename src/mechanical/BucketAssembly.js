/* BucketAssembly — bucket shell from pivot C4 over the back to cutting edge
   D2, side plates, teeth, and the soil-load visual. The bucket link of the
   Linkage Assembly (the H-link/bucket-link rods live in MechanicalSystem
   because they are re-aimed each frame from the 4-bar solution). */
import * as THREE from 'three';
import { PIN } from '../ExcavatorParams.js';
import { MAT, box, profile, atPin, shadowed } from './parts.js';

export function buildBucketAssembly(bucketG) {
  const meshes = [];
  const add = m => { bucketG.add(m); meshes.push(m); return m; };
  add(atPin(profile([ // shell
    [7.60, 1.05], [8.75, 0.7, 8.72, -0.15], [8.35, -0.89], [8.05, -0.5, 7.75, 0.25], [7.42, 0.75],
  ], 1.25, MAT.steel, 0, true), PIN.C4));
  for (const side of [1, -1]) // side plates
    add(atPin(profile([[7.6, 1.05], [8.72, 0.4], [8.35, -0.89], [7.5, 0.6]], 0.04, MAT.steel, side * 0.645), PIN.C4));
  for (const z of [-0.42, 0, 0.42]) { // teeth
    const tooth = box(0.34, 0.09, 0.12, MAT.steel, 8.42 - PIN.C4[0], -0.95 - PIN.C4[1], z);
    tooth.rotation.z = -0.55;
    add(tooth);
  }
  const soilLoad = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x6b5637 })));
  soilLoad.scale.set(1.05, 0.7, 1.1);
  soilLoad.visible = false;
  soilLoad.position.set(8.0 - PIN.C4[0], 0.15 - PIN.C4[1], 0);
  bucketG.add(soilLoad);
  return { meshes, soilLoad };
}
