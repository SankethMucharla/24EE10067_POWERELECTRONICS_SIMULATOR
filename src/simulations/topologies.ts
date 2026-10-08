import type { DeviceDef, TopologyId } from '../types';
import { TWO_PI } from '../utils/math';

export interface TopologyDef {
  id: TopologyId;
  name: string;
  shortName: string;
  category: 'diode' | 'controlled';
  phases: 1 | 3;
  controlled: boolean; // has a firing angle
  hasBottom: boolean; // false -> load returns to a fixed (neutral / centre-tap / source) node
  pulses: number; // output pulse number p
  devices: DeviceDef[];
  gateWidthDeg: number;
  nTerm: number;
  supportsFwd: boolean;
  /** which inputs does "vrms" mean */
  vrmsLabel: string;
  vrmsDefault: number;
  /** peak value of the reference source voltage used by the engine from the user's vrms */
  peakFromVrms: (vrms: number) => number;
  termV: (theta: number, Vp: number) => number[];
  phaseV: (theta: number, Vp: number) => number[];
  phaseI: (termI: number[]) => number[];
  desc: string;
  devicesCount: string;
}

const T3 = TWO_PI / 3;

const sin1 = (th: number, Vp: number) => [Vp * Math.sin(th)];
const sin3 = (th: number, Vp: number) => [
  Vp * Math.sin(th),
  Vp * Math.sin(th - T3),
  Vp * Math.sin(th + T3),
];

const d = (
  id: string,
  kind: 'diode' | 'scr',
  group: 'top' | 'bot',
  terminal: number,
  natDeg: number,
): DeviceDef => ({ id, kind, group, terminal, natDeg });

const peak1 = (v: number) => Math.SQRT2 * v;
const peak3 = (vll: number) => (Math.SQRT2 * vll) / Math.sqrt(3); // phase peak from line-line RMS

