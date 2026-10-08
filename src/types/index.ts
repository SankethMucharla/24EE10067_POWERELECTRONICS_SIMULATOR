export type LoadType = 'R' | 'RL' | 'RLE';

export type TopologyId =
  | 'hw-diode'
  | 'fw-ct-diode'
  | 'fw-bridge-diode'
  | 'hw-diode-3ph'
  | 'tp-diode'
  | 'hw-scr-1ph'
  | 'fc-1ph'
  | 'sc-1ph'
  | 'hw-scr-3ph'
  | 'fc-3ph'
  | 'sc-3ph';

export interface SimParams {
  /** 1-phase: source RMS (CT: RMS of each secondary half). 3-phase: LINE-LINE RMS. */
  vrms: number;
  freq: number; // Hz
  loadType: LoadType;
  R: number; // ohm
  L_mH: number; // mH
  /** back-EMF of the R-L-E load (V), used only when loadType = 'RLE' */
  E: number;
  alpha: number; // degrees
  vf: number; // V, forward drop per conducting device
  tSim_ms: number; // displayed window
  fwd: boolean; // freewheeling diode across load
  startFromRest: boolean; // show start-up transient instead of steady state
}

export type DevKind = 'diode' | 'scr';

export interface DeviceDef {
  id: string; // 'T1', 'D2' ...
  kind: DevKind;
  group: 'top' | 'bot';
  terminal: number;
  /** natural firing angle (alpha = 0) in degrees of the supply cycle */
  natDeg: number;
}

export interface SimSeries {
  n: number;
  t_ms: Float64Array;
  theta: Float64Array; // rad, unwrapped
  vin: Float64Array[]; // source phase voltages
  vo: Float64Array;
  io: Float64Array;
  iFwd: Float64Array; // freewheeling diode current
  vFwd: Float64Array;
  iin: Float64Array[]; // source phase currents
  idev: Float64Array[]; // per device
  vdev: Float64Array[]; // per device (anode-cathode)
  gate: Float64Array[]; // per device 0/1 (SCR only; diodes all 0)
  top: Int8Array; // conducting top device index (-1 none)
  bot: Int8Array; // conducting bottom device index (-1 none)
  fwdOn: Uint8Array;
}

export interface Metrics {
  Vdc: number;
  Vrms: number;
  Idc: number;
  Irms: number;
  formFactor: number;
  ripple: number; // voltage ripple factor
  currentRipple: number;
  efficiency: number; // Pdc / Pac
  Pdc: number;
  Pac: number;
  piv: number;
  rippleFreq: number;
  pf: number;
  df: number;
  thd: number;
  /** distortion factor I1/Irms of the source current */
  distFactor: number;
  /** voltage THD of the supply (phase A) */
  thdV: number;
  /** source-current harmonic RMS values, index n = harmonic n+1 (A) */
  harmI: number[];
  /** output-voltage harmonic RMS values (V), index n = harmonic n+1 of the supply frequency */
  harmVo: number[];
  isRms: number;
  idevAvg: number[];
  idevRms: number[];
  devConductionDeg: number[]; // per device
  alphaDeg: number;
  /** per-device first conduction interval, in degrees of the supply cycle (NaN if never / always conducting) */
  devStartDeg: number[];
  devEndDeg: number[];
  /** end of first conduction interval of device 0 = extinction angle beta (deg) */
  extinctionDeg: number;
  /** minimum load current over a cycle, used to classify continuous / discontinuous */
  iMin: number;
  mode: 'continuous' | 'discontinuous' | 'n/a';
  cyclesToSteady: number;
}

export interface SimResult {
  topology: TopologyId;
  params: SimParams;
  series: SimSeries;
  metrics: Metrics; // steady-state metrics
  deviceIds: string[];
  deviceKinds: DevKind[];
}

export interface TheoryValues {
  Vdc?: number;
  Vrms?: number;
  Idc?: number;
  Irms?: number;
  ripple?: number;
  formFactor?: number;
  efficiency?: number;
  piv?: number;
  rippleFreq?: number;
  idevAvg?: number;
  idevRms?: number;
  pf?: number;
  df?: number;
  extinctionDeg?: number;
  mode: 'continuous' | 'discontinuous' | 'n/a';
  note?: string;
  /** equation used for Vdc (LaTeX) */
  vdcFormula?: string;
}
