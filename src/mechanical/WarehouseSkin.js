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
/* arm.children indices per rigid link (the "316" decals stay hidden) */
const ARM_CLUSTERS = {
  boom: { idx: [12, 6], pins: ['A1', 'B3'] },       // lower + upper boom
  stick: { idx: [8, 13], pins: ['B3', 'C4'] },
  bucket: { idx: [14], pins: ['C4', 'D2'] },
};

/* The model's own cylinders and 4-bar links, articulated between their
   actual mounting lugs (points in the arm's local frame, measured from the
   vertex data). Each split member divides its meshes into a body anchored
   at the base lug and a rod anchored at the rod lug, both re-aimed at each
   frame; 'E1' members chase the simulator's live 4-bar node. */
const ARM_ACTUATORS = [
  { name: 'boomCyl', idx: [10], split: true,
    base: { link: 'swing', p: [237.3, 15.4, 8.0] }, rod: { link: 'boom', p: [198.3, 15.4, 84.4] } },
  { name: 'adjustCyl', idx: [11], split: true,
    base: { link: 'swing', p: [249.4, 15.4, 13.5] }, rod: { link: 'boom', p: [184.3, 15.4, 94.8] } },
  { name: 'stickCyl', idx: [7], split: true,
    base: { link: 'boom', p: [157.1, 15.4, 117.5] }, rod: { link: 'stick', p: [77.8, 15.4, 139.3] } },
  { name: 'bucketCyl', idx: [9], split: true,
    base: { link: 'stick', p: [58.3, 15.4, 121.1] }, rod: { link: 'E1' } },
  { name: 'hLink', idx: [0, 2], stretch: true,
    base: { link: 'stick', p: [27.3, 15.4, 49.6] }, rod: { link: 'E1' } },
  { name: 'bucketLink', idx: [1, 3], stretch: true,
    base: { link: 'bucket', p: [18.6, 15.4, 21.6] }, rod: { link: 'E1' } },
];

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
  const armRaw = armSrc.matrixWorld.clone();   // arm chain in the raw glTF frame

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
  return { base: baseWrap, house: houseWrap, houseInner: house, meshes, armSrc, armRaw };
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
    skin['holder_' + link] = holder;
  }

  articulateActuators(skin, mech, kids, arm.matrixWorld.clone());
}

/* anchor each cylinder/link of the model between its lugs on the rigged
   links, so everything stays connected while the joints move.

   Every skin holder (link holders and the house content holder) carries the
   GLB's static-world coordinates as its LOCAL frame — cluster pieces keep
   their old world matrix as their local matrix. Lug points measured in the
   arm's frame are therefore mapped once to that shared static frame (armW)
   and used directly as holder-local positions. */
