import {
  generateProblem as zGenerate,
  gradeAnswers    as zGrade,
  renderProblem   as zRenderProblem,
  renderFeedback  as zRenderFeedback,
  resetUI         as zResetUI,
} from './ztest.ts';

import {
  generateProblem as tGenerate,
  gradeAnswers    as tGrade,
  renderProblem   as tRenderProblem,
  renderFeedback  as tRenderFeedback,
  resetUI         as tResetUI,
} from './ttest.ts';

import {
  generateProblem as indGenerate,
  gradeAnswers    as indGrade,
  renderProblem   as indRenderProblem,
  renderFeedback  as indRenderFeedback,
  resetUI         as indResetUI,
} from './indtest.ts';

import {
  generateProblem as repGenerate,
  gradeAnswers    as repGrade,
  renderProblem   as repRenderProblem,
  renderFeedback  as repRenderFeedback,
  resetUI         as repResetUI,
} from './reptest.ts';

import {
  generateProblem as anovaGenerate,
  gradeAnswers    as anovaGrade,
  renderProblem   as anovaRenderProblem,
  renderFeedback  as anovaRenderFeedback,
  resetUI         as anovaResetUI,
} from './anovatest.ts';

import {
  generateProblem as twaGenerate,
  gradeAnswers    as twaGrade,
  renderProblem   as twaRenderProblem,
  renderFeedback  as twaRenderFeedback,
  resetUI         as twaResetUI,
} from './twowaytest.ts';

import {
  generateProblem as rmaGenerate,
  gradeAnswers    as rmaGrade,
  renderProblem   as rmaRenderProblem,
  renderFeedback  as rmaRenderFeedback,
  resetUI         as rmaResetUI,
} from './rmatest.ts';

import {
  generateProblem as pearGenerate,
  gradeAnswers    as pearGrade,
  renderProblem   as pearRenderProblem,
  renderFeedback  as pearRenderFeedback,
  resetUI         as pearResetUI,
} from './pearsontest.ts';

import {
  generateProblem as regGenerate,
  gradeAnswers    as regGrade,
  renderProblem   as regRenderProblem,
  renderFeedback  as regRenderFeedback,
  resetUI         as regResetUI,
} from './regtest.ts';

/* ── Unified streak ── */

const STREAK_KEY = 'sp_practice_streak';

function getStreak(): number {
  return parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10);
}

function updateStreak(allCorrect: boolean): void {
  let streak = getStreak();
  streak = allCorrect ? streak + 1 : 0;
  localStorage.setItem(STREAK_KEY, String(streak));
  const el = document.getElementById('streak-display');
  if (el) el.textContent = streak > 0 ? `🔥 Streak: ${streak}` : '';
}

function renderStreak(): void {
  const el = document.getElementById('streak-display');
  if (el) {
    const streak = getStreak();
    el.textContent = streak > 0 ? `🔥 Streak: ${streak}` : '';
  }
}

/* ── State ── */

type TestType = 'z' | 't' | 'ind' | 'rep' | 'anova' | 'twa' | 'rma' | 'pear' | 'reg';
let activeType: TestType | null = null;
let zCurrentProblem:    ReturnType<typeof zGenerate>    | null = null;
let tCurrentProblem:    ReturnType<typeof tGenerate>    | null = null;
let indCurrentProblem:  ReturnType<typeof indGenerate>  | null = null;
let repCurrentProblem:  ReturnType<typeof repGenerate>  | null = null;
let anovaCurrentProblem: ReturnType<typeof anovaGenerate> | null = null;
let twaCurrentProblem:  ReturnType<typeof twaGenerate>  | null = null;
let rmaCurrentProblem:  ReturnType<typeof rmaGenerate>  | null = null;
let pearCurrentProblem: ReturnType<typeof pearGenerate> | null = null;
let regCurrentProblem:  ReturnType<typeof regGenerate>  | null = null;

/* ── DOM refs ── */

