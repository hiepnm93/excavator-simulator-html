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
- **Geometry**: all bodies are procedural, generated around the pin table — welded box
  sections with side plates and pin bosses for boom/stick, bucket shell with mounting ears,
  teeth adapters and side cutters, full track-shoe loop around sprocket/idler with rollers,
  rounded glazed cab, curved counterweight, handrails. No CAD from other projects is used
  for the simulated bodies.
- **Optional body skin**: the "SketchUp body skin" checkbox swaps the procedural machine
  for the 3D Warehouse model
  ["Excavator" by Max M.](https://3dwarehouse.sketchup.com/model/c166a27e-f710-41ec-b43c-c9d4f016de52/Excavator)
  (`assets/excavator-3dw.glb`, used under the 3D Warehouse General Model License as part of
  this application). The GLB has no named part hierarchy, so subassemblies are classified by
  bounding-box geometry and orientation/scale are normalized automatically. The model's arm
  (a Liebherr-style two-piece boom) is **rigged onto the simulator's joints**: its pivot pins
  were measured from the GLB vertex data, and each link cluster (lower+upper boom, stick,
  bucket) is re-parented onto the corresponding pivot group with a full 3D pin-to-pin
  alignment — link axis onto the target axis **and the arm's lateral axis onto the machine's
  lateral axis**, so every link lies in the sagittal working plane exactly like the pin
  skeleton of the Simscape BOF/TOF figure (both pins of every link land on the simulator's
  A1/B3/C4/D2 to the millimetre). The model's own cylinders and 4-bar links are articulated
  between their real lugs (body anchored at the base lug, rod at the rod lug, re-aimed every
  frame; the links chase the live linkage node E1). Brand lettering is hidden.
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

## Skin rigging rules (checklist for swapping in a new model)

Any replacement skin must satisfy these invariants — they are what
`src/mechanical/WarehouseSkin.js` enforces, and every one of them has been a real bug:

1. **Pin coincidence** — after rigging, every link's pins must land exactly on the
   simulator's kinematic pins: boom on A1 and B3, stick on B3 and C4, bucket on C4 and D2.
   Verify numerically (not by eye) via the `window.__skinDebug` hook: sim pins from
   `mech.swing.localToWorld(PIN − SWING_F)` must equal `holder.localToWorld(armFrame × pin)`
   to ≤ 5 mm on all three axes.
2. **Sagittal working plane** — all pins must have lateral coordinate z = 0 in the swing
   frame (the plane of the Simscape BOF/TOF pin-skeleton figure). A skin arm parked yawed
   out of plane needs the full 3D basis alignment (link axis → target axis AND arm lateral
   axis → machine lateral axis); an in-plane-only rotation leaves the far pins metres off,
   visible only in the TOP view.
3. **House/boom heading** — the house's longitudinal axis must equal the boom plane
   direction (+x at swing 0). Models are often parked with the house slewed relative to the
   tracks; correct the house yaw about the swing axis from the static arm's plan direction
   (boom foot → cutting edge), never assume house and undercarriage agree.
4. **Base normalization** — undercarriage centered on the swing axis, track axis along +x
   (minimal plan footprint), shoes on grade (bbox min y = −H0), one uniform scale shared by
   base and house.
5. **Actuators between real lugs** — cylinders/links must anchor at the skin's own mounting
   lugs (body at base lug, rod at rod lug, re-aimed per frame; 4-bar links chase the live E1
   node). Overlaying the procedural cylinders on a differently-shaped skin leaves them
   floating mid-air.
6. **Frame bookkeeping** — link holders carry scene-world-at-rig coordinates, the house
   content holder carries raw glTF coordinates; lugs and mesh offsets must be expressed in
   the right frame or parts teleport to the un-rigged pose.
7. **Branding** — hide brand lettering meshes (identify by material + span, textures are not
   always used).

Test procedure after any skin change: check the numeric pin assertion above; screenshot the
machine from the SIDE and from the TOP (plan view is where lateral misalignment hides) at
design pose, arm raised, and digging below grade; run one full auto dig cycle plus a swing
to ±60° and confirm no piece separates.

## Controls
Swing / boom / stick / bucket sliders set operator targets (the hydraulics decide how fast the
joints actually follow), auto dig cycle, diggable terrain: dig below grade with the bucket
curled to fill it, raise and open to dump. The right-hand panel is the component tree —
click any component to highlight it in the scene.

## Run locally
```
python -m http.server   # open http://localhost:8000
```
