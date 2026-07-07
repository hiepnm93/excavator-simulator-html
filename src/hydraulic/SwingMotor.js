/* SwingMotor — hydraulic swing drive: speed follows the valve command with
   an acceleration limit (motor + slew ring inertia), consuming a share of
   pump flow proportional to speed. */
import { HYD } from '../ExcavatorParams.js';

export class SwingMotor {
  constructor() {
    this.maxSpeed = HYD.swing.maxSpeed;   // deg/s
    this.accel = HYD.swing.accel;         // deg/s²
    this.flowFrac = HYD.swing.flowFrac;   // share of pump flow at full speed
    this.speed = 0;                       // deg/s
  }

  /* u ∈ [-1,1] valve command; returns achieved speed (deg/s) */
  update(u, dt, flowScale) {
    const target = u * this.maxSpeed * flowScale;
    const dv = Math.max(-this.accel * dt, Math.min(this.accel * dt, target - this.speed));
    this.speed += dv;
    return this.speed;
  }

  flowDemand(u, pumpFlow) { return Math.abs(u) * this.flowFrac * pumpFlow; }
}
