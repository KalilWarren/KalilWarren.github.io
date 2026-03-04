/* =========================================================
   Student Practice — Independent-Measures t-Test (pooled)
   ========================================================= */

/* ── Types ── */

type Tail       = 'two' | 'right' | 'left';
type EffectTask = 'cohens_d' | 'r_squared' | 'ci_mean_diff';

interface IndProblem {
  n1:            number;
  n2:            number;
  M1:            number;   // 2 dp
  M2:            number;   // 2 dp
  SS1:           number;   // (n1-1)*s1² — exact integer displayed to student
  SS2:           number;   // (n2-1)*s2² — exact integer displayed to student
  alpha:         number;
  tail:          Tail;
  df:            number;   // n1 + n2 - 2
  sp:            number;   // pooled SD, 4 dp (for display)
  SE:            number;   // SE of M1-M2, 4 dp (for display)
  t_true:        number;   // 2 dp
  tcritMag:      number;   // 3 dp (matches t-table precision)
  decision_true: 'reject' | 'fail';
  effectTask:    EffectTask;
  d_true:        number;   // 2 dp
  r2_true:       number;   // 4 dp
  ci_lower:      number | null;  // null = −∞ (left-tailed)
  ci_upper:      number | null;  // null = +∞ (right-tailed)
  variable:      string;
  unit:          string;
  population:    string;
}

/* ── Inverse t-distribution (compact numerical implementation) ── */

// Lanczos approximation — ln Γ(x)
function lnGamma(x: number): number {
  const c = [
    0.99999999999980993,  676.5203681218851,   -1259.1392167224028,
    771.32342877765313,  -176.61502916214059,    12.507343278686905,
   -0.13857109526572012,   9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i <= 8; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Continued-fraction expansion for regularized incomplete beta I_x(a, b)
function betaCF(a: number, b: number, x: number): number {
  const EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
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

function regBetaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const bt    = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  return x < (a + 1) / (a + b + 2)
    ? bt * betaCF(a, b, x) / a
    : 1 - bt * betaCF(b, a, 1 - x) / b;
}

// CDF of t(df): P(T ≤ t)
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * regBetaI(df / 2, 0.5, x);
  return t >= 0 ? 1 - p : p;
}

// Inverse CDF via bisection: returns t s.t. P(T ≤ t) = p
function tInv(p: number, df: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return  Infinity;
  if (p > 0.5) {
    let lo = 0, hi = 20;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      tCDF(mid, df) < p ? (lo = mid) : (hi = mid);
    }
    return (lo + hi) / 2;
  }
  return -tInv(1 - p, df);
}

/* ── Scenario bank ── */

