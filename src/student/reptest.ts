/* =========================================================
   Student Practice — Repeated-Measures (Paired-Samples) t-Test
   ========================================================= */

/* ── Types ── */

type Tail       = 'two' | 'right' | 'left';
type EffectTask = 'cohens_d' | 'r_squared' | 'confidence_interval';

interface RepProblem {
  n:             number;
  MD:            number;   // mean of difference scores, 2 dp
  SDD:           number;   // SD of difference scores, integer
  alpha:         number;
  tail:          Tail;
  df:            number;   // n - 1
  SE:            number;   // SDD / √n, 4 dp
  t_true:        number;   // 2 dp
  tcritMag:      number;   // 3 dp
  decision_true: 'reject' | 'fail';
  effectTask:    EffectTask;
  dz_true:       number;   // 2 dp  (Cohen's dz = MD / SDD)
  r2_true:       number;   // 4 dp  (t² / (t² + df))
  ci_lower:      number;   // 2 dp  (MD − tcritMag × SE)
  ci_upper:      number;   // 2 dp  (MD + tcritMag × SE)
  variable:      string;
  unit:          string;
  population:    string;
}

/* ── Inverse t-distribution (compact numerical implementation) ── */

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

function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * regBetaI(df / 2, 0.5, x);
  return t >= 0 ? 1 - p : p;
}

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
  { variable: 'test anxiety scores',         population: 'undergraduate students',  unit: 'points'  },
  { variable: 'reaction time',               population: 'young adults',            unit: 'ms'      },
  { variable: 'blood pressure',              population: 'adult patients',          unit: 'mmHg'    },
  { variable: 'depression scores',           population: 'clinical outpatients',    unit: 'points'  },
  { variable: 'sleep quality ratings',       population: 'college students',        unit: 'points'  },
  { variable: 'pain ratings',                population: 'chronic pain patients',   unit: 'units'   },
  { variable: 'math anxiety scores',         population: 'high school students',    unit: 'points'  },
  { variable: 'physical endurance scores',   population: 'athletes',               unit: 'points'  },
  { variable: 'focus ratings',               population: 'office workers',          unit: 'points'  },
  { variable: 'vocabulary test scores',      population: 'language learners',       unit: 'points'  },
  { variable: 'life satisfaction scores',    population: 'graduate students',       unit: 'points'  },
  { variable: 'heart rate',                  population: 'sedentary adults',        unit: 'bpm'     },
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

/* ── Problem generation ── */

