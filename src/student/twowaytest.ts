/* ── Two-Factor Independent ANOVA Student Practice Module ── */
/*
 * Masking patterns mirror maskANOVATableTwoWay() from src/toolkit/problems.ts:
 *   easy:   hide MSA, MSB, MSAB, MSE, FA, FB, FAB
 *   medium: hide DFA, DFB, DFAB, DFE, SSE, MSA, MSB, MSAB, FA, FB, FAB
 *   hard:   hide SSA, SSB, SSAB, SSE, SST, DFT, MSE
 */

/* ── Types ── */

type Difficulty  = 'easy' | 'medium' | 'hard';
type MaskedField =
  'SSA' | 'SSB' | 'SSAB' | 'SSE' | 'SST' |
  'DFA' | 'DFB' | 'DFAB' | 'DFE' | 'DFT' |
  'MSA' | 'MSB' | 'MSAB' | 'MSE' |
  'FA'  | 'FB'  | 'FAB';

interface TwoWayTable {
  SSA: number; SSB: number; SSAB: number; SSE: number; SST: number;
  DFA: number; DFB: number; DFAB: number; DFE: number; DFT: number;
  MSA: number; MSB: number; MSAB: number; MSE: number;
  FA:  number; FB:  number; FAB:  number;
}

export interface TwoWayProblem {
  aLevels:   number;
  bLevels:   number;
  nPerCell:  number;
  N:         number;
  alpha:     number;
  difficulty: Difficulty;
  table:     TwoWayTable;
  eta2:      { A: number; B: number; AB: number };
  Fcrit:     { A: number; B: number; AB: number };
  decisions: { A: 'reject' | 'fail'; B: 'reject' | 'fail'; AB: 'reject' | 'fail' };
  masked:    Set<MaskedField>;
  variable:  string;
  unit:      string;
  population: string;
}

export interface GradeResult {
  cells:     Partial<Record<MaskedField, boolean>>;
  hypA:      boolean;
  hypB:      boolean;
  hypAB:     boolean;
  fcritA:    boolean;
  fcritB:    boolean;
  fcritAB:   boolean;
  decA:      boolean;
  decB:      boolean;
  decAB:     boolean;
  eta2A:     boolean;
  eta2B:     boolean;
  eta2AB:    boolean;
  allCorrect: boolean;
}

/* ── Numeric utilities ── */

function r2(x: number): number { return Math.round(x * 100) / 100; }
function r3(x: number): number { return Math.round(x * 1000) / 1000; }

function rInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function rChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rWeighted<T>(arr: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < arr.length; i++) { r -= weights[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

/* ── Normal random (Box-Muller) ── */

function randNormal(mean: number, sd: number): number {
  if (sd <= 0) return mean;
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sd * z;
}

/* ── Inverse-F distribution (Lanczos + regularized incomplete beta + bisection) ── */

function lgamma(z: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function ibeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  if (x < (a + 1) / (a + b + 2))
    return (Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a) * betaCF(x, a, b);
  return 1 - (Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b) * betaCF(1 - x, b, a);
}

function fUpperTail(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return ibeta(x, df2 / 2, df1 / 2);
}

function fInv(alpha: number, df1: number, df2: number): number {
  let lo = 0, hi = 500;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (fUpperTail(mid, df1, df2) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ── Masking sets (mirrors maskANOVATableTwoWay in problems.ts) ── */

function getMasked(difficulty: Difficulty): Set<MaskedField> {
  if (difficulty === 'easy')
    return new Set<MaskedField>(['MSA', 'MSB', 'MSAB', 'MSE', 'FA', 'FB', 'FAB']);
  if (difficulty === 'medium')
    return new Set<MaskedField>(['DFA', 'DFB', 'DFAB', 'DFE', 'SSE', 'MSA', 'MSB', 'MSAB', 'FA', 'FB', 'FAB']);
  /* hard */
  return new Set<MaskedField>(['SSA', 'SSB', 'SSAB', 'SSE', 'SST', 'DFT', 'MSE']);
}

/* ── Scenarios ── */

const SCENARIOS = [
  { variable: 'test anxiety scores',          unit: 'points',  population: 'undergraduate students'  },
  { variable: 'reaction time',               unit: 'ms',      population: 'young adults'             },
  { variable: 'daily step count',            unit: 'steps',   population: 'office workers'           },
  { variable: 'sleep quality ratings',        unit: 'points',  population: 'adults'                   },
  { variable: 'working memory capacity',      unit: 'units',   population: 'college students'         },
  { variable: 'life satisfaction scores',     unit: 'points',  population: 'adults'                   },
  { variable: 'systolic blood pressure',      unit: 'mmHg',    population: 'adults aged 40–60'        },
  { variable: 'academic motivation scores',   unit: 'points',  population: 'high school students'     },
  { variable: 'job satisfaction ratings',     unit: 'points',  population: 'full-time employees'      },
  { variable: 'pain tolerance threshold',     unit: 'units',   population: 'adult patients'           },
  { variable: 'reading comprehension scores', unit: 'points',  population: 'eighth-grade students'    },
  { variable: 'cortisol levels',             unit: 'nmol/L',  population: 'adults under stress'      },
];

/* ── DOM helpers ── */

function setHtml(id: string, html: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setDisplay(id: string, val: string): void {
  const el = document.getElementById(id);
  if (el) el.style.display = val;
}

function clearInput(id: string): void {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (el) el.value = '';
}

function uncheckRadios(name: string): void {
  document.querySelectorAll(`input[name="${name}"]`).forEach(
    el => { (el as HTMLInputElement).checked = false; }
  );
}

/* ── Generate problem ── */

export function generateProblem(): TwoWayProblem {
  for (let attempt = 0; attempt < 100; attempt++) {
    const aLevels  = rChoice([2, 3, 4]);
    const bLevels  = rChoice([2, 3]);
    const nPerCell = rChoice([4, 5, 6, 8]);
    const N        = aLevels * bLevels * nPerCell;

    const gmOpts: number[] = [];
    for (let v = 40; v <= 120; v += 5) gmOpts.push(v);
    const GM = rChoice(gmOpts);

    const sdWithin  = rInt(4, 18);
    const sdA  = Math.random() < 0.70 ? rInt(0, sdWithin)          : rInt(Math.min(sdWithin + 1, 20), 20);
    const sdB  = Math.random() < 0.70 ? rInt(0, sdWithin)          : rInt(Math.min(sdWithin + 1, 20), 20);
    const sdAB = Math.random() < 0.70 ? rInt(0, sdWithin)          : rInt(Math.min(sdWithin + 1, 20), 20);

    const alpha      = rWeighted([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
    const difficulty = rChoice<Difficulty>(['easy', 'medium', 'hard']);
    const scenario   = rChoice(SCENARIOS);

    // Simulate main effects + centered interaction
    const A_eff = Array.from({ length: aLevels }, () => randNormal(0, sdA));
    const B_eff = Array.from({ length: bLevels }, () => randNormal(0, sdB));
    const AB_raw: number[][] = Array.from({ length: aLevels }, () =>
      Array.from({ length: bLevels }, () => randNormal(0, sdAB))
    );

    // Center AB: subtract row means, col means, add grand mean back
    const AB_rowMeans = AB_raw.map(row => row.reduce((s, v) => s + v, 0) / bLevels);
    const AB_colMeans = Array.from({ length: bLevels }, (_, j) =>
      AB_raw.reduce((s, row) => s + row[j], 0) / aLevels
    );
    const AB_grand = AB_raw.flat().reduce((s, v) => s + v, 0) / (aLevels * bLevels);
    const AB_eff = AB_raw.map((row, i) =>
      row.map((v, j) => v - AB_rowMeans[i] - AB_colMeans[j] + AB_grand)
    );

    // Cell means
    const cellMeans = Array.from({ length: aLevels }, (_, i) =>
      Array.from({ length: bLevels }, (_, j) =>
        GM + A_eff[i] + B_eff[j] + AB_eff[i][j]
      )
    );

    // Observations
    const y: number[][][] = cellMeans.map(row =>
      row.map(mu => Array.from({ length: nPerCell }, () => randNormal(mu, sdWithin)))
    );

    // Actual cell means from data
    const actCellMeans = y.map(row => row.map(cell => cell.reduce((s, v) => s + v, 0) / nPerCell));
    const actRowMeans  = actCellMeans.map(row => row.reduce((s, v) => s + v, 0) / bLevels);
    const actColMeans  = Array.from({ length: bLevels }, (_, j) =>
      actCellMeans.reduce((s, row) => s + row[j], 0) / aLevels
    );
    const allObs   = y.flat(2);
    const grandMean = allObs.reduce((s, v) => s + v, 0) / N;

    // SS components (balanced formulas)
    const SSA  = bLevels * nPerCell * actRowMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
    const SSB  = aLevels * nPerCell * actColMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
    const SSAB = nPerCell * actCellMeans.reduce((s, row, i) =>
      s + row.reduce((ss, m, j) => ss + (m - actRowMeans[i] - actColMeans[j] + grandMean) ** 2, 0), 0);
    const SSE = y.reduce((s, row, i) =>
      s + row.reduce((ss, cell, j) =>
        ss + cell.reduce((sss, v) => sss + (v - actCellMeans[i][j]) ** 2, 0), 0), 0);
    const SST = SSA + SSB + SSAB + SSE;

    const DFA  = aLevels - 1;
    const DFB  = bLevels - 1;
    const DFAB = DFA * DFB;
    const DFE  = N - aLevels * bLevels;
    const DFT  = N - 1;

    const MSA  = SSA  / DFA;
    const MSB  = SSB  / DFB;
    const MSAB = SSAB / DFAB;
    const MSE  = SSE  / DFE;

    const FA  = MSA  / MSE;
    const FB  = MSB  / MSE;
    const FAB = MSAB / MSE;

    // Quality control
    if (MSE < 0.001 || SSE <= 0) continue;
    if (!isFinite(FA) || !isFinite(FB) || !isFinite(FAB)) continue;

    const FcritA  = r3(fInv(alpha, DFA,  DFE));
    const FcritB  = r3(fInv(alpha, DFB,  DFE));
    const FcritAB = r3(fInv(alpha, DFAB, DFE));

    return {
      aLevels, bLevels, nPerCell, N, alpha, difficulty,
      table: { SSA, SSB, SSAB, SSE, SST, DFA, DFB, DFAB, DFE, DFT, MSA, MSB, MSAB, MSE, FA, FB, FAB },
      eta2: { A: r2(SSA / SST), B: r2(SSB / SST), AB: r2(SSAB / SST) },
      Fcrit: { A: FcritA, B: FcritB, AB: FcritAB },
      decisions: {
        A:  FA  >= FcritA  ? 'reject' : 'fail',
        B:  FB  >= FcritB  ? 'reject' : 'fail',
        AB: FAB >= FcritAB ? 'reject' : 'fail',
      },
      masked: getMasked(difficulty),
      variable: scenario.variable, unit: scenario.unit, population: scenario.population,
    };
  }

  // Fallback: should virtually never reach here
  throw new Error('Two-way ANOVA generation failed after 100 attempts');
}

/* ── Build interactive ANOVA table HTML ── */

function buildTableHtml(p: TwoWayProblem): string {
  const t = p.table;
  const td = 'padding:0.38rem 0.6rem;border:1px solid var(--border);text-align:center;';
  const th = 'padding:0.4rem 0.6rem;border:1px solid var(--border);background:var(--bg-subtle);font-weight:600;';

  function inputCell(field: MaskedField, isInt = false): string {
    return `<td style="${td}">
      <input type="number" step="${isInt ? '1' : '0.01'}" id="twp-input-${field}"
             class="sp-num-input" style="width:105px;text-align:center;" placeholder="?" />
      <span id="twp-cell-fb-${field}" style="margin-left:0.2rem;font-size:1em;"></span>
    </td>`;
  }

  function valCell(val: number, isInt = false): string {
    return `<td style="${td}">${isInt ? val : r2(val).toFixed(2)}</td>`;
  }

  function dashCell(): string {
    return `<td style="${td}color:#aaa;">—</td>`;
  }

  function cell(field: MaskedField, val: number, isInt = false): string {
    return p.masked.has(field) ? inputCell(field, isInt) : valCell(val, isInt);
  }

  const ssBetween = r2(t.SSA + t.SSB + t.SSAB).toFixed(2);
  const dfBetween = t.DFA + t.DFB + t.DFAB;

  return `<table style="border-collapse:collapse;width:100%;font-size:0.9rem;margin-top:0.6rem;">
    <thead><tr>
      <th style="${th}text-align:left;">Source</th>
      <th style="${th}">SS</th>
      <th style="${th}">df</th>
      <th style="${th}">MS</th>
      <th style="${th}">F</th>
    </tr></thead>
    <tbody>
      <tr>
        <td style="${td}text-align:left;font-weight:600;">Between Treatments</td>
        <td style="${td}">${ssBetween}</td>
        <td style="${td}">${dfBetween}</td>
        <td style="${td}color:#aaa;">—</td>
        <td style="${td}color:#aaa;">—</td>
      </tr>
      <tr>
        <td style="${td}text-align:left;">A</td>
        ${cell('SSA',  t.SSA)}
        ${cell('DFA',  t.DFA,  true)}
        ${cell('MSA',  t.MSA)}
        ${cell('FA',   t.FA)}
      </tr>
      <tr>
        <td style="${td}text-align:left;">B</td>
        ${cell('SSB',  t.SSB)}
        ${cell('DFB',  t.DFB,  true)}
        ${cell('MSB',  t.MSB)}
        ${cell('FB',   t.FB)}
      </tr>
      <tr>
        <td style="${td}text-align:left;">A &times; B</td>
        ${cell('SSAB', t.SSAB)}
        ${cell('DFAB', t.DFAB, true)}
        ${cell('MSAB', t.MSAB)}
        ${cell('FAB',  t.FAB)}
      </tr>
      <tr>
        <td style="${td}text-align:left;">Error</td>
        ${cell('SSE',  t.SSE)}
        ${cell('DFE',  t.DFE,  true)}
        ${cell('MSE',  t.MSE)}
        ${dashCell()}
      </tr>
      <tr>
        <td style="${td}text-align:left;">Total</td>
        ${cell('SST',  t.SST)}
        ${cell('DFT',  t.DFT,  true)}
        ${dashCell()}
        ${dashCell()}
      </tr>
    </tbody>
  </table>`;
}

/* ── Render problem ── */

export function renderProblem(p: TwoWayProblem): void {
  const alphaStr  = p.alpha.toFixed(2);
  const diffLabel = { easy: 'Easy', medium: 'Moderate', hard: 'Hard' }[p.difficulty];

  const narrative = `
    <p>A researcher conducted a two-way ANOVA to test whether mean
    <strong>${p.variable}</strong> differs as a function of
    Factor A (${p.aLevels}&nbsp;levels), Factor B (${p.bLevels}&nbsp;levels),
    and their interaction in a sample of <strong>${p.population}</strong>
    (N&nbsp;=&nbsp;${p.N}, n&nbsp;=&nbsp;${p.nPerCell}&nbsp;per&nbsp;cell).</p>
    <p>The partially completed ANOVA summary table is shown below
    (difficulty: <em>${diffLabel}</em>).
    Fill in all cells marked <strong>?</strong>, then answer the questions below
    using α&nbsp;=&nbsp;${alphaStr}.</p>
  `;
  setHtml('twp-problem-text', narrative + buildTableHtml(p));

  // Hypothesis radio options — Factor A
  const aOpts = [
    { value: 'correct',  label: `H₀: All Factor A means are equal &nbsp; H₁: At least one Factor A mean differs` },
    { value: 'reversed', label: `H₀: At least one Factor A mean differs &nbsp; H₁: All Factor A means are equal` },
    { value: 'variance', label: `H₀: All Factor A variances are equal &nbsp; H₁: At least one Factor A variance differs` },
  ];
  shuffleArr(aOpts);
  setHtml('twp-hyp-options-a', aOpts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="twp-hyp-a" value="${o.value}" />
      ${o.label}
    </label>`).join(''));

  // Factor B
  const bOpts = [
    { value: 'correct',  label: `H₀: All Factor B means are equal &nbsp; H₁: At least one Factor B mean differs` },
    { value: 'reversed', label: `H₀: At least one Factor B mean differs &nbsp; H₁: All Factor B means are equal` },
    { value: 'variance', label: `H₀: All Factor B variances are equal &nbsp; H₁: At least one Factor B variance differs` },
  ];
  shuffleArr(bOpts);
  setHtml('twp-hyp-options-b', bOpts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="twp-hyp-b" value="${o.value}" />
      ${o.label}
    </label>`).join(''));

  // Interaction A×B
  const abOpts = [
    { value: 'correct',  label: `H₀: No interaction between Factor A and Factor B &nbsp; H₁: An interaction exists` },
    { value: 'reversed', label: `H₀: An interaction exists between Factor A and Factor B &nbsp; H₁: No interaction` },
    { value: 'wrong',    label: `H₀: All cell means are equal &nbsp; H₁: At least one cell mean differs` },
  ];
  shuffleArr(abOpts);
  setHtml('twp-hyp-options-ab', abOpts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="twp-hyp-ab" value="${o.value}" />
      ${o.label}
    </label>`).join(''));
}

function shuffleArr<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ── Read helpers ── */

function readNum(id: string): number {
  return parseFloat((document.getElementById(id) as HTMLInputElement | null)?.value ?? '');
}

function readRadio(name: string): string | null {
  const el = document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement | null;
  return el ? el.value : null;
}

/* ── Grade answers ── */

export function gradeAnswers(p: TwoWayProblem): GradeResult {
  const t = p.table;
  const TOL = 0.05;

  const cells: Partial<Record<MaskedField, boolean>> = {};
  for (const field of p.masked) {
    const val = readNum(`twp-input-${field}`);
    let ok: boolean;
    switch (field) {
      case 'SSA':  ok = !isNaN(val) && Math.abs(val - t.SSA)  <= TOL; break;
      case 'SSB':  ok = !isNaN(val) && Math.abs(val - t.SSB)  <= TOL; break;
      case 'SSAB': ok = !isNaN(val) && Math.abs(val - t.SSAB) <= TOL; break;
      case 'SSE':  ok = !isNaN(val) && Math.abs(val - t.SSE)  <= TOL; break;
      case 'SST':  ok = !isNaN(val) && Math.abs(val - t.SST)  <= TOL; break;
      case 'DFA':  ok = val === t.DFA;  break;
      case 'DFB':  ok = val === t.DFB;  break;
      case 'DFAB': ok = val === t.DFAB; break;
      case 'DFE':  ok = val === t.DFE;  break;
      case 'DFT':  ok = val === t.DFT;  break;
      case 'MSA':  ok = !isNaN(val) && Math.abs(val - t.MSA)  <= TOL; break;
      case 'MSB':  ok = !isNaN(val) && Math.abs(val - t.MSB)  <= TOL; break;
      case 'MSAB': ok = !isNaN(val) && Math.abs(val - t.MSAB) <= TOL; break;
      case 'MSE':  ok = !isNaN(val) && Math.abs(val - t.MSE)  <= TOL; break;
      case 'FA':   ok = !isNaN(val) && Math.abs(val - t.FA)   <= TOL; break;
      case 'FB':   ok = !isNaN(val) && Math.abs(val - t.FB)   <= TOL; break;
      case 'FAB':  ok = !isNaN(val) && Math.abs(val - t.FAB)  <= TOL; break;
      default:     ok = false;
    }
    cells[field] = ok;
  }

  const fcritAIn = readNum('twp-answer-fcrit-a');
  const fcritBIn = readNum('twp-answer-fcrit-b');
  const fcritABIn = readNum('twp-answer-fcrit-ab');
  const eta2AIn  = readNum('twp-answer-eta2-a');
  const eta2BIn  = readNum('twp-answer-eta2-b');
  const eta2ABIn = readNum('twp-answer-eta2-ab');

  const fcritA  = !isNaN(fcritAIn)  && Math.abs(fcritAIn  - p.Fcrit.A)  <= 0.005;
  const fcritB  = !isNaN(fcritBIn)  && Math.abs(fcritBIn  - p.Fcrit.B)  <= 0.005;
  const fcritAB = !isNaN(fcritABIn) && Math.abs(fcritABIn - p.Fcrit.AB) <= 0.005;
  const eta2A   = !isNaN(eta2AIn)   && Math.abs(eta2AIn   - p.eta2.A)   <= 0.02;
  const eta2B   = !isNaN(eta2BIn)   && Math.abs(eta2BIn   - p.eta2.B)   <= 0.02;
  const eta2AB  = !isNaN(eta2ABIn)  && Math.abs(eta2ABIn  - p.eta2.AB)  <= 0.02;

  const hypA  = readRadio('twp-hyp-a')  === 'correct';
  const hypB  = readRadio('twp-hyp-b')  === 'correct';
  const hypAB = readRadio('twp-hyp-ab') === 'correct';
  const decA  = readRadio('twp-dec-a')  === p.decisions.A;
  const decB  = readRadio('twp-dec-b')  === p.decisions.B;
  const decAB = readRadio('twp-dec-ab') === p.decisions.AB;

  const allCorrect =
    Object.values(cells).every(v => v) &&
    hypA && hypB && hypAB &&
    fcritA && fcritB && fcritAB &&
    decA && decB && decAB &&
    eta2A && eta2B && eta2AB;

  return { cells, hypA, hypB, hypAB, fcritA, fcritB, fcritAB, decA, decB, decAB, eta2A, eta2B, eta2AB, allCorrect };
}

/* ── Feedback helpers ── */

function feedbackIcon(ok: boolean): string {
  return ok
    ? `<span style="color:#276622;font-size:1.1em;">✔</span>`
    : `<span style="color:#8B1A00;font-size:1.1em;">✘</span>`;
}

function fbHtml(ok: boolean, hint: string): string {
  return `${feedbackIcon(ok)}${ok ? '' : ` <span class="sp-hint">${hint}</span>`}`;
}

/* ── Render feedback ── */

export function renderFeedback(p: TwoWayProblem, grade: GradeResult): void {
  const t = p.table;

  const hints: Partial<Record<MaskedField, string>> = {
    SSA:  'SS<sub>A</sub> = n<sub>B</sub>×n<sub>cell</sub> × Σ(M<sub>A</sub> − GM)²',
    SSB:  'SS<sub>B</sub> = n<sub>A</sub>×n<sub>cell</sub> × Σ(M<sub>B</sub> − GM)²',
    SSAB: `SS<sub>A×B</sub> = SS<sub>Total</sub> − SS<sub>A</sub> − SS<sub>B</sub> − SS<sub>Error</sub>`,
    SSE:  `SS<sub>Error</sub> = SS<sub>Total</sub> − SS<sub>A</sub> − SS<sub>B</sub> − SS<sub>A×B</sub> = ${r2(t.SST).toFixed(2)} − ${r2(t.SSA).toFixed(2)} − ${r2(t.SSB).toFixed(2)} − ${r2(t.SSAB).toFixed(2)}`,
    SST:  `SS<sub>Total</sub> = SS<sub>A</sub> + SS<sub>B</sub> + SS<sub>A×B</sub> + SS<sub>Error</sub> = ${r2(t.SSA).toFixed(2)} + ${r2(t.SSB).toFixed(2)} + ${r2(t.SSAB).toFixed(2)} + ${r2(t.SSE).toFixed(2)}`,
    DFA:  `df<sub>A</sub> = k<sub>A</sub> − 1 = ${p.aLevels} − 1 = ${t.DFA}`,
    DFB:  `df<sub>B</sub> = k<sub>B</sub> − 1 = ${p.bLevels} − 1 = ${t.DFB}`,
    DFAB: `df<sub>A×B</sub> = df<sub>A</sub> × df<sub>B</sub> = ${t.DFA} × ${t.DFB} = ${t.DFAB}`,
    DFE:  `df<sub>Error</sub> = N − k<sub>A</sub>k<sub>B</sub> = ${p.N} − ${p.aLevels * p.bLevels} = ${t.DFE}`,
    DFT:  `df<sub>Total</sub> = N − 1 = ${p.N} − 1 = ${t.DFT}`,
    MSA:  `MS<sub>A</sub> = SS<sub>A</sub> / df<sub>A</sub> = ${r2(t.SSA).toFixed(2)} / ${t.DFA}`,
    MSB:  `MS<sub>B</sub> = SS<sub>B</sub> / df<sub>B</sub> = ${r2(t.SSB).toFixed(2)} / ${t.DFB}`,
    MSAB: `MS<sub>A×B</sub> = SS<sub>A×B</sub> / df<sub>A×B</sub> = ${r2(t.SSAB).toFixed(2)} / ${t.DFAB}`,
    MSE:  `MS<sub>Error</sub> = SS<sub>Error</sub> / df<sub>Error</sub> = ${r2(t.SSE).toFixed(2)} / ${t.DFE}`,
    FA:   `F<sub>A</sub> = MS<sub>A</sub> / MS<sub>Error</sub> = ${r2(t.MSA).toFixed(2)} / ${r2(t.MSE).toFixed(2)}`,
    FB:   `F<sub>B</sub> = MS<sub>B</sub> / MS<sub>Error</sub> = ${r2(t.MSB).toFixed(2)} / ${r2(t.MSE).toFixed(2)}`,
    FAB:  `F<sub>A×B</sub> = MS<sub>A×B</sub> / MS<sub>Error</sub> = ${r2(t.MSAB).toFixed(2)} / ${r2(t.MSE).toFixed(2)}`,
  };

  // Per-cell inline feedback
  for (const [field, ok] of Object.entries(grade.cells) as [MaskedField, boolean][]) {
    const fbEl = document.getElementById(`twp-cell-fb-${field}`);
    if (fbEl) fbEl.innerHTML = ok
      ? feedbackIcon(true)
      : `${feedbackIcon(false)} <span class="sp-hint">${hints[field] ?? ''}</span>`;
  }

  const aStr  = p.alpha.toFixed(2);
  setHtml('twp-fb-hyp-a',  fbHtml(grade.hypA,  'H₀ states all Factor A means are equal; H₁ states at least one differs.'));
  setHtml('twp-fb-hyp-b',  fbHtml(grade.hypB,  'H₀ states all Factor B means are equal; H₁ states at least one differs.'));
  setHtml('twp-fb-hyp-ab', fbHtml(grade.hypAB, 'H₀ states no interaction; H₁ states the effect of A depends on B.'));

  setHtml('twp-fb-fcrit-a',  fbHtml(grade.fcritA,  `F<sub>crit</sub>(${t.DFA}, ${t.DFE}) at α = ${aStr} = ${p.Fcrit.A.toFixed(3)}.`));
  setHtml('twp-fb-fcrit-b',  fbHtml(grade.fcritB,  `F<sub>crit</sub>(${t.DFB}, ${t.DFE}) at α = ${aStr} = ${p.Fcrit.B.toFixed(3)}.`));
  setHtml('twp-fb-fcrit-ab', fbHtml(grade.fcritAB, `F<sub>crit</sub>(${t.DFAB}, ${t.DFE}) at α = ${aStr} = ${p.Fcrit.AB.toFixed(3)}.`));

  setHtml('twp-fb-dec-a',  fbHtml(grade.decA,  `F<sub>A</sub> = ${r2(t.FA).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.A.toFixed(3)}. Reject if F ≥ F<sub>crit</sub>.`));
  setHtml('twp-fb-dec-b',  fbHtml(grade.decB,  `F<sub>B</sub> = ${r2(t.FB).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.B.toFixed(3)}. Reject if F ≥ F<sub>crit</sub>.`));
  setHtml('twp-fb-dec-ab', fbHtml(grade.decAB, `F<sub>A×B</sub> = ${r2(t.FAB).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.AB.toFixed(3)}. Reject if F ≥ F<sub>crit</sub>.`));

  setHtml('twp-fb-eta2-a',  fbHtml(grade.eta2A,  `η²<sub>A</sub> = SS<sub>A</sub> / SS<sub>Total</sub> = ${r2(t.SSA).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.A.toFixed(2)}`));
  setHtml('twp-fb-eta2-b',  fbHtml(grade.eta2B,  `η²<sub>B</sub> = SS<sub>B</sub> / SS<sub>Total</sub> = ${r2(t.SSB).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.B.toFixed(2)}`));
  setHtml('twp-fb-eta2-ab', fbHtml(grade.eta2AB, `η²<sub>A×B</sub> = SS<sub>A×B</sub> / SS<sub>Total</sub> = ${r2(t.SSAB).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.AB.toFixed(2)}`));

  const banner = document.getElementById('twp-fb-banner');
  if (banner) {
    banner.style.display = '';
    banner.className = `sp-banner ${grade.allCorrect ? 'sp-banner-success' : 'sp-banner-error'}`;
    banner.textContent = grade.allCorrect ? 'All correct! Great work.' : 'Some answers need work — see feedback above.';
  }

  setDisplay('twp-feedback-section', '');

  const solToggle = document.getElementById('twp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    solToggle.style.display = 'block';
    if (!grade.allCorrect) solToggle.open = true;
  }

  renderSolution(p);
}

/* ── Full solution ── */

function renderSolution(p: TwoWayProblem): void {
  const t        = p.table;
  const aStr     = p.alpha.toFixed(2);

  function decStr(d: 'reject' | 'fail'): string {
    return d === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';
  }

  function interp(effect: 'A' | 'B' | 'AB'): string {
    const dec = p.decisions[effect];
    if (effect === 'A') {
      return dec === 'reject'
        ? `Mean ${p.variable} differs across levels of Factor A at α = ${aStr}.`
        : `No evidence that mean ${p.variable} differs across levels of Factor A at α = ${aStr}.`;
    }
    if (effect === 'B') {
      return dec === 'reject'
        ? `Mean ${p.variable} differs across levels of Factor B at α = ${aStr}.`
        : `No evidence that mean ${p.variable} differs across levels of Factor B at α = ${aStr}.`;
    }
    return dec === 'reject'
      ? `The effect of Factor A on ${p.variable} depends on Factor B (interaction) at α = ${aStr}.`
      : `No evidence of an interaction between Factor A and Factor B at α = ${aStr}.`;
  }

  // Nested ANOVA table (mirrors anovatest.ts solution style)
  const tStyle = 'border-collapse:collapse;width:100%;font-size:0.87rem;margin:0.3rem 0;';
  const thS = 'padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);';
  const tdS = 'padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;';
  const dash = `<td style="${tdS}color:#aaa;">—</td>`;

  const anovaTable = `
    <table style="${tStyle}">
      <thead><tr>
        <th style="${thS}text-align:left;">Source</th>
        <th style="${thS}">SS</th>
        <th style="${thS}">df</th>
        <th style="${thS}">MS</th>
        <th style="${thS}">F</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="${tdS}text-align:left;font-weight:600;">Between Treatments</td>
          <td style="${tdS}">${r2(t.SSA + t.SSB + t.SSAB).toFixed(2)}</td>
          <td style="${tdS}">${t.DFA + t.DFB + t.DFAB}</td>
          ${dash}${dash}
        </tr>
        <tr>
          <td style="${tdS}text-align:left;">A</td>
          <td style="${tdS}">${r2(t.SSA).toFixed(2)}</td>
          <td style="${tdS}">${t.DFA}</td>
          <td style="${tdS}">${r2(t.MSA).toFixed(2)}</td>
          <td style="${tdS}">${r2(t.FA).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="${tdS}text-align:left;">B</td>
          <td style="${tdS}">${r2(t.SSB).toFixed(2)}</td>
          <td style="${tdS}">${t.DFB}</td>
          <td style="${tdS}">${r2(t.MSB).toFixed(2)}</td>
          <td style="${tdS}">${r2(t.FB).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="${tdS}text-align:left;">A &times; B</td>
          <td style="${tdS}">${r2(t.SSAB).toFixed(2)}</td>
          <td style="${tdS}">${t.DFAB}</td>
          <td style="${tdS}">${r2(t.MSAB).toFixed(2)}</td>
          <td style="${tdS}">${r2(t.FAB).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="${tdS}text-align:left;">Error</td>
          <td style="${tdS}">${r2(t.SSE).toFixed(2)}</td>
          <td style="${tdS}">${t.DFE}</td>
          <td style="${tdS}">${r2(t.MSE).toFixed(2)}</td>
          ${dash}
        </tr>
        <tr>
          <td style="${tdS}text-align:left;">Total</td>
          <td style="${tdS}">${r2(t.SST).toFixed(2)}</td>
          <td style="${tdS}">${t.DFT}</td>
          ${dash}${dash}
        </tr>
      </tbody>
    </table>`;

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Context</th></tr>
      <tr><td>Variable</td><td>${p.variable} (${p.unit})</td></tr>
      <tr><td>Population</td><td>${p.population}</td></tr>
      <tr><td>Design</td><td>${p.aLevels} × ${p.bLevels} between-subjects</td></tr>
      <tr><td>n per cell</td><td>${p.nPerCell}</td></tr>
      <tr><td>N (total)</td><td>${p.N}</td></tr>
      <tr><td>α</td><td>${aStr}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>Factor A</td><td>H₀: All Factor A means equal &nbsp; H₁: At least one differs</td></tr>
      <tr><td>Factor B</td><td>H₀: All Factor B means equal &nbsp; H₁: At least one differs</td></tr>
      <tr><td>A × B</td><td>H₀: No interaction &nbsp; H₁: Interaction exists</td></tr>

      <tr><th colspan="2">ANOVA Table</th></tr>
      <tr><td colspan="2">${anovaTable}</td></tr>

      <tr><th colspan="2">F Critical Values</th></tr>
      <tr><td>F<sub>crit</sub>(${t.DFA}, ${t.DFE}) — Factor A</td><td>${p.Fcrit.A.toFixed(3)}</td></tr>
      <tr><td>F<sub>crit</sub>(${t.DFB}, ${t.DFE}) — Factor B</td><td>${p.Fcrit.B.toFixed(3)}</td></tr>
      <tr><td>F<sub>crit</sub>(${t.DFAB}, ${t.DFE}) — A × B</td><td>${p.Fcrit.AB.toFixed(3)}</td></tr>

      <tr><th colspan="2">Significance Decisions</th></tr>
      <tr><td>Factor A: F = ${r2(t.FA).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.A.toFixed(3)}</td><td><strong>${decStr(p.decisions.A)}</strong></td></tr>
      <tr><td>Factor B: F = ${r2(t.FB).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.B.toFixed(3)}</td><td><strong>${decStr(p.decisions.B)}</strong></td></tr>
      <tr><td>A × B: F = ${r2(t.FAB).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.AB.toFixed(3)}</td><td><strong>${decStr(p.decisions.AB)}</strong></td></tr>

      <tr><th colspan="2">Effect Sizes (η²)</th></tr>
      <tr><td>η²<sub>A</sub> = SS<sub>A</sub> / SS<sub>Total</sub></td><td>${r2(t.SSA).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.A.toFixed(2)}</td></tr>
      <tr><td>η²<sub>B</sub> = SS<sub>B</sub> / SS<sub>Total</sub></td><td>${r2(t.SSB).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.B.toFixed(2)}</td></tr>
      <tr><td>η²<sub>A×B</sub> = SS<sub>A×B</sub> / SS<sub>Total</sub></td><td>${r2(t.SSAB).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.AB.toFixed(2)}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td>Factor A</td><td>${interp('A')}</td></tr>
      <tr><td>Factor B</td><td>${interp('B')}</td></tr>
      <tr><td>A × B</td><td>${interp('AB')}</td></tr>
    </table>
  `;
  setHtml('twp-solution-body', html);
}

/* ── Reset UI ── */

export function resetUI(): void {
  const allFields: MaskedField[] = [
    'SSA','SSB','SSAB','SSE','SST',
    'DFA','DFB','DFAB','DFE','DFT',
    'MSA','MSB','MSAB','MSE',
    'FA','FB','FAB',
  ];
  allFields.forEach(f => clearInput(`twp-input-${f}`));

  ['twp-answer-fcrit-a', 'twp-answer-fcrit-b', 'twp-answer-fcrit-ab',
   'twp-answer-eta2-a',  'twp-answer-eta2-b',  'twp-answer-eta2-ab'].forEach(clearInput);

  ['twp-hyp-a', 'twp-hyp-b', 'twp-hyp-ab',
   'twp-dec-a', 'twp-dec-b', 'twp-dec-ab'].forEach(uncheckRadios);

  setDisplay('twp-feedback-section', 'none');

  const solToggle = document.getElementById('twp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) { solToggle.style.display = 'none'; solToggle.open = false; }

  const banner = document.getElementById('twp-fb-banner');
  if (banner) banner.style.display = 'none';

  setHtml('twp-problem-text', '<span class="sp-placeholder">Click <strong>New Problem</strong> below to generate a practice problem.</span>');
  ['twp-hyp-options-a', 'twp-hyp-options-b', 'twp-hyp-options-ab'].forEach(id =>
    setHtml(id, '<span class="sp-placeholder">Generate a problem to see options.</span>')
  );

  const fbIds = [
    'twp-fb-hyp-a','twp-fb-hyp-b','twp-fb-hyp-ab',
    'twp-fb-fcrit-a','twp-fb-fcrit-b','twp-fb-fcrit-ab',
    'twp-fb-dec-a','twp-fb-dec-b','twp-fb-dec-ab',
    'twp-fb-eta2-a','twp-fb-eta2-b','twp-fb-eta2-ab',
  ];
  fbIds.forEach(id => setHtml(id, ''));
}
