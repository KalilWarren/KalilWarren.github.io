/* =========================================================
   Student Practice — Single-Sample Z-Test (known σ)
   ========================================================= */

/* ── Types ── */

type Tail = 'two' | 'right' | 'left';

interface ZProblem {
  mu0:           number;
  sigma:         number;
  n:             number;
  alpha:         number;
  tail:          Tail;
  xbar:          number;
  SE:            number;
  z_true:        number;
  d_true:        number;
  zcrit_mag:     number;
  decision_true: 'reject' | 'fail';
  variable:      string;
  pop:           string;
  unit:          string;
  testPhrase:    string;   // plain-text phrase, e.g. "differs from 75 points"
}

/* ── Scenario bank ── */

const SCENARIOS: Array<{ variable: string; pop: string; unit: string }> = [
  { variable: 'test anxiety scores',        pop: 'undergraduate students',    unit: 'points'  },
  { variable: 'reaction time',              pop: 'young adults',              unit: 'ms'      },
  { variable: 'daily step count',           pop: 'office workers',            unit: 'steps'   },
  { variable: 'reading comprehension scores', pop: 'fifth-grade students',    unit: 'points'  },
  { variable: 'systolic blood pressure',    pop: 'adults aged 30–50',         unit: 'mmHg'    },
  { variable: 'weekly exercise duration',   pop: 'college freshmen',          unit: 'minutes' },
  { variable: 'life satisfaction scores',   pop: 'graduate students',         unit: 'points'  },
  { variable: 'working memory capacity',    pop: 'older adults',              unit: 'units'   },
  { variable: 'sleep duration',             pop: 'shift workers',             unit: 'hours'   },
  { variable: 'vocabulary test scores',     pop: 'language learners',         unit: 'points'  },
  { variable: 'math anxiety ratings',       pop: 'high school students',      unit: 'points'  },
  { variable: 'pain tolerance scores',      pop: 'adult patients',            unit: 'units'   },
];

/* ── Critical value lookup tables ── */

const ZCRIT_ONE: Record<number, number> = {
  0.10: 1.2816,
  0.05: 1.6449,
  0.01: 2.3263,
};

