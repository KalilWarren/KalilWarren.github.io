import { state } from './state.ts';
import { gv } from './ui.ts';
import { pValue, tPValue, fPValue, statsDict } from './stats.ts';
import type {
  AnovaDifficulty,
  AnovaFullTable, AnovaMissingCell,
  TwoWayAnovaFullTable, TwoWayAnovaMissingCell,
  RmaAnovaFullTable, RmaAnovaMissingCell,
  PearsonProblemData,
  RegFullTable, RegMissingCell, RegPracticeData,
  TableRow,
} from './types.ts';

/* ── Effect size type helper ── */

type EffectSizeType = 'cohen_d' | 'r_squared' | 'ci';

function resolveEffectSizeType(): EffectSizeType {
  const sel = (document.getElementById('pg-es-type') as HTMLSelectElement | null)?.value ?? 'random';
  if (sel === 'cohen_d' || sel === 'r_squared' || sel === 'ci') return sel;
  /* random — match student module weights: 60% d, 25% r², 15% CI */
  const r = Math.random();
  return r < 0.6 ? 'cohen_d' : r < 0.85 ? 'r_squared' : 'ci';
}

/* ── Z-Test Problem Generator ── */

export function generateZTestProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'z_test') return;

  const stats = statsDict(state.lastResult.results);

  const variable = (document.getElementById('pg-variable') as HTMLInputElement).value.trim()   || 'the variable of interest';
  const pop      = (document.getElementById('pg-population') as HTMLInputElement).value.trim() || 'the target population';
  const unit     = (document.getElementById('pg-unit') as HTMLInputElement).value.trim()       || 'units';

  const mu0    = stats['Population Mean'];
  const sigma  = stats['Population SD'];
  const n      = stats['N'];
  const xbar   = stats['Sample Mean'];
  const se     = stats['Standard Error'];
  const zScore = stats['Z Score'];
  const zCrit  = stats['Z_Critical'];
  const cohenD = stats["Cohen's d"];
  const decision = stats['Decision'];
  const ciUp   = stats['95% CI Upper'];
  const ciLo   = stats['95% CI Lower'];

  const alpha     = state.lastZTestContext?.alpha     ?? 0.05;
  const twoTailed = state.lastZTestContext?.twoTailed ?? true;
  const tailLabel = twoTailed ? 'two-tailed' : 'one-tailed';
  const pval      = pValue(parseFloat(String(zScore)), twoTailed);
  const pvalNum   = pval.startsWith('<') ? 0.0001 : parseFloat(pval);
  const pCompare  = pvalNum < alpha ? '< α' : '> α';

  /* Direction phrase — must be computed before problemHTML */
  const h1op = twoTailed ? '≠' : (parseFloat(String(xbar)) > parseFloat(String(mu0)) ? '>' : '<');
  const h0op = twoTailed ? '=' : (h1op === '>' ? '≤' : '≥');
  const testPhraseHTML = twoTailed
    ? `differs from ${mu0}&nbsp;${unit}`
    : (h1op === '>' ? `is significantly greater than ${mu0}&nbsp;${unit}`
                    : `is significantly less than ${mu0}&nbsp;${unit}`);
  const testPhrasePlain = twoTailed
    ? `differs from ${mu0} ${unit}`
    : (h1op === '>' ? `is significantly greater than ${mu0} ${unit}`
                    : `is significantly less than ${mu0} ${unit}`);

  /* Student problem text */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher is studying <strong>${variable}</strong> in <strong>${pop}</strong>.
  Historically, the population mean is μ&nbsp;=&nbsp;${mu0}&nbsp;${unit},
  with a known population standard deviation of σ&nbsp;=&nbsp;${sigma}&nbsp;${unit}.</p>
  <p>The researcher collects a random sample of <em>n</em>&nbsp;=&nbsp;${n} participants
  and obtains a sample mean of <em>M</em>&nbsp;=&nbsp;${xbar}&nbsp;${unit}.</p>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether the population mean
  ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>z</em> statistic.</li>
      <li>Determine the <em>p</em>-value and compute Cohen's <em>d</em>.</li>
      <li>State your decision.</li>
      <li>Interpret the result in context.</li>
    </ol>
  </div>
