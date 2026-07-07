/* LowerStructure — undercarriage: track frames, sprocket/idler, rollers and
   a full track-shoe loop per side, plus the carbody with X-frame legs.
   The "Base" subsystem of the Simscape mechanical system. */
import * as THREE from 'three';
import { MAT, box, lateralCyl, shadowed } from './parts.js';

// loop bottom (wheel y − loop r − shoe) sits on grade: H0 above model origin
const WHEEL_X = 1.8, WHEEL_Y = -0.35, LOOP_R = 0.5, SHOE_W = 0.8;

/* place shoes along the track loop: two straights + two half-circle arcs */
function buildTrackBand(track) {
  const straight = 2 * WHEEL_X, arc = Math.PI * LOOP_R;
  const total = 2 * straight + 2 * arc;
  const n = 42, step = total / n;
  const shoeGeo = new THREE.BoxGeometry(step * 0.92, 0.055, SHOE_W);
  const grouserGeo = new THREE.BoxGeometry(0.05, 0.05, SHOE_W);
  for (let i = 0; i < n; i++) {
    let s = i * step, x, y, ang;
    if (s < straight) {                       // bottom, travelling +x
      x = -WHEEL_X + s; y = WHEEL_Y - LOOP_R; ang = 0;
    } else if ((s -= straight) < arc) {       // front arc, bottom -> top
      const th = -Math.PI / 2 + s / LOOP_R;
      x = WHEEL_X + LOOP_R * Math.cos(th); y = WHEEL_Y + LOOP_R * Math.sin(th);
      ang = th + Math.PI / 2;
    } else if ((s -= arc) < straight) {       // top, travelling -x
      x = WHEEL_X - s; y = WHEEL_Y + LOOP_R; ang = Math.PI;
    } else {                                  // rear arc, top -> bottom
      const th = Math.PI / 2 + (s - straight) / LOOP_R;
      x = -WHEEL_X + LOOP_R * Math.cos(th); y = WHEEL_Y + LOOP_R * Math.sin(th);
      ang = th + Math.PI / 2;
    }
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    g.rotation.z = ang;
    const plate = shadowed(new THREE.Mesh(shoeGeo, MAT.track));
    const grouser = shadowed(new THREE.Mesh(grouserGeo, MAT.track));
    grouser.position.y = -0.05;               // outward side of the loop
    g.add(plate, grouser);
    track.add(g);
  }
}

export function buildLowerStructure() {
  const group = new THREE.Group();
  const meshes = [];
  const add = (parent, m) => { parent.add(m); meshes.push(m); return m; };

  for (const side of [1, -1]) {
    const t = new THREE.Group();
    t.position.z = side * 1.3;
    group.add(t);
    // track frame
    add(t, box(3.1, 0.34, 0.5, MAT.dark, 0, WHEEL_Y + 0.28, 0));
    add(t, box(2.2, 0.2, 0.55, MAT.dark, 0, WHEEL_Y + 0.55, 0));
    // sprocket (rear) + idler (front) with hubs
    for (const e of [1, -1]) {
      add(t, lateralCyl(0.42, 0.46, MAT.dark, e * WHEEL_X, WHEEL_Y, 0, 22));
      add(t, lateralCyl(0.18, 0.5, MAT.pin, e * WHEEL_X, WHEEL_Y, 0, 14));
    }
    // bottom rollers + carrier rollers
    for (const x of [-1.15, -0.6, 0, 0.6, 1.15])
      add(t, lateralCyl(0.15, 0.5, MAT.pin, x, WHEEL_Y - 0.32, 0, 12));
    for (const x of [-0.7, 0.7])
      add(t, lateralCyl(0.1, 0.4, MAT.pin, x, WHEEL_Y + 0.36, 0, 12));
    buildTrackBand(t);
  }

  // carbody + X-frame legs to the track frames
  add(group, box(1.7, 0.55, 1.5, MAT.dark, 0, -0.12, 0));
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const leg = box(0.9, 0.3, 1.0, MAT.dark, sx * 0.75, -0.28, sz * 0.75);
    leg.rotation.y = sx * sz * 0.35;
    add(group, leg);
  }
  // slew ring
  add(group, lateralCyl(0.85, 0.18, MAT.pin, 0, 0.2, 0, 28)).rotation.x = 0;

  return { group, meshes };
}
