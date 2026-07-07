/* UpperStructure — swing platform: deck, curved counterweight, engine hood
   with exhaust, rounded cab with glazing, handrails, boom foot bracket.
   The "House/Chassis" subsystem of the Simscape model. Children are authored
   in design-frame forward coordinates inside a group offset by -SWING_F. */
import * as THREE from 'three';
import { PIN, SWING_F } from '../ExcavatorParams.js';
import { MAT, box, profile, lateralCyl, rail, shadowed } from './parts.js';

export const S = f => f - SWING_F; // design-frame forward -> swing-local

export function buildUpperStructure(swing) {
  const g = new THREE.Group();
  g.position.x = -SWING_F;          // author children at design-frame f
  swing.add(g);
  const meshes = [];
  const add = m => { g.add(m); meshes.push(m); return m; };

  // deck plate with skirt
  add(box(4.7, 0.16, 2.6, MAT.yellow, -1.5, 0.5, 0));
  add(box(4.7, 0.3, 2.45, MAT.yellow2, -1.5, 0.28, 0));

  // counterweight: curved-back extrusion, full width
  add(profile([
    [-2.7, 0.6], [-3.6, 0.62, -3.85, 0.75], [-3.95, 1.1], [-3.9, 1.55, -3.55, 1.68],
    [-2.7, 1.72], [-2.7, 0.6],
  ], 2.5, MAT.yellow, 0, true));

  // engine hood behind the cab, with vents and exhaust
  add(profile([
    [-2.75, 1.7], [-1.35, 1.7], [-1.0, 1.62, -0.95, 1.35], [-0.95, 0.58], [-2.75, 0.58],
  ], 2.35, MAT.yellow, 0, true));
  for (const zx of [-2.4, -2.1, -1.8]) add(box(0.02, 0.5, 0.75, MAT.dark, zx, 1.15, -1.18));
  add(lateralCyl(0.09, 0.5, MAT.dark, -1.35, 1.95, -0.55)).rotation.x = 0;  // exhaust stack
  add(lateralCyl(0.13, 0.22, MAT.dark, -1.35, 2.12, -0.55)).rotation.x = 0;
  add(box(0.8, 0.12, 0.8, MAT.dark, -2.3, 1.78, 0.5));                      // air cleaner

  // cab (left side), rounded roofline with glazing
  const cab = new THREE.Group();
  cab.position.set(-0.35, 0.58, 0.78);
  g.add(cab);
  const addC = m => { cab.add(m); meshes.push(m); return m; };
  addC(profile([
    [-0.95, 0], [0.85, 0], [0.92, 1.05, 0.88, 1.32], [0.62, 1.46], [-0.85, 1.5],
    [-0.95, 1.4], [-0.95, 0],
  ], 1.06, MAT.yellow, 0, true));
  // glazing: front (slanted), side, rear panes slightly proud of the shell
  addC(box(0.05, 0.85, 0.9, MAT.glass, 0.86, 0.85, 0)).rotation.z = -0.06;
  addC(box(1.55, 0.62, 0.05, MAT.glass, 0.0, 0.98, 0.545));
  addC(box(0.05, 0.6, 0.9, MAT.glass, -0.92, 0.95, 0));
  addC(box(0.6, 0.05, 0.95, MAT.dark, 0.45, 1.52, 0));                      // roof hatch

  // handrails along the deck and hood
  meshes.push(...rail(g, [[-3.3, 1.75, -1.15], [-1.4, 1.75, -1.15], [-0.9, 0.6, -1.2]], 0.5));
  meshes.push(...rail(g, [[-3.3, 1.75, 1.15], [-2.75, 1.75, 1.15]], 0.5));

  // boom foot bracket: twin plates + cross bosses at A1 and A2
  for (const z of [0.36, -0.36])
    add(profile([[-0.45, 0.55], [0.55, 0.42], [1.0, 0.42], [0.35, 1.15], [-0.35, 1.1]], 0.09, MAT.yellow, z));
  add(lateralCyl(0.14, 0.95, MAT.pin, PIN.A1[0], PIN.A1[1]));
  add(lateralCyl(0.11, 0.95, MAT.pin, PIN.A2[0], PIN.A2[1]));

  // swing motor housing on the deck
  const motor = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.45, 16), MAT.dark));
  motor.position.set(-0.5, 0.8, -0.5);
  g.add(motor);

  return { meshes, swingMotorMesh: motor };
}
