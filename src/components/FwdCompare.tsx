import { useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import { useLab } from '../state/LabContext';
import { TOPOLOGIES } from '../simulations/topologies';
import { simulateTopology } from '../simulations/engine';
import { buildConductionTable } from '../calculations/conduction';
import { stepify } from '../utils/steps';
import type { SimResult } from '../types';

function scope(el: HTMLDivElement, r: SimResult, dark: boolean, withFw: boolean, vr: [number, number], ir: [number, number]) {
  const s = r.series;
  const T = 1000 / r.params.freq;
  const t1 = s.t_ms[s.n - 1];
  const x0 = Math.max(s.t_ms[0], t1 - 2 * T);
  const font = dark ? '#8da2c4' : '#53647f';
  const grid = dark ? 'rgba(120,160,220,0.15)' : 'rgba(60,90,140,0.15)';
  const tr = (name: string, y: ArrayLike<number>, color: string, ax: string, extra: object = {}) => {
    const st = stepify(s.t_ms, y);
    return { type: 'scatter', mode: 'lines', x: st.x, y: st.y, name, yaxis: ax, line: { color, width: 1.8 }, hovertemplate: `${name} = %{y:.2f}<extra></extra>`, ...extra };
  };
  const rows = withFw ? 3 : 2;
  const h = 1 / rows;
  const dom = (k: number): [number, number] => [1 - (k + 1) * h + 0.05 * h, 1 - k * h - 0.05 * h];
  const data = [tr('vo', s.vo, '#22d3ee', 'y', { fill: 'tozeroy', fillcolor: 'rgba(34,211,238,0.08)' }), tr('io', s.io, '#f59e0b', 'y2')];
  if (withFw) data.push(tr('i_FW', s.iFwd, '#a78bfa', 'y3', { fill: 'tozeroy', fillcolor: 'rgba(167,139,250,0.2)' }));
  const lay: Record<string, unknown> = {
    height: 120 * rows + 70, margin: { t: 8, l: 62, r: 10, b: 44 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'IBM Plex Mono, monospace', size: 10.5, color: font }, showlegend: false, hovermode: 'x unified', dragmode: 'pan',
    xaxis: { title: { text: 'Time (ms)' }, range: [x0, t1], anchor: withFw ? 'y3' : 'y2', gridcolor: grid, zeroline: false },
    yaxis: { domain: dom(0), title: { text: 'vo (V)' }, range: vr, gridcolor: grid, zerolinecolor: font },
    yaxis2: { domain: dom(1), title: { text: 'io (A)' }, range: ir, gridcolor: grid, zerolinecolor: font, anchor: 'x' },
  };
  if (withFw) lay.yaxis3 = { domain: dom(2), title: { text: 'i_FW (A)' }, range: ir, gridcolor: grid, zerolinecolor: font, anchor: 'x' };
  Plotly.react(el, data as Plotly.Data[], lay as Partial<Plotly.Layout>, { displaylogo: false, responsive: true, scrollZoom: false });
}

const f = (v: number | undefined, d = 2) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));

function summary(r: SimResult): string {
  return buildConductionTable(r)
    .map((x) => `${x.startDeg.toFixed(0)}°–${x.endDeg.toFixed(0)}°: ${x.fwd ? 'FWD' : x.devices.length ? x.devices.join('+') : 'none'}`)
    .join('  ·  ');
}

