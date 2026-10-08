/**
 * Rectifier simulation engine (no UI dependencies).
 *
 * Model
 * -----
 * Ideal switches (optional constant forward drop Vf), ideal sinusoidal source with zero
 * source impedance (instantaneous commutation), series R-L load, optional freewheeling diode.
 *
 * The converter is described as a "top" commutation group (devices that feed the positive
 * rail P) and an optional "bottom" group (devices connecting the negative rail N back to the
 * source).  The rules, evaluated every time step, are exactly those of the real circuit:
 *
 *  - A conducting device keeps conducting while the load current is > 0.
 *  - Within a group, a device takes over from the conducting one when it is gated AND its
 *    terminal voltage is higher (top group) / lower (bottom group)  -> natural / forced commutation.
 *  - When no current flows (or the freewheeling diode carries it) a (top,bottom) pair starts
 *    when both devices are gated and the voltage across the pair exceeds the device drops.
 *  - The load is solved from  L di/dt + R i = vo(t)  with an exact exponential integrator
 *    (linear interpolation of vo inside a step).  For a pure R load  i = vo / R.
 */
import type { Metrics, SimParams, SimResult, SimSeries, TopologyId } from '../types';
import { TOPOLOGIES, type TopologyDef } from './topologies';
import { DEG, TWO_PI, mod } from '../utils/math';

const EPS = 1e-9;

export interface Snapshot {
  i: number;
  top: number;
  bot: number;
  fwdOn: boolean;
}

export class Stepper {
  readonly topo: TopologyDef;
  readonly Vp: number;
  readonly omega: number;
  readonly R: number;
  readonly L: number;
  readonly vf: number;
  readonly alpha: number;
  readonly width: number;
  readonly fwd: boolean;
  readonly isR: boolean;
  /** back-EMF of an R-L-E load (0 for R and RL) */
  readonly Eb: number;
  readonly nb: boolean;
  readonly drops: number;
  readonly devs;
  readonly topIdx: number[] = [];
  readonly botIdx: number[] = [];

  i = 0;
  top = -1;
  bot = -1;
  fwdOn = false;

  // outputs of the last step() call (sample at the START of the step)
  sTop = -1;
  sBot = -1;
  sFwd = false;
  vo = 0;
  io = 0;
  vFwd = 0;
  vin: number[] = [];
  iin: number[] = [];
  devI: Float64Array;
  devV: Float64Array;
  gate: Float64Array;

  constructor(topo: TopologyDef, p: SimParams) {
    this.topo = topo;
    this.Vp = topo.peakFromVrms(p.vrms);
    this.omega = TWO_PI * p.freq;
    this.R = p.R;
    this.L = p.L_mH * 1e-3;
    this.isR = p.loadType === 'R' || this.L <= 0;
    this.Eb = p.loadType === 'RLE' ? Math.max(0, p.E ?? 0) : 0;
    this.vf = Math.max(0, p.vf);
    this.alpha = topo.controlled ? p.alpha * DEG : 0;
    // with a back-EMF the SCR may have to wait until vo > E: use a long gate pulse (pulse train) so it still fires
    this.width = (this.Eb > 0 && topo.controlled && topo.phases === 1 ? Math.max(topo.gateWidthDeg, 180) : topo.gateWidthDeg) * DEG;
    // semi-converters freewheel through their own diode paths; an added external diode stays idle (ideal, zero-drop paths in parallel)
    this.fwd = !!p.fwd && topo.supportsFwd && !this.isR && topo.id !== 'sc-1ph' && topo.id !== 'sc-3ph';
    this.nb = topo.hasBottom;
    this.drops = this.vf * (this.nb ? 2 : 1);
    this.devs = topo.devices;
    topo.devices.forEach((dv, k) => (dv.group === 'top' ? this.topIdx : this.botIdx).push(k));
    this.devI = new Float64Array(topo.devices.length);
    this.devV = new Float64Array(topo.devices.length);
    this.gate = new Float64Array(topo.devices.length);
  }

  snapshot(): Snapshot {
    return { i: this.i, top: this.top, bot: this.bot, fwdOn: this.fwdOn };
  }
  restore(s: Snapshot) {
    this.i = s.i;
    this.top = s.top;
    this.bot = s.bot;
    this.fwdOn = s.fwdOn;
  }