const newBtn      = document.getElementById('new-btn')      as HTMLButtonElement;
const checkBtn    = document.getElementById('check-btn')    as HTMLButtonElement;
const zSection    = document.getElementById('z-section')    as HTMLElement;
const tSection    = document.getElementById('t-section')    as HTMLElement;
const indSection  = document.getElementById('ind-section')  as HTMLElement;
const repSection  = document.getElementById('rep-section')  as HTMLElement;
const anovaSection = document.getElementById('anova-section') as HTMLElement;
const twaSection  = document.getElementById('twa-section')  as HTMLElement;
const rmaSection  = document.getElementById('rma-section')  as HTMLElement;
const pearSection = document.getElementById('pear-section') as HTMLElement;
const lrpSection  = document.getElementById('lrp-section')  as HTMLElement;
const cardTitle   = document.getElementById('card-title')   as HTMLElement;
const cardSub     = document.getElementById('card-subtitle') as HTMLElement;
const selZ        = document.getElementById('sel-ztest')    as HTMLInputElement;
const selT        = document.getElementById('sel-ttest')    as HTMLInputElement;
const selInd      = document.getElementById('sel-indtest')  as HTMLInputElement;
const selRep      = document.getElementById('sel-reptest')  as HTMLInputElement;
const selAnova    = document.getElementById('sel-anovatest') as HTMLInputElement;
const selTwa      = document.getElementById('sel-twatest')   as HTMLInputElement;
const selRma      = document.getElementById('sel-rmatest')   as HTMLInputElement;
const selPear     = document.getElementById('sel-peartest')  as HTMLInputElement;
const selReg      = document.getElementById('sel-regtest')   as HTMLInputElement;
const noSelWarn   = document.getElementById('no-sel-warning') as HTMLElement;

/* ── Card header ── */

const HEADERS: Record<TestType, { title: string; subtitle: string }> = {
  z: {
    title:    'Single-Sample Z-Test (known σ)',
    subtitle: 'Given: μ₀, known σ, n, and M. &nbsp;State hypotheses, compute z, find the critical value, decide, and compute Cohen\'s d.',
  },
  t: {
    title:    'Single-Sample t-Test (unknown σ)',
    subtitle: 'Given: μ₀, n, M, and s. &nbsp;State hypotheses, compute t, find the critical value, decide, and compute an effect size.',
  },
  ind: {
    title:    'Independent-Measures t-Test (equal variances)',
    subtitle: 'Given: n₁, M₁, s₁, n₂, M₂, s₂, and α. &nbsp;Compute t, df, critical value, decide, and find an effect size.',
  },
  rep: {
    title:    'Repeated-Measures t-Test (paired samples)',
    subtitle: 'Given: n, M<sub>D</sub>, and s<sub>D</sub>. &nbsp;State hypotheses, compute t, df, critical value, find an effect size, and decide.',
  },
  anova: {
    title:    'One-Way Independent ANOVA',
    subtitle: 'Given: a partially completed ANOVA table and α. &nbsp;Fill in missing values, state hypotheses, find F<sub>crit</sub>, determine significance, and compute η².',
  },
  twa: {
    title:    'Two-Factor Independent ANOVA',
    subtitle: 'Given: a partially completed two-way ANOVA table and α. &nbsp;Fill in missing values, state hypotheses for Factor A, Factor B, and the interaction, find F critical values, determine significance for each effect, and compute η².',
  },
  rma: {
    title:    'One-Way Repeated-Measures ANOVA',
    subtitle: 'Given: a partially completed RM ANOVA table and α. &nbsp;Fill in missing values, state hypotheses for the treatment effect, find F<sub>crit</sub>, determine significance, and compute η².',
  },
  pear: {
    title:    'Pearson Correlation',
    subtitle: 'Given: r, n, and α. &nbsp;State hypotheses, compute t, df, and the critical value, determine significance, and compute r².',
  },
  reg: {
    title:    'Simple Linear Regression',
    subtitle: 'Given: a partially completed regression ANOVA table, b₀, b₁, and α. &nbsp;Fill in missing values, write the equation, find F<sub>crit</sub>, determine significance, and compute R².',
  },
};

function setHeader(type: TestType): void {
  cardTitle.textContent = HEADERS[type].title;
  cardSub.innerHTML     = HEADERS[type].subtitle;
}

/* ── Show/hide sections ── */

function showSection(type: TestType): void {
  zSection.style.display    = type === 'z'     ? '' : 'none';
  tSection.style.display    = type === 't'     ? '' : 'none';
  indSection.style.display  = type === 'ind'   ? '' : 'none';
  repSection.style.display  = type === 'rep'   ? '' : 'none';
  anovaSection.style.display = type === 'anova' ? '' : 'none';
  twaSection.style.display  = type === 'twa'   ? '' : 'none';
  rmaSection.style.display  = type === 'rma'   ? '' : 'none';
  pearSection.style.display = type === 'pear'  ? '' : 'none';
  lrpSection.style.display  = type === 'reg'   ? '' : 'none';
}

