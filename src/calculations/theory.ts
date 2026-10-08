/**
 * Closed-form / analytic predictions for the rectifier topologies.
 * Completely independent of the time-domain engine, so that "Theory vs Simulation" is a real check.
 *
 * All the controlled and uncontrolled converters (without freewheeling path) share the same
 * "pulse model": the output voltage consists of p identical pulses per supply cycle, each one a
 * sinusoidal segment  vo = Vp sin(psi)  starting at psi = a.  If the load current dies out before the
 * next device takes over (discontinuous conduction) the pulse ends at the extinction angle beta,
 * the solution of
 *          sin(beta - phi) = sin(a - phi) * exp( (a - beta) * R / (w L) ),  phi = atan(w L / R)
 * otherwise the pulses join up (continuous conduction) and each one lasts Delta = 2 pi / p.
 * With a freewheeling path (diode / semi-controlled bridge) the pulse is simply clipped at psi = pi.
 */
import type { SimParams, TheoryValues, TopologyId } from '../types';
import { TOPOLOGIES } from '../simulations/topologies';
import { DEG, SQRT2, SQRT3, TWO_PI, bisect } from '../utils/math';
import { solveRle, type Seg } from './rle';

export interface PulseModel {
  p: number;
  Vp: number;
  a: number;
  Delta: number;
  clamp: boolean;
  /** offset: theta = psi - offset (rad) */
  offset: number;
}

export function pulseModel(id: TopologyId, prm: SimParams): PulseModel | null {
  const topo = TOPOLOGIES[id];
  const alpha = topo.controlled ? prm.alpha * DEG : 0;
  const isR = prm.loadType === 'R' || prm.L_mH <= 0;
  const fwd = !!prm.fwd && topo.supportsFwd && !isR;
  const V = prm.vrms;
  switch (id) {
    case 'hw-diode':
      return { p: 1, Vp: SQRT2 * V, a: 0, Delta: TWO_PI, clamp: fwd, offset: 0 };
    case 'hw-scr-1ph':
      return { p: 1, Vp: SQRT2 * V, a: alpha, Delta: TWO_PI, clamp: fwd, offset: 0 };
    case 'fw-ct-diode':
    case 'fw-bridge-diode':
      return { p: 2, Vp: SQRT2 * V, a: 0, Delta: Math.PI, clamp: false, offset: 0 };
    case 'fc-1ph':
      return { p: 2, Vp: SQRT2 * V, a: alpha, Delta: Math.PI, clamp: fwd, offset: 0 };
    case 'sc-1ph':
      return { p: 2, Vp: SQRT2 * V, a: alpha, Delta: Math.PI, clamp: true, offset: 0 };
    case 'tp-diode':
      return { p: 6, Vp: SQRT2 * V, a: Math.PI / 3, Delta: Math.PI / 3, clamp: false, offset: Math.PI / 6 };
    case 'fc-3ph':
      return { p: 6, Vp: SQRT2 * V, a: Math.PI / 3 + alpha, Delta: Math.PI / 3, clamp: fwd, offset: Math.PI / 6 };
    case 'hw-diode-3ph':
      return { p: 3, Vp: (SQRT2 * V) / SQRT3, a: Math.PI / 6, Delta: (2 * Math.PI) / 3, clamp: false, offset: 0 };
    case 'hw-scr-3ph':
      return {
        p: 3,
        Vp: (SQRT2 * V) / SQRT3,
        a: Math.PI / 6 + alpha,
        Delta: (2 * Math.PI) / 3,
        clamp: fwd,
        offset: 0,
      };
    default:
      return null; // sc-3ph handled separately
  }
}

/**
 * First extinction angle after a pulse that starts at psi=a with zero current.
 * Returns dcm=false if the current is still positive when the next pulse begins.
 */
export function findExtinction(
  a: number,
  R: number,
  X: number,
  Delta: number,
): { beta: number; dcm: boolean } {
  const phi = Math.atan2(X, R);
  const k = R / X;
  const g = (b: number) => Math.sin(b - phi) - Math.sin(a - phi) * Math.exp((a - b) * k);
  const N = 4000;
  const end = a + Delta;
  let prevB = a + 1e-6;
  let prevG = g(prevB);
  for (let n = 1; n <= N; n++) {
    const b = a + (Delta * n) / N;
    const gv = g(b);
    if (prevG > 0 && gv <= 0) {
      const beta = bisect(g, prevB, b);
      return { beta, dcm: beta < end - 1e-6 };
    }
    prevB = b;
    prevG = gv;
  }
  return { beta: end, dcm: false };
}

