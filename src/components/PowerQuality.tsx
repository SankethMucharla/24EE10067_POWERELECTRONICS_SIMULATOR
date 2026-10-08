import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import { useLab } from '../state/LabContext';
import { Tex } from './Tex';
import { TOPOLOGIES } from '../simulations/topologies';

const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '—');

function Spectrum({ title, y, ylabel, color, theme, skipFirst }: { title: string; y: number[]; ylabel: string; color: string; theme: 'dark' | 'light'; skipFirst?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const orders = y.map((_, k) => k + 1);
    const font = theme === 'dark' ? '#8da2c4' : '#53647f';
    const x = skipFirst ? orders.slice(0) : orders;
    Plotly.react(el, [{ type: 'bar', x, y, marker: { color }, hovertemplate: 'h%{x}: %{y:.2f}<extra></extra>' }], {
      height: 260, margin: { t: 28, l: 56, r: 10, b: 44 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: font, family: 'IBM Plex Mono', size: 11 },
      title: { text: title, font: { size: 12 }, x: 0.02 },
      xaxis: { title: { text: 'Harmonic order n (× supply frequency)' }, gridcolor: 'rgba(120,160,220,0.12)', range: [0.3, y.length + 0.7], dtick: 5 },
      yaxis: { title: { text: ylabel }, gridcolor: 'rgba(120,160,220,0.15)', rangemode: 'tozero' },
      bargap: 0.35,
    }, { displaylogo: false, responsive: true });
  }, [y, title, ylabel, color, theme, skipFirst]);
  useEffect(() => () => { if (ref.current) Plotly.purge(ref.current); }, []);
  return <div ref={ref} />;
}

export function PowerQuality() {
  const { computed, theme } = useLab();
  if (!computed) return null;
  const { result } = computed;
  const m = result.metrics;
  const topo = TOPOLOGIES[result.topology];
  const phi1 = Number.isFinite(m.df) ? (Math.acos(Math.max(-1, Math.min(1, m.df))) * 180) / Math.PI : NaN;
  const product = m.df * m.distFactor;
  const I1 = m.harmI[0];
  const hI = m.harmI.map((v) => (I1 > 1e-9 ? (100 * v) / I1 : 0));
  const hasDC = Math.abs(m.Vdc) > 1e-9;
  const hV = m.harmVo.map((v) => (hasDC ? (100 * v) / Math.abs(m.Vdc) : 0));
  // the output voltage only contains multiples of the pulse number; list the dominant ones
  const ripple = hasDC ? Math.sqrt(Math.max(m.Vrms * m.Vrms - m.Vdc * m.Vdc, 0)) / Math.abs(m.Vdc) : NaN;
  const tiles: { k: string; label: string; v: string; sub: string }[] = [
    { k: 'pf', label: 'True power factor', v: f(m.pf, 4), sub: 'PF = P / (Vrms·Irms)' },
    { k: 'df', label: 'Displacement factor', v: f(m.df, 4), sub: `cos φ₁, φ₁ = ${f(phi1, 1)}°` },
    { k: 'dist', label: 'Distortion factor', v: f(m.distFactor, 4), sub: 'I₁ / Irms' },
    { k: 'thdi', label: 'Current THD', v: Number.isFinite(m.thd) ? `${(m.thd * 100).toFixed(1)} %` : '—', sub: '√(Irms² − I₁²) / I₁' },
    { k: 'thdv', label: 'Supply voltage THD', v: Number.isFinite(m.thdV) ? `${(m.thdV * 100).toFixed(2)} %` : '—', sub: 'ideal source, Zs = 0' },
    { k: 'rip', label: 'Output voltage distortion', v: Number.isFinite(ripple) ? `${(ripple * 100).toFixed(1)} %` : '—', sub: '√(Vrms² − Vdc²) / Vdc' },
  ];
  return (
    <section className="panel" aria-label="Power quality">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Power quality · {topo.name}</div>
          <h2 className="panel-title m-0">How much the rectifier disturbs the AC supply</h2>
        </div>
      </div>
      <div className="panel-body grid gap-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((t) => (
            <div key={t.k} className="rounded-xl px-3 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
              <div className="field-label m-0 mb-1" style={{ justifyContent: 'flex-start' }}>{t.label}</div>
              <div className="readout" style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>{t.v}</div>
              <div className="unit" style={{ whiteSpace: 'normal' }}>{t.sub}</div>
            </div>
          ))}
        </div>
        <div className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          <div className="mb-1">
            <Tex tex={'PF=\\dfrac{P}{V_{rms}I_{rms}}=\\underbrace{\\cos\\phi_1}_{\\text{displacement}}\\times\\underbrace{\\dfrac{I_1}{I_{rms}}}_{\\text{distortion}}'} />
          </div>
          Check with this run: DF × distortion = {f(m.df, 4)} × {f(m.distFactor, 4)} = <b>{f(product, 4)}</b>, measured PF = <b>{f(m.pf, 4)}</b>
          {Number.isFinite(product) && Number.isFinite(m.pf) && Math.abs(product - m.pf) < 2e-3 ? ' ✓ (equal: the supply is a pure sine, so only the fundamental carries real power).' : '.'}
          <div className="mt-1">
            <Tex tex={'THD_I=\\dfrac{\\sqrt{I_{rms}^2-I_1^2}}{I_1}\\times 100\\%'} /> &nbsp;·&nbsp; <Tex tex={'THD_I=\\sqrt{\\tfrac{1}{DF_{dist}^2}-1}'} />
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Spectrum title="Source current harmonics (phase A, % of fundamental)" y={hI} ylabel="% of I₁" color="#f59e0b" theme={theme} />
          <Spectrum title="Output voltage harmonics (% of Vdc)" y={hV} ylabel="% of Vdc" color="#22d3ee" theme={theme} />
        </div>
        <div className="unit" style={{ whiteSpace: 'normal' }}>
          Spectra come from a DFT of one steady-state cycle of the simulated waveforms (harmonics 1–50). The supply is an ideal source with no
          impedance, so its voltage stays a pure sine (THD<sub>V</sub> = 0): the voltage distortion that matters in this model is on the DC side. With a source
          impedance the current harmonics above would also distort the supply voltage at the point of common coupling.
          {topo.phases === 3 ? ' Three-phase values use phase A; PF is computed from the total three-phase power and apparent power.' : ''}
        </div>
      </div>
    </section>
  );
}
