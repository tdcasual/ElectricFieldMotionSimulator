import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { Scene } from '../../js/core/Scene.js';
import { PhysicsEngine } from '../../js/core/PhysicsEngine.js';

export const PERF_BUDGET_MS = 0.5;

export function runPerfCase(fixturePath, steps = 2000, dt = 0.016) {
  const scene = new Scene();
  scene.setViewport(1280, 720);

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
