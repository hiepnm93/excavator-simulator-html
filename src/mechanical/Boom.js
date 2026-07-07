/* Boom — banana-profile boom body through A1, apex above B1/B2, tip at B3,
   plus the stick-cylinder mount horn. One link of the Linkage Assembly. */
import { PIN } from '../ExcavatorParams.js';
import { MAT, profile, atPin } from './parts.js';

export function buildBoom(boomG) {
  const meshes = [];
  const add = m => { boomG.add(m); meshes.push(m); return m; };
  add(atPin(profile([
    [0.30, 0.30], [2.5, 2.5, 4.3, 2.85], [5.85, 2.95], [5.98, 3.25],
    [5.75, 3.55], [2.4, 4.55, 1.5, 4.15], [0.4, 1.5, -0.32, 0.65], [-0.15, 0.30],
  ], 0.62, MAT.yellow, 0, true), PIN.A1));
  add(atPin(profile([ // cylinder mounts
    [1.45, 3.3], [1.95, 3.45], [2.1, 4.35], [1.6, 4.25],
  ], 0.9, MAT.yellow), PIN.A1));
  return { meshes };
}
