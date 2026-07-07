/* ForceAnalysis — digging forces per ISO 6015 as in the Simscape model's
   BOF/TOF tests:
   - BOF (bucket breakout force): bucket cylinder at relief pressure, force
     balance at the 4-bar linkage node E1, torque about the bucket pivot C4
     divided by the lever arm to the cutting edge D2.
   - TOF (stick/tool crowd force): stick cylinder at relief pressure, torque
     about the stick pivot B3 divided by the lever arm to D2. */
import { HYD } from '../ExcavatorParams.js';
import { dist } from '../mechanical/LinkageKinematics.js';

const A = d => Math.PI * d * d / 4;
export const F_CYL_BUCKET = HYD.pRelief * HYD.bucket.count * A(HYD.bucket.bore); // N
export const F_CYL_STICK = HYD.pRelief * HYD.stick.count * A(HYD.stick.bore);    // N

const unit = (a, b) => { const d = dist(a, b); return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };

/* BOF: force balance at linkage node E1 (N at cutting edge) */
export function breakoutForce(q) {
  const uc = unit(q.C2, q.E1);   // cylinder pushes E1 along C2→E1
  const uh = unit(q.C3, q.E1);   // H-link reaction along C3→E1
  const ub = unit(q.D1, q.E1);   // bucket-link reaction along D1→E1
  // F_cyl·uc + Fh·uh + Fb·ub = 0 → solve for Fb
  const det = uh[0] * ub[1] - uh[1] * ub[0];
  if (Math.abs(det) < 1e-6) return 0;
  const Fb = -F_CYL_BUCKET * (uh[0] * uc[1] - uh[1] * uc[0]) / det;
  // torque about bucket pivot C4 from link force at D1
  const rx = q.D1[0] - q.C4[0], ry = q.D1[1] - q.C4[1];
  const tau = Math.abs(rx * Fb * ub[1] - ry * Fb * ub[0]);
  return tau / dist(q.C4, q.D2);
}

/* TOF: stick cylinder torque about B3 over the lever arm to D2 (N) */
export function stickDigForce(q) {
  const u = unit(q.B2, q.C1);    // cylinder line of action
  // perpendicular distance from B3 to the B2–C1 line
  const rx = q.C1[0] - q.B3[0], ry = q.C1[1] - q.B3[1];
  const tau = Math.abs(rx * F_CYL_STICK * u[1] - ry * F_CYL_STICK * u[0]);
  return tau / dist(q.B3, q.D2);
}
