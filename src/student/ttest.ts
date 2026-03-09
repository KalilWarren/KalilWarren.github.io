/* =========================================================
   Student Practice — Single-Sample t-Test (unknown σ)
   ========================================================= */

/* ── Types ── */

type Tail       = 'two' | 'right' | 'left';
type EffectType = 'cohen_d' | 'r_squared' | 'ci';

interface TProblem {
  mu0:           number;
  s:             number;      // sample standard deviation
  n:             number;
  df:            number;      // n - 1
  alpha:         number;
  tail:          Tail;
  xbar:          number;
  SE:            number;      // s / √n (4 dp)
  t_true:        number;
  d_true:        number;      // Cohen's d
  r_sq:          number;      // R-squared
  ci_lower:      number;      // (1-α)×100% CI lower bound
  ci_upper:      number;      // (1-α)×100% CI upper bound
  ci_tcrit:      number;      // two-tailed t_crit used for CI
  tcrit_mag:     number;      // t_crit for the hypothesis test
  decision_true: 'reject' | 'fail';
  effectType:    EffectType;  // randomly chosen effect size question
  variable:      string;
  pop:           string;
  unit:          string;
  testPhrase:    string;
}

/* ── Scenario bank ── */

const SCENARIOS: Array<{ variable: string; pop: string; unit: string }> = [
  // Original 12
  { variable: 'test anxiety scores',              pop: 'undergraduate students',      unit: 'points'           },
  { variable: 'reaction time',                    pop: 'young adults',                unit: 'ms'               },
  { variable: 'daily step count',                 pop: 'office workers',              unit: 'steps'            },
  { variable: 'reading comprehension scores',     pop: 'fifth-grade students',        unit: 'points'           },
  { variable: 'systolic blood pressure',          pop: 'adults aged 30–50',           unit: 'mmHg'             },
  { variable: 'weekly exercise duration',         pop: 'college freshmen',            unit: 'minutes'          },
  { variable: 'life satisfaction scores',         pop: 'graduate students',           unit: 'points'           },
  { variable: 'working memory capacity',          pop: 'older adults',                unit: 'units'            },
  { variable: 'sleep duration',                   pop: 'shift workers',               unit: 'hours'            },
  { variable: 'vocabulary test scores',           pop: 'language learners',           unit: 'points'           },
  { variable: 'math anxiety ratings',             pop: 'high school students',        unit: 'points'           },
  { variable: 'pain tolerance scores',            pop: 'adult patients',              unit: 'units'            },
  // New 38
  { variable: 'working memory capacity',          pop: 'college students',            unit: 'units'            },
  { variable: 'attention span',                   pop: 'college-aged adults',         unit: 'minutes'          },
  { variable: 'cognitive flexibility scores',     pop: 'young adults',                unit: 'points'           },
  { variable: 'depression scores',                pop: 'clinical outpatients',        unit: 'points'           },
  { variable: 'self-efficacy ratings',            pop: 'graduate students',           unit: 'points'           },
  { variable: 'social anxiety scores',            pop: 'undergraduate students',      unit: 'points'           },
  { variable: 'procrastination scores',           pop: 'college students',            unit: 'points'           },
  { variable: 'resilience scores',                pop: 'adults',                      unit: 'points'           },
  { variable: 'mindfulness ratings',              pop: 'working adults',              unit: 'points'           },
  { variable: 'stress reactivity scores',         pop: 'adults',                      unit: 'points'           },
  { variable: 'emotional regulation scores',      pop: 'adolescents',                 unit: 'points'           },
  { variable: 'intrinsic motivation ratings',     pop: 'middle school students',      unit: 'points'           },
  { variable: 'decision-making accuracy',         pop: 'older adults',                unit: '%'                },
  { variable: 'creative problem-solving scores',  pop: 'undergraduate students',      unit: 'points'           },
  { variable: 'verbal fluency scores',            pop: 'adults',                      unit: 'words/min'        },
  { variable: 'spatial reasoning scores',         pop: 'engineering students',        unit: 'points'           },
  { variable: 'executive function scores',        pop: 'children aged 8–12',          unit: 'points'           },
  { variable: 'academic engagement ratings',      pop: 'high school students',        unit: 'points'           },
  { variable: 'resting heart rate',               pop: 'sedentary adults',            unit: 'bpm'              },
  { variable: 'sleep quality index',              pop: 'college students',            unit: 'points'           },
  { variable: 'fatigue severity scores',          pop: 'adults with chronic illness', unit: 'points'           },
  { variable: 'chronic pain intensity ratings',   pop: 'adult patients',              unit: 'points'           },
  { variable: 'cortisol levels',                  pop: 'adults under stress',         unit: 'nmol/L'           },
  { variable: 'grip strength',                    pop: 'older adults',                unit: 'kg'               },
  { variable: 'body mass index',                  pop: 'adults aged 25–45',           unit: 'kg/m²'            },
  { variable: 'physical activity level',          pop: 'adults',                      unit: 'MET-hours/week'   },
  { variable: 'lung function',                    pop: 'adults with asthma',          unit: '% predicted FEV1' },
  { variable: 'resting metabolic rate',           pop: 'healthy adults',              unit: 'kcal/day'         },
  { variable: 'blood glucose levels',             pop: 'pre-diabetic adults',         unit: 'mg/dL'            },
  { variable: 'heart rate variability',           pop: 'endurance athletes',          unit: 'ms'               },
  { variable: 'exam performance scores',          pop: 'undergraduate students',      unit: 'points'           },
  { variable: 'GPA',                              pop: 'college freshmen',            unit: 'points'           },
  { variable: 'homework completion rates',        pop: 'middle school students',      unit: '%'                },
  { variable: 'classroom participation ratings',  pop: 'eighth-grade students',       unit: 'points'           },
  { variable: 'critical thinking scores',         pop: 'graduate students',           unit: 'points'           },
  { variable: 'academic self-efficacy scores',    pop: 'high school seniors',         unit: 'points'           },
  { variable: 'note-taking quality ratings',      pop: 'undergraduate students',      unit: 'points'           },
  { variable: 'peer collaboration scores',        pop: 'elementary school students',  unit: 'points'           },
];

