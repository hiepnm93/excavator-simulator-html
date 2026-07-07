/* WarehouseSkin — optional high-detail body skin from the 3D Warehouse
   model "Excavator" by Max M.
   (https://3dwarehouse.sketchup.com/model/c166a27e-f710-41ec-b43c-c9d4f016de52/Excavator,
   3D Warehouse General Model License — used as part of this creation).

   The GLB has no named part hierarchy, so subassemblies are classified by
   geometry: the two mesh-rich children of the top assembly are the
   undercarriage (most meshes) and the upper works; inside the upper works
   the arm assembly is the child with the longest span (hidden here — the
   simulator keeps its own articulated, pin-accurate arm), the cab is the
   smallest, the rest is the house. Base and house are re-based into holder
   groups sharing one normalization transform (z-up fix, yaw, uniform scale,
   base centered on the swing axis with its shoes on grade), so the house
   can rotate with the simulator's swing joint. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { H0, SWING_F, PIN } from '../ExcavatorParams.js';

const TRACK_LEN = 5.1;   // m — target undercarriage length to fit the pin table

/* The model's arm is a Liebherr-style two-piece boom in one fixed pose. Its
   pivot pins, measured from the GLB's vertex data in the arm assembly's
   local frame (model units): boom foot, boom→stick, stick→bucket, cutting
   edge. The adjust cylinder is frozen, so lower+upper boom rig as one link. */
const ARM_PINS = {
  A1: new THREE.Vector3(254.2, 15.4, 23.7),
  B3: new THREE.Vector3(75.5, 15.4, 121.0),
  C4: new THREE.Vector3(15.7, 15.3, 36.0),
  D2: new THREE.Vector3(41.6, 15.2, 1.7),
};
/* arm.children indices per link; the rest (boom/stick/bucket cylinders,
   4-bar links, "316" decals) stay hidden — the simulator's aimed cylinders
   and linkage take their place */
const ARM_CLUSTERS = {
  boom: { idx: [12, 6, 11], pins: ['A1', 'B3'] },   // lower boom, upper boom, adjust cyl
  stick: { idx: [8, 13], pins: ['B3', 'C4'] },
  bucket: { idx: [14], pins: ['C4', 'D2'] },
};

const meshCount = o => { let n = 0; o.traverse(k => { if (k.isMesh) n++; }); return n; };
const span = o => {
  const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z);
};
const boxOf = o => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };

export async function loadWarehouseSkin(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  // top assembly = first node with two or more mesh-bearing children
  let asm = null;
  scene.traverse(o => {
    if (!asm && o.children.filter(k => meshCount(k) > 0).length >= 2) asm = o;
  });
  const tops = asm.children.filter(k => meshCount(k) > 0)
    .sort((a, b) => meshCount(b) - meshCount(a));
  const baseSrc = tops[0];                     // undercarriage (~620 meshes)
  const upperSrc = tops[1];                    // house + cab + arm (~121)
  const ukids = upperSrc.children.filter(k => meshCount(k) > 0)
    .sort((a, b) => span(b) - span(a));
  const armSrc = ukids[0];
  armSrc.visible = false;                      // static arm: replaced by the simulator's

  // holders bake world transforms, then share one normalization transform
  const base = new THREE.Group(), house = new THREE.Group();
  base.attach(baseSrc);
  house.attach(upperSrc);
  const setBoth = fn => { fn(base); fn(house); };

  const applyYaw = (yaw, upFix) => setBoth(h => {
    h.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    if (upFix) h.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), upFix));
  });

  // 1) up-axis: rotate to y-up if the content's height is along z
  let size = boxOf(base).getSize(new THREE.Vector3());
  const upFix = (size.z < size.y && size.z < size.x) ? -Math.PI / 2 : 0;

  // 2) yaw: undo the model's plan rotation — pick the angle that minimizes
  //    the undercarriage's plan-view footprint (tracks axis-aligned)
  let best = 0, bestArea = Infinity;
  for (let yaw = -Math.PI / 2; yaw < Math.PI / 2; yaw += Math.PI / 90) {
    applyYaw(yaw, upFix);
    const sz = boxOf(base).getSize(new THREE.Vector3());
    if (sz.x * sz.z < bestArea) { bestArea = sz.x * sz.z; best = yaw; }
  }
  applyYaw(best, upFix);

  // 3) forward: tracks run along x, and the (hidden) arm extends toward +x
  size = boxOf(base).getSize(new THREE.Vector3());
  if (size.z > size.x) { best += Math.PI / 2; applyYaw(best, upFix); }
  house.updateMatrixWorld(true);
  const armC = new THREE.Box3().setFromObject(armSrc).getCenter(new THREE.Vector3());
  if (armC.x < boxOf(base).getCenter(new THREE.Vector3()).x) {
    best += Math.PI;
    applyYaw(best, upFix);
  }

  // 4) uniform scale: undercarriage length -> TRACK_LEN
  size = boxOf(base).getSize(new THREE.Vector3());
  const s = TRACK_LEN / Math.max(size.x, size.z);
  setBoth(h => h.scale.setScalar(s));

  // 5) center the undercarriage on the swing axis, shoes on grade
  const bb = boxOf(base);
  const c = bb.getCenter(new THREE.Vector3());
  const off = new THREE.Vector3(-c.x, -H0 - bb.min.y, -c.z);
  setBoth(h => h.position.copy(off));

  // brand text: hide the counterweight lettering (two stacked letter meshes,
  // white Color_001 + black Color_009 — low vertex count but spanning the
  // whole counterweight width). The "316" decals stay inside the hidden arm.
  house.updateMatrixWorld(true);
  house.traverse(o => {
    if (!o.isMesh) return;
    const name = o.material?.name;
    if (name !== 'Color_001' && name !== 'Color_009') return;
    if (o.geometry.attributes.position.count > 500) return;
    const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    if (Math.max(sz.x, sz.y, sz.z) > 2.5) o.visible = false;
  });

  const meshes = { base: [], house: [] };
  base.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; meshes.base.push(o); } });
  house.traverse(o => { if (o.isMesh && o.visible !== false) { o.castShadow = o.receiveShadow = true; meshes.house.push(o); } });

  // wrap so each skin part is a single child of its simulator parent group
  const baseWrap = new THREE.Group(), houseWrap = new THREE.Group();
  baseWrap.add(base);
  houseWrap.add(house);
  return { base: baseWrap, house: houseWrap, meshes, armSrc };
}

