/**
 * Engine verification: simulated steady-state metrics vs independent analytic theory.
 * Run with:  npm test
 */
import { simulateTopology } from '../src/simulations/engine';
import { computeTheory } from '../src/calculations/theory';
import { TOPOLOGY_LIST, TOPOLOGIES } from '../src/simulations/topologies';
import type { SimParams, TopologyId } from '../src/types';
import { SQRT2, SQRT3, DEG } from '../src/utils/math';

const base: SimParams = {
  vrms: 230, freq: 50, loadType: 'R', R: 10, L_mH: 20, E: 0, alpha: 0, vf: 0,
  tSim_ms: 100, fwd: false, startFromRest: false,
};

let fails = 0;
let checks = 0;
const worst: { label: string; err: number }[] = [];

function check(label: string, sim: number | undefined, th: number | undefined, tolRel: number, scale: number) {
  if (th === undefined || sim === undefined || Number.isNaN(th)) return;
  checks++;
  const err = Math.abs(sim - th);
  const tol = tolRel * Math.max(Math.abs(th), scale);
  worst.push({ label, err: err / Math.max(Math.abs(th), scale) });
  if (!(err <= tol)) {
    fails++;
    console.log(`  FAIL ${label}: sim=${sim.toFixed(4)} theory=${th.toFixed(4)} err=${((err / Math.max(Math.abs(th), scale)) * 100).toFixed(3)}%`);
  }
}

function compare(id: TopologyId, p: SimParams, tag: string) {
  const topo = TOPOLOGIES[id];
  const pk = id === 'fw-ct-diode' ? SQRT2 * p.vrms : SQRT2 * p.vrms; // reference peak
  const r = simulateTopology(id, p);
  const th = computeTheory(id, p);
  const m = r.metrics;
  const label = `${id} ${p.loadType}${p.loadType === 'RL' ? `(R=${p.R},L=${p.L_mH})` : `(R=${p.R})`}${topo.controlled ? ` a=${p.alpha}` : ''}${p.fwd ? ' FWD' : ''}`;
  const Vscale = 0.05 * pk;
  const Iscale = Vscale / p.R;
  const t = 0.006; // 0.6 %
  check(label + ' Vdc', m.Vdc, th.Vdc, t, Vscale);
  check(label + ' Vrms', m.Vrms, th.Vrms, t, Vscale);
  check(label + ' Idc', m.Idc, th.Idc, t, Iscale);
  check(label + ' Irms', m.Irms, th.Irms, t, Iscale);
  // PIV is the design rating: skip where the device physically conducts through the negative peak (long RL conduction)
  const conductsThroughPeak = topo.pulses === 1 && m.devConductionDeg[0] > 190;
  if (p.loadType === 'RLE' && topo.pulses === 1) {
    // Vm + E is a rating: reached only if the current is zero at the negative peak, never exceeded
    checks++;
    if (m.piv > th.piv! * 1.004) { fails++; console.log(`  FAIL ${label} PIV exceeds rating: ${m.piv.toFixed(2)} > ${th.piv!.toFixed(2)}`); }
  } else if ((!topo.controlled || p.alpha <= 90) && !conductsThroughPeak) check(label + ' PIV', m.piv, th.piv, 0.004, Vscale);
  check(label + ' rippleF', m.rippleFreq, th.rippleFreq, 1e-9, 1);
  check(label + ' Idev avg', m.idevAvg[0], th.idevAvg, t, Iscale);
  check(label + ' Idev rms', m.idevRms[0], th.idevRms, t, Iscale);
  if (Number.isFinite(m.pf)) check(label + ' PF', m.pf, th.pf, 0.01, 0.01);
  if (th.extinctionDeg !== undefined && Number.isFinite(m.extinctionDeg)) check(label + ' beta', m.extinctionDeg, th.extinctionDeg, 0.01, 1);
  if (th.mode !== 'n/a' && p.loadType === 'RL' && !(p.alpha > 90)) {
    checks++;
    if (th.mode !== m.mode && !p.fwd && id !== 'sc-1ph' && id !== 'sc-3ph') {
      // allow the sim classifier to call "continuous" currents that touch zero "discontinuous" when ripple is huge
      console.log(`  NOTE ${label}: mode theory=${th.mode} sim=${m.mode}`);
    }
  }
  return { r, th };
}