  private gated(k: number, theta: number): boolean {
    const dv = this.devs[k];
    if (dv.kind === 'diode') return true;
    const start = dv.natDeg * DEG + this.alpha;
    // tiny offset so that a gate window opening exactly on a grid point is not missed through round-off
    return mod(theta - start + 1e-9, TWO_PI) < this.width;
  }

  /** Sample the circuit at electrical angle `theta` and advance the load current by `dth`. */
  step(theta: number, dth: number): void {
    const { topo, devs, nb, Vp, drops, vf } = this;
    const tv = topo.termV(theta, Vp);

    // ---------- 1. conduction decisions ----------
    let on = this.top >= 0;
    if (on) {
      // top-group commutation
      let curV = tv[devs[this.top].terminal];
      let best = -1;
      let bestV = curV + EPS;
      for (const j of this.topIdx) {
        if (j === this.top) continue;
        const v = tv[devs[j].terminal];
        if (v > bestV && this.gated(j, theta)) {
          best = j;
          bestV = v;
        }
      }
      if (best >= 0) this.top = best;
      if (nb) {
        curV = tv[devs[this.bot].terminal];
        best = -1;
        bestV = curV - EPS;
        for (const j of this.botIdx) {
          if (j === this.bot) continue;
          const v = tv[devs[j].terminal];
          if (v < bestV && this.gated(j, theta)) {
            best = j;
            bestV = v;
          }
        }
        if (best >= 0) this.bot = best;
      }
    } else {
      // idle (i = 0) or freewheeling: look for a (top,bottom) pair that can start
      let bk = -1;
      let bm = -1;
      // a freewheeling load sits at ~0 V so the bridge takes over once it is forward biased; an idle load sits at E
      let bd = drops + (this.fwd && this.i > 0 ? 0 : this.Eb) + EPS;
      for (const k of this.topIdx) {
        if (!this.gated(k, theta)) continue;
        const vk = tv[devs[k].terminal];
        if (nb) {
          for (const m of this.botIdx) {
            if (!this.gated(m, theta)) continue;
            const dd = vk - tv[devs[m].terminal];
            if (dd > bd) {
              bd = dd;
              bk = k;
              bm = m;
            }
          }
        } else if (vk > bd) {
          bd = vk;
          bk = k;
        }
      }
      if (bk >= 0) {
        this.top = bk;
        this.bot = bm;
        on = true;
      }
    }

    // ---------- 2. output voltage / state ----------
    let vo = 0;
    let fwdOn = false;
    if (on) {
      vo = tv[devs[this.top].terminal] - (nb ? tv[devs[this.bot].terminal] : 0) - drops;
      if (this.isR) {
        if (vo - this.Eb <= EPS) {
          this.top = -1;
          this.bot = -1;
          on = false;
          vo = this.Eb;
        }
      } else if (this.fwd && vo < 0) {
        // freewheeling diode takes the load current away from the bridge
        this.top = -1;
        this.bot = -1;
        on = false;
        fwdOn = true;
        vo = -vf;
      }
    }
    if (!on && !fwdOn) {
      if (!this.isR && this.fwd && this.i > 0) {
        fwdOn = true;
        vo = -vf;
      } else {
        vo = this.Eb; // load open-circuit: terminal sits at the back-EMF
      }
    }
    this.fwdOn = fwdOn;

    // ---------- 3. load current ----------
    let i: number;
    if (this.isR) {
      i = on ? (vo - this.Eb) / this.R : 0;
      this.i = i;
    } else {
      i = this.i;
    }

    // ---------- 4. sample outputs ----------
    this.sTop = on ? this.top : -1;
    this.sBot = on && nb ? this.bot : -1;
    this.sFwd = fwdOn;
    this.vo = vo;
    this.io = i;
    this.vFwd = -vo;
    this.vin = topo.phaseV(theta, Vp);
    const nDev = devs.length;
    const devI = this.devI;
    const devV = this.devV;
    for (let k = 0; k < nDev; k++) {
      devI[k] = 0;
      this.gate[k] = devs[k].kind === 'scr' && this.gated(k, theta) ? 1 : 0;
    }
    if (this.sTop >= 0) devI[this.sTop] = i;
    if (this.sBot >= 0) devI[this.sBot] = i;
    let vP = 0;
    let vN = 0;
    if (on) {
      vP = tv[devs[this.top].terminal] - vf;
      vN = nb ? tv[devs[this.bot].terminal] + vf : 0;
    } else if (fwdOn) {
      vP = -vf;
    } else if (nb) {
      vP = this.Eb / 2;
      vN = -this.Eb / 2;
    } else {
      vP = this.Eb;
    }
    for (let k = 0; k < nDev; k++) {
      const dv = devs[k];
      devV[k] = dv.group === 'top' ? tv[dv.terminal] - vP : vN - tv[dv.terminal];
    }
    const termI = new Array<number>(topo.nTerm).fill(0);
    if (this.sTop >= 0) termI[devs[this.sTop].terminal] += i;
    if (this.sBot >= 0) termI[devs[this.sBot].terminal] -= i;
    this.iin = topo.phaseI(termI);

    // ---------- 5. advance RL current ----------
    if (!this.isR) {
      const h = dth / this.omega;
      const tvn = topo.termV(theta + dth, Vp);
      let von = 0;
      if (on) {
        von = tvn[devs[this.top].terminal] - (nb ? tvn[devs[this.bot].terminal] : 0) - drops;
      } else if (fwdOn) {
        von = -vf;
      }
      const lam = this.R / this.L;
      const x = lam * h;
      const Ex = Math.exp(-x);
      const frac = x < 1e-9 ? 1 - x / 2 : -Math.expm1(-x) / x; // (1-E)/x
      const Eb = this.Eb;
      let inext = this.i * Ex + ((vo - Eb) * (1 - Ex) + (von - vo) * (1 - frac)) / this.R;
      if (on || fwdOn) {
        if (inext <= 1e-12) {
          inext = 0;
          this.top = -1;
          this.bot = -1;
        }
      } else inext = 0;
      this.i = inext;
    }
  }
}

