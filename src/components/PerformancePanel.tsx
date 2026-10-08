import { useMemo } from 'react';
import { useLab } from '../state/LabContext';
import { buildRows, errClass, formatValue, type PerfRow } from '../calculations/rows';
import { TOPOLOGIES } from '../simulations/topologies';
import type { SimResult } from '../types';
import { Tex } from './Tex';

const NA = 'N/A for this topology';

function Cell({ r }: { r: PerfRow }) {
  if (r.na) return <span className="na">{r.na}</span>;
  return (
    <>
      {formatValue(r.sim, r.digits, r.scale)} <span className="unit">{r.unit}</span>
    </>
  );
}

export function PerformancePanel({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { computed, stale, autoCalc } = useLab();
  const rows = useMemo(() => (computed ? buildRows(computed.result, computed.theory) : []), [computed]);
  if (!computed) {
    return (
      <section className="panel">
        <div className="panel-head"><h2 className="panel-title m-0">Performance analysis</h2></div>
        <div className="panel-body"><p className="na m-0">Fix the highlighted parameter errors to see results.</p></div>
      </section>
    );
  }
  const { result, theory } = computed;
  const compact = variant === 'compact';
  const list = compact ? rows.filter((r) => !['IdevR', 'alpha', 'cond', 'IfwRms'].includes(r.key) && !(r.key === 'IfwAvg' && r.na)) : rows;

  return (
    <section className="panel" aria-label="Performance analysis">
      <div className="panel-head">
        <div>
          <div className="eyebrow">{compact ? 'Steady state' : 'Theory vs simulation'}</div>
          <h2 className="panel-title m-0">Performance analysis</h2>
        </div>
        <span className={`badge ${theory.mode === 'discontinuous' ? 'badge-warn' : 'badge-ok'}`}>
          {result.metrics.mode === 'n/a' ? 'R load' : result.metrics.mode === 'continuous' ? 'CCM' : 'DCM'}
        </span>
      </div>
      {stale && !autoCalc && <div className="px-4 pt-3"><div className="banner banner-warn">Parameters changed — press RUN SIMULATION to update.</div></div>}
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Quantity</th>
              {!compact && <th className="num">Theory</th>}
              <th className="num">Simulation</th>
              {!compact && <th className="num">Error %</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.key} title={r.hint}>
                <td>{r.label}
                  {!compact && r.hint && <div className="unit" style={{ whiteSpace: 'normal' }}>{r.hint}</div>}
                </td>
                {!compact && (
                  <td className="num">
                    {r.na ? <span className="na">{r.na === NA ? NA : '—'}</span> : r.theory !== undefined ? <>{formatValue(r.theory, r.digits, r.scale)} <span className="unit">{r.unit}</span></> : <span className="na">sim only</span>}
                  </td>
                )}
                <td className="num"><Cell r={r} /></td>
                {!compact && (
                  <td className="num">
                    {r.err !== undefined ? <span className={`badge ${errClass(r.err)}`}>{r.err.toFixed(2)}%</span> : <span className="na">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-2 pt-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
        {theory.vdcFormula && <div className="overflow-x-auto"><Tex tex={theory.vdcFormula} /></div>}
        <div>{validity(result, theory.vdcFormula)}</div>
      </div>
      {theory.note && <div className="px-4 pb-3 pt-1 unit" style={{ whiteSpace: 'normal' }}>{theory.note}</div>}
    </section>
  );
}

export function DeviceTable({ result }: { result: SimResult }) {
  const m = result.metrics;
  return (
    <section className="panel">
      <div className="panel-head"><h2 className="panel-title m-0">Per-device currents and conduction</h2></div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr><th>Device</th><th>Type</th><th className="num">I avg (A)</th><th className="num">I rms (A)</th><th className="num">Conduction (°)</th><th className="num">Start → end (°)</th></tr>
          </thead>
          <tbody>
            {result.deviceIds.map((d, i) => (
              <tr key={d}>
                <td><b>{d}</b></td>
                <td>{result.deviceKinds[i].toUpperCase()}</td>
                <td className="num">{formatValue(m.idevAvg[i], 3)}</td>
                <td className="num">{formatValue(m.idevRms[i], 3)}</td>
                                <td className="num">{formatValue(m.devConductionDeg[i], 1)}</td>
                <td className="num">{Number.isFinite(m.devStartDeg[i]) ? `${formatValue(m.devStartDeg[i], 1)} → ${formatValue(m.devEndDeg[i], 1)}` : <span className="na">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3 pt-1 unit" style={{ whiteSpace: 'normal' }}>Device topology: {TOPOLOGIES[result.topology].devicesCount}. Angles are measured from the phase-A voltage zero crossing.</div>
    </section>
  );
}

function validity(r: SimResult, formula: string | undefined): string {
  const p = r.params;
  const topo = TOPOLOGIES[r.topology];
  if (p.loadType === 'RLE') {
    if (r.metrics.mode === 'discontinuous') return 'R-L-E, discontinuous: the bridge conducts only while vo > E and the current dies out at β. While i = 0 the terminal voltage equals E, which is included in Vdc. Idc = (Vdc − E)/R.';
    return 'R-L-E, continuous: the average output voltage is the same as for an RL load (E does not change Vdc); E only lowers the current, Idc = (Vdc − E)/R.';
  }
  if (p.loadType === 'R' || p.L_mH <= 0) return 'Theory Vdc equation above is valid for the resistive load.';
  const usesBeta = !!formula && formula.includes('beta');
  if (p.fwd && topo.supportsFwd) return 'Theory includes the freewheeling clamp: vo is never negative, so the equation above applies.';
  if (r.metrics.mode === 'discontinuous' || usesBeta) return 'The current falls to zero inside the cycle, so the extinction-angle (β) equation is used. The continuous-current equation does not apply here.';
  if (!topo.controlled) return 'Valid for continuous-current operation (the diodes always conduct without a gap).';
  return 'Valid for continuous-current operation. With this R, L and α the simulated current is continuous.';
}
