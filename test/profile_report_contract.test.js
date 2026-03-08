import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import {
  buildBrowserExpressionUiReport,
  buildBrowserRenderReport,
  buildExpressionBindingReport,
  buildHighEmissionReport,
  emitProfileReport
} from '../scripts/lib/profileReport.mjs';

test('all profile reports share a stable top-level schema and normalized metric sections', () => {
  const generatedAt = '2026-03-08T09:00:00.000Z';

  const reports = [
    buildHighEmissionReport({
      generatedAt,
      config: { steps: 80, dt: 0.016, sampleEverySteps: 20 },
      profiles: [{
        name: 'trajectories-off',
        steps: 80,
        dt: 0.016,
        avgStepMs: 0.4,
        p50StepMs: 0.35,
        p95StepMs: 0.7,
        maxStepMs: 0.9,
        peakParticles: 4999,
        peakObjects: 5000,
        peakTrajectoryPoints: 0,
        heapUsedStartMB: 10,
        heapUsedPeakMB: 15,
        heapUsedEndMB: 12,
        checkpoints: [{ step: 80, particles: 4999, objects: 5000, heapUsedMB: 12 }]
      }],
      summaryRows: [{ scenario: 'trajectories-off' }]
    }),
    buildExpressionBindingReport({
      generatedAt,
      config: { particleCount: 2400, steps: 60, dt: 0.016, sampleEverySteps: 20 },
      profiles: [{
        name: 'expression-variable-bound',
        mode: 'variable',
        particleCount: 2400,
        steps: 60,
        dt: 0.016,
        peakParticles: 2400,
        peakParseCalls: 4800,
        peakActiveParticles: 2400,
        avgRefreshMs: 0.3,
        p95RefreshMs: 0.5,
        maxRefreshMs: 0.7,
        avgTotalStepMs: 0.9,
        p95TotalStepMs: 1.2,
        maxTotalStepMs: 1.5,
        heapUsedStartMB: 20,
        heapUsedPeakMB: 24,
        heapUsedEndMB: 21,
        checkpoints: [{ step: 60, particles: 2400, parseCalls: 4800, activeParticles: 2400, heapUsedMB: 21 }]
      }],
      summaryRows: [{ scenario: 'expression-variable-bound' }]
    }),
    buildBrowserRenderReport({
      generatedAt,
      config: { baseURL: 'http://127.0.0.1:4795', durationMs: 5000, sampleEveryMs: 250 },
      profiles: [{
        name: 'high-emission-trajectories-off',
        durationMs: 5000,
        frameCount: 10,
        avgFrameMs: 16,
        p95FrameMs: 24,
        maxFrameMs: 32,
        avgFps: 62.5,
        avgInternalFps: 58,
        minInternalFps: 47,
        longTaskCount: 2,
        longTaskTotalMs: 120,
        longTaskMaxMs: 65,
        peakParticles: 480,
        peakObjects: 481,
        finalSnapshot: { t: 5000, fps: 49, particleCount: 480, objectCount: 481, running: false },
        snapshots: [{ t: 0, fps: 0, particleCount: 0, objectCount: 1, running: true }],
        frameDeltas: [16, 17],
        longTaskDurations: [55, 65]
      }],
      summaryRows: [{ scenario: 'high-emission-trajectories-off' }]
    }),
    buildBrowserExpressionUiReport({
      generatedAt,
      config: { baseURL: 'http://127.0.0.1:4796', particleCount: 1200, variableIterations: 4, durationMs: 3000, sampleEveryMs: 200 },
      profiles: [{
        name: 'expression-variable-drawer-restore',
        durationMs: 3000,
        frameCount: 8,
        avgFrameMs: 18,
        p95FrameMs: 25,
        maxFrameMs: 33,
        avgFps: 55,
        avgInternalFps: 48,
        minInternalFps: 42,
        longTaskCount: 1,
        longTaskTotalMs: 58,
        longTaskMaxMs: 58,
        peakParticles: 1200,
        peakObjects: 1200,
        finalSnapshot: { t: 3000, fps: 46, particleCount: 1200, objectCount: 1200, running: false },
        snapshots: [{ t: 0, fps: 0, particleCount: 0, objectCount: 1200, running: false }],
        frameDeltas: [16, 18],
        longTaskDurations: [58],
        iterations: 4,
        successfulIterations: 4,
        hintSamples: [{ t: 0, text: '预览：3 m/s' }, { t: 3000, text: '预览：5 m/s' }],
        hintSampleCount: 2,
        hintChangeCount: 1,
        finalHintText: '预览：5 m/s'
      }],
      summaryRows: [{ scenario: 'expression-variable-drawer-restore' }]
    })
  ];

  for (const report of reports) {
    assert.equal(report.schemaVersion, '1.0');
    assert.equal(typeof report.reportType, 'string');
    assert.equal(typeof report.runtime, 'string');
    assert.equal(report.generatedAt, generatedAt);
    assert.equal(typeof report.config, 'object');
    assert.equal(Array.isArray(report.profiles), true);
    assert.equal(Array.isArray(report.summaryRows), true);
    assert.equal(report.profiles.length, 1);

    const profile = report.profiles[0];
    assert.deepEqual(Object.keys(profile), [
      'collectedAt',
      'name',
      'workload',
      'peaks',
      'timing',
      'longTask',
      'memory',
      'outcome',
      'samples',
      'raw'
    ]);
    assert.equal(profile.collectedAt, generatedAt);
    assert.equal(typeof profile.name, 'string');
    assert.equal(typeof profile.workload, 'object');
    assert.equal(typeof profile.peaks, 'object');
    assert.equal(typeof profile.timing.step, 'object');
    assert.equal(typeof profile.timing.frame, 'object');
    assert.equal(typeof profile.longTask, 'object');
    assert.equal(typeof profile.memory, 'object');
    assert.equal(typeof profile.outcome, 'object');
    assert.equal(typeof profile.samples, 'object');
    assert.equal(typeof profile.raw, 'object');
  }

  assert.equal(reports[0].profiles[0].timing.frame.avgMs, null);
  assert.equal(reports[1].profiles[0].timing.refresh.avgMs, 0.3);
  assert.equal(reports[2].profiles[0].longTask.count, 2);
  assert.equal(reports[3].profiles[0].outcome.finalHintText, '预览：5 m/s');
});


test('profile report emitter keeps JSON on stdout and summary rows on stderr', () => {
  const report = buildHighEmissionReport({
    generatedAt: '2026-03-08T09:00:00.000Z',
    config: { steps: 10, dt: 0.016, sampleEverySteps: 5 },
    profiles: [{
      name: 'trajectories-off',
      steps: 10,
      dt: 0.016,
      avgStepMs: 0.4,
      p50StepMs: 0.35,
      p95StepMs: 0.7,
      maxStepMs: 0.9,
      peakParticles: 100,
      peakObjects: 101,
      peakTrajectoryPoints: 0,
      heapUsedStartMB: 10,
      heapUsedPeakMB: 12,
      heapUsedEndMB: 11,
      checkpoints: []
    }],
    summaryRows: [{ scenario: 'trajectories-off', peakParticles: 100 }]
  });

  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stdout = '';
  let stderr = '';
  stdoutStream.on('data', (chunk) => { stdout += String(chunk); });
  stderrStream.on('data', (chunk) => { stderr += String(chunk); });

  emitProfileReport(report, { stdout: stdoutStream, stderr: stderrStream });
  stdoutStream.end();
  stderrStream.end();

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.reportType, 'high-emission');
  assert.match(stderr, /Summary:/);
  assert.match(stderr, /trajectories-off/);
});
