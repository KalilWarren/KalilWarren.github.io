"""Cross-check the student practice answer keys against SciPy.

Reads the JSON written by tests/generate.mjs and, for every generated problem,
recomputes the answers independently from the values a student is shown.
A problem fails when the stored key differs from the SciPy result by more
than the tolerance the page itself uses when grading, or when a student who
fills in a table correctly from the displayed values would be marked wrong.

Usage: python3 tests/check_student.py problems.json
"""
import json
import math
import sys
from collections import defaultdict

from scipy import stats

# Grading tolerances used by the student page (see gradeAnswers in each module)
TOL_STAT = 0.02    # z, t, d, r-squared, eta-squared
TOL_CRIT = 0.005   # critical values
TOL_CI = 0.05      # confidence interval bounds
TOL_CELL = 0.05    # ANOVA / regression table cells

failures = defaultdict(list)
checked = defaultdict(int)


def fail(module, what, problem, got, want):
    failures[module].append((what, got, want, problem))


def close(module, what, problem, got, want, tol):
    if got is None or want is None or not math.isfinite(got) or abs(got - want) > tol + 1e-9:
        fail(module, what, problem, got, want)


def crit_t(alpha, df, tail):
    return stats.t.ppf(1 - alpha / 2, df) if tail == 'two' else stats.t.ppf(1 - alpha, df)


def decide(stat, crit, tail):
    if tail == 'right':
        return 'reject' if stat >= crit else 'fail'
    if tail == 'left':
        return 'reject' if stat <= -crit else 'fail'
    return 'reject' if abs(stat) >= crit else 'fail'


def check_decision(module, p, stat, crit, tail, key):
    """Compare decisions, ignoring cases that sit within rounding of the cutoff."""
    edge = abs(abs(stat) - crit) if tail != 'upper' else abs(stat - crit)
    if edge <= 0.011:
        return
    want = ('reject' if stat >= crit else 'fail') if tail == 'upper' else decide(stat, crit, tail)
    if key != want:
        fail(module, 'decision', p, key, want)


# ── Narrative problems: everything is recomputed from the displayed givens ──

def check_z(p):
    m = 'ztest'
    se = p['sigma'] / math.sqrt(p['n'])
    z = (p['xbar'] - p['mu0']) / se
    crit = stats.norm.ppf(1 - p['alpha'] / 2) if p['tail'] == 'two' else stats.norm.ppf(1 - p['alpha'])
    close(m, 'z', p, p['z_true'], z, TOL_STAT)
    close(m, 'z critical', p, p['zcrit_mag'], crit, TOL_CRIT)
    close(m, "Cohen's d", p, p['d_true'], (p['xbar'] - p['mu0']) / p['sigma'], TOL_STAT)
    check_decision(m, p, z, crit, p['tail'], p['decision_true'])


def check_t(p):
    m = 'ttest'
    df = p['n'] - 1
    se = p['s'] / math.sqrt(p['n'])
    t = (p['xbar'] - p['mu0']) / se
    crit = crit_t(p['alpha'], df, p['tail'])
    crit2 = stats.t.ppf(1 - p['alpha'] / 2, df)
    if p['df'] != df:
        fail(m, 'df', p, p['df'], df)
    close(m, 't', p, p['t_true'], t, TOL_STAT)
    close(m, 't critical', p, p['tcrit_mag'], crit, TOL_CRIT)
    close(m, "Cohen's d", p, p['d_true'], (p['xbar'] - p['mu0']) / p['s'], TOL_STAT)
    close(m, 'r-squared', p, p['r_sq'], t * t / (t * t + df), 0.01)
    close(m, 'CI lower', p, p['ci_lower'], p['xbar'] - crit2 * se, TOL_CI)
    close(m, 'CI upper', p, p['ci_upper'], p['xbar'] + crit2 * se, TOL_CI)
    check_decision(m, p, t, crit, p['tail'], p['decision_true'])


