import type { Eq } from './educational';
const r = String.raw;

export interface TheorySection {
  id: string;
  title: string;
  intro: string[];
  blocks: { heading: string; paragraphs?: string[]; bullets?: string[]; equations?: Eq[] }[];
}

export const THEORY_SECTIONS: TheorySection[] = [
  {
    id: 'diode',
    title: 'Diode Rectifiers (uncontrolled)',
    intro: [
      'A diode rectifier converts AC to DC with no control: the output voltage is fixed by the supply. Diodes turn on by themselves when forward biased and turn off when their current falls to zero (natural commutation).',
    ],
    blocks: [
      {
        heading: 'Rules of conduction',
        bullets: [
          'A diode conducts when its anode voltage is higher than its cathode voltage (by more than the forward drop Vf).',
          'It stops conducting when its current reaches zero — not when the voltage reverses. With an inductive load the current continues after the source voltage has passed through zero.',
          'In a bridge the top diode on the highest phase and the bottom diode on the lowest phase conduct together.',
        ],
      },
      {
        heading: 'Summary of diode rectifiers (R load, ideal diodes)',
        equations: [
          { label: 'Single-phase half-wave', tex: r`V_{dc}=\dfrac{V_m}{\pi},\;f_r=f,\;PIV=V_m,\;RF=1.21` },
          { label: 'Single-phase full-wave (CT / bridge)', tex: r`V_{dc}=\dfrac{2V_m}{\pi},\;f_r=2f,\;PIV=2V_m\,/\,V_m,\;RF=0.483` },
          { label: 'Three-phase bridge', tex: r`V_{dc}=\dfrac{3V_{m,LL}}{\pi},\;f_r=6f,\;PIV=V_{m,LL},\;RF=0.042` },
        ],
      },
      {
        heading: 'Performance parameters',
        equations: [
          { label: 'Form factor', tex: r`FF=\dfrac{V_{rms}}{V_{dc}}` },
          { label: 'Ripple factor', tex: r`RF=\dfrac{V_{ac}}{V_{dc}}=\sqrt{FF^2-1}` },
          { label: 'Rectification efficiency', tex: r`\eta=\dfrac{P_{dc}}{P_{ac}}=\dfrac{V_{dc}I_{dc}}{V_{rms}I_{rms}}` },
          { label: 'Power factor', tex: r`PF=\dfrac{P}{S}=\dfrac{P}{V_{s,rms}I_{s,rms}}` },
        ],
      },
    ],
  },
  {
    id: 'controlled',
    title: 'Controlled Rectifiers (thyristor)',
    intro: [
      'Replacing diodes with SCRs (thyristors) allows the point in the cycle at which conduction starts to be delayed by the firing angle α, so that the average output voltage can be varied.',
    ],
    blocks: [
      {
        heading: 'Firing, extinction and conduction angles',
        bullets: [
          'Firing angle α: electrical angle, measured from the natural commutation point, at which the gate pulse is applied.',
          'Extinction angle β: electrical angle at which the load current falls to zero (discontinuous conduction).',
          'Conduction angle: β − α for one pulse; for continuous conduction each pulse lasts until the next SCR takes over (180° for a single-phase bridge, 60° per pair in a three-phase bridge).',
        ],
      },
      {
        heading: 'An SCR turns on only if…',
        bullets: [
          'it is forward biased (anode voltage above the voltage of the rail it connects to), AND',
          'a gate pulse is present.',
          'It turns off when its current falls below the holding current (zero in this ideal model) — either naturally at the end of a pulse (line commutation), or because the next SCR in its group is fired and is forward biased.',
        ],
      },
      {
        heading: 'Natural commutation points (α = 0)',
        paragraphs: ['The natural commutation point is the instant at which the corresponding diode of an uncontrolled rectifier would begin to conduct.'],
        bullets: [
          'Single-phase: ωt = 0 (T1/T2) and ωt = 180° (T3/T4).',
          'Three-phase half-wave: ωt = 30°, 150°, 270° for the three phases.',
          'Three-phase bridge: ωt = 30°, 90°, 150°, 210°, 270°, 330° for T1 … T6.',
        ],
      },
      {
        heading: 'Average output voltage with continuous current',
        equations: [
          { label: 'Single-phase fully controlled bridge', tex: r`V_{dc}=\dfrac{2V_m}{\pi}\cos\alpha` },
          { label: 'Single-phase semi-controlled bridge', tex: r`V_{dc}=\dfrac{V_m}{\pi}(1+\cos\alpha)` },
          { label: 'Three-phase half-wave', tex: r`V_{dc}=\dfrac{3\sqrt3\,V_{m,ph}}{2\pi}\cos\alpha` },
          { label: 'Three-phase fully controlled bridge', tex: r`V_{dc}=\dfrac{3V_{m,LL}}{\pi}\cos\alpha=\dfrac{3\sqrt2\,V_{LL}}{\pi}\cos\alpha` },
          { label: 'Three-phase semi-controlled bridge', tex: r`V_{dc}=\dfrac{3V_{m,LL}}{2\pi}(1+\cos\alpha)` },
        ],
      },
    ],
  },
  {
    id: 'r-load',
    title: 'Resistive (R) load',
    intro: [
      'With a purely resistive load the load current is an exact copy of the load voltage: io(t) = vo(t) / R. The current therefore falls to zero together with the voltage and every pulse is separated from the next by a zero interval whenever the output voltage returns to zero.',
    ],
    blocks: [
      {
        heading: 'Consequences',
        bullets: [
          'The extinction angle is the instant where vo returns to zero (β = 180° for a source-driven pulse).',
          'The output current is never negative, so the SCR / diode always turns off at the voltage zero crossing.',
          'The efficiency of the rectifier follows from Vdc and Vrms only: η = Vdc² / Vrms².',
          'Power factor = Vo,rms / Vs,rms (the load current is in phase with the output voltage).',
        ],
      },
      {
        heading: 'Ohm’s law at every instant',
        equations: [{ label: '', tex: r`i_o(t)=\dfrac{v_o(t)}{R},\qquad I_{dc}=\dfrac{V_{dc}}{R},\qquad I_{rms}=\dfrac{V_{rms}}{R}` }],
      },
    ],
  },
  {
    id: 'rl-load',
    title: 'Inductive (R-L) load',
    intro: [
      'An inductor opposes changes of current, so the current cannot follow the voltage. It must be found from the differential equation of the load:',
    ],
    blocks: [
      {
        heading: 'Load equation',
        equations: [
          { label: 'Load differential equation', tex: r`L\dfrac{di_o}{dt}+R\,i_o=v_o(t)` },
          { label: 'Load angle and impedance', tex: r`\phi=\tan^{-1}\dfrac{\omega L}{R},\qquad Z=\sqrt{R^2+(\omega L)^2}` },
          { label: 'Current for vo = Vm sin θ starting at θ = α with i(α) = I₀', tex: r`i_o(\theta)=\dfrac{V_m}{Z}\sin(\theta-\phi)+\left[I_0-\dfrac{V_m}{Z}\sin(\alpha-\phi)\right]e^{-(\theta-\alpha)/\tan\phi}` },
        ],
      },
      {
        heading: 'Continuous vs discontinuous current',
        bullets: [
          'Discontinuous (DCM): the current reaches zero at the extinction angle β before the next SCR is fired; the output is zero (and the current is zero) in between. Starting from I₀ = 0, the extinction angle satisfies sin(β − φ) = sin(α − φ)·e^{(α−β)/tanφ}.',
          'Continuous (CCM): the current never reaches zero. The average output voltage then depends only on the topology and α, not on R or L.',
          'The boundary is when β equals the angle at which the next pulse starts (α + π for a single-phase bridge, α + 60° for the three-phase bridge).',
        ],
      },
      {
        heading: 'Freewheeling',
        paragraphs: [
          'When the load current is positive but the rectifier cannot supply it without negative output voltage, a freewheeling path (a diode across the load, or the diodes of a semi-controlled bridge) takes over. The output voltage is clamped to ≈ 0 and the current decays through R and L with time constant L/R.',
        ],
        equations: [{ label: 'Freewheeling current', tex: r`i_o(t)=I_1\,e^{-R\,t/L}` }],
      },
      {
        heading: 'How this simulator solves the RL load',
        paragraphs: [
          'At each time step the conduction state is decided (which devices conduct), the load voltage vo(t) follows from the state, and the current is advanced with an exact exponential integrator of L di/dt + R i = vo (linear interpolation of vo inside the step). Current extinction (i → 0) is detected and the devices are turned off. This reproduces build-up, decay, extinction and continuous/discontinuous behaviour without assuming any waveform.',
        ],
      },
    ],
  },
  {
    id: 'equations',
    title: 'Important Equations',
    intro: ['A compact collection of the equations used by the simulator. ' + 'Vm is the peak of the source (1φ) or phase (3φ) voltage; V_LL is the line-line RMS voltage.'],
    blocks: [
      {
        heading: 'Voltage definitions',
        equations: [
          { label: 'Single-phase', tex: r`V_m=\sqrt2\,V_{s}` },
          { label: 'Three-phase, line-line RMS', tex: r`V_{ph}=\dfrac{V_{LL}}{\sqrt3},\quad V_{m,ph}=\sqrt2\,V_{ph},\quad V_{m,LL}=\sqrt2\,V_{LL}=\sqrt3\,V_{m,ph}` },
        ],
      },
      {
        heading: 'Average output voltage',
        equations: [
          { label: '1φ half-wave diode', tex: r`V_{dc}=\dfrac{V_m}{\pi}` },
          { label: '1φ full-wave diode', tex: r`V_{dc}=\dfrac{2V_m}{\pi}` },
          { label: '3φ bridge diode', tex: r`V_{dc}=\dfrac{3\sqrt2}{\pi}V_{LL}` },
          { label: '1φ half-wave SCR (R)', tex: r`V_{dc}=\dfrac{V_m}{2\pi}(1+\cos\alpha)` },
          { label: '1φ fully controlled (CCM)', tex: r`V_{dc}=\dfrac{2V_m}{\pi}\cos\alpha` },
          { label: '1φ semi-controlled', tex: r`V_{dc}=\dfrac{V_m}{\pi}(1+\cos\alpha)` },
          { label: '3φ half-wave (CCM)', tex: r`V_{dc}=\dfrac{3\sqrt3}{2\pi}V_{m,ph}\cos\alpha` },
          { label: '3φ fully controlled (CCM)', tex: r`V_{dc}=\dfrac{3\sqrt2}{\pi}V_{LL}\cos\alpha` },
          { label: '3φ semi-controlled', tex: r`V_{dc}=\dfrac{3\sqrt2}{2\pi}V_{LL}(1+\cos\alpha)` },
        ],
      },
      {
        heading: 'General pulse formula',
        paragraphs: [
          'Any of these converters produces p identical pulses per cycle, each a sinusoidal segment of peak Vp. If a pulse runs from ψ = a to ψ = e:',
        ],
        equations: [
          { label: 'Average', tex: r`V_{dc}=\dfrac{p\,V_p}{2\pi}\left(\cos a-\cos e\right)` },
          { label: 'RMS', tex: r`V_{rms}^2=\dfrac{p\,V_p^2}{4\pi}\left[(e-a)-\dfrac{\sin2e-\sin2a}{2}\right]` },
        ],
      },
      {
        heading: 'Power quality',
        equations: [
          { label: 'Displacement factor', tex: r`DF=\cos\phi_1` },
          { label: 'Total harmonic distortion of the source current', tex: r`THD=\dfrac{\sqrt{I_s^2-I_{s1}^2}}{I_{s1}}` },
          { label: 'Power factor', tex: r`PF=\dfrac{I_{s1}}{I_s}\cos\phi_1` },
        ],
      },
    ],
  },
];
