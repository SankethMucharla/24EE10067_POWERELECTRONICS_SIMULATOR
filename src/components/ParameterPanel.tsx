import { useLab } from '../state/LabContext';
import { TOPOLOGIES } from '../simulations/topologies';
import { NumberField } from './NumberField';
import { SQRT2, SQRT3 } from '../utils/math';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-t first:border-t-0 first:pt-0" style={{ borderColor: 'var(--border)' }}>
      <div className="eyebrow mb-2.5">{title}</div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none text-[13px]">
      <span>{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), onChange(!checked))}
        style={{
          width: 40, height: 22, borderRadius: 999, position: 'relative', flex: 'none',
          background: checked ? 'var(--accent)' : 'var(--border-strong)', transition: 'background .15s',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.4)',
          }}
        />
      </span>
    </label>
  );
}

const SEMI_NATURAL = ['sc-1ph', 'sc-3ph'];
const BRIDGE_NO_FWD = ['fw-ct-diode', 'fw-bridge-diode', 'tp-diode', 'hw-diode-3ph'];

/** Topology-aware freewheeling-diode control. Three states: not applicable (R load), external FWD switch, built-in/natural path. */
function FwdControl() {
  const { id, params: p, setParam } = useLab();
  const topo = TOPOLOGIES[id];
  const isRL = p.loadType !== 'R' && p.L_mH > 0;
  const box = (title: string, lines: React.ReactNode) => (
    <div className="rounded-xl px-3 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--bg-soft)' }}>
      <div className="field-label m-0 mb-1" style={{ justifyContent: 'flex-start' }}>{title}</div>
      <div className="text-[12.5px]" style={{ color: 'var(--muted)', whiteSpace: 'normal' }}>{lines}</div>
    </div>
  );

  if (!isRL) {
    return box(
      'Freewheeling diode',
      id === 'hw-diode'
        ? 'External freewheeling diode is not applicable for R load.'
        : 'Not applicable for R load. The current stops with the voltage, so there is nothing to freewheel.',
    );
  }
  const semi = SEMI_NATURAL.includes(id);
  const idle = semi || BRIDGE_NO_FWD.includes(id);
  const advanced = idle || topo.phases === 3 || id === 'fc-1ph';
  return (
    <div>
      <div className="field-label">{advanced ? 'External Freewheeling Diode (optional, advanced)' : 'Freewheeling Diode'}</div>
      <div className="seg" role="group" aria-label="Freewheeling diode">
        <button data-on={!p.fwd} onClick={() => setParam('fwd', false)}>○ OFF (remove)</button>
        <button data-on={p.fwd} onClick={() => setParam('fwd', true)}>● ON (add)</button>
      </div>
      <div className="unit mt-1.5" style={{ whiteSpace: 'normal' }}>
        {p.fwd
          ? idle
            ? 'The diode is added across the load and shown in the circuit, but it stays idle: vo never goes negative here, so it is never forward biased.'
            : 'A diode is added across the load. When vo would go negative it takes over the load current and the source is disconnected.'
          : 'No external diode: the circuit is the basic converter with the load.'}
      </div>
      {semi && (
        <div className="unit mt-1.5" style={{ whiteSpace: 'normal' }}>
          <b style={{ color: 'var(--text)' }}>Built-in freewheeling path.</b> The converter's own diode paths already freewheel; no external FWD is required in the basic semi-converter model. The bridge devices are not a separate freewheeling diode.
        </div>
      )}
      {!semi && idle && !p.fwd && (
        <div className="unit mt-1.5" style={{ whiteSpace: 'normal' }}>External FWD not included in the basic model. The rectifier diodes themselves are not a separate freewheeling diode.</div>
      )}
    </div>
  );
}

