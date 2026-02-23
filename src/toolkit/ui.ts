import { state } from './state.ts';
import type { TestType } from './types.ts';

/** Get the value of an input/select element by ID. */
export function gv(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value;
}

/**
 * Return a Python-safe seed expression: 'None' if the field is blank,
 * otherwise the parsed integer as a string.
 */
export function seed(id: string): string {
  const v = (document.getElementById(id) as HTMLInputElement).value.trim();
  return v === '' ? 'None' : String(parseInt(v, 10));
}

/** Convert a two/one tail dropdown value to a Python boolean string. */
export function tail(id: string): string {
  return (document.getElementById(id) as HTMLSelectElement).value === 'two'
    ? 'True'
    : 'False';
}

/** Convert a checkbox checked state to a Python boolean string. */
export function txSwitch(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).checked ? 'True' : 'False';
}

/** Show or hide the treatment-effect fields based on the checkbox state. */
export function onTxToggle(prefix: string): void {
  const checked = (document.getElementById(prefix + '-tx-switch') as HTMLInputElement).checked;
  const fields = document.getElementById(prefix + '-tx-fields') as HTMLElement;
  fields.style.display = checked ? '' : 'none';
}

/** Handle test-selector dropdown change — show the matching parameter section. */
export function onTestChange(): void {
  const sel = (document.getElementById('test-select') as HTMLSelectElement).value as TestType | '';
  state.currentTest = sel || null;

  document.querySelectorAll<HTMLElement>('.test-section').forEach(el =>
    el.classList.remove('active')
  );

  const btn = document.getElementById('generate-btn') as HTMLButtonElement;
  if (sel) {
    document.getElementById('params-' + sel)?.classList.add('active');
    btn.disabled = false;
    btn.textContent = 'Generate Problem';
  } else {
    btn.disabled = true;
    btn.textContent = 'Select a Test to Begin';
  }

  const resultsCard = document.getElementById('results-card') as HTMLElement;
  const pgCard = document.getElementById('problem-gen-card') as HTMLElement;
  const pgOutput = document.getElementById('pg-output') as HTMLElement;
  resultsCard.style.display = 'none';
  pgCard.style.display = 'none';
  pgOutput.style.display = 'none';
}

/** Format a cell value for HTML display. */
export function fmt(v: unknown): string | number {
  if (v === null || v === undefined) return '&mdash;';
  if (typeof v === 'number' && !isNaN(v)) return parseFloat(v.toFixed(4));
  return String(v);
}

/** Return a CSS class attribute string for decision-cell highlighting. */
export function valClass(v: unknown): string {
  const s = String(v);
  if (s === 'Reject Null')         return ' class="val-reject"';
  if (s === 'Fail to Reject Null') return ' class="val-fail"';
  return '';
}
