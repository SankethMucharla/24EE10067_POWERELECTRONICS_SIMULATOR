import { VOLTAGE_CONVENTIONS } from '../content/educational';
export default function Help() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8">
      <div className="panel"><div className="panel-body prose-lab">
        <div className="eyebrow">Help</div>
        <h1 className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>Using the lab</h1>
        <h3>Quick start</h3>
        <ul>
          <li>Choose a converter in the left column (or from <b>Simulator → Converters</b>).</li>
          <li>Set the source, load (R or R-L), and firing angle α for controlled converters.</li>
          <li>With <b>Auto calculate</b> on, results update as you type; otherwise press <b>RUN SIMULATION</b>.</li>
          <li>Use Start / Pause / Step / Reset and the speed buttons to animate the circuit; drag the scrubber to inspect any instant.</li>
          <li>Waveforms: scroll to zoom, drag to pan (or switch to box-zoom), double-click or <b>Reset zoom</b> to restore, hover for values, click legend entries to hide traces.</li>
        </ul>
        <h3>Voltage conventions</h3>
        <p>{VOLTAGE_CONVENTIONS}</p>
        <p>Single-phase: the input is the RMS source voltage (for the centre-tapped rectifier, the RMS of each half of the secondary). Three-phase: the input is the line-line RMS voltage.</p>
        <h3>Modelling assumptions</h3>
        <ul>
          <li>Ideal supply (no source inductance, so commutation is instantaneous) and ideal switches, with an optional constant forward drop Vf.</li>
          <li>The load current is found by exact integration of L·di/dt + R·i = vo(t), run until the steady state is reached; metrics use one steady-state cycle.</li>
          <li>The simulated PIV is the largest reverse voltage observed; the theory PIV is the design rating. Idle devices are assumed to share the supply equally.</li>
          <li>Theory values for discontinuous conduction are derived from the extinction angle β; items without a closed form show "sim only" or "N/A for this topology".</li>
        </ul>
        <h3>Credits</h3>
        <p>Concept inspired by the IIT Kharagpur rectifier virtual lab. This implementation is an independent build.</p>
      </div></div>
    </div>
  );
}
