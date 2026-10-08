import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import { useLab } from '../state/LabContext';
import { PerformancePanel, DeviceTable } from '../components/PerformancePanel';
import { PowerQuality } from '../components/PowerQuality';
import { ConverterList } from '../components/ConverterSelector';
import { ParameterPanel } from '../components/ParameterPanel';
import { simulateTopology } from '../simulations/engine';
import { computeTheory } from '../calculations/theory';
import { TOPOLOGIES } from '../simulations/topologies';

function AlphaSweep() {
  const { id, params, theme } = useLab();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const topo = TOPOLOGIES[id];
  useEffect(() => {
    const el = ref.current;
    if (!el || !topo.controlled) return;
    setBusy(true);
    const h = setTimeout(() => {
      const xs: number[] = [], sim: number[] = [], th: number[] = [];
      for (let a = 0; a <= 180; a += 10) {
        const p = { ...params, alpha: a, tSim_ms: Math.min(params.tSim_ms, 60) };
        xs.push(a);
        sim.push(simulateTopology(id, p).metrics.Vdc);
        th.push(computeTheory(id, p).Vdc ?? NaN);
      }
      const dark = theme === 'dark';
      const font = dark ? '#8da2c4' : '#53647f';
      Plotly.react(el, [
        { x: xs, y: th, name: 'Theory', mode: 'lines', line: { color: '#fbbf24', width: 2 } },
        { x: xs, y: sim, name: 'Simulation', mode: 'markers', marker: { color: '#22d3ee', size: 8 } },
      ], {
        height: 340, margin: { t: 10, l: 60, r: 10, b: 50 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: font, family: 'IBM Plex Mono' },
        xaxis: { title: { text: 'firing angle α (°)' }, gridcolor: 'rgba(120,160,220,0.15)' },
        yaxis: { title: { text: 'Vdc (V)' }, gridcolor: 'rgba(120,160,220,0.15)', zeroline: true },
        legend: { orientation: 'h', y: 1.1 },
      }, { displaylogo: false, responsive: true });
      setBusy(false);
    }, 30);
    return () => clearTimeout(h);
  }, [id, params, theme, topo.controlled]);
  useEffect(() => () => { if (ref.current) Plotly.purge(ref.current); }, []);
  if (!topo.controlled) return null;
  return (
    <section className="panel">
      <div className="panel-head"><div><div className="eyebrow">Control characteristic</div><h2 className="panel-title m-0">Vdc vs firing angle α</h2></div>{busy && <span className="unit">computing…</span>}</div>
      <div className="p-2"><div ref={ref} /></div>
    </section>
  );
}

export default function Performance() {
  const { computed } = useLab();
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
      <aside className="grid gap-4"><ConverterList /><ParameterPanel /></aside>
      <main className="grid gap-4 min-w-0">
        <PerformancePanel variant="full" />
        {computed && <DeviceTable result={computed.result} />}
        <PowerQuality />
        <AlphaSweep />
      </main>
    </div>
  );
}
