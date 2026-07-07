/* MechanicalSystem — assembles the smaller components into the excavator
   multibody, exactly as the Simscape model's "Mechanical System" subsystem
   assembles Base, House/Swing and the Linkage Assembly:

     MechanicalSystem
     ├─ LowerStructure  (tracks / base)
     ├─ UpperStructure  (swing platform, cab, counterweight)
     └─ Linkage Assembly
        ├─ Boom
        ├─ Stick
        └─ BucketAssembly (+ H-link / bucket-link 4-bar)

   plus the cylinder/link rod visuals, re-aimed each frame from the
   LinkageKinematics solution. */
import * as THREE from 'three';
import { PIN, H0, SWING_F } from '../ExcavatorParams.js';
import { solveKinematics } from './LinkageKinematics.js';
import { MAT, shadowed } from './parts.js';
import { buildLowerStructure } from './LowerStructure.js';
import { buildUpperStructure, S } from './UpperStructure.js';
import { buildBoom } from './Boom.js';
import { buildStick } from './Stick.js';
import { buildBucketAssembly } from './BucketAssembly.js';

const rad = d => d * Math.PI / 180;

function pivotGroup(parent, pin, parentPin) {
  const g = new THREE.Group();
  g.position.set(pin[0] - parentPin[0], pin[1] - parentPin[1], 0);
  parent.add(g);
  return g;
}

// a cylinder-body + rod pair (twin = duplicated across the lateral axis)
function rodAssembly(parent, r1, r2, twin) {
  const g = new THREE.Group();
  parent.add(g);
  const mk = (r, m) => {
    const c = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), m));
    g.add(c);
    return c;
  };
  const parts = { body: mk(r1, MAT.dark), rod: mk(r2, MAT.steel), g };
  if (twin) { parts.body2 = mk(r1, MAT.dark); parts.rod2 = mk(r2, MAT.steel); }
  parts.meshes = [parts.body, parts.rod, parts.body2, parts.rod2].filter(Boolean);
  return parts;
}

function aim(parts, a, b, lat) {
  const set = (mesh, p0, p1, z) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);
    mesh.position.set(S((p0[0] + p1[0]) / 2), (p0[1] + p1[1]) / 2, z);
    mesh.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    mesh.scale.y = L;
  };
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const cylEnd = [a[0] + (b[0] - a[0]) * 0.62, a[1] + (b[1] - a[1]) * 0.62];
  set(parts.body, a, cylEnd, lat);
  set(parts.rod, mid, b, lat);
  if (parts.body2) { set(parts.body2, a, cylEnd, -lat); set(parts.rod2, mid, b, -lat); }
}

export class MechanicalSystem {
  constructor(scene) {
    this.root = new THREE.Group();
    this.root.position.y = H0;
    scene.add(this.root);

    // Base (lower structure) — under the swing axis
    const lower = buildLowerStructure();
    lower.group.position.set(SWING_F, 0, 0);
    this.root.add(lower.group);

    // House (upper structure) — rotates about the vertical axis at SWING_F
    this.swing = new THREE.Group();
    this.swing.position.set(SWING_F, 0, 0);
    this.root.add(this.swing);
    const upper = buildUpperStructure(this.swing);

    // Linkage assembly: pivot groups at the design pins
    const swingPin = [SWING_F, 0];
    this.boomG = pivotGroup(this.swing, PIN.A1, swingPin);
    this.stickG = pivotGroup(this.boomG, PIN.B3, PIN.A1);
    this.bucketG = pivotGroup(this.stickG, PIN.C4, PIN.B3);
    const boom = buildBoom(this.boomG);
    const stick = buildStick(this.stickG);
    const bucket = buildBucketAssembly(this.bucketG);
    this.soilLoad = bucket.soilLoad;

    // hydraulic actuator + link rod visuals (swing-local, re-aimed per frame)
    this.boomCyl = rodAssembly(this.swing, 0.11, 0.055, true);   // twin boom cylinders
    this.stickCyl = rodAssembly(this.swing, 0.115, 0.06, false);
    this.bktCyl = rodAssembly(this.swing, 0.10, 0.05, false);
    this.hLink = rodAssembly(this.swing, 0.05, 0.045, true);     // H-link pair
    this.bLink = rodAssembly(this.swing, 0.055, 0.05, false);    // bucket link

    // component registry for the UI tree (name -> meshes to highlight)
    this.components = {
      lower: lower.meshes,
      upper: upper.meshes,
      boom: boom.meshes,
      stick: stick.meshes,
      bucket: bucket.meshes,
      linkage: [...this.hLink.meshes, ...this.bLink.meshes],
      cylBoom: this.boomCyl.meshes,
      cylStick: this.stickCyl.meshes,
      cylBucket: this.bktCyl.meshes,
      swingMotor: [upper.swingMotorMesh],
    };
  }

  /* pose the multibody from joint state (deg) and return pin positions q */
  applyPose(state) {
    this.swing.rotation.y = rad(state.swing);
    this.boomG.rotation.z = rad(state.boom);
    this.stickG.rotation.z = rad(state.stick);
    this.bucketG.rotation.z = rad(state.bucket);
    const q = solveKinematics(rad(state.boom), rad(state.stick), rad(state.bucket));
    aim(this.boomCyl, PIN.A2, q.B1, 0.55);
    aim(this.stickCyl, q.B2, q.C1, 0);
    aim(this.bktCyl, q.C2, q.E1, 0);
    aim(this.hLink, q.C3, q.E1, 0.28);
    aim(this.bLink, q.D1, q.E1, 0);
    return q;
  }

  /* cutting-edge position in world coordinates */
  tipWorld(q, out) {
    out.set(S(q.D2[0]), q.D2[1], 0);
    this.swing.localToWorld(out);
    return out;
  }
}
