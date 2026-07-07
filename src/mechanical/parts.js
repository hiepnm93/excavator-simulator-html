/* parts — shared materials and procedural part builders
   (≈ Excavator_Parts_Lib.slx in Excavator-Simscape). */
import * as THREE from 'three';

export const MAT = {
  yellow: new THREE.MeshStandardMaterial({ color: 0xf2a900, roughness: 0.45 }),
  dark:   new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.75 }),
  steel:  new THREE.MeshStandardMaterial({ color: 0x9aa1ab, roughness: 0.3, metalness: 0.65 }),
  glass:  new THREE.MeshStandardMaterial({ color: 0x24303c, roughness: 0.15, metalness: 0.4 }),
};

export function shadowed(m) { m.castShadow = true; return m; }

export function box(w, h, d, mat, x, y, z) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
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

// place a mesh authored in design-frame coordinates into a pivot group at `pin`
export function atPin(mesh, pin) { mesh.position.set(-pin[0], -pin[1], 0); return mesh; }
