# Excavator Simulator (HTML)

Interactive hydraulic excavator simulator in plain HTML + ES modules (Three.js, no build step).

**[▶ Live demo](https://hiepnm93.github.io/excavator-simulator-html/)**

## Component architecture

The code is decomposed into small subsystem components that mirror the model tree of
MathWorks' [Excavator Design with Simscape](https://www.mathworks.com/matlabcentral/fileexchange/119268-excavator-design-with-simscape)
([Excavator-Simscape on GitHub](https://github.com/simscape/Excavator-Simscape)) —
an on-screen component tree lets you highlight each one:

```
Excavator Model (src/main.js)
├─ ExcavatorParams.js            ≈ Scripts_Data/Excavator_Init_Params.m (pins, hydraulics, soil)
├─ Mechanical System             ≈ the Simscape "Mechanical System" subsystem, same block split:
│  │                               Base · BaseToChassis ⟲ · Chassis · ChassisToBoom ⟲ · Boom ·
│  │                               Boom Cyl L/R · BoomToStick ⟲ · Stick · Stick Cyl ·
│  │                               StickToBucket ⟲ · Bucket Cyl · Bucket Linkage · Bucket
│  ├─ LowerStructure.js            Base (tracks)
│  ├─ UpperStructure.js            Chassis: swing platform, cab, counterweight, swing motor
│  ├─ LinkageKinematics.js       ≈ Linkage_Assembly_Lib (FK, 4-bar node, joint limits)
│  ├─ Boom.js · Stick.js · BucketAssembly.js
│  ├─ MechanicalSystem.js          assembly, joint markers, cylinder/link visuals
│  └─ parts.js                   ≈ Excavator_Parts_Lib (shared part builders)
├─ Hydraulic System
│  ├─ Cylinder.js                  valve command → flow → piston speed → joint rate
│  ├─ SwingMotor.js                accel-limited hydraulic swing drive
│  └─ HydraulicSystem.js           pump flow sharing, relief stall, stick-in regen valve
├─ Operator
│  └─ OperatorCommands.js        ≈ ValveCmdLib (lever targets + keyframed dig cycle)
├─ Soil
│  └─ SoilModel.js                 heightfield + angle-of-repose relaxation
├─ Analysis
│  └─ ForceAnalysis.js             BOF/TOF tests per ISO 6015 with full pin-load statics
└─ UI
   └─ ComponentInfo.js             parameter popups (areas, masses, pressures, pin loads)
```

Clicking a component in the on-screen tree highlights it (joints get a pin marker) and
opens a **parameter popup** like the Excavator Design app's BOF/TOF tab: cylinder head/rod-end
areas (mm²), part masses (kg), max pressures (bar), pin locations, joint limits, and the live
**pin loads (kN)** and cylinder pressures of the running BOF test.

## Engineering model
Built procedurally from published engineering *data* only — no assets copied from other projects:

- **Kinematics**: 12 pin locations (boom/stick/bucket pivots, cylinder mounts, 4-bar bucket
  linkage, cutting edge) from the design table of
  [Excavator-Simscape](https://github.com/simscape/Excavator-Simscape) (MathWorks).
  The bucket linkage node is solved each frame by circle–circle intersection.
- **Digging forces (ISO 6015) with pin loads**: an edge force is applied at the cutting
  edge (perpendicular to the bucket radius for BOF, to the arm radius for TOF) and resolved
  by sequential statics — bucket → linkage node → stick → boom, including part weights and
  the soil load — giving every cylinder force and pin load. The test force is the largest
  value keeping the *active* cylinder under the 350 bar pump relief and every *holding*
  cylinder under its 400 bar port relief, so the binding function is reported (the boom
  holding circuit often caps BOF before the bucket cylinder reliefs — exactly as in the
  app's results table). Cylinder areas (boom 38013/20341, stick 49087/26389, bucket
  38013/17907 mm² head/rod-end) and part masses (7226.5 / 3327.9 / 5119.5 kg) follow the
  app's defaults.
- **Hydraulic actuation**: joints chase the operator targets at flow-limited speeds
  (piston speed = valve flow / piston area, mapped through the linkage dL/dθ; head vs rod
  side areas give different extend/retract speeds). A finite pump is shared between
  simultaneous functions, the swing motor is acceleration-limited, digging engagement
  stalls the stick/bucket functions against the relief valve, and a stick-in **regeneration
  valve** speeds the stick while saving pump flow — all following the Simscape model's
  hydraulic actuation network (simplified).
- **Joint limits**: scanned from cylinder geometry (max/min length ratio ≈ 1.56).
- **Soil**: heightfield with angle-of-repose relaxation (0.85 rad, 3 iterations/update),
  following the soil plugin of
  [excavator_simulator_mujoco](https://github.com/KennyVilella/excavator_simulator_mujoco)
  / [soil_dynamics_cpp](https://github.com/KennyVilella/soil_dynamics_cpp).

## Controls
Swing / boom / stick / bucket sliders set operator targets (the hydraulics decide how fast the
joints actually follow), auto dig cycle, diggable terrain: dig below grade with the bucket
curled to fill it, raise and open to dump. The right-hand panel is the component tree —
click any component to highlight it in the scene.

## Run locally
```
python -m http.server   # open http://localhost:8000
```
