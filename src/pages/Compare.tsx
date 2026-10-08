import { useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import { useLab, defaultParams } from '../state/LabContext';
import { TOPOLOGY_LIST, TOPOLOGIES } from '../simulations/topologies';
import { simulateTopology } from '../simulations/engine';
import { computeTheory } from '../calculations/theory';
import { NumberField } from '../components/NumberField';
import type { TopologyId } from '../types';
import { DEVICE_COLORS } from '../components/WaveformCard';

const f = (v: number | undefined, d: number, s = 1) => (v === undefined || !Number.isFinite(v) ? '—' : (v * s).toFixed(d));

export default function Compare() {
  const { theme } = useLab();
  const [sel, setSel] = useState<TopologyId[]>(['hw-diode', 'fw-bridge-diode', 'fc-1ph']);
  const [load, setLoad] = useState<'R' | 'RL'>('RL');
  const [R, setR] = useState(10);
  const [L, setL] = useState(50);
  const [alpha, setAlpha] = useState(30);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = (id: TopologyId) =>
    setSel((c) => (c.includes(id) ? (c.length > 2 ? c.filter((x) => x !== id) : c) : c.length < 4 ? [...c, id] : c));

  const bad = !(R > 0) || L < 0 || alpha < 0 || alpha > 180;
  const runs = useMemo(() => {
    if (bad) return [];
    return sel.map((id) => {
      const p = { ...defaultParams(id), loadType: load, R, L_mH: L, alpha: TOPOLOGIES[id].controlled ? alpha : 0, tSim_ms: 60 };
      return { id, res: simulateTopology(id, p), th: computeTheory(id, p) };
    });
  }, [sel, load, R, L, alpha, bad]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !runs.length) return;
    const font = theme === 'dark' ? '#8da2c4' : '#53647f';
    // normalised to per-unit of each converter's peak line-line/phase value so different supplies are comparable
    Plotly.react(el, runs.map((r, i) => ({
      x: Array.from(r.res.series.t_ms), y: Array.from(r.res.series.vo), name: TOPOLOGIES[r.id].shortName, mode: 'lines' as const,
      line: { color: DEVICE_COLORS[i], width: 2 },
    })), {
      height: 320, margin: { t: 10, l: 60, r: 10, b: 50 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: font, family: 'IBM Plex Mono' }, xaxis: { title: { text: 'time (ms)' }, range: [40, 60], gridcolor: 'rgba(120,160,220,0.15)' },
      yaxis: { title: { text: 'vo (V)' }, gridcolor: 'rgba(120,160,220,0.15)' }, legend: { orientation: 'h', y: 1.15 },
    }, { displaylogo: false, responsive: true });
  }, [runs, theme]);
  useEffect(() => () => { if (ref.current) Plotly.purge(ref.current); }, []);

  const rows: [string, (r: (typeof runs)[number]) => string][] = [
    ['Source (RMS, as defined)', (r) => `${TOPOLOGIES[r.id].vrmsDefault} V ${TOPOLOGIES[r.id].phases === 3 ? 'L-L' : ''}`],
    ['Devices', (r) => TOPOLOGIES[r.id].devicesCount],
    ['Vdc (V) — simulation', (r) => f(r.res.metrics.Vdc, 2)],
    ['Vdc (V) — theory', (r) => f(r.th.Vdc, 2)],
    ['Vrms (V)', (r) => f(r.res.metrics.Vrms, 2)],
    ['Idc (A)', (r) => f(r.res.metrics.Idc, 3)],
    ['Form factor', (r) => f(r.res.metrics.formFactor, 4)],
    ['Ripple factor', (r) => f(r.res.metrics.ripple, 4)],
    ['Efficiency η (%)', (r) => f(r.res.metrics.efficiency, 2, 100)],
    ['Ripple frequency (Hz)', (r) => f(r.res.metrics.rippleFreq, 0)],
    ['PIV (V)', (r) => f(r.res.metrics.piv, 1)],
    ['Power factor', (r) => f(r.res.metrics.pf, 4)],
    ['Source-current THD (%)', (r) => f(r.res.metrics.thd, 1, 100)],
    ['Mode', (r) => (r.res.metrics.mode === 'n/a' ? 'R load' : r.res.metrics.mode === 'continuous' ? 'CCM' : 'DCM')],
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 grid gap-4">
      <div><div className="eyebrow">Side by side</div><h1 className="m-0 mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>Compare rectifiers</h1></div>
      <section className="panel">
        <div className="panel-body grid gap-4">
          <div>
            <div className="eyebrow mb-2">Pick 2 to 4 converters ({sel.length} selected)</div>
            <div className="flex flex-wrap gap-2">
              {TOPOLOGY_LIST.map((t) => <button key={t.id} className="chip" data-on={sel.includes(t.id)} onClick={() => toggle(t.id)}>{t.name}</button>)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><div className="field-label">Load</div><div className="seg"><button data-on={load === 'R'} onClick={() => setLoad('R')}>R</button><button data-on={load === 'RL'} onClick={() => setLoad('RL')}>R-L</button></div></div>
            <NumberField label="Resistance R" unit="Ω" value={R} onChange={setR} error={R > 0 ? undefined : 'Resistance must be greater than zero.'} />
            <NumberField label="Inductance L" unit="mH" value={L} onChange={setL} disabled={load === 'R'} error={L >= 0 ? undefined : 'Inductance cannot be negative.'} />
            <NumberField label="Firing angle α (controlled only)" unit="°" value={alpha} onChange={setAlpha} error={alpha >= 0 && alpha <= 180 ? undefined : 'Firing angle α must lie between 0° and 180°.'} />
          </div>
          <div className="unit" style={{ whiteSpace: 'normal' }}>Each converter uses its own default supply (230 V single-phase / 400 V line-line three-phase, 50 Hz) so absolute values differ — compare shapes, ripple, PF and THD.</div>
        </div>
      </section>
      {runs.length > 0 && (
        <>
          <section className="panel">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Quantity</th>{runs.map((r) => <th key={r.id} className="num">{TOPOLOGIES[r.id].shortName}</th>)}</tr></thead>
                <tbody>{rows.map(([k, fn]) => <tr key={k}><td>{k}</td>{runs.map((r) => <td key={r.id} className="num">{fn(r)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>
          <section className="panel"><div className="panel-head"><h2 className="panel-title m-0">Output voltage vo(t)</h2></div><div className="p-2"><div ref={ref} /></div></section>
        </>
      )}
    </div>
  );
}
