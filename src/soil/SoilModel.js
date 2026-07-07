/* SoilModel — heightfield terrain with angle-of-repose relaxation, dig and
   dump against the bucket cutting edge. Follows the soil plugin of
   KennyVilella/excavator_simulator_mujoco / soil_dynamics_cpp; the resulting
   engagement depth feeds back into the HydraulicSystem as a stall load, the
   way DEM cosimulation loads the bucket in the Simscape model. */
import * as THREE from 'three';
import { SOIL } from '../ExcavatorParams.js';

export class SoilModel {
  constructor(scene) {
    const { grid, size } = SOIL;
    this.grid = grid; this.size = size; this.cell = size / grid;
    this.maxDh = this.cell * Math.tan(SOIL.repose);
    this.heights = new Float32Array(grid * grid);
    this.geo = new THREE.PlaneGeometry(size, size, grid - 1, grid - 1);
    this.geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial({ color: 0x8a6f47 }));
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.dirty = false;
    this.bucketFill = 0;      // 0..1 of SOIL.bucketCap
    this.movedTotal = 0;      // m³
    this.engagement = 0;      // m, cutting-edge depth below grade while digging
    this.reset();
  }

  reset() {
    for (let k = 0; k < this.heights.length; k++)
      this.heights[k] = 0.03 * Math.sin(k * 0.7) + 0.03 * Math.sin(k * 0.13);
    this.bucketFill = 0; this.movedTotal = 0; this.engagement = 0;
    this.updateMesh();
  }

  idx(x, z) {
    const i = Math.round((x + this.size / 2) / this.cell);
    const j = Math.round((z + this.size / 2) / this.cell);
    return (i < 0 || i >= this.grid || j < 0 || j >= this.grid) ? -1 : j * this.grid + i;
  }

  relax() { // avalanche cells steeper than the repose angle
    const { grid, heights, maxDh } = this;
    for (let it = 0; it < SOIL.relaxIter; it++) {
      let moved = false;
      for (let j = 1; j < grid - 1; j++) for (let i = 1; i < grid - 1; i++) {
        const k = j * grid + i;
        for (const n of [k - 1, k + 1, k - grid, k + grid]) {
          const dh = heights[k] - heights[n];
          if (dh > maxDh) {
            const q = (dh - maxDh) * 0.25;
            heights[k] -= q; heights[n] += q; moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  updateMesh() {
    const pos = this.geo.attributes.position;
    for (let k = 0; k < this.heights.length; k++) pos.setY(k, this.heights[k]);
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  /* dig/dump around the cutting edge at world position `tip`.
     curling: bucket curled enough to retain soil; returns engagement depth. */
  digStep(tip, curling) {
    const { heights, cell } = this;
    const k0 = this.idx(tip.x, tip.z);
    const ground = k0 < 0 ? 0 : heights[k0];
    this.engagement = 0;

    if (tip.y < ground && curling && this.bucketFill < 1) {
      this.engagement = ground - tip.y;
      const R = 1.1; let removed = 0;
      for (let dx = -R; dx <= R; dx += cell) for (let dz = -R; dz <= R; dz += cell) {
        const k = this.idx(tip.x + dx, tip.z + dz);
        if (k < 0) continue;
        const fall = 0.022 * (1 - Math.hypot(dx, dz) / (R * 1.5));
        if (fall > 0 && heights[k] > tip.y) { heights[k] -= fall; removed += fall * cell * cell; }
      }
      if (removed > 0) {
        this.bucketFill = Math.min(1, this.bucketFill + removed / SOIL.bucketCap);
        this.dirty = true;
      }
    } else if (!curling && this.bucketFill > 0 && tip.y > ground + 0.25) {
      const R = 0.9, amount = Math.min(this.bucketFill, 0.05);
      for (let dx = -R; dx <= R; dx += cell) for (let dz = -R; dz <= R; dz += cell) {
        const k = this.idx(tip.x + dx, tip.z + dz);
        if (k < 0) continue;
        const rise = amount * 0.04 * (1 - Math.hypot(dx, dz) / (R * 1.4));
        if (rise > 0) { heights[k] += rise; this.movedTotal += rise * cell * cell; }
      }
      this.bucketFill = Math.max(0, this.bucketFill - amount);
      this.dirty = true;
    }

    if (this.dirty) { this.relax(); this.updateMesh(); this.dirty = false; }
    return Math.min(1, this.engagement / SOIL.stallDepth); // load factor for hydraulics
  }
}
