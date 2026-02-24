import type { StatRecord } from './types.ts';

/* ── Normal distribution ── */

/** Normal CDF approximation (Abramowitz & Stegun 26.2.17) — used for p-value display only. */
function _normalCDF(z: number): number {
  const x    = Math.abs(z);
  const t    = 1 / (1 + 0.2315419 * x);
  const pd   = 0.3989423 * Math.exp(-0.5 * x * x);
  const poly = t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const tail = pd * poly;
  return z >= 0 ? 1 - tail : tail;
}

/** Compute a z-test p-value string from a z-score. */
export function pValue(z: number, twoTailed: boolean): string {
  const oneTailP = _normalCDF(-Math.abs(z));
  const p = twoTailed ? 2 * oneTailP : oneTailP;
  return p < 0.001 ? '< .001' : p.toFixed(3);
}

/* ── t-distribution via regularized incomplete beta function (Numerical Recipes) ── */

function lgamma(z: number): number {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];
  let x = z, y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 100, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  return x < (a + 1) / (a + b + 2)
    ? bt * betaCF(x, a, b) / a
    : 1 - bt * betaCF(1 - x, b, a) / b;
}

/** Compute a t-distribution p-value string from a t-score and degrees of freedom. */
export function tPValue(t: number, df: number, twoTailed: boolean): string {
  const absT = Math.abs(t);
  const x = df / (df + absT * absT);
  const p = ibeta(x, df / 2, 0.5);   // two-tailed p-value
  const result = twoTailed ? p : p / 2;
  return result < 0.001 ? '< .001' : result.toFixed(3);
}

/** Compute an F-distribution p-value string (one-tailed upper tail, for ANOVA/regression). */
export function fPValue(f: number, df1: number, df2: number): string {
  const x = df2 / (df2 + df1 * f);
  const p = ibeta(x, df2 / 2, df1 / 2);
  return p < 0.001 ? '< .001' : p.toFixed(3);
}

/* ── Utility ── */

/** Convert a records array [{ Statistic, Value }, …] to a plain key→value dict. */
export function statsDict(records: StatRecord[]): Record<string, string | number | null> {
  const d: Record<string, string | number | null> = {};
  records.forEach(row => { d[row.Statistic] = row.Value; });
  return d;
}
