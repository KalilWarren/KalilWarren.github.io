/* ── One-Way Repeated-Measures ANOVA Student Practice Module ── */
/*
 * Masking patterns mirror toolkit problems.ts maskRmaAnovaTable():
 *   easy:   hide MSBT, MSBS, MSE, F
 *   medium: hide DFBT, DFBS, DFE, SSE, MSBT, F
 *   hard:   hide SSBT, SSBS, SSE, SST, DFT, MSE
 */

/* ── Types ── */

type Difficulty  = 'easy' | 'medium' | 'hard';
type MaskedField = 'SSBT' | 'SSBS' | 'SSE' | 'SST'
                 | 'DFBT' | 'DFBS' | 'DFE' | 'DFT'
                 | 'MSBT' | 'MSBS' | 'MSE' | 'F';

interface RmaTable {
  SSBT: number; DFBT: number; MSBT: number;
  SSBS: number; DFBS: number; MSBS: number;
  SSE:  number; DFE:  number; MSE:  number;
  SST:  number; DFT:  number;
  F:    number;
}

export interface RmaProblem {
  nSubjects:     number;
  nConditions:   number;
  N:             number;
  alpha:         number;
  difficulty:    Difficulty;
  table:         RmaTable;
  eta2:          number;
  Fcrit:         number;
  decision_true: 'reject' | 'fail';
  masked:        Set<MaskedField>;
  variable:      string;
  population:    string;
}

export interface GradeResult {
  cells:      Partial<Record<MaskedField, boolean>>;
  hyp:        boolean;
  fcrit:      boolean;
  eta2:       boolean;
  decision:   boolean;
  allCorrect: boolean;
}

/* ── Utilities ── */

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
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sd * z;
}

/* ── Math for inverse-F distribution (Lanczos + regularized incomplete beta) ── */

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
  if (x < (a + 1) / (a + b + 2)) {
    return (Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a) * betaCF(x, a, b);
  }
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

/* ── Masking sets (mirrors toolkit problems.ts maskRmaAnovaTable) ── */

function getMasked(difficulty: Difficulty): Set<MaskedField> {
  if (difficulty === 'easy')
    return new Set<MaskedField>(['MSBT', 'MSBS', 'MSE', 'F']);
  if (difficulty === 'medium')
    return new Set<MaskedField>(['DFBT', 'DFBS', 'DFE', 'SSE', 'MSBT', 'F']);
  /* hard */
  return new Set<MaskedField>(['SSBT', 'SSBS', 'SSE', 'SST', 'DFT', 'MSE']);
}

/* ── Scenarios ── */

