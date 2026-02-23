/* ── Statistical test types ── */

export type TestType =
  | 'z_test'
  | 't_test'
  | 'independent_t_test'
  | 'repeated_t_test'
  | 'anova'
  | 'pearson'
  | 'regression';

/* Records returned by the Python engine */
export interface StatRecord {
  Statistic: string;
  Value: string | number | null;
}

/* ANOVA dataset row — factor columns are dynamic strings */
export interface AnovaRow {
  [factor: string]: string | number | null;
  Observation: number;
}

/* ANOVA / regression table row */
export interface TableRow {
  [key: string]: string | number | null;
}

/* ── Per-test result shapes ── */

export interface ZTestResult {
  type: 'z_test';
  dataset: number[];
  results: StatRecord[];
}

export interface TTestResult {
  type: 't_test';
  dataset: number[];
  results: StatRecord[];
}

export interface IndTTestResult {
  type: 'independent_t_test';
  dataset1: number[];
  dataset2: number[];
  results: StatRecord[];
}

export interface RepTTestResult {
  type: 'repeated_t_test';
  pre: number[];
  post: number[];
  results: StatRecord[];
}

export interface AnovaResult {
  type: 'anova';
  dataset: AnovaRow[];
  table: TableRow[];
}

export interface PearsonResult {
  type: 'pearson';
  x_data: number[];
  y_data: number[];
  results: StatRecord[];
}

export interface RegressionResult {
  type: 'regression';
  x_data: number[];
  y_data: number[];
  table: TableRow[];
  equation: string;
}

export type TestResult =
  | ZTestResult
  | TTestResult
  | IndTTestResult
  | RepTTestResult
  | AnovaResult
  | PearsonResult
  | RegressionResult;

/* ── Problem generator context captured at test-run time ── */
export interface TestContext {
  alpha: number;
  twoTailed: boolean;
}

/* ── Student problem data used for display + Excel export ── */

export interface ZProblemData {
  testType: 'z_test';
  variable: string;
  pop: string;
  unit: string;
  mu0: string | number;
  sigma: string | number;
  n: string | number;
  xbar: string | number;
  se: string | number;
  zScore: string | number;
  zCrit: string | number;
  cohenD: string | number;
  decision: string | number | null;
  ciUp: string | number;
  ciLo: string | number;
  alpha: number;
  twoTailed: boolean;
  tailLabel: string;
  pval: string;
  pCompare: string;
  h0: string;
  h1: string;
  isRej: boolean;
  testPhrasePlain: string;
  interp: string;
}

export interface TProblemData {
  testType: 't_test';
  variable: string;
  pop: string;
  unit: string;
  mu0: string | number;
  sampleSD: string | number;
  n: string | number;
  xbar: string | number;
  se: string | number;
  tScore: string | number;
  tCrit: string | number;
  df: number;
  cohenD: string | number;
  rSq: string | number;
  rSqPct: string;
  decision: string | number | null;
  ciUp: string | number;
  ciLo: string | number;
  alpha: number;
  twoTailed: boolean;
  tailLabel: string;
  pval: string;
  pCompare: string;
  h0: string;
  h1: string;
  isRej: boolean;
  testPhrasePlain: string;
  interp: string;
}

export type ProblemData = ZProblemData | TProblemData;
