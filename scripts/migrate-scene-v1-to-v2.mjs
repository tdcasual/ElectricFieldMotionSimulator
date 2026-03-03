#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCliArgs(argv, cwd = process.cwd()) {
  const args = {
    inputPath: null,
    outputPath: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--in') {
      i += 1;
      args.inputPath = path.resolve(cwd, String(argv[i] ?? ''));
      continue;
    }
    if (flag === '--out') {
      i += 1;
      args.outputPath = path.resolve(cwd, String(argv[i] ?? ''));
      continue;
    }
  }

  return args;
}

function normalizeParticleObject(source) {
  const next = { ...source, type: 'particle' };
  if (!Array.isArray(next.position)) {
    next.position = [
      asFiniteNumber(next.x, 0),
      asFiniteNumber(next.y, 0),
      0
    ];
  }
  if (!Array.isArray(next.velocity)) {
    next.velocity = [
      asFiniteNumber(next.vx, 0),
      asFiniteNumber(next.vy, 0),
      0
    ];
  }
  delete next.x;
  delete next.y;
  delete next.vx;
  delete next.vy;
  return next;
}

function normalizeElectricObject(source) {
  const next = { ...source };
  if (typeof next.type !== 'string' || !next.type.trim()) {
    const shape = String(next.shape ?? '').toLowerCase();
    const isCircle = shape === 'circle' || Number.isFinite(Number(next.radius));
    next.type = isCircle ? 'electric-field-circle' : 'electric-field-rect';
  }
  return next;
}

function normalizeMagneticObject(source) {
  const next = { ...source };
  if (typeof next.type !== 'string' || !next.type.trim()) {
    next.type = 'magnetic-field';
  }
  return next;
}

export function migrateSceneData(input) {
  if (!isRecord(input)) {
    throw new Error('输入场景必须是 JSON 对象');
  }

  if (input.version === '2.0' && Array.isArray(input.objects)) {
    return {
      ...input,
      version: '2.0'
    };
  }

  const objects = [];
  if (Array.isArray(input.objects)) {
    objects.push(...input.objects.filter((item) => isRecord(item)).map((item) => ({ ...item })));
  }
  if (Array.isArray(input.electricFields)) {
    objects.push(...input.electricFields.filter((item) => isRecord(item)).map(normalizeElectricObject));
  }
  if (Array.isArray(input.magneticFields)) {
    objects.push(...input.magneticFields.filter((item) => isRecord(item)).map(normalizeMagneticObject));
  }
  if (Array.isArray(input.particles)) {
    objects.push(...input.particles.filter((item) => isRecord(item)).map(normalizeParticleObject));
  }

  const result = {
    version: '2.0',
    timestamp: Number.isFinite(Number(input.timestamp)) ? Number(input.timestamp) : Date.now(),
    settings: isRecord(input.settings) ? { ...input.settings } : {},
    objects
  };

  if (isRecord(input.camera)) {
    result.camera = { ...input.camera };
  }
  if (isRecord(input.variables)) {
    result.variables = { ...input.variables };
  }

  const reservedKeys = new Set([
    'version',
    'timestamp',
    'settings',
    'objects',
    'electricFields',
    'magneticFields',
    'particles',
    'camera',
    'variables'
  ]);
  const extras = {};
  for (const [key, value] of Object.entries(input)) {
    if (reservedKeys.has(key)) continue;
    extras[key] = value;
  }
  if (Object.keys(extras).length > 0) {
    result.extras = extras;
  }

  return result;
}

function printUsage() {
  console.error('Usage: node scripts/migrate-scene-v1-to-v2.mjs --in <input.json> --out <output.json>');
}

function main() {
  const { inputPath, outputPath } = parseCliArgs(process.argv.slice(2));
  if (!inputPath || !outputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  let raw;
  try {
    raw = fs.readFileSync(inputPath, 'utf8');
  } catch (error) {
    console.error(`读取输入文件失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`输入 JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  let migrated;
  try {
    migrated = migrateSceneData(parsed);
  } catch (error) {
    console.error(`迁移失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(migrated, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.error(`写入输出文件失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`迁移完成: ${inputPath} -> ${outputPath}`);
}

main();
