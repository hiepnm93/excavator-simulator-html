/* HydraulicSystem — pump + valve block + actuators, following the Simscape
   model's hydraulic actuation network:

     HydraulicSystem
     ├─ Pump           (finite flow, shared between functions)
     ├─ ValveBlock     (proportional commands from operator targets)
     ├─ Cylinder ×3    (boom pair, stick, bucket)
     ├─ SwingMotor
     └─ Regeneration valve (stick-in: rod-side oil reused → faster, less pump flow)

   Joints therefore chase their targets at flow-limited speeds; simultaneous
   functions share the pump (flow saturation slows everything down), and soil
   engagement stalls the digging functions against the relief pressure. */
import { HYD } from '../ExcavatorParams.js';
import { LIMITS } from '../mechanical/LinkageKinematics.js';
import { Cylinder } from './Cylinder.js';
import { SwingMotor } from './SwingMotor.js';

const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const PROP_BAND = { swing: 25, boom: 8, stick: 10, bucket: 12 }; // deg of error for full valve

export class HydraulicSystem {
  constructor() {
    this.pumpFlow = HYD.pumpFlow;
    this.cyl = { boom: new Cylinder('boom'), stick: new Cylinder('stick'), bucket: new Cylinder('bucket') };
    this.swingMotor = new SwingMotor();
    this.status = { flowUtil: 0, regen: false, stall: 0 };
  }

  /* advance joint state (deg) toward targets (deg); loadFactor ∈ [0,1] is
     soil engagement (1 = fully stalled dig functions) */
  update(state, targets, dt, loadFactor) {
    // valve commands from target error (proportional band)
    const u = {};
    for (const k of ['swing', 'boom', 'stick', 'bucket'])
      u[k] = clamp((targets[k] - state[k]) / PROP_BAND[k], -1, 1);

    // stick-in regeneration: rod-side oil reused while the stick cylinder
    // extends (stick-in = negative stick delta on this linkage)
    const regen = u.stick < -0.05;

    // pump flow sharing: scale all functions down if total demand exceeds supply
    let demand = this.swingMotor.flowDemand(u.swing, this.pumpFlow);
    for (const k of ['boom', 'stick', 'bucket']) demand += this.cyl[k].flowDemand(u[k]);
    if (regen) demand -= this.cyl.stick.flowDemand(u.stick) * this.cyl.stick.regenFlowSave;
    const flowScale = demand > 1e-9 ? Math.min(1, this.pumpFlow / demand) : 1;

    // soil stall: digging functions lose speed against the relief valve
    const dig = clamp(1 - 0.9 * loadFactor, 0.1, 1);

    // integrate joints
    state.swing += this.swingMotor.update(u.swing, dt, flowScale) * dt;
    for (const k of ['boom', 'stick', 'bucket']) {
      let rate = deg(this.cyl[k].jointRate(u[k], rad(state[k]))) * flowScale;
      if (k === 'stick' && regen) rate *= this.cyl.stick.regenBoost;
      if (k !== 'boom') rate *= dig;      // stick & bucket work against the soil
      state[k] += rate * dt;
      state[k] = clamp(state[k], deg(LIMITS[k][0]), deg(LIMITS[k][1]));
    }
    state.swing = clamp(state.swing, -180, 180);

    this.status.flowUtil = Math.min(1, demand / this.pumpFlow);
    this.status.regen = regen;
    this.status.stall = loadFactor;
    return this.status;
  }
}
