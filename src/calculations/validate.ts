import type { Metrics, SimParams, TopologyId } from '../types';
import { TOPOLOGIES } from '../simulations/topologies';

export interface Validation {
  errors: string[];
  warnings: string[];
  infos: string[];
  /** per-field errors for the parameter panel */
  fields: Partial<Record<keyof SimParams, string>>;
}

export function validateParams(id: TopologyId, p: SimParams): Validation {
  const topo = TOPOLOGIES[id];
  const v: Validation = { errors: [], warnings: [], infos: [], fields: {} };
  const err = (k: keyof SimParams, msg: string) => {
    v.errors.push(msg);
    v.fields[k] = msg;
  };
  if (!Number.isFinite(p.vrms) || p.vrms <= 0) err('vrms', 'Source voltage must be greater than zero.');
  else if (p.vrms > 20000) err('vrms', 'Voltage above 20 kV is outside the range of this simulator.');
  if (!Number.isFinite(p.freq) || p.freq <= 0) err('freq', 'Frequency must be greater than zero.');
  else if (p.freq > 1000) err('freq', 'Frequency above 1 kHz is outside the range of this simulator.');
  if (!Number.isFinite(p.R) || p.R <= 0) err('R', 'Resistance must be greater than zero.');
  if (p.loadType !== 'R') {
    if (!Number.isFinite(p.L_mH) || p.L_mH < 0) err('L_mH', 'Inductance cannot be negative.');
    else if (p.L_mH === 0) v.warnings.push('L = 0 mH: the RL load behaves exactly like a purely resistive load.');
  }
  if (p.loadType === 'RLE') {
    if (!Number.isFinite(p.E) || p.E < 0) err('E', 'Back-EMF must be zero or positive (the diodes/SCRs cannot take a negative E for a one-quadrant load).');
    else {
      const peak = topo.phases === 3 && topo.hasBottom ? Math.SQRT2 * p.vrms : topo.peakFromVrms(p.vrms);
      if (p.E >= peak) v.warnings.push(`E ≥ the peak bridge voltage (${peak.toFixed(1)} V): the load never conducts, i = 0 and vo = E.`);
    }
  }
  if (topo.controlled) {
    if (!Number.isFinite(p.alpha) || p.alpha < 0 || p.alpha > 180)
      err('alpha', 'Firing angle α must lie between 0° and 180°.');
  }
  if (!Number.isFinite(p.vf) || p.vf < 0) err('vf', 'Forward voltage drop cannot be negative.');
  else if (p.vf > 0.1 * Math.SQRT2 * p.vrms) v.warnings.push('Forward drop is more than 10 % of the source peak — results will deviate strongly from ideal theory.');
  if (!Number.isFinite(p.tSim_ms) || p.tSim_ms < 1) err('tSim_ms', 'Simulation time must be at least 1 ms.');
  else if (p.tSim_ms * p.freq > 200000) err('tSim_ms', 'Simulation window must not exceed 200 cycles.');
  if (p.vf > 0 && v.errors.length === 0) v.infos.push('Theory columns assume ideal devices (Vf = 0); the error shown includes the effect of the forward drop.');
  return v;
}

/** warnings that need the simulation result */
export function postWarnings(id: TopologyId, p: SimParams, m: Metrics): string[] {
  const topo = TOPOLOGIES[id];
  const w: string[] = [];
  const isRL = p.loadType !== 'R' && p.L_mH > 0;
  if (isRL && m.mode === 'discontinuous') {
    if (id === 'fc-1ph')
      w.push('Load current is DISCONTINUOUS: Vdc = (2Vm/π)cos α only holds for continuous current. The simulator uses Vdc = (Vm/π)(cos α − cos β) instead.');
    else if (id === 'fc-3ph' || id === 'hw-scr-3ph' || id === 'hw-diode-3ph')
      w.push('Load current is DISCONTINUOUS: the continuous-conduction formula for Vdc does not apply. Increase L or decrease α to restore continuous conduction.');
    else if (id === 'hw-diode' || id === 'hw-scr-1ph')
      w.push('Half-wave circuit: the current extends past the voltage zero crossing up to the extinction angle β, so Vdc is lower than for an R load. Add a freewheeling diode to remove the negative part of vo.');
  }
  if (topo.controlled && p.alpha > 90 && (id === 'fc-1ph' || id === 'fc-3ph') && isRL && p.loadType === 'RL' && m.mode === 'continuous')
    w.push('α > 90°: the converter is in inverter mode (Vdc < 0) but a passive load cannot return energy, so continuous current is not sustainable without a back-EMF source.');
  if (topo.controlled && p.alpha > 90 && (id === 'fc-1ph' || id === 'fc-3ph') && m.mode !== 'continuous')
    w.push('α > 90° with a passive load: conduction occurs only in short pulses (discontinuous), so the average output stays positive.');
  return w;
}
