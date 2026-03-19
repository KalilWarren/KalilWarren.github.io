# StatTeacher Toolkit — Technical Capabilities Report

**Version:** 1.0.0
**Author:** Kalil Warren
**Platform:** Browser-based (TypeScript + Vite + Pyodide)
**Deployment:** GitHub Pages (https://kalilwarren.github.io)

---

## 1. Architecture Overview

StatTeacher Toolkit is a fully client-side web application with no server dependencies. All statistical computation runs via **Pyodide v0.26.4** — a WebAssembly port of CPython — which executes a Python engine (`Engine_v1.0.0.py`) directly in the browser using NumPy, SciPy, and Pandas. The front-end is TypeScript compiled via Vite 6.

The application is split into two independent pages:

| Page | File | Role |
|---|---|---|
| Instructor Toolkit | `toolkit.html` | Dataset generation, results display, problem export, batch generation |
| Student Practice | `student.html` | Interactive practice problems, grading, feedback, streaks |

---

## 2. Instructor Toolkit Module

### 2.1 Supported Statistical Tests (8 tests)

| # | Test | Parameters Configurable |
|---|---|---|
| 1 | Single-Sample Z-Test | μ₀, σ, n, tx effect, noise SD, α, tail |
| 2 | Single-Sample t-Test | μ₀, n, tx effect, noise SD, α, tail |
| 3 | Independent-Samples t-Test | μ₁/μ₂, σ₁/σ₂, n₁/n₂, seeds, α, tail |
| 4 | Repeated-Measures t-Test | μ, σ, n, tx effect, noise SD, α, tail |
| 5 | One-Way Independent ANOVA | Factor levels, n, grand mean, within-cell SD, effect size, α |
| 6 | One-Way Repeated-Measures ANOVA | Condition means, n subjects, subject SD, error SD, α |
| 7 | Pearson Correlation | x/y means, x/y SDs, n, ρ₀, tx effect, noise SD, α, tail |
| 8 | Simple Linear Regression | x/y means, x/y SDs, n, α |

### 2.2 Statistical Output Per Test

All tests return a complete results table rendered in the browser. Output fields by test:

**Z-Test / One-Sample t-Test:** N, Sample Mean, SD (or σ), SE, test statistic, critical value, decision, Cohen's d, 95% CI (upper/lower)

**Independent-Samples t-Test:** N₁/N₂, M₁/M₂, SD₁/SD₂, SS₁/SS₂, df₁/df₂, pooled SD, SE, t, t-critical, decision, Cohen's d, R², CI bounds

**Repeated-Measures t-Test:** N, mean difference, SD of differences, SE, t, t-critical, df, decision, Cohen's d, R², CI bounds

**One-Way ANOVA:** Full summary table — Source (Between/Within/Total), SS, df, MS, F, p-value; color-coded decision row

**RM ANOVA:** Full summary table — Source (Between Treatments/Between Subjects/Error/Total), SS, df, MS, F, p-value; wide-format dataset (subjects × conditions)

**Pearson Correlation:** n, df, SS_X, SS_Y, SP_XY, r, r², SE, t, t-critical, decision

**Simple Linear Regression:** OLS ANOVA table (Regression/Residual/Total), SS, df, MS, F, decision, regression equation (e.g., Ŷ = 2.34X + 5.12)

### 2.3 Dataset Export (CSV)

Each generated test produces a downloadable CSV with:
- Raw dataset (one or two samples; or long-format ANOVA / wide-format RM ANOVA)
- Results summary table

### 2.4 Student Problem Generator

Triggered after any test run. Produces two formats:

**Narrative Format** (Z, one-sample t, independent t, repeated t, Pearson):
- Context scenario (researcher studying a variable in a population)
- Summary statistics provided as "given" information
- 5-step question sequence: state hypotheses → compute test statistic → find critical value → determine significance → interpret effect size
- Instructor answer key with all computed values and interpretation guidance

**Table-Completion Format** (One-Way ANOVA, Two-Way ANOVA, RM ANOVA, Regression):
- Partially masked summary table with selected cells hidden ("?")
- Questions: fill missing table cells → state hypotheses → F critical → decision → effect size (η² or R²)
- Instructor key reveals all hidden values with formula explanations

**Three difficulty levels** for table-based problems:

| Test | Easy | Moderate | Hard |
|---|---|---|---|
| One-Way ANOVA | Hide MS, F | Hide df_within, SS_within, MS, F | Hide MS_within, all SS, df_total |
| Two-Way ANOVA | Hide MS, F | Hide interaction/error SS, all MS, F | Hide all SS and MS |
| RM ANOVA | Hide all MS, F | Hide SS_error, df, MS_BT, F | Hide all SS, df_total |
| Regression | Hide MS, F | Hide SS_residual, MS, F | Hide all SS, MS_residual, df_total |

**🎲 Random Scenario Button:**
Every generator card includes a Random Scenario button that instantly fills context fields from a bank of 50 realistic research scenarios per test type (stored in `src/toolkit/scenarios.ts`):

| Test(s) | Fields populated | Bank |
|---|---|---|
| Z-Test, one-sample t | Variable name, population, unit | `Z_T_SCENARIOS` (50) |
| Independent t | Variable name, unit, group 1 label, group 2 label | `IND_T_SCENARIOS` (50) |
| Repeated t | Variable name, unit, pre-condition label, post-condition label | `REP_T_SCENARIOS` (50) |
| Pearson, Regression | X variable + unit, Y variable + unit, population | `PEARSON_REG_SCENARIOS` (50) |
| One-Way ANOVA, Two-Way ANOVA, RM ANOVA | Outcome variable name | `ANOVA_SCENARIOS` (50) |

**Effect Size Question (Narrative t-Tests):**
An Effect Size Question selector controls which effect size measure is asked in Question 5. Options: **Random** (weighted 60% Cohen's *d* / 25% *r*² / 15% CI), **Cohen's *d***, ***r*²**, **Confidence Interval**. The question text and instructor key update accordingly.

**Excel Export:** Each problem exports as a multi-sheet `.xlsx` workbook:
- Sheet 1: Raw dataset
- Sheet 2: ANOVA/regression summary table (where applicable)
- Sheet 3: Student worksheet (problem statement + questions)
- Sheet 4: Instructor answer key (all values, formulas, interpretations)

### 2.5 Batch Generation

Two batch modes with shared **Parameter Sweep**, **Scenario Randomization**, and (where applicable) **Effect Size** and **Difficulty** batch controls:

**Dataset Batch:**
- Generates N independent datasets with identical parameters
- Output: `.xlsx` workbook with one sheet per dataset + metadata sheet
- Limit: 20 problems (50 with parameter sweep)

**Student Problem Batch:**
- Generates N complete student problems (worksheet + instructor key)
- Output: `.xlsx` workbook with individual problem sheets + `Instructor_Key` summary sheet
- Summary sheet: problem ID, test type, decision, effect size, α, parameters, timestamp
- Limit: 20 problems (50 with parameter sweep)

**Per-Problem Scenario Randomization:**

Every Student Problem Batch panel includes a **🎲 Randomize scenario per problem** checkbox. When enabled, each iteration pulls a fresh random scenario from the appropriate bank (50 entries per test type), producing a workbook where each problem has a distinct research context. Scenario field values are saved before the batch and restored after it completes.

**Per-Problem Effect Size Control (Narrative T-Test Problems):**

The T-Test, Independent t-Test, and Repeated-Measures t-Test batch panels include an Effect Size select:

| Option | Behavior |
|---|---|
| Random | Each problem independently draws a random effect size type (60% Cohen's *d*, 25% *r*², 15% CI) |
| Cycle (d → r² → CI) | Rotates through Cohen's *d*, *r*², CI in order across problems |
| Cohen's *d* / *r*² / CI | All problems use the specified effect size type |

The question text and instructor key in the exported Excel file update per problem to match the resolved effect size type.

**Per-Problem Difficulty Control (ANOVA Table Completion Problems):**

The One-Way ANOVA, Two-Way ANOVA, and RM ANOVA batch panels include a Difficulty select:

| Option | Behavior |
|---|---|
| Random | Each problem is randomly assigned Easy, Moderate, or Hard (equal probability) |
| Cycle (Easy → Moderate → Hard) | Rotates in order across problems |
| Easy / Moderate / Hard | All problems use the specified level |

The difficulty select value is overridden per iteration and restored after the batch completes.

**Parameter Sweep:**

Both batch modes support sweeping any numeric parameter across problems. Two sweep modes:
- **List:** Comma-separated values (e.g., `10, 15, 20, 25`)
- **Range:** Start / End / Step (e.g., `10` → `30` by `5` = six problems)

Multiple parameters can be swept simultaneously; they are **zipped** (problem *i* receives the *i*-th value from each swept parameter). The batch count equals the length of the longest list/range; shorter lists hold their last value constant.

**Sweepable parameters by test:**

| Test | Sweepable Parameters |
|---|---|
| Z / one-sample t | μ₀, σ, n, tx effect, noise SD, α |
| Independent t | μ₁, σ₁, n₁, μ₂, σ₂, n₂, α |
| Repeated t | μ, σ, n, tx effect, noise SD, α |
| One-Way ANOVA | n per cell, grand mean, within SD, effect size SD, α |
| RM ANOVA | n subjects, subject SD, error SD, α |
| Pearson | x mean, x SD, y mean, y SD, n, ρ₀, tx effect, noise SD, α |
| Regression | x mean, x SD, y mean, y SD, n, α |

---

## 3. Student Practice Module

### 3.1 Test Types Available (9)

On page load, no test type is selected and no problem is generated. A placeholder message prompts the student to select at least one test type before clicking **New Problem**. Once a type is selected and the button is clicked, the problem appears and subsequent clicks generate new problems without reselection.

Students enable/disable test types via pill checkboxes; "New Problem" randomly selects from the enabled pool.

| Test Type | Problem Format | Key "Given" Information |
|---|---|---|
| Single-Sample Z-Test | Narrative | μ₀, σ, n, x̄, α, tail |
| Single-Sample t-Test | Narrative | μ₀, n, x̄, s, α, tail |
| Independent-Measures t-Test | Narrative | n₁, M₁, SS₁, n₂, M₂, SS₂, α, tail |
| Repeated-Measures t-Test | Narrative | n, M_D, SD_D, α, tail |
| One-Way Independent ANOVA | Table completion | Partial ANOVA table, α |
| Two-Way Independent ANOVA | Table completion | Partial 2-way ANOVA table, α |
| One-Way Repeated-Measures ANOVA | Table completion | Partial RM ANOVA table, α |
| Pearson Correlation | Narrative | r, n, α, tail |
| Simple Linear Regression | Table completion | Partial regression table, b₀, b₁, α |

### 3.2 Problem Structure

**Narrative problems** (Z, t, independent t, repeated t, Pearson) present five questions:
1. State H₀ and H₁ (radio selection)
2. Compute the test statistic (numeric input)
3. Find the critical value (numeric input)
4. Determine statistical significance (Reject / Fail to Reject radio)
5. Compute effect size (Cohen's d, R², or r² depending on test type; occasionally replaced by confidence interval)

**Table-completion problems** (all ANOVA types, regression) present five questions:
1. Fill missing table cells (numeric inputs embedded in the table)
2. State hypotheses (radio selection; for two-way ANOVA, one set per effect: A, B, A×B)
3. Find F critical value (numeric input; for two-way, one per effect)
4. Determine significance (Reject / Fail to Reject; for two-way, one per effect)
5. Compute η² or R² (numeric input)

### 3.3 Grading & Feedback

Grading is performed client-side with per-field tolerance:

| Field Type | Tolerance |
|---|---|
| Numeric (test statistic, effect size, SS, MS) | ±0.02 |
| Critical values | ±0.005 |
| Confidence interval bounds | ±0.05 |
| df values | Exact integer match |
| Hypothesis selection / decision | Exact (radio) |

After grading:
- Each field shows a ✓ or ✗ icon with a contextual hint for incorrect answers
- A banner indicates all-correct or partial credit
- If any answer is wrong, the full solution section auto-opens

### 3.4 Full Solution View

Each problem includes a collapsible "Show Full Solution" section containing:
- Complete worked solution with all computed values
- Full ANOVA/regression table (table-based problems)
- Context reminder (variable, population, n, α)
- Hypothesis statements
- Decision and significance statement
- Effect size with verbal interpretation
- For RM ANOVA: explanatory note that F = MS_BT / MS_Error (not MS_BS, which is a nuisance partition)

### 3.5 Scenario Banks

Each test type has a local scenario bank of **50** psychological, health, and cognitive research contexts (e.g., reaction time, cortisol levels, working memory, test anxiety, pain tolerance, sleep quality, step count, heart rate, mood ratings). A random scenario is drawn on each new problem. All scenarios use back-calculation to guarantee the desired test outcome (reject H₀ or fail to reject) within ±2% rounding tolerance.

### 3.6 Streak Tracking

A `localStorage`-persisted streak counter tracks consecutive all-correct problem submissions across sessions and displays live (e.g., "🔥 Streak: 7").

---

## 4. Python Statistical Engine (`Engine_v1.0.0.py`)

The engine is served as a static file and loaded into Pyodide at runtime. All computation is sandboxed in the browser; no data leaves the client.

**Dependencies:** NumPy, SciPy (`norm`, `t`, `f` distributions), Pandas

**Exported test generator functions (8):**

| Function | Returns |
|---|---|
| `generate_z_score_problem()` | Raw dataset array + results DataFrame |
| `generate_t_test_problem()` | Raw dataset array + results DataFrame |
| `generate_independent_t_test_problem()` | Two dataset arrays + results DataFrame |
| `generate_repeated_t_test_problem()` | Pre/post arrays + results DataFrame |
| `generate_Independent_ANOVA()` | Long-format dataset DataFrame + ANOVA table DataFrame |
| `generate_one_way_repeated_measures_anova()` | Wide-format dataset DataFrame + RM ANOVA table DataFrame + decision dict |
| `generate_pearson_correlation()` | x/y arrays + results DataFrame |
| `generate_1_predictor_regression()` | x/y arrays + regression table DataFrame + equation string |

**Utility functions:** `generate_normal_data()`, `z_score_transformation()`, `z_probability()`, `_apply_treatment()`, `_z_critical()`, `_t_critical()`, `_f_critical()`, `_sum_of_squares()`, `_sum_product()`

All TypeScript↔Python communication goes through JSON serialization. Critical value computation uses SciPy's percent-point functions (PPF) for Z, t, and F distributions.

---

## 5. Summary of Quantified Capabilities

| Dimension | Count / Scope |
|---|---|
| Instructor test types | 8 |
| Student practice test types | 9 |
| Problem generator formats | 2 (narrative, table-completion) |
| Table-completion difficulty levels | 3 (Easy, Moderate, Hard) per test |
| Graded fields per problem | 5–9 depending on test type |
| Batch generation limits | 20 without sweep / 50 with sweep |
| Parameter sweep modes | 2 (list, range) |
| Sweepable parameters per test | 5–9 |
| Instructor scenario bank size | 50 per test type (5 banks in `scenarios.ts`) |
| Student scenario bank size | 50 per test type (9 local banks, one per module) |
| Batch effect size control options | 5 (Random, Cycle, Cohen's d, r², CI) — t-tests only |
| Batch difficulty control options | 4 (Random, Cycle, Easy, Moderate, Hard) — ANOVA only |
| Export formats | CSV (datasets), XLSX (problems + keys) |
| Streak persistence | Cross-session via localStorage |
| Server dependencies | None (fully client-side) |
| Python runtime | Pyodide v0.26.4 (WebAssembly) |
