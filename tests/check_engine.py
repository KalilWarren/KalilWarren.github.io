"""Cross-check the StatTeacher Python engine against SciPy.

Runs every generate_* function in public/toolkit/Engine_v1.0.0.py over a range
of seeds and settings, then recomputes each reported statistic from the dataset
the engine returned, using SciPy's own tests or a separate NumPy calculation.

Usage: python3 tests/check_engine.py
"""
import itertools
import math
import pathlib
import re
import sys
import warnings
from collections import defaultdict

import numpy as np
from scipy import stats

warnings.filterwarnings('ignore')

ENGINE = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'toolkit' / 'Engine_v1.0.0.py'
eng = {}
exec(compile(ENGINE.read_text(encoding='utf-8'), str(ENGINE), 'exec'), eng)

SEEDS = range(1, 41)
failures = defaultdict(list)
runs = defaultdict(int)


def close(test, what, got, want, tol, ctx):
    try:
        ok = math.isfinite(float(got)) and abs(float(got) - float(want)) <= tol
    except (TypeError, ValueError):
        ok = False
    if not ok:
        failures[test].append((what, got, want, ctx))


def same(test, what, got, want, ctx):
    if got != want:
        failures[test].append((what, got, want, ctx))


def rows(df):
    """Statistic/Value results table -> dict."""
    return dict(zip(df['Statistic'], df['Value']))


def crit_t(alpha, df, two):
    return stats.t.ppf(1 - alpha / 2, df) if two else stats.t.ppf(1 - alpha, df)


def decision(stat, crit):
    # The engine rejects when |statistic| exceeds the critical value
    return 'Reject Null' if abs(stat) > crit else 'Fail to Reject Null'


def near_cutoff(stat, crit):
    return abs(abs(stat) - crit) < 0.006


SETTINGS = list(itertools.product(SEEDS, (0.05, 0.01), (True, False)))


def test_z():
    name = 'z test'
    for seed, alpha, two in SETTINGS:
        ctx = dict(seed=seed, alpha=alpha, two_tailed=two)
        mu, sigma, n = 100, 15, 10 + seed
        data, res = eng['generate_z_score_problem'](
            population_mean=mu, population_std=sigma, n=n, seed=seed, tx_effect_switch=True,
            tx_effect=5, noise_sd=3, alpha=alpha, two_tailed=two)
        r = rows(res); runs[name] += 1
        m, se = np.mean(data), sigma / math.sqrt(len(data))
        z = (m - mu) / se
        crit = stats.norm.ppf(1 - alpha / 2) if two else stats.norm.ppf(1 - alpha)
        same(name, 'N', int(r['N']), len(data), ctx)
        close(name, 'sample mean', r['Sample Mean'], m, 0.006, ctx)
        close(name, 'standard error', r['Standard Error'], se, 0.006, ctx)
        close(name, 'z', r['Z Score'], z, 0.006, ctx)
        close(name, 'z critical', r['Z_Critical'], crit, 1e-4, ctx)
        close(name, "Cohen's d", r["Cohen's d"], (m - mu) / sigma, 0.006, ctx)
        close(name, 'CI upper', r['95% CI Upper'], m + crit * se, 0.006, ctx)
        close(name, 'CI lower', r['95% CI Lower'], m - crit * se, 0.006, ctx)
        if not near_cutoff(z, crit):
            same(name, 'decision', r['Decision'], decision(z, crit), ctx)