</div>`;

  /* Instructor key */
  const h0    = `H₀: μ ${h0op} ${mu0} ${unit}`;
  const h1    = `H₁: μ ${h1op} ${mu0} ${unit}`;
  const isRej = decision === 'Reject Null';
  const interp = isRej
    ? `There is sufficient evidence at α = ${alpha} to conclude that the mean ${variable}
       in ${pop} ${testPhrasePlain}
       (z = ${zScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`
    : `There is insufficient evidence at α = ${alpha} to conclude that the mean ${variable}
       in ${pop} ${testPhrasePlain}
       (z = ${zScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`;

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Hypotheses</strong>
    <p>${h0}</p>
    <p>${h1}</p>
  </div>

  <div class="key-section">
    <strong>2. Z Statistic</strong>
    <div class="key-formula">
      z = (M &minus; μ) / (σ / &radic;n)<br>
      z = (${xbar} &minus; ${mu0}) / (${sigma} / &radic;${n})<br>
      z = (${xbar} &minus; ${mu0}) / ${se}<br>
      z = ${zScore}
    </div>
    <p>Critical value: z<sub>crit</sub> = &plusmn;${zCrit} &nbsp;(α = ${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    <p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
    <p>Cohen's d = (M &minus; μ) / σ = (${xbar} &minus; ${mu0}) / ${sigma} = ${cohenD}</p>
  </div>

  <div class="key-section">
    <strong>4. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${interp}</p>
    <p>95% CI: [${ciLo},&nbsp;${ciUp}]&nbsp;${unit}</p>
  </div>
</div>`;

  state.lastProblemData = {
    testType: 'z_test',
    variable, pop, unit,
    mu0: mu0 ?? '', sigma: sigma ?? '', n: n ?? '', xbar: xbar ?? '', se: se ?? '',
    zScore: zScore ?? '', zCrit: zCrit ?? '', cohenD: cohenD ?? '',
    decision: decision ?? null, ciUp: ciUp ?? '', ciLo: ciLo ?? '',
    alpha, twoTailed, tailLabel, pval, pCompare,
    h0, h1, isRej, testPhrasePlain,
    interp: interp.replace(/\s+/g, ' ').trim(),
  };

  (document.getElementById('pg-problem-text') as HTMLElement).innerHTML   = problemHTML;
  (document.getElementById('pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('pg-output') as HTMLElement).style.display     = 'block';

  /* Reset key toggle whenever problem is regenerated */
  (document.getElementById('pg-show-key') as HTMLInputElement).checked              = false;
  (document.getElementById('pg-instructor-key') as HTMLElement).style.display       = 'none';

  (document.getElementById('pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── T-Test Problem Generator ── */

export function generateTTestProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 't_test') return;

  const stats = statsDict(state.lastResult.results);

  const variable = (document.getElementById('pg-variable') as HTMLInputElement).value.trim()   || 'the variable of interest';
  const pop      = (document.getElementById('pg-population') as HTMLInputElement).value.trim() || 'the target population';
  const unit     = (document.getElementById('pg-unit') as HTMLInputElement).value.trim()       || 'units';

  /* Engine doesn't echo μ₀ in results; read from form input */
  const mu0      = gv('t-pop-mean');
  const sampleSD = stats['Sample SD'];
  const n        = stats['N'];
  const xbar     = stats['Sample Mean'];
  const se       = stats['Standard Error'];
  const tScore   = stats['t Score'];
  const tCrit    = stats['t_Critical'];
  const cohenD   = stats["Cohen's d"];
  const rSq      = stats['R-Squared'];
  const decision = stats['Decision'];
  const ciUp     = stats['95% CI Upper'];
  const ciLo     = stats['95% CI Lower'];
  const df       = Number(n) - 1;

  const alpha     = state.lastTTestContext?.alpha     ?? 0.05;
  const twoTailed = state.lastTTestContext?.twoTailed ?? true;
  const tailLabel = twoTailed ? 'two-tailed' : 'one-tailed';
  const pval      = tPValue(parseFloat(String(tScore)), df, twoTailed);
  const pvalNum   = pval.startsWith('<') ? 0.0001 : parseFloat(pval);
  const pCompare  = pvalNum < alpha ? '< α' : '> α';

  /* Direction phrase */
  const h1op = twoTailed ? '≠' : (parseFloat(String(xbar)) > parseFloat(mu0) ? '>' : '<');
  const h0op = twoTailed ? '=' : (h1op === '>' ? '≤' : '≥');
  const testPhraseHTML = twoTailed
    ? `differs from ${mu0}&nbsp;${unit}`
    : (h1op === '>' ? `is significantly greater than ${mu0}&nbsp;${unit}`
                    : `is significantly less than ${mu0}&nbsp;${unit}`);
  const testPhrasePlain = twoTailed
    ? `differs from ${mu0} ${unit}`
    : (h1op === '>' ? `is significantly greater than ${mu0} ${unit}`
                    : `is significantly less than ${mu0} ${unit}`);

  /* Effect size focus */
  const esType = resolveEffectSizeType();
  const esQ3 = esType === 'cohen_d'   ? `Determine the <em>p</em>-value and compute Cohen's <em>d</em>.`
             : esType === 'r_squared' ? `Determine the <em>p</em>-value and compute <em>r</em>&sup2;.`
             :                         `Determine the <em>p</em>-value and compute the ${(1 - alpha) * 100 | 0}% confidence interval for μ.`;

  /* Student problem text */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher is studying <strong>${variable}</strong> in <strong>${pop}</strong>.
  The null hypothesis posits a population mean of μ₀&nbsp;=&nbsp;${mu0}&nbsp;${unit}
  (population SD is unknown).</p>
  <p>The researcher collects a random sample of <em>n</em>&nbsp;=&nbsp;${n} participants
  and obtains a sample mean of <em>M</em>&nbsp;=&nbsp;${xbar}&nbsp;${unit},
  with a sample standard deviation of <em>s</em>&nbsp;=&nbsp;${sampleSD}&nbsp;${unit}.</p>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether the population mean
  ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>t</em> statistic.</li>
      <li>${esQ3}</li>
      <li>State your decision.</li>
      <li>Interpret the result in context.</li>
    </ol>
  </div>
</div>`;

  /* Instructor key */
  const h0     = `H₀: μ ${h0op} ${mu0} ${unit}`;
  const h1     = `H₁: μ ${h1op} ${mu0} ${unit}`;
  const isRej  = decision === 'Reject Null';
  const rSqPct = (parseFloat(String(rSq)) * 100).toFixed(1);
  const interp = isRej
    ? `There is sufficient evidence at α = ${alpha} to conclude that the mean ${variable}
       in ${pop} ${testPhrasePlain}
       (t(${df}) = ${tScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`
    : `There is insufficient evidence at α = ${alpha} to conclude that the mean ${variable}
       in ${pop} ${testPhrasePlain}
       (t(${df}) = ${tScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`;

  const esKey3 = esType === 'cohen_d'
    ? `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>Cohen's d = (M &minus; μ₀) / s = (${xbar} &minus; ${mu0}) / ${sampleSD} = ${cohenD}</p>`
    : esType === 'r_squared'
    ? `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>r&sup2; = t&sup2;&nbsp;/&nbsp;(t&sup2;&nbsp;+&nbsp;df) = ${parseFloat(String(rSq)).toFixed(3)} (${rSqPct}% of variance explained)</p>`
    : `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>${(1 - alpha) * 100 | 0}% CI: [${ciLo},&nbsp;${ciUp}]&nbsp;${unit}</p>`;

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Hypotheses</strong>
    <p>${h0}</p>
    <p>${h1}</p>
  </div>

  <div class="key-section">
    <strong>2. T Statistic</strong>
    <div class="key-formula">
      t = (M &minus; μ₀) / (s / &radic;n)<br>
      t = (${xbar} &minus; ${mu0}) / (${sampleSD} / &radic;${n})<br>
      t = (${xbar} &minus; ${mu0}) / ${se}<br>
      t = ${tScore}
    </div>
    <p>df = n &minus; 1 = ${n} &minus; 1 = ${df}</p>
    <p>Critical value: t<sub>crit</sub> = &plusmn;${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    ${esKey3}
  </div>

  <div class="key-section">
    <strong>4. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${interp}</p>
  </div>
</div>`;

  state.lastProblemData = {
    testType: 't_test',
    esType,
    variable, pop, unit, mu0,
    sampleSD: sampleSD ?? '', n: n ?? '', xbar: xbar ?? '', se: se ?? '',
    tScore: tScore ?? '', tCrit: tCrit ?? '', df, cohenD: cohenD ?? '',
    rSq: rSq ?? '', rSqPct, decision: decision ?? null, ciUp: ciUp ?? '', ciLo: ciLo ?? '',
    alpha, twoTailed, tailLabel, pval, pCompare,
    h0, h1, isRej, testPhrasePlain,
    interp: interp.replace(/\s+/g, ' ').trim(),
  };

  (document.getElementById('pg-problem-text') as HTMLElement).innerHTML   = problemHTML;
  (document.getElementById('pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('pg-output') as HTMLElement).style.display     = 'block';

  /* Reset key toggle whenever problem is regenerated */
  (document.getElementById('pg-show-key') as HTMLInputElement).checked              = false;
  (document.getElementById('pg-instructor-key') as HTMLElement).style.display       = 'none';

  (document.getElementById('pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Independent-Samples T-Test Problem Generator ── */

export function generateIndTTestProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'independent_t_test') return;

  const stats = statsDict(state.lastResult.results);

  const variable = (document.getElementById('pg-variable') as HTMLInputElement).value.trim() || 'the variable of interest';
  const group1   = (document.getElementById('pg-group1')   as HTMLInputElement).value.trim() || 'Group 1';
  const group2   = (document.getElementById('pg-group2')   as HTMLInputElement).value.trim() || 'Group 2';
  const unit     = (document.getElementById('pg-unit')     as HTMLInputElement).value.trim() || 'units';

  const n1       = stats['N1'];
  const m1       = stats['Sample Mean1'];
  const sd1      = stats['Sample SD1'];
  const ss1      = stats['Sum of Squares1'];
  const df1      = stats['df1'];
  const n2       = stats['N2'];
  const m2       = stats['Sample Mean2'];
  const sd2      = stats['Sample SD2'];
  const ss2      = stats['Sum of Squares2'];
  const df2      = stats['df2'];
  const pooledVar = stats['Sum Of Product'];
  const se       = stats['Standard Error'];
  const tScore   = stats['t Score'];
  const tCrit    = stats['t_Critical'];
  const cohenD   = stats["Cohen's d"];
  const rSq      = stats['R-Squared'];
  const decision = stats['Decision'];
  const ciUp     = stats['95% CI Upper'];
  const ciLo     = stats['95% CI Lower'];
  const df       = Number(df1) + Number(df2);

  const alpha     = state.lastIndTTestContext?.alpha     ?? 0.05;
  const twoTailed = state.lastIndTTestContext?.twoTailed ?? true;
  const tailLabel = twoTailed ? 'two-tailed' : 'one-tailed';
  const pval      = tPValue(parseFloat(String(tScore)), df, twoTailed);
  const pvalNum   = pval.startsWith('<') ? 0.0001 : parseFloat(pval);
  const pCompare  = pvalNum < alpha ? '< α' : '> α';
  const rSqPct    = (parseFloat(String(rSq)) * 100).toFixed(1);

  /* Direction for hypotheses */
  const h1op = twoTailed ? '≠' : (parseFloat(String(m1)) >= parseFloat(String(m2)) ? '>' : '<');
  const h0op = twoTailed ? '=' : (h1op === '>' ? '≤' : '≥');

  /* Natural-language test phrase */
  const testPhraseHTML = twoTailed
    ? `differ in mean ${variable}`
    : (h1op === '>'
        ? `the mean ${variable} in <strong>${group1}</strong> is significantly greater than in <strong>${group2}</strong>`
        : `the mean ${variable} in <strong>${group1}</strong> is significantly less than in <strong>${group2}</strong>`);
  const testPhrasePlain = twoTailed
    ? `differ in mean ${variable}`
    : (h1op === '>'
        ? `the mean ${variable} in ${group1} is significantly greater than in ${group2}`
        : `the mean ${variable} in ${group1} is significantly less than in ${group2}`);

  /* Effect size focus */
  const esType = resolveEffectSizeType();
  const esQ3 = esType === 'cohen_d'   ? `Determine the <em>p</em>-value and compute Cohen's <em>d</em>.`
             : esType === 'r_squared' ? `Determine the <em>p</em>-value and compute <em>r</em>&sup2;.`
             :                         `Determine the <em>p</em>-value and compute the ${(1 - alpha) * 100 | 0}% confidence interval for μ₁ − μ₂.`;

  /* Student problem text */
  const problemHTMLWithEs = `
<div class="problem-box">
  <p>A researcher is studying <strong>${variable}</strong> in two groups:
  <strong>${group1}</strong> and <strong>${group2}</strong>.</p>
  <p>The sample statistics are:</p>
  <ul>
    <li><strong>${group1}:</strong> <em>n</em>&nbsp;=&nbsp;${n1}, <em>M</em>&nbsp;=&nbsp;${m1}&nbsp;${unit}, <em>s</em>&nbsp;=&nbsp;${sd1}&nbsp;${unit}</li>
    <li><strong>${group2}:</strong> <em>n</em>&nbsp;=&nbsp;${n2}, <em>M</em>&nbsp;=&nbsp;${m2}&nbsp;${unit}, <em>s</em>&nbsp;=&nbsp;${sd2}&nbsp;${unit}</li>
  </ul>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether ${group1} and ${group2}
  ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>t</em> statistic.</li>
      <li>${esQ3}</li>
      <li>State your decision.</li>
      <li>Interpret the result in context.</li>
    </ol>
  </div>
</div>`;

  /* Instructor key */
  const h0    = `H₀: μ₁ ${h0op} μ₂`;
  const h1    = `H₁: μ₁ ${h1op} μ₂`;
  const isRej = decision === 'Reject Null';
  const interp = isRej
    ? `There is sufficient evidence at α = ${alpha} to conclude that ${group1} and ${group2}
       ${testPhrasePlain}
       (t(${df}) = ${tScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`
    : `There is insufficient evidence at α = ${alpha} to conclude that ${group1} and ${group2}
       ${testPhrasePlain}
       (t(${df}) = ${tScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`;

  const esKey3Ind = esType === 'cohen_d'
    ? `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>Cohen's d = (M₁ &minus; M₂) / s<sub>p</sub> = ${cohenD}</p>`
    : esType === 'r_squared'
    ? `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>r&sup2; = t&sup2;&nbsp;/&nbsp;(t&sup2;&nbsp;+&nbsp;df) = ${parseFloat(String(rSq)).toFixed(3)} (${rSqPct}% of variance explained)</p>`
    : `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>${(1 - alpha) * 100 | 0}% CI for (μ₁ − μ₂): [${ciLo},&nbsp;${ciUp}]&nbsp;${unit}</p>`;

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Hypotheses</strong>
    <p>${h0}</p>
    <p>${h1}</p>
  </div>

  <div class="key-section">
    <strong>2. T Statistic</strong>
    <div class="key-formula">
      Pooled variance: s²<sub>p</sub> = (SS₁ + SS₂) / df = (${ss1} + ${ss2}) / ${df} = ${pooledVar}<br>
      SE = &radic;(s²<sub>p</sub> &times; (1/n₁ + 1/n₂)) = ${se}<br>
      t = (M₁ &minus; M₂) / SE = (${m1} &minus; ${m2}) / ${se} = ${tScore}
    </div>
    <p>df = (n₁ &minus; 1) + (n₂ &minus; 1) = ${df1} + ${df2} = ${df}</p>
    <p>Critical value: t<sub>crit</sub> = &plusmn;${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    ${esKey3Ind}
  </div>

  <div class="key-section">
    <strong>4. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${interp}</p>
  </div>
</div>`;

  state.lastProblemData = {
    testType: 'independent_t_test',
    esType,
    variable, group1, group2, unit,
    n1: n1 ?? '', m1: m1 ?? '', sd1: sd1 ?? '', ss1: ss1 ?? '', df1: df1 ?? '',
    n2: n2 ?? '', m2: m2 ?? '', sd2: sd2 ?? '', ss2: ss2 ?? '', df2: df2 ?? '',
    df, pooledVar: pooledVar ?? '', se: se ?? '',
    tScore: tScore ?? '', tCrit: tCrit ?? '', cohenD: cohenD ?? '',
    rSq: rSq ?? '', rSqPct, decision: decision ?? null, ciUp: ciUp ?? '', ciLo: ciLo ?? '',
    alpha, twoTailed, tailLabel, pval, pCompare,
    h0, h1, isRej, testPhrasePlain,
    interp: interp.replace(/\s+/g, ' ').trim(),
  };

  (document.getElementById('pg-problem-text') as HTMLElement).innerHTML   = problemHTMLWithEs;
  (document.getElementById('pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('pg-output') as HTMLElement).style.display     = 'block';

  /* Reset key toggle whenever problem is regenerated */
  (document.getElementById('pg-show-key') as HTMLInputElement).checked              = false;
  (document.getElementById('pg-instructor-key') as HTMLElement).style.display       = 'none';

  (document.getElementById('pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Repeated-Measures T-Test Problem Generator ── */

export function generateRmTTestProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'repeated_t_test') return;

  const stats = statsDict(state.lastResult.results);

  const variable = (document.getElementById('pg-variable') as HTMLInputElement).value.trim() || 'the variable of interest';
  const pre      = (document.getElementById('pg-pre')      as HTMLInputElement).value.trim() || 'Pre-Test';
  const post     = (document.getElementById('pg-post')     as HTMLInputElement).value.trim() || 'Post-Test';
  const unit     = (document.getElementById('pg-unit')     as HTMLInputElement).value.trim() || 'units';

  const n        = stats['N'];
  const sdDiff   = stats['Differences SD'];
  const meanDiff = stats['Differences Mean'];
  const se       = stats['Standard Error'];
  const tScore   = stats['t Score'];
  const tCrit    = stats['t_Critical'];
  const cohenD   = stats["Cohen's d"];
  const rSq      = stats['R-Squared'];
  const decision = stats['Decision'];
  const ciUp     = stats['95% CI Upper'];
  const ciLo     = stats['95% CI Lower'];
  const df       = Number(n) - 1;

  const alpha     = state.lastRmTTestContext?.alpha     ?? 0.05;
  const twoTailed = state.lastRmTTestContext?.twoTailed ?? true;
  const tailLabel = twoTailed ? 'two-tailed' : 'one-tailed';
  const pval      = tPValue(parseFloat(String(tScore)), df, twoTailed);
  const pvalNum   = pval.startsWith('<') ? 0.0001 : parseFloat(pval);
  const pCompare  = pvalNum < alpha ? '< α' : '> α';
  const rSqPct    = (parseFloat(String(rSq)) * 100).toFixed(1);

  /* Direction — differences = pre − post, so positive meanDiff means pre > post */
  const h1op = twoTailed ? '≠' : (parseFloat(String(meanDiff)) >= 0 ? '>' : '<');
  const h0op = twoTailed ? '=' : (h1op === '>' ? '≤' : '≥');

  const testPhraseHTML = twoTailed
    ? `a significant mean difference between the <strong>${pre}</strong> and <strong>${post}</strong> conditions`
    : (h1op === '>'
        ? `<strong>${variable}</strong> scores were significantly higher at <strong>${pre}</strong> than at <strong>${post}</strong>`
        : `<strong>${variable}</strong> scores significantly increased from <strong>${pre}</strong> to <strong>${post}</strong>`);
  const testPhrasePlain = twoTailed
    ? `a significant mean difference between the ${pre} and ${post} conditions`
    : (h1op === '>'
        ? `${variable} scores were significantly higher at ${pre} than at ${post}`
        : `${variable} scores significantly increased from ${pre} to ${post}`);

  /* Effect size focus */
  const esType = resolveEffectSizeType();
  const esQ3 = esType === 'cohen_d'   ? `Determine the <em>p</em>-value and compute Cohen's <em>d</em>.`
             : esType === 'r_squared' ? `Determine the <em>p</em>-value and compute <em>r</em>&sup2;.`
             :                         `Determine the <em>p</em>-value and compute the ${(1 - alpha) * 100 | 0}% confidence interval for μ<sub>D</sub>.`;

  /* Student problem text */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher measures <strong>${variable}</strong> in <em>n</em>&nbsp;=&nbsp;${n} participants
  at <strong>${pre}</strong> and again at <strong>${post}</strong>.</p>
  <p>The difference scores (<em>${pre} &minus; ${post}</em>) have a mean of
  <em>M</em><sub>D</sub>&nbsp;=&nbsp;${meanDiff}&nbsp;${unit}
  and a standard deviation of <em>s</em><sub>D</sub>&nbsp;=&nbsp;${sdDiff}&nbsp;${unit}.</p>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether there is ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>t</em> statistic.</li>
      <li>${esQ3}</li>
      <li>State your decision.</li>
      <li>Interpret the result in context.</li>
    </ol>
  </div>
</div>`;

  /* Instructor key */
  const h0    = `H₀: μ_D ${h0op} 0`;
  const h1    = `H₁: μ_D ${h1op} 0`;
  const isRej = decision === 'Reject Null';
  const interp = isRej
    ? `There is sufficient evidence at α = ${alpha} to conclude that there is ${testPhrasePlain}
       (t(${df}) = ${tScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`
    : `There is insufficient evidence at α = ${alpha} to conclude that there is ${testPhrasePlain}
       (t(${df}) = ${tScore}, p ${pval.startsWith('<') ? pval : '= ' + pval}, d = ${cohenD}).`;

  const esKey3Rm = esType === 'cohen_d'
    ? `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>Cohen's d = M<sub>D</sub> / s<sub>D</sub> = ${meanDiff} / ${sdDiff} = ${cohenD}</p>`
    : esType === 'r_squared'
    ? `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>r&sup2; = t&sup2;&nbsp;/&nbsp;(t&sup2;&nbsp;+&nbsp;df) = ${parseFloat(String(rSq)).toFixed(3)} (${rSqPct}% of variance explained)</p>`
    : `<p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
       <p>${(1 - alpha) * 100 | 0}% CI for μ<sub>D</sub>: [${ciLo},&nbsp;${ciUp}]&nbsp;${unit}</p>`;

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Hypotheses</strong>
    <p>${h0}</p>
    <p>${h1}</p>
  </div>

  <div class="key-section">
    <strong>2. T Statistic</strong>
    <div class="key-formula">
      t = M<sub>D</sub> / (s<sub>D</sub> / &radic;n)<br>
      t = ${meanDiff} / (${sdDiff} / &radic;${n})<br>
      t = ${meanDiff} / ${se}<br>
      t = ${tScore}
    </div>
    <p>df = n &minus; 1 = ${n} &minus; 1 = ${df}</p>
    <p>Critical value: t<sub>crit</sub> = &plusmn;${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    ${esKey3Rm}
  </div>

  <div class="key-section">
    <strong>4. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${interp}</p>
  </div>
</div>`;

  state.lastProblemData = {
    testType: 'repeated_t_test',
    esType,
    variable, pre, post, unit,
    n: n ?? '', sdDiff: sdDiff ?? '', meanDiff: meanDiff ?? '', se: se ?? '',
    tScore: tScore ?? '', tCrit: tCrit ?? '', df, cohenD: cohenD ?? '',
    rSq: rSq ?? '', rSqPct, decision: decision ?? null, ciUp: ciUp ?? '', ciLo: ciLo ?? '',
    alpha, twoTailed, tailLabel, pval, pCompare,
    h0, h1, isRej, testPhrasePlain,
    interp: interp.replace(/\s+/g, ' ').trim(),
  };

  (document.getElementById('pg-problem-text') as HTMLElement).innerHTML   = problemHTML;
  (document.getElementById('pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('pg-output') as HTMLElement).style.display     = 'block';

  /* Reset key toggle whenever problem is regenerated */
  (document.getElementById('pg-show-key') as HTMLInputElement).checked              = false;
  (document.getElementById('pg-instructor-key') as HTMLElement).style.display       = 'none';

  (document.getElementById('pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Dispatcher ── */

export function generateStudentProblem(): void {
  if (!state.lastResult) return;
  if (state.lastResult.type === 'z_test')                  generateZTestProblem();
  else if (state.lastResult.type === 't_test')             generateTTestProblem();
  else if (state.lastResult.type === 'independent_t_test') generateIndTTestProblem();
  else if (state.lastResult.type === 'repeated_t_test')    generateRmTTestProblem();
}

/* ── Key toggle ── */

export function toggleInstructorKey(): void {
  const show = (document.getElementById('pg-show-key') as HTMLInputElement).checked;
  (document.getElementById('pg-instructor-key') as HTMLElement).style.display = show ? 'block' : 'none';
}

/* ── Excel export ── */

export function downloadProblemExcel(): void {
  const d = state.lastProblemData;
  if (!d) return;

  const pvalStr = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
  const decStr  = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';

  let rows: (string | number | null | undefined)[][];
  let sheetName: string;
  let fileName: string;

  if (d.testType === 'z_test') {
    const narrative =
      `A researcher is studying ${d.variable} in ${d.pop}. ` +
      `Historically, the population mean is μ = ${d.mu0} ${d.unit}, ` +
      `with a known population standard deviation of σ = ${d.sigma} ${d.unit}. ` +
      `The researcher collects a random sample of n = ${d.n} participants ` +
      `and obtains a sample mean of M = ${d.xbar} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether the population mean ` +
      `${d.testPhrasePlain}.`;
    const cohenFml = `(M − μ) / σ = (${d.xbar} − ${d.mu0}) / ${d.sigma} = ${d.cohenD}`;
    rows = [
      ['STUDENT PROBLEM — One-Sample Z-Test'],
      [],
      ['Scenario'], [narrative], [],
      ['Questions'],
      ['1.', 'State the null and alternative hypotheses.'],
      ['2.', 'Compute the z statistic.'],
      ['3.', "Determine the p-value and compute Cohen's d."],
      ['4.', 'State your decision.'],
      ['5.', 'Interpret the result in context.'],
      [], [],
      ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
      [],
      ['1. Hypotheses'], ['H₀:', d.h0], ['H₁:', d.h1],
      [],
      ['2. Z Statistic'],
      ['Formula:',       'z = (M − μ) / (σ / √n)'],
      ['Substitution:',  `z = (${d.xbar} − ${d.mu0}) / (${d.sigma} / √${d.n})`],
      ['Simplify:',      `z = (${d.xbar} − ${d.mu0}) / ${d.se}`],
      ['Result:',        `z = ${d.zScore}`],
      ['Critical value:', `z_crit = ±${d.zCrit}  (α = ${d.alpha}, ${d.tailLabel})`],
      [],
      ['3. p-value & Effect Size'],
      ['p-value:',   `p ${pvalStr}  →  p ${d.pCompare}`],
      ["Cohen's d:", cohenFml],
      [],
      ['4. Decision'], ['', decStr],
      [],
      ['5. Interpretation'], [d.interp],
      ['95% CI:', `[${d.ciLo}, ${d.ciUp}] ${d.unit}`],
    ];
    sheetName = 'Z-Test Problem';
    fileName  = `statteacher_zproblem_${Date.now()}.xlsx`;

  } else if (d.testType === 't_test') {
    const narrative =
      `A researcher is studying ${d.variable} in ${d.pop}. ` +
      `The null hypothesis posits a population mean of μ₀ = ${d.mu0} ${d.unit} (population SD is unknown). ` +
      `The researcher collects a random sample of n = ${d.n} participants ` +
      `and obtains a sample mean of M = ${d.xbar} ${d.unit}, ` +
      `with a sample standard deviation of s = ${d.sampleSD} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether the population mean ` +
      `${d.testPhrasePlain}.`;
    const cohenFml = `(M − μ₀) / s = (${d.xbar} − ${d.mu0}) / ${d.sampleSD} = ${d.cohenD}`;
    const rSqStr   = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;
    rows = [
      ['STUDENT PROBLEM — One-Sample T-Test'],
      [],
      ['Scenario'], [narrative], [],
      ['Questions'],
      ['1.', 'State the null and alternative hypotheses.'],
      ['2.', 'Compute the t statistic.'],
      ['3.', "Determine the p-value and compute Cohen's d."],
      ['4.', 'State your decision.'],
      ['5.', 'Interpret the result in context.'],
      [], [],
      ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
      [],
      ['1. Hypotheses'], ['H₀:', d.h0], ['H₁:', d.h1],
      [],
      ['2. T Statistic'],
      ['Formula:',       't = (M − μ₀) / (s / √n)'],
      ['Substitution:',  `t = (${d.xbar} − ${d.mu0}) / (${d.sampleSD} / √${d.n})`],
      ['Simplify:',      `t = (${d.xbar} − ${d.mu0}) / ${d.se}`],
      ['Result:',        `t = ${d.tScore}`],
      ['df:',            `n − 1 = ${d.n} − 1 = ${d.df}`],
      ['Critical value:', `t_crit = ±${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, ${d.tailLabel})`],
      [],
      ['3. p-value & Effect Size'],
      ['p-value:',   `p ${pvalStr}  →  p ${d.pCompare}`],
      ["Cohen's d:", cohenFml],
      ['r²:',        rSqStr],
      [],
      ['4. Decision'], ['', decStr],
      [],
      ['5. Interpretation'], [d.interp],
      ['95% CI:', `[${d.ciLo}, ${d.ciUp}] ${d.unit}`],
    ];
    sheetName = 'T-Test Problem';
    fileName  = `statteacher_tproblem_${Date.now()}.xlsx`;

  } else if (d.testType === 'independent_t_test') {
    const narrative =
      `A researcher is studying ${d.variable} in two groups: ${d.group1} and ${d.group2}. ` +
      `The sample statistics are: ` +
      `${d.group1}: n = ${d.n1}, M = ${d.m1} ${d.unit}, s = ${d.sd1} ${d.unit}; ` +
      `${d.group2}: n = ${d.n2}, M = ${d.m2} ${d.unit}, s = ${d.sd2} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether ${d.group1} and ${d.group2} ` +
      `${d.testPhrasePlain}.`;
    const rSqStr = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;
    rows = [
      ['STUDENT PROBLEM — Independent-Samples T-Test'],
      [],
      ['Scenario'], [narrative], [],
      ['Questions'],
      ['1.', 'State the null and alternative hypotheses.'],
      ['2.', 'Compute the test statistic.'],
      ['3.', "Determine the p-value and compute Cohen's d."],
      ['4.', 'State your decision.'],
      ['5.', 'Interpret the result in context.'],
      [], [],
      ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
      [],
      ['1. Hypotheses'], ['H₀:', d.h0], ['H₁:', d.h1],
      [],
      ['2. T Statistic'],
      ['Pooled variance:', `s²p = (SS₁ + SS₂) / df = (${d.ss1} + ${d.ss2}) / ${d.df} = ${d.pooledVar}`],
      ['SE:',             `√(s²p × (1/n₁ + 1/n₂)) = ${d.se}`],
      ['Formula:',        't = (M₁ − M₂) / SE'],
      ['Result:',         `t = (${d.m1} − ${d.m2}) / ${d.se} = ${d.tScore}`],
      ['df:',             `(n₁ − 1) + (n₂ − 1) = ${d.df1} + ${d.df2} = ${d.df}`],
      ['Critical value:',  `t_crit = ±${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, ${d.tailLabel})`],
      [],
      ['3. p-value & Effect Size'],
      ['p-value:',   `p ${pvalStr}  →  p ${d.pCompare}`],
      ["Cohen's d:", `${d.cohenD}`],
      ['r²:',        rSqStr],
      [],
      ['4. Decision'], ['', decStr],
      [],
      ['5. Interpretation'], [d.interp],
      ['95% CI for (μ₁ − μ₂):', `[${d.ciLo}, ${d.ciUp}] ${d.unit}`],
    ];
    sheetName = 'Ind T-Test Problem';
    fileName  = `statteacher_ind_tproblem_${Date.now()}.xlsx`;

  } else {
    // repeated_t_test
    const narrative =
      `A researcher measures ${d.variable} in n = ${d.n} participants at ${d.pre} and again at ${d.post}. ` +
      `The difference scores (${d.pre} − ${d.post}) have a mean of M_D = ${d.meanDiff} ${d.unit} ` +
      `and a standard deviation of s_D = ${d.sdDiff} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether there is ${d.testPhrasePlain}.`;
    const rSqStr = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;

    /* Include raw pre/post datasets side-by-side at the top of the sheet */
    const rawResult = (state.lastResult && state.lastResult.type === 'repeated_t_test')
      ? state.lastResult as { pre: number[]; post: number[] }
      : null;
    const dataRows: (string | number)[][] = rawResult ? [
      ['ID', `${d.pre} Score`, `${d.post} Score`],
      ...rawResult.pre.map((v, i) => [i + 1, v, rawResult.post[i]] as [number, number, number]),
      [],
    ] : [];

    rows = [
      ...dataRows,
      ['STUDENT PROBLEM — Repeated-Measures T-Test'],
      [],
      ['Scenario'], [narrative], [],
      ['Questions'],
      ['1.', 'State the null and alternative hypotheses.'],
      ['2.', 'Compute the t statistic.'],
      ['3.', "Determine the p-value and compute Cohen's d."],
      ['4.', 'State your decision.'],
      ['5.', 'Interpret the result in context.'],
      [], [],
      ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
      [],
      ['1. Hypotheses'], ['H₀:', d.h0], ['H₁:', d.h1],
      [],
      ['2. T Statistic'],
      ['Formula:',       't = M_D / (s_D / √n)'],
      ['Substitution:',  `t = ${d.meanDiff} / (${d.sdDiff} / √${d.n})`],
      ['Simplify:',      `t = ${d.meanDiff} / ${d.se}`],
      ['Result:',        `t = ${d.tScore}`],
      ['df:',            `n − 1 = ${d.n} − 1 = ${d.df}`],
      ['Critical value:', `t_crit = ±${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, ${d.tailLabel})`],
      [],
      ['3. p-value & Effect Size'],
      ['p-value:',   `p ${pvalStr}  →  p ${d.pCompare}`],
      ["Cohen's d:", `M_D / s_D = ${d.meanDiff} / ${d.sdDiff} = ${d.cohenD}`],
      ['r²:',        rSqStr],
      [],
      ['4. Decision'], ['', decStr],
      [],
      ['5. Interpretation'], [d.interp],
      ['95% CI for μ_D:', `[${d.ciLo}, ${d.ciUp}] ${d.unit}`],
    ];
    sheetName = 'RM T-Test Problem';
    fileName  = `statteacher_rm_tproblem_${Date.now()}.xlsx`;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 90 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

/* ════════════════════════════════════════════════════════════
   ANOVA TABLE PRACTICE PROBLEM
   ════════════════════════════════════════════════════════════ */

/* ── Build a typed full-table object from the engine's TableRow array ── */

function buildFullANOVATable(table: TableRow[], alpha: number): AnovaFullTable | null {
  const factorRow = table.find(r => r['Source'] !== 'Within' && r['Source'] !== 'Total' && r['Source'] !== 'Between');
  const withinRow = table.find(r => r['Source'] === 'Within');
  const totalRow  = table.find(r => r['Source'] === 'Total');
  if (!factorRow || !withinRow || !totalRow) return null;

  const ssBetween = Number(factorRow['SS']);
  const dfBetween = Number(factorRow['df']);
  const msBetween = Number(factorRow['MS']);
  const fStat     = Number(factorRow['F']);
  const pValue    = Number(factorRow['p-value']);

  const ssWithin  = Number(withinRow['SS']);
  const dfWithin  = Number(withinRow['df']);
  /* MS_within is provided by engine; fall back to SS/df if null */
  const msWithin  = withinRow['MS'] != null ? Number(withinRow['MS']) : ssWithin / dfWithin;

  const ssTotal   = Number(totalRow['SS']);
  const dfTotal   = Number(totalRow['df']);

  return {
    factorName: String(factorRow['Source']),
    ssBetween, dfBetween, msBetween, fStat, pValue,
    ssWithin, dfWithin, msWithin,
    ssTotal, dfTotal,
    k: dfBetween + 1,
    N: dfTotal + 1,
    alpha,
  };
}

/* ── Masking logic — returns answer-key list and a Set of "row:col" keys ── */

function maskANOVATable(
  full: AnovaFullTable,
  difficulty: AnovaDifficulty,
): { missing: AnovaMissingCell[]; masked: Set<string> } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const { ssBetween, dfBetween, msBetween, fStat, ssWithin, dfWithin, msWithin, ssTotal, dfTotal, k, N } = full;

  let missing: AnovaMissingCell[] = [];

  if (difficulty === 'easy') {
    /* Show: SS_between, SS_within, df_between, df_within, SS_total, df_total
       Hide: MS_between, MS_within, F */
    missing = [
      { row: 'between', col: 'MS', value: r2(msBetween), formula: `MS_between = SS_between / df_between = ${r2(ssBetween)} / ${dfBetween} = ${r2(msBetween)}` },
      { row: 'within',  col: 'MS', value: r2(msWithin),  formula: `MS_within  = SS_within / df_within = ${r2(ssWithin)} / ${dfWithin} = ${r2(msWithin)}` },
      { row: 'between', col: 'F',  value: r2(fStat),     formula: `F = MS_between / MS_within = ${r2(msBetween)} / ${r2(msWithin)} = ${r2(fStat)}` },
    ];
  } else if (difficulty === 'moderate') {
    /* Show: SS_between, SS_total, df_total, MS_within
       Hide: df_between, df_within, SS_within, MS_between, F */
    missing = [
      { row: 'between', col: 'df', value: dfBetween,    formula: `df_between = k − 1 = ${k} − 1 = ${dfBetween}` },
      { row: 'within',  col: 'df', value: dfWithin,     formula: `df_within  = N − k = ${N} − ${k} = ${dfWithin}` },
      { row: 'within',  col: 'SS', value: r2(ssWithin), formula: `SS_within  = SS_total − SS_between = ${r2(ssTotal)} − ${r2(ssBetween)} = ${r2(ssWithin)}` },
      { row: 'between', col: 'MS', value: r2(msBetween),formula: `MS_between = SS_between / df_between = ${r2(ssBetween)} / ${dfBetween} = ${r2(msBetween)}` },
      { row: 'between', col: 'F',  value: r2(fStat),    formula: `F = MS_between / MS_within = ${r2(msBetween)} / ${r2(msWithin)} = ${r2(fStat)}` },
    ];
  } else {
    /* difficulty === 'hard'
       Show: df_between, df_within, MS_between, F
       Hide: MS_within, SS_between, SS_within, SS_total, df_total */
    missing = [
      { row: 'within',  col: 'MS',  value: r2(msWithin),  formula: `MS_within  = MS_between / F = ${r2(msBetween)} / ${r2(fStat)} = ${r2(msWithin)}` },
      { row: 'between', col: 'SS',  value: r2(ssBetween), formula: `SS_between = MS_between × df_between = ${r2(msBetween)} × ${dfBetween} = ${r2(ssBetween)}` },
      { row: 'within',  col: 'SS',  value: r2(ssWithin),  formula: `SS_within  = MS_within × df_within = ${r2(msWithin)} × ${dfWithin} = ${r2(ssWithin)}` },
      { row: 'total',   col: 'SS',  value: r2(ssTotal),   formula: `SS_total   = SS_between + SS_within = ${r2(ssBetween)} + ${r2(ssWithin)} = ${r2(ssTotal)}` },
      { row: 'total',   col: 'df',  value: dfTotal,        formula: `df_total   = df_between + df_within = ${dfBetween} + ${dfWithin} = ${dfTotal}` },
    ];
  }

  const masked = new Set(missing.map(c => `${c.row}:${c.col}`));
  return { missing, masked };
}

/* ── Render the student-facing ANOVA table with blanked cells ── */

function renderAnovaStudentTable(full: AnovaFullTable, masked: Set<string>): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;

  function cell(row: string, col: string, value: number | null): string {
    if (masked.has(`${row}:${col}`)) return `<td style="text-align:center;font-weight:700;font-size:1.1rem;">?</td>`;
    if (value === null)               return `<td style="text-align:center;color:var(--muted);">—</td>`;
    return `<td>${r2(value)}</td>`;
  }

  return `
<div class="tbl-wrap" style="margin-top:1rem;">
  <table class="stat-table">
    <thead>
      <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Between</td>
        ${cell('between','SS', full.ssBetween)}
        ${cell('between','df', full.dfBetween)}
        ${cell('between','MS', full.msBetween)}
        ${cell('between','F',  full.fStat)}
      </tr>
      <tr>
        <td>Within</td>
        ${cell('within','SS', full.ssWithin)}
        ${cell('within','df', full.dfWithin)}
        ${cell('within','MS', full.msWithin)}
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
      <tr>
        <td>Total</td>
        ${cell('total','SS', full.ssTotal)}
        ${cell('total','df', full.dfTotal)}
        <td style="text-align:center;color:var(--muted);">—</td>
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
    </tbody>
  </table>
</div>`;
}

/* ── Render the full (completed) ANOVA table for the instructor key ── */

function renderAnovaFullTable(full: AnovaFullTable): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return `
<div class="tbl-wrap" style="margin-top:0.5rem;">
  <table class="stat-table">
    <thead>
      <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Between</td>
        <td>${r2(full.ssBetween)}</td><td>${full.dfBetween}</td>
        <td>${r2(full.msBetween)}</td><td>${r2(full.fStat)}</td>
      </tr>
      <tr>
        <td>Within</td>
        <td>${r2(full.ssWithin)}</td><td>${full.dfWithin}</td>
        <td>${r2(full.msWithin)}</td>
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
      <tr>
        <td>Total</td>
        <td>${r2(full.ssTotal)}</td><td>${full.dfTotal}</td>
        <td style="text-align:center;color:var(--muted);">—</td>
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
    </tbody>
  </table>
</div>`;
}

/* ── Format p-value for display ── */

function fmtP(p: number): string {
  if (p < 0.001) return '< .001';
  return '= ' + p.toFixed(3).replace(/^0\./, '.');
}

/* ── Main ANOVA Practice Problem Generator ── */

export function generateANOVAProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'anova') return;
  /* One-way guard */
  if (state.lastResult.table.length === 0 || state.lastResult.table[0]['Source'] === 'Between') return;

  const variable   = (document.getElementById('ap-variable')   as HTMLInputElement).value.trim() || 'the outcome variable';
  const difficulty = (document.getElementById('ap-difficulty') as HTMLSelectElement).value as AnovaDifficulty;
  const alpha      = parseFloat(gv('anova-alpha'));

  const full = buildFullANOVATable(state.lastResult.table, alpha);
  if (!full) return;

  const { missing, masked } = maskANOVATable(full, difficulty);

  /* Student prompt */
  const studentPrompt =
    `A researcher conducted a one-way ANOVA to test whether mean ${variable} differs across ` +
    `${full.k} independent groups (N = ${full.N}). ` +
    `The partially completed ANOVA summary table is shown below. ` +
    `Fill in the missing values (marked "?") and determine whether the result is significant at α = ${alpha}.`;

  /* p-value string */
  const pStr = fmtP(full.pValue);
  const r2   = (n: number) => Math.round(n * 100) / 100;

  /* Decision */
  const isRej = full.pValue < alpha;
  const decisionStatement = isRej
    ? `Reject H₀: there is sufficient evidence that mean ${variable} differs across the ${full.k} groups ` +
      `(F(${full.dfBetween}, ${full.dfWithin}) = ${r2(full.fStat)}, p ${pStr}).`
    : `Fail to reject H₀: there is insufficient evidence that mean ${variable} differs across the ${full.k} groups ` +
      `(F(${full.dfBetween}, ${full.dfWithin}) = ${r2(full.fStat)}, p ${pStr}).`;

  /* Student table HTML */
  const studentTableHTML = renderAnovaStudentTable(full, masked);

  /* Problem box */
  const problemHTML = `
<div class="problem-box">
  <p>${studentPrompt}</p>
  ${studentTableHTML}
  <div class="problem-questions" style="margin-top:1rem;">
    <ol>
      <li>Fill in all missing values (marked "?") in the ANOVA table above.</li>
      <li>State the null and alternative hypotheses.</li>
      <li>Determine whether the result is statistically significant at α = ${alpha}.</li>
      <li>Write a one-sentence interpretation of the finding.</li>
    </ol>
  </div>
</div>`;

  /* Instructor key */
  const missingListHTML = missing.map((c, i) =>
    `<li style="margin-bottom:0.3rem;"><code>${c.formula}</code></li>`
  ).join('');

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Completed ANOVA Table</strong>
    ${renderAnovaFullTable(full)}
  </div>

  <div class="key-section">
    <strong>2. Missing Values (step-by-step)</strong>
    <ol style="margin:0.5rem 0 0 1.2rem;padding:0;">
      ${missingListHTML}
    </ol>
  </div>

  <div class="key-section">
    <strong>3. Hypotheses</strong>
    <p>H₀: μ₁ = μ₂ = … = μ<sub>${full.k}</sub> (all group means are equal)</p>
    <p>H₁: At least one group mean differs from the others</p>
  </div>

  <div class="key-section">
    <strong>4. Decision (α = ${alpha})</strong>
    <p>F(${full.dfBetween}, ${full.dfWithin}) = ${r2(full.fStat)}, p ${pStr}</p>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${decisionStatement}</p>
  </div>
</div>`;

  state.lastAnovaPracticeData = {
    full, difficulty, variable, missingCells: missing,
    studentPrompt, decisionStatement,
  };

  (document.getElementById('ap-problem-text') as HTMLElement).innerHTML   = problemHTML;
  (document.getElementById('ap-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('ap-output') as HTMLElement).style.display     = 'block';

  /* Reset key toggle */
  (document.getElementById('ap-show-key') as HTMLInputElement).checked            = false;
  (document.getElementById('ap-instructor-key') as HTMLElement).style.display     = 'none';

  (document.getElementById('ap-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── ANOVA instructor key toggle ── */

export function toggleAnovaKey(): void {
  const show = (document.getElementById('ap-show-key') as HTMLInputElement).checked;
  (document.getElementById('ap-instructor-key') as HTMLElement).style.display = show ? 'block' : 'none';
}

/* ── ANOVA Practice Excel export ── */

export function downloadAnovaPracticeExcel(): void {
  const d = state.lastAnovaPracticeData;
  if (!d) return;

  const { full, missingCells, studentPrompt, decisionStatement, difficulty, variable } = d;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pStr = fmtP(full.pValue);

  /* Build masked table values for the student sheet */
  const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
  const mc = (row: string, col: string, val: number | null) =>
    masked.has(`${row}:${col}`) ? '?' : val !== null ? r2(val) : '—';

  const rows: (string | number | null)[][] = [
    ['STUDENT PROBLEM — One-Way ANOVA Table Practice'],
    [],
    ['Scenario'], [studentPrompt], [],
    ['Questions'],
    ['1.', 'Fill in all missing values (marked "?") in the ANOVA table below.'],
    ['2.', 'State the null and alternative hypotheses.'],
    ['3.', `Determine whether the result is statistically significant at α = ${full.alpha}.`],
    ['4.', 'Write a one-sentence interpretation of the finding.'],
    [],
    ['ANOVA Table (Student Version)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Between', mc('between','SS',full.ssBetween), mc('between','df',full.dfBetween), mc('between','MS',full.msBetween), mc('between','F',full.fStat)],
    ['Within',  mc('within','SS',full.ssWithin),   mc('within','df',full.dfWithin),   mc('within','MS',full.msWithin),   '—'],
    ['Total',   mc('total','SS',full.ssTotal),      mc('total','df',full.dfTotal),     '—', '—'],
    [],
    [],
    ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
    [],
    ['ANOVA Table (Completed)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Between', r2(full.ssBetween), full.dfBetween, r2(full.msBetween), r2(full.fStat)],
    ['Within',  r2(full.ssWithin),  full.dfWithin,  r2(full.msWithin),  '—'],
    ['Total',   r2(full.ssTotal),   full.dfTotal,   '—', '—'],
    [],
    ['Missing Values (step-by-step)'],
    ...missingCells.map((c, i) => [`${i + 1}.`, c.formula]),
    [],
    ['Hypotheses'],
    ['H₀:', `μ₁ = μ₂ = … = μ${full.k}  (all group means are equal)`],
    ['H₁:', 'At least one group mean differs from the others'],
    [],
    ['Decision'],
    [`F(${full.dfBetween}, ${full.dfWithin}) = ${r2(full.fStat)}, p ${pStr}`],
    [decisionStatement],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 85 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ANOVA Practice');
  XLSX.writeFile(wb, `statteacher_anova_practice_${Date.now()}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   TWO-WAY ANOVA TABLE PRACTICE PROBLEM
   ════════════════════════════════════════════════════════════ */

/* ── Build a typed full-table object from the engine's two-way TableRow array ── */

function buildFullANOVATableTwoWay(table: TableRow[], alpha: number): TwoWayAnovaFullTable | null {
  /* Factor rows = rows that are not Between / Interaction / Within / Total */
  const factorRows = table.filter(
    r => r['Source'] !== 'Between' && r['Source'] !== 'Interaction' &&
         r['Source'] !== 'Within'  && r['Source'] !== 'Total'
  );
  const intRow    = table.find(r => r['Source'] === 'Interaction');
  const withinRow = table.find(r => r['Source'] === 'Within');
  const totalRow  = table.find(r => r['Source'] === 'Total');

  if (factorRows.length !== 2 || !intRow || !withinRow || !totalRow) return null;

  const [rowA, rowB] = factorRows;

  const ssA  = Number(rowA['SS']);
  const dfA  = Number(rowA['df']);
  const msA  = Number(rowA['MS']);
  const fA   = Number(rowA['F']);
  const pA   = Number(rowA['p-value']);

  const ssB  = Number(rowB['SS']);
  const dfB  = Number(rowB['df']);
  const msB  = Number(rowB['MS']);
  const fB   = Number(rowB['F']);
  const pB   = Number(rowB['p-value']);

  const ssAB = Number(intRow['SS']);
  const dfAB = Number(intRow['df']);
  const msAB = Number(intRow['MS']);
  const fAB  = Number(intRow['F']);
  const pAB  = Number(intRow['p-value']);

  const ssE  = Number(withinRow['SS']);
  const dfE  = Number(withinRow['df']);
  const msE  = withinRow['MS'] != null ? Number(withinRow['MS']) : ssE / dfE;

  const ssTotal  = Number(totalRow['SS']);
  const dfTotal  = Number(totalRow['df']);

  return {
    factorNameA: String(rowA['Source']),
    factorNameB: String(rowB['Source']),
    kA: dfA + 1,
    kB: dfB + 1,
    N: dfTotal + 1,
    ssA, dfA, msA, fA, pA,
    ssB, dfB, msB, fB, pB,
    ssAB, dfAB, msAB, fAB, pAB,
    ssE, dfE, msE,
    ssTotal, dfTotal,
    alpha,
  };
}

/* ── Two-way masking logic ── */

function maskANOVATableTwoWay(
  full: TwoWayAnovaFullTable,
  difficulty: AnovaDifficulty,
): { missing: TwoWayAnovaMissingCell[]; masked: Set<string> } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const { ssA, dfA, msA, fA, ssB, dfB, msB, fB, ssAB, dfAB, msAB, fAB,
          ssE, dfE, msE, ssTotal, dfTotal, kA, kB, N } = full;

  let missing: TwoWayAnovaMissingCell[] = [];

  if (difficulty === 'easy') {
    /* Show: all SS and df; Hide: all MS and all F */
    missing = [
      { row: 'A',     col: 'MS', value: r2(msA),  formula: `MS_A = SS_A / df_A = ${r2(ssA)} / ${dfA} = ${r2(msA)}` },
      { row: 'B',     col: 'MS', value: r2(msB),  formula: `MS_B = SS_B / df_B = ${r2(ssB)} / ${dfB} = ${r2(msB)}` },
      { row: 'AxB',   col: 'MS', value: r2(msAB), formula: `MS_A×B = SS_A×B / df_A×B = ${r2(ssAB)} / ${dfAB} = ${r2(msAB)}` },
      { row: 'error', col: 'MS', value: r2(msE),  formula: `MS_error = SS_error / df_error = ${r2(ssE)} / ${dfE} = ${r2(msE)}` },
      { row: 'A',     col: 'F',  value: r2(fA),   formula: `F_A = MS_A / MS_error = ${r2(msA)} / ${r2(msE)} = ${r2(fA)}` },
      { row: 'B',     col: 'F',  value: r2(fB),   formula: `F_B = MS_B / MS_error = ${r2(msB)} / ${r2(msE)} = ${r2(fB)}` },
      { row: 'AxB',   col: 'F',  value: r2(fAB),  formula: `F_A×B = MS_A×B / MS_error = ${r2(msAB)} / ${r2(msE)} = ${r2(fAB)}` },
    ];
  } else if (difficulty === 'moderate') {
    /* Show: SS_A, SS_B, SS_AB, SS_T, df_T, MS_E (kA and kB given in prompt for df derivation)
       Hide: df_A, df_B, df_AB, df_E, SS_E, MS_A, MS_B, MS_AB, F_A, F_B, F_AB */
    missing = [
      { row: 'A',     col: 'df', value: dfA,        formula: `df_A = k_A − 1 = ${kA} − 1 = ${dfA}` },
      { row: 'B',     col: 'df', value: dfB,         formula: `df_B = k_B − 1 = ${kB} − 1 = ${dfB}` },
      { row: 'AxB',   col: 'df', value: dfAB,        formula: `df_A×B = df_A × df_B = ${dfA} × ${dfB} = ${dfAB}` },
      { row: 'error', col: 'df', value: dfE,          formula: `df_error = df_T − df_A − df_B − df_A×B = ${dfTotal} − ${dfA} − ${dfB} − ${dfAB} = ${dfE}` },
      { row: 'error', col: 'SS', value: r2(ssE),     formula: `SS_error = SS_T − SS_A − SS_B − SS_A×B = ${r2(ssTotal)} − ${r2(ssA)} − ${r2(ssB)} − ${r2(ssAB)} = ${r2(ssE)}` },
      { row: 'A',     col: 'MS', value: r2(msA),     formula: `MS_A = SS_A / df_A = ${r2(ssA)} / ${dfA} = ${r2(msA)}` },
      { row: 'B',     col: 'MS', value: r2(msB),     formula: `MS_B = SS_B / df_B = ${r2(ssB)} / ${dfB} = ${r2(msB)}` },
      { row: 'AxB',   col: 'MS', value: r2(msAB),    formula: `MS_A×B = SS_A×B / df_A×B = ${r2(ssAB)} / ${dfAB} = ${r2(msAB)}` },
      { row: 'A',     col: 'F',  value: r2(fA),      formula: `F_A = MS_A / MS_error = ${r2(msA)} / ${r2(msE)} = ${r2(fA)}` },
      { row: 'B',     col: 'F',  value: r2(fB),      formula: `F_B = MS_B / MS_error = ${r2(msB)} / ${r2(msE)} = ${r2(fB)}` },
      { row: 'AxB',   col: 'F',  value: r2(fAB),     formula: `F_A×B = MS_A×B / MS_error = ${r2(msAB)} / ${r2(msE)} = ${r2(fAB)}` },
    ];
  } else {
    /* difficulty === 'hard'
       Show: df_A, df_B, df_AB, df_E, MS_A, MS_B, MS_AB, F_A, F_B, F_AB
       Hide: MS_E, SS_A, SS_B, SS_AB, SS_E, SS_T, df_T
       Students back-solve: MS_E = MS_A/F_A, then SS from MS×df, df_T and SS_T by addition */
    missing = [
      { row: 'error', col: 'MS',  value: r2(msE),    formula: `MS_error = MS_A / F_A = ${r2(msA)} / ${r2(fA)} = ${r2(msE)}` },
      { row: 'A',     col: 'SS',  value: r2(ssA),    formula: `SS_A = MS_A × df_A = ${r2(msA)} × ${dfA} = ${r2(ssA)}` },
      { row: 'B',     col: 'SS',  value: r2(ssB),    formula: `SS_B = MS_B × df_B = ${r2(msB)} × ${dfB} = ${r2(ssB)}` },
      { row: 'AxB',   col: 'SS',  value: r2(ssAB),   formula: `SS_A×B = MS_A×B × df_A×B = ${r2(msAB)} × ${dfAB} = ${r2(ssAB)}` },
      { row: 'error', col: 'SS',  value: r2(ssE),    formula: `SS_error = MS_error × df_error = ${r2(msE)} × ${dfE} = ${r2(ssE)}` },
      { row: 'total', col: 'SS',  value: r2(ssTotal),formula: `SS_T = SS_A + SS_B + SS_A×B + SS_error = ${r2(ssA)} + ${r2(ssB)} + ${r2(ssAB)} + ${r2(ssE)} = ${r2(ssTotal)}` },
      { row: 'total', col: 'df',  value: dfTotal,     formula: `df_T = df_A + df_B + df_A×B + df_error = ${dfA} + ${dfB} + ${dfAB} + ${dfE} = ${dfTotal}` },
    ];
  }

  const masked = new Set(missing.map(c => `${c.row}:${c.col}`));
  return { missing, masked };
}

/* ── Render the student-facing two-way ANOVA table ── */

function renderTwoWayAnovaStudentTable(full: TwoWayAnovaFullTable, masked: Set<string>): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const BLANK = `<td style="text-align:center;color:var(--muted);">—</td>`;

  function cell(row: string, col: string, value: number | null): string {
    if (masked.has(`${row}:${col}`)) return `<td style="text-align:center;font-weight:700;font-size:1.1rem;">?</td>`;
    if (value === null)               return BLANK;
    return `<td>${r2(value)}</td>`;
  }

  return `
<div class="tbl-wrap" style="margin-top:1rem;">
  <table class="stat-table">
    <thead>
      <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:700;">Between Treatments</td>
        <td>${r2(full.ssA + full.ssB + full.ssAB)}</td>
        <td>${full.dfA + full.dfB + full.dfAB}</td>
        ${BLANK}${BLANK}
      </tr>
      <tr>
        <td>${full.factorNameA}</td>
        ${cell('A','SS',full.ssA)} ${cell('A','df',full.dfA)}
        ${cell('A','MS',full.msA)} ${cell('A','F',full.fA)}
      </tr>
      <tr>
        <td>${full.factorNameB}</td>
        ${cell('B','SS',full.ssB)} ${cell('B','df',full.dfB)}
        ${cell('B','MS',full.msB)} ${cell('B','F',full.fB)}
      </tr>
      <tr>
        <td>${full.factorNameA} × ${full.factorNameB}</td>
        ${cell('AxB','SS',full.ssAB)} ${cell('AxB','df',full.dfAB)}
        ${cell('AxB','MS',full.msAB)} ${cell('AxB','F',full.fAB)}
      </tr>
      <tr>
        <td>Error</td>
        ${cell('error','SS',full.ssE)} ${cell('error','df',full.dfE)}
        ${cell('error','MS',full.msE)}
        ${BLANK}
      </tr>
      <tr>
        <td>Total</td>
        ${cell('total','SS',full.ssTotal)} ${cell('total','df',full.dfTotal)}
        ${BLANK}${BLANK}
      </tr>
    </tbody>
  </table>
</div>`;
}

/* ── Render the completed two-way table (instructor key) ── */

function renderTwoWayAnovaFullTable(full: TwoWayAnovaFullTable): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const BLANK = `<td style="text-align:center;color:var(--muted);">—</td>`;
  return `
<div class="tbl-wrap" style="margin-top:0.5rem;">
  <table class="stat-table">
    <thead>
      <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:700;">Between Treatments</td>
        <td>${r2(full.ssA + full.ssB + full.ssAB)}</td>
        <td>${full.dfA + full.dfB + full.dfAB}</td>
        ${BLANK}${BLANK}
      </tr>
      <tr>
        <td>${full.factorNameA}</td>
        <td>${r2(full.ssA)}</td><td>${full.dfA}</td>
        <td>${r2(full.msA)}</td><td>${r2(full.fA)}</td>
      </tr>
      <tr>
        <td>${full.factorNameB}</td>
        <td>${r2(full.ssB)}</td><td>${full.dfB}</td>
        <td>${r2(full.msB)}</td><td>${r2(full.fB)}</td>
      </tr>
      <tr>
        <td>${full.factorNameA} × ${full.factorNameB}</td>
        <td>${r2(full.ssAB)}</td><td>${full.dfAB}</td>
        <td>${r2(full.msAB)}</td><td>${r2(full.fAB)}</td>
      </tr>
      <tr>
        <td>Error</td>
        <td>${r2(full.ssE)}</td><td>${full.dfE}</td>
        <td>${r2(full.msE)}</td>${BLANK}
      </tr>
      <tr>
        <td>Total</td>
        <td>${r2(full.ssTotal)}</td><td>${full.dfTotal}</td>
        ${BLANK}${BLANK}
      </tr>
    </tbody>
  </table>
</div>`;
}

/* ── Main two-way ANOVA practice problem generator ── */

export function generateTwoWayANOVAProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'anova') return;
  /* Two-way guard */
  if (state.lastResult.table.length === 0 || state.lastResult.table[0]['Source'] !== 'Between') return;
  const factorRows = state.lastResult.table.filter(
    r => r['Source'] !== 'Between' && r['Source'] !== 'Interaction' &&
         r['Source'] !== 'Within'  && r['Source'] !== 'Total'
  );
  if (factorRows.length !== 2) return;

  const variable   = (document.getElementById('ap2-variable')   as HTMLInputElement).value.trim()  || 'the outcome variable';
  const difficulty = (document.getElementById('ap2-difficulty') as HTMLSelectElement).value as AnovaDifficulty;
  const alpha      = parseFloat(gv('anova-alpha'));

  const full = buildFullANOVATableTwoWay(state.lastResult.table, alpha);
  if (!full) return;

  const { missing, masked } = maskANOVATableTwoWay(full, difficulty);

  const r2 = (n: number) => Math.round(n * 100) / 100;

  /* Student prompt — include factor level counts for moderate (needed to derive df) */
  const levelClause = difficulty === 'moderate'
    ? `Factor ${full.factorNameA} (${full.kA} levels), Factor ${full.factorNameB} (${full.kB} levels),`
    : `Factor ${full.factorNameA}, Factor ${full.factorNameB},`;

  const studentPrompt =
    `A researcher conducted a two-way ANOVA to test whether mean ${variable} differs as a function of ` +
    `${levelClause} and their interaction (N = ${full.N}). ` +
    `The partially completed ANOVA summary table is shown below. ` +
    `Fill in the missing values (marked "?") and determine which effects are significant at α = ${alpha}.`;

  /* Per-effect decision statements */
  const effectDecision = (
    label: string, df1: number, df2: number, fVal: number, pVal: number
  ): string => {
    const pStr = fmtP(pVal);
    return pVal < alpha
      ? `Reject H₀ for ${label}: F(${df1}, ${df2}) = ${r2(fVal)}, p ${pStr} — significant at α = ${alpha}.`
      : `Fail to reject H₀ for ${label}: F(${df1}, ${df2}) = ${r2(fVal)}, p ${pStr} — not significant at α = ${alpha}.`;
  };

  const decisionStatements = [
    effectDecision(`Factor ${full.factorNameA}`, full.dfA, full.dfE, full.fA, full.pA),
    effectDecision(`Factor ${full.factorNameB}`, full.dfB, full.dfE, full.fB, full.pB),
    effectDecision(`${full.factorNameA} × ${full.factorNameB} interaction`, full.dfAB, full.dfE, full.fAB, full.pAB),
  ];

  /* Student table HTML */
  const studentTableHTML = renderTwoWayAnovaStudentTable(full, masked);

  const problemHTML = `
<div class="problem-box">
  <p>${studentPrompt}</p>
  ${studentTableHTML}
  <div class="problem-questions" style="margin-top:1rem;">
    <ol>
      <li>Fill in all missing values (marked "?") in the ANOVA table above.</li>
      <li>State the null and alternative hypotheses for each effect (Factor ${full.factorNameA}, Factor ${full.factorNameB}, and the interaction).</li>
      <li>For each effect, determine whether the result is statistically significant at α = ${alpha}.</li>
      <li>Write a one-sentence interpretation for each significant effect.</li>
    </ol>
  </div>
</div>`;

  /* Instructor key */
  const missingListHTML = missing.map(c =>
    `<li style="margin-bottom:0.3rem;"><code>${c.formula}</code></li>`
  ).join('');

  const decisionsHTML = decisionStatements.map(d =>
    `<p><span class="${d.startsWith('Reject') ? 'val-reject' : 'val-fail'}">${d}</span></p>`
  ).join('');

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Completed ANOVA Table</strong>
    ${renderTwoWayAnovaFullTable(full)}
  </div>

  <div class="key-section">
    <strong>2. Missing Values (step-by-step)</strong>
    <ol style="margin:0.5rem 0 0 1.2rem;padding:0;">
      ${missingListHTML}
    </ol>
  </div>

  <div class="key-section">
    <strong>3. Hypotheses (for each effect)</strong>
    <p>H₀ (A): Mean ${variable} is the same across all levels of ${full.factorNameA}.</p>
    <p>H₁ (A): Mean ${variable} differs across at least two levels of ${full.factorNameA}.</p>
    <p>H₀ (B): Mean ${variable} is the same across all levels of ${full.factorNameB}.</p>
    <p>H₁ (B): Mean ${variable} differs across at least two levels of ${full.factorNameB}.</p>
    <p>H₀ (A×B): There is no interaction between ${full.factorNameA} and ${full.factorNameB}.</p>
    <p>H₁ (A×B): There is an interaction between ${full.factorNameA} and ${full.factorNameB}.</p>
  </div>

  <div class="key-section">
    <strong>4. Decisions (α = ${alpha})</strong>
    ${decisionsHTML}
  </div>
</div>`;

  state.lastTwoWayAnovaPracticeData = {
    full, difficulty, variable, missingCells: missing,
    studentPrompt, decisionStatements,
  };

  (document.getElementById('ap2-problem-text')   as HTMLElement).innerHTML = problemHTML;
  (document.getElementById('ap2-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('ap2-output')         as HTMLElement).style.display = 'block';

  /* Reset key toggle */
  (document.getElementById('ap2-show-key')       as HTMLInputElement).checked = false;
  (document.getElementById('ap2-instructor-key') as HTMLElement).style.display = 'none';

  (document.getElementById('ap2-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Two-way ANOVA instructor key toggle ── */

export function toggleTwoWayAnovaKey(): void {
  const show = (document.getElementById('ap2-show-key') as HTMLInputElement).checked;
  (document.getElementById('ap2-instructor-key') as HTMLElement).style.display = show ? 'block' : 'none';
}

/* ── Two-way ANOVA practice Excel export ── */

export function downloadTwoWayAnovaPracticeExcel(): void {
  const d = state.lastTwoWayAnovaPracticeData;
  if (!d) return;

  const { full, missingCells, studentPrompt, decisionStatements } = d;
  const r2 = (n: number) => Math.round(n * 100) / 100;

  const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
  const mc = (row: string, col: string, val: number | null): string | number =>
    masked.has(`${row}:${col}`) ? '?' : val !== null ? r2(val) : '—';

  const intLabel = `${full.factorNameA} × ${full.factorNameB}`;

  const rows: (string | number | null)[][] = [
    ['STUDENT PROBLEM — Two-Way ANOVA Table Practice'],
    [],
    ['Scenario'], [studentPrompt], [],
    ['Questions'],
    ['1.', 'Fill in all missing values (marked "?") in the ANOVA table below.'],
    ['2.', `State null and alternative hypotheses for Factor ${full.factorNameA}, Factor ${full.factorNameB}, and the interaction.`],
    ['3.', `Determine which effects are statistically significant at α = ${full.alpha}.`],
    ['4.', 'Write a one-sentence interpretation for each significant effect.'],
    [],
    ['ANOVA Table (Student Version)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Between Treatments', r2(full.ssA + full.ssB + full.ssAB), full.dfA + full.dfB + full.dfAB, '—', '—'],
    [full.factorNameA,  mc('A','SS',full.ssA),   mc('A','df',full.dfA),   mc('A','MS',full.msA),   mc('A','F',full.fA)],
    [full.factorNameB,  mc('B','SS',full.ssB),   mc('B','df',full.dfB),   mc('B','MS',full.msB),   mc('B','F',full.fB)],
    [intLabel,          mc('AxB','SS',full.ssAB), mc('AxB','df',full.dfAB),mc('AxB','MS',full.msAB),mc('AxB','F',full.fAB)],
    ['Error',           mc('error','SS',full.ssE),mc('error','df',full.dfE),mc('error','MS',full.msE),'—'],
    ['Total',           mc('total','SS',full.ssTotal),mc('total','df',full.dfTotal),'—','—'],
    [],
    [],
    ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
    [],
    ['ANOVA Table (Completed)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Between Treatments', r2(full.ssA + full.ssB + full.ssAB), full.dfA + full.dfB + full.dfAB, '—', '—'],
    [full.factorNameA,  r2(full.ssA),    full.dfA,  r2(full.msA),  r2(full.fA)],
    [full.factorNameB,  r2(full.ssB),    full.dfB,  r2(full.msB),  r2(full.fB)],
    [intLabel,          r2(full.ssAB),   full.dfAB, r2(full.msAB), r2(full.fAB)],
    ['Error',           r2(full.ssE),    full.dfE,  r2(full.msE),  '—'],
    ['Total',           r2(full.ssTotal),full.dfTotal,'—','—'],
    [],
    ['Missing Values (step-by-step)'],
    ...missingCells.map((c, i) => [`${i + 1}.`, c.formula]),
    [],
    ['Decisions (α = ' + full.alpha + ')'],
    ...decisionStatements.map(s => [s]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 85 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Two-Way ANOVA Practice');
  XLSX.writeFile(wb, `statteacher_anova2way_practice_${Date.now()}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   PEARSON CORRELATION STUDENT PROBLEM GENERATOR
   ════════════════════════════════════════════════════════════ */

export function generatePearsonProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'pearson') return;

  const stats = statsDict(state.lastResult.results);

  const variableX  = (document.getElementById('pear-pg-varx')       as HTMLInputElement).value.trim() || 'Variable X';
  const variableY  = (document.getElementById('pear-pg-vary')       as HTMLInputElement).value.trim() || 'Variable Y';
  const population = (document.getElementById('pear-pg-population') as HTMLInputElement).value.trim() || 'a sample of participants';

  const n        = stats['n'];
  const df       = Number(stats['df']);     /* = n - 2, provided by engine */
  const r        = stats['r'];
  const rSqRaw   = stats['r_squared'];
  const se       = stats['Standard Error'];
  const tScore   = stats['t'];
  const tCrit    = stats['t_critical'];
  const decision = stats['Decision'];

  const alpha     = state.lastPearsonContext?.alpha     ?? 0.05;
  const twoTailed = state.lastPearsonContext?.twoTailed ?? true;
  const tailLabel = twoTailed ? 'two-tailed' : 'one-tailed';

  /* r² — round to 2dp for display, derive percentage */
  const rSqNum = parseFloat(String(rSqRaw));
  const rSq    = rSqNum.toFixed(2);
  const rSqPct = (rSqNum * 100).toFixed(1);

  /* p-value from t-distribution (df = n-2) */
  const pval    = tPValue(parseFloat(String(tScore)), df, twoTailed);
  const pvalNum = pval.startsWith('<') ? 0.0001 : parseFloat(pval);
  const pCompare = pvalNum < alpha ? '< α' : '> α';

  /* r value as a number for sign-based direction */
  const rNum = parseFloat(String(r));

  /* Hypotheses — direction depends on tail setting and sign of r */
  const h0 = twoTailed
    ? 'H₀: ρ = 0'
    : (rNum >= 0 ? 'H₀: ρ ≤ 0' : 'H₀: ρ ≥ 0');
  const h1 = twoTailed
    ? 'H₁: ρ ≠ 0'
    : (rNum >= 0 ? 'H₁: ρ > 0' : 'H₁: ρ < 0');

  /* Direction phrase for student prompt and interpretation */
  const directionPhrase = twoTailed
    ? 'a linear relationship'
    : (rNum >= 0 ? 'a positive linear relationship' : 'a negative linear relationship');

  const isRej = decision === 'Reject Null';

  /* Interpretation */
  const interp = isRej
    ? `There is a statistically significant ${directionPhrase} between ${variableX} and ${variableY} ` +
      `in ${population} (r(${df}) = ${r}, p ${pval.startsWith('<') ? pval : '= ' + pval}).`
    : `There is insufficient evidence of ${directionPhrase} between ${variableX} and ${variableY} ` +
      `in ${population} (r(${df}) = ${r}, p ${pval.startsWith('<') ? pval : '= ' + pval}).`;

  /* ── Student problem HTML ── */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher is investigating the relationship between <strong>${variableX}</strong>
  and <strong>${variableY}</strong> in <strong>${population}</strong>.</p>
  <p>A random sample of <em>n</em>&nbsp;=&nbsp;${n} participants was obtained.
  The sample correlation was <em>r</em>&nbsp;=&nbsp;${r}.</p>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether there is ${directionPhrase}
  between ${variableX} and ${variableY}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the test statistic.</li>
      <li>Determine the <em>p</em>-value.</li>
      <li>Compute and interpret <em>r</em>&sup2;.</li>
      <li>State your decision.</li>
      <li>Interpret the result in context.</li>
    </ol>
  </div>
</div>`;

  /* ── Instructor key HTML ── */
  /* Show substituted t formula: t = r√(n-2) / √(1 − r²) */
  const rSqFmt      = parseFloat(String(r)) ** 2;
  const oneMinusRsq = (1 - rSqFmt).toFixed(4);
  const critNote    = twoTailed
    ? `&plusmn;${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, two-tailed)`
    : `${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, one-tailed)`;

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Hypotheses</strong>
    <p>${h0}</p>
    <p>${h1}</p>
  </div>

  <div class="key-section">
    <strong>2. Test Statistic</strong>
    <div class="key-formula">
      t = r &times; &radic;(n &minus; 2) / &radic;(1 &minus; r&sup2;)<br>
      t = ${r} &times; &radic;(${n} &minus; 2) / &radic;(1 &minus; ${r}&sup2;)<br>
      t = ${r} &times; &radic;${df} / &radic;${oneMinusRsq}<br>
      t = ${tScore}
    </div>
    <p>df = n &minus; 2 = ${n} &minus; 2 = ${df}</p>
    <p>Critical value: t<sub>crit</sub> = ${critNote}</p>
  </div>

  <div class="key-section">
    <strong>3. p-value</strong>
    <p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
  </div>

  <div class="key-section">
    <strong>4. Effect Size (r&sup2;)</strong>
    <p>r&sup2; = ${r}&sup2; = ${rSq}</p>
    <p>Approximately ${rSqPct}% of the variance in <em>${variableY}</em> is explained by <em>${variableX}</em>.</p>
  </div>

  <div class="key-section">
    <strong>5. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>6. Interpretation</strong>
    <p>${interp}</p>
  </div>
</div>`;

  /* ── Store & render ── */
  state.lastPearsonProblemData = {
    testType: 'pearson',
    variableX, variableY, population,
    n: n ?? '', df,
    r: r ?? '', rSq, rSqPct,
    se: se ?? '', tScore: tScore ?? '', tCrit: tCrit ?? '',
    ssX: stats['SS_X'] ?? '', ssY: stats['SS_Y'] ?? '', spXY: stats['SP_XY'] ?? '',
    decision: decision ?? null,
    alpha, twoTailed, tailLabel, pval, pCompare,
    h0, h1, isRej,
    interp,
  };

  (document.getElementById('pear-pg-problem-text')   as HTMLElement).innerHTML = problemHTML;
  (document.getElementById('pear-pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('pear-pg-output')         as HTMLElement).style.display = 'block';

  /* Reset key toggle */
  (document.getElementById('pear-pg-show-key')       as HTMLInputElement).checked = false;
  (document.getElementById('pear-pg-instructor-key') as HTMLElement).style.display = 'none';

  (document.getElementById('pear-pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Pearson instructor key toggle ── */

export function togglePearsonKey(): void {
  const show = (document.getElementById('pear-pg-show-key') as HTMLInputElement).checked;
  (document.getElementById('pear-pg-instructor-key') as HTMLElement).style.display = show ? 'block' : 'none';
}

/* ── Pearson problem Excel export ── */

export function downloadPearsonExcel(): void {
  const d = state.lastPearsonProblemData;
  if (!d) return;

  const pvalStr = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
  const decStr  = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';
  const rSqStr  = `${d.r}² = ${d.rSq} — Approximately ${d.rSqPct}% of the variance in ${d.variableY} is explained by ${d.variableX}.`;

  const rNum2      = parseFloat(String(d.r));
  const dirPhrase  = d.twoTailed
    ? 'a linear relationship'
    : (rNum2 >= 0 ? 'a positive linear relationship' : 'a negative linear relationship');
  const critLine   = d.twoTailed
    ? `t_crit = ±${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, two-tailed)`
    : `t_crit = ${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, one-tailed)`;

  const narrative =
    `A researcher is investigating the relationship between ${d.variableX} and ${d.variableY} ` +
    `in ${d.population}. ` +
    `A random sample of n = ${d.n} participants was obtained. ` +
    `The sample correlation was r = ${d.r}. ` +
    `Using α = ${d.alpha} (${d.tailLabel}), test whether there is ${dirPhrase} ` +
    `between ${d.variableX} and ${d.variableY}.`;

  const rows: (string | number | null)[][] = [
    ['STUDENT PROBLEM — Pearson Correlation'],
    [],
    ['Scenario'], [narrative], [],
    ['Questions'],
    ['1.', 'State the null and alternative hypotheses.'],
    ['2.', 'Compute the test statistic.'],
    ['3.', 'Determine the p-value.'],
    ['4.', 'Compute and interpret r².'],
    ['5.', 'State your decision.'],
    ['6.', 'Interpret the result in context.'],
    [], [],
    ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
    [],
    ['1. Hypotheses'], ['H₀:', d.h0], ['H₁:', d.h1],
    [],
    ['2. Test Statistic'],
    ['Formula:',       't = r × √(n − 2) / √(1 − r²)'],
    ['Substitution:',  `t = ${d.r} × √(${d.n} − 2) / √(1 − ${d.r}²)`],
    ['Result:',        `t = ${d.tScore}`],
    ['df:',            `n − 2 = ${d.n} − 2 = ${d.df}`],
    ['Critical value:', critLine],
    [],
    ['3. p-value'],
    ['p-value:', `p ${pvalStr}  →  p ${d.pCompare}`],
    [],
    ['4. Effect Size (r²)'],
    ['r²:', rSqStr],
    [],
    ['5. Decision'], ['', decStr],
    [],
    ['6. Interpretation'], [d.interp],
    [],
    ['Additional Statistics'],
    ['n:', d.n], ['df:', d.df], ['r:', d.r], ['r²:', d.rSq],
    ['t:', d.tScore], ['t_crit:', d.tCrit],
    ['SS_X:', d.ssX], ['SS_Y:', d.ssY], ['SP_XY:', d.spXY],
    ['alpha:', d.alpha],
    ['Variable X:', d.variableX], ['Variable Y:', d.variableY],
    ['Population:', d.population],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 90 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pearson Problem');
  XLSX.writeFile(wb, `statteacher_pearson_problem_${Date.now()}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   REGRESSION TABLE PRACTICE PROBLEM
   ════════════════════════════════════════════════════════════ */

/* ── Build a typed full-table object from the engine's regression TableRow array ── */

function buildFullRegressionTable(
  table: TableRow[],
  equation: string,
  variableX: string,
  variableY: string,
  population: string,
  alpha: number,
): RegFullTable | null {
  const regRow   = table.find(r => r['Source'] === 'Regression');
  const residRow = table.find(r => r['Source'] === 'Residual');
  const totalRow = table.find(r => r['Source'] === 'Total');
  if (!regRow || !residRow || !totalRow) return null;

  const ssRegression = Number(regRow['SS']);
  const dfRegression = Number(regRow['df']);   // always 1
  const msRegression = Number(regRow['MS']);
  const fStat        = Number(regRow['F']);
  const ssResidual   = Number(residRow['SS']);
  const dfResidual   = Number(residRow['df']); // n - 2
  const msResidual   = Number(residRow['MS']);
  const ssTotal      = Number(totalRow['SS']);
  const dfTotal      = Number(totalRow['df']); // n - 1
  const n            = dfTotal + 1;
  const rSquared     = ssTotal > 0 ? ssRegression / ssTotal : 0;

  /* Parse b1 (slope) and b0 (intercept) from equation "Y={b1}X+{b0}" */
  const eqMatch = equation.match(/Y=(-?[\d.]+)X\+?(-?[\d.]+)/);
  const b1 = eqMatch ? parseFloat(eqMatch[1]) : NaN;
  const b0 = eqMatch ? parseFloat(eqMatch[2]) : NaN;

  return {
    variableX, variableY, population, n,
    b0, b1, rSquared,
    ssRegression, dfRegression, msRegression, fStat,
    ssResidual, dfResidual, msResidual,
    ssTotal, dfTotal,
    alpha, equation,
  };
}

/* ── Masking logic — returns answer-key list and a Set of "row:col" keys ── */

function maskRegressionTable(
  full: RegFullTable,
  difficulty: AnovaDifficulty,
): { missing: RegMissingCell[]; masked: Set<string> } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const { ssRegression, dfRegression, msRegression, fStat, ssResidual, dfResidual, msResidual, ssTotal, dfTotal } = full;

  let missing: RegMissingCell[];

  if (difficulty === 'easy') {
    /* Reveal: all SS, all df.  Hide: MS_regression, MS_residual, F */
    missing = [
      { row: 'regression', col: 'MS', value: r2(msRegression), formula: `MS_regression = SS_regression / df_regression = ${r2(ssRegression)} / ${dfRegression} = ${r2(msRegression)}` },
      { row: 'residual',   col: 'MS', value: r2(msResidual),   formula: `MS_residual = SS_residual / df_residual = ${r2(ssResidual)} / ${dfResidual} = ${r2(msResidual)}` },
      { row: 'regression', col: 'F',  value: r2(fStat),        formula: `F = MS_regression / MS_residual = ${r2(msRegression)} / ${r2(msResidual)} = ${r2(fStat)}` },
    ];
  } else if (difficulty === 'moderate') {
    /* Reveal: SS_regression, df_regression (=1), df_residual, SS_total, df_total.
       Hide: SS_residual, MS_regression, MS_residual, F */
    missing = [
      { row: 'residual',   col: 'SS', value: r2(ssResidual),   formula: `SS_residual = SS_total − SS_regression = ${r2(ssTotal)} − ${r2(ssRegression)} = ${r2(ssResidual)}` },
      { row: 'regression', col: 'MS', value: r2(msRegression), formula: `MS_regression = SS_regression / df_regression = ${r2(ssRegression)} / ${dfRegression} = ${r2(msRegression)}` },
      { row: 'residual',   col: 'MS', value: r2(msResidual),   formula: `MS_residual = SS_residual / df_residual = ${r2(ssResidual)} / ${dfResidual} = ${r2(msResidual)}` },
      { row: 'regression', col: 'F',  value: r2(fStat),        formula: `F = MS_regression / MS_residual = ${r2(msRegression)} / ${r2(msResidual)} = ${r2(fStat)}` },
    ];
  } else {
    /* difficulty === 'hard'
       Reveal: df_regression (=1), MS_regression, F, df_residual.
       Hide: SS_regression, SS_residual, MS_residual, SS_total, df_total */
    missing = [
      { row: 'residual',   col: 'MS', value: r2(msResidual),   formula: `MS_residual = MS_regression / F = ${r2(msRegression)} / ${r2(fStat)} = ${r2(msResidual)}` },
      { row: 'regression', col: 'SS', value: r2(ssRegression), formula: `SS_regression = MS_regression × df_regression = ${r2(msRegression)} × ${dfRegression} = ${r2(ssRegression)}` },
      { row: 'residual',   col: 'SS', value: r2(ssResidual),   formula: `SS_residual = MS_residual × df_residual = ${r2(msResidual)} × ${dfResidual} = ${r2(ssResidual)}` },
      { row: 'total',      col: 'SS', value: r2(ssTotal),      formula: `SS_total = SS_regression + SS_residual = ${r2(ssRegression)} + ${r2(ssResidual)} = ${r2(ssTotal)}` },
      { row: 'total',      col: 'df', value: dfTotal,           formula: `df_total = df_regression + df_residual = ${dfRegression} + ${dfResidual} = ${dfTotal}` },
    ];
  }

  const masked = new Set(missing.map(c => `${c.row}:${c.col}`));
  return { missing, masked };
}

/* ── Render the student-facing regression table with blanked cells ── */

function renderRegressionStudentTable(full: RegFullTable, masked: Set<string>): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;

  function cell(row: string, col: string, value: number | null): string {
    if (masked.has(`${row}:${col}`)) return `<td style="text-align:center;font-weight:700;font-size:1.1rem;">?</td>`;
    if (value === null)               return `<td style="text-align:center;color:var(--muted);">—</td>`;
    return `<td>${r2(value)}</td>`;
  }

  return `
<div class="tbl-wrap" style="margin-top:1rem;">
  <table class="stat-table">
    <thead>
      <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Regression</td>
        ${cell('regression','SS', full.ssRegression)}
        ${cell('regression','df', full.dfRegression)}
        ${cell('regression','MS', full.msRegression)}
        ${cell('regression','F',  full.fStat)}
      </tr>
      <tr>
        <td>Residual</td>
        ${cell('residual','SS', full.ssResidual)}
        ${cell('residual','df', full.dfResidual)}
        ${cell('residual','MS', full.msResidual)}
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
      <tr>
        <td>Total</td>
        ${cell('total','SS', full.ssTotal)}
        ${cell('total','df', full.dfTotal)}
        <td style="text-align:center;color:var(--muted);">—</td>
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
    </tbody>
  </table>
</div>`;
}

/* ── Render the full (completed) regression table for the instructor key ── */

function renderRegressionFullTable(full: RegFullTable): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return `
<div class="tbl-wrap" style="margin-top:0.5rem;">
  <table class="stat-table">
    <thead>
      <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Regression</td>
        <td>${r2(full.ssRegression)}</td><td>${full.dfRegression}</td>
        <td>${r2(full.msRegression)}</td><td>${r2(full.fStat)}</td>
      </tr>
      <tr>
        <td>Residual</td>
        <td>${r2(full.ssResidual)}</td><td>${full.dfResidual}</td>
        <td>${r2(full.msResidual)}</td>
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
      <tr>
        <td>Total</td>
        <td>${r2(full.ssTotal)}</td><td>${full.dfTotal}</td>
        <td style="text-align:center;color:var(--muted);">—</td>
        <td style="text-align:center;color:var(--muted);">—</td>
      </tr>
    </tbody>
  </table>
</div>`;
}

/* ── Main Regression Practice Problem Generator ── */

export function generateRegressionTableProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'regression') return;

  const variableX  = (document.getElementById('reg-pg-varx')       as HTMLInputElement).value.trim()  || 'X';
  const variableY  = (document.getElementById('reg-pg-vary')       as HTMLInputElement).value.trim()  || 'Y';
  const population = (document.getElementById('reg-pg-population') as HTMLInputElement).value.trim()  || 'a sample of participants';
  const difficulty = (document.getElementById('reg-pg-difficulty') as HTMLSelectElement).value as AnovaDifficulty;
  const alpha      = parseFloat(gv('reg-alpha'));

  const full = buildFullRegressionTable(
    state.lastResult.table,
    state.lastResult.equation,
    variableX, variableY, population, alpha,
  );
  if (!full) return;

  const { missing, masked } = maskRegressionTable(full, difficulty);

  const r2    = (n: number) => Math.round(n * 100) / 100;
  const pStr  = fPValue(full.fStat, full.dfRegression, full.dfResidual);
  const pNum  = pStr.startsWith('<') ? 0.0001 : parseFloat(pStr);
  const pFmt  = pStr.startsWith('<') ? pStr : '= ' + pStr;
  const isRej = pNum < alpha;

  /* Student prompt */
  const studentPrompt =
    `A researcher is investigating whether ${variableX} predicts ${variableY} in ${population}. ` +
    `A random sample of n = ${full.n} participants was obtained. ` +
    `The partially completed regression ANOVA table is shown below. ` +
    `Fill in the missing values in the table and answer the questions that follow.`;

  /* Student table HTML */
  const studentTableHTML = renderRegressionStudentTable(full, masked);

  /* Equation display — parse nicely if possible */
  const b1Str = isNaN(full.b1) ? '?' : r2(full.b1).toString();
  const b0Str = isNaN(full.b0) ? '?' : r2(full.b0).toString();
  const eqDisplay = isNaN(full.b1) ? full.equation : `Ŷ = ${b1Str}(${variableX}) + ${b0Str}`;

  /* Problem box */
  const problemHTML = `
<div class="problem-box">
  <p>${studentPrompt}</p>
  ${studentTableHTML}
  <div class="problem-questions" style="margin-top:1rem;">
    <ol>
      <li>Complete the regression table (fill in all "?" cells).</li>
      <li>Write the regression equation.</li>
      <li>Determine whether the slope is statistically significant at α = ${alpha}.</li>
      <li>Interpret the slope in context.</li>
      <li>Interpret R² in context.</li>
    </ol>
  </div>
</div>`;

  /* Slope and R² interpretations */
  const slopeDir    = full.b1 >= 0 ? 'increases' : 'decreases';
  const slopeInterp = isNaN(full.b1)
    ? `For each one-unit increase in ${variableX}, ${variableY} changes by the slope value.`
    : `For each one-unit increase in ${variableX}, ${variableY} ${slopeDir} by ${Math.abs(r2(full.b1))}.`;
  const rSqPct  = (full.rSquared * 100).toFixed(1);
  const rSqInterp = `Approximately ${rSqPct}% of the variance in ${variableY} is explained by ${variableX}.`;

  /* Decision statement */
  const decisionStatement = isRej
    ? `Reject H₀: there is sufficient evidence that ${variableX} significantly predicts ${variableY} ` +
      `(F(${full.dfRegression}, ${full.dfResidual}) = ${r2(full.fStat)}, p ${pFmt}).`
    : `Fail to reject H₀: there is insufficient evidence that ${variableX} significantly predicts ${variableY} ` +
      `(F(${full.dfRegression}, ${full.dfResidual}) = ${r2(full.fStat)}, p ${pFmt}).`;

  /* Instructor key */
  const missingListHTML = missing.map(c =>
    `<li style="margin-bottom:0.3rem;"><code>${c.formula}</code></li>`
  ).join('');

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Completed Regression Table</strong>
    ${renderRegressionFullTable(full)}
  </div>

  <div class="key-section">
    <strong>2. Missing Values (step-by-step)</strong>
    <ol style="margin:0.5rem 0 0 1.2rem;padding:0;">
      ${missingListHTML}
    </ol>
  </div>

  <div class="key-section">
    <strong>3. Regression Equation</strong>
    <p>${eqDisplay}</p>
  </div>

  <div class="key-section">
    <strong>4. Hypotheses &amp; Decision (α = ${alpha})</strong>
    <p>H₀: β₁ = 0 (${variableX} does not predict ${variableY})</p>
    <p>H₁: β₁ ≠ 0 (${variableX} significantly predicts ${variableY})</p>
    <p>F(${full.dfRegression}, ${full.dfResidual}) = ${r2(full.fStat)}, p ${pFmt}</p>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Slope Interpretation</strong>
    <p>${slopeInterp}</p>
  </div>

  <div class="key-section">
    <strong>6. R² Interpretation</strong>
    <p>R² = ${r2(full.ssRegression)} / ${r2(full.ssTotal)} = ${(full.rSquared).toFixed(3)}</p>
    <p>${rSqInterp}</p>
  </div>
</div>`;

  /* Store state */
  state.lastRegPracticeData = {
    full, difficulty, missingCells: missing,
    studentPrompt, decisionStatement, slopeInterp, rSqInterp,
  };

  (document.getElementById('reg-pg-problem-text')   as HTMLElement).innerHTML = problemHTML;
  (document.getElementById('reg-pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('reg-pg-output')         as HTMLElement).style.display = 'block';

  /* Reset key toggle */
  (document.getElementById('reg-pg-show-key')       as HTMLInputElement).checked = false;
  (document.getElementById('reg-pg-instructor-key') as HTMLElement).style.display = 'none';

  (document.getElementById('reg-pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Regression instructor key toggle ── */

export function toggleRegressionKey(): void {
  const show = (document.getElementById('reg-pg-show-key') as HTMLInputElement).checked;
  (document.getElementById('reg-pg-instructor-key') as HTMLElement).style.display = show ? 'block' : 'none';
}

/* ── Regression Practice Excel export ── */

export function downloadRegressionPracticeExcel(): void {
  const d = state.lastRegPracticeData;
  if (!d) return;

  const { full, missingCells, studentPrompt, decisionStatement, slopeInterp, rSqInterp, difficulty } = d;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pStr = fPValue(full.fStat, full.dfRegression, full.dfResidual);
  const pFmt = pStr.startsWith('<') ? pStr : '= ' + pStr;

  const b1Str = isNaN(full.b1) ? '?' : r2(full.b1).toString();
  const b0Str = isNaN(full.b0) ? '?' : r2(full.b0).toString();
  const eqDisplay = isNaN(full.b1) ? full.equation : `Ŷ = ${b1Str}(${full.variableX}) + ${b0Str}`;

  /* Build masked table values for student sheet */
  const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
  const mc = (row: string, col: string, val: number | null) =>
    masked.has(`${row}:${col}`) ? '?' : val !== null ? r2(val) : '—';

  const rows: (string | number | null)[][] = [
    ['STUDENT PROBLEM — Regression Table Practice'],
    [],
    ['Difficulty:', difficulty.charAt(0).toUpperCase() + difficulty.slice(1)],
    [],
    ['Scenario'], [studentPrompt], [],
    ['Questions'],
    ['1.', 'Complete the regression table (fill in all "?" cells).'],
    ['2.', 'Write the regression equation.'],
    ['3.', `Determine whether the slope is statistically significant at α = ${full.alpha}.`],
    ['4.', 'Interpret the slope in context.'],
    ['5.', 'Interpret R² in context.'],
    [],
    ['Regression Table (Student Version)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Regression', mc('regression','SS',full.ssRegression), mc('regression','df',full.dfRegression), mc('regression','MS',full.msRegression), mc('regression','F',full.fStat)],
    ['Residual',   mc('residual','SS',full.ssResidual),     mc('residual','df',full.dfResidual),     mc('residual','MS',full.msResidual),     '—'],
    ['Total',      mc('total','SS',full.ssTotal),           mc('total','df',full.dfTotal),           '—', '—'],
    [],
    [],
    ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
    [],
    ['Regression Table (Completed)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Regression', r2(full.ssRegression), full.dfRegression, r2(full.msRegression), r2(full.fStat)],
    ['Residual',   r2(full.ssResidual),   full.dfResidual,   r2(full.msResidual),   '—'],
    ['Total',      r2(full.ssTotal),      full.dfTotal,      '—', '—'],
    [],
    ['Missing Values (step-by-step)'],
    ...missingCells.map((c, i) => [`${i + 1}.`, c.formula]),
    [],
    ['Regression Equation'],
    [eqDisplay],
    [],
    ['Hypotheses'],
    ['H₀:', `β₁ = 0 (${full.variableX} does not predict ${full.variableY})`],
    ['H₁:', `β₁ ≠ 0 (${full.variableX} significantly predicts ${full.variableY})`],
    [],
    ['Decision'],
    [`F(${full.dfRegression}, ${full.dfResidual}) = ${r2(full.fStat)}, p ${pFmt}`],
    [decisionStatement],
    [],
    ['Slope Interpretation'],
    [slopeInterp],
    [],
    ['R² Interpretation'],
    [`R² = ${(full.rSquared).toFixed(3)} (${(full.rSquared * 100).toFixed(1)}%)`],
    [rSqInterp],
    [],
    ['Additional Statistics'],
    ['n:', full.n], ['alpha:', full.alpha],
    ['SS_regression:', r2(full.ssRegression)], ['SS_residual:', r2(full.ssResidual)], ['SS_total:', r2(full.ssTotal)],
    ['df_regression:', full.dfRegression], ['df_residual:', full.dfResidual], ['df_total:', full.dfTotal],
    ['MS_regression:', r2(full.msRegression)], ['MS_residual:', r2(full.msResidual)],
    ['F:', r2(full.fStat)], ['p:', pStr],
    ['R²:', (full.rSquared).toFixed(3)],
    ['b1 (slope):', isNaN(full.b1) ? '?' : r2(full.b1)],
    ['b0 (intercept):', isNaN(full.b0) ? '?' : r2(full.b0)],
    ['Variable X:', full.variableX], ['Variable Y:', full.variableY],
    ['Population:', full.population],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 85 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Regression Practice');
  XLSX.writeFile(wb, `statteacher_regression_practice_${Date.now()}.xlsx`);
}

/* ════════════════════════════════════════════════════════════
   REPEATED-MEASURES ANOVA TABLE PRACTICE PROBLEM
   ════════════════════════════════════════════════════════════ */

/* ── Build a typed full-table object from the engine's RMA-ANOVA TableRow array ── */

function buildRmaAnovaFullTable(table: TableRow[], alpha: number): RmaAnovaFullTable | null {
  const r2 = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const btRow    = table.find(r => r['Source'] === 'Between Treatments');
  const bsRow    = table.find(r => r['Source'] === 'Between Subjects');
  const errRow   = table.find(r => r['Source'] === 'Error');
  const totalRow = table.find(r => r['Source'] === 'Total');
  if (!btRow || !bsRow || !errRow || !totalRow) return null;

  const dfBT = r2(btRow['df']);
  const dfBS = r2(bsRow['df']);

  const ssBT  = r2(btRow['SS']);
  const ssErr = r2(errRow['SS']);
  return {
    ssBT,            dfBT,   msBT: r2(btRow['MS']),
    fStat:  r2(btRow['F']),  pValue: r2(btRow['p-value']),
    ssBS: r2(bsRow['SS']),   dfBS,   msBS: r2(bsRow['MS']),
    ssErr,           dfErr:  r2(errRow['df']), msErr: r2(errRow['MS']),
    ssTotal: r2(totalRow['SS']), dfTotal: r2(totalRow['df']),
    nSubjects:   dfBS + 1,
    nConditions: dfBT + 1,
    alpha,
    eta2: ssBT / (ssBT + ssErr),
  };
}

/* ── Masking ── */

function maskRmaAnovaTable(
  full: RmaAnovaFullTable,
  difficulty: AnovaDifficulty,
): { missing: RmaAnovaMissingCell[]; masked: Set<string> } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const { ssBT, dfBT, msBT, fStat, ssBS, dfBS, msBS,
          ssErr, dfErr, msErr, ssTotal, dfTotal,
          nSubjects: n, nConditions: k } = full;

  let missing: RmaAnovaMissingCell[];

  if (difficulty === 'easy') {
    missing = [
      { row: 'bt',    col: 'MS', value: r2(msBT),  formula: `MS_treatments = SS_treatments / df_treatments = ${r2(ssBT)} / ${dfBT} = ${r2(msBT)}` },
      { row: 'bs',    col: 'MS', value: r2(msBS),  formula: `MS_subjects   = SS_subjects / df_subjects = ${r2(ssBS)} / ${dfBS} = ${r2(msBS)}` },
      { row: 'error', col: 'MS', value: r2(msErr), formula: `MS_error      = SS_error / df_error = ${r2(ssErr)} / ${dfErr} = ${r2(msErr)}` },
      { row: 'bt',    col: 'F',  value: r2(fStat), formula: `F = MS_treatments / MS_error = ${r2(msBT)} / ${r2(msErr)} = ${r2(fStat)}` },
    ];
  } else if (difficulty === 'moderate') {
    missing = [
      { row: 'bt',    col: 'df', value: dfBT,      formula: `df_treatments = k − 1 = ${k} − 1 = ${dfBT}` },
      { row: 'bs',    col: 'df', value: dfBS,      formula: `df_subjects   = n − 1 = ${n} − 1 = ${dfBS}` },
      { row: 'error', col: 'df', value: dfErr,     formula: `df_error      = (n − 1)(k − 1) = ${dfBS} × ${dfBT} = ${dfErr}` },
      { row: 'error', col: 'SS', value: r2(ssErr), formula: `SS_error      = SS_total − SS_treatments − SS_subjects = ${r2(ssTotal)} − ${r2(ssBT)} − ${r2(ssBS)} = ${r2(ssErr)}` },
      { row: 'bt',    col: 'MS', value: r2(msBT),  formula: `MS_treatments = SS_treatments / df_treatments = ${r2(ssBT)} / ${dfBT} = ${r2(msBT)}` },
      { row: 'bt',    col: 'F',  value: r2(fStat), formula: `F = MS_treatments / MS_error = ${r2(msBT)} / ${r2(msErr)} = ${r2(fStat)}` },
    ];
  } else {
    /* hard */
    missing = [
      { row: 'bt',    col: 'SS',  value: r2(ssBT),   formula: `SS_treatments = MS_treatments × df_treatments = ${r2(msBT)} × ${dfBT} = ${r2(ssBT)}` },
      { row: 'bs',    col: 'SS',  value: r2(ssBS),   formula: `SS_subjects   = MS_subjects × df_subjects = ${r2(msBS)} × ${dfBS} = ${r2(ssBS)}` },
      { row: 'error', col: 'SS',  value: r2(ssErr),  formula: `SS_error      = MS_error × df_error = ${r2(msErr)} × ${dfErr} = ${r2(ssErr)}` },
      { row: 'total', col: 'SS',  value: r2(ssTotal),formula: `SS_total      = SS_treatments + SS_subjects + SS_error = ${r2(ssBT)} + ${r2(ssBS)} + ${r2(ssErr)} = ${r2(ssTotal)}` },
      { row: 'total', col: 'df',  value: dfTotal,    formula: `df_total      = df_treatments + df_subjects + df_error = ${dfBT} + ${dfBS} + ${dfErr} = ${dfTotal}` },
      { row: 'error', col: 'MS',  value: r2(msErr),  formula: `MS_error      = MS_treatments / F = ${r2(msBT)} / ${r2(fStat)} = ${r2(msErr)}` },
    ];
  }

  const masked = new Set(missing.map(c => `${c.row}:${c.col}`));
  return { missing, masked };
}

/* ── Student table HTML (cells marked "?" for masked positions) ── */

function renderRmaAnovaStudentTable(full: RmaAnovaFullTable, masked: Set<string>): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const cell = (row: string, col: string, val: number | string) =>
    masked.has(`${row}:${col}`) ? '<td>?</td>' : `<td>${typeof val === 'number' ? r2(val) : val}</td>`;

  return `<table class="stat-table" style="margin-top:0.75rem;">
<thead><tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr></thead>
<tbody>
<tr><td>Between Treatments</td>${cell('bt','SS',full.ssBT)}${cell('bt','df',full.dfBT)}${cell('bt','MS',full.msBT)}${cell('bt','F',full.fStat)}</tr>
<tr><td>Within Treatment</td><td>${r2(full.ssBS + full.ssErr)}</td><td>${full.dfBS + full.dfErr}</td><td>—</td><td>—</td></tr>
<tr><td style="padding-left:1.5rem;">Between Subjects</td>${cell('bs','SS',full.ssBS)}${cell('bs','df',full.dfBS)}${cell('bs','MS',full.msBS)}<td>—</td></tr>
<tr><td style="padding-left:1.5rem;">Error</td>${cell('error','SS',full.ssErr)}${cell('error','df',full.dfErr)}${cell('error','MS',full.msErr)}<td>—</td></tr>
<tr><td>Total</td>${cell('total','SS',full.ssTotal)}${cell('total','df',full.dfTotal)}<td>—</td><td>—</td></tr>
</tbody></table>`;
}

/* ── Full (completed) table HTML for instructor key ── */

function renderRmaAnovaFullTable(full: RmaAnovaFullTable): string {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return `<table class="stat-table" style="margin-top:0.75rem;">
<thead><tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th></tr></thead>
<tbody>
<tr><td>Between Treatments</td><td>${r2(full.ssBT)}</td><td>${full.dfBT}</td><td>${r2(full.msBT)}</td><td>${r2(full.fStat)}</td></tr>
<tr><td>Within Treatment</td><td>${r2(full.ssBS + full.ssErr)}</td><td>${full.dfBS + full.dfErr}</td><td>—</td><td>—</td></tr>
<tr><td style="padding-left:1.5rem;">Between Subjects</td><td>${r2(full.ssBS)}</td><td>${full.dfBS}</td><td>${r2(full.msBS)}</td><td>—</td></tr>
<tr><td style="padding-left:1.5rem;">Error</td><td>${r2(full.ssErr)}</td><td>${full.dfErr}</td><td>${r2(full.msErr)}</td><td>—</td></tr>
<tr><td>Total</td><td>${r2(full.ssTotal)}</td><td>${full.dfTotal}</td><td>—</td><td>—</td></tr>
</tbody></table>`;
}

/* ── Main RM ANOVA Practice Problem Generator ── */

export function generateRmaAnovaProblem(): void {
  if (!state.lastResult || state.lastResult.type !== 'rma_anova') return;

  const variable   = (document.getElementById('rma-pg-variable')   as HTMLInputElement).value.trim() || 'the outcome variable';
  const difficulty = (document.getElementById('rma-pg-difficulty') as HTMLSelectElement).value as AnovaDifficulty;
  const alpha      = parseFloat(gv('rma-alpha'));

  const rmaResult = state.lastResult as { table: TableRow[]; decision: string };
  const full = buildRmaAnovaFullTable(rmaResult.table, alpha);
  if (!full) return;

  const { missing, masked } = maskRmaAnovaTable(full, difficulty);

  const studentPrompt =
    `A researcher conducted a one-way repeated-measures ANOVA to test whether mean ${variable} differs ` +
    `across ${full.nConditions} conditions (N = ${full.nSubjects} subjects). ` +
    `The partially completed ANOVA summary table is shown below. ` +
    `Fill in the missing values (marked "?") and determine whether the result is significant at α = ${alpha}.`;

  const r2   = (n: number) => Math.round(n * 100) / 100;
  const pStr = fmtP(full.pValue);
  const isRej = full.pValue < alpha;

  const decisionStatement = isRej
    ? `Reject H₀: there is sufficient evidence that mean ${variable} differs across conditions ` +
      `(F(${full.dfBT}, ${full.dfErr}) = ${r2(full.fStat)}, p ${pStr}).`
    : `Fail to reject H₀: there is insufficient evidence that mean ${variable} differs across conditions ` +
      `(F(${full.dfBT}, ${full.dfErr}) = ${r2(full.fStat)}, p ${pStr}).`;

  const studentTableHTML = renderRmaAnovaStudentTable(full, masked);

  const problemHTML = `
<div class="problem-box">
  <p>${studentPrompt}</p>
  ${studentTableHTML}
  <div class="problem-questions" style="margin-top:1rem;">
    <ol>
      <li>Fill in all missing values (marked "?") in the ANOVA table above.</li>
      <li>State the null and alternative hypotheses.</li>
      <li>Determine whether the result is statistically significant at α = ${alpha}.</li>
      <li>Write a one-sentence interpretation of the finding.</li>
    </ol>
  </div>
</div>`;

  const missingListHTML = missing.map(c =>
    `<li style="margin-bottom:0.3rem;"><code>${c.formula}</code></li>`
  ).join('');

  const keyHTML = `
<div class="key-box">
  <h4>Instructor Key</h4>

  <div class="key-section">
    <strong>1. Completed ANOVA Table</strong>
    ${renderRmaAnovaFullTable(full)}
    <p style="margin:0.5rem 0 0;font-size:0.85rem;color:#666;">Note: Between Subjects partitions individual differences from error; it is not tested with an F ratio.</p>
  </div>

  <div class="key-section">
    <strong>Effect Size</strong>
    <p>η² = SS<sub>BT</sub> / (SS<sub>BT</sub> + SS<sub>Error</sub>) = ${r2(full.ssBT)} / (${r2(full.ssBT)} + ${r2(full.ssErr)}) = ${full.eta2.toFixed(3)}</p>
  </div>

  <div class="key-section">
    <strong>2. Missing Values (step-by-step)</strong>
    <ol style="margin:0.5rem 0 0 1.2rem;padding:0;">
      ${missingListHTML}
    </ol>
  </div>

  <div class="key-section">
    <strong>3. Hypotheses</strong>
    <p>H₀: μ₁ = μ₂ = … = μ<sub>${full.nConditions}</sub> (all condition means are equal)</p>
    <p>H₁: At least one condition mean differs from the others</p>
  </div>

  <div class="key-section">
    <strong>4. Decision (α = ${alpha})</strong>
    <p>F(${full.dfBT}, ${full.dfErr}) = ${r2(full.fStat)}, p ${pStr}</p>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${decisionStatement}</p>
  </div>
</div>`;

  state.lastRmaAnovaPracticeData = {
    full, difficulty, variable, missingCells: missing,
    studentPrompt, decisionStatement,
  };

  (document.getElementById('rma-pg-problem-text') as HTMLElement).innerHTML   = problemHTML;
  (document.getElementById('rma-pg-instructor-key') as HTMLElement).innerHTML = keyHTML;
  (document.getElementById('rma-pg-output') as HTMLElement).style.display     = 'block';

  (document.getElementById('rma-pg-show-key') as HTMLInputElement).checked        = false;
  (document.getElementById('rma-pg-instructor-key') as HTMLElement).style.display = 'none';

  (document.getElementById('rma-pg-output') as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── RM ANOVA instructor key toggle ── */

export function toggleRmaAnovaKey(): void {
  const show = (document.getElementById('rma-pg-show-key') as HTMLInputElement).checked;
  (document.getElementById('rma-pg-instructor-key') as HTMLElement).style.display = show ? 'block' : 'none';
}

/* ── RM ANOVA Practice Excel export ── */

export function downloadRmaAnovaPracticeExcel(): void {
  const d = state.lastRmaAnovaPracticeData;
  if (!d) return;

  const { full, missingCells, studentPrompt, decisionStatement } = d;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pStr = fmtP(full.pValue);

  const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
  const mc = (row: string, col: string, val: number | null) =>
    masked.has(`${row}:${col}`) ? '?' : val !== null ? r2(val) : '—';

  const rows: (string | number | null)[][] = [
    ['STUDENT PROBLEM — One-Way RM ANOVA Table Practice'],
    [],
    ['Scenario'], [studentPrompt], [],
    ['Questions'],
    ['1.', 'Fill in all missing values (marked "?") in the ANOVA table below.'],
    ['2.', 'State the null and alternative hypotheses.'],
    ['3.', `Determine whether the result is statistically significant at α = ${full.alpha}.`],
    ['4.', 'Write a one-sentence interpretation of the finding.'],
    [],
    ['ANOVA Table (Student Version)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Between Treatments', mc('bt','SS',full.ssBT), mc('bt','df',full.dfBT), mc('bt','MS',full.msBT), mc('bt','F',full.fStat)],
    ['Within Treatment',   r2(full.ssBS + full.ssErr), full.dfBS + full.dfErr, '—', '—'],
    ['  Between Subjects', mc('bs','SS',full.ssBS), mc('bs','df',full.dfBS), mc('bs','MS',full.msBS), '—'],
    ['  Error',            mc('error','SS',full.ssErr), mc('error','df',full.dfErr), mc('error','MS',full.msErr), '—'],
    ['Total',              mc('total','SS',full.ssTotal), mc('total','df',full.dfTotal), '—', '—'],
    [],
    [],
    ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
    [],
    ['ANOVA Table (Completed)'],
    ['Source', 'SS', 'df', 'MS', 'F'],
    ['Between Treatments', r2(full.ssBT), full.dfBT, r2(full.msBT), r2(full.fStat)],
    ['Within Treatment',   r2(full.ssBS + full.ssErr), full.dfBS + full.dfErr, '—', '—'],
    ['  Between Subjects', r2(full.ssBS), full.dfBS, r2(full.msBS), '—'],
    ['  Error',            r2(full.ssErr), full.dfErr, r2(full.msErr), '—'],
    ['Total',              r2(full.ssTotal), full.dfTotal, '—', '—'],
    [],
    ['Missing Values (step-by-step)'],
    ...missingCells.map((c, i) => [`${i + 1}.`, c.formula]),
    [],
    ['Hypotheses'],
    ['H₀:', `μ₁ = μ₂ = … = μ${full.nConditions}  (all condition means are equal)`],
    ['H₁:', 'At least one condition mean differs from the others'],
    [],
    ['Decision'],
    [`F(${full.dfBT}, ${full.dfErr}) = ${r2(full.fStat)}, p ${pStr}`],
    [decisionStatement],
    [],
    ['Note: Between Subjects partitions individual differences from error; it is not tested with an F ratio.'],
    [],
    ['Effect Size'],
    [`η² = SS_BT / (SS_BT + SS_Error) = ${r2(full.ssBT)} / (${r2(full.ssBT)} + ${r2(full.ssErr)}) = ${full.eta2.toFixed(3)}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 85 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RM ANOVA Practice');
  XLSX.writeFile(wb, `statteacher_rma_anova_practice_${Date.now()}.xlsx`);
}
