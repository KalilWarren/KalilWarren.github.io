/* =========================================================
   Student Practice — Pearson Correlation
   ========================================================= */

type Tail = 'two' | 'right' | 'left';

export interface PearProblem {
  context: {
    variable_x: string; unit_x: string;
    variable_y: string; unit_y: string;
    population: string;
  };
  muX: number; sdX: number;
  muY: number; sdY: number;
  n:             number;
  rho0:          number;
  alpha:         number;
  tail:          Tail;
  r_display:     number;   // 2 dp — what the student sees
  df:            number;   // n − 2
  t_true:        number;   // 4 dp, computed from r_display
  tcritMag:      number;   // 3 dp
  decision_true: 'reject' | 'fail';
  r_squared_true: number;  // 4 dp
  createdAt:     number;
}

/* ── Context bank ── */

const VARIABLES: Array<{ variable: string; unit: string }> = [
  { variable: 'test anxiety scores',          unit: 'points'  },
  { variable: 'reaction time',                unit: 'ms'      },
  { variable: 'daily step count',             unit: 'steps'   },
  { variable: 'reading comprehension scores', unit: 'points'  },
  { variable: 'systolic blood pressure',      unit: 'mmHg'    },
  { variable: 'weekly exercise duration',     unit: 'minutes' },
  { variable: 'life satisfaction scores',     unit: 'points'  },
  { variable: 'working memory capacity',      unit: 'units'   },
  { variable: 'sleep duration',               unit: 'hours'   },
  { variable: 'vocabulary test scores',       unit: 'points'  },
  { variable: 'math anxiety ratings',         unit: 'points'  },
  { variable: 'pain tolerance scores',        unit: 'units'   },
  { variable: 'academic motivation scores',   unit: 'points'  },
  { variable: 'social support ratings',       unit: 'points'  },
  { variable: 'stress ratings',               unit: 'points'  },
  { variable: 'GPA',                          unit: 'points'  },
];

const POPULATIONS: string[] = [
  'undergraduate students',
  'young adults',
  'office workers',
  'fifth-grade students',
  'adults aged 30–50',
  'college freshmen',
  'graduate students',
  'older adults',
  'shift workers',
  'language learners',
  'high school students',
  'adult patients',
];

/* ── Random helpers ── */

function rUniform(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function rChoice<T>(arr: T[], weights?: number[]): T {
  if (!weights) return arr[Math.floor(Math.random() * arr.length)];
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function rInt(lo: number, hi: number): number {
  return Math.floor(rUniform(lo, hi + 1));
}

function r2(x: number): number { return Math.round(x * 100) / 100; }
function r3(x: number): number { return Math.round(x * 1000) / 1000; }
function r4(x: number): number { return Math.round(x * 10000) / 10000; }

/* ── Inverse t-distribution ── */
// Lanczos ln Γ(x)
function lnGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851,   -1259.1392167224028,
    771.32342877765313, -176.61502916214059,    12.507343278686905,
   -0.13857109526572012,  9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i <= 8; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Continued-fraction for regularized incomplete beta I_x(a, b)
function betaCF(a: number, b: number, x: number): number {
  const EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    let aa = m * (b - m) * x / ((qam + 2 * m) * (a + 2 * m));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + 2 * m) * (qap + 2 * m));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(x: number, a: number, b: number): number {
  if (x === 0 || x === 1) return x;
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  if (x < (a + 1) / (a + b + 2))
    return (Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a) * betaCF(a, b, x);
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * betaCF(b, a, 1 - x);
}

// P(T ≤ t | df)
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * ibeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}

// Bisection inverse: find t s.t. P(T ≤ t | df) = p
function tInv(p: number, df: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return  Infinity;
  let lo = -40, hi = 40;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    tCDF(mid, df) < p ? (lo = mid) : (hi = mid);
  }
  return (lo + hi) / 2;
}

/* ── Problem generation ── */