// ---------------------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------------------

function allocSeries(topo: TopologyDef, n: number): SimSeries {
  const nDev = topo.devices.length;
  const nPh = topo.phases === 3 ? 3 : 1;
  const mk = () => new Float64Array(n);
  return {
    n,
    t_ms: mk(),
    theta: mk(),
    vin: Array.from({ length: nPh }, mk),
    vo: mk(),
    io: mk(),
    iFwd: mk(),
    vFwd: mk(),
    iin: Array.from({ length: nPh }, mk),
    idev: Array.from({ length: nDev }, mk),
    vdev: Array.from({ length: nDev }, mk),
    gate: Array.from({ length: nDev }, mk),
    top: new Int8Array(n),
    bot: new Int8Array(n),
    fwdOn: new Uint8Array(n),
  };
}

export function record(
  st: Stepper,
  theta0: number,
  nSteps: number,
  dth: number,
  freq: number,
): SimSeries {
  const s = allocSeries(st.topo, nSteps);
  const nDev = st.topo.devices.length;
  const nPh = s.vin.length;
  for (let n = 0; n < nSteps; n++) {
    const theta = theta0 + n * dth;
    st.step(theta, dth);
    s.theta[n] = theta;
    s.t_ms[n] = (theta / (TWO_PI * freq)) * 1000;
    for (let k = 0; k < nPh; k++) {
      s.vin[k][n] = st.vin[k];
      s.iin[k][n] = st.iin[k];
    }
    s.vo[n] = st.vo;
    s.io[n] = st.io;
    s.iFwd[n] = st.sFwd ? st.io : 0;
    s.vFwd[n] = st.vFwd;
    for (let k = 0; k < nDev; k++) {
      s.idev[k][n] = st.devI[k];
      s.vdev[k][n] = st.devV[k];
      s.gate[k][n] = st.gate[k];
    }
    s.top[n] = st.sTop;
    s.bot[n] = st.sBot;
    s.fwdOn[n] = st.sFwd ? 1 : 0;
  }
  return s;
}

