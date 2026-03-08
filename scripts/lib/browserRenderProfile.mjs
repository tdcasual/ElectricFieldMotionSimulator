function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + toFiniteNumber(value), 0) / values.length;
}

function percentile(values, ratio) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = values.map((value) => toFiniteNumber(value)).sort((left, right) => left - right);
  const index = Math.min(Math.max(toFiniteNumber(ratio), 0), 1) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

function maxOrZero(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Math.max(...values.map((value) => toFiniteNumber(value)));
}

function buildSceneSettings(showTrajectories) {
  return {
    pixelsPerMeter: 50,
    boundaryMode: 'bounce',
    showTrajectories: Boolean(showTrajectories)
  };
}

function buildHighEmissionSceneData(showTrajectories) {
  return {
    version: '1.0',
    settings: buildSceneSettings(showTrajectories),
    objects: [
      {
        type: 'electron-gun',
        x: 100,
        y: 100,
        direction: 0,
        emissionRate: 20000,
        emissionSpeed: 0,
        ignoreGravity: true
      }
    ]
  };
}

export function buildHighEmissionBrowserScenarios() {
  return [
    {
      name: 'high-emission-trajectories-off',
      sceneData: buildHighEmissionSceneData(false)
    },
    {
      name: 'high-emission-trajectories-on',
      sceneData: buildHighEmissionSceneData(true)
    }
  ];
}

export function summarizeBrowserRenderRun(input = {}) {
  const snapshots = Array.isArray(input.snapshots) ? input.snapshots : [];
  const frameDeltas = Array.isArray(input.frameDeltas)
    ? input.frameDeltas.map((value) => toFiniteNumber(value)).filter((value) => value > 0)
    : [];
  const longTaskDurations = Array.isArray(input.longTaskDurations) ? input.longTaskDurations : [];
  const fpsSamples = snapshots.map((snapshot) => toFiniteNumber(snapshot?.fps));
  const particleSamples = snapshots.map((snapshot) => toFiniteNumber(snapshot?.particleCount));
  const objectSamples = snapshots.map((snapshot) => toFiniteNumber(snapshot?.objectCount));
  const finalSnapshot = snapshots.length > 0
    ? snapshots[snapshots.length - 1]
    : { t: 0, fps: 0, particleCount: 0, objectCount: 0, running: false };
  const avgFrameMs = average(frameDeltas);

  return {
    name: String(input.name ?? 'browser-render-profile'),
    durationMs: toFiniteNumber(input.durationMs),
    frameCount: frameDeltas.length,
    avgFrameMs,
    p95FrameMs: percentile(frameDeltas, 0.95),
    maxFrameMs: maxOrZero(frameDeltas),
    avgFps: avgFrameMs > 0 ? 1000 / avgFrameMs : 0,
    avgInternalFps: average(fpsSamples),
    minInternalFps: fpsSamples.length > 0 ? Math.min(...fpsSamples) : 0,
    longTaskCount: longTaskDurations.length,
    longTaskTotalMs: longTaskDurations.reduce((sum, value) => sum + toFiniteNumber(value), 0),
    longTaskMaxMs: maxOrZero(longTaskDurations),
    peakParticles: particleSamples.length > 0 ? Math.max(...particleSamples) : 0,
    peakObjects: objectSamples.length > 0 ? Math.max(...objectSamples) : 0,
    finalSnapshot,
    snapshots,
    frameDeltas,
    longTaskDurations
  };
}

export function buildBrowserRenderTable(profiles = []) {
  return profiles.map((profile) => ({
    scenario: profile.name,
    avgFps: Number(toFiniteNumber(profile.avgFps).toFixed(2)),
    p95FrameMs: Number(toFiniteNumber(profile.p95FrameMs).toFixed(2)),
    maxFrameMs: Number(toFiniteNumber(profile.maxFrameMs).toFixed(2)),
    longTasks: Number(toFiniteNumber(profile.longTaskCount).toFixed(0)),
    longTaskMaxMs: Number(toFiniteNumber(profile.longTaskMaxMs).toFixed(2)),
    peakParticles: Number(toFiniteNumber(profile.peakParticles).toFixed(0)),
    peakObjects: Number(toFiniteNumber(profile.peakObjects).toFixed(0)),
    finalFps: Number(toFiniteNumber(profile.finalSnapshot?.fps).toFixed(2))
  }));
}