export function ParameterPanel() {
  const { id, params: p, setParam, resetParams, autoCalc, setAutoCalc, run, validation: v, stale } = useLab();
  const topo = TOPOLOGIES[id];
  const alphaValid = Number.isFinite(p.alpha);
  const alphaShown = alphaValid ? Math.max(0, Math.min(180, p.alpha)) : 0;
  const isRL = p.loadType !== 'R';
  const isE = p.loadType === 'RLE';

  return (
    <section className="panel" aria-label="Parameters">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Control panel</div>
          <h2 className="panel-title m-0">Parameters</h2>
        </div>
        <button className="btn btn-sm" onClick={resetParams} title="Restore default parameters for this converter">
          Defaults
        </button>
      </div>
      <div className="panel-body">
        <Section title="Input">
          <NumberField
            label={topo.vrmsLabel}
            unit="V"
            value={p.vrms}
            onChange={(n) => setParam('vrms', n)}
            error={v.fields.vrms}
            step={topo.phases === 3 ? 10 : 5}
          />
          {Number.isFinite(p.vrms) && p.vrms > 0 && (
            <div className="unit leading-relaxed -mt-1">
              {topo.phases === 3 ? (
                <>
                  phase RMS {(p.vrms / SQRT3).toFixed(1)} V · phase peak {((SQRT2 * p.vrms) / SQRT3).toFixed(1)} V · line-line peak{' '}
                  {(SQRT2 * p.vrms).toFixed(1)} V
                </>
              ) : (
                <>peak Vm = {(SQRT2 * p.vrms).toFixed(1)} V</>
              )}
            </div>
          )}
          <NumberField label="Frequency" unit="Hz" value={p.freq} onChange={(n) => setParam('freq', n)} error={v.fields.freq} step={5} />
        </Section>

        <Section title="Load">
          <div className="seg w-full" role="radiogroup" aria-label="Load type">
            <button className="flex-1" data-on={p.loadType === 'R'} role="radio" aria-checked={p.loadType === 'R'} onClick={() => setParam('loadType', 'R')}>
              R load
            </button>
            <button className="flex-1" data-on={p.loadType === 'RL'} role="radio" aria-checked={p.loadType === 'RL'} onClick={() => setParam('loadType', 'RL')}>
              RL load
            </button>
            <button className="flex-1" data-on={p.loadType === 'RLE'} role="radio" aria-checked={p.loadType === 'RLE'} onClick={() => setParam('loadType', 'RLE')}>
              RLE load
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Resistance R" unit="Ω" value={p.R} onChange={(n) => setParam('R', n)} error={v.fields.R} step={1} />
            <NumberField
              label="Inductance L"
              unit="mH"
              value={p.L_mH}
              onChange={(n) => setParam('L_mH', n)}
              error={isRL ? v.fields.L_mH : undefined}
              disabled={!isRL}
              step={5}
            />
          </div>
          {isE && (
            <NumberField label="Back-EMF E" unit="V" value={p.E} onChange={(n) => setParam('E', n)} error={v.fields.E} step={5} />
          )}
          {isE && <div className="unit -mt-1">R-L-E: L·di/dt + R·i + E = vo. The load conducts only while vo &gt; E; when i = 0 the terminal voltage sits at E.</div>}
          {!isRL && <div className="unit -mt-1">R load: current follows voltage, i = v / R.</div>}
          {isRL && Number.isFinite(p.R) && Number.isFinite(p.L_mH) && p.R > 0 && p.L_mH >= 0 && (
            <div className="unit -mt-1">
              τ = L/R = {((p.L_mH / p.R)).toFixed(2)} ms · ωL = {(2 * Math.PI * p.freq * p.L_mH * 1e-3).toFixed(2)} Ω · φ ={' '}
              {((Math.atan2(2 * Math.PI * p.freq * p.L_mH * 1e-3, p.R) * 180) / Math.PI).toFixed(1)}°
            </div>
          )}
          <FwdControl />
        </Section>

        {topo.controlled && (
          <Section title="Control">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="field-label m-0">Firing angle</span>
                <span className="readout" style={{ fontSize: 30, fontWeight: 600, color: 'var(--accent)', lineHeight: 1 }}>
                  α = {alphaValid ? Math.round(alphaShown * 10) / 10 : '—'}°
                </span>
              </div>
              <input
                type="range"
                className="rng"
                min={0}
                max={180}
                step={0.5}
                value={alphaShown}
                aria-label="Firing angle alpha in degrees"
                style={{ ['--fill' as string]: `${(alphaShown / 180) * 100}%` }}
                onChange={(e) => setParam('alpha', Number(e.target.value))}
              />
              <div className="flex justify-between unit mt-1.5 px-0.5">
                <span>0°</span>
                <span>90°</span>
                <span>180°</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[0, 30, 60, 90, 120, 150].map((a) => (
                  <button key={a} className="chip" data-on={p.alpha === a} onClick={() => setParam('alpha', a)}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
            <NumberField label="α (type exact value)" unit="deg" value={p.alpha} onChange={(n) => setParam('alpha', n)} error={v.fields.alpha} step={1} />
          </Section>
        )}

        <Section title="Device">
          <NumberField
            label="Forward voltage drop per device"
            unit="V"
            value={p.vf}
            onChange={(n) => setParam('vf', n)}
            error={v.fields.vf}
            step={0.1}
            hint="0 V = ideal switch (matches the closed-form theory)"
          />
        </Section>

        <Section title="Simulation">
          <NumberField label="Time window" unit="ms (0 → T)" value={p.tSim_ms} onChange={(n) => setParam('tSim_ms', n)} error={v.fields.tSim_ms} step={10} />
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {[20, 50, 100, 200].map((t) => (
              <button key={t} className="chip" data-on={p.tSim_ms === t} onClick={() => setParam('tSim_ms', t)}>
                {t} ms
              </button>
            ))}
          </div>
          <Switch checked={p.startFromRest} onChange={(b) => setParam('startFromRest', b)} label="Start from rest (show current build-up)" />
        </Section>

        {v.errors.length > 0 && (
          <div className="grid gap-2 mb-3">
            {v.errors.map((e, k) => (
              <div key={k} className="banner banner-err" role="alert">
                <span aria-hidden>⚠</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}
        {v.warnings.map((e, k) => (
          <div key={k} className="banner banner-warn mb-2">
            <span aria-hidden>▲</span>
            <span>{e}</span>
          </div>
        ))}

        <div className="grid gap-3 pt-1">
          <button className="btn btn-primary w-full" style={{ height: 44, fontSize: 14, letterSpacing: '.04em' }} onClick={run} disabled={v.errors.length > 0}>
            ▶ RUN SIMULATION
          </button>
          <Switch checked={autoCalc} onChange={setAutoCalc} label="Auto calculate (update on every change)" />
          {!autoCalc && stale && v.errors.length === 0 && (
            <div className="banner banner-info">
              <span aria-hidden>ⓘ</span>
              <span>Parameters changed. Press RUN SIMULATION to update the waveforms and values.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