/** rms of the load current from voltage-harmonic synthesis (valid for continuous AND discontinuous operation) */
function irmsFromHarmonics(
  Vp: number,
  a: number,
  e: number,
  p: number,
  Delta: number,
  R: number,
  X: number,
  Idc: number,
  segs?: Seg[],
  E = 0,
): number {
  let s = Idc * Idc;
  const M = 250;
  for (let m = 1; m <= M; m++) {
    const k = m * p;
    let ic: number;
    let is: number;
    if (k === 1) {
      ic = 0.5 * (Math.sin(e) ** 2 - Math.sin(a) ** 2);
      is = 0.5 * (e - a) - 0.25 * (Math.sin(2 * e) - Math.sin(2 * a));
    } else {
      const f = (x: number) => -0.5 * (Math.cos((1 + k) * x) / (1 + k) + Math.cos((1 - k) * x) / (1 - k));
      const h = (x: number) => 0.5 * (Math.sin((1 - k) * x) / (1 - k) - Math.sin((1 + k) * x) / (1 + k));
      ic = f(e) - f(a);
      is = h(e) - h(a);
    }
    let A = ((2 / Delta) * Vp) * ic;
    let B = ((2 / Delta) * Vp) * is;
    if (segs) {
      // R-L-E: drive u = vo - E.  bridge: Vp sin - E ; freewheel: -E ; idle: 0
      A = 0;
      B = 0;
      for (const g of segs) {
        if (g.kind === 'idle') continue;
        if (g.kind === 'bridge') {
          if (k === 1) {
            A += Vp * 0.5 * (Math.sin(g.z) ** 2 - Math.sin(g.s) ** 2);
            B += Vp * (0.5 * (g.z - g.s) - 0.25 * (Math.sin(2 * g.z) - Math.sin(2 * g.s)));
          } else {
            const f = (x: number) => -0.5 * (Math.cos((1 + k) * x) / (1 + k) + Math.cos((1 - k) * x) / (1 - k));
            const h = (x: number) => 0.5 * (Math.sin((1 - k) * x) / (1 - k) - Math.sin((1 + k) * x) / (1 + k));
            A += Vp * (f(g.z) - f(g.s));
            B += Vp * (h(g.z) - h(g.s));
          }
        }
        A -= (E * (Math.sin(k * g.z) - Math.sin(k * g.s))) / k;
        B += (E * (Math.cos(k * g.z) - Math.cos(k * g.s))) / k;
      }
      A *= 2 / Delta;
      B *= 2 / Delta;
    }
    const Z = Math.hypot(R, k * X);
    const Im = Math.hypot(A, B) / Z;
    s += (Im * Im) / 2;
  }
  return Math.sqrt(s);
}

function semi3phIdeal(prm: SimParams): { Vdc: number; Vrms: number } {
  const Vp = (SQRT2 * prm.vrms) / SQRT3;
  const alpha = prm.alpha * DEG;
  const N = 12000;
  let s1 = 0;
  let s2 = 0;
  for (let n = 0; n < N; n++) {
    const th = ((n + 0.5) / N) * TWO_PI;
    const v = [Vp * Math.sin(th), Vp * Math.sin(th - TWO_PI / 3), Vp * Math.sin(th + TWO_PI / 3)];
    let x = (th - (Math.PI / 6 + alpha)) % TWO_PI;
    if (x < 0) x += TWO_PI;
    const k = Math.min(2, Math.floor(x / ((2 * Math.PI) / 3)));
    const vo = v[k] - Math.min(v[0], v[1], v[2]);
    s1 += vo;
    s2 += vo * vo;
  }
  return { Vdc: s1 / N, Vrms: Math.sqrt(s2 / N) };
}