export function generateProblem(): RepProblem {
  // 1) Parameters
  const n      = rChoice([10, 12, 15, 20, 25, 30]);
  const alpha  = rChoice([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const tail   = rChoice<Tail>(['two', 'right', 'left'], [0.5, 0.25, 0.25]);
  const SDD    = rInt(2, 12);
  const df     = n - 1;

  // 2) Critical value magnitude
  const tcritMag = r3(
    tail === 'two' ? tInv(1 - alpha / 2, df) : tInv(1 - alpha, df),
  );

  // 3) Target significance → target |t|
  const targetSig = rChoice(['sig', 'nonsig'], [0.6, 0.4]);
  let tMag: number;
  if (targetSig === 'sig') {
    tMag = rUniform(tcritMag + 0.2, tcritMag + 1.8);
  } else {
    tMag = rUniform(0.2, Math.max(0.2, tcritMag - 0.2));
  }

  // 4) Sign
  let sign: number;
  if (tail === 'right')     sign =  1;
  else if (tail === 'left') sign = -1;
  else                      sign = Math.random() < 0.5 ? 1 : -1;

  const tTarget = sign * tMag;

  // 5) SE and MD (with small noise)
  const SEraw = SDD / Math.sqrt(n);
  const noise = rUniform(-0.1 * SDD, 0.1 * SDD);
  const MD    = r2(tTarget * SEraw + noise);

  // 6) True statistics from displayed MD
  const SE     = r4(SEraw);
  const t_true = r2(MD / SEraw);

  // 7) Decision
  let decision_true: 'reject' | 'fail';
  if      (tail === 'right') decision_true = t_true >= tcritMag           ? 'reject' : 'fail';
  else if (tail === 'left')  decision_true = t_true <= -tcritMag          ? 'reject' : 'fail';
  else                       decision_true = Math.abs(t_true) >= tcritMag ? 'reject' : 'fail';

  // 8) Effect sizes
  const dz_true = r2(MD / SDD);
  const r2_true = r4((t_true * t_true) / (t_true * t_true + df));

  // 9) CI (symmetric, using tcritMag)
  const ci_lower = r2(MD - tcritMag * SEraw);
  const ci_upper = r2(MD + tcritMag * SEraw);

  // 10) Effect task
  const effectTask = rChoice<EffectTask>(
    ['cohens_d', 'r_squared', 'confidence_interval'],
    [0.60, 0.25, 0.15],
  );

  // 11) Scenario
  const scenario = rChoice(SCENARIOS);

  return {
    n, MD, SDD, alpha, tail, df, SE, t_true, tcritMag, decision_true,
    effectTask, dz_true, r2_true, ci_lower, ci_upper,
    variable: scenario.variable, unit: scenario.unit, population: scenario.population,
  };
}

/* ── Grading ── */

interface GradeResult {
  hyp:      boolean;
  t:        boolean;
  df:       boolean;
  crit:     boolean;
  es:       boolean;
  decision: boolean;
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

export function gradeAnswers(p: RepProblem): GradeResult {
  // Hypotheses
  const hypVal     = radioVal('rp-hyp-select');
  const correctHyp = p.tail === 'two' ? 'neq' : p.tail === 'right' ? 'gt' : 'lt';
  const hyp = hypVal === correctHyp;

  // t statistic (±0.02)
  const tStudent = numInput('rp-answer-t');
  const t        = !isNaN(tStudent) && Math.abs(tStudent - p.t_true) <= 0.02;

  // df (exact)
  const dfStudent = parseInt(gv('rp-answer-df'), 10);
  const df        = dfStudent === p.df;

  // critical value (positive magnitude, ±0.02)
  const critStudent = numInput('rp-answer-crit');
  const crit        = !isNaN(critStudent) && Math.abs(Math.abs(critStudent) - p.tcritMag) <= 0.02;

  // effect size
  let es = false;
  if (p.effectTask === 'cohens_d') {
    const v = numInput('rp-answer-es');
    es = !isNaN(v) && Math.abs(v - p.dz_true) <= 0.02;
  } else if (p.effectTask === 'r_squared') {
    const v = numInput('rp-answer-es');
    es = !isNaN(v) && Math.abs(v - p.r2_true) <= 0.02;
  } else {
    const lo = numInput('rp-answer-ci-lower');
    const hi = numInput('rp-answer-ci-upper');
    es = !isNaN(lo) && !isNaN(hi)
      && Math.abs(lo - p.ci_lower) <= 0.05
      && Math.abs(hi - p.ci_upper) <= 0.05;
  }

  // decision
  const decVal   = radioVal('rp-decision-select');
  const decision = decVal === p.decision_true;

  return { hyp, t, df, crit, es, decision, allCorrect: hyp && t && df && crit && es && decision };
}

/* ── Display helpers ── */

function tailLabel(tail: Tail): string {
  return tail === 'two' ? 'two-tailed' : tail === 'right' ? 'right-tailed' : 'left-tailed';
}

function critLabel(tail: Tail, df: number): string {
  return tail === 'two'
    ? `Positive critical value — t<sub>α/2, ${df}</sub>`
    : tail === 'right'
      ? `Critical value — t<sub>α, ${df}</sub>`
      : `Critical value — enter positive magnitude (t<sub>α, ${df}</sub>)`;
}

function critDisplay(p: RepProblem): string {
  if (p.tail === 'two')   return `±${p.tcritMag}`;
  if (p.tail === 'right') return `+${p.tcritMag}`;
  return `−${p.tcritMag}`;
}

function comparisonStatement(p: RepProblem): string {
  if (p.tail === 'two')   return `Reject H₀ if |t| ≥ ${p.tcritMag}`;
  if (p.tail === 'right') return `Reject H₀ if t ≥ ${p.tcritMag}`;
  return `Reject H₀ if t ≤ −${p.tcritMag}`;
}

function interpretation(p: RepProblem): string {
  const alphaStr = p.alpha.toFixed(2);
  if (p.decision_true === 'reject') {
    return `There is evidence that the mean difference in ${p.variable} between Pre-Test and Post-Test is statistically significant (α = ${alphaStr}).`;
  }
  return `There is insufficient evidence that the mean difference in ${p.variable} differs from zero (α = ${alphaStr}).`;
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

/* ── Build effect-size section HTML ── */

function effectSectionHtml(p: RepProblem): string {
  const level = Math.round((1 - p.alpha) * 100);
  if (p.effectTask === 'cohens_d') {
    return `
      <div class="sp-section-label">5. Compute Cohen's d (Effect Size)</div>
      <div class="sp-input-row">
        <label for="rp-answer-es">d = M<sub>D</sub> / s<sub>D</sub></label>
        <input type="number" step="0.01" id="rp-answer-es" class="sp-num-input"
               placeholder="e.g. 0.52" />
      </div>`;
  }
  if (p.effectTask === 'r_squared') {
    return `
      <div class="sp-section-label">5. Compute R-Squared (Effect Size)</div>
      <div class="sp-input-row">
        <label for="rp-answer-es">R² = t² / (t² + df)</label>
        <input type="number" step="0.0001" id="rp-answer-es" class="sp-num-input"
               placeholder="e.g. 0.2345" />
      </div>`;
  }
  // confidence_interval
  return `
    <div class="sp-section-label">5. Compute the ${level}% Confidence Interval for M<sub>D</sub></div>
    <div class="sp-input-row">
      <label for="rp-answer-ci-lower">Lower bound: M<sub>D</sub> − t<sub>crit</sub> × SE</label>
      <input type="number" step="0.01" id="rp-answer-ci-lower" class="sp-num-input"
             placeholder="e.g. 1.23" />
    </div>
    <div class="sp-input-row" style="margin-top:0.4rem;">
      <label for="rp-answer-ci-upper">Upper bound: M<sub>D</sub> + t<sub>crit</sub> × SE</label>
      <input type="number" step="0.01" id="rp-answer-ci-upper" class="sp-num-input"
             placeholder="e.g. 5.67" />
    </div>`;
}

/* ── Render problem card ── */

export function renderProblem(p: RepProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const level    = Math.round((1 - p.alpha) * 100);
  const effectLabel = p.effectTask === 'cohens_d'
    ? `Cohen's d`
    : p.effectTask === 'r_squared'
      ? `R²`
      : `the ${level}% confidence interval for the mean difference`;

  const narrativeHtml =
    `<p>A researcher measures ${p.variable} in ${p.population} for n = ${p.n} participants ` +
    `at Pre-Test and again at Post-Test.</p>` +
    `<p>The difference scores (Pre-Test − Post-Test) have a mean of ` +
    `M<sub>D</sub> = ${p.MD} ${p.unit} and a standard deviation of ` +
    `s<sub>D</sub> = ${p.SDD} ${p.unit}.</p>` +
    `<p>Using α = ${alphaStr} (${tailLabel(p.tail)}), test whether there is a significant ` +
    `mean difference between the Pre-Test and Post-Test conditions.</p>` +
    `<ol>` +
    `<li>State the null and alternative hypotheses.</li>` +
    `<li>Compute the t statistic.</li>` +
    `<li>Compute the degrees of freedom.</li>` +
    `<li>Determine the critical value(s).</li>` +
    `<li>Compute ${effectLabel}.</li>` +
    `<li>State your decision.</li>` +
    `<li>Interpret the result in context.</li>` +
    `</ol>`;

  setHtml('rp-problem-text', narrativeHtml);

  // Shuffled hypothesis options
  const opts: Array<{ value: string; label: string }> = [
    { value: 'neq', label: `H₀: μD = 0 &nbsp;&nbsp; H₁: μD ≠ 0` },
    { value: 'gt',  label: `H₀: μD ≤ 0 &nbsp;&nbsp; H₁: μD &gt; 0` },
    { value: 'lt',  label: `H₀: μD ≥ 0 &nbsp;&nbsp; H₁: μD &lt; 0` },
  ];
  shuffleArray(opts);
  setHtml('rp-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="rp-hyp-select" value="${o.value}" />
      ${o.label}
    </label>
  `).join(''));

  // Critical value label (includes df)
  const critEl = document.getElementById('rp-crit-label');
  if (critEl) critEl.innerHTML = critLabel(p.tail, p.df);

  const critHintEl = document.getElementById('rp-crit-hint');
  if (critHintEl) {
    critHintEl.innerHTML = p.tail === 'two'
      ? 'Enter the positive half; critical values will be displayed as ±(your value).'
      : p.tail === 'left'
        ? 'Enter the positive magnitude; the left-tail direction is applied automatically.'
        : '';
    critHintEl.style.display = critHintEl.innerHTML ? '' : 'none';
  }

  // Section 5 — dynamic based on effect task
  setHtml('rp-effect-section', effectSectionHtml(p));
}

/* ── Render feedback ── */

function feedbackIcon(correct: boolean): string {
  return correct
    ? `<span style="color:#2e6b2e;">✅</span>`
    : `<span style="color:#8B1A00;">❌</span>`;
}

function feedbackHtml(correct: boolean, hint: string): string {
  return `${feedbackIcon(correct)}${correct ? '' : ` <span class="sp-hint">${hint}</span>`}`;
}

function esFeedbackHtml(p: RepProblem, correct: boolean): string {
  if (correct) return feedbackIcon(true);
  if (p.effectTask === 'cohens_d')
    return feedbackHtml(false, 'd = M<sub>D</sub> / s<sub>D</sub>.');
  if (p.effectTask === 'r_squared')
    return feedbackHtml(false, 'R² = t² / (t² + df).');
  const level = Math.round((1 - p.alpha) * 100);
  return feedbackHtml(false, `${level}% CI: M<sub>D</sub> ± t<sub>crit</sub> × SE. Check both bounds.`);
}

export function renderFeedback(p: RepProblem, grade: GradeResult): void {
  setHtml('rp-fb-hyp',      feedbackHtml(grade.hyp,      'Select the hypothesis pair that matches the tail direction.'));
  setHtml('rp-fb-t',        feedbackHtml(grade.t,        't = M<sub>D</sub> / (s<sub>D</sub> / √n).'));
  setHtml('rp-fb-df',       feedbackHtml(grade.df,       'df = n − 1.'));
  setHtml('rp-fb-crit',     feedbackHtml(grade.crit,     'Critical value depends on α, tail, and df.'));
  setHtml('rp-fb-es',       esFeedbackHtml(p, grade.es));
  setHtml('rp-fb-decision', feedbackHtml(grade.decision, 'Compare t to the critical value(s).'));

  const banner = document.getElementById('rp-fb-banner');
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

  setDisplay('rp-feedback-section', 'block');

  renderSolution(p);

  const solToggle = document.getElementById('rp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    const sumEl = solToggle.querySelector('summary');
    if (sumEl) sumEl.textContent = grade.allCorrect ? 'Show Explanation' : 'Show Full Solution';
    if (!grade.allCorrect) solToggle.open = true;
    solToggle.style.display = 'block';
  }
}

/* ── Render full solution ── */

export function renderSolution(p: RepProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const level    = Math.round((1 - p.alpha) * 100);
  const seStr    = `${p.SDD} / √${p.n} = ${p.SE.toFixed(4)}`;
  const tStr     = `${p.MD} / ${p.SE.toFixed(4)} = ${p.t_true}`;
  const dzStr    = `${p.MD} / ${p.SDD} = ${p.dz_true}`;
  const r2Str    = `${p.t_true}² / (${p.t_true}² + ${p.df}) = ${p.r2_true}`;
  const ciStr    = `[${p.ci_lower}, ${p.ci_upper}]  (t<sub>crit</sub> = ±${p.tcritMag})`;
  const decWord  = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';
  const h0Symbol = p.tail === 'two' ? '=' : p.tail === 'right' ? '≤' : '≥';
  const altSym   = p.tail === 'two' ? '≠' : p.tail === 'right' ? '>' : '<';

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Given Values</th></tr>
      <tr><td>n</td><td>${p.n}</td></tr>
      <tr><td>M<sub>D</sub></td><td>${p.MD} ${p.unit}</td></tr>
      <tr><td>s<sub>D</sub></td><td>${p.SDD} ${p.unit}</td></tr>
      <tr><td>df = n − 1</td><td>${p.df}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>
      <tr><td>Tail</td><td>${tailLabel(p.tail)}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>μ<sub>D</sub> ${h0Symbol} 0</td></tr>
      <tr><td>H₁</td><td>μ<sub>D</sub> ${altSym} 0</td></tr>

      <tr><th colspan="2">Standard Error</th></tr>
      <tr><td>SE = s<sub>D</sub> / √n</td><td>${seStr}</td></tr>

      <tr><th colspan="2">Test Statistic</th></tr>
      <tr><td>t = M<sub>D</sub> / SE</td><td>${tStr}</td></tr>

      <tr><th colspan="2">Critical Value(s) — df = ${p.df}</th></tr>
      <tr><td>t<sub>crit</sub></td><td>${critDisplay(p)}</td></tr>
      <tr><td>Decision rule</td><td>${comparisonStatement(p)}</td></tr>

      <tr><th colspan="2">Decision</th></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Sizes</th></tr>
      <tr><td>Cohen's d = M<sub>D</sub> / s<sub>D</sub></td><td>${dzStr}</td></tr>
      <tr><td>R² = t² / (t² + df)</td><td>${r2Str}</td></tr>
      <tr><td>${level}% CI = M<sub>D</sub> ± t<sub>crit</sub> × SE</td><td>${ciStr}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interpretation(p)}</td></tr>
    </table>
  `;
  setHtml('rp-solution-body', html);
}

/* ── Reset UI for new problem ── */

export function resetUI(): void {
  clearInput('rp-answer-t');
  clearInput('rp-answer-df');
  clearInput('rp-answer-crit');
  clearInput('rp-answer-es');
  clearInput('rp-answer-ci-lower');
  clearInput('rp-answer-ci-upper');
  uncheckRadios('rp-hyp-select');
  uncheckRadios('rp-decision-select');

  setDisplay('rp-feedback-section', 'none');
  setDisplay('rp-solution-toggle',  'none');

  const sol = document.getElementById('rp-solution-toggle') as HTMLDetailsElement | null;
  if (sol) sol.removeAttribute('open');

  setHtml('rp-fb-hyp',      '');
  setHtml('rp-fb-t',        '');
  setHtml('rp-fb-df',       '');
  setHtml('rp-fb-crit',     '');
  setHtml('rp-fb-es',       '');
  setHtml('rp-fb-decision', '');
  setHtml('rp-solution-body', '');

  const banner = document.getElementById('rp-fb-banner');
  if (banner) banner.style.display = 'none';
}
