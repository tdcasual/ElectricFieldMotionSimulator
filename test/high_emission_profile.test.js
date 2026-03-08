import test from 'node:test';
import assert from 'node:assert/strict';
import { runHighEmissionRetentionProfiles } from './helpers/perfRunner.js';

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
});
