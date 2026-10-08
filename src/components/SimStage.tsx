import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLab } from '../state/LabContext';
import { TOPOLOGIES } from '../simulations/topologies';
import { CircuitDiagram, sampleAt } from '../circuits/CircuitDiagram';
import { WaveformCard, DEVICE_COLORS } from './WaveformCard';
import { HowItWorks } from './Educational';
import { ConductionTable } from './ConductionTable';
import { FwdCompare } from './FwdCompare';
import type { SimResult } from '../types';

const SPEEDS = { Slow: 4, Normal: 10, Fast: 40 } as const; // simulated ms per real second
type Speed = keyof typeof SPEEDS;

export function SimStage() {
  const { computed, theme, runToken, params } = useLab();
  const result = computed?.result ?? null;
  if (!result) {
    return (
      <section className="panel"><div className="panel-body"><p className="na m-0">No simulation — correct the parameter errors on the right.</p></div></section>
    );
  }
  return <Stage result={result} dark={theme === 'dark'} runToken={runToken} showFwd={params.fwd} />;
}

function Stage({ result, dark, runToken, showFwd }: { result: SimResult; dark: boolean; runToken: number; showFwd: boolean }) {
  const s = result.series;
  const topo = TOPOLOGIES[result.topology];
  const tMax = s.t_ms[s.n - 1];
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>('Normal');
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  const last = useRef(0);

  const idxOf = useCallback(
    (tm: number) => Math.max(0, Math.min(s.n - 1, Math.round((tm / tMax) * (s.n - 1)))),
    [s, tMax],
  );

  // restart on new run / topology change
  useEffect(() => {
    tRef.current = 0;
    setT(0);
    setPlaying(true);
  }, [runToken, result.topology]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    last.current = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      let nt = tRef.current + dt * SPEEDS[speed];
      if (nt > tMax) nt -= tMax;
      tRef.current = nt;
      acc += dt;
      if (acc > 1 / 30) {
        acc = 0;
        setT(nt);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, tMax]);

  const setTime = (nt: number) => {
    tRef.current = nt;
    setT(nt);
  };
  const stepMs = (5 / 360) * (1000 / result.params.freq);
  const step = () => {
    setPlaying(false);
    setTime((tRef.current + stepMs) % tMax);
  };
  const reset = () => {
    setPlaying(false);
    setTime(0);
  };

  const idx = idxOf(t);
  const sample = useMemo(() => sampleAt(s, idx), [s, idx]);
  const thetaDeg = ((s.theta[idx] * 180) / Math.PI) % 360;
  const conducting = result.deviceIds.filter((_, i) => {
    return Math.abs(s.idev[i][idx]) > 1e-6;
  });
  const desc = describe(result, sample.fwdOn, conducting, sample.vo, sample.io);

  return (
    <>
      <section className="panel" aria-label="Circuit">
        <div className="panel-head flex-wrap">
          <div>
            <div className="eyebrow">{topo.category === 'diode' ? 'Uncontrolled' : 'Controlled'} · {topo.devicesCount}</div>
            <h2 className="panel-title m-0">{topo.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={`btn btn-sm ${playing ? 'btn-amber' : 'btn-primary'}`} onClick={() => setPlaying((p) => !p)}>
              {playing ? '⏸ Pause' : '▶ Start'}
            </button>
            <button className="btn btn-sm" onClick={step} title="Advance 5°">⏭ Step</button>
            <button className="btn btn-sm" onClick={reset}>↻ Reset</button>
            <div className="seg" role="group" aria-label="Speed">
              {(Object.keys(SPEEDS) as Speed[]).map((k) => (
                <button key={k} data-on={speed === k} onClick={() => setSpeed(k)}>{k}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 pt-3">
          <div className="ckt mx-auto" style={{ maxWidth: 760 }}>
            <CircuitDiagram topo={topo} sample={sample} showFwd={showFwd} loadType={result.params.loadType} />
          </div>
          <input
            type="range" className="rng w-full mt-2" min={0} max={tMax} step={tMax / 1000} value={t}
            aria-label="Time scrubber" onChange={(e) => { setPlaying(false); setTime(+e.target.value); }}
          />
        </div>
        <div className="panel-body grid gap-3 sm:grid-cols-4" style={{ paddingTop: 8 }}>
          <Read k="time" v={`${t.toFixed(2)} ms`} />
          <Read k="θ = ωt" v={`${thetaDeg.toFixed(0)}°`} />
          <Read k="vo" v={`${sample.vo.toFixed(1)} V`} />
          <Read k="io" v={`${sample.io.toFixed(2)} A`} />
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-3 items-center">
          {result.deviceIds.map((d, i) => (
            <span key={d} className="flex items-center gap-1.5 readout text-xs" style={{ color: 'var(--muted)' }}>
              <i className="led" data-on={Math.abs(s.idev[i][idx]) > 1e-6} data-gate={s.gate[i][idx] > 0.5 && Math.abs(s.idev[i][idx]) <= 1e-6} />
              <span style={{ color: DEVICE_COLORS[i % 6] }}>{d}</span>
            </span>
          ))}
          {showFwd && topo.supportsFwd && result.params.loadType !== 'R' && (
            <span className="flex items-center gap-1.5 readout text-xs" style={{ color: 'var(--muted)' }}>
              <i className="led" data-on={sample.fwdOn} /> FWD
            </span>
          )}
          <span className="unit ml-auto">amber = conducting · green = gate pulse present</span>
        </div>
        <div className="px-4 pb-4"><div className="banner banner-info"><span aria-hidden>▸</span><span>{desc}</span></div></div>
      </section>

      <WaveformCard result={result} dark={dark} cursorMs={t} />
      <ConductionTable result={result} thetaDeg={thetaDeg} />
      <FwdCompare />
      <HowItWorks topology={result.topology} phase={sample.fwdOn ? -1 : (((thetaDeg % 360) + 360) % 360) / 360} />
    </>
  );
}

function Read({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
      <div className="unit">{k}</div>
      <div className="readout text-base" style={{ color: 'var(--text)' }}>{v}</div>
    </div>
  );
}

function describe(result: SimResult, fwd: boolean, conducting: string[], vo: number, io: number): string {
  if (fwd) return `Freewheeling diode conducts: load current ${io.toFixed(2)} A circulates through the load and the FWD, vo ≈ 0 V, so the source is disconnected.`;
  if (conducting.length === 0) {
    return io > 1e-6 ? 'Load current flows without a clear device path.' : `No device conducts: the load current is zero (discontinuous conduction) and ${result.params.loadType === 'RLE' ? `the load terminal sits at the back-EMF, vo = E = ${result.params.E} V.` : 'vo = 0 V.'}`;
  }
  const l = result.params.loadType !== 'R' && vo < -1e-3 ? ' Output voltage is negative here — the inductor releases stored energy back to the source.' : '';
  return `${conducting.join(' + ')} conduct${conducting.length === 1 ? 's' : ''}: vo = ${vo.toFixed(1)} V, io = ${io.toFixed(2)} A.${l}`;
}
