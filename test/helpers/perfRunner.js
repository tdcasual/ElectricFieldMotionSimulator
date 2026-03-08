import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { Scene } from '../../js/core/Scene.js';
import { PhysicsEngine } from '../../js/core/PhysicsEngine.js';
import { ElectronGun } from '../../js/objects/ElectronGun.js';
import { Particle } from '../../js/objects/Particle.js';
import { parseExpressionInput } from '../../js/ui/SchemaForm.js';

export const PERF_BUDGET_MS = 0.5;

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const MB = 1024 * 1024;

function toMegabytes(bytes) {
  return bytes / MB;
}

function readHeapUsedBytes() {
  try {
    return process.memoryUsage().heapUsed;
  } catch {
    return 0;
  }
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function countTrajectoryPoints(scene) {
  const particles = Array.isArray(scene?.particles) ? scene.particles : [];
  let total = 0;
  for (const particle of particles) {
    total += Array.isArray(particle?.trajectory) ? particle.trajectory.length : 0;
  }
  return total;
}

function buildCheckpoint({ step, scene, heapUsedBytes, stepMs }) {
  return {
    step,
    particles: Array.isArray(scene?.particles) ? scene.particles.length : 0,
    objects: Array.isArray(scene?.objects) ? scene.objects.length : 0,
    trajectoryPoints: countTrajectoryPoints(scene),
    heapUsedMB: toMegabytes(heapUsedBytes),
    stepMs
  };
}

export function runPerfCase(fixturePath, steps = 2000, dt = 0.016) {
  const scene = new Scene();
  scene.setViewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);

  const fullPath = path.resolve(fixturePath);
  const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  scene.loadFromData(payload);

  const engine = new PhysicsEngine();
  const start = performance.now();
  for (let i = 0; i < steps; i++) {
    scene.time += dt;
    engine.update(scene, dt);
  }
  const end = performance.now();

  const totalMs = end - start;
  return {
    steps,
    totalMs,
    avgStepMs: totalMs / Math.max(steps, 1)
  };
}

export function runProfileCase(options = {}) {
  const {
    name = 'profile-case',
    steps = 180,
    dt = 0.016,
    sampleEverySteps = 30,
    setupScene,
    beforeLoop,
    afterStep
  } = options;

  const scene = new Scene();
  scene.setViewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  setupScene?.(scene);
  beforeLoop?.(scene);

  const engine = new PhysicsEngine();
  const stepTimes = [];
  const checkpoints = [];

  let peakParticles = Array.isArray(scene.particles) ? scene.particles.length : 0;
  let peakObjects = Array.isArray(scene.objects) ? scene.objects.length : 0;
  let peakTrajectoryPoints = countTrajectoryPoints(scene);
  const heapUsedStartBytes = readHeapUsedBytes();
  let heapUsedPeakBytes = heapUsedStartBytes;

  for (let i = 0; i < steps; i += 1) {
    scene.time += dt;

    const stepStart = performance.now();
    engine.update(scene, dt);
    afterStep?.(scene, i + 1);
    const stepEnd = performance.now();
    const stepMs = stepEnd - stepStart;
    stepTimes.push(stepMs);

    const currentParticles = Array.isArray(scene.particles) ? scene.particles.length : 0;
    const currentObjects = Array.isArray(scene.objects) ? scene.objects.length : 0;
    const currentTrajectoryPoints = countTrajectoryPoints(scene);
    const heapUsedBytes = readHeapUsedBytes();

    peakParticles = Math.max(peakParticles, currentParticles);
    peakObjects = Math.max(peakObjects, currentObjects);
    peakTrajectoryPoints = Math.max(peakTrajectoryPoints, currentTrajectoryPoints);
    heapUsedPeakBytes = Math.max(heapUsedPeakBytes, heapUsedBytes);

    if ((i + 1) % sampleEverySteps === 0 || i === steps - 1) {
      checkpoints.push(buildCheckpoint({
        step: i + 1,
        scene,
        heapUsedBytes,
        stepMs
      }));
    }
  }

  const heapUsedEndBytes = readHeapUsedBytes();
  const totalStepMs = stepTimes.reduce((sum, value) => sum + value, 0);

  return {
    name,
    steps,
    dt,
    avgStepMs: totalStepMs / Math.max(stepTimes.length, 1),
    p50StepMs: percentile(stepTimes, 0.5),
    p95StepMs: percentile(stepTimes, 0.95),
    maxStepMs: stepTimes.length ? Math.max(...stepTimes) : 0,
    peakParticles,
    peakObjects,
    peakTrajectoryPoints,
    heapUsedStartMB: toMegabytes(heapUsedStartBytes),
    heapUsedPeakMB: toMegabytes(heapUsedPeakBytes),
    heapUsedEndMB: toMegabytes(heapUsedEndBytes),
    checkpoints
  };
}

