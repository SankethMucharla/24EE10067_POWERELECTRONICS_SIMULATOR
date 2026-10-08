import { simulateTopology } from '../engine';
import type { SimParams, SimResult } from '../../types';
/** Three-phase six-pulse diode bridge rectifier. */
export const simulateThreePhaseDiode = (p: SimParams): SimResult => simulateTopology('tp-diode', p);
