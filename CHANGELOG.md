# Changelog

Changes to StatTeacher Toolkit: the instructor toolkit, the Python engine, and the Student Practice page.

## 1.1.0 — November 2026

`public/toolkit/Engine_v1.0.0.py` is kept in the repository exactly as released. The toolkit now loads `Engine_v1.1.0.py`. The engine changes in this release were written with AI assistance (Claude Code) and are covered by the test suite described below.

### Added

- **True correlation for Pearson and regression.** `generate_pearson_correlation()` and `generate_1_predictor_regression()` take an optional `true_r` (−1 to 1). X and Y are generated with that population correlation, with or without a seed. Left blank, behaviour is unchanged. The setting is on both forms, in the parameter sweep lists, and recorded in batch exports.
- **Statistics tests.** `npm test` has SciPy recompute every student answer key (2,000 seeded problems per module) and every statistic the engine reports. For table problems it also simulates a student filling in the hidden cells from the displayed values. The tests run before every deploy.

### Changed

- **Confidence intervals are labelled with their real level.** The engine labelled every interval "95% CI". The interval uses the test's own critical value, so its level is 1 − α for a two-tailed test and 1 − 2α for a one-tailed test. Result rows, worksheets and Excel exports now show that level (for example "99% CI Upper"). The values are unchanged. Code that reads the `95% CI Upper` / `95% CI Lower` rows by name needs updating.
- **Regression equation.** A negative intercept is written `Y=bX-a` instead of `Y=bX+-a`.
- **Symbols keep their case.** Form labels and step headings no longer capitalise μ, σ, α, ρ, n, t, d, r² and η².
- **Treatment checkbox wording** on the Pearson and regression forms: it shifts Y and adds noise; it does not create an X–Y relationship.

### Fixed

- **Table grading on Student Practice.** Tables are shown to two decimals, and hard problems require the error mean square to be recovered by dividing by F. A flat ±0.05 tolerance marked correct work wrong in most hard one-way, two-way and repeated-measures ANOVA problems. Each hidden cell is now accepted within ±0.05 plus the rounding error inherited from the displayed values. Hard problems are redrawn if a displayed F is below 0.10.
- **Practice scenarios fit their numbers.** Variables that could not plausibly take the generated values (a GPA of 105 points, 95 hours of sleep) were replaced or given a realistic range for the mean.
- **Repeated-measures ANOVA data.** The engine's table is computed from the same rounded scores it returns, so the dataset reproduces the table exactly.

## 1.0.0 — March 2026

Initial release, as submitted to the *Journal of Open Source Education*.
