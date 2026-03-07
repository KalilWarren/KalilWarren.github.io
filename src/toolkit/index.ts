import { initPyodide } from './init.ts';
import { onTestChange, onTxToggle } from './ui.ts';
import { state } from './state.ts';
import {
  runZTest,
  runTTest,
  runIndependentTTest,
  runRepeatedTTest,
  runANOVA,
  runRMANOVA,
  runPearson,
  runRegression,
} from './runners.ts';
import { renderResults } from './rendering.ts';
import { downloadCSV } from './csv.ts';
import {
  generateDatasetBatch,
  generateBatch,
  downloadDatasetBatchWorkbook,
  downloadBatchWorkbook,
  addSweepRow,
} from './batch.ts';
import {
  generateStudentProblem,
  toggleInstructorKey,
  downloadProblemExcel,
  generateANOVAProblem,
  toggleAnovaKey,
  downloadAnovaPracticeExcel,
  generateTwoWayANOVAProblem,
  toggleTwoWayAnovaKey,
  downloadTwoWayAnovaPracticeExcel,
  generatePearsonProblem,
  togglePearsonKey,
  downloadPearsonExcel,
  generateRegressionTableProblem,
  toggleRegressionKey,
  downloadRegressionPracticeExcel,
  generateRmaAnovaProblem,
  toggleRmaAnovaKey,
  downloadRmaAnovaPracticeExcel,
} from './problems.ts';

/* ── Set current year ── */
import '../year.ts';
import { initTooltips } from './tooltips.ts';

/* ── Pyodide boot ── */
window.addEventListener('DOMContentLoaded', initPyodide);

/* ── Tooltip system ── */
window.addEventListener('DOMContentLoaded', initTooltips);

