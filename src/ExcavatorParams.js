/* ExcavatorParams — parameter data for every subsystem.
   Mirrors Scripts_Data/Excavator_Init_Params.m + Excavator_System_params.m of
   MathWorks' Excavator-Simscape (github.com/simscape/Excavator-Simscape):
   numeric design data only, no assets copied. Cylinder areas, part masses and
   relief pressures follow the Excavator Design app's BOF/TOF test defaults. */

/* Pin locations (m, sagittal plane: f = forward, u = up) from the published
   design table of the Simscape example. */
export const PIN = {
  A1: [0.0000, 0.7000],  // chassis–boom pivot
  A2: [0.9000, 0.4750],  // chassis–boom cylinder base
  B1: [1.6825, 3.6050],  // boom–boom cylinder rod
  B2: [1.8050, 4.1269],  // boom–stick cylinder base
  B3: [5.7012, 3.2253],  // boom–stick pivot
  C1: [5.6642, 4.2641],  // stick–stick cylinder rod
  C2: [6.4528, 3.6418],  // stick–bucket cylinder base
  C3: [7.2375, 1.5979],  // stick–H-link (guide link)
  C4: [7.5958, 0.9339],  // stick–bucket pivot
  E1: [8.0225, 2.0441],  // linkage node (bucket cylinder rod)
  D1: [8.1467, 1.3393],  // bucket–link pin
  D2: [8.3501, -0.8885], // cutting edge
};

export const H0 = 0.92;       // model origin height: cutting edge ≈ grade in design pose
export const SWING_F = -0.33; // swing axis forward offset vs boom pivot

/* Hydraulic actuation system — pressures, cylinder areas (head end / rod end,
   converted from the app's mm² values) and part masses from the Excavator
   Design app's "BOF, TOF, Lift Capacity" tab. Boom areas are the effective
   total of the L+R cylinder pair. */
export const HYD = {
  pPump: 35.0e6,                        // Pa — 350 bar pump relief (active function)
  pRelief: 40.0e6,                      // Pa — 400 bar cylinder port relief (holding)
  pumpFlow: 1700 / 60000,               // m³/s total
  boom:   { areaHead: 38013e-6, areaRodEnd: 20341e-6, count: 2, maxFlow: 700 / 60000 },
  stick:  { areaHead: 49087e-6, areaRodEnd: 26389e-6, count: 1, maxFlow: 1000 / 60000,
            regenBoost: 1.35, regenFlowSave: 0.35 }, // stick-in regeneration valve
  bucket: { areaHead: 38013e-6, areaRodEnd: 17907e-6, count: 1, maxFlow: 630 / 60000 },
  swing:  { maxSpeed: 40, accel: 45, flowFrac: 0.35 }, // deg/s, deg/s², share of pump
};

/* Part masses (kg) from the app's Part Mass table */
export const MASS = { boom: 7226.51, stick: 3327.88, bucket: 5119.51 };

/* Soil model (heightfield + angle-of-repose relaxation, after
   KennyVilella/excavator_simulator_mujoco's soil plugin). */
export const SOIL = {
  grid: 110, size: 66,
  repose: 0.85,        // rad
  relaxIter: 3,
  bucketCap: 3.2,      // m³ (machine class implied by the app's masses/areas)
  density: 1800,       // kg/m³ loose soil in the bucket
  stallDepth: 0.55,    // m engagement at which digging fully stalls the function
};

/* Cylinder stroke envelope: usable length ratio vs design pose (≈1.56 max/min). */
export const STROKE_RATIO = { lo: 0.78, hi: 1.22 };
