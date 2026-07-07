/* Boom — banana boom through A1 → apex over B1/B2 → tip at B3, built as a
   welded box section: wide inner web plus side plates, flange strips along
   the top/bottom chords, pin bosses at every pin and the stick-cylinder
   mount horn. One link of the Linkage Assembly. */
import * as THREE from 'three';
import { PIN } from '../ExcavatorParams.js';
import { MAT, profile, lateralCyl } from './parts.js';

const BODY = [
  [0.30, 0.30], [2.5, 2.5, 4.3, 2.85], [5.85, 2.95], [5.98, 3.25],
  [5.75, 3.55], [2.4, 4.55, 1.5, 4.15], [0.4, 1.5, -0.32, 0.65], [-0.15, 0.30],
];

export function buildBoom(boomG) {
  const g = new THREE.Group();
  g.position.set(-PIN.A1[0], -PIN.A1[1], 0);   // author children in design coords
  boomG.add(g);
  const meshes = [];
  const add = m => { g.add(m); meshes.push(m); return m; };

  add(profile(BODY, 0.56, MAT.yellow, 0, true));            // inner web
  for (const z of [0.31, -0.31])                            // side plates
    add(profile(BODY, 0.05, MAT.yellow2, z, true));

  // stick-cylinder mount horn on the upper chord
  add(profile([[1.45, 3.3], [1.95, 3.45], [2.1, 4.35], [1.6, 4.25]], 0.8, MAT.yellow));

  // foot gussets to the chassis bracket
  for (const z of [0.34, -0.34])
    add(profile([[-0.3, 0.35], [0.75, 0.55], [0.9, 1.35], [-0.1, 1.0]], 0.07, MAT.yellow2, z));

  // pin bosses: A1 (foot), B1 (boom cyl rod), B2 (stick cyl base), B3 (stick pivot)
  add(lateralCyl(0.15, 0.85, MAT.pin, PIN.A1[0], PIN.A1[1]));
  add(lateralCyl(0.11, 1.25, MAT.pin, PIN.B1[0], PIN.B1[1]));
  add(lateralCyl(0.11, 0.92, MAT.pin, PIN.B2[0], PIN.B2[1]));
  add(lateralCyl(0.13, 0.78, MAT.pin, PIN.B3[0], PIN.B3[1]));

  return { meshes };
}
