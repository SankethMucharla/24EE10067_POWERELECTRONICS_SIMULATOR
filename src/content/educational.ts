import type { TopologyId } from '../types';

const r = String.raw;

export interface Eq {
  label: string;
  tex: string;
}

export interface TopologyContent {
  keyFormulas: Eq[];
  note: string;
  viva: string[];
  insight: string;
  theory: {
    operation: string[];
    sequence: string;
    equations: Eq[];
    waveform: string[];
    advantages: string[];
    disadvantages: string[];
    applications: string[];
  };
  steps: string[];
}

const commonDef =
  'Vm = peak of the source voltage (√2 × RMS).  For three-phase circuits: V_LL = line-line RMS voltage, V_m,LL = √2·V_LL (peak line-line), V_m,ph = √2·V_LL/√3 (peak phase).';

export const CONTENT: Record<TopologyId, TopologyContent> = {
  'hw-diode': {
    keyFormulas: [
      { label: 'R load', tex: r`V_{dc}=\frac{V_m}{\pi},\quad V_{rms}=\frac{V_m}{2}` },
      { label: 'RL load (extinction angle β > π)', tex: r`V_{dc}=\frac{V_m}{2\pi}\,(1-\cos\beta)` },
    ],
    note:
      'With an inductive load the diode keeps conducting after the source passes through zero, until the energy stored in L has been used up at the extinction angle β > 180°. The load voltage therefore contains a negative portion and Vdc is LOWER than for an R load. A freewheeling diode removes the negative part.',
    viva: [
      'Why does the diode current not become zero at ωt = π when the load is R-L?',
      'What is the maximum rectification efficiency of a half-wave rectifier with R load, and why is it so low? (40.6 %)',
      'What is the function of a freewheeling diode, and how does it change vo and the diode current?',
      'Why is a half-wave rectifier not used with a transformer for large DC loads?',
    ],
    insight:
      'Used only for very small loads (signal detection, trickle chargers). The non-zero DC component of the secondary current can saturate the transformer core, and the ripple (frequency f) is large.',
    theory: {
      operation: [
        'The single diode is forward-biased whenever the source voltage is positive, so it conducts in the positive half-cycle and blocks in the negative half-cycle.',
        'For an R load the current follows the voltage and stops at ωt = π.',
        'For an R-L load the inductor opposes the fall of current: after ωt = π the load voltage vo = vs is negative, di/dt < 0, but the current stays positive until the stored energy is exhausted at ωt = β.',
      ],
      sequence: 'D1 conducts from ωt = 0 to ωt = β (β = 180° for an R load, β > 180° for R-L).',
      equations: [
        { label: 'Average output voltage (R)', tex: r`V_{dc}=\dfrac{V_m}{\pi}=0.318\,V_m` },
        { label: 'RMS output voltage (R)', tex: r`V_{rms}=\dfrac{V_m}{2}` },
        { label: 'Form factor / ripple factor (R)', tex: r`FF=\dfrac{V_{rms}}{V_{dc}}=\dfrac{\pi}{2}=1.57,\quad RF=\sqrt{FF^2-1}=1.21` },
        { label: 'Efficiency (R)', tex: r`\eta=\dfrac{P_{dc}}{P_{ac}}=\dfrac{V_{dc}^2}{V_{rms}^2}=40.6\%` },
        { label: 'Load current (RL)', tex: r`i_o(\theta)=\dfrac{V_m}{Z}\left[\sin(\theta-\phi)+\sin\phi\,e^{-\theta/\tan\phi}\right],\;\; \phi=\tan^{-1}\!\dfrac{\omega L}{R}` },
        { label: 'Extinction angle β (RL)', tex: r`\sin(\beta-\phi)+\sin\phi\,e^{-\beta/\tan\phi}=0` },
        { label: 'Average output voltage (RL)', tex: r`V_{dc}=\dfrac{V_m}{2\pi}(1-\cos\beta)` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_m` },
      ],
      waveform: [
        'vo equals vs while D1 conducts and is zero otherwise; the diode voltage is ≈ 0 while on and equals vs (negative) while off.',
        'With RL, the vo waveform extends below zero between π and β — the shaded area is the energy returned by the inductor.',
        'A freewheeling diode clamps vo to zero from π onward and lets the current decay through R-L instead of the source.',
      ],
      advantages: ['Simplest possible rectifier — one component', 'Very cheap'],
      disadvantages: ['High ripple (f) and low Vdc', 'DC current in the transformer secondary (saturation)', 'Low efficiency (40.6 % with R load)', 'Poor utilization of the transformer'],
      applications: ['Low-power signal rectification / detectors', 'Small battery chargers', 'Snubber and clamp circuits'],
    },
    steps: [
      'Source is in the positive half-cycle: the anode becomes positive with respect to the cathode.',
      'The diode becomes forward biased and starts to conduct (no gate is needed).',
      'The load receives the source voltage; the current builds up (slowly if the load is inductive).',
      'The source has passed zero. With an R-L load the stored energy keeps the current flowing and vo is negative.',
      'The current reaches zero at β: the diode turns off and blocks the negative source voltage until the next cycle.',
    ],
  },

  'fw-ct-diode': {
    keyFormulas: [{ label: 'Any R or RL load', tex: r`V_{dc}=\frac{2V_m}{\pi},\quad V_{rms}=\frac{V_m}{\sqrt2},\quad PIV=2V_m` }],
    note:
      'Vm is the peak of ONE half of the secondary winding. Each diode must block the voltage of both halves in series, so the peak inverse voltage is 2Vm. The ripple frequency is 2f because both half-cycles are rectified.',
    viva: [
      'Why does the output ripple frequency of a single-phase full-wave rectifier equal 2f?',
      'Why is the PIV of a centre-tapped rectifier 2Vm while it is Vm for the bridge?',
      'What is the average current in each diode in terms of the load current?',
      'Why is the transformer utilisation factor of the centre-tap circuit lower than that of the bridge?',
    ],
    insight:
      'Preferred when the output voltage is low and current high (e.g. 5 V / 12 V supplies): only ONE diode drop is in the conduction path, unlike the bridge which has two.',
    theory: {
      operation: [
        'A centre-tapped transformer provides two equal and opposite secondary voltages. D1 conducts when the upper end is positive, D2 when the lower end is positive.',
        'The load returns to the centre tap, so the load current has the same direction in both half-cycles.',
        'Only one diode conducts at any time.',
      ],
      sequence: 'D1: 0 → π, D2: π → 2π (for an R load, or RL with continuous current).',
      equations: [
        { label: 'Average output voltage', tex: r`V_{dc}=\dfrac{2V_m}{\pi}=0.637\,V_m` },
        { label: 'RMS output voltage', tex: r`V_{rms}=\dfrac{V_m}{\sqrt2}=0.707\,V_m` },
        { label: 'Form factor / ripple factor (R)', tex: r`FF=\dfrac{\pi}{2\sqrt2}=1.11,\quad RF=0.483` },
        { label: 'Efficiency (R)', tex: r`\eta=\dfrac{8}{\pi^2}=81.1\%` },
        { label: 'Diode currents', tex: r`I_{D,avg}=\dfrac{I_{dc}}{2},\quad I_{D,rms}=\dfrac{I_{rms}}{\sqrt2}` },
        { label: 'Peak inverse voltage', tex: r`PIV=2V_m` },
      ],
      waveform: [
        'vo = |vs| (two humps per cycle).',
        'The diode voltage while off is −2vs-peak: the diode sees the sum of both half-windings.',
        'The primary current is the difference i_D1 − i_D2 and therefore has no DC component.',
      ],
      advantages: ['Only one diode drop in series with the load', 'No DC component in the primary', 'Ripple frequency 2f'],
      disadvantages: ['Centre-tapped transformer needed', 'PIV = 2Vm', 'Each winding is used only half of the time'],
      applications: ['Low-voltage, high-current DC supplies', 'Battery charging (low voltage)'],
    },
    steps: [
      'The upper end of the secondary is positive with respect to the centre tap (positive half-cycle).',
      'D1 is forward biased and conducts; the load current returns to the centre tap and vo = vs.',
      'D2 is reverse biased by twice the half-winding voltage.',
      'The lower end becomes positive (negative half-cycle): D2 conducts and D1 turns off.',
      'The load current has the same direction in both half-cycles → vo = |vs| and the ripple frequency is 2f.',
    ],
  },

  'fw-bridge-diode': {
    keyFormulas: [{ label: 'Any R or RL load', tex: r`V_{dc}=\frac{2V_m}{\pi},\quad V_{rms}=\frac{V_m}{\sqrt2},\quad PIV=V_m` }],
    note:
      'For an R-L load the bridge current is always continuous (the load voltage |vs| is never negative), so Vdc is the same as for an R load. Two diodes conduct in series, so the conduction loss is 2Vf.',
    viva: [
      'Which diode pairs conduct in the positive and negative half-cycles?',
      'Why does an inductor in the load not change the average output voltage of a full-wave diode rectifier?',
      'What happens to the ripple factor when a large inductor is added in series with the load?',
      'Compare the bridge with the centre-tapped rectifier in terms of PIV and transformer utilisation.',
    ],
    insight:
      'The standard choice in almost all single-phase DC supplies: no centre tap is needed and each diode needs only Vm blocking capability. A filter capacitor or LC filter is added to reduce the 2f ripple.',
    theory: {
      operation: [
        'In the positive half-cycle terminal A is positive: D1 and D2 are forward biased and carry the load current A → D1 → load → D2 → B.',
        'In the negative half-cycle terminal B is positive: D3 and D4 conduct, B → D3 → load → D4 → A.',
        'The load current always flows in the same direction, so vo = |vs|.',
      ],
      sequence: 'D1–D2: 0 → π,  D3–D4: π → 2π.',
      equations: [
        { label: 'Average output voltage', tex: r`V_{dc}=\dfrac{2V_m}{\pi}` },
        { label: 'RMS output voltage', tex: r`V_{rms}=\dfrac{V_m}{\sqrt2}` },
        { label: 'Form / ripple factor (R)', tex: r`FF=1.11,\quad RF=0.483` },
        { label: 'Ripple frequency', tex: r`f_r=2f` },
        { label: 'Diode currents', tex: r`I_{D,avg}=\dfrac{I_{dc}}{2},\quad I_{D,rms}=\dfrac{I_{rms}}{\sqrt2}` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_m` },
      ],
      waveform: [
        'vo = |vs|; with large L the current is almost constant and each diode carries rectangular blocks of 180°.',
        'The source current is a square-ish wave with RMS = Irms and no DC component.',
        'Power factor ≈ 0.9 for a smooth (large L) load current.',
      ],
      advantages: ['No centre-tapped transformer', 'PIV = Vm', 'Good transformer utilisation', 'Ripple frequency 2f'],
      disadvantages: ['Two diode drops in series (2Vf)', 'Four diodes'],
      applications: ['Power supplies and adapters', 'DC motor drives (uncontrolled)', 'Front end of AC-DC-AC converters'],
    },
    steps: [
      'The source is in its positive half-cycle: terminal A is positive with respect to B.',
      'D1 and D2 are forward biased and conduct: A → D1 → load → D2 → B.',
      'D3 and D4 are reverse biased by the full source voltage.',
      'In the negative half-cycle terminal B is positive and the roles swap: D3 and D4 conduct.',
      'The current through the load keeps its direction, so vo = |vs| and the ripple frequency is 2f.',
    ],
  },

  'hw-diode-3ph': {
    keyFormulas: [
      { label: 'Average output (continuous, any load)', tex: r`V_{dc}=\frac{3\sqrt3}{2\pi}V_{m,ph}=1.17\,V_{ph}=0.827\,V_{m,LL}` },
      { label: 'RMS output', tex: r`V_{rms}=V_{m,ph}\sqrt{\tfrac12+\tfrac{3\sqrt3}{8\pi}}=0.8407\,V_{m,ph}` },
    ],
    note:
      'At any instant only the diode connected to the HIGHEST phase conducts. Each diode therefore carries current for 120° per cycle and the output is the upper envelope of the three phase voltages (relative to the neutral). vo never goes negative, so a freewheeling diode would never conduct and is not used.',
    viva: [
      'Which diode conducts at ωt = 90° and why?',
      'What is the ripple frequency of the three-phase half-wave rectifier?',
      'Why does this circuit need a neutral connection and what problem does the DC in the secondary cause?',
      'What is the PIV of each diode in terms of the phase peak voltage?',
    ],
    insight:
      'A three-pulse circuit with a much smaller ripple than single-phase rectifiers (3f). Rarely used in practice because each secondary winding carries a DC component; the six-pulse bridge is preferred.',
    theory: {
      operation: [
        'The three phase voltages are 120° apart. The diode connected to the most positive phase is forward biased and the other two are reverse biased.',
        'The conducting diode changes at the natural commutation points ωt = 30°, 150° and 270°, where two phase voltages are equal.',
        'The load returns to the neutral, so vo equals the highest phase voltage.',
      ],
      sequence: 'D1 (phase a): 30° → 150°, D2 (phase b): 150° → 270°, D3 (phase c): 270° → 390°.',
      equations: [
        { label: 'Average output voltage', tex: r`V_{dc}=\dfrac{3\sqrt3}{2\pi}V_{m,ph}=1.17\,V_{ph}` },
        { label: 'RMS output voltage', tex: r`V_{rms}=V_{m,ph}\sqrt{\dfrac12+\dfrac{3\sqrt3}{8\pi}}` },
        { label: 'Ripple frequency', tex: r`f_r=3f` },
        { label: 'Diode currents (continuous)', tex: r`I_{D,avg}=\dfrac{I_{dc}}{3},\quad I_{D,rms}=\dfrac{I_{rms}}{\sqrt3}` },
        { label: 'Peak inverse voltage', tex: r`PIV=\sqrt3\,V_{m,ph}=V_{m,LL}` },
      ],
      waveform: [
        'vo follows the top of the three phase sinusoids: three 120° arcs per cycle, with a minimum of 0.5·Vm,ph.',
        'Each diode current is a 120° block (R load) with the same shape as vo.',
      ],
      advantages: ['Three-pulse output (3f ripple)', 'Only three diodes'],
      disadvantages: ['Neutral connection needed', 'DC current in the transformer secondary', 'Low utilisation of the transformer'],
      applications: ['Low-power DC supplies from a star-connected secondary', 'Teaching multi-phase rectification'],
    },
    steps: [
      'The three phases are displaced by 120°; at every instant one phase is the highest.',
      'The diode on the highest phase is forward biased and conducts; the others are reverse biased.',
      'At the crossing of two phase voltages the incoming diode turns on and the outgoing one turns off.',
      'The load sees the highest phase voltage relative to the neutral: three pulses per cycle.',
    ],
  },

  'tp-diode': {
    keyFormulas: [
      { label: 'Average output', tex: r`V_{dc}=\frac{3\sqrt2\,V_{LL}}{\pi}=1.35\,V_{LL}=0.955\,V_{m,LL}` },
      { label: 'RMS output', tex: r`V_{rms}=0.9558\,V_{m,LL}` },
    ],
    note:
      'At every instant the diode whose anode is at the HIGHEST phase voltage (top) and the diode whose cathode is at the LOWEST phase voltage (bottom) conduct. The output is the envelope of the six line voltages: six pulses per cycle (ripple frequency 6f) and only 4.2 % voltage ripple.',
    viva: [
      'Why is the output ripple frequency of a three-phase bridge rectifier 6f?',
      'Which two diodes conduct between 30° and 90° and why?',
      'Each diode conducts for how many degrees? What is its average current?',
      'Why is the supply power factor of the diode bridge about 0.955 with a smooth load current?',
    ],
    insight:
      'The workhorse of industrial front-ends: VFDs, welding, electrolysis and battery charging. The low ripple means that only a small filter is needed. In practice the commutation overlap caused by source inductance lowers Vdc slightly.',
    theory: {
      operation: [
        'The top diodes (D1, D3, D5) are connected to phases a, b, c; the highest phase voltage forward-biases its diode and reverse-biases the other two.',
        'The bottom diodes (D4, D6, D2) are connected to phases a, b, c; the lowest phase voltage turns on its diode.',
        'The load therefore sees the voltage between the highest and the lowest phase: a line voltage, changing every 60°.',
      ],
      sequence: 'D6-D1 (30°–90°), D1-D2 (90°–150°), D2-D3 (150°–210°), D3-D4 (210°–270°), D4-D5 (270°–330°), D5-D6 (330°–30°).',
      equations: [
        { label: 'Average output voltage', tex: r`V_{dc}=\dfrac{3}{\pi}V_{m,LL}=\dfrac{3\sqrt2}{\pi}V_{LL}` },
        { label: 'RMS output voltage', tex: r`V_{rms}=V_{m,LL}\sqrt{\dfrac12+\dfrac{3\sqrt3}{4\pi}}` },
        { label: 'Form / ripple factor', tex: r`FF=1.0009,\quad RF=4.2\%` },
        { label: 'Ripple frequency', tex: r`f_r=6f` },
        { label: 'Diode currents', tex: r`I_{D,avg}=\dfrac{I_{dc}}{3},\quad I_{D,rms}=\dfrac{I_{o,rms}}{\sqrt3}` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_{m,LL}=\sqrt2\,V_{LL}` },
        { label: 'Input power factor (smooth current)', tex: r`PF=\dfrac{3}{\pi}=0.955` },
      ],
      waveform: [
        'vo is made of 60° segments of the line voltages (vab, vac, vbc, vba, vca, vcb).',
        'Each diode conducts for 120° per cycle; each line current is a 120° positive block followed by a 120° negative block (for large L).',
      ],
      advantages: ['Low ripple (6f) — small filter', 'High Vdc and efficiency', 'Good utilisation of the supply', 'No neutral required'],
      disadvantages: ['Uncontrolled output', 'Line current harmonics (5th, 7th, 11th …)'],
      applications: ['Industrial DC supplies, VFD front-ends', 'Electrolysis, battery chargers, welding'],
    },
    steps: [
      'The three phase voltages are displaced by 120°; at each instant one phase is the highest and one the lowest.',
      'The diode on the highest phase (top group) is forward biased and clamps the P rail to that phase.',
      'The diode on the lowest phase (bottom group) clamps the N rail to that phase.',
      'The load sees the line voltage between the two phases; natural commutation every 60° moves the current to the next diode.',
      'Six pulses per cycle: the output is the upper envelope of the six line voltages (ripple frequency 6f).',
    ],
  },

  'hw-scr-1ph': {
    keyFormulas: [
      { label: 'R load', tex: r`V_{dc}=\frac{V_m}{2\pi}(1+\cos\alpha)` },
      { label: 'RL load (extinction angle β)', tex: r`V_{dc}=\frac{V_m}{2\pi}(\cos\alpha-\cos\beta)` },
    ],
    note:
      'The SCR can only be fired while it is forward biased (source positive). With R load the conduction angle is π − α; with an R-L load it is β − α and the current outlasts the positive half-cycle. A freewheeling diode keeps vo ≥ 0 and the SCR turns off at ωt = π.',
    viva: [
      'What is the range of firing angle control for an R load, and what are Vdc at α = 0 and α = 180°?',
      'What is the extinction angle and how is the conduction angle related to it?',
      'How does a freewheeling diode change the output voltage of a half-wave controlled rectifier with RL load?',
      'Why must the gate pulse be applied only when the SCR is forward biased?',
    ],
    insight:
      'Light-duty phase-controlled supplies: small DC motors, lamp dimming/heaters, battery chargers. The half-wave circuit is rarely used above a few hundred watts because of DC in the supply.',
    theory: {
      operation: [
        'The SCR becomes forward biased when vs turns positive but stays off until a gate pulse is applied at ωt = α.',
        'It then conducts and the load voltage equals vs; the SCR turns off when its current falls to zero (natural commutation).',
        'Increasing α delays the start of conduction and reduces the average output voltage.',
      ],
      sequence: 'T1 conducts from ωt = α to ωt = π (R) or ωt = β (RL, no freewheeling diode).',
      equations: [
        { label: 'Average output voltage (R)', tex: r`V_{dc}=\dfrac{V_m}{2\pi}(1+\cos\alpha)` },
        { label: 'RMS output voltage (R)', tex: r`V_{rms}=V_m\sqrt{\dfrac{1}{4\pi}\left(\pi-\alpha+\dfrac{\sin2\alpha}{2}\right)}` },
        { label: 'Load current (RL)', tex: r`i_o=\dfrac{V_m}{Z}\left[\sin(\theta-\phi)-\sin(\alpha-\phi)\,e^{(\alpha-\theta)/\tan\phi}\right]` },
        { label: 'Extinction angle', tex: r`\sin(\beta-\phi)=\sin(\alpha-\phi)\,e^{(\alpha-\beta)/\tan\phi}` },
        { label: 'Average output voltage (RL)', tex: r`V_{dc}=\dfrac{V_m}{2\pi}(\cos\alpha-\cos\beta)` },
        { label: 'With freewheeling diode', tex: r`V_{dc}=\dfrac{V_m}{2\pi}(1+\cos\alpha)\ \text{(independent of L)}` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_m` },
      ],
      waveform: [
        'The gate pulse marks α; vo is zero before the pulse and follows vs afterwards.',
        'The SCR voltage equals vs before firing, ≈ 0 while conducting and vs (negative) after turn-off.',
        'With RL, vo is negative from π until β.',
      ],
      advantages: ['Controlled output with a single thyristor', 'Simple gate circuit'],
      disadvantages: ['DC component in the supply', 'High ripple (f)', 'Poor power factor at large α'],
      applications: ['Light dimmers and heater control', 'Small DC motor / battery charger control'],
    },
    steps: [
      'The source enters its positive half-cycle: the SCR is forward biased but blocks (no gate pulse yet).',
      'At ωt = α the gate pulse arrives and triggers the SCR.',
      'The SCR conducts: the load sees vs and the current builds up.',
      'The source has passed zero. With RL load the stored energy keeps the SCR conducting and vo becomes negative.',
      'The current reaches zero (β): the SCR turns off and blocks the negative voltage until the next gate pulse.',
    ],
  },

  'fc-1ph': {
    keyFormulas: [
      { label: 'Continuous current (RL)', tex: r`V_{dc}=\frac{2V_m}{\pi}\cos\alpha` },
      { label: 'R load / discontinuous current', tex: r`V_{dc}=\frac{V_m}{\pi}(1+\cos\alpha)\ \ \text{(R)},\quad \frac{V_m}{\pi}(\cos\alpha-\cos\beta)\ \ \text{(RL, DCM)}` },
    ],
    note:
      'For continuous current, increasing α DECREASES the average output voltage and Vdc becomes negative for α > 90° (inverter mode, only possible if the load can return energy, e.g. a DC motor with back-EMF). With a passive R-L load the current becomes discontinuous at large α and Vdc stays positive.',
    viva: [
      'Why does Vdc become negative for α > 90° with continuous current?',
      'What is the condition for continuous conduction with an R-L load?',
      'Which SCRs are fired together and what is their phase relationship?',
      'How does the average output voltage change when the current becomes discontinuous?',
    ],
    insight:
      'Two-quadrant converter used for DC motor drives (rectifying and regenerative braking). For smooth motor current a large smoothing inductor or the armature inductance is used.',
    theory: {
      operation: [
        'T1–T2 are fired at ωt = α, T3–T4 at ωt = π + α.',
        'With continuous current, the incoming pair turns on and the outgoing pair is reverse-biased and turns off (line commutation).',
        'Between α and π the load voltage equals vs; between π and π + α it is −|vs| (negative) because the inductor keeps the pair conducting.',
        'For RL with small L/R (or R load) the current falls to zero before the next pair is fired and the output stays at zero.',
      ],
      sequence: 'T1-T2: α → α + π,  T3-T4: π + α → 2π + α (continuous). Discontinuous: α → β, then π + α → π + β.',
      equations: [
        { label: 'Average output voltage — continuous', tex: r`V_{dc}=\dfrac{2V_m}{\pi}\cos\alpha` },
        { label: 'RMS output voltage — continuous', tex: r`V_{rms}=\dfrac{V_m}{\sqrt2}` },
        { label: 'Average output voltage — R load', tex: r`V_{dc}=\dfrac{V_m}{\pi}(1+\cos\alpha)` },
        { label: 'RMS output voltage — R load', tex: r`V_{rms}=V_m\sqrt{\dfrac{\pi-\alpha}{2\pi}+\dfrac{\sin 2\alpha}{4\pi}}` },
        { label: 'Discontinuous RL: pulse from α to β', tex: r`V_{dc}=\dfrac{V_m}{\pi}(\cos\alpha-\cos\beta)` },
        { label: 'Source current (large L)', tex: r`DF=\cos\alpha,\quad PF\approx\dfrac{2\sqrt2}{\pi}\cos\alpha=0.9\cos\alpha` },
        { label: 'SCR currents', tex: r`I_{T,avg}=\dfrac{I_{dc}}{2},\quad I_{T,rms}=\dfrac{I_{rms}}{\sqrt2}\ \ \text{(continuous)}` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_m` },
      ],
      waveform: [
        'Two gate-pulse trains 180° apart; T1/T2 share the same pulse, as do T3/T4.',
        'In continuous conduction vo is a shifted full-wave with negative portions of area α; the load current is nearly constant with RL (large L).',
        'In discontinuous conduction vo has zero intervals between pulses.',
      ],
      advantages: ['Wide control range (including inversion)', 'Ripple frequency 2f', 'No DC in the supply'],
      disadvantages: ['Four SCRs and gate circuits', 'Lagging power factor ≈ cos α', 'Line current harmonics'],
      applications: ['DC motor speed control (two-quadrant)', 'Battery charging with regeneration', 'HVDC-style converters in small scale'],
    },
    steps: [
      'The source enters the positive half-cycle: T1 and T2 are forward biased but blocking.',
      'At ωt = α the gate pulses are applied to T1 and T2.',
      'T1–T2 conduct: A → T1 → load → T2 → B, vo = vs.',
      'The source passes zero. With an inductive load T1–T2 keep conducting and vo is negative; with R / small L the current dies out and they turn off.',
      'The negative half-cycle begins: T3 and T4 become forward biased and wait for their gate pulses.',
      'At ωt = π + α gate pulses are applied to T3 and T4.',
      'T3–T4 turn on; they reverse-bias T1–T2 (line commutation) and vo = −vs.',
    ],
  },

  'sc-1ph': {
    keyFormulas: [{ label: 'Any load (freewheeling through T-D)', tex: r`V_{dc}=\frac{V_m}{\pi}(1+\cos\alpha),\quad V_{rms}=V_m\sqrt{\frac{\pi-\alpha}{2\pi}+\frac{\sin2\alpha}{4\pi}}` }],
    note:
      'The diodes provide an inherent freewheeling path: when vs reverses, the current transfers from the SCR–diode pair (A→load) to the SCR–diode pair that shorts the load (freewheeling), so vo = 0. The output voltage never goes negative — only one quadrant of operation.',
    viva: [
      'Why does a half-controlled bridge not need a separate freewheeling diode?',
      'Why can the half-controlled bridge not operate in inverter mode?',
      'Which devices carry the freewheeling current in the interval π to π + α?',
      'How does the input power factor compare with the fully controlled bridge at the same α?',
    ],
    insight:
      'Cheaper than the fully controlled bridge (two SCRs, two diodes) and gives a better input power factor at low output, which is why it is used for small DC drives and field-winding supplies where reversal of power is not needed.',
    theory: {
      operation: [
        'T1 is fired at α with D2 conducting: A → T1 → load → D2 → B.',
        'When vs crosses zero at π, D1 takes over from D2 (bottom diode on the other leg) and T1–D1 short the load: freewheeling, vo = 0.',
        'At π + α T2 is fired, takes over from T1 and conducts with D1 until 2π.',
      ],
      sequence: 'T1-D2: α → π;  T1-D1 (freewheel): π → π + α;  T2-D1: π + α → 2π;  T2-D2 (freewheel): 2π → 2π + α.',
      equations: [
        { label: 'Average output voltage', tex: r`V_{dc}=\dfrac{V_m}{\pi}(1+\cos\alpha)` },
        { label: 'RMS output voltage', tex: r`V_{rms}=V_m\sqrt{\dfrac{\pi-\alpha}{2\pi}+\dfrac{\sin2\alpha}{4\pi}}` },
        { label: 'Ripple frequency', tex: r`f_r=2f` },
        { label: 'Power factor (large L, smooth current)', tex: r`PF\approx\dfrac{\sqrt2\,(1+\cos\alpha)}{\sqrt{\pi(\pi-\alpha)}}` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_m` },
      ],
      waveform: [
        'vo equals vs between α and π and is zero otherwise (identical for R and RL load).',
        'The load current stays positive with RL load; the SCR conducts for π (180°) in CCM, the diodes alternate every π.',
      ],
      advantages: ['No negative output voltage; inherent freewheeling', 'Only two gate circuits', 'Better PF than fully controlled'],
      disadvantages: ['One-quadrant operation only', 'Source current has a DC-free but lower-quality shape at large α'],
      applications: ['DC drives without regeneration', 'Field supplies', 'Battery chargers'],
    },
    steps: [
      'The source is positive: T1 and D2 are forward biased; T1 blocks until gated.',
      'At ωt = α the gate pulse is applied to T1.',
      'T1 and D2 conduct: the load receives vs.',
      'When vs falls through zero, D1 takes over from D2 and T1–D1 short-circuit the load: freewheeling with vo = 0.',
      'At π + α T2 is fired; it takes over from T1 and conducts with D1.',
      'The cycle repeats every π: vo has one pulse per half-cycle (ripple frequency 2f).',
    ],
  },

  'hw-scr-3ph': {
    keyFormulas: [
      { label: 'Continuous current (α ≤ 30° any load, or RL)', tex: r`V_{dc}=\frac{3\sqrt3}{2\pi}V_{m,ph}\cos\alpha` },
      { label: 'R load, α > 30°', tex: r`V_{dc}=\frac{3V_{m,ph}}{2\pi}\left[1+\cos(\alpha+30^\circ)\right]` },
    ],
    note:
      'Natural commutation points are 30° after the zero crossing of each phase, so α is measured from that instant. With R load the output is continuous up to α = 30°; beyond that the output has zero intervals. Each SCR conducts for at most 120° and the supply (neutral) carries a DC component.',
    viva: [
      'Where is α = 0 defined for the three-phase half-wave controlled rectifier?',
      'What is the ripple frequency of the output and why?',
      'Why does the transformer secondary of this converter suffer from DC magnetisation?',
      'For an R load, up to which firing angle is the output current continuous?',
    ],
    insight:
      'Three-pulse converter: mostly of historic interest or used in very simple medium-power drives with a star-connected secondary. The six-pulse bridge largely replaced it.',
    theory: {
      operation: [
        'Each SCR can be fired 30° after the instant at which its phase becomes the highest (natural commutation point).',
        'The conducting SCR keeps conducting until the next SCR is fired and its phase is higher (line commutation) or until the current ends.',
        'The load returns to the neutral.',
      ],
      sequence: 'T1 (phase a): 30° + α → 150° + α, T2 (phase b): 150° + α → 270° + α, T3 (phase c): 270° + α → 390° + α.',
      equations: [
        { label: 'Average output (continuous)', tex: r`V_{dc}=\dfrac{3\sqrt3}{2\pi}V_{m,ph}\cos\alpha=1.17\,V_{ph}\cos\alpha` },
        { label: 'Average output (R load, α > 30°)', tex: r`V_{dc}=\dfrac{3V_{m,ph}}{2\pi}\left[1+\cos(\alpha+30^\circ)\right]` },
        { label: 'Ripple frequency', tex: r`f_r=3f` },
        { label: 'SCR currents (continuous)', tex: r`I_{T,avg}=\dfrac{I_{dc}}{3},\quad I_{T,rms}=\dfrac{I_{rms}}{\sqrt3}` },
        { label: 'Peak inverse voltage', tex: r`PIV=\sqrt3\,V_{m,ph}=V_{m,LL}` },
      ],
      waveform: [
        'vo consists of three phase-voltage segments per cycle, each 120° long when current is continuous.',
        'Three gate pulses 120° apart, each pushed to the right by α.',
      ],
      advantages: ['Three-pulse output (3f ripple)', 'Only three SCRs'],
      disadvantages: ['Neutral connection needed', 'DC current in the transformer', 'Low utilisation of the supply'],
      applications: ['Historic / small DC drives', 'Teaching the principle of phase-controlled rectification'],
    },
    steps: [
      'The three phases are displaced by 120°; each SCR is forward biased when its phase is higher than the phase of the conducting SCR.',
      'The gate pulse of the next SCR arrives α after its natural commutation point.',
      'The incoming SCR turns on and turns the outgoing SCR off (line commutation).',
      'The load sees the voltage of the phase whose SCR is conducting (relative to the neutral).',
      'Three pulses per cycle: the ripple frequency is 3f.',
    ],
  },

  'fc-3ph': {
    keyFormulas: [
      { label: 'Continuous current', tex: r`V_{dc}=\frac{3\sqrt2\,V_{LL}}{\pi}\cos\alpha=1.35\,V_{LL}\cos\alpha` },
      { label: 'R load, α > 60°', tex: r`V_{dc}=\frac{3\sqrt2\,V_{LL}}{\pi}\left[1+\cos(\alpha+60^\circ)\right]` },
    ],
    note:
      'α is measured from the natural commutation point (the instant at which the corresponding diode of the uncontrolled bridge would start conducting, 30° after the phase-voltage zero crossing). Each SCR is fired 60° after the previous one in the order T1–T2–T3–T4–T5–T6. For α > 90° with continuous current, Vdc < 0 (inverter mode).',
    viva: [
      'In which order are the six SCRs fired, and what is the phase difference between consecutive gate pulses?',
      'Which two SCRs conduct at the instant ωt = 30° + α and what is the load voltage?',
      'What is the condition for continuous conduction in an R load for the three-phase bridge?',
      'Why is the displacement factor of a phase-controlled converter equal to cos α?',
    ],
    insight:
      'The classical converter for large DC drives, rolling mills, electrolysis plants and HVDC transmission (hundreds of MW). Operating as an inverter (α > 90°) returns energy to the grid.',
    theory: {
      operation: [
        'The six SCRs form two groups: top (T1, T3, T5) connected to the positive rail and bottom (T4, T6, T2) connected to the negative rail.',
        'Every 60° a new SCR is triggered: it commutates its predecessor in the same group.',
        'At each instant one top and one bottom SCR carry the load current, which is split by 120° wide gate pulses/double pulsing so that the circuit also restarts in discontinuous operation.',
      ],
      sequence:
        '(T6,T1) 30°+α → 90°+α, (T1,T2) → 150°+α, (T2,T3) → 210°+α, (T3,T4) → 270°+α, (T4,T5) → 330°+α, (T5,T6) → 390°+α.',
      equations: [
        { label: 'Average output voltage (continuous)', tex: r`V_{dc}=\dfrac{3\sqrt2\,V_{LL}}{\pi}\cos\alpha=\dfrac{3V_{m,LL}}{\pi}\cos\alpha` },
        { label: 'RMS output voltage (continuous, α ≤ 60° R)', tex: r`V_{rms}=V_{m,LL}\sqrt{\dfrac12+\dfrac{3\sqrt3}{4\pi}\cos2\alpha}` },
        { label: 'R load, α > 60°', tex: r`V_{dc}=\dfrac{3\sqrt2\,V_{LL}}{\pi}\left[1+\cos(\alpha+60^\circ)\right]` },
        { label: 'Ripple frequency', tex: r`f_r=6f` },
        { label: 'Displacement factor / power factor', tex: r`DF=\cos\alpha,\quad PF\approx\dfrac{3}{\pi}\cos\alpha=0.955\cos\alpha` },
        { label: 'SCR currents', tex: r`I_{T,avg}=\dfrac{I_{dc}}{3},\quad I_{T,rms}=\dfrac{I_{rms}}{\sqrt3},\quad \text{conduction }120^\circ` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_{m,LL}=\sqrt2\,V_{LL}` },
      ],
      waveform: [
        'Six gate pulses 60° apart; the whole pattern slides right by α.',
        'vo is made of 60° segments of line voltage shifted by α; for α > 60° segments become negative (continuous current) or drop to zero (R load).',
        'Each SCR conducts for 120°; the SCR voltage shows a notch at turn-on and then blocks ±V_m,LL.',
      ],
      advantages: ['Low ripple (6f)', 'Full four-quadrant-ready (two-quadrant) control', 'High efficiency, high power capability'],
      disadvantages: ['Complex gate drive (six SCRs)', 'Lagging power factor, harmonic currents', 'Commutation notches in the line voltage'],
      applications: ['Large DC motor drives, rolling mills', 'HVDC converters', 'Electrochemical plants'],
    },
    steps: [
      'The three phase voltages are displaced by 120°: at each instant one phase is the highest and one the lowest.',
      'Each SCR is fired α after its natural commutation point. Gate pulses are 60° apart in the order T1-T2-T3-T4-T5-T6.',
      'The newly fired SCR takes over from the previous SCR of its group (line commutation).',
      'One top SCR and one bottom SCR carry the load current: vo is a 60° segment of a line voltage.',
      'Six pulses per cycle — ripple frequency 6f; each SCR conducts for 120° (continuous current).',
      'Vdc = 1.35·VLL·cos α. For α > 90° the average becomes negative (inverter mode if the load can return energy).',
    ],
  },

  'sc-3ph': {
    keyFormulas: [{ label: 'Any load with freewheeling through T-D', tex: r`V_{dc}=\frac{3\sqrt2\,V_{LL}}{2\pi}(1+\cos\alpha)=0.675\,V_{LL}(1+\cos\alpha)` }],
    note:
      'The top group is controlled (T1, T3, T5) and the bottom group are diodes (D2, D4, D6). For α > 60° the load current freewheels through one SCR and the diode of the same phase leg, so vo = 0 and the output voltage is never negative. The ripple frequency is 3f for α > 60° and 6f only at α = 0.',
    viva: [
      'Why is the output voltage of a three-phase semi-converter never negative?',
      'What is the output ripple frequency for α = 0 and for α > 60° ?',
      'How does the formula Vdc ∝ (1 + cos α) differ from the fully controlled bridge?',
      'Which two devices form the freewheeling path?',
    ],
    insight:
      'Cheaper and simpler than the fully controlled bridge, and with a better input power factor at reduced output, but the output ripple is higher and no inversion is possible: used in medium-power DC drives with one-quadrant operation.',
    theory: {
      operation: [
        'The SCRs of the top group are fired α after their natural commutation points. The diodes of the bottom group commutate naturally, always selecting the lowest phase.',
        'For α ≤ 60° the output looks like that of a full bridge (continuous, 6 pulses).',
        'For α > 60° the output contains intervals of zero voltage during which the current freewheels through an SCR and the diode of the same phase.',
      ],
      sequence: 'T1/T3/T5 carry current for 120° (each fired in sequence 120° apart); the diode conducting at a given moment is the one on the lowest phase.',
      equations: [
        { label: 'Average output voltage', tex: r`V_{dc}=\dfrac{3\sqrt2\,V_{LL}}{2\pi}(1+\cos\alpha)` },
        { label: 'Ripple frequency', tex: r`f_r=3f\ (\alpha>60^\circ),\quad 6f\ (\alpha=0)` },
        { label: 'Peak inverse voltage', tex: r`PIV=V_{m,LL}=\sqrt2\,V_{LL}` },
      ],
      waveform: ['Three gate pulses 120° apart; vo = v_top − v_lowest ≥ 0.', 'Zero-voltage intervals appear for α > 60° (freewheeling).'],
      advantages: ['Never negative output, inherent freewheeling', 'Three gate circuits only', 'Better PF at low output'],
      disadvantages: ['No inversion', 'Higher ripple at large α', 'Asymmetrical line currents / harmonics'],
      applications: ['One-quadrant DC drives', 'Battery chargers', 'Field excitation supplies'],
    },
    steps: [
      'The three-phase voltages are displaced by 120°. The bottom diodes always connect the lowest phase to the N rail.',
      'The SCR of the top group is fired α after its natural commutation point and connects its phase to the P rail.',
      'One SCR and one diode carry the load current: vo = v_phase(SCR) − v_phase(lowest).',
      'When the SCR phase itself becomes the lowest one, the SCR–diode pair of the same phase shorts the load: freewheeling, vo = 0.',
      'The next SCR is fired 120° later and takes over: the cycle repeats three times per period (ripple 3f).',
    ],
  },
};

export const VOLTAGE_CONVENTIONS = commonDef;