const ZCRIT_TWO: Record<number, number> = {
  0.10: 1.6449,
  0.05: 1.9600,
  0.01: 2.5758,
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

/* ── Rounding ── */

function r2(x: number): number {
  return Math.round(x * 100) / 100;
}

function r4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/* ── Problem generation ── */

export function generateProblem(): ZProblem {
  // 1) Parameters
  const mu0options: number[] = [];
  for (let v = 40; v <= 120; v += 5) mu0options.push(v);
  const mu0   = rChoice(mu0options);
  const sigma = rInt(6, 20);
  const n     = rChoice([16, 25, 36, 49, 64, 100]);
  const alpha = rChoice([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const tail  = rChoice<Tail>(['two', 'right', 'left'], [0.5, 0.25, 0.25]);

  // 2) Target significance + z magnitude
  const targetSig = rChoice(['sig', 'nonsig'], [0.6, 0.4]);
  let zTargetMag: number;
  if (targetSig === 'sig') {
    zTargetMag = tail === 'two' ? rUniform(2.0, 3.2) : rUniform(1.8, 3.2);
  } else {
    zTargetMag = rUniform(0.2, 1.5);
  }

  // 3) Sign
  let sign: number;
  if (tail === 'right')      sign = 1;
  else if (tail === 'left')  sign = -1;
  else                       sign = Math.random() < 0.5 ? 1 : -1;

  // 4) SE, noise, xbar
  const SE        = sigma / Math.sqrt(n);
  const noiseTerm = rUniform(-0.25 * SE, 0.25 * SE);
  const zTarget   = sign * zTargetMag;
  const xbar      = r2(mu0 + zTarget * SE + noiseTerm);

  // 5) True z and d
  const z_true = r2((xbar - mu0) / SE);
  const d_true = r2((xbar - mu0) / sigma);

  // 6) Critical value
  const zcrit_mag = tail === 'two' ? ZCRIT_TWO[alpha] : ZCRIT_ONE[alpha];

  // 7) Decision
  let decision_true: 'reject' | 'fail';
  if (tail === 'right')      decision_true = z_true >= zcrit_mag           ? 'reject' : 'fail';
  else if (tail === 'left')  decision_true = z_true <= -zcrit_mag          ? 'reject' : 'fail';
  else                       decision_true = Math.abs(z_true) >= zcrit_mag ? 'reject' : 'fail';

  // 8) Scenario
  const scenario   = rChoice(SCENARIOS);
  const testPhrase = tail === 'two'
    ? `differs from ${mu0} ${scenario.unit}`
    : tail === 'right'
      ? `is greater than ${mu0} ${scenario.unit}`
      : `is less than ${mu0} ${scenario.unit}`;

  return {
    mu0, sigma, n, alpha, tail, xbar,
    SE: r4(SE), z_true, d_true, zcrit_mag, decision_true,
    variable: scenario.variable, pop: scenario.pop, unit: scenario.unit, testPhrase,
  };
}

/* ── Grading ── */

interface GradeResult {
  hyp:      boolean;
  z:        boolean;
  crit:     boolean;
  decision: boolean;
  d:        boolean;
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

export function gradeAnswers(p: ZProblem): GradeResult {
  // Hypotheses
  const hypVal = radioVal('hyp-select');
  const correctHyp = p.tail === 'two'   ? 'neq'
                   : p.tail === 'right' ? 'gt'
                   :                      'lt';
  const hyp = hypVal === correctHyp;

  // z stat
  const zStudent = numInput('answer-z');
  const z        = !isNaN(zStudent) && Math.abs(zStudent - p.z_true) <= 0.02;

  // critical value (always enter positive magnitude)
  const critStudent = numInput('answer-crit');
  const crit        = !isNaN(critStudent) && Math.abs(Math.abs(critStudent) - p.zcrit_mag) <= 0.01;

  // decision
  const decVal  = radioVal('decision-select');
  const decision = decVal === p.decision_true;

  // Cohen's d (sign matters — student can get sign wrong)
  const dStudent = numInput('answer-d');
  const d        = !isNaN(dStudent) && Math.abs(dStudent - p.d_true) <= 0.02;

  return { hyp, z, crit, decision, d, allCorrect: hyp && z && crit && decision && d };
}

/* ── Tail display helpers ── */

function tailLabel(tail: Tail): string {
  return tail === 'two' ? 'two-tailed' : tail === 'right' ? 'right-tailed' : 'left-tailed';
}

function critLabel(tail: Tail): string {
  return tail === 'two'
    ? 'Positive critical value (z<sub>α/2</sub>)'
    : tail === 'right'
      ? 'Critical value (z<sub>α</sub>)'
      : 'Critical value — enter positive magnitude (z<sub>α</sub>)';
}

function critDisplay(p: ZProblem): string {
  if (p.tail === 'two')  return `±${p.zcrit_mag}`;
  if (p.tail === 'right') return `+${p.zcrit_mag}`;
  return `−${p.zcrit_mag}`;
}

function comparisonStatement(p: ZProblem): string {
  if (p.tail === 'two')   return `Reject H₀ if |z| ≥ ${p.zcrit_mag}`;
  if (p.tail === 'right') return `Reject H₀ if z ≥ ${p.zcrit_mag}`;
  return `Reject H₀ if z ≤ −${p.zcrit_mag}`;
}

function interpretation(p: ZProblem): string {
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

/* ── Render problem card ── */

export function renderProblem(p: ZProblem): void {
  const alphaStr = p.alpha.toFixed(2);
  const narrativeHtml =
    `<p>A researcher is studying ${p.variable} in ${p.pop}. ` +
    `Historically, the population mean is μ = ${p.mu0} ${p.unit}, ` +
    `with a known population standard deviation of σ = ${p.sigma} ${p.unit}.</p>` +
    `<p>The researcher collects a random sample of n = ${p.n} participants ` +
    `and obtains a sample mean of x̄ = ${p.xbar} ${p.unit}.</p>` +
    `<p>Using α = ${alphaStr} (${tailLabel(p.tail)}), test whether the population mean ${p.testPhrase}.</p>` +
    `<ol>` +
    `<li>State the null and alternative hypotheses.</li>` +
    `<li>Compute the z statistic.</li>` +
    `<li>Find the critical value(s) and compute Cohen's d.</li>` +
    `<li>State your decision.</li>` +
    `<li>Interpret the result in context.</li>` +
    `</ol>`;

  setHtml('problem-text', narrativeHtml);

  // Build shuffled hypothesis options (use &gt;/&lt; for safe HTML)
  const opts: Array<{ value: string; label: string }> = [
    { value: 'neq', label: `H₀: μ = ${p.mu0} &nbsp;&nbsp; H₁: μ ≠ ${p.mu0}` },
    { value: 'gt',  label: `H₀: μ ≤ ${p.mu0} &nbsp;&nbsp; H₁: μ &gt; ${p.mu0}` },
    { value: 'lt',  label: `H₀: μ ≥ ${p.mu0} &nbsp;&nbsp; H₁: μ &lt; ${p.mu0}` },
  ];
  // shuffle so correct answer isn't always first
  shuffleArray(opts);
  setHtml('hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="hyp-select" value="${o.value}" />
      ${o.label}
    </label>
  `).join(''));

  // Update critical value label
  const critEl = document.getElementById('crit-label');
  if (critEl) critEl.innerHTML = critLabel(p.tail);
  const critHintEl = document.getElementById('crit-hint');
  if (critHintEl) {
    critHintEl.innerHTML = p.tail === 'two'
      ? 'Enter the positive half; critical values will be displayed as ±(your value).'
      : p.tail === 'left'
        ? 'Enter the positive magnitude; the left-tail direction is applied automatically.'
        : '';
    critHintEl.style.display = critHintEl.innerHTML ? '' : 'none';
  }
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ── Render feedback ── */

function feedbackHtml(correct: boolean, hint: string): string {
  const icon  = correct ? '✅' : '❌';
  const color = correct ? '#2e6b2e' : '#8B1A00';
  return `<span style="color:${color};">${icon}</span>${correct ? '' : ` <span class="sp-hint">${hint}</span>`}`;
}

export function renderFeedback(p: ZProblem, grade: GradeResult): void {
  setHtml('fb-hyp',      feedbackHtml(grade.hyp,      'Select the hypothesis pair that matches the tail direction.'));
  setHtml('fb-z',        feedbackHtml(grade.z,        'Recheck z = (x̄ − μ₀) / (σ / √n).'));
  setHtml('fb-crit',     feedbackHtml(grade.crit,     'Critical value depends on α and tail (z<sub>α</sub> or z<sub>α/2</sub>).'));
  setHtml('fb-decision', feedbackHtml(grade.decision,  'Compare z to the critical value(s).'));
  setHtml('fb-d',        feedbackHtml(grade.d,         'd = (x̄ − μ₀) / σ.'));

  const banner = document.getElementById('fb-banner');
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

  setDisplay('feedback-section', 'block');

  // Always render the solution now so it's ready either way
  renderSolution(p);

  const solToggle = document.getElementById('solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    // Update summary text based on result
    const sumEl = solToggle.querySelector('summary');
    if (sumEl) sumEl.textContent = grade.allCorrect ? 'Show Explanation' : 'Show Full Solution';

    // Auto-expand on wrong; leave collapsed (as an opt-in explanation) on correct
    if (!grade.allCorrect) solToggle.open = true;

    solToggle.style.display = 'block';
  }
}

/* ── Render full solution ── */

export function renderSolution(p: ZProblem): void {
  const alphaStr  = p.alpha.toFixed(2);
  const seStr     = `${p.sigma} / √${p.n} = ${p.SE.toFixed(4)}`;
  const zStr      = `(${p.xbar} − ${p.mu0}) / ${p.SE.toFixed(4)} = ${p.z_true}`;
  const dStr      = `(${p.xbar} − ${p.mu0}) / ${p.sigma} = ${p.d_true}`;
  const decWord   = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';
  const h0Symbol  = p.tail === 'two' ? '=' : p.tail === 'right' ? '≤' : '≥';
  const altSymbol = p.tail === 'two' ? '≠' : p.tail === 'right' ? '>' : '<';

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Given Values</th></tr>
      <tr><td>μ₀</td><td>${p.mu0}</td></tr>
      <tr><td>σ</td><td>${p.sigma}</td></tr>
      <tr><td>n</td><td>${p.n}</td></tr>
      <tr><td>x̄</td><td>${p.xbar}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>
      <tr><td>Tail</td><td>${tailLabel(p.tail)}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>μ ${h0Symbol} ${p.mu0}</td></tr>
      <tr><td>H<sub>1</sub></td><td>μ ${altSymbol} ${p.mu0}</td></tr>

      <tr><th colspan="2">Standard Error</th></tr>
      <tr><td>SE = σ / √n</td><td>${seStr}</td></tr>

      <tr><th colspan="2">Test Statistic</th></tr>
      <tr><td>z = (x̄ − μ₀) / SE</td><td>${zStr}</td></tr>

      <tr><th colspan="2">Critical Value(s)</th></tr>
      <tr><td>z<sub>crit</sub></td><td>${critDisplay(p)}</td></tr>
      <tr><td>Decision rule</td><td>${comparisonStatement(p)}</td></tr>

      <tr><th colspan="2">Decision</th></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Size</th></tr>
      <tr><td>Cohen's d = (x̄ − μ₀) / σ</td><td>${dStr}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interpretation(p)}</td></tr>
    </table>
  `;
  setHtml('solution-body', html);
}

/* ── Reset UI for new problem ── */

export function resetUI(): void {
  clearInput('answer-z');
  clearInput('answer-crit');
  clearInput('answer-d');
  uncheckRadios('hyp-select');
  uncheckRadios('decision-select');

  setDisplay('feedback-section', 'none');
  setDisplay('solution-toggle',  'none');

  const sol = document.getElementById('solution-toggle') as HTMLDetailsElement | null;
  if (sol) sol.removeAttribute('open');

  setHtml('fb-hyp',      '');
  setHtml('fb-z',        '');
  setHtml('fb-crit',     '');
  setHtml('fb-decision', '');
  setHtml('fb-d',        '');
  setHtml('solution-body', '');

  const banner = document.getElementById('fb-banner');
  if (banner) banner.style.display = 'none';
}

/* ── Streak helpers ── */

const STREAK_KEY = 'sp_ztest_streak';

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
  const el = document.getElementById('streak-display');
  if (!el) return;
  el.textContent = streak > 0 ? `🔥 Streak: ${streak}` : '';
}