export const TOPOLOGIES: Record<TopologyId, TopologyDef> = {
  'hw-diode': {
    id: 'hw-diode',
    name: 'Single-phase half-wave diode rectifier',
    shortName: '1φ Half-Wave',
    category: 'diode',
    phases: 1,
    controlled: false,
    hasBottom: false,
    pulses: 1,
    devices: [d('D1', 'diode', 'top', 0, 0)],
    gateWidthDeg: 360,
    nTerm: 1,
    supportsFwd: true,
    vrmsLabel: 'Source voltage Vs (RMS)',
    vrmsDefault: 230,
    peakFromVrms: peak1,
    termV: sin1,
    phaseV: sin1,
    phaseI: (i) => [i[0]],
    desc: 'One diode in series with the load. Conducts only while the source is positive (and, with an inductive load, until the load current has decayed to zero).',
    devicesCount: '1 diode',
  },
  'fw-ct-diode': {
    id: 'fw-ct-diode',
    name: 'Single-phase full-wave centre-tapped diode rectifier',
    shortName: '1φ Full-Wave CT',
    category: 'diode',
    phases: 1,
    controlled: false,
    hasBottom: false,
    pulses: 2,
    devices: [d('D1', 'diode', 'top', 0, 0), d('D2', 'diode', 'top', 1, 180)],
    gateWidthDeg: 360,
    nTerm: 2,
    supportsFwd: true,
    vrmsLabel: 'Secondary half-winding voltage Vs (RMS)',
    vrmsDefault: 230,
    peakFromVrms: peak1,
    termV: (th, Vp) => [Vp * Math.sin(th), -Vp * Math.sin(th)],
    phaseV: sin1,
    phaseI: (i) => [i[0] - i[1]],
    desc: 'Centre-tapped transformer with two diodes. Each diode conducts on alternate half-cycles; the load returns to the centre tap.',
    devicesCount: '2 diodes + CT transformer',
  },
  'fw-bridge-diode': {
    id: 'fw-bridge-diode',
    name: 'Single-phase full-wave bridge diode rectifier',
    shortName: '1φ Full-Wave Bridge',
    category: 'diode',
    phases: 1,
    controlled: false,
    hasBottom: true,
    pulses: 2,
    devices: [
      d('D1', 'diode', 'top', 0, 0),
      d('D2', 'diode', 'bot', 1, 0),
      d('D3', 'diode', 'top', 1, 180),
      d('D4', 'diode', 'bot', 0, 180),
    ],
    gateWidthDeg: 360,
    nTerm: 2,
    supportsFwd: true,
    vrmsLabel: 'Source voltage Vs (RMS)',
    vrmsDefault: 230,
    peakFromVrms: peak1,
    termV: (th, Vp) => [0.5 * Vp * Math.sin(th), -0.5 * Vp * Math.sin(th)],
    phaseV: sin1,
    phaseI: (i) => [i[0]],
    desc: 'Four diodes in a bridge. D1–D2 conduct in the positive half-cycle, D3–D4 in the negative half-cycle; no centre-tap needed.',
    devicesCount: '4 diodes',
  },
  'hw-diode-3ph': {
    id: 'hw-diode-3ph',
    name: 'Three-phase half-wave diode rectifier',
    shortName: '3φ Half-Wave Diode',
    category: 'diode',
    phases: 3,
    controlled: false,
    hasBottom: false,
    pulses: 3,
    devices: [d('D1', 'diode', 'top', 0, 30), d('D2', 'diode', 'top', 1, 150), d('D3', 'diode', 'top', 2, 270)],
    gateWidthDeg: 360,
    nTerm: 3,
    supportsFwd: true,
    vrmsLabel: 'Line-line voltage VLL (RMS)',
    vrmsDefault: 400,
    peakFromVrms: peak3,
    termV: sin3,
    phaseV: sin3,
    phaseI: (i) => [i[0], i[1], i[2]],
    desc: 'Three diodes, one per phase, with the load returning to the neutral. The diode on the highest phase conducts, so each diode carries current for 120° per cycle.',
    devicesCount: '3 diodes + neutral',
  },
  'tp-diode': {
    id: 'tp-diode',
    name: 'Three-phase six-pulse diode bridge rectifier',
    shortName: '3φ Diode Bridge',
    category: 'diode',
    phases: 3,
    controlled: false,
    hasBottom: true,
    pulses: 6,
    devices: [
      d('D1', 'diode', 'top', 0, 30),
      d('D2', 'diode', 'bot', 2, 90),
      d('D3', 'diode', 'top', 1, 150),
      d('D4', 'diode', 'bot', 0, 210),
      d('D5', 'diode', 'top', 2, 270),
      d('D6', 'diode', 'bot', 1, 330),
    ],
    gateWidthDeg: 360,
    nTerm: 3,
    supportsFwd: true,
    vrmsLabel: 'Line-line voltage VLL (RMS)',
    vrmsDefault: 400,
    peakFromVrms: peak3,
    termV: sin3,
    phaseV: sin3,
    phaseI: (i) => [i[0], i[1], i[2]],
    desc: 'Six diodes. At any instant the diode connected to the highest phase (top) and the diode connected to the lowest phase (bottom) conduct: D1-D2, D2-D3, D3-D4, D4-D5, D5-D6, D6-D1.',
    devicesCount: '6 diodes',
  },
  'hw-scr-1ph': {
    id: 'hw-scr-1ph',
    name: 'Single-phase half-wave controlled rectifier',
    shortName: '1φ Half-Wave SCR',
    category: 'controlled',
    phases: 1,
    controlled: true,
    hasBottom: false,
    pulses: 1,
    devices: [d('T1', 'scr', 'top', 0, 0)],
    gateWidthDeg: 30,
    nTerm: 1,
    supportsFwd: true,
    vrmsLabel: 'Source voltage Vs (RMS)',
    vrmsDefault: 230,
    peakFromVrms: peak1,
    termV: sin1,
    phaseV: sin1,
    phaseI: (i) => [i[0]],
    desc: 'One SCR in series with the load. The gate pulse at angle α decides when conduction starts; output is controlled from Vm/π down to zero.',
    devicesCount: '1 SCR',
  },
  'fc-1ph': {
    id: 'fc-1ph',
    name: 'Single-phase fully controlled bridge rectifier',
    shortName: '1φ Fully Controlled',
    category: 'controlled',
    phases: 1,
    controlled: true,
    hasBottom: true,
    pulses: 2,
    devices: [
      d('T1', 'scr', 'top', 0, 0),
      d('T2', 'scr', 'bot', 1, 0),
      d('T3', 'scr', 'top', 1, 180),
      d('T4', 'scr', 'bot', 0, 180),
    ],
    gateWidthDeg: 30,
    nTerm: 2,
    supportsFwd: true,
    vrmsLabel: 'Source voltage Vs (RMS)',
    vrmsDefault: 230,
    peakFromVrms: peak1,
    termV: (th, Vp) => [0.5 * Vp * Math.sin(th), -0.5 * Vp * Math.sin(th)],
    phaseV: sin1,
    phaseI: (i) => [i[0]],
    desc: 'Four SCRs. T1–T2 are fired at α and T3–T4 at α+180°. Output can go negative (inverter action) when the load current is continuous and α > 90°.',
    devicesCount: '4 SCRs',
  },
  'sc-1ph': {
    id: 'sc-1ph',
    name: 'Single-phase semi-controlled (half-controlled) bridge rectifier',
    shortName: '1φ Semi-Controlled',
    category: 'controlled',
    phases: 1,
    controlled: true,
    hasBottom: true,
    pulses: 2,
    devices: [
      d('T1', 'scr', 'top', 0, 0),
      d('T2', 'scr', 'top', 1, 180),
      d('D1', 'diode', 'bot', 0, 0),
      d('D2', 'diode', 'bot', 1, 0),
    ],
    gateWidthDeg: 30,
    nTerm: 2,
    supportsFwd: true,
    vrmsLabel: 'Source voltage Vs (RMS)',
    vrmsDefault: 230,
    peakFromVrms: peak1,
    termV: (th, Vp) => [0.5 * Vp * Math.sin(th), -0.5 * Vp * Math.sin(th)],
    phaseV: sin1,
    phaseI: (i) => [i[0]],
    desc: 'Two SCRs and two diodes. The diodes provide an inherent freewheeling path, so the output voltage is never negative.',
    devicesCount: '2 SCRs + 2 diodes',
  },
  'hw-scr-3ph': {
    id: 'hw-scr-3ph',
    name: 'Three-phase half-wave controlled rectifier',
    shortName: '3φ Half-Wave SCR',
    category: 'controlled',
    phases: 3,
    controlled: true,
    hasBottom: false,
    pulses: 3,
    devices: [d('T1', 'scr', 'top', 0, 30), d('T2', 'scr', 'top', 1, 150), d('T3', 'scr', 'top', 2, 270)],
    gateWidthDeg: 120,
    nTerm: 3,
    supportsFwd: true,
    vrmsLabel: 'Line-line voltage VLL (RMS)',
    vrmsDefault: 400,
    peakFromVrms: peak3,
    termV: sin3,
    phaseV: sin3,
    phaseI: (i) => [i[0], i[1], i[2]],
    desc: 'Three SCRs, one per phase, with the load returning to the neutral. Each SCR can conduct for up to 120° per cycle.',
    devicesCount: '3 SCRs + neutral',
  },
  'fc-3ph': {
    id: 'fc-3ph',
    name: 'Three-phase fully controlled bridge rectifier',
    shortName: '3φ Fully Controlled',
    category: 'controlled',
    phases: 3,
    controlled: true,
    hasBottom: true,
    pulses: 6,
    devices: [
      d('T1', 'scr', 'top', 0, 30),
      d('T2', 'scr', 'bot', 2, 90),
      d('T3', 'scr', 'top', 1, 150),
      d('T4', 'scr', 'bot', 0, 210),
      d('T5', 'scr', 'top', 2, 270),
      d('T6', 'scr', 'bot', 1, 330),
    ],
    gateWidthDeg: 120,
    nTerm: 3,
    supportsFwd: true,
    vrmsLabel: 'Line-line voltage VLL (RMS)',
    vrmsDefault: 400,
    peakFromVrms: peak3,
    termV: sin3,
    phaseV: sin3,
    phaseI: (i) => [i[0], i[1], i[2]],
    desc: 'Six SCRs fired in the sequence T1–T2–T3–T4–T5–T6 every 60°. The workhorse of high-power DC drives and HVDC.',
    devicesCount: '6 SCRs',
  },
  'sc-3ph': {
    id: 'sc-3ph',
    name: 'Three-phase semi-controlled bridge rectifier',
    shortName: '3φ Semi-Controlled',
    category: 'controlled',
    phases: 3,
    controlled: true,
    hasBottom: true,
    pulses: 3,
    devices: [
      d('T1', 'scr', 'top', 0, 30),
      d('T3', 'scr', 'top', 1, 150),
      d('T5', 'scr', 'top', 2, 270),
      d('D2', 'diode', 'bot', 2, 90),
      d('D4', 'diode', 'bot', 0, 210),
      d('D6', 'diode', 'bot', 1, 330),
    ],
    gateWidthDeg: 120,
    nTerm: 3,
    supportsFwd: true,
    vrmsLabel: 'Line-line voltage VLL (RMS)',
    vrmsDefault: 400,
    peakFromVrms: peak3,
    termV: sin3,
    phaseV: sin3,
    phaseI: (i) => [i[0], i[1], i[2]],
    desc: 'Three SCRs on the positive rail and three diodes on the negative rail. Output voltage never goes negative; ripple frequency is 3f.',
    devicesCount: '3 SCRs + 3 diodes',
  },
};

