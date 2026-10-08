import { simulateTopology } from '../engine';
import type { SimParams, SimResult } from '../../types';
/** Single-phase full-wave centre-tapped diode rectifier. */
export const simulateFullWaveCentreTapped = (p: SimParams): SimResult => simulateTopology('fw-ct-diode', p);
/** Single-phase full-wave bridge diode rectifier. */
export const simulateFullWaveDiode = (p: SimParams): SimResult => simulateTopology('fw-bridge-diode', p);