const SCENARIOS: Array<{ variable: string; population: string; unit: string }> = [
  { variable: 'test anxiety scores',          population: 'undergraduate students', unit: 'points'  },
  { variable: 'reaction time',               population: 'young adults',           unit: 'ms'      },
  { variable: 'daily step count',            population: 'office workers',         unit: 'steps'   },
  { variable: 'reading comprehension scores', population: 'fifth-grade students',  unit: 'points'  },
  { variable: 'systolic blood pressure',     population: 'adults aged 30–50',      unit: 'mmHg'    },
  { variable: 'weekly exercise duration',    population: 'college freshmen',       unit: 'minutes' },
  { variable: 'life satisfaction scores',    population: 'graduate students',      unit: 'points'  },
  { variable: 'working memory capacity',     population: 'older adults',           unit: 'units'   },
  { variable: 'sleep duration',             population: 'shift workers',           unit: 'hours'   },
  { variable: 'vocabulary test scores',      population: 'language learners',      unit: 'points'  },
  { variable: 'math anxiety ratings',        population: 'high school students',   unit: 'points'  },
  { variable: 'pain tolerance scores',       population: 'adult patients',         unit: 'units'   },
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

function r2(x: number): number { return Math.round(x * 100)   / 100;   }
function r3(x: number): number { return Math.round(x * 1000)  / 1000;  }
function r4(x: number): number { return Math.round(x * 10000) / 10000; }

/* ── Problem generation ── */

export function generateProblem(): IndProblem {
  const scenario = rChoice(SCENARIOS);

  // 1) Sample sizes: 60% equal, 40% unequal
  const N_CHOICES = [12, 15, 20, 25, 30, 40];
  const n1 = rChoice(N_CHOICES);
  const n2 = Math.random() < 0.6 ? n1 : rChoice(N_CHOICES);

  // 2) Sample SDs: 70% within ±20% of s1
  const s1 = rInt(6, 20);
  let s2: number;
  if (Math.random() < 0.7) {
    const lo = Math.max(6,  Math.round(s1 * 0.8));
    const hi = Math.min(20, Math.round(s1 * 1.2));
    s2 = rInt(Math.min(lo, hi), Math.max(lo, hi));
  } else {
    s2 = rInt(6, 20);
  }

  // 3) Design parameters
  const alpha = rChoice([0.10, 0.05, 0.01] as number[], [0.2, 0.7, 0.1]);
  const tail  = rChoice<Tail>(['two', 'right', 'left'], [0.5, 0.25, 0.25]);
  const df    = n1 + n2 - 2;

  // 4) Critical value (3 dp matches standard t-table precision)
  const tcritMag = r3(tail === 'two' ? tInv(1 - alpha / 2, df) : tInv(1 - alpha, df));

  // 5) Target |t| based on target significance
  const targetSig = rChoice(['sig', 'nonsig'], [0.6, 0.4]);
  let tMag: number;
  if (targetSig === 'sig') {
    tMag = Math.min(5.0, tcritMag + rUniform(0.2, 1.8));
  } else {
    tMag = Math.min(5.0, rUniform(0.2, Math.max(0.2, tcritMag - 0.2)));
  }

  // 6) Direction
  let tSign: number;
  if      (tail === 'right') tSign =  1;
  else if (tail === 'left')  tSign = -1;
  else                       tSign = Math.random() < 0.5 ? 1 : -1;
  const tTarget = tSign * tMag;

  // 7) Pooled SD and SE (precise)
  const spRaw = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / df);
  const SEraw = spRaw * Math.sqrt(1 / n1 + 1 / n2);

  // 8) Back-calculate M1, M2 from tTarget with small noise
  const baseMeanOpts: number[] = [];
  for (let v = 40; v <= 120; v += 5) baseMeanOpts.push(v);
  const baseMean = rChoice(baseMeanOpts);
  const diffRaw  = tTarget * SEraw;
  const noise    = rUniform(-0.10 * spRaw, 0.10 * spRaw);
  const M1 = r2(baseMean + diffRaw / 2 + noise);
  const M2 = r2(baseMean - diffRaw / 2 - noise);

  // 9) True statistics from displayed values
  const SS1 = (n1 - 1) * s1 * s1;   // exact integer — displayed to student
  const SS2 = (n2 - 1) * s2 * s2;   // exact integer — displayed to student
  const sp     = r4(spRaw);
  const SE     = r4(SEraw);
  const t_true = r2((M1 - M2) / SEraw);

  // 10) Decision
  let decision_true: 'reject' | 'fail';
  if      (tail === 'right') decision_true = t_true >= tcritMag          ? 'reject' : 'fail';
  else if (tail === 'left')  decision_true = t_true <= -tcritMag         ? 'reject' : 'fail';
  else                       decision_true = Math.abs(t_true) >= tcritMag ? 'reject' : 'fail';

  // 11) Effect sizes
  const d_true  = r2((M1 - M2) / spRaw);
  const r2_true = r4(t_true * t_true / (t_true * t_true + df));
  const effectTask = rChoice<EffectTask>(
    ['cohens_d', 'r_squared', 'ci_mean_diff'],
    [0.6, 0.25, 0.15],
  );

  // 12) CI (directional, matched to alpha and tail)
  const meanDiff = M1 - M2;
  const ci_lower = tail === 'left'  ? null : r2(meanDiff - tcritMag * SEraw);
  const ci_upper = tail === 'right' ? null : r2(meanDiff + tcritMag * SEraw);

  return {
    n1, n2, M1, M2, SS1, SS2, alpha, tail, df, sp, SE,
    t_true, tcritMag, decision_true,
    effectTask, d_true, r2_true, ci_lower, ci_upper,
    variable: scenario.variable,
    unit:     scenario.unit,
    population: scenario.population,
  };
}

/* ── Grading ── */

interface GradeResult {
  hyp:      boolean;
  t:        boolean;
  df:       boolean;
  crit:     boolean;
  decision: boolean;
  es:       boolean;
  allCorrect: boolean;
}

function gv(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
}

function radioVal(name: string): string {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
  return el?.value ?? '';
}

function numInput(id: string): number {
  return parseFloat(gv(id));
}