def test_t():
    name = 'one-sample t test'
    for seed, alpha, two in SETTINGS:
        ctx = dict(seed=seed, alpha=alpha, two_tailed=two)
        mu, n = 100, 8 + seed
        data, res = eng['generate_t_test_problem'](
            population_mean=mu, population_std=15, n=n, seed=seed, tx_effect_switch=True,
            tx_effect=5, noise_sd=3, alpha=alpha, two_tailed=two)
        r = rows(res); runs[name] += 1
        ref = stats.ttest_1samp(data, mu)
        df = len(data) - 1
        s, m = np.std(data, ddof=1), np.mean(data)
        se, crit = s / math.sqrt(len(data)), crit_t(alpha, df, two)
        t = float(ref.statistic)
        close(name, 'sample SD', r['Sample SD'], s, 0.006, ctx)
        close(name, 't vs scipy.ttest_1samp', r['t Score'], t, 0.006, ctx)
        close(name, 't critical', r['t_Critical'], crit, 1e-4, ctx)
        close(name, "Cohen's d", r["Cohen's d"], (m - mu) / s, 0.006, ctx)
        close(name, 'r-squared', r['R-Squared'], t * t / (t * t + df), 1e-4, ctx)
        close(name, 'CI upper', r['95% CI Upper'], m + crit * se, 0.006, ctx)
        close(name, 'CI lower', r['95% CI Lower'], m - crit * se, 0.006, ctx)
        if not near_cutoff(t, crit):
            same(name, 'decision', r['Decision'], decision(t, crit), ctx)


def test_ind():
    name = 'independent t test'
    for seed, alpha, two in SETTINGS:
        ctx = dict(seed=seed, alpha=alpha, two_tailed=two)
        d1, d2, res = eng['generate_independent_t_test_problem'](
            population_mean1=100, population_sd1=15, n1=10 + seed % 7, seed1=seed,
            population_mean2=106, population_sd2=12, n2=12 + seed % 5, seed2=seed + 1000,
            alpha=alpha, two_tailed=two)
        r = rows(res); runs[name] += 1
        ref = stats.ttest_ind(d1, d2, equal_var=True)
        n1, n2 = len(d1), len(d2)
        df = n1 + n2 - 2
        sp = math.sqrt(((n1 - 1) * np.var(d1, ddof=1) + (n2 - 1) * np.var(d2, ddof=1)) / df)
        se = sp * math.sqrt(1 / n1 + 1 / n2)
        diff, t, crit = np.mean(d1) - np.mean(d2), float(ref.statistic), crit_t(alpha, df, two)
        close(name, 'sum of squares 1', r['Sum of Squares1'], (n1 - 1) * np.var(d1, ddof=1), 0.006, ctx)
        close(name, 'sum of squares 2', r['Sum of Squares2'], (n2 - 1) * np.var(d2, ddof=1), 0.006, ctx)
        close(name, 'standard error', r['Standard Error'], se, 0.006, ctx)
        close(name, 't vs scipy.ttest_ind', r['t Score'], t, 0.006, ctx)
        close(name, 't critical', r['t_Critical'], crit, 1e-4, ctx)
        close(name, "Cohen's d", r["Cohen's d"], diff / sp, 0.006, ctx)
        close(name, 'r-squared', r['R-Squared'], t * t / (t * t + df), 1e-4, ctx)
        close(name, 'CI upper', r['95% CI Upper'], diff + crit * se, 0.006, ctx)
        close(name, 'CI lower', r['95% CI Lower'], diff - crit * se, 0.006, ctx)
        if not near_cutoff(t, crit):
            same(name, 'decision', r['Decision'], decision(t, crit), ctx)


def test_rep():
    name = 'repeated-measures t test'
    for seed, alpha, two in SETTINGS:
        ctx = dict(seed=seed, alpha=alpha, two_tailed=two)
        pre, post, res = eng['generate_repeated_t_test_problem'](
            population_mean=100, population_std=15, n=8 + seed % 20, seed=seed,
            tx_effect=4, noise_sd=5, alpha=alpha, two_tailed=two)
        r = rows(res); runs[name] += 1
        ref = stats.ttest_rel(pre, post)          # the engine's difference is pre - post
        d = np.asarray(pre) - np.asarray(post)
        df = len(d) - 1
        md, sd = np.mean(d), np.std(d, ddof=1)
        se, t, crit = sd / math.sqrt(len(d)), float(ref.statistic), crit_t(alpha, df, two)
        close(name, 'mean difference', r['Differences Mean'], md, 0.006, ctx)
        close(name, 'SD of differences', r['Differences SD'], sd, 0.006, ctx)
        close(name, 't vs scipy.ttest_rel', r['t Score'], t, 0.006, ctx)
        close(name, 't critical', r['t_Critical'], crit, 1e-4, ctx)
        close(name, "Cohen's d", r["Cohen's d"], md / sd, 0.006, ctx)
        close(name, 'r-squared', r['R-Squared'], t * t / (t * t + df), 1e-4, ctx)
        close(name, 'CI upper', r['95% CI Upper'], md + crit * se, 0.006, ctx)
        close(name, 'CI lower', r['95% CI Lower'], md - crit * se, 0.006, ctx)
        if not near_cutoff(t, crit):
            same(name, 'decision', r['Decision'], decision(t, crit), ctx)


