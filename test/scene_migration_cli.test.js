import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function runMigration(args) {
  return spawnSync('node', ['scripts/migrate-scene-v1-to-v2.mjs', ...args], {
    encoding: 'utf8'
  });
}

test('migration cli converts v1 arrays to v2 objects payload', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-migrate-v1-'));
  const inputPath = path.join(root, 'legacy-v1.json');
  const outputPath = path.join(root, 'scene-v2.json');

  writeJson(inputPath, {
    version: '1.0',
    settings: { showGrid: true },
    electricFields: [
      { x: 10, y: 20, width: 300, height: 180, strength: 1200, direction: 0 }
    ],
    magneticFields: [
      { x: 80, y: 40, width: 200, height: 120, strength: 0.5 }
    ],
    particles: [
      { x: 100, y: 200, vx: 12, vy: -5, charge: -1, mass: 1, radius: 6 }
    ],
    customFlag: true
  });

  const result = runMigration(['--in', inputPath, '--out', outputPath]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(outputPath), true);

  const migrated = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(migrated.version, '2.0');
  assert.equal(Array.isArray(migrated.objects), true);
  assert.equal(migrated.objects.length, 3);
  assert.equal(migrated.objects[0].type, 'electric-field-rect');
  assert.equal(migrated.objects[1].type, 'magnetic-field');
  assert.equal(migrated.objects[2].type, 'particle');
  assert.deepEqual(migrated.objects[2].position, [100, 200, 0]);
  assert.deepEqual(migrated.objects[2].velocity, [12, -5, 0]);
  assert.equal(migrated.extras.customFlag, true);
});

test('migration cli exits non-zero when input is missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-migrate-missing-'));
  const outputPath = path.join(root, 'scene-v2.json');
  const result = runMigration(['--in', path.join(root, 'missing.json'), '--out', outputPath]);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(outputPath), false);
});
