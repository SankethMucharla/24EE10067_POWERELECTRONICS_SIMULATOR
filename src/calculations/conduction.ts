import type { SimResult } from '../types';
import { TOPOLOGIES } from '../simulations/topologies';

export interface ConductionRow {
  startDeg: number;
  endDeg: number;
  startMs: number;
  endMs: number;
  devices: string[];
  fwd: boolean;
  path: string;
  freewheel: string;
}

const EPS = 1e-6;

/** index range [i0, i1] of the last whole electrical cycle in the series */
export function lastCycleRange(result: SimResult): [number, number] {
  const s = result.series;
  const TWO = 2 * Math.PI;
  const thEnd = s.theta[s.n - 1];
  let cEnd = Math.floor((thEnd + 1e-6) / TWO) * TWO;
  let cStart = cEnd - TWO;
  if (cStart < -1e-9) {
    cStart = 0;
    cEnd = TWO;
  }
  let i0 = 0;
  let i1 = s.n - 1;
  while (i0 < s.n - 1 && s.theta[i0] < cStart - 1e-9) i0++;
  while (i1 > 0 && s.theta[i1] > cEnd + 1e-9) i1--;
  return [i0, Math.max(i0 + 1, i1)];
}

/** Build the conduction table from the last full electrical cycle of the simulated waveforms. */
export function buildConductionTable(result: SimResult): ConductionRow[] {
  const s = result.series;
  const topo = TOPOLOGIES[result.topology];
  const f = result.params.freq;
  const T_ms = 1000 / f;
  const TWO = 2 * Math.PI;
  const thEnd = s.theta[s.n - 1];
  let cEnd = Math.floor((thEnd + 1e-6) / TWO) * TWO;
  let cStart = cEnd - TWO;
  if (cStart < -1e-9) {
    cStart = 0;
    cEnd = TWO;
  }
  const semi = result.topology === 'sc-1ph' || result.topology === 'sc-3ph';
  let vMax = 0;
  for (let i = 0; i < s.n; i++) vMax = Math.max(vMax, Math.abs(s.vo[i]));
  const vTol = Math.max(1e-6, 0.004 * vMax);
  const useFwd = result.params.fwd && topo.supportsFwd && result.params.loadType !== 'R';

  const state = (i: number) => {
    const devs: string[] = [];
    for (let j = 0; j < result.deviceIds.length; j++) if (Math.abs(s.idev[j][i]) > EPS) devs.push(result.deviceIds[j]);
    // semi-converters freewheel through their own devices: vo ~ 0 while the load current still flows
    const natural = semi && s.fwdOn[i] !== 1 && devs.length > 0 && s.io[i] > EPS && Math.abs(s.vo[i]) < vTol;
    return { devs, fwd: s.fwdOn[i] === 1, natural };
  };
  const key = (st: { devs: string[]; fwd: boolean; natural?: boolean }) => st.devs.join('+') + (st.fwd ? '|F' : '') + (st.natural ? '|N' : '');

  const raw: { a: number; b: number; devs: string[]; fwd: boolean; natural?: boolean }[] = [];
  for (let i = 0; i < s.n; i++) {
    const th = s.theta[i];
    if (th < cStart - 1e-9 || th > cEnd + 1e-9) continue;
    const st = state(i);
    const deg = ((th - cStart) * 180) / Math.PI;
    const last = raw[raw.length - 1];
    if (last && key(last) === key(st)) last.b = deg;
    else raw.push({ a: last ? last.b : deg, b: deg, devs: st.devs, fwd: st.fwd, natural: st.natural });
  }
  // absorb sub-0.6° slivers into the neighbouring interval
  const merged: typeof raw = [];
  let carry = -1;
  for (const r of raw) {
    if (r.b - r.a < 0.6) {
      if (merged.length) merged[merged.length - 1].b = r.b;
      else carry = r.a;
    } else {
      merged.push({ ...r, a: carry >= 0 ? carry : r.a });
      carry = -1;
    }
  }
  // join neighbours that became identical
  const out: typeof raw = [];
  for (const r of merged) {
    const l = out[out.length - 1];
    if (l && key(l) === key(r)) l.b = r.b;
    else out.push(r);
  }
  if (out.length) out[out.length - 1].b = 360;

  return out.map((r) => {
    const devs = r.devs;
    let path: string;
    if (r.fwd) path = 'Load ↔ freewheeling diode (source disconnected)';
    else if (devs.length === 0) path = 'No path — load current is zero';
    else if (r.natural) path = `Load ↔ ${devs.join(' + ')} (bridge devices short the load, source supplies no power)`;
    else path = `Source → ${devs.join(' → ')} → load`;
    return {
      startDeg: r.a,
      endDeg: r.b,
      startMs: (r.a / 360) * T_ms,
      endMs: (r.b / 360) * T_ms,
      devices: devs,
      fwd: r.fwd,
      path,
      freewheel: r.fwd ? 'ON' : r.natural ? 'Built-in (natural)' : useFwd ? 'OFF' : '—',
    };
  });
}
