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
import { H0 } from '../ExcavatorParams.js';

const TRACK_LEN = 5.1;   // m — target undercarriage length to fit the pin table

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

  const meshes = { base: [], house: [] };
  base.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; meshes.base.push(o); } });
  house.traverse(o => { if (o.isMesh && o.visible !== false) { o.castShadow = o.receiveShadow = true; meshes.house.push(o); } });

  // wrap so each skin part is a single child of its simulator parent group
  const baseWrap = new THREE.Group(), houseWrap = new THREE.Group();
  baseWrap.add(base);
  houseWrap.add(house);
  return { base: baseWrap, house: houseWrap, meshes };
}