def source(table, label):
    return table[table['Source'] == label].iloc[0]


def test_anova_oneway():
    name = 'one-way ANOVA'
    for seed in SEEDS:
        k = 2 + seed % 4
        ctx = dict(seed=seed, k=k)
        ds, tbl = eng['generate_Independent_ANOVA'](
            factors_dictionary={'A': k}, n=6 + seed % 9, mean=50, std=10,
            effect_size=0.6, alpha=0.05, seed=seed)
        runs[name] += 1
        groups = [g['Scores'].to_numpy() for _, g in ds.groupby('A')]
        ref = stats.f_oneway(*groups)
        a, w, tot = source(tbl, 'A'), source(tbl, 'Within Treatments'), source(tbl, 'Total')
        scores = ds['Scores'].to_numpy()
        ss_tot = float(((scores - scores.mean()) ** 2).sum())
        ss_w = float(sum(((g - g.mean()) ** 2).sum() for g in groups))
        close(name, 'SS total', tot['SS'], ss_tot, 1e-6 * max(1, ss_tot), ctx)
        close(name, 'SS within', w['SS'], ss_w, 1e-6 * max(1, ss_w), ctx)
        close(name, 'SS between', a['SS'], ss_tot - ss_w, 1e-6 * max(1, ss_tot), ctx)
        same(name, 'df', (int(a['df']), int(w['df']), int(tot['df'])), (k - 1, len(scores) - k, len(scores) - 1), ctx)
        close(name, 'F vs scipy.f_oneway', a['F'], float(ref.statistic), 1e-6 * max(1, float(ref.statistic)), ctx)
        close(name, 'p vs scipy.f_oneway', a['p-value'], float(ref.pvalue), 1e-6, ctx)


def test_anova_twoway():
    name = 'two-way ANOVA'
    for seed in SEEDS:
        a_lv, b_lv, n = 2 + seed % 3, 2 + seed % 2, 4 + seed % 6
        ctx = dict(seed=seed, a=a_lv, b=b_lv, n=n)
        ds, tbl = eng['generate_Independent_ANOVA'](
            factors_dictionary={'A': a_lv, 'B': b_lv}, n=n, mean=50, std=10,
            effect_size=0.6, alpha=0.05, seed=seed)
        runs[name] += 1
        y = ds['Scores'].to_numpy(dtype=float)
        gm, N = y.mean(), len(y)
        # Balanced design: sums of squares from marginal and cell means
        ss_a = sum(len(g) * (g['Scores'].mean() - gm) ** 2 for _, g in ds.groupby('A'))
        ss_b = sum(len(g) * (g['Scores'].mean() - gm) ** 2 for _, g in ds.groupby('B'))
        ss_cells = sum(len(g) * (g['Scores'].mean() - gm) ** 2 for _, g in ds.groupby(['A', 'B']))
        ss_w = sum(((g['Scores'] - g['Scores'].mean()) ** 2).sum() for _, g in ds.groupby(['A', 'B']))
        ss_ab = ss_cells - ss_a - ss_b
        df_w = N - a_lv * b_lv
        ms_w = ss_w / df_w
        want = {'A': (ss_a, a_lv - 1), 'B': (ss_b, b_lv - 1), 'Interaction': (ss_ab, (a_lv - 1) * (b_lv - 1))}
        for label, (ss, df) in want.items():
            row = source(tbl, label)
            f = (ss / df) / ms_w
            close(name, f'SS {label}', row['SS'], ss, 1e-6 * max(1, ss), ctx)
            same(name, f'df {label}', int(row['df']), df, ctx)
            close(name, f'F {label}', row['F'], f, 1e-6 * max(1, f), ctx)
            close(name, f'p {label}', row['p-value'], stats.f.sf(f, df, df_w), 1e-6, ctx)
        close(name, 'SS within', source(tbl, 'Within Treatments')['SS'], ss_w, 1e-6 * max(1, ss_w), ctx)
        close(name, 'SS total', source(tbl, 'Total')['SS'], ((y - gm) ** 2).sum(), 1e-6 * N * 100, ctx)


