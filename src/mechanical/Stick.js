/* Stick (arm) — horn at the stick-cylinder rod pin C1, beam down to the
   bucket pivot C4. One link of the Linkage Assembly. */
import { PIN } from '../ExcavatorParams.js';
import { MAT, profile, atPin } from './parts.js';

export function buildStick(stickG) {
  const mesh = atPin(profile([
    [5.42, 4.25], [5.9, 4.4], [6.5, 3.35], [7.78, 1.05], [7.5, 0.7], [6.35, 2.5], [5.5, 3.5],
  ], 0.48, MAT.yellow), PIN.B3);
  stickG.add(mesh);
  return { meshes: [mesh] };
}
