import { simulateTopology } from '../engine';
import type { SimParams, SimResult } from '../../types';
export const simulateThreePhaseHalfControlled = (p: SimParams): SimResult => simulateTopology('hw-scr-3ph', p);
export const simulateThreePhaseFullControlled = (p: SimParams): SimResult => simulateTopology('fc-3ph', p);
export const simulateThreePhaseSemiControlled = (p: SimParams): SimResult => simulateTopology('sc-3ph', p);
