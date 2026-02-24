import type { TestResult, TestContext, ProblemData, AnovaPracticeData, TwoWayAnovaPracticeData, TestType } from './types.ts';

/* Mutable application state — mutate properties directly; do not reassign the object */
export const state: {
  pyodide: PyodideInterface | null;
  lastResult: TestResult | null;
  currentTest: TestType | null;
  lastZTestContext: TestContext | null;
  lastTTestContext: TestContext | null;
  lastIndTTestContext: TestContext | null;
  lastRmTTestContext: TestContext | null;
  lastProblemData: ProblemData | null;
  lastAnovaPracticeData: AnovaPracticeData | null;
  lastTwoWayAnovaPracticeData: TwoWayAnovaPracticeData | null;
} = {
  pyodide:                      null,
  lastResult:                   null,
  currentTest:                  null,
  lastZTestContext:              null,
  lastTTestContext:              null,
  lastIndTTestContext:           null,
  lastRmTTestContext:            null,
  lastProblemData:               null,
  lastAnovaPracticeData:         null,
  lastTwoWayAnovaPracticeData:   null,
};
