import { useMemo } from 'react';
import type { SimResult } from '../types';
import { buildConductionTable } from '../calculations/conduction';

export function ConductionTable({ result, thetaDeg }: { result: SimResult; thetaDeg: number }) {
  const rows = useMemo(() => buildConductionTable(result), [result]);
  const fwd = rows.some((r) => r.freewheel !== '—');
  const th = ((thetaDeg % 360) + 360) % 360;
  return (
    <section className="panel" aria-label="Conduction table">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Generated from the simulated currents</div>
          <h2 className="panel-title m-0">Conduction table (one steady-state cycle)</h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Time interval</th>
              <th>Conducting devices</th>
              <th>Load path</th>
              <th>Freewheel diode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const active = th >= r.startDeg && th < r.endDeg;
              return (
                <tr key={i} style={active ? { background: 'var(--amber-soft)' } : undefined}>
                  <td className="readout" style={{ whiteSpace: 'nowrap' }}>
                    {r.startDeg.toFixed(0)}° – {r.endDeg.toFixed(0)}°
                    <div className="unit">{r.startMs.toFixed(2)} – {r.endMs.toFixed(2)} ms</div>
                  </td>
                  <td><b>{r.devices.length ? r.devices.join(' + ') : r.fwd ? '—' : 'none'}</b></td>
                  <td>{r.path}</td>
                  <td>{fwd ? <span className={r.fwd || r.freewheel.startsWith('Built') ? 'badge badge-warn' : 'unit'}>{r.freewheel}</span> : <span className="na">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3 pt-1 unit" style={{ whiteSpace: 'normal' }}>
        Angles are measured from the zero crossing of phase A (ωt = 0). The highlighted row is the interval the playback is currently in.
      </div>
    </section>
  );
}