def test_rma():
    name = 'repeated-measures ANOVA'
    for seed in SEEDS:
        k, n = 3 + seed % 3, 6 + seed % 10
        means = [50 + 3 * i for i in range(k)]
        ctx = dict(seed=seed, k=k, n=n)
        wide, tbl, eta, dec = eng['generate_one_way_repeated_measures_anova'](
            n_subjects=n, condition_means=means, subject_sd=8, error_sd=5,
            alpha=0.05, labels=None, seed=seed)
        runs[name] += 1
        x = wide.drop(columns=['subject']).to_numpy(dtype=float)
        gm = x.mean()
        ss_bt = n * ((x.mean(axis=0) - gm) ** 2).sum()
        ss_bs = k * ((x.mean(axis=1) - gm) ** 2).sum()
        ss_tot = ((x - gm) ** 2).sum()
        ss_e = ss_tot - ss_bt - ss_bs
        df_bt, df_e = k - 1, (k - 1) * (n - 1)
        f = (ss_bt / df_bt) / (ss_e / df_e)
        crit = stats.f.ppf(0.95, df_bt, df_e)
        bt, err = source(tbl, 'Between Treatments'), source(tbl, 'Error')
        # The table is rounded to 3 decimals and must match the returned scores
        ss_tol = 0.0006
        close(name, 'SS between treatments', bt['SS'], ss_bt, ss_tol, ctx)
        close(name, 'SS between subjects', source(tbl, 'Between Subjects')['SS'], ss_bs, ss_tol, ctx)
        close(name, 'SS error', err['SS'], ss_e, ss_tol, ctx)
        close(name, 'SS total', source(tbl, 'Total')['SS'], ss_tot, ss_tol, ctx)
        same(name, 'df', (int(bt['df']), int(err['df'])), (df_bt, df_e), ctx)
        close(name, 'F', bt['F'], f, 0.0006, ctx)
        close(name, 'p', bt['p-value'], stats.f.sf(f, df_bt, df_e), 0.0006, ctx)
        close(name, 'partial eta-squared', eta, ss_bt / (ss_bt + ss_e), 1e-9, ctx)
        if abs(f - crit) > 0.001:
            same(name, 'decision', dec, 'Reject Null' if f > crit else 'Fail to Reject Null', ctx)


def test_pearson():
    name = 'Pearson correlation'
    for seed, alpha, two in SETTINGS:
        ctx = dict(seed=seed, alpha=alpha, two_tailed=two)
        x, y, res = eng['generate_pearson_correlation'](
            x_mean=50, x_std=10, y_mean=100, y_std=15, n=8 + seed % 25, ro=0,
            tx_effect_switch=True, tx_effect=5, noise_sd=6 + seed, alpha=alpha, seed=seed, two_tailed=two)
        r = rows(res); runs[name] += 1
        ref = stats.pearsonr(x, y)
        rr, df = float(ref.statistic), len(x) - 2
        t = rr * math.sqrt(df) / math.sqrt(1 - rr * rr)
        crit = crit_t(alpha, df, two)
        same(name, 'df', int(r['df']), df, ctx)
        close(name, 'r vs scipy.pearsonr', r['r'], rr, 0.006, ctx)
        close(name, 'r-squared', r['r_squared'], rr * rr, 0.006, ctx)
        close(name, 't', r['t'], t, max(0.006, 0.002 * abs(t)), ctx)
        close(name, 't critical', r['t_critical'], crit, 0.006, ctx)
        if abs(abs(t) - crit) > 0.02:
            same(name, 'decision', r['Decision'], decision(t, crit), ctx)


