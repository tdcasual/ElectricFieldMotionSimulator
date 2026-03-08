import { Console } from 'node:console';

function asNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function inferObjectCount(profile) {
  if (Number.isFinite(Number(profile?.objectCount))) return Number(profile.objectCount);
  if (Number.isFinite(Number(profile?.peakObjects))) return Number(profile.peakObjects);
  const firstSnapshotObjectCount = asNumberOrNull(asArray(profile?.snapshots)[0]?.objectCount);
  if (firstSnapshotObjectCount !== null) return firstSnapshotObjectCount;
  const firstCheckpointObjects = asNumberOrNull(asArray(profile?.checkpoints)[0]?.objects);
  if (firstCheckpointObjects !== null) return firstCheckpointObjects;
  const particleCount = asNumberOrNull(profile?.particleCount);
  if (particleCount !== null) return particleCount;
  return null;
}

function inferFinalRunning(profile) {
  if (typeof profile?.finalSnapshot?.running === 'boolean') return profile.finalSnapshot.running;
  return null;
}

function createTimingSection(profile) {
  return {
    step: {
      avgMs: asNumberOrNull(profile?.avgStepMs),
      p50Ms: asNumberOrNull(profile?.p50StepMs),
      p95Ms: asNumberOrNull(profile?.p95StepMs),
      maxMs: asNumberOrNull(profile?.maxStepMs)
    },
    refresh: {
      avgMs: asNumberOrNull(profile?.avgRefreshMs),
      p95Ms: asNumberOrNull(profile?.p95RefreshMs),
      maxMs: asNumberOrNull(profile?.maxRefreshMs)
    },
    totalStep: {
      avgMs: asNumberOrNull(profile?.avgTotalStepMs),
      p95Ms: asNumberOrNull(profile?.p95TotalStepMs),
      maxMs: asNumberOrNull(profile?.maxTotalStepMs)
    },
    frame: {
      avgMs: asNumberOrNull(profile?.avgFrameMs),
      p95Ms: asNumberOrNull(profile?.p95FrameMs),
      maxMs: asNumberOrNull(profile?.maxFrameMs),
      avgFps: asNumberOrNull(profile?.avgFps),
      avgInternalFps: asNumberOrNull(profile?.avgInternalFps),
      minInternalFps: asNumberOrNull(profile?.minInternalFps),
      frameCount: asNumberOrNull(profile?.frameCount)
    }
  };
}

function createSampleSection(profile) {
  return {
    checkpoints: asArray(profile?.checkpoints),
    snapshots: asArray(profile?.snapshots),
    hintSamples: asArray(profile?.hintSamples),
    frameDeltas: asArray(profile?.frameDeltas),
    longTaskDurations: asArray(profile?.longTaskDurations)
  };
}

function createMemorySection(profile) {
  return {
    heapUsedStartMB: asNumberOrNull(profile?.heapUsedStartMB),
    heapUsedPeakMB: asNumberOrNull(profile?.heapUsedPeakMB),
    heapUsedEndMB: asNumberOrNull(profile?.heapUsedEndMB)
  };
}

function createLongTaskSection(profile) {
  return {
    count: asNumberOrNull(profile?.longTaskCount) ?? 0,
    totalMs: asNumberOrNull(profile?.longTaskTotalMs) ?? 0,
    maxMs: asNumberOrNull(profile?.longTaskMaxMs) ?? 0
  };
}

function createOutcomeSection(profile) {
  return {
    successfulIterations: asNumberOrNull(profile?.successfulIterations),
    hintChangeCount: asNumberOrNull(profile?.hintChangeCount),
    finalHintText: asString(profile?.finalHintText, ''),
    finalRunning: inferFinalRunning(profile)
  };
}