function applyRetentionMode(scene, mode) {
  const particles = Array.isArray(scene?.particles) ? scene.particles : [];
  for (const particle of particles) {
    if (!particle || particle.type !== 'particle') continue;
    if (mode === 'trajectories-seconds-2') {
      particle.showTrajectory = true;
      particle.trajectoryRetention = 'seconds';
      particle.trajectorySeconds = 2;
      particle.maxTrajectoryLength = Infinity;
      particle.pruneTrajectory?.(scene.time);
      continue;
    }
    if (mode === 'trajectories-infinite') {
      particle.showTrajectory = true;
      particle.trajectoryRetention = 'infinite';
      particle.maxTrajectoryLength = Infinity;
    }
  }
}

export function runHighEmissionRetentionProfiles(options = {}) {
  const {
    steps = 180,
    dt = 0.016,
    sampleEverySteps = 30,
    emissionRate = 20000,
    emissionSpeed = 0
  } = options;

  const cases = [
    {
      name: 'trajectories-off',
      setupScene(scene) {
        scene.settings.boundaryMode = 'bounce';
        scene.settings.showTrajectories = false;
        scene.addObject(new ElectronGun({
          x: 100,
          y: 100,
          direction: 0,
          emissionRate,
          emissionSpeed
        }));
      }
    },
    {
      name: 'trajectories-seconds-2',
      setupScene(scene) {
        scene.settings.boundaryMode = 'bounce';
        scene.settings.showTrajectories = true;
        scene.addObject(new ElectronGun({
          x: 100,
          y: 100,
          direction: 0,
          emissionRate,
          emissionSpeed
        }));
      },
      beforeLoop(scene) {
        applyRetentionMode(scene, 'trajectories-seconds-2');
      },
      afterStep(scene) {
        applyRetentionMode(scene, 'trajectories-seconds-2');
      }
    },
    {
      name: 'trajectories-infinite',
      setupScene(scene) {
        scene.settings.boundaryMode = 'bounce';
        scene.settings.showTrajectories = true;
        scene.addObject(new ElectronGun({
          x: 100,
          y: 100,
          direction: 0,
          emissionRate,
          emissionSpeed
        }));
      },
      beforeLoop(scene) {
        applyRetentionMode(scene, 'trajectories-infinite');
      },
      afterStep(scene) {
        applyRetentionMode(scene, 'trajectories-infinite');
      }
    }
  ];

  return cases.map((entry) => runProfileCase({
    name: entry.name,
    steps,
    dt,
    sampleEverySteps,
    setupScene: entry.setupScene,
    beforeLoop: entry.beforeLoop,
    afterStep: entry.afterStep
  }));
}


const EXPRESSION_SOURCE_NUMBER_RE = /^[+-]?(?:\d+\.\d*|\d+|\.\d+)(?:[eE][+-]?\d+)?$/;

function isDynamicExpressionSource(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return false;
  return !EXPRESSION_SOURCE_NUMBER_RE.test(text);
}

function buildExpressionBindContext(scene) {
  const ppm = Number.isFinite(scene?.settings?.pixelsPerMeter) && scene.settings.pixelsPerMeter > 0
    ? scene.settings.pixelsPerMeter
    : 1;
  return {
    scene,
    pixelsPerMeter: ppm
  };
}

function getDynamicExpressionFields() {
  return Particle.schema()
    .flatMap((section) => section?.fields ?? [])
    .filter((field) => field?.type === 'expression' && field.bind && typeof field.bind.get === 'function' && typeof field.bind.set === 'function');
}

function refreshExpressionBindings(scene, fields) {
  const particles = Array.isArray(scene?.particles) ? scene.particles : [];
  if (!particles.length || !fields.length) {
    return { parseCalls: 0, activeParticles: 0 };
  }

  const context = buildExpressionBindContext(scene);
  let parseCalls = 0;
  let activeParticles = 0;

  for (const particle of particles) {
    let activeForParticle = false;
    for (const field of fields) {
      const raw = field.bind.get(particle, context);
      if (!isDynamicExpressionSource(raw)) continue;
      parseCalls += 1;
      activeForParticle = true;
      const parsed = parseExpressionInput(raw, scene);
      if (!parsed?.ok || parsed.empty) continue;
      field.bind.set(particle, parsed, context);
    }
    if (activeForParticle) activeParticles += 1;
  }

  return { parseCalls, activeParticles };
}