console.log('=== 1. Textbook closed forms (independent of the engine) ===');
{
  const Vm = SQRT2 * 230;
  const t = (name: string, v: number | undefined, ref: number, tol = 1e-9) => {
    checks++;
    if (v === undefined || Math.abs(v - ref) > tol * Math.max(1, Math.abs(ref))) { fails++; console.log(`  FAIL ${name}: theory=${v} textbook=${ref}`); }
  };
  t('hw-diode R Vdc', computeTheory('hw-diode', base).Vdc, Vm / Math.PI);
  t('hw-diode R Vrms', computeTheory('hw-diode', base).Vrms, Vm / 2);
  t('ct R Vdc', computeTheory('fw-ct-diode', base).Vdc, (2 * Vm) / Math.PI);
  t('bridge R Vrms', computeTheory('fw-bridge-diode', base).Vrms, Vm / SQRT2);
  const a = 40; const ar = a * DEG;
  t('hw-scr R Vdc', computeTheory('hw-scr-1ph', { ...base, alpha: a }).Vdc, (Vm / (2 * Math.PI)) * (1 + Math.cos(ar)));
  t('fc-1ph R Vdc', computeTheory('fc-1ph', { ...base, alpha: a }).Vdc, (Vm / Math.PI) * (1 + Math.cos(ar)));
  t('fc-1ph R Vrms', computeTheory('fc-1ph', { ...base, alpha: a }).Vrms, Vm * Math.sqrt((Math.PI - ar) / (2 * Math.PI) + Math.sin(2 * ar) / (4 * Math.PI)));
  t('fc-1ph RL(large L) Vdc', computeTheory('fc-1ph', { ...base, loadType: 'RL', L_mH: 2000, alpha: a }).Vdc, (2 * Vm / Math.PI) * Math.cos(ar), 1e-6);
  t('sc-1ph Vdc', computeTheory('sc-1ph', { ...base, alpha: a, loadType: 'RL' }).Vdc, (Vm / Math.PI) * (1 + Math.cos(ar)));
  const VLL = 400;
  t('tp-diode Vdc', computeTheory('tp-diode', { ...base, vrms: VLL }).Vdc, (3 * SQRT2 * VLL) / Math.PI);
  t('tp-diode Vrms', computeTheory('tp-diode', { ...base, vrms: VLL }).Vrms, SQRT2 * VLL * Math.sqrt(0.5 + (3 * SQRT3) / (4 * Math.PI)));
  t('fc-3ph RL(large L) Vdc', computeTheory('fc-3ph', { ...base, vrms: VLL, loadType: 'RL', L_mH: 2000, alpha: 45 }).Vdc, ((3 * SQRT2 * VLL) / Math.PI) * Math.cos(45 * DEG), 1e-6);
  t('fc-3ph R a=90 Vdc', computeTheory('fc-3ph', { ...base, vrms: VLL, alpha: 90 }).Vdc, ((3 * SQRT2 * VLL) / Math.PI) * (1 + Math.cos(150 * DEG)), 1e-9);
  const Vmph = (SQRT2 * VLL) / SQRT3;
  t('hw-diode-3ph Vdc', computeTheory('hw-diode-3ph', { ...base, vrms: VLL }).Vdc, ((3 * SQRT3) / (2 * Math.PI)) * Vmph, 1e-9);
  t('hw-diode-3ph Vrms', computeTheory('hw-diode-3ph', { ...base, vrms: VLL }).Vrms, Vmph * Math.sqrt(0.5 + (3 * SQRT3) / (8 * Math.PI)), 1e-9);
  t('hw-scr-3ph CCM Vdc', computeTheory('hw-scr-3ph', { ...base, vrms: VLL, loadType: 'RL', L_mH: 2000, alpha: 20 }).Vdc, ((3 * SQRT3) / (2 * Math.PI)) * Vmph * Math.cos(20 * DEG), 1e-6);
  t('hw-scr-3ph R a=60 Vdc', computeTheory('hw-scr-3ph', { ...base, vrms: VLL, alpha: 60 }).Vdc, ((3 * Vmph) / (2 * Math.PI)) * (1 + Math.cos(90 * DEG)), 1e-9);
  t('sc-3ph Vdc', computeTheory('sc-3ph', { ...base, vrms: VLL, alpha: 75 }).Vdc, ((3 * SQRT2 * VLL) / (2 * Math.PI)) * (1 + Math.cos(75 * DEG)), 1e-9);
}