function createProfileEntry(profile, generatedAt, workload = {}) {
  return {
    collectedAt: generatedAt,
    name: asString(profile?.name, 'profile'),
    workload: {
      steps: asNumberOrNull(workload.steps),
      dt: asNumberOrNull(workload.dt),
      durationMs: asNumberOrNull(workload.durationMs),
      sampleEverySteps: asNumberOrNull(workload.sampleEverySteps),
      sampleEveryMs: asNumberOrNull(workload.sampleEveryMs),
      particleCount: asNumberOrNull(workload.particleCount),
      objectCount: asNumberOrNull(workload.objectCount),
      iterations: asNumberOrNull(workload.iterations)
    },
    peaks: {
      particles: asNumberOrNull(profile?.peakParticles) ?? 0,
      objects: asNumberOrNull(profile?.peakObjects),
      activeParticles: asNumberOrNull(profile?.peakActiveParticles),
      parseCalls: asNumberOrNull(profile?.peakParseCalls),
      trajectoryPoints: asNumberOrNull(profile?.peakTrajectoryPoints)
    },
    timing: createTimingSection(profile),
    longTask: createLongTaskSection(profile),
    memory: createMemorySection(profile),
    outcome: createOutcomeSection(profile),
    samples: createSampleSection(profile),
    raw: profile
  };
}

function createReport({ reportType, runtime, generatedAt, config, profiles, summaryRows, normalizeProfile }) {
  return {
    schemaVersion: '1.0',
    reportType,
    runtime,
    generatedAt,
    config,
    profiles: profiles.map((profile) => normalizeProfile(profile, generatedAt, config)),
    summaryRows
  };
}

export function buildHighEmissionReport({ generatedAt, config = {}, profiles = [], summaryRows = [] }) {
  return createReport({
    reportType: 'high-emission',
    runtime: 'node',
    generatedAt,
    config,
    profiles,
    summaryRows,
    normalizeProfile: (profile, timestamp, currentConfig) => createProfileEntry(profile, timestamp, {
      steps: profile?.steps ?? currentConfig.steps,
      dt: profile?.dt ?? currentConfig.dt,
      sampleEverySteps: currentConfig.sampleEverySteps,
      particleCount: null,
      objectCount: inferObjectCount(profile)
    })
  });
}

export function buildExpressionBindingReport({ generatedAt, config = {}, profiles = [], summaryRows = [] }) {
  return createReport({
    reportType: 'expression-bindings',
    runtime: 'node',
    generatedAt,
    config,
    profiles,
    summaryRows,
    normalizeProfile: (profile, timestamp, currentConfig) => createProfileEntry(profile, timestamp, {
      steps: profile?.steps ?? currentConfig.steps,
      dt: profile?.dt ?? currentConfig.dt,
      sampleEverySteps: currentConfig.sampleEverySteps,
      particleCount: profile?.particleCount ?? currentConfig.particleCount,
      objectCount: inferObjectCount(profile)
    })
  });
}

export function buildBrowserRenderReport({ generatedAt, config = {}, profiles = [], summaryRows = [] }) {
  return createReport({
    reportType: 'browser-render',
    runtime: 'browser',
    generatedAt,
    config,
    profiles,
    summaryRows,
    normalizeProfile: (profile, timestamp, currentConfig) => createProfileEntry(profile, timestamp, {
      durationMs: profile?.durationMs ?? currentConfig.durationMs,
      sampleEveryMs: currentConfig.sampleEveryMs,
      objectCount: inferObjectCount(profile)
    })
  });
}

export function buildBrowserExpressionUiReport({ generatedAt, config = {}, profiles = [], summaryRows = [] }) {
  return createReport({
    reportType: 'browser-expression-ui',
    runtime: 'browser',
    generatedAt,
    config,
    profiles,
    summaryRows,
    normalizeProfile: (profile, timestamp, currentConfig) => createProfileEntry(profile, timestamp, {
      durationMs: profile?.durationMs ?? currentConfig.durationMs,
      sampleEveryMs: currentConfig.sampleEveryMs,
      particleCount: currentConfig.particleCount,
      objectCount: inferObjectCount(profile),
      iterations: profile?.iterations ?? currentConfig.variableIterations
    })
  });
}


export function emitProfileReport(report, streams = {}) {
  const stdout = streams.stdout ?? process.stdout;
  const stderr = streams.stderr ?? process.stderr;
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  stderr.write('\nSummary:\n');
  const summaryConsole = new Console({ stdout: stderr, stderr });
  summaryConsole.table(Array.isArray(report?.summaryRows) ? report.summaryRows : []);
}
