import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import type { SimResult } from '../types';
import { TOPOLOGIES } from '../simulations/topologies';
import { stepify } from '../utils/steps';

export type PanelId = 'vin' | 'gate' | 'vo' | 'io' | 'idev' | 'vdev' | 'iin' | 'ifw' | 'vfw';

const PANEL_LABEL: Record<PanelId, string> = {
  vin: 'Input voltage',
  gate: 'Gate pulses',
  vo: 'Output voltage',
  io: 'Load current',
  idev: 'Device current',
  vdev: 'Device voltage',
  iin: 'Source current',
  ifw: 'Freewheeling diode current',
  vfw: 'Freewheeling diode voltage',
};
const PANEL_ORDER: PanelId[] = ['vin', 'gate', 'vo', 'io', 'ifw', 'vfw', 'idev', 'vdev', 'iin'];
const VOLT_PANELS: PanelId[] = ['vin', 'vo', 'vdev', 'vfw'];

export const DEVICE_COLORS = ['#22d3ee', '#f472b6', '#a3e635', '#fb923c', '#a78bfa', '#34d399'];
const PHASE_COLORS = ['#f87171', '#facc15', '#60a5fa'];

interface Fig {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  height: number;
}

function buildFigure(result: SimResult, panels: PanelId[], dark: boolean, compact: boolean, normalized: boolean, vdevSel: number[]): Fig {
  const s = result.series;
  const topo = TOPOLOGIES[result.topology];
  const m = result.metrics;
  const nDev = result.deviceIds.length;
  const font = dark ? '#8da2c4' : '#53647f';
  const grid = dark ? 'rgba(120,160,220,0.13)' : 'rgba(60,90,140,0.13)';
  const zero = dark ? 'rgba(170,200,250,0.38)' : 'rgba(40,70,120,0.4)';
  const x = s.t_ms;

  const heights: Record<PanelId, number> = { vin: 190, gate: 170, vo: 210, io: 210, idev: 190, vdev: 190, iin: 190, ifw: 170, vfw: 170 };
  const gap = 30;
  const fwdActive = result.params.fwd && topo.supportsFwd && result.params.loadType !== 'R';
  const list = panels.filter((p) => (p === 'gate' ? result.deviceKinds.includes('scr') : p === 'ifw' || p === 'vfw' ? fwdActive : true));
  const plotH = list.reduce((a, p) => a + heights[p], 0) + gap * Math.max(0, list.length - 1);
  const margin = { t: 14, b: compact ? 150 : 52, l: 70, r: compact ? 14 : 120 };
  const totalH = plotH + margin.t + margin.b;

  const data: Plotly.Data[] = [];
  const layout: Record<string, unknown> = {};
  let top = 0;
  const yName = (i: number) => (i === 0 ? 'y' : `y${i + 1}`);
  const yKey = (i: number) => (i === 0 ? 'yaxis' : `yaxis${i + 1}`);
  // bottom panel gets 'y' so the shared time axis anchors there
  const rev = [...list].reverse();
  const idxOf = (p: PanelId) => rev.indexOf(p);
  const domOf: Partial<Record<PanelId, [number, number]>> = {};

  list.forEach((p) => {
    const i = idxOf(p);
    const h = heights[p];
    const dom: [number, number] = [1 - (top + h) / plotH, 1 - top / plotH];
    top += h + gap;
    domOf[p] = dom;
    const title = normalized ? 'p.u.' : VOLT_PANELS.includes(p) ? 'V' : 'A';
    layout[yKey(i)] = {
      domain: dom,
      anchor: 'x',
      title: { text: PANEL_LABEL[p] + (p === 'gate' ? '' : ` (${title})`), font: { size: 11, color: font }, standoff: 6 },
      gridcolor: grid,
      zerolinecolor: zero,
      zerolinewidth: 1.2,
      tickfont: { size: 10.5, color: font },
      linecolor: grid,
      automargin: false,
      fixedrange: false,
      ...(p === 'gate' ? { showticklabels: true, zeroline: false } : {}),
    };
  });

  const mk = (
    p: PanelId,
    name: string,
    y: ArrayLike<number>,
    color: string,
    opts: Record<string, unknown> = {},
  ) => {
    const noStep = opts.noStep === true;
    const { noStep: _ns, ...rest } = opts;
    void _ns;
    const sx = noStep ? Array.from(x) : stepify(x, y).x;
    const sy = noStep ? Array.from(y) : stepify(x, y).y;
    const unit = normalized ? 'p.u.' : VOLT_PANELS.includes(p) ? 'V' : 'A';
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: sx,
      y: sy,
      name,
      yaxis: yName(idxOf(p)),
      line: { color, width: 1.7, shape: 'linear' },
      legendgroup: p,
      hovertemplate: `${name} = %{y:.3f} ${unit}<extra></extra>`,
      ...rest,
    } as Plotly.Data);
  };
  const constLine = (p: PanelId, name: string, v: number, color: string) => {
    if (!Number.isFinite(v)) return;
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: [x[0], x[x.length - 1]],
      y: [v, v],
      name,
      yaxis: yName(idxOf(p)),
      line: { color, width: 1.3, dash: 'dash' },
      legendgroup: p,
      hovertemplate: `${name} = ${v.toFixed(2)} ${VOLT_PANELS.includes(p) ? 'V' : 'A'}<extra></extra>`,
    } as Plotly.Data);
  };

  for (const p of list) {
    if (p === 'vin') {
      if (topo.phases === 3) s.vin.forEach((v, k) => mk('vin', `v${'abc'[k]}`, v, PHASE_COLORS[k]));
      else mk('vin', 'vs', s.vin[0], '#60a5fa');
    }
    if (p === 'gate') {
      const scr = result.deviceKinds.map((k, j) => (k === 'scr' ? j : -1)).filter((j) => j >= 0);
      scr.forEach((j, n) => {
        const off = (scr.length - 1 - n) * 1.25;
        const y = Array.from(s.gate[j], (g) => g * 0.85 + off);
        mk('gate', `g(${result.deviceIds[j]})`, y, DEVICE_COLORS[j % 6], {
          noStep: true,
          customdata: Array.from(s.gate[j]),
          hovertemplate: `gate ${result.deviceIds[j]}: %{customdata:.0f}<extra></extra>`,
          line: { color: DEVICE_COLORS[j % 6], width: 1.7, shape: 'hv' },
        });
      });
      layout[yKey(idxOf('gate'))] = {
        ...(layout[yKey(idxOf('gate'))] as object),
        tickmode: 'array',
        tickvals: scr.map((_, n) => (scr.length - 1 - n) * 1.25 + 0.4),
        ticktext: scr.map((j) => result.deviceIds[j]),
        range: [-0.2, (scr.length - 1) * 1.25 + 1.2],
        fixedrange: true,
      };
    }
    if (p === 'vo') {
      mk('vo', 'vo', s.vo, '#22d3ee', { fill: 'tozeroy', fillcolor: dark ? 'rgba(34,211,238,0.07)' : 'rgba(14,127,163,0.08)' });
      constLine('vo', 'Vdc (avg)', m.Vdc, '#fbbf24');
      if (result.params.loadType === 'RLE') constLine('vo', 'E (back-EMF)', result.params.E, '#f472b6');
    }
    if (p === 'io') {
      mk('io', 'io', s.io, '#f59e0b');
      constLine('io', 'Idc (avg)', m.Idc, '#22d3ee');
    }
    if (p === 'ifw') {
      mk('ifw', 'i_FW', s.iFwd, '#a78bfa', { fill: 'tozeroy', fillcolor: 'rgba(167,139,250,0.18)' });
    }
    if (p === 'vfw') {
      mk('vfw', 'v_FW', s.vFwd, '#c084fc');
    }
    if (p === 'idev') s.idev.forEach((v, j) => mk('idev', `i(${result.deviceIds[j]})`, v, DEVICE_COLORS[j % 6]));
    if (p === 'vdev')
      s.vdev.forEach((v, j) =>
        mk('vdev', `v(${result.deviceIds[j]})`, v, DEVICE_COLORS[j % 6], { visible: vdevSel.includes(j) ? true : 'legendonly' }),
      );
    if (p === 'iin') {
      if (topo.phases === 3) s.iin.forEach((v, k) => mk('iin', `i${'abc'[k]}`, v, PHASE_COLORS[k]));
      else mk('iin', 'is', s.iin[0], '#60a5fa');
    }
  }

  if (normalized) {
    const groups = new Map<string, number>();
    for (const d of data as unknown as { legendgroup: string; y: number[] }[]) {
      if (d.legendgroup === 'gate') continue;
      let m = groups.get(d.legendgroup) ?? 0;
      for (const v of d.y) if (Math.abs(v) > m) m = Math.abs(v);
      groups.set(d.legendgroup, m);
    }
    for (const d of data as unknown as { legendgroup: string; y: number[] }[]) {
      const m = groups.get(d.legendgroup);
      if (!m || d.legendgroup === 'gate') continue;
      d.y = d.y.map((v) => v / m);
    }
  }

  // shaded freewheeling-conduction intervals
  const shapes: Record<string, unknown>[] = [];
  if (fwdActive) {
    const ivs: [number, number][] = [];
    let a = -1;
    for (let i = 0; i < s.n; i++) {
      if (s.fwdOn[i] === 1 && a < 0) a = i;
      if ((s.fwdOn[i] !== 1 || i === s.n - 1) && a >= 0) {
        ivs.push([x[a], x[i === s.n - 1 && s.fwdOn[i] === 1 ? i : i - 1]]);
        a = -1;
      }
    }
    for (const pn of ['vo', 'io', 'ifw', 'vfw'] as PanelId[]) {
      const dm = domOf[pn];
      if (!dm) continue;
      for (const [t0, t1] of ivs)
        shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: t0, x1: t1, y0: dm[0], y1: dm[1], fillcolor: 'rgba(167,139,250,0.10)', line: { width: 0 }, layer: 'below' });
    }
  }

  const bottom = yName(0);
  const full: Partial<Plotly.Layout> = {
    height: totalH,
    margin,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'IBM Plex Mono, ui-monospace, monospace', color: font, size: 11 },
    hovermode: 'x unified',
    hoverlabel: { font: { size: 11 }, bgcolor: dark ? '#0c1424' : '#ffffff', bordercolor: dark ? '#2a3d63' : '#b7c4da' },
    dragmode: 'pan',
    showlegend: true,
    legend: compact
      ? { orientation: 'h', x: 0, y: -0.02, yanchor: 'top', font: { size: 11 } }
      : { orientation: 'v', x: 1.01, y: 1, xanchor: 'left', font: { size: 11 }, tracegroupgap: 14 },
    xaxis: {
      title: { text: 'Time (ms)', font: { size: 11, color: font }, standoff: 8 },
      range: [x[0], x[x.length - 1]],
      anchor: bottom as 'y',
      gridcolor: grid,
      zeroline: false,
      tickfont: { size: 10.5, color: font },
      showspikes: true,
      spikemode: 'across',
      spikethickness: 1,
      spikecolor: dark ? '#5d7196' : '#8a99b2',
      spikedash: 'solid',
      linecolor: grid,
    },
    shapes: shapes as unknown as Plotly.Layout['shapes'],
    // zoom is kept while parameters change; a different panel set or scale mode starts fresh so axes never inherit another panel's range
    uirevision: `${result.topology}|${list.join('.')}|${result.params.loadType}|${fwdActive}|${normalized}`,
    ...(layout as object),
  };
  return { data, layout: full, height: totalH };
}

