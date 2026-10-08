import type { ReactNode } from 'react';
import type { SimSeries } from '../types';
import type { TopologyDef } from '../simulations/topologies';

/** Instantaneous circuit state used to colour the schematic */
export interface CircSample {
  top: number;
  bot: number;
  fwdOn: boolean;
  gate: number[];
  vdev: number[];
  vin: number[];
  vo: number;
  io: number;
}

export function sampleAt(s: SimSeries, idx: number): CircSample {
  const i = Math.max(0, Math.min(s.n - 1, Math.round(idx)));
  return {
    top: s.top[i],
    bot: s.bot[i],
    fwdOn: s.fwdOn[i] === 1,
    gate: s.gate.map((g) => g[i]),
    vdev: s.vdev.map((g) => g[i]),
    vin: s.vin.map((g) => g[i]),
    vo: s.vo[i],
    io: s.io[i],
  };
}

interface Props {
  topo: TopologyDef;
  sample: CircSample | null;
  showFwd: boolean;
  loadType: 'R' | 'RL' | 'RLE';
  mini?: boolean;
}

const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

// ---------------------------------------------------------------- primitives
function Wire({ d, flow = 0 }: { d: string; flow?: number }) {
  return <path className={cx('wire', flow !== 0 && 'on', flow < 0 && 'rev')} d={d} />;
}
function Dot({ x, y, on }: { x: number; y: number; on?: boolean }) {
  return <circle className={cx('node', on && 'on')} cx={x} cy={y} r={3.6} />;
}

