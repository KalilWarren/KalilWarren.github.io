/* ── One-Way Independent ANOVA Student Practice Module ── */
/*
 * Masking patterns mirror problems.ts maskANOVATable():
 *   easy:   hide MSB, MSW, F
 *   medium: hide DFB, DFW, SSW, MSB, F
 *   hard:   hide MSW, SSB, SSW, SST, DFT
 */

/* ── Types ── */

type Difficulty  = 'easy' | 'medium' | 'hard';
type MaskedField = 'SSB' | 'SSW' | 'SST' | 'DFB' | 'DFW' | 'DFT' | 'MSB' | 'MSW' | 'F';

interface AnovaTable {
  SSB: number; SSW: number; SST: number;
  DFB: number; DFW: number; DFT: number;
  MSB: number; MSW: number; F:   number;
}

export interface AnovaProblem {
  k:             number;
  nPerCell:      number;
  N:             number;
  alpha:         number;
  difficulty:    Difficulty;
  table:         AnovaTable;
  eta2:          number;   // 2 dp
  Fcrit:         number;   // 3 dp
  decision_true: 'reject' | 'fail';
  masked:        Set<MaskedField>;
  variable:      string;
  unit:          string;
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

// P(X > f) for X ~ F(df1, df2)
function fUpperTail(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return ibeta(x, df2 / 2, df1 / 2);
}

// F_crit such that P(X > F_crit) = alpha  (bisection on [0, 500])
function fInv(alpha: number, df1: number, df2: number): number {
  let lo = 0, hi = 500;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (fUpperTail(mid, df1, df2) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ── Masking sets (mirrors problems.ts maskANOVATable) ── */

function getMasked(difficulty: Difficulty): Set<MaskedField> {
  if (difficulty === 'easy')
    return new Set<MaskedField>(['MSB', 'MSW', 'F']);
  if (difficulty === 'medium')
    return new Set<MaskedField>(['DFB', 'DFW', 'SSW', 'MSB', 'F']);
  /* hard */
  return new Set<MaskedField>(['MSW', 'SSB', 'SSW', 'SST', 'DFT']);
}

/* ── Scenarios ── */

const SCENARIOS = [
  // Original 12
  { variable: 'test anxiety scores',              unit: 'points',           population: 'undergraduate students'      },
  { variable: 'reaction time',                    unit: 'ms',               population: 'young adults'                },
  { variable: 'daily step count',                 unit: 'steps',            population: 'office workers'              },
  { variable: 'sleep quality ratings',            unit: 'points',           population: 'adults'                      },
  { variable: 'working memory capacity',          unit: 'units',            population: 'college students'            },
  { variable: 'life satisfaction scores',         unit: 'points',           population: 'adults'                      },
  { variable: 'systolic blood pressure',          unit: 'mmHg',             population: 'adults aged 40–60'           },
  { variable: 'academic motivation scores',       unit: 'points',           population: 'high school students'        },
  { variable: 'job satisfaction ratings',         unit: 'points',           population: 'full-time employees'         },
  { variable: 'pain tolerance threshold',         unit: 'units',            population: 'adult patients'              },
  { variable: 'reading comprehension scores',     unit: 'points',           population: 'eighth-grade students'       },
  { variable: 'cortisol levels',                  unit: 'nmol/L',           population: 'adults under stress'         },
  // New 38
  { variable: 'attention span',                   unit: 'minutes',          population: 'college-aged adults'         },
  { variable: 'cognitive flexibility scores',     unit: 'points',           population: 'young adults'                },
  { variable: 'depression scores',                unit: 'points',           population: 'clinical outpatients'        },
  { variable: 'self-efficacy ratings',            unit: 'points',           population: 'graduate students'           },
  { variable: 'social anxiety scores',            unit: 'points',           population: 'undergraduate students'      },
  { variable: 'procrastination scores',           unit: 'points',           population: 'college students'            },
  { variable: 'resilience scores',                unit: 'points',           population: 'adults'                      },
  { variable: 'mindfulness ratings',              unit: 'points',           population: 'working adults'              },
  { variable: 'stress reactivity scores',         unit: 'points',           population: 'adults'                      },
  { variable: 'emotional regulation scores',      unit: 'points',           population: 'adolescents'                 },
  { variable: 'intrinsic motivation ratings',     unit: 'points',           population: 'middle school students'      },
  { variable: 'decision-making accuracy',         unit: '%',                population: 'older adults'                },
  { variable: 'creative problem-solving scores',  unit: 'points',           population: 'undergraduate students'      },
  { variable: 'verbal fluency scores',            unit: 'words/min',        population: 'adults'                      },
  { variable: 'spatial reasoning scores',         unit: 'points',           population: 'engineering students'        },
  { variable: 'executive function scores',        unit: 'points',           population: 'children aged 8–12'          },
  { variable: 'academic engagement ratings',      unit: 'points',           population: 'high school students'        },
  { variable: 'math anxiety ratings',             unit: 'points',           population: 'high school students'        },
  { variable: 'resting heart rate',               unit: 'bpm',              population: 'sedentary adults'            },
  { variable: 'sleep duration',                   unit: 'hours',            population: 'shift workers'               },
  { variable: 'fatigue severity scores',          unit: 'points',           population: 'adults with chronic illness' },
  { variable: 'chronic pain intensity ratings',   unit: 'points',           population: 'adult patients'              },
  { variable: 'grip strength',                    unit: 'kg',               population: 'older adults'                },
  { variable: 'body mass index',                  unit: 'kg/m²',            population: 'adults aged 25–45'           },
  { variable: 'physical activity level',          unit: 'MET-hours/week',   population: 'adults'                      },
  { variable: 'lung function',                    unit: '% predicted FEV1', population: 'adults with asthma'          },
  { variable: 'resting metabolic rate',           unit: 'kcal/day',         population: 'healthy adults'              },
  { variable: 'blood glucose levels',             unit: 'mg/dL',            population: 'pre-diabetic adults'         },
  { variable: 'heart rate variability',           unit: 'ms',               population: 'endurance athletes'          },
  { variable: 'vocabulary test scores',           unit: 'points',           population: 'language learners'           },
  { variable: 'exam performance scores',          unit: 'points',           population: 'undergraduate students'      },
  { variable: 'GPA',                              unit: 'points',           population: 'college freshmen'            },
  { variable: 'homework completion rates',        unit: '%',                population: 'middle school students'      },
  { variable: 'classroom participation ratings',  unit: 'points',           population: 'eighth-grade students'       },
  { variable: 'critical thinking scores',         unit: 'points',           population: 'graduate students'           },
  { variable: 'academic self-efficacy scores',    unit: 'points',           population: 'high school seniors'         },
  { variable: 'note-taking quality ratings',      unit: 'points',           population: 'undergraduate students'      },
  { variable: 'workplace stress scores',          unit: 'points',           population: 'healthcare workers'          },
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

export function generateProblem(): AnovaProblem {
  const k        = rChoice([3, 4, 5]);
  const nPerCell = rChoice([6, 8, 10, 12]);
  const N        = k * nPerCell;

  const gmOpts: number[] = [];
  for (let v = 40; v <= 120; v += 5) gmOpts.push(v);
  const GM = rChoice(gmOpts);

  const sdWithin  = rInt(4, 18);
  const sdBetween = Math.random() < 0.70
    ? rInt(2, Math.max(2, sdWithin))
    : rInt(Math.min(sdWithin + 1, 20), 20);

  const alpha      = rWeighted([0.10, 0.05, 0.01], [0.2, 0.7, 0.1]);
  const difficulty = rChoice<Difficulty>(['easy', 'medium', 'hard']);
  const scenario   = rChoice(SCENARIOS);

  // Simulate group data
  const groupMeans    = Array.from({ length: k }, () => randNormal(GM, sdBetween));
  const groups        = groupMeans.map(mu => Array.from({ length: nPerCell }, () => randNormal(mu, sdWithin)));
  const allObs        = groups.flat();
  const grandMean     = allObs.reduce((s, x) => s + x, 0) / N;
  const actGroupMeans = groups.map(g => g.reduce((s, x) => s + x, 0) / nPerCell);

  const SSB = actGroupMeans.reduce((s, mu) => s + nPerCell * (mu - grandMean) ** 2, 0);
  const SSW = groups.reduce((s, g, j) => s + g.reduce((ss, x) => ss + (x - actGroupMeans[j]) ** 2, 0), 0);
  const SST = SSB + SSW;
  const DFB = k - 1;
  const DFW = N - k;
  const DFT = N - 1;
  const MSB = SSB / DFB;
  const MSW = SSW / DFW;
  const F   = MSB / MSW;

  const Fcrit        = r3(fInv(alpha, DFB, DFW));
  const decision_true: 'reject' | 'fail' = F >= Fcrit ? 'reject' : 'fail';
  const eta2         = r2(SSB / SST);

  return {
    k, nPerCell, N, alpha, difficulty,
    table: { SSB, SSW, SST, DFB, DFW, DFT, MSB, MSW, F },
    eta2, Fcrit, decision_true,
    masked: getMasked(difficulty),
    variable: scenario.variable, unit: scenario.unit, population: scenario.population,
  };
}

/* ── Build the interactive ANOVA table HTML ── */

function buildTableHtml(p: AnovaProblem): string {
  const t = p.table;
  const tdStyle = 'padding:0.38rem 0.6rem;border:1px solid var(--border);text-align:center;';
  const thStyle = 'padding:0.4rem 0.6rem;border:1px solid var(--border);background:var(--bg-subtle);font-weight:600;';

  function inputCell(field: MaskedField, isInt = false): string {
    return `<td style="${tdStyle}">
      <input type="number" step="${isInt ? '1' : '0.01'}" id="ap-input-${field}"
             class="sp-num-input" style="width:105px;text-align:center;" placeholder="?" />
      <span id="ap-cell-fb-${field}" style="margin-left:0.25rem;font-size:1em;"></span>
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
        <td style="${tdStyle}text-align:left;">Between</td>
        ${cell('SSB', t.SSB)}
        ${cell('DFB', t.DFB, true)}
        ${cell('MSB', t.MSB)}
        ${cell('F',   t.F)}
      </tr>
      <tr>
        <td style="${tdStyle}text-align:left;">Within</td>
        ${cell('SSW', t.SSW)}
        ${cell('DFW', t.DFW, true)}
        ${cell('MSW', t.MSW)}
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

export function renderProblem(p: AnovaProblem): void {
  const alphaStr  = p.alpha.toFixed(2);
  const diffLabel = { easy: 'Easy', medium: 'Moderate', hard: 'Hard' }[p.difficulty];

  const narrative = `
    <p>A researcher conducted a one-way independent ANOVA to examine whether mean
    <strong>${p.variable}</strong> differs across <strong>${p.k}</strong> independent groups
    in a sample of <strong>${p.population}</strong>
    (N&nbsp;=&nbsp;${p.N}, n&nbsp;=&nbsp;${p.nPerCell} per group).</p>
    <p>The partially completed ANOVA summary table is shown below
    (difficulty: <em>${diffLabel}</em>).
    Fill in all cells marked <strong>?</strong>, then answer the questions below
    using α&nbsp;=&nbsp;${alphaStr}.</p>
  `;

  setHtml('ap-problem-text', narrative + buildTableHtml(p));

  // Hypothesis radio options (shuffled)
  const kSubs = Array.from({ length: p.k }, (_, i) => `μ${i + 1}`).join(' = ');
  const opts = [
    { value: 'correct',  label: `H₀: ${kSubs} &nbsp;&nbsp; H₁: At least one group mean differs` },
    { value: 'reversed', label: `H₀: At least one group mean differs &nbsp;&nbsp; H₁: ${kSubs}` },
    { value: 'variance', label: `H₀: All group variances are equal &nbsp;&nbsp; H₁: At least one variance differs` },
  ];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  setHtml('ap-hyp-options', opts.map(o => `
    <label class="sp-radio-label">
      <input type="radio" name="ap-hyp-select" value="${o.value}" />
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

export function gradeAnswers(p: AnovaProblem): GradeResult {
  const t = p.table;
  const TOL = 0.05;

  const cells: Partial<Record<MaskedField, boolean>> = {};
  for (const field of p.masked) {
    const val = readNum(`ap-input-${field}`);
    let ok: boolean;
    switch (field) {
      case 'SSB': ok = !isNaN(val) && Math.abs(val - t.SSB) <= TOL; break;
      case 'SSW': ok = !isNaN(val) && Math.abs(val - t.SSW) <= TOL; break;
      case 'SST': ok = !isNaN(val) && Math.abs(val - t.SST) <= TOL; break;
      case 'DFB': ok = val === t.DFB; break;
      case 'DFW': ok = val === t.DFW; break;
      case 'DFT': ok = val === t.DFT; break;
      case 'MSB': ok = !isNaN(val) && Math.abs(val - t.MSB) <= TOL; break;
      case 'MSW': ok = !isNaN(val) && Math.abs(val - t.MSW) <= TOL; break;
      case 'F':   ok = !isNaN(val) && Math.abs(val - t.F)   <= TOL; break;
      default:    ok = false;
    }
    cells[field] = ok;
  }

  const eta2Input  = readNum('ap-answer-eta2');
  const fcritInput = readNum('ap-answer-fcrit');
  const eta2       = !isNaN(eta2Input)  && Math.abs(eta2Input  - p.eta2)  <= 0.02;
  const fcrit      = !isNaN(fcritInput) && Math.abs(fcritInput - p.Fcrit) <= 0.005;
  const hyp        = readRadio('ap-hyp-select') === 'correct';
  const decision   = readRadio('ap-decision-select') === p.decision_true;
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

export function renderFeedback(p: AnovaProblem, grade: GradeResult): void {
  const t = p.table;

  const hints: Partial<Record<MaskedField, string>> = {
    SSB: 'SS<sub>Between</sub> = Σ n<sub>j</sub>(M<sub>j</sub> − GM)²',
    SSW: `SS<sub>Within</sub> = SS<sub>Total</sub> − SS<sub>Between</sub> = ${r2(t.SST).toFixed(2)} − ${r2(t.SSB).toFixed(2)}`,
    SST: `SS<sub>Total</sub> = SS<sub>Between</sub> + SS<sub>Within</sub> = ${r2(t.SSB).toFixed(2)} + ${r2(t.SSW).toFixed(2)}`,
    DFB: `df<sub>Between</sub> = k − 1 = ${p.k} − 1 = ${t.DFB}`,
    DFW: `df<sub>Within</sub> = N − k = ${p.N} − ${p.k} = ${t.DFW}`,
    DFT: `df<sub>Total</sub> = df<sub>B</sub> + df<sub>W</sub> = ${t.DFB} + ${t.DFW} = ${t.DFT}`,
    MSB: `MS<sub>Between</sub> = SS<sub>B</sub> / df<sub>B</sub> = ${r2(t.SSB).toFixed(2)} / ${t.DFB}`,
    MSW: `MS<sub>Within</sub> = SS<sub>W</sub> / df<sub>W</sub> = ${r2(t.SSW).toFixed(2)} / ${t.DFW}`,
    F:   `F = MS<sub>Between</sub> / MS<sub>Within</sub> = ${r2(t.MSB).toFixed(2)} / ${r2(t.MSW).toFixed(2)}`,
  };

  // Per-cell inline feedback
  for (const [field, ok] of Object.entries(grade.cells) as [MaskedField, boolean][]) {
    const fbEl = document.getElementById(`ap-cell-fb-${field}`);
    if (fbEl) fbEl.innerHTML = ok ? feedbackIcon(true) : `${feedbackIcon(false)} <span class="sp-hint">${hints[field] ?? ''}</span>`;
  }

  setHtml('ap-fb-hyp',      fbHtml(grade.hyp,      'H₀ states all group means are equal; H₁ states at least one differs.'));
  setHtml('ap-fb-fcrit',   fbHtml(grade.fcrit,    `F<sub>crit</sub>(${t.DFB}, ${t.DFW}) at α = ${p.alpha.toFixed(2)} = ${p.Fcrit.toFixed(3)}.`));
  setHtml('ap-fb-decision', fbHtml(grade.decision, `F = ${r2(t.F).toFixed(2)} vs. F<sub>crit</sub> = ${p.Fcrit.toFixed(3)}. Reject H₀ if F ≥ F<sub>crit</sub>.`));
  setHtml('ap-fb-eta2',     fbHtml(grade.eta2,     `η² = SS<sub>Between</sub> / SS<sub>Total</sub> = ${r2(t.SSB).toFixed(2)} / ${r2(t.SST).toFixed(2)} = ${p.eta2.toFixed(2)}`));

  const banner = document.getElementById('ap-fb-banner');
  if (banner) {
    banner.style.display = '';
    banner.className = `sp-banner ${grade.allCorrect ? 'sp-banner-success' : 'sp-banner-error'}`;
    banner.textContent = grade.allCorrect ? 'All correct! Great work.' : 'Some answers need work — see feedback above.';
  }

  setDisplay('ap-feedback-section', '');

  const solToggle = document.getElementById('ap-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) {
    solToggle.style.display = 'block';
    if (!grade.allCorrect) solToggle.open = true;
  }

  renderSolution(p);
}

/* ── Full solution ── */

function renderSolution(p: AnovaProblem): void {
  const t         = p.table;
  const alphaStr  = p.alpha.toFixed(2);
  const decWord   = p.decision_true === 'reject' ? 'Reject H₀' : 'Fail to reject H₀';
  const kSubs     = Array.from({ length: p.k }, (_, i) => `μ${i + 1}`).join(' = ');
  const interp    = p.decision_true === 'reject'
    ? `There is evidence that mean ${p.variable} differs across the groups at α = ${alphaStr}.`
    : `There is no evidence that mean ${p.variable} differs across the groups at α = ${alphaStr}.`;

  const html = `
    <table class="sp-solution-table">
      <tr><th colspan="2">Context</th></tr>
      <tr><td>Variable</td><td>${p.variable} (${p.unit})</td></tr>
      <tr><td>Population</td><td>${p.population}</td></tr>
      <tr><td>k (groups)</td><td>${p.k}</td></tr>
      <tr><td>n per group</td><td>${p.nPerCell}</td></tr>
      <tr><td>N (total)</td><td>${p.N}</td></tr>
      <tr><td>α</td><td>${alphaStr}</td></tr>

      <tr><th colspan="2">Hypotheses</th></tr>
      <tr><td>H₀</td><td>${kSubs}</td></tr>
      <tr><td>H₁</td><td>At least one group mean differs</td></tr>

      <tr><th colspan="2">ANOVA Table</th></tr>
      <tr><td colspan="2">
        <table style="border-collapse:collapse;width:100%;font-size:0.87rem;margin:0.3rem 0;">
          <thead><tr>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);text-align:left;">Source</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">SS</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">df</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">MS</th>
            <th style="padding:0.3rem 0.5rem;border:1px solid var(--border);background:var(--bg-subtle);">F</th>
          </tr></thead>
          <tbody>
            <tr>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);">Between</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.SSB).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${t.DFB}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.MSB).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.F).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);">Within</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.SSW).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${t.DFW}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.MSW).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;color:#aaa;">—</td>
            </tr>
            <tr>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);">Total</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${r2(t.SST).toFixed(2)}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;">${t.DFT}</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;color:#aaa;">—</td>
              <td style="padding:0.3rem 0.5rem;border:1px solid var(--border);text-align:center;color:#aaa;">—</td>
            </tr>
          </tbody>
        </table>
      </td></tr>

      <tr><th colspan="2">Significance</th></tr>
      <tr><td>F<sub>crit</sub>(${t.DFB}, ${t.DFW}), α = ${alphaStr}</td><td>${p.Fcrit.toFixed(3)}</td></tr>
      <tr><td>Decision rule</td><td>Reject H₀ if F ≥ F<sub>crit</sub></td></tr>
      <tr><td>Result</td><td><strong>${decWord}</strong></td></tr>

      <tr><th colspan="2">Effect Size</th></tr>
      <tr><td>η² = SS<sub>Between</sub> / SS<sub>Total</sub></td><td>${p.eta2.toFixed(2)}</td></tr>

      <tr><th colspan="2">Interpretation</th></tr>
      <tr><td colspan="2">${interp}</td></tr>
    </table>
  `;
  setHtml('ap-solution-body', html);
}

/* ── Reset UI ── */

export function resetUI(): void {
  const allFields: MaskedField[] = ['SSB', 'SSW', 'SST', 'DFB', 'DFW', 'DFT', 'MSB', 'MSW', 'F'];
  allFields.forEach(f => clearInput(`ap-input-${f}`));
  clearInput('ap-answer-fcrit');
  clearInput('ap-answer-eta2');
  uncheckRadios('ap-hyp-select');
  uncheckRadios('ap-decision-select');
  setDisplay('ap-feedback-section', 'none');

  const solToggle = document.getElementById('ap-solution-toggle') as HTMLDetailsElement | null;
  if (solToggle) { solToggle.style.display = 'none'; solToggle.open = false; }

  const banner = document.getElementById('ap-fb-banner');
  if (banner) banner.style.display = 'none';

  setHtml('ap-problem-text', '<span class="sp-placeholder">Click <strong>New Problem</strong> below to generate a practice problem.</span>');
  setHtml('ap-hyp-options',  '<span class="sp-placeholder">Generate a problem to see options.</span>');
  setHtml('ap-fb-hyp',      '');
  setHtml('ap-fb-fcrit',   '');
  setHtml('ap-fb-decision', '');
  setHtml('ap-fb-eta2',     '');
}
