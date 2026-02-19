# kalilwarren.github.io

Academic research profile for **Kalil Warren**, PhD Student in Psychology (Cognitive & Neural Sciences) at the University of South Carolina.

**Live site:** [https://kalilwarren.github.io](https://kalilwarren.github.io)

---

## Site Structure

```
/
├── index.html          — Homepage (bio, research interests, news)
├── research.html       — Research statement, projects, publications
├── cv.html             — Full curriculum vitae
├── toolkit.html        — StatTeacher Toolkit web app
├── css/
│   └── style.css       — Site-wide styles
├── assets/
│   ├── Picture1.jpg    — Headshot
│   └── *.pdf           — CV PDF
└── toolkit/
    └── Engine_v1.0.0.py — StatTeacher statistical engine
```

---

## StatTeacher Toolkit

### Overview

The **StatTeacher Toolkit** is a fully browser-based interactive statistics problem generator built for instructors and students. It runs entirely client-side using [Pyodide](https://pyodide.org) — a WebAssembly port of Python — so no server, installation, or account is required.

Configure population parameters, click **Generate Problem**, and instantly receive a synthetic dataset along with a complete statistical results table, including test statistics, critical values, effect sizes, confidence intervals, and a hypothesis testing decision. Results can be downloaded as a CSV file.

### How It Works

The app loads `toolkit/Engine_v1.0.0.py` at runtime into a Pyodide Python environment running in the browser. NumPy, SciPy, and Pandas are loaded via Pyodide's package system. All computation happens locally in the user's browser tab.

**Technology stack:**
- Python 3 (via [Pyodide v0.26.4](https://pyodide.org))
- NumPy, SciPy, Pandas
- Vanilla JavaScript (no frameworks)
- HTML/CSS with the site's warm academic theme

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

## Deployment

The site is deployed on **GitHub Pages** from the `main` branch of this repository. Any push to `main` triggers an automatic rebuild (typically within 30 seconds).

To update the site locally:

```bash
git add -A
git commit -m "Your update message"
git push
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
