import { CONTENT } from '../content/educational';
import { TOPOLOGIES } from '../simulations/topologies';
import { Tex } from './Tex';
import type { TopologyId } from '../types';

export function HowItWorks({ topology, phase }: { topology: TopologyId; phase: number }) {
  const c = CONTENT[topology];
  const n = c.steps.length;
  const active = phase < 0 ? -1 : Math.min(n - 1, Math.floor(phase * n));
  return (
    <section className="panel" aria-label="How it works">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Step by step</div>
          <h2 className="panel-title m-0">How it works — {TOPOLOGIES[topology].shortName}</h2>
        </div>
        <span className="unit">highlight follows the playback position</span>
      </div>
      <ol className="panel-body m-0 grid gap-2" style={{ listStyle: 'none' }}>
        {c.steps.map((s, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-lg px-3 py-2 text-sm"
            style={{
              border: `1px solid ${i === active ? 'var(--amber)' : 'var(--border)'}`,
              background: i === active ? 'var(--amber-soft)' : 'transparent',
            }}
          >
            <span className="readout" style={{ color: i === active ? 'var(--amber)' : 'var(--faint)' }}>{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TheoryPanel({ topology, defaultOpen = false }: { topology: TopologyId; defaultOpen?: boolean }) {
  const t = CONTENT[topology].theory;
  return (
    <details className="panel collapse" open={defaultOpen}>
      <summary className="panel-head">
        <div>
          <div className="eyebrow">Reference</div>
          <h2 className="panel-title m-0">Theory — {TOPOLOGIES[topology].name}</h2>
        </div>
        <span className="chev" aria-hidden>▸</span>
      </summary>
      <div className="panel-body prose-lab">
        <h3>Operation</h3>
        {t.operation.map((p, i) => <p key={i}>{p}</p>)}
        <h3>Conduction sequence</h3>
        <p>{t.sequence}</p>
        <h3>Equations</h3>
        <div className="grid gap-2">
          {t.equations.map((e) => (
            <div key={e.label} className="eq-card">
              <div className="unit mb-1">{e.label}</div>
              <Tex tex={e.tex} block />
            </div>
          ))}
        </div>
        <h3>Expected waveforms</h3>
        <ul>{t.waveform.map((p, i) => <li key={i}>{p}</li>)}</ul>
        <div className="grid gap-4 md:grid-cols-3">
          <div><h3>Advantages</h3><ul>{t.advantages.map((p) => <li key={p}>{p}</li>)}</ul></div>
          <div><h3>Disadvantages</h3><ul>{t.disadvantages.map((p) => <li key={p}>{p}</li>)}</ul></div>
          <div><h3>Applications</h3><ul>{t.applications.map((p) => <li key={p}>{p}</li>)}</ul></div>
        </div>
      </div>
    </details>
  );
}

const CARD = {
  formula: { t: 'Key formula', c: 'var(--accent)', i: 'ƒ' },
  note: { t: 'Important note', c: 'var(--amber)', i: '!' },
  viva: { t: 'Viva question', c: 'var(--accent-2)', i: '?' },
  insight: { t: 'Design insight', c: 'var(--good)', i: '✦' },
} as const;

function Card({ k, children }: { k: keyof typeof CARD; children: React.ReactNode }) {
  const m = CARD[k];
  return (
    <div className="panel" style={{ borderLeft: `3px solid ${m.c}` }}>
      <div className="panel-body">
        <div className="flex items-center gap-2 mb-2">
          <span className="readout" style={{ color: m.c, fontWeight: 700 }}>{m.i}</span>
          <span className="eyebrow" style={{ color: m.c }}>{m.t}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EduCards({ topology }: { topology: TopologyId }) {
  const c = CONTENT[topology];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card k="formula">
        <div className="grid gap-2">
          {c.keyFormulas.map((f) => (
            <div key={f.label} className="overflow-x-auto"><div className="unit">{f.label}</div><Tex tex={f.tex} block /></div>
          ))}
        </div>
      </Card>
      <Card k="note"><p className="m-0 text-sm">{c.note}</p></Card>
      <Card k="viva"><ul className="m-0 pl-4 text-sm grid gap-1" style={{ listStyle: 'disc' }}>{c.viva.map((v) => <li key={v}>{v}</li>)}</ul></Card>
      <Card k="insight"><p className="m-0 text-sm">{c.insight}</p></Card>
    </div>
  );
}
