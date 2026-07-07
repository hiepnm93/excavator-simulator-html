/* Cylinder — one hydraulic cylinder function (boom pair / stick / bucket).
   Maps valve command → flow → piston speed → joint rate through the linkage
   geometry (dL/dθ), like the cylinder + valve blocks of the Simscape
   hydraulic actuation system. Head/rod side areas give different extend and
   retract speeds; pRelief × head area is the ISO 6015 force capability. */
import { HYD } from '../ExcavatorParams.js';
import { cylLen, dLdTheta } from '../mechanical/LinkageKinematics.js';

export class Cylinder {
  constructor(name) {
    const s = HYD[name];
    this.name = name;
    this.lenFn = cylLen[name];
    this.maxFlow = s.maxFlow;                       // m³/s at full valve command
    this.areaHead = s.areaHead;                     // m² (pair total for boom)
    this.areaRod = s.areaRodEnd;
    this.forceMax = HYD.pPump * this.areaHead;      // N, pump-limited push
    this.regenBoost = s.regenBoost || 1;
    this.regenFlowSave = s.regenFlowSave || 0;
  }

  /* joint rate (rad/s) for valve command u ∈ [-1,1] at joint delta t (rad).
     Positive u drives +θ; the piston area used depends on whether +θ
     extends or retracts this cylinder. */
  jointRate(u, t) {
    const dL = dLdTheta(this.lenFn, t);
    const g = Math.max(0.5, Math.abs(dL));          // guard linkage singularities
    const extending = u * dL > 0;                   // piston moving out
    const area = extending ? this.areaHead : this.areaRod;
    return u * (this.maxFlow / area) / g;
  }

  flowDemand(u) { return Math.abs(u) * this.maxFlow; }
}
