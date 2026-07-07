/* LinkageKinematics — planar kinematics of the boom/stick/bucket linkage
   (≈ Linkage_Assembly_Lib.slx in Excavator-Simscape): forward kinematics of
   the pin table, 4-bar bucket linkage solved by circle–circle intersection,
   cylinder length functions and joint limits scanned from cylinder stroke. */
import { PIN, STROKE_RATIO } from '../ExcavatorParams.js';

export function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

export function rot(p, c, th) {
  const s = Math.sin(th), co = Math.cos(th), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * s, c[1] + x * s + y * co];
}

// intersection of circles (c1,r1),(c2,r2) — picks solution nearest `near`
export function circleIntersect(c1, r1, c2, r2, near) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1[0] + a * dx / d, my = c1[1] + a * dy / d;
  const p1 = [mx + h * dy / d, my - h * dx / d], p2 = [mx - h * dy / d, my + h * dx / d];
  return dist(p1, near) < dist(p2, near) ? p1 : p2;
}

export const L_H  = dist(PIN.C3, PIN.E1); // H-link length
export const L_BL = dist(PIN.E1, PIN.D1); // bucket link length

/* forward kinematics: joint deltas (rad) -> pin positions in swing frame */
export function solveKinematics(tb, ts, tk) {
  const q = {};
  const boomR = p => rot(p, PIN.A1, tb);
  const stickR = p => boomR(rot(p, PIN.B3, ts));
  const bktR = p => stickR(rot(p, PIN.C4, tk));
  q.A1 = PIN.A1; q.A2 = PIN.A2;
  q.B1 = boomR(PIN.B1); q.B2 = boomR(PIN.B2); q.B3 = boomR(PIN.B3);
  q.C1 = stickR(PIN.C1); q.C2 = stickR(PIN.C2); q.C3 = stickR(PIN.C3); q.C4 = stickR(PIN.C4);
  q.D1 = bktR(PIN.D1); q.D2 = bktR(PIN.D2);
  q.E1 = circleIntersect(q.C3, L_H, q.D1, L_BL, bktR(PIN.E1)); // 4-bar linkage node
  return q;
}

/* cylinder length as a function of its joint delta (rad), each in the frame
   of the cylinder's base pin — used for joint limits and flow→speed mapping */
export const cylLen = {
  boom:  tb => dist(PIN.A2, rot(PIN.B1, PIN.A1, tb)),
  stick: ts => dist(PIN.B2, rot(PIN.C1, PIN.B3, ts)),
  bucket: tk => {
    const D1r = rot(PIN.D1, PIN.C4, tk);
    if (dist(PIN.C3, D1r) > L_H + L_BL - 0.02) return 1e9; // linkage cannot reach
    return dist(PIN.C2, circleIntersect(PIN.C3, L_H, D1r, L_BL, PIN.E1));
  },
};

// dL/dθ (m/rad), numeric — sign tells whether +θ extends (+) or retracts (−)
export function dLdTheta(fn, t) {
  const h = 0.002;
  return (fn(t + h) - fn(t - h)) / (2 * h);
}

/* joint limits scanned from cylinder stroke envelope around the design pose */
function scanLimits(lenAt) {
  const L0 = lenAt(0), lo = STROKE_RATIO.lo * L0, hi = STROKE_RATIO.hi * L0;
  let a = 0, b = 0;
  for (let t = 0; t > -Math.PI; t -= 0.01) { const L = lenAt(t); if (L < lo || L > hi) break; a = t; }
  for (let t = 0; t < Math.PI; t += 0.01) { const L = lenAt(t); if (L < lo || L > hi) break; b = t; }
  return [a, b];
}

export const LIMITS = { // rad, deltas from design pose
  boom: scanLimits(cylLen.boom),
  stick: scanLimits(cylLen.stick),
  bucket: scanLimits(cylLen.bucket),
};
