import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runHighEmissionRetentionProfiles } from './helpers/perfRunner.js';
import { evaluateHighEmissionBudgets } from '../scripts/lib/perfBudget.mjs';

function runHighEmissionProfileScript() {
  const result = spawnSync(process.execPath, ['scripts/profile-high-emission.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout || 'profile-high-emission failed');
  return JSON.parse(result.stdout);
}

test('high-emission retention profiles expose stable caps and retention ordering', () => {
  const profiles = runHighEmissionRetentionProfiles({
    steps: 80,
    dt: 0.016,
    sampleEverySteps: 20
  });

  assert.equal(Array.isArray(profiles), true);
  assert.equal(profiles.length, 3);

  const byName = Object.fromEntries(profiles.map((profile) => [profile.name, profile]));
  assert.deepEqual(Object.keys(byName).sort(), [
    'trajectories-infinite',
    'trajectories-off',
    'trajectories-seconds-2'
  ]);

  for (const profile of profiles) {
    assert.equal(profile.peakParticles <= 4999, true);
    assert.equal(profile.peakObjects <= 5000, true);
    assert.equal(profile.p95StepMs >= 0, true);
    assert.equal(profile.heapUsedPeakMB >= profile.heapUsedStartMB, true);
    assert.equal(profile.checkpoints.length > 0, true);
  }

  assert.equal(byName['trajectories-off'].peakTrajectoryPoints, 0);
  assert.equal(
    byName['trajectories-seconds-2'].peakTrajectoryPoints <= byName['trajectories-infinite'].peakTrajectoryPoints,
    true
  );

  const freshReport = runHighEmissionProfileScript();
  const evaluation = evaluateHighEmissionBudgets(freshReport.summaryRows ?? []);

  assert.deepEqual((freshReport.summaryRows ?? []).map((entry) => entry.scenario).sort(), [
    'trajectories-infinite',
    'trajectories-off',
    'trajectories-seconds-2'
  ]);
  assert.equal(freshReport.budgetEvaluation?.suite, 'high-emission');
  assert.deepEqual(
    (freshReport.budgetEvaluation?.results ?? []).map((entry) => entry.scenario).sort(),
    ['trajectories-infinite', 'trajectories-off', 'trajectories-seconds-2']
  );
  assert.deepEqual(freshReport.budgetEvaluation, evaluation);
});