def check_ind(p):
    m = 'indtest'
    df = p['n1'] + p['n2'] - 2
    sp = math.sqrt((p['SS1'] + p['SS2']) / df)
    se = sp * math.sqrt(1 / p['n1'] + 1 / p['n2'])
    diff = p['M1'] - p['M2']
    t = diff / se
    crit = crit_t(p['alpha'], df, p['tail'])
    if p['df'] != df:
        fail(m, 'df', p, p['df'], df)
    close(m, 't', p, p['t_true'], t, TOL_STAT)
    close(m, 't critical', p, p['tcritMag'], crit, TOL_CRIT)
    close(m, "Cohen's d", p, p['d_true'], diff / sp, TOL_STAT)
    close(m, 'r-squared', p, p['r2_true'], t * t / (t * t + df), TOL_STAT)
    if p['ci_lower'] is not None:
        close(m, 'CI lower', p, p['ci_lower'], diff - crit * se, TOL_CI)
    if p['ci_upper'] is not None:
        close(m, 'CI upper', p, p['ci_upper'], diff + crit * se, TOL_CI)
    check_decision(m, p, t, crit, p['tail'], p['decision_true'])
    # SciPy's own pooled-variance test, from the same summary statistics
    s1 = math.sqrt(p['SS1'] / (p['n1'] - 1))
    s2 = math.sqrt(p['SS2'] / (p['n2'] - 1))
    ref = stats.ttest_ind_from_stats(p['M1'], s1, p['n1'], p['M2'], s2, p['n2'], equal_var=True)
    close(m, 't vs scipy.ttest_ind_from_stats', p, p['t_true'], float(ref.statistic), TOL_STAT)


def check_rep(p):
    m = 'reptest'
    df = p['n'] - 1
    se = p['SDD'] / math.sqrt(p['n'])
    t = p['MD'] / se
    crit = crit_t(p['alpha'], df, p['tail'])
    if p['df'] != df:
        fail(m, 'df', p, p['df'], df)
    close(m, 't', p, p['t_true'], t, TOL_STAT)
    close(m, 't critical', p, p['tcritMag'], crit, TOL_CRIT)
    close(m, "Cohen's d", p, p['dz_true'], p['MD'] / p['SDD'], TOL_STAT)
    close(m, 'r-squared', p, p['r2_true'], t * t / (t * t + df), TOL_STAT)
    close(m, 'CI lower', p, p['ci_lower'], p['MD'] - crit * se, TOL_CI)
    close(m, 'CI upper', p, p['ci_upper'], p['MD'] + crit * se, TOL_CI)
    check_decision(m, p, t, crit, p['tail'], p['decision_true'])


def check_pearson(p):
    m = 'pearsontest'
    r, df = p['r_display'], p['n'] - 2
    t = r * math.sqrt(df) / math.sqrt(1 - r * r)
    crit = crit_t(p['alpha'], df, p['tail'])
    if p['df'] != df:
        fail(m, 'df', p, p['df'], df)
    close(m, 't', p, p['t_true'], t, TOL_STAT)
    close(m, 't critical', p, p['tcritMag'], crit, TOL_CRIT)
    close(m, 'r-squared', p, p['r_squared_true'], r * r, TOL_STAT)
    check_decision(m, p, t, crit, p['tail'], p['decision_true'])


# ── Table problems: the stored table must be a valid ANOVA table ──

def rel(module, what, p, got, want):
    """Exact identities between unrounded table cells."""
    if abs(got - want) > 1e-6 * max(1.0, abs(want)):
        fail(module, what, p, got, want)


