# 24EE10067_PESIMULATOR — AC→DC Rectifier Virtual Laboratory

Interactive power-electronics lab: 11 rectifier topologies (1φ/3φ, diode / half-controlled / fully controlled),
R, RL and RLE (back-EMF) loads, optional freewheeling diode, real switching-logic simulation
(L·di/dt + R·i + E = vo), oscilloscope-style waveforms with Auto/zoom, conduction table,
theory-vs-simulation performance table and a power-quality section (PF, DF, THD, harmonics).

## Run
```
npm install
npm run dev        # development server
npm run build      # type-check + production build into dist/
npm test           # numerical verification (theory vs simulation), should end with "0 failures"
```

## Structure
- `src/simulations/` engine (switching logic + load ODE) and topology definitions
- `src/calculations/` independent closed-form theory, RLE solver, validation, performance rows, conduction table
- `src/components/`, `src/pages/`, `src/circuits/` UI, waveforms, circuit diagrams
- `scripts/verify.ts` automated checks

## Model assumptions
Ideal switches (optional constant Vf), ideal sinusoidal source with no source inductance (instant commutation),
idle devices share the voltage equally.