console.log('\n=== 2. Simulation vs theory matrix ===');
const loads: { R: number; L: number }[] = [
  { R: 10, L: 20 }, { R: 5, L: 50 }, { R: 50, L: 5 }, { R: 10, L: 500 }, { R: 2, L: 1 },
];
const t0 = performance.now();
for (const topo of TOPOLOGY_LIST) {
  const vr = topo.vrmsDefault;
  const alphas = topo.controlled ? [0, 15, 30, 45, 60, 75, 90, 120, 150, 170] : [0];
  for (const alpha of alphas) {
    compare(topo.id, { ...base, vrms: vr, alpha, loadType: 'R', R: 10 }, 'R');
    compare(topo.id, { ...base, vrms: vr, alpha, loadType: 'R', R: 47 }, 'R');
    for (const ld of loads) compare(topo.id, { ...base, vrms: vr, alpha, loadType: 'RL', R: ld.R, L_mH: ld.L }, 'RL');
  }
  // other frequency
  compare(topo.id, { ...base, vrms: vr, freq: 60, alpha: topo.controlled ? 40 : 0, loadType: 'RL', R: 8, L_mH: 30 }, 'f60');
}
console.log('\n=== 3. Freewheeling diode ===');
for (const id of ['hw-diode', 'hw-scr-1ph', 'fc-1ph', 'hw-scr-3ph', 'fc-3ph'] as TopologyId[]) {
  const topo = TOPOLOGIES[id];
  const vr = topo.vrmsDefault;
  for (const alpha of topo.controlled ? [0, 30, 60, 90, 120] : [0])
    for (const ld of [{ R: 10, L: 20 }, { R: 10, L: 200 }, { R: 3, L: 5 }])
      compare(id, { ...base, vrms: vr, alpha, loadType: 'RL', R: ld.R, L_mH: ld.L, fwd: true }, 'FWD');
}
console.log(`(${(performance.now() - t0).toFixed(0)} ms)`);

console.log('\n=== 3b. R-L-E load (back-EMF) ===');
for (const topo of TOPOLOGY_LIST) {
  const vr = topo.vrmsDefault;
  const alphas = topo.controlled ? [0, 30, 60, 90, 120] : [0];
  for (const alpha of alphas)
    for (const E of [20, 100, 180])
      for (const ld of [{ R: 10, L: 20 }, { R: 5, L: 100 }, { R: 20, L: 2 }])
        for (const fwd of [false, true])
          compare(topo.id, { ...base, vrms: vr, alpha, loadType: 'RLE', E, R: ld.R, L_mH: ld.L, fwd }, `RLE E=${E}${fwd ? ' FWD' : ''}`);
}