/** Run complete cycles until the periodic steady state is reached. */
export function runToSteadyState(
  st: Stepper,
  S: number,
  maxCycles = 4000,
): { cycles: number; converged: boolean } {
  const dth = TWO_PI / S;
  const tol = 1e-7 * Math.max(1, st.Vp / Math.max(st.R, 1e-9));
  let hist: number[] = [];
  for (let c = 0; c < maxCycles; c++) {
    const x0 = st.i;
    hist.push(x0);
    for (let n = 0; n < S; n++) st.step(n * dth, dth);
    const x1 = st.i;
    if (Math.abs(x1 - x0) < tol && c >= 1) return { cycles: c + 1, converged: true };
    // Aitken acceleration for the (geometric) approach to the fixed point
    if (hist.length >= 2 && (st.top >= 0 || st.fwdOn)) {
      const a = hist[hist.length - 2];
      const b = x0;
      const cc = x1;
      const d1 = b - a;
      const d2 = cc - b;
      if (Math.abs(d1) > tol && d2 / d1 > 0 && d2 / d1 < 0.9999) {
        const r = d2 / d1;
        const xs = cc + (d2 * r) / (1 - r);
        if (xs > 0 && Number.isFinite(xs)) {
          st.i = xs;
          hist = [];
        }
      }
    }
  }
  return { cycles: maxCycles, converged: false };
}

// ---------------------------------------------------------------------------------------
// Metrics (one steady-state cycle, uniform in theta)
// ---------------------------------------------------------------------------------------

export function computeMetrics(
  topo: TopologyDef,
  p: SimParams,
  s: SimSeries,
  cyclesToSteady: number,
): Metrics {
  const N = s.n;
  const nDev = topo.devices.length;
  const mean = (a: Float64Array) => {
    let t = 0;
    for (let k = 0; k < N; k++) t += a[k];
    return t / N;
  };
  const rms = (a: Float64Array) => {
    let t = 0;
    for (let k = 0; k < N; k++) t += a[k] * a[k];
    return Math.sqrt(t / N);
  };
  const Vdc = mean(s.vo);
  const Vrms = rms(s.vo);
  const Idc = mean(s.io);
  const Irms = rms(s.io);
  const formFactor = Math.abs(Vdc) > 1e-9 ? Vrms / Math.abs(Vdc) : NaN;
  const ripple = Number.isFinite(formFactor) ? Math.sqrt(Math.max(formFactor * formFactor - 1, 0)) : NaN;
  const currentRipple =
    Math.abs(Idc) > 1e-9 ? Math.sqrt(Math.max(Irms * Irms - Idc * Idc, 0)) / Math.abs(Idc) : NaN;
  const Pdc = Vdc * Idc;
  const Pac = Vrms * Irms;
  const efficiency = Pac > 1e-9 ? Pdc / Pac : NaN;

  // PIV: largest reverse voltage across any device
  let piv = 0;
  for (let k = 0; k < nDev; k++) {
    const v = s.vdev[k];
    for (let n = 0; n < N; n++) if (-v[n] > piv) piv = -v[n];
  }

  // input side
  const nPh = s.vin.length;
  let Pin = 0;
  let Sin = 0;
  for (let k = 0; k < nPh; k++) {
    let pk = 0;
    for (let n = 0; n < N; n++) pk += s.vin[k][n] * s.iin[k][n];
    Pin += pk / N;
    Sin += rms(s.vin[k]) * rms(s.iin[k]);
  }
  const pf = Sin > 1e-9 ? Pin / Sin : NaN;
  // fundamental of source current in phase 0 (source voltage ~ sin(theta))
  let a1 = 0;
  let b1 = 0;
  for (let n = 0; n < N; n++) {
    a1 += s.iin[0][n] * Math.cos(s.theta[n]);
    b1 += s.iin[0][n] * Math.sin(s.theta[n]);
  }
  a1 = (2 * a1) / N;
  b1 = (2 * b1) / N;
  const c1 = Math.hypot(a1, b1);
  const I1rms = c1 / Math.SQRT2;
  const isRms = rms(s.iin[0]);
  const df = c1 > 1e-9 ? b1 / c1 : NaN;
  const thd = I1rms > 1e-9 ? Math.sqrt(Math.max(isRms * isRms - I1rms * I1rms, 0)) / I1rms : NaN;

  const distFactor = isRms > 1e-9 ? I1rms / isRms : NaN;
  const dft = (a: Float64Array, K: number) => {
    const out: number[] = [];
    for (let k = 1; k <= K; k++) {
      let c = 0;
      let sn = 0;
      for (let n = 0; n < N; n++) {
        c += a[n] * Math.cos(k * s.theta[n]);
        sn += a[n] * Math.sin(k * s.theta[n]);
      }
      out.push(Math.hypot((2 * c) / N, (2 * sn) / N) / Math.SQRT2);
    }
    return out;
  };
  const harmI = dft(s.iin[0], 50);
  const harmVo = dft(s.vo, 50);
  const harmVs = dft(s.vin[0], 50);
  const vs1 = harmVs[0];
  const vsRms = rms(s.vin[0]);
  const thdV = vs1 > 1e-9 ? Math.sqrt(Math.max(vsRms * vsRms - vs1 * vs1, 0)) / vs1 : NaN;

  const idevAvg: number[] = [];
  const idevRms: number[] = [];
  const devConductionDeg: number[] = [];
  const devStartDeg: number[] = [];
  const devEndDeg: number[] = [];
  for (let k = 0; k < nDev; k++) {
    idevAvg.push(mean(s.idev[k]));
    idevRms.push(rms(s.idev[k]));
    const cond = (n: number) => (s.top[n] === k || s.bot[n] === k ? 1 : 0);
    let cnt = 0;
    for (let n = 0; n < N; n++) cnt += cond(n);
    devConductionDeg.push((cnt / N) * 360);
    let st = NaN;
    let en = NaN;
    if (cnt > 0 && cnt < N) {
      for (let n = 0; n < N; n++) {
        const prev = cond((n - 1 + N) % N);
        if (cond(n) && !prev) {
          st = (n / N) * 360;
          break;
        }
      }
      for (let n = 0; n < N; n++) {
        const next = cond((n + 1) % N);
        if (cond(n) && !next) {
          en = ((n + 1) / N) * 360;
          break;
        }
      }
    }
    devStartDeg.push(st);
    devEndDeg.push(en);
  }

  let iMin = Infinity;
  let iMax = -Infinity;
  for (let n = 0; n < N; n++) {
    if (s.io[n] < iMin) iMin = s.io[n];
    if (s.io[n] > iMax) iMax = s.io[n];
  }
  let mode: Metrics['mode'] = 'n/a';
  if (p.loadType !== 'R' && p.L_mH > 0) {
    mode = iMin > 1e-3 * Math.max(iMax, 1e-9) ? 'continuous' : 'discontinuous';
  }

  return {
    Vdc,
    Vrms,
    Idc,
    Irms,
    formFactor,
    ripple,
    currentRipple,
    efficiency,
    Pdc,
    Pac,
    piv,
    rippleFreq: topo.pulses * p.freq,
    pf,
    df,
    thd,
    distFactor,
    thdV,
    harmI,
    harmVo,
    isRms,
    idevAvg,
    idevRms,
    devConductionDeg,
    devStartDeg,
    devEndDeg,
    alphaDeg: topo.controlled ? p.alpha : 0,
    extinctionDeg: devEndDeg[0],
    iMin,
    mode,
    cyclesToSteady,
  };
}

