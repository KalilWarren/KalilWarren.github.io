import { state } from './state.ts';
import {
  runZTest,
  runTTest,
  runIndependentTTest,
  runRepeatedTTest,
  runANOVA,
  runPearson,
  runRegression,
} from './runners.ts';
import {
  generateStudentProblem,
  generateANOVAProblem,
  generateTwoWayANOVAProblem,
  generatePearsonProblem,
  generateRegressionTableProblem,
} from './problems.ts';
import { gv } from './ui.ts';
import { fPValue } from './stats.ts';
import type {
  TestType,
  DatasetBatchItem,
  BatchItem,
  TestResult,
} from './types.ts';

/* ── Seed IDs per test type ── */

const SEED_IDS: Record<TestType, string[]> = {
  z_test:             ['z-seed'],
  t_test:             ['t-seed'],
  independent_t_test: ['ind-seed1', 'ind-seed2'],
  repeated_t_test:    ['rep-seed'],
  anova:              ['anova-seed'],
  pearson:            ['pear-seed'],
  regression:         ['reg-seed'],
};

/* ── Sweepable parameters per test type ── */

const SWEEPABLE_PARAMS: Record<TestType, Array<{ label: string; id: string }>> = {
  z_test: [
    { label: 'μ₀ (Population Mean)', id: 'z-pop-mean'  },
    { label: 'σ (Population SD)',     id: 'z-pop-std'   },
    { label: 'n (Sample Size)',       id: 'z-n'         },
    { label: 'Treatment Effect',      id: 'z-tx-effect' },
    { label: 'Noise SD',              id: 'z-noise-sd'  },
    { label: 'α (Alpha)',             id: 'z-alpha'     },
  ],
  t_test: [
    { label: 'μ₀ (Population Mean)', id: 't-pop-mean'  },
    { label: 'σ (Population SD)',     id: 't-pop-std'   },
    { label: 'n (Sample Size)',       id: 't-n'         },
    { label: 'Treatment Effect',      id: 't-tx-effect' },
    { label: 'Noise SD',              id: 't-noise-sd'  },
    { label: 'α (Alpha)',             id: 't-alpha'     },
  ],
  independent_t_test: [
    { label: 'μ₁ (Group 1 Mean)',   id: 'ind-pop-mean1' },
    { label: 'σ₁ (Group 1 SD)',     id: 'ind-pop-sd1'   },
    { label: 'n₁ (Group 1 Size)',   id: 'ind-n1'        },
    { label: 'μ₂ (Group 2 Mean)',   id: 'ind-pop-mean2' },
    { label: 'σ₂ (Group 2 SD)',     id: 'ind-pop-sd2'   },
    { label: 'n₂ (Group 2 Size)',   id: 'ind-n2'        },
    { label: 'α (Alpha)',           id: 'ind-alpha'     },
  ],
  repeated_t_test: [
    { label: 'μ (Baseline Mean)',   id: 'rep-pop-mean'  },
    { label: 'σ (Baseline SD)',     id: 'rep-pop-std'   },
    { label: 'n (Sample Size)',     id: 'rep-n'         },
    { label: 'Treatment Effect',    id: 'rep-tx-effect' },
    { label: 'Noise SD',            id: 'rep-noise-sd'  },
    { label: 'α (Alpha)',           id: 'rep-alpha'     },
  ],
  anova: [
    { label: 'n (Obs per Cell)',    id: 'anova-n'      },
    { label: 'Grand Mean',          id: 'anova-mean'   },
    { label: 'Within-Cell SD',      id: 'anova-std'    },
    { label: 'Effect Size (SD)',    id: 'anova-effect' },
    { label: 'α (Alpha)',           id: 'anova-alpha'  },
  ],
  pearson: [
    { label: 'X Mean',              id: 'pear-x-mean'    },
    { label: 'X SD',                id: 'pear-x-std'     },
    { label: 'Y Mean',              id: 'pear-y-mean'    },
    { label: 'Y SD',                id: 'pear-y-std'     },
    { label: 'n (Sample Size)',     id: 'pear-n'         },
    { label: 'ρ₀ (Null Rho)',       id: 'pear-ro'        },
    { label: 'Treatment Effect',    id: 'pear-tx-effect' },
    { label: 'Noise SD',            id: 'pear-noise-sd'  },
    { label: 'α (Alpha)',           id: 'pear-alpha'     },
  ],
  regression: [
    { label: 'X Mean',              id: 'reg-x-mean'    },
    { label: 'X SD',                id: 'reg-x-std'     },
    { label: 'Y Mean',              id: 'reg-y-mean'    },
    { label: 'Y SD',                id: 'reg-y-std'     },
    { label: 'n (Sample Size)',     id: 'reg-n'         },
    { label: 'Treatment Effect',    id: 'reg-tx-effect' },
    { label: 'Noise SD',            id: 'reg-noise-sd'  },
    { label: 'α (Alpha)',           id: 'reg-alpha'     },
  ],
};

/* ── Helpers ── */