/* ── Generate button ── */
async function generateProblem(): Promise<void> {
  if (!state.pyodide) return;
  const btn     = document.getElementById('generate-btn') as HTMLButtonElement;
  const spinner = document.getElementById('spinner-row') as HTMLElement;
  btn.disabled  = true;
  spinner.style.display = 'flex';

  try {
    let result;
    switch (state.currentTest) {
      case 'z_test':             result = runZTest();            break;
      case 't_test':             result = runTTest();            break;
      case 'independent_t_test': result = runIndependentTTest(); break;
      case 'repeated_t_test':    result = runRepeatedTTest();    break;
      case 'anova':              result = runANOVA();            break;
      case 'rma_anova':          result = runRMANOVA();          break;
      case 'pearson':            result = runPearson();          break;
      case 'regression':         result = runRegression();       break;
      default:
        return;
    }
    state.lastResult = result;
    renderResults(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const content = document.getElementById('results-content') as HTMLElement;
    content.innerHTML = `<div class="error-box"><strong>Error:</strong> ${msg}</div>`;
    (document.getElementById('results-card') as HTMLElement).style.display = 'block';
    console.error(err);
  }

  btn.disabled = false;
  spinner.style.display = 'none';
}

/* ── Wire up all event listeners on DOMContentLoaded ── */
window.addEventListener('DOMContentLoaded', () => {
  /* Test selector */
  document.getElementById('test-select')
    ?.addEventListener('change', onTestChange);

  /* Treatment-effect checkboxes */
  document.getElementById('z-tx-switch')
    ?.addEventListener('change', () => onTxToggle('z'));
  document.getElementById('t-tx-switch')
    ?.addEventListener('change', () => onTxToggle('t'));
  document.getElementById('pear-tx-switch')
    ?.addEventListener('change', () => onTxToggle('pear'));
  document.getElementById('reg-tx-switch')
    ?.addEventListener('change', () => onTxToggle('reg'));

  /* Generate button */
  document.getElementById('generate-btn')
    ?.addEventListener('click', generateProblem);

  /* Download CSV */
  document.getElementById('download-csv-btn')
    ?.addEventListener('click', downloadCSV);

  /* Generate student problem */
  document.getElementById('generate-student-btn')
    ?.addEventListener('click', generateStudentProblem);

  /* Instructor key toggle */
  document.getElementById('pg-show-key')
    ?.addEventListener('change', toggleInstructorKey);

  /* Download Excel */
  document.getElementById('download-excel-btn')
    ?.addEventListener('click', downloadProblemExcel);

  /* One-Way ANOVA Table Practice Problem */
  document.getElementById('generate-anova-problem-btn')
    ?.addEventListener('click', generateANOVAProblem);
  document.getElementById('ap-show-key')
    ?.addEventListener('change', toggleAnovaKey);
  document.getElementById('download-anova-excel-btn')
    ?.addEventListener('click', downloadAnovaPracticeExcel);

  /* Two-Way ANOVA Table Practice Problem */
  document.getElementById('generate-anova-2way-problem-btn')
    ?.addEventListener('click', generateTwoWayANOVAProblem);
  document.getElementById('ap2-show-key')
    ?.addEventListener('change', toggleTwoWayAnovaKey);
  document.getElementById('download-anova-2way-excel-btn')
    ?.addEventListener('click', downloadTwoWayAnovaPracticeExcel);

  /* Pearson Correlation Student Problem Generator */
  document.getElementById('generate-pearson-problem-btn')
    ?.addEventListener('click', generatePearsonProblem);
  document.getElementById('pear-pg-show-key')
    ?.addEventListener('change', togglePearsonKey);
  document.getElementById('download-pearson-excel-btn')
    ?.addEventListener('click', downloadPearsonExcel);

  /* Regression Table Practice Problem */
  document.getElementById('generate-reg-problem-btn')
    ?.addEventListener('click', generateRegressionTableProblem);
  document.getElementById('reg-pg-show-key')
    ?.addEventListener('change', toggleRegressionKey);
  document.getElementById('download-reg-excel-btn')
    ?.addEventListener('click', downloadRegressionPracticeExcel);

  /* RM ANOVA Table Practice Problem */
  document.getElementById('generate-rma-problem-btn')
    ?.addEventListener('click', generateRmaAnovaProblem);
  document.getElementById('rma-pg-show-key')
    ?.addEventListener('change', toggleRmaAnovaKey);
  document.getElementById('download-rma-excel-btn')
    ?.addEventListener('click', downloadRmaAnovaPracticeExcel);

  /* RM ANOVA Batch */
  document.getElementById('rma-pg-batch-gen-btn')
    ?.addEventListener('click', () =>
      generateBatch('rma_anova', 'rma-pg-batch-count',
                    'rma-pg-batch-status', 'rma-pg-batch-dl-btn', 'rma-pg-sweep-rows'));
  document.getElementById('rma-pg-batch-dl-btn')
    ?.addEventListener('click', downloadBatchWorkbook);
  document.getElementById('rma-pg-sweep-add-btn')
    ?.addEventListener('click', () => addSweepRow('rma-pg-sweep-rows', 'rma_anova'));

  /* ── Dataset Batch (one per param section) ── */
  const datasetBatchEntries: [string, import('./types.ts').TestType][] = [
    ['z',    'z_test'],
    ['t',    't_test'],
    ['ind',  'independent_t_test'],
    ['rep',  'repeated_t_test'],
    ['anova','anova'],
    ['rma',  'rma_anova'],
    ['pear', 'pearson'],
    ['reg',  'regression'],
  ];
  datasetBatchEntries.forEach(([pfx, testType]) => {
    document.getElementById(`${pfx}-batch-gen-btn`)
      ?.addEventListener('click', () =>
        generateDatasetBatch(testType, `${pfx}-batch-count`,
                             `${pfx}-batch-status`, `${pfx}-batch-dl-btn`,
                             `${pfx}-sweep-rows`));
    document.getElementById(`${pfx}-batch-dl-btn`)
      ?.addEventListener('click', downloadDatasetBatchWorkbook);
    document.getElementById(`${pfx}-sweep-add-btn`)
      ?.addEventListener('click', () => addSweepRow(`${pfx}-sweep-rows`, testType));
  });

  /* ── Student Problem Batch (one per problem-gen card) ── */

  /* Narrative (z / t / ind-t / rep-t) — testType determined at click time */
  document.getElementById('pg-batch-gen-btn')
    ?.addEventListener('click', () => {
      if (!state.lastResult) return;
      generateBatch(
        state.lastResult.type as import('./types.ts').TestType,
        'pg-batch-count', 'pg-batch-status', 'pg-batch-dl-btn', 'pg-sweep-rows'
      );
    });
  document.getElementById('pg-batch-dl-btn')
    ?.addEventListener('click', downloadBatchWorkbook);
  document.getElementById('pg-sweep-add-btn')
    ?.addEventListener('click', () => {
      if (!state.lastResult) return;
      addSweepRow('pg-sweep-rows', state.lastResult.type as import('./types.ts').TestType);
    });

  /* One-Way ANOVA */
  document.getElementById('ap-batch-gen-btn')
    ?.addEventListener('click', () =>
      generateBatch('anova', 'ap-batch-count', 'ap-batch-status', 'ap-batch-dl-btn', 'ap-sweep-rows'));
  document.getElementById('ap-batch-dl-btn')
    ?.addEventListener('click', downloadBatchWorkbook);
  document.getElementById('ap-sweep-add-btn')
    ?.addEventListener('click', () => addSweepRow('ap-sweep-rows', 'anova'));

  /* Two-Way ANOVA */
  document.getElementById('ap2-batch-gen-btn')
    ?.addEventListener('click', () =>
      generateBatch('anova', 'ap2-batch-count', 'ap2-batch-status', 'ap2-batch-dl-btn', 'ap2-sweep-rows'));
  document.getElementById('ap2-batch-dl-btn')
    ?.addEventListener('click', downloadBatchWorkbook);
  document.getElementById('ap2-sweep-add-btn')
    ?.addEventListener('click', () => addSweepRow('ap2-sweep-rows', 'anova'));

  /* Pearson */
  document.getElementById('pear-pg-batch-gen-btn')
    ?.addEventListener('click', () =>
      generateBatch('pearson', 'pear-pg-batch-count',
                    'pear-pg-batch-status', 'pear-pg-batch-dl-btn', 'pear-pg-sweep-rows'));
  document.getElementById('pear-pg-batch-dl-btn')
    ?.addEventListener('click', downloadBatchWorkbook);
  document.getElementById('pear-pg-sweep-add-btn')
    ?.addEventListener('click', () => addSweepRow('pear-pg-sweep-rows', 'pearson'));

  /* Regression */
  document.getElementById('reg-pg-batch-gen-btn')
    ?.addEventListener('click', () =>
      generateBatch('regression', 'reg-pg-batch-count',
                    'reg-pg-batch-status', 'reg-pg-batch-dl-btn', 'reg-pg-sweep-rows'));
  document.getElementById('reg-pg-batch-dl-btn')
    ?.addEventListener('click', downloadBatchWorkbook);
  document.getElementById('reg-pg-sweep-add-btn')
    ?.addEventListener('click', () => addSweepRow('reg-pg-sweep-rows', 'regression'));
});
