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

type TestType = 'z' | 't' | 'ind' | 'rep';
let activeType: TestType | null = null;
let zCurrentProblem:   ReturnType<typeof zGenerate>   | null = null;
let tCurrentProblem:   ReturnType<typeof tGenerate>   | null = null;
let indCurrentProblem: ReturnType<typeof indGenerate> | null = null;
let repCurrentProblem: ReturnType<typeof repGenerate> | null = null;

/* ── DOM refs ── */

const newBtn    = document.getElementById('new-btn')    as HTMLButtonElement;
const checkBtn  = document.getElementById('check-btn')  as HTMLButtonElement;
const zSection   = document.getElementById('z-section')   as HTMLElement;
const tSection   = document.getElementById('t-section')   as HTMLElement;
const indSection = document.getElementById('ind-section') as HTMLElement;
const repSection = document.getElementById('rep-section') as HTMLElement;
const cardTitle = document.getElementById('card-title') as HTMLElement;
const cardSub   = document.getElementById('card-subtitle') as HTMLElement;
const selZ      = document.getElementById('sel-ztest')   as HTMLInputElement;
const selT      = document.getElementById('sel-ttest')   as HTMLInputElement;
const selInd    = document.getElementById('sel-indtest') as HTMLInputElement;
const selRep    = document.getElementById('sel-reptest') as HTMLInputElement;
const noSelWarn = document.getElementById('no-sel-warning') as HTMLElement;

/* ── Card header ── */

const HEADERS: Record<TestType, { title: string; subtitle: string }> = {
  z: {
    title:    'Single-Sample Z-Test (known σ)',
    subtitle: 'Given: μ₀, known σ, n, and x̄. &nbsp;State hypotheses, compute z, find the critical value, decide, and compute Cohen\'s d.',
  },
  t: {
    title:    'Single-Sample t-Test (unknown σ)',
    subtitle: 'Given: μ₀, n, x̄, and s. &nbsp;State hypotheses, compute t, find the critical value, decide, and compute an effect size.',
  },
  ind: {
    title:    'Independent-Measures t-Test (equal variances)',
    subtitle: 'Given: n₁, M₁, s₁, n₂, M₂, s₂, and α. &nbsp;Compute t, df, critical value, decide, and find an effect size.',
  },
  rep: {
    title:    'Repeated-Measures t-Test (paired samples)',
    subtitle: 'Given: n, M<sub>D</sub>, and SD<sub>D</sub>. &nbsp;State hypotheses, compute t, df, critical value, find an effect size, and decide.',
  },
};

function setHeader(type: TestType): void {
  cardTitle.textContent = HEADERS[type].title;
  cardSub.innerHTML     = HEADERS[type].subtitle;
}

/* ── Show/hide sections ── */

function showSection(type: TestType): void {
  zSection.style.display   = type === 'z'   ? '' : 'none';
  tSection.style.display   = type === 't'   ? '' : 'none';
  indSection.style.display = type === 'ind' ? '' : 'none';
  repSection.style.display = type === 'rep' ? '' : 'none';
}

/* ── Random pick from enabled types ── */

function pickType(): TestType | null {
  const pool: TestType[] = [];
  if (selZ.checked)   pool.push('z');
  if (selT.checked)   pool.push('t');
  if (selInd.checked) pool.push('ind');
  if (selRep.checked) pool.push('rep');
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
  } else {
    repResetUI();
    repCurrentProblem = repGenerate();
    repRenderProblem(repCurrentProblem);
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
  }
}

/* ── Wire up ── */

newBtn.addEventListener('click', newProblem);
checkBtn.addEventListener('click', checkAnswers);

// Warn immediately if toggling leaves nothing selected
[selZ, selT, selInd, selRep].forEach(cb => cb.addEventListener('change', () => {
  noSelWarn.style.display = (!selZ.checked && !selT.checked && !selInd.checked && !selRep.checked) ? '' : 'none';
}));

// Auto-generate on load
newProblem();