def check_anova(p):
    m = 'anovatest'
    t = p['table']
    if (t['DFB'], t['DFW'], t['DFT']) != (p['k'] - 1, p['N'] - p['k'], p['N'] - 1):
        fail(m, 'degrees of freedom', p, (t['DFB'], t['DFW'], t['DFT']), (p['k'] - 1, p['N'] - p['k'], p['N'] - 1))
    if p['N'] != p['k'] * p['nPerCell']:
        fail(m, 'N', p, p['N'], p['k'] * p['nPerCell'])
    rel(m, 'SST = SSB + SSW', p, t['SST'], t['SSB'] + t['SSW'])
    rel(m, 'MSB', p, t['MSB'], t['SSB'] / t['DFB'])
    rel(m, 'MSW', p, t['MSW'], t['SSW'] / t['DFW'])
    rel(m, 'F', p, t['F'], t['MSB'] / t['MSW'])
    crit = stats.f.ppf(1 - p['alpha'], t['DFB'], t['DFW'])
    close(m, 'F critical', p, p['Fcrit'], crit, TOL_CRIT)
    close(m, 'eta-squared', p, p['eta2'], t['SSB'] / t['SST'], TOL_STAT)
    check_decision(m, p, t['F'], crit, 'upper', p['decision_true'])
    solve_anova(p)


def check_twoway(p):
    m = 'twowaytest'
    t = p['table']
    a, b, n = p['aLevels'], p['bLevels'], p['nPerCell']
    want_df = (a - 1, b - 1, (a - 1) * (b - 1), a * b * (n - 1), a * b * n - 1)
    got_df = (t['DFA'], t['DFB'], t['DFAB'], t['DFE'], t['DFT'])
    if got_df != want_df:
        fail(m, 'degrees of freedom', p, got_df, want_df)
    rel(m, 'SST = SSA + SSB + SSAB + SSE', p, t['SST'], t['SSA'] + t['SSB'] + t['SSAB'] + t['SSE'])
    rel(m, 'MSE', p, t['MSE'], t['SSE'] / t['DFE'])
    for eff, others in (('A', ('B', 'AB')), ('B', ('A', 'AB')), ('AB', ('A', 'B'))):
        rel(m, f'MS{eff}', p, t[f'MS{eff}'], t[f'SS{eff}'] / t[f'DF{eff}'])
        rel(m, f'F{eff}', p, t[f'F{eff}'], t[f'MS{eff}'] / t['MSE'])
        crit = stats.f.ppf(1 - p['alpha'], t[f'DF{eff}'], t['DFE'])
        close(m, f'F critical {eff}', p, p['Fcrit'][eff], crit, TOL_CRIT)
        # partial eta-squared, in the SS_Total-minus form the page teaches
        partial = t[f'SS{eff}'] / (t['SST'] - t[f'SS{others[0]}'] - t[f'SS{others[1]}'])
        close(m, f'partial eta-squared {eff}', p, p['eta2'][eff], partial, TOL_STAT)
        check_decision(m, p, t[f'F{eff}'], crit, 'upper', p['decisions'][eff])
    solve_twoway(p)


def check_rma(p):
    m = 'rmatest'
    t = p['table']
    k, n = p['nConditions'], p['nSubjects']
    want_df = (k - 1, n - 1, (k - 1) * (n - 1), k * n - 1)
    got_df = (t['DFBT'], t['DFBS'], t['DFE'], t['DFT'])
    if got_df != want_df:
        fail(m, 'degrees of freedom', p, got_df, want_df)
    rel(m, 'SST = SSBT + SSBS + SSE', p, t['SST'], t['SSBT'] + t['SSBS'] + t['SSE'])
    rel(m, 'MSBT', p, t['MSBT'], t['SSBT'] / t['DFBT'])
    rel(m, 'MSE', p, t['MSE'], t['SSE'] / t['DFE'])
    rel(m, 'F', p, t['F'], t['MSBT'] / t['MSE'])
    crit = stats.f.ppf(1 - p['alpha'], t['DFBT'], t['DFE'])
    close(m, 'F critical', p, p['Fcrit'], crit, TOL_CRIT)
    close(m, 'partial eta-squared', p, p['eta2'], t['SSBT'] / (t['SSBT'] + t['SSE']), TOL_STAT)
    check_decision(m, p, t['F'], crit, 'upper', p['decision_true'])
    solve_rma(p)


