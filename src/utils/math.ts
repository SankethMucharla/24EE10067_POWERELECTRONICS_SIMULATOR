export const TWO_PI = 2 * Math.PI;
export const DEG = Math.PI / 180;
export const SQRT2 = Math.SQRT2;
export const SQRT3 = Math.sqrt(3);

export const rad = (d: number) => d * DEG;
export const deg = (r: number) => r / DEG;

/** positive modulo */
export function mod(a: number, m: number): number {
  const r = a % m;
  return r < 0 ? r + m : r;
}

/** Numerical integral of f over [a,b] using composite Simpson's rule with n (even) intervals. */
export function simpson(f: (x: number) => number, a: number, b: number, n = 2000): number {
  if (b <= a) return 0;
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let k = 1; k < n; k++) s += f(a + k * h) * (k % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Bisection root finder on a sign change interval */
export function bisect(f: (x: number) => number, lo: number, hi: number, iters = 80): number {
  let flo = f(lo);
  for (let k = 0; k < iters; k++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if ((fm > 0) === (flo > 0)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
  }
  return 0.5 * (lo + hi);
}

export function fmt(x: number | undefined, digits = 2): string {
  if (x === undefined || x === null || Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
  const ax = Math.abs(x);
  if (ax !== 0 && (ax < 1e-3 || ax >= 1e6)) return x.toExponential(2);
  return x.toFixed(digits);
}

export function pctError(sim: number, theory: number): number {
  const ref = Math.abs(theory);
  if (ref < 1e-9) return Math.abs(sim) < 1e-6 ? 0 : NaN;
  return (Math.abs(sim - theory) / ref) * 100;
}
