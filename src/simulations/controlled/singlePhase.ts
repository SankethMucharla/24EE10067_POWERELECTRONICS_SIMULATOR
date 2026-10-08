import { simulateTopology } from '../engine';
import type { SimParams, SimResult } from '../../types';
export const simulateSinglePhaseHalfControlled = (p: SimParams): SimResult => simulateTopology('hw-scr-1ph', p);
export const simulateSinglePhaseFullControlled = (p: SimParams): SimResult => simulateTopology('fc-1ph', p);
export const simulateSinglePhaseSemiControlled = (p: SimParams): SimResult => simulateTopology('sc-1ph', p);
