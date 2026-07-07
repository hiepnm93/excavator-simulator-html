/* ComponentInfo — parameter popups for every component of the model tree,
   showing the same data as the Excavator Design app's BOF/TOF tab: cylinder
   head/rod-end areas (mm²), part masses (kg), max pressures (bar), pin
   locations (m), and the live pin loads (kN) / cylinder pressures (bar) of
   the running BOF test. Rows given as [label, staticString | () => string]. */
import { PIN, HYD, MASS, SOIL, SWING_F } from '../ExcavatorParams.js';
import { LIMITS, cylLen, dist, L_H, L_BL } from '../mechanical/LinkageKinematics.js';

const rad = d => d * Math.PI / 180;
const degS = r => Math.round(r * 180 / Math.PI) + '°';
const pin = p => `[${p[0].toFixed(2)}, ${p[1].toFixed(2)}] m`;
const mm2 = a => Math.round(a * 1e6).toLocaleString('en-US') + ' mm²';
const kN = n => (n / 1000).toFixed(1) + ' kN';
const bar = pa => (pa / 1e5).toFixed(1) + ' bar';
const lim = k => `${degS(LIMITS[k][0])} … ${degS(LIMITS[k][1])}`;

/* ctx: { state, hyd, soil, forces() -> latest digForces result or null } */
export function popupDefs(ctx) {
  const bofS = () => { const f = ctx.forces(); return f && f.bof ? f.bof.s : null; };
  const load = key => () => { const s = bofS(); return s ? kN(pinLoadOf(s, key)) : '–'; };
  const press = fn => () => { const s = bofS(); return s ? bar(Math.abs(s.p[fn])) : '–'; };
  const cylRows = (fn, spec) => [
    ['Head end area', mm2(spec.areaHead)],
    ['Rod end area', mm2(spec.areaRodEnd)],
    ['Max pressure', bar(HYD.pRelief) + ' (port relief)'],
    ['Pump relief', bar(HYD.pPump)],
    ['Max flow', Math.round(spec.maxFlow * 60000) + ' L/min'],
    ['Length now', () => cylLen[fn](rad(ctx.state[cylJoint[fn]])).toFixed(3) + ' m'],
    ['Pressure @ BOF', press(fn)],
  ];
  const cylJoint = { boom: 'boom', stick: 'stick', bucket: 'bucket' };

  function pinLoadOf(s, key) {
    const mag = v => Math.hypot(v[0], v[1]);
    switch (key) {
      case 'A1': return mag(s.R_A1);
      case 'B3': return mag(s.R_B3);
      case 'C4': return mag(s.R_C4);
      case 'Th': return Math.abs(s.T_h);
      case 'Tb': return Math.abs(s.T_b);
      case 'Fb': return Math.abs(s.Fb);
      case 'S':  return Math.abs(s.S);
      case 'Fc': return Math.abs(s.Fc);
      default: return 0;
    }
  }

  return {
    base: { title: 'Base (tracks)', rows: [
      ['Simscape block', 'Base + Ground Contact'],
      ['Track frames', '3.6 × 0.85 m, gauge 2.5 m'],
      ['Constraint', '6-DOF joint to world (fixed here)'],
    ]},
    jointSwing: { title: 'BaseToChassis (swing joint)', rows: [
      ['Type', 'Revolute, vertical axis'],
      ['Axis offset', `${Math.abs(SWING_F).toFixed(2)} m behind boom pivot`],
      ['Swing angle', () => Math.round(ctx.state.swing) + '°'],
      ['Swing speed', () => ctx.hyd.swingMotor.speed.toFixed(1) + ' °/s'],
    ]},
    chassis: { title: 'Chassis (house)', rows: [
      ['Simscape block', 'Chassis'],
      ['Carries', 'cab, counterweight, engine, boom foot A1/A2'],
      ['Boom pivot A1', pin(PIN.A1)],
      ['Boom cyl base A2', pin(PIN.A2)],
    ]},
    jointA1: { title: 'ChassisToBoom (pin A1)', rows: [
      ['Type', 'Revolute'],
      ['Pin location', pin(PIN.A1)],
      ['Boom delta', () => Math.round(ctx.state.boom) + '°'],
      ['Joint limits', lim('boom')],
      ['Pin load @ BOF', load('A1')],
    ]},
    boom: { title: 'Boom', rows: [
      ['Part mass', MASS.boom.toFixed(2) + ' kg'],
      ['Length A1→B3', dist(PIN.A1, PIN.B3).toFixed(2) + ' m'],
      ['Pins', 'A1, B1 (cyl rod), B2 (stick cyl base), B3'],
      ['Boom↔Chassis @ BOF', load('A1')],
      ['Boom↔Stick @ BOF', load('B3')],
    ]},
    cylBoomL: { title: 'Boom Cyl L (pair values)', rows: cylRows('boom', HYD.boom) },
    cylBoomR: { title: 'Boom Cyl R (pair values)', rows: cylRows('boom', HYD.boom) },
    jointB3: { title: 'BoomToStick (pin B3)', rows: [
      ['Type', 'Revolute'],
      ['Pin location', pin(PIN.B3)],
      ['Stick delta', () => Math.round(ctx.state.stick) + '°'],
      ['Joint limits', lim('stick')],
      ['Pin load @ BOF', load('B3')],
    ]},
    stick: { title: 'Stick (arm)', rows: [
      ['Part mass', MASS.stick.toFixed(2) + ' kg'],
      ['Length B3→C4', dist(PIN.B3, PIN.C4).toFixed(2) + ' m'],
      ['Pins', 'B3, C1 (cyl rod), C2 (bucket cyl base), C3, C4'],
      ['Boom↔Stick @ BOF', load('B3')],
      ['Stick↔Bucket @ BOF', load('C4')],
      ['Stick↔Linkage @ BOF', load('Th')],
    ]},
    cylStick: { title: 'Stick Cyl', rows: [
      ...cylRows('stick', HYD.stick),
      ['Regen valve', 'stick-in: ×' + HYD.stick.regenBoost + ' speed'],
    ]},
    jointC4: { title: 'StickToBucket (pin C4)', rows: [
      ['Type', 'Revolute'],
      ['Pin location', pin(PIN.C4)],
      ['Bucket delta', () => Math.round(ctx.state.bucket) + '°'],
      ['Joint limits', lim('bucket')],
      ['Pin load @ BOF', load('C4')],
    ]},
    cylBucket: { title: 'Bucket Cyl', rows: cylRows('bucket', HYD.bucket) },
    linkage: { title: 'Bucket Linkage (4-bar)', rows: [
      ['Simscape block', 'Bucket Linkage + BucketLinkToBucket'],
      ['H-link C3→E1', L_H.toFixed(3) + ' m'],
      ['Bucket link E1→D1', L_BL.toFixed(3) + ' m'],
      ['Stick↔Linkage @ BOF', load('Th')],
      ['Bucket↔Linkage @ BOF', load('Tb')],
      ['Bucket Cyl↔Linkage @ BOF', load('Fc')],
    ]},
    bucket: { title: 'Bucket', rows: [
      ['Part mass', MASS.bucket.toFixed(2) + ' kg'],
      ['Capacity', SOIL.bucketCap + ' m³'],
      ['Cutting edge D2', pin(PIN.D2)],
      ['Fill', () => Math.round(ctx.soil.bucketFill * 100) + '%'],
      ['Soil load', () => Math.round(ctx.soil.bucketFill * SOIL.bucketCap * SOIL.density) + ' kg'],
      ['BOF now', () => { const f = ctx.forces(); return f && f.bof ? kN(f.bof.F) : '–'; }],
      ['Stick↔Bucket @ BOF', load('C4')],
    ]},
    pump: { title: 'Pump (×2)', rows: [
      ['Total flow', Math.round(HYD.pumpFlow * 60000) + ' L/min'],
      ['Relief pressure', bar(HYD.pPump)],
      ['Flow used', () => Math.round(ctx.hyd.status.flowUtil * 100) + '%'],
      ['Sharing', 'functions scale down when demand > supply'],
    ]},
    valves: { title: 'Valve Block', rows: [
      ['Port relief', bar(HYD.pRelief) + ' per cylinder'],
      ['Control', 'proportional: command = target error / band'],
      ['Regen valve', () => ctx.hyd.status.regen ? 'ACTIVE (stick-in)' : 'inactive'],
      ['Dig stall', () => Math.round(ctx.hyd.status.stall * 100) + '% of relief'],
    ]},
    swingMotor: { title: 'Swing Motor', rows: [
      ['Max speed', HYD.swing.maxSpeed + ' °/s'],
      ['Acceleration', HYD.swing.accel + ' °/s²'],
      ['Pump share', Math.round(HYD.swing.flowFrac * 100) + '% at full speed'],
      ['Speed now', () => ctx.hyd.swingMotor.speed.toFixed(1) + ' °/s'],
    ]},
    soil: { title: 'Soil Model', rows: [
      ['Heightfield', `${SOIL.grid}×${SOIL.grid} cells, ${SOIL.size} m`],
      ['Repose angle', SOIL.repose + ' rad'],
      ['Relax iterations', String(SOIL.relaxIter)],
      ['Soil moved', () => ctx.soil.movedTotal.toFixed(1) + ' m³'],
    ]},
  };
}
