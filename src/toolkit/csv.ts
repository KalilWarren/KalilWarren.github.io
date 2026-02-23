import { state } from './state.ts';

/* ── CSV conversion helpers ── */

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(records: Record<string, unknown>[]): string {
  if (!records || !records.length) return '';
  const keys = Object.keys(records[0]);
  return [
    keys.join(','),
    ...records.map(r => keys.map(k => esc(r[k])).join(',')),
  ].join('\n');
}

export function arrToCSV(arr: number[], header: string): string {
  return [header, ...arr.map((v, i) => `${i + 1},${v}`)].join('\n');
}

export function xyToCSV(xArr: number[], yArr: number[]): string {
  return ['#,X,Y', ...xArr.map((x, i) => `${i + 1},${x},${yArr[i]}`)].join('\n');
}

/* ── Download trigger ── */

export function downloadCSV(): void {
  const r = state.lastResult;
  if (!r) return;
  const parts: string[] = [];

  switch (r.type) {
    case 'z_test':
    case 't_test':
      parts.push(arrToCSV(r.dataset, '#,Score'));
      parts.push('');
      parts.push(toCSV(r.results as unknown as Record<string, unknown>[]));
      break;
    case 'independent_t_test':
      parts.push('# Group 1\n' + arrToCSV(r.dataset1, '#,Score'));
      parts.push('');
      parts.push('# Group 2\n' + arrToCSV(r.dataset2, '#,Score'));
      parts.push('');
      parts.push(toCSV(r.results as unknown as Record<string, unknown>[]));
      break;
    case 'repeated_t_test':
      parts.push('# Pre-Treatment\n' + arrToCSV(r.pre, '#,Score'));
      parts.push('');
      parts.push('# Post-Treatment\n' + arrToCSV(r.post, '#,Score'));
      parts.push('');
      parts.push(toCSV(r.results as unknown as Record<string, unknown>[]));
      break;
    case 'anova':
      parts.push(toCSV(r.dataset as unknown as Record<string, unknown>[]));
      parts.push('');
      parts.push(toCSV(r.table as unknown as Record<string, unknown>[]));
      break;
    case 'pearson':
      parts.push(xyToCSV(r.x_data, r.y_data));
      parts.push('');
      parts.push(toCSV(r.results as unknown as Record<string, unknown>[]));
      break;
    case 'regression':
      parts.push(`# Equation: ${r.equation}`);
      parts.push(xyToCSV(r.x_data, r.y_data));
      parts.push('');
      parts.push(toCSV(r.table as unknown as Record<string, unknown>[]));
      break;
  }

  const blob = new Blob([parts.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `statteacher_${r.type}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
