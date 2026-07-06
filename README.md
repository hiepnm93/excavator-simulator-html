# Excavator Simulator (HTML)

Interactive hydraulic excavator simulator in a single HTML file — a browser take on
[Excavator-Simscape](https://github.com/simscape/Excavator-Simscape) and
[excavator_simulator_mujoco](https://github.com/KennyVilella/excavator_simulator_mujoco).

**[▶ Live demo](https://hiepnm93.github.io/excavator-simulator-html/)**

- Swing / boom / stick / bucket sliders (forward kinematics)
- Diggable soil heightfield: dig below ground with the bucket curled to fill it, raise and open to dump
- Automated dig cycle (keyframed)
- Three.js, no build step — open `index.html` or serve statically

## Run locally
```
python -m http.server
# open http://localhost:8000
```
