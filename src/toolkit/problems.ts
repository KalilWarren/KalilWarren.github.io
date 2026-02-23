import { state } from './state.ts';
import { gv } from './ui.ts';
import { pValue, tPValue, statsDict } from './stats.ts';

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

/* ── Dispatcher ── */

export function generateStudentProblem(): void {
  if (!state.lastResult) return;
  if (state.lastResult.type === 'z_test')      generateZTestProblem();
  else if (state.lastResult.type === 't_test') generateTTestProblem();
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

  } else {
    // t_test
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
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 18 }, { wch: 90 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}