def test_regression():
    name = 'simple regression'
    for seed in SEEDS:
        ctx = dict(seed=seed)
        y, x, tbl, eq = eng['generate_1_predictor_regression'](
            x_mean=50, x_std=10, y_mean=100, y_std=15, n=8 + seed % 25,
            tx_effect_switch=True, tx_effect=5, noise_sd=4 + seed, alpha=0.05, seed=seed)
        runs[name] += 1
        ref = stats.linregress(x, y)
        n = len(x)
        y = np.asarray(y, dtype=float)
        ss_tot = ((y - y.mean()) ** 2).sum()
        ss_reg = ref.rvalue ** 2 * ss_tot
        f = (ss_reg / 1) / ((ss_tot - ss_reg) / (n - 2))
        reg, resid, tot = source(tbl, 'Regression'), source(tbl, 'Residual'), source(tbl, 'Total')
        close(name, 'SS regression', reg['SS'], ss_reg, 1e-6 * max(1, ss_tot), ctx)
        close(name, 'SS residual', resid['SS'], ss_tot - ss_reg, 1e-6 * max(1, ss_tot), ctx)
        close(name, 'SS total', tot['SS'], ss_tot, 1e-6 * max(1, ss_tot), ctx)
        same(name, 'df', (int(reg['df']), int(resid['df']), int(tot['df'])), (1, n - 2, n - 1), ctx)
        close(name, 'F vs scipy.linregress', reg['F'], f, 1e-6 * max(1, f), ctx)
        # equation string looks like "Y=1.49X+35.6" or "Y=1.49X-15.4"
        match = re.fullmatch(r'Y=(-?[\d.eE+-]+?)X([+-][\d.eE+-]+)', eq)
        if not match:
            failures[name].append(('equation format', eq, 'Y=bX+a or Y=bX-a', ctx))
            continue
        slope, intercept = float(match.group(1)), float(match.group(2))
        close(name, 'slope vs scipy.linregress', slope, ref.slope, 1e-6, ctx)
        close(name, 'intercept vs scipy.linregress', intercept, ref.intercept, 1e-6 * max(1, abs(ref.intercept)), ctx)
        crit = stats.f.ppf(0.95, 1, n - 2)
        if abs(f - crit) > 0.006:
            same(name, 'decision', reg['Decision'], 'Reject Null' if f > crit else 'Fail to Reject Null', ctx)


TESTS = [test_z, test_t, test_ind, test_rep, test_anova_oneway, test_anova_twoway, test_rma, test_pearson, test_regression]


def main():
    bad = 0
    for test in TESTS:
        before = set(runs)
        try:
            test()
        except Exception as exc:  # an engine crash is a failure, not a test-harness error
            name = test.__name__
            runs[name] += 0
            failures[name].append(('crashed', repr(exc), 'no exception', {}))
        for name in [n for n in runs if n not in before] or [test.__name__]:
            fails = failures.get(name, [])
            bad += len(fails)
            print(f'{"ok  " if not fails else "FAIL"}  {name:<26} {runs[name]:>4} runs, {len(fails)} mismatches')
            kinds = defaultdict(list)
            for what, got, want, ctx in fails:
                kinds[what].append((got, want, ctx))
            for what, items in kinds.items():
                got, want, ctx = items[0]
                print(f'        {what}: {len(items)}x, e.g. engine {got} vs reference {want}  {ctx}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
