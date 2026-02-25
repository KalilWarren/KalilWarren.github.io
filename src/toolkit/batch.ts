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

/** Build plain-text studentPrompt, instructorKey, decision, effectSize from current state. */
function buildPromptAndKey(testType: TestType): {
  studentPrompt: string;
  instructorKey:  string;
  decision:       string;
  effectSize:     string;
} {
  const r2 = (n: number) => Math.round(n * 100) / 100;

  switch (testType) {
    case 'z_test':
    case 't_test':
    case 'independent_t_test':
    case 'repeated_t_test': {
      const d = state.lastProblemData;
      if (!d) return { studentPrompt: '', instructorKey: '', decision: '—', effectSize: '—' };

      let prompt = '';
      let key    = '';
      let dec    = '';
      let eff    = '—';

      if (d.testType === 'z_test') {
        const z = d as typeof d & { variable: string; population: string; unit: string; n: string | number; zScore: string | number; zCrit: string | number; cohenD: string | number; ciLo: string | number; ciUp: string | number; alpha: number; twoTailed: boolean; h0: string; h1: string; isRej: boolean; pval: string };
        prompt = `A researcher measured ${z.variable} (${(z as any).unit}) in ${z.n} ${z.population}. ` +
                 `${z.h0} Test: Z = ${z.zScore}, Z_crit = ${z.zCrit}. α = ${z.alpha}${z.twoTailed ? ' (two-tailed)' : ' (one-tailed)'}.`;
        key    = `Z = ${z.zScore}, SE = ${(z as any).se}, Cohen's d = ${z.cohenD}, 95% CI [${z.ciLo}, ${z.ciUp}], p ${z.pval}. Decision: ${z.isRej ? 'Reject' : 'Fail to reject'} H₀.`;
        dec    = z.isRej ? 'Reject H₀' : 'Fail to reject H₀';
        eff    = `d = ${z.cohenD}`;
      } else if (d.testType === 't_test') {
        const t = d as typeof d & { variable: string; population: string; unit: string; n: string | number; tScore: string | number; tCrit: string | number; cohenD: string | number; ciLo: string | number; ciUp: string | number; alpha: number; twoTailed: boolean; h0: string; h1: string; isRej: boolean; pval: string };
        prompt = `A researcher measured ${t.variable} (${(t as any).unit}) in ${t.n} ${t.population}. ` +
                 `${t.h0} Test: t = ${t.tScore}, t_crit = ${t.tCrit}. α = ${t.alpha}${t.twoTailed ? ' (two-tailed)' : ' (one-tailed)'}.`;
        key    = `t = ${t.tScore}, SE = ${(t as any).se}, Cohen's d = ${t.cohenD}, 95% CI [${t.ciLo}, ${t.ciUp}], p ${t.pval}. Decision: ${t.isRej ? 'Reject' : 'Fail to reject'} H₀.`;
        dec    = t.isRej ? 'Reject H₀' : 'Fail to reject H₀';
        eff    = `d = ${t.cohenD}`;
      } else if (d.testType === 'independent_t_test') {
        const it = d as typeof d & { variable: string; group1: string; group2: string; unit: string; n1: string | number; n2: string | number; tScore: string | number; tCrit: string | number; cohenD: string | number; ciLo: string | number; ciUp: string | number; alpha: number; twoTailed: boolean; h0: string; h1: string; isRej: boolean; pval: string };
        prompt = `A researcher compared ${it.variable} (${(it as any).unit}) between ${it.group1} (n=${it.n1}) and ${it.group2} (n=${it.n2}). ` +
                 `${it.h0} Test: t = ${it.tScore}, t_crit = ${it.tCrit}. α = ${it.alpha}${it.twoTailed ? ' (two-tailed)' : ' (one-tailed)'}.`;
        key    = `t = ${it.tScore}, SE = ${(it as any).se}, Cohen's d = ${it.cohenD}, 95% CI [${it.ciLo}, ${it.ciUp}], p ${it.pval}. Decision: ${it.isRej ? 'Reject' : 'Fail to reject'} H₀.`;
        dec    = it.isRej ? 'Reject H₀' : 'Fail to reject H₀';
        eff    = `d = ${it.cohenD}`;
      } else if (d.testType === 'repeated_t_test') {
        const rm = d as typeof d & { variable: string; pre: string; post: string; unit: string; n: string | number; tScore: string | number; tCrit: string | number; cohenD: string | number; ciLo: string | number; ciUp: string | number; alpha: number; twoTailed: boolean; h0: string; h1: string; isRej: boolean; pval: string };
        prompt = `A researcher measured ${rm.variable} (${(rm as any).unit}) at ${rm.pre} and ${rm.post} for ${rm.n} participants. ` +
                 `${rm.h0} Test: t = ${rm.tScore}, t_crit = ${rm.tCrit}. α = ${rm.alpha}${rm.twoTailed ? ' (two-tailed)' : ' (one-tailed)'}.`;
        key    = `t = ${rm.tScore}, SE = ${(rm as any).se}, Cohen's d = ${rm.cohenD}, 95% CI [${rm.ciLo}, ${rm.ciUp}], p ${rm.pval}. Decision: ${rm.isRej ? 'Reject' : 'Fail to reject'} H₀.`;
        dec    = rm.isRej ? 'Reject H₀' : 'Fail to reject H₀';
        eff    = `d = ${rm.cohenD}`;
      }
      return { studentPrompt: prompt, instructorKey: key, decision: dec, effectSize: eff };
    }

    case 'pearson': {
      const d = state.lastPearsonProblemData;
      if (!d) return { studentPrompt: '', instructorKey: '', decision: '—', effectSize: '—' };
      const prompt = `A researcher examined whether ${d.variableX} and ${d.variableY} are correlated ` +
                     `in ${d.n} ${d.population}. ${d.h0} α = ${d.alpha}${d.twoTailed ? ' (two-tailed)' : ' (one-tailed)'}.`;
      const key    = `r = ${d.r}, r² = ${d.rSq} (${d.rSqPct}), t = ${d.tScore}, t_crit = ${d.tCrit}, p ${d.pval}. Decision: ${d.isRej ? 'Reject' : 'Fail to reject'} H₀.`;
      return {
        studentPrompt: prompt,
        instructorKey:  key,
        decision:       d.isRej ? 'Reject H₀' : 'Fail to reject H₀',
        effectSize:     `r² = ${d.rSq}`,
      };
    }

    case 'anova': {
      /* One-way vs two-way is determined by which data was stored */
      if (state.lastTwoWayAnovaPracticeData) {
        const d = state.lastTwoWayAnovaPracticeData;
        return {
          studentPrompt: d.studentPrompt,
          instructorKey:  d.decisionStatements.join(' | '),
          decision:       d.decisionStatements.join('; '),
          effectSize:     '—',
        };
      }
      const d = state.lastAnovaPracticeData;
      if (!d) return { studentPrompt: '', instructorKey: '', decision: '—', effectSize: '—' };
      return {
        studentPrompt: d.studentPrompt,
        instructorKey:  d.decisionStatement,
        decision:       d.decisionStatement,
        effectSize:     '—',
      };
    }

    case 'regression': {
      const d = state.lastRegPracticeData;
      if (!d) return { studentPrompt: '', instructorKey: '', decision: '—', effectSize: '—' };
      return {
        studentPrompt: d.studentPrompt,
        instructorKey:  `${d.decisionStatement} Equation: ${d.full.equation}. ${d.slopeInterp} ${d.rSqInterp}`,
        decision:       d.decisionStatement,
        effectSize:     `R² = ${r2(d.full.rSquared)}`,
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
  testType:    TestType,
  countInputId: string,
  statusId:    string,
  dlBtnId:     string
): Promise<void> {
  const countRaw = parseInt((document.getElementById(countInputId) as HTMLInputElement).value, 10);
  const count    = Math.max(1, Math.min(20, isNaN(countRaw) ? 5 : countRaw));

  const statusEl = document.getElementById(statusId) as HTMLElement;
  const dlBtn    = document.getElementById(dlBtnId)   as HTMLButtonElement;
  const genBtn   = document.getElementById(countInputId.replace('-count', '-gen-btn')) as HTMLButtonElement | null;

  state.lastDatasetBatch = null;
  dlBtn.style.display = 'none';
  statusEl.style.display = 'block';
  if (genBtn) genBtn.disabled = true;

  const params    = buildParamsUsed(testType);
  const timestamp = Date.now();
  const items: DatasetBatchItem[] = [];

  try {
    for (let i = 1; i <= count; i++) {
      statusEl.textContent = `Generating dataset ${i} of ${count}…`;
      await new Promise<void>(r => setTimeout(r, 0));

      withRandomSeed(testType, () => {
        state.lastResult = runTest(testType);
      });

      items.push({
        problemID:      i,
        testType,
        datasetRows:    buildDatasetRows(testType),
        alpha:          parseFloat(gv(testType === 'z_test' ? 'z-alpha'
                          : testType === 't_test'             ? 't-alpha'
                          : testType === 'independent_t_test' ? 'ind-alpha'
                          : testType === 'repeated_t_test'    ? 'rep-alpha'
                          : testType === 'anova'              ? 'anova-alpha'
                          : testType === 'pearson'            ? 'pear-alpha'
                          : 'reg-alpha')),
        parametersUsed: params,
        timestamp:      timestamp + i,
      });
    }

    state.lastDatasetBatch = items;
    dlBtn.style.display    = '';
    statusEl.textContent   = `✓ ${count} dataset${count > 1 ? 's' : ''} ready to download.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    if (genBtn) genBtn.disabled = false;
  }
}

/* ── Export: generateBatch (student problems) ── */

export async function generateBatch(
  testType:    TestType,
  countInputId: string,
  statusId:    string,
  dlBtnId:     string
): Promise<void> {
  const countRaw = parseInt((document.getElementById(countInputId) as HTMLInputElement).value, 10);
  const count    = Math.max(1, Math.min(20, isNaN(countRaw) ? 5 : countRaw));

  const statusEl = document.getElementById(statusId) as HTMLElement;
  const dlBtn    = document.getElementById(dlBtnId)   as HTMLButtonElement;
  const genBtn   = document.getElementById(countInputId.replace('-count', '-gen-btn')) as HTMLButtonElement | null;

  state.lastBatch = null;
  dlBtn.style.display = 'none';
  statusEl.style.display = 'block';
  if (genBtn) genBtn.disabled = true;

  const params    = buildParamsUsed(testType);
  const timestamp = Date.now();
  const items: BatchItem[] = [];

  try {
    for (let i = 1; i <= count; i++) {
      statusEl.textContent = `Generating problem ${i} of ${count}…`;
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

      const { studentPrompt, instructorKey, decision, effectSize } = buildPromptAndKey(testType);

      items.push({
        problemID:      i,
        testType,
        datasetRows:    buildDatasetRows(testType),
        studentPrompt,
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
        parametersUsed: params,
        timestamp:      timestamp + i,
      });
    }

    state.lastBatch     = items;
    dlBtn.style.display = '';
    statusEl.textContent = `✓ ${count} problem${count > 1 ? 's' : ''} ready to download.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    if (genBtn) genBtn.disabled = false;
  }
}

/* ── Export: downloadDatasetBatchWorkbook ── */

export function downloadDatasetBatchWorkbook(): void {
  const batch = state.lastDatasetBatch;
  if (!batch || !batch.length) return;

  const wb = XLSX.utils.book_new();

  for (const item of batch) {
    const ws = XLSX.utils.aoa_to_sheet(item.datasetRows as (string | number | null)[][]);
    const colCount = item.datasetRows[0]?.length ?? 2;
    setColWidths(ws, Array(colCount).fill(14).map((v, i) => i === 0 ? 8 : v));
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

  /* Dataset sheets */
  for (const item of batch) {
    const ws = XLSX.utils.aoa_to_sheet(item.datasetRows as (string | number | null)[][]);
    const colCount = item.datasetRows[0]?.length ?? 2;
    setColWidths(ws, Array(colCount).fill(14).map((v, i) => i === 0 ? 8 : v));
    XLSX.utils.book_append_sheet(wb, ws, `Dataset_${item.problemID}`);
  }

  /* Student_Problems sheet */
  const spRows: (string | number)[][] = [
    ['Problem ID', 'Test Type', 'Student Prompt'],
    ...batch.map(item => [item.problemID, item.testType, item.studentPrompt]),
  ];
  const spWs = XLSX.utils.aoa_to_sheet(spRows as (string | number | null)[][]);
  setColWidths(spWs, [12, 24, 80]);
  XLSX.utils.book_append_sheet(wb, spWs, 'Student_Problems');

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
