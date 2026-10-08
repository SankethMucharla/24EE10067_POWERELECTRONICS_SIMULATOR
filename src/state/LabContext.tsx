import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SimParams, SimResult, TheoryValues, TopologyId } from '../types';
import { TOPOLOGIES, FWD_DEFAULT_ON } from '../simulations/topologies';
import { simulateTopology } from '../simulations/engine';
import { computeTheory } from '../calculations/theory';
import { postWarnings, validateParams, type Validation } from '../calculations/validate';

export function defaultParams(id: TopologyId): SimParams {
  const t = TOPOLOGIES[id];
  return {
    vrms: t.vrmsDefault,
    freq: 50,
    loadType: 'RL',
    R: 10,
    L_mH: 20,
    E: 50,
    alpha: t.controlled ? 30 : 0,
    vf: 0,
    tSim_ms: 100,
    fwd: FWD_DEFAULT_ON.includes(id),
    startFromRest: false,
  };
}

interface Computed {
  result: SimResult;
  theory: TheoryValues;
  warnings: string[];
}

interface Lab {
  id: TopologyId;
  setId: (id: TopologyId) => void;
  params: SimParams;
  setParam: <K extends keyof SimParams>(k: K, v: SimParams[K]) => void;
  resetParams: () => void;
  autoCalc: boolean;
  setAutoCalc: (b: boolean) => void;
  computed: Computed | null;
  validation: Validation;
  stale: boolean;
  run: () => void;
  runToken: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const Ctx = createContext<Lab | null>(null);

function compute(id: TopologyId, p: SimParams): Computed | null {
  const v = validateParams(id, p);
  if (v.errors.length) return null;
  const result = simulateTopology(id, p);
  const theory = computeTheory(id, p);
  return { result, theory, warnings: postWarnings(id, p, result.metrics) };
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [id, setIdState] = useState<TopologyId>('fc-1ph');
  const [params, setParams] = useState<SimParams>(() => defaultParams('fc-1ph'));
  const [autoCalc, setAutoCalc] = useState(true);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [computedFor, setComputedFor] = useState<{ id: TopologyId; params: SimParams } | null>(null);
  const [runToken, setRunToken] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('rl-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('rl-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const validation = useMemo(() => validateParams(id, params), [id, params]);

  const setId = useCallback((next: TopologyId) => {
    setIdState((prev) => {
      if (prev === next) return prev;
      const a = TOPOLOGIES[prev];
      const b = TOPOLOGIES[next];
      setParams((p) => ({
        ...p,
        vrms: a.vrmsDefault === p.vrms || a.phases !== b.phases ? b.vrmsDefault : p.vrms,
        alpha: b.controlled ? (a.controlled ? p.alpha : 30) : 0,
        fwd: FWD_DEFAULT_ON.includes(next),
      }));
      return next;
    });
  }, []);

  const setParam = useCallback(<K extends keyof SimParams>(k: K, v: SimParams[K]) => {
    setParams((p) => ({ ...p, [k]: v }));
  }, []);

  const resetParams = useCallback(() => setParams(defaultParams(id)), [id]);

  const doCompute = useCallback((i: TopologyId, p: SimParams) => {
    const c = compute(i, p);
    setComputed(c);
    setComputedFor({ id: i, params: p });
  }, []);

  // live recompute
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      doCompute(id, params);
      return;
    }
    if (!autoCalc) return;
    const h = setTimeout(() => doCompute(id, params), 90);
    return () => clearTimeout(h);
  }, [id, params, autoCalc, doCompute]);

  // topology change always recomputes immediately, regardless of auto-calc
  const lastId = useRef(id);
  useEffect(() => {
    if (lastId.current !== id) {
      lastId.current = id;
      if (!autoCalc) doCompute(id, params);
    }
  }, [id, params, autoCalc, doCompute]);

  const run = useCallback(() => {
    doCompute(id, params);
    setRunToken((t) => t + 1);
  }, [id, params, doCompute]);

  const stale = useMemo(
    () => !computedFor || computedFor.id !== id || computedFor.params !== params,
    [computedFor, id, params],
  );

  const value: Lab = {
    id,
    setId,
    params,
    setParam,
    resetParams,
    autoCalc,
    setAutoCalc,
    computed,
    validation,
    stale,
    run,
    runToken,
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLab(): Lab {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLab outside LabProvider');
  return c;
}
