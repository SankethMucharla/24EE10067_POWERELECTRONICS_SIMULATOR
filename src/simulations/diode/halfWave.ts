import { simulateTopology } from '../engine';
import type { SimParams, SimResult } from '../../types';
/** Single-phase half-wave diode rectifier (R / RL, optional freewheeling diode). */
export const simulateHalfWaveDiode = (p: SimParams): SimResult => simulateTopology('hw-diode', p);
