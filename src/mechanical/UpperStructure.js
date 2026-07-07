/* UpperStructure — swing platform: deck, counterweight, engine housing,
   cab, boom foot bracket. The "House/Swing" subsystem of the Simscape model.
   Geometry authored in design-frame forward coordinates via S(). */
import * as THREE from 'three';
import { SWING_F } from '../ExcavatorParams.js';
import { MAT, box, shadowed } from './parts.js';

export const S = f => f - SWING_F; // design-frame forward -> swing-local

export function buildUpperStructure(swing) {
  const meshes = [];
  const add = m => { swing.add(m); meshes.push(m); return m; };
  add(box(4.6, 0.42, 2.5, MAT.yellow, S(-1.55), 0.32, 0));   // deck
  add(box(1.45, 1.25, 2.4, MAT.dark, S(-3.35), 1.15, 0));    // counterweight
  add(box(2.1, 1.0, 1.15, MAT.yellow, S(-2.0), 1.05, -0.6)); // engine housing
  add(box(1.7, 1.5, 1.05, MAT.yellow, S(-1.1), 1.3, 0.72));  // cab
  add(box(1.5, 0.75, 0.95, MAT.glass, S(-1.05), 1.62, 0.72));// windows
  add(box(0.9, 0.9, 0.5, MAT.yellow, S(0.05), 0.75, 0));     // boom foot bracket
  // swing motor housing on the deck (visual marker for the hydraulic swing drive)
  const motor = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 16), MAT.dark));
  motor.position.set(S(-0.55), 0.75, -0.55);
  swing.add(motor);
  return { meshes, swingMotorMesh: motor };
}
