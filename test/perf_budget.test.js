import test from 'node:test';
import assert from 'node:assert/strict';
import { runPerfCase, PERF_BUDGET_MS } from './helpers/perfRunner.js';
import { evaluateBrowserRenderBudgets, evaluateHighEmissionBudgets } from '../scripts/lib/perfBudget.mjs';

test('step budget under threshold', () => {
  const result = runPerfCase('test/fixtures/replay/basic-electric.json', 2000);
  assert.equal(result.avgStepMs < PERF_BUDGET_MS, true);
});

test('evaluateHighEmissionBudgets accepts representative optimized profiles', () => {
  const evaluation = evaluateHighEmissionBudgets([
    { name: 'trajectories-off', avgStepMs: 1.8, p95StepMs: 2.6, peakTrajectoryPoints: 0, heapUsedPeakMB: 74 },
    { name: 'trajectories-seconds-2', avgStepMs: 1.9, p95StepMs: 2.7, peakTrajectoryPoints: 4999, heapUsedPeakMB: 78 },
    { name: 'trajectories-infinite', avgStepMs: 1.9, p95StepMs: 2.5, peakTrajectoryPoints: 4999, heapUsedPeakMB: 83 }
  ]);

  assert.equal(evaluation.ok, true);
  assert.equal(evaluation.results.every((entry) => entry.ok), true);
});

test('evaluateHighEmissionBudgets rejects trajectory explosion regressions', () => {
  const evaluation = evaluateHighEmissionBudgets([
    { name: 'trajectories-off', avgStepMs: 1.8, p95StepMs: 2.6, peakTrajectoryPoints: 0, heapUsedPeakMB: 74 },
    { name: 'trajectories-seconds-2', avgStepMs: 4.1, p95StepMs: 5.2, peakTrajectoryPoints: 120000, heapUsedPeakMB: 220 },
    { name: 'trajectories-infinite', avgStepMs: 2.1, p95StepMs: 2.8, peakTrajectoryPoints: 4999, heapUsedPeakMB: 83 }
  ]);

  assert.equal(evaluation.ok, false);
  assert.equal(evaluation.results.find((entry) => entry.scenario === 'trajectories-seconds-2')?.ok, false);
});

test('evaluateBrowserRenderBudgets accepts optimized browser render summaries', () => {
  const evaluation = evaluateBrowserRenderBudgets([
    { scenario: 'high-emission-trajectories-off', avgFps: 33.1, p95FrameMs: 48.05, longTasks: 0, finalFps: 35 },
    { scenario: 'high-emission-trajectories-on', avgFps: 32.8, p95FrameMs: 45.94, longTasks: 0, finalFps: 35 }
  ]);

  assert.equal(evaluation.ok, true);
  assert.equal(evaluation.results.every((entry) => entry.ok), true);
});

test('evaluateBrowserRenderBudgets rejects fps and long-task regressions', () => {
  const evaluation = evaluateBrowserRenderBudgets([
    { scenario: 'high-emission-trajectories-off', avgFps: 24.5, p95FrameMs: 62, longTasks: 3, finalFps: 20 },
    { scenario: 'high-emission-trajectories-on', avgFps: 19.2, p95FrameMs: 70, longTasks: 8, finalFps: 18 }
  ]);

  assert.equal(evaluation.ok, false);
  assert.equal(evaluation.results.every((entry) => entry.ok === false), true);
});