/* ── Random pick from enabled types ── */

function pickType(): TestType | null {
  const pool: TestType[] = [];
  if (selZ.checked)     pool.push('z');
  if (selT.checked)     pool.push('t');
  if (selInd.checked)   pool.push('ind');
  if (selRep.checked)   pool.push('rep');
  if (selAnova.checked) pool.push('anova');
  if (selTwa.checked)   pool.push('twa');
  if (selRma.checked)   pool.push('rma');
  if (selPear.checked)  pool.push('pear');
  if (selReg.checked)   pool.push('reg');
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── New problem ── */

function newProblem(): void {
  const type = pickType();
  if (!type) {
    noSelWarn.style.display = '';
    return;
  }
  noSelWarn.style.display = 'none';

  activeType = type;
  setHeader(type);
  showSection(type);
  checkBtn.disabled = false;

  if (type === 'z') {
    zResetUI();
    zCurrentProblem = zGenerate();
    zRenderProblem(zCurrentProblem);
  } else if (type === 't') {
    tResetUI();
    tCurrentProblem = tGenerate();
    tRenderProblem(tCurrentProblem);
  } else if (type === 'ind') {
    indResetUI();
    indCurrentProblem = indGenerate();
    indRenderProblem(indCurrentProblem);
  } else if (type === 'rep') {
    repResetUI();
    repCurrentProblem = repGenerate();
    repRenderProblem(repCurrentProblem);
  } else if (type === 'anova') {
    anovaResetUI();
    anovaCurrentProblem = anovaGenerate();
    anovaRenderProblem(anovaCurrentProblem);
  } else if (type === 'twa') {
    twaResetUI();
    twaCurrentProblem = twaGenerate();
    twaRenderProblem(twaCurrentProblem);
  } else if (type === 'rma') {
    rmaResetUI();
    rmaCurrentProblem = rmaGenerate();
    rmaRenderProblem(rmaCurrentProblem);
  } else if (type === 'pear') {
    pearResetUI();
    pearCurrentProblem = pearGenerate();
    pearRenderProblem(pearCurrentProblem);
  } else {
    regResetUI();
    regCurrentProblem = regGenerate();
    regRenderProblem(regCurrentProblem);
  }

  renderStreak();
}

/* ── Check answers ── */

function checkAnswers(): void {
  if (activeType === 'z' && zCurrentProblem) {
    const grade = zGrade(zCurrentProblem);
    zRenderFeedback(zCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 't' && tCurrentProblem) {
    const grade = tGrade(tCurrentProblem);
    tRenderFeedback(tCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'ind' && indCurrentProblem) {
    const grade = indGrade(indCurrentProblem);
    indRenderFeedback(indCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'rep' && repCurrentProblem) {
    const grade = repGrade(repCurrentProblem);
    repRenderFeedback(repCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'anova' && anovaCurrentProblem) {
    const grade = anovaGrade(anovaCurrentProblem);
    anovaRenderFeedback(anovaCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'twa' && twaCurrentProblem) {
    const grade = twaGrade(twaCurrentProblem);
    twaRenderFeedback(twaCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'rma' && rmaCurrentProblem) {
    const grade = rmaGrade(rmaCurrentProblem);
    rmaRenderFeedback(rmaCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'pear' && pearCurrentProblem) {
    const grade = pearGrade(pearCurrentProblem);
    pearRenderFeedback(pearCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  } else if (activeType === 'reg' && regCurrentProblem) {
    const grade = regGrade(regCurrentProblem);
    regRenderFeedback(regCurrentProblem, grade);
    updateStreak(grade.allCorrect);
  }
}

/* ── Wire up ── */

newBtn.addEventListener('click', newProblem);
checkBtn.addEventListener('click', checkAnswers);

// Warn immediately if toggling leaves nothing selected
[selZ, selT, selInd, selRep, selAnova, selTwa, selRma, selPear, selReg].forEach(cb => cb.addEventListener('change', () => {
  noSelWarn.style.display =
    (!selZ.checked && !selT.checked && !selInd.checked && !selRep.checked && !selAnova.checked && !selTwa.checked && !selRma.checked && !selPear.checked && !selReg.checked) ? '' : 'none';
}));

// Auto-generate on load
newProblem();