export function computeTheory(id: TopologyId, prm: SimParams): TheoryValues {
  const topo = TOPOLOGIES[id];
  const isR = prm.loadType === 'R' || prm.L_mH <= 0;
  const X = TWO_PI * prm.freq * prm.L_mH * 1e-3;
  const R = prm.R;
  const V = prm.vrms;
  const rle = prm.loadType === 'RLE';
  const Eb = rle ? Math.max(0, prm.E) : 0;
  const out: TheoryValues = { mode: 'n/a', rippleFreq: topo.pulses * prm.freq };

  // ---- PIV ----
  switch (id) {
    case 'hw-diode':
    case 'hw-scr-1ph':
    case 'fw-bridge-diode':
    case 'fc-1ph':
    case 'sc-1ph':
      out.piv = SQRT2 * V;
      break;
    case 'fw-ct-diode':
      out.piv = 2 * SQRT2 * V;
      break;
    default:
      out.piv = SQRT2 * V; // 3-phase: peak line-line voltage
  }

  // single-device half-wave circuits: when i = 0 the cathode sits at E, so the off device sees Vm + E
  if (rle && (id === 'hw-diode' || id === 'hw-scr-1ph')) out.piv = SQRT2 * V + Eb;

  let Vdc: number;
  let Vrms: number;
  let Irms: number | undefined;
  let e = 0;
  let model = pulseModel(id, prm);

  if (id === 'sc-3ph') {
    const r = semi3phIdeal(prm);
    Vdc = r.Vdc;
    Vrms = r.Vrms;
    out.mode = isR ? 'n/a' : 'continuous';
    out.vdcFormula = 'V_{dc}=\\frac{3\\sqrt2\\,V_{LL}}{2\\pi}(1+\\cos\\alpha)';
    // closed form cross-check value kept as the reported theory for Vdc
    Vdc = (3 * SQRT2 * V * (1 + Math.cos(prm.alpha * DEG))) / (2 * Math.PI);
    let sc3Dcm = false;
    if (isR && rle) sc3Dcm = true;
    else if (isR) Irms = Vrms / R;
    else {
      // harmonics of the 3-pulse ideal waveform by numerical Fourier of the analytic vo
      const Np = 6000;
      const Vp = (SQRT2 * V) / SQRT3;
      const alpha = prm.alpha * DEG;
      const volt = (th: number) => {
        const v = [Vp * Math.sin(th), Vp * Math.sin(th - TWO_PI / 3), Vp * Math.sin(th + TWO_PI / 3)];
        let x = (th - (Math.PI / 6 + alpha)) % TWO_PI;
        if (x < 0) x += TWO_PI;
        const k = Math.min(2, Math.floor(x / ((2 * Math.PI) / 3)));
        return v[k] - Math.min(v[0], v[1], v[2]);
      };
      const Idc3 = (Vdc - Eb) / R;
      let s = Idc3 ** 2;
      const harm: { k: number; A: number; B: number }[] = [];
      for (let m = 1; m <= 40; m++) {
        const k = 3 * m;
        let A = 0;
        let B = 0;
        for (let n = 0; n < Np; n++) {
          const th = ((n + 0.5) / Np) * TWO_PI;
          const vv = volt(th);
          A += vv * Math.cos(k * th);
          B += vv * Math.sin(k * th);
        }
        A = (2 * A) / Np;
        B = (2 * B) / Np;
        const Im = Math.hypot(A, B) / Math.hypot(R, k * X);
        s += (Im * Im) / 2;
        harm.push({ k, A, B });
      }
      Irms = Math.sqrt(s);
      if (rle) {
        // continuous-conduction check: synthesise i(theta) from the harmonics, it must stay > 0
        let imin = Infinity;
        for (let n = 0; n < 720; n++) {
          const th = (n / 720) * TWO_PI;
          let iv = Idc3;
          for (const h of harm) {
            const d = R * R + (h.k * X) ** 2;
            iv += (h.A * (R * Math.cos(h.k * th) + h.k * X * Math.sin(h.k * th)) + h.B * (R * Math.sin(h.k * th) - h.k * X * Math.cos(h.k * th))) / d;
          }
          if (iv < imin) imin = iv;
        }
        sc3Dcm = imin <= 0;
      }
    }
    if (sc3Dcm) {
      Vdc = NaN;
      Vrms = NaN;
      Irms = undefined;
      out.mode = 'discontinuous';
      out.vdcFormula = undefined;
      out.note = 'Semi-controlled 3φ bridge with E and discontinuous current: no closed form is used here — the simulation is the reference.';
    }
  } else if (model) {
    const m = model;
    if (rle) {
      const r = solveRle(m, Eb, R, X, topo.controlled && topo.phases === 1 && m.p === 1 ? Math.PI : Infinity);
      const bridge = r.segs.filter((g) => g.kind === 'bridge');
      const idle = r.segs.some((g) => g.kind === 'idle' && g.z - g.s > 1e-9);
      const dcm = idle;
      Vdc = r.Sv / m.Delta;
      Vrms = Math.sqrt(Math.max(r.Sv2 / m.Delta, 0));
      out.mode = X <= 0 ? 'n/a' : dcm ? 'discontinuous' : 'continuous';
      const Idc0 = (Vdc - Eb) / R;
      Irms = bridge.length === 0 ? 0 : irmsFromHarmonics(m.Vp, m.a, m.a + m.Delta, m.p, m.Delta, R, Math.max(X, 1e-6 * R), Idc0, r.segs, Eb);
      const singleDevPulse = topo.pulses <= 2 || id === 'hw-scr-3ph' || id === 'hw-diode-3ph';
      if (singleDevPulse && bridge.length > 0 && (dcm || m.clamp) && id !== 'sc-1ph') {
        out.extinctionDeg = bridge[bridge.length - 1].z / DEG - m.offset / DEG;
      }
      const as = bridge.length ? bridge[0].s : m.a;
      out.vdcFormula = dcm
        ? m.clamp
          ? 'V_{dc}=\\frac{p}{2\\pi}\\left[V_m(\\cos\\alpha_s-\\cos\\pi)+E\\,(\\tfrac{2\\pi}{p}-\\pi+\\alpha_s)\\right]'
          : 'V_{dc}=\\frac{p}{2\\pi}\\left[V_m(\\cos\\alpha_s-\\cos\\beta)+E\\,(\\tfrac{2\\pi}{p}-\\beta+\\alpha_s)\\right]'
        : formulaFor(id, prm, m.clamp, false, false);
      void as;
    } else {
    let none = false;
    let dcm = false;
    if (m.a >= Math.PI - 1e-9) {
      none = true;
      e = m.a;
    } else if (m.clamp) {
      e = Math.min(m.a + m.Delta, Math.PI);
    } else if (isR) {
      e = Math.min(m.a + m.Delta, Math.PI);
      dcm = Math.PI < m.a + m.Delta - 1e-12;
    } else {
      const r = findExtinction(m.a, R, X, m.Delta);
      e = r.dcm ? r.beta : m.a + m.Delta;
      dcm = r.dcm;
    }
    const k = (m.p * m.Vp) / TWO_PI;
    Vdc = none ? 0 : k * (Math.cos(m.a) - Math.cos(e));
    const v2 = none ? 0 : ((m.p * m.Vp * m.Vp) / (4 * Math.PI)) * ((e - m.a) - (Math.sin(2 * e) - Math.sin(2 * m.a)) / 2);
    Vrms = Math.sqrt(Math.max(v2, 0));
    out.mode = isR ? 'n/a' : m.clamp ? 'continuous' : dcm ? 'discontinuous' : 'continuous';
    const singleDevPulse = topo.pulses <= 2 || id === 'hw-scr-3ph' || id === 'hw-diode-3ph';
    if (!none && singleDevPulse) {
      const off = m.offset / DEG;
      if (isR) out.extinctionDeg = e / DEG - off;
      else if (m.clamp) {
        if (id !== 'sc-1ph') out.extinctionDeg = e / DEG;
      } else if (dcm) out.extinctionDeg = e / DEG - off;
    }
    if (none) Irms = 0;
    else if (isR) Irms = Vrms / R;
    else {
      const Idc0 = Vdc / R;
      Irms = irmsFromHarmonics(m.Vp, m.a, e, m.p, m.Delta, R, X, Idc0);
    }
    // Vdc formula label
    out.vdcFormula = formulaFor(id, prm, m.clamp, dcm, isR);
    }
  } else {
    out.mode = 'n/a';
    Vdc = NaN;
    Vrms = NaN;
  }

  out.Vdc = Vdc;
  out.Vrms = Vrms;
  out.Idc = (Vdc - Eb) / R;
  out.Irms = Irms;
  if (Math.abs(Vdc) > 1e-9) {
    out.formFactor = Vrms / Math.abs(Vdc);
    out.ripple = Math.sqrt(Math.max(out.formFactor * out.formFactor - 1, 0));
  }
  if (Irms !== undefined && Irms > 1e-9 && out.Idc !== undefined) {
    out.efficiency = (Vdc * out.Idc) / (Vrms * Irms);
  }

  // device currents (symmetrical topologies, no freewheeling diode)
  const fwdActive = !!prm.fwd && topo.supportsFwd && !isR;
  if (!fwdActive && out.Idc !== undefined && Irms !== undefined) {
    let kdev: number | undefined;
    switch (id) {
      case 'hw-diode':
      case 'hw-scr-1ph':
        kdev = 1;
        break;
      case 'fw-ct-diode':
      case 'fw-bridge-diode':
      case 'fc-1ph':
        kdev = 2;
        break;
      case 'tp-diode':
      case 'fc-3ph':
      case 'hw-scr-3ph':
      case 'hw-diode-3ph':
        kdev = 3;
        break;
    }
    if (kdev) {
      out.idevAvg = out.Idc / kdev;
      out.idevRms = Irms / Math.sqrt(kdev);
    }
  }

  // power factor for resistive load (exact; depends on L otherwise)
  if (isR && !rle && out.Vrms !== undefined) {
    if (topo.phases === 1) out.pf = out.Vrms / V;
    else if (id === 'hw-scr-3ph' || id === 'hw-diode-3ph') out.pf = out.Vrms / V;
    else out.pf = out.Vrms / (SQRT2 * V);
  }
  if (isR && !rle && (id === 'hw-diode' || id === 'fw-ct-diode' || id === 'fw-bridge-diode') ) out.df = 1;
  if (isR && !rle && (id === 'tp-diode' || id === 'hw-diode-3ph')) out.df = 1;

  return out;
}

