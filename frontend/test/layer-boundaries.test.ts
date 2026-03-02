import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('layer boundaries', () => {
  it('lint:frontend passes with boundary rules', () => {
    const result = spawnSync('npm', ['run', 'lint:frontend'], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    expect(result.status).toBe(0);
  }, 20000);

  it('prevents direct legacy js imports outside engine internal adapters', () => {
    const result = spawnSync(
      'rg',
      [
        '-n',
        '-e',
        "from ['\"]\\.\\./\\.\\./\\.\\./js/",
        '-e',
        "from ['\"]\\.\\./\\.\\./js/",
        'frontend/src',
        'frontend/test',
        '-g',
        '*.ts'
      ],
      {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        encoding: 'utf8'
      }
    );

    if (result.status === 1) {
      // ripgrep returns 1 when there are no matches
      expect(true).toBe(true);
      return;
    }

    expect(result.status).toBe(0);
    const violations = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('frontend/src/engine/internal/legacyJsAdapter.ts:'));

    expect(violations).toHaveLength(0);
  });

  it('prevents frontend runtime code from importing legacyBridge directly', () => {
    const result = spawnSync(
      'rg',
      ['-n', '-e', "from ['\"][^'\"]*engine/legacyBridge['\"]", 'frontend/src', '-g', '*.ts'],
      {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        encoding: 'utf8'
      }
    );

    if (result.status === 1) {
      expect(true).toBe(true);
      return;
    }

    expect(result.status).toBe(0);
    const violations = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    expect(violations).toHaveLength(0);
  });

  it('prevents frontend tests from importing legacyBridge directly', () => {
    const result = spawnSync(
      'rg',
      ['-n', '-e', "from ['\"][^'\"]*engine/legacyBridge['\"]", 'frontend/test', '-g', '*.ts'],
      {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        encoding: 'utf8'
      }
    );

    if (result.status === 1) {
      expect(true).toBe(true);
      return;
    }

    expect(result.status).toBe(0);
    const violations = result.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    expect(violations).toHaveLength(0);
  });
});