/* ── Critical value lookup tables ── */
// One-tailed: α = area in upper tail
const TCRIT_ONE: Record<number, Record<number, number>> = {
   9: { 0.10: 1.383, 0.05: 1.833, 0.01: 2.821 },
  14: { 0.10: 1.345, 0.05: 1.761, 0.01: 2.624 },
  19: { 0.10: 1.328, 0.05: 1.729, 0.01: 2.539 },
  24: { 0.10: 1.318, 0.05: 1.711, 0.01: 2.492 },
  29: { 0.10: 1.311, 0.05: 1.699, 0.01: 2.462 },
  39: { 0.10: 1.304, 0.05: 1.685, 0.01: 2.426 },
  59: { 0.10: 1.296, 0.05: 1.671, 0.01: 2.390 },
 119: { 0.10: 1.289, 0.05: 1.658, 0.01: 2.358 },
};

// Two-tailed: α split across both tails
const TCRIT_TWO: Record<number, Record<number, number>> = {
   9: { 0.10: 1.833, 0.05: 2.262, 0.01: 3.250 },
  14: { 0.10: 1.761, 0.05: 2.145, 0.01: 2.977 },
  19: { 0.10: 1.729, 0.05: 2.093, 0.01: 2.861 },
  24: { 0.10: 1.711, 0.05: 2.064, 0.01: 2.797 },
  29: { 0.10: 1.699, 0.05: 2.045, 0.01: 2.756 },
  39: { 0.10: 1.685, 0.05: 2.023, 0.01: 2.708 },
  59: { 0.10: 1.671, 0.05: 2.001, 0.01: 2.660 },
 119: { 0.10: 1.658, 0.05: 1.980, 0.01: 2.618 },
};

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
function r4(x: number): number { return Math.round(x * 10000) / 10000; }

/* ── Problem generation ── */

