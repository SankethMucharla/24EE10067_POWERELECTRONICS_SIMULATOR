import { useNavigate } from 'react-router-dom';
import { useLab } from '../state/LabContext';
import { TOPOLOGY_LIST, TOPOLOGIES } from '../simulations/topologies';
import { CircuitDiagram } from '../circuits/CircuitDiagram';
import type { TopologyId } from '../types';

const GROUPS: { title: string; sub: string; ids: TopologyId[] }[] = [
  { title: 'Single-phase diode', sub: 'uncontrolled', ids: ['hw-diode', 'fw-ct-diode', 'fw-bridge-diode'] },
  { title: 'Three-phase diode', sub: 'uncontrolled', ids: ['hw-diode-3ph', 'tp-diode'] },
  { title: 'Single-phase SCR', sub: 'controlled', ids: ['hw-scr-1ph', 'fc-1ph', 'sc-1ph'] },
  { title: 'Three-phase SCR', sub: 'controlled', ids: ['hw-scr-3ph', 'fc-3ph', 'sc-3ph'] },
];

/** Compact list for the simulator's left column */
export function ConverterList() {
  const { id, setId } = useLab();
  return (
    <nav className="panel" aria-label="Select converter">
      <div className="panel-head">
        <div><div className="eyebrow">Select</div><h2 className="panel-title m-0">Converter</h2></div>
      </div>
      <div className="panel-body grid gap-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="eyebrow mb-1.5">{g.title}</div>
            <div className="grid gap-1.5">
              {g.ids.map((t) => (
                <button
                  key={t}
                  className="chip text-left"
                  style={{ height: 'auto', padding: '7px 10px', borderRadius: 10, whiteSpace: 'normal', justifyContent: 'flex-start' }}
                  data-on={id === t}
                  onClick={() => setId(t)}
                >
                  {TOPOLOGIES[t].name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Visual card grid with mini circuit previews */
export function ConverterGrid({ go = '/simulator' }: { go?: string }) {
  const { setId, id } = useLab();
  const nav = useNavigate();
  return (
    <div className="grid gap-8">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="flex items-baseline gap-3 mb-3">
            <h3 className="panel-title m-0" style={{ fontSize: 17 }}>{g.title}</h3>
            <span className="eyebrow">{g.sub}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.ids.map((t) => {
              const T = TOPOLOGIES[t];
              return (
                <button
                  key={t}
                  className="panel text-left transition hover:-translate-y-0.5"
                  style={{ cursor: 'pointer', outline: id === t ? '2px solid var(--accent)' : undefined }}
                  onClick={() => { setId(t); nav(go); }}
                >
                  <div className="ckt p-3" style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
                    <CircuitDiagram topo={T} sample={null} showFwd={false} loadType="RL" mini />
                  </div>
                  <div className="panel-body">
                    <div className="panel-title">{T.name}</div>
                    <div className="unit mt-0.5">{T.devicesCount} · ripple {T.pulses}f</div>
                    <p className="m-0 mt-2 text-[13px]" style={{ color: 'var(--muted)' }}>{T.desc}</p>
                    <div className="mt-3 text-[13px]" style={{ color: 'var(--accent)' }}>Open in simulator →</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { TOPOLOGY_LIST };
