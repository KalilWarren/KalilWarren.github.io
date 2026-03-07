import type { TestResult, TestContext, ProblemData, AnovaPracticeData, TwoWayAnovaPracticeData, RmaAnovaPracticeData, PearsonProblemData, RegPracticeData, TestType, DatasetBatchItem, BatchItem } from './types.ts';

/* Mutable application state — mutate properties directly; do not reassign the object */
export const state: {
  pyodide: PyodideInterface | null;
  lastResult: TestResult | null;
  currentTest: TestType | null;
  lastZTestContext: TestContext | null;
  lastTTestContext: TestContext | null;
  lastIndTTestContext: TestContext | null;
  lastRmTTestContext: TestContext | null;
  lastPearsonContext: TestContext | null;
  lastProblemData: ProblemData | null;
  lastPearsonProblemData: PearsonProblemData | null;
  lastAnovaPracticeData: AnovaPracticeData | null;
  lastTwoWayAnovaPracticeData: TwoWayAnovaPracticeData | null;
  lastRmaAnovaPracticeData: RmaAnovaPracticeData | null;
  lastRegPracticeData: RegPracticeData | null;
  lastDatasetBatch: DatasetBatchItem[] | null;
  lastBatch: BatchItem[] | null;
} = {
  pyodide:                      null,
  lastResult:                   null,
  currentTest:                  null,
  lastZTestContext:              null,
  lastTTestContext:              null,
  lastIndTTestContext:           null,
  lastRmTTestContext:            null,
  lastPearsonContext:            null,
  lastProblemData:               null,
  lastPearsonProblemData:        null,
  lastAnovaPracticeData:         null,
  lastTwoWayAnovaPracticeData:   null,
  lastRmaAnovaPracticeData:      null,
  lastRegPracticeData:           null,
  lastDatasetBatch:              null,
  lastBatch:                     null,
};
