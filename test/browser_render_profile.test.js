import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrowserRenderTable,
  buildHighEmissionBrowserScenarios,
  summarizeBrowserRenderRun
} from '../scripts/lib/browserRenderProfile.mjs';

test('browser render summary derives fps, long-task and peak counts from raw samples', () => {
  const summary = summarizeBrowserRenderRun({
    name: 'high-emission-trajectories-off',
    durationMs: 5000,
    frameDeltas: [-4, 16, 17, 16, 33, 20],
    longTaskDurations: [55, 72],
    snapshots: [
      { t: 0, fps: 0, particleCount: 0, objectCount: 1, running: true },
      { t: 2500, fps: 54, particleCount: 320, objectCount: 321, running: true },
      { t: 5000, fps: 49, particleCount: 480, objectCount: 481, running: false }
    ]
  });

  assert.equal(summary.name, 'high-emission-trajectories-off');
  assert.equal(summary.frameCount, 5);
  assert.equal(summary.longTaskCount, 2);
  assert.equal(summary.longTaskTotalMs, 127);
  assert.equal(summary.maxFrameMs, 33);
  assert.equal(summary.avgFps > 0, true);
  assert.equal(summary.p95FrameMs >= 20, true);
  assert.equal(summary.peakParticles, 480);
  assert.equal(summary.peakObjects, 481);
  assert.equal(summary.finalSnapshot.running, false);

  const table = buildBrowserRenderTable([summary]);
  assert.equal(Array.isArray(table), true);
  assert.equal(table[0].scenario, 'high-emission-trajectories-off');
  assert.equal(table[0].longTasks, 2);
});

test('browser render scenarios cover trajectory-off and trajectory-on baselines', () => {
  const scenarios = buildHighEmissionBrowserScenarios();
  assert.deepEqual(
    scenarios.map((entry) => entry.name),
    ['high-emission-trajectories-off', 'high-emission-trajectories-on']
  );
  assert.equal(scenarios[0].sceneData.settings.showTrajectories, false);
  assert.equal(scenarios[1].sceneData.settings.showTrajectories, true);
});