/* Re-parent the model's arm clusters onto the simulator's pivot groups so
   the SketchUp boom/stick/bucket follow the simulated joints. Must be
   called after skin.house has been added to mech.swing and rendered pose
   matrices are current; q = solveKinematics pins for the CURRENT joint
   state (swing-frame design coordinates). */
export function rigArm(skin, mech, q) {
  const arm = skin.armSrc;
  arm.updateMatrixWorld(true);
  mech.swing.updateMatrixWorld(true);
  const swingInv = mech.swing.matrixWorld.clone().invert();

  // model pins -> swing-local frame (through the hidden arm's world chain)
  const pinSwing = name => ARM_PINS[name].clone()
    .applyMatrix4(arm.matrixWorld).applyMatrix4(swingInv);
  // target pins in swing-local frame from the live kinematics
  const target = name => new THREE.Vector3(q[name][0] - SWING_F, q[name][1], 0);

  const kids = [...arm.children];  // snapshot: re-parenting shifts indices
  skin.armMeshes = {};
  skin.armHolders = [];
  for (const [link, spec] of Object.entries(ARM_CLUSTERS)) {
    const m0 = pinSwing(spec.pins[0]), m1 = pinSwing(spec.pins[1]);
    const t0 = target(spec.pins[0]), t1 = target(spec.pins[1]);
    const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
    const dth = ang(t0, t1) - ang(m0, m1);
    const k = Math.hypot(t1.x - t0.x, t1.y - t0.y) / Math.hypot(m1.x - m0.x, m1.y - m0.y);
    // swing-frame alignment: model pin0 -> target pin0, model axis -> target axis
    const M = new THREE.Matrix4().makeTranslation(t0.x, t0.y, 0)
      .multiply(new THREE.Matrix4().makeRotationZ(dth))
      .multiply(new THREE.Matrix4().makeScale(k, k, k))
      .multiply(new THREE.Matrix4().makeTranslation(-m0.x, -m0.y, -m0.z));

    const parent = mech[link === 'boom' ? 'boomG' : link === 'stick' ? 'stickG' : 'bucketG'];
    parent.updateMatrixWorld(true);
    const holder = new THREE.Group();
    parent.add(holder);
    const Mp = parent.matrixWorld.clone().invert()
      .multiply(mech.swing.matrixWorld).multiply(M).multiply(swingInv);
    Mp.decompose(holder.position, holder.quaternion, holder.scale);

    skin.armMeshes[link] = [];
    for (const i of spec.idx) {
      const piece = kids[i];
      if (!piece) continue;
      piece.updateMatrixWorld(true);
      const mw = piece.matrixWorld.clone();
      holder.add(piece);                       // now under holder…
      mw.decompose(piece.position, piece.quaternion, piece.scale); // …keeping old world as local
      piece.traverse(o => {
        if (o.isMesh) { o.castShadow = o.receiveShadow = true; skin.armMeshes[link].push(o); }
      });
    }
    skin.armHolders.push(holder);
  }
}
