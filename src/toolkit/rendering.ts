import { state } from './state.ts';
import { gv, fmt, valClass } from './ui.ts';
import type { TestResult, StatRecord, AnovaRow, TableRow } from './types.ts';

/* ── HTML table builders ── */

export function recordsTable(
  records: (StatRecord | TableRow)[],
  title?: string
): string {
  if (!records || !records.length) return '';
  const keys = Object.keys(records[0]);
  let h = `<div class="result-block"><div class="tbl-wrap">`;
  if (title) h += `<h3>${title}</h3>`;
  h += `<table class="stat-table"><thead><tr>`;
  keys.forEach(k => { h += `<th>${k}</th>`; });
  h += `</tr></thead><tbody>`;
  records.forEach(row => {
    const isDecision = (row as StatRecord)['Statistic'] === 'Decision';
    h += `<tr${isDecision ? ' class="row-decision"' : ''}>`;
    keys.forEach(k => {
      const v = fmt((row as Record<string, unknown>)[k]);
      h += `<td${valClass((row as Record<string, unknown>)[k])}>${v}</td>`;
    });
    h += `</tr>`;
  });
  h += `</tbody></table></div></div>`;
  return h;
}

export function arrayTable(arr: number[], colHeader: string, title?: string): string {
  let h = `<div class="result-block"><div class="tbl-wrap">`;
  if (title) h += `<h3>${title}</h3>`;
  h += `<table class="stat-table"><thead><tr><th>#</th><th>${colHeader}</th></tr></thead><tbody>`;
  arr.forEach((v, i) => { h += `<tr><td>${i + 1}</td><td>${fmt(v)}</td></tr>`; });
  h += `</tbody></table></div></div>`;
  return h;
}

export function xyTable(
  xArr: number[],
  yArr: number[],
  xH: string,
  yH: string,
  title?: string
): string {
  let h = `<div class="result-block"><div class="tbl-wrap">`;
  if (title) h += `<h3>${title}</h3>`;
  h += `<table class="stat-table"><thead><tr><th>#</th><th>${xH}</th><th>${yH}</th></tr></thead><tbody>`;
  for (let i = 0; i < xArr.length; i++) {
    h += `<tr><td>${i + 1}</td><td>${fmt(xArr[i])}</td><td>${fmt(yArr[i])}</td></tr>`;
  }
  h += `</tbody></table></div></div>`;
  return h;
}

export function anovaDatasetTable(records: AnovaRow[]): string {
  if (!records || !records.length) return '';
  const keys = Object.keys(records[0]);
  const shown = records.slice(0, 25);
  let h = `<div class="result-block" style="grid-column:1/-1"><div class="tbl-wrap">`;
  h += `<h3>Dataset</h3>`;
  if (records.length > 25) {
    h += `<p class="dataset-note">Showing first 25 of ${records.length} observations.</p>`;
  }
  h += `<table class="stat-table"><thead><tr>`;
  keys.forEach(k => { h += `<th>${k}</th>`; });
  h += `</tr></thead><tbody>`;
  shown.forEach(row => {
    h += `<tr>`;
    keys.forEach(k => { h += `<td>${fmt(row[k])}</td>`; });
    h += `</tr>`;
  });
  h += `</tbody></table></div></div>`;
  return h;
}

/* ── Main render dispatcher ── */

export function renderResults(r: TestResult): void {
  const el = document.getElementById('results-content') as HTMLElement;
  let html = '';

  const pgCard  = document.getElementById('problem-gen-card') as HTMLElement;
  const pgTag   = document.getElementById('pg-tag') as HTMLElement;
  const pgOutput = document.getElementById('pg-output') as HTMLElement;

  if (r.type === 'z_test') {
    state.lastZTestContext = {
      alpha:      parseFloat(gv('z-alpha')),
      twoTailed:  (document.getElementById('z-tail') as HTMLSelectElement).value === 'two',
    };
    pgTag.textContent = 'Z-Test · Experimental';
    pgOutput.style.display = 'none';
    pgCard.style.display = 'block';
  } else if (r.type === 't_test') {
    state.lastTTestContext = {
      alpha:      parseFloat(gv('t-alpha')),
      twoTailed:  (document.getElementById('t-tail') as HTMLSelectElement).value === 'two',
    };
    pgTag.textContent = 'T-Test · Experimental';
    pgOutput.style.display = 'none';
    pgCard.style.display = 'block';
  } else {
    pgCard.style.display = 'none';
    pgOutput.style.display = 'none';
  }

  switch (r.type) {
    case 'z_test':
      html = `<div class="results-grid">
        ${arrayTable(r.dataset, 'Score', 'Dataset')}
        ${recordsTable(r.results, 'Statistical Results')}
      </div>`;
      break;

    case 't_test':
      html = `<div class="results-grid">
        ${arrayTable(r.dataset, 'Score', 'Dataset')}
        ${recordsTable(r.results, 'Statistical Results')}
      </div>`;
      break;

    case 'independent_t_test':
      html = `<div class="results-grid">
        ${arrayTable(r.dataset1, 'Score', 'Group 1')}
        ${arrayTable(r.dataset2, 'Score', 'Group 2')}
      </div>
      ${recordsTable(r.results, 'Statistical Results')}`;
      break;

    case 'repeated_t_test':
      html = `<div class="results-grid">
        ${arrayTable(r.pre,  'Score', 'Pre-Treatment')}
        ${arrayTable(r.post, 'Score', 'Post-Treatment')}
      </div>
      ${recordsTable(r.results, 'Statistical Results')}`;
      break;

    case 'anova':
      html = `<div class="results-grid">
        ${anovaDatasetTable(r.dataset)}
      </div>
      ${recordsTable(r.table, 'ANOVA Summary Table')}`;
      break;

    case 'pearson':
      html = `<div class="results-grid">
        ${xyTable(r.x_data, r.y_data, 'X', 'Y', 'Dataset')}
        ${recordsTable(r.results, 'Statistical Results')}
      </div>`;
      break;

    case 'regression':
      html = `<div class="equation-box">Regression Equation: <strong>${r.equation}</strong></div>
      <div class="results-grid">
        ${xyTable(r.x_data, r.y_data, 'X (Predictor)', 'Y (Outcome)', 'Dataset')}
        ${recordsTable(r.table, 'Regression ANOVA Table')}
      </div>`;
      break;
  }

  el.innerHTML = html;
  const resultsCard = document.getElementById('results-card') as HTMLElement;
  resultsCard.style.display = 'block';
  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
