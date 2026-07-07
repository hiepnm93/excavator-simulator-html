/* ForceAnalysis — BOF / TOF tests per ISO 6015:2016 with full quasi-static
   pin-load resolution, following the Excavator Design app's
   Excavator_Param_BOFTOF_Calc model:

   - An edge force F is applied at the cutting edge D2, perpendicular to the
     bucket radius (BOF, about C4) or to the arm radius (TOF, about B3).
   - Sequential statics (bucket → linkage node → stick → boom), including the
     part weights and the soil load in the bucket, give every cylinder force
     and pin load as a function of F.
   - Each cylinder's required pressure is affine in F, so the test force is
     the largest F for which the ACTIVE cylinder stays below the pump relief
     (350 bar) and every HOLDING cylinder stays below its port relief
     (400 bar). The binding cylinder is reported — e.g. the boom holding at
     400 bar can cap BOF before the bucket cylinder reaches 350 bar, exactly
     as in the app's results table. */
import { HYD, MASS } from '../ExcavatorParams.js';
import { dist } from '../mechanical/LinkageKinematics.js';

const G = 9.81;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (v, s) => [v[0] * s, v[1] * s];
const add = (...vs) => vs.reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const mag = v => Math.hypot(v[0], v[1]);
const unit = (a, b) => { const d = dist(a, b); return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
const avg = (...ps) => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];

// signed axial cylinder force -> required pressure (head side pushing, rod side pulling)
const pressureOf = (F, spec) => F >= 0 ? F / spec.areaHead : -F / spec.areaRodEnd;

/* full statics at pose q for edge force F along uE at D2; mSoil = soil in bucket.
   Returns signed cylinder forces (Fb boom, S stick, Fc bucket; + = pushing),
   link tensions (T_h H-link, T_b bucket link) and pin reactions (vectors, N). */
export function statics(q, uE, F, mSoil) {
  const Fe = mul(uE, F);
  const Wbk = [0, -(MASS.bucket + mSoil) * G];
  const Wst = [0, -MASS.stick * G];
  const Wbm = [0, -MASS.boom * G];
  const cgBk = avg(q.C4, q.D1, q.D2), cgSt = avg(q.B3, q.C1, q.C4), cgBm = avg(q.A1, q.B1, q.B3);

  // bucket link tension from bucket moment balance about C4
  const uDE = unit(q.D1, q.E1); // link axis D1→E1; tension pulls D1 toward E1
  const mT = cross(sub(q.D1, q.C4), uDE);
  if (Math.abs(mT) < 1e-6) return null;
  const T_b = -(cross(sub(cgBk, q.C4), Wbk) + cross(sub(q.D2, q.C4), Fe)) / mT;

  // linkage node E1: Fc·u(C2→E1) + T_h·u(E1→C3) + T_b·u(E1→D1) = 0
  const uCE = unit(q.C2, q.E1), uEC3 = unit(q.E1, q.C3), uED = unit(q.E1, q.D1);
  const det = uCE[0] * uEC3[1] - uCE[1] * uEC3[0];
  if (Math.abs(det) < 1e-6) return null;
  const rhs = mul(uED, -T_b);
  const Fc = (rhs[0] * uEC3[1] - rhs[1] * uEC3[0]) / det;   // bucket cylinder (+ = push)
  const T_h = (uCE[0] * rhs[1] - uCE[1] * rhs[0]) / det;    // H-link tension

  // bucket Newton: reaction on bucket from stick at C4
  const R_C4 = mul(add(mul(uDE, T_b), Wbk, Fe), -1);

  // stick moment about B3 -> stick cylinder force S (along B2→C1 at C1)
  const uC3E = unit(q.C3, q.E1);         // H-link force on stick at C3
  const fC2 = mul(uCE, -Fc);             // bucket cyl reaction on stick at C2
  const fC4 = mul(R_C4, -1);             // bucket reaction on stick at C4
  const uBC1 = unit(q.B2, q.C1);
  const mS = cross(sub(q.C1, q.B3), uBC1);
  if (Math.abs(mS) < 1e-6) return null;
  const S = -(cross(sub(q.C3, q.B3), mul(uC3E, T_h)) + cross(sub(q.C2, q.B3), fC2)
            + cross(sub(q.C4, q.B3), fC4) + cross(sub(cgSt, q.B3), Wst)) / mS;
  const R_B3 = mul(add(mul(uC3E, T_h), fC2, fC4, Wst, mul(uBC1, S)), -1);

  // boom moment about A1 -> boom cylinder force Fb (pair, along A2→B1 at B1)
  const uAB1 = unit(q.A2, q.B1);
  const mB = cross(sub(q.B1, q.A1), uAB1);
  if (Math.abs(mB) < 1e-6) return null;
  const Fb = -(cross(sub(q.B3, q.A1), mul(R_B3, -1)) + cross(sub(q.B2, q.A1), mul(uBC1, -S))
             + cross(sub(cgBm, q.A1), Wbm)) / mB;
  const R_A1 = mul(add(mul(R_B3, -1), mul(uBC1, -S), Wbm, mul(uAB1, Fb)), -1);

  return {
    T_b, T_h, Fc, S, Fb, R_C4, R_B3, R_A1,
    p: { boom: pressureOf(Fb, HYD.boom), stick: pressureOf(S, HYD.stick), bucket: pressureOf(Fc, HYD.bucket) },
  };
}

/* largest edge force along uE with active cylinder ≤ pump relief and holding
   cylinders ≤ port relief; pressures are affine in F on the digging branch. */
function limitedEdgeForce(q, uE, mSoil, active) {
  const F1 = 3e5, F2 = 5e5;
  const s1 = statics(q, uE, F1, mSoil), s2 = statics(q, uE, F2, mSoil);
  if (!s1 || !s2) return null;
  let Fmax = Infinity, limiter = active;
  for (const fn of ['boom', 'stick', 'bucket']) {
    const cap = (fn === active ? HYD.pPump : HYD.pRelief);
    const b = (s2.p[fn] - s1.p[fn]) / (F2 - F1);
    if (b > 1e-12) {
      const f = (cap - (s1.p[fn] - b * F1)) / b;
      if (f < Fmax) { Fmax = f; limiter = fn; }
    }
  }
  Fmax = Math.max(0, Math.min(Fmax, 5e6));
  const s = statics(q, uE, Fmax, mSoil);
  return s && { F: Fmax, limiter, s };
}

// edge-force direction: perpendicular to pivot→D2, opposing the dig rotation
const perp = (q, pivot) => {
  const r = sub(q.D2, pivot), d = mag(r);
  return [-r[1] / d, r[0] / d];
};

/* run the BOF test (bucket cylinder active, torque about C4) and the TOF
   test (stick cylinder active, torque about B3) at pose q */
export function digForces(q, mSoil) {
  return {
    bof: limitedEdgeForce(q, perp(q, q.C4), mSoil, 'bucket'),
    tof: limitedEdgeForce(q, perp(q, q.B3), mSoil, 'stick'),
  };
}
