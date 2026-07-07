/* ExcavatorParams — parameter data for every subsystem.
   Mirrors Scripts_Data/Excavator_Init_Params.m + Excavator_System_params.m of
   MathWorks' Excavator-Simscape (github.com/simscape/Excavator-Simscape):
   numeric design data only, no assets copied. */

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

/* Hydraulic actuation system (20 t class assumptions).
   pRelief × bore area gives the ISO 6015 cylinder force; pump flow and
   cylinder areas set the achievable joint speeds (flow-limited, like the
   Simscape model's valve/pump network). */
export const HYD = {
  pRelief: 34.3e6,                    // Pa (343 bar main relief)
  pumpFlow: 420 / 60000,              // m³/s — 2 × 210 L/min main pumps
  boom:   { bore: 0.120, rod: 0.085, count: 2, maxFlow: 420 / 60000 },
  stick:  { bore: 0.135, rod: 0.095, count: 1, maxFlow: 300 / 60000,
            regenBoost: 1.35, regenFlowSave: 0.35 }, // stick-in regeneration valve
  bucket: { bore: 0.130, rod: 0.090, count: 1, maxFlow: 220 / 60000 },
  swing:  { maxSpeed: 66, accel: 70, flowFrac: 0.40 }, // deg/s, deg/s², share of pump
};

/* Soil model (heightfield + angle-of-repose relaxation, after
   KennyVilella/excavator_simulator_mujoco's soil plugin). */
export const SOIL = {
  grid: 110, size: 66,
  repose: 0.85,        // rad
  relaxIter: 3,
  bucketCap: 0.45,     // m³
  stallDepth: 0.55,    // m engagement at which digging fully stalls the function
};

/* Cylinder stroke envelope: usable length ratio vs design pose (≈1.56 max/min). */
export const STROKE_RATIO = { lo: 0.78, hi: 1.22 };