console.log('\n=== 3c. Power quality identities ===');
for (const topo of TOPOLOGY_LIST) {
  for (const alpha of topo.controlled ? [0, 30, 60] : [0]) {
    for (const ld of [{ lt: 'R' as const, L: 0 }, { lt: 'RL' as const, L: 50 }, { lt: 'RLE' as const, L: 50 }]) {
      const r = simulateTopology(topo.id, { ...base, vrms: topo.vrmsDefault, alpha, loadType: ld.lt, L_mH: ld.L, E: 50, fwd: false });
      const m = r.metrics;
      if (!Number.isFinite(m.pf)) continue;
      checks++;
      const lab = `${topo.id} ${ld.lt} a=${alpha}`;
      if (Math.abs(m.pf - m.df * m.distFactor) > 2e-3) { fails++; console.log(`  FAIL ${lab} PF=${m.pf} vs DF*dist=${m.df * m.distFactor}`); }
      checks++;
      if (Math.abs(m.thd - Math.sqrt(1 / m.distFactor ** 2 - 1)) > 2e-3) { fails++; console.log(`  FAIL ${lab} THD identity`); }
      checks++;
      if (!(m.thdV < 1e-6)) { fails++; console.log(`  FAIL ${lab} THDv=${m.thdV}`); }
    }
  }
}
{
  // textbook: fc-1ph, very large L, alpha=0 -> square-wave source current: I1/Irms = 2*sqrt(2)/pi, THD = 48.34 %
  const m = simulateTopology('fc-1ph', { ...base, loadType: 'RL', L_mH: 5000, alpha: 0 }).metrics;
  checks += 2;
  if (Math.abs(m.distFactor - (2 * Math.SQRT2) / Math.PI) > 2e-3) { fails++; console.log('  FAIL square-wave distortion factor', m.distFactor); }
  if (Math.abs(m.thd - 0.4834) > 2e-3) { fails++; console.log('  FAIL square-wave THD', m.thd); }
}

console.log('\n=== 3d. Device currents are routed from the load-current ODE (KCL) ===');
for (const t of TOPOLOGY_LIST) {
  for (const lt of ['R', 'RL', 'RLE'] as const) for (const fwd of [false, true]) for (const a of t.controlled ? [0, 45, 90, 140] : [0]) {
    const r = simulateTopology(t.id, { ...base, vrms: t.vrmsDefault, loadType: lt, R: 8, L_mH: 30, E: 60, alpha: a, fwd, tSim_ms: 60, startFromRest: true });
    const s = r.series;
    let ok = true;
    for (let k = 0; k < s.n && ok; k++) {
      let top = 0, bot = 0;
      t.devices.forEach((d, j) => {
        const v = s.idev[j][k];
        if (v !== 0 && Math.abs(v - s.io[k]) > 1e-12) ok = false; // a conducting device carries exactly i_o
        if (d.group === 'top') top += v; else bot += v;
      });
      if (Math.abs(top + s.iFwd[k] - s.io[k]) > 1e-9) ok = false;            // KCL at the positive rail
      if (t.hasBottom && Math.abs(bot + s.iFwd[k] - s.io[k]) > 1e-9) ok = false; // KCL at the negative rail
    }
    checks++;
    if (!ok) { fails++; console.log(`  FAIL device-current KCL ${t.id} ${lt} fwd=${fwd} a=${a}`); }
  }
}

console.log('\n=== 4. Robustness (forward drop, start from rest, extremes) ===');
for (const topo of TOPOLOGY_LIST) {
  for (const extra of [
    { vf: 0.8 }, { startFromRest: true, loadType: 'RL' as const, L_mH: 100 }, { alpha: 180 }, { alpha: 0 }, { L_mH: 0.001, loadType: 'RL' as const }, { L_mH: 5000, loadType: 'RL' as const }, { tSim_ms: 1 }, { tSim_ms: 500 }, { freq: 400 },
  ]) {
    try {
      const r = simulateTopology(topo.id, { ...base, vrms: topo.vrmsDefault, alpha: 30, ...extra });
      checks++;
      const bad = [...r.series.vo, ...r.series.io].some((x) => !Number.isFinite(x));
      if (bad || !Number.isFinite(r.metrics.Vdc)) { fails++; console.log(`  FAIL non-finite ${topo.id} ${JSON.stringify(extra)}`); }
    } catch (e) { fails++; console.log(`  FAIL throw ${topo.id} ${JSON.stringify(extra)}: ${e}`); }
  }
}

worst.sort((a, b) => b.err - a.err);
console.log('\nLargest relative errors:');
for (const w of worst.slice(0, 8)) console.log(`  ${(w.err * 100).toFixed(3)}%  ${w.label}`);
console.log(`\n${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
