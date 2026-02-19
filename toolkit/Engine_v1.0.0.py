#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Dec  1 19:08:56 2025

@author: kalilwarren
"""

import itertools
import numpy as np
from scipy.stats import norm
from scipy.stats import t
from scipy.stats import f
import pandas as pd

def generate_normal_data(mean=0, std=1, n=100, seed=None, return_df=False):
    """
    Generate a normally distributed dataset with optional summary statistics.

    Parameters
    ----------
    mean : float, optional
        Population mean for the normal distribution. Default is 0.
    std : float, optional
        Population standard deviation. Default is 1.
    n : int, optional
        Number of data points to generate. Default is 100.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.
    return_df : bool, optional
        If True, also returns a DataFrame of descriptive statistics alongside
        the raw data array. Default is False.

    Returns
    -------
    numpy.ndarray
        Array of rounded normally distributed values.
    pandas.DataFrame (only if return_df=True)
        Summary table with N, population parameters, sample mean, SD, and variance.
    """
    if seed is not None:
        np.random.seed(seed)
    data = np.random.normal(loc=mean, scale=std, size=n)
    sample_mean = np.mean(data)
    sample_std = np.std(data, ddof=1)
    sample_variance = sample_std ** 2
    
    df_out = pd.DataFrame({
    "Statistic": [
        "N",
        "Population Mean",
        "Population SD",
        "Sample Mean",
        "Sample SD",
        "Sample Variance"
    ],
    "Value": [
        n,
        round(mean, 2),
        round(std, 2),
        round(sample_mean, 2),
        round(sample_std, 2),
        round(sample_variance, 2)
    ]
    })

    if return_df == True:
        return np.round(data), df_out
    else:
        return np.round(data)   # round to 1 decimal place

def z_score_tranformation(data, rescale=False, new_mean=100, new_std=15):
    """
    Transform a dataset into z-scores, with optional rescaling to a new scale.

    Parameters
    ----------
    data : array-like
        The raw dataset to transform.
    rescale : bool, optional
        If True, rescales the z-scores to a new distribution with a specified
        mean and standard deviation (e.g., IQ scale). Default is False.
    new_mean : float, optional
        Target mean when rescaling. Default is 100.
    new_std : float, optional
        Target standard deviation when rescaling. Default is 15.

    Returns
    -------
    numpy.ndarray
        Array of z-scores (or rescaled scores) rounded to 3 decimal places.
    """
    z_scores = (data - np.mean(data)) / np.std(data,ddof=1)
    if rescale == True:
        z_scores = z_scores * new_std + new_mean
    return np.round(z_scores, 3)

def z_probability(lower=None, upper=None):
    """
    Compute probabilities for a standard normal Z.

    Parameters
    ----------
    lower : float or None
        Lower bound (exclusive). Use None for -inf.
    upper : float or None
        Upper bound (exclusive). Use None for +inf.

    Returns
    -------
    float
        Probability P(lower < Z < upper)
    """
    if lower is None and upper is None:
        raise ValueError("At least one of lower or upper must be specified.")

    if lower is None:
        return norm.cdf(upper)

    if upper is None:
        return 1 - norm.cdf(lower)

    if lower >= upper:
        raise ValueError("lower must be less than upper.")

    return norm.cdf(upper) - norm.cdf(lower)


def _apply_treatment(pre_scores, effect=5, noise_sd=3):
    """
    Simulate a treatment effect by shifting scores and adding random noise.

    Adds a fixed treatment effect plus normally distributed noise to each
    score, mimicking a pre-to-post experimental manipulation.

    Parameters
    ----------
    pre_scores : array-like
        Baseline scores before the treatment.
    effect : float, optional
        The mean treatment effect to add to each score. Default is 5.
    noise_sd : float, optional
        Standard deviation of the random noise applied on top of the effect.
        Default is 3.

    Returns
    -------
    numpy.ndarray
        Array of post-treatment scores rounded to 1 decimal place.
    """
    noise = np.random.normal(loc=0, scale=noise_sd, size=len(pre_scores))
    post_scores = pre_scores + effect + noise
    return np.round(post_scores, 1)

def _z_critical(alpha=0.05, two_tailed=True):
    """
    Compute the critical Z value for a given alpha level and tail type.

    Parameters
    ----------
    alpha : float, optional
        Significance level. Default is 0.05.
    two_tailed : bool, optional
        If True, returns the two-tailed critical value; otherwise one-tailed.
        Default is True.

    Returns
    -------
    float
        The positive critical Z value.
    """
    if two_tailed:
        return norm.ppf(1 - alpha/2)
    else:
        return norm.ppf(1 - alpha)

def _t_critical(df, alpha=0.05, two_tailed=True):
    """
    Compute the critical t value for a given degrees of freedom and alpha level.

    Parameters
    ----------
    df : int
        Degrees of freedom for the t distribution.
    alpha : float, optional
        Significance level. Default is 0.05.
    two_tailed : bool, optional
        If True, returns the two-tailed critical value; otherwise one-tailed.
        Default is True.

    Returns
    -------
    float
        The positive critical t value.
    """
    if two_tailed:
        return t.ppf(1 - alpha/2, df)
    else:
        return t.ppf(1 - alpha, df)

def _f_critical(df_Between, df_Within, alpha=0.05):
    """
    Compute the critical F value for a given pair of degrees of freedom.

    Parameters
    ----------
    df_Between : int
        Numerator degrees of freedom (between-groups / regression).
    df_Within : int
        Denominator degrees of freedom (within-groups / residual).
    alpha : float, optional
        Significance level. Default is 0.05.

    Returns
    -------
    float
        The critical F value at the specified alpha level.
    """
    return f.ppf(1 - alpha, df_Between, df_Within)

def _sum_of_squares(x):
    """
    Compute the sum of squared deviations from the mean (SS).

    Parameters
    ----------
    x : array-like
        Dataset to compute SS for.

    Returns
    -------
    float
        Sum of squared deviations: sum((x - mean(x))^2).
    """
    return np.sum((x - np.mean(x))**2)

def _sum_product(x, y):
    """
    Compute the sum of products (SP) of two variables' deviations from their means.

    Used in correlation and regression calculations as SP_XY.

    Parameters
    ----------
    x : array-like
        First variable dataset.
    y : array-like
        Second variable dataset.

    Returns
    -------
    float
        Sum of cross-products: sum((x - mean(x)) * (y - mean(y))).
    """
    return np.sum((x-np.mean(x))*(y-np.mean(y)))

def _compute_factor_level_SS(df, C, dv="Scores"):
    """
    Compute the sum of squares for each main factor in a multi-factor ANOVA.

    For each factor, aggregates group totals and uses the correction factor C
    to compute the between-group SS, following the computational formula:
    SS_factor = sum(T_j^2 / n_j) - C.

    Parameters
    ----------
    df : pandas.DataFrame
        Long-format DataFrame containing the dependent variable and factor columns.
    C : float
        Correction factor: (grand total)^2 / N.
    dv : str, optional
        Name of the dependent variable column. Default is "Scores".

    Returns
    -------
    dict
        Dictionary mapping each factor name to its sum of squares value.
    """
    factor_cols = [col for col in df.columns if col !=dv]
    
    ss_main={}
    
    for factor in factor_cols:
        T = df.groupby(factor)[dv].sum()
        n = df.groupby(factor)[dv].count()
        ss_factor = (T**2 / n).sum() - C
        ss_main[factor] = ss_factor

    return ss_main


def _build_independent_anova_table(
    factor_SS,
    factor_df,
    SS_Within,
    df_Within,
    SS_Total,
    SS_Between=None,
    df_Between=None,
    SS_Interaction=None,
    df_Interaction=None,
    alpha=0.05
):
    """
    Construct a pandas DataFrame ANOVA summary table from precomputed SS values.

    Assembles rows for each main effect, an optional interaction term, the
    Within-groups (error) term, and the Total row. Computes MS, F, and p-values
    for each effect using the Within-groups MS as the error term.

    Parameters
    ----------
    factor_SS : dict
        Mapping of factor name to its sum of squares.
    factor_df : dict
        Mapping of factor name to its degrees of freedom.
    SS_Within : float
        Within-groups (error) sum of squares.
    df_Within : int
        Within-groups degrees of freedom.
    SS_Total : float
        Total sum of squares.
    SS_Between : float or None, optional
        Total between-groups SS (used as a row header in factorial designs).
    df_Between : int or None, optional
        Total between-groups degrees of freedom.
    SS_Interaction : float or None, optional
        Interaction sum of squares for factorial designs. Default is None.
    df_Interaction : int or None, optional
        Interaction degrees of freedom. Default is None.
    alpha : float, optional
        Significance level (currently unused in table construction). Default is 0.05.

    Returns
    -------
    pandas.DataFrame
        ANOVA summary table with columns: Source, SS, df, MS, F, p-value.
    """

    rows = []

    MS_Within = SS_Within / df_Within

    for factor in factor_SS:
        SS = factor_SS[factor]
        df_num = factor_df[factor]
        MS = SS / df_num
        F_value = MS / MS_Within
        p_value = 1 - f.cdf(F_value, df_num, df_Within)

        rows.append({
            "Source": factor,
            "SS": SS,
            "df": df_num,
            "MS": MS,
            "F": F_value,
            "p-value": p_value
        })
        
    if SS_Interaction is not None and df_Interaction is not None:
        MS_Int = SS_Interaction / df_Interaction
        F_Int = MS_Int / MS_Within
        p_Int = 1 - f.cdf(F_Int, df_Interaction, df_Within)

        rows.append({
            "Source": "Interaction",
            "SS": SS_Interaction,
            "df": df_Interaction,
            "MS": MS_Int,
            "F": F_Int,
            "p-value": p_Int
        })
        rows = [{
            "Source": "Between",
            "SS": SS_Between,
            "df": df_Between,
            "MS": None,
            "F": None,
            "p-value": None
            }] + rows

    rows.append({
        "Source": "Within",
        "SS": SS_Within,
        "df": df_Within,
        "MS": MS_Within,
        "F": None,
        "p-value": None
    })

    df_total = df_Within + sum(factor_df.values())
    if df_Interaction is not None:
        df_total += df_Interaction

    rows.append({
        "Source": "Total",
        "SS": SS_Total,
        "df": df_total,
        "MS": None,
        "F": None,
        "p-value": None
    })

    return pd.DataFrame(rows)


def generate_z_score_problem(dataset=None,
                            population_mean=0, population_std=15, n=10, seed=None,
                            tx_effect_switch=True, tx_effect=5, noise_sd=3,
                            alpha=0.05, two_tailed=True):
    """
    Generate a Z-test practice problem with a synthetic dataset and results.

    If no dataset is provided, generates a normally distributed sample and
    applies a simulated treatment effect. Computes the one-sample Z statistic
    using the known population standard deviation, along with the critical value,
    confidence interval, and Cohen's d effect size.

    Parameters
    ----------
    dataset : array-like or None, optional
        Pre-existing dataset to analyze. If None, data is generated from
        the specified population parameters. Default is None.
    population_mean : float, optional
        Null hypothesis population mean (mu_0). Default is 0.
    population_std : float, optional
        Known population standard deviation (sigma). Default is 15.
    n : int, optional
        Sample size for data generation. Default is 10.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.
    tx_effect : float, optional
        Mean treatment effect applied to generated data. Default is 5.
    noise_sd : float, optional
        Standard deviation of noise added to the treatment effect. Default is 3.
    alpha : float, optional
        Significance level. Default is 0.05.
    two_tailed : bool, optional
        If True, performs a two-tailed test. Default is True.

    Returns
    -------
    numpy.ndarray
        The dataset used in the analysis.
    pandas.DataFrame
        Results table with statistics: N, population mean/SD, sample mean,
        standard error, Z score, critical Z, decision, Cohen's d, and CI bounds.
    """
    if dataset is None:
        dataset = generate_normal_data(population_mean, population_std, n, seed)
    if tx_effect_switch == True:
        dataset = _apply_treatment(dataset, tx_effect, noise_sd)

    n = len(dataset)
    sample_mean = np.mean(dataset)
    standard_error = population_std / np.sqrt(n)
    z = (sample_mean - population_mean) / standard_error
    cohen_d = (sample_mean - population_mean) / population_std
    
    z_critical =_z_critical(alpha, two_tailed)
    
    CI_Upper = sample_mean + z_critical * standard_error
    CI_Lower = sample_mean - z_critical * standard_error
    
    if abs(z) > z_critical:
        results = "Reject Null"
    else:
        results = "Fail to Reject Null"
    
    df_out = pd.DataFrame({
        "Statistic": ["N", "Population Mean", "Population SD", "Sample Mean", "Standard Error",
                      "Z Score", "Z_Critical", "Decision","Cohen's d", "95% CI Upper",
                      "95% CI Lower"],
        "Value": [n,
                  round(population_mean, 2),
                  round(population_std, 2),
                  round(sample_mean, 2),
                  round(standard_error, 2),
                  round(z, 2),
                  z_critical,
                  results,
                  round(cohen_d, 2),
                  round(CI_Upper, 2),
                  round(CI_Lower, 2)]
        
        })
    return dataset, df_out  

def generate_t_test_problem(dataset=None,
                            population_mean=0, population_std=15, n=10, seed=None,
                            tx_effect_switch=True, tx_effect=5, noise_sd=3,
                            alpha=0.05, two_tailed=True):
    """
    Generate a one-sample t-test practice problem with a synthetic dataset and results.

    If no dataset is provided, generates a normally distributed sample and
    applies a simulated treatment effect. Computes the one-sample t statistic
    using the sample standard deviation (not the population SD), along with
    degrees of freedom, critical value, confidence interval, Cohen's d, and r-squared.

    Parameters
    ----------
    dataset : array-like or None, optional
        Pre-existing dataset to analyze. If None, data is generated from
        the specified population parameters. Default is None.
    population_mean : float, optional
        Null hypothesis population mean (mu_0). Default is 0.
    population_std : float, optional
        Population standard deviation used only for data generation. Default is 15.
    n : int, optional
        Sample size for data generation. Default is 10.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.
    tx_effect : float, optional
        Mean treatment effect applied to generated data. Default is 5.
    noise_sd : float, optional
        Standard deviation of noise added to the treatment effect. Default is 3.
    alpha : float, optional
        Significance level. Default is 0.05.
    two_tailed : bool, optional
        If True, performs a two-tailed test. Default is True.

    Returns
    -------
    numpy.ndarray
        The dataset used in the analysis.
    pandas.DataFrame
        Results table with statistics: N, sample SD/mean, standard error,
        t score, critical t, decision, Cohen's d, r-squared, and CI bounds.
    """
    if dataset is None:
        dataset = generate_normal_data(population_mean, population_std, n, seed)
    if tx_effect_switch == True:
        dataset = _apply_treatment(dataset, tx_effect, noise_sd)
    
    sample_std = np.std(dataset,ddof=1)
    sample_mean = np.mean(dataset)
    standard_error = sample_std / np.sqrt(n)
    t = (sample_mean - population_mean) / standard_error
    cohen_d = (sample_mean - population_mean) / sample_std
    df = n - 1
    r_squared = (t**2) / (t**2 + df)

    t_critical =_t_critical(df, alpha, two_tailed)

    CI_Upper = sample_mean + t_critical * standard_error
    CI_Lower = sample_mean - t_critical * standard_error
    
    if abs(t) > t_critical:
        results = "Reject Null"
    else:
        results = "Fail to Reject Null"
    
    df_out = pd.DataFrame({
        "Statistic": ["N", "Sample SD", "Sample Mean", "Standard Error",
                      "t Score", "t_Critical", "Decision","Cohen's d", "R-Squared",
                      "95% CI Upper", "95% CI Lower"],
        "Value": [n,
                  round(sample_std, 2),
                  round(sample_mean, 2),
                  round(standard_error, 2),
                  round(t, 2),
                  t_critical,
                  results,
                  round(cohen_d, 2),
                  r_squared,
                  round(CI_Upper, 2),
                  round(CI_Lower, 2)]
        
        })
    return dataset, df_out  

def generate_independent_t_test_problem(
        dataset1=None, dataset2=None,
        population_mean1=10, population_sd1=15, n1=10, seed1=None,
        population_mean2=20, population_sd2=15, n2=10, seed2=None,
        alpha=0.05, two_tailed=True):
    """
    Generate an independent-samples t-test practice problem with two synthetic datasets.

    If datasets are not provided, two independent groups are generated from their
    respective population parameters. Uses pooled variance to compute the standard
    error, supporting unequal sample sizes. Reports sum of squares, pooled variance,
    the t statistic, Cohen's d, r-squared, and confidence interval for the
    difference between means.

    Parameters
    ----------
    dataset1 : array-like or None, optional
        Pre-existing data for group 1. If None, generated from population parameters.
    dataset2 : array-like or None, optional
        Pre-existing data for group 2. If None, generated from population parameters.
    population_mean1 : float, optional
        Population mean for group 1 data generation. Default is 10.
    population_sd1 : float, optional
        Population standard deviation for group 1. Default is 15.
    n1 : int, optional
        Sample size for group 1. Default is 10.
    seed1 : int or None, optional
        Random seed for group 1 data generation. Default is None.
    population_mean2 : float, optional
        Population mean for group 2 data generation. Default is 20.
    population_sd2 : float, optional
        Population standard deviation for group 2. Default is 15.
    n2 : int, optional
        Sample size for group 2. Default is 10.
    seed2 : int or None, optional
        Random seed for group 2 data generation. Default is None.
    alpha : float, optional
        Significance level. Default is 0.05.
    two_tailed : bool, optional
        If True, performs a two-tailed test. Default is True.

    Returns
    -------
    numpy.ndarray
        Dataset for group 1.
    numpy.ndarray
        Dataset for group 2.
    pandas.DataFrame
        Results table with per-group and combined statistics: N, SD, mean, df,
        SS, pooled sum-of-product, standard error, t score, critical t, decision,
        Cohen's d, r-squared, and CI bounds for the mean difference.
    """
    if dataset1 is None:
        dataset1 = generate_normal_data(population_mean1, population_sd1, n1, seed1)
    if dataset2 is None:
        dataset2 = generate_normal_data(population_mean2, population_sd2, n2, seed2)
    sample_std1 = np.std(dataset1,ddof=1)
    sample_mean1 = np.mean(dataset1)
    sample_std2 = np.std(dataset2,ddof=1)
    sample_mean2 = np.mean(dataset2)
    df1 = n1 - 1
    df2 = n2 - 1
    df = df1 + df2
    sum_of_squares1 = _sum_of_squares(dataset1)
    sum_of_squares2 = _sum_of_squares(dataset2)
    sum_product = (sum_of_squares1 + sum_of_squares2) / (df1 + df2)
    standard_error = np.sqrt((sum_product / n1) + (sum_product / n2))
    t = (sample_mean1 - sample_mean2) / standard_error
    cohen_d = (sample_mean1 - sample_mean2) / np.sqrt(sum_product)
    r_squared = (t**2) / (t**2 + df)
    
    t_critical =_t_critical(df, alpha, two_tailed)
       
    CI_Upper = (sample_mean1 - sample_mean2) + t_critical * standard_error
    CI_Lower = (sample_mean1 - sample_mean2) - t_critical * standard_error
    
    if abs(t) > t_critical:
        results = "Reject Null"
    else:
        results = "Fail to Reject Null"
    
    df_out = pd.DataFrame({
        "Statistic": ["N1", "Sample SD1", "Sample Mean1", "df1", "Sum of Squares1",
                      "N2", "Sample SD2", "Sample Mean2", "df2", "Sum of Squares2", 
                      "Sum Of Product", "Standard Error", "t Score", "t_Critical", 
                      "Decision","Cohen's d", "R-Squared", "95% CI Upper", "95% CI Lower"],
        "Value": [n1,
                  round(sample_std1, 2),
                  round(sample_mean1, 2),
                  df1,
                  round(sum_of_squares1, 2), 
                  n2,
                  round(sample_std2, 2),
                  round(sample_mean2, 2),
                  df2,
                  round(sum_of_squares2, 2),
                  round(sum_product, 2),
                  round(standard_error, 2),
                  round(t, 2),
                  t_critical,
                  results,
                  round(cohen_d, 2),
                  r_squared,
                  round(CI_Upper, 2),
                  round(CI_Lower, 2)]
        
        })
    return dataset1, dataset2, df_out

def generate_repeated_t_test_problem(
        pre_dataset=None, post_dataset=None,
        population_mean=0, population_std=15, n=10, seed=None,
        tx_effect=5, noise_sd=3,
        alpha=0.05, two_tailed=True):
    """
    Generate a repeated-measures (paired) t-test practice problem.

    If no datasets are provided, generates baseline (pre) scores from a normal
    distribution and derives post scores by applying a treatment effect with
    noise. Computes difference scores for each participant, then calculates the
    paired t statistic, Cohen's d, r-squared, and the confidence interval for
    the mean difference.

    Parameters
    ----------
    pre_dataset : array-like or None, optional
        Pre-treatment (baseline) scores. If None, generated from population parameters.
    post_dataset : array-like or None, optional
        Post-treatment scores. If None, derived by applying a treatment effect
        to pre_dataset.
    population_mean : float, optional
        Population mean for baseline data generation. Default is 0.
    population_std : float, optional
        Population standard deviation for baseline data generation. Default is 15.
    n : int, optional
        Sample size (number of participants). Default is 10.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.
    tx_effect : float, optional
        Mean treatment effect applied to pre scores to create post scores. Default is 5.
    noise_sd : float, optional
        Standard deviation of noise added to the treatment effect. Default is 3.
    alpha : float, optional
        Significance level. Default is 0.05.
    two_tailed : bool, optional
        If True, performs a two-tailed test. Default is True.

    Returns
    -------
    numpy.ndarray
        Pre-treatment dataset.
    numpy.ndarray
        Post-treatment dataset.
    pandas.DataFrame
        Results table with statistics: N, SD of differences, mean difference,
        standard error, t score, critical t, decision, Cohen's d, r-squared,
        and CI bounds for the mean difference.
    """

    if pre_dataset is None and post_dataset is None:
        pre_dataset = generate_normal_data(population_mean, population_std, n, seed)
        post_dataset = _apply_treatment(pre_dataset, tx_effect, noise_sd)
    
    differences = []
    for x1, x2 in zip(pre_dataset, post_dataset):
        d = x1 - x2
        differences.append(d)
    
    mean_differences = np.mean(differences)
    std_differences = np.std(differences,ddof=1)
    standard_error = std_differences / np.sqrt(n)
    t = mean_differences / standard_error
    df = n - 1
    cohen_d = mean_differences / std_differences
    r_squared = (t**2) / (t**2 + df)
    t_critical = _t_critical(df, alpha, two_tailed)
    
    CI_Upper = mean_differences + t_critical * standard_error
    CI_Lower = mean_differences - t_critical * standard_error
    
    if abs(t) > t_critical:
        results = "Reject Null"
    else:
        results = "Fail to Reject Null"
    
    df_out = pd.DataFrame({
        "Statistic": ["N", "Differences SD", "Differences Mean", "Standard Error",
                      "t Score", "t_Critical", "Decision","Cohen's d", "R-Squared",
                      "95% CI Upper", "95% CI Lower"],
        "Value": [n,
                  round(std_differences, 2),
                  round(mean_differences, 2),
                  round(standard_error, 2),
                  round(t, 2),
                  t_critical,
                  results,
                  round(cohen_d, 2),
                  r_squared,
                  round(CI_Upper, 2),
                  round(CI_Lower, 2)]
        
        })
    
    return pre_dataset, post_dataset, df_out

def generate_Independent_ANOVA(factors_dictionary={"A":3, "B":2},
                               n = 10, mean=10, std=2, alpha=0.05,
                               effect_size=2.0, seed=None):
    """
    Generate an independent-groups ANOVA practice problem (one-way or factorial).

    Creates a fully-crossed factorial design based on the provided factors dictionary.
    Generates data for each cell by sampling from a normal distribution with a
    random mean shift to simulate between-group variability. Computes SS_Total,
    SS_Between, SS_Within, and (for multi-factor designs) SS for each main effect
    and the interaction term. Returns a complete ANOVA summary table.

    Parameters
    ----------
    factors_dictionary : dict, optional
        Maps factor names to their number of levels.
        Example: {"A": 3, "B": 2} creates a 3x2 factorial design.
        Default is {"A": 3, "B": 2}.
    n : int, optional
        Number of observations per cell. Default is 10.
    mean : float, optional
        Grand population mean for data generation. Default is 10.
    std : float, optional
        Within-cell population standard deviation. Default is 2.
    alpha : float, optional
        Significance level (passed to the ANOVA table builder). Default is 0.05.
    effect_size : float, optional
        Standard deviation of the random mean shifts applied per cell,
        controlling the magnitude of simulated between-group differences.
        Default is 2.0.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.

    Returns
    -------
    pandas.DataFrame
        Long-format dataset with a "Scores" column and one column per factor
        indicating each observation's group membership.
    pandas.DataFrame
        ANOVA summary table with columns: Source, SS, df, MS, F, p-value.
        For single-factor designs, includes Between, Within, and Total rows.
        For factorial designs, also includes per-factor rows and an Interaction row.
    str
        Error message string if the factors dictionary is invalid (no factors provided).
    """

    factor_levels = {factor: [f"{factor}{i+1}" for i in range(levels)]
        for factor, levels in factors_dictionary.items()}

    all_cells = list(itertools.product(*factor_levels.values()))

    rows = []
    mean_shifts = {cell: np.random.normal(loc=0, scale=effect_size)
                   for cell in all_cells}
    
    for cell in all_cells:
        shift = mean_shifts[cell]
        cell_mean = mean + shift
        data = generate_normal_data(mean=cell_mean, std=std, n=n, seed=seed)

        for value in data:
            row = {"Scores": value}

            for factor_name, level in zip(factor_levels.keys(), cell):
                row[factor_name] = level

            rows.append(row)

    df = pd.DataFrame(rows)
    cells = len(all_cells)
    N = cells * n
    df_Total = N - 1
    SS_Total = _sum_of_squares(df["Scores"])
    df_Within = cells * (n - 1)
    
    G = 0
    for values in df["Scores"]:
        G += values
        
    C = (G**2) / N
    
    factor_cols = [col for col in df.columns if col != "Scores"]
    cell_SS = {}

    for cell_levels, group in df.groupby(factor_cols):
        ss = _sum_of_squares(group["Scores"])
        cell_SS[cell_levels] = ss
    
    SS_Within = 0
    for values in cell_SS.values():
        SS_Within += values
    
    SS_Between = SS_Total - SS_Within 
    df_Between = df_Total - df_Within
    
    if len(factors_dictionary) > 1:
        level_SS = _compute_factor_level_SS(df, C)   # SS for each level of each factor
        level_df = {factor: (levels - 1) for factor, levels in factors_dictionary.items()}
        
        SS_Interaction = SS_Between - sum(level_SS.values())
        df_Interaction = df_Between - sum(level_df.values())
        MS_Interaction = SS_Interaction / df_Interaction
        
        # Compute MS_Factor for each factor
        factor_MS = {
        factor: level_SS[factor] / level_df[factor]
        for factor in level_SS
        }
        
        factor_MS["Interaction"] = MS_Interaction
        anova_table =  _build_independent_anova_table(factor_SS=level_SS,
                                              factor_df=level_df,
                                              SS_Within=SS_Within,
                                              df_Within=df_Within,
                                              SS_Total=SS_Total,
                                              SS_Between=SS_Between,
                                              df_Between=df_Between,
                                              SS_Interaction=SS_Interaction,
                                              df_Interaction=df_Interaction,
                                              alpha=alpha
                                              )
        return df, anova_table

    elif len(factors_dictionary) == 1:
        factor = list(factors_dictionary.keys())[0]
        levels = factors_dictionary[factor]
        
        factor_df = {factor: levels - 1}
        factor_SS = {}
        factor_SS[factor] = SS_Between
        SS_Interaction = None
        df_Interaction = None
        
        anova_table = _build_independent_anova_table(factor_SS=factor_SS,
                                              factor_df=factor_df,
                                              SS_Within=SS_Within,
                                              df_Within=df_Within,
                                              SS_Total=SS_Total,
                                              SS_Interaction=SS_Interaction,
                                              df_Interaction=df_Interaction,
                                              alpha=alpha
                                              )
        return df, anova_table

    return "ANOVA Aborted: There's a problem with your factors dictionary."

def generate_pearson_correlation(x_dataset=None, y_dataset=None,
                                 x_mean=10, x_std=1, y_mean=20, y_std=3,
                                 tx_effect_switch=True, tx_effect=10, noise_sd=3,
                                 ro=0, n=10, alpha=0.05, seed=None, two_tailed=True):
    """
    Generate a Pearson correlation practice problem with two synthetic datasets.

    If no datasets are provided, generates X and Y from their respective normal
    distributions, then applies a treatment shift to Y to introduce covariance.
    Computes SS_X, SS_Y, SP_XY, the Pearson r, r-squared, and tests the
    correlation against a null value (ro) using a t transformation.

    Parameters
    ----------
    x_dataset : array-like or None, optional
        Pre-existing X variable data. If None, generated from x_mean and x_std.
    y_dataset : array-like or None, optional
        Pre-existing Y variable data. If None, generated from y_mean and y_std
        with an applied treatment shift.
    x_mean : float, optional
        Population mean for X data generation. Default is 10.
    x_std : float, optional
        Population standard deviation for X. Default is 1.
    y_mean : float, optional
        Population mean for Y data generation. Default is 20.
    y_std : float, optional
        Population standard deviation for Y. Default is 3.
    ro : float, optional
        Null hypothesis value for the population correlation (rho_0).
        Default is 0.
    n : int, optional
        Sample size. Default is 10.
    alpha : float, optional
        Significance level. Default is 0.05.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.
    two_tailed : bool, optional
        If True, performs a two-tailed test. Default is True.

    Returns
    -------
    numpy.ndarray
        X dataset used in the analysis.
    numpy.ndarray
        Y dataset used in the analysis.
    pandas.DataFrame
        Results table with statistics: n, df, mean X/Y, SS_X, SS_Y, SP_XY,
        r, r-squared, standard error, t, critical t, and decision.
    """
    if x_dataset is None:
        x_dataset = generate_normal_data(x_mean, x_std, n, seed)
    if y_dataset is None:
        y_dataset = generate_normal_data(y_mean, y_std, n, seed)
    if tx_effect_switch == True:
        y_dataset = _apply_treatment(y_dataset, tx_effect, noise_sd)
    
    mean_x = np.mean(x_dataset)
    mean_y = np.mean(y_dataset)
    
    SS_X = _sum_of_squares(x_dataset)
    SS_Y = _sum_of_squares(y_dataset)
    
    SP_XY = _sum_product(x_dataset, y_dataset)
    
    r = (SP_XY) / np.sqrt(SS_X*SS_Y)
    r_squared = r**2
    standard_error = np.sqrt((1 - r_squared)/(n - 2))
    t = (r - ro) / standard_error
    df = n - 2 
    t_critical = _t_critical(df, alpha, two_tailed)
    
    if abs(t) > t_critical:
        results = "Reject Null"
    else:
        results = "Fail to Reject Null"
        
    df_out = pd.DataFrame({
        "Statistic": ["n", "df", "Mean_X", "SS_X", "Mean_Y", "SS_Y",
                      "SP_XY", "r", "r_squared", "Standard Error", "t", 
                      "t_critical", "Decision"],
        "Value": [n,
                  df,
                  round(mean_x, 2),
                  round(SS_X, 2),
                  round(mean_y, 2), 
                  round(SS_Y, 2),
                  round(SP_XY, 2),
                  round(r, 2),
                  round(r_squared, 2),
                  round(standard_error, 2),
                  round(t, 2),
                  round(t_critical,2),
                  results]
        
        })
    return x_dataset, y_dataset, df_out

def generate_1_predictor_regression(x_dataset=None, y_dataset=None,
                                    x_mean=10, x_std=1, y_mean=20, y_std=3,
                                    tx_effect_switch=True, tx_effect=10, noise_sd=3,
                                    n=10, alpha=0.05, seed=None):
    """
    Generate a simple (one-predictor) linear regression practice problem.

    If no datasets are provided, generates X and Y from their respective normal
    distributions with an applied treatment shift to Y. Computes the regression
    slope (b) and intercept (a) using the least-squares formulas, partitions
    SS_Y into SS_regression and SS_residual, and tests the model with an F test.
    Returns an ANOVA-style regression summary table and the fitted equation string.

    Parameters
    ----------
    x_dataset : array-like or None, optional
        Pre-existing predictor (X) data. If None, generated from x_mean and x_std.
    y_dataset : array-like or None, optional
        Pre-existing outcome (Y) data. If None, generated from y_mean and y_std
        with an applied treatment shift.
    x_mean : float, optional
        Population mean for X data generation. Default is 10.
    x_std : float, optional
        Population standard deviation for X. Default is 1.
    y_mean : float, optional
        Population mean for Y data generation. Default is 20.
    y_std : float, optional
        Population standard deviation for Y. Default is 3.
    n : int, optional
        Sample size. Default is 10.
    alpha : float, optional
        Significance level. Default is 0.05.
    seed : int or None, optional
        Random seed for reproducibility. Default is None.

    Returns
    -------
    numpy.ndarray
        Y (outcome) dataset used in the analysis.
    numpy.ndarray
        X (predictor) dataset used in the analysis.
    pandas.DataFrame
        Regression ANOVA table with rows for Regression, Residual, and Total,
        and columns: Source, SS, df, MS, F, Decision.
    str
        Regression equation string in the format "Y=bX+a".
    """
    if x_dataset is None:
        x_dataset = generate_normal_data(x_mean, x_std, n, seed)
    if y_dataset is None:
        y_dataset = generate_normal_data(y_mean, y_std, n, seed)
    if tx_effect_switch == True:
        y_dataset = _apply_treatment(y_dataset, tx_effect, noise_sd)
    
    mean_x = np.mean(x_dataset)
    mean_y = np.mean(y_dataset)
    
    SS_X = _sum_of_squares(x_dataset)
    SS_Y = _sum_of_squares(y_dataset)
    df_Y = n - 1
    
    SP_XY = _sum_product(x_dataset, y_dataset)
    
    r = (SP_XY) / np.sqrt(SS_X*SS_Y)
    r_squared = r**2
    b = SP_XY / SS_X
    a = mean_y - (b*mean_x)
    
    SS_regression = r_squared*SS_Y
    SS_residual = (1-r_squared)*SS_Y
    df_regression = 1
    df_residual = n - 2
    MS_regression = SS_regression / df_regression
    MS_residual = SS_residual / df_residual
    F = MS_regression / MS_residual
    
    f_critical = _f_critical(df_regression, df_residual, alpha)
    
    if F > f_critical:
        results = "Reject Null"
    else:
        results = "Fail to Reject Null"
   
    rows = []
    rows.append({
        "Source": "Regression",
        "SS": SS_regression,
        "df": df_regression,
        "MS": MS_regression,
        "F": F,
        "Decision": results
    })
    
    rows.append({
        "Source": "Residual",
        "SS": SS_residual,
        "df": df_residual,
        "MS": MS_residual,
        "F": None,
        "Decision": None
    })
    
    rows.append({
        "Source": "Total",
        "SS": SS_Y,
        "df": df_Y,
        "MS": None,
        "F": None,
        "Decision": None
    })
    
    regression_equation = f"Y={b}X+{a}"
    
    return y_dataset, x_dataset, pd.DataFrame(rows), regression_equation

if __name__ == "__main__":
    pass

