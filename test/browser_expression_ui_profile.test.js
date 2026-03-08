import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrowserExpressionUiTable,
  buildExpressionUiBrowserScenarios,
  summarizeBrowserExpressionUiRun
} from '../scripts/lib/browserExpressionUiProfile.mjs';

test('expression ui browser summary derives hint churn and interaction counters', () => {
  const summary = summarizeBrowserExpressionUiRun({
    name: 'expression-variable-drawer-restore',
    durationMs: 2400,
    iterations: 3,
    successfulIterations: 3,
    frameDeltas: [-3, 16, 18, 22, 20],
    longTaskDurations: [54, 63],
    snapshots: [
      { t: 0, fps: 0, particleCount: 0, objectCount: 1, running: false },
      { t: 1200, fps: 48, particleCount: 1200, objectCount: 1200, running: false },
      { t: 2400, fps: 46, particleCount: 1200, objectCount: 1200, running: false }
    ],
    hintSamples: [
      { t: 0, text: '预览：3 m/s' },
      { t: 800, text: '预览：4 m/s' },
      { t: 1600, text: '预览：4 m/s' },
      { t: 2400, text: '预览：5 m/s' }
    ]
  });

  assert.equal(summary.name, 'expression-variable-drawer-restore');
  assert.equal(summary.frameCount, 4);
  assert.equal(summary.longTaskCount, 2);
  assert.equal(summary.successfulIterations, 3);
  assert.equal(summary.hintSampleCount, 4);
  assert.equal(summary.hintChangeCount, 2);
  assert.equal(summary.finalHintText, '预览：5 m/s');
  assert.equal(summary.avgFps > 0, true);

  const table = buildBrowserExpressionUiTable([summary]);
  assert.equal(table[0].scenario, 'expression-variable-drawer-restore');
  assert.equal(table[0].hintChanges, 2);
  assert.equal(table[0].iterations, '3/3');
});

test('expression ui browser scenarios cover variable restore and time live-preview modes', () => {
  const scenarios = buildExpressionUiBrowserScenarios({ particleCount: 1200, variableIterations: 4 });
  assert.deepEqual(
    scenarios.map((entry) => entry.name),
    ['expression-variable-drawer-restore', 'expression-time-drawer-live']
  );
  assert.equal(scenarios[0].sceneData.objects.length, 1200);
  assert.equal(scenarios[0].sceneData.objects[0].vxExpr, 'a + 1');
  assert.equal(scenarios[1].sceneData.objects[0].vxExpr, 't + 1');
  assert.equal(scenarios[0].iterations, 4);
});