export function gradeAnswers(p: IndProblem): GradeResult {
  // Hypotheses
  const hypVal     = radioVal('ip-hyp-select');
  const correctHyp = p.tail === 'two' ? 'neq' : p.tail === 'right' ? 'gt' : 'lt';
  const hyp = hypVal === correctHyp;

  // t statistic
  const tStudent = numInput('ip-answer-t');
  const t = !isNaN(tStudent) && Math.abs(tStudent - p.t_true) <= 0.02;

  // df (exact integer)
  const dfStudent = parseInt(gv('ip-answer-df'), 10);
  const df = dfStudent === p.df;

  // critical value magnitude
  const critStudent = numInput('ip-answer-crit');
  const crit = !isNaN(critStudent) && Math.abs(Math.abs(critStudent) - p.tcritMag) <= 0.02;

  // decision
  const decVal  = radioVal('ip-decision-select');
  const decision = decVal === p.decision_true;

  // effect size
  let es = false;
  if (p.effectTask === 'cohens_d') {
    const v = numInput('ip-answer-es');
    es = !isNaN(v) && Math.abs(v - p.d_true) <= 0.02;
  } else if (p.effectTask === 'r_squared') {
    const v = numInput('ip-answer-es');
    es = !isNaN(v) && Math.abs(v - p.r2_true) <= 0.01;
  } else {
    // CI — depends on tail
    if (p.tail === 'two') {
      const lo = numInput('ip-answer-ci-lower');
      const hi = numInput('ip-answer-ci-upper');
      es = !isNaN(lo) && !isNaN(hi)
        && p.ci_lower !== null && p.ci_upper !== null
        && Math.abs(lo - p.ci_lower) <= 0.05
        && Math.abs(hi - p.ci_upper) <= 0.05;
    } else if (p.tail === 'right') {
      const lo = numInput('ip-answer-ci-lower');
      es = !isNaN(lo) && p.ci_lower !== null && Math.abs(lo - p.ci_lower) <= 0.05;
    } else {
      const hi = numInput('ip-answer-ci-upper');
      es = !isNaN(hi) && p.ci_upper !== null && Math.abs(hi - p.ci_upper) <= 0.05;
    }
  }

  return { hyp, t, df, crit, decision, es, allCorrect: hyp && t && df && crit && decision && es };
}

/* ── Display helpers ── */

function tailLabel(tail: Tail): string {
  return tail === 'two' ? 'two-tailed' : tail === 'right' ? 'right-tailed' : 'left-tailed';
}

function critLabel(tail: Tail, df: number): string {
  return tail === 'two'
    ? `Positive critical value — t<sub>α/2, df=${df}</sub>`
    : tail === 'right'
      ? `Critical value — t<sub>α, df=${df}</sub>`
      : `Critical value — enter positive magnitude (t<sub>α, df=${df}</sub>)`;
}

function critDisplay(p: IndProblem): string {
  if (p.tail === 'two')   return `±${p.tcritMag}`;
  if (p.tail === 'right') return `+${p.tcritMag}`;
  return `−${p.tcritMag}`;
}

function comparisonStatement(p: IndProblem): string {
  if (p.tail === 'two')   return `Reject H₀ if |t| ≥ ${p.tcritMag}`;
  if (p.tail === 'right') return `Reject H₀ if t ≥ ${p.tcritMag}`;
  return `Reject H₀ if t ≤ −${p.tcritMag}`;
}

