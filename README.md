# kalilwarren.github.io

Academic research profile for **Kalil Warren**, PhD Student in Psychology (Cognitive & Neural Sciences) at the University of South Carolina.

**Live site:** [https://kalilwarren.github.io](https://kalilwarren.github.io)

---

## Site Structure

```
/
├── index.html              — Homepage (bio, research interests, news)
├── research.html           — Research statement, projects, publications
├── cv.html                 — Full curriculum vitae
├── toolkit.html            — StatTeacher Toolkit (Instructor view)
├── student.html            — Student Practice page
├── css/
│   └── style.css           — Site-wide styles (including nav dropdown)
├── assets/
│   ├── Picture1.jpg        — Headshot
│   └── *.pdf               — CV PDF
├── public/
│   └── toolkit/
│       └── Engine_v1.0.0.py — StatTeacher statistical engine (served as-is)
├── src/
│   ├── year.ts             — Current-year display (used by all pages)
│   ├── toolkit/
│   │   ├── index.ts        — Entry point; registers all event listeners
│   │   ├── init.ts         — Pyodide initialization and py() helper
│   │   ├── ui.ts           — Form helpers, test selector, formatting
│   │   ├── types.ts        — TypeScript interfaces for all test results
│   │   ├── state.ts        — Shared mutable app state singleton
│   │   ├── runners.ts      — One function per statistical test (calls Python)
│   │   ├── rendering.ts    — HTML table builders and results renderer
│   │   ├── csv.ts          — CSV conversion and dataset download
│   │   ├── stats.ts        — Browser-side p-value math
│   │   ├── problems.ts     — Student problem generator and Excel export
│   │   ├── batch.ts        — Batch dataset and problem generation with parameter sweep
│   │   ├── scenarios.ts    — Shared scenario banks (50 entries each) for all problem generators
│   │   └── globals.d.ts    — Ambient type declarations for Pyodide and SheetJS
│   └── student/
│       ├── index.ts        — Entry point; unified test selector and streak logic
│       ├── ztest.ts        — Single-sample Z-test problem generator and grader
│       ├── ttest.ts        — Single-sample t-test problem generator and grader
│       ├── indtest.ts      — Independent-measures t-test problem generator and grader
│       ├── reptest.ts      — Repeated-measures t-test problem generator and grader
│       ├── anovatest.ts    — One-way independent ANOVA problem generator and grader
│       ├── twowaytest.ts   — Two-factor independent ANOVA problem generator and grader
│       ├── rmatest.ts      — One-way repeated-measures ANOVA problem generator and grader
│       ├── pearsontest.ts  — Pearson correlation problem generator and grader
│       └── regtest.ts      — Simple linear regression problem generator and grader
├── package.json            — npm scripts and dev dependencies
├── tsconfig.json           — TypeScript compiler configuration
├── vite.config.ts          — Vite multi-page build configuration
└── .github/
    └── workflows/
        └── deploy.yml      — GitHub Actions CI/CD pipeline
```

---

## StatTeacher Toolkit

### Overview

The **StatTeacher Toolkit** is a fully browser-based interactive statistics problem generator built for instructors and students. It runs entirely client-side using [Pyodide](https://pyodide.org) — a WebAssembly port of Python — so no server, installation, or account is required.

Configure population parameters, click **Generate Problem**, and instantly receive a synthetic dataset along with a complete statistical results table, including test statistics, critical values, effect sizes, confidence intervals, and a hypothesis testing decision. Results can be downloaded as a CSV file.

After generating a problem, the toolkit automatically surfaces a **Student Problem Generator** card (marked Experimental). This lets instructors export a ready-to-use student worksheet and a matching instructor answer key as an Excel file, with no additional setup required.

Each parameter section also includes a **Batch Generator** for producing multiple datasets or student problems in one click, with optional **Parameter Sweep** support to systematically vary any numeric parameter across the batch.

### How It Works

The app loads `toolkit/Engine_v1.0.0.py` at runtime into a Pyodide Python environment running in the browser. NumPy, SciPy, and Pandas are loaded via Pyodide's package system. All computation happens locally in the user's browser tab.

**Technology stack:**
- Python 3 (via [Pyodide v0.26.4](https://pyodide.org))
- NumPy, SciPy, Pandas
- TypeScript (compiled to ES modules by [Vite 6](https://vitejs.dev))
- HTML/CSS with the site's warm academic theme

---

## Student Practice Page

**Live:** [https://kalilwarren.github.io/student.html](https://kalilwarren.github.io/student.html)

A standalone, fully browser-based practice tool for students learning hypothesis testing. No accounts, no installation, and no Python/Pyodide required — all computation runs in pure TypeScript.

Students select one or more test types, click **New Problem**, work through each step, and get instant per-field feedback with hints. A collapsible **Show Full Solution** key expands after grading. A 🔥 streak counter tracks consecutive all-correct submissions.

### Supported Test Types

| Test | Given to Student | Graded Fields |
|---|---|---|
| **Single-Sample Z-Test** | μ₀, σ, n, x̄, α, tail | Hypotheses, z statistic, critical value, decision, Cohen's d |
| **Single-Sample t-Test** | μ₀, n, x̄, s, α, tail | Hypotheses, t statistic, df, critical value, decision, effect size |
| **Independent-Measures t-Test** | n₁, M₁, SS₁, n₂, M₂, SS₂, α, tail | Hypotheses, t statistic, df, critical value, decision, effect size |
| **Repeated-Measures t-Test** | n, M_D, SD_D, α, tail | Hypotheses, t statistic, df, critical value, effect size, decision |
| **One-Way Independent ANOVA** | Partial ANOVA table, α | Missing SS/df/MS/F cells, hypotheses, F critical, significance decision, η² |
| **Two-Factor Independent ANOVA** | Partial two-way ANOVA table, α | Missing ANOVA table cells for A/B/A×B/Error/Total, hypotheses for each effect, F critical values, significance decisions, η² for each effect |
| **One-Way Repeated-Measures ANOVA** | Partial RM ANOVA table (Between Treatments / Between Subjects / Error / Total), α | Missing SS/df/MS/F cells, hypotheses for treatment effect, F critical (df_BT, df_Error), significance decision, η² |
| **Pearson Correlation** | r, n, α, tail | Hypotheses, t statistic, df, critical value, r², significance decision |
| **Simple Linear Regression** | Partial regression ANOVA table, M_X, M_Y, SS_X, SS_Y, r, α | Missing ANOVA table cells, regression coefficients (b and a), F critical, significance decision, R² |

Effect size questions for t-tests rotate randomly among Cohen's d, R², and confidence intervals (where applicable). The full solution key always shows all effect sizes regardless of which one was asked. For ANOVA and regression problems, difficulty controls which ANOVA table cells are hidden — the underlying data are identical across difficulty levels.

### Problem Design

Problems are generated entirely in the browser with back-calculation: the test type, tail direction, and target significance outcome (reject/fail) are chosen first; the observable data (sample means, SDs, etc.) are then derived to guarantee that outcome within ±2% rounding tolerance. Critical values are computed numerically via inverse-t (Lanczos + bisection) with no lookup tables or external libraries.

Grading tolerances:
- Numeric answers (t, z, d, R²): ±0.02
- Critical values: ±0.005
- CI bounds: ±0.05 per bound
- df and decision: exact

### Navigation

The **StatTeacher Toolkit** nav item on every page now opens a dropdown with two options:
- **Instructor** → `toolkit.html` (the full toolkit with Python/Pyodide engine)
- **Student** → `student.html` (the lightweight practice page)

---

## Engine Reference (`Engine_v1.0.0.py`)

### Dependencies

```python
import numpy as np
from scipy.stats import norm, t, f
import pandas as pd
import itertools
```

---

### Supported Statistical Tests

#### 1. Z-Test — `generate_z_score_problem()`

One-sample Z-test using a **known population standard deviation**.

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `population_mean` | `0` | Null hypothesis mean (μ₀) |
| `population_std` | `15` | Known population SD (σ) |
| `n` | `10` | Sample size |
| `tx_effect` | `5` | Simulated treatment effect added to generated data |
| `noise_sd` | `3` | SD of random noise on the treatment effect |
| `alpha` | `0.05` | Significance level |
| `two_tailed` | `True` | Two-tailed vs. one-tailed test |
| `seed` | `None` | Random seed for reproducibility |

**Returns:** dataset (NumPy array), results DataFrame

**Results table includes:** N, Population Mean, Population SD, Sample Mean, Standard Error, Z Score, Z Critical, Decision, Cohen's d, 95% CI Upper, 95% CI Lower

---

#### 2. One-Sample t-Test — `generate_t_test_problem()`

One-sample t-test using the **sample standard deviation** (population SD is unknown).

**Parameters:** Same as Z-test. `population_std` is used only for data generation, not in the test statistic.

**Returns:** dataset (NumPy array), results DataFrame

**Results table includes:** N, Sample SD, Sample Mean, Standard Error, t Score, t Critical, Decision, Cohen's d, R-Squared, 95% CI Upper, 95% CI Lower

---

#### 3. Independent-Samples t-Test — `generate_independent_t_test_problem()`

Two-group independent-samples t-test using **pooled variance**. Supports unequal sample sizes.

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `population_mean1` / `population_mean2` | `10` / `20` | Population means for each group |
| `population_sd1` / `population_sd2` | `15` / `15` | Population SDs for each group |
| `n1` / `n2` | `10` / `10` | Sample sizes for each group |
| `seed1` / `seed2` | `None` | Independent seeds per group |
| `alpha` | `0.05` | Significance level |
| `two_tailed` | `True` | Two-tailed vs. one-tailed test |

**Returns:** dataset1, dataset2 (NumPy arrays), results DataFrame

**Results table includes:** N1, Sample SD1, Sample Mean1, df1, Sum of Squares1, N2, Sample SD2, Sample Mean2, df2, Sum of Squares2, Sum of Product (pooled variance), Standard Error, t Score, t Critical, Decision, Cohen's d, R-Squared, 95% CI Upper, 95% CI Lower

---

#### 4. Repeated-Measures t-Test — `generate_repeated_t_test_problem()`

Paired/repeated-measures t-test. Generates pre-treatment baseline scores and derives post-treatment scores by applying a treatment effect with noise. Computes difference scores for each participant.

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `population_mean` | `0` | Baseline population mean |
| `population_std` | `15` | Baseline population SD |
| `n` | `10` | Number of participants |
| `tx_effect` | `5` | Mean treatment effect (pre → post shift) |
| `noise_sd` | `3` | SD of noise on the treatment effect |
| `alpha` | `0.05` | Significance level |
| `two_tailed` | `True` | Two-tailed vs. one-tailed test |
| `seed` | `None` | Random seed |

**Returns:** pre-treatment array, post-treatment array, results DataFrame

**Results table includes:** N, Differences SD, Differences Mean, Standard Error, t Score, t Critical, Decision, Cohen's d, R-Squared, 95% CI Upper, 95% CI Lower

---

#### 5. Independent ANOVA — `generate_Independent_ANOVA()`

Supports both **one-way** and **fully-crossed factorial** designs with arbitrary factor combinations. Generates a complete ANOVA summary table with SS, df, MS, F, and p-values for all main effects and interactions.

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `factors_dictionary` | `{"A": 3}` | Factor names mapped to number of levels. E.g., `{"A": 3}` = one-way with 3 levels; `{"A": 3, "B": 2}` = 3×2 factorial |
| `n` | `10` | Observations per cell |
| `mean` | `10` | Grand population mean |
| `std` | `2` | Within-cell SD |
| `effect_size` | `2.0` | SD of random mean shifts per cell (controls between-group variability) |
| `alpha` | `0.05` | Significance level |
| `seed` | `None` | Random seed |

**Returns:** long-format dataset DataFrame, ANOVA summary table DataFrame

**ANOVA table includes:** Source (factor names, Interaction for factorial, Within, Total), SS, df, MS, F, p-value

For factorial designs, the table also includes a **Between** header row and a fully decomposed **Interaction** term.

---

#### 6. Pearson Correlation — `generate_pearson_correlation()`

Generates X and Y datasets and computes a full Pearson correlation, including SS_X, SS_Y, SP_XY, r, r², and a significance test of r against a null ρ₀ using a t transformation.

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `x_mean` / `x_std` | `10` / `1` | Population parameters for X |
| `y_mean` / `y_std` | `20` / `3` | Population parameters for Y |
| `n` | `10` | Sample size |
| `ro` | `0` | Null hypothesis value for ρ (rho₀) |
| `alpha` | `0.05` | Significance level |
| `two_tailed` | `True` | Two-tailed vs. one-tailed test |
| `seed` | `None` | Random seed |

**Returns:** X array, Y array, results DataFrame

**Results table includes:** n, df, Mean_X, SS_X, Mean_Y, SS_Y, SP_XY, r, r_squared, Standard Error, t, t_critical, Decision

---

#### 7. Simple Linear Regression — `generate_1_predictor_regression()`

Single-predictor OLS regression. Computes the slope (b) and intercept (a) via least-squares formulas, partitions SS_Y into SS_Regression and SS_Residual, and tests the model with an F-test. Returns both an ANOVA-style summary table and the fitted equation string.

**Parameters:**

| Parameter | Default | Description |
|---|---|---|
| `x_mean` / `x_std` | `10` / `1` | Population parameters for predictor X |
| `y_mean` / `y_std` | `20` / `3` | Population parameters for outcome Y |
| `n` | `10` | Sample size |
| `alpha` | `0.05` | Significance level |
| `seed` | `None` | Random seed |

**Returns:** Y array, X array, regression ANOVA table DataFrame, equation string (e.g., `"Y=2.34X+5.12"`)

**Regression table includes:** Source (Regression, Residual, Total), SS, df, MS, F, Decision

---

### Utility & Helper Functions

| Function | Description |
|---|---|
| `generate_normal_data(mean, std, n, seed)` | Generates a normally distributed NumPy array; optionally returns a summary stats DataFrame |
| `z_score_tranformation(data, rescale, new_mean, new_std)` | Converts raw scores to z-scores; can rescale to any new distribution (e.g., IQ scale with mean=100, SD=15) |
| `z_probability(lower, upper)` | Returns P(lower < Z < upper) for the standard normal |
| `_apply_treatment(pre_scores, effect, noise_sd)` | Simulates a treatment effect by adding a fixed shift plus Gaussian noise to baseline scores |
| `_z_critical(alpha, two_tailed)` | Returns the critical Z value for a given α |
| `_t_critical(df, alpha, two_tailed)` | Returns the critical t value for given df and α |
| `_f_critical(df_Between, df_Within, alpha)` | Returns the critical F value for given numerator and denominator df |
| `_sum_of_squares(x)` | Computes SS = Σ(x − x̄)² |
| `_sum_product(x, y)` | Computes SP_XY = Σ(x − x̄)(y − ȳ) |

---

### CSV Export

Every generated problem includes a **Download Dataset (CSV)** button. The export includes the raw dataset(s) and the full results/ANOVA table, formatted for direct use in Excel, R, SPSS, or other analysis software.

---

### Student Problem Generators *(Experimental)*

After running any statistical test, a context-sensitive **Student Problem Generator** card appears below the results. Each generator produces an instructor-ready worksheet and answer key exportable as an Excel file (`.xlsx`).

There are two generator formats:

**Narrative Hypothesis-Test Problems** — for tests that yield a single test statistic and decision. The generator produces a plain-English scenario, a data table, and a step-by-step question set (state hypotheses, compute test statistic, compare to critical value, make a decision, interpret effect size / CI). The instructor key includes all computed values and a written interpretation.

| Test | Generator Type |
|---|---|
| Z-Test (one-sample) | Narrative hypothesis-test problem |
| One-Sample t-Test | Narrative hypothesis-test problem |
| Independent-Samples t-Test | Narrative hypothesis-test problem |
| Repeated-Measures t-Test | Narrative hypothesis-test problem |
| Pearson Correlation | Narrative hypothesis-test problem |

Each narrative generator includes a **🎲 Random Scenario** button that populates the context fields (variable name, population, units, group labels, etc.) with a randomly selected entry from a bank of 50 realistic research scenarios. This allows quick problem variety without manual entry.

For t-test narrative problems, the **Effect Size Question** field controls which effect size measure the student is asked to compute: Cohen's *d*, *r*², or a confidence interval. Selecting *Random* picks one of the three on each generation.

**ANOVA Table Completion Problems** — for designs that produce a summary table. The generator presents a partially blanked ANOVA or regression table; students must fill in the missing cells. Difficulty controls *only* which cells are hidden — the underlying data are identical across levels.

Each ANOVA generator also includes a **🎲 Random Scenario** button that fills the outcome variable field with a randomly selected entry from a bank of 50 realistic outcome variables.

| Test | Difficulty Levels | Cells visible at each level |
|---|---|---|
| One-Way ANOVA | Easy | All SS and df shown; MS and F hidden |
| | Moderate | SS_between, SS_total, df_total shown; SS_within, all MS, F hidden |
| | Hard | df values and F shown; all SS and MS hidden |
| Two-Way ANOVA | Easy | All SS and df shown; MS and F values hidden |
| | Moderate | Main SS terms, df_total shown; interaction/error SS, all MS, F hidden |
| | Hard | df values and F shown; all SS and MS hidden |
| One-Way RM ANOVA | Easy | All SS and df shown; MS_BT, MS_BS, MS_Error, and F hidden |
| | Moderate | SS_BT, SS_BS, SS_Total shown; SS_Error, all df, MS_BT, and F hidden |
| | Hard | All df and MS values shown; all SS values and df_Total hidden |
| Simple Linear Regression | Easy | All SS and df shown; MS_regression, MS_residual, F hidden |
| | Moderate | SS_regression, df_regression, df_residual, SS_total, df_total shown; SS_residual, all MS, F hidden |
| | Hard | df_regression, MS_regression, F, df_residual shown; all SS (except via F/MS), MS_residual, df_total hidden |

---

### Batch Generation *(Experimental)*

Every parameter section and every Student Problem Generator card includes a **Batch Generator** panel. Batch generation runs the statistical engine repeatedly and exports all results as a single multi-sheet Excel workbook (`.xlsx`).

There are two batch modes:

**Dataset Batch** — generates N independent datasets using the current parameter settings. Each dataset is written to its own sheet. A `Metadata` sheet records the test type, alpha, parameters used, and timestamp for each run.

**Student Problem Batch** — generates N complete student problems with instructor keys. Each problem is written to its own sheet (raw dataset + optional summary table + full problem text + key). An `Instructor_Key` sheet summarizes the decision, effect size, and interpretation for every problem.

Both modes support up to 20 problems per batch (no sweep) or up to 50 when a parameter sweep is active.

#### Per-Problem Scenario Randomization

Every Student Problem Batch panel includes a **🎲 Randomize scenario per problem** checkbox. When enabled, each problem in the batch is assigned a different randomly selected scenario from the appropriate bank (50 entries per test type), so the exported workbook contains problems with varied research contexts rather than repeating the same variable names throughout.

#### Per-Problem Effect Size Control (T-Test Narrative Problems)

The T-test, Independent-Samples t-Test, and Repeated-Measures t-Test batch panels include an **Effect size** select alongside the randomize-scenario checkbox. Options:

| Option | Behavior |
|---|---|
| Random | Each problem independently draws a random effect size type (weighted: 60% Cohen's *d*, 25% *r*², 15% CI) |
| Cycle (d → r² → CI) | Rotates through Cohen's *d*, *r*², and CI in order across problems |
| Cohen's *d* | All problems ask for Cohen's *d* |
| *r*² | All problems ask for *r*² |
| CI | All problems ask for a confidence interval |

The question text and instructor key in the exported Excel file update to match the chosen effect size type for each problem.

#### Per-Problem Difficulty Control (ANOVA Table Completion Problems)

The One-Way ANOVA, Two-Way ANOVA, and RM ANOVA batch panels include a **Difficulty** select alongside the randomize-scenario checkbox. Options:

| Option | Behavior |
|---|---|
| Random | Each problem is randomly assigned Easy, Moderate, or Hard (equal probability) |
| Cycle (Easy → Moderate → Hard) | Rotates through Easy, Moderate, Hard in order across problems |
| Easy / Moderate / Hard | All problems use the specified difficulty level |

Original difficulty settings are restored after the batch completes.

#### Parameter Sweep

Inside each batch panel, an optional **Parameter Sweep** section lets instructors systematically vary any numeric parameter across the batch instead of drawing N random samples at the same settings.

Each sweep row specifies:
- **Parameter** — any numeric input for that test (e.g., n, σ, α, treatment effect)
- **Mode** — *List* (comma-separated values) or *Range* (start / end / step)

Multiple swept parameters are **zipped**: problem i gets the i-th value from each swept parameter. If lists differ in length, the shorter list repeats its last value. The batch count equals the length of the longest list or range.

| Batch section | Max count (no sweep) | Max count (sweep) |
|---|---|---|
| Dataset Batch | 20 | 50 |
| Student Problem Batch | 20 | 50 |

**Example:** Sweeping n with values `10, 20, 30` and σ with values `5, 10, 15` produces three problems: (n=10, σ=5), (n=20, σ=10), (n=30, σ=15). Original parameter values are restored after the batch completes.

---

## Deployment

The site is built with **Vite** and deployed to **GitHub Pages** via GitHub Actions. Every push to `main` triggers the CI/CD pipeline:

1. `npm ci` — installs dependencies
2. `tsc --noEmit` — type-checks all TypeScript source files
3. `vite build` — compiles TypeScript and outputs static files to `dist/`
4. The `dist/` directory is deployed to GitHub Pages

### Local development

```bash
npm install        # install dev dependencies (first time only)
npm run dev        # start local dev server at http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build locally
```

### Publishing changes

```bash
git add <files>
git commit -m "Your update message"
git push           # GitHub Actions handles the build and deploy automatically
```

---

## Citation

If you use the StatTeacher Toolkit in your course or research, please cite it as:

> Warren, K. (2026). *StatTeacher Toolkit* [Python/Pyodide web application]. https://kalilwarren.github.io/toolkit.html

---

## Contact

**Kalil Warren** · [knwarren@email.sc.edu](mailto:knwarren@email.sc.edu)
ORCID: [0009-0009-3409-9436](https://orcid.org/0009-0009-3409-9436)
LinkedIn: [linkedin.com/in/kalil-warren-3833a317a](https://www.linkedin.com/in/kalil-warren-3833a317a/)
