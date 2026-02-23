import { py } from './init.ts';
import { gv, seed, tail, txSwitch } from './ui.ts';
import type {
  ZTestResult,
  TTestResult,
  IndTTestResult,
  RepTTestResult,
  AnovaResult,
  PearsonResult,
  RegressionResult,
} from './types.ts';

export function runZTest(): ZTestResult {
  return py(`
_s = ${seed('z-seed')}
_d, _r = generate_z_score_problem(
    population_mean=${gv('z-pop-mean')},
    population_std=${gv('z-pop-std')},
    n=${gv('z-n')}, seed=_s,
    tx_effect_switch=${txSwitch('z-tx-switch')},
    tx_effect=${gv('z-tx-effect')},
    noise_sd=${gv('z-noise-sd')},
    alpha=${gv('z-alpha')},
    two_tailed=${tail('z-tail')}
)
_to_json({'type':'z_test','dataset':_d.tolist(),'results':_r.to_dict(orient='records')})
`) as ZTestResult;
}

export function runTTest(): TTestResult {
  return py(`
_s = ${seed('t-seed')}
_d, _r = generate_t_test_problem(
    population_mean=${gv('t-pop-mean')},
    population_std=${gv('t-pop-std')},
    n=${gv('t-n')}, seed=_s,
    tx_effect_switch=${txSwitch('t-tx-switch')},
    tx_effect=${gv('t-tx-effect')},
    noise_sd=${gv('t-noise-sd')},
    alpha=${gv('t-alpha')},
    two_tailed=${tail('t-tail')}
)
_to_json({'type':'t_test','dataset':_d.tolist(),'results':_r.to_dict(orient='records')})
`) as TTestResult;
}

export function runIndependentTTest(): IndTTestResult {
  return py(`
_s1 = ${seed('ind-seed1')}
_s2 = ${seed('ind-seed2')}
_d1, _d2, _r = generate_independent_t_test_problem(
    population_mean1=${gv('ind-pop-mean1')},
    population_sd1=${gv('ind-pop-sd1')},
    n1=${gv('ind-n1')}, seed1=_s1,
    population_mean2=${gv('ind-pop-mean2')},
    population_sd2=${gv('ind-pop-sd2')},
    n2=${gv('ind-n2')}, seed2=_s2,
    alpha=${gv('ind-alpha')},
    two_tailed=${tail('ind-tail')}
)
_to_json({'type':'independent_t_test','dataset1':_d1.tolist(),'dataset2':_d2.tolist(),'results':_r.to_dict(orient='records')})
`) as IndTTestResult;
}

export function runRepeatedTTest(): RepTTestResult {
  return py(`
_s = ${seed('rep-seed')}
_pre, _post, _r = generate_repeated_t_test_problem(
    population_mean=${gv('rep-pop-mean')},
    population_std=${gv('rep-pop-std')},
    n=${gv('rep-n')}, seed=_s,
    tx_effect=${gv('rep-tx-effect')},
    noise_sd=${gv('rep-noise-sd')},
    alpha=${gv('rep-alpha')},
    two_tailed=${tail('rep-tail')}
)
_to_json({'type':'repeated_t_test','pre':_pre.tolist(),'post':_post.tolist(),'results':_r.to_dict(orient='records')})
`) as RepTTestResult;
}

export function runANOVA(): AnovaResult {
  const raw = gv('anova-factors').replace(/"/g, '').replace(/\n/g, '');
  return py(`
_factors = {}
for _part in "${raw}".split(","):
    _part = _part.strip()
    if ":" in _part:
        _name, _lvl = _part.split(":")
        _factors[_name.strip()] = int(_lvl.strip())
_s = ${seed('anova-seed')}
_ds, _tbl = generate_Independent_ANOVA(
    factors_dictionary=_factors,
    n=${gv('anova-n')},
    mean=${gv('anova-mean')},
    std=${gv('anova-std')},
    effect_size=${gv('anova-effect')},
    alpha=${gv('anova-alpha')},
    seed=_s
)
_to_json({'type':'anova','dataset':_ds.to_dict(orient='records'),'table':_tbl.to_dict(orient='records')})
`) as AnovaResult;
}

export function runPearson(): PearsonResult {
  return py(`
_s = ${seed('pear-seed')}
_x, _y, _r = generate_pearson_correlation(
    x_mean=${gv('pear-x-mean')},
    x_std=${gv('pear-x-std')},
    y_mean=${gv('pear-y-mean')},
    y_std=${gv('pear-y-std')},
    n=${gv('pear-n')},
    ro=${gv('pear-ro')},
    tx_effect_switch=${txSwitch('pear-tx-switch')},
    tx_effect=${gv('pear-tx-effect')},
    noise_sd=${gv('pear-noise-sd')},
    alpha=${gv('pear-alpha')},
    seed=_s,
    two_tailed=${tail('pear-tail')}
)
_to_json({'type':'pearson','x_data':_x.tolist(),'y_data':_y.tolist(),'results':_r.to_dict(orient='records')})
`) as PearsonResult;
}

export function runRegression(): RegressionResult {
  return py(`
_s = ${seed('reg-seed')}
_y, _x, _tbl, _eq = generate_1_predictor_regression(
    x_mean=${gv('reg-x-mean')},
    x_std=${gv('reg-x-std')},
    y_mean=${gv('reg-y-mean')},
    y_std=${gv('reg-y-std')},
    n=${gv('reg-n')},
    tx_effect_switch=${txSwitch('reg-tx-switch')},
    tx_effect=${gv('reg-tx-effect')},
    noise_sd=${gv('reg-noise-sd')},
    alpha=${gv('reg-alpha')},
    seed=_s
)
_to_json({'type':'regression','y_data':_y.tolist(),'x_data':_x.tolist(),'table':_tbl.to_dict(orient='records'),'equation':_eq})
`) as RegressionResult;
}
