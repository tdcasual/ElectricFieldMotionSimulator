import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('layer boundaries', () => {
  it('lint:frontend passes with boundary rules', () => {
    const result = spawnSync('npm', ['run', 'lint:frontend'], {
      stdio: 'pipe',
      encoding: 'utf8'
    });
    expect(result.status).toBe(0);
  });

  it('prevents direct legacy js imports outside legacyBridge', () => {
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
      .filter((line) => !line.startsWith('frontend/src/engine/legacyBridge.ts:'));

    expect(violations).toHaveLength(0);
  });
});