interface Props {
  result: SimResult;
  dark: boolean;
  cursorMs: number;
}

function WaveformCardImpl({ result, dark, cursorMs }: Props) {
  const topo = TOPOLOGIES[result.topology];
  const fwdActive = result.params.fwd && topo.supportsFwd && result.params.loadType !== 'R';
  const defaultPanels: PanelId[] = [
    ...(topo.controlled ? (['vin', 'gate', 'vo', 'io'] as PanelId[]) : (['vin', 'vo', 'io'] as PanelId[])),
    ...(fwdActive ? (['ifw', 'vfw'] as PanelId[]) : []),
    'idev',
    'vdev',
  ];
  const [panels, setPanels] = useState<PanelId[]>(defaultPanels);
  const [dragmode, setDragmode] = useState<'pan' | 'zoom'>('pan');
  const [normalized, setNormalized] = useState(false);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  const applying = useRef(false);
  autoRef.current = auto;
  const [vdevSel, setVdevSel] = useState<number[]>([0]);
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const lastTopo = useRef(result.topology);

  // reset the panel selection when switching topology
  useEffect(() => {
    if (lastTopo.current !== result.topology) {
      lastTopo.current = result.topology;
      setPanels(defaultPanels);
      setVdevSel([0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.topology]);

  const lastFwd = useRef(fwdActive);
  useEffect(() => {
    if (lastFwd.current === fwdActive) return;
    lastFwd.current = fwdActive;
    setPanels((cur) => (fwdActive ? Array.from(new Set([...cur, 'ifw', 'vfw'] as PanelId[])) : cur.filter((q) => q !== 'ifw' && q !== 'vfw')));
  }, [fwdActive]);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => {
      const w = e[0].contentRect.width;
      setWidth(w);
      if (plotRef.current && (plotRef.current as unknown as { data?: unknown }).data) {
        try {
          Plotly.Plots.resize(plotRef.current);
        } catch {
          /* ignore */
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = width < 720;
  const ordered = useMemo(() => PANEL_ORDER.filter((p) => panels.includes(p)), [panels]);
  const fig = useMemo(() => buildFigure(result, ordered, dark, compact, normalized, vdevSel), [result, ordered, dark, compact, normalized, vdevSel]);

  /** oscilloscope AUTOSET: show 2 cycles triggered on the rising zero crossing of the source voltage, and fit every vertical axis to the visible trace */
  const computeAuto = useCallback((): Record<string, unknown> => {
    const tt = result.series.t_ms;
    const t1 = tt[result.series.n - 1];
    const T = 1000 / result.params.freq;
    const total = Math.max(1, Math.round(t1 / T));
    const nc = Math.min(2, total);
    const a = (total - nc) * T;
    const b = Math.min(t1, a + nc * T);
    const upd: Record<string, unknown> = { 'xaxis.range': [a, b] };
    const lo = new Map<string, number>();
    const hi = new Map<string, number>();
    const skip = new Set<string>();
    for (const k of Object.keys(fig.layout)) {
      if (/^yaxis\d*$/.test(k) && (fig.layout as Record<string, { fixedrange?: boolean }>)[k]?.fixedrange) skip.add(k);
    }
    for (const tr of fig.data as unknown as { x: ArrayLike<number>; y: ArrayLike<number>; yaxis?: string }[]) {
      const ak = !tr.yaxis || tr.yaxis === 'y' ? 'yaxis' : 'yaxis' + tr.yaxis.slice(1);
      if (skip.has(ak)) continue;
      let mn = lo.get(ak) ?? Infinity;
      let mx = hi.get(ak) ?? -Infinity;
      for (let i = 0; i < tr.x.length; i++) {
        const x = tr.x[i];
        if (x < a - 1e-9 || x > b + 1e-9) continue;
        const y = tr.y[i];
        if (y < mn) mn = y;
        if (y > mx) mx = y;
      }
      lo.set(ak, mn);
      hi.set(ak, mx);
    }
    lo.forEach((mn, ak) => {
      let mx = hi.get(ak) as number;
      if (!Number.isFinite(mn) || !Number.isFinite(mx)) return;
      mn = Math.min(mn, 0);
      mx = Math.max(mx, 0);
      const span = mx - mn || 2;
      upd[`${ak}.range`] = [mn - 0.08 * span, mx + 0.08 * span];
    });
    return upd;
  }, [fig, result]);

  const applyAuto = useCallback(() => {
    const el = plotRef.current;
    if (!el) return;
    applying.current = true;
    Promise.resolve(Plotly.relayout(el, computeAuto() as Partial<Plotly.Layout>)).finally(() => {
      applying.current = false;
    });
  }, [computeAuto]);

  const placeCursor = useCallback(() => {
    const gd = plotRef.current as unknown as { _fullLayout?: { xaxis?: { _offset: number; l2p: (v: number) => number; range: number[]; _length: number }; _size?: { t: number; h: number } } } | null;
    const cur = cursorRef.current;
    if (!gd || !cur || !gd._fullLayout?.xaxis || !gd._fullLayout._size) return;
    const xa = gd._fullLayout.xaxis;
    const [r0, r1] = xa.range;
    if (cursorMs < r0 || cursorMs > r1) {
      cur.style.opacity = '0';
      return;
    }
    cur.style.opacity = '1';
    cur.style.transform = `translateX(${xa._offset + xa.l2p(cursorMs)}px)`;
    cur.style.top = `${4 + gd._fullLayout._size.t}px`;
    cur.style.height = `${gd._fullLayout._size.h}px`;
  }, [cursorMs]);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    let cancelled = false;
    const config: Partial<Plotly.Config> = {
      responsive: true,
      displaylogo: false,
      scrollZoom: false, // mouse wheel / trackpad scrolling must scroll the page, never zoom the scope
      doubleClick: 'reset',
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'],
      toImageButtonOptions: { filename: `rectifier-${result.topology}`, format: 'png', scale: 2 },
    };
    Plotly.react(el, fig.data, { ...fig.layout, dragmode }, config).then(() => {
      if (cancelled) return;
      placeCursor();
      if (autoRef.current) applyAuto();
    });
    const handler = (ev?: Record<string, unknown>) => {
      placeCursor();
      if (!applying.current && ev && Object.keys(ev).some((k) => /^(x|y)axis\d*\.(range|autorange)/.test(k))) setAuto(false);
    };
    const onHover = (ev: { points?: { x: number }[] }) => {
      const px = ev.points?.[0]?.x;
      if (typeof px === 'number') setHoverMs(px);
    };
    const onUnhover = () => setHoverMs(null);
    (el as unknown as { on: (e: string, f: (a?: never) => void) => void }).on('plotly_hover', onHover as never);
    (el as unknown as { on: (e: string, f: () => void) => void }).on('plotly_unhover', onUnhover);
    (el as unknown as { on: (e: string, f: (a?: never) => void) => void }).on('plotly_relayout', handler as never);
    (el as unknown as { on: (e: string, f: () => void) => void }).on('plotly_afterplot', handler);
    return () => {
      cancelled = true;
      try {
        (el as unknown as { removeAllListeners: (e: string) => void }).removeAllListeners('plotly_relayout');
        (el as unknown as { removeAllListeners: (e: string) => void }).removeAllListeners('plotly_hover');
        (el as unknown as { removeAllListeners: (e: string) => void }).removeAllListeners('plotly_unhover');
        (el as unknown as { removeAllListeners: (e: string) => void }).removeAllListeners('plotly_afterplot');
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fig, dragmode]);

  useEffect(() => {
    placeCursor();
  }, [placeCursor]);

  useEffect(() => {
    const el = plotRef.current;
    return () => {
      if (el) Plotly.purge(el);
    };
  }, []);

  const resetZoom = () => {
    const el = plotRef.current;
    if (!el) return;
    setAuto(false);
    const upd: Record<string, unknown> = { 'xaxis.range': [result.series.t_ms[0], result.series.t_ms[result.series.n - 1]] };
    for (let i = 0; i < 8; i++) upd[`${i === 0 ? 'yaxis' : 'yaxis' + (i + 1)}.autorange`] = true;
    Plotly.relayout(el, upd as Partial<Plotly.Layout>);
  };

  const zoomBy = (k: number) => {
    setAuto(false);
    const el = plotRef.current as unknown as { _fullLayout?: { xaxis?: { range: number[] } } } | null;
    const xa = el?._fullLayout?.xaxis;
    if (!el || !xa) return;
    const [r0, r1] = xa.range;
    const t0 = result.series.t_ms[0];
    const t1 = result.series.t_ms[result.series.n - 1];
    const c = (r0 + r1) / 2;
    let h = ((r1 - r0) / 2) * k;
    h = Math.min(h, (t1 - t0) / 2);
    h = Math.max(h, 0.05);
    let a = c - h;
    let b = c + h;
    if (a < t0) { b += t0 - a; a = t0; }
    if (b > t1) { a -= b - t1; b = t1; }
    Plotly.relayout(el as unknown as HTMLElement, { 'xaxis.range': [Math.max(a, t0), Math.min(b, t1)] } as Partial<Plotly.Layout>);
  };
  const zoomTo = (cycles: number | 'switch') => {
    setAuto(false);
    const T = 1000 / result.params.freq;
    const w = cycles === 'switch' ? T / (2 * TOPOLOGIES[result.topology].pulses) : T * cycles;
    const t0 = result.series.t_ms[0];
    const t1 = result.series.t_ms[result.series.n - 1];
    const a = Math.max(t0, t1 - w);
    Plotly.relayout(plotRef.current as unknown as HTMLElement, { 'xaxis.range': [a, t1] } as Partial<Plotly.Layout>);
  };

  const available = PANEL_ORDER.filter((p) => (p === 'gate' ? topo.controlled : p === 'ifw' || p === 'vfw' ? fwdActive : true));
  const toggle = (p: PanelId) =>
    setPanels((cur) => (cur.includes(p) ? (cur.length > 1 ? cur.filter((q) => q !== p) : cur) : [...cur, p]));

  return (
    <section className="panel" aria-label="Waveforms">
      <div className="panel-head flex-wrap">
        <div>
          <div className="eyebrow">Oscilloscope</div>
          <h2 className="panel-title m-0">Waveforms</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg" role="group" aria-label="Drag mode">
            <button data-on={dragmode === 'pan'} onClick={() => setDragmode('pan')} title="Drag to pan">
              Pan
            </button>
            <button data-on={dragmode === 'zoom'} onClick={() => setDragmode('zoom')} title="Drag a box to zoom">
              Zoom
            </button>
          </div>
          <div className="seg" role="group" aria-label="Zoom">
            <button onClick={() => zoomBy(0.5)} aria-label="Zoom in" title="Zoom in">＋</button>
            <button onClick={() => zoomBy(2)} aria-label="Zoom out" title="Zoom out">－</button>
          </div>
          <div className="seg" role="group" aria-label="Autoset">
            <button
              data-on={auto}
              aria-pressed={auto}
              title="Autoset: show 2 cycles from the rising zero crossing and fit every vertical axis to its trace. Stays on until you pan or zoom."
              onClick={() => {
                const next = !auto;
                setAuto(next);
                if (next) applyAuto();
              }}
            >
              Auto
            </button>
          </div>
          <button className="btn btn-sm" onClick={resetZoom}>
            Reset zoom
          </button>
          <div className="seg" role="group" aria-label="Value scale">
            <button data-on={!normalized} onClick={() => setNormalized(false)} title="Real volts, amps and ms">Actual</button>
            <button data-on={normalized} onClick={() => setNormalized(true)} title="Each panel divided by its own peak">Normalized</button>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 flex flex-wrap gap-2" role="group" aria-label="Visible panels">
        {available.map((p) => (
          <button key={p} className="chip" data-on={panels.includes(p)} onClick={() => toggle(p)}>
            {PANEL_LABEL[p]}
          </button>
        ))}
        <span className="unit self-center ml-1">click legend entries to hide/show a trace · use the ＋ － buttons or Zoom mode to zoom · double-click = reset</span>
      </div>
      <div className="px-4 pt-2 flex flex-wrap gap-1.5">
        <span className="unit self-center mr-1">zoom to</span>
        <button className="chip" onClick={() => zoomTo('switch')}>one switching interval</button>
        <button className="chip" onClick={() => zoomTo(1)}>one cycle</button>
        <button className="chip" onClick={() => zoomTo(5)}>5 cycles</button>
      </div>
      {panels.includes('vdev') && (
        <div className="px-4 pt-2 flex flex-wrap items-center gap-1.5">
          <span className="unit mr-1">device voltage shown for</span>
          {result.deviceIds.map((d, j) => (
            <button
              key={d}
              className="chip"
              data-on={vdevSel.includes(j)}
              onClick={() => setVdevSel((c) => (c.includes(j) ? (c.length > 1 ? c.filter((x) => x !== j) : c) : [...c, j]))}
            >
              v({d})
            </button>
          ))}
          <span className="unit" style={{ whiteSpace: 'normal' }}>anode − cathode: &gt; 0 forward blocking · ≈ 0 conducting · &lt; 0 reverse blocking</span>
        </div>
      )}
      <ScopeReadout result={result} ms={hoverMs ?? cursorMs} hovering={hoverMs !== null} />
      <div ref={hostRef} className="relative px-1 pb-2 pt-1" style={{ minHeight: 320 }}>
        <div ref={plotRef} style={{ width: '100%', height: fig.height }} />
        <div
          ref={cursorRef}
          aria-hidden
          style={{
            position: 'absolute', left: 4, top: 0, width: 0, height: 0, pointerEvents: 'none',
            borderLeft: '1.5px dashed var(--amber)', opacity: 0, willChange: 'transform',
          }}
        />
      </div>
    </section>
  );
}

export const WaveformCard = memo(WaveformCardImpl);

function ScopeReadout({ result, ms, hovering }: { result: SimResult; ms: number; hovering: boolean }) {
  const s = result.series;
  const t0 = s.t_ms[0];
  const t1 = s.t_ms[s.n - 1];
  const idx = Math.max(0, Math.min(s.n - 1, Math.round(((ms - t0) / (t1 - t0 || 1)) * (s.n - 1))));
  const fwd = result.params.fwd && TOPOLOGIES[result.topology].supportsFwd && result.params.loadType !== 'R';
  return (
    <div className="mx-4 mt-2 rounded-lg px-3 py-2 readout text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }} aria-live="off">
      <span style={{ color: 'var(--amber)' }}>{hovering ? 'cursor' : 'playback'}</span>
      <span>t = {s.t_ms[idx].toFixed(2)} ms</span>
      <span>Vo = {s.vo[idx].toFixed(1)} V</span>
      <span>Io = {s.io[idx].toFixed(2)} A</span>
      {result.deviceIds.map((d, j) => {
        const on = Math.abs(s.idev[j][idx]) > 1e-6;
        const v = s.vdev[j][idx];
        const why = on ? '' : v > 0.5 ? ` (fwd blocking ${v.toFixed(0)} V)` : v < -0.5 ? ` (rev blocking ${(-v).toFixed(0)} V)` : '';
        return (
          <span key={d} style={{ color: on ? 'var(--amber)' : 'var(--faint)' }}>
            {d} = {on ? 'ON' : 'OFF'}{why}
          </span>
        );
      })}
      {fwd && <span style={{ color: s.fwdOn[idx] ? '#a78bfa' : 'var(--faint)' }}>FWD = {s.fwdOn[idx] ? 'ON' : 'OFF'}</span>}
    </div>
  );
}