function interpretation(p: IndProblem): string {
  const a = p.alpha.toFixed(2);
  if (p.decision_true === 'reject') {
    if (p.tail === 'two')   return `Evidence suggests a significant difference in ${p.variable} between the two groups at α = ${a}.`;
    if (p.tail === 'right') return `Evidence suggests the ${p.variable} mean is higher in Group 1 than Group 2 at α = ${a}.`;
    return `Evidence suggests the ${p.variable} mean is lower in Group 1 than Group 2 at α = ${a}.`;
  }
  return `Insufficient evidence that the group means differ in ${p.variable} at α = ${a}.`;
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

/* ── Effect-size section HTML ── */

function effectSectionHtml(p: IndProblem): string {
  if (p.effectTask === 'cohens_d') {
    return `
      <div class="sp-section-label">6. Compute Cohen's d (Effect Size)</div>
      <div class="sp-input-row">
        <label for="ip-answer-es">d = (M₁ − M₂) / s<sub>p</sub></label>
        <input type="number" step="0.01" id="ip-answer-es" class="sp-num-input"
               placeholder="e.g. 0.52" />
      </div>`;
  }
  if (p.effectTask === 'r_squared') {
    return `
      <div class="sp-section-label">6. Compute R-Squared (Effect Size)</div>
      <div class="sp-input-row">
        <label for="ip-answer-es">r² = t² / (t² + df)</label>
        <input type="number" step="0.0001" id="ip-answer-es" class="sp-num-input"
               placeholder="e.g. 0.1234" />
      </div>`;
  }
  // ci_mean_diff — directional
  const pct = Math.round((1 - p.alpha) * 100);
  if (p.tail === 'two') {
    return `
      <div class="sp-section-label">6. Compute the ${pct}% Confidence Interval for M₁ − M₂</div>
      <div class="sp-input-row">
        <label for="ip-answer-ci-lower">Lower: (M₁−M₂) − t<sub>crit</sub>×SE</label>
        <input type="number" step="0.01" id="ip-answer-ci-lower" class="sp-num-input"
               placeholder="e.g. −3.21" />
      </div>
      <div class="sp-input-row" style="margin-top:0.4rem;">
        <label for="ip-answer-ci-upper">Upper: (M₁−M₂) + t<sub>crit</sub>×SE</label>
        <input type="number" step="0.01" id="ip-answer-ci-upper" class="sp-num-input"
               placeholder="e.g. 8.95" />
      </div>`;
  }
  if (p.tail === 'right') {
    return `
      <div class="sp-section-label">6. Compute the One-Sided Lower Bound (${pct}% CI for M₁ − M₂)</div>
      <div class="sp-input-row">
        <label for="ip-answer-ci-lower">Lower: (M₁−M₂) − t<sub>α,df</sub>×SE</label>
        <input type="number" step="0.01" id="ip-answer-ci-lower" class="sp-num-input"
               placeholder="e.g. 1.45" />
      </div>
      <p class="sp-hint" style="margin-top:0.35rem;">Upper bound is +∞ for a right-tailed CI.</p>`;
  }
  // left-tailed
  return `
    <div class="sp-section-label">6. Compute the One-Sided Upper Bound (${pct}% CI for M₁ − M₂)</div>
    <div class="sp-input-row">
      <label for="ip-answer-ci-upper">Upper: (M₁−M₂) + t<sub>α,df</sub>×SE</label>
      <input type="number" step="0.01" id="ip-answer-ci-upper" class="sp-num-input"
             placeholder="e.g. −1.45" />
    </div>
    <p class="sp-hint" style="margin-top:0.35rem;">Lower bound is −∞ for a left-tailed CI.</p>`;
}

/* ── Render problem ── */

export function renderProblem(p: IndProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const pct      = Math.round((1 - p.alpha) * 100);

  const esDisplay =
    p.effectTask === 'cohens_d'      ? `Cohen's d`
    : p.effectTask === 'r_squared'   ? `R²`
    : p.tail === 'two'               ? `the ${pct}% confidence interval for (M₁ − M₂)`
    : p.tail === 'right'             ? `the one-sided lower bound of the ${pct}% CI for (M₁ − M₂)`
    :                                  `the one-sided upper bound of the ${pct}% CI for (M₁ − M₂)`;

  const narrativeHtml =
    `<p>A researcher is studying ${p.variable} in ${p.population} and compares two independent groups.</p>` +
    `<p>` +
      `<strong>Group 1:</strong> n = ${p.n1}, M = ${p.M1} ${p.unit}, SS = ${p.SS1}<br/>` +
      `<strong>Group 2:</strong> n = ${p.n2}, M = ${p.M2} ${p.unit}, SS = ${p.SS2}` +
    `</p>` +
    `<p>Using α = ${alphaStr} and a ${tailLabel(p.tail)} test, conduct an independent-measures t test ` +
    `(assume equal variances).</p>` +
    `<ol>` +
    `<li>State H₀ and H₁.</li>` +
    `<li>Compute the t test statistic.</li>` +
    `<li>Compute df.</li>` +
    `<li>Find the critical value(s).</li>` +
    `<li>State your decision (reject / fail to reject H₀).</li>` +
    `<li>Compute ${esDisplay}.</li>` +
    `</ol>`;

  setHtml('ip-problem-text', narrativeHtml);

  // Shuffled hypothesis options (directional nulls match the alternative)
  const opts: Array<{ value: string; label: string }> = [
    { value: 'neq', label: `H₀: μ₁ = μ₂ &nbsp;&nbsp; H₁: μ₁ ≠ μ₂` },
    { value: 'gt',  label: `H₀: μ₁ ≤ μ₂ &nbsp;&nbsp; H₁: μ₁ &gt; μ₂` },
    { value: 'lt',  label: `H₀: μ₁ ≥ μ₂ &nbsp;&nbsp; H₁: μ₁ &lt; μ₂` },
  ];
  shuffleArray(opts);
  setHtml('ip-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="ip-hyp-select" value="${o.value}" />
      ${o.label}
    </label>
  `).join(''));

  // Critical value label
  const critEl = document.getElementById('ip-crit-label');
  if (critEl) critEl.innerHTML = critLabel(p.tail, p.df);

  const critHintEl = document.getElementById('ip-crit-hint');
  if (critHintEl) {
    critHintEl.innerHTML = p.tail === 'two'
      ? 'Enter the positive half; critical values will be displayed as ±(your value).'
      : p.tail === 'left'
        ? 'Enter the positive magnitude; the left-tail direction is applied automatically.'
        : '';
    critHintEl.style.display = critHintEl.innerHTML ? '' : 'none';
  }

  // Section 6 — dynamic effect-size input
  setHtml('ip-effect-section', effectSectionHtml(p));
}

/* ── Feedback helpers ── */

function feedbackIcon(correct: boolean): string {
  return correct
    ? `<span style="color:#2e6b2e;">✅</span>`
    : `<span style="color:#8B1A00;">❌</span>`;
}

function feedbackHtml(correct: boolean, hint: string): string {
  return `${feedbackIcon(correct)}${correct ? '' : ` <span class="sp-hint">${hint}</span>`}`;
}

function esFeedbackHtml(p: IndProblem, correct: boolean): string {
  if (correct) return feedbackIcon(true);
  if (p.effectTask === 'cohens_d')    return feedbackHtml(false, 'd = (M₁ − M₂) / s<sub>p</sub>.');
  if (p.effectTask === 'r_squared')   return feedbackHtml(false, 'r² = t² / (t² + df).');
  return feedbackHtml(false, 'CI uses (M₁−M₂) ± t<sub>crit</sub> × SE (or one bound for one-tailed). Check your bounds.');
}

/* ── Render feedback ── */

export function renderFeedback(p: IndProblem, grade: GradeResult): void {
  setHtml('ip-fb-hyp',      feedbackHtml(grade.hyp,      'Select the hypothesis pair that matches the tail direction.'));
  setHtml('ip-fb-t',        feedbackHtml(grade.t,        't = (M₁ − M₂) / [s<sub>p</sub> × √(1/n₁ + 1/n₂)].'));
  setHtml('ip-fb-df',       feedbackHtml(grade.df,       'df = n₁ + n₂ − 2.'));
  setHtml('ip-fb-crit',     feedbackHtml(grade.crit,     'Critical value depends on α, tail, and df.'));
  setHtml('ip-fb-decision', feedbackHtml(grade.decision, 'Compare t to the critical value(s).'));
  setHtml('ip-fb-es',       esFeedbackHtml(p, grade.es));

  const banner = document.getElementById('ip-fb-banner');
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

  setDisplay('ip-feedback-section', 'block');
  renderSolution(p);

  const solToggle = document.getElementById('ip-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    const sumEl = solToggle.querySelector('summary');
    if (sumEl) sumEl.textContent = grade.allCorrect ? 'Show Explanation' : 'Show Full Solution';
    if (!grade.allCorrect) solToggle.open = true;
    solToggle.style.display = 'block';
  }
}

/* ── Render full solution ── */

export function renderSolution(p: IndProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const spStr    = `√((${p.SS1} + ${p.SS2}) / ${p.df}) = ${p.sp}`;
  const seStr    = `${p.sp} × √(1/${p.n1} + 1/${p.n2}) = ${p.SE}`;
  const tStr     = `(${p.M1} − ${p.M2}) / ${p.SE} = ${p.t_true}`;
  const dStr     = `(${p.M1} − ${p.M2}) / ${p.sp} = ${p.d_true}`;
  const rsStr    = `${p.t_true}² / (${p.t_true}² + ${p.df}) = ${p.r2_true}`;
  const decWord  = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';

  let ciRow = '';
  if (p.tail === 'two' && p.ci_lower !== null && p.ci_upper !== null) {
    ciRow = `<tr><td>${Math.round((1 - p.alpha) * 100)}% CI for M₁−M₂</td>` +
            `<td>[${p.ci_lower}, ${p.ci_upper}]  (t<sub>crit</sub> = ±${p.tcritMag})</td></tr>`;
  } else if (p.tail === 'right' && p.ci_lower !== null) {
    ciRow = `<tr><td>One-sided CI lower bound</td>` +
            `<td>[${p.ci_lower}, +∞)  (t<sub>crit</sub> = ${p.tcritMag})</td></tr>`;
  } else if (p.tail === 'left' && p.ci_upper !== null) {
    ciRow = `<tr><td>One-sided CI upper bound</td>` +
            `<td>(−∞, ${p.ci_upper}]  (t<sub>crit</sub> = ${p.tcritMag})</td></tr>`;
  }

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Given Values</th></tr>
      <tr><td>Group 1</td><td>n₁ = ${p.n1}, M₁ = ${p.M1} ${p.unit}, SS₁ = ${p.SS1}</td></tr>
      <tr><td>Group 2</td><td>n₂ = ${p.n2}, M₂ = ${p.M2} ${p.unit}, SS₂ = ${p.SS2}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>
      <tr><td>Tail</td><td>${tailLabel(p.tail)}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>μ₁ ${p.tail === 'two' ? '=' : p.tail === 'right' ? '≤' : '≥'} μ₂</td></tr>
      <tr><td>H₁</td><td>μ₁ ${p.tail === 'two' ? '≠' : p.tail === 'right' ? '>' : '<'} μ₂</td></tr>

      <tr><th colspan="2">Pooled Standard Deviation</th></tr>
      <tr><td>s<sub>p</sub> = √((SS₁ + SS₂) / df)</td><td>${spStr}</td></tr>

      <tr><th colspan="2">Standard Error of Mean Difference</th></tr>
      <tr><td>SE = s<sub>p</sub> × √(1/n₁ + 1/n₂)</td><td>${seStr}</td></tr>

      <tr><th colspan="2">Test Statistic</th></tr>
      <tr><td>t = (M₁ − M₂) / SE</td><td>${tStr}</td></tr>

      <tr><th colspan="2">Degrees of Freedom</th></tr>
      <tr><td>df = n₁ + n₂ − 2</td><td>${p.df}</td></tr>

      <tr><th colspan="2">Critical Value — df = ${p.df}, α = ${alphaStr}, ${tailLabel(p.tail)}</th></tr>
      <tr><td>t<sub>crit</sub></td><td>${critDisplay(p)}</td></tr>
      <tr><td>Decision rule</td><td>${comparisonStatement(p)}</td></tr>

      <tr><th colspan="2">Decision</th></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Sizes</th></tr>
      <tr><td>Cohen's d = (M₁−M₂) / s<sub>p</sub></td><td>${dStr}</td></tr>
      <tr><td>R² = t² / (t² + df)</td><td>${rsStr}</td></tr>
      ${ciRow}

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interpretation(p)}</td></tr>
    </table>
  `;
  setHtml('ip-solution-body', html);
}

/* ── Reset UI for new problem ── */

export function resetUI(): void {
  clearInput('ip-answer-t');
  clearInput('ip-answer-df');
  clearInput('ip-answer-crit');
  clearInput('ip-answer-es');
  clearInput('ip-answer-ci-lower');
  clearInput('ip-answer-ci-upper');
  uncheckRadios('ip-hyp-select');
  uncheckRadios('ip-decision-select');

  setDisplay('ip-feedback-section', 'none');
  setDisplay('ip-solution-toggle',  'none');

  const sol = document.getElementById('ip-solution-toggle') as HTMLDetailsElement | null;
  if (sol) sol.removeAttribute('open');

  setHtml('ip-fb-hyp',      '');
  setHtml('ip-fb-t',        '');
  setHtml('ip-fb-df',       '');
  setHtml('ip-fb-crit',     '');
  setHtml('ip-fb-decision', '');
  setHtml('ip-fb-es',       '');
  setHtml('ip-solution-body', '');
  setHtml('ip-effect-section', '<span class="sp-placeholder">Generate a problem to see this section.</span>');
  setHtml('ip-problem-text', '<span class="sp-placeholder">Click <strong>New Problem</strong> below to generate a practice problem.</span>');
  setHtml('ip-hyp-options', '<span class="sp-placeholder">Generate a problem to see options.</span>');

  const banner = document.getElementById('ip-fb-banner');
  if (banner) banner.style.display = 'none';
}