export const TOPOLOGY_LIST: TopologyDef[] = [
  TOPOLOGIES['hw-diode'],
  TOPOLOGIES['fw-ct-diode'],
  TOPOLOGIES['fw-bridge-diode'],
  TOPOLOGIES['hw-diode-3ph'],
  TOPOLOGIES['tp-diode'],
  TOPOLOGIES['hw-scr-1ph'],
  TOPOLOGIES['fc-1ph'],
  TOPOLOGIES['sc-1ph'],
  TOPOLOGIES['hw-scr-3ph'],
  TOPOLOGIES['fc-3ph'],
  TOPOLOGIES['sc-3ph'],
];

/** Phase peak voltage (V) used for the sources */
export function phasePeak(topo: TopologyDef, vrms: number): number {
  return topo.peakFromVrms(vrms);
}
/** Peak of the largest voltage across a device-pair path (line-line peak for 3φ, source peak for 1φ) */
export function pathPeak(topo: TopologyDef, vrms: number): number {
  return topo.phases === 3 ? Math.SQRT2 * vrms : Math.SQRT2 * vrms;
}

/** Converters where the freewheeling diode is a main teaching case (switched ON by default).
 *  For the others it is an optional external diode that normally stays idle because vo never goes negative. */
export const FWD_DEFAULT_ON: TopologyId[] = ['hw-diode', 'hw-scr-1ph', 'fc-1ph', 'hw-scr-3ph', 'fc-3ph'];