def check_reg(p):
    m = 'regtest'
    t = p['table']
    if (t['DFR'], t['DFE'], t['DFT']) != (1, p['n'] - 2, p['n'] - 1):
        fail(m, 'degrees of freedom', p, (t['DFR'], t['DFE'], t['DFT']), (1, p['n'] - 2, p['n'] - 1))
    rel(m, 'SST = SSR + SSE', p, t['SST'], t['SSR'] + t['SSE'])
    rel(m, 'MSR', p, t['MSR'], t['SSR'] / t['DFR'])
    rel(m, 'MSE', p, t['MSE'], t['SSE'] / t['DFE'])
    rel(m, 'F', p, t['F'], t['MSR'] / t['MSE'])
    close(m, 'SS_Y equals SST', p, p['SS_Y'], t['SST'], 0.006)
    crit = stats.f.ppf(1 - p['alpha'], 1, t['DFE'])
    close(m, 'F critical', p, p['Fcrit'], crit, TOL_CRIT)
    close(m, 'R-squared', p, p['R2'], t['SSR'] / t['SST'], TOL_STAT)
    # slope and intercept, from the displayed givens
    b = p['r_display'] * math.sqrt(p['SS_Y'] / p['SS_X'])
    close(m, 'slope b', p, p['b'], b, TOL_CELL)
    close(m, 'intercept a', p, p['a'], p['MY'] - round(b, 2) * p['MX'], TOL_CELL)
    # the displayed r must agree with the table it sits beside
    close(m, 'r-squared vs table R-squared', p, p['r_display'] ** 2, t['SSR'] / t['SST'], TOL_STAT)
    check_decision(m, p, t['F'], crit, 'upper', p['decision_true'])
    solve_reg(p)


# ── Table problems: a student working from the displayed table must be accepted ──
#
# Cells are shown rounded to two decimals. For each difficulty the functions below
# fill in the hidden cells the way a student would, once carrying full precision
# and once rounding every intermediate result to two decimals, and require both
# sets of answers to fall inside the tolerance the grader allows for that cell.

def shown(v):
    """A cell as displayed: two decimals, rounding half up like Math.round."""
    return math.floor(v * 100 + 0.5) / 100


def displayed(table):
    return {k: (v if k.startswith('DF') else shown(v)) for k, v in table.items()}


def check_student_path(module, p, solve):
    key = p['table']
    tol = p.get('tol') or {f: TOL_CELL for f in p['masked']}
    for style, rnd in (('full precision', lambda v: v), ('rounding each step', shown)):
        s = displayed(key)
        solve(s, key, rnd)
        for field in p['masked']:
            if field.startswith('DF'):
                continue
            allowed = tol[field]
            if not math.isfinite(allowed):
                fail(module, f'{p["difficulty"]}: no finite tolerance for {field}', p, allowed, 'finite')
            elif abs(s[field] - key[field]) > allowed + 1e-9:
                fail(module, f'{p["difficulty"]}: correct {field} rejected ({style})', p,
                     round(s[field], 4), f'{key[field]:.4f} within {allowed:.4f}')


def solve_anova(p):
    def solve(s, t, rnd):
        d = p['difficulty']
        if d == 'easy':
            s['MSB'], s['MSW'] = rnd(s['SSB'] / t['DFB']), rnd(s['SSW'] / t['DFW'])
            s['F'] = s['MSB'] / s['MSW']
        elif d == 'medium':
            s['SSW'] = s['SST'] - s['SSB']
            s['MSB'] = rnd(s['SSB'] / t['DFB'])
            s['F'] = s['MSB'] / s['MSW']
        else:
            s['SSB'] = s['MSB'] * t['DFB']
            s['MSW'] = rnd(s['MSB'] / s['F'])
            s['SSW'] = rnd(s['MSW'] * t['DFW'])
            s['SST'] = s['SSB'] + s['SSW']
    check_student_path('anovatest', p, solve)