function articulateActuators(skin, mech, kids, armW) {
  mech.swing.updateMatrixWorld(true);
  const holderOf = link => link === 'swing' ? skin.houseInner : skin['holder_' + link];
  // each holder's LOCAL frame carries the arm's pose in a different space:
  // link holders hold the scene-world-at-rig matrices (armW), the house
  // content holder holds the raw glTF matrices (skin.armRaw)
  const frameOf = link => link === 'swing' ? skin.armRaw : armW;
  const lugIn = (link, p) => new THREE.Vector3(...p).applyMatrix4(frameOf(link));

  skin.actuators = [];
  skin.actMeshes = {};
  for (const spec of ARM_ACTUATORS) {
    const rodOnE1 = spec.rod.link === 'E1';
    // at the rig pose the model's own node end stands in for E1
    const rodArmP = rodOnE1
      ? (spec.name === 'bucketLink' ? [1.1, 15.4, 44.1] : [0.6, 15.4, 41.5])
      : spec.rod.p;
    const rodLinkForPivot = rodOnE1 ? spec.base.link : spec.rod.link;

    const baseParent = holderOf(spec.base.link);
    const basePin = lugIn(spec.base.link, spec.base.p);       // in base holder frame
    const rodPinB = lugIn(spec.base.link, rodArmP);           // rod lug in base frame
    const rodParent = spec.split ? holderOf(rodLinkForPivot) : null;
    const rodPin = rodParent ? lugIn(rodLinkForPivot, rodArmP) : null;
    const basePinR = rodParent ? lugIn(rodLinkForPivot, spec.base.p) : null;

    const meshes = [];
    for (const i of spec.idx) {
      const piece = kids[i];
      if (!piece) continue;
      piece.updateMatrixWorld(true);
      piece.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; meshes.push(o); } });
    }
    skin.actMeshes[spec.name] = meshes;

    const makePivot = (parent, pin) => {
      const g = new THREE.Group();
      parent.add(g);
      g.position.copy(pin);
      parent.updateMatrixWorld(true);
      return g;
    };
    const basePivot = makePivot(baseParent, basePin);
    const axisB = rodPinB.clone().sub(basePin);

    // re-parent a mesh under a pivot with its STATIC-frame offset from the
    // pin baked in — so the holder's static→rig mapping applies to it too
    // (plain attach() would preserve the un-rigged world position instead)
    const houseInv = skin.houseInner.matrixWorld.clone().invert();
    const place = (pivot, pin, link, mesh) => {
      mesh.updateMatrixWorld(true);
      const mw = mesh.matrixWorld.clone();
      if (link === 'swing') mw.premultiply(houseInv);   // house frame is raw glTF
      mw.premultiply(new THREE.Matrix4().makeTranslation(-pin.x, -pin.y, -pin.z));
      pivot.add(mesh);
      mw.decompose(mesh.position, mesh.quaternion, mesh.scale);
    };

    let rodPivot = null;
    const bodyMeshes = [], rodMeshes = [];
    if (spec.split) {
      rodPivot = makePivot(rodParent, rodPin);
      for (const o of meshes) {
        // centroid along the cylinder axis, expressed in the base holder frame:
        // meshes still sit at the static pose, so their scene-world position IS
        // the link holders' frame; the house holder frame needs the raw coords
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        if (spec.base.link === 'swing') skin.houseInner.worldToLocal(c);
        const t = c.sub(basePin).dot(axisB) / axisB.lengthSq();
        (t < 0.5 ? bodyMeshes : rodMeshes).push(o);
      }
    } else bodyMeshes.push(...meshes);
    for (const o of bodyMeshes) place(basePivot, basePin, spec.base.link, o);
    for (const o of rodMeshes) place(rodPivot, rodPin, rodLinkForPivot, o);

    const act = {
      spec, basePivot, rodPivot, baseParent, rodParent, rodOnE1,
      len0: axisB.length(),
      d0B: axisB.clone().normalize(),
      rodPinLocal: rodPin,
    };
    if (rodPivot) act.d0R = basePinR.sub(rodPin).normalize();
    skin.actuators.push(act);
    skin.armHolders.push(basePivot);
    if (rodPivot) skin.armHolders.push(rodPivot);
  }
}

/* per-frame: re-aim cylinders/links; q = current solveKinematics pins */
export function updateActuators(skin, mech, q) {
  if (!skin.actuators) return;
  mech.root.updateMatrixWorld(true);
  const e1W = mech.swing.localToWorld(new THREE.Vector3(q.E1[0] - SWING_F, q.E1[1], 0));
  const v = new THREE.Vector3();
  for (const a of skin.actuators) {
    const rodW = a.rodOnE1 ? e1W.clone()
      : a.rodParent.localToWorld(a.rodPinLocal.clone());
    const dB = a.baseParent.worldToLocal(rodW.clone()).sub(a.basePivot.position);
    const len = dB.length();
    a.basePivot.quaternion.setFromUnitVectors(a.d0B, dB.normalize());
    if (a.spec.stretch) a.basePivot.scale.setScalar(len / a.len0);
    if (a.rodPivot) {
      if (a.rodOnE1) a.rodPivot.position.copy(a.rodParent.worldToLocal(rodW.clone()));
      const baseW = a.baseParent.localToWorld(v.copy(a.basePivot.position));
      const dR = a.rodParent.worldToLocal(baseW).sub(a.rodPivot.position).normalize();
      a.rodPivot.quaternion.setFromUnitVectors(a.d0R, dR);
    }
  }
}
