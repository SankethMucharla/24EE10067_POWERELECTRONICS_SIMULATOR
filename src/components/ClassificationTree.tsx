import { Link } from 'react-router-dom';
import { useLab } from '../state/LabContext';
import { TOPOLOGIES } from '../simulations/topologies';
import type { TopologyId } from '../types';

const TREE: { name: string; children: { name: string; ids: TopologyId[] }[] }[] = [
  {
    name: 'Uncontrolled (diode)',
    children: [
      { name: 'Single-phase', ids: ['hw-diode', 'fw-ct-diode', 'fw-bridge-diode'] },
      { name: 'Three-phase', ids: ['hw-diode-3ph', 'tp-diode'] },
    ],
  },
  {
    name: 'Controlled (SCR)',
    children: [
      { name: 'Single-phase', ids: ['hw-scr-1ph', 'fc-1ph', 'sc-1ph'] },
      { name: 'Three-phase', ids: ['hw-scr-3ph', 'fc-3ph', 'sc-3ph'] },
    ],
  },
];

export function ClassificationTree() {
  const { setId } = useLab();
  return (
    <div className="panel">
      <div className="panel-body">
        <div className="flex items-center gap-2 mb-4">
          <span className="badge badge-ok">AC → DC</span>
          <span className="panel-title">Rectifiers</span>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {TREE.map((g) => (
            <div key={g.name} className="pl-4" style={{ borderLeft: '2px solid var(--accent)' }}>
              <div className="panel-title mb-3" style={{ color: 'var(--accent)' }}>{g.name}</div>
              <div className="grid gap-4">
                {g.children.map((c) => (
                  <div key={c.name} className="pl-4" style={{ borderLeft: '2px solid var(--border-strong)' }}>
                    <div className="eyebrow mb-1.5">{c.name}</div>
                    <ul className="m-0 p-0 grid gap-1" style={{ listStyle: 'none' }}>
                      {c.ids.map((id) => (
                        <li key={id}>
                          <Link to="/simulator" onClick={() => setId(id)} className="text-[13.5px] hover:underline" style={{ color: 'var(--text)' }}>
                            ├ {TOPOLOGIES[id].name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
