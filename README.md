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
├─ Mechanical System             ≈ the Simscape "Mechanical System" subsystem
│  ├─ LowerStructure.js            tracks / base
│  ├─ UpperStructure.js            swing platform, cab, counterweight, swing-motor housing
│  ├─ LinkageKinematics.js       ≈ Linkage_Assembly_Lib (FK, 4-bar node, joint limits)
│  ├─ Boom.js · Stick.js · BucketAssembly.js
│  ├─ MechanicalSystem.js          assembly + cylinder/link visuals
│  └─ parts.js                   ≈ Excavator_Parts_Lib (shared part builders)
├─ Hydraulic System
│  ├─ Cylinder.js                  valve command → flow → piston speed → joint rate
│  ├─ SwingMotor.js                accel-limited hydraulic swing drive
│  └─ HydraulicSystem.js           pump flow sharing, relief stall, stick-in regen valve
├─ Operator
│  └─ OperatorCommands.js        ≈ ValveCmdLib (lever targets + keyframed dig cycle)
├─ Soil
│  └─ SoilModel.js                 heightfield + angle-of-repose relaxation
└─ Analysis
   └─ ForceAnalysis.js             BOF + TOF per ISO 6015
```

## Engineering model
Built procedurally from published engineering *data* only — no assets copied from other projects:

- **Kinematics**: 12 pin locations (boom/stick/bucket pivots, cylinder mounts, 4-bar bucket
  linkage, cutting edge) from the design table of
  [Excavator-Simscape](https://github.com/simscape/Excavator-Simscape) (MathWorks).
  The bucket linkage node is solved each frame by circle–circle intersection.
- **Digging forces (ISO 6015)**: BOF from the bucket cylinder (relief pressure × bore area,
  force balance at the linkage node, torque about the bucket pivot over the lever arm to the
  cutting edge) **and TOF** from the stick cylinder (torque about the stick pivot).
  Assumes 34.3 MPa relief; bucket ⌀130 mm, stick ⌀135 mm, boom 2×⌀120 mm bores.
- **Hydraulic actuation**: joints chase the operator targets at flow-limited speeds
  (piston speed = valve flow / piston area, mapped through the linkage dL/dθ; head vs rod
  side areas give different extend/retract speeds). A finite pump (2 × 210 L/min) is shared
  between simultaneous functions, the swing motor is acceleration-limited, digging engagement
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
