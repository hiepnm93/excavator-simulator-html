/* OperatorCommands — operator input: manual lever targets from the sliders
   plus the keyframed auto dig cycle (≈ ValveCmdLib.slx / the test-scenario
   command signals in Excavator-Simscape). Produces joint *targets*; the
   HydraulicSystem decides how fast the joints can actually follow. */
import { LIMITS } from '../mechanical/LinkageKinematics.js';

const deg = r => Math.round(r * 180 / Math.PI);

// [t, swing, boom, stick, bucket] (deg deltas from design pose)
const CYCLE = [
  [0.00,  0,   5,  10,  15],
  [0.15,  0, -24,  -5,   0],
  [0.33,  0, -20, -45, -75],   // curl through the soil
  [0.48,  0,  18, -55, -95],   // lift full bucket
  [0.66, 82,  22, -50, -95],   // slew to spoil pile
  [0.80, 82,  18, -30,  30],   // open bucket = dump
  [1.00,  0,   5,  10,  15],
];
const CYCLE_PERIOD = 18; // s

export class OperatorCommands {
  constructor(onManualInput) {
    this.targets = { swing: 0, boom: 0, stick: 0, bucket: 0 };
    this.autoCycle = false;
    this.cycleT = 0;
    this.sliders = {};
    for (const k of Object.keys(this.targets)) {
      const s = document.getElementById(k);
      this.sliders[k] = s;
      s.addEventListener('input', () => {
        this.targets[k] = +s.value;
        this.stopCycle();
        if (onManualInput) onManualInput();
      });
    }
    // slider ranges from the linkage joint limits
    for (const k of ['boom', 'stick', 'bucket']) {
      this.sliders[k].min = deg(LIMITS[k][0]);
      this.sliders[k].max = deg(LIMITS[k][1]);
    }
    this.btn = document.getElementById('digcycle');
    this.btn.onclick = () => {
      this.autoCycle = !this.autoCycle;
      this.cycleT = 0;
      this.btn.textContent = this.autoCycle ? '⏸ Stop Cycle' : '▶ Auto Dig Cycle';
    };
  }

  stopCycle() {
    this.autoCycle = false;
    this.btn.textContent = '▶ Auto Dig Cycle';
  }

  update(dt) {
    if (!this.autoCycle) return this.targets;
    this.cycleT = (this.cycleT + dt / CYCLE_PERIOD) % 1;
    let i = 0;
    while (i < CYCLE.length - 2 && CYCLE[i + 1][0] <= this.cycleT) i++;
    const [t0, ...a] = CYCLE[i], [t1, ...b] = CYCLE[i + 1];
    const f = (this.cycleT - t0) / (t1 - t0);
    ['swing', 'boom', 'stick', 'bucket'].forEach((k, j) => {
      let v = a[j] + (b[j] - a[j]) * f;
      v = Math.max(+this.sliders[k].min, Math.min(+this.sliders[k].max, v));
      this.targets[k] = v;
      this.sliders[k].value = v;
    });
    return this.targets;
  }
}