function Dev(props: {
  x: number;
  y: number;
  angle: number;
  kind: 'diode' | 'scr';
  label?: string;
  lx?: number;
  ly?: number;
  on: boolean;
  fwdBias: boolean;
  gate: boolean;
  anchor?: 'start' | 'middle' | 'end';
}) {
  const { x, y, angle, kind, label, on, fwdBias, gate } = props;
  const st = on ? 'on' : fwdBias ? 'fwdb' : '';
  return (
    <g>
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <path className={cx('sym', st)} d="M -28 0 H -12 M 10 0 H 28 M 10 -11 V 11" />
        <path className={cx('sym', st, 'tri')} d="M -12 -11 L -12 11 L 10 0 Z" />
        {kind === 'scr' && (
          <>
            <path className={cx('sym', st)} d="M 4 5 L 13 19 H 24" />
            <circle className={cx('gate-dot', gate && 'fire')} cx={27} cy={19} r={3.6} />
          </>
        )}
      </g>
      {label && (
        <text
          className={cx('lbl', on && 'on')}
          x={x + (props.lx ?? 0)}
          y={y + (props.ly ?? 0)}
          textAnchor={props.anchor ?? 'middle'}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Source({ x, y, label, r = 22, sub }: { x: number; y: number; label: string; r?: number; sub?: string }) {
  return (
    <g>
      <circle className="src-ring" cx={x} cy={y} r={r} />
      <path
        d={`M ${x - 12} ${y} q 6 -15 12 0 t 12 0`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <text x={x} y={y + r + 15} textAnchor="middle" className="lbl">
        {label}
      </text>
      {sub && (
        <text x={x} y={y + r + 29} textAnchor="middle" className="pol">
          {sub}
        </text>
      )}
    </g>
  );
}

/** Zig-zag resistor of length len along +x (local coords) */
function Resistor({ len }: { len: number }) {
  const n = 6;
  const lead = 14;
  const w = (len - 2 * lead) / n;
  let d = `M 0 0 H ${lead}`;
  for (let k = 0; k < n; k++) {
    const x0 = lead + k * w;
    d += ` L ${x0 + w * 0.25} -9 L ${x0 + w * 0.75} 9 L ${x0 + w} 0`;
  }
  d += ` H ${len}`;
  return <path d={d} />;
}
/** Coil (inductor) of length len along +x */
function Inductor({ len }: { len: number }) {
  const lead = 12;
  const n = 4;
  const r = (len - 2 * lead) / (2 * n);
  let d = `M 0 0 H ${lead}`;
  for (let k = 0; k < n; k++) d += ` a ${r} ${r} 0 0 1 ${2 * r} 0`;
  d += ` H ${len}`;
  return <path d={d} />;
}

function LoadSym({
  x,
  y,
  angle,
  len,
  rl,
  emf,
  on,
  mini,
}: {
  x: number;
  y: number;
  angle: number;
  len: number;
  rl: boolean;
  emf?: boolean;
  on: boolean;
  mini?: boolean;
}) {
  const rLen = emf ? len * 0.4 : rl ? len * 0.5 : len;
  const lLen = emf ? len * 0.35 : len - rLen;
  const eLen = emf ? len - rLen - lLen : 0;
  // text must stay upright, so place labels using the rotation
  const rad = (angle * Math.PI) / 180;
  const at = (u: number, v: number) => ({ x: x + u * Math.cos(rad) - v * Math.sin(rad), y: y + u * Math.sin(rad) + v * Math.cos(rad) });
  const lr = at(rLen / 2, angle === 0 || angle === 180 ? -20 : 0);
  const ll = at(rLen + lLen / 2, angle === 0 || angle === 180 ? -20 : 0);
  const le = at(rLen + lLen + eLen / 2, angle === 0 || angle === 180 ? -20 : 0);
  const vertical = Math.abs(Math.sin(rad)) > 0.5;
  return (
    <g>
      <g transform={`translate(${x} ${y}) rotate(${angle})`} className={cx('load', on && 'on')}>
        <g className={cx('load', on && 'on')}>
          <Resistor len={rLen} />
        </g>
        {rl && (
          <g transform={`translate(${rLen} 0)`} className={cx('load', on && 'on')}>
            <Inductor len={lLen} />
          </g>
        )}
        {emf && (
          <g transform={`translate(${rLen + lLen} 0)`} className={cx('load', on && 'on')}>
            <path d={`M 0 0 H ${eLen * 0.42} M ${eLen * 0.42} -11 V 11 M ${eLen * 0.58} -6 V 6 M ${eLen * 0.58} 0 H ${eLen}`} fill="none" strokeWidth={2} />
            <path d={`M ${eLen * 0.42 - 6} -12 h4 m-2 -2 v4`} fill="none" strokeWidth={1.2} />
          </g>
        )}
      </g>
      {!mini && (
        <>
          <text className="lbl" x={lr.x + (vertical ? 20 : 0)} y={lr.y + (vertical ? 4 : 0)} textAnchor="middle">
            R
          </text>
          {rl && (
            <text className="lbl" x={ll.x + (vertical ? 20 : 0)} y={ll.y + (vertical ? 4 : 0)} textAnchor="middle">
              L
            </text>
          )}
          {emf && (
            <text className="lbl" x={le.x + (vertical ? 20 : 0)} y={le.y + (vertical ? 4 : 0)} textAnchor="middle">
              E
            </text>
          )}
        </>
      )}
    </g>
  );
}

function Coil({ x, y1, y2, n, side }: { x: number; y1: number; y2: number; n: number; side: 'left' | 'right' }) {
  const r = (y2 - y1) / (2 * n);
  let d = `M ${x} ${y1}`;
  for (let k = 0; k < n; k++) d += ` a ${r} ${r} 0 0 ${side === 'right' ? 1 : 0} 0 ${2 * r}`;
  return <path className="load" d={d} />;
}

const sgn = (v: number) => (v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0);

// ---------------------------------------------------------------- state helpers
function useState_(topo: TopologyDef, s: CircSample | null) {
  const devOn = (k: number) => !!s && (s.top === k || s.bot === k);
  const anyOn = !!s && s.top >= 0;
  const fwdOn = !!s && s.fwdOn;
  const gate = (k: number) => !!s && s.gate[k] > 0.5;
  const fwdBias = (k: number) => !!s && !devOn(k) && s.vdev[k] > 1.0;
  const termSign = (t: number) => {
    if (!s) return 0;
    let v = 0;
    if (s.top >= 0 && topo.devices[s.top].terminal === t) v += 1;
    if (s.bot >= 0 && topo.devices[s.bot].terminal === t) v -= 1;
    return v;
  };
  return { devOn, anyOn, fwdOn, gate, fwdBias, termSign };
}

// ---------------------------------------------------------------- layouts
function LayoutSingle({ topo, s, showFwd, rl, emf, mini }: LP) {
  const st = useState_(topo, s);
  const d0 = topo.devices[0];
  const on = st.devOn(0);
  const load = st.anyOn || st.fwdOn;
  return (
    <svg viewBox="0 0 700 330" className="ckt w-full h-auto" role="img" aria-label={topo.name}>
      <Wire d="M 90 141 V 60 H 212" flow={on ? 1 : 0} />
      <Dev x={240} y={60} angle={0} kind={d0.kind} label={d0.id} ly={-24} on={on} fwdBias={st.fwdBias(0)} gate={st.gate(0)} />
      <Wire d="M 268 60 H 440" flow={on ? 1 : 0} />
      <Wire d="M 440 60 V 95" flow={load ? 1 : 0} />
      <LoadSym x={440} y={95} angle={90} len={150} rl={rl} emf={emf} on={load} mini={mini} />
      <Wire d="M 440 245 V 270" flow={load ? 1 : 0} />
      <Wire d="M 440 270 H 90 V 189" flow={on ? 1 : 0} />
      <Source x={90} y={165} label="vs" sub={mini ? undefined : 'source'} />
      <Dot x={440} y={60} on={load} />
      <Dot x={440} y={270} on={load} />
      {showFwd && (
        <>
          <Wire d="M 440 270 H 560 V 193" flow={st.fwdOn ? 1 : 0} />
          <Dev x={560} y={165} angle={-90} kind="diode" label="FWD" lx={34} ly={4} on={st.fwdOn} fwdBias={false} gate={false} anchor="start" />
          <Wire d="M 560 137 V 60 H 440" flow={st.fwdOn ? 1 : 0} />
        </>
      )}
      {!mini && (
        <>
          <text className="pol" x={420} y={50}>+</text>
          <text className="pol" x={420} y={292}>−</text>
          <text className="lbl" x={478} y={175}>vo</text>
        </>
      )}
    </svg>
  );
}

function LayoutCT({ topo, s, showFwd, rl, emf, mini }: LP) {
  const st = useState_(topo, s);
  const on1 = st.devOn(0);
  const on2 = st.devOn(1);
  const load = st.anyOn || st.fwdOn;
  const ip = on1 ? 1 : on2 ? -1 : 0;
  return (
    <svg viewBox="0 0 700 340" className="ckt w-full h-auto" role="img" aria-label={topo.name}>
      {/* source + transformer */}
      <Wire d="M 46 148 V 95 H 92" flow={ip} />
      <Wire d="M 92 245 H 46 V 192" flow={ip} />
      <Source x={46} y={170} label="vs" />
      <Coil x={92} y1={95} y2={245} n={5} side="left" />
      <path className="load" d="M 112 80 V 260 M 119 80 V 260" />
      <Coil x={138} y1={50} y2={290} n={8} side="right" />
      <text className="pol" x={104} y={282}>1 : 1 : 1</text>
      {/* diodes */}
      <Wire d="M 138 50 H 272" flow={on1 ? 1 : 0} />
      <Dev x={300} y={50} angle={0} kind="diode" label="D1" ly={-24} on={on1} fwdBias={st.fwdBias(0)} gate={false} />
      <Wire d="M 328 50 H 560 V 170" flow={on1 ? 1 : 0} />
      <Wire d="M 138 290 H 272" flow={on2 ? 1 : 0} />
      <Dev x={300} y={290} angle={0} kind="diode" label="D2" ly={30} on={on2} fwdBias={st.fwdBias(1)} gate={false} />
      <Wire d="M 328 290 H 560 V 170" flow={on2 ? 1 : 0} />
      {/* load (current P -> CT) */}
      <Wire d="M 560 170 H 470" flow={load ? 1 : 0} />
      <LoadSym x={470} y={170} angle={180} len={190} rl={rl} emf={emf} on={load} mini={mini} />
      <Wire d="M 280 170 H 138" flow={load ? 1 : 0} />
      <Dot x={560} y={170} on={load} />
      <Dot x={138} y={170} on={load} />
      {showFwd && (
        <>
          <Wire d="M 220 170 V 232 H 340" flow={st.fwdOn ? 1 : 0} />
          <Dev x={368} y={232} angle={0} kind="diode" label="FWD" ly={32} on={st.fwdOn} fwdBias={false} gate={false} />
          <Wire d="M 396 232 H 560 V 170" flow={st.fwdOn ? 1 : 0} />
          <Dot x={220} y={170} on={load || st.fwdOn} />
        </>
      )}
      {!mini && (
        <>
          <text className="lbl" x={150} y={152}>CT</text>
          <text className="pol" x={575} y={165}>+</text>
          <text className="lbl" x={500} y={214}>vo</text>
        </>
      )}
    </svg>
  );
}

function bridge1Geom() {
  const P = { x: 380, y: 50 };
  const A = { x: 110, y: 230 };
  const B = { x: 650, y: 230 };
  const N = { x: 380, y: 410 };
  return { P, A, B, N };
}

function LayoutBridge1({ topo, s, showFwd, rl, emf, mini }: LP) {
  const st = useState_(topo, s);
  const { P, A, B, N } = bridge1Geom();
  const load = st.anyOn || st.fwdOn;
  // map devices: connect(from -> to) for each device id by terminal and group
  const termNode = [A, B];
  type E = { k: number; from: { x: number; y: number }; to: { x: number; y: number } };
  const edges: E[] = topo.devices.map((dv, k) => {
    const t = termNode[dv.terminal];
    return dv.group === 'top' ? { k, from: t, to: P } : { k, from: N, to: t };
  });
  return (
    <svg viewBox="0 0 760 450" className="ckt w-full h-auto" role="img" aria-label={topo.name}>
      {/* source wires */}
      <Wire d={`M 50 286 V ${A.y} H ${A.x}`} flow={st.termSign(0)} />
      <Wire d={`M 50 334 V 440 H 710 V ${B.y} H ${B.x}`} flow={st.termSign(1)} />
      <Source x={50} y={310} label="vs" />
      {/* devices on the diamond edges */}
      {edges.map((e) => {
        const dv = topo.devices[e.k];
        const mx = (e.from.x + e.to.x) / 2;
        const my = (e.from.y + e.to.y) / 2;
        const ang = (Math.atan2(e.to.y - e.from.y, e.to.x - e.from.x) * 180) / Math.PI;
        const ux = Math.cos((ang * Math.PI) / 180);
        const uy = Math.sin((ang * Math.PI) / 180);
        const on = st.devOn(e.k);
        // outward label offset
        const outX = mx < 380 ? -1 : 1;
        const outY = my < 230 ? -1 : 1;
        const lx = outX * 38;
        const ly = outY * 30 + 4;
        return (
          <g key={dv.id}>
            <Wire d={`M ${e.from.x} ${e.from.y} L ${mx - 28 * ux} ${my - 28 * uy}`} flow={on ? 1 : 0} />
            <Wire d={`M ${mx + 28 * ux} ${my + 28 * uy} L ${e.to.x} ${e.to.y}`} flow={on ? 1 : 0} />
            <Dev x={mx} y={my} angle={ang} kind={dv.kind} label={dv.id} lx={lx} ly={ly} on={on} fwdBias={st.fwdBias(e.k)} gate={st.gate(e.k)} anchor="middle" />
          </g>
        );
      })}
      {/* load through the middle */}
      <Wire d={`M ${P.x} ${P.y} V 130`} flow={load ? 1 : 0} />
      <LoadSym x={380} y={130} angle={90} len={200} rl={rl} emf={emf} on={load} mini={mini} />
      <Wire d={`M 380 330 V ${N.y}`} flow={load ? 1 : 0} />
      <Dot x={P.x} y={P.y} on={load} />
      <Dot x={N.x} y={N.y} on={load} />
      <Dot x={A.x} y={A.y} on={st.termSign(0) !== 0} />
      <Dot x={B.x} y={B.y} on={st.termSign(1) !== 0} />
      {showFwd && (
        <>
          <Wire d="M 380 350 H 450 V 258" flow={st.fwdOn ? 1 : 0} />
          <Wire d="M 450 202 V 110 H 380" flow={st.fwdOn ? 1 : 0} />
          <Dev x={450} y={230} angle={-90} kind="diode" label="FWD" lx={34} ly={4} on={st.fwdOn} fwdBias={false} gate={false} anchor="start" />
          <Dot x={380} y={110} on={st.fwdOn} />
          <Dot x={380} y={350} on={st.fwdOn} />
        </>
      )}
      {!mini && (
        <>
          <text className="lbl" x={A.x - 8} y={A.y - 14} textAnchor="end">A</text>
          <text className="lbl" x={B.x + 8} y={B.y - 14}>B</text>
          <text className="pol" x={P.x + 12} y={P.y + 4}>P (+)</text>
          <text className="pol" x={N.x + 12} y={N.y + 4}>N (−)</text>
          <text className="lbl" x={334} y={232} textAnchor="end">vo</text>
        </>
      )}
    </svg>
  );
}

function LayoutHW3({ topo, s, showFwd, rl, emf, mini }: LP) {
  const st = useState_(topo, s);
  const rows = [80, 200, 320];
  const names = ['a', 'b', 'c'];
  const load = st.anyOn || st.fwdOn;
  const on = [st.devOn(0), st.devOn(1), st.devOn(2)];
  return (
    <svg viewBox="0 0 760 420" className="ckt w-full h-auto" role="img" aria-label={topo.name}>
      {rows.map((y, k) => (
        <g key={k}>
          <Wire d={`M 40 ${y} H 88`} flow={on[k] ? 1 : 0} />
          <Source x={110} y={y} r={22} label={`v${names[k]}`} />
          <Wire d={`M 132 ${y} H 212`} flow={on[k] ? 1 : 0} />
          <Dev x={240} y={y} angle={0} kind={topo.devices[k].kind} label={topo.devices[k].id} ly={-24} on={on[k]} fwdBias={st.fwdBias(k)} gate={st.gate(k)} />
        </g>
      ))}
      {/* neutral bus */}
      <Wire d="M 40 380 V 320" flow={load && !st.fwdOn ? 1 : 0} />
      <Wire d="M 40 320 V 200" flow={on[0] || on[1] ? 1 : 0} />
      <Wire d="M 40 200 V 80" flow={on[0] ? 1 : 0} />
      <Dot x={40} y={380} on={load} />
      {/* P bus */}
      <Wire d="M 268 80 H 380" flow={on[0] ? 1 : 0} />
      <Wire d="M 268 200 H 380" flow={on[1] ? 1 : 0} />
      <Wire d="M 268 320 H 380" flow={on[2] ? 1 : 0} />
      <Wire d="M 380 320 V 200" flow={on[2] ? 1 : 0} />
      <Wire d="M 380 200 V 80" flow={on[1] || on[2] ? 1 : 0} />
      <Wire d="M 380 80 H 560" flow={st.anyOn ? 1 : 0} />
      <Dot x={380} y={200} on={on[1] || on[2]} />
      <Dot x={380} y={320} on={on[2]} />
      <Dot x={380} y={80} on={st.anyOn} />
      <Wire d="M 560 80 V 125" flow={load ? 1 : 0} />
      <LoadSym x={560} y={125} angle={90} len={180} rl={rl} emf={emf} on={load} mini={mini} />
      <Wire d="M 560 305 V 380" flow={load ? 1 : 0} />
      <Wire d="M 560 380 H 40" flow={load ? 1 : 0} />
      <Dot x={560} y={80} on={load} />
      <Dot x={560} y={380} on={load} />
      {showFwd && (
        <>
          <Wire d="M 560 380 H 640 V 258" flow={st.fwdOn ? 1 : 0} />
          <Dev x={640} y={230} angle={-90} kind="diode" label="FWD" lx={34} ly={4} on={st.fwdOn} fwdBias={false} gate={false} anchor="start" />
          <Wire d="M 640 202 V 80 H 560" flow={st.fwdOn ? 1 : 0} />
        </>
      )}
      {!mini && (
        <>
          <text className="pol" x={20} y={400}>n (neutral)</text>
          <text className="pol" x={540} y={72}>+</text>
          <text className="lbl" x={600} y={215}>vo</text>
        </>
      )}
    </svg>
  );
}

function LayoutBridge3({ topo, s, showFwd, rl, emf, mini }: LP) {
  const st = useState_(topo, s);
  const xs = [300, 400, 500];
  const jy = [195, 230, 265];
  const load = st.anyOn || st.fwdOn;
  const topOn = (leg: number) => topo.devices.some((d, k) => d.group === 'top' && d.terminal === leg && st.devOn(k));
  const botOn = (leg: number) => topo.devices.some((d, k) => d.group === 'bot' && d.terminal === leg && st.devOn(k));
  const idxOf = (g: 'top' | 'bot', leg: number) => topo.devices.findIndex((d) => d.group === g && d.terminal === leg);
  const names = ['a', 'b', 'c'];
  const srcY = [90, 230, 370];
  return (
    <svg viewBox="0 0 820 470" className="ckt w-full h-auto" role="img" aria-label={topo.name}>
      {/* star point bus */}
      <Wire d="M 26 90 V 370" />
      {srcY.map((y, k) => (
        <g key={k}>
          <Wire d={`M 26 ${y} H 48`} flow={st.termSign(k)} />
          <Source x={70} y={y} r={22} label={`v${names[k]}`} />
        </g>
      ))}
      {/* phase wires */}
      <Wire d="M 92 90 H 150 V 195 H 300" flow={st.termSign(0)} />
      <Wire d="M 92 230 H 400" flow={st.termSign(1)} />
      <Wire d="M 92 370 H 150 V 265 H 500" flow={st.termSign(2)} />
      {/* legs */}
      {xs.map((x, leg) => {
        const t = idxOf('top', leg);
        const b = idxOf('bot', leg);
        const tOn = topOn(leg);
        const bOn = botOn(leg);
        return (
          <g key={leg}>
            <Wire d={`M ${x} ${jy[leg]} V 148`} flow={tOn ? 1 : 0} />
            <Dev x={x} y={120} angle={-90} kind={topo.devices[t].kind} label={topo.devices[t].id} lx={-30} ly={4} anchor="end" on={tOn} fwdBias={st.fwdBias(t)} gate={st.gate(t)} />
            <Wire d={`M ${x} 92 V 50`} flow={tOn ? 1 : 0} />
            <Wire d={`M ${x} 420 V 368`} flow={bOn ? 1 : 0} />
            <Dev x={x} y={340} angle={-90} kind={topo.devices[b].kind} label={topo.devices[b].id} lx={-30} ly={4} anchor="end" on={bOn} fwdBias={st.fwdBias(b)} gate={st.gate(b)} />
            <Wire d={`M ${x} 312 V ${jy[leg]}`} flow={bOn ? 1 : 0} />
            <Dot x={x} y={jy[leg]} on={tOn || bOn} />
          </g>
        );
      })}
      {/* P and N rails */}
      <Wire d="M 300 50 H 400" flow={topOn(0) ? 1 : 0} />
      <Wire d="M 400 50 H 500" flow={topOn(0) || topOn(1) ? 1 : 0} />
      <Wire d="M 500 50 H 640" flow={st.anyOn ? 1 : 0} />
      <Wire d="M 640 420 H 500" flow={st.anyOn ? 1 : 0} />
      <Wire d="M 500 420 H 400" flow={botOn(0) || botOn(1) ? 1 : 0} />
      <Wire d="M 400 420 H 300" flow={botOn(0) ? 1 : 0} />
      <Dot x={400} y={50} on={topOn(0) || topOn(1)} />
      <Dot x={500} y={50} on={st.anyOn} />
      <Dot x={400} y={420} on={botOn(0) || botOn(1)} />
      <Dot x={500} y={420} on={st.anyOn} />
      <Wire d="M 640 50 V 125" flow={load ? 1 : 0} />
      <LoadSym x={640} y={125} angle={90} len={190} rl={rl} emf={emf} on={load} mini={mini} />
      <Wire d="M 640 315 V 420" flow={load ? 1 : 0} />
      <Dot x={640} y={50} on={load} />
      <Dot x={640} y={420} on={load} />
      {showFwd && (
        <>
          <Wire d="M 640 420 H 740 V 258" flow={st.fwdOn ? 1 : 0} />
          <Dev x={740} y={230} angle={-90} kind="diode" label="FWD" lx={26} ly={4} anchor="start" on={st.fwdOn} fwdBias={false} gate={false} />
          <Wire d="M 740 202 V 50 H 640" flow={st.fwdOn ? 1 : 0} />
        </>
      )}
      {!mini && (
        <>
          <text className="pol" x={26} y={392}>star point</text>
          <text className="pol" x={310} y={40}>P (+)</text>
          <text className="pol" x={310} y={440}>N (−)</text>
          <text className="lbl" x={690} y={225}>vo</text>
        </>
      )}
    </svg>
  );
}

interface LP {
  topo: TopologyDef;
  s: CircSample | null;
  showFwd: boolean;
  rl: boolean;
  emf?: boolean;
  mini?: boolean;
}

export function CircuitDiagram({ topo, sample, showFwd, loadType, mini }: Props): ReactNode {
  const p: LP = { topo, s: sample, showFwd: showFwd && topo.supportsFwd && loadType !== 'R', rl: loadType !== 'R', emf: loadType === 'RLE', mini };
  switch (topo.id) {
    case 'hw-diode':
    case 'hw-scr-1ph':
      return <LayoutSingle {...p} />;
    case 'fw-ct-diode':
      return <LayoutCT {...p} />;
    case 'fw-bridge-diode':
    case 'fc-1ph':
    case 'sc-1ph':
      return <LayoutBridge1 {...p} />;
    case 'hw-diode-3ph':
    case 'hw-scr-3ph':
      return <LayoutHW3 {...p} />;
    default:
      return <LayoutBridge3 {...p} />;
  }
}
