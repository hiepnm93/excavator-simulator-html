# Excavator Simulator (HTML)

Interactive hydraulic excavator simulator in a single HTML file (Three.js, no build step).

**[▶ Live demo](https://hiepnm93.github.io/excavator-simulator-html/)**

## Engineering model
Built procedurally from published engineering *data* only — no assets copied from other projects:

- **Kinematics**: 12 pin locations (boom/stick/bucket pivots, cylinder mounts, 4-bar bucket
  linkage, cutting edge) from the design table of
  [Excavator-Simscape](https://github.com/simscape/Excavator-Simscape) (MathWorks).
  The bucket linkage node is solved each frame by circle–circle intersection.
- **Breakout force (BOF)**: ISO 6015-style — cylinder force (relief pressure × bore area)
  balanced at the linkage node, torque about the bucket pivot divided by the lever arm
  to the cutting edge. Assumes 34.3 MPa relief, ⌀130 mm bore.
- **Joint limits**: scanned from cylinder geometry (max/min length ratio ≈ 1.56).
- **Soil**: heightfield with angle-of-repose relaxation (0.85 rad, 3 iterations/update),
  following the soil plugin of
  [excavator_simulator_mujoco](https://github.com/KennyVilella/excavator_simulator_mujoco)
  / [soil_dynamics_cpp](https://github.com/KennyVilella/soil_dynamics_cpp).

## Controls
Swing / boom / stick / bucket sliders (deltas from the design pose), auto dig cycle,
diggable terrain: dig below grade with the bucket curled to fill it, raise and open to dump.

## Run locally
```
python -m http.server   # open http://localhost:8000
```