function buildExpressionScene({ particleCount = 2400, mode = 'static' } = {}) {
  const scene = new Scene();
  scene.setViewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  scene.variables = { a: 2, b: 3 };
  scene.settings.boundaryMode = 'bounce';

  for (let i = 0; i < particleCount; i += 1) {
    const row = Math.floor(i / 60);
    const col = i % 60;
    const config = {
      x: 50 + col * 10,
      y: 50 + row * 10,
      vx: 1,
      vy: -1,
      showTrajectory: false
    };
    if (mode === 'variable') {
      config.vxExpr = 'a + 1';
      config.vyExpr = 'b - 1';
    } else if (mode === 'time') {
      config.vxExpr = 't + 1';
      config.vyExpr = 't * 0.5';
    }
    scene.addObject(new Particle(config));
  }

  return scene;
}

function runExpressionBindingProfileCase(options = {}) {
  const {
    name = 'expression-profile',
    mode = 'static',
    particleCount = 2400,
    steps = 60,
    dt = 0.016,
    sampleEverySteps = 20
  } = options;

  const scene = buildExpressionScene({ particleCount, mode });
  const engine = new PhysicsEngine();
  const fields = getDynamicExpressionFields();
  const refreshTimes = [];
  const totalStepTimes = [];
  const checkpoints = [];
  const heapUsedStartBytes = readHeapUsedBytes();
  let heapUsedPeakBytes = heapUsedStartBytes;
  let peakParseCalls = 0;
  let peakActiveParticles = 0;
  let peakParticles = scene.particles.length;

  for (let i = 0; i < steps; i += 1) {
    scene.time += dt;
    if (mode === 'variable') {
      scene.variables.a = 2 + (i % 5);
      scene.variables.b = 3 + ((i + 2) % 7);
    }

    const totalStart = performance.now();
    const refreshStart = performance.now();
    const refresh = refreshExpressionBindings(scene, fields);
    const refreshEnd = performance.now();
    engine.update(scene, dt);
    const totalEnd = performance.now();

    const refreshMs = refreshEnd - refreshStart;
    const totalStepMs = totalEnd - totalStart;
    refreshTimes.push(refreshMs);
    totalStepTimes.push(totalStepMs);

    peakParseCalls = Math.max(peakParseCalls, refresh.parseCalls);
    peakActiveParticles = Math.max(peakActiveParticles, refresh.activeParticles);
    peakParticles = Math.max(peakParticles, scene.particles.length);

    const heapUsedBytes = readHeapUsedBytes();
    heapUsedPeakBytes = Math.max(heapUsedPeakBytes, heapUsedBytes);

    if ((i + 1) % sampleEverySteps === 0 || i === steps - 1) {
      checkpoints.push({
        step: i + 1,
        particles: scene.particles.length,
        parseCalls: refresh.parseCalls,
        activeParticles: refresh.activeParticles,
        refreshMs,
        totalStepMs,
        heapUsedMB: toMegabytes(heapUsedBytes)
      });
    }
  }

  const heapUsedEndBytes = readHeapUsedBytes();
  return {
    name,
    mode,
    particleCount,
    steps,
    dt,
    peakParticles,
    peakParseCalls,
    peakActiveParticles,
    avgRefreshMs: refreshTimes.reduce((sum, value) => sum + value, 0) / Math.max(refreshTimes.length, 1),
    p95RefreshMs: percentile(refreshTimes, 0.95),
    maxRefreshMs: refreshTimes.length ? Math.max(...refreshTimes) : 0,
    avgTotalStepMs: totalStepTimes.reduce((sum, value) => sum + value, 0) / Math.max(totalStepTimes.length, 1),
    p95TotalStepMs: percentile(totalStepTimes, 0.95),
    maxTotalStepMs: totalStepTimes.length ? Math.max(...totalStepTimes) : 0,
    heapUsedStartMB: toMegabytes(heapUsedStartBytes),
    heapUsedPeakMB: toMegabytes(heapUsedPeakBytes),
    heapUsedEndMB: toMegabytes(heapUsedEndBytes),
    checkpoints
  };
}

export function runExpressionBindingProfiles(options = {}) {
  const {
    particleCount = 2400,
    steps = 60,
    dt = 0.016,
    sampleEverySteps = 20
  } = options;

  return [
    runExpressionBindingProfileCase({
      name: 'expression-static-fallback',
      mode: 'static',
      particleCount,
      steps,
      dt,
      sampleEverySteps
    }),
    runExpressionBindingProfileCase({
      name: 'expression-variable-bound',
      mode: 'variable',
      particleCount,
      steps,
      dt,
      sampleEverySteps
    }),
    runExpressionBindingProfileCase({
      name: 'expression-time-bound',
      mode: 'time',
      particleCount,
      steps,
      dt,
      sampleEverySteps
    })
  ];
}
