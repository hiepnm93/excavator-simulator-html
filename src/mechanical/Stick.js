/* Stick (arm) — box section from the cylinder horn at C1 down to the bucket
   pivot C4, with side plates and pin bosses at every pin. */
import * as THREE from 'three';
import { PIN } from '../ExcavatorParams.js';
import { MAT, profile, lateralCyl } from './parts.js';

const BODY = [
  [5.42, 4.25], [5.9, 4.4], [6.5, 3.35], [7.78, 1.05], [7.5, 0.7], [6.35, 2.5], [5.5, 3.5],
];

export function buildStick(stickG) {
  const g = new THREE.Group();
  g.position.set(-PIN.B3[0], -PIN.B3[1], 0);
  stickG.add(g);
  const meshes = [];
  const add = m => { g.add(m); meshes.push(m); return m; };

  add(profile(BODY, 0.42, MAT.yellow));                     // inner web
  for (const z of [0.24, -0.24])                            // side plates
    add(profile(BODY, 0.045, MAT.yellow2, z));

  // H-link bracket plates near C3
  for (const z of [0.2, -0.2])
    add(profile([[7.0, 1.5], [7.4, 1.6], [7.35, 1.0], [7.05, 1.1]], 0.05, MAT.yellow2, z));

  // pin bosses: B3 (boom pivot), C1 (stick cyl rod), C2 (bucket cyl base),
  // C3 (H-link), C4 (bucket pivot)
  add(lateralCyl(0.13, 0.72, MAT.pin, PIN.B3[0], PIN.B3[1]));
  add(lateralCyl(0.1, 0.62, MAT.pin, PIN.C1[0], PIN.C1[1]));
  add(lateralCyl(0.1, 0.56, MAT.pin, PIN.C2[0], PIN.C2[1]));
  add(lateralCyl(0.09, 0.62, MAT.pin, PIN.C3[0], PIN.C3[1]));
  add(lateralCyl(0.11, 0.66, MAT.pin, PIN.C4[0], PIN.C4[1]));

  return { meshes };
}
