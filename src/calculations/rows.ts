import type { SimResult, TheoryValues } from '../types';
import { TOPOLOGIES } from '../simulations/topologies';
import { pctError } from '../utils/math';
import { lastCycleRange } from './conduction';

export interface PerfRow {
  key: string;
  label: string;
  unit: string;
  digits: number;
  theory?: number;
  sim?: number;
  /** text shown instead of numbers */
  na?: string;
  /** theory is not available in closed form */
  simOnly?: boolean;
  scale?: number;
  hint?: string;
  err?: number;
}

const NA_TOPO = 'N/A for this topology';

export function buildRows(result: SimResult, th: TheoryValues): PerfRow[] {
  const topo = TOPOLOGIES[result.topology];
  const m = result.metrics;
  const p = result.params;
  const isR = p.loadType === 'R' || p.L_mH <= 0;
  const noOut = Math.abs(m.Vdc) < 1e-6;
  const rows: PerfRow[] = [];
  const add = (r: PerfRow) => {
    if (r.theory !== undefined && r.sim !== undefined && !r.na) {
      r.err = pctError(r.sim * (r.scale ?? 1), r.theory * (r.scale ?? 1));
    }
    rows.push(r);
  };

  add({ key: 'Vdc', label: 'Average output voltage Vdc', unit: 'V', digits: 2, theory: th.Vdc, sim: m.Vdc });
  add({ key: 'Vrms', label: 'RMS output voltage Vrms', unit: 'V', digits: 2, theory: th.Vrms, sim: m.Vrms });
  add({ key: 'Idc', label: 'Average load current Idc', unit: 'A', digits: 3, theory: th.Idc, sim: m.Idc });
  add({ key: 'Irms', label: 'RMS load current Irms', unit: 'A', digits: 3, theory: th.Irms, sim: m.Irms });
  add({
    key: 'FF', label: 'Form factor FF = Vrms/Vdc', unit: '', digits: 4,
    theory: th.formFactor, sim: m.formFactor, na: noOut ? 'N/A (Vdc ≈ 0)' : undefined,
  });
  add({
    key: 'RF', label: 'Ripple factor RF (voltage)', unit: '', digits: 4,
    theory: th.ripple, sim: m.ripple, na: noOut ? 'N/A (Vdc ≈ 0)' : undefined,
    hint: 'RF = √(FF² − 1) = Vac / Vdc',
  });
  add({
    key: 'eta', label: 'Rectification efficiency η', unit: '%', digits: 2, scale: 100,
    theory: th.efficiency, sim: m.efficiency, na: noOut ? 'N/A (Vdc ≈ 0)' : undefined,
    hint: 'η = Vdc·Idc / (Vrms·Irms)',
  });
  add({
    key: 'PIV', label: 'Peak inverse voltage PIV', unit: 'V', digits: 1, theory: th.piv, sim: m.piv,
    hint: 'Theory = design rating. The simulated value is the largest reverse voltage actually seen in this run (idle devices share the supply equally).',
  });
  add({ key: 'fr', label: 'Ripple frequency fr', unit: 'Hz', digits: 1, theory: th.rippleFreq, sim: m.rippleFreq });
  add({
    key: 'PF', label: 'Input power factor PF', unit: '', digits: 4,
    theory: th.pf, sim: m.pf, simOnly: th.pf === undefined, na: Number.isFinite(m.pf) ? undefined : 'N/A (no conduction)',
    hint: isR ? 'R load: PF = Vrms,out / Vs,rms' : 'with L the PF depends on the current shape — measured from the simulated source current',
  });
  add({
    key: 'DF', label: 'Displacement factor DF = cos φ₁', unit: '', digits: 4,
    theory: th.df, sim: m.df, simOnly: th.df === undefined, na: Number.isFinite(m.df) ? undefined : 'N/A (no conduction)',
    hint: 'phase of the fundamental of the source current relative to the source voltage',
  });
  add({
    key: 'THD', label: 'Source-current THD', unit: '%', digits: 1, scale: 100,
    sim: m.thd, simOnly: true, na: Number.isFinite(m.thd) ? undefined : 'N/A (no conduction)',
  });

  const equalDevices = ['hw-diode', 'hw-scr-1ph', 'fw-ct-diode', 'fw-bridge-diode', 'fc-1ph', 'tp-diode', 'fc-3ph', 'hw-scr-3ph', 'hw-diode-3ph'].includes(result.topology);
  const mixed = !equalDevices;
  add({
    key: 'Idev', label: `Average device current (${result.deviceIds[0]})`, unit: 'A', digits: 3, theory: th.idevAvg, sim: m.idevAvg[0],
    simOnly: th.idevAvg === undefined, hint: mixed ? 'Devices carry different currents in this topology — see the per-device table.' : undefined,
  });
  add({
    key: 'IdevR', label: `RMS device current (${result.deviceIds[0]})`, unit: 'A', digits: 3, theory: th.idevRms, sim: m.idevRms[0],
    simOnly: th.idevRms === undefined,
  });
  const fwdPresent = p.fwd && topo.supportsFwd && p.loadType !== 'R' && p.L_mH > 0;
  let fAvg = 0;
  let fRms = 0;
  if (fwdPresent) {
    const [i0, i1] = lastCycleRange(result);
    const f = result.series.iFwd;
    const n = i1 - i0;
    for (let i = i0; i < i1; i++) {
      fAvg += f[i];
      fRms += f[i] * f[i];
    }
    fAvg /= n;
    fRms = Math.sqrt(fRms / n);
  }
  add({ key: 'IfwAvg', label: 'Average FWD current', unit: 'A', digits: 3, sim: fwdPresent ? fAvg : undefined, simOnly: true, na: fwdPresent ? undefined : 'N/A (no external FWD)' });
  add({ key: 'IfwRms', label: 'RMS FWD current', unit: 'A', digits: 3, sim: fwdPresent ? fRms : undefined, simOnly: true, na: fwdPresent ? undefined : 'N/A (no external FWD)' });
  add({
    key: 'alpha', label: 'Firing angle α', unit: '°', digits: 1, sim: topo.controlled ? p.alpha : undefined,
    na: topo.controlled ? undefined : NA_TOPO,
  });
  const singlePulse = topo.pulses <= 2 || result.topology === 'hw-scr-3ph' || result.topology === 'hw-diode-3ph';
  add({
    key: 'beta', label: 'Extinction angle β (device 1)', unit: '°', digits: 1,
    theory: th.extinctionDeg, sim: m.extinctionDeg,
    na: !singlePulse ? NA_TOPO : !Number.isFinite(m.extinctionDeg) ? 'N/A (continuous conduction)' : undefined,
    simOnly: th.extinctionDeg === undefined,
    hint: 'angle at which the device current falls to zero (end of its first conduction interval)',
  });
  add({
    key: 'cond', label: `Conduction angle (${result.deviceIds[0]})`, unit: '°', digits: 1, sim: m.devConductionDeg[0], simOnly: true,
  });
  return rows;
}

export function formatValue(v: number | undefined, digits: number, scale = 1): string {
  if (v === undefined || !Number.isFinite(v)) return '—';
  const x = v * scale;
  if (Math.abs(x) < 1e-9) return (0).toFixed(digits);
  return x.toFixed(digits);
}

export function errClass(e: number | undefined): string {
  if (e === undefined || !Number.isFinite(e)) return '';
  if (e < 0.5) return 'badge-ok';
  if (e < 2) return 'badge-warn';
  return 'badge-bad';
}
