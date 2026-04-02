import { state } from './state.ts';
import { gv, fmt, valClass } from './ui.ts';
import { tipHTML, STAT_ROW_TIPS, COL_HEADER_TIPS } from './tooltips.ts';
import type { TestResult, StatRecord, AnovaRow, TableRow, RmaAnovaResult } from './types.ts';

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
  keys.forEach(k => {
    const hdrTip = COL_HEADER_TIPS[k] ? tipHTML(COL_HEADER_TIPS[k]) : '';
    h += `<th>${k}${hdrTip}</th>`;
  });
  h += `</tr></thead><tbody>`;
  const hasWithin = records.some(r => (r as Record<string, unknown>)['Source'] === 'Within Treatment');
  records.forEach(row => {
    const src        = (row as Record<string, unknown>)['Source'];
    const isDecision = (row as StatRecord)['Statistic'] === 'Decision';
    const isSub      = hasWithin && (src === 'Between Subjects' || src === 'Error');
    const rowClass   = isDecision ? 'row-decision' : isSub ? 'row-sub' : '';
    h += `<tr${rowClass ? ` class="${rowClass}"` : ''}>`;
    keys.forEach(k => {
      const raw = (row as Record<string, unknown>)[k];
      const isBsMs = isSub && src === 'Between Subjects' && k === 'MS';
      const v   = fmt(isBsMs ? null : raw);
      let cell  = String(v);
      if (k === 'Statistic' && typeof raw === 'string') {
        const rowTip = STAT_ROW_TIPS[raw] ? tipHTML(STAT_ROW_TIPS[raw]) : '';
        if (rowTip) cell += rowTip;
      }
      h += `<td${valClass(raw)}>${cell}</td>`;
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

export function wideDatasetTable(records: TableRow[], title?: string): string {
  if (!records || !records.length) return '';
  const keys = Object.keys(records[0]);
  const shown = records.slice(0, 30);
  let h = `<div class="result-block" style="grid-column:1/-1"><div class="tbl-wrap">`;
  if (title) h += `<h3>${title}</h3>`;
  if (records.length > 30) {
    h += `<p class="dataset-note">Showing first 30 of ${records.length} subjects.</p>`;
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

  /* Reset student-problem batch UI when a new single result is generated */
  state.lastBatch = null;
  ['pg', 'ap', 'ap2', 'pear-pg', 'reg-pg', 'rma-pg'].forEach(pfx => {
    const dlBtn = document.getElementById(`${pfx}-batch-dl-btn`);
    if (dlBtn) dlBtn.style.display = 'none';
    const status = document.getElementById(`${pfx}-batch-status`);
    if (status) { status.style.display = 'none'; status.textContent = ''; }
  });

  const pgCard  = document.getElementById('problem-gen-card') as HTMLElement;
  const pgTag   = document.getElementById('pg-tag') as HTMLElement;
  const pgOutput = document.getElementById('pg-output') as HTMLElement;

  const popRow           = document.getElementById('pg-pop-row')         as HTMLElement;
  const groupRow         = document.getElementById('pg-group-row')       as HTMLElement;
  const rmRow            = document.getElementById('pg-rm-row')          as HTMLElement;
  const esRow            = document.getElementById('pg-es-row')          as HTMLElement;
  const batchEsWrap      = document.getElementById('pg-batch-es-wrap')   as HTMLElement;
  const anovaPracticeCard      = document.getElementById('anova-practice-card')      as HTMLElement;
  const anova2WayPracticeCard  = document.getElementById('anova-2way-practice-card') as HTMLElement;
  const pearsonProblemCard     = document.getElementById('pearson-problem-card')     as HTMLElement;
  const regPracticeCard        = document.getElementById('reg-practice-card')        as HTMLElement;
  const rmaPracticeCard        = document.getElementById('rma-practice-card')        as HTMLElement;

  if (r.type === 'z_test') {
    state.lastZTestContext = {
      alpha:     parseFloat(gv('z-alpha')),
      twoTailed: (document.getElementById('z-tail') as HTMLSelectElement).value === 'two',
    };
    pgTag.textContent = 'Z-Test · Experimental';
    pgOutput.style.display           = 'none';
    pgCard.style.display             = 'block';
    popRow.style.display             = '';
    groupRow.style.display           = 'none';
    rmRow.style.display              = 'none';
    esRow.style.display              = 'none';
    batchEsWrap.style.display        = 'none';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'none';
  } else if (r.type === 't_test') {
    state.lastTTestContext = {
      alpha:     parseFloat(gv('t-alpha')),
      twoTailed: (document.getElementById('t-tail') as HTMLSelectElement).value === 'two',
    };
    pgTag.textContent = 'T-Test · Experimental';
    pgOutput.style.display           = 'none';
    pgCard.style.display             = 'block';
    popRow.style.display             = '';
    groupRow.style.display           = 'none';
    rmRow.style.display              = 'none';
    esRow.style.display              = '';
    batchEsWrap.style.display        = 'flex';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'none';
  } else if (r.type === 'independent_t_test') {
    state.lastIndTTestContext = {
      alpha:     parseFloat(gv('ind-alpha')),
      twoTailed: (document.getElementById('ind-tail') as HTMLSelectElement).value === 'two',
    };
    pgTag.textContent = 'Ind. t-Test · Experimental';
    pgOutput.style.display           = 'none';
    pgCard.style.display             = 'block';
    popRow.style.display             = 'none';
    groupRow.style.display           = '';
    rmRow.style.display              = 'none';
    esRow.style.display              = '';
    batchEsWrap.style.display        = 'flex';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'none';
  } else if (r.type === 'repeated_t_test') {
    state.lastRmTTestContext = {
      alpha:     parseFloat(gv('rep-alpha')),
      twoTailed: (document.getElementById('rep-tail') as HTMLSelectElement).value === 'two',
    };
    pgTag.textContent = 'RM t-Test · Experimental';
    pgOutput.style.display           = 'none';
    pgCard.style.display             = 'block';
    popRow.style.display             = 'none';
    groupRow.style.display           = 'none';
    rmRow.style.display              = '';
    esRow.style.display              = '';
    batchEsWrap.style.display        = 'flex';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'none';
  } else if (r.type === 'anova') {
    pgCard.style.display   = 'none';
    pgOutput.style.display = 'none';
    pearsonProblemCard.style.display = 'none';

    /* One-way: first row Source ≠ "Between" */
    const isOneWay = r.table.length > 0 && r.table[0]['Source'] !== 'Between';

    /* Two-way: first row IS "Between" AND exactly 2 factor rows (not Between/Interaction/Within Treatments/Total) */
    const factorRows = r.table.filter(
      row => row['Source'] !== 'Between' && row['Source'] !== 'Interaction' &&
             row['Source'] !== 'Within Treatments' && row['Source'] !== 'Total'
    );
    const isTwoWay = !isOneWay && factorRows.length === 2;

    anovaPracticeCard.style.display     = isOneWay ? 'block' : 'none';
    anova2WayPracticeCard.style.display = isTwoWay ? 'block' : 'none';

    regPracticeCard.style.display = 'none';
    rmaPracticeCard.style.display = 'none';

    /* Reset any previous outputs */
    const apOut  = document.getElementById('ap-output')  as HTMLElement;
    const ap2Out = document.getElementById('ap2-output') as HTMLElement;
    if (apOut)  apOut.style.display  = 'none';
    if (ap2Out) ap2Out.style.display = 'none';
  } else if (r.type === 'pearson') {
    state.lastPearsonContext = {
      alpha:     parseFloat(gv('pear-alpha')),
      twoTailed: (document.getElementById('pear-tail') as HTMLSelectElement).value === 'two',
    };
    pgCard.style.display             = 'none';
    pgOutput.style.display           = 'none';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'block';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'none';
    const pearsonOut = document.getElementById('pear-pg-output') as HTMLElement;
    if (pearsonOut) pearsonOut.style.display = 'none';
  } else if (r.type === 'rma_anova') {
    pgCard.style.display             = 'none';
    pgOutput.style.display           = 'none';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'block';
    const rmaPgOut = document.getElementById('rma-pg-output') as HTMLElement;
    if (rmaPgOut) rmaPgOut.style.display = 'none';
  } else if (r.type === 'regression') {
    pgCard.style.display   = 'none';
    pgOutput.style.display = 'none';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'block';
    rmaPracticeCard.style.display        = 'none';
    const regOut = document.getElementById('reg-pg-output') as HTMLElement;
    if (regOut) regOut.style.display = 'none';
  } else {
    pgCard.style.display   = 'none';
    pgOutput.style.display = 'none';
    anovaPracticeCard.style.display      = 'none';
    anova2WayPracticeCard.style.display  = 'none';
    pearsonProblemCard.style.display     = 'none';
    regPracticeCard.style.display        = 'none';
    rmaPracticeCard.style.display        = 'none';
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

    case 'anova': {
      const isTwoWay = r.table.length > 0 && r.table[0]['Source'] === 'Between';
      let etaHtml = '';
      if (isTwoWay) {
        const fRows = r.table.filter(
          row => row['Source'] !== 'Between' && row['Source'] !== 'Interaction' &&
                 row['Source'] !== 'Within Treatments' && row['Source'] !== 'Total'
        );
        const errRow   = r.table.find(row => row['Source'] === 'Within Treatments');
        const intRow   = r.table.find(row => row['Source'] === 'Interaction');
        const totalRow = r.table.find(row => row['Source'] === 'Total');
        if (fRows.length === 2 && errRow && intRow && totalRow) {
          const ssA  = Number(fRows[0]['SS']);
          const ssB  = Number(fRows[1]['SS']);
          const ssAB = Number(intRow['SS']);
          const ssT  = Number(totalRow['SS']);
          const f3 = (n: number) => n.toFixed(3);
          etaHtml = `<div class="result-block"><div class="tbl-wrap">
            <h3>Effect Size (Partial η²)</h3>
            <p>η²<sub>${String(fRows[0]['Source'])}</sub> = SS<sub>A</sub> / (SS<sub>Total</sub> − SS<sub>B</sub> − SS<sub>A×B</sub>) = <strong>${f3(ssA / (ssT - ssB - ssAB))}</strong></p>
            <p>η²<sub>${String(fRows[1]['Source'])}</sub> = SS<sub>B</sub> / (SS<sub>Total</sub> − SS<sub>A</sub> − SS<sub>A×B</sub>) = <strong>${f3(ssB / (ssT - ssA - ssAB))}</strong></p>
            <p>η²<sub>A×B</sub> = SS<sub>A×B</sub> / (SS<sub>Total</sub> − SS<sub>A</sub> − SS<sub>B</sub>) = <strong>${f3(ssAB / (ssT - ssA - ssB))}</strong></p>
          </div></div>`;
        }
      }
      html = `<div class="results-grid">
        ${anovaDatasetTable(r.dataset)}
      </div>
      ${recordsTable(r.table, 'ANOVA Summary Table')}${etaHtml}`;
      break;
    }

    case 'rma_anova': {
      const rma = r as RmaAnovaResult;
      const decClass = rma.decision === 'Reject Null' ? 'val-reject' : 'val-fail';
      html = `
        ${wideDatasetTable(rma.dataset, 'Dataset (Wide Format)')}
        ${recordsTable(rma.table, 'ANOVA Summary Table')}
        <div class="result-block">
          <div class="tbl-wrap">
            <h3>Effect Size</h3>
            <p style="padding:0.4rem 0;">η² = SS<sub>BT</sub> / (SS<sub>BT</sub> + SS<sub>Error</sub>) = <strong>${rma.eta_squared.toFixed(3)}</strong></p>
          </div>
        </div>
        <div class="result-block">
          <div class="tbl-wrap">
            <h3>Decision</h3>
            <p class="${decClass}" style="font-weight:600; padding:0.4rem 0;">${rma.decision}</p>
          </div>
        </div>`;
      break;
    }

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
