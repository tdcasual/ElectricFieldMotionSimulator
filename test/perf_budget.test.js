import test from 'node:test';
import assert from 'node:assert/strict';
import { runPerfCase, PERF_BUDGET_MS } from './helpers/perfRunner.js';

test('step budget under threshold', () => {
  const result = runPerfCase('test/fixtures/replay/basic-electric.json', 2000);
  assert.equal(result.avgStepMs < PERF_BUDGET_MS, true);
});