export function generateProblem(): PearProblem {
  // Pick two distinct variables
  const population = rChoice(POPULATIONS);
  const idxX = Math.floor(Math.random() * VARIABLES.length);
  let idxY   = Math.floor(Math.random() * (VARIABLES.length - 1));
  if (idxY >= idxX) idxY++;
  const { variable: variable_x, unit: unit_x } = VARIABLES[idxX];
  const { variable: variable_y, unit: unit_y } = VARIABLES[idxY];

  // Latent population parameters
  const muOpts: number[] = [];
  for (let v = 40; v <= 120; v += 5) muOpts.push(v);
  const muX = rChoice(muOpts);
  const sdX = rInt(6, 20);
  const muY = rChoice(muOpts);
  const sdY = rInt(6, 20);

  // Sample / test parameters
  const n     = rChoice([10, 12, 15, 20, 25, 30]);
  const df    = n - 2;
  const alpha = rChoice([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const tail  = rChoice<Tail>(['two', 'right', 'left'], [0.5, 0.25, 0.25]);

  // Critical t (3 dp — matches standard table precision)
  const tcritMag = r3(tail === 'two' ? tInv(1 - alpha / 2, df) : tInv(1 - alpha, df));

  // Target significance → target t magnitude
  const targetSig = rChoice(['sig', 'nonsig'], [0.6, 0.4]);
  let tMag: number;
  if (targetSig === 'sig') {
    tMag = rUniform(tcritMag + 0.2, tcritMag + 1.8);
  } else {
    const upper = Math.max(0.3, tcritMag - 0.2);
    tMag = rUniform(0.2, upper);
  }

  // Direction
  const sign = tail === 'right' ? 1 : tail === 'left' ? -1 : (Math.random() < 0.5 ? 1 : -1);

  // Convert target t → target r, clamp, round to 2 dp
  const tTarget   = sign * tMag;
  let rTarget     = tTarget / Math.sqrt(tTarget * tTarget + df);
  rTarget         = Math.max(-0.95, Math.min(0.95, rTarget));
  const r_display = r2(rTarget);

  // True answers computed from the displayed r
  const r2val          = r_display * r_display;
  const t_true         = r4(r_display * Math.sqrt(df) / Math.sqrt(1 - r2val));
  const r_squared_true = r4(r2val);

  // Decision
  let decision_true: 'reject' | 'fail';
  if (tail === 'right')     decision_true = t_true >= tcritMag  ? 'reject' : 'fail';
  else if (tail === 'left') decision_true = t_true <= -tcritMag ? 'reject' : 'fail';
  else                      decision_true = Math.abs(t_true) >= tcritMag ? 'reject' : 'fail';

  // Verify significance matches intent — regenerate on mismatch
  if ((decision_true === 'reject') !== (targetSig === 'sig')) return generateProblem();

  return {
    context: { variable_x, unit_x, variable_y, unit_y, population },
    muX, sdX, muY, sdY,
    n, rho0: 0, alpha, tail,
    r_display, df, t_true, tcritMag, decision_true, r_squared_true,
    createdAt: Date.now(),
  };
}

/* ── Grading ── */

interface GradeResult {
  hyp:      boolean;
  t:        boolean;
  df:       boolean;
  crit:     boolean;
  r2:       boolean;
  decision: boolean;
  allCorrect: boolean;
}

function gv(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
}

function radioVal(name: string): string {
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';
}

function numInput(id: string): number { return parseFloat(gv(id)); }

export function gradeAnswers(p: PearProblem): GradeResult {
  const correctHyp = p.tail === 'two' ? 'neq' : p.tail === 'right' ? 'gt' : 'lt';
  const hyp = radioVal('pp-hyp-select') === correctHyp;

  const tStu = numInput('pp-answer-t');
  const t    = !isNaN(tStu) && Math.abs(tStu - p.t_true) <= 0.02;

  const dfStu = numInput('pp-answer-df');
  const df    = !isNaN(dfStu) && dfStu === p.df;

  const critStu = numInput('pp-answer-crit');
  const crit    = !isNaN(critStu) && Math.abs(Math.abs(critStu) - p.tcritMag) <= 0.02;

  const r2Stu = numInput('pp-answer-r2');
  const r2    = !isNaN(r2Stu) && Math.abs(r2Stu - p.r_squared_true) <= 0.02;

  const decision = radioVal('pp-decision-select') === p.decision_true;

  return { hyp, t, df, crit, r2, decision, allCorrect: hyp && t && df && crit && r2 && decision };
}

/* ── Display helpers ── */

function tailLabel(tail: Tail): string {
  return tail === 'two' ? 'two-tailed' : tail === 'right' ? 'right-tailed' : 'left-tailed';
}

function critDisplay(p: PearProblem): string {
  if (p.tail === 'two')   return `±${p.tcritMag.toFixed(3)}`;
  if (p.tail === 'right') return `+${p.tcritMag.toFixed(3)}`;
  return `−${p.tcritMag.toFixed(3)}`;
}

function critLabel(p: PearProblem): string {
  return p.tail === 'two'
    ? `Positive critical value — t<sub>α/2, ${p.df}</sub>`
    : p.tail === 'right'
      ? `Critical value — t<sub>α, ${p.df}</sub>`
      : `Critical value — enter positive magnitude (t<sub>α, ${p.df}</sub>)`;
}

function comparisonStatement(p: PearProblem): string {
  const tAbs = Math.abs(p.t_true);
  const cmp  = (v: number, c: number, op: string) => `${v.toFixed(4)} ${op} ${c.toFixed(3)}`;
  if (p.tail === 'two')
    return `|t| = ${tAbs.toFixed(4)} ${tAbs >= p.tcritMag ? '≥' : '<'} ${p.tcritMag.toFixed(3)}`;
  if (p.tail === 'right')
    return cmp(p.t_true, p.tcritMag, p.t_true >= p.tcritMag ? '≥' : '<');
  return `t = ${p.t_true.toFixed(4)} ${p.t_true <= -p.tcritMag ? '≤' : '>'} −${p.tcritMag.toFixed(3)}`;
}

function interpretation(p: PearProblem): string {
  const { variable_x, variable_y, population } = p.context;
  const alphaStr = p.alpha.toFixed(2);
  if (p.decision_true === 'reject')
    return `There is evidence of a linear relationship between ${variable_x} and ${variable_y} in ${population} at α = ${alphaStr}.`;
  return `There is insufficient evidence of a linear relationship between ${variable_x} and ${variable_y} in ${population} at α = ${alphaStr}.`;
}

function r2Interp(p: PearProblem): string {
  const pct = Math.round(p.r_squared_true * 100);
  return `Approximately ${pct}% of the variance is shared between ${p.context.variable_x} and ${p.context.variable_y}.`;
}

/* ── DOM helpers ── */

function setHtml(id: string, html: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setDisplay(id: string, display: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}

function clearInput(id: string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = '';
}

function uncheckRadios(name: string): void {
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)
    .forEach(r => { r.checked = false; });
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ── Render problem ── */

export function renderProblem(p: PearProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const { variable_x, variable_y, population } = p.context;
  const rStr = p.r_display.toFixed(2);  // shows minus sign automatically for negatives

  const narrative =
    `<p>A researcher is investigating the relationship between <strong>${variable_x}</strong> ` +
    `and <strong>${variable_y}</strong> in ${population}.</p>` +
    `<p>A random sample of n = ${p.n} participants was obtained. ` +
    `The sample correlation was r = ${rStr}.</p>` +
    `<p>Using α = ${alphaStr} (${tailLabel(p.tail)}), test whether there is a ` +
    `${p.tail === 'right' ? 'positive ' : p.tail === 'left' ? 'negative ' : ''}` +
    `linear relationship between ${variable_x} and ${variable_y}.</p>` +
    `<ol>` +
    `<li>State the null and alternative hypotheses.</li>` +
    `<li>Compute the test statistic.</li>` +
    `<li>Compute the degrees of freedom.</li>` +
    `<li>Determine the critical value(s).</li>` +
    `<li>Compute and interpret r².</li>` +
    `<li>State your decision.</li>` +
    `</ol>`;

  setHtml('pp-problem-text', narrative);

  // Shuffled hypothesis options
  const opts: Array<{ value: string; label: string }> = [
    { value: 'neq', label: 'H₀: ρ = 0 &nbsp;&nbsp; H₁: ρ ≠ 0' },
    { value: 'gt',  label: 'H₀: ρ ≤ 0 &nbsp;&nbsp; H₁: ρ &gt; 0' },
    { value: 'lt',  label: 'H₀: ρ ≥ 0 &nbsp;&nbsp; H₁: ρ &lt; 0' },
  ];
  shuffleArray(opts);
  setHtml('pp-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="pp-hyp-select" value="${o.value}" />
      ${o.label}
    </label>`).join(''));

  // Critical value label and hint
  const critLabelEl = document.getElementById('pp-crit-label');
  if (critLabelEl) critLabelEl.innerHTML = critLabel(p);

  const critHintEl = document.getElementById('pp-crit-hint');
  if (critHintEl) {
    critHintEl.innerHTML = p.tail === 'two'
      ? 'Enter the positive half; critical values will be displayed as ±(your value).'
      : p.tail === 'left'
        ? 'Enter the positive magnitude; the left-tail direction is applied automatically.'
        : '';
    critHintEl.style.display = critHintEl.innerHTML ? '' : 'none';
  }
}

/* ── Feedback ── */

function feedbackIcon(correct: boolean): string {
  return correct
    ? `<span style="color:#2e6b2e;">✅</span>`
    : `<span style="color:#8B1A00;">❌</span>`;
}

function fbHtml(correct: boolean, hint: string): string {
  return `${feedbackIcon(correct)}${correct ? '' : ` <span class="sp-hint">${hint}</span>`}`;
}

export function renderFeedback(p: PearProblem, grade: GradeResult): void {
  setHtml('pp-fb-hyp',      fbHtml(grade.hyp,      'Select the hypothesis pair that matches the tail direction.'));
  setHtml('pp-fb-t',        fbHtml(grade.t,        't = r × √df / √(1 − r²)'));
  setHtml('pp-fb-df',       fbHtml(grade.df,       'df = n − 2'));
  setHtml('pp-fb-crit',     fbHtml(grade.crit,     'Critical value depends on α, tail type, and df = n − 2.'));
  setHtml('pp-fb-r2',       fbHtml(grade.r2,       'r² = r × r'));
  setHtml('pp-fb-decision', fbHtml(grade.decision, 'Compare t to the critical value(s).'));

  const banner = document.getElementById('pp-fb-banner');
  if (banner) {
    if (grade.allCorrect) {
      banner.textContent = 'All correct!';
      banner.className   = 'sp-banner sp-banner-success';
    } else {
      banner.textContent = 'Some answers need work.';
      banner.className   = 'sp-banner sp-banner-error';
    }
    banner.style.display = '';
  }

  setDisplay('pp-feedback-section', 'block');

  renderSolution(p);

  const solToggle = document.getElementById('pp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    const sumEl = solToggle.querySelector('summary');
    if (sumEl) sumEl.textContent = grade.allCorrect ? 'Show Explanation' : 'Show Full Solution';
    if (!grade.allCorrect) solToggle.open = true;
    solToggle.style.display = 'block';
  }
}

/* ── Full solution ── */

function renderSolution(p: PearProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const rStr     = p.r_display.toFixed(2);
  const h0Symbol  = p.tail === 'two' ? '=' : p.tail === 'right' ? '≤' : '≥';
  const altSymbol = p.tail === 'two' ? '≠' : p.tail === 'right' ? '>'  : '<';
  const decWord   = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';

  const sqrtDf  = Math.sqrt(p.df).toFixed(4);
  const denom   = Math.sqrt(1 - p.r_display * p.r_display).toFixed(4);
  const tCalc   = `(${rStr} × √${p.df}) / √(1 − ${rStr}²) = (${rStr} × ${sqrtDf}) / ${denom} = ${p.t_true.toFixed(4)}`;

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Given Values</th></tr>
      <tr><td>r</td><td>${rStr}</td></tr>
      <tr><td>n</td><td>${p.n}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>
      <tr><td>Tail</td><td>${tailLabel(p.tail)}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>ρ ${h0Symbol} 0</td></tr>
      <tr><td>H₁</td><td>ρ ${altSymbol} 0</td></tr>

      <tr><th colspan="2">Degrees of Freedom</th></tr>
      <tr><td>df = n − 2</td><td>${p.n} − 2 = ${p.df}</td></tr>

      <tr><th colspan="2">Test Statistic</th></tr>
      <tr><td>t = r√df / √(1 − r²)</td><td>${tCalc}</td></tr>

      <tr><th colspan="2">Critical Value(s) — df = ${p.df}</th></tr>
      <tr><td>t<sub>crit</sub></td><td>${critDisplay(p)}</td></tr>
      <tr><td>Comparison</td><td>${comparisonStatement(p)}</td></tr>

      <tr><th colspan="2">Decision</th></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Size</th></tr>
      <tr><td>r² = r × r</td><td>${rStr}² = ${p.r_squared_true.toFixed(4)}</td></tr>
      <tr><td>Interpretation</td><td>${r2Interp(p)}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interpretation(p)}</td></tr>
    </table>`;

  setHtml('pp-solution-body', html);
}

/* ── Reset UI ── */

export function resetUI(): void {
  clearInput('pp-answer-t');
  clearInput('pp-answer-df');
  clearInput('pp-answer-crit');
  clearInput('pp-answer-r2');
  uncheckRadios('pp-hyp-select');
  uncheckRadios('pp-decision-select');

  setDisplay('pp-feedback-section', 'none');
  setDisplay('pp-solution-toggle',  'none');

  const sol = document.getElementById('pp-solution-toggle') as HTMLDetailsElement | null;
  if (sol) sol.removeAttribute('open');

  setHtml('pp-fb-hyp',      '');
  setHtml('pp-fb-t',        '');
  setHtml('pp-fb-df',       '');
  setHtml('pp-fb-crit',     '');
  setHtml('pp-fb-r2',       '');
  setHtml('pp-fb-decision', '');
  setHtml('pp-solution-body', '');

  const banner = document.getElementById('pp-fb-banner');
  if (banner) banner.style.display = 'none';
}
