import { state } from './state.ts';
import { gv } from './ui.ts';
import { pValue, tPValue, statsDict } from './stats.ts';
import type { AnovaDifficulty, AnovaFullTable, AnovaMissingCell, TableRow } from './types.ts';

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
  and obtains a sample mean of <em>x̄</em>&nbsp;=&nbsp;${xbar}&nbsp;${unit}.</p>
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
      z = (x̄ &minus; μ) / (σ / &radic;n)<br>
      z = (${xbar} &minus; ${mu0}) / (${sigma} / &radic;${n})<br>
      z = (${xbar} &minus; ${mu0}) / ${se}<br>
      z = ${zScore}
    </div>
    <p>Critical value: z<sub>crit</sub> = &plusmn;${zCrit} &nbsp;(α = ${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    <p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
    <p>Cohen's d = (x̄ &minus; μ) / σ = (${xbar} &minus; ${mu0}) / ${sigma} = ${cohenD}</p>
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

  /* Student problem text */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher is studying <strong>${variable}</strong> in <strong>${pop}</strong>.
  The null hypothesis posits a population mean of μ₀&nbsp;=&nbsp;${mu0}&nbsp;${unit}
  (population SD is unknown).</p>
  <p>The researcher collects a random sample of <em>n</em>&nbsp;=&nbsp;${n} participants
  and obtains a sample mean of <em>x̄</em>&nbsp;=&nbsp;${xbar}&nbsp;${unit},
  with a sample standard deviation of <em>s</em>&nbsp;=&nbsp;${sampleSD}&nbsp;${unit}.</p>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether the population mean
  ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>t</em> statistic.</li>
      <li>Determine the <em>p</em>-value and compute Cohen's <em>d</em>.</li>
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
      t = (x̄ &minus; μ₀) / (s / &radic;n)<br>
      t = (${xbar} &minus; ${mu0}) / (${sampleSD} / &radic;${n})<br>
      t = (${xbar} &minus; ${mu0}) / ${se}<br>
      t = ${tScore}
    </div>
    <p>df = n &minus; 1 = ${n} &minus; 1 = ${df}</p>
    <p>Critical value: t<sub>crit</sub> = &plusmn;${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    <p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
    <p>Cohen's d = (x̄ &minus; μ₀) / s = (${xbar} &minus; ${mu0}) / ${sampleSD} = ${cohenD}</p>
    <p>r&sup2; = t&sup2;&nbsp;/&nbsp;(t&sup2;&nbsp;+&nbsp;df) = ${parseFloat(String(rSq)).toFixed(3)} (${rSqPct}% of variance explained)</p>
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
    testType: 't_test',
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

  /* Student problem text */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher is studying <strong>${variable}</strong> in two groups:
  <strong>${group1}</strong> and <strong>${group2}</strong>.</p>
  <p>The sample statistics are:</p>
  <ul>
    <li><strong>${group1}:</strong> <em>n</em>&nbsp;=&nbsp;${n1}, <em>M</em>&nbsp;=&nbsp;${m1}&nbsp;${unit}, <em>SD</em>&nbsp;=&nbsp;${sd1}&nbsp;${unit}</li>
    <li><strong>${group2}:</strong> <em>n</em>&nbsp;=&nbsp;${n2}, <em>M</em>&nbsp;=&nbsp;${m2}&nbsp;${unit}, <em>SD</em>&nbsp;=&nbsp;${sd2}&nbsp;${unit}</li>
  </ul>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether ${group1} and ${group2}
  ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>t</em> statistic.</li>
      <li>Determine the <em>p</em>-value and compute Cohen's <em>d</em>.</li>
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
    <p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
    <p>Cohen's d = (M₁ &minus; M₂) / s<sub>p</sub> = ${cohenD}</p>
    <p>r&sup2; = t&sup2;&nbsp;/&nbsp;(t&sup2;&nbsp;+&nbsp;df) = ${parseFloat(String(rSq)).toFixed(3)} (${rSqPct}% of variance explained)</p>
  </div>

  <div class="key-section">
    <strong>4. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${interp}</p>
    <p>95% CI for (μ₁ − μ₂): [${ciLo},&nbsp;${ciUp}]&nbsp;${unit}</p>
  </div>
</div>`;

  state.lastProblemData = {
    testType: 'independent_t_test',
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

  (document.getElementById('pg-problem-text') as HTMLElement).innerHTML   = problemHTML;
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

  /* Student problem text */
  const problemHTML = `
<div class="problem-box">
  <p>A researcher measures <strong>${variable}</strong> in <em>n</em>&nbsp;=&nbsp;${n} participants
  at <strong>${pre}</strong> and again at <strong>${post}</strong>.</p>
  <p>The difference scores (<em>${pre} &minus; ${post}</em>) have a mean of
  <em>M</em><sub>D</sub>&nbsp;=&nbsp;${meanDiff}&nbsp;${unit}
  and a standard deviation of <em>SD</em><sub>D</sub>&nbsp;=&nbsp;${sdDiff}&nbsp;${unit}.</p>
  <p>Using α&nbsp;=&nbsp;${alpha} (${tailLabel}), test whether there is ${testPhraseHTML}.</p>
  <div class="problem-questions">
    <ol>
      <li>State the null and alternative hypotheses.</li>
      <li>Compute the <em>t</em> statistic.</li>
      <li>Determine the <em>p</em>-value and compute Cohen's <em>d</em>.</li>
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
      t = M<sub>D</sub> / (SD<sub>D</sub> / &radic;n)<br>
      t = ${meanDiff} / (${sdDiff} / &radic;${n})<br>
      t = ${meanDiff} / ${se}<br>
      t = ${tScore}
    </div>
    <p>df = n &minus; 1 = ${n} &minus; 1 = ${df}</p>
    <p>Critical value: t<sub>crit</sub> = &plusmn;${tCrit} &nbsp;(df&nbsp;=&nbsp;${df}, α&nbsp;=&nbsp;${alpha}, ${tailLabel})</p>
  </div>

  <div class="key-section">
    <strong>3. p-value &amp; Effect Size</strong>
    <p>p ${pval.startsWith('<') ? pval : '= ' + pval} &nbsp;&rarr;&nbsp; p ${pCompare}</p>
    <p>Cohen's d = M<sub>D</sub> / SD<sub>D</sub> = ${meanDiff} / ${sdDiff} = ${cohenD}</p>
    <p>r&sup2; = t&sup2;&nbsp;/&nbsp;(t&sup2;&nbsp;+&nbsp;df) = ${parseFloat(String(rSq)).toFixed(3)} (${rSqPct}% of variance explained)</p>
  </div>

  <div class="key-section">
    <strong>4. Decision</strong>
    <p><span class="${isRej ? 'val-reject' : 'val-fail'}">${isRej ? 'Reject H₀' : 'Fail to Reject H₀'}</span></p>
  </div>

  <div class="key-section">
    <strong>5. Interpretation</strong>
    <p>${interp}</p>
    <p>95% CI for μ<sub>D</sub>: [${ciLo},&nbsp;${ciUp}]&nbsp;${unit}</p>
  </div>
</div>`;

  state.lastProblemData = {
    testType: 'repeated_t_test',
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
      `and obtains a sample mean of x̄ = ${d.xbar} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether the population mean ` +
      `${d.testPhrasePlain}.`;
    const cohenFml = `(x̄ − μ) / σ = (${d.xbar} − ${d.mu0}) / ${d.sigma} = ${d.cohenD}`;
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
      ['Formula:',       'z = (x̄ − μ) / (σ / √n)'],
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
      `and obtains a sample mean of x̄ = ${d.xbar} ${d.unit}, ` +
      `with a sample standard deviation of s = ${d.sampleSD} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether the population mean ` +
      `${d.testPhrasePlain}.`;
    const cohenFml = `(x̄ − μ₀) / s = (${d.xbar} − ${d.mu0}) / ${d.sampleSD} = ${d.cohenD}`;
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
      ['Formula:',       't = (x̄ − μ₀) / (s / √n)'],
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
      `${d.group1}: n = ${d.n1}, M = ${d.m1} ${d.unit}, SD = ${d.sd1} ${d.unit}; ` +
      `${d.group2}: n = ${d.n2}, M = ${d.m2} ${d.unit}, SD = ${d.sd2} ${d.unit}. ` +
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
      `and a standard deviation of SD_D = ${d.sdDiff} ${d.unit}. ` +
      `Using α = ${d.alpha} (${d.tailLabel}), test whether there is ${d.testPhrasePlain}.`;
    const rSqStr = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;
    rows = [
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
      ['Formula:',       't = M_D / (SD_D / √n)'],
      ['Substitution:',  `t = ${d.meanDiff} / (${d.sdDiff} / √${d.n})`],
      ['Simplify:',      `t = ${d.meanDiff} / ${d.se}`],
      ['Result:',        `t = ${d.tScore}`],
      ['df:',            `n − 1 = ${d.n} − 1 = ${d.df}`],
      ['Critical value:', `t_crit = ±${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, ${d.tailLabel})`],
      [],
      ['3. p-value & Effect Size'],
      ['p-value:',   `p ${pvalStr}  →  p ${d.pCompare}`],
      ["Cohen's d:", `M_D / SD_D = ${d.meanDiff} / ${d.sdDiff} = ${d.cohenD}`],
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