def solve_twoway(p):
    effects = ('A', 'B', 'AB')
    d = p['difficulty']
    if d != 'hard':
        def solve(s, t, rnd):
            if d == 'easy':
                s['MSE'] = rnd(s['SSE'] / t['DFE'])
            else:
                s['SSE'] = s['SST'] - s['SSA'] - s['SSB'] - s['SSAB']
            for e in effects:
                s[f'MS{e}'] = rnd(s[f'SS{e}'] / t[f'DF{e}'])
                s[f'F{e}'] = s[f'MS{e}'] / s['MSE']
        check_student_path('twowaytest', p, solve)
        return
    # hard: the error mean square can be recovered from any one of the three effects
    for via in effects:
        def solve(s, t, rnd, via=via):
            s['MSE'] = rnd(s[f'MS{via}'] / s[f'F{via}'])
            s['SSE'] = rnd(s['MSE'] * t['DFE'])
            for e in effects:
                s[f'SS{e}'] = s[f'MS{e}'] * t[f'DF{e}']
            s['SST'] = s['SSA'] + s['SSB'] + s['SSAB'] + s['SSE']
        check_student_path('twowaytest', p, solve)


def solve_rma(p):
    def solve(s, t, rnd):
        d = p['difficulty']
        if d == 'easy':
            s['MSBT'], s['MSE'] = rnd(s['SSBT'] / t['DFBT']), rnd(s['SSE'] / t['DFE'])
            s['F'] = s['MSBT'] / s['MSE']
        elif d == 'medium':
            s['SSE'] = s['SST'] - s['SSBT'] - s['SSBS']
            s['MSBT'] = rnd(s['SSBT'] / t['DFBT'])
            s['F'] = s['MSBT'] / s['MSE']
        else:
            s['SSBT'] = s['MSBT'] * t['DFBT']
            s['MSE'] = rnd(s['MSBT'] / s['F'])
            s['SSE'] = rnd(s['MSE'] * t['DFE'])
            s['SST'] = s['SSBT'] + s['SSBS'] + s['SSE']
    check_student_path('rmatest', p, solve)


def solve_reg(p):
    def solve(s, t, rnd):
        d = p['difficulty']
        if d == 'easy':
            s['MSR'], s['MSE'] = s['SSR'], rnd(s['SSE'] / t['DFE'])
            s['F'] = s['MSR'] / s['MSE']
        elif d == 'moderate':
            s['SSE'] = s['SST'] - s['SSR']
            s['MSR'], s['MSE'] = s['SSR'], rnd(s['SSE'] / t['DFE'])
            s['F'] = s['MSR'] / s['MSE']
        else:
            # SS_Y is given beside the table and equals SS_Total
            s['SSR'], s['SST'] = s['MSR'], p['SS_Y']
            s['SSE'] = s['SST'] - s['SSR']
            s['MSE'] = s['SSE'] / t['DFE']
    check_student_path('regtest', p, solve)


CHECKS = {
    'ztest': check_z, 'ttest': check_t, 'indtest': check_ind, 'reptest': check_rep,
    'anovatest': check_anova, 'twowaytest': check_twoway, 'rmatest': check_rma,
    'pearsontest': check_pearson, 'regtest': check_reg,
}


def main(path):
    with open(path, encoding='utf-8') as fh:
        data = json.load(fh)
    missing = set(CHECKS) - set(data)
    if missing:
        print(f'FAIL  no problems generated for: {", ".join(sorted(missing))}')
        return 1
    for module, check in CHECKS.items():
        for problem in data[module]:
            check(problem)
            checked[module] += 1

    bad = 0
    for module in CHECKS:
        n_fail = len({json.dumps(f[3], sort_keys=True) for f in failures[module]})
        bad += n_fail
        status = 'ok  ' if n_fail == 0 else 'FAIL'
        print(f'{status}  {module:<12} {checked[module]:>5} problems, {n_fail} failing')
        kinds = defaultdict(int)
        for what, *_ in failures[module]:
            kinds[what] += 1
        for what, count in sorted(kinds.items(), key=lambda kv: -kv[1]):
            example = next(f for f in failures[module] if f[0] == what)
            print(f'        {what}: {count} mismatches, e.g. key {example[1]} vs SciPy {example[2]}')
            print(f'          {json.dumps(example[3])[:300]}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