const SCENARIOS = [
  // Original 12
  { variable: 'reaction time',                    population: 'young adults'                },
  { variable: 'cortisol levels',                  population: 'adults under stress'         },
  { variable: 'pain tolerance threshold',         population: 'adult patients'              },
  { variable: 'working memory capacity',          population: 'college students'            },
  { variable: 'sleep quality ratings',            population: 'adults'                      },
  { variable: 'heart rate',                       population: 'healthy adults'              },
  { variable: 'cognitive load ratings',           population: 'university students'         },
  { variable: 'anxiety scores',                   population: 'adult participants'          },
  { variable: 'task completion time',             population: 'office workers'              },
  { variable: 'systolic blood pressure',          population: 'adults aged 40–60'           },
  { variable: 'mood ratings',                     population: 'adults'                      },
  { variable: 'attention span',                   population: 'college-aged participants'   },
  // New 38
  { variable: 'test anxiety scores',              population: 'undergraduate students'      },
  { variable: 'self-efficacy ratings',            population: 'graduate students'           },
  { variable: 'social anxiety scores',            population: 'undergraduate students'      },
  { variable: 'procrastination scores',           population: 'college students'            },
  { variable: 'resilience scores',                population: 'adults'                      },
  { variable: 'mindfulness ratings',              population: 'working adults'              },
  { variable: 'stress reactivity scores',         population: 'adults'                      },
  { variable: 'emotional regulation scores',      population: 'adolescents'                 },
  { variable: 'intrinsic motivation ratings',     population: 'middle school students'      },
  { variable: 'decision-making accuracy',         population: 'older adults'                },
  { variable: 'creative problem-solving scores',  population: 'undergraduate students'      },
  { variable: 'verbal fluency scores',            population: 'adults'                      },
  { variable: 'spatial reasoning scores',         population: 'engineering students'        },
  { variable: 'executive function scores',        population: 'children aged 8–12'          },
  { variable: 'academic engagement ratings',      population: 'high school students'        },
  { variable: 'depression scores',                population: 'clinical outpatients'        },
  { variable: 'cognitive flexibility scores',     population: 'young adults'                },
  { variable: 'resting heart rate',               population: 'sedentary adults'            },
  { variable: 'sleep duration',                   population: 'shift workers'               },
  { variable: 'fatigue severity scores',          population: 'adults with chronic illness' },
  { variable: 'chronic pain intensity ratings',   population: 'adult patients'              },
  { variable: 'grip strength',                    population: 'older adults'                },
  { variable: 'body mass index',                  population: 'adults aged 25–45'           },
  { variable: 'physical activity level',          population: 'adults'                      },
  { variable: 'lung function',                    population: 'adults with asthma'          },
  { variable: 'resting metabolic rate',           population: 'healthy adults'              },
  { variable: 'blood glucose levels',             population: 'pre-diabetic adults'         },
  { variable: 'heart rate variability',           population: 'endurance athletes'          },
  { variable: 'reading comprehension scores',     population: 'fifth-grade students'        },
  { variable: 'exam performance scores',          population: 'undergraduate students'      },
  { variable: 'vocabulary test scores',           population: 'language learners'           },
  { variable: 'GPA',                              population: 'college freshmen'            },
  { variable: 'homework completion rates',        population: 'middle school students'      },
  { variable: 'classroom participation ratings',  population: 'eighth-grade students'       },
  { variable: 'critical thinking scores',         population: 'graduate students'           },
  { variable: 'academic self-efficacy scores',    population: 'high school seniors'         },
  { variable: 'job satisfaction scores',          population: 'full-time employees'         },
  { variable: 'workplace stress scores',          population: 'healthcare workers'          },
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

export function generateProblem(): RmaProblem {
  const nSubjects    = rChoice([5, 6, 7, 8, 10]);
  const nConditions  = rChoice([3, 4, 5]);
  const N            = nSubjects * nConditions;

  const gmOpts: number[] = [];
  for (let v = 40; v <= 120; v += 5) gmOpts.push(v);
  const GM = rChoice(gmOpts);

  const subjectSD   = rInt(4, 18);
  const conditionSD = Math.random() < 0.70
    ? rInt(2, Math.max(2, subjectSD))
    : rInt(Math.min(subjectSD + 1, 20), 20);
  const errorSD     = rInt(2, 10);

  const alpha      = rWeighted([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const difficulty = rChoice<Difficulty>(['easy', 'medium', 'hard']);
  const scenario   = rChoice(SCENARIOS);

  // Generate data matrix [subject × condition]
  const subjectBaselines = Array.from({ length: nSubjects }, () => randNormal(GM, subjectSD));
  const conditionOffsets = Array.from({ length: nConditions }, () => randNormal(0, conditionSD));

  const data: number[][] = subjectBaselines.map(sb =>
    conditionOffsets.map(co => sb + co + randNormal(0, errorSD))
  );

  // Compute grand mean
  const grandMean = data.flat().reduce((s, x) => s + x, 0) / N;

  // Condition means (mean over subjects per condition)
  const condMeans = Array.from({ length: nConditions }, (_, j) =>
    data.reduce((s, row) => s + row[j], 0) / nSubjects
  );

  // Subject means (mean over conditions per subject)
  const subjMeans = data.map(row => row.reduce((s, x) => s + x, 0) / nConditions);

  // SS partitions
  const SSBT = nSubjects * condMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
  const SSBS = nConditions * subjMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);
  const SST  = data.flat().reduce((s, x) => s + (x - grandMean) ** 2, 0);
  const SSE  = SST - SSBT - SSBS;

  const DFBT = nConditions - 1;
  const DFBS = nSubjects - 1;
  const DFE  = DFBT * DFBS;
  const DFT  = N - 1;

  const MSBT = SSBT / DFBT;
  const MSBS = SSBS / DFBS;
  const MSE  = Math.max(SSE, 0.001) / DFE;
  const F    = MSBT / MSE;

  const Fcrit        = r3(fInv(alpha, DFBT, DFE));
  const decision_true: 'reject' | 'fail' = F >= Fcrit ? 'reject' : 'fail';
  const eta2         = r2(SSBT / (SSBT + SSE));

  return {
    nSubjects, nConditions, N, alpha, difficulty,
    table: {
      SSBT, DFBT, MSBT,
      SSBS, DFBS, MSBS,
      SSE,  DFE,  MSE,
      SST,  DFT,  F,
    },
    eta2, Fcrit, decision_true,
    masked: getMasked(difficulty),
    variable: scenario.variable,
    population: scenario.population,
  };
}

/* ── Build the interactive ANOVA table HTML ── */

function buildTableHtml(p: RmaProblem): string {
  const t = p.table;
  const tdStyle = 'padding:0.38rem 0.6rem;border:1px solid var(--border);text-align:center;';
  const thStyle = 'padding:0.4rem 0.6rem;border:1px solid var(--border);background:var(--bg-subtle);font-weight:600;';

  function inputCell(field: MaskedField, isInt = false): string {
    return `<td style="${tdStyle}">
      <input type="number" step="${isInt ? '1' : '0.01'}" id="rmp-input-${field}"
             class="sp-num-input" style="width:105px;text-align:center;" placeholder="?" />
      <span id="rmp-cell-fb-${field}" style="margin-left:0.25rem;font-size:1em;"></span>
    </td>`;
  }

  function valCell(val: number, isInt = false): string {
    return `<td style="${tdStyle}">${isInt ? val : r2(val).toFixed(2)}</td>`;
  }

  function dashCell(): string {
    return `<td style="${tdStyle}color:#aaa;">—</td>`;
  }

  function cell(field: MaskedField, val: number, isInt = false): string {
    return p.masked.has(field) ? inputCell(field, isInt) : valCell(val, isInt);
  }

  return `<table style="border-collapse:collapse;width:100%;font-size:0.9rem;margin-top:0.6rem;">
    <thead><tr>
      <th style="${thStyle}text-align:left;">Source</th>
      <th style="${thStyle}">SS</th>
      <th style="${thStyle}">df</th>
      <th style="${thStyle}">MS</th>
      <th style="${thStyle}">F</th>
    </tr></thead>
    <tbody>
      <tr>
        <td style="${tdStyle}text-align:left;">Between Treatments</td>
        ${cell('SSBT', t.SSBT)}
        ${cell('DFBT', t.DFBT, true)}
        ${cell('MSBT', t.MSBT)}
        ${cell('F',    t.F)}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;">Within Treatment</td>
        <td style="${tdStyle}">${r2(t.SSBS + t.SSE).toFixed(2)}</td>
        <td style="${tdStyle}">${t.DFBS + t.DFE}</td>
        ${dashCell()}
        ${dashCell()}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;padding-left:1.5rem;">Between Subjects</td>
        ${cell('SSBS', t.SSBS)}
        ${cell('DFBS', t.DFBS, true)}
        ${cell('MSBS', t.MSBS)}
        ${dashCell()}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;padding-left:1.5rem;">Error</td>
        ${cell('SSE', t.SSE)}
        ${cell('DFE', t.DFE, true)}
        ${cell('MSE', t.MSE)}
        ${dashCell()}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;">Total</td>
        ${cell('SST', t.SST)}
        ${cell('DFT', t.DFT, true)}
        ${dashCell()}
        ${dashCell()}
      </tr>
    </tbody>
  </table>`;
}

/* ── Render problem ── */

export function renderProblem(p: RmaProblem): void {
  const alphaStr  = p.alpha.toFixed(2);
  const diffLabel = { easy: 'Easy', medium: 'Moderate', hard: 'Hard' }[p.difficulty];

  const narrative = `
    <p>A researcher conducted a one-way repeated-measures ANOVA to examine whether mean
    <strong>${p.variable}</strong> differs across <strong>${p.nConditions}</strong> conditions
    in a sample of <strong>${p.population}</strong>
    (N&nbsp;=&nbsp;${p.N}, n&nbsp;=&nbsp;${p.nSubjects} subjects).</p>
    <p>The partially completed RM ANOVA summary table is shown below
    (difficulty: <em>${diffLabel}</em>).
    Fill in all cells marked <strong>?</strong>, then answer the questions below
    using α&nbsp;=&nbsp;${alphaStr}.</p>
  `;

  setHtml('rmp-problem-text', narrative + buildTableHtml(p));

  // Hypothesis radio options (shuffled)
  const kSubs = Array.from({ length: p.nConditions }, (_, i) => `μ${i + 1}`).join(' = ');
  const opts = [
    { value: 'correct',  label: `H₀: ${kSubs} &nbsp;&nbsp; H₁: At least one condition mean differs` },
    { value: 'reversed', label: `H₀: At least one condition mean differs &nbsp;&nbsp; H₁: ${kSubs}` },
    { value: 'variance', label: `H₀: All condition variances are equal &nbsp;&nbsp; H₁: At least one variance differs` },
  ];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  setHtml('rmp-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="rmp-hyp-select" value="${o.value}" />
      ${o.label}
    </label>
  `).join(''));
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

export function gradeAnswers(p: RmaProblem): GradeResult {
  const t = p.table;
  const TOL = 0.05;

  const cells: Partial<Record<MaskedField, boolean>> = {};
  for (const field of p.masked) {
    const val = readNum(`rmp-input-${field}`);
    let ok: boolean;
    switch (field) {
      case 'SSBT': ok = !isNaN(val) && Math.abs(val - t.SSBT) <= TOL; break;
      case 'SSBS': ok = !isNaN(val) && Math.abs(val - t.SSBS) <= TOL; break;
      case 'SSE':  ok = !isNaN(val) && Math.abs(val - t.SSE)  <= TOL; break;
      case 'SST':  ok = !isNaN(val) && Math.abs(val - t.SST)  <= TOL; break;
      case 'DFBT': ok = val === t.DFBT; break;
      case 'DFBS': ok = val === t.DFBS; break;
      case 'DFE':  ok = val === t.DFE;  break;
      case 'DFT':  ok = val === t.DFT;  break;
      case 'MSBT': ok = !isNaN(val) && Math.abs(val - t.MSBT) <= TOL; break;
      case 'MSBS': ok = !isNaN(val) && Math.abs(val - t.MSBS) <= TOL; break;
      case 'MSE':  ok = !isNaN(val) && Math.abs(val - t.MSE)  <= TOL; break;
      case 'F':    ok = !isNaN(val) && Math.abs(val - t.F)    <= TOL; break;
      default:     ok = false;
    }
    cells[field] = ok;
  }

  const eta2Input  = readNum('rmp-answer-eta2');
  const fcritInput = readNum('rmp-answer-fcrit');
  const eta2       = !isNaN(eta2Input)  && Math.abs(eta2Input  - p.eta2)  <= 0.02;
  const fcrit      = !isNaN(fcritInput) && Math.abs(fcritInput - p.Fcrit) <= 0.005;
  const hyp        = readRadio('rmp-hyp-select') === 'correct';
  const decision   = readRadio('rmp-decision-select') === p.decision_true;
  const allCorrect = Object.values(cells).every(v => v) && hyp && fcrit && eta2 && decision;

  return { cells, hyp, fcrit, eta2, decision, allCorrect };
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

export function renderFeedback(p: RmaProblem, grade: GradeResult): void {
  const t = p.table;

  const hints: Partial<Record<MaskedField, string>> = {
    SSBT: `SS<sub>BT</sub> = n<sub>s</sub> × Σ(M<sub>condition</sub> − GM)²`,
    SSBS: `SS<sub>BS</sub> = k × Σ(M<sub>subject</sub> − GM)²`,
    SSE:  `SS<sub>Error</sub> = SS<sub>Total</sub> − SS<sub>BT</sub> − SS<sub>BS</sub> = ${r2(t.SST).toFixed(2)} − ${r2(t.SSBT).toFixed(2)} − ${r2(t.SSBS).toFixed(2)}`,
    SST:  `SS<sub>Total</sub> = SS<sub>BT</sub> + SS<sub>BS</sub> + SS<sub>Error</sub> = ${r2(t.SSBT).toFixed(2)} + ${r2(t.SSBS).toFixed(2)} + ${r2(t.SSE).toFixed(2)}`,
    DFBT: `df<sub>BT</sub> = k − 1 = ${p.nConditions} − 1 = ${t.DFBT}`,
    DFBS: `df<sub>BS</sub> = n − 1 = ${p.nSubjects} − 1 = ${t.DFBS}`,
    DFE:  `df<sub>Error</sub> = (n − 1)(k − 1) = ${t.DFBS} × ${t.DFBT} = ${t.DFE}`,
    DFT:  `df<sub>Total</sub> = df<sub>BT</sub> + df<sub>BS</sub> + df<sub>Error</sub> = ${t.DFBT} + ${t.DFBS} + ${t.DFE} = ${t.DFT}`,
    MSBT: `MS<sub>BT</sub> = SS<sub>BT</sub> / df<sub>BT</sub> = ${r2(t.SSBT).toFixed(2)} / ${t.DFBT}`,
    MSBS: `MS<sub>BS</sub> = SS<sub>BS</sub> / df<sub>BS</sub> = ${r2(t.SSBS).toFixed(2)} / ${t.DFBS}`,
    MSE:  `MS<sub>Error</sub> = SS<sub>Error</sub> / df<sub>Error</sub> = ${r2(t.SSE).toFixed(2)} / ${t.DFE}`,
    F:    `F = MS<sub>BT</sub> / MS<sub>Error</sub> = ${r2(t.MSBT).toFixed(2)} / ${r2(t.MSE).toFixed(2)}`,
  };

  for (const [field, ok] of Object.entries(grade.cells) as [MaskedField, boolean][]) {
    const fbEl = document.getElementById(`rmp-cell-fb-${field}`);
    if (fbEl) fbEl.innerHTML = ok ? feedbackIcon(true) : `${feedbackIcon(false)} <span class="sp-hint">${hints[field] ?? ''}</span>`;
  }

  setHtml('rmp-fb-hyp',      fbHtml(grade.hyp,      'H₀ states all condition means are equal; H₁ states at least one differs.'));
  setHtml('rmp-fb-fcrit',    fbHtml(grade.fcrit,    `F<sub>crit</sub>(${t.DFBT}, ${t.DFE}) at α = ${p.alpha.toFixed(2)} = ${p.Fcrit.toFixed(3)}.`));
  setHtml('rmp-fb-decision', fbHtml(grade.decision, `F = ${r2(t.F).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.toFixed(3)}. Reject H₀ if F ≥ F<sub>crit</sub>.`));
  setHtml('rmp-fb-eta2',     fbHtml(grade.eta2,     `η² = SS<sub>BT</sub> / (SS<sub>BT</sub> + SS<sub>Error</sub>) = ${r2(t.SSBT).toFixed(2)} / (${r2(t.SSBT).toFixed(2)} + ${r2(t.SSE).toFixed(2)}) = ${p.eta2.toFixed(2)}`));

  const banner = document.getElementById('rmp-fb-banner');
  if (banner) {
    banner.style.display = '';
    banner.className = `sp-banner ${grade.allCorrect ? 'sp-banner-success' : 'sp-banner-error'}`;
    banner.textContent = grade.allCorrect ? 'All correct! Great work.' : 'Some answers need work — see feedback above.';
  }

  setDisplay('rmp-feedback-section', '');

  const solToggle = document.getElementById('rmp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    solToggle.style.display = 'block';
    if (!grade.allCorrect) solToggle.open = true;
  }

  renderSolution(p);
}

/* ── Full solution ── */

function renderSolution(p: RmaProblem): void {
  const t        = p.table;
  const alphaStr = p.alpha.toFixed(2);
  const decWord  = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';
  const kSubs    = Array.from({ length: p.nConditions }, (_, i) => `μ${i + 1}`).join(' = ');
  const interp   = p.decision_true === 'reject'
    ? `There is evidence that mean ${p.variable} differs across the conditions at α = ${alphaStr}.`
    : `There is no evidence that mean ${p.variable} differs across the conditions at α = ${alphaStr}.`;

  const tdS = 'padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;';
  const thS = `padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);`;
  const tdL = tdS + 'text-align:left;';
  const dash = `<td style="${tdS}color:#aaa;">—</td>`;

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Context</th></tr>
      <tr><td>Variable</td><td>${p.variable}</td></tr>
      <tr><td>Population</td><td>${p.population}</td></tr>
      <tr><td>Subjects (n)</td><td>${p.nSubjects}</td></tr>
      <tr><td>Conditions (k)</td><td>${p.nConditions}</td></tr>
      <tr><td>N (total obs)</td><td>${p.N}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>${kSubs}</td></tr>
      <tr><td>H₁</td><td>At least one condition mean differs</td></tr>

      <tr><th colspan="2">RM ANOVA Table</th></tr>
      <tr><td colspan="2">
        <table style="border-collapse:collapse;width:100%;font-size:0.87rem;margin:0.3rem 0;">
          <thead><tr>
            <th style="${thS}text-align:left;">Source</th>
            <th style="${thS}">SS</th>
            <th style="${thS}">df</th>
            <th style="${thS}">MS</th>
            <th style="${thS}">F</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style="${tdL}">Between Treatments</td>
              <td style="${tdS}">${r2(t.SSBT).toFixed(2)}</td>
              <td style="${tdS}">${t.DFBT}</td>
              <td style="${tdS}">${r2(t.MSBT).toFixed(2)}</td>
              <td style="${tdS}">${r2(t.F).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="${tdL}">Within Treatment</td>
              <td style="${tdS}">${r2(t.SSBS + t.SSE).toFixed(2)}</td>
              <td style="${tdS}">${t.DFBS + t.DFE}</td>
              ${dash}
              ${dash}
            </tr>
            <tr>
              <td style="${tdL}padding-left:1.5rem;">Between Subjects</td>
              <td style="${tdS}">${r2(t.SSBS).toFixed(2)}</td>
              <td style="${tdS}">${t.DFBS}</td>
              <td style="${tdS}">${r2(t.MSBS).toFixed(2)}</td>
              ${dash}
            </tr>
            <tr>
              <td style="${tdL}padding-left:1.5rem;">Error</td>
              <td style="${tdS}">${r2(t.SSE).toFixed(2)}</td>
              <td style="${tdS}">${t.DFE}</td>
              <td style="${tdS}">${r2(t.MSE).toFixed(2)}</td>
              ${dash}
            </tr>
            <tr>
              <td style="${tdL}">Total</td>
              <td style="${tdS}">${r2(t.SST).toFixed(2)}</td>
              <td style="${tdS}">${t.DFT}</td>
              ${dash}
              ${dash}
            </tr>
          </tbody>
        </table>
      </td></tr>

      <tr><th colspan="2">Note</th></tr>
      <tr><td colspan="2" style="font-size:0.85rem;color:var(--text-light);">
        The Between Subjects row partitions out individual differences (a nuisance factor).
        F is computed as MS<sub>BT</sub> / MS<sub>Error</sub> — <em>not</em> MS<sub>BT</sub> / MS<sub>BS</sub>.
      </td></tr>

      <tr><th colspan="2">Significance</th></tr>
      <tr><td>F<sub>crit</sub>(${t.DFBT}, ${t.DFE}), α = ${alphaStr}</td><td>${p.Fcrit.toFixed(3)}</td></tr>
      <tr><td>Decision rule</td><td>Reject H₀ if F ≥ F<sub>crit</sub></td></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Size</th></tr>
      <tr><td>η² = SS<sub>BT</sub> / (SS<sub>BT</sub> + SS<sub>Error</sub>)</td><td>${p.eta2.toFixed(2)}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interp}</td></tr>
    </table>
  `;
  setHtml('rmp-solution-body', html);
}

/* ── Reset UI ── */

export function resetUI(): void {
  const allFields: MaskedField[] = [
    'SSBT', 'SSBS', 'SSE', 'SST',
    'DFBT', 'DFBS', 'DFE', 'DFT',
    'MSBT', 'MSBS', 'MSE', 'F',
  ];
  allFields.forEach(f => clearInput(`rmp-input-${f}`));
  clearInput('rmp-answer-fcrit');
  clearInput('rmp-answer-eta2');
  uncheckRadios('rmp-hyp-select');
  uncheckRadios('rmp-decision-select');
  setDisplay('rmp-feedback-section', 'none');

  const solToggle = document.getElementById('rmp-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) { solToggle.style.display = 'none'; solToggle.open = false; }

  const banner = document.getElementById('rmp-fb-banner');
  if (banner) banner.style.display = 'none';

  setHtml('rmp-problem-text', '<span class="sp-placeholder">Click <strong>New Problem</strong> below to generate a practice problem.</span>');
  setHtml('rmp-hyp-options',  '<span class="sp-placeholder">Generate a problem to see options.</span>');
  setHtml('rmp-fb-hyp',      '');
  setHtml('rmp-fb-fcrit',    '');
  setHtml('rmp-fb-decision', '');
  setHtml('rmp-fb-eta2',     '');
}
