/* main — wires the subsystems together, top level of the model tree:

     Excavator Model
     ├─ Mechanical System   (LowerStructure, UpperStructure, Boom, Stick, BucketAssembly)
     ├─ Hydraulic System    (Pump, ValveBlock, Cylinders, SwingMotor, Regen valve)
     ├─ Operator Commands   (levers + auto dig cycle)
     ├─ Soil Model          (heightfield + repose relaxation)
     └─ Force Analysis      (BOF / TOF per ISO 6015)                                */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MechanicalSystem } from './mechanical/MechanicalSystem.js';
import { HydraulicSystem } from './hydraulic/HydraulicSystem.js';
import { OperatorCommands } from './operator/OperatorCommands.js';
import { SoilModel } from './soil/SoilModel.js';
import { breakoutForce, stickDigForce } from './analysis/ForceAnalysis.js';

// ---------------- scene ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9);
scene.fog = new THREE.Fog(0x87b5d9, 50, 110);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 300);
camera.position.set(13, 9, 14);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(3, 2, 0);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(18, 30, 12);
sun.castShadow = true;
sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
sun.shadow.camera.right = sun.shadow.camera.top = 30;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun, new THREE.AmbientLight(0xbfd4e5, 0.9));

// ---------------- subsystems ----------------
const soil = new SoilModel(scene);
const mech = new MechanicalSystem(scene);
const hyd = new HydraulicSystem();
const state = { swing: 0, boom: 0, stick: 0, bucket: 0 }; // actual joint deltas (deg)
const operator = new OperatorCommands(() => {});
document.getElementById('reset').onclick = () => soil.reset();

// ---------------- component tree (highlight on click) ----------------
const componentMeshes = {
  ...mech.components,
  soil: [soil.mesh],
};
let selected = null;
const saved = new Map();
function highlight(name) {
  for (const [mesh, mat] of saved) mesh.material = mat;
  saved.clear();
  document.querySelectorAll('#tree .comp').forEach(el => el.classList.remove('sel'));
  if (name === selected) { selected = null; return; }
  selected = name;
  for (const key of name.split('+')) {
    for (const mesh of componentMeshes[key] || []) {
      saved.set(mesh, mesh.material);
      const m = mesh.material.clone();
      m.emissive = new THREE.Color(0x2a6bd4);
      m.emissiveIntensity = 0.9;
      mesh.material = m;
    }
  }
  document.querySelectorAll(`#tree .comp[data-c="${name}"]`).forEach(el => el.classList.add('sel'));
}
document.querySelectorAll('#tree .comp').forEach(el => {
  el.addEventListener('click', () => highlight(el.dataset.c));
});

// ---------------- stats ----------------
const $ = id => document.getElementById(id);
const els = {
  bof: $('bof'), tof: $('tof'), flow: $('flow'), load: $('load'), regen: $('regen'),
  fill: $('fill'), moved: $('moved'), tip: $('tip'),
};

// ---------------- loop ----------------
const tip = new THREE.Vector3();
let loadFactor = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const targets = operator.update(dt);              // operator commands
  hyd.update(state, targets, dt, loadFactor);       // hydraulic actuation
  const q = mech.applyPose(state);                  // mechanical system pose

  for (const k in state) $('v-' + k).textContent = Math.round(state[k]) + '°';

  mech.tipWorld(q, tip);                            // soil interaction
  loadFactor = soil.digStep(tip, state.bucket < -35);
  mech.soilLoad.visible = soil.bucketFill > 0.05;
  mech.soilLoad.scale.y = 0.25 + 0.5 * soil.bucketFill;

  els.bof.textContent = (breakoutForce(q) / 1000).toFixed(0) + ' kN';
  els.tof.textContent = (stickDigForce(q) / 1000).toFixed(0) + ' kN';
  els.flow.textContent = Math.round(hyd.status.flowUtil * 100) + '%';
  els.load.textContent = Math.round(loadFactor * 100) + '%';
  els.regen.style.display = hyd.status.regen ? 'inline' : 'none';
  els.fill.textContent = Math.round(soil.bucketFill * 100) + '%';
  els.moved.textContent = soil.movedTotal.toFixed(1) + ' m³';
  els.tip.textContent = tip.y.toFixed(2) + ' m';

  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
