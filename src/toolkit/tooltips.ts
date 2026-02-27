/* ── Centralized tooltip dictionary ── */

export const TOOLTIPS: Record<string, string> = {
  alpha:      'Significance level (Type I error rate). Commonly set to 0.05.',
  n:          'Sample size (number of observations). Larger n reduces standard error and increases power.',
  mu0:        'Null hypothesis mean (μ₀): the population mean assumed true under H₀.',
  sigma:      'Known population standard deviation (σ). Used in z-tests to compute standard error.',
  xbar:       'Sample mean (x̄): the average of the observed sample.',
  z:          'z statistic: standardized distance between sample mean and μ₀ in standard error units.',
  t:          't statistic: standardized difference using an estimated standard error.',
  F:          'F statistic: ratio of explained variance to unexplained variance (MS_effect / MS_error).',
  df:         'Degrees of freedom: the amount of independent information used to estimate variability.',
  p:          'p-value: probability of observing a result at least this extreme if H₀ were true.',
  cohens_d:   "Cohen's d: standardized mean difference in SD units (effect size).",
  eta_squared:'η²: proportion of total variance explained by the factor (SS_effect / SS_total).',
  r:          "Pearson's r: strength and direction of a linear relationship between two variables.",
  r_squared:  'r²: proportion of variance explained by a linear relationship (effect size).',
  R_squared:  'R²: proportion of variance in the outcome explained by the regression model.',
  SS:         'Sum of Squares (SS): total variability attributed to a source.',
  MS:         'Mean Square (MS): SS divided by df; an estimate of variance for a source.',
  /* ── Problem Generator & Batch UI ── */
  problem_generator_section:       'Generates a student-facing problem statement (and optional instructor key) from the currently generated results.',
  generate_student_problem_button: 'Creates a printable student prompt based on the current test output. Generate results first.',
  instructor_key_toggle:           'Shows the answer key with formulas, computed values, and a decision/interpretation.',
  student_prompt_box:              'Copy/paste this prompt into an LMS, worksheet, or exam. Values match the current computed results.',
  masked_table_note:               "Cells marked with '?' are intentionally missing so students can fill them in.",
  batch_generator_section:         'Creates a set of multiple datasets/problems in one run for worksheets, labs, or multiple exam versions.',
  batch_count_input:               'Number of items to generate in this batch (e.g., 10). Each item uses the same settings but new random draws.',
  batch_dataset_count_input:       'Number of datasets to generate in this batch. Each dataset uses the same settings but different random draws.',
  batch_problem_count_input:       'Number of problems to generate in this batch. Each problem uses the same settings but different random draws.',
  generate_batch_button:           'Generates the full batch and stores it for export. Re-run to create a new batch.',
  download_batch_excel_button:     'Downloads a single Excel workbook containing all datasets and/or problems generated in the current batch.',
  batch_overwrite_warning:         'Generating a new batch replaces the previous batch stored in memory.',
  /* ── Data Generation Parameters ── */
  tx_effect:                       'Amount added when generating the outcome variable. A non-zero value simulates a true effect in the population; 0 simulates the null.',
  noise_sd:                        'Random noise (standard deviation) added to each outcome value. Larger values increase variability and make effects harder to detect.',
  anova_effect_size:               'Standard deviation of the group means around the grand mean. Larger values create more pronounced between-group differences.',
  apply_tx_effect:                 'When checked, applies the treatment effect to generate outcome values that deviate from the null. Uncheck to simulate data under H₀.',
  /* ── Parameter Sweep UI ── */
  parameter_sweep_panel:           'Systematically vary one or more parameters across the batch. Each item uses the next value from each swept parameter (zipped, not crossed).',
  sweep_add_param_button:          'Add a parameter to vary across the batch. List mode: enter comma-separated values. Range mode: set start, end, and step.',
};

/**
 * Returns an HTML string for the ⓘ tooltip icon button keyed by `key`.
 * Returns empty string if the key has no registered tooltip.
 */
export function tipHTML(key: string): string {
  const text = TOOLTIPS[key];
  if (!text) return '';
  const safe = text.replace(/"/g, '&quot;');
  return ` <button type="button" class="tip-icon" data-tip="${safe}" aria-label="More info">\u24D8</button>`;
}

/** Maps output-table "Statistic" column values to tooltip keys. */
export const STAT_ROW_TIPS: Record<string, string> = {
  /* z-test / t-test / ind-t / rm-t outputs */
  'N':         'n',
  'Z Score':   'z',
  't Score':   't',
  "Cohen's d": 'cohens_d',
  'R-Squared': 'r_squared',
  /* Pearson outputs (lowercase names from engine) */
  'n':         'n',
  'df':        'df',
  'r':         'r',
  'r_squared': 'r_squared',
  't':         't',
};

/** Maps ANOVA / regression summary-table column headers to tooltip keys. */
export const COL_HEADER_TIPS: Record<string, string> = {
  'SS':      'SS',
  'df':      'df',
  'MS':      'MS',
  'F':       'F',
  'p-value': 'p',
};

/** Initialize the global floating tooltip bubble (call once after DOMContentLoaded). */
export function initTooltips(): void {
  const bubble = document.createElement('div');
  bubble.id = 'stat-tooltip';
  bubble.setAttribute('role', 'tooltip');
  document.body.appendChild(bubble);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function showTip(icon: HTMLElement): void {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    const text = icon.getAttribute('data-tip');
    if (!text) return;
    bubble.textContent = text;
    bubble.classList.add('visible');
    positionBubble(icon);
  }

  function hideTip(): void {
    hideTimer = setTimeout(() => bubble.classList.remove('visible'), 100);
  }

  function positionBubble(icon: HTMLElement): void {
    /* Reset to measure real width/height */
    bubble.style.left = '0';
    bubble.style.top  = '0';
    const rect  = icon.getBoundingClientRect();
    const bw    = bubble.offsetWidth  || 260;
    const bh    = bubble.offsetHeight || 50;
    const gap   = 7;
    let left    = rect.left + rect.width / 2 - bw / 2;
    let top     = rect.top  - bh - gap;
    /* Clamp horizontally */
    left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
    /* Flip below if clipped at top */
    if (top < 8) top = rect.bottom + gap;
    bubble.style.left = left + 'px';
    bubble.style.top  = top  + 'px';
  }

  /* ── Event delegation: hover ── */
  document.addEventListener('mouseover', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('.tip-icon');
    if (t) showTip(t);
  });
  document.addEventListener('mouseout', (e) => {
    if ((e.target as Element).closest('.tip-icon')) hideTip();
  });

  /* ── Event delegation: keyboard focus ── */
  document.addEventListener('focusin', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('.tip-icon');
    if (t) showTip(t);
  });
  document.addEventListener('focusout', (e) => {
    if ((e.target as Element).closest('.tip-icon')) hideTip();
  });

  /* ── Event delegation: mobile tap ── */
  document.addEventListener('click', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('.tip-icon');
    if (!t) {
      bubble.classList.remove('visible');
      return;
    }
    e.preventDefault();
    const isOpen = bubble.classList.contains('visible') &&
                   bubble.textContent === t.getAttribute('data-tip');
    if (isOpen) {
      bubble.classList.remove('visible');
    } else {
      showTip(t);
    }
  });
}