function formulaFor(id: TopologyId, prm: SimParams, clamp: boolean, dcm: boolean, isR: boolean): string {
  switch (id) {
    case 'hw-diode':
      return clamp || isR ? 'V_{dc}=\\frac{V_m}{\\pi}' : 'V_{dc}=\\frac{V_m}{2\\pi}\\,(1-\\cos\\beta)';
    case 'hw-scr-1ph':
      return clamp || isR
        ? 'V_{dc}=\\frac{V_m}{2\\pi}(1+\\cos\\alpha)'
        : 'V_{dc}=\\frac{V_m}{2\\pi}(\\cos\\alpha-\\cos\\beta)';
    case 'fw-ct-diode':
    case 'fw-bridge-diode':
      return 'V_{dc}=\\frac{2V_m}{\\pi}';
    case 'fc-1ph':
      if (clamp || (isR) || dcm) return clamp || isR ? 'V_{dc}=\\frac{V_m}{\\pi}(1+\\cos\\alpha)' : 'V_{dc}=\\frac{V_m}{\\pi}(\\cos\\alpha-\\cos\\beta)';
      return 'V_{dc}=\\frac{2V_m}{\\pi}\\cos\\alpha';
    case 'sc-1ph':
      return 'V_{dc}=\\frac{V_m}{\\pi}(1+\\cos\\alpha)';
    case 'tp-diode':
      return 'V_{dc}=\\frac{3\\sqrt2\\,V_{LL}}{\\pi}';
    case 'fc-3ph':
      return isR && prm.alpha > 60
        ? 'V_{dc}=\\frac{3\\sqrt2\\,V_{LL}}{\\pi}\\,[1+\\cos(\\alpha+60^\\circ)]'
        : 'V_{dc}=\\frac{3\\sqrt2\\,V_{LL}}{\\pi}\\cos\\alpha';
    case 'hw-diode-3ph':
      return 'V_{dc}=\\frac{3\\sqrt3\\,V_{m,ph}}{2\\pi}=1.17\\,V_{ph}';
    case 'hw-scr-3ph':
      return prm.alpha > 30 && (isR || dcm)
        ? 'V_{dc}=\\frac{3V_{m,ph}}{2\\pi}[1+\\cos(\\alpha+30^\\circ)]'
        : 'V_{dc}=\\frac{3\\sqrt3\\,V_{m,ph}}{2\\pi}\\cos\\alpha';
    default:
      return 'V_{dc}=\\frac{3\\sqrt2\\,V_{LL}}{2\\pi}(1+\\cos\\alpha)';
  }
}