// ---------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------

export const METRIC_STEPS_PER_CYCLE = 7200; // 0.05 degree resolution

export function simulateTopology(id: TopologyId, p: SimParams): SimResult {
  const topo = TOPOLOGIES[id];
  const S = METRIC_STEPS_PER_CYCLE;

  // 1) steady state + one metrics cycle
  const st = new Stepper(topo, p);
  const { cycles } = runToSteadyState(st, S);
  const snap = st.snapshot();
  const cyc = record(st, 0, S, TWO_PI / S, p.freq);
  const metrics = computeMetrics(topo, p, cyc, cycles);

  // 2) displayed time window
  const nCyc = (p.tSim_ms / 1000) * p.freq;
  // display resolution: choose a grid on which whole degrees (and 30 deg multiples) lie exactly
  const Sd = [1800, 720, 360, 180, 120].find((c) => c * nCyc <= 32000) ?? 120;
  const nSteps = Math.max(2, Math.round(nCyc * Sd));
  const dth = TWO_PI / Sd;
  const st2 = new Stepper(topo, p);
  if (!p.startFromRest) st2.restore(snap);
  const series = record(st2, 0, nSteps, dth, p.freq);

  return {
    topology: id,
    params: p,
    series,
    metrics,
    deviceIds: topo.devices.map((d) => d.id),
    deviceKinds: topo.devices.map((d) => d.kind),
  };
}