export function FwdCompare() {
  const { id, params, theme, validation } = useLab();
  const [open, setOpen] = useState(false);
  const topo = TOPOLOGIES[id];
  const offRef = useRef<HTMLDivElement>(null);
  const onRef = useRef<HTMLDivElement>(null);
  const applicable = topo.supportsFwd && params.loadType !== 'R';
  const ok = validation.errors.length === 0;

  const pair = useMemo(() => {
    if (!open || !applicable || !ok) return null;
    const base = { ...params, tSim_ms: Math.max(params.tSim_ms, 2000 / params.freq) };
    return { off: simulateTopology(id, { ...base, fwd: false }), on: simulateTopology(id, { ...base, fwd: true }) };
  }, [open, applicable, ok, id, params]);

  useEffect(() => {
    if (!pair || !offRef.current || !onRef.current) return;
    const all = [pair.off.series, pair.on.series];
    const rng = (get: (s: (typeof all)[0]) => Float64Array) => {
      let mn = 0, mx = 0;
      for (const s of all) for (const v of get(s)) { if (v < mn) mn = v; if (v > mx) mx = v; }
      const pad = (mx - mn) * 0.08 || 1;
      return [mn - pad, mx + pad] as [number, number];
    };
    const vr = rng((s) => s.vo);
    const ir = rng((s) => s.io);
    scope(offRef.current, pair.off, theme === 'dark', false, vr, ir);
    scope(onRef.current, pair.on, theme === 'dark', true, vr, ir);
  }, [pair, theme]);
  useEffect(() => () => {
    if (offRef.current) Plotly.purge(offRef.current);
    if (onRef.current) Plotly.purge(onRef.current);
  }, []);

  if (!applicable) return null;
  const a = pair?.off.metrics;
  const b = pair?.on.metrics;
  const T = (v: number | undefined) => f(v, 3);

  return (
    <section className="panel" aria-label="Freewheeling diode comparison">
      <div className="panel-head flex-wrap">
        <div>
          <div className="eyebrow">Effect of the freewheeling diode</div>
          <h2 className="panel-title m-0">Compare ON vs OFF</h2>
        </div>
        <button className={`btn btn-sm ${open ? '' : 'btn-primary'}`} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide comparison' : '[ Compare ON vs OFF ]'}
        </button>
      </div>
      {!open && <div className="panel-body unit" style={{ whiteSpace: 'normal' }}>Runs the same circuit twice with your current parameters, once without and once with the diode, and shows the waveforms side by side.</div>}
      {open && pair && a && b && (
        <div className="panel-body grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="panel-title mb-1">Without freewheeling diode</div>
              <div ref={offRef} />
              <div className="unit" style={{ whiteSpace: 'normal' }}><b>Conduction path:</b> {summary(pair.off)}</div>
            </div>
            <div>
              <div className="panel-title mb-1" style={{ color: '#a78bfa' }}>With freewheeling diode</div>
              <div ref={onRef} />
              <div className="unit" style={{ whiteSpace: 'normal' }}><b>Conduction path:</b> {summary(pair.on)}</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Quantity</th><th className="num">OFF</th><th className="num">ON</th></tr></thead>
              <tbody>
                <tr><td>Vdc (V)</td><td className="num">{f(a.Vdc)}</td><td className="num">{f(b.Vdc)}</td></tr>
                <tr><td>Vrms (V)</td><td className="num">{f(a.Vrms)}</td><td className="num">{f(b.Vrms)}</td></tr>
                <tr><td>Idc (A)</td><td className="num">{T(a.Idc)}</td><td className="num">{T(b.Idc)}</td></tr>
                <tr><td>Irms (A)</td><td className="num">{T(a.Irms)}</td><td className="num">{T(b.Irms)}</td></tr>
                <tr><td>Input power factor</td><td className="num">{f(a.pf, 4)}</td><td className="num">{f(b.pf, 4)}</td></tr>
                <tr><td>Source-current THD (%)</td><td className="num">{f(a.thd * 100, 1)}</td><td className="num">{f(b.thd * 100, 1)}</td></tr>
                <tr><td>{pair.off.deviceIds[0]} conduction (°)</td><td className="num">{f(a.devConductionDeg[0], 1)}</td><td className="num">{f(b.devConductionDeg[0], 1)}</td></tr>
                <tr><td>Load mode</td><td className="num">{a.mode === 'continuous' ? 'CCM' : 'DCM'}</td><td className="num">{b.mode === 'continuous' ? 'CCM' : 'DCM'}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="prose-lab" style={{ fontSize: 13.5 }}>
            <h3 style={{ marginTop: 0 }}>What changes and why</h3>
            {Math.abs(b.Vdc - a.Vdc) < 1e-3 * Math.max(1, Math.abs(a.Vdc)) ? (
              <p>
                At this operating point the load voltage never goes negative (the load current is continuous and the firing angle is small), so the freewheeling diode never gets forward biased and the two cases are identical. Increase α or reduce L to see the diode act.
              </p>
            ) : (
              <ul>
                <li><b>Without the diode</b>, the inductor current keeps the SCR/diode on after the source voltage has gone negative. The source still feeds the load, so vo goes negative until the current dies out. This pulls Vdc down to {f(a.Vdc)} V.</li>
                <li><b>With the diode</b>, as soon as vo would go below zero the freewheeling diode turns on, the load is shorted through it and the source is disconnected. vo is held at ≈ 0 V, the stored energy decays in R and L, and Vdc becomes {f(b.Vdc)} V.</li>
                <li>The average load current changes from {f(a.Idc, 3)} A to {f(b.Idc, 3)} A because the negative-voltage volt-seconds are no longer subtracted.</li>
                <li>The main device now conducts for {f(b.devConductionDeg[0], 0)}° instead of {f(a.devConductionDeg[0], 0)}° and the source current is a narrower pulse; power factor goes from {f(a.pf, 3)} to {f(b.pf, 3)}.</li>
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
