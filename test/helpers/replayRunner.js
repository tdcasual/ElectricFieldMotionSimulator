import fs from 'node:fs';
import path from 'node:path';

import { Scene } from '../../js/core/Scene.js';
import { PhysicsEngine } from '../../js/core/PhysicsEngine.js';

function roundNumber(value, decimals = 6) {
  if (!Number.isFinite(value)) return value;
  return Number(value.toFixed(decimals));
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    const out = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) {
      if (key === 'id' || key === 'timestamp') continue;
      out[key] = canonicalize(value[key]);
    }
    return out;
  }

  if (typeof value === 'number') {
    return roundNumber(value);
  }

  return value;
}

function stableObjectCompare(a, b) {
  if ((a.type || '') !== (b.type || '')) {
    return (a.type || '').localeCompare(b.type || '');
  }

  const ax = Number.isFinite(a.x) ? a.x : 0;
  const bx = Number.isFinite(b.x) ? b.x : 0;
  if (ax !== bx) return ax - bx;

  const ay = Number.isFinite(a.y) ? a.y : 0;
  const by = Number.isFinite(b.y) ? b.y : 0;
  return ay - by;
}

export function signatureFromScene(scene) {
  const serialized = scene
    .getAllObjects()
    .map((obj) => (typeof obj.serialize === 'function' ? obj.serialize() : { type: obj.type, x: obj.x, y: obj.y }))
    .sort(stableObjectCompare);

  return canonicalize({
    settings: scene.settings,
    camera: scene.getCameraOffset(),
    time: scene.time,
    objects: serialized
  });
}

export function runReplay(fixturePath, steps = 500, dt = 0.016, options = {}) {
  const fullPath = path.resolve(fixturePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const data = JSON.parse(raw);

  const scene = new Scene();
  scene.setViewport(
    Number.isFinite(options.viewportWidth) ? options.viewportWidth : 1280,
    Number.isFinite(options.viewportHeight) ? options.viewportHeight : 720
  );
  scene.loadFromData(data);

  const engine = new PhysicsEngine();
  for (let i = 0; i < steps; i++) {
    scene.time += dt;
    engine.update(scene, dt);
  }

  return {
    scene,
    signature: signatureFromScene(scene),
    steps,
    dt
  };
}
