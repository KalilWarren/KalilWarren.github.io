import { initPyodide } from './init.ts';
import { onTestChange, onTxToggle } from './ui.ts';
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
import { renderResults } from './rendering.ts';
import { downloadCSV } from './csv.ts';
import {
  generateStudentProblem,
  toggleInstructorKey,
  downloadProblemExcel,
} from './problems.ts';

/* ── Set current year ── */
import '../year.ts';

/* ── Pyodide boot ── */
window.addEventListener('DOMContentLoaded', initPyodide);

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
});
