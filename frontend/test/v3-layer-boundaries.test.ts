import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function runRg(args: string[]) {
  return spawnSync('rg', args, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    encoding: 'utf8'
  });
}

function expectNoMatches(result: ReturnType<typeof runRg>, ignore: ((line: string) => boolean)[] = []) {
  if (result.status === 1) {
    expect(true).toBe(true);
    return;
  }

  expect(result.status).toBe(0);
  const lines = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => ignore.every((predicate) => !predicate(line)));
  expect(lines).toHaveLength(0);
}

describe('v3 layer boundaries', () => {
  it('removes legacy bridge runtime entry points from active frontend path', () => {
    expect(existsSync(resolve(PROJECT_ROOT, 'js'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'test'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'frontend/src/runtime/simulatorRuntime.ts'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'frontend/src/runtime/runtimePropertySchema.ts'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'frontend/src/engine/runtimeEngineBridge.ts'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'frontend/src/engine/storeEngineBridge.ts'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'frontend/src/engine/internal/legacyJsAdapter.ts'))).toBe(false);
    expect(existsSync(resolve(PROJECT_ROOT, 'frontend/src/types/legacy-runtime.d.ts'))).toBe(false);
  });

  it('forbids source and tests from importing removed legacy runtime modules', () => {
    const result = runRg([
      '-n',
      '-e',
      'runtime/simulatorRuntime|runtime/runtimePropertySchema|engine/runtimeEngineBridge|engine/storeEngineBridge|engine/internal/legacyJsAdapter|types/legacy-runtime',
      'frontend/src',
      'frontend/test',
      'frontend/e2e',
      '-g',
      '*.ts',
      '-g',
      '*.vue'
    ]);

    expectNoMatches(result, [
      (line) => line.startsWith('frontend/test/v3-layer-boundaries.test.ts:')
    ]);
  });

  it('keeps v3 domain browser-agnostic', () => {
    const result = runRg([
      '-n',
      '-e',
      '\\b(window|document|localStorage|sessionStorage|FileReader|navigator)\\b',
      'frontend/src/v3/domain',
      '-g',
      '*.ts'
    ]);

    expectNoMatches(result);
  });

  it('prevents v3 domain layer from depending on application or infrastructure layers', () => {
    const result = runRg([
      '-n',
      '-e',
      "from ['\"][^'\"]*\\.\\./(application|infrastructure|ui-adapter)",
      'frontend/src/v3/domain',
      '-g',
      '*.ts'
    ]);

    expectNoMatches(result);
  });
});
