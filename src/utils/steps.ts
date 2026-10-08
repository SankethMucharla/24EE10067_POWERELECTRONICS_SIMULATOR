/**
 * Insert a vertical edge wherever a waveform jumps between two adjacent samples
 * (switching instants), so the plot shows a true step instead of a sloped line.
 * No smoothing or spline is ever applied.
 */
export function stepify(x: ArrayLike<number>, y: ArrayLike<number>, frac = 0.2): { x: number[]; y: number[] } {
  const n = y.length;
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < n; i++) {
    if (y[i] < mn) mn = y[i];
    if (y[i] > mx) mx = y[i];
  }
  const thr = (mx - mn) * frac;
  const ox: number[] = [];
  const oy: number[] = [];
  for (let i = 0; i < n; i++) {
    ox.push(x[i]);
    oy.push(y[i]);
    if (i + 1 < n && thr > 0 && Math.abs(y[i + 1] - y[i]) > thr) {
      const xm = x[i] + (x[i + 1] - x[i]) * 0.5;
      ox.push(xm, xm);
      oy.push(y[i], y[i + 1]);
    }
  }
  return { x: ox, y: oy };
}