export function generateProblem(): TProblem {
  // 1) Parameters
  const mu0options: number[] = [];
  for (let v = 40; v <= 120; v += 5) mu0options.push(v);
  const mu0    = rChoice(mu0options);
  const sigPop = rInt(6, 20);
  const n      = rChoice([10, 15, 20, 25, 30, 40, 60, 120]);
  const df     = n - 1;
  const alpha  = rChoice([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const tail   = rChoice<Tail>(['two', 'right', 'left'], [0.5, 0.25, 0.25]);

  // 2) Simulate sample SD (s) with noise around population SD
  const s  = Math.max(2, r2(sigPop + rUniform(-1.5, 1.5)));
  const SE = r4(s / Math.sqrt(n));

  // 3) Critical value for hypothesis test
  const tcrit_mag = tail === 'two' ? TCRIT_TWO[df][alpha] : TCRIT_ONE[df][alpha];

  // 4) Target significance
  const targetSig = rChoice(['sig', 'nonsig'], [0.6, 0.4]);
  let tTargetMag: number;
  if (targetSig === 'sig') {
    tTargetMag = tcrit_mag + rUniform(0.3, 2.0);
  } else {
    tTargetMag = rUniform(0.2, tcrit_mag * 0.8);
  }

  // 5) Sign
  let sign: number;
  if (tail === 'right')     sign =  1;
  else if (tail === 'left') sign = -1;
  else                      sign = Math.random() < 0.5 ? 1 : -1;

  // 6) Back-calculate xbar
  const tTarget   = sign * tTargetMag;
  const noiseTerm = rUniform(-0.25 * SE, 0.25 * SE);
  const xbar      = r2(mu0 + tTarget * SE + noiseTerm);

  // 7) Derived statistics
  const t_true = r2((xbar - mu0) / SE);
  const d_true = r2((xbar - mu0) / s);
  const r_sq   = r4((t_true * t_true) / (t_true * t_true + df));

  // 8) Confidence interval — always uses two-tailed t_crit at same α
  const ci_tcrit = TCRIT_TWO[df][alpha];
  const ci_lower = r2(xbar - ci_tcrit * SE);
  const ci_upper = r2(xbar + ci_tcrit * SE);

  // 9) Decision
  let decision_true: 'reject' | 'fail';
  if (tail === 'right')     decision_true = t_true >= tcrit_mag           ? 'reject' : 'fail';
  else if (tail === 'left') decision_true = t_true <= -tcrit_mag          ? 'reject' : 'fail';
  else                      decision_true = Math.abs(t_true) >= tcrit_mag ? 'reject' : 'fail';

  // 10) Random effect size type
  const effectType = rChoice<EffectType>(['cohen_d', 'r_squared', 'ci']);

  // 11) Scenario
  const scenario   = rChoice(SCENARIOS);
  const testPhrase = tail === 'two'
    ? `differs from ${mu0} ${scenario.unit}`
    : tail === 'right'
      ? `is greater than ${mu0} ${scenario.unit}`
      : `is less than ${mu0} ${scenario.unit}`;

  return {
    mu0, s, n, df, alpha, tail, xbar,
    SE, t_true, d_true, r_sq, ci_lower, ci_upper, ci_tcrit, tcrit_mag, decision_true,
    effectType, variable: scenario.variable, pop: scenario.pop, unit: scenario.unit, testPhrase,
  };
}

/* ── Grading ── */

interface GradeResult {
  hyp:      boolean;
  t:        boolean;
  crit:     boolean;
  decision: boolean;
  es:       boolean;   // effect size (whichever type)
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

export function gradeAnswers(p: TProblem): GradeResult {
  // Hypotheses
  const hypVal     = radioVal('tp-hyp-select');
  const correctHyp = p.tail === 'two' ? 'neq' : p.tail === 'right' ? 'gt' : 'lt';
  const hyp = hypVal === correctHyp;

  // t statistic
  const tStudent = numInput('tp-answer-t');
  const t        = !isNaN(tStudent) && Math.abs(tStudent - p.t_true) <= 0.02;

  // critical value (positive magnitude)
  const critStudent = numInput('tp-answer-crit');
  const crit        = !isNaN(critStudent) && Math.abs(Math.abs(critStudent) - p.tcrit_mag) <= 0.01;

  // decision
  const decVal   = radioVal('tp-decision-select');
  const decision = decVal === p.decision_true;

  // effect size — branch on type
  let es = false;
  if (p.effectType === 'cohen_d') {
    const v = numInput('tp-answer-es');
    es = !isNaN(v) && Math.abs(v - p.d_true) <= 0.02;
  } else if (p.effectType === 'r_squared') {
    const v = numInput('tp-answer-es');
    es = !isNaN(v) && Math.abs(v - p.r_sq) <= 0.01;
  } else {
    // CI: both bounds must be within tolerance
    const lo = numInput('tp-answer-ci-lower');
    const hi = numInput('tp-answer-ci-upper');
    es = !isNaN(lo) && !isNaN(hi)
      && Math.abs(lo - p.ci_lower) <= 0.05
      && Math.abs(hi - p.ci_upper) <= 0.05;
  }

  return { hyp, t, crit, decision, es, allCorrect: hyp && t && crit && decision && es };
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

function critDisplay(p: TProblem): string {
  if (p.tail === 'two')   return `±${p.tcrit_mag}`;
  if (p.tail === 'right') return `+${p.tcrit_mag}`;
  return `−${p.tcrit_mag}`;
}

function comparisonStatement(p: TProblem): string {
  if (p.tail === 'two')   return `Reject H₀ if |t| ≥ ${p.tcrit_mag}`;
  if (p.tail === 'right') return `Reject H₀ if t ≥ ${p.tcrit_mag}`;
  return `Reject H₀ if t ≤ −${p.tcrit_mag}`;
}

function ciLevel(alpha: number): number { return Math.round((1 - alpha) * 100); }

function interpretation(p: TProblem): string {
  const alphaStr = p.alpha.toFixed(2);
  if (p.decision_true === 'reject') {
    return `Evidence suggests the mean of ${p.variable} ${p.testPhrase} at α = ${alphaStr}.`;
  }
  return `Insufficient evidence that the mean of ${p.variable} ${p.testPhrase} at α = ${alphaStr}.`;
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

/* ── Build section-5 HTML ── */

function effectSectionHtml(p: TProblem): string {
  const level = ciLevel(p.alpha);
  if (p.effectType === 'cohen_d') {
    return `
      <div class="sp-section-label">5. Compute Cohen's d (Effect Size)</div>
      <div class="sp-input-row">
        <label for="tp-answer-es">d = (M − μ₀) / s</label>
        <input type="number" step="0.01" id="tp-answer-es" class="sp-num-input"
               placeholder="e.g. 0.52" />
      </div>`;
  }
  if (p.effectType === 'r_squared') {
    return `
      <div class="sp-section-label">5. Compute R-Squared (Effect Size)</div>
      <div class="sp-input-row">
        <label for="tp-answer-es">r² = t² / (t² + df)</label>
        <input type="number" step="0.0001" id="tp-answer-es" class="sp-num-input"
               placeholder="e.g. 0.2345" />
      </div>`;
  }
  // CI
  return `
    <div class="sp-section-label">5. Compute the ${level}% Confidence Interval</div>
    <div class="sp-input-row">
      <label for="tp-answer-ci-lower">Lower bound: M − t<sub>crit</sub> × SE</label>
      <input type="number" step="0.01" id="tp-answer-ci-lower" class="sp-num-input"
             placeholder="e.g. 72.34" />
    </div>
    <div class="sp-input-row" style="margin-top:0.4rem;">
      <label for="tp-answer-ci-upper">Upper bound: M + t<sub>crit</sub> × SE</label>
      <input type="number" step="0.01" id="tp-answer-ci-upper" class="sp-num-input"
             placeholder="e.g. 81.56" />
    </div>`;
}

/* ── Render problem card ── */

export function renderProblem(p: TProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const level    = ciLevel(p.alpha);

  const q3 = p.effectType === 'cohen_d'
    ? `Find the critical value(s) and compute Cohen's d.`
    : p.effectType === 'r_squared'
      ? `Find the critical value(s) and compute R-squared (r²).`
      : `Find the critical value(s) and compute the ${level}% confidence interval.`;

  const narrativeHtml =
    `<p>A researcher is studying ${p.variable} in ${p.pop}. ` +
    `Historically, the population mean is μ = ${p.mu0} ${p.unit}. ` +
    `The population standard deviation is unknown.</p>` +
    `<p>The researcher collects a random sample of n = ${p.n} participants ` +
    `and obtains a sample mean of M = ${p.xbar} ${p.unit} ` +
    `with a sample standard deviation of s = ${p.s} ${p.unit}.</p>` +
    `<p>Using α = ${alphaStr} (${tailLabel(p.tail)}), test whether the population mean ${p.testPhrase}.</p>` +
    `<ol>` +
    `<li>State the null and alternative hypotheses.</li>` +
    `<li>Compute the t test statistic.</li>` +
    `<li>${q3}</li>` +
    `<li>State your decision.</li>` +
    `<li>Interpret the result in context.</li>` +
    `</ol>`;

  setHtml('tp-problem-text', narrativeHtml);

  // Shuffled hypothesis options
  const opts: Array<{ value: string; label: string }> = [
    { value: 'neq', label: `H₀: μ = ${p.mu0} &nbsp;&nbsp; H₁: μ ≠ ${p.mu0}` },
    { value: 'gt',  label: `H₀: μ ≤ ${p.mu0} &nbsp;&nbsp; H₁: μ &gt; ${p.mu0}` },
    { value: 'lt',  label: `H₀: μ ≥ ${p.mu0} &nbsp;&nbsp; H₁: μ &lt; ${p.mu0}` },
  ];
  shuffleArray(opts);
  setHtml('tp-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="tp-hyp-select" value="${o.value}" />
      ${o.label}
    </label>
  `).join(''));

  // Critical value label (includes df)
  const critEl = document.getElementById('tp-crit-label');
  if (critEl) critEl.innerHTML = critLabel(p.tail, p.df);

  const critHintEl = document.getElementById('tp-crit-hint');
  if (critHintEl) {
    critHintEl.innerHTML = p.tail === 'two'
      ? 'Enter the positive half; critical values will be displayed as ±(your value).'
      : p.tail === 'left'
        ? 'Enter the positive magnitude; the left-tail direction is applied automatically.'
        : '';
    critHintEl.style.display = critHintEl.innerHTML ? '' : 'none';
  }

  // Section 5 — dynamic based on effect type
  setHtml('tp-effect-section', effectSectionHtml(p));
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

function esFeedbackHtml(p: TProblem, correct: boolean): string {
  if (correct) return feedbackIcon(true);
  if (p.effectType === 'cohen_d') return feedbackHtml(false, 'd = (M − μ₀) / s.');
  if (p.effectType === 'r_squared') return feedbackHtml(false, 'r² = t² / (t² + df).');
  const level = ciLevel(p.alpha);
  return feedbackHtml(false, `${level}% CI: M ± t<sub>crit</sub> × SE. Check both bounds.`);
}

export function renderFeedback(p: TProblem, grade: GradeResult): void {
  setHtml('tp-fb-hyp',      feedbackHtml(grade.hyp,      'Select the hypothesis pair that matches the tail direction.'));
  setHtml('tp-fb-t',        feedbackHtml(grade.t,        'Recheck t = (M − μ₀) / (s / √n).'));
  setHtml('tp-fb-crit',     feedbackHtml(grade.crit,     'Critical value depends on α, tail, and df = n − 1.'));
  setHtml('tp-fb-decision', feedbackHtml(grade.decision, 'Compare t to the critical value(s).'));
  setHtml('tp-fb-es',       esFeedbackHtml(p, grade.es));

  const banner = document.getElementById('tp-fb-banner');
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

  setDisplay('tp-feedback-section', 'block');

  renderSolution(p);

  const solToggle = document.getElementById('tp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    const sumEl = solToggle.querySelector('summary');
    if (sumEl) sumEl.textContent = grade.allCorrect ? 'Show Explanation' : 'Show Full Solution';
    if (!grade.allCorrect) solToggle.open = true;
    solToggle.style.display = 'block';
  }
}

/* ── Render full solution ── */

export function renderSolution(p: TProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const level    = ciLevel(p.alpha);
  const seStr    = `${p.s} / √${p.n} = ${p.SE.toFixed(4)}`;
  const tStr     = `(${p.xbar} − ${p.mu0}) / ${p.SE.toFixed(4)} = ${p.t_true}`;
  const dStr     = `(${p.xbar} − ${p.mu0}) / ${p.s} = ${p.d_true}`;
  const rsStr    = `${p.t_true}² / (${p.t_true}² + ${p.df}) = ${p.r_sq}`;
  const ciStr    = `[${p.ci_lower}, ${p.ci_upper}]  (using t<sub>crit</sub> = ±${p.ci_tcrit})`;
  const decWord  = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';
  const h0Symbol  = p.tail === 'two' ? '=' : p.tail === 'right' ? '≤' : '≥';
  const altSymbol = p.tail === 'two' ? '≠' : p.tail === 'right' ? '>' : '<';

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Given Values</th></tr>
      <tr><td>μ₀</td><td>${p.mu0}</td></tr>
      <tr><td>n</td><td>${p.n}</td></tr>
      <tr><td>df = n − 1</td><td>${p.df}</td></tr>
      <tr><td>M</td><td>${p.xbar}</td></tr>
      <tr><td>s</td><td>${p.s}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>
      <tr><td>Tail</td><td>${tailLabel(p.tail)}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>μ ${h0Symbol} ${p.mu0}</td></tr>
      <tr><td>H<sub>1</sub></td><td>μ ${altSymbol} ${p.mu0}</td></tr>

      <tr><th colspan="2">Standard Error</th></tr>
      <tr><td>SE = s / √n</td><td>${seStr}</td></tr>

      <tr><th colspan="2">Test Statistic</th></tr>
      <tr><td>t = (M − μ₀) / SE</td><td>${tStr}</td></tr>

      <tr><th colspan="2">Critical Value(s) — df = ${p.df}</th></tr>
      <tr><td>t<sub>crit</sub></td><td>${critDisplay(p)}</td></tr>
      <tr><td>Decision rule</td><td>${comparisonStatement(p)}</td></tr>

      <tr><th colspan="2">Decision</th></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Sizes</th></tr>
      <tr><td>Cohen's d = (M − μ₀) / s</td><td>${dStr}</td></tr>
      <tr><td>R² = t² / (t² + df)</td><td>${rsStr}</td></tr>
      <tr><td>${level}% CI = M ± t<sub>crit</sub> × SE</td><td>${ciStr}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interpretation(p)}</td></tr>
    </table>
  `;
  setHtml('tp-solution-body', html);
}

/* ── Reset UI for new problem ── */

export function resetUI(): void {
  clearInput('tp-answer-t');
  clearInput('tp-answer-crit');
  clearInput('tp-answer-es');
  clearInput('tp-answer-ci-lower');
  clearInput('tp-answer-ci-upper');
  uncheckRadios('tp-hyp-select');
  uncheckRadios('tp-decision-select');

  setDisplay('tp-feedback-section', 'none');
  setDisplay('tp-solution-toggle',  'none');

  const sol = document.getElementById('tp-solution-toggle') as HTMLDetailsElement | null;
  if (sol) sol.removeAttribute('open');

  setHtml('tp-fb-hyp',      '');
  setHtml('tp-fb-t',        '');
  setHtml('tp-fb-crit',     '');
  setHtml('tp-fb-decision', '');
  setHtml('tp-fb-es',       '');
  setHtml('tp-solution-body', '');

  const banner = document.getElementById('tp-fb-banner');
  if (banner) banner.style.display = 'none';
}

/* ── Streak helpers ── */

const STREAK_KEY = 'sp_ttest_streak';

export function getStreak(): number {
  return parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10);
}

export function updateStreak(allCorrect: boolean): number {
  let streak = getStreak();
  streak = allCorrect ? streak + 1 : 0;
  localStorage.setItem(STREAK_KEY, String(streak));
  return streak;
}

export function renderStreak(streak: number): void {
  const el = document.getElementById('tp-streak-display');
  if (!el) return;
  el.textContent = streak > 0 ? `🔥 Streak: ${streak}` : '';
}