function inp(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

/** Temporarily clear seed inputs so Python uses None (random), then restore. */
function withRandomSeed(testType: TestType, fn: () => void): void {
  const ids   = SEED_IDS[testType];
  const saved = ids.map(id => inp(id).value);
  ids.forEach(id => { inp(id).value = ''; });
  fn();
  ids.forEach((id, i) => { inp(id).value = saved[i]; });
}

/** Parse all sweep rows in a container; return [{id, values}] for active rows. */
function parseSweepRows(rowsContainerId: string): Array<{ id: string; values: number[] }> {
  const container = document.getElementById(rowsContainerId);
  if (!container) return [];
  const result: Array<{ id: string; values: number[] }> = [];
  container.querySelectorAll<HTMLElement>('.sweep-row').forEach(row => {
    const paramSel  = row.querySelector<HTMLSelectElement>('.sweep-param');
    const modeSel   = row.querySelector<HTMLSelectElement>('.sweep-mode-select');
    if (!paramSel || !paramSel.value) return;
    const isRange = modeSel?.value === 'range';
    let values: number[] = [];
    if (isRange) {
      const start = parseFloat((row.querySelector<HTMLInputElement>('.sweep-start')?.value ?? ''));
      const end   = parseFloat((row.querySelector<HTMLInputElement>('.sweep-end')?.value   ?? ''));
      const step  = parseFloat((row.querySelector<HTMLInputElement>('.sweep-step')?.value  ?? ''));
      if (!isNaN(start) && !isNaN(end) && !isNaN(step) && step > 0) {
        for (let v = start; v <= end + 1e-9; v = Math.round((v + step) * 1e10) / 1e10) {
          values.push(v);
        }
      }
    } else {
      const raw = (row.querySelector<HTMLInputElement>('.sweep-values')?.value ?? '');
      values = raw.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
    }
    if (values.length > 0) result.push({ id: paramSel.value, values });
  });
  return result;
}

/** For iteration i, set each swept param's DOM input to its i-th value (repeat last if short). */
function applySweepOverrides(overrides: Array<{ id: string; values: number[] }>, i: number): void {
  for (const o of overrides) {
    inp(o.id).value = String(o.values[Math.min(i, o.values.length - 1)]);
  }
}

/** Dynamically add a sweep row to a container for the given test type. */
export function addSweepRow(rowsContainerId: string, testType: TestType): void {
  const container = document.getElementById(rowsContainerId);
  if (!container) return;
  const params = SWEEPABLE_PARAMS[testType];
  const optionsHtml = params.map(p =>
    `<option value="${p.id}">${p.label}</option>`).join('');
  const row = document.createElement('div');
  row.className = 'sweep-row';
  row.style.cssText = 'display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap; margin-bottom:0.5rem;';
  row.innerHTML = `
    <select class="sweep-param" style="min-width:180px; font-size:0.85rem;">
      <option value="">— select parameter —</option>
      ${optionsHtml}
    </select>
    <select class="sweep-mode-select" style="width:72px; font-size:0.85rem;">
      <option value="list">List</option>
      <option value="range">Range</option>
    </select>
    <div class="sweep-list-panel" style="display:flex; align-items:center;">
      <input class="sweep-values" type="text" placeholder="e.g. 10, 20, 30"
             style="width:200px; font-size:0.85rem;" />
    </div>
    <div class="sweep-range-panel" style="display:none; align-items:center; gap:0.3rem;">
      <input class="sweep-start" type="number" placeholder="Start" style="width:62px; font-size:0.85rem;" step="any" />
      <span style="font-size:0.82rem; color:#666;">–</span>
      <input class="sweep-end"   type="number" placeholder="End"   style="width:62px; font-size:0.85rem;" step="any" />
      <span style="font-size:0.82rem; color:#666;">step</span>
      <input class="sweep-step"  type="number" placeholder="Step"  style="width:55px; font-size:0.85rem;" step="any" min="0" />
    </div>
    <button class="sweep-remove-btn" type="button"
            style="background:none; border:1px solid #ccc; border-radius:4px; padding:0.2rem 0.45rem; cursor:pointer; color:#888; font-size:0.85rem; line-height:1;">✕</button>
  `;
  const modeSelect  = row.querySelector<HTMLSelectElement>('.sweep-mode-select')!;
  const listPanel   = row.querySelector<HTMLElement>('.sweep-list-panel')!;
  const rangePanel  = row.querySelector<HTMLElement>('.sweep-range-panel')!;
  modeSelect.addEventListener('change', () => {
    const isRange = modeSelect.value === 'range';
    listPanel.style.display  = isRange ? 'none' : 'flex';
    rangePanel.style.display = isRange ? 'flex'  : 'none';
  });
  row.querySelector('.sweep-remove-btn')!.addEventListener('click', () => row.remove());
  container.appendChild(row);
}

/** Call the appropriate runner for the given test type. */
function runTest(testType: TestType): TestResult {
  switch (testType) {
    case 'z_test':             return runZTest();
    case 't_test':             return runTTest();
    case 'independent_t_test': return runIndependentTTest();
    case 'repeated_t_test':    return runRepeatedTTest();
    case 'anova':              return runANOVA();
    case 'pearson':            return runPearson();
    case 'regression':         return runRegression();
  }
}

/** Snapshot the current alpha + tail context into state for narrative tests. */
function setContextFromDOM(testType: TestType): void {
  switch (testType) {
    case 'z_test':
      state.lastZTestContext = {
        alpha:     parseFloat(gv('z-alpha')),
        twoTailed: (document.getElementById('z-tail') as HTMLSelectElement).value === 'two',
      };
      break;
    case 't_test':
      state.lastTTestContext = {
        alpha:     parseFloat(gv('t-alpha')),
        twoTailed: (document.getElementById('t-tail') as HTMLSelectElement).value === 'two',
      };
      break;
    case 'independent_t_test':
      state.lastIndTTestContext = {
        alpha:     parseFloat(gv('ind-alpha')),
        twoTailed: (document.getElementById('ind-tail') as HTMLSelectElement).value === 'two',
      };
      break;
    case 'repeated_t_test':
      state.lastRmTTestContext = {
        alpha:     parseFloat(gv('rep-alpha')),
        twoTailed: (document.getElementById('rep-tail') as HTMLSelectElement).value === 'two',
      };
      break;
    default:
      break;
  }
}

/** Build AOA summary table rows from the current state.lastResult (ANOVA/regression only). */
function buildTableRows(testType: TestType): (string | number)[][] {
  if (testType === 'anova' || testType === 'regression') {
    const r = state.lastResult as { table: Array<Record<string, string | number | null>> };
    if (!r.table || !r.table.length) return [];
    const keys = Object.keys(r.table[0]);
    return [keys, ...r.table.map(row => keys.map(k => row[k] ?? ''))];
  }
  return [];
}

/** Build AOA dataset rows from the current state.lastResult. */
function buildDatasetRows(testType: TestType): (string | number)[][] {
  const r = state.lastResult!;
  switch (testType) {
    case 'z_test':
    case 't_test': {
      const ds = (r as { dataset: number[] }).dataset;
      return [['ID', 'Score'], ...ds.map((v, i) => [i + 1, v])];
    }
    case 'independent_t_test': {
      const r2 = r as { dataset1: number[]; dataset2: number[] };
      const len = Math.max(r2.dataset1.length, r2.dataset2.length);
      const rows: (string | number)[][] = [['ID', 'Group 1', 'Group 2']];
      for (let i = 0; i < len; i++) {
        rows.push([
          i + 1,
          r2.dataset1[i] !== undefined ? r2.dataset1[i] : '',
          r2.dataset2[i] !== undefined ? r2.dataset2[i] : '',
        ]);
      }
      return rows;
    }
    case 'repeated_t_test': {
      const r2 = r as { pre: number[]; post: number[] };
      return [
        ['ID', 'Pre', 'Post'],
        ...r2.pre.map((v, i) => [i + 1, v, r2.post[i]]),
      ];
    }
    case 'anova': {
      const r2 = r as { dataset: Record<string, string | number | null>[] };
      if (!r2.dataset.length) return [[]];
      const keys = Object.keys(r2.dataset[0]);
      return [keys, ...r2.dataset.map(row => keys.map(k => row[k] ?? ''))];
    }
    case 'pearson': {
      const r2 = r as { x_data: number[]; y_data: number[] };
      return [
        ['ID', 'X', 'Y'],
        ...r2.x_data.map((v, i) => [i + 1, v, r2.y_data[i]]),
      ];
    }
    case 'regression': {
      const r2 = r as { x_data: number[]; y_data: number[] };
      return [
        ['ID', 'X', 'Y'],
        ...r2.x_data.map((v, i) => [i + 1, v, r2.y_data[i]]),
      ];
    }
  }
}

/** Human-readable summary of current parameters for the Metadata sheet. */
function buildParamsUsed(testType: TestType): string {
  switch (testType) {
    case 'z_test':
      return `μ₀=${gv('z-pop-mean')}, σ=${gv('z-pop-std')}, n=${gv('z-n')}, α=${gv('z-alpha')}`;
    case 't_test':
      return `μ₀=${gv('t-pop-mean')}, σ=${gv('t-pop-std')}, n=${gv('t-n')}, α=${gv('t-alpha')}`;
    case 'independent_t_test':
      return `μ₁=${gv('ind-pop-mean1')}, σ₁=${gv('ind-pop-sd1')}, n₁=${gv('ind-n1')}, μ₂=${gv('ind-pop-mean2')}, σ₂=${gv('ind-pop-sd2')}, n₂=${gv('ind-n2')}, α=${gv('ind-alpha')}`;
    case 'repeated_t_test':
      return `μ₀=${gv('rep-pop-mean')}, σ=${gv('rep-pop-std')}, n=${gv('rep-n')}, tx=${gv('rep-tx-effect')}, noise=${gv('rep-noise-sd')}, α=${gv('rep-alpha')}`;
    case 'anova':
      return `factors=${gv('anova-factors')}, n=${gv('anova-n')}, mean=${gv('anova-mean')}, std=${gv('anova-std')}, effect=${gv('anova-effect')}, α=${gv('anova-alpha')}`;
    case 'pearson':
      return `x_mean=${gv('pear-x-mean')}, x_std=${gv('pear-x-std')}, y_mean=${gv('pear-y-mean')}, y_std=${gv('pear-y-std')}, n=${gv('pear-n')}, ρ₀=${gv('pear-ro')}, α=${gv('pear-alpha')}`;
    case 'regression':
      return `x_mean=${gv('reg-x-mean')}, x_std=${gv('reg-x-std')}, y_mean=${gv('reg-y-mean')}, y_std=${gv('reg-y-std')}, n=${gv('reg-n')}, α=${gv('reg-alpha')}`;
  }
}

/** Local p formatter matching problems.ts fmtP (for ANOVA p-values). */
function fmtPLocal(p: number): string {
  if (p < 0.001) return '< .001';
  return '= ' + p.toFixed(3).replace(/^0\./, '.');
}

/**
 * Build the full Excel AOA (matching individual download functions) + brief instructor summary.
 * problemRows mirrors the AOA built by downloadProblemExcel / downloadAnovaPracticeExcel / etc.
 */
function buildPromptAndKey(testType: TestType): {
  problemRows:   (string | number | null)[][];
  instructorKey: string;
  decision:      string;
  effectSize:    string;
} {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const none = { problemRows: [] as (string | number | null)[][], instructorKey: '', decision: '—', effectSize: '—' };

  switch (testType) {

    /* ── Z-Test ── */
    case 'z_test': {
      const d = state.lastProblemData;
      if (!d || d.testType !== 'z_test') return none;
      const pvalStr  = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
      const decStr   = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';
      const narrative =
        `A researcher is studying ${d.variable} in ${d.pop}. ` +
        `Historically, the population mean is μ = ${d.mu0} ${d.unit}, ` +
        `with a known population standard deviation of σ = ${d.sigma} ${d.unit}. ` +
        `The researcher collects a random sample of n = ${d.n} participants ` +
        `and obtains a sample mean of x̄ = ${d.xbar} ${d.unit}. ` +
        `Using α = ${d.alpha} (${d.tailLabel}), test whether the population mean ${d.testPhrasePlain}.`;
      const cohenFml = `(x̄ − μ) / σ = (${d.xbar} − ${d.mu0}) / ${d.sigma} = ${d.cohenD}`;
      return {
        problemRows: [
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
        ],
        instructorKey: d.interp,
        decision:      decStr,
        effectSize:    `d = ${d.cohenD}`,
      };
    }

    /* ── One-Sample T-Test ── */
    case 't_test': {
      const d = state.lastProblemData;
      if (!d || d.testType !== 't_test') return none;
      const pvalStr  = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
      const decStr   = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';
      const narrative =
        `A researcher is studying ${d.variable} in ${d.pop}. ` +
        `The null hypothesis posits a population mean of μ₀ = ${d.mu0} ${d.unit} (population SD is unknown). ` +
        `The researcher collects a random sample of n = ${d.n} participants ` +
        `and obtains a sample mean of x̄ = ${d.xbar} ${d.unit}, ` +
        `with a sample standard deviation of s = ${d.sampleSD} ${d.unit}. ` +
        `Using α = ${d.alpha} (${d.tailLabel}), test whether the population mean ${d.testPhrasePlain}.`;
      const cohenFml = `(x̄ − μ₀) / s = (${d.xbar} − ${d.mu0}) / ${d.sampleSD} = ${d.cohenD}`;
      const rSqStr   = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;
      return {
        problemRows: [
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
        ],
        instructorKey: d.interp,
        decision:      decStr,
        effectSize:    `d = ${d.cohenD}`,
      };
    }

    /* ── Independent-Samples T-Test ── */
    case 'independent_t_test': {
      const d = state.lastProblemData;
      if (!d || d.testType !== 'independent_t_test') return none;
      const pvalStr = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
      const decStr  = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';
      const rSqStr  = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;
      const narrative =
        `A researcher is studying ${d.variable} in two groups: ${d.group1} and ${d.group2}. ` +
        `The sample statistics are: ` +
        `${d.group1}: n = ${d.n1}, M = ${d.m1} ${d.unit}, SD = ${d.sd1} ${d.unit}; ` +
        `${d.group2}: n = ${d.n2}, M = ${d.m2} ${d.unit}, SD = ${d.sd2} ${d.unit}. ` +
        `Using α = ${d.alpha} (${d.tailLabel}), test whether ${d.group1} and ${d.group2} ${d.testPhrasePlain}.`;
      return {
        problemRows: [
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
          ['SE:',              `√(s²p × (1/n₁ + 1/n₂)) = ${d.se}`],
          ['Formula:',         't = (M₁ − M₂) / SE'],
          ['Result:',          `t = (${d.m1} − ${d.m2}) / ${d.se} = ${d.tScore}`],
          ['df:',              `(n₁ − 1) + (n₂ − 1) = ${d.df1} + ${d.df2} = ${d.df}`],
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
        ],
        instructorKey: d.interp,
        decision:      decStr,
        effectSize:    `d = ${d.cohenD}`,
      };
    }

    /* ── Repeated-Measures T-Test ── */
    case 'repeated_t_test': {
      const d = state.lastProblemData;
      if (!d || d.testType !== 'repeated_t_test') return none;
      const pvalStr = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
      const decStr  = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';
      const rSqStr  = `t² / (t² + df) = ${d.tScore}² / (${d.tScore}² + ${d.df}) = ${parseFloat(String(d.rSq)).toFixed(3)} (${d.rSqPct}% variance explained)`;
      const narrative =
        `A researcher measures ${d.variable} in n = ${d.n} participants at ${d.pre} and again at ${d.post}. ` +
        `The difference scores (${d.pre} − ${d.post}) have a mean of M_D = ${d.meanDiff} ${d.unit} ` +
        `and a standard deviation of SD_D = ${d.sdDiff} ${d.unit}. ` +
        `Using α = ${d.alpha} (${d.tailLabel}), test whether there is ${d.testPhrasePlain}.`;
      return {
        problemRows: [
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
        ],
        instructorKey: d.interp,
        decision:      decStr,
        effectSize:    `d = ${d.cohenD}`,
      };
    }

    /* ── Pearson Correlation ── */
    case 'pearson': {
      const d = state.lastPearsonProblemData;
      if (!d) return none;
      const pvalStr  = d.pval.startsWith('<') ? d.pval : '= ' + d.pval;
      const decStr   = d.isRej ? 'Reject H₀' : 'Fail to Reject H₀';
      const rNum     = parseFloat(String(d.r));
      const dirPhrase = d.twoTailed
        ? 'a linear relationship'
        : (rNum >= 0 ? 'a positive linear relationship' : 'a negative linear relationship');
      const critLine = d.twoTailed
        ? `t_crit = ±${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, two-tailed)`
        : `t_crit = ${d.tCrit}  (df = ${d.df}, α = ${d.alpha}, one-tailed)`;
      const rSqStr = `${d.r}² = ${d.rSq} — Approximately ${d.rSqPct}% of the variance in ${d.variableY} is explained by ${d.variableX}.`;
      const narrative =
        `A researcher is investigating the relationship between ${d.variableX} and ${d.variableY} ` +
        `in ${d.population}. ` +
        `A random sample of n = ${d.n} participants was obtained. ` +
        `The sample correlation was r = ${d.r}. ` +
        `Using α = ${d.alpha} (${d.tailLabel}), test whether there is ${dirPhrase} ` +
        `between ${d.variableX} and ${d.variableY}.`;
      return {
        problemRows: [
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
        ],
        instructorKey: d.interp,
        decision:      decStr,
        effectSize:    `r² = ${d.rSq}`,
      };
    }

    /* ── ANOVA (one-way or two-way) ── */
    case 'anova': {
      if (state.lastTwoWayAnovaPracticeData) {
        const d = state.lastTwoWayAnovaPracticeData;
        const { full, missingCells, studentPrompt, decisionStatements } = d;
        const r2f = (n: number) => Math.round(n * 100) / 100;
        const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
        const mc = (row: string, col: string, val: number | null): string | number =>
          masked.has(`${row}:${col}`) ? '?' : val !== null ? r2f(val) : '—';
        const intLabel = `${full.factorNameA} × ${full.factorNameB}`;
        return {
          problemRows: [
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
            [full.factorNameA, mc('A','SS',full.ssA),     mc('A','df',full.dfA),     mc('A','MS',full.msA),     mc('A','F',full.fA)],
            [full.factorNameB, mc('B','SS',full.ssB),     mc('B','df',full.dfB),     mc('B','MS',full.msB),     mc('B','F',full.fB)],
            [intLabel,         mc('AxB','SS',full.ssAB),  mc('AxB','df',full.dfAB),  mc('AxB','MS',full.msAB),  mc('AxB','F',full.fAB)],
            ['Error',          mc('error','SS',full.ssE), mc('error','df',full.dfE), mc('error','MS',full.msE), '—'],
            ['Total',          mc('total','SS',full.ssTotal), mc('total','df',full.dfTotal), '—', '—'],
            [], [],
            ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
            [],
            ['ANOVA Table (Completed)'],
            ['Source', 'SS', 'df', 'MS', 'F'],
            [full.factorNameA, r2f(full.ssA),    full.dfA,  r2f(full.msA),  r2f(full.fA)],
            [full.factorNameB, r2f(full.ssB),    full.dfB,  r2f(full.msB),  r2f(full.fB)],
            [intLabel,         r2f(full.ssAB),   full.dfAB, r2f(full.msAB), r2f(full.fAB)],
            ['Error',          r2f(full.ssE),    full.dfE,  r2f(full.msE),  '—'],
            ['Total',          r2f(full.ssTotal),full.dfTotal,'—','—'],
            [],
            ['Missing Values (step-by-step)'],
            ...missingCells.map((c, i) => [`${i + 1}.`, c.formula] as (string | number | null)[]),
            [],
            ['Decisions (α = ' + full.alpha + ')'],
            ...decisionStatements.map(s => [s] as (string | number | null)[]),
          ],
          instructorKey: decisionStatements.join(' | '),
          decision:      decisionStatements.join('; '),
          effectSize:    '—',
        };
      }
      /* One-way */
      const d = state.lastAnovaPracticeData;
      if (!d) return none;
      const { full, missingCells, studentPrompt, decisionStatement } = d;
      const r2f = (n: number) => Math.round(n * 100) / 100;
      const pStr = fmtPLocal(full.pValue);
      const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
      const mc = (row: string, col: string, val: number | null) =>
        masked.has(`${row}:${col}`) ? '?' : val !== null ? r2f(val) : '—';
      return {
        problemRows: [
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
          ['Total',   mc('total','SS',full.ssTotal),     mc('total','df',full.dfTotal),     '—', '—'],
          [], [],
          ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
          [],
          ['ANOVA Table (Completed)'],
          ['Source', 'SS', 'df', 'MS', 'F'],
          ['Between', r2f(full.ssBetween), full.dfBetween, r2f(full.msBetween), r2f(full.fStat)],
          ['Within',  r2f(full.ssWithin),  full.dfWithin,  r2f(full.msWithin),  '—'],
          ['Total',   r2f(full.ssTotal),   full.dfTotal,   '—', '—'],
          [],
          ['Missing Values (step-by-step)'],
          ...missingCells.map((c, i) => [`${i + 1}.`, c.formula] as (string | number | null)[]),
          [],
          ['Hypotheses'],
          ['H₀:', `μ₁ = μ₂ = … = μ${full.k}  (all group means are equal)`],
          ['H₁:', 'At least one group mean differs from the others'],
          [],
          ['Decision'],
          [`F(${full.dfBetween}, ${full.dfWithin}) = ${r2f(full.fStat)}, p ${pStr}`],
          [decisionStatement],
        ],
        instructorKey: decisionStatement,
        decision:      decisionStatement,
        effectSize:    '—',
      };
    }

    /* ── Simple Linear Regression ── */
    case 'regression': {
      const d = state.lastRegPracticeData;
      if (!d) return none;
      const { full, missingCells, studentPrompt, decisionStatement, slopeInterp, rSqInterp, difficulty } = d;
      const r2f  = (n: number) => Math.round(n * 100) / 100;
      const pStr = fPValue(full.fStat, full.dfRegression, full.dfResidual);
      const pFmt = pStr.startsWith('<') ? pStr : '= ' + pStr;
      const b1Str = isNaN(full.b1) ? '?' : r2f(full.b1).toString();
      const b0Str = isNaN(full.b0) ? '?' : r2f(full.b0).toString();
      const eqDisplay = isNaN(full.b1) ? full.equation : `Ŷ = ${b1Str}(${full.variableX}) + ${b0Str}`;
      const masked = new Set(missingCells.map(c => `${c.row}:${c.col}`));
      const mc = (row: string, col: string, val: number | null) =>
        masked.has(`${row}:${col}`) ? '?' : val !== null ? r2f(val) : '—';
      return {
        problemRows: [
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
          [], [],
          ['━━━━━━  INSTRUCTOR KEY  ━━━━━━'],
          [],
          ['Regression Table (Completed)'],
          ['Source', 'SS', 'df', 'MS', 'F'],
          ['Regression', r2f(full.ssRegression), full.dfRegression, r2f(full.msRegression), r2f(full.fStat)],
          ['Residual',   r2f(full.ssResidual),   full.dfResidual,   r2f(full.msResidual),   '—'],
          ['Total',      r2f(full.ssTotal),      full.dfTotal,      '—', '—'],
          [],
          ['Missing Values (step-by-step)'],
          ...missingCells.map((c, i) => [`${i + 1}.`, c.formula] as (string | number | null)[]),
          [],
          ['Regression Equation'], [eqDisplay],
          [],
          ['Hypotheses'],
          ['H₀:', `β₁ = 0 (${full.variableX} does not predict ${full.variableY})`],
          ['H₁:', `β₁ ≠ 0 (${full.variableX} significantly predicts ${full.variableY})`],
          [],
          ['Decision'],
          [`F(${full.dfRegression}, ${full.dfResidual}) = ${r2f(full.fStat)}, p ${pFmt}`],
          [decisionStatement],
          [],
          ['Slope Interpretation'], [slopeInterp],
          [],
          ['R² Interpretation'],
          [`R² = ${(full.rSquared).toFixed(3)} (${(full.rSquared * 100).toFixed(1)}%)`],
          [rSqInterp],
          [],
          ['Additional Statistics'],
          ['n:', full.n], ['alpha:', full.alpha],
          ['SS_regression:', r2f(full.ssRegression)], ['SS_residual:', r2f(full.ssResidual)], ['SS_total:', r2f(full.ssTotal)],
          ['df_regression:', full.dfRegression], ['df_residual:', full.dfResidual], ['df_total:', full.dfTotal],
          ['MS_regression:', r2f(full.msRegression)], ['MS_residual:', r2f(full.msResidual)],
          ['F:', r2f(full.fStat)], ['p:', pStr],
          ['R²:', (full.rSquared).toFixed(3)],
          ['b1 (slope):', isNaN(full.b1) ? '?' : r2f(full.b1)],
          ['b0 (intercept):', isNaN(full.b0) ? '?' : r2f(full.b0)],
          ['Variable X:', full.variableX], ['Variable Y:', full.variableY],
          ['Population:', full.population],
        ],
        instructorKey: `${decisionStatement} ${slopeInterp} ${rSqInterp}`,
        decision:      decisionStatement,
        effectSize:    `R² = ${r2(full.rSquared)}`,
      };
    }
  }
}

/* ── Workbook helper ── */

function setColWidths(ws: object, widths: number[]): void {
  (ws as Record<string, unknown>)['!cols'] = widths.map(w => ({ wch: w }));
}

/* ── Export: generateDatasetBatch ── */

export async function generateDatasetBatch(
  testType:     TestType,
  countInputId: string,
  statusId:     string,
  dlBtnId:      string,
  sweepRowsId:  string,
): Promise<void> {
  const overrides = parseSweepRows(sweepRowsId);
  const count = overrides.length > 0
    ? Math.min(50, Math.max(1, Math.max(...overrides.map(o => o.values.length))))
    : Math.max(1, Math.min(20, parseInt((document.getElementById(countInputId) as HTMLInputElement).value, 10) || 5));

  const statusEl = document.getElementById(statusId) as HTMLElement;
  const dlBtn    = document.getElementById(dlBtnId)   as HTMLButtonElement;
  const genBtn   = document.getElementById(countInputId.replace('-count', '-gen-btn')) as HTMLButtonElement | null;

  /* Save original DOM values for swept params so we can restore them */
  const savedOverrides: Record<string, string> = {};
  overrides.forEach(o => { savedOverrides[o.id] = inp(o.id).value; });

  state.lastDatasetBatch = null;
  dlBtn.style.display = 'none';
  statusEl.style.display = 'block';
  if (genBtn) genBtn.disabled = true;

  const timestamp = Date.now();
  const items: DatasetBatchItem[] = [];

  try {
    for (let i = 0; i < count; i++) {
      applySweepOverrides(overrides, i);
      statusEl.textContent = `Generating dataset ${i + 1} of ${count}…`;
      await new Promise<void>(r => setTimeout(r, 0));

      withRandomSeed(testType, () => {
        state.lastResult = runTest(testType);
      });

      items.push({
        problemID:      i + 1,
        testType,
        datasetRows:    buildDatasetRows(testType),
        tableRows:      buildTableRows(testType),
        alpha:          parseFloat(gv(testType === 'z_test' ? 'z-alpha'
                          : testType === 't_test'             ? 't-alpha'
                          : testType === 'independent_t_test' ? 'ind-alpha'
                          : testType === 'repeated_t_test'    ? 'rep-alpha'
                          : testType === 'anova'              ? 'anova-alpha'
                          : testType === 'pearson'            ? 'pear-alpha'
                          : 'reg-alpha')),
        parametersUsed: buildParamsUsed(testType),
        timestamp:      timestamp + i,
      });
    }

    state.lastDatasetBatch = items;
    dlBtn.style.display    = '';
    statusEl.textContent   = `✓ ${count} dataset${count > 1 ? 's' : ''} ready to download.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    /* Restore original param values */
    overrides.forEach(o => { inp(o.id).value = savedOverrides[o.id]; });
    if (genBtn) genBtn.disabled = false;
  }
}

/* ── Export: generateBatch (student problems) ── */

export async function generateBatch(
  testType:     TestType,
  countInputId: string,
  statusId:     string,
  dlBtnId:      string,
  sweepRowsId:  string,
): Promise<void> {
  const overrides = parseSweepRows(sweepRowsId);
  const count = overrides.length > 0
    ? Math.min(50, Math.max(1, Math.max(...overrides.map(o => o.values.length))))
    : Math.max(1, Math.min(20, parseInt((document.getElementById(countInputId) as HTMLInputElement).value, 10) || 5));

  const statusEl = document.getElementById(statusId) as HTMLElement;
  const dlBtn    = document.getElementById(dlBtnId)   as HTMLButtonElement;
  const genBtn   = document.getElementById(countInputId.replace('-count', '-gen-btn')) as HTMLButtonElement | null;

  /* Save original DOM values for swept params so we can restore them */
  const savedOverrides: Record<string, string> = {};
  overrides.forEach(o => { savedOverrides[o.id] = inp(o.id).value; });

  state.lastBatch = null;
  dlBtn.style.display = 'none';
  statusEl.style.display = 'block';
  if (genBtn) genBtn.disabled = true;

  const timestamp = Date.now();
  const items: BatchItem[] = [];

  try {
    for (let i = 0; i < count; i++) {
      applySweepOverrides(overrides, i);
      statusEl.textContent = `Generating problem ${i + 1} of ${count}…`;
      await new Promise<void>(r => setTimeout(r, 0));

      /* Run the statistical engine with a random seed */
      withRandomSeed(testType, () => {
        state.lastResult = runTest(testType);
      });

      /* Set context so generators can read alpha/tail */
      setContextFromDOM(testType);

      /* Call the appropriate problem generator (writes to state) */
      if (testType === 'anova') {
        const isOneWay =
          state.lastResult!.type === 'anova' &&
          (state.lastResult as { table: Array<Record<string, unknown>> }).table.length > 0 &&
          (state.lastResult as { table: Array<Record<string, unknown>> }).table[0]['Source'] !== 'Between';

        /* Clear previous anova practice data to ensure correct branch is captured */
        state.lastAnovaPracticeData     = null;
        state.lastTwoWayAnovaPracticeData = null;

        if (isOneWay) {
          generateANOVAProblem();
        } else {
          generateTwoWayANOVAProblem();
        }
      } else if (testType === 'pearson') {
        generatePearsonProblem();
      } else if (testType === 'regression') {
        generateRegressionTableProblem();
      } else {
        generateStudentProblem();
      }

      const { problemRows, instructorKey, decision, effectSize } = buildPromptAndKey(testType);

      items.push({
        problemID:      i + 1,
        testType,
        datasetRows:    buildDatasetRows(testType),
        tableRows:      buildTableRows(testType),
        problemRows,
        instructorKey,
        decision,
        effectSize,
        alpha:          parseFloat(gv(testType === 'z_test' ? 'z-alpha'
                          : testType === 't_test'             ? 't-alpha'
                          : testType === 'independent_t_test' ? 'ind-alpha'
                          : testType === 'repeated_t_test'    ? 'rep-alpha'
                          : testType === 'anova'              ? 'anova-alpha'
                          : testType === 'pearson'            ? 'pear-alpha'
                          : 'reg-alpha')),
        parametersUsed: buildParamsUsed(testType),
        timestamp:      timestamp + i,
      });
    }

    state.lastBatch     = items;
    dlBtn.style.display = '';
    statusEl.textContent = `✓ ${count} problem${count > 1 ? 's' : ''} ready to download.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    /* Restore original param values */
    overrides.forEach(o => { inp(o.id).value = savedOverrides[o.id]; });
    if (genBtn) genBtn.disabled = false;
  }
}

/* ── Export: downloadDatasetBatchWorkbook ── */

export function downloadDatasetBatchWorkbook(): void {
  const batch = state.lastDatasetBatch;
  if (!batch || !batch.length) return;

  const wb = XLSX.utils.book_new();

  for (const item of batch) {
    const sheetRows: (string | number | null)[][] = [
      ...(item.datasetRows as (string | number | null)[][]),
    ];
    if (item.tableRows.length) {
      sheetRows.push([]);
      sheetRows.push(['Statistical Summary Table:']);
      sheetRows.push(...(item.tableRows as (string | number | null)[][]));
    }
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const colCount = Math.max(
      item.datasetRows[0]?.length ?? 2,
      item.tableRows[0]?.length ?? 0,
    );
    setColWidths(ws, Array(colCount).fill(14).map((v, i) => i === 0 ? 12 : v));
    XLSX.utils.book_append_sheet(wb, ws, `Dataset_${item.problemID}`);
  }

  /* Metadata sheet */
  const metaRows: (string | number)[][] = [
    ['Problem ID', 'Test Type', 'Alpha', 'Parameters Used', 'Timestamp'],
    ...batch.map(item => [
      item.problemID,
      item.testType,
      item.alpha,
      item.parametersUsed,
      new Date(item.timestamp).toISOString(),
    ]),
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaRows as (string | number | null)[][]);
  setColWidths(metaWs, [12, 24, 8, 60, 24]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `StatTeacherToolkit_Datasets_Batch_${Date.now()}.xlsx`);
}

/* ── Export: downloadBatchWorkbook ── */

export function downloadBatchWorkbook(): void {
  const batch = state.lastBatch;
  if (!batch || !batch.length) return;

  const wb = XLSX.utils.book_new();

  /* Dataset sheets — each includes raw data, optional summary table, and student problem */
  for (const item of batch) {
    const sheetRows: (string | number | null)[][] = [
      ...(item.datasetRows as (string | number | null)[][]),
    ];
    if (item.tableRows.length) {
      sheetRows.push([]);
      sheetRows.push(['Statistical Summary Table:']);
      sheetRows.push(...(item.tableRows as (string | number | null)[][]));
    }
    if (item.problemRows.length) {
      sheetRows.push([]);
      sheetRows.push(...item.problemRows);
    }
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    const dataCols = item.datasetRows[0]?.length ?? 2;
    const tableCols = item.tableRows[0]?.length ?? 0;
    const colCount = Math.max(dataCols, tableCols, 2);
    /* Col 1: 18ch label, Col 2: 90ch value (for problem text), rest: 14ch */
    setColWidths(ws, Array(colCount).fill(14).map((_, ci) => ci === 0 ? 18 : ci === 1 ? 90 : 14));
    XLSX.utils.book_append_sheet(wb, ws, `Dataset_${item.problemID}`);
  }

  /* Instructor_Key sheet */
  const keyRows: (string | number)[][] = [
    ['Problem ID', 'Decision', 'Effect Size', 'Instructor Key'],
    ...batch.map(item => [item.problemID, item.decision, item.effectSize, item.instructorKey]),
  ];
  const keyWs = XLSX.utils.aoa_to_sheet(keyRows as (string | number | null)[][]);
  setColWidths(keyWs, [12, 20, 14, 80]);
  XLSX.utils.book_append_sheet(wb, keyWs, 'Instructor_Key');

  /* Metadata sheet */
  const metaRows: (string | number)[][] = [
    ['Problem ID', 'Test Type', 'Alpha', 'Parameters Used', 'Timestamp'],
    ...batch.map(item => [
      item.problemID,
      item.testType,
      item.alpha,
      item.parametersUsed,
      new Date(item.timestamp).toISOString(),
    ]),
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaRows as (string | number | null)[][]);
  setColWidths(metaWs, [12, 24, 8, 60, 24]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `StatTeacherToolkit_Batch_${Date.now()}.xlsx`);
}
