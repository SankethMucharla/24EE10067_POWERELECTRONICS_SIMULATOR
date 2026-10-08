/**
 * Analytic steady-state of the pulse converters feeding an R-L-E load.
 * Independent of the time-domain engine: closed-form exponential/sinusoid solutions are
 * chained segment by segment (bridge conducting / freewheeling / idle) and the periodic
 * starting current of a pulse window is found by bisection.
 *
 *   L di/dt + R i + E = vo     bridge on:  vo = Vp sin(psi)
 *                              freewheel:  vo = 0   (external FWD or built-in path)
 *                              i = 0:      vo = E   (load open-circuit)
 */
import { bisect } from '../utils/math';
import type { PulseModel } from './theory';

export interface Seg {
  kind: 'bridge' | 'fwd' | 'idle';
  s: number;
  z: number;
}

export interface RlePulse {
  segs: Seg[];
  i0: number;
  iEnd: number;
  /** integral of vo and vo^2 over one pulse window (psi domain) */
  Sv: number;
  Sv2: number;
}

interface Ctx {
  /** SCR gate pulse length measured from the start of the window (rad) */
  gateSpan: number;
  m: PulseModel;
  E: number;
  R: number;
  X: number;
  Z: number;
  phi: number;
}

const part = (c: Ctx, psi: number) => (c.m.Vp / c.Z) * Math.sin(psi - c.phi) - c.E / c.R;
const iBridge = (c: Ctx, s: number, is: number, psi: number) =>
  part(c, psi) + (is - part(c, s)) * Math.exp(-((psi - s) * c.R) / c.X);
const iFwd = (c: Ctx, s: number, is: number, psi: number) =>
  -c.E / c.R + (is + c.E / c.R) * Math.exp(-((psi - s) * c.R) / c.X);

function firstZero(f: (x: number) => number, s: number, end: number): number | null {
  if (end <= s) return null;
  const N = 1500;
  let prev = s;
  for (let n = 1; n <= N; n++) {
    const x = s + ((end - s) * n) / N;
    if (f(x) <= 0) return bisect(f, prev, x);
    prev = x;
  }
  return null;
}

const intSin = (a: number, b: number) => Math.cos(a) - Math.cos(b);
const intSin2 = (a: number, b: number) => (b - a) / 2 - (Math.sin(2 * b) - Math.sin(2 * a)) / 4;

function runPulse(c: Ctx, i0: number): RlePulse {
  const { m, E } = c;
  const a = m.a;
  const wEnd = a + m.Delta;
  const e = m.clamp ? Math.min(wEnd, Math.PI) : wEnd;
  const segs: Seg[] = [];
  let psi = a;
  let i = i0;
  let mode: 'bridge' | 'fwd' | 'idle' = i0 > 1e-12 ? 'bridge' : 'idle';
  const asinE = E < m.Vp ? Math.asin(E / m.Vp) : NaN;
  let guard = 0;
  while (psi < wEnd - 1e-12 && guard++ < 12) {
    if (mode === 'bridge') {
      const f = (x: number) => iBridge(c, psi, i, x);
      const z = firstZero(f, psi, e);
      if (z !== null) {
        segs.push({ kind: 'bridge', s: psi, z });
        psi = z;
        i = 0;
        mode = 'idle';
      } else {
        const iE = f(e);
        segs.push({ kind: 'bridge', s: psi, z: e });
        psi = e;
        i = iE;
        if (e >= wEnd - 1e-12) break;
        mode = 'fwd';
      }
    } else if (mode === 'fwd') {
      const f = (x: number) => iFwd(c, psi, i, x);
      const z = firstZero(f, psi, wEnd);
      if (z !== null) {
        segs.push({ kind: 'fwd', s: psi, z });
        psi = z;
        i = 0;
        mode = 'idle';
      } else {
        const iE = f(wEnd);
        segs.push({ kind: 'fwd', s: psi, z: wEnd });
        psi = wEnd;
        i = iE;
      }
    } else {
      // idle: find where the bridge can start (Vp sin > E) inside [psi, e]
      let start = NaN;
      if (Number.isFinite(asinE)) {
        if (m.Vp * Math.sin(psi) > E + 1e-12) start = psi;
        else {
          for (let n = 0; n < 3; n++) {
            const cand = asinE + 2 * Math.PI * n;
            if (cand >= psi - 1e-12) {
              start = cand;
              break;
            }
          }
        }
      }
      if (!Number.isFinite(start) || start >= Math.min(e, a + c.gateSpan) - 1e-12) {
        segs.push({ kind: 'idle', s: psi, z: wEnd });
        psi = wEnd;
        i = 0;
      } else {
        if (start > psi) segs.push({ kind: 'idle', s: psi, z: start });
        psi = start;
        mode = 'bridge';
      }
    }
  }
  let Sv = 0;
  let Sv2 = 0;
  for (const g of segs) {
    if (g.kind === 'bridge') {
      Sv += c.m.Vp * intSin(g.s, g.z);
      Sv2 += c.m.Vp * c.m.Vp * intSin2(g.s, g.z);
    } else if (g.kind === 'idle') {
      Sv += E * (g.z - g.s);
      Sv2 += E * E * (g.z - g.s);
    }
  }
  return { segs, i0, iEnd: i, Sv, Sv2 };
}

export function solveRle(m: PulseModel, E: number, R: number, X: number, gateSpan = Infinity): RlePulse {
  const Xe = Math.max(X, 1e-6 * R);
  const c: Ctx = { gateSpan, m, E, R, X: Xe, Z: Math.hypot(R, Xe), phi: Math.atan2(Xe, R) };
  const r0 = runPulse(c, 0);
  if (r0.iEnd < 1e-10) return r0;
  const g = (x: number) => runPulse(c, x).iEnd - x;
  let hi = m.Vp / R + 1;
  while (g(hi) > 0) hi *= 2;
  const i0 = bisect(g, 0, hi);
  return runPulse(c, i0);
}
