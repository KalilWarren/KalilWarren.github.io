/* ── 1-Predictor Linear Regression Student Practice Module ── */
/*
 * Masking patterns mirror problems.ts maskRegressionTable():
 *   easy:     hide MSR, MSE, F           (all SS + df shown)
 *   moderate: hide SSE, MSR, MSE, F      (SSR, df_reg=1, df_err, SST, df_tot shown)
 *   hard:     hide SSR, SSE, MSE, SST, DFT (df_reg=1, MSR, F, df_err shown)
 *
 * Given to students: M_X, M_Y, SS_X, SS_Y (= SST), r
 * Students compute:  b = r × √(SS_Y / SS_X),  a = M_Y − b × M_X
 * Notation:          Ŷ = bX + a
 */

/* ── Types ── */

type Difficulty  = 'easy' | 'moderate' | 'hard';
type Tail        = 'two' | 'right' | 'left';
type MaskedField = 'SSR' | 'SSE' | 'SST' | 'DFT' | 'MSR' | 'MSE' | 'F';

interface RegTable {
  SSR: number; SSE: number; SST: number;
  DFR: number; DFE: number; DFT: number;
  MSR: number; MSE: number; F:   number;
}

export interface RegProblem {
  n:          number;
  alpha:      number;
  tail:       Tail;
  difficulty: Difficulty;
  variable_x: string;
  unit_x:     string;
  variable_y: string;
  unit_y:     string;
  population: string;
  /* Given values (displayed to student) */
  MX:         number;  // mean of X (2 dp)
  MY:         number;  // mean of Y (2 dp)
  SS_X:       number;  // Σ(X − M_X)²  (2 dp)
  SS_Y:       number;  // Σ(Y − M_Y)² = SST (2 dp)
  r_display:  number;  // Pearson r (2 dp)
  /* Expected answers (derived from displayed values) */
  b:          number;  // slope    = r × √(SS_Y / SS_X)  (2 dp)
  a:          number;  // intercept = M_Y − b × M_X       (2 dp)
  table:      RegTable;
  R2:         number;  // 2 dp
  Fcrit:      number;  // 3 dp
  decision_true: 'reject' | 'fail';
  masked:     Set<MaskedField>;
}

export interface GradeResult {
  cells:      Partial<Record<MaskedField, boolean>>;
  hyp:        boolean;
  b:          boolean;
  a:          boolean;
  fcrit:      boolean;
  R2:         boolean;
  decision:   boolean;
  allCorrect: boolean;
}

/* ── Utilities ── */

function r2(x: number): number { return Math.round(x * 100) / 100; }
function r3(x: number): number { return Math.round(x * 1000) / 1000; }

function rInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function rChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rWeighted<T>(arr: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < arr.length; i++) { r -= weights[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

function rUniform(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

/* ── Inverse F distribution (Lanczos + regularized incomplete beta + bisection) ── */

function lgamma(z: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  if (x < (a + 1) / (a + b + 2)) {
    return (Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a) * betaCF(x, a, b);
  }
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * betaCF(1 - x, b, a);
}

function fUpperTail(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return ibeta(x, df2 / 2, df1 / 2);
}

function fInv(alpha: number, df1: number, df2: number): number {
  let lo = 0, hi = 500;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (fUpperTail(mid, df1, df2) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ── Masking sets (mirrors problems.ts maskRegressionTable) ── */

function getMasked(difficulty: Difficulty): Set<MaskedField> {
  if (difficulty === 'easy')
    return new Set<MaskedField>(['MSR', 'MSE', 'F']);
  if (difficulty === 'moderate')
    return new Set<MaskedField>(['SSE', 'MSR', 'MSE', 'F']);
  /* hard */
  return new Set<MaskedField>(['SSR', 'SSE', 'MSE', 'SST', 'DFT']);
}

/* ── Context bank ── */

const VARIABLES = [
  { variable: 'working memory capacity',      unit: 'units'   },
  { variable: 'systolic blood pressure',      unit: 'mmHg'    },
  { variable: 'daily step count',             unit: 'steps'   },
  { variable: 'sleep duration',               unit: 'hours'   },
  { variable: 'test anxiety score',           unit: 'points'  },
  { variable: 'reaction time',                unit: 'ms'      },
  { variable: 'cortisol level',               unit: 'nmol/L'  },
  { variable: 'academic motivation score',    unit: 'points'  },
  { variable: 'life satisfaction score',      unit: 'points'  },
  { variable: 'job stress score',             unit: 'points'  },
  { variable: 'hours of weekly exercise',     unit: 'hours'   },
  { variable: 'reading comprehension score',  unit: 'points'  },
  { variable: 'attention span',               unit: 'minutes' },
  { variable: 'pain tolerance threshold',     unit: 'units'   },
  { variable: 'GPA',                          unit: 'points'  },
  { variable: 'self-efficacy score',          unit: 'points'  },
];

const POPULATIONS = [
  'undergraduate students',
  'adults aged 25–45',
  'young adults',
  'office workers',
  'high school students',
  'adults under stress',
  'college students',
  'full-time employees',
  'adults aged 40–60',
  'adult patients',
  'eighth-grade students',
  'adults',
];

/* ── DOM helpers ── */

function setHtml(id: string, html: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setDisplay(id: string, val: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = val;
}

function clearInput(id: string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = '';
}

function uncheckRadios(name: string): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)
    .forEach(radio => { radio.checked = false; });
}

/* ── Generate problem ── */

export function generateProblem(): RegProblem {
  const nOpts     = [10, 12, 15, 20, 25, 30];
  const n         = rChoice(nOpts);
  const alpha     = rWeighted([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const tail      = rWeighted<Tail>(['two', 'right', 'left'], [0.5, 0.25, 0.25]);
  const targetSig = rWeighted(['sig', 'nonsig'], [0.6, 0.4]);
  const difficulty = rWeighted<Difficulty>(['easy', 'moderate', 'hard'], [0.33, 0.34, 0.33]);

  // Pick two distinct variables
  const idxX = rInt(0, VARIABLES.length - 1);
  let idxY   = rInt(0, VARIABLES.length - 2);
  if (idxY >= idxX) idxY++;
  const varX = VARIABLES[idxX];
  const varY = VARIABLES[idxY];
  const pop  = rChoice(POPULATIONS);

  // Population moments
  const gmOpts: number[] = [];
  for (let v = 40; v <= 120; v += 5) gmOpts.push(v);
  const muX = rChoice(gmOpts);
  const sdX = rInt(6, 20);
  const muY = rChoice(gmOpts);
  const sdY = rInt(6, 20);

  // df
  const DFR = 1;
  const DFE = n - 2;
  const DFT = n - 1;

  // Target F → target R²
  const Fcrit = r3(fInv(alpha, DFR, DFE));
  let Ftarget: number;
  if (targetSig === 'sig') {
    Ftarget = rUniform(Fcrit + 0.3, Fcrit + 8);
  } else {
    const upper = Math.max(0.1, Fcrit - 0.3);
    Ftarget = rUniform(0.05, upper);
  }
  const R2target = Ftarget / (Ftarget + DFE);
  const rTarget  = Math.sqrt(Math.max(0, Math.min(0.9999, R2target)));

  // Slope sign
  const sign = tail === 'right' ? 1 : tail === 'left' ? -1 : (Math.random() < 0.5 ? 1 : -1);

  // Simulate X ~ N(muX, sdX)
  const X: number[] = Array.from({ length: n }, () => {
    const u1 = Math.random(), u2 = Math.random();
    return muX + sdX * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });

  // Standardized noise
  const Znoise: number[] = Array.from({ length: n }, () => {
    const u1 = Math.random(), u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });

  // Standardize X
  const xMean = X.reduce((s, v) => s + v, 0) / n;
  const xSd   = Math.sqrt(X.reduce((s, v) => s + (v - xMean) ** 2, 0) / (n - 1));
  const Xstd  = X.map(v => (xSd > 0 ? (v - xMean) / xSd : 0));

  // Standardize noise
  const zMean = Znoise.reduce((s, v) => s + v, 0) / n;
  const zSd   = Math.sqrt(Znoise.reduce((s, v) => s + (v - zMean) ** 2, 0) / (n - 1));
  const Zstd  = Znoise.map(v => (zSd > 0 ? (v - zMean) / zSd : v));

  // Y_std = sign * rTarget * X_std + sqrt(1 − rTarget²) * Z_std
  const residualWeight = Math.sqrt(Math.max(0, 1 - rTarget * rTarget));
  const Ystd = Xstd.map((xs, i) => sign * rTarget * xs + residualWeight * Zstd[i]);

  // Scale Y to (muY, sdY)
  const ystdMean = Ystd.reduce((s, v) => s + v, 0) / n;
  const ystdSd   = Math.sqrt(Ystd.reduce((s, v) => s + (v - ystdMean) ** 2, 0) / (n - 1));
  const Y = Ystd.map(v => muY + (ystdSd > 0 ? sdY * (v - ystdMean) / ystdSd : 0));

  // Sample statistics
  const yMean = Y.reduce((s, v) => s + v, 0) / n;
  const Sxx   = X.reduce((s, v) => s + (v - xMean) ** 2, 0);  // SS_X
  const Syy   = Y.reduce((s, v) => s + (v - yMean) ** 2, 0);  // SS_Y = SST
  const Sxy   = X.reduce((s, v, i) => s + (v - xMean) * (Y[i] - yMean), 0);

  if (Sxx < 1e-10 || Syy < 1e-10) return generateProblem();

  // OLS coefficients (raw)
  const b_raw = Sxy / Sxx;
  const a_raw = yMean - b_raw * xMean;

  // ANOVA table (raw)
  const Yhat = X.map(x => a_raw + b_raw * x);
  const SSR  = Yhat.reduce((s, yh) => s + (yh - yMean) ** 2, 0);
  const SSE  = Y.reduce((s, y, i) => s + (y - Yhat[i]) ** 2, 0);
  const SST  = SSR + SSE;
  const MSR  = SSR / DFR;
  const MSE  = SSE / DFE;
  const Fval = MSR / MSE;
  const R2   = r2(SSR / SST);

  if (SSE < 0.001 || SST < 0.001 || !isFinite(Fval) || !isFinite(b_raw)) return generateProblem();

  // Significance check
  const decision_true: 'reject' | 'fail' = Fval >= Fcrit ? 'reject' : 'fail';
  if ((decision_true === 'reject') !== (targetSig === 'sig')) return generateProblem();

  // Slope sign check when targeting significant + directional
  if (targetSig === 'sig' && tail !== 'two') {
    const correctSign = tail === 'right' ? b_raw >= 0 : b_raw <= 0;
    if (!correctSign) return generateProblem();
  }

  // Pearson r from raw data
  const r_raw = Sxy / Math.sqrt(Sxx * Syy);

  // Displayed given values (all 2 dp)
  const MX        = r2(xMean);
  const MY        = r2(yMean);
  const SS_X      = r2(Sxx);
  const SS_Y      = r2(Syy);   // equals SST
  const r_display = r2(r_raw);

  // Expected answers computed from displayed values (so students' arithmetic matches)
  const SS_ratio = SS_X > 0 ? SS_Y / SS_X : 0;
  const b        = r2(r_display * Math.sqrt(SS_ratio));
  const a        = r2(MY - b * MX);

  return {
    n, alpha, tail, difficulty,
    variable_x: varX.variable, unit_x: varX.unit,
    variable_y: varY.variable, unit_y: varY.unit,
    population: pop,
    MX, MY, SS_X, SS_Y, r_display,
    b, a,
    table: { SSR, SSE, SST, DFR, DFE, DFT, MSR, MSE, F: Fval },
    R2, Fcrit, decision_true,
    masked: getMasked(difficulty),
  };
}

/* ── Build interactive regression ANOVA table ── */

function buildTableHtml(p: RegProblem): string {
  const t = p.table;
  const tdStyle = 'padding:0.38rem 0.6rem;border:1px solid var(--border);text-align:center;';
  const thStyle = 'padding:0.4rem 0.6rem;border:1px solid var(--border);background:var(--bg-subtle);font-weight:600;';

  function inputCell(field: MaskedField, isInt = false): string {
    return `<td style="${tdStyle}">
      <input type="number" step="${isInt ? '1' : '0.01'}" id="lrp-input-${field}"
             class="sp-num-input" style="width:105px;text-align:center;" placeholder="?" />
      <span id="lrp-cell-fb-${field}" style="margin-left:0.25rem;font-size:1em;"></span>
    </td>`;
  }

  function valCell(val: number, isInt = false): string {
    return `<td style="${tdStyle}">${isInt ? val : r2(val).toFixed(2)}</td>`;
  }

  function dashCell(): string {
    return `<td style="${tdStyle}color:#aaa;">—</td>`;
  }

  function cell(field: MaskedField, val: number, isInt = false): string {
    return p.masked.has(field) ? inputCell(field, isInt) : valCell(val, isInt);
  }

  return `<table style="border-collapse:collapse;width:100%;font-size:0.9rem;margin-top:0.6rem;">
    <thead><tr>
      <th style="${thStyle}text-align:left;">Source</th>
      <th style="${thStyle}">SS</th>
      <th style="${thStyle}">df</th>
      <th style="${thStyle}">MS</th>
      <th style="${thStyle}">F</th>
    </tr></thead>
    <tbody>
      <tr>
        <td style="${tdStyle}text-align:left;">Regression</td>
        ${cell('SSR', t.SSR)}
        ${valCell(t.DFR, true)}
        ${cell('MSR', t.MSR)}
        ${cell('F', t.F)}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;">Residual</td>
        ${cell('SSE', t.SSE)}
        ${valCell(t.DFE, true)}
        ${cell('MSE', t.MSE)}
        ${dashCell()}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;">Total</td>
        ${cell('SST', t.SST)}
        ${cell('DFT', t.DFT, true)}
        ${dashCell()}
        ${dashCell()}
      </tr>
    </tbody>
  </table>`;
}

/* ── Hypothesis options ── */

function hypOptions(tail: Tail): Array<{ value: string; label: string }> {
  const correctLabel = tail === 'two'   ? 'H₀: β = 0 &nbsp;&nbsp; Hₐ: β ≠ 0'
                     : tail === 'right' ? 'H₀: β ≤ 0 &nbsp;&nbsp; Hₐ: β &gt; 0'
                     :                   'H₀: β ≥ 0 &nbsp;&nbsp; Hₐ: β &lt; 0';

  const foil1Label  = tail === 'two'   ? 'H₀: β ≠ 0 &nbsp;&nbsp; Hₐ: β = 0'
                    : tail === 'right' ? 'H₀: β ≥ 0 &nbsp;&nbsp; Hₐ: β &lt; 0'
                    :                   'H₀: β ≤ 0 &nbsp;&nbsp; Hₐ: β &gt; 0';

  return [
    { value: 'correct',  label: correctLabel },
    { value: 'reversed', label: foil1Label },
    { value: 'foil',     label: 'H₀: ρ = 0 &nbsp;&nbsp; Hₐ: ρ ≠ 0' },
  ];
}

/* ── Render problem ── */

export function renderProblem(p: RegProblem): void {
  const alphaStr  = p.alpha.toFixed(2);
  const diffLabel = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' }[p.difficulty];
  const tailLabel = p.tail === 'two' ? 'two-tailed' : p.tail === 'right' ? 'right-tailed' : 'left-tailed';
  const dirPhrase = p.tail === 'right' ? 'a positive ' : p.tail === 'left' ? 'a negative ' : 'a ';

  const tdG = 'padding:0.3rem 0.75rem;border:1px solid var(--border);';
  const thG = 'padding:0.3rem 0.75rem;border:1px solid var(--border);background:var(--bg-subtle);text-align:left;font-weight:600;';

  const givenTable = `
    <table style="border-collapse:collapse;font-size:0.9rem;margin:0.6rem 0;">
      <tbody>
        <tr><th style="${thG}">M<sub>X</sub> (mean of X)</th><td style="${tdG}">${p.MX.toFixed(2)} ${p.unit_x}</td></tr>
        <tr><th style="${thG}">M<sub>Y</sub> (mean of Y)</th><td style="${tdG}">${p.MY.toFixed(2)} ${p.unit_y}</td></tr>
        <tr><th style="${thG}">SS<sub>X</sub> = Σ(X − M<sub>X</sub>)²</th><td style="${tdG}">${p.SS_X.toFixed(2)}</td></tr>
        <tr><th style="${thG}">SS<sub>Y</sub> = Σ(Y − M<sub>Y</sub>)²</th><td style="${tdG}">${p.SS_Y.toFixed(2)}</td></tr>
        <tr><th style="${thG}">r (Pearson correlation)</th><td style="${tdG}">${p.r_display.toFixed(2)}</td></tr>
      </tbody>
    </table>`;

  const narrative = `
    <p>A researcher is investigating whether <strong>${p.variable_x}</strong>
    predicts <strong>${p.variable_y}</strong> in ${p.population}.
    A random sample of n&nbsp;=&nbsp;${p.n} participants was obtained.</p>
    <p>The following descriptive statistics were computed from the sample:</p>
    ${givenTable}
    <p>The partially completed regression ANOVA table is shown below
    (difficulty: <em>${diffLabel}</em>).
    Fill in all cells marked <strong>?</strong>, then answer the questions below
    using α&nbsp;=&nbsp;${alphaStr} (${tailLabel}).</p>
    <p><em>Test whether there is ${dirPhrase}linear relationship between
    ${p.variable_x} and ${p.variable_y}.</em></p>
  `;

  setHtml('lrp-problem-text', narrative + buildTableHtml(p));

  // Shuffle and render hypothesis options
  const opts = hypOptions(p.tail);
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  setHtml('lrp-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="lrp-hyp-select" value="${o.value}" />
      ${o.label}
    </label>
  `).join(''));

  // Show Fcrit hint
  const hintEl = document.getElementById('lrp-fcrit-hint');
  if (hintEl) {
    hintEl.textContent = `F(1, ${p.table.DFE}), α = ${alphaStr}`;
    hintEl.style.display = '';
  }
}

/* ── Read helpers ── */

function readNum(id: string): number {
  return parseFloat((document.getElementById(id) as HTMLInputElement | null)?.value ?? '');
}

function readRadio(name: string): string | null {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

/* ── Grade answers ── */

export function gradeAnswers(p: RegProblem): GradeResult {
  const t   = p.table;
  const TOL = 0.05;

  const cells: Partial<Record<MaskedField, boolean>> = {};
  for (const field of p.masked) {
    const val = readNum(`lrp-input-${field}`);
    let ok: boolean;
    switch (field) {
      case 'SSR': ok = !isNaN(val) && Math.abs(val - t.SSR) <= TOL; break;
      case 'SSE': ok = !isNaN(val) && Math.abs(val - t.SSE) <= TOL; break;
      case 'SST': ok = !isNaN(val) && Math.abs(val - t.SST) <= TOL; break;
      case 'DFT': ok = val === t.DFT; break;
      case 'MSR': ok = !isNaN(val) && Math.abs(val - t.MSR) <= TOL; break;
      case 'MSE': ok = !isNaN(val) && Math.abs(val - t.MSE) <= TOL; break;
      case 'F':   ok = !isNaN(val) && Math.abs(val - t.F)   <= TOL; break;
      default:    ok = false;
    }
    cells[field] = ok;
  }

  const bInput     = readNum('lrp-answer-b');
  const aInput     = readNum('lrp-answer-a');
  const R2Input    = readNum('lrp-answer-R2');
  const fcritInput = readNum('lrp-answer-fcrit');

  const hyp      = readRadio('lrp-hyp-select') === 'correct';
  const bok      = !isNaN(bInput)     && Math.abs(bInput     - p.b)     <= TOL;
  const aok      = !isNaN(aInput)     && Math.abs(aInput     - p.a)     <= TOL;
  const R2ok     = !isNaN(R2Input)    && Math.abs(R2Input    - p.R2)    <= 0.02;
  const fcritok  = !isNaN(fcritInput) && Math.abs(fcritInput - p.Fcrit) <= 0.005;
  const decision = readRadio('lrp-decision-select') === p.decision_true;

  const allCorrect = Object.values(cells).every(v => v) && hyp && bok && aok && R2ok && fcritok && decision;

  return { cells, hyp, b: bok, a: aok, fcrit: fcritok, R2: R2ok, decision, allCorrect };
}

/* ── Feedback helpers ── */

function feedbackIcon(ok: boolean): string {
  return ok
    ? `<span style="color:#276622;font-size:1.1em;">✔</span>`
    : `<span style="color:#8B1A00;font-size:1.1em;">✘</span>`;
}

function fbHtml(ok: boolean, hint: string): string {
  return `${feedbackIcon(ok)}${ok ? '' : ` <span class="sp-hint">${hint}</span>`}`;
}

/* ── Render feedback ── */

export function renderFeedback(p: RegProblem, grade: GradeResult): void {
  const t = p.table;

  const hints: Partial<Record<MaskedField, string>> = {
    SSR: `SS<sub>Regression</sub> = MS<sub>Reg</sub> × df<sub>Reg</sub> = ${r2(t.MSR).toFixed(2)} × 1`,
    SSE: `SS<sub>Residual</sub> = SS<sub>Total</sub> − SS<sub>Reg</sub> = ${r2(t.SST).toFixed(2)} − ${r2(t.SSR).toFixed(2)}`,
    SST: `SS<sub>Total</sub> = SS<sub>Reg</sub> + SS<sub>Res</sub> = ${r2(t.SSR).toFixed(2)} + ${r2(t.SSE).toFixed(2)}`,
    DFT: `df<sub>Total</sub> = df<sub>Reg</sub> + df<sub>Res</sub> = 1 + ${t.DFE} = ${t.DFT}`,
    MSR: `MS<sub>Regression</sub> = SS<sub>Reg</sub> / df<sub>Reg</sub> = ${r2(t.SSR).toFixed(2)} / 1`,
    MSE: `MS<sub>Residual</sub> = SS<sub>Res</sub> / df<sub>Res</sub> = ${r2(t.SSE).toFixed(2)} / ${t.DFE}`,
    F:   `F = MS<sub>Reg</sub> / MS<sub>Res</sub> = ${r2(t.MSR).toFixed(2)} / ${r2(t.MSE).toFixed(2)}`,
  };

  for (const [field, ok] of Object.entries(grade.cells) as [MaskedField, boolean][]) {
    const fbEl = document.getElementById(`lrp-cell-fb-${field}`);
    if (fbEl) fbEl.innerHTML = ok
      ? feedbackIcon(true)
      : `${feedbackIcon(false)} <span class="sp-hint">${hints[field] ?? ''}</span>`;
  }

  setHtml('lrp-fb-hyp',      fbHtml(grade.hyp,      'H₀: β = 0; Hₐ depends on the tail direction of the test.'));
  setHtml('lrp-fb-b',        fbHtml(grade.b,        `b = r × √(SS<sub>Y</sub> / SS<sub>X</sub>) = ${p.r_display.toFixed(2)} × √(${p.SS_Y.toFixed(2)} / ${p.SS_X.toFixed(2)}) = ${p.b.toFixed(2)}`));
  setHtml('lrp-fb-a',        fbHtml(grade.a,        `a = M<sub>Y</sub> − b × M<sub>X</sub> = ${p.MY.toFixed(2)} − ${p.b.toFixed(2)} × ${p.MX.toFixed(2)} = ${p.a.toFixed(2)}`));
  setHtml('lrp-fb-fcrit',    fbHtml(grade.fcrit,    `F<sub>crit</sub>(1, ${t.DFE}), α = ${p.alpha.toFixed(2)} = ${p.Fcrit.toFixed(3)}.`));
  setHtml('lrp-fb-R2',       fbHtml(grade.R2,       `R² = SS<sub>Reg</sub> / SS<sub>Total</sub> = ${r2(t.SSR).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.R2.toFixed(2)}.`));
  setHtml('lrp-fb-decision', fbHtml(grade.decision, `F = ${r2(t.F).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.toFixed(3)}. Reject H₀ if F ≥ F<sub>crit</sub>.`));

  const banner = document.getElementById('lrp-fb-banner');
  if (banner) {
    banner.style.display = '';
    banner.className = `sp-banner ${grade.allCorrect ? 'sp-banner-success' : 'sp-banner-error'}`;
    banner.textContent = grade.allCorrect ? 'All correct! Great work.' : 'Some answers need work — see feedback above.';
  }

  setDisplay('lrp-feedback-section', '');

  const solToggle = document.getElementById('lrp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    solToggle.style.display = 'block';
    if (!grade.allCorrect) solToggle.open = true;
  }

  renderSolution(p);
}

/* ── Full solution ── */

function renderSolution(p: RegProblem): void {
  const t        = p.table;
  const alphaStr = p.alpha.toFixed(2);
  const decWord  = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';

  const haStr = p.tail === 'two'   ? 'β ≠ 0'
              : p.tail === 'right' ? 'β > 0'
              :                     'β < 0';
  const h0Str = p.tail === 'two' ? 'β = 0' : p.tail === 'right' ? 'β ≤ 0' : 'β ≥ 0';

  const slopeInterp = p.b >= 0
    ? `For each one-unit increase in ${p.variable_x}, predicted ${p.variable_y} increases by ${Math.abs(p.b).toFixed(2)} ${p.unit_y} on average.`
    : `For each one-unit increase in ${p.variable_x}, predicted ${p.variable_y} decreases by ${Math.abs(p.b).toFixed(2)} ${p.unit_y} on average.`;

  const R2pct    = (p.R2 * 100).toFixed(1);
  const R2interp = `Approximately ${R2pct}% of the variance in ${p.variable_y} is explained by ${p.variable_x}.`;

  const sigStatement = p.decision_true === 'reject'
    ? `There is evidence that ${p.variable_x} significantly predicts ${p.variable_y} at α = ${alphaStr}.`
    : `There is insufficient evidence that ${p.variable_x} predicts ${p.variable_y} at α = ${alphaStr}.`;

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Context</th></tr>
      <tr><td>Predictor (X)</td><td>${p.variable_x} (${p.unit_x})</td></tr>
      <tr><td>Outcome (Y)</td><td>${p.variable_y} (${p.unit_y})</td></tr>
      <tr><td>Population</td><td>${p.population}</td></tr>
      <tr><td>n</td><td>${p.n}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>${h0Str}</td></tr>
      <tr><td>Hₐ</td><td>${haStr}</td></tr>

      <tr><th colspan="2">Regression ANOVA Table</th></tr>
      <tr><td colspan="2">
        <table style="border-collapse:collapse;width:100%;font-size:0.87rem;margin:0.3rem 0;">
          <thead><tr>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);text-align:left;">Source</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">SS</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">df</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">MS</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">F</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);">Regression</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.SSR).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${t.DFR}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.MSR).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.F).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);">Residual</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.SSE).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${t.DFE}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.MSE).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;color:#aaa;">—</td>
            </tr>
            <tr>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);">Total</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.SST).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${t.DFT}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;color:#aaa;">—</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;color:#aaa;">—</td>
            </tr>
          </tbody>
        </table>
      </td></tr>

      <tr><th colspan="2">Regression Coefficients</th></tr>
      <tr><td>b = r × √(SS<sub>Y</sub> / SS<sub>X</sub>)</td>
          <td>${p.r_display.toFixed(2)} × √(${p.SS_Y.toFixed(2)} / ${p.SS_X.toFixed(2)}) = <strong>${p.b.toFixed(2)}</strong></td></tr>
      <tr><td>a = M<sub>Y</sub> − b × M<sub>X</sub></td>
          <td>${p.MY.toFixed(2)} − ${p.b.toFixed(2)} × ${p.MX.toFixed(2)} = <strong>${p.a.toFixed(2)}</strong></td></tr>

      <tr><th colspan="2">Regression Equation</th></tr>
      <tr><td>Ŷ = bX + a</td><td>Ŷ = ${p.b.toFixed(2)}X + (${p.a.toFixed(2)})</td></tr>

      <tr><th colspan="2">Significance Test</th></tr>
      <tr><td>F<sub>crit</sub>(1, ${t.DFE}), α = ${alphaStr}</td><td>${p.Fcrit.toFixed(3)}</td></tr>
      <tr><td>Decision rule</td><td>Reject H₀ if F ≥ F<sub>crit</sub></td></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Size</th></tr>
      <tr><td>R² = SS<sub>Reg</sub> / SS<sub>Total</sub></td><td>${p.R2.toFixed(2)}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td>Slope</td><td>${slopeInterp}</td></tr>
      <tr><td>R²</td><td>${R2interp}</td></tr>
      <tr><td>Significance</td><td>${sigStatement}</td></tr>
    </table>
  `;
  setHtml('lrp-solution-body', html);
}

/* ── Reset UI ── */

export function resetUI(): void {
  const allFields: MaskedField[] = ['SSR', 'SSE', 'SST', 'DFT', 'MSR', 'MSE', 'F'];
  allFields.forEach(f => clearInput(`lrp-input-${f}`));
  clearInput('lrp-answer-b');
  clearInput('lrp-answer-a');
  clearInput('lrp-answer-fcrit');
  clearInput('lrp-answer-R2');
  uncheckRadios('lrp-hyp-select');
  uncheckRadios('lrp-decision-select');

  setDisplay('lrp-feedback-section', 'none');

  const solToggle = document.getElementById('lrp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) { solToggle.style.display = 'none'; solToggle.open = false; }

  const banner = document.getElementById('lrp-fb-banner');
  if (banner) banner.style.display = 'none';

  setHtml('lrp-problem-text', '<span class="sp-placeholder">Click <strong>New Problem</strong> below to generate a practice problem.</span>');
  setHtml('lrp-hyp-options',  '<span class="sp-placeholder">Generate a problem to see options.</span>');
  setHtml('lrp-fb-hyp',      '');
  setHtml('lrp-fb-b',        '');
  setHtml('lrp-fb-a',        '');
  setHtml('lrp-fb-fcrit',    '');
  setHtml('lrp-fb-R2',       '');
  setHtml('lrp-fb-decision', '');

  const hintEl = document.getElementById('lrp-fcrit-hint');
  if (hintEl) hintEl.style.display = 'none';
}
