/* parts — shared materials and procedural part builders
   (≈ Excavator_Parts_Lib.slx in Excavator-Simscape). */
import * as THREE from 'three';

export const MAT = {
  yellow: new THREE.MeshStandardMaterial({ color: 0xf2a900, roughness: 0.42, metalness: 0.15 }),
  yellow2: new THREE.MeshStandardMaterial({ color: 0xd99400, roughness: 0.5, metalness: 0.1 }),
  dark:   new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.75 }),
  track:  new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.85 }),
  steel:  new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.3, metalness: 0.65 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.15, metalness: 0.9 }),
  glass:  new THREE.MeshStandardMaterial({ color: 0x1b2733, roughness: 0.08, metalness: 0.55 }),
  pin:    new THREE.MeshStandardMaterial({ color: 0x565d66, roughness: 0.35, metalness: 0.7 }),
};

export function shadowed(m) { m.castShadow = true; m.receiveShadow = true; return m; }

export function box(w, h, d, mat, x, y, z) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  m.position.set(x, y, z);
  return m;
}

/* cylinder along the lateral (z) axis — pin bosses, wheels, cross tubes */
export function lateralCyl(r, w, mat, x, y, z = 0, seg = 18) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, seg), mat));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

// extrude a sagittal-plane profile ([f,u] points) to width w, centered laterally at z0
export function profile(pts, w, mat, z0 = 0, curved = false) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (curved && pts[i].length === 4) s.quadraticCurveTo(pts[i][0], pts[i][1], pts[i][2], pts[i][3]);
    else s.lineTo(pts[i][0], pts[i][1]);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.translate(0, 0, z0 - w / 2);
  return shadowed(new THREE.Mesh(g, mat));
}

/* handrail: posts + top tube through [x,y,z] waypoints (r = tube radius) */
export function rail(group, pts, h, r = 0.022, mat = MAT.dark) {
  const seg = (a, b) => {
    const v = new THREE.Vector3().subVectors(b, a);
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 8), mat));
    m.position.copy(a).addScaledVector(v, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    group.add(m);
  };
  const tops = pts.map(p => new THREE.Vector3(p[0], p[1] + h, p[2]));
  pts.forEach((p, i) => seg(new THREE.Vector3(...p), tops[i]));
  for (let i = 0; i + 1 < tops.length; i++) seg(tops[i], tops[i + 1]);
}
